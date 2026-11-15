// Deterministic mock SQL/guards/processes and disposable traces. No native worker/SQLite imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { constants as OS } from 'node:os';
import { readFile,mkdir,mkdtemp,writeFile,symlink,link,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { MASTER_MODE,ORDER,masterCaller,masterCall,authorizeMaster,queryPlan,projectMaster,executeMaster } from '../services/agent/master-contract.mjs';
import { issueDemoAuthority,demoScope,coordinate,presentation,renderDemo,validateResources,researchBoundary } from '../services/agent/master-coordinator.mjs';
import { StartupBudget,atomicRecord,readRecord,safetyFailure } from '../services/agent/master-storage.mjs';
import { ResourceJournal } from '../services/agent/resource-journal.mjs';
import { probeContainment } from '../services/agent/containment-diagnostics.mjs';
import { ExecutionTrace,recoverTrace } from '../services/agent/execution-trace.mjs';
import { masterSandbox,BOUNDS } from '../services/agent/master-supervisor.mjs';
import { SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA,AS_OF,expectedRows } from '../services/agent/designated-contract.mjs';
import { QUERIES,SCHEMA } from '../services/agent/sqlite-fixture-contract.mjs';
import { sha,stable } from '../services/agent/read-contract.mjs';

const ROOT=new URL('../artifacts/n16-master-20261029/qa/',import.meta.url).pathname;await mkdir(ROOT,{recursive:true});
const INSTANCE={directory:{dev:'1',ino:'2'},file:{dev:'1',ino:'3',birth_ns:'4',change_ns:'5'}};
const BINDING={source_id:SOURCE_ID,source_sha256:SOURCE_SHA,source_bytes:SOURCE_BYTES,spec_sha256:SPEC_SHA,schema_sha256:sha(SCHEMA),
  source_identity:INSTANCE,inventory:['source.sqlite'],file_mode:'0400',directory_mode:'0500',journal_mode:'closed_rollback'};
const source={binding:BINDING,manifest_sha256:'5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c'};
const C={SQLITE_OK:0,SQLITE_DENY:1,SQLITE_READ:20,SQLITE_SELECT:21};
const err=code=>Object.assign(Error(code),{code});
const RO='1 9 0:1 / / ro - tmpfs synthetic-root rw\n2 1 8:1 /sealed /fixture ro,nosuid,nodev - ext4 synthetic-device rw\n';
function diagnostic({code='EACCES',mounts=RO}={}){
  const deny=c=>()=>{throw Object.assign(err(c),{errno:-OS.errno[c],syscall:'open'});};
  return probeContainment({readMountInfo:()=>mounts,mountNamespace:()=>'mnt:[42]',createRootFile:deny('EROFS'),createSourceFile:deny('EROFS'),openSourceReadwrite:deny(code)}, {source_id:SOURCE_ID,sha256:SOURCE_SHA});
}
function fixture(call=masterCall(ORDER[0]),scope=masterCaller()){
  const state={opens:0,prepares:0,gets:0,alls:0,closes:0,actions:[],proof:null};
  const io={constants:C,inspect:()=>structuredClone(BINDING),guard:()=>diagnostic(),reportGuard:d=>state.proof=d,
    confirmMount:d=>assert.deepEqual(d.proof,diagnostic().proof),
    acknowledge:async()=>({command:'containment_verified',hash:state.proof.hash,source_binding_sha256:sha(stable(BINDING)),call_sha256:sha(stable(call))}),
    open:options=>{state.opens++;assert.deepEqual(options,{readOnly:true,allowExtension:false,defensive:true,timeout:0,enableForeignKeyConstraints:false,
      limits:{length:1048576,sqlLength:4096,attach:0,column:32}});
      return {exec:()=>assert.fail('No SQL setup or mutation is allowed'),setAuthorizer:f=>state.authorizer=f,
        prepare:sql=>{state.prepares++;const p=queryPlan(call);assert.equal(sql,QUERIES[p.id]);
          assert.equal(state.authorizer(C.SQLITE_SELECT,null,null,null),0);
          for(const c of p.columns)assert.equal(state.authorizer(C.SQLITE_READ,p.table,c,'main'),0);
          return {get:(...args)=>{state.gets++;assert.deepEqual(args,p.parameters);return structuredClone(expectedRows(call)[0]);},
            all:(...args)=>{state.alls++;assert.deepEqual(args,p.parameters);return structuredClone(expectedRows(call));}};
        },close:()=>state.closes++};}};
  const request={schema_version:MASTER_MODE,call,trusted_caller:scope,expected_instance:INSTANCE};
  return {state,io,request,run:()=>executeMaster(request,io)};
}
async function resourceReceipt(){
  let raw=Buffer.alloc(0);
  const j=new ResourceJournal({write:async(b,p)=>{const x=Buffer.alloc(Math.max(raw.length,p+b.length));raw.copy(x);b.copy(x,p);raw=x;return b.length;},
    sync:async()=>true,read:async(p,n)=>raw.subarray(p,p+n),readAll:async()=>raw,close:async()=>true});
  await j.sample(()=>({phase:'resource',rss:1,counted_bytes:1}));
  for(let i=0;i<3;i++)await j.event({phase:'worker_event',index:i});
  return j.finalize({samples:1,events:3});
}
async function valueFor(call,scope){
  const f=fixture(call,scope),v=await f.run();
  return {event:{event:'SINGLE_RESULT',...v},binding:BINDING,diagnostic:f.state.proof,resources:await resourceReceipt(),
    measurement:{actual_startups:0,fixture_type:'MOCK_NOT_NATIVE'}};
}
async function workflow(execute=valueFor,{signal,scope=issueDemoAuthority(),fault,clock,recovered_tools}={}){
  const root=await mkdtemp(join(ROOT,'trace-')),trace=await ExecutionTrace.create({task:'N16_MASTER_MOCK',source:BINDING},{root,fault});
  try{const result=await coordinate(scope,{trace,execute,source:{...source,recovered_tools},signal,clock});await trace.close();
    return {result,recovery:await recoverTrace(trace.id,{root}),root,id:trace.id};}
  catch(e){await trace.close();throw e;}
}
for(const tool of ORDER)for(const crew of ['CREW-01','CREW-02','CREW-03','CREW-04','CREW-05','CREW-06'])
  test(tool+' '+crew+' genuinely invokes one mock SELECT with exact parameters',async()=>{
    const call=masterCall(tool,crew),f=fixture(call,masterCaller(crew)),v=await f.run();
    assert.deepEqual([f.state.opens,f.state.prepares,f.state.closes],[1,1,1]);assert.equal(f.state.gets+f.state.alls,1);
    assert.equal(v.result.crew_id,crew);assert.equal(v.receipt.authorizer_selects,1);assert.equal(v.receipt.explicit_statement_count,1);
    assert.equal(v.result.inference_performed,false);
    if(tool==='get_data_quality'){assert.equal(v.result.data.items[0].value,null);assert.equal(v.result.data.items[0].quality.confidence,0.99);}
    if(tool==='get_personal_baseline'){const b=v.result.data.items[0].value;assert.equal(b.method,'authored_fixture_reference');assert.equal(b.count,null);assert.equal(b.window_days,null);}
    if(tool==='get_open_risk_events'){assert.equal(v.result.data.N02_provenance,'UNKNOWN');assert.equal(v.result.data.actual_N02_event,false);}
  });
test('unknown names, malformed args, SQL/path/role injection never open the mock database',async()=>{
  for(const change of [c=>c.tool='launch_shell',c=>c.args.sql='SELECT 1',c=>c.source_path='/data/runtime/astra.sqlite',
    c=>c.args.metrics=[],c=>c.args.metrics=['heart_rate','spo2'],c=>c.args.role='flight_surgeon']){
    const f=fixture();f.request.call=structuredClone(f.request.call);change(f.request.call);await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('wrong crew/role/missing/forged caller context denies before SQL and opaque coordinator authority cannot be forged',async()=>{
  for(const scope of [null,{},masterCaller('CREW-02'),{...masterCaller(),principal:{id:'n16-master-owner-demo',role:'system_admin',crew_id:'CREW-03'}},
    {...masterCaller(),read_as_of:'2020-01-01T00:00:00.000Z'}]){
    const f=fixture(masterCall(ORDER[0]),scope);await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
  assert.throws(()=>demoScope({}),{code:'UNTRUSTED_CONTEXT'});
  await assert.rejects(workflow(()=>assert.fail('must not execute'),{scope:{}}));
});
for(const [name,mutate] of [
  ['hash',b=>b.source_sha256='0'.repeat(64)],['schema',b=>b.schema_sha256='0'.repeat(64)],['missing manifest provenance',b=>delete b.spec_sha256],
  ['sidecar',b=>b.inventory.push('source.sqlite-shm')],['replacement',b=>b.source_identity.file.ino='33'],
  ['changed source',b=>b.source_identity.file.change_ns='77'],['writable source',b=>b.file_mode='0600'],
  ['wrong source',b=>b.source_id='operational'],['invalid size',b=>b.source_bytes++]
])test(name+' provenance rejection precedes SQL',async()=>{
  const f=fixture();f.io.inspect=()=>{const b=structuredClone(BINDING);mutate(b);return b;};await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
for(const opts of [{mounts:''},{mounts:RO.replace('/fixture ro,','/fixture rw,')},{code:'EPERM'}])
  test('incomplete/writable mount or unapproved errno cannot release SQL '+JSON.stringify(opts),async()=>{
    const f=fixture();f.io.guard=()=>diagnostic(opts);await assert.rejects(f.run());assert.equal(f.state.opens,0);
  });
for(const code of ['EACCES','EROFS'])test('independent mount plus '+code+' passes, without accepting errno alone',async()=>{
  const f=fixture();f.io.guard=()=>diagnostic({code});assert.equal((await f.run()).receipt.readOnly,true);
});
test('forged mount namespace and writable alias fail closed',async()=>{
  for(const guard of [()=>{const d=diagnostic();d.proof.namespace='mnt:[999]';return d;},
    ()=>diagnostic({mounts:RO+'3 2 8:1 /alias /fixture/source.sqlite rw - ext4 synthetic rw\n'})]){
    const f=fixture();f.io.guard=guard;await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('missing/delayed-failed diagnostic acknowledgement prevents every SQL open',async()=>{
  for(const ack of [async()=>null,async()=>{throw err('ACK_PERSISTENCE_FAILED');},async()=>({command:'containment_verified'})]){
    const f=fixture();f.io.acknowledge=ack;await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('authorizer denies mutations, PRAGMA, transactions, schema reads, extra SELECTs and cross-table access',async()=>{
  for(const tool of ORDER){
    const f=fixture(masterCall(tool));await f.run();
    for(const a of [18,19,22,23,24,31])assert.equal(f.state.authorizer(a,null,null,null),1);
    assert.equal(f.state.authorizer(C.SQLITE_SELECT,null,null,null),1);
    assert.equal(f.state.authorizer(C.SQLITE_READ,'sqlite_schema','sql','main'),1);
    assert.equal(f.state.authorizer(C.SQLITE_READ,'fixture_meta','json','main'),1);
    assert.equal(f.state.authorizer(C.SQLITE_READ,queryPlan(masterCall(tool)).table,'json','other'),1);
  }
});
test('SQL failure closes the connection and cannot create completed evidence',async()=>{
  const f=fixture(),open=f.io.open;f.io.open=o=>({...open(o),prepare:()=>{throw err('SQLITE_UNAVAILABLE');}});
  await assert.rejects(f.run(),e=>{assert.equal(e.code,'SQLITE_UNAVAILABLE');assert.equal(e.sql_diagnostic.stage,'prepare');
    assert.deepEqual(e.sql_diagnostic.authorizer_actions,[]);return true;});assert.equal(f.state.closes,1);
});
test('risk step with a second SELECT compiler callback fails closed and retains exact authorization evidence',async()=>{
  const f=fixture(masterCall('get_open_risk_events')),open=f.io.open;
  f.io.open=o=>{const db=open(o),prepare=db.prepare;db.prepare=sql=>{
    const statement=prepare(sql);statement.all=()=>{
      assert.equal(f.state.authorizer(C.SQLITE_SELECT,null,null,null),C.SQLITE_DENY);
      throw Object.assign(err('ERR_SQLITE_ERROR'),{errcode:23,errstr:'authorization denied'});
    };return statement;
  };return db;};
  await assert.rejects(f.run(),e=>{assert.equal(e.errcode,23);assert.equal(e.sql_diagnostic.stage,'step');
    assert.equal(e.sql_diagnostic.authorizer_actions.filter(a=>a.action===C.SQLITE_SELECT).length,2);return true;});
  assert.equal(f.state.prepares,1);assert.equal(f.state.closes,1);
});
test('missing baseline and observation projections remain UNKNOWN; unrelated or altered rows reject',()=>{
  for(const tool of ORDER.slice(0,3)){
    const c=masterCall(tool),v=projectMaster(c,[null]);assert.equal(v.data_status,'UNKNOWN');assert.equal(v.data.items[0].value,null);
    const rows=structuredClone(expectedRows(c));rows[0].crew_id='CREW-01';assert.throws(()=>projectMaster(c,rows));
  }
});
test('all four coordinator completions recover18real mock trace events with zero replay and explicit synthetic statuses',async()=>{
  const names=[],w=await workflow(async(c,s)=>{names.push(c.tool);return valueFor(c,s);});
  assert.deepEqual(names,ORDER);assert.equal(w.result.status,'COMPLETED');assert.equal(w.recovery.status,'COMPLETE');
  assert.equal(w.recovery.committed_events,18);assert.equal(w.recovery.replayed_calls,0);assert.equal(w.recovery.executed_calls.length,4);
  const p=presentation(w.recovery);assert.equal(p.fresh_UI_execution,false);assert.equal(p.results[3].data.N02_provenance,'UNKNOWN');
  assert.equal(p.results[1].data.items[0].value,null);assert.equal(p.research.complete_answer_support,'ABSTAIN');
});
test('explicit committed recovery reuses verified earlier results and dispatches only the missing tool',async()=>{
  let dispatches=0;const reused=ORDER.slice(0,3);
  const w=await workflow(async(c,s)=>{const v=await valueFor(c,s);
    if(reused.includes(c.tool))v.recovered_from={run_id:'earlier-mock',call_id:'committed'};else dispatches++;
    return v;
  },{recovered_tools:reused});
  assert.equal(w.result.status,'COMPLETED');assert.equal(dispatches,1);
  assert.ok(w.result.calls.slice(0,3).every(c=>c.native_execution==='RECOVERED_COMMITTED_NO_REPLAY'));
  assert.equal(w.result.calls[3].native_execution,'NEW_NATIVE_SQL');
});
for(const code of ['SQLITE_UNAVAILABLE','WORKER_START_FAILED','SINGLE_WORKER_TIMEOUT','CANCELLED','INCOMPLETE_SQL_RESULT'])
  test(code+' stops later tools and commits no false completion for failed call',async()=>{
    let n=0;const w=await workflow(async(c,s)=>{if(++n===2)throw err(code);return valueFor(c,s);});
    assert.equal(n,2);assert.equal(w.result.calls[2].execution_status,'NOT RUN');assert.equal(w.recovery.executed_calls.filter(c=>c.status==='COMPLETED').length,1);
    assert.equal(w.result.calls[1].data_status,'UNKNOWN');assert.notEqual(w.result.status,'COMPLETED');
  });
for(const bad of ['result','receipt','resource','provenance'])test(bad+' corruption cannot commit a tool result',async()=>{
  const w=await workflow(async(c,s)=>{const v=await valueFor(c,s);
    if(bad==='result')v.event.result.data.items[0].value=999;
    if(bad==='receipt')v.event.receipt.parameters=['CREW-02','heart_rate'];
    if(bad==='resource')v.resources={...v.resources,sample_count:7};
    if(bad==='provenance')v.binding={...v.binding,source_id:'live'};
    return v;
  });assert.equal(w.recovery.executed_calls[0].status,'FAILED');assert.equal(w.recovery.executed_calls[0].result,undefined);
});
test('trace failure before startup prevents execution; persistence failure after read never invents CALL_COMPLETED',async()=>{
  let executions=0;await assert.rejects(workflow(async()=>{executions++;},{fault:(op,type)=>{if(op==='append'&&type==='CALL_STARTED')throw err('MOCK_STORAGE');}}));assert.equal(executions,0);
  await assert.rejects(workflow(async(c,s)=>{executions++;return valueFor(c,s);},{fault:(op)=>{if(op==='result')throw err('MOCK_STORAGE');}}));
  assert.equal(executions,1);
});
test('pre-cancelled or elapsed workflow performs no tool dispatch',async()=>{
  const a=new AbortController();a.abort();let n=0;
  const w=await workflow(()=>{n++;assert.fail('dispatch denied');},{signal:a.signal});assert.equal(n,0);assert.equal(w.result.calls.length,4);
  let ticks=0;const z=await workflow(()=>assert.fail('deadline denied'),{clock:()=>ticks++===0?0:10001});assert.equal(z.result.status,'INCOMPLETE');
});
test('interruption/corrupt/truncated/checkpoint-missing evidence never becomes a clean completed run',async()=>{
  const root=await mkdtemp(join(ROOT,'interrupted-')),t=await ExecutionTrace.create({mock:true},{root});
  await t.append('CALL_REQUESTED',{call_id:'call-01'});await t.append('CALL_VALIDATED',{call_id:'call-01',tool:ORDER[0]});
  await t.append('CALL_STARTED',{call_id:'call-01',tool:ORDER[0]});await t.close();
  assert.equal((await recoverTrace(t.id,{root})).status,'INCOMPLETE');
  const log=join(root,t.id,'trace.jsonl'),bytes=await readFile(log);await writeFile(log,bytes.subarray(0,-8));
  await assert.rejects(recoverTrace(t.id,{root}));
});
test('budget serializes reservations, allows valid starts, rejects fifth repeated stage/thirteenth total, and halts safely',async()=>{
  const persisted=[],b=new StartupBudget(async v=>persisted.push(structuredClone(v)));
  const first=await Promise.all([b.reserve(ORDER[0]),b.reserve(ORDER[1])]);assert.deepEqual(first.map(x=>x.ordinal),[1,2]);
  for(let i=0;i<3;i++)await b.reserve(ORDER[0]);await assert.rejects(b.reserve(ORDER[0]),{code:'MASTER_STARTUP_BUDGET'});
  while(b.state.reservations.length<12)await b.reserve(ORDER[1+Math.floor((b.state.reservations.length-4)/4)]);
  await assert.rejects(b.reserve(ORDER[3]),{code:'MASTER_STARTUP_BUDGET'});assert.equal(persisted.length,12);
  const a=new StartupBudget(async()=>{});await a.halt('MOUNT_NOT_READONLY');await assert.rejects(a.reserve(ORDER[0]),{code:'MASTER_CAMPAIGN_HALTED'});
});
test('budget persistence failure admits no startup and corrupt ordinal state rejects',async()=>{
  const b=new StartupBudget(async()=>{throw err('DISK_FAILED');});await assert.rejects(b.reserve(ORDER[0]));assert.equal(b.state.reservations.length,0);
  const c=new StartupBudget(async()=>{},{maximum:12,reservations:[{ordinal:9,stage:ORDER[0]}],halted:null});await assert.rejects(c.reserve(ORDER[1]));
});
test('atomic task metadata rejects symlink and hardlink read substitutions',async()=>{
  const root=await mkdtemp(join(ROOT,'metadata-'));await atomicRecord(root,'valid.json',{counter:1});assert.deepEqual(await readRecord(root,'valid.json'),{counter:1});
  await symlink(join(root,'valid.json'),join(root,'alias.json'));await assert.rejects(readRecord(root,'alias.json'));
  await link(join(root,'valid.json'),join(root,'hard.json'));await assert.rejects(readRecord(root,'hard.json'));
  await rm(join(root,'hard.json'));await rm(join(root,'alias.json'));
});
test('standalone presentation escapes injection, is keyboard-native and cannot dispatch tools or network',async()=>{
  const w=await workflow(),m=presentation(w.recovery);m.results[0].note='<script>alert("x")</script>';const html=renderDemo(m);
  assert.doesNotMatch(html,/<script|fetch\(|onclick=|src=|<iframe/i);assert.match(html,/&lt;script&gt;/);assert.match(html,/<summary>/);
  assert.match(html,/Opening this file runs no tools/);assert.match(html,/UNKNOWN/);assert.match(html,/default-src 'none'/);
  const cancelled=presentation({...w.recovery,executed_calls:[{tool:ORDER[0],status:'CANCELLED'}]});assert.equal(cancelled.results[0].execution_status,'CANCELLED');
});
test('accept-all and reject-all mutants fail authorization and actual execution positive/negative oracle',async()=>{
  const c=masterCall(ORDER[0]),scope=masterCaller(),bad={...c,tool:'shell'};
  const oracle=fn=>{assert.equal(fn(c,scope).tool,ORDER[0]);assert.throws(()=>fn(bad,scope));};
  oracle(authorizeMaster);assert.throws(()=>oracle(c=>c));assert.throws(()=>oracle(()=>{throw err('REJECT_ALL');}));
});
test('sandbox contains only approved code/source and retains stronger resource controls; no operational imports',async()=>{
  const args=masterSandbox('/APPROVED-CODE',3).join(' ');assert.match(args,/--unshare-all/);assert.match(args,/--ro-bind-fd 3 \/fixture/);
  assert.match(args,/--remount-ro \//);assert.match(args,/RLIMIT_CPU,\(1,1\)/);assert.match(args,/--max-old-space-size=64/);
  assert.equal(BOUNDS.wall,1000);assert.equal(BOUNDS.rss,512*1024*1024);assert.equal(BOUNDS.storage,64*1024*1024);
  for(const name of ['master-worker','master-contract','master-coordinator','master-supervisor']){
    const text=await readFile(new URL('../services/agent/'+name+'.mjs',import.meta.url),'utf8');
    assert.doesNotMatch(text,/new (?:Store|Engine)|createApp\(|onnx|llama|fetch\(|https?:\/\//);
  }
  assert.equal(researchBoundary().independently_reviewed_rules,0);assert.equal(safetyFailure('MOUNT_NOT_READONLY'),true);
});
test('closed mission refuses execution before source access; saved-data presentation remains separate',async()=>{
  const text=await readFile(new URL('../scripts/n16-master-demo.mjs',import.meta.url),'utf8'),run=text.indexOf('export async function runMaster');
  assert.ok(text.indexOf('MISSION_AUTHORITY_EXPIRED',run)<text.indexOf('source=await pinnedSource()',run));
  assert.match(text,/RECOVERY|recoverMaster/);
});
