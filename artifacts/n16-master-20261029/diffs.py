"""Hash-verified source reconstruction and exact review diffs; no SQL/source-data reads."""
from pathlib import Path
import hashlib,json,difflib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n16-master-20261029'
before=json.loads((OUT/'preservation-before.json').read_text())
newfiles=['services/agent/master-contract.mjs','services/agent/master-worker.mjs','services/agent/master-coordinator.mjs',
 'services/agent/master-storage.mjs','services/agent/master-supervisor.mjs','scripts/n16-master-demo.mjs',
 'tests/n16-master.test.mjs','tests/n16-checker.test.mjs','docs/N16_MASTER_CONTRACT.md','docs/N16_MASTER_COMPLETION_REPORT.md']
current=(ROOT/'scripts/check.mjs').read_text()
old=current.replace("import * as vm from 'node:vm';\n\n// Parse real module requests, not import-looking text inside test fixtures.\n// Constructing an unlinked module never executes application code.\nif (!vm.SourceTextModule) {\n  const child = spawnSync(process.execPath, ['--experimental-vm-modules', fileURLToPath(import.meta.url)], {stdio:'inherit'});\n  process.exit(child.status ?? 1);\n}\n","")
start=old.index('  if (!result.status) {');end=old.index("\n}\nfor (const doc",start)
legacy=r'''  for (const match of readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
    if (!existsSync(resolve(dirname(file), match[1]))) { errors++; console.error('PLACEHOLDER'); }
  }
  for (const match of readFileSync(file, 'utf8').matchAll(/from\s+['"]\/shared\/([^'"]+)['"]/g)) {
    if (!existsSync(resolve(root, 'packages', match[1]))) { errors++; console.error('SHARED_PLACEHOLDER'); }
  }'''
legacy=legacy.replace("'PLACEHOLDER'",chr(96)+"Missing import: "+"$"+"{file} -> "+"$"+"{match[1]}"+chr(96))
legacy=legacy.replace("'SHARED_PLACEHOLDER'",chr(96)+"Missing shared browser import: "+"$"+"{match[1]}"+chr(96))
old=old[:start]+legacy+old[end:]
assert hashlib.sha256(old.encode()).hexdigest()==before['files']['scripts/check.mjs']
(OUT/'scripts-check.original.txt').write_text(old)
def diff(a,b,p):return ''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='before/'+p,tofile='after/'+p))
changes=diff(old,current,'scripts/check.mjs')
for p in newfiles:changes+=diff('',(ROOT/p).read_text(),p)
(OUT/'implementation.diff.txt').write_text(changes)
(OUT/'governance.diff.txt').write_text(''.join(diff(old,(ROOT/p).read_text(),p) for p,old in before['governance'].items()))
(OUT/'changed-files.json').write_text(json.dumps({'new_source_and_test_files':newfiles[:8],
 'new_documentation':newfiles[8:],'modified_existing_executable':['scripts/check.mjs'],
 'governance_updates':list(before['governance']),
 'artifact_root':'artifacts/n16-master-20261029',
 'original_checker_reconstruction':'Known parser-only diff reversed; exact pre-mission SHA-256 matches.'},indent=2)+'\n')
print(json.dumps({'source_and_test_files_new':8,'existing_executable_files_changed':1,'diff_bytes':len(changes.encode())}))
