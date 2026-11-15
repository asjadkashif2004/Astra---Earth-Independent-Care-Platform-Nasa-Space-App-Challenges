import { originalContext,hashObject,authorizeLocal } from './local-source.mjs';
import { fail,object,text,isHash,isInstant,sha256,stableJSON } from './validation.mjs';
const check=(ok,code)=>{if(!ok)fail(code,'N07 annotation/card rejected: '+code);};
const clone=structuredClone;
export function sourceLocation(context,locator){
  const {files,parsed}=originalContext(context);let literal;
  object(locator,['kind','field']);
  if(context.id==='physionet-bidmc-01-numerics'){
    check(locator.kind==='csv_header'&&locator.field==='header','UNSUPPORTED_LOCATION');literal=files.original.subarray(0,files.original.indexOf(10)).toString('utf8');
  }else{
    check(locator.kind==='json_string','UNSUPPORTED_LOCATION');
    const value=context.id==='nasa-osdr-osd-1'?({'/OSD-1/metadata/study title':parsed['OSD-1'].metadata['study title'],
      '/OSD-1/metadata/organism':parsed['OSD-1'].metadata.organism})[locator.field]:({'/title':parsed.title})[locator.field];
    check(typeof value==='string','UNSUPPORTED_LOCATION');literal=JSON.stringify(value);
  }
  const bytes=Buffer.from(literal),start=files.original.indexOf(bytes);check(start>=0,'SPAN_UNAVAILABLE');
  return {start_byte:start,end_byte:start+bytes.length,literal,unit:null,page:null,section:locator.field};
}
export function validateAnnotation(context,request){
  object(request,['schema_version','source_id','original_sha256','locator','span','purpose']);
  check(request.schema_version==='astra.n07.annotation-request.v1'&&request.source_id===context.id,'ANNOTATION_VERSION');
  const source=originalContext(context);check(request.original_sha256===source.approval.resource.sha256,'SOURCE_MISMATCH');
  check(request.purpose==='structural_attribution','UNREVIEWED_CLAIM');
  object(request.span,['start_byte','end_byte','literal','unit','page','section']);
  const expected=sourceLocation(context,request.locator);check(stableJSON(request.span)===stableJSON(expected),'SPAN_MISMATCH');
  const {start_byte:a,end_byte:b,literal}=request.span;
  check(Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>=0&&b>a&&b<=source.files.original.length
    &&source.files.original.subarray(a,b).equals(Buffer.from(literal)),'SPAN_MISMATCH');
  return clone(request);
}
export function defaultAnnotation(context){
  const locator=context.id==='physionet-bidmc-01-numerics'?{kind:'csv_header',field:'header'}:
    {kind:'json_string',field:context.id==='nasa-osdr-osd-1'?'/OSD-1/metadata/study title':'/title'};
  const request={schema_version:'astra.n07.annotation-request.v1',source_id:context.id,
    original_sha256:originalContext(context).approval.resource.sha256,locator,span:sourceLocation(context,locator),purpose:'structural_attribution'};
  return validateAnnotation(context,request);
}
export function appendAnnotation(context,history,request,{id,expected_revision,action='record',reason},token){
  authorizeLocal(token);validateAnnotationHistory(context,history);check(history.length<100,'HISTORY_LIMIT');
  text(id,80);check(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id),'INVALID_ANNOTATION_ID');text(reason,500);
  check(['record','correct','exclude','revoke'].includes(action)&&Number.isSafeInteger(expected_revision)&&expected_revision>=0,'INVALID_REVISION');
  const prior=history.filter(r=>r.id===id).at(-1);check((prior?.revision??0)===expected_revision&&prior?.action!=='revoke','REVISION_CONFLICT');
  check((!prior&&action==='record')||(prior&&action!=='record'),'REVISION_CONFLICT');
  const entry={schema_version:'astra.n07.annotation.v1',id,revision:expected_revision+1,action,reason,
    annotation:validateAnnotation(context,request),review_status:'PENDING',previous_hash:history.at(-1)?.hash??'GENESIS'};
  entry.hash=hashObject(entry);return [...history,entry];
}
export function validateAnnotationHistory(context,history){
  check(Array.isArray(history)&&history.length<=100,'HISTORY_LIMIT');let previous='GENESIS';const revisions=new Map(),revoked=new Set();
  for(const entry of history){
    object(entry,['schema_version','id','revision','action','reason','annotation','review_status','previous_hash','hash']);
    const {hash,...body}=entry;check(isHash(hash)&&hash===hashObject(body)&&entry.previous_hash===previous&&entry.review_status==='PENDING'
      &&entry.schema_version==='astra.n07.annotation.v1','HISTORY_INTEGRITY');
    text(entry.id,80);text(entry.reason,500);const rev=revisions.get(entry.id)??0;
    check(!revoked.has(entry.id)&&entry.revision===rev+1&&(rev?['correct','exclude','revoke'].includes(entry.action):entry.action==='record'),'HISTORY_INTEGRITY');
    validateAnnotation(context,entry.annotation);revisions.set(entry.id,entry.revision);if(entry.action==='revoke')revoked.add(entry.id);previous=hash;
  }
  return true;
}
export function buildSourceCard(context,history){
  validateAnnotationHistory(context,history);const {approval:a,manifest:m,legacyCard,files}=originalContext(context);
  const active=new Map();for(const row of history)active.set(row.id,row);
  const revoked=history.some(r=>r.action==='revoke');
  return {schema_version:'astra.n07.source-card.v1',id:context.id,version:hashObject([a.resource.sha256,history]),
    category:'AUTHENTIC_ORIGINAL',source_status:revoked?'REVOKED':'VERIFIED_LOCAL_SNAPSHOT',synthetic:false,
    title:a.publication.title,publisher:a.publication.publisher,authors:a.publication.authors,
    source_version:a.publication.version,published_on:a.publication.published_on,
    retrieved_at:m.retrieval.completed_at,observed_at:null,locator:a.resource.url,canonical_url:a.publication.canonical_url,
    original:{bytes:files.original.length,sha256:sha256(files.original)},approval_sha256:m.approval_sha256,
    rights:clone(a.rights),content_kind:a.scope.content_kind,privacy:a.scope.contains_patient_data?'PUBLIC_HISTORICAL_PATIENT_DERIVED':'PUBLIC_NONPATIENT_METADATA',
    domain:context.id.includes('bidmc')?'hospital_numerics':context.id.includes('osdr')?'nonhuman_space_biology':'bibliographic_metadata',
    population:legacyCard?.population??(context.id.includes('osdr')?{organism:'Drosophila melanogaster',independent_units:null}:{organism:null,independent_units:null}),
    measurements:legacyCard?.record?.channels??[],quality:{structural:'VERIFIED',scientific:'UNKNOWN',clinical:'NOT_VALIDATED'},
    legacy_dataset_card:legacyCard,limitations:clone(a.scope.limitations),
    annotations:[...active.values()].filter(r=>['record','correct'].includes(r.action)),annotation_history:clone(history),
    review:{status:'PENDING',reviewer:null,competence:null,date:null,decision:null,authentication:null},
    support:{attribution:'VERIFIED',question_relevance:'UNASSESSED',numeric_claim:'UNVERIFIED',population_applicability:'UNASSESSED',clinical_use:false},
    split_readiness:context.id.includes('bidmc')?'BLOCKED_SINGLE_RECORD_AND_UNVERIFIED_PATIENT_LINKAGE':context.id.includes('osdr')?'BLOCKED_MISSING_UNIT_IDENTITIES':'NOT_APPLICABLE_METADATA_ONLY'};
}
export function validateSourceCard(context,history,card){
  check(stableJSON(card)===stableJSON(buildSourceCard(context,history)),'CARD_MISMATCH');return card;
}
export function consumerDescriptor(context,history,token,{consumer='N08'}={}){
  authorizeLocal(token);check(['N08','N09','N10','N11','N13','N14','N15'].includes(consumer),'CONSUMER_NOT_ALLOWED');
  const card=buildSourceCard(context,history);check(card.source_status!=='REVOKED','SOURCE_REVOKED');
  check(card.annotations.length>0,'ANNOTATION_UNAVAILABLE');
  return {schema_version:'astra.n07.consumer-descriptor.v1',consumer,source_id:context.id,source_hash:card.original.sha256,
    card_hash:hashObject(card),source_version:card.source_version,source_type:card.privacy,
    retrieved_at:card.retrieved_at,observed_at:null,synthetic:false,availability:'LOCAL_RESEARCH_ONLY',runtime_integration:'INACTIVE',
    support:clone(card.support),quality:clone(card.quality),rights:clone(card.rights),limitations:clone(card.limitations),
    raw_measurements:null,crew_id:null,clinical_conclusion:null,split_readiness:card.split_readiness};
}
export function reviewPacket(card){
  check(card?.schema_version==='astra.n07.source-card.v1','CARD_MISMATCH');
  return {schema_version:'astra.n07.review-packet.v1',card_sha256:hashObject(card),source_sha256:card.original.sha256,
    source_id:card.id,source_version:card.source_version,card,
    questions:['Are source domain, population, units and limitations preserved?',
      'Is any proposed group/session/time independence actually established by original evidence?',
      'Does any requested factual or numerical support require additional independent scientific review?'],
    decisions:['APPROVE','REJECT','REQUEST CHANGES'],reviewer:{identity:null,competence:null,date:null,decision:null,rationale:null,authentication:null},
    owner_acceptance:{identity:null,date:null,decision:null,authentication:null},
    adjudication:'Conflicting decisions stay DISPUTED; an independent qualified adjudicator and authenticated owner acceptance must bind this exact card/source version. Any content revision invalidates prior review.',
    applicability:'Review preparation only; no approval or runtime support rule is activated.'};
}
