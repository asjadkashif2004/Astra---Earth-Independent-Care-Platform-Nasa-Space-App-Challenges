# N16-06H — resource accounting QA correction

2026-10-29. **QA-ONLY PASS; STOP.** All37 focused tests and three syntax checks pass, with zero skips. No native designated-source worker, SQLite connection, SQL, sealed database-byte read, mount/source change, network request, download or model execution occurred. N16-06G remains INCONCLUSIVE.

## Findings and exact correction

The preserved [historical analysis](../artifacts/n16-06h-20261029/historical-analysis.json) confirms:

- G's seven-sample counter measures completed collections before persistence acknowledgement.
- Its intended journal contract is one resource row per sample; three separate worker-event rows do not fill the two-row gap.
- Append handles and foreground/interval collection have no shared queue. Injected IO reproduces concurrent append calls, but does not establish the historical loss mechanism.
- The controller could commit a result and report PASS without validating journal counts/readback.

The exact reason G persisted only five rows is **UNCONFIRMED**. No filesystem defect, resource breach, deliberate filtering or lost exception is asserted. The original G raw PASS, separate audited INCONCLUSIVE, journal and trace remain preserved.

| Source/test file | Minimal bounded change |
|---|---|
| [resource-journal.mjs](../services/agent/resource-journal.mjs) | New parent-only serialized collection/journal helper, explicit stage counters and IDs/hash chain, exclusive positional writes, fsync/readback acknowledgement and bounded close/reconciliation. |
| [n16-quality-qualification.mjs](../scripts/n16-quality-qualification.mjs) | The sole modified preexisting code file: route resource/events through the helper, retain external counts, add helper to storage accounting, fail supervision on journal error and require final durable reconciliation before result commitment/PASS. |
| [n16-resource-journal.test.mjs](../tests/n16-resource-journal.test.mjs) | New deterministic injected-IO and disposable JSONL QA; imports no worker, SQL executor or source-reading module. |

The [accounting contract](N16_06H_CONTRACT.md) defines attempted, accepted, appended and durable acknowledgement separately. Counts must agree at every stage and with actual rows, without filtering or aggregation. Errors and unfinished finalization remain visible. Saved originals, exact diff and additive current-code pins are in the [H evidence inventory](../artifacts/n16-06h-20261029/evidence-manifest.json).

## Focused QA

Command: node --test --test-isolation=none tests/n16-resource-journal.test.mjs.

[Complete log](../artifacts/n16-06h-20261029/qa-journal.txt):37/37 pass,0fail/skip/cancelled;507.106754ms reported suite duration. Syntax checks separately passed for the new helper, corrected controller and new test. No production controller or native worker was invoked.

Coverage includes ordered0/1/2/7/11-sample mock runs, separate event counts, delayed collectors/writes, short writes, final drain/sync/close acknowledgement, failed serialization/write/flush/readback/close, missing/duplicate/out-of-order/truncated/corrupt/foreign records, retained-head tampering, cancellation and termination during finalization, hung-finalization visibility, malformed/overflowing counters and the synthetic7-controller/5-resource-row mismatch. Both accept-all and reject-all mutants fail the discriminating oracle.

Positive controls reconcile actual constructed row counts, including a real disposable JSONL file with two mock samples and one mock event; no SQLite is involved. Negative controls reject silent record loss and count mismatch. Injected execution of the unchanged old journal/sample functions reproduces two overlapping handles and the pre-ack count increment without opening actual files.

## Preservation and scope

The [pre-task preservation inventory](../artifacts/n16-06h-20261029/preservation-before.json) contains587 protected hashes.586 remain byte-identical; the only intentional code change is the quality controller, whose exact original is saved. The original worker, SQL templates, source verifier, authorization, containment, F pathway, model/grammar, N14 evidence/retrieval and operational application remain unchanged.

All original G artifacts, controller outcome, audited outcome, saved resource rows and trace/checkpoint hashes remain unchanged. Original journal and preserved copy both retain SHA-256 a75aa2268516135262a82fdd22ea06a7648bf2ce88c271cbb18f37a87a482a05. Sealed source/donor bytes and permissions were not accessed or rehashed in H; their earlier integrity evidence is retained, not a fresh H source qualification.

Documentation updates cover this contract/completion, ADR-077, current governance summaries, tracker and handoff. Exception authority is not expanded. All106 preserved roadmap/tracker/priority table rows remain exact. [Final verification](../artifacts/n16-06h-20261029/final-validation.json) records preservation, changed-file pins, mock-only scope and unchanged historical G status.

## Remaining limitations and one next task

The historical missing-row cause is unresolved. New serialization/durability behavior is tested with deterministic IO and one disposable journal, not native SQL replay, power failure or all filesystems. Fsync/readback acknowledges OS persistence only. A permanently blocked IO operation can outlive the helper's250ms fail-closed deadline; pending state remains visible. Existing sampled RSS/storage and isolation limitations remain unchanged.

**Exactly one separately approvable next task:** a fresh bounded get_data_quality single-SELECT qualification against the same sealed synthetic source, using this corrected journal, new output/reservation and additive code pins, with explicit one-start/source/512MiB-memory/64MiB-monitored-storage permission and mandatory before-commit count reconciliation. No retry, remaining tool or integration is implied; do not execute it under H.

N16/N15/N14/N13/N07/N09 stay In Progress; N01/N02/N04 Complete, N03 Partial, N05 In Progress—Deferred, N06 Not Started—Deferred, AC-20 Open/Unverified and all other module statuses/prerequisites/scientific/medical/full/release gates unchanged. The N15 support rule remains unreviewed/inactive and experimental prompt unpromoted. STOP after N16-06H.
