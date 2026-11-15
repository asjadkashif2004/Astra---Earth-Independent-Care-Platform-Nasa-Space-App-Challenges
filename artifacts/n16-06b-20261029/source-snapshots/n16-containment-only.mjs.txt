// Single containment-only entry. No SQLite imports, database reads, queries or retry path.
import { readFileSync,writeFileSync,openSync,closeSync,lstatSync,readdirSync,readlinkSync,existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { probeContainment } from '../services/agent/containment-diagnostics.mjs';
import { parseJSON,stable,fail } from '../services/agent/read-contract.mjs';

const SOURCE={source_id:'astra.n16.designated-synthetic.elevated.v1',sha256:'4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73'};
const emit=v=>process.stdout.write(stable(v)+'\n');
const lines=createInterface({input:process.stdin,crlfDelay:Infinity})[Symbol.asyncIterator]();
const next=async()=>{const v=await lines.next();if(v.done)fail('PROBE_CONTROL_CLOSED');return parseJSON(v.value,4096);};
const stats=()=>({rss:process.memoryUsage().rss,kernel_max_rss:process.resourceUsage().maxRSS*1024,
  database_byte_reads:0,SQLite_connections:0,SQL_statements:0});
function metadata(){
  const f=lstatSync('/fixture/source.sqlite',{bigint:true}),d=lstatSync('/fixture',{bigint:true});
  if(!f.isFile()||f.isSymbolicLink()||f.nlink!==1n||f.size!==65536n||(f.mode&0o777n)!==0o400n||(d.mode&0o777n)!==0o500n)fail('SOURCE_METADATA_INVALID');
  if(readdirSync('/fixture').sort().join()!=='source.sqlite')fail('UNEXPECTED_SOURCE_MEMBER');
  return {directory:{dev:String(d.dev),ino:String(d.ino)},file:{dev:String(f.dev),ino:String(f.ino),birth_ns:String(f.birthtimeNs),change_ns:String(f.ctimeNs)}};
}
try{
  const blocked=Object.fromEntries(['/mnt','/home','/project','/data','/root/.aws','/var/tmp'].map(p=>[p,!existsSync(p)]));
  if(!Object.values(blocked).every(Boolean))fail('PROBE_PATH_LEAK');
  if(readFileSync('/proc/net/route','utf8').trim().split('\n').length!==1)fail('PROBE_NETWORK_NOT_ISOLATED');
  const before=metadata();emit({event:'PROBE_READY',source:SOURCE,source_metadata:before,blocked_paths:blocked,
    network_namespace:readlinkSync('/proc/self/ns/net'),mount_namespace:readlinkSync('/proc/self/ns/mnt'),...stats()});
  const command=await next();if(command.command!=='run_containment_once'||stable(command.expected_identity)!==stable(before))fail('PROBE_IDENTITY_OR_CONTROL_MISMATCH');
  const diagnostic=probeContainment({readMountInfo:()=>readFileSync('/proc/self/mountinfo','utf8'),mountNamespace:()=>readlinkSync('/proc/self/ns/mnt'),
    createRootFile:()=>writeFileSync('/must-not-write','x'),createSourceFile:()=>writeFileSync('/fixture/must-not-create','x'),
    openSourceReadwrite:()=>{const fd=openSync('/fixture/source.sqlite','r+');closeSync(fd);}},SOURCE);
  const after=metadata(),unchanged=stable(before)===stable(after);
  emit({event:'CONTAINMENT_DIAGNOSTIC',diagnostic,metadata_unchanged:unchanged,...stats()});
  if(!unchanged)fail('PROBE_METADATA_CHANGED');if(!diagnostic.qualified)fail('SOURCE_NOT_READONLY');
  const ack=await next();if(ack.command!=='containment_verified'||ack.hash!==diagnostic.hash)fail('PROBE_ACK_INVALID');
  emit({event:'CONTAINMENT_PROBE_PASS',diagnostic_hash:diagnostic.hash,...stats()});
}catch(error){emit({event:'PROBE_FAILED',code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'PROBE_FAILED',
  errno:Number.isInteger(error.errno)?error.errno:null,syscall:['open','read','write','readlink','lstat'].includes(error.syscall)?error.syscall:null,...stats()});process.exitCode=1;
}finally{process.stdin.destroy();await lines.return?.();}
