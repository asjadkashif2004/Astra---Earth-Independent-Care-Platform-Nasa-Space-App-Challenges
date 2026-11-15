# ASTRA cinematic visual redesign proposal

Current scheduling note2026-10-23:[CORE_AI_PRIORITY](CORE_AI_PRIORITY.md) records the user's documentation-only priority change. N04 is Complete;preserve its approved visuals. N05-01 is delivered and retained;**N05 In Progress — Deferred;N06 Not Started — Deferred**. The anatomy phases,license/asset/interaction/accessibility/performance gates below are retained for later explicitly approved resumption,not waived or authorized now. Core scientific acquisition/corpus/retrieval/evaluated AI support has priority under existing dependency gates. N03 Partial and AC-20 Open / Unverified remain;N06 integrated evidence/N26 final revalidation are still required. Earlier implementation/unapproved/status wording below is historical. No visual/production/QA change is made by this notice.

N04 implementation update2026-10-18: the user subsequently approved phases1–2 below as the bounded N04 five-step execution plan. Shared native material/type/navigation styles, Landing, local NASA-textured Earth/clouds/lighting, schematic spacecraft/orbit/link and six-crew Overview are implemented. Source/acceptance evidence and remaining visual/performance gates: [N04_COMPLETION.md](N04_COMPLETION.md), [N04_ACCEPTANCE.md](N04_ACCEPTANCE.md). N03 remains Partial; AC-20 Open / Unverified. Phases3+ remain proposals requiring their own approval; N05 completion/prerequisite rules are unchanged. The original critique and design targets below remain user-observed findings and planned criteria, not automatic certificates of visual quality.

Date: 2026-10-18. **Artistic proposal only; implementation is not approved.** DE-AC20-01 is approved for documentation changes only;it permits N04/N05 to use verified N03 functional/browser/responsive/zoom/bounded-accessibility evidence without N03 Complete. N03 remains Partial;AC-20 remains Open / Unverified and a release blocker. The native ES-module/HTTP/SSE architecture remains in place. Every implementation phase still requires its module's separate explicit approval. See [DE_AC20_01.md](DE_AC20_01.md) for the approved provisional protocol and proposed stage gates.

## Evidence and classification

- **U01, user-observed:** the user opened Landing and Mission Overview in a Windows browser and reported the findings below. This supports those screens loading in that user's environment. Browser/version/viewport, console, role/session path, interactions and screenshots were not supplied. It does not establish full N03 acceptance.
- **S01, source-inspected:** actual app templates, CSS, SVG chart helpers and GLSL explain plausible contributors. Source inspection is not agent visual verification. No new browser screenshot was obtained during this continuation.
- **C01–C04, functional:** wrong replay/check-in breadcrumb, silent check-in request states, empty/error replay and provenance panel failure coupling were reproduced by selective template/event tests and repaired in N03. These are independent of artistic preferences.
- **B01, acceptance gap:** actual browser, four-viewport, native keyboard, contrast, graphics and recovery evidence remains open. See [N03_BROWSER_ACCEPTANCE.md](N03_BROWSER_ACCEPTANCE.md).

The user findings remain open artistic requirements owned by N04 unless a row says otherwise. No recolor or source-only change closes them.

## Landing critique

Current structure: `app.mjs:renderLogin` creates `.login-page`, a left `.login-visual` with brand, shader scene and absolutely positioned `.login-story`; a right `.login-form-side` holds a narrow role-selection form. `styles.css` uses a1.25fr/.75fr desktop split. The scene canvas and HTML are separate layers. These are reusable foundations, not a reason to rebuild.

| Finding | User observation | Source-inspected contributor / proposed response | Owner / mapping |
|---|---|---|---|
| U-L01 | Earth dominated by blue lighting | `scenes.mjs` Earth shader uses blue background/rim/orbit/ship vectors. Separate natural planetary shading from UI accent lighting; confine atmospheric blue to a thin physical rim. Do not make oceans violet. | N04; R26/R66 |
| U-L02 | Artificial-looking planet | Noise-based terrain/clouds are not geographic textures. Replace only the Earth material path with a licensed local texture pipeline, coherent terminator and independent cloud detail. Keep the current fallback until replacement passes. | N04; R26/R67 |
| U-L03 | Blue, repetitive starfield | Screen-grid hashing creates repeated point density with one blue tint. Use a sparse deterministic distribution, varied luminance/scale and predominantly neutral stars; avoid a continuous twinkling wall. This is decorative, not measured astronomy. | N04; R26/R29 |
| U-L04 | Flat/disconnected login panel | Separate grid column, plain form and independent backdrop create little material continuity. Place a smoky charcoal entry surface into the same light field, with a restrained directional edge and enough opaque backing for text. | N04; R29 |
| U-L05 | Insufficient depth, hierarchy/material/light | Similar surface values and uniformly small supporting type offer limited hierarchy. Use three depth levels, editorial headline/short mission statement, one primary action and quieter role/disclaimer metadata. | N04; R25/R29 |
| U-L06 | Basic prototype rather than premium mission control | A convincing whole requires composition, asset quality, typography, materials and interaction together. A blue-to-purple token swap does not address it. Acceptance requires user review of the rendered result. | N04; R26/R66/R68 |

Proposed desktop composition: roughly60% scene/mission narrative and40% entry area, aligned to one shared content grid. Earth is off-center with a credible lit limb, black negative space behind readable text, and restrained orbit geometry. The role form stays visible without scroll on the target laptop where feasible; it never covers essential text or depends on a camera animation. Keep “fictional crew / synthetic telemetry / local demo identity / not a medical device” near the action. Do not bury scientific boundaries in a decorative footer.

At tablet, reduce scene height and stack entry content where needed. At mobile, use a compact planet composition above a full-width form; no full-height empty hero before the entry button. The entry flow and role meanings remain unchanged.

## Mission Overview critique

Current `renderOverview` builds `.overview-top` (Earth and mission summary), uniform `.crew-grid` buttons and a `.bottom-row` containing environment/activity. `updateOverview` replaces live portions through focus-preserving `patchContent`; `packages/presentation.mjs` owns reception/readiness. Keep these contracts while changing presentation later.

| Finding | User observation | Source-inspected contributor / proposed response | Owner / mapping |
|---|---|---|---|
| U-M01 | Six repetitive crew cards | Each card has the same avatar/HR/mini-metrics/sparkline/footer template. Keep comparable readings in consistent positions, add quiet crew identity and selection depth, and emphasize actual active review with text/evidence. Do not invent differing values or arbitrary importance. | N04; R25 |
| U-M02 | Conventional SaaS sidebar | Fixed brand/nav/account column resembles an admin shell. Evolve it into a quieter mission rail with clear selected route and accessible labels, paired with a mission/time/reception command strip. Preserve every route and role boundary. | N04; R25/R29 |
| U-M03 | Simple, weakly integrated health traces | `sparkline` displays sampled synthetic HR trends, not ECG. Improve plotting hierarchy, observation times, quality gaps and baseline context; never style it as an ECG without waveform data. Real waveform work stays N08. | N04 presentation; R25/R28; N08 data |
| U-M04 | Flat Cabin Environment | Small four-value strip and static `.env-range` decoration imply little structure. Use a readable instrument strip, source/time/quality labels and measured warning evidence. Hide decorative gauges when unavailable; no fabricated safe ranges. Expanded exposure data stays N19. | N04 presentation; R26/R52; N19 science |
| U-M05 | Unsophisticated System Activity | Three service paragraphs provide limited operational hierarchy. Present explicit rows for core monitoring, optional enrichment and simulated Earth link, with freshness/state detail from existing contracts. A status board must not pretend to be a full executed-event log. | N04 presentation; R24/R27; N16 trace |
| U-M06 | Insufficient glass/depth/light/composition | Similar panels with uniform borders and limited surface variation flatten hierarchy. Distinguish a scene stage, monitoring plane and evidence drawer using restrained materials, spacing and light. Do not blur all the data. | N04; R25/R29 |
| U-M07 | Remaining generic blue influence | Explicit CSS hex colors remain in login, avatars, chart paths/bands, orbit overlays and comms; GLSL ignores CSS variables. Inventory semantic/decorative colors across CSS/SVG/GLSL before changing them, preserving clinical meanings. | N04; R29 |
| U-M08 | No strong mission-control centerpiece | Existing small schematic Earth and point spacecraft are insufficient for the requested focal composition. Make the orbital scene a credible orientation anchor while keeping crew/risk at reading priority. Full anatomy is a separate centerpiece in Crew Health. | N04 Earth/shell; N05/N06 twin; R26/R30 |

Proposed desktop layout: mission identity/time/reception strip; a wide orbital stage with adjacent risk/monitoring summary; a six-person comparison grid; an environment instrument strip and operational service board. The selected crew can receive one expanded evidence region while all authorized crew remain visible. A high-priority review takes precedence over decorative scene size. Earth-received mode must visibly carry event/receipt time and unavailable/cached labels throughout.

## Common workspace system and component architecture

Keep `renderPage`, `navigate`, `api`, request ownership, `present`, `canAct` and server authorization. Introduce small native template/style primitives under the existing web app when N04 is approved; no framework rewrite or new dependency is assumed. Proposed reusable pieces: mission heading/command strip, surface variants, measurement cell, quality/source stamp, semantic status badge, comparison card, chart frame, evidence list, source citation, loading/error/empty region and accessible action row.

Use existing `paint`/`patchContent` for live subtrees. Keep focused nodes and dirty forms stable. Do not wrap entire pages in replacing transition containers. Keep display-only objects separate from raw telemetry; no component derives a new medical score. A shared semantic token map must not map risk to decorative accent.

| Existing workspace / functions | Proposed composition within later approved scope |
|---|---|
| Overview / `renderOverview`, `updateOverview` | Orbital orientation, comparable crew grid, evidence-aware summary, honest environment/service instruments. |
| Crew Health / `renderCrew`, `updateCrew` | Large schematic/anatomical stage with visible “schematic” status until N05, metric/quality column, observation-time trend and traceable review evidence; selected crew identity remains pinned. |
| Health Agent / `renderAgent`, `updateAgent` | Cases/review primary; template/pending/failed/ack semantics explicit; reference workflow secondary until N16 executes tools. |
| Communications / `renderComms`, `updateComms`, `loadQueue` | Link controls separate from onboard monitoring; event/transmit/receipt timeline and queue status. No return acknowledgement/resend claim before N18. |
| Research Library / `renderKnowledge`, `updateKnowledge` | Readable query/answer/citation column and secondary corpus boundaries. No claim of full clinical retrieval or LLM. |
| Scenario Lab / `renderScenarios` | Clear deterministic control surface, seed, active scenario and ground-truth disclaimer; visually distinct from monitoring, permission-gated. |
| Evidence & Provenance / `renderSources` | Research documents, catalogue acquisition status, model evidence and restricted audit have independent surfaces/states. Existing repaired failure isolation remains intact. |
| Crew check-in / `renderCognitive`, `loadCheckins` | Calm personal task, large accessible target, explicit optional real user measurements, independent history states. Full longitudinal cognition remains N10. |
| Mission replay / `renderReplay`, `updateReplay` | Prominent historical timestamp/selected crew; disabled slider until observations exist. Full waveform/twin playback remains N06/N08. |
| System-admin audit / `renderSystemAudit` | System evidence only. Do not add medical preview to fill a sparse role-specific screen. |

## Earth renderer and asset strategy — N04 proposal

Prefer a bounded extension of `Scene` for Earth: retain its container, `update`, `size`, `requestPaint`, `dispose` and callbacks. Its current fullscreen shader can use local spherical texture sampling; a mesh renderer is not mandatory for this step. A future N05 renderer decision should not force a second N04 rewrite.

Candidate source: NASA's [Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/), checked as a source page on2026-10-18. It is a historical composite, not live planetary imagery. Check each selected asset's credits and restrictions against [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); third-party credits/identifiers are not automatically reusable. No assets were downloaded, licensed, approved or integrated in N03.

Start with a2K day map, small cloud/coverage texture and optional verified night layer; derive lower-resolution variants for constrained devices. Keep a local source/author/URL/date/license/attribution/hash/dimensions/bytes/transform manifest. Proposed Earth transfer budget≤4MB and combined critical3D≤20MB are design targets, not measurements. Check decoded texture/GPU memory separately; compressed transfer size does not equal VRAM cost. Do not ship giant archival textures at full resolution by default.

Use coherent directional sunlight, soft day/night transition, restrained ocean specularity and a thin approximate atmospheric rim. Clouds should have independent subtle motion only when enabled; no false weather claim. Orbit and spacecraft geometry are schematic mission context, never an actual tracked trajectory. Use sparse neutral stars with restrained warm/cool variation and no high-contrast repeating grid. Avoid postprocessing bloom as a substitute for credible materials.

## Digital-twin strategy — N05/N06 proposal

N05 owns lawful optimized human/organ assets, mesh hierarchy, compression/LOD and the renderer decision. No anatomical source is selected here; license review and actual inspectable geometry are prerequisites. Compare native rendering effort against a local, pinned Three.js or Babylon adapter then, preserving the existing Scene lifecycle contract and dependency-free fallback. Record the choice before changing architecture. N03 does not install those packages.

N06 owns region picking, keyboard equivalent inspection, continuous HR/RR phase, camera focus and evidence overlays. N08 later contributes replayed waveform beats. Display “schematic / visualization only” while geometry is schematic; no fidelity/clinical validation claim. A measured cardiorespiratory deviation can highlight a relevant measured domain, never an invented blocked artery or damaged organ. Missing/stale signals freeze or suppress linked motion and retain a readable reason.

Use charcoal background, limited translucent/holographic anatomy and distinguishable labeled regions; red/amber marks review evidence only. A cyan body material must not bleed into every application surface. Labels and findings remain HTML for readable/accessible inspection. No organ diagnosis derives from model appearance.

## Materials, typography, color and motion

Three material levels: void scene, smoky obsidian monitoring surface, raised graphite evidence/control surface. Use low-opacity neutral borders, a restrained upper directional highlight and soft contact shadows; avoid luminous outlines on every card. Blur only bounded noncritical decorative backplanes, with an opaque `@supports` fallback. Dense charts/tables need stable opaque contrast. Fixed blur layers can consume GPU bandwidth even when no JS animation runs.

Proposed type scale: display36–56px desktop/28–36px mobile; page headings24–32px; interface/body14–16px; metadata≥12px where possible; prominent numeric values24–36px with tabular figures. These are proposed design tokens, not current measured sizes. Use restrained uppercase for brief mission identifiers, sentence case for status/actions. Retain local system fonts until an explicitly licensed locally bundled font is selected; no remote font/CDN dependency. Do not trade readable safety disclaimers for display type.

| Use | Proposal / semantic constraint |
|---|---|
| Void/Obsidian/Graphite | `#050508` / `#111116` / `#24242C`: dominant scene/surfaces/structure. |
| Warm white/neutral gray | Main text and supporting metadata; verify actual composites, not just token swatches. |
| Solar Amber `#F3A64A` | Selection/light accent only away from status placement; Amber badge still means review/caution with text. |
| Nebula Violet `#9875E8` | Secondary navigation/mission accent; never an extra health severity. |
| Aurora Teal `#54C9B7` | Bounded interaction/system accent; actual healthy state requires backend support. |
| Red / Amber / Green / Gray | Preserve clinical priority and data-quality meanings. Icons/text and source/freshness back every status. Gray is never low-priority Green. |

Navigation feedback120–180ms; panel entrance180–260ms; optional camera travel450–700ms are proposed timing ranges. Keep status updates immediate and stable, not staggered through decorative entrances. Hover/focus uses a slight surface/edge change, not a large scale jump. Scroll/parallax is subtle, transform-only where practical, outside dense clinical reading. No scroll hijacking, forced camera tour or moving click target. Motion stops when hidden; reduced motion removes camera travel/parallax/particles/entrances while preserving state and keyboard controls. Decorative particles are not a data stream.

## Responsive and accessibility strategy

1920×1080: spacious orbital/crew composition;1366×768: compact but legible stage and summary;768×1024: stacked stage/summary with readable comparison rows;390×844: single-column data, bounded scene, all routes and session/graphics controls reachable. Keep source/quality/risk labels ahead of decorative captions when space is constrained. Tables can scroll within explicitly labeled regions; the entire document must not overflow. Reserve bottom-navigation space so focused controls are not obscured.

Target [WCAG2.2 AA](https://www.w3.org/TR/WCAG22/): text contrast4.5:1 (3:1 for qualifying large text), meaningful non-text contrast, keyboard operation, reflow, visible unobscured focus and status announcements. Validate actual translucent/text/chart combinations. Use ≥44px touch targets as ASTRA's design target; do not misstate it as WCAG AA's universal minimum. Provide names for icon controls, HTML headings/landmarks, useful chart descriptions and non-color status coding. Avoid repeated live-region announcements for every scalar update. Screen-reader, zoom200%/reflow and real keyboard checks remain manual gates; a token calculation is not conformance.

## Fallback and performance contract

Preserve setup/shader/draw/context-loss→2D→text, independent monitoring DOM, cleanup, bounded pixel ratio and reduced-motion controls. N06 owns advanced context restoration. Use one active scene instance per stage, one owned frame loop and resource disposal on navigation; no invisible duplicated renderers behind panels. Asset load failure preserves current data and explanation. Never put core health text inside WebGL.

Measure warm interactive load≤3s,API p95<200ms,telemetry-to-UI p95<500ms,60FPS standard target/≥30FPS performance mode,critical3D assets≤20MB,decoded resources and memory after repeated navigation. N03's saved timing is a baseline for its tested prototype,not evidence for these future assets or a judge-FPS pass. The approved provisional protocol is three warmed60-second trials at1920×1080,subject to explicitly designated minimum judge hardware;reference-device stage measurements are provisional for AC-20. Record browser/OS/GPU/viewport/DPR/quality mode,warm/cold conditions,duration and load under [DE_AC20_01.md](DE_AC20_01.md). PresentedFPS is distinct from draw submissions/rAF/headless timing. Quality-reduced performance mode must retain active animation independently of intentionally static/event-driven reduced motion. Adaptive quality may reduce rendering cost,never medical-data fidelity,legibility or warnings. N06 must supply integrated evidence;N26 must revalidate final performance;AC-20 blocks release.

## Likely source changes after approval

| Exact current file / proposed new location | Later purpose / owner |
|---|---|
| `apps/mission-control-web/app.mjs` | `renderLogin`, shell/heading/navigation, Overview/crew/workspace template composition; retain state/request/permission guards. N04, bounded later N06 interaction. |
| `apps/mission-control-web/styles.css` and new `mission.css` | N04 implemented the dedicated native material/type/layout layer after the existing stylesheet,with two base contrast tokens;responsive/focus/reduced-motion rules preserved and browser audited. |
| `apps/mission-control-web/ui.mjs` | Shared native template primitives, trend chart framing/status/citation presentation without changing observed values/time. N04. |
| `apps/mission-control-web/scenes.mjs` and new `earth.mjs` | N04 implemented local Earth texture/light/star/camera presentation preserving lifecycle;anatomy adapter/assets remain N05,picking/advanced motion/restoration N06. |
| `apps/mission-control-web/index.html` | Only necessary local asset/font/preload/landmark changes; preserve CSP-compatible local modules and skip link. N04. |
| `apps/mission-control-web/sw.js` | Version local shell/asset cache only after actual update/offline testing; complete offline strategy stays N17. |
| `apps/mission-control-web/assets/earth/` and asset manifest | Created by N04:four local NASA historical day/cloud JPEG variants,source/output hashes,credits/usage terms;total1,202,603bytes. Artistic/performance acceptance remains separately evidenced. |
| Proposed `packages/three-assets/` | Licensed anatomical hierarchy/LOD/manifests only after N05 renderer decision. Not yet created. |
| `packages/presentation.mjs` | Preserve data projection/quality/reception authority. A visual redesign should not require changing telemetry truth. |
| `tests/frontend-correctness.test.mjs`, `tests/scenes.test.mjs`, `scripts/browser-acceptance.mjs` | Retain regressions, add actual visual/interaction/performance evidence in the owning module. N04–N06/N26. |
| docs design/audit/tracker/handoff/testing/asset records | Record requirement mapping and real acceptance at each approved phase. |

No backend, detector, telemetry ownership, private check-in policy, acknowledgement rule, forecasting or retrieval redesign is a prerequisite for artistic changes. Do not expand those modules to fill visual space.

## Phased roadmap, dependencies and gates

| Phase / existing owner | Proposed work and dependencies | Required acceptance / scope boundary |
|---|---|---|
|0 — N03 acceptance | Functional/browser/responsive/zoom/bounded accessibility evidence verified;N03 remains Partial for AC-20. DE-AC20-01 documentation exception approved. | Preserve E16 evidence;AC-20 Open / Unverified. Verified N03 evidence may satisfy N04/N05 prerequisites without N03 Complete;no implementation approval. |
|1 — N04 visual foundation + Landing | Subsequently explicitly approved and implemented:shared native tokens/type/materials,scene/form composition and local credited Earth assets. Verified N03 evidence used under DE-AC20-01. | Actual four-viewport/200% entry/keyboard/reduced-motion/no-WebGL checks pass;user visual review and remaining stage gates are tracked in N04_ACCEPTANCE. No new identity architecture or anatomy. |
|2 — N04 Earth + Mission Control | Subsequently approved and implemented:local textures/lighting/starfield,mission rail,crew comparison,environment/service/reception hierarchy and shared presentation. | All14 findings mapped to concrete responses in N04_ACCEPTANCE;actual screenshots/interactions/role/reception evidence recorded. Performance/latency results remain scoped to their exact workload;no fake waveform/activity or unilateral artistic approval. |
|3 — N05 anatomy foundation | Separate approval;lawful assets/renderer decision,hierarchy/LOD/budgets. Verified N03 evidence under DE-AC20-01,N04 completion and asset/tool access required. | Actual loaded inspectable geometry;DE active-camera/telemetry performance gates;≤20MB critical3D with reconciled Earth/anatomy allocations,decoded resource/loading/disposal/fallback evidence. No clinical fidelity or final AC-20 claim. |
|4 — N06 linked interaction | Separate approval;region picking/labels,continuous measured motion,transitions/replay/quality freeze,context recovery. N01/N02/N05 prerequisites unchanged;waveform beats await N08. | Traceable highlights,keyboard equivalents,transitions/recovery and integrated performance evidence on designated minimum hardware under DE protocol. N03/AC-20 closure needs evidence review,not automatic status change. |
|5 — N17/N18/N19/N26 integration | Each separately approved:offline continuity,comms travel/reply,environmental data and final acceptance/video. | Preserve source/time/access semantics;N26 must revalidate AC-20 against the final system before release. Presentation cannot simulate missing scientific features or waive performance. |

No new roadmap module is necessary for the artistic goals: N04/N05/N06 already own them. Complexity is substantial: N04 involves coordinated DOM/CSS/GLSL/assets/browser review, and N05/N06 add separate geometry/licensing/interaction risks. A reliable calendar estimate depends on browser/tool availability and approved asset/renderer choices. Complete and review one module at a time.

Risks: asset licensing/availability; texture transfer vs decoded GPU memory; full-screen shader cost at high DPR; blur over low-resource GPUs; cache invalidation; text contrast over motion; excessive fragment complexity; keyboard/dirty-form regression during transitions; generic card repetition; synthetic plots mistaken for ECG; all-role layouts; scope creep into scientific/production capabilities. Mitigate with source manifests, measured fallbacks, preserved presentation/request contracts, real hardware review and explicit per-module gates. **No proposed redesign phase has begun.**
