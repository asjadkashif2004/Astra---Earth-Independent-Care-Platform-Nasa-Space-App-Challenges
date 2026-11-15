import { fail, sha256, stableJSON, isHash, isInstant } from '../acquisition/validation.mjs';
export { fail, sha256, stableJSON, isHash, isInstant };

export const SOURCES = Object.freeze([
  Object.freeze({id:'nasa-hrp-sleep-2016',file:'20160003864.pdf',url:'https://ntrs.nasa.gov/api/citations/20160003864/downloads/20160003864.pdf',canonical_url:'https://ntrs.nasa.gov/citations/20160003864',bytes:967704,deadline_ms:60000}),
  Object.freeze({id:'nasa-std-3001-v2-f',file:'NASA-STD-3001 Vol 2 Rev F.pdf',url:'https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf',canonical_url:'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2',bytes:6753988,deadline_ms:120000})
]);
export const PARSER = Object.freeze({version:'6.21.2',file:'pypdf-6.21.2-py3-none-any.whl',bytes:407766,sha256:'1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084',license:'BSD-3-Clause'});
// Review-computed pins of the completed originals,not independently published checksums.
export const ORIGINAL_SHA=Object.freeze({'nasa-hrp-sleep-2016':'252d4993a040ab8b989664b1da7a3143a5fd8169fac65b67f1f43231250ef1f5','nasa-std-3001-v2-f':'a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f'});
export const EXTRACTOR_VERSION='astra.pdf-text.v1';
export const CHUNK_VERSION='astra.page-section-chunks.v1';
export const MAX_EXTRACT_BYTES=24000000;
export function sourceByID(id){const s=SOURCES.find(s=>s.id===id);if(!s)fail('SOURCE_NOT_ALLOWED','Only the two explicitly approved NASA publications are allowed.');return s;}
export function assertPublicationURL(url){const s=SOURCES.find(s=>s.url===url);if(!s)fail('SOURCE_NOT_ALLOWED','Exact official URL required; no query, redirect or alternate source.');return s;}
const required=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>4000||/[\u0000-\u001f]/.test(v))fail('INVALID_METADATA',`Missing or invalid ${label}.`);};
export function validateSources(manifest){
  if(manifest?.schema_version!=='astra.publication-sources.v1'||manifest.documents?.length!==2)fail('INVALID_METADATA','Exactly two publication descriptions are required.');
  const seen=new Set();
  for(const d of manifest.documents){
    const s=sourceByID(d.id);if(seen.has(d.id))fail('SOURCE_MISMATCH','Duplicate publication.');seen.add(d.id);
    for(const k of ['url','file','canonical_url','bytes','deadline_ms'])if(d[k]!==s[k])fail('SOURCE_MISMATCH','Publication identity/limits differ from the approved source.');
    if(d.original_sha256!==ORIGINAL_SHA[d.id])fail('HASH_MISMATCH','Complete-original review pin required.');
    for(const k of ['title','publisher','version','publication_date_note','authority'])required(d[k],k);
    if(!Array.isArray(d.authors)||!d.authors.length||d.authors.some(a=>typeof a!=='string'||!a.trim()))fail('INVALID_METADATA','Authors/corporate author required.');
    if(d.rights?.license_id!==null||d.rights?.review_status!=='reviewed_for_local_corpus')fail('RIGHTS_UNVERIFIED','Source-specific reviewed rights required; no inferred CC license.');
    for(const k of ['basis','attribution','terms_url','restrictions'])required(d.rights[k],k);
    if(!Array.isArray(d.review_evidence)||!d.review_evidence.length||d.review_evidence.some(e=>!isHash(e.sha256)||typeof e.file!=='string'||!/^[-a-z0-9.]+$/.test(e.file)))fail('INVALID_METADATA','Pinned official review evidence required.');
    if(d.id===SOURCES[1].id&&(d.version!=='F'||d.published_on!=='2026-07-14'))fail('SOURCE_MISMATCH','Use the verified current Revision F, approved 2026-07-14.');
  }
  return manifest;
}
export function validatePDF(bytes,spec){
  sourceByID(spec.id);
  if(bytes.length!==spec.bytes||bytes.subarray(0,5).toString('ascii')!=='%PDF-'||!bytes.subarray(-1024).toString('latin1').includes('%%EOF'))fail('INVALID_PDF','Require a complete original PDF of the exact reviewed size.');
  return sha256(bytes);
}
