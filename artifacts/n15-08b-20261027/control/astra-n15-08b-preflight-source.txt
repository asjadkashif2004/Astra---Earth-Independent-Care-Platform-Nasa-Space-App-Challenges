from pathlib import Path
import hashlib,json,os,shutil,stat,sys
sys.dont_write_bytecode=True
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve();sys.path.insert(0,str(p/'scripts'))
import n15_probe_accounting as accounting
pointer=json.loads(Path('/tmp/astra-n15-08b-root.json').read_text());root=Path(pointer['control'])
def read(path):return json.loads(path.read_text())
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def save(name,data):
 with (root/name).open('x') as f:json.dump(data,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
before=read(root/'preservation-before.json');audit=read(root/'vm-binding-audit.json')
fixture='tests/n15-prompt-controller.test.mjs'
for name,digest in before['pins'].items():
 if name!=fixture:assert sha(p/name)==digest,name
assert sha(p/fixture)==audit['fixture_sha256'];assert sha(root/'driver.mjs')==audit['driver_sha256']
qa=read(p/'artifacts/n15-08b-20261027/qa-results.json');assert qa['status']=='PASS' and qa['failed']==0 and qa['skipped']==0
assert qa['focused_tests']==119
for name,expected in before['external'].items():
 f=Path(name);s=f.stat();assert {'size':s.st_size,'mtime_ns':s.st_mtime_ns,'sha256':sha(f)}==expected,name
identity=read(p/'artifacts/n15-04c-20261027/infer/native-identity-manifest.json')
for row in identity['native_files']+identity['notices']:assert sha(Path(row['source']))==row['sha256'],row['source']
assert read(root/'candidate.json')==read(p/'artifacts/n15-08-20261027/control/blocked-candidate.json')
save('support-pins.json',{fixture:sha(p/fixture)})
save('qa-results.json',qa)
for path in [Path('/tmp/astra-n15-08b-prepare.py'),Path('/tmp/astra-n15-08b-stage.py'),Path(__file__)]:
 with (root/(path.stem+'-source.txt')).open('xb') as f:f.write(path.read_bytes());f.flush();os.fsync(f.fileno())
stage=read(p/'artifacts/n15-07b-20261027/control/storage-preflight.json');roots=[Path(x) for x in stage['roots']]
for pattern in ['astra-n15-05-*','astra-n15-06-*']:
 for f in Path('/var/tmp').glob(pattern):
  if f.is_dir() and not f.is_symlink() and f not in roots:roots.append(f)
for name in ['artifacts/n15-07b-20261027','artifacts/n15-08-20261027','artifacts/n15-08a-20261027','artifacts/n15-08b-20261027']:
 if p/name not in roots:roots.append(p/name)
a=b=0
for directory in roots:
 x,y=accounting.disk_usage(directory);a+=x;b+=y;s=directory.lstat();a+=s.st_size;b+=s.st_blocks*512
 for parent,dirs,files in os.walk(directory,followlinks=False):
  for name in dirs+files:
   s=(Path(parent)/name).lstat()
   if stat.S_ISLNK(s.st_mode):a+=s.st_size;b+=s.st_blocks*512
extra=[p/name for name in before['pins']]+[Path(r['source']) for r in identity['native_files']+identity['notices']]
for f in extra:s=f.stat();a+=s.st_size;b+=s.st_blocks*512
assert max(a,b)<1350000000,(a,b)
mounts=[]
for line in Path('/proc/self/mountinfo').read_text().splitlines():
 fields=line.split();sep=fields.index('-');target=fields[4]
 if str(root)==target or str(root).startswith(target.rstrip('/')+'/'):mounts.append((len(target),target,fields[sep+1],fields[sep+2]))
mount=max(mounts);assert mount[2] not in {'tmpfs','ramfs'}
assert shutil.disk_usage(root).free>50000000
save('storage-preflight.json',{'status':'PASS','apparent_bytes':a,'allocated_bytes':b,'watermark':1350000000,'ceiling':1500000000,
 'roots':[str(x) for x in roots],'method':'conservative related roots plus pinned files; overlaps overcounted',
 'filesystem':{'mount':mount[1],'type':mount[2],'source':mount[3]},'network':0,'downloads':0})
save('post-QA-artifact-preflight.json',{'status':'PASS','verified_originals':4,'native_files':17,'notice_files':14,
 'baseline_candidate':'byte-equivalent data; original preserved','fixture_only_source_change':fixture,'mandatory_QA':119,
 'native_execution':0,'actual_sandbox':'blocked worker view must pass before each release'})
print(json.dumps({'status':'PASS','QA':119,'allocated_bytes':b,'filesystem':mount[2],'native_execution':0}))
