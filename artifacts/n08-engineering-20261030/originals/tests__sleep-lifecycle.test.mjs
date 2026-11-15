import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../services/api/server.mjs';
import { Store } from '../services/api/store.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { SLEEP_PERIOD_MS, lastSleepCompletion, sleepObservation } from '../services/telemetry-simulator/sleep.mjs';
import { EPOCH, validateTelemetry } from '../packages/contracts.mjs';
import { present } from '../packages/presentation.mjs';
import { forecast } from '../services/prediction/forecast.mjs';
import { sleepDetails, metricHistory, lineChart } from '../apps/mission-control-web/ui.mjs';
import { frontendSession } from './dom-harness.mjs';
import { transport } from './http-harness.mjs';

const make=options=>createApp({autoTick:false,caseBuilder:buildCase,...options});
const c3=app=>app.engine.state.crew[2];
const count=(store,table)=>store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
let serial=0;
function imported(app,{session_id='SLEEP-import-session',revision=1,duration=6.5,reason,metadata=true,quality='good',device='SLEEP-IMPORT'}={}){
  const e=sleepObservation(c3(app).sleep_session??app.store.sleepHistory('CREW-03')[0]);
  e.event_id='sleep-import-'+(++serial);e.ts=new Date(app.engine.state.now).toISOString();e.received_ts=e.ts;
  e.source={kind:'synthetic-import',device_id:device,sampling_hz:metadata?1/86400:1/30,clock:'mission_simulation'};
  e.provenance={synthetic:true,seed:92,scenario_id:'sleep-import-fixture',generator_version:'sleep-import-test-v1'};
  e.metric.value=quality==='missing'?null:duration;e.quality={status:quality,confidence:quality==='good'?.98:quality==='missing'?0:.4,artifact:false};
  const end=lastSleepCompletion(app.engine.state.now);
  e.sleep_session={session_id,revision,start_at:new Date(end-duration*3600000).toISOString(),end_at:new Date(end).toISOString(),...(reason?{reason}:{})};
  if(!metadata)delete e.sleep_session;return e;
}
const correction=(record,hours,extra={})=>({expected_revision:record.revision,start_at:new Date(Date.parse(record.end_at)-hours*3600000).toISOString(),end_at:record.end_at,reason:'Synthetic source duration correction',...extra});

test('Sleep: completed record and canonical observation stay byte-stable through ticks and scenario/seed changes',async()=>{
  const app=make();try{
    const records=structuredClone(app.engine.state.crew.map(c=>c.sleep_session));const n=count(app.store,'sleep_sessions');
    for(let i=0;i<20;i++)app.engine.tick(30);
    app.engine.startScenario('sleep-debt-cardio-drift',77);for(let i=0;i<12;i++)app.engine.tick(30);
    for(const [i,c]of app.engine.state.crew.entries()){assert.deepEqual(c.sleep_session,records[i]);assert.deepEqual(c.metric_observations.sleep_duration,records[i].observation);assert.equal(c.values.sleep_duration,records[i].duration_hours);}
    assert.equal(count(app.store,'sleep_sessions'),n);assert.equal(app.store.db.prepare("SELECT COUNT(*) AS n FROM telemetry_points WHERE metric='sleep_duration'").get().n,6);
    assert.match(c3(app).status,/amber|red/,'Current non-sleep signals still produce review');
  }finally{await app.close();}
});
test('Sleep: exact completion boundary creates one new record; daily scenario reduction never rewrites the previous night',async()=>{
  const app=make();try{
    const before=structuredClone(c3(app).sleep_session);app.engine.startScenario('sleep-fatigue');
    const next=Date.parse(before.scheduled_end_at)+SLEEP_PERIOD_MS;
    app.engine.tick((next-app.engine.state.now)/1000-1);assert.deepEqual(c3(app).sleep_session,before);
    app.engine.tick(1);const after=c3(app).sleep_session;
    assert.notEqual(after.session_id,before.session_id);assert.equal(after.end_at,new Date(next).toISOString());assert.ok(after.duration_hours<before.duration_hours-1);
    assert.equal(after.provenance.scenario_id,'sleep-fatigue');assert.equal(after.observation.source.sampling_hz,1/86400);
    assert.equal(app.store.sleepRevision(before.session_id).duration_hours,before.duration_hours);assert.equal(app.store.sleepHistory('CREW-03').length,2);
    app.engine.tick(1);assert.deepEqual(c3(app).sleep_session,after);
  }finally{await app.close();}
});
test('Sleep: correction appends a reasoned revision, preserves originals, rejects stale revisions and resumes the original daily schedule',async()=>{
  const app=make();try{
    const before=structuredClone(c3(app).sleep_session);
    const after=app.engine.correctSleep('CREW-03',before.session_id,correction(before,before.duration_hours+.25));
    assert.equal(after.revision,2);assert.equal(after.supersedes_record_id,before.record_id);assert.equal(after.observed_at,new Date(app.engine.state.now).toISOString());assert.equal(after.end_at,before.end_at);
    const history=app.store.sleepHistory('CREW-03');assert.equal(history.length,2);assert.deepEqual(history.find(r=>r.revision===1),before);
    assert.throws(()=>app.engine.correctSleep('CREW-03',before.session_id,correction(before,7)),e=>e.status===409);
    assert.throws(()=>app.store.db.prepare('UPDATE sleep_sessions SET json=? WHERE record_id=?').run('{}',before.record_id),/append-only/);
    assert.throws(()=>app.store.db.prepare('DELETE FROM sleep_sessions WHERE record_id=?').run(before.record_id),/append-only/);
    app.engine.tick(30);const old=structuredClone(c3(app).sleep_session);
    assert.throws(()=>app.engine.correctSleep('CREW-03',old.session_id,correction(old,7,{reason:''})),e=>e.status===422);
    app.engine.tick((Date.parse(before.scheduled_end_at)+SLEEP_PERIOD_MS-app.engine.state.now)/1000);
    assert.notEqual(c3(app).sleep_session.session_id,before.session_id);assert.equal(app.store.sleepRevision(before.session_id).revision,2);
    assert.throws(()=>app.engine.correctSleep('CREW-03',before.session_id,correction(after,7)),e=>e.status===409);
  }finally{await app.close();}
});
test('Sleep: completion and correction failures roll back records, raw telemetry, snapshots, audit, queue, clock and in-memory ownership',async()=>{
  const app=make();try{
    const snapshot=()=>({state:structuredClone(app.engine.state),tx:app.engine.comms.nextTxAt,counts:['sleep_sessions','telemetry_points','snapshots','audit_events','comms_messages'].map(t=>count(app.store,t))});
    const before=snapshot(),audit=app.store.audit;app.store.audit=function(...args){if(args[1]==='sleep.completed')throw Error('sleep completion audit fault');return audit.apply(this,args);};
    const step=(Date.parse(c3(app).sleep_session.end_at)+SLEEP_PERIOD_MS-app.engine.state.now)/1000;
    assert.throws(()=>app.engine.tick(step),/completion audit fault/);assert.deepEqual(snapshot(),before);app.store.audit=audit;
    const rec=c3(app).sleep_session,save=app.store.snapshot;app.store.snapshot=()=>{throw Error('sleep correction snapshot fault');};
    assert.throws(()=>app.engine.correctSleep('CREW-03',rec.session_id,correction(rec,7)),/snapshot fault/);assert.deepEqual(snapshot(),before);app.store.snapshot=save;
    app.engine.tick(step);assert.equal(app.store.sleepHistory('CREW-03').length,2);
  }finally{await app.close();}
});
test('Sleep: disk restart preserves canonical timestamps/revisions and old history; old versions bootstrap explicitly without rewriting legacy rows',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-sleep-'));const path=join(dir,'sleep.sqlite');let app;
  try{
    app=make({dbPath:path});const r=c3(app).sleep_session;app.engine.correctSleep('CREW-03',r.session_id,correction(r,7));
    const stable=structuredClone(c3(app).sleep_session),history=app.store.sleepHistory('CREW-03');await app.close();
    app=make({dbPath:path});assert.deepEqual(c3(app).sleep_session,stable);app.engine.tick(30);assert.deepEqual(c3(app).sleep_session,stable);assert.deepEqual(app.store.sleepHistory('CREW-03'),history);await app.close();app=null;
    const legacyPath=join(dir,'legacy.sqlite'),store=new Store(legacyPath),b=createBaselines(),s=simulate({seed:42017,tick:1,elapsed:0,now:EPOCH,scenario:'nominal',runId:'legacy',baselines:b,cadenceSeconds:30});
    for(const c of s.crew){delete c.sleep_session;delete c.completed_sleep_records;const e=c.metric_observations.sleep_duration;delete e.sleep_session;e.event_id='legacy-'+c.id;e.ts=new Date(EPOCH).toISOString();e.received_ts=e.ts;e.source={kind:'simulator',device_id:'SIM-'+c.id,sampling_hz:1/30};e.provenance.generator_version='1.0.0';c.values.sleep_duration=8.91;e.metric.value=8.91;}
    store.snapshot(s.crew,new Date(EPOCH).toISOString());const bytes=store.db.prepare('SELECT id,json FROM snapshots ORDER BY id').all();
    store.set('baselines',b);store.set('mission_state',{now:EPOCH,tick:1,runId:'legacy',seed:42017,scenario:'nominal',startedAt:EPOCH,pending:{},ground:null,crew:s.crew,environment:s.environment});
    store.db.exec('DROP TABLE sleep_sessions; DELETE FROM schema_versions WHERE version=3');store.close();
    app=make({dbPath:legacyPath});assert.equal(c3(app).sleep_session,null);assert.equal(sleepDetails(c3(app)).label,'Sleep observation');app.engine.tick(30);
    assert.equal(c3(app).sleep_session.historical_fixture,true);assert.notEqual(c3(app).values.sleep_duration,8.91);
    for(const row of bytes)assert.equal(app.store.db.prepare('SELECT json FROM snapshots WHERE id=?').get(row.id).json,row.json);
    assert.equal(app.store.db.prepare('SELECT MAX(version) AS v FROM schema_versions').get().v,4);
    assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM schema_versions WHERE version=3').get().n,1,'Sleep schema still recreated independently of additive N10 migration');
  }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('Sleep: repeated deterministic runs produce identical session values, identities, transitions and source event timestamps',async()=>{
  const a=make(),b=make();try{
    const simulated=app=>app.engine.state.crew.map(c=>{const r=structuredClone(c.sleep_session);delete r.observation.ingestion.host_received_at;return r;});
    for(const scenario of ['sleep-fatigue','nominal','sleep-debt-cardio-drift']){
      a.engine.startScenario(scenario,91);b.engine.startScenario(scenario,91);
      for(const seconds of [30,3600,86400]){a.engine.tick(seconds);b.engine.tick(seconds);assert.deepEqual(simulated(a),simulated(b));}
    }
  }finally{await a.close();await b.close();}
});
test('Sleep: legacy random consumption and all non-sleep generated values/events remain exactly unchanged',()=>{
  const bs=createBaselines(),rows=[];
  for(const scenario of ['nominal','sleep-debt-cardio-drift','sleep-fatigue','sensor-dropout','post-exercise'])for(const tick of [1,7,40]){
    const s=simulate({seed:42017,tick,elapsed:tick*30,now:EPOCH+tick*30000,scenario,runId:'golden',baselines:bs,cadenceSeconds:30});
    rows.push({scenario,tick,environment:s.environment,crew:s.crew.map(c=>({id:c.id,values:Object.fromEntries(Object.entries(c.values).filter(([k])=>k!=='sleep_duration')),quality:c.quality,confidence:c.confidence,activity:c.activity,artifact:c.artifact})),events:s.events.filter(e=>e.metric.name!=='sleep_duration')});
  }
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'ae875341053db8af47d7239296ebf1f055448c3bf130c33abf9e96855cba3a6d');
  assert.equal(createHash('sha256').update(readFileSync(new URL('../services/anomaly/detector.mjs',import.meta.url))).digest('hex'),'8f3eac13243860ce4df849b8a2b7c4a5cf20f2b2ea46143c7111513ce4200d89');
});
test('Sleep: source-owned imported sessions and revisions survive ticks and scenarios; scalar imports remain accepted and explicitly unverified',async()=>{
  const app=make();try{
    const e=imported(app);app.engine.ingest([e]);const stable=structuredClone(c3(app).sleep_session);app.engine.tick(30);app.engine.startScenario('sleep-fatigue',81);app.engine.tick(30);
    assert.deepEqual(c3(app).sleep_session,stable);assert.equal(c3(app).values.sleep_duration,e.metric.value);
    assert.throws(()=>app.engine.correctSleep('CREW-03',stable.session_id,correction(stable,7)),e=>e.status===409);
    const revision=imported(app,{revision:2,duration:7,reason:'Authorized import correction'});app.engine.ingest([revision]);assert.equal(c3(app).sleep_session.revision,2);
    assert.deepEqual(c3(app).metric_observations.sleep_duration.provenance,revision.provenance);
    app.engine.tick(30);const n=count(app.store,'sleep_sessions'),raw=imported(app,{metadata:false,duration:5});app.engine.ingest([raw]);
    assert.equal(c3(app).sleep_session,null);assert.equal(c3(app).values.sleep_duration,5);assert.equal(sleepDetails(c3(app)).label,'Sleep observation');assert.equal(count(app.store,'sleep_sessions'),n);
    app.engine.tick(30);assert.equal(c3(app).metric_observations.sleep_duration.event_id,raw.event_id);
    app.engine.tick(90);assert.equal(c3(app).metric_quality.sleep_duration.stale,true);assert.equal(c3(app).status,'gray');
  }finally{await app.close();}
});
test('Sleep: imported revision and ownership survive disk restart without a synthetic replacement',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-sleep-import-'));let app;
  try{
    const dbPath=join(dir,'import.sqlite');app=make({dbPath});app.engine.ingest([imported(app)]);app.engine.tick(30);
    app.engine.ingest([imported(app,{revision:2,duration:7,reason:'Source corrected the completion record'})]);
    const before=structuredClone(c3(app).sleep_session),ledger=app.store.sleepHistory('CREW-03');await app.close();app=null;
    app=make({dbPath});assert.deepEqual(c3(app).sleep_session,before);app.engine.startScenario('sleep-fatigue');
    app.engine.tick(86400);assert.deepEqual(c3(app).sleep_session,before);assert.equal(c3(app).values.sleep_duration,7);
    assert.deepEqual(app.store.sleepHistory('CREW-03'),ledger);assert.equal(c3(app).metric_observations.sleep_duration.source.device_id,'SLEEP-IMPORT');
    app.engine.tick(86400);app.engine.tick(86400);assert.equal(c3(app).metric_quality.sleep_duration.stale,true);assert.equal(c3(app).status,'gray');
  }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('Sleep: a missing completed observation stays missing until a source correction, without synthetic quality recovery',async()=>{
  const app=make();try{
    const r=c3(app).sleep_session;app.engine.correctSleep('CREW-03',r.session_id,correction(r,r.duration_hours,{quality:{status:'missing',confidence:0,artifact:false}}));
    const missing=structuredClone(c3(app).sleep_session);app.engine.tick(30);app.engine.tick(30);
    assert.deepEqual(c3(app).sleep_session,missing);assert.equal(c3(app).values.sleep_duration,null);assert.equal(c3(app).status,'gray');
    app.engine.correctSleep('CREW-03',r.session_id,correction(missing,r.duration_hours,{quality:{status:'good',confidence:.98,artifact:false}}));
    assert.equal(c3(app).sleep_session.revision,3);assert.equal(c3(app).values.sleep_duration,r.duration_hours);assert.equal(c3(app).metric_quality.sleep_duration.stale,false);
    assert.deepEqual(app.store.sleepHistory('CREW-03').find(x=>x.revision===2),missing);
  }finally{await app.close();}
});
test('Sleep: invalid session metadata, stale/replayed revisions, device changes and conflicting mixed batches reject atomically',async()=>{
  const app=make();try{
    for(const mutate of [e=>e.sleep_session.session_id=['SLEEP-array'],e=>e.sleep_session.end_at=new Date(app.engine.state.now+1).toISOString(),e=>e.sleep_session.start_at=e.sleep_session.end_at,e=>e.sleep_session.revision=0,e=>e.sleep_session.extra=true,e=>e.metric.value=1,e=>e.source.sampling_hz=1/30,e=>e.sleep_session.revision=2]){
      const e=imported(app);mutate(e);const n=count(app.store,'sleep_sessions');assert.throws(()=>app.engine.ingest([e]));assert.equal(count(app.store,'sleep_sessions'),n);
    }
    const first=imported(app);app.engine.ingest([first]);app.engine.tick(30);
    const state=structuredClone(app.engine.state),n=count(app.store,'sleep_sessions');
    const good=imported(app,{revision:2,reason:'valid correction'}),bad=structuredClone(good);bad.event_id='mixed-old';bad.ts=first.ts;
    assert.throws(()=>app.engine.ingest([good,bad]),e=>e.status===409);assert.deepEqual(app.engine.state,state);assert.equal(count(app.store,'sleep_sessions'),n);
    assert.throws(()=>app.engine.ingest([imported(app,{revision:2,reason:'wrong device',device:'OTHER'})]),e=>e.status===409);
  }finally{await app.close();}
});
test('Sleep: held observation never accrues N02 persistence; missing/suspect and correction-refreshed old completion remain Gray',async()=>{
  const app=make();try{
    const r=c3(app).sleep_session,b=app.engine.baselines['CREW-03'].sleep_duration;
    app.engine.correctSleep('CREW-03',r.session_id,correction(r,b.center-5*b.scale));
    for(let i=0;i<8;i++)app.engine.tick(30);
    assert.equal(c3(app).status,'green');assert.ok(!c3(app).evidence.some(e=>e.metric==='sleep_duration'));
    assert.equal(app.engine.state.pending['CREW-03'].channels.sleep_duration.samples.length,1);
    app.engine.tick(30);app.engine.ingest([imported(app,{quality:'suspect'})]);assert.equal(c3(app).status,'gray');
    app.engine.tick(30);app.engine.ingest([imported(app,{revision:2,reason:'source lost',quality:'missing'})]);assert.equal(c3(app).values.sleep_duration,null);assert.equal(c3(app).status,'gray');
  }finally{await app.close();}
  const app2=make();try{
    const e=imported(app2);const end=new Date(app2.engine.state.now-4*SLEEP_PERIOD_MS).toISOString();e.sleep_session.end_at=end;e.sleep_session.start_at=new Date(Date.parse(end)-e.metric.value*3600000).toISOString();
    app2.engine.ingest([e]);assert.equal(c3(app2).metric_quality.sleep_duration.stale,true);assert.equal(c3(app2).status,'gray');
  }finally{await app2.close();}
});
test('Sleep: immutable Earth packets and knowledge-time history never reveal a new session/correction before delivery',async()=>{
  const app=make();try{
    app.engine.comms.control({one_way_latency_ms:60000,jitter_ms:0,blackout:false,bandwidth_kbps:100000},app.engine.state.now);
    for(let i=0;i<5;i++)app.engine.tick(30);const ground=structuredClone(app.engine.state.ground.crew[2].sleep_session),cutoff=app.engine.state.ground.observed_at;
    const r=c3(app).sleep_session;app.engine.correctSleep('CREW-03',r.session_id,correction(r,6.5));
    assert.deepEqual(app.engine.state.ground.crew[2].sleep_session,ground);assert.equal(app.store.sleepHistory('CREW-03',180,new Date(cutoff).toISOString()).some(r=>r.revision===2),false);
    app.engine.comms.control({blackout:true},app.engine.state.now);app.engine.tick(120);assert.deepEqual(app.engine.state.ground.crew[2].sleep_session,ground);
    app.engine.comms.control({blackout:false},app.engine.state.now);for(let i=0;i<6;i++)app.engine.tick(30);
    assert.equal(app.engine.state.ground.crew[2].sleep_session.revision,2);assert.ok(app.engine.state.ground.received_at>=app.engine.state.ground.transmitted_at+60000);
  }finally{await app.close();}
});
test('Sleep: ledger history uses existing read permissions/self scope; historical records survive scalar retention',async()=>{
  const app=make();try{
    const call=transport(app);assert.equal((await call('/v1/crew/CREW-03/sleep-sessions')).status,401);
    const cookie=(await call('/v1/auth/demo',{body:{role:'astronaut'}})).headers['Set-Cookie'].split(';')[0];
    assert.equal((await call('/v1/crew/CREW-01/sleep-sessions',{cookie})).status,403);assert.equal((await call('/v1/crew/CREW-03/sleep-sessions',{cookie})).json().length,1);
    assert.equal((await call('/v1/crew/CREW-03/sleep-sessions?before=invalid',{cookie})).status,422);
    const originals=app.store.sleepHistory('CREW-03');app.store.prune(app.engine.state.now+3*SLEEP_PERIOD_MS);assert.deepEqual(app.store.sleepHistory('CREW-03'),originals);
  }finally{await app.close();}
});
test('Sleep: Overview, Crew Health and replay use one authoritative value; held history deduplicates and unsupported forecast abstains',async()=>{
  const app=make();let ui;try{
    ui=await frontendSession(app,'demo_admin');const original=c3(app).sleep_session,shown=original.duration_hours.toFixed(1);
    assert.match(ui.el('[data-crew="CREW-03"] .crew-mini-metrics').textContent,new RegExp(shown.replace('.','\\.')));
    assert.match(ui.el('[data-crew="CREW-03"] .crew-mini-metrics').innerHTML,/Completed/);
    await ui.click('[data-crew="CREW-03"]');const tile=ui.all('.metric-tile').find(t=>t.textContent.includes('Last sleep'));assert.ok(tile);assert.ok(tile.textContent.includes(shown));assert.ok(tile.textContent.includes(original.end_at.replace('T',' ')));
    app.engine.tick(30);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.ok(ui.all('.metric-tile').find(t=>t.textContent.includes('Last sleep')).textContent.includes(shown));
    const history=app.store.history('CREW-03',30);assert.equal(metricHistory(history,'sleep_duration').length,1);
    const chart=lineChart(history,'sleep_duration',app.engine.baselines['CREW-03'].sleep_duration);assert.match(chart,/<circle /);assert.match(chart,/completed sessions/);
    const later=structuredClone(history.at(-1));later.metric_observations.sleep_duration.event_id+='-next';later.metric_observations.sleep_duration.ts=new Date(app.engine.state.now+86400000).toISOString();later.values.sleep_duration=shown*1+.5;
    assert.match(lineChart([history[0],later],'sleep_duration',app.engine.baselines['CREW-03'].sleep_duration),/H680V/);
    await ui.click('[data-action="replay"]');assert.match(ui.el('#replay-metrics').textContent,/Last sleep/);assert.ok(ui.el('#replay-metrics').textContent.includes(shown));
    assert.equal(app.engine.predictions('CREW-03').sleep_duration.available,false);assert.equal(forecast(history,'sleep_duration').unsupported_component,'sleep_duration');
    assert.ok(!app.store.list('predictions',100).some(p=>p.target==='sleep_duration'));
  }finally{await ui?.close();await app.close();}
});
