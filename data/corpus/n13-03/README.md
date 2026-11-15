# N13-03 evidence review preparation

This additive offline record uses only the frozen N13-01 publications/corpus and N13-02 curation. It does not answer medical questions or integrate a retrieval/model service.

- [Human review packet](derived/REVIEW_PACKET.md): all 40 existing expectations with source references, scope/abstention and pending independent decisions.
- [Coverage/exclusions](derived/COVERAGE.md): eight review areas, nine exclusions, four table-location findings and formal closure gates.
- [Plan](review-plan.json): explicit case-specific technical notes, retained categories and source selectors.
- `derived/packet.json` and `derived/manifest.json`: deterministic source/hash/anchor-bound records; do not edit generated approval fields or historical evidence.
- [Completion report](../../../docs/N13_03_COMPLETION.md) and [task-specific sequencing record](../../../docs/DE_N07_N13_01_N13_03.md).

```bash
node scripts/review-evidence.mjs verify
```

Run from the project root. Verification is offline, uses the saved targeted source proof, checks unchanged originals/corpus/curation and regenerates expected review bytes in memory. It performs no new PDF extraction or download. `build --output=/tmp/astra-n13-03-unique` can reproduce the review only when specifically needed; preserve existing outputs.

Technical distribution remains 24 supported / 8 partially supported / 8 unsupported. **0/40 independent approvals**: every scientific-support and medical-scope decision is pending. Quantitative claims from all four inspected tables remain excluded; only the old Table 2 page-number locator is corrected additively. No clinical approval, model answer quality, current exhaustive literature coverage or N14 eligibility follows from these checks. N07/N13 remain In Progress. Further work needs separate approval.
