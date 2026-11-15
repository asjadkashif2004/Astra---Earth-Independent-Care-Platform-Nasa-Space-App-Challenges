import { randomUUID } from 'node:crypto';
import { CREW,METRICS,validateTelemetry } from '../../packages/contracts.mjs';
import { N09,GEN,DEFINITION_HASH,LIMITS,DAY,check,id,utc,exact,iso,digest,authorize,validateRun,baselineArchive,generatedCrew,dailyPlan } from './n09-model.mjs';
import { retainObservation,refreshReading } from '../api/telemetry.mjs';
import { sleepRecord } from './sleep.mjs';
import { evaluateEnvironment } from '../anomaly/environment.mjs';
import { append as appendN10 } from '../n10/ledger.mjs';
import { project as projectN10 } from '../n10/projection.mjs';
import { list as waveSources,windowData } from '../waveforms/service.mjs';

function save(e,r){const {hash,...body}=r;r.hash=digest(body);check(e.store.db.prepare('UPDATE n09_runs SET json=? WHERE id=?').run(JSON.stringify(r),r.id).changes===1,'N09_MISSING_CHECKPOINT',503);}
export function noteSleepCorrection(e,record){
  if(!e.state.n09?.managed)return;
  const r=load(e,e.state.n09.id),day=r.completed_days[record.crew_id]?.find(d=>d.session_id===record.session_id);
  if(!day)return;
  Object.assign(day,{end_at:record.end_at,observed_hours:record.duration_hours,quality:record.quality.status,revision:record.revision,record_hash:digest(record),known_at:record.known_at});
  event(e,r,'SLEEP_SOURCE_CORRECTED',{crew_id:record.crew_id,session_id:record.session_id,revision:record.revision,source_end_at:record.end_at,record_hash:day.record_hash,original_frames_unchanged:true});
  r.revision++;save(e,r);
}
export function recordFailure(e,error){
  try{space(e,1024);const r=load(e,e.state.n09.id),body={schema_version:'astra.n09.failure.v1',run_id:r.id,at:iso(e.state.now),host_at:new Date().toISOString(),code:'N09_EXECUTION_FAILED',last_committed_frame:r.frame_count,no_false_completion:true};e.store.db.prepare('INSERT INTO n09_failures(run_id,json,hash) VALUES(?,?,?)').run(r.id,JSON.stringify(body),digest(body));error.n09_diagnostic_persistence='ACKNOWLEDGED';}
  catch{error.n09_diagnostic_persistence='FAILED';} // Original error still throws; monitoring remains failed, never a PASS.
}
export function load(e,runId){
  check(id(runId),'N09_RUN_ID');const row=e.store.db.prepare('SELECT json FROM n09_runs WHERE id=?').get(runId);check(row,'N09_NOT_FOUND',404);
  let r;try{r=JSON.parse(row.json);}catch{check(false,'N09_CORRUPT',503);}const {hash,...body}=r;
  check(r.id===runId&&r.schema_version===N09&&r.definition_version===GEN&&r.definition_hash===DEFINITION_HASH&&hash===digest(body),'N09_INTEGRITY',503);validateRun(r.config);
  const archive=e.store.db.prepare('SELECT json FROM n09_calibrations WHERE hash=?').get(r.calibration_hash);check(archive,'N09_CALIBRATION_MISSING',503);
  let a;try{a=JSON.parse(archive.json);}catch{check(false,'N09_CALIBRATION_CORRUPT',503);}const {hash:ah,...ab}=a;
  check(ah===r.calibration_hash&&ah===digest(ab)&&a.timebase.count===720&&a.timebase.period_seconds===3600,'N09_CALIBRATION_INTEGRITY',503);return r;
}
function space(e,extra=0){const n=e.store.db.prepare('SELECT COALESCE(SUM(length(json)),0) n FROM n09_events').get().n+e.store.db.prepare('SELECT COALESCE(SUM(length(json)),0) n FROM n09_runs').get().n+e.store.db.prepare('SELECT COALESCE(SUM(length(json)),0) n FROM n09_calibrations').get().n+e.store.db.prepare('SELECT COALESCE(SUM(length(json)),0) n FROM n09_failures').get().n;check(n+extra<LIMITS.payload,'N09_CAPACITY',409);}
function event(e,r,kind,payload={},request=null){
  check(r.event_count<2048,'N09_EVENT_LIMIT',409);const previous=e.store.db.prepare('SELECT hash FROM n09_events WHERE run_id=? ORDER BY seq DESC LIMIT 1').get(r.id)?.hash??'GENESIS';
  const body={schema_version:'astra.n09.event.v1',run_id:r.id,seq:++r.event_count,kind,at:iso(e.state.now),known_at:iso(e.state.now),host_at:new Date().toISOString(),payload,previous_hash:previous,...(request?{request_id:request.id,request_hash:request.hash}: {})};
  const record={...body,hash:digest(body)},json=JSON.stringify(record);space(e,Buffer.byteLength(json));e.store.db.prepare('INSERT INTO n09_events(run_id,seq,request_id,json,hash) VALUES(?,?,?,?,?)').run(r.id,record.seq,request?.id??null,json,record.hash);return record;
}
export function events(e,runId){
  const r=load(e,runId),rows=e.store.db.prepare('SELECT * FROM n09_events WHERE run_id=? ORDER BY seq').all(runId);check(rows.length===r.event_count,'N09_INCOMPLETE',503);let previous='GENESIS';
  return rows.map((row,i)=>{let v;try{v=JSON.parse(row.json);}catch{check(false,'N09_EVENT_CORRUPT',503);}const {hash,...body}=v;
    check(hash===row.hash&&hash===digest(body)&&v.previous_hash===previous&&v.seq===i+1&&v.run_id===runId&&utc(v.at)&&utc(v.known_at)&&v.at<=v.known_at,'N09_EVENT_INTEGRITY',503);previous=hash;return v;});
}
function sourceProblem(e,crew){const c=e.state.crew.find(c=>c.id===crew);return Object.entries(c.metric_observations).some(([name,o])=>o.integrity!=='verified'||o.source.kind!=='simulator'||o.source.device_id!==(name==='sleep_duration'?'SIM-SLEEP-':'SIM-')+crew);}
function n10(e,r,crew,kind,data,recordId){
  const key=crew+':'+recordId;if(r.context_written[key])return;
  appendN10(e.store,{id:r.actor,role:'demo_admin'},crew,{schema_version:'astra.n10.request.v1',kind,id:recordId,expected_revision:0,request_id:recordId,source_at:iso(e.state.now),source:{kind:'authored_synthetic',source_id:'SYN-N09-'+r.id,quality:'good'},data},e.state.now);r.context_written[key]=true;
}
function contextRecords(e,r,c,generated){
  const plan=generated.plan,date=plan.end_at.slice(0,10),prefix='n09-'+r.id.slice(0,8)+'-'+c.id+'-';
  // Only completed, explicitly generated source records produce an authored comparison plan.
  if(generated.sleepRecords.length)n10(e,r,c.id,'schedule',{start_at:plan.start_at,end_at:plan.end_at,effective_from:date,effective_to:date,reference_hours:plan.reference_hours,status:'active'},prefix+date+'-sleep');
  if(e.state.now>=plan.exercise_end&&plan.exercise_end>r.start_at){
    const day=iso(plan.exercise_end).slice(0,10),planId=prefix+day+'-exercise-plan';
    n10(e,r,c.id,'exercise_plan',{start_at:iso(plan.exercise_start),end_at:iso(plan.exercise_end),category:'authored_countermeasure',target_minutes:60,workload:100,workload_unit:'arbitrary_unit',status:'planned'},planId);
    const gap=r.assignments.find(a=>a.crew_id===c.id).gaps?.some(g=>g.from<plan.exercise_end&&g.to>plan.exercise_start);
    if(!gap&&plan.exercise_start>=r.start_at)n10(e,r,c.id,'exercise',{start_at:iso(plan.exercise_start),end_at:iso(plan.exercise_end),category:'authored_countermeasure',plan_id:planId,plan_revision:1,status:'performed',coverage:'complete',workload:100,workload_unit:'arbitrary_unit'},prefix+day+'-exercise');
  }
}
function emit(e,r){
  check(r.frame_count<LIMITS.frames,'N09_FRAME_LIMIT',409);const at=e.state.now,observations=[],labels=[],context={};
  const exposed=r.assignments.some(a=>a.status==='RUNNING'&&a.scenario_id==='radiation-spike'&&a.elapsed_seconds-a.onset_seconds>=30),dose=exposed?.084:.016;
  const actualCrew=e.state.crew.map(prior=>{
    const a=r.assignments.find(v=>v.crew_id===prior.id),c=structuredClone(prior);
    if(a.status==='RUNNING'&&sourceProblem(e,c.id)){a.status='BLOCKED';a.reason='Imported/unverified ownership retained; no new simulator observations.';event(e,r,'CREW_BLOCKED',{crew_id:c.id,reason:a.reason});}
    if(a.status!=='RUNNING'){context[c.id]={status:'UNKNOWN',reason:a.status};labels.push({crew_id:c.id,class:'unobserved',authored:true});return refreshReading(c,at);}
    const g=generatedCrew(r,a,e.baselines[c.id],at,c.sleep_session);c.activity=g.activity;context[c.id]=g.context;
    labels.push({crew_id:c.id,...g.truth});
    for(const raw of g.events){const old=c.metric_observations[raw.metric.name];if(old?.source.kind==='synthetic-import')continue;if(raw.metric.name==='radiation'&&raw.quality.status!=='missing')raw.metric.value=dose;
      if(raw.sleep_session&&(Date.parse(raw.sleep_session.start_at)<r.start_at||a.gaps?.some(g=>g.from<Date.parse(raw.sleep_session.end_at)&&g.to>Date.parse(raw.sleep_session.start_at)))){raw.metric.value=null;raw.quality={status:'missing',confidence:0,artifact:false};}
      validateTelemetry(raw,at);const o=retainObservation(raw,{mission_received_at:iso(at),host_received_at:new Date().toISOString(),principal:'n09-simulator'});observations.push(o);c.metric_observations[raw.metric.name]=o;
      if(raw.sleep_session){c.sleep_session=sleepRecord(o);e.persistSleep(c.sleep_session);r.completed_days[c.id].push({session_id:raw.sleep_session.session_id,end_at:raw.sleep_session.end_at,reference_hours:g.plan.reference_hours,observed_hours:raw.metric.value,quality:raw.quality.status});}
    }
    const days=r.completed_days[c.id],covered=days.length>0&&days.every(d=>d.quality==='good');
    Object.assign(context[c.id],{completed_days:days.length,shortfall_hours:covered?days.reduce((sum,d)=>sum+Math.max(0,d.reference_hours-d.observed_hours),0):null,status:covered?'KNOWN':'UNKNOWN'});
    contextRecords(e,r,c,g);return refreshReading(c,at);
  });
  e.store.ingest(observations);e.state.crew=e.detect(actualCrew);
  const environment={co2_ppm:exposed?2800:720,temperature_c:22.1,humidity_percent:44,oxygen_percent:20.9,dose_rate_msv_h:dose,cumulative_msv:(e.state.environment?.cumulative_msv??36.1)+dose*(r.frame_count?r.config.cadence_seconds:0)/3600,synthetic:true,cumulative_method:'authored right-end sample rectangles; paused intervals not reconstructed'};
  e.state.environment={...environment,...evaluateEnvironment(environment)};
  if(r.assignments.some(a=>a.status==='RUNNING'&&a.scenario_id==='communication-blackout'&&a.elapsed_seconds>=a.onset_seconds)&&!r.blackout_applied){e.comms.control({blackout:true},at);r.blackout_applied=true;}
  const samples=e.state.crew.map(c=>({id:c.id,values:c.values,metric_observations:c.metric_observations,metric_quality:c.metric_quality,observed_at:c.observed_at,quality:c.quality,confidence:c.confidence,activity:c.activity,status:c.status,status_text:c.status_text,risk_id:c.risk_id??null}));
  r.frame_count++;event(e,r,'OBSERVATION',{frame:r.frame_count,elapsed_seconds:r.elapsed_seconds,crew:samples,environment:e.state.environment,context});
  // Truth is a separate event, not a field offered to the detector.
  event(e,r,'AUTHORED_LABELS',{frame:r.frame_count,labels,diagnosis:null,independent_review:false});
  e.store.snapshot(e.state.crew,iso(at));e.queueSnapshot();e.processComms();
}
function finish(e,r,status){r.status=status;r.ended_at=iso(e.state.now);for(const a of r.assignments)if(['RUNNING','PAUSED'].includes(a.status))a.status=status;e.state.n09.managed=false;e.state.scenario='nominal';event(e,r,status,{preserve_history_alerts_queues:true});}
export function start(e,scenario,body,who){
  authorize(who,null,true);const config=validateRun(body);check(config.assignments.some(a=>a.scenario_id===scenario),'N09_ROUTE_SCENARIO');
  const prior=e.store.db.prepare('SELECT id,json FROM n09_runs WHERE actor=? AND request_id=?').get(who.id,config.request_id);
  if(prior){const r=load(e,prior.id);check(r.config_hash===digest(config),'N09_IDEMPOTENCY_CONFLICT',409);return {run:summary(e,r,who),idempotent:true};}
  for(const a of config.assignments)check(!sourceProblem(e,a.crew_id),'N09_SOURCE_OWNERSHIP',409);
  if(config.waveform){const w=waveSources(e.store,who,config.waveform.crew_id,iso(e.state.now),e.state.now).recordings.find(s=>s.recording_id===config.waveform.recording_id);check(w&&w.revision===config.waveform.revision&&w.original_sha256===config.waveform.source_sha256&&w.meta.channels.some(c=>c.name===config.waveform.channel),'N09_WAVEFORM_BINDING',409);}
  return atomic(e,()=>{
    check(e.store.db.prepare('SELECT count(*) n FROM n09_runs').get().n<LIMITS.runs,'N09_RUN_CAPACITY',409);space(e,3000000);
    if(e.state.n09?.managed){const old=load(e,e.state.n09.id);finish(e,old,'CANCELLED');save(e,old);}
    if(e.state.scenario==='controlled-hr-rise'&&['active','blocked'].includes(e.state.demo?.status)){e.state.demo.status='stopped';e.state.demo.stopped_at=iso(e.state.now);e.saveDemo();}
    const archive=baselineArchive(e.baselines,e.state.now);e.store.db.prepare('INSERT OR IGNORE INTO n09_calibrations(hash,json) VALUES(?,?)').run(archive.hash,JSON.stringify(archive));
    const runId=randomUUID(),r={schema_version:N09,id:runId,actor:who.id,request_id:config.request_id,config,config_hash:digest(config),definition_version:GEN,definition_hash:DEFINITION_HASH,calibration_hash:archive.hash,start_at:e.state.now,known_at:iso(e.state.now),host_started_at:new Date().toISOString(),status:'RUNNING',revision:1,event_count:0,frame_count:0,elapsed_seconds:0,next_at:e.state.now+config.cadence_seconds*1000,completed_days:Object.fromEntries(CREW.map(c=>[c.id,[]])),context_written:{},assignments:CREW.map(c=>({...config.assignments.find(a=>a.crew_id===c.id)??{crew_id:c.id,scenario_id:'nominal',onset_seconds:0},elapsed_seconds:0,status:'RUNNING'}))};
    e.state.runId=runId;e.state.seed=config.seed;e.state.startedAt=e.state.now;e.state.scenario=scenario;e.state.pending={};e.state.n09={id:runId,managed:true};e.n09Restored=false;
    e.store.db.prepare('INSERT INTO n09_runs(id,actor,request_id,json) VALUES(?,?,?,?)').run(runId,who.id,config.request_id,'{}');
    event(e,r,'STARTED',{configuration_hash:r.config_hash,calibration_hash:r.calibration_hash,definition_version:GEN});emit(e,r);save(e,r);e.store.put('scenario_runs',r.id,{id:r.id,scenario,seed:config.seed,started_at:iso(r.start_at),synthetic:true,n09:true,configuration_hash:r.config_hash});e.store.audit(who.id,'n09.started',r.id,{config_hash:r.config_hash});e.checkpoint();return {run:summary(e,r,who),idempotent:false};
  });
}
export function advance(e,seconds){
  check(Number.isSafeInteger(seconds)&&seconds>=0&&seconds<=LIMITS.advance,'N09_ADVANCE_BOUNDS');let r=load(e,e.state.n09.id);const target=e.state.now+seconds*1000;
  check(Math.max(0,Math.floor((target-r.next_at)/(r.config.cadence_seconds*1000))+1)<=LIMITS.batch,'N09_BATCH_LIMIT');
  while(e.state.n09.managed&&r.next_at<=target){
    e.state.now=r.next_at;e.state.tick++;r.next_at+=r.config.cadence_seconds*1000;
    if(r.status==='RUNNING'){r.elapsed_seconds+=r.config.cadence_seconds;for(const a of r.assignments)if(a.status==='RUNNING')a.elapsed_seconds+=r.config.cadence_seconds;emit(e,r);if(r.elapsed_seconds>=r.config.duration_seconds)finish(e,r,'COMPLETED');}
    else{e.state.crew=e.detect(e.state.crew.map(c=>refreshReading(c,e.state.now)));e.processComms();}
  }
  e.state.now=target;e.state.crew=e.detect(e.state.crew.map(c=>refreshReading(c,target)));e.processComms();r.revision++;save(e,r);e.checkpoint();return e.snapshot();
}
export function beforeLegacy(e){if(e.state.n09?.managed){const r=load(e,e.state.n09.id);finish(e,r,'CANCELLED');save(e,r);}}
function atomic(e,fn){const state=structuredClone(e.state),tx=e.comms.nextTxAt,config=structuredClone(e.comms.config),restored=e.n09Restored;try{return e.store.transaction(fn);}catch(err){e.state=state;e.comms.nextTxAt=tx;e.comms.config=config;e.n09Restored=restored;if(err.n09_tick_failure&&!e.store.inTransaction&&err.n09_diagnostic_persistence!=='ACKNOWLEDGED')recordFailure(e,err);throw err;}}
export function control(e,scenario,action,b,who){
  authorize(who,null,true);check(exact(b,['schema_version','run_id','request_id','expected_revision','crew_id','seconds','reason']),'N09_CONTROL_SCHEMA');check(b.schema_version==='astra.n09.control.v1'&&id(b.run_id)&&id(b.request_id)&&Number.isSafeInteger(b.expected_revision)&&b.expected_revision>=1,'N09_CONTROL_ID');
  check(b.crew_id===null||CREW.some(c=>c.id===b.crew_id),'N09_CONTROL_CREW');check(['pause','resume','stop','reset','step','exclude'].includes(action),'N09_ACTION');
  check(action==='step'?Number.isSafeInteger(b.seconds)&&b.seconds>0&&b.seconds<=LIMITS.advance:b.seconds===null,'N09_SECONDS');check(action==='exclude'?typeof b.reason==='string'&&b.reason.length>0&&b.reason.length<=256:b.reason===null,'N09_REASON');
  let r=load(e,b.run_id);check(r.config.assignments.some(a=>a.scenario_id===scenario),'N09_ROUTE_SCENARIO');
  const requestHash=digest({action,...b}),duplicate=e.store.db.prepare('SELECT json FROM n09_events WHERE run_id=? AND request_id=?').get(r.id,b.request_id);
  if(duplicate){const ev=JSON.parse(duplicate.json);check(ev.request_hash===requestHash,'N09_IDEMPOTENCY_CONFLICT',409);events(e,r.id);return {run:summary(e,r,who),idempotent:true};}
  check(r.revision===b.expected_revision,'N09_REVISION_CONFLICT',409);if(action!=='reset')check(e.state.n09?.id===r.id&&e.state.n09.managed,'N09_NOT_ACTIVE',409);
  return atomic(e,()=>{
    if(action==='step'){check(b.crew_id===null,'N09_STEP_SHARED_CLOCK');check(Math.max(0,Math.floor((e.state.now+b.seconds*1000-r.next_at)/(r.config.cadence_seconds*1000))+1)<=LIMITS.batch,'N09_BATCH_LIMIT');e.tick(b.seconds);r=load(e,r.id);}
    else if(action==='reset'){const config={...r.config,request_id:b.request_id};if(e.state.n09?.managed&&e.state.n09.id===r.id){finish(e,r,'CANCELLED');save(e,r);}return start(e,scenario,config,who);}
    else if(action==='exclude'){event(e,r,'ANNOTATION',{crew_id:b.crew_id,reason:b.reason,excluded:true,original_data_unchanged:true});}
    else if(b.crew_id){const a=r.assignments.find(a=>a.crew_id===b.crew_id),expect=action==='resume'?'PAUSED':'RUNNING';check(action==='stop'?['RUNNING','PAUSED','BLOCKED'].includes(a.status):a.status===expect,'N09_TRANSITION',409);if(action==='pause')a.paused_at=e.state.now;if(action==='resume'){(a.gaps??=[]).push({from:a.paused_at,to:e.state.now});delete a.paused_at;}a.status=action==='pause'?'PAUSED':action==='resume'?'RUNNING':'CANCELLED';event(e,r,'CREW_'+a.status,{crew_id:a.crew_id});}
    else if(action==='stop')finish(e,r,'CANCELLED');
    else{check(r.status===(action==='pause'?'RUNNING':'PAUSED'),'N09_TRANSITION',409);if(action==='pause')r.paused_at=e.state.now;else{for(const a of r.assignments)(a.gaps??=[]).push({from:r.paused_at,to:e.state.now});delete r.paused_at;}r.status=action==='pause'?'PAUSED':'RUNNING';event(e,r,r.status);}
    r.revision++;event(e,r,'COMMAND',{action,crew_id:b.crew_id,revision:r.revision},{id:b.request_id,hash:requestHash});save(e,r);e.store.audit(who.id,'n09.'+action,r.id,{revision:r.revision});e.checkpoint();return {run:summary(e,r,who),idempotent:false};
  });
}
export function summary(e,r,who){
  authorize(who);const scope=c=>who.role!=='astronaut'||c.crew_id===who.crew_id,assignments=r.assignments.filter(scope),current=e.state.n09?.managed&&e.state.n09.id===r.id,last=events(e,r.id).filter(v=>v.kind==='OBSERVATION').at(-1),data=current?e.state.crew:last?.payload.crew??[],crew=data.filter(c=>assignments.some(a=>a.crew_id===c.id)).map(c=>({id:c.id,values:c.values,quality:c.quality,status:c.status,observed_at:c.observed_at,metric_quality:c.metric_quality}));
  const fail=e.store.db.prepare('SELECT json,hash FROM n09_failures WHERE run_id=? ORDER BY seq DESC LIMIT 1').get(r.id);let failure=null;
  if(fail){try{failure=JSON.parse(fail.json);}catch{check(false,'N09_FAILURE_CORRUPT',503);}check(digest(failure)===fail.hash&&failure.run_id===r.id,'N09_FAILURE_INTEGRITY',503);}
  const execution_status=current&&e.monitor.failed||failure&&failure.last_committed_frame>=r.frame_count?'FAILED':r.status;
  return {schema_version:N09,id:r.id,status:r.status,execution_status,last_failure:failure,revision:r.revision,seed:r.config.seed,definition_version:r.definition_version,started_at:iso(r.start_at),known_at:r.known_at,host_started_at:r.host_started_at,source_now:last?.at??null,mission_now:iso(e.state.now),data_source:current?'CURRENT_N09_OBSERVATIONS':'RECORDED_N09_OBSERVATIONS',elapsed_seconds:r.elapsed_seconds,duration_seconds:r.config.duration_seconds,cadence_seconds:r.config.cadence_seconds,frames:r.frame_count,assignments,crew,calibration_hash:r.calibration_hash,config_hash:r.config_hash,synthetic:true,clinical_validation:false,completed_days:Object.fromEntries(assignments.map(a=>[a.crew_id,r.completed_days[a.crew_id]])),waveform:r.config.waveform&&scope(r.config.waveform)?r.config.waveform:null,alert_authority:'N02 only; no diagnosis or automatic acknowledgement',recovered_after_restart:!!e.n09Restored};
}
export function status(e,who,runId=null){authorize(who);const rows=e.store.db.prepare('SELECT id FROM n09_runs ORDER BY rowid DESC LIMIT 16').all();if(!rows.length)return {schema_version:'astra.n09.status.v1',status:'UNKNOWN',runs:[],current:null};return {schema_version:'astra.n09.status.v1',status:'AVAILABLE',runs:rows.map(row=>summary(e,load(e,row.id),who)),current:summary(e,load(e,runId??rows[0].id),who)};}
export function replay(e,who,runId,{before=iso(e.state.now),at=before,crew_id=null}={}){
  authorize(who,crew_id);check(utc(before)&&utc(at)&&at<=before&&Date.parse(before)<=e.state.now,'N09_REPLAY_TIME');const r=load(e,runId),all=events(e,runId),frames=all.filter(v=>v.kind==='OBSERVATION'&&v.at<=at&&v.known_at<=before);
  const scoped=c=>(!crew_id||c.id===crew_id)&&(who.role!=='astronaut'||c.id===who.crew_id),selected=frames.at(-1),copy=selected?structuredClone(selected.payload):null;
  if(copy){copy.crew=copy.crew.filter(scoped);copy.context=Object.fromEntries(copy.crew.map(c=>[c.id,copy.context[c.id]]));}
  return {schema_version:'astra.n09.replay.v1',status:selected?'AVAILABLE':'UNKNOWN',run_id:runId,at,before,frame:selected?{...copy,source_at:selected.at,known_at:selected.known_at,hash:selected.hash}:null,timeline:all.filter(v=>v.at<=at&&v.known_at<=before).map(v=>({kind:v.kind,at:v.at,seq:v.seq,hash:v.hash,...(v.payload.crew_id?{crew_id:v.payload.crew_id}:{})})).filter(v=>!v.crew_id||(!crew_id||v.crew_id===crew_id)&&(who.role!=='astronaut'||v.crew_id===who.crew_id)),import_replays:0,read_mutations:0,source_version:r.definition_version};
}
export function calibration(e,who,runId,crew){check(CREW.some(c=>c.id===crew),'N09_CALIBRATION_CREW');authorize(who,crew);const r=load(e,runId),a=JSON.parse(e.store.db.prepare('SELECT json FROM n09_calibrations WHERE hash=?').get(r.calibration_hash).json);return {schema_version:a.schema_version,hash:a.hash,source:a.source,seed:a.seed,timebase:a.timebase,known_at:a.known_at,crew_id:crew,metrics:a.crew[crew],clinical_validation:false};}
export function labels(e,who,runId){authorize(who);check(['demo_admin','researcher'].includes(who.role),'N09_LABEL_ROLE',403);return {schema_version:'astra.n09.labels.v1',status:'AUTHORED_NOT_INDEPENDENTLY_REVIEWED',labels:events(e,runId).filter(v=>['AUTHORED_LABELS','ANNOTATION'].includes(v.kind)),inference_use:false};}
export function waveform(e,who,runId,position){const r=load(e,runId),w=r.config.waveform;check(w,'N09_NO_WAVEFORM',404);authorize(who,w.crew_id);check(Number.isSafeInteger(position)&&position>=0&&position<=r.elapsed_seconds*1000,'N09_WAVEFORM_TIME');const source=waveSources(e.store,who,w.crew_id,iso(e.state.now),e.state.now).recordings.find(x=>x.recording_id===w.recording_id);check(source&&source.original_sha256===w.source_sha256&&source.revision===w.revision,'N09_WAVEFORM_CHANGED',409);const end=source.meta.sample_count*1000/source.meta.sample_rate_hz;return {scenario_elapsed_ms:position,source_origin_at:source.meta.start_at,archive_complete:position>=end,scalar_injection:false,twin:'INACTIVE_N06_GATE',window:windowData(e.store,who,w.crew_id,w.recording_id,{before:iso(e.state.now),channel:w.channel,until_ms:Math.min(position,end),points:200},e.state.now)};}
export function n10Context(e,who,crew,before){authorize(who,crew);check(utc(before)&&Date.parse(before)<=e.state.now,'N09_CONTEXT_TIME');return projectN10(e.store,who,crew,{date:before.slice(0,10),before,days:7},e.state.now);}
