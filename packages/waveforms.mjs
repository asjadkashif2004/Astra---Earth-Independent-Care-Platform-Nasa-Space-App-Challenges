// Pure bounded engineering formats. No filesystem, network or clinical model.
import { AppError,CREW } from './contracts.mjs';
export const WAVE={input:'astra.n08.input.v1',view:'astra.n08.window.v1',transform:'float32-grid-v1',maxBytes:256000,maxSeconds:60,chunkSeconds:5,maxRevisions:64,maxStoredBytes:8388608};
export const CHANNELS=Object.freeze({ECG:'mV',PPG:'arbitrary_unit',RESP:'arbitrary_unit'});
export const check=(ok,code='WAVEFORM_INVALID',status=422)=>{if(!ok)throw new AppError(status,code,'Waveform rejected: '+code);};
export const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(v);
export const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function validateMeta(m){
  check(exact(m,['schema_version','recording_id','crew_id','revision','supersedes_sha256','source','start_at','sample_rate_hz','sample_count','channels','quality']),'WAVEFORM_SCHEMA');
  check(m.schema_version===WAVE.input&&safeId(m.recording_id)&&CREW.some(c=>c.id===m.crew_id),'WAVEFORM_ID');
  check(Number.isSafeInteger(m.revision)&&m.revision>=1&&m.revision<=64&&(m.revision===1?m.supersedes_sha256===null:isHash(m.supersedes_sha256)),'WAVEFORM_REVISION');
  check(exact(m.source,['kind','id','generator_version','seed','synthetic'])&&m.source.kind==='authored_synthetic'&&m.source.synthetic===true
    &&safeId(m.source.id)&&m.source.id.startsWith('SYN-')&&safeId(m.source.generator_version)&&Number.isSafeInteger(m.source.seed)&&m.source.seed>=0&&m.source.seed<=2147483647,'WAVEFORM_SYNTHETIC_ONLY');
  check(instant(m.start_at)&&[50,100,125,250,500].includes(m.sample_rate_hz)&&Number.isSafeInteger(m.sample_count)&&m.sample_count>=m.sample_rate_hz
    &&m.sample_count<=m.sample_rate_hz*60&&m.sample_count%m.sample_rate_hz===0,'WAVEFORM_TIMEBASE');
  check(Array.isArray(m.channels)&&m.channels.length>=1&&m.channels.length<=3&&new Set(m.channels.map(c=>c?.name)).size===m.channels.length,'WAVEFORM_CHANNELS');
  for(const c of m.channels)check(exact(c,['name','unit'])&&Object.hasOwn(CHANNELS,c.name)&&c.unit===CHANNELS[c.name],'WAVEFORM_UNIT');
  check(exact(m.quality,['status'])&&['good','suspect','missing'].includes(m.quality.status),'WAVEFORM_QUALITY');
  check(m.sample_count*m.channels.length*4+16<=WAVE.maxBytes,'WAVEFORM_SIZE',413);return m;
}
function inputBytes(bytes){check(bytes instanceof Uint8Array&&bytes.byteLength>=1&&bytes.byteLength<=WAVE.maxBytes,'WAVEFORM_SIZE',413);return bytes;}
function decodeText(bytes){try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{check(false,'WAVEFORM_UTF8');}}
function jsonMeta(text){let m;try{m=JSON.parse(text);}catch{check(false,'WAVEFORM_METADATA_JSON');}validateMeta(m);check(text===canonical(m),'WAVEFORM_METADATA_CANONICAL');return m;}
function floatValue(v){check(Number.isNaN(v)||Number.isFinite(v)&&Math.abs(v)<=1e6,'WAVEFORM_SAMPLE');}
export function encodeBinary(meta,frames){
  validateMeta(meta);const text=new TextEncoder().encode(canonical(meta));check(text.length<=8192,'WAVEFORM_METADATA_SIZE');
  check(frames.length===meta.sample_count*meta.channels.length,'WAVEFORM_SAMPLE_COUNT');
  const bytes=new Uint8Array(16+text.length+frames.length*4);check(bytes.length<=WAVE.maxBytes,'WAVEFORM_SIZE',413);
  bytes.set(new TextEncoder().encode('ASTRAWV1'));const v=new DataView(bytes.buffer);v.setUint16(8,1,true);v.setUint8(10,1);v.setUint8(11,1);v.setUint32(12,text.length,true);bytes.set(text,16);
  frames.forEach((n,i)=>{floatValue(n);if(Number.isNaN(n))v.setUint32(16+text.length+4*i,0x7fc00000,true);else v.setFloat32(16+text.length+4*i,n,true);});return bytes;
}
export function decodeBinary(input){
  const bytes=inputBytes(input);check(bytes.length>=16,'WAVEFORM_HEADER');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  check(new TextDecoder().decode(bytes.subarray(0,8))==='ASTRAWV1','WAVEFORM_MAGIC');
  check(v.getUint16(8,true)===1&&v.getUint8(10)===1&&v.getUint8(11)===1,'WAVEFORM_ENCODING');
  const length=v.getUint32(12,true);check(length>=2&&length<=8192&&16+length<=bytes.length,'WAVEFORM_HEADER');
  const meta=jsonMeta(decodeText(bytes.subarray(16,16+length))),count=meta.sample_count*meta.channels.length;
  check(bytes.length===16+length+4*count,'WAVEFORM_SAMPLE_COUNT');const frames=new Float32Array(count);
  for(let i=0;i<count;i++){const p=16+length+4*i,n=v.getFloat32(p,true);check(!Number.isNaN(n)||v.getUint32(p,true)===0x7fc00000,'WAVEFORM_NAN_ENCODING');floatValue(n);frames[i]=n;}
  return {meta,frames,format:'binary'};
}
export function encodeCSV(meta,frames){
  validateMeta(meta);check(frames.length===meta.sample_count*meta.channels.length,'WAVEFORM_SAMPLE_COUNT');
  const lines=['# ASTRA-WAVEFORM-CSV-V1','# metadata:'+canonical(meta),'timestamp,'+meta.channels.map(c=>c.name+'['+c.unit+']').join(',')];
  for(let i=0;i<meta.sample_count;i++)lines.push(new Date(Date.parse(meta.start_at)+i*1000/meta.sample_rate_hz).toISOString()+','+meta.channels.map((_,j)=>{
    const n=frames[i*meta.channels.length+j];floatValue(n);return Number.isNaN(n)?'':Number(n).toFixed(6);
  }).join(','));
  return inputBytes(new TextEncoder().encode(lines.join('\n')+'\n'));
}
export function decodeCSV(input){
  const bytes=inputBytes(input),text=decodeText(bytes);check(!text.startsWith('\ufeff')&&text.endsWith('\n')&&!text.includes('\r'),'WAVEFORM_CSV_ENCODING');
  const lines=text.split('\n');lines.pop();check(lines[0]==='# ASTRA-WAVEFORM-CSV-V1'&&lines[1]?.startsWith('# metadata:'),'WAVEFORM_CSV_HEADER');
  const meta=jsonMeta(lines[1].slice(11));check(lines[2]==='timestamp,'+meta.channels.map(c=>c.name+'['+c.unit+']').join(','),'WAVEFORM_CSV_COLUMNS');
  check(lines.length===meta.sample_count+3,'WAVEFORM_CSV_ROWS');const frames=new Float32Array(meta.sample_count*meta.channels.length);
  for(let i=0;i<meta.sample_count;i++){
    const cells=lines[i+3].split(','),row=i+4;check(cells.length===meta.channels.length+1,'WAVEFORM_CSV_ROW_'+row);
    check(instant(cells[0])&&cells[0]===new Date(Date.parse(meta.start_at)+i*1000/meta.sample_rate_hz).toISOString(),'WAVEFORM_CSV_TIME_ROW_'+row);
    for(let j=0;j<meta.channels.length;j++){
      const s=cells[j+1];check(s===''||/^-?(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(s),'WAVEFORM_CSV_NUMBER_ROW_'+row+'_COL_'+(j+2));
      const n=s===''?NaN:Number(s);floatValue(n);frames[i*meta.channels.length+j]=n;
    }
  }
  return {meta,frames,format:'csv'};
}
export function channelBytes(frames,channel,channelCount,from=0,to=frames.length/channelCount){
  const out=new Uint8Array((to-from)*4),v=new DataView(out.buffer);
  for(let i=from;i<to;i++){const n=frames[i*channelCount+channel];if(Number.isNaN(n))v.setUint32((i-from)*4,0x7fc00000,true);else v.setFloat32((i-from)*4,n,true);}return out;
}
export function demoWaveform(crew,start_at,id='SYN-demo',{gap=true,seconds=20}={}){
  const meta={schema_version:WAVE.input,recording_id:id,crew_id:crew,revision:1,supersedes_sha256:null,
    source:{kind:'authored_synthetic',id:'SYN-'+id.slice(0,56),generator_version:'n08-demo-v1',seed:708,synthetic:true},start_at,sample_rate_hz:125,sample_count:125*seconds,
    channels:[{name:'ECG',unit:'mV'},{name:'PPG',unit:'arbitrary_unit'},{name:'RESP',unit:'arbitrary_unit'}],quality:{status:'good'}};
  const frames=new Float32Array(meta.sample_count*3);
  for(let i=0;i<meta.sample_count;i++){const t=i/125,phase=i%125;
    frames[i*3]=gap&&i>=625&&i<750?NaN:phase===50?1.2:(phase===49||phase===51)? .6:.03*Math.sin(t*12);
    frames[i*3+1]=.5+.3*Math.sin(2*Math.PI*t);frames[i*3+2]=.3*Math.sin(2*Math.PI*t/4);
  }
  return {meta,frames};
}
