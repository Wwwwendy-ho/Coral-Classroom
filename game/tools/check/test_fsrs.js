// Unit & integration tests for FSRS-6 (21-weight), SM-2 -> FSRS-6 migration,
// 5-channel Learner, bounded event log, regionFocus, and Hangul Jamo diagnostics.
// Run from game/: node tools/check/test_fsrs.js
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
function readJs(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const fsrsCode = readJs('src/js/fsrs.js');
const F = new Function(fsrsCode + '\nreturn { W: FSRS_W, review: fsrsReview, R: fsrsR, interval: fsrsInterval, nextD: fsrsNextD, initD: fsrsInitD, shortTermS: fsrsShortTermS, forgetS: fsrsForgetS };')();
const DAY = 864e5, T0 = Date.UTC(2026, 10, 4);
let fails = 0;
function t(name, fn){ try { fn(); console.log('ok  ', name); } catch(e){ fails++; console.log('FAIL', name, '-', e.message); } }

// --- 1. 21-weight FSRS-6 math invariants ---
t('has all 21 FSRS-6 weights', () => assert.strictEqual(F.W.length, 21));
t('new card, good: interval is round(w2) days', () => { const r = F.review(null, 3, T0); assert.strictEqual(r.ivl, Math.round(F.W[2])); assert.strictEqual(r.s, F.W[2]); });
t('new card, each grade starts at its weight', () => [1, 2, 3, 4].forEach(g => assert.strictEqual(F.review(null, g, T0).s, F.W[g - 1])));
t('new card, again: due again today', () => assert.strictEqual(F.review(null, 1, T0).ivl, 0));
t('new card, easy is easier than again', () => assert.ok(F.review(null, 4, T0).d < F.review(null, 1, T0).d));
t('recall is 90% after S days', () => assert.ok(Math.abs(F.R(10, 10) - 0.9) < 1e-9));
t('interval equals S at 90% retention', () => assert.ok(Math.abs(F.interval(17.3) - 17.3) < 1e-9));
t('higher target retention shortens interval, lower lengthens', () => {
  assert.ok(F.interval(20, 0.94) < F.interval(20, 0.90));
  assert.ok(F.interval(20, 0.85) > F.interval(20, 0.90));
});
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
t('difficulty drifts back toward initD(4)', () => {
  const target = F.initD(4);
  assert.ok(F.nextD(10, 3) < 10 && F.nextD(5, 3) < 5 && F.nextD(5, 3) >= target);
  assert.ok(Math.abs(F.nextD(target, 3) - target) < 0.01);
});
t('same-day review updates short-term stability monotonically', () => {
  const mem = { s: 5, d: 5, last: T0 };
  const s1 = F.review(mem, 1, T0 + 3600000).s;
  const s3 = F.review(mem, 3, T0 + 3600000).s;
  const s4 = F.review(mem, 4, T0 + 3600000).s;
  assert.ok(s1 < 5 && s3 >= 5 && s4 > s3, [s1, s3, s4].join(' '));
});
t('fsrsReview handles partial mem without d and future last timestamp', () => {
  const r = F.review({ s: 5, last: T0 + 10 * DAY }, 3, T0);
  assert.ok(Number.isFinite(r.s) && Number.isFinite(r.d) && r.d >= 1 && r.d <= 10 && r.ivl >= 1);
  assert.ok(F.forgetS(10, 0.02, 0.1) >= 0.01);
});

// --- Build integrated VM sandbox with fsrs.js + learning.js + learner.js + patterns-data.js + beach-data.js ---
function createSandbox(profileId){
  const lsStore = Object.create(null);
  const localStorage = {
    getItem(k){ return Object.prototype.hasOwnProperty.call(lsStore, k) ? lsStore[k] : null; },
    setItem(k, v){ lsStore[k] = String(v); },
    removeItem(k){ delete lsStore[k]; }
  };
  const win = {
    addEventListener(){},
    location: { origin: 'http://localhost:8820' }
  };
  const doc = {
    addEventListener(){},
    createElement(){ return { style: {}, setAttribute(){}, appendChild(){} }; }
  };
  const ctx = {
    window: win,
    document: doc,
    localStorage,
    setTimeout, clearTimeout, setInterval, clearInterval,
    S: { profile: profileId ? { id: profileId } : null, settings: { algorithm: 'fsrs6', difficulty: 'medium' }, decks: [] },
    esc: s => String(s || ''),
    ccIcon: () => '',
    reefMusicUpdate(){},
    reefEncounterReact(){},
    Ocean: { bubbles(){} },
    hanjaZh: c => String((c && (c.zh || c.hanja)) || ''),
    safeJsonParse: (raw, fb) => { try { return raw ? JSON.parse(raw) : fb; } catch(e){ return fb; } }
  };
  win.window = win;
  vm.createContext(ctx);
  vm.runInContext(
    fsrsCode + '\n' +
    readJs('src/js/learning.js') + '\n' +
    readJs('src/js/learner.js') + '\n' +
    readJs('src/js/patterns-data.js') + '\n' +
    readJs('src/js/beach-data.js'),
    ctx
  );
  return { ctx, lsStore };
}

// --- 2. gradeCardFSRS6 + SM-2 migration + difficulty-tied retention + autoRating ---
t('gradeCardFSRS6 ties target retention to difficulty (0.94 / 0.90 / 0.85)', () => {
  const { ctx } = createSandbox('p1');
  const easy = ctx.DIFFICULTIES.find(d => d.id === 'easy');
  const med  = ctx.DIFFICULTIES.find(d => d.id === 'medium');
  const hard = ctx.DIFFICULTIES.find(d => d.id === 'hard');
  assert.strictEqual(ctx.fsrs6RetentionForDiff(easy), 0.94);
  assert.strictEqual(ctx.fsrs6RetentionForDiff(med), 0.90);
  assert.strictEqual(ctx.fsrs6RetentionForDiff(hard), 0.85);
  const card = { fsrsS: 20, fsrsD: 5, fsrsLast: T0, reps: 3, lapses: 0 };
  const at = T0 + 20 * DAY;
  const rEasy = ctx.gradeCardFSRS6(card, 'good', at, easy);
  const rMed  = ctx.gradeCardFSRS6(card, 'good', at, med);
  const rHard = ctx.gradeCardFSRS6(card, 'good', at, hard);
  assert.ok(rEasy.interval < rMed.interval && rMed.interval < rHard.interval, [rEasy.interval, rMed.interval, rHard.interval].join(' '));
});

t('gradeCardFSRS6 migrates legacy SM-2 card cleanly and keeps fsrsLast <= now', () => {
  const { ctx } = createSandbox('p1');
  const med = ctx.DIFFICULTIES.find(d => d.id === 'medium');
  const legacyCard = { ease: 2.5, interval: 10, reps: 4, lapses: 0, state: 'review', due: T0 + 10 * DAY };
  const res = ctx.gradeCardFSRS6(legacyCard, 'good', T0 + 10 * DAY, med);
  assert.ok(res.fsrsS > 10, 'migrated stability should grow on good');
  assert.ok(res.fsrsD >= 1 && res.fsrsD <= 10);
  assert.strictEqual(res.fsrsLast, T0 + 10 * DAY);
  assert.strictEqual(res.state, 'review');

  // Skewed legacy card whose due is far in the future should not yield negative elapsed days
  const futureCard = { ease: 2.5, interval: 10, reps: 4, lapses: 0, state: 'review', due: T0 + 365 * DAY };
  const resFuture = ctx.gradeCardFSRS6(futureCard, 'good', T0, med);
  assert.strictEqual(resFuture.fsrsLast, T0);
  assert.ok(resFuture.fsrsS >= 10 && resFuture.interval >= 1);
});

t('autoRating weighs response speed under fsrs6 default', () => {
  const { ctx } = createSandbox('p1');
  ctx.S.settings.algorithm = 'fsrs6';
  assert.strictEqual(ctx.autoRating('choice', true, 1200), 'easy');
  assert.strictEqual(ctx.autoRating('choice', true, 5000), 'good');
  assert.strictEqual(ctx.autoRating('choice', true, 12000), 'hard');
  assert.strictEqual(ctx.autoRating('choice', false, 500), 'again');
  ctx.S.settings.algorithm = 'sm2_plain';
  assert.strictEqual(ctx.autoRating('choice', true, 1200), 'good');
});

// --- 3. 5-channel Learner + bounded 2000-entry event log + learnerNoteAnswer ---
t('Learner records all 5 channels and learnerNoteAnswer forwards { ms, mode }', () => {
  const { ctx, lsStore } = createSandbox('p_learn');
  const L = ctx.Learner;
  assert.deepStrictEqual(Array.from(L.channels), ['hear', 'read', 'recall', 'say', 'use']);

  ctx.learnerNoteAnswer({ id: 'c1', front: '물', back: 'water' }, 'listen', 'good', { ms: 1420, mode: 'listen', now: T0 });
  ctx.learnerNoteAnswer({ id: 'c2', front: '커피', back: 'coffee' }, 'flip', 'easy', { ms: 980, mode: 'flip', now: T0 + 1000 });
  ctx.learnerNoteAnswer({ id: 'c3', front: 'tea', back: '차' }, 'flip', 'hard', { ms: 4100, mode: 'flip', now: T0 + 2000 });
  ctx.learnerNoteAnswer({ id: 'c4', front: '감사합니다', back: 'thank you' }, 'echo', 'good', { ms: 5300, mode: 'echo', now: T0 + 3000 });
  ctx.learnerNoteAnswer({ id: 'c5', front: '저는 ___ 마셔요.', back: '물을' }, 'blank', 'good', { ms: 2600, mode: 'blank', now: T0 + 4000 });

  const sum = L.summary();
  assert.strictEqual(sum.items, 5);
  assert.strictEqual(sum.hear.learning, 1);
  assert.strictEqual(sum.read.learning, 1);
  assert.strictEqual(sum.recall.learning, 1);
  assert.strictEqual(sum.say.learning, 1);
  assert.strictEqual(sum.use.learning, 1);

  const evs = L.events();
  assert.strictEqual(evs.length, 5);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(evs.map(e => ({ ch: e.ch, ms: e.ms, m: e.m })))),
    [
      { ch: 'hear', ms: 1420, m: 'listen' },
      { ch: 'read', ms: 980, m: 'flip' },
      { ch: 'recall', ms: 4100, m: 'flip' },
      { ch: 'say', ms: 5300, m: 'echo' },
      { ch: 'use', ms: 2600, m: 'blank' }
    ]
  );

  L.flush();
  assert.ok(lsStore['cc-learner-p_learn'], 'cc-learner persisted');
  assert.ok(lsStore['cc-events-p_learn'], 'cc-events persisted');

  // Switching profiles flushes dirty events before loading the new profile
  ctx.S.profile = { id: 'p_other' };
  L.record('바다', 'read', 'good', { now: T0 + 5000, ms: 700, mode: 'flip' });
  ctx.S.profile = { id: 'p_learn' };
  assert.strictEqual(L.events().length, 5);
  ctx.S.profile = { id: 'p_other' };
  assert.strictEqual(L.events().length, 1);

  // dropProfile removes both storage keys
  L.dropProfile('p_learn');
  assert.strictEqual(lsStore['cc-learner-p_learn'], undefined);
  assert.strictEqual(lsStore['cc-events-p_learn'], undefined);
  L.dropProfile('p_other');
  assert.strictEqual(lsStore['cc-learner-p_other'], undefined);
  assert.strictEqual(lsStore['cc-events-p_other'], undefined);
});

t('cc-events log is bounded at 2000 entries with zero unbounded bloat', () => {
  const { ctx, lsStore } = createSandbox('p_bound');
  const L = ctx.Learner;
  for (let i = 0; i < 2050; i++) {
    L.record('단어', 'read', 'good', { now: T0 + i * 1000, ms: 500 + (i % 100), mode: 'flip' });
  }
  L.flush();
  const evs = L.events();
  assert.strictEqual(evs.length, 2000);
  assert.strictEqual(evs[0].ts, T0 + 50 * 1000);
  assert.strictEqual(evs[1999].ts, T0 + 2049 * 1000);
  const stored = JSON.parse(lsStore['cc-events-p_bound']);
  assert.strictEqual(stored.list.length, 2000);
});

// --- 4. Learner.regionFocus() canonical IDs & recommendations ---
t('Learner.regionFocus() uses canonical region IDs including reef and exposes channel metrics', () => {
  const { ctx } = createSandbox('p_reg');
  const L = ctx.Learner;
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(L.regionFocus(T0))),
    {
      byChannel: { hear: 0, read: 0, recall: 0, say: 0, use: 0 },
      dueByRegion: { lagoon: 0, caves: 0, reef: 0, beach: 0, town: 0, cove: 0 },
      weakestChannel: null,
      recommended: null
    }
  );

  // Two due 'use' items -> canonical 'reef' recommended, weakestChannel === 'use'
  L.record('학교에 가요', 'use', 'again', { now: T0 });
  L.record('밥을 먹어요', 'use', 'again', { now: T0 });
  const fReef = L.regionFocus(T0 + 1000);
  assert.strictEqual(fReef.weakestChannel, 'use');
  assert.strictEqual(fReef.dueByRegion.reef, 2);
  assert.strictEqual(fReef.dueByRegion.cove, 2);
  assert.strictEqual(fReef.recommended, 'reef');
  assert.strictEqual(fReef.dueByRegion.patterns, undefined);

  // Add three due 'read' items -> 'lagoon' becomes recommended, weakestChannel === 'read'
  L.record('바다', 'read', 'again', { now: T0 });
  L.record('조개', 'read', 'again', { now: T0 });
  L.record('물고기', 'read', 'again', { now: T0 });
  const fLagoon = L.regionFocus(T0 + 1000);
  assert.strictEqual(fLagoon.weakestChannel, 'read');
  assert.strictEqual(fLagoon.recommended, 'lagoon');
  assert.strictEqual(fLagoon.byChannel.read, 3);
  assert.strictEqual(fLagoon.byChannel.use, 2);
});

// --- 5. koJamoDiag & beach-data.js diagnostics ---
t('koJamoDiag diagnoses consonant, vowel, and batchim slips accurately', () => {
  const { ctx } = createSandbox('p_diag');
  assert.match(ctx.koJamoDiag('커피', '거피') || '', /consonant/i);
  assert.match(ctx.koJamoDiag('어머니', '오머니') || '', /vowel/i);
  assert.match(ctx.koJamoDiag('감사합니다', '감사하니다') || '', /받침|bottom/i);
  assert.strictEqual(ctx.koJamoDiag('비빔밥', '비빔밥'), null);
});

t('koJamoDiag handles compatibility Jamo (0x3131..0x318E)', () => {
  const { ctx } = createSandbox('p_diag2');
  assert.match(ctx.koJamoDiag('ㄱ', 'ㅋ') || '', /consonant/i);
  assert.match(ctx.koJamoDiag('ㅓ', 'ㅗ') || '', /vowel/i);
  assert.match(ctx.koJamoDiag('밥', '바ㅂ') || '', /받침|bottom/i);
});

t('koJamoDiag aligns 1-syllable insertions/deletions without misdiagnosing subsequent syllables', () => {
  const { ctx } = createSandbox('p_diag3');
  const delOnly = ctx.koJamoDiag('도서관', '도관') || '';
  assert.match(delOnly, /extra or missing syllable/i);
  assert.doesNotMatch(delOnly, /받침|bottom/i);

  const insOnly = ctx.koJamoDiag('사과', '가사과') || '';
  assert.match(insOnly, /extra or missing syllable/i);

  assert.match(ctx.koJamoDiag('김치찌개', '김지개') || '', /consonant/i);
  assert.match(ctx.koJamoDiag('감사합니다', '감하니다') || '', /받침|bottom/i);
  assert.strictEqual(ctx.koJamoDiag('사과', '바나나'), null);
});

t('beach-data bbCheck surfaces koJamoDiag hint for close spelling slips', () => {
  const { ctx } = createSandbox('p_beach');
  const dict = { 비빔밥: 1, 사과: 1, 커피: 1 };
  const lex = { has: w => !!dict[w], known: () => false, list: Object.keys(dict) };
  const res = ctx.bbCheck('비빔밤을 좋아해요.', lex);
  assert.strictEqual(res.fixes.length, 1);
  assert.strictEqual(res.fixes[0].kind, 'spell');
  assert.strictEqual(res.fixes[0].fix, '비빔밥');
  assert.match(res.fixes[0].why, /받침|bottom/i);
  assert.match(res.fixes[0].why, /Did you mean 비빔밥\?/);
});

console.log(fails ? fails + ' FSRS/Learner test(s) failed' : 'all FSRS-6 & Learner tests passed');
process.exit(fails ? 1 : 0);
