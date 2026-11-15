# N13-01 offline publication corpus

Exactly two user-approved NASA originals and deterministic derived text,citation chunks and draft review questions. [Completion report](../../../docs/N13_01_COMPLETION.md) contains versions,rights,hashes,limits,tests and remaining acceptance. This data is independent of runtime monitoring and the existing prototype knowledge API.

- `sources.json`:exact official identity,source-specific rights/attribution,review pins and limits;no inferred CC license.
- `originals/`:complete unchanged PDFs,one-attempt markers and acquisition receipts. Do not edit or redownload.
- `internal-review.json`:original-SHA-bound identity/notices review,including the HRP cover-date placeholder and limits of text-only rights review.
- `derived/`:complete page text,corpus and inventory;heuristic heading/content-role labels,not validated medical semantics.
- `review.json`:10handwritten draft questions and8textual spot checks;not expert-approved medical expectations or model outputs.

Offline verification from the project root:

```bash
node scripts/research-corpus.mjs verify
node scripts/research-corpus.mjs build --output=/tmp/astra-n13-rebuild-unique
```

Use a fresh rebuild directory. Both commands require the pinned local wheel and WSL/Unix resource-limit support. They perform no network requests. Verify rejects changed originals,receipts,pages,chunks,anchors and inventory instead of repairing them. Acquisition remains an exhausted separately approved operation;never remove attempt markers to retry.

Do not interpret extracted tables/figures or heuristic section labels as independently verified science. Physical page numbers are authoritative;printed labels remain unverified. Source-specific attribution/notices are retained;referenced third-party publications/standards/images are not relicensed. No diagnosis,prescription,medical recommendation,clinical validation,NASA endorsement or full N13 completion is claimed. N07 remains incomplete;future N13 work needs approval and the applicable gate/exception extension.
