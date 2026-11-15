import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '../apps/mission-control-web/scenes.mjs';
import { makeDocument } from './dom-harness.mjs';

function graphics(options, fn) {
  const saved=new Map();const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  const document=makeDocument(),frames=new Map(),calls=[];let serial=0,disconnected=0;
  const context=new Proxy({}, {get:(target,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):target[key]??((...args)=>calls.push([key,...args])),set:(t,k,v)=>{t[k]=v;return true;}});
  const gl=new Proxy({}, {get:(_,key)=>{
    if(key==='getShaderParameter')return ()=>!options.shaderError;
    if(key==='getProgramParameter')return ()=>true;
    if(key==='getUniformLocation')return (_,name)=>name;
    if(key==='getExtension')return ()=>({loseContext(){calls.push(['loseContext']);}});
    return (...args)=>{calls.push([key,...args]);if(key==='drawArrays'&&options.drawError)throw new Error('draw fault');return {};};
  }});
  const create=document.createElement.bind(document);
  document.createElement=tag=>{const node=create(tag);node.getContext=name=>name==='webgl2'?(options.webgl?gl:null):options.canvas2d===false?null:context;node.cloneNode=()=>document.createElement(tag);return node;};
  set('document',document);set('window',{devicePixelRatio:2,addEventListener(){},removeEventListener(){}});
  set('ResizeObserver',class{observe(){}disconnect(){disconnected++;}});
  set('requestAnimationFrame',fn=>{const id=++serial;frames.set(id,fn);return id;});set('cancelAnimationFrame',id=>frames.delete(id));
  const container=document.createElement('div');document.body.append(container);
  let frameTime=performance.now();const step=()=>{frameTime+=100;const entries=[...frames];frames.clear();for(const [,frame]of entries)frame(frameTime);};
  try{fn({container,document,frames,calls,step,get disconnected(){return disconnected;}});}
  finally{for(const [key,value]of saved)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];}
}
test('N03: unsupported WebGL keeps an interactive 2D scene and releases observers/listeners/frames',()=>{
  graphics({},g=>{const scene=new Scene(g.container,'earth');assert.equal(scene.mode,'2D fallback');g.step();assert.ok(g.calls.some(c=>c[0]==='arc'));
    scene.dispose();assert.equal(g.frames.size,0);assert.equal(g.disconnected,1);assert.equal(scene.listeners.length,0);assert.equal(g.container.childNodes.length,0);});
});
test('N03: absent canvas rendering uses a truthful text fallback without stopping document controls',()=>{
  graphics({canvas2d:false},g=>{const scene=new Scene(g.container,'twin');assert.equal(scene.mode,'Text fallback');assert.match(g.container.textContent,/telemetry and evidence/);assert.equal(g.frames.size,0);scene.dispose();});
});
test('N03: shader initialization failure safely falls back and releases partial GPU resources',()=>{
  graphics({webgl:true,shaderError:true},g=>{const scene=new Scene(g.container,'earth');assert.equal(scene.mode,'2D fallback');assert.ok(g.calls.some(c=>c[0]==='deleteShader'));assert.ok(g.calls.some(c=>c[0]==='deleteProgram'));scene.dispose();});
});
test('N03 F13: context loss switches the existing scene to 2D; essential monitoring DOM remains mounted',()=>{
  graphics({webgl:true},g=>{const panel=g.document.createElement('button');panel.textContent='Review measured evidence';g.document.body.append(panel);panel.focus();
    const scene=new Scene(g.container,'twin');const canvas=scene.canvas;
    void canvas.emit('webglcontextlost',{preventDefault(){}});assert.equal(scene.mode,'2D fallback');assert.equal(scene.disposed,false);
    assert.notEqual(scene.canvas,canvas);scene.update({quality:'missing',heartRate:null,breathingRate:null});g.step();
    assert.equal(g.document.activeElement,panel);assert.equal(panel.textContent,'Review measured evidence');scene.dispose();});
});
test('N03: draw failure cannot escape into monitoring; reduced motion renders only on requested updates',()=>{
  graphics({webgl:true,drawError:true},g=>{const scene=new Scene(g.container,'twin',{reducedMotion:true});scene.update({quality:'good',heartRate:70,breathingRate:14});assert.doesNotThrow(g.step);assert.equal(scene.mode,'2D fallback');g.step();assert.equal(g.frames.size,0);
    scene.update({quality:'missing',heartRate:null});assert.equal(g.frames.size,1);g.step();assert.equal(g.frames.size,0);scene.dispose();});
});
test('N03: 2D rendering failure stops safely in text mode instead of repeatedly throwing',()=>{
  graphics({},g=>{const scene=new Scene(g.container,'earth');scene.ctx=new Proxy({}, {get(){return ()=>{throw new Error('2D fault');};}});g.step();assert.equal(scene.mode,'Text fallback');assert.equal(g.frames.size,0);assert.match(g.container.textContent,/Graphical scene unavailable/);scene.dispose();});
});
test('N04: quality-reduced Earth retains one continuous loop while reduced motion is independently event-driven',()=>{
  graphics({webgl:true},g=>{
    const scene=new Scene(g.container,'earth',{performance:true,reducedMotion:false});g.step();assert.equal(g.frames.size,1);
    assert.ok(g.calls.some(c=>c[0]==='uniform1f'&&c[1]==='quality'&&c[2]===1));
    scene.options.reducedMotion=true;g.step();assert.equal(g.frames.size,0);
    scene.update({blackout:true,linkAvailable:true});g.step();assert.equal(g.frames.size,0);
    assert.ok(g.calls.some(c=>c[0]==='uniform1f'&&c[1]==='blackout'&&c[2]===1));scene.dispose();
  });
});
test('N04: local texture completion, failed imagery and late callbacks cannot escape scene ownership',()=>{
  graphics({webgl:true},g=>{
    const images=[],states=[];const scene=new Scene(g.container,'earth',{imageFactory:()=>{const image={};images.push(image);return image;},onAsset:s=>states.push(s)});
    assert.equal(images.length,2);assert.match(images[0].src,/\/assets\/earth\/day-2048\.jpg$/);
    images[0].onload();images[1].onload();assert.equal(scene.assetState,'ready');
    const old=images[0].onload;scene.options.performance=true;scene.size();assert.equal(images.length,4);
    assert.match(images[2].src,/day-1024\.jpg$/);const before=g.calls.filter(c=>c[0]==='texImage2D').length;old();assert.equal(g.calls.filter(c=>c[0]==='texImage2D').length,before);
    images[3].onerror();assert.equal(scene.assetState,'unavailable');assert.equal(scene.mode,'WebGL2');
    const late=images[2].onload;scene.dispose();late();assert.equal(g.calls.filter(c=>c[0]==='texImage2D').length,before);
    assert.equal(g.frames.size,0);assert.equal(images[2].onload,null);assert.ok(states.includes('ready'));assert.equal(g.calls.filter(c=>c[0]==='deleteTexture').length,2);
  });
});
test('N04: Earth camera has bounded zoom/reset and no animation loop is created by repeated control requests',()=>{
  graphics({},g=>{const scene=new Scene(g.container,'earth',{reducedMotion:true});for(let i=0;i<30;i++)scene.camera('in');assert.equal(scene.zoom,1.35);for(let i=0;i<30;i++)scene.camera('out');assert.equal(scene.zoom,.65);scene.camera('reset');assert.equal(scene.zoom,1);assert.equal(scene.rotation,-.4);assert.equal(g.frames.size,1);g.step();assert.equal(g.frames.size,0);scene.dispose();});
});
test('N04: offscreen scenes do no drawing but resume current state without creating duplicate loops',()=>{
  graphics({webgl:true},g=>{const scene=new Scene(g.container,'earth');g.step();const before=g.calls.filter(c=>c[0]==='drawArrays').length;scene.visible=false;g.step();scene.update({blackout:true});assert.equal(g.frames.size,0);assert.equal(g.calls.filter(c=>c[0]==='drawArrays').length,before);scene.visible=true;scene.requestPaint();scene.requestPaint();assert.equal(g.frames.size,1);g.step();assert.equal(g.calls.filter(c=>c[0]==='drawArrays').length,before+1);scene.dispose();});
});
test('N04: Earth zoom remains functional in the actual Canvas2D fallback path',()=>{
  graphics({},g=>{const scene=new Scene(g.container,'earth',{reducedMotion:true});g.step();const radius=g.calls.find(c=>c[0]==='arc')[3];scene.camera('in');g.step();assert.ok(g.calls.filter(c=>c[0]==='arc').at(-1)[3]>radius);scene.dispose();});
});
