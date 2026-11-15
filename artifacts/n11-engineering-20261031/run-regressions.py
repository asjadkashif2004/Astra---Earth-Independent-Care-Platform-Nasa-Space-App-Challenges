import os,json,time,tempfile,subprocess,pathlib,shutil,signal
out=pathlib.Path('artifacts/n11-engineering-20261031/regressions');out.mkdir(exist_ok=True)
root=tempfile.mkdtemp(prefix='astra-n11-regressions-');env=os.environ.copy();env['TMPDIR']=root
for mod in ['N11','N09','N08','N10']:
 p=out/mod.lower();p.mkdir(exist_ok=True);env['ASTRA_'+mod+'_EVIDENCE']=str(p.resolve())
files=['n11','n11-failures','n09','n09-evaluation','n08','n08-frontend','n10','n10-frontend','sleep-lifecycle','web','telemetry-integrity','monitoring-integrity','frontend-correctness','scenario-demo','integration','foundation','intelligence','n16-trace-view','n07-local','scientific-acquisition','osdr-metadata','bidmc-acquisition','sleep-edf-acquisition','research-relevance','claim-assessment']
cmd=['node','--experimental-vm-modules','--test','--test-isolation=none']+['tests/'+s+'.test.mjs' for s in files]
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
  lines=pathlib.Path(f'/proc/{pid}/status').read_text().splitlines();rss=next((int(s.split()[1])*1024 for s in lines if s.startswith('VmRSS:')),0)
  found.append({'pid':pid,'rss':rss})
  for child in pathlib.Path(f'/proc/{pid}/task/{pid}/children').read_text().split():found+=processes(int(child))
 except (FileNotFoundError,ProcessLookupError):pass
 return found
start=time.monotonic();samples=[];timeout=False
with (out/'qa.txt').open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env,start_new_session=True)
 while p.poll() is None:
  samples.append({'elapsed_ms':(time.monotonic()-start)*1000,'processes':processes(p.pid),'scratch_bytes':size(root),'task_artifact_bytes':size(out.parent)})
  if time.monotonic()-start>180:timeout=True;os.killpg(p.pid,signal.SIGTERM);break
  time.sleep(.1)
 try:p.wait(timeout=5)
 except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
remaining=list(pathlib.Path(root).iterdir());shutil.rmtree(root)
receipt={'command':cmd,'exit_code':p.returncode,'timeout':timeout,'elapsed_ms':(time.monotonic()-start)*1000,'samples':len(samples),'maximum_sampled_tree_RSS':max((sum(x['rss'] for x in s['processes']) for s in samples),default=0),'max_scratch_bytes':max((s['scratch_bytes'] for s in samples),default=0),'max_participating_artifact_bytes':max((s['task_artifact_bytes'] for s in samples),default=0),'leftovers_before_cleanup':[x.name for x in remaining],'scratch_removed':not pathlib.Path(root).exists(),'limitations':'100ms samples of process trees; native threads share process RSS. No hard whole-process or disk quota, no target-device/AC20 guarantee. Explicit suites only; no N16 native suite or Qwen.'}
(out/'samples.json').write_text(json.dumps(samples,indent=2));(out/'resources.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2));raise SystemExit(p.returncode or (1 if timeout else 0))
