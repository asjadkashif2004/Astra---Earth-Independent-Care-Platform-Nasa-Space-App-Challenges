import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const entries = [];
function add(path) {
  const full = resolve(root, path);
  if (statSync(full).isDirectory()) {
    for (const name of readdirSync(full).sort()) add(`${path}/${name}`);
  } else {
    const content = readFileSync(full);
    entries.push({ path: relative(root, full).replaceAll('\\','/'), bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
  }
}
for (const path of ['package.json','package-lock.json','packages','services','apps','knowledge','models','data/public-metadata','Dockerfile','compose.yaml']) add(path);
const manifest = { name:'ASTRA Command',version:'0.1.0',runtime:process.version,created_at:new Date().toISOString(),signed:false,third_party_runtime_packages:[],files:entries };
mkdirSync(resolve(root,'artifacts'),{recursive:true});
writeFileSync(resolve(root,'artifacts/source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Hashed ${entries.length} explicitly selected source files into artifacts/source-manifest.json. Runtime databases and credential directories excluded. Manifest is not cryptographically signed.`);
