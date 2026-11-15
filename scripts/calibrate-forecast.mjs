import { writeFileSync } from 'node:fs';
import { forecast } from '../services/prediction/forecast.mjs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { EPOCH } from '../packages/contracts.mjs';

// Point estimates use past history only. The disjoint calibration profiles and
// future labels determine interval widths; none enter held-out evaluation.
const seeds=[101,211,307,419,521,631,739,853], starts=[0,180,360], crewIndices=[0,1,3,4,5];
// Sleep-session records have no calibration in this continuous-signal model.
const metrics=['heart_rate','hrv'];const errors=Object.fromEntries(metrics.map(k=>[k,[]]));
for(const seed of seeds){
  const baselines=createBaselines(seed);
  for(const start of starts){
    const histories=Object.fromEntries(crewIndices.map(i=>[i,[]]));
    for(let i=0;i<60;i++){
      const tick=start+i,now=EPOCH+tick*30_000;
      const sample=simulate({seed,tick,elapsed:tick*30,now,scenario:'nominal',runId:'calibration-only',baselines,cadenceSeconds:30});
      for(const c of crewIndices)histories[c].push({ts:new Date(now).toISOString(),quality:sample.crew[c].quality,values:sample.crew[c].values});
    }
    const futureTick=start+119;
    const future=simulate({seed,tick:futureTick,elapsed:futureTick*30,now:EPOCH+futureTick*30_000,scenario:'nominal',runId:'calibration-only',baselines,cadenceSeconds:30});
    for(const c of crewIndices)for(const metric of metrics){const f=forecast(histories[c],metric,30);errors[metric].push(Math.abs(f.estimate-future.crew[c].values[metric]));}
  }
}
const target=.9;
const quantiles=Object.fromEntries(metrics.map(metric=>{const sorted=errors[metric].sort((a,b)=>a-b);return [metric,sorted[Math.min(sorted.length-1,Math.ceil((sorted.length+1)*target)-1)]];}));
const record={version:'nominal-synthetic-calibration-v1',status:'frozen',generator_version:'1.0.0',method:'split-conformal absolute-error quantile',horizon_minutes:30,target_coverage:target,samples_per_metric:errors.heart_rate.length,seeds,crew_indices:crewIndices,held_out_crew:'CREW-03',window_starts:starts,observations_per_history:60,cadence_seconds:30,quantiles,limitations:'Calibration uses only nominal synthetic profiles. No clinical validity, drift coverage or exchangeability guarantee is asserted. Do not retrain on the frozen evaluation seeds.'};
writeFileSync(new URL('../models/forecast-calibration.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
