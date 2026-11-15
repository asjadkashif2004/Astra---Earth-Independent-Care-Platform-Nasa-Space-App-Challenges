import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createApp } from '../services/api/server.mjs';
import { transport } from './http-harness.mjs';
import { frontendSession } from './dom-harness.mjs';
import { sparkline } from '../apps/mission-control-web/ui.mjs';
import { frameEvidence,metricPresentationEvidence } from '../scripts/frame-evidence.mjs';
import { METRIC_PROBE } from '../scripts/browser-n04.mjs';
import { Script } from 'node:vm';

test('N04: browser-injected telemetry instrumentation parses before launching an acceptance trial',()=>{assert.doesNotThrow(()=>new Script(METRIC_PROBE));});

test('N04: telemetry presentation requires a metric marker and a committed complete frame before the next metric',()=>{
  const events=[{name:'process_name',pid:1,args:{name:'Renderer'}},{name:'n04-metric-dom-0',ts:1000},{name:'n04-metric-dom-1',ts:4000},
    {name:'PipelineReporter',ph:'b',pid:1,id2:{local:'a'},ts:900,args:{frame_reporter:{state:'STATE_PRESENTED_ALL'}}},
    {name:'Commit',ph:'b',pid:1,id2:{local:'a'},ts:1200},{name:'PipelineReporter',ph:'e',pid:1,id2:{local:'a'},ts:1800}];
  const r=metricPresentationEvidence(events,[{id:0,dom_delay_ms:20},{id:1,dom_delay_ms:30}]);assert.equal(r.supported,false);assert.equal(r.samples[0].end_to_end_feedback_ms,20.8);assert.equal(r.samples[1].supported,false);
});
test('N04: trace parsing preserves reused asynchronous IDs and sorts cross-thread trace packets before pairing',()=>{
  const events=[{name:'process_name',pid:1,args:{name:'Renderer'}},{name:'start',ts:0},{name:'n04-metric-dom-0',ts:1000},{name:'n04-metric-dom-1',ts:3000}];
  for(const [seq,start]of [[1,900],[2,2900]])events.push({name:'PipelineReporter',ph:'b',pid:1,id2:{local:'reused'},ts:start,args:{frame_reporter:{state:'STATE_PRESENTED_ALL',frame_source:1,frame_sequence:seq}}},{name:'Commit',ph:'b',pid:1,id2:{local:'reused'},ts:start+200},{name:'PipelineReporter',ph:'e',pid:1,id2:{local:'reused'},ts:start+800});
  events.reverse();assert.equal(frameEvidence(events,'start',1).complete_frames,2);assert.equal(metricPresentationEvidence(events,[{id:0,dom_delay_ms:10},{id:1,dom_delay_ms:20}]).supported,true);
});
test('N04: a truncated performance trace cannot be certified or counted as zero presented frames',()=>{
  const r=frameEvidence([{name:'trial-start',ts:1000},{name:'process_name',pid:1,args:{name:'Renderer'}}],'trial-start');assert.equal(r.supported,false);assert.match(r.reason,/full marked measurement window/);assert.equal(r.minimum_complete_per_second,undefined);
});

test('N04: presentation evidence excludes other processes, duplicate frames, partial frames and out-of-window feedback',()=>{
  const events=[{name:'process_name',pid:1,args:{name:'Renderer'}},{name:'start',ts:1000}];
  const frame=(id,seq,state,at,pid=1)=>events.push({name:'PipelineReporter',ph:'b',pid,id2:{local:id},ts:at-50,args:{frame_reporter:{state,frame_source:1,frame_sequence:seq}}},{name:'PipelineReporter',ph:'e',pid,id2:{local:id},ts:at});
  frame('a',1,'STATE_PRESENTED_ALL',2000);frame('b',1,'STATE_PRESENTED_ALL',2100);frame('c',2,'STATE_PRESENTED_PARTIAL',3000);frame('d',3,'STATE_PRESENTED_ALL',4000,2);frame('e',4,'STATE_PRESENTED_ALL',999);frame('f',5,'STATE_DROPPED',5000);
  const result=frameEvidence(events,'start',1);assert.equal(result.complete_frames,1);assert.equal(result.buckets[0].partial,1);assert.equal(result.buckets[0].dropped,1);assert.equal(result.at_least_30_each_second,false);
  assert.equal(frameEvidence(events,'absent').supported,false);events.push({name:'process_name',pid:2,args:{name:'Renderer'}});assert.equal(frameEvidence(events,'start').supported,false);
});

test('N04: every licensed Earth variant is locally served byte-for-byte with a source hash and bounded allocation',async()=>{
  const manifest=JSON.parse(readFileSync(new URL('../apps/mission-control-web/assets/earth/manifest.json',import.meta.url)));
  const app=createApp({autoTick:false}),call=transport(app);let bytes=0;
  try{
    for(const asset of manifest.assets){
      assert.match(asset.source_url,/^https:\/\/(assets.science|eoimages.gsfc).nasa.gov\//);
      assert.match(asset.source_sha256,/^[a-f0-9]{64}$/);assert.ok(asset.historical);
      const r=await call('/assets/earth/'+asset.file),raw=Buffer.concat(r.raw.chunks);
      assert.equal(r.status,200);assert.equal(r.headers['Content-Type'],'image/jpeg');assert.equal(raw.length,asset.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),asset.sha256);bytes+=raw.length;
    }
    assert.equal(bytes,manifest.total_bytes);assert.ok(bytes<=4000000);
    for(const path of ['/assets/earth/../../services/api/store.mjs','/assets/earth/../../../package.json','/assets/earth/missing.jpg'])assert.equal((await call(path)).status,404);
  }finally{await app.close();}
});
test('N04: scalar crew trend positions follow observation time and preserve quality gaps',()=>{
  const times=['2026-01-01T00:00:00Z','2026-01-01T00:00:01Z','2026-01-01T00:00:10Z'];
  const plot=sparkline([60,65,70],'#54c9b7',180,40,times);assert.match(plot,/L18,/);assert.match(plot,/L180,/);
  const gap=sparkline([60,null,70],'#b2afb9',180,40,times);assert.equal((gap.match(/M/g)??[]).length,2);
});
test('N04: reception timeline and environment never substitute unreceived onboard data and Gray history stays neutral',async()=>{
  const app=createApp({autoTick:false});let ui;
  try{ui=await frontendSession(app,'demo_admin');assert.equal(ui.all('.crew-insignia').length,6);
    assert.equal(new Set(ui.all('.crew-insignia polygon').map(p=>p.getAttribute('points'))).size,6);
    assert.match(ui.el('#reception-view-label').textContent,/Spacecraft · onboard/);
    assert.match(ui.el('#overview-monitoring').textContent,/Monitoring/);
    assert.ok(ui.all('.crew-quality').every(e=>e.textContent==='Data available'));
    await ui.click('[data-view="earth"]');assert.equal(ui.el('#environment').getAttribute('data-stale'),'true');assert.match(ui.el('#environment-context').textContent,/unavailable/);
    assert.match(ui.el('#reception-view-label').textContent,/Earth · awaiting first packet/);
    assert.match(ui.el('.mission-summary .live-pill').textContent,/NO PACKET/);
    assert.ok(ui.all('.crew-quality').every(e=>e.textContent==='Data unknown'));
    assert.match(ui.el('#reception-timeline').textContent,/Awaiting packet/);assert.ok(!ui.el('#environment').textContent.includes('22.1'));
    const gray=ui.all('.crew-card');assert.ok(gray.every(c=>c.classList.contains('gray')));
    assert.ok(ui.el('#crew-stream-label').textContent.includes('Gray'));
    for(const card of gray){assert.equal(card.querySelector('.crew-hr span').textContent,'—');assert.match(card.querySelector('.crew-source').textContent,/HR source/);}
  }finally{await ui?.close();await app.close();}
});
