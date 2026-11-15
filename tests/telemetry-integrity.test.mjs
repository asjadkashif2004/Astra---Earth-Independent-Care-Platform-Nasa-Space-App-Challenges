import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../services/api/server.mjs';
import { METRICS, validateTelemetry } from '../packages/contracts.mjs';
import { transport } from './http-harness.mjs';

let serial = 0;
const token = 'n01-test-only-service-token';
function observation(engine, name = 'heart_rate', value = 110, options = {}) {
  const ts = new Date(options.at ?? engine.state.now).toISOString();
  return {
    schema_version: 'astra.telemetry.v1', event_id: `n01-${++serial}`,
    mission_id: 'MARS-DEMO-01', crew_id: options.crew ?? 'CREW-03', ts,
    received_ts: new Date(engine.state.now).toISOString(),
    metric: { system: METRICS[name].system ?? 'urn:astra:metric', code: METRICS[name].code, name, unit: METRICS[name].unit, value },
    quality: { status: 'good', confidence: 0.98, artifact: false },
    source: { kind: 'synthetic-import', device_id: 'N01-FIXTURE', sampling_hz: 1 / 30, clock: 'mission_simulation' },
    provenance: { synthetic: true, seed: 1234, scenario_id: 'n01-fixture', generator_version: 'n01-fixture-v1' },
  };
}
const login = async (call, role) => (await call('/v1/auth/demo', { body: { role } })).headers['Set-Cookie'].split(';')[0];
const count = (store, table) => store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const post = (call, events) => call('/v1/ingest/telemetry', { body: { events }, headers: { authorization: `Bearer ${token}` } });

test('N01 F11: required time, source and generator metadata fail closed with bounded 422 errors', async () => {
  const app = createApp({ autoTick: false, ingestToken: token }); const call = transport(app);
  try {
    const mutations = [
      e => { delete e.received_ts; }, e => { e.received_ts = 'invalid'; },
      e => { e.ts = '2026-02-31T11:00:00.000Z'; }, e => { e.ts = new Date(app.engine.state.now + 1).toISOString(); },
      e => { e.received_ts = new Date(app.engine.state.now + 1).toISOString(); },
      e => { e.received_ts = new Date(Date.parse(e.ts) - 1).toISOString(); },
      e => { delete e.source.device_id; }, e => { e.source.device_id = ''; },
      e => { delete e.source.sampling_hz; }, e => { e.source.sampling_hz = -1; },
      e => { e.source.sampling_hz = 0; }, e => { e.source.sampling_hz = 1001; },
      e => { e.source.sampling_hz = 1e-300; },
      e => { e.source.runtime_hz = '1'; }, e => { e.source.clock = 'unknown'; },
      e => { delete e.provenance.generator_version; }, e => { e.provenance.generator_version = ''; },
      e => { e.provenance.seed = -1; }, e => { e.provenance.synthetic = false; },
      e => { e.provenance.scenario_id = ''; }, e => { e.metric.name = 'constructor'; },
      e => { e.metric.name = '__proto__'; }, e => { e.metric.name = ['heart_rate']; },
      e => { e.source.private_payload = 'not-a-supported-field'; },
    ];
    const before = count(app.store, 'telemetry_points');
    for (const [index, mutate] of mutations.entries()) {
      const e = observation(app.engine); mutate(e);
      assert.throws(() => validateTelemetry(e, app.engine.state.now), error => error.status === 422, `mutation ${index}`);
      const response = await post(call, [e]);
      assert.equal(response.status, 422, `API mutation ${index}`);
      assert.equal(response.json().error.code, 'INVALID_TELEMETRY');
    }
    assert.equal(count(app.store, 'telemetry_points'), before);
  } finally { await app.close(); }
});

test('N01: only the service token can import, and external clients cannot impersonate the simulator', async () => {
  const app = createApp({ autoTick: false, ingestToken: token }); const call = transport(app);
  try {
    const e = observation(app.engine);
    assert.equal((await call('/v1/ingest/telemetry', { body: { events: [e] } })).status, 403);
    e.source.kind = 'simulator';
    assert.equal((await post(call, [e])).status, 422);
    assert.equal((await post(call, [])).status, 422);
  } finally { await app.close(); }
});

test('N01 F02: imports persist across ticks without fabricated scalar samples; expired channels become Gray', async () => {
  const app = createApp({ autoTick: false });
  try {
    const e = observation(app.engine); app.engine.ingest([e]);
    const otherBefore = app.engine.state.crew[0].observed_at;
    app.engine.tick(30);
    let c = app.engine.state.crew[2];
    assert.equal(c.values.heart_rate, e.metric.value);
    assert.equal(c.metric_observations.heart_rate.event_id, e.event_id);
    assert.deepEqual(c.metric_observations.heart_rate.provenance, e.provenance);
    assert.equal(c.metric_observations.hrv.source.kind, 'simulator');
    assert.notEqual(app.engine.state.crew[0].observed_at, otherBefore);
    assert.equal(app.store.db.prepare("SELECT COUNT(*) AS n FROM telemetry_points WHERE crew_id='CREW-03' AND metric='heart_rate' AND ts>?").get(e.ts).n, 0);
    app.engine.tick(90); c = app.engine.state.crew[2];
    assert.equal(c.values.heart_rate, 110, 'cached accepted value is retained');
    assert.equal(c.status, 'gray'); assert.equal(c.metric_quality.heart_rate.stale, true);
    assert.equal(c.metric_observations.heart_rate.quality.status, 'good', 'original quality is immutable');
    const fresh = observation(app.engine, 'heart_rate', 108); app.engine.ingest([fresh]);
    assert.equal(app.engine.state.crew[2].metric_quality.heart_rate.stale, false);
    assert.equal(app.engine.state.crew[2].values.heart_rate, 108);
    assert.equal(app.engine.state.crew[2].quality, 'good');
  } finally { await app.close(); }
});

test('N01: scenario changes do not silently surrender imported channel ownership', async () => {
  const app = createApp({ autoTick: false });
  try {
    const e = observation(app.engine); app.engine.ingest([e]);
    app.engine.startScenario('sensor-dropout'); app.engine.tick(30);
    assert.equal(app.engine.state.crew[2].values.heart_rate, 110);
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id, e.event_id);
    assert.equal(app.engine.state.crew[2].values.spo2, null);
    assert.equal(app.engine.state.crew[2].quality, 'missing');
  } finally { await app.close(); }
});

test('N01 F03: reverse-ordered updates in a batch reject atomically without changing state, records or queue', async () => {
  const app = createApp({ autoTick: false });
  try {
    app.engine.ingest([observation(app.engine)]); app.engine.tick(10);
    const before = structuredClone(app.engine.state);
    const counts = ['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t));
    const newer = observation(app.engine, 'heart_rate', 111, { at: app.engine.state.now - 1000 });
    const older = observation(app.engine, 'heart_rate', 99, { at: app.engine.state.now - 2000 });
    assert.throws(() => app.engine.ingest([newer, older]), e => e.status === 409 && e.code === 'OUT_OF_ORDER');
    assert.deepEqual(app.engine.state, before);
    assert.deepEqual(['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t)), counts);
  } finally { await app.close(); }
});

test('N01: per-channel ordering accepts chronological batches and slower channels without moving crew time backwards', async () => {
  const app = createApp({ autoTick: false });
  try {
    app.engine.ingest([observation(app.engine)]); app.engine.tick(10);
    const first = observation(app.engine, 'heart_rate', 109, { at: app.engine.state.now - 2000 });
    const last = observation(app.engine, 'heart_rate', 108, { at: app.engine.state.now - 1000 });
    app.engine.ingest([first, last]);
    const c = app.engine.state.crew[2];
    assert.equal(c.values.heart_rate, 108); assert.equal(c.observed_at, new Date(app.engine.state.now).toISOString());
    assert.equal(c.metric_observations.heart_rate.ts, last.ts);
    assert.throws(() => app.engine.ingest([observation(app.engine, 'heart_rate', 106, { at: Date.parse(last.ts) })]), e => e.code === 'OUT_OF_ORDER');
    assert.throws(() => app.engine.ingest([first]), e => e.status === 409);
    const history = app.store.history('CREW-03', 1)[0];
    assert.equal(history.metric_observations.heart_rate.ts, last.ts);
    assert.equal(history.metric_observations.heart_rate.event_id, last.event_id);
  } finally { await app.close(); }
});

test('N01: duplicate IDs and unapproved device handoffs cannot overwrite accepted channels', async () => {
  const app = createApp({ autoTick: false });
  try {
    const e = observation(app.engine); app.engine.ingest([e]); app.engine.tick(1);
    assert.throws(() => app.engine.ingest([e]), error => error.status === 409);
    const duplicate = observation(app.engine);
    assert.throws(() => app.engine.ingest([duplicate, structuredClone(duplicate)]), error => error.status === 409);
    const different = observation(app.engine); different.source.device_id = 'ANOTHER-DEVICE';
    assert.throws(() => app.engine.ingest([different]), error => error.code === 'SOURCE_CONFLICT');
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id, e.event_id);
  } finally { await app.close(); }
});

test('N01: a failed queue write rolls back import, ownership, history, audit and scheduler state', async () => {
  const app = createApp({ autoTick: false });
  try {
    const before = structuredClone(app.engine.state); const txBefore = app.engine.comms.nextTxAt;
    const counts = ['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t));
    const enqueue = app.engine.comms.enqueue;
    app.engine.comms.enqueue = () => { throw new Error('N01 queue fault'); };
    assert.throws(() => app.engine.ingest([observation(app.engine)]), /N01 queue fault/);
    assert.deepEqual(app.engine.state, before); assert.equal(app.engine.comms.nextTxAt, txBefore);
    assert.deepEqual(['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t)), counts);
    app.engine.comms.enqueue = enqueue;
    app.engine.tick(); assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.source.kind, 'simulator');
  } finally { await app.close(); }
});

test('N01 F02: API import flows through history/SSE and blackout restart into delayed Earth reception', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n01-')); const dbPath = join(dir, 'integrity.sqlite'); let app;
  try {
    app = createApp({ autoTick: false, ingestToken: token, dbPath }); const call = transport(app);
    const cookie = await login(call, 'astronaut');
    const stream = await call('/v1/stream/missions/MARS-DEMO-01', { cookie });
    app.engine.comms.control({ blackout: true, one_way_latency_ms: 60_000, jitter_ms: 0 }, app.engine.state.now);
    const e = observation(app.engine);
    assert.equal((await post(call, [e])).status, 201);
    const data = JSON.parse(stream.text().trim().split('data: ').at(-1));
    assert.equal(data.crew.length, 1); assert.equal(data.crew[0].metric_observations.heart_rate.event_id, e.event_id);
    assert.equal((await call('/v1/crew/CREW-03/telemetry?limit=1', { cookie })).json()[0].values.heart_rate, 110);
    const queued = app.store.list('comms_messages', 1000).find(m => m.payload.crew?.[2].metric_observations?.heart_rate.event_id === e.event_id);
    assert.ok(queued); assert.equal(queued.status, 'queued'); assert.equal(app.engine.state.ground, null);
    stream.request.emit('close'); await app.close(); app = createApp({ autoTick: false, dbPath });
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id, e.event_id);
    app.engine.comms.control({ blackout: false }, app.engine.state.now);
    app.engine.tick(30);
    const sent = app.store.record('comms_messages', queued.id); assert.equal(sent.status, 'in_transit');
    app.engine.tick(30); assert.equal(app.store.record('comms_messages', queued.id).status, 'in_transit');
    app.engine.tick(30); assert.equal(app.store.record('comms_messages', queued.id).status, 'in_transit');
    app.engine.tick(30);
    const delivered = app.store.record('comms_messages', queued.id);
    assert.equal(delivered.status, 'delivered'); assert.ok(delivered.received_at >= delivered.deliver_at);
    assert.equal(app.engine.state.ground.crew[2].metric_observations.heart_rate.event_id, e.event_id);
    assert.deepEqual(delivered.payload.crew[2].metric_observations.heart_rate.provenance, e.provenance);
    assert.ok(app.store.verifyAudit());
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('N01: same-clock import packets have ordered identities so the second received update is not lost', async () => {
  const app = createApp({ autoTick: false });
  try {
    app.engine.comms.control({ blackout: true, one_way_latency_ms: 0, jitter_ms: 0, bandwidth_kbps: 100000 }, app.engine.state.now);
    const hr = observation(app.engine), spo2 = observation(app.engine, 'spo2', 97.5);
    app.engine.ingest([hr]); app.engine.ingest([spo2]);
    const messages = app.store.list('comms_messages', 1000).filter(m => m.status === 'queued').reverse();
    assert.equal(messages.length, 2); assert.equal(messages[0].observed_at, messages[1].observed_at);
    assert.ok(messages[1].payload.sequence > messages[0].payload.sequence);
    app.engine.comms.control({ blackout: false }, app.engine.state.now);
    // Respect serialization of the startup packet already on the link.
    app.engine.tick((Math.max(0, app.engine.comms.nextTxAt - app.engine.state.now) + 100) / 1000); app.engine.tick(0.1);
    assert.equal(app.engine.state.ground.sequence, messages[0].payload.sequence);
    app.engine.tick(0.1);
    assert.equal(app.engine.state.ground.sequence, messages[1].payload.sequence);
    assert.equal(app.engine.state.ground.crew[2].metric_observations.spo2.event_id, spo2.event_id);
  } finally { await app.close(); }
});

test('N01: imported risk evidence cites the actual observations rather than the active simulator provenance', async () => {
  const app = createApp({ autoTick: false });
  try {
    const b = app.engine.baselines['CREW-03'];
    for (let i = 0; i < 4; i++) {
      if (i) app.engine.tick(30);
      app.engine.ingest([observation(app.engine, 'heart_rate', b.heart_rate.center + 3 * b.heart_rate.scale), observation(app.engine, 'hrv', b.hrv.center - 3 * b.hrv.scale)]);
    }
    const risk = app.store.list('risk_events')[0]; assert.ok(risk);
    assert.equal(risk.provenance.scenario_id, 'n01-fixture'); assert.equal(risk.provenance.seed, 1234);
    assert.equal(risk.provenance.generator_version, 'n01-fixture-v1');
    for (const e of risk.evidence) {
      assert.match(e.event_id, /^n01-/); assert.equal(e.source.kind, 'synthetic-import');
      assert.equal(e.provenance.scenario_id, 'n01-fixture'); assert.ok(e.observed_at);
    }
  } finally { await app.close(); }
});

test('N01: additive metadata upgrade recovers latest stored observations without replacing the database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n01-upgrade-')); const dbPath = join(dir, 'legacy.sqlite'); let app;
  try {
    app = createApp({ autoTick: false, dbPath });
    const e = observation(app.engine); app.engine.ingest([e]);
    for (const c of app.engine.state.crew) delete c.metric_observations;
    const before = count(app.store, 'telemetry_points'); await app.close();
    app = createApp({ autoTick: false, dbPath });
    assert.equal(count(app.store, 'telemetry_points'), before);
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id, e.event_id);
    app.engine.tick(30); assert.equal(app.engine.state.crew[2].values.heart_rate, 110);
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('N01 F04: raw check-ins enforce all seven roles, crew self scope and demo-owner scope', async () => {
  const app = createApp({ autoTick: false }); const call = transport(app);
  try {
    const cookies = Object.fromEntries(await Promise.all(['astronaut', 'mission_control', 'flight_surgeon', 'demo_admin', 'viewer', 'researcher', 'system_admin'].map(async role => [role, await login(call, role)])));
    const payload = { crew_id: 'CREW-03', fatigue: 4, reaction_ms: [220, 240, 260] };
    const privateRecord = await call('/v1/checkins', { cookie: cookies.astronaut, body: payload }); assert.equal(privateRecord.status, 201);
    assert.equal((await call('/v1/crew/CREW-03/checkins')).status, 401);
    for (const role of ['viewer', 'researcher', 'system_admin']) {
      for (const suffix of ['', '?limit=1']) assert.equal((await call(`/v1/crew/CREW-03/checkins${suffix}`, { cookie: cookies[role] })).status, 403, role);
    }
    for (const role of ['astronaut', 'mission_control', 'flight_surgeon']) {
      const result = await call('/v1/crew/CREW-03/checkins', { cookie: cookies[role] });
      assert.equal(result.status, 200, role); assert.equal(result.json()[0].id, privateRecord.json().id);
    }
    assert.equal((await call('/v1/crew/CREW-01/checkins', { cookie: cookies.astronaut })).status, 403);
    assert.deepEqual((await call('/v1/crew/CREW-03/checkins', { cookie: cookies.demo_admin })).json(), []);
    const ownRecord = await call('/v1/checkins', { cookie: cookies.demo_admin, body: payload }); assert.equal(ownRecord.status, 201);
    const ownRead = await call('/v1/crew/CREW-03/checkins', { cookie: cookies.demo_admin });
    assert.deepEqual(ownRead.json().map(r => r.id), [ownRecord.json().id]);
    for (const role of ['viewer', 'researcher']) {
      for (const path of ['/v1/state', '/v1/crew/CREW-03', '/v1/crew/CREW-03/telemetry', '/v1/provenance']) {
        const result = await call(path, { cookie: cookies[role] });
        assert.equal(result.status, 200); assert.ok(!result.text().includes(privateRecord.json().id));
        assert.ok(!result.text().includes('reaction_ms'));
      }
    }
    assert.equal(app.engine.state.crew[2].synthetic, true);
  } finally { await app.close(); }
});

test('N01 F05: malformed or non-origin headers return bounded 4xx without applying the write', async () => {
  const app = createApp({ autoTick: false }); const call = transport(app);
  try {
    const cookie = await login(call, 'demo_admin');
    for (const origin of ['', 'not-a-url', 'null', 'http://localhost/path', 'http://user:password@localhost', 'http://localhost?query']) {
      const response = await call('/v1/comms/control', { cookie, body: { blackout: true }, headers: { origin } });
      assert.equal(response.status, 400); assert.equal(response.json().error.code, 'INVALID_ORIGIN');
      assert.equal(app.engine.comms.config.blackout, false); assert.ok(!response.text().includes('password'));
    }
    assert.equal((await call('/v1/comms/control', { cookie, body: {}, headers: { origin: 'https://bad.example' } })).status, 403);
    assert.equal((await call('/v1/comms/control', { cookie, body: {}, headers: { origin: 'http://localhost' } })).status, 200);
  } finally { await app.close(); }
});

test('N01: invalid mixed batches publish no partial records, ownership or SSE update', async () => {
  const app = createApp({ autoTick: false, ingestToken: token }); const call = transport(app);
  try {
    const cookie = await login(call, 'astronaut');
    const stream = await call('/v1/stream/missions/MARS-DEMO-01', { cookie }); const beforeStream = stream.text();
    const before = structuredClone(app.engine.state); const records = count(app.store, 'telemetry_points');
    const invalid = observation(app.engine, 'spo2', 97); delete invalid.provenance.generator_version;
    assert.equal((await post(call, [observation(app.engine), invalid])).status, 422);
    assert.deepEqual(app.engine.state, before); assert.equal(count(app.store, 'telemetry_points'), records);
    assert.equal(stream.text(), beforeStream); stream.request.emit('close');
  } finally { await app.close(); }
});

test('N01: suspect imported channels survive ticks and other good updates until their own recovery', async () => {
  const app = createApp({ autoTick: false });
  try {
    const suspect = observation(app.engine); suspect.quality = { status: 'suspect', confidence: 0.3, artifact: true };
    app.engine.ingest([suspect, observation(app.engine, 'spo2', 98)]); app.engine.tick(30);
    app.engine.ingest([observation(app.engine, 'spo2', 98.2)]);
    assert.equal(app.engine.state.crew[2].status, 'gray');
    assert.equal(app.engine.state.crew[2].metric_quality.heart_rate.artifact, true);
    app.engine.ingest([observation(app.engine, 'heart_rate', 70)]);
    assert.equal(app.engine.state.crew[2].quality, 'good'); assert.equal(app.engine.state.crew[2].artifact, false);
  } finally { await app.close(); }
});

test('N01: a fully imported crew retains original observation times and does not acquire fake fresh measurements', async () => {
  const app = createApp({ autoTick: false });
  try {
    const b = app.engine.baselines['CREW-03'];
    const events = Object.keys(METRICS).map(name => observation(app.engine, name, b[name].center));
    app.engine.ingest(events); const observed = app.engine.state.crew[2].observed_at;
    const points = app.store.db.prepare("SELECT COUNT(*) AS n FROM telemetry_points WHERE crew_id='CREW-03'").get().n;
    app.engine.tick(120);
    assert.equal(app.engine.state.crew[2].observed_at, observed); assert.equal(app.engine.state.crew[2].status, 'gray');
    assert.equal(app.store.db.prepare("SELECT COUNT(*) AS n FROM telemetry_points WHERE crew_id='CREW-03'").get().n, points);
    assert.notEqual(app.engine.state.crew[0].observed_at, observed);
  } finally { await app.close(); }
});

test('N01: receipts are server-owned, UTC timestamps normalize, and caller mutation cannot change provenance', async () => {
  const app = createApp({ autoTick: false, ingestToken: token }); const call = transport(app);
  try {
    const e = observation(app.engine); e.ts = e.ts.replace('.000Z', 'Z'); e.received_ts = e.received_ts.replace('.000Z', 'Z');
    const forged = { ...e, ingestion: { principal: 'simulator' } };
    assert.equal((await post(call, [forged])).status, 422);
    app.engine.ingest([e]); const stored = app.engine.state.crew[2].metric_observations.heart_rate;
    assert.equal(stored.ts, new Date(app.engine.state.now).toISOString());
    assert.equal(stored.ingestion.mission_received_at, stored.ts); assert.equal(stored.ingestion.principal, 'telemetry-service');
    assert.ok(Number.isFinite(Date.parse(stored.ingestion.host_received_at)));
    e.provenance.generator_version = 'mutated'; e.metric.value = 50;
    assert.equal(stored.provenance.generator_version, 'n01-fixture-v1'); assert.equal(stored.metric.value, 110);
  } finally { await app.close(); }
});

test('N01: mixed simulator/import risk provenance never assigns the simulator seed to imported evidence', async () => {
  const app = createApp({ autoTick: false });
  try {
    app.engine.startScenario('sleep-debt-cardio-drift'); const b = app.engine.baselines['CREW-03'];
    for (let i = 0; i < 11; i++) {
      if (i) app.engine.tick(30);
      app.engine.ingest([observation(app.engine, 'heart_rate', b.heart_rate.center + 3 * b.heart_rate.scale)]);
    }
    const risk = app.store.list('risk_events')[0]; assert.ok(risk);
    assert.equal(risk.provenance.scenario_id, 'mixed'); assert.equal(risk.provenance.seed, null);
    assert.equal(risk.provenance.mission_scenario_id, 'sleep-debt-cardio-drift');
    assert.ok(risk.evidence.some(e => e.source.kind === 'synthetic-import'));
    assert.ok(risk.evidence.some(e => e.source.kind === 'simulator'));
  } finally { await app.close(); }
});

test('N01: incomplete legacy metadata remains archived and Gray rather than fabricated as verified', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-n01-incomplete-')); const dbPath = join(dir, 'legacy.sqlite'); let app;
  try {
    app = createApp({ autoTick: false, dbPath }); const e = observation(app.engine); app.engine.ingest([e]);
    const legacy = structuredClone(e); delete legacy.provenance.generator_version;
    app.store.db.prepare('UPDATE telemetry_points SET json=? WHERE event_id=?').run(JSON.stringify(legacy), e.event_id);
    delete app.engine.state.crew[2].metric_observations; await app.close();
    app = createApp({ autoTick: false, dbPath });
    const c = app.engine.state.crew[2]; assert.equal(c.values.heart_rate, 110); assert.equal(c.status, 'gray');
    assert.equal(c.metric_observations.heart_rate.integrity, 'legacy-unverified');
    assert.equal(c.metric_observations.heart_rate.ingestion, null);
    assert.deepEqual(JSON.parse(app.store.db.prepare('SELECT json FROM telemetry_points WHERE event_id=?').get(e.event_id).json), legacy);
    app.engine.tick(30); app.engine.ingest([observation(app.engine, 'heart_rate', 109)]);
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.integrity, 'verified');
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('N01: an audit failure after transmission rolls scheduler and accepted import back together', async () => {
  const app = createApp({ autoTick: false });
  try {
    app.engine.comms.control({ blackout: true }, app.engine.state.now); app.engine.tick(30);
    app.engine.comms.control({ blackout: false }, app.engine.state.now);
    const before = structuredClone(app.engine.state); const tx = app.engine.comms.nextTxAt;
    const counts = ['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t));
    const audit = app.store.audit;
    app.store.audit = () => {
      assert.ok(app.engine.comms.nextTxAt > tx, 'scheduler has advanced before the injected fault');
      throw new Error('N01 audit fault');
    };
    assert.throws(() => app.engine.ingest([observation(app.engine)]), /N01 audit fault/);
    app.store.audit = audit;
    assert.equal(app.engine.comms.nextTxAt, tx); assert.deepEqual(app.engine.state, before);
    assert.deepEqual(['telemetry_points', 'snapshots', 'comms_messages', 'audit_events'].map(t => count(app.store, t)), counts);
  } finally { await app.close(); }
});
