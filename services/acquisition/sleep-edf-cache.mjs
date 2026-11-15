import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open,lstat,rename,unlink } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { httpsTransport,directory,read,writeNew,checkpoint,abortable } from './cache.mjs';
import { fail,sha256,stableJSON,approvalHash,isInstant } from './validation.mjs';
import { SLEEP_ID,SLEEP_FILES,SLEEP_LIMITS,CHECKSUM_SHA,CHECKSUM_BYTES,assertSleepURL,validateSleepApproval,validatePublisher } from './sleep-edf-source.mjs';
import { readEDFHeader,parseHypnogram,validateSleepPair } from './edf.mjs';

const NOFOLLOW=constants.O_NOFOLLOW??0,json=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const VERIFIED_SLEEP=Symbol('verified-original-sleep-pair');
const exists=async p=>{try{await lstat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const regular=async p=>{const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink())fail('UNSAFE_CACHE','Use regular cache files.');return s;};
export const sleepEntry=root=>join(resolve(root),`${SLEEP_ID}-${CHECKSUM_SHA}`);
export function sleepBudget(publisher,receipt){const verified=validatePublisher(publisher,receipt);return {payload_bytes:verified.bytes,network_ms:verified.network_ms};}
function validateBudget(b){if(!Number.isSafeInteger(b.payload_bytes)||b.payload_bytes<0||b.payload_bytes>SLEEP_LIMITS.total_payload_bytes||!Number.isSafeInteger(b.network_ms)||b.network_ms<0||b.network_ms>SLEEP_LIMITS.overall_network_ms)fail('ACQUISITION_LIMIT','Invalid or exhausted approved aggregate budget.');}
function headers(h){const result={};for(const [k,v]of Object.entries(h)){const name=k.toLowerCase();if(!['content-type','content-encoding','content-length','content-range','etag'].includes(name))continue;if(typeof v!=='string'||v.length>1024)fail('INVALID_RESPONSE','Unsupported header value.');result[name]=v;}return result;}
const allowedMIME=v=>['application/octet-stream','application/edf','application/x-edf','application/vnd.edf'].includes(v);

/** Stream one approved EDF payload,incremental hash only.No concatenation,automatic retry or decompression. */
export async function streamSleepFile({path,spec,budget,transport=httpsTransport,signal:external,clock=()=>new Date().toISOString(),onProgress=async()=>{}}){
  assertSleepURL(spec.url);validateBudget(budget);
  const approved=SLEEP_FILES.find(f=>f.url===spec.url);
  if(!approved||spec.name!==approved.name||!Number.isSafeInteger(spec.bytes)||spec.bytes<1||spec.bytes>approved.bytes||!Number.isSafeInteger(spec.deadline_ms)||spec.deadline_ms<1||spec.deadline_ms>approved.deadline_ms||!/^[a-f0-9]{64}$/.test(spec.sha256))fail('INVALID_LIMIT','File must fit its exact source-specific ceiling.');
  if(budget.payload_bytes+spec.bytes>SLEEP_LIMITS.total_payload_bytes)fail('ACQUISITION_LIMIT','File exceeds remaining aggregate payload budget.');
  const deadline=Math.min(spec.deadline_ms,SLEEP_LIMITS.overall_network_ms-budget.network_ms);if(deadline<1)fail('ACQUISITION_LIMIT','Overall network deadline exhausted.');
  const control=new AbortController(),abort=()=>control.abort();if(external?.aborted)abort();external?.addEventListener('abort',abort,{once:true});
  const start=performance.now(),timer=setTimeout(abort,deadline),started_at=clock();let response,file,count=0,synced=0,complete=false,receipt=null;
  const hash=createHash('sha256');
  const guard=()=>{if(performance.now()-start>=deadline)abort();if(control.signal.aborted)fail('ACQUISITION_ABORTED','Sleep-EDF acquisition cancelled or deadline expired.');};
  const snapshot=()=>({name:spec.name,bytes:count,prefix_sha256:hash.copy().digest('hex'),response_complete:complete});
  try{
    guard();file=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|NOFOLLOW,0o600);
    response=await abortable(transport(spec.url,{headers:{Accept:'application/octet-stream','Accept-Encoding':'identity','User-Agent':'ASTRA-N07-SleepEDF/1.0'},signal:control.signal}),control.signal);guard();
    const h=headers(response.headers),mime=h['content-type']?.split(';')[0].trim().toLowerCase();
    if(response.status!==200||h['content-range']!==undefined)fail('HTTP_STATUS','Only a complete original HTTP200 is allowed;no redirect or range substitution.');
    if(!allowedMIME(mime)||h['content-encoding']!==undefined&&h['content-encoding']!=='identity')fail('UNSUPPORTED_CONTENT','Require uncompressed EDF binary content.');
    if(h['content-length']!==undefined&&(!/^\d+$/.test(h['content-length'])||Number(h['content-length'])!==spec.bytes))fail('SIZE_MISMATCH','HTTP size differs from the approved complete original.');
    const iterator=response.body[Symbol.asyncIterator]();
    for(;;){guard();const part=await abortable(iterator.next(),control.signal);guard();if(part.done)break;
      if(!(part.value instanceof Uint8Array))fail('SIZE_MISMATCH','Nonbinary body.');
      budget.payload_bytes+=part.value.length;validateBudget(budget);
      if(count+part.value.length>spec.bytes)fail('SIZE_MISMATCH','Response exceeds exact original size.');
      if(!part.value.length)continue;await file.writeFile(part.value);hash.update(part.value);count+=part.value.length;
      if(count-synced>=1048576){await file.sync();synced=count;await onProgress(snapshot());}
    }
    if(count!==spec.bytes)fail('INCOMPLETE_RESPONSE','EOF before the exact original length.');
    if(hash.copy().digest('hex')!==spec.sha256)fail('HASH_MISMATCH','Downloaded original differs from official publisher SHA256.');
    guard();await file.sync();complete=true;await onProgress(snapshot());guard();
    receipt={name:spec.name,url:spec.url,bytes:count,sha256:spec.sha256,media_type:mime,etag:h.etag??null,started_at,completed_at:clock(),requests:1,method:'HTTPS GET',status:200,redirects:0,network_ms:Math.ceil(performance.now()-start),response_complete:true};
    return receipt;
  }catch(e){if(file){await file.sync().catch(()=>{});await onProgress({...snapshot(),failure:e.code??e.name}).catch(()=>{});}throw e;
  }finally{
    const elapsed=Math.ceil(performance.now()-start);budget.network_ms+=elapsed;if(receipt)receipt.network_ms=elapsed;
    clearTimeout(timer);external?.removeEventListener('abort',abort);control.abort();response?.close?.();await file?.close();
  }
}
export async function hashSleepFile(path,expected){
  const f=await open(path,constants.O_RDONLY|NOFOLLOW);try{
    const s=await f.stat();if(!s.isFile()||s.size!==expected.bytes)fail('HASH_MISMATCH','Original size/type changed.');
    const h=createHash('sha256'),chunk=Buffer.alloc(65536);let size=0;
    for(;;){const {bytesRead}=await f.read(chunk,0,chunk.length,null);if(!bytesRead)break;size+=bytesRead;if(size>expected.bytes)fail('HASH_MISMATCH','Original grew while hashing.');h.update(chunk.subarray(0,bytesRead));}
    if(size!==expected.bytes||h.digest('hex')!==expected.sha256)fail('HASH_MISMATCH','Offline original SHA256 mismatch.');
  }finally{await f.close();}
}
async function pairAt(entry){const psg=await readEDFHeader(join(entry,SLEEP_FILES[0].name),SLEEP_FILES[0].bytes),hyp=parseHypnogram(await read(join(entry,SLEEP_FILES[1].name),65536));return {psg,hyp,pair:validateSleepPair(psg,hyp)};}
function manifestFor(a,state,pair){return {schema_version:'astra.scientific-bundle.v1',source_id:SLEEP_ID,approval_sha256:approvalHash(a),source:{repository:a.repository,canonical_url:a.canonical_url,doi:a.doi,version:a.version},rights:structuredClone(a.rights),limits:structuredClone(SLEEP_LIMITS),publisher:{original:'SHA256SUMS.txt',bytes:CHECKSUM_BYTES,sha256:CHECKSUM_SHA,receipt:state.publisher_receipt},files:state.receipts,pair_validation:pair,retrieval:{completed_at:state.completed_at,total_payload_bytes:state.budget.payload_bytes,network_ms:state.budget.network_ms,automatic_retries:0}};}
export async function verifySleepCache({root,approval}){
  validateSleepApproval(approval);const base=await lstat(root);if(!base.isDirectory()||base.isSymbolicLink())fail('UNSAFE_CACHE','Unsafe cache root.');
  const entry=sleepEntry(root),dir=await lstat(entry);if(!dir.isDirectory()||dir.isSymbolicLink())fail('UNSAFE_CACHE','Unsafe completed entry.');
  const state=JSON.parse((await read(join(entry,'progress.json'),16384)).toString()),manifest=JSON.parse((await read(join(entry,'manifest.json'),32768)).toString());
  if(state.schema_version!=='astra.sleep-edf-progress.v1'||state.approval_sha256!==approvalHash(approval)||state.complete!==true||state.failure||!isInstant(state.completed_at)||!Array.isArray(state.receipts)||state.receipts.length!==2)fail('CACHE_CORRUPT','Incomplete or mismatched bundle state.');
  const publisher=await read(join(entry,'SHA256SUMS.txt'),65536),review=JSON.parse((await read(join(entry,'publisher-receipt.json'),16384)).toString());const metadata=sleepBudget(publisher,review);
  if(stableJSON(state.publisher_receipt)!==stableJSON(review))fail('PROVENANCE_MISMATCH','Publisher receipt changed.');
  let payload=metadata.payload_bytes,network=metadata.network_ms;
  for(let i=0;i<2;i++){
    const f=SLEEP_FILES[i],r=state.receipts[i];if(r.name!==f.name||r.url!==f.url||r.bytes!==f.bytes||r.sha256!==f.sha256||r.requests!==1||r.status!==200||r.method!=='HTTPS GET'||r.redirects!==0||r.response_complete!==true||!allowedMIME(r.media_type)||!isInstant(r.started_at)||!isInstant(r.completed_at)||r.completed_at<r.started_at||!Number.isSafeInteger(r.network_ms)||r.network_ms<0||r.network_ms>f.deadline_ms)fail('PROVENANCE_MISMATCH','Invalid file receipt/limits.');
    payload+=r.bytes;network+=r.network_ms;await hashSleepFile(join(entry,f.name),f);
  }
  validateBudget(state.budget);if(state.budget.payload_bytes!==payload||state.budget.network_ms!==network)fail('PROVENANCE_MISMATCH','Aggregate acquisition accounting differs.');
  const parsed=await pairAt(entry);if(stableJSON(manifest)!==stableJSON(manifestFor(approval,state,parsed.pair)))fail('CACHE_CORRUPT','Manifest differs from original structure or completed receipts.');
  return Object.defineProperty({entry,manifest,...parsed,network_requests:0},VERIFIED_SLEEP,{value:true});
}
export async function acquireSleep({root,approval,publisher,publisherReceipt,transport=httpsTransport,signal,clock=()=>new Date().toISOString()}){
  validateSleepApproval(approval);const base=await directory(resolve(root)),entry=sleepEntry(base);
  if(await exists(entry))return verifySleepCache({root:base,approval});
  const budget=sleepBudget(publisher,publisherReceipt),stage=join(base,`.${SLEEP_ID}-${CHECKSUM_SHA}.partial`),lockPath=join(base,`.${SLEEP_ID}.lock`);let lock,state;
  try{
    try{lock=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|NOFOLLOW,0o600);}catch(e){if(e.code==='EEXIST')fail('CACHE_BUSY','Owned acquisition or leftover lock requires inspection.');throw e;}
    if(await exists(entry))return verifySleepCache({root:base,approval});
    if(await exists(stage))fail('REJECTED_PARTIAL','Existing partial retained;no automatic retry,resume,overwrite or promotion.');
    await directory(stage);state={schema_version:'astra.sleep-edf-progress.v1',approval_sha256:approvalHash(approval),publisher_receipt:publisherReceipt,budget,receipts:[],current:null,complete:false,completed_at:null};
    await writeNew(join(stage,'SHA256SUMS.txt'),publisher);await writeNew(join(stage,'publisher-receipt.json'),json(publisherReceipt));await checkpoint(join(stage,'progress.json'),state);
    for(const f of SLEEP_FILES){
      const receipt=await streamSleepFile({path:join(stage,f.name),spec:f,budget,transport,signal,clock,onProgress:async p=>{state.current=p;await checkpoint(join(stage,'progress.json'),state);}});
      validateBudget(budget);state.receipts.push(receipt);state.current=null;await checkpoint(join(stage,'progress.json'),state);
    }
    const parsed=await pairAt(stage);state.completed_at=clock();state.complete=true;await checkpoint(join(stage,'progress.json'),state);await writeNew(join(stage,'manifest.json'),json(manifestFor(approval,state,parsed.pair)));
    await rename(stage,entry);return verifySleepCache({root:base,approval});
  }catch(e){if(state){state.complete=false;state.failure={code:e.code??e.name,message:e.message,at:clock()};await checkpoint(join(stage,'progress.json'),state).catch(()=>{});}throw e;
  }finally{if(lock){await lock.close();await unlink(lockPath);}}
}
export function buildSleepCard(approval,verified){
  validateSleepApproval(approval);if(verified?.[VERIFIED_SLEEP]!==true)fail('PROVENANCE_MISMATCH','Reverify complete original files before building source documents.');const {manifest:m,psg,pair}=verified;
  if(m.approval_sha256!==approvalHash(approval)||m.source_id!==SLEEP_ID||stableJSON(m.pair_validation)!==stableJSON(pair))fail('PROVENANCE_MISMATCH','Card requires the verified pair/approval.');
  return {schema_version:'astra.dataset-card.v1',dataset_id:'Sleep-EDF-Expanded-1.0.0-SC4001',source:m.source,rights:m.rights,approval_sha256:m.approval_sha256,original_files:m.files,publisher:m.publisher,
    provenance:'Real public historical human sleep research;not synthetic or live NASA/ASTRA telemetry.',subject:{source_subject_number:'00',night_number:1,global_identity:null,age:null,sex:null,header_patient_field:psg.patient_header,independent_anonymization_certification:false},
    recording:{...pair,header_recording_field:psg.recording_header,record_count:psg.record_count,record_duration_seconds:psg.record_duration_seconds,signals:psg.channels,calendar_authenticity:'Source-encoded local date/time;timezone and real-world calendar linkage unverified.'},
    population:'Sleep Cassette:historical1987–1991 home recordings from a selected healthy Caucasian cohort aged25–101,without sleep-related medication;not an astronaut population.',
    limitations:['One recording cannot establish subject-independent train/validation/test performance.','Historical R&K labels and montages are retained;no automatic conversion to current clinical scoring or diagnosis.','No signal-quality calibration,astronaut thresholds,model training,physiological inference or live monitoring connection.','Original files are unchanged;this card is derived documentation,not a modified signal export.'],
    retrieval:m.retrieval,split_readiness:'blocked_single_subject_recording'};
}
export function buildSleepSplit(approval,verified){const card=buildSleepCard(approval,verified);return {schema_version:'astra.split-policy.v1',dataset_id:card.dataset_id,source_approval_sha256:approvalHash(approval),original_files:card.original_files.map(f=>({name:f.name,sha256:f.sha256})),subject_group:'sleep-edfx/SC/00',recording:'SC4001',status:'blocked_single_subject_recording',executed:false,assignments:[],independently_validated:false,policy:{group_all_related_nights_windows_channels:true,random_epoch_split_allowed:false,training_only_preprocessing:true,chronological_boundaries_required:true,cross_source_duplicate_review_required:true,ratios:null,seed:null,target:null},unknowns:['Global subject identity and cross-release duplicates unverified.','A single night cannot provide independent subject partitions.','Future temporal task boundaries,purge intervals and labels require review.']};}
export function validateSleepDocuments(card,split,approval,verified){if(stableJSON(card)!==stableJSON(buildSleepCard(approval,verified))||stableJSON(split)!==stableJSON(buildSleepSplit(approval,verified)))fail('PROVENANCE_MISMATCH','Card/split differs from verified original evidence or invents allocations.');return true;}
