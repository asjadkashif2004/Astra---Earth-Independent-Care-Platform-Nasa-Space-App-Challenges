# N06 synthetic anatomy linkage — v1, 2026-11-05

Authority: the owner's separate explicit activation of existing **DE-N06-SYNTHETIC-01**. This permits one consolidated synthetic mission before formal N05 closure. N05 stays In Progress, N03 Partial, AC20 Open / Unverified. No independent anatomical/clinical approval, production release, N11/N12 promotion, N15 rule/inference or N16 worker/agent authority follows.

The original nine traceability rows are R28/R31–R33 and AC02–04/08/20. Their original criteria remain unchanged. Engineering evidence for the AC20 measurement/fallback portion is distinct from the unperformed designated-machine physical acceptance. There is no claim that reference rAF timing satisfies AC20.

## Immutable mappings and assets

`astra.n06.link.v1` fixes seven navigation records. Five use actual verified N05 meshes; head and thorax are explicitly conceptual contexts, not fabricated geometry.

| Region | Actual mesh | Allowed scalar context | Eligible archive channels |
|---|---|---|---|
| cardiovascular | reference.heart | heart_rate [/min], hrv [ms] | ECG, PPG |
| respiratory-left | reference.lung.left | respiratory_rate [/min], spo2 [%] | RESP |
| respiratory-right | reference.lung.right | respiratory_rate [/min], spo2 [%] | RESP |
| body | reference.body | temperature [Cel] | none |
| skeleton | reference.skeleton | none; UNKNOWN | none |
| head | none; unavailable precise geometry | completed synthetic sleep_duration [h] | none |
| thorax | none; conceptual | heart_rate, respiratory_rate [/min] | ECG, RESP |

Mappings retain units, source contract, version, authorized fictional crew scope, quality requirements and explicit limitations. Exact mapping validation rejects missing/duplicate identities, unsupported meshes/metrics, changed units/source/version or extra fields. No caller supplies a filesystem/model path, SQL selector, mutable mapping or real source. Source meshes remain unchanged: 326 licensed BodyParts3D elements, three pinned GLBs, five surfaces/groups and local Three.js0.186.1. Generic male reference geometry is not a personal reconstruction. The heart is incomplete; no separate head/brain mesh exists.

## Read-only backend

`GET /v1/crew/{CREW-01..06}/anatomy` reuses existing authentication/read permission and astronaut self scope. It is demo-only; writes return405, missing/expired identity401, wrong role/crew403, malformed inputs422 and missing crew404. Unsupported/duplicate query keys reject. Accepted options are:

- `region`: exact immutable navigation ID; defaults cardiovascular.
- `before`: canonical ISO UTC milliseconds, not later than source mission time. This is both source and knowledge cutoff; defaults mission now.
- `recording`, `channel`, `position_ms`: only a verified same-crew N08 recording/channel permitted by that region, bounded integer archive cursor within original duration. A channel/cursor without a recording rejects.

The response includes schema, crew, mapping/version, source/knowledge cutoff, separate host read timestamp, current-synthetic/historical mode, metric quality/eligibility, bounded history, N02 evidence/acknowledgement state, N08 provenance/window and N09 source/run/frame identity. No N06 persistence schema or new write endpoint is needed: projections recompute from existing durable producer records.

Each scalar must pass the existing telemetry schema, metric/unit/crew checks, verified integrity and synthetic provenance. Both canonical receipt time and server-owned `mission_received_at` must be known by cutoff. Future, missing, malformed, suspect, artifact, invalid-unit and stale observations return UNKNOWN/null; no invented fallback reading. Freshness retains the existing `max(5000ms, 3 observation periods)` rule. Current values/motion are also withheld when monitoring readiness is unavailable. Per-observation coverage0/1 denotes eligibility, not confidence or a claim of complete historical coverage. History retains at most180 frames and explicit missing values.

N02 evidence is filtered to mapped metrics and the selected crew/cutoff. Later acknowledgement is withheld in historical replay. N06 cannot generate, acknowledge, resolve or suppress alerts, alter thresholds or change Earth delivery. Recorded evidence does not locate organ damage or establish an all-clear. N08's own role/owner/hash/channel/revision/quality checks remain; raw waveform denial is separate from scalar read permission. Up to16 eligible source summaries and one200-bin window are returned. The producer's64-revision/8MiB retention/integrity bounds remain unchanged.

Waveform archive origin, cursor and knowledge time remain explicit. N06 displays actual extrema/gaps/units/sampling rate and preserves original hashes. Independent archived waveforms are not silently synchronized to current scalar HR/RR. HR-driven anatomy/replay timing is qualified; no authentic ECG, validated beat detection or clinical waveform synchrony is claimed. N09 uses its actual source/knowledge replay interface, selecting the eligible historical run across resets and showing state known by cutoff. No labels or private N10 cognition/check-in history are introduced as inference inputs.

## Renderer and frontend

N05 remains usable as a standalone reference renderer when `linkage` is absent. The authorized Crew Health integration explicitly enables N06. It adds raycasting against actual visible meshes, neutral selection and equivalent native keyboard/buttons. Camera, touch/pinch, layers, LOD and reset remain independent. A selected region updates the adjacent health panel and mapped historical trend. Unsupported bone measurements or precise head geometry remain UNKNOWN/unavailable.

Heart/lung transforms are small illustrative source-rate cycles about each mesh's own center. Phase accumulates at source-time rate changes; repeated timestamps do not double-integrate, seeks re-anchor deterministically and unreliable intervals freeze. Host interpolation uses the declared mission-clock speed, bounded to5host-seconds and each signal’s remaining source-freshness horizon. Source-rate updates integrate the actual valid source interval; a gap exceeding freshness re-anchors instead of inventing intervening cycles. Motion stops when the source is not refreshed. Reduced motion neutralizes cyclic transforms. No model, diagnosis, treatment rule, disease animation or organ severity heatmap is used.

Only one renderer-frame owner exists. Offscreen/hidden/suspended views stop rendering; unmount disposes listeners, observers, both geometry tiers, controls, materials, GPU handles and frames. Context loss yields text; explicit reload creates a fresh context. Textual region/metric controls continue without WebGL. Renderer-frame counts and multiple GPU mesh draw calls are distinct measurements.

The panel uses existing API/session cancellation plus a per-panel abort controller, request generation and trusted crew/page/view checks. A late transport response cannot repopulate a disposed or different-crew panel. Source refresh is driven by existing snapshots/health, never per-frame HTTP. No fresh onboard details are exposed through Earth view. Navigation stores only compatible crew/region IDs in sessionStorage, never private measurements. New API data remain uncached by the existing service-worker policy.

## Acceptance and resources

Use real authorized producer execution, actual HTTP/application controls and installed Chrome; no downloaded browser/model/asset. Tests must cover positive source values, UNKNOWN, invalid mappings, roles/crew, source/knowledge cutoff, N02 noninterference, waveform integrity, N09 reset/replay, cold recovery, cancellation, context/fallback, responsive/native200% and cleanup. Read noninterference uses actual SQLite `total_changes()`, not an unsupported driver property. Cold recovery compares source projection hashes and committed row counts; recomputing a read projection is not replaying source commitments.

Existing request256KB/rate/deadline controls and graphics≤20,000,000bytes remain. Fixtures use OS-temp fictional databases, no retained snapshots or copied GLBs/models/PDFs. Browser campaigns have15minute outer deadlines; ordinary fixture corrections are recorded within the consolidated mission rather than treated as new permissions. The initial three-launch estimate is not an owner resource cap; all actual launches/failures/cleanup/storage must be disclosed. Never retry a genuine authorization/integrity violation.

Report native-click, source-to-DOM, HTTP/read/cold latency, observed browser/Node memory, temporary storage and cleanup separately. The retained simple-read p95<200ms and source-to-UI p95<500ms targets are reference diagnostics. Actual designated-machine AC20 still requires the unchanged three warmed60second1920×1080 protocol, physical presented-frame evidence, minimum30FPS and owner acceptance; final N26 revalidation remains mandatory. No synthetic test can close anatomical fidelity, clinical/source, prerequisite or release review.
