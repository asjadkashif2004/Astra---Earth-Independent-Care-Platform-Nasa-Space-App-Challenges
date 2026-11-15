// QA-only N15-07A post-processing. No CLI, native launcher or new questions.
// Original N15-07 driver/evidence remain frozen; a future authorized driver may
// use these functions. All execution and persistence are explicit dependencies.
import assert from 'node:assert/strict';
import { parseSelection,resolveSelection } from '../services/research-answer/selection.mjs';
import { validateConstrainedOutput } from '../services/research-answer/grammar.mjs';

export function argumentValue(argv,flag){
  assert.ok(Array.isArray(argv)&&argv.every(x=>typeof x==='string'),'Invalid command argument array');
  const index=argv.indexOf(flag);
  assert.ok(index>=0,'Required command argument missing: '+flag);
  assert.equal(argv.lastIndexOf(flag),index,'Duplicate command argument: '+flag);
  assert.ok(index+1<argv.length&&argv[index+1].length>0&&!argv[index+1].startsWith('--'),
    'Required command argument has no value: '+flag);
  return argv[index+1];
}

// Verbatim scoring function from the preserved N15-07 driver (export only).
export function score(c,raw,prepared,index,evidence){
  const base={case_id:c.id,expected:c.expected,review:'technical expectation; independent scientific/medical review pending',
    is_success:false,final_answer:{status:'ABSTAIN',quotations:[],supporting_citations:[]}};
  if(prepared?.status!=='READY')return {...base,outcome:'missing_evidence',reason:'case preparation unavailable'};
  let selection;
  try{selection=parseSelection(raw);}catch{return {...base,outcome:'parser_failure'};}
  if(selection.decision==='ABSTAIN')return {...base,selection,
    outcome:c.supported?'conservative_miss':'correct_abstention',is_success:!c.supported};
  try{validateConstrainedOutput(raw,c.grammar);}catch{return {...base,selection,outcome:'binding_failure',reason:'outside frozen retrieved-ID grammar'};}
  const binding=resolveSelection(raw,prepared,index,evidence);
  if(binding.status!=='VERIFIED_QUOTATION')return {...base,selection,outcome:'binding_failure',binding};
  const expected=c.supported&&selection.evidence_ids.every(id=>c.expected_ids.includes(id));
  if(!expected)return {...base,selection,outcome:c.supported?'relevance_error':'false_positive',
    literal_binding:{status:'ACCEPT',scope:'Quotation attribution only; not support for this question',records:binding.quotations},
    reason:'Valid citation does not answer the frozen question; do not publish it as verified support'};
  return {...base,selection,outcome:'supported_selection',is_success:true,final_answer:binding};
}

export function postprocessCase(c,plan,answer,records,inputs){
  const {nativeReport,native,command,actualRequest}=records;
  assert.equal(argumentValue(command.argv,'--grammar'),plan.grammar.text);
  assert.equal(actualRequest.prompt,c.prepared.prompt);
  assert.deepEqual(actualRequest.grammar,c.grammar);
  assert.ok(Array.isArray(nativeReport.accounting_failures),'Missing accounting qualification');
  if(nativeReport.status!=='PASS'||nativeReport.native_commands!==1||native.exit_code!==0||native.timeout_hit
    ||nativeReport.resources.owned_processes_remaining!==0||nativeReport.resources.observer_alive!==false
    ||nativeReport.accounting_failures.length){
    throw Error('Stop diagnostic on infrastructure/resource/isolation failure');
  }
  const outcome=score(c,native.stdout,c.prepared,inputs.index,inputs.evidence);
  return {diagnostic_task:'N15-07',legacy_protocol_label:answer.task,case_id:c.id,question:c.question,
    raw_model_output:native.stdout,source_evidence_directory:answer.evidence_directory,outcome,
    execution:answer.execution??{native_result:native,native_report:nativeReport},controller_elapsed_ms:answer.elapsed_ms};
}

export async function captureCase(c,plan,inputs,{execute,readExecution,persist}){
  let stage='execute',answer,records;
  try{
    answer=await execute(c);
    stage='persist_raw';await persist(c.id+'-raw-cli-answer.json',answer);
    stage='read_execution';records=await readExecution(answer);
    stage='postprocess';const result=postprocessCase(c,plan,answer,records,inputs);
    stage='persist_result';await persist(c.id+'-result.json',result);
    return result;
  }catch(error){
    // A failed outcome write must not return a successful diagnostic. Preserve
    // raw output before processing and explicitly surface failure-log errors.
    try{await persist(c.id+'-failure.json',{stage,error:error.message,answer,records});}
    catch(persistence){throw new AggregateError([error,persistence],'Diagnostic and failure persistence failed');}
    throw error;
  }
}
