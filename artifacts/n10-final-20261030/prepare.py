from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n10-final-20261030'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files={}
for base in ['services','apps','packages','scripts','tests','docs','models','knowledge','data/corpus','data/research','research']:
 for p in (ROOT/base).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.py','.md','.json','.jsonl','.css','.html','.pdf','.bin','.f32'}:files[str(p.relative_to(ROOT))]=sha(p)
for base in (ROOT/'artifacts').iterdir():
 if base.name.startswith(('n16-','n10-master-')):
  for p in base.rglob('*'):
   if p.is_file() and not p.is_symlink():files[str(p.relative_to(ROOT))]=sha(p)
for name in ['AGENTS.md','package.json','package-lock.json']:
 p=ROOT/name
 if p.is_file():files[name]=sha(p)
orig=OUT/'originals';orig.mkdir(exist_ok=True)
for name in ['services/api/store.mjs','services/api/server.mjs','apps/mission-control-web/app.mjs','apps/mission-control-web/index.html','apps/mission-control-web/sw.js','scripts/frontend-smoke.mjs','scripts/browser-acceptance.mjs','tests/dom-harness.mjs','docs/DE_N10_SYNTHETIC_01.md','AGENTS.md','docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md','docs/DECISIONS.md','docs/FEATURE_AUDIT.md','docs/SESSION_HANDOFF.md']:
 (orig/name.replace('/','__')).write_bytes((ROOT/name).read_bytes())
assert not (OUT/'preservation-before.json').exists()
(OUT/'preservation-before.json').write_text(json.dumps({'files':files,'tables':{p:[l for l in (ROOT/p).read_text().splitlines() if l.startswith('|')] for p in ['docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md']}},indent=2)+'\n')
print(json.dumps({'protected':len(files),'operational_or_sealed_DB_access':0}))
