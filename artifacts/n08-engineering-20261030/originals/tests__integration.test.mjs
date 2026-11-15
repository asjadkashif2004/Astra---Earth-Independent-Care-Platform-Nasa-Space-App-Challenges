import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../services/api/server.mjs';
import { Engine } from '../services/api/engine.mjs';
import { Store } from '../services/api/store.mjs';
import { CREW, ROLES, requirePermission } from '../packages/contracts.mjs';

test('complete Mission Day: drift → evidence → case → human ack → blackout → restart → Earth', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-test-')); const db = join(dir, 'test.sqlite'); let store;
  try {
    store = new Store(db); let engine = new Engine(store);
    engine.startScenario('sleep-debt-cardio-drift');
    for (let i = 0; i < 12; i++) engine.tick(30);
    await engine.enrichPending();
    const risk = store.list('risk_events').find(r => r.crew_id === 'CREW-03'); assert.ok(risk); assert.ok(risk.evidence.length >= 2);
    assert.equal(engine.predictions('CREW-03').heart_rate.available,false,'Drift must abstain outside nominal calibration.');
    const c = store.list('agent_cases')[0]; assert.equal(c.state, 'awaiting_human_ack'); assert.ok(c.citations.length);
    assert.equal(store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 0);
    engine.comms.control({ blackout: true, one_way_latency_ms: 720_000, jitter_ms: 0 }, engine.state.now);
    engine.acknowledge(risk.id, { id: 'demo-flight_surgeon' });
    engine.acknowledge(risk.id, { id: 'demo-flight_surgeon' });
    assert.equal(store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 1);
    engine.tick(30); const before = engine.state.now; store.close();
    store = new Store(db); engine = new Engine(store); assert.equal(engine.state.now, before);
    assert.equal(store.record('agent_cases', c.id).human_ack.actor, 'demo-flight_surgeon');
    const waiting = store.list('comms_messages', 1000).find(m => m.kind === 'case'); assert.equal(waiting.status, 'queued');
    engine.comms.control({ blackout: false }, engine.state.now); engine.tick(30);
    for (let i = 0; i < 30; i++) engine.tick(30);
    const report = store.record('comms_messages', waiting.id); assert.equal(report.status, 'delivered');
    assert.ok(report.received_at >= report.deliver_at); assert.ok(report.received_at > report.observed_at);
    assert.equal(store.record('agent_cases', c.id).state, 'delivered_to_earth'); assert.equal(store.verifyAudit(), true);
    assert.ok(engine.state.ground.observed_at < engine.state.now); assert.ok(engine.state.ground.received_at >= engine.state.ground.transmitted_at + 720_000);
  } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('seven-role permission matrix does not grant viewer writes or system admin medical access', () => {
  for (const role of ROLES) {
    const identity = { role, crew_id: 'CREW-03' };
    if (role !== 'demo_admin') { assert.throws(() => requirePermission(identity, 'scenario')); assert.throws(() => requirePermission(identity, 'comms')); }
    if (['viewer', 'researcher', 'system_admin'].includes(role)) assert.throws(() => requirePermission(identity, 'ack'));
  }
  assert.throws(() => requirePermission({ role: 'astronaut', crew_id: 'CREW-03' }, 'ack', 'CREW-01'));
});

test('an interrupted tick rolls back observations, queue and simulation clock together', () => {
  const store = new Store(); const engine = new Engine(store);
  const before = structuredClone(engine.state);
  const count = store.db.prepare('SELECT COUNT(*) AS n FROM telemetry_points').get().n;
  const original = engine.comms.step;
  engine.comms.step = () => { throw new Error('injected scheduler fault'); };
  assert.throws(() => engine.tick(30), /injected/);
  assert.deepEqual(engine.state, before);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM telemetry_points').get().n, count);
  assert.equal(store.get('mission_state').tick, before.tick);
  engine.comms.step = original; engine.tick(30); assert.equal(engine.state.tick, before.tick + 1); store.close();
});

test('escalation produces a fresh case and cannot reuse an earlier human acknowledgement', async () => {
  const store=new Store();const engine=new Engine(store);
  engine.startScenario('cardiorespiratory-drift');
  for(let i=0;i<10;i++)engine.tick(30);
  await engine.enrichPending();
  const warning=store.list('risk_events').find(r=>r.severity==='warning');assert.ok(warning);
  engine.acknowledge(warning.id,{id:'reviewer'});
  for(let i=0;i<8;i++)engine.tick(30);
  await engine.enrichPending();
  const critical=store.list('risk_events').find(r=>r.severity==='critical');assert.ok(critical);
  assert.equal(critical.escalates_risk_id,warning.id);assert.equal(critical.status,'open');
  const nextCase=store.list('agent_cases').find(c=>c.risk_event_id===critical.id);assert.equal(nextCase.human_ack,null);store.close();
});

test('HTTP API enforces sessions, role scope, service-token ingest and same-origin writes', async () => {
  const app = createApp({ autoTick: false, ingestToken: 'test-only-service-credential-32-char' });
  // The supplied sandbox denies socket bind (EPERM), so exercise the exact HTTP
  // handler through an in-process request/response transport.
  const call = async (path, cookie = '', payload, extra = {}) => {
    const req = Readable.from(payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))]);
    Object.assign(req, { url: path, method: payload === undefined ? 'GET' : 'POST', socket: { remoteAddress: 'local-test' },
      headers: Object.fromEntries(Object.entries({ host: 'localhost', cookie, 'content-type': 'application/json', ...extra }).map(([k,v]) => [k.toLowerCase(),v])) });
    let status = 200; let responseHeaders = {}; const chunks = [];
    const res = { headersSent: false, writeHead(code, headers) { status = code; responseHeaders = headers; this.headersSent = true; },
      end(data) { if (data) chunks.push(Buffer.from(data)); }, write(data) { chunks.push(Buffer.from(data)); }, writableLength: 0 };
    await app.handleRequest(req, res);
    return { status, headers: { get(name) { return Object.entries(responseHeaders).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1]; } }, json: async () => JSON.parse(Buffer.concat(chunks).toString()) };
  };
  const login = async role => { const r = await call('/v1/auth/demo', '', { role }); assert.equal(r.status, 200); return r.headers.get('set-cookie').split(';')[0]; };
  try {
    assert.equal((await call('/v1/health')).status, 200); assert.equal((await call('/v1/state')).status, 401);
    const viewer = await login('viewer'); const astronaut = await login('astronaut'); const admin = await login('demo_admin');
    for (const [path, payload] of [
      ['/v1/scenarios/nominal/start', {}], ['/v1/comms/control', { blackout: true }], ['/v1/rag/query', { query: 'sleep' }], ['/v1/agent/cases', {}], ['/v1/checkins', { crew_id: 'CREW-03' }], ['/v1/comms/messages', {}],
    ]) assert.equal((await call(path, viewer, payload)).status, 403, path);
    assert.equal((await call('/v1/audit', viewer)).status, 403); assert.equal((await call('/v1/models', viewer)).status, 403);
    assert.equal((await call('/v1/ingest/telemetry', viewer, { events: [] })).status, 403);
    assert.equal((await call('/v1/crew/CREW-01/telemetry', astronaut)).status, 403);
    const self = await (await call('/v1/state', astronaut)).json(); assert.equal(self.crew.length, 1); assert.equal(self.crew[0].id, 'CREW-03');
    assert.equal((await call('/v1/comms/control', admin, { blackout: true }, { Origin: 'https://bad.example' })).status, 403);
    assert.equal((await call('/v1/comms/control', admin, { loss: 9 })).status, 422);
    assert.equal((await call('/v1/agent/cases', admin, { risk_event_id: 'invented' })).status, 422);
    const deniedAck = await call('/v1/alerts/nonexistent/ack', viewer, {}); assert.equal(deniedAck.status, 404);
    await call('/v1/scenarios/sleep-debt-cardio-drift/start', admin, {}); for (let i = 0; i < 12; i++) app.engine.tick(30);
    await app.engine.enrichPending();
    const researcher = await login('researcher');
    const researchState = await (await call('/v1/state', researcher)).json(); assert.equal(researchState.cases.length, 0);
    assert.equal((await call('/v1/agent/cases', researcher)).status, 403);
    const risk = app.store.list('risk_events')[0]; assert.equal((await call(`/v1/alerts/${risk.id}/ack`, viewer, {})).status, 403);
    assert.equal((await call(`/v1/alerts/${risk.id}/ack`, admin, {})).status, 200);
    const audit = await (await call('/v1/audit', admin)).json(); assert.equal(audit.chain_valid, true); assert.ok(audit.events.some(e => e.action === 'alert.acknowledged'));
    const response = await call('/v1/openapi.json', admin); assert.equal(response.status, 200);
    assert.equal((await call('/v1/crew/CREW-03/waveforms', admin)).status, 501);
    assert.equal(CREW.length, 6);
  } finally { await app.close(); }
});
