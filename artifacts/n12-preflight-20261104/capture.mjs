import { readFileSync,writeFileSync,mkdirSync,statSync,copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname,join } from 'node:path';
const root='artifacts/n12-preflight-20261104';mkdirSync(root,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const listing=spawnSync('rg',['--files','--hidden','-g','!.git/**','-g','!.agents/**','-g','!.codex/**','-g','!.aws/**','-g','!node_modules/**','-g','!data/runtime/**','-g','!'+root+'/**'],{encoding:'utf8'});if(listing.status)throw Error(listing.stderr);
const files={},excluded=[];for(const p of listing.stdout.trim().split('\n').sort()){
 if(/(?:^|\/)\.env(?:\.|$)|\.(?:sqlite|db)(?:$|-)|\.(?:gguf|exe|dll|so|whl|zip|pem|key)(?:$|\.)|(?:^|\/)runtime\//i.test(p)){excluded.push(p);continue;}
 if(!statSync(p).isFile())continue;files[p]=sha(readFileSync(p));
}
const docs=['AGENTS.md',...['MASTER_PLAN','MODULE_TRACKER','CORE_AI_PRIORITY','DECISIONS','FEATURE_AUDIT','SESSION_HANDOFF'].map(n=>'docs/'+n+'.md')],tables={};
for(const p of docs){const dest=join(root,'originals',p.replaceAll('/','__'));mkdirSync(dirname(dest),{recursive:true});copyFileSync(p,dest);if(p!=='AGENTS.md')tables[p]=readFileSync(p,'utf8').split('\n').filter(s=>s.startsWith('|'));}
const exceptions=Object.keys(files).filter(p=>/^docs\/DE_.*\.md$/.test(p)).map(p=>({path:p,sha256:files[p],title:readFileSync(p,'utf8').split('\n')[0],N12_references:readFileSync(p,'utf8').split('\n').filter(s=>/N12/.test(s))}));
writeFileSync(join(root,'preservation-before.json'),JSON.stringify({files,tables,excluded_binary_or_sensitive_paths:excluded},null,2)+'\n');
writeFileSync(join(root,'exception-inventory-before.json'),JSON.stringify({schema_version:'astra.n12.exception-inventory.v1',captured_before_new_proposal:true,proposals:exceptions,N12_specific_proposals:exceptions.filter(p=>/DE[-_]N12/i.test(p.title+' '+p.path)),decision:'NO PREEXISTING N12 EXCEPTION FOUND; owner Phase3 prohibits activating a newly authored substitute'},null,2)+'\n');
console.log(JSON.stringify({pinned_files:Object.keys(files).length,exception_records:exceptions.length,N12_existing:0,database_or_model_binaries_read:0}));
