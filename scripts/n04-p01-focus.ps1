param([Parameter(Mandatory=$true)][int]$TestPid)
$ErrorActionPreference='Stop'
$testProcess=Get-Process -Id $TestPid
if($testProcess.ProcessName -ne 'chrome'){throw 'Only the task-owned Chrome process is allowed.'}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AstraOwnedWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd,int command);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
$testProcess.Refresh()
$testHandle=$testProcess.MainWindowHandle
if($testHandle -eq [IntPtr]::Zero){throw 'Task-owned Chrome has no native window handle.'}
$restored=[AstraOwnedWindow]::ShowWindow($testHandle,9)
$requested=[AstraOwnedWindow]::SetForegroundWindow($testHandle)
@{pid=$TestPid;restore_previous_visibility=$restored;foreground_request_returned=$requested;foreground_is_test_window=([AstraOwnedWindow]::GetForegroundWindow() -eq $testHandle);method='Supported ShowWindow/SetForegroundWindow only;no foreground-lock override,topmost change or session unlock'} | ConvertTo-Json -Compress
