import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { CREW, DEMO_HR, ROLES, METRICS } from '../packages/contracts.mjs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { hrProfile } from '../services/telemetry-simulator/demo-profile.mjs';
import { transport } from './http-harness.mjs';
import { frontendSession } from './dom-harness.mjs';

const appFor = options => createApp({ autoTick: false, caseBuilder: buildCase, ...options });
const start = (e, id = 'CREW-03', options = {}) => e.startScenario(DEMO_HR.id, 42017, 'demo_admin', { target_crew_id: id, ...options });
const run = (e, n = 13, seconds = 30) => { for (let i = 0; i < n; i++) e.tick(seconds); };
const rows = (app, table) => app.store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const savedRun = (e, id) => JSON.parse(e.store.db.prepare('SELECT json FROM scenario_runs WHERE id=?').get(id).json);
let serial = 0;
function imported(e, crewId = 'CREW-03', metric = 'heart_rate', quality = 'good') {
  const event = structuredClone(e.state.crew.find(c => c.id === crewId).metric_observations[metric]);
  delete event.integrity; delete event.ingestion;
  event.event_id = 'N09-import-' + (++serial); event.ts = event.received_ts = new Date(e.state.now).toISOString();
  event.source = { kind: 'synthetic-import', device_id: 'N09-IMPORT', sampling_hz: 1 / 30 };
  event.provenance = { synthetic: true, seed: 72, scenario_id: 'external-fixture', generator_version: 'n09-test' };
  event.quality = { status: quality, confidence: quality === 'good' ? .98 : .4, artifact: quality !== 'good' };
  return event;
}
async function login(call, role = 'demo_admin') { return (await call('/v1/auth/demo', { body: { role } })).headers['Set-Cookie'].split(';')[0]; }

test('N09-D01: fixed elapsed-time envelope has exact onset/ramp/plateau/return/end boundaries', () => {
  for (const [t, phase, fraction] of [[0,'waiting',0],[29,'waiting',0],[30,'ramp',0],[60,'ramp',.5],[90,'plateau',1],[329,'plateau',1],[330,'return',1],[360,'return',.5],[390,'completed',0],[900,'completed',0]])
    assert.deepEqual(hrProfile(t), { phase, fraction });
  assert.equal(DEMO_HR.total_seconds, 390); assert.equal(DEMO_HR.baseline_scale_units, 5);
});
test('N09-D01: all six targets change only HR; non-target crew, other metrics and baseline remain unchanged', () => {
  const baselines = createBaselines(), copy = JSON.stringify(baselines);
  for (const target of CREW) for (const elapsed of [0,30,60,90,330,360,390]) {
    const options = { seed: 42017, tick: 7, elapsed, now: Date.parse('2026-11-14T11:10:00Z'), runId: 'same-run', baselines };
    const nominal = simulate({ ...options, scenario: 'nominal' });
    const demo = simulate({ ...options, scenario: DEMO_HR.id, demo: { target_crew_id: target.id, status: 'active' } });
    for (let i = 0; i < 6; i++) for (const metric of Object.keys(METRICS)) {
      if (CREW[i].id === target.id && metric === 'heart_rate') {
        const offset = baselines[target.id].heart_rate.scale * 5 * hrProfile(elapsed).fraction;
        assert.ok(Math.abs(demo.crew[i].values[metric] - nominal.crew[i].values[metric] - offset) < .011);
      } else assert.equal(demo.crew[i].values[metric], nominal.crew[i].values[metric], target.id + ':' + metric);
    }
  }
  assert.equal(JSON.stringify(baselines), copy);
});
test('N09-D01: six real pipelines persist qualified warnings at actual observation time with no forced cases or acknowledgement', async () => {
  const outcomes = [];
  for (const crew of CREW) {
    const app = appFor();
    try {
      const initial = app.engine.state.now; const manifest = start(app.engine, crew.id); let first;
      for (let i = 0; i < 13; i++) {
        app.engine.tick(30); const d = app.engine.demoSummary();
        if (i < 6) assert.equal(d.risk, null, 'No early profile-label alert');
        if (d.risk && !first) first = { at: d.elapsed_seconds, ...d.risk };
      }
      const d = app.engine.demoSummary(); assert.equal(d.phase, 'completed'); assert.equal(d.monitoring_state, 'detected');
      const risks = app.store.list('risk_events'); assert.equal(risks.length, 1); const risk = risks[0];
      assert.equal(risk.crew_id, crew.id); assert.equal(risk.run_id, manifest.id); assert.equal(risk.severity, 'warning');
      assert.equal(risk.created_at, new Date(initial + first.at * 1000).toISOString());
      for (const evidence of risk.evidence) {
        assert.equal(evidence.metric, 'heart_rate'); assert.ok(evidence.rules.includes('persistent_single_signal'));
        assert.ok(evidence.single_persistence_seconds >= 120); assert.ok(evidence.event_id.startsWith(manifest.id + ':'));
        assert.equal(evidence.source.kind, 'simulator'); assert.equal(evidence.provenance.scenario_id, DEMO_HR.id);
        assert.equal(evidence.provenance.synthetic, true); assert.equal(evidence.quality.status, 'good');
      }
      assert.equal(app.store.list('agent_cases').length, 0); assert.equal(app.store.list('comms_messages', 1000).filter(m => m.kind === 'case').length, 0);
      await app.engine.enrichPending(); const c = app.store.list('agent_cases')[0];
      assert.equal(c.generated_by_llm, false); assert.equal(c.human_ack, null); assert.equal(c.message_id, null);
      outcomes.push({ crew: crew.id, first_warning_seconds: first.at, severity: risk.severity, rules: risk.evidence[0].rules, persistence: risk.evidence[0].single_persistence_seconds });
    } finally { await app.close(); }
  }
  console.log('N09 measured outcomes ' + JSON.stringify(outcomes));
});
test('N09-D01: only Demo administrator can start or stop; all other roles and anonymous requests reject', async () => {
  const app = appFor(); const call = transport(app);
  try {
    assert.equal((await call(`/v1/scenarios/${DEMO_HR.id}/start`, { body: { target_crew_id: 'CREW-01' } })).status, 401);
    for (const role of ROLES) {
      const cookie = await login(call, role); const before = JSON.stringify(app.engine.state);
      const result = await call(`/v1/scenarios/${DEMO_HR.id}/start`, { cookie, body: { seed: 42017, target_crew_id: 'CREW-01' } });
      assert.equal(result.status, role === 'demo_admin' ? 201 : 403, role);
      if (role !== 'demo_admin') assert.equal(JSON.stringify(app.engine.state), before);
      const stop = await call(`/v1/scenarios/${DEMO_HR.id}/stop`, { cookie, body: {} });
      assert.equal(stop.status, role === 'demo_admin' ? 200 : 403);
    }
  } finally { await app.close(); }
});
test('N09-D01: malformed targets, unknown/extra parameters and fractional seeds reject before any mission mutation', async () => {
  const app = appFor(), call = transport(app);
  try {
    const cookie = await login(call);
    for (const body of [{}, {target_crew_id:'CREW-99'}, {target_crew_id:[]}, {target_crew_id:'CREW-01',seed:1.5}, {target_crew_id:'CREW-01',heart_rate:160}, {target_crew_id:'CREW-01',advance:true}]) {
      const before = JSON.stringify(app.engine.state), count = rows(app, 'scenario_runs');
      assert.equal((await call(`/v1/scenarios/${DEMO_HR.id}/start`, {cookie,body})).status, 422);
      assert.equal(JSON.stringify(app.engine.state), before); assert.equal(rows(app, 'scenario_runs'), count);
    }
  } finally { await app.close(); }
});
test('N09-D01: imported, unknown, unverified or non-resting target HR is rejected without stealing ownership', async () => {
  for (const kind of ['imported','unknown','unverified','exercise','baseline']) {
    const app = appFor();
    try {
      const c = app.engine.state.crew[2];
      if (kind === 'imported') app.engine.ingest([imported(app.engine)]);
      if (kind === 'unknown') c.metric_observations.heart_rate.source.kind = 'unknown';
      if (kind === 'unverified') c.metric_observations.heart_rate.integrity = 'legacy-unverified';
      if (kind === 'exercise') { app.engine.startScenario('post-exercise'); app.engine.tick(30); }
      if (kind === 'baseline') app.engine.baselines['CREW-03'].heart_rate.scale = NaN;
      const before = JSON.stringify(app.engine.state);
      assert.throws(() => start(app.engine), e => e.status === 409, kind);
      assert.equal(JSON.stringify(app.engine.state), before);
    } finally { await app.close(); }
  }
});
test('N09-D01: mid-run import blocks the offset immediately, preserves the held source and cannot masquerade as demo evidence', async () => {
  const app = appFor();
  try {
    start(app.engine); app.engine.tick(30); const event = imported(app.engine); app.engine.ingest([event]);
    const held = structuredClone(app.engine.state.crew[2].metric_observations.heart_rate);
    assert.equal(app.engine.demoSummary().phase, 'blocked');
    run(app.engine); const d = app.engine.demoSummary();
    assert.equal(d.monitoring_state, 'unknown'); assert.equal(d.risk, null);
    assert.deepEqual(app.engine.state.crew[2].metric_observations.heart_rate, held);
    assert.equal(app.engine.state.crew[2].values.heart_rate, event.metric.value);
  } finally { await app.close(); }
});
test('N09-D01: poor-quality or stale non-target channels stay owned, suppress unsupported alerts and retain Unknown coverage', async () => {
  for (const quality of ['suspect','good']) {
    const app = appFor();
    try {
      const event = imported(app.engine, 'CREW-03', 'hrv', quality); app.engine.ingest([event]); start(app.engine);
      const held = structuredClone(app.engine.state.crew[2].metric_observations.hrv); run(app.engine);
      assert.deepEqual(app.engine.state.crew[2].metric_observations.hrv, held);
      const d = app.engine.demoSummary(); assert.equal(d.quality_gaps, true); assert.equal(d.monitoring_state, 'unknown'); assert.equal(d.risk, null);
      assert.equal(app.engine.state.crew[2].status, 'gray');
    } finally { await app.close(); }
  }
});
test('N09-D01: a short stopped run never fabricates an alert; stop retains snapshots, queued packets and blackout', async () => {
  const app = appFor();
  try {
    app.engine.comms.control({blackout:true}, app.engine.state.now); const manifest = start(app.engine); app.engine.tick(30);
    const counts = ['snapshots','telemetry_points','comms_messages'].map(t => rows(app,t)); const clock = app.engine.state.now;
    app.engine.startScenario('nominal'); const d = app.engine.demoSummary();
    assert.equal(d.monitoring_state, 'stopped'); assert.equal(d.risk,null); assert.equal(d.current_run,false);
    assert.equal(savedRun(app.engine,manifest.id).demo.status,'stopped'); assert.equal(app.engine.comms.config.blackout,true);
    assert.equal(app.engine.state.now,clock); assert.deepEqual(['snapshots','telemetry_points','comms_messages'].map(t=>rows(app,t)),counts);
    app.engine.tick(30); assert.equal(app.engine.state.crew[2].status,'green'); assert.equal(rows(app,'risk_events'),0);
  } finally { await app.close(); }
});
test('N09-D01: sparse finite observations can legitimately complete with no alert; service failure reports Unknown', async () => {
  const app = appFor();
  try {
    start(app.engine); app.engine.tick(180); app.engine.tick(210);
    assert.equal(app.engine.demoSummary().phase,'completed'); assert.equal(app.engine.demoSummary().monitoring_state,'no_alert');
    app.engine.monitor.failure(); assert.equal(app.engine.demoSummary().monitoring_state,'unknown');
  } finally { await app.close(); }
});
test('N09-D01: restart and equal initial checkpoints preserve profile values, run IDs, timestamps, baselines and completion', async () => {
  const dir=mkdtempSync(join(tmpdir(),'astra-n09-')); const dbPath=join(dir,'demo.sqlite'); let a=appFor({dbPath}); const b=appFor();
  try {
    start(a.engine,'CREW-05'); start(b.engine,'CREW-05'); run(a.engine,3); run(b.engine,3);
    const runId=a.engine.state.runId, before=JSON.stringify(a.engine.state); await a.close(); a=appFor({dbPath});
    assert.equal(a.engine.state.runId,runId); assert.equal(JSON.stringify(a.engine.state),before);
    for(let i=0;i<10;i++) {
      a.engine.tick(30); b.engine.tick(30);
      assert.deepEqual(a.engine.state.crew.map(c=>c.values),b.engine.state.crew.map(c=>c.values));
      assert.equal(a.engine.state.crew[4].metric_observations.heart_rate.ts,b.engine.state.crew[4].metric_observations.heart_rate.ts);
      assert.deepEqual(a.engine.baselines,b.engine.baselines);
    }
    assert.equal(a.engine.demoSummary().phase,'completed'); assert.equal(savedRun(a.engine,runId).demo.status,'completed');
  } finally { await a.close(); await b.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('N09-D01: initial tick or run-write failure rolls back clock, manifest, pending state, telemetry, queue and checkpoint', async () => {
  for (const fault of ['scenario.started','telemetry']) {
    const app=appFor();
    try {
      const before=structuredClone(app.engine.state), counts=['scenario_runs','snapshots','telemetry_points','comms_messages'].map(t=>rows(app,t));
      const audit=app.store.audit.bind(app.store),ingest=app.store.ingest.bind(app.store);
      if(fault==='scenario.started')app.store.audit=(actor,action,...args)=>{if(action===fault)throw Error('Injected run write');return audit(actor,action,...args);};
      else app.store.ingest=()=>{throw Error('Injected first telemetry write');};
      assert.throws(()=>start(app.engine,'CREW-02',{advance:true}),/Injected/);
      assert.deepEqual(app.engine.state,before); assert.deepEqual(app.store.get('mission_state'),before);
      assert.deepEqual(['scenario_runs','snapshots','telemetry_points','comms_messages'].map(t=>rows(app,t)),counts);
      app.store.audit=audit;app.store.ingest=ingest;
    } finally { await app.close(); }
  }
});
test('N09-D01: finite completion write failure rolls back lifecycle and observations coherently', async () => {
  const app=appFor();
  try {
    start(app.engine);run(app.engine,12);const before=structuredClone(app.engine.state),manifest=savedRun(app.engine,before.runId),put=app.store.put.bind(app.store);
    app.store.put=(table,...args)=>{if(table==='scenario_runs')throw Error('Injected completion write');return put(table,...args);};
    assert.throws(()=>app.engine.tick(30),/Injected completion/);assert.deepEqual(app.engine.state,before);assert.deepEqual(savedRun(app.engine,before.runId),manifest);
    assert.deepEqual(app.store.get('mission_state'),before);app.store.put=put;app.engine.tick(30);assert.equal(app.engine.demoSummary().phase,'completed');
  } finally { await app.close(); }
});
test('N09-D01: new run does not inherit old alerts; source history and its original risk IDs remain preserved', async () => {
  const app=appFor();
  try {
    const first=start(app.engine);run(app.engine);const old=app.engine.demoSummary().risk;assert.ok(old);
    app.engine.startScenario('nominal');app.engine.tick(30);const second=start(app.engine);assert.notEqual(second.id,first.id);
    assert.equal(app.engine.demoSummary().monitoring_state,'pending');assert.equal(app.engine.demoSummary().risk,null);
    assert.equal(app.store.record('risk_events',old.id).run_id,first.id);
    assert.ok(app.store.history('CREW-03',120).some(c=>c.metric_observations.heart_rate.event_id.startsWith(first.id+':')));
  } finally { await app.close(); }
});
test('N09-D01: enrichment failure preserves actual alert, 202/409 and human gate; delayed Earth delivery is durable and never early', async () => {
  let fail=true,host=1000;const app=appFor({clock:()=>host,caseBuilder:(risk,now)=>{if(fail)throw Error('Optional failure');return buildCase(risk,now);}}),call=transport(app);
  try {
    const cookie=await login(call);app.engine.comms.control({blackout:true,one_way_latency_ms:60000,jitter_ms:0},app.engine.state.now);
    start(app.engine);run(app.engine,7);const d=app.engine.demoSummary();assert.equal(d.monitoring_state,'detected');await app.engine.enrichPending();
    assert.equal(app.engine.demoSummary().case_state,'enrichment_failed');
    assert.equal((await call('/v1/agent/cases',{cookie,body:{risk_event_id:d.risk.id}})).status,202);
    assert.equal((await call(`/v1/alerts/${d.risk.id}/ack`,{cookie,body:{}})).status,409);
    assert.equal(app.engine.state.ground,null);fail=false;host+=2000;await app.engine.enrichPending();
    for(let i=0;i<2;i++)assert.equal((await call(`/v1/alerts/${d.risk.id}/ack`,{cookie,body:{}})).status,200);
    let messages=app.store.list('comms_messages',1000).filter(m=>m.kind==='case');assert.equal(messages.length,1);const id=messages[0].id;
    app.engine.startScenario('nominal');app.engine.tick(30);assert.equal(app.engine.comms.config.blackout,true);
    assert.equal(app.store.record('comms_messages',id).status,'queued');
    app.engine.comms.control({blackout:false},app.engine.state.now);app.engine.tick(30);
    let m=app.store.record('comms_messages',id);assert.equal(m.received_at,null);assert.ok(m.deliver_at>=m.transmitted_at+60000);
    for(let i=0;i<5&&!app.store.record('comms_messages',id).received_at;i++)app.engine.tick(30);
    m=app.store.record('comms_messages',id);assert.equal(m.status,'delivered');assert.ok(m.received_at>=m.deliver_at);
    assert.ok(app.store.record('agent_cases',m.payload.id).human_ack);assert.equal(app.store.verifyAudit(),true);
  } finally { await app.close(); }
});
test('N09-D01 frontend: six targets submit real IDs and preserve seed, focus and selection during live updates', async () => {
  const app=appFor();let ui;
  try {
    ui=await frontendSession(app);await ui.click('[data-page="scenario"]');assert.equal(ui.all('#demo-target option').length,6);
    const select=ui.el('#demo-target');select.value='CREW-06';select.focus();
    ui.el('#scenario-seed').value='91';app.engine.tick(30);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    assert.equal(ui.el('#demo-target'),select);assert.equal(ui.document.activeElement,select);assert.equal(select.value,'CREW-06');
    await ui.click(`[data-scenario="${DEMO_HR.id}"]`);assert.equal(app.engine.demoSummary().target_crew_id,'CREW-06');assert.equal(app.engine.state.seed,91);
    assert.equal(ui.el('#scenario-seed').value,'91');assert.match(ui.el('#demo-status').textContent,/PENDING/);
    for(const c of CREW){await ui.click('[data-stop-scenario]');ui.el('#demo-target').value=c.id;await ui.click(`[data-scenario="${DEMO_HR.id}"]`);assert.equal(app.engine.demoSummary().target_crew_id,c.id);}
  } finally {if(ui)await ui.close();await app.close();}
});
test('N09-D01 frontend: pending/detected, template links, stop and old-run isolation use backend evidence', async () => {
  const app=appFor();let ui;
  try {
    ui=await frontendSession(app);await ui.click('[data-page="scenario"]');await ui.click(`[data-scenario="${DEMO_HR.id}"]`);
    run(app.engine,6);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.match(ui.el('#demo-status').textContent,/DETECTED/);
    assert.match(ui.el('#demo-evidence').textContent,/CREW-03/);assert.match(ui.el('#demo-evidence').textContent,/not LLM/);
    assert.equal(ui.all('#demo-evidence [data-crew="CREW-03"]').length,1);
    await ui.click('[data-stop-scenario]');assert.match(ui.el('#demo-evidence').textContent,/Last demonstration/);
    await ui.click(`[data-scenario="${DEMO_HR.id}"]`);assert.match(ui.el('#demo-status').textContent,/PENDING/);
    app.engine.monitor.failure();await ui.module.pollStatus();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.match(ui.el('#demo-status').textContent,/UNKNOWN/);
  } finally {if(ui)await ui.close();await app.close();}
});
test('N09-D01 frontend: rejected import ownership preserves selection and input; viewers cannot start', async () => {
  for(const role of ['demo_admin','viewer']){
    const app=appFor();let ui;
    try{
      app.engine.ingest([imported(app.engine)]);ui=await frontendSession(app,role);await ui.click('[data-page="scenario"]');
      const before=app.engine.state.runId;ui.el('#scenario-seed').value='123';await ui.click(`[data-scenario="${DEMO_HR.id}"]`);
      assert.equal(app.engine.state.runId,before);assert.equal(ui.el('#scenario-seed').value,'123');assert.equal(ui.el('#demo-target').value,'CREW-03');
      if(role==='demo_admin')assert.match(ui.el('#toast').textContent,/ownership|imported/);else assert.equal(ui.el('#demo-target').disabled,true);
    }finally{if(ui)await ui.close();await app.close();}
  }
});
test('N09-D01: astronaut snapshots cannot expose another target demo', async () => {
  const app=appFor(),call=transport(app);
  try{start(app.engine,'CREW-01');const cookie=await login(call,'astronaut');const s=(await call('/v1/state',{cookie})).json();assert.equal(s.scenario.demo,null);assert.equal(s.crew.length,1);}
  finally{await app.close();}
});
test('N09-D01 frontend: Earth reception view withholds unreceived demonstration alerts and disables injection', async () => {
  const app=appFor();let ui;
  try{
    start(app.engine);run(app.engine,7);const id=app.engine.demoSummary().risk.id;
    ui=await frontendSession(app);await ui.click('[data-page="scenario"]');assert.match(ui.el('#demo-status').textContent,/DETECTED/);
    await ui.click('[data-view="earth"]');assert.match(ui.el('#demo-status').textContent,/withheld/);
    assert.ok(!ui.el('#demo-evidence').textContent.includes(id));assert.equal(ui.el(`[data-scenario="${DEMO_HR.id}"]`).disabled,true);
    assert.equal(ui.el('#demo-target').disabled,true);
  }finally{if(ui)await ui.close();await app.close();}
});
