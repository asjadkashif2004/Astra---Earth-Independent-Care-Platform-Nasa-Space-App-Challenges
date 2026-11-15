// Trusted parent only: same sealed-source sandbox and stronger preexisting bounds.
import { spawn } from 'node:child_process';
import { readFile,lstat,mkdir,open } from 'node:fs/promises';
import { constants as F } from 'node:fs';
import { join } from 'node:path';
import { MASTER_MODE,verifyMasterResult } from './master-contract.mjs';
import { verifySingleGuard,verifyBinding,singleCheck as check } from './single-select-contract.mjs';
import { createResourceJournal } from './resource-journal.mjs';
import { commitContainment } from './containment-diagnostics.mjs';
import { QualificationBatch } from './qualification-batch.mjs';
import { atomicRecord,allocated,safetyFailure } from './master-storage.mjs';
import { parseJSON,sha,stable } from './read-contract.mjs';
import { SOURCE_ID,SOURCE_SHA } from './designated-contract.mjs';
import { DESIGNATED_ROOT,inspectSealedSource } from './single-select-source.mjs';

export const BOUNDS=Object.freeze({rss:536870912,storage:67108864,wall:1000,output:65536,cleanup:250});
export const WORKER_FILES=Object.freeze(['services/agent/master-worker.mjs','services/agent/master-contract.mjs',
  'services/agent/single-select-contract.mjs','services/agent/single-select-source.mjs','services/agent/single-quality-contract.mjs',
  'services/agent/designated-contract.mjs','services/agent/sqlite-fixture-contract.mjs','services/agent/read-contract.mjs',
  'services/agent/containment-diagnostics.mjs','packages/contracts.mjs','docs/N16_05_SOURCE_SPEC.json']);
export function masterSandbox(project,fd){
  const a=['--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv','--setenv','PATH','/usr/bin',
    '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--dir','/runtime','--ro-bind',process.execPath,'/runtime/node',
    '--dir','/code','--ro-bind-fd',String(fd),'/fixture'];
  for(const p of WORKER_FILES)a.push('--ro-bind',join(project,p),'/code/'+p);
  a.push('--proc','/proc','--dev','/dev','--remount-ro','/','--chdir','/','/usr/bin/python3','-c',
    'import os,resource; resource.setrlimit(resource.RLIMIT_CORE,(0,0)); resource.setrlimit(resource.RLIMIT_CPU,(1,1)); os.closerange(3,256); os.execv("/runtime/node",["/runtime/node","--jitless","--max-old-space-size=64","/code/services/agent/master-worker.mjs"])');
  return a;
}
async function processTree(pid){
  const rows=[];async function visit(id){try{
    const status=await readFile('/proc/'+id+'/status','utf8'),stat=await readFile('/proc/'+id+'/stat','utf8');
    rows.push({pid:id,birth:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],hwm:Number(/^VmHWM:\s+(\d+)/m.exec(status)?.[1]??0)*1024});
    for(const c of (await readFile('/proc/'+id+'/task/'+id+'/children','utf8')).trim().split(/\s+/).filter(Boolean))await visit(Number(c));
  }catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}}await visit(pid);return rows;
}
export async function countMission(project,out,plan){
  // Frozen historical inputs are fully charged once at preflight, not rescanned
  // inside each 20ms sample. Their hashes/stat inventory are checked again postflight.
  check(Number.isSafeInteger(plan.fixed_counted_bytes)&&plan.fixed_counted_bytes>=0,'RESOURCE_FIXED_CHARGE_INVALID');
  let n=plan.fixed_counted_bytes;
  for(const path of plan.accounting_roots)n+=await allocated(path.startsWith('/')?path:join(project,path));
  for(const path of plan.accounting_dynamic_files??[])n+=await allocated(join(project,path));return n;
}
export async function supervise(call,scope,{project,out,plan,source,directory,budget,signal,call_id}){
  const path=join(out,call_id);await mkdir(path,{mode:0o700});
  let child,exit,closed,timer,interval,escalation,reason=null,ended=null,started=null,sampleBusy=false,
    sampleWork=Promise.resolve(),handling=Promise.resolve(),samples=0,peak=0,maxDisk=0,buffer='',stderr='',diagnostic=null,acked=false,sql=0,result=null;
  const events=[],seen=new Map();let journal;
  const batch=new QualificationBatch({persist:async r=>{await atomicRecord(path,'first-failure.json',r);return {durable:true,hash:r.hash};}});
  const stop=code=>{if(reason)return;reason=code;journal?.cancel(code);batch.trip({code,stage:'master_call'});
    if(child?.pid&&ended===null){try{process.kill(-child.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}
      escalation=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}},BOUNDS.cleanup);}};
  const aborted=()=>stop('CANCELLED');signal?.addEventListener('abort',aborted,{once:true});
  try{
    journal=await createResourceJournal(path,'resources-v2.jsonl',{onFailure:e=>stop(e.code)});
    const sample=()=>journal.sample(async()=>{
      const rows=child?await processTree(child.pid):[],self=(await processTree(process.pid))[0];
      check(self?.hwm>0,'RSS_OBSERVER_FAILED');for(const r of rows)seen.set(r.pid,r.birth);
      peak=Math.max(peak,self.hwm,...rows.map(x=>x.hwm));maxDisk=Math.max(maxDisk,await countMission(project,out,plan));samples++;
      return {phase:'resource',owned:rows,parent_hwm:self.hwm,counted_bytes:maxDisk};
    }).then(()=>{check(peak<BOUNDS.rss,'RSS_LIMIT');check(maxDisk<BOUNDS.storage,'STORAGE_LIMIT');});
    await sample();check(maxDisk<BOUNDS.storage-1048576,'STORAGE_ADMISSION_FAILED');check(!signal?.aborted,'CANCELLED');
    // Reservation persists before any spawn; no other code path can start this worker.
    const reservation=await budget.reserve(call.tool);await atomicRecord(path,'reservation.json',reservation);
    await batch.run(call.tool,async permit=>{
      permit.markStarted();started=performance.now();
      child=spawn('/usr/bin/bwrap',masterSandbox(project,3),{detached:true,stdio:['pipe','pipe','pipe',directory.fd],env:{PATH:'/usr/bin',PYTHONDONTWRITEBYTECODE:'1'}});
      const spawned=new Promise((resolve,reject)=>{child.once('spawn',()=>resolve());child.once('error',reject);});
      closed=new Promise(resolve=>{child.once('close',(code,signal)=>{ended=performance.now();resolve({code,signal});});});
      child.stdin.on('error',()=>{});permit.signal.addEventListener('abort',()=>stop('BATCH_BLOCKED'),{once:true});
      timer=setTimeout(()=>stop('SINGLE_WORKER_TIMEOUT'),BOUNDS.wall);
      interval=setInterval(()=>{if(sampleBusy)return;sampleBusy=true;sampleWork=sample().catch(e=>stop(e.code??'RESOURCE_FAILED')).finally(()=>{sampleBusy=false;});},20);
      child.stderr.on('data',b=>{stderr+=b;if(Buffer.byteLength(stderr)>8192)stop('STDERR_LIMIT');});
      child.stdout.on('data',b=>{
        buffer+=b;if(Buffer.byteLength(buffer)>BOUNDS.output){stop('OUTPUT_LIMIT');return;}
        while(buffer.includes('\n')){
          const i=buffer.indexOf('\n'),line=buffer.slice(0,i);buffer=buffer.slice(i+1);
          handling=handling.then(async()=>{
            const e=parseJSON(line,BOUNDS.output);events.push(e);
            if(e.kernel_max_rss){peak=Math.max(peak,e.kernel_max_rss);check(peak<BOUNDS.rss,'RSS_LIMIT');}
            await journal.event({phase:'worker_event',event:e});
            if(e.event==='SINGLE_CONTAINMENT'){
              check(!diagnostic,'DUPLICATE_DIAGNOSTIC');diagnostic=verifySingleGuard(e.diagnostic);verifyBinding(e.binding,source.binding.source_identity);
              check(stable(e.binding)===stable(source.binding)&&Object.values(e.blocked_paths).length===6&&Object.values(e.blocked_paths).every(Boolean),'SOURCE_OR_ISOLATION');
              await sample();
              await commitContainment(diagnostic,{source_id:SOURCE_ID,sha256:SOURCE_SHA},{block:f=>batch.trip(f),
                persist:async d=>{await atomicRecord(path,'diagnostic.json',{diagnostic:d,binding:e.binding});return {durable:true,hash:d.hash};},
                acknowledge:ack=>new Promise((resolve,reject)=>{batch.assertOpen();check(!reason,'WORKER_STOPPED');
                  child.stdin.write(stable({...ack,source_binding_sha256:sha(stable(source.binding)),call_sha256:sha(stable(call))})+'\n',err=>{if(err)reject(err);else{acked=true;resolve();}});})});
            }else if(e.event==='SINGLE_SQL_ATTEMPT'){check(acked&&++sql===1,'UNAUTHORIZED_SQL');}
            else if(e.event==='SINGLE_RESULT'){check(acked&&sql===1&&!result,'INVALID_SQL_RESULT');result=e;}
            else if(e.event==='FAILED')throw Object.assign(Error(e.code),{code:e.code});
            else check(false,'UNEXPECTED_WORKER_EVENT');
          }).catch(e=>stop(e.code??'WORKER_PROTOCOL_FAILED'));
        }
      });
      await spawned;await atomicRecord(path,'startup.json',{pid:child.pid,actual_startups:1,reservation});
      await sample();batch.assertOpen();check(!reason,'RESOURCE_NOT_READY');
      child.stdin.write(stable({schema_version:MASTER_MODE,call,trusted_caller:scope,expected_instance:source.binding.source_identity})+'\n');
      exit=await closed;clearTimeout(timer);clearTimeout(escalation);clearInterval(interval);await sampleWork;await handling;await sample();
      check(!reason,reason??'FAILED');check(exit.code===0&&sql===1&&result&&buffer==='','INCOMPLETE_SQL_RESULT');
    });
    let owned=0;for(const [pid,birth] of seen)if((await processTree(pid))[0]?.birth===birth)owned++;
    check(owned===0&&!sampleBusy,'WORKER_CLEANUP_FAILED');verifyMasterResult(call,result,source.binding,diagnostic);
    const after=inspectSealedSource(DESIGNATED_ROOT+'/source',source.spec,source.binding.source_identity);
    check(stable(after)===stable(source.binding),'SOURCE_AFTER_CHANGED');
    const resources=await journal.finalize({samples,events:events.length});
    await atomicRecord(path,'resource-reconciliation.json',resources);
    const measurement={native_wall_ms:ended-started,max_process_RSS:peak,max_counted_storage:maxDisk,resource_samples:samples,
      actual_startups:1,read_only_connections:1,explicit_SELECTs:1,exit,owned_remaining:owned,observer_pending:0,network_requests:0};
    const value={event:result,binding:after,diagnostic,resources,measurement};
    await atomicRecord(path,'outcome.json',{status:'PASS',call,scope,...value,events,stderr,batch:await batch.drain()});return value;
  }catch(e){
    stop(e.code??'WORKER_FAILED');if(closed&&ended===null)await closed;
    clearTimeout(timer);clearTimeout(escalation);clearInterval(interval);await sampleWork;await handling;
    let resource_error=null;if(journal)try{await journal.finalize({samples,events:events.length});}catch(x){resource_error=x.code??'RESOURCE_FAILED';}
    if(safetyFailure(reason))await budget.halt(reason);
    await atomicRecord(path,'outcome.json',{status:'FAILED',reason,exit,events,stderr,actual_startups:child?.pid?1:0,
      SQL_open_attempts:sql,native_wall_ms:started!==null&&ended!==null?ended-started:null,observer_pending:sampleBusy?1:0,
      explicit_SELECTs:sql,resource_error,resource_accounting:journal?.state(),peak,maxDisk,batch:await batch.drain()});throw e;
  }finally{
    clearTimeout(timer);clearTimeout(escalation);clearInterval(interval);signal?.removeEventListener('abort',aborted);
  }
}
