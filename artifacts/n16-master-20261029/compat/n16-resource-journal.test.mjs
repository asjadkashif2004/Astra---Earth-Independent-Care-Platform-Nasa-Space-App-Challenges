// N16-06H: deterministic mock and disposable JSONL journals only; no worker/SQL imports.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ResourceJournal,createResourceJournal,reconcileResourceJournal,nextResourceCounter } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/resource-journal.mjs';
import { sha,stable } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/read-contract.mjs';

const ROOT=fileURLToPath(new URL('../artifacts/n16-master-20261029/compat/resource/',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-resource-journal.test.mjs"));
const NOW='2026-10-29T00:00:00.000Z',ID='H-MOCK-JOURNAL';
const error=code=>Object.assign(Error(code),{code});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await turn();}assert.fail('mock transition not reached');}
const payload=i=>({phase:'resource',owned:[],parent_hwm:1000+i,counted_bytes:4000+i});
const event=i=>({phase:'worker_event',event:{event:'MOCK_EVENT',index:i}});
function memory(options={}){
  const s={bytes:Buffer.alloc(0),writes:0,syncs:0,reads:0,closes:0,active:0,max_active:0,timeline:[],closed:false};
  const io={
    write:async(bytes,position)=>{s.writes++;s.active++;s.max_active=Math.max(s.max_active,s.active);s.timeline.push('write');
      try{await options.beforeWrite?.(s);if(options.writeError)throw error('MOCK_WRITE_FAILED');
        const n=Math.min(bytes.length,options.chunk??bytes.length);if(options.zeroWrite)return 0;
        if(!options.dropWrite){const result=Buffer.alloc(Math.max(s.bytes.length,position+n));s.bytes.copy(result);bytes.copy(result,position,0,n);s.bytes=result;}return n;
      }finally{s.active--;}},
    sync:async()=>{s.syncs++;s.timeline.push('sync');await options.beforeSync?.(s);if(options.syncError)throw error('MOCK_SYNC_FAILED');return options.syncAck??true;},
    read:async(position,length)=>{s.reads++;s.timeline.push('read');return options.badReadback?Buffer.alloc(length):Buffer.from(s.bytes.subarray(position,position+length));},
    readAll:async()=>{await options.beforeReadAll?.(s);return Buffer.from(s.bytes);},
    close:async()=>{s.closes++;s.timeline.push('close');await options.beforeClose?.(s);if(options.closeError)throw error('MOCK_CLOSE_FAILED');s.closed=true;return options.closeAck??true;}
  };
  const faults=[];const journal=new ResourceJournal(io,{id:ID,clock:()=>NOW,onFailure:r=>{faults.push(r);if(options.handlerError)throw error('PRIVATE_HANDLER_ERROR');}});
  return {s,io,journal,faults};
}
const verify=(bytes,r,expected={samples:r.sample_count,events:r.event_count})=>reconcileResourceJournal(bytes,r.counters,expected,r.journal_id,r.head_hash);
const reports=[];
after(()=>writeFile(join(ROOT,'mock-results.json'),JSON.stringify({scope:'QA_ONLY_MOCK_OR_DISPOSABLE_JSONL',native_worker_starts:0,SQLite_connections:0,SQL_operations:0,sealed_database_reads:0,mount_changes:0,reports},null,2)+'\n'));

for(const n of [0,1,2,7,11])test('ordered '+n+' samples and separate events reconcile from actual records',async()=>{
  const m=memory();const operations=[];for(let i=0;i<n;i++){operations.push(m.journal.sample(async()=>payload(i)));if(i%2===0)operations.push(m.journal.event(event(i)));}
  const receipts=await Promise.all(operations),events=Math.ceil(n/2),r=await m.journal.finalize({samples:n,events});
  assert.equal(r.sample_count,n);assert.equal(r.event_count,events);assert.equal(r.record_count,receipts.length);
  const checked=verify(m.s.bytes,r);assert.equal(m.s.max_active,n?1:0);
  assert.equal(checked.sample_count,n);assert.equal(checked.event_count,events);assert.equal(r.journal_sha256,sha(m.s.bytes));
  assert.ok(r.closed&&r.reconciled);assert.equal(m.journal.state().pending,0);assert.ok(m.journal.state().close_acknowledged);
  assert.deepEqual(receipts.map(x=>x.seq),Array.from({length:n+events},(_,i)=>i+1));
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.counters.sample));
  reports.push({case:'valid_count_'+n,samples:r.sample_count,events:r.event_count,rows:r.record_count,head:r.head_hash});
});
test('delayed collector and writes serialize all foreground/monitor/event work',async()=>{
  const gate=deferred(),m=memory({beforeWrite:async s=>{if(s.writes===1)await gate.promise;}});let collectors=0;
  const a=m.journal.sample(async()=>{collectors++;return payload(1);}),b=m.journal.sample(async()=>{collectors++;return payload(2);}),e=m.journal.event(event(1));
  await until(()=>m.s.writes===1);assert.equal(collectors,1);assert.equal(m.journal.state().sample.attempted,2);
  assert.equal(m.journal.state().sample.accepted,1);assert.equal(m.journal.state().sample.durable,0);assert.equal(m.s.max_active,1);
  gate.resolve();await Promise.all([a,b,e]);const r=await m.journal.finalize({samples:2,events:1});assert.equal(r.record_count,3);assert.equal(collectors,2);
});
test('final flush seals admission, drains delayed writes and waits for close acknowledgement',async()=>{
  const sync=deferred(),close=deferred(),m=memory({beforeSync:async s=>{if(s.syncs===1)await sync.promise;},beforeClose:async()=>close.promise});
  const sample=m.journal.sample(async()=>payload(1));await until(()=>m.s.syncs===1);
  assert.equal(m.journal.state().sample.appended,1);assert.equal(m.journal.state().sample.durable,0);
  let done=false;const final=m.journal.finalize({samples:1,events:0}).then(r=>{done=true;return r;});
  await assert.rejects(m.journal.sample(()=>payload(2)),{code:'RESOURCE_JOURNAL_CLOSED'});assert.equal(done,false);
  sync.resolve();await sample;await until(()=>m.s.closes===1);assert.equal(done,false);close.resolve();
  const r=await final;assert.equal(r.sample_count,1);assert.equal(done,true);assert.equal(m.s.closes,1);
});
test('short writes are completed before appended and durable acknowledgement',async()=>{
  const m=memory({chunk:13});await m.journal.sample(()=>payload(1));assert.ok(m.s.writes>1);
  const r=await m.journal.finalize({samples:1,events:0});assert.equal(verify(m.s.bytes,r).record_count,1);
});
for(const [name,opts,code] of [
  ['write failure',{writeError:true},'MOCK_WRITE_FAILED'],
  ['zero-byte write',{zeroWrite:true},'RESOURCE_SHORT_WRITE'],
  ['silent dropped write',{dropWrite:true},'RESOURCE_APPEND_ACK_INVALID'],
  ['flush failure',{syncError:true},'MOCK_SYNC_FAILED'],
  ['missing sync acknowledgement',{syncAck:false},'RESOURCE_SYNC_ACK_INVALID'],
  ['wrong byte acknowledgement',{badReadback:true},'RESOURCE_APPEND_ACK_INVALID']
])test(name+' fails closed with no durable sample and visible first error',async()=>{
  const m=memory(opts);await assert.rejects(m.journal.sample(()=>payload(1)),{code});
  assert.equal(m.journal.state().sample.durable,0);assert.equal(m.faults[0].code,code);
  await assert.rejects(m.journal.finalize({samples:1,events:0}),{code});assert.equal(m.s.closes,1);
  await assert.rejects(m.journal.event(event(1)));assert.equal(m.journal.state().event.attempted,0);
});
for(const [name,value] of [['undefined field',{phase:'resource',missing:undefined}],['nonfinite',{phase:'resource',rss:NaN}],
  ['function',{phase:'resource',fn:()=>{}}],['cycle',null]])test('serialization '+name+' remains visible, never accepted or appended',async()=>{
  const m=memory(),v=value??{phase:'resource'};if(name==='cycle')v.self=v;
  await assert.rejects(m.journal.sample(()=>v),{code:'RESOURCE_SERIALIZATION_FAILED'});
  assert.deepEqual(m.journal.state().sample,{attempted:1,accepted:0,appended:0,durable:0});assert.equal(m.s.writes,0);
  await assert.rejects(m.journal.finalize({samples:1,events:0}));
});
test('filtering/aggregation and labeling samples as events are not permitted',async()=>{
  const m=memory();await assert.rejects(m.journal.event(payload(1)),{code:'RESOURCE_SERIALIZATION_FAILED'});
  await assert.rejects(m.journal.finalize({samples:0,events:0}));
  const n=memory();await n.journal.sample(()=>payload(1));await assert.rejects(n.journal.finalize({samples:0,events:0}),{code:'RESOURCE_COUNT_MISMATCH'});
});
test('counter and malformed expected totals cannot authorize a PASS',async()=>{
  assert.equal(nextResourceCounter(0),1);assert.equal(nextResourceCounter(12),13);
  for(const bad of [-1,0.5,'7',null,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>nextResourceCounter(bad),{code:'RESOURCE_COUNTER_INVALID'});
  for(const expected of [{samples:'1',events:0},{samples:-1,events:0},{samples:1,events:NaN},{samples:1,events:0,filtered:1},null]){
    const m=memory();await m.journal.sample(()=>payload(1));await assert.rejects(m.journal.finalize(expected),{code:'RESOURCE_COUNTER_INVALID'});
  }
});
test('counter fixture corruption rejects rather than silently coercing totals',async()=>{
  const m=memory();await m.journal.sample(()=>payload(1));const r=await m.journal.finalize({samples:1,events:0});
  for(const bad of ['1',-1,1.2,Number.MAX_SAFE_INTEGER+1]){
    const c=structuredClone(r.counters);c.sample.durable=bad;assert.throws(()=>reconcileResourceJournal(m.s.bytes,c,{samples:1,events:0},ID,r.head_hash),{code:'RESOURCE_COUNTER_INVALID'});
  }
});
test('exact synthetic seven-controller/five-journal case is rejected; events cannot cover missing samples',async()=>{
  const m=memory();for(let i=0;i<5;i++)await m.journal.sample(()=>payload(i));for(let i=0;i<3;i++)await m.journal.event(event(i));
  const r=await m.journal.finalize({samples:5,events:3}),c=structuredClone(r.counters);
  for(const k of Object.keys(c.sample))c.sample[k]=7;
  assert.equal(r.record_count,8);
  assert.throws(()=>reconcileResourceJournal(m.s.bytes,c,{samples:7,events:3},ID,r.head_hash),{code:'RESOURCE_COUNT_MISMATCH'});
  reports.push({case:'synthetic_7_controller_5_journal',samples_reported:7,sample_rows:5,event_rows:3,rejected:true});
});
test('missing, duplicate, out-of-order, truncated, corrupted and foreign records are detected',async()=>{
  const m=memory();for(let i=0;i<3;i++)await m.journal.sample(()=>payload(i));const r=await m.journal.finalize({samples:3,events:0});
  const lines=m.s.bytes.toString().trimEnd().split('\n'),altered=JSON.parse(lines[1]);altered.payload.parent_hwm++;
  const cases=[
    [lines[0],lines[2]].join('\n')+'\n',
    [lines[0],lines[1],lines[1],lines[2]].join('\n')+'\n',
    [lines[1],lines[0],lines[2]].join('\n')+'\n',
    m.s.bytes.toString().slice(0,-2),
    [lines[0],JSON.stringify(altered),lines[2]].join('\n')+'\n',
    m.s.bytes.toString().replace(ID,'FOREIGN-JOURNAL')
  ];
  for(const text of cases)assert.throws(()=>verify(Buffer.from(text),r));
  const corrupt=JSON.parse(lines[0]);corrupt.sample_id=99;const {hash,...body}=corrupt;corrupt.hash=sha(stable(body));
  assert.throws(()=>verify(Buffer.from(stable(corrupt)+'\n'),r));
});
test('fully rehashed tampering is rejected against the retained acknowledged head',async()=>{
  const m=memory();await m.journal.sample(()=>payload(1));const r=await m.journal.finalize({samples:1,events:0});
  const changed=JSON.parse(m.s.bytes);changed.payload.counted_bytes++;const {hash,...body}=changed;changed.hash=sha(stable(body));
  assert.throws(()=>verify(Buffer.from(stable(changed)+'\n'),r),{code:'RESOURCE_FINAL_HEAD_MISMATCH'});
});
test('final readback detects loss after per-record acknowledgement',async()=>{
  const m=memory({beforeReadAll:async s=>{s.bytes=s.bytes.subarray(0,0);}});await m.journal.sample(()=>payload(1));
  await assert.rejects(m.journal.finalize({samples:1,events:0}),{code:'RESOURCE_COUNT_MISMATCH'});
});
test('post-close corruption and failed close acknowledgement cannot return success',async()=>{
  const a=memory({beforeClose:async s=>{s.bytes=Buffer.alloc(0);}});await a.journal.sample(()=>payload(1));
  await assert.rejects(a.journal.finalize({samples:1,events:0}),{code:'RESOURCE_CLOSE_READBACK_CHANGED'});
  const b=memory({closeAck:false});await b.journal.sample(()=>payload(1));
  await assert.rejects(b.journal.finalize({samples:1,events:0}),{code:'RESOURCE_CLOSE_ACK_INVALID'});assert.equal(b.s.closes,1);
});
test('final flush and close failures remain failures after all rows were acknowledged',async()=>{
  const a=memory({beforeSync:async s=>{if(s.syncs===2)throw error('FINAL_FLUSH_FAILED');}});await a.journal.sample(()=>payload(1));
  await assert.rejects(a.journal.finalize({samples:1,events:0}),{code:'FINAL_FLUSH_FAILED'});assert.equal(a.s.closes,1);
  const b=memory({closeError:true});await b.journal.sample(()=>payload(1));
  await assert.rejects(b.journal.finalize({samples:1,events:0}),{code:'MOCK_CLOSE_FAILED'});assert.equal(b.journal.state().close_acknowledged,false);
});
test('cancellation during pending writes cancels queued work and exposes incomplete durable counts',async()=>{
  const gate=deferred(),m=memory({beforeWrite:async()=>gate.promise});let secondCollected=false;
  const a=m.journal.sample(()=>payload(1)),b=m.journal.sample(()=>{secondCollected=true;return payload(2);});
  const settled=Promise.allSettled([a,b]);await until(()=>m.s.writes===1);m.journal.cancel();
  const final=m.journal.finalize({samples:2,events:0});const rejected=assert.rejects(final,{code:'RESOURCE_CANCELLED'});
  assert.equal(m.journal.state().pending,2);gate.resolve();assert.ok((await settled).every(x=>x.status==='rejected'));await rejected;
  assert.equal(secondCollected,false);assert.equal(m.journal.state().sample.attempted,2);assert.equal(m.journal.state().sample.durable,0);
  assert.equal(m.journal.state().pending,0);assert.equal(m.s.closes,1);
});
test('termination during finalization cannot produce a late PASS',async()=>{
  const gate=deferred(),m=memory({beforeClose:async()=>gate.promise});await m.journal.sample(()=>payload(1));
  const done=m.journal.finalize({samples:1,events:0});const rejected=assert.rejects(done,{code:'RESOURCE_TERMINATED'});
  await until(()=>m.s.closes===1);m.journal.cancel('RESOURCE_TERMINATED');gate.resolve();await rejected;
  assert.equal(m.journal.state().finalization_pending,false);assert.equal(m.journal.state().error,'RESOURCE_TERMINATED');
});
test('cancellation after close acknowledgement still blocks pending final readback',async()=>{
  const gate=deferred(),m=memory({beforeReadAll:async s=>{if(s.closed)await gate.promise;}});await m.journal.sample(()=>payload(1));
  const final=m.journal.finalize({samples:1,events:0}),rejected=assert.rejects(final,{code:'RESOURCE_TERMINATED'});
  await until(()=>m.journal.state().close_acknowledged);m.journal.cancel('RESOURCE_TERMINATED');gate.resolve();await rejected;
  assert.equal(m.journal.state().finalization_pending,false);assert.equal(m.journal.state().error,'RESOURCE_TERMINATED');
});
test('hung finalization times out visibly; pending cleanup is never reported complete',async()=>{
  const gate=deferred(),m=memory({beforeClose:async()=>gate.promise});await m.journal.sample(()=>payload(1));
  const done=m.journal.finalize({samples:1,events:0});await assert.rejects(done,{code:'RESOURCE_FINALIZE_TIMEOUT'});
  assert.equal(m.journal.state().finalization_pending,true);assert.equal(m.journal.state().close_acknowledged,false);
  gate.resolve();await until(()=>m.journal.state().finalization_pending===false);
  assert.equal(m.journal.state().error,'RESOURCE_FINALIZE_TIMEOUT');
});
test('failure notification exceptions remain visible and cannot release success',async()=>{
  const m=memory({writeError:true,handlerError:true});await assert.rejects(m.journal.sample(()=>payload(1)));
  await assert.rejects(m.journal.finalize({samples:1,events:0}));
  assert.equal(m.journal.state().notification_error,'RESOURCE_FAILURE_HANDLER_FAILED');
});
test('expected counts are snapshotted and finalization is idempotent',async()=>{
  const gate=deferred(),m=memory({beforeWrite:async()=>gate.promise});const work=m.journal.sample(()=>payload(1));
  const expected={samples:1,events:0},p=m.journal.finalize(expected);expected.samples=0;assert.equal(m.journal.finalize({samples:0,events:0}),p);
  gate.resolve();await work;assert.equal((await p).sample_count,1);assert.equal(m.s.closes,1);
});
test('unmodified legacy counter advances before persistence and append calls can overlap',async()=>{
  const text=await readFile(join(ROOT,'n16-quality-qualification.mjs.original.txt'),'utf8');
  const journalText=text.slice(text.indexOf('async function journal(value)'),text.indexOf('\nasync function count'));
  const gate=deferred();let opened=0,active=0,maxActive=0,written=0;
  const open=async()=>{opened++;return {writeFile:async()=>{active++;maxActive=Math.max(maxActive,active);await gate.promise;written++;},
    sync:async()=>{},close:async()=>{active--;}};};
  const oldJournal=new Function('open','join','OUT','stable','return ('+journalText+');')(open,join,'MOCK-NO-FILES',stable);
  const a=oldJournal(payload(1)),b=oldJournal(payload(2));await until(()=>opened===2&&active===2);assert.equal(maxActive,2);gate.resolve();await Promise.all([a,b]);assert.equal(written,2);
  const sampleText=text.slice(text.indexOf('const sample=async()=>'),text.indexOf('\n  let binding'));
  const ack=deferred();const observed=new Function('journal','tree','counted','check','CAPS','child','seen',
    'let peak=0,maxDisk=0,samples=0;'+sampleText+'return {sample,count:()=>samples};')(
    ()=>ack.promise,async()=>[{hwm:100}],async()=>100,(ok)=>assert.ok(ok),{rss:1000,storage:1000},null,new Map());
  const pending=observed.sample();await until(()=>observed.count()===1);ack.resolve();await pending;
  reports.push({case:'legacy_execution_with_injected_IO',overlapping_handles:maxActive,count_before_ack:1,actual_files_or_workers:0,
    historical_record_loss_cause:'NOT ESTABLISHED'});
});
test('real disposable JSONL adapter persists and closes a valid mock journal without SQL',async()=>{
  const qa=join(ROOT,'qa');await mkdir(qa,{recursive:true});const dir=await mkdtemp(join(qa,'disk-journal-'));
  const j=await createResourceJournal(dir,'resources-mock.jsonl',{id:ID,clock:()=>NOW});
  await Promise.all([j.sample(()=>payload(1)),j.event(event(1)),j.sample(()=>payload(2))]);
  const r=await j.finalize({samples:2,events:1}),raw=await readFile(join(dir,'resources-mock.jsonl'));
  assert.equal(verify(raw,r).record_count,3);assert.equal(j.state().close_acknowledged,true);
  await assert.rejects(createResourceJournal(dir,'resources-mock.jsonl'));
  reports.push({case:'disposable_mock_disk_journal',path:dir,rows:3,head:r.head_hash,SQL:0});
});
test('count-validation oracle rejects accept-all and reject-all implementations',async()=>{
  const m=memory();for(let i=0;i<5;i++)await m.journal.sample(()=>payload(i));const r=await m.journal.finalize({samples:5,events:0});
  const oracle=fn=>{assert.equal(fn(m.s.bytes,r.counters,{samples:5,events:0},ID,r.head_hash).sample_count,5);
    assert.throws(()=>fn(m.s.bytes,r.counters,{samples:7,events:0},ID,r.head_hash));};
  oracle(reconcileResourceJournal);assert.throws(()=>oracle(()=>({sample_count:5})));assert.throws(()=>oracle(()=>{throw error('REJECT_ALL');}));
});
test('controller gates result commit/PASS on final durable reconciliation; protected execution surfaces unchanged',async()=>{
  const old=await readFile(join(ROOT,'n16-quality-qualification.mjs.original.txt'),'utf8');
  const now=await readFile(new URL('../scripts/n16-quality-qualification.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-resource-journal.test.mjs"),'utf8');
  const field=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
  for(const [start,end] of [['const CAPS=','\nconst CALL='],['const CALL=','\nasync function metadata'],['function sandbox(fd)','\nexport async function qualify']])
    assert.equal(field(now,start,end),field(old,start,end));
  const gate=now.indexOf('resourceReconciliation=await resourceLog.finalize');
  assert.ok(gate>now.indexOf("'POST_READ_SOURCE_CHANGED'"));assert.ok(gate<now.indexOf("await trace.result('call-01'"));
  assert.ok(gate<now.indexOf("outcome:'PASS'"));assert.match(now,/resource_samples:samples,resource_accounting:/);
  assert.doesNotMatch(now,/async function journal\(value\)/);assert.match(now,/resourceLog\.sample\(async/);
  assert.match(now,/createResourceJournal\(OUT,'resources-v2\.jsonl'/);assert.match(now,/resource_reconciliation_error:resourceFailure/);
  const plan=JSON.parse(await readFile(new URL('../artifacts/n16-06g-20261029/code-plan.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-resource-journal.test.mjs")));
  for(const p of ['services/agent/designated-worker.mjs','services/agent/single-select-contract.mjs','services/agent/single-select-source.mjs','services/agent/single-select-runtime.mjs',
    'services/agent/single-quality-contract.mjs','services/agent/designated-source.mjs','services/agent/containment-diagnostics.mjs','services/agent/qualification-batch.mjs'])
    assert.equal(sha(await readFile(new URL('../'+p,"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-resource-journal.test.mjs"))),plan.code_pins[p]);
});
