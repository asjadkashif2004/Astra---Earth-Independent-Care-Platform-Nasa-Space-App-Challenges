// Deterministic callback/SQL-object mocks only. No SQLite, native worker or source bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedSelect,verifyAuthorization } from '../services/agent/fixed-select-authorizer.mjs';
import { masterCall,queryPlan,ORDER } from '../services/agent/master-contract.mjs';
import { StartupBudget,safetyFailure } from '../services/agent/master-storage.mjs';
import { issueDemoAuthority,coordinate } from '../services/agent/master-coordinator.mjs';

const C={SQLITE_OK:0,SQLITE_DENY:1,SQLITE_READ:20,SQLITE_SELECT:21};
const error=code=>Object.assign(Error(code),{code});
function fixture(tool='get_open_risk_events',{repeat=true,origin=null,corrupt}={}){
  const plan=queryPlan(masterCall(tool)),gate=new FixedSelect(plan,C),counts={prepare:0,step:0},result=tool==='get_open_risk_events'?[]:[{mock:true}];
  let authorizer;
  const authorize=()=>{assert.equal(authorizer(21,null,null,null,origin),0);
    for(const column of plan.columns)assert.equal(authorizer(20,plan.table,column,'main',origin),0);};
  const statement={all:(...p)=>{counts.step++;assert.deepEqual(p,plan.parameters);if(repeat)authorize();corrupt?.(authorizer);return result;},
    get:(...p)=>{counts.step++;assert.deepEqual(p,plan.parameters);if(repeat)authorize();corrupt?.(authorizer);return result[0];}};
  const db={setAuthorizer:a=>authorizer=a,prepare:sql=>{counts.prepare++;assert.equal(sql,plan.sql);authorize();return statement;}};
  return {plan,gate,counts,db,statement,result,auth:(...args)=>authorizer(...args),run(){
    const s=gate.prepare(db),rows=gate.step(s);gate.seal();return {rows,receipt:gate.receipt()};
  }};
}
test('saved failure reproduces bounded risk reauthorization with one prepare/step and symbolic complete callback records',()=>{
  const f=fixture(),r=f.run();assert.deepEqual(f.counts,{prepare:1,step:1});
  assert.equal(r.receipt.authorizer_selects,2);assert.equal(r.receipt.authorizer_actions.length,12);
  assert.deepEqual(r.receipt.authorizer_actions.filter(a=>a.action===21).map(a=>a.phase),['prepare','step']);
  assert.ok(r.receipt.authorizer_actions.every(a=>a.argument_count===5&&a.source_context===null&&a.decision==='ALLOW'));
  assert.equal(verifyAuthorization(f.plan,r.receipt.authorizer_actions,2),true);
});
for(const tool of ORDER)test(tool+' preserves its exact query/parameters and bounded normal callbacks',()=>{
  const f=fixture(tool,{repeat:false}),r=f.run();assert.equal(r.receipt.prepare_count,1);assert.equal(r.receipt.step_count,1);
  assert.equal(r.receipt.authorizer_selects,1);assert.equal(verifyAuthorization(f.plan,r.receipt.authorizer_actions,1),true);
});
test('second statement or arbitrary SQL is rejected before invoking database prepare',()=>{
  const f=fixture();assert.throws(()=>f.gate.prepare(f.db,f.plan.sql+'; SELECT 1'),{code:'SQL_NOT_ALLOWLISTED'});assert.equal(f.counts.prepare,0);
  const s=f.gate.prepare(f.db);assert.throws(()=>f.gate.prepare(f.db),{code:'ADDITIONAL_SQL_STATEMENT'});assert.equal(f.counts.prepare,1);
  f.gate.step(s);assert.throws(()=>f.gate.step(s),{code:'ADDITIONAL_SQL_STEP'});assert.equal(f.counts.step,1);
});
test('different statement object or cross-crew bound parameters cannot be stepped',()=>{
  for(const change of ['object','crew']){
    const f=fixture(),s=f.gate.prepare(f.db);
    assert.throws(()=>f.gate.step(change==='object'?{}:s,change==='crew'?['CREW-02','open',6]:f.plan.parameters));
    assert.equal(f.counts.step,0);
  }
});
for(const [label,args] of [
  ['foreign table',[20,'observations','id','main',null]],['foreign column',[20,'risks','private','main',null]],
  ['foreign database',[20,'risks','id','temp',null]],['metadata',[20,'fixture_meta','json','main',null]],
  ['schema metadata',[20,'sqlite_schema','sql','main',null]],['trigger',[20,'risks','id','main','trigger_name']],
  ['view',[20,'risks','id','main','risk_view']],['function',[31,null,'load_extension',null,null]],
  ['insert',[18,'risks',null,'main',null]],['delete',[9,'risks',null,'main',null]],
  ['update',[23,'risks','json','main',null]],['attach',[24,'other.sqlite',null,null,null]],
  ['detach',[25,'other',null,null,null]],['create',[2,'new_table',null,'main',null]],
  ['alter',[26,'main','risks',null,null]],['pragma',[19,'query_only','OFF',null,null]],
  ['transaction',[22,'BEGIN',null,null,null]],['recursive',[33,null,null,null,null]],
  ['unknown',[999,null,null,null,null]]
])test(label+' remains denied and cannot yield a receipt',()=>{
  const f=fixture();f.gate.prepare(f.db);assert.equal(f.auth(...args),1);
  assert.throws(()=>f.gate.receipt());assert.equal(f.counts.step,0);
});
test('additional SELECT during prepare, third SELECT, or repeated non-risk SELECT is denied',()=>{
  const a=fixture();a.gate.prepare(a.db);assert.equal(a.auth(21,null,null,null,null),1);
  const b=fixture('get_data_quality',{repeat:false});const stmt=b.gate.prepare(b.db);
  // Inject into the legitimate step phase without issuing a new SQL statement.
  stmt.get=()=>{assert.equal(b.auth(21,null,null,null,null),1);return null;};b.gate.step(stmt);assert.throws(()=>b.gate.receipt());
  const c=fixture('get_open_risk_events',{corrupt:auth=>assert.equal(auth(21,null,null,null,null),1)});
  assert.throws(()=>c.run());assert.equal(c.counts.prepare,1);
});
test('unbounded callback expansion, extra callback arguments and forged phases are rejected',()=>{
  const f=fixture('get_open_risk_events',{repeat:false}),s=f.gate.prepare(f.db);
  for(let i=0;i<70;i++)f.auth(20,'risks','id','main',null);
  f.gate.step(s);assert.throws(()=>f.gate.receipt());
  const g=fixture();g.gate.prepare(g.db);assert.equal(g.auth(20,'risks','id','main',null,'extra'),1);
  const good=fixture(),r=good.run(),rows=structuredClone(r.receipt.authorizer_actions);
  rows[0].phase='step';assert.throws(()=>verifyAuthorization(good.plan,rows,2));
});
test('parent rejects tampered symbolic names, source context, statement identity, counts and missing records',()=>{
  const f=fixture(),r=f.run();
  for(const mutate of [r=>r[0].action_name='SQLITE_READ',r=>r[0].source_context='view',
    r=>r[0].statement_id='another-query',r=>r.splice(0,1),r=>r[0].decision='DENY']){
    const rows=structuredClone(r.receipt.authorizer_actions);mutate(rows);assert.throws(()=>verifyAuthorization(f.plan,rows,2));
  }
  assert.throws(()=>verifyAuthorization(f.plan,r.receipt.authorizer_actions,3));
});
test('plan tampering cannot widen tables, columns, databases, SQL or parameters',()=>{
  const plan=queryPlan(masterCall('get_open_risk_events'));
  for(const mutate of [p=>p.sql='SELECT * FROM risks',p=>p.columns.push('private'),p=>p.table='risk_view',
    p=>p.parameters[0]='CREW-99',p=>p.parameters[1]='acknowledged',p=>p.parameters[2]=1000,p=>p.database='other']){
    const p=structuredClone(plan);mutate(p);assert.throws(()=>new FixedSelect(p,C));
  }
});
test('six-start ledger is isolated, hard-capped and cannot inherit a12-start state or clear a failure',async()=>{
  const b=new StartupBudget(async()=>{},undefined,{maximum:6});
  for(let i=0;i<6;i++)await b.reserve(i%2?'get_data_quality':'get_current_vitals');
  await assert.rejects(b.reserve('get_open_risk_events'),{code:'MASTER_STARTUP_BUDGET'});
  const c=new StartupBudget(async()=>{},{maximum:12,reservations:[],halted:null},{maximum:6});
  await assert.rejects(c.reserve('get_open_risk_events'),{code:'MASTER_BUDGET_CORRUPT'});
  const invalid=new StartupBudget(async()=>{},null,{maximum:6});
  await assert.rejects(invalid.reserve('get_open_risk_events'),{code:'MASTER_BUDGET_CORRUPT'});
  const d=new StartupBudget(async()=>{},undefined,{maximum:6});await d.halt('UNAUTHORIZED_SQL');
  await assert.rejects(d.reserve('get_open_risk_events'));assert.equal(safetyFailure('AUTHORIZATION_ACTION_REJECTED'),true);
});
test('closed trusted four-tool permutations may be risk-first; duplicates/extra/missing tools never dispatch',async()=>{
  const capability=issueDemoAuthority();let calls=0;const trace={append:async()=>{},id:'mock'};
  const execute=async()=>{calls++;throw error('MOCK_EXPECTED_FAILURE');};
  const source={binding:{}},order=['get_open_risk_events',...ORDER.slice(0,3)];
  const result=await coordinate(capability,{trace,execute,source,order});assert.equal(calls,1);assert.equal(result.calls[0].tool,'get_open_risk_events');
  for(const order of [[],[...ORDER,'shell'],[ORDER[0],...ORDER.slice(0,3)]]){
    calls=0;await assert.rejects(coordinate(capability,{trace,execute,source,order}));assert.equal(calls,0);
  }
});
test('accept-everything and reject-everything authorizers fail a discriminating oracle',()=>{
  function oracle(factory){
    const f=factory(),s=f.gate.prepare(f.db),rows=f.gate.step(s);assert.ok(rows);f.gate.receipt();
    assert.equal(f.auth(23,'risks','json','main',null),1);
  }
  oracle(()=>fixture());
  assert.throws(()=>oracle(()=>{const f=fixture();f.gate.receipt=()=>({});f.auth=()=>0;return f;}));
  assert.throws(()=>oracle(()=>{const f=fixture();f.db.setAuthorizer=()=>{throw error('REJECT_ALL');};return f;}));
});
