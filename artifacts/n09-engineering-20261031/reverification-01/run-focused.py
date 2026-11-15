"""Fresh synthetic N09 verification. Never overwrites original N09/N11 evidence."""
from pathlib import Path
import os,json,subprocess,tempfile,time,signal,shutil,resource
root=Path('artifacts/n09-engineering-20261031/reverification-01');(root/'executed').mkdir()
scratch=Path(tempfile.mkdtemp(prefix='astra-n09-reverify-'))
command=['node','--experimental-vm-modules','--test','--test-isolation=none','tests/n09.test.mjs','tests/n09-evaluation.test.mjs','tests/scenario-demo.test.mjs','tests/monitoring-integrity.test.mjs']
environment=dict(os.environ,TMPDIR=str(scratch),ASTRA_N09_EVIDENCE=str(root/'executed'))
def rss(pid):
    total=0
    try:
        for line in Path(f'/proc/{pid}/status').read_text().splitlines():
            if line.startswith('VmRSS:'):total=int(line.split()[1])*1024
        for child in Path(f'/proc/{pid}/task/{pid}/children').read_text().split():total+=rss(int(child))
    except (FileNotFoundError,ProcessLookupError,PermissionError):pass
    return total
def disk():
    total=0
    try:
        for f in scratch.rglob('*'):
            try:
                if f.is_file() and not f.is_symlink():total+=f.stat().st_size
            except FileNotFoundError:pass
    except FileNotFoundError:pass
    return total
start=time.monotonic();samples=[];timed_out=False;process=None
try:
    with (root/'qa-focused.txt').open('wb') as log:
        process=subprocess.Popen(command,env=environment,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        while process.poll() is None:
            samples.append({'seq':len(samples)+1,'elapsed_ms':(time.monotonic()-start)*1000,'sampled_tree_RSS_bytes':rss(process.pid),'scratch_logical_bytes':disk()})
            if time.monotonic()-start>180:
                timed_out=True;os.killpg(process.pid,signal.SIGKILL);break
            time.sleep(.25)
        code=process.wait();remaining=disk()
finally:
    if process is not None and process.poll() is None:os.killpg(process.pid,signal.SIGKILL);process.wait()
    shutil.rmtree(scratch)
receipt={'command':command,'exit_code':code,'duration_ms':(time.monotonic()-start)*1000,'samples':len(samples),'max_sampled_tree_RSS_bytes':max((s['sampled_tree_RSS_bytes'] for s in samples),default=0),'child_kernel_max_RSS_KiB':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,'max_sampled_scratch_logical_bytes':max((s['scratch_logical_bytes'] for s in samples),default=0),'scratch_bytes_before_cleanup':remaining,'scratch_removed':not scratch.exists(),'timed_out':timed_out,'new_browser_launches':0,'N16_native_starts':0,'Qwen_inference':0,'external_acquisition':0,'limitations':'Observed250ms samples and kernel child high-water, not hard RSS/disk caps or target-hardware acceptance. No N16 resource allowance reused.'}
(root/'resource-samples.json').write_text(json.dumps(samples,indent=2)+'\n');(root/'resources.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2));raise SystemExit(code)
