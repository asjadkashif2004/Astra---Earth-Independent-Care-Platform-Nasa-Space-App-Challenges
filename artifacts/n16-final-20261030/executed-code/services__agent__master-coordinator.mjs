// Deterministic research coordinator. Native execution is an explicit injected trusted boundary.
import { MASTER_MODE,ORDER,masterCaller,masterCall,authorizeMaster,verifyMasterResult } from './master-contract.mjs';
import { designatedProjection,SOURCE_ID,SOURCE_SHA } from './designated-contract.mjs';
import { verifyBinding,singleCheck as check } from './single-select-contract.mjs';
import { stable,sha,freeze,exact } from './read-contract.mjs';
import { recordedResponse,renderRecordedDemo } from './recorded-health-demo.mjs';

const capabilities=new WeakMap();
// Called only by the trusted owner launcher, never bound to a web/client role parameter.
export function issueDemoAuthority(crew='CREW-03'){
  const capability=Object.freeze({});capabilities.set(capability,masterCaller(crew));return capability;
}
export function demoScope(capability){const c=capabilities.get(capability);check(c,'UNTRUSTED_CONTEXT');return c;}
export function validateResources(r){
  check(r?.closed===true&&r.reconciled===true&&Number.isSafeInteger(r.sample_count)&&r.sample_count>0
    &&r.event_count===3&&r.record_count===r.sample_count+r.event_count&&/^[a-f0-9]{64}$/.test(r.journal_sha256??'')
    &&exact(r.counters,['sample','event']),'MASTER_RESOURCES_UNVERIFIED');
  for(const [kind,n] of [['sample',r.sample_count],['event',r.event_count]])
    check(exact(r.counters[kind],['attempted','accepted','appended','durable'])
      &&Object.values(r.counters[kind]).every(x=>x===n),'MASTER_RESOURCES_UNVERIFIED');
}
export function commitProjection(call,scope,value,source){
  verifyBinding(value.binding,source.binding.source_identity);
  check(stable(value.binding)===stable(source.binding),'MASTER_SOURCE_CHANGED');
  validateResources(value.resources);
  const raw=verifyMasterResult(call,value.event,value.binding,value.diagnostic);
  return {execution_status:'COMPLETED',...designatedProjection(raw,call,scope,source.manifest_sha256,sha(stable(source.binding.source_identity))),
    read_receipt:value.event.receipt,resource_receipt:value.resources,measurement:value.measurement,
    native_execution:value.recovered_from?'RECOVERED_COMMITTED_NO_REPLAY':'NEW_NATIVE_SQL',recovered_from:value.recovered_from??null};
}
export async function coordinate(capability,{trace,execute,source,signal,clock=()=>performance.now(),order=ORDER}){
  const scope=demoScope(capability);check(typeof execute==='function'&&trace&&source,'MASTER_COORDINATOR_INVALID');
  check(Array.isArray(order)&&order.length===4&&stable([...order].sort())===stable([...ORDER].sort()),'MASTER_EXECUTION_ORDER_INVALID');
  const start=clock(),calls=[];
  for(const [i,tool] of order.entries()){
    const call=masterCall(tool,scope.principal.crew_id),id='call-0'+(i+1);
    if(signal?.aborted||clock()-start>=10000){
      calls.push(...order.slice(i).map(name=>({tool:name,execution_status:'NOT RUN',data_status:'UNKNOWN',reason:'cancelled_or_workflow_timeout'})));break;
    }
    await trace.append('CALL_REQUESTED',{call_id:id});
    authorizeMaster(call,scope);
    await trace.append('CALL_VALIDATED',{call_id:id,tool,args:call.args,trusted_scope:scope});
    const recovering=source.recovered_tools?.includes(tool)===true;
    await trace.append('CALL_STARTED',{call_id:id,tool,args:call.args,execution_kind:recovering?'COMMITTED_RECOVERY':'NATIVE_DISPATCH'});
    try{
      const value=await execute(call,scope,{signal,call_id:id});
      check(Boolean(value.recovered_from)===recovering,'MASTER_RECOVERY_BINDING_REQUIRED');
      check(!signal?.aborted&&clock()-start<10000,'CANCELLED');
      const projected=commitProjection(call,scope,value,source),result={run_id:trace.id,call_id:id,...projected};
      const reference=await trace.result(id,result);
      await trace.append('CALL_COMPLETED',{call_id:id,tool,result:reference,execution_status:'COMPLETED',data_status:result.data_status});
      calls.push(result);
    }catch(e){
      const status=e.code==='CANCELLED'?'CANCELLED':/TIMEOUT|LIMIT/.test(e.code??'')?'TIMEOUT':'FAILED';
      // Persistence failure cannot manufacture a terminal event or a success.
      await trace.append(status==='CANCELLED'?'CALL_CANCELLED':status==='TIMEOUT'?'CALL_TIMEOUT':'CALL_FAILED',{call_id:id,tool,code:e.code??'FAILED'});
      calls.push({tool,execution_status:status,data_status:'UNKNOWN',reason:e.code??'FAILED'});
      calls.push(...order.slice(i+1).map(name=>({tool:name,execution_status:'NOT RUN',data_status:'UNKNOWN',reason:'prior_call_failed'})));
      await trace.append('RUN_ENDED',{status});return {status,run_id:trace.id,calls,elapsed_ms:clock()-start};
    }
  }
  const status=calls.length===4&&calls.every(c=>c.execution_status==='COMPLETED')?'COMPLETED':signal?.aborted?'CANCELLED':'INCOMPLETE';
  await trace.append('RUN_ENDED',{status});return {status,run_id:trace.id,calls,elapsed_ms:clock()-start};
}
export function researchBoundary(){
  return freeze({generated_by_llm:false,model_execution:'NOT AUTHORIZED',evidence_references:[],
    citation_attribution:'NOT ASSESSED',question_relevance:'UNKNOWN',complete_answer_support:'ABSTAIN',
    independently_reviewed_rules:0,reason:'No scientific question or independently approved support rule is executed by these four data tools.'});
}
export function presentation(recovered){
  check(recovered?.replayed_calls===0&&['COMPLETE','INCOMPLETE'].includes(recovered.status),'MASTER_RECOVERY_INVALID');
  const calls=recovered.executed_calls??[];check(calls.length<=4,'MASTER_RECOVERY_INVALID');
  const results=ORDER.map(tool=>{
    const c=calls.find(x=>x.tool===tool);
    if(c?.status!=='COMPLETED')return {tool,execution_status:c?.status??'NOT RUN',data_status:'UNKNOWN'};
    const v=c.result;
    check(v?.tool===tool&&v.synthetic===true&&v.research_only===true&&v.inference_performed===false&&v.clinical_support===false
      &&v.provenance?.source_id===SOURCE_ID&&v.provenance.source_sha256===SOURCE_SHA
      &&v.provenance.host_currency==='NOT_LIVE_ARCHIVE'&&v.provenance.monitoring_health==='UNKNOWN'
      &&v.crew_id===recovered.executed_calls[0]?.result?.crew_id,'MASTER_PRESENTATION_UNVERIFIED');
    validateResources(v.resource_receipt);return v;
  });
  const model={schema_version:'astra.n16.master-demo.v1',label:'SYNTHETIC / DESIGNATED SOURCE — ARCHIVED',
    crew_id:results.find(x=>x.crew_id)?.crew_id??null,run_id:recovered.run_id,trace_status:recovered.status,workflow_status:recovered.workflow_outcome??'UNKNOWN',
    recovered_from_committed_trace:true,fresh_UI_execution:false,replayed_calls:0,results,
    risk_authority:'N02 ONLY; archive examples are authored fixtures, not operational alerts',
    research:researchBoundary(),limitations:['Archive mission time is not host currency.','UNKNOWN is not healthy or all-clear.',
      'No cognition, disease inference, prediction, clinical decision, acknowledgement or transmission action is performed.']};
  return {...model,response:recordedResponse(model)};
}
export function renderDemo(model){return renderRecordedDemo(model);}
