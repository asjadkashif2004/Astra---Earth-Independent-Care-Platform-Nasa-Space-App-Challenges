import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeSync } from 'node:fs';
import { POLICY,SUPPORT_SHA,sha256,fail,readBounded,inspectGraph,assertGraph } from './contract.mjs';

export function meanPool(data,mask,dimensions=384){
  if(!mask.length||data.length!==mask.length*dimensions||mask.some(v=>v!==0&&v!==1)||!data.every(Number.isFinite))fail('INVALID_VECTOR','Invalid hidden state or mask.');
  const count=mask.reduce((a,b)=>a+b,0);if(!count)fail('INVALID_VECTOR','All padding is not an embedding.');
  const mean=new Float64Array(dimensions);
  for(let t=0;t<mask.length;t++)if(mask[t])for(let d=0;d<dimensions;d++)mean[d]+=data[t*dimensions+d];
  for(let d=0;d<dimensions;d++)mean[d]/=count;
  const norm=Math.hypot(...mean);if(!Number.isFinite(norm)||norm===0)fail('INVALID_VECTOR','Nonfinite or zero norm.');
  const result=Float32Array.from(mean,v=>v/norm);validateVector(result,dimensions);return result;
}
export function validateVector(v,dimensions=384){if(v.length!==dimensions||!v.every(Number.isFinite)||Math.abs(Math.hypot(...v)-1)>1e-5)fail('INVALID_VECTOR','Expected finite normalized vector.');return true;}
export function armDeadline(ms,label){if(!Number.isInteger(ms)||ms<=0)fail('TIME_LIMIT','Invalid watchdog.');return setTimeout(()=>{writeSync(2,JSON.stringify({status:'BLOCKED',code:'TIME_LIMIT',phase:label})+'\n');process.exit(1);},ms);}
export function encodeInput(tokenizer,text,special,{padTo=null}={}){
  if(typeof text!=='string'||!text.trim()||text.length>12000)fail('INVALID_QUERY','Nonempty bounded text required.');
  const raw=tokenizer.encode(text,{add_special_tokens:true,return_token_type_ids:true});
  if(raw.ids.length>POLICY.max_tokens)fail('TOKEN_LIMIT','More than256tokens; no silent truncation or unverified offsets.');
  if(raw.ids.length<3||raw.ids[0]!==special.cls||raw.ids.at(-1)!==special.sep||raw.attention_mask.length!==raw.ids.length||raw.attention_mask.some(x=>x!==1)||raw.ids.some(x=>!Number.isInteger(x)||x<0||x>=special.vocab_size)||raw.token_type_ids&&(raw.token_type_ids.length!==raw.ids.length||raw.token_type_ids.some(x=>x!==0)))fail('TOKEN_CONTRACT','Single-segment CLS/content/SEP with valid IDs required.');
  const input_ids=[...raw.ids],attention_mask=[...raw.attention_mask],token_type_ids=raw.token_type_ids??raw.ids.map(()=>0);
  if(padTo!==null){if(!Number.isInteger(padTo)||padTo<input_ids.length||padTo>256)fail('TOKEN_LIMIT','Invalid padding length.');while(input_ids.length<padTo){input_ids.push(special.pad);attention_mask.push(0);token_type_ids.push(0);}}
  return {input_ids,attention_mask,token_type_ids,tokens:raw.tokens,content_length:raw.ids.length-2};
}
export async function loadEncoder({runtime,model}){
  const coldTimer=armDeadline(60000,'cold_load');
  try{
  const start=performance.now();
  for(const [name,version]of [['onnxruntime-node','1.21.0'],['onnxruntime-common','1.21.0'],['@huggingface/tokenizers','0.2.0']]){const m=JSON.parse(await readFile(join(runtime,name,'package.json'),'utf8'));if(m.version!==version)fail('RUNTIME_MISMATCH','Runtime pin changed.');}
  const weight=await readBounded(join(model,'onnx/model_quantized.onnx'),22972370);if(weight.length!==22972370||sha256(weight)!==POLICY.weight_sha256)fail('MODEL_MISMATCH','Exact publisher model SHA required.');
  const graph=assertGraph(inspectGraph(weight));
  const integrity=JSON.parse(await readBounded(join(model,'../model-integrity.json'),32000)),verified=new Map();
  if(integrity.revision!==POLICY.revision)fail('MODEL_MISMATCH','Model revision receipt missing.');
  for(const f of integrity.files){const relative=f.name.slice('model/'.length);if(f.name!=='model/'+relative||!Object.hasOwn(SUPPORT_SHA,relative))fail('MODEL_MISMATCH','Unexpected support path.');const b=relative.endsWith('.onnx')?weight:await readBounded(join(model,relative),1000000);if(sha256(b)!==SUPPORT_SHA[relative]||f.sha256!==SUPPORT_SHA[relative]||b.length!==f.bytes)fail('MODEL_MISMATCH','Support artifact integrity changed.');verified.set(relative,b);}
  const [config,tokenizerConfig,tokenizerData,specialMap]=['config.json','tokenizer_config.json','tokenizer.json','special_tokens_map.json'].map(p=>JSON.parse(verified.get(p)));
  if(integrity.files.length!==7||new Set(integrity.files.map(f=>f.name)).size!==7||config.hidden_size!==384||tokenizerData.model.type!=='WordPiece'||tokenizerData.normalizer.type!=='BertNormalizer'||tokenizerData.pre_tokenizer.type!=='BertPreTokenizer')fail('TOKEN_CONTRACT','Exact BERT/WordPiece model required.');
  const tokenModule=await import(pathToFileURL(join(runtime,'@huggingface/tokenizers/dist/tokenizers.mjs')).href);
  const ort=await import(pathToFileURL(join(runtime,'onnxruntime-node/dist/index.js')).href);
  const tokenizer=new tokenModule.Tokenizer({...tokenizerData,truncation:null,padding:null},tokenizerConfig);
  const special={cls:tokenizer.token_to_id(specialMap.cls_token),sep:tokenizer.token_to_id(specialMap.sep_token),pad:tokenizer.token_to_id(specialMap.pad_token),vocab_size:config.vocab_size};
  if(![special.cls,special.sep,special.pad].every(Number.isInteger)||special.pad!==config.pad_token_id)fail('TOKEN_CONTRACT','Special-token identity mismatch.');
  const session=await ort.InferenceSession.create(weight,{executionProviders:['cpu'],intraOpNumThreads:2,interOpNumThreads:1,executionMode:'sequential',graphOptimizationLevel:'all'});
  if([...session.inputNames].sort().join()!==graph.inputs.map(x=>x.name).sort().join()||session.outputNames.join()!==graph.outputs.map(x=>x.name).join())fail('GRAPH_MISMATCH','Session graph names differ.');
  const encode=(text,options)=>encodeInput(tokenizer,text,special,options);
  async function embed(text,options){
    const queryTimer=armDeadline(5000,'query_inference');
    try{
    const e=encode(text,options),dims=[1,e.input_ids.length],feeds={};
    for(const name of session.inputNames)feeds[name]=new ort.Tensor('int64',BigInt64Array.from(e[name],BigInt),dims);
    const started=performance.now(),out=await session.run(feeds),hidden=out.last_hidden_state;
    try{if(hidden.type!=='float32'||hidden.dims.join()!==[1,dims[1],384].join())fail('GRAPH_MISMATCH','Actual output tensor differs.');const vector=meanPool(hidden.data,e.attention_mask);return {vector,encoding:e,ms:performance.now()-started};}finally{for(const v of Object.values(out))v.dispose?.();for(const v of Object.values(feeds))v.dispose?.();}
    }finally{clearTimeout(queryTimer);}
  }
  const cold_ms=performance.now()-start;if(cold_ms>60000){await session.release();fail('TIME_LIMIT','Cold load exceeded60s.');}
  return {encode,embed,tokenizer,special,graph,cold_ms,release:()=>session.release(),details:{provider:'cpu',threads:2,execution:'sequential',token_limit:256,publisher_tokenizer_saved_truncation:tokenizerData.truncation,publisher_config_capacity:tokenizerConfig.model_max_length,explicit_policy:'No truncation; full reviewed spans only. Reject overlength queries.',offsets:'Original whole-span UTF-16 offsets retained; standalone tokenizer provides no token offsets.',independent_same_graph_parity:'unverified; no approved independent fixture/runtime'}};
  }finally{clearTimeout(coldTimer);}
}
