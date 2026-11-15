import { open,mkdir,lstat,readdir,rename,realpath } from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,dirname,basename,join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fail,sha256,stableJSON,object,isHash } from './validation.mjs';
import { PROJECT,authorizeLocal,hashObject,loadLocalSource,readPinned,reverifyLocal } from './local-source.mjs';
import { buildSourceCard,consumerDescriptor,reviewPacket,validateSourceCard } from './evidence-card.mjs';
import { actualSplitReadiness } from './grouped-split.mjs';
const active=new Set(),check=(ok,code)=>{if(!ok)fail(code,'N07 bundle rejected: '+code);};
const encode=v=>Buffer.from(stableJSON(v)+'\n');
export function bundlePayload(contexts,histories,token){
  authorizeLocal(token);check(Array.isArray(contexts)&&contexts.length>=1&&contexts.length<=3&&new Set(contexts.map(c=>c.id)).size===contexts.length,'DUPLICATE_SOURCE');
  const files={};
  for(const context of [...contexts].sort((a,b)=>a.id.localeCompare(b.id))){
    const history=histories[context.id];const card=buildSourceCard(context,history);
    files[context.id+'.card.json']=encode(card);
    files[context.id+'.descriptor.json']=encode(consumerDescriptor(context,history,token));
    files[context.id+'.split.json']=encode(actualSplitReadiness(context));
    files[context.id+'.review.json']=encode(reviewPacket(card));
  }
  files['START_HERE.md']=Buffer.from('# N07 local research review bundle\n\nThree kinds of evidence remain distinct: original attribution, scientific support and population applicability.\n\nCards bind exact original bytes and structural annotations. No clinical or human scientific approval has occurred.\n\nUse the .review.json form to record APPROVE, REJECT or REQUEST CHANGES outside this packet, with reviewer identity, competence, authentication, source version and card hash. Leave this immutable bundle unchanged. Conflicting reviews require independent adjudication and owner acceptance. Any card revision invalidates prior review. The software does not activate a support rule.\n\nDescriptors are inactive research interfaces. No runtime source ingestion, telemetry, model, SQL or clinical execution is connected.\n');
  return files;
}
async function area(root){
  const path=resolve(root),canonicalProject=await realpath(PROJECT),isTask=path===join(canonicalProject,'artifacts/n07-final-20261030')
    ||path.startsWith(join(canonicalProject,'artifacts/n07-final-20261030')+'/'),isTest=dirname(path)===await realpath(tmpdir())&&basename(path).startsWith('astra-n07-final-');
  check(isTask||isTest,'OUTPUT_NOT_ALLOWED');
  // Every ancestor, not only the last component, must be a real directory.
  let current=path;for(;;){const s=await lstat(current);check(s.isDirectory()&&!s.isSymbolicLink(),'UNSAFE_OUTPUT');if(dirname(current)===current)break;current=dirname(current);}
  check(await realpath(path)===path,'UNSAFE_OUTPUT');return path;
}
export async function publishBundle(root,contexts,histories,token,{signal,hook=async()=>{}}={}){
  authorizeLocal(token);const path=await area(root);check(!active.has(path),'BUNDLE_BUSY');active.add(path);let parent,stageHandle;
  const guard=async(stage,name)=>{check(!signal?.aborted,'CANCELLED');await hook(stage,name);check(!signal?.aborted,'CANCELLED');};
  try{
    const payload=bundlePayload(contexts,histories,token),names=Object.keys(payload).sort();
    check(names.length<=32&&names.every(n=>/^[A-Za-z0-9_.-]+$/.test(n))&&Object.values(payload).reduce((a,b)=>a+b.length,0)<=2*1024*1024,'BUNDLE_LIMIT');
    const manifest={schema_version:'astra.n07.bundle.v1',tool_version:'offline-local-v1',files:Object.fromEntries(names.map(n=>[n,{sha256:sha256(payload[n]),bytes:payload[n].length}]))};
    const final='bundle-'+hashObject(manifest);parent=await open(path,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
    const anchored='/proc/self/fd/'+parent.fd;
    try{await lstat(anchored+'/'+final);return {...await recoverBundle(join(path,final),token),reused:true};}catch(e){if(e.code!=='ENOENT')throw e;}
    await guard('before_stage');const stage='.stage-'+randomUUID();await mkdir(anchored+'/'+stage,{mode:0o700});
    stageHandle=await open(anchored+'/'+stage,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);const stageAt='/proc/self/fd/'+stageHandle.fd;
    for(const [name,bytes] of [...names.map(n=>[n,payload[n]]),['manifest.json',encode(manifest)]]){
      await guard('before_write',name);const f=await open(stageAt+'/'+name,C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);
      try{await f.writeFile(bytes);await guard('before_file_sync',name);await f.sync();}finally{await f.close();}
    }
    await guard('before_directory_sync');await stageHandle.sync();
    for(const context of contexts)await reverifyLocal(context,token,{signal});
    await guard('before_rename');const named=await lstat(anchored+'/'+stage),held=await stageHandle.stat();
    check(named.isDirectory()&&!named.isSymbolicLink()&&named.dev===held.dev&&named.ino===held.ino,'OUTPUT_REPLACED');
    await rename(anchored+'/'+stage,anchored+'/'+final);await guard('before_parent_ack');await parent.sync();
    // This checkout's filesystem keeps the renamed directory unavailable by
    // its new name until the staging handles close (saved disposable probe).
    await stageHandle.close();stageHandle=null;await parent.close();parent=null;
    await guard('before_final_readback');return {...await recoverBundle(join(path,final),token),reused:false};
  }finally{if(stageHandle)await stageHandle.close();if(parent)await parent.close();active.delete(path);}
}
export async function recoverBundle(directory,token){
  authorizeLocal(token);const parent=await area(dirname(resolve(directory))),name=basename(directory);
  check(/^bundle-[a-f0-9]{64}$/.test(name),'UNCOMMITTED_BUNDLE');
  const manifest=JSON.parse((await readPinned(parent,name+'/manifest.json',null)).toString('utf8'));
  object(manifest,['schema_version','tool_version','files']);
  check(manifest.schema_version==='astra.n07.bundle.v1'&&manifest.tool_version==='offline-local-v1'&&name==='bundle-'+hashObject(manifest),'MANIFEST_MISMATCH');
  const names=Object.keys(manifest.files??{});check(names.length>0&&names.length<=32&&names.every(n=>/^[A-Za-z0-9_.-]+$/.test(n)),'BUNDLE_LIMIT');
  check((await readdir(join(parent,name))).sort().join('|')===[...names,'manifest.json'].sort().join('|'),'UNEXPECTED_FILE');
  const payload={};let total=0;
  for(const n of names){const spec=manifest.files[n];object(spec,['sha256','bytes']);check(isHash(spec.sha256)&&Number.isSafeInteger(spec.bytes)&&spec.bytes>=1&&spec.bytes<=65536,'BUNDLE_LIMIT');
    const bytes=await readPinned(parent,name+'/'+n,spec.sha256,65536);check(bytes.length===spec.bytes,'SIZE_MISMATCH');payload[n]=bytes;total+=bytes.length;}
  check(total<=2*1024*1024,'BUNDLE_LIMIT');
  const cards=names.filter(n=>n.endsWith('.card.json'));check(cards.length>=1&&cards.length<=3,'BUNDLE_LIMIT');const contexts=[],histories={};
  for(const n of cards){const card=JSON.parse(payload[n].toString('utf8')),context=await loadLocalSource(card.id,token);
    validateSourceCard(context,card.annotation_history,card);contexts.push(context);histories[context.id]=card.annotation_history;}
  const expected=bundlePayload(contexts,histories,token);check(stableJSON(Object.keys(expected).sort())===stableJSON(names.sort()),'BUNDLE_CONTENT_MISMATCH');
  for(const n of names)check(expected[n].equals(payload[n]),'BUNDLE_CONTENT_MISMATCH');
  return {status:'VERIFIED_COMMITTED_BUNDLE',directory:join(parent,name),manifest_sha256:hashObject(manifest),source_count:cards.length,
    replayed_acquisitions:0,raw_hospital_rows_exposed:0,scientific_approval:false};
}
