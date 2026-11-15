import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AnatomyScene, ANATOMY_IDS, validateManifest } from '../apps/mission-control-web/anatomy.mjs';
import { GLTFLoader } from '../apps/mission-control-web/vendor/three/GLTFLoader.js';
import { disposeAnatomyTree } from '../apps/mission-control-web/anatomy-runtime.mjs';
import { makeDocument, frontendSession } from './dom-harness.mjs';
import { createApp } from '../services/api/server.mjs';
import { transport } from './http-harness.mjs';
const assetRoot=new URL('../apps/mission-control-web/assets/anatomy/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',assetRoot),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const arrayBuffer=data=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
const bytes=new Map(manifest.assets.map(a=>[a.file,readFileSync(new URL(a.file,assetRoot))]));

test('N05-01: manifest identities, original source hashes, authors, version, units and lawful derivation are traceable',()=>{
  assert.equal(validateManifest(manifest),manifest);assert.equal(manifest.license,'CC-BY-SA-2.1-JP');assert.match(manifest.credit,/Database Center for Life Science/);
  const sourceRoot=new URL('../packages/three-assets/bodyparts3d-4.3/',import.meta.url),inputBytes=readFileSync(new URL('inputs.json',sourceRoot)),inputs=JSON.parse(inputBytes);
  assert.equal(sha(inputBytes),manifest.source_inputs_sha256);assert.equal(inputs.complete,true);assert.equal(inputs.assets.length,326);
  const known=new Set();
  for(const a of inputs.assets){assert.ok(a.element_id&&a.concept_id&&a.representation_id&&a.creator_record&&a.catalogue_representation_id);const data=readFileSync(new URL(a.file,sourceRoot));assert.equal(data.length,a.bytes);assert.equal(sha(data),a.sha256);const header=data.subarray(0,2000).toString();assert.match(header,/Compatibility version : 4\.3/);for(const [key,label]of [['element_id','File ID'],['representation_id','Representation ID'],['concept_id','Concept ID']])assert.equal(header.match(new RegExp('^# '+label+'\\s*:\\s*(\\S+)','m'))?.[1],a[key]);known.add(a.element_id);}
  for(const c of manifest.components)for(const m of c.members)assert.ok(known.has(m.element_id));
  assert.match(manifest.transform.source_units,/millimetres/);assert.equal(manifest.transform.scene_up,'Y');assert.equal(manifest.transform.scene_units,'metres');
  assert.equal(manifest.components.find(c=>c.id==='reference.lung.left').members.length,9);assert.equal(manifest.components.find(c=>c.id==='reference.lung.right').members.length,9);
});
test('N05-01: combined critical graphics stay below the literal 20,000,000 byte cap; local Three.js is exactly pinned',()=>{
  const root=new URL('../apps/mission-control-web/',import.meta.url);
  const sum=(dir)=>readdirSync(dir).reduce((n,name)=>{const p=new URL(name,dir);return n+(statSync(p).isFile()?statSync(p).size:sum(new URL(name+'/',dir)));},0);
  const total=sum(new URL('assets/earth/',root))+sum(new URL('assets/anatomy/',root))+sum(new URL('vendor/three/',root))+['anatomy.mjs','anatomy-runtime.mjs','anatomy.css','scenes.mjs','earth.mjs'].reduce((n,f)=>n+statSync(new URL(f,root)).size,0);
  assert.ok(total<=20_000_000,'Critical graphics '+total);
  assert.equal(JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).dependencies.three,'0.186.1');
  const vendor=JSON.parse(readFileSync(new URL('vendor/three/manifest.json',root)));
  for(const a of vendor.files)assert.equal(sha(readFileSync(new URL('vendor/three/'+a.file,root))),a.sha256);
});
test('N05-01: actual local GLBs parse through pinned GLTFLoader, with five independent semantic meshes and no remote/decoder/animation requirements',async()=>{
  const found=[];
  for(const a of manifest.assets){
    const data=bytes.get(a.file);assert.equal(sha(data),a.sha256);assert.equal(data.length,a.bytes);assert.equal(data.toString('ascii',0,4),'glTF');
    const gltfJSON=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)).trim());
    assert.equal(gltfJSON.extensionsRequired,undefined);assert.equal(gltfJSON.animations,undefined);assert.ok(gltfJSON.buffers.every(b=>!b.uri));assert.equal(gltfJSON.images,undefined);
    const gltf=await new GLTFLoader().parseAsync(arrayBuffer(data),'');
    gltf.scene.traverse(n=>{if(n.isMesh){const id=n.userData.astra_semantic_id;found.push(id);assert.notEqual(id,n.uuid);assert.ok(n.geometry.attributes.position.count>100);assert.ok(n.geometry.index.count>300);}});
    disposeAnatomyTree(gltf.scene);
  }
  assert.deepEqual(found.sort(),[...ANATOMY_IDS].sort());
});
test('N05-01: duplicate/unknown IDs, external filenames and oversized manifests reject rather than silently substitute anatomy',()=>{
  for(const change of [m=>m.components[1].id=m.components[0].id,m=>m.assets[0].file='https://example.org/body.glb',m=>m.payload_bytes=20_000_001,m=>m.assets[0].sha256='unverified']){
    const m=structuredClone(manifest);change(m);assert.throws(()=>validateManifest(m));
  }
});

async function fixture(fn,overrides={}){
  const saved=new Map(),frames=new Map();let next=0;const observers=[];
  const put=(k,v)=>{saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});};
  const document=makeDocument(),container=document.createElement('div');document.body.append(container);
  const counts={dispose:0,release:0,render:0,attach:[],layers:[],camera:[],sizes:[]};
  const world={parse:async()=>({}),attach:(n,ids)=>counts.attach.push(...ids),layer:(...v)=>counts.layers.push(v),size:(...v)=>counts.sizes.push(v),render:()=>{counts.render++;},camera:a=>counts.camera.push(a),dispose:()=>{counts.dispose++;},...overrides.world};
  const fetcher=async path=>path.endsWith('manifest.json')?{ok:true,json:async()=>structuredClone(manifest)}:{ok:true,arrayBuffer:async()=>arrayBuffer(bytes.get(path.split('/').at(-1)))};
  put('document',document);put('window',{devicePixelRatio:2,addEventListener(){},removeEventListener(){}});
  put('requestAnimationFrame',fn=>{const id=++next;frames.set(id,fn);return id;});put('cancelAnimationFrame',id=>frames.delete(id));
  const Observer=class{constructor(fn){this.fn=fn;this.disconnected=false;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  put('ResizeObserver',Observer);put('IntersectionObserver',Observer);
  const options={fetch:fetcher,loadRuntime:async()=>({createAnatomyWorld:()=>world,disposeAnatomyTree:()=>{counts.release++;}}),...overrides.options};
  const scene=new AnatomyScene(container,'anatomy',options);
  const paint=()=>{for(const [id,fn]of [...frames]){frames.delete(id);fn();}};
  try{await fn({scene,document,container,counts,world,frames,paint,observers});}finally{scene.dispose();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
}
test('N05-01: one demand frame, progressive layers, camera, quality and telemetry isolation; complete idempotent disposal',async()=>{
  await fixture(async({scene,counts,frames,paint,observers,container})=>{
    scene.setLayer('body',false);await scene.ready;assert.equal(scene.state,'ready');assert.equal(container.getAttribute('aria-busy'),'false');assert.deepEqual(counts.attach.sort(),[...ANATOMY_IDS].sort());
    assert.ok(counts.layers.some(([name,on])=>name==='body'&&!on));
    assert.equal(frames.size,1);paint();assert.equal(counts.render,1);assert.equal(frames.size,0);
    scene.update({heartRate:140,breathingRate:30,warning:true,quality:'good'});assert.equal(frames.size,0,'Static reference is not data-driven animation');
    scene.camera('left');assert.deepEqual(counts.camera,['left']);paint();assert.equal(frames.size,0);
    scene.options.performance=true;scene.options.reducedMotion=false;scene.size();const s=counts.sizes.at(-1);assert.ok(s[0]*s[1]*s[2]**2<=650001);assert.equal(scene.options.reducedMotion,false);
    scene.dispose();scene.dispose();assert.equal(counts.dispose,1);assert.equal(frames.size,0);assert.ok(observers.every(o=>o.disconnected));assert.equal(container.childNodes.length,0);
  });
});
test('N05-01: navigation cancellation aborts load and never attaches stale geometry',async()=>{
  let release;await fixture(async({scene,counts})=>{
    scene.dispose();release({ok:true,json:async()=>manifest});await scene.ready;assert.equal(scene.controller.signal.aborted,true);assert.equal(counts.attach.length,0);assert.equal(scene.world,null);
  },{options:{fetch:()=>new Promise(resolve=>release=resolve)}});
});
test('N05-01: late GLTF parsing after navigation releases detached geometry exactly once',async()=>{
  let release,started;const parsing=new Promise(resolve=>started=resolve);
  await fixture(async({scene,counts})=>{
    await parsing;scene.dispose();release({});await scene.ready;assert.equal(counts.release,1);assert.equal(counts.attach.length,0);assert.equal(counts.dispose,1);
  },{world:{parse:()=>{started();return new Promise(resolve=>release=resolve);}}});
});
test('N05-01: failed/integrity-invalid loading and unsupported graphics preserve meaningful text and monitoring DOM',async()=>{
  for(const options of [{fetch:async()=>({ok:false})},{loadRuntime:async()=>{throw Error('WebGL2 unsupported');}},{fetch:async path=>path.endsWith('.json')?{ok:true,json:async()=>manifest}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}}])await fixture(async({scene,document,container})=>{
    const marker=document.createElement('p');marker.textContent='Synthetic observation: 71';document.body.append(marker);await scene.ready;
    assert.equal(scene.state,'fallback');assert.equal(scene.mode,'Text fallback');assert.ok(container.textContent.includes('Data-linked schematic'));assert.equal(marker.textContent,'Synthetic observation: 71');assert.equal(container.getAttribute('aria-busy'),'false');
  },{options});
});
test('N05-01: lost context/render failure cancels frames, releases GPU owner and preserves schematic option',async()=>{
  await fixture(async({scene,counts,paint,frames})=>{
    await scene.ready;await scene.canvas.emit('webglcontextlost');assert.equal(scene.state,'fallback');assert.equal(counts.dispose,1);assert.equal(frames.size,0);scene.dispose();assert.equal(counts.dispose,1);
  });
  await fixture(async({scene,counts,paint})=>{await scene.ready;paint();assert.equal(scene.state,'fallback');assert.equal(counts.dispose,1);},{world:{render:()=>{throw Error('GPU lost');}}});
});
test('N05-01: hidden/offscreen scenes suspend drawing and keyboard controls remain deliberate in reduced motion',async()=>{
  await fixture(async({scene,document,counts,frames,paint,observers})=>{
    await scene.ready;document.hidden=true;await document.emit('visibilitychange');assert.equal(frames.size,0);
    document.hidden=false;await document.emit('visibilitychange');paint();
    observers[1].fn([{isIntersecting:false}]);scene.camera('in');assert.equal(frames.size,0);
    observers[1].fn([{isIntersecting:true}]);paint();scene.options.reducedMotion=true;
    await scene.canvas.emit('keydown',{key:'Home'});assert.equal(counts.camera.at(-1),'reset');paint();assert.equal(frames.size,0);
  });
});
test('N05-01: static GLB MIME support retains CSP and existing authorization/privacy contracts',async()=>{
  const app=createApp({autoTick:false});try{
    const call=transport(app),r=await call('/assets/anatomy/organs.glb');assert.equal(r.status,200);assert.equal(r.headers['Content-Type'],'model/gltf-binary');assert.equal(sha(Buffer.concat(r.raw.chunks)),manifest.assets.find(a=>a.file==='organs.glb').sha256);
    assert.ok(!r.headers['Content-Security-Policy'].includes('wasm'));assert.equal((await call('/v1/state')).status,401);
  }finally{await app.close();}
});
test('N05-01: Crew Health offers reference and retained data-linked schematic without changing selected metrics or labels',async()=>{
  const app=createApp({autoTick:false});let ui;try{
    ui=await frontendSession(app,'demo_admin');ui.module.navigate('crew');await ui.flush();
    const metrics=ui.el('#crew-metric-tiles').textContent;assert.ok(ui.el('[data-twin-view="anatomy"]'));assert.match(ui.el('.twin-controls').textContent,/Not a reconstruction/);assert.match(ui.el('#twin-annotation').textContent,/NO HEALTH INFERENCE/);
    await ui.click('[data-twin-view="schematic"]');assert.ok(ui.el('[data-layer="0"]'));assert.match(ui.el('.twin-controls').textContent,/Animation follows observed/);assert.equal(ui.el('#crew-metric-tiles').textContent,metrics);
    await ui.click('[data-twin-view="anatomy"]');assert.equal(ui.module.inspect().scenes.length,1);assert.equal(ui.el('#crew-metric-tiles').textContent,metrics);
    ui.module.navigate('overview');assert.equal(ui.module.inspect().scenes.length,1);assert.equal(ui.module.inspect().scenes[0].type,'earth');
  }finally{await ui?.close();await app.close();}
});
