import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCache } from '../services/acquisition/cache.mjs';
import { stableJSON } from '../services/acquisition/source.mjs';
import { buildDatasetCard,buildSplitManifest,validateDatasetCard,validateSplitManifest } from '../services/acquisition/osdr.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function main(){
  const [mode,...args]=process.argv.slice(2);if(!['prepare','verify'].includes(mode)||args.length)throw Error('Usage: node scripts/osdr-study.mjs prepare|verify');
  const approval=JSON.parse(await readFile(resolve(root,'data/scientific/osdr-osd-1.approval.json'),'utf8'));
  const verified=await verifyCache({root:resolve(root,'data/scientific/cache'),approval});
  const context={approval,manifest:verified.manifest,bytes:await readFile(resolve(verified.entry,'original.json'))},folder=resolve(root,'data/scientific/osdr');
  const expected={'OSD-1.dataset-card.json':buildDatasetCard(context),'OSD-1.split-policy.json':buildSplitManifest(context)};
  if(mode==='prepare'){
    await mkdir(folder,{recursive:true});
    for(const [file,value]of Object.entries(expected)){
      try{await writeFile(resolve(folder,file),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
      catch(e){if(e.code!=='EEXIST')throw e;const existing=JSON.parse(await readFile(resolve(folder,file),'utf8'));if(stableJSON(existing)!==stableJSON(value))throw Error('Existing documentation differs;refusing overwrite.');}
    }
  }
  const card=JSON.parse(await readFile(resolve(folder,'OSD-1.dataset-card.json'),'utf8')),split=JSON.parse(await readFile(resolve(folder,'OSD-1.split-policy.json'),'utf8'));
  validateDatasetCard(card,context);validateSplitManifest(split,context);
  console.log(JSON.stringify({status:'verified',study_id:'OSD-1',source_sha256:verified.sha256,original_bytes:verified.bytes,organism:card.study.organism,counts:card.study.counts,split_status:split.status,assignments:split.assignments.length,network_requests:0},null,2));
}
main().catch(e=>{console.error(JSON.stringify({status:'failed',code:e.code??'DOCUMENTATION_FAILED',message:e.message}));process.exitCode=1;});
