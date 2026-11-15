import { open, lstat, realpath, readdir } from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { resolve, parse, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREW, MISSION_ID, METRICS, requirePermission, validateTelemetry } from '../../packages/contracts.mjs';
import { exact, fail, freeze, LIMITS, METRIC_NAMES, parseJSON, plain, sha, stable } from './read-contract.mjs';

export const FIXTURE_ROOT = fileURLToPath(new URL('../../tests/fixtures/n16-readonly/', import.meta.url));
export const MANIFEST_SHA = '3b4e8aea6bafe5c0bec619266985407fb095bf302637cb177d2d14c35c5a7a13';
export const PROFILES = Object.freeze(['nominal', 'elevated', 'missing', 'stale']);
const contexts = new WeakMap();
export async function safeDirectory(path) {
  path = resolve(path); let cursor = parse(path).root;
  for (const part of path.slice(cursor.length).split('/').filter(Boolean)) {
    cursor = join(cursor, part); const s = await lstat(cursor);
    if (s.isSymbolicLink() || !s.isDirectory()) fail('UNSAFE_DIRECTORY');
  }
  if (await realpath(path) !== path) fail('UNSAFE_DIRECTORY');
  const expected = await lstat(path), handle = await open(path, C.O_RDONLY | C.O_DIRECTORY | C.O_NOFOLLOW);
  const stat = await handle.stat();
  if (stat.dev !== expected.dev || stat.ino !== expected.ino || await realpath(path) !== path) { await handle.close(); fail('DIRECTORY_CHANGED'); }
  // Linux /proc/self/fd anchors subsequent operations to this opened directory,
  // even if a parent path is renamed. Only this trusted kernel link is followed.
  return directoryHandle(handle, path);
}
function directoryHandle(handle, path) {
  return {handle, fd: handle.fd, path, at(name) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(name) || name === '.' || name === '..') fail('UNSAFE_MEMBER');
    return `/proc/self/fd/${handle.fd}/${name}`;
  }, close: () => handle.close()};
}
export async function childDirectory(parent, name) {
  const handle = await open(parent.at(name), C.O_RDONLY | C.O_DIRECTORY | C.O_NOFOLLOW);
  return directoryHandle(handle, join(parent.path, name));
}
export async function readAt(fd, name, max) {
  if (!Number.isInteger(fd) || fd < 0 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(name) || ['.', '..'].includes(name)) fail('UNSAFE_MEMBER');
  const f = await open(`/proc/self/fd/${fd}/${name}`, C.O_RDONLY | C.O_NOFOLLOW);
  try {
    const before = await f.stat(); if (!before.isFile() || before.size > max) fail('FILE_SIZE_OR_TYPE');
    const buffer = Buffer.alloc(max + 1); let size = 0;
    while (size < buffer.length) { const r = await f.read(buffer, size, buffer.length - size, size); if (!r.bytesRead) break; size += r.bytesRead; }
    const after = await f.stat();
    if (size > max || size !== before.size || size !== after.size || before.mtimeMs !== after.mtimeMs) fail('FILE_CHANGED_OR_SIZE');
    return buffer.subarray(0, size);
  } finally { await f.close(); }
}
export function validateFixture(f, id) {
  if (!plain(f) || !exact(f, ['schema_version','fixture_id','mission_id','scenario_id','scenario_run_id','as_of','view','synthetic','crew','risk_events'])
    || f.schema_version !== 'astra.n16.synthetic-fixture.v1' || f.fixture_id !== id || !PROFILES.includes(id)
    || f.mission_id !== MISSION_ID || f.synthetic !== true || f.view !== 'onboard'
    || f.scenario_id !== `n16-fixture-${id}` || f.scenario_run_id !== `N16-FIXTURE-${id.toUpperCase()}`
    || f.as_of !== '2026-11-14T11:00:00.000Z' || !Array.isArray(f.crew) || f.crew.length !== 6) fail('INVALID_FIXTURE');
  if (new Set(f.crew.map(c => c.crew_id)).size !== 6) fail('INVALID_CREW_SET');
  const ids = new Set();
  for (const c of f.crew) {
    if (!exact(c, ['crew_id','metric_observations','baselines']) || !CREW.some(x => x.id === c.crew_id)
      || !exact(c.metric_observations, METRIC_NAMES) || !exact(c.baselines, METRIC_NAMES)) fail('INVALID_FIXTURE_CREW');
    for (const m of METRIC_NAMES) {
      const e = c.metric_observations[m], b = c.baselines[m];
      if (e !== null) {
        if (e.source?.kind !== 'simulator' || e.provenance?.synthetic !== true || e.mission_id !== MISSION_ID
          || e.crew_id !== c.crew_id || e.metric?.name !== m || e.provenance.scenario_id !== f.scenario_id
          || ids.has(e.event_id)) fail('SOURCE_OR_IDENTITY_CONFLICT');
        ids.add(e.event_id);
        // Individual malformed measurements are UNKNOWN, never repaired.
      }
      if (!exact(b, ['center','scale','unit','method','count','window_days','version','synthetic','basis'])
        || !Number.isFinite(b.center) || !Number.isFinite(b.scale) || b.scale <= 0 || b.unit !== METRICS[m].unit
        || b.synthetic !== true || b.version !== 'n16-fixture-baseline-v1' || b.method !== 'authored_fixture_reference'
        || b.count !== null || b.window_days !== null || typeof b.basis !== 'string') fail('INVALID_BASELINE_FIXTURE');
    }
  }
  if (!exact(f.risk_events, ['record_origin','coverage','records','reason']) || f.risk_events.record_origin !== 'unavailable'
    || f.risk_events.coverage !== 'unknown' || !Array.isArray(f.risk_events.records) || f.risk_events.records.length
    || typeof f.risk_events.reason !== 'string') fail('UNVERIFIED_ALERT_RECORDS');
  return f;
}
export function observationState(e, asOf) {
  if (!e) return {status:'UNKNOWN', reason:'missing_observation', integrity:'unavailable', freshness:'missing', age_ms:null};
  try { validateTelemetry(e, Date.parse(asOf)); }
  catch { return {status:'UNKNOWN', reason:'invalid_observation', integrity:'unverified', freshness:'unknown', age_ms:null}; }
  const age = Date.parse(asOf) - Date.parse(e.ts), stale = age > Math.max(5000, 3000 / e.source.sampling_hz);
  const good = !stale && e.quality.status === 'good' && !e.quality.artifact && e.metric.value !== null;
  return {status:good?'KNOWN':'UNKNOWN', reason:stale?'stale_observation':good?null:'unreliable_quality',
    integrity:'verified', freshness:stale?'stale':'fresh', age_ms:age};
}
export async function createReadContext(profile, principal, {fixtureRoot = FIXTURE_ROOT, view = 'onboard'} = {}) {
  if (!PROFILES.includes(profile) || view !== 'onboard') fail('PROFILE_OR_VIEW_FORBIDDEN');
  if (!plain(principal) || !exact(principal, ['id','role','crew_id','demo']) || principal.demo !== true
    || typeof principal.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(principal.id)) fail('INVALID_TRUSTED_PRINCIPAL');
  requirePermission(principal, 'read');
  if (principal.role === 'astronaut' && !CREW.some(c => c.id === principal.crew_id)) fail('INVALID_TRUSTED_PRINCIPAL');
  const directory = await safeDirectory(fixtureRoot);
  try {
    const names = await readdir(directory.path);
    if (names.sort().join() !== ['manifest.json', ...PROFILES.map(p => p + '.json')].sort().join()) fail('UNEXPECTED_FIXTURE_MEMBER');
    const bytes = await readAt(directory.fd, 'manifest.json', 4096); if (sha(bytes) !== MANIFEST_SHA) fail('MANIFEST_HASH_MISMATCH');
    const manifest = parseJSON(bytes.toString(), 4096), entry = manifest.fixtures?.[profile];
    if (manifest.schema_version !== 'astra.n16.fixture-manifest.v1' || entry?.file !== profile + '.json'
      || !Number.isInteger(entry.bytes) || entry.bytes > LIMITS.fixture || !/^[a-f0-9]{64}$/.test(entry.sha256)) fail('INVALID_MANIFEST');
    const raw = await readAt(directory.fd, entry.file, LIMITS.fixture);
    if (raw.length !== entry.bytes || sha(raw) !== entry.sha256) fail('FIXTURE_HASH_MISMATCH');
    const fixture = validateFixture(parseJSON(raw.toString(), LIMITS.fixture), profile);
    const token = Object.freeze({});
    contexts.set(token, Object.freeze({directory, principal:freeze(structuredClone(principal)), entry:freeze(entry), profile,
      fixture:freeze(fixture), fixture_hash:entry.sha256, policy:'n16-fixture-read-v1'}));
    return token;
  } catch (e) { await directory.close(); throw e; }
}
export function readContext(token) { const c = contexts.get(token); if (!c) fail('UNTRUSTED_CONTEXT'); return c; }
export async function closeReadContext(token) { const c = readContext(token); contexts.delete(token); await c.directory.close(); }
export function contextSummary(token) {
  const c = readContext(token), f = c.fixture;
  return {principal:c.principal, fixture_id:f.fixture_id, fixture_sha256:c.fixture_hash, manifest_sha256:MANIFEST_SHA,
    mission_id:f.mission_id, scenario_run_id:f.scenario_run_id, view:f.view, as_of:f.as_of, policy:c.policy};
}
