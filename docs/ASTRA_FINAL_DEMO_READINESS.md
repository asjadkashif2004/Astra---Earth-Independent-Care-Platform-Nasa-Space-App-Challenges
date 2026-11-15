# ASTRA final presentation readiness — 2026-11-09

Current mission: verify and prepare existing authorized functions, without a new module, scientific campaign, model run, deployment or redesign. **READY WITH LIMITATIONS: all authorized presentation workflows qualified; external gates remain open.** Formal module statuses are unchanged.

## Launch on the owner's laptop

One Node process serves the backend **and** frontend. Node 24.21+ on the Node 24 line, the existing repository assets/packages, and the installed Chrome are sufficient. No package install, model download, API key or frontend build is required. The browser tests use the existing portable Windows Node and installed Chrome. Keep the repository's local assets in place.

In Windows PowerShell:

```powershell
Set-Location 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI'
$demoRoot = Join-Path ([IO.Path]::GetTempPath()) ('astra-presentation-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $demoRoot | Out-Null
$env:ASTRA_DB = Join-Path $demoRoot 'astra.sqlite'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:ASTRA_SPEED = '1'
.\artifacts\n03-windows-tools\node.exe services/api/server.mjs
```

Use `node services/api/server.mjs` instead of the portable executable if `node --version` reports the required local version. Both were verified through the actual CLI entry point, not a replacement server. The automated startup probe uses a free loopback port to avoid disturbing any owner's running instance. Port 3000 is the ordinary documented CLI port; if already occupied, choose a free port such as 3001 and change the browser URL accordingly.

Equivalent WSL terminal commands:

```bash
cd /mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai
demo_dir=$(mktemp -d /tmp/astra-presentation-XXXXXXXX)
export ASTRA_DB="$demo_dir/astra.sqlite"
export HOST=127.0.0.1 PORT=3000 ASTRA_SPEED=1
node services/api/server.mjs
```

Open **http://127.0.0.1:3000**. Select **Demo administrator · full simulation**, then enter the simulation. This is a local role selector, not a production identity provider. No password or private token needs to be shown. Only the demo administrator controls scenarios; viewer is read-only, astronaut is restricted to CREW-03. The server binds to loopback.

The mission clock and its dated observations are fictional source time, distinct from the laptop wall clock; the demonstration is not live astronaut telemetry. Startup initializes six fictional crew and source-bound synthetic measurements in the **new** database. No separate seed command is needed. Do not use the normal runtime database or omit `ASTRA_DB`: the fallback is `data/runtime/astra.sqlite`. Do not open the same demo database in two server processes.

**Stop:** Ctrl+C in the server terminal, then wait for exit. **Recover:** retain the same terminal environment and run the same final Node command again. Keep `ASTRA_DB` unchanged to recover acknowledgements, waveform sources and scenario history. Creating another temp directory intentionally starts a separate demo. Do not delete an old database to repair a launch. Close the browser tab after the demo. Windows automated termination was an abrupt SIGTERM-equivalent; its recovery passed. WSL graceful shutdown returned exit 0.

## Five-minute presentation script

Use the 1× source clock so there is time to explain the evidence. Scenario Lab's **Advance clock** performs a genuine deterministic source-time step, avoiding a long wait or an exaggerated animation. Start from a fresh isolated database.

| Time | Action | Expected result and claim |
|---|---|---|
| 0:00–0:35 | Enter as demo administrator. Open Mission overview. | Six fictional astronauts and actual local synthetic observations. State clearly that this is a research prototype. |
| 0:35–1:00 | Crew health → Amara Okafor / NOVA / CREW-03. | Crew-bound vitals with units and source times. Allow the local reference anatomy to finish loading. |
| 1:00–1:40 | Scenario Lab → set CREW-03 assignment to `cardiorespiratory-drift`, duration 600, cadence 30, seed 42017. Leave other crew nominal. Start versioned mission. Set Advance mission seconds to 300 and press Advance clock. | Qualified synthetic N09 frames go through the actual N02 detector. An authored cardiorespiratory deviation produces a review event; it is not a diagnosed disease. |
| 1:40–2:15 | Return to Crew health, inspect recorded N02 evidence and acknowledge using the visible human acknowledgement button. | Acknowledgement is persisted and queues a report under the existing N02 contract. It does not erase the alert or mean Earth has received it. Never promise instant Earth delivery; default delay is 12 mission minutes. |
| 2:15–3:00 | In Reference anatomy, select Cardiovascular; rotate/reset the model. Expand region history. Select another crew, then CREW-03. | Real licensed meshes, crew-specific source-bound HR/HRV, quality, time and existing monitoring state. Generic reference geometry, no organ-damage inference. Skeleton has no mapped bone measurement and must say UNKNOWN. Head context can show nonprivate descriptive sleep context but has no precise head geometry. |
| 3:00–3:35 | Signal archive → CREW-03. Confirm authored synthetic input and Generate & import synthetic fixture once. Seek to range start → Play → Pause. | Genuine bounded N08 archive ingestion/replay, identified source/channel/units and a deliberate gap. The generated recording is an authored synthetic example, not live ECG. |
| 3:35–4:15 | Open the verified research backup in another tab. Show its exact original-source quotation, attribution and unsupported-question abstention. | N13/N14 source attribution only; not independently reviewed medical answer support. Optionally show the lexical CLI below. |
| 4:15–4:40 | Show the backup's archived N12 forecast with method, timestamps and limitations. | A previously executed synthetic result whose content hash was verified. Do not click Compute: a fresh protocol is outside this mission. |
| 4:40–5:00 | Pause the managed scenario, refresh the application, show retained acknowledgement and source history. Close with limitations. | Real durable recovery. AC-20, anatomical fidelity, scientific reviews and release acceptance remain open. |

If a control reports a revision conflict, Refresh/recover the run and retry once; backend concurrency guards remain enforced. New commands now refresh the revision before writing, while uncertain retries retain the exact original body and request ID.

If time is short, keep the separate N16 recording as a backup rather than adding it to the five-minute live flow. Stop/reset scenarios only through their existing controls; stopping retains alert/history records.

## Verified research and recorded backups

Open [research-backup.html](../artifacts/presentation-readiness-20261109/research-backup.html) directly in the browser. It contains an exact quotation from the verified corpus, its source/citation binding and an explicitly **archived** genuine N12 forecast. It is generated from verified local records, not prewritten prediction values. The full original N12 saved result remains at [recovered-prediction.json](../artifacts/n12-engineering-20261104/browser-05/recovered-prediction.json).

The authorized offline lexical workflow is separate from the app's older Research Library summaries:

```bash
node scripts/n14-offline.mjs verify
node scripts/n14-offline.mjs query --policy=rich_lexical --top_k=3 --query="light circadian sleep"
```

In PowerShell without Node on PATH, replace `node` with `.\artifacts\n03-windows-tools\node.exe`. These commands verify N13 sources and use the lexical baseline without model inference or network access. Inspect structured citation, exact span, corpus identity and question-support UNKNOWN independently. The mission's [offline evidence check](../artifacts/presentation-readiness-20261109/offline-evidence.json) includes a valid exact quotation, changed-citation rejection and unsupported numerical-question ABSTAIN. Both originals, 33 evidence units and 34 windows remain fixed; all 40 evaluation questions remain seen/provisional, with zero independent approvals.

The [standalone N16 HTML](../artifacts/n16-final-20261030/native/demo.html) is an existing **recorded** four-tool synthetic coordinator demonstration. Open the HTML file directly; no server, source database or worker is needed. Its authored risk is not an actual N02 event. Do not run N16's `run` command, workers or operational adapter. Qwen stays inactive; the accommodations support rule is unreviewed/inactive. Native embedding inference, independent numerical parity and semantic/hybrid promotion are not established by this mission.

## Acceptance and measurements

Three application defects were reproduced and repaired:

1. A waveform imported after the page-open cutoff was committed but invisible. After explicit import, an unchanged cutoff now advances to the server-confirmed source knowledge time, with a visible message. Concurrent user edits to a historical cutoff are retained. Two positive/negative controls and the actual HTTP/browser import flow cover this fix.
2. A running N09 mission advanced its revision between two-second UI polls, causing new controls to fail with `N09_REVISION_CONFLICT`. A new command now reads its selected run's current revision before posting. An uncertain retry preserves the exact original request ID and body; backend concurrency and duplicate prevention remain unchanged. Tests reproduce the stale revision, verify one committed command after a lost acknowledgement, and prove that a failed refresh performs no write. No blind automatic write retry was added.
3. Compact CSS hid the sidebar Logout action at 1000px while its top-bar alternative appeared only below 750px. The top-bar Logout now shares the 1000px breakpoint; final native-zoom browser checks require a visible session exit at every viewport.

Obsolete UI copy now distinguishes N06's active research-only source reads from the still-inactive legacy peak-motion adapter and N14/N15/N16 application/operational gates. The service-worker shell cache version changes so reloads fetch the repaired modules.

See the final evidence addendum below for actual fresh counts and timings. The browser runs use the owner's installed Windows Chrome through existing CDP tooling, with a fresh profile and disposable database. They are genuine browser runs in headless mode on the laptop; they do not establish physical display presentation, designated minimum hardware, spoken screen-reader certification or AC-20. Native 200% zoom is a separate run. Timings include control transport where stated; sampled heap/RSS excludes GPU allocations and is not a peak guarantee.

The main full-live workflow is qualified only for permitted operations. Fresh N12 forecasting/calibration, application integration of N13/N14 scientific corpus retrieval, native Qwen and operational N16 remain inactive. Their separately shown archived/CLI evidence must not be described as freshly executed integrated AI.

## Troubleshooting and offline behavior

- **Port occupied / EADDRINUSE:** stop only the server you launched, or use another free loopback port. Do not kill unrelated services. The port-conflict check verified that a second failed launch leaves the running demo intact.
- **Node missing or wrong version:** use the existing portable Windows Node above. No install is needed. Execute from the repository root so local modules and assets resolve.
- **UNKNOWN / stale source:** inspect Monitoring and source timestamp. Keep the server terminal running. Refresh after recovery; do not relabel unavailable data healthy or bypass readiness guards. A suspended browser/server is not live telemetry.
- **Acknowledgement disabled:** wait for current monitoring and case enrichment, use demo administrator, and inspect the actual case. A recorded alert remains visible when its current source is unavailable. No automatic acknowledgement is performed.
- **Blank/slow anatomy:** scroll the viewer into view, allow local asset verification to finish, then use Reload verified model or Coarse quality. If WebGL is unavailable, use text/region controls; do not claim 3D passed on that presentation machine. Reduced motion is independent of quality mode. No new assets are downloaded.
- **No waveform:** select the intended crew and explicitly generate/import one authorized synthetic fixture. There is no invented live ECG. Imports require the confirmation checkbox. Existing source and gap metadata must remain visible.
- **Session expires:** choose the authorized demo role again. HttpOnly cookies are retained across normal server recovery; do not print or paste session tokens.
- **Research unavailable:** use the saved HTML and original references. Do not enable experimental retrieval, Qwen or support rules to work around a failure.
- **No Internet:** backend, mesh loading, local lexical retrieval and saved backups use local files. Physical Internet-disconnect, full browser PWA-cache lifecycle and arbitrary cold offline navigation were not newly certified; keep the local server running. External license/source links need Internet to open; local hashes and excerpts remain available.
- **Unexpected crash:** retain the demo database path, restart the same command, and inspect source history/acknowledgement. Do not copy or overwrite the saved operational database. Use the recorded backup if live recovery cannot complete in time.

## Focused verification commands

The accepted explicit regression list is in `artifacts/presentation-readiness-20261109/regression-01.tap`. It intentionally excludes native/model training campaigns. The quick presentation controls are:

```bash
node scripts/check.mjs
node --test --test-isolation=none tests/foundation.test.mjs tests/monitoring-integrity.test.mjs tests/integration.test.mjs tests/n06.test.mjs
```

The startup probe creates/removes only a new temporary database. Give it a **new output filename** when reproducing evidence:

```bash
node scripts/presentation-startup-check.mjs /tmp/astra-startup-new.json
```

The existing Windows browser bridge accepts `--presentation`, optional `--record`, `--zoom=2`, and a **new output directory**. Do not point a rerun at frozen qualification evidence. It creates and cleans its own database/profile; no `--fixture-db` is used.

## Recording and backup use

If the final report says `recording.status: SAVED`, its WebM is an actual capture of the successful synthetic browser run: silent, 1280×720, nominal 2 fps, using only installed Chrome's MediaRecorder, capped at five minutes / 16 MiB. Captures pause during viewport audits to avoid interfering with measurement; those intervals can show a held frame. This is an automated workflow recording, not narrated footage or physical presented-frame evidence. The browser playback check decodes the saved video before calling that backup verified.

For a narrated owner recording with existing Windows tooling: open the application and backup tabs, focus the ASTRA Chrome window, press **Win+G** to check whether the already-installed capture tool is available, then **Win+Alt+R** to start. Follow the five-minute script and press **Win+Alt+R** to stop. Inspect the saved capture before presenting it. If the tool is absent/disabled, use the verified browser-run recording and screenshots; no new capture package or browser is authorized or needed. Do not claim a narrated recording was produced by this mission.

## Claims and boundaries

Safe claims: an offline local synthetic system with six fictional crew; deterministic personalized monitoring; persisted human acknowledgement; interactive licensed reference anatomy with source-bound metric navigation; synthetic archive replay; source quotation/citation verification; saved research model evidence; tested restart and privacy behavior in the stated environment.

Do not claim: real astronaut/patient validation, medical diagnosis/treatment, organ-specific disease localization, NASA endorsement, production security/deployment, approved predictive accuracy, independent scientific review, embedding parity, semantic/hybrid operational promotion, fresh native Qwen execution, active scientific-support rules, operational autonomous Health Agent, or physical AC-20 PASS. N11 Isolation Forest remains rejected; N12 operational promotions remain zero.

N01/N02/N04 formal completion is preserved. N03 remains Partial / AC-20 Open. N05/N06 and scientific modules retain original formal status, source/clinical/anatomical/reviewer/hardware/release gates. No new module was begun. This mission ends at delivery.

## Final evidence — accepted presentation scope

**ASTRA PRESENTATION READINESS: READY WITH LIMITATIONS.**

| Check | Fresh result | Evidence / boundary |
|---|---|---|
| Windows and WSL CLI, API and frontend | PASS | Real CLI, 1× clock, six crew, port-conflict handling and same-database recovery. One process serves both layers. |
| Dashboard, six crew and source binding | PASS | All six profiles match real backend observations. |
| N09 → N02 alert → approved-role acknowledgement | PASS | Actual versioned scenario and detector; acknowledgement persisted. No threshold/rule change. |
| N05/N06 anatomy and history | PASS | Five real meshes, camera/region interaction, crew binding, quality/time/units and accurate no-metric UNKNOWN. |
| N08 import and waveform playback | PASS | Actual HTTP import and archived source cursor; no invented live ECG. |
| Loading/failure/session/role/restart | PASS | Persistent outage/recovery, viewer write denial, session clearing; paused producer source counts unchanged across restart. |
| Real installed Windows Chrome | PASS | Chrome/156.0.8078.80; 14/14 ordinary-zoom and 14/14 native-200% workflow groups. Headless, not physical display qualification. |
| Responsive/accessibility | PASS in audited scope | 8 viewport/zoom audits, 120 native Tab checks, 389 resolved contrast bounds; zero final axe violations or console errors. Scope: Crew Health detail grid plus live workflow controls. Not general screen-reader/WCAG certification. |
| N13/N14 lexical evidence and exact attribution | PASS offline | Both original sources reverified; 33 evidence units / 34 windows fixed. Altered citation REJECT. App scientific-corpus integration remains unauthorized. |
| Unsupported general numerical/medical answers | ABSTAIN | Existing governed service, generation=none, zero native calls. Personal treatment request REJECTED. No support rules activated. |
| N12 forecast evidence | PASS archived / fresh NOT RUN | Exact saved forecast/result hashes verify. Fresh Compute would repeat calibration/evaluation and stays inactive. |
| N15 native / N16 operational integration | NOT AUTHORIZED / INACTIVE | No Qwen, sealed source or worker starts. Saved N16 HTML opens without execution. |
| Physical AC-20 / science / release | NOT TESTED / OPEN | No designated physical presented-frame measurement or independent approval fabricated. Formal module statuses unchanged. |

Automated QA: **258 distinct passed / 0 failed / 0 skipped** in [final regression](../artifacts/presentation-readiness-20261109/regression-delivery.tap). The later [49 UI controls](../artifacts/presentation-readiness-20261109/final-ui-controls.tap) pass after the compact CSS fix and overlap those 258; they are not added as new distinct cases. [Syntax/import check](../artifacts/presentation-readiness-20261109/syntax-delivery.txt): 297 JavaScript files / 0 errors, not TypeScript compilation. Earlier failed browser attempts and failing-before scenario controls remain available; they are not counted as accepted runs.

| Observed measurement | Result | Method / limitation |
|---|---|---|
| Windows CLI startup / restart | 706.4 ms / 241.5 ms | Includes shell, login and six-crew request. |
| WSL CLI startup / restart | 784.4 ms / 624.1 ms | Same isolated probe; no saved DB. |
| Health API p95 | 14.7 ms | Eight loopback samples, end of workflow; not all-endpoint throughput. |
| Crew switching including model remount | 8.22–8.88 s | Six samples; allow model loading in the presentation. |
| Region control → completed panel, p95 | 715.5 ms | Nine samples, includes finite transition wait, browser transport and recording overhead. No <500ms claim. |
| Scenario start + 300 source-second advance | 1420.1 ms | Real UI/HTTP processing; source seconds are simulated time. |
| Waveform import / observed playback response | 388.6 ms / 901.1 ms | Real generated synthetic source / cursor observation including controls. |
| Cold restart → recovered panel | 8.37 s | Includes renderer reload. Managed producer paused; alert, waveform, event and N12-job counts match. |
| Browser JS heap / Node RSS sample | 36.3 MiB / 230.2 MiB | End-of-workflow samples; excludes GPU/whole-browser memory and is not guaranteed peak. |
| Temporary SQLite | 24.13 MiB | Checkpointed then removed; no snapshot retained. |
| New artifact growth before final manifest | 28.49 MiB / 119 files | Includes all failed attempts and final evidence; historical artifacts untouched. |
| Graphics cleanup | PASS | Zero live contexts, buffers, programs, textures or pending animation callbacks after navigation. |

The actual [successful recording](../artifacts/presentation-readiness-20261109/browser-10/presentation.webm) is 822,987 bytes, silently recorded at nominal 2 fps; native Chrome playback decoded frames with no media error. One capture-command timeout recovered, so a visual hold can occur. This recording precedes only the compact-session CSS/cache repair; the final native-zoom run verifies that repair, while the desktop workflow is unchanged. [Main report](../artifacts/presentation-readiness-20261109/browser-10/report.json) · [final zoom report](../artifacts/presentation-readiness-20261109/browser-zoom-02/report.json). No narrated video or physical FPS evidence is claimed.

Preservation: 327 initial pins reconciled; 313 byte-identical and 14 intentional pinned edits. The setup-document addendum is separately accounted for outside that pin set. Three original GLBs, original source-element/license/runtime checks and both NASA corpus sources verify; no model weights, PDFs or historical snapshots copied/deleted. Large/sealed model/database files were not newly opened for hashing or execution. Status-table hashes match exactly. [Full changed/new file list and hashes](../artifacts/presentation-readiness-20261109/final-validation.json).

Remaining gates are authentic-source/rights completion, independent question/support/anatomical/clinical review, native resource admission, separately authorized application/agent integration, designated physical AC-20 and release approval. No module is formally promoted by this mission. Presentation delivery is complete; STOP.
