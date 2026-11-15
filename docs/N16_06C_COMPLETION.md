# N16-06C — dependency-pin resolver QA correction

2026-10-29. **QA-only PASS; STOP.** No full containment preflight, worker/probe startup, database-byte read, SQLite connection, SQL, source metadata inspection, mount/permission change, network request or model execution occurred. N16-06 remains blocked pending separately authorized containment evidence. N16-06B startup/resource authority remains expired.

## Confirmed root cause

[N16-06B completion](N16_06B_COMPLETION.md) and [saved outcome](../artifacts/n16-06b-20261029/outcome.json) establish an inventory-selection error, not dependency drift. The runner looked up all four dependencies in N16-06A's changed-files manifest. The first missing entry, `services/agent/read-contract.mjs`, triggered `QUALIFIED_HELPER_CHANGED`; `packages/contracts.mjs` was also absent but not reached. Both actual hashes match the authoritative preservation inventory. The two changed diagnostic/batch helpers were correctly listed in the changed-files manifest.

## Exact correction and integrity policy

Only one pre-existing source file changed: [n16-containment-probe.mjs](../scripts/n16-containment-probe.mjs). New source/test files are [dependency-pins.mjs](../services/agent/dependency-pins.mjs) and [n16-dependency-pins.test.mjs](../tests/n16-dependency-pins.test.mjs). The [exact runner diff](../artifacts/n16-06c-20261029/runner-change.diff.txt) is preserved with its [original](../artifacts/n16-06c-20261029/runner-original.mjs.txt).

The new helper is a pure, injected-reader verifier. The runner supplies anchored, no-follow metadata reads and fixed project-code reads; no caller can supply a policy, path, digest or fallback inventory. There is no filesystem, worker or SQLite entry point in the helper.

| Dependencies | Explicit authoritative inventory | Exact inventory SHA-256 |
|---|---|---|
| `containment-diagnostics.mjs`, `qualification-batch.mjs` | [N16-06A changed-files manifest](../artifacts/n16-06a-20261029/evidence-manifest.json) | `d4751ad2f6449b8e5f3edecbd0a12bf02768ce151b7c7eb2094e25ff0c56de6b` |
| `services/agent/read-contract.mjs`, `packages/contracts.mjs` | [N16-06A preservation inventory](../artifacts/n16-06a-20261029/preservation-before.json) | `70aaed7fbf48e61dacb5cb1dbf94d29cb8d943132e3dd674cf3bd10188d17385` |

Both complete inventory byte digests are verified before bounded, duplicate-key-rejecting JSON parsing. The changed-files manifest independently contains the same preservation-inventory digest. Records must exist exactly once across the two inventories, in their explicit designated inventory. Conflicting hashes, even duplicate equal hashes, missing records/manifests, malformed records, wrong schema/version, stale inventory bytes, incorrect source assignments and changed dependency bytes fail closed. Each actual dependency is fully SHA-256 checked; changed-file byte counts are checked too. No alternate hash source is substituted. Historical inventories are intentionally pinned editions: “stale” means a different inventory edition or a pin inconsistent with current code, not age alone. No wall-clock expiry or independently signed attestation is invented.

The runner's self-hash necessarily changes with this repair. The new [corrected code plan](../artifacts/n16-06c-20261029/corrected-code-plan.json) pins eight code files, including the new helper, and binds the original N16-06B plan's digest. The runner selects this explicit additive plan and includes the new helper/plan in storage accounting. The original seven-file B plan and every historical B artifact remain unchanged. This is a static code freeze, **not execution/resource authority**. All other runner text, including source/containment checks, startup logic, limits, mounts, cleanup and SQL-free worker, is unchanged and checked against the saved original.

## Focused QA

Command executed:

```text
node --test --test-isolation=none tests/n16-dependency-pins.test.mjs
```

[Final log](../artifacts/n16-06c-20261029/qa-final.txt): **32/32 PASS, zero failures/cancellations/skips, 140.953168 ms**. Initial31/31 result is retained; the final run adds the necessary corrected-code-plan control. [Three syntax-only checks](../artifacts/n16-06c-20261029/syntax.json) passed. No SQL suite or containment runner was invoked.

Coverage includes valid changed/unchanged pins; missing dependency/file/manifest; full-digest mismatch; stale authoritative record/inventory; conflicts and duplicate equal records; literal/escaped duplicate JSON keys; duplicate policy assignments/inventories; tampered, malformed and oversized metadata; wrong schema; invalid digest/record/size; wrong inventory with a correct hash; invalid paths and non-byte reader results. Positive/negative oracle controls pass the real resolver and detect both accept-everything and reject-everything mutants.

[Saved controls](../artifacts/n16-06c-20261029/qa-controls.json) contain four authentic verification receipts with exact dependency and inventory hashes. This control reads only two fixed JSON inventories and four fixed code files. An integration control evaluates only the exact corrected dependency-check block with injected fixture readers, never `preflight()` or `runProbe()`. A separate static control verifies all eight current code-plan hashes, the preserved original runner digest and unchanged native/containment behavior text. These are pin/integration controls, not native containment evidence or hardcoded PASS receipts.

## Preservation and authority

[Preservation check](../artifacts/n16-06c-20261029/preservation-check.json):427 pre-existing protected code/evidence entries checked;426 unchanged and the sole intended runner change recorded with before/after hashes. This covers prior worker/containment/authorization/query/test contracts and saved manifest, source-registration, trace and resource evidence. Original N16-06A/B files are unchanged. Models, native binaries, SQLite source/donor and their permissions were never opened or modified; saved provenance/hash records are preserved, not freshly reverified from those binary bytes. No new synthetic database/fixture was constructed. Existing N14/N15 artifacts and operational code remain unchanged.

[Final validation](../artifacts/n16-06c-20261029/final-validation.json) records exact authoritative table preservation and evidence hashes. Governance/handoff updates add this QA-only result while preserving historical bodies. No exception is activated/extended; no source/startup/resource policy is renewed. N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete, N03 Partial, N05 In Progress — Deferred, N06 Not Started — Deferred, AC-20 Open / Unverified. Other statuses and original direct/transitive/scientific/medical/full/release gates remain unchanged. N15 factual rule remains unreviewed/inactive; experimental prompt remains unpromoted.

## Remaining uncertainty and exactly one next proposal

Dependency-pin resolution and the corrected code plan are ready for a later approved preflight. **The full preflight and containment probe were not run.** Real mount proof, guard errno/syscall, resource supervision, durable diagnostic acknowledgement and process cleanup remain unverified. No conclusion about database readability, SQLite/WAL behavior or four-tool qualification follows. Existing B-only output paths are historical, not permission to overwrite B evidence; a later task must use fresh approved output records and retain this code-plan provenance when configuring that task's runner.

**One smallest separately approvable next task:** a fresh single containment-only probe on the retained designated source, using these verified pins, preserved source-registration metadata, fresh durable output records and explicit source-metadata/resource authority. Require the full mandatory preflight, one startup maximum, real independent read-only mount/errno evidence, zero database-byte/SQLite/SQL access, first-failure STOP and no retry. No N16-06 SQL replay, Health Agent/Qwen integration or operational database access is included. STOP after N16-06C.
