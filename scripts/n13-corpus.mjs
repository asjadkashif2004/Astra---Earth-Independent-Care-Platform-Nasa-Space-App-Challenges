import { resolve,join } from 'node:path';
import { trustedCorpusCaller,loadCatalogContext,compileCatalog,lookup,inspectQuestion,assessAttribution,contextSources,citationText,json,check,LIMIT } from '../services/corpus/catalog.mjs';
import { publishCatalog,recoverCatalog } from '../services/corpus/catalog-bundle.mjs';
import { validateReviewRecord } from '../services/corpus/reviewer-records.mjs';
export function options(args){const [mode,...rest]=args,allowed={build:['output','parent'],verify:['output','bundle'],evidence:['output','bundle','unit','document','offset','limit'],source:['id'],question:['id'],assess:['json'],'review-packet':[],'review-check':['json']};check(Object.hasOwn(allowed,mode),'CLI_MODE');const o={mode};for(const arg of rest){check(/^--[a-z]+=[\s\S]+$/.test(arg),'CLI_OPTION');const at=arg.indexOf('='),key=arg.slice(2,at);check(allowed[mode].includes(key)&&!Object.hasOwn(o,key),'CLI_OPTION');o[key]=arg.slice(at+1);}if(['verify'].includes(mode))check(/^bundle-[a-f0-9]{64}$/.test(o.bundle),'CLI_BUNDLE');if(['source','question'].includes(mode))check(typeof o.id==='string'&&/^[a-zA-Z0-9_.:-]{1,160}$/.test(o.id),'CLI_ID');if(['assess','review-check'].includes(mode))check(typeof o.json==='string'&&Buffer.byteLength(o.json)<=65536,'CLI_JSON');return o;}
export async function run(args){
 const o=options(args),cap=trustedCorpusCaller('researcher'),root=resolve(o.output??'artifacts/n13-engineering-20261104/published');let context;if(o.mode==='verify'||o.mode==='evidence'&&o.bundle){const v=await recoverCatalog(join(root,o.bundle),cap);if(o.mode==='verify'){const{context,...receipt}=v;return receipt;}context=v.context;}else context=await loadCatalogContext(cap);
 if(o.mode==='build'){const{context:unused,...receipt}=await publishCatalog(root,context,cap,{parent:o.parent??null});return receipt;}
 if(o.mode==='evidence')return lookup(context,cap,{document_id:o.document??null,unit_id:o.unit??null,offset:Number(o.offset??0),limit:Number(o.limit??20)});
 if(o.mode==='source'){const source=contextSources(context,cap).documents.find(s=>s.id===o.id);check(source,'SOURCE_NOT_ALLOWED');return source;}
 if(o.mode==='question')return inspectQuestion(context,cap,o.id);
 if(o.mode==='assess')return assessAttribution(context,cap,json(Buffer.from(o.json)));
 const payload=compileCatalog(context,cap);if(o.mode==='review-packet')return json(payload['review-form.json']);if(o.mode==='review-check')return validateReviewRecord(json(Buffer.from(o.json)),{catalog:json(payload['catalog.json']),questions:json(payload['questions.json'])},cap);
}
if(import.meta.main){try{console.log(JSON.stringify(await run(process.argv.slice(2)),null,2));}catch(e){console.error(JSON.stringify({status:'BLOCKED',code:e.code??e.name,message:e.message}));process.exitCode=1;}}
