import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store,hash } from '../services/api/store.mjs';
import { Comms } from '../services/comms/scheduler.mjs';
import { createApp } from '../services/api/server.mjs';
import { decodeScreenshot,numericGlyph,verifyGlyphReferences } from '../scripts/n04-p01-pixels.mjs';
import { deflateSync } from 'node:zlib';
import { installP01Probe } from '../scripts/n04-p01-probe.mjs';
import { assessTrial } from '../scripts/n04-p01-assess.mjs';

test('N04-P01: communication states,priority,bandwidth,jitter,loss,retry,blackout and reopened cursor match360 pre-repair golden steps',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/n04-p01-comms.json',import.meta.url)));
  for(const scenario of fixture.cases){
    const store=new Store();let comms=new Comms(store);comms.control(scenario.config,0);
    try{
      for(let i=0;i<6;i++)comms.enqueue({sequence:i,text:'x'.repeat(50+i*70)},0,{kind:'telemetry',priority:1+i%3,id:'fixture-'+i,observedAt:i});
      for(const [i,expected]of scenario.frames.entries()){
        if(i===12)comms.control({blackout:true},expected.now);if(i===22)comms.control({blackout:false},expected.now);if(i===55)comms=new Comms(store);
        const delivered=comms.step(expected.now).map(m=>m.id);
        assert.deepEqual(delivered,expected.delivered,scenario.name+' deliveries at'+expected.now);
        assert.equal(hash([comms.nextTxAt,store.list('comms_messages',100)]),expected.digest,scenario.name+' state at'+expected.now);
      }
    }finally{store.close();}
  }
});
test('N04-P01: packets that cannot transmit or arrive perform no full-payload reads or packet writes',()=>{
  const store=new Store(),comms=new Comms(store);comms.control({one_way_latency_ms:1000000,jitter_ms:0,bandwidth_kbps:1},0);
  try{
    comms.enqueue({text:'x'.repeat(100)},0,{id:'in-flight',kind:'telemetry'});comms.step(0);
    comms.enqueue({text:'waiting'},0,{id:'queued',kind:'telemetry'});
    const before=store.list('comms_messages'),cursor=comms.nextTxAt;let reads=0,writes=0;
    const oldPut=store.put,oldRecord=store.record;
    store.put=function(table,...args){if(table==='comms_messages')writes++;return oldPut.call(this,table,...args);};
    store.record=function(table,...args){if(table==='comms_messages')reads++;return oldRecord.call(this,table,...args);};
    comms.step(1);store.put=oldPut;store.record=oldRecord;
    assert.equal(writes,0);assert.equal(reads,0);assert.equal(comms.nextTxAt,cursor);assert.deepEqual(store.list('comms_messages'),before);
  }finally{store.close();}
});
test('N04-P01: exact due-time delivery retains original observation/transmission/reception and occurs only once',()=>{
  const store=new Store(),comms=new Comms(store);comms.control({one_way_latency_ms:1000,jitter_ms:0,bandwidth_kbps:1000},0);
  try{
    comms.enqueue({value:1},0,{id:'due-boundary',kind:'telemetry',observedAt:-100});comms.step(0);
    const packet=store.record('comms_messages','due-boundary');assert.equal(comms.step(packet.deliver_at-1).length,0);
    const [received]=comms.step(packet.deliver_at);assert.equal(received.id,'due-boundary');assert.equal(received.observed_at,-100);assert.equal(received.transmitted_at,0);assert.equal(received.received_at,packet.deliver_at);assert.equal(received.attempts,1);assert.equal(comms.step(packet.deliver_at).length,0);
  }finally{store.close();}
});
test('N04-P01: an actual due packet write failure rolls back telemetry,history,queue,state and transmission cursor together',async()=>{
  const app=createApp({autoTick:false});
  try{
    const engine=app.engine,store=app.store;engine.comms.nextTxAt=engine.state.now;store.set('comms_next_tx',engine.comms.nextTxAt);
    engine.comms.enqueue({test:'atomic'},engine.state.now,{id:'p01-fault',priority:9,kind:'telemetry'});
    const before=hash(engine.state),cursor=engine.comms.nextTxAt,rows=store.list('comms_messages'),counts=()=>['telemetry_points','snapshots','risk_events'].map(t=>store.db.prepare('SELECT COUNT(*) AS n FROM '+t).get().n),beforeCounts=counts(),old=store.put;
    store.put=function(table,id,value,...rest){if(table==='comms_messages'&&id==='p01-fault'&&value.status==='in_transit')throw new Error('injected due-write failure');return old.call(this,table,id,value,...rest);};
    assert.throws(()=>engine.tick(1),/injected due-write failure/);store.put=old;
    assert.equal(hash(engine.state),before);assert.equal(engine.comms.nextTxAt,cursor);assert.equal(store.get('comms_next_tx'),cursor);assert.deepEqual(store.list('comms_messages'),rows);assert.deepEqual(counts(),beforeCounts);
  }finally{await app.close();}
});
test('N04-P01: browser probe parses and discarded/warm-up observations cannot become trial samples',()=>{
  const listeners={},probeWindow={EventSource:class {addEventListener(name,fn){listeners[name]=fn;}}};let inspect;
  const document={querySelector(){throw Error('An inactive probe must not inspect or collect DOM');}};
  new Function('window','document','MutationObserver','('+installP01Probe.toString()+')()')(probeWindow,document,class{constructor(fn){inspect=fn;}observe(){}});
  inspect();assert.equal(probeWindow.__p01.samples.length,0);
});
test('N04-P01: captured glyph verification rejects blank/outside images,unsupported PNGs,wrong values and unreviewed text',()=>{
  const width=6,height=7,pixels=Buffer.alloc(width*height*3);for(const [x,y]of [[1,1],[2,1],[3,1],[1,2],[1,3],[2,3],[3,3],[1,4],[3,4],[1,5],[2,5],[3,5]])pixels.fill(220,(y*width+x)*3,(y*width+x)*3+3);
  const chunk=(name,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(name,4);data.copy(b,8);return b;},header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const raw=Buffer.concat(Array.from({length:height},(_,y)=>Buffer.concat([Buffer.from([0]),pixels.subarray(y*width*3,(y+1)*width*3)])));
  const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]),image=decodeScreenshot(png);
  assert.deepEqual(image.pixels,pixels);const glyph=numericGlyph(image,{x:0,y:0,width,height});assert.equal(glyph.ink_pixels,12);
  assert.throws(()=>decodeScreenshot(png.subarray(0,30)),/Truncated|incomplete/);assert.throws(()=>numericGlyph(image,{x:-1,y:0,width,height}),/outside/);assert.throws(()=>numericGlyph({...image,pixels:Buffer.alloc(pixels.length)},{x:0,y:0,width,height}),/No readable/);
  const seed={file:'reviewed.png',id:1,expected:'6',glyph,screenshot_sha256:'hash',ocr_matched:true},same={...seed,file:'later.png',id:2,ocr_matched:false};
  assert.equal(verifyGlyphReferences([same])[0].matched,false);assert.equal(verifyGlyphReferences([seed,same])[1].matched,true);assert.equal(verifyGlyphReferences([seed,{...same,expected:'8'}])[1].matched,false);
  assert.throws(()=>verifyGlyphReferences([seed,{...seed,expected:'8'}]),/Conflicting/);assert.equal(verifyGlyphReferences([same],[{file:same.file,id:2,expected:'6',screenshot_sha256:'different'}])[0].matched,false);
  assert.equal(verifyGlyphReferences([{...seed,glyph:null}])[0].matched,false);
  const dim={...same,glyph:null},review={file:dim.file,id:dim.id,expected:dim.expected,screenshot_sha256:dim.screenshot_sha256};
  const dimResults=verifyGlyphReferences([dim,{...dim,file:'unreviewed.png',id:3}],[review]);assert.equal(dimResults[0].matched,true);assert.equal(dimResults[1].matched,false);
});
test('N04-P01: global fast latency cannot conceal one failed metric,and source/text/clock gaps never count as acceptance',()=>{
  const medical=Array.from({length:6},(_,i)=>['heart_rate','spo2','sleep_duration'].map(metric=>({crew_id:'CREW-0'+(i+1),metric}))).flat(),keys=[...medical,...['co2_ppm','temperature_c','humidity_percent','dose_rate_msv_h'].map(metric=>({crew_id:'CABIN',metric,environment:true}))],samples=[],captures=[],verified=[],sources=new Map();
  for(let second=0;second<60;second++){
    const origin=1000+second*1000,capture={file:second+'.png',observed_at:new Date(origin).toISOString(),metric_ids:[],capture_completed_host_ms:origin+80};captures.push(capture);
    for(const key of keys){const id=samples.length,event_id='event-'+id,observed_at=new Date(origin).toISOString();sources.set(event_id,{crew_id:key.crew_id,metric:{name:key.metric,value:70},ts:observed_at,provenance:{synthetic:true,seed:1,generator_version:'test',scenario_id:'nominal'},integrity:'verified',quality:{status:'good'},source:{kind:'simulator'},ingestion:{host_received_at:observed_at}});
      samples.push({...key,id,event_id:key.environment?null:event_id,observed_at,snapshot_observed_at:observed_at,expected_numeric:'70',source_kind:'simulator',origin_host_ms:origin,dom_host_ms:origin+50,dom_delay_ms:50,capture_bound_ms:80,visible:true,unobscured:true,latency_origin:key.environment?'Synthetic batch processing start;no independent sensor ingestion event':'Server-owned metric ingestion'});capture.metric_ids.push(id);verified.push({file:capture.file,id,expected:'70',matched:true});
    }
  }
  const trial={name:'test',rate:1,context:'overview',mode:'standard',before:[{status:'queued',packets:900,bytes:60000000}],samples,captures,host:Array.from({length:60},(_,i)=>({observed_at:new Date(1000+i*1000).toISOString(),tick_ms:1,deadline_lateness_ms:0})),trace_data_loss:false},lookup=id=>sources.get(id);
  assert.equal(assessTrial(trial,verified,lookup,()=>60).passed,true);
  const slow=structuredClone(trial),slowSources=new Map([...sources].map(([k,v])=>[k,structuredClone(v)]));
  for(const sample of slow.samples)if(sample.crew_id==='CREW-01'&&sample.metric==='heart_rate'){
    sample.origin_host_ms-=470;sample.dom_delay_ms+=470;sample.capture_bound_ms+=470;slowSources.get(sample.event_id).ingestion.host_received_at=new Date(sample.origin_host_ms).toISOString();
  }
  const result=assessTrial(slow,verified,id=>slowSources.get(id),()=>60);assert.equal(result.passed,false);assert.equal(result.capture_bound_p95_ms,80);assert.ok(result.groups.some(g=>g.key==='CREW-01:heart_rate'&&g.capture_bound_p95_ms===550));
  assert.equal(assessTrial(trial,verified.slice(1),lookup,()=>60).passed,false);assert.equal(assessTrial(trial,verified,()=>null,()=>60).passed,false);
  const badClock=structuredClone(trial);badClock.samples[0].dom_delay_ms=1;assert.equal(assessTrial(badClock,verified,lookup,()=>60).passed,false);
  assert.equal(assessTrial(trial,verified,lookup,()=>59).passed,false);assert.equal(assessTrial(trial,verified,lookup).passed,false);
  assert.equal(assessTrial({...trial,before:[]},verified,lookup,()=>60).passed,false);
});
