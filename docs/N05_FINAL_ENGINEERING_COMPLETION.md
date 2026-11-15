# N05 full renderer engineering completion — 2026-11-05

**N05 FULL MODULE MISSION RESULT: ENGINEERING COMPLETE WITH EXTERNAL GATES.** Formal **N05 remains In Progress**. N03 remains Partial/AC-20 Open / Unverified; N06 remains Not Started—Deferred. The artifact directory retains the mission's 2026-11-04 start identifier; closure follows the owner's 2026-11-05 context.

## Exact scope and authority

Official N05 is **Anatomical assets and renderer foundation**. The controlling roadmap row maps **R06/R30/R33/R67**. [REQUIREMENTS](REQUIREMENTS.md) defines R06 as mission/crew persistence: N05 reuses N01's crew/session foundation and does not gain database write authority. R30 covers the translucent human/reference hierarchy; R33 progressive LOD/fallback; R67 asset/runtime/source versions. The original research renderer contract also includes functions allocated by the roadmap to **N06**: organ picking, physiological animation, medical highlighting and evidence mapping. Those remain inactive.

**4/4 N05 engineering portions implemented and qualified; 8/8 derived engineering audit areas qualified.** These are four official traceability families and eight explicitly identified audit areas, not invented official requirements. Full R33 physical acceptance is unverified. [Complete matrix](../artifacts/n05-engineering-20261104/requirement-matrix.json) records purpose, existing work, delivered work, inputs/assets/rights, frontend, controls, accessibility, performance, testing, governance and closure conditions.

CORE_AI_PRIORITY deferred N05 for scheduling priority and required explicit new bounded approval of remaining LOD/load/memory/performance work. The current directive supplies that resumption. No N05-specific exception proposal exists or is required for this step. **DE-AC20-01 already accommodates verified N03 evidence for N05**, and N04 is Complete. No new exception was invented/activated; no expired model/resource permission was renewed. [Contract](N05_RENDERER_ENGINEERING_CONTRACT.md) records the precise boundary.

| Official family | Delivered N05 portion | Qualification / remaining boundary |
|---|---|---|
| R06 | Canonical crew/session ownership reused; one generic renderer per selected profile, correct separate clinical DOM | PASS existing foundation; no persistence schema/API changes |
| R30 | Real five-mesh translucent reference hierarchy, camera/layers and connected UI | PASS engineering; anatomical fidelity unreviewed, generic coverage limited; N06 interactions absent |
| R33 | Progressive groups, two reproducible geometry tiers, bounded validation/cancellation, text/schematic and context/offline recovery | PASS authorized engineering; physical/hardware/full-DE acceptance remains UNVERIFIED |
| R67 | Immutable originals/GLBs, fixed local runtime/format, rights/attribution/hash lineage, cold rebuild | PASS; authenticity does not establish clinical accuracy |

## Assets, rights and genuine rendering

Reused **326 approved local BodyParts3D4.3/FMA3.0 OBJ originals**, **three unchanged GLB2 files** and pinned **Three.js0.186.1 / GLTFLoader / OrbitControls**. Source and derivatives retain **CC-BY-SA-2.1-JP**, original credit and limitations; runtime retains MIT notices. No acquisition, dependency installation, model/mesh duplication or original rewrite.

| Original derived GLB | Bytes | SHA-256 |
|---|---:|---|
| body.glb | 3,782,472 | `a348767f759c8eb909afb36f9c66238b0de35b8047df80edfd90aa611ce83e7a` |
| organs.glb | 3,643,388 | `6cfcc83ab4e6f04abe5520f5946bd60bcda581414092ae4bea2a732c72d30443` |
| skeleton.glb | 8,264,480 | `1f6b8e5a8811f181688512f39e6b3ca56696d413af03a0cec489d8093cdd55f0` |

Full source identity, original member IDs, hashes, uniform mm/Z-up→m/Y-up transform, bounds, rights and source limitations are preserved in the [source audit](../artifacts/n05-engineering-20261104/source-audit-01.json), original manifest and registration. Source geometry covers a generic adult male envelope,304 skeletal elements, three selected heart chamber-wall surfaces and nine elements per lung. **Whole-heart coverage is incomplete; no individual astronaut reconstruction or clinical accuracy is claimed.** Independent anatomical review has not occurred; [review-ready packet](N05_REFERENCE_REVIEW_PACKET.md) and blank form contain no approvals.

The viewer loads real local geometry and creates actual WebGL2 draw calls. Neutral material colors identify reference surfaces and never encode N02 severity. Existing N04 appearance/navigation/crew charts remain. The retained schematic is separately labeled; its old behavior is not new N06 authority.

New `astra.reference-lod.v1` derives **663,277 detail triangles / 253,117 coarse triangles** in memory. Quantization uses8mm skin,6mm skeleton and3mm organs, keeps each original element separate, removes degenerate/duplicate triangles and retains any collapsed tiny element's original surface. All326 source elements remain represented. These are visual approximations, not validated anatomy. No extra GLB is stored or transferred. Automatic LOD follows panel width/performance preference; explicit detail/coarse choices work. Pixel quality and reduced motion remain independent.

Progressive body→organs→skeleton loading has pinned canonical manifest identity, exact file length/SHA and strict plain-GLB prevalidation before the loader. Both LOD tiers derive after each existing approved GLB download; progressive presentation is by source group, without a claim of reduced transfer latency. External buffers/images/materials/decoders/animations and malformed ranges are rejected. Parsing is bounded to the approved local profile, not general arbitrary uploads. Coarsening yields/checks cancellation; stale generations cannot attach.

Camera controls provide genuine pointer orbit, one-finger rotation/two-finger pinch, native keys, bounded zoom/reset and independent visibility layers. Quality selection and explicit reload work. N05 consumes **no physiological input**: `update()` retains nothing and diagnostics declare N06 INACTIVE. There is no picking, clinical hover/selection, alert/model/agent mapping or medical animation.

## Lifecycle, recovery and accessibility

One demand-frame owner; hidden/offscreen suspension; both geometry tiers, materials/textures, render lists, controls/listeners/observers and source requests are disposed. A load deadline is cancelled immediately even if a transport never settles. Explicit reload preserves keyboard focus on the fresh canvas. Context loss becomes text; reload creates a **fresh context**, not a claim of restoring the lost driver context. Missing/corrupt sources preserve monitoring/history. No renderer persistence ledger is required: fixed source identity rebuilds state after route/reload/cold process.

The first cleanup test incorrectly equated undeleted texture handles with a leak. A [preserved diagnostic](../artifacts/n05-engineering-20261104/cleanup-diagnostic-01/report.json) proved normal buffer/program deletion and Three.js internal fallback textures retired by context loss. Final accounting separates explicit deletion and invalidation: **zero valid buffers/programs/textures, zero live contexts and zero pending animation callbacks** after repeated unmounts; zero buffers/programs left for invalidation,42 internal texture handles invalidated. This does not certify driver-memory reclamation timing or hard peak GPU usage.

Loading/status text, source limitations, opaque contrast-safe backing, named controls, visible focus,44px layer/camera targets and textual fallback remain usable independently of 3D. Final native100% and200% checks cover1920×1080,1366×768,768×1024 and390×844, with **120 final native Tab checks**, no document overflow, axe violations or unresolved audited contrast bounds. These are bounded panel checks, not spoken screen-reader/physical touch-device or formal WCAG certification.

## Actual execution and tests

- [Final browser06](../artifacts/n05-engineering-20261104/browser-06/report.json): **11/11 groups PASS**, installed Chrome156.0.8078.80. Actual mesh/LOD/native pointer/touch/pinch/keyboard/zoom/layers, missing/corrupt asset, context/reload, cancellation/disposal, session handlers, role/crew denial, source latency and offline/server recovery. No captured JavaScript errors.
- [Native200%](../artifacts/n05-engineering-20261104/browser-zoom-01/report.json): **5/5 PASS**. Four final reflow/a11y audits and60 native Tab transitions; a further60 at100% in browser06. Earlier browser02 repeats four additional audit executions and is not added as distinct viewport coverage.
- [Reference browser02](../artifacts/n05-engineering-20261104/browser-02/report.json): **14/14 PASS**, including six warmed60s active-camera/source trials. Its steady rendering/LOD code matches final behavior; later load-timer cleanup is covered by final units/browser06. No repeat of expensive trials merely to change captions/deadline ownership.
- These three qualification reports contain **30 passing group executions /21 distinct definitions**. Separate diagnostic evidence is not added to that count. Initial failed browser01/03/04/05 remain immutable: raw texture accounting, another valid browser-cache copy, recovering a deliberately closed server's null address, then a transient DOM lookup during reload. The shared runner now recovers only its last owned port and optionally reloads before checking readiness; normal callers keep their prior behavior.
- [Automated QA](../artifacts/n05-engineering-20261104/qa-summary.json): **475 broad passes**, **70 final affected passes**, **476 distinct latest passes /0fail/0skip** after removing69 overlaps. Genuine positive/negative tests cover all five real meshes, all originals, deterministic coarse hashes/bounds, tiny-element preservation, unsafe GLB profiles, cancellation, both-tier disposal, never-settling transport and N06 nonactivation. N01/N02/N03/N04 and relevant N08–N16 frontend/offline boundaries passed. No restricted native model/N16 suites executed.
- **284 JavaScript files** pass final syntax/local-import checks. Two independent **cold Node processes** verify all original/asset hashes and reproduce exactly the same source/LOD identity `4b20cbb6d86180be8f447524336dca78fb8cb6ed1cb4d6e178e6b10c6dd8dee1`. This is deterministic rebuilding, not independent anatomical validation or zero computation.

The offline test actually stops the owned disposable server, renders approved cached assets while health remains Gray/UNKNOWN, removes the asset from both HTTP/cache storage to force rejection, and cold-restarts the same synthetic store/session before recovering the verified model. This is local-server/cache evidence, not OS-wide physical Internet-off or full N17 acceptance. The filename `n05-mobile-accessible.png` in retained reports was captured after returning to1366×768/reduced motion; do not attribute it to390px. Quantitative audit records contain exact viewport dimensions.

## Performance and resource limits

[Measured summary](../artifacts/n05-engineering-20261104/reference-performance-summary.json): reference Windows/Ryzen5 7430U/14.86GB RAM/AMD Radeon, ANGLE Direct3D11 driver31.0.21925.1001, actual installed headless Chrome. This machine is **not owner-designated minimum hardware**.

- Six warmed trials last **60.51–60.78 seconds each**; actual scripted camera movement traverses the input/renderer path while all six fictional crew are generated/delivered at one-second manual source steps. Detail/coarse rAF p95 is **17.0–17.1ms**. Full distributions/maxima and positive GPU draw progress are saved; **rAF/draw calls are not presented FPS** or proof of the every-second physical ≥30FPS criterion.
- First reference body group ready **900ms**; full five-mesh/two-tier ready **4,166.6ms** in the reference trial. This is progressive model loading, not a claim that full cold geometry loads within the separate warm-shell3s budget. Decode/coarsening stages and final cold samples are recorded.
- Loaded-camera source-to-clock DOM **p95 44.8ms**,20 actual HR values compared with backend. This includes control/source/SSE time; it is not visible paint certification.
- Exact combined critical graphics **19,467,297 bytes /20,000,000 cap** using the preserved budget formula: all anatomy/Earth/vendor files plus their runtime/helper/CSS. No extra mesh tier payload. Typed geometry for both tiers is **21,306,312 bytes**, a separate decoded-memory quantity, not transfer size or GPU peak.
- Maximum observed browser load JS heap **131,786,033 bytes** from roughly100ms polling; excludes external/GPU buffers. Fixed-local audit sampled Node RSS **193,036,288 bytes**. Cold audit **16,895ms**, identity matches. Sampling/OS process maxima are not universal hard ceilings.
- Largest qualified temporary SQLite after checkpoint **88,014,848 bytes**, removed. Eight browser launches all closed owned browsers/profiles/databases; no DB snapshots, original/model copies or historical cleanup. No Qwen, N16 source/worker, new N11/N12 job, downloads or dependency installation.

**Physical AC-20/full-N05-DE presentation and peak GPU certification remain UNVERIFIED.** No actual designated device/owner acceptance exists. [DE-AC20-01](DE_AC20_01.md), N06 integration and N26 final revalidation remain unchanged; no threshold/protocol waiver. Anatomical fidelity review is unperformed, and no clinical use is released.

## Preservation and formal closure

[Protected preservation](../artifacts/n05-engineering-20261104/protected-preservation.json): **8,892 old files freshly hash-unchanged**, no mismatch. Large/model/database historical records are explicitly retained without restricted-source access, not falsely rehashed. Approved anatomy originals/GLBs are separately freshly verified. N03/N04 and N07–N16 history, source/review state, N11 rejection, N15 inactive rules and N16 restrictions remain intact.

[Final validation and changed-file inventory](../artifacts/n05-engineering-20261104/final-validation.json) record exact source/evidence hashes, added/modified files and artifact growth. Six intended existing code files changed: `app.mjs`, `anatomy.mjs`, `anatomy-runtime.mjs`, `anatomy.css`, `sw.js` and the shared browser runner. Added runtime LOD helper, N05 browser/audit tooling, tests and three documents. Seven governance records receive explicit N05 addenda/current-row changes; unrelated rows and historical bodies are preserved. Backend/detector/acknowledgement/Earth/source/runtime vendor/model files are unchanged. New N05 artifact growth: **11,533,052 bytes** (11.00 MiB), including failed attempts, six compact trial records and preservation manifests. No old artifact was deleted.

**N05 In Progress — authorized engineering complete with external gates; STOP.** This mission resolves N05's scheduling deferral only for the approved work. N03 remains Partial/AC-20 open; N04 remains Complete. N06 stays Not Started—Deferred: the renderer foundation is available for a future proposal, but N05's formal conditions, N06's original prerequisites and explicit implementation authority remain. No automatic N06 or other module.
