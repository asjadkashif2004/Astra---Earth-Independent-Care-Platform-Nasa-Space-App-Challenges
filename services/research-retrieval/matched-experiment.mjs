import { POLICY,hashJSON,fail,sha256,stableJSON } from './contract.mjs';
import { terms,validQuery,vectorAt } from './retrieval.mjs';
import { validateVector } from './encoder.mjs';

export const MATCHED_SPEC_SHA='29009fb291878af7147add3471fa3bf9d54c6bab8d6fdd3e9056d67b9743b4fc';
export function validateMatchedSpec(spec){if(hashJSON(spec)!==MATCHED_SPEC_SHA)fail('SPEC_MISMATCH','Only the frozen N14-03 policy is authorized; no tuning after results.');return true;}
export function matchedView(index){
  // Deliberately omit all contextual metadata; identifiers never enter scoring.
  return index.windows.map(w=>({id:w.id,unit_id:w.unit_id,text:w.anchor.text,text_sha256:sha256(Buffer.from(w.anchor.text))}));
}
export function validateMatchedInputs(spec,index,manifest,view,questions){
  validateMatchedSpec(spec);
  if(manifest.index_sha256!==spec.source_index_sha256||sha256(Buffer.from(stableJSON(index)+'\n'))!==manifest.index_sha256||manifest.vectors_sha256!==spec.source_vectors_sha256||manifest.packet_sha256!==spec.evidence_packet_sha256||index.windows.length!==34||new Set(view.map(v=>v.unit_id)).size!==33||hashJSON(view)!==hashJSON(matchedView(index)))fail('MATCHED_INPUT_MISMATCH','Original index or shared text representation changed.');
  if(questions.length!==40||questions.map(q=>q.id).join()!==spec.queries.ids.join()||questions.some(q=>typeof q.text!=='string'||!q.text.trim()))fail('MATCHED_QUERY_MISMATCH','All40seen questions in frozen order required.');
  return true;
}
export function matchedRank(view,vectors,query,{mode,k=5,vector=null}={}){
  if(!['lexical','semantic'].includes(mode)||!Number.isInteger(k)||k<1||k>33||vectors.length!==view.length*384*4)fail('MATCHED_RANK_INVALID','Invalid matched ranking settings or matrix.');
  if(!validQuery(query))return {status:'blocked_untrusted_query',candidates:[]};
  if(mode==='semantic')validateVector(vector??[]);
  const q=terms(query),ranked=view.map((w,row)=>{
    let score=0;
    if(mode==='lexical'){const content=new Set(terms(w.text));score=q.filter(t=>content.has(t)).length;}
    else{const v=vectorAt(vectors,row);for(let d=0;d<384;d++)score+=vector[d]*v[d];}
    return {window_id:w.id,unit_id:w.unit_id,score,positive_score:score>0};
  }).sort((a,b)=>b.score-a.score||a.window_id.localeCompare(b.window_id,'en'));
  const seen=new Set(),candidates=[];for(const r of ranked){if(seen.has(r.unit_id))continue;seen.add(r.unit_id);candidates.push(r);if(candidates.length===k)break;}
  return {status:'raw_diagnostic_candidates',similarity_is_not_entailment:true,candidates};
}
export function recallAt(expected,ranked,k){if(!expected.length)return null;return new Set(ranked.slice(0,k).filter(id=>expected.includes(id))).size/new Set(expected).size;}
export function matchedMetrics(rows){
  const positives=rows.filter(r=>r.expected_units.length),result={cases:rows.length,positive_cases:positives.length,unsupported_cases:rows.length-positives.length};
  for(const mode of ['lexical','semantic']){result[mode]={};for(const k of [3,5])result[mode]['recall@'+k]=positives.length?positives.reduce((n,r)=>n+recallAt(r.expected_units,r[mode].map(c=>typeof c==='string'?c:c.unit_id),k),0)/positives.length:null;}
  result.paired={};for(const k of [3,5]){const counts={semantic_wins:0,lexical_wins:0,ties:0};for(const r of positives){const l=recallAt(r.expected_units,r.lexical.map(c=>typeof c==='string'?c:c.unit_id),k),s=recallAt(r.expected_units,r.semantic.map(c=>typeof c==='string'?c:c.unit_id),k);counts[s>l?'semantic_wins':s<l?'lexical_wins':'ties']++;}result.paired['at'+k]=counts;}
  return result;
}
export function failureCases(rows){return rows.filter(r=>r.expected_units.length).map(r=>({id:r.id,expected_units:r.expected_units,lexical_missing_at5:r.expected_units.filter(id=>!r.lexical.slice(0,5).some(c=>c.unit_id===id)),semantic_missing_at5:r.expected_units.filter(id=>!r.semantic.slice(0,5).some(c=>c.unit_id===id)),lexical_zero_overlap_at5:r.lexical.filter(c=>c.score===0).length})).filter(r=>r.lexical_missing_at5.length||r.semantic_missing_at5.length);}
