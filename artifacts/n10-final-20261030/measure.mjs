// Bounded fresh synthetic application only. No operational/N16 source paths.
import { mkdtempSync,readdirSync,statSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { createApp } from '../../services/api/server.mjs';
import { buildCase } from '../../services/agent/agent.mjs';
import { append,ledger,digest } from '../../services/n10/ledger.mjs';
import { project } from '../../services/n10/projection.mjs';
import { actor,crew,DATE,data,request,FIXTURE_VERSION } from '../../tests/fixtures/n10.mjs';
const directory=mkdtempSync(join(tmpdir(),'astra-n10-final-measure-'));
const began=performance.now(),rss=[process.memoryUsage().rss],durations={create:[],projection:[],daily:[],history:[]};
const result={scope:'Small explicitly authored synthetic fixture; observations, not resource guarantees.',fixture:FIXTURE_VERSION,network_acquisitions:0,N16_starts:0,models:0};
let app;
try{
  const start=performance.now();app=createApp({dbPath:join(directory,'measure.sqlite'),autoTick:false,caseBuilder:buildCase});
  result.application_startup_ms=performance.now()-start;
  const put=(kind,value,options={})=>{const t=performance.now();const v=append(app.store,actor,crew,request(kind,structuredClone(value),options),app.engine.state.now);durations.create.push(performance.now()-t);rss.push(process.memoryUsage().rss);return v;};
  for(let i=0;i<16;i++)put('stage',{...data.stage,start_at:new Date(Date.parse(DATE)+i*1800000).toISOString(),end_at:new Date(Date.parse(DATE)+(i+1)*1800000).toISOString()},
    {id:'measure-stage-'+i});
  put('schedule',data.schedule);
  put('consent',data.consent,{id:'consent:'+actor.id});
  for(let i=0;i<4;i++){
    if(i)app.engine.tick(1);
    put('checkin',data.checkin,{source_at:new Date(app.engine.state.now).toISOString(),id:'measure-task-'+i});
  }
  const before=new Date(app.engine.state.now).toISOString(),head=digest(ledger(app.store,crew));
  for(let i=0;i<25;i++)for(const [name,days] of [['daily',1],['projection',7],['history',31]]){
    const t=performance.now(),v=project(app.store,actor,crew,{date:DATE,before,days},app.engine.state.now);
    assert.equal(v.cognition.reference.status,'KNOWN');assert.equal(v.record_count,22);
    durations[name].push(performance.now()-t);rss.push(process.memoryUsage().rss);
  }
  assert.equal(digest(ledger(app.store,crew)),head,'Read projections may not mutate the ledger');
  result.records=22;result.read_projections=75;result.unchanged_ledger_sha256=head;
  result.file_sizes_during_run=Object.fromEntries(readdirSync(directory).map(n=>[n,statSync(join(directory,n)).size]));
  result.logical_bytes=Object.values(result.file_sizes_during_run).reduce((a,b)=>a+b,0);
  result.operation_ms=Object.fromEntries(Object.entries(durations).map(([name,v])=>[name,{count:v.length,minimum:Math.min(...v),maximum:Math.max(...v),mean:v.reduce((a,b)=>a+b,0)/v.length}]));
}finally{
  if(app)await app.close();rmSync(directory,{force:true,recursive:true});
}
result.total_elapsed_ms=performance.now()-began;
result.observed_Node_RSS_bytes=Math.max(...rss);result.Node_kernel_maxRSS_bytes=process.resourceUsage().maxRSS*1024;
result.cleanup={application_closed:true,temporary_database_removed:true};
writeFileSync(new URL('./performance.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
