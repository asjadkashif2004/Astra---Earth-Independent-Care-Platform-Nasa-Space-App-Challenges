# N06 final anatomy and health linkage engineering completion — 2026-11-05

**N06 FULL ENGINEERING MISSION RESULT: ENGINEERING COMPLETE.** All **9/9 authorized synthetic engineering portions** are implemented and qualified. The nine original traceability rows are retained. **Original full acceptance is8/9: physical AC20 remains UNVERIFIED.** Engineering qualification of measurement/fallback tooling does not satisfy that original physical criterion. **Formal N06 remains In Progress.** N03 stays Partial; N05 stays In Progress; anatomical fidelity, clinical/source, hardware and release gates remain open.

## Authority and preserved history

The owner's separate explicit dependency decision activates the exact existing **[DE-N06-SYNTHETIC-01](DE_N06_SYNTHETIC_01.md)** for this synthetic mission before N05 formal closure. [Activation record](../artifacts/n06-engineering-20261105/activation.json) binds the approved proposal hash and owner directive. No substitute/unrelated exception, expired native allowance or scientific support rule was activated. Original N01/N02/N05 prerequisites remain release/formal gates; only this synthetic sequencing is accommodated.

The [previous BLOCKED report](../artifacts/n06-engineering-20261105/N06_BLOCKED_PREFLIGHT_REPORT.md) is preserved byte-for-byte. All [preflight evidence](../artifacts/n06-preflight-20261105/final-validation.json), earlier failed tests/browser attempts, decisions, source hashes and review states remain intact. The usage-limit interruption stopped one approval review before its command executed; the owner resumed, and the same authorized edit subsequently passed approval. It was not an unsafe-action rejection or an authorization bypass.

## Exact official purpose and acceptance matrix

N06 is **Data-linked anatomical interaction / Anatomy and Health Data Linkage**: continuous source-bound HR/RR timing, actual mesh/region picking, layers/labels/evidence focus, conceptual head/thorax navigation, historical/current transitions, keyboard controls and recovery. Official references are **R28/R31–R33 and AC02–04/08/20** in MASTER_PLAN, REQUIREMENTS, the primary project specification and DE-AC20-01. Four requirement families and five overlapping acceptance criteria are nine traceability rows, not invented independent feature groups.

[Full matrix](../artifacts/n06-engineering-20261105/requirement-matrix.json) retains the source, prior foundation, delivered behavior, inputs/outputs, rights, backend/frontend, privacy, tests, authority and formal closure condition per row. [Implementation contract](N06_SYNTHETIC_ENGINEERING_CONTRACT.md) specifies actual schemas and limits.

| Row | Implemented and qualified authorized engineering | Evidence / original gate |
|---|---|---|
| R28 | Crew-scoped source/knowledge replay, mapped history, archive cursor, cancellation and current/historical transitions | N06 tests; browser08; temporal01; cold proof |
| R31 | Real reference heart/lung illustrative transforms; valid30second cadence integration, rate continuity, bounded host/source clocks and quality freeze | Exact browser HR/RR arithmetic; final phase tests |
| R32 | Actual visible-mesh ray picking, fixed mappings, neutral selection, accessible equivalent controls, layers and context labels | Native pointer/touch/keyboard; mapping negative controls |
| R33 | Preserved progressive groups/two LOD tiers, camera, fallback/context/reload, both-tier/GPU/frame disposal | Fresh N05 regressions and browser recovery/cleanup |
| AC02 | Selected fictional crew's actual source observations, adjacent details, mapped trends/history and refresh recovery | Actual server/application workflow; stale-response isolation |
| AC03 | Measured HR/RR source-time phase, explicit mission-speed scaling, deterministic replay cutoff | Browser expected/actual phases match; no fabricated ECG or arbitrary heartbeat |
| AC04 | Mapped N02 metric/event/source/timestamp/acknowledgement-state evidence, entirely read only | Genuine persisted N02 event; later acknowledgement absent from earlier replay; actual SQLite counter |
| AC08 | Missing/stale/suspect/artifact/unavailable values become UNKNOWN; current dropout freezes; historical UNKNOWN cannot reuse a later phase | API negatives, live browser dropout and temporal01 |
| AC20 | Measurement/fallback infrastructure and bounded real-browser reference diagnostics delivered | Engineering portion PASS; **original designated-machine physical acceptance NOT VERIFIED** |

All9engineering portions pass. The original AC20 threshold, three warmed60second1920×1080 protocol, physical presentation evidence, owner designation/acceptance and final N26 revalidation are unchanged. No reference result closes AC20 or N03.

## Actual mappings and verified assets

| Navigation region | Existing mesh | Authorized scalar context | Archive channels |
|---|---|---|---|
| Cardiovascular | reference.heart | Heart rate /min; HRV ms | ECG, PPG |
| Left/right respiratory | reference.lung.left / reference.lung.right | Respiratory rate /min; SpO₂ % | RESP |
| Body | reference.body | General temperature Cel | unavailable |
| Skeleton | reference.skeleton | UNKNOWN; no bone measurement | unavailable |
| Head context | No precise mesh | Completed synthetic sleep h; descriptive only | unavailable |
| Thorax context | Conceptual; no dedicated mesh | Heart/respiratory rate /min | ECG, RESP |

Five actual mesh identities and two explicitly conceptual contexts are used. No brain geometry, individual astronaut reconstruction, whole-heart fidelity or organ-specific measurement is invented. The heart contains three reference chamber-wall surfaces. All326original BodyParts3D elements, three immutable GLBs, source/license/attribution records and pinned Three.js0.186.1 are retained and freshly verified by the existing asset tests. Source/derivative CC-BY-SA-2.1-JP and runtime MIT notices remain unchanged. Hash integrity does not establish anatomical/clinical accuracy.

## Backend, temporal and privacy contracts

The working read-only endpoint is `GET /v1/crew/{id}/anatomy`, with exact immutable `region`, canonical nonfuture `before` cutoff, and optional eligible `recording`, `channel`, integer `position_ms`. It returns `astra.n06.link.v1`, trusted crew scope, mapping/version, source/knowledge cutoff, separate host read time, units, event identity, quality, bounded history, N02 evidence, N08 window and N09 run/frame identity. Missing/expired sessions401, denied role/crew403, invalid inputs422, missing crew404 and write attempts405 are genuine errors. Valid unavailable data returns explicit UNKNOWN/null, not a fake successful measurement.

Every scalar passes the producer telemetry schema, metric/unit/range, source identity, synthetic provenance and verified integrity checks. Canonical receipt and server-owned mission acquisition time must both be known by cutoff. Existing per-metric freshness remains `max(5000ms, three observation periods)`. Current values/motion are withheld when monitoring readiness fails. Point coverage0/1 denotes observation eligibility, not confidence or complete historical coverage. History is bounded to180frames; no future source/receipt information is used.

Authenticated N01 read/crew permission and astronaut self scope are reused. N08 raw-waveform permission remains separate: scalar readers without waveform permission see DENIED. Untrusted regions/paths/channels never become arbitrary database/file selectors. N10 raw private cognition/check-ins/consent history are not read or exposed. No fresh onboard details are fetched in Earth view. Session storage retains only compatible crew/region IDs. Request aborts, session/page/view ownership and monotonically checked request generations prevent late crew data from reappearing.

N06 introduces no database schema, persistence ledger or write endpoint. Its projection is reproducible from durable producer records; source IDs/hashes and mapping versions supply lineage. Reads do not prune, correct, import, acknowledge or commit records.

## N02/N08/N09 integration

**N02 PASS:** actual persisted alerts/evidence are filtered by crew, mapped metric and cutoff. Later acknowledgement is withheld from historical reads. QA creates a real detector event and an authored acknowledgement through the existing N02 fixture path; this is not independent human medical review. The N06 region panel has no acknowledgement/write control. The original N02 human-acknowledgement UI retains its existing role checks. Alerts, thresholds, queue and Earth-delivery behavior remain owned by N02. Actual SQLite `total_changes()` and state comparisons confirm no read-side mutation.

**N08 PASS for authorized archive reads:** original/revision/normalized integrity checks, same-crew channel mapping, sample rate/units, source origin, knowledge time, bounded extrema, missing intervals and archive cursor use the actual producer implementation. Missing or unauthorized recordings remain UNKNOWN/DENIED. The linked viewer does not create recordings, infer BP, invent live ECG, promote experimental peaks or claim clinical beat synchronization. Independently archived waveform time is explicitly separate from current scalar HR/RR; the producer's original inactive scientific/twin gate and formal source obligations remain intact.

**N09 PASS:** selected-crew observations and actual run/frame hashes, source/knowledge timestamps, elapsed time and state known by cutoff are read through qualified interfaces. Pause/resume/stop/reset and historical selection across run resets were executed. Definitions, thresholds and authored labels are unchanged. No labels or private cognition become inference inputs.

N11 rejection, N12 zero operational promotions, N13/N14 source/review policy, N15 inactive factual support/native restrictions and N16 sealed-source/operational agent restrictions remain. Qwen and N16 designated workers were not executed. Bounded existing N11 pure-JavaScript algorithm regressions use temporary authored fixtures; they do not promote a model or alter historical model evidence.

## Frontend and renderer behavior

The existing Crew Health model remains real Three.js/WebGL2 geometry. Actual mesh picking and neutral selection update the adjacent source-bound details and mapped trend. Equivalent region buttons support keyboard/touch; clear, camera/orbit/zoom/reset, layers, LOD, explicit reload, historical frame/current return, recording/channel/cursor and retry controls function. Synthetic/research, missing data, unavailable geometry, source timestamps and scientific limitations are visible.

HR/RR transforms are illustrative and follow source time. The UI states the declared mission-clock multiplier; the reference workload uses1× to match its one-source-second/host-second steps. Full valid source intervals are integrated, rather than silently clipping30seconds to5seconds. Large uncovered gaps re-anchor. Host interpolation ends at5host-seconds or the remaining freshness horizon. Current dropout retains the last visible phase; unknown historical replay starts without a future phase. Reduced motion neutralizes cyclic transforms.

Standalone N05 without the explicit linkage option still consumes no physiological data. Immutable geometry/LOD/source rights, camera and disposal are preserved. Context loss or unsupported WebGL yields usable source/region text; explicit reload creates a fresh renderer. No independent alert, pathology, disease heatmap or treatment rule exists.

## Executed QA, real browser and recovery

[QA summary](../artifacts/n06-engineering-20261105/qa-summary.json): **633 distinct latest passes /0fail /0skip**. Broad626passes, affected156passes and final101passes overlap; their raw totals are not added. The final set includes65N06-specific controls. Existing preflight228 are not counted again. [Final syntax](../artifacts/n06-engineering-20261105/syntax-final-03.txt): **291JavaScript files**,0syntax/local-import errors. Positive controls vary actual crew/source data; negative controls reject invalid mappings, schemas, units, source/cutoff/role/crew, stale/unknown and malformed inputs. No restricted native campaign is part of this count.

[Browser summary](../artifacts/n06-engineering-20261105/browser-summary.json): installed **Chrome156.0.8078.80**, **46passing qualification group executions /35distinct definitions**,0qualification failures/console errors:

- [Full08](../artifacts/n06-engineering-20261105/browser-08/report.json):25/25, including exact source30second phase arithmetic, actual mesh picking, data/monitoring/history/waveforms, scenarios, crew switch, recovery and bounded reference workload.
- [Native200% zoom04](../artifacts/n06-engineering-20261105/browser-zoom-04/report.json):15/15. Four physical viewports at native100% plus the same four at200% produce8final layout combinations,216native Tab checks,327contrast bounds and zero axe violations. This is bounded programmatic/browser evidence, not spoken-AT/WCAG certification or a physical touch-device test.
- [Latency03](../artifacts/n06-engineering-20261105/browser-latency-03/report.json):4/4, actual native/source/HTTP measurements, API503/403 retry and unsupported-WebGL text recovery.
- [Temporal01](../artifacts/n06-engineering-20261105/browser-temporal-01/report.json):2/2 directly qualifies the final renderer's historical-UNKNOWN phase isolation/current return and cleanup. Its small final conditional fix leaves the other tested rendering branches unchanged.

All16browser launches, including failed intermediate fixtures, retain their reports/cleanup. Early failures involved asynchronous readiness/offscreen diagnostics, a held-packet latency fixture, GPU draw calls incorrectly counted as frames, and a genuine narrow-layout evidence-table focus defect. The table now has a named focusable scroll region and visible outline, with regression coverage. The source-clock/unknown-phase defects are repaired and directly tested. No original failure was overwritten, no scientific threshold was tuned and no browser binary was installed.

[Actual compact qualification](../artifacts/n06-engineering-20261105/qualification-final.json) executes N09 source generation, genuine N08 fixture commitment, validation, all-crew/region reads, structured source-bound results, persisted producer state and a separate cold Node process. Projection hashes match after excluding the intentional host read timestamp. Committed counts remain **168telemetry points,558snapshots,5N09events,1waveform source,0risks,3messages** across restart. Cold reads cause0writes and0new source commitments. Recomputing a read projection is recorded explicitly; no source ingestion or model execution is replayed. The temporary store is removed.

The earlier cold audit's hashes actually matched; its mutation count used an unsupported driver property and serialized as null. Corrected tests use actual SQLite `total_changes()`. Both failed diagnostics and their field-level comparison remain preserved.

## Observed performance and resource limits

- Native click→panel DOM p95 **36.5ms**;20source emissions→panel DOM p95 **84.1ms**;20actual HTTP reads p95 **31.4ms**,0SQLite change delta. These exclude pre-click runner settling, include stated control/SSE overhead and do not certify physical paint.
- Bounded84all-crew/region direct reads p95 **82.035ms**; source pipeline read **88.739ms**, startup **340.395ms**, cold process **1233.468ms**. The full compact run took **7412.322ms**.
- Active six-crew reference workload **61.319s**, **3680 actual renderer frames /18400mesh draw calls**, rAF p95 **16.9ms**. Manual source/declared clock both1×. Neither rAF nor renderer calls are physical presented FPS. Earlier reference runs and driver-inclusive selection timings remain retained, including observed outliers; they are not substituted for native event→DOM measurements.
- Maximum observed post-load browser JS heap **73,372,823bytes**; sampled qualification-parent RSS **170,512,384bytes**. Browser values exclude external/GPU allocations; parent samples exclude browser/child. No hard peak/system/GPU guarantee is asserted.
- Compact qualification database **7,761,920bytes**, removed; no SQLite snapshot retained. Final GPU checks show0valid buffers/programs/textures,0live contexts and0pending RAF after unmount. Internal Three.js fallback textures retired by context loss are distinguished from explicit deletion; driver reclamation timing is not certified.
- Combined critical graphics **19,486,988/20,000,000bytes**, including new N06 client helpers and mapping. No new GLB/texture, original PDF/model copy or source download. New artifact growth: **11,543,135** bytes. Exact final inventory/cleanup/hash accounting is in [final validation](../artifacts/n06-engineering-20261105/final-validation.json).

Physical designated-minimum AC20, anatomical expert fidelity, authentic source/clinical applicability and release acceptance remain open. The reference machine/browser is not designated hardware, and sampling is not a quota or an external review.

## Preservation, changes and formal status

[Preservation](../artifacts/n06-engineering-20261105/protected-preservation-before-docs.json) freshly verifies8,976unchanged inherited files before documentation addenda and enumerates only intentional code/exception changes; no unexpected/missing file.37large/model/database records remain retained without byte re-verification by the preservation pass. Original GLB/source/license/vendor/review/model-decision/history files remain unchanged. Final [changed-file inventory](../artifacts/n06-engineering-20261105/changed-files.json) separates N06 integration, tests/browser tooling and explicit governance/report changes. No historical deletion or operational/sealed-source access occurred.

Formal **N06 In Progress — synthetic engineering complete with external gates**. N01/N02/N04 remain Complete; N03 Partial; N05 In Progress. N07–N16 formal source/review/native/operational/release conditions remain. N08/N09 engineering compatibility gains a tested N06 consumer, without completing their scientific gates. N16 operational integration remains inactive and no downstream module is started. Existing anatomy/source/clinical review forms remain unapproved.

## Presentation navigation

1. Start ASTRA using its existing setup/runbook; sign in with an authorized synthetic role.
2. Open **Crew Health**, select a fictional crew member and keep **Reference anatomy** selected.
3. Pick a visible heart/lung surface or use the named region buttons. The adjacent panel shows actual permitted source values, units, quality, timestamps and N02 evidence.
4. Open **Region history and source-time replay**; choose a frame, then return to current synthetic time.
5. Open **Authorized synthetic waveform archive** only if a same-crew eligible recording exists. Choose recording/channel/cursor; absent sources honestly remain UNKNOWN. The viewer never invents or imports one automatically.
6. Switch crew and verify source identity updates; reload to recover compatible crew/region navigation. Use camera/layer/LOD controls or keyboard/text fallback as needed.

No region identifies disease or organ damage. Stop after this delivered N06 mission; no automatic model, source acquisition, operational agent, next module or hardware approval.
