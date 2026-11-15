# N16-06A — containment diagnostics and batch admission contract

2026-10-29. **QA-only correction. No execution authority.** The owner's N16-06A approval permits helper/test changes and deterministic mocks only. N16-06's native/SQL authority remains exhausted. No new exception, resource renewal, source access or application integration is created. [Completion](N16_06A_COMPLETION.md); [diagnostic overlay pins](../artifacts/n16-06a-20261029/diagnostic-overlay.json).

## Diagnostic defect and additive correction

The frozen N16-04 worker reduces root/directory/database write errors to booleans. Directory writes accept EROFS; database O_RDWR accepts EROFS/ENOENT. Both source checks merge into SOURCE_NOT_READONLY; the outer catch emits a generic code/message, losing which operation failed and its original errno/syscall. N16-06 saved no other errno evidence. Its original failure cause remains unconfirmed; EACCES ordering is a hypothesis only.

Keep that complete worker unchanged. A new **designated-only** entry point calls the pure diagnostic policy and retains the byte-identical 3,145-byte SQL/constructor/authorizer/result block, SHA-256 `c724b37a94955a91943bb2b71914d6e6a65c73697720737a23127bf4c165081e`. Queries, parameters, source bytes, sealing and source/schema/row pins do not change. No worker entry point is imported or executed by this QA task; syntax parsing and source-text comparison are not runtime qualification.

## Independent read-only evidence and safe records

Before any write-denial probe could run, trusted worker IO must read `/proc/self/mountinfo` and its own mount namespace. Policy selects the most-specific mounts for `/`, `/fixture` and `/fixture/source.sqlite`. Each must have **per-mount `ro` without `rw`**; backing-filesystem super-options are not sufficient. A separately identified source bind, valid mount IDs and same namespace are required. Missing/malformed metadata, ambiguous overmounts, a writable nested file mount or inconsistent properties reject before probes. Namespace/mountinfo must still match after probing.

The structured diagnostic `astra.n16.containment-diagnostic.v1` records:

| Field | Contract |
|---|---|
| `source` | Exact logical ID and approved SHA only; no private host path. |
| `proof` | PROC_SELF_MOUNTINFO kind, namespace, mountinfo digest and selected mount IDs/options/internal mountpoints; no raw mountinfo or backing source names. Missing proof is explicit. |
| `stage` / `failed_subcheck` | Containment and first failed root/source-directory/source-file or mount-assertion/change stage. |
| `probes` | Operation category, expected denied-write property, observed denial/success, sanitized error code, numeric errno, bounded syscall category and acceptance. No exception message/path/token. |
| `denial_kind` | EROFS is a mount denial; EACCES/EPERM are permission denials. Neither alone proves read-only containment. |
| `qualified` / `hash` | Recomputed conjunction of positive mount evidence, matching code/numeric errno, all required denials and stable namespace; deterministic content digest. |

Missing/unexpected/mismatched errno, ENOENT, successful writes, changed namespace or invalid proof reject. EACCES/EPERM/EROFS can contribute only with independent positive mount evidence and matching actual errno; this is not a permission relaxation. Source file0400/directory0500 and filesystem mounts are unchanged. Injected IO is a trusted implementation/test boundary, never caller-supplied proof. Mock mount metadata is not evidence about the real sandbox.

## Persistence and acknowledgement barrier

Prospective worker emits the diagnostic and **waits before any DatabaseSync construction**. Parent validates schema/hash/source/proof/denials and requires a durable receipt for the exact diagnostic hash before sending `containment_verified`. A negative/corrupt/missing diagnostic activates the latch immediately; rejected records cannot be acknowledged. Persistence failure or a missing/non-durable/wrong-hash receipt cannot turn rejection into acceptance. Parent rechecks the batch immediately before acknowledgement, so a queued callback cannot release a stopped worker. Worker requires the matching hash, not merely an acknowledgement key.

Any future successful SQL receipt must bind the exact acknowledged diagnostic digest and mount namespace. Audit retains the sanitized diagnostic; trace context identifies the additive diagnostic code pins. Generic historical failure-trace integrity remains inspectable without inventing missing proof. No historical completion is promoted to containment-qualified status. The old source manifest is unchanged; the overlay is **QA_ONLY_NO_EXECUTION_APPROVAL**, not a new source edition or sequencing grant.

## Complete-batch first-failure latch

One private monotonic latch is shared by every caller in the owner-launched qualification process. Admission is serial. A permit counts an attempted startup immediately before spawn, with a synchronous latch check and no intervening await. First blocking worker/guard failure cancels queued admissions, aborts active work and retains the original failure/count. No reset exists; cleanup callbacks and late positive returns cannot reopen the batch. Failed diagnostic persistence leaves it closed and is reported.

Queued/unadmitted launches are `NOT_RUN`, not successful. The original executed test failure propagates; later registered tests call Node's skip mechanism and record their names as NOT_RUN. All original assertion lines are unchanged. Authorized simulated timeout/cancellation negatives can reject their own call without poisoning the batch, but guard failures cannot be declared expected. Test artifacts use a unique attempt directory rather than overwriting N16-06's saved results.

Drain includes active work and pending latch persistence; timeout or persistence failure reports failure, never clean completion. Actual worker cancellation/termination remains the existing owned-process path; this task tests cancellation/drain with mocks. Process-wide batch control is not a distributed admission service or protection against independently launched unauthorized processes. Future continuation must use one trusted launcher and explicitly approved scope.

## Remaining authority

Actual namespace/mount layout, denials and errno remain unobserved by N16-06A. No SQL/tool success, real cleanup timing, source rehash or runtime safety claim follows. One next separately approvable task: a **single isolated containment-only probe** against the retained sealed source, with fresh explicit resource/source-access approval, recording actual mount evidence and errno and stopping before any SQLite connection/query. Do not automatically run it or acknowledge release into SQL. Full N16 prerequisites and all independent scientific/medical/release gates remain open.
