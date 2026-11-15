# N04 controlled visual refinement —2026-10-18

**Acceptance remains Partial. User visual approval is Pending;N03 Partial;AC-20 Open / Unverified.** This pass refines existing N04 only. It does not authorize backend repair,N05,N06 or a new design architecture.

## Delivered visual changes

The positively reviewed Landing keeps its exact entry layout,typography,authentication flow,geographic imagery,day/night lighting and atmospheric material. Only the schematic spacecraft's initial orbital phase changed,so it is visible near entry instead of initially clipping beyond the scene edge. Orbit speed/path and the renderer's shading equations are unchanged. No unsupported entry-panel spacing change was made.

Overview gives the Earth more weight through its existing scene scale option(.86→1.02),without another canvas,animation loop,asset or effect. The mission introduction now identifies ARES I directly rather than competing with Landing's headline. Existing mission day,schematic-scale notice,configured latency,link state,credit,camera/quality/motion controls and reception timestamps remain. Tighter section spacing and layered charcoal surfaces connect the stage,monitoring picture and crew comparison plane.

The monitoring picture explicitly identifies Spacecraft/onboard observations or Earth/delivered-only observations. Before first receipt its neutral pill says NO PACKET,rather than implying a live healthy stream. Stale projections retain CACHED/Gray behavior. Monitoring availability is stated separately from crew risk. These labels consume the existing guarded projection/health state;they add no received data or medical inference.

All six cards retain identical HR,SpO2,sleep,status,trend and provenance placement. Existing names/roles/insignias pair with callsign/ID in the header. Removing a redundant identity row and tightening spacing makes measurements easier to compare. Scalar HR history keeps actual observation-time spacing and quality gaps;it is not an ECG. Data available/unknown comes from existing projection quality,not a new health score. The timestamp is explicitly labeled HR source;it does not imply every metric was observed simultaneously.

The full-crew desktop view still scrolls. All six complete cards are visible together after scrolling to the crew section;there is no claim that the orbital stage and six full cards fit simultaneously at initial1920×1080. Native200% and small-screen layouts retain existing reflow/fallback behavior.

## Screenshots for user review

Every image below is an actual Chrome capture. Fresh BEFORE captures use the same isolated fixture as the refinement;original N03/N04 images remain untouched.

| View | Before | Current after |
|---|---|---|
| Landing desktop | [Before](../artifacts/n04-refinement-20261018/before/landing-1920x1080.png) | [After](../artifacts/n04-refinement-20261018/after-final/landing-1920x1080.png) |
| Overview desktop | [Before](../artifacts/n04-refinement-20261018/before/overview-1920x1080.png) | [After](../artifacts/n04-refinement-20261018/after-final/overview-1920x1080.png) |
| Full Overview | [Before](../artifacts/n04-refinement-20261018/before/overview-full-page.png) | [After](../artifacts/n04-refinement-20261018/after-final/overview-full-page.png);beyond-viewport image is not an initial visibility claim. |
| All six cards | [Before](../artifacts/n04-refinement-20261018/before/six-crew-visible.png) | [After](../artifacts/n04-refinement-20261018/after-final/six-crew-visible.png);all six are checked geometrically. |

Also inspected:[phone Overview](../artifacts/n04-refinement-20261018/after-final/overview-390x844.png),[laptop](../artifacts/n04-refinement-20261018/after-final/overview-1366x768.png),[tablet](../artifacts/n04-refinement-20261018/after-final/overview-768x1024.png),[Earth before receipt](../artifacts/n04-refinement-20261018/after-final/earth-before-receipt.png),[phone native200%](../artifacts/n04-refinement-20261018/zoom-final/overview-390x844-zoom2.png) and [laptop native200%](../artifacts/n04-refinement-20261018/zoom-final/overview-1366x768-zoom2.png). Image inspection confirms natural geography/clouds and restrained lighting remain;phone text backings trade some visible planet area for readable notices. User artistic review remains Pending.

Intermediate after-initial/after directories preserve exploratory results. The first compact stage made Earth physically smaller;the final composition restores the original380px desktop stage height with the larger scene scale. This is an agent visual finding,not user artistic approval. The remaining review concerns include intentional narrow-screen text backings over the Earth,subtle spacecraft/orbit treatment and continued vertical scrolling. No universal premium-quality certificate is claimed.

## Changes and boundaries

| Source | Exact responsibility in this pass |
|---|---|
| apps/mission-control-web/app.mjs | Scoped Overview class;mission identity/reception/availability labels;crew header/quality/source arrangement;existing Earth scale option. |
| apps/mission-control-web/mission.css | Scoped Overview/card layout,type/material/spacing and focus-scroll adjustment. No new continuous CSS animation or backdrop-blur layer. |
| apps/mission-control-web/earth.mjs | Initial ship phase only(.6→4.2 radians);same orbital rate and all other shader code. |
| apps/mission-control-web/sw.js | Shell cache v4 for changed frontend bytes;no offline expansion or API caching changes. |
| tests/cinematic.test.mjs | Expanded actual-template checks for onboard/Earth labels,NO PACKET,data availability/unknown and HR source. Same120 total tests. |
| scripts/browser-n04.mjs | Isolated before/after capture task,all-six HR/SpO2/sleep comparisons,DOM/canvas/geometry counts and updated shell version expectation. Existing performance/parser protocol unchanged. |

Scene lifecycle/GPU disposal,base styles,Earth asset bytes/licenses,auth,telemetry,detector,enrichment,SQLite,SSE,communications and backend scheduling are unchanged against this pass baseline. No dependencies,portraits,biographies,medical readings or severity colors were added. Source/evidence hash verification is recorded with final results below. Protected/nonfunctional Git metadata is preserved;no commit is possible.

## Executed verification

Current120/120 Linux regressions pass. The extended reception test initially exposed label precedence(CACHED instead of NO PACKET before any receipt);the display priority was corrected without changing the projection. The first native200% audit exposed a mobile crew-card focus-scroll defect:root and card both reserved the bottom navigation rail. The scoped card now reserves8px while root scroll padding continues reserving the rail. The failed zoom report is retained;zoom-final passes7/7 groups,40 audits,42 PNGs,674 Tab transitions,2053 supplemental contrast bounds,0 unresolved pages or captured JS errors. Raw axe image/gradient incompletes remain recorded;no formal WCAG/spoken-AT certificate.

Additional completed browser checks:23/23 functional groups,61 PNGs,40 page/viewports;100% accessibility4/4 groups,10 pages,12 PNGs,173 Tabs,681 supplemental contrast bounds;final refinement3/3 groups,12 PNGs;scene5/5 groups,8 PNGs. All captured JS-error lists are empty. Existing seven-role scope,all nine workspaces,scenario quality,202/409/503/failure/recovery,acknowledgement and delayed Earth/blackout/disk-reopen behavior passed. Fallback checks exercise real WebGL/Canvas2D/text failure paths;motion and active graphics quality remain independent.

In the same frozen Overview fixture,before543 DOM elements→after557(+14,+2.58%),with one canvas in both. Desktop card height361.6875→253.59375 CSS px(29.89% shorter);phone357.6875→256.09375. The added elements provide identity,quality and availability/source labels;there is no new scene or animation owner. Screenshot geometry is fixture-specific,not proof that future longer names/data will always fit.

Fresh warm-load checks pass:three reloads reached DOM readiness82.8–114.4ms and rendered-capture completion379.003–434.571ms;40 loopback API requests all200,p954.3ms. Previous captures367.86–506.44ms/API p954.4ms were a separate bounded sample,not a controlled speedup experiment. Exact standalone ANGLE/SwiftShader Earth/twin shader checks also pass;diagnostic pixels are not browser or FPS evidence.

The current full regression is Linux120/120,0 failed/cancelled/skipped,15.307s;47 JavaScript files pass syntax/local-import checks. The initial N04 Windows120-test and frozen scientific/CPU evaluations are reused as historical evidence,not newly executed claims. This pass changed no backend/scientific code. Logs and reports remain in the new evidence root.

## Graphics and latency measurements

Fresh [assessment](../artifacts/n04-refinement-20261018/performance-assessment.json) and [raw report](../artifacts/n04-refinement-20261018/performance/report.json):12 headed visible trials,three warmed60s at1920×1080 per Landing/Overview×standard/performance. Each has10s warm-up,60 host-deadline ticks at1Hz,default30 mission seconds/tick,nominal60 scalar observations/real second,and active motion. All recorded workloads remain visible,on the correct scene,with no trace data loss. Maximum tick-start lateness16.384ms. All six Overview HR source-event/time/value correlations are retained(360 samples/trial).

| Scene/profile | Complete compositor feedback/s,three trials | Lowest1s bucket | HR DOM p95,ms | HR ingestion→next complete feedback p95,ms |
|---|---|---|---|---|
| Landing/standard |60,60,59.9 |54 |Not displayed |Not displayed |
| Landing/performance |60,60,60 |60 |Not displayed |Not displayed |
| Overview/standard |60,60,60 |60 |54,48,47 |120.078,115.221,120.350 |
| Overview/performance |60,60,60 |60 |47,49,50 |101.281,104.276,104.417 |

This passes the bounded reference graphics gate≥30 complete feedback events in every measured second and approximately60/s standard target. These are Chromium compositor feedback events,**not physical panel instrumentation or AC-20 certification**. Draw/rAF diagnostics remain separately recorded. Reduced motion was false in every performance trial;quality modes are independent. Current HR DOM47–54ms versus retained default30×47–50ms;performance-quality next-feedback p95 is15–22ms higher than the earlier sample. Both remain below500ms. Sequential runs with different database histories do not establish that the visual refinement caused this difference. No speedup or zero-cost claim is made. Old Landing trials used1× stress and are not matched-load comparisons.

Hardware actually measured:AMD Ryzen5 7430U,12 logical CPUs,14,861,852,672 RAM bytes,Radeon/ANGLE D3D11 driver31.0.21925.1001,Windows10.0.26300,Chrome155.0.8059.80,Balanced power;Node/API/SQLite and Chrome co-located. Browser window/screen1536×864 DIP,emulated1920×1080 CSS,DPR≈1;the earlier read-only display query records1920×1080/60Hz physical panel. Thermal/VRAM/physical scanout were not instrumented. No minimum judge machine has been designated.

Current Overview render buffers1273×380 standard/1019×304 performance versus earlier1269×380/1015×304;one canvas,unchanged texture tiers/pixel caps/lifecycle. Larger planet coverage can increase texture shading even with almost unchanged buffers;the measured feedback gate passes rather than assuming identical GPU cost. No long-soak/no-leak certificate is inferred from short navigation and lifecycle tests.

## Integrity and documentation

The [new evidence inventory](../artifacts/n04-refinement-20261018/evidence-inventory.json) compares66 baseline files:60 unchanged,exactly four frontend runtime and two QA/test files changed,no source deletion. Every backend/domain/research/model/knowledge file and all four image variants remain byte-identical to this pass baseline;reversing the single initial-phase constant reconstructs the original Earth shader hash. All231 previously inventoried evidence files remain unchanged. The [refined runtime manifest](../artifacts/n04-refinement-20261018/source-manifest.json) records current allowlisted bytes;the old root manifest remains preserved as historical evidence. This is unsigned local evidence,not external attestation.

Documentation updated:AGENTS.md,MASTER_PLAN,MODULE_TRACKER,SESSION_HANDOFF,FEATURE_AUDIT,DECISIONS,N04_ACCEPTANCE,N04_COMPLETION,and new N04_REFINEMENT/N04_LATENCY_REVIEW. Current documentation consistency results are saved with the evidence inventory. Earlier N03/N04 numerical reports,screenshots,traces and failures were not overwritten.

## Latency and stop conditions

[N04_LATENCY_REVIEW.md](N04_LATENCY_REVIEW.md) distinguishes measured pre-delivery tick cost,source-supported queue persistence hypothesis,measurement limitations and separately approved remediation. The historical1× overrun is retained;no backend repair is included. All-metric/text-specific visible-paint acceptance and user artistic approval remain open. Named reference graphics results cannot certify AC-20 on an undesignated minimum machine.

Local review:run `npm start`,open `http://localhost:3000`,select Demo administrator,enter simulation and inspect Mission overview. Use Spacecraft/Earth received to check the boundary,scroll to compare all six cards,open Inspect for source/history detail,and use existing graphics/motion controls independently. Resize to1920×1080,1366×768,768×1024,390×844 and native200% zoom;Tab should keep the full focused card readable above navigation. This uses the normal ignored synthetic demo database;automated reports use disposable databases/profiles instead. Confirm the port shown by startup if configured differently.

Report and **STOP** after this pass. No later module or backend remediation begins without explicit approval.
