# N03 frontend correctness and performance engineering

Owner authority: the 2026-11-04 consolidated N03 directive. This task continues the existing frontend after completed N01/N02. It requires no new sequencing exception. DE-AC20-01 remains a narrow downstream dependency exception; its criterion is not waived. Historical task-specific model/native/source permissions are not renewed.

The controlling roadmap row is N03 in [MASTER_PLAN.md](MASTER_PLAN.md); the official families are **R02, R19, R20, R24, R25, R26, R27, R28, R29, R55 and R60** in [REQUIREMENTS.md](REQUIREMENTS.md). These are eleven traceability families, not eleven newly invented features. F08/F13 and C01–C12 remain historical findings within them. R33/fallback and R66/performance budgets are related cross-cutting checks, not a new N06 workstream. Original [research specification](../research/ASTRA_Deep_Research.md), [N03 completion](N03_COMPLETION.md), [browser acceptance](N03_BROWSER_ACCEPTANCE.md) and [DE-AC20-01](DE_AC20_01.md) retain authority.

## Request and lifecycle behavior

Page-scoped GETs are cancelled when their page, crew or reception view changes. Session-wide reads and explicitly authorized writes may span navigation, but all requests are aborted on session end or page suspension. Cancellation does not prove rollback of an already received server write. Server IDs, authorization and persistence remain authoritative.

A response delivered after cancellation must never be applied, even if a test transport ignores its AbortSignal. Suspended pages close streams, dispose scene and domain runtimes, cancel task timers, and stop making heartbeat requests. Restoring a cached page marks current data unavailable until authenticated source refresh; it restores the landing scene for an unauthenticated cached page. A response from an earlier session cannot populate the new session.

Source time, host transport freshness and Earth reception remain distinct. Missing, stale and unavailable observations stay Gray/UNKNOWN; recorded N02 evidence remains visible with its original identity. All source/projection/clinical eligibility rules stay unchanged.

## Authorized integration surface

- N02: actual readiness, persisted alerts/cases, human acknowledgement, queue and delayed Earth receipt. N03 does not create detector decisions or change thresholds.
- N08/N09/N10: existing fictional-source archive/replay, simulator and authorized context; private cognition stays self-scoped. Small disposable authored waveform fixtures are engineering inputs only.
- N11/N12: existing research registries and UI states, provenance, rejection/UNKNOWN and role restrictions. This browser mission starts no candidate fit, evaluation worker or forecast computation.
- N13/N14/N15: existing application research summaries remain distinct from the offline exact NASA corpus. No restricted corpus application integration, semantic promotion, Qwen inference or factual-support activation.
- N16: existing fixed recorded fixture viewer only; no sealed source, worker, operational dispatch or executed live graph.
- N05 retained asset viewer may render its existing static reference; N06 anatomy linkage/interaction stays deferred.

## Acceptance boundaries

Fresh real-browser checks cover connected workflows, negative controls, all eleven existing workspaces, four viewports, native 100%/200% zoom, keyboard focus, AX names, axe and conservative computed contrast bounds. Bounded checks do not establish spoken assistive-technology behavior or formal WCAG certification. Retained reports are labeled historical, never counted as fresh.

Reference shell/API/DOM/frame timing and memory samples are diagnostics on the actual available browser. They cannot certify physical presented FPS, an undesignated minimum machine, a hard memory ceiling, a long-session soak, the N17 physical offline/PWA gate or future N06 scenes. See [physical acceptance procedure](N03_AC20_PHYSICAL_ACCEPTANCE.md).

Formal N03 remains **Partial** while AC-20 is Open / Unverified. Other module statuses and source/review/release gates are preserved. End authority at this mission's delivery; no automatic N05/N06 or other workstream.
