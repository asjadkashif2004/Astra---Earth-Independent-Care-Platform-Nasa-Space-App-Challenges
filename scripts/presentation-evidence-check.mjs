// Read-only verification. Never starts a model, source worker or evaluation campaign.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {trustedResearchCaller,loadResearchService,search,descriptor,CORPUS_SHA,verifyAttribution,inactiveAgentAdapter} from '../services/research-retrieval/research-service.mjs';
import {makeClaimRequest} from '../services/research-retrieval/retrieval.mjs';
import {verify} from '../services/n12/contracts.mjs';
import {main as governedAnswer} from './n15-governed.mjs';
const root=resolve('artifacts/presentation-readiness-20261109'),at=performance.now();
const token=trustedResearchCaller('researcher'),context=await loadResearchService(token);
const result=await search(context,token,{schema_version:'astra.n14.search.v1',query:'light circadian sleep',top_k:3,policy:'rich_lexical',corpus_sha256:CORPUS_SHA});
assert.ok(result.candidates.length);const window=result.candidates[0].window,claim=makeClaimRequest(window);
const quoted=verifyAttribution(context,token,claim);assert.equal(quoted.decision,'ACCEPT');
const wrong=structuredClone(claim);wrong.evidence.citation.text_sha256='0'.repeat(64);assert.equal(verifyAttribution(context,token,wrong).decision,'REJECT');
const numeric=makeClaimRequest(window,{kind:'paraphrase',text:'What is the exact safe heart rate threshold for this astronaut?'});
const unsupported=verifyAttribution(context,token,numeric);assert.equal(unsupported.decision,'ABSTAIN');
const factual_answers=[];
for(const [question,expected] of [['What is the maximum permissible sound level in decibels?','ABSTAIN'],['What heart rate indicates heart disease?','ABSTAIN'],['Which treatment should this crew member take for a rapid heart rate?','REJECTED']]){
 const response=await governedAnswer(['answer','--generation=none','--question='+question]);assert.equal(response.status,expected);assert.equal(response.response_text,null);assert.equal(response.inference.native_commands,0);assert.equal(response.inference.generated_by_llm,false);factual_answers.push(response);
}
const path='artifacts/n12-engineering-20261104/browser-05/recovered-prediction.json',raw=readFileSync(path),saved=JSON.parse(raw);
verify(saved.result);verify(saved.result.forecast);assert.equal(saved.result.forecast.status,'AVAILABLE');assert.equal(saved.result.operational_promotion,false);
const agentPath='artifacts/n16-final-20261030/native/demo.html',agent=readFileSync(agentPath);assert.ok(agent.length>1000);
const report={status:'PASS',scope:'Offline attribution and governed abstention only; no new inference, calibration, evaluation or clinical validation',N13_N14:descriptor(context,token),query:result,quotation:quoted,wrong_citation:'REJECT',unsupported_numerical_question:unsupported,factual_answers,inactive_adapter:inactiveAgentAdapter(),N12:{path,sha256:createHash('sha256').update(raw).digest('hex'),result:saved.result,archival:true,fresh_execution:false},N16:{path:agentPath,sha256:createHash('sha256').update(agent).digest('hex'),archival:true,fresh_execution:false},duration_ms:performance.now()-at,sampled_memory:process.memoryUsage()};
writeFileSync(root+'/offline-evidence.json',JSON.stringify(report,null,2)+'\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
writeFileSync(root+'/research-backup.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ASTRA verified research backup</title><style>body{background:#080e1e;color:#e2ecff;font:18px/1.6 system-ui;max-width:1000px;margin:40px auto;padding:20px}a{color:#80caff}pre{white-space:pre-wrap;overflow-wrap:anywhere}section{border:1px solid #406080;padding:20px;margin:20px 0}</style><h1>ASTRA · verified offline research evidence</h1><p>Research demonstration. Original quote attribution is verified; factual relevance and independent scientific review remain unverified. No live model execution.</p><section><h2>Exact source quotation</h2><blockquote>'+esc(window.anchor.text)+'</blockquote><pre>'+esc(JSON.stringify(quoted.evidence_binding,null,2))+'</pre><p>Unsupported numerical question: ABSTAIN.</p></section><section><h2>Archived N12 synthetic forecast</h2><p>Previously executed result, verified from '+esc(path)+'. This is saved evidence, not a new forecast or live crew telemetry. No clinical validation or operational promotion.</p><pre>'+esc(JSON.stringify(saved.result.forecast,null,2))+'</pre><p>Artifact SHA-256: '+report.N12.sha256+'</p></section><p><a href="../n16-final-20261030/native/demo.html">Open separately recorded N16 synthetic coordinator demonstration</a></p></html>');
console.log(JSON.stringify({status:report.status,windows:result.candidates.length,quotation:quoted.decision,numeric:unsupported.decision,N12_archived_forecast:saved.result.forecast.status,duration_ms:report.duration_ms}));
