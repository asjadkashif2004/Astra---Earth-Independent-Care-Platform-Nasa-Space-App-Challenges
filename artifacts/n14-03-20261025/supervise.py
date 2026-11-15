import os,sys,json,time,subprocess,resource
from pathlib import Path
root=Path(sys.argv[1]).resolve();project=Path(sys.argv[2]).resolve();unit='astra-n14-03-'+root.name.rsplit('-',1)[-1].lower();start=time.monotonic();failure=None;peaks={};maxdisk=0;aggregate=0;samples=0
resource.setrlimit(resource.RLIMIT_AS,(256000000,256000000))
account=[root,Path('/var/tmp/astra-n14-direct-choice-b-EKjLmaoj'),Path('/var/tmp/astra-n14-01-oEWmeAl8'),project/'data/corpus',project/'data/research',project/'artifacts/n14-01-20261025',project/'artifacts/n14-02-20261025',project/'artifacts/n14-03-20261025',project/'services/research-retrieval']
def save(name,obj):
    dest=root/name;tmp=dest.with_suffix(dest.suffix+'.tmp')
    with tmp.open('w') as f:json.dump(obj,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
    tmp.replace(dest)
def disk():
    seen=set();apparent=allocated=0
    for base in account:
        for d,dirs,files in os.walk(base,followlinks=False):
            for n in files:
                try:s=os.lstat(Path(d)/n)
                except FileNotFoundError:continue
                key=(s.st_dev,s.st_ino)
                if key in seen:continue
                seen.add(key);apparent+=s.st_size;allocated+=s.st_blocks*512
    return {'apparent_bytes':apparent,'allocated_bytes':allocated}
if subprocess.check_output(['findmnt','-n','-o','FSTYPE','-T',str(root)],text=True).strip() in ['tmpfs','ramfs']:raise RuntimeError('Disk-backed scratch required')
initial=disk()
if max(initial.values())>=1350000000:raise RuntimeError('Initial storage watermark')
save('observer.json',{'timestamp_ms':int(time.time()*1000),'stop':False})
args=['systemd-run','--user','--unit='+unit,'--wait','--pipe','--collect','-p','MemoryMax=900000000','-p','MemorySwapMax=0','-p','CPUQuota=200%','-p','TasksMax=128','-p','RuntimeMaxSec=300','bwrap','--die-with-parent','--unshare-user','--unshare-pid','--ro-bind','/','/','--bind',str(root),str(root),'--proc','/proc','--dev','/dev','--chdir',str(root),'unshare','--user','--map-root-user','--net','/usr/bin/python3',str(root/'run.py'),str(root),str(project),'/var/tmp/astra-n14-direct-choice-b-EKjLmaoj/payload/work/node_modules','/var/tmp/astra-n14-01-oEWmeAl8/model']
save('launch.json',{'unit':unit,'command':args,'accounting_roots':[str(p) for p in account],'storage_choice':'B for N14-03 only; temporary overshoot acknowledged','storage_watermark':1350000000,'storage_ceiling':1500000000,'process_rss_ceiling':1000000000,'separate_aggregate_memory_limit':900000000,'network_acquisition_authorized':False})
log=(root/'service.log').open('w');events=(root/'resources.jsonl').open('a');proc=subprocess.Popen(args,stdout=log,stderr=log)
def stop(reason):
    global failure
    if failure:return
    failure=reason;save('observer.json',{'timestamp_ms':int(time.time()*1000),'stop':True,'reason':reason});save('stop.json',{'reason':reason,'timestamp_ms':int(time.time()*1000)})
    subprocess.run(['systemctl','--user','kill','--signal=SIGKILL',unit],stdout=log,stderr=log,timeout=8)
while proc.poll() is None:
    tick=time.monotonic()
    try:
        usage=disk();maxdisk=max(maxdisk,*usage.values())
        if maxdisk>=1350000000:stop('Storage precautionary watermark')
        path=subprocess.check_output(['systemctl','--user','show',unit,'-p','ControlGroup','--value'],text=True,stderr=subprocess.DEVNULL).strip();cg=Path('/sys/fs/cgroup')/path.lstrip('/');rows=[];memory={}
        if (cg/'cgroup.procs').exists() and unit in str(cg):
            for pid in (cg/'cgroup.procs').read_text().split():
                try:v={k:x.strip() for k,x in (l.split(':',1) for l in Path('/proc/'+pid+'/status').read_text().splitlines() if ':' in l)}
                except (FileNotFoundError,ProcessLookupError):continue
                rss=max(int(v.get('VmRSS','0 kB').split()[0]),int(v.get('VmHWM','0 kB').split()[0]))*1024;peaks[pid]=max(peaks.get(pid,0),rss);rows.append({'pid':pid,'name':v.get('Name'),'rss_highwater_bytes':rss})
                if rss>=1000000000:stop('Per-process RSS ceiling')
            memory={k:(cg/k).read_text().strip() for k in ['memory.current','memory.peak','memory.events']};aggregate=max(aggregate,int(memory['memory.peak']))
            if 'oom_kill 0' not in memory['memory.events']:stop('Aggregate OOM')
        if tick-start>290:stop('Overall experiment deadline')
        events.write(json.dumps({'timestamp_ms':int(time.time()*1000),'elapsed_ms':round((tick-start)*1000),'disk':usage,'processes':rows,'aggregate':memory})+'\n');events.flush();os.fsync(events.fileno());samples+=1
        save('observer.json',{'timestamp_ms':int(time.time()*1000),'stop':bool(failure),'disk':usage})
    except Exception as e:stop('Resource observer failure: '+str(e))
    time.sleep(max(0,.5-(time.monotonic()-tick)))
code=proc.wait();events.close();log.close();final=disk();maxdisk=max(maxdisk,*final.values())
if maxdisk>=1350000000:failure=failure or 'Final storage watermark'
resultfile=root/'experiment-result.json';worker=json.loads(resultfile.read_text()) if resultfile.exists() else {}
if worker.get('process_peak_rss_bytes',0)>=1000000000:failure=failure or 'Worker peak RSS ceiling'
status='PASS' if code==0 and not failure and worker.get('status')=='PASS' else 'BLOCKED'
self_status={k:v.strip() for k,v in (l.split(':',1) for l in Path('/proc/self/status').read_text().splitlines() if ':' in l)}
result={'status':status,'reason':failure,'service_exit':code,'elapsed_ms':round((time.monotonic()-start)*1000),'resource_samples':samples,'initial_disk':initial,'final_disk':final,'max_sampled_file_storage_bytes':maxdisk,'per_pid_rss_highwater_bytes':peaks,'aggregate_cgroup_peak_bytes':aggregate,'observer_proc_highwater_rss_bytes':int(self_status['VmHWM'].split()[0])*1024,'observer_rusage_highwater_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,'network_acquisition_bytes':0,'network_acquisition_ms':0}
save('supervisor-result.json',result);print(json.dumps(result));sys.exit(0 if status=='PASS' else 1)
