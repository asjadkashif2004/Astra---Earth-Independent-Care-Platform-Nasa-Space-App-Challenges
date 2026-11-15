# N16-01 — four-tool fixture-read and durable trace contract

2026-10-28. Research/demo only under activated [DE-N16-READONLY-01](DE_N16_READONLY_01.md). No running Health Agent, live DB/API, detector, scenario, model, knowledge or clinical integration. [Machine tool contract](N16_01_TOOL_SCHEMAS.json), [completion](N16_01_COMPLETION.md).

## Versioned inputs and trusted scope

Call schema `astra.n16.read-tools.v1`: exactly `schema_version`, `tool`, `args`. The registry has exactly `get_current_vitals`, `get_data_quality`, `get_personal_baseline`, `get_open_risk_events`. First three require canonical `crew_id` and1–3 unique metrics from heart_rate/respiratory_rate/spo2. Risk reads require crew_id and integer limit1–20. No additional fields, role/identity, source paths, views, SQL, URL, code or action flags. The bounded scanner rejects duplicate keys including escaped equivalents, prototype keys, malformed JSON and nonfinite numbers. Direct trusted-library inputs reject getters/cycles/nondata objects.

Opaque context is established separately after fixture preflight, binding actor/role/self scope, fixture/manifest hash, mission/run, onboard view, fixed mission as_of and policy. Arguments cannot override it. Existing `requirePermission(read,crew)` rules remain: astronaut self-only; viewer can read under existing policy; system_admin has no implicit read grant. CLI principal is a fixed **local synthetic Demo administrator**, not a user-supplied role or production identity. Trusted-library test contexts exercise other roles; no real login, OIDC or private-data authority is claimed.

CLI accepts only `--fixture=nominal|elevated|missing|stale --crew=CREW-01..06`, or `--recover=<canonical run UUID>`. It accepts no output/role/fixture-path/model/server option. Default trace root is the pre-established real project directory `artifacts/n16-01-executions`; absence/unsafe paths fail closed. No fallback directory is chosen. A fresh checkout must provision that exact ordinary directory before use; existing trace evidence is never deleted.

## Fixture edition and isolation

[Fixtures](../tests/fixtures/n16-readonly/manifest.json) use `astra.n16.synthetic-fixture.v1`; manifest edition n16-fixture-v1, pinned SHA `3b4e8aea6bafe5c0bec619266985407fb095bf302637cb177d2d14c35c5a7a13`. Four JSON files contain six fictional crew, three scalar metrics and authored reference baselines. They are **newly authored schema fixtures**, not observations from astronauts, an N09 run or an independently evaluated physiological simulation. No simulator/detector is executed to construct or read them.

The elevated profile's CREW-03 HR is103/min versus an authored baseline center68/min; no detector decision follows. Missing profile lacks that HR observation. Stale profile retains source timestamp10:59:40 at mission as_of11:00:00. Baselines explicitly say authored_fixture_reference, count/window null, not a learned personal/30-day archive.

No independently preserved N02 risk record is provided. The risk source records coverage unknown/origin unavailable and an empty record list. The tool actually reads that source and returns UNKNOWN; it neither fabricates an alert nor declares all-clear. A verified-alert fixture requires separately approved provenance/data work. This edition intentionally cannot promote supplied mock records into N02 events.

Loader permits only four named profiles and the exact five-file fixture directory inventory. Manifest and selected original bytes are checked before use; every worker reopens and rehashes the selected fixture. Inputs are opened O_RDONLY/O_NOFOLLOW, bounded to1,000,000bytes and checked for regular-file/stability/identity. Directory components reject symlinks; Linux `/proc/self/fd` is used only as a trusted kernel handle anchor, not a client path. Opened-directory capabilities prevent a parent-path replacement from substituting another directory. This implementation is Linux/WSL-specific; no Windows-native portability claim.

No Store/Engine/server/detector/model import or arbitrary network/query/tool interface exists. Trusted code and operator configuration remain part of the trust boundary; this is not an OS sandbox for arbitrary hostile JavaScript. Fixture JSON is always data. No dependencies/global configuration changes or acquisition occur.

## Dispatch, data and actual-read evidence

Authorization/schema rejection occurs before worker creation and has no CALL_STARTED. A validated request creates one worker running the fixed read handler, not dynamic code. It reads actual fixture bytes once, checks hash/structure and projects only scoped crew/metric fields. Parent independently checks result shape/size and canonical projection against the verified snapshot, source hash/byte count and worker read receipt before publication. The receipt is trusted-software instrumentation, not cryptographic proof of independent execution.

Execution status COMPLETED is separate from KNOWN/PARTIAL/UNKNOWN data. Invalid/stale/missing/artifact/suspect observations never produce eligible current values; original source quality/time/hash remain in provenance. Age uses fixed mission time and the existing scalar freshness formula `max(5000,3000/sampling_hz)`; host execution timestamps are separate. KNOWN means fixture data was available under this read contract, never detector eligibility, calibrated confidence, health, diagnosis or clinical truth. Nothing is imputed or held forward as newly measured.

Baseline tool returns authored reference metadata only. Risk tool returns existing source coverage/origin and UNKNOWN. No new alert, predictive risk, disease, treatment, acknowledgement, case, check-in, message or rule modification is possible through the four tools. Output retains fixture ID/hash, mission/scenario/run, source event IDs/record hashes, timestamps, units, quality/artifact/integrity/freshness and source/generator provenance. Missing metadata remains null/reasoned. Earth time is null with onboard_only reason; unsupported Earth context is rejected rather than using ship data silently.

## Trace durability and recovery

Only the separate owned trace tree is written. A random run UUID and assigned call IDs bind trusted scope, tool, validated arguments, actual start/end/duration, source/provenance, bounded outcome, result reference/hash and failures. Unvalidated input or credentials are never logged verbatim. RUN_STARTED → CALL_REQUESTED → CALL_VALIDATED → CALL_STARTED → CALL_COMPLETED/FAILED/TIMEOUT/CANCELLED, with CALL_DENIED before execution. No internal cognition or static workflow labels are treated as execution.

Each event is sequentially appended with sequence/previous hash/current hash, fsynced, then committed by an atomic fsynced checkpoint replacement plus directory fsync. Result JSON is fully written/fsynced and atomically renamed before its completion event. Filesystem errors are sticky and close the workflow; successful return requires mandatory trace commit. Entire trace plus result files has a conservative1MB bound with checkpoint/temp headroom; call results≤64KiB, arguments≤4KiB, at most4sequential attempts. No automatic retries.

Worker deadline≤1s; CLI execution deadline10s after fixture preflight. Timeout/cancellation terminates owned work, rejects late output and stops subsequent calls. Cleanup failure is explicitly FAILED, never completion; the CLI exits unsuccessfully rather than continuing. A genuine uninterruptible host-filesystem failure is not claimed to be solved by JavaScript timers. Ordinary clean worker exits, cancellation and failure handling are covered by focused controls.

Cold recovery opens the trace tree read-only, verifies sequence/hash/lifecycle, checkpoint and every committed result hash. Partial lines, uncommitted tails or unfinished calls remain INCOMPLETE; corrupted references/lifecycles reject. It never edits/repairs traces or replays handlers. Automatic resumption is outside this slice. Hash chains/checkpoints are consistency evidence, not signatures or protection against an actor replacing all records and the trusted head. Physical power-loss durability is not certified.

If fixture preflight fails before a trace is established, CLI returns sanitized STOPPED stderr and no handler is claimed. Mandatory trace failure can itself prevent durable failure logging; the command fails rather than claiming success. Tests/logging external to the failed writer preserve controlled failure evidence where possible.

## Verification boundary

48 focused tests, including real worker reads, all six crew IDs, elevated/missing/stale sources, role/self denial, malformed calls, hash/path/symlink protection, timeout/cancel/start/crash/cleanup mocks, persistence/checkpoint failures, quota, corruption and incomplete recovery. Actual approved trace-root fsync/atomic persistence is exercised separately with zero tool calls; it is labeled QA preflight, not a demo run. Fault injection and worker factories are trusted test seams, never serialized tool arguments or CLI options.

No LLM, live application or operational database is tested. The old Health Agent template remains unchanged and its steps are still not an actual tool trace. N15 support rule remains inactive. Full N16 prerequisites, scientific/release gates and broader resumable/selection/browser integration acceptance remain open.
