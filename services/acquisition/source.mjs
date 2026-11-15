import { fail,sha256,stableJSON,isHash,object,text,texts } from './validation.mjs';
import { OSDR_ID,OSDR_URL,validateOSDRApproval,validateOSDROriginal } from './osdr.mjs';
import { BIDMC_ID,BIDMC_URL,validateBIDMCApproval,validateBIDMCOriginal } from './bidmc.mjs';
import { SLEEP_URLS } from './sleep-edf-source.mjs';
export { AcquisitionError,fail,sha256,stableJSON,approvalHash,isHash,isInstant } from './validation.mjs';

export const MAX_SAMPLE_BYTES = 65_536;
export const MAX_REQUESTS = 4;
export const MAX_DEADLINE_MS = 15_000;
export const RESOURCE_ID = 'nasa-ntrs-20205008796';
const API = 'https://ntrs.nasa.gov/api/citations/20205008796';
const CANONICAL = 'https://ntrs.nasa.gov/citations/20205008796';
const TERMS = 'https://www.sti.nasa.gov/disclaimers/';
const HARVEST = 'https://www.sti.nasa.gov/harvesting-data-from-ntrs/';

export function assertAllowedURL(url, kind = 'resource') {
  if(kind==='resource'&&url===OSDR_URL)return url;
  if(kind==='resource'&&url===BIDMC_URL)return url;
  if(kind==='resource'&&SLEEP_URLS.includes(url))return url;
  const allowed = kind === 'resource' ? API : kind === 'canonical' ? CANONICAL : kind === 'terms' ? TERMS : kind === 'harvesting' ? HARVEST : null;
  if (typeof url !== 'string' || !allowed || url !== allowed) fail('SOURCE_NOT_ALLOWED', 'Only the reviewed exact HTTPS resource and reference URLs are permitted.');
  return url;
}
export function validateApproval(a) {
  if(a?.id===OSDR_ID)return validateOSDRApproval(a);
  if(a?.id===BIDMC_ID)return validateBIDMCApproval(a);
  object(a, ['schema_version','id','repository','publication','resource','rights','scope']);
  if (a.schema_version !== 'astra.acquisition-approval.v1' || a.id !== RESOURCE_ID || a.repository !== 'NASA STI Repository (NTRS)') fail('SOURCE_NOT_ALLOWED', 'Unreviewed source or approval version.');
  object(a.publication, ['title','authors','publisher','canonical_url','version','published_on','date_note']);
  for (const k of ['title','publisher','version','date_note']) text(a.publication[k]);
  texts(a.publication.authors); assertAllowedURL(a.publication.canonical_url, 'canonical');
  if (a.publication.published_on !== null) fail('INVALID_METADATA', 'This source does not establish a publication date.');
  object(a.resource, ['url','file','media_type','bytes','sha256']);
  if(a.resource.url!==API)fail('SOURCE_NOT_ALLOWED','NTRS approval cannot identify another source.');assertAllowedURL(a.resource.url);
  if (a.resource.file !== 'original.json' || a.resource.media_type !== 'application/json') fail('UNSUPPORTED_CONTENT', 'N07-01 accepts only the reviewed JSON record.');
  if (!Number.isSafeInteger(a.resource.bytes) || a.resource.bytes < 2 || a.resource.bytes > MAX_SAMPLE_BYTES || !isHash(a.resource.sha256)) fail('INVALID_METADATA', 'Supply a bounded exact size and SHA-256.');
  object(a.rights, ['statement','license_id','terms_url','harvesting_url','record_url','reviewed_on','attribution','restrictions']);
  if (a.rights.statement !== 'Work of the US Gov. Public Use Permitted.' || a.rights.license_id !== null || !/^\d{4}-\d\d-\d\d$/.test(a.rights.reviewed_on) || !Number.isFinite(Date.parse(a.rights.reviewed_on)) || new Date(a.rights.reviewed_on).toISOString().slice(0,10)!==a.rights.reviewed_on) fail('INVALID_METADATA', 'Missing or unsupported reviewed use conditions.');
  assertAllowedURL(a.rights.terms_url, 'terms'); assertAllowedURL(a.rights.harvesting_url, 'harvesting'); assertAllowedURL(a.rights.record_url, 'canonical');
  text(a.rights.attribution); texts(a.rights.restrictions);
  object(a.scope, ['content_kind','synthetic','contains_patient_data','clinical_use','corpus_ingestion','limitations']);
  if (a.scope.content_kind !== 'public_scientific_metadata' || ['synthetic','contains_patient_data','clinical_use','corpus_ingestion'].some(k => a.scope[k] !== false)) fail('INVALID_METADATA', 'This approval is limited to nonclinical public metadata acquisition.');
  texts(a.scope.limitations);
  return a;
}
export function validateOriginal(bytes, approval) {
  validateApproval(approval);
  if(approval.id===OSDR_ID)return validateOSDROriginal(bytes,approval);
  if(approval.id===BIDMC_ID)return validateBIDMCOriginal(bytes,approval);
  if (bytes.length !== approval.resource.bytes || sha256(bytes) !== approval.resource.sha256) fail('HASH_MISMATCH', 'Original bytes do not match the reviewed snapshot.');
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('UNSUPPORTED_CONTENT', 'The original must be valid UTF-8 JSON, not HTML or executable content.'); }
  if (!data || Array.isArray(data) || data.id !== 20205008796 || data.title !== approval.publication.title
    || data.distribution !== 'PUBLIC' || data.status !== 'CURATED' || data.onlyAbstract !== true
    || data.copyright?.determinationType !== 'GOV_PUBLIC_USE_PERMITTED' || data.copyright?.containsThirdPartyMaterial !== false
    || data.exportControl?.isExportControl !== 'NO') fail('SOURCE_METADATA_MISMATCH', 'Repository identity, public distribution or reviewed rights do not match.');
  const authors = data.authorAffiliations?.map(a => a.meta?.author?.name);
  if (stableJSON(authors) !== stableJSON(approval.publication.authors) || approval.publication.version !== `NTRS ${data.id}; modified ${data.modified}`) fail('SOURCE_METADATA_MISMATCH', 'Publication author/version metadata differs from the reviewed source.');
  return data;
}
