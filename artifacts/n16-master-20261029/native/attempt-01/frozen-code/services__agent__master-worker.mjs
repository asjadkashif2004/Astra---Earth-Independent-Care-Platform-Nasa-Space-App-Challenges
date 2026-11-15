// One model-free, read-only task worker. It sees only the sealed source and staged code.
import { DatabaseSync,constants } from 'node:sqlite';
import { readFileSync,writeFileSync,openSync,closeSync,readlinkSync,existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { executeMaster } from './master-contract.mjs';
import { inspectSealedSource } from './single-select-source.mjs';
import { probeContainment,mountProof } from './containment-diagnostics.mjs';
import { SOURCE_ID,SOURCE_SHA } from './designated-contract.mjs';
import { parseJSON,stable,fail } from './read-contract.mjs';
const emit=value=>process.stdout.write(stable(value)+'\n');
const lines=createInterface({input:process.stdin,crlfDelay:Infinity})[Symbol.asyncIterator]();
const next=async()=>{const r=await lines.next();if(r.done)fail('CONTROL_CLOSED');return parseJSON(r.value,65536);};
try{
  const blocked=Object.fromEntries(['/mnt','/home','/project','/data','/root/.aws','/var/tmp'].map(p=>[p,!existsSync(p)]));
  if(!Object.values(blocked).every(Boolean)||readFileSync('/proc/net/route','utf8').trim().split('\n').length!==1)fail('SINGLE_ISOLATION_FAILED');
  const spec=readFileSync('/code/docs/N16_05_SOURCE_SPEC.json'),request=await next();
  const stats=()=>({rss:process.memoryUsage().rss,kernel_max_rss:process.resourceUsage().maxRSS*1024});
  const value=await executeMaster(request,{
    inspect:()=>inspectSealedSource('/fixture',spec,request.expected_instance),
    guard:()=>probeContainment({readMountInfo:()=>readFileSync('/proc/self/mountinfo','utf8'),mountNamespace:()=>readlinkSync('/proc/self/ns/mnt'),
      createRootFile:()=>writeFileSync('/must-not-write','x'),createSourceFile:()=>writeFileSync('/fixture/must-not-create','x'),
      openSourceReadwrite:()=>{const f=openSync('/fixture/source.sqlite','r+');closeSync(f);}}, {source_id:SOURCE_ID,sha256:SOURCE_SHA}),
    reportGuard:(diagnostic,binding)=>emit({event:'SINGLE_CONTAINMENT',diagnostic,binding,blocked_paths:blocked,
      network_namespace:readlinkSync('/proc/self/ns/net'),...stats()}),
    acknowledge:next,confirmMount:d=>{if(stable(mountProof(readFileSync('/proc/self/mountinfo','utf8'),readlinkSync('/proc/self/ns/mnt')))!==stable(d.proof))fail('SINGLE_MOUNT_CHANGED');},
    constants,open:options=>{emit({event:'SINGLE_SQL_ATTEMPT',...stats()});return new DatabaseSync('/fixture/source.sqlite',options);}
  });
  emit({event:'SINGLE_RESULT',...value,...stats()});
}catch(e){emit({event:'FAILED',code:e.errcode===5?'SQLITE_BUSY':e.errcode===6?'SQLITE_LOCKED':e.code??'SOURCE_UNAVAILABLE'});process.exitCode=1;}
finally{process.stdin.destroy();await lines.return?.();}
