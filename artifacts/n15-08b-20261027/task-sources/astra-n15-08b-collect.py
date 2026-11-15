from pathlib import Path
import hashlib,json,os,shutil
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve()
pointer=json.loads(Path('/tmp/astra-n15-08b-root.json').read_text());root=Path(pointer['control']);out=Path(pointer['artifacts'])
def read(path):return json.loads(path.read_text())
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def save(name,data):
 with (out/name).open('x') as f:json.dump(data,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
copied=0
def copy(source,dest):
 global copied
 assert source.is_file() and not source.is_symlink() and source.stat().st_size<5000000,source
 copied+=source.stat().st_size;assert copied<50000000
 dest.parent.mkdir(parents=True,exist_ok=True)
 with source.open('rb') as a,dest.open('xb') as b:shutil.copyfileobj(a,b);b.flush();os.fsync(b.fileno())
 assert sha(source)==sha(dest)
assert (root/'run-reservation.json').exists()
for source in sorted(root.iterdir()):
 if source.is_file():copy(source,out/'control'/source.name)
cases=[]
for name in ['supported','unsupported']:
 raw=root/(name+'-raw-cli-answer.json')
 if not raw.exists():cases.append({'case_id':name,'status':'NOT_RUN'});continue
 answer=read(raw);caseRoot=Path(answer['evidence_directory'])
 assert caseRoot.parent==Path('/var/tmp') and caseRoot.name.startswith('astra-n15-06-') and not caseRoot.is_symlink()
 for source in sorted(caseRoot.rglob('*')):
  rel=source.relative_to(caseRoot)
  if source.is_file() and not source.is_symlink() and not any(part in {'work','tmp','home','cache'} for part in rel.parts):copy(source,out/name/rel)
 r=read(caseRoot/'runtime/report.json') if (caseRoot/'runtime/report.json').exists() else {}
 n=read(caseRoot/'runtime/generation/native-result.json') if (caseRoot/'runtime/generation/native-result.json').exists() else {}
 result=read(root/(name+'-result.json')) if (root/(name+'-result.json')).exists() else None
 samples=[json.loads(line) for line in (caseRoot/'runtime/resources.jsonl').read_text().splitlines() if line.strip()] if (caseRoot/'runtime/resources.jsonl').exists() else []
 rss=[json.loads(line) for line in (caseRoot/'runtime/generation/native-RSS.jsonl').read_text().splitlines() if line.strip()] if (caseRoot/'runtime/generation/native-RSS.jsonl').exists() else []
 gap=lambda rows,key:max((b[key]-a[key] for a,b in zip(rows,rows[1:])),default=None)
 cases.append({'case_id':name,'source_evidence_directory':str(caseRoot),'runtime_status':r.get('status'),
  'native_commands':r.get('native_commands',0),'native_exit_code':n.get('exit_code'),'raw_model_output':n.get('stdout'),
  'outcome':result['outcome'] if result else None,'performance':r.get('generation',{}).get('performance'),
  'native_wall_s':n.get('release_to_wrapper_exit_s'),'first_stdout_s':n.get('first_stdout_s'),
  'native_sampled_VmHWM_bytes':n.get('native_post_release_sampled_VmHWM_peak_bytes'),
  'kernel_command_tree_RSS_bytes':n.get('kernel_process_tree_peak_RSS_bytes'),
  'resources':r.get('resources'),'observer_lifecycle':r.get('observer_lifecycle'),'accounting_failures':r.get('accounting_failures'),
  'providers':n.get('providers'),'Haswell_backend_initialized':n.get('Haswell_backend_initialized'),
  'supervisor_observations':len(samples),'supervisor_max_sample_gap_s':gap(samples,'elapsed_s'),
  'native_RSS_observations':len(rss),'native_RSS_max_sample_gap_s':gap(rss,'release_elapsed_s'),
  'controller_elapsed_ms':answer.get('elapsed_ms'),'controller_peak_RSS_bytes':answer.get('controller_peak_RSS_bytes'),
  'network_attempts':answer.get('network_attempts')})
qualified=(root/'summary.json').exists() and all(c.get('runtime_status')=='PASS' for c in cases)
discrimination=qualified and cases[0]['outcome']['outcome']=='supported_selection' and cases[1]['outcome']['outcome']=='correct_abstention'
positive=qualified and cases[0]['outcome']['outcome']=='supported_selection'
attempts=sum(c.get('native_commands',0) for c in cases)
assessment={'task':'N15-08B','outcome':'PASS_FOR_TWO_SEEN_CASES' if discrimination else ('PARTIAL' if attempts else 'BLOCKED'),
 'execution_qualification':'PASS' if qualified else 'FAILED_OR_INCOMPLETE','native_generation_attempts':attempts,
 'discrimination_demonstrated_on_two_seen_cases':discrimination,'cases':cases,
 'positive_live_quotation_gate':'ONE_TECHNICAL_CASE_PASSED' if positive else 'OPEN',
 'independent_review':'pending; no fresh-held-out, scientific, clinical or production claim',
 'prompt_policy':'astra.n15-08.prompt.v1','network_acquisition':0,'downloads':0,'N15':'In Progress','N16':'Not Started'}
save('assessment.json',assessment)
before=read(root/'preservation-before.json');fixture='tests/n15-prompt-controller.test.mjs'
for group in ['source','history']:
 for name,expected in before[group].items():
  if group=='source' and name==fixture:continue
  s=(p/name).stat();assert {'size':s.st_size,'mtime_ns':s.st_mtime_ns}==expected,(group,name)
for name,digest in before['pins'].items():
 if name!=fixture:assert sha(p/name)==digest,name
audit=read(root/'vm-binding-audit.json');assert sha(p/fixture)==audit['fixture_sha256'];assert sha(root/'driver.mjs')==audit['driver_sha256']
for name,expected in before['external'].items():
 f=Path(name);s=f.stat();assert {'size':s.st_size,'mtime_ns':s.st_mtime_ns,'sha256':sha(f)}==expected,name
save('preservation.json',{'status':'PASS','existing_source_data_files_size_mtime':len(before['source'])-1,
 'intentional_QA_fixture_change':fixture,'fixture_sha256':sha(p/fixture),
 'historical_artifact_files_size_mtime':len(before['history']),'protected_existing_hashes_unchanged':len(before['pins'])-1,
 'original_artifact_hashes':before['external'],'originals_unchanged':True,'production_controller_source_changes':0,
 'old_N15_08_and_N15_08A_results':'unchanged; new fresh execution under N15-08B',
 'copied_evidence_bytes':copied})
copy(p/fixture,out/'sources'/'tests__n15-prompt-controller.test.mjs.txt')
for path in ['/tmp/astra-n15-08b-prepare.py','/tmp/astra-n15-08b-stage.py','/tmp/astra-n15-08b-preflight.py',__file__]:copy(Path(path),out/'task-sources'/Path(path).name)
print(json.dumps({'outcome':assessment['outcome'],'execution_qualification':assessment['execution_qualification'],
 'native_attempts':attempts,'discrimination':discrimination,
 'cases':[{'case_id':c['case_id'],'outcome':c.get('outcome',{}).get('outcome') if c.get('outcome') else c.get('status'),
 'raw':c.get('raw_model_output'),'wall_s':c.get('native_wall_s'),'RSS':c.get('native_sampled_VmHWM_bytes')} for c in cases],
 'source_files_preserved':len(before['source'])-1,'history_files_preserved':len(before['history'])},indent=2))
