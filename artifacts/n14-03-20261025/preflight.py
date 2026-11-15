import json,hashlib,base64,tarfile,urllib.parse,os,sys,time,resource
from pathlib import Path
root=Path(sys.argv[1]);project=Path(sys.argv[2]);runtime=Path(sys.argv[3]);model=Path(sys.argv[4]);prior=Path('/var/tmp/astra-n14-direct-choice-b-EKjLmaoj');started=time.monotonic()
def observer():
    s=json.loads((root/'observer.json').read_text())
    if s['stop'] or time.time()*1000-s['timestamp_ms']>2500:raise RuntimeError('Resource observer stale/stopped')
graph=json.loads((project/'data/research/n14-01/components.json').read_text())['runtime_graph'];records=[]
for p in graph:
    observer();archive=prior/'payload/acquired'/(urllib.parse.quote(p['name']+'@'+p['version'],safe="~()*!.'-")+'.tgz')
    with archive.open('rb') as f:actual='sha512-'+base64.b64encode(hashlib.file_digest(f,'sha512').digest()).decode()
    installed=runtime/p['name'];package=json.loads((installed/'package.json').read_text())
    if actual!=p['integrity'] or package['version']!=p['version']:raise RuntimeError('Runtime identity/integrity mismatch '+p['name'])
    count=0
    with tarfile.open(archive,'r:gz') as t:
        for member in t:
            if not member.isfile():continue
            rel=Path(member.name).relative_to('package')
            if '..' in rel.parts:raise RuntimeError('Unsafe package member')
            target=installed/rel
            with target.open('rb') as f:sha=hashlib.file_digest(f,'sha256').digest()
            if sha!=hashlib.file_digest(t.extractfile(member),'sha256').digest():raise RuntimeError('Installed member mismatch '+p['name']+'/'+str(rel))
            count+=1
    records.append({'package':p['name'],'version':p['version'],'sri_matches':True,'installed_members_checked':count})
if len(graph)!=30:raise RuntimeError('Frozen runtime graph differs')
files=json.loads((project/'data/research/n14-01/components.json').read_text())['model']['files'];model_records=[]
for row in files:
    observer();rel=Path(row['name']).relative_to('model');p=model/rel
    with p.open('rb') as f:h=hashlib.file_digest(f,'sha256').hexdigest()
    if h!=row['sha256'] or p.stat().st_size!=row['bytes']:raise RuntimeError('Model/support mismatch '+str(rel))
    model_records.append({'file':str(rel),'sha256':h,'bytes':p.stat().st_size})
observer()
result={'status':'PASS','runtime':records,'model':model_records,'network_bytes':0,'network_ms':0,'installs':0,'model_inference':False,'elapsed_ms':round((time.monotonic()-started)*1000),'peak_rss_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024}
with (root/'preflight.json').open('x') as f:json.dump(result,f,indent=2);f.flush();os.fsync(f.fileno())
