// N16-06G: one tool policy over the qualified single-SELECT boundary. No SQL/IO here.
import { requirePermission } from '../../packages/contracts.mjs';
import { exact,validateCall } from './read-contract.mjs';
import { AS_OF } from './designated-contract.mjs';
import { executeSingle,singleCheck as check } from './single-select-contract.mjs';

export const QUALITY_MODE='n16-06g-single-quality-v1';
export function authorizeQuality(input,context){
  const call=validateCall(input);
  check(exact(context,['principal','crew_ids','read_as_of'])&&context.principal?.role==='astronaut'
    &&Array.isArray(context.crew_ids)&&context.crew_ids.length===1&&context.crew_ids[0]===context.principal.crew_id
    &&context.read_as_of===AS_OF,'QUALITY_SCOPE_INVALID');
  requirePermission(context.principal,'read',call.args.crew_id);
  check(call.tool==='get_data_quality'&&call.args.metrics.length===1&&context.crew_ids.includes(call.args.crew_id),'QUALITY_CALL_FORBIDDEN');
  return call;
}
// Downgrade only. A successful query, or good-looking flags alone, cannot turn
// missing/unverified evidence into KNOWN. Original canonical projection is kept in audit.
export function assessQuality(input){
  check(input?.tool==='get_data_quality'&&input.synthetic===true&&input.inference_performed===false
    &&input.clinical_support===false&&Array.isArray(input.data?.items)&&input.data.items.length===1,'QUALITY_RESULT_INVALID');
  const result=structuredClone(input);
  for(const item of result.data.items){
    const q=item.quality,p=item.provenance;
    const valid=exact(q,['status','confidence','artifact'])&&['good','suspect','missing'].includes(q.status)
      &&Number.isFinite(q.confidence)&&q.confidence>=0&&q.confidence<=1&&typeof q.artifact==='boolean';
    const observed=Date.parse(p?.observed_at),received=Date.parse(p?.received_at),age=Date.parse(AS_OF)-observed,hz=p?.source?.sampling_hz;
    const known=valid&&q.status==='good'&&!q.artifact&&item.data_status==='KNOWN'&&!item.reason
      &&Number.isFinite(age)&&age>=0&&Number.isFinite(received)&&received>=observed&&received<=Date.parse(AS_OF)
      &&Number.isFinite(hz)&&hz>0&&hz<=1000&&age<=Math.max(5000,3000/hz)
      &&p.source.kind==='simulator'&&p.freshness==='fresh'&&p.age_ms===age
      &&typeof p.event_id==='string'&&/^[a-f0-9]{64}$/.test(p.row_sha256??'');
    item.value=null;
    if(!valid)item.quality=null;
    if(!known){
      item.data_status='UNKNOWN';item.reason??=valid?'quality_or_freshness_unverified':'quality_metadata_missing_or_invalid';
      if(p&&typeof p==='object'&&!Array.isArray(p)){p.age_ms=Number.isFinite(age)&&age>=0?age:null;
        p.freshness=Number.isFinite(age)&&Number.isFinite(hz)&&hz>0&&age>Math.max(5000,3000/hz)?'stale':'unverified';}
    }
  }
  result.data_status=result.data.items.every(i=>i.data_status==='KNOWN')?'KNOWN':'UNKNOWN';
  return result;
}
const POLICY=Object.freeze({mode:QUALITY_MODE,authorize:authorizeQuality});
export async function executeQuality(request,io){
  const value=await executeSingle(request,io,POLICY);
  return {...value,result:assessQuality(value.result),receipt:{...value.receipt,quality_audit:{canonical_projection:value.result}}};
}
