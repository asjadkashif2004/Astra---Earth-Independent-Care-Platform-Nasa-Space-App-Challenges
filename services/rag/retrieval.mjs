import { readFileSync } from 'node:fs';
import { hash } from '../api/store.mjs';

// Optional local artifact failures must not prevent API/core-monitor startup.
export const SOURCES = []; export const DATASETS = [];
export const KNOWLEDGE_STATUS = { ready: false };
export const METHOD = 'curated-lexical-v2';
export const CORPUS_VERSION = '2026.11-local-v2';
export function refreshSources() {
  try {
    const docs = JSON.parse(readFileSync(new URL('../../knowledge/sources.json', import.meta.url), 'utf8'));
    if (!Array.isArray(docs) || !docs.length) throw new Error('Invalid corpus');
    const loaded = docs.map(doc => ({ ...doc, sha256: hash(doc.summary), corpus_version: CORPUS_VERSION, content_kind: 'curated_paraphrase' }));
    SOURCES.splice(0, SOURCES.length, ...loaded); KNOWLEDGE_STATUS.ready = true;
  } catch { KNOWLEDGE_STATUS.ready = false; }
  return KNOWLEDGE_STATUS.ready;
}
try { DATASETS.push(...JSON.parse(readFileSync(new URL('../../data/public-metadata/catalogue.json', import.meta.url), 'utf8'))); } catch { /* Optional catalogue is not a detector dependency. */ }

const stop = new Set(('a an the what why how is are do does can should to for of in on with my me our it and about this that which from as be astra '
  + 'there their they them when where who has have its than then into over after before get gets got make makes will would could also any you your '
  + 'affect affects affected effect effects happen happens happening cause causes caused change changes changed '
  + 'monitor monitors monitored monitoring track tracks tracked tracking').split(' '));
/** Light, deterministic stemming applied identically to questions and sources (no external model or dictionary). */
export function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && /(ch|sh|x|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 6 && w.endsWith('ing')) w = w.slice(0, -3);
  return w;
}
function words(text) { return (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(t => (t.length > 2 || /^\d{2,}$/.test(t)) && !stop.has(t)).map(stem); }
function tokens(text) { return [...new Set(words(text))]; }
/** Plain-language words mapped to the vocabulary NASA sources use. Expansions only add candidate terms. */
const SYNONYMS = Object.fromEntries(Object.entries({
  microgravity: 'gravity', weightlessness: 'gravity', weightless: 'gravity', eyesight: 'vision', sight: 'vision', blurry: 'vision', eyes: 'sans vision',
  vision: 'sans', dizzy: 'dizziness', vertigo: 'dizziness', nauseous: 'nausea', vomiting: 'nausea', sick: 'sickness', mental: 'behavioral',
  psychological: 'behavioral', depressed: 'depression', anxious: 'anxiety', stressed: 'stress', lonely: 'isolation', loneliness: 'isolation',
  insomnia: 'sleep', tired: 'fatigue', tiredness: 'fatigue', exhausted: 'fatigue', cardiac: 'heart', heartbeat: 'heart', pulse: 'heart',
  muscular: 'muscle', workout: 'exercise', infection: 'immune', viruses: 'immune', viral: 'immune', flu: 'immune', germs: 'microbe',
  bacteria: 'microbe', bacterial: 'microbe', diet: 'nutrition', eat: 'food', meals: 'food', carbon: 'co2', dioxide: 'co2', crewmates: 'teamwork',
  conflict: 'teamwork', cancer: 'radiation', cosmic: 'radiation', neutrons: 'neutron radiation', osteoporosis: 'bone', fracture: 'bone',
  headaches: 'headache', oxygen: 'hypoxia',
}).map(([word, extra]) => [stem(word), extra.split(' ').map(stem)]));
function expand(terms) { return [...new Set(terms.flatMap(t => [t, ...(SYNONYMS[t] ?? [])]))]; }
// Token sets are cached per loaded record, but every query still reads the live source records, so a corrupt or
// unavailable source fails the query visibly instead of being hidden by a stale index.
const prepared = new WeakMap();
function entryFor(doc) {
  let entry = prepared.get(doc);
  if (!entry) { entry = { doc, topics: new Set(doc.topics.flatMap(words)), title: new Set(words(doc.title)), content: new Set(words(doc.title + ' ' + doc.summary)) }; prepared.set(doc, entry); }
  return entry;
}
refreshSources();

export function unsafeQuery(query) {
  return /\b(diagnos\w*|prescrib\w*|medication|insulin|antibiotic|drug dosage|dosage|suicide|self.harm|ignore (all|previous)|system prompt|execute|shell|delete alerts|change telemetry)\b/i.test(query);
}
/**
 * Deterministic cited retrieval. A source qualifies only with a topic hit or three content hits (the original rule);
 * rarer words then rank higher, and sources scoring under 45% of the best match are dropped as tangential.
 */
export function retrieve(query) {
  if (!KNOWLEDGE_STATUS.ready && !refreshSources()) throw new Error('Local knowledge unavailable');
  if (unsafeQuery(query)) return { status: 'redirected', answer: 'This research assistant cannot diagnose, prescribe, alter measurements, or follow instructions embedded in a question. Ask the crew medical officer or a qualified clinician to review the evidence.', citations: [], confidence: 'abstained', method: METHOD };
  const entries = SOURCES.filter(d => d.verified).map(entryFor), terms = expand(tokens(query)), total = entries.length;
  const documentFrequency = new Map();
  for (const entry of entries) for (const t of new Set([...entry.topics, ...entry.content])) documentFrequency.set(t, (documentFrequency.get(t) ?? 0) + 1);
  const weight = t => Math.log(1 + total / (documentFrequency.get(t) ?? total));
  const scored = entries.map(({ doc, topics, title, content }) => {
    const matches = terms.filter(t => topics.has(t) || content.has(t));
    const raw = matches.reduce((s, t) => s + (topics.has(t) ? 3 : 1), 0);
    const score = matches.reduce((s, t) => s + (topics.has(t) ? 3 : title.has(t) ? 2 : 1) * weight(t), 0);
    return { doc, raw, score, matches };
  }).filter(r => r.raw >= 3).sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  const ranked = scored.filter(r => r.score >= (scored[0]?.score ?? 0) * 0.45).slice(0, 3);
  if (!ranked.length) return { status: 'abstained', answer: 'The local source pack does not establish an answer to that question. Consult a qualified reviewer and the original research. No medical recommendation can be inferred.', citations: [], confidence: 'insufficient support', method: METHOD };
  return { status: 'supported', answer: ranked.map((r, i) => `[${i + 1}] ${r.doc.summary}`).join('\n\n'),
    citations: ranked.map(({ doc, matches }, i) => ({ number: i + 1, id: doc.id, title: doc.title, publisher: doc.publisher, section: doc.section, url: doc.url, sha256: doc.sha256, accessed_at: doc.accessed_at, matched_terms: matches })),
    confidence: 'topic match; original source review required', method: METHOD, generated_by_llm: false, corpus_version: CORPUS_VERSION };
}
