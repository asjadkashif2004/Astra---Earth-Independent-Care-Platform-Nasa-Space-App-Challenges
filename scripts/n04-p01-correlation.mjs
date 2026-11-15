/* QA only: explicit workload correlation and append-only raw measurement records. */
import assert from 'node:assert/strict';
import { appendFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createTrialJournal(directory,name,metadata){
  const path=join(directory,name+'.raw.jsonl');
  writeFileSync(path,JSON.stringify({type:'start',...metadata})+'\n',{flag:'wx'});
  return (type,data)=>appendFileSync(path,JSON.stringify({type,...data})+'\n');
}

export function persistRawTrial(directory,raw){
  writeFileSync(join(directory,raw.name+'.raw.json'),JSON.stringify(raw,null,2)+'\n',{flag:'wx'});
}

export function correlateMeasuredSamples(raw,expectedPerBatch){
  assert.ok(Number.isInteger(expectedPerBatch)&&expectedPerBatch>0,'Expected metric count required');
  const hosts=new Map(raw.host.map(h=>[h.observed_at,h]));
  assert.ok(hosts.size>0,'Measured host batches required');
  assert.equal(hosts.size,raw.host.length,'Duplicate measured batch');
  const outside=raw.samples.filter(s=>!hosts.has(s.snapshot_observed_at));
  const samples=raw.samples.filter(s=>hosts.has(s.snapshot_observed_at)),ids=new Set();
  assert.equal(raw.captures.length,hosts.size,'Missing or extra measured capture');
  for(const host of raw.host){
    const batch=samples.filter(s=>s.snapshot_observed_at===host.observed_at);
    assert.equal(batch.length,expectedPerBatch,'Missing or extra measured sample for '+host.observed_at);
    assert.equal(new Set(batch.map(s=>s.crew_id+':'+s.metric)).size,expectedPerBatch,'Duplicate measured metric');
    const captures=raw.captures.filter(c=>c.observed_at===host.observed_at);
    assert.equal(captures.length,1,'Missing or ambiguous measured capture for '+host.observed_at);
    const capture=captures[0];
    assert.ok(Number.isFinite(capture.capture_completed_host_ms),'Missing capture timestamp');
    assert.equal(capture.metric_ids.length,expectedPerBatch,'Capture metric count mismatch');
    assert.equal(new Set(capture.metric_ids).size,expectedPerBatch,'Duplicate capture sample');
    for(const sample of batch){
      assert.ok(!ids.has(sample.id),'Duplicate measured sample ID');ids.add(sample.id);
      assert.ok(capture.metric_ids.includes(sample.id),'Missing capture association for measured sample '+sample.id);
    }
  }
  const correlated=samples.map(sample=>{
    const tick=hosts.get(sample.snapshot_observed_at),capture=raw.captures.find(c=>c.observed_at===sample.snapshot_observed_at);
    const packet=raw.transport.findLast(p=>p.observed_at===sample.snapshot_observed_at);
    const origin=sample.ingestion_host_ms??tick.started_host_ms;
    assert.ok(Number.isFinite(origin)&&Number.isFinite(sample.dom_host_ms),'Missing measurement clock');
    assert.ok(capture.capture_completed_host_ms>=sample.dom_host_ms&&sample.dom_host_ms>=origin,'Invalid measurement clock order');
    return {...sample,latency_origin:sample.environment?'Synthetic batch processing start;no independent sensor ingestion event':'Server-owned metric ingestion',origin_host_ms:origin,
      dom_delay_ms:sample.dom_host_ms-origin,capture_bound_ms:capture.capture_completed_host_ms-origin,
      transport_to_receipt_ms:packet?sample.browser_received_ms-packet.write_started_host_ms:null,server_before_write_ms:packet?packet.write_started_host_ms-origin:null};
  });
  return {samples:correlated,out_of_window:[...(raw.out_of_window??[]),...outside.map(sample=>({reason:'Sample outside measured host batches',sample}))]};
}
