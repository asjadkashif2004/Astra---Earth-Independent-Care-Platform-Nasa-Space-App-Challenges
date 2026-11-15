import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBaselines } from '../services/telemetry-simulator/simulator.mjs';
import { evaluateCrew } from '../services/anomaly/detector.mjs';
import { createApp } from '../services/api/server.mjs';
import { Store } from '../services/api/store.mjs';
import { Engine } from '../services/api/engine.mjs';
import { MonitoringHealth } from '../services/api/monitoring.mjs';
import { EnrichmentRunner } from '../services/api/enrichment.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { SOURCES } from '../services/rag/retrieval.mjs';
import { EPOCH, METRICS, MODEL_VERSION } from '../packages/contracts.mjs';
import { transport } from './http-harness.mjs';

const baseline = createBaselines()['CREW-03'];
const reading = (seconds, deviations = {}) => ({ id: 'CREW-03', quality: 'good', confidence: 0.98, artifact: false, activity: 'rest',
  observed_at: new Date(EPOCH + seconds * 1000).toISOString(), values: Object.fromEntries(Object.entries(baseline).map(([k, b]) => [k, b.center + (deviations[k] ?? 0) * b.scale])) });
function series(times, changes, mutate = () => {}) {
  let pending = {}; const results = [];
  for (const t of times) { const r = reading(t, typeof changes === 'function' ? changes(t) : changes); mutate(r, t);
    const result = evaluateCrew(r, baseline, EPOCH + t * 1000, pending); pending = result.pending; results.push(result); }
  return results;
}
const intervals = end => Array.from({ length: end / 30 + 1 }, (_, i) => i * 30);
const generateAlert = engine => { engine.startScenario('sleep-debt-cardio-drift'); for (let i = 0; i < 12; i++) engine.tick(30); return engine.store.list('risk_events')[0]; };
const count = (store, table) => store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
let eventSerial = 0;
function imported(engine, name, z) {
  const ts = new Date(engine.state.now).toISOString(); const b = engine.baselines['CREW-03'][name];
  return { schema_version: 'astra.telemetry.v1', event_id: `N02-${++eventSerial}`, mission_id: 'MARS-DEMO-01', crew_id: 'CREW-03', ts, received_ts: ts,
    metric: { name, system: METRICS[name].system ?? 'urn:astra:metric', code: METRICS[name].code, unit: METRICS[name].unit, value: b.center + z * b.scale },
    quality: { status: 'good', confidence: 0.98, artifact: false }, source: { kind: 'synthetic-import', device_id: 'N02-DEVICE', sampling_hz: 1 / 30 },
    provenance: { synthetic: true, seed: 91, scenario_id: 'N02-fixture', generator_version: 'n02-test-v1' } };
}

test('N02 F01: isolated persistent deviations produce explainable Amber and a separate high-priority review', () => {
  const r = series(intervals(300), { heart_rate: 6 });
  assert.equal(r[3].review, false); assert.equal(r[4].status, 'amber'); assert.equal(r[6].status, 'red');
  assert.match(r[0].reason, /persistence threshold not yet met/);
  assert.equal(r.at(-1).evidence.length, 1); assert.equal(r.at(-1).detector.version, MODEL_VERSION);
  assert.ok(r[4].evidence[0].rules.includes('persistent_single_signal')); assert.match(r[4].uncertainty.interpretation, /not a clinical probability/);
});
test('N02: single-signal thresholds need their own continuous persistence, including boundary time', () => {
  const r = series([0, 30, 60, 90, 120, 150, 180, 210, 239, 240], t => ({ heart_rate: t < 120 ? 3 : 4.1 }));
  assert.equal(r.at(-2).review, false); assert.equal(r.at(-1).status, 'amber');
  assert.equal(r.at(-1).evidence[0].single_persistence_seconds, 120);
  assert.equal(series(intervals(180), { heart_rate: 3.999 }).at(-1).review, false);
  for (const b of Object.values(createBaselines())) for (const threshold of [4, 6]) {
    let pending = {}; let result;
    for (const t of intervals(threshold === 4 ? 120 : 180)) {
      const row = reading(t); row.values = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.center]));
      row.values.heart_rate = b.heart_rate.center + threshold * b.heart_rate.scale;
      result = evaluateCrew(row, b, EPOCH + t * 1000, pending); pending = result.pending;
    }
    assert.equal(result.status, threshold === 4 ? 'amber' : 'red', 'exact floating-point threshold applies consistently across crew');
  }
});
test('N02: opposite baseline directions are reviewable; sign reversals reset persistence', () => {
  assert.equal(series(intervals(120), { heart_rate: -4.1 }).at(-1).status, 'amber');
  const r = series(intervals(210), t => ({ heart_rate: t < 120 ? 4.1 : -4.1 }));
  assert.equal(r[4].review, false); assert.equal(r.at(-1).review, false);
});
test('N02: existing multisignal rules retain Amber/Red persistence with no early escalation', () => {
  const r = series(intervals(180), { heart_rate: 4.1, hrv: -4.1 });
  assert.equal(r[2].review, false); assert.equal(r[3].status, 'amber'); assert.equal(r[5].status, 'amber'); assert.equal(r[6].status, 'red');
});
test('N02: rate alone triggers review after a sustained observed trend with endpoint evidence', () => {
  const r = series(intervals(120), t => ({ heart_rate: 3.1 * t / 60 })); const last = r.at(-1);
  assert.equal(r[3].review, false); assert.equal(last.status, 'amber');
  assert.ok(last.evidence[0].rules.includes('persistent_rate_of_change'));
  assert.ok(!last.evidence[0].rules.includes('persistent_single_signal'));
  assert.equal(last.evidence[0].rate_start.observed_at, new Date(EPOCH + 60_000).toISOString());
  assert.equal(series(intervals(120), t => ({ heart_rate: 3 * t / 60 })).at(-1).status, 'amber');
});
test('N02: rate uses irregular observation intervals; a plateau and brief spike do not become rapid review', () => {
  const r = series([0, 20, 60, 85, 120], t => ({ heart_rate: 3.2 * t / 60 }));
  assert.equal(r.at(-1).status, 'amber'); assert.ok(r.at(-1).evidence[0].rate_of_change_sd_per_minute >= 3);
  for (const result of series(intervals(120), t => ({ heart_rate: t === 30 ? 6 : 0 }))) assert.equal(result.review, false);
  assert.ok(!series(intervals(120), t => ({ heart_rate: t < 60 ? 0 : 3.5 })).at(-1).review);
});
test('N02: exercise excludes cardiac single/rate rules, preserves noncardiac review and resets on rest', () => {
  const r = series(intervals(180), { heart_rate: 7, hrv: -5, respiratory_rate: 5 }, row => { row.activity = 'exercise_recovery'; });
  for (const result of r) assert.equal(result.status, 'green');
  const noncardiac = series(intervals(120), { temperature: 4.1 }, row => { row.activity = 'exercise_recovery'; });
  assert.equal(noncardiac.at(-1).status, 'amber');
  assert.equal(series(intervals(210), { heart_rate: 5 }, (row, t) => { row.activity = t < 120 ? 'exercise_recovery' : 'rest'; }).at(-1).review, false);
});
test('N02: invalid quality, missing metrics, bad baselines and non-finite values fail closed to Gray', () => {
  for (const mutate of [r => { r.quality = 'suspect'; }, r => { r.quality = 'missing'; }, r => { r.confidence = 0.69; },
    r => { r.confidence = NaN; }, r => { r.artifact = true; }, r => { delete r.values.hrv; },
    r => { r.values.heart_rate = Infinity; }, r => { r.values.temperature = 99; }, r => { r.observed_at = 'invalid'; }]) {
    const row = reading(0, { heart_rate: 7 }); mutate(row); const output = evaluateCrew(row, baseline, EPOCH);
    assert.equal(output.status, 'gray'); assert.equal(output.review, false); assert.deepEqual(output.pending, {});
  }
  for (const scale of [0, -1, NaN]) assert.equal(evaluateCrew(reading(0), { ...baseline, heart_rate: { center: 68, scale } }, EPOCH).status, 'gray');
  assert.equal(evaluateCrew(reading(0), { ...baseline, heart_rate: { center: 1e300, scale: 1e-300 } }, EPOCH).status, 'gray');
  assert.equal(evaluateCrew(reading(0), null, EPOCH).status, 'gray');
});
test('N02: quality interruption and long sampling gaps reset accumulated persistence', () => {
  assert.equal(series([0, 30, 60, 90, 120, 150, 180], { heart_rate: 5 }, (row, t) => { if (t === 90) row.quality = 'suspect'; }).at(-1).review, false);
  assert.equal(series([0, 30, 60, 200, 230], { heart_rate: 5 }).at(-1).review, false);
  assert.equal(evaluateCrew(reading(0), baseline, EPOCH + 91_000).status, 'gray');
  assert.equal(evaluateCrew(reading(1), baseline, EPOCH).status, 'gray');
});
test('N02/N01: cached imports never gain persistence from ticks or unrelated observations', async () => {
  const app = createApp({ autoTick: false });
  try {
    const event = imported(app.engine, 'heart_rate', 6.1); app.engine.ingest([event]);
    for (let i = 0; i < 6; i++) { app.engine.tick(10); app.engine.ingest([imported(app.engine, 'spo2', 0)]); }
    assert.equal(app.store.list('risk_events').length, 0); assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id, event.event_id);
    app.engine.tick(31); assert.equal(app.engine.state.crew[2].status, 'gray');
  } finally { await app.close(); }
});
test('N02/N01: observed single-signal evidence retains actual imported event and generator provenance', async () => {
  const app = createApp({ autoTick: false });
  try {
    let last;
    for (let i = 0; i <= 4; i++) { if (i) app.engine.tick(30); last = imported(app.engine, 'heart_rate', 4.1); app.engine.ingest([last]); }
    const risk = app.store.list('risk_events')[0]; assert.ok(risk); assert.equal(risk.evidence.length, 1);
    assert.equal(risk.evidence[0].event_id, last.event_id); assert.equal(risk.evidence[0].observed_at, last.ts);
    assert.deepEqual(risk.evidence[0].provenance, last.provenance); assert.equal(risk.safety.diagnosis, null);
    assert.equal(risk.detector.version, MODEL_VERSION);
  } finally { await app.close(); }
});
test('N02/N01: rate evidence traces both endpoints to canonical imported observations', async () => {
  const app = createApp({ autoTick: false });
  try {
    const events = [];
    for (let i = 0; i <= 4; i++) { if (i) app.engine.tick(30); const e = imported(app.engine, 'heart_rate', i * 1.6); events.push(e); app.engine.ingest([e]); }
    const risk = app.store.list('risk_events')[0]; assert.ok(risk);
    const evidence = risk.evidence[0]; assert.ok(evidence.rules.includes('persistent_rate_of_change'));
    assert.equal(evidence.event_id, events[4].event_id); assert.equal(evidence.rate_start.event_id, events[2].event_id);
    assert.deepEqual(evidence.rate_start.provenance, events[2].provenance); assert.deepEqual(evidence.rate_start.source, events[2].source);
    assert.equal(evidence.rate_start.value, events[2].metric.value);
  } finally { await app.close(); }
});

test('N02 F10: actual retrieval exception cannot erase telemetry/alert; recovery is deduplicated and requires human ack', async () => {
  let now = 10000; const app = createApp({ autoTick: false, clock: () => now, caseBuilder: buildCase });
  const descriptor = Object.getOwnPropertyDescriptor(SOURCES[0], 'verified');
  try {
    Object.defineProperty(SOURCES[0], 'verified', { configurable: true, get() { throw new Error('private retrieval fault detail'); } });
    const before = count(app.store, 'telemetry_points'); const risk = generateAlert(app.engine); assert.ok(risk);
    assert.ok(count(app.store, 'telemetry_points') > before); assert.equal(app.store.get('mission_state').now, app.engine.state.now);
    assert.ok(app.store.history('CREW-03', 1)[0].risk_id); await app.engine.enrichPending();
    const job = app.store.record('enrichment_jobs', risk.id); assert.equal(job.status, 'failed'); assert.equal(job.attempts, 1);
    assert.equal(app.store.list('agent_cases').length, 0); assert.equal(app.store.record('risk_events', risk.id).status, 'open');
    assert.throws(() => app.engine.acknowledge(risk.id, { id: 'human' }), e => e.code === 'CASE_ENRICHMENT_PENDING');
    assert.equal(app.store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 0);
    await app.engine.enrichPending(); assert.equal(app.store.record('enrichment_jobs', risk.id).attempts, 1, 'retry backoff respected');
    Object.defineProperty(SOURCES[0], 'verified', descriptor); now += 1000;
    await Promise.all([app.engine.enrichPending(), app.engine.enrichPending()]);
    assert.equal(app.store.record('enrichment_jobs', risk.id).status, 'complete'); assert.equal(app.store.list('agent_cases').length, 1);
    app.engine.acknowledge(risk.id, { id: 'human' }); app.engine.acknowledge(risk.id, { id: 'human' });
    await app.engine.enrichPending(); assert.equal(app.store.list('agent_cases').length, 1);
    assert.equal(app.store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 1); assert.equal(app.store.verifyAudit(), true);
  } finally { Object.defineProperty(SOURCES[0], 'verified', descriptor); await app.close(); }
});
test('N02 F10: failed enrichment survives disk restart and recovers in the real worker without auto-ack', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n02-restart-')); const dbPath = join(dir, 'test.sqlite'); let app; let now = 10000;
  try {
    app = createApp({ autoTick: false, dbPath, clock: () => now, caseBuilder: () => { throw new Error('unavailable'); } });
    const risk = generateAlert(app.engine); await app.engine.enrichPending(); const before = count(app.store, 'telemetry_points');
    await app.close(); now += 1000; app = createApp({ autoTick: false, dbPath, clock: () => now });
    assert.equal(count(app.store, 'telemetry_points'), before); await app.engine.enrichPending();
    const c = app.store.record('agent_cases', `CASE-${risk.id}`); assert.ok(c.citations.length); assert.equal(c.human_ack, null);
    assert.equal(app.store.record('enrichment_jobs', risk.id).attempts, 2); assert.equal(app.store.list('agent_cases').length, 1);
    assert.equal(app.store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 0);
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('N02 F10: optional case/job write failure rolls back enrichment only and retries safely', async () => {
  let now = 10000; const app = createApp({ autoTick: false, caseBuilder: buildCase, clock: () => now });
  try {
    const risk = generateAlert(app.engine); const put = app.store.put; const before = count(app.store, 'telemetry_points');
    app.store.put = function(table, ...args) { if (table === 'enrichment_jobs' && args[1].status === 'complete') throw new Error('enrichment storage fault'); return put.call(this, table, ...args); };
    await app.engine.enrichPending(); assert.equal(count(app.store, 'telemetry_points'), before);
    assert.ok(app.store.record('risk_events', risk.id)); assert.equal(app.store.list('agent_cases').length, 0);
    assert.equal(app.store.record('enrichment_jobs', risk.id).status, 'pending'); assert.equal(app.engine.enrichmentFault, true);
    app.store.put = put; now += 2000; await app.engine.enrichPending(); assert.equal(app.store.list('agent_cases').length, 1);
    assert.equal(app.engine.enrichmentFault, false);
  } finally { await app.close(); }
});
test('N02/N01: original alert/job creation failure atomically rolls back telemetry, provenance, history, queue and clock', async () => {
  const app = createApp({ autoTick: false });
  try {
    for (let i = 0; i < 4; i++) { if (i) app.engine.tick(30); app.engine.ingest([imported(app.engine, 'heart_rate', 4.1)]); }
    app.engine.tick(29); const before = structuredClone(app.engine.state); const tables = ['telemetry_points', 'risk_events', 'enrichment_jobs', 'snapshots', 'comms_messages', 'audit_events'];
    const counts = tables.map(t => count(app.store, t)); const put = app.store.put;
    app.store.put = function(table, ...args) { if (table === 'enrichment_jobs') throw new Error('critical outbox failure'); return put.call(this, table, ...args); };
    // Advance the observation timestamp without letting the simulation manufacture an imported sample.
    app.engine.state.now += 1000; const beforeImport = structuredClone(app.engine.state);
    assert.throws(() => app.engine.ingest([imported(app.engine, 'heart_rate', 4.1)]), /critical outbox failure/);
    assert.deepEqual(app.engine.state, beforeImport); assert.deepEqual(tables.map(t => count(app.store, t)), counts);
    assert.equal(app.store.get('mission_state').now, before.now); app.store.put = put;
  } finally { await app.close(); }
});
test('N02: late enrichment cannot supply an acknowledgement or queue its own report', async () => {
  const app = createApp({ autoTick: false, caseBuilder: risk => ({ ...buildCase(risk, EPOCH), human_ack: { actor: 'forged' } }) });
  try { const risk = generateAlert(app.engine); await app.engine.enrichPending();
    assert.equal(app.store.record('enrichment_jobs', risk.id).status, 'failed'); assert.equal(app.store.list('agent_cases').length, 0);
    assert.equal(app.store.record('risk_events', risk.id).status, 'open');
  } finally { await app.close(); }
});
test('N02: a slow optional enrichment cannot delay a tick or hold a database transaction', async () => {
  let release; const app = createApp({ autoTick: false, caseBuilder: risk => new Promise(resolve => { release = () => resolve(buildCase(risk, EPOCH)); }) });
  try {
    generateAlert(app.engine); const work = app.engine.enrichPending(); const tick = app.engine.state.tick;
    assert.equal(app.store.inTransaction, false); app.engine.tick(30); assert.equal(app.engine.state.tick, tick + 1);
    assert.equal(app.store.inTransaction, false); release(); await work; assert.equal(app.store.list('agent_cases').length, 1);
  } finally { await app.close(); }
});
test('N02: worker startup crashes and nonresponsive workers are bounded failures', async () => {
  const crash = new EnrichmentRunner({ workerURL: new URL('data:text/javascript,throw new Error("crash")') });
  const hang = new EnrichmentRunner({ timeoutMs: 100, workerURL: new URL('data:text/javascript,import {parentPort} from "node:worker_threads"; parentPort.on("message",()=>{});') });
  try { await assert.rejects(crash.build({}, EPOCH), /worker failed|worker exited/); await assert.rejects(hang.build({}, EPOCH), /timeout/); }
  finally { crash.close(); hang.close(); }
});
test('N02: a busy worker cannot block monitoring; interrupted dispatch survives restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n02-pending-')); const dbPath = join(dir, 'test.sqlite'); let app; let now = 10000;
  const runner = new EnrichmentRunner({ workerURL: new URL('data:text/javascript,import {parentPort} from "node:worker_threads"; parentPort.on("message",()=>{while(true){}});') });
  try {
    app = createApp({ autoTick: false, dbPath, clock: () => now, enrichmentRunner: runner });
    const risk = generateAlert(app.engine); const work = app.engine.enrichPending(); const tick = app.engine.state.tick;
    app.engine.tick(30); assert.equal(app.engine.state.tick, tick + 1); assert.equal(app.store.inTransaction, false);
    assert.equal(app.store.record('enrichment_jobs', risk.id).attempts, 1); await app.close(); await work;
    now += 2000; app = createApp({ autoTick: false, dbPath, clock: () => now }); await app.engine.enrichPending();
    assert.equal(app.store.record('enrichment_jobs', risk.id).attempts, 2); assert.equal(app.store.list('agent_cases').length, 1);
    assert.equal(app.store.record('agent_cases', `CASE-${risk.id}`).human_ack, null);
  } finally { if (app) await app.close(); runner.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('N02: pre-N02 alerts without cases/jobs migrate additively and recover exactly once', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n02-upgrade-')); const dbPath = join(dir, 'test.sqlite'); let store;
  try {
    store = new Store(dbPath); let engine = new Engine(store); const risk = generateAlert(engine);
    store.db.exec('DELETE FROM enrichment_jobs'); const before = count(store, 'telemetry_points'); store.close();
    store = new Store(dbPath); engine = new Engine(store); assert.equal(count(store, 'telemetry_points'), before);
    assert.equal(store.list('enrichment_jobs').length, 1); await engine.enrichPending();
    assert.equal(store.list('risk_events').length, 1); assert.equal(store.list('agent_cases').length, 1);
    assert.equal(store.record('agent_cases', `CASE-${risk.id}`).human_ack, null); await engine.close();
  } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('N02 F06: actual scheduled tick failure returns 503 and a successful retry restores readiness', async () => {
  let now = 10000; const app = createApp({ autoTick: false, clock: () => now }); const call = transport(app);
  try {
    assert.equal((await call('/v1/health')).json().monitoring.status, 'manual'); const tick = app.engine.tick;
    app.engine.tick = () => { throw new Error('sensitive fault detail'); };
    assert.equal(app.runTick(), false); const failed = await call('/v1/health'); assert.equal(failed.status, 503);
    assert.equal(failed.json().ready, false); assert.equal(failed.json().monitoring.status, 'failed'); assert.ok(!failed.text().includes('sensitive'));
    now += 1000; app.engine.tick = tick; assert.equal(app.runTick(), true);
    const recovered = await call('/v1/health'); assert.equal(recovered.status, 200); assert.equal(recovered.json().ready, true);
    assert.equal(recovered.json().monitoring.failure_count, 1);
  } finally { await app.close(); }
});
test('N02 F06: health uses host freshness, distinguishes startup/manual/stalled monitoring and detects DB failure', () => {
  let now = 10000; const monitor = new MonitoringHealth(() => now); const store = new Store();
  try {
    assert.equal(monitor.report(store).monitoring.status, 'starting'); monitor.success();
    now += 5000; assert.equal(monitor.report(store).ready, true); now++;
    assert.equal(monitor.report(store).monitoring.status, 'stale'); assert.equal(monitor.report(store).ready, false);
    assert.equal(monitor.report(store, { automatic: false }).monitoring.status, 'manual');
    monitor.success(); assert.equal(monitor.report(store).ready, true);
    const prepare = store.db.prepare; store.db.prepare = () => { throw new Error('DB unavailable'); };
    assert.equal(monitor.report(store).database, 'unavailable'); assert.equal(monitor.report(store).ready, false);
    store.db.prepare = prepare; assert.equal(monitor.report(store).ready, true);
  } finally { store.close(); }
});
test('N02 F06: enrichment failure degrades health while monitoring stays ready; recovery clears degradation', async () => {
  let now = 10000; let fail = true; const app = createApp({ autoTick: false, clock: () => now, caseBuilder: (risk, at) => { if (fail) throw new Error('failed'); return buildCase(risk, at); } });
  const call = transport(app);
  try {
    generateAlert(app.engine); await app.engine.enrichPending(); const h = await call('/v1/health');
    assert.equal(h.status, 200); assert.equal(h.json().status, 'degraded'); assert.equal(h.json().ready, true);
    assert.equal(h.json().enrichment.failed, 1); assert.ok(!h.text().includes('CREW-03'));
    now += 1000; fail = false; await app.engine.enrichPending(); assert.equal((await call('/v1/health')).json().status, 'ok');
  } finally { await app.close(); }
});
test('N02 F06: direct knowledge API failure is bounded and degrades health without stopping telemetry', async () => {
  const app = createApp({ autoTick: false }); const call = transport(app);
  const descriptor = Object.getOwnPropertyDescriptor(SOURCES[0], 'verified');
  try {
    const cookie = (await call('/v1/auth/demo', { body: { role: 'demo_admin' } })).headers['Set-Cookie'].split(';')[0];
    Object.defineProperty(SOURCES[0], 'verified', { configurable: true, get() { throw new Error('private failure'); } });
    const r = await call('/v1/rag/query', { cookie, body: { query: 'heart cardiovascular' } });
    assert.equal(r.status, 503); assert.equal(r.json().error.code, 'KNOWLEDGE_UNAVAILABLE'); assert.ok(!r.text().includes('private'));
    const tick = app.engine.state.tick; assert.equal(app.runTick(), true); assert.equal(app.engine.state.tick, tick + 1);
    const h = (await call('/v1/health')).json(); assert.equal(h.ready, true); assert.equal(h.status, 'degraded');
    Object.defineProperty(SOURCES[0], 'verified', descriptor);
    assert.equal((await call('/v1/rag/query', { cookie, body: { query: 'heart cardiovascular' } })).status, 200);
    assert.equal((await call('/v1/health')).json().status, 'ok');
  } finally { Object.defineProperty(SOURCES[0], 'verified', descriptor); await app.close(); }
});
test('N02: case API reports durable pending/failure and blocks acknowledgement until recovery', async () => {
  const app = createApp({ autoTick: false, caseBuilder: () => { throw new Error('failed'); } }); const call = transport(app);
  try {
    const cookie = (await call('/v1/auth/demo', { body: { role: 'demo_admin' } })).headers['Set-Cookie'].split(';')[0];
    const risk = generateAlert(app.engine); await app.engine.enrichPending();
    const response = await call('/v1/agent/cases', { cookie, body: { risk_event_id: risk.id } });
    assert.equal(response.status, 202); assert.equal(response.json().case, null); assert.equal(response.json().enrichment.status, 'failed');
    assert.equal((await call(`/v1/alerts/${risk.id}/ack`, { cookie, body: {} })).status, 409);
    assert.equal((await call('/v1/alerts')).status, 401);
  } finally { await app.close(); }
});
test('N02: missing optional corpus at cold startup cannot prevent monitoring; restoring it recovers enrichment', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n02-corpus-')); let app;
  try {
    // An isolated copy exercises real file loading without touching the user's corpus/database.
    for (const name of ['services', 'packages', 'knowledge', 'models', 'data/public-metadata']) cpSync(new URL(`../${name}`, import.meta.url), join(dir, name), { recursive: true });
    writeFileSync(join(dir, 'knowledge/sources.json'), 'invalid json');
    const isolated = await import(pathToFileURL(join(dir, 'services/api/server.mjs')).href);
    app = isolated.createApp({ autoTick: false }); const call = transport(app); const risk = generateAlert(app.engine);
    await app.engine.enrichPending(); assert.ok(app.store.record('risk_events', risk.id));
    assert.equal((await call('/v1/health')).json().status, 'degraded'); assert.equal(app.store.list('agent_cases').length, 0);
    cpSync(new URL('../knowledge/sources.json', import.meta.url), join(dir, 'knowledge/sources.json'));
    // Retry time is persisted; make it due without sleeping.
    const job = app.store.record('enrichment_jobs', risk.id); job.next_attempt_at = 0; app.store.put('enrichment_jobs', job.id, job);
    app.runTick(); await app.engine.enrichPending(); assert.equal(app.store.list('agent_cases').length, 1);
    assert.equal((await call('/v1/health')).json().status, 'ok');
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }); }
});
