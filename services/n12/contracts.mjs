import { CREW,METRICS,AppError } from '../../packages/contracts.mjs';
import { digest,utc,id,exact } from '../telemetry-simulator/n09-model.mjs';
export { digest,utc,id,exact };
export const SCHEMA='astra.n12.v1',KEYS=Object.freeze(['heart_rate','hrv']);
export const POLICY=Object.freeze({version:'n12-synthetic-v1',metrics:KEYS,horizons:[5,15,30,60],methods:['persistence','linear','robust'],window_minutes:30,cadence_seconds:60,points:31,max_age_seconds:90,min_confidence:.7,domain_sd:2,coverage_target:.9,min_calibration:8,issues:[30,60,90,120],clinical:false});
export const POLICY_HASH=digest(POLICY),LIMIT=Object.freeze({frames:6000,jobs:8,evaluation:8*1024*1024,payload:32*1024*1024,context:128*1024,timeout:15000});
export const ensure=(v,code='N12_INVALID',status=422)=>{if(!v)throw new AppError(status,code,'N12 synthetic research: '+code);};
export const iso=n=>new Date(n).toISOString();
export const sealed=v=>({...v,hash:digest(v)});
export function verify(v,code='N12_HASH'){ensure(v&&typeof v==='object',code,503);const {hash,...b}=v;ensure(hash===digest(b),code,503);return v;}
export function authorize(who,crew){ensure(who&&id(who.id)&&['demo_admin','researcher'].includes(who.role),'N12_ROLE',403);if(crew)ensure(CREW.some(c=>c.id===crew),'N12_CREW',403);}
export function request(b,who,now){
 authorize(who);ensure(exact(b,['schema_version','request_id','crew_id','metric','horizon_minutes','method','before','case_id','issue_minute','source_revision','seed','supersedes','waveform','source_run_id','policy_hash']),'N12_SCHEMA');authorize(who,b.crew_id);
 ensure(b.schema_version===SCHEMA&&id(b.request_id)&&KEYS.includes(b.metric)&&POLICY.methods.includes(b.method)&&POLICY.horizons.includes(b.horizon_minutes),'N12_TARGET_METHOD');
 ensure(utc(b.before)&&Date.parse(b.before)<=now&&Date.parse(b.before)>=Date.UTC(2001,0,1)&&b.policy_hash===POLICY_HASH,'N12_TIME_POLICY');
 ensure(['nominal','drift','missing','analytical-linear'].includes(b.case_id)&&Number.isSafeInteger(b.issue_minute)&&b.issue_minute>=30&&b.issue_minute<=120&&[1,2].includes(b.source_revision),'N12_CASE_REVISION');
 ensure(Number.isSafeInteger(b.seed)&&b.seed>=0&&b.seed<=2147483647,'N12_SEED');for(const k of ['supersedes','source_run_id'])ensure(b[k]===null||id(b[k]),'N12_SOURCE_ID');
 if(b.waveform!==null)ensure(exact(b.waveform,['recording_id','revision','source_sha256','channel'])&&id(b.waveform.recording_id)&&Number.isSafeInteger(b.waveform.revision)&&b.waveform.revision>0&&/^[a-f0-9]{64}$/.test(b.waveform.source_sha256)&&['ECG','PPG','RESP'].includes(b.waveform.channel),'N12_WAVEFORM');return structuredClone(b);
}
export function validPoint(p){
 ensure(exact(p,['schema_version','source_id','crew_id','at','acquired_at','known_at','revision','supersedes','values','units','quality','synthetic','generator','original_hash','transformation','hash']),'N12_POINT_SCHEMA');
 verify(p,'N12_POINT_HASH');ensure(p.schema_version==='astra.n12.point.v1'&&CREW.some(c=>c.id===p.crew_id)&&utc(p.at)&&utc(p.acquired_at)&&utc(p.known_at)&&p.at<=p.acquired_at&&p.acquired_at<=p.known_at&&p.synthetic===true&&p.generator==='n09-source-time-v1'&&id(p.source_id)&&/^[a-f0-9]{64}$/.test(p.original_hash),'N12_POINT_SOURCE');
 ensure(exact(p.values,KEYS)&&exact(p.units,KEYS)&&KEYS.every(k=>p.units[k]===METRICS[k].unit&&(p.values[k]===null||Number.isFinite(p.values[k])&&p.values[k]>=METRICS[k].range[0]&&p.values[k]<=METRICS[k].range[1])),'N12_VALUES_UNITS');
 ensure(['good','suspect','missing'].includes(p.quality?.status)&&Number.isFinite(p.quality.confidence)&&p.quality.confidence>=0&&p.quality.confidence<=1&&typeof p.quality.artifact==='boolean'&&[1,2].includes(p.revision)&&(p.revision===1?p.supersedes===null:/^[a-f0-9]{64}$/.test(p.supersedes)),'N12_QUALITY_REVISION');return p;
}
