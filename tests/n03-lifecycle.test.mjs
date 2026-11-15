import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { frontendSession } from './dom-harness.mjs';

async function session(fn) {
  const app=createApp({autoTick:false});let ui;
  try { ui=await frontendSession(app);await fn(ui,app); }
  finally { await ui?.close();await app.close(); }
}
const response=value=>({ok:true,status:200,json:async()=>value});
async function lifecycle(ui,name,event={}) { for (const fn of window.listeners.get(name)??[]) await fn(event);await ui.flush(); }

test('N03 degraded-service notice remains a named landmark on non-overview pages',()=>session(async(ui,app)=>{
  await ui.click('[data-page="waveforms"]');app.engine.monitor.failure();await ui.module.pollStatus();
  assert.equal(ui.el('#service-notice').getAttribute('role'),'region');assert.equal(ui.el('#service-notice').getAttribute('aria-label'),'Service availability');
  assert.match(ui.el('#service-notice').textContent,/Unknown/);
}));

test('N03 session end aborts global health reads and ignores a transport which delivers after abort',()=>session(async ui=>{
  let release,signal;
  ui.intercept((path,options,next)=>path==='/v1/health'?new Promise(resolve=>{release=resolve;signal=options.signal;}):next(path,options));
  const pending=ui.module.pollStatus();await ui.flush();assert.equal(signal.aborted,false);
  await ui.click('[data-action="logout"]');assert.equal(signal.aborted,true);
  release(response({ready:true,monitoring:{status:'running'}}));await pending;
  assert.ok(ui.el('#login-form'));assert.equal(ui.module.inspect().identity,null);assert.equal(ui.module.inspect().health,null);
}));

test('N03 suspended page cancels requests and stops polling; resume refreshes actual state',()=>session(async(ui,app)=>{
  let release,signal,calls=0;
  ui.intercept((path,options,next)=>{calls++;return path==='/v1/health'?new Promise(resolve=>{release=resolve;signal=options.signal;}):next(path,options);});
  const pending=ui.module.pollStatus();await ui.flush();await lifecycle(ui,'pagehide');
  assert.equal(signal.aborted,true);assert.equal(ui.sources.at(-1).readyState,2);assert.equal(ui.module.inspect().scenes.length,0);
  release(response({ready:true,monitoring:{status:'running'}}));await pending;
  const at=calls;await ui.advance(10000);assert.equal(calls,at);
  ui.intercept(null);app.engine.tick(30);await lifecycle(ui,'pageshow',{persisted:true});
  assert.equal(ui.module.inspect().connected,true);assert.ok(ui.module.inspect().scenes.length);assert.equal(ui.sources.at(-1).readyState,1);
  assert.equal(ui.module.inspect().state.mission.spacecraft_time,app.engine.snapshot().mission.spacecraft_time);
}));

test('N03 cached landing resumes its disposed scene without starting authenticated requests',()=>session(async ui=>{
  await ui.click('[data-action="logout"]');assert.ok(ui.el('#login-form'));
  await lifecycle(ui,'pagehide');assert.equal(ui.module.inspect().scenes.length,0);
  let calls=0;ui.intercept(()=>{calls++;throw new Error('Unexpected authenticated request');});
  await lifecycle(ui,'pageshow',{persisted:true});
  assert.ok(ui.el('#login-form'));assert.equal(ui.module.inspect().scenes.length,1);assert.equal(calls,0);
}));

test('N03 request timeout rejects late projections instead of applying their optimistic payload',()=>session(async ui=>{
  await ui.click('[data-page="crew"]');let release,signal;
  ui.intercept((path,options,next)=>path.endsWith('/predictions')&&!release?new Promise(resolve=>{release=resolve;signal=options.signal;}):next(path,options));
  const pending=ui.module.loadForecast();await ui.flush();await ui.advance(8001);assert.equal(signal.aborted,true);
  release(response({heart_rate:{available:true,estimate:999,horizon_minutes:5,lower:998,upper:1000,history_count:50,model_version:'late'}}));await pending;
  assert.match(ui.el('#forecast-content').textContent,/cancelled/);assert.doesNotMatch(ui.el('#forecast-content').textContent,/999|late/);
}));
