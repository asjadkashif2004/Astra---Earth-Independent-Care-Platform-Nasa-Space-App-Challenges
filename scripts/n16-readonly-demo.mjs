// Non-generative local research CLI. No Store/Engine/server/detector/model imports.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createReadContext, closeReadContext, contextSummary, PROFILES } from '../services/agent/read-context.mjs';
import { ExecutionTrace, recoverTrace, RUN_PATTERN } from '../services/agent/execution-trace.mjs';
import { ReadDispatcher } from '../services/agent/read-tools.mjs';
import { TOOLS, METRIC_NAMES, VERSION, stable, fail } from '../services/agent/read-contract.mjs';

export const DEMO_PRINCIPAL = Object.freeze({id:'n16-local-demo-admin', role:'demo_admin', crew_id:null, demo:true});
export function parseArgs(args) {
  if (args.length === 1 && args[0].startsWith('--recover=')) {
    const id = args[0].slice(10); if (!RUN_PATTERN.test(id)) fail('INVALID_RECOVERY_ID'); return {recover:id};
  }
  if (args.length !== 2 || args.filter(x => x.startsWith('--fixture=')).length !== 1
    || args.filter(x => x.startsWith('--crew=')).length !== 1) fail('CLI_EXPECTS_FIXTURE_AND_CREW');
  const profile = args.find(x => x.startsWith('--fixture=')).slice(10);
  const crew = args.find(x => x.startsWith('--crew=')).slice(7);
  if (!PROFILES.includes(profile) || !/^CREW-0[1-6]$/.test(crew)) fail('INVALID_CLI_SELECTION');
  return {profile, crew};
}
export async function main(args) {
  const selection = parseArgs(args); if (selection.recover) return recoverTrace(selection.recover);
  const context = await createReadContext(selection.profile, DEMO_PRINCIPAL); let trace;
  const abort = new AbortController(), cancel = () => abort.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  const timer = setTimeout(cancel, 10000);
  try {
    trace = await ExecutionTrace.create(contextSummary(context));
    const dispatcher = new ReadDispatcher(context, trace), results = [];
    for (const tool of TOOLS) {
      const result = await dispatcher.dispatch({schema_version:VERSION, tool,
        args:tool === 'get_open_risk_events' ? {crew_id:selection.crew, limit:20}
          : {crew_id:selection.crew, metrics:[...METRIC_NAMES]}}, {signal:abort.signal});
      results.push(result); if (result.execution_status !== 'COMPLETED') break;
    }
    const status = results.length === 4 && results.every(r => r.execution_status === 'COMPLETED') ? 'COMPLETED' : 'STOPPED';
    await trace.append('RUN_ENDED', {status, calls:results.length});
    return {schema_version:'astra.n16.demo-run.v1', run_id:trace.id, status, fixture:selection.profile,
      synthetic:true, generated_by_llm:false, results};
  } finally {
    clearTimeout(timer); process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
    try { if (trace) await trace.close(); } finally { await closeReadContext(context); }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { const result = await main(process.argv.slice(2)); console.log(stable(result));
    if (!['COMPLETED','COMPLETE'].includes(result.status)) process.exitCode = 1;
  } catch (e) { console.error(JSON.stringify({status:'STOPPED', reason:e.code ?? 'PREFLIGHT_OR_TRACE_FAILED'})); process.exitCode = 1; }
}
