# N16 final engineering campaign —2026-10-30

Owner explicitly approves one fresh correction/qualification within DE-N16-DESIGNATED-READ-01. Previous campaign5starts/latch/evidence and N16-06G INCONCLUSIVE remain immutable history. This approval specifically permits a narrow authorizer compatibility fix; it does not expand source/table/column/crew/tool authority.

Source astra.n16.designated-synthetic.elevated.v1,65536bytes, SHA-2564b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73. Same registration/manifest/schema/instance,0400/0500, main-only closed rollback archive. No operational database, writer, setup SQL, source copy, permission or mount relaxation.

## Exact authorization boundary

The saved risk query is SELECT id,crew_id,status,json,sha256 FROM risks WHERE crew_id=? AND status=? ORDER BY id LIMIT ?. Its one prepare and one step are separate from SQLite compiler authorization callbacks. Saved action21/SQLITE_SELECT repeats during step after allowed action20/SQLITE_READ on main.risks columns. The old callback-count predicate denied it with SQLite23. Historical logs omitted callback argument5; new instrumentation must record its actual source/trigger/view context, not assume a value. Pinned ordinary tables/indexes contain no views/triggers/expressions/subqueries.

Correction: one fixed prepare and one fixed parameterized step per connection, no arbitrary SQL. First SELECT during prepare; at most one additional SELECT during step for the exact risk query only, after the complete expected column set was authorized. READ callbacks may repeat only on the exact main table/columns. Reject any non-null source context, additional statement/step, third SELECT, additional SELECT during prepare, foreign database/table/column, function, transaction, writable action, PRAGMA, extension or unexpected expansion. Bound all callback transcripts and validate them independently in the parent. Other tool SQL/results and F/G legacy paths remain unchanged.

## Campaign and qualification

Fresh maximum6native designated-source startups, shared durable reservations/latch. No retry after a genuine/unresolved containment, integrity, unauthorized-access or resource failure. Ordinary reproduced implementation defects may be corrected and deterministically retested before another admission, within remaining budget. No previous latch reset or permission transfer.

Retain512MiB process ceiling,64MiB monitored storage, zero worker network/download/install/model activity and stronger prior bounds: heap64MiB/CPU1s/wall1s/read250ms/escalation250ms/workflow10s. RSS/storage are actively sampled/monitored, not hard lifetime/quota guarantees. Charge immutable participating inputs and all new mutable evidence/temp output; preserve incremental journals and before-commit reconciliation.

Planned native proof: one fresh sequential risk-first four-tool coordinator. Risk qualifies first; then the already verified vitals/quality/baseline are exercised within the same coherent new workflow as cross-tool regression, not duplicated individual probes. Exactly four tools/one readOnly connection and fixed SELECT each. No old result is silently presented as fresh. Cold recovery then reads only committed evidence and must replay0SQL.

Standalone recorded presentation and deterministic factual reproduction only: archived observation, declared quality, authored baseline and authored risk schema records. N02 event provenance stays UNKNOWN unless actually verified; actual_N02_event:false is preserved. No diagnosis, treatment, all-clear, Qwen or unreviewed research rule. The operational Health Agent/ack/Earth/N02 interfaces stay untouched; UI integration remains unapproved.

Mandatory mock gates include exact/repeated callback paths, statement count, all forbidden SQL/actions, trusted authorization, source/mount/ACK, journal/trace failure, cancellation/recovery, response/HTML escaping/accessibility and reject-all/accept-all controls. Relevant isolated application regressions are permitted; no running operational API/source is used.

Formal N16 remains In Progress unless all original N02/N10/N12/N14/conditional N15/transitive and scientific/full/browser criteria are actually fulfilled. They are not waived here. Current engineering scope may be complete while full module gates remain open. No unused native/resource authority survives delivery.
