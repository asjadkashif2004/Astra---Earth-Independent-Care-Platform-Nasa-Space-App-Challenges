import { request } from 'node:https';
import { constants } from 'node:fs';
import { open, mkdir, lstat, realpath, rename, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { AcquisitionError, fail, sha256, stableJSON, approvalHash, isHash, isInstant, validateApproval, validateOriginal, assertAllowedURL, MAX_SAMPLE_BYTES, MAX_REQUESTS, MAX_DEADLINE_MS } from './source.mjs';

const NOFOLLOW = constants.O_NOFOLLOW ?? 0;
// Shared secure primitives only;the existing small-source policy and limits remain unchanged.
export { directory,read,writeNew,checkpoint,abortable };
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const notFound = error => error.code === 'ENOENT';
async function exists(path) { try { await lstat(path); return true; } catch(e) { if (notFound(e)) return false; throw e; } }
async function directory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const s = await lstat(path); if (!s.isDirectory() || s.isSymbolicLink()) fail('UNSAFE_CACHE', 'Use a dedicated regular cache directory.');
  return realpath(path);
}
async function read(path, limit) {
  const s = await lstat(path); if (!s.isFile() || s.isSymbolicLink() || s.size > limit) fail('UNSAFE_CACHE', 'Cache record is not a bounded regular file.');
  const f = await open(path, constants.O_RDONLY | NOFOLLOW);
  try {
    const stat=await f.stat();if(!stat.isFile()||stat.size>limit)fail('UNSAFE_CACHE','Cache size/type changed.');
    const buffer=Buffer.alloc(limit+1);let total=0;
    while(total<buffer.length){const {bytesRead}=await f.read(buffer,total,buffer.length-total,null);if(!bytesRead)break;total+=bytesRead;}
    if(total>limit)fail('UNSAFE_CACHE','Cache grew beyond its bound.');return buffer.subarray(0,total);
  } finally { await f.close(); }
}
async function writeNew(path, bytes) {
  const f=await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW, 0o600);
  try { await f.writeFile(bytes); await f.sync(); } finally { await f.close(); }
}
async function checkpoint(path, value) {
  const next=path+'.next';
  if(await exists(next)){const s=await lstat(next);if(!s.isFile()||s.isSymbolicLink())fail('UNSAFE_CACHE','Unsafe interrupted checkpoint.');await unlink(next);}
  await writeNew(next,jsonBytes(value));await rename(next,path);
}
async function readJSON(path) { try { return JSON.parse((await read(path, 16_384)).toString('utf8')); } catch(e) { if(e instanceof SyntaxError)fail('CACHE_CORRUPT','Invalid cache metadata.');throw e; } }
const headersObject = headers => Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
function header(headers,name){const value=headers[name];if(value!==undefined&&(typeof value!=='string'||value.length>1024))fail('INVALID_RESPONSE','Unsupported HTTP header.');return value;}
const strongETag = value => typeof value==='string'&&/^"[\x21\x23-\x7e]{1,200}"$/.test(value)?value:null;
function checkAbort(signal){if(signal.aborted)fail('ACQUISITION_ABORTED','Acquisition cancelled or its total deadline expired.');}
async function abortable(work,signal){
  checkAbort(signal);let listener;
  const stopped=new Promise((_,reject)=>{listener=()=>reject(new AcquisitionError('ACQUISITION_ABORTED','Acquisition cancelled or its total deadline expired.'));signal.addEventListener('abort',listener,{once:true});});
  try{return await Promise.race([work,stopped]);}finally{signal.removeEventListener('abort',listener);}
}
/** Exact HTTPS only; no redirects, credentials, cookies, decompression or retries. */
export function httpsTransport(url,{headers,signal}){
  assertAllowedURL(url);
  return new Promise((resolve,reject)=>{
    const req=request(url,{method:'GET',headers,signal},res=>resolve({status:res.statusCode,headers:res.headers,body:res,close:()=>res.destroy()}));
    req.once('error',reject);req.end();
  });
}
export function entryPath(root,a){validateApproval(a);return join(resolve(root),`${a.id}-${a.resource.sha256}`);}
function validateState(s,a){
  if(!s||s.schema_version!=='astra.acquisition-progress.v1'||s.approval_sha256!==approvalHash(a)||s.source_id!==a.id||!Number.isSafeInteger(s.bytes)||s.bytes<0||s.bytes>a.resource.bytes||!isHash(s.prefix_sha256)||!isInstant(s.started_at)||s.last_received_at!==null&&!isInstant(s.last_received_at)||!Number.isSafeInteger(s.requests)||s.requests<0||s.requests>MAX_REQUESTS||typeof s.response_complete!=='boolean'||s.etag!==null&&!strongETag(s.etag))fail('CACHE_CORRUPT','Partial state does not match the pinned approval.');
  if(s.last_received_at!==null&&Date.parse(s.last_received_at)<Date.parse(s.started_at))fail('CACHE_CORRUPT','Receipt time precedes acquisition start.');
  if(s.failure)fail('REJECTED_PARTIAL','A rejected partial is preserved for inspection; use a separate cache for a newly approved attempt.');
}
function makeManifest(a,s){return {schema_version:'astra.scientific-source.v1',source_id:a.id,approval_sha256:approvalHash(a),repository:a.repository,
  publication:structuredClone(a.publication),rights:structuredClone(a.rights),scope:structuredClone(a.scope),original:structuredClone(a.resource),
  retrieval:{started_at:s.started_at,completed_at:s.last_received_at,etag:s.etag,requests:s.requests,method:'HTTPS GET',redirects:0}};}
export async function verifyCache({root,approval}){
  validateApproval(approval);const base=resolve(root),s=await lstat(base);
  if(!s.isDirectory()||s.isSymbolicLink())fail('UNSAFE_CACHE','Cache root must be a regular directory.');
  const entry=entryPath(await realpath(base),approval),dir=await lstat(entry);
  if(!dir.isDirectory()||dir.isSymbolicLink())fail('UNSAFE_CACHE','Cache entry must be a regular directory.');
  const manifest=await readJSON(join(entry,'manifest.json'));const progress=await readJSON(join(entry,'progress.json'));validateState(progress,approval);
  if(!progress.response_complete||progress.bytes!==approval.resource.bytes||!isInstant(progress.last_received_at)||Date.parse(progress.last_received_at)<Date.parse(progress.started_at)||stableJSON(manifest)!==stableJSON(makeManifest(approval,progress)))fail('CACHE_CORRUPT','Manifest does not match its approval and completed receipt record.');
  const bytes=await read(join(entry,approval.resource.file),MAX_SAMPLE_BYTES);validateOriginal(bytes,approval);
  if(progress.prefix_sha256!==sha256(bytes))fail('HASH_MISMATCH','Completed cache receipt hash differs.');
  return {entry,manifest,bytes:bytes.length,sha256:sha256(bytes),network_requests:0};
}
export async function acquire({root,approval,transport=httpsTransport,signal:externalSignal,deadlineMs=MAX_DEADLINE_MS,clock=()=>new Date().toISOString()}){
  validateApproval(approval);
  if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>MAX_DEADLINE_MS)fail('INVALID_LIMIT','Use a positive integer deadline at most 15000 ms.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),deadlineMs),abort=()=>controller.abort();
  if(externalSignal?.aborted)controller.abort();externalSignal?.addEventListener('abort',abort,{once:true});
  const signal=controller.signal;let lock,lockPath,response,state,progressPath,stage,networkRequests=0;
  const expires=performance.now()+deadlineMs;
  const guard=()=>{if(performance.now()>=expires)controller.abort();checkAbort(signal);};
  try{
    guard();const base=await directory(resolve(root)),entry=entryPath(base,approval);
    if(await exists(entry))return await verifyCache({root:base,approval});
    lockPath=join(base,`.${approval.id}.lock`);
    try{lock=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|NOFOLLOW,0o600);}catch(e){if(e.code==='EEXIST')fail('CACHE_BUSY','Another acquisition or a leftover lock requires operator inspection.');throw e;}
    // A second process may have committed immediately before this lock was acquired.
    if(await exists(entry))return await verifyCache({root:base,approval});
    stage=join(base,`.${approval.id}-${approval.resource.sha256}.partial`);
    const fresh=!(await exists(stage));await directory(stage);progressPath=join(stage,'progress.json');const raw=join(stage,approval.resource.file);
    if(fresh){state={schema_version:'astra.acquisition-progress.v1',source_id:approval.id,approval_sha256:approvalHash(approval),bytes:0,prefix_sha256:sha256(Buffer.alloc(0)),etag:null,started_at:clock(),last_received_at:null,requests:0,response_complete:false};await writeNew(raw,Buffer.alloc(0));await checkpoint(progressPath,state);}
    else state=await readJSON(progressPath);
    validateState(state,approval);let prefix=await read(raw,MAX_SAMPLE_BYTES);
    if(prefix.length<state.bytes||sha256(prefix.subarray(0,state.bytes))!==state.prefix_sha256)fail('HASH_MISMATCH','Partial prefix failed integrity verification.');
    // Only an uncommitted tail in our partial directory may be truncated after a crash.
    if(prefix.length>state.bytes){const f=await open(raw,constants.O_WRONLY|NOFOLLOW);try{await f.truncate(state.bytes);await f.sync();}finally{await f.close();}prefix=prefix.subarray(0,state.bytes);}
    if(!state.response_complete){
      if(state.bytes===approval.resource.bytes)fail('INCOMPLETE_RESPONSE','Complete-length partial lacks confirmed HTTP completion; no silent acceptance or automatic retry.');
      if(state.requests>=MAX_REQUESTS)fail('REQUEST_LIMIT','Explicit acquisition attempts exhausted the four-request bound.');
      const offset=state.bytes,headers={Accept:approval.resource.media_type,'Accept-Encoding':'identity','User-Agent':'ASTRA-N07-01/1.0'};
      if(offset){headers.Range=`bytes=${offset}-`;if(state.etag)headers['If-Range']=state.etag;}
      state.requests++;await checkpoint(progressPath,state);guard();
      networkRequests++;response=await abortable(transport(approval.resource.url,{headers,signal}),signal);
      const h=headersObject(response.headers),mime=header(h,'content-type')?.split(';')[0].trim().toLowerCase();
      if(response.status!==(offset?206:200))fail('HTTP_STATUS','Expected a complete 200 or exact-range 206 response; redirects and range restarts are refused.');
      if(mime!==approval.resource.media_type||header(h,'content-encoding')&&header(h,'content-encoding')!=='identity')fail('UNSUPPORTED_CONTENT','Require the exact approved uncompressed media type.');
      const length=header(h,'content-length');if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)!==approval.resource.bytes-offset))fail('SIZE_MISMATCH','HTTP size does not match the reviewed original.');
      const range=header(h,'content-range');if(offset?range!==`bytes ${offset}-${approval.resource.bytes-1}/${approval.resource.bytes}`:range!==undefined)fail('INVALID_RANGE','Range response does not exactly continue the verified prefix.');
      const etag=strongETag(header(h,'etag'));if(offset&&state.etag&&state.etag!==etag)fail('ETAG_CHANGED','The source validator changed during resumption.');
      state.etag=etag;await checkpoint(progressPath,state);let current=prefix;
      const iterator=response.body[Symbol.asyncIterator]();const f=await open(raw,constants.O_WRONLY|constants.O_APPEND|NOFOLLOW);
      try{
        for(;;){guard();const part=await abortable(iterator.next(),signal);guard();if(part.done)break;
          if(!(part.value instanceof Uint8Array)||current.length+part.value.length>approval.resource.bytes)fail('SIZE_MISMATCH','Body type or size exceeds the reviewed bound.');
          if(!part.value.length)continue;
          const chunk=Buffer.from(part.value);await f.writeFile(chunk);await f.sync();current=Buffer.concat([current,chunk]);
          state.bytes=current.length;state.prefix_sha256=sha256(current);state.last_received_at=clock();await checkpoint(progressPath,state);
        }
      }finally{await f.close();}
      if(state.bytes!==approval.resource.bytes)fail('TRANSPORT_INTERRUPTED','Response ended early; verified partial retained for an explicit resume.');
      validateOriginal(current,approval);guard();state.response_complete=true;validateState(state,approval);await checkpoint(progressPath,state);
    }
    validateOriginal(await read(raw,MAX_SAMPLE_BYTES),approval);guard();
    if(await exists(join(stage,'manifest.json'))){const m=await readJSON(join(stage,'manifest.json'));if(stableJSON(m)!==stableJSON(makeManifest(approval,state)))fail('CACHE_CORRUPT','Interrupted manifest differs from the completed receipt.');}
    else await writeNew(join(stage,'manifest.json'),jsonBytes(makeManifest(approval,state)));
    validateState(state,approval);guard();await rename(stage,entry);return {...await verifyCache({root:base,approval}),network_requests:networkRequests};
  }catch(e){
    if(state&&progressPath&&e instanceof AcquisitionError&&!['ACQUISITION_ABORTED','TRANSPORT_INTERRUPTED','INCOMPLETE_RESPONSE','REQUEST_LIMIT','REJECTED_PARTIAL'].includes(e.code)){
      state.failure={code:e.code,at:clock()};await checkpoint(progressPath,state).catch(()=>{});
    }
    throw e;
  }finally{
    clearTimeout(timer);externalSignal?.removeEventListener('abort',abort);response?.close?.();
    if(lock){await lock.close();await unlink(lockPath);}
  }
}
