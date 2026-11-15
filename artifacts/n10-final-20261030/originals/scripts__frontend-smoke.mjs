/* Lightweight DOM semantic smoke. No browser, CSS/layout, SW or FPS claim. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../services/api/server.mjs';
import { transport } from '../tests/http-harness.mjs';

const app = createApp({ autoTick:false }); const call = transport(app);
const role = process.argv[2] ?? 'demo_admin';
const session = await call('/v1/auth/demo',{body:{role}});
const cookie = session.headers['Set-Cookie'].split(';')[0];
const elements = new Map(), listeners = new Map();
class Element {
  constructor(id='') { this.id=id;this.innerHTML='';this.textContent='';this.value='';this.dataset={};this.disabled=false;this.classList={add(){},remove(){},toggle(){}}; }
  setAttribute(){} removeAttribute(){} append(){} remove(){} replaceWith(){} addEventListener(){} removeEventListener(){} setPointerCapture(){}
  focus(){} hasAttribute(){return false;}
  getBoundingClientRect(){return {width:900,height:650,top:0,left:0};}
  getContext(){return null;} cloneNode(){return new Element();}
  querySelector(selector){return get(selector);}
}
function get(selector){if(!elements.has(selector))elements.set(selector,new Element(selector));return elements.get(selector);}
globalThis.document={body:new Element(),hidden:false,querySelector:get,querySelectorAll(){return [];},getElementById:id=>get(`#${id}`),createElement:()=>new Element(),addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}};
globalThis.window={devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){},addEventListener(){},removeEventListener(){}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
globalThis.EventSource=class{addEventListener(){}close(){}};
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
const realTimeout=globalThis.setTimeout;
globalThis.setTimeout=(...args)=>{const timer=realTimeout(...args);timer.unref();return timer;};
globalThis.setInterval=()=>0;
globalThis.fetch=async(path,options={})=>{
  const response=await call(path,{cookie,method:options.method??'GET',body:options.body,headers:options.headers});
  return {ok:response.status>=200&&response.status<300,status:response.status,json:async()=>response.json()};
};
const entry=new URL('../apps/mission-control-web/app.mjs',import.meta.url);
let code=readFileSync(entry,'utf8');
for(const [from,to] of [['/shared/contracts.mjs',new URL('../packages/contracts.mjs',import.meta.url)],['/shared/presentation.mjs',new URL('../packages/presentation.mjs',import.meta.url)],['./ui.mjs',new URL('./ui.mjs',entry)],['./scenes.mjs',new URL('./scenes.mjs',entry)],['./anatomy.mjs',new URL('./anatomy.mjs',entry)],['./fixture-trace.mjs',new URL('./fixture-trace.mjs',entry)]])code=code.replace(`from '${from}'`,`from '${to.href}'`);
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));};
try{
  await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  await flush();assert.match(get('#app').innerHTML,/app-shell/);
  assert.match(get('#crew-grid').innerHTML,/Amara Okafor/);
  for(const page of ['crew','agent','knowledge','comms','scenario','sources','cognitive','replay']){
    const button=new Element();button.dataset.page=page;
    await listeners.get('click')({target:{closest:()=>button}});await flush();
    assert.equal(get('#toast').textContent,'',`Unexpected runtime error on ${page}: ${get('#toast').textContent}`);
    assert.ok(get('#main').innerHTML.length>1000,`${page} generated a complete DOM template`);
  }
  console.log(`Semantic UI smoke passed for ${role}: overview + eight workspace routes, API-backed data and nominal twin. DOM is stubbed; this is not browser/layout verification.`);
}finally{await app.close();}
