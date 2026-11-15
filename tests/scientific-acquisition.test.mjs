import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, appendFile, rename, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { acquire, verifyCache } from '../services/acquisition/cache.mjs';
import { assertAllowedURL, validateApproval, validateOriginal, sha256, approvalHash, MAX_SAMPLE_BYTES, MAX_REQUESTS } from '../services/acquisition/source.mjs';

const approved=JSON.parse(readFileSync(new URL('../data/scientific/approved-sources.json',import.meta.url),'utf8'));
const instant='2026-10-23T09:00:00.000Z';
const clock=()=>instant;
function fixture(extra={}){
  const a=structuredClone(approved),data={id:20205008796,title:a.publication.title,modified:'2025-08-31T18:39:21.7150190+00:00',
    authorAffiliations:a.publication.authors.map(name=>({meta:{author:{name}}})),distribution:'PUBLIC',status:'CURATED',onlyAbstract:true,
    copyright:{determinationType:'GOV_PUBLIC_USE_PERMITTED',containsThirdPartyMaterial:false},exportControl:{isExportControl:'NO'},...extra};
  const bytes=Buffer.from(JSON.stringify(data));a.resource.bytes=bytes.length;a.resource.sha256=sha256(bytes);return {a,bytes};
}
async function temp(t){const root=await mkdtemp(join(tmpdir(),'astra-n07-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
const partial=(root,a)=>join(root,`.${a.id}-${a.resource.sha256}.partial`);
async function* chunks(...values){for(const v of values)yield v;}
function response(bytes,{status=200,headers={},body=chunks(bytes)}={}){return {status,headers:{'content-type':'application/json; charset=utf-8','content-length':String(bytes.length),etag:'"test-v1"',...headers},body,close(){this.closed=true;}};}
const code=c=>e=>e.code===c;
async function interrupted(root,a,bytes,n=70){
  const prefix=bytes.subarray(0,n);let calls=0;
  await assert.rejects(acquire({root,approval:a,clock,transport:async()=>{calls++;return response(bytes,{body:(async function*(){yield prefix;throw Error('injected connection failure');})()});}}),/injected connection failure/);
  assert.equal(calls,1);return prefix;
}

test('N07: exact-resource allowlist rejects unknown hosts, IDs, userinfo, schemes, ports, fragments, query strings and alternate references',()=>{
  assert.equal(assertAllowedURL(approved.resource.url),approved.resource.url);
  for(const u of ['http://ntrs.nasa.gov/api/citations/20205008796','https://user@ntrs.nasa.gov/api/citations/20205008796',approved.resource.url+'?url=https://evil.test',approved.resource.url+'#x','https://ntrs.nasa.gov.evil.test/api/citations/20205008796','https://ntrs.nasa.gov:443/api/citations/20205008796','https://ntrs.nasa.gov/api/citations/20240000914','file:///tmp/sample.json','http://127.0.0.1/'])assert.throws(()=>assertAllowedURL(u),code('SOURCE_NOT_ALLOWED'));
  assert.throws(()=>assertAllowedURL(approved.rights.terms_url),code('SOURCE_NOT_ALLOWED'));
  const a=structuredClone(approved);a.id='unreviewed';assert.throws(()=>validateApproval(a),code('SOURCE_NOT_ALLOWED'));
});
test('N07: strict approval requires complete attribution, actual use conditions, version/date limitations, bounded size/type/hash and nonclinical scope',()=>{
  assert.equal(validateApproval(approved),approved);
  for(const mutate of [a=>delete a.publication.publisher,a=>a.extra=true,a=>a.publication.authors=[],a=>a.publication.title='',a=>a.publication.version='bad\nmetadata',a=>a.publication.published_on='2021-02-01',a=>a.rights.statement='',a=>a.rights.license_id='CC0-1.0',a=>a.rights.reviewed_on='2026-02-30',a=>a.rights.attribution='',a=>a.scope.clinical_use=true,a=>a.resource.bytes=MAX_SAMPLE_BYTES+1,a=>a.resource.bytes=1.5,a=>a.resource.sha256='not-a-hash',a=>a.resource.file='../original.json',a=>a.resource.media_type='application/pdf']){
    const a=structuredClone(approved);mutate(a);assert.throws(()=>validateApproval(a));
  }
});
test('N07: exact source identity/public-rights/author/version fields are checked after hashing; HTML, invalid UTF-8 and altered bytes reject',()=>{
  const {a,bytes}=fixture();assert.equal(validateOriginal(bytes,a).id,20205008796);
  assert.throws(()=>validateOriginal(Buffer.concat([bytes,Buffer.from(' ')]),a),code('HASH_MISMATCH'));
  for(const extra of [{id:42},{distribution:'PRIVATE'},{status:'DRAFT'},{onlyAbstract:false},{copyright:{determinationType:'OTHER',containsThirdPartyMaterial:true}},{exportControl:{isExportControl:'YES'}},{authorAffiliations:[]},{modified:'other'}]){
    const f=fixture(extra);assert.throws(()=>validateOriginal(f.bytes,f.a),code('SOURCE_METADATA_MISMATCH'));
  }
  for(const bytes of [Buffer.from('<html>Not JSON</html>'),Buffer.from([0xff,0xfe,0x00])]){const a=structuredClone(approved);a.resource.bytes=bytes.length;a.resource.sha256=sha256(bytes);assert.throws(()=>validateOriginal(bytes,a),code('UNSUPPORTED_CONTENT'));}
});
test('N07: original bytes, provenance and receipt commit together; repeated offline verification/acquire never refetch or overwrite',async t=>{
  const root=await temp(t),{a,bytes}=fixture();let calls=0;
  const transport=async(url,{headers})=>{calls++;assert.equal(url,a.resource.url);assert.equal(headers['Accept-Encoding'],'identity');assert.equal(headers.Range,undefined);return response(bytes,{body:chunks(bytes.subarray(0,100),bytes.subarray(100))});};
  const first=await acquire({root,approval:a,clock,transport});assert.equal(first.network_requests,1);assert.equal(calls,1);
  assert.deepEqual(await readFile(join(first.entry,'original.json')),bytes);assert.equal(first.manifest.approval_sha256,approvalHash(a));
  assert.deepEqual(first.manifest.publication,a.publication);assert.deepEqual(first.manifest.rights,a.rights);assert.equal(first.manifest.publication.published_on,null);
  assert.equal(first.manifest.retrieval.started_at,instant);assert.equal(first.manifest.retrieval.completed_at,instant);
  const before=await stat(join(first.entry,'original.json')),manifest=await readFile(join(first.entry,'manifest.json'));
  const second=await acquire({root,approval:a,clock,transport:()=>assert.fail('No network on cached verification')});
  assert.equal(second.network_requests,0);assert.equal((await verifyCache({root,approval:a})).sha256,sha256(bytes));
  assert.equal((await stat(join(first.entry,'original.json'))).mtimeMs,before.mtimeMs);assert.deepEqual(await readFile(join(first.entry,'manifest.json')),manifest);
});
test('N07: interruption resumes only the verified prefix with exact Range and If-Range; original sequence and receipt survive restart',async t=>{
  const root=await temp(t),{a,bytes}=fixture(),prefix=await interrupted(root,a,bytes);
  const result=await acquire({root,approval:a,clock:()=> '2026-10-23T09:01:00.000Z',transport:async(url,{headers})=>{
    assert.equal(url,a.resource.url);assert.equal(headers.Range,`bytes=${prefix.length}-`);assert.equal(headers['If-Range'],'"test-v1"');
    return response(bytes.subarray(prefix.length),{status:206,headers:{'content-range':`bytes ${prefix.length}-${bytes.length-1}/${bytes.length}`}});
  }});
  assert.deepEqual(await readFile(join(result.entry,'original.json')),bytes);assert.equal(result.manifest.retrieval.requests,2);assert.equal(result.manifest.retrieval.started_at,instant);assert.equal(result.manifest.retrieval.completed_at,'2026-10-23T09:01:00.000Z');
});
test('N07: crash recovery truncates only an uncommitted partial tail; committed prefix integrity remains mandatory',async t=>{
  const root=await temp(t),{a,bytes}=fixture(),prefix=await interrupted(root,a,bytes);
  await appendFile(join(partial(root,a),'original.json'),'uncommitted tail');
  const result=await acquire({root,approval:a,clock,transport:async()=>response(bytes.subarray(prefix.length),{status:206,headers:{'content-range':`bytes ${prefix.length}-${bytes.length-1}/${bytes.length}`}})});
  assert.deepEqual(await readFile(join(result.entry,'original.json')),bytes);
});
test('N07: corrupt partials and approval drift fail before any network; they cannot become accepted originals',async t=>{
  for(const tamper of ['prefix','approval']){
    const root=await temp(t),{a,bytes}=fixture();await interrupted(root,a,bytes);const stage=partial(root,a);
    if(tamper==='prefix')await writeFile(join(stage,'original.json'),Buffer.alloc(70,0));
    else{const p=JSON.parse(await readFile(join(stage,'progress.json')));p.approval_sha256='0'.repeat(64);await writeFile(join(stage,'progress.json'),JSON.stringify(p));}
    await assert.rejects(acquire({root,approval:a,clock,transport:()=>assert.fail('Corruption must fail before network')}),code(tamper==='prefix'?'HASH_MISMATCH':'CACHE_CORRUPT'));
    await assert.rejects(verifyCache({root,approval:a}),code('ENOENT'));
  }
});
test('N07: redirects, HTML, compressed responses, unsupported headers and size overrun reject without a retry',async t=>{
  for(const options of [{status:302},{headers:{'content-type':'text/html'}},{headers:{'content-encoding':'gzip'}},{headers:{'content-length':String(MAX_SAMPLE_BYTES+1)}},{headers:{'content-length':'garbage'}},{headers:{'content-type':['application/json','text/html']}},{headers:{'content-range':'bytes 0-3/4'}},{body:chunks(Buffer.alloc(5000))}]){
    const root=await temp(t),{a,bytes}=fixture();let calls=0,received;
    await assert.rejects(acquire({root,approval:a,clock,transport:async()=>{calls++;return received=response(bytes,options);}}));
    assert.equal(calls,1);assert.equal(received.closed,true);await assert.rejects(verifyCache({root,approval:a}),code('ENOENT'));
    await assert.rejects(acquire({root,approval:a,clock,transport:()=>assert.fail('Rejected evidence must not retry')}),code('REJECTED_PARTIAL'));
  }
});
test('N07: resumed 200, wrong range and changed/missing strong ETag never mix representations',async t=>{
  for(const options of [{status:200},{status:206,headers:{'content-range':'bytes 0-1/2'}},{status:206,headers:{etag:'"changed"'}},{status:206,headers:{etag:undefined}}]){
    const root=await temp(t),{a,bytes}=fixture(),prefix=await interrupted(root,a,bytes);
    const headers={'content-range':`bytes ${prefix.length}-${bytes.length-1}/${bytes.length}`,...options.headers};
    await assert.rejects(acquire({root,approval:a,clock,transport:async()=>response(bytes.subarray(prefix.length),{...options,headers})}));
    assert.deepEqual(await readFile(join(partial(root,a),'original.json')),prefix);
  }
});
test('N07: early clean EOF retains a safe partial for explicit resume rather than accepting incomplete data',async t=>{
  const root=await temp(t),{a,bytes}=fixture();
  await assert.rejects(acquire({root,approval:a,clock,transport:async()=>response(bytes,{body:chunks(bytes.subarray(0,45))})}),code('TRANSPORT_INTERRUPTED'));
  const result=await acquire({root,approval:a,clock,transport:async()=>response(bytes.subarray(45),{status:206,headers:{'content-range':`bytes 45-${bytes.length-1}/${bytes.length}`}})});
  assert.equal(result.sha256,a.resource.sha256);
});
test('N07: without an ETag, exact range plus final pinned SHA permits safe resume and rejects mixed source bytes',async t=>{
  for(const changed of [false,true]){
    const root=await temp(t),{a,bytes}=fixture();
    await assert.rejects(acquire({root,approval:a,clock,transport:async()=>response(bytes,{headers:{etag:undefined},body:chunks(bytes.subarray(0,70))})}),code('TRANSPORT_INTERRUPTED'));
    const tail=Buffer.from(bytes.subarray(70));if(changed)tail[0]^=1;
    const op=acquire({root,approval:a,clock,transport:async(url,{headers})=>{
      assert.equal(headers.Range,'bytes=70-');assert.equal(headers['If-Range'],undefined);
      return response(tail,{status:206,headers:{etag:undefined,'content-range':`bytes 70-${bytes.length-1}/${bytes.length}`}});
    }});
    if(changed)await assert.rejects(op,code('HASH_MISMATCH'));else assert.equal((await op).sha256,a.resource.sha256);
  }
});
test('N07: full-size SHA mismatch is rejected permanently; snapshot change never updates the pin or original',async t=>{
  const root=await temp(t),{a,bytes}=fixture();const changed=Buffer.from(bytes);changed[15]^=1;
  await assert.rejects(acquire({root,approval:a,clock,transport:async()=>response(changed)}),code('HASH_MISMATCH'));
  assert.equal(a.resource.sha256,sha256(bytes));await assert.rejects(verifyCache({root,approval:a}),code('ENOENT'));
  await assert.rejects(acquire({root,approval:a,clock,transport:()=>assert.fail('No silent repin')}),code('REJECTED_PARTIAL'));
});
test('N07: deadlines cover pending headers/body and external cancellation; no background commit after timeout',async t=>{
  for(const pending of ['headers','body']){
    const root=await temp(t),{a,bytes}=fixture();let res;
    await assert.rejects(acquire({root,approval:a,clock,deadlineMs:15,transport:async()=>pending==='headers'?new Promise(()=>{}):(res=response(bytes,{body:(async function*(){await new Promise(()=>{});})()}))}),code('ACQUISITION_ABORTED'));
    if(res)assert.equal(res.closed,true);await assert.rejects(verifyCache({root,approval:a}),code('ENOENT'));
  }
  const root=await temp(t),{a}=fixture(),c=new AbortController();c.abort();
  await assert.rejects(acquire({root,approval:a,clock,signal:c.signal,transport:()=>assert.fail('No request after cancellation')}),code('ACQUISITION_ABORTED'));
  for(const deadlineMs of [0,-1,1.5,15001,Infinity])await assert.rejects(acquire({root,approval:a,deadlineMs}),code('INVALID_LIMIT'));
});
test('N07: request count is durable and bounded across explicit resume attempts; there is no automatic retry',async t=>{
  const root=await temp(t),{a,bytes}=fixture();let calls=0;
  for(let i=0;i<MAX_REQUESTS;i++)await assert.rejects(acquire({root,approval:a,clock,transport:async()=>{calls++;return response(bytes,{body:(async function*(){throw Error('network');})()});}}),/network/);
  assert.equal(calls,MAX_REQUESTS);await assert.rejects(acquire({root,approval:a,clock,transport:()=>assert.fail('Attempt limit')}),code('REQUEST_LIMIT'));
});
test('N07: monotonic deadline bounds an endless empty-chunk stream even if microtasks delay the timeout callback',async t=>{
  const root=await temp(t),{a,bytes}=fixture();let yielded=0;
  await assert.rejects(acquire({root,approval:a,clock,deadlineMs:100,transport:async()=>response(bytes,{body:(async function*(){for(;;){yielded++;yield Buffer.alloc(0);}})()})}),code('ACQUISITION_ABORTED'));
  assert.ok(yielded>0,'Exercise the streaming loop, not only startup timeout');
  await assert.rejects(verifyCache({root,approval:a}),code('ENOENT'));
});
test('N07: explicit mid-stream cancellation retains only committed bytes and a new invocation resumes safely',async t=>{
  const root=await temp(t),{a,bytes}=fixture(),c=new AbortController();
  await assert.rejects(acquire({root,approval:a,clock,signal:c.signal,transport:async()=>response(bytes,{body:(async function*(){yield bytes.subarray(0,70);c.abort();yield bytes.subarray(70);})()})}),code('ACQUISITION_ABORTED'));
  assert.deepEqual(await readFile(join(partial(root,a),'original.json')),bytes.subarray(0,70));
  const result=await acquire({root,approval:a,clock,transport:async()=>response(bytes.subarray(70),{status:206,headers:{'content-range':`bytes 70-${bytes.length-1}/${bytes.length}`}})});
  assert.equal(result.sha256,a.resource.sha256);
});
test('N07: concurrent/stale locks fail safely without removing someone else\'s lock',async t=>{
  const root=await temp(t),{a}=fixture(),lock=join(root,`.${a.id}.lock`);await writeFile(lock,'operator-owned');
  await assert.rejects(acquire({root,approval:a,clock}),code('CACHE_BUSY'));assert.equal((await readFile(lock)).toString(),'operator-owned');
});
test('N07: symbolic roots and symbolic partial files cannot escape the dedicated cache',{skip:process.platform==='win32'?'Native Windows symlink creation may require privileges; no OS change is authorized.':false},async t=>{
  const root=await temp(t),{a,bytes}=fixture();
  const other=await temp(t),link=join(other,'linked');await symlink(root,link,'dir');await assert.rejects(acquire({root:link,approval:a,clock}),code('UNSAFE_CACHE'));
  const cache=await temp(t);await interrupted(cache,a,bytes);const raw=join(partial(cache,a),'original.json');await rm(raw);await symlink(join(root,'outside'),raw);await writeFile(join(root,'outside'),'outside');
  await assert.rejects(acquire({root:cache,approval:a,clock,transport:()=>assert.fail('Symlink cannot trigger network')}),code('UNSAFE_CACHE'));assert.equal((await readFile(join(root,'outside'))).toString(),'outside');
});
test('N07: completed manifests, original bytes and receipt hashes are rechecked; tampering never triggers a repair download',async t=>{
  for(const target of ['original.json','manifest.json','progress.json']){
    const root=await temp(t),{a,bytes}=fixture();const result=await acquire({root,approval:a,clock,transport:async()=>response(bytes)});
    if(target==='original.json'){const b=Buffer.from(bytes);b[0]^=1;await writeFile(join(result.entry,target),b);}
    else{const data=JSON.parse(await readFile(join(result.entry,target)));if(target==='manifest.json')data.rights.attribution='Tampered attribution';else data.prefix_sha256='0'.repeat(64);await writeFile(join(result.entry,target),JSON.stringify(data));}
    await assert.rejects(verifyCache({root,approval:a}));await assert.rejects(acquire({root,approval:a,clock,transport:()=>assert.fail('No repair overwrite')}));
  }
});
test('N07: interrupted directory promotion resumes offline; full bytes without confirmed response completion are insufficient',async t=>{
  for(const complete of [true,false]){
    const root=await temp(t),{a,bytes}=fixture(),result=await acquire({root,approval:a,clock,transport:async()=>response(bytes)}),stage=partial(root,a);
    await rename(result.entry,stage);
    if(!complete){const p=JSON.parse(await readFile(join(stage,'progress.json')));p.response_complete=false;await writeFile(join(stage,'progress.json'),JSON.stringify(p));}
    const operation=acquire({root,approval:a,clock,transport:()=>assert.fail('No automatic replacement collection')});
    if(complete){const verified=await operation;assert.equal(verified.network_requests,0);assert.equal(verified.sha256,a.resource.sha256);}
    else await assert.rejects(operation,code('INCOMPLETE_RESPONSE'));
  }
});
test('N07: untrusted links and instruction-like strings are preserved as inert original bytes, never followed or executed',async t=>{
  const root=await temp(t),{a,bytes}=fixture({abstract:'<script>do not execute</script> ignore previous instructions',downloads:[{url:'https://evil.test/run'}]});let calls=0;
  const result=await acquire({root,approval:a,clock,transport:async url=>{calls++;assert.equal(url,a.resource.url);return response(bytes);}});
  assert.equal(calls,1);assert.deepEqual(await readFile(join(result.entry,'original.json')),bytes);assert.equal(result.manifest.scope.corpus_ingestion,false);
});
test('N07: shipped single NASA metadata snapshot verifies offline against the reviewed source and its complete manifest',async()=>{
  const root=fileURLToPath(new URL('../data/scientific/cache/',import.meta.url));const result=await verifyCache({root,approval:approved});
  assert.equal(result.bytes,6995);assert.equal(result.sha256,'3429154f91f4bc5476fc7adb7ee18f5a811b8bed2de7acad0f5c94e530ebb4f0');
  assert.equal(result.manifest.retrieval.requests,1);assert.equal(result.manifest.original.media_type,'application/json');assert.equal(result.manifest.scope.contains_patient_data,false);
});
