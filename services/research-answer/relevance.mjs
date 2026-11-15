// N15-10: research-only, non-generative outer gate. N14-02 remains authoritative
// for attribution. There are NO approved factual-support rules in this version.
import { assessClaim, makeClaimRequest, validQuery } from '../research-retrieval/retrieval.mjs';
import { validateWindow, hashJSON } from '../research-retrieval/contract.mjs';

export const RELEVANCE_SCHEMA = 'astra.research-relevance-request.v1';
const keys = (v, names) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).sort().join() === [...names].sort().join();
function data(v, depth = 0, seen = new Set()) {
  if (depth > 20) return false;
  if (v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) return true;
  if (typeof v === 'string') return v.length <= 12000;
  if (typeof v !== 'object' || seen.has(v) || !Array.isArray(v)
    && ![null, Object.prototype].includes(Object.getPrototypeOf(v))) return false;
  const descriptors = Object.values(Object.getOwnPropertyDescriptors(v));
  if (descriptors.length > 128) return false;
  seen.add(v);
  const ok = descriptors.every(d => !d.get && !d.set && data(d.value, depth + 1, seen));
  seen.delete(v); return ok;
}
const textOrNull = v => v === null || typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
const listOrNull = v => v === null || Array.isArray(v) && v.length <= 12 && v.every(x => typeof x === 'string' && textOrNull(x));
function validRequest(r) {
  if (!data(r) || !keys(r, ['schema_version', 'mode', 'question', 'requested_window_id', 'requirements', 'numeric_literals'])
    || r.schema_version !== RELEVANCE_SCHEMA || !['source_quotation', 'factual_answer'].includes(r.mode)
    || typeof r.question !== 'string' || !r.question.trim() || Buffer.byteLength(r.question) > 1024
    || !(r.requested_window_id === null || /^window-[0-9a-f]{64}$/.test(r.requested_window_id))
    || !keys(r.requirements, ['subject', 'relationship', 'numeric', 'unit', 'comparator', 'conditions', 'qualifiers'])
    || !Array.isArray(r.numeric_literals) || r.numeric_literals.length > 8) return false;
  const q = r.requirements;
  return textOrNull(q.subject) && textOrNull(q.relationship) && textOrNull(q.comparator)
    && ['required', 'not_requested', 'unknown'].includes(q.numeric) && [null, 'Hz', 'dB'].includes(q.unit)
    && listOrNull(q.conditions) && listOrNull(q.qualifiers)
    && r.numeric_literals.every(x => keys(x, ['value', 'unit', 'value_start', 'value_end', 'unit_start', 'unit_end'])
      && typeof x.value === 'string' && /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(x.value)
      && typeof x.unit === 'string' && /^(?:Hz|hertz|dB|decibels?)$/i.test(x.unit)
      && ['value_start', 'value_end', 'unit_start', 'unit_end'].every(k => Number.isSafeInteger(x[k])));
}
function identifierRanges(text) {
  // Conservative exclusions, not a general document parser. No number becomes a
  // measured fact here even if it survives these necessary-condition filters.
  return [...text.matchAll(/\[[^\]\r\n]{1,80}\]|\b(?:https?:\/\/|doi:|window-|chunk-|evidence-unit-)\S+|(?:^|[\r\n])\s*(?:page|source|section|requirement|document|id)\s*[:#]?\s*[\w.:-]+/gi)]
    .map(m => [m.index, m.index + m[0].length]);
}
const overlaps = (start, end, ranges) => ranges.some(([a, b]) => start < b && end > a);
const unitPattern = unit => unit === 'Hz' ? /\b(?:Hz|hertz)\b/gi : /\b(?:dB|decibels?)\b/gi;
function numericVeto(text, requirements, question) {
  const mentioned = [...new Set([
    /\b(?:Hz|hertz)\b/i.test(question) ? 'Hz' : null,
    /\b(?:dB|decibels?)\b/i.test(question) ? 'dB' : null
  ].filter(Boolean))];
  if (mentioned.length && (requirements.numeric !== 'required' || mentioned.length !== 1
    || mentioned[0] !== requirements.unit)) return {status: 'UNKNOWN', reason: 'question_requirements_mismatch'};
  if (requirements.numeric !== 'required') return {status: 'UNKNOWN', reason: 'numeric_interpretation_not_verified'};
  if (!requirements.unit) return {status: 'UNKNOWN', reason: 'requested_unit_unresolved'};
  const excluded = identifierRanges(text);
  const values = [...text.matchAll(/(?<![\w.])[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.])/g)]
    .filter(m => !overlaps(m.index, m.index + m[0].length, excluded));
  const units = [...text.matchAll(unitPattern(requirements.unit))]
    .filter(m => !overlaps(m.index, m.index + m[0].length, excluded));
  const paired = values.some(v => units.some(u => v.index + v[0].length <= u.index
    && /^\s*$/.test(text.slice(v.index + v[0].length, u.index))));
  if (!values.length || !units.length || !paired) return {status: 'MISSING_REQUESTED_NUMERIC_FACT',
    reason: !values.length ? 'measurement_value_absent' : !units.length ? 'requested_unit_absent' : 'value_unit_binding_absent',
    requested_unit: requirements.unit};
  return {status: 'NO_DETERMINISTIC_VETO', reason: 'numeric_presence_is_not_fact_support', requested_unit: requirements.unit};
}
function bindLiterals(literals, window) {
  const a = window.anchor, excluded = identifierRanges(a.text), out = [];
  for (const x of literals) {
    const vs = x.value_start - a.start, ve = x.value_end - a.start;
    const us = x.unit_start - a.start, ue = x.unit_end - a.start;
    if (vs < 0 || ve <= vs || ve > a.text.length || a.text.slice(vs, ve) !== x.value)
      throw Error('numeric_literal_offset_or_text_mismatch');
    if (overlaps(vs, ve, excluded)) throw Error('identifier_is_not_measurement');
    if (us < ve || ue <= us || ue > a.text.length || a.text.slice(us, ue) !== x.unit
      || !/^\s*$/.test(a.text.slice(ve, us))) throw Error('numeric_literal_offset_or_text_mismatch');
    if (overlaps(vs, ve, excluded) || overlaps(us, ue, excluded)) throw Error('identifier_is_not_measurement');
    // A substring of 150 or a word ending in Hz is not the literal requested.
    if (/[\w.+-]/.test(a.text[vs - 1] ?? '') || /[\w.]/.test(a.text[ve] ?? '')
      || /\w/.test(a.text[ue] ?? '')) throw Error('numeric_literal_token_boundary');
    out.push({...structuredClone(x), source_id: a.document_id, original_sha256: a.original_sha256,
      page_index: a.page_index, page_sha256: a.page_sha256, window_id: window.id,
      offset_unit: a.offset_unit, status: 'LITERAL_BOUND_ONLY', fact_support: 'UNVERIFIED'});
  }
  return out;
}
export function assessRelevance(request, attribution, index, {evidence} = {}) {
  const result = {schema_version: 'astra.research-relevance-result.v1', decision: 'ABSTAIN',
    reason: 'question_support_unverified', canonical_attribution: {status: 'NOT_VERIFIED'},
    exact_quotation: {status: 'NOT_VERIFIED'}, question_relevance: {status: 'UNKNOWN', reviewed_rule: null},
    answer_support: {status: 'ABSTAIN'}, numeric_check: {status: 'NOT_ASSESSED'}, numeric_literals: [],
    quotations: [], research_only: true, clinical_support: false, independent_review: 'pending',
    audit: {canonical_binding: null, attribution_assessment: null}};
  const finish = (decision, reason) => {
    result.decision = decision; result.reason = reason;
    if (decision === 'REJECT') result.answer_support.status = 'REJECT';
    return result;
  };
  if (!validRequest(request)) return finish('REJECT', 'invalid_relevance_request');
  result.audit.request_sha256 = hashJSON(request);
  result.audit.requirements = structuredClone(request.requirements);
  result.audit.requirements_authority = 'unverified_declaration';
  if (!data(attribution)) return finish('REJECT', 'invalid_attribution_data');
  let canonical, assessment;
  try {
    const matches = index.windows.filter(w => w.id === attribution?.evidence?.citation?.window_id);
    if (matches.length === 1) {
      validateWindow(matches[0], evidence); canonical = matches[0];
      result.audit.canonical_binding = makeClaimRequest(canonical).evidence;
    }
    assessment = assessClaim(attribution, index, {evidence});
  } catch { return finish('REJECT', 'canonical_evidence_unavailable_or_invalid'); }
  result.audit.attribution_assessment = assessment;
  result.canonical_attribution.status = assessment.evidence_binding ? 'VALID' : 'INVALID';
  result.exact_quotation.status = canonical && attribution?.claim?.kind === 'literal_quote'
    ? attribution.claim.text === canonical.anchor.text ? 'VALID' : 'INVALID' : 'UNVERIFIED';
  if (assessment.decision !== 'ACCEPT') {
    result.answer_support.status = assessment.decision === 'REJECT' ? 'REJECT' : 'ABSTAIN';
    return finish(assessment.decision, assessment.reason);
  }
  if (!validQuery(request.question) || /<\||\|>/.test(request.question)
    || !validQuery(JSON.stringify(request.requirements))) return finish('REJECT', 'untrusted_question_or_requirements');
  if (request.requested_window_id !== null && request.requested_window_id !== canonical.id)
    return finish('REJECT', 'requested_citation_mismatch');
  try { result.numeric_literals = bindLiterals(request.numeric_literals, canonical); }
  catch (error) { return finish('REJECT', error.message); }
  const q = request.requirements;
  if (request.mode === 'source_quotation') {
    // Finite, explicit reproduction command, never a model/client reclassification
    // of an arbitrary factual/clinical question into quotation mode.
    if (request.question !== `Quote the complete source passage ${canonical.id}.`
      || request.requested_window_id !== canonical.id || q.subject !== canonical.id
      || q.relationship !== 'reproduce_complete_span' || q.numeric !== 'not_requested'
      || q.unit !== null || q.comparator !== null || q.conditions?.length !== 0
      || q.qualifiers?.length !== 0 || request.numeric_literals.length)
      return finish('ABSTAIN', 'quotation_request_not_explicit_or_contains_factual_requirements');
    result.question_relevance.status = 'NOT_ASSESSED_QUOTATION_ONLY';
    result.answer_support.status = 'NOT_CLAIMED';
    result.quotations = [{text: canonical.anchor.text, citation: assessment.citations[0],
      role: canonical.role, scope: makeClaimRequest(canonical).scope}];
    return finish('ACCEPT', 'explicit_source_quotation_attribution_only');
  }
  result.numeric_check = numericVeto(canonical.anchor.text, q, request.question);
  if (result.numeric_check.status === 'MISSING_REQUESTED_NUMERIC_FACT') {
    result.question_relevance.status = 'INSUFFICIENT_REQUESTED_FACT';
    return finish('ABSTAIN', 'requested_numeric_fact_not_established');
  }
  if (!q.subject || !q.relationship || q.conditions === null || q.qualifiers === null
    || q.numeric === 'unknown' || result.numeric_check.reason === 'question_requirements_mismatch')
    return finish('ABSTAIN', 'question_requirements_unresolved');
  // No expected labels, relevance scores, selected IDs or client-provided rule
  // names can establish semantic support. No reviewed factual rule exists yet.
  return finish('ABSTAIN', 'no_reviewed_question_support_rule');
}

export function assessSavedAnswer(request, saved, index, {evidence} = {}) {
  if (!data(saved) || saved?.status !== 'VERIFIED_QUOTATION' || !Array.isArray(saved.quotations) || saved.quotations.length !== 1
    || saved.model_selection?.decision !== 'SELECT' || !Array.isArray(saved.model_selection.evidence_ids)
    || saved.model_selection.evidence_ids.length !== 1
    || saved.model_selection.evidence_ids[0] !== saved.quotations[0]?.citation?.window_id)
    return assessRelevance(request, null, index, {evidence});
  const q = saved.quotations[0];
  // Recheck actual supplied text/metadata, not the saved assessment or its verdict.
  // N14 supporting citations have document_id/role/source display metadata in
  // addition to the v2 input binding. Verify those too, rather than discarding
  // them or relaxing N14's exact input schema.
  const {document_id, role, source, ...citation} = q.citation;
  const result = assessRelevance(request, {schema_version: 'astra.claim-assessment.v2',
    evidence: {source_id: q.source_id, citation}, role: q.role, scope: q.scope,
    claim: {kind: 'literal_quote', text: q.text}}, index, {evidence});
  const verified = result.audit.attribution_assessment?.citations[0];
  if (verified && hashJSON(q.citation) !== hashJSON(verified)) {
    result.decision = 'REJECT'; result.reason = 'serialized_supporting_citation_mismatch';
    result.canonical_attribution.status = 'INVALID'; result.answer_support.status = 'REJECT';
    result.quotations = [];
  }
  return result;
}
