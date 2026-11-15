"""File-only closure: hash evidence and explicit changes; never open a database."""
from pathlib import Path
import difflib,hashlib,json,os,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n10-final-20261030'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
def save(name,value):(OUT/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
before=load(OUT/'preservation-before.json');pins=before['files']
allowed={
 'AGENTS.md','services/api/store.mjs','services/api/server.mjs','apps/mission-control-web/app.mjs',
 'apps/mission-control-web/index.html','apps/mission-control-web/sw.js','scripts/frontend-smoke.mjs',
 'scripts/browser-acceptance.mjs','tests/dom-harness.mjs','tests/sleep-lifecycle.test.mjs',
 'docs/DE_N10_SYNTHETIC_01.md','docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md',
 'docs/DECISIONS.md','docs/FEATURE_AUDIT.md','docs/SESSION_HANDOFF.md'}
changed=[];unchanged=[];failures=[]
for name,h in pins.items():
 p=ROOT/name
 if not p.is_file() or p.is_symlink():failures.append({'file':name,'error':'missing_or_symlink'});continue
 current=sha(p)
 if current==h:unchanged.append(name)
 else:
  changed.append({'path':name,'before_sha256':h,'after_sha256':current})
  if name not in allowed:failures.append({'file':name,'error':'unexpected_change'})
assert not failures,failures
assert {r['path'] for r in changed}==allowed,{'unaccounted':sorted(allowed-{r['path'] for r in changed})}
new=[]
for directory in ['services','apps','packages','scripts','tests','docs']:
 for p in (ROOT/directory).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.py','.md','.json','.jsonl','.css','.html','.pdf','.bin','.f32'}:
   name=str(p.relative_to(ROOT))
   if name not in pins:new.append({'path':name,'sha256':sha(p)})
expected_new={'services/n10/contracts.mjs','services/n10/ledger.mjs','services/n10/projection.mjs',
 'apps/mission-control-web/n10.mjs','apps/mission-control-web/n10.css','scripts/browser-n10.mjs',
 'tests/n10.test.mjs','tests/n10-frontend.test.mjs','tests/fixtures/n10.mjs',
 'docs/N10_CONTRACT.md','docs/N10_FINAL_ENGINEERING_COMPLETION.md'}
assert {r['path'] for r in new}==expected_new,new
table_evidence={}
for name,rows in before['tables'].items():
 current=[l for l in (ROOT/name).read_text().splitlines() if l.startswith('|')]
 unrelated=lambda lines:[l for l in lines if not l.startswith('| N10 ')]
 assert unrelated(rows)==unrelated(current),name
 table_evidence[name]={'non_N10_rows_unchanged':len(unrelated(rows)),'N10_before':[l for l in rows if l.startswith('| N10 ')],
  'N10_after':[l for l in current if l.startswith('| N10 ')]}
save('table-preservation.json',table_evidence)
originals=OUT/'originals'
sleep='tests/sleep-lifecycle.test.mjs';p=originals/sleep.replace('/','__')
if not p.exists():
 current=''.join(line for line in (ROOT/sleep).read_text().splitlines(keepends=True) if 'Sleep schema still recreated independently of additive N10 migration' not in line)
 candidates=[]
 # This single expected-version assertion is the only earlier test change;
 # reconstruct the preserved original only if its full original SHA matches.
 for line in current.splitlines(keepends=True):
  if '4' in line and 'assert.equal' in line:
   candidates.append(current.replace(line,line.replace(',4)',',3)').replace(', 4)',', 3)'),1))
 for candidate in candidates:
  if hashlib.sha256(candidate.encode()).hexdigest()==pins[sleep]:p.write_text(candidate);break
 assert p.exists(),'Original sleep lifecycle test must match the preserved full hash'
diffs=[]
for row in changed:
 name=row['path'];old=originals/name.replace('/','__')
 assert old.exists() and sha(old)==row['before_sha256'],name
 diffs.extend(difflib.unified_diff(old.read_text().splitlines(True),(ROOT/name).read_text().splitlines(True),fromfile='before/'+name,tofile='after/'+name))
for row in new:
 name=row['path'];diffs.extend(difflib.unified_diff([], (ROOT/name).read_text().splitlines(True),fromfile='/dev/null',tofile='after/'+name))
(OUT/'implementation.diff.txt').write_text(''.join(diffs))
snapshots=OUT/'final-files';snapshots.mkdir(exist_ok=True)
for row in changed+new:
 name=row.get('path');(snapshots/name.replace('/','__')).write_bytes((ROOT/name).read_bytes())
browser=load(OUT/'browser-04/report.json');qa=load(OUT/'final-qa/qa-summary.json')
assert browser['status']=='passed' and len(browser['checks'])==10
assert all(c['status']=='passed' for c in browser['checks']) and not browser['console_errors']
assert qa['counts']=={'tests':257,'pass':257,'fail':0,'cancelled':0,'skipped':0}
assert 'Ran 12 tests' in (OUT/'qa-evidence.txt').read_text() and (OUT/'qa-evidence.txt').read_text().rstrip().endswith('OK')
assert '204 JavaScript files' in (OUT/'qa-syntax-final.txt').read_text() and '0 errors.' in (OUT/'qa-syntax-final.txt').read_text()
budget=load(OUT/'browser-startups.json');assert len(budget['attempts'])==4
for name,h in budget['attempts'][-1]['code_pins'].items():assert sha(ROOT/name)==h,name
for i in range(1,5):
 b=load(OUT/('browser-0'+str(i))/'report.json')
 for k in ['application_closed','browser_exited','profile_removed','database_directory_removed']:assert b['N10_cleanup'][k],(i,k)
assert qa['remaining_scratch_entries']==[] and list(Path(qa['scratch_root']).iterdir())==[]
all_documents=[ROOT/r['path'] for r in changed+new if r['path'].endswith('.md')]
broken=[]
for p in all_documents:
 text=p.read_text()
 # Check newly introduced links against the original file, avoiding legacy anchors.
 orig=originals/str(p.relative_to(ROOT)).replace('/','__')
 original_links=set(re.findall(r'\]\(([^)]+)\)',orig.read_text())) if orig.exists() else set()
 for link in set(re.findall(r'\]\(([^)]+)\)',text))-original_links:
  if link.startswith(('https:','http:','#')):continue
  target=link.split('#')[0]
  if target and not (p.parent/target).exists():broken.append({'file':str(p.relative_to(ROOT)),'link':link})
# Generated closure files referenced by docs are written below.
deferred={'../artifacts/n10-final-20261030/changed-files.json','../artifacts/n10-final-20261030/final-validation.json',
 'artifacts/n10-final-20261030/final-validation.json'}
assert all(x['link'] in deferred for x in broken),broken
save('changed-files.json',{'modified_existing':changed,'created_source_contract_report':new,
 'task_artifacts':'Complete exact per-file inventory is evidence-manifest.json. Historical roots are unchanged.',
 'implementation_diff':'implementation.diff.txt','source_snapshots':'final-files'})
groups={
 'S1':('Sleep stages/day','stage intervals -> coverage/totals','S1 and malformed/overlap tests; browser stages/replay'),
 'S2':('Dated schedules','dated plan + canonical session -> actual comparison','S2 and sleep_status tests; browser dated plan/correction'),
 'S3':('Descriptive deficit','supported day plan-actual -> positive shortfall','S2/S3 quality/missing-day tests; browser seven/one-day coverage'),
 'C1':('Optional consented check-ins','grant/field scopes -> private optional observations','C1/API/legacy tests; actual browser consent/task/withdrawal'),
 'C2':('Personal task reference','at least three prior same-source/profile sessions -> versioned reference','C2 epoch/source/exclusion tests; actual fourth browser session'),
 'E1':('Exercise/workload','dated declared plan/performance -> bound history','E1/E2 contract tests; actual browser input'),
 'E2':('Adherence/movement','explicit denominator/intervals -> conservative accounting','E2 missing/partial/day-boundary tests; browser known/unknown'),
 'R1':('Synchronized replay','source and knowledge cutoff -> immutable historical projection','dual-time/no-future/correction tests and browser restart/replay'),
 'A1':('Privacy/provenance/durability','session role/crew + valid record -> atomic owned revision','API/transaction/tamper/cold recovery tests; browser self scope'),
 'V1':('Real browser/device limits','actual UI interaction -> verified inputs/results/denials','Chrome 10/10; four viewports; 12 native focus transitions; 20 trials')}
matrix=[]
for key,(description,io,tests) in groups.items():
 matrix.append({'id':key,'description':description,'inputs_outputs':io,'existing_implementation':'Original completed sleep, private task, native Store/API and Mission Control foundations retained.',
  'missing_implementation':'None in the approved synthetic contract; original external source/clinical/prerequisite gates remain.',
  'integration':'services/n10 + existing authorized synthetic application API/UI','privacy':'Trusted role/crew plus explicit optional consent; no operational/N16 source access.',
  'determinism':'Fixed validated contracts; source/knowledge cutoffs; output UNKNOWN on incomplete evidence. Task timing itself is a browser measurement.',
  'failure':'Fail closed; no invented observation or clinical conclusion; transaction/cancellation/recovery controls.',
  'QA':tests,'authority':'Owner activation of exact DE-N10-SYNTHETIC-01 and consolidated mission.',
  'closure':'PASS for synthetic engineering only','external_blocker':'N03/AC-20,N07,N09/transitive/full-review/release gates; formal N10 In Progress.'})
save('requirement-matrix.json',matrix)
historical=[n for n in unchanged if n.startswith(('artifacts/n16-','artifacts/n10-master-'))]
save('historical-preservation.json',{'count':len(historical),'files':{n:pins[n] for n in historical},'unchanged':True,
 'source_database':'Sealed N16 database not opened or rehashed; retained historical evidence only.'})
save('fixture-provenance.json',{'version':'astra.n10.synthetic-fixtures.v1','file':'tests/fixtures/n10.mjs','sha256':sha(ROOT/'tests/fixtures/n10.mjs'),
 'source':'Authored fictional software values, not scientific labels or human participation.',
 'browser_task':'Actual automated Chrome timings, separate browser_task source; no clinical interpretation.',
 'contract_sha256':sha(ROOT/'docs/N10_CONTRACT.md'),'exception_original_sha256':pins['docs/DE_N10_SYNTHETIC_01.md'],
 'original_spec_md_sha256':pins['research/ASTRA_Deep_Research.md'],'original_spec_pdf_sha256':pins['research/ASTRA_Deep_Research.pdf']})
budget['status']='DELIVERED_CLOSED';budget['unused_permission_survives']=False
save('browser-startups.json',budget)
storage=[p for p in OUT.rglob('*') if p.is_file() and not p.is_symlink()]
save('final-validation.json',{'outcome':'ENGINEERING COMPLETE','groups_implemented':10,'groups_qualified':10,'formal_N10':'In Progress',
 'baseline_pins':len(pins),'unchanged_baseline_files':len(unchanged),'intended_modified_baseline_files':len(changed),
 'new_source_contract_report_files':len(new),'unexpected_changes':failures,'historical_files_unchanged':len(historical),
 'non_N10_status_rows_unchanged':True,'automated_checks':257,'independent_file_controls':12,'actual_browser_groups':10,
 'final_failed':0,'final_skipped':0,'syntax_files':204,'browser_launches':4,'historical_failed_browser_runs_preserved':3,
 'cold_replay_count':0,'browser_recovered_records':browser['N10_recovery']['records'],'source_ledger_sha256':browser['N10_recovery']['ledger_sha256'],
 'task_artifact_logical_bytes_before_final_manifest':sum(p.stat().st_size for p in storage),
 'task_artifact_allocated_or_logical_bytes_before_final_manifest':sum(max(p.stat().st_size,p.stat().st_blocks*512) for p in storage),
 'resource_limits':'Finite local demonstration/QA bounds; sampled or kernel measurements are not hard RSS/disk/power-loss certification.',
 'operational_or_sealed_database_access':0,'N16_designated_worker_startups':0,'models':0,'downloads_installs':0,
 'N02_detector_Engine_sleep_producer_comms_N09_N16_N14_N15_unchanged':True,
 'governance':'Task-only exception delivered/expired; original dependencies/reviews remain; no other module started.',
 'cleanup':'Fresh browser apps/profiles/databases closed/removed; QA scratch empty; bounded measurement database removed.',
 'manifest':'evidence-manifest.json','self_exclusion':'Manifest excludes itself and its SHA sidecar to avoid circular hashing.'})
manifest={str(p.relative_to(OUT)): {'sha256':sha(p),'bytes':p.stat().st_size} for p in OUT.rglob('*')
 if p.is_file() and not p.is_symlink() and p.name not in {'evidence-manifest.json','evidence-manifest.sha256'}}
save('evidence-manifest.json',manifest)
(OUT/'evidence-manifest.sha256').write_text(sha(OUT/'evidence-manifest.json')+'  evidence-manifest.json\n')
print(json.dumps(load(OUT/'final-validation.json'),indent=2))
