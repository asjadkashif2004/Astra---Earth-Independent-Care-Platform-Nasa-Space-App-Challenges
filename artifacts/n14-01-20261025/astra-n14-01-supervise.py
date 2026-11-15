import os,sys,json,time,subprocess,hashlib,resource
from pathlib import Path

root=Path(sys.argv[1]).resolve();phase=sys.argv[2];command=sys.argv[3:]
old=Path('/var/tmp/astra-n14-direct-choice-b-EKjLmaoj')
unit='astra-n14-01-'+root.name.rsplit('-',1)[-1].lower()+'-'+phase
start=time.monotonic();failure=None;peaks={};maxdisk=0;aggregate=0;count=0
resource.setrlimit(resource.RLIMIT_AS,(256000000,256000000))
def save(path,data):
    tmp=path.with_suffix(path.suffix+'.tmp')
    with tmp.open('w') as f:json.dump(data,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
    tmp.replace(path)
def disk():
    seen=set();apparent=allocated=0
    for base in [root,old]:
        for d,dirs,files in os.walk(base,followlinks=False):
            for name in files:
                try:s=os.lstat(Path(d)/name)
                except FileNotFoundError:continue
                key=(s.st_dev,s.st_ino)
                if key in seen:continue
                seen.add(key);apparent+=s.st_size;allocated+=s.st_blocks*512
    return {'apparent':apparent,'allocated':allocated,'includes_reused_runtime_and_original_archives':True}
if subprocess.check_output(['findmnt','-n','-o','FSTYPE','-T',str(root)],text=True).strip() in ['tmpfs','ramfs']:raise RuntimeError('Disk-backed scratch required')
save(root/'observer.json',{'timestamp_ms':int(time.time()*1000),'stop':False})
# Extra aggregate guard is 900 MB, separate from the approved 1 GB per-process ceiling.
args=['systemd-run','--user','--unit='+unit,'--wait','--pipe','--collect','-p','MemoryMax=900000000','-p','MemorySwapMax=0','-p','CPUQuota=200%','-p','TasksMax=128','-p','RuntimeMaxSec=600','bwrap','--die-with-parent','--unshare-user','--unshare-pid','--ro-bind','/','/','--bind',str(root),str(root),'--proc','/proc','--dev','/dev','--chdir',str(root),*command]
save(root/(phase+'-launch.json'),{'command':args,'monitored_storage_choice':'B for this one implementation task','rss_limit':1000000000,'aggregate_limit':900000000,'watermark':1350000000})
log=(root/(phase+'-service.log')).open('w');samples=(root/(phase+'-resources.jsonl')).open('a');proc=subprocess.Popen(args,stdout=log,stderr=log)
def stop(reason):
    global failure
    if failure:return
    failure=reason;save(root/'observer.json',{'timestamp_ms':int(time.time()*1000),'stop':True,'reason':reason})
    subprocess.run(['systemctl','--user','kill','--signal=SIGKILL',unit],stdout=log,stderr=log,timeout=8)
while proc.poll() is None:
    tick=time.monotonic()
    try:
        usage=disk();maxdisk=max(maxdisk,*[usage[k] for k in ['apparent','allocated']])
        if maxdisk>=1350000000:stop('Storage precautionary watermark')
        cg=Path('/sys/fs/cgroup')/subprocess.check_output(['systemctl','--user','show',unit,'-p','ControlGroup','--value'],text=True,stderr=subprocess.DEVNULL).strip().lstrip('/')
        memory={};rows=[]
        if (cg/'cgroup.procs').exists() and unit in str(cg):
            for pid in (cg/'cgroup.procs').read_text().split():
                try:
                    status=Path('/proc/'+pid+'/status').read_text();v={a:b.strip() for a,b in (l.split(':',1) for l in status.splitlines() if ':' in l)}
                    rss=max(int(v.get('VmRSS','0 kB').split()[0]),int(v.get('VmHWM','0 kB').split()[0]))*1024
                except (FileNotFoundError,ProcessLookupError):continue
                peaks[pid]=max(peaks.get(pid,0),rss);rows.append({'pid':pid,'rss_highwater_bytes':rss,'name':v.get('Name')})
                if rss>=1000000000:stop('Per-process RSS ceiling')
            memory={k:(cg/k).read_text().strip() for k in ['memory.current','memory.peak','memory.events']}
            aggregate=max(aggregate,int(memory['memory.peak']))
            if 'oom_kill 0' not in memory['memory.events']:stop('Aggregate OOM')
        row={'timestamp_ms':int(time.time()*1000),'elapsed_ms':round((tick-start)*1000),'disk':usage,'processes':rows,'aggregate':memory}
        samples.write(json.dumps(row)+'\n');samples.flush();os.fsync(samples.fileno());count+=1
        save(root/'observer.json',{'timestamp_ms':int(time.time()*1000),'stop':bool(failure),'disk':usage})
        if tick-start>590:stop('Phase deadline')
    except Exception as e:stop('Resource observer failure: '+str(e))
    time.sleep(max(0,.5-(time.monotonic()-tick)))
code=proc.wait();samples.close();log.close()
result={'status':'PASS' if code==0 and not failure else 'BLOCKED','reason':failure,'exit_code':code,'elapsed_ms':round((time.monotonic()-start)*1000),'samples':count,'disk_final':disk(),'max_disk_sampled_bytes':maxdisk,'per_pid_rss_highwater_bytes':peaks,'aggregate_cgroup_peak_bytes':aggregate,'observer_peak_rss_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024}
save(root/(phase+'-supervisor.json'),result);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 1)
