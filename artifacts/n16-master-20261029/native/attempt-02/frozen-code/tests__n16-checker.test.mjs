import test from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';
test('import-looking source fixture strings are not module dependencies',()=>{
  assert.ok(vm.SourceTextModule,'Run this focused checker test with --experimental-vm-modules');
  const m=new vm.SourceTextModule("const fixture=\"import { x } from './services/agent/designated-source.mjs';\";\nexport { fixture };");
  assert.deepEqual(m.dependencySpecifiers,[]);
});
test('actual multiline imports, exports and side-effect imports remain checked',()=>{
  const m=new vm.SourceTextModule("import {\n x\n} from './real.mjs';\nexport { y } from './other.mjs';\nimport './side-effect.mjs';");
  assert.deepEqual(m.dependencySpecifiers,['./real.mjs','./other.mjs','./side-effect.mjs']);
});
test('module request parsing never evaluates source or opens its dependencies',()=>{
  const m=new vm.SourceTextModule("import { DatabaseSync } from 'node:sqlite'; throw Error('MUST NOT EXECUTE');");
  assert.equal(m.status,'unlinked');assert.deepEqual(m.dependencySpecifiers,['node:sqlite']);
  assert.throws(()=>new vm.SourceTextModule("import { invalid"),SyntaxError);
});
