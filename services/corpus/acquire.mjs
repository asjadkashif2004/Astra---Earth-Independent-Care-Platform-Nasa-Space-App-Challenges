import { request } from 'node:https';
import { open, lstat, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { directory, read, writeNew, abortable } from '../acquisition/cache.mjs';
import { assertPublicationURL, validatePDF, fail, sha256, sourceByID, isInstant,ORIGINAL_SHA } from './sources.mjs';

// Reuse N07 filesystem/abort primitives; this transport has its own exact two-PDF policy.
export function publicationTransport(url,{signal,headers}){
  assertPublicationURL(url);
  return new Promise((resolve,reject)=>{const req=request(url,{headers,signal},res=>resolve({status:res.statusCode,headers:res.headers,body:res,close:()=>res.destroy()}));req.once('error',reject);req.end();});
}
export async function acquirePublication({root,id,transport=publicationTransport,clock=()=>new Date().toISOString()}){
  const s=sourceByID(id),base=await directory(root),destination=join(base,s.file),attempt=join(base,s.id+'.attempt.json');
  // Durable exclusive tombstone precedes network. Failed attempts are never retried automatically.
  await writeNew(attempt,Buffer.from(JSON.stringify({id,url:s.url,started_at:clock(),attempts:1})+'\n'));
  const started_at=clock(),start=performance.now(),control=new AbortController(),timer=setTimeout(()=>control.abort(),s.deadline_ms);
  let response,handle,count=0;
  const partial=destination+'.partial';
  const guard=()=>{if(performance.now()-start>=s.deadline_ms||control.signal.aborted){control.abort();fail('ACQUISITION_ABORTED','Publication deadline exceeded.');}};
  try{
    handle=await open(partial,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600);
    guard();
    response=await abortable(transport(s.url,{signal:control.signal,headers:{Accept:'application/pdf','Accept-Encoding':'identity','User-Agent':'ASTRA-N13-01/1.0'}}),control.signal);
    guard();
    const h=response.headers;
    if(response.status!==200||h['content-range']!==undefined)fail('HTTP_STATUS','Complete HTTP 200 required; redirects/ranges are not followed.');
    if(h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/pdf'||h['content-encoding']!==undefined&&h['content-encoding']!=='identity')fail('UNSUPPORTED_CONTENT','Original uncompressed PDF required.');
    if(h['content-length']!==String(s.bytes))fail('SIZE_MISMATCH','HTTP size must match the preflight official HEAD size.');
    const iterator=response.body[Symbol.asyncIterator]();
    for(;;){guard();const next=await abortable(iterator.next(),control.signal);guard();if(next.done)break;
      if(!(next.value instanceof Uint8Array)||count+next.value.length>s.bytes)fail('SIZE_MISMATCH','Publication exceeded its exact byte ceiling.');
      await handle.writeFile(next.value);count+=next.value.length;
    }
    if(performance.now()-start>=s.deadline_ms||control.signal.aborted)fail('ACQUISITION_ABORTED','Publication deadline exceeded.');
    await handle.sync();await handle.close();handle=null;
    const bytes=await read(partial,s.bytes),hash=validatePDF(bytes,s);
    if(hash!==ORIGINAL_SHA[s.id])fail('HASH_MISMATCH','Original differs from the pinned reviewed snapshot.');
    if(performance.now()-start>=s.deadline_ms||control.signal.aborted)fail('ACQUISITION_ABORTED','Publication deadline exceeded before promotion.');
    const receipt={schema_version:'astra.publication-receipt.v1',id:s.id,url:s.url,filename:s.file,bytes:count,sha256:hash,started_at,completed_at:clock(),network_ms:Math.ceil(performance.now()-start),http_status:200,requests:1,redirects:0,response_complete:true,publisher_checksum:null,checksum_note:'SHA-256 computed from complete local original; no independent publisher checksum supplied.',etag:typeof h.etag==='string'?h.etag:null};
    try{await lstat(destination);fail('CACHE_EXISTS','Original already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}
    await rename(partial,destination);await writeNew(join(base,s.id+'.receipt.json'),Buffer.from(JSON.stringify(receipt,null,2)+'\n'));
    return receipt;
  }catch(e){
    await writeNew(join(base,s.id+'.failure.json'),Buffer.from(JSON.stringify({id:s.id,failed_at:clock(),bytes:count,code:e.code??e.name,message:e.message,partial:count>0?s.file+'.partial':null,complete:false},null,2)+'\n')).catch(()=>{});
    throw e;
  }finally{clearTimeout(timer);control.abort();response?.close?.();await handle?.close();}
}
export async function verifyOriginal(root,spec,receipt){
  const s=sourceByID(spec.id);
  if(receipt?.sha256!==ORIGINAL_SHA[s.id])fail('HASH_MISMATCH','Original receipt differs from the reviewed complete-original pin.');
  if(receipt?.id!==s.id||receipt.url!==s.url||receipt.filename!==s.file||receipt.bytes!==s.bytes||receipt.requests!==1||receipt.redirects!==0||receipt.response_complete!==true||receipt.http_status!==200||!isInstant(receipt.started_at)||!isInstant(receipt.completed_at)||receipt.completed_at<receipt.started_at||!Number.isSafeInteger(receipt.network_ms)||receipt.network_ms<0||receipt.network_ms>s.deadline_ms)fail('PROVENANCE_MISMATCH','Invalid complete-original receipt.');
  const bytes=await read(join(root,s.file),s.bytes);
  if(validatePDF(bytes,s)!==receipt.sha256)fail('HASH_MISMATCH','Original no longer matches its receipt.');
  return {bytes:bytes.length,sha256:sha256(bytes)};
}
