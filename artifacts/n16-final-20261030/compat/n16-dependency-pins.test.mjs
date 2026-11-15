// N16-06C: deterministic text/code fixtures only; no runner/worker imports.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONTAINMENT_PIN_POLICY,verifyDependencyPins } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/dependency-pins.mjs';
import { sha } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/read-contract.mjs';

const CHANGED='artifacts/changed.json',PRESERVED='artifacts/preserved.json';
const OLD='code/unchanged.mjs',NEW='code/changed.mjs';
const body={ [OLD]:Buffer.from('export const unchanged = 1;\n'),[NEW]:Buffer.from('export const changed = 2;\n') };
const changedRecord=()=>({sha256:sha(body[NEW]),bytes:body[NEW].length});
const err=code=>Object.assign(Error(code),{code});
function fixture(){
  const changed={schema_version:'astra.n16-06a.evidence.v1',files:{[NEW]:changedRecord()}},preserved={files:{[OLD]:sha(body[OLD])}};
  return fromManifests(changed,preserved);
}
function fromManifests(changed,preserved){
  const raw=new Map([[CHANGED,Buffer.from(JSON.stringify(changed))],[PRESERVED,Buffer.from(JSON.stringify(preserved))]]);
  const policy={version:'fixture.v1',inventories:[{path:CHANGED,kind:'changed',sha256:sha(raw.get(CHANGED))},
    {path:PRESERVED,kind:'preserved',sha256:sha(raw.get(PRESERVED))}],
    dependencies:[{path:OLD,inventory:PRESERVED},{path:NEW,inventory:CHANGED}]};
  const reads=[];
  const io={readInventory:async p=>{reads.push(['inventory',p]);if(!raw.has(p))throw err('ENOENT');return raw.get(p);},
    readDependency:async p=>{reads.push(['dependency',p]);if(!Object.hasOwn(body,p))throw err('ENOENT');return body[p];}};
  return {raw,policy,io,reads,run(){return verifyDependencyPins(policy,io);}};
}
function edit(f,path,change){const v=JSON.parse(f.raw.get(path));change(v);f.raw.set(path,Buffer.from(JSON.stringify(v)));
  f.policy.inventories.find(i=>i.path===path).sha256=sha(f.raw.get(path));}
const reject=(f,code)=>assert.rejects(f.run(),{code});
const summary={scope:'N16-06C NON-NATIVE PIN QA ONLY',probe_startups:0,SQLite_connections:0,SQL_statements:0,database_byte_reads:0,
  note:'Actual immutable project manifests and four code dependencies are read; source database and native runtime are never accessed.'};
after(()=>writeFile(new URL('../artifacts/n16-final-20261030/compat/pin-controls.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-dependency-pins.test.mjs"),JSON.stringify(summary,null,2)+'\n'));

test('valid unchanged dependency resolves only from its designated preservation inventory',async()=>{
  const f=fixture(),v=await f.run();assert.equal(v.verified[0].path,OLD);assert.equal(v.verified[0].inventory,PRESERVED);
  assert.equal(v.verified[0].sha256,sha(body[OLD]));assert.equal(v.verified.length,2);
});
test('valid changed-file record verifies both digest and byte length',async()=>{
  const v=await fixture().run();assert.equal(v.verified[1].inventory,CHANGED);assert.equal(v.verified[1].sha256,sha(body[NEW]));
  assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.verified)&&Object.isFrozen(v.verified[1]));
});
test('missing dependency pin fails before any code bytes are requested',async()=>{
  const f=fixture();edit(f,PRESERVED,v=>delete v.files[OLD]);await reject(f,'PIN_MISSING');assert.equal(f.reads.filter(r=>r[0]==='dependency').length,0);
});
test('unavailable dependency is explicit failure, never success or fallback',async()=>{
  const f=fixture();f.io.readDependency=async()=>{throw err('ENOENT');};await reject(f,'PIN_DEPENDENCY_UNAVAILABLE');
});
test('changed current bytes fail full SHA-256 verification',async()=>{
  const f=fixture();f.io.readDependency=async()=>Buffer.from('modified code');await reject(f,'PIN_DEPENDENCY_MISMATCH');
});
test('stale authoritative file pin rejects current code even with authenticated manifest',async()=>{
  const f=fixture();edit(f,PRESERVED,v=>v.files[OLD]=sha(Buffer.from('older revision')));await reject(f,'PIN_DEPENDENCY_MISMATCH');
});
test('stale inventory revision fails against frozen inventory digest',async()=>{
  const f=fixture();f.raw.set(PRESERVED,Buffer.from(JSON.stringify({files:{[OLD]:'0'.repeat(64)}})));await reject(f,'PIN_MANIFEST_INTEGRITY');
});
test('conflicting pins across inventories reject without preferring a matching hash',async()=>{
  const f=fixture();edit(f,CHANGED,v=>v.files[OLD]={sha256:'0'.repeat(64),bytes:body[OLD].length});await reject(f,'PIN_CONFLICT');
});
test('duplicate equal records across inventories remain ambiguous',async()=>{
  const f=fixture();edit(f,CHANGED,v=>v.files[OLD]={sha256:sha(body[OLD]),bytes:body[OLD].length});await reject(f,'PIN_RECORD_AMBIGUOUS');
});
for(const duplicate of ['literal','escaped'])test('duplicate '+duplicate+' JSON keys cannot be collapsed by parsing',async()=>{
  const f=fixture(),key=duplicate==='literal'?OLD:'code/\\u0075nchanged.mjs';
  f.raw.set(PRESERVED,Buffer.from('{"files":{"'+OLD+'":"'+sha(body[OLD])+'","'+key+'":"'+sha(body[OLD])+'"}}'));
  f.policy.inventories[1].sha256=sha(f.raw.get(PRESERVED));await reject(f,'PIN_MANIFEST_INVALID');
});
test('duplicate inventory declarations reject, including identical declarations',async()=>{
  const f=fixture();f.policy.inventories.push({...f.policy.inventories[0]});await reject(f,'PIN_INVENTORY_AMBIGUOUS');assert.equal(f.reads.length,0);
});
test('duplicate dependency assignments reject before any read',async()=>{
  const f=fixture();f.policy.dependencies.push({...f.policy.dependencies[0]});await reject(f,'PIN_DEPENDENCY_AMBIGUOUS');assert.equal(f.reads.length,0);
});
test('tampered manifest bytes reject even when JSON remains valid',async()=>{
  const f=fixture();f.raw.set(CHANGED,Buffer.concat([f.raw.get(CHANGED),Buffer.from(' ')]));await reject(f,'PIN_MANIFEST_INTEGRITY');
});
test('missing manifest never falls back to the other inventory',async()=>{
  const f=fixture();f.raw.delete(PRESERVED);await reject(f,'PIN_MANIFEST_UNAVAILABLE');assert.equal(f.reads.filter(r=>r[0]==='dependency').length,0);
});
test('right hash in wrong inventory is rejected rather than silently substituted',async()=>{
  const f=fixture();edit(f,PRESERVED,v=>delete v.files[OLD]);edit(f,CHANGED,v=>v.files[OLD]={sha256:sha(body[OLD]),bytes:body[OLD].length});
  await reject(f,'PIN_WRONG_INVENTORY');
});
test('changed dependency cannot be resolved from preserved records despite correct hash',async()=>{
  const f=fixture();edit(f,CHANGED,v=>delete v.files[NEW]);edit(f,PRESERVED,v=>v.files[NEW]=sha(body[NEW]));await reject(f,'PIN_WRONG_INVENTORY');
});
test('wrong declared source-to-manifest assignment rejects correct available bytes',async()=>{
  const f=fixture();f.policy.dependencies[0].inventory=CHANGED;await reject(f,'PIN_WRONG_INVENTORY');
});
test('changed record size mismatch fails separately from matching SHA',async()=>{
  const f=fixture();edit(f,CHANGED,v=>v.files[NEW].bytes++);await reject(f,'PIN_DEPENDENCY_SIZE');
});
for(const value of [null,{},'bad','A'.repeat(64)])test('invalid preserved pin '+JSON.stringify(value)+' rejects',async()=>{
  const f=fixture();edit(f,PRESERVED,v=>v.files[OLD]=value);await reject(f,'PIN_RECORD_INVALID');
});
test('invalid changed-record shape rejects rather than guessing preserved format',async()=>{
  const f=fixture();edit(f,CHANGED,v=>v.files[NEW]=sha(body[NEW]));await reject(f,'PIN_RECORD_INVALID');
});
test('wrong manifest schema version rejects even with its digest pinned in fixture policy',async()=>{
  const f=fixture();edit(f,CHANGED,v=>v.schema_version='stale.v0');await reject(f,'PIN_MANIFEST_VERSION');
});
test('malformed or oversized manifests cannot reach dependency reads',async()=>{
  for(const bytes of [Buffer.from('{invalid'),Buffer.alloc(2*1024*1024+1)]){
    const f=fixture();f.raw.set(PRESERVED,bytes);f.policy.inventories[1].sha256=sha(bytes);await reject(f,'PIN_MANIFEST_INVALID');
    assert.equal(f.reads.filter(r=>r[0]==='dependency').length,0);
  }
});
test('no arbitrary manifest or dependency paths admitted by policy validation',async()=>{
  for(const path of ['/home/private','../database.sqlite','code/../private','code//file','code/file?token=secret']){
    const f=fixture();f.policy.dependencies[0].path=path;await reject(f,'PIN_POLICY_INVALID');assert.equal(f.reads.length,0);
  }
});
test('dependency readers must provide actual bytes, never a claimed digest',async()=>{
  const f=fixture();f.io.readDependency=async()=>sha(body[OLD]);await reject(f,'PIN_DEPENDENCY_INVALID');
});

async function controlOracle(candidate){
  const positive=fixture();assert.equal((await candidate(positive.policy,positive.io)).verified.length,2);
  const negative=fixture();negative.io.readDependency=async()=>Buffer.from('wrong');await assert.rejects(()=>candidate(negative.policy,negative.io));
}
test('positive/negative oracle passes real resolver and fails both accept-all and reject-all mutants',async()=>{
  await controlOracle(verifyDependencyPins);
  await assert.rejects(()=>controlOracle(async()=>({verified:[{},{}]})));
  await assert.rejects(()=>controlOracle(async()=>{throw err('REJECT_EVERYTHING');}));
  summary.mutation_controls={real_resolver:'PASS',accept_everything:'DETECTED',reject_everything:'DETECTED'};
});

test('authentic preserved and changed inventories verify all four real dependencies',async()=>{
  const allowed=new Set([...CONTAINMENT_PIN_POLICY.inventories,...CONTAINMENT_PIN_POLICY.dependencies].map(v=>v.path)),reads=[];
  const read=async p=>{assert.ok(allowed.has(p));assert.match(p,/\.(json|mjs)$/);reads.push(p);return readFile(new URL('../'+p,"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-dependency-pins.test.mjs"));};
  const result=await verifyDependencyPins(CONTAINMENT_PIN_POLICY,{readInventory:read,readDependency:read});
  assert.equal(result.verified.length,4);assert.equal(reads.length,6);
  const changed=JSON.parse(await read(CONTAINMENT_PIN_POLICY.inventories[0].path));
  assert.equal(changed.files[CONTAINMENT_PIN_POLICY.inventories[1].path].sha256,CONTAINMENT_PIN_POLICY.inventories[1].sha256);
  assert.equal(changed.files['services/agent/read-contract.mjs'],undefined);assert.equal(changed.files['packages/contracts.mjs'],undefined);
  summary.authentic_pin_verification=result;
});

test('runner delegates the exact pin block without executing preflight, probe or source reads',async()=>{
  const text=await readFile(new URL('../scripts/n16-containment-probe.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-dependency-pins.test.mjs"),'utf8');
  const original=await readFile(new URL('../artifacts/n16-06c-20261029/runner-original.mjs.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-dependency-pins.test.mjs"),'utf8');
  const inserted="import { CONTAINMENT_PIN_POLICY,verifyDependencyPins } from '../services/agent/dependency-pins.mjs';\n";
  const oldLoad="  const old=await json(join(PROJECT,'artifacts/n16-06a-20261029/evidence-manifest.json'),3000000);\n";
  const oldBlock="  for(const f of ['services/agent/containment-diagnostics.mjs','services/agent/qualification-batch.mjs','services/agent/read-contract.mjs','packages/contracts.mjs'])\n    requireState(sha(await readFile(join(PROJECT,f)))===old.files[f]?.sha256,'QUALIFIED_HELPER_CHANGED');";
  const block=text.match(/  await verifyDependencyPins\(CONTAINMENT_PIN_POLICY,\{[\s\S]*?\n  \}\);/)?.[0];assert.ok(block);
  const planConstant="const CODE_PLAN='artifacts/n16-06c-20261029/corrected-code-plan.json';\n";
  const oldCount="['scripts/n16-containment-probe.mjs',...STAGED]",newCount="['scripts/n16-containment-probe.mjs','services/agent/dependency-pins.mjs',CODE_PLAN,...STAGED]";
  const oldAllowed="const allowedCode=[...STAGED,'scripts/n16-containment-probe.mjs','services/agent/qualification-batch.mjs','services/agent/read-context.mjs'].sort();";
  const newAllowed=oldAllowed.replace("'services/agent/qualification-batch.mjs'","'services/agent/dependency-pins.mjs','services/agent/qualification-batch.mjs'");
  assert.equal(text.replace(inserted,'').replace(planConstant,'').replace(block,oldBlock).replace(newCount,oldCount)
    .replace('const plan=await json(join(PROJECT,CODE_PLAN));',"const plan=await json(join(OUT,'probe-plan.json'));")
    .replace(newAllowed,oldAllowed),original.replace(oldLoad,''));
  const f=fixture(),prefix='/fixture-project',inventories=new Set(f.policy.inventories.map(i=>join(prefix,i.path))),code=new Set(f.policy.dependencies.map(i=>join(prefix,i.path)));
  const run=new (Object.getPrototypeOf(async function(){}).constructor)('verifyDependencyPins','CONTAINMENT_PIN_POLICY','metadataBytes','readFile','join','PROJECT',block);
  const invoke=()=>run(verifyDependencyPins,f.policy,async p=>{assert.ok(inventories.has(p));return f.io.readInventory(p.slice(prefix.length+1));},
    async p=>{assert.ok(code.has(p));return f.io.readDependency(p.slice(prefix.length+1));},join,prefix);
  await invoke();assert.equal(f.reads.filter(r=>r[0]==='dependency').length,2);
  f.raw.delete(PRESERVED);await assert.rejects(invoke,{code:'PIN_MANIFEST_UNAVAILABLE'});
  summary.runner_scope='Only pin import/lookup and additive corrected code-plan selection, allowlist and counting changed; all containment, native, resource-limit and source behavior text unchanged.';
});

test('additive code plan pins corrected runner and resolver without rewriting historical B plan',async()=>{
  const base=new URL('../',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-dependency-pins.test.mjs"),path='artifacts/n16-06c-20261029/corrected-code-plan.json';
  const plan=JSON.parse(await readFile(new URL(path,base))),priorBytes=await readFile(new URL('artifacts/n16-06b-20261029/probe-plan.json',base)),prior=JSON.parse(priorBytes);
  assert.equal(plan.prior_plan_sha256,sha(priorBytes));assert.equal(plan.execution_authority,'NONE; QA-only code freeze, fresh probe approval required');
  assert.equal(plan.schema_version,'astra.n16-06c.corrected-code-plan.v1');
  const expected=[...Object.keys(prior.code_pins),'services/agent/dependency-pins.mjs'].sort();
  assert.deepEqual(Object.keys(plan.code_pins).sort(),expected);
  for(const p of expected){
    assert.match(p,/^(scripts|services|packages)\/[a-zA-Z0-9_./-]+\.mjs$/);
    assert.equal(sha(await readFile(new URL(p,base))),plan.code_pins[p]);
    if(p!=='scripts/n16-containment-probe.mjs'&&p!=='services/agent/dependency-pins.mjs')assert.equal(plan.code_pins[p],prior.code_pins[p]);
  }
  assert.equal(prior.code_pins['scripts/n16-containment-probe.mjs'],sha(await readFile(new URL('artifacts/n16-06c-20261029/runner-original.mjs.txt',base))));
  summary.corrected_code_plan={path,sha256:sha(await readFile(new URL(path,base))),code_pins:plan.code_pins,historical_plan_preserved:true,execution_authority:'NONE'};
});
