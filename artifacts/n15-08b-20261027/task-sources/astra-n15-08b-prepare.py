from pathlib import Path
import hashlib,json,os,tempfile
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve()
out=p/'artifacts/n15-08b-20261027';out.mkdir(exist_ok=False)
root=Path(tempfile.mkdtemp(prefix='astra-n15-06-n15-08b-control-',dir='/var/tmp'));root.chmod(0o700)
Path('/tmp/astra-n15-08b-root.json').write_text(json.dumps({'control':str(root),'artifacts':str(out)})+'\n')
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def save(name,data):
 with (root/name).open('x') as f:json.dump(data,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
prior=json.loads((p/'artifacts/n15-08a-20261027/control/preservation-before.json').read_text());pins=dict(prior['pins'])
fixture='tests/n15-prompt-controller.test.mjs';expected=json.loads((p/'artifacts/n15-08a-20261027/preservation.json').read_text())['new_fixture_sha256']
assert sha(p/fixture)==expected;pins[fixture]=expected
with (root/'fixture-before.mjs.txt').open('xb') as f:f.write((p/fixture).read_bytes())
candidate_path=p/'artifacts/n15-08-20261027/control/blocked-candidate.json'
assert sha(candidate_path)=='eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401'
for name,digest in pins.items():assert sha(p/name)==digest,name
for name in ['artifacts/n15-08a-20261027/control/driver.mjs','artifacts/n15-08a-20261027/qa-results.json']:
 pins[name]=sha(p/name)
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
save('preservation-before.json',{'source':source,'history':history,'pins':pins,'external':external})
save('candidate.json',json.loads(candidate_path.read_text()))
save('authorization.json',{'task':'N15-08B','storage':1500000000,'stop_watermark':1350000000,'process_RSS':2000000000,
 'native_s_per_request':120,'requests':2,'CPU_only':True,'network':0,'downloads':0,
 'scope':'Explicit safe VM dependency bindings and QA, conditional exact frozen N15-08 two-case diagnostic',
 'protocol':'N15-06 execution mode/scratch retained; actual authority/resources are N15-08B only'})
save('artifact-preflight.json',{'status':'PASS','originals':external,'native_files':17,'notice_files':14,
 'old_candidate_sha256':sha(candidate_path),'native_execution':0,'network':0,'downloads':0})
print(json.dumps({'status':'PASS','control':str(root),'source_files':len(source),'history_files':len(history),'before_pins':len(pins)}))
