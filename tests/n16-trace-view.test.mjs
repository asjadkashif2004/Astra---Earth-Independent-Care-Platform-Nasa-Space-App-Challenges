import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { APPROVED_TRACE as pin, readFixtureTrace, validateRecordedTrace, fixtureTraceResponse } from '../services/agent/fixture-trace-view.mjs';
import { TRACE_ROOT } from '../services/agent/execution-trace.mjs';
import { sha, stable } from '../services/agent/read-contract.mjs';
import { renderFixtureTrace, mountFixtureTrace } from '../apps/mission-control-web/fixture-trace.mjs';
import { makeDocument } from './dom-harness.mjs';

const principal = {id:'n16-view-qa',role:'demo_admin'};
const original = join(TRACE_ROOT,pin.run_id);
async function bundle() { return Object.fromEntries(await Promise.all(Object.keys(pin.files).map(async name=>[name,await readFile(join(original,name))]))); }
async function isolated(fn) {
  const root = await mkdtemp(join(tmpdir(),'astra-n16-view-'));
  try { await cp(original,join(root,pin.run_id),{recursive:true}); await fn(root,join(root,pin.run_id)); }
  finally { await rm(root,{recursive:true,force:true}); }
}
async function available() { const v = await readFixtureTrace(principal); assert.equal(v.status,'AVAILABLE'); return v; }
function panel() { const document = makeDocument(); document.body.innerHTML = '<section id="fixture-trace-demo"></section>'; return document.querySelector('section'); }
async function changed(mutator) {
  const f = await bundle(), rows = f['trace.jsonl'].toString().trimEnd().split('\n').map(JSON.parse);
  mutator(rows,f); let head = 'GENESIS';
  for (const r of rows) { r.previous_hash = head; delete r.hash; r.hash = sha(stable(r)); head = r.hash; }
  f['trace.jsonl'] = Buffer.from(rows.map(stable).join('\n')+'\n');
  f['checkpoint.json'] = Buffer.from(stable({run_id:pin.run_id,seq:rows.length,hash:head})+'\n');
  return f;
}

test('saved four actual results, exact order, UNKNOWN risk and recovery without replay',async()=>{
  const v = await available();
  assert.deepEqual(v.calls.map(c=>[c.tool,c.execution_status,c.data_status]),[
    ['get_current_vitals','COMPLETED','KNOWN'],['get_data_quality','COMPLETED','KNOWN'],
    ['get_personal_baseline','COMPLETED','KNOWN'],['get_open_risk_events','COMPLETED','UNKNOWN']]);
  assert.equal(v.calls[0].result.data.items[0].value,103);
  assert.equal(v.calls[2].result.data.items[0].value.center,68);
  assert.deepEqual(v.calls[3].result.data.records,[]);
  assert.equal(v.recovery.replayed_calls,0); assert.equal(v.timeline.length,18);
  assert.deepEqual(v.timeline.map(r=>r.seq),Array.from({length:18},(_,i)=>i+1));
  assert.equal(v.recorded_scope.principal.role,'demo_admin');
  assert.equal(v.calls[0].result.provenance.earth_received_at,null);
  for (const c of v.calls) assert.equal(c.result.read_receipt.actual_file_reads,1);
});
test('artifact pins match all retained originals and repeat reads do not append any events',async()=>{
  const before = await bundle(); for (const [name,raw] of Object.entries(before)) {
    assert.equal(raw.length,pin.files[name].bytes); assert.equal(sha(raw),pin.files[name].sha256);
  }
  await available(); await available();
  const after = await bundle(); for (const name of Object.keys(before)) assert.deepEqual(after[name],before[name]);
});
for (const identity of [null,{role:'astronaut',crew_id:'CREW-01'},{role:'system_admin'},{role:'invented'}]) {
  test(`unauthorized scope ${identity?.role ?? 'anonymous'} rejects BEFORE nonexistent-root IO`,async()=>{
    await assert.rejects(readFixtureTrace(identity,{root:'/does-not-exist/n16'}),e=>[401,403].includes(e.status));
  });
}
for (const identity of [{role:'viewer'},{role:'astronaut',crew_id:'CREW-03'},{role:'researcher'}]) {
  test(`existing ${identity.role} read permission is retained`,async()=>assert.equal((await readFixtureTrace(identity)).status,'AVAILABLE'));
}
test('unknown directory returns honest UNAVAILABLE with no partial result or arbitrary path in output',async()=>{
  const v = await readFixtureTrace(principal,{root:'/does-not-exist/n16'});
  assert.equal(v.status,'UNAVAILABLE'); assert.deepEqual(v.calls,[]); assert.doesNotMatch(JSON.stringify(v),/does-not-exist/);
});
for (const name of Object.keys(pin.files)) {
  test(`tampered ${name} fails closed`,async()=>isolated(async(root,dir)=>{
    const p=join(dir,name), b=await readFile(p); b[0]^=1; await writeFile(p,b);
    const v=await readFixtureTrace(principal,{root}); assert.equal(v.status,'UNAVAILABLE'); assert.deepEqual(v.calls,[]);
  }));
}
test('incomplete checkpoint/trace, absent result, added file and substituted symlink fail closed',async()=>{
  for (const kind of ['incomplete','missing','extra','symlink']) await isolated(async(root,dir)=>{
    if (kind==='incomplete') await writeFile(join(dir,'checkpoint.json'),'{}');
    if (kind==='missing') await rm(join(dir,'call-01.json'));
    if (kind==='extra') await writeFile(join(dir,'unapproved.json'),'{}');
    if (kind==='symlink') { await rm(join(dir,'call-01.json')); await symlink(join(original,'call-01.json'),join(dir,'call-01.json')); }
    assert.equal((await readFixtureTrace(principal,{root})).status,'UNAVAILABLE',kind);
  });
});
test('symlinked run directory is never accepted',async()=>{
  const root=await mkdtemp(join(tmpdir(),'astra-n16-view-'));
  try { await symlink(original,join(root,pin.run_id)); assert.equal((await readFixtureTrace(principal,{root})).status,'UNAVAILABLE'); }
  finally { await rm(root,{recursive:true,force:true}); }
});
for (const [name,mutate] of [
  ['schema',(r)=>r[0].schema_version='invented'],
  ['event order',(r)=>{[r[2],r[3]]=[r[3],r[2]];}],
  ['scope',(r)=>r[2].payload.args.crew_id='CREW-01'],
  ['trusted role',(r)=>r[0].payload.context.principal.role='invented'],
  ['source hash',(r)=>r[0].payload.context.fixture_sha256='f'.repeat(64)],
  ['unexpected event field',(r)=>r[0].secret='untrusted'],
  ['uncommitted extra event',(r)=>r.push({...r[17],seq:19})],
  ['mismatched completion data',(r)=>r[4].payload.data_status='UNKNOWN'],
  ['backwards timestamp',(r)=>r[4].at='2020-01-01T00:00:00.000Z']
]) test(`schema/relationships reject ${name} even with rehashed event chain`,async()=>{
  const f=await changed(mutate); assert.throws(()=>validateRecordedTrace(f));
});
test('stale source and mismatched result provenance cannot become a verified archive',async()=>{
  for (const kind of ['stale','crew','role','alert']) {
    const f=await changed((rows,files)=>{
      const name=kind==='alert'?'call-04.json':'call-01.json', i=kind==='alert'?16:4;
      const r=JSON.parse(files[name]);
      if (kind==='stale') r.data.items[0].provenance.freshness='stale';
      if (kind==='crew') r.crew_id='CREW-01';
      if (kind==='role') r.provenance.clock='host';
      if (kind==='alert') r.data.records.push({id:'fabricated-alert'});
      files[name]=Buffer.from(stable(r)+'\n'); rows[i].payload.result={file:name,bytes:files[name].length,sha256:sha(files[name])};
    });
    assert.throws(()=>validateRecordedTrace(f),kind);
  }
});
test('fixed route permits only GET without arbitrary run/crew/path/query input',async()=>{
  const r=await fixtureTraceResponse('GET','',principal); assert.equal(r.status,200); assert.equal(r.body.status,'AVAILABLE');
  for (const [method,search] of [['POST',''],['GET','?run=other'],['GET','?crew_id=CREW-01'],['GET','?path=../../telemetry.db']]) {
    const r=await fixtureTraceResponse(method,search,principal); assert.equal(r.status,400); assert.deepEqual(r.body.calls,[]);
  }
});
test('actual server route delegates to the isolated adapter, with no Store/Engine operations',async()=>{
  const source=await readFile(new URL('../services/api/server.mjs',import.meta.url),'utf8');
  const start=source.indexOf("      if (path === '/v1/agent/fixture-trace') {");
  assert.ok(start>0);
  const route=source.slice(start,source.indexOf("      if (req.method === 'GET' && path === '/v1/agent/cases')",start));
  const captured=[];
  const handle=vm.runInNewContext(`(async()=>{${route}})`,{req:{method:'GET'},path:'/v1/agent/fixture-trace',url:{search:''},identity:principal,
    fixtureTraceResponse,json:(res,status,body)=>captured.push({status,body}),res:{}});
  await handle(); assert.equal(captured.length,1); assert.equal(captured[0].body.status,'AVAILABLE');
  assert.doesNotMatch(route,/engine\.|store\.|dispatch|enqueue|audit\(/);
});
test('actual Health Agent rendering mounts one fixed GET and preserves operational/template labels',async()=>{
  const source=await readFile(new URL('../apps/mission-control-web/app.mjs',import.meta.url),'utf8');
  const start=source.indexOf('function renderAgent(main)'), end=source.indexOf('\nfunction updateAgent',start), code=source.slice(start,end);
  const document=makeDocument(); document.body.innerHTML='<main id="main"></main>';
  const v=await available(), requests=[]; let operationalRenders=0;
  const render=vm.runInNewContext(`(${code})`,{document,mountFixtureTrace,sessionVersion:1,page:'agent',
    heading:()=>'<h1>Crew health agent</h1>',toggleView:()=>'',actionButton:()=>'',icon:()=>'',footer:()=>'',
    updateAgent:()=>operationalRenders++,api:async(...args)=>{requests.push(args);return v;}});
  render(document.querySelector('main')); await new Promise(setImmediate);
  assert.equal(operationalRenders,1); assert.deepEqual(requests,[['/agent/fixture-trace']]);
  const main=document.querySelector('main');
  assert.match(main.textContent,/Deterministic report template · no executed tool graph · no language model/);
  assert.match(main.textContent,/WORKFLOW REFERENCE · NOT AN EXECUTED TOOL TRACE/);
  const fixture=document.querySelector('#fixture-trace-demo'); assert.match(fixture.textContent,/VERIFIED ARCHIVE/);
  assert.equal(fixture.querySelectorAll('article').length,4);
  assert.equal(document.querySelector('#cases-content').textContent,'');
  assert.doesNotMatch(code,/ReadDispatcher|dispatch\(|ack\(|enqueue\(|risk_events/);
});
test('view gives accessible text statuses, canonical provenance, recorded timestamps and native keyboard details',async()=>{
  const el=panel(), v=await available(); el.innerHTML=renderFixtureTrace(v);
  assert.match(el.textContent,/SYNTHETIC \/ FIXTURE DEMO · ARCHIVED/);
  assert.match(el.textContent,/Execution: COMPLETED/); assert.match(el.textContent,/Data: UNKNOWN/);
  assert.match(el.textContent,/heart_rate: 103 \/min/); assert.match(el.textContent,/not current telemetry/);
  assert.match(el.textContent,/not delivered Earth evidence/); assert.match(el.textContent,/No LLM selected or executed/);
  assert.equal(el.querySelector('[role="status"]').getAttribute('aria-atomic'),'true');
  assert.equal(el.querySelectorAll('details').length,5);
  for (const details of el.querySelectorAll('details')) {
    const summary=details.querySelector('summary'); assert.ok(summary.textContent.trim()); summary.focus();
    assert.equal(el.ownerDocument.activeElement,summary); assert.equal(summary.getAttribute('tabindex'),null);
    const pre=details.querySelector('pre'); assert.equal(pre.getAttribute('tabindex'),'0'); assert.ok(pre.getAttribute('aria-label'));
  }
  assert.equal(el.querySelectorAll('[data-ack], [data-action], button, form').length,0);
  assert.deepEqual(v.calls[3].result.data.records,[]); assert.match(el.textContent,/No alert or all-clear is inferred/);
  assert.match(el.textContent,/ed64e67d97d406b701d51d7bf3f057ab688d8594eccdcf0c8d3962fe62d8b79c/);
});
for (const state of ['FAILED','CANCELLED','TIMEOUT','DENIED']) test(`renderer keeps ${state} execution distinct from UNKNOWN data (presentation-only fixture)`,async()=>{
  const v=await available(); v.calls[0].execution_status=state; v.calls[0].data_status='UNKNOWN';
  v.calls[0].result.execution_status=state; v.calls[0].result.data_status='UNKNOWN';
  const html=renderFixtureTrace(v); assert.match(html,new RegExp(`Execution: ${state}`));
  assert.match(html,/No completed result is available/); assert.doesNotMatch(html,/heart_rate: 103/);
});
test('missing/unavailable/malformed response renders no successful execution or values',async()=>{
  for (const v of [null,{}, {status:'UNAVAILABLE'}, {status:'AVAILABLE',calls:[]}]) {
    const html=renderFixtureTrace(v); assert.match(html,/UNAVAILABLE/); assert.doesNotMatch(html,/Execution: COMPLETED|heart_rate: 103|VERIFIED ARCHIVE/);
  }
});
test('escaped evidence cannot insert scripts, HTML or action controls',async()=>{
  const v=await available(); v.calls[3].result.data.reason='<script>alert(1)</script><button data-ack="x">';
  const el=panel(); el.innerHTML=renderFixtureTrace(v);
  assert.equal(el.querySelectorAll('script,button,[data-ack]').length,0);
  assert.match(el.innerHTML,/&lt;script&gt;/);
});
test('load/error/current-session/navigation controls never dispatch or publish stale responses',async()=>{
  const v=await available(), el=panel(); let requests=0, resolve;
  const pending=mountFixtureTrace(el,{request:()=>{requests++;return new Promise(r=>resolve=r);},isCurrent:()=>false});
  assert.match(el.textContent,/Checking saved fixture evidence/); resolve(v); await pending;
  assert.equal(requests,1); assert.doesNotMatch(el.textContent,/VERIFIED ARCHIVE/);
  await mountFixtureTrace(el,{request:async()=>{throw Error('secret/path');}});
  assert.match(el.textContent,/UNAVAILABLE/); assert.doesNotMatch(el.textContent,/secret\/path/);
  const detached=panel(); const run=mountFixtureTrace(detached,{request:()=>new Promise(r=>resolve=r)});
  detached.remove(); resolve(v); await run; assert.doesNotMatch(detached.textContent,/VERIFIED ARCHIVE/);
});
test('presentation code has no operational imports, worker dispatch or writes; archive parser/recovery are read-only',async()=>{
  const adapter=await readFile(new URL('../services/agent/fixture-trace-view.mjs',import.meta.url),'utf8');
  const ui=await readFile(new URL('../apps/mission-control-web/fixture-trace.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(adapter,/from ['"].*(?:store|engine|read-tools|read-tool-worker|agent\.mjs|enrichment|onnx)/i);
  assert.doesNotMatch(adapter,/new (?:Worker|Store|Engine|ExecutionTrace|ReadDispatcher)|\.dispatch\(|writeFile\(|appendFile\(|createReadContext\(/);
  assert.doesNotMatch(ui,/fetch\(|\/v1\/|POST|\.dispatch\(|setInterval\(/);
});
