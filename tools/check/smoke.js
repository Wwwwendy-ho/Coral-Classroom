/* Browser smoke test of the GitHub copy, both profiles. The site must be served on the port (run.sh does it).
   Checks, with no page errors anywhere:
   - the profile screen's super rare plastic bag: Shelly won't eat it, and a note asks to keep the ocean clean;
   - each profile opens the 3D board (the grown-up profile through the maths question);
   - the crab starts beside the guide, tapped fish escape, and a deck opens from the board;
   - the grown-up checks: a wrong answer gives a new question, Cancel goes back, the right answer opens; inside a
     grown-up profile nothing asks again (leaving a deck, Library settings, Edit Mode), while the child's Edit
     Mode and Library settings still ask; the Library's home has a tab per learning goal, with Next up and today's count;
     a child leaving a deck early gets the subtraction question;
   - My words: a Korean card the grown-up misses joins her list, and its tile appears on the board;
   - Ask Shelly answers English, Chinese and Korean words with the network switched off;
   - the Library opens.
   Usage: node smoke.js [port]        Exits with 1 if anything fails. */
const { chromium } = require('playwright');
const { enter, solveGate } = require('./steps');
const port = +process.argv[2] || 8820;
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let failed = 0;
// The Library always has "⟵ Reef" (closes it); pages inside it also have a "‹" back arrow
async function closeLibrary(p) {
  if (await p.isVisible('.clib .clib-home')) { await p.click('.clib .clib-home'); await p.waitForTimeout(500); }
}
// On the board, the less-used buttons sit in one menu (top right)
async function menuPick(p, label) {
  const btn = await p.$('.r3-menubtn');
  if (btn && await btn.isVisible()) { await btn.click(); await p.waitForTimeout(300); await p.click('.r3-menu-row:has-text("' + label + '")'); }
  else await p.click('[data-act="toggle-edit-mode"]');
}
async function regionList(p) { const b = p.locator('[data-rb-list]'); if (await b.count()) { await b.click(); await p.waitForTimeout(200); } }
function check(name, ok, detail) { console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? '  ' + detail : '')); if (!ok) failed++; }
const nearestDeck = () => { const v = window.__reef3dView(), here = v.at; const s = v.spaces.filter(s => s.kind === 'deck').sort((a, b) => Math.abs(a.i - here) - Math.abs(b.i - here))[0]; window.__reef3dGo(s.i); return s.item.d.name; };

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cc-tour-off', '1'); } catch (e) {} });   // the What's new walkthrough is opened on purpose below
  const p = await ctx.newPage(); p.setDefaultTimeout(90000); p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  return p;
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });

  // Profile screen: the super rare plastic bag. Shelly won't eat it, and a note asks to keep the ocean clean.
  let p = await newPage(browser);
  await enter(p, null, { port });
  const odds = await p.evaluate(() => window.__reefFoodOdds(400000).bag || 0);
  check('the plastic bag is under 0.1% of drops', odds > 0 && odds < 400, odds + ' in 400,000');
  await p.evaluate(() => {
    window.__reefFoodForce('bag');
    const c = window.__reefLobbyView().renderer.domElement, r = c.getBoundingClientRect();
    c.dispatchEvent(new MouseEvent('click', { clientX: r.left + r.width * .3, clientY: r.top + r.height * .45, bubbles: true }));
  });
  await p.waitForSelector('.rl-note', { state: 'visible', timeout: 15000 }).catch(() => {});
  const bag = await p.evaluate(() => { const v = window.__reefLobbyView(), n = document.querySelector('.rl-note');
    return { note: n && !n.hidden ? n.textContent : '', left: v.food.filter(f => f.userData.kind === 'bag').length, gulped: !!v.gulpAt }; });
  check('Shelly refuses the plastic bag', !bag.gulped && bag.left === 0);
  check('a note asks to keep the ocean clean', /plastic/i.test(bag.note) && /clean/i.test(bag.note), bag.note.slice(0, 60));
  await p.click('.rl-note button').catch(() => {}); await p.waitForTimeout(400);
  check('the note closes with its button', await p.evaluate(() => { const n = document.querySelector('.rl-note'); return !n || n.hidden; }));
  check('profile screen: no page errors', !p.errors.length, p.errors.join(' / '));
  await p.context().close();

  // Child: board, crab, fish, Ask Shelly offline, Library, a deck, leaving it early
  p = await newPage(browser);
  await enter(p, 'child', { port });
  const b = await p.evaluate(() => {
    const v = window.__reef3dView(); if (!v) return { board: false };
    const g = v.guide.position, c = v.crab && v.crab.position;
    const sc = v.schools[0], rc = v.renderer.domElement.getBoundingClientRect(), pt = sc.fish[0].position.clone().project(v.cam);
    const x = rc.left + (pt.x + 1) / 2 * rc.width, y = rc.top + (1 - pt.y) / 2 * rc.height;
    v.renderer.domElement.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
    v.renderer.domElement.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    return { board: true, crabGap: c ? Math.hypot(c.x - g.x, c.z - g.z) : null, fled: !!sc.flee, warmed: v.warmed };
  });
  check('child: the 3D board opens', b.board);
  check('What\'s new: every step points at something on the board', !(await p.evaluate(() => window.__whatsNewMissing())).length, (await p.evaluate(() => window.__whatsNewMissing())).join(', '));
  await p.evaluate(() => window.__whatsNewShow()); await p.waitForTimeout(500);
  const tourOn = await p.isVisible('.cc-tour .cc-tour-card');
  await p.click('[data-tour-skip]').catch(() => {}); await p.waitForTimeout(500);
  check('What\'s new: the walkthrough opens and Skip closes it', tourOn && !(await p.$('.cc-tour')));
  check('the designed fonts are on (Fredoka, Nunito Sans)', await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 20px Fredoka') && [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Fredoka' && f.status === 'loaded'); }));
  check('child: the crab starts beside the guide', b.crabGap > 1 && b.crabGap < 5, 'gap ' + (b.crabGap || 0).toFixed(2));
  check('child: tapped fish escape', b.fled);
  check('child: effect shaders are prepared while loading', b.warmed > 0, b.warmed + ' shaders');
  await p.context().setOffline(true);
  await p.click('#askBtn');
  for (const [q, want] of [['turtle', /shell/], ['puppies', /form of “puppy”/], ['好', /hǎo/], ['火車', /train/], ['거북이', /geobuki/]]) {
    await p.fill('#askIn', q); await p.click('.ask-form button[type=submit]');
    await p.waitForFunction(() => !document.querySelector('.ask-wait'), null, { timeout: 15000 }); await p.waitForTimeout(300);
    const a = await p.evaluate(() => [...document.querySelectorAll('.ask-a, .ask-parts li')].map(e => e.textContent).join(' | '));
    check('Ask Shelly offline: ' + q, want.test(a), a.slice(0, 70));
  }
  await p.click('[data-ask="close"]'); await p.context().setOffline(false);
  await p.click('[data-act="open-library"]'); await p.waitForTimeout(800);
  check('the Library opens', await p.evaluate(() => /Tutor/.test(document.body.innerText)));
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.clib-tab')].map(t => t.dataset.tab).join(','));
  check('child: the Library has a tab for each goal (math, reading)', tabs === 'math,reading', tabs);
  check('child: the Library shows one Next up activity', await p.evaluate(() => document.querySelectorAll('.clib-next .clib-go').length === 1));
  await p.click('[data-act="facts"]'); await p.waitForTimeout(800); await p.click('.clib .clib-back'); await p.waitForTimeout(800);
  check('child: an activity done counts toward today', /^1 of 4 done today/.test(await p.textContent('.clib-daybar-t')));
  await p.click('[data-view="settings"]'); await p.waitForTimeout(800);
  check('child: Library settings ask the maths question', await p.evaluate(() => !!document.getElementById('clibPin')));
  await closeLibrary(p);
  await p.waitForFunction(() => { const v = window.__reef3dView(); if(v && v.dice) window.__reef3dGo(v.at); return v && !v.moving && !v.flyIn && !v.dice; }, null, { timeout:60000 });
  const deck = await p.evaluate(nearestDeck); await p.waitForFunction(() => !document.querySelector('.r3 canvas'), null, { timeout:60000 });
  check('child: a deck opens from the board', await p.evaluate(() => !document.querySelector('.r3 canvas')), deck);
  await p.waitForSelector('[data-act^="exit-"], [data-act="back-home"], [aria-label^="Close"]');
  const exit = await p.$('[data-act^="exit-"], [data-act="back-home"], [aria-label^="Close"]');
  if (exit) { await exit.click(); await p.waitForTimeout(1200); }
  const sub = await p.evaluate(() => (document.body.innerText.match(/(\d+)\s*[−-]\s*(\d+)/) || []).slice(1));
  check('child: leaving early asks a subtraction question', sub.length === 2);
  if (sub.length === 2) {
    for (const d of String(+sub[0] - +sub[1])) await p.locator('button', { hasText: new RegExp('^' + d + '$') }).first().click();
    await p.locator('button', { hasText: /^(OK|Check|Done)$/ }).first().click().catch(() => {}); await p.waitForTimeout(4000);
    check('child: the right answer returns to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  }
  await menuPick(p, 'Edit decks'); await p.waitForTimeout(800);
  check('child: Edit Mode asks the maths question', !!(await p.$('.reef-gate')));
  await p.click('[data-gate="cancel"]').catch(() => {}); await p.waitForTimeout(800);
  check('child: no page errors', !p.errors.length, p.errors.join(' / '));
  await p.context().close();

  // Grown-up profile: the maths question (wrong, cancel, right), the board, a deck
  p = await newPage(browser);
  await enter(p, null, { port }); await p.click('[data-profile="wendy"]'); await p.waitForTimeout(1200);
  const q1 = await p.textContent('.reef-gate-q').catch(() => null);
  check('grown-up profile asks the maths question', !!q1);
  for (const d of '888') await p.click('[data-gate-digit="' + d + '"]');
  check('a three-digit answer fits in the answer box', await p.evaluate(() => { const i = document.getElementById('adultGateInput'); return i.value === '888' && i.scrollWidth <= i.clientWidth; }));
  for (let k = 0; k < 3; k++) await p.click('[data-gate="back"]');
  await p.click('[data-gate-digit="1"]'); await p.click('[data-gate="check"]'); await p.waitForTimeout(500);
  check('a wrong answer gives a new question', (await p.textContent('.reef-gate-q')) !== q1);
  await p.click('[data-gate="cancel"]'); await p.waitForTimeout(1500);
  check('Cancel goes back to the profiles', !!(await p.$('[data-profile="wendy"]')));
  await p.click('[data-profile="wendy"]'); await p.waitForTimeout(1200); await solveGate(p); await p.waitForTimeout(8000);
  check('the right answer opens the board', await p.evaluate(() => !!(window.__reef3dView && window.__reef3dView())));
  await p.waitForFunction(() => { const v = window.__reef3dView(); if(v && v.dice) window.__reef3dGo(v.at); return v && !v.moving && !v.flyIn && !v.dice; }, null, { timeout:60000 });
  const d2 = await p.evaluate(nearestDeck); await p.waitForFunction(() => !document.querySelector('.r3 canvas'), null, { timeout:60000 });
  check('grown-up: a deck opens from the board', await p.evaluate(() => !document.querySelector('.r3 canvas')), d2);
  // Inside a grown-up profile nothing asks again: the question was answered on the way in
  await p.waitForSelector('[data-act^="exit-"], [data-act="back-home"], [aria-label^="Close"]');
  const exit2 = p.locator('[data-act^="exit-"], [data-act="back-home"], [aria-label^="Close"]').first();
  if (exit2) { await exit2.click(); await p.waitForSelector('.r3 canvas', { timeout:90000 }); }
  check('grown-up: leaving a deck early asks nothing', !!exit2 && !(await p.$('.reef-gate, .lock-screen')) && await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // My words: a Korean card answered wrong puts its word on her list, and the list's tile on the board
  check('grown-up: My words is not on the board before anything is missed', await p.evaluate(() => !document.querySelector('.r3-label.mywords') && !window.__myWordsDue().length));
  await p.evaluate(() => { const d = window.CoralCove.decks().find(x => /speed quiz/i.test(x.name)); if (d) window.CoralCove.startDeck(d.id); });
  await p.waitForSelector('.choice-btn:not([disabled])');
  const missed = await p.evaluate(() => { const a = window.__studyAnswer(), b = [...document.querySelectorAll('.choice-btn:not([disabled])')].find(x => x.textContent.trim() !== a); if (b) b.click(); return b ? a : null; });
  await p.waitForTimeout(3500);
  const exit3 = p.locator('[data-act="exit-study"]'); await exit3.click(); await p.waitForSelector('.r3 canvas');
  const mw = await p.evaluate(() => ({ tile: !!document.querySelector('.r3-label.mywords'), due: window.__myWordsDue() }));
  check('grown-up: a missed Korean card goes in My words, and its tile appears on the board', !!missed && mw.tile && mw.due.some(e => e.from === 'missed' && e.ko && e.en),
    (missed || 'no card to miss') + ' → ' + mw.due.map(e => e.ko + ' = ' + e.en).join(', '));
  check('grown-up: What\'s new: every step points at something on the board', !(await p.evaluate(() => window.__whatsNewMissing())).length, (await p.evaluate(() => window.__whatsNewMissing())).join(', '));
  // Story Lagoon: open from the sea chart, a story opens, and a tapped word shows its meaning
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="lagoon"]'); await p.waitForTimeout(400);
  const lgBtn = await p.$('[data-sea-go="lagoon"]');
  check('grown-up: the sea chart has an Open Story Lagoon button', !!lgBtn && /Open Story Lagoon/.test(await lgBtn.textContent()));
  if (lgBtn) { await lgBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: Story Lagoon lists its twelve stories', await p.evaluate(() => document.querySelectorAll('.lg-story').length === 12));
  await p.click('.lg-story'); await p.waitForTimeout(800);
  check('grown-up: a story opens, ready to listen', await p.evaluate(() => document.querySelectorAll('.lg-line').length >= 4 && !!document.querySelector('[data-lg-play]')));
  await p.click('[data-lg-next]'); await p.waitForTimeout(500);
  await p.click('.lg-w'); await p.waitForTimeout(600);
  const lgWord = await p.evaluate(() => { const w = document.querySelector('.lg-word'); return w ? w.innerText.replace(/\s+/g, ' ').trim() : ''; });
  check('grown-up: a tapped word shows its meaning', /[가-힣]/.test(lgWord) && /[a-z]{3}/i.test(lgWord), lgWord);
  await p.click('[data-act="lg-back"]'); await p.waitForTimeout(500);
  await p.click('[data-act="lg-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Story Lagoon goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // Harbor Town: open from the sea chart, start the cafe talk, pick an answer and see the next line, then type
  // the next answer in rough English letters and see it accepted
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="town"]'); await p.waitForTimeout(400);
  const twBtn = await p.$('[data-sea-go="town"]');
  check('grown-up: the sea chart has an Open Harbor Town button', !!twBtn && /Open Harbor Town/.test(await twBtn.textContent()));
  if (twBtn) { await twBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: Harbor Town lists its eight townsfolk', await p.evaluate(() => document.querySelectorAll('.tw-folk').length === 8));
  await p.click('[data-tw-open="cafe"]'); await p.waitForTimeout(800);
  check('grown-up: a conversation starts with the townsperson\'s line and answers to pick', await p.evaluate(() =>
    document.querySelectorAll('.tw-log .lg-line:not(.lg-me)').length === 1 && document.querySelectorAll('.tw-opt').length >= 2 && !!document.querySelector('#twType')));
  await p.click('.tw-opt');
  const twNext = await p.waitForFunction(() => document.querySelectorAll('.tw-log .lg-line:not(.lg-me):not(.tw-dots)').length === 2 && document.querySelector('.tw-opt'), null, { timeout: 15000 }).then(() => true, () => false);
  check('grown-up: picking an answer brings the next line', twNext, await p.evaluate(() => document.querySelector('.tw-log').innerText.replace(/\s+/g, ' ').slice(0, 200)));
  await p.fill('#twType', 'yogiso masilgeyo'); await p.click('.tw-type button[type="submit"]');
  const twTyped = await p.waitForFunction(() => document.querySelectorAll('.tw-log .lg-me').length === 2 && document.querySelectorAll('.tw-log .lg-line:not(.lg-me):not(.tw-dots)').length === 3, null, { timeout: 15000 }).then(() => true, () => false);
  check('grown-up: a typed answer in rough English letters is accepted', twTyped, await p.evaluate(() => [...document.querySelectorAll('.tw-log .lg-me')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | ')));
  await p.click('[data-act="tw-back"]'); await p.waitForTimeout(500);
  await p.click('[data-act="tw-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Harbor Town goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // Echo Caves: open from the sea chart, answer a sound pair, check a sound rule, and open shadowing, where headless
  // Chromium has no microphone: the line still plays and can be rated, said along with the voice
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="caves"]'); await p.waitForTimeout(400);
  const cvBtn = await p.$('[data-sea-go="caves"]');
  check('grown-up: the sea chart has an Open Echo Caves button', !!cvBtn && /Open Echo Caves/.test(await cvBtn.textContent()));
  if (cvBtn) { await cvBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: Echo Caves shows its three parts', await p.evaluate(() => document.querySelectorAll('.cv-sec').length === 3));
  await p.click('[data-cv-go="pairs"]'); await p.waitForTimeout(600);
  check('grown-up: a sound pair offers two or three look-alike words', await p.evaluate(() => { const n = document.querySelectorAll('.cv-opt').length; return n >= 2 && n <= 3; }));
  await p.click('.cv-opt'); await p.waitForTimeout(500);
  check('grown-up: answering a sound pair shows the answer, its tip and the next button, and is remembered', await p.evaluate(() =>
    !!document.querySelector('.lg-fb') && !!document.querySelector('.cv-tip') && !!document.querySelector('[data-cv-next]') &&
    Object.keys((JSON.parse(localStorage.getItem('cc-caves-wendy') || '{}').c) || {}).length === 1));
  await p.click('[data-cv-next]'); await p.waitForTimeout(400);
  check('grown-up: the next sound pair comes up', await p.evaluate(() => /Sound 2 of 8/.test(document.querySelector('.lg-title').textContent)));
  await p.click('[data-act="cv-back"]'); await p.waitForTimeout(400);
  await p.click('[data-cv-go="rules"]'); await p.waitForTimeout(400);
  check('grown-up: Sound rules lists seven rules', await p.evaluate(() => document.querySelectorAll('.cv-rule').length === 7));
  await p.click('.cv-rule'); await p.waitForTimeout(500);
  check('grown-up: a sound-rule card shows the spelling, how it is said and a check', await p.evaluate(() =>
    /한국어/.test(document.querySelector('.cv-big').textContent) && /\[한구거\]/.test(document.querySelector('.cv-big').textContent) && document.querySelectorAll('[data-cv-ropt]').length === 3));
  await p.evaluate(() => [...document.querySelectorAll('[data-cv-ropt]')].find(b => b.textContent.trim() === '음악').click()); await p.waitForTimeout(400);
  check('grown-up: picking the right spelling says so', await p.evaluate(() => !!document.querySelector('.lg-fb.ok')));
  await p.click('[data-act="cv-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="cv-back"]'); await p.waitForTimeout(300);
  await p.click('[data-cv-go="shadow"]');
  const cvLines = await p.waitForFunction(() => document.querySelectorAll('.cv-line').length > 0, null, { timeout: 10000 }).then(() => true, () => false);
  check('grown-up: Shadowing lists lines from her cards, shortest first', cvLines && await p.evaluate(() => {
    const t = [...document.querySelectorAll('.cv-line b')].map(b => b.textContent.length); return t.every((n, i) => !i || n >= t[i - 1]); }));
  await p.click('.cv-line'); await p.waitForTimeout(800);
  const ask = await p.$('[data-cv-mic="yes"]');
  if (ask) await ask.click();
  const noMic = await p.waitForFunction(() => !!document.querySelector('.cv-nomic') || !!document.querySelector('[data-cv-stop]'), null, { timeout: 10000 }).then(() => true, () => false);
  if (await p.$('[data-cv-stop]')) { await p.click('[data-cv-stop]'); await p.waitForTimeout(1500); }
  check('grown-up: shadowing without a microphone says so and still lets her say it along with the voice', noMic && await p.evaluate(() =>
    !!document.querySelector('[data-cv-voice]') && !!document.querySelector('[data-cv-rate="good"]')), await p.evaluate(() => (document.querySelector('.cv-hint') || {}).textContent));
  const first = await p.evaluate(() => document.querySelector('.cv-say h2').textContent);
  await p.click('[data-cv-rate="good"]'); await p.waitForTimeout(600);
  check('grown-up: "Sounded right" moves on to the next line', await p.evaluate(f => { const h = document.querySelector('.cv-say h2'); return !h || h.textContent !== f; }, first));
  await p.click('[data-act="cv-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="cv-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="cv-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Echo Caves goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // Pattern Reef: open from the sea chart, open the first pattern (its explanation and examples), answer the first
  // practice item right, then miss the next one and see the slip counted for repair
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="reef"]'); await p.waitForTimeout(400);
  const prBtn = await p.$('[data-sea-go="reef"]');
  check('grown-up: the sea chart has an Open Pattern Reef button', !!prBtn && /Open Pattern Reef/.test(await prBtn.textContent()));
  if (prBtn) { await prBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: Pattern Reef lists its twelve patterns, the first suggested', await p.evaluate(() =>
    document.querySelectorAll('.pr-pat').length === 12 && !!document.querySelector('.pr-pat.best[data-pr-open="topic"]')));
  await p.click('[data-pr-open="topic"]'); await p.waitForTimeout(500);
  check('grown-up: a pattern shows how it works and its examples', await p.evaluate(() =>
    document.querySelectorAll('.pr-rule p').length >= 2 && document.querySelectorAll('.pr-ex li').length >= 3 && !!document.querySelector('[data-pr-start]')));
  await p.click('[data-pr-start]'); await p.waitForTimeout(400);
  const pa = await p.evaluate(() => window.__patAnswer());
  if (pa && pa.pick != null) await p.click('[data-pr-pick="' + pa.pick + '"]');
  await p.waitForTimeout(500);
  check('grown-up: answering a practice item right says so, with why', await p.evaluate(() => !!document.querySelector('.lg-fb.ok') && !!document.querySelector('.pr-why') && !!document.querySelector('[data-pr-next]')), JSON.stringify(pa));
  await p.click('[data-pr-next]'); await p.waitForTimeout(400);
  const pb = await p.evaluate(() => window.__patAnswer());
  check('grown-up: the next item is a word-tile build', !!pb && pb.k === 'build' && await p.evaluate(() => document.querySelectorAll('.build-bank .build-tile').length >= 3));
  // build it wrong twice: each time a wrong tile first
  for (let k = 0; k < 12 && !(await p.$('.lg-fb')); k++) {
    const right = (await p.evaluate(() => window.__patAnswer()) || {}).tile;
    const placed = await p.evaluate(() => document.querySelectorAll('.build-line .build-tile').length);
    const pick = await p.evaluate(([r, first]) => { const t = [...document.querySelectorAll('.build-bank .build-tile')]; const b = first ? t.find(x => x.dataset.prTile !== r) : t[0]; return b && b.dataset.prTile; }, [right, placed === 0]);
    if (!pick) break;
    await p.click('[data-pr-tile="' + pick + '"]'); await p.waitForTimeout(150);
  }
  await p.waitForTimeout(400);
  check('grown-up: a missed build shows the sentence and counts a slip to repair', await p.evaluate(() =>
    !!document.querySelector('.lg-fb.no') && (JSON.parse(localStorage.getItem('cc-patterns-wendy') || '{}').s || {}).topic.open >= 1));
  await p.click('[data-act="pr-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="pr-back"]'); await p.waitForTimeout(300);
  check('grown-up: the slip shows under Patterns to repair', await p.evaluate(() => !!document.querySelector('.pr-repair [data-pr-open="topic"]')));
  await p.click('[data-act="pr-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Pattern Reef goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // Bottle Beach: open from the sea chart, open a bottle, write a reply with a particle slip (사과을), check it and
  // see what's right and exactly one fix, then send it and read 지수's answer, kept in the journal
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="beach"]'); await p.waitForTimeout(400);
  const bbBtn = await p.$('[data-sea-go="beach"]');
  check('grown-up: the sea chart has an Open Bottle Beach button', !!bbBtn && /Open Bottle Beach/.test(await bbBtn.textContent()));
  if (bbBtn) { await bbBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: Bottle Beach lists twelve bottles and the handwriting link', await p.evaluate(() =>
    document.querySelectorAll('.bb-bottle').length === 12 && !!document.querySelector('[data-bb-hand]')));
  await p.click('[data-bb-open="food"]'); await p.waitForTimeout(500);
  await p.click('[data-bb-tile="저는"]'); await p.waitForTimeout(200);
  const bbTyped = await p.evaluate(() => document.querySelector('#bbText').value);
  check('grown-up: a starter tile goes into the reply', bbTyped === '저는', bbTyped);
  await p.fill('#bbText', '저는 사과을 좋아해요.');
  await p.click('[data-bb-check]'); await p.waitForTimeout(500);
  check('grown-up: checking a reply says what is right first, then one fix with its pattern', await p.evaluate(() =>
    document.querySelectorAll('.bb-good li').length >= 2 && document.querySelectorAll('.bb-fix li').length === 1 &&
    /사과를/.test(document.querySelector('.bb-fix').textContent) && !!document.querySelector('[data-bb-pat="object"]')));
  await p.click('[data-bb-send]'); await p.waitForTimeout(800);
  check('grown-up: sending the bottle brings 지수\'s answer and keeps the letter', await p.evaluate(() =>
    !!document.querySelector('.bb-reply .lg-ko') && (JSON.parse(localStorage.getItem('cc-bottles-wendy') || '{}').l || []).length === 1));
  await p.click('[data-bb-letters]'); await p.waitForTimeout(300);
  check('grown-up: the letter is in the journal', await p.evaluate(() => document.querySelectorAll('.bb-journal > li').length === 1));
  await p.click('[data-act="bb-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="bb-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Bottle Beach goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // The Lighthouse: open from the sea chart, open a sign, tap a word for its meaning, answer a question right
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="light"]'); await p.waitForTimeout(400);
  const lhBtn = await p.$('[data-sea-go="light"]');
  check('grown-up: the sea chart has an Open the Lighthouse button', !!lhBtn && /Open the Lighthouse/.test(await lhBtn.textContent()));
  if (lhBtn) { await lhBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  check('grown-up: the Lighthouse lists ten signs and eight manners notes', await p.evaluate(() =>
    document.querySelectorAll('[data-lh-sign]').length === 10 && document.querySelectorAll('[data-lh-manner]').length === 8));
  await p.click('[data-lh-sign="cafe"]'); await p.waitForTimeout(400);
  await p.click('[data-lh-w="2:0"]'); await p.waitForTimeout(400);
  check('grown-up: tapping a word on a sign shows its meaning', await p.evaluate(() => /americano/.test((document.querySelector('.lg-word') || {}).textContent || '')));
  await p.click(await p.evaluate(() => window.__lhRight(0))); await p.waitForTimeout(400);
  check('grown-up: answering a sign question right says so', await p.evaluate(() => !!document.querySelector('.lg-fb.ok')));
  await p.click('[data-act="lh-back"]'); await p.waitForTimeout(300);
  await p.click('[data-lh-manner="server"]'); await p.waitForTimeout(300);
  check('grown-up: a manners note has its phrases and a tip', await p.evaluate(() => document.querySelectorAll('[data-lh-say]').length >= 2 && !!document.querySelector('.lh-tip')));
  await p.click('[data-act="lh-back"]'); await p.waitForTimeout(300);
  await p.click('[data-act="lh-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving the Lighthouse goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  // Captain's Deck: open from the sea chart, see today's legs, open a leg into its region and come back to the deck,
  // then open What you can do
  await p.click('[data-r3-map]'); await p.waitForTimeout(1200);
  await p.click('.r3-map-tab[data-sea-tab="sea"]'); await p.waitForTimeout(400);
  await p.click('.r3-sea-isle[data-sea="deck"]'); await p.waitForTimeout(400);
  const cdBtn = await p.$('[data-sea-go="deck"]');
  check('grown-up: the sea chart has an Open Captain\'s Deck button', !!cdBtn && /Open Captain's Deck/.test(await cdBtn.textContent()));
  if (cdBtn) { await cdBtn.click(); await p.waitForTimeout(2500); }
  await regionList(p);
  await p.waitForFunction(() => document.querySelectorAll('.cd-leg').length > 0, null, { timeout: 10000 }).catch(() => {});
  const legs = await p.evaluate(() => [...document.querySelectorAll('.cd-leg b')].map(b => b.textContent));
  check('grown-up: Captain\'s Deck shows today\'s three or four legs, kept for the day', legs.length >= 3 && legs.length <= 4 &&
    await p.evaluate(n => (JSON.parse(localStorage.getItem('cc-deck-wendy') || '{}').legs || []).length === n, legs.length), legs.join(' | '));
  const storyLeg = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('cc-deck-wendy')).legs; return l.findIndex(x => x.kind === 'story'); });
  await p.click('[data-cd-leg="' + Math.max(0, storyLeg) + '"]'); await p.waitForTimeout(2500);
  check('grown-up: a leg opens its region at its item (the story itself)', await p.evaluate(() =>
    !document.querySelector('.cd-leg') && document.querySelectorAll('.lg-line').length >= 4 && !!document.querySelector('[data-lg-play]')));
  if (await p.$('[data-act="lg-back"]')) { await p.click('[data-act="lg-back"]'); await p.waitForTimeout(400); }
  if (await p.$('[data-act="lg-home"]')) { await p.click('[data-act="lg-home"]'); await p.waitForTimeout(2500); }
  if (await p.locator('[data-rb-home]').count()) { await p.click('[data-rb-home]'); await p.waitForSelector('.cd-leg'); }
  check('grown-up: leaving the region comes back to Captain\'s Deck', await p.evaluate(() => document.querySelectorAll('.cd-leg').length > 0));
  await p.click('[data-cd-tab="can"]'); await p.waitForTimeout(500);
  check('grown-up: What you can do shows five skill meters and trip readiness for ten situations', await p.evaluate(() =>
    document.querySelectorAll('.cd-skills li').length === 5 && document.querySelectorAll('.cd-sits li').length === 10));
  await p.click('[data-act="cd-home"]'); await p.waitForTimeout(6000);
  check('grown-up: leaving Captain\'s Deck goes back to the board', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
  await menuPick(p, 'Edit decks'); await p.waitForTimeout(1200);
  await p.click('[data-act="open-library"]', { force: true }); await p.waitForTimeout(800);
  check('grown-up: the Library opens on the Korean goal', await p.evaluate(() => [...document.querySelectorAll('.clib-tab')].map(t => t.dataset.tab).join(',') === 'korean'));
  await p.click('[data-view="settings"]'); await p.waitForTimeout(800);
  check('grown-up: Library settings ask nothing', await p.evaluate(() => !document.getElementById('clibPin') && !!document.getElementById('clibUrl')));
  await p.click('[data-goal="reading"]'); await p.waitForTimeout(600); await p.click('.clib .clib-back'); await p.waitForTimeout(800);
  check('grown-up: a goal added in settings gets its own tab', await p.evaluate(() => [...document.querySelectorAll('.clib-tab')].map(t => t.dataset.tab).join(',') === 'korean,reading'));
  await closeLibrary(p);
  check('grown-up: Edit Mode asks nothing', !(await p.$('.reef-gate, .lock-screen')) && /Edit Mode/.test(await p.evaluate(() => document.body.innerText)));
  check('grown-up: no page errors', !p.errors.length, p.errors.join(' / '));
  await p.context().close();

  await browser.close();
  console.log(failed ? failed + ' check(s) failed' : 'smoke: all checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
