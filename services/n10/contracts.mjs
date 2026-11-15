import { AppError,CREW } from '../../packages/contracts.mjs';
export const VERSION='astra.n10.record.v1',POLICY='personal-reference-v1';
export const STAGES=Object.freeze(['Sleep stage W','Sleep stage 1','Sleep stage 2','Sleep stage 3','Sleep stage 4','Sleep stage R','Sleep stage ?','Movement time','Sleep stage M']);
export const KINDS=Object.freeze(['stage','schedule','sleep_status','consent','checkin','exercise_plan','exercise','movement']);
export const check=(ok,code='INVALID_N10',status=422)=>{if(!ok)throw new AppError(status,code,'N10 request/evidence could not be accepted: '+code);};
export const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
export const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
export const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(v);
export const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const day=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&utc(v+'T00:00:00.000Z');
export const dayAt=v=>new Date(v).toISOString().slice(0,10);
export const DAY=86400000;
export function authorize(identity,crew,write=false){
  check(identity&&CREW.some(c=>c.id===crew),'N10_UNAUTHORIZED',403);
  check(['astronaut','demo_admin','mission_control','flight_surgeon'].includes(identity.role),'N10_FORBIDDEN',403);
  check(identity.role!=='astronaut'||identity.crew_id===crew,'N10_SELF_ONLY',403);
  if(write)check(['astronaut','demo_admin'].includes(identity.role),'N10_READ_ONLY_ROLE',403);
}
const bool=v=>typeof v==='boolean';
const interval=(d,now,observed=true,allowZero=false)=>{
  check(utc(d.start_at)&&utc(d.end_at),'N10_TIME');
  const duration=Date.parse(d.end_at)-Date.parse(d.start_at);
  check(duration>=(allowZero?0:1)&&duration<=DAY,'N10_INTERVAL');
  if(observed)check(Date.parse(d.end_at)<=now,'N10_FUTURE_OBSERVATION');
};
export function validateRequest(b,now){
  check(exact(b,['schema_version','kind','id','expected_revision','request_id','source_at','source','data']),'N10_SCHEMA');
  check(b.schema_version==='astra.n10.request.v1'&&KINDS.includes(b.kind)&&id(b.id)&&id(b.request_id),'N10_SCHEMA');
  check(Number.isSafeInteger(b.expected_revision)&&b.expected_revision>=0&&b.expected_revision<10000,'N10_REVISION');
  check(utc(b.source_at)&&Date.parse(b.source_at)<=now,'N10_SOURCE_TIME');
  check(exact(b.source,['kind','source_id','quality'])&&['authored_synthetic','browser_task'].includes(b.source.kind)&&id(b.source.source_id)
    &&['good','suspect','missing'].includes(b.source.quality),'N10_SOURCE');
  check(b.source.kind!=='browser_task'||['consent','checkin'].includes(b.kind),'N10_SOURCE');
  const d=b.data;
  switch(b.kind){
    case 'stage':
      check(exact(d,['start_at','end_at','label','status'])&&STAGES.includes(d.label)&&['observed','cancelled'].includes(d.status),'N10_STAGE');
      interval(d,now);break;
    case 'schedule':
      check(exact(d,['start_at','end_at','effective_from','effective_to','reference_hours','status'])
        &&day(d.effective_from)&&day(d.effective_to)&&d.effective_from<=d.effective_to
        &&Date.parse(d.effective_to)-Date.parse(d.effective_from)<31*DAY&&['active','cancelled'].includes(d.status),'N10_SCHEDULE');
      interval(d,now,false);
      check(dayAt(d.end_at)===d.effective_from&&num(d.reference_hours,.01,24)
        &&Math.abs((Date.parse(d.end_at)-Date.parse(d.start_at))/3600000-d.reference_hours)<1e-8,'N10_REFERENCE');
      break;
    case 'sleep_status':
      check(exact(d,['day','status','session_id'])&&day(d.day)&&d.day<=dayAt(b.source_at)
        &&['missed','partial','completed','unknown','cancelled'].includes(d.status)
        &&(d.session_id===null||id(d.session_id)),'N10_SLEEP_STATUS');
      check(!['partial','completed'].includes(d.status)||d.session_id!==null,'N10_SESSION_BINDING');
      check(d.status!=='missed'||d.session_id===null,'N10_SESSION_BINDING');break;
    case 'consent':
      check(exact(d,['state','task','mood','fatigue','share_review'])&&['granted','declined','withdrawn'].includes(d.state)
        &&['task','mood','fatigue','share_review'].every(k=>bool(d[k])),'N10_CONSENT');
      check(d.state==='granted'||['task','mood','fatigue','share_review'].every(k=>d[k]===false),'N10_CONSENT');break;
    case 'checkin':
      check(exact(d,['status','mood','fatigue','trials','task_id','device','consent_revision'])
        &&['recorded','skipped','cancelled','excluded'].includes(d.status)&&d.task_id==='reaction-five-v1'&&id(d.device)
        &&Number.isSafeInteger(d.consent_revision)&&d.consent_revision>=0,'N10_CHECKIN');
      check((d.mood===null||Number.isInteger(d.mood)&&num(d.mood,1,5))&&(d.fatigue===null||num(d.fatigue,0,10))
        &&Array.isArray(d.trials)&&(d.trials.length===0||d.trials.length>=3&&d.trials.length<=10)&&d.trials.every(v=>num(v,100,3000)),'N10_TRIALS');
      if(d.status!=='recorded')check(d.mood===null&&d.fatigue===null&&d.trials.length===0,'N10_EMPTY_SKIP');
      else check(d.mood!==null||d.fatigue!==null||d.trials.length>0,'N10_EMPTY_CHECKIN');
      break;
    case 'exercise_plan':
      check(exact(d,['start_at','end_at','category','target_minutes','workload','workload_unit','status'])&&id(d.category)
        &&num(d.target_minutes,1,1440)&&['planned','cancelled'].includes(d.status),'N10_PLAN');
      interval(d,now,false);break;
    case 'exercise':
      check(exact(d,['start_at','end_at','category','plan_id','plan_revision','status','coverage','workload','workload_unit'])
        &&id(d.category)&&(d.plan_id===null||id(d.plan_id))&&Number.isSafeInteger(d.plan_revision)&&d.plan_revision>=0
        &&['performed','partial','missed','cancelled'].includes(d.status)&&['complete','partial','unknown'].includes(d.coverage),'N10_EXERCISE');
      interval(d,now,true,['missed','cancelled'].includes(d.status));break;
    case 'movement':
      check(exact(d,['start_at','end_at','steps','coverage','status'])&&(d.steps===null||Number.isSafeInteger(d.steps)&&num(d.steps,0,1000000))
        &&['complete','partial','unknown'].includes(d.coverage)&&['observed','cancelled'].includes(d.status),'N10_MOVEMENT');
      interval(d,now);break;
  }
  if(['exercise','exercise_plan'].includes(b.kind)){
    check((d.workload===null&&d.workload_unit===null)||(num(d.workload,0,1000000)&&['W','kg','arbitrary_unit'].includes(d.workload_unit)),'N10_WORKLOAD');
  }
  if(['stage','exercise','movement'].includes(b.kind))check(Date.parse(d.end_at)<=Date.parse(b.source_at),'N10_SOURCE_BEFORE_EVENT');
  check(Buffer.byteLength(JSON.stringify(b))<=16384,'N10_RECORD_LIMIT');
  return structuredClone(b);
}
