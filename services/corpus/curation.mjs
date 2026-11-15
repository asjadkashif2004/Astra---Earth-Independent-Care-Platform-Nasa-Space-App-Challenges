import { fail,sha256,stableJSON,ORIGINAL_SHA } from './sources.mjs';
import { citationFor,validateCitation } from './corpus.mjs';

export const BASE_CORPUS_SHA='9bb1fb5fc112716c16fdb8e3e6a3c5a968b01db5e11b2f5e694f54af5d16b6b7';
export const CURATION_VERSION='astra.scientific-curation.v1';
export const ROLES=['formal_requirement','scientific_finding','recommendation','caveat','background'];
const hashText=t=>sha256(Buffer.from(t,'utf8'));
const key=(prefix,v)=>prefix+'-'+hashText(stableJSON(v));
const present=(s,name)=>{if(typeof s!=='string'||!s.trim()||s.length>6000)fail('INVALID_CURATION',`Missing or invalid ${name}.`);};
export function documentFor(corpus,id){const d=corpus.documents.find(d=>d.metadata.id===id);if(!d||d.original_sha256!==ORIGINAL_SHA[id])fail('SOURCE_MISMATCH','Only the two pinned publication originals may be curated.');return d;}
function pageFor(d,n){const p=d.pages.find(p=>p.page_index===n);if(!p||hashText(p.text)!==p.sha256)fail('PAGE_MISMATCH','Original-bound page unavailable or changed.');return p;}
function locate(text,quote,from=0){present(quote,'exact source selector');const start=text.indexOf(quote,from);if(start<0)fail('MISSING_EVIDENCE','Exact source selector not found.');if(text.indexOf(quote,start+1)>=0)fail('AMBIGUOUS_EVIDENCE','Selector has multiple locations;do not guess.');return start;}
function spanAt(d,page,start,end){
  const p=pageFor(d,page);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>p.text.length)fail('INVALID_SPAN','Invalid exact source text range.');
  const text=p.text.slice(start,end),base_citations=[];
  for(const c of d.chunks)if(c.page_index===page&&c.start<end&&c.end>start){const citation=citationFor(d,c);validateCitation({documents:[d]},citation);base_citations.push(citation);}
  if(!base_citations.length)fail('INVALID_SPAN','No frozen chunk supports this range.');
  return {document_id:d.metadata.id,original_sha256:d.original_sha256,page_index:page,page_sha256:p.sha256,start,end,offset_unit:'UTF-16 code units',text,text_sha256:hashText(text),base_citations,base_section_labels_authoritative:false};
}
export function selectSpan(corpus,documentID,selector){
  const d=documentFor(corpus,documentID),p=pageFor(d,selector?.page);
  if(selector.quote){const start=locate(p.text,selector.quote);return spanAt(d,selector.page,start,start+selector.quote.length);}
  const start=locate(p.text,selector.start);let end;
  if(selector.end_before){present(selector.end_before,'end boundary');end=p.text.indexOf(selector.end_before,start+selector.start.length);}
  else {present(selector.end,'inclusive end marker');const i=p.text.indexOf(selector.end,start+selector.start.length);end=i<0?-1:i+selector.end.length;}
  if(end<=start||end-start>6000)fail('MISSING_EVIDENCE','Missing or unbounded following end marker.');
  return spanAt(d,selector.page,start,end);
}
function pendingReview(review){if(review?.status!=='pending'||review.reviewer!==null||review.approval_evidence!==null)fail('REVIEW_STATUS','No independent human/medical approval is evidenced by this task.');}
function inside(span,section){return section.document_id===span.document_id&&section.spans.some(s=>s.page_index===span.page_index&&s.start<=span.start&&s.end>=span.end);}
function counts(values,field){const out={};for(const v of values)out[v[field]]=(out[v[field]]??0)+1;return out;}
export function buildCuration(corpus,plan,evidencePlan,expectationPlan){
  if(plan?.schema_version!=='astra.section-curation-plan.v1'||plan.task!=='N13-02'||plan.governance!=='DE-N07-N13-01-N13-02'||plan.base_corpus_sha256!==BASE_CORPUS_SHA||!Array.isArray(plan.sections)||!plan.sections.length||plan.sections.length>32)fail('INVALID_CURATION','Approved bounded section plan and exact frozen corpus required.');
  present(plan.review_method,'engineering review method');pendingReview(plan.independent_human_review);
  if(evidencePlan?.schema_version!=='astra.evidence-unit-plan.v1'||!Array.isArray(evidencePlan.units)||!evidencePlan.units.length||evidencePlan.units.length>64)fail('INVALID_CURATION','Bounded reviewed evidence units required.');
  const sections=[],seen=new Set();
  for(const s of [...plan.sections].sort((a,b)=>a.key.localeCompare(b.key,'en'))){
    present(s.key,'section key');present(s.title,'section title');present(s.context,'section context');
    if(seen.has(s.key))fail('INVALID_CURATION','Duplicate section key.');seen.add(s.key);
    const d=documentFor(corpus,s.document_id),a=selectSpan(corpus,s.document_id,s.start),b=selectSpan(corpus,s.document_id,s.end);
    if(b.page_index<a.page_index||b.page_index-a.page_index>20||b.page_index===a.page_index&&b.start<=a.start)fail('INVALID_CURATION','Reversed,overlapping or unbounded section endpoints.');
    const spans=[];
    for(let n=a.page_index;n<=b.page_index;n++){const p=pageFor(d,n),start=n===a.page_index?a.start:0,end=n===b.page_index?b.start:p.text.length;if(end>start)spans.push(spanAt(d,n,start,end));}
    for(const prior of sections)for(const x of spans)if(prior.document_id===s.document_id&&prior.spans.some(y=>y.page_index===x.page_index&&y.start<x.end&&y.end>x.start))fail('AMBIGUOUS_SECTION','Reviewed leaf section boundaries overlap.');
    sections.push({id:key('curated-section',[s.document_id,d.original_sha256,a.page_index,a.start,b.page_index,b.start]),key:s.key,document_id:s.document_id,title:s.title,title_status:'curator_normalized_source_label',context:s.context,heading_anchor:a,end_boundary:b,spans,review_status:'engineering_source_text_reviewed',medical_approval:false});
  }
  const units=[],unitKeys=new Set();
  for(const u of [...evidencePlan.units].sort((a,b)=>a.key.localeCompare(b.key,'en'))){
    if(unitKeys.has(u.key)||!ROLES.includes(u.role)||!Array.isArray(u.parts)||!u.parts.length||u.parts.length>3)fail('INVALID_ROLE','Duplicate/unknown role or missing evidence parts.');unitKeys.add(u.key);
    present(u.key,'unit key');present(u.limits,'source-specific claim limits');present(u.source_context,'source context');
    const section=sections.find(s=>s.key===u.section);if(!section)fail('MISSING_EVIDENCE','Unreviewed section cannot support an expectation.');
    const spans=u.parts.map(p=>selectSpan(corpus,section.document_id,p));
    if(spans.some(p=>!inside(p,section)))fail('WRONG_SECTION','Evidence lies outside its reviewed source section.');
    const text=spans.map(p=>p.text).join('\n[PAGE/SPAN BREAK]\n');
    if(u.role==='formal_requirement'&&(section.document_id!=='nasa-std-3001-v2-f'||!/^\[V2\s*\d+\]/.test(text.trimStart())||!/\bshall\b/.test(text)||/\[Rationale:/.test(text)))fail('INVALID_ROLE','Formal requirement must be the standard shall statement,separate from rationale.');
    if(!['requirement','rationale','research_synthesis','research_agenda','table_context'].includes(u.content_part))fail('INVALID_ROLE','Explicit source content part required.');
    units.push({id:key('evidence-unit',[section.id,u.key,spans.map(p=>[p.page_index,p.start,p.end,p.text_sha256])]),key:u.key,section_id:section.id,document_id:section.document_id,role:u.role,content_part:u.content_part,claim_readiness:u.content_part==='table_context'?'location_only':'bounded_source_text',source_context:u.source_context,limits:u.limits,spans,not_individual_clinical_advice:true,review_status:'engineering_source_text_reviewed',independent_human_review:'pending'});
  }
  const corrections=[];
  for(const r of plan.rejected_heading_candidates??[]){
    const d=documentFor(corpus,r.document_id),candidates=d.sections.filter(s=>s.page_index===r.page&&s.title.startsWith(r.prefix));
    if(candidates.length!==1)fail('AMBIGUOUS_EVIDENCE','Rejected candidate identity must match the frozen corpus exactly.');
    const old=candidates[0],anchor=spanAt(d,r.page,old.offset,old.offset+old.title.length),target=sections.filter(s=>inside(anchor,s));
    if(target.length!==1)fail('WRONG_SECTION','Rejected heading must have an unambiguous reviewed replacement.');
    corrections.push({prior_section_id:old.id,prior_title:old.title,anchor,action:'reject_false_heading',reason:r.reason,replacement_section_id:target[0].id,review_status:'engineering_source_text_reviewed'});
  }
  const mappings=[];
  for(const s of sections){const d=documentFor(corpus,s.document_id);for(const p of s.spans)for(const c of d.chunks)if(c.page_index===p.page_index&&c.start<p.end&&c.end>p.start)mappings.push({chunk_id:c.id,document_id:s.document_id,page_index:p.page_index,start:Math.max(c.start,p.start),end:Math.min(c.end,p.end),curated_section_id:s.id,prior_section_id:c.section_id,applies_only_to_overlap:true,known_false_heading_repaired:corrections.some(r=>r.prior_section_id===c.section_id)});}
  const ambiguities=(plan.ambiguities??[]).map(a=>{
    present(a.explanation,'ambiguity explanation');const d=documentFor(corpus,a.document_id),p=pageFor(d,a.page),positions=[];
    if(a.quote){let at=0;while((at=p.text.indexOf(a.quote,at))>=0){positions.push(at);at++;if(positions.length>100)break;}}
    return {...a,page_sha256:p.sha256,selector_matches:positions.length,anchor_status:positions.length===1?'location_known_semantics_unverified':'ambiguous_or_unresolved',accepted_for_claims:false};
  });
  const expectations=validateExpectations(expectationPlan,units);
  return {schema_version:CURATION_VERSION,task:'N13-02',base_corpus_sha256:BASE_CORPUS_SHA,governance:plan.governance,reviewed_on:plan.reviewed_on,review_method:plan.review_method,independent_human_review:structuredClone(plan.independent_human_review),source_hashes:{...ORIGINAL_SHA},sections,units,corrections,mappings,ambiguities,expectations,unreviewed_policy:'No fallback to heuristic heading or healthy/clinical conclusion;unreviewed or ambiguous evidence remains unknown.',summary:{sections:sections.length,evidence_units:units.length,roles:counts(units,'role'),expectations:expectations.length,categories:counts(expectations,'category'),rejected_false_headings:corrections.length,span_mappings:mappings.length,known_false_heading_mapping_repairs:mappings.filter(m=>m.known_false_heading_repaired).length,independent_medical_approval:false}};
}
export function validateExpectations(plan,units){
  if(plan?.schema_version!=='astra.evidence-expectations-plan.v1'||plan.review_status!=='engineering_reviewed_independent_approval_pending'||!Array.isArray(plan.expectations)||plan.expectations.length<30||plan.expectations.length>50)fail('INVALID_EXPECTATIONS','30–50reviewable expectations with explicit pending independent approval required.');
  const seen=new Set(),result=[];
  for(const q of [...plan.expectations].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
    present(q.id,'expectation ID');present(q.question,'question');present(q.boundary,'answer boundary');
    if(seen.has(q.id)||!['supported','partially_supported','unsupported'].includes(q.category))fail('INVALID_EXPECTATIONS','Duplicate or unknown expectation.');seen.add(q.id);
    if(!Array.isArray(q.evidence_units)||!Array.isArray(q.supported_claims)||!Array.isArray(q.unsupported_claims))fail('INVALID_EXPECTATIONS','Explicit support/unsupported claim inventories required.');
    const evidence=q.evidence_units.map(id=>{const u=units.find(u=>u.key===id);if(!u)fail('MISSING_EVIDENCE','Supported expectation references missing/ambiguous evidence.');return u;});
    if(q.category!=='unsupported'&&evidence.length&&evidence.every(u=>u.claim_readiness==='location_only'))fail('INVALID_EXPECTATIONS','A table location alone cannot support a scientific/quantitative claim.');
    if(q.category==='supported'&&(!evidence.length||!q.supported_claims.length||q.unsupported_claims.length||q.expected_behavior!=='source_context_only'))fail('INVALID_EXPECTATIONS','Supported scope requires actual source evidence and bounded claims.');
    if(q.category==='partially_supported'&&(!evidence.length||!q.supported_claims.length||!q.unsupported_claims.length||q.expected_behavior!=='context_then_abstain_unsupported_part'))fail('INVALID_EXPECTATIONS','Partial support must explicitly abstain on unsupported clauses.');
    if(q.category==='unsupported'&&(q.supported_claims.length||q.evidence_units.length||!q.unsupported_claims.length||!['abstain','refuse_unsafe_request'].includes(q.expected_behavior)))fail('INVALID_EXPECTATIONS','Unsupported questions cannot manufacture supporting citations.');
    if(q.category!=='supported')present(q.abstention_reason,'abstention reason');
    for(const s of [...q.supported_claims,...q.unsupported_claims])present(s,'claim scope');
    result.push({...structuredClone(q),evidence_unit_ids:evidence.map(u=>u.id),review_status:'engineering_reviewed_independent_approval_pending',medical_approval:false});
  }
  if(new Set(result.map(q=>q.category)).size!==3)fail('INVALID_EXPECTATIONS','Support,partial support and unsupported categories must all be represented.');
  return result;
}
export function resolveReviewedLocation(curation,{document_id,page_index,start,end}){
  const query={document_id,page_index,start,end};
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start)return {status:'ambiguous_or_unreviewed',section_id:null,role:'unknown'};
  const sections=curation.sections.filter(s=>inside(query,s));
  if(sections.length!==1)return {status:'ambiguous_or_unreviewed',section_id:null,role:'unknown'};
  const units=curation.units.filter(u=>u.document_id===document_id&&u.spans.some(s=>s.page_index===page_index&&s.start<=start&&s.end>=end));
  const roles=[...new Set(units.map(u=>u.role))];
  return {status:roles.length===1?'reviewed_evidence':'section_known_content_unreviewed',section_id:sections[0].id,role:roles.length===1?roles[0]:'unknown',medical_approval:false};
}
