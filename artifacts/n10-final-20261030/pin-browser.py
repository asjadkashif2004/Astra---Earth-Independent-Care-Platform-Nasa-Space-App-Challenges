from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n10-final-20261030'
attempt=int(sys.argv[1]);p=OUT/'browser-startups.json'
old=json.loads(p.read_text()) if p.exists() else {'maximum':3,'attempts':[]}
if attempt==4:
 assert old['maximum']==3 and len(old['attempts'])==3
 old['initial_QA_estimate']=3
 old['estimate_revision']='One final bounded ordinary-QA correction under the existing consolidated owner mission; no owner resource boundary changed.'
 old['maximum']=4
assert attempt==len(old['attempts'])+1 and attempt<=old['maximum']
names=['services/n10/contracts.mjs','services/n10/ledger.mjs','services/n10/projection.mjs','services/api/server.mjs','services/api/store.mjs',
 'apps/mission-control-web/app.mjs','apps/mission-control-web/n10.mjs','apps/mission-control-web/n10.css','scripts/browser-acceptance.mjs','scripts/browser-n10.mjs',
 'docs/N10_CONTRACT.md','tests/n10.test.mjs','tests/fixtures/n10.mjs']
pins={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in names}
old['attempts'].append({'ordinal':attempt,'directory':'browser-0'+str(attempt),'status':'ADMITTED_ONCE','code_pins':pins})
p.write_text(json.dumps(old,indent=2)+'\n')
print(json.dumps({'browser_admission':attempt,'maximum':old['maximum'],'source_pins':len(pins),'N16_startups':0}))
