/* Isolated QA budget calculation; importing this module cannot launch a process. */
export const NATIVE_EXEC_BUDGET_MS=24000;

export function nativeExecTimeout(elapsedMs){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw new RangeError('Invalid elapsed diagnostic time');
  const timeout=Math.floor(NATIVE_EXEC_BUDGET_MS-elapsedMs);
  if(timeout<1)throw new RangeError('Native diagnostic budget exhausted');
  // Nonnegative elapsed time bounds this positive integer to 24000ms.
  return timeout;
}
