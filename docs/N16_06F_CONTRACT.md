# N16-06F — sealed-source single-SELECT contract

2026-10-29. One owner-approved task under DE-N16-DESIGNATED-READ-01. The explicit F approval permits an additive single-SELECT mode that E did not permit. No operational source, other tool, writer, model, integration, prerequisite closure or independent review follows. At most one startup;512MiB process memory/64MiB monitored storage, zero network/acquisition; original one-second worker/250ms read target retained. STOP on any mandatory failure, no retry.

## Mode and old-workflow preservation

`n16-06f-single-select-v1` is an explicit branch in the existing designated worker. Its runtime module is imported only in that branch. The old multi-statement worker body and its entire frozen SQL block remain byte-identical; old modes use them unchanged. The existing controller's current worker digest is updated in exactly one location, retaining the old digest in task evidence. No existing caller is redirected to the new mode. No old manifest, schema, query template or source edition is rewritten.

The task-only controller has no caller options. It authorizes one local fictional Astronaut principal for CREW-03, intersected with source scope, at the archive's mission as_of. It requests `get_current_vitals`, one metric `heart_rate`; the existing exact parameterized `QUERIES.observation` runs once with `CREW-03`, `heart_rate`. No caller SQL, role, clock or path is accepted. The child revalidates that trusted pipe request before reading source bytes. This is scoped demo authorization, not production authentication.

## Equivalent safety case for omitted statements

| Original statement | What it establishes/protects | Single-mode replacement and boundary |
|---|---|---|
| `PRAGMA query_only=ON` | Connection-level prohibition of writes. | Genuine `readOnly:true`, independently verified read-only root/source mounts, closed/sealed source with no sidecars, disabled extensions/defensive mode, and deny-by-default authorizer. Only SELECT plus reads of four `main.observations` columns are allowed. No transaction/write/PRAGMA/function/attach action is permitted. No arbitrary SQL entry point exists. |
| `PRAGMA trusted_schema=OFF` | Limits potentially unsafe schema-driven behavior. | Accept only the exact full-byte-pinned source whose preserved schema consists of ordinary tables/indexes, no views/triggers/generated expressions/virtual tables or custom functions. Pinned N16-05 schema provenance must exactly match the unchanged schema/query contracts; any other source, schema provenance or bytes reject. The authorizer also rejects function/schema/other-table actions. This does not claim trusted_schema is disabled or qualify arbitrary databases. |
| Metadata SELECT | Verifies schema edition/profile/generation. | Whole-file SHA-256 plus exact size, SQLite closed-rollback header, registered source identity, manifest/owner hashes and pinned schema/query/row provenance bind the exact generation0 elevated archive. The child repeats content/instance verification in its own mount context. No new schema enumeration is performed. |
| BEGIN | Holds a stable snapshot across several queries. | Exactly one SELECT against a byte-pinned sealed non-WAL archive; the statement's implicit read transaction suffices, with no cross-query consistency claim. Same-instance/content/inventory checks before/after and before database open detect replacement or change. No writer is authorized or exposed. |
| ROLLBACK | Ends the explicit read transaction without writing. | No explicit transaction is started; statement execution finishes and the single read-only connection closes through `finally`. No SQL cleanup is issued. |

The source hash and provenance are technical integrity evidence, not scientific approval. The schema assertion depends on the existing trusted archive publication/pins, not a new SQL inspection. It fails closed for every other edition. It is not a guarantee against an external privileged actor capable of changing the kernel or approved code/pins.

## Source binding, containment and acknowledgement

Only the fixed registered host source directory or its exact `/fixture` sandbox bind may be inspected. Directory-descriptor anchoring, O_NOFOLLOW, exact main-file-only inventory, one hardlink,0400/0500 modes, full bytes/hash, SQLite header and device/inode/birth/change identity are checked. Parent manifests and schema provenance are pinned; parent retains the source directory descriptor for the bind. No alias, substitute, WAL/SHM/journal, path argument or new copy is allowed. The worker sees no other host source path and has no mount capability.

The unchanged diagnostic helper independently reads per-mount ro evidence and actual denials. A new stricter task policy requires root/directory EROFS and source-file EROFS or EACCES, with matching errno and complete validated same-context mount proof. EPERM is explicitly rejected for this mode. The child emits source binding plus diagnostic, waits, and accepts only an exact durable acknowledgement binding diagnostic, source binding and call digests. Parent validates all three and checks the failure latch before acknowledging. Missing/corrupt proof or persistence failure cannot release SQLite construction.

After acknowledgement the child rehashes/rebinds the source and compares its actual mount evidence again, before opening SQLite. It checks both again after closing. Only one prepare/get call exists; authorizer instrumentation records exactly one SELECT and bounded allowed read actions. Counts refer to application-issued SQL and observed authorizer actions; they do not pretend to trace SQLite's internal page/schema machinery or constructor internals before the authorizer is installed.

## Results, durable traces and failure behavior

Actual rows pass the unchanged canonical row/projection checks; parent separately validates returned result, row digest, query/parameters and binding before publishing. Values, units, quality, event/observation/receipt times and synthetic source provenance are retained. Output is SYNTHETIC / ARCHIVED DESIGNATED SOURCE, KNOWN only at its trusted archive as_of, not current host telemetry; no alert, all-clear, inference or diagnosis is generated. Missing/unverifiable evidence fails closed without a fabricated healthy value.

The existing atomic/fsynced execution ledger records requested, validated, started and either committed completed or failed calls, plus workflow terminal state. Results are persisted and checkpointed before success; cold recovery verifies digests without replaying SQL. Diagnostic/resource records are external to the source; the child cannot write them or operational state. Failures stop the shared first-failure latch and owned process group; no queued/cleanup callback can start a second worker. A task reservation and exclusive invocation receipt prevent reruns. Trace failures withhold success.

Private filesystem/PID/network namespaces, no host home/project/credentials/database paths, clear environment, capability drop, descriptor closure, CPU-only Node and private ro mounts reproduce D containment. Non-overlapping active RSS/storage observations, heap64MiB/CPU1s/wall1s and termination escalation apply. Storage is monitored, not a hard quota; sampled RSS and child kernel maximum are reported with limitations, not continuous all-process peak certification.

## QA and admission

Before native execution, deterministic mock controls cover valid SELECT/provenance, old-workflow byte equality, no other SQL, wrong scope/tool/role, tampered schema/identity, aliases/sidecars, bad or absent proof, EACCES/EROFS/EPERM policies, same-namespace checks, missing/failed acknowledgement, SQL failure/cleanup, first-failure latch and accept-all/reject-all mutation controls. Mock trace recovery is labeled separately from native evidence. No SQL is executed by QA.

Actual qualification is conditional on all mandatory QA, pinned code/source/registration/schema, tracing, memory/storage admission and one-start checks passing. Any failure stops the task; this contract does not promise a native success. Historical N16-06/A/B/C/D/E evidence and all N16 prerequisites/review/status gates remain preserved.
