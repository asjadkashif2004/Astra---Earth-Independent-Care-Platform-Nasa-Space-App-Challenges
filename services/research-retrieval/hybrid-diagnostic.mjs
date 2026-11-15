import { fail,hashJSON } from './contract.mjs';

export const HYBRID_SPEC_SHA='504bec475aa5530eefd1f656765a3126c843c8ce2501ba48d23a191d6016ca8c';
export function validateHybridSpec(spec){if(hashJSON(spec)!==HYBRID_SPEC_SHA)fail('HYBRID_SPEC_MISMATCH','Only the two predeclared N14-04 policies are authorized.');return true;}
export function validateSavedList(list){
  if(!Array.isArray(list)||list.length>5||new Set(list).size!==list.length||list.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9]+$/.test(id)||id.length>120))fail('HYBRID_INPUT_INVALID','Saved lists require up to5unique bounded unit IDs.');
  return true;
}
export function hybridRank(lexical,semantic,candidate){
  validateSavedList(lexical);validateSavedList(semantic);
  if(!['lexical_weighted_rrf','append_only_semantic_rescue'].includes(candidate))fail('HYBRID_POLICY_INVALID','No third candidate or parameter substitution.');
  const ids=[...new Set([...lexical,...semantic])];
  const ranks=id=>({unit_id:id,lexical_rank:lexical.includes(id)?lexical.indexOf(id)+1:null,semantic_rank:semantic.includes(id)?semantic.indexOf(id)+1:null});
  let result;
  if(candidate==='append_only_semantic_rescue')result=ids.slice(0,5).map(ranks);
  else result=ids.map(id=>{const row=ranks(id);return {...row,rrf_score:(row.lexical_rank?2/(60+row.lexical_rank):0)+(row.semantic_rank?1/(60+row.semantic_rank):0)};}).sort((a,b)=>b.rrf_score-a.rrf_score||(a.lexical_rank??Infinity)-(b.lexical_rank??Infinity)||(a.semantic_rank??Infinity)-(b.semantic_rank??Infinity)||a.unit_id.localeCompare(b.unit_id,'en')).slice(0,5);
  if(lexical.some(id=>!result.some(r=>r.unit_id===id)))fail('HYBRID_INVARIANT','A lexical top-five unit was displaced.');
  if(candidate==='append_only_semantic_rescue'&&result.slice(0,lexical.length).map(r=>r.unit_id).join()!==lexical.join())fail('HYBRID_INVARIANT','Lexical prefix reordered.');
  return result;
}
export function compareHybrid(expected,baseline,candidate,k){
  const target=new Set(expected),l=new Set(baseline.slice(0,k).filter(id=>target.has(id))),h=new Set(candidate.slice(0,k).filter(id=>target.has(id)));
  return {baseline_recall:target.size?l.size/target.size:null,candidate_recall:target.size?h.size/target.size:null,outcome:!target.size?'unsupported_not_scored':h.size>l.size?'improved':h.size<l.size?'regressed':'tied',gained_expected_units:[...h].filter(id=>!l.has(id)),lost_expected_units:[...l].filter(id=>!h.has(id))};
}
export function summarizeHybrid(rows,candidate){
  const positive=rows.filter(r=>r.expected_units.length),out={cases:rows.length,positive_cases:positive.length,unsupported_cases:rows.length-positive.length};
  for(const k of [3,5]){
    const compared=positive.map(r=>({id:r.id,...compareHybrid(r.expected_units,r.baseline,r.candidates[candidate].map(x=>x.unit_id),k)})),counts={improved:0,regressed:0,tied:0};
    for(const row of compared)counts[row.outcome]++;
    out['at'+k]={baseline_recall:compared.reduce((n,r)=>n+r.baseline_recall,0)/positive.length,recall:compared.reduce((n,r)=>n+r.candidate_recall,0)/positive.length,...counts,any_expected_unit_loss_cases:compared.filter(r=>r.lost_expected_units.length).map(r=>r.id),per_question:compared};
  }
  return out;
}
