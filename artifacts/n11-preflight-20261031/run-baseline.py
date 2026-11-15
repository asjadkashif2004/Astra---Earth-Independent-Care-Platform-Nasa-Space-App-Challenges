"""Run only approved existing tests/fresh synthetic instances; never evaluate.py or native N16 suites."""
from pathlib import Path
import subprocess,os,time,json,tempfile,shutil,signal,resource

root=Path('artifacts/n11-preflight-20261031')
scratch=Path(tempfile.mkdtemp(prefix='astra-n11-baseline-'))
command=['node','--experimental-vm-modules','--test','--test-isolation=none',
 'artifacts/n11-preflight-20261031/preflight.test.mjs','tests/foundation.test.mjs',
 'tests/monitoring-integrity.test.mjs','tests/telemetry-integrity.test.mjs',
 'tests/n09-evaluation.test.mjs','tests/n07-local.test.mjs','tests/n10.test.mjs']
environment=dict(os.environ,TMPDIR=str(scratch))
started=time.monotonic();samples=[];max_rss=max_disk=0;timed_out=False
def sample_tree(pid):
    total=0
    try:
        for line in Path(f'/proc/{pid}/status').read_text().splitlines():
            if line.startswith('VmRSS:'):total=int(line.split()[1])*1024
        children=Path(f'/proc/{pid}/task/{pid}/children').read_text().split()
        for child in children:total+=sample_tree(int(child))
    except (FileNotFoundError,ProcessLookupError,PermissionError):pass
    return total
def bytes_used():
    return sum(f.stat().st_size for f in scratch.rglob('*') if f.is_file() and not f.is_symlink())
try:
    with (root/'qa-baseline.txt').open('wb') as log:
        process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,env=environment,start_new_session=True)
        while process.poll() is None:
            rss=sample_tree(process.pid);disk=bytes_used();max_rss=max(max_rss,rss);max_disk=max(max_disk,disk)
            samples.append({'seq':len(samples)+1,'elapsed_ms':(time.monotonic()-started)*1000,'sampled_tree_RSS_bytes':rss,'scratch_logical_bytes':disk})
            if time.monotonic()-started>180:
                timed_out=True;os.killpg(process.pid,signal.SIGKILL);break
            time.sleep(.25)
        code=process.wait()
    final_scratch=bytes_used()
finally:
    shutil.rmtree(scratch)
duration=(time.monotonic()-started)*1000
(root/'resource-samples.json').write_text(json.dumps(samples,indent=2)+'\n')
(root/'resources.json').write_text(json.dumps({'command':command,'exit_code':code,'duration_ms':duration,'samples':len(samples),'max_sampled_tree_RSS_bytes':max_rss,'child_kernel_max_RSS_KiB':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,'max_sampled_scratch_logical_bytes':max_disk,'scratch_bytes_before_cleanup':final_scratch,'scratch_removed':not scratch.exists(),'timed_out':timed_out,'N11_training_or_candidate_execution':0,'N16_native_starts':0,'Qwen_inference':0,'external_requests':0,'scope':'Existing baseline tests and four artifact-only boundary checks; not N11 qualification','limitations':'250ms samples can miss peaks; kernel child high-water is not simultaneous whole-tree usage; no hard RSS/disk or hardware performance claim'},indent=2)+'\n')
print(json.dumps({'exit_code':code,'duration_ms':duration,'samples':len(samples),'scratch_removed':not scratch.exists()}))
raise SystemExit(code)
