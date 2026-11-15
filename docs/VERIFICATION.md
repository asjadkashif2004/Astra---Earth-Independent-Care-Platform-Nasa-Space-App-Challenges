# Verification evidence — updated2026-10-18

## E17 — N04 implementation and bounded browser evidence

The user explicitly authorized N04 after the documentation-only exception below. Current results, source freshness, retained failed attempts, hardware and unsupported performance/visual gates are recorded in [N04_ACCEPTANCE.md](N04_ACCEPTANCE.md). Native JavaScript/WebGL2 retained; no N05/anatomy or backend monitoring change. N03 remains Partial; AC-20 Open / Unverified. Historical E16/E15 results are preserved rather than relabeled as N04 measurements.

## DE-AC20-01 documentation decision — no new application acceptance

Exception approved2026-10-18 for documentation changes only:verified N03 correctness evidence may satisfy N04/N05's N03 prerequisite without N03 Complete. **N03 remains Partial; AC-20 remains Open / Unverified and a release blocker.** The original≥30FPS designated-minimum criterion and historical E16/E15 records below are unchanged. [DE_AC20_01.md](DE_AC20_01.md) records proposed phase gates and the approved provisional three warmed60-second trials at1920×1080,subject to minimum hardware designation;N06 integrated evidence and N26 final revalidation remain mandatory. Reference-device/draw/rAF/reduced-motion evidence is not relabeled as a judge-FPS pass. N04,N05,N06 implementation remains unapproved/unstarted.

This task verifies documentation consistency and source/evidence preservation only;it runs no new application,syntax,browser,synthetic evaluation or performance tests. Historical test totals below retain their original scope and dates. Documentation check results are recorded in the current SESSION_HANDOFF. STOP for separate N04 approval.

## Current E16 final N03 closure — delivered and STOPPED

Final Linux full suite106/106 passes,0 failed/cancelled/skipped,14.312s;42 JS syntax/import checks pass. Earlier Windows105-test result and23-group Windows/Linux functional suites are reused history. Final filtered actual Chrome155.0.8059.80:4/4 groups,six page audits,eight PNGs,34 native Tab transitions,21 supplemental contrast bounds,0 violations/errors/overflow/focus/order/intro-overlap. Reused200% numerical40-page/650-Tab/610-bound and100% ten-page/167-Tab/169-bound results cover unchanged workspaces;partial interrupted-run PNG overwrites are explicitly excluded from coherent older-run screenshot attribution. Native200% is independently proved by browser preference,DPR2,CSS viewport halving,visual scale1 and CSS zoom1.

C11 real Landing logo/text overlap repaired and geometry-checked;C12 actual failed-before onboard-toast/Earth-view assertion repaired with new106th regression preserving risk/ack/queue state. Pre-pause C08–C10 accessibility/reflow repairs retained. No backend/renderer changes;33-file comparison has30 unchanged,three frontend changes. Manifest refreshed unsigned after recording comparison. Evidence hashes six passing reports and25 coherent closure PNGs: artifacts/n03-final-closure-evidence.json.

Saved named Lenovo/Ryzen/Radeon results reused:mounted shell63.9–211.7ms,local API p953.8ms,SSE clock DOM p9547.4ms;standard Earth/twin30s59.84/59.94 draw submissions/s;Performance control~1.466/s is intentionally event-driven reduced motion. No physical FPS/designated judge-profile certification. No new CPU/evaluation/performance run;frozen synthetic evaluation unchanged. No spoken-AT/formal WCAG/clinical/long-soak certification. N03 Partial for AC-20;no execution-permission blocker. Full actual results,limits,permissions and commands: [N03_BROWSER_ACCEPTANCE](N03_BROWSER_ACCEPTANCE.md),[N03_COMPLETION](N03_COMPLETION.md). N04+ remain unapproved.

## Historical verification records

## Historical E15 actual-browser evidence —2026-10-18

Windows Chrome155.0.8059.80 and Linux155.0.8059.84 each pass23 real groups,61 screenshots and40 page/viewport combinations with0 captured JS errors. Both full regression suites pass102/102;41 JS files pass syntax/import checks. Two new unit regressions and actual header geometry verify C05–C07. Approved isolated processes now work; earlier disabled-policy/EPERM/vsock claims below are historical. Windows AMD/D3D11 normal-mode30s sample59.88 draw submissions/s,rAF p9516.8ms; Linux SwiftShader15.54/s,p9583.4ms. No physical-display/judge-mode FPS or full WCAG claim. CLI npm start with memory DB/3135 returned health200/automatic running and was stopped. Frozen evaluation unchanged. Full methods, limitations, remaining native200% zoom/full contrast/judge-profile gates, dependencies and exact isolated Windows/WSL commands: [N03_BROWSER_ACCEPTANCE](N03_BROWSER_ACCEPTANCE.md). **N03 Partial; delivered and STOPPED. N04+ unapproved.**

## Historical earlier verification records

## Current N03 continuation —100 tests pass, browser Blocked, STOP

Only N03 acceptance/correctness/proposal was authorized. Four frontend defects reproduced before repair; five added regressions now pass with all95 previous tests.100 passed,0 failed/cancelled/skipped,18.31s (`artifacts/n03-continuation-tests.txt`); focused frontend22 passed; six mocked scene tests retained.39 JS files parse/import-check. No TypeScript/lint/framework-build pass.

Frozen30-scenario evaluation unchanged: TP10/FP0/TN20/FN0, drift210–230 mission seconds. Existing nominal25-window forecast MAE2.166988bpm/coverage96%, unchanged. CPU p95 projection.085ms/detector1.346ms/raw60-point ingest1.845ms/tick44.708ms;49,376 raw observations/s, memory/in-process only. Logs artifacts/n03-continuation-evaluation.txt and n03-continuation-benchmark.json. Audit probes exit0; exact GLSL offscreen compile/link/render and HR/RR/warning frame checks pass, images inspected. These are not browser graphics/FPS results.

Actual valid server startup: EPERM exit1. Cached Linux browser: missinglibnspr4/NSS/ALSA, exit127. Installed Windows Chrome headless launch with disposable project-local profile: WSL UtilBindVsockAnyPort/socket failure, exit1. Package-host DNS fails. Expanded real acceptance driver exits2/Blocked at ephemeral loopback listener, ZERO executed browser checks/screenshots/viewports (`artifacts/n03-continuation-browser/report.json`). Empty console arrays are not a clean-console pass. Sandbox escalation category disabled; no bypass, system install or personal browser profile access.

User U01 reports Windows Landing/Overview rendered, with14 artistic findings; browser/version/viewport unspecified. No agent browser layout, native focus, contrast, a11y, responsive, client-latency or FPS verdict. Only app.mjs changed among the previous33 manifested runtime files; no backend/renderer/scientific/data-ownership/privacy/ack change. No actual runtime DB/credential/dependency/deployment/Git commit.

Current details and permission/manual matrix: [N03_COMPLETION.md](N03_COMPLETION.md), [N03_BROWSER_ACCEPTANCE.md](N03_BROWSER_ACCEPTANCE.md). Future cinematic design: [VISUAL_REDESIGN_PROPOSAL.md](VISUAL_REDESIGN_PROPOSAL.md), proposal only. **N03 Partial and STOPPED; N04+ unapproved.** The sections below are historical where superseded.

## Initial N03 verification —2026-10-17 historical

Approved N03 only. Software gates pass; real browser acceptance is Blocked, so the module remains Partial. N04+ are unapproved and unstarted. Implementation, regression coverage, limits and exact WSL/browser steps: [N03_COMPLETION.md](N03_COMPLETION.md).

| Check | Actual result |
|---|---|
| `npm test` |95 passed,0 failed/cancelled/skipped,11.88s;72 existing plus17 frontend and6 scene tests. `artifacts/n03-tests.txt`. |
| `npm run check` |39 JS files,0 syntax/import errors; no TypeScript/lint/framework build claim. |
| `npm run evaluate` |30 frozen synthetic runs TP10/FP0/TN20/FN0; primary drift210–230 mission seconds. Existing25-window nominal forecast regression96% coverage/MAE2.167bpm, unchanged. |
| `npm run benchmark` |Memory/in-process p95 projection0.051ms, detector0.671ms, raw60-point ingest0.931ms, tick25.234ms. `artifacts/n03-benchmark.json`; no DOM/HTTP/FPS inference. |
| Audit probes |Exit0; N01/N02 retained and N03 F08/F13 software assertions pass. F07/F09 remain open. `artifacts/n03-audit-probes.json`. |
| Exact GLSL offscreen QA |Earth/twin compilation/link/render and HR/RR/warning frame assertions pass; images inspected. Not browser screenshots or anatomy acceptance. |
| Actual runtime/browser attempts |Server listener EPERM; cached executable exit127/missinglibnspr4/NSS/ALSA. Package-host DNS fails. `npm run test:browser` exits2/Blocked with zero checks/screenshots. |

Selective HTML-tree/event/API tests verify frontend behavior without CSS/layout/native browser focus/accessibility. Scene lifecycle tests mock GL/2D and animation frames. The real Chromium CDP driver is syntax-checked but unexecuted past its prerequisite gate. No browser quality/responsiveness/a11y/latency/FPS claim. Backend detector/engine/store/monitoring/enrichment/retrieval/agent/forecast/calibration/scheduler hashes were unchanged against the previous manifest before refresh; only existing scenario API routing changed server behavior. No dependency installs, deployments, actual runtime DB edits or Git commit.

Final documentation/manifest check:68R/25AC/26N retained, zero broken checked local Markdown links,33 manifested selected files with zero hash mismatches. Manifest remains unsigned and excludes runtime databases/credentials. Final39-file syntax/import check passes.

The sections below are historical. Their approval/defect/count statements are superseded by this N03 section, FEATURE_AUDIT and MODULE_TRACKER.

## Historical N02 verification — complete at its delivery

Explicitly approved N02 repaired F01/F06/F10. N03 and all later modules remain unapproved. Full contracts, fault-test mapping, limits and manual steps: [N02_CONTRACTS.md](N02_CONTRACTS.md), [N02_COMPLETION.md](N02_COMPLETION.md). No frontend/advanced-AI/forecast module was implemented.

| Command/check | Actual current result |
|---|---|
| npm run check |34 JS files,0 syntax/import errors; not TypeScript/lint/build. |
| npm test |72 passed,0 failed/cancelled/skipped,8.98s. Original45 plus27 N02 regressions. Log artifacts/n02-tests.txt. |
| npm run evaluate |30 frozen synthetic runs TP10/FP0/TN20/FN0, primary drift210–230 mission seconds; unchanged25-window nominal forecast MAE2.167bpm/96%coverage. Not clinical evidence. |
| npm run benchmark |Stateful six-crew CPU p95 detector0.972ms (<50ms target), raw60-point ingest1.349ms, full tick26.516ms; approx80,775 observations/s. In-process/memory only, not worker cold-start/disk/HTTP/browser/FPS. Stateful history differs from old fresh-call benchmark. Artifact artifacts/n02-benchmark.json. |
| Audit probes |Exit0 confirms repaired N01/N02 checks; F07 resend still reproduces and F08/F09 source assertions remain. No product-wide acceptance claim. |
| Actual startup |ASTRA_DB=:memory: timeout5s npm start exits1 with listener EPERM, graceful cleanup; no server left running. No real socket/browser verification. |
| Scope comparison |Pre-refresh N01 manifest shows forecast/calibration, original agent logic, scheduler and all frontend/renderer sources unchanged. Existing runtime changes confined to contracts/detector/engine/server/store/retrieval failure handling; three new runtime worker/health files. |

N02 executes actual retrieval exceptions, busy/crashed/nonresponsive workers, corrupt-corpus startup in an isolated copy, critical/optional transaction faults, failed/in-flight temporary disk restart, legacy job backfill, dedup/ack protection, health startup/stale/failure/recovery, Tier A time/quality/context rules and canonical endpoint provenance. N01 integrity/access/delayed-Earth regressions pass. HTTP APIs are tested through their real request handler using the existing socket-free transport; unchanged UI smoke is a stubbed DOM, not a browser. Worker API independently checked against official Node24 documentation linked in N02_CONTRACTS. Git remains unusable; no dependency/system/credential/deployment changes or actual runtime DB edits.

The following N01/A00 sections are historical evidence; current status is in the N03 section above, FEATURE_AUDIT and MODULE_TRACKER.

## Historical N01 verification

Approved N01 repaired only F02/F03/F04/F05/F11. Full contracts, test mapping and self-test instructions: [N01_COMPLETION.md](N01_COMPLETION.md). No N02 or later work is approved.

| Command/check | Actual current result |
|---|---|
| npm run check |30 JS files parsed/import-checked,0 errors. No TypeScript/lint/build claim. |
| npm test |45 passed,0 failed/skipped,4.21 s. Original 23 plus 22 N01 regressions, including 21 tests in telemetry-integrity.test.mjs and one Web permission regression. |
| npm run evaluate | Unchanged 30 frozen synthetic runs TP10/FP0/TN20/FN0; drift 210–230 s, nominal 25-window forecast MAE 2.167 bpm/coverage 96%. Software/synthetic evidence only. |
| npm run benchmark | In-memory p95 detector 0.025 ms; raw 60-point ingest 1.026 ms; full tick 26.172 ms. Metadata adds CPU/payload cost vs A00 tick 6.715 ms. Not network/disk/UI/FPS. |
| node docs/audit/probes.mjs | N01 fixed checks pass; F01/F06/F07/F10 still reproduce and F08/F09 remain source assertions. Not whole-project acceptance. |
| ASTRA_DB=:memory: npm start | Retried: exit 1/EPERM at loopback listener, graceful error and no server left running. No live socket/browser/deployment claim. |
| Unrelated-source hash comparison | Forecast, retrieval, agent logic, detector rules, scheduler, forecast calibration and scene renderer unchanged from A00 before manifest regeneration. No model/retrieval-failure repair. |
| npm run manifest | Refreshed 29 explicitly selected runtime/source/model files, including telemetry metadata helper; runtime databases/secrets excluded. SHA-256 hashes, not signed release artifacts. |

All N01 ingest/history/SSE/queue/role behavior was exercised against real domain modules and HTTP handlers through the existing socket-free transport; restart tests use actual temporary SQLite files. Stubbed-DOM checks cover demo admin, Viewer and Researcher workspaces; they are not actual browser/layout/keyboard/PWA testing. Unknown legacy metadata stays archived/unverified/Gray; source identity and server receipt are never fabricated. No dependency/system installation or Git commit.

The following A00 report remains historical evidence. Its old defect/approval/source-preservation statements are superseded by this N01 section, FEATURE_AUDIT and MODULE_TRACKER.

## Historical A00 verification

Runtime: Node 24.21.0 on Ubuntu 26.04 WSL2, AMD Ryzen 5 7430U, 6.7 GiB visible RAM. These are software/synthetic checks, not medical validation. Full browser and network-bound startup remain unverified.

At A00 these were the audit-only results: documentation and memory-only probes changed while application source did not, and N01 had not yet been approved. Current N01 source/evidence/status is recorded above. [FEATURE_AUDIT.md](FEATURE_AUDIT.md) tracks current requirements and remaining defects; [AUDIT_RUNBOOK.md](AUDIT_RUNBOOK.md) provides normal-WSL commands.

| Command | Actual result |
|---|---|
| `npm run check` | Final 28 JavaScript files parsed, including new audit-only probes; local imports/doc presence checked;0 errors. Initial check 27. No TS compiler, lint/format or production build run. |
| `npm test` |23 passed,0 failed,0 skipped; final rerun1445 ms. No socket or real browser tests. |
| `npm run evaluate` | 30 frozen scenario/seed runs: TP10, FP0, TN20, FN0 for synthetic review events |
| `npm run benchmark` | Six-crew detector p95 0.023 ms;60-observation ingest p95 0.816 ms; complete tick p95 6.715 ms; in-memory synthetic workload. Estimated ingest 95112 observations/s, not HTTP/disk/soak capacity. |
| Existing artifact manifest comparison | Recomputed SHA-256 for all 28 manifest-selected runtime files;0 changed files. Manifest remains unsigned. This audit did not rerun artifact generation or modify application features. |
| `node docs/audit/probes.mjs` | Exit0 confirms reproducible defects F01–F07/F10/F11 and source assertions F08/F09. Not product acceptance. Malformed-Origin probe intentionally logs “Request failed: Invalid URL.” Memory-only stores/fault injection. |
| `python3 scripts/shader-qa.py` | Exact Earth/twin GLSL compile, link and offscreen rendering passed; changes in HR, RR and evidence warning produce different frames |
| `ASTRA_DB=:memory: npm start` | Listener denied with EPERM by agent sandbox; graceful error, no server left running |
| `python3 scripts/render-research.py` | 38-page PDF text audit; selected vector diagram/table reconstructions produced and inspected with stated approximation limits |
| Cached browser `--version` attempt | Exit127, cannot load libnspr4.so. No browser tool or installed Linux browser in PATH. No browser/layout/keyboard/FPS verification. |
| `npm ls --depth=0` / script/tool inventory | Zero npm dependencies. No build/typecheck/lint/format scripts; tsc/ESLint/Prettier/Docker unavailable. Missing advanced integrations are tracked rather than installed during audit. |
| `npm ping --cache /tmp/astra-audit-npm-cache --fetch-timeout=10000 --fetch-retries=0` | Exit1/EAI_AGAIN resolving registry.npmjs.org. Research web tool works separately. No package installation attempted. |
| Limited source secret-pattern scan |21 runtime/CI text files;0 matches for private-key headers, AWS access-key IDs and one API-key pattern. Does not inspect private credential directories, print matched secrets, establish a full scan or replace SBOM/security CI. |
| Documentation coverage/link and original-copy checks |68 unique R IDs,25 unique AC IDs,26 unique roadmap modules, no missing IDs; checked local doc links resolve; canonical Markdown/PDF equal root originals. PDF hash retained. |

## Integrated workflow proven in tests
Synthetic drift → validated scalar records → median/MAD + persistence → evidence-rich risk → cited constrained case → human acknowledgement → one idempotent report → blackout retention → SQLite close/reopen → restored link → delayed delivery → Earth receipt → audit chain verifies. A second higher-priority event creates a fresh case and cannot inherit the previous acknowledgement.

This describes the frozen simulator-driven backend path. It does not prove external-import continuity, the complete executed agent workflow, ground-to-spacecraft review, browser rendering or clinical capability. E07 exposed gaps outside that path: accepted imports are not queued/get overwritten; reversed within-batch time is accepted; Viewer/Researcher read raw actual check-ins; isolated persistent HR can remain Green; a retrieval resource fault rolls back the original alert; health is static and failed reports cannot resend. Full reproductions and sources are in FEATURE_AUDIT and docs/audit/probes.mjs. None were repaired during A00.

Fault injection after scalar insertion proves a failed tick rolls back observations, message changes and the mission clock as one transaction; restart cannot be trapped by a half-committed duplicate tick. Mixed-quality ingest cannot erase an earlier suspect signal with a subsequent good channel. Viewer writes and astronaut access to another crew member are denied. External ingest requires a separate service token.

## Scientific evaluation boundaries
Full-day nominal tests use seeds 81/902 × six fictional crew = 12 synthetic crew-days with no review event. The frozen six-scenario evaluation uses seeds 73/817/1201/3407/99991, with main drift detected at 220/230/210/220/230 mission seconds (target ≤300). These favorable controlled scenarios are deliberately designed software fixtures, not a measure of sensitivity or specificity in human physiology.

Initial forecast residual bands covered 40% of 25 future points. A separate nominal synthetic calibration set of 120 examples/metric uses eight different seeds and excludes CREW-03. The resulting frozen 90%-target band covers 96% of the small held-out nominal test set, with 2.17 bpm MAE. The windows within that evaluation overlap; the observations are not independent population samples. Bands do not establish clinical or drift coverage. The runtime abstains during detected deviations, and labels uncalibrated outputs when cadence/history/horizon are outside the frozen calibration contract.

The 30-question retrieval regression checks topical matches and citation identity against ten hashed source summaries. Unsafe/unsupported queries abstain/redirect. It does not establish expert clinical supportedness or protocol accuracy. The agent has no diagnosis, medication, shell, SQL or telemetry-write tool.

## Acceptance overview — detailed AC status in FEATURE_AUDIT
| Acceptance group | Current evidence / remaining gate |
|---|---|
| AC01–04 | Six streams, linked measurements and evidence semantics verified; exact shader/frame checks pass; actual browser selection/visibility/rotation still pending |
| AC05–09 | Frozen nominal, detection window, Gray and exercise software checks pass; AC07 actual alert panel remains Partial. Single-signal/rate gaps remain separate mandatory requirements. |
| AC10–13 | Original-alert gate and frozen citation identity pass. Actual answer supportedness/protocol coverage, broader unsafe/injection regression and executed tools remain incomplete. |
| AC14 | No external runtime dependency; local daemon and queue verified; physical Internet-off/PWA browser test pending |
| AC15 | Case queue survives blackout and real disk restart; delayed delivery/no duplicates pass |
| AC16 | Separate event/transmission/receipt clocks and delayed snapshots verified; browser timeline inspection pending |
| AC17–18 | Negative role checks, self scope, acknowledgement audit and hash chain pass |
| AC19 | Synthetic provenance schema and UI template labels checked; actual rendered visibility pending |
| AC20 | Actual laptop/browser ≥30 FPS still pending; software offscreen shader test is not this gate |
| AC21 | Full primary deterministic integration scenario passes |
| AC22 | Native no-download commands and static route checks supplied; sandbox denied real listener; normal-terminal fresh boot pending |
| AC23 | README, source/dataset/license caveats, model cards and medical/NASA limitation statements supplied |
| AC24 | Core services make no cloud calls and persisted local workflow passes; actual browser network-disconnect rehearsal pending |
| AC25 | Runbook supplied; actual working-system video not recorded |

## Remaining verification
Real browser/layout/mobile/keyboard/accessibility, live SSE reconnect over a socket, installed service worker, physical network loss, GPU FPS, container build, hosted CI, cloud deployment, encrypted backups, and clinical/public-waveform evaluations are not claimed. The supplied `.git` is an empty read-only mount, so there are no commits from this session.

Technical cross-checks: [MDN service-worker lifecycle and local secure origins](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) explains why actual installation/control/cache tests remain necessary; source existence does not prove offline behavior. [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) was reviewed for the research's renderer recommendation; ASTRA currently uses native GLSL, not Three.js. Node's versioned online SQLite page was unavailable through the web tool; the installed Node 24.21 runtime/SQLite imports are verified by the executed tests instead. No claims about unverified event logistics or medical standards are inferred from these technical checks.

**A00/N01/N02 are historical. Current N03 software verification passes; its real browser gate remains Blocked. STOP; no N04+ approval.**
