// N16-06C: metadata/code integrity only. No filesystem, worker or SQL entry point.
import { parseJSON, sha, freeze } from './read-contract.mjs';

// Immutable N16-06A inventories. The changed-files manifest also pins the
// preservation inventory. These assignments are policy, never fallback order.
export const CONTAINMENT_PIN_POLICY=freeze({
  version:'astra.n16-06c.dependency-pins.v1',
  inventories:[
    {path:'artifacts/n16-06a-20261029/evidence-manifest.json',kind:'changed',
      sha256:'d4751ad2f6449b8e5f3edecbd0a12bf02768ce151b7c7eb2094e25ff0c56de6b'},
    {path:'artifacts/n16-06a-20261029/preservation-before.json',kind:'preserved',
      sha256:'70aaed7fbf48e61dacb5cb1dbf94d29cb8d943132e3dd674cf3bd10188d17385'}
  ],
  dependencies:[
    {path:'services/agent/containment-diagnostics.mjs',inventory:'artifacts/n16-06a-20261029/evidence-manifest.json'},
    {path:'services/agent/qualification-batch.mjs',inventory:'artifacts/n16-06a-20261029/evidence-manifest.json'},
    {path:'services/agent/read-contract.mjs',inventory:'artifacts/n16-06a-20261029/preservation-before.json'},
    {path:'packages/contracts.mjs',inventory:'artifacts/n16-06a-20261029/preservation-before.json'}
  ]
});

const check=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const hash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const relative=p=>typeof p==='string'&&p.split('/').every(s=>/^[A-Za-z0-9_.-]+$/.test(s)&&s!=='.'&&s!=='..');
const MAX_MANIFEST=2*1024*1024;

// Readers are injected for deterministic QA; the runner supplies only anchored
// metadata reads and fixed project-code reads. A failure returns no partial pins.
export async function verifyDependencyPins(policy,{readInventory,readDependency}){
  check(record(policy)&&typeof policy.version==='string'&&Array.isArray(policy.inventories)
    &&policy.inventories.length>0&&Array.isArray(policy.dependencies)&&policy.dependencies.length>0,'PIN_POLICY_INVALID');
  const inventories=new Map(),dependencies=new Set();
  for(const spec of policy.inventories){
    check(record(spec)&&relative(spec.path)&&['changed','preserved'].includes(spec.kind)&&hash(spec.sha256),'PIN_POLICY_INVALID');
    check(!inventories.has(spec.path),'PIN_INVENTORY_AMBIGUOUS');inventories.set(spec.path,{spec});
  }
  for(const dep of policy.dependencies){
    check(record(dep)&&relative(dep.path)&&inventories.has(dep.inventory),'PIN_POLICY_INVALID');
    check(!dependencies.has(dep.path),'PIN_DEPENDENCY_AMBIGUOUS');dependencies.add(dep.path);
  }
  // Verify exact inventory bytes before parsing, including historical version.
  for(const [path,entry] of inventories){
    let bytes;try{bytes=await readInventory(path,MAX_MANIFEST);}catch{check(false,'PIN_MANIFEST_UNAVAILABLE');}
    check(Buffer.isBuffer(bytes)&&bytes.length<=MAX_MANIFEST,'PIN_MANIFEST_INVALID');
    check(sha(bytes)===entry.spec.sha256,'PIN_MANIFEST_INTEGRITY');
    let manifest;try{manifest=parseJSON(bytes.toString('utf8'),MAX_MANIFEST);}catch{check(false,'PIN_MANIFEST_INVALID');}
    check(record(manifest)&&record(manifest.files),'PIN_MANIFEST_INVALID');
    if(entry.spec.kind==='changed')check(manifest.schema_version==='astra.n16-06a.evidence.v1','PIN_MANIFEST_VERSION');
    entry.files=manifest.files;
  }
  const selected=[];
  for(const dep of policy.dependencies){
    const occurrences=[...inventories.values()].filter(e=>Object.hasOwn(e.files,dep.path));
    check(occurrences.length>0,'PIN_MISSING');
    const values=occurrences.map(e=>{
      const value=e.files[dep.path];
      if(e.spec.kind==='changed')check(record(value)&&hash(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>=0,'PIN_RECORD_INVALID');
      else check(hash(value),'PIN_RECORD_INVALID');
      return e.spec.kind==='changed'?value.sha256:value;
    });
    check(new Set(values).size===1,'PIN_CONFLICT');
    check(occurrences.length===1,'PIN_RECORD_AMBIGUOUS');
    check(occurrences[0].spec.path===dep.inventory,'PIN_WRONG_INVENTORY');
    selected.push({dep,expected:values[0],entry:occurrences[0]});
  }
  const verified=[];
  for(const {dep,expected,entry} of selected){
    let bytes;try{bytes=await readDependency(dep.path);}catch{check(false,'PIN_DEPENDENCY_UNAVAILABLE');}
    check(Buffer.isBuffer(bytes),'PIN_DEPENDENCY_INVALID');
    check(sha(bytes)===expected,'PIN_DEPENDENCY_MISMATCH');
    if(entry.spec.kind==='changed')check(bytes.length===entry.files[dep.path].bytes,'PIN_DEPENDENCY_SIZE');
    verified.push({path:dep.path,inventory:dep.inventory,inventory_sha256:entry.spec.sha256,sha256:expected});
  }
  return freeze({version:policy.version,verified});
}
