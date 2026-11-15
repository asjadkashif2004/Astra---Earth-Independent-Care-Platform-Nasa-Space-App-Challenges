import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../services/api/server.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC = 'astra-demo.onrender.com';

// Exercise the exact HTTP handler in process, as tests/integration.test.mjs does.
function caller(app) {
  return async (path, { payload, headers = {}, remote = '10.0.0.1' } = {}) => {
    const req = Readable.from(payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))]);
    Object.assign(req, { url: path, method: payload === undefined ? 'GET' : 'POST', socket: { remoteAddress: remote },
      headers: Object.fromEntries(Object.entries({ host: 'localhost', 'content-type': 'application/json', ...headers }).map(([k, v]) => [k.toLowerCase(), v])) });
    let status = 200, responseHeaders = {}; const chunks = [];
    const res = { headersSent: false, writeHead(code, h) { status = code; responseHeaders = h; this.headersSent = true; },
      end(data) { if (data) chunks.push(Buffer.from(data)); }, write(data) { chunks.push(Buffer.from(data)); }, writableLength: 0 };
    await app.handleRequest(req, res);
    const header = name => Object.entries(responseHeaders).find(([k]) => k.toLowerCase() === name)?.[1];
    return { status, header, json: () => JSON.parse(Buffer.concat(chunks).toString() || 'null') };
  };
}
async function withApp(options, fn) { const app = createApp({ autoTick: false, ...options }); try { await fn(caller(app)); } finally { await app.close(); } }

test('default local mode keeps loopback-only hosts and ignores proxy headers', () => withApp({}, async call => {
  assert.equal((await call('/v1/health', { headers: { host: PUBLIC } })).status, 421);
  assert.equal((await call('/v1/health', { headers: { host: 'evil.example', 'x-forwarded-host': 'localhost' } })).status, 421, 'a forwarded host is not trusted locally');
  assert.equal((await call('/v1/auth/config')).json().public_demo, false);
  const login = await call('/v1/auth/demo', { payload: { role: 'viewer' }, headers: { 'x-forwarded-proto': 'https' } });
  assert.equal(login.status, 200); assert.doesNotMatch(login.header('set-cookie'), /Secure/);
  for (let i = 0; i < 240; i++) assert.equal((await call('/v1/health', { remote: 'one-socket', headers: { 'x-forwarded-for': `198.51.100.${i % 200}` } })).status, 200);
  assert.equal((await call('/v1/health', { remote: 'one-socket', headers: { 'x-forwarded-for': '203.0.113.9' } })).status, 429, 'a client-supplied forwarding header cannot reset the local budget');
}));

test('public demo accepts only its configured hostname and reports itself as shared', () => withApp({ publicDemo: true, publicHosts: [PUBLIC] }, async call => {
  assert.equal((await call('/v1/health', { headers: { host: PUBLIC } })).status, 200);
  assert.equal((await call('/', { headers: { host: PUBLIC } })).status, 200);
  assert.equal((await call('/v1/health', { headers: { host: 'other.onrender.com' } })).status, 421);
  assert.equal((await call('/v1/health', { headers: { host: '10.0.0.5:10000', 'x-forwarded-host': PUBLIC } })).status, 200, 'the proxy-forwarded public host is accepted');
  assert.equal((await call('/v1/health', { headers: { host: '10.0.0.5:10000', 'x-forwarded-host': 'evil.example' } })).status, 421);
  assert.equal((await call('/v1/health')).status, 200, 'loopback keeps working for local checks');
  assert.equal((await call('/v1/auth/config', { headers: { host: PUBLIC } })).json().public_demo, true);
}));

test('public demo sets a Secure session cookie over HTTPS and still blocks cross-origin writes', () => withApp({ publicDemo: true, publicHosts: [PUBLIC] }, async call => {
  const https = { host: PUBLIC, 'x-forwarded-proto': 'https', origin: `https://${PUBLIC}` };
  const login = await call('/v1/auth/demo', { payload: { role: 'astronaut' }, headers: https });
  assert.equal(login.status, 200); assert.match(login.header('set-cookie'), /HttpOnly; SameSite=Strict; Path=\/; Max-Age=7200; Secure$/);
  assert.equal((await call('/v1/auth/demo', { payload: { role: 'astronaut' }, headers: { ...https, origin: 'https://evil.example' } })).status, 403);
  const forwarded = await call('/v1/auth/demo', { payload: { role: 'viewer' }, headers: { host: '10.0.0.5:10000', 'x-forwarded-host': PUBLIC, 'x-forwarded-proto': 'https', origin: `https://${PUBLIC}` } });
  assert.equal(forwarded.status, 200, 'the origin is compared with the forwarded public host');
  const plain = await call('/v1/auth/demo', { payload: { role: 'viewer' }, headers: { host: PUBLIC } });
  assert.doesNotMatch(plain.header('set-cookie'), /Secure/, 'plain HTTP cannot carry a Secure cookie');
  const cookie = login.header('set-cookie').split(';')[0];
  const out = await call('/v1/auth/logout', { payload: {}, headers: { ...https, cookie } });
  assert.equal(out.status, 200); assert.match(out.header('set-cookie'), /Max-Age=0; Secure$/);
}));

test('public demo budgets requests per visitor, not per proxy address', () => withApp({ publicDemo: true, publicHosts: [PUBLIC] }, async call => {
  const visitor = ip => ({ remote: 'render-proxy', headers: { host: PUBLIC, 'cf-connecting-ip': ip } });
  for (let i = 0; i < 240; i++) assert.equal((await call('/v1/health', visitor('192.0.2.1'))).status, 200);
  assert.equal((await call('/v1/health', visitor('192.0.2.1'))).status, 429);
  assert.equal((await call('/v1/health', visitor('192.0.2.2'))).status, 200, 'another judge is not blocked by the first');
  assert.equal((await call('/v1/health', { remote: 'render-proxy', headers: { host: PUBLIC, 'x-forwarded-for': '192.0.2.3, 10.0.0.1' } })).status, 200);
}));

function runServer(env, { until, timeout = 20000 } = {}) {
  const db = mkdtempSync(join(tmpdir(), 'astra-public-demo-'));
  const base = { ...process.env }; for (const key of ['ASTRA_PUBLIC_DEMO', 'ASTRA_PUBLIC_HOSTS', 'RENDER_EXTERNAL_HOSTNAME', 'HOST', 'PORT']) delete base[key];
  const child = spawn(process.execPath, ['services/api/server.mjs'], { cwd: ROOT, env: { ...base, ASTRA_DB: join(db, 'astra.sqlite'), ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; child.stdout.on('data', c => stdout += c); child.stderr.on('data', c => stderr += c);
  const done = new Promise(resolve => child.once('exit', code => resolve(code)));
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not reach the expected state:\n' + stdout + stderr)), timeout);
    const check = () => { if (until?.(stdout, stderr)) { clearTimeout(timer); resolve(); } };
    child.stdout.on('data', check); child.stderr.on('data', check);
    done.then(() => { clearTimeout(timer); resolve(); });
  });
  return { child, ready, done, out: () => ({ stdout, stderr }), cleanup: () => rmSync(db, { recursive: true, force: true }) };
}

test('start-up refuses a public address unless public demo mode and its hostname are both set', async () => {
  for (const [env, message] of [
    [{ HOST: '0.0.0.0' }, /set ASTRA_PUBLIC_DEMO=true and ASTRA_PUBLIC_HOSTS/],
    [{ HOST: '0.0.0.0', ASTRA_PUBLIC_DEMO: 'true' }, /needs ASTRA_PUBLIC_HOSTS/],
  ]) {
    const run = runServer(env); const code = await run.done; run.cleanup();
    assert.notEqual(code, 0); assert.match(run.out().stderr, message); assert.doesNotMatch(run.out().stdout, /ASTRA Command/, 'it never starts listening');
  }
});

test('Render-style start-up reads RENDER_EXTERNAL_HOSTNAME and serves that host', async () => {
  const port = 39000 + (process.pid % 900);
  const run = runServer({ HOST: '127.0.0.1', PORT: String(port), ASTRA_PUBLIC_DEMO: 'true', RENDER_EXTERNAL_HOSTNAME: PUBLIC }, { until: out => out.includes('ASTRA Command') });
  try {
    await run.ready;
    assert.match(run.out().stderr, new RegExp(`PUBLIC DEMO MODE for ${PUBLIC.replaceAll('.', '\\.')}`));
    const get = host => new Promise((resolve, reject) => request({ host: '127.0.0.1', port, path: '/v1/auth/config', headers: { host } }, res => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve({ status: res.statusCode, body })); }).on('error', reject).end());
    const ok = await get(PUBLIC); assert.equal(ok.status, 200); assert.equal(JSON.parse(ok.body).public_demo, true);
    assert.equal((await get('other.example')).status, 421);
  } finally { run.child.kill(); await run.done; run.cleanup(); }
});
