import { readFileSync } from 'node:fs';
import { ac20Template,validateAC20 } from '../packages/ac20-evidence.mjs';
if(process.argv.includes('--template'))console.log(JSON.stringify(ac20Template(),null,2));
else {
  const path=process.argv.find(s=>s.startsWith('--input='))?.slice(8);
  if(!path)throw new Error('Use --template or --input=owner-collected-evidence.json. No browser/model is started.');
  const result=validateAC20(JSON.parse(readFileSync(path,'utf8')));console.log(JSON.stringify(result,null,2));
  if(result.status==='NOT_VERIFIED')process.exitCode=2;
}
