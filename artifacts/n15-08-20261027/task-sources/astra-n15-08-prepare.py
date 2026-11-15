from pathlib import Path
import hashlib,json,os,tempfile
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve()
out=p/'artifacts/n15-08-20261027';out.mkdir(exist_ok=False)
root=Path(tempfile.mkdtemp(prefix='astra-n15-06-n15-08-control-',dir='/var/tmp'));root.chmod(0o700)
Path('/tmp/astra-n15-08-root.json').write_text(json.dumps({'control':str(root),'artifacts':str(out)})+'\n')
def save(name,value):
 with (root/name).open('x') as f:json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
prior=json.loads((p/'artifacts/n15-07b-20261027/control/preservation-before.json').read_text())
for name,digest in prior['pins'].items():assert sha(p/name)==digest,name
external={}
for name,expected in prior['external'].items():
 f=Path(name);s=f.stat();actual={'size':s.st_size,'mtime_ns':s.st_mtime_ns,'sha256':sha(f)}
 assert actual==expected,name
 external[name]=actual
identity=json.loads((p/'artifacts/n15-04c-20261027/infer/native-identity-manifest.json').read_text())
for row in identity['native_files']+identity['notices']:assert sha(Path(row['source']))==row['sha256'],row['source']
source={};history={}
for dirname in ['apps','services','packages','scripts','tests','data','research']:
 for f in (p/dirname).rglob('*'):
  if f.is_file() and not f.is_symlink() and '__pycache__' not in f.parts:
   s=f.stat();source[str(f.relative_to(p))]={'size':s.st_size,'mtime_ns':s.st_mtime_ns}
for name in ['package.json','package-lock.json']:
 f=p/name;s=f.stat();source[name]={'size':s.st_size,'mtime_ns':s.st_mtime_ns}
for f in (p/'artifacts').rglob('*'):
 if out not in f.parents and f.is_file() and not f.is_symlink():
  s=f.stat();history[str(f.relative_to(p))]={'size':s.st_size,'mtime_ns':s.st_mtime_ns}
pins=dict(prior['pins'])
for name in ['artifacts/n15-07b-20261027/control/replay-overlay.json','artifacts/n15-07b-20261027/assessment.json',
 'artifacts/n15-07b-20261027/control/driver.mjs']:
 pins[name]=sha(p/name)
save('preservation-before.json',{'source':source,'history':history,'pins':pins,'external':external})
save('baseline-plan.json',json.loads((p/'artifacts/n15-07b-20261027/control/replay-overlay.json').read_text()))
save('diagnosis.json',{'phase':'read-only diagnosis completed before implementation',
 'grammar_SELECT':'PASS via unchanged grammar and strict parser for actual canonical ID',
 'literal_binding':'ACCEPT for complete actual supplied quotation via unchanged N14',
 'supported_evidence':'Direct V2 7070 requirement supplies requested accommodations',
 'unsupported_evidence':'Same passage mentions vibration qualitatively; numeric Hz answer absent from eligible units',
 'chat_frame':'system/user/assistant with two im_end markers; no demonstrated contradiction',
 'observation':'Baseline says text addresses question; does not explicitly distinguish complete direct quotation support from topical relevance',
 'root_cause':'UNPROVEN; no grammar/evidence impossibility or demonstrated formatting defect',
 'hypothesis':'Explicit direct-quotation versus related-text instructions might reduce over-abstention',
 'previous_results':'Both ABSTAIN, preserved as baseline; not independent held-out data',
 'native_requests':0,'network':0,'downloads':0})
save('authorization.json',{'task':'N15-08','storage':1500000000,'stop_watermark':1350000000,'process_RSS':2000000000,
 'native_s_per_request':120,'requests':2,'CPU_only':True,'network':0,'downloads':0,
 'scope':'Exactly one new frozen prompt policy, same supported/unsupported cases; no retries or tuning after outputs',
 'protocol':'N15-06 mode/scratch labels retained for unchanged executeLocal/runner; actual authority is N15-08 only'})
print(json.dumps({'status':'PASS','control':str(root),'source_files':len(source),'history_files':len(history),'protected_hashes':len(pins)}))
