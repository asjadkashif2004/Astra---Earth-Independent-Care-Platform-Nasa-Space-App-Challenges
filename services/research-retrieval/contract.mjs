import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256, stableJSON, fail, ORIGINAL_SHA } from '../corpus/sources.mjs';
import { validateCitation } from '../corpus/corpus.mjs';
import { BASE_CORPUS_SHA } from '../corpus/curation.mjs';
import { CURATED_SHA } from '../corpus/evidence-review.mjs';

export { sha256, stableJSON, fail };
export const POLICY = Object.freeze({version:'astra.minilm.research.v1',revision:'751bff37182d3f1213fa05d7196b954e230abad9',weight_sha256:'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1',dimensions:384,max_tokens:256,overlap:32,max_windows:256,max_index_bytes:5000000,packet_sha256:'aa93cf5062b03b87dbd57b96e756965fe90f9883854d456167462269c34ed6d4'});
export const SUPPORT_SHA = Object.freeze({'README.md':'63ea99bf681a2e9eda4f6a537d5ed8fda95d1677111656da37e9cfd080c3af02','config.json':'7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7','tokenizer.json':'da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0','tokenizer_config.json':'9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3','special_tokens_map.json':'b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3','vocab.txt':'07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3','onnx/model_quantized.onnx':POLICY.weight_sha256});
export const hashJSON = v => sha256(Buffer.from(stableJSON(v)));
export async function readBounded(path,limit){if((await stat(path)).size>limit)fail('SIZE_LIMIT','Local artifact exceeds limit.');return readFile(path);}
export function validateEvidence(corpus,packet){
  if(packet?.evidence?.length!==33||packet.evidence.reduce((n,u)=>n+u.spans.length,0)!==34)fail('EVIDENCE_MISMATCH','Only the frozen33units/34spans are eligible.');
  for(const u of packet.evidence){
    if(u.independent_human_review!=='pending'||u.claim_approval!=='pending_independent_review')fail('REVIEW_MISMATCH','No medical approval may be inferred.');
    for(const s of u.spans){
      const doc=corpus.documents.find(d=>d.metadata.id===s.document_id),page=doc?.pages.find(p=>p.page_index===s.page_index);
      if(!doc||s.original_sha256!==ORIGINAL_SHA[s.document_id]||doc.original_sha256!==s.original_sha256||!page||page.sha256!==s.page_sha256||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<0||s.end<=s.start||page.text.slice(s.start,s.end)!==s.text||sha256(Buffer.from(s.text))!==s.text_sha256||s.offset_unit!=='UTF-16 code units')fail('CITATION_MISMATCH','Exact original/page/span binding failed.');
      if(!s.base_citations?.length)fail('CITATION_MISMATCH','Original chunk anchors required.');
      for(const c of s.base_citations)validateCitation(corpus,c);
    }
  }
  return packet.evidence;
}
export async function loadEvidence(project){
  const root=join(project,'data/corpus');
  const corpusRaw=await readBounded(join(root,'n13-01/derived/corpus.json'),24000000),curated=await readBounded(join(root,'n13-02/derived/curation.json'),6000000),packetRaw=await readBounded(join(root,'n13-03/derived/packet.json'),2000000);
  if(sha256(corpusRaw)!==BASE_CORPUS_SHA||sha256(curated)!==CURATED_SHA||sha256(packetRaw)!==POLICY.packet_sha256)fail('SOURCE_MISMATCH','Frozen corpus/curation/review changed.');
  const corpus=JSON.parse(corpusRaw),packet=JSON.parse(packetRaw);
  for(const source of packet.sources){const raw=await readBounded(join(root,'n13-01/originals',source.original_file),10000000);if(sha256(raw)!==ORIGINAL_SHA[source.document_id])fail('ORIGINAL_MISMATCH','Preserved publication hash differs.');}
  // The runtime deliberately receives evidence, not evaluation answers or labels.
  return {evidence:validateEvidence(corpus,packet),sources:packet.sources,exclusions:packet.coverage.exclusions,packet_sha256:sha256(packetRaw)};
}
export function spanRecord(unit,span){return {id:'window-'+hashJSON({policy:POLICY.version,unit:unit.id,document:span.original_sha256,page:span.page_index,start:span.start,end:span.end,text:span.text_sha256}),unit_id:unit.id,key:unit.key,role:unit.role,claim_readiness:unit.claim_readiness,section_id:unit.section_id,source_context:unit.source_context,limits:unit.limits,source:unit.source_attribution,anchor:structuredClone(span),review:'pending_independent_review'};}
export function validateWindow(row,evidence){
  const u=evidence.find(u=>u.id===row.unit_id),s=u?.spans.find(s=>s.document_id===row.anchor?.document_id&&s.page_index===row.anchor?.page_index&&s.start===row.anchor?.start&&s.end===row.anchor?.end);
  if(!s||hashJSON(row)!==hashJSON(spanRecord(u,s)))fail('CITATION_MISMATCH','Index window changed or escaped eligible evidence.');
  return true;
}
// Minimal, bounded protobuf inspection. Never execute or deserialize model code.
export function protobufFields(bytes){
  let i=0;const fields=[];
  const integer=()=>{let n=0,m=1;for(let k=0;k<10;k++){if(i>=bytes.length)fail('INVALID_ONNX','Truncated varint.');const b=bytes[i++];n+=(b&127)*m;if(!(b&128)){if(!Number.isSafeInteger(n))fail('INVALID_ONNX','Unsafe varint.');return n;}m*=128;}fail('INVALID_ONNX','Oversized varint.');};
  while(i<bytes.length){const tag=integer(),wire=tag%8,id=Math.floor(tag/8);let value;
    if(!id)fail('INVALID_ONNX','Invalid field.');
    if(wire===0)value=integer();else if(wire===2){const n=integer();if(n>bytes.length-i)fail('INVALID_ONNX','Truncated field.');value=bytes.subarray(i,i+n);i+=n;}else if(wire===1||wire===5){const n=wire===1?8:4;if(i+n>bytes.length)fail('INVALID_ONNX','Truncated scalar.');i+=n;continue;}else fail('INVALID_ONNX','Unsupported wire type.');
    fields.push({id,wire,value});if(fields.length>100000)fail('INVALID_ONNX','Field count limit.');
  }return fields;
}
export function inspectGraph(bytes){
  const graph=protobufFields(bytes).find(f=>f.id===7)?.value;if(!Buffer.isBuffer(graph))fail('INVALID_ONNX','Missing graph.');
  const valueInfo=raw=>{const f=protobufFields(raw),name=f.find(f=>f.id===1)?.value?.toString(),type=f.find(f=>f.id===2)?.value,tensor=type&&protobufFields(type).find(f=>f.id===1)?.value;if(!name||!tensor)fail('INVALID_ONNX','Missing tensor type.');const t=protobufFields(tensor),dtype=t.find(f=>f.id===1)?.value,shape=t.find(f=>f.id===2)?.value;return {name,dtype,shape:shape?protobufFields(shape).filter(f=>f.id===1).map(f=>{const dim=protobufFields(f.value);return dim.find(f=>f.id===1)?.value??dim.find(f=>f.id===2)?.value?.toString()??null;}):[]};};
  const all=protobufFields(graph);return {inputs:all.filter(f=>f.id===11).map(f=>valueInfo(f.value)),outputs:all.filter(f=>f.id===12).map(f=>valueInfo(f.value))};
}
export function assertGraph(graph){
  if(graph.inputs.length!==3||graph.inputs.some(x=>!['input_ids','attention_mask','token_type_ids'].includes(x.name)||x.dtype!==7||x.shape.length!==2)||new Set(graph.inputs.map(x=>x.name)).size!==3||graph.outputs.length!==1||graph.outputs[0].name!=='last_hidden_state'||graph.outputs[0].dtype!==1||graph.outputs[0].shape.length!==3||graph.outputs[0].shape[2]!==384)fail('GRAPH_MISMATCH','Actual graph differs from approved int64 BERT/float32 hidden-state contract.');
  return graph;
}
