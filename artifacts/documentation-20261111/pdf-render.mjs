import{spawn}from'node:child_process';
import{mkdtempSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{pathToFileURL}from'node:url';
const work=resolve('artifacts/documentation-20261111'),profile=mkdtempSync(join(tmpdir(),'astra-pdf-'));
let browser,session,n=0,buffer='';const pending=new Map();const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const id=++n,timer=setTimeout(()=>{pending.delete(id);reject(Error('timeout '+method));},45000);pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
try{
 browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--remote-debugging-pipe','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--no-pings','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 browser.stdio[3].on('error',()=>{});browser.stdio[4].on('data',c=>{buffer+=c;let i;while((i=buffer.indexOf('\0'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line)continue;const v=JSON.parse(line),p=pending.get(v.id);if(p){pending.delete(v.id);clearTimeout(p.timer);v.error?p.reject(Error(v.error.message)):p.resolve(v.result);}}});
 const version=await send('Browser.getVersion',{},null);const{targetId}=await send('Target.createTarget',{url:'about:blank'},null);({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));await send('Page.enable');await send('Runtime.enable');
 const tasks=[['user-guide.html','../../ASTRA - Complete User Guide.pdf'],['technical-report.html','../../ASTRA - Technical Architecture and Project Report.pdf']],reports=[];
 for(const[html,pdf]of tasks){
  await send('Page.navigate',{url:pathToFileURL(join(work,html)).href});await delay(1000);await evaluate('document.fonts.ready');await send('Emulation.setEmulatedMedia',{media:'print'});
  const layout=await evaluate(`({title:document.title,pages:[...document.querySelectorAll('.page')].map(p=>({page:p.dataset.page,height:p.clientHeight,scroll:p.scrollHeight,width:p.clientWidth,scrollWidth:p.scrollWidth,contentBottom:p.querySelector('.content').getBoundingClientRect().bottom-p.getBoundingClientRect().top,footerTop:p.querySelector('footer').getBoundingClientRect().top-p.getBoundingClientRect().top,overflow:[...p.querySelectorAll('.content>*')].filter(e=>e.getBoundingClientRect().bottom>p.querySelector('footer').getBoundingClientRect().top-5).map(e=>e.tagName+':'+e.textContent.slice(0,70))})),images:[...document.images].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0}))})`);
  const bad=layout.pages.filter(p=>p.scroll>p.height+2||p.scrollWidth>p.width+2||p.overflow.length);
  reports.push({html,pdf,layout,bad});
  if(bad.length||layout.images.some(i=>!i.ok)){console.log(JSON.stringify({html,status:'LAYOUT_FAIL',bad}));continue;}
  if(!process.argv.includes('--layout-only')){const r=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,generateTaggedPDF:true,generateDocumentOutline:true,paperWidth:8.2677165,paperHeight:11.6929134,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0});writeFileSync(join(work,pdf),Buffer.from(r.data,'base64'));}
  console.log(JSON.stringify({html,status:'PASS',pages:layout.pages.length}));
 }
 writeFileSync(join(work,'print-report.json'),JSON.stringify({browser:version,reports},null,2));
 if(process.argv.includes('--screenshots')){
  await send('Emulation.setEmulatedMedia',{media:''});await send('Emulation.setDeviceMetricsOverride',{width:1150,height:1300,deviceScaleFactor:1,mobile:false});
  for(const[html,pdf]of tasks){if(reports.find(r=>r.html===html).bad.length)continue;const slug=html.split('.')[0],pages=slug==='user-guide'?[1,2,4,6,7,11,12]:[1,3,5,10,17,21,25,27,30];
   for(const page of pages){await send('Page.navigate',{url:pathToFileURL(join(work,pdf)).href+'#page='+page+'&zoom=100'});await delay(1800);const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(work,slug+'-pdf-page-'+page+'.png'),Buffer.from(shot.data,'base64'));}
  }
 }
 if(reports.some(r=>r.bad.length))process.exitCode=1;
}finally{
 if(browser){await send('Browser.close',{},null).catch(()=>{});await delay(400);if(browser.exitCode===null)browser.kill();}
 for(const p of pending.values())clearTimeout(p.timer);rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
