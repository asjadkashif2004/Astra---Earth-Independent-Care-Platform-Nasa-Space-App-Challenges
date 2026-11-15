import { validateTelemetry } from '../../packages/contracts.mjs';
import { sha, stable, fail, freeze } from './read-contract.mjs';
import { AS_OF, CAPS, QUERIES, rowsFor, projectRows } from './sqlite-fixture-contract.mjs';

export { AS_OF, CAPS };
export const SOURCE_ID='astra.n16.designated-synthetic.elevated.v1';
export const SOURCE_SHA='4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73';
export const SOURCE_BYTES=65536;
export const ROWS_SHA='414e60b782176a34c297c1d55da519f1892332a9684e41a93be98fc6fd1d0e0e';
export const DONOR='/var/tmp/astra-n16-04-gJ6VxS/originals/elevated';
export const SPEC_SHA='f28e5829bb4f7354a2ab6c6202efc23a0985d1dcb6ac401522f4716fb62a1669';
export const CODE_PINS=freeze({
  'services/agent/sqlite-fixture-process.mjs':'3a7009f7a9eff8591430c6fa01ef10503a18e0bca31887165211ac026d499745',
  'services/agent/sqlite-fixture-contract.mjs':'a5f496d16326fda1df8d9eeec0d8a015970a8854023257f659b8df464e6b0d1c',
  'services/agent/read-contract.mjs':'1b7ce5f7d1362eb776d2eb9e4aede141b99c4fc0729c0b02c47f8a2156b071f6',
  'packages/contracts.mjs':'d5f3809213fc95bd77a7831006a557b2220af249a5ff3be36df6d9ebf57eef18'
});
export const check=(v,code)=>{if(!v)fail(code);};
export const FILES=freeze({'source.sqlite':{bytes:SOURCE_BYTES,sha256:SOURCE_SHA},'source.sqlite-wal':null,'source.sqlite-shm':null});
export function expectedRows(call){
  const rows=rowsFor('elevated',0);check(sha(stable(rows))===ROWS_SHA,'CANONICAL_ROWS_CHANGED');
  return call.tool==='get_open_risk_events'?rows.risks.filter(r=>r.crew_id===call.args.crew_id&&r.status==='open').slice(0,call.args.limit+1)
    :call.args.metrics.map(m=>rows[call.tool==='get_personal_baseline'?'baselines':'observations'].find(r=>r.crew_id===call.args.crew_id&&r.metric===m)??null);
}
export function verifyRead(call,event){
  check(event?.event==='RESULT','MISSING_SQL_RESULT');const receipt=event.receipt,selected=expectedRows(call);
  const ids=['metadata',...(call.tool==='get_open_risk_events'?['risks']:call.args.metrics.map(()=>call.tool==='get_personal_baseline'?'baseline':'observation'))];
  check(stable(event.result)===stable(projectRows('elevated',0,call,selected)),'CANONICAL_RESULT_MISMATCH');
  check(receipt?.readOnly===true&&receipt.actual_sql_queries===ids.length&&stable(receipt.query_ids)===stable(ids)
    &&receipt.selected_rows_sha256===sha(stable(selected))&&receipt.transaction_ms>=0&&receipt.transaction_ms<=CAPS.transactionMs,'SQL_RECEIPT_INVALID');
  check(stable(receipt.before)===stable(FILES)&&stable(receipt.after)===stable(FILES),'READER_SOURCE_CHANGED');
  const i=receipt.isolation;
  check(i?.root_write_denied&&i.database_write_denied&&i.routes===0&&i.project_visible===false&&i.home_visible===false
    &&i.source_mount==='read_only'&&i.node==='v24.21.0'&&i.sqlite==='3.53.4','ISOLATION_NOT_VERIFIED');
  return event;
}
export function archiveEligibility(event,asOf){
  if(!event)return {status:'UNKNOWN',reason:'missing_observation',age_ms:null};
  const age=Date.parse(asOf)-Date.parse(event.ts);
  try{validateTelemetry(event,Date.parse(asOf));}catch{return {status:'UNKNOWN',reason:'invalid_observation',age_ms:null};}
  const reason=!Number.isFinite(age)||age<0?'future_or_invalid_time':event.source.kind!=='simulator'?'source_not_authorized'
    :age>Math.max(5000,3000/event.source.sampling_hz)?'stale_observation'
      :event.quality.status!=='good'||event.quality.artifact||event.metric.value===null?'unreliable_quality':null;
  return {status:reason?'UNKNOWN':'KNOWN',reason,age_ms:age};
}
export function designatedProjection(raw,call,context,manifestSha,instanceSha){
  const result=structuredClone(raw),rows=rowsFor('elevated',0);
  if(!['get_personal_baseline','get_open_risk_events'].includes(call.tool)){
    for(const item of result.data.items){
      const row=rows.observations.find(r=>r.crew_id===call.args.crew_id&&r.metric===item.metric),e=row?JSON.parse(row.json):null;
      const eligibility=archiveEligibility(e,context.read_as_of);
      if(eligibility.status!=='KNOWN'){item.value=null;item.data_status='UNKNOWN';item.reason=eligibility.reason;}
      if(item.provenance)Object.assign(item.provenance,{age_ms:eligibility.age_ms,freshness:eligibility.reason==='stale_observation'?'stale':eligibility.status==='KNOWN'?'fresh':'unverified'});
    }
    const known=result.data.items.filter(i=>i.data_status==='KNOWN').length;
    result.data_status=known===result.data.items.length?'KNOWN':known?'PARTIAL':'UNKNOWN';
  }
  return {...result,schema_version:'astra.n16.designated-result.v1',label:'SYNTHETIC / ARCHIVED DESIGNATED SOURCE',
    provenance:{...result.provenance,source_kind:'designated_synthetic_archive',source_id:SOURCE_ID,source_sha256:SOURCE_SHA,
      manifest_sha256:manifestSha,source_instance_sha256:instanceSha,source_as_of:AS_OF,read_as_of:context.read_as_of,
      host_currency:'NOT_LIVE_ARCHIVE',monitoring_health:'UNKNOWN',view:'archive',scope:context.crew_ids,
      verified_at:new Date().toISOString(),original_projection_sha256:sha(stable(raw)),query_sha256:sha(stable(QUERIES))}};
}
