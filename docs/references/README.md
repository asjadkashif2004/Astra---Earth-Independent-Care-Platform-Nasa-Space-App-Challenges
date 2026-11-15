# Verified reference pack

`knowledge/sources.json` is the authoritative local summary manifest. It records checked URLs, publishers, sections, access date, authority tier, license notes and project-authored summaries. `/v1/provenance` adds SHA-256 hashes and corpus version. References provide scientific and architectural context, not endorsement or clinical thresholds.

| Source | Verified use |
|---|---|
| [NASA HRP hazards](https://www.nasa.gov/hrp/hazards/) | Problem taxonomy |
| [NASA HRP risks](https://www.nasa.gov/hrp/risks/) | Sleep/fitness/cardiovascular research categories |
| [ExMC architecture](https://ntrs.nasa.gov/citations/20220017869) | Data architecture, autonomy and constraints |
| [EIMO datascope](https://ntrs.nasa.gov/citations/20240000914) | Multimodal inputs and AI uncertainty |
| [Exploration EHR](https://ntrs.nasa.gov/citations/20230003216) | Asynchronous records and local access |
| [NASA-STD-3001 Volume 1](https://www.nasa.gov/reference/nasa-std-3001v1/) | Landing-page crew health scope only; no compliance claim |
| [NASA-STD-3001 Volume 2](https://www.nasa.gov/reference/nasa-std-3001v2/) | Landing-page environmental and human factors scope |
| [NASA OSDR](https://science.nasa.gov/biological-physical/data/osdr/) | Repository scope and research provenance |
| [BIDMC](https://physionet.org/content/bidmc/1.0.0/) | Dataset structure, hospital origin and ODC attribution |
| [NIST AI RMF](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10) | AI risk-governance reference |
| [Node SQLite](https://nodejs.org/api/sqlite.html) | Built-in database interface; installed Node 24 API smoke-tested |
| [MDN WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext) | Native rendering context and capability detection |
| [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) | Same-origin offline shell cache |

The full NASA standards, papers, biological datasets and clinical protocols are not bundled or claimed as ingested. OSD-575/656 pages returned SPA shells; Sleep-EDF and PTT-PPG checks timed out. Those catalogue entries retain verification caveats. Future competition dates, team names and regulatory claims in the supplied research are not adopted as verified product facts.

## PDF presentation audit
Original SHA-256: `ff83bd6e4e9e5764bf4f13ca3792cc1509f667a8dcec579f6b4f6fb9eb05e592`. 38 pages, 33 tagged tables, no raster image XObjects. The complete decoded page text is `research/PDF_CONTENT_AUDIT.txt`. `scripts/render-research.py` reconstructed selected vector drawing streams using installed librsvg/cairo; page 6's edge/link/ground architecture and persistence table and page 10's evidence→agent→human acknowledgement→communications sequence were visually inspected. Technology and deployment tables on pages 11/26 and execution roadmap on page 29 were also inspected. The page 25 CI reconstruction clips because this small interpreter does not implement full PDF clipping/form matrices; its complete pipeline is preserved in the Markdown. Reconstruction has approximate font metrics and is not a full pixel-faithful PDF renderer.
