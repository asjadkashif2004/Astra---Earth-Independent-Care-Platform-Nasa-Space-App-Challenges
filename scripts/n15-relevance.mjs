// Offline saved-output inspection only: no execution/runtime/prompt imports.
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { loadEvidence, readBounded, stableJSON } from '../services/research-retrieval/contract.mjs';
import { loadIndex } from '../services/research-retrieval/retrieval.mjs';
import { denyNetworking } from '../services/research-retrieval/offline.mjs';
import { assessSavedAnswer } from '../services/research-answer/relevance.mjs';

export function parseArgs(args) {
  if (args.length !== 2 || args.filter(a => a.startsWith('--request=')).length !== 1
    || args.filter(a => a.startsWith('--saved-answer=')).length !== 1) throw Error('Use --request=path.json --saved-answer=path.json; no inference is performed.');
  const value = prefix => { const s = args.find(a => a.startsWith(prefix)).slice(prefix.length); if (!s) throw Error('Empty input path'); return resolve(s); };
  return {request: value('--request='), saved: value('--saved-answer=')};
}
export async function main(args) {
  const paths = parseArgs(args), source = await loadEvidence(fileURLToPath(new URL('../', import.meta.url)));
  const {index} = await loadIndex(join(fileURLToPath(new URL('../', import.meta.url)), 'data/research/n14-01/index'), source.evidence);
  const request = JSON.parse(await readBounded(paths.request, 16000));
  const saved = JSON.parse(await readBounded(paths.saved, 50000));
  return assessSavedAnswer(request, saved, index, {evidence: source.evidence});
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const blocked = denyNetworking();
  try {
    const result = await main(process.argv.slice(2));
    if (blocked.length) throw Error('Offline network attempt');
    console.log(stableJSON(result));
    if (result.decision === 'REJECT') process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({decision: 'ABSTAIN', reason: 'saved_output_assessment_unavailable', error: error.message}));
    process.exitCode = 1;
  }
}
