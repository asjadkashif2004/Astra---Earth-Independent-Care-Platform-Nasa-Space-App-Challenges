// Closed synthetic-demo policy. No IO, arbitrary SQL, model or operational interfaces.
import { requirePermission,METRICS } from '../../packages/contracts.mjs';
import { exact,validateCall,sha,stable,freeze,fail } from './read-contract.mjs';
import { QUERIES,projectRows } from './sqlite-fixture-contract.mjs';
import { AS_OF,expectedRows } from './designated-contract.mjs';
import { verifyBinding,verifySingleGuard,singleCheck as check } from './single-select-contract.mjs';
import { assessQuality } from './single-quality-contract.mjs';

export const MASTER_MODE='astra.n16.master-single-select.v1';
export const ORDER=freeze(['get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events']);
export function masterCaller(crew='CREW-03'){
  check(/^CREW-0[1-6]$/.test(crew),'MASTER_SCOPE_INVALID');
  return freeze({principal:{id:'n16-master-owner-demo',role:'astronaut',crew_id:crew},crew_ids:[crew],read_as_of:AS_OF});
}
export function masterCall(tool,crew='CREW-03'){
  return freeze({schema_version:'astra.n16.read-tools.v1',tool,args:tool==='get_open_risk_events'?{crew_id:crew,limit:5}:{crew_id:crew,metrics:['heart_rate']}});
}
export function authorizeMaster(input,caller){
  const call=validateCall(input);
  check(exact(caller,['principal','crew_ids','read_as_of'])&&exact(caller.principal,['id','role','crew_id'])
    &&stable(caller)===stable(masterCaller(caller.principal.crew_id)),'MASTER_SCOPE_INVALID');
  requirePermission(caller.principal,'read',call.args.crew_id);
  check(ORDER.includes(call.tool)&&caller.crew_ids.includes(call.args.crew_id)
    &&(call.tool==='get_open_risk_events'||call.args.metrics.length===1),'MASTER_CALL_FORBIDDEN');
  return call;
}
export function queryPlan(call){
  const id=call.tool==='get_open_risk_events'?'risks':call.tool==='get_personal_baseline'?'baseline':'observation';
  return freeze({id,sql:QUERIES[id],table:id==='baseline'?'baselines':id==='risks'?'risks':'observations',
    columns:id==='risks'?['id','crew_id','status','json','sha256']:['crew_id','metric','json','sha256'],
    parameters:id==='risks'?[call.args.crew_id,'open',call.args.limit+1]:[call.args.crew_id,call.args.metrics[0]]});
}
export function projectMaster(call,selected){
  // Missing rows remain UNKNOWN, never synthesized from expected fixture values.
  // A non-null row must still exactly match the pinned canonical row.
  if(call.tool!=='get_open_risk_events'&&selected.length===1&&selected[0]===null){
    const metric=call.args.metrics[0];
    return {schema_version:'astra.n16.sqlite-result.v1',tool:call.tool,crew_id:call.args.crew_id,synthetic:true,research_only:true,
      inference_performed:false,clinical_support:false,data_status:'UNKNOWN',
      provenance:{source_kind:'scratch_sqlite',fixture_id:'elevated',as_of:AS_OF,synthetic:true,host_currency:'NOT_LIVE_FIXTURE'},
      data:{items:[{metric,unit:METRICS[metric].unit,value:null,quality:null,data_status:'UNKNOWN',reason:'missing_source_record',provenance:null}]}};
  }
  const raw=projectRows('elevated',0,call,selected);
  return call.tool==='get_data_quality'?assessQuality(raw):raw;
}
export async function executeMaster(request,io){
  check(exact(request,['schema_version','call','trusted_caller','expected_instance'])&&request.schema_version===MASTER_MODE,'MASTER_REQUEST_INVALID');
  const call=authorizeMaster(request.call,request.trusted_caller),plan=queryPlan(call);
  const before=verifyBinding(io.inspect(),request.expected_instance),d=io.guard();
  io.reportGuard(d,before);verifySingleGuard(d);
  const ack=await io.acknowledge();
  check(exact(ack,['command','hash','source_binding_sha256','call_sha256'])&&ack.command==='containment_verified'
    &&ack.hash===d.hash&&ack.source_binding_sha256===sha(stable(before))&&ack.call_sha256===sha(stable(call)),'SINGLE_ACK_INVALID');
  check(stable(verifyBinding(io.inspect(),request.expected_instance))===stable(before),'SINGLE_SOURCE_CHANGED');io.confirmMount(d);
  let db,selects=0,selected,stage='open';const actions=[],started=performance.now();
  try{
    db=io.open({readOnly:true,allowExtension:false,defensive:true,timeout:0,enableForeignKeyConstraints:false,
      limits:{length:1048576,sqlLength:4096,attach:0,column:32}});
    stage='authorizer';db.setAuthorizer((action,table,column,database)=>{
      actions.push({action,table:table??null,column:column??null,database:database??null});
      if(actions.length>64)return io.constants.SQLITE_DENY;
      if(action===io.constants.SQLITE_SELECT)return ++selects===1?io.constants.SQLITE_OK:io.constants.SQLITE_DENY;
      return action===io.constants.SQLITE_READ&&database==='main'&&table===plan.table&&plan.columns.includes(column)
        ?io.constants.SQLITE_OK:io.constants.SQLITE_DENY;
    });
    stage='prepare';const statement=db.prepare(plan.sql);stage='step';
    selected=plan.id==='risks'?statement.all(...plan.parameters):[statement.get(...plan.parameters)??null];
    check(selects===1,'SINGLE_SELECT_COUNT');
  }catch(e){
    // Fixed SQL/schema only. Preserve compiler/authorizer evidence, never private host paths.
    e.sql_diagnostic={stage,errcode:Number.isSafeInteger(e.errcode)?e.errcode:null,
      errstr:typeof e.errstr==='string'?e.errstr.slice(0,100):null,
      message:String(e.message).replace(/\/\S+/g,'[path]').slice(0,200),authorizer_actions:actions};
    throw e;
  }finally{if(db)db.close();}
  const elapsed=performance.now()-started;check(elapsed<=250,'SINGLE_READ_LIMIT');
  const after=verifyBinding(io.inspect(),request.expected_instance);
  check(stable(after)===stable(before),'SINGLE_SOURCE_CHANGED');io.confirmMount(d);
  return {result:projectMaster(call,selected),receipt:{mode:MASTER_MODE,readOnly:true,explicit_statement_count:1,query_ids:[plan.id],
    query_sha256:sha(plan.sql),parameters:plan.parameters,selected_rows_sha256:sha(stable(selected)),
    source_before:before,source_after:after,containment_diagnostic_sha256:d.hash,mount_namespace:d.proof.namespace,
    authorizer_selects:selects,authorizer_actions:actions,sql_elapsed_ms:elapsed}};
}
export function verifyMasterResult(call,event,binding,diagnostic){
  const plan=queryPlan(call),r=event?.receipt,selected=expectedRows(call);
  check(event?.event==='SINGLE_RESULT'&&r?.mode===MASTER_MODE&&r.readOnly===true&&r.explicit_statement_count===1
    &&r.authorizer_selects===1&&stable(r.query_ids)===stable([plan.id])&&r.query_sha256===sha(plan.sql)
    &&stable(r.parameters)===stable(plan.parameters)&&r.selected_rows_sha256===sha(stable(selected))
    &&stable(r.source_before)===stable(binding)&&stable(r.source_after)===stable(binding)
    &&r.containment_diagnostic_sha256===diagnostic.hash&&r.mount_namespace===diagnostic.proof.namespace
    &&Number.isFinite(r.sql_elapsed_ms)&&r.sql_elapsed_ms>=0&&r.sql_elapsed_ms<=250,'MASTER_RECEIPT_INVALID');
  check(stable(event.result)===stable(projectMaster(call,selected)),'MASTER_RESULT_INVALID');
  return event.result;
}
