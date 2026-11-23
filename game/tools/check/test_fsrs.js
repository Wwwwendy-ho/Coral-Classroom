// Unit tests for the FSRS-4.5 math in src/js/fsrs.js, which the learner model (src/js/learner.js) uses.
// fsrs.js is a piece of the app's one shared function, not a module, so this runs its text on its own and
// picks out the functions. Run: node tools/check/test_fsrs.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const code = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'js', 'fsrs.js'), 'utf8');
const F = new Function(code + '\nreturn { W: FSRS_W, review: fsrsReview, R: fsrsR, interval: fsrsInterval, nextD: fsrsNextD, initD: fsrsInitD };')();
const DAY = 864e5, T0 = Date.UTC(2026, 10, 4);
let fails = 0;
function t(name, fn){ try { fn(); console.log('ok  ', name); } catch(e){ fails++; console.log('FAIL', name, '-', e.message); } }

t('new card, good: interval is round(w2) days', () => { const r = F.review(null, 3, T0); assert.strictEqual(r.ivl, Math.round(F.W[2])); assert.strictEqual(r.s, F.W[2]); });
t('new card, each grade starts at its weight', () => [1, 2, 3, 4].forEach(g => assert.strictEqual(F.review(null, g, T0).s, F.W[g - 1])));
t('new card, again: due again today', () => assert.strictEqual(F.review(null, 1, T0).ivl, 0));
t('new card, easy is easier than again', () => assert.ok(F.review(null, 4, T0).d < F.review(null, 1, T0).d));
t('recall is 90% after S days', () => assert.ok(Math.abs(F.R(10, 10) - 0.9) < 1e-9));
t('interval equals S at 90% retention', () => assert.ok(Math.abs(F.interval(17.3) - 17.3) < 1e-9));
t('good on time grows stability', () => { let m = F.review(null, 3, T0); const s0 = m.s; const r = F.review({ s: m.s, d: m.d, last: T0 }, 3, T0 + m.ivl * DAY); assert.ok(r.s > s0 * 2, r.s); });
t('hard grows less than good, easy more', () => {
  const mem = { s: 10, d: 5, last: T0 }, at = T0 + 10 * DAY;
  const h = F.review(mem, 2, at).s, g = F.review(mem, 3, at).s, e = F.review(mem, 4, at).s;
  assert.ok(h < g && g < e, [h, g, e].join(' '));
});
t('again on a mature card lowers stability', () => { const mem = { s: 60, d: 5, last: T0 }; const r = F.review(mem, 1, T0 + 60 * DAY); assert.ok(r.s < 60, r.s); assert.strictEqual(r.ivl, 0); });
t('difficulty stays within 1..10', () => {
  let mem = null, now = T0;
  for (let i = 0; i < 40; i++) { const r = F.review(mem, 1, now); assert.ok(r.d >= 1 && r.d <= 10, r.d); mem = { s: r.s, d: r.d, last: now }; now += DAY; }
  mem = null;
  for (let i = 0; i < 40; i++) { const r = F.review(mem, 4, now); assert.ok(r.d >= 1 && r.d <= 10, r.d); mem = { s: r.s, d: r.d, last: now }; now += Math.max(1, r.ivl) * DAY; }
});
t('difficulty drifts back toward a new card\'s', () => assert.ok(F.nextD(10, 3) < 10 && F.nextD(1, 3) > 1));
t('a review the same day changes little', () => { const mem = { s: 5, d: 5, last: T0 }; const r = F.review(mem, 3, T0); assert.ok(Math.abs(r.s - 5) < 1e-9); });

console.log(fails ? fails + ' FSRS test(s) failed' : 'all FSRS tests passed');
process.exit(fails ? 1 : 0);
