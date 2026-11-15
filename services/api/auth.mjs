import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError, ROLES } from '../../packages/contracts.mjs';
import { hash } from './store.mjs';

export function createSession(store, role) {
  if (!ROLES.includes(role)) throw new AppError(422, 'INVALID_ROLE', 'Unknown local role.');
  const token = randomBytes(32).toString('hex'); const expires = Date.now() + 2 * 60 * 60_000;
  const identity = { id: `demo-${role}`, role, crew_id: role === 'astronaut' ? 'CREW-03' : null, demo: true };
  store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), expires, JSON.stringify(identity));
  store.audit(identity.id, 'auth.login', identity.id, { role, local_demo: true });
  return { token, identity, expires };
}
export function getIdentity(store, cookie = '') {
  const token = /(?:^|;\s*)astra_session=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];
  if (!token) return null;
  const s = store.db.prepare('SELECT json FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), Date.now());
  return s ? JSON.parse(s.json) : null;
}
export function checkServiceToken(header, expected) {
  if (!expected) throw new AppError(503, 'INGEST_DISABLED', 'External ingest requires ASTRA_INGEST_TOKEN on the server.');
  const value = String(header ?? '').replace(/^Bearer /, '');
  if (value.length !== expected.length || !timingSafeEqual(Buffer.from(value), Buffer.from(expected))) throw new AppError(403, 'SERVICE_TOKEN_REQUIRED', 'A telemetry service credential is required.');
}
