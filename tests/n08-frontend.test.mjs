import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { frontendSession } from './dom-harness.mjs';
import { demoWaveform,encodeBinary } from '../packages/waveforms.mjs';
import { ingest,sha } from '../services/waveforms/service.mjs';
const make=()=>createApp({autoTick:false,caseBuilder:buildCase});
for(const edited of [false,true])test('Presentation waveform import follows committed cutoff only when user has not edited it: '+edited,async()=>{
  const app=make(),h=await frontendSession(app);try{h.module.navigate('waveforms');await h.flush();const original=h.el('#wave-before').value;app.engine.tick(30);let committed;
    h.intercept((path,o,normal)=>{if(path.startsWith('/v1/ingest/waveforms?')){committed=ingest(app.store,h.module.inspect().identity,'CREW-03',{format:'binary',bytes:Buffer.from(o.body),expectedHash:o.headers['X-Waveform-SHA256']},app.engine.state.now);if(edited)h.el('#wave-before').value='2026-11-14T00:00:00.000Z';return Promise.resolve({ok:true,status:201,json:async()=>committed});}return normal(path,o);});
    h.el('#wave-confirm').checked=true;await h.el('#wave-generate').emit('click');await h.flush();assert.ok(committed);assert.match(h.el('#wave-status').textContent,/Imported/);assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,1);
    if(edited){assert.equal(h.el('#wave-before').value,'2026-11-14T00:00:00.000Z');assert.match(h.el('#wave-status').textContent,/historical view retained/);assert.equal(h.el('#wave-play').disabled,true);}else{assert.notEqual(h.el('#wave-before').value,original);assert.equal(h.el('#wave-before').value,committed.source.known_at);assert.match(h.el('#wave-status').textContent,/Cutoff advanced/);assert.equal(h.el('#wave-play').disabled,false);assert.ok(h.el('.wave-signal'));}
  }finally{h.module.navigate('overview');await h.close();await app.close();}
});
function fixture(app,who){const d=demoWaveform('CREW-03',new Date(app.engine.state.now-60000).toISOString(),'SYN-dom'),bytes=encodeBinary(d.meta,d.frames);ingest(app.store,who,'CREW-03',{format:'binary',bytes,expectedHash:sha(bytes)},app.engine.state.now);}
test('W4 actual application navigation loads UNKNOWN from backend with honest inactive twin labels',async()=>{
  const app=make(),h=await frontendSession(app);try{h.module.navigate('waveforms');await h.flush();assert.match(h.el('#wave-status').textContent,/Loaded 0/);assert.match(h.el('#wave-chart').textContent,/UNKNOWN/);assert.equal(h.el('#wave-play').disabled,true);assert.match(h.el('.wave-limits').textContent,/N06 legacy peak-motion interface is INACTIVE/);assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4/W5 real source window renders SVG extrema/gap and authenticated metadata',async()=>{
  const app=make(),h=await frontendSession(app);try{fixture(app,h.module.inspect().identity);h.module.navigate('waveforms');await h.flush();assert.match(h.el('#wave-status').textContent,/Loaded 1/);assert.ok(h.el('.wave-signal').getAttribute('d').length>10);assert.ok(h.all('.wave-gap').length>0);assert.match(h.el('#wave-quality').textContent,/125 missing/);assert.match(h.el('#wave-provenance').textContent,/AUTHORED_SYNTHETIC_ONLY/);assert.equal(h.el('#wave-play').disabled,false);h.el('#wave-channel').value='PPG';await h.el('#wave-channel').emit('change');await h.flush();assert.match(h.el('#wave-quality').textContent,/100.0%/);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
for(const role of ['viewer','researcher'])test('W9 '+role+' sees denied state and launches no waveform request',async()=>{
  const app=make(),h=await frontendSession(app,role);let calls=0;try{h.intercept((p,o,n)=>{if(p.includes('waveforms'))calls++;return n(p,o);});h.module.navigate('waveforms');await h.flush();assert.match(h.el('#wave-status').textContent,/Permission denied/);assert.equal(h.el('#wave-upload').disabled,true);assert.equal(calls,0);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4 historical empty cutoff and invalid range remain honest without writes',async()=>{
  const app=make(),h=await frontendSession(app);try{fixture(app,h.module.inspect().identity);h.module.navigate('waveforms');await h.flush();h.el('#wave-until').value=999999;await h.el('#wave-range').emit('click');assert.match(h.el('#wave-status').textContent,/Invalid range/);h.el('#wave-before').value='2026-11-14T00:00:00.000Z';await h.el('#wave-load').emit('click');await h.flush();assert.match(h.el('#wave-chart').textContent,/UNKNOWN/);assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,1);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4 old asynchronous list cannot replace a newer historical projection',async()=>{
  const app=make(),h=await frontendSession(app);let release,held=false;try{fixture(app,h.module.inspect().identity);h.intercept((p,o,n)=>{if(p.includes('/waveforms?')&&!held){held=true;return new Promise(r=>{release=async()=>r(await n(p,o));});}return n(p,o);});h.module.navigate('waveforms');await h.flush();assert.ok(release);h.el('#wave-before').value='2026-11-14T00:00:00.000Z';await h.el('#wave-load').emit('click');await h.flush();assert.match(h.el('#wave-status').textContent,/Loaded 0/);await release();await h.flush();assert.match(h.el('#wave-status').textContent,/Loaded 0/);assert.match(h.el('#wave-chart').textContent,/UNKNOWN/);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4 list success followed by failed window cannot be reported as Loaded/PASS',async()=>{
  const app=make(),h=await frontendSession(app);try{fixture(app,h.module.inspect().identity);h.intercept((p,o,n)=>p.includes('/waveforms/SYN-dom?')?Promise.resolve({ok:false,status:503,json:async()=>({error:{message:'injected corrupt window'}})}):n(p,o));h.module.navigate('waveforms');await h.flush();assert.match(h.el('#wave-status').textContent,/Replay unavailable/);assert.doesNotMatch(h.el('#wave-status').textContent,/Loaded/);assert.match(h.el('#wave-chart').textContent,/UNAVAILABLE/);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4 disposing a pending replay prevents stale rendering in another workspace',async()=>{
  const app=make(),h=await frontendSession(app);let release;try{fixture(app,h.module.inspect().identity);h.intercept((p,o,n)=>p.includes('/waveforms/SYN-dom?')?new Promise(r=>{release=async()=>r(await n(p,o));}):n(p,o));h.module.navigate('waveforms');await h.flush();assert.ok(release);h.module.navigate('n10');await h.flush();await release();await h.flush();assert.ok(h.el('#n10-status'));assert.equal(h.el('#wave-chart'),null);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W2 UI refuses import without explicit authored-source confirmation',async()=>{
  const app=make(),h=await frontendSession(app);try{h.module.navigate('waveforms');await h.flush();await h.el('#wave-generate').emit('click');await h.flush();assert.match(h.el('#wave-status').textContent,/Confirm authored synthetic/);assert.equal(app.store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,0);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
test('W4 changing source clears old samples while the actual replacement window is pending',async()=>{
  const app=make(),h=await frontendSession(app);let release;try{fixture(app,h.module.inspect().identity);h.module.navigate('waveforms');await h.flush();assert.ok(h.el('.wave-signal'));h.intercept((p,o,n)=>p.includes('/waveforms/SYN-dom?')?new Promise(r=>{release=async()=>r(await n(p,o));}):n(p,o));h.el('#wave-channel').value='PPG';const pending=h.el('#wave-channel').emit('change');await h.flush();assert.ok(release);assert.equal(h.el('.wave-signal'),null);assert.match(h.el('#wave-quality').textContent,/Loading/);await release();await pending;await h.flush();assert.match(h.el('#wave-quality').textContent,/PPG/);}finally{h.module.navigate('overview');await h.close();await app.close();}
});
