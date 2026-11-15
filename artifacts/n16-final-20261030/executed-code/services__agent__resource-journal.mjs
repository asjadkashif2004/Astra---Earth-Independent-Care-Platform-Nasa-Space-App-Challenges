// Parent-only accounting. No worker, SQLite, source database or network interfaces.
import { randomUUID } from 'node:crypto';
import { open,lstat } from 'node:fs/promises';
import { constants as F } from 'node:fs';
import { safeDirectory,readAt } from './read-context.mjs';
import { exact,plain,parseJSON,sha,stable,freeze,fail } from './read-contract.mjs';

export const JOURNAL_VERSION='astra.n16.resource-journal.v2';
const ROW_MAX=65536,LOG_MAX=8388608,FINALIZE_MS=250;
const check=(ok,code)=>{if(!ok)fail(code);};
export function nextResourceCounter(n){check(Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER,'RESOURCE_COUNTER_INVALID');return n+1;}
const counter=()=>({attempted:0,accepted:0,appended:0,durable:0});
const countersValid=c=>exact(c,['sample','event'])&&Object.values(c).every(v=>exact(v,['attempted','accepted','appended','durable'])
  &&Object.values(v).every(n=>Number.isSafeInteger(n)&&n>=0));

export function reconcileResourceJournal(bytes,counts,expected,id,expectedHead){
  check(Buffer.isBuffer(bytes)&&bytes.length<=LOG_MAX,'RESOURCE_LOG_INVALID');
  check(countersValid(counts)&&exact(expected,['samples','events'])
    &&Object.values(expected).every(n=>Number.isSafeInteger(n)&&n>=0),'RESOURCE_COUNTER_INVALID');
  check(typeof id==='string'&&/^[A-Za-z0-9._:-]{1,80}$/.test(id),'RESOURCE_ID_INVALID');
  const text=bytes.toString('utf8');check(!text||text.endsWith('\n'),'RESOURCE_LOG_TRUNCATED');
  const lines=text?text.slice(0,-1).split('\n'):[];let head='GENESIS',samples=0,events=0;
  for(const [i,line] of lines.entries()){
    let row;try{row=parseJSON(line,ROW_MAX);}catch{fail('RESOURCE_ROW_INVALID');}
    check(exact(row,['schema_version','journal_id','seq','previous_hash','kind','sample_id','event_id','at','payload','hash'])
      &&row.schema_version===JOURNAL_VERSION&&row.journal_id===id&&row.seq===i+1&&row.previous_hash===head,'RESOURCE_SEQUENCE_INVALID');
    const {hash,...body}=row;check(hash===sha(stable(body)),'RESOURCE_HASH_INVALID');
    check(typeof row.at==='string'&&Number.isFinite(Date.parse(row.at))&&new Date(row.at).toISOString()===row.at,'RESOURCE_ROW_INVALID');
    check(plain(row.payload),'RESOURCE_ROW_INVALID');
    if(row.kind==='sample'){
      samples=nextResourceCounter(samples);check(row.sample_id===samples&&row.event_id===null&&row.payload?.phase==='resource','RESOURCE_SAMPLE_ID_INVALID');
    }else if(row.kind==='event'){
      events=nextResourceCounter(events);check(row.event_id===events&&row.sample_id===null&&row.payload?.phase==='worker_event','RESOURCE_EVENT_ID_INVALID');
    }else fail('RESOURCE_ROW_INVALID');
    head=hash;
  }
  check(Object.values(counts.sample).every(n=>n===samples)&&Object.values(counts.event).every(n=>n===events)
    &&expected.samples===samples&&expected.events===events,'RESOURCE_COUNT_MISMATCH');
  check(head===expectedHead,'RESOURCE_FINAL_HEAD_MISMATCH');
  return freeze({journal_id:id,sample_count:samples,event_count:events,record_count:lines.length,
    journal_sha256:sha(bytes),head_hash:head,counters:structuredClone(counts)});
}

export class ResourceJournal {
  #io;#clock;#id;#onFailure;#counts;#tail;#pending;#bytes;#seq;#head;#error;#notificationError;#cleanupError;#sealed;#closed;#closeAttempted;#final;#finalPending;
  constructor(io,{clock=()=>new Date().toISOString(),id=randomUUID(),onFailure=()=>{}}={}){
    check(io&&['write','sync','read','readAll','close'].every(k=>typeof io[k]==='function'),'RESOURCE_IO_INVALID');
    check(typeof id==='string'&&/^[A-Za-z0-9._:-]{1,80}$/.test(id),'RESOURCE_ID_INVALID');
    this.#io=io;this.#clock=clock;this.#id=id;this.#onFailure=onFailure;
    this.#counts={sample:counter(),event:counter()};this.#tail=Promise.resolve();this.#pending=0;this.#bytes=0;this.#seq=0;this.#head='GENESIS';
    this.#error=null;this.#notificationError=null;this.#cleanupError=null;this.#sealed=false;this.#closed=false;this.#closeAttempted=false;this.#final=null;this.#finalPending=false;
  }
  #trip(error){
    if(!this.#error){this.#error=typeof error?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(error.code)?error.code:'RESOURCE_JOURNAL_FAILED';
      try{this.#onFailure({code:this.#error});}catch{this.#notificationError='RESOURCE_FAILURE_HANDLER_FAILED';}}
    return Object.assign(Error(this.#error),{code:this.#error});
  }
  #open(){if(this.#error)fail(this.#error);}
  state(){return freeze({journal_id:this.#id,...structuredClone(this.#counts),pending:this.#pending,written_bytes:this.#bytes,
    acknowledged_rows:this.#seq,head_hash:this.#head,error:this.#error,notification_error:this.#notificationError,cleanup_error:this.#cleanupError,
    sealed:this.#sealed,close_acknowledged:this.#closed,finalization_pending:this.#finalPending});}
  cancel(code='RESOURCE_CANCELLED'){if(!this.#closed||this.#finalPending)this.#trip({code});return this.state();}
  sample(collect){return this.#enqueue('sample',collect);}
  event(value){return this.#enqueue('event',()=>value);}
  #enqueue(kind,collect){
    if(this.#sealed)return Promise.reject(Object.assign(Error('RESOURCE_JOURNAL_CLOSED'),{code:'RESOURCE_JOURNAL_CLOSED'}));
    try{this.#open();check(typeof collect==='function','RESOURCE_COLLECTOR_INVALID');
      this.#counts[kind].attempted=nextResourceCounter(this.#counts[kind].attempted);}
    catch(e){return Promise.reject(this.#trip(e));}
    const id=this.#counts[kind].attempted;this.#pending++;
    const operation=this.#tail.then(async()=>{
      this.#open();const value=await collect();this.#open();
      check(plain(value)&&value?.phase===(kind==='sample'?'resource':'worker_event'),'RESOURCE_SERIALIZATION_FAILED');
      const at=this.#clock();check(typeof at==='string'&&Number.isFinite(Date.parse(at))&&new Date(at).toISOString()===at,'RESOURCE_SERIALIZATION_FAILED');
      const body={schema_version:JOURNAL_VERSION,journal_id:this.#id,seq:nextResourceCounter(this.#seq),previous_hash:this.#head,
        kind,sample_id:kind==='sample'?id:null,event_id:kind==='event'?id:null,at,payload:value};
      const row={...body,hash:sha(stable(body))},bytes=Buffer.from(stable(row)+'\n');
      check(bytes.length<=ROW_MAX&&this.#bytes+bytes.length<=LOG_MAX,'RESOURCE_LOG_LIMIT');
      this.#counts[kind].accepted=nextResourceCounter(this.#counts[kind].accepted);
      const start=this.#bytes;let offset=0;
      while(offset<bytes.length){
        this.#open();const n=await this.#io.write(bytes.subarray(offset),this.#bytes);
        check(Number.isSafeInteger(n)&&n>0&&n<=bytes.length-offset,'RESOURCE_SHORT_WRITE');
        offset+=n;this.#bytes+=n;
      }
      this.#counts[kind].appended=nextResourceCounter(this.#counts[kind].appended);this.#open();
      check(await this.#io.sync()===true,'RESOURCE_SYNC_ACK_INVALID');this.#open();
      const actual=await this.#io.read(start,bytes.length);this.#open();
      check(Buffer.isBuffer(actual)&&actual.equals(bytes),'RESOURCE_APPEND_ACK_INVALID');
      this.#counts[kind].durable=nextResourceCounter(this.#counts[kind].durable);this.#seq=row.seq;this.#head=row.hash;
      return freeze({durable:true,kind,id,seq:row.seq,hash:row.hash});
    }).catch(e=>{throw this.#trip(e);}).finally(()=>{this.#pending--;});
    this.#tail=operation.catch(()=>{});return operation;
  }
  finalize(expected){
    if(this.#final)return this.#final;
    this.#sealed=true;this.#finalPending=true;
    let wanted;try{wanted=structuredClone(expected);}catch{this.#trip({code:'RESOURCE_COUNTER_INVALID'});}
    const work=(async()=>{
      try{
        await this.#tail;this.#open();check(this.#pending===0,'RESOURCE_PENDING');
        check(await this.#io.sync()===true,'RESOURCE_SYNC_ACK_INVALID');this.#open();
        const before=await this.#io.readAll();this.#open();
        const verified=reconcileResourceJournal(before,this.#counts,wanted,this.#id,this.#head);
        this.#closeAttempted=true;check(await this.#io.close()===true,'RESOURCE_CLOSE_ACK_INVALID');this.#closed=true;this.#open();
        const after=await this.#io.readAll();this.#open();check(Buffer.isBuffer(after)&&after.equals(before),'RESOURCE_CLOSE_READBACK_CHANGED');
        reconcileResourceJournal(after,this.#counts,wanted,this.#id,this.#head);
        return freeze({...verified,reconciled:true,closed:true});
      }catch(e){throw this.#trip(e);}
      finally{
        if(!this.#closeAttempted){this.#closeAttempted=true;try{check(await this.#io.close()===true,'RESOURCE_CLOSE_ACK_INVALID');this.#closed=true;}catch(e){this.#cleanupError=e.code??'RESOURCE_CLOSE_FAILED';this.#trip(e);}}
        this.#finalPending=false;
      }
    })();
    let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(this.#trip({code:'RESOURCE_FINALIZE_TIMEOUT'})),FINALIZE_MS);});
    this.#final=Promise.race([work,timeout]).finally(()=>clearTimeout(timer));return this.#final;
  }
}

// One exclusive writer handle, explicit positions, short-write handling in the
// journal, fsync + byte readback acknowledgement. No historical file is opened for writing.
export async function createResourceJournal(root,name='resources-v2.jsonl',options={}){
  check(/^resources-[a-z0-9-]+\.jsonl$/.test(name),'RESOURCE_NAME_INVALID');
  const directory=await safeDirectory(root);let file;
  try{
    file=await open(directory.at(name),F.O_RDWR|F.O_CREAT|F.O_EXCL|F.O_NOFOLLOW,0o600);
    const identity=await file.stat();await file.sync();await directory.handle.sync();
    const io={
      write:async(bytes,position)=>(await file.write(bytes,0,bytes.length,position)).bytesWritten,
      sync:async()=>{await file.sync();return true;},
      read:async(position,length)=>{const bytes=Buffer.alloc(length);let n=0;while(n<length){const r=await file.read(bytes,n,length-n,position+n);if(!r.bytesRead)break;n+=r.bytesRead;}return bytes.subarray(0,n);},
      readAll:async()=>{
        const dir=await safeDirectory(root);try{
          const s=await lstat(dir.at(name));check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.dev===identity.dev&&s.ino===identity.ino&&s.size<=LOG_MAX,'RESOURCE_FILE_CHANGED');
          return await readAt(dir.fd,name,LOG_MAX);
        }finally{await dir.close();}
      },
      close:async()=>{await file.close();return true;}
    };
    return new ResourceJournal(io,options);
  }catch(e){if(file)await file.close();throw e;}finally{await directory.close();}
}
