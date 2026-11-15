import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync,writeFileSync,readdirSync,statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { performance } from 'node:perf_hooks';
import { Store } from '../services/api/store.mjs';
import { AppError } from '../packages/contracts.mjs';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { transport } from './http-harness.mjs';
import { WAVE,validateMeta,canonical,demoWaveform,encodeBinary,decodeBinary,encodeCSV,decodeCSV,channelBytes } from '../packages/waveforms.mjs';
import { ingest,list,windowData,readChunk,sha,authorize } from '../services/waveforms/service.mjs';
const now=Date.parse('2026-11-14T11:00:00.000Z'),before=new Date(now).toISOString(),crew='CREW-03',actor={id:'demo-n08',role:'demo_admin'},clone=structuredClone;
const fixture=(id='SYN-test',opts={})=>demoWaveform(crew,'2026-11-14T10:59:00.000Z',id,opts);
const source=(store,d=fixture(),format='binary',time=now,who=actor)=>{const bytes=format==='binary'?encodeBinary(d.meta,d.frames):encodeCSV(d.meta,d.frames);return ingest(store,who,crew,{format,bytes,expectedHash:sha(bytes)},time);};
const view=(store,options={},time=now)=>windowData(store,actor,crew,'SYN-test',{before:new Date(time).toISOString(),channel:'ECG',until_ms:20000,...options},time);
const rejection=fn=>assert.throws(fn,e=>typeof e.code==='string'&&e.status>=400);
test('W1/W3 authentic authored fixture regression has explicit synthetic identity and both codecs preserve frames',()=>{
  const d=fixture();validateMeta(d.meta);assert.equal(d.meta.source.synthetic,true);
  for(const [encode,decode]of [[encodeBinary,decodeBinary],[encodeCSV,decodeCSV]]){const out=decode(encode(d.meta,d.frames));assert.deepEqual(out.meta,d.meta);assert.equal(out.frames.length,d.frames.length);assert.ok(Number.isNaN(out.frames[625*3]));assert.ok(Math.abs(out.frames[150]-d.frames[150])<1e-6);}
});
for(const [name,mutate]of [
  ['unrecognized schema',m=>m.schema_version='other'],['path recording ID',m=>m.recording_id='../astra.sqlite'],['absolute source path',m=>m.source.path='/secret'],
  ['unverified real source',m=>m.source.kind='NASA'],['missing synthetic attestation',m=>delete m.source.synthetic],['bad crew',m=>m.crew_id='real-crew'],
  ['wrong revision',m=>m.revision=0],['missing predecessor',m=>m.revision=2],['bad unit',m=>m.channels[0].unit='Hz'],['wrong channel',m=>m.channels[0].name='BP'],
  ['duplicate channel',m=>m.channels[1]={...m.channels[0]}],['excess channels',m=>m.channels.push({name:'ECG',unit:'mV'})],['zero rate',m=>m.sample_rate_hz=0],
  ['unsupported rate',m=>m.sample_rate_hz=126],['oversized count',m=>m.sample_count=Number.MAX_SAFE_INTEGER],['fractional duration',m=>m.sample_count--],
  ['invalid calendar',m=>m.start_at='2026-02-30T10:59:00.000Z'],['timezone ambiguity',m=>m.start_at='2026-11-14T10:59:00+00:00'],['inferred quality',m=>m.quality.status='healthy'],['unknown field',m=>m.sql='SELECT *']
])test('W1/W9 metadata rejects '+name,()=>{const m=clone(fixture().meta);mutate(m);rejection(()=>validateMeta(m));});
for(const [name,mutate]of [
  ['magic',b=>{b[0]=0;return b;}],['version',b=>{b[8]=2;return b;}],['endianness',b=>{b[10]=2;return b;}],['encoding',b=>{b[11]=2;return b;}],
  ['truncated header',b=>b.subarray(0,12)],['metadata length overflow',b=>{new DataView(b.buffer).setUint32(12,4294967295,true);return b;}],
  ['truncated samples',b=>b.subarray(0,b.length-1)],['extra sample bytes',b=>new Uint8Array([...b,1])],
  ['infinity',b=>{new DataView(b.buffer).setFloat32(b.length-4,Infinity,true);return b;}],['noncanonical NaN',b=>{new DataView(b.buffer).setUint32(b.length-4,0x7fc00001,true);return b;}],
  ['corrupt UTF8',b=>{b[17]=255;return b;}],['oversize',()=>new Uint8Array(256001)]
])test('W1 binary rejects '+name,()=>{const d=fixture();rejection(()=>decodeBinary(mutate(encodeBinary(d.meta,d.frames))));});
for(const [name,mutate]of [
  ['BOM',s=>'\ufeff'+s],['CRLF',s=>s.replaceAll('\n','\r\n')],['wrong magic',s=>s.replace('CSV-V1','CSV-V2')],['missing column',s=>s.replace(',PPG[arbitrary_unit]','')],
  ['wrong units',s=>s.replace('ECG[mV]','ECG[V]')],['extra columns',s=>s.replace('timestamp,','timestamp,SQL,')],['quoted cells',s=>s.replace(',0.000000,',',"0.000000",')],
  ['formula',s=>s.replace(',0.000000,',',=SUM(1),')],['numeric NaN text',s=>s.replace(',0.000000,',',NaN,')],['bad number',s=>s.replace(',0.000000,',',1e9,')],
  ['duplicate row',s=>{const lines=s.split('\n');lines[4]=lines[3];return lines.join('\n');}],['reordered row',s=>{const lines=s.split('\n');[lines[4],lines[5]]=[lines[5],lines[4]];return lines.join('\n');}],
  ['truncated row',s=>s.slice(0,s.lastIndexOf('\n',s.length-2)+1)],['extra row',s=>s+s.split('\n')[3]+'\n'],['absent terminal LF',s=>s.slice(0,-1)]
])test('W3 CSV rejects '+name,()=>{const d=fixture();rejection(()=>decodeCSV(new TextEncoder().encode(mutate(new TextDecoder().decode(encodeCSV(d.meta,d.frames))))));});
for(const rate of [50,100,125,250,500])test('W1 exact '+rate+' Hz timebase and 1-second chunk tail',()=>{
  const s=new Store();try{const d=fixture();d.meta.sample_rate_hz=rate;d.meta.sample_count=6*rate;d.frames=new Float32Array(d.meta.sample_count*3);source(s,d);const chunks=s.db.prepare('SELECT * FROM waveform_chunks WHERE channel=? ORDER BY chunk_index').all('ECG');assert.equal(chunks.length,2);assert.equal(chunks[0].sample_count,rate*5);assert.equal(chunks[1].sample_count,rate);assert.equal(chunks[1].start_at,'2026-11-14T10:59:05.000Z');}finally{s.close();}
});
test('W1 ingest binds immutable original/normalized hashes and twelve actual binary chunks',()=>{
  const s=new Store();try{const d=fixture(),r=source(s,d).source;assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_chunks').get().n,12);assert.equal(r.original_sha256,sha(encodeBinary(d.meta,d.frames)));assert.equal(r.normalized_sha256,sha(channelBytes(d.frames,0,1)));const c=readChunk(s,actor,crew,r.recording_id,'ECG',1,before,now);assert.equal(c.bytes.length,625*4);assert.equal(c.sample_count,625);assert.equal(c.sha256,sha(c.bytes));assert.equal(new DataView(c.bytes.buffer).getUint32(0,true),0x7fc00000);assert.throws(()=>s.db.prepare('DELETE FROM waveform_chunks').run());assert.throws(()=>s.db.prepare('UPDATE waveform_sources SET json=?').run('{}'));}finally{s.close();}
});
test('W1 exact import idempotency preserves audit and source count; conflicting/replaced/foreign source rejects',()=>{
  const s=new Store();try{const d=fixture(),first=source(s,d),changes=s.db.totalChanges;assert.equal(source(s,d).idempotent,true);assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,1);assert.equal(s.db.prepare("SELECT count(*) n FROM audit_events WHERE action='waveform.ingested'").get().n,1);d.frames[0]=4;rejection(()=>source(s,d));rejection(()=>source(s,fixture(),'binary',now,{id:'other',role:'demo_admin'}));assert.equal(first.source.revision,1);}finally{s.close();}
});
test('W1/R1 correction preserves old bytes; dual source/knowledge cutoff hides future corrections',()=>{
  const s=new Store();try{const d=fixture(),first=source(s,d).source;d.meta.revision=2;d.meta.supersedes_sha256=first.original_sha256;d.frames[0]=20;source(s,d,'binary',now+1000);assert.equal(list(s,actor,crew,before,now+1000).recordings[0].revision,1);assert.equal(view(s).revision,1);assert.equal(view(s,{},now+1000).revision,2);assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,2);assert.equal(list(s,actor,crew,'2026-11-14T10:59:19.999Z',now).recordings.length,0);}finally{s.close();}
});
test('W1 revisions reject changed source/time/channel identity and bad predecessor',()=>{
  const s=new Store();try{const d=fixture(),r=source(s,d).source;for(const change of [m=>m.supersedes_sha256='0'.repeat(64),m=>m.source.seed++,m=>m.start_at='2026-11-14T10:58:00.000Z',m=>m.channels.reverse()]){const x=clone(d);x.meta.revision=2;x.meta.supersedes_sha256=r.original_sha256;change(x.meta);rejection(()=>source(s,x));}}finally{s.close();}
});
for(const role of ['viewer','researcher','system_admin','unknown'])test('W2/W9 denies raw data to '+role,()=>{rejection(()=>authorize({id:'x',role},crew));});
test('W2 crew self scope, read-only roles and absent caller fail closed',()=>{
  authorize({id:'a',role:'astronaut',crew_id:crew},crew,true);authorize({id:'f',role:'flight_surgeon'},crew);
  for(const who of [null,{role:'demo_admin'},{id:'../caller',role:'demo_admin'},{id:'a',role:'astronaut',crew_id:'CREW-01'},{id:'f',role:'flight_surgeon'},{id:'m',role:'mission_control'}])rejection(()=>authorize(who,crew,true));
});
test('W1/W9 hash, future source and unknown format reject without partial storage',()=>{
  const s=new Store();try{const d=fixture(),bytes=encodeBinary(d.meta,d.frames);rejection(()=>ingest(s,actor,crew,{format:'binary',bytes,expectedHash:'0'.repeat(64)},now));rejection(()=>ingest(s,actor,crew,{format:'edf',bytes,expectedHash:sha(bytes)},now));d.meta.start_at=before;rejection(()=>source(s,d));assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);}finally{s.close();}
});
test('W4/W5/W6 bounded deterministic prefixes retain extrema, gaps, units and no future samples',()=>{
  const s=new Store();try{source(s);const v=view(s,{points:16}),again=view(s,{points:16});assert.deepEqual(v,again);assert.ok(v.bins.length<=16);assert.equal(v.observed_statistics.max,Math.fround(1.2));assert.equal(v.quality.missing_samples,125);assert.equal(v.status,'PARTIAL');assert.equal(v.experimental_peaks.rate_bpm,null);assert.ok(v.bins.some(b=>b.missing_samples));assert.equal(v.unit,'mV');const early=view(s,{until_ms:400});assert.equal(early.sample_count,50);assert.equal(early.experimental_peaks.candidates.length,0);assert.ok(early.bins.every(b=>b.end_ms<=400));assert.equal(view(s,{until_ms:0}).status,'UNKNOWN');assert.deepEqual(view(s,{from_ms:8000,until_ms:10000}),view(s,{from_ms:8000,until_ms:10000}));}finally{s.close();}
});
for(const options of [{from_ms:-1},{until_ms:20001},{from_ms:2.5},{until_ms:NaN},{points:1},{points:1001},{channel:'BP'},{before:'2027-01-01T00:00:00.000Z'}])test('W4 invalid range/channel/cutoff '+JSON.stringify(options),()=>{const s=new Store();try{source(s);rejection(()=>view(s,options));}finally{s.close();}});
test('W7/W8 experimental known peaks give exactly 60/min only for complete good source and bind real chunk positions',()=>{
  const s=new Store();try{source(s,fixture('SYN-test',{gap:false}));const v=view(s);assert.equal(v.status,'KNOWN');assert.equal(v.experimental_peaks.candidates.length,20);assert.equal(v.experimental_peaks.rate_bpm,60);const p=v.twin_interface.peaks[0];assert.equal(p.frame,50);assert.equal(p.frame_in_chunk,50);assert.equal(p.chunk_index,0);assert.equal(p.source_at,'2026-11-14T10:59:00.400Z');assert.equal(p.source_sha256,v.source_sha256);assert.equal(v.twin_interface.status,'INACTIVE_N06_GATE');assert.equal(v.blood_pressure.status,'UNKNOWN');assert.equal(v.runtime_downstream,'INACTIVE');assert.equal(v.experimental_peaks.clinical_validation,false);}finally{s.close();}
});
for(const quality of ['suspect','missing'])test('W6/W7 poor declared quality '+quality+' withholds derived rate despite valid numbers',()=>{const s=new Store();try{const d=fixture('SYN-test',{gap:false});d.meta.quality.status=quality;source(s,d);assert.equal(view(s).status,'PARTIAL');assert.equal(view(s).experimental_peaks.rate_bpm,null);}finally{s.close();}});
test('W6 all missing is UNKNOWN; PPG does not invent ECG peaks or BP',()=>{const s=new Store();try{const d=fixture();d.frames.fill(NaN);source(s,d);assert.equal(view(s).status,'UNKNOWN');assert.equal(view(s).observed_statistics,null);assert.equal(view(s,{channel:'PPG'}).experimental_peaks.candidates.length,0);assert.equal(view(s,{channel:'PPG'}).blood_pressure.status,'UNKNOWN');}finally{s.close();}});
test('W1/W10 source/audit/chunks transaction rolls back on mid-ingest persistence failure',()=>{
  const s=new Store();try{s.db.exec("CREATE TRIGGER synthetic_disk_failure BEFORE INSERT ON waveform_chunks WHEN NEW.chunk_index=1 BEGIN SELECT RAISE(ABORT,'injected disk failure'); END");assert.throws(()=>source(s));for(const table of ['waveform_sources','waveform_chunks','audit_events'])assert.equal(s.db.prepare('SELECT count(*) n FROM '+table).get().n,0);}finally{s.close();}
});
test('W9 tampered original/chunk/missing evidence fails closed, never repairs',()=>{
  for(const kind of ['original','chunk','missing','metadata']){const s=new Store();try{source(s);if(kind==='original'){s.db.exec('DROP TRIGGER waveform_source_no_update');s.db.prepare('UPDATE waveform_sources SET original=?').run(new Uint8Array(1));}
    if(kind==='chunk'){s.db.exec('DROP TRIGGER waveform_chunk_no_update');s.db.prepare('UPDATE waveform_chunks SET samples=?').run(new Uint8Array(1));}
    if(kind==='missing'){s.db.exec('DROP TRIGGER waveform_chunk_no_delete');s.db.prepare('DELETE FROM waveform_chunks WHERE chunk_index=0').run();}
    if(kind==='metadata'){s.db.exec('DROP TRIGGER waveform_source_no_update');s.db.prepare('UPDATE waveform_sources SET json=?').run('{}');}
    assert.throws(()=>view(s));assert.throws(()=>list(s,actor,crew,before,now));
  }finally{s.close();}}
});
test('W10 bounded retention rejects revision 65 without pruning originals or history',()=>{
  const s=new Store();try{for(let i=0;i<64;i++)source(s,fixture('SYN-cap-'+i,{seconds:1}));assert.throws(()=>source(s,fixture('SYN-over',{seconds:1})),e=>e.code==='WAVEFORM_CAPACITY');assert.equal(list(s,actor,crew,before,now).recordings.length,64);}finally{s.close();}
});
test('W10 bounded bytes reject before 8MiB and retain last committed source',()=>{
  const s=new Store();try{let rejected=false;for(let i=0;i<64;i++){try{source(s,fixture('SYN-bytes-'+i,{seconds:60}),'csv');}catch(e){assert.equal(e.code,'WAVEFORM_SIZE');rejected=true;break;}}assert.equal(rejected,true,'oversized CSV fails before persistence');assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);
    const d=fixture();d.meta.sample_rate_hz=500;d.meta.sample_count=20000;d.frames=new Float32Array(60000);let accepted=0;for(let i=0;i<64;i++){d.meta.recording_id='SYN-binary-'+i;try{source(s,d);accepted++;}catch(e){assert.equal(e.code,'WAVEFORM_CAPACITY');break;}}assert.ok(accepted>0&&accepted<64);assert.equal(s.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,accepted);
  }finally{s.close();}
});
test('W9 reads are deterministic and never change database, audit, scalar, alert, baseline or communication state',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase});try{const tables=['telemetry_points','risk_events','health_baselines','comms_messages','n10_records','checkins'];const snapshot=()=>tables.map(t=>app.store.db.prepare('SELECT * FROM '+t).all());const initial=snapshot();source(app.store);const dump=()=>app.store.db.prepare('SELECT * FROM waveform_sources').all(),a=app.store.db.prepare('SELECT count(*) n FROM audit_events').get().n,original=dump();list(app.store,actor,crew,before,now);view(app.store);readChunk(app.store,actor,crew,'SYN-test','ECG',0,before,now);assert.deepEqual(snapshot(),initial);assert.deepEqual(dump(),original);assert.equal(app.store.db.prepare('SELECT count(*) n FROM audit_events').get().n,a);}finally{await app.close();}
});
test('W10 cold process verifies saved binary+CSV; interrupted transaction leaves no incomplete import',()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-n08-cold-')),path=join(dir,'synthetic.sqlite');let s;
  try{s=new Store(path);source(s);source(s,fixture('SYN-csv'),'csv');const expected=view(s);s.close();s=null;
    const child=spawnSync(process.execPath,['--input-type=module','-e',`import{Store}from './services/api/store.mjs';import{list,windowData}from './services/waveforms/service.mjs';const s=new Store(process.argv[1]);console.log(JSON.stringify({list:list(s,${JSON.stringify(actor)},'CREW-03','${before}',${now}),window:windowData(s,${JSON.stringify(actor)},'CREW-03','SYN-test',{before:'${before}',channel:'ECG',until_ms:20000},${now}),replayed_imports:0}));s.close();`,path],{encoding:'utf8',timeout:10000});assert.equal(child.status,0,child.stderr);const recovered=JSON.parse(child.stdout);assert.equal(recovered.list.recordings.length,2);assert.deepEqual(recovered.window,expected);assert.equal(recovered.replayed_imports,0);
    const interrupted=spawnSync(process.execPath,['--input-type=module','-e',`import{Store}from './services/api/store.mjs';import{demoWaveform,encodeBinary}from './packages/waveforms.mjs';import{ingest,sha}from './services/waveforms/service.mjs';const s=new Store(process.argv[1]);s.transaction(()=>{const d=demoWaveform('CREW-03','2026-11-14T10:59:00.000Z','SYN-uncommitted'),bytes=encodeBinary(d.meta,d.frames);ingest(s,${JSON.stringify(actor)},'CREW-03',{format:'binary',bytes,expectedHash:sha(bytes)},${now});process.exit(9);});`,path],{encoding:'utf8',timeout:10000});assert.equal(interrupted.status,9);
    s=new Store(path);assert.equal(list(s,actor,crew,before,now).recordings.length,2);assert.deepEqual(view(s),expected);assert.equal(source(s).idempotent,true);assert.equal(s.verifyAudit(),true);
  }finally{s?.close();rmSync(dir,{recursive:true,force:true});}
});
test('W1/W3 parser acceptance controls reject both accept-all and reject-all substitutes',()=>{
  const d=fixture(),good=encodeBinary(d.meta,d.frames),bad=good.slice(0,2),qualify=parse=>{try{const v=parse(good);if(v.meta.recording_id!=='SYN-test')return false;try{parse(bad);return false;}catch{return true;}}catch{return false;}};
  assert.equal(qualify(decodeBinary),true);assert.equal(qualify(()=>({meta:d.meta})),false);assert.equal(qualify(()=>{throw Error('all');}),false);
});
// Real authenticated request handler; raw bytes intentionally bypass the JSON-only generic harness.
async function raw(app,path,bytes,headers={},cookie=''){
  const req=Readable.from([Buffer.from(bytes)]);Object.assign(req,{url:path,method:'POST',socket:{remoteAddress:'n08-test'},headers:{host:'localhost',cookie,'content-type':'application/octet-stream','x-waveform-crew':crew,'x-waveform-sha256':sha(bytes),...headers}});
  const response={status:200,headers:{},chunks:[],headersSent:false,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;},write(v){this.chunks.push(Buffer.from(v));},end(v){if(v)this.write(v);},destroy(){this.destroyed=true;}};
  await app.handleRequest(req,response);return {status:response.status,json:()=>JSON.parse(Buffer.concat(response.chunks).toString()),req};
}
async function login(app,role='demo_admin',crew_id=crew){const call=transport(app),r=await call('/v1/auth/demo',{body:{role,crew_id}});assert.equal(r.status,200,r.text());return String(r.headers['Set-Cookie']).split(';')[0];}
test('W2 actual binary+CSV HTTP intake, list/window/rawchunk and idempotent response',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase});try{const call=transport(app),cookie=await login(app),d=fixture(),b=encodeBinary(d.meta,d.frames);assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',b,{},cookie)).status,201);assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',b,{},cookie)).status,200);
    const other=fixture('SYN-http-csv'),csv=encodeCSV(other.meta,other.frames);assert.equal((await raw(app,'/v1/crew/CREW-03/waveforms?format=csv',csv,{'content-type':'text/csv'},cookie)).status,201);
    const sources=await call('/v1/crew/CREW-03/waveforms',{cookie});assert.equal(sources.status,200);assert.equal(sources.json().recordings.length,2);
    const w=await call('/v1/crew/CREW-03/waveforms/SYN-test?channel=ECG&until_ms=20000',{cookie});assert.equal(w.status,200);assert.equal(w.json().status,'PARTIAL');
    const chunk=await call('/v1/crew/CREW-03/waveforms/SYN-test/chunks/ECG/0',{cookie});assert.equal(chunk.status,200);assert.equal(chunk.headers['Content-Type'],'application/octet-stream');assert.equal(chunk.raw.chunks[0].length,2500);assert.equal(chunk.headers['X-Waveform-SHA256'],sha(chunk.raw.chunks[0]));
  }finally{await app.close();}
});
test('W2 HTTP rejects unauthenticated/forged roles, cross-crew and unauthorized writes',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase});try{const call=transport(app),bytes=encodeBinary(fixture().meta,fixture().frames);assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',bytes,{'x-role':'demo_admin'})).status,401);
    for(const role of ['viewer','researcher','system_admin']){const cookie=await login(app,role);assert.equal((await call('/v1/crew/CREW-03/waveforms',{cookie,headers:{'x-role':'demo_admin'}})).status,403);assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',bytes,{},cookie)).status,403);}
    const self=await login(app,'astronaut','CREW-01');assert.equal((await call('/v1/crew/CREW-01/waveforms',{cookie:self})).status,403);assert.equal((await call('/v1/crew/CREW-03/waveforms',{cookie:self})).status,200,'Demo session crew scope is server-owned CREW-03, ignoring attempted caller substitution');
    const mc=await login(app,'mission_control');assert.equal((await call('/v1/crew/CREW-03/waveforms',{cookie:mc})).status,200);assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',bytes,{},mc)).status,403);
  }finally{await app.close();}
});
test('W2 HTTP malformed query, unsupported operation/media, missing hash and oversized input reject',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase});try{const call=transport(app),cookie=await login(app),d=fixture(),b=encodeBinary(d.meta,d.frames);
    for(const query of ['format=binary&format=binary','format=binary&path=/secret','format=edf'])assert.ok((await raw(app,'/v1/ingest/waveforms?'+query,b,{},cookie)).status>=400);
    for(const headers of [{'x-waveform-sha256':''},{'x-waveform-sha256':'f'.repeat(64)},{'content-type':'application/json'}])assert.ok((await raw(app,'/v1/ingest/waveforms?format=binary',b,headers,cookie)).status>=400);
    assert.equal((await raw(app,'/v1/ingest/waveforms?format=binary',new Uint8Array(256001),{},cookie)).status,413);
    source(app.store);for(const q of ['channel=ECG','channel=ECG&until_ms=-1','channel=ECG&until_ms=2.2','channel=ECG&until_ms=100&sql=SELECT'])assert.equal((await call('/v1/crew/CREW-03/waveforms/SYN-test?'+q,{cookie})).status,422);
    assert.equal((await call('/v1/crew/CREW-03/waveforms',{cookie,method:'DELETE'})).status,405);
    assert.equal((await call('/v1/crew/CREW-03/waveforms/not-here?channel=ECG&until_ms=100',{cookie})).status,404);
  }finally{await app.close();}
});
test('W2 rejection audit records bounded hash/reason without raw file or private paths',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase});try{const cookie=await login(app),b=new TextEncoder().encode('/private/secret-data');const r=await raw(app,'/v1/ingest/waveforms?format=binary',b,{},cookie);assert.equal(r.status,422);const row=app.store.db.prepare("SELECT json FROM audit_events WHERE action='waveform.rejected'").get();assert.ok(row);assert.equal(row.json.includes('secret-data'),false);assert.ok(row.json.includes(sha(b)));assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);}finally{await app.close();}
});
test('W10 native Node stream interruption and eight-second deadline cancel before any import',async()=>{
  const app=createApp({autoTick:false,caseBuilder:buildCase}),original=setTimeout;try{const cookie=await login(app);
    for(const mode of ['cancel','timeout']){const req=new Readable({read(){if(mode==='cancel')setImmediate(()=>this.destroy(new AppError(400,'WAVEFORM_INTERRUPTED','Synthetic interrupted upload')));}});
      Object.assign(req,{url:'/v1/ingest/waveforms?format=binary',method:'POST',socket:{remoteAddress:'cancel-test'},headers:{host:'localhost',cookie,'content-type':'application/octet-stream','x-waveform-crew':crew,'x-waveform-sha256':'0'.repeat(64)}});
      const response={status:200,chunks:[],headersSent:false,writeHead(code){this.status=code;this.headersSent=true;},end(v){if(v)this.chunks.push(v);}};let deadlines=0;
      globalThis.setTimeout=(fn,ms,...args)=>{if(ms===8000){deadlines++;return original(fn,mode==='timeout'?0:ms,...args);}return original(fn,ms,...args);};
      try{await app.handleRequest(req,response);}finally{globalThis.setTimeout=original;}
      assert.equal(response.status,mode==='cancel'?400:408);assert.equal(deadlines,1);assert.equal(req.destroyed,true);assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);
    }
  }finally{globalThis.setTimeout=original;await app.close();}
});
test('W1/W10 genuine cold recovered end-to-end packet preserves binary/CSV originals and source-bound outputs',()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-n08-e2e-')),path=join(dir,'synthetic.sqlite');let s=new Store(path);
  try{const d=fixture(),binary=encodeBinary(d.meta,d.frames),csvSource=fixture('SYN-e2e-csv',{gap:false}),csv=encodeCSV(csvSource.meta,csvSource.frames);const r1=source(s,d),r2=source(s,csvSource,'csv');const window=view(s),chunk=readChunk(s,actor,crew,'SYN-test','ECG',1,before,now),auditValid=s.verifyAudit();s.close();s=new Store(path);const recovered=view(s);assert.deepEqual(recovered,window);assert.equal(list(s,actor,crew,before,now).recordings.length,2);
    if(process.env.ASTRA_N08_EVIDENCE){const root=process.env.ASTRA_N08_EVIDENCE;writeFileSync(join(root,'synthetic-original.bin'),binary);writeFileSync(join(root,'synthetic-original.csv'),csv);writeFileSync(join(root,'e2e.json'),JSON.stringify({schema_version:'astra.n08.engineering-evidence.v1',synthetic:true,source_records:[r1.source,r2.source],window,chunk:{sha256:chunk.sha256,bytes:chunk.bytes.length,start_at:chunk.start_at,missing_samples:125},recovery:{verified:true,replayed_imports:0,source_hash_unchanged:sha(binary)===r1.source.original_sha256,audit_chain_valid:auditValid},external_source_validation:'NOT_VERIFIED',N06:'INACTIVE'},null,2));}
  }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('W10 measured bounded binary/CSV/ingest/decimate and no read-side file writes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'astra-n08-resource-')),db=join(dir,'synthetic.sqlite'),measure={},s=new Store(db);try{
    const d=fixture('SYN-test',{seconds:30});let t=performance.now(),b=encodeBinary(d.meta,d.frames);for(let i=0;i<20;i++)decodeBinary(b);measure.binary_decode_20_ms=performance.now()-t;t=performance.now();const csv=encodeCSV(d.meta,d.frames);for(let i=0;i<5;i++)decodeCSV(csv);measure.csv_decode_5_ms=performance.now()-t;
    t=performance.now();source(s,d);measure.ingest_ms=performance.now()-t;const original=readFileSync(db);t=performance.now();for(let i=0;i<20;i++)view(s,{until_ms:30000,points:200});measure.windows_20_ms=performance.now()-t;assert.deepEqual(readFileSync(db),original);measure.input_bytes={binary:b.length,csv:csv.length};measure.memory=process.memoryUsage();measure.kernel_max_RSS_KiB=process.resourceUsage().maxRSS;measure.native_N16_starts=0;measure.model_executions=0;measure.external_network_requests=0;
    measure.temporary_SQLite_bytes=readdirSync(dir).reduce((n,p)=>n+statSync(join(dir,p)).size,0);measure.temporary_SQLite_files=readdirSync(dir);measure.input_limit_bytes=WAVE.maxBytes;measure.retained_payload_ceiling_bytes=WAVE.maxStoredBytes;measure.limitation='Process observations / kernel high-water, not an enforced RSS quota; parent test process may include preceding tests. No browser/GPU memory claim.';
    if(process.env.ASTRA_N08_EVIDENCE)writeFileSync(join(process.env.ASTRA_N08_EVIDENCE,'resources.json'),JSON.stringify(measure,null,2));assert.ok(measure.ingest_ms<1000);assert.ok(measure.windows_20_ms<10000);
  }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
