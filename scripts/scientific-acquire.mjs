import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, verifyCache } from '../services/acquisition/cache.mjs';
import { validateApproval, RESOURCE_ID } from '../services/acquisition/source.mjs';
import { OSDR_ID } from '../services/acquisition/osdr.mjs';
import { BIDMC_ID } from '../services/acquisition/bidmc.mjs';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function parseAcquisitionOptions(argv){
  const args=[...argv],mode=args.shift();let cache=resolve(project,'data/scientific/cache'),source=RESOURCE_ID;const seen=new Set();
  const usage=()=>{throw Error('Usage: node scripts/scientific-acquire.mjs verify|acquire [--cache=path] [--source=nasa-ntrs-20205008796|nasa-osdr-osd-1|physionet-bidmc-01-numerics]');};
  if(!['verify','acquire'].includes(mode)||args.length>2)usage();
  for(const arg of args){const m=/^--(cache|source)=(.+)$/.exec(arg);if(!m||seen.has(m[1]))usage();seen.add(m[1]);if(m[1]==='cache')cache=resolve(m[2]);else source=m[2];}
  if(![RESOURCE_ID,OSDR_ID,BIDMC_ID].includes(source))usage();
  const file=source===BIDMC_ID?'bidmc-01-numerics.approval.json':source===OSDR_ID?'osdr-osd-1.approval.json':'approved-sources.json';
  return {mode,cache,source,file};
}
async function main(){
  const {mode,cache,file}=parseAcquisitionOptions(process.argv.slice(2));
  const approval=validateApproval(JSON.parse(await readFile(resolve(project,'data/scientific',file),'utf8')));
  const result=await (mode==='verify'?verifyCache:acquire)({root:cache,approval});
  console.log(JSON.stringify({status:'verified',source_id:approval.id,bytes:result.bytes,sha256:result.sha256,entry:result.entry,
    retrieval_completed_at:result.manifest.retrieval.completed_at,note:mode==='verify'?'Offline integrity verification; no network.':'Existing verified cache reused or one bounded acquisition; no medical/corpus integration.'},null,2));
}
if(import.meta.main)main().catch(e=>{console.error(JSON.stringify({status:'failed',code:e.code??'ACQUISITION_FAILED',message:e.code==='ENOENT'?'Verified cache missing; acquisition is an explicit separate command.':e.message}));process.exitCode=1;});
