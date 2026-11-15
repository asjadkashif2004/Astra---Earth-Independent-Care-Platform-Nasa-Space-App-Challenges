/* QA only. Imports do not launch a process or contact a browser. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const GUARD_LIMITS=Object.freeze({poll_ms:250,stale_ms:1000,startup_ms:8000,max_active_ms:75000});

export function assertNativeFocusResult(result,pid){
  assert.equal(result.status,0,'Native focus helper failed;no override or retry');
  let value;try{value=JSON.parse(result.stdout);}catch{throw Error('Invalid native focus helper JSON');}
  assert.equal(value.pid,pid,'Native focus helper PID mismatch');
  assert.equal(value.foreground_request_returned,true,'Native foreground request did not succeed');
  assert.equal(value.foreground_is_test_window,true,'Native helper did not confirm owned foreground window');
  return value;
}

// Serialized into the page. No telemetry, animation, DOM layout reads or screenshots.
export function installTrialPageGuard(binding,token,pollMs,maxMs){
  if(window.__astraP01Guard)throw Error('A page guard is already active');
  const started=Date.now(),stats={checks:0,total_check_ms:0,max_check_ms:0};let failure=null,stopped=false;
  const state=()=>({visibility:document.visibilityState,focused:document.hasFocus()});
  const emit=value=>window[binding](JSON.stringify({token,source:'page',source_at_ms:Date.now(),...value}));
  const fail=(reason,detail)=>{
    if(failure||stopped)return;
    failure={reason,detail,source_at_ms:Date.now()};emit({type:'failure',...failure});
  };
  const check=()=>{
    const begin=performance.now(),detail=state();stats.checks++;
    const cost=performance.now()-begin;stats.total_check_ms+=cost;stats.max_check_ms=Math.max(stats.max_check_ms,cost);
    if(detail.visibility!=='visible')fail('Page visibility lost',detail);
    else if(!detail.focused)fail('Page focus lost',detail);
    if(!failure&&!stopped)emit({type:'sample',...detail});
  };
  const blur=()=>fail('Page blur event',state());
  const leave=event=>fail('Page lifecycle ended',{event:event.type,...state()});
  const listeners=[[window,'blur',blur],[window,'focus',check],[document,'visibilitychange',check],[window,'pagehide',leave],[window,'beforeunload',leave]];
  for(const [target,event,fn] of listeners)target.addEventListener(event,fn);
  const interval=setInterval(check,pollMs),deadline=setTimeout(()=>fail('Page guard deadline exceeded',state()),maxMs);
  const snapshot=()=>({started_at_ms:started,source_at_ms:Date.now(),...state(),failure,stats:{...stats}});
  window.__astraP01Guard={snapshot,stop(){
    check();const result=snapshot();stopped=true;clearInterval(interval);clearTimeout(deadline);
    for(const [target,event,fn] of listeners)target.removeEventListener(event,fn);
    delete window.__astraP01Guard;return result;
  }};
  check();
}

// Failure-only copies of existing measurements; never runs telemetry or reads a database.
export function captureTrialFailureContext({trial,profiles,profileStart,host}){
  const latest=profiles.length>profileStart?profiles.at(-1):null;
  return {
    trial,measured_profile_samples:Math.max(0,profiles.length-profileStart),
    latest_tick_profile:latest?{...latest,phases:latest.phases?Object.fromEntries(Object.entries(latest.phases).map(([key,value])=>[key,{...value}])):null}:null,
    latest_host_batch:host.length?{...host.at(-1)}:null,
    scope:'Latest finished profiler record from this measured trial only;may precede failure. Missing phases are not measured zero durations.'
  };
}

export async function startTrialGuard({c,pid,record=()=>{},failureContext=()=>null,spawnProcess=spawn,clock=globalThis,now=Date.now,token=randomUUID()}){
  assert.ok(Number.isInteger(pid)&&pid>0,'Owned Chrome PID required');
  const binding='__astraP01GuardEvent',began=now();
  let child,buffer='',stderr='',failure=null,disposed=false,armed=false,exited=false,nativeIdentity=null;
  let helperSpawnRequestedAt=null,helperExit=null,helperError=null;
  let lastNative=null,lastPage=null,nativeSamples=0,pageSamples=0,nativeCost=0,maxNativeCost=0;
  const timers=new Set(),offs=[],waiters=new Set();
  let rejectFailure,ready;
  const failed=new Promise((_,reject)=>{rejectFailure=reject;});failed.catch(()=>{});
  let resolveReady;ready=new Promise(resolveReadyValue=>{resolveReady=resolveReadyValue;});
  const reportFailure=(reason,detail={},source='host',sourceAt=now())=>{
    if(failure||disposed)return;
    failure={source,source_at_ms:sourceAt,host_at_ms:now(),reason,detail};
    rejectFailure(Error('Trial guard: '+reason));
    failure.diagnostics={
      version:1,capture_stage:'before_helper_cleanup',
      last_native:lastNative?{...lastNative}:null,
      native_heartbeat_age_ms:lastNative?failure.host_at_ms-lastNative.host_at_ms:null,
      native_source_age_ms:lastNative?failure.host_at_ms-lastNative.source_at_ms:null,
      last_page_received_host_ms:lastPage,page_heartbeat_age_ms:lastPage===null?null:failure.host_at_ms-lastPage,
      native_samples:nativeSamples,page_samples:pageSamples,
      helper:{spawn_requested_host_ms:helperSpawnRequestedAt,created:!!child,pid:child?.pid??null,
        kill_requested:child?.killed??null,exit_observed:exited,exit:helperExit?{...helperExit}:null,
        process_error:helperError?{...helperError}:null,stderr_tail:stderr},
      trial_context:null
    };
    try{failure.diagnostics.trial_context=failureContext();}catch(error){failure.diagnostics.trial_context_error=String(error?.message??error);}
    try{record('guard_failure',failure);}catch(error){failure.evidence_error=error.message;}finally{child?.kill();}
  };
  const detectGap=()=>{
    if(!armed||disposed||failure)return;
    if(now()-began>=GUARD_LIMITS.max_active_ms)reportFailure('Trial guard deadline exceeded');
    else if(now()-lastNative.host_at_ms>GUARD_LIMITS.stale_ms)reportFailure('Native helper heartbeat missing');
    else if(now()-lastPage>GUARD_LIMITS.stale_ms)reportFailure('Page guard heartbeat missing');
  };
  const healthy=()=>{detectGap();if(failure)throw Error('Trial guard: '+failure.reason);if(disposed)throw Error('Trial guard disposed');};
  const checkpoint=async action=>{healthy();const value=await Promise.race([Promise.resolve().then(()=>{healthy();return action();}),failed]);healthy();return value;};
  const timeout=(fn,ms)=>{const timer=clock.setTimeout(fn,ms);timers.add(timer);return timer;};
  const removeTimer=timer=>{clock.clearTimeout(timer);timers.delete(timer);};
  const receivePage=event=>{
    if(event.name!==binding)return;
    try{
      const value=JSON.parse(event.payload);if(value.token!==token)return;
      if(!Number.isFinite(value.source_at_ms))throw Error('Missing page timestamp');
      if(value.type==='failure')return reportFailure(value.reason,value.detail,'page',value.source_at_ms);
      if(value.type!=='sample'||value.visibility!=='visible'||value.focused!==true)throw Error('Invalid page guard sample');
      if(now()-value.source_at_ms>GUARD_LIMITS.stale_ms||value.source_at_ms>now()+50)throw Error('Stale/future page sample');
      lastPage=now();pageSamples++;
    }catch(error){reportFailure('Page guard protocol failure',{error:error.message});}
  };
  const receiveNative=line=>{
    try{
      const value=JSON.parse(line);
      if(value.type==='failure')return reportFailure('Native helper failure',{error:value.error},'native',value.source_at_ms??now());
      if(value.type!=='sample'||!Number.isFinite(value.source_at_ms)||!Number.isFinite(value.check_ms)||value.check_ms<0)throw Error('Invalid native guard sample');
      if(value.pid!==pid||value.selected_owner_pid!==pid||!value.selected_handle||value.selected_handle==='0x0')throw Error('Selected native window ownership mismatch');
      if(!nativeIdentity){
        if(!value.selected_class?.startsWith('Chrome_WidgetWin_')||value.title_matches!==true)throw Error('Native Chrome page identity is not verified');
        nativeIdentity=value;
      }else if(value.selected_handle!==nativeIdentity.selected_handle)throw Error('Selected native window changed');
      if(value.owned!==true||value.foreground_handle!==value.selected_handle||value.foreground_pid!==pid)return reportFailure('Native foreground ownership lost',value,'native',value.source_at_ms);
      if(now()-value.source_at_ms>GUARD_LIMITS.stale_ms||value.source_at_ms>now()+50)throw Error('Stale/future native sample');
      if(!nativeSamples)record('guard_native_ready',{host_at_ms:now(),...value});
      lastNative={source_at_ms:value.source_at_ms,host_at_ms:now()};nativeSamples++;nativeCost+=value.check_ms;maxNativeCost=Math.max(maxNativeCost,value.check_ms);
      resolveReady();for(const waiter of waiters)if(value.source_at_ms>=waiter.after){waiters.delete(waiter);waiter.resolve();}
    }catch(error){reportFailure('Native guard protocol failure',{error:error.message},'native');}
  };
  const dispose=async()=>{
    if(disposed)return;disposed=true;
    for(const timer of timers)clock.clearTimeout(timer);timers.clear();
    for(const off of offs)off();child?.kill();
    // Bounded best-effort page cleanup also works when the browser has closed.
    let timer;await Promise.race([
      (async()=>{try{await c.evaluate('window.__astraP01Guard?.stop()');}finally{await c.send('Runtime.removeBinding',{name:binding});}})().catch(()=>{}),
      new Promise(resolve=>{timer=clock.setTimeout(resolve,500);})
    ]);clock.clearTimeout(timer);
  };
  try{
    const setupDeadline=timeout(()=>reportFailure('Guard setup timeout'),GUARD_LIMITS.startup_ms);
    const title=await checkpoint(()=>c.evaluate('document.title'));assert.ok(typeof title==='string'&&title.length>0,'Page title required for owned-window selection');
    offs.push(c.on('Runtime.bindingCalled',receivePage));
    offs.push(c.on('Inspector.detached',event=>reportFailure('Browser page detached',event)));
    offs.push(c.on('Page.frameNavigated',event=>{if(!event.frame?.parentId)reportFailure('Top-level page navigated',{url:event.frame?.url});}));
    await checkpoint(()=>c.send('Runtime.addBinding',{name:binding}));
    helperSpawnRequestedAt=now();
    child=spawnProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/n04-p01-native-ownership.ps1'),'-TestPid',String(pid),'-ExpectedTitle',title],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    child.once('error',error=>{helperError={host_at_ms:now(),message:error.message};reportFailure('Native helper process error',{error:error.message});});
    child.once('exit',(code,signal)=>{exited=true;helperExit={host_at_ms:now(),code,signal};reportFailure('Native helper exited',{code,signal});});
    child.stdout.once('error',error=>reportFailure('Native helper stdout error',{error:error.message}));
    child.stderr.once('error',error=>reportFailure('Native helper stderr error',{error:error.message}));
    child.stderr.on('data',data=>{stderr=(stderr+data).slice(-512);reportFailure('Native helper stderr',{stderr});});
    child.stdout.on('data',data=>{
      if(failure||disposed)return;
      buffer+=data.toString();if(buffer.length>16384)return reportFailure('Native helper output exceeded bound');
      let end;while(!failure&&(end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);if(line)receiveNative(line);}
    });
    await checkpoint(()=>ready);
    await checkpoint(()=>c.evaluate('('+installTrialPageGuard.toString()+')('+JSON.stringify(binding)+','+JSON.stringify(token)+','+GUARD_LIMITS.poll_ms+','+GUARD_LIMITS.max_active_ms+')'));
    assert.ok(lastPage!==null,'Page guard did not report initial visibility/focus');healthy();armed=true;healthy();removeTimer(setupDeadline);
    record('guard_started',{host_at_ms:now(),pid,native_handle:nativeIdentity.selected_handle,limits:GUARD_LIMITS});
    const watchdog=()=>{
      if(disposed||failure)return;
      detectGap();if(failure)return;
      timeout(watchdog,GUARD_LIMITS.poll_ms);
    };
    timeout(watchdog,GUARD_LIMITS.poll_ms);
    return {
      assertHealthy:healthy,checkpoint,dispose,
      async finish(){
        healthy();const end=now();
        // Require a native check sourced AFTER the last measured capture, not a cached poll.
        let waiter;
        const barrier=new Promise(resolve=>{waiter={after:end,resolve};waiters.add(waiter);});
        const deadline=timeout(()=>reportFailure('Native final coverage check missing'),GUARD_LIMITS.stale_ms);
        try{await checkpoint(()=>barrier);}finally{removeTimer(deadline);waiters.delete(waiter);}
        const page=await checkpoint(()=>c.evaluate('window.__astraP01Guard.stop()'));
        assert.ok(page&&!page.failure&&page.visibility==='visible'&&page.focused===true,'Final page guard state invalid');
        const summary={started_host_ms:began,ended_host_ms:now(),required_through_host_ms:end,last_native:lastNative,native_identity:nativeIdentity,native_samples:nativeSamples,page_samples:pageSamples,page,limits:GUARD_LIMITS,native_check_ms:{total:nativeCost,max:maxNativeCost},failure:null,limitation:'Event detection plus 250ms sampling;sub-poll native changes may escape. Observer overhead is included,not subtracted;not physical visibility or scanout proof.'};
        record('guard_completed',summary);await dispose();return summary;
      }
    };
  }catch(error){
    if(!failure)reportFailure('Guard setup failure',{error:error.message,armed,exited});
    await dispose();throw error;
  }
}
