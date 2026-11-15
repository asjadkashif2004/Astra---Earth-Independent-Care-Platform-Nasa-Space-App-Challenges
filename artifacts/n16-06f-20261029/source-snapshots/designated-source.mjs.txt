import { spawn } from 'node:child_process';
import { open,mkdir,mkdtemp,lstat,realpath,readdir,readFile,chmod,rename,unlink,statfs } from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CREW,requirePermission } from '../../packages/contracts.mjs';
import { safeDirectory,readAt } from './read-context.mjs';
import { ExecutionTrace,recoverTrace } from './execution-trace.mjs';
import { validateCall,parseJSON,plain,exact,sha,stable,freeze,VERSION,TOOLS } from './read-contract.mjs';
import { AS_OF,CAPS,SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,ROWS_SHA,DONOR,SPEC_SHA,CODE_PINS,FILES,check,verifyRead,designatedProjection } from './designated-contract.mjs';
import { commitContainment,bindContainmentReceipt } from './containment-diagnostics.mjs';
import { QualificationBatch } from './qualification-batch.mjs';

const PROJECT=fileURLToPath(new URL('../../',import.meta.url));
export const EVIDENCE=join(PROJECT,'artifacts/n16-06-20261029');
// Additive execution overlay; historical manifest/CODE_PINS and frozen worker remain unchanged.
const DIAGNOSTIC_PINS={
  'services/agent/designated-worker.mjs':'b41c4ecec39ac40039e32e698549c495cec2654c0fce8edde22ec32ecf07a21e',
  'services/agent/containment-diagnostics.mjs':'58bfbb12dc5c1ee1be5057acc26b5d7ff2d04c640e63284ffbbeccb0ba00de7b'
};
const qualificationBatch=new QualificationBatch({persist:async record=>{
  await atomic(EVIDENCE,'batch-failure-'+record.hash+'.json',record);return {durable:true,hash:record.hash};
}});
export const qualificationBatchState=()=>qualificationBatch.state();
export const drainQualificationBatch=()=>qualificationBatch.drain();
const issuers=new WeakMap(),callers=new WeakMap(),controls=new WeakMap(),sourceHandles=new WeakMap();let active=false;
const uuid=()=>randomUUID();
async function atomic(path,name,value){
  const d=await safeDirectory(path),temp=name+'.tmp-'+uuid();let f;
  try{f=await open(d.at(temp),C.O_CREAT|C.O_EXCL|C.O_WRONLY|C.O_NOFOLLOW,0o600);
    await f.writeFile(stable(value)+'\n');await f.sync();await f.close();f=null;
    await rename(d.at(temp),d.at(name));await d.handle.sync();
  }finally{if(f)await f.close();try{await unlink(d.at(temp));}catch(e){if(e.code!=='ENOENT')throw e;}await d.close();}
}
async function snapshot(path,sealed=true){
  const d=await safeDirectory(path);let f;
  try{const names=await readdir(`/proc/self/fd/${d.fd}`);check(names.length===1&&names[0]==='source.sqlite','UNEXPECTED_SOURCE_MEMBER');
    const dir=await d.handle.stat({bigint:true}),s=await lstat(d.at('source.sqlite'),{bigint:true});
    check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n&&s.size===BigInt(SOURCE_BYTES),'UNSAFE_SOURCE_FILE');
    if(sealed)check((dir.mode&0o222n)===0n&&(s.mode&0o222n)===0n,'SOURCE_NOT_SEALED');
    f=await open(d.at('source.sqlite'),C.O_RDONLY|C.O_NOFOLLOW|C.O_NONBLOCK);const a=await f.stat({bigint:true});
    check(a.dev===s.dev&&a.ino===s.ino,'SOURCE_INSTANCE_CHANGED');const bytes=await f.readFile(),z=await f.stat({bigint:true});
    check(z.ctimeNs===a.ctimeNs&&z.size===a.size&&bytes.length===SOURCE_BYTES&&sha(bytes)===SOURCE_SHA,'SOURCE_HASH_MISMATCH');
    check(bytes.subarray(0,16).toString()==='SQLite format 3\0'&&bytes[18]===1&&bytes[19]===1,'SOURCE_HEADER_MISMATCH');
    return {bytes,identity:{directory:{dev:String(dir.dev),ino:String(dir.ino)},file:{dev:String(a.dev),ino:String(a.ino),birth_ns:String(a.birthtimeNs),change_ns:String(a.ctimeNs)}},files:FILES};
  }finally{if(f)await f.close();await d.close();}
}
async function count(path){const s=await lstat(path);check(s.isDirectory()&&!s.isSymbolicLink(),'UNSAFE_ACCOUNTING_ROOT');let n=s.blocks*512;
  for(const e of await readdir(path,{withFileTypes:true})){const p=join(path,e.name);try{const st=await lstat(p);if(st.isDirectory())n+=await count(p);else if(st.isFile()||st.isSymbolicLink())n+=Math.max(st.size,st.blocks*512);}catch(x){if(x.code!=='ENOENT')throw x;}}
  return n;
}
async function journal(r,value){const f=await open(join(r.path,'resources.jsonl'),'a',0o600);try{await f.writeFile(stable({at:new Date().toISOString(),...value})+'\n');await f.sync();}finally{await f.close();}}
async function processTree(pid){const values=[];async function visit(id){try{
    const text=await readFile(`/proc/${id}/status`,'utf8'),stat=await readFile(`/proc/${id}/stat`,'utf8');
    values.push({pid:id,birth:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],hwm:Number(/^VmHWM:\s+(\d+)/m.exec(text)?.[1]??0)*1024});
    const children=await readFile(`/proc/${id}/task/${id}/children`,'utf8');for(const v of children.trim().split(/\s+/).filter(Boolean))await visit(Number(v));
  }catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}}
  await visit(pid);return values;
}
async function pin(r,path){const d=await safeDirectory(path);r.pins.push(d);const f=await open(d.at('source.sqlite'),C.O_RDONLY|C.O_NOFOLLOW);r.filePins.push(f);}
async function verifyCode(){
  check(process.version==='v24.21.0'&&process.versions.sqlite==='3.53.4'&&process.platform==='linux'&&process.arch==='x64','RUNTIME_PIN_MISMATCH');
  check(sha(await readFile(join(PROJECT,'docs/N16_05_SOURCE_SPEC.json')))===SPEC_SHA,'SOURCE_POLICY_CHANGED');
  for(const [file,digest] of Object.entries(CODE_PINS))check(sha(await readFile(join(PROJECT,file)))===digest,'READER_CODE_CHANGED');
  for(const [file,digest] of Object.entries(DIAGNOSTIC_PINS))check(sha(await readFile(join(PROJECT,file)))===digest,'DIAGNOSTIC_CODE_CHANGED');
}
async function verifyRoot(r){
  check(!r.closed&&/^\/var\/tmp\/astra-n16-designated-[A-Za-z0-9]+$/.test(r.path)&&await realpath(r.path)===r.path,'UNTRUSTED_DESIGNATION');
  const s=await lstat(r.path);check(s.dev===r.dev&&s.ino===r.ino&&!s.isSymbolicLink(),'ROOT_INSTANCE_CHANGED');
  const d=await safeDirectory(r.path);try{check((await readAt(d.fd,'owner.json',4096)).toString()===r.ownerText,'OWNER_CHANGED');}finally{await d.close();}
}
async function verifySource(r,entry){
  await verifyRoot(r);const d=await safeDirectory(entry.metadata);
  try{check((await readAt(d.fd,'manifest.json',65536)).toString()===r.manifestText,'MANIFEST_TAMPERED');}finally{await d.close();}
  const state=await snapshot(entry.path);check(stable(state.identity)===stable(entry.identity),'SOURCE_INSTANCE_CHANGED');return state;
}
// Called by the trusted owner launcher only. There is no caller-selected source path.
export async function openDesignation(){
  qualificationBatch.assertOpen();
  await verifyCode();check(![0x01021994,0x858458f6].includes((await statfs('/var/tmp')).type),'RAM_BACKED_STORAGE_FORBIDDEN');
  check(process.memoryUsage().rss<CAPS.rss,'RSS_LIMIT');await mkdir(EVIDENCE,{recursive:true});const donor=await snapshot(DONOR,false);
  const oldRoots=parseJSON(await readFile(join(PROJECT,'artifacts/n16-04-20261028/scratch-roots.json'),'utf8'),65536);
  check(Array.isArray(oldRoots)&&oldRoots.every(p=>/^\/var\/tmp\/astra-n16-04-[A-Za-z0-9]+$/.test(p)),'UNSAFE_ACCOUNTING_REGISTRY');
  let retained=0;for(const p of oldRoots)retained+=await count(p);
  for(const p of ['artifacts/n16-04-20261028','artifacts/n16-05-planning-20261029'])retained+=await count(join(PROJECT,p));
  check(retained+await count(EVIDENCE)+2*1024*1024<CAPS.storage,'STORAGE_LIMIT');
  let record;try{record=parseJSON(await readFile(join(EVIDENCE,'registration.json'),'utf8'),65536);}catch(e){if(e.code!=='ENOENT')throw e;}
  let path,manifest,ownerText;
  if(record){
    check(exact(record,['root','manifest_sha256','owner_sha256'])&&/^\/var\/tmp\/astra-n16-designated-[A-Za-z0-9]+$/.test(record.root),'REGISTRATION_REJECTED');path=record.root;
    const d=await safeDirectory(path);try{ownerText=(await readAt(d.fd,'owner.json',4096)).toString();}finally{await d.close();}
    check(sha(ownerText)===record.owner_sha256,'REGISTRATION_REJECTED');const md=await safeDirectory(join(path,'metadata'));
    try{const raw=await readAt(md.fd,'manifest.json',65536);check(sha(raw)===record.manifest_sha256,'REGISTRATION_REJECTED');manifest=parseJSON(raw.toString(),65536);}finally{await md.close();}
  }else{
    path=await mkdtemp('/var/tmp/astra-n16-designated-');ownerText=stable({id:uuid(),task:'N16-06',synthetic:true})+'\n';
    await atomic(path,'owner.json',JSON.parse(ownerText));
    for(const name of ['source','metadata','traces','negative-controls'])await mkdir(join(path,name),{mode:0o700});
    const target=await open(join(path,'source/source.sqlite'),C.O_CREAT|C.O_EXCL|C.O_WRONLY|C.O_NOFOLLOW,0o600);
    try{await target.writeFile(donor.bytes);await target.sync();}finally{await target.close();}
    await chmod(join(path,'source/source.sqlite'),0o400);await chmod(join(path,'source'),0o500);
    const sealed=await snapshot(join(path,'source'));
    check(stable((await snapshot(DONOR,false)).identity)===stable(donor.identity),'DONOR_CHANGED_DURING_COPY');
    manifest={schema_version:'astra.n16.designation-manifest.v1',source_id:SOURCE_ID,source_sha256:SOURCE_SHA,source_bytes:SOURCE_BYTES,
      source_edition:'astra.n16.scratch-sqlite.v1',profile:'elevated',generation:0,rows_sha256:ROWS_SHA,source_as_of:AS_OF,
      source_identity:sealed.identity,synthetic:true,code_pins:CODE_PINS,source_policy_sha256:SPEC_SHA,sidecars:[],
      donor_sha256:SOURCE_SHA,donor_identity:donor.identity,created_at:new Date().toISOString()};
    await atomic(join(path,'metadata'),'manifest.json',manifest);await chmod(join(path,'metadata/manifest.json'),0o400);await chmod(join(path,'metadata'),0o500);
    record={root:path,manifest_sha256:sha(stable(manifest)+'\n'),owner_sha256:sha(ownerText)};await atomic(EVIDENCE,'registration.json',record);
  }
  check(manifest.source_id===SOURCE_ID&&manifest.source_sha256===SOURCE_SHA&&manifest.source_bytes===SOURCE_BYTES&&manifest.rows_sha256===ROWS_SHA
    &&manifest.source_policy_sha256===SPEC_SHA&&manifest.profile==='elevated'&&manifest.generation===0&&stable(manifest.code_pins)===stable(CODE_PINS)
    &&manifest.synthetic===true&&stable(manifest.sidecars)==='[]','REGISTRATION_REJECTED');
  const st=await lstat(path),r={path,dev:st.dev,ino:st.ino,ownerText,manifest,manifestText:stable(manifest)+'\n',record,pins:[],filePins:[],measurements:[],processes:new Set(),closed:false};
  await verifyRoot(r);const state=await snapshot(join(path,'source'));check(stable(state.identity)===stable(manifest.source_identity),'SOURCE_INSTANCE_CHANGED');
  r.source={root:r,path:join(path,'source'),metadata:join(path,'metadata'),identity:state.identity};await pin(r,r.source.path);
  r.retained=retained;
  check(r.retained+await count(path)+await count(EVIDENCE)<CAPS.storage,'STORAGE_LIMIT');
  const issuer=Object.freeze({});issuers.set(issuer,r);await journal(r,{phase:'registration',source:SOURCE_ID,files:FILES,identity:state.identity});return issuer;
}
export function designationInfo(issuer){const r=issuers.get(issuer);check(r&&!r.closed,'UNTRUSTED_ISSUER');return {root:r.path,source_path:r.source.path,trace_root:join(r.path,'traces'),manifest:structuredClone(r.manifest),manifest_sha256:r.record.manifest_sha256,measurements:structuredClone(r.measurements)};}
// Trusted launcher issuance; an untrusted tool request never reaches this API or receives issuer.
export function issueCaller(issuer,principal,{crew_ids=CREW.map(c=>c.id),replay_offset_ms=0,source=null,view='archive'}={}){
  qualificationBatch.assertOpen();
  const r=issuers.get(issuer);check(r&&!r.closed,'UNTRUSTED_ISSUER');
  check(plain(principal)&&exact(principal,['id','role','crew_id','demo'])&&principal.demo===true&&typeof principal.id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(principal.id),'INVALID_TRUSTED_PRINCIPAL');
  requirePermission(principal,'read');check(view==='archive'&&[0,20000].includes(replay_offset_ms),'VIEW_OR_CLOCK_FORBIDDEN');
  check(Array.isArray(crew_ids)&&crew_ids.length>0&&new Set(crew_ids).size===crew_ids.length&&crew_ids.every(id=>CREW.some(c=>c.id===id)),'INVALID_CREW_SCOPE');
  if(principal.role==='astronaut')check(crew_ids.every(id=>id===principal.crew_id),'SELF_ONLY');
  const entry=source===null?r.source:sourceHandles.get(source);check(entry?.root===r,'UNTRUSTED_SOURCE');
  const context=freeze({principal:structuredClone(principal),crew_ids:[...crew_ids],read_as_of:new Date(Date.parse(AS_OF)+replay_offset_ms).toISOString(),view:'archive',policy:'astra.n16.designated-scope.v1'});
  const token=Object.freeze({});callers.set(token,{r,entry,context,expires:performance.now()+CAPS.runMs});return token;
}
function authorize(caller,input){const c=callers.get(caller);check(c&&!c.r.closed,'UNTRUSTED_CALLER');check(performance.now()<c.expires,'CALLER_EXPIRED');const call=validateCall(input);
  requirePermission(c.context.principal,'read',call.args.crew_id);check(c.context.crew_ids.includes(call.args.crew_id),'CREW_SCOPE_DENIED');return {c,call};}
export function qualificationControl(issuer,kind,{fault=null,onEvent=null}={}){
  const r=issuers.get(issuer);check(r&&!r.closed&&['normal','negative','timeout','cancel'].includes(kind),'UNTRUSTED_QA_CONTROL');
  check((fault===null||typeof fault==='function')&&(onEvent===null||typeof onEvent==='function'),'INVALID_QA_CONTROL');
  const token=Object.freeze({});controls.set(token,{r,kind,fault,onEvent});return token;
}
// Only trusted QA can derive negative byte copies; no SQL construction or mutation is used.
export async function negativeCopy(issuer,kind){
  const r=issuers.get(issuer);check(r&&!r.closed&&['bytes','manifest','wal','shm','journal','symlink','replacement','missing','extra','hardlink','clean'].includes(kind),'NEGATIVE_COPY_FORBIDDEN');
  await verifySource(r,r.source);const base=join(r.path,'negative-controls',uuid());await mkdir(base,{mode:0o700});
  for(const n of ['source','metadata'])await mkdir(join(base,n),{mode:0o700});
  await atomic(join(base,'metadata'),'manifest.json',r.manifest);const bytes=(await snapshot(r.source.path)).bytes;
  const f=await open(join(base,'source/source.sqlite'),'wx',0o400);try{await f.writeFile(bytes);await f.sync();}finally{await f.close();}
  await chmod(join(base,'source'),0o500);const state=await snapshot(join(base,'source'));await pin(r,join(base,'source'));
  const entry={root:r,path:join(base,'source'),metadata:join(base,'metadata'),identity:state.identity};
  // Mutation remains an explicit test-preparation phase outside read execution.
  if(kind!=='clean'){await chmod(entry.path,0o700);const p=join(entry.path,'source.sqlite');
    if(kind==='bytes'){await chmod(p,0o600);bytes[100]^=1;const h=await open(p,'r+');try{await h.write(bytes,0,bytes.length,0);await h.sync();}finally{await h.close();}await chmod(p,0o400);}
    if(kind==='manifest')await atomic(entry.metadata,'manifest.json',{...r.manifest,source_sha256:'0'.repeat(64)});
    if(['wal','shm','journal','extra'].includes(kind)){const name=kind==='extra'?'unexpected.sqlite':kind==='journal'?'source.sqlite-journal':'source.sqlite-'+kind;await atomic(entry.path,name,{synthetic_negative:true});}
    if(['symlink','replacement','missing'].includes(kind)){await unlink(p);
      if(kind==='symlink'){const {symlink}=await import('node:fs/promises');await symlink('/not-mounted/operational.sqlite',p);}
      if(kind==='replacement'){const h=await open(p,'wx',0o400);try{await h.writeFile(bytes);}finally{await h.close();}}}
    if(kind==='hardlink'){const {link}=await import('node:fs/promises');await link(p,join(base,'alias.sqlite'));}
    await chmod(entry.path,0o500);
  }
  const token=Object.freeze({});sourceHandles.set(token,entry);return token;
}
function sandbox(fd,mode){
  const args=['--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv','--setenv','PATH','/usr/bin','--setenv','PYTHONDONTWRITEBYTECODE','1',
    '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--dir','/runtime','--ro-bind',process.execPath,'/runtime/node',
    '--dir','/code','--ro-bind-fd','3','/fixture'];
  for(const p of Object.keys({...CODE_PINS,...DIAGNOSTIC_PINS}))args.push('--ro-bind',join(PROJECT,p),'/code/'+p);
  args.push('--proc','/proc','--dev','/dev','--remount-ro','/','--chdir','/', '/usr/bin/python3','-c',
    'import os,json,sys; blocked={p:not os.path.lexists(p) for p in ["/mnt","/home","/project","/data","/root/.aws","/var/tmp"]}; print(json.dumps({"event":"DESIGNATED_ISOLATION","blocked_paths":blocked}),flush=True); '+
    'all(blocked.values()) or sys.exit(91); os.closerange(3,256); os.execv("/runtime/node",["/runtime/node","--jitless","--max-old-space-size=64","/code/services/agent/designated-worker.mjs"]+sys.argv[1:])',mode);
  return args;
}
async function worker(c,call,control,signal){
  const expectedErrors=control.kind==='timeout'?['TIMEOUT']:control.kind==='cancel'?['CANCELLED']:[];
  return qualificationBatch.run(call.tool,permit=>workerInside(c,call,control,
    signal?AbortSignal.any([signal,permit.signal]):permit.signal,permit),{expectedErrors});
}
async function workerInside(c,call,control,signal,permit){
  const {r,entry}=c,start=performance.now();check(!active,'READER_ALREADY_ACTIVE');active=true;
  let directory,child,handle,closed,reason=null,settled=false,timer,interval,escalation,sampling=Promise.resolve(),sampleBusy=false,peak=0,maxDisk=0,lines='',stderr='',nativeStart;
  const events=[],seen=new Map();let diagnosticWork=Promise.resolve(),diagnosticError=null,diagnosticSeen=false,acceptedDiagnostic=null;
  const stop=code=>{if(reason||settled)return;reason=code;if(!child?.pid)return;
    try{process.kill(-child.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}
    escalation=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}},CAPS.cleanupMs);};
  const sample=async()=>{const owned=child?await processTree(child.pid):[];for(const p of owned)seen.set(p.pid,p.birth);peak=Math.max(peak,...owned.map(p=>p.hwm),0);
    let unlinked=0;for(const f of r.filePins){const s=await f.stat();if(s.nlink===0)unlinked+=Math.max(s.size,s.blocks*512);}
    const bytes=r.retained+await count(r.path)+await count(EVIDENCE)+unlinked;maxDisk=Math.max(maxDisk,bytes);
    await journal(r,{phase:'reader',tool:call.tool,owned,counted_bytes:bytes,open_unlinked_bytes:unlinked});
    if(bytes>CAPS.storage)stop('STORAGE_LIMIT');if(peak>CAPS.rss)stop('RSS_LIMIT');};
  const abort=()=>stop('CANCELLED');
  try{await verifyCode();await verifySource(r,entry);check(!signal?.aborted,'CANCELLED');directory=await safeDirectory(entry.path);
    await sample();check(!reason,reason);check(performance.now()-start<CAPS.toolMs,'TIMEOUT');
    const mode=control.kind==='negative'?'negative':control.kind==='timeout'?'timeout':'read';
    qualificationBatch.assertOpen();permit.markStarted();
    nativeStart=performance.now();child=spawn('/usr/bin/bwrap',sandbox(directory.fd,mode),{detached:true,stdio:['pipe','pipe','pipe',directory.fd],env:{PATH:'/usr/bin'}});
    handle={stop};r.processes.add(handle);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    interval=setInterval(()=>{if(sampleBusy)return;sampleBusy=true;sampling=sample().catch(()=>stop('RESOURCE_ACCOUNTING_FAILED')).finally(()=>{sampleBusy=false;});},20);
    timer=setTimeout(()=>stop('TIMEOUT'),Math.max(1,CAPS.toolMs-(performance.now()-start)));
    child.stdin.on('error',()=>{});child.stderr.on('data',b=>{stderr+=b;if(Buffer.byteLength(stderr)>8192)stop('STDERR_LIMIT');});
    child.stdout.on('data',b=>{lines+=b;if(Buffer.byteLength(lines)>CAPS.result){stop('OUTPUT_LIMIT');return;}
      while(lines.includes('\n')){const i=lines.indexOf('\n'),line=lines.slice(0,i);lines=lines.slice(i+1);
        try{const event=parseJSON(line,CAPS.result);events.push(event);
          if(event.event==='CONTAINMENT_DIAGNOSTIC'){
            if(diagnosticSeen){qualificationBatch.trip({code:'DUPLICATE_DIAGNOSTIC',stage:'diagnostic_record'});stop('DUPLICATE_DIAGNOSTIC');continue;}diagnosticSeen=true;
            diagnosticWork=commitContainment(event.diagnostic,{source_id:SOURCE_ID,sha256:SOURCE_SHA},{
              persist:async record=>{await journal(r,{phase:'containment_diagnostic',record});return {durable:true,hash:record.hash};},
              acknowledge:ack=>new Promise((resolve,reject)=>{qualificationBatch.assertOpen();child.stdin.write(stable(ack)+'\n',error=>{
                if(error)reject(error);else{if(control.kind!=='cancel')child.stdin.end();resolve();}});}),
              block:failure=>qualificationBatch.trip(failure)
            }).then(record=>{acceptedDiagnostic=record;}).catch(error=>{diagnosticError=error;stop(error.code??'DIAGNOSTIC_FAILED');});
          }
          if(control.onEvent)Promise.resolve(control.onEvent(event)).catch(()=>stop('QA_OBSERVER_FAILED'));
          if(event.event==='READ_SNAPSHOT'&&control.kind==='cancel')stop('CANCELLED');
        }catch{stop('INVALID_WORKER_OUTPUT');}}
    });
    closed=new Promise(resolve=>{child.once('error',()=>stop('PROCESS_START_FAILED'));child.once('close',(code,signal)=>resolve({code,signal,at:performance.now()}));});
    child.stdin.write(stable({profile:'elevated',generation:0,call,barrier:control.kind==='cancel'})+'\n');
    const exit=await closed;clearInterval(interval);clearTimeout(timer);clearTimeout(escalation);await sampling;await diagnosticWork;
    if(diagnosticError)reason=diagnosticError.code??'DIAGNOSTIC_FAILED';
    if(!diagnosticSeen&&!reason)reason='CONTAINMENT_TRACE_MISSING';
    let remaining=0;
    try{await sample();for(const [pid,birth] of seen){const p=await processTree(pid);if(p[0]?.birth===birth)remaining++;}if(remaining)reason='PROCESS_CLEANUP_FAILED';
      await verifySource(r,entry);if(lines.trim())reason='PARTIAL_WORKER_OUTPUT';
    }catch(e){reason=e.code??'RESOURCE_ACCOUNTING_FAILED';}
    settled=true;r.processes.delete(handle);const measurement={code:exit.code,signal:exit.signal,reason,native_wall_ms:exit.at-nativeStart,
      elapsed_ms:performance.now()-start,observer_flush_ms:performance.now()-exit.at,observer_pending:sampleBusy?1:0,peak_observed_RSS:peak,max_counted_bytes:maxDisk,owned_remaining:remaining,events,stderr};
    r.measurements.push(measurement);await journal(r,{phase:'finished',measurement});
    check(!reason,reason);check(exit.code===0,events.find(e=>e.event==='FAILED')?.code??'WORKER_FAILED');
    check(exit.at-start<=CAPS.toolMs,'TIMEOUT');
    check(events.some(e=>e.event==='DESIGNATED_ISOLATION'&&Object.keys(e.blocked_paths).length===6&&Object.values(e.blocked_paths).every(v=>v===true)),'FILESYSTEM_ISOLATION_UNVERIFIED');
    if(control.kind==='negative'){const v=events.find(e=>e.event==='NEGATIVE_CONTROLS');check(v?.denied>=4&&v.failures.length===4&&stable(v.before)===stable(FILES)&&stable(v.after)===stable(FILES),'WRITE_DENIAL_NOT_PROVEN');return {negative:v,measurement};}
    const value=verifyRead(call,events.find(e=>e.event==='RESULT'));
    bindContainmentReceipt(acceptedDiagnostic,value.receipt,{source_id:SOURCE_ID,sha256:SOURCE_SHA});
    return {...value,measurement,diagnostic:acceptedDiagnostic};
  }finally{
    if(child&&!settled){stop('CONTROLLER_FAILED');if(closed)await closed;await sampling;r.processes.delete(handle);}
    clearInterval(interval);clearTimeout(timer);clearTimeout(escalation);signal?.removeEventListener('abort',abort);if(directory)await directory.close();active=false;
  }
}
async function execute(caller,inputs,options={}){
  check(options&&Object.keys(options).every(k=>['control','signal'].includes(k)),'INVALID_EXECUTION_OPTIONS');
  const {control:controlToken=null,signal}=options;
  const validated=inputs.map(v=>authorize(caller,v)),c=validated[0].c,{r,entry,context}=c;
  check(inputs.length>0&&inputs.length<=4,'WORKFLOW_SIZE');let control={r,kind:'normal',fault:null,onEvent:null};
  if(controlToken){control=controls.get(controlToken);check(control?.r===r,'UNTRUSTED_QA_CONTROL');}
  const trace=await ExecutionTrace.create({source_id:SOURCE_ID,source_sha256:SOURCE_SHA,source_kind:'designated_synthetic_archive',synthetic:true,
    ...context,manifest_sha256:r.record.manifest_sha256,source_instance_sha256:sha(stable(entry.identity)),qualification_control:control.kind,
    diagnostic_code_pins:DIAGNOSTIC_PINS,diagnostic_revision:'astra.n16-06a.containment.v1'},
    {root:join(r.path,'traces'),fault:control.fault??(()=>{})});
  const results=[],start=performance.now();let failure;
  try{for(const [i,{call}] of validated.entries()){
    authorize(caller,call);check(performance.now()-start<CAPS.runMs,'WORKFLOW_TIMEOUT');const id=`call-0${i+1}`;
    await trace.append('CALL_REQUESTED',{call_id:id});await trace.append('CALL_VALIDATED',{call_id:id,tool:call.tool,args:call.args,scope:context.crew_ids});
    await trace.append('CALL_STARTED',{call_id:id,tool:call.tool});
    try{const v=await worker(c,call,control,signal);let value;
      if(v.negative)value={run_id:trace.id,call_id:id,tool:call.tool,execution_status:'COMPLETED',data_status:'UNKNOWN',qualification_control:true,denied:v.negative.denied};
      else value={run_id:trace.id,call_id:id,execution_status:'COMPLETED',...designatedProjection(v.result,call,context,r.record.manifest_sha256,sha(stable(entry.identity))),receipt:v.receipt,
        audit:{original_projection:v.result,query_arguments:call.args,containment_diagnostic:v.diagnostic}};
      const ref=await trace.result(id,value);await trace.append('CALL_COMPLETED',{call_id:id,tool:call.tool,result:ref,data_status:value.data_status});
      const {audit,...publicResult}=value;results.push(publicResult);
    }catch(e){failure=e;if(!trace.failed){await trace.append(e.code==='TIMEOUT'?'CALL_TIMEOUT':e.code==='CANCELLED'?'CALL_CANCELLED':'CALL_FAILED',{call_id:id,code:e.code??'TOOL_FAILED'});}break;}
  }
    if(!trace.failed)await trace.append('RUN_ENDED',{status:failure?'STOPPED':'COMPLETED'});
  }finally{await trace.close();}
  if(failure)throw Object.assign(failure,{trace_id:trace.id});return {run_id:trace.id,results,recovery:await recoverTrace(trace.id,{root:join(r.path,'traces')})};
}
export const readDesignatedTool=(caller,input,options)=>execute(caller,[input],options);
export async function runFourDesignated(caller,crew,options){return execute(caller,TOOLS.map(tool=>({schema_version:VERSION,tool,
  args:tool==='get_open_risk_events'?{crew_id:crew,limit:20}:{crew_id:crew,metrics:['heart_rate','respiratory_rate','spo2']}})),options);}
export async function verifyDesignatedTrace(issuer,id){
  const r=issuers.get(issuer);check(r&&!r.closed,'UNTRUSTED_ISSUER');const recovery=await recoverTrace(id,{root:join(r.path,'traces')});
  const d=await safeDirectory(join(r.path,'traces',id));let rows;try{rows=(await readAt(d.fd,'trace.jsonl',1000000)).toString().trimEnd().split('\n').map(x=>parseJSON(x,65536));}finally{await d.close();}
  const context=rows[0]?.payload.context;check(context?.source_id===SOURCE_ID&&context.source_sha256===SOURCE_SHA&&context.view==='archive'&&context.manifest_sha256===r.record.manifest_sha256,'TRACE_SCOPE_INVALID');
  if(context.diagnostic_revision!==undefined)check(stable(context.diagnostic_code_pins)===stable(DIAGNOSTIC_PINS),'TRACE_SCOPE_INVALID');
  else check(recovery.executed_calls.every(c=>c.status!=='COMPLETED'),'HISTORICAL_TRACE_HAS_NO_CONTAINMENT_PROOF');
  const validated=new Map(rows.filter(x=>x.type==='CALL_VALIDATED').map(x=>[x.payload.call_id,x.payload]));
  for(const item of recovery.executed_calls.filter(x=>x.status==='COMPLETED')){
    const p=validated.get(item.call_id),call=validateCall({schema_version:VERSION,tool:p.tool,args:p.args});requirePermission(context.principal,'read',call.args.crew_id);
    check(context.crew_ids.includes(call.args.crew_id),'TRACE_SCOPE_INVALID');const v=item.result;
    if(v.qualification_control){check(context.qualification_control==='negative'&&v.data_status==='UNKNOWN','TRACE_CONTROL_INVALID');continue;}
    verifyRead(call,{event:'RESULT',result:v.audit?.original_projection,receipt:v.receipt});
    bindContainmentReceipt(v.audit.containment_diagnostic,v.receipt,{source_id:SOURCE_ID,sha256:SOURCE_SHA});
    const expected=designatedProjection(v.audit.original_projection,call,context,context.manifest_sha256,context.source_instance_sha256);
    expected.provenance.verified_at=v.provenance.verified_at;const {audit,run_id,call_id,execution_status,receipt,...actual}=v;
    check(run_id===id&&call_id===item.call_id&&execution_status==='COMPLETED'&&stable(actual)===stable(expected),'TRACE_RESULT_BINDING_INVALID');
  }
  return recovery;
}
export async function closeDesignation(issuer){const r=issuers.get(issuer);check(r&&!r.closed,'UNTRUSTED_ISSUER');
  check(r.processes.size===0&&!active,'OWNED_PROCESS_REMAINS');const source=await verifySource(r,r.source),donor=await snapshot(DONOR,false);
  for(const f of r.filePins)await f.close();for(const d of r.pins)await d.close();
  const report={...designationInfo(issuer),source_files_after:source.files,donor_files_after:donor.files,owned_remaining:r.processes.size,synthetic:true};
  report.qualification_batch=qualificationBatch.state();
  await atomic(r.path,'closed-'+uuid()+'.json',report);r.closed=true;issuers.delete(issuer);return report;
}
