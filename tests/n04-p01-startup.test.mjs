/* Non-browser only: virtual time, DOM/CDP doubles and injected native snapshots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { waitForUserReady,createUserAssistedStartup,assertStartupNative,USER_READY_WAIT_MS } from '../scripts/n04-p01-startup.mjs';
import { GUARD_LIMITS } from '../scripts/n04-p01-trial-guard.mjs';

const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
class Clock {
  time=100000;next=0;jobs=new Map();now=()=>this.time;
  setTimeout=(fn,ms)=>{const id=++this.next;this.jobs.set(id,{fn,at:this.time+ms});return id;};
  clearTimeout=id=>this.jobs.delete(id);
  async advance(ms){const end=this.time+ms;for(;;){const due=[...this.jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;this.jobs.delete(due[0]);this.time=due[1].at;due[1].fn();await flush();}this.time=end;await flush();}
}
function pageFixture({bindingFails=false}={}){
  const clock=new Clock(),events=new EventEmitter(),elements=[],window={};let focused=true;
  const document={title:'ASTRA Command',readyState:'complete',visibilityState:'visible',hasFocus:()=>focused};
  document.createElement=tag=>{
    const listeners=new EventEmitter(),element={tag,style:{},attributes:new Map(),children:[],removed:false,open:false,
      setAttribute:(k,v)=>element.attributes.set(k,v),append:(...nodes)=>element.children.push(...nodes),
      addEventListener:(type,fn)=>listeners.on(type,fn),removeEventListener:(type,fn)=>listeners.off(type,fn),
      emit:(type,value={})=>listeners.emit(type,{preventDefault(){},...value}),
      showModal:()=>{element.open=true;},close:()=>{element.open=false;},remove:()=>{element.removed=true;},focus:()=>{document.activeElement=element;}};
    elements.push(element);return element;
  };
  document.body={append:()=>{}};
  const sandbox={window,document,Date:{now:clock.now}};
  const c={evaluate:async text=>runInNewContext(text,sandbox),
    send:async(method,{name}={})=>{
      if(method==='Runtime.addBinding'){if(bindingFails)throw Error('binding unsupported');window[name]=payload=>events.emit('Runtime.bindingCalled',{name,payload});}
      else if(method==='Runtime.removeBinding')delete window[name];
    },on:(type,fn)=>{events.on(type,fn);return()=>events.off(type,fn);}};
  const ready=()=>elements.find(e=>e.attributes.has('data-astra-qa-ready'));
  const cancel=()=>elements.find(e=>e.attributes.has('data-astra-qa-cancel'));
  const wait=()=>waitForUserReady({c,pid:123,marker:'ASTRA QA one',token:'one',clock,now:clock.now,output:()=>{}});
  const clean=()=>{assert.equal(clock.jobs.size,0);assert.equal(events.eventNames().length,0);assert.equal(window.__astraP01StartupReady,undefined);assert.equal(window.__astraP01StartupReadyEvent,undefined);assert.ok(elements.filter(e=>e.tag==='dialog').every(e=>e.removed));};
  return {c,clock,events,window,document,elements,ready,cancel,wait,clean,setFocused:value=>{focused=value;}};
}
function native(pid,marker,patch={}){return {source_at_ms:100000,pid,selected_handle:'0xABC',selected_owner_pid:pid,selected_class:'Chrome_WidgetWin_1',selected_title:'ASTRA Command — '+marker+' - Google Chrome',title_matches:true,selected_visible:true,selected_minimized:false,foreground_handle:'0xABC',foreground_pid:pid,owned:true,...patch};}
function startupFixture({nativePatch={},focusPatch={},waitError=null,recordError=false}={}){
  const page=pageFixture(),sequence=[],records=[];let assistance=0,activations=0,inspections=0;
  const startup=createUserAssistedStartup({c:page.c,pid:123,clock:page.clock,now:page.clock.now,token:'one',output:()=>{},
    waitReady:async()=>{assistance++;sequence.push('ready');if(waitError)throw Error(waitError);return {type:'ready',trusted:true};},
    inspectNative:async(pid,marker)=>{inspections++;sequence.push('native');return native(pid,marker,typeof nativePatch==='function'?nativePatch(inspections):nativePatch);},
    activate:async()=>{activations++;sequence.push('activate');return {status:0,stdout:JSON.stringify({pid:123,foreground_request_returned:true,foreground_is_test_window:true,...focusPatch}),stderr:''};},
    record:entry=>{records.push(structuredClone(entry));if(recordError)throw Error('unwritable startup evidence');}});
  const layout=async()=>{sequence.push('layout');};
  return {...page,startup,sequence,records,layout,get assistance(){return assistance;},get activations(){return activations;},get inspections(){return inspections;}};
}

test('Preparation waits for explicit trusted READY; elapsed time and synthetic clicks cannot confirm',async()=>{
  const f=pageFixture(),pending=f.wait();let resolved=false;pending.then(()=>{resolved=true;});await flush();
  f.ready().emit('click',{isTrusted:false});await f.clock.advance(1000);assert.equal(resolved,false);
  f.ready().emit('click',{isTrusted:true});const confirmation=await pending;
  assert.equal(confirmation.trusted,true);assert.equal(confirmation.token,'one');assert.equal(confirmation.received_host_ms,101000);
  f.clean();
});

test('Explicit operator preparation deadline aborts without inferring READY',async()=>{
  const f=pageFixture(),rejected=assert.rejects(f.wait(),/not confirmed within60s/);await flush();await f.clock.advance(USER_READY_WAIT_MS);await rejected;f.clean();
  assert.deepEqual(GUARD_LIMITS,{poll_ms:250,stale_ms:1000,startup_ms:8000,max_active_ms:75000});
});

test('Operator Cancel and dialog Escape safely reject readiness',async()=>{
  for(const escape of [false,true]){
    const f=pageFixture(),rejected=assert.rejects(f.wait(),/cancelled/);await flush();
    if(escape)f.elements.find(e=>e.tag==='dialog').emit('cancel',{isTrusted:true});else f.cancel().emit('click',{isTrusted:true});
    await rejected;f.clean();
  }
});

test('READY from hidden or unfocused page cannot continue',async()=>{
  for(const hidden of [false,true]){
    const f=pageFixture(),rejected=assert.rejects(f.wait(),/must (have focus|be visible)/);await flush();
    if(hidden)f.document.visibilityState='hidden';else f.setFocused(false);
    f.ready().emit('click',{isTrusted:true});await rejected;f.clean();
  }
});

test('A stale token is ignored while malformed, untrusted or stale matching confirmations fail closed',async()=>{
  const old=pageFixture(),pending=old.wait();await flush();old.events.emit('Runtime.bindingCalled',{name:'__astraP01StartupReadyEvent',payload:JSON.stringify({token:'old'})});
  old.ready().emit('click',{isTrusted:true});await pending;old.clean();
  for(const payload of ['{bad',JSON.stringify({token:'one',marker:'ASTRA QA one',type:'ready',trusted:false}),JSON.stringify({token:'one',marker:'ASTRA QA one',type:'ready',trusted:true,source_at_ms:98000})]){
    const f=pageFixture(),rejected=assert.rejects(f.wait(),/confirmation invalid/);await flush();
    f.events.emit('Runtime.bindingCalled',{name:'__astraP01StartupReadyEvent',payload});await rejected;f.clean();
  }
});

test('Page closure, context loss or navigation cancels preparation',async()=>{
  for(const [name,params]of [['Inspector.detached',{}],['Runtime.executionContextsCleared',{}],['Page.frameNavigated',{frame:{url:'about:blank'}}]]){
    const f=pageFixture(),rejected=assert.rejects(f.wait(),/detached|context cleared|navigated/);await flush();f.events.emit(name,params);await rejected;f.clean();
  }
});

test('Unsupported interactive binding aborts rather than falling back to automatic continuation',async()=>{
  const f=pageFixture({bindingFails:true});await assert.rejects(f.wait(),/binding unsupported/);f.clean();
});

test('First startup requires READY, verifies native identity, activates once and rechecks after layout',async()=>{
  const f=startupFixture(),entry=await f.startup.run('first',f.layout);
  assert.deepEqual(f.sequence,['ready','native','activate','layout','native']);
  assert.equal(entry.status,'passed');assert.equal(entry.assistance_requested,true);assert.equal(f.activations,1);assert.equal(f.inspections,2);assert.equal(f.records.length,1);
});

test('Owned-page READY binding integrates with startup without stdin or automatic confirmation',async()=>{
  const f=pageFixture(),records=[];let activations=0,layouts=0;
  const startup=createUserAssistedStartup({c:f.c,pid:123,clock:f.clock,now:f.clock.now,token:'one',output:()=>{},
    inspectNative:async(pid,marker)=>native(pid,marker),
    activate:async()=>{activations++;return {status:0,stdout:JSON.stringify({pid:123,foreground_request_returned:true,foreground_is_test_window:true}),stderr:''};},
    record:entry=>records.push(structuredClone(entry))});
  const pending=startup.run('one',async()=>{layouts++;});await flush();
  assert.equal(activations,0);assert.ok(f.document.title.includes('ASTRA QA one'));
  f.ready().emit('click',{isTrusted:true});await pending;
  assert.equal(activations,1);assert.equal(layouts,1);assert.equal(records[0].confirmation.trusted,true);assert.equal(records[0].status,'passed');f.clean();
});

test('One process may reuse explicit assistance but every subsequent trial rechecks and activates once',async()=>{
  const f=startupFixture();await f.startup.run('first',f.layout);await f.startup.run('second',f.layout);
  assert.equal(f.assistance,1);assert.equal(f.activations,2);assert.equal(f.inspections,4);assert.equal(f.records[1].assistance_requested,false);
  assert.deepEqual(f.sequence.slice(5),['native','activate','layout','native']);
});

test('A new owned-process session cannot inherit an earlier readiness confirmation',async()=>{
  const first=startupFixture(),next=startupFixture();await first.startup.run('one',first.layout);await next.startup.run('two',next.layout);
  assert.equal(first.assistance,1);assert.equal(next.assistance,1);
});

test('Readiness failure stops before any native activation, layout or warm-up',async()=>{
  const f=startupFixture({waitError:'no explicit readiness'});let warmup=0;
  await assert.rejects((async()=>{await f.startup.run('one',f.layout);warmup++;})(),/no explicit readiness/);
  assert.equal(f.activations,0);assert.equal(f.inspections,0);assert.equal(warmup,0);assert.equal(f.records[0].stage,'awaiting_explicit_ready');
  await assert.rejects(f.startup.run('one',f.layout),/already failed/);assert.equal(f.assistance,1);
});

test('Wrong PID, HWND, marker, class or foreground ownership prevents helper invocation',async()=>{
  for(const patch of [{pid:999},{selected_owner_pid:999},{selected_handle:'0x0'},{selected_title:'Other page'},{selected_class:'OtherWindow'},{owned:false},{foreground_pid:999},{foreground_handle:'0xOTHER'},{selected_visible:false},{selected_minimized:true}]){
    const f=startupFixture({nativePatch:patch});await assert.rejects(f.startup.run('one',f.layout));assert.equal(f.activations,0);assert.equal(f.records[0].stage,'native_before');
  }
});

test('Unready, hidden, unfocused or incorrectly marked page fails before activation',async()=>{
  for(const patch of [{readyState:'interactive'},{visibilityState:'hidden'}]){
    const f=startupFixture();Object.assign(f.document,patch);await assert.rejects(f.startup.run('one',f.layout));assert.equal(f.activations,0);
  }
  const f=startupFixture();f.setFocused(false);await assert.rejects(f.startup.run('one',f.layout),/not focused/);assert.equal(f.activations,0);
  const wrong=startupFixture(),evaluate=wrong.c.evaluate;
  wrong.c.evaluate=async expression=>{const result=await evaluate(expression);return result?.ready_state?{...result,title:'Unmarked page'}:result;};
  await assert.rejects(wrong.startup.run('one',wrong.layout),/page marker mismatch/);assert.equal(wrong.activations,0);
});

test('Existing foreground-helper rejection stops without re-prompt, retry or next trial',async()=>{
  for(const patch of [{foreground_request_returned:false},{foreground_is_test_window:false},{pid:999}]){
    const f=startupFixture({focusPatch:patch});await assert.rejects(f.startup.run('one',f.layout));assert.equal(f.activations,1);assert.equal(f.records[0].stage,'activation');
    await assert.rejects(f.startup.run('two',f.layout),/already failed/);assert.equal(f.activations,1);assert.equal(f.assistance,1);
  }
});

test('Post-layout window identity or page-focus loss stops startup',async()=>{
  const f=startupFixture({nativePatch:count=>count===2?{selected_handle:'0xDEF',foreground_handle:'0xDEF'}:{}});
  await assert.rejects(f.startup.run('one',f.layout),/HWND changed/);assert.equal(f.activations,1);assert.equal(f.records[0].stage,'native_after');
  const page=startupFixture();await assert.rejects(page.startup.run('one',async()=>page.setFocused(false)),/not focused/);assert.equal(page.activations,1);
});

test('A later trial failure stops the session instead of assuming the first checkpoint still guarantees focus',async()=>{
  const f=startupFixture();await f.startup.run('one',f.layout);f.setFocused(false);
  await assert.rejects(f.startup.run('two',f.layout),/not focused/);await assert.rejects(f.startup.run('three',f.layout),/already failed/);
  assert.equal(f.assistance,1);assert.equal(f.activations,1);assert.equal(f.records[1].status,'failed');
});

test('Startup evidence failure cannot permit measurement or another startup',async()=>{
  const f=startupFixture({recordError:true});await assert.rejects(f.startup.run('one',f.layout),/could not be persisted/);
  await assert.rejects(f.startup.run('two',f.layout),/already failed/);assert.equal(f.activations,1);
});

test('Concurrent startups are rejected without parallel activation',async()=>{
  const f=startupFixture(),first=f.startup.run('one',f.layout);await assert.rejects(f.startup.run('two',f.layout),/Concurrent startup/);await first;assert.equal(f.activations,1);
});

test('Native inspection validation requires the previously verified HWND',()=>{
  assert.throws(()=>assertStartupNative(native(123,'mark'),{pid:123,marker:'mark',handle:'0xDEF'}),/HWND changed/);
});
