# DE-N08-SYNTHETIC-01 — proposed synthetic N08 engineering sequencing exception

2026-10-30. **PROPOSED / INACTIVE. No implementation authority is created by this document.**

## Decision requiring the owner

N08 is Binary waveform/CSV ingest and replay, with original N01/N07 dependencies and N06 for twin synchronization. N01 is Complete, N07 is In Progress, N06 is Not Started—Deferred. [CORE_AI_PRIORITY](CORE_AI_PRIORITY.md#priority-order-and-dependency-gates) states that use of unfinished N07/N08 needs an explicit dependency decision. No existing N08 exception exists. The current N08 mission's Phase3 explicitly prohibits activating a newly invented unreviewed exception. This proposal is the concrete reviewable result of that instruction, not its approval.

The requested decision would permit **one consolidated N08 synthetic engineering implementation/integration/QA campaign** before full N07 closure. It would not complete N07/N08/N06, resume deferred anatomy, authorize source acquisition or relax any release/scientific/independent-review gate. Full N08's public-waveform and actual twin acceptance remain separately open.

## Exact proposed implementation scope

- Reuse existing Node/SQLite, session/RBAC, mission clocks, frontend patterns and N01 ownership/privacy foundations. Use only new explicitly fictional waveform/CSV fixtures and disposable synthetic application/test databases in agreed task/OS-temp roots. No active database or N16 sealed source.
- Implement versioned binary chunk metadata and content-hash/object persistence,1–5second sample blocks, strict format/sample-rate/count/unit/channel/time/crew/quality/provenance limits, ordered ingest, duplicate/idempotency/conflict checks, atomic recovery and bounded retention. Do not serialize individual waveform samples as a stream of JSON objects.
- Implement authorized waveform read/ingest and synthetic CSV normalization, with separate original and replay clocks, source/knowledge-time historical views, missingness/quality UNKNOWN and no read-side writes. Reject arbitrary URLs/paths, forged source/crew identity, cross-crew access and over-limit payloads.
- Implement bounded decimation and clearly experimental source-bound signal-quality/R-peak/derived-value algorithms using known fictional controls. A synthetic peak test is not clinical detector validation. Optional BP stays UNKNOWN unless a separately approved verified source supplies it; do not infer BP from PPG or invent samples.
- Add functional waveform/replay UI to the existing demo application source, verified only against fresh synthetic instances. Include actual playback/history/input/output, source/quality labels, loading/empty/error/permission/UNKNOWN, responsive and keyboard states, plus real-browser acceptance using installed approved tooling. No download or deployment follows.
- Keep N08 outputs separate from N02 scalar ownership/alert logic. Do not auto-feed derived public/synthetic metrics into monitoring, modify thresholds, create alerts/cases or change acknowledgement/Earth communication. Any later monitoring adapter is a separate explicitly reviewed boundary.
- Use retained N07 rights/hash/card **metadata** as read-only compatibility evidence. Existing BIDMC numerics are not ECG/PPG waveform samples or R-peak ground truth. This proposal does not authorize ingesting real patient/astronaut records, reopening a partial Sleep transfer, fetching any scientific file or promoting an inactive N07 descriptor into operational ingestion.
- Provide tested inactive provenance/quality/chunk/peak-time contracts for later N09/N10/N11/N12/N16 consumers. No new simulator/model/LLM/tool workstream, N10 alteration, N16 source/worker invocation or unreviewed scientific rule activation.
- Preserve N06's deferred twin integration: produce a timestamped interface if useful, but do not change anatomy/animation or claim actual beat/twin synchronization. That branch remains blocked until original N05/N06 gates and separate resumption authority are satisfied.

## Safeguards and retained gates

All fictional samples must carry synthetic:true, generator/version/seed where applicable, known fixture identity and honest quality/timestamps. No public sample may be relabeled as fictional astronaut evidence. An absent real public waveform remains BLOCKED BY SOURCE. Missing source, malformed/mismatched metadata, corrupt bytes, uncertain clock, unverified quality or incomplete replay returns UNKNOWN or explicit failure, never healthy or diagnosed.

Read/write separation, least-privilege role/crew checks, cancellation/deadlines, atomic persistence, cold recovery, source/hash/schema rejection, no future leakage, unknown propagation, worker cleanup and bounded memory/storage/throughput tests must be real. Freeze finite input/file/chunk/test bounds before execution; no expired N16512MiB/64MiB/startup allowance or model permission carries forward. Retain existing stronger host/API/security limits; new processing cannot silently bypass them.

Original N01/N07/N06 dependencies and N07's missing complete Sleep/PTT/RadLab/named-study/card/independence obligations remain. N03/AC-20, N05/N06 deferral, N09/N10/N11/N12/N13/N14/N15/N16 and scientific/release reviews remain unchanged. This is engineering sequencing only, not production, medical, clinical, astronaut-connectivity or scientific generalization approval.

## Conditional acceptance after explicit activation

Require all ten audited N08 requirement groups in [current report](N08_FINAL_ENGINEERING_COMPLETION.md), with meaningful positive/negative unit/API/durable/replay/security tests; actual synthetic input→chunk store→authorized read→decimation/replay/UI and restart; real-browser interaction; no alert fabrication; old N07/N10/N16 source/evidence preservation; exact files/resources and truthful per-requirement verdicts. Do not call synthetic success satisfaction of real public-waveform or N06 twin acceptance.

One consolidated build/correction/QA mission is proposed, not a chain of new microtasks. Ordinary defects may be fixed within the approved scope. A genuine source/rights/authorization/integrity/containment/resource/review failure stops the affected execution. Full engineering completion with external gates may be reported only for actual delivered scope. Formal Complete requires all original criteria and legitimate prerequisite decisions.

## Activation and expiration

Required next permission: **explicit owner activation of this exact DE-N08-SYNTHETIC-01 proposal and authorization of one consolidated N08 synthetic engineering mission under these restrictions.** The current mission permits preparing this document but explicitly withholds its automatic activation. This paragraph is not an approval request for an ordinary coding fix.

If explicitly activated, authority expires at delivery, revocation, stop or an unresolved mandatory boundary. No unused resource/startup permission survives; no automatic downstream task, source acquisition or deferred anatomy resumption follows.

## Owner decision — blank

- Decision (ACTIVATE / REJECT / REQUEST CHANGES):
- Owner identity/date:
- Exact reviewed proposal SHA256:
- Rationale and any limits:
- Consolidated implementation authorization:

No independent scientific reviewer or owner signature is fabricated. **STOP: proposal inactive.**
