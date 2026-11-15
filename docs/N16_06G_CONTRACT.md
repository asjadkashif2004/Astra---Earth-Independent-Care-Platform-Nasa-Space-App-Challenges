# N16-06G — one quality read on the sealed synthetic source

2026-10-29. One task under DE-N16-DESIGNATED-READ-01, with fresh permission for at most one native worker/read-only connection/fixed SELECT,512MiB process memory and64MiB monitored counted storage, no network/acquisition. The F authority remains expired. STOP on any mandatory failure and after G; no retry, fallback, remaining tool or integration follows.

## Exact reuse and task selection

The unchanged designated worker enters its existing F single-SELECT family. Its request schema `n16-06g-single-quality-v1` selects a new internal, fixed quality policy through a lazy runtime import; the native entry's historical F label does not select the vitals tool. The G launcher issues only `get_data_quality` for CREW-03/heart_rate, with trusted Astronaut/self scope, exact archive time and no caller options. The child revalidates that scope and tool. No caller-supplied function/policy, SQL, path, role or clock is accepted.

The shared executor has four narrowly scoped policy-selection edits: optional trusted internal mode/authorization, mode validation, authorization selection and receipt mode. Its defaults remain the original vitals policy. All SQL, source, mount, acknowledgement, resource and connection behavior remain the same. Source-text restoration checks plus all31original vitals controls verify that behavior; their assertions are unchanged and only two QA-output destinations move into G to preserve F history. The worker, parent worker pin, original multi-statement block, source verifier and frozen query contracts are byte-identical to F.

G invokes the exact existing observation query, unchanged:

```sql
SELECT crew_id,metric,json,sha256 FROM observations WHERE crew_id=? AND metric=?
```

Parameters are `CREW-03`, `heart_rate`. No second metric/SELECT, metadata query, PRAGMA, BEGIN/ROLLBACK, mutation or schema enumeration is allowed. A deny-by-default authorizer permits only one SELECT and its expected main.observations column reads. Source schema/content/header/instance binding is outside SQL, exactly as qualified in [F's safety contract](N16_06F_CONTRACT.md). That equivalence remains restricted to the exact byte-pinned sealed rollback archive, not arbitrary schemas or WAL/concurrent writers.

## Quality output and uncertainty

The unchanged canonical `projectRows` quality projection supplies metric/unit, quality flags, observation/receipt times, source/provenance, row identity and archive freshness. Measurement `value` remains null; no second vitals tool is dispatched. G preserves the original canonical projection in `read_receipt.quality_audit` and only downgrades its public quality verdict.

Quality status values are the existing telemetry contract's good/suspect/missing, confidence finite0..1 and artifact boolean. Missing or malformed quality is null/UNKNOWN, never invented. Suspect/missing/artifact, missing/untrusted provenance, stale/future/inconsistent times or an already UNKNOWN projection cannot be upgraded. Explicit time and sampling checks preserve the existing mission-age rule. Stale context remains stale; other unresolved context is unverified. Valid declared flags remain unchanged, including suspect/missing; no new confidence threshold or health inference is introduced.

SQL execution COMPLETED and data quality UNKNOWN can coexist; the ledger tests this explicitly. A missing/unverifiable source or tampered canonical row fails the call with no completed result; G failure records separately state UNKNOWN data. An author-declared good quality/confidence0.99 is synthetic metadata, not independent proof of a real sensor or a healthy crewmember. Archive KNOWN means verified at its mission as_of only; host currency/monitoring remains NOT_LIVE_ARCHIVE/UNKNOWN, no Earth-reception claim, N02 event, diagnosis or inference.

## Unchanged safeguards and admission

Reverify full approved source SHA-256, size, authoritative registration/owner/manifest/schema pins, source instance/modes and main-only inventory before native admission. Same-context independent ro mount proof precedes actual denial probes; EACCES alone is never sufficient, EPERM remains rejected. Durably acknowledge diagnostic+source+call digests before SQLite opens; verify source and mounts again before and after. No source writes, sidecars, aliases or substitution; operational paths and user files remain absent from the private filesystem/network sandbox.

Use the existing genuine readOnly/defensive/no-extension connection, one prepare/get, trusted canonical row verification, external atomic/fsynced ledger and cold file-only recovery. Exclusive task/startup reservations and the monotonic first-failure latch permit at most one startup; cancel/drain owned processes and withhold success on errors. No code/SQL/parser fallback exists. G storage accounting conservatively includes retained F evidence used by this task and added code; ceilings, one-second worker/250ms read bound and20ms non-overlapping monitoring remain unchanged. Monitored storage is not a quota; sampled/child kernel RSS is not continuous all-process peak certification.

Before native execution, freeze code/target and pass G quality controls, complete F vitals regressions, diagnostic and pin controls. Mock SQL/IO and trace fixtures are labeled separately from actual execution. Qualifying one quality read does not qualify the other two tools, a full module, operational integration, scientific review or clinical decisions. All original module prerequisites/statuses and independent-review gates remain open and unchanged.
