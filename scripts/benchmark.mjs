import { performance } from 'node:perf_hooks';
import { Store } from '../services/api/store.mjs';
import { Engine } from '../services/api/engine.mjs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { evaluateCrew } from '../services/anomaly/detector.mjs';
import { EPOCH } from '../packages/contracts.mjs';
import { present } from '../packages/presentation.mjs';

const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
const seed=42017, baselines=createBaselines(seed), store=new Store(), engine=new Engine(store);
const inference=[], pipeline=[], ingest=[], pending={};
for(let i=0;i<300;i++){
  const sample=simulate({seed,tick:i,elapsed:i,now:EPOCH+i*1000,scenario:'nominal',runId:'benchmark',baselines});
  let started=performance.now();for(const c of sample.crew){const result=evaluateCrew(c,baselines[c.id],EPOCH+i*1000,pending[c.id]);pending[c.id]=result.pending;}inference.push(performance.now()-started);
  started=performance.now();store.ingest(sample.events);ingest.push(performance.now()-started);
}
for(let i=0;i<120;i++){const started=performance.now();engine.tick(30);pipeline.push(performance.now()-started);}
const projection=[],snapshot=engine.snapshot(),host=Date.now(),health={ready:true,monitoring:{status:'manual'},enrichment:{status:'ready'}};
for(let i=0;i<1000;i++){const started=performance.now();present(snapshot,{view:i%2?'earth':'spacecraft',connected:true,lastPacketAt:host,health,healthAt:host,now:host});projection.push(performance.now()-started);}
const report={runtime:process.version,platform:`${process.platform}/${process.arch}`,transport:'in-process; SQLite in memory',samples:300,crew:6,scalar_batch:60,
  detector_batch_p95_ms:Number(percentile(inference,.95).toFixed(3)),ingest_batch_p95_ms:Number(percentile(ingest,.95).toFixed(3)),
  ingest_observations_per_second:Math.round(60*300/(ingest.reduce((a,b)=>a+b,0)/1000)),
  complete_tick_p95_ms:Number(percentile(pipeline,.95).toFixed(3)),frontend_projection_p95_ms:Number(percentile(projection,.95).toFixed(3)),database_and_audit_chain_valid:store.verifyAudit(),
  caveats:['Stateful Tier A detector including bounded rate history; nominal workload, not optional worker cold-start latency.','Frontend projection is pure state/quality processing, not DOM layout, paint or frame performance.','Not HTTP network latency or telemetry-to-browser latency.','Not a disk-database benchmark.','GPU/FPS, browser load and visual correctness have not been measured.','Synthetic-only workload; no clinical inference.']};
console.log(JSON.stringify(report,null,2));store.close();
