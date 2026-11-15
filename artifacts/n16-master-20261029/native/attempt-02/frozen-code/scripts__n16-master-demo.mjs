// Fixed owner-operated research CLI. No client-selected role, SQL, source or output paths.
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { readFile,mkdir,open,unlink } from 'node:fs/promises';
import { constants as F } from 'node:fs';
import { issueDemoAuthority,demoScope,coordinate,presentation,renderDemo } from '../services/agent/master-coordinator.mjs';
import { supervise,countMission,BOUNDS } from '../services/agent/master-supervisor.mjs';
import { atomicRecord,readRecord,readBytes,StartupBudget,allocated } from '../services/agent/master-storage.mjs';
import { DESIGNATED_ROOT,inspectSealedSource } from '../services/agent/single-select-source.mjs';
import { SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA } from '../services/agent/designated-contract.mjs';
import { ExecutionTrace,recoverTrace } from '../services/agent/execution-trace.mjs';
import { safeDirectory,readAt } from '../services/agent/read-context.mjs';
import { reconcileResourceJournal } from '../services/agent/resource-journal.mjs';
import { sha,stable,parseJSON } from '../services/agent/read-contract.mjs';
import { singleCheck as check } from '../services/agent/single-select-contract.mjs';
import { QUERIES,SCHEMA } from '../services/agent/sqlite-fixture-contract.mjs';

export const PROJECT=fileURLToPath(new URL('../',import.meta.url)),OUT=join(PROJECT,'artifacts/n16-master-20261029');
const NATIVE=join(OUT,'native');
async function pinnedSource(){
  const reg=await readRecord(join(PROJECT,'artifacts/n16-06-20261029'),'registration.json');
  check(reg.root===DESIGNATED_ROOT&&reg.manifest_sha256==='5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c'
    &&reg.owner_sha256==='e1597530fc3236c7930990cfef4792b49782a51d781243591c0d946b645ebac1','SOURCE_REGISTRATION_CHANGED');
  const manifestBytes=await readBytes(join(DESIGNATED_ROOT,'metadata'),'manifest.json',65536),owner=await readBytes(DESIGNATED_ROOT,'owner.json',4096);
  check(sha(manifestBytes)===reg.manifest_sha256&&sha(owner)===reg.owner_sha256,'SOURCE_MANIFEST_CHANGED');
  const manifest=parseJSON(manifestBytes.toString(),65536),spec=await readFile(join(PROJECT,'docs/N16_05_SOURCE_SPEC.json'));
  check(sha(spec)===SPEC_SHA&&stable(parseJSON(spec.toString(),65536).fixed_queries)===stable(QUERIES)
    &&parseJSON(spec.toString(),65536).schema_definition===SCHEMA,'SOURCE_SCHEMA_PIN');
  const binding=inspectSealedSource(DESIGNATED_ROOT+'/source',spec,manifest.source_identity);
  check(binding.source_id===SOURCE_ID&&binding.source_sha256===SOURCE_SHA&&binding.source_bytes===SOURCE_BYTES,'SOURCE_BINDING');
  return {binding,spec,manifest_sha256:reg.manifest_sha256};
}
export async function recoverMaster(){
  const index=await readRecord(NATIVE,'recording.json'),root=join(NATIVE,index.attempt);
  check(/^attempt-\d{2}$/.test(index.attempt),'UNTRUSTED_RECORDING_PATH');
  const traceBytes=await readBytes(join(root,'traces',index.trace_id),'trace.jsonl');
  check(sha(traceBytes)===index.trace_sha256,'MASTER_TRACE_CHANGED');
  const recovered=await recoverTrace(index.trace_id,{root:join(root,'traces')});
  check(sha(stable(recovered))===index.recovery_sha256,'MASTER_RECOVERY_CHANGED');
  for(const c of recovered.executed_calls){
    if(c.status!=='COMPLETED')continue;
    const d=await safeDirectory(join(root,c.call_id));try{
      const receipt=await readRecord(join(root,c.call_id),'resource-reconciliation.json');
      check(stable(receipt)===stable(c.result.resource_receipt),'MASTER_RESOURCE_RECEIPT_CHANGED');
      const bytes=await readAt(d.fd,'resources-v2.jsonl',8388608);
      reconcileResourceJournal(bytes,receipt.counters,{samples:receipt.sample_count,events:receipt.event_count},receipt.journal_id,receipt.head_hash);
    }finally{await d.close();}
  }
  const timeline=traceBytes.toString().trimEnd().split('\n').map(line=>parseJSON(line,65536)).map(r=>({
    sequence:r.seq,at:r.at,status:r.type,tool:r.payload.tool??null,call_id:r.payload.call_id??null}));
  return {recovery:recovered,model:{...presentation(recovered),timeline}};
}
export async function runMaster(){
  check(process.version==='v24.21.0'&&process.versions.sqlite==='3.53.4'&&process.platform==='linux'&&process.arch==='x64','RUNTIME_PIN');
  const plan=await readRecord(OUT,'code-plan.json');
  for(const [path,hash] of Object.entries(plan.code_pins))check(sha(await readFile(join(PROJECT,path)))===hash,'CODE_PIN_CHANGED');
  for(const q of plan.mandatory_qa){
    const raw=await readFile(join(PROJECT,q.path));check(sha(raw)===q.sha256&&q.failed===0&&q.passed>0,'MANDATORY_QA_FAILED');
  }
  // Validate frozen input charges against current bytes, including the source's old evidence.
  let fixed=plan.fixed_directory_overhead;for(const [path,charge] of Object.entries(plan.fixed_storage)){
    const measured=await allocated(path.startsWith('/')?path:join(PROJECT,path));check(measured===charge,'RESOURCE_FIXED_CHARGE_CHANGED');fixed+=charge;
  }
  check(fixed===plan.fixed_counted_bytes,'RESOURCE_FIXED_CHARGE_INVALID');
  check(await countMission(PROJECT,OUT,plan)<BOUNDS.storage-1048576,'STORAGE_ADMISSION_FAILED');
  const cap=issueDemoAuthority(),scope=demoScope(cap),source=await pinnedSource();
  let priorIndex,prior;
  try{priorIndex=await readRecord(NATIVE,'recording.json');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(priorIndex)prior=await recoverMaster();
  const reusable=new Map();
  for(const c of prior?.recovery.executed_calls??[])if(c.status==='COMPLETED'){
    const value=await readRecord(join(NATIVE,priorIndex.attempt,c.call_id),'outcome.json');
    check(value.status==='PASS'&&stable(value.event.receipt)===stable(c.result.read_receipt)
      &&stable(value.resources)===stable(c.result.resource_receipt)&&stable(value.binding)===stable(source.binding),'MASTER_RECOVERY_SOURCE_CHANGED');
    reusable.set(c.tool,{...value,recovered_from:{run_id:priorIndex.trace_id,call_id:c.call_id,attempt:priorIndex.attempt},
      measurement:{...value.measurement,new_native_startups:0}});
  }
  source.recovered_tools=[...reusable.keys()];
  const lock=await open(join(NATIVE,'active.lock'),F.O_WRONLY|F.O_CREAT|F.O_EXCL|F.O_NOFOLLOW,0o600);
  let trace,directory,timer,attemptDir;
  const controller=new AbortController();
  const cancel=()=>controller.abort();process.once('SIGTERM',cancel);process.once('SIGINT',cancel);
  try{
    await lock.writeFile('owner-only bounded campaign\n');await lock.sync();
    let state;try{state=await readRecord(NATIVE,'startup-budget.json');}catch(e){if(e.code!=='ENOENT')throw e;}
    const budget=new StartupBudget(value=>atomicRecord(NATIVE,'startup-budget.json',value),state);
    check(!budget.state.halted,'MASTER_CAMPAIGN_HALTED');
    let attempts;try{attempts=await readRecord(NATIVE,'attempts.json');}catch(e){if(e.code!=='ENOENT')throw e;attempts=[];}
    check(attempts.length<12,'MASTER_CAMPAIGN_ATTEMPT_LIMIT');
    const attempt='attempt-'+String(attempts.length+1).padStart(2,'0');attemptDir=join(NATIVE,attempt);await mkdir(attemptDir,{mode:0o700});
    attempts.push({attempt,code_plan_sha256:sha(stable(plan)),reservations_before:budget.state.reservations.length});await atomicRecord(NATIVE,'attempts.json',attempts);
    await mkdir(join(attemptDir,'traces'));trace=await ExecutionTrace.create({task:'N16_MASTER',trusted_scope:scope,source:source.binding,
      manifest_sha256:source.manifest_sha256,code_plan_sha256:sha(stable(plan))},{root:join(attemptDir,'traces')});
    directory=await safeDirectory(DESIGNATED_ROOT+'/source');
    await atomicRecord(attemptDir,'preflight.json',{status:'PASS',source:source.binding,scope,budget:budget.state,code_pins:plan.code_pins,
      bounds:BOUNDS,counted_bytes:await countMission(PROJECT,OUT,plan),native_startups:0});
    timer=setTimeout(()=>controller.abort(),10000);
    const result=await coordinate(cap,{trace,source,signal:controller.signal,
      execute:async(call,scope,options)=>{
        if(reusable.has(call.tool)){
          const v=reusable.get(call.tool);
          await mkdir(join(attemptDir,options.call_id));
          const oldDir=join(NATIVE,priorIndex.attempt,v.recovered_from.call_id);
          // Copy only verified evidence, not a source database or a new resource sample.
          const bytes=await readBytes(oldDir,'resources-v2.jsonl',8388608);
          const file=await open(join(attemptDir,options.call_id,'resources-v2.jsonl'),F.O_WRONLY|F.O_CREAT|F.O_EXCL|F.O_NOFOLLOW,0o600);
          try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
          await atomicRecord(join(attemptDir,options.call_id),'resource-reconciliation.json',v.resources);
          await atomicRecord(join(attemptDir,options.call_id),'outcome.json',v);
          return v;
        }
        return supervise(call,scope,{project:PROJECT,out:attemptDir,plan,source,directory,budget,...options});
      }});
    clearTimeout(timer);await trace.close();const trace_id=trace.id;trace=null;
    const recovery=await recoverTrace(trace_id,{root:join(attemptDir,'traces')});
    const after=await pinnedSource();check(stable(after.binding)===stable(source.binding),'SOURCE_POSTFLIGHT_CHANGED');
    const count=await countMission(PROJECT,OUT,plan);check(count<BOUNDS.storage,'STORAGE_LIMIT');
    await atomicRecord(attemptDir,'outcome.json',{status:result.status,result,recovery,source_before:source.binding,source_after:after.binding,
      startup_budget:budget.state,final_counted_bytes:count,network_requests:0,LLM_executions:0,operational_database_access:0});
    const traceBytes=await readBytes(join(attemptDir,'traces',trace_id),'trace.jsonl');
    await atomicRecord(NATIVE,'recording.json',{attempt,trace_id,recovery_sha256:sha(stable(recovery)),trace_sha256:sha(traceBytes)});
    check(result.status==='COMPLETED'&&recovery.status==='COMPLETE'&&recovery.executed_calls.length===4&&recovery.replayed_calls===0,'MASTER_WORKFLOW_INCOMPLETE');
    return {status:result.status,attempt,trace_id,startup_budget:budget.state,results:result.calls};
  }catch(e){
    await atomicRecord(attemptDir??NATIVE,'failure.json',{code:e.code??'MISSION_FAILED',native_budget:await readRecord(NATIVE,'startup-budget.json').catch(()=>null)});
    throw e;
  }finally{
    clearTimeout(timer);process.removeListener('SIGTERM',cancel);process.removeListener('SIGINT',cancel);
    if(trace)await trace.close();if(directory)await directory.close();await lock.close();await unlink(join(NATIVE,'active.lock'));
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    check(process.argv.length===3&&['run','recover','present'].includes(process.argv[2]),'NO_CALLER_PATH_ROLE_SQL_OR_OPTIONS');
    if(process.argv[2]==='run')process.stdout.write(JSON.stringify(await runMaster())+'\n');
    else{
      const value=await recoverMaster();
      if(process.argv[2]==='present'){
        // HTML is a saved standalone artifact; it has no JavaScript or execution route.
        const f=await open(join(NATIVE,'demo.html'),F.O_WRONLY|F.O_CREAT|F.O_EXCL|F.O_NOFOLLOW,0o600);
        try{await f.writeFile(renderDemo(value.model));await f.sync();}finally{await f.close();}
        await atomicRecord(NATIVE,'demo.json',value.model);
      }
      process.stdout.write(JSON.stringify(value)+'\n');
    }
  }catch(e){process.stderr.write(JSON.stringify({status:'FAILED',code:e.code??'MISSION_FAILED'})+'\n');process.exitCode=1;}
}
