import {open,mkdir,lstat,readdir,rename,realpath,unlink,readFile} from 'node:fs/promises';
import {constants as C} from 'node:fs';import {tmpdir} from 'node:os';import {resolve,dirname,basename,join} from 'node:path';import {randomUUID} from 'node:crypto';
import {readPinned} from '../acquisition/local-source.mjs';import {PROJECT} from '../corpus/catalog.mjs';
import {authorize,check,canonical,snapshot,descriptor,search,reverifyService,validateRequest,VERSION} from './research-service.mjs';import {sha256,hashJSON} from './contract.mjs';
const active=new Set(),nameOK=n=>/^receipt-[a-f0-9]{64}$/.test(n),hash=v=>sha256(canonical(v));
const decode=b=>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{check(false,'INVALID_RECEIPT_JSON');}};
const keys=(v,w)=>v&&Object.keys(v).sort().join('|')===w.sort().join('|');
async function area(root,create=false){
 const target=resolve(root),project=await realpath(PROJECT),task=join(project,'artifacts/n14-engineering-20261104'),temp=await realpath(tmpdir());check(target===task||target.startsWith(task+'/')||dirname(target)===temp&&basename(target).startsWith('astra-n14-'),'OUTPUT_NOT_ALLOWED');
 const parents=[];let p=target;for(;;){parents.push(p);if(dirname(p)===p)break;p=dirname(p);}for(const q of parents.reverse()){try{const s=await lstat(q);check(s.isDirectory()&&!s.isSymbolicLink(),'UNSAFE_OUTPUT');}catch(e){if(e.code!=='ENOENT'||!create)throw e;await mkdir(q,{mode:0o700});}}check(await realpath(target)===target,'UNSAFE_OUTPUT');return target;
}
async function codePins(){const files=['services/research-retrieval/research-service.mjs','services/research-retrieval/research-receipts.mjs','services/research-retrieval/retrieval.mjs','services/research-retrieval/matched-experiment.mjs','services/research-retrieval/hybrid-diagnostic.mjs'];return Object.fromEntries(await Promise.all(files.map(async p=>[p,sha256(await readPinned(PROJECT,p,null,100000))])));}
function identity(request,scope,source){return hash({request,scope,source});}
export async function recoverSearch(directory,context,token,{signal}={}){
 authorize(token);check(!signal?.aborted,'CANCELLED');await reverifyService(context,token,{signal});const root=await area(dirname(resolve(directory))),name=basename(directory);check(nameOK(name),'RECEIPT_ID');
 check((await readdir(join(root,name))).sort().join('|')==='COMMITTED.json|record.json','INCOMPLETE_RECEIPT');
 const raw=await readPinned(root,name+'/record.json',null,2097152,signal),record=decode(raw),ackRaw=await readPinned(root,name+'/COMMITTED.json',null,4096,signal),ack=decode(ackRaw);
 check(raw.equals(canonical(record))&&keys(record,['schema_version','service_version','request','scope','source','engine_hashes','result'])&&record.schema_version==='astra.n14.receipt.v1'&&record.service_version===VERSION,'RECEIPT_SCHEMA');
 const s=snapshot(context,token),source=descriptor(context,token);check(hashJSON(record.scope)===hashJSON(s.scope)&&hashJSON(record.source)===hashJSON(source)&&name==='receipt-'+identity(record.request,s.scope,source),'RECEIPT_BINDING');
 check(keys(ack,['schema_version','record_sha256','parent_sync_acknowledged'])&&ackRaw.equals(canonical(ack))&&ack.schema_version==='astra.n14.commit.v1'&&ack.record_sha256===sha256(raw)&&ack.parent_sync_acknowledged===true,'DURABLE_ACK');
 check(hashJSON(record.engine_hashes)===hashJSON(await codePins()),'RECEIPT_ENGINE_CHANGED');
 const current=await search(context,token,record.request,{signal});check(hashJSON(current)===hashJSON(record.result),'RECEIPT_RESULT_MISMATCH');
 return {schema_version:'astra.n14.recovery.v1',status:'VERIFIED_COMMITTED_RESULT',directory:join(root,name),record_sha256:sha256(raw),result:record.result,ranking_verifications:1,model_inference_replays:0,new_query_commits:0,scientific_approval:false};
}
export async function commitSearch(root,context,token,request,{signal,hook=async()=>{}}={}){
 authorize(token);const s=snapshot(context,token);request=validateRequest(request,s.scope);const source=descriptor(context,token),name='receipt-'+identity(request,s.scope,source),path=await area(root,true);check(!active.has(path),'PUBLICATION_BUSY');active.add(path);let parent,stageHandle,lock,lockStat,parentStat;
 const start=performance.now(),guard=async event=>{check(!signal?.aborted,'CANCELLED');check(performance.now()-start<120000,'DEADLINE');await hook(event);check(!signal?.aborted,'CANCELLED');};
 try{
  await guard('admission');parent=await open(path,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);parentStat=await parent.stat();const fd='/proc/self/fd/'+parent.fd;
  lock=await open(fd+'/.publish.lock',C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);lockStat=await lock.stat();await lock.writeFile('N14 publication\n');await lock.sync();
  try{await lstat(fd+'/'+name);return {...await recoverSearch(join(path,name),context,token,{signal}),reused:true};}catch(e){if(e.code!=='ENOENT')throw e;}
  const entries=await readdir(path);check(entries.filter(nameOK).length<16&&entries.filter(n=>n.startsWith('.stage-')).length<16,'RECEIPT_CAPACITY');
  const result=await search(context,token,request,{signal}),record={schema_version:'astra.n14.receipt.v1',service_version:VERSION,request:structuredClone(request),scope:s.scope,source,engine_hashes:await codePins(),result},bytes=canonical(record);check(bytes.length<=2097152,'RECEIPT_SIZE');
  await guard('before_stage');const stage='.stage-'+randomUUID();await mkdir(fd+'/'+stage,{mode:0o700});stageHandle=await open(fd+'/'+stage,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);const at='/proc/self/fd/'+stageHandle.fd;
  await guard('before_write');const file=await open(at+'/record.json',C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);try{await file.writeFile(bytes);await guard('before_sync');await file.sync();}finally{await file.close();}
  await stageHandle.sync();await reverifyService(context,token,{signal});await guard('before_rename');const held=await stageHandle.stat(),named=await lstat(fd+'/'+stage);check(named.isDirectory()&&!named.isSymbolicLink()&&held.ino===named.ino&&held.dev===named.dev,'OUTPUT_REPLACED');await rename(fd+'/'+stage,fd+'/'+name);await guard('before_parent_ack');await parent.sync();await stageHandle.close();stageHandle=null;await parent.close();parent=null;
  await guard('before_commit_ack');const final=await open(join(path,name),C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW),ack=await open('/proc/self/fd/'+final.fd+'/COMMITTED.json',C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);
  try{await ack.writeFile(canonical({schema_version:'astra.n14.commit.v1',record_sha256:sha256(bytes),parent_sync_acknowledged:true}));await guard('before_ack_sync');await ack.sync();await final.sync();}finally{await ack.close();await final.close();}
  await guard('before_readback');return {...await recoverSearch(join(path,name),context,token,{signal}),reused:false};
 }finally{try{if(stageHandle)await stageHandle.close();if(lock){await lock.close();const now=await lstat(path);check(now.dev===parentStat.dev&&now.ino===parentStat.ino&&!now.isSymbolicLink(),'OUTPUT_REPLACED');const p=await open(path,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);try{const anchored='/proc/self/fd/'+p.fd+'/.publish.lock',held=await lstat(anchored);check(held.isFile()&&!held.isSymbolicLink()&&held.dev===lockStat.dev&&held.ino===lockStat.ino&&held.nlink===1,'LOCK_REPLACED');await unlink(anchored);await p.sync();}finally{await p.close();}}}finally{if(parent)await parent.close();active.delete(path);}}
}
