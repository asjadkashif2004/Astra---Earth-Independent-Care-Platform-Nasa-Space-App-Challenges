# One read-only native identity/foreground snapshot. No activation or retry.
param([Parameter(Mandatory=$true)][int]$TestPid,[Parameter(Mandatory=$true)][string]$ExpectedTitle)
$ErrorActionPreference='Stop'
try {
  Add-Type -TypeDefinition @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AstraStartupInspection {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetWindowTextW(IntPtr h,StringBuilder text,int length);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,ExactSpelling=true)] public static extern int GetClassNameW(IntPtr h,StringBuilder text,int length);
}
'@
  $ownedProcess=Get-Process -Id $TestPid
  if($ownedProcess.ProcessName -ne 'chrome'){throw 'Owned PID is not Chrome'}
  $ownedProcess.Refresh();$selected=$ownedProcess.MainWindowHandle
  if($selected -eq [IntPtr]::Zero -or ![AstraStartupInspection]::IsWindow($selected)){throw 'Owned native window unavailable'}
  [uint32]$owner=0
  if([AstraStartupInspection]::GetWindowThreadProcessId($selected,[ref]$owner) -eq 0){throw 'Selected owner lookup failed'}
  $title=[Text.StringBuilder]::new(2048);$class=[Text.StringBuilder]::new(256)
  $null=[AstraStartupInspection]::GetWindowTextW($selected,$title,$title.Capacity)
  $null=[AstraStartupInspection]::GetClassNameW($selected,$class,$class.Capacity)
  $foreground=[AstraStartupInspection]::GetForegroundWindow();[uint32]$foregroundOwner=0
  if($foreground -ne [IntPtr]::Zero -and [AstraStartupInspection]::GetWindowThreadProcessId($foreground,[ref]$foregroundOwner) -eq 0){throw 'Foreground owner lookup failed'}
  @{source_at_ms=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();pid=$TestPid;selected_handle=('0x'+$selected.ToInt64().ToString('X'));selected_owner_pid=$owner;selected_class=$class.ToString();selected_title=$title.ToString();title_matches=$title.ToString().Contains($ExpectedTitle);selected_visible=[AstraStartupInspection]::IsWindowVisible($selected);selected_minimized=[AstraStartupInspection]::IsIconic($selected);foreground_handle=('0x'+$foreground.ToInt64().ToString('X'));foreground_pid=$foregroundOwner;owned=($foreground -eq $selected -and $foregroundOwner -eq $TestPid)}|ConvertTo-Json -Compress
}catch{
  @{source_at_ms=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();pid=$TestPid;error=$_.Exception.Message}|ConvertTo-Json -Compress
  exit 1
}
