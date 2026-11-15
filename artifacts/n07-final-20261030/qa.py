from pathlib import Path
import json,os,re,resource,signal,subprocess,time
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n07-final-20261030'
SCRATCH=Path('/tmp/astra-n07-final-campaign');SCRATCH.mkdir(mode=0o700,exist_ok=True)
COMPAT=OUT/'n10-regression';COMPAT.mkdir(exist_ok=True)
suites=['tests/n07-local.test.mjs','tests/scientific-acquisition.test.mjs','tests/osdr-metadata.test.mjs','tests/bidmc-acquisition.test.mjs','tests/sleep-edf-acquisition.test.mjs',
 'tests/n10.test.mjs','tests/n10-frontend.test.mjs','tests/sleep-lifecycle.test.mjs','tests/web.test.mjs','tests/telemetry-integrity.test.mjs','tests/monitoring-integrity.test.mjs',
 'tests/frontend-correctness.test.mjs','tests/scenario-demo.test.mjs','tests/integration.test.mjs','tests/foundation.test.mjs','tests/intelligence.test.mjs','tests/n16-trace-view.test.mjs']
cmd=['node','--experimental-vm-modules','--test','--test-isolation=none',*suites]
def disk(root):
 total=0
 for parent,dirs,files in os.walk(root,followlinks=False):
  for p in [Path(parent),*[Path(parent)/f for f in files]]:
   s=p.lstat();total+=max(s.st_size,s.st_blocks*512)
 return total
def tree(pid):
 result=[]
 def visit(p):
  try:
   text=Path('/proc',str(p),'status').read_text();m=re.search(r'^VmRSS:\s+(\d+) kB',text,re.M)
   stat=Path('/proc',str(p),'stat').read_text();birth=stat[stat.rfind(')')+2:].split()[19]
   result.append({'pid':p,'birth':birth,'rss_bytes':int(m[1])*1024 if m else 0})
   for child in Path('/proc',str(p),'task',str(p),'children').read_text().split():visit(int(child))
  except (FileNotFoundError,ProcessLookupError):pass
 visit(pid);return result
start=time.monotonic();samples=[]
with (OUT/'qa-comprehensive.txt').open('x') as log,(OUT/'resources.jsonl').open('x') as journal:
 child=subprocess.Popen(cmd,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env={**os.environ,'TMPDIR':str(SCRATCH),'ASTRA_N10_EVIDENCE':str(COMPAT)})
 while True:
  processes=tree(child.pid);row={'seq':len(samples)+1,'elapsed_ms':(time.monotonic()-start)*1000,'processes':processes,'sampled_tree_rss_bytes':sum(p['rss_bytes'] for p in processes),'scratch_counted_bytes':disk(SCRATCH)}
  samples.append(row);journal.write(json.dumps(row)+'\n');journal.flush();os.fsync(journal.fileno())
  if child.poll() is not None:break
  if time.monotonic()-start>180:
   os.killpg(child.pid,signal.SIGTERM)
   try:child.wait(timeout=5)
   except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
   raise RuntimeError('Bounded N07 QA deadline reached; no PASS claimed')
  time.sleep(.25)
text=(OUT/'qa-comprehensive.txt').read_text();counts={}
for k in ['tests','pass','fail','cancelled','skipped']:
 m=re.search(r'ℹ '+k+r' (\d+)',text);counts[k]=int(m[1]) if m else None
summary={'command':cmd,'exit_code':child.returncode,'duration_ms':(time.monotonic()-start)*1000,'counts':counts,'samples':len(samples),
 'maximum_sampled_tree_rss_bytes':max(r['sampled_tree_rss_bytes'] for r in samples),'child_kernel_maxrss_bytes':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss*1024,
 'maximum_sampled_scratch_counted_bytes':max(r['scratch_counted_bytes'] for r in samples),'scratch_remaining':sorted(p.name for p in SCRATCH.iterdir()),
 'resource_limitations':'RSS/storage sampled; fsync is OS acknowledgement, not hard quota/power-loss guarantee. No expired N16 budget applies.',
 'network_requests':0,'N16_designated_worker_startups':0,'database_access':'Only unchanged authorized memory/temp regression instances; no operational or sealed DB.',
 'N10_proof_output':'New n10-regression/ only; old acceptance untouched.'}
(OUT/'qa-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary));raise SystemExit(child.returncode)
