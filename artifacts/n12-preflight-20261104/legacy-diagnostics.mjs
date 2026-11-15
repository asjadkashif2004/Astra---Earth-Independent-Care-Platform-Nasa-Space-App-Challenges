// Reproduce limitations of the unchanged pure helper, not new N12 inference or scientific acceptance.
import { forecast } from '../../services/prediction/forecast.mjs';
import { EPOCH } from '../../packages/contracts.mjs';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base=Array.from({length:20},(_,i)=>({ts:new Date(EPOCH+i*60000).toISOString(),quality:'good',values:{heart_rate:65+i*.1}}));
const cases=[
 ['negative_horizon',h=>h,-30,'Pure helper has no horizon validation; existing HTTP path always uses its fixed default.'],
 ['interior_invalid_timestamp',h=>{h[5].ts='invalid';return h;},30,'Interior invalid time can produce nonfinite arithmetic while available remains true.'],
 ['duplicate_observations',h=>{h[5]=structuredClone(h[4]);return h;},30,'Pure helper has no observation-ID/duplicate eligibility check.'],
 ['interior_out_of_order',h=>{[h[5],h[6]]=[h[6],h[5]];return h;},30,'Chronological input is an implicit caller assumption, not enforced by this pure helper.'],
 ['future_endpoint',h=>{h.at(-1).ts='2099-01-01T00:00:00.000Z';return h;},30,'There is no issue/knowledge cutoff argument. The existing canonical ingest guards are separate; this is not evidence of an actual HTTP future leak.']
];
const rows=cases.map(([name,mutate,horizon,note])=>{try{const result=forecast(mutate(structuredClone(base)),'heart_rate',horizon);return {name,note,result,nonfinite_available:result.available===true&&['estimate','lower','upper'].some(k=>!Number.isFinite(result[k]))};}catch(error){return{name,note,error:{name:error.name,message:error.message}};}});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync(new URL('./legacy-validation-gaps.json',import.meta.url),JSON.stringify({schema_version:'astra.n12.legacy-diagnostic.v1',scope:'Existing pure-helper source-contract diagnostics only. Not N12 qualification, not an operational/security incident, and not counted as passing safety tests.',current_forecast_sha256:hash('services/prediction/forecast.mjs'),model_calibration_sha256:hash('models/forecast-calibration.json'),cases:rows,repair_status:'NOT IMPLEMENTED: new N12 source/time/horizon contract requires the inactive sequencing proposal to be explicitly activated; legacy code is preserved.',new_N12_candidates:0},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({name:r.name,available:r.result?.available,nonfinite_available:r.nonfinite_available})),null,2));
