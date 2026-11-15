import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { frontendSession } from './dom-harness.mjs';
import { append,ledger } from '../services/n10/ledger.mjs';
import { data,request,actor,crew } from './fixtures/n10.mjs';
import { browserDeviceIdentity } from '../apps/mission-control-web/n10.mjs';
const make=()=>createApp({autoTick:false,caseBuilder:buildCase});
test('N10 device identity survives one profile, distinguishes another and stays non-secret/ephemeral on storage failure',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(browserDeviceIdentity(storage,()=> 'fixture-a'),'browser-local-fixture-a');
  assert.equal(browserDeviceIdentity(storage,()=> 'fixture-b'),'browser-local-fixture-a');
  assert.equal(browserDeviceIdentity({getItem:()=>null,setItem(){}},()=> 'fixture-b'),'browser-local-fixture-b');
  assert.equal(browserDeviceIdentity({getItem(){throw Error('denied')}},()=> 'fixture-c'),'ephemeral-fixture-c');
  assert.deepEqual([...values.keys()],['astra-n10-device-id']);
});
test('N10 delayed save cannot reuse an earlier Saved indication or commit twice',async()=>{
  const app=make(),h=await frontendSession(app);let release;
  try{
    h.module.navigate('n10');await h.flush();
    assert.match(h.el('#n10-status').textContent,/Loaded/);
    h.el('#n10-status').textContent='Saved earlier request';
    h.intercept((path,options,normal)=>{
      if(path.endsWith('/records'))return new Promise(resolve=>{release=async()=>resolve(await normal(path,options));});
      return normal(path,options);
    });
    const root=h.el('.n10-workspace'),form=h.el('#n10-record');
    // HTMLFormElement named properties can shadow id with the actual input.
    Object.defineProperty(form,'id',{value:form.querySelector('[name=id]'),configurable:true});
    assert.equal(typeof form.id,'object');assert.equal(form.getAttribute('id'),'n10-record');
    const pending=root.emit('submit',{target:form,submitter:form.querySelector('button.primary')});await h.flush();
    assert.match(h.el('#n10-status').textContent,/Saving/);assert.equal(ledger(app.store,crew).length,0);
    await root.emit('submit',{target:form,submitter:form.querySelector('button.primary')});assert.equal(ledger(app.store,crew).length,0);
    await release();await pending;await h.flush();
    assert.equal(ledger(app.store,crew).length,1,h.el('#n10-status').textContent);assert.match(h.el('#n10-status').textContent,/Saved append-only/);
  }finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('N10 stale replay response cannot replace the newest cutoff projection',async()=>{
  const app=make(),h=await frontendSession(app);let release,held=false;
  try{
    append(app.store,actor,crew,request('stage',structuredClone(data.stage)),app.engine.state.now);
    h.intercept((path,options,normal)=>{
      if(path.startsWith('/v1/n10/crew/')&&!held){held=true;return new Promise(resolve=>{release=async()=>resolve(await normal(path,options));});}
      return normal(path,options);
    });
    h.module.navigate('n10');await h.flush();assert.ok(release);
    h.el('.n10-controls [name=day]').value='2026-11-13';
    await h.el('.n10-workspace').emit('click',{target:h.el('#n10-load')});await h.flush();
    assert.match(h.el('#n10-results').textContent,/no supplied stage/);
    await release();await h.flush();assert.match(h.el('#n10-results').textContent,/no supplied stage/);
    assert.doesNotMatch(h.el('#n10-results').textContent,/Sleep stage 2/);
  }finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('N10 navigation cancels the actual pending task timer before it can report a ready target',async()=>{
  const app=make(),h=await frontendSession(app);
  try{
    const who=h.module.inspect().identity;
    append(app.store,who,crew,request('consent',structuredClone(data.consent),{id:'consent:'+who.id}),app.engine.state.now);
    h.module.navigate('n10');await h.flush();
    const before=new Set(h.timers.keys()),button=h.el('#n10-target');
    assert.equal(button.disabled,false);
    await h.el('.n10-workspace').emit('click',{target:button});assert.match(button.textContent,/Wait for target/);
    const owned=[...h.timers.keys()].filter(k=>!before.has(k));assert.equal(owned.length,1);
    h.module.navigate('overview');await h.flush();assert.ok(owned.every(k=>!h.timers.has(k)));
    await h.advance(4000);assert.doesNotMatch(button.textContent,/NOW/);
  }finally{h.module.navigate('overview');await h.close();await app.close();}
});
