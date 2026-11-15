import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeExecTimeout,NATIVE_EXEC_BUDGET_MS } from '../scripts/n04-native-timeout.mjs';

test('N04 native timeout: the reported fractional failure rounds down without extending the budget',()=>{
  const elapsed=760.1579,timeout=nativeExecTimeout(elapsed);
  assert.equal(timeout,23239);assert.ok(Number.isInteger(timeout));
  assert.ok(timeout<=NATIVE_EXEC_BUDGET_MS-elapsed);
});

test('N04 native timeout: valid boundary values remain positive integers in the supported range',()=>{
  for(const [elapsed,expected] of [[0,24000],[0.25,23999],[1,23999],[23998.5,1],[23999,1]]){
    const timeout=nativeExecTimeout(elapsed);assert.equal(timeout,expected);
    assert.ok(Number.isInteger(timeout)&&timeout>=1&&timeout<=24000);
    assert.ok(timeout<=2147483647&&timeout<=NATIVE_EXEC_BUDGET_MS-elapsed);
  }
});

test('N04 native timeout: submillisecond and expired budgets fail instead of rounding upward to one millisecond',()=>{
  for(const elapsed of [23999.001,23999.999,24000,24000.1,1e9,Number.MAX_VALUE]){
    assert.throws(()=>nativeExecTimeout(elapsed),/budget exhausted/);
  }
});

test('N04 native timeout: invalid elapsed times cannot reach execFile',()=>{
  for(const elapsed of [NaN,Infinity,-Infinity,-1,-0.01,undefined,null,'1']){
    assert.throws(()=>nativeExecTimeout(elapsed),/Invalid elapsed/);
  }
});
