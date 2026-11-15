import { authorize,check,hash,VERSION } from './catalog.mjs';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const text=(v,n=2000)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const axes=['quotation','scientific_relevance','entailment','numerical_support','applicability'];
/** Structural intake only. No supplied identity/signature is authenticated here. */
export function validateReviewRecord(record,{catalog,questions},cap){
 authorize(cap,'review');check(exact(record,['schema_version','id','catalog_sha256','question_bank_sha256','reviewer','reviewer_role','reviewed_at','external_attestation','owner_approval','cases']),'REVIEW_SCHEMA');
 check(record.schema_version==='astra.n13.review-record.v1'&&text(record.id,96)&&/^[A-Za-z0-9_.:-]+$/.test(record.id)&&record.catalog_sha256===hash(catalog)&&record.question_bank_sha256===hash(questions)&&catalog.schema_version===VERSION,'REVIEW_VERSION');
 check(text(record.reviewer,160)&&['scientific_reviewer','clinical_scope_reviewer','adjudicator'].includes(record.reviewer_role)&&utc(record.reviewed_at)&&Date.parse(record.reviewed_at)<=Date.now(),'REVIEW_IDENTITY');
 check(exact(record.external_attestation,['reference','sha256'])&&text(record.external_attestation.reference,500)&&/^[a-f0-9]{64}$/.test(record.external_attestation.sha256),'REVIEW_ATTESTATION');
 check(record.owner_approval===null||exact(record.owner_approval,['reference','sha256'])&&text(record.owner_approval.reference,500)&&/^[a-f0-9]{64}$/.test(record.owner_approval.sha256),'OWNER_APPROVAL');
 check(Array.isArray(record.cases)&&record.cases.length>=1&&record.cases.length<=40&&new Set(record.cases.map(c=>c.question_id)).size===record.cases.length,'REVIEW_CASES');
 for(const row of record.cases){const q=questions.cases.find(q=>q.id===row.question_id);check(exact(row,['question_id','source_case_sha256','judgments','reasons','decision'])&&q&&row.source_case_sha256===q.source_case_sha256,'REVIEW_CASE_BINDING');check(exact(row.judgments,axes)&&exact(row.reasons,axes)&&axes.every(k=>['ACCEPT','REJECT','UNCERTAIN'].includes(row.judgments[k])&&text(row.reasons[k]))&&['ACCEPT','REJECT','UNCERTAIN'].includes(row.decision),'REVIEW_JUDGMENT');if(row.decision==='ACCEPT'){if(q.category==='supported')check(axes.every(k=>row.judgments[k]==='ACCEPT'),'REVIEW_CONTRADICTION');else check(['context_then_abstain_unsupported_part','abstain','refuse_unsafe_request'].includes(q.expected_behavior)&&['REJECT','UNCERTAIN'].includes(row.judgments.entailment),'REVIEW_ABSTENTION_BOUNDARY');}}
 return {status:'STRUCTURALLY_VALID_UNAUTHENTICATED',record_sha256:hash(record),reviewer_authenticated:false,scientific_approval:false,owner_approval_verified:false,reviewed_cases:record.cases.length,record:structuredClone(record)};
}
export function reconcileReviews(records,bundle,cap){
 authorize(cap,'review');check(Array.isArray(records)&&records.length<=16,'REVIEW_LIMIT');const ids=new Map(),rows=[];
 for(const r of records){const v=validateReviewRecord(r,bundle,cap);if(ids.has(r.id)){check(ids.get(r.id)===v.record_sha256,'REVIEW_ID_CONFLICT');continue;}ids.set(r.id,v.record_sha256);rows.push(v);}
 const cases=bundle.questions.cases.map(q=>{const decisions=rows.flatMap(r=>r.record.cases.filter(c=>c.question_id===q.id).map(c=>({record_id:r.record.id,reviewer:r.record.reviewer,decision:c.decision,judgments:c.judgments}))),disputed=axes.some(k=>new Set(decisions.map(d=>d.judgments[k])).size>1)||new Set(decisions.map(d=>d.decision)).size>1;return {id:q.id,state:disputed?'DISPUTED':decisions.length?'PENDING_AUTHENTICATION_AND_OWNER_ACCEPTANCE':'PENDING',submitted_decisions:decisions,independently_approved:false};});
 return {schema_version:'astra.n13.review-reconciliation.v1',records:rows.length,duplicate_identical_records:records.length-rows.length,cases,independently_approved_expectations:0,owner_scope_acceptance:'PENDING',software_may_activate_rules:false};
}
