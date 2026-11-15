/* One bounded owned-window identity diagnostic;no ASTRA imports or database access. */
import { spawn,execFile } from 'node:child_process';
import { existsSync,mkdirSync,mkdtempSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { nativeExecTimeout } from './n04-native-timeout.mjs';
if(process.platform!=='win32')throw Error('Run with the isolated Windows Node.');
const directory=resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'artifacts/n04-native-window-session-20261019');
if(existsSync(directory))throw Error('Fresh output required;no overwrite or retry.');mkdirSync(directory,{recursive:true});
const start=performance.now(),marker='ASTRA N04 Owned '+randomUUID();
const report={started_at:new Date().toISOString(),scope:'One native Chrome identity/foreground diagnostic;not acceptance',approved_cap_ms:30000,active_cap_ms:25000,attempts:1};
let browser,nativeProcess,session,sequence=0,buffer='',closing=false,closeRequested=false;
const pending=new Map();
function send(method,params={},sessionId=session){
  return new Promise((accept,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},3000);pending.set(id,{accept,reject,timer});
    browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0',error=>{if(error){clearTimeout(timer);pending.delete(id);reject(error);}});
  });
}
function closeOwned(){if(browser&&!closeRequested&&browser.exitCode===null){closeRequested=true;void send('Browser.close',{},null).catch(()=>{});}}
function receive(chunk){
  buffer+=chunk.toString();let end;
  while((end=buffer.indexOf('\0'))>=0){
    const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;
    try{const m=JSON.parse(line),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.accept(m.result);}}
    catch(error){abort(error.message);}
  }
}
function abort(reason){
  if(closing)return;closing=true;report.status='stopped';report.error=reason;nativeProcess?.kill();closeOwned();
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(reason));}pending.clear();
}
const timer=setTimeout(()=>abort('25-second active limit reached;30-second total cap'),25000);
const quote=s=>"'"+s.replaceAll("'","''")+"'";
try{
  const executable=String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
  if(!existsSync(executable))throw Error('Installed Chrome unavailable');
  const profile=mkdtempSync(join(tmpdir(),'astra-n04-native-window-'));
  browser=spawn(executable,['--start-fullscreen','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
  report.owned_chrome_pid=browser.pid;
  browser.on('error',error=>abort(error.message));browser.stdio[3].on('error',error=>abort(error.message));
  browser.on('exit',()=>{if(!closing)abort('Owned Chrome closed unexpectedly');});browser.stdio[4].on('data',receive);
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
  ({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));await send('Runtime.enable');
  const result=await send('Runtime.evaluate',{expression:'document.title='+JSON.stringify(marker),returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);
  const info=await send('Browser.getWindowForTarget');await send('Browser.setWindowBounds',{windowId:info.windowId,bounds:{windowState:'normal'}});await send('Page.bringToFront');
  await new Promise(accept=>setTimeout(accept,250));if(closing)throw Error('Diagnostic already stopped');
  report.browser=await send('Browser.getVersion',{},null);
  const readiness=await send('Runtime.evaluate',{expression:'({at:new Date().toISOString(),ready_state:document.readyState,visibility:document.visibilityState,focused:document.hasFocus(),title:document.title})',returnByValue:true});
  if(readiness.exceptionDetails)throw Error('Chrome readiness observation failed: '+readiness.exceptionDetails.text);
  report.page_before_native=readiness.result.value;
  report.window_before_native=await send('Browser.getWindowForTarget');
  const nativeCode=String.raw`
$ErrorActionPreference='Stop'
$r=@{owned_chrome_pid=${browser.pid};selected_matches_owned_instance=$false;activation_attempted=$false}
try {
  Add-Type -TypeDefinition @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AstraNativeIdentity {
  [DllImport("user32.dll",SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetWindowTextW(IntPtr h,StringBuilder text,int length);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetClassNameW(IntPtr h,StringBuilder text,int length);
}
'@
  function Read-Foreground {
    $h=[AstraNativeIdentity]::GetForegroundWindow();[uint32]$owner=0
    if($h -ne [IntPtr]::Zero){$thread=[AstraNativeIdentity]::GetWindowThreadProcessId($h,[ref]$owner);if($thread -eq 0){throw 'Foreground owner lookup failed'}}
    $name=$null;if($owner -ne 0){$name=(Get-Process -Id $owner -ErrorAction SilentlyContinue).ProcessName}
    return @{at=[DateTime]::UtcNow.ToString('o');handle=('0x'+$h.ToInt64().ToString('X'));pid=$owner;process_name=$name}
  }
  $r.foreground_before=Read-Foreground
  $p=Get-Process -Id ${browser.pid};if($p.ProcessName -ne 'chrome'){throw 'Owned PID is not Chrome'};$p.Refresh();$h=$p.MainWindowHandle
  $r.selected_handle='0x'+$h.ToInt64().ToString('X');$r.selection_at=[DateTime]::UtcNow.ToString('o')
  if($h -eq [IntPtr]::Zero -or ![AstraNativeIdentity]::IsWindow($h)){throw 'Selected window is not a valid native window'}
  $r.selected_visible=[AstraNativeIdentity]::IsWindowVisible($h);$r.selected_minimized=[AstraNativeIdentity]::IsIconic($h)
  $r.owned_chrome_started_at=$p.StartTime.ToUniversalTime().ToString('o')
  [uint32]$owner=0;$thread=[AstraNativeIdentity]::GetWindowThreadProcessId($h,[ref]$owner);$r.selected_owner_pid=$owner
  if($thread -eq 0){$r.owner_lookup_error=[Runtime.InteropServices.Marshal]::GetLastWin32Error();throw 'Selected owner lookup failed'}
  if($owner -ne ${browser.pid}){throw 'Selected native handle does not belong to the owned Chrome PID'}
  $title=[Text.StringBuilder]::new(1024);$class=[Text.StringBuilder]::new(256)
  $null=[AstraNativeIdentity]::GetWindowTextW($h,$title,$title.Capacity);$null=[AstraNativeIdentity]::GetClassNameW($h,$class,$class.Capacity)
  $r.selected_title=$title.ToString();$r.selected_class=$class.ToString()
  if(!$r.selected_title.Contains(${quote(marker)}) -or !$r.selected_class.StartsWith('Chrome_WidgetWin_')){throw 'Selected handle cannot be verified as the marked owned Chrome page'}
  $r.selected_matches_owned_instance=$true;$r.activation_attempted=$true
  $r.foreground_before_helper=Read-Foreground
  $activation=& ${quote(resolve('scripts/n04-p01-focus.ps1'))} -TestPid ${browser.pid} | ConvertFrom-Json
  $r.activation_at=[DateTime]::UtcNow.ToString('o');$r.set_foreground_window_result=$activation.foreground_request_returned;$r.helper_foreground_is_test_window=$activation.foreground_is_test_window
  $r.foreground_after=Read-Foreground
  $p.Refresh();$r.selection_unchanged_after_helper=($p.MainWindowHandle -eq $h)
  [uint32]$afterOwner=0
  if([AstraNativeIdentity]::GetWindowThreadProcessId($h,[ref]$afterOwner) -eq 0){throw 'Selected owner lookup failed after helper'}
  $r.selected_owner_pid_after=$afterOwner
  $r.independent_foreground_matches_selected=($r.foreground_after.handle -eq $r.selected_handle -and $r.foreground_after.pid -eq ${browser.pid})
  if(!$r.selection_unchanged_after_helper){throw 'Native handle changed while helper selected it;activation attribution is uncertain'}
  if($afterOwner -ne ${browser.pid}){throw 'Selected native window ownership changed during helper'}
} catch {$r.error=$_.Exception.Message}
$r|ConvertTo-Json -Depth 5 -Compress
`;
  const native=await new Promise((accept,reject)=>{
    nativeProcess=execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',nativeCode],{encoding:'utf8',windowsHide:true,timeout:nativeExecTimeout(performance.now()-start)},(error,stdout,stderr)=>{nativeProcess=null;if(error)return reject(Error('Native diagnostic: '+error.message+' '+stderr));try{accept(JSON.parse(stdout));}catch(error){reject(error);}});
  });
  report.native=native;report.status=native.error?'stopped':'completed';if(native.error)report.error=native.error;
}catch(error){report.status='stopped';report.error??=error.message;}
finally{
  clearTimeout(timer);closing=true;nativeProcess?.kill();closeOwned();
  if(browser&&browser.exitCode===null){await new Promise(accept=>{const t=setTimeout(accept,1000);browser.once('exit',()=>{clearTimeout(t);accept();});});if(browser.exitCode===null)browser.kill();}
  for(const p of pending.values())clearTimeout(p.timer);pending.clear();
  report.finished_at=new Date().toISOString();report.elapsed_ms=performance.now()-start;
  writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
}
