# One proposed V2 7070 support rule — independent review packet

**PROPOSED / NOT APPROVED / NOT ACTIVE.** Prepared 2026-10-28 for private research review. No review has occurred. This packet does not implement a rule, authorize inference or validate medical use.

1. Obtain the packet hash and verifier-file hash through the owner's authenticated handoff, separately from these files. A hash copied from an untrusted packet alone establishes no authenticity.
2. Check `verify.py` with `sha256sum verify.py` against that trusted verifier hash before running this small engineering integrity tool. It reads local bytes only; it is not a model/runtime launcher.
3. Obtain the **already preserved** `NASA-STD-3001 Vol 2 Rev F.pdf` from the owner, retaining its notices. No new download is needed. Expected original SHA-256: `a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f`.
4. Run from this packet directory, substituting the actual trusted hash and local original path:

   ```sh
   python3 verify.py --expected-packet-sha256 TRUSTED_PACKET_HASH --original "/path/to/NASA-STD-3001 Vol 2 Rev F.pdf"
   ```

5. Read `REVIEW.md`, `RULE.json`, `SOURCE.json` and the original PDF. Physical PDF page **134 is one-based**; check section7.9.1 / V2 7070 and surrounding context manually. Source extraction/citation integrity does not substitute for that judgment. The complete exact excerpt is `CANONICAL_EXCERPT.txt`.
6. Copy `REVIEWER_FORM.json` **outside the sealed packet**, then fill every relevant field. Select APPROVE, REJECT or REQUEST CHANGES; no option is preselected. Record actual competence, independence/conflicts, source/page checks, rationale and authentic dated sign-off evidence. Do not invent signatures, reviews or endorsement.
7. Return the completed record and sign-off evidence to the owner/custodian through their agreed authenticated channel. Do not edit this packet or place completed forms inside it. The owner verifies identity, competence, signature/authentication and hashes externally; software cannot establish these facts.
8. If reviews conflict, use a distinct qualified independent adjudicator and the separate blank adjudication form. Unresolved objections block acceptance. The owner completes an external copy of `OWNER_ACCEPTANCE_FORM.json` only after authentic review and adjudication where necessary.

The owner must arrange the handoff; this task contacts nobody. Share only these ten sealed files plus the preserved original PDF under its recorded conditions, not the ASTRA repository, credentials, telemetry, databases or model outputs. Retain publisher attribution/notices; this packet grants no additional redistribution rights or third-party material license. No public upload is performed.

This is review of **one proposed relationship and seen examples**, not a fresh blinded benchmark. Disclose prior involvement/exposure and conflicts. The author/implementation agent cannot supply its own independent approval. Appropriate competence concerns human factors/habitability requirements and interpretation of technical standards; it does not imply clinical licensure or clinical validation. The owner must assess actual qualifications.

Any edit to source binding, wording, qualifiers, answer, examples, forms, instructions or verifier changes the packet identity. Any rule revision changes its rule hash. Old decisions do not transfer: preserve prior versions/decisions and obtain review for the new exact hashes. SHA-256 provides content identity/tamper detection, **not** a digital signature or immutable filesystem.

Even an authenticated APPROVE plus owner acceptance authorizes no code change automatically. A separate bounded implementation instruction is required. N15-10 continues to abstain on factual answers; N15 remains In Progress and N16 Not Started. Other scientific/dependency gates stay open.
