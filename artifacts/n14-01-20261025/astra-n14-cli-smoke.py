import json,subprocess,sys,os
from pathlib import Path
r=Path(sys.argv[1]);node='/home/basim/.nvm/versions/node/v24.21.0/bin/node';project='/mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI';cli=project+'/scripts/n14-research.mjs';runtime='/var/tmp/astra-n14-direct-choice-b-EKjLmaoj/payload/work/node_modules'
commands=[['verify','--index='+str(r/'index')],['query','--runtime='+runtime,'--model='+str(r/'model'),'--index='+str(r/'index'),'--text=How does light influence the circadian clock?'],['claim','--index='+str(r/'index'),'--text=Diagnose sleep apnea for this astronaut']]
results=[]
for args in commands:
    p=subprocess.run([node,cli,*args],capture_output=True,text=True,timeout=65)
    (r/('cli-'+args[0]+'.stdout.json')).write_text(p.stdout)
    (r/('cli-'+args[0]+'.stderr.txt')).write_text(p.stderr)
    if p.returncode:raise RuntimeError('CLI '+args[0]+' failed: '+p.stderr)
    data=json.loads(p.stdout);results.append({'mode':args[0],'status':data['status'],'network_attempts':data['network_attempts'],'rss':data['process_peak_rss_bytes']})
    if data['network_attempts']:raise RuntimeError('CLI attempted network')
if results[1]['status']!='research_candidates' or results[2]['status']!='insufficient_support':raise RuntimeError('CLI functional mismatch')
with (r/'cli-smoke.json').open('x') as f:json.dump({'status':'PASS','results':results},f,indent=2);f.flush();os.fsync(f.fileno())
