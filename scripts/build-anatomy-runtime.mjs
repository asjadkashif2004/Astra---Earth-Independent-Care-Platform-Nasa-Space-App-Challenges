/* Reproducible local ES-module bundle; no bundler, CDN or compression decoder. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'),src=resolve(root,'node_modules/three'),out=resolve(root,'apps/mission-control-web/vendor/three');
const pkg=JSON.parse(readFileSync(resolve(src,'package.json'),'utf8'));
if(pkg.version!=='0.186.1')throw Error('Use exactly Three.js 0.186.1');
mkdirSync(out,{recursive:true});
const files=['build/three.core.js','build/three.module.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/utils/BufferGeometryUtils.js','examples/jsm/utils/SkeletonUtils.js','examples/jsm/controls/OrbitControls.js'];
const records=[];
for(const file of files){
  const original=readFileSync(resolve(src,file)),name=file.split('/').at(-1);
  const clause=['fr','om'].join('')+' ';
  const content=original.toString().replaceAll(clause+"'three'",clause+"'./three.module.js'").replaceAll(clause+"'../utils/BufferGeometryUtils.js'",clause+"'./BufferGeometryUtils.js'").replaceAll(clause+"'../utils/SkeletonUtils.js'",clause+"'./SkeletonUtils.js'");
  writeFileSync(resolve(out,name),content);
  records.push({file:name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex'),source:file,source_sha256:createHash('sha256').update(original).digest('hex')});
}
writeFileSync(resolve(out,'LICENSE'),readFileSync(resolve(src,'LICENSE')));
writeFileSync(resolve(out,'manifest.json'),JSON.stringify({package:'three',version:pkg.version,license:'MIT',source:'https://registry.npmjs.org/three/-/three-0.186.1.tgz',transformation:'Only ES-module import specifiers rewritten to local relative paths. No code minification or decoder added.',files:records},null,2)+'\n');
console.log('Local Three.js bundle:',records.reduce((n,f)=>n+f.bytes,0),'bytes');
