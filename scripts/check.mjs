import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as vm from 'node:vm';

// Parse real module requests, not import-looking text inside test fixtures.
// Constructing an unlinked module never executes application code.
if (!vm.SourceTextModule) {
  const child = spawnSync(process.execPath, ['--experimental-vm-modules', fileURLToPath(import.meta.url)], {stdio:'inherit'});
  process.exit(child.status ?? 1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [];
function scan(path) { for (const name of readdirSync(path)) { if (name.startsWith('.') || ['node_modules', 'artifacts', 'runtime', '__pycache__'].includes(name)) continue; const p = resolve(path, name); if (statSync(p).isDirectory()) scan(p); else if (/\.(mjs|js)$/.test(name)) files.push(p); } }
scan(root);
let errors = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status) { errors++; process.stderr.write(result.stderr); }
  if (!result.status) {
    const requests = new vm.SourceTextModule(readFileSync(file, 'utf8'), {identifier:file}).dependencySpecifiers;
    for (const request of requests) {
      if (request.startsWith('.') && !existsSync(resolve(dirname(file), request))) {
        errors++; console.error(`Missing import: ${file} -> ${request}`);
      }
      if (request.startsWith('/shared/') && !existsSync(resolve(root, 'packages', request.slice(8)))) {
        errors++; console.error(`Missing shared browser import: ${request}`);
      }
    }
  }
}
for (const doc of ['AGENTS.md', 'docs/MASTER_PLAN.md', 'docs/ARCHITECTURE.md', 'docs/MODULE_TRACKER.md', 'docs/DECISIONS.md', 'docs/SETUP.md', 'docs/TESTING.md', 'docs/REQUIREMENTS.md']) {
  if (!existsSync(resolve(root, doc))) { errors++; console.error(`Missing documentation: ${doc}`); }
}
if (Number(process.versions.node.split('.')[0]) !== 24) { errors++; console.error('Use Node 24.21+ for the verified runtime.'); }
console.log(`${files.length} JavaScript files parsed and local imports checked; ${errors} errors. This is syntax/contract validation, not TypeScript compilation.`);
process.exitCode = errors ? 1 : 0;
