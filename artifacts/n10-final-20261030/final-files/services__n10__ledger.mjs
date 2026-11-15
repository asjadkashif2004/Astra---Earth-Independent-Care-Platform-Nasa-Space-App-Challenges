import { createHash } from 'node:crypto';
import { authorize,check,validateRequest,VERSION,utc,id } from './contracts.mjs';
export const digest=v=>createHash('sha256').update(JSON.stringify(v,(_key,value)=>
  value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value)).digest('hex');
export function ledger(store,crew){
  const rows=store.db.prepare('SELECT kind,record_id,revision,json FROM n10_records WHERE crew_id=? ORDER BY seq LIMIT 2001').all(crew);
  check(rows.length<=2000,'N10_HISTORY_LIMIT',503);
  let previous='GENESIS';const revisions=new Map();
  return rows.map(row=>{
    let r;try{r=JSON.parse(row.json);}catch{check(false,'N10_CORRUPT',503);}
    check(r&&typeof r==='object'&&utc(r.known_at)&&utc(r.source_at)&&utc(r.submitted_at_host)&&id(r.actor),'N10_CORRUPT',503);
    const {hash,...body}=r,key=r.kind+':'+r.id;
    check(r.schema_version===VERSION&&r.crew_id===crew&&r.previous_hash===previous&&hash===digest(body)
      &&r.kind===row.kind&&r.id===row.record_id&&r.revision===row.revision&&r.revision===(revisions.get(key)??0)+1,'N10_INTEGRITY',503);
    const request={schema_version:'astra.n10.request.v1',kind:r.kind,id:r.id,expected_revision:r.revision-1,
      request_id:r.request_id,source_at:r.source_at,source:r.source,data:r.data};
    try{validateRequest(request,Date.parse(r.known_at));}catch{check(false,'N10_CORRUPT',503);}
    check(digest(request)===r.request_hash&&r.synthetic===(r.source.kind==='authored_synthetic'),'N10_INTEGRITY',503);
    revisions.set(key,r.revision);previous=hash;return r;
  });
}
export function latest(rows,before='9999'){
  const map=new Map();
  for(const r of rows)if(r.source_at<=before&&r.known_at<=before)map.set(r.kind+':'+r.id,r);
  return [...map.values()];
}
export function consentFor(rows,actor){
  return rows.filter(r=>r.kind==='consent'&&r.actor===actor).at(-1)??null;
}
export function append(store,identity,crew,body,now){
  authorize(identity,crew,true);const b=validateRequest(body,now);
  return store.transaction(()=>{
    const rows=ledger(store,crew),requestHash=digest(b);
    const duplicate=rows.find(r=>r.actor===identity.id&&r.request_id===b.request_id);
    if(duplicate){check(duplicate.request_hash===requestHash,'N10_IDEMPOTENCY_CONFLICT',409);return {record:duplicate,idempotent:true};}
    check(rows.length<2000,'N10_HISTORY_LIMIT',409);
    const prior=rows.filter(r=>r.kind===b.kind&&r.id===b.id).at(-1);
    check((prior?.revision??0)===b.expected_revision,'N10_REVISION_CONFLICT',409);
    if(prior)check(prior.actor===identity.id&&prior.source_at<=b.source_at&&prior.source.source_id===b.source.source_id,'N10_OWNER_OR_SOURCE_CONFLICT',409);
    const current=latest(rows),grant=consentFor(current,identity.id);
    if(b.kind==='consent'){
      check(b.id==='consent:'+identity.id,'N10_CONSENT_ID');
    }
    if(b.kind==='checkin'&&b.data.status==='recorded'){
      check(grant?.data.state==='granted'&&grant.source.quality==='good','N10_CONSENT_REQUIRED',403);
      check(b.data.consent_revision===grant.revision&&b.source_at>=grant.source_at,'N10_CONSENT_EPOCH',409);
      if(b.source.kind==='browser_task')check(b.source_at>=grant.known_at,'N10_CONSENT_BEFORE_TASK',409);
      check((b.data.mood===null||grant.data.mood)&&(b.data.fatigue===null||grant.data.fatigue)&&(!b.data.trials.length||grant.data.task),'N10_CONSENT_SCOPE',403);
    }
    if(b.kind==='exercise'&&b.data.plan_id){
      const plan=current.find(r=>r.kind==='exercise_plan'&&r.id===b.data.plan_id);
      check(plan&&plan.revision===b.data.plan_revision&&plan.data.status==='planned'
        &&plan.data.category===b.data.category&&plan.data.workload_unit===b.data.workload_unit,'N10_PLAN_BINDING',409);
    }
    const record={schema_version:VERSION,crew_id:crew,kind:b.kind,id:b.id,revision:b.expected_revision+1,
      actor:identity.id,request_id:b.request_id,request_hash:requestHash,source_at:b.source_at,
      known_at:new Date(now).toISOString(),submitted_at_host:new Date().toISOString(),source:b.source,synthetic:b.source.kind==='authored_synthetic',
      data:b.data,previous_hash:rows.at(-1)?.hash??'GENESIS'};
    record.hash=digest(record);
    check(Buffer.byteLength(JSON.stringify(record))<=16384,'N10_RECORD_LIMIT');
    store.db.prepare('INSERT INTO n10_records(crew_id,kind,record_id,revision,json) VALUES(?,?,?,?,?)')
      .run(crew,b.kind,b.id,record.revision,JSON.stringify(record));
    store.audit(identity.id,'n10.'+b.kind+'.appended',b.id,{crew_id:crew,revision:record.revision,hash:record.hash});
    return {record,idempotent:false};
  });
}
export function legacyConsent(store,identity,crew,body){
  const c=consentFor(latest(ledger(store,crew)),identity.id);
  if(c)check(c.data.state==='granted'&&c.data.task&&c.data.fatigue,'N10_CONSENT_REQUIRED',403);
  // Legacy rows retain their original contract; they are never N10 reference inputs.
}
