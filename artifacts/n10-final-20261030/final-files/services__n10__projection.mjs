import { authorize,check,day,dayAt,utc,DAY,POLICY } from './contracts.mjs';
import { ledger,latest,consentFor,digest } from './ledger.mjs';
const ms=v=>Date.parse(v),hours=(a,b)=>(ms(b)-ms(a))/3600000;
const good=r=>r.source.quality==='good';
export function visible(rows,identity){
  const current=latest(rows);
  return rows.filter(r=>{
    if(!['consent','checkin'].includes(r.kind))return true;
    const grant=consentFor(current,r.actor);
    const own=r.actor===identity.id;
    if(r.kind==='consent')return own||['mission_control','flight_surgeon'].includes(identity.role)&&grant?.data.share_review;
    return grant?.data.state==='granted'&&good(grant)&&r.data.consent_revision===grant.revision&&(own
      ||['mission_control','flight_surgeon'].includes(identity.role)&&grant.data.share_review);
  });
}
function stageSummary(records,date){
  const start=ms(date+'T00:00:00.000Z'),end=start+DAY,totals={};let covered=0,known=0,last=start,overlap=false;
  const intervals=records.filter(r=>r.kind==='stage'&&r.data.status==='observed'&&ms(r.data.start_at)<end&&ms(r.data.end_at)>start)
    .map(r=>({id:r.id,revision:r.revision,label:r.data.label,start:Math.max(start,ms(r.data.start_at)),end:Math.min(end,ms(r.data.end_at)),quality:r.source.quality,source:r.source,hash:r.hash}))
    .sort((a,b)=>a.start-b.start||a.end-b.end);
  for(const x of intervals){
    if(x.start<last)overlap=true;
    const seconds=(x.end-x.start)/1000;
    covered+=seconds;totals[x.label]=(totals[x.label]??0)+seconds;
    if(x.quality==='good'&&x.label!=='Sleep stage ?')known+=seconds;
    last=Math.max(last,x.end);
  }
  return {status:overlap?'UNKNOWN':known===86400?'KNOWN':known?'PARTIAL':'UNKNOWN',reason:overlap?'Overlapping source intervals; totals withheld.':'UTC day coverage; gaps are unobserved, not inferred sleep.',
    window_start:new Date(start).toISOString(),window_end:new Date(end).toISOString(),intervals,
    totals_seconds:overlap?null:totals,covered_seconds:overlap?null:covered,known_seconds:overlap?null:known,
    unobserved_seconds:overlap?null:86400-covered,coverage:overlap?null:known/86400,authored_staging:true};
}
function scheduleAt(records,date){
  const matches=records.filter(r=>r.kind==='schedule'&&r.data.status==='active'&&r.data.effective_from<=date&&r.data.effective_to>=date);
  if(matches.length!==1)return {status:'UNKNOWN',reason:matches.length?'Conflicting schedules':'No dated schedule'};
  const r=matches[0],shift=ms(date)-ms(r.data.effective_from);
  return {status:good(r)?'KNOWN':'UNKNOWN',id:r.id,revision:r.revision,version:r.hash,
    planned_start:new Date(ms(r.data.start_at)+shift).toISOString(),planned_end:new Date(ms(r.data.end_at)+shift).toISOString(),
    planned_hours:r.data.reference_hours,source:r.source,effective_from:r.data.effective_from,effective_to:r.data.effective_to};
}
function actualAt(sleeps,date,statuses){
  const records=sleeps.filter(r=>dayAt(r.end_at)===date);
  const declared=statuses.filter(r=>r.kind==='sleep_status'&&r.data.day===date&&r.data.status!=='cancelled');
  if(declared.length>1)return {status:'UNKNOWN',reason:'Conflicting authored sleep status records'};
  const status=declared[0];
  if(status){
    if(!good(status)||status.data.status==='unknown')return {status:'UNKNOWN',reason:'Unverified authored sleep status',status_record:status};
    if(status.data.status==='missed')return records.length?{status:'UNKNOWN',reason:'Missed declaration conflicts with canonical session'}:
      {status:'KNOWN',hours:0,session_state:'EXPLICIT_AUTHORED_MISSED',status_record:status};
    if(records.length!==1||records[0].session_id!==status.data.session_id)return {status:'UNKNOWN',reason:'Sleep status is not bound to a canonical session'};
    if(status.data.status==='partial')return {status:'PARTIAL',hours:null,observed_hours:records[0].duration_hours,reason:'Explicit partial coverage; full sleep duration is not established.',status_record:status};
  }
  if(records.length!==1)return {status:'UNKNOWN',reason:records.length?'Multiple unbound sleep sessions':'No canonical completed session'};
  const r=records[0],verified=r.quality?.status==='good'&&!r.quality.artifact&&r.quality.confidence>=.7&&Number.isFinite(r.duration_hours);
  return {status:verified?'KNOWN':'UNKNOWN',hours:verified?r.duration_hours:null,start_at:r.start_at,end_at:r.end_at,
    record_id:r.record_id,session_id:r.session_id,revision:r.revision,source:r.source,quality:r.quality,provenance:r.provenance,
    observed_at:r.observed_at,known_at:r.known_at};
}
function accounting(records,sleeps,date,days){
  const history=[];
  for(let i=days-1;i>=0;i--){
    const d=dayAt(ms(date)-i*DAY),schedule=scheduleAt(records,d),actual=actualAt(sleeps,d,records);
    const supported=schedule.status==='KNOWN'&&actual.status==='KNOWN';
    history.push({day:d,schedule,actual,status:supported?'KNOWN':'UNKNOWN',
      difference_hours:supported?schedule.planned_hours-actual.hours:null,
      descriptive_shortfall_hours:supported?Math.max(0,schedule.planned_hours-actual.hours):null});
  }
  const complete=history.every(r=>r.status==='KNOWN');
  return {status:complete?'KNOWN':'UNKNOWN',history,cumulative_shortfall_hours:complete?history.reduce((s,r)=>s+r.descriptive_shortfall_hours,0):null,
    covered_days:history.filter(r=>r.status==='KNOWN').length,requested_days:days,
    formula:'max(0, authored planned hours - canonical observed hours), summed only with complete day coverage; no clinical sleep debt.'};
}
function cognition(records,currentAll,identity){
  const actor=identity.id,grant=consentFor(latest(currentAll),actor);
  const historical=consentFor(records,actor);
  const allowed=grant?.data.state==='granted'&&historical?.data.state==='granted'&&grant.revision===historical.revision&&good(grant);
  const history=records.filter(r=>r.kind==='checkin');
  const mine=history.filter(r=>r.actor===actor);
  const eligible=allowed?mine.filter(r=>r.data.status==='recorded'&&r.data.trials.length===5&&good(r)
    &&r.data.consent_revision===grant.revision&&r.source_at>=grant.source_at)
    .sort((a,b)=>a.source_at.localeCompare(b.source_at)||a.id.localeCompare(b.id)):[];
  const current=eligible.at(-1),prior=current?eligible.filter(r=>r.source_at<current.source_at&&r.data.device===current.data.device
    &&r.data.task_id===current.data.task_id&&r.source.kind===current.source.kind&&r.source.source_id===current.source.source_id):[];
  const mean=r=>r.data.trials.reduce((s,v)=>s+v,0)/r.data.trials.length;
  const values=prior.map(mean).sort((a,b)=>a-b),center=values.length%2?values[Math.floor(values.length/2)]:(values[values.length/2-1]+values[values.length/2])/2;
  return {status:allowed?'AVAILABLE':grant?.data.state?.toUpperCase()??'UNKNOWN',
    consent:historical?{id:historical.id,revision:historical.revision,data:historical.data,hash:historical.hash}:null,
    current_consent:grant?{id:grant.id,revision:grant.revision,data:grant.data}:null,
    history,eligible_count:eligible.length,
    reference:prior.length>=3?{status:'KNOWN',policy:POLICY,version:digest([POLICY,...prior.map(r=>[r.id,r.revision,r.hash])]),
      center_ms:center,session_count:prior.length,from:prior[0].source_at,to:prior.at(-1).source_at,
      task_id:current.data.task_id,device:current.data.device,current_mean_ms:mean(current),difference_ms:mean(current)-center,
      input_records:prior.map(r=>({id:r.id,revision:r.revision,source_at:r.source_at,hash:r.hash})),diagnostic_score:null}
      :{status:'UNKNOWN',reason:'At least three prior eligible five-trial sessions on the same device/protocol/consent epoch are required.',prior_sessions:prior.length,diagnostic_score:null},
    limitation:'Approximate browser/device timing; personal descriptive reference only. No cognitive diagnosis or ranking. Legacy task rows are excluded.'};
}
function exerciseSummary(records,date){
  const plans=records.filter(r=>r.kind==='exercise_plan'&&r.data.status==='planned'&&dayAt(r.data.start_at)===date);
  const sessions=records.filter(r=>r.kind==='exercise'&&dayAt(r.data.start_at)===date);
  let completed=0,resolved=0;
  const plan_results=plans.map(p=>{
    const found=sessions.filter(s=>s.data.plan_id===p.id&&s.data.plan_revision===p.revision&&s.data.status!=='cancelled'
      &&good(s)&&s.data.coverage==='complete'&&s.data.category===p.data.category&&s.data.workload_unit===p.data.workload_unit);
    if(!good(p)||found.length!==1)return {id:p.id,status:'UNKNOWN',reason:'Missing, conflicting, cancelled or unverified performance evidence'};
    resolved++;const s=found[0],met=s.data.status==='performed'&&hours(s.data.start_at,s.data.end_at)*60>=p.data.target_minutes;
    if(met)completed++;return {id:p.id,status:met?'COMPLETED':'EXPLICIT_PARTIAL_OR_MISSED',session_id:s.id,revision:s.revision};
  });
  const start=ms(date),end=start+DAY;
  const moves=records.filter(r=>r.kind==='movement'&&r.data.status==='observed'&&ms(r.data.start_at)<end&&ms(r.data.end_at)>start)
    .sort((a,b)=>a.data.start_at.localeCompare(b.data.start_at));
  const valid=moves.length>0&&moves.every((r,i)=>good(r)&&r.data.coverage==='complete'&&r.data.steps!==null
    &&ms(r.data.start_at)>=start&&ms(r.data.end_at)<=end
    &&(!i||moves[i-1].data.end_at<=r.data.start_at));
  return {plans,sessions,plan_results,adherence:{status:plans.length&&resolved===plans.length?'KNOWN':'UNKNOWN',
    eligible_plans:plans.length,resolved_plans:resolved,completed_plans:completed,
    percent:plans.length&&resolved===plans.length?100*completed/plans.length:null,
    denominator:'Non-cancelled authored plans for the selected UTC day; missing records are not confirmed nonadherence.'},
    movement:{status:valid?'KNOWN':'UNKNOWN',steps:valid?moves.reduce((s,r)=>s+r.data.steps,0):null,
      coverage_seconds:valid?moves.reduce((s,r)=>s+(ms(r.data.end_at)-ms(r.data.start_at))/1000,0):null,
      records:moves,reason:valid?'Supplied source intervals only; not full-day tracking.':'No complete non-overlapping verified movement evidence.'}};
}
export function project(store,identity,crew,{date,before,days=7},now){
  authorize(identity,crew);
  check(day(date)&&utc(before)&&ms(before)<=now&&Number.isInteger(days)&&days>=1&&days<=31,'N10_QUERY');
  const all=ledger(store,crew),allowed=visible(all,identity),records=latest(allowed,before);
  const sleepMap=new Map();
  const sleepRows=store.sleepHistory(crew,1000,before);
  for(const r of (sleepRows.length===1000?[]:sleepRows).slice().reverse()){
    if(r.known_at<=before&&r.observed_at<=before&&r.end_at<=before)sleepMap.set(r.session_id,r);
  }
  const sleeps=[...sleepMap.values()];
  return {schema_version:'astra.n10.view.v1',crew_id:crew,day:date,as_of:before,current_mission_at:new Date(now).toISOString(),
    source_type:'SYNTHETIC DEMO / separate optional task measurements',clock:'UTC / mission_simulation; source and knowledge cutoffs',
    stages:stageSummary(records,date),sleep:accounting(records,sleeps,date,days),
    cognition:cognition(records,all,identity),exercise:exerciseSummary(records,date),
    records:allowed.filter(r=>r.source_at<=before&&r.known_at<=before),ledger_head:allowed.filter(r=>r.source_at<=before&&r.known_at<=before).at(-1)?.hash??'GENESIS',
    record_count:allowed.filter(r=>r.source_at<=before&&r.known_at<=before).length,diagnosis:null,alert_authority:'N02 unchanged',research_answer_support:'ABSTAIN'};
}
