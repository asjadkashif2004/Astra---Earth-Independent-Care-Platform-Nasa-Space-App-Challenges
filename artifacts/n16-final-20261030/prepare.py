"""Freeze original source/history and stage output-isolated compatibility tests."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n16-final-20261030'
OUT.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
original=OUT/'originals';original.mkdir(exist_ok=True)
files={}
for base in ['services','scripts','tests','apps','packages','docs']:
 for p in (ROOT/base).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.md','.json','.css','.html','.py'}:
   if p.name=='N16_FINAL_ENGINEERING_CONTRACT.md':continue
   key=str(p.relative_to(ROOT));files[key]=sha(p.read_bytes())
   if key.startswith(('services/agent/master-','scripts/n16-master','tests/n16-master')) or key=='docs/N16_MASTER_COMPLETION_REPORT.md':
    (original/key.replace('/','__')).write_bytes(p.read_bytes())
for d in (ROOT/'artifacts').glob('n16-*'):
 if d==OUT:continue
 for p in d.rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.json','.jsonl','.md','.txt','.mjs','.py','.html'}:files[str(p.relative_to(ROOT))]=sha(p.read_bytes())
gov=['AGENTS.md','docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md','docs/SESSION_HANDOFF.md','docs/DECISIONS.md','docs/FEATURE_AUDIT.md','docs/DE_N16_DESIGNATED_READ_01.md']
files['AGENTS.md']=sha((ROOT/'AGENTS.md').read_bytes())
(OUT/'preservation-before.json').write_text(json.dumps({'files':files,'governance':{p:(ROOT/p).read_text() for p in gov},
 'tables':{p:[x for x in (ROOT/p).read_text().splitlines() if x.startswith('|')] for p in gov}},indent=2)+'\n')
compat=OUT/'compat';compat.mkdir(exist_ok=True)
prior=ROOT/'artifacts/n16-master-20261029/compat'
for p in prior.glob('*.test.mjs'):
 text=p.read_text().replace('/artifacts/n16-master-20261029/compat/','/artifacts/n16-final-20261030/compat/')
 (compat/p.name).write_text(text)
(compat/'resource').mkdir(exist_ok=True)
(compat/'resource/n16-quality-qualification.mjs.original.txt').write_bytes((prior/'resource/n16-quality-qualification.mjs.original.txt').read_bytes())
(OUT/'native').mkdir(exist_ok=True)
print(json.dumps({'protected_files':len(files),'originals':len(list(original.iterdir())),'native_startups':0}))
