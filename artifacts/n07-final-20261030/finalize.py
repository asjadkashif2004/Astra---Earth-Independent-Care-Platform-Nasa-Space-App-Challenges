"""File-only N07 closure. No SQL, app, worker, network or model startup."""
from pathlib import Path
import json,hashlib,re,difflib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n07-final-20261030'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
canonical=lambda v:json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
digest=lambda v:hashlib.sha256(canonical(v)).hexdigest()
def save(name,v):(OUT/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
baseline=load(OUT/'preservation-before.json');allowed={'AGENTS.md',*[f'docs/{n}.md' for n in ['MASTER_PLAN','MODULE_TRACKER','CORE_AI_PRIORITY','FEATURE_AUDIT','DECISIONS','SESSION_HANDOFF']]}
changed=[];unchanged=[]
for name,pin in baseline['files'].items():
 p=ROOT/name;assert p.is_file() and not p.is_symlink(),name
 h=sha(p)
 if h==pin:unchanged.append(name)
 else:assert name in allowed,name;changed.append({'path':name,'before_sha256':pin,'after_sha256':h})
assert {r['path'] for r in changed}==allowed
table_receipt={}
for name,rows in baseline['tables'].items():
 current=[l for l in (ROOT/name).read_text().splitlines() if l.startswith('|')]
 keep=lambda x:[l for l in x if not l.startswith('| N07 ')]
 assert keep(rows)==keep(current),name
 table_receipt[name]={'non_N07_rows_unchanged':len(keep(rows)),'N07_before':[l for l in rows if l.startswith('| N07 ')],'N07_after':[l for l in current if l.startswith('| N07 ')]}
save('table-preservation.json',table_receipt)
new=[]
for base in ['services','apps','packages','scripts','tests','docs','data/scientific']:
 for p in (ROOT/base).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.md','.py','.json','.jsonl','.csv','.txt','.pdf','.bin','.f32','.css','.html'}:
   name=str(p.relative_to(ROOT))
   if name not in baseline['files']:new.append({'path':name,'sha256':sha(p)})
expected_new={*[f'services/acquisition/{n}.mjs' for n in ['local-source','evidence-card','grouped-split','local-bundle','local-inventory']],
 'scripts/n07-local.mjs','tests/n07-local.test.mjs','tests/fixtures/n07.mjs','data/scientific/n07-local-registry.json',
 'docs/N07_LOCAL_ENGINEERING_CONTRACT.md','docs/N07_FINAL_ENGINEERING_COMPLETION.md'}
assert {r['path'] for r in new}==expected_new,new
diff=[];snap=OUT/'final-files';snap.mkdir(exist_ok=True)
for row in changed:
 name=row['path'];original=OUT/'originals'/name.replace('/','__');assert sha(original)==row['before_sha256'],name
 diff.extend(difflib.unified_diff(original.read_text().splitlines(True),(ROOT/name).read_text().splitlines(True),fromfile='before/'+name,tofile='after/'+name))
for row in new:diff.extend(difflib.unified_diff([],(ROOT/row['path']).read_text().splitlines(True),fromfile='/dev/null',tofile='after/'+row['path']))
for row in changed+new:(snap/row['path'].replace('/','__')).write_bytes((ROOT/row['path']).read_bytes())
(OUT/'implementation.diff.txt').write_text(''.join(diff));save('changed-files.json',{'modified_existing_governance':changed,'new_source_registry_contract_report':new,'old_executable_changes':[],
 'artifact_inventory':'evidence-manifest.json','diff':'implementation.diff.txt','source_snapshots':'final-files'})
qa=load(OUT/'qa-summary.json');assert qa['counts']==dict(tests=422,**{'pass':421,'fail':0,'cancelled':0,'skipped':1}) and qa['exit_code']==0
final_test=(OUT/'qa-local-final.txt').read_text();assert 'ℹ tests 92' in final_test and 'ℹ pass 92' in final_test and 'ℹ fail 0' in final_test and 'ℹ skipped 0' in final_test
assert '212 JavaScript files' in (OUT/'qa-syntax-final.txt').read_text() and '0 errors.' in (OUT/'qa-syntax-final.txt').read_text()
samples=[json.loads(l) for l in (OUT/'resources.jsonl').read_text().splitlines()]
assert [r['seq'] for r in samples]==list(range(1,len(samples)+1)) and len(samples)==qa['samples']
assert max(r['sampled_tree_rss_bytes'] for r in samples)==qa['maximum_sampled_tree_rss_bytes']
assert qa['scratch_remaining']==[] and list(Path('/tmp/astra-n07-final-campaign').iterdir())==[]
accepted=load(OUT/'accepted-build.json');recovery=load(OUT/'cold-cli-recovery.json');assert accepted['reused'] is False
for r in [accepted,recovery]:assert r['status']=='VERIFIED_COMMITTED_BUNDLE' and r['source_count']==3 and r['replayed_acquisitions']==0 and r['scientific_approval'] is False
assert accepted['manifest_sha256']==recovery['manifest_sha256']
bundle=OUT/'accepted'/('bundle-'+accepted['manifest_sha256']);manifest=load(bundle/'manifest.json');assert digest(manifest)==accepted['manifest_sha256']
assert set(p.name for p in bundle.iterdir())==set(manifest['files'])|{'manifest.json'}
registry=load(ROOT/'data/scientific/n07-local-registry.json');source_map={r['id']:r for r in registry['sources']}
assert sha(ROOT/'data/scientific/n07-local-registry.json')=='acfc8ea25598be0941835ef61a533ebf2728c13786b12baede04f39039720d66'
for entry in source_map.values():
 for spec in entry['files'].values():assert sha(ROOT/spec['path'])==spec['sha256']
cards=[]
for name,spec in manifest['files'].items():
 p=bundle/name;assert p.stat().st_size==spec['bytes'] and sha(p)==spec['sha256'],name
 if name.endswith('.card.json'):
  card=load(p);cards.append(card);original=(ROOT/source_map[card['id']]['files']['original']['path']).read_bytes()
  assert card['original']['sha256']==hashlib.sha256(original).hexdigest()
  assert card['support']=={'attribution':'VERIFIED','question_relevance':'UNASSESSED','numeric_claim':'UNVERIFIED','population_applicability':'UNASSESSED','clinical_use':False}
  for entry in card['annotation_history']:
   assert entry['review_status']=='PENDING';assert entry['hash']==digest({k:v for k,v in entry.items() if k!='hash'})
   span=entry['annotation']['span'];assert original[span['start_byte']:span['end_byte']].decode()==span['literal']
  packet=load(bundle/(card['id']+'.review.json'));assert packet['card_sha256']==digest(card)
  assert all(v is None for v in packet['reviewer'].values()) and all(v is None for v in packet['owner_acceptance'].values())
  d=load(bundle/(card['id']+'.descriptor.json'));assert d['runtime_integration']=='INACTIVE' and d['raw_measurements'] is None and d['clinical_conclusion'] is None
assert len(cards)==3
split=load(OUT/'synthetic-split.json');assign={r['id']:r['partition'] for r in split['manifest']['assignments']}
assert split['manifest']['counts']=={'train':7,'validation':2,'test':3} and split['manifest']['scientific_validation'] is False
assert split['manifest']['input_sha256']==digest(sorted(split['units'],key=lambda u:u['id']))
for key in ['subject','session','scenario','source_id','source_sha256','content_sha256']:
 seen={}
 for u in split['units']:
  assert u['synthetic'] is True
  if u[key] in seen:assert seen[u[key]]==assign[u['id']]
  seen[u[key]]=assign[u['id']]
rows=[
 ('Trusted exact-source allowlist','PASS','Source registration and arbitrary-path/URL rejection','None within shipped foundation'),
 ('Source identity/version/date','PARTIAL','Pinned version/date metadata and honest unavailable fields','Required remaining actual source identities/releases'),
 ('Source-specific rights and attribution','PARTIAL','Retained exact rights/notice verification','Unacquired exact-source rights/use records'),
 ('Original bytes/hash/receipt integrity','PASS','Full three-original/manifest/approval/progress verification','No claim that unavailable sample bytes exist'),
 ('Bounded resumable cache','PASS','Unchanged cache/range/abort/prefix/promotion controls and new atomic bundles','General endpoint resume/power-loss certification not established'),
 ('Small BIDMC physiological sample','PASS','Retained full01numerics,481rows,notice/card','Waveforms not part of this accepted numerics slice; N08 remains'),
 ('Small Sleep-EDF sample','BLOCKED','Existing exact streaming/EDF/annotation mechanics tested','Complete pinned PSG+hypnogram and fresh acquisition authority'),
 ('Small PTT-PPG sample','BLOCKED','Unknown-source rejection and explicit unavailable inventory','Exact approved file/rights/size/time/bytes'),
 ('Generic OSDR study metadata','PASS','OSD-1 full nonhuman aggregate/card verified','No replacement of named studies or raw omics'),
 ('Named OSD-575/656 provenance','BLOCKED','Explicit catalogue-only identities; no substitution','Both exact authorized metadata records/use reviews'),
 ('RadLab metadata','BLOCKED','Historical failures preserved; no guessed payload/hash','Compact official source/rights/complete bytes approval'),
 ('Reviewable cards and domain limits','PARTIAL','3newstructural cards,2legacy cards and blank packets verified','Cards for missing actual source families'),
 ('Subject/time split independence','PARTIAL','Deterministic grouped/chronological mechanics qualified on12fictional units','Real patient/experimental identity/target/grouping/partition evidence'),
 ('Full multi-source reproducibility','PARTIAL','3original offline intake-to-card-to-bundle/recovery/rebuild','Complete required source inventory and full-source rebuild'),
 ('Public/nonclinical/synthetic boundary','PASS','Opaque local scope, no raw-row/crew/medical descriptor export','No clinical validity or live-source claim'),
 ('Honest unavailable-source reporting','PASS','A/B/C/D/E inventory and no acquisition/retry/promotion','Keep source failures open rather than fabricate evidence')]
matrix=[]
for i,(name,status,implemented,missing) in enumerate(rows,1):
 matrix.append({'authoritative_requirement_id':'N07 / R36,R51-R54,R67 / original N07_03_REVIEW clause '+str(i),'description':name,
  'current_implementation':implemented,'missing_work':missing,'input_source':'Three frozen local N07 originals; related N13 inventory only; explicit fictional split fixtures where stated',
  'output_artifact':'Pinned local registry, source-inventory-final.json, accepted bundle, synthetic-split.json as applicable',
  'provenance_requirements':'Exact retained approval/receipt/original SHA/version/use; no inferred source facts or human approvals',
  'validation_criteria':'Original contracts +92N07 controls and independent final file checks; actual source gates stay open',
  'integration_requirements':'Inactive research descriptor only; no downstream runtime or operational UI',
  'governance_authority':'Current owner consolidated local-source N07 mission; N01 Complete; no new acquisition/exception',
  'dependency_review_requirements':'Original N07 source/independence gates and all downstream/scientific/release conditions retained',
  'acceptance_evidence':['qa-summary.json','qa-local-final.txt','accepted-build.json','cold-cli-recovery.json','source-inventory-final.json'],
  'final_status':status,'engineering_scope':'Completed for currently authorized retained sources/fictional mechanics; external inputs are not fabricated'})
assert sum(r['final_status']=='PASS' for r in matrix)==7
save('requirement-matrix.json',matrix)
history=[n for n in unchanged if n.startswith(('artifacts/n07-','artifacts/n10-','artifacts/n16-'))]
save('historical-preservation.json',{'count':len(history),'files':{n:baseline['files'][n] for n in history},'unchanged':True,'sealed_database':'Not opened or rehashed'})
save('final-code-pins.json',{row['path']:sha(ROOT/row['path']) for row in new})
for doc in [ROOT/r['path'] for r in new+changed if r['path'].endswith('.md')]:
 original=OUT/'originals'/str(doc.relative_to(ROOT)).replace('/','__');old=set(re.findall(r'\]\(([^)]+)\)',original.read_text())) if original.exists() else set()
 for link in set(re.findall(r'\]\(([^)]+)\)',doc.read_text()))-old:
  if link.startswith(('https:','http:','#')):continue
  target=link.split('#')[0]
  if target and not (doc.parent/target).exists():assert target.endswith('final-validation.json'),(str(doc),link)
storage=[p for p in OUT.rglob('*') if p.is_file() and not p.is_symlink()]
save('mission-state.json',{'status':'DELIVERED_CLOSED','authority':'One consolidated local N07 engineering campaign only; permission expires at delivery.',
 'new_source_requests':0,'Qwen_calls':0,'N16_native_worker_startups':0,'operational_or_sealed_database_access':0,'next_module_started':False})
save('final-validation.json',{'outcome':'ENGINEERING COMPLETE WITH EXTERNAL GATES','formal_N07':'In Progress','acceptance_rows':16,'fully_satisfied':7,'partial_external_rows':5,'blocked_source_rows':4,
 'new_N07_controls':92,'combined_passed':421,'combined_failed':0,'combined_skipped':1,'skip_reason':'No accepted complete real Sleep-EDF pair',
 'final_affected_passed':92,'final_affected_failed':0,'syntax_files':212,'syntax_errors':0,
 'new_source_cards_validated':3,'retained_dataset_cards_validated':2,'actual_independent_scientific_approvals':0,
 'synthetic_split_units':12,'synthetic_partitions':{'train':7,'validation':2,'test':3},'real_split_assignments':0,
 'verified_bundle_manifest':accepted['manifest_sha256'],'cold_replayed_acquisitions':0,
 'baseline_files':len(baseline['files']),'unchanged_files':len(unchanged),'intended_modified_governance_files':len(changed),'old_executable_changes':0,
 'new_source_registry_contract_report_files':len(new),'historical_evidence_files_unchanged':len(history),'all_non_N07_status_rows_unchanged':True,
 'artifact_logical_bytes_before_final_manifest':sum(p.stat().st_size for p in storage),
 'source_permissions_mounts_operational_database_N16_worker_model_changes':0,'external_requests_installs_downloads':0,
 'limitations':'See report: sampled resources, OS sync acknowledgement, Linux-only fd boundary, no clinical/independent scientific/full-source clearance.',
 'manifest':'evidence-manifest.json','self_exclusion':'Manifest excludes itself and its digest sidecar; no circular hashing.'})
manifest={str(p.relative_to(OUT)):{'sha256':sha(p),'bytes':p.stat().st_size} for p in OUT.rglob('*') if p.is_file() and not p.is_symlink() and p.name not in {'evidence-manifest.json','evidence-manifest.sha256'}}
save('evidence-manifest.json',manifest);(OUT/'evidence-manifest.sha256').write_text(sha(OUT/'evidence-manifest.json')+'  evidence-manifest.json\n')
print(json.dumps(load(OUT/'final-validation.json'),indent=2))
