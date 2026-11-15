import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { mkdtemp,rm,readFile,writeFile,lstat,symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { sha256,assertAllowedURL,validateApproval,MAX_SAMPLE_BYTES,MAX_DEADLINE_MS } from '../services/acquisition/source.mjs';
import { SLEEP_FILES,SLEEP_LIMITS,SLEEP_URLS,CHECKSUM_BYTES,CHECKSUM_SHA,validateSleepApproval,validatePublisher } from '../services/acquisition/sleep-edf-source.mjs';
import { streamSleepFile,verifySleepCache,acquireSleep,hashSleepFile,sleepEntry,buildSleepCard,buildSleepSplit,validateSleepDocuments } from '../services/acquisition/sleep-edf-cache.mjs';
import { parseEDFHeader,readEDFHeader,parseHypnogram,validateSleepPair } from '../services/acquisition/edf.mjs';
import { sleepOptions } from '../scripts/sleep-edf-acquire.mjs';

const project=fileURLToPath(new URL('../',import.meta.url)),approval=JSON.parse(readFileSync(join(project,'data/scientific/sleep-edf-sc4001.approval.json'),'utf8'));
const cache=join(project,'data/scientific/cache'),code=c=>e=>e.code===c,copy=structuredClone;
async function temp(t){const p=await mkdtemp(join(tmpdir(),'astra-sleep-edf-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}
function edf({labels=['EEG Fpz-Cz','EEG Pz-Oz','EOG horizontal'],records=2,duration=30,samples=3000,payload=null,reserved='',date='24.04.89',time='16.13.00'}={}){
  const ns=labels.length,header=Buffer.alloc(256*(ns+1),32);const put=(offset,size,value)=>header.write(String(value).padEnd(size,' '),offset,size,'ascii');
  put(0,8,'0');put(8,80,'X F X Fixture');put(88,80,'Fixture recording');put(168,8,date);put(176,8,time);put(184,8,header.length);put(192,44,reserved);put(236,8,records);put(244,8,duration);put(252,4,ns);
  let offset=256;for(const [width,values]of [[16,labels],[80,labels.map(()=> '')],[8,labels.map(()=> 'uV')],[8,labels.map(()=> -100)],[8,labels.map(()=>100)],[8,labels.map(()=> -32768)],[8,labels.map(()=>32767)],[80,labels.map(()=> '')],[8,labels.map(()=>samples)],[32,labels.map(()=> '')]]){values.forEach((v,i)=>put(offset+i*width,width,v));offset+=ns*width;}
  return Buffer.concat([header,payload??Buffer.alloc(records*ns*samples*2)]);
}
function hyp(text='+0\x14\x14\0+0\x1530\x14Sleep stage W\x14\0+30\x1530\x14Sleep stage 2\x14\0',options={}){let payload=Buffer.from(text);if(payload.length%2)payload=Buffer.concat([payload,Buffer.alloc(1)]);return edf({labels:['EDF Annotations'],records:1,duration:60,samples:payload.length/2,payload,reserved:'EDF+C',...options});}
const psg=edf(),annotations=hyp(),spec=bytes=>({...SLEEP_FILES[0],bytes:bytes.length,sha256:sha256(bytes),deadline_ms:1000});
const budget=()=>({payload_bytes:CHECKSUM_BYTES,network_ms:13576});
const response=(bytes,extra={})=>({status:200,headers:{'content-type':'application/octet-stream','content-length':String(bytes.length)},body:(async function*(){yield bytes;})(),close(){},...extra});

test('Sleep-EDF: exact two-file/checksum allowlist rejects all other datasets,subjects,queries and URL variants',()=>{
  for(const u of SLEEP_URLS)assert.equal(assertAllowedURL(u),u);
  for(const u of [SLEEP_FILES[0].url.replace('SC4001','SC4002'),SLEEP_FILES[0].url+'?download=1',SLEEP_FILES[0].url+'#x',SLEEP_FILES[0].url.replace('https:','http:'),SLEEP_FILES[0].url.replace('physionet.org','evil.test'),'https://physionet.org/files/sleep-edfx/1.0.0/SC-subjects.xls'])assert.throws(()=>assertAllowedURL(u),code('SOURCE_NOT_ALLOWED'));
});
test('Sleep-EDF: source-specific exception cannot change old caps or authorize other files,hashes,rights or budgets',()=>{
  validateSleepApproval(approval);assert.equal(MAX_SAMPLE_BYTES,65536);assert.equal(MAX_DEADLINE_MS,15000);
  for(const change of [a=>a.files.reverse(),a=>a.files[0].bytes++,a=>a.files[0].sha256='0'.repeat(64),a=>a.files[0].name='../PSG.edf',a=>a.files[0].deadline_ms++,a=>a.files.push(a.files[0]),a=>a.limits.total_payload_bytes++,a=>a.limits.overall_network_ms++,a=>a.limits.automatic_retries=1,a=>a.publisher.sha256='0'.repeat(64),a=>a.rights.license_id='CC0-1.0',a=>a.rights.restrictions=[],a=>a.extra=true]){const a=copy(approval);change(a);assert.throws(()=>validateSleepApproval(a));}
  for(const name of ['approved-sources.json','osdr-osd-1.approval.json','bidmc-01-numerics.approval.json']){const a=JSON.parse(readFileSync(join(project,'data/scientific',name),'utf8'));a.resource.url=SLEEP_FILES[0].url;assert.throws(()=>validateApproval(a),code('SOURCE_NOT_ALLOWED'));}
});
test('Sleep-EDF: publisher metadata corruption or unsupported receipt cannot establish file integrity',()=>{
  assert.throws(()=>validatePublisher(Buffer.from('fake'),{}),code('HASH_MISMATCH'));
});
test('Sleep-EDF: actual complete publisher metadata establishes exact pins;missing/false/unbounded receipts reject',()=>{
  const folder=join(project,'data/scientific/sleep-edf/source-review'),bytes=readFileSync(join(folder,'SHA256SUMS.txt')),r=JSON.parse(readFileSync(join(folder,'review.json'),'utf8'));
  assert.equal(validatePublisher(bytes,r).bytes,CHECKSUM_BYTES);assert.equal(sha256(bytes),CHECKSUM_SHA);
  for(const change of [r=>r.complete=false,r=>r.requests=2,r=>r.elapsed_network_ms=15001,r=>r.url='https://evil.test',r=>r.bytes--,r=>r.sha256='0'.repeat(64)]){const bad=copy(r);change(bad);assert.throws(()=>validatePublisher(bytes,bad),code('PROVENANCE_MISMATCH'));}
});
test('Sleep-EDF: bundle first-file failure stops annotation request,preserves partials and releases owned lock;no automatic resume',async t=>{
  const root=await temp(t),folder=join(project,'data/scientific/sleep-edf/source-review'),publisher=readFileSync(join(folder,'SHA256SUMS.txt')),publisherReceipt=JSON.parse(readFileSync(join(folder,'review.json'),'utf8'));let calls=0;
  await assert.rejects(acquireSleep({root,approval,publisher,publisherReceipt,transport:async url=>{calls++;assert.equal(url,SLEEP_FILES[0].url);return response(Buffer.alloc(0),{status:503});}}),code('HTTP_STATUS'));assert.equal(calls,1);
  const stage=join(root,`.${approval.id}-${CHECKSUM_SHA}.partial`),state=JSON.parse(await readFile(join(stage,'progress.json')));assert.equal(state.complete,false);assert.equal(state.failure.code,'HTTP_STATUS');assert.equal(state.receipts.length,0);assert.equal(existsSync(sleepEntry(root)),false);assert.equal(existsSync(join(root,`.${approval.id}.lock`)),false);
  await assert.rejects(acquireSleep({root,approval,publisher,publisherReceipt,transport:()=>assert.fail('No network retry')}),code('REJECTED_PARTIAL'));assert.equal(existsSync(join(root,`.${approval.id}.lock`)),false);
});
test('Sleep-EDF: partials or persisted/forged JSON summaries cannot produce a verified dataset card or split',()=>{
  for(const v of [null,{}, {manifest:{source_id:approval.id},psg:{},pair:{}},JSON.parse(JSON.stringify({network_requests:0,manifest:{approval_sha256:'fake'}}))]){assert.throws(()=>buildSleepCard(approval,v),code('PROVENANCE_MISMATCH'));assert.throws(()=>buildSleepSplit(approval,v),code('PROVENANCE_MISMATCH'));}
});
test('Sleep-EDF: bounded EDF header parsing verifies complete record lengths,calibration,montage and local clock without inventing timezone',()=>{
  const h=parseEDFHeader(psg,psg.length);assert.equal(h.header_bytes,1024);assert.equal(h.duration_seconds,60);assert.equal(h.channels[0].sampling_hz,100);assert.equal(h.local_start,'1989-04-24T16:13:00');assert.equal(h.timezone,null);
  assert.equal(validateSleepPair(h,parseHypnogram(annotations)).annotation_count,2);
});
test('Sleep-EDF: malformed/truncated headers,unbounded signals,record lengths and invalid calendars fail closed',()=>{
  for(const [offset,width,value]of [[0,8,'1'],[184,8,'256'],[252,4,'999'],[236,8,'-1'],[244,8,'NaN'],[168,8,'30.02.89'],[176,8,'24.00.00'],[904,8,'X']]){const b=Buffer.from(psg);b.fill(32,offset,offset+width);b.write(value,offset,'ascii');assert.throws(()=>parseEDFHeader(b,b.length));}
  assert.throws(()=>parseEDFHeader(psg.subarray(0,200),psg.length));assert.throws(()=>parseEDFHeader(psg,psg.length-1));
});
test('Sleep-EDF: EDF+ annotation parser preserves source stages,including unscored labels,without creating medical conclusions',()=>{
  const p=parseHypnogram(hyp('+0\x14\x14\0+0\x1560\x14Sleep stage ?\x14\0'));assert.equal(p.annotations[0].label,'Sleep stage ?');assert.equal(p.annotations[0].duration_seconds,60);
  for(const text of ['+0\x1560\x14<script>\x14\0','+0\x14Sleep stage W\x14\0','+30\x1530\x14Sleep stage W\x14\0+0\x1530\x14Sleep stage W\x14\0'])assert.throws(()=>parseHypnogram(hyp(text)),code('INVALID_EDF'));
});
test('Sleep-EDF: pair validation rejects different clocks,missing PSG signals,overlap and annotations beyond source duration',()=>{
  const h=parseEDFHeader(psg,psg.length),a=parseHypnogram(annotations);
  for(const change of [x=>x.header.local_start='2000-01-01T00:00:00',x=>x.annotations[1].onset_seconds=20,x=>x.annotations[1].duration_seconds=31,x=>x.annotations[0].onset_seconds=-1]){const x=copy(a);change(x);assert.throws(()=>validateSleepPair(h,x),code('PAIR_MISMATCH'));}
  const wrong=copy(h);wrong.channels[0].label='other';assert.throws(()=>validateSleepPair(wrong,a),code('PAIR_MISMATCH'));
});
test('Sleep-EDF: zero-duration annotation records are structurally allowed,but discontinuous or signal-zero-duration files are unsupported',()=>{
  assert.equal(parseHypnogram(hyp(undefined,{duration:0})).header.duration_seconds,0);
  const b=edf({duration:0});assert.throws(()=>parseEDFHeader(b,b.length),code('INVALID_EDF'));
  const d=edf({reserved:'EDF+D'});assert.throws(()=>parseEDFHeader(d,d.length),code('UNSUPPORTED_EDF'));
});
test('Sleep-EDF: streaming keeps original bytes,incremental hash and one-request receipt with bounded progress',async t=>{
  const root=await temp(t),b=budget(),progress=[];let calls=0,closed=false;
  const result=await streamSleepFile({path:join(root,'psg.edf'),spec:spec(psg),budget:b,onProgress:async p=>progress.push(p),transport:async(url,{headers})=>{calls++;assert.equal(url,SLEEP_FILES[0].url);assert.equal(headers['Accept-Encoding'],'identity');return response(psg,{close(){closed=true;},body:(async function*(){for(let n=0;n<psg.length;n+=4096)yield psg.subarray(n,n+4096);})()});}});
  assert.equal(calls,1);assert.equal(closed,true);assert.equal(result.sha256,sha256(psg));assert.equal(result.response_complete,true);assert.equal(progress.at(-1).bytes,psg.length);assert.equal(b.payload_bytes,CHECKSUM_BYTES+psg.length);assert.deepEqual(await readFile(join(root,'psg.edf')),psg);
});
test('Sleep-EDF: truncation and late transport failure retain partial bytes,prefix evidence and closed handles without success',async t=>{
  for(const late of [false,true]){const root=await temp(t),path=join(root,'partial.edf');let closed=false;const progress=[];
    await assert.rejects(streamSleepFile({path,spec:spec(psg),budget:budget(),onProgress:async p=>progress.push(p),transport:async()=>response(psg,{close(){closed=true;},body:(async function*(){yield late?psg:psg.subarray(0,100);if(late)throw Error('late transport failure');})()})}));
    assert.equal(closed,true);assert.equal(progress.at(-1).response_complete,false);assert.equal((await lstat(path)).size,late?psg.length:100);await writeFile(path,Buffer.from('handle closed'));
  }
});
test('Sleep-EDF: incorrect status,compressed/HTML content,length,oversize and changed bytes cannot be accepted',async t=>{
  const bad=Buffer.from(psg);bad[2000]^=1;
  for(const r of [response(psg,{status:302}),response(psg,{headers:{'content-type':'text/html'}}),response(psg,{headers:{'content-type':'application/octet-stream','content-encoding':'gzip'}}),response(psg,{headers:{'content-type':'application/octet-stream','content-length':'1'}}),response(bad),response(psg,{headers:{'content-type':'application/octet-stream'},body:(async function*(){yield psg;yield Buffer.from('x');})()})]){const root=await temp(t);await assert.rejects(streamSleepFile({path:join(root,'rejected.edf'),spec:spec(psg),budget:budget(),transport:async()=>r}));}
});
test('Sleep-EDF: aggregate byte/time limits and per-file deadline apply before network;stalled transfer aborts with cleanup',async t=>{
  for(const b of [{payload_bytes:50000000,network_ms:1},{payload_bytes:0,network_ms:360000},{payload_bytes:-1,network_ms:0}]){const root=await temp(t);await assert.rejects(streamSleepFile({path:join(root,'x'),spec:spec(psg),budget:b,transport:()=>assert.fail('No request beyond budget')}));}
  const root=await temp(t);let closed=false;
  await assert.rejects(streamSleepFile({path:join(root,'slow'),spec:{...spec(psg),deadline_ms:25},budget:budget(),transport:async()=>response(psg,{close(){closed=true;},body:{[Symbol.asyncIterator](){return {next(){return new Promise(()=>{});}};}}})}),code('ACQUISITION_ABORTED'));assert.equal(closed,true);
});
test('Sleep-EDF: cancellation,no-follow file protection and immutable existing files prevent unintended writes',async t=>{
  const root=await temp(t),target=join(root,'target'),path=join(root,'x');await writeFile(path,'existing');
  await assert.rejects(streamSleepFile({path,spec:spec(psg),budget:budget(),transport:()=>assert.fail('No request')}));assert.equal((await readFile(path)).toString(),'existing');
  const control=new AbortController();control.abort();await assert.rejects(streamSleepFile({path:target,spec:spec(psg),budget:budget(),signal:control.signal,transport:()=>assert.fail('No request')}),code('ACQUISITION_ABORTED'));
  if(process.platform!=='win32'){await symlink(path,target);await assert.rejects(streamSleepFile({path:target,spec:spec(psg),budget:budget(),transport:()=>assert.fail('No request')}));}
});
test('Sleep-EDF: offline streamed hash and bounded header reads detect changed size or bytes',async t=>{
  const root=await temp(t),path=join(root,'fixture');await writeFile(path,psg);await hashSleepFile(path,spec(psg));assert.equal((await readEDFHeader(path,psg.length)).channels.length,3);
  const bad=Buffer.from(psg);bad[1100]^=1;await writeFile(path,bad);await assert.rejects(hashSleepFile(path,spec(psg)),code('HASH_MISMATCH'));await assert.rejects(readEDFHeader(path,psg.length-1),code('INVALID_EDF'));
});
test('Sleep-EDF: invalid approvals and publisher evidence reject before starting a bundle or creating accepted files',async t=>{
  const root=await temp(t);await assert.rejects(acquireSleep({root,approval,publisher:Buffer.from('bad'),publisherReceipt:{},transport:()=>assert.fail('No payload request')}),code('HASH_MISMATCH'));
  const a=copy(approval);a.files[0].bytes++;await assert.rejects(acquireSleep({root,approval:a,publisher:Buffer.alloc(0),publisherReceipt:{},transport:()=>assert.fail('No request')}),code('INVALID_LIMIT'));
});
test('Sleep-EDF: CLI accepts only explicit acquire-with-reviewed-metadata and offline modes',()=>{
  assert.deepEqual(sleepOptions(['acquire','--review=/tmp/approved']),{mode:'acquire',review:'/tmp/approved'});assert.equal(sleepOptions(['verify']).mode,'verify');
  for(const args of [['acquire'],['verify','--review=/tmp/x'],['acquire','--url=evil'],['acquire','--review=x','--review=y'],['retry']])assert.throws(()=>sleepOptions(args));
});
test('Sleep-EDF: completed real originals,publisher checksums,manifest,card and subject-group policy verify offline', {skip:!existsSync(sleepEntry(cache))},async()=>{
  const v=await verifySleepCache({root:cache,approval}),card=buildSleepCard(approval,v),split=buildSleepSplit(approval,v);assert.equal(v.network_requests,0);assert.equal(v.manifest.retrieval.total_payload_bytes,48382467);assert.equal(card.recording.timezone,null);assert.equal(split.executed,false);assert.deepEqual(split.assignments,[]);
  assert.equal(validateSleepDocuments(card,split,approval,v),true);
  for(const mutate of [c=>c.source.version='2',c=>c.original_files[0].sha256='0'.repeat(64),c=>c.recording.timezone='UTC',c=>c.subject.global_identity='invented']){const c=copy(card);mutate(c);assert.throws(()=>validateSleepDocuments(c,split,approval,v),code('PROVENANCE_MISMATCH'));}
  const s=copy(split);s.executed=true;s.assignments=[{subject:'00',split:'train'}];assert.throws(()=>validateSleepDocuments(card,s,approval,v),code('PROVENANCE_MISMATCH'));
  const publisher=await readFile(join(v.entry,'SHA256SUMS.txt')),receipt=JSON.parse(await readFile(join(v.entry,'publisher-receipt.json')));validatePublisher(publisher,receipt);const bad=copy(receipt);bad.elapsed_network_ms=15001;assert.throws(()=>validatePublisher(publisher,bad),code('PROVENANCE_MISMATCH'));
});
