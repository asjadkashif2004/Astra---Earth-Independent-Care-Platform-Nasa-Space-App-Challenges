import { readFile,writeFile,mkdtemp,appendFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,stableJSON,sha256,readBounded } from '../services/research-retrieval/contract.mjs';
import { loadIndex } from '../services/research-retrieval/retrieval.mjs';
import { denyNetworking } from '../services/research-retrieval/offline.mjs';
import { ANSWER_POLICY,answerResearch,abstain } from '../services/research-answer/selection.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const save=(path,value)=>writeFile(path,stableJSON(value)+'\n',{flag:'wx',flush:true});
export function parseArgs(args){
  if(args.length!==2||!args.includes('--execute-n15-05'))throw Error('Use --question=... --execute-n15-05; fresh owner resource authority is required.');
  const arg=args.find(a=>a.startsWith('--question='));
  if(!arg||arg.length===11)throw Error('A general publication question is required.');
  return {question:arg.slice(11)};
}

export async function executeLocal(prepared,root,{signal}={}){
  if(signal?.aborted)throw Error('Controller resource gate closed');
  await save(join(root,'selection-input.json'),{...prepared.snapshot,snapshot_sha256:prepared.snapshot_sha256,
    retrieval:prepared.retrieval.candidates.map(c=>({id:c.window.id,unit_id:c.window.unit_id,score:c.score}))});
  await save(join(root,'execution-request.json'),{schema_version:'astra.n15-05.execution.v1',
    policy:ANSWER_POLICY,prompt:prepared.prompt,prompt_sha256:sha256(Buffer.from(prepared.prompt)),selection_sha256:prepared.snapshot_sha256});
  let owned,outerTimedOut=false;
  const stop=()=>{if(owned?.pid){try{process.kill(-owned.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
    const forced=setTimeout(()=>{try{process.kill(-owned.pid,'SIGKILL');}catch{}},1000);forced.unref();}};
  const cancel=()=>stop();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  signal?.addEventListener('abort',cancel,{once:true});
  const deadline=setTimeout(()=>{outerTimedOut=true;stop();},360000);
  try{
    if(signal?.aborted)throw Error('Controller resource gate closed');
    const code=await new Promise((resolve,reject)=>{
      owned=spawn('/usr/bin/python3',[join(project,'scripts/n15_research_runtime.py'),root],{
        cwd:root,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LC_ALL:'C',PYTHONDONTWRITEBYTECODE:'1'},
        stdio:['ignore','pipe','pipe'],detached:true});
      let stdout='',stderr='',limitHit=false;
      owned.stdout.setEncoding('utf8');owned.stderr.setEncoding('utf8');
      owned.stdout.on('data',text=>{stdout+=text;if(Buffer.byteLength(stdout)>32768){limitHit=true;stop();}});
      owned.stderr.on('data',text=>{stderr+=text;if(Buffer.byteLength(stderr)>32768){limitHit=true;stop();}});
      owned.once('error',reject);
      owned.once('close',async(code,signal)=>{
        try{
          await save(join(root,'supervisor-process.json'),{exit_code:code,signal,outer_deadline_hit:outerTimedOut,
            output_limit_hit:limitHit,stdout:stdout.slice(0,32768),stderr:stderr.slice(0,32768)});
          if(limitHit||outerTimedOut)reject(Object.assign(Error('Bounded supervisor failure'),{code:outerTimedOut?'MODEL_TIMEOUT':'OUTPUT_LIMIT'}));
          else resolve(code);
        }catch(error){reject(error);}
      });
    });
    const report=JSON.parse(await readBounded(join(root,'runtime/report.json'),40000));
    if(code!==0||report.status!=='PASS')throw Error('Isolated runtime gate failed; inspect preserved failure record.');
    const result=JSON.parse(await readBounded(join(root,'runtime/generation/native-result.json'),20000));
    const containment=JSON.parse(await readBounded(join(root,'runtime/generation/containment-preflight.json'),20000));
    const cleanup=JSON.parse(await readBounded(join(root,'runtime/generation/cleanup.json'),2000));
    if(report.generation.selection_sha256!==prepared.snapshot_sha256||!cleanup.owned_wrapper_reaped
      ||cleanup.private_PID1_still_present||report.resources.owned_processes_remaining!==0||report.accounting_failures.length)
      throw Error('Execution binding or cleanup failed');
    return {exit_code:result.exit_code,timeout_hit:result.timeout_hit,native_commands:report.native_commands,
      verified_isolation:containment.status==='PASS'&&result.Haswell_backend_initialized,
      decode_runs:report.generation.performance.decode_eval[1],stdout:result.stdout,
      performance:report.generation.performance,native_wall_s:result.release_to_wrapper_exit_s,
      native_sampled_peak_RSS_bytes:result.native_post_release_sampled_VmHWM_peak_bytes,
      kernel_command_tree_peak_RSS_bytes:result.kernel_process_tree_peak_RSS_bytes,
      counted_storage_bytes:report.resources.final_allocated,new_download_bytes:0,network_requests:report.network_requests};
  }finally{clearTimeout(deadline);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);signal?.removeEventListener('abort',cancel);}
}

export async function main(args){
  const {question}=parseArgs(args),network=denyNetworking(),started=performance.now();
  const root=await mkdtemp('/var/tmp/astra-n15-05-');
  await save(join(root,'invocation.json'),{task:'N15-05',question,policy:ANSWER_POLICY,
    resource_authority:'N15-05 only; monitored 1.5GB/1.35GB stop, RSS2GB, native120s, no network/downloads; not reusable permission',
    policy_frozen_before_generation:true});
  const resourcePath=join(root,'controller-resources.jsonl');await writeFile(resourcePath,'',{flag:'wx'});
  let resourceFailure=null;let pending=Promise.resolve();const abort=new AbortController();
  const fail=reason=>{resourceFailure=reason;abort.abort();};
  const resourceTick=()=>{
    const row={elapsed_ms:performance.now()-started,RSS_bytes:process.memoryUsage().rss,
      lifetime_peak_RSS_bytes:process.resourceUsage().maxRSS*1024};
    if(Math.max(row.RSS_bytes,row.lifetime_peak_RSS_bytes)>=1800000000)fail('controller_memory_precaution');
    pending=pending.then(()=>appendFile(resourcePath,JSON.stringify(row)+'\n',{flush:true}))
      .catch(()=>{fail('controller_resource_persistence_failed');});
  };
  resourceTick();const monitor=setInterval(resourceTick,1000);monitor.unref();
  let result;
  try{
    const source=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),source.evidence);
    if(resourceFailure)throw Error(resourceFailure);
    result=await answerResearch(question,{...saved,evidence:source.evidence},async prepared=>{
      if(resourceFailure)throw Error(resourceFailure);
      return executeLocal(prepared,root,{signal:abort.signal});
    });
    if(network.length||resourceFailure)result=abstain(resourceFailure??'offline_network_attempt',{generated_by_llm:false});
  }catch(error){result=abstain('research_workflow_unavailable',{generated_by_llm:false,error:error.code??error.name});}
  finally{clearInterval(monitor);resourceTick();await pending;}
  if(resourceFailure)result=abstain(resourceFailure,{generated_by_llm:false});
  result={...result,task:'N15-05',evidence_directory:root,elapsed_ms:performance.now()-started,
    controller_peak_RSS_bytes:process.resourceUsage().maxRSS*1024,network_attempts:network,
    evaluation_scope:'seen/technical demonstration only; no independent scientific or clinical approval'};
  await save(join(root,'answer.json'),result);
  return result;
}
if(import.meta.main){
  try{const result=await main(process.argv.slice(2));console.log(JSON.stringify(result,null,2));}
  catch(error){console.error(JSON.stringify({status:'ABSTAIN',reason:'invalid_invocation_or_scratch_failure',error:error.code??error.name}));process.exitCode=1;}
}
