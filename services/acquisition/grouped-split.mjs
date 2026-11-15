// Partition mechanics qualification only. No real-source identity is invented.
import { object,fail,isHash,text,stableJSON,sha256 } from './validation.mjs';
import { hashObject,originalContext } from './local-source.mjs';
const check=(ok,code)=>{if(!ok)fail(code,'N07 split rejected: '+code);};
export function validateUnits(units){
  check(Array.isArray(units)&&units.length>=1&&units.length<=1000,'UNIT_LIMIT');const ids=new Set();
  for(const u of units){
    object(u,['id','source_id','source_sha256','subject','session','scenario','related','content_sha256','start_seconds','end_seconds','synthetic']);
    for(const key of ['id','source_id','subject','session','scenario'])text(u[key],80);
    check(!ids.has(u.id),'DUPLICATE_UNIT');ids.add(u.id);
    check(u.synthetic===true&&u.source_id.startsWith('SYN-')&&u.subject.startsWith('SYN-')&&u.session.startsWith('SYN-'),'REAL_IDENTITIES_UNVERIFIED');
    check(isHash(u.source_sha256)&&isHash(u.content_sha256)&&Number.isFinite(u.start_seconds)&&Number.isFinite(u.end_seconds)
      &&u.start_seconds>=0&&u.end_seconds>u.start_seconds,'INVALID_UNIT');
    check(Array.isArray(u.related)&&u.related.length<=20&&new Set(u.related).size===u.related.length,'INVALID_UNIT');u.related.forEach(x=>text(x,80));
  }
  return [...units].sort((a,b)=>a.id.localeCompare(b.id));
}
function policyCheck(p){
  object(p,['schema_version','version','seed','mode','ratios','purge_gap_seconds','preprocessing_fit']);
  check(p.schema_version==='astra.n07.split-policy.v1'&&p.version==='synthetic-grouped-v1'&&Number.isSafeInteger(p.seed)&&p.seed>=0&&p.seed<=2147483647,'INVALID_POLICY');
  check(['group','chronological'].includes(p.mode)&&p.preprocessing_fit==='training_only'&&Number.isFinite(p.purge_gap_seconds)&&p.purge_gap_seconds>=0,'INVALID_POLICY');
  check(Array.isArray(p.ratios)&&p.ratios.length===3&&p.ratios.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<1)
    &&Math.abs(p.ratios.reduce((a,b)=>a+b,0)-1)<1e-12,'INVALID_POLICY');
}
function components(units){
  const parent=units.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  const seen=new Map();
  units.forEach((u,i)=>{
    const keys=['subject:'+u.subject,'session:'+u.session,'scenario:'+u.scenario,'source:'+u.source_id,'original:'+u.source_sha256,
      'content:'+u.content_sha256,...u.related.map(x=>'related:'+x)];
    for(const k of keys){if(seen.has(k))parent[find(i)]=find(seen.get(k));else seen.set(k,i);}
  });
  const groups=new Map();units.forEach((u,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(u);});
  return [...groups.values()];
}
export function buildGroupedSplit(input,policy){
  policyCheck(policy);const units=validateUnits(input),groups=components(units);
  if(groups.length<3)return {schema_version:'astra.n07.split.v1',policy:structuredClone(policy),input_sha256:hashObject(units),
    status:'BLOCKED_INSUFFICIENT_GROUPS',synthetic:true,executed:false,assignments:[],groups:groups.length,scientific_validation:false};
  const key=g=>stableJSON(g.map(u=>u.id));
  groups.sort((a,b)=>policy.mode==='chronological'?Math.min(...a.map(x=>x.start_seconds))-Math.min(...b.map(x=>x.start_seconds))||key(a).localeCompare(key(b)):
    sha256(String(policy.seed)+':'+key(a)).localeCompare(sha256(String(policy.seed)+':'+key(b))));
  const train=Math.max(1,Math.floor(groups.length*policy.ratios[0])),valid=Math.max(1,Math.floor(groups.length*policy.ratios[1]));
  check(train>=1&&valid>=1&&train+valid<groups.length,'EMPTY_PARTITION');
  const assignments=groups.flatMap((g,i)=>g.map(u=>({id:u.id,partition:i<train?'train':i<train+valid?'validation':'test'}))).sort((a,b)=>a.id.localeCompare(b.id));
  const groupOf=new Map(assignments.map(x=>[x.id,x.partition]));
  if(policy.mode==='chronological'){
    for(const [left,right] of [['train','validation'],['validation','test']]){
      const a=units.filter(u=>groupOf.get(u.id)===left),b=units.filter(u=>groupOf.get(u.id)===right);
      check(Math.max(...a.map(u=>u.end_seconds))+policy.purge_gap_seconds<=Math.min(...b.map(u=>u.start_seconds)),'TEMPORAL_LEAKAGE');
    }
  }
  return {schema_version:'astra.n07.split.v1',policy:structuredClone(policy),input_sha256:hashObject(units),status:'ENGINEERING_FIXTURE_ONLY',
    synthetic:true,executed:true,groups:groups.length,assignments,counts:Object.fromEntries(['train','validation','test'].map(p=>[p,assignments.filter(a=>a.partition===p).length])),
    scientific_validation:false,independent_heldout_claim:false,excluded_units:[]};
}
export function validateGroupedSplit(manifest,units,policy){
  check(stableJSON(manifest)===stableJSON(buildGroupedSplit(units,policy)),'SPLIT_CONTAMINATION');return manifest;
}
export function actualSplitReadiness(context){
  const {approval:a}=originalContext(context);
  return {schema_version:'astra.n07.actual-split-readiness.v1',source_id:context.id,source_sha256:a.resource.sha256,
    status:context.id.includes('bidmc')?'BLOCKED_SINGLE_RECORD_UNVERIFIED_PATIENT_LINKAGE':context.id.includes('osdr')?'BLOCKED_NO_EXPERIMENTAL_UNIT_IDENTITIES':'NOT_APPLICABLE_BIBLIOGRAPHIC_METADATA',
    assignments:[],executed:false,independently_verified:false,scientific_review:'PENDING_IF_FUTURE_MODEL_TARGET_OR_GROUPING_IS_PROPOSED'};
}
