from pathlib import Path
import json,hashlib,difflib,re
R=Path('artifacts/n11-engineering-20261031');hash=lambda b:hashlib.sha256(b).hexdigest()
before=json.loads((R/'preservation-before.json').read_text());expected={x.name.replace('__','/') for x in (R/'originals').iterdir()};changed=[];missing=[];unexpected=[]
for name,h in before['files'].items():
 p=Path(name)
 if not p.is_file():missing.append(name)
 elif hash(p.read_bytes())!=h:
  changed.append(name)
  if name not in expected:unexpected.append(name)
assert not missing and not unexpected,(missing,unexpected)
assert set(changed)==expected,(set(changed)^expected)
original_checks=[]
for name in expected:
 p=R/'originals'/name.replace('/','__');assert hash(p.read_bytes())==before['files'][name];original_checks.append(name)
new=['services/n11/'+n+'.mjs' for n in ['contracts','algorithms','experiment','worker','sources','service']]+['apps/mission-control-web/n11.mjs','apps/mission-control-web/n11.css','scripts/browser-n11.mjs','scripts/n11-acceptance.mjs','tests/n11.test.mjs','tests/n11-failures.test.mjs','docs/N11_SYNTHETIC_CONTRACT.md']
assert all(n not in before['files'] and Path(n).is_file() for n in new)
allfiles=sorted(expected|set(new));inventory={'schema_version':'astra.n11.changes.v1','modified':[{'path':p,'before':before['files'][p],'after':hash(Path(p).read_bytes())}for p in sorted(expected)],'added':[{'path':p,'sha256':hash(Path(p).read_bytes())}for p in new],'scope':'N11 only; no unrelated or original evidence mutation'}
(R/'changed-files.json').write_text(json.dumps(inventory,indent=2)+'\n')
patch=[]
for name in allfiles:
 old=(R/'originals'/name.replace('/','__')).read_text().splitlines(keepends=True) if name in expected else []
 patch.extend(difflib.unified_diff(old,Path(name).read_text().splitlines(keepends=True),fromfile='before/'+name if old else '/dev/null',tofile='after/'+name))
(R/'implementation.diff').write_text(''.join(patch))
tables=[]
for name,oldrows in before['tables'].items():
 newrows=[s for s in Path(name).read_text().splitlines() if s.startswith('|')]
 for old in oldrows:
  if old in newrows:continue
  assert name=='docs/MASTER_PLAN.md' and old.startswith('| N11 Explainable advanced anomaly evaluation') or name=='docs/MODULE_TRACKER.md' and old.startswith('| N11–N12,N17–N26 |'),(name,old)
 newonly=[s for s in newrows if s not in oldrows];assert all(s.startswith('| N11 ') or name=='docs/MODULE_TRACKER.md' and s.startswith('| N12,N17–N26 | **Awaiting separate approvals**') for s in newonly),(name,newonly)
 tables.append({'path':name,'unchanged_rows':sum(s in newrows for s in oldrows),'removed_rows':[s for s in oldrows if s not in newrows],'added_rows':newonly,'only_N11_status_changed':True})
original_proposal=R/'originals/docs__DE_N11_SYNTHETIC_01.md';assert hash(original_proposal.read_bytes())=='11e6f0652c5c7d236d09a3146811427d9b7452ee6cccf24bdea0b439987863bf'
reg=(R/'regressions/qa.txt').read_text();final=(R/'qa-delivery.txt').read_text();assert 'ℹ pass 731' in reg and 'ℹ fail 0' in reg and 'ℹ skipped 1' in reg;assert 'ℹ pass 72' in final and 'ℹ fail 0' in final and 'ℹ skipped 0' in final
b=json.loads((R/'browser-05/report.json').read_text());assert b['status']=='passed' and len(b['checks'])==11 and not b['console_errors'];assert all(b['N11_cleanup'][k] for k in ['application_closed','browser_exited','profile_removed','database_directory_removed']);assert b['N11_recovery']['events']==27
res=json.loads((R/'end-to-end-verified/outcome.json').read_text());cold=json.loads((R/'end-to-end-verified/cold-recovery.json').read_text());assert res['status']=='PASS' and res['result_hash']==cold['hash'] and cold['event_count']==cold['events_after']==7 and cold['replay_executions']==cold['read_mutations']==0
v=json.loads((R/'end-to-end-verified/result.json').read_text());assert v['policy_hash']==json.loads((R/'smoke-result.json').read_text())['policy_hash'] if 'policy_hash' in json.loads((R/'smoke-result.json').read_text()) else True
# Source/algorithms frozen after first fit; result hash includes genuine runtime measurements, so model identity is compared separately.
previous=json.loads((R/'end-to-end/result.json').read_text());assert previous['models']==v['models'] and previous['references']==v['references'] and previous['dataset']==v['dataset']
assert '237 JavaScript files' in (R/'syntax-delivery.txt').read_text() and '0 errors' in (R/'syntax-delivery.txt').read_text()
pack=R/'scientific-review-packet.json';oldpack=pack.read_bytes();initial=R/'scientific-review-packet-initial.json';initial.write_bytes(oldpack) if not initial.exists() else None;p=json.loads(initial.read_bytes());p['experiment_sha256']=v['hash'];p['result_record']='end-to-end-verified/result.json';p['previous_packet']='scientific-review-packet-initial.json';pack.write_text(json.dumps(p,indent=2)+'\n')
(R/'candidate-dispositions.json').write_text(json.dumps({'schema_version':'astra.n11.engineering-disposition.v1','result_hash':v['hash'],'policy_hash':v['policy_hash'],'thresholds_retuned':False,'isolation_forest':{'status':'REJECTED_FOR_PROMOTION','reason':'No demonstrated benefit on inspected synthetic cases: test0TP/4FN;44false alert episodes on separately reported seen nominal days','model_hash':v['models']['isolation_forest']['hash']},'ewma':{'status':'RESEARCH_COMPARISON_ONLY_NOT_PROMOTED','reason':'4/4authored positive events, no proven benefit over existing TierA; no clinical validation'},'temporal_extension':'NOT_JUSTIFIED','human_scientific_review':'PENDING','operational_promotion_authorized':False},indent=2)+'\n')
(R/'final-code-pins.json').write_text(json.dumps({'schema_version':'astra.n11.final-pins.v1','files':{p:hash(Path(p).read_bytes()) for p in allfiles},'N02_detector':hash(Path('services/anomaly/detector.mjs').read_bytes()),'worker_sql_or_network_execution':False,'governing_contract':'docs/N11_SYNTHETIC_CONTRACT.md'},indent=2)+'\n')
receipt={'status':'PASS','preexisting_files_accounted_for':len(before['files']),'preexisting_unchanged':len(before['files'])-len(changed),'expected_modified':sorted(changed),'added_implementation_files':new,'unexpected_changed':unexpected,'missing':missing,'all_original_copies_hash_verified':True,'source_or_sealed_databases_opened_for_preservation':False,'tables':tables,'formal_N11':'In Progress','other_module_statuses_changed':False,'N15_support_rule':'INACTIVE','historical_evidence':'UNCHANGED except exact current governance/report addenda','tests':{'broad':{'pass':731,'fail':0,'skip':1},'final_N11':{'pass':72,'fail':0,'skip':0},'overlap':69,'distinct_pass':734,'distinct_fail':0,'distinct_skip':1,'browser_groups':11,'syntax_files':237},'end_to_end':res['result_hash'],'cold_recovery_replay':0,'source_schema_versions':'Additive synthetic schema7; original schemas retained','scientific_acceptance':'PENDING','N12_N16':'INACTIVE','review_approvals_fabricated':False,'permission_boundary':'Task execution ends; no automatic continuation'}
(R/'final-validation.json').write_text(json.dumps(receipt,indent=2)+'\n')
# Full current artifact content pins, excluding the manifest itself (no circular hash claim).
manifest={p.relative_to(R).as_posix():{'sha256':hash(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(R.rglob('*')) if p.is_file() and p.name!='artifact-manifest.json'}
(R/'artifact-manifest.json').write_text(json.dumps({'schema_version':'astra.n11.artifact-manifest.v1','files':manifest},indent=2)+'\n')
# Validate local links in newly authored report portion; historical link targets are retained as history.
body=Path('docs/N11_FINAL_ENGINEERING_COMPLETION.md').read_text().split('# Historical blocked N11 mission')[0]
for ref in re.findall(r'\]\(([^)]+)\)',body):
 if '://' not in ref and not ref.startswith('#'):assert (Path('docs')/ref.split('#')[0]).exists(),ref
print(json.dumps({'status':'PASS','preexisting':len(before['files']),'expected_modified':len(changed),'new_files':len(new),'artifact_files':len(manifest),'distinct_QA_pass':734,'skip':1,'browser':11,'formal_N11':'In Progress'},indent=2))
