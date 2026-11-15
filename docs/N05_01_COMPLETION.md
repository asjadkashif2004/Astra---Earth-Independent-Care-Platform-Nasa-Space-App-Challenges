# N05-01 — licensed anatomy vertical slice

Delivered2026-10-23 within the user's explicit bounded authorization. **N05 remains In Progress; STOP for approval.** N04 Complete, N03 Partial and AC-20 Open / Unverified remain unchanged. This report does not close full-N05 DE performance/LOD/memory gates or authorize N06.

## Implemented

Crew Health defaults to a real locally loaded reference anatomy view: translucent skin envelope, aligned skeleton, heart surfaces and separate left/right lung geometry. Body/skeleton/organs have independent visibility; drag/orbit, zoom, reset and named keyboard/button equivalents are provided. Materials use charcoal/neutral bone, muted warm heart and restrained violet lungs; they do not encode health severity. Static organs do not pulse or breathe and never infer a diagnosis, missing reading or evidence mapping. All six fictional profiles share generic adult male reference geometry, not a reconstruction of that astronaut. The existing data-linked schematic, HR/RR behavior and Canvas/text fallback remain separately labeled and selectable.

The AnatomyScene adapter dynamically loads local Three.js/GLTFLoader only for this view. Body→organs→skeleton load progressively, with local manifest/length/SHA256 verification, explicit loading/error states and a15s load bound. Generation checks and AbortController prevent obsolete navigation/profile loads from attaching. One demand frame owner, hidden/offscreen suspension, pixel caps, detached-late-parse disposal and complete listener/observer/renderer cleanup keep monitoring independent. Context loss or asset failure switches to useful text with a schematic option; metrics, history and evidence remain in DOM. No six-body duplication, postprocessing, organ picking or physiological animation.

The sole server change adds `.glb`→`model/gltf-binary` to static serving. CSP, authentication/RBAC, database, telemetry/detector/enrichment/acknowledgement/communications and completed Earth shader/renderer/assets are preserved. The small service-worker shell is versioned; heavier assets cache on demand. This is not full offline/PWA certification.

## Source, license and transformation

Official release: **BodyParts3D / Anatomography4.3, objects set4.3, FMA3.0**. The original viewer's version-stamped FMA2Obj manifest, public component catalogue, information/license notices and326 unchanged OBJ files are retained under [source package](../packages/three-assets/README.md). [inputs.json](../packages/three-assets/bodyparts3d-4.3/inputs.json) records every component's FJ/FMA/BP identities, original filename/creator string, source URL/version, bytes and SHA256; exported header identity and catalogue identity remain separate.

Credit: **BodyParts3D, ©2008 The Database Center for Life Science, licensed under CC Attribution-Share Alike2.1 Japan.** The [original-site notice](https://lifesciencedb.jp/bp3d/info/license/index.html) explicitly uses [CC BY-SA2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/); derived anatomy retains attribution/share-alike and a license URI. Software is separate; Three.js0.186.1 is MIT, with its full notice and exact source/derived module hashes in the local vendor directory. Screenshots containing adapted anatomy must retain its credit/license when redistributed; no endorsement is implied.

The initially considered official archive4.0 has a newer [CC BY4.0 notice](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), while its English README retains an older BY-SA summary link. Its provided tables do not contain lung-parenchyma surfaces; “lung” compounds aggregate branching internals, and “skeletal system” also includes non-bone structures. No4.0 geometry was imported and that archive's grant is not extrapolated to4.3. The selected source comes directly from the original viewer's supported anonymous custom-download flow, with no mirror/full-atlas download. An initial non-ZIP request imported no geometry; using the normal anonymous session resolved acquisition. No credentials/access-control bypass.

Selected326 components: one skin surface,304 is-a bone-organ elements,three named cardiac wall surfaces andnine lung-parenchyma segments per side. Source compound coverage is not necessarily complete: whole-heart membership omits a named surface, so the preview explicitly selects the three chamber-wall concepts. Every original file/concept/release header matches.142 exported BP representation IDs differ from catalogue values; both are recorded instead of silently relabeling originals. Reference morphology/mapping may contain source errors and has not received independent anatomical expert certification.

Original OBJ bounds explicitly use millimetres. One uniform transform converts Z-up millimetres to Y-up metres: `[(x-cx)/1000,(z-floor)/1000,-(y-cy)/1000]`. No per-organ registration, deformation or replacement anatomy. Deterministic vertex clustering uses3mm skin/2mm bone/0.9mm organ cells, drops degenerate/exact duplicate triangles and rebuilds smooth normals. Source/derived dimensions, transformation parameters, per-element index ranges and hashes are in the [runtime manifest](../apps/mission-control-web/assets/anatomy/manifest.json). Five semantic IDs survive renderer renaming/UUID changes: reference.body, reference.skeleton, reference.heart, reference.lung.left, reference.lung.right.

## Payload and performance boundary

| GLB | Bytes |
|---|---:|
| body.glb |3,782,472|
| organs.glb |3,643,388|
| skeleton.glb |8,264,480|
| Total GLBs |15,690,340|

Combined critical graphics, including all Earth variants/manifests, all anatomy files, local vendor modules/license/manifest and both renderers/adapters/styles, are **19,456,488 bytes before documentation-only additions**, below20,000,000. The final machine-readable inventory is authoritative for exact bytes if source comments change. Source OBJ/metadata and node_modules are build inputs, not browser payload. An initial finer derived build measured21,334,378 bytes and was rejected; the final geometry is321,935 vertices /663,277 triangles, represented byfive meshes. Estimated decoded position/normal/index buffers total15,685,764 bytes; this is not measured total CPU/GPU memory.

Quality reduction caps anatomy pixels at650,000 rather than1,600,000 and remains independent of reduced motion. Reference anatomy has no automatic motion in either mode: explicit camera changes still work, including with the OS reduced-motion preference. Responsive camera fitting preserves width at narrow/zoomed layouts. Full N05 multi-LOD and sustained active-camera/telemetry trials under DE-AC20-01 remain unexecuted and require subsequent approval.

Reference environment actually used: Windows Chrome155.0.8059.86 (headless real browser), Windows10.0.26300, AMD Ryzen5 7430U/Radeon integrated graphics,12 logical CPUs,14,861,852,672 RAM bytes. The bounded camera diagnostic requested40 frames/200 drawElements calls in performance mode; reported CPU draw-call p95 rounded to0ms at the available timer resolution. This means below timing resolution, **not zero rendering cost, GPU completion, presented FPS or a≥30FPS certificate**. No designated minimum machine or physical display certification. The real browser cleanup probe recorded49 buffers created /49 deleted after leaving scenes; it is not a complete driver-memory/leak endurance certification.

## Executed verification

- Linux full unit/integration regression: **195/195 pass**, no failures/skips/cancellations; includes N01/N02 integrity/ordering/privacy/alert/enrichment/communications and existing frontend behavior. [Final validation inventory](../artifacts/n05-01-20261023/verification.json) records exact execution scope and any subsequent focused checks. No N04 acceptance trials or full9-workspace browser matrix was repeated.
- New focused anatomy suite: **12/12 pass**. Original/derived hashes, source/header/semantic IDs, pinned loader parsing of actual GLBs, no remote buffers/decoder/animation requirements, literal combined budget, demand-frame lifecycle, cancellation/late-parse cleanup, error/context/render fallbacks, visibility suspension, keyboard/quality independence, MIME/CSP/auth and preserved schematic/metric integration.
- Syntax/local import checking: **76 JavaScript files, zero errors**. This is not TypeScript compilation. All three Python scripts pass standard-library AST syntax validation; no Python package or OS install.
- [Bounded functional/visual closure](../artifacts/n05-01-20261023/browser-closure/report.json): **6/6 groups pass,16 PNGs,zero captured JS errors**. Entry/Earth retained; actual five-component anatomy; mouse-button/keyboard layer/camera controls and view switch; four100% viewport layouts; independent quality/OS reduced motion; context-loss/text fallback; asset503; navigation cancellation; buffer cleanup; denied WebGL with retained Canvas schematic.
- [Six-profile evidence](../artifacts/n05-01-20261023/browser-final/report.json): all six names/selected IDs match their own synthetic HR and one active anatomy canvas. That individual group passed; the overall earlier run stopped at the then-blocked view switch and is not relabeled a full pass.
- [Native200% bounded panel audit](../artifacts/n05-01-20261023/browser-accessibility/report.json): **4/4 pass,4 PNGs**, physical1920×1080/1366×768/768×1024/390×844; observed CSS widths960/683/384/195 and DPR2, no document overflow. Each has12 actual Tab transitions covering view switch,canvas,layers and camera controls with names/visible focus/horizontal bounds. Axe4.11.1 reportszero violations in the new panel; each retains one color-contrast incomplete for the translucent canvas status backing. These are bounded checks, not WCAG or spoken assistive-technology certification. Long anatomy panels scroll vertically at native zoom.

Real browser review found an inherited `.twin-heading {pointer-events:none}` blocking the new view buttons, plus absolute schematic panel layout unsuitable for the longer anatomy controls. N05-scoped CSS restores pointer access and normal-flow anatomy layout/readable captions; repeated bounded checks pass. Initial and intermediate failed browser reports/screenshots remain preserved. Earlier harness-only failures (missing import/removeEventListener in lightweight DOM stubs, testing an Earth-only motion control inside Crew Health) were corrected; they did not change production monitoring behavior. No failing test is silently reclassified.

The status backing's automated contrast incomplete is retained. A separate conservative CSS calculation uses its actual foreground#ded9e4/background#111116e8 over a maximum-white underlay and gives a minimum10.80:1; this supports the chosen text colors but is not rendered-pixel or formal accessibility certification. Canvas drag/touch behavior is supplied by pinned OrbitControls; this bounded run directly verified button/keyboard camera operation, not a full touch-device/assistive-technology interaction matrix.

## Review images and local usage

- [Full reference body and clinical DOM](../artifacts/n05-01-20261023/browser-closure/anatomy-full-body-1920x1080.png)
- [Skeleton and organs](../artifacts/n05-01-20261023/browser-closure/anatomy-skeleton-and-organs.png)
- [Heart/lungs](../artifacts/n05-01-20261023/browser-closure/anatomy-heart-lungs.png)
- [Mobile](../artifacts/n05-01-20261023/browser-closure/anatomy-390x844.png)
- [Context-loss fallback](../artifacts/n05-01-20261023/browser-closure/anatomy-context-loss-fallback.png)
- [Native200% laptop](../artifacts/n05-01-20261023/browser-accessibility/anatomy-native200-1366x768.png)

Run `npm start`, open `http://localhost:3000`, Enter simulation, then Crew Health. Select a crew tab, toggle Body envelope/Skeleton/Heart & lungs, orbit/zoom/reset using buttons or arrow/plus/minus/Home keys, and compare Data-linked schematic. Use Tab to reach controls. Profile changes preserve correct measurements; anatomy is shared generic reference. A failed anatomy view must leave telemetry/history/evidence available. `node --test --test-isolation=none tests/anatomy.test.mjs` runs the focused checks; `npm run check` validates syntax/imports. Normal startup does not need npm install; local assets are bundled.

## Remaining N05 work — separate approval required

Multiple LOD/quality asset tiers; broader anatomical coverage/hierarchy review; full progressive/decode/load and peak CPU/GPU memory measurements; sustained active-camera and concurrent telemetry DE trials; touch/assistive-technology/browser coverage beyond this bounded pass; complete offline lifecycle; further visual review/expert anatomical review as appropriate. Native panel status contrast has an automated incomplete noted above. Organ picking/evidence mapping, data-linked HR/RR motion and organ interactions belong to N06, not this delivery. N03/AC-20 remain open; N04 evidence and its Complete status are preserved. No further N05 task or N06 is authorized. **STOP.**

## Changed-file inventory

Runtime: app.mjs,index.html,sw.js; new anatomy.mjs,anatomy-runtime.mjs,anatomy.css; three local GLBs/manifests/attribution plus six Three.js vendor modules/license/manifest. Existing scenes.mjs,earth.mjs,mission.css and Earth assets are unchanged. Server: one static MIME entry only. Dependency: exactly `three:0.186.1` and package-lock.json; no other package/build dependency.

Build/source tools: scripts/n05-source-review.py,n05-acquire.py,build-anatomy.py,build-anatomy-runtime.mjs,n05-verify.mjs. QA: new tests/anatomy.test.mjs,scripts/browser-n05-01.mjs; existing browser-acceptance.mjs gains only the bounded branch; frontend-smoke.mjs/dom-harness.mjs understand the new import/lifecycle; one old schematic-layer test explicitly selects the retained schematic. Source package holds the exact subset and rejected-candidate metadata. Planning/architecture/audit/setup/testing/requirements/decision/tracker/handoff instructions are updated without changing DE-AC20-01 or historical acceptance artifacts. [verification.json](../artifacts/n05-01-20261023/verification.json) enumerates exact runtime/QA hashes and proves24 preserved N04 assessment fingerprints and the allowed source differences.
