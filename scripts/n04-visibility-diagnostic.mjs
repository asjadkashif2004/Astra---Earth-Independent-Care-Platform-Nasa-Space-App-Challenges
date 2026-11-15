/* One explicitly approved visibility-only probe. No ASTRA imports,server,SQLite or workload. */
import { spawn,execFile } from 'node:child_process';
import { existsSync,mkdirSync,mkdtempSync,writeFileSync,appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { performance } from 'node:perf_hooks';
if(process.platform!=='win32')throw Error('Use the isolated portable Windows Node.');
const directory=resolve(process.argv.find(s=>s.startsWith('--output='))?.slice(9)??'artifacts/n04-visibility-session1-20261019');
if(existsSync(directory))throw Error('Fresh diagnostic output required;no overwrite or retry.');
mkdirSync(directory,{recursive:true});
const logPath=join(directory,'transitions.jsonl');writeFileSync(logPath,'',{flag:'wx'});
const started=performance.now(),runCap=85000;
const report={scope:'One visibility-only diagnostic;not an acceptance or performance trial',started_at:new Date().toISOString(),approved_total_cap_ms:90000,probe_cap_ms:runCap,shutdown_reserve_ms:5000,native_poll_ms:250,page_poll_ms:500,page:'about:blank',application_loaded:false,database_access:false,screenshots:0,attempts:1,events:0,native_ownership_checks:'GetForegroundWindow compared with task-owned Chrome MainWindowHandle only;no other window titles/processes read',limitations:['A blank-page visibility probe cannot certify ASTRA workload stability or physical occlusion.','Temporary isolated Chrome profile is retained;no storage cleanup or fixture access.']};
let browser,monitor,focusProcess,session,target,stopping=false,closeRequested=false,phase='setup',sequence=0,buffer='',stderr='',lastState,lastFocused,lastNative;
const pending=new Map();let complete;
const stopped=new Promise(resolve=>{complete=resolve;});
function log(kind,data={}){
  if(report.events>=200){stop('tooling_failure','Transition log cap exceeded');return;}
  appendFileSync(logPath,JSON.stringify({at:new Date().toISOString(),elapsed_ms:Math.round(performance.now()-started),phase,kind,...data})+'\n');report.events++;
}
function stop(status,reason){
  if(stopping)return;stopping=true;report.status=status;report.reason=reason;report.probe_finished_at=new Date().toISOString();report.probe_elapsed_ms=performance.now()-started;monitor?.kill();focusProcess?.kill();closeOwnedBrowser();complete();
}
function closeOwnedBrowser(){if(browser&&!closeRequested&&browser.exitCode===null){closeRequested=true;void send('Browser.close',{},null).catch(()=>{});}}
function send(method,params={},sessionId=session){
  if(!browser?.stdio[3]?.writable)return Promise.reject(Error('Browser pipe unavailable: '+method));
  return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},4000);
    pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0',error=>{if(error){clearTimeout(timer);pending.delete(id);reject(error);}});
  });
}
function pageState(data){
  log('page',data);
  const lost=lastState==='visible'&&data.visibility==='hidden';lastState=data.visibility;lastFocused=data.focused;
  if(lost||(phase==='observing'&&data.visibility!=='visible'))stop('visibility_loss','Observed document visibility '+data.visibility);
  else if(phase==='observing'&&['pagehide','beforeunload'].includes(data.event))stop('page_closure_or_navigation',data.event);
}
function receive(chunk){
  buffer+=chunk.toString();let end;
  while((end=buffer.indexOf('\0'))>=0){
    const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;
    try{
      const m=JSON.parse(line);
      if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}continue;}
      if(stopping)continue;
      if(m.method==='Runtime.bindingCalled'&&m.params.name==='astraVisibilityDiagnostic')pageState(JSON.parse(m.params.payload));
      if(m.method==='Page.frameNavigated'){
        const frame=m.params.frame;if(!frame.parentId){log('navigation',{url:frame.url==='about:blank'?'about:blank':'Unexpected URL omitted'});if(phase==='observing')stop('page_closure_or_navigation','Unexpected top-level navigation');}
      }
      if(m.method==='Target.targetDestroyed'&&m.params.targetId===target){log('page_closed');stop('page_closed','Owned page closed');}
      if(m.method==='Inspector.detached'){log('page_detached',{reason:m.params.reason});stop('tooling_failure','CDP page detached');}
      if(m.method==='Runtime.exceptionThrown'){log('page_error',{text:m.params.exceptionDetails.text});stop('tooling_failure','Diagnostic page exception');}
    }catch(error){log('tooling_error',{message:error.message});stop('tooling_failure',error.message);}
  }
}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
const focus=pid=>new Promise((accept,reject)=>{focusProcess=execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/n04-p01-focus.ps1'),'-TestPid',String(pid)],{encoding:'utf8',windowsHide:true,timeout:8000},(error,stdout,stderr)=>{focusProcess=null;if(error)return reject(Error('Native focus helper: '+error.message+' '+stderr));try{accept(JSON.parse(stdout));}catch(error){reject(error);}});});
const deadline=setTimeout(()=>phase==='observing'&&lastNative?stop('stable_to_limit','Probe time limit reached without observed visibility loss'):stop('tooling_failure','Probe limit reached before setup/native monitoring completed'),runCap);
try{
  const executable=String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
  if(!existsSync(executable))throw Error('Installed Chrome unavailable;no installation attempted.');
  const profile=mkdtempSync(join(tmpdir(),'astra-n04-visibility-'));report.temporary_profile=profile;
  const flags=['--start-fullscreen','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'];
  report.launch_flags=flags;
  browser=spawn(executable,flags,{stdio:['ignore','ignore','pipe','pipe','pipe']});report.owned_browser_pid=browser.pid;
  browser.stdio[4].setEncoding('utf8');browser.stdio[4].on('data',receive);
  browser.stderr.on('data',b=>{stderr=(stderr+b).slice(-1200);});
  const failure=error=>{if(!stopping){log('tooling_error',{message:error.message});stop('tooling_failure',error.message);}};
  browser.on('error',failure);browser.stdio[3].on('error',failure);
  browser.on('exit',(code,signal)=>{
    if(!stopping){log('browser_closed',{code,signal});stop('browser_closed','Owned Chrome exited');}
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Owned browser closed'));}pending.clear();
  });
  report.browser=await send('Browser.getVersion',{},null);
  ({targetId:target}=await send('Target.createTarget',{url:'about:blank'},null));
  ({sessionId:session}=await send('Target.attachToTarget',{targetId:target,flatten:true},null));
  await send('Runtime.enable');await send('Page.enable');await send('Runtime.addBinding',{name:'astraVisibilityDiagnostic'});
  await evaluate(`(()=>{const emit=event=>astraVisibilityDiagnostic(JSON.stringify({event,page_at:new Date().toISOString(),visibility:document.visibilityState,focused:document.hasFocus()}));document.addEventListener('visibilitychange',()=>emit('visibilitychange'));for(const type of ['focus','blur','pagehide','beforeunload'])window.addEventListener(type,()=>emit(type));emit('initial');})()`);
  const info=await send('Browser.getWindowForTarget');await send('Browser.setWindowBounds',{windowId:info.windowId,bounds:{windowState:'normal'}});
  await send('Page.bringToFront');report.native_focus=await focus(browser.pid);log('native_focus',report.native_focus);
  if(stopping)throw Error('Stopped during setup');
  if(!report.native_focus.foreground_is_test_window)throw Error('Supported native focus did not establish ownership.');
  await send('Browser.setWindowBounds',{windowId:info.windowId,bounds:{windowState:'fullscreen'}});
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  report.native_window=await send('Browser.getWindowForTarget');
  phase='observing';report.observation_started_at=new Date().toISOString();
  pageState(await evaluate('({event:"observation_start",page_at:new Date().toISOString(),visibility:document.visibilityState,focused:document.hasFocus()})'));
  if(!stopping){
    const nativeEnd=new Date(Date.now()+Math.max(1,runCap-(performance.now()-started))+1000).toISOString();
    const nativeCode=`$ErrorActionPreference='Stop';$p=Get-Process -Id ${browser.pid};if($p.ProcessName -ne 'chrome'){throw 'Not the owned Chrome'};$h=$p.MainWindowHandle;if($h -eq [IntPtr]::Zero){throw 'No owned native window'};Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class AstraVisibilityNative{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();}';$end=[DateTime]::Parse('${nativeEnd}').ToUniversalTime();$last=$null;while([DateTime]::UtcNow -lt $end){$owned=([AstraVisibilityNative]::GetForegroundWindow() -eq $h);if($null -eq $last -or $owned -ne $last){@{native_at=[DateTime]::UtcNow.ToString('o');owned=$owned}|ConvertTo-Json -Compress;$last=$owned};Start-Sleep -Milliseconds 250}`;
    monitor=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',nativeCode],{stdio:['ignore','pipe','pipe'],windowsHide:true});
    let nativeBuffer='',nativeStderr='';
    monitor.stdout.on('data',chunk=>{nativeBuffer+=chunk.toString();let index;while((index=nativeBuffer.indexOf('\n'))>=0){const line=nativeBuffer.slice(0,index).trim();nativeBuffer=nativeBuffer.slice(index+1);if(line&&!stopping){try{const data=JSON.parse(line);lastNative=data;log('native_ownership',data);}catch(error){failure(error);}}}});
    monitor.stderr.on('data',chunk=>{nativeStderr=(nativeStderr+chunk).slice(-800);});monitor.on('error',failure);
    monitor.on('exit',(code,signal)=>{if(!stopping){log('native_monitor_exit',{code,signal,stderr:nativeStderr});stop('tooling_failure','Native ownership monitor exited before probe stop');}});
    while(!stopping){
      await Promise.race([stopped,new Promise(resolve=>setTimeout(resolve,500))]);if(stopping)break;
      const state=await evaluate('({event:"poll",page_at:new Date().toISOString(),visibility:document.visibilityState,focused:document.hasFocus()})');
      if(state.visibility!==lastState||state.focused!==lastFocused)pageState(state);
    }
    await stopped;
    if(report.status==='stable_to_limit'&&!lastNative){report.status='tooling_failure';report.reason='No native ownership observation received';}
  }
}catch(error){if(!stopping){log('tooling_error',{message:error.message});stop('tooling_failure',error.message);}}
finally{
  clearTimeout(deadline);phase='shutdown';monitor?.kill();
  if(browser&&browser.exitCode===null){closeOwnedBrowser();await new Promise(resolve=>{const timer=setTimeout(resolve,1500);browser.once('exit',()=>{clearTimeout(timer);resolve();});});if(browser.exitCode===null)browser.kill();}
  for(const p of pending.values()){clearTimeout(p.timer);}pending.clear();
  report.finished_at=new Date().toISOString();report.total_elapsed_ms=performance.now()-started;report.last_native_observation=lastNative??null;report.stderr_tail=stderr;
  report.status??='tooling_failure';report.reason??='Diagnostic did not reach observation';
  writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:report.status,reason:report.reason,probe_elapsed_ms:report.probe_elapsed_ms,total_elapsed_ms:report.total_elapsed_ms,events:report.events,report:join(directory,'report.json')},null,2));
}
