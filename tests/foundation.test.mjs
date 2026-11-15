import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../services/api/store.mjs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { evaluateCrew } from '../services/anomaly/detector.mjs';
import { evaluateEnvironment } from '../services/anomaly/environment.mjs';
import { validateTelemetry, EPOCH, CREW } from '../packages/contracts.mjs';

const baselines = createBaselines();
const sample = (scenario = 'nominal', elapsed = 0, tick = 1) => simulate({ seed: 42017, tick, elapsed, now: EPOCH + tick * 30_000, scenario, runId: 'run1', baselines, cadenceSeconds:30 });
test('six-crew simulation is reproducible, provenance-rich and contract-valid', () => {
  const a = sample(); assert.deepEqual(a, sample()); assert.equal(a.crew.length, 6); assert.equal(a.events.length, 60);
  for (const event of a.events) assert.equal(validateTelemetry(event, EPOCH + 30_000), event);
});
test('telemetry rejects invalid units, null substitution, stale time and undeclared sources', () => {
  for (const mutate of [e => { e.metric.unit = 'beats'; }, e => { e.metric.value = null; }, e => { e.ts = '2020-01-01'; }, e => { e.provenance.synthetic = false; }, e => { e.metric.value = NaN; }]) {
    const event = structuredClone(sample().events[0]); mutate(event); assert.throws(() => validateTelemetry(event, EPOCH + 30_000));
  }
});
test('SQLite ingest is atomic and rejects duplicates, audit is append-only and chained', () => {
  const store = new Store(); const events = sample().events;
  assert.equal(store.ingest(events), 60); assert.throws(() => store.ingest([events[0]]), /already/);
  const fresh = { ...events[0], event_id: 'fresh' }; assert.throws(() => store.ingest([fresh, events[0]]));
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM telemetry_points').get().n, 60);
  store.audit('test', 'login', 'u1'); store.audit('test', 'ack', 'risk1'); assert.equal(store.verifyAudit(), true);
  assert.throws(() => store.db.exec("UPDATE audit_events SET actor='other'"), /append-only/); store.close();
});
test('held-out seeds stay nominal for a full simulated crew-day', () => {
  for (const seed of [81, 902]) {
    const b = createBaselines(seed); const memory = {};
    for (let t = 0; t < 86_400; t += 60) {
      const s = simulate({ seed, tick: t / 60, elapsed: t, now: EPOCH + t * 1000, scenario: 'nominal', runId: 'eval', baselines: b });
      for (const c of s.crew) { const result = evaluateCrew(c, b[c.id], EPOCH + t * 1000, memory[c.id]); memory[c.id] = result.pending; assert.equal(result.status, 'green'); }
    }
  }
});
test('drift detects within 300s, exercise stays contextual, dropout and contradictions are Gray', () => {
  for (const scenario of ['sleep-debt-cardio-drift', 'post-exercise', 'sensor-dropout', 'contradictory-sensors']) {
    let previous = {}; let first = null; let result;
    for (let t = 0; t <= 360; t += 30) {
      const c = sample(scenario, t, t / 30 + 1).crew[2]; result = evaluateCrew(c, baselines[c.id], Date.parse(c.observed_at), previous); previous = result.pending;
      if (result.review && first === null) first = t;
      if (scenario === 'post-exercise') assert.equal(result.status, 'green');
      if (scenario.includes('sensor') && t >= 30) assert.equal(result.status, 'gray');
    }
    if (scenario === 'sleep-debt-cardio-drift') { assert.ok(first <= 300); assert.equal(result.status, 'amber'); assert.ok(result.evidence.length >= 2); }
  }
  assert.equal(CREW.length, 6);
});

test('environment warnings use measured values and explicitly illustrative thresholds', () => {
  assert.equal(evaluateEnvironment({co2_ppm:720,dose_rate_msv_h:.016}).warning,false);
  const result=evaluateEnvironment({co2_ppm:2800,dose_rate_msv_h:.084});
  assert.equal(result.warning,true);assert.equal(result.evidence.length,2);assert.match(result.interpretation,/not certified/);
});
