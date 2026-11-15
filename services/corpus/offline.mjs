import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { read, directory, writeNew } from '../acquisition/cache.mjs';
import { verifyOriginal } from './acquire.mjs';
import { buildCorpus,validateCitation,validateReviewPack,citationFor } from './corpus.mjs';
import { SOURCES,PARSER,MAX_EXTRACT_BYTES,sha256,stableJSON,fail } from './sources.mjs';
export { validateReviewPack,validateCitation,citationFor };
const execute=promisify(execFile);
const json=async(path,max=65536)=>JSON.parse((await read(path,max)).toString('utf8'));
export async function rebuildOffline({project,root,sources}){
  const wheel=await read(join(project,'packages/corpus-tools',PARSER.file),PARSER.bytes);
  if(wheel.length!==PARSER.bytes||sha256(wheel)!==PARSER.sha256)fail('PARSER_MISMATCH','Pinned offline parser missing or changed.');
  const receipts={},extractions={};
  for(const spec of SOURCES){
    const receipt=await json(join(root,'originals',spec.id+'.receipt.json'));
    await verifyOriginal(join(root,'originals'),spec,receipt);receipts[spec.id]=receipt;
    // No shell or PDF-directed arguments. -I isolates Python; Unix extractor enforces memory/CPU limits.
    const {stdout}=await execute('python3',['-I',join(project,'scripts/extract-publication.py'),join(root,'originals',spec.file)],{timeout:120000,maxBuffer:MAX_EXTRACT_BYTES,encoding:'utf8'});
    extractions[spec.id]=JSON.parse(stdout);
  }
  const internalReview=await json(join(root,'internal-review.json'));
  const corpus=buildCorpus({sources,receipts,extractions,internalReview});
  return {corpus,receipts,extractions};
}
export function corpusSummary(corpus){return {documents:corpus.documents.length,pages:corpus.documents.reduce((n,d)=>n+d.pages.length,0),sections:corpus.documents.reduce((n,d)=>n+d.sections.length,0),chunks:corpus.documents.reduce((n,d)=>n+d.chunks.length,0),empty_pages:corpus.documents.flatMap(d=>d.pages.filter(p=>p.status!=='text_extracted').map(p=>({id:d.metadata.id,page_index:p.page_index,status:p.status})))};}
function inventoryFor(corpus,bytes){return {schema_version:'astra.corpus-inventory.v1',corpus_sha256:sha256(bytes),...corpusSummary(corpus),originals:corpus.documents.map(d=>({id:d.metadata.id,sha256:d.original_sha256,bytes:d.metadata.bytes})),parser:PARSER};}
export async function writeCorpus(output,{corpus,extractions}){
  const dir=await directory(output),bytes=Buffer.from(stableJSON(corpus)+'\n');
  if(bytes.length>MAX_EXTRACT_BYTES)fail('CORPUS_LIMIT','Derived corpus exceeds its24MB bound.');
  // Exclusive output files: a rebuild cannot overwrite earlier evidence.
  for(const [id,value]of Object.entries(extractions))await writeNew(join(dir,id+'.pages.json'),Buffer.from(stableJSON(value)+'\n'));
  await writeNew(join(dir,'corpus.json'),bytes);
  const inventory=inventoryFor(corpus,bytes);
  await writeNew(join(dir,'inventory.json'),Buffer.from(stableJSON(inventory)+'\n'));return inventory;
}
export async function verifyCorpusFiles({project,root,sources,derived}){
  const rebuilt=await rebuildOffline({project,root,sources});
  const existing=await read(join(derived,'corpus.json'),MAX_EXTRACT_BYTES),expected=Buffer.from(stableJSON(rebuilt.corpus)+'\n');
  if(!existing.equals(expected))fail('CORPUS_MISMATCH','Offline rebuilt corpus differs;do not trust edited chunks/anchors.');
  for(const [id,value]of Object.entries(rebuilt.extractions))if(!(await read(join(derived,id+'.pages.json'),MAX_EXTRACT_BYTES)).equals(Buffer.from(stableJSON(value)+'\n')))fail('EXTRACTION_MISMATCH','Saved extraction differs from original rebuild.');
  const inventory=await json(join(derived,'inventory.json'));
  if(stableJSON(inventory)!==stableJSON(inventoryFor(rebuilt.corpus,existing)))fail('CORPUS_MISMATCH','Inventory provenance/counts/limits mismatch.');
  let anchors=0;for(const d of rebuilt.corpus.documents)for(const c of d.chunks){validateCitation(rebuilt.corpus,citationFor(d,c));anchors++;}
  return {corpus:rebuilt.corpus,summary:{status:'PASS',...corpusSummary(rebuilt.corpus),validated_chunk_anchors:anchors,corpus_sha256:sha256(existing),network_requests:0}};
}
