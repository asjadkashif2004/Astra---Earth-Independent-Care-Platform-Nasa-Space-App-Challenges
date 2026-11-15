import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recordedResponse,renderRecordedDemo } from '../services/agent/recorded-health-demo.mjs';
import { masterCall,masterCaller,projectMaster,ORDER } from '../services/agent/master-contract.mjs';
import { expectedRows,designatedProjection,SOURCE_SHA } from '../services/agent/designated-contract.mjs';
const saved=JSON.parse(await readFile(new URL('../artifacts/n16-master-20261029/native/cold-recovery.json',import.meta.url))).model;
const model=()=>structuredClone({...saved,workflow_status:'FAILED'});
function completeMock(){
  const m=model(),c=masterCall('get_open_risk_events');
  const raw=projectMaster(c,expectedRows(c));
  const r={execution_status:'COMPLETED',...designatedProjection(raw,c,masterCaller(),'5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c','0'.repeat(64))};
  m.results[m.results.findIndex(x=>x.tool===c.tool)]=r;m.workflow_status='COMPLETED';m.qa_only_mock_risk=true;
  m.timeline=ORDER.flatMap((tool,i)=>[{sequence:i*2+1,at:'2026-10-30T00:00:00.000Z',status:'CALL_STARTED',tool,call_id:'call-0'+(i+1)},
    {sequence:i*2+2,at:'2026-10-30T00:00:00.001Z',status:'CALL_COMPLETED',tool,call_id:'call-0'+(i+1)}]);
  return m;
}
test('actual saved three-tool results reproduce exact historical facts without medical interpretation',()=>{
  const r=recordedResponse(model());assert.equal(r.observation.value,103);assert.equal(r.quality.confidence,0.99);assert.equal(r.baseline.center,68);
  assert.equal(r.risk,null);assert.equal(r.diagnosis,null);assert.equal(r.treatment,null);assert.equal(r.generated_by_llm,false);
  assert.match(r.statements[0],/archived synthetic observation.*103 \/min at 2026-11-14T11:00:00.000Z/);
  assert.equal(r.scientific_answer_support,'ABSTAIN');assert.equal(r.research_rule_activated,false);
});
test('mock canonical authored risk remains distinct from N02 alerts and all-clear claims',()=>{
  const r=recordedResponse(completeMock());assert.equal(r.risk.records[0].id,'N16SQL-RISK-SCHEMA-01');
  assert.equal(r.risk.records[0].actual_N02_event,false);assert.equal(r.risk.N02_provenance,'UNKNOWN');
  assert.equal(r.risk.records[0].record_origin,'authored_synthetic_fixture');
  assert.match(r.statements[3],/Independently verified N02 event provenance remains UNKNOWN/);
});
for(const [name,mutate] of [
  ['value',r=>r.data.items[0].value=999],['unit',r=>r.data.items[0].unit='Hz'],
  ['source',r=>r.provenance.source_sha256='0'.repeat(64)],['source time',r=>r.provenance.source_as_of='2020-01-01'],
  ['crew',r=>r.crew_id='CREW-01'],['stale/UNKNOWN',r=>r.data_status='UNKNOWN'],
  ['provenance',r=>delete r.provenance.original_projection_sha256]
])test(name+' cannot become a verified recorded observation',()=>{
  const m=model(),r=m.results.find(x=>x.tool==='get_current_vitals');mutate(r);
  const response=recordedResponse(m);assert.equal(response.observation,null);assert.match(response.statements[0],/UNKNOWN/);
  assert.doesNotMatch(response.statements.join(' '),/999/);
});
test('unknown quality, authored baseline and failed risks remain independently unavailable',()=>{
  const m=completeMock();
  for(const r of m.results)r.data_status='UNKNOWN';
  const response=recordedResponse(m);assert.equal(response.quality,null);assert.equal(response.baseline,null);assert.equal(response.risk,null);
  assert.ok(response.statements.every(s=>/UNKNOWN/.test(s)));
});
test('fake N02 provenance and changed baseline cannot override canonical source records',()=>{
  const m=completeMock();m.results.find(r=>r.tool==='get_open_risk_events').data.records[0].actual_N02_event=true;
  m.results.find(r=>r.tool==='get_personal_baseline').data.items[0].value.method='clinically_validated';
  const r=recordedResponse(m);assert.equal(r.risk,null);assert.equal(r.baseline,null);
});
test('duplicate, fabricated and incomplete result collections fail closed',()=>{
  for(const modify of [m=>m.results.pop(),m=>m.results[0].tool='diagnose',m=>m.results[1].tool=m.results[0].tool,m=>m.fresh_UI_execution=true]){
    const m=model();modify(m);assert.throws(()=>recordedResponse(m));
  }
});
test('standalone page uses real status/time/provenance and never calls a tool or model',()=>{
  const html=renderRecordedDemo(completeMock());
  assert.match(html,/<h1>ASTRA Health Agent<\/h1>/);assert.match(html,/Workflow: COMPLETED/);assert.match(html,/4\/4 completed calls/);
  assert.match(html,/SYNTHETIC \/ DESIGNATED SOURCE/);assert.match(html,/Recorded evidence is not live astronaut telemetry/);
  assert.match(html,new RegExp(SOURCE_SHA));assert.match(html,/actual_N02_event/);assert.match(html,/Measurement value withheld/);
  assert.doesNotMatch(html,/<script|fetch\(|src=|onclick=|<iframe|https?:\/\//i);
});
test('partial page does not present four successes or known risk data',()=>{
  const html=renderRecordedDemo(model());assert.match(html,/3\/4 completed calls/);assert.match(html,/Workflow: FAILED/);
  assert.match(html,/Execution: FAILED/);assert.match(html,/Data: UNKNOWN/);
});
test('injection remains escaped data; forged generated response is not rendered as support',()=>{
  const m=completeMock();m.run_id='<script>alert(1)</script>';m.response={statements:['AUTONOMOUS_TREATMENT_TOKEN']};
  const html=renderRecordedDemo(m);assert.doesNotMatch(html,/<script|AUTONOMOUS_TREATMENT_TOKEN/);assert.match(html,/&lt;script&gt;/);
});
test('accessible offline page has named controls, native details, visible focus and responsive reduced-motion support',()=>{
  const html=renderRecordedDemo(completeMock());
  for(const expression of [/<html lang="en">/,/<main id="main" tabindex="-1">/,/href="#main"/,/<label for="crew">/,/id="crew" aria-describedby="crew-note"/,
    /:focus-visible/,/@media\(max-width:740px\)/,/@media\(prefers-reduced-motion:reduce\)/,/<summary>/])assert.match(html,expression);
  assert.equal((html.match(/<option selected>/g)??[]).length,1);assert.equal((html.match(/<option disabled>/g)??[]).length,5);
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
  for(const [,id] of html.matchAll(/aria-labelledby="([^"]+)"/g))assert.ok(ids.includes(id));
});
test('body and muted text colors meet normal-text contrast against the panel color',()=>{
  const l=hex=>{const c=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  for(const text of ['f0ece6','b2afb9','c7b7ff'])assert.ok((l(text)+.05)/(l('111116')+.05)>=4.5);
});
test('timeline controls the displayed execution order; missing timing is not invented',()=>{
  const m=completeMock();m.timeline=[...m.timeline].reverse(); // first occurrence of each tool now reverse order
  const html=renderRecordedDemo(m);
  assert.ok(html.indexOf('TOOL 1 · get_open_risk_events')<html.indexOf('TOOL 2 · get_personal_baseline'));
  assert.doesNotMatch(renderRecordedDemo({...model(),timeline:[]}),/<time>2026-10-30T/);
});
