# Read-only QA observer. No activation, focus override, window mutation or OS changes.
param([Parameter(Mandatory=$true)][int]$TestPid,[Parameter(Mandatory=$true)][string]$ExpectedTitle)
$ErrorActionPreference='Stop'
try {
  Add-Type -TypeDefinition @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AstraForegroundObserver {
  [DllImport("user32.dll",SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetWindowTextW(IntPtr h,StringBuilder text,int length);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetClassNameW(IntPtr h,StringBuilder text,int length);
}
'@
  $ownedProcess=Get-Process -Id $TestPid
  if($ownedProcess.ProcessName -ne 'chrome'){throw 'Owned PID is not Chrome'}
  $ownedProcess.Refresh();$selected=$ownedProcess.MainWindowHandle
  if($selected -eq [IntPtr]::Zero -or ![AstraForegroundObserver]::IsWindow($selected)){throw 'Owned Chrome window unavailable'}
  $title=[Text.StringBuilder]::new(2048);$class=[Text.StringBuilder]::new(256)
  $null=[AstraForegroundObserver]::GetWindowTextW($selected,$title,$title.Capacity)
  $null=[AstraForegroundObserver]::GetClassNameW($selected,$class,$class.Capacity)
  if(!$title.ToString().Contains($ExpectedTitle) -or !$class.ToString().StartsWith('Chrome_WidgetWin_')){throw 'Owned Chrome page identity mismatch'}
  $active=[Diagnostics.Stopwatch]::StartNew()
  while($active.ElapsedMilliseconds -lt 75000){
    $at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$cost=[Diagnostics.Stopwatch]::StartNew()
    if(![AstraForegroundObserver]::IsWindow($selected)){throw 'Selected Chrome window closed'}
    [uint32]$owner=0
    if([AstraForegroundObserver]::GetWindowThreadProcessId($selected,[ref]$owner) -eq 0 -or $owner -ne $TestPid){throw 'Selected window ownership mismatch'}
    $foreground=[AstraForegroundObserver]::GetForegroundWindow();[uint32]$foregroundOwner=0
    if($foreground -ne [IntPtr]::Zero -and [AstraForegroundObserver]::GetWindowThreadProcessId($foreground,[ref]$foregroundOwner) -eq 0){throw 'Foreground owner lookup failed'}
    $owned=($foreground -eq $selected -and $foregroundOwner -eq $TestPid);$cost.Stop()
    @{type='sample';source_at_ms=$at;pid=$TestPid;selected_handle=('0x'+$selected.ToInt64().ToString('X'));selected_owner_pid=$owner;selected_class=$class.ToString();title_matches=$true;foreground_handle=('0x'+$foreground.ToInt64().ToString('X'));foreground_pid=$foregroundOwner;owned=$owned;check_ms=$cost.Elapsed.TotalMilliseconds} | ConvertTo-Json -Compress
    if(!$owned){exit 1}
    Start-Sleep -Milliseconds 250
  }
  throw 'Native observer 75-second limit reached'
}catch{
  @{type='failure';source_at_ms=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();error=$_.Exception.Message}|ConvertTo-Json -Compress
  exit 1
}
