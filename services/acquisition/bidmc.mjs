import { fail,sha256,stableJSON,approvalHash,isInstant,object,text,texts } from './validation.mjs';

export const BIDMC_ID='physionet-bidmc-01-numerics';
export const BIDMC_URL='https://physionet.org/files/bidmc/1.0.0/bidmc_csv/bidmc_01_Numerics.csv';
export const BIDMC_CANONICAL='https://physionet.org/content/bidmc/1.0.0/';
export const BIDMC_LICENSE='https://physionet.org/content/bidmc/view-license/1.0.0/';
export const BIDMC_NOTICE='https://physionet.org/files/bidmc/1.0.0/LICENSE';
export const BIDMC_LEGACY='https://archive.physionet.org/copying.shtml#data';
export const BIDMC_BYTES=7644;
export const BIDMC_SHA256='27d43794cf2e7150db10e8bfe61d2bfdb26873a8f1629ffc5fbee5c9a4eb6ef5';
export const BIDMC_NOTICE_SHA256='76576a17b505dce71773415a18e965982bc8c0c9a60da71f1adb9df7644332a0';
const AUTHORS=['Marco Pimentel','Alistair Johnson','Peter Charlton','David Clifton'];
const RIGHTS='Open Data Commons Attribution License v1.0 (ODC-By-1.0); preserve the accompanying legacy PhysioNet modified-data notice and attribution. Verbatim original only.';
const HEADER=['Time [s]','HR','PULSE','RESP','SpO2'];
const CHANNELS=[{column:'HR',meaning:'Monitor ECG-derived heart rate',unit:'beats/min'},
  {column:'PULSE',meaning:'Monitor PPG-derived pulse rate',unit:'beats/min'},
  {column:'RESP',meaning:'Monitor impedance-derived respiratory rate',unit:'breaths/min'},
  {column:'SpO2',meaning:'Monitor peripheral oxygen saturation',unit:'%'}];

export function validateBIDMCApproval(a){
  object(a,['schema_version','id','repository','publication','resource','rights','scope']);
  if(a.schema_version!=='astra.acquisition-approval.v1'||a.id!==BIDMC_ID||a.repository!=='PhysioNet BIDMC PPG and Respiration Dataset')fail('SOURCE_NOT_ALLOWED','Only the reviewed BIDMC-01 numerics source is permitted.');
  object(a.publication,['title','authors','publisher','canonical_url','version','published_on','date_note']);
  if(a.publication.title!=='BIDMC PPG and Respiration Dataset — record 01 numerics'||a.publication.publisher!=='PhysioNet'||a.publication.canonical_url!==BIDMC_CANONICAL||a.publication.version!=='1.0.0; bidmc_01_Numerics.csv'||a.publication.published_on!=='2018-06-20'||stableJSON(a.publication.authors)!==stableJSON(AUTHORS))fail('SOURCE_METADATA_MISMATCH','BIDMC publication/release identity differs.');
  text(a.publication.date_note);
  object(a.resource,['url','file','media_type','bytes','sha256']);
  if(a.resource.url!==BIDMC_URL)fail('SOURCE_NOT_ALLOWED','Only the exact reviewed CSV is allowed.');
  if(a.resource.file!=='original.csv'||a.resource.media_type!=='text/plain')fail('UNSUPPORTED_CONTENT','Only the pinned CSV served as text/plain is approved.');
  if(a.resource.bytes!==BIDMC_BYTES||a.resource.sha256!==BIDMC_SHA256)fail('HASH_MISMATCH','Do not silently repin or resize this reviewed release file.');
  object(a.rights,['statement','license_id','terms_url','harvesting_url','record_url','reviewed_on','attribution','restrictions','legacy_notice_url','legacy_notice_sha256']);
  if(a.rights.statement!==RIGHTS||a.rights.license_id!=='ODC-By-1.0'||a.rights.terms_url!==BIDMC_LICENSE||a.rights.harvesting_url!==BIDMC_LEGACY||a.rights.record_url!==BIDMC_CANONICAL||a.rights.legacy_notice_url!==BIDMC_NOTICE||a.rights.legacy_notice_sha256!==BIDMC_NOTICE_SHA256)fail('RIGHTS_REVIEW_REQUIRED','Both the official license and legacy notice must be retained.');
  if(!/^\d{4}-\d\d-\d\d$/.test(a.rights.reviewed_on)||!Number.isFinite(Date.parse(a.rights.reviewed_on))||new Date(a.rights.reviewed_on).toISOString().slice(0,10)!==a.rights.reviewed_on)fail('INVALID_METADATA','Supply a real review date.');
  text(a.rights.attribution);texts(a.rights.restrictions);
  object(a.scope,['content_kind','synthetic','contains_patient_data','clinical_use','corpus_ingestion','limitations']);
  if(a.scope.content_kind!=='public_patient_derived_physiological_numerics'||a.scope.synthetic!==false||a.scope.contains_patient_data!==true||a.scope.clinical_use!==false||a.scope.corpus_ingestion!==false)fail('INVALID_METADATA','This is public historical patient-derived research,not synthetic mission or private/live clinical data.');
  texts(a.scope.limitations);return a;
}

/** One fixed,unquoted numeric CSV dialect. Never execute values,interpolate NaN or infer clinical quality. */
export function parseBIDMCNumerics(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>65536)fail('UNSUPPORTED_CONTENT','CSV must be bounded original bytes.');
  let csv;try{csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('UNSUPPORTED_CONTENT','CSV must be valid UTF-8.');}
  if(!csv.endsWith('\n')||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(csv))fail('INVALID_CSV','Incomplete or unsafe CSV text.');
  const lines=csv.split(/\r?\n/);lines.pop();
  if(stableJSON(lines.shift().split(',').map(v=>v.trim()))!==stableJSON(HEADER))fail('SOURCE_METADATA_MISMATCH','Unexpected numeric channels or timestamp units.');
  if(lines.length!==481)fail('INVALID_CSV','Require the complete 481-row recording,not an excerpt.');
  const missing=Object.fromEntries(HEADER.slice(1).map(k=>[k,0]));
  const rows=lines.map((line,i)=>{
    const cells=line.split(',').map(v=>v.trim());if(cells.length!==5||cells[0]!==String(i))fail('INVALID_CSV','Require five columns and ordered 0–480 second timestamps.');
    const row={elapsed_seconds:i};
    for(let j=1;j<cells.length;j++){
      const token=cells[j],key=HEADER[j];
      if(token==='NaN'){row[key]=null;missing[key]++;continue;}
      if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(token)||!Number.isFinite(Number(token)))fail('INVALID_CSV','Only finite numeric values or the literal NaN missing marker are accepted.');
      row[key]=Number(token);
    }
    return row;
  });
  return {record_id:'bidmc_01',source_subject_number:'01',source_session_id:null,original_mimic_patient_id:null,original_mimic_recording_id:null,
    time:{kind:'relative_recording_seconds',start_seconds:0,end_seconds:480,span_seconds:480,cadence_seconds:1,absolute_start_at:null,absolute_end_at:null},
    channels:structuredClone(CHANNELS),rows,missing_counts:missing,clinical_quality:'not_independently_validated'};
}
export function validateBIDMCOriginal(bytes,a){
  validateBIDMCApproval(a);
  if(bytes.length!==BIDMC_BYTES||sha256(bytes)!==BIDMC_SHA256)fail('HASH_MISMATCH','BIDMC original differs from reviewed complete bytes.');
  return parseBIDMCNumerics(bytes);
}
export function validateBIDMCNotice(bytes){
  if(bytes.length!==939||sha256(bytes)!==BIDMC_NOTICE_SHA256)fail('RIGHTS_REVIEW_REQUIRED','Original legacy license notice is missing or modified.');return true;
}
function documentationContext({approval:a,manifest:m,bytes}){
  const parsed=validateBIDMCOriginal(bytes,a);
  if(m?.schema_version!=='astra.scientific-source.v1'||m.source_id!==BIDMC_ID||m.approval_sha256!==approvalHash(a)||['publication','rights','scope'].some(k=>stableJSON(m[k])!==stableJSON(a[k]))||stableJSON(m.original)!==stableJSON(a.resource)||!isInstant(m.retrieval?.started_at)||!isInstant(m.retrieval?.completed_at)||m.retrieval.completed_at<m.retrieval.started_at)fail('PROVENANCE_MISMATCH','Documentation must bind to the original approval and valid receipt.');
  return {parsed,source:{source_id:BIDMC_ID,original_name:'bidmc_01_Numerics.csv',original_bytes:BIDMC_BYTES,original_sha256:BIDMC_SHA256,approval_sha256:approvalHash(a),url:BIDMC_URL,canonical_url:BIDMC_CANONICAL,retrieval_started_at:m.retrieval.started_at,retrieved_at:m.retrieval.completed_at,publisher_checksum_verified:false}};
}
export function buildBIDMCCard(context){
  const {parsed:p,source}=documentationContext(context);const {rows,...record}=p;
  return {schema_version:'astra.dataset-card.v1',dataset_id:'BIDMC-1.0.0',review_status:'reviewable_public_numerics_only;not_clinically_validated',source,
    population:{source_description:'Historical critically ill hospital patients at Beth Israel Deaconess Medical Centre,Boston;derived from MIMIC-II matched waveforms.',selected_recordings:1,global_patient_identity_verified:false,selected_age:null,selected_sex:null},
    record:{...record,row_count:rows.length},download_inventory:{numerics_csv:true,waveforms:false,breath_annotations:false,fixed_demographics:false,other_recordings:false,raw_identifiers:false},
    permissions:structuredClone(context.approval.rights),source_category:'real_public_historical_research;not_synthetic;not_live_mission_data',
    suitability:'Bounded scalar schema,ordering,missingness and future replay-pipeline tests only;not astronaut baselines,clinical thresholds,diagnosis or model validation.',
    transformations:'Original bytes unmodified.Offline validation reads CSV and represents literal NaN as null in derived summaries;no imputation,resampling or rewritten signal file.',
    scientific_limitations:[...context.approval.scope.limitations,'Monitor numerics are not independently adjudicated ground truth.Heart and pulse rates are distinct channels.','No absolute acquisition date is available in this CSV;repository retrieval time is not observation time.','One eight-minute record provides neither subject-independent holdouts nor broad hospital/spaceflight generalization.'],
    split_readiness:'blocked_single_record_and_unverified_cross_archive_identity'};
}
export function buildBIDMCSplit(context){
  const {source}=documentationContext(context);
  return {schema_version:'astra.split-policy.v1',dataset_id:'BIDMC-1.0.0',status:'blocked_single_record_and_unverified_cross_archive_identity',source,
    available:{record_ids:['bidmc_01'],source_subject_numbers:['01'],recording_count:1,row_count:481,independently_verified_subject_count:null,absolute_time_boundaries:null},
    unit_of_independence:{proposed:'Original patient/stay,with all linked BIDMC/MIMIC recordings,channels and windows grouped together.',verified:false,cross_archive_patient_and_session_ids:null},
    time_boundaries:{record:'bidmc_01',start_seconds:0,end_seconds:480,cadence_seconds:1,absolute_start_at:null,absolute_end_at:null},
    proposed_policy:{train:'Fit preprocessing and model parameters only on separately verified training patient/stay groups.',validation:'Use disjoint verified patient/stay groups;keep overlapping or adjacent windows and repeated channels together.',test:'Reserve unseen verified patient/stay groups;check MIMIC/BIDMC duplication before allocation.The single selected recording cannot supply an independent test.',random_row_split_allowed:false,related_windows_and_channels_together:true,preprocessing_fit:'training_only',chronological_order_required:true,purge_gap_seconds:null,ratios:null,seed:null,label_definition:null},
    assignments:[],executed:false,independently_validated:false,
    unresolved:['One recording cannot provide independent train/validation/test patient groups.','Filename supplies a local subject number,not a verified global MIMIC patient/stay identity.','Absolute recording times and cross-archive duplicates are unverified.','Future targets and chronological window/purge policy require review before splitting.']};
}
export function validateBIDMCCard(card,context){if(stableJSON(card)!==stableJSON(buildBIDMCCard(context)))fail('PROVENANCE_MISMATCH','Dataset card differs from verified source evidence.');return card;}
export function validateBIDMCSplit(split,context){if(stableJSON(split)!==stableJSON(buildBIDMCSplit(context)))fail('UNSUPPORTED_SPLIT','No invented grouping,counts,labels,allocations or split-readiness claims are allowed.');return split;}
