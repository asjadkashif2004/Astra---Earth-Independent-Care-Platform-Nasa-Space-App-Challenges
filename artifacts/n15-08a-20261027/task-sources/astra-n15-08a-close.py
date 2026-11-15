from pathlib import Path
from urllib.parse import unquote
import hashlib,json,os,re,shutil,stat,sys
sys.dont_write_bytecode=True
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve();sys.path.insert(0,str(p/'scripts'))
import n15_probe_accounting as accounting
pointer=json.loads(Path('/tmp/astra-n15-08a-root.json').read_text());root=Path(pointer['control']);out=Path(pointer['artifacts'])
def read(path):return json.loads(path.read_text())
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def save(path,data):
 with path.open('x') as f:json.dump(data,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
def copy(source,dest):
 assert source.is_file() and not source.is_symlink() and source.stat().st_size<5000000,source
 dest.parent.mkdir(parents=True,exist_ok=True)
 with source.open('rb') as a,dest.open('xb') as b:shutil.copyfileobj(a,b);b.flush();os.fsync(b.fileno())
 assert sha(source)==sha(dest)
qa=read(out/'qa-results.json');assert qa['status']=='FAIL' and qa['passed']==112 and qa['failed']==4
assert not (root/'run-reservation.json').exists() and not (root/'experiment-overlay.json').exists()
assert not list(root.glob('*-reservation.json'))
save(root/'STOPPED.json',{'task':'N15-08A','status':'BLOCKED_QA','passed':112,'failed':4,'native_requests':0,
 'reason':'Mandatory controller controls fail; further VM Buffer dependency gap identified read-only',
 'candidate_original_sha256':'eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401',
 'no_post_failure_fix_or_retry':True,'resource_authority':'expires at blocked delivery'})
for source in sorted(root.iterdir()):
 if source.is_file():copy(source,out/'control'/source.name)
for name in ['/tmp/astra-n15-08a-prepare.py','/tmp/astra-n15-08a-stage.py',__file__]:copy(Path(name),out/'task-sources'/Path(name).name)
fixture='tests/n15-prompt-controller.test.mjs';copy(p/fixture,out/'sources'/'tests__n15-prompt-controller.test.mjs.txt')
before=read(root/'preservation-before.json')
for group in ['source','history']:
 for name,expected in before[group].items():
  s=(p/name).stat();assert {'size':s.st_size,'mtime_ns':s.st_mtime_ns}==expected,(group,name)
for name,digest in before['pins'].items():assert sha(p/name)==digest,name
for name,expected in before['external'].items():
 f=Path(name);s=f.stat();assert {'size':s.st_size,'mtime_ns':s.st_mtime_ns,'sha256':sha(f)}==expected,name
correction=read(root/'correction.json');assert sha(p/fixture)==correction['fixture_sha256']
assert sha(root/'driver.mjs')==correction['driver_sha256']
docs=['AGENTS.md','docs/SESSION_HANDOFF.md','docs/MODULE_TRACKER.md','docs/MASTER_PLAN.md','docs/FEATURE_AUDIT.md',
 'docs/DECISIONS.md','docs/DE_N14_N15_01.md','docs/N15_01_PLAN.md','docs/CORE_AI_PRIORITY.md',
 'docs/N15_08A_PLAN.md','docs/N15_08A_COMPLETION.md']
links=0
for name in docs:
 f=p/name;text=f.read_text();assert 'N15-08A' in text,name
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
  target=target.strip('<>')
  if re.match(r'^(https?://|mailto:|#)',target):continue
  target=unquote(target.split('#',1)[0])
  if target:assert (f.parent/target).exists(),(name,target)
  links+=1
tracker=(p/'docs/MODULE_TRACKER.md').read_text()
for value in ['| N15 Offline language-model assistance | **In Progress;',
 '| N04 Cinematic Mission Control | **Complete**','| N03 Frontend correctness | **Partial**',
 '| AC-20 | **Open / Unverified;','| N05 Anatomical assets and renderer foundation | **In Progress — Deferred**',
 '| N06 Data-linked anatomical interaction | **Not Started — Deferred**']:
 assert value in tracker,value
assert len(set(re.findall(r'\bN(?:0[1-9]|1[0-9]|2[0-6])\b',(p/'docs/MASTER_PLAN.md').read_text())))==26
stage=read(p/'artifacts/n15-07b-20261027/control/storage-preflight.json');roots=[Path(x) for x in stage['roots']]
for pattern in ['astra-n15-05-*','astra-n15-06-*']:
 for f in Path('/var/tmp').glob(pattern):
  if f.is_dir() and not f.is_symlink() and f not in roots:roots.append(f)
for f in [out,p/'artifacts/n15-07b-20261027',p/'artifacts/n15-08-20261027']:
 if f not in roots:roots.append(f)
a=b=0
for directory in roots:
 x,y=accounting.disk_usage(directory);a+=x;b+=y;s=directory.lstat();a+=s.st_size;b+=s.st_blocks*512
 for parent,dirs,files in os.walk(directory,followlinks=False):
  for name in dirs+files:
   s=(Path(parent)/name).lstat()
   if stat.S_ISLNK(s.st_mode):a+=s.st_size;b+=s.st_blocks*512
identity=read(p/'artifacts/n15-04c-20261027/infer/native-identity-manifest.json')
extra=[p/name for name in before['pins']]+[p/fixture]+[Path(r['source']) for r in identity['native_files']+identity['notices']]
for f in extra:s=f.stat();a+=s.st_size;b+=s.st_blocks*512
assert max(a,b)<1350000000,(a,b)
save(out/'assessment.json',{'task':'N15-08A','outcome':'BLOCKED_QA','timer_interface_fix':'confirmed; no unref TypeError',
 'mandatory_QA':{'total':116,'passed':112,'failed':4},'remaining_fixture_gap':'VM does not supply Buffer',
 'live_cases':{'supported':'NOT_RUN','unsupported':'NOT_RUN'},'native_commands':0,'model_loading':0,'generations':0,
 'downloads':0,'network':0,'native_timing_RSS_tokens':'NOT_MEASURED','returned_quotations':0,'returned_citations':0,
 'discrimination':'NOT_EVALUATED','positive_live_quotation_gate':'OPEN','N15':'In Progress','N16':'Not Started',
 'candidate_original_sha256':'eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401',
 'resource_authority':'expires at blocked delivery; no unused-request continuation'})
save(out/'preservation.json',{'status':'PASS','existing_source_data_files_size_mtime':len(before['source']),
 'historical_artifact_files_size_mtime':len(before['history']),'protected_existing_hashes':len(before['pins']),
 'new_fixture_sha256':sha(p/fixture),'existing_source_changes':0,'new_QA_source_files':[fixture],
 'original_artifacts':before['external'],'documents':len(docs),'local_links':links,'module_ids':26,
 'model_prompt_grammar_N14_baselines':'unchanged'})
save(out/'delivery-accounting.json',{'status':'PASS','apparent_bytes':a,'allocated_bytes':b,'ceiling':1500000000,
 'watermark':1350000000,'method':'conservative related roots plus pinned files; overlaps overcounted',
 'native_commands':0,'network':0,'downloads':0,'native_RSS':'NOT_MEASURED','hard_quota_claim':False})
files=[{'path':str(f.relative_to(out)),'bytes':f.stat().st_size,'sha256':sha(f)}
 for f in sorted(out.rglob('*')) if f.is_file() and f.name!='evidence-manifest.json']
save(out/'evidence-manifest.json',{'task':'N15-08A','files':files})
print(json.dumps({'outcome':'BLOCKED_QA','mandatory_passed':112,'mandatory_failed':4,'native_commands':0,
 'source_preserved':len(before['source']),'history_preserved':len(before['history']),
 'protected_hashes':len(before['pins']),'documents':len(docs),'local_links':links,
 'allocated_bytes':b,'evidence_files':len(files)},indent=2))
