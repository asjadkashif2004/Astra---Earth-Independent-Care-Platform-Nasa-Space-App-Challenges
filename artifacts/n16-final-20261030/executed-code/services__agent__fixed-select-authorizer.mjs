// One fixed statement; compiler callbacks are not application SQL executions.
import { QUERIES } from './sqlite-fixture-contract.mjs';
import { exact,stable,METRIC_NAMES } from './read-contract.mjs';
import { singleCheck as check } from './single-select-contract.mjs';
const C={SQLITE_OK:0,SQLITE_DENY:1,SQLITE_READ:20,SQLITE_SELECT:21};
const NAMES={1:'SQLITE_CREATE_INDEX',2:'SQLITE_CREATE_TABLE',9:'SQLITE_DELETE',18:'SQLITE_INSERT',19:'SQLITE_PRAGMA',
  20:'SQLITE_READ',21:'SQLITE_SELECT',22:'SQLITE_TRANSACTION',23:'SQLITE_UPDATE',24:'SQLITE_ATTACH',25:'SQLITE_DETACH',
  26:'SQLITE_ALTER_TABLE',31:'SQLITE_FUNCTION',32:'SQLITE_SAVEPOINT',33:'SQLITE_RECURSIVE'};
function validatePlan(p){
  const columns=p?.id==='risks'?['id','crew_id','status','json','sha256']:['crew_id','metric','json','sha256'];
  const table=p?.id==='risks'?'risks':p?.id==='baseline'?'baselines':'observations',a=p?.parameters;
  check(exact(p,['id','sql','table','columns','parameters'])&&['observation','baseline','risks'].includes(p.id)
    &&p.sql===QUERIES[p.id]&&p.table===table&&stable(p.columns)===stable(columns)&&Array.isArray(a)
    &&/^CREW-0[1-6]$/.test(a[0])&&(p.id==='risks'?a.length===3&&a[1]==='open'&&Number.isInteger(a[2])&&a[2]>=2&&a[2]<=21
      :a.length===2&&METRIC_NAMES.includes(a[1])),'FIXED_SQL_PLAN_INVALID');
  return structuredClone(p);
}
// Callback policy replay is also used independently by the parent.
function decision(plan,state,row){
  if(state.denied||state.actions>64||![4,5].includes(row.argument_count)||row.source_context!==null
    ||!['prepare','step'].includes(row.phase))return false;
  if(row.action===21){
    if(row.table!==null||row.column!==null||row.database!==null)return false;
    if(state.selects===0&&row.phase==='prepare'){state.selects++;return true;}
    if(plan.id==='risks'&&state.selects===1&&row.phase==='step'&&state.prepared
      &&plan.columns.every(c=>state.columns.has(c))){state.selects++;return true;}
    return false;
  }
  if(row.action===20&&state.selects>0&&row.database==='main'&&row.table===plan.table&&plan.columns.includes(row.column)){
    state.columns.add(row.column);return true;
  }
  return false;
}
export function verifyAuthorization(plan,rows,selects){
  plan=validatePlan(plan);
  check(Array.isArray(rows)&&rows.length>0&&rows.length<=64,'AUTHORIZATION_TRANSCRIPT_INVALID');
  const s={selects:0,columns:new Set(),prepared:false,actions:0,denied:false};let inStep=false;
  for(const r of rows){
    check(exact(r,['action','action_name','table','column','database','source_context','argument_count','phase','statement_id','decision'])
      &&r.statement_id==='fixed-select-01'&&r.action_name===(NAMES[r.action]??'SQLITE_UNKNOWN'),'AUTHORIZATION_TRANSCRIPT_INVALID');
    if(r.phase==='step'){inStep=true;s.prepared=true;}
    check(!inStep||r.phase==='step','AUTHORIZATION_PHASE_INVALID');
    s.actions++;const allowed=decision(plan,s,r);
    check(allowed&&r.decision==='ALLOW','AUTHORIZATION_ACTION_REJECTED');
  }
  check(s.selects===selects&&selects>=1&&selects<=(plan.id==='risks'?2:1)
    &&plan.columns.every(c=>s.columns.has(c)),'AUTHORIZATION_TRANSCRIPT_INVALID');
  return true;
}
export class FixedSelect{
  #plan;#phase='idle';#prepared=0;#stepped=0;#statement;#rows=[];#state={selects:0,columns:new Set(),prepared:false,actions:0,denied:false};
  constructor(plan,constants){
    this.#plan=validatePlan(plan);
    check(Object.entries(C).every(([k,v])=>constants[k]===v),'SQLITE_ACTION_CONSTANTS_CHANGED');
  }
  authorize(...args){
    const [action,table,column,database,origin]=args;
    const row={action,action_name:NAMES[action]??'SQLITE_UNKNOWN',table:table??null,column:column??null,database:database??null,
      source_context:origin==null?null:typeof origin==='string'?origin.slice(0,128):'INVALID_CONTEXT',
      argument_count:args.length,phase:this.#phase,statement_id:'fixed-select-01'};
    this.#state.actions++;
    const ok=decision(this.#plan,this.#state,row);row.decision=ok?'ALLOW':'DENY';
    if(this.#rows.length<65)this.#rows.push(row);
    if(!ok)this.#state.denied=true;
    return ok?C.SQLITE_OK:C.SQLITE_DENY;
  }
  prepare(db,sql=this.#plan.sql){
    check(sql===this.#plan.sql,'SQL_NOT_ALLOWLISTED');check(this.#prepared===0&&this.#phase==='idle','ADDITIONAL_SQL_STATEMENT');
    this.#prepared++;this.#phase='install';db.setAuthorizer((...args)=>this.authorize(...args));this.#phase='prepare';
    this.#statement=db.prepare(sql);this.#state.prepared=true;return this.#statement;
  }
  step(statement,parameters=this.#plan.parameters){
    check(statement===this.#statement&&this.#prepared===1&&this.#stepped===0&&this.#phase==='prepare','ADDITIONAL_SQL_STEP');
    check(stable(parameters)===stable(this.#plan.parameters),'SQL_PARAMETER_SCOPE_CHANGED');
    this.#stepped++;this.#phase='step';
    return this.#plan.id==='risks'?statement.all(...parameters):[statement.get(...parameters)??null];
  }
  seal(){this.#phase='closed';}
  snapshot(){
    return {prepare_count:this.#prepared,step_count:this.#stepped,authorizer_selects:this.#state.selects,
      authorizer_actions:structuredClone(this.#rows)};
  }
  receipt(){
    check(this.#prepared===1&&this.#stepped===1&&!this.#state.denied,'SQL_STATEMENT_EXECUTION_INVALID');
    const s=this.snapshot();verifyAuthorization(this.#plan,s.authorizer_actions,s.authorizer_selects);
    return {...s,authorizer_policy:'astra.n16.fixed-select-authorizer.v2'};
  }
}
