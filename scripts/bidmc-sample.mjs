import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCache } from '../services/acquisition/cache.mjs';
import { stableJSON } from '../services/acquisition/source.mjs';
import { buildBIDMCCard,buildBIDMCSplit,validateBIDMCCard,validateBIDMCSplit,validateBIDMCNotice } from '../services/acquisition/bidmc.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function main(){
  const [mode,...args]=process.argv.slice(2);if(!['prepare','verify'].includes(mode)||args.length)throw Error('Usage: node scripts/bidmc-sample.mjs prepare|verify');
  const approval=JSON.parse(await readFile(resolve(root,'data/scientific/bidmc-01-numerics.approval.json'),'utf8'));
  const verified=await verifyCache({root:resolve(root,'data/scientific/cache'),approval});
  const context={approval,manifest:verified.manifest,bytes:await readFile(resolve(verified.entry,approval.resource.file))},folder=resolve(root,'data/scientific/bidmc');
  validateBIDMCNotice(await readFile(resolve(folder,'source-notices/LICENSE')));
  const expected={'BIDMC-01.dataset-card.json':buildBIDMCCard(context),'BIDMC-01.split-policy.json':buildBIDMCSplit(context)};
  if(mode==='prepare'){
    await mkdir(folder,{recursive:true});
    for(const [file,value]of Object.entries(expected)){
      try{await writeFile(resolve(folder,file),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
      catch(e){if(e.code!=='EEXIST')throw e;if(stableJSON(JSON.parse(await readFile(resolve(folder,file),'utf8')))!==stableJSON(value))throw Error('Existing documentation differs;refusing overwrite.');}
    }
  }
  const card=JSON.parse(await readFile(resolve(folder,'BIDMC-01.dataset-card.json'),'utf8')),split=JSON.parse(await readFile(resolve(folder,'BIDMC-01.split-policy.json'),'utf8'));
  validateBIDMCCard(card,context);validateBIDMCSplit(split,context);
  console.log(JSON.stringify({status:'verified',source_id:approval.id,bytes:verified.bytes,sha256:verified.sha256,rows:card.record.row_count,missing_counts:card.record.missing_counts,split_status:split.status,assignments:split.assignments.length,network_requests:0},null,2));
}
if(import.meta.main)main().catch(e=>{console.error(JSON.stringify({status:'failed',code:e.code??'DOCUMENTATION_FAILED',message:e.message}));process.exitCode=1;});
