// File-only validation of actual execution. No worker or SQLite import/connection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readlink,mkdir,mkdtemp,cp,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sha,stable } from '../services/agent/read-contract.mjs';
import { verifyAuthorization } from '../services/agent/fixed-select-authorizer.mjs';
import { queryPlan,masterCall } from '../services/agent/master-contract.mjs';
import { reconcileResourceJournal } from '../services/agent/resource-journal.mjs';
import { recoverTrace } from '../services/agent/execution-trace.mjs';
const ROOT=new URL('../artifacts/n16-final-20261030/',import.meta.url).pathname,NATIVE=join(ROOT,'native');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const outcome=await json(join(NATIVE,'attempt-01/outcome.json')),cold=await json(join(NATIVE,'cold-recovery.json')),model=await json(join(NATIVE,'demo.json'));
const calls=await Promise.all([1,2,3,4].map(i=>json(join(NATIVE,'attempt-01/call-0'+i+'/outcome.json'))));
test('one coherent actual risk-first graph commits four results/18events with no hidden replay',()=>{
  assert.equal(outcome.status,'COMPLETED');assert.equal(outcome.recovery.status,'COMPLETE');assert.equal(outcome.recovery.committed_events,18);
  assert.equal(outcome.recovery.replayed_calls,0);
  assert.deepEqual(outcome.result.calls.map(r=>r.tool),['get_open_risk_events','get_current_vitals','get_data_quality','get_personal_baseline']);
  assert.ok(outcome.result.calls.every(r=>r.execution_status==='COMPLETED'&&r.native_execution==='NEW_NATIVE_SQL'&&!r.recovered_from));
});
for(const [i,c] of calls.entries())test('actual '+c.event.result.tool+' has one prepare/step and fully reconciled durable samples',async()=>{
  const r=c.event.receipt,m=c.measurement,call=masterCall(c.event.result.tool),plan=queryPlan(call);
  assert.equal(c.status,'PASS');assert.equal(r.prepare_count,1);assert.equal(r.step_count,1);assert.equal(r.explicit_statement_count,1);
  assert.equal(r.readOnly,true);assert.equal(r.query_sha256,sha(plan.sql));assert.deepEqual(r.parameters,plan.parameters);
  assert.equal(verifyAuthorization(plan,r.authorizer_actions,r.authorizer_selects),true);
  assert.ok(r.authorizer_actions.every(a=>a.argument_count===5&&a.source_context===null&&a.decision==='ALLOW'));
  const b=await readFile(join(NATIVE,'attempt-01/call-0'+(i+1)+'/resources-v2.jsonl')),q=c.resources;
  const verified=reconcileResourceJournal(b,q.counters,{samples:m.resource_samples,events:3},q.journal_id,q.head_hash);
  assert.equal(verified.journal_sha256,q.journal_sha256);assert.equal(q.sample_count,m.resource_samples);
  assert.equal(q.record_count,q.sample_count+3);assert.equal(m.exit.code,0);assert.equal(m.owned_remaining,0);assert.equal(m.observer_pending,0);
  assert.ok(m.native_wall_ms<1000&&r.sql_elapsed_ms<250&&m.max_process_RSS<512*1024*1024&&m.max_counted_storage<64*1024*1024);
});
test('actual risk reauthorization belongs to one fixed statement and retains authored origin',()=>{
  const c=calls[0],r=c.event.receipt;
  assert.deepEqual(r.authorizer_actions.filter(a=>a.action===21).map(a=>a.phase),['prepare','step']);
  assert.equal(r.authorizer_selects,2);assert.equal(new Set(r.authorizer_actions.map(a=>a.statement_id)).size,1);
  assert.ok(r.authorizer_actions.filter(a=>a.action===20).every(a=>a.table==='risks'&&a.database==='main'));
  assert.equal(c.event.result.data.records[0].actual_N02_event,false);assert.equal(c.event.result.data.N02_provenance,'UNKNOWN');
  assert.equal(c.event.result.data.records[0].record_origin,'authored_synthetic_fixture');
});
test('real vitals/quality/reference outputs preserve literals and separate certainty from clinical meaning',()=>{
  assert.equal(calls[1].event.result.data.items[0].value,103);
  const q=calls[2].event.result.data.items[0];assert.equal(q.value,null);assert.equal(q.quality.status,'good');assert.equal(q.quality.confidence,.99);assert.equal(q.quality.artifact,false);
  const b=calls[3].event.result.data.items[0].value;assert.equal(b.center,68);assert.equal(b.scale,4.5);assert.equal(b.method,'authored_fixture_reference');
  assert.equal(b.count,null);assert.equal(b.window_days,null);
  assert.equal(model.response.diagnosis,null);assert.equal(model.response.treatment,null);assert.equal(model.response.scientific_answer_support,'ABSTAIN');
});
test('full source hash/instance/sidecars/modes unchanged and actual workers had independent containment',async()=>{
  assert.deepEqual(outcome.source_after,outcome.source_before);
  assert.equal(outcome.source_after.source_sha256,'4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73');
  assert.deepEqual(outcome.source_after.inventory,['source.sqlite']);assert.equal(outcome.source_after.file_mode,'0400');assert.equal(outcome.source_after.directory_mode,'0500');
  const currentNet=await readlink('/proc/self/ns/net');
  for(const c of calls){
    const e=c.events.find(e=>e.event==='SINGLE_CONTAINMENT');assert.ok(Object.values(e.blocked_paths).every(Boolean));
    assert.notEqual(e.network_namespace,currentNet);assert.ok(e.diagnostic.proof.targets.every(m=>m.read_only&&m.per_mount_options.includes('ro')));
    assert.deepEqual(e.diagnostic.probes.map(p=>p.code),['EROFS','EROFS','EACCES']);
  }
});
test('cold recovery and presentation cause no new startup and preserve all committed hashes',async()=>{
  const b=await json(join(NATIVE,'startup-budget.json'));assert.equal(b.maximum,6);assert.equal(b.reservations.length,4);assert.equal(b.halted,null);
  assert.equal(cold.recovery.status,'COMPLETE');assert.equal(cold.recovery.executed_calls.length,4);assert.equal(cold.recovery.replayed_calls,0);
  const index=await json(join(NATIVE,'recording.json'));assert.equal(index.recovery_sha256,sha(stable(cold.recovery)));
  assert.equal(model.workflow_status,'COMPLETED');assert.equal(model.fresh_UI_execution,false);assert.equal(model.recovered_from_committed_trace,true);
  assert.equal(model.timeline.length,18);assert.equal(model.response.risk.actual_N02_event,false);
});
test('corrupted committed copy cannot become a successful recovery',async()=>{
  const parent=join(ROOT,'postflight-mocks');await mkdir(parent,{recursive:true});const copy=await mkdtemp(join(parent,'corrupt-'));
  const id=outcome.recovery.run_id;await cp(join(NATIVE,'attempt-01/traces',id),join(copy,id),{recursive:true});
  const p=join(copy,id,'call-01.json'),b=await readFile(p);b[10]^=1;await writeFile(p,b);
  await assert.rejects(recoverTrace(id,{root:copy}));
});
test('interruption after committed calls but before end remains INCOMPLETE and replays zero',async()=>{
  const parent=join(ROOT,'postflight-mocks');await mkdir(parent,{recursive:true});const copy=await mkdtemp(join(parent,'interrupted-'));
  const id=outcome.recovery.run_id;await cp(join(NATIVE,'attempt-01/traces',id),join(copy,id),{recursive:true});
  const rows=(await readFile(join(copy,id,'trace.jsonl'),'utf8')).trimEnd().split('\n');rows.pop();
  const last=JSON.parse(rows.at(-1));await writeFile(join(copy,id,'trace.jsonl'),rows.join('\n')+'\n');
  await writeFile(join(copy,id,'checkpoint.json'),stable({run_id:id,seq:last.seq,hash:last.hash})+'\n');
  const r=await recoverTrace(id,{root:copy});assert.equal(r.status,'INCOMPLETE');assert.equal(r.executed_calls.filter(c=>c.status==='COMPLETED').length,4);assert.equal(r.replayed_calls,0);
});
test('actual journal mismatch fails validation without another native run',async()=>{
  const c=calls[2],q=c.resources,b=await readFile(join(NATIVE,'attempt-01/call-03/resources-v2.jsonl'));
  assert.throws(()=>reconcileResourceJournal(b,q.counters,{samples:q.sample_count+1,events:3},q.journal_id,q.head_hash));
  assert.throws(()=>reconcileResourceJournal(b.subarray(0,-3),q.counters,{samples:q.sample_count,events:3},q.journal_id,q.head_hash));
});
test('standalone artifact contains actual four-tool facts and safe offline accessibility structure',async()=>{
  const html=await readFile(join(NATIVE,'demo.html'),'utf8');
  assert.match(html,/<h1>ASTRA Health Agent<\/h1>/);assert.match(html,/Workflow: COMPLETED/);assert.match(html,/4\/4 completed calls/);
  assert.match(html,/N16SQL-RISK-SCHEMA-01/);assert.match(html,/N02 event provenance: UNKNOWN/);assert.match(html,/<summary>/);
  assert.match(html,/id="crew" aria-describedby="crew-note"/);assert.match(html,/Opening this file runs no tools/);
  assert.ok(html.indexOf('TOOL 1 · get_open_risk_events')<html.indexOf('TOOL 2 · get_current_vitals'));
  assert.doesNotMatch(html,/<script|fetch\(|src=|onclick=/i);
});
