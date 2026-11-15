from pathlib import Path
import hashlib,json,os
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve()
root=Path(json.loads(Path('/tmp/astra-n15-08b-root.json').read_text())['control'])
assert (root/'preservation-before.json').exists()
old_driver=(p/'artifacts/n15-08a-20261027/control/driver.mjs').read_text()
new_driver=old_driver.replace('N15-08A','N15-08B').replace("assert.equal(qa.focused_tests,116)","assert.equal(qa.focused_tests,119)").replace('controller:8,prompt_contract:78','controller:11,prompt_contract:78')
def controller(text):return text[text.index('async function experimentQuestion('):text.index('async function run(){')]
assert controller(new_driver)==controller(old_driver).replace('N15-08A','N15-08B')
with (root/'driver.mjs').open('x') as f:f.write(new_driver);f.flush();os.fsync(f.fileno())
fixture=p/'tests/n15-prompt-controller.test.mjs';old=fixture.read_text()
normalized=controller(old_driver).replace('N15-08A','N15-08')
function_sha=hashlib.sha256(normalized.encode()).hexdigest()
names=['ANSWER_POLICY','AbortController','Buffer','EXPERIMENT_PROMPT_POLICY','Error','JSON','Math','Promise',
 'abstain','answerResearch','appendFile','assert','clearInterval','executeLocal','join','mkdtemp','network','performance',
 'prepareExperimentalSelection','process','promptPolicyDigest','setInterval','sha256','stableJSON','writeFile']
audit="""
// Exhaustive external-name audit for the pinned trusted controller function.
// VM language intrinsics stay native to the VM; no host-global blanket copy.
const CONTROLLER_EXTERNALS=Object.freeze(%s);
const CONTROLLER_AUDIT_SHA='%s';
const normalizedController=body.replaceAll('N15-08B','N15-08').replaceAll('N15-08A','N15-08');
assert.equal(sha256(Buffer.from(normalizedController)),CONTROLLER_AUDIT_SHA,'Controller changed: dependency audit required');
function auditVM(context){
  const realm=vm.createContext(context);
  const expression='JSON.stringify({'+CONTROLLER_EXTERNALS.map(name=>name+':typeof '+name).join(',')+'})';
  const types=JSON.parse(vm.runInContext(expression,realm));
  const missing=CONTROLLER_EXTERNALS.filter(name=>types[name]==='undefined');
  assert.deepEqual(missing,[],'Missing required VM dependencies: '+missing.join(', '));
  return {realm,types,required:CONTROLLER_EXTERNALS};
}
""" % (json.dumps(names,separators=(',',':')),function_sha)
new=old.replace("import vm from 'node:vm';","import vm from 'node:vm';\nimport {Buffer} from 'node:buffer';\nimport {performance} from 'node:perf_hooks';")
new=new.replace('const body=source.slice(start,end);','const body=source.slice(start,end);\n'+audit)
assert 'clock=0' in new and 'performance:{now:()=>++clock}' in new
new=new.replace('calls=0,cleared=false,clock=0,execution','calls=0,cleared=false,execution')
new=new.replace('sha256,AbortController,network,','sha256,AbortController,network,Buffer,')
new=new.replace('performance:{now:()=>++clock},mkdtemp:','performance,mkdtemp:')
new=new.replace("const run=vm.runInNewContext('('+body+')',context);","const audit=auditVM(context);\n  const run=vm.runInContext('('+body+')',audit.realm);")
new=new.replace('return {run:()=>run(question,data),records,timer,','return {run:()=>run(question,data),records,timer,audit,context,')
assert old[old.index("test('mock positive"):]==new[new.index("test('mock positive"):], 'Original assertions changed'
new+=r'''
test('audited controller globals are complete and use authentic Node Buffer, performance and abort primitives',()=>{
  const h=harness();assert.equal(h.context.Buffer,Buffer);assert.equal(h.context.performance,performance);
  assert.equal(h.context.AbortController,AbortController);assert.equal(h.audit.required.length,25);
  assert.equal(h.audit.types.Buffer,'function');assert.equal(h.audit.types.performance,'object');
  assert.equal(h.context.Buffer.from('fixture').toString(),'fixture');
  assert.deepEqual(Object.keys(h.context).sort(),CONTROLLER_EXTERNALS.filter(n=>!['Error','JSON','Math','Promise'].includes(n)).sort());
});
test('dependency audit rejects missing bindings by name before controller execution',()=>{
  const h=harness(),missing={...h.context};delete missing.Buffer;
  assert.throws(()=>auditVM(missing),/Buffer/);assert.equal(h.calls,0);
});
test('VM exposes only limited mocked process metrics and no host module, file or network entry points',()=>{
  const h=harness();assert.deepEqual(Object.keys(h.context.process).sort(),['memoryUsage','resourceUsage']);
  const capabilities=JSON.parse(vm.runInContext('JSON.stringify([typeof require,typeof module,typeof fetch,typeof WebSocket,typeof Worker,typeof process.env,typeof process.exit,typeof process.kill,typeof process.cwd,typeof process.getBuiltinModule,typeof __dirname,typeof __filename])',h.audit.realm));
  assert.deepEqual(capabilities,Array(12).fill('undefined'));assert.equal(h.calls,0);
});
'''
with fixture.open('w') as f:f.write(new);f.flush();os.fsync(f.fileno())
record={'status':'COMPLETE_SOURCE_AUDIT','controller_function_normalized_sha256':function_sha,'external_names':names,
 'required_name_count':len(names),'new_authentic_bindings':['node:buffer.Buffer','node:perf_hooks.performance'],
 'existing_authentic_binding':['Node AbortController'],'VM_language_intrinsics':['Error','JSON','Math','Promise'],
 'intentional_test_doubles':['memory-only mkdtemp/writeFile/appendFile','two process metric methods','controlled timer/cancellation','mock executeLocal'],
 'no_blanket_host_global_copy':True,'source':'Manual complete external-name review bound to unchanged function hash',
 'original_eight_test_bodies':'byte-identical','controller_behavior':'unchanged except task metadata labels',
 'fixture_sha256':hashlib.sha256(new.encode()).hexdigest(),'driver_sha256':hashlib.sha256(new_driver.encode()).hexdigest(),
 'native_execution':0}
with (root/'vm-binding-audit.json').open('x') as f:json.dump(record,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
print(json.dumps({'status':record['status'],'required_names':len(names),'fixture_sha256':record['fixture_sha256'],'controller_behavior':'unchanged'}))
