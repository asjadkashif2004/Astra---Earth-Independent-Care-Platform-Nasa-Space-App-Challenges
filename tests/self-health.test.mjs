import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { METRICS } from '../packages/contracts.mjs';
import { deviation, describeDeviation, selfChanges, selfAssessment, selfSteps, hazardMap, SELF_METRICS } from '../apps/mission-control-web/self-health.mjs';
import { frontendSession } from './dom-harness.mjs';

const baseline = Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, { center: m.center, scale: m.scale }]));
const values = Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, m.center]));
const crew = (overrides = {}) => ({ id: 'CREW-03', name: 'Amara Okafor', status: 'green', quality: 'good', values: { ...values }, baseline, metric_observations: {}, ...overrides });
const env = (overrides = {}) => ({ co2_ppm: 720, temperature_c: 22.1, humidity_percent: 44, dose_rate_msv_h: 0.016, warning: false, evidence: [], ...overrides });
const comms = (overrides = {}) => ({ blackout: false, one_way_latency_ms: 720_000, counts: { queued: 0 }, ...overrides });
const openAlert = { id: 'risk-1', crew_id: 'CREW-03', status: 'open', created_at: '2026-11-14T10:00:00Z', evidence: [{ metric: 'heart_rate', standardized_deviation: 5.2, persistence_seconds: 240 }] };
const TREATMENT = /prescri|medicat|\bdrug|\bdose of|take \d|\bmg\b|diagnos(?!is\b)/i;

async function session(role, fn) {
  const app = createApp({ autoTick: false, caseBuilder: buildCase }); let ui;
  try { ui = await frontendSession(app, role); await fn(ui, app); } finally { if (ui) await ui.close(); await app.close(); }
}
function alert(engine) { engine.startScenario('sleep-debt-cardio-drift'); for (let i = 0; i < 12; i++) engine.tick(30); return engine.store.list('risk_events')[0]; }

test('self-view: deviation and wording never turn a missing reading into a usual one', () => {
  assert.equal(deviation(crew({ values: { ...values, heart_rate: null } }), 'heart_rate'), null);
  assert.equal(deviation(crew({ baseline: { ...baseline, heart_rate: { center: 68, scale: 0 } } }), 'heart_rate'), null);
  assert.equal(deviation(crew({ values: { ...values, heart_rate: 68 + 4.5 * 3 } }), 'heart_rate'), 3);
  assert.match(describeDeviation(null), /Unknown/);
  assert.equal(describeDeviation(0.4), 'About your usual');
  assert.equal(describeDeviation(-1.5), 'A little lower than your usual');
  assert.equal(describeDeviation(2.5), 'Higher than your usual');
  assert.equal(describeDeviation(-3.2), 'Much lower than your usual');
  const changes = selfChanges(crew({ values: { ...values, heart_rate: 68 + 4.5 * 2.5, spo2: null } }), METRICS);
  assert.equal(changes.length, SELF_METRICS.length);
  assert.equal(changes[0].metric, 'heart_rate'); assert.equal(changes[0].tone, 'amber');
  assert.equal(changes[1].metric, 'spo2'); assert.equal(changes[1].tone, 'gray'); assert.equal(changes[1].value, null);
  assert.ok(!changes.some(c => c.metric === 'radiation'), 'mission-shared radiation is a hazard, not a personal reading');
});

test('self-view: "Am I OK?" follows reliability and recorded detector events only', () => {
  assert.equal(selfAssessment({ crew: crew(), ready: true }).tone, 'green');
  assert.match(selfAssessment({ crew: crew(), ready: true }).detail, /not a medical clearance/);
  for (const unreliable of [crew({ status: 'gray' }), crew({ quality: 'missing' })]) assert.equal(selfAssessment({ crew: unreliable, ready: true }).tone, 'gray');
  assert.equal(selfAssessment({ crew: crew(), ready: false }).tone, 'gray', 'unknown monitoring readiness is never reported as fine');
  assert.equal(selfAssessment({ crew: undefined, ready: true }).tone, 'gray');
  const review = selfAssessment({ crew: crew({ status: 'amber' }), alerts: [openAlert], ready: true });
  assert.equal(review.tone, 'amber'); assert.equal(review.title, 'Needs a check'); assert.equal(review.alert.id, 'risk-1'); assert.match(review.detail, /not a diagnosis/);
  assert.equal(selfAssessment({ crew: crew({ status: 'red' }), alerts: [openAlert], ready: true }).tone, 'red');
  assert.equal(selfAssessment({ crew: crew(), alerts: [{ ...openAlert, crew_id: 'CREW-01' }], ready: true }).tone, 'green', 'another crew member’s alert is not mine');
  const watched = selfAssessment({ crew: crew(), ready: true, changes: selfChanges(crew({ values: { ...values, heart_rate: 68 + 4.5 * 2.5 } }), METRICS) });
  assert.equal(watched.tone, 'green'); assert.equal(watched.watch, 1); assert.match(watched.detail, /not lasted long enough to be flagged/);
});

test('self-view: steps are procedural, offer acknowledgement only for an open event and never prescribe treatment', () => {
  const unknown = selfSteps({ assessment: selfAssessment({ crew: crew({ status: 'gray' }), ready: true }), crew: crew() });
  assert.deepEqual(unknown.map(s => s.id).slice(0, 3), ['sensor', 'wait', 'tell']); assert.ok(!unknown.some(s => s.id === 'ack'));
  const assessment = selfAssessment({ crew: crew({ status: 'amber' }), alerts: [openAlert], ready: true });
  const linked = selfSteps({ assessment, crew: crew(), comms: comms() });
  const ack = linked.find(s => s.id === 'ack'); assert.equal(ack.action.kind, 'ack'); assert.equal(ack.action.value, 'risk-1'); assert.match(ack.detail, /12\.0-minute/);
  assert.match(selfSteps({ assessment, crew: crew(), comms: comms({ blackout: true }) }).find(s => s.id === 'ack').detail, /blackout/);
  assert.ok(!selfSteps({ assessment: { ...assessment, alert: { ...openAlert, status: 'acknowledged' } }, crew: crew(), comms: comms() }).some(s => s.id === 'ack'));
  const changes = selfChanges(crew({ values: { ...values, sleep_duration: 7.8 - 0.6 * 3, fatigue: 2.7 + 0.65 * 3, exercise: 110 - 12 * 3 } }), METRICS);
  const context = selfSteps({ assessment: selfAssessment({ crew: crew(), ready: true, changes }), crew: crew(), changes, environment: env({ evidence: [{ metric: 'dose_rate_msv_h' }, { metric: 'co2_ppm' }] }) });
  for (const id of ['sleep', 'checkin', 'exercise', 'radiation', 'co2', 'research']) assert.ok(context.some(s => s.id === id), id);
  assert.equal(new Set(context.map(s => s.id)).size, context.length, 'no duplicate steps');
  for (const s of [...unknown, ...linked, ...context]) assert.doesNotMatch(s.title + ' ' + s.detail, TREATMENT, s.id);
});

test('hazard map: NASA’s five hazards with honest Unknown, review and not-tracked coverage', () => {
  const crews = ['CREW-01', 'CREW-02', 'CREW-03'].map(id => crew({ id }));
  const nominal = hazardMap({ crew: crews, environment: env(), comms: comms(), linkKnown: true });
  assert.deepEqual(nominal.map(h => h.id), ['radiation', 'isolation', 'distance', 'gravity', 'environment']);
  assert.ok(nominal.every(h => h.status === 'green'), JSON.stringify(nominal.map(h => h.status_text)));
  for (const h of nominal) { assert.ok(h.notTracked.length > 0, h.id); assert.ok(h.coverage.tracked < h.coverage.total, h.id); }
  assert.ok(nominal.find(h => h.id === 'gravity').notTracked.includes('Bone density'));
  const blind = hazardMap({ crew: [], environment: null, comms: comms(), linkKnown: false });
  assert.ok(blind.every(h => h.status === 'gray'), 'no data is Unknown, never safe');
  assert.equal(blind.find(h => h.id === 'radiation').tracked[0].value, 'Unknown');
  const stressed = hazardMap({ crew: [crew(), crew({ id: 'CREW-01', values: { ...values, sleep_duration: null } }), crew({ id: 'CREW-02', values: { ...values, exercise: 110 - 12 * 3 } })],
    environment: env({ evidence: [{ metric: 'dose_rate_msv_h' }, { metric: 'co2_ppm' }] }), comms: comms({ blackout: true }), linkKnown: true });
  const by = Object.fromEntries(stressed.map(h => [h.id, h]));
  assert.equal(by.radiation.status, 'amber'); assert.equal(by.environment.status, 'amber'); assert.equal(by.distance.status, 'amber'); assert.match(by.distance.status_text, /Blackout/);
  assert.equal(by.isolation.status, 'gray'); assert.match(by.isolation.status_text, /1 of 3 crew unknown/);
  assert.equal(by.gravity.status, 'amber'); assert.match(by.gravity.status_text, /1 crew below usual exercise/);
  const recorded = hazardMap({ crew: [crew()], environment: env(), comms: comms(), linkKnown: true, alerts: [{ ...openAlert, evidence: [{ metric: 'fatigue' }] }] });
  assert.equal(recorded.find(h => h.id === 'isolation').status, 'amber', 'a recorded open review on an isolation indicator is shown');
});

test('UI: Overview shows the five hazards and My health previews any crew for a review role', async () => {
  await session('demo_admin', async ui => {
    assert.equal(ui.all('#hazard-panel .hazard-card').length, 5);
    assert.match(ui.el('#hazard-panel').textContent, /Not tracked:.*Bone density/s);
    assert.match(ui.el('#hazard-panel a').getAttribute('href'), /nasa\.gov\/hrp\/hazards/);
    await ui.click('[data-page="self"]');
    assert.equal(ui.el('#main h1').textContent, 'My health'); assert.equal(ui.el('#breadcrumb').textContent, 'My health');
    assert.equal(ui.el('.nav-button[aria-current="page"]').dataset.page, 'self');
    assert.equal(ui.all('[data-self-crew]').length, 6);
    assert.ok(ui.el('#self-verdict-title').textContent.length > 0);
    assert.equal(ui.all('.self-change').length, SELF_METRICS.length);
    await ui.click('[data-self-crew="CREW-01"]'); assert.equal(ui.module.inspect().crewId, 'CREW-01');
    assert.match(ui.el('.self-verdict-status').textContent, /CREW-01/);
    await ui.click('[data-view="earth"]'); assert.match(ui.el('#self-content').textContent, /onboard view/);
  });
});

test('UI: an astronaut sees only their own My health record with no crew switcher', async () => {
  await session('astronaut', async ui => {
    ui.module.navigate('self'); await ui.flush();
    assert.equal(ui.el('#self-tabs'), null); assert.match(ui.el('.self-verdict-status').textContent, /CREW-03/);
    assert.match(ui.el('#main .page-heading p').textContent, /Your own readings/);
    ui.module.navigate('overview'); await ui.flush();
    assert.equal(ui.all('#hazard-panel .hazard-card').length, 5);
    assert.match(ui.el('#hazard-panel').textContent, /of 1 crew|Within usual range|Unknown/, 'hazards use only the astronaut’s own scoped record');
  });
});

test('UI: a recorded review event appears in My health and one human acknowledgement queues one report', async () => {
  await session('demo_admin', async (ui, app) => {
    const risk = alert(app.engine); assert.ok(risk, 'scenario produced a detector event');
    ui.sources.at(-1).emit(app.engine.snapshot()); ui.module.navigate('self'); await ui.flush();
    await ui.click(`[data-self-crew="${risk.crew_id}"]`);
    assert.notEqual(ui.el('#self-verdict-title').textContent, 'Within your usual range');
    assert.match(ui.el('#self-content').textContent, /review event/);
    const pending = ui.el(`#self-content [data-ack="${risk.id}"]`);
    if (pending) assert.equal(pending.disabled, true, 'acknowledgement waits for the case report');
    await app.engine.enrichPending(); ui.sources.at(-1).emit(app.engine.snapshot()); await ui.flush();
    const button = ui.el(`#self-content [data-ack="${risk.id}"]`); assert.ok(button); assert.equal(button.disabled, false);
    await ui.click(button);
    assert.equal(app.store.record('risk_events', risk.id).status, 'acknowledged');
    assert.equal(app.store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 1);
    assert.equal(ui.el(`#self-content [data-ack="${risk.id}"]`), null, 'no second acknowledgement offered');
  });
});
