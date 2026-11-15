import { localRegistry,loadLocalSource,originalContext,readPinned,PROJECT,authorizeLocal } from './local-source.mjs';
import { sha256,isInstant,fail } from './validation.mjs';
import { validatePublisher } from './sleep-edf-source.mjs';
const decode=b=>JSON.parse(b.toString('utf8'));
const receiptPins={'nasa-hrp-sleep-2016':'d92a82c952986c0c78bb6176ca99b4e3fe7b0e9979a2807795bd16c9e97f19c6',
  'nasa-std-3001-v2-f':'8d32e97893666a6bc3a8229b341c6424c1f71aa100173a5c1cd5512cea9f4b19'};
const missing=[
  {id:'sleep-edfx-SC4001E0-PSG',title:'Sleep-EDF SC4001E0 PSG',publisher:'PhysioNet',locator:'https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001E0-PSG.edf',version:'1.0.0',reason:'Original transfer incomplete; existing partial cannot be promoted; fresh exact-source acquisition/recovery authority required.'},
  {id:'sleep-edfx-SC4001EC-Hypnogram',title:'Sleep-EDF SC4001EC Hypnogram',publisher:'PhysioNet',locator:'https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001EC-Hypnogram.edf',version:'1.0.0',reason:'Not requested after PSG failure; no accepted original annotation or paired card.'},
  {id:'ptt-ppg',title:'Pulse Transit Time PPG',publisher:'PhysioNet',locator:'https://physionet.org/content/pulse-transit-time-ppg/1.1.0/',version:'1.1.0',reason:'Exact file/use/size/group metadata review and separate acquisition approval required.'},
  {id:'radlab-BPD',title:'RadLab BPD/BioSentinel metadata',publisher:'NASA RadLab',locator:'https://visualization.osdr.nasa.gov/radlab/gui/knowledgebase/BPD',version:null,reason:'Retained oversized JSON and HTTP500 HTML reviews did not yield a complete approved original; no current availability claim.'},
  ...['575','656'].map(n=>({id:'OSD-'+n,title:'Named OSD-'+n+' study metadata',publisher:'NASA OSDR',locator:'https://osdr.nasa.gov/bio/repo/data/studies/OSD-'+n,version:null,reason:'Catalogue only; specific metadata, rights, release and payload not acquired. OSD-1 is not a substitute.'}))
];
export async function inventory(token,{signal}={}){
  authorizeLocal(token);const rows=[];
  for(const e of (await localRegistry(signal)).sources){
    const c=await loadLocalSource(e.id,token,{signal}),v=originalContext(c),a=v.approval;
    rows.push({category:'A_AUTHENTIC_ORIGINAL',id:e.id,module:'N07',title:a.publication.title,publisher:a.publication.publisher,
      version:a.publication.version,published_on:a.publication.published_on,retrieved_at:v.manifest.retrieval.completed_at,
      acquisition:v.manifest.retrieval.method,locator:a.resource.url,format:a.resource.media_type,
      bytes:a.resource.bytes,sha256:a.resource.sha256,rights:a.rights,privacy:a.scope.contains_patient_data?'PUBLIC_HISTORICAL_PATIENT_DERIVED':'PUBLIC_METADATA',
      synthetic:false,scope:a.scope.content_kind,limitations:a.scope.limitations,extraction:'Original adapter/hash/receipt verified offline',
      annotation:'Structural card annotations only; no medical support certification',review:'NOT_INDEPENDENTLY_SCIENTIFICALLY_APPROVED',downstream:'INACTIVE_RESEARCH_DESCRIPTOR_ONLY'});
  }
  const sourceCatalog=decode(await readPinned(PROJECT,'data/corpus/n13-01/sources.json','21f7a9aa8c1feec74ee8cc43041bf0aac8c3a8ff2cab80a57407f0b380474a6e',65536,signal));
  for(const d of sourceCatalog.documents){
    const bytes=await readPinned(PROJECT,'data/corpus/n13-01/originals/'+d.file,d.original_sha256,8*1024*1024,signal);
    const receipt=decode(await readPinned(PROJECT,'data/corpus/n13-01/originals/'+d.id+'.receipt.json',receiptPins[d.id],65536,signal));
    if(receipt.id!==d.id||receipt.url!==d.url||receipt.sha256!==d.original_sha256||receipt.bytes!==bytes.length||receipt.response_complete!==true
      ||receipt.http_status!==200||receipt.requests!==1||!isInstant(receipt.completed_at))fail('PROVENANCE_MISMATCH','Retained publication receipt does not bind the original.');
    rows.push({category:'A_AUTHENTIC_ORIGINAL',id:d.id,module:'N13_RETAINED_ONLY',title:d.title,publisher:d.publisher,version:d.version,
      published_on:d.published_on,retrieved_at:receipt.completed_at,acquisition:'HTTPS GET; retained receipt',bytes:bytes.length,sha256:sha256(bytes),locator:d.url,format:'application/pdf',rights:d.rights,
      privacy:'PUBLIC_RESEARCH_PUBLICATION',observed_at:null,extraction:'Existing N13 extraction preserved; no new PDF parsing',
      scope:'Existing local informational corpus approval only; no N07 corpus rebuild',review:'Existing independent scientific gates remain pending',downstream:'UNCHANGED_EXISTING_N13_BOUNDARIES'});
  }
  const units=decode(await readPinned(PROJECT,'data/corpus/n13-02/evidence-units.json','f82448aee3f3ecc64f6781fbc427e8a001f0f7d93fe3326e9de38af295aa3d9e',65536,signal));
  rows.push({category:'B_CURATED_DERIVATIVE',id:'n13-02-evidence-units',module:'N13_RETAINED_ONLY',count:units.units.length,
    sha256:'f82448aee3f3ecc64f6781fbc427e8a001f0f7d93fe3326e9de38af295aa3d9e',annotation:'Existing source-bound curation; no changes or new scientific review',review:'Pending independent review; citation validity is not relevance'});
  const publisher=await readPinned(PROJECT,'data/scientific/sleep-edf/source-review/SHA256SUMS.txt','1bc88e19e2e921f7851d7cf61e31ceb8f6d670211ca546a323e9db5a77525edf',65536,signal);
  const receipt=decode(await readPinned(PROJECT,'data/scientific/sleep-edf/source-review/review.json','438054c93a1a02611c14c3fd2ee394d83ed64266f7a75df35ce52e47c6a462fe',65536,signal));validatePublisher(publisher,receipt);
  rows.push({category:'A_SUPPORTING_PUBLISHER_METADATA',id:'sleep-edfx-SHA256SUMS',bytes:publisher.length,sha256:sha256(publisher),
    title:'Sleep-EDF publisher checksum list',publisher:'PhysioNet',version:'1.0.0',format:'text/plain',privacy:'PUBLIC_METADATA',
    retrieved_at:receipt.completed_at,locator:receipt.url,scope:'Expected file hashes only; not acquired physiological data',review:'Original metadata receipt verified; no signature/clinical clearance claim'});
  const prefix=await readPinned(PROJECT,'data/scientific/cache/.physionet-sleep-edfx-sc4001-1bc88e19e2e921f7851d7cf61e31ceb8f6d670211ca546a323e9db5a77525edf.partial/SC4001E0-PSG.edf',
    '2f55853bf13fb5fdf322fc6099bedfca3dff14a93b3eb1e5cf9cd276cae10fc9',2*1024*1024,signal);
  rows.push({category:'D_REJECTED_INCOMPLETE',id:'sleep-edfx-PSG-prefix',bytes:prefix.length,sha256:sha256(prefix),complete:false,
    expected_bytes:48338048,expected_full_sha256:'2b40a18adf76af69a42d6db1f30f31d26b369f6d27ca0050ef30147ef892b131',accepted:false});
  rows.push({category:'C_SYNTHETIC_ENGINEERING_FIXTURE',id:'astra.n07.split-fixtures.v1',scope:'Fictional grouped split controls only; no scientific subject or clinical labels'});
  for(const s of missing)rows.push({category:'E_UNAVAILABLE_OR_UNAUTHORIZED_ACQUISITION',...s,acquired:false,sha256:null,review:'SOURCE_ACQUISITION_PENDING'});
  return {schema_version:'astra.n07.inventory.v1',network_requests:0,rows,scientific_clearance:false,originals_preserved:true};
}
