# N03 final targeted acceptance closure — 2026-10-18

**DE-AC20-01 approved for documentation changes only:** N04/N05 may rely on the verified N03 functional/browser/responsive/zoom/bounded-accessibility evidence without N03 Complete. N03 remains Partial;AC-20 remains Open / Unverified and a release blocker. The approved provisional three warmed60-second trials at1920×1080 are subject to minimum hardware designation. N06 integrated evidence and N26 final revalidation are required. No test artifact is changed and no new certification or N04/N05/N06 implementation is approved. The authoritative [exception](DE_AC20_01.md) supersedes only prerequisite sequencing;all historical results and original AC-20 remain. STOP for separate N04 approval.

This record covers only the separately authorized final N03 zoom, accessibility and performance pass. Earlier Windows/Linux functional reports remain separate evidence; their 23 groups were not rerun or added to this pass's totals. N04–N06 and the cinematic redesign remain unapproved. The final acceptance verdict and measured timings are recorded in N03_BROWSER_ACCEPTANCE and N03_COMPLETION.

Final resume delivered and STOPPED: N03 Partial for AC-20 certification; filtered browser4/4 groups,8 PNGs,106 regression tests and42-file syntax/import checks pass. Only outstanding/changed scenarios were rerun. The initial pause and later explicit resume are recorded historically in SESSION_HANDOFF; the final delivery supersedes that pause.

## Reproduction and evidence contracts

Reuse the existing CDP runner, installed Windows Chrome155.0.8059.80 and verified portable Node24.21.0. Each invocation creates a disposable browser profile and on-disk SQLite database in Windows Temp, closes the browser/server and removes those temporary resources. It does not open the personal Chrome profile or normal data/runtime database. Use supported process/network approval when restricted. No disabled browser sandbox, OS configuration change or system package installation is needed.

From this checkout in WSL:

```bash
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --closure --zoom=2 --task=resume
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --closure --zoom=2 --task=audit
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --closure --zoom=1 --task=audit
artifacts/n03-windows-tools/node.exe 'C:\Users\basim\OneDrive\Desktop\ASTRA-Space-Medical-AI\scripts\windows-browser-acceptance.mjs' --closure --zoom=1 --task=performance
npm test
npm run check
npm run evaluate
npm run benchmark
```

Audit reports overwrite only their own artifacts/n03-closure-* directories. Preserve a report before rerunning when historical comparison matters. Failed-run/failure PNGs left in a directory are not successful evidence unless listed by the corresponding report.

The filtered resume task reuses hashes of passing200% numerical,100% accessibility and performance reports, checks changed Landing layouts at four sizes, then finishes mobile Replay/Check-in and200% announcements. Its final output is artifacts/n03-closure-200-resume. Do not use a WSL-only environment override to infer Windows output placement. Earlier200% PNGs were partially overwritten during interruption; only its numerical report is reused as a coherent earlier run. Final evidence hashes25 current coherent closure PNGs separately.

## Native zoom method

The new disposable profile sets Chrome's native partition.default_zoom_level preference (partition key x) to log(2)/log(1.2), with browser device scaling fixed at1. Actual native200% zoom produces DPR2, visualViewport.scale1, root/body CSS zoom1, and CSS viewport sizes960×540,683×384,384×512,195×422 for physical1920×1080,1366×768,768×1024,390×844. This uses Chrome page zoom, not CSS zoom or CDP pinch/page-scale emulation. The independent probe and final audit record every observation.

Primary implementation reference: [Chromium ChromeZoomLevelPrefs](https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc). The preference is confined to the disposable test profile.

## Accessibility procedure and limits

Every workspace runs actual browser axe-core4.11.1, native Tab traversal, DOM-order comparison, rendered focus outlines, viewport bounds/hit tests, and Chromium accessibility-tree control names. Inline links use actual line boxes; canvas hit testing allows its noninteractive annotation overlays. Native keyboard input comes through CDP, not synthetic DOM key handlers. The nine routes are Overview, Crew, Agent, Communications, Library, Scenario, Evidence/Provenance, Replay and Check-in. Landing is audited separately. Selected states retain native controls/aria-current/aria-pressed, including the paired performance controls.

The audit uses WCAG2A/AA,2.1A/AA,2.2AA and best-practice rule tags. No rules or offending elements were disabled to achieve a pass. axe cannot determine some gradient/image backgrounds: those records remain in raw incomplete arrays. Supplemental checks bound all computed gradient-stop and ancestor background colors conservatively, use the worst possible luminance contrast, and retain per-element foreground/background bounds and required3:1 or4.5:1 ratios. They do not replace full physical-display or assistive-technology assessment. Solid dark text backings protect labels over actual canvas scenes. Disabled controls, decorative dots and image-only nontext items are not certified as readable text.

Monitoring failure/recovery and original persisted alerts are exercised against the actual isolated backend. Polite availability and assertive recorded-review regions are checked for content, atomic/live semantics, deduplication and Earth-before-receipt separation. Numerical ticks do not repeatedly announce unchanged status. No alert creation, acknowledgement, transmission or health interpretation is delegated to accessibility code. The AX tree verifies browser-exposed live-region semantics; no NVDA/Narrator/VoiceOver audio/listening or formal WCAG conformance certification was performed.

The existing runner's prior real Enter/Space, sliders, WebGL context loss, dirty-input/stream preservation, HTTP failures, role scope, case acknowledgement and communications recovery evidence remains applicable. New full software regressions preserve those contracts. Screenshots were also visually inspected for all nine desktop workspaces and representative native200% laptop/tablet/mobile states; screenshots alone are not treated as acceptance.

axe was approved as an isolated test tool, not an application dependency: official npm axe-core4.11.1 tarball; metadata SHA512 integrity verified; tarball SHA2565b86f813d96904f2d925fed5715877c75fc1cc140f89565fb42145e7801b2305; MPL-2.0 license retained under artifacts/n03-closure-tools. Primary references: [axe-core](https://github.com/dequelabs/axe-core), [API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md). No npm install or package/lockfile change.

## Bounded correctness repairs

| ID / requirements | Browser-observed defect and repair | Regression evidence |
|---|---|---|
| N03-C08 / R29,R60 | Fixed rail clipped later navigation at zoom; bottom navigation only partly revealed native focused buttons; oversized focusable scene; smallest landing form/introduction and communications diagram did not reflow usefully. Rail scrolls, focus reveals the full nav target, scene bounds fit, and narrow entry/diagram content stacks without deleting controls. | Native200% four-size matrix; full eligible tab order, outline, bounds/hit tests and zero document/critical-control overflow; actual before sidebar screenshot/report archived. |
| N03-C09 / R29,R60 | Icon-only check-in/graphics lacked names, sidebar/axis/footer/crew metadata was too dim, dataset links depended on color, headings skipped levels and Landing content lacked a landmark. Added names, stronger neutral contrast, dark scene-text backings, underlines, h2 hierarchy and named introduction region. | axe on all nine routes plus Landing at100/200%; all AX controls named; per-element supplemental gradient contrast bounds; new icon-control regression. |
| N03-C10 / R24,R27,R60 | No dedicated critical-risk/monitoring announcement; paired graphics selected state not synchronized. Added persistent atomic status/alert regions driven only by the authorized projection, recorded-evidence wording, scope/session clearing and deduplication; both toggles expose aria-pressed. Visible alert toast is not announced a second time. | Three new software tests cover controls, failure/recovery/quiet ticks/logout, recorded alert with unavailable monitoring, dedup, unreceived Earth isolation and untouched human acknowledgement/queue. Actual backend fault/recovery and browser AX live semantics also verified. |
| N03-C11 / R29,R60 | Laptop200% Landing brand/introduction overlapped despite generic overflow passing. Reserve intro space under the brand at≤750 CSS px. | Actual screenshot inspection identified the defect; added child-clipping/brand-intersection assertions pass at four native200% sizes; final screenshots inspected. |
| N03-C12 / F08,R02,R29,R60 | An old onboard review toast survived Earth-before-receipt selection. Clear review-event toasts on viewpoint/session changes while retaining other operation messages. | Actual Chrome check fails before/pass after; before JSON/PNG preserved; new106th regression verifies Earth/logout without risk acknowledgement or case-queue side effects. |

Production edits are limited to app.mjs, index.html and styles.css. Scene shaders/renderer, API, detector, worker, retrieval, forecasts, telemetry import/provenance/privacy and communications remain unchanged. The HTML-tree test harness now reads actual index.html rather than inventing the persistent regions. This harness is software evidence, separate from real browser results.

## Judge profile: exact specification and honest boundary

Research lines374,744–754,766–774 and AC-20 at858 require a recent browser,8GB RAM and WebGL2 on the judge client; no local AI inference is required there. Preferred is16GB/modern or discrete GPU. judge-performance reduces particles/shadows/postprocessing; target shell≤3s warm, telemetry-to-UI p95<500ms, API p95<200ms,60FPS target and≥30FPS judge mode. Scalar throughput≥100 observations/s and detector<50ms/batch are separate backend budgets. Forecast<250ms and critical asset preference≤20MB are broader research constraints, not new forecasting or asset work authorized by this pass.

The research and roadmap name no exact minimum CPU, GPU, laptop model, OS or test duration. AC-20 requires the team's designated minimum machine; this pass asked for designation and does not infer it from available hardware. MASTER_PLAN assigns advanced continuous data-linked anatomy/profile performance to N06 and full research certification to N26. Recording that ownership does not authorize either module or waive this N03 acceptance gap.

Measured hardware: Lenovo82YY, Ryzen5 7430U (6 cores/12 logical), Windows-reported usable physical RAM14,861,852,672 bytes (~13.84GiB), Radeon integrated graphics, driver31.0.21925.1001, Windows11Pro10.0.26300/build26300. AdapterRAM reports2,147,483,648 bytes; that is not a claim of dedicated VRAM. Read-only CIM audit collected no serial/account identifiers. Exact JSON: artifacts/n03-closure-tools/hardware.json.

The existing Performance control lowers pixel resolution and enables event-driven reduced motion. It is not the specified continuously animated judge-performance profile. Measurements explicitly record both states, actual canvas size/renderer,30-second submission and rAF samples, and ongoing1Hz synthetic updates. These are real headless Chrome measurements on named hardware; they are not physical presentation FPS or certification on another8GB device. No renderer change was made to manufacture a passing rate.

## Manual review without normal application data

```bash
astra_n03_review_dir=$(mktemp -d /tmp/astra-n03-review.XXXXXX)
ASTRA_DB="$astra_n03_review_dir/astra.sqlite" PORT=3100 npm start
```

Open http://localhost:3100 in Windows Chrome. Select a local demo role; use Chrome menu Zoom200%; resize the physical viewport to the four documented sizes. Tab/Shift+Tab through nav and all controls; activate with Enter/Space; verify focus reveals the target, use scrolling for long content, change each profile and reception viewpoint, and inspect Gray/Unknown/recorded-alert text. Toggle OS/browser reduced motion and verify monitoring remains readable. Native zoom keyboard labels and external screen-reader behavior can be reviewed here without connecting automation to a personal browser profile. Stop the server with Ctrl+C. Retain the exact temporary directory only if a manual restart test is desired; normal npm start uses the separate existing runtime database.

## Stop rule

Do not start another module or a cinematic redesign. Keep N03 Partial while minimum-machine/continuous judge-profile presentation certification remains unsupported. Designation alone does not turn headless rAF or draw submissions into physical-display FPS evidence. Obtain explicit approval before any material renderer/profile implementation outside N03 or host/system change.
