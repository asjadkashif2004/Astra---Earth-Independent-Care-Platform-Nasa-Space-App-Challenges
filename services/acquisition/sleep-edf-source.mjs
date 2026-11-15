import { fail,sha256,stableJSON,object,text } from './validation.mjs';

export const SLEEP_ID='physionet-sleep-edfx-sc4001';
export const SLEEP_BASE='https://physionet.org/files/sleep-edfx/1.0.0/';
export const CHECKSUM_URL=SLEEP_BASE+'SHA256SUMS.txt';
export const CHECKSUM_SHA='1bc88e19e2e921f7851d7cf61e31ceb8f6d670211ca546a323e9db5a77525edf';
export const CHECKSUM_BYTES=39799;
export const SLEEP_FILES=Object.freeze([
  Object.freeze({name:'SC4001E0-PSG.edf',url:SLEEP_BASE+'sleep-cassette/SC4001E0-PSG.edf',bytes:48338048,sha256:'2b40a18adf76af69a42d6db1f30f31d26b369f6d27ca0050ef30147ef892b131',deadline_ms:300000}),
  Object.freeze({name:'SC4001EC-Hypnogram.edf',url:SLEEP_BASE+'sleep-cassette/SC4001EC-Hypnogram.edf',bytes:4620,sha256:'a4cf67694ade1b52a0ddd06d5817fd45d2d3e8bac5302f640f3e9cfbbf12a996',deadline_ms:15000})
]);
export const SLEEP_URLS=Object.freeze([CHECKSUM_URL,...SLEEP_FILES.map(f=>f.url)]);
export const SLEEP_LIMITS=Object.freeze({total_payload_bytes:50000000,overall_network_ms:360000,small_resource_bytes:65536,small_resource_ms:15000,automatic_retries:0});
export function assertSleepURL(url){if(!SLEEP_URLS.includes(url))fail('SOURCE_NOT_ALLOWED','Only the two approved Sleep-EDF files and checksum metadata are allowed.');return url;}
export function validateSleepApproval(a){
  object(a,['schema_version','id','repository','canonical_url','doi','version','rights','files','limits','publisher']);
  if(a.schema_version!=='astra.sleep-edf-approval.v1'||a.id!==SLEEP_ID||a.repository!=='PhysioNet Sleep-EDF Database Expanded'||a.canonical_url!=='https://physionet.org/content/sleep-edfx/1.0.0/'||a.doi!=='10.13026/C2X676'||a.version!=='1.0.0')fail('SOURCE_NOT_ALLOWED','Unreviewed Sleep-EDF identity/version.');
  if(stableJSON(a.files)!==stableJSON(SLEEP_FILES)||stableJSON(a.limits)!==stableJSON(SLEEP_LIMITS))fail('INVALID_LIMIT','The exact files,publisher pins and approved source-specific limits cannot be changed.');
  object(a.publisher,['url','bytes','sha256']);
  if(a.publisher.url!==CHECKSUM_URL||a.publisher.bytes!==CHECKSUM_BYTES||a.publisher.sha256!==CHECKSUM_SHA)fail('HASH_MISMATCH','Publisher metadata must match the reviewed complete original.');
  object(a.rights,['license_id','license_url','reviewed_on','attribution','restrictions']);
  if(a.rights.license_id!=='ODC-By-1.0'||a.rights.license_url!=='https://physionet.org/content/sleep-edfx/view-license/1.0.0/'||a.rights.reviewed_on!=='2026-10-24')fail('RIGHTS_REVIEW_REQUIRED','Retain reviewed source-specific rights.');
  text(a.rights.attribution);if(!Array.isArray(a.rights.restrictions)||a.rights.restrictions.length<3)fail('RIGHTS_REVIEW_REQUIRED','Retain redistribution/privacy/nonclinical restrictions.');a.rights.restrictions.forEach(v=>text(v));return a;
}
export function validatePublisher(bytes,receipt){
  if(bytes.length!==CHECKSUM_BYTES||sha256(bytes)!==CHECKSUM_SHA)fail('HASH_MISMATCH','Publisher checksum original is incomplete or modified.');
  const lines=new TextDecoder('utf-8',{fatal:true}).decode(bytes).split(/\r?\n/);
  for(const f of SLEEP_FILES){const path='sleep-cassette/'+f.name,matches=lines.filter(line=>line.trim().split(/\s+/).slice(1).join(' ').replace(/^\*/,'')===path);if(matches.length!==1||matches[0].split(/\s+/)[0]!==f.sha256)fail('PUBLISHER_MISMATCH','Missing,ambiguous or changed exact publisher checksum.');}
  if(receipt?.url!==CHECKSUM_URL||receipt.status!==200||receipt.complete!==true||receipt.bytes!==CHECKSUM_BYTES||receipt.sha256!==CHECKSUM_SHA||receipt.requests!==1||receipt.deadline_ms!==15000||receipt.byte_limit!==65536||!Number.isFinite(receipt.elapsed_network_ms)||receipt.elapsed_network_ms<0||receipt.elapsed_network_ms>15000||!Number.isFinite(Date.parse(receipt.started_at))||!Number.isFinite(Date.parse(receipt.completed_at))||Date.parse(receipt.completed_at)<Date.parse(receipt.started_at))fail('PROVENANCE_MISMATCH','Publisher receipt must describe the complete bounded source review.');
  return {bytes:CHECKSUM_BYTES,network_ms:Math.ceil(receipt.elapsed_network_ms)};
}
