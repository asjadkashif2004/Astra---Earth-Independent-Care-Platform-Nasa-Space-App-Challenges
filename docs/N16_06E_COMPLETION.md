# N16-06E — single SQL qualification preflight stop

2026-10-29. **BLOCKED at static governance/SQL-contract preflight; ZERO native SQL worker startups; STOP.** No source access, SQLite connection, SQL, guard correction, runtime test, retry or fallback occurred.

## Confirmed blocker

The source/tool boundary fits the activated [designated-source exception](DE_N16_DESIGNATED_READ_01.md): one read of one sealed synthetic source is narrower than its four-tool qualification scope. Original module/scientific gates remain open. The concrete conflict is the pinned worker's SQL execution contract, not operational access or a newly observed source/containment fault.

The current [designated worker](../services/agent/designated-worker.mjs) is SHA-256 `2fac3411b862751097cfce20a06752426dd1548cc68a85a1738dc7c303c449ad`, matching the authoritative N16-06A overlay. Its normal read path performs:

| Location | Explicit statement(s) |
|---|---|
| Line37 | `PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;` |
| Line52 | `BEGIN` |
| Line53 | `QUERIES.metadata` SELECT over `fixture_meta` |
| Line61 | Parameterized observation SELECT for each requested metric |
| Line63 | `ROLLBACK` |

Even requesting only one crew/metric would execute the other statements. Its reported data-query count also includes `metadata`; the old contract excludes connection/transaction setup from that count. It cannot truthfully satisfy N16-06E's requirement of the existing vitals SELECT only, with **no other SQL or PRAGMA**.

[N16-06A contract](N16_06A_CONTRACT.md) explicitly preserves the byte-identical3,145-byte SQL/constructor/authorizer/result block, digest `c724b37a94955a91943bb2b71914d6e6a65c73697720737a23127bf4c165081e`. [N16-05 source designation](N16_05_SOURCE_DESIGNATION.md) also requires query-only/trusted-schema safeguards. Removing setup/metadata/transaction statements or adding a replacement execution path changes more than the approved minimal guard compatibility correction. The owner explicitly required STOP if the frozen worker cannot be changed within that authority. No frozen code was modified and no alternate worker was selected.

The existing designated worker already calls N16-06A's independent mount-proof/denial helper and waits for its exact diagnostic acknowledgement before SQLite construction. Only the historical legacy worker retains the EACCES-rejecting boolean guard. Thus simply changing the old guard would not solve the current single-SELECT mismatch. The shared helper also permits EPERM with proof; N16-06E's narrower prohibition means a future task-specific execution gate must explicitly exclude it. No new EPERM acceptance or general guard relaxation occurred here.

## Actual deliverable status

| Requested item | Observed status |
|---|---|
| Outcome | BLOCKED before source/worker preflight execution. |
| Guard correction | None; current guard behavior statically inspected only. |
| Deterministic pre-execution guard QA | NOT RUN after the mandatory governance stop. D's77passes/C's32passes remain historical, not N16-06E results. |
| Native SQL / containment startups |0 /0; no startup reservation or native execution trace was created. |
| SQLite / SQL / PRAGMA execution |0; source text was inspected, not executed. |
| Tool/result status |NOT_STARTED / NOT_OBSERVED; zero committed results. No fabricated UNKNOWN reading or completed call. |
| Source hash/sidecar verification |NOT RUN after stop; no source directory/database/donor was accessed. Expected digest `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73` retained as a historical pin, not current byte verification. |
| Runtime duration/RSS/storage |NOT MEASURED; no runtime admitted. |
| External evidence |[Preflight outcome](../artifacts/n16-06e-20261029/outcome.json), exact statement sites, pinned [worker source copy](../artifacts/n16-06e-20261029/worker-source.txt) and preservation records. These are preflight records, not attempted/committed SQL traces. |
| Code, permissions, mounts, network, models, operational state |No changes or execution. |

## Preservation and governance

All471protected pre-existing code/evidence hashes remain unchanged, including all historical workers, contracts, N16-06D results/diagnostics/resources, source-registration/provenance records and prior QA evidence. No new code, test, database or fixture was authored. This task read saved metadata/code only; it did not reopen or rehash database/model/native artifacts. Current source-byte integrity is unmeasured, not claimed invalid.

[Final validation](../artifacts/n16-06e-20261029/final-validation.json) preserves authoritative table rows and historical governance bodies. The new task authorization is recorded as stopped/exhausted, with zero startups; its unused startup and resource allowance do not carry forward. No operational-read exception or SQL/setup waiver was activated. N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. All other statuses, direct/transitive/scientific/medical/full/release gates and inactive/unreviewed N15 rule remain unchanged. Experimental N15 prompt remains unpromoted.

## Exactly one smallest next approval

Authorize **one task-specific single-SELECT execution-path specialization in the existing designated worker**, explicitly permitting the necessary departure from the frozen SQL/setup contract while preserving historical code/evidence and qualifying equivalent safety without setup PRAGMAs, metadata SELECTs or transaction SQL. Scope that path to one trusted crew/metric `get_current_vitals` call using the exact existing observation template; reject all other tools/statements and EPERM. Require source/schema/content/instance binding through approved non-SQL verification, independent same-context mount proof, root/directory denials, durable diagnostic acknowledgement, genuine read-only opening, constrained authorizer, canonical provenance, external trace/recovery and focused positive/negative mock QA before at most one startup. Any implementation unable to preserve those safeguards must stop before execution. Include fresh512MiB/64MiB and source-byte/SQL authorization; no automatic fallback, retry, operational access or integration.

That is one proposed bounded task, not an implementation or guarantee that equivalent no-PRAGMA safety has already been established. Remaining source hashing, authorization/EPERM controls, full preflight, actual SELECT, result commit, noninterference and resource qualification are all open. **STOP after N16-06E.**
