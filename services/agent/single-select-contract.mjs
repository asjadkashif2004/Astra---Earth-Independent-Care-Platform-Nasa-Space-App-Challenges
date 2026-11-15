// N16-06F only. Pure policy and injected SQL boundary; no filesystem or SQLite import.
import { requirePermission } from '../../packages/contracts.mjs';
import { exact,validateCall,sha,stable,fail } from './read-contract.mjs';
import { QUERIES,SCHEMA,projectRows } from './sqlite-fixture-contract.mjs';
import { SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA,AS_OF } from './designated-contract.mjs';
import { validateContainmentRecord } from './containment-diagnostics.mjs';

export const SINGLE_MODE='n16-06f-single-select-v1';
export const singleCheck=(ok,code)=>{if(!ok)fail(code);};
export function authorizeSingle(input,context){
  const call=validateCall(input);
  singleCheck(exact(context,['principal','crew_ids','read_as_of'])&&context.principal?.role==='astronaut'
    &&Array.isArray(context.crew_ids)&&context.crew_ids.length===1&&context.crew_ids[0]===context.principal.crew_id
    &&context.read_as_of===AS_OF,'SINGLE_SCOPE_INVALID');
  requirePermission(context.principal,'read',call.args.crew_id);
  singleCheck(call.tool==='get_current_vitals'&&call.args.metrics.length===1
    &&context.crew_ids.includes(call.args.crew_id),'SINGLE_CALL_FORBIDDEN');
  return call;
}
export function verifyBinding(b,instance){
  singleCheck(exact(b,['source_id','source_sha256','source_bytes','spec_sha256','schema_sha256','source_identity','inventory','file_mode','directory_mode','journal_mode'])
    &&b.source_id===SOURCE_ID&&b.source_sha256===SOURCE_SHA&&b.source_bytes===SOURCE_BYTES&&b.spec_sha256===SPEC_SHA
    &&b.schema_sha256===sha(SCHEMA)&&stable(b.source_identity)===stable(instance)
    &&stable(b.inventory)===stable(['source.sqlite'])&&b.file_mode==='0400'&&b.directory_mode==='0500'
    &&b.journal_mode==='closed_rollback','SINGLE_SOURCE_UNVERIFIED');
  singleCheck(exact(instance,['directory','file'])&&exact(instance.directory,['dev','ino'])
    &&exact(instance.file,['dev','ino','birth_ns','change_ns'])
    &&Object.values(instance.directory).every(v=>typeof v==='string'&&/^\d+$/.test(v))
    &&Object.values(instance.file).every(v=>typeof v==='string'&&/^\d+$/.test(v)),'SINGLE_INSTANCE_INVALID');
  return b;
}
export function verifySingleGuard(d){
  validateContainmentRecord(d,{source_id:SOURCE_ID,sha256:SOURCE_SHA});
  singleCheck(d.qualified&&d.namespace_stable&&d.probes.length===3
    &&d.probes[0].code==='EROFS'&&d.probes[1].code==='EROFS'
    &&['EROFS','EACCES'].includes(d.probes[2].code),'SINGLE_CONTAINMENT_REJECTED');
  return d;
}
export async function executeSingle(request,io,{mode=SINGLE_MODE,authorize=authorizeSingle}={}){
  singleCheck(exact(request,['schema_version','call','trusted_caller','expected_instance'])
    &&request.schema_version===mode,'SINGLE_REQUEST_INVALID');
  const call=authorize(request.call,request.trusted_caller);
  const before=verifyBinding(io.inspect(),request.expected_instance),d=io.guard();
  io.reportGuard(d,before);verifySingleGuard(d);
  const ack=await io.acknowledge();
  singleCheck(exact(ack,['command','hash','source_binding_sha256','call_sha256'])&&ack.command==='containment_verified'
    &&ack.hash===d.hash&&ack.source_binding_sha256===sha(stable(before))&&ack.call_sha256===sha(stable(call)),'SINGLE_ACK_INVALID');
  singleCheck(stable(verifyBinding(io.inspect(),request.expected_instance))===stable(before),'SINGLE_SOURCE_CHANGED');
  io.confirmMount(d);
  let db,selects=0;const actions=[];const started=performance.now();let selected;
  try{
    db=io.open({readOnly:true,allowExtension:false,defensive:true,timeout:0,enableForeignKeyConstraints:false,
      limits:{length:1048576,sqlLength:4096,attach:0,column:32}});
    db.setAuthorizer((action,table,column,database)=>{
      actions.push({action,table:table??null,column:column??null,database:database??null});
      if(actions.length>64)return io.constants.SQLITE_DENY;
      if(action===io.constants.SQLITE_SELECT)return ++selects===1?io.constants.SQLITE_OK:io.constants.SQLITE_DENY;
      if(action===io.constants.SQLITE_READ&&database==='main'&&table==='observations'
        &&['crew_id','metric','json','sha256'].includes(column))return io.constants.SQLITE_OK;
      return io.constants.SQLITE_DENY;
    });
    selected=db.prepare(QUERIES.observation).get(call.args.crew_id,call.args.metrics[0])??null;
    singleCheck(selects===1,'SINGLE_SELECT_COUNT');
  }finally{if(db)db.close();}
  const elapsed=performance.now()-started;singleCheck(elapsed<=250,'SINGLE_READ_LIMIT');
  const after=verifyBinding(io.inspect(),request.expected_instance);
  singleCheck(stable(after)===stable(before),'SINGLE_SOURCE_CHANGED');io.confirmMount(d);
  const result=projectRows('elevated',0,call,[selected]);
  return {result,receipt:{mode,readOnly:true,explicit_statement_count:1,query_ids:['observation'],
    query_sha256:sha(QUERIES.observation),parameters:[call.args.crew_id,call.args.metrics[0]],selected_rows_sha256:sha(stable([selected])),
    source_before:before,source_after:after,containment_diagnostic_sha256:d.hash,mount_namespace:d.proof.namespace,
    authorizer_selects:selects,authorizer_actions:actions,sql_elapsed_ms:elapsed}};
}
