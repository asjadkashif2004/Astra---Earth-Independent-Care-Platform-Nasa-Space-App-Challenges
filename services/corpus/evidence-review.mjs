import { fail,sha256,stableJSON,ORIGINAL_SHA } from './sources.mjs';
import { validateCitation } from './corpus.mjs';
import { selectSpan,BASE_CORPUS_SHA } from './curation.mjs';

export const CURATED_SHA='ed88677753bbef136ecdc35bb6b13d7bc9ce933727989f4c261f2200bf84ff9f';
export const REVIEW_VERSION='astra.evidence-closure-review.v1';
const text=(s,label)=>{if(typeof s!=='string'||!s.trim()||s.length>6000)fail('INVALID_REVIEW',`Missing or invalid ${label}.`);};
const hash=v=>sha256(Buffer.from(stableJSON(v)));
const exclusionIDs=['numeric-tables','individual-diagnosis','personal-prediction','treatment-orders','mission-measurement-compliance','current-consensus','unreviewed-content','missing-as-healthy','authorization-override'];
const tableIDs=['hrp-sleep-table','hrp-performance-table','std-illuminance-table','std-circadian-table'];
const sourceInfo=d=>({document_id:d.metadata.id,title:d.metadata.title,authors:d.metadata.authors,publisher:d.metadata.publisher,version:d.metadata.version,published_on:d.metadata.published_on,publication_date_note:d.metadata.publication_date_note,canonical_url:d.metadata.canonical_url,original_file:d.metadata.file,original_sha256:d.original_sha256,attribution:d.metadata.rights.attribution,rights_note:d.metadata.rights.restrictions});
function pending(r){if(r?.status!=='pending'||r.reviewer!==null||r.approval_evidence!==null)fail('REVIEW_APPROVAL_UNSUPPORTED','No independent approval was supplied for this task.');}
function validateUnit(corpus,u){
  if(!Array.isArray(u.spans)||!u.spans.length)fail('CITATION_MISMATCH','Missing evidence excerpt.');
  for(const p of u.spans){
    const d=corpus.documents.find(d=>d.metadata.id===p.document_id),page=d?.pages.find(x=>x.page_index===p.page_index);
    if(!d||p.original_sha256!==ORIGINAL_SHA[p.document_id]||!page||page.sha256!==p.page_sha256||sha256(Buffer.from(p.text))!==p.text_sha256||page.text.slice(p.start,p.end)!==p.text)fail('CITATION_MISMATCH','Evidence quote/source/page/range/hash differs.');
    if(!p.base_citations?.length)fail('CITATION_MISMATCH','Missing original chunk citations.');
    for(const c of p.base_citations)validateCitation(corpus,c);
  }
}
export function buildEvidenceReview(corpus,curation,plan){
  if(sha256(Buffer.from(stableJSON(corpus)+'\n'))!==BASE_CORPUS_SHA||sha256(Buffer.from(stableJSON(curation)+'\n'))!==CURATED_SHA)fail('REVIEW_SOURCE_MISMATCH','Only the frozen N13-01/02 records may be reviewed;no silent input amendment.');
  if(plan?.schema_version!=='astra.closure-review-plan.v1'||plan.task!=='N13-03'||plan.governance!=='DE-N07-N13-01-N13-03'||plan.scope_acceptance!=='pending_owner_closure_decision')fail('INVALID_REVIEW','Bounded N13-03 review plan and pending scope acceptance required.');
  pending(plan.independent_human_review);text(plan.review_method,'technical review method');text(plan.default_policy,'default exclusion policy');
  if(!Array.isArray(plan.cases)||plan.cases.length!==40||curation.expectations.length!==40)fail('INVALID_REVIEW','Review exactly the40existing cases;no corpus/expectation expansion.');
  const areaKeys=new Set(),allUnits=new Set(),areas=[];
  if(!Array.isArray(plan.areas)||!plan.areas.length||plan.areas.length>12)fail('COVERAGE_MISMATCH','Bounded coverage areas required.');
  for(const area of [...plan.areas].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
    if(areaKeys.has(area.id)||area.decision!=='bounded_context_for_independent_review'||!Array.isArray(area.units)||!area.units.length||!Array.isArray(area.topics)||!area.topics.length||area.topics.some(t=>!['sleep','circadian_disruption','fatigue','workload'].includes(t)))fail('COVERAGE_MISMATCH','Duplicate,unknown or overclaimed coverage.');
    text(area.scope,'coverage boundary');areaKeys.add(area.id);
    for(const id of area.units){if(!curation.units.some(u=>u.key===id))fail('COVERAGE_MISMATCH','Unreviewed evidence cannot be admitted.');allUnits.add(id);}
    areas.push({...structuredClone(area),owner_acceptance:'pending',runtime_claim_admission:false});
  }
  if(allUnits.size!==curation.units.length)fail('COVERAGE_MISMATCH','Every existing evidence unit needs a coverage/exclusion decision.');
  if(!Array.isArray(plan.exclusions)||plan.exclusions.length!==exclusionIDs.length||new Set(plan.exclusions.map(x=>x.id)).size!==exclusionIDs.length||plan.exclusions.some(x=>!exclusionIDs.includes(x.id)||x.decision!=='exclude_from_claims'))fail('EXCLUSION_MISSING','All mandatory exclusions must remain explicit.');
  for(const x of plan.exclusions){text(x.scope,'excluded scope');text(x.reason,'exclusion reason');}
  if(plan.textual_numeric_qualifier?.expectation_id!=='S20')fail('COVERAGE_MISMATCH','Retain the source-text facility-duration qualifier,not a new table-derived clinical rule.');
  const sourceIndex=corpus.documents.map(sourceInfo);
  const evidence=curation.units.map(u=>{validateUnit(corpus,u);return {...structuredClone(u),source_attribution:sourceIndex.find(d=>d.document_id===u.document_id),claim_approval:'pending_independent_review'};});
  const tables=[];
  if(!Array.isArray(plan.tables)||plan.tables.length!==4||new Set(plan.tables.map(t=>t.id)).size!==4)fail('TABLE_POLICY','Inspect only the four relevant references.');
  for(const t of [...plan.tables].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
    if(!tableIDs.includes(t.id)||t.numeric_claims!=='excluded'||!Array.isArray(t.context_pages)||!t.context_pages.includes(t.page)||t.context_pages.length>2)fail('TABLE_POLICY','No numerical table admission or unrelated expansion.');
    text(t.interpretation,'table interpretation limits');
    const title=selectSpan(corpus,t.document_id,{page:t.page,quote:t.title}),block=selectSpan(corpus,t.document_id,{page:t.page,start:t.title,end_before:t.end_before});
    const d=corpus.documents.find(d=>d.metadata.id===t.document_id);
    const context=t.context_pages.map(n=>{const p=d.pages.find(p=>p.page_index===n);if(!p)fail('TABLE_POLICY','Unavailable context page.');return {page_index:n,page_sha256:p.sha256};});
    tables.push({...structuredClone(t),title_anchor:title,inspection_block:block,context_page_hashes:context,location_status:'exact_title_and_page_verified',numerical_interpretation_status:'not_established_in_this_text_only_pass',numerical_claims_admitted:false,clinical_inference_admitted:false,source_attribution:sourceIndex.find(d=>d.document_id===t.document_id),inspection_method:'Preserved original-hash-bound text only;no new parse,OCR,rendering or download.'});
  }
  const prior=curation.ambiguities.find(a=>a.id==='performance-table'),replacement=tables.find(t=>t.id==='hrp-performance-table');
  if(prior?.quote!=='20'||prior.page!==20||replacement.title_anchor.page_index!==20)fail('CORRECTION_MISMATCH','The locator correction must match the actual prior error.');
  const corrections=[{id:'performance-table-exact-title-locator',prior_curation_sha256:CURATED_SHA,prior_ambiguity_id:prior.id,prior_locator:prior.quote,prior_status:prior.anchor_status,action:'replace_review_locator_only',new_title_anchor:replacement.title_anchor,numerical_claims_admitted:false,reason:'The old selector was a page-number string with ambiguous matches;the exact Table2title is unique. This improves location,not numerical interpretation.'}];
  const cases=[],seen=new Set();let links=0;
  for(const row of [...plan.cases].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
    const q=curation.expectations.find(q=>q.id===row.id);if(!q||seen.has(row.id)||row.category!==q.category)fail('CASE_MISMATCH','Case IDs/categories must match the existing40expectations exactly.');seen.add(row.id);
    text(row.note,'case-specific technical review note');if(!Array.isArray(row.areas)||!row.areas.length||row.areas.some(id=>!areaKeys.has(id)))fail('COVERAGE_MISMATCH','Every reviewed case needs valid topic coverage.');
    if(q.category==='supported'&&(!q.supported_claims.length||q.unsupported_claims.length||q.expected_behavior!=='source_context_only')||q.category==='partially_supported'&&(!q.supported_claims.length||!q.unsupported_claims.length||q.expected_behavior!=='context_then_abstain_unsupported_part')||q.category==='unsupported'&&(q.supported_claims.length||q.evidence_unit_ids.length||!['abstain','refuse_unsafe_request'].includes(q.expected_behavior)))fail('CASE_MISMATCH','Support/abstention scope must remain consistent.');
    const refs=q.evidence_unit_ids.map(id=>{const u=evidence.find(u=>u.id===id);if(!u)fail('CITATION_MISMATCH','Missing source evidence.');links++;return {unit_id:u.id,unit_key:u.key,role:u.role,source_context:u.source_context,limits:u.limits,document_id:u.document_id,pages:u.spans.map(p=>p.page_index)};});
    if(q.category!=='unsupported'&&!refs.length)fail('CITATION_MISMATCH','Supported context needs real citations.');
    if(q.category!=='supported')text(q.abstention_reason,'mandatory abstention reason');
    cases.push({id:q.id,category:q.category,question:q.question,supported_claims:structuredClone(q.supported_claims),unsupported_claims:structuredClone(q.unsupported_claims),expected_behavior:q.expected_behavior,abstention_reason:q.abstention_reason??null,boundary:q.boundary,source_case_sha256:hash(q),coverage_areas:[...row.areas].sort(),evidence_refs:refs,technical_review:{status:'complete',method:'AI-assisted source-text/attribution/scope consistency review',note:row.note,independent_medical_approval:false},independent_review:{status:'pending',reviewer:null,qualifications:null,reviewed_at:null,scientific_support_decision:null,medical_scope_boundary_decision:null,comments:null,approval_evidence:null}});
  }
  const categories={};for(const q of cases)categories[q.category]=(categories[q.category]??0)+1;
  const closure_gates=[
    {id:'source-integrity',status:'technically_verified',requirement:'Lawful local originals/version/rights/receipts and deterministic source/citation integrity;prior evidence retained,current pins checked.'},
    {id:'evidence-approval',status:'pending_independent_review',requirement:'Actual reviewer decisions/evidence for the30–50curated expectations,with medically appropriate scope and owner acceptance;technical checks are not approval.'},
    {id:'coverage-acceptance',status:'pending_owner_scope_decision',requirement:'Accept the bounded topic/source/section coverage and explicit exclusions for N13 closure,or separately authorize needed remediation;unreviewed content remains excluded.'},
    {id:'N07-prerequisite',status:'open_dependency',requirement:'Complete original N07 requirements or obtain a separately approved formal closure-level dependency decision. Existing N13-01/02/03 task continuations do not waive this gate.'},
    {id:'N13-closure',status:'not_ready',requirement:'Record legitimate module closure only after formal requirements and prerequisite decisions are satisfied;N13 stays In Progress.'},
    {id:'N14-authorization',status:'not_authorized',requirement:'N14 requires legitimate N13 closure and separate bounded implementation/resource approval;no semantic retrieval/embedding work here.'}
  ];
  return {schema_version:REVIEW_VERSION,task:'N13-03',governance:plan.governance,reviewed_on:plan.reviewed_on,review_method:plan.review_method,base_corpus_sha256:BASE_CORPUS_SHA,prior_curation_sha256:CURATED_SHA,source_hashes:{...ORIGINAL_SHA},sources:sourceIndex,coverage:{technical_matrix_status:'finalized_for_independent_review',owner_acceptance:'pending',areas,exclusions:[...structuredClone(plan.exclusions)].sort((a,b)=>a.id.localeCompare(b.id,'en')),textual_numeric_qualifier:structuredClone(plan.textual_numeric_qualifier),default_claim_policy:'exclude_unreviewed_ambiguous_or_individual_inference',runtime_claim_admission:false},tables,corrections,evidence,cases,closure_gates,summary:{technically_reviewed_expectations:cases.length,categories,category_changes:0,coverage_areas:areas.length,exclusions:plan.exclusions.length,inspected_table_references:tables.length,additive_locator_corrections:corrections.length,expectation_evidence_links:links,unique_evidence_units:evidence.length,unique_evidence_spans:evidence.reduce((n,u)=>n+u.spans.length,0),unit_base_citation_references:evidence.reduce((n,u)=>n+u.spans.reduce((m,p)=>m+p.base_citations.length,0),0),independently_approved_expectations:0,N13_status:'In Progress',N14_eligible:false,network_requests:0,new_pdf_extractions:0}};
}
