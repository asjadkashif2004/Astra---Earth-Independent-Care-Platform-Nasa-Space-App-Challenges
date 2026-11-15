import { CREW,METRICS,AppError } from '../../packages/contracts.mjs';
import { digest,utc,id,exact } from '../telemetry-simulator/n09-model.mjs';
export { digest,utc,id,exact };
export const SCHEMA='astra.n11.v1';
export const KEYS=Object.freeze(['heart_rate','hrv','spo2','respiratory_rate','temperature','fatigue','reaction_time']);
export const POLICY=Object.freeze({version:'n11-shadow-v1',features:KEYS,alpha:.25,ewma_limit:3,persistence:2,trees:32,sample:64,depth:6,forest_limit:.65,minimum_reference:12,clinical:false});
export const POLICY_HASH=digest(POLICY);
export const LIMIT=Object.freeze({frames:1024,jobs:16,result:8*1024*1024,payload:64*1024*1024,timeout:10000});
export const ensure=(v,code='N11_INVALID',status=422)=>{if(!v)throw new AppError(status,code,'N11 synthetic research: '+code);};
export function authorize(who,crew=null){ensure(who&&id(who.id)&&['demo_admin','researcher'].includes(who.role),'N11_ROLE',403);if(crew)ensure(CREW.some(c=>c.id===crew),'N11_CREW');}
export function request(b,who,now){
 authorize(who);ensure(exact(b,['schema_version','request_id','crew_id','seed','before','excluded_indices','supersedes','source_run_id','waveform','policy_hash']),'N11_SCHEMA');
 ensure(b.schema_version===SCHEMA&&id(b.request_id)&&CREW.some(c=>c.id===b.crew_id)&&Number.isSafeInteger(b.seed)&&b.seed>=0&&b.seed<=2147483647,'N11_ID_SEED');
 ensure(utc(b.before)&&Date.parse(b.before)<=now&&b.policy_hash===POLICY_HASH,'N11_TIME_POLICY');
 ensure(Array.isArray(b.excluded_indices)&&b.excluded_indices.length<=32&&new Set(b.excluded_indices).size===b.excluded_indices.length&&b.excluded_indices.every(n=>Number.isSafeInteger(n)&&n>=0&&n<720),'N11_EXCLUSIONS');
 for(const key of ['supersedes','source_run_id'])ensure(b[key]===null||id(b[key]),'N11_SOURCE_ID');
 if(b.waveform!==null)ensure(exact(b.waveform,['recording_id','revision','source_sha256','channel'])&&id(b.waveform.recording_id)&&Number.isSafeInteger(b.waveform.revision)&&b.waveform.revision>0&&/^[a-f0-9]{64}$/.test(b.waveform.source_sha256)&&['ECG','PPG','RESP'].includes(b.waveform.channel),'N11_WAVEFORM');
 return structuredClone(b);
}
export function validPoint(p){
 ensure(p&&CREW.some(c=>c.id===p.crew_id)&&utc(p.at)&&utc(p.known_at)&&p.at<=p.known_at&&p.synthetic===true&&id(p.source_id)&&p.source_generator==='n09-source-time-v1'&&typeof p.id==='string'&&p.id.length<=160&&typeof p.source_hash==='string'&&/^[a-f0-9]{64}$/.test(p.source_hash),'N11_POINT_SOURCE');
 ensure(p.values&&Object.keys(METRICS).every(k=>Object.hasOwn(p.values,k))&&Object.keys(p.values).length===Object.keys(METRICS).length,'N11_POINT_VALUES');
 ensure(p.units&&Object.keys(METRICS).every(k=>p.units[k]===METRICS[k].unit),'N11_UNITS');
 ensure(['good','suspect','missing'].includes(p.quality?.status)&&Number.isFinite(p.quality.confidence)&&p.quality.confidence>=0&&p.quality.confidence<=1&&typeof p.quality.artifact==='boolean','N11_QUALITY');
 ensure(Number.isSafeInteger(p.cadence_seconds)&&p.cadence_seconds>=1&&p.cadence_seconds<=3600&&['rest','sleep','exercise','exercise_recovery'].includes(p.activity),'N11_POINT_CONTEXT');
 for(const [k,m]of Object.entries(METRICS))ensure(p.values[k]===null||Number.isFinite(p.values[k])&&p.values[k]>=m.range[0]&&p.values[k]<=m.range[1],'N11_RANGE');return p;
}
