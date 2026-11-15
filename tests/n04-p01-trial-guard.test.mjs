/* Non-browser QA regression: virtual time, in-memory page events and fake child only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { assertNativeFocusResult,startTrialGuard,captureTrialFailureContext,GUARD_LIMITS } from '../scripts/n04-p01-trial-guard.mjs';

class Clock {
  time=100000;sequence=0;jobs=new Map();
  now=()=>this.time;
  setTimeout=(fn,ms)=>this.add(fn,ms,0);
  clearTimeout=id=>this.jobs.delete(id);
  setInterval=(fn,ms)=>this.add(fn,ms,ms);
  clearInterval=this.clearTimeout;
  add(fn,ms,repeat){const id=++this.sequence;this.jobs.set(id,{fn,at:this.time+ms,repeat});return id;}
  async advance(ms){
    const end=this.time+ms;
    for(;;){
      const next=[...this.jobs].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
      const [id,job]=next;this.time=job.at;if(job.repeat)job.at+=job.repeat;else this.jobs.delete(id);
      job.fn();for(let i=0;i<20;i++)await Promise.resolve();
    }
    this.time=end;for(let i=0;i<20;i++)await Promise.resolve();
  }
}
function eventTarget(){
  const events=new EventEmitter();return {events,addEventListener:(event,fn)=>events.on(event,fn),removeEventListener:(event,fn)=>events.off(event,fn),emit:event=>events.emit(event,{type:event})};
}
function fixture({firstSample={},silent=false,failureContext}={}){
  const clock=new Clock(),window=eventTarget(),document=Object.assign(eventTarget(),{title:'ASTRA Command',visibilityState:'visible',hasFocus:()=>focused});
  let focused=true,nativeHeartbeat=true,pageHeartbeat=true,child,nativeInterval,spawns=0;
  const events=new EventEmitter(),records=[];
  const sandbox={window,document,Date:{now:clock.now},performance:{now:clock.now},setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,setInterval:clock.setInterval,clearInterval:clock.clearInterval};
  const c={
    evaluate:async expression=>runInNewContext(expression,sandbox),
    send:async(method,{name}={})=>{
      if(method==='Runtime.addBinding')window[name]=payload=>{if(pageHeartbeat)events.emit('Runtime.bindingCalled',{name,payload});};
      if(method==='Runtime.removeBinding')delete window[name];
    },
    on:(event,fn)=>{events.on(event,fn);return()=>events.off(event,fn);}
  };
  function sample(overrides={}){
    const value={type:'sample',source_at_ms:clock.now(),pid:123,selected_handle:'0xABC',selected_owner_pid:123,selected_class:'Chrome_WidgetWin_1',title_matches:true,foreground_handle:'0xABC',foreground_pid:123,owned:true,check_ms:0.1,...overrides};
    child.stdout.emit('data',Buffer.from(JSON.stringify(value)+'\n'));
  }
  const spawnProcess=()=>{
    spawns++;child=new EventEmitter();child.pid=456;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.killed=false;
    child.kill=()=>{if(child.killed)return;child.killed=true;clock.clearInterval(nativeInterval);child.emit('exit',null,'SIGTERM');};
    queueMicrotask(()=>{if(!silent&&!child.killed)sample(firstSample);});
    nativeInterval=clock.setInterval(()=>{if(nativeHeartbeat&&!silent&&!child.killed)sample();},GUARD_LIMITS.poll_ms);return child;
  };
  const setup=()=>startTrialGuard({c,pid:123,clock,now:clock.now,spawnProcess,failureContext,record:(type,data)=>records.push({type,...data}),token:'test-owned-page'});
  function clean(){
    assert.equal(clock.jobs.size,0,'All observer timers disposed');assert.ok(child.killed);
    assert.equal(events.eventNames().length,0,'All host listeners disposed');
    assert.equal(window.events.eventNames().length,0,'All page listeners disposed');assert.equal(document.events.eventNames().length,0);
    assert.equal(window.__astraP01Guard,undefined);assert.equal(window.__astraP01GuardEvent,undefined);assert.equal(spawns,1,'No helper retries');
  }
  return {clock,window,document,events,records,setup,clean,sample,get child(){return child;},setFocused:value=>{focused=value;},silenceNative:()=>{nativeHeartbeat=false;},silencePage:()=>{pageHeartbeat=false;}};
}

test('Startup asserts native returned ownership boolean, PID, request result and helper exit',()=>{
  const good={status:0,stdout:JSON.stringify({pid:123,foreground_request_returned:true,foreground_is_test_window:true})};
  assert.equal(assertNativeFocusResult(good,123).foreground_is_test_window,true);
  for(const patch of [{foreground_is_test_window:false},{foreground_is_test_window:1},{pid:999},{foreground_request_returned:false}]){
    assert.throws(()=>assertNativeFocusResult({...good,stdout:JSON.stringify({...JSON.parse(good.stdout),...patch})},123));
  }
  assert.throws(()=>assertNativeFocusResult({...good,status:1},123));assert.throws(()=>assertNativeFocusResult({...good,stdout:'invalid'},123));
});

test('Healthy guard covers 60 virtual seconds through a fresh final native sample and cleans up',async()=>{
  const f=fixture(),guard=await f.setup();await f.clock.advance(60000);
  const end=f.clock.now(),finished=guard.finish();await f.clock.advance(250);const summary=await finished;
  assert.equal(summary.failure,null);assert.ok(summary.last_native.source_at_ms>=end);
  assert.ok(summary.native_samples>=241&&summary.native_samples<=243);assert.ok(summary.page_samples>=241);
  assert.ok(summary.native_check_ms.max>0);assert.equal(f.records.filter(r=>r.type==='guard_completed').length,1);
  await guard.dispose();f.clean();
});

test('Transient page blur fails immediately and cannot be erased by focus recovery',async()=>{
  const f=fixture(),guard=await f.setup();await f.clock.advance(5000);f.window.emit('blur');f.window.emit('focus');
  assert.throws(guard.assertHealthy,/Page blur event/);assert.equal(f.records.filter(r=>r.type==='guard_failure').length,1);
  assert.equal(f.records.at(-1).source_at_ms,105000);assert.equal(f.records.at(-1).host_at_ms,105000);
  await guard.dispose();f.clean();
});

test('Periodic page check catches focus loss even without a blur event',async()=>{
  const f=fixture(),guard=await f.setup();f.setFocused(false);await f.clock.advance(250);
  assert.throws(guard.assertHealthy,/Page focus lost/);await guard.dispose();f.clean();
});

test('Visibility lifecycle guard retains a hidden transition after visibility returns',async()=>{
  const f=fixture(),guard=await f.setup();f.document.visibilityState='hidden';f.document.emit('visibilitychange');f.document.visibilityState='visible';
  assert.throws(guard.assertHealthy,/Page visibility lost/);await guard.dispose();f.clean();
});

test('Mid-trial native ownership loss fails without refocusing or retrying',async()=>{
  const f=fixture(),guard=await f.setup();await f.clock.advance(30000);f.sample({owned:false,foreground_handle:'0xOTHER',foreground_pid:444});
  assert.throws(guard.assertHealthy,/Native foreground ownership lost/);assert.equal(f.records.at(-1).detail.foreground_pid,444);
  await guard.dispose();f.clean();
});

test('Native helper process errors abort the guard',async()=>{
  const f=fixture(),guard=await f.setup();f.child.emit('error',Error('injected process error'));
  assert.throws(guard.assertHealthy,/Native helper process error/);await guard.dispose();f.clean();
});

test('Unexpected native helper exit aborts the guard',async()=>{
  const f=fixture(),guard=await f.setup();f.child.emit('exit',0,null);
  assert.throws(guard.assertHealthy,/Native helper exited/);await guard.dispose();f.clean();
});

test('Native helper pipe failures abort instead of becoming uncaught stream errors',async()=>{
  const f=fixture(),guard=await f.setup();f.child.stdout.emit('error',Error('injected read failure'));
  assert.throws(guard.assertHealthy,/Native helper stdout error/);await guard.dispose();f.clean();
});

test('Malformed native output fails closed',async()=>{
  const f=fixture(),guard=await f.setup();f.child.stdout.emit('data',Buffer.from('{invalid}\n'));
  assert.throws(guard.assertHealthy,/Native guard protocol failure/);await guard.dispose();f.clean();
});

test('Initial native window PID mismatch rejects setup and disposes observers',async()=>{
  const f=fixture({firstSample:{selected_owner_pid:999}});await assert.rejects(f.setup(),/Native guard protocol failure/);f.clean();
});

test('Missing native heartbeat fails while page samples continue',async()=>{
  const f=fixture(),guard=await f.setup();f.silenceNative();await f.clock.advance(1250);
  assert.throws(guard.assertHealthy,/Native helper heartbeat missing/);await guard.dispose();f.clean();
});

test('Missing page heartbeat fails while native samples continue',async()=>{
  const f=fixture(),guard=await f.setup();f.silencePage();await f.clock.advance(1250);
  assert.throws(guard.assertHealthy,/Page guard heartbeat missing/);await guard.dispose();f.clean();
});

test('Native startup has a bounded timeout and no retry',async()=>{
  const f=fixture({silent:true}),rejected=assert.rejects(f.setup(),/Guard setup timeout/);
  await f.clock.advance(0);await f.clock.advance(8000);await rejected;f.clean();
});

test('Checkpoint detects a monitoring gap before work even when host timers were blocked',async()=>{
  const f=fixture(),guard=await f.setup();f.clock.time+=1250;let work=0;
  await assert.rejects(guard.checkpoint(()=>{work++;}),/heartbeat missing/);assert.equal(work,0);
  await guard.dispose();f.clean();
});

test('Unwritable failure journal still aborts without uncaught event-handler errors',async()=>{
  const f=fixture();
  const originalPush=f.records.push;f.records.push=function(record){if(record.type==='guard_failure')throw Error('injected journal failure');return originalPush.call(this,record);};
  const guard=await f.setup();assert.doesNotThrow(()=>f.child.emit('error',Error('injected helper failure')));
  assert.throws(guard.assertHealthy,/Native helper process error/);await guard.dispose();f.clean();
});

test('Failure interrupts an in-flight checkpoint before subsequent workload code runs',async()=>{
  const f=fixture(),guard=await f.setup();let ticks=0,release;
  const action=(async()=>{await guard.checkpoint(()=>new Promise(resolve=>{release=resolve;}));guard.assertHealthy();ticks++;})();
  const rejected=assert.rejects(action,/Page blur event/);await Promise.resolve();f.window.emit('blur');await rejected;release();
  await Promise.resolve();assert.equal(ticks,0);await guard.dispose();f.clean();
});

test('Page navigation or lifecycle end rejects the active guard',async()=>{
  for(const trigger of [f=>f.window.emit('pagehide'),f=>f.events.emit('Page.frameNavigated',{frame:{url:'about:blank'}}),f=>f.events.emit('Inspector.detached',{reason:'target_closed'})]){
    const f=fixture(),guard=await f.setup();trigger(f);assert.throws(guard.assertHealthy,/Trial guard:/);await guard.dispose();f.clean();
  }
});

test('A missing final native sample cannot produce a successful coverage summary',async()=>{
  const f=fixture(),guard=await f.setup();f.silenceNative();
  const rejected=assert.rejects(guard.finish(),/Native final coverage check missing/);await f.clock.advance(1000);await rejected;
  assert.equal(f.records.filter(r=>r.type==='guard_completed').length,0);await guard.dispose();f.clean();
});

test('Observer lifetime stays bounded even when both heartbeat streams stay healthy',async()=>{
  const f=fixture(),guard=await f.setup();await f.clock.advance(GUARD_LIMITS.max_active_ms);
  assert.throws(guard.assertHealthy,/deadline exceeded/);await guard.dispose();f.clean();
});

test('Blocked-host failure persists heartbeat age and existing prune timings before cleanup',async()=>{
  const profiles=[{host_started_ms:99900,total_ms:10,phases:{'store.prune':{calls:1,ms:8}}}],host=[];
  const f=fixture({firstSample:{source_at_ms:99975},failureContext:()=>captureTrialFailureContext({trial:'1x-crew-performance-1',profiles,profileStart:1,host})});
  const guard=await f.setup(),push=f.records.push;let recordedBeforeCleanup=false,serializedFailure;
  f.records.push=function(record){
    if(record.type==='guard_failure'){assert.equal(f.child.killed,false);recordedBeforeCleanup=true;serializedFailure=JSON.stringify(record);}
    return push.call(this,record);
  };
  profiles.push({host_started_ms:100000,total_ms:1285,phases:{'store.prune':{calls:1,ms:1200},'sql.COMMIT':{calls:1,ms:8}}});
  host.push({second:39,started_host_ms:100000,completed_host_ms:101285,tick_ms:1287.94});
  f.clock.time+=1288;
  assert.throws(guard.assertHealthy,/Native helper heartbeat missing/);
  const failure=f.records.find(r=>r.type==='guard_failure'),d=failure.diagnostics;
  assert.equal(recordedBeforeCleanup,true);assert.equal(d.capture_stage,'before_helper_cleanup');
  assert.deepEqual(d.last_native,{source_at_ms:99975,host_at_ms:100000});
  assert.equal(d.native_heartbeat_age_ms,1288);assert.equal(d.native_source_age_ms,1313);
  assert.equal(d.page_heartbeat_age_ms,1288);assert.equal(d.native_samples,1);assert.equal(d.page_samples,1);
  assert.equal(d.helper.created,true);assert.equal(d.helper.pid,456);assert.equal(d.helper.kill_requested,false);
  assert.equal(d.helper.exit_observed,false);assert.equal(d.helper.exit,null);assert.equal(d.helper.process_error,null);
  assert.equal(d.trial_context.measured_profile_samples,1);
  assert.equal(d.trial_context.latest_tick_profile.phases['store.prune'].ms,1200);
  assert.equal(d.trial_context.latest_host_batch.second,39);
  assert.deepEqual(JSON.parse(serializedFailure).diagnostics,d,'Diagnostic payload is JSON-safe before cleanup');
  assert.equal(f.child.killed,true,'Failure still requests helper cleanup');
  assert.equal(d.helper.exit_observed,false,'Cleanup exit cannot rewrite the pre-cleanup snapshot');
  await guard.dispose();f.clean();
});

test('Failure diagnostics distinguish observed helper exit from missing termination evidence',async()=>{
  const f=fixture(),guard=await f.setup();f.child.emit('exit',17,null);
  assert.throws(guard.assertHealthy,/Native helper exited/);
  const d=f.records.find(r=>r.type==='guard_failure').diagnostics;
  assert.equal(d.helper.exit_observed,true);assert.deepEqual(d.helper.exit,{host_at_ms:100000,code:17,signal:null});
  assert.equal(d.helper.kill_requested,false);assert.equal(d.helper.process_error,null);
  await guard.dispose();f.clean();
});

test('Observed helper process error does not imply a confirmed exit',async()=>{
  const f=fixture(),guard=await f.setup();f.child.emit('error',Error('diagnostic process error'));
  assert.throws(guard.assertHealthy,/Native helper process error/);
  const d=f.records.find(r=>r.type==='guard_failure').diagnostics;
  assert.deepEqual(d.helper.process_error,{host_at_ms:100000,message:'diagnostic process error'});
  assert.equal(d.helper.exit_observed,false);assert.equal(d.helper.exit,null);
  await guard.dispose();f.clean();
});

test('Unavailable startup heartbeats and phase context remain explicit null observations',async()=>{
  const f=fixture({silent:true}),rejected=assert.rejects(f.setup(),/Guard setup timeout/);
  await f.clock.advance(0);await f.clock.advance(8000);await rejected;
  const d=f.records.find(r=>r.type==='guard_failure').diagnostics;
  assert.equal(d.last_native,null);assert.equal(d.native_heartbeat_age_ms,null);assert.equal(d.native_source_age_ms,null);
  assert.equal(d.last_page_received_host_ms,null);assert.equal(d.page_heartbeat_age_ms,null);
  assert.equal(d.trial_context,null);assert.equal(d.helper.exit_observed,false);assert.equal(d.helper.exit,null);
  f.clean();
});

test('Failure-context errors preserve the original rejection and helper cleanup',async()=>{
  const f=fixture({failureContext:()=>{throw Error('injected diagnostic failure');}}),guard=await f.setup();
  f.window.emit('blur');assert.throws(guard.assertHealthy,/Page blur event/);
  const record=f.records.find(r=>r.type==='guard_failure');
  assert.equal(record.diagnostics.trial_context,null);assert.equal(record.diagnostics.trial_context_error,'injected diagnostic failure');
  assert.equal(f.child.killed,true);await guard.dispose();f.clean();
});

test('Failure context copies existing phase records and excludes warm-up measurements',()=>{
  const phase={calls:1,ms:1200},profile={host_started_ms:100000,total_ms:1285,phases:{'store.prune':phase}};
  const host=[{second:39,tick_ms:1287.94}],profiles=[profile];
  const missing=captureTrialFailureContext({trial:'test',profiles,profileStart:1,host:[]});
  assert.equal(missing.measured_profile_samples,0);assert.equal(missing.latest_tick_profile,null);assert.equal(missing.latest_host_batch,null);
  const saved=captureTrialFailureContext({trial:'test',profiles,profileStart:0,host});
  phase.ms=0;profile.total_ms=0;host[0].second=40;
  assert.equal(saved.latest_tick_profile.phases['store.prune'].ms,1200);assert.equal(saved.latest_tick_profile.total_ms,1285);
  assert.equal(saved.latest_host_batch.second,39);
  const noPrune=captureTrialFailureContext({trial:'test',profiles:[{phases:{'engine.detect':{calls:1,ms:2}}}],profileStart:0,host:[]});
  assert.equal(Object.hasOwn(noPrune.latest_tick_profile.phases,'store.prune'),false,'No invented zero pruning duration');
});

test('Diagnostic context is lazy, first-failure-only, and does not change healthy monitoring',async()=>{
  let calls=0;const f=fixture({failureContext:()=>{calls++;return {test:true};}}),guard=await f.setup();
  await f.clock.advance(1000);assert.equal(calls,0);
  f.window.emit('blur');f.window.emit('focus');assert.throws(guard.assertHealthy,/Page blur event/);
  assert.equal(calls,1);assert.equal(f.records.filter(r=>r.type==='guard_failure').length,1);
  assert.deepEqual(f.records.find(r=>r.type==='guard_failure').diagnostics.trial_context,{test:true});
  await guard.dispose();f.clean();
});
