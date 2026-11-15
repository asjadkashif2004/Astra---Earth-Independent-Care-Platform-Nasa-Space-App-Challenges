/* QA-only operator preparation. Importing this module launches no process or browser. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertNativeFocusResult,GUARD_LIMITS } from './n04-p01-trial-guard.mjs';

// Separate, unmeasured operator wait; expiration aborts and never implies readiness.
export const USER_READY_WAIT_MS=60000;

export function installUserReadyPrompt(binding,token,pid,marker){
  if(window.__astraP01StartupReady)throw Error('A startup readiness prompt is already active');
  const dialog=document.createElement('dialog'),heading=document.createElement('h2'),instructions=document.createElement('p');
  const ready=document.createElement('button'),cancel=document.createElement('button');
  dialog.setAttribute('aria-label','ASTRA QA startup readiness');
  dialog.style.cssText='background:#111116;color:#f2eee8;border:2px solid #f3a64a;border-radius:12px;padding:28px;max-width:600px;font:18px/1.6 system-ui';
  heading.textContent='ASTRA QA — measurement has not started';
  instructions.textContent='Bring this owned Chrome window to the foreground. PID '+pid+'. Title marker: '+marker+'. Click READY below to confirm. Do not type READY in Terminal or chat. Cancel stops the run.';
  ready.textContent='READY — verify and continue';ready.setAttribute('data-astra-qa-ready','');
  cancel.textContent='Cancel — stop';cancel.setAttribute('data-astra-qa-cancel','');
  for(const button of [ready,cancel])button.style.cssText='font:inherit;margin:8px;padding:10px 16px;background:#24242c;color:#f2eee8;border:2px solid #f3a64a;border-radius:6px';
  let sent=false;
  const emit=(event,type)=>{
    if(sent||!event.isTrusted)return;
    sent=true;ready.disabled=true;cancel.disabled=true;
    window[binding](JSON.stringify({token,marker,type,trusted:true,source_at_ms:Date.now(),visibility:document.visibilityState,focused:document.hasFocus()}));
  };
  const confirm=event=>emit(event,'ready'),stop=event=>emit(event,'cancel');
  const escape=event=>{event.preventDefault();stop(event);};
  ready.addEventListener('click',confirm);cancel.addEventListener('click',stop);dialog.addEventListener('cancel',escape);
  dialog.append(heading,instructions,ready,cancel);document.body.append(dialog);
  window.__astraP01StartupReady={remove(){
    ready.removeEventListener('click',confirm);cancel.removeEventListener('click',stop);dialog.removeEventListener('cancel',escape);
    dialog.close();dialog.remove();delete window.__astraP01StartupReady;
  }};
  dialog.showModal();ready.focus();return {installed:true};
}

export async function waitForUserReady({c,pid,marker,token,clock=globalThis,now=Date.now,output=console.log}){
  const binding='__astraP01StartupReadyEvent',offs=[],started=now();let timer,settled=false,cleaned=false;
  let accept,reject;const confirmation=new Promise((yes,no)=>{accept=yes;reject=no;});confirmation.catch(()=>{});
  const fail=reason=>{if(!settled){settled=true;reject(Error(reason));}};
  const receive=event=>{
    if(event.name!==binding||settled)return;
    try{
      const value=JSON.parse(event.payload);if(value.token!==token)return;
      assert.equal(value.marker,marker,'Startup marker mismatch');assert.equal(value.trusted,true,'Explicit trusted READY action required');
      if(value.type!=='ready')return fail('Operator cancelled startup readiness');
      assert.ok(Number.isFinite(value.source_at_ms)&&now()-value.source_at_ms<=GUARD_LIMITS.stale_ms&&value.source_at_ms<=now()+50,'Stale/future startup confirmation');
      assert.equal(value.visibility,'visible','READY page must be visible');assert.equal(value.focused,true,'READY page must have focus');
      settled=true;accept({...value,received_host_ms:now(),wait_started_host_ms:started});
    }catch(error){fail('Startup readiness confirmation invalid: '+error.message);}
  };
  try{
    offs.push(c.on('Runtime.bindingCalled',receive));
    offs.push(c.on('Inspector.detached',()=>fail('Chrome page detached during startup readiness')));
    offs.push(c.on('Runtime.executionContextsCleared',()=>fail('Chrome page context cleared during startup readiness')));
    offs.push(c.on('Page.frameNavigated',event=>{if(!event.frame?.parentId)fail('Chrome navigated during startup readiness');}));
    timer=clock.setTimeout(()=>fail('Explicit startup readiness was not confirmed within60s'),USER_READY_WAIT_MS);
    await c.send('Runtime.addBinding',{name:binding});
    const installed=await c.evaluate('('+installUserReadyPrompt.toString()+')('+[binding,token,pid,marker].map(value=>JSON.stringify(value)).join(',')+')');
    assert.equal(installed?.installed,true,'Interactive startup checkpoint unavailable');
    output('QA PREPARATION ONLY: bring owned Chrome PID '+pid+' (title contains '+marker+') to foreground and click "READY — verify and continue" inside that window. Do not reply in Terminal/chat. Cancel or no explicit click within60s stops;no automatic continuation.');
    const result=await confirmation;clock.clearTimeout(timer);
    await c.evaluate('window.__astraP01StartupReady.remove()');await c.send('Runtime.removeBinding',{name:binding});cleaned=true;
    return result;
  }finally{
    clock.clearTimeout(timer);for(const off of offs)off();
    if(!cleaned){
      let cleanupTimer;await Promise.race([
        (async()=>{try{await c.evaluate('window.__astraP01StartupReady?.remove()');}finally{await c.send('Runtime.removeBinding',{name:binding});}})().catch(()=>{}),
        new Promise(done=>{cleanupTimer=clock.setTimeout(done,500);})
      ]);clock.clearTimeout(cleanupTimer);
    }
  }
}

export function assertStartupNative(value,{pid,marker,handle=null}){
  assert.equal(value.pid,pid,'Startup native PID mismatch');assert.equal(value.selected_owner_pid,pid,'Startup HWND owner mismatch');
  assert.ok(typeof value.selected_handle==='string'&&/^0x[0-9a-f]+$/i.test(value.selected_handle)&&!/^0x0+$/i.test(value.selected_handle),'Startup HWND unavailable');
  if(handle)assert.equal(value.selected_handle,handle,'Startup HWND changed');
  assert.ok(value.selected_class?.startsWith('Chrome_WidgetWin_'),'Startup Chrome class mismatch');
  assert.ok(value.title_matches===true&&value.selected_title?.includes(marker),'Startup marked title mismatch');
  assert.equal(value.selected_visible,true,'Startup native window is not visible');assert.equal(value.selected_minimized,false,'Startup native window is minimized');
  assert.equal(value.owned,true,'Startup native foreground ownership missing');assert.equal(value.foreground_pid,pid,'Startup foreground PID mismatch');
  assert.equal(value.foreground_handle,value.selected_handle,'Startup foreground HWND mismatch');return value;
}

function assertStartupPage(value,marker){
  assert.equal(value.ready_state,'complete','Startup page is not ready');assert.ok(value.title?.includes(marker),'Startup page marker mismatch');
  assert.equal(value.visibility,'visible','Startup page is not visible');assert.equal(value.focused,true,'Startup page is not focused');
}

export function inspectOwnedChrome(pid,marker){
  assert.equal(process.platform,'win32','Native startup inspection requires Windows');
  return new Promise((accept,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/n04-p01-startup-inspect.ps1'),'-TestPid',String(pid),'-ExpectedTitle',marker],
    {encoding:'utf8',windowsHide:true,timeout:GUARD_LIMITS.startup_ms,maxBuffer:16384},(error,stdout,stderr)=>{
      try{const value=JSON.parse(stdout);if(error||stderr.trim()||value.error)throw Error(value.error??error?.message??stderr.trim());accept(value);}catch(failure){reject(Error('Native startup inspection failed: '+failure.message));}
    }));
}

export function createUserAssistedStartup({c,pid,activate,record,inspectNative=inspectOwnedChrome,waitReady=waitForUserReady,clock=globalThis,now=Date.now,output=console.log,token=randomUUID()}){
  assert.ok(Number.isInteger(pid)&&pid>0,'Owned Chrome PID required');
  const marker='ASTRA QA '+token;let confirmed=false,marked=false,handle=null,failed=false,busy=false;
  const page=()=>c.evaluate('({ready_state:document.readyState,title:document.title,visibility:document.visibilityState,focused:document.hasFocus()})');
  return {async run(trial,finishLayout){
    assert.ok(!failed,'Startup session already failed;no retry');assert.ok(!busy,'Concurrent startup is not allowed');busy=true;
    const entry={trial,pid,marker,started_host_ms:now(),assistance_requested:!confirmed,status:'preparing',stage:'mark_title'};
    try{
      if(!marked){await c.evaluate('document.title=document.title+" — "+'+JSON.stringify(marker));marked=true;}
      if(!confirmed){entry.stage='awaiting_explicit_ready';entry.confirmation=await waitReady({c,pid,marker,token,clock,now,output});confirmed=true;}
      entry.stage='page_before';entry.page_before=await page();assertStartupPage(entry.page_before,marker);
      entry.stage='native_before';entry.native_before=await inspectNative(pid,marker);assertStartupNative(entry.native_before,{pid,marker,handle});
      entry.stage='activation';const focus=await activate(trial);
      entry.activation={status:focus.status,stdout:focus.stdout,stderr:focus.stderr,error:focus.error?.message};assertNativeFocusResult(focus,pid);
      entry.stage='layout';await finishLayout();
      entry.stage='native_after';entry.native_after=await inspectNative(pid,marker);assertStartupNative(entry.native_after,{pid,marker,handle:entry.native_before.selected_handle});
      entry.stage='page_after';entry.page_after=await page();assertStartupPage(entry.page_after,marker);
      handle=entry.native_after.selected_handle;entry.status='passed';entry.stage='complete';return entry;
    }catch(error){failed=true;entry.status='failed';entry.reason=error.message;throw error;}
    finally{
      entry.finished_host_ms=now();busy=false;
      try{record(entry);}catch(error){failed=true;entry.evidence_error=error.message;if(entry.status==='passed'){entry.status='failed';throw Error('Startup evidence could not be persisted: '+error.message);}}
    }
  }};
}
