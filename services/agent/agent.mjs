import { AppError } from '../../packages/contracts.mjs';
import { retrieve } from '../rag/retrieval.mjs';

export const TOOLS = Object.freeze(['get_current_vitals', 'get_recent_trends', 'get_personal_baseline', 'get_data_quality', 'get_environment', 'get_open_risk_events', 'search_trusted_knowledge', 'launch_cognitive_checkin', 'draft_case_summary', 'queue_ground_message']);
export function authorizeTool(name, { acknowledged = false } = {}) {
  if (!TOOLS.includes(name)) throw new AppError(403, 'TOOL_FORBIDDEN', 'Tool is outside the Crew Health Agent allowlist.');
  if (name === 'queue_ground_message' && !acknowledged) throw new AppError(409, 'HUMAN_ACK_REQUIRED', 'A person must acknowledge the case before transmission.');
  return true;
}
export function buildCase(risk, now) {
  if (!risk?.id || !risk.evidence?.length || risk.data_quality !== 'good') throw new AppError(422, 'EVIDENCE_REQUIRED', 'An existing quality-checked detector event is required.');
  const knowledge = retrieve(risk.evidence.some(e => e.metric === 'sleep_duration') ? 'sleep fatigue heart cardiovascular review' : 'cardiovascular heart multimodal review');
  return { id: `CASE-${risk.id}`, risk_event_id: risk.id, crew_id: risk.crew_id, state: 'awaiting_human_ack',
    created_at: new Date(now).toISOString(), synthetic: true, generated_by_llm: false, agent_version: 'constrained-graph-v1',
    steps: ['OBSERVE', 'VERIFY QUALITY', 'READ BASELINE', 'EXPLAIN EVENT', 'RETRIEVE EVIDENCE', 'RECOMMEND CHECK-IN', 'DRAFT CASE'].map(name => ({ name, status: 'complete' })),
    summary: `${risk.crew_id}: ${risk.display.status_text}. ${risk.evidence.map(e => `${e.metric}: ${e.standardized_deviation > 0 ? '+' : ''}${e.standardized_deviation} personal-baseline SD for ${Math.round(e.persistence_seconds)}s`).join('; ')}. Verify measurement and request crew medical officer review.`,
    recommendation: 'Verify the sensor readings, offer a voluntary fatigue check-in, and consult the crew medical officer or approved onboard protocol. No diagnosis or treatment is inferred.',
    citations: knowledge.citations, uncertainty: risk.uncertainty, human_ack: null, message_id: null };
}
