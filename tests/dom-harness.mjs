/* Selective HTML-tree/event harness, not a browser: no CSS/layout/WebGL/a11y acceptance. */
import { readFileSync } from 'node:fs';
import { transport } from './http-harness.mjs';

const decode = s => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, k) => ({ amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'" })[k]);
const encode = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const walk = node => node.childNodes.flatMap(c => [c, ...walk(c)]);
class Text {
  constructor(text, doc) { this.textContent=text;this.ownerDocument=doc;this.nodeType=3;this.nodeName='#text';this.childNodes=[]; }
  cloneNode() { return new Text(this.textContent,this.ownerDocument); }
  get outerHTML() { return encode(this.textContent); }
}
class Element {
  constructor(tag, doc) {
    this.tagName=tag.toUpperCase();this.nodeName=this.tagName;this.nodeType=1;this.ownerDocument=doc;
    this.childNodes=[];this.attributes=new Map();this.listeners=new Map();this.style={};this.writableLength=0;
    this.dataset=new Proxy({}, { get:(_,key)=>this.getAttribute('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))??undefined,
      set:(_,key,value)=>{this.setAttribute('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value);return true;} });
    this.classList={ add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/),...names])].filter(Boolean).join(' ');},
      remove:(...names)=>{this.className=this.className.split(/\s+/).filter(c=>!names.includes(c)).join(' ');},
      contains:name=>this.className.split(/\s+/).includes(name),toggle:(name,on)=>{on??=!this.classList.contains(name);on?this.classList.add(name):this.classList.remove(name);return on;} };
    if(tag==='template')this.content=new Element('fragment',doc);
  }
  get id(){return this.getAttribute('id')??'';} set id(value){this.setAttribute('id',value);}
  get className(){return this.getAttribute('class')??'';}set className(v){this.setAttribute('class',v);}
  get disabled(){return this.hasAttribute('disabled');}set disabled(v){v?this.setAttribute('disabled',''):this.removeAttribute('disabled');}
  get value(){if(this._value!==undefined)return this._value;if(this.tagName==='SELECT')return (this.querySelector('option[selected]')??this.querySelector('option'))?.value??'';if(this.tagName==='OPTION')return this.getAttribute('value')??this.textContent.trim().replace(/\s+/g,' ');return this.getAttribute('value')??'';}
  set value(v){this._value=String(v);}
  get max(){return this.getAttribute('max');}set max(v){this.setAttribute('max',v);}
  get textContent(){return this.childNodes.map(c=>c.textContent).join('');}
  set textContent(v){this.replaceChildren(new Text(String(v??''),this.ownerDocument));}
  get innerHTML(){return (this.content??this).childNodes.map(c=>c.outerHTML).join('');}
  set innerHTML(html){const root=this.content??this;root.replaceChildren();parse(String(html),root,this.ownerDocument);}
  get outerHTML(){if(this.tagName==='FRAGMENT')return this.innerHTML;return '<'+this.tagName.toLowerCase()+[...this.attributes].map(([k,v])=>' '+k+'="'+encode(v)+'"').join('')+'>'+this.innerHTML+'</'+this.tagName.toLowerCase()+'>';}
  get isConnected(){return this.ownerDocument.body.contains(this);}
  get offsetWidth(){return 900;}
  setAttribute(k,v){this.attributes.set(k,String(v));}getAttribute(k){return this.attributes.get(k)??null;}hasAttribute(k){return this.attributes.has(k);}removeAttribute(k){this.attributes.delete(k);}
  append(...nodes){for(const node of nodes){node.parentNode?.removeChild(node);node.parentNode=this;this.childNodes.push(node);}}
  removeChild(node){this.childNodes=this.childNodes.filter(c=>c!==node);node.parentNode=null;}
  replaceChildren(...nodes){for(const c of this.childNodes)c.parentNode=null;this.childNodes=[];this.append(...nodes);}
  replaceWith(...nodes){const p=this.parentNode;if(!p)return;const index=p.childNodes.indexOf(this);this.parentNode=null;for(const n of nodes)n.parentNode=p;p.childNodes.splice(index,1,...nodes);}
  remove(){this.parentNode?.removeChild(this);}
  contains(node){return node===this||this.childNodes.some(c=>c===node||c.contains?.(node));}
  cloneNode(deep=false){const n=new Element(this.tagName.toLowerCase(),this.ownerDocument);n.attributes=new Map(this.attributes);if(deep)n.append(...this.childNodes.map(c=>c.cloneNode(true)));return n;}
  isEqualNode(other){return this.outerHTML===other.outerHTML;}
  matches(selector){
    const negations=[...selector.matchAll(/:not\(([^)]+)\)/g)];if(negations.some(m=>this.matches(m[1])))return false;
    selector=selector.replace(/:not\([^)]+\)/g,'');
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0];if(tag&&tag.toUpperCase()!==this.tagName)return false;
    for(const id of selector.matchAll(/#([\w-]+)/g))if(this.id!==id[1])return false;
    for(const cls of selector.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(cls[1]))return false;
    for(const attr of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g))if(!this.hasAttribute(attr[1])||attr[2]!==undefined&&this.getAttribute(attr[1])!==attr[2])return false;
    return true;
  }
  querySelectorAll(selector){
    const selectors=selector.split(',').map(s=>s.trim().split(/\s+(?![^\[]*\])/));
    return walk(this).filter(node=>node.nodeType===1&&selectors.some(parts=>{
      if(!node.matches(parts.at(-1)))return false;let parent=node.parentNode;
      for(let i=parts.length-2;i>=0;i--){while(parent&&parent!==this&&!parent.matches(parts[i]))parent=parent.parentNode;if(!parent||parent===this&&!parent.matches(parts[i]))return false;parent=parent.parentNode;}return true;
    }));
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  closest(selector){for(let n=this;n&&n.nodeType===1;n=n.parentNode)if(selector.split(',').some(s=>n.matches(s.trim())))return n;return null;}
  addEventListener(name,fn){const list=this.listeners.get(name)??[];list.push(fn);this.listeners.set(name,list);}
  removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)??[]).filter(f=>f!==fn));}
  async emit(name,event={}){for(const fn of this.listeners.get(name)??[])await fn({target:this,preventDefault(){},...event});}
  focus(){if(!this.disabled)this.ownerDocument.activeElement=this;}
  getBoundingClientRect(){return {width:900,height:600,top:0,left:0};}
  getContext(){return null;}setPointerCapture(){}
  requestSubmit(){return this.ownerDocument.emit('submit',{target:this});}
}
function parse(html,root,doc){
  const stack=[root];const voids=new Set(['INPUT','IMG','BR','META','LINK','HR']);
  for(const match of html.matchAll(/<!--[\s\S]*?-->|<\/[\w:-]+\s*>|<[\w:-]+(?:"[^"]*"|'[^']*'|[^'">])*\/?\s*>|[^<]+/g)){
    const token=match[0];if(token.startsWith('<!--'))continue;
    if(token.startsWith('</')){const name=token.slice(2,-1).trim().toUpperCase();const i=stack.findLastIndex(n=>n.tagName===name);if(i>0)stack.length=i;continue;}
    if(!token.startsWith('<')){stack.at(-1).append(new Text(decode(token),doc));continue;}
    const name=token.match(/^<([\w:-]+)/)[1],node=doc.createElement(name);
    const attributes=token.slice(name.length+1).replace(/\/?\s*>$/,'');
    for(const attr of attributes.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(attr[1],decode(attr[2]??attr[3]??attr[4]??''));
    stack.at(-1).append(node);if(!voids.has(node.tagName)&&!token.endsWith('/>'))stack.push(node);
  }
}
export function makeDocument(){
  const doc={hidden:false,listeners:new Map(),createElement(tag){return new Element(tag,this);},addEventListener:Element.prototype.addEventListener,removeEventListener:Element.prototype.removeEventListener,emit:Element.prototype.emit};
  doc.body=new Element('body',doc);doc.body.innerHTML=readFileSync(new URL('../apps/mission-control-web/index.html',import.meta.url),'utf8').match(/<body>([\s\S]*?)<\/body>/)[1];doc.activeElement=doc.body;
  doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.getElementById=id=>doc.querySelector('#'+id);
  return doc;
}
let serial=0;
export async function frontendSession(app,role='demo_admin'){
  const call=transport(app);const login=await call('/v1/auth/demo',{body:{role}});let cookie=login.headers['Set-Cookie'].split(';')[0];
  const document=makeDocument(),sources=[],intervals=[],timers=new Map(),storage=new Map(),saved=new Map();let timerId=0;let now=Date.now();let intercept=null;
  const dateNow=Date.now;Date.now=()=>now;
  const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  const window={devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){},listeners:new Map(),addEventListener:Element.prototype.addEventListener,removeEventListener:Element.prototype.removeEventListener};
  set('document',document);set('window',window);set('ResizeObserver',class{observe(){}disconnect(){}});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});
  set('setTimeout',(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;});set('clearTimeout',id=>timers.delete(id));
  set('setInterval',fn=>{intervals.push(fn);return intervals.length;});set('clearInterval',()=>{});
  set('localStorage',{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)});
  set('FormData',class{constructor(form){this.form=form;}get(name){return this.form.querySelector('[name="'+name+'"]')?.value??null;}});
  set('EventSource',class{constructor(url){this.url=url;this.listeners=new Map();this.readyState=1;sources.push(this);}addEventListener(name,fn){this.listeners.set(name,fn);}close(){this.readyState=2;}emit(snapshot){this.listeners.get('snapshot')?.({data:JSON.stringify(snapshot)});}});
  const fetchAPI=async(path,options={})=>{
    const response=await call(path,{cookie,method:options.method??'GET',body:options.body,headers:options.headers});
    if(response.headers['Set-Cookie'])cookie=response.headers['Set-Cookie'].split(';')[0];
    return {ok:response.status>=200&&response.status<300,status:response.status,json:async()=>response.json()};
  };
  set('fetch',async(path,options={})=>intercept?intercept(path,options,fetchAPI):fetchAPI(path,options));
  let code=readFileSync(new URL('../apps/mission-control-web/app.mjs',import.meta.url),'utf8');
  code=code.replace(['from',"'./anatomy.mjs'"].join(' '),['from',"'"+new URL('../apps/mission-control-web/anatomy.mjs',import.meta.url).href+"'"].join(' '));
  for(const [from,to]of [['/shared/anatomy-link.mjs','../packages/anatomy-link.mjs'],['./anatomy-health.mjs','../apps/mission-control-web/anatomy-health.mjs'],['/shared/contracts.mjs','../packages/contracts.mjs'],['/shared/waveforms.mjs','../packages/waveforms.mjs'],['/shared/presentation.mjs','../packages/presentation.mjs'],['./ui.mjs','../apps/mission-control-web/ui.mjs'],['./fixture-trace.mjs','../apps/mission-control-web/fixture-trace.mjs'],['./n09.mjs','../apps/mission-control-web/n09.mjs'],['./n11.mjs','../apps/mission-control-web/n11.mjs'],['./n12.mjs','../apps/mission-control-web/n12.mjs'],['./n10.mjs','../apps/mission-control-web/n10.mjs'],['./waveforms.mjs','../apps/mission-control-web/waveforms.mjs'],['./self-health.mjs','../apps/mission-control-web/self-health.mjs'],['./scenes.mjs','../apps/mission-control-web/scenes.mjs']])code=code.replace("from '"+from+"'","from '"+new URL(to,import.meta.url).href+"'");
  code+='\nexport {consume,navigate,refreshLive,pollStatus,refreshState,probeCases,loadForecast,loadHistory};\nexport const inspect=()=>({identity,state,view,crewId,history,health,connected,scenes,caseStates,busy});\nexport const stop=()=>{clearInterval(heartbeat);source?.close();requests.invalidate();disposeScenes();};\n';
  const flush=async()=>{for(let i=0;i<25;i++)await new Promise(resolve=>setImmediate(resolve));};
  let module;
  try{module=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// fixture '+(++serial)).toString('base64'));await flush();}
  catch(error){for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];Date.now=dateNow;throw error;}
  return {document,module,storage,sources,timers,
    el:s=>document.querySelector(s),all:s=>document.querySelectorAll(s),flush,
    intercept:fn=>{intercept=fn;},
    async click(selector){const node=typeof selector==='string'?document.querySelector(selector):selector;if(!node)throw new Error('Missing actual HTML element: '+selector);if(node.disabled)return;await document.emit('click',{target:node});await flush();},
    async submit(selector){const node=document.querySelector(selector);if(!node)throw new Error('Missing form: '+selector);await document.emit('submit',{target:node});await flush();},
    async advance(ms){now+=ms;for(const fn of intervals)fn();for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}await flush();},
    async close(){module.stop();await flush();for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];Date.now=dateNow;}
  };
}
