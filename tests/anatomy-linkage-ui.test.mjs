import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { frontendSession } from './dom-harness.mjs';

async function crewPage(fn) {
  const app = createApp({ autoTick: false }); let ui;
  try { ui = await frontendSession(app); await ui.click('[data-page=crew]'); await ui.flush(); await fn(ui, app); }
  finally { if (ui) await ui.close(); await app.close(); }
}
// Hold the next anatomy read open so the in-between state can be inspected.
function holdNextRead(ui) {
  const held = {};
  ui.intercept((path, options, base) => {
    if (!path.includes('/anatomy?') || held.release) return base(path, options);
    return new Promise(resolve => { held.signal = options.signal; held.release = () => base(path, options).then(resolve); });
  });
  return held;
}

test('N06 panel: a clock-driven refresh updates in place without flashing "Loading…"', () => crewPage(async (ui, app) => {
  assert.match(ui.el('#n06-status').textContent, /CREW-03 Cardiovascular · heart surfaces/);
  const value = ui.el('#n06-detail [data-n06-metric="heart_rate"] .n06-value').textContent;
  const held = holdNextRead(ui);
  app.engine.tick(30); ui.sources.at(-1).emit(app.engine.snapshot()); await ui.flush();
  assert.ok(held.release, 'the new mission time triggered a background read');
  assert.doesNotMatch(ui.el('#n06-status').textContent, /Loading/, 'the status strip keeps the current region while refreshing');
  assert.match(ui.el('#n06-status').textContent, /CREW-03 Cardiovascular/);
  assert.equal(ui.el('#n06-health').dataset.n06Refreshing, 'true');
  assert.equal(ui.el('#n06-health').getAttribute('aria-busy'), 'false', 'screen readers are not told the panel is busy every tick');
  held.release(); await ui.flush();
  assert.equal(ui.el('#n06-health').dataset.n06Refreshing, undefined);
  assert.equal(ui.el('#n06-health').dataset.n06State, 'ready');
  assert.notEqual(ui.el('#n06-detail [data-n06-metric="heart_rate"] .n06-value').textContent, value, 'the new reading replaced the old one in place');
}));

test('N06 panel: choosing a region still shows an explicit loading state until its data arrives', () => crewPage(async ui => {
  const held = holdNextRead(ui);
  await ui.el('#n06-health').emit('click', { target: ui.el('[data-n06-region="respiratory-left"]') }); await ui.flush();
  assert.match(ui.el('#n06-status').textContent, /Loading CREW-03/);
  assert.match(ui.el('#n06-detail').textContent, /Loading selected region/);
  assert.equal(ui.el('#n06-health').getAttribute('aria-busy'), 'true');
  held.release(); await ui.flush();
  assert.match(ui.el('#n06-status').textContent, /CREW-03 Respiratory · left lung/);
}));

test('N06 panel: a failed background refresh still withholds data as UNKNOWN', () => crewPage(async (ui, app) => {
  ui.intercept((path, options, base) => path.includes('/anatomy?') ? Promise.resolve({ ok: false, status: 503, json: async () => ({ error: { code: 'DOWN', message: 'Anatomy read unavailable' } }) }) : base(path, options));
  app.engine.tick(30); ui.sources.at(-1).emit(app.engine.snapshot()); await ui.flush();
  assert.match(ui.el('#n06-status').textContent, /UNKNOWN/);
  assert.match(ui.el('#n06-detail').textContent, /No current authorized observations displayed/);
  assert.equal(ui.el('#n06-health').dataset.n06Refreshing, undefined);
}));
