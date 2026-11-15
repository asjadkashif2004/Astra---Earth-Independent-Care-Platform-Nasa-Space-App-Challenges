// Offline N07 only. No application constructor, network transport or database.
import { open,lstat,realpath } from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { fail,sha256,stableJSON,approvalHash,isInstant } from './validation.mjs';
import { validateOriginal } from './source.mjs';
import { validateBIDMCNotice,validateBIDMCCard,validateBIDMCSplit,buildBIDMCCard } from './bidmc.mjs';
import { validateDatasetCard,validateSplitManifest,buildDatasetCard } from './osdr.mjs';
export const PROJECT=fileURLToPath(new URL('../../',import.meta.url));
export const REGISTRY_SHA='acfc8ea25598be0941835ef61a533ebf2728c13786b12baede04f39039720d66';
const contexts=new WeakMap(),callers=new WeakMap();
const check=(ok,code)=>{if(!ok)fail(code,'N07 local evidence rejected: '+code);};
export const hashObject=v=>sha256(stableJSON(v));
const cancelled=signal=>check(!signal?.aborted,'CANCELLED');
const identity=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].map(String).join(':');
/** Linux fd-anchored, bounded read. Never follows caller/source symlinks. */
export async function readPinned(root,relative,pin,limit=65536,signal){
  cancelled(signal);check(typeof relative==='string'&&relative.length<512&&!relative.startsWith('/')&&!relative.includes('\\')
    &&relative.split('/').every(s=>s&&s!=='.'&&s!=='..'&&!s.includes(':')),'UNSAFE_PATH');
  const canonical=await realpath(root),rs=await lstat(root);check(rs.isDirectory()&&!rs.isSymbolicLink(),'UNSAFE_PATH');
  const handles=[];
  try{
    let parent=await open(canonical,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);handles.push(parent);
    const parts=relative.split('/');
    for(const part of parts.slice(0,-1)){
      cancelled(signal);parent=await open('/proc/self/fd/'+parent.fd+'/'+part,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);handles.push(parent);
    }
    const path='/proc/self/fd/'+parent.fd+'/'+parts.at(-1),f=await open(path,C.O_RDONLY|C.O_NOFOLLOW);handles.push(f);
    const before=await f.stat({bigint:true});check(before.isFile()&&before.nlink===1n&&before.size<=BigInt(limit),'UNSAFE_FILE');
    const buffer=Buffer.alloc(limit+1);let length=0;
    while(length<buffer.length){cancelled(signal);const r=await f.read(buffer,length,buffer.length-length,null);if(!r.bytesRead)break;length+=r.bytesRead;}
    check(length<=limit,'SIZE_LIMIT');const after=await f.stat({bigint:true}),named=await lstat(path,{bigint:true});
    check(identity(before)===identity(after)&&identity(after)===identity(named)&&named.nlink===1n,'SOURCE_REPLACED');
    const bytes=buffer.subarray(0,length);check(!pin||sha256(bytes)===pin,'HASH_MISMATCH');cancelled(signal);return bytes;
  }finally{for(const f of handles.reverse())await f.close();}
}
const json=b=>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{fail('INVALID_JSON','Invalid UTF-8 JSON metadata.');}};
export async function localRegistry(signal){return json(await readPinned(PROJECT,'data/scientific/n07-local-registry.json',REGISTRY_SHA,65536,signal));}
/** Launcher function, not an HTTP/LLM caller argument. Capability is process-local. */
export function trustedLocalCaller(role){
  check(['researcher','demo_admin'].includes(role),'UNAUTHORIZED');const token=Object.freeze({scope:'N07 local research only'});callers.set(token,role);return token;
}
export function authorizeLocal(token){check(callers.has(token),'UNAUTHORIZED');return callers.get(token);}
export function requireActiveRegistration(entry){check(entry?.status==='ACTIVE_LOCAL_ONLY','SOURCE_EXCLUDED_OR_REVOKED');return entry;}
export async function loadLocalSource(sourceId,token,{signal}={}){
  authorizeLocal(token);const registry=await localRegistry(signal),entry=registry.sources.find(r=>r.id===sourceId);check(entry,'SOURCE_NOT_ALLOWED');
  requireActiveRegistration(entry);
  const files={};
  for(const [kind,spec] of Object.entries(entry.files)){
    const bytes=await readPinned(PROJECT,spec.path,spec.sha256,65536,signal);check(bytes.length===spec.bytes,'SIZE_MISMATCH');files[kind]=bytes;
  }
  const approval=json(files.approval),manifest=json(files.manifest),progress=json(files.progress);
  const parsed=validateOriginal(files.original,approval);
  check(manifest.schema_version==='astra.scientific-source.v1'&&manifest.source_id===sourceId&&approval.id===sourceId
    &&manifest.approval_sha256===approvalHash(approval)&&progress.approval_sha256===approvalHash(approval),'PROVENANCE_MISMATCH');
  for(const key of ['publication','rights','scope'])check(stableJSON(manifest[key])===stableJSON(approval[key]),'PROVENANCE_MISMATCH');
  check(stableJSON(manifest.original)===stableJSON(approval.resource)&&progress.source_id===sourceId
    &&progress.response_complete===true&&progress.bytes===files.original.length&&progress.prefix_sha256===sha256(files.original)
    &&progress.started_at===manifest.retrieval.started_at&&progress.last_received_at===manifest.retrieval.completed_at
    &&isInstant(progress.started_at)&&isInstant(progress.last_received_at)&&progress.started_at<=progress.last_received_at
    &&progress.requests===manifest.retrieval.requests&&Number.isSafeInteger(progress.requests)&&progress.requests>=1&&progress.requests<=4
    &&manifest.retrieval.method==='HTTPS GET'&&manifest.retrieval.redirects===0,'PROVENANCE_MISMATCH');
  const legacy={approval,manifest,bytes:files.original};let legacyCard=null;
  if(sourceId==='physionet-bidmc-01-numerics'){
    validateBIDMCNotice(files.notice);validateBIDMCCard(json(files.card),legacy);validateBIDMCSplit(json(files.split),legacy);legacyCard=buildBIDMCCard(legacy);
  }else if(sourceId==='nasa-osdr-osd-1'){
    validateDatasetCard(json(files.card),legacy);validateSplitManifest(json(files.split),legacy);legacyCard=buildDatasetCard(legacy);
  }
  const context=Object.freeze({id:sourceId});contexts.set(context,{approval,manifest,files,parsed,legacyCard,entry});return context;
}
export function originalContext(context){check(contexts.has(context),'UNVERIFIED_CONTEXT');const v=contexts.get(context);
  // Copy each byte buffer: downstream annotation cannot change verified evidence.
  return {...structuredClone({...v,files:undefined}),files:Object.fromEntries(Object.entries(v.files).map(([k,b])=>[k,Buffer.from(b)]))};
}
export async function reverifyLocal(context,token,options){const before=originalContext(context);await loadLocalSource(context.id,token,options);return before.approval.resource.sha256;}
