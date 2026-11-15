import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { METRICS, SYMPTOMS, SYMPTOM_NOTE_MAX } from '../packages/contracts.mjs';
import { selfAssessment, selfSteps, recentReport, reportSummary, symptomHistoryHTML } from '../apps/mission-control-web/self-health.mjs';
import { transport } from './http-harness.mjs';
import { frontendSession } from './dom-harness.mjs';

const login = async (call, role) => (await call('/v1/auth/demo', { body: { role } })).headers['Set-Cookie'].split(';')[0];
async function api(fn) { const app = createApp({ autoTick: false }); try { await fn(transport(app), app); } finally { await app.close(); } }
async function session(role, fn) {
  const app = createApp({ autoTick: false, caseBuilder: buildCase }); let ui;
  try { ui = await frontendSession(app, role); await fn(ui, app); } finally { if (ui) await ui.close(); await app.close(); }
}
const TREATMENT = /prescri|medicat|\bdrug|\bdose of|take \d|\bmg\b|diagnos(?!is\b)/i;
const baseline = Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, { center: m.center, scale: m.scale }]));
const crew = (o = {}) => ({ id: 'CREW-03', name: 'Amara Okafor', status: 'green', quality: 'good', values: Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, m.center])), baseline, ...o });
const report = (symptoms, reported_at = '2026-11-14T10:00:00.000Z') => ({ id: 'r1', crew_id: 'CREW-03', reported_at, symptoms: symptoms.map(([id, severity]) => ({ id, severity, label: SYMPTOMS.find(s => s.id === id).label })), max_severity: Math.max(0, ...symptoms.map(s => s[1])), note: '' });

test('symptom API: an astronaut saves a private, append-only, non-synthetic report that changes no alert or telemetry', async () => {
  await api(async (call, app) => {
    const cookie = await login(call, 'astronaut');
    const before = { alerts: app.store.list('risk_events').length, messages: app.store.list('comms_messages', 1000).length, state: JSON.stringify(app.engine.snapshot().crew) };
    const r = await call('/v1/symptom-reports', { cookie, body: { crew_id: 'CREW-03', symptoms: [{ id: 'headache', severity: 2 }, { id: 'vision', severity: 3 }], note: '  started after exercise  ' } });
    assert.equal(r.status, 201, r.text()); const saved = r.json();
    assert.equal(saved.synthetic, false); assert.equal(saved.source, 'user_self_report'); assert.equal(saved.transmitted_to_earth, false);
    assert.equal(saved.max_severity, 3); assert.equal(saved.note, 'started after exercise'); assert.equal(saved.actor, 'demo-astronaut');
    assert.deepEqual(saved.symptoms.map(s => [s.id, s.severity]), [['headache', 2], ['vision', 3]]); assert.match(saved.symptoms[1].risk, /SANS/);
    assert.equal(app.store.list('risk_events').length, before.alerts, 'a report never creates an alert');
    assert.equal(JSON.stringify(app.engine.snapshot().crew), before.state, 'a report never changes telemetry or crew state');
    assert.equal(app.store.list('comms_messages', 1000).length, before.messages, 'a report is not queued for Earth');
    const audit = app.store.audits().find(e => e.action === 'symptom_report.created'); assert.ok(audit);
    assert.doesNotMatch(audit.json, /headache|vision|exercise/, 'audit records the event, not the private content');
    const list = await call('/v1/crew/CREW-03/symptom-reports', { cookie }); assert.equal(list.status, 200); assert.equal(list.json()[0].id, saved.id);
    assert.throws(() => app.store.db.prepare("UPDATE symptom_reports SET json='{}'").run(), /append-only/);
    assert.throws(() => app.store.db.prepare('DELETE FROM symptom_reports').run(), /retained/);
    const fine = await call('/v1/symptom-reports', { cookie, body: { crew_id: 'CREW-03', symptoms: [] } });
    assert.equal(fine.status, 201); assert.equal(fine.json().max_severity, 0, 'an empty list records feeling fine');
  });
});

test('symptom API: strict validation rejects unknown, repeated or out-of-range input atomically', async () => {
  await api(async (call, app) => {
    const cookie = await login(call, 'astronaut');
    const bad = [
      { crew_id: 'CREW-03', symptoms: [{ id: 'invented', severity: 1 }] },
      { crew_id: 'CREW-03', symptoms: [{ id: 'nausea', severity: 1 }, { id: 'nausea', severity: 2 }] },
      { crew_id: 'CREW-03', symptoms: [{ id: 'nausea', severity: 0 }] },
      { crew_id: 'CREW-03', symptoms: [{ id: 'nausea', severity: 4 }] },
      { crew_id: 'CREW-03', symptoms: [{ id: 'nausea', severity: 1.5 }] },
      { crew_id: 'CREW-03', symptoms: [{ id: 'nausea', severity: '2' }] },
      { crew_id: 'CREW-03', symptoms: 'nausea' },
      { crew_id: 'CREW-03', symptoms: [], note: 'x'.repeat(SYMPTOM_NOTE_MAX + 1) },
      { crew_id: 'CREW-03', symptoms: [], note: 42 },
    ];
    for (const body of bad) assert.equal((await call('/v1/symptom-reports', { cookie, body })).status, 422, JSON.stringify(body).slice(0, 80));
    assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM symptom_reports').get().n, 0);
  });
});

test('symptom API: reuses check-in privacy — self-only astronaut, own-entry demo admin, no viewer or researcher access', async () => {
  await api(async call => {
    const astronaut = await login(call, 'astronaut'), viewer = await login(call, 'viewer'), researcher = await login(call, 'researcher');
    const admin = await login(call, 'demo_admin'), surgeon = await login(call, 'flight_surgeon');
    assert.equal((await call('/v1/symptom-reports', { cookie: astronaut, body: { crew_id: 'CREW-01', symptoms: [] } })).status, 403);
    assert.equal((await call('/v1/crew/CREW-01/symptom-reports', { cookie: astronaut })).status, 403);
    for (const cookie of [viewer, researcher]) {
      assert.equal((await call('/v1/symptom-reports', { cookie, body: { crew_id: 'CREW-03', symptoms: [] } })).status, 403);
      assert.equal((await call('/v1/crew/CREW-03/symptom-reports', { cookie })).status, 403);
    }
    assert.equal((await call('/v1/symptom-reports', { cookie: astronaut, body: { crew_id: 'CREW-03', symptoms: [{ id: 'mood', severity: 1 }] } })).status, 201);
    assert.equal((await call('/v1/crew/CREW-03/symptom-reports', { cookie: admin })).json().length, 0, 'demo admin reads only its own entries');
    assert.equal((await call('/v1/crew/CREW-03/symptom-reports', { cookie: surgeon })).json().length, 1, 'an authorized review role can read the report');
    assert.equal((await call('/v1/symptom-reports', { cookie: admin, body: { crew_id: 'CREW-99', symptoms: [] } })).status, 422);
  });
});

test('self-view: a recent report adds context and procedural steps but never sets the verdict tone', () => {
  const now = '2026-11-14T12:00:00.000Z';
  assert.equal(recentReport([report([['headache', 1]], '2026-11-13T11:00:00.000Z')], now), null, 'older than 24 h stays history only');
  assert.equal(recentReport([report([['headache', 1]], '2026-11-14T13:00:00.000Z')], now), null, 'a future-dated report is ignored');
  const severe = report([['headache', 1], ['vision', 3]]);
  assert.equal(recentReport([severe], now), severe);
  assert.equal(reportSummary(severe), 'vision changes (severe), headache (mild)');
  assert.equal(reportSummary(report([])), 'no symptoms (feeling fine)');
  const symptomatic = selfAssessment({ crew: crew(), ready: true, report: severe });
  assert.equal(symptomatic.tone, 'green', 'only the detector and reliability set the tone');
  assert.match(symptomatic.title, /you reported symptoms/);
  assert.equal(selfAssessment({ crew: crew({ status: 'gray' }), ready: true, report: severe }).tone, 'gray');
  assert.equal(selfAssessment({ crew: crew(), ready: true, report: report([]) }).title, 'Within your usual range');
  const steps = selfSteps({ assessment: symptomatic, crew: crew() });
  assert.equal(steps[0].id, 'tell'); assert.match(steps[0].title, /now/, 'a severe item puts “tell a person now” first');
  for (const id of ['vision', 'headache']) assert.ok(steps.some(s => s.id === id), id);
  assert.ok(!steps.some(s => s.id === 'report'), 'no duplicate prompt to report');
  const mild = selfSteps({ assessment: selfAssessment({ crew: crew(), ready: true, report: report([['mood', 1], ['back_pain', 2], ['cold_flu', 1], ['dizziness', 1], ['sleep', 1], ['focus', 1]]) }), crew: crew() });
  for (const id of ['tell', 'talk', 'muscle', 'immune', 'balance', 'sleep', 'checkin']) assert.ok(mild.some(s => s.id === id), id);
  assert.doesNotMatch(mild.find(s => s.id === 'tell').title, /now/);
  assert.equal(new Set(mild.map(s => s.id)).size, mild.length);
  const none = selfSteps({ assessment: selfAssessment({ crew: crew(), ready: true }), crew: crew() });
  assert.equal(none.find(s => s.id === 'report').action.kind, 'scroll');
  for (const s of [...steps, ...mild, ...none]) assert.doesNotMatch(`${s.title} ${s.detail}`, TREATMENT, s.id);
  assert.match(symptomHistoryHTML({ reports: [], canRead: false }), /authorized review roles/);
  assert.match(symptomHistoryHTML({ reports: [{ ...severe, note: '<b>x</b>' }] }), /&lt;b&gt;x&lt;\/b&gt;/, 'notes are escaped');
});

test('UI: an astronaut reports symptoms in My health, sees them in history and in the verdict, and the form survives live updates', async () => {
  await session('astronaut', async (ui, app) => {
    ui.module.navigate('self'); await ui.flush();
    assert.equal(ui.all('[data-symptom]').length, SYMPTOMS.length);
    const save = ui.el('#save-symptoms'); assert.equal(save.disabled, false); assert.match(ui.el('#save-symptoms-label').textContent, /I feel fine/);
    assert.match(ui.el('#symptom-history').textContent, /No reports yet/);
    const headache = ui.el('[data-symptom="headache"]'); headache.value = '3'; await ui.document.emit('change', { target: headache });
    assert.match(ui.el('#save-symptoms-label').textContent, /1 symptom/);
    ui.sources.at(-1).emit(app.engine.snapshot()); await ui.flush();
    assert.equal(ui.el('[data-symptom="headache"]').value, '3', 'a live update never resets an unfinished report');
    ui.el('#symptom-note').value = 'woke up with it';
    await ui.submit('#symptom-form');
    const rows = app.store.symptomReports('CREW-03', 10); assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].symptoms.map(s => [s.id, s.severity]), [['headache', 3]]); assert.equal(rows[0].note, 'woke up with it');
    assert.equal(ui.el('[data-symptom="headache"]').value, '0', 'form resets after a confirmed save');
    assert.match(ui.el('#symptom-history').textContent, /Headache · severe/);
    assert.match(ui.el('#self-verdict').textContent, /You reported headache \(severe\)/);
    assert.match(ui.el('#self-steps').textContent, /Tell your crew medical officer now/);
    assert.match(ui.el('#toast').textContent, /saved privately/);
    assert.equal(app.store.list('risk_events').length, 0);
  });
});

test('UI: viewer sees a disabled form and never requests private self-reports', async () => {
  await session('viewer', async ui => {
    let reads = 0; ui.intercept((path, options, next) => { if (path.includes('symptom-reports')) reads++; return next(path, options); });
    ui.module.navigate('self'); await ui.flush();
    assert.equal(reads, 0); assert.equal(ui.el('#save-symptoms').disabled, true);
    assert.match(ui.el('#symptom-history').textContent, /authorized review roles/);
  });
});
