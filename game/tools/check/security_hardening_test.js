// Comprehensive security hardening & Jamo diagnostic checks.
// Run from repo root: node game/tools/check/security_hardening_test.js
// Or from game/:      node tools/check/security_hardening_test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const GAME_DIR = path.resolve(__dirname, '..', '..');
const readGame = rel => fs.readFileSync(path.join(GAME_DIR, rel), 'utf8');

function makeStorage(seedObj = {}) {
  const store = new Map(Object.entries(seedObj));
  return {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i] ?? null; },
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); }
  };
}

// 0. Syntax checks on owned JS modules & in-memory assembled IIFE
for (const rel of ['src/js/security.js', 'src/js/ask.js', 'storage.js', 'library.js', 'sw.js']) {
  new vm.Script(readGame(rel), { filename: rel });
}
{
  const assembled = readGame('src/page.html').replace(/<!-- include: (js\/\S+) -->/g, (_, p) => readGame('src/' + p));
  const m = assembled.match(/<script>\s*(\(function\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script>/);
  assert(m, 'assembled IIFE script block found');
  new vm.Script(m[1], { filename: 'assembled-iife.js' });
}

// Load security.js in isolated vm with localStorage & strict document guard
const secCode = readGame('src/js/security.js');
const secStorage = makeStorage();
const secCtx = {
  COVE_BACKUP_KIND: 'coral-classroom-backup',
  window: { location: { origin: 'http://localhost:8820' }, crypto: webcrypto },
  localStorage: secStorage,
  document: {
    createElement() { throw new Error('DOM createElement must not be called by security.js'); }
  },
  TextEncoder, Promise, URL, Date
};
vm.createContext(secCtx);
vm.runInContext(secCode, secCtx);

// 1. safePhotoUrl (raster-only)
assert.strictEqual(secCtx.safePhotoUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
assert.strictEqual(secCtx.safePhotoUrl('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
assert.strictEqual(secCtx.safePhotoUrl('data:image/webp;base64,AAAA'), 'data:image/webp;base64,AAAA');
assert.strictEqual(secCtx.safePhotoUrl('data:image/gif;base64,AAAA'), 'data:image/gif;base64,AAAA');
assert.strictEqual(secCtx.safePhotoUrl('vocab-pics/apple.webp'), 'vocab-pics/apple.webp');
assert.strictEqual(secCtx.safePhotoUrl('friend-pics/crab.png'), 'friend-pics/crab.png');
assert.strictEqual(secCtx.safePhotoUrl('assets/world/shell.jpg'), 'assets/world/shell.jpg');
assert.strictEqual(secCtx.safePhotoUrl('blob:http://localhost:8820/1234-5678'), 'blob:http://localhost:8820/1234-5678');
assert.strictEqual(secCtx.safePhotoUrl('javascript:alert(1)'), '');
assert.strictEqual(secCtx.safePhotoUrl('data:image/svg+xml;base64,PHN2Zz4='), '');
assert.strictEqual(secCtx.safePhotoUrl('data:text/html;base64,PGI+'), '');
assert.strictEqual(secCtx.safePhotoUrl('data:image/png;base64,'), '');
assert.strictEqual(secCtx.safePhotoUrl('data:image/png;base64,' + 'A'.repeat(2.6 * 1024 * 1024)), '');
assert.strictEqual(secCtx.safePhotoUrl('https://evil.example/a.png'), '');
assert.strictEqual(secCtx.safePhotoUrl('vocab-pics/../secret.png'), '');
assert.strictEqual(secCtx.safePhotoUrl('vocab-pics//secret.png'), '');
assert.strictEqual(secCtx.safePhotoUrl('vocab-pics/icon.svg'), '');
assert.strictEqual(secCtx.safePhotoUrl('blob:https://evil.example/1234-5678'), '');

// 1b. safeProxyUrl
assert.strictEqual(secCtx.safeProxyUrl('https://helper.example.com/api'), 'https://helper.example.com/api');
assert.strictEqual(secCtx.safeProxyUrl('http://localhost:8787'), 'http://localhost:8787/');
assert.strictEqual(secCtx.safeProxyUrl('http://127.0.0.1:8787/ask'), 'http://127.0.0.1:8787/ask');
assert.strictEqual(secCtx.safeProxyUrl('http://helper.example.com/api'), '');
assert.strictEqual(secCtx.safeProxyUrl('https://user:pass@helper.example.com/api'), '');
assert.strictEqual(secCtx.safeProxyUrl('javascript:alert(1)'), '');

// 2. safePlainText XSS gadgets (must never touch DOM/innerHTML)
assert.strictEqual(secCtx.safePlainText('<img src=x onerror=alert(1)>Hello'), 'Hello');
assert.strictEqual(secCtx.safePlainText('<svg/onload=alert(1)>안녕</svg>'), '안녕');
assert.strictEqual(secCtx.safePlainText('<script>alert(1)</script>World'), 'World');
assert.strictEqual(secCtx.safePlainText('<scr<img src=x>ipt>alert(1)</script>Safe'), 'alert(1) Safe');
const nestedScriptOut = secCtx.safePlainText('<scr<script>ipt>alert(1)</script>Safe');
assert.doesNotMatch(nestedScriptOut, /<script|<\/script|onerror|onload/i);
assert.match(nestedScriptOut, /Safe$/);
assert.strictEqual(secCtx.safePlainText('<style>body{display:none}</style>Text'), 'Text');
assert.strictEqual(secCtx.safePlainText('<!-- hidden -->Visible'), 'Visible');
assert.strictEqual(secCtx.safePlainText('<div title="a>b" onclick=alert(1)>Hi &amp; bye &lt;3</div>'), 'Hi & bye <3');
assert.strictEqual(secCtx.safePlainText('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
assert.strictEqual(secCtx.safePlainText('<img src=x onerror="alert(1)"'), '');
assert.doesNotMatch(readGame('src/js/ask.js'), /innerHTML\s*=\s*String/);
assert.match(readGame('src/js/ask.js'), /function askPlain\(s\)\{\s*return safePlainText\(s\);\s*\}/);
assert.doesNotMatch(readGame('library.js'), /document\.createElement\(['"]div['"]\)[\s\S]{0,60}innerHTML/);

// 3. Prototype pollution prevention in security.js
const poisoned = secCtx.safeJsonParse('{"ok":1,"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":1}}', null);
assert.strictEqual(poisoned.ok, 1);
assert.strictEqual(({}).polluted, undefined);
assert.strictEqual(Object.prototype.hasOwnProperty.call(poisoned, '__proto__'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(poisoned, 'constructor'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(poisoned, 'prototype'), false);

// 4. storage.js hardening (Object.create(null), path segment rejection, write bounds, photoUrl)
const storageCode = readGame('storage.js');
const storageLs = makeStorage({
  'coralClassroom.geminiHandoff.demo.v1': JSON.stringify({
    __coralCoveMeta: { seedVersion: 'vtest' },
    '__proto__': { pollutedStorage: true },
    'profiles/p1': { name: 'Tester', photoUrl: 'javascript:alert(1)' }
  })
});
const storageWin = {
  CORAL_COVE_SEED: { 'profiles/p1': { name: 'Tester', mode: 'child', order: 0 } },
  CORAL_COVE_SEED_VERSION: 'vtest',
  location: { origin: 'http://localhost:8820' },
  addEventListener() {}
};
storageWin.window = storageWin;
const storageCtx = {
  window: storageWin,
  localStorage: storageLs,
  document: { body: {}, addEventListener() {}, getElementById: () => null },
  navigator: {},
  setTimeout, clearTimeout, URL, console
};
vm.createContext(storageCtx);
vm.runInContext(storageCode, storageCtx);
assert.strictEqual(({}).pollutedStorage, undefined);

(async () => {
  const db = await storageWin.claude.use('db');
  const p1Snap = await db.doc('profiles/p1').get();
  assert.strictEqual(p1Snap.exists, true);
  assert.strictEqual(p1Snap.data().photoUrl, '', 'storage.js strips unsafe photoUrl from saved data');

  // Prototype property names on docs (Object.create(null)) do not exist as documents
  const toStrSnap = await db.collection('profiles').doc('toString').get();
  assert.strictEqual(toStrSnap.exists, false);

  // Reject __proto__ / constructor / prototype / .. path segments
  for (const badPath of ['profiles/__proto__', 'profiles/constructor', 'profiles/prototype', 'profiles/../x', '__proto__/a']) {
    assert.throws(() => db.doc(badPath), /Invalid storage path/);
  }
  assert.throws(() => db.collection('profiles').doc('__proto__'), /Invalid storage path/);
  assert.throws(() => db.doc('profiles/p1').collection('constructor'), /Invalid storage path/);

  // Reject non-object or oversized writes (>3MB doc or >5MB total)
  await assert.rejects(db.doc('profiles/p1/decks/d1').set(['not-an-object']), /Invalid document data/);
  await assert.rejects(db.doc('profiles/p1/decks/d1').set({ big: 'x'.repeat(3.1 * 1024 * 1024) }), /size limit/);
  await db.doc('profiles/p1/decks/d2').set({ blob: 'a'.repeat(2.4 * 1024 * 1024) });
  await db.doc('profiles/p1/decks/d3').set({ blob: 'b'.repeat(2.4 * 1024 * 1024) });
  await assert.rejects(db.doc('profiles/p1/decks/d4').set({ blob: 'c'.repeat(0.5 * 1024 * 1024) }), /size limit/);

  // Unsafe photoUrl rejected on set/update
  await db.doc('profiles/p1/decks/d1/cards/c1').set({ front: '안녕', photoUrl: 'javascript:alert(1)' });
  const c1 = await db.doc('profiles/p1/decks/d1/cards/c1').get();
  assert.strictEqual(c1.data().photoUrl, '');

  // 5. validateBackupPayload + lockout-key exclusion + coral-lib* + malformed JSON + depth bounds
  assert.strictEqual(secCtx.isAllowedStorageKey('cc-gate-lock'), false, 'cc-gate-lock excluded from backup keys');
  assert.strictEqual(secCtx.isAllowedStorageKey('coral-lib-settings'), true);
  assert.strictEqual(secCtx.isAllowedStorageKey('coral-lib:wendy'), true);

  assert.strictEqual(secCtx.validateBackupPayload(JSON.stringify({
    kind: 'coral-classroom-backup',
    items: { 'arbitraryKey': 'evil' }
  })).ok, false);

  assert.strictEqual(secCtx.validateBackupPayload(JSON.stringify({
    kind: 'coral-classroom-backup',
    items: { 'cc-gate-lock': '{"fails":0,"until":0}' }
  })).ok, false, 'backup containing cc-gate-lock must be rejected');

  assert.strictEqual(secCtx.validateBackupPayload(JSON.stringify({
    kind: 'coral-classroom-backup',
    items: { 'coralClassroom.geminiHandoff.demo.v1': '{malformed json' }
  })).ok, false, 'malformed JSON starting with { must be rejected');

  assert.strictEqual(secCtx.validateBackupPayload(JSON.stringify({
    kind: 'coral-classroom-backup',
    items: { 'coralClassroom.geminiHandoff.demo.v1': '[1, 2, bad' }
  })).ok, false, 'malformed JSON starting with [ must be rejected');

  let deep = { leaf: 1 };
  for (let i = 0; i < 20; i++) deep = { nested: deep };
  assert.strictEqual(secCtx.validateBackupPayload(JSON.stringify({
    kind: 'coral-classroom-backup',
    items: { 'coralClassroom.geminiHandoff.demo.v1': JSON.stringify(deep) }
  })).ok, false, 'excessive nesting (>16) must be rejected');

  const poisonedBackup = JSON.stringify({
    kind: 'coral-classroom-backup',
    items: {
      'coralClassroom.geminiHandoff.demo.v1': JSON.stringify({
        card: { photoUrl: 'javascript:alert(1)', front: '안녕' },
        __proto__: { hacked: true }
      }),
      'coral-lib-settings': JSON.stringify({ proxyUrl: 'http://evil.example/steal', voice: true }),
      'coral-lib:wendy': JSON.stringify({ day: { date: '2026-11-24', done: {} } })
    }
  });
  const vRes = secCtx.validateBackupPayload(poisonedBackup);
  assert.strictEqual(vRes.ok, true);
  assert.strictEqual(JSON.parse(vRes.items['coralClassroom.geminiHandoff.demo.v1']).card.photoUrl, '');
  assert.strictEqual(JSON.parse(vRes.items['coral-lib-settings']).proxyUrl, '');
  assert.strictEqual(({}).hacked, undefined);

  // 6. Anki import bounds (screens.js)
  const screensSrc = readGame('src/js/screens.js');
  const ankiStart = screensSrc.indexOf('  function stripAnkiHtml(s){');
  const ankiEnd = screensSrc.indexOf('  function handleAnkiImportFile(file){', ankiStart);
  assert(ankiStart >= 0 && ankiEnd > ankiStart, 'Anki parser markers found');
  assert.match(screensSrc, /file\s*&&\s*file\.size\s*>\s*COVE_MAX_ANKI_BYTES/);
  const ankiCtx = Object.assign({}, secCtx, {
    document: { createElement: () => ({ set innerHTML(v) { this.value = String(v); }, value: '' }) }
  });
  vm.createContext(ankiCtx);
  vm.runInContext(secCode + '\n' + screensSrc.slice(ankiStart, ankiEnd), ankiCtx);
  const bigTsv = Array.from({ length: 5200 }, (_, i) => `<b>Front\x07 ${i}</b>[sound:a.mp3]\t${'B'.repeat(700)}`).join('\n');
  const parsedAnki = ankiCtx.parseAnkiPlainText(bigTsv);
  assert.strictEqual(parsedAnki.length, 5000, 'Anki import caps at COVE_MAX_ANKI_CARDS (5000)');
  assert.strictEqual(parsedAnki[0].front, 'Front 0');
  assert.strictEqual(parsedAnki[0].back.length, 600, 'Anki back truncated to 600 chars');

  // 7. cc-gate-lock exponential backoff & password non-echoing
  secCtx.CoralCoveGate = secCtx.window.CoralCoveGate;
  secCtx.CoralCoveGate.resetLock();
  const baseNow = 1700000000000;
  const expectedSecs = [0, 0, 0, 0, 15, 30, 60, 120, 240, 300, 300];
  for (let i = 0; i < expectedSecs.length; i++) {
    const r = secCtx.CoralCoveGate.recordFailure(baseNow);
    assert.strictEqual(r.fails, i + 1);
    assert.strictEqual(r.secs, expectedSecs[i], `failure ${i + 1} backoff`);
  }
  const lockState = secCtx.CoralCoveGate.checkLock(baseNow + 5000);
  assert.strictEqual(lockState.locked, true);
  assert.strictEqual(lockState.waitSecs, 295);
  assert.strictEqual(secCtx.CoralCoveGate.checkLock(baseNow + 301000).locked, false);
  secCtx.CoralCoveGate.resetLock();
  assert.strictEqual(secCtx.CoralCoveGate.checkLock(baseNow).fails, 0);

  // 7b. library.js gate throttling, proxyUrl validation, prototype-safe parsing, password non-echoing
  function makeNode() {
    const listeners = {};
    const node = {
      value: '', checked: true, disabled: false, hidden: false, textContent: '', innerHTML: '',
      children: [], classList: { add() {}, remove() {}, toggle() {} },
      attrs: {}, dataset: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(n, fn) { (listeners[n] = listeners[n] || []).push(fn); },
      fire(n, ev = {}) { (listeners[n] || []).forEach(fn => fn({ preventDefault() {}, ...ev })); },
      focus() {}, contains() { return true; }, appendChild(c) { this.children.push(c); return c; },
      querySelector(sel) { return this._map && this._map[sel] || makeNode(); },
      querySelectorAll() { return []; }
    };
    return node;
  }
  const libLs = makeStorage();
  const pinInput = makeNode(), gateForm = makeNode(), gateBtn = makeNode(), gateMsg = makeNode();
  const urlInput = makeNode(), codeInput = makeNode(), voiceChk = makeNode(), intInput = makeNode();
  const bigChk = makeNode(), logChk = makeNode(), saveBtn = makeNode(), testBtn = makeNode(), offBtn = makeNode(), chatBtn = makeNode();
  const clibBody = makeNode(), clibTitle = makeNode(), clibBack = makeNode(), clibSrc = makeNode();
  clibBody._map = {
    '#clibPin': pinInput, '[data-gate]': gateForm, 'button': gateBtn, '.clib-msg': gateMsg,
    '#clibUrl': urlInput, '#clibCode': codeInput, '#clibVoice': voiceChk, '#clibInt': intInput,
    '#clibBig': bigChk, '#clibLog': logChk, '[data-save]': saveBtn, '[data-test]': testBtn,
    '[data-off]': offBtn, '[data-chatlog]': chatBtn
  };
  let verifyCalls = 0;
  const canaryPwd = 'CANARY_WRONG_PASSWORD_999';
  const libWin = {
    CoralCove: {
      profile: () => ({ id: 'wendy', name: 'Wendy', child: false, goals: ['korean'] }),
      subjects: () => [], decks: () => [], cards: () => Promise.resolve([]),
      needsGrownUpCheck: () => true,
      gate: secCtx.window.CoralCoveGate,
      stopSpeaking() {}, speak() {}, sound() {}
    },
    CoralCoveSecurity: secCtx.window.CoralCoveSecurity,
    CoralCoveGate: secCtx.window.CoralCoveGate,
    CoralCoveVerifyGrownUpPassword: async (v) => { verifyCalls++; return v === 'correct'; }
  };
  libWin.window = libWin;
  const libRoot = makeNode();
  libRoot._map = { '.clib-body': clibBody, '.clib-title': clibTitle, '.clib-back': clibBack, '.clib-source': clibSrc };
  const libDoc = {
    head: makeNode(),
    body: { classList: { add() {}, remove() {} }, appendChild() {} },
    createElement(tag) { return tag === 'div' ? libRoot : makeNode(); }
  };
  const libCtx = {
    window: libWin, document: libDoc, localStorage: libLs, navigator: { onLine: true },
    URL, Promise, Date, setTimeout, clearTimeout, console
  };
  vm.createContext(libCtx);
  vm.runInContext(readGame('library.js'), libCtx);
  // Render settings gate
  libWin.CoralLibrary.open();
  libWin.CoralLibrary.go('settings');
  const tick = () => new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 5; i++) {
    pinInput.value = canaryPwd;
    gateForm.fire('submit');
    await tick(); await tick();
    assert(!gateMsg.textContent.includes(canaryPwd), 'password must never be echoed');
    assert(!String(secStorage.getItem('cc-gate-lock') || '').includes(canaryPwd), 'password must not be stored');
  }
  assert.strictEqual(verifyCalls, 5);
  assert.match(gateMsg.textContent, /wait 15s/i);
  // 6th attempt while locked must be blocked before invoking verifier
  pinInput.value = 'correct';
  gateForm.fire('submit');
  await tick(); await tick();
  assert.strictEqual(verifyCalls, 5, 'locked gate blocks verifier call');
  assert.match(gateMsg.textContent, /Too many attempts/);
  assert.strictEqual(libWin.CoralLibrary.pinOK, undefined);

  // Unlock after reset and test proxyUrl validation
  secCtx.CoralCoveGate.resetLock();
  pinInput.value = 'correct';
  gateForm.fire('submit');
  await tick(); await tick();
  assert.strictEqual(libWin.CoralLibrary.pinOK, true);
  // Navigate to unlocked settings view (since fake root.querySelector returns fresh body/msg)
  libWin.CoralLibrary.go('settings', null, true);
  urlInput.value = 'http://evil.example/proxy';
  saveBtn.fire('click');
  assert.match(gateMsg.textContent, /https:\/\//);
  assert.strictEqual(libWin.CoralLibrary.settings().proxyUrl || '', '');
  urlInput.value = 'http://localhost:8787/ask';
  saveBtn.fire('click');
  assert.strictEqual(libWin.CoralLibrary.settings().proxyUrl, 'http://localhost:8787/ask');

  // 8. timingSafeEqual
  assert.strictEqual(secCtx.timingSafeEqual('abc123', 'abc123'), true);
  assert.strictEqual(secCtx.timingSafeEqual('abc123', 'abc124'), false);
  assert.strictEqual(secCtx.timingSafeEqual('abc123', 'abc1234'), false);

  // 9. isSafeAssetFilename
  assert.strictEqual(secCtx.isSafeAssetFilename('ko-1.mp3', /\.mp3$/i), true);
  assert.strictEqual(secCtx.isSafeAssetFilename('en-talk-12.mp3', /\.mp3$/i), true);
  assert.strictEqual(secCtx.isSafeAssetFilename('../secret.mp3', /\.mp3$/i), false);
  assert.strictEqual(secCtx.isSafeAssetFilename('sub/ko-1.mp3', /\.mp3$/i), false);
  assert.strictEqual(secCtx.isSafeAssetFilename('//evil.example/ko.mp3', /\.mp3$/i), false);
  assert.strictEqual(secCtx.isSafeAssetFilename('ko-1.mp3?x=1', /\.mp3$/i), false);
  assert.strictEqual(secCtx.isSafeAssetFilename('ko-1.wav', /\.mp3$/i), false);

  // 10. sw.js cache rules
  const swCode = readGame('sw.js');
  const swHandlers = {};
  const cachePuts = [];
  const swCtx = {
    self: {
      location: { origin: 'https://coral.example' },
      addEventListener(ev, fn) { swHandlers[ev] = fn; },
      skipWaiting() {},
      clients: { claim() {} }
    },
    caches: {
      open: async () => ({ put: async (req, res) => { cachePuts.push({ req, res }); } }),
      match: async () => null,
      keys: async () => []
    },
    fetch: async (req) => ({ ok: true, status: 200, type: 'opaque', clone() { return this; } }),
    URL, Response, Promise
  };
  vm.createContext(swCtx);
  vm.runInContext(swCode, swCtx);
  let rangeWaits = [], respondWaits = [];
  swHandlers.fetch({
    request: { method: 'GET', url: 'https://coral.example/day-song.mp3', headers: new Map([['range', 'bytes=0-100']]) },
    waitUntil(p) { rangeWaits.push(p); },
    respondWith(p) { respondWaits.push(p); }
  });
  await Promise.all(respondWaits);
  await Promise.all(rangeWaits);
  assert.strictEqual(cachePuts.length, 0, 'sw.js must not cache non-basic (opaque) Range background fetch');
  swCtx.fetch = async () => ({ ok: true, status: 200, type: 'basic', clone() { return this; } });
  rangeWaits = []; respondWaits = [];
  swHandlers.fetch({
    request: { method: 'GET', url: 'https://coral.example/day-song.mp3', headers: new Map([['range', 'bytes=0-100']]) },
    waitUntil(p) { rangeWaits.push(p); },
    respondWith(p) { respondWaits.push(p); }
  });
  await Promise.all(respondWaits);
  await Promise.all(rangeWaits);
  assert.strictEqual(cachePuts.length, 1, 'sw.js caches basic 200 same-origin Range background fetch');

  // Cross-origin non-font request is ignored
  let crossResponded = false;
  swHandlers.fetch({
    request: { method: 'GET', url: 'https://evil.example/track.mp3', headers: new Map() },
    waitUntil() {},
    respondWith() { crossResponded = true; }
  });
  assert.strictEqual(crossResponded, false, 'sw.js ignores cross-origin non-font requests');

  // 11. Built HTML, page.html & _headers checks
  for (const htmlFile of ['src/page.html', 'index.html']) {
    const html = readGame(htmlFile);
    assert.match(html, /http-equiv="Content-Security-Policy"/);
    assert.match(html, /name="referrer"\s+content="no-referrer"/);
    assert.match(html, /object-src 'none'/);
    assert.match(html, /base-uri 'self'/);
    assert.match(html, /form-action 'self'/);
    assert.doesNotMatch(html, /\beval\s*\(|new Function\s*\(|document\.write\s*\(/);
  }
  const headers = readGame('_headers');
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /X-Frame-Options:\s*DENY/);
  assert.match(headers, /Referrer-Policy:\s*no-referrer/);
  assert.match(headers, /Cross-Origin-Opener-Policy:\s*same-origin/);
  assert.match(headers, /Cross-Origin-Resource-Policy:\s*same-origin/);
  assert.match(headers, /frame-ancestors 'none'/);

  // 12. Music allowlist check
  const musicSrc = readGame('src/js/music.js');
  assert.match(musicSrc, /RM_SONGS\.indexOf\(name\)\s*<\s*0/);

  // 13. Korean Hangul Jamo diagnostics check
  const fsrsSrc = readGame('src/js/fsrs.js');
  const learnerSrc = readGame('src/js/learner.js');
  const lCtx = { S: {}, window: { addEventListener() {} }, clearTimeout, setTimeout, localStorage: makeStorage() };
  vm.createContext(lCtx);
  vm.runInContext(fsrsSrc + '\n' + learnerSrc, lCtx);
  assert.match(lCtx.window.koJamoDiag('커피', '거피') || '', /consonant/i);
  assert.match(lCtx.window.koJamoDiag('어머니', '오머니') || '', /vowel/i);
  assert.match(lCtx.window.koJamoDiag('감사합니다', '감사하니다') || '', /받침|bottom/i);

  // 14. words.js Object.prototype collision hardening
  const wordsLs = makeStorage();
  const wordsWin = {
    CORAL_WORDS: {
      en: { dog: [{ pos: 'noun', def: 'a friendly animal', ex: 'The dog runs.' }] },
      enwn: { zebra: ['noun', 'a striped animal'] },
      enf: { dogs: 'dog' },
      zh: { w: {}, c: {}, s: {} }
    }
  };
  const wordsCtx = {
    window: wordsWin,
    document: { getElementById: () => null, head: { appendChild() {} }, createElement: () => ({}) },
    localStorage: wordsLs,
    Promise
  };
  vm.createContext(wordsCtx);
  vm.runInContext(readGame('words.js'), wordsCtx);
  await wordsWin.CoralWords.load();
  for (const protoKey of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'prototype']) {
    assert.strictEqual(wordsWin.CoralWords.isEnglish(protoKey), false, `isEnglish(${protoKey}) must be false`);
    const ans = wordsWin.CoralWords.answer(protoKey);
    assert.ok(ans && /do not know/.test(ans.answer), `answer(${protoKey}) must not throw or match Object.prototype`);
  }
  const multiAns = wordsWin.CoralWords.answer('What do constructor and toString and dog mean?');
  assert.ok(multiAns && multiAns.parts.some(p => p.part === 'toString'), 'multi-word answer must not drop toString via seen{}');

  // 15. Strict mute & mute-toggle stop regression (Sound.unlock, Speech unlockAudio, reefWinStop, R3amb)
  const learnSrc = readGame('src/js/learning.js');
  const reefSrc = readGame('src/js/reef.js');
  const partySrc = readGame('src/js/reef3d/party.js');
  const soundStart = learnSrc.indexOf('  var Sound = (function(){');
  const soundEnd = learnSrc.indexOf('\n  /* ============ Word Feed ambience', soundStart);
  const ambStart = learnSrc.indexOf('  var SOUND_TRACKS =', soundEnd);
  const ambEnd = learnSrc.indexOf('\n  })();', ambStart) + '\n  })();'.length;
  const winStart = reefSrc.indexOf('  var reefWinBuf = null');
  const winEnd = reefSrc.indexOf('\n  /* ---------- No "is resting"', winStart);
  const r3AmbStart = partySrc.indexOf('  var R3amb = null;');
  const r3AmbEnd = partySrc.indexOf('\n  // Switch the crab', r3AmbStart);
  const musicBootIdx = musicSrc.indexOf('\n  store.init().then(');
  assert(soundStart >= 0 && soundEnd > soundStart && ambStart >= 0 && ambEnd > ambStart);
  assert(winStart >= 0 && winEnd > winStart && r3AmbStart >= 0 && r3AmbEnd > r3AmbStart && musicBootIdx > 0);

  let acNewCount = 0, audioNewCount = 0, audioPlayCount = 0, winStopCount = 0, ambOscStopCount = 0, ambBufStopCount = 0, silentPaused = 0;
  class FakeBufSrc {
    constructor(kind) { this.kind = kind; this.buffer = null; this.loop = false; }
    connect() {}
    disconnect() {}
    start() {}
    stop() { if (this.kind === 'r3amb') ambBufStopCount++; else winStopCount++; }
  }
  class FakeAudioContext {
    constructor() { acNewCount++; this.state = 'running'; this.currentTime = 1; this.sampleRate = 48000; this.destination = {}; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} }, connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { type: 'lowpass', frequency: { value: 18000, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, Q: { value: 0.5 }, connect() {} }; }
    createOscillator() { return { type: 'sine', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, detune: { value: 0 }, connect() {}, start() {}, stop() { ambOscStopCount++; } }; }
    createDelay() { return { delayTime: { value: 0 }, connect() {} }; }
    createMediaElementSource() { return { connect() {} }; }
    createBuffer(ch, len) { return { duration: 15, getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { return new FakeBufSrc(this._nextKind || 'win'); }
    decodeAudioData(buf, res) { const out = { duration: 15 }; if (res) res(out); return Promise.resolve(out); }
  }
  class FakeAudio {
    constructor(src) {
      audioNewCount++;
      this.src = src || '';
      this.loop = false;
      this.volume = 1;
      this.paused = true;
    }
    setAttribute() {}
    addEventListener() {}
    load() {}
    play() { audioPlayCount++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; if (String(this.src).startsWith('data:audio/wav')) silentPaused++; }
  }
  const muteLs = makeStorage({ 'cc-music': 'off', 'coralCoveSound': '0' });
  const muteDocListeners = {};
  const muteDoc = {
    hidden: false,
    body: { contains: () => true, appendChild() {} },
    head: { appendChild() {} },
    addEventListener(ev, fn) { (muteDocListeners[ev] = muteDocListeners[ev] || []).push(fn); },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ addEventListener() {}, remove() {} })
  };
  const muteWin = {
    AudioContext: FakeAudioContext,
    Audio: FakeAudio,
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) }),
    addEventListener() {}
  };
  const muteCtx = {
    window: muteWin,
    document: muteDoc,
    localStorage: muteLs,
    navigator: {},
    AudioContext: FakeAudioContext,
    Audio: FakeAudio,
    S: { profile: { mode: 'child' }, settings: {}, view: 'study' },
    ccIcon: () => '',
    reefNight: () => false,
    reefGame: () => true,
    reefInDeck: () => false,
    regionEncounterActive: () => false,
    deckSpeechMuted: () => false,
    AudioClips: { get: async () => null },
    fetch: muteWin.fetch,
    addEventListener: () => {},
    Promise, Math, Date, URL, Blob,
    setTimeout, clearTimeout, setInterval, clearInterval, console
  };
  vm.createContext(muteCtx);
  vm.runInContext(
    learnSrc.slice(soundStart, soundEnd) + '\n' +
    learnSrc.slice(ambStart, ambEnd) + '\n' +
    reefSrc.slice(winStart, winEnd) + '\n' +
    partySrc.slice(r3AmbStart, r3AmbEnd) + '\n' +
    musicSrc.slice(0, musicBootIdx),
    muteCtx
  );
  // While muted (cc-music=off, coralCoveSound=0), unlock & interactions must create ZERO AudioContext / Audio.play()
  muteCtx.Sound.unlock();
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => (muteDocListeners[ev] || []).forEach(fn => fn({ target: {} })));
  muteCtx.reefMusicStart();
  muteCtx.reefThemeSting(true);
  muteCtx.reefWinLoad();
  muteCtx.reefWinSound(true);
  muteCtx.Speech.speak('안녕하세요');
  muteCtx.Ambience.play('waves');
  assert.strictEqual(acNewCount, 0, 'strict mute must construct 0 AudioContext instances');
  assert.strictEqual(audioNewCount, 0, 'strict mute must construct 0 Audio instances');
  assert.strictEqual(audioPlayCount, 0, 'strict mute must invoke 0 Audio.play() calls');

  // Unmuting and starting win celebration + R3amb + Ambience, then calling Sound.setEnabled(false) must stop ALL of them
  muteCtx.Sound.setEnabled(true);
  assert.ok(acNewCount >= 1, 'enabling sound unlocks AudioContext');
  assert.ok(audioPlayCount >= 1, 'enabling sound unlocks silent Audio');
  await muteCtx.reefWinLoad();
  muteCtx.reefWinSound(true);
  const fakeCtx = muteCtx.Sound.getCtx();
  fakeCtx._nextKind = 'r3amb';
  muteCtx.reef3dAmbience({ wrap: {}, region: null }, true);
  fakeCtx._nextKind = 'amb';
  muteCtx.Ambience.play('waves');
  assert.strictEqual(muteCtx.Ambience.current(), 'waves');

  muteCtx.Sound.setEnabled(false);
  assert.strictEqual(winStopCount, 1, 'Sound.setEnabled(false) must stop active reefWinNode');
  assert.strictEqual(ambBufStopCount, 1, 'Sound.setEnabled(false) must stop active R3amb buffer source');
  assert.strictEqual(ambOscStopCount, 1, 'Sound.setEnabled(false) must stop active R3amb LFO');
  assert.strictEqual(muteCtx.Ambience.current(), null, 'Sound.setEnabled(false) must stop Ambience');
  assert.ok(silentPaused >= 1, 'Sound.setEnabled(false) pauses silentUnlockAudio');
  assert.strictEqual(muteWin.__reefMusicState().current, null, 'Sound.setEnabled(false) clears active music track');

  console.log('Passed: CSP, _headers, safePhotoUrl, safeProxyUrl, safePlainText XSS gadgets, prototype-pollution guards, storage.js bounds, backup validation & cc-gate-lock exclusion, Anki bounds, cc-gate-lock backoff & library.js throttling, password non-echoing, isSafeAssetFilename, sw.js cache rules, music allowlist, koJamoDiag, words.js prototype isolation, and strict mute/stop guards.');
})().catch(err => { console.error(err); process.exitCode = 1; });
