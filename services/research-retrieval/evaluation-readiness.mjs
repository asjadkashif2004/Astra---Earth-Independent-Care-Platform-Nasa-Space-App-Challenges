import { join } from 'node:path';
import { loadEvidence,spanRecord,hashJSON,sha256,readBounded,POLICY } from './contract.mjs';

export const VERSION='astra.n14.prospective.v1';
export const PINS=Object.freeze({
  'services/research-retrieval/retrieval.mjs':'9b3584dd9ec3fbb21602f5679cff6cebba9fae6cb2d4d68c758bfd9a10969d93',
  'services/research-retrieval/matched-experiment.mjs':'fd5c685640b1d4b7ad0a2eda5bd04f6b90dd3d8969b99a67f20cdead5efaaa2f',
  'services/research-retrieval/hybrid-diagnostic.mjs':'81597dd539f16a7d336d9bfc3d049f49df50c3df817b7e5347398b87e2146409',
  'services/research-retrieval/encoder.mjs':'93e28abaf637bb482d8f45a841743bb04fc761e6aa2a71bb6501403f65232d79',
  'services/research-retrieval/contract.mjs':'a7786ebd82aaae3a71f81f5648d49bb855e04c347883d166ff4afd9f77e233b3',
  'data/research/n14-01/index/index.json':'56f62593fa9a6a80d010be77bf0654c1225198d1d052704e9301a61f4f65d39c',
  'data/research/n14-01/index/manifest.json':'0223121f1aa333a4bc902b2fa1e4ba8928ef89e498d4d98f07b092f18f00213f',
  'data/research/n14-01/index/vectors.f32':'578e1b152cff43974293f7bd4369c72a747b60cff8e6dc81236f7676f521f665',
  'data/research/n14-04/spec.json':'2a7bfd4910fcdb79bfc8cd75f5a17bf9dc402e0a96a35f60ae77121e9daec64b'
});
const seal=(prefix,body)=>({...body,id:prefix+'-'+hashJSON(body)});
export function checkSeal(record,prefix){const {id,...body}=record;return id===prefix+'-'+hashJSON(body);}
export function binding(window){
  const a=window.anchor;
  return {evidence:{source_id:a.document_id,citation:{window_id:window.id,unit_id:window.unit_id,section_id:window.section_id,original_sha256:a.original_sha256,page_index:a.page_index,page_sha256:a.page_sha256,start:a.start,end:a.end,offset_unit:a.offset_unit,text_sha256:a.text_sha256,base_citations:structuredClone(a.base_citations)}},role:window.role,scope:{usage:'source_research_only',source_context:window.source_context,limitations:window.limits}};
}
export async function prepareReadiness(project){
  for(const [path,hash]of Object.entries(PINS))if(sha256(await readBounded(join(project,path),1000000))!==hash)throw Error('Frozen source mismatch: '+path);
  const source=await loadEvidence(project);
  const units=source.evidence.map(u=>({unit_id:u.id,key:u.key,source_context:u.source_context,limitations:u.limits,canonical_role:u.role,claim_readiness:u.claim_readiness,independent_review:'pending',windows:u.spans.map(s=>{const w=spanRecord(u,s);return {window_id:w.id,binding:binding(w),text:s.text,pdf_page_number:s.page_index+1,printed_page_label:'not established by this export'};})})).sort((a,b)=>a.unit_id.localeCompare(b.unit_id,'en'));
  const catalogue=seal('evidence',{schema_version:'astra.n14.review-evidence.v1',scope:'Only33curated units/34spans;generic source research,not clinical validation',sources:source.sources,exclusions:source.exclusions,units});
  const policies=seal('policies',{schema_version:'astra.n14.frozen-policies.v1',version:VERSION,source_sha256:{...PINS},evidence_id:catalogue.id,model:{revision:POLICY.revision,sha256:POLICY.weight_sha256,numerical_parity:'Unverified'},
    shared:{query_guard:'existing validQuery;unchanged',terms:'existing terms lowercasing/distinct tokens/stop list;unchanged',k:5,unit_deduplication:'highest ranked window per unit',window_tie:'window ID localeCompare(en)',no_policy_retuning:true},
    semantic_input:{implementation:'matchedRank(mode=semantic,k=5)',representation:'existing full anchor.text only',score:'cosine;no score cutoff;raw top5',encoder:'existing WordPiece/256tokens/masked mean/L2;unchanged'},
    policies:[
      {id:'rich_lexical',role:'baseline',implementation:'rank(mode=lexical,k=5,lexical_minimum=3)',score:'per distinct query term:3if in unit key with hyphens replaced plus source_context;else1if in source.title plus anchor.text;else0',minimum:3},
      {id:'lexical_weighted_rrf',role:'diagnostic_comparator',implementation:'existing hybridRank',lexical_weight:2,semantic_weight:1,constant:60,missing_contribution:0,tie:'lexical rank,semantic rank,unit ID localeCompare(en)',inputs:'rich_lexical top5 and existing semantic top5'},
      {id:'append_only_semantic_rescue',role:'conservative_candidate',implementation:'existing hybridRank',policy:'retain full lexical prefix;append unique semantic units in order to5;no replacement',inputs:'rich_lexical top5 and existing semantic top5'}],
    production_unchanged:true,no_execution_authorized:true});
  const protocol=seal('protocol',{schema_version:'astra.n14.prospective-protocol.v1',version:VERSION,policy_manifest_id:policies.id,evidence_manifest_id:catalogue.id,
    proposed_cohort:{supported:24,unsupported:8,ambiguous:8},owner_cohort_approval_required:true,
    primary_candidate:'append_only_semantic_rescue',comparator:'lexical_weighted_rrf',baseline:'rich_lexical',
    metrics:{positive_recall:'macro exact expected-unit recall on supported cases;deduplicate unit IDs;no oracle alternatives',ambiguous_and_unsupported:'separate,not positive recall denominators;report candidates and abstention expectations',k:[3,5],paired:'wins/losses/ties and exact lost/gained expected IDs'},
    gates:{zero_invalid_citations_roles:true,zero_per_question_expected_unit_loss_at5:true,recall5_not_lower:true,recall3_not_lower:true,strict_recall3_gain_before_improvement_claim:true,report_all_top3_losses:true,no_switching_primary_after_results:true,zero_incorrect_claim_accepts_in_separate_bound_controls:true},
    claim_boundary:'Retrieval is not entailment;N14-02 remains unchanged;unverified paraphrases abstain;no clinical validation',
    integrity:'Independent unexposed authors/reviewers;freeze question families,labels,code,cohort,protocol before execution;no retuning on exposed results',
    execution_authorized:false,clinical_validation:false});
  const labels={schema_version:'astra.n14.review-labels.v1',evaluation_id:VERSION,policy_manifest_id:policies.id,protocol_id:protocol.id,evidence_manifest_id:catalogue.id,revision:1,status:'draft',clinical_validation:false,participants:[],cases:[],oversight:{custodian_id:null,bundle_manifest_id:null,blinding_attested:false,leakage_checked:false,finalized_at:null,record_sha256:null,record_reference:null}};
  return {policies,protocol,catalogue,labels};
}
export const participantTemplate=()=>({id:null,name:null,roles:[],qualifications:null,affiliation:null,exposure:{old_questions:null,rankings_or_outputs:null},attestation:{status:'pending',signed_at:null,record_sha256:null,record_reference:null}});
const pendingReview=()=>({reviewer_id:null,decision:'pending',payload_sha256:null,citation_checked:false,role_checked:false,qualifiers_checked:false,original_pages_checked:false,scientific_relevance_only:true,rationale:null,signed_at:null,record_sha256:null,record_reference:null});
export const caseTemplate=()=>({id:null,family:null,author_id:null,authored_at:null,question:null,category:null,response_expectation:null,scope_notes:null,coverage_rationale:null,expected_evidence:[],reviews:[pendingReview()],adjudication:{status:'not_needed',adjudicator_id:null,decision:null,payload_sha256:null,citation_checked:false,role_checked:false,qualifiers_checked:false,original_pages_checked:false,resolution:null,signed_at:null,record_sha256:null,record_reference:null}});
export function casePayloadHash(c){const {reviews,adjudication,...payload}=c;return hashJSON(payload);}
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const text=v=>typeof v==='string'&&!!v.trim()&&v.length<=12000;
const hash=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function plain(value,seen=new Set(),depth=0,budget={n:0}){
  if(++budget.n>50000||depth>20)return false;
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return true;
  if(typeof value==='string')return value.length<=12000;
  if(typeof value!=='object'||seen.has(value)||!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype)return false;
  const ds=Object.values(Object.getOwnPropertyDescriptors(value));if(ds.length>256)return false;
  seen.add(value);const ok=ds.every(d=>!d.get&&!d.set&&plain(d.value,seen,depth+1,budget));seen.delete(value);return ok;
}
export function validateLabels(labels,{policies,protocol,catalogue,bundle_id=null},stage='draft'){
  const issues=[],add=(code,path)=>issues.push({code,path}),strict=stage==='reviewed';
  const out=()=>({schema_version:'astra.n14.readiness-result.v1',valid:issues.length===0,stage,issues,label_content_id:plain(labels)?'labels-'+hashJSON(labels):null,structural_review_complete:strict&&issues.length===0,signatures_authenticated:false,clinical_validation:false,evaluation_authorized:false,evaluation_executed:false,remaining_human_gates:['Authenticate actual identities,qualifications,independence and external sign-off records','Custodian verifies isolated distribution and overlap review;software does not prove blinding','Owner approves cohort,final content hashes and separate execution/resource authorization']});
  if(!['draft','reviewed'].includes(stage)){add('INVALID_STAGE','$');return out();}
  if(!plain(labels)||!exact(labels,Object.keys({schema_version:0,evaluation_id:0,policy_manifest_id:0,protocol_id:0,evidence_manifest_id:0,revision:0,status:0,clinical_validation:0,participants:0,cases:0,oversight:0}))){add('INVALID_SCHEMA','$');return out();}
  if(!checkSeal(policies,'policies')||!checkSeal(protocol,'protocol')||!checkSeal(catalogue,'evidence')||protocol.policy_manifest_id!==policies.id||policies.evidence_id!==catalogue.id||protocol.evidence_manifest_id!==catalogue.id){add('FROZEN_CONTEXT_MISMATCH','$');return out();}
  if(labels.schema_version!=='astra.n14.review-labels.v1'||labels.evaluation_id!==VERSION||labels.policy_manifest_id!==policies.id||labels.protocol_id!==protocol.id||labels.evidence_manifest_id!==catalogue.id||!Number.isSafeInteger(labels.revision)||labels.revision<1||!['draft','reviewed'].includes(labels.status)||labels.clinical_validation!==false)add('LABEL_METADATA_MISMATCH','$');
  if(!Array.isArray(labels.participants)||labels.participants.length>32||!Array.isArray(labels.cases)||labels.cases.length>80){add('BOUNDED_ARRAY_REQUIRED','$');return out();}
  const people=new Map(),names=new Set();
  for(const [i,p]of labels.participants.entries()){
    const path='participants['+i+']';
    if(!exact(p,Object.keys(participantTemplate()))||!text(p.id)||!/^person-[a-z0-9-]+$/.test(p.id)||!text(p.name)||!text(p.qualifications)||!text(p.affiliation)||!Array.isArray(p.roles)||!p.roles.length||new Set(p.roles).size!==p.roles.length||p.roles.some(r=>!['author','scientific_reviewer','adjudicator','custodian','leakage_reviewer'].includes(r))||!exact(p.exposure,['old_questions','rankings_or_outputs'])||Object.values(p.exposure).some(v=>v!==null&&typeof v!=='boolean')||!exact(p.attestation,['status','signed_at','record_sha256','record_reference'])){add('INVALID_PARTICIPANT',path);continue;}
    const n=p.name.trim().normalize('NFKC').toLowerCase();if(people.has(p.id)||names.has(n))add('DUPLICATE_PERSON',path);people.set(p.id,p);names.add(n);
    if(!['pending','recorded'].includes(p.attestation.status))add('INVALID_ATTESTATION',path);
    if(p.attestation.status==='recorded'&&(!instant(p.attestation.signed_at)||!hash(p.attestation.record_sha256)||!text(p.attestation.record_reference)))add('INVALID_ATTESTATION_RECORD',path);
    if(strict&&p.attestation.status!=='recorded')add('ATTESTATION_PENDING',path);
    if(p.roles.some(r=>['author','scientific_reviewer','adjudicator'].includes(r))){
      if(p.roles.some(r=>['custodian','leakage_reviewer'].includes(r)))add('BLIND_ROLE_CONFLICT',path);
      if(strict&&(p.exposure.old_questions!==false||p.exposure.rankings_or_outputs!==false))add('EXPOSED_OR_UNKNOWN_PARTICIPANT',path);
    }
  }
  const hasRole=(id,role)=>people.get(id)?.roles.includes(role);
  const bindings=new Map(catalogue.units.flatMap(u=>u.windows.map(w=>[w.window_id,w.binding]))),ids=new Set(),counts={supported:0,unsupported:0,ambiguous:0};
  for(const [i,c]of labels.cases.entries()){
    const path='cases['+i+']';
    if(!exact(c,Object.keys(caseTemplate()))||!text(c.id)||!/^q-[a-z0-9-]+$/.test(c.id)||!text(c.family)||!instant(c.authored_at)||!text(c.question)||!text(c.scope_notes)||!text(c.coverage_rationale)||!Object.hasOwn(counts,c.category)||!Array.isArray(c.expected_evidence)||c.expected_evidence.length>34||!Array.isArray(c.reviews)||c.reviews.length>16){add('INVALID_CASE',path);continue;}
    if(ids.has(c.id))add('DUPLICATE_CASE',path);ids.add(c.id);counts[c.category]++;
    if(!hasRole(c.author_id,'author'))add('AUTHOR_REQUIRED',path);
    const response={supported:'research_evidence_only',unsupported:'abstain',ambiguous:'abstain_or_state_limitations'};
    if(c.response_expectation!==response[c.category])add('RESPONSE_SCOPE_MISMATCH',path);
    if(c.category==='supported'&&!c.expected_evidence.length||c.category==='unsupported'&&c.expected_evidence.length)add('EVIDENCE_CATEGORY_MISMATCH',path);
    const seen=new Set();
    for(const [j,ref]of c.expected_evidence.entries()){
      const rp=path+'.expected_evidence['+j+']',id=ref?.binding?.evidence?.citation?.window_id;
      if(!exact(ref,['binding','relevance_rationale','required_qualifiers','original_page_checked'])||!bindings.has(id)||hashJSON(ref.binding)!==hashJSON(bindings.get(id))||seen.has(id)){add('CITATION_ROLE_SCOPE_MISMATCH',rp);continue;}
      seen.add(id);
      if(!text(ref.relevance_rationale)||!Array.isArray(ref.required_qualifiers)||!ref.required_qualifiers.length||ref.required_qualifiers.some(q=>!text(q))||typeof ref.original_page_checked!=='boolean')add('QUALIFIER_REVIEW_REQUIRED',rp);
      if(strict&&!ref.original_page_checked)add('ORIGINAL_PAGE_NOT_CHECKED',rp);
    }
    const reviewers=new Set();let objections=false,approved=0;
    for(const [j,review]of c.reviews.entries()){
      const rp=path+'.reviews['+j+']';
      if(!exact(review,Object.keys(pendingReview()))||!['pending','approve','request_changes','exclude'].includes(review.decision)||typeof review.citation_checked!=='boolean'||typeof review.role_checked!=='boolean'||typeof review.qualifiers_checked!=='boolean'||typeof review.original_pages_checked!=='boolean'||review.scientific_relevance_only!==true){add('INVALID_REVIEW',rp);continue;}
      if(!hasRole(review.reviewer_id,'scientific_reviewer')||review.reviewer_id===c.author_id||reviewers.has(review.reviewer_id))add('INDEPENDENT_REVIEWER_REQUIRED',rp);reviewers.add(review.reviewer_id);
      if(review.decision!=='pending'){
        if(review.payload_sha256!==casePayloadHash(c))add('STALE_REVIEW',rp);
        if(!text(review.rationale)||!instant(review.signed_at)||!hash(review.record_sha256)||!text(review.record_reference))add('REVIEW_RECORD_REQUIRED',rp);
        if(instant(review.signed_at)&&review.signed_at<c.authored_at)add('REVIEW_PRECEDES_AUTHORING',rp);
      }
      if(review.decision==='approve'){
        approved++;if(!review.citation_checked||!review.role_checked||!review.qualifiers_checked||!review.original_pages_checked)add('REVIEW_CHECKS_INCOMPLETE',rp);
      }else if(review.decision!=='pending')objections=true;
      if(strict&&review.decision==='pending')add('REVIEW_PENDING',rp);
    }
    const a=c.adjudication;
    if(!exact(a,Object.keys(caseTemplate().adjudication))||!['not_needed','pending','resolved'].includes(a.status)||['citation_checked','role_checked','qualifiers_checked','original_pages_checked'].some(k=>typeof a[k]!=='boolean'))add('INVALID_ADJUDICATION',path);
    else if(a.status==='resolved'){
      if(!hasRole(a.adjudicator_id,'adjudicator')||a.adjudicator_id===c.author_id||reviewers.has(a.adjudicator_id))add('INDEPENDENT_ADJUDICATOR_REQUIRED',path);
      if(a.payload_sha256!==casePayloadHash(c)||a.decision!=='approve'||a.citation_checked!==true||a.role_checked!==true||a.qualifiers_checked!==true||a.original_pages_checked!==true||!text(a.resolution)||!instant(a.signed_at)||!hash(a.record_sha256)||!text(a.record_reference))add('ADJUDICATION_RECORD_INVALID',path);
    }
    if(strict&&objections&&a?.status!=='resolved')add('UNRESOLVED_DISAGREEMENT',path);
    if(strict&&!approved&&!(objections&&a?.status==='resolved'))add('SCIENTIFIC_APPROVAL_PENDING',path);
    if(strict&&a?.status==='pending')add('ADJUDICATION_PENDING',path);
  }
  const o=labels.oversight;
  if(!exact(o,['custodian_id','bundle_manifest_id','blinding_attested','leakage_checked','finalized_at','record_sha256','record_reference'])||typeof o.blinding_attested!=='boolean'||typeof o.leakage_checked!=='boolean')add('INVALID_OVERSIGHT','oversight');
  else if(strict&&(!hasRole(o.custodian_id,'custodian')||!/^bundle-[0-9a-f]{64}$/.test(o.bundle_manifest_id??'')||!o.blinding_attested||!o.leakage_checked||!instant(o.finalized_at)||!hash(o.record_sha256)||!text(o.record_reference)))add('HUMAN_OVERSIGHT_PENDING','oversight');
  if(strict&&(!bundle_id||o?.bundle_manifest_id!==bundle_id))add('VERIFIED_DISTRIBUTION_REQUIRED','oversight');
  if(strict&&instant(o?.finalized_at)){
    const dates=[...people.values()].map(p=>p.attestation.signed_at).concat(labels.cases.flatMap(c=>[c.authored_at,...(c.reviews??[]).map(r=>r?.signed_at),c.adjudication?.signed_at])).filter(instant);
    if(dates.some(date=>date>o.finalized_at))add('FINALIZATION_PRECEDES_RECORDED_WORK','oversight');
  }
  if(strict&&(labels.status!=='reviewed'||hashJSON(counts)!==hashJSON(protocol.proposed_cohort)))add('FROZEN_COHORT_NOT_READY','$');
  return out();
}
