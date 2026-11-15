// Separate scratch-only research CLI; no operational path or role option.
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createQualification,cloneFixture,executeFour,closeQualification,EVIDENCE } from '../services/agent/sqlite-fixture-runner.mjs';
import { PROFILES } from '../services/agent/sqlite-fixture-contract.mjs';
import { fail } from '../services/agent/read-contract.mjs';
export function parseArgs(args){
  if(args.length!==2||args.filter(x=>x.startsWith('--fixture=')).length!==1||args.filter(x=>x.startsWith('--crew=')).length!==1)fail('CLI_EXPECTS_FIXTURE_AND_CREW');
  const profile=args.find(x=>x.startsWith('--fixture=')).slice(10),crew=args.find(x=>x.startsWith('--crew=')).slice(7);
  if(!PROFILES.includes(profile)||!/^CREW-0[1-6]$/.test(crew))fail('INVALID_CLI_SELECTION');return {profile,crew};
}
export async function main(args){
  const {profile,crew}=parseArgs(args),q=await createQualification();let run;
  try{const s=await cloneFixture(q,profile);run=await executeFour(q,s,Object.freeze({id:'n16-sqlite-local-demo',role:'demo_admin',demo:true,crew_id:null}),crew);}
  finally{const info=await closeQualification(q);await writeFile(join(EVIDENCE,'cli-qualification.json'),JSON.stringify({root:info.root,run,manifest:info.manifest,measurements:info.measurements},null,2)+'\n');}
  if(run?.recovery.workflow_outcome!=='COMPLETED')fail('WORKFLOW_INCOMPLETE');
  return {run_id:run.run_id,source_kind:'scratch_sqlite',synthetic:true,tools:run.results.map(r=>({tool:r.tool,execution:r.execution_status,data:r.data_status,actual_sql_queries:r.receipt.actual_sql_queries})),recovery:run.recovery.status,replayed_calls:0};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  try{console.log(JSON.stringify(await main(process.argv.slice(2))));}catch(e){console.error(JSON.stringify({status:'STOPPED',code:e.code??'QUALIFICATION_FAILED',message:e.message}));process.exitCode=1;}
}
