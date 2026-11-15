import assert from 'node:assert/strict';
import { meanPool } from './encoder.mjs';

// Separately written BasicTokenizer/greedy WordPiece fixture oracle. It is NOT
// an independently installed Hugging Face tokenizer or an end-to-end golden run.
export function referenceWordPiece(text,vocab,specialTokens){
  const special=new Set(specialTokens),pieces=[];
  const escaped=specialTokens.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  for(const part of text.split(new RegExp('('+escaped+')','g'))){
    if(!part)continue;if(special.has(part)){pieces.push(part);continue;}
    let clean='';for(const c of part){const cp=c.codePointAt(0);if(cp===0||cp===0xfffd)continue;if(/[\t\n\r\p{Zs}]/u.test(c)){clean+=' ';continue;}if(/[\p{Cc}\p{Cf}]/u.test(c))continue;const cjk=cp>=0x4e00&&cp<=0x9fff||cp>=0x3400&&cp<=0x4dbf||cp>=0x20000&&cp<=0x2fa1f||cp>=0xf900&&cp<=0xfaff;clean+=cjk?' '+c+' ':c;}
    clean=clean.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu,'');let word='';const words=[];const emit=()=>{if(word){words.push(word);word='';}};
    for(const c of clean){const cp=c.codePointAt(0),punct=cp>=33&&cp<=47||cp>=58&&cp<=64||cp>=91&&cp<=96||cp>=123&&cp<=126||/\p{P}/u.test(c);if(/\s/u.test(c)){emit();}else if(punct){emit();words.push(c);}else word+=c;}emit();
    for(const word of words){const chars=[...word];if(chars.length>100){pieces.push('[UNK]');continue;}let start=0,out=[],failed=false;while(start<chars.length){let end=chars.length,found=null;while(end>start){const sub=(start?'##':'')+chars.slice(start,end).join('');if(Object.hasOwn(vocab,sub)){found=sub;break;}end--;}if(!found){failed=true;break;}out.push(found);start=end;}pieces.push(...(failed?['[UNK]']:out));}
  }
  return pieces.map(t=>vocab[t]??vocab['[UNK]']);
}
export async function numericalChecks(encoder){
  const vocab=Object.fromEntries(encoder.tokenizer.get_vocab(true)),special=['[PAD]','[UNK]','[CLS]','[SEP]','[MASK]'];
  const texts=['This is an example sentence','HELLO café!','Café cafe\u0301 naïve','你好，Earth!','repeat repeat repeat','[CLS] word [MASK] [SEP]','alpha\t beta\n\u0000gamma','unaffable microgravity'];
  const tokenization=[];
  for(const text of texts){const actual=encoder.encode(text),expected=[encoder.special.cls,...referenceWordPiece(text,vocab,special),encoder.special.sep];assert.deepEqual(actual.input_ids,expected);assert.ok(actual.attention_mask.every(x=>x===1));assert.ok(actual.token_type_ids.every(x=>x===0));tokenization.push({text,ids:actual.input_ids,masks:actual.attention_mask,types:actual.token_type_ids,status:'PASS'});}
  const boundary=encoder.encode('hello '.repeat(254));assert.equal(boundary.input_ids.length,256);assert.throws(()=>encoder.encode('hello '.repeat(255)),/256tokens/);assert.throws(()=>encoder.encode(' \n '),/Nonempty/);
  const pad=encoder.encode('hello',{padTo:8});assert.deepEqual(pad.attention_mask,[1,1,1,0,0,0,0,0]);assert.ok(pad.input_ids.slice(3).every(x=>x===encoder.special.pad));
  // Independent arithmetic fixture:([1,0]+[0,1])/2 normalized = [sqrt(.5),sqrt(.5)].
  const v=meanPool(Float32Array.of(1,0,0,1,90,90),[1,1,0],2);assert.ok(Math.abs(v[0]-Math.SQRT1_2)<1e-6&&Math.abs(v[1]-Math.SQRT1_2)<1e-6);
  const first=await encoder.embed(texts[0]),second=await encoder.embed(texts[0]);const max=Math.max(...first.vector.map((x,i)=>Math.abs(x-second.vector[i])));
  assert.ok(max<=1e-6);assert.ok(Math.abs(Math.hypot(...first.vector)-1)<1e-5);
  return {status:'PASS',tokenization,maximum_content_tokens:254,boundary_total:256,overlength_rejected:true,padding_mask:pad.attention_mask,pooling_arithmetic_fixture:'PASS',dimensions:first.vector.length,norm:Math.hypot(...first.vector),repeat_max_abs:max,vector_prefix:[...first.vector.slice(0,8)],token_reference:'Independent in-repository BERT/WordPiece fixture algorithm using publisher vocabulary; bounded fixture checks only',end_to_end_independent_parity:'UNVERIFIED: no independent same-quantized-graph reference vectors/runner acquired'};
}
