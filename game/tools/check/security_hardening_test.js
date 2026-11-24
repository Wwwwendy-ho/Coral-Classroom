// Security hardening & Jamo diagnostic checks.
// Run from game/: node tools/check/security_hardening_test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const secCode = fs.readFileSync('src/js/security.js', 'utf8');
const ctx = {
  COVE_BACKUP_KIND: 'coral-classroom-backup',
  window: { location: { origin: 'http://localhost:8820' } },
  TextEncoder, Promise, URL
};
vm.createContext(ctx);
vm.runInContext(secCode, ctx);

// 1. safePhotoUrl
assert.strictEqual(ctx.safePhotoUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
assert.strictEqual(ctx.safePhotoUrl('vocab-pics/apple.webp'), 'vocab-pics/apple.webp');
assert.strictEqual(ctx.safePhotoUrl('blob:http://localhost:8820/1234-5678'), 'blob:http://localhost:8820/1234-5678');
assert.strictEqual(ctx.safePhotoUrl('javascript:alert(1)'), '');
assert.strictEqual(ctx.safePhotoUrl('data:image/svg+xml;base64,PHN2Zz4='), '');
assert.strictEqual(ctx.safePhotoUrl('https://evil.example/a.png'), '');
assert.strictEqual(ctx.safePhotoUrl('vocab-pics/../secret.png'), '');

// 2. Prototype pollution prevention
const poisoned = ctx.safeJsonParse('{"ok":1,"__proto__":{"polluted":true},"constructor":{"x":1}}', null);
assert.strictEqual(poisoned.ok, 1);
assert.strictEqual(({}).polluted, undefined);
assert.strictEqual(Object.prototype.hasOwnProperty.call(poisoned, '__proto__'), false);

// 3. validateBackupPayload
const badKeyBackup = JSON.stringify({
  kind: 'coral-classroom-backup',
  items: { 'arbitraryKey': 'evil' }
});
assert.strictEqual(ctx.validateBackupPayload(badKeyBackup).ok, false);

const poisonedBackup = JSON.stringify({
  kind: 'coral-classroom-backup',
  items: {
    'coralClassroom.geminiHandoff.demo.v1': JSON.stringify({
      card: { photoUrl: 'javascript:alert(1)', front: '안녕' },
      __proto__: { hacked: true }
    })
  }
});
const vRes = ctx.validateBackupPayload(poisonedBackup);
assert.strictEqual(vRes.ok, true);
const parsedDoc = JSON.parse(vRes.items['coralClassroom.geminiHandoff.demo.v1']);
assert.strictEqual(parsedDoc.card.photoUrl, '');
assert.strictEqual(({}).hacked, undefined);

// 4. timingSafeEqual
assert.strictEqual(ctx.timingSafeEqual('abc123', 'abc123'), true);
assert.strictEqual(ctx.timingSafeEqual('abc123', 'abc124'), false);
assert.strictEqual(ctx.timingSafeEqual('abc123', 'abc1234'), false);

// 5. Built HTML & _headers checks
const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /http-equiv="Content-Security-Policy"/);
assert.match(html, /name="referrer"\s+content="no-referrer"/);
assert.doesNotMatch(html, /\beval\s*\(|new Function\s*\(|document\.write\s*\(/);

const headers = fs.readFileSync('_headers', 'utf8');
assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
assert.match(headers, /X-Frame-Options:\s*DENY/);
assert.match(headers, /frame-ancestors 'none'/);

// 6. Music allowlist check
const musicSrc = fs.readFileSync('src/js/music.js', 'utf8');
assert.match(musicSrc, /RM_SONGS\.indexOf\(name\)\s*<\s*0/);

// 7. Korean Hangul Jamo diagnostics check
const fsrsSrc = fs.readFileSync('src/js/fsrs.js', 'utf8');
const learnerSrc = fs.readFileSync('src/js/learner.js', 'utf8');
const lCtx = { S: {}, window: { addEventListener() {} }, clearTimeout, setTimeout, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(lCtx);
vm.runInContext(fsrsSrc + '\n' + learnerSrc, lCtx);
assert.match(lCtx.window.koJamoDiag('커피', '거피') || '', /consonant/i);
assert.match(lCtx.window.koJamoDiag('어머니', '오머니') || '', /vowel/i);
assert.match(lCtx.window.koJamoDiag('감사합니다', '감사하니다') || '', /받침|bottom/i);

console.log('Passed: CSP, _headers, safePhotoUrl, prototype-pollution guards, backup validation, timingSafeEqual, music allowlist, and koJamoDiag.');
