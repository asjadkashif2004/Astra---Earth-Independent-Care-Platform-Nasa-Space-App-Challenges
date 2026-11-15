/* Explicitly invoked N04-P01 QA only. Sequential children avoid competing benchmarks. */
import { spawn } from 'node:child_process';
import { existsSync,mkdirSync,writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
if(process.platform!=='win32')throw Error('Invoke with the isolated portable Windows Node.');
const root=resolve(process.argv.find(s=>s.startsWith('--output='))?.slice(9)??'artifacts/n04-p01-20261018/final-headed');
if(existsSync(root))throw Error('Use a fresh evidence directory;never overwrite a previous batch.');mkdirSync(root,{recursive:true});
const report={scope:'N04-P01 full-screen headed24-trial collection;capture completion is not blanket acceptance',started_at:new Date().toISOString(),stages:[]};
stages:for(const rate of [1,30])for(const context of ['overview','crew']){
  const directory=join(root,rate+'x-'+context),args=[resolve('scripts/windows-browser-acceptance.mjs'),'--p01','--rate='+rate,'--context='+context,'--headed','--native-foreground','--fullscreen','--stop-file='+join(root,'STOP'),'--output='+directory];
  if(rate===1)args.push('--fixture-db='+resolve('artifacts/n04-p01-20261018/browser-before-rendered/fixture.sqlite'));
  else args.push('--prefill-step=30');
  console.log('Starting '+rate+'x '+context+';owned window must remain visible.');
  const child=spawn(process.execPath,args,{stdio:'inherit'}),status=await new Promise((accept,reject)=>{child.once('error',reject);child.once('exit',accept);});
  report.stages.push({rate,context,directory,status,command:[process.execPath,...args]});writeFileSync(join(root,'batch.json'),JSON.stringify(report,null,2)+'\n');
  if(status!==0){report.status='stopped after incomplete collection';process.exitCode=1;break stages;}
}
report.finished_at=new Date().toISOString();report.status??=report.stages.length===4?'collection completed;offline acceptance assessment required':'incomplete';writeFileSync(join(root,'batch.json'),JSON.stringify(report,null,2)+'\n');
