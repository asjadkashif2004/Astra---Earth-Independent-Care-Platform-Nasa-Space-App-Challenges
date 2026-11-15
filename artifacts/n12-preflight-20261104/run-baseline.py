import json,os,pathlib,subprocess,tempfile,time,shutil,signal
out=pathlib.Path('artifacts/n12-preflight-20261104');root=tempfile.mkdtemp(prefix='astra-n12-preflight-');env=os.environ.copy();env['TMPDIR']=root
files=['foundation','intelligence','integration','telemetry-integrity','monitoring-integrity','sleep-lifecycle','web','frontend-correctness','n07-local','n09-evaluation','n10']
cmd=['node','--experimental-vm-modules','--test','--test-isolation=none']+['tests/'+s+'.test.mjs' for s in files]+[str(out/'boundaries.test.mjs')]
def size(path):
 total=0
 for p in pathlib.Path(path).rglob('*'):
  try:
   if p.is_file() and not p.is_symlink():total+=p.stat().st_size
  except FileNotFoundError:pass
 return total
def processes(pid):
 found=[]
 try:
  text=pathlib.Path(f'/proc/{pid}/status').read_text();rss=next((int(s.split()[1])*1024 for s in text.splitlines() if s.startswith('VmRSS:')),0);found.append({'pid':pid,'rss':rss})
  for child in pathlib.Path(f'/proc/{pid}/task/{pid}/children').read_text().split():found+=processes(int(child))
 except (FileNotFoundError,ProcessLookupError):pass
 return found
start=time.monotonic();samples=[];expired=False
with (out/'qa-baseline.txt').open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env,start_new_session=True)
 while p.poll() is None:
  samples.append({'elapsed_ms':(time.monotonic()-start)*1000,'processes':processes(p.pid),'scratch_bytes':size(root)})
  if time.monotonic()-start>180:expired=True;os.killpg(p.pid,signal.SIGTERM);break
  time.sleep(.1)
 try:p.wait(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
 remaining=[x.name for x in pathlib.Path(root).iterdir()];shutil.rmtree(root)
 receipt={'command':cmd,'scope':'Unchanged existing-functionality compatibility plus4artifact-only preflight checks; no N12 implementation/qualification','exit_code':p.returncode,'timeout':expired,'elapsed_ms':(time.monotonic()-start)*1000,'samples':len(samples),'maximum_sampled_tree_RSS':max((sum(x['rss'] for x in s['processes']) for s in samples),default=0),'maximum_scratch_bytes':max((s['scratch_bytes'] for s in samples),default=0),'leftovers_before_cleanup':remaining,'scratch_removed':not pathlib.Path(root).exists(),'N12_candidate_executions':0,'N11_experiment_starts':0,'N16_native_starts':0,'Qwen_inference':0,'external_acquisition':0,'limitations':'100ms process-tree samples can miss peaks; observed existing-test load, not N12 CPU/coverage qualification or a hard process/disk limit. No N16 quota transfers.'}
 (out/'resource-samples.json').write_text(json.dumps(samples,indent=2)+'\n');(out/'resources.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));raise SystemExit(p.returncode or (1 if expired else 0))
