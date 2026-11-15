// One monotonic latch for the complete owner-launched qualification batch. No reset operation.
import { sha,stable,fail } from './read-contract.mjs';

export class QualificationBatch {
  #persist;#first;#attempts;#admitted;#queue;#running;#notRun;#executedFailures;#persistence;#persistenceError;
  constructor({persist=async()=>{fail('BATCH_TRACE_UNAVAILABLE');}}={}){
    this.#persist=persist;this.#first=null;this.#attempts=0;this.#admitted=0;this.#queue=[];this.#running=new Set();
    this.#notRun=[];this.#executedFailures=[];this.#persistence=null;this.#persistenceError=null;
  }
  assertOpen(){if(this.#first)throw Object.assign(Error('BATCH_BLOCKED'),{code:'BATCH_BLOCKED',first_failure:this.#first});}
  run(label,fn,{expectedErrors=[]}={}){
    if(typeof label!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(label)||typeof fn!=='function'
      ||expectedErrors.some(x=>!['TIMEOUT','CANCELLED'].includes(x)))return Promise.reject(Object.assign(Error('INVALID_BATCH_POLICY'),{code:'INVALID_BATCH_POLICY'}));
    if(this.#first){this.#notRun.push({label,status:'NOT_RUN'});return Promise.reject(Object.assign(Error('BATCH_NOT_RUN'),{code:'BATCH_NOT_RUN',first_failure:this.#first}));}
    return new Promise((resolve,reject)=>{this.#queue.push({label,fn,expectedErrors,resolve,reject});this.pump();});
  }
  pump(){
    if(this.#first||this.#running.size||!this.#queue.length)return;
    const item=this.#queue.shift(),abort=new AbortController(),entry={item,abort,started:false,done:null};this.#running.add(entry);this.#admitted++;
    entry.done=(async()=>{
      try{const result=await item.fn({signal:abort.signal,markStarted:()=>{this.assertOpen();if(entry.started)fail('STARTUP_ALREADY_COUNTED');entry.started=true;this.#attempts++;}});this.assertOpen();item.resolve(result);}
      catch(error){this.#executedFailures.push({label:item.label,code:error.code??'FAILED'});
        if(entry.started&&!item.expectedErrors.includes(error.code))this.trip({code:error.code??'WORKER_FAILED',stage:'worker',label:item.label});item.reject(error);}
      finally{this.#running.delete(entry);this.pump();}
    })();
  }
  trip(failure){
    if(this.#first)return this.#first;
    this.#first=Object.freeze({code:typeof failure.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(failure.code)?failure.code:'BLOCKING_FAILURE',
      stage:typeof failure.stage==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(failure.stage)?failure.stage:'unknown',attempts:this.#attempts});
    const record={schema_version:'astra.n16.batch-failure.v1',first_failure:this.#first,attempts:this.#attempts};
    const sealed={...record,hash:sha(stable(record))};
    this.#persistence=Promise.resolve().then(()=>this.#persist(sealed)).then(receipt=>{
      if(receipt?.durable!==true||receipt.hash!==sealed.hash)fail('BATCH_TRACE_PERSISTENCE_FAILED');
    }).catch(()=>{this.#persistenceError='BATCH_TRACE_PERSISTENCE_FAILED';});
    for(const queued of this.#queue.splice(0)){this.#notRun.push({label:queued.label,status:'NOT_RUN'});queued.reject(Object.assign(Error('BATCH_NOT_RUN'),{code:'BATCH_NOT_RUN',first_failure:this.#first}));}
    for(const entry of this.#running)entry.abort.abort(this.#first);return this.#first;
  }
  async drain({timeoutMs=250}={}){
    let timer;try{
      await Promise.race([(async()=>{await Promise.all([...this.#running].map(x=>x.done));await this.#persistence;if(this.#persistenceError)fail(this.#persistenceError);})(),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('BATCH_CLEANUP_FAILED'),{code:'BATCH_CLEANUP_FAILED'})),timeoutMs);})]);
      if(this.#running.size||this.#queue.length)fail('BATCH_CLEANUP_FAILED');return this.state();
    }finally{clearTimeout(timer);}
  }
  state(){return {blocked:this.#first!==null,first_failure:this.#first,attempted_startups:this.#attempts,admitted:this.#admitted,
    running:this.#running.size,queued:this.#queue.length,not_run:[...this.#notRun],executed_failures:[...this.#executedFailures],persistence_error:this.#persistenceError};}
}
export function verifyBatchRecord(value){
  if(value===null||value===undefined)fail('BATCH_TRACE_MISSING');const {hash,...body}=value;
  if(body.schema_version!=='astra.n16.batch-failure.v1'||hash!==sha(stable(body))||!Number.isSafeInteger(body.attempts)||body.attempts<0
    ||body.first_failure?.attempts!==body.attempts||typeof body.first_failure.code!=='string')fail('BATCH_TRACE_CORRUPT');return body;
}
export function runQualificationTest(batch,t,fn){
  if(batch.state().blocked){t.skip('NOT RUN: first blocking qualification failure');return undefined;}return fn(t);
}
