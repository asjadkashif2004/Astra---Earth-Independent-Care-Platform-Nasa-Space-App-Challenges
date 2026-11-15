// Finite ASCII GBNF only: no recursion, regexes, schemas, external files or tools.
import { sha256 } from '../research-retrieval/contract.mjs';
import { parseSelection } from './selection.mjs';

export const GRAMMAR_SCHEMA='astra.n15-06.grammar.v1';
export function selectionGrammar(allowedIds){
  if(!Array.isArray(allowedIds)||allowedIds.length!==1||new Set(allowedIds).size!==allowedIds.length
    ||allowedIds.some(id=>typeof id!=='string'||!/^window-[0-9a-f]{64}$/.test(id)))
    throw Error('Grammar requires the one bounded canonical retrieved window ID');
  const choices=[...allowedIds.map(id=>JSON.stringify({decision:'SELECT',evidence_ids:[id]})),
    JSON.stringify({decision:'ABSTAIN',evidence_ids:[]})];
  const text='root ::= '+choices.map(value=>JSON.stringify(value)).join(' | ')+'\n';
  if(Buffer.byteLength(text)>2048)throw Error('Grammar byte bound');
  return {schema_version:GRAMMAR_SCHEMA,allowed_ids:[...allowedIds],text,sha256:sha256(Buffer.from(text))};
}
export function constrainSelection(prepared){
  if(prepared?.status!=='READY'||!Array.isArray(prepared.retrieval?.candidates))throw Error('Verified retrieval required');
  return selectionGrammar(prepared.retrieval.candidates.map(c=>c.window.id));
}
export function validateConstrainedOutput(raw,grammar){
  const expected=selectionGrammar(grammar?.allowed_ids);
  if(JSON.stringify(grammar)!==JSON.stringify(expected)){
    // Manifest serialization order is immaterial; values and exact key set are not.
    if(!grammar||Object.keys(grammar).sort().join()!==Object.keys(expected).sort().join()
      ||Object.keys(expected).some(k=>JSON.stringify(grammar[k])!==JSON.stringify(expected[k])))
      throw Error('Untrusted grammar manifest');
  }
  const selection=parseSelection(raw); // Existing strict parser, unchanged.
  const trailer=' [end of text]\n\n\n';
  const body=raw.endsWith(trailer)?raw.slice(0,-trailer.length):raw;
  const allowed=[...expected.allowed_ids.map(id=>JSON.stringify({decision:'SELECT',evidence_ids:[id]})),
    JSON.stringify({decision:'ABSTAIN',evidence_ids:[]})];
  if(!allowed.includes(body))throw Error('Completion outside frozen finite grammar');
  return {status:'PASS',grammar_sha256:expected.sha256,selection,scope:'structure and retrieved-ID membership only'};
}
