import { fail,sha256,stableJSON,validateSources,EXTRACTOR_VERSION,CHUNK_VERSION,PARSER } from './sources.mjs';

const hashText=text=>sha256(Buffer.from(text,'utf8'));
const id=(prefix,value)=>prefix+'-'+hashText(stableJSON(value));
const numericHeading=/^(\d{1,2}(?:\.\d{1,2}){0,5})\.?\s+([A-Za-z][^\n]{2,140})$/;
const romanHeading=/^([IVX]{1,5}|[A-H])\.\s+([A-Za-z][^\n]{2,140})$/;

/** Preserve exact extracted text. Heading and content-role guesses are explicitly reviewable, not semantics. */
export function headingCandidates(text){
  const headings=[];let offset=0;
  for(const line of text.split('\n')){
    const trimmed=line.trim(),m=numericHeading.exec(trimmed)??romanHeading.exec(trimmed);
    if(m&&!/\.{3,}|^Page \d|^NASA-STD-|\[V2|\bshall\b/.test(trimmed)&&!/^\d+\s*$/.test(trimmed))headings.push({offset:offset+line.indexOf(trimmed),label:m[1],title:trimmed,method:'line_pattern_candidate',review_status:'heuristic_unverified'});
    offset+=line.length+1;
  }
  return headings;
}
function boundaryKind(text,isStandard){
  const t=text.trimStart();
  if(/^\[?Rationale\s*:/i.test(t))return 'published_rationale';
  if(isStandard&&/^\[V2\s*\d+\]/.test(t))return /\bshall\b/i.test(t)?'published_requirement':'requirement_identifier_context';
  return null;
}
function role(text,isStandard,section){
  if(/REFERENCES|BIBLIOGRAPHY/i.test(section?.title??''))return 'references_not_primary_evidence';
  const hasRequirement=isStandard&&/\[V2\s*\d+\]/.test(text)&&/\bshall\b/i.test(text),hasRationale=/\bRationale\s*:/i.test(text);
  if(hasRequirement&&hasRationale)return 'mixed_review_required';
  if(hasRequirement)return 'published_requirement';
  if(hasRationale)return 'published_rationale';
  if(/\brecommend(?:ed|ation|ations)?\b|\bshould\b/i.test(text))return 'recommendation_or_discussion_review_required';
  return isStandard?'standard_background_or_continuation':'background_evidence';
}
export function validateExtraction(e,receipt){
  if(e?.schema_version!==EXTRACTOR_VERSION||e.original_sha256!==receipt.sha256||e.parser?.version!==PARSER.version||e.parser?.wheel_sha256!==PARSER.sha256||e.parser?.strict!==true||e.parser?.mode!=='plain'||!Array.isArray(e.pages)||!e.pages.length||e.pages.length>800)fail('EXTRACTION_MISMATCH','Extraction does not match its original and pinned tool.');
  const pages=[...e.pages].sort((a,b)=>a.page_index-b.page_index);let total=0;
  pages.forEach((p,i)=>{
    if(p.page_index!==i+1||typeof p.text!=='string'||p.text.length>200000||typeof p.pdf_page_label!=='string'||!['text_extracted','empty_or_image_only'].includes(p.status))fail('EXTRACTION_MISMATCH','Pages must be complete,consecutive and bounded.');
    total+=Buffer.byteLength(p.text);if(total>16000000)fail('EXTRACTION_MISMATCH','Extraction exceeds bound.');
  });
  return pages;
}
export function buildCorpus({sources,receipts,extractions,internalReview}){
  validateSources(sources);
  if(internalReview?.schema_version!=='astra.publication-internal-review.v1'||internalReview.documents?.length!==2)fail('RIGHTS_UNVERIFIED','Original-bound internal-notice and identity review required.');
  const documents=[];
  for(const spec of [...sources.documents].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
    const receipt=receipts[spec.id],extraction=extractions[spec.id],review=internalReview.documents.find(d=>d.id===spec.id);
    if(!receipt||receipt.id!==spec.id||receipt.url!==spec.url||receipt.bytes!==spec.bytes||receipt.sha256!==spec.original_sha256||receipt.response_complete!==true||receipt.requests!==1||receipt.redirects!==0)fail('PROVENANCE_MISMATCH','Missing or mismatched original receipt.');
    if(!review||review.original_sha256!==receipt.sha256||review.decision!=='permitted_local_informational_corpus'||review.identity_verified!==true||review.conflicting_notice_found!==false||typeof review.notes!=='string'||!review.notes.trim())fail('RIGHTS_UNVERIFIED','Review must match the actual original and disclose source notices.');
    const inputPages=validateExtraction(extraction,receipt),pages=[],sections=[],chunks=[];
    const standard=spec.id==='nasa-std-3001-v2-f';let current=null;
    for(const p of inputPages){
      const page={...p,sha256:hashText(p.text),offset_unit:'UTF-16 code units',printed_page_label:null,printed_label_status:'not_independently_verified'};
      // Retain all source text, including headers/footers. Do not silently infer printed numbering.
      pages.push(page);
      const headings=headingCandidates(p.text);
      const breaks=new Set([0,p.text.length,...headings.map(h=>h.offset)]);let lineOffset=0;
      for(const line of p.text.split('\n')){if(boundaryKind(line,standard))breaks.add(lineOffset);lineOffset+=line.length+1;}
      const points=[...breaks].sort((a,b)=>a-b);
      for(let k=0;k<points.length-1;k++){
        const heading=headings.find(h=>h.offset===points[k]);
        if(heading){current={...heading,page_index:p.page_index,id:id('section',[spec.id,receipt.sha256,p.page_index,heading.offset,heading.title])};sections.push(current);}
        let start=points[k],end=points[k+1];
        const inheritedKind=boundaryKind(p.text.slice(start,end),standard);
        while(start<end){
          let stop=Math.min(start+1400,end);
          if(stop<end){const cut=p.text.lastIndexOf('\n',stop);if(cut>start+700)stop=cut+1;else{const space=p.text.lastIndexOf(' ',stop);if(space>start+700)stop=space+1;}}
          if(stop<end&&/[\uD800-\uDBFF]/.test(p.text[stop-1]))stop--;
          const text=p.text.slice(start,stop);
          if(text.trim()){
            const section_id=current?.id??null,chunkHash=hashText(text);
            const chunk={id:id('chunk',[spec.id,receipt.sha256,p.page_index,start,stop,chunkHash,CHUNK_VERSION]),document_id:spec.id,original_sha256:receipt.sha256,page_index:p.page_index,pdf_page_label:p.pdf_page_label,page_sha256:page.sha256,section_id,section_title:current?.title??null,section_status:current?'heuristic_unverified':'unresolved',start,end:stop,offset_unit:'UTF-16 code units',text,sha256:chunkHash,content_kind:inheritedKind??role(text,standard,current),classification_status:'heuristic_requires_review'};
            chunks.push(chunk);
          }
          start=stop;
        }
      }
    }
    documents.push({metadata:structuredClone(spec),original_sha256:receipt.sha256,receipt_sha256:hashText(stableJSON(receipt)),extraction_sha256:hashText(stableJSON(extraction)),internal_review_sha256:hashText(stableJSON(review)),pages,sections,chunks,diagnostics:extraction.diagnostics,limitations:extraction.limitations});
  }
  return {schema_version:'astra.publication-corpus.v1',corpus_id:'n13-01-sleep-circadian-fatigue',sources_sha256:hashText(stableJSON(sources)),extractor:EXTRACTOR_VERSION,chunker:CHUNK_VERSION,parser:structuredClone(PARSER),scope:'Offline research corpus only; no retrieval,automated reasoning,medical advice or monitoring authority.',documents};
}
export function citationFor(document,chunk){
  return {document_id:document.metadata.id,original_sha256:document.original_sha256,source_url:document.metadata.url,page_index:chunk.page_index,page_sha256:chunk.page_sha256,section_id:chunk.section_id,chunk_id:chunk.id,start:chunk.start,end:chunk.end,chunk_sha256:chunk.sha256};
}
export function validateCitation(corpus,citation){
  const doc=corpus.documents.find(d=>d.metadata.id===citation?.document_id),chunk=doc?.chunks.find(c=>c.id===citation?.chunk_id);
  if(!doc||!chunk||stableJSON(citationFor(doc,chunk))!==stableJSON(citation))fail('INVALID_CITATION','Citation source,page,section,range and hashes must all match.');
  const page=doc.pages.find(p=>p.page_index===chunk.page_index);
  if(!page||hashText(page.text)!==chunk.page_sha256||page.text.slice(chunk.start,chunk.end)!==chunk.text||hashText(chunk.text)!==chunk.sha256)fail('INVALID_CITATION','Citation text does not match its original-bound page extraction.');
  return chunk;
}
export function validateReviewPack(corpus,pack){
  if(pack?.schema_version!=='astra.corpus-review.v1'||pack.review_status!=='draft_not_medically_approved'||!Array.isArray(pack.questions)||pack.questions.length<1)fail('INVALID_REVIEW','Review pack must disclose draft status.');
  const ids=new Set();let anchors=0;
  for(const q of pack.questions){
    if(!q.id||ids.has(q.id)||!q.question||!q.expected_boundary||!['supported_context','insufficient_support_abstain','unsafe_request_abstain'].includes(q.category)||!Array.isArray(q.citations)||q.category==='supported_context'&&!q.citations.length)fail('INVALID_REVIEW','Invalid question metadata/support boundaries.');
    ids.add(q.id);for(const c of q.citations){validateCitation(corpus,c);anchors++;}
  }
  for(const check of pack.spot_checks??[]){const chunk=validateCitation(corpus,check.citation);if(typeof check.exact_excerpt!=='string'||!check.exact_excerpt||!chunk.text.includes(check.exact_excerpt))fail('INVALID_CITATION','Spot-check excerpt not present at the cited original-bound location.');anchors++;}
  return {questions:ids.size,validated_anchors:anchors,medical_approval:false};
}
