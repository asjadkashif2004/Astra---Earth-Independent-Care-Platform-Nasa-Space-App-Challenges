import { fail,sha256,stableJSON,approvalHash,isHash,isInstant,object,text,texts } from './validation.mjs';

export const OSDR_ID='nasa-osdr-osd-1';
export const OSDR_URL='https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-1/';
export const OSDR_CANONICAL='https://osdr.nasa.gov/bio/repo/data/studies/OSD-1';
export const OSDR_CATALOGUE='https://data.nasa.gov/dataset/expression-data-from-drosophila-melanogaster-a0600';
const TERMS='https://science.data.nasa.gov/about/license',DOCS='https://visualization.osdr.nasa.gov/biodata/api/';
const RIGHTS='NASA dataset-specific catalogue: accessLevel public; license https://www.usa.gov/government-works. No study-specific SPDX license is supplied by the selected API response.';
export const osdrVersion=hash=>`OSD-1 BioData API v2 snapshot; study release version unavailable; sha256:${hash}`;

export function validateOSDRApproval(a){
  object(a,['schema_version','id','repository','publication','resource','rights','scope']);
  if(a.schema_version!=='astra.acquisition-approval.v1'||a.id!==OSDR_ID||a.repository!=='NASA Open Science Data Repository (OSDR), Biological Data API v2')fail('SOURCE_NOT_ALLOWED','Only the reviewed OSD-1 study source is permitted.');
  object(a.publication,['title','authors','publisher','canonical_url','version','published_on','date_note']);
  for(const k of ['title','publisher','version','date_note'])text(a.publication[k]);texts(a.publication.authors);
  if(a.publication.canonical_url!==OSDR_CANONICAL||a.publication.title!=='Expression data from drosophila melanogaster')fail('SOURCE_NOT_ALLOWED','OSDR publication identity differs from the reviewed study.');
  if(a.publication.published_on!==null||a.publication.version!==osdrVersion(a.resource?.sha256))fail('INVALID_METADATA','Do not invent publication dates or study-version numbers.');
  object(a.resource,['url','file','media_type','bytes','sha256']);
  if(a.resource.url!==OSDR_URL)fail('SOURCE_NOT_ALLOWED','Only the exact aggregate OSD-1 endpoint is allowed.');
  if(a.resource.file!=='original.json'||a.resource.media_type!=='application/json')fail('UNSUPPORTED_CONTENT','Only the original JSON metadata is supported.');
  if(!Number.isSafeInteger(a.resource.bytes)||a.resource.bytes<2||a.resource.bytes>65536||!isHash(a.resource.sha256))fail('INVALID_METADATA','Supply a bounded exact size and SHA-256.');
  object(a.rights,['statement','license_id','terms_url','harvesting_url','record_url','reviewed_on','attribution','restrictions']);
  if(a.rights.statement!==RIGHTS||a.rights.license_id!==null||a.rights.terms_url!==TERMS||a.rights.harvesting_url!==DOCS||a.rights.record_url!==OSDR_CATALOGUE)fail('RIGHTS_REVIEW_REQUIRED','OSD-1 requires its reviewed specific access/use basis, not inferred rights.');
  if(!/^\d{4}-\d\d-\d\d$/.test(a.rights.reviewed_on)||!Number.isFinite(Date.parse(a.rights.reviewed_on))||new Date(a.rights.reviewed_on).toISOString().slice(0,10)!==a.rights.reviewed_on)fail('INVALID_METADATA','Supply a real rights-review date.');
  text(a.rights.attribution);texts(a.rights.restrictions);
  object(a.scope,['content_kind','synthetic','contains_patient_data','clinical_use','corpus_ingestion','limitations']);
  if(a.scope.content_kind!=='public_nonhuman_study_metadata'||['synthetic','contains_patient_data','clinical_use','corpus_ingestion'].some(k=>a.scope[k]!==false))fail('INVALID_METADATA','Only nonhuman nonclinical metadata is approved.');
  texts(a.scope.limitations);return a;
}
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
function optionalText(v){if(v===undefined||v===null||v==='')return null;text(v,4000);return v;}
function optionalTexts(v){if(v===undefined||v===null||v==='')return null;const values=typeof v==='string'?[v]:v;texts(values);return structuredClone(values);}
function missionDate(v){
  if(v===undefined||v===null||v==='')return null;
  if(typeof v!=='string'||!/^\d\d\/\d\d\/\d{4}$/.test(v))fail('INVALID_METADATA','Mission date format changed.');
  const [mm,dd,yyyy]=v.split('/'),iso=`${yyyy}-${mm}-${dd}`;
  if(!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)fail('INVALID_METADATA','Invalid mission calendar date.');return iso;
}
/** Study aggregate only. Never traverse assays/files or infer experimental rows from prose. */
export function parseOSDRMetadata(data){
  if(!record(data)||!Object.keys(data).length||data.error||data.success===false)fail('METADATA_UNAVAILABLE','The selected study metadata is unavailable.');
  if(Object.keys(data).length!==1||!Object.hasOwn(data,'OSD-1'))fail('SOURCE_METADATA_MISMATCH','Only one exact OSD-1 aggregate is permitted.');
  const d=data['OSD-1'];
  if(!record(d)||!record(d.metadata))fail('METADATA_UNAVAILABLE','Study metadata is absent.');
  object(d,['REST_URL','assays','files','metadata']);
  if(d.REST_URL!==OSDR_URL||!record(d.assays)||!record(d.files)||d.assays.REST_URL!==OSDR_URL+'assays/'||d.files.REST_URL!==OSDR_URL+'files/')fail('SOURCE_METADATA_MISMATCH','Unexpected study or child references.');
  object(d.assays,['REST_URL']);object(d.files,['REST_URL']);const m=d.metadata;
  if(m.accession!=='OSD-1'||m['study identifier']!=='OSD-1')fail('SOURCE_METADATA_MISMATCH','Study accession fields disagree.');
  if(m.organism!=='Drosophila melanogaster')fail('NONHUMAN_REQUIRED','Only the reviewed nonhuman fruit-fly organism is allowed; unknown/mixed/human organisms reject.');
  if(m['space program']!=='NASA')fail('METADATA_UNAVAILABLE','Reviewed NASA program context is missing or changed.');
  if(Object.keys(m).some(k=>/licen|copyright|access.?level|restricted|controlled|permission/i.test(k)))fail('RIGHTS_REVIEW_REQUIRED','New source access/license fields require review before reuse.');
  if(m.identifiers!==undefined&&m.identifiers!=='GLDS-1')fail('SOURCE_METADATA_MISMATCH','Legacy accession differs.');
  let releasedAt=null;const release=m['study public release date'];
  if(release!==undefined&&release!==null&&release!==''){
    if(!Number.isSafeInteger(release)||release<0||!Number.isFinite(new Date(release*1000).getTime()))fail('INVALID_METADATA','Invalid public-release timestamp.');releasedAt=new Date(release*1000).toISOString();
  }
  if(m.mission!==undefined&&m.mission!==null&&!record(m.mission))fail('INVALID_METADATA','Mission context must be an object.');
  const mission=m.mission??{},start=missionDate(mission['start date']),end=missionDate(mission['end date']);
  if(start&&end&&end<start)fail('INVALID_METADATA','Mission end precedes start.');
  return {schema_version:'astra.osdr-study.v1',accession:'OSD-1',legacy_accession:m.identifiers??null,title:optionalText(m['study title']),organism:m.organism,
    mission:{name:optionalText(mission.name),start_date:start,end_date:end},space_program:m['space program'],flight_program:optionalText(m['flight program']),
    project_type:optionalText(m['project type']),project_title:optionalText(m['project title']),material_type:optionalText(m['material type']),
    factors:optionalTexts(m['study factor name']),measurement_types:optionalTexts(m['study assay measurement type']),technology_types:optionalTexts(m['study assay technology type']),platforms:optionalTexts(m['study assay technology platform']),
    study_public_release_at:releasedAt,study_release_version:null,study_modified_at:null,
    publication_title:optionalText(m['study publication title']),publication_authors:optionalTexts(m['study publication author list']),
    counts:{subjects:null,samples:null,biological_replicates:null,technical_replicates:null},grouping:{pool_ids:null,vial_ids:null,hardware_ids:null,processing_batches:null},
    unknowns:['study release version','study modification timestamp','sample/subject/replicate counts','pool/vial/hardware/processing identities','assay-level units and outcomes','training/validation/test assignments']};
}
export function validateOSDROriginal(bytes,approval){
  validateOSDRApproval(approval);
  if(bytes.length!==approval.resource.bytes||sha256(bytes)!==approval.resource.sha256)fail('HASH_MISMATCH','OSDR bytes do not match the reviewed snapshot.');
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('UNSUPPORTED_CONTENT','OSDR metadata must be original UTF-8 JSON.');}
  const p=parseOSDRMetadata(data);
  if(p.title!==approval.publication.title||stableJSON(p.publication_authors)!==stableJSON(approval.publication.authors))fail('SOURCE_METADATA_MISMATCH','Source title/authors differ from reviewed metadata.');
  return data;
}
function documentationContext({approval,manifest,bytes}){
  const data=validateOSDROriginal(bytes,approval),p=parseOSDRMetadata(data);
  if(manifest?.schema_version!=='astra.scientific-source.v1'||manifest.source_id!==OSDR_ID||manifest.approval_sha256!==approvalHash(approval)||stableJSON(manifest.original)!==stableJSON(approval.resource)||stableJSON(manifest.rights)!==stableJSON(approval.rights)||!isInstant(manifest.retrieval?.completed_at))fail('PROVENANCE_MISMATCH','Documentation must bind to the verified original approval/receipt.');
  return {p,source:{source_id:OSDR_ID,original_sha256:approval.resource.sha256,original_bytes:approval.resource.bytes,approval_sha256:approvalHash(approval),metadata_url:OSDR_URL,canonical_url:OSDR_CANONICAL,retrieved_at:manifest.retrieval.completed_at}};
}
export function buildDatasetCard(context){
  const {p,source}=documentationContext(context),a=context.approval;
  return {schema_version:'astra.dataset-card.v1',study_id:'OSD-1',review_status:'reviewable_metadata_only;not_scientifically_validated',source,
    study:p,download_inventory:{study_metadata:true,raw_omics:false,processed_measurements:false,images:false,sample_tables:false,referenced_links_followed:false},
    permissions:{catalogue_url:OSDR_CATALOGUE,catalogue_access_level:'public',catalogue_license_url:'https://www.usa.gov/government-works',explicit_api_license:null,rights:structuredClone(a.rights)},
    scientific_limitations:[...a.scope.limitations,'One selected mission/organism/whole-organism platform cannot establish human or astronaut medical validity.','Spaceflight,launch/re-entry,handling,infection,strain and processing can confound associations. Their separate effects are not estimated.','Source protocol prose aggregates procedures and contains ambiguous investigator-name fields;no prose counts or names become experimental identities.','No expression values,labels,effect sizes,quality scores or train/test metrics are calculated.'],
    field_sources:{title:'/OSD-1/metadata/study title',organism:'/OSD-1/metadata/organism',mission:'/OSD-1/metadata/mission',measurement:'/OSD-1/metadata/study assay measurement type',technology:'/OSD-1/metadata/study assay technology type',platform:'/OSD-1/metadata/study assay technology platform',release:'/OSD-1/metadata/study public release date',factors:'/OSD-1/metadata/study factor name'},
    split_readiness:'blocked_pending_independence_and_target_review'};
}
export function buildSplitManifest(context){
  const {source}=documentationContext(context);
  return {schema_version:'astra.split-policy.v1',study_id:'OSD-1',status:'blocked_pending_independence_and_target_review',source,
    unit_of_independence:{proposed:'Verified biological experimental unit (possibly a fly pool or vial),grouped with shared mission/hardware/run and technical derivatives.',verified:false,actual_unit_ids:null},
    proposed_policy:{train:'Fit models and all normalization/feature selection on training groups only,after independence and target review.',validation:'Tune using disjoint verified biological groups;keep all pooled,technical,assay and repeated measurements together.',test:'For mission generalization,hold out an independent mission/study/cohort,with overlapping source experiments and duplicates excluded. This one-study snapshot cannot establish such a test.',random_row_split_allowed:false,gene_probe_split_allowed:false,related_observations_must_stay_together:true,cross_study_duplicate_check_required:true,preprocessing_fit:'training_only',ratios:null,seed:null,label_definition:null},
    availability:{selected_studies:['OSD-1'],independent_unit_count:null,sample_count:null,train_count:null,validation_count:null,test_count:null},assignments:[],executed:false,
    unresolved:['Identify actual pooling/vial/biological replicate and shared hardware/run IDs.','Define the nonclinical prediction/research target and source labels before any split.','Obtain separately authorized measurement/sample metadata and check source permissions.','Establish sufficient independent groups/missions and check duplicates across related archives/studies.','Review preprocessing leakage and group/mission confounding;do not use genes/probes as independent subjects.']};
}
export function validateSplitManifest(split,context){
  const {source}=documentationContext(context);
  object(split,['schema_version','study_id','status','source','unit_of_independence','proposed_policy','availability','assignments','executed','unresolved']);
  if(split.schema_version!=='astra.split-policy.v1'||split.study_id!=='OSD-1'||split.status!=='blocked_pending_independence_and_target_review'||split.executed!==false||!Array.isArray(split.assignments)||split.assignments.length)fail('UNSUPPORTED_SPLIT','This is an unexecuted policy;no rows,labels or assignments may be invented.');
  if(stableJSON(split.source)!==stableJSON(source))fail('PROVENANCE_MISMATCH','Split source fingerprint differs.');
  object(split.unit_of_independence,['proposed','verified','actual_unit_ids']);text(split.unit_of_independence.proposed);
  if(split.unit_of_independence.verified!==false||split.unit_of_independence.actual_unit_ids!==null)fail('UNSUPPORTED_SPLIT','Independence identities are not established.');
  const p=split.proposed_policy;
  object(p,['train','validation','test','random_row_split_allowed','gene_probe_split_allowed','related_observations_must_stay_together','cross_study_duplicate_check_required','preprocessing_fit','ratios','seed','label_definition']);
  for(const k of ['train','validation','test'])text(p[k]);
  if(p.random_row_split_allowed!==false||p.gene_probe_split_allowed!==false||p.related_observations_must_stay_together!==true||p.cross_study_duplicate_check_required!==true||p.preprocessing_fit!=='training_only'||p.ratios!==null||p.seed!==null||p.label_definition!==null)fail('UNSUPPORTED_SPLIT','Unreviewed allocations,labels or leakage-prone policy are forbidden.');
  object(split.availability,['selected_studies','independent_unit_count','sample_count','train_count','validation_count','test_count']);
  if(stableJSON(split.availability.selected_studies)!=='["OSD-1"]'||Object.entries(split.availability).some(([k,v])=>k!=='selected_studies'&&v!==null))fail('UNSUPPORTED_SPLIT','Do not fabricate unavailable counts.');
  texts(split.unresolved);return split;
}
export function validateDatasetCard(card,context){
  if(stableJSON(card)!==stableJSON(buildDatasetCard(context)))fail('PROVENANCE_MISMATCH','Dataset card facts/unknowns differ from its verified source or review contract.');return card;
}
