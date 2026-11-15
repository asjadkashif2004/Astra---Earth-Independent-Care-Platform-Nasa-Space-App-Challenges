# N16 read-only foundation planning — delivered, no activation

2026-10-28. **Documentation preparation only.** [Proposed exception](DE_N16_READONLY_01.md), [architecture/tool/QA plan](N16_READONLY_FOUNDATION_PLAN.md). N16 **Not Started**; N15 **In Progress**. No dispatcher or prototype was implemented and no application tool, detector, API, database, model or native LLM runtime was executed.

## Findings and recommended scope

- The existing Health Agent's `buildCase` performs deterministic template construction and lexical summary retrieval. Its prefilled completed steps are not a dispatch trace. The UI already labels the workflow as non-executed/no LLM; those labels and behavior remain unchanged.
- Canonical crew observations, metric quality, personal baseline metadata, snapshot history, environment and durable N02 records provide reusable data shapes. No completed standalone trend tool exists; environmental per-value provenance is weaker and must not be invented. Source-level routes/functions and limitations are tabulated in the plan.
- Operational `Store`, `Engine` and `createApp` constructors perform writes/start work. Do not initialize them for a read-only experiment. The smallest proposed slice uses hashed synthetic fixtures through a real read adapter, not a live storage connection.
- Proposed initial registry: `get_current_vitals`, `get_data_quality`, `get_personal_baseline`, `get_open_risk_events`; HR/RR/SpO₂ and all six canonical fictional crew IDs, strict existing read/self-scope policy. Trends/environment are identified but unregistered future scope. No model is needed.
- A dispatcher must actually validate/authorize/invoke handlers, validate results and durably bind outputs/provenance to calls. UNKNOWN data remains UNKNOWN. Static labels, constant responses and fabricated completed steps cannot pass positive controls. Fixture reads demonstrate fixture access, not live monitoring integration or LLM autonomy.
- Existing N02 decisions and human acknowledgement remain authoritative. No writes except owned research trace artifacts; no crew/alerts/cases/messages/baselines/rules/medical-state mutations. No scientific answers or unreviewed N15-11 support rule.

## Governance disposition

**DE-N16-READONLY-01 is PROPOSED / NOT ACTIVATED.** The owner approved preparing this proposal only. Full N16 still requires N02/N10/N12/N14 and N15 if used. N02 is Complete; incomplete N10/N12/N14 require a new explicit task-only sequencing decision for any early N16 slice. Their transitive N03/N07/N08/N09/N11 prerequisites remain open. Existing N15/earlier exceptions cannot be borrowed. All human scientific, N14 parity, full-module, release and AC-20 gates remain.

N15-11 rule/packet/forms stay frozen, unreviewed and inactive; N15-10 factual questions still abstain. N07/N09/N13/N14 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. No module status changed.

## Planning validation and limits

Only local source/document inspection and deterministic file/link/status checks are appropriate here. No code, dependency, fixture generation, tool-dispatch test, model inference, retrieval experiment, server/SQLite access, monitoring, Scenario Lab or browser collection. [Preservation and planning validation](../artifacts/n16-readonly-plan-20261028/validation.json) records unchanged selected source/contracts, packages, primary specification and all ten frozen N15-11 packet members. Proposed acceptance targets are not measured runtime/performance results.

The complete authoritative `research/ASTRA_Deep_Research.md` was read, including its state-machine, permitted-tool, no-write/LLM-authority, trace, acknowledgement and presentation requirements. PDF presentation comparison could not be completed: `pdftotext` and installed Python PDF-reader libraries are unavailable. No tool installation or replacement parser was attempted. This CLI-only plan makes no visual/PDF-comparison or browser acceptance claim.

## Exact next separately approvable task

Owner would need to explicitly **activate DE-N16-READONLY-01 and approve one fixture-only, non-generative N16-01 four-tool CLI/trace implementation**, with the frozen scope and focused acceptance criteria in the plan. That task would establish real synthetic fixture reads, argument/permission/provenance checks, durable success/failure/cancellation records and read-only isolation. It would omit live services/storage, LLM/retrieval, prediction/cognition, all action tools, support-rule activation and app integration.

No code may start under the current planning approval. Scope expansion, model use or a live-data bridge requires separate governance and implementation authorization. **STOP after planning.**
