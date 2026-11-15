import subprocess,sys,json,os
from pathlib import Path
root=Path(sys.argv[1]);project=sys.argv[2];runtime=sys.argv[3];model=sys.argv[4]
try:
    subprocess.run(['/usr/bin/python3',str(root/'preflight.py'),str(root),project,runtime,model],check=True,timeout=90)
    subprocess.run(['/home/basim/.nvm/versions/node/v24.21.0/bin/node',project+'/scripts/n14-matched-experiment.mjs',str(root),runtime,model],check=True,timeout=210)
except Exception as e:
    with (root/'run-failure.json').open('x') as f:json.dump({'status':'BLOCKED','reason':str(e)},f);f.flush();os.fsync(f.fileno())
    raise
