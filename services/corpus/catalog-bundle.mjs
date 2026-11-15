import { open,mkdir,lstat,readdir,rename,realpath,unlink } from 'node:fs/promises';
import { constants as C } from 'node:fs';import { tmpdir } from 'node:os';import { resolve,dirname,basename,join } from 'node:path';import { randomUUID } from 'node:crypto';
import { readPinned } from '../acquisition/local-source.mjs';
import { PROJECT,LIMIT,VERSION,INPUT_PIN,authorize,check,encode,hash,json,compileCatalog,loadCatalogContext,reverifyCatalogContext,verifyCatalogPayload } from './catalog.mjs';
import { sha256 } from './sources.mjs';
const active=new Set(),validName=n=>/^bundle-[a-f0-9]{64}$/.test(n);
async function area(root,{create=false}={}){
 const target=resolve(root),project=await realpath(PROJECT),task=join(project,'artifacts/n13-engineering-20261104'),temp=await realpath(tmpdir());check(target===task||target.startsWith(task+'/')||dirname(target)===temp&&basename(target).startsWith('astra-n13-'),'OUTPUT_NOT_ALLOWED');
 const ancestors=[];let p=target;for(;;){ancestors.push(p);if(dirname(p)===p)break;p=dirname(p);}for(const q of ancestors.reverse()){try{const s=await lstat(q);check(s.isDirectory()&&!s.isSymbolicLink(),'UNSAFE_OUTPUT');}catch(e){if(e.code!=='ENOENT'||!create)throw e;await mkdir(q,{mode:0o700});}}
 check(await realpath(target)===target,'UNSAFE_OUTPUT');return target;
}
async function readPayload(root,name,cap,{signal,visited=new Set()}={}){
 authorize(cap);check(validName(name)&&!visited.has(name)&&visited.size<LIMIT.bundles,'BUNDLE_ID_OR_CYCLE');visited.add(name);
 const raw=await readPinned(root,name+'/manifest.json',null,32768,signal),m=json(raw);check(Object.keys(m).sort().join('|')==='files|input_register_sha256|parent|revision|schema_version|tool_version'&&raw.equals(encode(m))&&m.schema_version==='astra.n13.bundle.v1'&&m.tool_version===VERSION&&m.input_register_sha256===INPUT_PIN&&name==='bundle-'+hash(m)&&Number.isSafeInteger(m.revision)&&m.revision>=1,'BUNDLE_MANIFEST');
 check(m.parent===null?m.revision===1:validName(m.parent)&&m.revision>1,'BUNDLE_PARENT');if(m.parent){const parent=await readPayload(root,m.parent,cap,{signal,visited});check(parent.manifest.revision+1===m.revision,'BUNDLE_PARENT_REVISION');}
 const names=Object.keys(m.files??{}).sort();check(names.length>=1&&names.length<=LIMIT.files&&names.every(n=>/^[A-Za-z0-9_.-]+$/.test(n)),'BUNDLE_FILES');check((await readdir(join(root,name))).sort().join('|')===[...names,'manifest.json','COMMITTED.json'].sort().join('|'),'INCOMPLETE_OR_UNEXPECTED_BUNDLE');
 const receiptRaw=await readPinned(root,name+'/COMMITTED.json',null,32768,signal),receipt=json(receiptRaw);check(Object.keys(receipt).sort().join('|')==='manifest_sha256|parent_directory_sync_acknowledged|schema_version|source_register_sha256'&&receiptRaw.equals(encode(receipt))&&receipt.schema_version==='astra.n13.commit.v1'&&receipt.manifest_sha256===hash(m)&&receipt.source_register_sha256===INPUT_PIN&&receipt.parent_directory_sync_acknowledged===true,'COMMIT_ACK');const payload={};let total=0;
 for(const n of names){const s=m.files[n];check(s&&Object.keys(s).sort().join('|')==='bytes|sha256'&&Number.isSafeInteger(s.bytes)&&s.bytes>=1&&s.bytes<=LIMIT.payload&&/^[a-f0-9]{64}$/.test(s.sha256),'BUNDLE_LIMIT');const bytes=await readPinned(root,name+'/'+n,s.sha256,s.bytes,signal);check(bytes.length===s.bytes,'BUNDLE_SIZE');payload[n]=bytes;total+=bytes.length;check(total<=LIMIT.payload,'BUNDLE_LIMIT');}return {manifest:m,payload};
}
export async function recoverCatalog(directory,cap,{signal}={}){
 authorize(cap);const root=await area(dirname(resolve(directory))),name=basename(directory),saved=await readPayload(root,name,cap,{signal}),context=await loadCatalogContext(cap,{signal});verifyCatalogPayload(context,cap,saved.payload);
 return {status:'VERIFIED_COMMITTED_CATALOG',directory:join(root,name),manifest_sha256:hash(saved.manifest),revision:saved.manifest.revision,parent:saved.manifest.parent,catalog_sha256:hash(json(saved.payload['catalog.json'])),sources:2,evidence_units:33,evidence_spans:34,questions:40,independent_approvals:0,replayed_acquisitions:0,replayed_extractions:0,scientific_approval:false,context};
}
export async function publishCatalog(root,context,cap,{parent=null,signal,hook=async()=>{}}={}){
 authorize(cap,'review');const path=await area(root,{create:true});check(!active.has(path),'PUBLICATION_BUSY');active.add(path);let handle,stageHandle,lock,lockIdentity,rootIdentity;const started=performance.now(),guard=async(stage,name)=>{check(!signal?.aborted,'CANCELLED');check(performance.now()-started<LIMIT.deadline,'DEADLINE');await hook(stage,name);check(!signal?.aborted,'CANCELLED');};
 try{
  handle=await open(path,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);rootIdentity=await handle.stat();const fd='/proc/self/fd/'+handle.fd;
  lock=await open(fd+'/.publish.lock',C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);lockIdentity=await lock.stat();await lock.writeFile('N13 owner-bound publication\n');await lock.sync();
  let revision=1;if(parent){check(validName(parent),'BUNDLE_PARENT');const old=await recoverCatalog(join(path,parent),cap,{signal});revision=old.revision+1;}
  const payload=compileCatalog(context,cap),names=Object.keys(payload).sort();check(names.length<=LIMIT.files&&Object.values(payload).reduce((n,b)=>n+b.length,0)<=LIMIT.payload,'BUNDLE_LIMIT');
  const manifest={schema_version:'astra.n13.bundle.v1',tool_version:VERSION,input_register_sha256:INPUT_PIN,revision,parent,files:Object.fromEntries(names.map(n=>[n,{sha256:sha256(payload[n]),bytes:payload[n].length}]))},name='bundle-'+hash(manifest);
  try{await lstat(fd+'/'+name);return {...await recoverCatalog(join(path,name),cap,{signal}),reused:true};}catch(e){if(e.code!=='ENOENT')throw e;}
  const entries=await readdir(path);check(entries.filter(validName).length<LIMIT.bundles&&entries.filter(n=>n.startsWith('.stage-')).length<LIMIT.bundles,'BUNDLE_CAPACITY');await guard('before_stage');const stage='.stage-'+randomUUID();await mkdir(fd+'/'+stage,{mode:0o700});stageHandle=await open(fd+'/'+stage,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);const at='/proc/self/fd/'+stageHandle.fd;
  for(const [n,b]of[...names.map(n=>[n,payload[n]]),['manifest.json',encode(manifest)]]){await guard('before_write',n);const f=await open(at+'/'+n,C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);try{await f.writeFile(b);await guard('before_file_sync',n);await f.sync();}finally{await f.close();}}
  await guard('before_directory_sync');await stageHandle.sync();await reverifyCatalogContext(context,cap,{signal});await guard('before_rename');const held=await stageHandle.stat(),named=await lstat(fd+'/'+stage);check(named.isDirectory()&&!named.isSymbolicLink()&&named.ino===held.ino&&named.dev===held.dev,'OUTPUT_REPLACED');await rename(fd+'/'+stage,fd+'/'+name);await guard('before_parent_ack');await handle.sync();
  await stageHandle.close();stageHandle=null;await handle.close();handle=null;
  // Close the renamed directory handle before reacquiring by its final name on
  // this workspace's filesystem (the N07 retained disposable probe).
  await guard('before_commit_ack');const final=await open(join(path,name),C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW),receipt=await open('/proc/self/fd/'+final.fd+'/COMMITTED.json',C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);
  try{await receipt.writeFile(encode({schema_version:'astra.n13.commit.v1',manifest_sha256:hash(manifest),source_register_sha256:INPUT_PIN,parent_directory_sync_acknowledged:true}));await receipt.sync();await final.sync();}finally{await receipt.close();await final.close();}
  await guard('before_final_readback');return {...await recoverCatalog(join(path,name),cap,{signal}),reused:false};
 }finally{try{if(stageHandle)await stageHandle.close();if(lock){await lock.close();await area(path);const current=await lstat(path);check(current.dev===rootIdentity.dev&&current.ino===rootIdentity.ino,'OUTPUT_REPLACED');const parent=await open(path,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);try{const anchored='/proc/self/fd/'+parent.fd+'/.publish.lock',s=await lstat(anchored);check(s.isFile()&&!s.isSymbolicLink()&&s.dev===lockIdentity.dev&&s.ino===lockIdentity.ino&&s.nlink===1,'LOCK_REPLACED');await unlink(anchored);await parent.sync();}finally{await parent.close();}}}finally{if(handle)await handle.close();active.delete(path);}}
}
