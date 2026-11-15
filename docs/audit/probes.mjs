/** Audit findings: N01/N02/N03 software checks plus separately unapproved remaining defects.
 * Run: node docs/audit/probes.mjs
 * Uses in-memory databases and the existing socket-free request harness.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../../services/api/server.mjs';
import { Store } from '../../services/api/store.mjs';
import { Comms } from '../../services/comms/scheduler.mjs';
import { evaluateCrew } from '../../services/anomaly/detector.mjs';
import { SOURCES } from '../../services/rag/retrieval.mjs';
import { buildCase } from '../../services/agent/agent.mjs';
import { METRICS, EPOCH, validateTelemetry } from '../../packages/contracts.mjs';
import { transport } from '../../tests/http-harness.mjs';

const findings = [];
const record = (id, observation, evidence) => findings.push({ id, observation, evidence });
const app = createApp({ autoTick: false });
const call = transport(app);
const login = async role => (await call('/v1/auth/demo', { body: { role } })).headers['Set-Cookie'].split(';')[0];
const event = (id, value, offset = 0) => ({
  schema_version: 'astra.telemetry.v1', event_id: id, mission_id: 'MARS-DEMO-01', crew_id: 'CREW-03',
  ts: new Date(app.engine.state.now + offset).toISOString(), received_ts: new Date(app.engine.state.now).toISOString(),
  metric: { system: 'http://loinc.org', code: METRICS.heart_rate.code, name: 'heart_rate', unit: '/min', value },
  quality: { status: 'good', confidence: 0.98, artifact: false },
  source: { kind: 'synthetic-import', device_id: 'audit-only', sampling_hz: 1 },
  provenance: { synthetic: true, seed: 42, scenario_id: 'audit-only', generator_version: 'audit-v1' },
});
try {
  const c = app.engine.state.crew[2];
  const reading = { quality: 'good', confidence: 0.98, artifact: false, activity: 'rest', values: Object.fromEntries(Object.entries(c.baseline).map(([k, b]) => [k, b.center])) };
  reading.values.heart_rate = c.baseline.heart_rate.center + 6 * c.baseline.heart_rate.scale;
  let result = { pending: {} };
  for (let t = 0; t <= 300; t += 30) {
    reading.observed_at = new Date(EPOCH + t * 1000).toISOString();
    result = evaluateCrew(reading, c.baseline, EPOCH + t * 1000, result.pending);
  }
  assert.equal(result.status, 'red'); assert.equal(result.evidence.length, 1);
  record('F01', 'Repaired in N02: persistent fresh isolated deviation requests human review.', result);

  const queueBefore = app.store.list('comms_messages', 10000).length;
  app.engine.ingest([event('audit-ingest-1', 110)]);
  const acceptedValue = app.engine.state.crew[2].values.heart_rate;
  const queueAfter = app.store.list('comms_messages', 10000).length;
  app.engine.tick();
  const nextTickValue = app.engine.state.crew[2].values.heart_rate;
  assert.equal(acceptedValue, 110); assert.equal(queueAfter, queueBefore + 1); assert.equal(nextTickValue, 110);
  record('F02', 'Repaired in N01: imported reading is queued and survives a simulated tick.', { acceptedValue, queueBefore, queueAfter, nextTickValue });

  const newer = event('audit-newer', 111, -1000), older = event('audit-older', 99, -2000);
  assert.throws(() => app.engine.ingest([newer, older]), error => error.code === 'OUT_OF_ORDER');
  assert.equal(app.engine.state.crew[2].values.heart_rate, 110);
  record('F03', 'Repaired in N01: reverse-ordered batch is rejected atomically.', { newer: newer.ts, older: older.ts, retained: app.engine.state.crew[2].values.heart_rate });

  const admin = await login('demo_admin');
  const saved = await call('/v1/checkins', { cookie: admin, body: { crew_id: 'CREW-03', fatigue: 4, reaction_ms: [220, 240, 260] } });
  assert.equal(saved.status, 201);
  for (const role of ['viewer', 'researcher']) {
    const response = await call('/v1/crew/CREW-03/checkins', { cookie: await login(role) });
    assert.equal(response.status, 403);
    record(`F04-${role}`, 'Repaired in N01: raw voluntary check-in access denied.', { role, status: response.status });
  }
  const malformed = await call('/v1/comms/control', { cookie: admin, body: {}, headers: { origin: 'not-a-url' } });
  assert.equal(malformed.status, 400);
  record('F05', 'Repaired in N01: malformed Origin is a bounded client-input error.', { status: malformed.status, body: malformed.json() });

  const originalTick = app.engine.tick;
  app.engine.tick = () => { throw new Error('audit: simulated engine failure'); }; app.runTick();
  const health = await call('/v1/health');
  assert.equal(health.status, 503); assert.equal(health.json().monitoring.status, 'failed');
  app.engine.tick = originalTick; app.runTick(); assert.equal((await call('/v1/health')).status, 200);
  record('F06', 'Repaired in N02: an actual failed tick loses readiness; successful retry recovers.', health.json());
  const incomplete = event('audit-incomplete', 70);
  delete incomplete.provenance.generator_version;
  incomplete.received_ts = 'invalid'; incomplete.source.sampling_hz = -1;
  assert.throws(() => validateTelemetry(incomplete, app.engine.state.now), error => error.status === 422);
  record('F11', 'Repaired in N01: incomplete time/source/generator metadata is rejected.', { accepted: false });
} finally { await app.close(); }

const isolated = createApp({ autoTick: false });
const originalVerified = Object.getOwnPropertyDescriptor(SOURCES[0], 'verified');
try {
  isolated.engine.caseBuilder = buildCase; // Inject in the same realm as the source getter fault.
  isolated.engine.startScenario('sleep-debt-cardio-drift');
  Object.defineProperty(SOURCES[0], 'verified', { configurable: true, get() { throw new Error('audit: retrieval resource failure'); } });
  for (let i = 0; i < 20; i++) isolated.engine.tick();
  await isolated.engine.enrichPending();
  assert.ok(isolated.store.list('risk_events').length > 0); assert.equal(isolated.store.list('agent_cases').length, 0);
  assert.equal(isolated.store.list('enrichment_jobs')[0].status, 'failed');
  record('F10', 'Repaired in N02: retrieval failure retains original risks and continued telemetry; failed enrichment is durable.', { persistedRiskCount: isolated.store.list('risk_events').length, job: isolated.store.list('enrichment_jobs')[0], missionTime: isolated.engine.state.now });
} finally { Object.defineProperty(SOURCES[0], 'verified', originalVerified); await isolated.close(); }

const store = new Store();
try {
  const comms = new Comms(store);
  comms.control({ loss: 1, one_way_latency_ms: 0, jitter_ms: 0 }, EPOCH);
  comms.enqueue({ id: 'case-audit' }, EPOCH, { id: 'report-case-audit' });
  for (let i = 0; i < 30; i++) comms.step(EPOCH + i * 1000);
  const resent = comms.enqueue({ id: 'case-audit' }, EPOCH + 31_000, { id: 'report-case-audit' });
  assert.equal(resent.status, 'failed'); assert.equal(resent.attempts, 8);
  record('F07', 'Re-enqueueing the same report after retry exhaustion does not resend it.', { status: resent.status, attempts: resent.attempts, reason: resent.failure_reason });
} finally { store.close(); }

const ui = readFileSync(new URL('../../apps/mission-control-web/app.mjs', import.meta.url), 'utf8');
const agent = readFileSync(new URL('../../services/agent/agent.mjs', import.meta.url), 'utf8');
assert.match(ui, /effectiveAlerts\(\)\.filter/);
assert.doesNotMatch(ui, /state\.alerts\.filter/);
assert.match(agent, /map\(name => \(\{ name, status: 'complete' \}\)\)/);
record('F08', 'N03 software repair: badge uses the selected received/onboard alert projection.', { evidence: 'Source assertion here; actual app-event and projection tests in frontend-correctness.test.mjs. Real browser acceptance remains blocked.' });
assert.doesNotMatch(ui, /Onboard knowledge available/);
record('F13', 'N03 software repair: UI health is inspected; existing renderer switches to fallback on context loss.', { evidence: 'HTML-tree event and mocked-context lifecycle regressions, not browser/GPU proof. Advanced renderer recovery remains N06.' });
record('F09', 'Agent template still assigns completed steps without executing tools; N03 labels its UI as a workflow reference.', { evidence: 'Source inspection: buildCase unchanged. Full tool graph remains N16; no browser claim.' });
console.log(JSON.stringify({ scope: 'N01/N02/N03 software checks and remaining findings. Not browser or full application acceptance.', findings }, null, 2));
