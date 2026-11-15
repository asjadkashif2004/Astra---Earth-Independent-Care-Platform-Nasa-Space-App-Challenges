# N13-02 scientific curation overlay

Only the two unchanged local N13-01 NASA originals are used. [Governance extension](../../../docs/DE_N07_N13_01_N13_02.md) passed validation before implementation;[completion report](../../../docs/N13_02_COMPLETION.md) records exact scope,evidence and remaining gates.

- `sections.json`:19reviewed leaf-boundary recipes,known false headings and ambiguity records.
- `evidence-units.json`:33bounded exact source excerpts across requirements,scientific findings,recommendations,caveats and background.
- `expectations.json`:40reviewable support/partial/unsupported expectations;independent human approval pending.
- `derived/curation.json`:versioned additive source/page/span overlay,9rejected headings,117overlap mappings and33known false-heading association repairs. Original chunks are unchanged.
- `derived/selected-pages.json`:41selected pages re-extracted directly from unchanged originals;no full471-page rerun.
- `derived/manifest.json`:plan,base,overlay,proof and bounded governance hashes.
- `derived/REVIEW.md`:human-readable expectations,source excerpts and explicit limitations.

```bash
node scripts/curate-research.mjs verify
node --test --test-isolation=none tests/research-curation.test.mjs
```

Verification rehashes unchanged originals/frozen corpus,regenerates deterministic curation in memory and checks the saved targeted proof;it does not download,rewrite sources or repeat PDF extraction. A fresh `build --output=/tmp/astra-n13-02-rebuild-unique` checks selected original pages again only when needed;use a fresh directory to preserve prior evidence. Existing local parser/Node/Python/WSL suffice.

Physical PDF page/text anchors are authoritative for this overlay. Printed headers were checked from extracted original text,not rendered glyphs. Numbered table notes are not section headings;table location is not quantitative/clinical evidence. Unreviewed or ambiguous text stays unknown. Engineering curation is not independent medical approval or model-answer validation. N13 and N07 remain In Progress;N14–N16 are not authorized. No runtime API is connected to this data. STOP for separate approval.
