"""Run unchanged existing regression suites in their authorized disposable scopes."""
from pathlib import Path
import json, os, re, resource, signal, subprocess, time
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/n10-master-20261030'
SCRATCH = Path('/tmp/astra-n10-master-20261030')
SCRATCH.mkdir(mode=0o700, exist_ok=True)
suites = [
    'tests/sleep-lifecycle.test.mjs', 'tests/web.test.mjs',
    'tests/telemetry-integrity.test.mjs', 'tests/monitoring-integrity.test.mjs',
    'tests/frontend-correctness.test.mjs', 'tests/scenario-demo.test.mjs',
    'tests/integration.test.mjs', 'tests/foundation.test.mjs',
    'tests/intelligence.test.mjs', 'tests/n16-trace-view.test.mjs',
]
command = ['node', '--experimental-vm-modules', '--test', '--test-isolation=none', *suites]
assert not any('designated.test' in p or 'n16-master.test' in p or 'n16-sqlite.test' in p for p in suites)
env = {**os.environ, 'TMPDIR': str(SCRATCH)}
def disk(p):
    total = 0
    for parent, dirs, files in os.walk(p, followlinks=False):
        for name in [parent, *[str(Path(parent)/f) for f in files]]:
            s = os.lstat(name)
            total += max(s.st_size, s.st_blocks * 512)
    return total
def processes(pid):
    found = []
    def visit(current):
        try:
            text = Path('/proc', str(current), 'status').read_text()
            rss = re.search(r'^VmRSS:\s+(\d+) kB', text, re.M)
            stat = Path('/proc', str(current), 'stat').read_text()
            birth = stat[stat.rfind(')')+2:].split()[19]
            found.append({'pid': current, 'birth': birth, 'RSS_bytes': int(rss.group(1))*1024 if rss else 0})
            for child in Path('/proc', str(current), 'task', str(current), 'children').read_text().split():
                visit(int(child))
        except (FileNotFoundError, ProcessLookupError):
            pass
    visit(pid)
    return found
samples = []
started = time.monotonic()
with (OUT/'qa-existing.txt').open('x') as log, (OUT/'qa-resources.jsonl').open('x') as journal:
    child = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    while True:
        members = processes(child.pid)
        row = {'seq':len(samples)+1, 'elapsed_ms':(time.monotonic()-started)*1000,
            'processes':members, 'sampled_tree_RSS_bytes':sum(p['RSS_bytes'] for p in members),
            'scratch_counted_bytes':disk(SCRATCH)}
        samples.append(row)
        journal.write(json.dumps(row)+'\n')
        journal.flush()
        os.fsync(journal.fileno())
        if child.poll() is not None:
            break
        if time.monotonic()-started > 180:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            raise RuntimeError('QA launcher deadline; not an N10 acceptance or native qualification result')
        time.sleep(.25)
duration = (time.monotonic()-started)*1000
text = (OUT/'qa-existing.txt').read_text()
counts = {}
for key in ['tests','pass','fail','cancelled','skipped']:
    match = re.search(r'ℹ '+key+r' (\d+)', text)
    counts[key] = int(match.group(1)) if match else None
result = {'scope':'UNCHANGED_BASELINE_REGRESSIONS_NOT_N10_ACCEPTANCE',
    'command':command, 'exit_code':child.returncode, 'duration_ms':duration, 'counts':counts,
    'sampled_max_tree_RSS_bytes':max(x['sampled_tree_RSS_bytes'] for x in samples),
    'child_kernel_maxrss_bytes':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss*1024,
    'sampled_max_scratch_counted_bytes':max(x['scratch_counted_bytes'] for x in samples),
    'samples':len(samples), 'scratch_root':str(SCRATCH),
    'remaining_scratch_entries':sorted(p.name for p in SCRATCH.iterdir()),
    'N16_designated_worker_startups':0, 'model_executions':0,
    'resource_limits':'Observations only. No expired N16 startup/RSS/storage authority is reused. Sampling may miss peaks.',
    'network':'Existing in-process request fixtures; no acquisition or external request initiated by this launcher.',
    'source_database_access':'Only existing isolated memory/temp regression databases; no sealed or operational database.'}
(OUT/'qa-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
raise SystemExit(child.returncode)
