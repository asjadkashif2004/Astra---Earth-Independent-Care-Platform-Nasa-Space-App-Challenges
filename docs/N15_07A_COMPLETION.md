# N15-07A — diagnostic runner and observer QA repair

Date: **2026-10-27 Asia/Karachi**. **QA repair delivered; STOP.** Owner approved only observer/post-processing correction and focused non-generative tests under [DE-N14-N15-01](DE_N14_N15_01.md). No inference, model loading, acquired-runtime execution, network, downloads, installations or storage-policy renewal occurred. N15 remains **In Progress**, N16 **Not Started**; all other statuses and scientific/medical review gates remain unchanged.

## Confirmed defects and evidence limits

1. The preserved N15-07 [report](../artifacts/n15-07-20261027/supported/runtime/report.json) records `observer_alive:true` after the original five-second join, with no accounting exceptions. The [frozen observer](../artifacts/n15-04c-20261027/common-source.txt) checks halt only around a monolithic scan/checkpoint cycle. Its interval wait already uses `halt.wait()`. Full storage traversal holds the accounting lock without shutdown checks; lock acquisition is also uninterruptible by the stop event. Setting halt cannot stop this in-flight work. A deterministic barrier fixture reproduces that lifecycle defect without sleeping through a real scan or running native code. **The exact filesystem operation holding up the historical thread remains unknown**: the old run has no thread stack. This repair does not turn that hypothesis into a recovered observation.
2. The preserved [diagnostic driver](../artifacts/n15-07-20261027/control/diagnostic.mjs) calls `command.argv.index('--grammar')`. JavaScript arrays provide `indexOf`, not `index`. Simply changing the spelling would also permit a missing flag to resolve `-1 + 1` to element zero. The corrected QA path explicitly rejects missing, duplicate, non-string, empty or valueless arguments.

The N15-07 outcome is untouched: supported raw ABSTAIN/observed conservative miss, runtime qualification PARTIAL, unsupported NOT RUN. Its driver, plan, raw evidence and previous assessment were not edited, replayed or rescored. No prompt, evidence ordering, grammar, selection/scoring policy, model, runtime artifact, N14 ranking or claim contract changed.

## Exact code changes

| File | Change |
|---|---|
| [scripts/n15_observer_lifecycle.py](../scripts/n15_observer_lifecycle.py) | New QA lifecycle adapter: cooperative observer traversal/lock waits, explicit startup/completion events, bounded shutdown, owned-child reaping, durable cumulative failures and final-report handling. Import has no execution side effects. |
| [scripts/n15_research_runtime.py](../scripts/n15_research_runtime.py) | Install the adapter and count its source file; move setup inside the managed try/finally so observer startup failures receive cleanup/reporting. Model, grammar, native command, containment function and limits remain unchanged. |
| [scripts/n15-selection-diagnostic.mjs](../scripts/n15-selection-diagnostic.mjs) | New QA-only post-processing module using checked `indexOf`, existing scoring copied verbatim, explicit infrastructure qualification and raw/result/failure persistence. No CLI, native launcher or new questions; execution/persistence are injected dependencies. |
| [tests/n15_observer_lifecycle_test.py](../tests/n15_observer_lifecycle_test.py) | 20 non-native lifecycle/accounting controls with small trees, deterministic barriers and mocked children. |
| [tests/n15-selection-diagnostic.test.mjs](../tests/n15-selection-diagnostic.test.mjs) | 21 post-processing controls using independent fixtures and mocked execution; includes successful literal binding and actual processed-output assertions. |

The historical broken driver is deliberately preserved. The new module is its corrected, reusable post-processing path for a future separately authorized driver; importing it cannot resume a diagnostic. No new runtime dependency or application integration.

## Lifecycle and failure behavior

- Foreground gates and the final measurement retain the original complete storage scan. Only the observer's traversal becomes interruptible: the same roots, inode sizes, allocated blocks, symlinks and external files are counted. Fixture comparisons verify identical totals. Partial scans are discarded, never published as complete samples.
- The existing event wakes interval waits. Observer lock acquisition checks shutdown every 50 ms; traversal checks before each directory/entry/stat and external file. Startup has an explicit entered signal and bounded failure detection. No arbitrary startup delay is inserted.
- Shutdown closes the resource gate before waiting. Registered owned children are killed when necessary and reaped with bounded waits; failed children remain registered and reported. Existing private-PID/`--die-with-parent` native descendant containment remains unchanged. Tests use mocked owned wrappers; no live descendant qualification is claimed here.
- The observer join remains **five seconds**. Crash, failed startup, incomplete join, child cleanup failure, final-accounting failure or persistence failure cannot become PASS. If the observer remains alive, final accounting does not wait behind its possibly stuck scan lock, and final measurement is explicitly unavailable. The supervisor returns failure; its daemon observer cannot outlive the containing process. This is a failure path, not successful graceful cleanup.
- Last complete resource checkpoints retain file fsync, atomic replacement and directory fsync. Lifecycle/failure publication has its own serialization, independent of the scan lock. Concurrent failure receipts retain all sticky reasons. Failure to write a receipt is itself recorded in the sticky failures; final-report persistence errors propagate instead of returning success.
- New report fields include `observer_lifecycle.started/completed/activity/join_seconds/interrupted_scan_discarded`, `resources.final_measurement_verified`, and explicit unavailable final totals on failed accounting. `observer-shutdown.json` and cumulative `accounting-failure.json` preserve lifecycle/failure evidence. Existing resource ceilings, RSS precautions, native deadline, CPU-only/network denial and parser requirements are retained.

**Limit:** Python cannot forcibly interrupt a kernel filesystem call or fsync stuck inside a thread. Cooperative shutdown addresses the demonstrated missing checks; genuine stuck I/O remains a failed cleanup requiring supervisor termination. Focused mocks prove that this condition cannot be relabeled PASS. A future live run is still needed to establish shutdown behavior on the actual WSL filesystem; this task grants none.

## Focused verification

**114/114 tests PASS: 41 new + 73 existing focused controls.**

| Command | Result |
|---|---:|
| `python3 -m unittest discover -s tests -p 'n15_observer_lifecycle_test.py' -v` |20/20|
| `node --test --test-isolation=none tests/n15-selection-diagnostic.test.mjs tests/research-answer.test.mjs tests/research-grammar.test.mjs` |54/54|
| `python3 -m unittest discover -s tests -p 'n15_research_runtime_test.py' -v` |10/10|
| `python3 -m unittest discover -s tests -p 'n15_probe_accounting_test.py' -v` |30/30|

Python tests used `PYTHONDONTWRITEBYTECODE=1`. Two JavaScript syntax checks and three Python in-memory parse/compile checks also pass. No broad suite, browser or model/native command. [Complete QA output](../artifacts/n15-07a-20261027/qa-results.json).

Controls cover normal completion, interval/lock/traversal cancellation, startup failure, simulated nonresponsive observer/crash, owned-child kill/reap and failed cleanup, checkpoint/report interruptions and recovery, concurrent failure persistence, positive/negative selection, missing/fabricated IDs, malformed/injected output, binding failure, missing evidence, timeout/missing-model mocks, raw-before-scoring persistence and failure-log errors. A reject-everything or never-process-output implementation fails the positive controls. Scoring-function text is checked against the original driver; the clinical/scientific interpretation remains provisional.

Initial fixture runs exposed one new reporting issue (a later short receipt replaced the earlier startup reason) and three test assumptions about which independent fixture window ranked first. Cumulative failure receipts and the fixture assertions were corrected; [initial findings](../artifacts/n15-07a-20261027/initial-qa.json) are retained. Retrieval and scoring were not adjusted.

## Preservation and documentation

The pre-change baseline and final preservation record live under [artifacts/n15-07a-20261027](../artifacts/n15-07a-20261027). They distinguish the one intentionally modified existing QA runner from all protected evidence/production code. Original model/archive hashes and identities, N15-07 case/driver/grammar records, frozen containment/accounting sources, strict parser and N14 evidence/index/vector/contract artifacts are checked separately. No model/native payload copies are placed in ASTRA. Source/data/history size+mtime checks are not described as full-tree content hashing.

Documentation changes: this completion report, AGENTS.md, SESSION_HANDOFF.md, MODULE_TRACKER.md, MASTER_PLAN.md, FEATURE_AUDIT.md, DECISIONS.md (ADR-056), DE_N14_N15_01.md, N15_01_PLAN.md and CORE_AI_PRIORITY.md. Earlier task reports and all historical evidence remain intact. Only new QA evidence is added.

N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; N07/N09/N13/N14/N15 In Progress, inactive; N16 Not Started; AC-20 Open / Unverified. N07/N13/N14 independent-review, numerical-parity, security/distribution and full N15/N16 prerequisite obligations stay open. Positive live quotation and supported-versus-unsupported diagnostic gates remain open.

## One next approval

Separately authorize **one fresh execution of the same two frozen N15-07 cases**, at most two sequential requests and first-failure stop, using the corrected QA path and an additive runner-provenance overlay. Preserve the old plan/results; bind only the newly approved QA source hashes while keeping questions/prompts/evidence order/grammar/scoring/native settings unchanged. Fresh explicit resource/storage authority is required. A supported ABSTAIN must still count as a conservative miss and unsupported SELECT as a false positive. No tuning, forced selection, integration or N16 approval follows.

**STOP after N15-07A. No inference, replay, second-case continuation or storage-policy renewal is authorized by this repair.**
