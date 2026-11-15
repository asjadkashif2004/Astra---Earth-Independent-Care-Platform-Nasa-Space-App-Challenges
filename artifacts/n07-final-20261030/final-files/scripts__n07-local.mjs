// Offline-only local source CLI. It cannot acquire, ingest telemetry or run models.
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { localRegistry,loadLocalSource,trustedLocalCaller,PROJECT } from '../services/acquisition/local-source.mjs';
import { defaultAnnotation,appendAnnotation } from '../services/acquisition/evidence-card.mjs';
import { publishBundle,recoverBundle } from '../services/acquisition/local-bundle.mjs';
import { inventory } from '../services/acquisition/local-inventory.mjs';
export function options(args){
  if(!['inventory','build','verify'].includes(args[0])||args.length>2||args[1]&&(!/^--bundle=[a-f0-9]{64}$/.test(args[1])||args[0]!=='verify'))throw Error('Usage: n07-local.mjs inventory | build | verify --bundle=<hash>');
  if(args[0]==='verify'&&!args[1])throw Error('A committed bundle hash is required.');
  return {command:args[0],bundle:args[1]?.slice(9)};
}
export async function run(args){
  const o=options(args),token=trustedLocalCaller('researcher'),root=join(PROJECT,'artifacts/n07-final-20261030/accepted');
  if(o.command==='inventory')return inventory(token);
  if(o.command==='verify')return recoverBundle(join(root,'bundle-'+o.bundle),token);
  const contexts=[],histories={};
  for(const e of (await localRegistry()).sources){const c=await loadLocalSource(e.id,token);contexts.push(c);
    histories[c.id]=appendAnnotation(c,[],defaultAnnotation(c),{id:'source-structure',expected_revision:0,reason:'Exact structural source attribution only'},token);}
  return publishBundle(root,contexts,histories,token);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const timer=setTimeout(()=>{console.error(JSON.stringify({status:'FAILED',code:'N07_CLI_DEADLINE'}));process.exit(1);},180000);timer.unref();
  try{console.log(JSON.stringify(await run(process.argv.slice(2)),null,2));}
  catch(e){console.error(JSON.stringify({status:'FAILED',code:e.code??'INVALID_REQUEST',message:e.message}));process.exitCode=1;}
  finally{clearTimeout(timer);}
}
