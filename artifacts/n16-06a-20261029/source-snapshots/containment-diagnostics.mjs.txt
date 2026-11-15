// Pure policy with injected IO. Importing this module never probes a filesystem or opens SQLite.
import { constants } from 'node:os';
import { posix } from 'node:path';
import { plain,exact,sha,stable,fail } from './read-contract.mjs';

const VERSION='astra.n16.containment-diagnostic.v1';
const TARGETS=[['root','/'],['source_directory','/fixture'],['source_file','/fixture/source.sqlite']];
const OPERATIONS=['create_root_file','create_source_file','open_source_readwrite'];
const DENIALS=['EACCES','EPERM','EROFS'];
const same=(a,b)=>stable(a)===stable(b);
function errorFields(error){return {
  code:typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,31}$/.test(error.code)?error.code:null,
  errno:Number.isInteger(error?.errno)?error.errno:null,
  syscall:['open','openat','write','writeFile','read','readlink'].includes(error?.syscall)?error.syscall:null
};}
function sourceIdentity(source){
  if(!exact(source,['source_id','sha256'])||source.source_id!=='astra.n16.designated-synthetic.elevated.v1'
    ||source.sha256!=='4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73')fail('DIAGNOSTIC_SOURCE_INVALID');
  return {...source};
}
export function mountProof(text,namespace){
  if(typeof text!=='string'||Buffer.byteLength(text)>1048576||!/^mnt:\[\d+\]$/.test(namespace))fail('MOUNT_PROOF_INVALID');
  const mounts=[],ids=new Set();
  for(const line of text.trim().split('\n')){
    const [left,right,...extra]=line.split(' - '),fields=left.split(' ');
    if(!right||right.split(' ').length<3||extra.length||fields.length<6||!/^[1-9]\d*$/.test(fields[0])||ids.has(fields[0]))fail('MOUNT_PROOF_INVALID');
    ids.add(fields[0]);const path=fields[4].replace(/\\([0-7]{3})/g,(_,n)=>String.fromCharCode(parseInt(n,8)));
    if(!path.startsWith('/')||posix.normalize(path)!==path)fail('MOUNT_PROOF_INVALID');
    mounts.push({path,id:Number(fields[0]),options:fields[5].split(',')});
  }
  const targets=TARGETS.map(([target,path])=>{
    const candidates=mounts.filter(m=>m.path==='/'||path===m.path||path.startsWith(m.path+'/')).sort((a,b)=>b.path.length-a.path.length);
    const m=candidates[0];
    if(m&&candidates.filter(x=>x.path===m.path).length!==1)fail('MOUNT_PROOF_AMBIGUOUS');
    if(!m||!['/','/fixture','/fixture/source.sqlite'].includes(m.path)||!m.options.includes('ro')||m.options.includes('rw'))fail('MOUNT_NOT_READONLY');
    if(target!=='root'&&m.path==='/')fail('SOURCE_MOUNT_NOT_IDENTIFIED');
    return {target,mount_point:m.path,mount_id:m.id,per_mount_options:[...m.options],read_only:true};
  });
  return {kind:'PROC_SELF_MOUNTINFO',namespace,mountinfo_sha256:sha(text),targets};
}
function proofValid(proof){
  return exact(proof,['kind','namespace','mountinfo_sha256','targets'])&&proof.kind==='PROC_SELF_MOUNTINFO'
    &&/^mnt:\[\d+\]$/.test(proof.namespace)&&/^[a-f0-9]{64}$/.test(proof.mountinfo_sha256)
    &&Array.isArray(proof.targets)&&proof.targets.length===3&&proof.targets.every((v,i)=>
      exact(v,['target','mount_point','mount_id','per_mount_options','read_only'])&&v.target===TARGETS[i][0]
      &&(i===0?v.mount_point==='/':i===1?v.mount_point==='/fixture':['/fixture','/fixture/source.sqlite'].includes(v.mount_point))
      &&Number.isSafeInteger(v.mount_id)&&v.mount_id>0&&v.read_only===true&&Array.isArray(v.per_mount_options)
      &&v.per_mount_options.includes('ro')&&!v.per_mount_options.includes('rw')&&v.per_mount_options.every(x=>typeof x==='string'&&/^[A-Za-z0-9_=.-]+$/.test(x)))
    &&proof.targets[0].mount_id!==proof.targets[1].mount_id
    &&(proof.targets[2].mount_point==='/fixture'?proof.targets[2].mount_id===proof.targets[1].mount_id
      :proof.targets[2].mount_id!==proof.targets[0].mount_id&&proof.targets[2].mount_id!==proof.targets[1].mount_id);
}
function denialValid(probe){return probe.observed==='denied'&&DENIALS.includes(probe.code)&&Number.isInteger(probe.errno)
  &&probe.errno===-constants.errno[probe.code];}
function seal(record){return {...record,hash:sha(stable(record))};}
export function probeContainment(io,source){
  const record={schema_version:VERSION,source:sourceIdentity(source),stage:'containment',proof:null,probes:[],
    namespace_stable:false,mount_error:null,qualified:false,failed_subcheck:'mount_assertion'};
  try{record.proof=mountProof(io.readMountInfo(),io.mountNamespace());if(!proofValid(record.proof))fail('MOUNT_PROOF_INVALID');}
  catch(e){record.mount_error=errorFields(e);return seal(record);}
  // Positive mount-level proof is required BEFORE attempting any write-denial probe.
  const actions=[io.createRootFile,io.createSourceFile,io.openSourceReadwrite];
  for(let i=0;i<actions.length;i++){
    let error=null,observed='write_succeeded';try{actions[i]();}catch(e){error=e;observed='denied';}
    const probe={stage:TARGETS[i][0],operation:OPERATIONS[i],expected:'write_denied_on_verified_read_only_mount',observed,
      ...errorFields(error),denial_kind:error?.code==='EROFS'?'mount_denial':DENIALS.includes(error?.code)?'permission_denial':'unrecognized',accepted:false};
    probe.accepted=proofValid(record.proof)&&denialValid(probe);record.probes.push(probe);
    if(!probe.accepted){record.failed_subcheck=probe.stage;return seal(record);}
  }
  try{record.namespace_stable=io.mountNamespace()===record.proof.namespace&&sha(io.readMountInfo())===record.proof.mountinfo_sha256;}
  catch(e){record.mount_error=errorFields(e);}
  record.qualified=record.namespace_stable;record.failed_subcheck=record.qualified?null:'mount_changed';return seal(record);
}
export function validateContainmentRecord(record,source){
  sourceIdentity(source);if(record===null||record===undefined)fail('CONTAINMENT_TRACE_MISSING');
  if(!plain(record)||!exact(record,['schema_version','source','stage','proof','probes','namespace_stable','mount_error','qualified','failed_subcheck','hash']))fail('CONTAINMENT_TRACE_CORRUPT');
  const {hash,...body}=record;
  if(hash!==sha(stable(body))||record.schema_version!==VERSION||record.stage!=='containment'||!same(record.source,source)
    ||!Array.isArray(record.probes)||record.probes.length>3||typeof record.namespace_stable!=='boolean')fail('CONTAINMENT_TRACE_CORRUPT');
  const safeError=e=>exact(e,['code','errno','syscall'])&&(e.code===null||typeof e.code==='string'&&/^[A-Z][A-Z0-9_]{0,31}$/.test(e.code))
    &&(e.errno===null||Number.isInteger(e.errno))&&(e.syscall===null||['open','openat','write','writeFile','read','readlink'].includes(e.syscall));
  if(record.mount_error!==null&&!safeError(record.mount_error))fail('CONTAINMENT_TRACE_CORRUPT');
  const proof=proofValid(record.proof);
  for(const [i,p] of record.probes.entries()){
    if(!exact(p,['stage','operation','expected','observed','code','errno','syscall','denial_kind','accepted'])||p.stage!==TARGETS[i][0]||p.operation!==OPERATIONS[i]
      ||p.expected!=='write_denied_on_verified_read_only_mount'||!['denied','write_succeeded'].includes(p.observed)||!safeError({code:p.code,errno:p.errno,syscall:p.syscall})
      ||p.denial_kind!==(p.code==='EROFS'?'mount_denial':DENIALS.includes(p.code)?'permission_denial':'unrecognized')
      ||p.accepted!==(proof&&denialValid(p)))fail('CONTAINMENT_TRACE_CORRUPT');
  }
  const qualified=proof&&record.probes.length===3&&record.probes.every(p=>p.accepted)&&record.namespace_stable&&record.mount_error===null;
  const failure=!proof?'mount_assertion':record.probes.find(p=>!p.accepted)?.stage??(qualified?null:'mount_changed');
  if(record.qualified!==qualified||record.failed_subcheck!==failure)fail('CONTAINMENT_TRACE_CORRUPT');return record;
}
// Worker waits for this acknowledgement before any SQLite constructor/query. Persistence is parent-only.
export async function commitContainment(record,source,{persist,acknowledge,block}){
  let valid;
  try{valid=validateContainmentRecord(record,source);}catch(error){block({code:error.code,stage:'diagnostic_record'});throw error;}
  // Latch the guard failure before waiting for diagnostic IO; logging cannot delay admission stop.
  if(!valid.qualified)block({code:'SOURCE_NOT_READONLY',stage:valid.failed_subcheck});
  try{const receipt=await persist(valid);if(!receipt||receipt.durable!==true||receipt.hash!==valid.hash)fail('DIAGNOSTIC_PERSISTENCE_FAILED');}
  catch{block({code:'DIAGNOSTIC_PERSISTENCE_FAILED',stage:'diagnostic_persistence'});fail('DIAGNOSTIC_PERSISTENCE_FAILED');}
  if(!valid.qualified)throw Object.assign(Error('SOURCE_NOT_READONLY'),{code:'SOURCE_NOT_READONLY',diagnostics:valid});
  try{await acknowledge({command:'containment_verified',hash:valid.hash});}
  catch{block({code:'DIAGNOSTIC_ACK_FAILED',stage:'diagnostic_ack'});fail('DIAGNOSTIC_ACK_FAILED');}
  return valid;
}
export function bindContainmentReceipt(record,receipt,source){
  validateContainmentRecord(record,source);
  if(!record.qualified||receipt?.isolation?.containment_diagnostic_sha256!==record.hash
    ||receipt.isolation.mount_namespace!==record.proof.namespace)fail('CONTAINMENT_RECEIPT_MISMATCH');return record;
}
