/* N05 lifecycle with explicitly enabled N06 synthetic navigation/timing. */
import { PhaseClock,LINK_VERSION } from './anatomy-phase.mjs';
export const ANATOMY_IDS=Object.freeze(['reference.body','reference.skeleton','reference.heart','reference.lung.left','reference.lung.right']);
export const ANATOMY_MANIFEST='/assets/anatomy/manifest.json';
const MANIFEST_PIN='98028edd14f0bfb9a5b17b1d885fa008558d3a428e2e6cae3b7f4795c521994b';

export function validateManifest(m){
  if(m?.version!=='astra.reference-anatomy.n05-01.v1'||!Number.isSafeInteger(m.payload_bytes)||m.payload_bytes<=0||m.payload_bytes>16_000_000)throw Error('Unsupported reference anatomy manifest');
  const ids=m.components?.map(c=>c.id)??[];
  if(ids.length!==ANATOMY_IDS.length||ANATOMY_IDS.some(id=>ids.filter(v=>v===id).length!==1))throw Error('Reference component identities are incomplete');
  if(!Array.isArray(m.assets)||m.assets.length!==3||m.assets.reduce((n,a)=>n+a.bytes,0)!==m.payload_bytes)throw Error('Reference asset budget mismatch');
  for(const a of m.assets)if(!/^(body|skeleton|organs)\.glb$/.test(a.file)||!Number.isSafeInteger(a.bytes)||a.bytes<=0||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Invalid local reference asset');
  if(new Set(m.assets.map(a=>a.file)).size!==3)throw Error('Duplicate reference asset');
  return m;
}

export class AnatomyScene {
  constructor(container,type='anatomy',options={}){
    this.container=container;this.type=type;this.options=options;this.data={};this.mode='Loading';this.state='loading';this.disposed=false;this.visible=true;this.listeners=[];this.frame=null;this.world=null;this.layers={body:true,skeleton:true,organs:true};
    this.controller=new AbortController();this.generation=0;this.started=performance.now();this.qualityChoice='auto';this.loadTimings=[];
    this.phase=new PhaseClock();this.selectedRegion=null;this.updatedAt=performance.now();
    this.canvas=document.createElement('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Generic adult male reference anatomy. Reference body, skeleton, heart surfaces and lungs. Drag to orbit; arrow keys rotate; plus and minus zoom; Home resets. Not individual astronaut anatomy.');
    container.append(this.canvas);container.setAttribute('aria-busy','true');container.setAttribute('data-anatomy-state','loading');
    this.status=document.createElement('p');this.status.className='anatomy-load-state';this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');container.append(this.status);
    this.listen(this.canvas,'keydown',e=>{const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out',Home:'reset'}[e.key];if(action){e.preventDefault();this.camera(action);}});
    this.listen(this.canvas,'pointerdown',e=>{this.pointer={x:e.clientX,y:e.clientY,id:e.pointerId};});
    this.listen(this.canvas,'pointerup',e=>{const p=this.pointer;this.pointer=null;if(!this.options.linkage||!p||p.id!==e.pointerId||Math.hypot(e.clientX-p.x,e.clientY-p.y)>6)return;const b=this.canvas.getBoundingClientRect();const id=this.world?.pick?.((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);if(id)this.options.onInspect?.(id);});
    this.listen(this.canvas,'pointercancel',()=>{this.pointer=null;});
    this.listen(this.canvas,'webglcontextlost',e=>{e.preventDefault();this.fallback('Graphics context lost.');});
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.cancelPaint();else this.requestPaint();});
    if(typeof ResizeObserver!=='undefined'){this.resize=new ResizeObserver(()=>this.size());this.resize.observe(container);}else this.listen(window,'resize',()=>this.size());
    if(typeof IntersectionObserver!=='undefined'){this.visibility=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);this.visible?this.requestPaint():this.cancelPaint();});this.visibility.observe(container);}
    this.notify('Loading locally served reference anatomy…');
    this.ready=this.load(++this.generation);
  }
  listen(target,event,fn){target.addEventListener(event,fn);this.listeners.push([target,event,fn]);}
  notify(message){if(this.disposed)return;this.status.textContent=message;this.options.onMode?.(this.mode);this.options.onStatus?.(this.state,message);}
  async load(generation){
    const active=()=>!this.disposed&&generation===this.generation&&!this.controller.signal.aborted;
    const fetcher=this.options.fetch??globalThis.fetch;
    const timer=this.loadTimer=setTimeout(()=>{if(active())this.fallback('Reference anatomy load timed out.');},15000);
    try{
      const response=await fetcher(ANATOMY_MANIFEST,{signal:this.controller.signal});if(!response.ok)throw Error('Reference manifest unavailable');
      const manifest=validateManifest(await response.json());if(!active())return;
      const pin=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(manifest)));
      if([...new Uint8Array(pin)].map(v=>v.toString(16).padStart(2,'0')).join('')!==MANIFEST_PIN)throw Error('Reference manifest integrity mismatch');if(!active())return;
      const runtime=await(this.options.loadRuntime??(()=>import('./anatomy-runtime.mjs')))();if(!active())return;
      this.world=runtime.createAnatomyWorld(this.canvas,()=>this.requestPaint());this.size();
      // Progressive coarse structure -> organs -> skeleton; each remains independently disposable.
      for(const name of ['body.glb','organs.glb','skeleton.glb']){
        const asset=manifest.assets.find(a=>a.file===name);
        const r=await fetcher('/assets/anatomy/'+asset.file,{signal:this.controller.signal});if(!r.ok)throw Error('Reference geometry unavailable');
        const data=await r.arrayBuffer();if(!active())return;
        if(data.byteLength!==asset.bytes)throw Error('Reference geometry length mismatch');
        const digest=await crypto.subtle.digest('SHA-256',data);if(!active())return;
        if([...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')!==asset.sha256)throw Error('Reference geometry integrity mismatch');
        const start=performance.now(),node=await this.world.parse(data);
        if(!active()){runtime.disposeAnatomyTree(node);return;}
        if(this.world.prepare)await this.world.prepare(node,manifest.components.filter(c=>asset.components.includes(c.id)),active);
        if(!active()){runtime.disposeAnatomyTree(node);return;}this.loadTimings.push({asset:name,decode_and_LOD_ms:performance.now()-start,ready_ms:performance.now()-this.started});
        try{this.world.attach(node,asset.components);}catch(error){runtime.disposeAnatomyTree(node);throw error;}for(const [layer,on]of Object.entries(this.layers))this.world.layer(layer,on);
        this.requestPaint();this.notify(name==='body.glb'?'Body envelope loaded; loading internal reference layers…':name==='organs.glb'?'Heart and lungs loaded; loading skeleton…':'Reference anatomy loaded. Synthetic HR/RR illustration only when explicitly enabled; no organ diagnosis.');
      }
      if(!active())return;
      this.readyElapsed=performance.now()-this.started;this.state='ready';this.mode='WebGL2 anatomy';containerReady(this.container,'ready');this.notify('Reference anatomy loaded · BodyParts3D 4.3 · generic reference geometry');
      this.options.onAsset?.('ready');this.requestPaint();
    }catch(error){if(active())this.fallback(error.message??'Reference anatomy unavailable.');}
    finally{clearTimeout(timer);if(this.loadTimer===timer)this.loadTimer=null;}
  }
  update(data){if(!this.options.linkage||data?.schema_version!==LINK_VERSION)return;const continuing=this.data?.crew_id===data.crew_id&&data.mode!=='HISTORICAL REPLAY'&&this.data?.mode!=='HISTORICAL REPLAY'&&Date.parse(data.as_of)>=Date.parse(this.data.as_of);this.data=data;this.phase.update({...data.motion,crew_id:data.crew_id,as_of:data.as_of,replay:data.mode!=='CURRENT SYNTHETIC'});if(continuing&&this.visualPhases)for(let i=0;i<2;i++)if(!this.phase.good[i])this.phase.phases[i]=this.visualPhases[i];this.updatedAt=performance.now();this.requestPaint();}
  select(id){this.selectedRegion=id;this.world?.select?.(id);this.requestPaint();}
  moving(){const host=performance.now()-this.updatedAt,elapsed=host*Math.max(1,this.data.speed??1);return this.options.linkage&&this.data?.mode==='CURRENT SYNTHETIC'&&!this.options.reducedMotion&&host<5000&&this.phase.good.some((good,i)=>good&&elapsed<this.phase.horizons[i]);}
  setQuality(value){if(!['auto','detail','coarse'].includes(value))throw Error('Unsupported reference quality');this.qualityChoice=value;this.size();}
  size(){if(this.disposed)return;const box=this.container.getBoundingClientRect();const width=Math.max(1,box.width),height=Math.max(1,box.height);const dpr=Math.min(window.devicePixelRatio||1,this.options.performance?.8:1.35);const cap=this.options.performance?650000:1600000;const ratio=Math.min(dpr,Math.sqrt(cap/(width*height)));this.world?.quality?.(this.qualityChoice==='auto'?(this.options.performance||width<700?'coarse':'detail'):this.qualityChoice);this.world?.size(width,height,ratio);this.requestPaint();}
  requestPaint(){if(this.disposed||!this.world||this.frame!==null||document.hidden||!this.visible)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(this.disposed||!this.world||document.hidden||!this.visible)return;try{if(this.options.linkage){const elapsed=this.data?.mode==='CURRENT SYNTHETIC'&&!this.options.reducedMotion?Math.min(5000,performance.now()-this.updatedAt)*Math.max(1,this.data.speed??1):0;this.visualPhases=this.phase.sample(elapsed);this.world.pose?.(this.visualPhases,!this.options.reducedMotion);this.world.select?.(this.selectedRegion);}this.world.render();this.diagnostics();if(this.moving())this.requestPaint();}catch{this.fallback('Reference rendering failed.');}});}
  diagnostics(){const m=this.world?.metrics?.();if(!m)return;this.container.setAttribute('data-reference-metrics',JSON.stringify({...m,load_timings:this.loadTimings,total_ready_ms:this.readyElapsed??null}));const e=this.container.parentNode?.querySelector('#anatomy-quality-status');if(e)e.textContent=`${m.level} reference LOD · ${m.triangles.toLocaleString()} visible triangles · ${m.meshes} meshes · ${(m.decoded_geometry_bytes/1048576).toFixed(2)} MiB typed geometry (not peak GPU memory). N06 ${this.options.linkage?'SYNTHETIC / RESEARCH timing; not clinical':'INACTIVE'}.`;}
  cancelPaint(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  setLayer(layer,on){if(!(layer in this.layers))return;this.layers[layer]=Boolean(on);this.world?.layer(layer,Boolean(on));this.requestPaint();}
  camera(action){if(this.disposed||!this.world)return;this.world.camera(action);this.requestPaint();}
  fallback(reason){
    if(this.disposed||this.state==='fallback')return;
    ++this.generation;this.controller.abort();clearTimeout(this.loadTimer);this.loadTimer=null;this.cancelPaint();this.world?.dispose();this.world=null;
    this.state='fallback';this.mode='Text fallback';this.canvas.hidden=true;
    this.container.removeAttribute('data-reference-metrics');const q=this.container.parentNode?.querySelector('#anatomy-quality-status');if(q)q.textContent='3D unavailable. Text/source details remain available; reload creates a fresh renderer.';
    this.fallbackText=document.createElement('div');this.fallbackText.className='anatomy-fallback';
    this.fallbackText.textContent='3D reference anatomy unavailable. Intended layers: generic body envelope, skeleton, heart surfaces, left lung and right lung. Select “Data-linked schematic” for the existing illustrative body view. Current measurements, history and evidence remain available alongside this panel.';
    this.container.append(this.fallbackText);containerReady(this.container,'fallback');this.notify(reason+' Monitoring remains available.');this.options.onAsset?.('unavailable');
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;++this.generation;this.controller.abort();clearTimeout(this.loadTimer);this.loadTimer=null;this.cancelPaint();this.resize?.disconnect();this.visibility?.disconnect();
    for(const [target,event,fn]of this.listeners)target.removeEventListener(event,fn);this.listeners=[];
    this.world?.dispose();this.world=null;this.container.removeAttribute('data-reference-metrics');this.canvas.remove();this.status.remove();this.fallbackText?.remove();
  }
}
function containerReady(container,state){container.setAttribute('aria-busy','false');container.setAttribute('data-anatomy-state',state);}
