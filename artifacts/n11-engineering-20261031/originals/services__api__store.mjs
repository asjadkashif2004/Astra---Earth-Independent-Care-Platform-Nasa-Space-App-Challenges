import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AppError } from '../../packages/contracts.mjs';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export class Store {
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT OR IGNORE INTO schema_versions VALUES(1, datetime('now'));
      CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS crew_members(id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS telemetry_points(event_id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, ts TEXT NOT NULL, metric TEXT NOT NULL, value REAL, quality TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS telemetry_history ON telemetry_points(crew_id, ts DESC);
      CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY, crew_id TEXT NOT NULL, ts TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS snapshot_history ON snapshots(crew_id, ts DESC);
      CREATE TABLE IF NOT EXISTS health_baselines(crew_id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS risk_events(id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_cases(id TEXT PRIMARY KEY, risk_event_id TEXT NOT NULL UNIQUE REFERENCES risk_events(id), crew_id TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS enrichment_jobs(id TEXT PRIMARY KEY REFERENCES risk_events(id), status TEXT NOT NULL, next_attempt_at INTEGER NOT NULL, json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS enrichment_due ON enrichment_jobs(status, next_attempt_at);
      INSERT OR IGNORE INTO schema_versions VALUES(2, datetime('now'));
      CREATE TABLE IF NOT EXISTS sleep_sessions(record_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, revision INTEGER NOT NULL, crew_id TEXT NOT NULL, end_at TEXT NOT NULL, known_at TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(session_id,revision));
      CREATE INDEX IF NOT EXISTS sleep_history ON sleep_sessions(crew_id,end_at DESC,revision DESC);
      CREATE TRIGGER IF NOT EXISTS sleep_no_update BEFORE UPDATE ON sleep_sessions BEGIN SELECT RAISE(ABORT, 'append-only sleep revisions'); END;
      CREATE TRIGGER IF NOT EXISTS sleep_no_delete BEFORE DELETE ON sleep_sessions BEGIN SELECT RAISE(ABORT, 'append-only sleep revisions'); END;
      INSERT OR IGNORE INTO schema_versions VALUES(3, datetime('now'));
      CREATE TABLE IF NOT EXISTS comms_messages(id TEXT PRIMARY KEY, priority INTEGER NOT NULL, status TEXT NOT NULL, deliver_at INTEGER, json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS comms_ready ON comms_messages(status, priority, deliver_at);
      CREATE TABLE IF NOT EXISTS scenario_runs(id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS checkins(id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS n10_records(seq INTEGER PRIMARY KEY,crew_id TEXT NOT NULL,kind TEXT NOT NULL,record_id TEXT NOT NULL,revision INTEGER NOT NULL,json TEXT NOT NULL,UNIQUE(crew_id,kind,record_id,revision));
      CREATE INDEX IF NOT EXISTS n10_crew ON n10_records(crew_id,seq);
      CREATE TRIGGER IF NOT EXISTS n10_no_update BEFORE UPDATE ON n10_records BEGIN SELECT RAISE(ABORT,'append-only N10'); END;
      CREATE TRIGGER IF NOT EXISTS n10_no_delete BEFORE DELETE ON n10_records BEGIN SELECT RAISE(ABORT,'append-only N10'); END;
      INSERT OR IGNORE INTO schema_versions VALUES(4,datetime('now'));
      CREATE TABLE IF NOT EXISTS waveform_sources(crew_id TEXT NOT NULL,recording_id TEXT NOT NULL,revision INTEGER NOT NULL,json TEXT NOT NULL,original BLOB NOT NULL,PRIMARY KEY(crew_id,recording_id,revision));
      CREATE TABLE IF NOT EXISTS waveform_chunks(crew_id TEXT NOT NULL,recording_id TEXT NOT NULL,revision INTEGER NOT NULL,channel TEXT NOT NULL,chunk_index INTEGER NOT NULL,start_at TEXT NOT NULL,sample_count INTEGER NOT NULL,sha256 TEXT NOT NULL,samples BLOB NOT NULL,PRIMARY KEY(crew_id,recording_id,revision,channel,chunk_index),FOREIGN KEY(crew_id,recording_id,revision) REFERENCES waveform_sources(crew_id,recording_id,revision));
      CREATE TRIGGER IF NOT EXISTS waveform_source_no_update BEFORE UPDATE ON waveform_sources BEGIN SELECT RAISE(ABORT,'append-only waveform sources'); END;
      CREATE TRIGGER IF NOT EXISTS waveform_source_no_delete BEFORE DELETE ON waveform_sources BEGIN SELECT RAISE(ABORT,'retained waveform sources'); END;
      CREATE TRIGGER IF NOT EXISTS waveform_chunk_no_update BEFORE UPDATE ON waveform_chunks BEGIN SELECT RAISE(ABORT,'immutable waveform chunks'); END;
      CREATE TRIGGER IF NOT EXISTS waveform_chunk_no_delete BEFORE DELETE ON waveform_chunks BEGIN SELECT RAISE(ABORT,'retained waveform chunks'); END;
      INSERT OR IGNORE INTO schema_versions VALUES(5,datetime('now'));
      CREATE TABLE IF NOT EXISTS n09_calibrations(hash TEXT PRIMARY KEY,json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS n09_runs(id TEXT PRIMARY KEY,actor TEXT NOT NULL,request_id TEXT NOT NULL,json TEXT NOT NULL,UNIQUE(actor,request_id));
      CREATE TABLE IF NOT EXISTS n09_events(run_id TEXT NOT NULL REFERENCES n09_runs(id),seq INTEGER NOT NULL,request_id TEXT,json TEXT NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(run_id,seq),UNIQUE(run_id,request_id));
      CREATE TABLE IF NOT EXISTS n09_failures(seq INTEGER PRIMARY KEY,run_id TEXT NOT NULL REFERENCES n09_runs(id),json TEXT NOT NULL,hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS n09_failure_no_update BEFORE UPDATE ON n09_failures BEGIN SELECT RAISE(ABORT,'append-only N09 failures'); END;
      CREATE TRIGGER IF NOT EXISTS n09_failure_no_delete BEFORE DELETE ON n09_failures BEGIN SELECT RAISE(ABORT,'retained N09 failures'); END;
      CREATE TRIGGER IF NOT EXISTS n09_event_no_update BEFORE UPDATE ON n09_events BEGIN SELECT RAISE(ABORT,'append-only N09 events'); END;
      CREATE TRIGGER IF NOT EXISTS n09_event_no_delete BEFORE DELETE ON n09_events BEGIN SELECT RAISE(ABORT,'retained N09 events'); END;
      CREATE TRIGGER IF NOT EXISTS n09_calibration_no_update BEFORE UPDATE ON n09_calibrations BEGIN SELECT RAISE(ABORT,'immutable N09 calibration'); END;
      CREATE TRIGGER IF NOT EXISTS n09_calibration_no_delete BEFORE DELETE ON n09_calibrations BEGIN SELECT RAISE(ABORT,'retained N09 calibration'); END;
      INSERT OR IGNORE INTO schema_versions VALUES(6,datetime('now'));
      CREATE TABLE IF NOT EXISTS predictions(id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS knowledge_documents(id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS knowledge_chunks(id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES knowledge_documents(id), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT, json TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'append-only audit'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'append-only audit'); END;`);
  }
  get(key, fallback = null) { const row = this.db.prepare('SELECT json FROM state WHERE key=?').get(key); return row ? JSON.parse(row.json) : fallback; }
  set(key, value) { this.db.prepare('INSERT INTO state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json').run(key, JSON.stringify(value)); }
  transaction(fn) {
    if (this.inTransaction) return fn();
    this.db.exec('BEGIN IMMEDIATE'); this.inTransaction = true;
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
    finally { this.inTransaction = false; }
  }
  ingest(events) {
    const stmt = this.db.prepare('INSERT INTO telemetry_points VALUES(?,?,?,?,?,?,?)');
    return this.transaction(() => {
      for (const e of events) {
        if (this.db.prepare('SELECT 1 FROM telemetry_points WHERE event_id=?').get(e.event_id)) throw new AppError(409, 'DUPLICATE_EVENT', 'Telemetry event has already been ingested.');
        stmt.run(e.event_id, e.crew_id, e.ts, e.metric.name, e.metric.value, e.quality.status, JSON.stringify(e));
      }
      return events.length;
    });
  }
  snapshot(crew, ts) { const s = this.db.prepare('INSERT INTO snapshots(crew_id,ts,json) VALUES(?,?,?)'); for (const c of crew) s.run(c.id, ts, JSON.stringify({ ts, ...c })); }
  history(crewId, limit = 180, before = '9999') { return this.db.prepare('SELECT json FROM snapshots WHERE crew_id=? AND ts<=? ORDER BY ts DESC,id DESC LIMIT ?').all(crewId, before, limit).map(r => JSON.parse(r.json)).reverse(); }
  latestTelemetry(crewId, metric) {
    const row = this.db.prepare('SELECT json FROM telemetry_points WHERE crew_id=? AND metric=? ORDER BY ts DESC,rowid DESC LIMIT 1').get(crewId, metric);
    return row ? JSON.parse(row.json) : null;
  }
  sleepRevision(sessionId){const row=this.db.prepare('SELECT json FROM sleep_sessions WHERE session_id=? ORDER BY revision DESC LIMIT 1').get(sessionId);return row?JSON.parse(row.json):null;}
  sleepHistory(crewId,limit=180,before='9999'){return this.db.prepare('SELECT json FROM sleep_sessions WHERE crew_id=? AND known_at<=? ORDER BY end_at DESC,revision DESC LIMIT ?').all(crewId,before,limit).map(r=>JSON.parse(r.json));}
  appendSleep(record){
    const prior=this.sleepRevision(record.session_id);
    if(prior&&(record.crew_id!==prior.crew_id||record.source.kind!==prior.source.kind||record.source.device_id!==prior.source.device_id))throw new AppError(409,'SOURCE_CONFLICT','Sleep revision belongs to another crew/source.');
    if(record.revision!==(prior?.revision??0)+1)throw new AppError(409,'SLEEP_REVISION_CONFLICT','Sleep revision must append to the current version.');
    if(prior&&Date.parse(record.observed_at)<=Date.parse(prior.observed_at))throw new AppError(409,'OUT_OF_ORDER','Sleep correction observation time must advance.');
    this.db.prepare('INSERT INTO sleep_sessions VALUES(?,?,?,?,?,?,?)').run(record.record_id,record.session_id,record.revision,record.crew_id,record.end_at,record.known_at,JSON.stringify(record));
  }
  checkins(crewId, limit, actor = null) {
    return this.db.prepare('SELECT json FROM checkins WHERE crew_id=? AND (? IS NULL OR json_extract(json,\'$.actor\')=?) ORDER BY rowid DESC LIMIT ?')
      .all(crewId, actor, actor, limit).map(row => JSON.parse(row.json));
  }
  put(table, id, value, extras = {}) {
    const definitions = {
      risk_events: ['crew_id', 'created_at'], agent_cases: ['risk_event_id', 'crew_id'], comms_messages: ['priority', 'status', 'deliver_at'],
      enrichment_jobs: ['status', 'next_attempt_at'], scenario_runs: [], checkins: ['crew_id'], health_baselines: [], missions: [], crew_members: ['mission_id'],
      predictions: ['crew_id', 'created_at'], knowledge_documents: [], knowledge_chunks: ['document_id'],
    };
    const fields = definitions[table]; if (!fields) throw new Error('Invalid record type');
    const idKey = table === 'health_baselines' ? 'crew_id' : 'id';
    const columns = [idKey, ...fields, 'json']; const values = [id, ...fields.map(k => extras[k] ?? value[k] ?? null), JSON.stringify(value)];
    this.db.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')}) ON CONFLICT(${idKey}) DO UPDATE SET ${columns.slice(1).map(c => `${c}=excluded.${c}`).join(',')}`).run(...values);
  }
  list(table, limit = 300) {
    if (!['enrichment_jobs', 'risk_events', 'agent_cases', 'comms_messages', 'scenario_runs', 'checkins', 'health_baselines', 'predictions', 'missions', 'crew_members', 'knowledge_documents', 'knowledge_chunks'].includes(table)) throw new Error('Invalid record type');
    return this.db.prepare(`SELECT json FROM ${table} ORDER BY rowid DESC LIMIT ?`).all(limit).map(r => JSON.parse(r.json));
  }
  record(table, id) {
    if (!['enrichment_jobs', 'risk_events', 'agent_cases', 'comms_messages', 'checkins'].includes(table)) throw new Error('Invalid record type');
    const r = this.db.prepare(`SELECT json FROM ${table} WHERE id=?`).get(id); return r ? JSON.parse(r.json) : null;
  }
  audit(actor, action, resourceId, metadata = {}) {
    const prev = this.db.prepare('SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1').get()?.hash ?? 'GENESIS';
    const ts = new Date().toISOString(); const json = JSON.stringify(metadata); const digest = hash([prev, ts, actor, action, resourceId, json]);
    this.db.prepare('INSERT INTO audit_events(ts,actor,action,resource_id,json,prev_hash,hash) VALUES(?,?,?,?,?,?,?)').run(ts, actor, action, resourceId ?? null, json, prev, digest);
  }
  audits(limit = 200) { return this.db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(limit); }
  verifyAudit() {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY id').all(); let previous = 'GENESIS';
    for (const r of rows) { if (r.prev_hash !== previous || hash([previous, r.ts, r.actor, r.action, r.resource_id, r.json]) !== r.hash) return false; previous = r.hash; }
    return true;
  }
  prune(now) {
    const cutoff = new Date(now - 86_400_000).toISOString();
    this.db.prepare('DELETE FROM telemetry_points WHERE ts<?').run(cutoff);
    this.db.prepare('DELETE FROM snapshots WHERE ts<?').run(cutoff);
    this.db.prepare("DELETE FROM comms_messages WHERE status='delivered' AND json_extract(json,'$.kind')='telemetry' AND deliver_at<?").run(now - 3_600_000);
    this.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
  }
  close() { this.db.close(); }
}
