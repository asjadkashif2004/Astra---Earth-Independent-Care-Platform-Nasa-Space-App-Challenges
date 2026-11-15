import { createHash } from 'node:crypto';
import { CREW,METRICS,SCENARIOS,MISSION_ID,AppError,DEMO_HR } from '../../packages/contracts.mjs';
import { random,gaussian,baselineFrom } from './simulator.mjs';
import { hrProfile } from './demo-profile.mjs';
export const N09='astra.n09.run.v1',GEN='n09-source-time-v1',DAY=86400000;
export const LIMITS=Object.freeze({frames:512,runs:16,payload:134217728,advance:21600,batch:64});
export const digest=v=>createHash('sha256').update(JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)).digest('hex');
export const check=(ok,code='N09_INVALID',status=422)=>{if(!ok)throw new AppError(status,code,'Synthetic simulator: '+code);};
export const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(v);
export const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export const iso=n=>new Date(n).toISOString();
export function authorize(who,crew,write=false){check(who&&id(who.id),'N09_IDENTITY',403);check(write?who.role==='demo_admin':['demo_admin','astronaut','mission_control','flight_surgeon','viewer','researcher'].includes(who.role),'N09_ROLE',403);if(crew)check(CREW.some(c=>c.id===crew)&&(who.role!=='astronaut'||who.crew_id===crew),'N09_CREW',403);}
const parameters={
  nominal:{circadian_scale:.2,noise_scale:.1,dropout_probability:.002,artifact_probability:.001},
  'controlled-hr-rise':{...DEMO_HR},
  'cardiorespiratory-drift':{onset_seconds:30,ramp_seconds:150,heart_rate_scale:5.3,respiratory_rate_scale:5.1,spo2_scale:-4.8},
  'sleep-debt-cardio-drift':{future_sleep_reduction_hours_cap:2,coupling:'min(1,covered_completed_shortfall_hours/6)',heart_rate_scale:3.2,hrv_scale:-2.8,fatigue_scale:2.9},
  'sleep-fatigue':{future_sleep_reduction_hours_cap:2,coupling:'min(1,covered_completed_shortfall_hours/6)',fatigue_scale:3,reaction_time_scale:2.2},
  'post-exercise':{recovery_seconds:900,time_constant_seconds:180,heart_rate_offset:54,respiratory_rate_offset:11,hrv_offset:-20},
  'radiation-spike':{onset_seconds:30,dose_rate_msv_h:.084,co2_ppm:2800,scope:'MISSION_SHARED'},
  'sensor-dropout':{onset_seconds:30,quality:'missing',values:null},
  'contradictory-sensors':{onset_seconds:30,quality:'suspect',artifact:true,heart_rate:151,confidence:.4},
  'communication-blackout':{scope:'MISSION_SHARED',restore:'explicit existing comms control only'}
};
export const CATALOG=SCENARIOS.map(s=>({...s,version:GEN,synthetic:true,clinical_validation:false,legacy_behavior_preserved:true,scope:'selected fictional crew; environment/link effects explicitly mission-shared',parameters:parameters[s.id],
  expected:['sleep-fatigue','sleep-debt-cardio-drift'].includes(s.id)?'Only actual future completed covered days support descriptive accumulation; no guaranteed alert or fabricated preceding nights.':s.expected}));
export const DEFINITION_HASH=digest(CATALOG);
export function validateRun(b){
  check(exact(b,['schema_version','request_id','seed','cadence_seconds','duration_seconds','assignments','waveform']),'N09_SCHEMA');
  check(b.schema_version===N09&&id(b.request_id)&&Number.isSafeInteger(b.seed)&&b.seed>=0&&b.seed<=2147483647,'N09_ID_SEED');
  check([30,60,300,1800,3600].includes(b.cadence_seconds)&&Number.isSafeInteger(b.duration_seconds)&&b.duration_seconds>=30&&b.duration_seconds<=7*86400
    &&b.duration_seconds%b.cadence_seconds===0&&b.duration_seconds/b.cadence_seconds+1<=LIMITS.frames,'N09_TIME_BOUNDS');
  check(Array.isArray(b.assignments)&&b.assignments.length>=1&&b.assignments.length<=6&&new Set(b.assignments.map(a=>a?.crew_id)).size===b.assignments.length,'N09_ASSIGNMENTS');
  for(const a of b.assignments)check(exact(a,['crew_id','scenario_id','onset_seconds'])&&CREW.some(c=>c.id===a.crew_id)&&SCENARIOS.some(s=>s.id===a.scenario_id)
    &&Number.isSafeInteger(a.onset_seconds)&&a.onset_seconds>=0&&a.onset_seconds<b.duration_seconds,'N09_ASSIGNMENT');
  if(b.waveform!==null)check(exact(b.waveform,['crew_id','recording_id','revision','source_sha256','channel'])&&CREW.some(c=>c.id===b.waveform.crew_id)&&id(b.waveform.recording_id)
    &&Number.isSafeInteger(b.waveform.revision)&&b.waveform.revision>0&&/^[a-f0-9]{64}$/.test(b.waveform.source_sha256)&&['ECG','PPG','RESP'].includes(b.waveform.channel),'N09_WAVEFORM');
  return structuredClone(b);
}
export function baselineArchive(baselines,at){
  const calibration={schema_version:'astra.n09.calibration.v1',source:'AUTHORED_SYNTHETIC_CALIBRATION',seed:42017,timebase:{start_at:iso(at-30*DAY),period_seconds:3600,count:720},known_at:iso(at),clinical_validation:false,crew:{}};
  for(const [i,c]of CREW.entries()){
    const rng=random(42017+i*1009);calibration.crew[c.id]={};
    for(const [key,m]of Object.entries(METRICS)){
      const personal=m.center+(i-2.5)*m.scale*.15,values=Array.from({length:720},()=>personal+gaussian(rng)*m.scale),b={...baselineFrom(values,m.scale*.5),unit:m.unit};
      check(digest(b)===digest(baselines[c.id]?.[key]),'N09_BASELINE_PROVENANCE',409);
      calibration.crew[c.id][key]={...b,values,excluded:[],source_version:'legacy-calibration-42017-dated-v1'};
    }
  }
  calibration.hash=digest(calibration);return calibration;
}
export function dailyPlan(at,crewId){
  const i=CREW.findIndex(c=>c.id===crewId),day=Math.floor(at/DAY)*DAY,reference_hours=7.75+i*.1,end=day+7*3600000+i*600000;
  const completion=end>at?end-DAY:end;
  return {version:'n09-daily-utc-v1',crew_id:crewId,reference_hours,completion,start_at:iso(completion-reference_hours*3600000),end_at:iso(completion),
    next_sleep_start_at:iso(completion+DAY-Math.round(reference_hours*3600000)),next_sleep_end_at:iso(completion+DAY),exercise_start:day+17*3600000+i*600000,exercise_end:day+18*3600000+i*600000,timezone:'UTC',synthetic:true};
}
const uniform=s=>(parseInt(createHash('sha256').update(s).digest('hex').slice(0,8),16)+1)/4294967297;
const noise=s=>Math.sqrt(-2*Math.log(uniform(s+':a')))*Math.cos(2*Math.PI*uniform(s+':b'));
export function generatedCrew(run,a,baseline,at,priorSleep){
  const p=CREW.find(c=>c.id===a.crew_id),i=CREW.indexOf(p),elapsed=Math.max(0,a.elapsed_seconds-a.onset_seconds),started=a.elapsed_seconds>=a.onset_seconds,scenario=started?a.scenario_id:'nominal';
  const plan=dailyPlan(at,p.id),dayFraction=(at%DAY)/DAY,phase=2*Math.PI*(dayFraction-i/144),activeExercise=at>=plan.exercise_start&&at<plan.exercise_end;
  const values=Object.fromEntries(Object.entries(METRICS).map(([key,m])=>[key,baseline[key].center+baseline[key].scale*(.2*Math.sin(phase)+.1*noise(`${run.config.seed}:${p.id}:${key}:${Math.floor(at/1000)}`))]));
  let activity=activeExercise?'exercise':at>=Date.parse(plan.next_sleep_start_at)&&at<Date.parse(plan.next_sleep_end_at)?'sleep':'rest';
  if(activeExercise){values.heart_rate+=baseline.heart_rate.scale*.8;values.respiratory_rate+=baseline.respiratory_rate.scale*.8;}
  const ramp=Math.max(0,Math.min(1,(elapsed-30)/150)),completed=run.completed_days[p.id]??[],covered=completed.every(d=>d.quality==='good'),shortfall=covered?completed.reduce((n,d)=>n+Math.max(0,d.reference_hours-d.observed_hours),0):null;
  const longitudinal=shortfall===null?0:Math.min(1,shortfall/6);
  if(scenario===DEMO_HR.id)values.heart_rate+=baseline.heart_rate.scale*5*hrProfile(elapsed).fraction;
  if(scenario==='sleep-debt-cardio-drift'){values.heart_rate+=baseline.heart_rate.scale*3.2*longitudinal;values.hrv-=baseline.hrv.scale*2.8*longitudinal;values.fatigue+=baseline.fatigue.scale*2.9*longitudinal;}
  if(scenario==='sleep-fatigue'){values.fatigue+=baseline.fatigue.scale*3*longitudinal;values.reaction_time+=baseline.reaction_time.scale*2.2*longitudinal;}
  if(scenario==='cardiorespiratory-drift'){values.heart_rate+=baseline.heart_rate.scale*5.3*ramp;values.respiratory_rate+=baseline.respiratory_rate.scale*5.1*ramp;values.spo2-=baseline.spo2.scale*4.8*ramp;}
  if(scenario==='post-exercise'&&elapsed<900){activity='exercise_recovery';values.heart_rate+=54*Math.exp(-elapsed/180);values.respiratory_rate+=11*Math.exp(-elapsed/180);values.hrv-=20*Math.exp(-elapsed/180);}
  let quality='good',confidence=.98,artifact=false,truth='nominal';
  const qualityDraw=uniform(`${run.config.seed}:${p.id}:quality:${Math.floor(at/1000)}`);
  if(scenario==='sensor-dropout'&&elapsed>=30||qualityDraw<.002){quality='missing';confidence=0;truth='dropout';}
  else if(scenario==='contradictory-sensors'&&elapsed>=30||qualityDraw<.003){quality='suspect';confidence=.4;artifact=true;values.heart_rate=151;truth='artifact';}
  else if(scenario==='post-exercise')truth='activity_context';
  else if(['sleep-fatigue','sleep-debt-cardio-drift'].includes(scenario))truth=longitudinal>0?'authored_longitudinal_deviation':'awaiting_completed_days';
  else if(scenario==='cardiorespiratory-drift'||scenario===DEMO_HR.id)truth=ramp>0?'authored_deviation':'nominal';
  if(quality==='missing')for(const key of Object.keys(values))values[key]=null;
  else for(const [key,m]of Object.entries(METRICS))values[key]=Number(Math.max(m.range[0],Math.min(m.range[1],values[key])).toFixed(key==='radiation'?4:2));
  const sleepRecords=[];
  if(plan.completion>Date.parse(priorSleep?.scheduled_end_at??priorSleep?.end_at??iso(run.start_at))&&plan.completion>run.start_at){
    const days=Math.max(1,Math.floor((plan.completion-run.start_at)/DAY)+1),reduction=['sleep-fatigue','sleep-debt-cardio-drift'].includes(scenario)?Math.min(2,.5+days*.5):0;
    const duration=Number((plan.reference_hours-reduction).toFixed(2)),sid='SLEEP-'+digest([run.id,p.id,plan.end_at]).slice(0,32),session={session_id:sid,revision:1,start_at:iso(plan.completion-duration*3600000),end_at:plan.end_at,scheduled_end_at:plan.end_at,historical_fixture:false};
    sleepRecords.push({schema_version:'astra.telemetry.v1',event_id:sid+':r1',mission_id:MISSION_ID,crew_id:p.id,ts:plan.end_at,received_ts:iso(at),metric:{system:'urn:astra:metric',code:'sleep-duration',name:'sleep_duration',value:quality==='missing'?null:duration,unit:'h'},quality:{status:quality,confidence,artifact},source:{kind:'simulator',device_id:'SIM-SLEEP-'+p.id,sampling_hz:1/86400,clock:'mission_simulation'},provenance:{synthetic:true,scenario_id:scenario,seed:run.config.seed,generator_version:'n09-sleep-v1'},sleep_session:session});
  }
  const events=Object.entries(values).filter(([name])=>name!=='sleep_duration').map(([name,value])=>({schema_version:'astra.telemetry.v1',event_id:`${run.id}:${run.frame_count}:${p.id}:${name}`,mission_id:MISSION_ID,crew_id:p.id,ts:iso(at),received_ts:iso(at),metric:{system:METRICS[name].system??'urn:astra:metric',code:METRICS[name].code,name,value,unit:METRICS[name].unit},quality:{status:quality,confidence,artifact},source:{kind:'simulator',device_id:'SIM-'+p.id,sampling_hz:1/run.config.cadence_seconds,runtime_hz:1,clock:'mission_simulation'},provenance:{synthetic:true,scenario_id:scenario,seed:run.config.seed,generator_version:GEN}}));
  return {events:[...events,...sleepRecords],activity,plan,truth:{class:truth,scenario_id:scenario,authored:true,independent_scientific_review:false},context:{plan,completed_days:completed.length,shortfall_hours:completed.length&&covered?shortfall:null,status:completed.length&&covered?'KNOWN':'UNKNOWN',formula:'sum(max(0, authored_reference_hours - completed_observed_hours)); complete covered days only',clinical_sleep_debt:false},sleepRecords};
}
