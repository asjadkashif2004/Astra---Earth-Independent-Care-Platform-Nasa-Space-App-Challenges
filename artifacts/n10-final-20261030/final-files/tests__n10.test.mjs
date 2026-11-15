import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { transport } from './http-harness.mjs';
import { authorize,validateRequest,STAGES } from '../services/n10/contracts.mjs';
import { append,ledger,digest } from '../services/n10/ledger.mjs';
import { project } from '../services/n10/projection.mjs';
import { DATE,SOURCE_AT,actor,crew,data,request,FIXTURE_VERSION } from './fixtures/n10.mjs';
const now=Date.parse(SOURCE_AT),clone=structuredClone;
const make=options=>createApp({autoTick:false,caseBuilder:buildCase,...options});
const view=(app,options={},identity=actor)=>project(app.store,identity,crew,{date:DATE,before:new Date(app.engine.state.now).toISOString(),days:1,...options},app.engine.state.now);
const put=(app,kind,d=data[kind],options={})=>append(app.store,actor,crew,request(kind,clone(d),options),app.engine.state.now);
for(const kind of Object.keys(data))test('N10 exact '+kind+' input accepts an authentic source fixture',()=>{
  const b=request(kind,clone(data[kind]));assert.deepEqual(validateRequest(b,now),b);
});
for(const label of STAGES)test('S1 preserves exact supplied annotation '+label,()=>{
  assert.equal(validateRequest(request('stage',{...data.stage,label}),now).data.label,label);
});
for(const [name,mutate] of [
  ['unknown key',b=>b.sql='DROP TABLE'],
  ['bad schema',b=>b.schema_version='invented'],['invalid id',b=>b.id='../source.sqlite'],
  ['wrong time',b=>b.source_at='2026-02-30T11:00:00.000Z'],
  ['future source',b=>b.source_at='2027-01-01T11:00:00.000Z'],
  ['negative revision',b=>b.expected_revision=-1],['untrusted source',b=>b.source.kind='N02'],
  ['extra source identity',b=>b.source.path='/secret'],
  ['unsupported stage',b=>b.data.label='REM-diagnosis'],['backwards interval',b=>b.data.end_at=b.data.start_at],
  ['future observation',b=>b.data.end_at='2027-01-01T11:00:00.000Z'],
  ['unbounded record',b=>b.id='a'.repeat(999)],['metadata number',b=>b.data.label=7070]
])test('A1 invalid boundary rejects '+name,()=>{
  const b=request('stage',clone(data.stage));mutate(b);assert.throws(()=>validateRequest(b,now));
});
for(const role of ['viewer','researcher','system_admin','invented'])test('A1 denied N10 role '+role,()=>{
  assert.throws(()=>authorize({id:'test',role},crew),e=>e.status===403);
});
test('A1 self-scoped trusted role accepts self and rejects cross-crew/missing identity',()=>{
  assert.doesNotThrow(()=>authorize({id:'astro',role:'astronaut',crew_id:crew},crew));
  assert.throws(()=>authorize({id:'astro',role:'astronaut',crew_id:'CREW-01'},crew));
  assert.throws(()=>authorize(null,crew));
  assert.throws(()=>authorize({id:'med',role:'flight_surgeon'},crew,true));
});
test('S1 actual ledger reads clip UTC day, retain stage labels/quality and expose gaps/unknown',async()=>{
  const app=make();try{
    put(app,'stage');let v=view(app);assert.equal(v.stages.totals_seconds['Sleep stage 2'],3600);
    assert.equal(v.stages.known_seconds,3600);assert.equal(v.stages.unobserved_seconds,82800);
    put(app,'stage',{...data.stage,start_at:DATE+'T02:00:00.000Z',end_at:DATE+'T03:00:00.000Z',label:'Sleep stage ?'});
    v=view(app);assert.equal(v.stages.covered_seconds,7200);assert.equal(v.stages.known_seconds,3600);assert.equal(v.stages.status,'PARTIAL');
    assert.equal(v.stages.intervals[0].source.source_id,FIXTURE_VERSION);
  }finally{await app.close();}
});
test('S1 overlap invalidates totals and cancelling an interval restores valid aggregation',async()=>{
  const app=make();try{
    put(app,'stage');const r=put(app,'stage').record;
    assert.equal(view(app).stages.status,'UNKNOWN');assert.equal(view(app).stages.totals_seconds,null);
    put(app,'stage',{...r.data,status:'cancelled'},{id:r.id,revision:1});
    assert.equal(view(app).stages.known_seconds,3600);
  }finally{await app.close();}
});
test('S1 duplicate request is idempotent; correction replay uses source AND knowledge time',async()=>{
  const app=make();try{
    const b=request('stage',clone(data.stage)),first=append(app.store,actor,crew,b,now);
    const count=ledger(app.store,crew).length;
    assert.equal(append(app.store,actor,crew,b,now).idempotent,true);assert.equal(ledger(app.store,crew).length,count);
    assert.throws(()=>append(app.store,actor,crew,{...b,data:{...b.data,label:'Sleep stage W'}},now),e=>e.status===409);
    app.engine.tick(30);put(app,'stage',{...data.stage,label:'Sleep stage R'},{id:first.record.id,revision:1});
    assert.equal(view(app,{before:SOURCE_AT}).stages.intervals[0].label,'Sleep stage 2');
    assert.equal(view(app).stages.intervals[0].label,'Sleep stage R');
    assert.equal(view(app,{before:'2026-11-14T10:59:59.000Z'}).record_count,0);
    assert.equal(view(app).records.filter(r=>r.kind==='stage').length,2);
  }finally{await app.close();}
});
test('S2/S3 canonical actual and dated plan produce transparent accounting; missing days remain UNKNOWN',async()=>{
  const app=make();try{
    put(app,'schedule');const v=view(app),s=v.sleep.history[0];
    assert.equal(s.schedule.planned_hours,8);assert.equal(s.actual.hours,app.engine.state.crew[2].sleep_session.duration_hours);
    assert.equal(s.difference_hours,8-s.actual.hours);assert.equal(v.sleep.status,'KNOWN');
    assert.equal(v.sleep.cumulative_shortfall_hours,Math.max(0,s.difference_hours));
    assert.equal(view(app,{days:2}).sleep.status,'UNKNOWN');assert.equal(view(app,{days:2}).sleep.cumulative_shortfall_hours,null);
    assert.equal(view(app,{date:'2026-11-15'}).sleep.history[0].schedule.status,'UNKNOWN');
  }finally{await app.close();}
});
test('S2 conflicting dated schedules and bad reference values fail closed; cancellation removes conflict',async()=>{
  const app=make();try{
    put(app,'schedule');const second=put(app,'schedule').record;
    assert.equal(view(app).sleep.status,'UNKNOWN');
    put(app,'schedule',{...second.data,status:'cancelled'},{id:second.id,revision:1});
    assert.equal(view(app).sleep.status,'KNOWN');
    assert.throws(()=>put(app,'schedule',{...data.schedule,reference_hours:7}));
    assert.throws(()=>put(app,'schedule',{...data.schedule,effective_to:'2027-11-14'}));
  }finally{await app.close();}
});
test('C1 consent is explicit; declines/skips/cancel contain no optional responses',async()=>{
  const app=make();try{
    assert.throws(()=>put(app,'checkin'),e=>e.status===403);
    const c=put(app,'consent',data.consent,{id:'consent:'+actor.id}).record;
    put(app,'checkin');assert.equal(view(app).cognition.history.length,1);
    app.engine.tick(30);
    put(app,'consent',{state:'withdrawn',task:false,mood:false,fatigue:false,share_review:false},{id:c.id,revision:1});
    assert.equal(view(app).cognition.history.length,0);assert.equal(view(app,{before:SOURCE_AT}).cognition.history.length,0);
    assert.throws(()=>put(app,'checkin'),e=>e.status===403);
    put(app,'checkin',{...data.checkin,status:'skipped',trials:[],mood:null,fatigue:null,consent_revision:2});
    put(app,'checkin',{...data.checkin,status:'cancelled',trials:[],mood:null,fatigue:null,consent_revision:2});
    assert.throws(()=>put(app,'checkin',{...data.checkin,status:'skipped'}));
    assert.equal(ledger(app.store,crew).filter(r=>r.kind==='checkin'&&r.data.status==='skipped')[0].data.mood,null);
  }finally{await app.close();}
});
test('C1 per-field consent and trusted actor identity cannot be escalated',async()=>{
  const app=make();try{
    put(app,'consent',{...data.consent,mood:false,fatigue:false},{id:'consent:'+actor.id});
    assert.throws(()=>put(app,'checkin'),e=>e.status===403);
    put(app,'checkin',{...data.checkin,mood:null,fatigue:null});
    assert.equal(view(app,{}, {id:'other',role:'demo_admin'}).cognition.history.length,0);
    assert.equal(view(app,{}, {id:'med',role:'flight_surgeon'}).cognition.history.length,0);
    assert.throws(()=>put(app,'consent',data.consent,{id:'consent:other'}));
  }finally{await app.close();}
});
test('C1 reviewer sees private records only after explicit share, no generic telemetry authorization',async()=>{
  const app=make();try{
    put(app,'consent',{...data.consent,share_review:true},{id:'consent:'+actor.id});put(app,'checkin');
    assert.equal(view(app,{}, {id:'med',role:'flight_surgeon'}).cognition.history.length,1);
    assert.throws(()=>view(app,{}, {id:'research',role:'researcher'}),e=>e.status===403);
  }finally{await app.close();}
});
test('C2 reference uses three PRIOR same-person/device/protocol sessions, with deterministic version and exclusions',async()=>{
  const app=make();try{
    put(app,'consent',data.consent,{id:'consent:'+actor.id});
    for(let i=0;i<4;i++){app.engine.tick(1);put(app,'checkin',{...data.checkin,trials:Array(5).fill(200+i*10)},{source_at:new Date(app.engine.state.now).toISOString()});}
    const r=view(app).cognition.reference;assert.equal(r.status,'KNOWN');assert.equal(r.center_ms,210);assert.equal(r.current_mean_ms,230);assert.equal(r.difference_ms,20);
    assert.equal(r.session_count,3);assert.equal(r.diagnostic_score,null);assert.equal(view(app).cognition.reference.version,r.version);
    app.engine.tick(1);put(app,'checkin',{...data.checkin,device:'other-device'},{source_at:new Date(app.engine.state.now).toISOString()});
    assert.equal(view(app).cognition.reference.status,'UNKNOWN');
  }finally{await app.close();}
});
test('C2 correction/exclusion changes the reference and never incorporates a future task',async()=>{
  const app=make();try{
    put(app,'consent',data.consent,{id:'consent:'+actor.id});const saved=[];
    for(let i=0;i<4;i++){app.engine.tick(1);saved.push(put(app,'checkin',{...data.checkin,trials:Array(5).fill(220+i)},{source_at:new Date(app.engine.state.now).toISOString()}).record);}
    const cut=new Date(app.engine.state.now).toISOString();assert.equal(view(app).cognition.reference.status,'KNOWN');
    app.engine.tick(1);const r=saved[0];put(app,'checkin',{...r.data,status:'excluded',trials:[],mood:null,fatigue:null},{id:r.id,revision:1,source_at:new Date(app.engine.state.now).toISOString()});
    assert.equal(view(app).cognition.reference.status,'UNKNOWN');assert.equal(view(app,{before:cut}).cognition.reference.status,'KNOWN');
  }finally{await app.close();}
});
test('E1/E2 actual plan/session binding, workload and adherence; missing is not nonadherence',async()=>{
  const app=make();try{
    const p=put(app,'exercise_plan').record;
    assert.equal(view(app).exercise.adherence.status,'UNKNOWN');assert.equal(view(app).exercise.adherence.percent,null);
    put(app,'exercise',{...data.exercise,plan_id:p.id,plan_revision:1});
    assert.equal(view(app).exercise.adherence.percent,100);assert.equal(view(app).exercise.sessions[0].data.workload,50);
    assert.equal(view(app).exercise.movement.status,'UNKNOWN');
    put(app,'movement');assert.equal(view(app).exercise.movement.steps,150);
    assert.throws(()=>put(app,'exercise',{...data.exercise,plan_id:p.id,plan_revision:99}));
    assert.throws(()=>put(app,'exercise',{...data.exercise,plan_id:p.id,plan_revision:1,workload_unit:'kg'}));
  }finally{await app.close();}
});
test('E2 partial/missed/plan correction/cancellation rules preserve uncertainty',async()=>{
  const app=make();try{
    const p=put(app,'exercise_plan').record,s=put(app,'exercise',{...data.exercise,plan_id:p.id,plan_revision:1,status:'partial'}).record;
    assert.equal(view(app).exercise.adherence.percent,0);
    put(app,'exercise',{...s.data,status:'cancelled'},{id:s.id,revision:1});
    assert.equal(view(app).exercise.adherence.status,'UNKNOWN');
    put(app,'exercise_plan',{...p.data,status:'cancelled'},{id:p.id,revision:1});
    assert.equal(view(app).exercise.adherence.eligible_plans,0);assert.equal(view(app).exercise.adherence.percent,null);
    put(app,'movement');put(app,'movement');assert.equal(view(app).exercise.movement.status,'UNKNOWN');
  }finally{await app.close();}
});
test('A1 append-only persistence, rollback and restart recover committed rows without mutations from reads',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-n10-final-recovery-')),path=join(dir,'fixture.sqlite');let app=make({dbPath:path});
  try{
    put(app,'stage');const initial=digest(ledger(app.store,crew)),audit=app.store.audit;
    app.store.audit=()=>{throw Error('injected audit failure');};
    assert.throws(()=>put(app,'movement'),/injected audit/);assert.equal(digest(ledger(app.store,crew)),initial);app.store.audit=audit;
    assert.throws(()=>app.store.db.prepare('UPDATE n10_records SET json=?').run('{}'),/append-only/);
    assert.throws(()=>app.store.db.prepare('DELETE FROM n10_records').run(),/append-only/);
    const before=app.store.db.prepare('SELECT total_changes() AS n').get().n;
    for(let i=0;i<4;i++)view(app);
    assert.equal(app.store.db.prepare('SELECT total_changes() AS n').get().n,before);
    await app.close();app=make({dbPath:path});assert.equal(digest(ledger(app.store,crew)),initial);assert.equal(view(app).stages.known_seconds,3600);
  }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('A1 source/history corruption fails closed rather than becoming a completed healthy response',async()=>{
  const app=make();try{
    const b=request('stage',clone(data.stage));b.expected_revision=1;assert.throws(()=>append(app.store,actor,crew,b,now));
    app.store.db.prepare('INSERT INTO n10_records(crew_id,kind,record_id,revision,json) VALUES(?,?,?,?,?)').run(crew,'stage','broken',1,'{}');
    assert.throws(()=>view(app),e=>e.status===503);
  }finally{await app.close();}
});
test('A1 API positive and negative authorization controls, identity/schema injection and legacy consent boundary',async()=>{
  const app=make(),call=transport(app);try{
    const login=async role=>(await call('/v1/auth/demo',{body:{role}})).headers['Set-Cookie'].split(';')[0];
    for(const role of ['viewer','researcher','system_admin']){
      const cookie=await login(role);assert.equal((await call('/v1/n10/crew/'+crew,{cookie})).status,403);
    }
    const cookie=await login('astronaut');
    assert.equal((await call('/v1/n10/crew/CREW-01',{cookie})).status,403);
    const r=await call('/v1/n10/crew/'+crew+'/records',{cookie,body:request('stage',clone(data.stage))});assert.equal(r.status,201);
    assert.equal((await call('/v1/n10/crew/'+crew+'?sql=SELECT',{cookie})).status,422);
    assert.equal((await call('/v1/n10/crew/'+crew+'?before=bad',{cookie})).status,422);
    const bad=request('stage',clone(data.stage));bad.actor='demo_admin';
    assert.equal((await call('/v1/n10/crew/'+crew+'/records',{cookie,body:bad})).status,422);
    const who=(await call('/v1/auth/me',{cookie})).json();
    const c=request('consent',{state:'declined',task:false,mood:false,fatigue:false,share_review:false},{id:'consent:'+who.id});
    assert.equal((await call('/v1/n10/crew/'+crew+'/records',{cookie,body:c})).status,201);
    assert.equal((await call('/v1/checkins',{cookie,body:{crew_id:crew,fatigue:3,reaction_ms:[200,210,220]}})).status,403);
    assert.equal((await call('/v1/n10/crew/'+crew)).status,401);
  }finally{await app.close();}
});
test('A1 N10 writes never create or modify N02 alert/telemetry/baseline/comms state',async()=>{
  const app=make();try{
    const before=JSON.stringify({state:app.engine.state,risks:app.store.list('risk_events'),messages:app.store.list('comms_messages'),baseline:app.store.list('health_baselines')});
    for(const kind of ['stage','schedule','exercise_plan','exercise','movement'])put(app,kind);
    assert.equal(JSON.stringify({state:app.engine.state,risks:app.store.list('risk_events'),messages:app.store.list('comms_messages'),baseline:app.store.list('health_baselines')}),before);
  }finally{await app.close();}
});
test('R1/V1 projection performance evidence and reject-all/accept-all controls remain discriminative',async()=>{
  const app=make();try{
    put(app,'stage');put(app,'schedule');
    const times=[];for(let i=0;i<25;i++){const t=performance.now();assert.equal(view(app).stages.known_seconds,3600);times.push(performance.now()-t);}
    assert.throws(()=>{const rejectAll=()=>{throw Error('reject-all')};assert.doesNotThrow(()=>rejectAll());});
    assert.throws(()=>{const acceptAll=()=>true;assert.throws(()=>acceptAll(request('stage',{...data.stage,label:'invented'})));});
    if(process.env.ASTRA_N10_EVIDENCE){writeFileSync(join(process.env.ASTRA_N10_EVIDENCE,'projection-performance.json'),JSON.stringify({fixtures:FIXTURE_VERSION,samples_ms:times,maximum_ms:Math.max(...times),memory:process.memoryUsage(),scope:'Small synthetic projection only; not a production guarantee.'},null,2)+'\n');}
  }finally{await app.close();}
});
for(const [kind,mutate] of [
  ['schedule',d=>d.effective_from='2026-02-30'],['schedule',d=>d.reference_hours=0],
  ['schedule',d=>d.effective_to='2026-11-13'],['consent',d=>d.task='yes'],
  ['consent',d=>{d.state='withdrawn';d.mood=true;}],
  ['checkin',d=>d.trials=[99,210,220]],['checkin',d=>d.trials=[200,210,3001]],
  ['checkin',d=>d.trials=[200,210]],['checkin',d=>d.mood=0],
  ['checkin',d=>d.fatigue=11],['checkin',d=>d.device='../device'],
  ['exercise_plan',d=>d.target_minutes=-1],['exercise',d=>d.workload_unit='clinical-risk'],
  ['exercise',d=>d.coverage='healthy'],['movement',d=>d.steps=-1],
  ['movement',d=>d.steps=1.5],['movement',d=>d.coverage='live'],
])test('A1 validated '+kind+' boundary '+mutate.toString(),()=>{
  const value=clone(data[kind]);mutate(value);assert.throws(()=>validateRequest(request(kind,value),now));
});
test('A1 all six fictional crew stay separated, including missing data and malformed query cutoffs',async()=>{
  const app=make();try{
    for(let i=1;i<=6;i++){
      const c='CREW-0'+i;append(app.store,actor,c,request('stage',clone(data.stage)),now);
      const value=project(app.store,{id:'astro-'+i,role:'astronaut',crew_id:c},c,{date:DATE,before:SOURCE_AT,days:1},now);
      assert.equal(value.crew_id,c);assert.equal(value.records.length,1);assert.equal(value.stages.known_seconds,3600);
    }
    for(const opts of [{days:0},{days:32},{before:'bad'},{date:'2026-02-30'},{before:'2027-01-01T00:00:00.000Z'}])assert.throws(()=>view(app,opts));
    assert.throws(()=>put(app,'stage',data.stage,{id:'stage',revision:99}));
  }finally{await app.close();}
});
test('C2 new consent epoch, incomplete task and poor-quality task cannot fabricate a reference',async()=>{
  const app=make();try{
    put(app,'consent',data.consent,{id:'consent:'+actor.id});
    for(let i=0;i<4;i++){app.engine.tick(1);put(app,'checkin',{...data.checkin,trials:[200,210,220]},{source_at:new Date(app.engine.state.now).toISOString()});}
    assert.equal(view(app).cognition.reference.status,'UNKNOWN');
    app.engine.tick(1);put(app,'consent',data.consent,{id:'consent:'+actor.id,revision:1,source_at:new Date(app.engine.state.now).toISOString()});
    assert.equal(view(app).cognition.eligible_count,0);
    assert.throws(()=>put(app,'checkin'),e=>e.status===409);
    put(app,'checkin',{...data.checkin,consent_revision:2},{source_at:new Date(app.engine.state.now).toISOString(),source:{kind:'authored_synthetic',source_id:FIXTURE_VERSION,quality:'suspect'}});
    assert.equal(view(app).cognition.eligible_count,0);
  }finally{await app.close();}
});
test('S2/S3 corrections and cancelled schedules obey historical replay and canonical UNKNOWN quality',async()=>{
  const app=make();try{
    const r=put(app,'schedule').record,cut=SOURCE_AT;
    app.engine.tick(30);put(app,'schedule',{...r.data,start_at:'2026-11-14T00:00:00.000Z',reference_hours:7},{id:r.id,revision:1,source_at:new Date(app.engine.state.now).toISOString()});
    assert.equal(view(app,{before:cut}).sleep.history[0].schedule.planned_hours,8);
    assert.equal(view(app).sleep.history[0].schedule.planned_hours,7);
    const s=app.engine.state.crew[2].sleep_session;app.engine.tick(1);
    app.engine.correctSleep(crew,s.session_id,{expected_revision:s.revision,start_at:s.start_at,end_at:s.end_at,reason:'Synthetic missing source control',quality:{status:'missing',confidence:0,artifact:false}});
    assert.equal(view(app).sleep.history[0].actual.status,'UNKNOWN');assert.equal(view(app).sleep.cumulative_shortfall_hours,null);
  }finally{await app.close();}
});
test('E2 explicit missed source resolves a plan; partial/missing movement does not imply healthy movement',async()=>{
  const app=make();try{
    const p=put(app,'exercise_plan').record;
    put(app,'exercise',{...data.exercise,status:'missed',start_at:DATE+'T07:00:00.000Z',end_at:DATE+'T07:00:00.000Z',plan_id:p.id,plan_revision:1});
    assert.equal(view(app).exercise.adherence.percent,0);
    put(app,'movement',{...data.movement,coverage:'partial'});assert.equal(view(app).exercise.movement.steps,null);
    assert.equal(view(app).exercise.movement.status,'UNKNOWN');
  }finally{await app.close();}
});
test('A1 real cold-process recovery has no replay and unchanged N10 record hashes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-n10-final-cold-')),path=join(dir,'fixture.sqlite'),app=make({dbPath:path});
  try{
    put(app,'stage');const expected=digest(ledger(app.store,crew));await app.close();
    const script="import {Store} from './services/api/store.mjs';import {ledger,digest} from './services/n10/ledger.mjs';const s=new Store(process.argv[1]);try{console.log(JSON.stringify({head:digest(ledger(s,'CREW-03')),rows:ledger(s,'CREW-03').length,replays:0,audit:s.verifyAudit()}));}finally{s.close()}";
    const result=spawnSync(process.execPath,['--input-type=module','-e',script,path],{encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stderr);const proof=JSON.parse(result.stdout);assert.equal(proof.head,expected);assert.equal(proof.rows,1);assert.equal(proof.replays,0);assert.equal(proof.audit,true);
    if(process.env.ASTRA_N10_EVIDENCE)writeFileSync(join(process.env.ASTRA_N10_EVIDENCE,'cold-recovery.json'),JSON.stringify(proof,null,2)+'\n');
  }finally{if(!app.engine.closed)await app.close();rmSync(dir,{recursive:true,force:true});}
});
test('A1 failed serialization, forged SQL-column identity and cancelled source leave no false accepted result',async()=>{
  const app=make();try{
    const broken=request('stage',clone(data.stage));broken.data.self=broken;assert.throws(()=>append(app.store,actor,crew,broken,now));assert.equal(ledger(app.store,crew).length,0);
    const r=put(app,'stage').record;
    // New disposable malicious database row; no permission change to any real source.
    app.store.db.prepare('INSERT INTO n10_records(crew_id,kind,record_id,revision,json) VALUES(?,?,?,?,?)').run('CREW-02','stage','wrong',1,JSON.stringify(r));
    assert.throws(()=>ledger(app.store,'CREW-02'),e=>e.status===503);
    assert.equal(ledger(app.store,crew).length,1);
  }finally{await app.close();}
});
test('S2 explicit partial/missed declarations require source binding and are never inferred from absence',async()=>{
  const app=make();try{
    const session=app.engine.state.crew[2].sleep_session;
    const r=put(app,'sleep_status',{day:DATE,status:'partial',session_id:session.session_id}).record;
    assert.equal(view(app).sleep.history[0].actual.status,'PARTIAL');assert.equal(view(app).sleep.cumulative_shortfall_hours,null);
    put(app,'sleep_status',{day:DATE,status:'cancelled',session_id:null},{id:r.id,revision:1});
    assert.equal(view(app).sleep.history[0].actual.status,'KNOWN');
    const previous='2026-11-13';
    put(app,'schedule',{...data.schedule,start_at:'2026-11-12T23:00:00.000Z',end_at:previous+'T07:00:00.000Z',effective_from:previous,effective_to:previous});
    assert.equal(view(app,{date:previous}).sleep.history[0].actual.status,'UNKNOWN');
    put(app,'sleep_status',{day:previous,status:'missed',session_id:null});
    assert.equal(view(app,{date:previous}).sleep.history[0].actual.hours,0);
    assert.equal(view(app,{date:previous}).sleep.cumulative_shortfall_hours,8);
  }finally{await app.close();}
});
test('C2 source-kind separation excludes authored task fixtures from actual browser-task references',async()=>{
  const app=make();try{
    put(app,'consent',data.consent,{id:'consent:'+actor.id});
    for(let i=0;i<3;i++){app.engine.tick(1);put(app,'checkin',data.checkin,{source_at:new Date(app.engine.state.now).toISOString()});}
    app.engine.tick(1);put(app,'checkin',data.checkin,{source_at:new Date(app.engine.state.now).toISOString(),
      source:{kind:'browser_task',source_id:'reaction-five-v1',quality:'good'}});
    assert.equal(view(app).cognition.reference.status,'UNKNOWN');assert.equal(view(app).cognition.reference.prior_sessions,0);
  }finally{await app.close();}
});
test('E2 steps spanning a UTC day boundary are not silently apportioned to a different day',async()=>{
  const app=make();try{
    put(app,'movement',{...data.movement,start_at:'2026-11-13T23:30:00.000Z',end_at:'2026-11-14T00:30:00.000Z'});
    const m=view(app).exercise.movement;assert.equal(m.status,'UNKNOWN');assert.equal(m.steps,null);assert.equal(m.records.length,1);
  }finally{await app.close();}
});
