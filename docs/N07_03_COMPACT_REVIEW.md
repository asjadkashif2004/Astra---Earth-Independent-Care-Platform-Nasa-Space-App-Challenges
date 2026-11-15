# N07-03 — Compact RadLab source resolution attempt

2026-10-23. **Blocked before import; STOP. N07 remains In Progress.** This separately authorized bounded investigation did not acquire a complete RadLab record. The previous [N07-03 review and 16-row gap matrix](N07_03_REVIEW.md) and its historical artifacts are preserved unchanged.

## Source investigated

Exact official candidate: `https://visualization.osdr.nasa.gov/radlab/gui/knowledgebase/BPD` — the BPD instrument knowledgebase page, intended representation **HTML**, not a radiation series. The [official API guide](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) directs instrument identifiers to the knowledgebase. Its documented field/time filters do not establish a compact instrument-only JSON lookup. No undocumented limit/distinct parameters or guessed timestamps were used, and the earlier oversized query was not repeated.

The [NASA-hosted BPD page](https://visualization.osdr.nasa.gov/radlab/gui/knowledgebase/BPD), available through the web tool's previously crawled representation, identifies BPD/Timepix, BioSentinel, heliocentric orbit at 1 AU and an auto-generated instrument entry. That establishes a relevant candidate, **not current HTTP completeness, raw size, SHA-256 or an acquired original**. A converted search/browser-tool page is not a substitute for original response bytes.

## One actual request; failure and evidence limits

One supported-escalation direct HTTPS GET targeted only that exact page. It used standard-library Python, `Accept: text/html`, `Accept-Encoding: identity`, redirects refused, no credentials, a 15-second alarm and a 65,537-byte probe read to detect crossing the unchanged **65,536-byte ceiling**. The code would require HTTP 200, text/html, unencoded UTF-8, a complete HTTP read, matching Content-Length when supplied and a closing HTML document before saving any temporary review bytes.

The request failed **before the body-read/save/validation branch**:

```text
urllib.error.HTTPError: HTTP Error 500: Internal Server Error
```

Exit code 1. No error body was read or saved. No temporary original/review directory, source approval, adapter, cache entry or acquisition manifest was created. There was no retry, alternate query, source substitution, decompression, truncation or cap increase. The precise server/proxy cause and transient versus persistent nature are unknown; this does not prove the instrument page or every compact official representation is permanently unavailable.

| Requested evidence | Actual result |
|---|---|
| Exact resource / GET | BPD knowledgebase URL above; one direct request |
| HTTP outcome | 500; not an accepted original |
| Successful response format/MIME | Intended HTML; successful-response MIME not verified |
| Complete original size / SHA-256 | Unavailable; zero originals saved |
| Source version / receipt time | Unavailable; review date known, no successful retrieval receipt |
| Earlier API response size | Still unknown beyond exceeding 65,536 bytes; **not assumed to be 65,537 total** |
| Raw radiation time-series acquisition | None |

Minimal machine-readable failure record: [review.json](../artifacts/n07-03-compact-20261023/review.json). It is not a scientific-source acquisition receipt.

## Use conditions and attribution

The BPD page links [NASA OSDR Terms and Conditions](https://science.nasa.gov/reference/osdr-help-terms-and-conditions/), which permit viewing/downloading public content, retain source/third-party responsibilities and disclaim warranties. [NASA's RadLab acknowledgement guidance](https://science.nasa.gov/reference/osdr-faq/) requests RadLab Portal credit, URL and version. Those official references were reviewed. They do not establish a blanket license to all multi-agency radiation records, referenced graphics or page code.

Because no complete live original was available, embedded notices, source version and any third-party material in that exact representation could not be checked. **No CC0/SPDX license or redistribution permission is invented or assigned.** A future accepted representation must retain actual notices and attribution, disclose unavailable version information, and remain inert: no executing HTML/scripts, fetching linked assets or rendering downloaded markup inside ASTRA. The current two-source JSON-only allowlist has not been expanded.

## Files, validation and remaining gates

Only this report, its small failure JSON and current planning/checkpoint documentation change. Production/QA code, source approvals, cache implementation, original bytes/receipts, dependencies, monitoring and graphics remain unchanged. No adapter/integrity tests or JavaScript syntax checks were run because no implementation began; the earlier 39 focused passes / 86-file syntax evidence are historical, not new results. Documentation-link/consistency and preservation checks are recorded separately in the failure JSON.

Actual closure checks: **5 Markdown files / 153 relative links, zero missing links, balanced fences and all 26 roadmap module IDs retained; 35 existing files rehashed with zero changes.** Existing initial N07-03 failure evidence and N07-01/02 originals/receipts are included. Changed files: this new report and failure JSON, AGENTS.md, MASTER_PLAN.md, MODULE_TRACKER.md and SESSION_HANDOFF.md. No historical artifact was edited.

The [original N07 gap matrix](N07_03_REVIEW.md) is unchanged: RadLab metadata remains blocked; actual small BIDMC/Sleep-EDF/PTT samples, named OSD-575/656 provenance, remaining source cards, applicable verified subject/time manifests and multi-source reproducibility remain incomplete. This task supplies no dataset rows, measurements, split assignments, model training or new mandatory acquisition requirement. **N13 remains ineligible under the unchanged full-N07 and separate-approval gates.**

Smallest next N07 task, **not authorized**: a separately approved single availability recheck of this same exact official BPD page; only if a complete response is within the existing cap and its notices can be verified should an exact inert-HTML adapter/cache extension proceed. Stop on another failure; no guessed API filters, automatic retries or broader downloads. Alternatively the user may separately approve an independent outstanding N07 sample task while leaving RadLab blocked; that is not a substitute or waiver.

N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; N07 In Progress; AC-20 Open / Unverified. **STOP pending explicit approval.**
