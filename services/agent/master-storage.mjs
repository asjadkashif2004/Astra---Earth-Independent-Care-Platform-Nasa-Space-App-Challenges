import { open,rename,unlink,lstat,readdir } from 'node:fs/promises';
import { constants as F } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { safeDirectory,readAt } from './read-context.mjs';
import { stable,parseJSON,sha,exact } from './read-contract.mjs';
import { singleCheck as check } from './single-select-contract.mjs';

export async function atomicRecord(root,name,value){
  const d=await safeDirectory(root),temp=name+'.tmp-'+randomUUID();let f;
  try{
    f=await open(d.at(temp),F.O_WRONLY|F.O_CREAT|F.O_EXCL|F.O_NOFOLLOW,0o600);
    const bytes=Buffer.from(stable(value)+'\n');let n=0;
    while(n<bytes.length){const r=await f.write(bytes,n,bytes.length-n);check(r.bytesWritten>0,'MASTER_SHORT_WRITE');n+=r.bytesWritten;}
    await f.sync();await f.close();f=null;await rename(d.at(temp),d.at(name));await d.handle.sync();
    return {durable:true,sha256:sha(bytes)};
  }finally{if(f)await f.close();try{await unlink(d.at(temp));}catch(e){if(e.code!=='ENOENT')throw e;}await d.close();}
}
export async function readBytes(root,name,max=1048576){
  const d=await safeDirectory(root);try{
    const s=await lstat(d.at(name));check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=max,'MASTER_METADATA_UNSAFE');
    return await readAt(d.fd,name,max);
  }finally{await d.close();}
}
export async function readRecord(root,name,max=1048576){return parseJSON((await readBytes(root,name,max)).toString(),max);}
export async function allocated(path){
  const s=await lstat(path);let total=Math.max(s.size,s.blocks*512);
  if(s.isDirectory()&&!s.isSymbolicLink())for(const name of await readdir(path))total+=await allocated(join(path,name));
  return total;
}
export const safetyFailure=code=>/SOURCE|CONTAINMENT|MOUNT|ISOLATION|SCOPE|ACK|PROVENANCE|RESOURCE|RSS|STORAGE|PIN|UNAUTHORIZED|AUTHORIZATION|FORBIDDEN|ADDITIONAL_SQL|SQL_NOT_ALLOWLISTED|SQLITE_ACTION/.test(code??'');
// One parent owns this ledger. Persisted reservations count conservatively even if spawn fails.
export class StartupBudget{
  constructor(persist,state,{maximum=12}={}){
    check(Number.isInteger(maximum)&&maximum>=1&&maximum<=12,'MASTER_BUDGET_POLICY');
    Object.defineProperty(this,'maximum',{value:maximum});
    this.persist=persist;this.state=structuredClone(state===undefined?{maximum,reservations:[],halted:null}:state);this.queue=Promise.resolve();
  }
  reserve(stage){
    const work=this.queue.then(async()=>{
      const s=this.state;
      check(exact(s,['maximum','reservations','halted'])&&s.maximum===this.maximum&&Array.isArray(s.reservations)
        &&s.reservations.every((r,i)=>r.ordinal===i+1&&typeof r.stage==='string'),'MASTER_BUDGET_CORRUPT');
      check(!s.halted,'MASTER_CAMPAIGN_HALTED');check(/^[a-z_]{1,64}$/.test(stage),'MASTER_STAGE_INVALID');
      check(s.reservations.length<this.maximum&&s.reservations.filter(r=>r.stage===stage).length<4,'MASTER_STARTUP_BUDGET');
      const r={ordinal:s.reservations.length+1,stage};
      const next={...s,reservations:[...s.reservations,r]};await this.persist(next);this.state=next;return r;
    });this.queue=work.catch(()=>{});return work;
  }
  async halt(code){await this.queue;this.state.halted??=code;await this.persist(this.state);}
}
