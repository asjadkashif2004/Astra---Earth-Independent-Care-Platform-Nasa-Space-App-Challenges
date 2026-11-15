import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireSleep,verifySleepCache,buildSleepCard,buildSleepSplit,validateSleepDocuments } from '../services/acquisition/sleep-edf-cache.mjs';
import { stableJSON } from '../services/acquisition/validation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function sleepOptions(args){const [mode,...rest]=args;if(!['acquire','verify','prepare'].includes(mode)||rest.length>(mode==='acquire'?1:0)||rest.some(a=>!/^--review=.+$/.test(a)))throw Error('Usage: node scripts/sleep-edf-acquire.mjs acquire --review=path | prepare | verify');if(mode==='acquire'&&rest.length!==1)throw Error('Supply the existing bounded publisher review;it will not be downloaded again.');return {mode,review:rest[0]?.slice(9)};}
async function main(){
  const {mode,review}=sleepOptions(process.argv.slice(2)),approval=JSON.parse(await readFile(resolve(root,'data/scientific/sleep-edf-sc4001.approval.json'),'utf8')),cache=resolve(root,'data/scientific/cache');
  let verified;
  if(mode==='acquire'){const publisher=await readFile(resolve(review,'SHA256SUMS.txt')),publisherReceipt=JSON.parse(await readFile(resolve(review,'review.json'),'utf8'));verified=await acquireSleep({root:cache,approval,publisher,publisherReceipt});}
  else verified=await verifySleepCache({root:cache,approval});
  if(mode==='prepare'||mode==='verify'){
    const folder=resolve(root,'data/scientific/sleep-edf'),expected={'SC4001.dataset-card.json':buildSleepCard(approval,verified),'SC4001.split-policy.json':buildSleepSplit(approval,verified)};
    if(mode==='prepare'){await mkdir(folder,{recursive:true});for(const [name,value]of Object.entries(expected)){try{await writeFile(resolve(folder,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;if(stableJSON(JSON.parse(await readFile(resolve(folder,name),'utf8')))!==stableJSON(value))throw Error('Existing documentation differs;refusing overwrite.');}}}
    validateSleepDocuments(JSON.parse(await readFile(resolve(folder,'SC4001.dataset-card.json'),'utf8')),JSON.parse(await readFile(resolve(folder,'SC4001.split-policy.json'),'utf8')),approval,verified);
  }
  console.log(JSON.stringify({status:'verified',entry:verified.entry,files:verified.manifest.files,total_payload_bytes:verified.manifest.retrieval.total_payload_bytes,network_ms:verified.manifest.retrieval.network_ms,pair:verified.pair,note:mode==='acquire'?'One bounded two-file acquisition or immutable cache reuse.':'Offline original/document verification;no network.'},null,2));
}
if(import.meta.main)main().catch(e=>{console.error(JSON.stringify({status:'failed',code:e.code??e.name,message:e.message}));process.exitCode=1;});
