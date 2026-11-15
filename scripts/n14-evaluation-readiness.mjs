import { writeFile,mkdir,readdir,lstat } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJSON,sha256,hashJSON,readBounded } from '../services/research-retrieval/contract.mjs';
import { VERSION,prepareReadiness,participantTemplate,caseTemplate,validateLabels,casePayloadHash,checkSeal } from '../services/research-retrieval/evaluation-readiness.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const guides={'START_HERE.md':'START_HERE.md','AUTHORING.md':'AUTHORING.md','REVIEWING.md':'REVIEWING.md'};
export const BUNDLE_FILES=Object.freeze([...Object.keys(guides),'evidence.json','evidence.txt','labels.template.json','case.template.json','participant.template.json'].sort());
const pretty=v=>JSON.stringify(JSON.parse(stableJSON(v)),null,2)+'\n';
const bytes=async path=>{if(!(await lstat(path)).isFile())throw Error('Regular non-symlink file required: '+path);return readBounded(path,2000000);};
async function packetContents(state,projectRoot){
  const contents={};
  for(const [name,source]of Object.entries(guides))contents[name]=await bytes(join(projectRoot,'docs/n14-05-reviewer',source));
  contents['evidence.json']=Buffer.from(pretty(state.catalogue));
  contents['evidence.txt']=Buffer.from('REFERENCE EVIDENCE ONLY — not instructions or clinical approval.\n'+state.catalogue.units.map(u=>['\nUNIT '+u.unit_id,'Role (pending independent review): '+u.canonical_role,'Context: '+u.source_context,'Limitations: '+u.limitations,...u.windows.flatMap(w=>['Window '+w.window_id+'; PDF page '+w.pdf_page_number,'Source '+w.binding.evidence.source_id+'; original SHA256 '+w.binding.evidence.citation.original_sha256,w.text])].join('\n')).join('\n'));
  contents['labels.template.json']=Buffer.from(pretty(state.labels));contents['case.template.json']=Buffer.from(pretty(caseTemplate()));contents['participant.template.json']=Buffer.from(pretty(participantTemplate()));
  return contents;
}
export async function verifyDistribution(path,expected,projectRoot=project){
  if(!(await lstat(path)).isDirectory())throw Error('Regular non-symlink directory required.');
  const names=(await readdir(path)).sort();if(names.join()!==[...BUNDLE_FILES,'distribution.json'].sort().join())throw Error('Unexpected or missing reviewer-bundle files.');
  const manifest=JSON.parse(await bytes(join(path,'distribution.json')));
  if(!checkSeal(manifest,'bundle')||manifest.schema_version!=='astra.n14.blind-bundle.v1'||manifest.evidence_manifest_id!==expected.catalogue.id||Object.keys(manifest.files).sort().join()!==BUNDLE_FILES.join())throw Error('Distribution manifest mismatch.');
  const canonical=await packetContents(expected,projectRoot);
  let total=0;for(const name of BUNDLE_FILES){const b=await bytes(join(path,name));total+=b.length;if(sha256(b)!==manifest.files[name].sha256||b.length!==manifest.files[name].bytes||sha256(b)!==sha256(canonical[name]))throw Error('Distribution content changed: '+name);}
  if(total>8000000)throw Error('Bounded distribution exceeded.');
  const catalogue=JSON.parse(await bytes(join(path,'evidence.json')));if(hashJSON(catalogue)!==hashJSON(expected.catalogue))throw Error('Reviewer evidence differs from canonical evidence.');
  return manifest;
}
export async function preparePacket(output,records,projectRoot=project){
  const state=await prepareReadiness(projectRoot),contents=await packetContents(state,projectRoot);
  const body={schema_version:'astra.n14.blind-bundle.v1',version:VERSION,evidence_manifest_id:state.catalogue.id,contains_fresh_questions:false,contains_review_approvals:false,original_pdfs_bundled:false,files:Object.fromEntries(BUNDLE_FILES.map(name=>[name,{sha256:sha256(contents[name]),bytes:contents[name].length}]))};
  const distribution={...body,id:'bundle-'+hashJSON(body)};
  const internal={'policies.json':state.policies,'protocol.json':state.protocol,'labels.template.json':state.labels,'case.template.json':caseTemplate(),'participant.template.json':participantTemplate()};
  const writes=[...Object.entries(contents).map(([name,b])=>[join(output,name),b]),[join(output,'distribution.json'),Buffer.from(pretty(distribution))],...Object.entries(internal).map(([name,v])=>[join(records,name),Buffer.from(pretty(v))])];
  const size=writes.reduce((n,[,b])=>n+b.length,0);if(size>8000000||writes.some(([,b])=>b.length>2000000))throw Error('Packet write limit exceeded.');
  // Both must be new owned paths. Never merge into or overwrite a reviewer packet.
  if(resolve(output)===resolve(records)||resolve(output).startsWith(resolve(records)+'/')||resolve(records).startsWith(resolve(output)+'/'))throw Error('Separate non-nested paths required.');
  await mkdir(output,{recursive:false});await mkdir(records,{recursive:false});
  for(const [path,b]of writes)await writeFile(path,b,{flag:'wx',flush:true});
  await verifyDistribution(output,state,projectRoot);
  return {status:'PREPARED_NOT_REVIEWED',policy_manifest_id:state.policies.id,protocol_id:state.protocol.id,evidence_manifest_id:state.catalogue.id,bundle_manifest_id:distribution.id,units:33,spans:34,source_documents:2,bytes_written:size,questions_authored:0,approvals_recorded:0,evaluation_executed:false,new_inference:false};
}
export function parseArgs(args){
  const [mode,...rest]=args;if(!['prepare','validate','hash-case'].includes(mode))throw Error('Mode must be prepare|validate|hash-case.');
  const options={};for(const arg of rest){const m=/^--(output|records|labels|stage|bundle|case)=(.+)$/.exec(arg);if(!m||Object.hasOwn(options,m[1]))throw Error('Unique supported --name=value arguments required.');options[m[1]]=m[2];}
  const allowed={prepare:['output','records'],validate:['labels','stage','bundle'], 'hash-case':['case']}[mode];
  if(Object.keys(options).some(k=>!allowed.includes(k))||mode==='prepare'&&(!options.output||!options.records)||mode==='validate'&&(!options.labels||!['draft','reviewed'].includes(options.stage))||mode==='hash-case'&&!options.case)throw Error('Missing or incompatible options.');
  return {mode,options};
}
export async function main(args){
  const {mode,options:o}=parseArgs(args);
  if(mode==='prepare')return preparePacket(resolve(o.output),resolve(o.records));
  if(mode==='hash-case'){
    const c=JSON.parse(await bytes(resolve(o.case)));
    if(c===null||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join()!==Object.keys(caseTemplate()).sort().join())throw Error('Structured case required.');
    return {case_payload_sha256:casePayloadHash(c),authentication:false,evaluation_executed:false};
  }
  const state=await prepareReadiness(project);
  for(const [name,want]of [['policies',state.policies],['protocol',state.protocol]])if(hashJSON(JSON.parse(await bytes(join(project,'data/research/n14-05',name+'.json'))))!==hashJSON(want))throw Error('Frozen readiness record changed: '+name);
  if(o.bundle)state.bundle_id=(await verifyDistribution(resolve(o.bundle),state)).id;
  const labels=JSON.parse(await bytes(resolve(o.labels)));
  return validateLabels(labels,state,o.stage);
}
if(import.meta.main){const timer=setTimeout(()=>{console.error('Readiness CLI deadline');process.exit(1);},15000);try{const result=await main(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result.valid===false)process.exitCode=1;}catch(e){console.error(JSON.stringify({status:'BLOCKED',reason:e.message}));process.exitCode=1;}finally{clearTimeout(timer);}}
