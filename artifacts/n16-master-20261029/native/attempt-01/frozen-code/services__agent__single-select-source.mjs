// Fixed source paths only. Full-byte hashing, no SQLite parsing/connection or mutations.
import { openSync,closeSync,readFileSync,fstatSync,lstatSync,readdirSync,constants as F } from 'node:fs';
import { parseJSON,sha,stable,fail } from './read-contract.mjs';
import { SCHEMA,QUERIES } from './sqlite-fixture-contract.mjs';
import { SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA } from './designated-contract.mjs';
import { singleCheck,verifyBinding } from './single-select-contract.mjs';
export const DESIGNATED_ROOT='/var/tmp/astra-n16-designated-2v0ytq';
export function verifySchemaProvenance(bytes){
  singleCheck(sha(bytes)===SPEC_SHA,'SINGLE_SCHEMA_PROVENANCE');const spec=parseJSON(bytes.toString(),65536);
  singleCheck(spec.source_id===SOURCE_ID&&spec.schema_definition===SCHEMA&&spec.fixed_queries.observation===QUERIES.observation
    &&spec.historical_donor.files['source.sqlite'].sha256===SOURCE_SHA&&spec.historical_donor.files['source.sqlite'].bytes===SOURCE_BYTES
    &&spec.historical_donor.rows_sha256==='414e60b782176a34c297c1d55da519f1892332a9684e41a93be98fc6fd1d0e0e','SINGLE_SCHEMA_PROVENANCE');
  return sha(SCHEMA);
}
export function inspectSealedSource(path,specBytes,expectedInstance){
  singleCheck([DESIGNATED_ROOT+'/source','/fixture'].includes(path),'SINGLE_PATH_FORBIDDEN');
  const schema=verifySchemaProvenance(specBytes);let directory,file;
  try{
    directory=openSync(path,F.O_RDONLY|F.O_DIRECTORY|F.O_NOFOLLOW);const ds=fstatSync(directory,{bigint:true});
    singleCheck((ds.mode&0o777n)===0o500n,'SINGLE_SOURCE_MODE');
    const anchor='/proc/self/fd/'+directory,inventory=readdirSync(anchor).sort();
    singleCheck(stable(inventory)===stable(['source.sqlite']),'SINGLE_SIDECAR_OR_MEMBER');
    const s=lstatSync(anchor+'/source.sqlite',{bigint:true});
    singleCheck(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n&&s.size===BigInt(SOURCE_BYTES)&&(s.mode&0o777n)===0o400n,'SINGLE_SOURCE_MODE');
    file=openSync(anchor+'/source.sqlite',F.O_RDONLY|F.O_NOFOLLOW|F.O_NONBLOCK);const a=fstatSync(file,{bigint:true});
    singleCheck(a.dev===s.dev&&a.ino===s.ino,'SINGLE_SOURCE_REPLACED');const bytes=readFileSync(file),z=fstatSync(file,{bigint:true});
    singleCheck(z.ctimeNs===a.ctimeNs&&z.mtimeNs===a.mtimeNs&&z.size===a.size&&bytes.length===SOURCE_BYTES
      &&sha(bytes)===SOURCE_SHA,'SINGLE_CONTENT_HASH');
    singleCheck(bytes.subarray(0,16).toString()==='SQLite format 3\0'&&bytes[18]===1&&bytes[19]===1,'SINGLE_HEADER_UNVERIFIED');
    const binding={source_id:SOURCE_ID,source_sha256:sha(bytes),source_bytes:bytes.length,spec_sha256:sha(specBytes),schema_sha256:schema,
      source_identity:{directory:{dev:String(ds.dev),ino:String(ds.ino)},file:{dev:String(a.dev),ino:String(a.ino),birth_ns:String(a.birthtimeNs),change_ns:String(a.ctimeNs)}},
      inventory,file_mode:'0400',directory_mode:'0500',journal_mode:'closed_rollback'};
    return verifyBinding(binding,expectedInstance);
  }finally{if(file!==undefined)closeSync(file);if(directory!==undefined)closeSync(directory);}
}
