import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,POLICY,stableJSON,sha256,readBounded } from '../services/research-retrieval/contract.mjs';
import { loadEncoder } from '../services/research-retrieval/encoder.mjs';
import { buildIndex,saveIndex,loadIndex,rank,assessClaim,validQuery } from '../services/research-retrieval/retrieval.mjs';
import { evaluate } from '../services/research-retrieval/evaluation.mjs';
import { denyNetworking } from '../services/research-retrieval/offline.mjs';

export function parseArgs(args){
  const [mode,...rest]=args;if(!['build','verify','query','claim','evaluate'].includes(mode))throw Error('Mode must be build|verify|query|claim|evaluate.');const options={};
  for(const arg of rest){const m=/^--(runtime|model|index|text|request|output|plan)=(.*)$/s.exec(arg);if(!m||!m[2]||options[m[1]])throw Error('Use unique --name=value arguments.');options[m[1]]=m[2];}
  if(!options.index)throw Error('--index required.');if(['build','query','evaluate'].includes(mode)&&(!options.runtime||!options.model))throw Error('--runtime and --model required for native inference.');if(mode==='query'&&!options.text)throw Error('--text required.');if(mode==='claim'&&(!options.request||options.text))throw Error('Claim mode requires --request=bound-claim.json; bare --text/--role is unsupported.');if(mode!=='claim'&&options.request)throw Error('--request is only valid in claim mode.');if(mode==='evaluate'&&(!options.output||!options.plan))throw Error('--output and frozen --plan required.');return {mode,options};
}
export async function main(args){
  const {mode,options:o}=parseArgs(args),project=fileURLToPath(new URL('../',import.meta.url)),network=denyNetworking(),inputs=await loadEvidence(project);let encoder;
  const start=performance.now(),watchdog=setTimeout(()=>{console.error(JSON.stringify({status:'BLOCKED',reason:'Bounded CLI overall deadline'}));process.exit(1);},mode==='evaluate'?250000:mode==='build'?365000:mode==='query'?65000:60000);
  try{
    if(['build','query','evaluate'].includes(mode))encoder=await loadEncoder({runtime:resolve(o.runtime),model:resolve(o.model)});
    let result;
    if(mode==='build'){const b=await buildIndex(inputs.evidence,encoder);await saveIndex(resolve(o.index),b);result={status:'PASS',windows:b.manifest.windows,units:b.manifest.units,index_bytes:b.bytes,build_ms:b.build_ms,cold_ms:encoder.cold_ms,graph:encoder.graph,details:encoder.details,manifest:b.manifest};}
    else{
      const saved=await loadIndex(resolve(o.index),inputs.evidence);
      if(mode==='verify')result={status:'PASS',windows:saved.index.windows.length,units:33,manifest:saved.manifest};
      if(mode==='query'){const t=performance.now(),embedding=validQuery(o.text)?await encoder.embed(o.text):null;result=rank(saved.index,saved.vectors,o.text,{vector:embedding?.vector});result.query_ms=performance.now()-t;if(result.query_ms>5000)throw Error('Query exceeded5s.');}
      if(mode==='claim'){const request=JSON.parse(await readBounded(resolve(o.request),24000));result=assessClaim(request,saved.index,{evidence:inputs.evidence});}
      if(mode==='evaluate'){
        const plan=JSON.parse(await readFile(resolve(o.plan),'utf8')),packet=JSON.parse(await readFile(join(project,'data/corpus/n13-03/derived/packet.json'),'utf8'));
        // Raw per-case results survive interruption before summary aggregation.
        await mkdir(resolve(o.output),{recursive:true});const raw=join(resolve(o.output),'cases.jsonl');
        await writeFile(raw,'',{flag:'wx'});
        const {appendFile}=await import('node:fs/promises');result=await evaluate({plan,packet,evidence:inputs.evidence,...saved,encoder,onCase:row=>appendFile(raw,JSON.stringify(row)+'\n',{flush:true})});
      }
    }
    if(network.length)throw Error('Offline network request attempted.');
    result.network_attempts=network;result.elapsed_ms=performance.now()-start;result.process_peak_rss_bytes=process.resourceUsage().maxRSS*1024;result.research_only=true;result.model_revision=POLICY.revision;
    if(o.output&&mode!=='evaluate')await writeFile(resolve(o.output),stableJSON(result)+'\n',{flag:'wx',flush:true});
    if(mode==='evaluate')await writeFile(join(resolve(o.output),'evaluation.json'),stableJSON(result)+'\n',{flag:'wx',flush:true});
    return result;
  }finally{clearTimeout(watchdog);await encoder?.release();}
}
if(import.meta.main){try{const result=await main(process.argv.slice(2));const printable=JSON.stringify(result,null,2).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));console.log(printable);}catch(e){console.error(JSON.stringify({status:'BLOCKED',code:e.code??e.name,message:e.message}));process.exitCode=1;}}
