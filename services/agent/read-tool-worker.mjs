import { parentPort, workerData, threadId } from 'node:worker_threads';
import { readAt, validateFixture } from './read-context.mjs';
import { parseJSON, LIMITS, sha } from './read-contract.mjs';
import { projectFixture } from './read-tools.mjs';

try {
  const {dirFd, entry, profile, call} = workerData;
  const bytes = await readAt(dirFd, entry.file, LIMITS.fixture);
  if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256) throw Object.assign(Error('FIXTURE_HASH_MISMATCH'), {code:'FIXTURE_HASH_MISMATCH'});
  const fixture = validateFixture(parseJSON(bytes.toString(), LIMITS.fixture), profile);
  const result = projectFixture(fixture, call.tool, call.args, entry.sha256);
  parentPort.postMessage({result, receipt:{fixture_sha256:sha(bytes), bytes_read:bytes.length,
    actual_file_reads:1, thread_id:threadId}});
} catch (e) { parentPort.postMessage({error_code:e.code === 'FIXTURE_HASH_MISMATCH'?'FIXTURE_HASH_MISMATCH':'FIXTURE_READ_FAILED'}); process.exitCode = 1; }
finally { parentPort.close(); }
