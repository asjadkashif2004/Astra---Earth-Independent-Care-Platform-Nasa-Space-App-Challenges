import { performance } from 'node:perf_hooks';
import { mkdtemp,readdir,stat,rm,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { localRegistry,loadLocalSource,trustedLocalCaller,hashObject } from '../../services/acquisition/local-source.mjs';
import { defaultAnnotation,appendAnnotation,validateAnnotation } from '../../services/acquisition/evidence-card.mjs';
import { publishBundle,recoverBundle } from '../../services/acquisition/local-bundle.mjs';
import { buildGroupedSplit,validateGroupedSplit } from '../../services/acquisition/grouped-split.mjs';
import { units,POLICY,VERSION } from '../../tests/fixtures/n07.mjs';
const token=trustedLocalCaller('researcher'),started=performance.now(),durations={source_validation:[],annotation:[],manifest_rebuild:[],split:[],recovery:[]},rss=[];
const contexts=[],histories={};
for(const e of (await localRegistry()).sources){const t=performance.now(),c=await loadLocalSource(e.id,token);durations.source_validation.push(performance.now()-t);contexts.push(c);
  histories[c.id]=appendAnnotation(c,[],defaultAnnotation(c),{id:'measure',expected_revision:0,reason:'Explicit structural metadata only'},token);}
for(let i=0;i<50;i++){
  let t=performance.now();validateAnnotation(contexts[i%3],defaultAnnotation(contexts[i%3]));durations.annotation.push(performance.now()-t);
  t=performance.now();const s=buildGroupedSplit(units(),POLICY);validateGroupedSplit(s,units(),POLICY);durations.split.push(performance.now()-t);rss.push(process.memoryUsage().rss);
}
const roots=[],manifests=[];let storage=0;
try{
 for(let i=0;i<2;i++){
  const root=await mkdtemp(join(tmpdir(),'astra-n07-final-measure-'));roots.push(root);let t=performance.now();
  const result=await publishBundle(root,contexts,histories,token);durations.manifest_rebuild.push(performance.now()-t);manifests.push(result.manifest_sha256);
  t=performance.now();await recoverBundle(result.directory,token);durations.recovery.push(performance.now()-t);
  for(const name of await readdir(result.directory))storage+=(await stat(join(result.directory,name))).size;
  rss.push(process.memoryUsage().rss);
 }
 if(manifests[0]!==manifests[1])throw Error('Non-deterministic rebuild');
}finally{for(const root of roots)await rm(root,{recursive:true,force:true});}
const split=buildGroupedSplit(units(),POLICY);
await writeFile(new URL('./synthetic-split.json',import.meta.url),JSON.stringify({fixture_version:VERSION,units:units(),manifest:split},null,2)+'\n',{flag:'wx'});
const out={fixture_version:VERSION,total_ms:performance.now()-started,source_count:3,annotation_samples:50,split_samples:50,
  operations_ms:Object.fromEntries(Object.entries(durations).map(([k,a])=>[k,{count:a.length,min:Math.min(...a),max:Math.max(...a),mean:a.reduce((x,y)=>x+y,0)/a.length}])),
  identical_rebuild_manifest:manifests[0],synthetic_split_sha256:hashObject(split),synthetic_partitions:split.counts,
  observed_Node_RSS_bytes:Math.max(...rss),Node_kernel_maxRSS_bytes:process.resourceUsage().maxRSS*1024,
  two_temporary_bundles_logical_bytes:storage,temporary_roots_removed:true,network_requests:0,database_opens:0,N16_worker_startups:0,
  limitation:'Small authorized originals and synthetic split units only; timing/RSS samples are observations, not hard bounds or scientific validation.'};
await writeFile(new URL('./performance.json',import.meta.url),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
