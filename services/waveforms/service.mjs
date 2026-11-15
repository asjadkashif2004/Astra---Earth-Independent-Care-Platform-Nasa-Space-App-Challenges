import { createHash } from 'node:crypto';
import { WAVE,check,canonical,instant,safeId,isHash,decodeBinary,decodeCSV,channelBytes } from '../../packages/waveforms.mjs';
import { CREW } from '../../packages/contracts.mjs';
import { analyzeWindow } from './signal.mjs';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const digest=value=>sha(canonical(value));
export function authorize(identity,crew,write=false){
  check(identity&&safeId(identity.id)&&CREW.some(c=>c.id===crew),'WAVEFORM_UNAUTHORIZED',403);
  check((write?['demo_admin','astronaut']:['demo_admin','astronaut','mission_control','flight_surgeon']).includes(identity.role)
    &&(identity.role!=='astronaut'||identity.crew_id===crew),'WAVEFORM_UNAUTHORIZED',403);
}
function cutoff(before,now){check(instant(before)&&Date.parse(before)<=now,'WAVEFORM_CUTOFF');return before;}
function parse(format,bytes){check(['binary','csv'].includes(format),'WAVEFORM_FORMAT',415);return format==='binary'?decodeBinary(bytes):decodeCSV(bytes);}
function rows(store,crew){return store.db.prepare('SELECT * FROM waveform_sources WHERE crew_id=? ORDER BY revision,recording_id').all(crew);}
function body(row){let v;try{v=JSON.parse(row.json);}catch{check(false,'WAVEFORM_CORRUPT',503);}
  check(v&&v.crew_id===row.crew_id&&v.recording_id===row.recording_id&&v.revision===row.revision,'WAVEFORM_CORRUPT',503);return v;}
function verified(store,row){
  const r=body(row),bytes=new Uint8Array(row.original);check(r.schema_version==='astra.n08.recording.v1'&&isHash(r.original_sha256)&&sha(bytes)===r.original_sha256,'WAVEFORM_INTEGRITY',503);
  const {hash,...record}=r;check(hash===digest(record)&&instant(r.known_at)&&instant(r.submitted_at_host),'WAVEFORM_INTEGRITY',503);
  const decoded=parse(r.original_format,bytes),m=decoded.meta;
  check(canonical(m)===canonical(r.meta)&&m.crew_id===r.crew_id&&m.recording_id===r.recording_id&&m.revision===r.revision
    &&r.end_at===new Date(Date.parse(m.start_at)+m.sample_count*1000/m.sample_rate_hz).toISOString()&&r.end_at<=r.known_at
    &&sha(channelBytes(decoded.frames,0,1))===r.normalized_sha256,'WAVEFORM_INTEGRITY',503);
  const chunks=store.db.prepare('SELECT * FROM waveform_chunks WHERE crew_id=? AND recording_id=? AND revision=? ORDER BY channel,chunk_index').all(r.crew_id,r.recording_id,r.revision);
  const count=Math.ceil(m.sample_count/(m.sample_rate_hz*5));check(chunks.length===count*m.channels.length,'WAVEFORM_CHUNK_INTEGRITY',503);
  for(const [channelIndex,c] of m.channels.entries())for(let index=0;index<count;index++){
    const from=index*5*m.sample_rate_hz,to=Math.min(m.sample_count,from+5*m.sample_rate_hz),chunk=chunks.find(x=>x.channel===c.name&&x.chunk_index===index);
    check(chunk&&chunk.sample_count===to-from&&chunk.start_at===new Date(Date.parse(m.start_at)+from*1000/m.sample_rate_hz).toISOString()
      &&chunk.sha256===sha(chunk.samples)&&Buffer.from(chunk.samples).equals(Buffer.from(channelBytes(decoded.frames,channelIndex,m.channels.length,from,to))),'WAVEFORM_CHUNK_INTEGRITY',503);
  }
  return {record:r,decoded,chunks};
}
export function ingest(store,identity,crew,{format,bytes,expectedHash},now){
  authorize(identity,crew,true);check(bytes instanceof Uint8Array&&isHash(expectedHash)&&sha(bytes)===expectedHash,'WAVEFORM_HASH');
  const decoded=parse(format,bytes),m=decoded.meta;check(m.crew_id===crew,'WAVEFORM_CREW',403);
  const end_at=new Date(Date.parse(m.start_at)+m.sample_count*1000/m.sample_rate_hz).toISOString();check(Date.parse(end_at)<=now,'WAVEFORM_FUTURE');
  return store.transaction(()=>{
    const all=rows(store,crew),previous=all.filter(r=>r.recording_id===m.recording_id).at(-1);
    if(previous){const old=verified(store,previous).record;check(old.actor===identity.id,'WAVEFORM_OWNER',403);
      const duplicate=all.find(r=>r.recording_id===m.recording_id&&body(r).original_sha256===expectedHash);
      if(duplicate)return {source:verified(store,duplicate).record,idempotent:true};
      check(m.revision===old.revision+1&&m.supersedes_sha256===old.original_sha256,'WAVEFORM_REVISION_CONFLICT',409);
      for(const key of ['source','start_at','channels','sample_rate_hz','sample_count'])check(canonical(m[key])===canonical(old.meta[key]),'WAVEFORM_SOURCE_CONFLICT',409);
    }else check(m.revision===1&&m.supersedes_sha256===null,'WAVEFORM_REVISION_CONFLICT',409);
    const used=store.db.prepare('SELECT COALESCE(SUM(length(original)),0) AS n FROM waveform_sources WHERE crew_id=?').get(crew).n
      +store.db.prepare('SELECT COALESCE(SUM(length(samples)),0) AS n FROM waveform_chunks WHERE crew_id=?').get(crew).n;
    check(all.length<WAVE.maxRevisions&&used+bytes.length+decoded.frames.length*4<=WAVE.maxStoredBytes,'WAVEFORM_CAPACITY',409);
    const record={schema_version:'astra.n08.recording.v1',crew_id:crew,recording_id:m.recording_id,revision:m.revision,actor:identity.id,meta:m,
      end_at,known_at:new Date(now).toISOString(),submitted_at_host:new Date().toISOString(),original_format:format,original_sha256:expectedHash,
      normalized_sha256:sha(channelBytes(decoded.frames,0,1)),transform:WAVE.transform,clinical_validation:'NOT_VALIDATED',scientific_source:'AUTHORED_SYNTHETIC_ONLY'};
    record.hash=digest(record);
    store.db.prepare('INSERT INTO waveform_sources(crew_id,recording_id,revision,json,original) VALUES(?,?,?,?,?)').run(crew,m.recording_id,m.revision,JSON.stringify(record),bytes);
    for(const [j,c] of m.channels.entries())for(let from=0,index=0;from<m.sample_count;from+=5*m.sample_rate_hz,index++){
      const to=Math.min(m.sample_count,from+5*m.sample_rate_hz),samples=channelBytes(decoded.frames,j,m.channels.length,from,to);
      store.db.prepare('INSERT INTO waveform_chunks(crew_id,recording_id,revision,channel,chunk_index,start_at,sample_count,sha256,samples) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(crew,m.recording_id,m.revision,c.name,index,new Date(Date.parse(m.start_at)+from*1000/m.sample_rate_hz).toISOString(),to-from,sha(samples),samples);
    }
    store.audit(identity.id,'waveform.ingested',m.recording_id,{crew_id:crew,revision:m.revision,source_sha256:expectedHash,chunk_count:Math.ceil(m.sample_count/(m.sample_rate_hz*5))*m.channels.length});
    return {source:record,idempotent:false};
  });
}
export function list(store,identity,crew,before,now){
  authorize(identity,crew);cutoff(before,now);const latest=new Map();
  for(const row of rows(store,crew)){const b=body(row);if(b.known_at<=before&&b.end_at<=before)latest.set(row.recording_id,row);}
  const recordings=[...latest.values()].map(row=>verified(store,row).record).sort((a,b)=>a.recording_id.localeCompare(b.recording_id));
  return {schema_version:'astra.n08.sources.v1',status:recordings.length?'AVAILABLE':'UNKNOWN',crew_id:crew,as_of:before,recordings,
    retention:{max_revisions:WAVE.maxRevisions,max_payload_bytes:WAVE.maxStoredBytes,policy:'Preserve revisions; reject new writes at capacity. No read-side pruning.'},real_public_waveforms:'NOT_VERIFIED',twin:'INACTIVE_N06_GATE'};
}
function select(store,identity,crew,id,before,now){
  authorize(identity,crew);cutoff(before,now);check(safeId(id),'WAVEFORM_ID');
  const row=rows(store,crew).filter(r=>r.recording_id===id&&body(r).known_at<=before&&body(r).end_at<=before).at(-1);
  check(row,'WAVEFORM_UNAVAILABLE',404);return verified(store,row);
}
export function windowData(store,identity,crew,id,{before,channel,from_ms=0,until_ms,points=200},now){
  const {record:r,decoded:d}=select(store,identity,crew,id,before,now),duration=d.meta.sample_count*1000/d.meta.sample_rate_hz;
  check(Number.isSafeInteger(from_ms)&&Number.isSafeInteger(until_ms)&&from_ms>=0&&until_ms>=from_ms&&until_ms<=duration
    &&Number.isSafeInteger(points)&&points>=16&&points<=1000,'WAVEFORM_RANGE');
  const j=d.meta.channels.findIndex(c=>c.name===channel);check(j>=0,'WAVEFORM_CHANNEL');
  const start=Math.ceil(from_ms*d.meta.sample_rate_hz/1000),end=Math.ceil(until_ms*d.meta.sample_rate_hz/1000),samples=new Float32Array(end-start);
  for(let i=start;i<end;i++)samples[i-start]=d.frames[i*d.meta.channels.length+j];
  return {schema_version:WAVE.view,crew_id:crew,source_id:r.recording_id,source_sha256:r.original_sha256,revision:r.revision,known_at:r.known_at,
    source_start_at:d.meta.start_at,source_end_at:r.end_at,source_type:'SYNTHETIC / ARCHIVED WAVEFORM',unit:d.meta.channels[j].unit,channel,
    sample_rate_hz:d.meta.sample_rate_hz,from_ms,until_ms,sample_count:samples.length,normalization:WAVE.transform,
    ...analyzeWindow(samples,{meta:d.meta,channel,offset:start,points,source_sha256:r.original_sha256}),alert_authority:'N02 unchanged',runtime_downstream:'INACTIVE'};
}
export function readChunk(store,identity,crew,id,channel,index,before,now){
  const {record,chunks}=select(store,identity,crew,id,before,now);check(Number.isSafeInteger(index)&&index>=0&&index<12,'WAVEFORM_CHUNK');
  const chunk=chunks.find(c=>c.channel===channel&&c.chunk_index===index);check(chunk,'WAVEFORM_CHUNK_UNAVAILABLE',404);
  return {bytes:new Uint8Array(chunk.samples),sha256:chunk.sha256,source_sha256:record.original_sha256,start_at:chunk.start_at,sample_count:chunk.sample_count};
}
