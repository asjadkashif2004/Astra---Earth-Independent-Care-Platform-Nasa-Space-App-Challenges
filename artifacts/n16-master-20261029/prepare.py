"""Freeze pre-implementation code/history; stage output-only compatibility tests."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/n16-master-20261029'
def sha(b):return hashlib.sha256(b).hexdigest()
old=json.loads((ROOT/'artifacts/n16-06h-20261029/evidence-manifest.json').read_text())['files']
pins={}
for base in ['services','apps','packages','scripts','tests','docs']:
 for p in (ROOT/base).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.html','.css','.md','.json','.py'}:
   if p.name=='N16_MASTER_CONTRACT.md':continue
   pins[str(p.relative_to(ROOT))]=sha(p.read_bytes())
for dirname in (ROOT/'artifacts').glob('n16-*'):
 if dirname==OUT:continue
 for p in dirname.rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.json','.jsonl','.txt','.md','.py'}:pins[str(p.relative_to(ROOT))]=sha(p.read_bytes())
for p,h in old.items():
 current=sha((ROOT/p).read_bytes())
 if p not in {'docs/MODULE_TRACKER.md','docs/DE_N16_DESIGNATED_READ_01.md'}:assert current==h,p
 pins[p]=current
gov=['AGENTS.md','docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md','docs/SESSION_HANDOFF.md','docs/DECISIONS.md','docs/FEATURE_AUDIT.md','docs/DE_N16_DESIGNATED_READ_01.md']
if not (OUT/'preservation-before.json').exists():
 (OUT/'preservation-before.json').write_text(json.dumps({'files':pins,'governance':{p:(ROOT/p).read_text() for p in gov},
  'tables':{p:[s for s in (ROOT/p).read_text().splitlines() if s.startswith('|')] for p in gov if p!='AGENTS.md'}},indent=2)+'\n')
compat=OUT/'compat';compat.mkdir(exist_ok=True)
if (OUT/'compat-test-provenance.json').exists() and not (OUT/'compat-test-provenance-initial.json').exists():
 (OUT/'compat-test-provenance-initial.json').write_bytes((OUT/'compat-test-provenance.json').read_bytes())
 (OUT/'compat-transform-original.txt').write_bytes((compat/'n16-dependency-pins.test.mjs').read_bytes())
tests=['n16-single-select','n16-single-quality','n16-containment-qa','n16-dependency-pins','n16-resource-journal']
records=[]
for name in tests:
 p=ROOT/'tests'/f'{name}.test.mjs';text=p.read_text();original=text
 # Resolve imports relative to their ORIGINAL source, preserving runtime/fixture dependencies.
 text=re.sub(r"(?m)^(import[^\n]*?from\s+)(['\"])(\.[^'\"]+)\2",lambda m:m[1]+m[2]+(p.parent/m[3]).resolve().as_uri()+m[2],text)
 text=text.replace('import.meta.url',json.dumps(p.as_uri()))
 replacements={
  '../artifacts/n16-06g-20261029/vitals-mock-results.json':'../artifacts/n16-master-20261029/compat/vitals-mock-results.json',
  '../artifacts/n16-06g-20261029/quality-mock-results.json':'../artifacts/n16-master-20261029/compat/quality-mock-results.json',
  '../artifacts/n16-06g-20261029/vitals-qa-traces/':'../artifacts/n16-master-20261029/compat/vitals-qa-traces/',
  '../artifacts/n16-06g-20261029/quality-qa-traces/':'../artifacts/n16-master-20261029/compat/quality-qa-traces/',
  '../artifacts/n16-06a-20261029/mock-results.json':'../artifacts/n16-master-20261029/compat/containment-mock-results.json',
  '../artifacts/n16-06c-20261029/qa-controls.json':'../artifacts/n16-master-20261029/compat/pin-controls.json',
 }
 # Only literals used as output locations; assertions/read-original paths stay untouched.
 for a,b in replacements.items():text=text.replace("new URL('"+a+"',","new URL('"+b+"',")
 if name=='n16-resource-journal':
  text=text.replace("new URL('../artifacts/n16-06h-20261029/',","new URL('../artifacts/n16-master-20261029/compat/resource/',")
  d=compat/'resource';d.mkdir(exist_ok=True)
  (d/'n16-quality-qualification.mjs.original.txt').write_bytes((ROOT/'artifacts/n16-06h-20261029/n16-quality-qualification.mjs.original.txt').read_bytes())
 dst=compat/f'{name}.test.mjs';dst.write_text(text)
 records.append({'original':str(p.relative_to(ROOT)),'original_sha256':sha(original.encode()),'staged':str(dst.relative_to(ROOT)),'staged_sha256':sha(text.encode()),
 'changes':'Import/base URI resolution and QA output destinations only; assertion bodies and production files unchanged.'})
(OUT/'compat-test-provenance.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'protected_files':len(pins),'compat_suites':len(records),'native_startups':0}))
