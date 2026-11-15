# Verification procedures

## Bounded N09-D01 verification — 2026-10-24

```bash
node --test --test-isolation=none tests/scenario-demo.test.mjs tests/frontend-correctness.test.mjs
npm run check
```

[Completion](N09_D01_COMPLETION.md): 20 new demonstration tests cover all six targets, permissions/ownership, fixed envelope, actual persistence, source/run timestamps, quality/Unknown, stop/history, restart/rollback, template pending/ack and delayed Earth. Full `npm test` ran once after functional changes:368total/367pass/0fail/1existing unavailable-real-Sleep-EDF skip. Final markup/CSS received49/49focused passes and110-file syntax/import check; no redundant full-suite repeat. Real Windows headless Chrome155.0.8059.86 passed3functional groups; a separate1group final desktop/mobile layout recheck preserved all earlier screenshots. Temporary owned profile/database only; manual engine advancement exercises actual HTTP/DOM/monitoring without long N04 trials. No clinical, model-answer, physical FPS, full-WCAG or AC-20 certification follows. See saved reports under `artifacts/n09-d01-20261024`; do not overwrite them on resumption. The browser runner has a bounded `--n09-d01` mode and `--n09-layout-only` variant, both requiring a fresh output directory and supported process permission. Further testing/work needs an applicable approval.

## Bounded N13-03 review verification — 2026-10-24

```bash
node scripts/review-evidence.mjs verify
node --test --test-isolation=none tests/evidence-review.test.mjs tests/research-curation.test.mjs
```

Actual saved results: [46/46 focused tests](../artifacts/n13-03-20261024/focused-tests.txt), [107-file syntax/import check](../artifacts/n13-03-20261024/syntax-check.txt) and [offline verification PASS](../artifacts/n13-03-20261024/verification.json). Twenty-two new tests plus 24 existing curation tests, no skips/failures. Expected review: 40 cases/24 supported/8 partial/8 unsupported, 33 units, eight coverage areas/nine exclusions/four numerically excluded tables/one additive locator correction. All independent decisions must remain pending. Verification checks the unchanged originals/corpus/curation, saved source proof and deterministic output, with no network or new PDF extraction. These tests are not scientific/medical approval, model-answer evaluation or full N13 closure. Read [N13_03_COMPLETION](N13_03_COMPLETION.md) and the linked packet; record actual external review only under a separately approved task. No full suite, browser collection or N04 retest is needed for this offline-only change.

## Bounded N13-02 curation verification —2026-10-24

```bash
node scripts/curate-research.mjs verify
node --test --test-isolation=none tests/research-curation.test.mjs
```

[N13_02_COMPLETION](N13_02_COMPLETION.md) records43focused passes(24new+19N13-01),104-file syntax/import and Python AST checks. Actual targeted original-page extraction covered41pages once;normal verify reuses that proof with current source/frozen hashes and deterministic overlay/plans/review checks,not a fresh PDF parse. Expected:19section boundaries,33units,40reviewable expectations(24supported/8partial/8unsupported),201base-citation references and independent human approval pending. Source-header labels were text-checked,not rendered. No network/full application suite,N04/browser,model/medical validation. A fresh `build --output=/tmp/astra-n13-02-rebuild-unique` is available only if a specific change requires re-extraction;use a new directory and preserve all historical data. Never rerun acquisition or mistake tests for approval of evidence expectations. N13 remains In Progress;STOP before follow-on work.

## Bounded N13-01 offline corpus verification —2026-10-24

```bash
node scripts/research-corpus.mjs verify
node scripts/research-corpus.mjs build --output=/tmp/astra-n13-01-rebuild-unique
node --test --test-isolation=none tests/research-corpus.test.mjs
npm run check
```

Use a fresh rebuild directory,Node24.21+/Python3.14 on WSL/Unix and the preserved pinned wheel;no Internet,model or app server is required. Do not redownload sources or delete attempt markers. Expected verification:two documents,471pages,3,275valid chunk anchors,10draft questions/14review references and medical_approval=false.1,164heading candidates are heuristic,not validated semantic sections. [Report](N13_01_COMPLETION.md) records18initialN13+72compatibility passes/1existing incompleteSleep skip,oneadditional monotonic-deadline regression,and101-file check. Saved [evidence](../artifacts/n13-01-20261024) is reused;no full app/browser/N04/clinical evaluation was run. Review spots are text-based,not rendered-page visual acceptance. Future code changes require only relevant tests;no automatic acquisition or next-module work.

## Bounded Sleep-EDF exception verification —2026-10-24

```bash
node --test --test-isolation=none tests/sleep-edf-acquisition.test.mjs
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs tests/bidmc-acquisition.test.mjs
npm run check
```

Executed19Sleep checks pass/1real-pair check skipped,53prior compatibility tests pass;72passes,1skip,0failures.94-file syntax/import check passes. Tests cover exact files/limits/publisher proof,chunk hashing,EOF/deadline/cancellation,wrong response/hash,retained partials/lock release/no retry,bounded EDF/TAL fixtures and refusal to generate accepted documents from unverified JSON. Actual publisher metadata complete;PSG request timed out incomplete,annotation not requested. The accepted-original/manifest/card/pair integration test is skipped for that reason;fixtures do not close it. Existing NTRS/OSDR/BIDMC originals verify offline. [Report](N07_SLEEP_EDF_COMPLETION.md),[evidence](../artifacts/n07-sleep-edf-20261024/verification.json). No browser/full suite/SQLite/medical/model/RadLab run. Do not retry acquisition or remove the saved partial under this exhausted approval.

## Bounded N07 BIDMC sample verification

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs tests/bidmc-acquisition.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify --source=physionet-bidmc-01-numerics
node scripts/bidmc-sample.mjs verify
```

Executed2026-10-23 Linux Node24.21.0:53/53focused tests,0failures/skips/cancellations;89-file syntax/import check,0errors.14new BIDMC tests cover exact source/release/license/notice/pins,CSV order/completeness/types/NaN,cache filename/MIME/range/prefix/full-hash/late-disconnect/corruption,card/receipt provenance and unsupported split claims.39prior acquisition/OSDR compatibility tests also ran. Actual full HTTPS acquisition and direct offline source/card/split/notice checks pass. No browser,full suite,SQLite,monitoring evaluation,RadLab retry or N04 run. Publisher-checksum list timed out;real source-range/power-loss/Windows/clinical acceptance unverified. [Completion/evidence](N07_BIDMC_COMPLETION.md). Offline verification needs no network;new acquisitions/repins remain separately approved actions.

## N07-02 bounded OSDR metadata/card/split verification

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify --source=nasa-osdr-osd-1
node scripts/osdr-study.mjs verify
node scripts/scientific-acquire.mjs verify
```

Executed2026-10-23 Linux/WSL2 Node24.21.0:39/39 focused tests (22 N07-01+17 OSDR),0 failures/skips/cancellations;86-file syntax/import check,0 errors. Direct offline CLIs verify the two exact originals and OSD-1 documentation. Faults/resumption use synthetic in-process transports/temporary roots;no browser,unrelated/full suite,model evaluation,SQLite fixture or N04 workload. Parser/card/split tests reject wrong/mixed/human sources,malformed/unavailable data,rights changes,provenance/hash tampering,fabricated counts/assignments/labels and leakage-prone policy. Unknown values stay null;no split is executed. CLI option tests call the actual pure parser;child-process stdout was empty for a print probe,so direct CLI execution is separate evidence rather than a claimed child test. [N07_02_COMPLETION](N07_02_COMPLETION.md) records actual source review,size guard,rights limits and pending N07/N13 gates. No native Windows/real-range/power-loss certification is claimed.

## N07-01 focused acquisition verification

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify
```

Executed2026-10-23 on Linux/WSL2 Node24.21.0:**22/22 focused tests**,0 failures/skips/cancellations;**82JavaScript files/local imports**,0 errors;real original6995-byte NASA NTRS snapshot passes offline verification. Tests use in-process synthetic transport responses and temporary directories for malformed source/metadata/type/hash/range/validator,partial corruption,interrupt/cancel/deadline/empty-stream,request cap,locking,promotion,reproducibility and inert text/links. Only the final shipped-sample test reads the acquired original. The actual source was acquired once by the workflow after one source-review GET of the same record. No real interrupted-range trial,Windows run,browser,N04 collection,full suite,telemetry workload or model evaluation was performed. Native Windows symlink tests explicitly skip to avoid OS privileges;Linux run skipped none.

The verifier never fetches or repairs missing/corrupt originals. `acquire` is an explicit separate network action,not part of verification. Use fresh dedicated cache roots to preserve shipped/historical records;never repin a changed response automatically. Detailed contracts,rights/attribution,source trust limits and remaining N07/N13 gates:[N07_01_COMPLETION](N07_01_COMPLETION.md). STOP after approved N07-01;further sources/types or integration need separate approval.

## Last Sleep lifecycle focused verification

The bounded repair uses memory/fresh temporary databases,not normal runtime data or historical N04 fixtures. On Node24.21+:

```bash
node --test --test-isolation=none tests/sleep-lifecycle.test.mjs tests/foundation.test.mjs tests/telemetry-integrity.test.mjs tests/monitoring-integrity.test.mjs tests/frontend-correctness.test.mjs tests/integration.test.mjs tests/intelligence.test.mjs tests/web.test.mjs
npm run check
```

Executed2026-10-23:116/116 pass,including15 new sleep tests;78-file syntax/import check,0 errors. [Completion](SLEEP_LIFECYCLE_COMPLETION.md) records exact coverage,non-sleep golden/N02 hashes,model/graphics/accepted-evidence preservation and limitations. Frontend checks are DOM-harness/API tests,not browser acceptance. No full unrelated suite,long browser collections,synthetic evaluation or recalibration was run. Do not run calibration to verify this repair:it writes model artifacts;continuous sleep forecast is intentionally unsupported. Manual `npm start` check:compare one crew's Overview/Crew Last Sleep through ordinary ticks and a scenario switch;value/completed timestamp must stay stable until the next07:00UTC mission completion or an authorized correction. Old scalar imports/history are labeled session unverified.

## N05-01 bounded anatomy verification

`node --test --test-isolation=none tests/anatomy.test.mjs` checks the actual pinned loader/plain GLBs, source/derived hashes, semantic/header identities,20,000,000-byte combined budget, cancellation/lifecycle/fallback/disposal and DOM/MIME/auth integration. `npm run check` and `npm test` cover syntax/imports and existing regressions. See [N05_01_COMPLETION](N05_01_COMPLETION.md) for executed results and limits.

The existing browser driver has a bounded `--n05-01` branch; `--n05-resume` reuses its previously verified six-crew group, and `--n05-a11y --closure --zoom=2` runs only the new-panel native200% checks. Use a fresh N05 output directory and supported process permission. These commands create disposable DBs/profiles, never copy original N04 fixtures, and do not run N04 latency collections or certify AC-20. Windows example: `artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --n05-01 --output=artifacts/n05-user-review`.

New evidence remains under artifacts/n05-01-20261023. Failed initial/intermediate reports are preserved; only their explicitly passing groups may be reused. Headless real rendering, actual native zoom, bounded keyboard/axe results, draw submissions, estimated geometry bytes and physical presentation/peak GPU memory remain distinct evidence classes. Full N05 DE performance/LOD gates are not closed by this task. Further browser or milestone work requires a new approved scope after delivery.

## N04-P01 latency evidence

Current scope/status/results:[N04_P01.md](N04_P01.md). Source changes are restricted to metadata eligibility in Comms.step plus QA/tests/docs. Run Node24.21+;no npm dependency install. Use fresh output directories and disposable synthetic DBs. Never substitute a smoke/headless/hidden workload for the approved full-screen reference acceptance.

```bash
npm test
npm run check
npm run benchmark
node --test --test-isolation=none tests/n04-p01.test.mjs
```

The focused suite checks360pre-repair frozen communication steps,waiting-payload I/O,exact delivery boundaries,actual Engine transaction/cursor rollback,and QA false-positive controls. Full regression covers N01/N02/roles/ack/privacy/received-only behavior.

After explicit resumption approval and reliable unobscured Chrome availability,the one-prompt sequential headed collector is:

```bash
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\n04-p01-batch.mjs' --output=artifacts/n04-p01-repeat
```

It runs24warmed60s trials(1×/30× × Overview/Crew × standard/performance ×3),leaves the application graphics/medical cadence unchanged,and stops on invalid collection.1×copies only the saved synthetic long-queue fixture;30×builds a fresh disk DB at the30s mission step. Supported native focus is process-only and must receive applicable tool approval;no foreground-lock override or OS-policy change. Output/STOP is a cooperative pause file. Do not retry a hidden workload without resolving availability. Ordinary local startup remains npm start;no normal runtime DB is used by the collector.

Offline Windows OCR uses scripts/n04-p01-ocr.ps1 with an explicit -Manifest and fresh -Output path. A process-only execution-policy exception needs applicable approval;it does not install an OCR language or change persistent policy. scripts/n04-p01-assess.mjs accepts report directories and --output=path,opens fixtures read-only,verifies source/clock/text/cadence/backlog coverage and retains every group. Unknown text cannot pass. Original and new failed artifacts must be retained. See N04_P01 for exact observed screenshot/feedback/physical-presentation distinctions and remaining gates.

## Current N04 verification commands

N04 alone was subsequently explicitly approved. Fresh bounded results,source freshness,raw failed attempts and unresolved gates are in [N04_ACCEPTANCE.md](N04_ACCEPTANCE.md). All browser commands use disposable SQLite and Chrome profiles;they preserve normal runtime data and personal profiles. On this checkout in WSL,request supported process/network permission if needed:

```bash
npm test
npm run check
node --test --test-isolation=none tests/cinematic.test.mjs tests/scenes.test.mjs tests/frontend-correctness.test.mjs
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --output=artifacts/n04/browser-repeat
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --n04 --task=scene --output=artifacts/n04/scene-repeat
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --closure --zoom=2 --task=audit --output=artifacts/n04/zoom-repeat
```

Use fresh output directories to preserve earlier evidence. The Windows entry point needs the already installed Chrome and portable Node;ordinary startup needs only Node24.21+ in the24line. The `--closure` driver's historical N03 scope label describes the reused harness; N04 output paths and source hashes distinguish these new runs. Its100% audit uses `--zoom=1` and covers Landing plus all nine routes;200% covers all four viewport sizes. Axe image/gradient incompletes are retained and supplemented with conservative CSS bounds and actual screenshot inspection;no formal WCAG/spoken-AT certificate.

Performance reproduction: `--n04 --task=performance --headed --output=artifacts/n04/performance-repeat` runs three warmed60s trials per implemented page/profile with live six-crew updates. Keep the temporary test window visible and on its expected page;identity/visibility guards invalidate changed workloads. `--short-diagnostic` is explicitly not the DE protocol. `frame-evidence.mjs` separates complete/partial/dropped/no-update compositor feedback and metric DOM/commit/feedback correlation from draw/rAF counts. No physical scanout or AC-20 certificate is inferred. N03 remains Partial,AC-20 Open;N05+ unapproved. Historical instructions/results below are preserved.

Current default is the engine's30-second mission step per1Hz host tick (30× demo);`--mission-step=1` explicitly reproduces the retained1× queue-stress configuration. `--overview-only` limits the page matrix while retaining all three trials per graphics profile. Do not confuse mission-clock rate with scalar event cadence:both configurations generate nominal60 scalar observations/real second. The slower mission clock leaves the12-minute queue pending longer and currently fails500ms at sustained load. Preserve that failure. For review images only,use `--n04 --task=review --output=artifacts/n04/review-repeat`;it captures all six cards within a1920×1080 viewport and a separately labeled full-page image. All commands still require applicable process permission and explicit task authorization;they do not authorize future modules.

## DE-AC20-01 — approved provisional performance protocol

Documentation exception approved2026-10-18 for documentation changes only;no application/performance tests are authorized or executed by that approval. N04/N05 may use verified N03 correctness evidence without N03 Complete;**N03 remains Partial; AC-20 remains Open / Unverified and a release blocker.** No N04/N05/N06 implementation is approved. Current historical test evidence is in N03_BROWSER_ACCEPTANCE/N03_COMPLETION;the older sections below preserve earlier results.

The authoritative [DE_AC20_01.md](DE_AC20_01.md) specifies proposed N04 Earth/shared,N05 loaded-anatomy and N06 integrated gates plus the approved provisional **three warmed60-second trials at1920×1080**,subject to minimum judge hardware designation. Preserve the original≥30FPS requirement;record actual presentedFPS/per-second results,raw traces/frame timing,quality settings,device/browser/GPU/driver,DPR/zoom,workload,warm-up and host placement. Draw submissions,rAF/headless timings and intentionally static reduced motion are separate diagnostic/correctness evidence;active quality-reduced performance mode must not disable animation to pass. Reference-device measurements do not certify designated-machine performance. N06 must supply integrated evidence;N26 must revalidate final release performance.

Retain≤3s warm interactive shell,API p95<200ms,telemetry-to-UI p95<500ms under six-crew demo load,asset/decode-memory/disposal/fallback gates and all N01/N02/N03 correctness regressions. Do not change data cadence,quality semantics or acknowledgement/reception/privacy rules for a benchmark. Future phase tests need their separately approved module scope and supported process/network permissions.

For this documentation-only approval,check local Markdown links,criterion/status/dependency/protocol consistency,requirement coverage and unchanged source/test/research/evidence hashes. No npm test,syntax check,browser or performance rerun is needed without relevant code changes. No unexecuted test may be reported as a fresh pass. STOP for separate N04 approval.

## Historical E15 actual-browser evidence —2026-10-18

Windows Chrome155.0.8059.80 and Linux155.0.8059.84 each pass23 real groups,61 screenshots and40 page/viewport combinations with0 captured JS errors. Both full regression suites pass102/102;41 JS files pass syntax/import checks. Two new unit regressions and actual header geometry verify C05–C07. Approved isolated processes now work; earlier disabled-policy/EPERM/vsock claims below are historical. Windows AMD/D3D11 normal-mode30s sample59.88 draw submissions/s,rAF p9516.8ms; Linux SwiftShader15.54/s,p9583.4ms. No physical-display/judge-mode FPS or full WCAG claim. CLI npm start with memory DB/3135 returned health200/automatic running and was stopped. Frozen evaluation unchanged. Full methods, limitations, remaining native200% zoom/full contrast/judge-profile gates, dependencies and exact isolated Windows/WSL commands: [N03_BROWSER_ACCEPTANCE](N03_BROWSER_ACCEPTANCE.md). **N03 Partial; delivered and STOPPED. N04+ unapproved.**

## Historical earlier verification records

Current results/manual steps: [N03_COMPLETION.md](N03_COMPLETION.md), [VERIFICATION.md](VERIFICATION.md) and [AUDIT_RUNBOOK.md](AUDIT_RUNBOOK.md). All 100 tests pass, including22 frontend correctness and6 scene lifecycle regressions;39 JS files parse/import-check. N01/N02 regressions remain intact. N03 remains Partial because real browser acceptance is Blocked. Work is stopped; no N04+ implementation is approved. Audit probe exit0 is not whole-project acceptance.

Run focused N03 regressions with `node --test --test-isolation=none tests/frontend-correctness.test.mjs tests/scenes.test.mjs`. The selective HTML-tree harness runs actual templates/events/API handlers and tests selection, pending202/ack409/health503, source quality, delayed Earth state, request/session races, focused control identity, dirty forms and scenario stop. It has no CSS/layout/native browser focus/accessibility. Scene tests use mocked WebGL/2D contexts; offscreen GLSL QA is a separate check. N01/N02 focused commands remain `node --test --test-isolation=none tests/telemetry-integrity.test.mjs tests/monitoring-integrity.test.mjs`.

`ASTRA_BROWSER_BIN=/usr/bin/chromium npm run test:browser` runs the optional real Chromium CDP driver with a disposable profile and in-memory server, using actual HTTP/SSE and screenshots. Substitute an installed Linux Chrome/Chromium executable. Exit0 means its scenarios passed,1 failed,2 blocked. Current report `artifacts/n03-browser/report.json` is blocked with zero checks/screenshots; the driver has only been syntax-checked here. No browser install is performed. Exact manual desktop/mobile/keyboard/reduced-motion/disconnection/fallback steps and environment limitations are in N03_COMPLETION. Human visual/a11y review, physical Internet-off and designated-machine FPS remain separate gates.

N02 regression tests cover persistent isolated/multisignal/rate rules, opposite directions, separate severity timers, irregular/held timestamps, exercise, unreliable data/baselines, rate endpoint provenance, actual retrieval failure, optional/critical transaction faults, busy/crashed/nonresponsive workers, failed/in-flight disk restart, legacy missing-case backfill, deduplication/ack gates, health startup/failure/staleness/recovery and missing/corrupt corpus cold start. Existing Mission Day tests now explicitly await optional enrichment; the old foundation fixture evaluates at its actual observation time instead of30s before it. `npm run benchmark` now retains detector pending history across samples, so it measures the stateful Tier A workload rather than only fresh calls.

The2026-10-18 continuation adds five frontend regressions: actual breadcrumb, private-history loading/403, replay loading/empty/400/disabled controls, independent model503/audit403 and rejected400/403 link writes retaining input. Four failed before their app.mjs repairs. The expanded real browser stages (four viewports, pointer/Tab, faults/session/roles) remain unexecuted. Current report: artifacts/n03-continuation-browser/report.json, exit2/Blocked at listener EPERM. Exact installed-browser/manual Windows path, permission limits, evidence distinctions and matrix: [N03_BROWSER_ACCEPTANCE.md](N03_BROWSER_ACCEPTANCE.md).

`npm run check` parses all project JavaScript with Node's parser, validates static import targets, checks required docs and checks the runtime version. It is not a full TypeScript compiler or ESLint pass. No TypeScript compiler is available in this environment.

`npm test` uses Node's built-in test runner against importable modules and in-memory/temporary SQLite stores. Test tiers: schema/unit, deterministic simulation, detector regressions, forecast abstention, retrieval/safety, server authorization, comms invariants, persistence/restart, and integrated Mission Day workflow. `npm run benchmark` measures six-crew generation/detection and ingest performance. Exact commands/results belong in MODULE_TRACKER.

Browser acceptance (pending functioning browser): at 1920×1080 and 390×844, sign in, inspect six crew, select CREW-03, rotate twin, switch domain and reduced graphics, check charts and keyboard focus, inject drift, inspect evidence and citations, acknowledge, blackout/reconnect, switch to Earth, confirm distinct timestamps, run cognition, replay history, export report, test viewer denials, disable external Internet, disconnect local API and confirm stale Gray state, reload offline cached shell. Measure FPS for 30 seconds, record GPU/browser/viewport. Never equate a static response with a visual/FPS pass.

`npm run evaluate` runs 30 frozen synthetic scenario/seed combinations and 25 chronological forecast windows. The frozen forecast gate is ≥90% observed coverage on these windows; this is a regression gate, not a population guarantee. `npm run calibrate` deterministically regenerates `models/forecast-calibration.json` using separate seeds and excluding CREW-03; do not retrain it on the frozen evaluation. The initial residual-only band covered 40%; the separately calibrated nominal band covers 96% on this small synthetic evaluation. Active deviations abstain from prediction.

`node scripts/frontend-smoke.mjs` is also part of the unit suite: it drives the real API handler with a lightweight stubbed DOM across nine workspaces. It does not test real browser layout, CSS, service workers or accessibility. `python3 scripts/shader-qa.py` optionally uses locally cached ANGLE/SwiftShader to compile/link/render the exact shaders, inspect images, and assert HR/RR/warning frame changes. It needs those local runtime libraries (or ASTRA_ANGLE_DIR); it is not a normal startup dependency and does not measure browser FPS.

Scientific validation: synthetic-only event metrics cannot establish clinical validity. Evaluation uses held-out seeds and CREW-03 outside the calibration subjects; forecast windows within the evaluation overlap, so they are not independent population samples. Calibration is restricted to the nominal generator, metric and cadence. External waveform replay needs acquisition/license/hash verification before it is marked integrated. The 30-question retrieval set tests the curated summary pack, not a complete clinical protocol library.

Required final demo video (AC-25) remains an external delivery artifact until actually recorded. Docker, browser rendering and real-world network-off checks must be reported as unverified if unavailable.
