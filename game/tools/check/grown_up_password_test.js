// Run with: node tools/check/grown_up_password_test.js
// Uses a synthetic password and digest; never reads or prints the configured secret.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const source = fs.readFileSync('src/js/reef.js', 'utf8');
const start = source.indexOf('  function reefCheckGrownUpPassword(value){');
const exportAt = source.indexOf('  window.CoralCoveVerifyGrownUpPassword = reefCheckGrownUpPassword;', start);
const gateAt = source.indexOf('  function reefGrownUpGate(kind){', exportAt);
const gateEnd = source.indexOf('  /* ---------- Leaving a deck early', gateAt);
assert(start >= 0 && exportAt > start && gateAt > exportAt && gateEnd > gateAt, 'gate source markers found');
const verifierSource = source.slice(start, exportAt) + source.slice(exportAt, gateAt);
const gateSource = source.slice(gateAt, gateEnd);

const fixturePassword = 'fixture-only-unrelated-password';
async function digestHex(value) {
  const bytes = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}

function element() {
  const listeners = {};
  const attrs = {};
  return {
    value: '', disabled: false, isConnected: true, textContent: '', focused: false,
    addEventListener(name, fn) { listeners[name] = fn; },
    fire(name, event = {}) { if (listeners[name]) listeners[name]({ preventDefault() {}, ...event }); },
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    hasAttribute(k) { return Object.hasOwn(attrs, k); },
    getAttribute(k) { return attrs[k]; }, focus() { this.focused = true; },
    remove() { this.isConnected = false; }
  };
}

function setup(hash, cryptoObject = webcrypto) {
  const input = element(), form = element(), button = element(), message = element(), cancel = element();
  const nodes = { '#adultGateInput': input, '.reef-password-form': form,
    '[data-gate="check"]': button, '#adultGateMsg': message, '[data-gate="cancel"]': cancel };
  const app = { innerHTML: '', querySelector(selector) { return nodes[selector]; } };
  const state = { adultGate: null, pinPromptFor: 'enterAdult' };
  let passed = 0, cancelled = 0;
  const context = { app, S: state, BAKED_PIN_HASH: hash, TextEncoder, Promise,
    window: { crypto: cryptoObject }, esc: x => String(x), pinPadTitles: () => ['Unlock', 'Enter password'],
    grownUpPassed: () => { passed++; }, cancelPinPrompt: () => { cancelled++; },
    setTimeout: () => 0, clearTimeout() {} };
  vm.createContext(context);
  vm.runInContext(verifierSource + '\n' + gateSource, context);
  context.reefGrownUpGate('enterAdult');
  return { context, state, input, form, button, message, cancel, get passed() { return passed; }, get cancelled() { return cancelled; } };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function submit(g) { g.form.fire('submit'); await tick(); await tick(); }

(async () => {
  const fixtureHash = await digestHex(fixturePassword);
  const verifier = setup(fixtureHash);
  assert.strictEqual(await verifier.context.reefCheckGrownUpPassword(fixturePassword), true, 'correct fixture verifies');
  assert.strictEqual(await verifier.context.reefCheckGrownUpPassword(fixturePassword.toUpperCase()), false, 'case mismatch rejects');
  assert.strictEqual(await verifier.context.reefCheckGrownUpPassword(''), false, 'empty rejects');
  assert.strictEqual(verifier.input.type, undefined, 'input fake remains unopinionated');
  assert.match(verifier.context.app.innerHTML, /type="password"/);
  assert.doesNotMatch(verifier.context.app.innerHTML, /type="number"|inputmode="numeric"/);

  verifier.input.value = '';
  await submit(verifier);
  assert.match(verifier.message.textContent, /Enter the password/);
  verifier.input.value = 'wrong fixture';
  await submit(verifier);
  assert.match(verifier.message.textContent, /Incorrect password/);
  assert.strictEqual(verifier.input.disabled, false);
  verifier.input.value = fixturePassword;
  await submit(verifier);
  assert.strictEqual(verifier.passed, 1, 'correct password unlocks');

  const enter = setup(fixtureHash);
  enter.input.value = fixturePassword;
  enter.input.fire('keydown', { key: 'Enter' });
  await tick(); await tick();
  assert.strictEqual(enter.passed, 1, 'Enter submits');

  const canceled = setup(fixtureHash);
  canceled.input.value = fixturePassword;
  canceled.input.fire('keydown', { key: 'Escape' });
  assert.strictEqual(canceled.cancelled, 1, 'Escape cancels');
  const canceledByButton = setup(fixtureHash);
  canceledByButton.cancel.fire('click');
  assert.strictEqual(canceledByButton.cancelled, 1, 'Cancel button cancels');

  // Pending promise and canceled/rerendered gates cannot unlock a stale screen.
  let release;
  const delayedCrypto = { subtle: { digest: () => new Promise(resolve => { release = resolve; }) } };
  const pending = setup(fixtureHash, delayedCrypto);
  pending.input.value = fixturePassword;
  pending.form.fire('submit'); await tick();
  pending.form.fire('submit'); await tick();
  assert.strictEqual(typeof release, 'function');
  assert.strictEqual(pending.input.disabled, true, 'duplicate submit stays disabled while pending');
  pending.input.isConnected = false;
  pending.state.adultGate = null;
  release(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(fixturePassword)));
  await tick(); await tick();
  assert.strictEqual(pending.passed, 0, 'stale async result cannot unlock');

  const rejected = setup(fixtureHash, { subtle: { digest: () => Promise.reject(new Error('fixture failure')) } });
  rejected.input.value = fixturePassword;
  await submit(rejected);
  assert.match(rejected.message.textContent, /verification is unavailable/);
  assert.strictEqual(rejected.passed, 0, 'crypto rejection fails closed');

  // Library gate guards are separately audited: result use is bound to the current
  // generation, open root, rendered form and profile key; navigation invalidates it.
  const library = fs.readFileSync('library.js', 'utf8');
  const settingsStart = library.indexOf("  LIB.views.settings = { title: 'Settings'");
  const settingsEnd = library.indexOf('\n  // ', settingsStart + 1);
  const settings = library.slice(settingsStart, settingsEnd > settingsStart ? settingsEnd : settingsStart + 5000);
  for (const evidence of ['generation === grownUpCheckGeneration', 'root.contains(form)', 'pkey() === profileKey',
    'if(pending || !current()) return', "if(ok === true)", 'grownUpCheckGeneration++']) {
    assert(library.includes(evidence), `Library guard includes ${evidence}`);
  }
  assert(settings.includes('window.CoralCoveVerifyGrownUpPassword(value)'), 'Library uses shared async verifier');
  assert(library.includes('invalidateGrownUpCheck: function(){ grownUpCheckGeneration++; LIB.pinOK = false; }'), 'Library invalidator clears authorization');

  console.log('Passed: synthetic SHA-256 verification, password form behavior, stale gate and fail-closed crypto; Library lifecycle guards audited.');
})().catch(error => { console.error(error); process.exitCode = 1; });
