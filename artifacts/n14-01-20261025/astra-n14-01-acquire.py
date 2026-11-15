import os,sys,json,time,hashlib,base64,tarfile,urllib.request,urllib.parse,socket
from pathlib import Path
root=Path(sys.argv[1]);mode=sys.argv[2]
old=Path('/var/tmp/astra-n14-direct-choice-b-EKjLmaoj');project=Path('/mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI')
revision='751bff37182d3f1213fa05d7196b954e230abad9';repo='Xenova/all-MiniLM-L6-v2';weightsha='afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1'
statefile=root/'network-state.json';state=json.loads(statefile.read_text()) if statefile.exists() else {'bytes':0,'runtime_bytes':0,'model_bytes':0,'network_ms':0,'requests':[]}
def save(name,v):
    p=root/name;t=p.with_suffix(p.suffix+'.tmp')
    with t.open('w') as f:json.dump(v,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
    t.replace(p)
def guard():
    p=json.loads((root/'observer.json').read_text())
    if p['stop'] or time.time()*1000-p['timestamp_ms']>2500:raise RuntimeError('Resource observer stopped or stale')
    if state['network_ms']>=480000:raise RuntimeError('Network deadline')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect())
def get(url,name,cap,seconds,kind='model',expected=None,git=None,body=None):
    if name in [r['name'] for r in state['requests']]:raise RuntimeError('No retries; resource already attempted')
    guard();start=time.monotonic();row={'name':name,'source':url,'started_at':time.time(),'status':'started','bytes':0,'redirects':[]};state['requests'].append(row);save('network-state.json',state)
    seconds=min(seconds,(480000-state['network_ms'])/1000)
    initial=url;dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True);partial=dest.with_suffix(dest.suffix+'.partial')
    try:
        for hop in range(4):
            guard();remaining=min(seconds-(time.monotonic()-start),(480000-state['network_ms'])/1000)
            if remaining<=0:raise RuntimeError('Transfer deadline')
            req=urllib.request.Request(url,data=body,headers={'User-Agent':'ASTRA-N14-01-bounded-research','Accept-Encoding':'identity',**({'Content-Type':'application/json'} if body else {})})
            try:response=opener.open(req,timeout=remaining)
            except urllib.error.HTTPError as e:
                if e.code not in [301,302,303,307,308]:raise
                nxt=urllib.parse.urljoin(url,e.headers['Location']);parsed=urllib.parse.urlsplit(nxt)
                if parsed.scheme!='https' or parsed.username or parsed.password:raise RuntimeError('Unsafe redirect')
                cache=parsed.hostname=='huggingface.co' and parsed.path.startswith('/api/resolve-cache/models/'+repo+'/'+revision+'/')
                cdn=parsed.hostname in ['cas-bridge.xethub.hf.co','cdn-lfs.huggingface.co','cdn-lfs-us-1.hf.co','us.aws.cdn.hf.co'] and name=='model/onnx/model_quantized.onnx' and e.headers.get('X-Linked-Etag','').strip('"')==weightsha
                if not (cache or cdn):raise RuntimeError('Unclassified model redirect '+str(parsed.hostname))
                row['redirects'].append({'host':parsed.hostname,'path':parsed.path,'linked_etag':e.headers.get('X-Linked-Etag'),'linked_size':e.headers.get('X-Linked-Size')});e.close();url=nxt;continue
            break
        else:raise RuntimeError('Redirect bound')
        declared=response.headers.get('Content-Length');encoding=response.headers.get('Content-Encoding')
        if encoding not in [None,'identity'] or declared and int(declared)>cap:raise RuntimeError('Unexpected encoding or declared bytes')
        h=hashlib.sha256();data=bytearray()
        with partial.open('xb') as f:
            while True:
                guard();remaining=seconds-(time.monotonic()-start)
                if remaining<=0:raise RuntimeError('Transfer deadline')
                response.fp.raw._sock.settimeout(remaining)
                chunk=response.read1(min(65536,cap-row['bytes']+1))
                if not chunk:break
                row['bytes']+=len(chunk);state['bytes']+=len(chunk);state[kind+'_bytes']+=len(chunk)
                if row['bytes']>cap or state['model_bytes']>30000000 or state['runtime_bytes']>300000000:raise RuntimeError('Byte ceiling')
                h.update(chunk);f.write(chunk)
                if git is not None:data.extend(chunk)
                f.flush();os.fsync(f.fileno());save('network-state.json',state)
        response.close();row['sha256']=h.hexdigest();row['content_type']=response.headers.get('Content-Type')
        if declared and row['bytes']!=int(declared):raise RuntimeError('Incomplete transfer')
        if expected and row['sha256']!=expected:raise RuntimeError('SHA256 mismatch')
        if git is not None and hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=git:raise RuntimeError('Publisher Git blob mismatch')
        partial.replace(dest);row['status']='verified_complete';return dest
    except Exception as e:row['status']='BLOCKED';row['error']=str(e);raise
    finally:
        elapsed=round((time.monotonic()-start)*1000);row['elapsed_ms']=elapsed;state['network_ms']+=elapsed;save('network-state.json',state)

def preflight():
    graph=json.loads((old/'approved.json').read_text())['graph'];lock=json.loads((old/'payload/work/package-lock.json').read_text());verified=[]
    for p in graph:
        guard();name=p['name'];archive=old/'payload/acquired'/(urllib.parse.quote(name+'@'+p['version'],safe="~()*!.'-")+'.tgz')
        sri='sha512-'+base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()
        installed=old/'payload/work/node_modules'/name
        if sri!=p['integrity'] or json.loads((installed/'package.json').read_text())['version']!=p['version'] or lock['packages']['node_modules/'+name]['integrity']!=sri:raise RuntimeError('Runtime pin/SRI mismatch '+name)
        count=0
        with tarfile.open(archive,'r:gz') as t:
            for member in t:
                if not member.isfile():continue
                rel=Path(member.name).relative_to('package');target=installed/rel
                if not target.is_file() or hashlib.file_digest(t.extractfile(member),'sha256').digest()!=hashlib.sha256(target.read_bytes()).digest():raise RuntimeError('Installed archive member mismatch '+name+'/'+str(rel))
                count+=1
        verified.append({'name':name,'version':p['version'],'integrity':sri,'files_compared':count,'license':p['license']})
    save('runtime-reverified.json',{'status':'PASS','packages':verified,'probe_report_sha256':hashlib.sha256((old/'FINAL_REPORT.json').read_bytes()).hexdigest(),'installation_reused_read_only':True})
    original={}
    for path in [project/'package.json',project/'package-lock.json',*list((project/'data/corpus').rglob('*'))]:
        if path.is_file():original[str(path.relative_to(project))]=hashlib.sha256(path.read_bytes()).hexdigest()
    save('preserved-before.json',original)
    metadata=get('https://huggingface.co/api/models/'+repo+'/revision/'+revision+'?blobs=true','publisher-model.json',65536,15)
    info=json.loads(metadata.read_text());files={p['rfilename']:p for p in info['siblings']}
    if info['sha']!=revision or info.get('cardData',{}).get('license')!='apache-2.0' or info.get('gated') not in [False,None] or info.get('private') or files['onnx/model_quantized.onnx']['size']!=22972370 or files['onnx/model_quantized.onnx']['lfs']['sha256']!=weightsha:raise RuntimeError('Model revision/rights/identity mismatch')
    approved=['README.md','config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','vocab.txt','onnx/model_quantized.onnx']
    if sum(files[k]['size'] for k in approved)>30000000:raise RuntimeError('Model budget impossible')
    # Full component notices are supporting runtime artifacts, not executable content.
    for file,cap in [('LICENSE',65536),('ThirdPartyNotices.txt',400000)]:get('https://raw.githubusercontent.com/microsoft/onnxruntime/v1.21.0/'+file,'notices/onnxruntime-'+file,cap,15,'runtime')
    get('https://raw.githubusercontent.com/huggingface/tokenizers.js/v0.2.0/LICENSE','notices/tokenizers-LICENSE',20000,15,'runtime')
    # Official Apache license copy supporting the publisher-declared model terms.
    get('https://www.apache.org/licenses/LICENSE-2.0.txt','notices/model-Apache-2.0.txt',20000,15)
    auditbody=json.dumps({p['name']:[p['version']] for p in graph},separators=(',',':')).encode()
    audit=get('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk','runtime-audit.json',1000000,15,'runtime',body=auditbody)
    advisories=json.loads(audit.read_text())
    if any(a.get('severity') in ['high','critical'] for group in advisories.values() for a in group):raise RuntimeError('Unresolved high/critical runtime advisory')
    save('model-approved.json',{k:files[k] for k in approved})
    save('preflight.json',{'status':'PASS','model_revision':revision,'expected_weight_sha256':weightsha,'model_bytes_expected':sum(files[k]['size'] for k in approved),'runtime_packages':len(verified),'audit':advisories,'model_acquired':False})
def acquire():
    specs=json.loads((root/'model-approved.json').read_text())
    if json.loads((root/'preflight.json').read_text())['status']!='PASS':raise RuntimeError('Preflight missing')
    for name,spec in specs.items():
        get('https://huggingface.co/'+repo+'/resolve/'+revision+'/'+name,'model/'+name,spec['size'],180 if name.endswith('.onnx') else 15,expected=weightsha if name.endswith('.onnx') else None,git=None if name.endswith('.onnx') else spec['blobId'])
    save('model-integrity.json',{'status':'PASS','revision':revision,'files':[{k:v for k,v in r.items() if k in ['name','bytes','sha256','source','status']} for r in state['requests'] if r['name'].startswith('model/')],'total_model_support_bytes':state['model_bytes']})
try:
    {'preflight':preflight,'acquire':acquire}[mode]()
except Exception as e:save(mode+'-failure.json',{'status':'BLOCKED','reason':str(e)});raise
