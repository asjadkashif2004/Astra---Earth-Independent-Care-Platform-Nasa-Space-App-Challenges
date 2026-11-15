import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {trustedResearchCaller,loadResearchService,search,descriptor,CORPUS_SHA,inactiveAgentAdapter,check} from '../services/research-retrieval/research-service.mjs';
import {commitSearch,recoverSearch} from '../services/research-retrieval/research-receipts.mjs';
import {evaluateDevelopment,reviewReadiness} from '../services/research-retrieval/research-evaluation.mjs';
export async function main(args=process.argv.slice(2)){
 const [mode,...rest]=args,options={};check(['verify','query','commit','recover','evaluate-seen','readiness','adapter'].includes(mode),'INVALID_OPERATION');
 for(const arg of rest){const m=/^--([a-z_]+)=(.*)$/.exec(arg);check(m&&!Object.hasOwn(options,m[1])&&['query','policy','top_k','receipt'].includes(m[1]),'INVALID_ARGUMENT');options[m[1]]=m[2];}
 const allowed={verify:[],query:['query','policy','top_k'],commit:['query','policy','top_k'],recover:['receipt'],'evaluate-seen':[],readiness:[],adapter:[]};check(Object.keys(options).every(k=>allowed[mode].includes(k)),'INVALID_ARGUMENT');
 if(mode==='adapter')return inactiveAgentAdapter();if(mode==='readiness')return reviewReadiness();
 const token=trustedResearchCaller('researcher',{experimental:true}),context=await loadResearchService(token);
 if(mode==='verify')return {status:'VERIFIED',...descriptor(context,token),native_execution:'NOT_ADMITTED; current storage-policy approval required'};
 if(mode==='evaluate-seen')return evaluateDevelopment(context,token);
 const root=resolve('artifacts/n14-engineering-20261104/receipts');
 if(mode==='recover'){check(/^receipt-[a-f0-9]{64}$/.test(options.receipt??''),'INVALID_RECEIPT');return recoverSearch(root+'/'+options.receipt,context,token);}
 const request={schema_version:'astra.n14.search.v1',query:options.query,top_k:options.top_k===undefined?5:Number(options.top_k),policy:options.policy??'rich_lexical',corpus_sha256:CORPUS_SHA};
 return mode==='commit'?commitSearch(root,context,token,request):search(context,token,request);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().then(v=>console.log(JSON.stringify(v,null,2))).catch(e=>{console.error(JSON.stringify({status:'REJECTED',code:e.code??'ERROR',message:e.message}));process.exitCode=1;});
