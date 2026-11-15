/* QA-only profiling. No production import or persistence/transport behavior changes. */
import { performance } from 'node:perf_hooks';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,copyFileSync } from 'node:fs';
import { tmpdir,cpus,platform,release } from 'node:os';
import { join,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';

export const percentile=(a,p=.95)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
export function queueStats(engine){
  const db=engine.store.db;
  return db.prepare("SELECT status,COUNT(*) AS packets,SUM(length(CAST(json AS BLOB))) AS bytes,MIN(length(CAST(json AS BLOB))) AS smallest_bytes,MAX(length(CAST(json AS BLOB))) AS largest_bytes FROM comms_messages GROUP BY status").all();
}
export function attachProfiler(engine){
  const store=engine.store,db=store.db,undo=[],samples=[];let active=null,audit=null,inComms=false;
  const count=(key,ms)=>{if(!active)return;const s=active.phases[key]??={calls:0,ms:0};s.calls++;s.ms+=ms;};
  function wrap(object,key,label){const old=object[key];object[key]=function(...args){const begin=performance.now();try{return old.apply(this,args);}finally{count(typeof label==='function'?label(args):label,performance.now()-begin);}};undo.push(()=>{object[key]=old;});}
  for(const key of ['ingest','snapshot','history','set','prune'])wrap(store,key,'store.'+key);
  wrap(store,'put',args=>'put.'+args[0]);
  for(const key of ['detect','queueSnapshot','processComms','checkpoint','snapshot'])wrap(engine,key,'engine.'+key);
  const oldStep=engine.comms.step;engine.comms.step=function(...args){inComms=true;const start=performance.now();try{return oldStep.apply(this,args);}finally{count('comms.step',performance.now()-start);inComms=false;}};undo.push(()=>{engine.comms.step=oldStep;});
  const oldParse=JSON.parse;JSON.parse=function(...args){if(!inComms)return oldParse(...args);const start=performance.now();try{return oldParse(...args);}finally{count('comms.json_parse',performance.now()-start);}};undo.push(()=>{JSON.parse=oldParse;});
  const oldExec=db.exec;db.exec=function(sql){const begin=performance.now();try{return oldExec.call(this,sql);}finally{count('sql.'+sql.split(' ')[0],performance.now()-begin);}};undo.push(()=>{db.exec=oldExec;});
  const oldPrepare=db.prepare;db.prepare=function(sql){
    const statement=oldPrepare.call(this,sql);
    if(sql.includes("FROM comms_messages WHERE status IN"))return {all(...args){const start=performance.now();try{return statement.all(...args);}finally{count('sql.pending_select',performance.now()-start);}}};
    if(!sql.startsWith('INSERT INTO comms_messages('))return statement;
    return {run(...args){
      if(active){active.packet_write_bytes+=Buffer.byteLength(args.at(-1));if(audit){active.identical_packet_writes+=Number(audit.get(args[0])===args.at(-1));}}
      const begin=performance.now();try{return statement.run(...args);}finally{count('sql.packet_upsert',performance.now()-begin);}
    }};
  };undo.push(()=>{db.prepare=oldPrepare;});
  const oldTick=engine.tick;engine.tick=function(...args){
    active={host_started_ms:Date.now(),mission_seconds:args[0]??this.speed,phases:{},packet_write_bytes:0,identical_packet_writes:0,audit_only:!!audit};
    const begin=performance.now();try{return oldTick.apply(this,args);}catch(error){active.failed=error.message;throw error;}finally{active.total_ms=performance.now()-begin;samples.push(active);active=null;audit=null;}
  };undo.push(()=>{engine.tick=oldTick;});
  return {samples,auditNextTick(){audit=new Map(oldPrepare.call(db,'SELECT id,json FROM comms_messages').all().map(r=>[r.id,r.json]));},restore(){for(const fn of undo.reverse())fn();},summary(){
    const timed=samples.filter(s=>!s.audit_only),keys=[...new Set(timed.flatMap(s=>Object.keys(s.phases)))];
    return {timed_samples:timed.length,total_p95_ms:percentile(timed.map(s=>s.total_ms)),phases:Object.fromEntries(keys.map(k=>[k,{p95_ms:percentile(timed.map(s=>s.phases[k]?.ms??0)),median_calls:percentile(timed.map(s=>s.phases[k]?.calls??0),.5)}]))};
  }};
}
export async function precondition(engine,ticks,step=1){
  for(let i=0;i<ticks;i++){engine.tick(step);if((i+1)%100===0)console.log('Precondition '+(i+1)+'/'+ticks+' ticks');if(i%10===0)await new Promise(r=>setImmediate(r));}
}
async function main(){
  const directory=resolve(process.argv.find(s=>s.startsWith('--output='))?.slice(9)??'artifacts/n04-p01-20261018/profile-before');mkdirSync(directory,{recursive:true});
  const temporary=mkdtempSync(join(tmpdir(),'astra-n04-p01-profile-'));
  const fixture=process.argv.find(s=>s.startsWith('--fixture-db='))?.slice(13);
  if(fixture)copyFileSync(resolve(fixture),join(temporary,'test.sqlite'));
  const app=createApp({dbPath:join(temporary,'test.sqlite'),autoTick:false,caseBuilder:buildCase});
  const report={scope:'N04-P01 diagnostic disk profiling;no browser/acceptance certificate',hardware:{platform:platform(),os_release:release(),cpu:cpus()[0].model,logical_cpus:cpus().length},source_hashes:Object.fromEntries(['services/api/engine.mjs','services/api/store.mjs','services/comms/scheduler.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),preconditioning:'Fast deterministic1s mission ticks build the same packet content/backlog;not a real-time acceptance run. Diagnostic samples then use fixed1Hz host deadlines.',stages:[]};
  let profiler;
  try{
    const selected=process.argv.find(s=>s.startsWith('--target='))?.slice(9);
    for(const target of selected?[Number(selected)]:[420,840]){
      await precondition(app.engine,Math.max(0,target-app.engine.state.tick));
      profiler=attachProfiler(app.engine);const start=performance.now(),before=queueStats(app.engine);
      for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,Math.max(0,start+(i+1)*1000-performance.now())));app.engine.tick(1);}
      profiler.auditNextTick();app.engine.tick(1);
      report.stages.push({target_tick:target,before,after:queueStats(app.engine),summary:profiler.summary(),samples:profiler.samples});profiler.restore();profiler=null;
      writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.stages.at(-1).summary));
    }
    report.audit_valid=app.store.verifyAudit();report.status='diagnostic completed';
  }finally{profiler?.restore();await app.close();if(process.argv.includes('--keep-db')){writeFileSync(join(directory,'fixture.sqlite'),readFileSync(join(temporary,'test.sqlite')));report.synthetic_fixture='fixture.sqlite';}rmSync(temporary,{recursive:true,force:true});writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
