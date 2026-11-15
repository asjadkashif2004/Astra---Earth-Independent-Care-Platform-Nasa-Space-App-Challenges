# N16-06B — single containment probe: preflight stop

2026-10-29. **BLOCKED during mandatory preflight; exactly ZERO probe startups; STOP.** No containment probe, database-byte read, SQLite connection/statement or qualification replay occurred. N16-06 remains blocked; no read-only mount or four-tool conclusion follows.

## Authorization and preparation

Owner approved one containment-only startup on `astra.n16.designated-synthetic.elevated.v1`, using the existing source, with fresh512MiB observed/monitored RSS and64MiB counted-storage targets, no network/acquisition/SQL/source-byte reads and stop on any preflight failure. The [same exception](DE_N16_DESIGNATED_READ_01.md) records this limited renewal; no broader or new exception was introduced. The unused startup allowance now expires with this stopped task.

Two new scripts were authored; no existing runtime/helper/QA code was changed:

- [n16-containment-only.mjs](../scripts/n16-containment-only.mjs): SQL-free probe entry, metadata/mount/denial diagnostics, no database read API, no retry and no SQL release path. Parsed only; **never imported or executed**.
- [n16-containment-probe.mjs](../scripts/n16-containment-probe.mjs): metadata-only preflight, exclusive one-start reservation, planned resource observation and durable acknowledgement. Only its `--preflight-only` path ran; the startup path was never entered.

[Frozen plan](../artifacts/n16-06b-20261029/probe-plan.json) identifies seven code dependencies and one static startup/probe call site. Two syntax checks passed. The corrected [45-control mock suite](../artifacts/n16-06b-20261029/preflight-qa.txt) passed45/45 with0fail/0skip. Its deterministic existing mock-results bytes remained unchanged; no SQL harness was run.

## Confirmed preflight defect

The new runner stopped with `QUALIFIED_HELPER_CHANGED`. It incorrectly looked up **all** dependencies in N16-06A's changed-files `evidence-manifest.json`. That manifest includes the newly changed diagnostic/batch helpers, but does not list unchanged `services/agent/read-contract.mjs`. Its matching recorded SHA is in N16-06A's `preservation-before.json`. The runner treats that missing entry as a mismatched pin and fails. `packages/contracts.mjs` has the same indexing issue, but execution never reached that check.

[Pin comparison and outcome](../artifacts/n16-06b-20261029/outcome.json) confirm that current helper bytes match their appropriate retained pins. This is **a provenance-lookup defect in the new runner**, not evidence of an actual dependency change. The preflight stopped as required; no resolver correction, second preflight or probe attempt followed the failure.

The stop occurred before resource-observer/persistence-readiness gates. Source metadata/registration checks and mandatory QA passed, but the complete mandatory preflight did not. `probe-reserved.json` and `startup.json` were never created; the invoked CLI was explicitly `--preflight-only`. The [atomic failure record](../artifacts/n16-06b-20261029/stopped.json) preserves the error. Final accounting establishes actual startups0 rather than guessing from its generic inspection hint.

## Evidence and unavailable observations

| Deliverable | Actual result |
|---|---|
| Outcome / startup count | BLOCKED / **0**, before reservation or namespace setup. |
| Actual guard stage / errno / syscall | **NOT RUN / unavailable**; no EACCES/EROFS/EPERM inferred from mock fixtures or old generic errors. |
| Independent read-only mount evidence | **NOT RUN**; permission modes alone do not establish mount-level protection. |
| Probe exit code / duration / RSS / storage | No probe exists; these are **NOT MEASURED**. The preflight controller exited1. |
| Resource enforcement / diagnostic-ready gates | Planned but **not fully validated**, because the earlier pin lookup failed. No quota/monitoring success is claimed. |
| Durable records | Frozen plan, metadata validation,45-test log, preflight stderr/stopped record, pin comparison and code snapshots retained under `artifacts/n16-06b-20261029`. No live guard diagnostic/resource journal exists. |
| Database bytes / SQLite / SQL / network / acquisition | **0**. No source construction, rewriting, permission change, mount setup, operational access, model, Health Agent, detector or Scenario Lab action. |

## Metadata and preservation

Authoritative registration root `/var/tmp/astra-n16-designated-2v0ytq` and manifest SHA `5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c` validate against retained metadata. Source inode/device/birth/change metadata, size65,536bytes, file0400/directory0500 and main-file-only inventory validate before the failing lookup. Postflight stat metadata/inventory remains unchanged. No donor was accessed and no SQLite file was opened or rehashed.

Expected source digest `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73` is a **retained identity pin**, not a fresh content hash from this task. [Final validation](../artifacts/n16-06b-20261029/final-validation.json) records412 protected hashes unchanged, including previous code/results/manifest/resource/trace evidence, exact authoritative table preservation and unchanged source stat metadata. No independent scientific, medical, security or source-byte certification is implied.

## Exactly one next proposal

Separately approve **one QA-only correction of the authoritative dependency-pin resolver**, with deterministic fixtures covering changed-files pins, preserved unchanged pins, missing/conflicting pins and actual mismatches. Do not silently accept an unlisted dependency. No source data, worker/probe or SQL execution in that correction; an actual containment continuation still requires separate fresh approval. This is a proposal only.

Governance, tracker and handoff record this preflight block truthfully. N16/N15/N14/N13/N07/N09 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified; all other statuses/direct/transitive/scientific/medical/full/release gates unchanged. N15 rule unreviewed/inactive and prompt unpromoted. **STOP after N16-06B; no unused-startup continuation or SQL replay.**
