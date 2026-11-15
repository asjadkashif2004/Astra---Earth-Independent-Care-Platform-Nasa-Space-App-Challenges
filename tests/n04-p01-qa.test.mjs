import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installP01Probe } from '../scripts/n04-p01-probe.mjs';
import { createTrialJournal,persistRawTrial,correlateMeasuredSamples } from '../scripts/n04-p01-correlation.mjs';

const warm='2026-10-19T06:00:00.000Z',observed='2026-10-19T06:00:01.000Z';
function probeFixture(){
  let receive,inspect,stamp='06:00:01';
  const values={heart_rate:70,hrv:50,spo2:98,respiratory_rate:14,sleep_duration:7,temperature:36.6};
  const texts=['70bpm','50ms','98.0%','14/min','7.0h','36.6°C'];
  const nodes=texts.map(textContent=>({textContent,firstChild:{},contains:()=>true,closest:()=>({querySelector:()=>({textContent:stamp})})}));
  const document={
    querySelector(selector){
      if(selector==='#crew-grid')return null;
      if(selector==='#crew-metric-tiles')return {};
      if(selector==='#crew-tabs [aria-pressed="true"]')return {dataset:{crew:'CREW-01'}};
      const index=selector.match(/nth-child\((\d+)\)/);return index?nodes[Number(index[1])-1]:null;
    },
    createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({x:20,y:20,left:20,top:20,right:60,bottom:40,width:40,height:20})}),
    elementFromPoint:()=>nodes[0]
  };
  const window={EventSource:class{addEventListener(name,callback){if(name==='snapshot')receive=callback;}}};
  runInNewContext('('+installP01Probe.toString()+')()',{window,document,MutationObserver:class{constructor(callback){inspect=callback;}observe(){}},innerWidth:800,innerHeight:600,performance:{mark(){}}});
  new window.EventSource('/test');
  const snapshot=ts=>({mission:{spacecraft_time:ts},server_received_at:ts,crew:[{id:'CREW-01',values,metric_observations:Object.fromEntries(Object.keys(values).map(metric=>[metric,{event_id:ts+metric,ts,integrity:'verified',ingestion:{host_received_at:ts},source:{kind:'simulator'}}]))}]});
  return {probe:window.__p01,emit(ts){stamp=ts.slice(11,19);receive({data:JSON.stringify(snapshot(ts))});inspect();}};
}

test('N04-P01 QA: warm-up consumption is observable while inactive;late snapshots are retained without contaminating measured samples',()=>{
  const {probe,emit}=probeFixture();emit(warm);
  assert.equal(probe.last_snapshot_observed_at,warm);assert.equal(probe.samples.length,0);
  probe.beginTrial([observed]);emit(warm);
  assert.equal(probe.samples.length,0);assert.equal(probe.pending.length,0);
  assert.equal(probe.out_of_window.length,1);assert.equal(probe.out_of_window[0].snapshot.mission.spacecraft_time,warm);
  emit(observed);assert.equal(probe.samples.length,6);assert.deepEqual(Array.from(probe.samples,s=>s.id),[0,1,2,3,4,5]);
  assert.ok(probe.samples.every(s=>s.snapshot_observed_at===observed&&s.visible&&s.unobscured));
  emit(warm);assert.equal(probe.samples.length,6);assert.equal(probe.pending.length,6);
  assert.equal(probe.out_of_window.length,2);
});

test('N04-P01 QA: a fresh explicit trial clears prior candidates and rejects invalid batch declarations',()=>{
  const {probe,emit}=probeFixture();
  assert.throws(()=>probe.beginTrial([]),/Explicit/);assert.throws(()=>probe.beginTrial([observed,observed]),/Explicit/);assert.throws(()=>probe.beginTrial(['invalid']),/Explicit/);
  probe.beginTrial([observed]);emit(observed);assert.equal(probe.samples.length,6);
  probe.beginTrial(['2026-10-19T06:00:02.000Z']);emit(observed);
  assert.equal(probe.samples.length,0);assert.equal(probe.pending.length,0);assert.equal(probe.out_of_window.length,1);
});

function rawFixture(){
  return {name:'unit-trial',host:[{observed_at:observed,started_host_ms:1000}],transport:[{observed_at:observed,write_started_host_ms:1010}],out_of_window:[],
    samples:[{id:6,crew_id:'CREW-01',metric:'heart_rate',snapshot_observed_at:observed,ingestion_host_ms:1000,dom_host_ms:1050,browser_received_ms:1020}],
    captures:[{file:'unit.png',observed_at:observed,metric_ids:[6],capture_completed_host_ms:1080}]};
}

test('N04-P01 QA: only explicit host batches correlate;legacy pre-window samples remain separate and raw evidence is immutable',()=>{
  const raw=rawFixture();raw.samples.unshift({id:0,snapshot_observed_at:warm});
  raw.out_of_window.push({reason:'late snapshot',observed_at:warm});const before=structuredClone(raw);
  const result=correlateMeasuredSamples(raw,1);
  assert.equal(result.samples.length,1);assert.equal(result.samples[0].id,6);assert.equal(result.samples[0].capture_bound_ms,80);
  assert.equal(result.out_of_window.length,2);assert.equal(result.out_of_window[1].sample.id,0);
  assert.deepEqual(raw,before);
});

test('N04-P01 QA: missing captures,timestamps,required metrics and ambiguous associations fail closed',()=>{
  const raw=rawFixture();
  assert.throws(()=>correlateMeasuredSamples({...raw,captures:[]},1),/Missing or extra measured capture/);
  assert.throws(()=>correlateMeasuredSamples({...raw,samples:[]},1),/Missing or extra measured sample/);
  assert.throws(()=>correlateMeasuredSamples({...raw,captures:[{...raw.captures[0],metric_ids:[7]}]},1),/Missing capture association/);
  assert.throws(()=>correlateMeasuredSamples({...raw,captures:[{...raw.captures[0],capture_completed_host_ms:undefined}]},1),/Missing capture timestamp/);
  assert.throws(()=>correlateMeasuredSamples({...raw,captures:[{...raw.captures[0],capture_completed_host_ms:1040}]},1),/clock order/);
  assert.throws(()=>correlateMeasuredSamples({...raw,host:[...raw.host,...raw.host]},1),/Duplicate measured batch/);
});

test('N04-P01 QA: raw timing and capture records survive summary failure and cannot overwrite an earlier trial',()=>{
  const directory=mkdtempSync(join(tmpdir(),'astra-p01-qa-'));
  try{
    const raw=rawFixture(),journal=createTrialJournal(directory,raw.name,{name:raw.name});
    journal('host',{host:raw.host[0]});journal('capture',{capture:raw.captures[0],samples:raw.samples});
    raw.captures[0].metric_ids=[7];persistRawTrial(directory,raw);
    assert.throws(()=>correlateMeasuredSamples(raw,1),/Missing capture association/);
    const events=readFileSync(join(directory,raw.name+'.raw.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
    assert.deepEqual(events.map(e=>e.type),['start','host','capture']);assert.equal(events[2].capture.capture_completed_host_ms,1080);
    assert.deepEqual(JSON.parse(readFileSync(join(directory,raw.name+'.raw.json'),'utf8')),raw);
    assert.throws(()=>createTrialJournal(directory,raw.name,{}),{code:'EEXIST'});assert.throws(()=>persistRawTrial(directory,raw),{code:'EEXIST'});
  }finally{rmSync(directory,{recursive:true,force:true});}
});
