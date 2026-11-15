import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { openDesignation,issueCaller,runFourDesignated,closeDesignation } from '../services/agent/designated-source.mjs';
import { CREW } from '../packages/contracts.mjs';

export function parseArgs(argv){
  if(argv.length>1||argv.length===1&&!/^--crew=CREW-0[1-6]$/.test(argv[0]))throw Error('Only --crew=CREW-01..06 is allowed; no paths, SQL, roles or clock options.');
  return argv.length?argv[0].slice(7):'CREW-03';
}
// The issuer is supplied only by the owner launcher. Tests reuse the one prepared source.
export async function runDemo(issuer,argv=[]){
  const crew=parseArgs(argv),caller=issueCaller(issuer,{id:'n16-designated-demo',role:'demo_admin',crew_id:null,demo:true},
    {crew_ids:CREW.map(c=>c.id)});
  return runFourDesignated(caller,crew);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let issuer;
  try{const crew=parseArgs(process.argv.slice(2));issuer=await openDesignation();const result=await runDemo(issuer,['--crew='+crew]);
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({execution_status:'FAILED',data_status:'UNKNOWN',code:e.code??'INVALID_CLI',message:e.message})+'\n');process.exitCode=1;}
  finally{if(issuer)await closeDesignation(issuer);}
}
