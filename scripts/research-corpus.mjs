import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { read } from '../services/acquisition/cache.mjs';
import { validateSources,sha256,fail } from '../services/corpus/sources.mjs';
import { acquirePublication } from '../services/corpus/acquire.mjs';
import { rebuildOffline,writeCorpus,verifyCorpusFiles,validateReviewPack } from '../services/corpus/offline.mjs';

export const project=fileURLToPath(new URL('../',import.meta.url));
export const corpusRoot=resolve(project,'data/corpus/n13-01');
export async function approvedSources(){
  const policy=validateSources(JSON.parse((await read(join(corpusRoot,'sources.json'),65536)).toString('utf8')));
  const review=resolve(project,'artifacts/n13-01-20261024/source-review');
  for(const d of policy.documents)for(const e of d.review_evidence)if(sha256(await read(join(review,e.file),600000))!==e.sha256)fail('PROVENANCE_MISMATCH','Official review evidence changed.');
  const record=JSON.parse((await read(join(review,'hrp-record.json'),65536)).toString('utf8'));
  if(record.id!==20160003864||record.onlyAbstract!==false||record.distribution!=='PUBLIC'||record.copyright?.determinationType!=='PUBLIC_USE_PERMITTED'||record.copyright?.containsThirdPartyMaterial!==false||record.exportControl?.isExportControl!=='NO')fail('RIGHTS_UNVERIFIED','NTRS exact identity/full-public-use conditions required.');
  return policy;
}
async function main(){
  const [mode,arg,...extra]=process.argv.slice(2);
  if(extra.length||!['acquire','build','verify'].includes(mode))throw Error('Usage: research-corpus.mjs acquire --source=id | build [--output=path] | verify');
  const sources=await approvedSources();
  if(mode==='acquire'){
    if(!arg?.startsWith('--source='))throw Error('Exact --source=id required.');
    const id=arg.slice(9);if(!sources.documents.some(d=>d.id===id))fail('SOURCE_NOT_ALLOWED','Unapproved document.');
    console.log(JSON.stringify(await acquirePublication({root:join(corpusRoot,'originals'),id}),null,2));
  }else if(mode==='build'){
    if(arg&&!arg.startsWith('--output='))throw Error('Only --output=path allowed.');
    const output=arg?resolve(arg.slice(9)):join(corpusRoot,'derived');
    console.log(JSON.stringify(await writeCorpus(output,await rebuildOffline({project,root:corpusRoot,sources})),null,2));
  }else{
    if(arg)throw Error('verify takes no options and never downloads.');
    const result=await verifyCorpusFiles({project,root:corpusRoot,sources,derived:join(corpusRoot,'derived')});
    const pack=JSON.parse((await read(join(corpusRoot,'review.json'),65536)).toString('utf8'));
    console.log(JSON.stringify({...result.summary,review:validateReviewPack(result.corpus,pack)},null,2));
  }
}
if(import.meta.main)main().catch(e=>{console.error(JSON.stringify({status:'BLOCKED',code:e.code??e.name,message:e.message}));process.exitCode=1;});
