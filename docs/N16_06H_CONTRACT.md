# N16-06H — resource journal serialization and reconciliation

2026-10-29. QA-only correction under the existing designated synthetic-source boundary. This document grants no source reads, worker startups, SQL, mount changes, resource renewal or replay. [N16-06G](N16_06G_COMPLETION.md) remains INCONCLUSIVE.

## Historical meaning and confirmed gaps

G's controller increments resource_samples after collecting process/filesystem measurements and before awaiting journal persistence. A journal call is intended to append one newline-terminated JSON resource row, fsync and close. Worker-event rows are separate. There is no filtering, aggregation, coalescing or legitimate conversion of seven collected samples into five resource rows.

The preserved code has no common serialization queue across append handles. Its interval guard does not serialize foreground sampling against interval sampling. Deterministic injected IO demonstrates overlapping calls and the count advancing before acknowledgement. G also has no count/readback barrier before committing a result and reporting PASS. These are confirmed design defects, not proof that overlapping writes caused G's historical loss. Five resource rows plus three event rows still cannot reconcile to seven resource samples.

## Required stages

The new parent-only journal uses schema astra.n16.resource-journal.v2. Each sample and event has four independent monotonically increasing, safe-integer counters:

| Stage | Exact meaning |
|---|---|
| attempted | An open journal admitted a sample collector or event request and assigned its per-kind ID. Rejected calls after sealing do not become admitted attempts. |
| accepted | Collection succeeded and a bounded, plain, finite JSON payload plus its full frame was serialized successfully. Failed collection/serialization is visible and is not accepted. |
| appended | Every byte of the frame was reported written; short writes are completed explicitly. Issuing a write alone is insufficient. |
| durable | File sync returned its required acknowledgement and positional readback exactly matched the complete frame. Only then does the acknowledged sequence/head advance. |

External resource_samples retains the controller's collected-sample meaning. External event count is the number of processed worker events. Final success requires both external counts to match the corresponding attempted, accepted, appended and durable counts AND actual journal rows. Events cannot cover missing samples. No filtering/aggregation policy is introduced.

Every frame contains journal identity, global sequence, per-kind sample_id or event_id, timestamp, kind, payload, previous hash and content hash. Global order covers both kinds. A failure latches the first error, denies queued work and notifies supervision. State exposes pending work, written bytes, acknowledged rows, all counters, first failure, notification/cleanup failure and finalization/close state. Failed or partial runs cannot be reconciled into success.

## Serialization, persistence and finalization

One queue owns collection, serialization, writes, sync and readback for foreground samples, observer samples and worker events. There is one exclusive writer descriptor with explicit positions. The filesystem adapter creates a new resources-v2.jsonl with exclusive/no-follow creation and fsyncs its parent directory; it never appends to the historical resources.jsonl. Readback checks the same regular, single-link file identity through the existing anchored filesystem helper.

Finalization:

1. Seal admission and snapshot external expected counts.
2. Drain admitted work; reject any first error or pending/incomplete stage.
3. Perform final sync, then read and validate the entire journal.
4. Check complete JSONL framing, schema, identity, sequence, per-kind IDs, timestamps, hash chain, retained acknowledged head and exact count agreement.
5. Await close acknowledgement; read the closed file again and require byte equality and full reconciliation.
6. Return a closed/reconciled receipt with counts, head and full journal SHA-256.

Missing, duplicate, reordered, truncated, foreign or corrupted rows fail. Rehashing altered rows does not match the independently retained acknowledged head. A sync, write, readback, close, serialization, cancellation or finalization failure cannot return a success receipt. Finalization is idempotent and does not retry IO or revise expected totals.

The quality controller now requires this receipt and an atomically persisted reconciliation record BEFORE result/CALL_COMPLETED/PASS commitment. Failure outcomes include journal stage counters and finalization error. Existing source/query/worker/authorization/mount/ACK/trace semantics and resource ceilings are preserved. Participating-code storage accounting includes the new helper.

## Bounds and limitations

Frames are bounded to64KiB, journal to8MiB, and finalization acknowledgement to250ms (the existing cleanup bound). These are additional fail-closed bounds, not relaxed storage, memory or native deadlines. A timeout leaves unfinished cleanup visible; cancellation is checked even after close acknowledgement while final readback is pending. Uninterruptible OS IO cannot be forcibly cancelled by a JavaScript promise. Existing outer supervision is still required, and controller waits outside the helper are not certified against a permanently hung kernel call.

Fsync plus readback is an OS/filesystem acknowledgement, not independent physical-media or power-loss certification. Hashes detect changes relative to preserved receipts; they are not signatures against an actor who can replace all evidence. Mock tests and a disposable JSONL adapter test do not qualify native scheduling, mounted-source SQL, continuous RSS coverage, hard disk quotas or production crash recovery.

No H native/source-resource permission exists. The historical G output paths, exclusive invocation reservation and historical code plan remain untouched; updated code intentionally does not match G's old controller pin. Any later execution needs separate approval, new output/reservation, new additive code pins, explicit source/resource authority and a fresh reconciliation receipt. Historical G cannot be rerun or retroactively passed.
