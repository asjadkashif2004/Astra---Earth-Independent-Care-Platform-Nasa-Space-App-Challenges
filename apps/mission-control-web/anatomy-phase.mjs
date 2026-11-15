export const LINK_VERSION='astra.n06.link.v1';
// Phase accumulates at source-time rate changes. Seeking backwards re-anchors explicitly;
// unreliable intervals freeze and never contribute made-up cycles.
export class PhaseClock {
 constructor(){this.crew=null;this.at=null;this.phases=[0,0];this.rates=[0,0];this.good=[false,false];this.horizons=[0,0];}
 update({crew_id,as_of,heart_rate,respiratory_rate,replay=false}){const at=Date.parse(as_of);if(!Number.isFinite(at))throw Error('Invalid phase source time');const values=[heart_rate,respiratory_rate];
  if(this.crew!==crew_id||this.at===null||at<this.at||replay){this.phases=values.map(v=>v?.status==='KNOWN'?((at/60000*v.value)%1):0);}
  else for(let i=0;i<2;i++)if(this.good[i]&&values[i]?.status==='KNOWN')this.phases[i]=at-this.at<=this.horizons[i]?(this.phases[i]+(at-this.at)/60000*this.rates[i])%1:(at/60000*values[i].value)%1;
  this.crew=crew_id;this.at=at;this.good=values.map(v=>v?.status==='KNOWN'&&Number.isFinite(v.value)&&v.value>0);this.rates=values.map((v,i)=>this.good[i]?v.value:0);this.horizons=values.map((v,i)=>this.good[i]?Math.max(0,Math.max(5000,3000/(v.source?.sampling_hz??1))-Math.max(0,at-Date.parse(v.source_at??as_of))):0);return this;
 }
 sample(elapsedMs=0){return this.phases.map((p,i)=>(p+(this.good[i]?Math.max(0,Math.min(this.horizons[i],Number.isFinite(elapsedMs)?elapsedMs:0))*this.rates[i]/60000:0))%1);}
}
