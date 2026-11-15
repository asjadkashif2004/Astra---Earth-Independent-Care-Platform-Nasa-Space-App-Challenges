from pathlib import Path
import json,os,re,resource,signal,subprocess,time
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n08-final-20261030';SCRATCH=Path('/tmp/astra-n08-preflight-20261030');SCRATCH.mkdir(mode=0o700,exist_ok=True)
suites=['artifacts/n08-final-20261030/baseline-controls.test.mjs','tests/n07-local.test.mjs','tests/scientific-acquisition.test.mjs','tests/osdr-metadata.test.mjs',
 'tests/bidmc-acquisition.test.mjs','tests/sleep-edf-acquisition.test.mjs','tests/telemetry-integrity.test.mjs','tests/monitoring-integrity.test.mjs','tests/foundation.test.mjs']
cmd=['node','--experimental-vm-modules','--test','--test-isolation=none',*suites]
def usage(pid):
 result=[]
 def visit(p):
  try:
   s=Path('/proc',str(p),'status').read_text();m=re.search(r'^VmRSS:\s+(\d+) kB',s,re.M)
   result.append({'pid':p,'rss_bytes':int(m[1])*1024 if m else 0})
   for child in Path('/proc',str(p),'task',str(p),'children').read_text().split():visit(int(child))
  except (FileNotFoundError,ProcessLookupError):pass
 visit(pid);return result
def disk():
 total=0
 for parent,dirs,files in os.walk(SCRATCH,followlinks=False):
  for p in [Path(parent),*[Path(parent)/f for f in files]]:
   s=p.lstat();total+=max(s.st_size,s.st_blocks*512)
 return total
started=time.monotonic();rows=[]
with (OUT/'qa-baseline.txt').open('x') as log,(OUT/'resources.jsonl').open('x') as journal:
 child=subprocess.Popen(cmd,cwd=ROOT,env={**os.environ,'TMPDIR':str(SCRATCH)},stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 while True:
  processes=usage(child.pid);row={'seq':len(rows)+1,'elapsed_ms':(time.monotonic()-started)*1000,'processes':processes,'tree_rss_bytes':sum(p['rss_bytes'] for p in processes),'scratch_counted_bytes':disk()}
  rows.append(row);journal.write(json.dumps(row)+'\n');journal.flush();os.fsync(journal.fileno())
  if child.poll() is not None:break
  if time.monotonic()-started>180:
   os.killpg(child.pid,signal.SIGTERM)
   try:child.wait(timeout=5)
   except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
   raise RuntimeError('Bounded baseline QA deadline; no N08 PASS inferred')
  time.sleep(.25)
text=(OUT/'qa-baseline.txt').read_text();counts={}
for key in ['tests','pass','fail','cancelled','skipped']:
 m=re.search(r'ℹ '+key+r' (\d+)',text);counts[key]=int(m[1]) if m else None
result={'scope':'EXISTING_SOURCE_AND_SECURITY_BASELINE_ONLY_NOT_N08_ACCEPTANCE','command':cmd,'exit_code':child.returncode,'counts':counts,
 'elapsed_ms':(time.monotonic()-started)*1000,'samples':len(rows),'maximum_sampled_tree_RSS_bytes':max(r['tree_rss_bytes'] for r in rows),
 'child_kernel_maxRSS_bytes':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss*1024,'maximum_sampled_scratch_counted_bytes':max(r['scratch_counted_bytes'] for r in rows),
 'scratch_remaining':sorted(p.name for p in SCRATCH.iterdir()),'N08_feature_implementation':False,'N08_browser_and_waveform_qualification':'NOT RUN',
 'new_external_requests':0,'N16_native_workers':0,'models':0,'operational_or_sealed_database_access':0,
 'resource_limits':'180s finite regression batch; sampled/kernel observations, not hard RSS/disk limits or expired N16 allowance.',
 'database_scope':'Existing in-memory/fresh temporary tests only; no running ASTRA API or operational DB.'}
(OUT/'qa-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(child.returncode)
