/* One-time, offline asset build. Uses an existing Chromium decoder, never installs tools. */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const executable=process.env.ASTRA_BROWSER_BIN;
if(!executable||process.argv.length!==4)throw new Error('ASTRA_BROWSER_BIN=<existing Chromium> node scripts/prepare-earth-assets.mjs <NASA day JPEG> <NASA cloud JPEG>');
const output=resolve('apps/mission-control-web/assets/earth');
const profile=mkdtempSync(join(tmpdir(),'astra-n04-assets-'));
const browser=spawn(executable,['--headless','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
let sequence=0,buffer='',session;const pending=new Map();
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},30000);
  pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
});}
browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}});
browser.on('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();});
browser.on('exit',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Asset browser exited'));}pending.clear();});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
  await send('Browser.getVersion',{},null);
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
  ({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));
  mkdirSync(output,{recursive:true});
  const assets=[];
  for(const [kind,path]of [['day',process.argv[2]],['cloud',process.argv[3]]]){
    const raw=readFileSync(path);if(raw[0]!==255||raw[1]!==216)throw new Error('Expected NASA JPEG source');
    for(const width of [2048,1024]){
      const expression=`(async()=>{const image=new Image();image.src=${JSON.stringify('data:image/jpeg;base64,'+raw.toString('base64'))};await image.decode();const canvas=document.createElement('canvas');canvas.width=${width};canvas.height=${width/2};const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);return{source_width:image.naturalWidth,source_height:image.naturalHeight,data:canvas.toDataURL('image/jpeg',.88).split(',')[1]}})()`;
      const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);
      const result=r.result.value,bytes=Buffer.from(result.data,'base64'),file=`${kind}-${width}.jpg`;
      writeFileSync(join(output,file),bytes);
      assets.push({file,width,height:width/2,bytes:bytes.length,sha256:digest(bytes),source_sha256:digest(raw),source_dimensions:[result.source_width,result.source_height],transform:'Chromium Canvas2D high-quality resize; JPEG quality0.88; no geography or cloud painting',source_url:kind==='day'?'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/august/world.200408.3x5400x2700.jpg':'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg',source_page:kind==='day'?'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/':'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/',creator:'Reto Stöckli / NASA Earth Observatory, NASA Goddard Space Flight Center',historical:kind==='day'?'August2004 surface composite':'Blue Marble2002 cloud composite; not current weather'});
    }
  }
  const manifest={version:'n04-earth-1',acquired_at:new Date().toISOString(),credit:'NASA Earth Observatory / NASA Goddard Space Flight Center; Reto Stöckli; Blue Marble compositing enhancements by Robert Simmon',usage:'NASA educational/informational media reuse guidelines; no endorsement. Source pages identify NASA imagery, no third-party copyright notice for selected textures. Retain credit.',usage_url:'https://www.nasa.gov/nasa-brand-center/images-and-media/',scope:'Historical visual assets only; not real-time weather, medical data or actual mission tracking',transfer_budget_bytes:4000000,total_bytes:assets.reduce((n,a)=>n+a.bytes,0),assets};
  if(manifest.total_bytes>manifest.transfer_budget_bytes)throw new Error('Earth allocation exceeded');
  writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({assets:assets.map(({file,bytes})=>({file,bytes})),total_bytes:manifest.total_bytes}));
}finally{await send('Browser.close',{},null).catch(()=>{});await new Promise(resolve=>{if(browser.exitCode!==null)resolve();else browser.once('exit',resolve);});rmSync(profile,{recursive:true,force:true});}
