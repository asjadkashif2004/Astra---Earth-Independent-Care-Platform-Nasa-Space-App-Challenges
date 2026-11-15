import{spawn}from'node:child_process';
import{mkdtempSync,rmSync,writeFileSync,readFileSync}from'node:fs';
import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{pathToFileURL}from'node:url';
const work=resolve('artifacts/documentation-20261111'),profile=mkdtempSync(join(tmpdir(),'astra-pdf-'));
let browser,session,n=0,buffer='';const pending=new Map();const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const id=++n,timer=setTimeout(()=>{pending.delete(id);reject(Error('timeout '+method));},45000);pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
try{
 browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--remote-debugging-pipe','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--no-pings','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 browser.stdio[3].on('error',()=>{});browser.stdio[4].on('data',c=>{buffer+=c;let i;while((i=buffer.indexOf('\0'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line)continue;const v=JSON.parse(line),p=pending.get(v.id);if(p){pending.delete(v.id);clearTimeout(p.timer);v.error?p.reject(Error(v.error.message)):p.resolve(v.result);}}});
 const version=await send('Browser.getVersion',{},null);const{targetId}=await send('Target.createTarget',{url:'about:blank'},null);({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1150,height:1300,deviceScaleFactor:1,mobile:false});
 const targets=JSON.parse(readFileSync(join(work,'representative-pages.json'),'utf8'));
 for(const target of targets){
  await send('Page.navigate',{url:'about:blank'});await delay(100);
  await send('Page.navigate',{url:pathToFileURL(join(work,target.temporary_pdf)).href});await delay(2000);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  const dest=target.temporary_pdf.replace('-validation-page-','-pdf-page-').replace('.pdf','.png');
  writeFileSync(join(work,dest),Buffer.from(shot.data,'base64'));console.log(dest);
 }
 writeFileSync(join(work,'visual-browser.json'),JSON.stringify({browser:version,rendered:targets,method:'Actual Chrome PDF viewer of exact-content single-page exports; original page text verified identical; originals unchanged',temporary_profile_removed_on_exit:true},null,2));
}finally{
 if(browser){await send('Browser.close',{},null).catch(()=>{});await delay(400);if(browser.exitCode===null)browser.kill();}
 for(const p of pending.values())clearTimeout(p.timer);rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
