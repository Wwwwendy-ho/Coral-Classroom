/* Comprehensive unit tests for Coral Classroom Jamboree systems.
   Run from repository root:
   node tools/check/jamboree_systems_test.js */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const THREE = require(path.join(root, 'three.min.js'));

const TARGET_FILES = [
  'world-state.js',
  'culture-packs.js',
  'jamboree-visuals.js',
  'room-interactions.js',
  'region-mechanics.js',
  'jamboree-gameplay.js',
];

function resolveJsPath(filename) {
  const candidates = [
    path.join(root, 'src', 'js', filename),
    path.join(root, 'src', 'js', 'reef3d', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function createMockElement(tagName, doc) {
  const listeners = new Map();
  const children = [];
  const classes = new Set();
  const attrs = new Map();
  const styleObj = {
    setProperty(k, v) { this[k] = String(v); },
    removeProperty(k) { delete this[k]; },
  };
  const el = {
    tagName: String(tagName || 'div').toUpperCase(),
    nodeName: String(tagName || 'div').toUpperCase(),
    id: '',
    type: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    tabIndex: 0,
    textContent: '',
    innerText: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      if (v === '') children.length = 0;
    },
    dataset: {},
    style: styleObj,
    parentNode: null,
    children,
    childNodes: children,
    ownerDocument: doc,
    classList: {
      add(...names) { names.forEach((n) => n && classes.add(n)); },
      remove(...names) { names.forEach((n) => classes.delete(n)); },
      toggle(n, force) {
        if (force === undefined) {
          if (classes.has(n)) { classes.delete(n); return false; }
          classes.add(n); return true;
        }
        if (force) classes.add(n); else classes.delete(n);
        return !!force;
      },
      contains(n) { return classes.has(n); },
      toString() { return Array.from(classes).join(' '); },
    },
    get className() { return Array.from(classes).join(' '); },
    set className(v) {
      classes.clear();
      String(v || '').split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
    },
    setAttribute(k, v) {
      attrs.set(k, String(v));
      if (k === 'id') this.id = String(v);
      if (k === 'class') this.className = String(v);
    },
    getAttribute(k) {
      if (k === 'id') return this.id || null;
      if (k === 'class') return this.className || null;
      return attrs.has(k) ? attrs.get(k) : null;
    },
    removeAttribute(k) { attrs.delete(k); },
    hasAttribute(k) { return attrs.has(k); },
    appendChild(child) {
      if (!child) return child;
      if (child.parentNode && child.parentNode.removeChild) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = el;
      children.push(child);
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx >= 0) {
        children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },
    remove() {
      if (el.parentNode) el.parentNode.removeChild(el);
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      doc._listenerCount++;
    },
    removeEventListener(type, fn) {
      const set = listeners.get(type);
      if (set && set.delete(fn)) doc._listenerCount--;
    },
    dispatchEvent(evt) {
      const set = listeners.get(evt && evt.type);
      if (set) set.forEach((fn) => fn.call(el, evt));
      return true;
    },
    click() {
      this.dispatchEvent({ type: 'click', target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} });
    },
    focus() {},
    blur() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800 };
    },
    getContext() {
      return {
        canvas: el,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        font: '16px sans-serif',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        clearRect() {},
        fillRect() {},
        strokeRect() {},
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        arc() {},
        ellipse() {},
        quadraticCurveTo() {},
        bezierCurveTo() {},
        roundRect() {},
        clip() {},
        fill() {},
        stroke() {},
        fillText() {},
        strokeText() {},
        measureText(t) { return { width: String(t || '').length * 8 }; },
        save() {},
        restore() {},
        translate() {},
        scale() {},
        rotate() {},
        setTransform() {},
        resetTransform() {},
        createLinearGradient() { return { addColorStop() {} }; },
        createRadialGradient() { return { addColorStop() {} }; },
        createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData() {},
        drawImage() {},
        getImageData(x, y, w, h) { return { data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) }; },
      };
    },
    querySelector(sel) {
      return el.querySelectorAll(sel)[0] || null;
    },
    querySelectorAll(sel) {
      const out = [];
      const match = (node) => {
        if (!node || !node.classList) return false;
        if (sel.startsWith('#')) return node.id === sel.slice(1);
        if (sel.startsWith('.')) return node.classList.contains(sel.slice(1));
        return node.tagName.toLowerCase() === sel.toLowerCase();
      };
      const walk = (node) => {
        for (const c of node.children || []) {
          if (match(c)) out.push(c);
          walk(c);
        }
      };
      walk(el);
      return out;
    },
  };
  return el;
}

function createHarness() {
  const storageMap = new Map();
  let audioCalls = 0;
  let speechCalls = 0;
  let calmFlag = false;
  let nowMs = 1000;

  const doc = {
    _listenerCount: 0,
    _docListeners: new Map(),
    createElement(tag) { return createMockElement(tag, doc); },
    createTextNode(text) { return { nodeType: 3, textContent: String(text || '') }; },
    addEventListener(type, fn) {
      if (!this._docListeners.has(type)) this._docListeners.set(type, new Set());
      this._docListeners.get(type).add(fn);
      this._listenerCount++;
    },
    removeEventListener(type, fn) {
      const set = this._docListeners.get(type);
      if (set && set.delete(fn)) this._listenerCount--;
    },
    getElementById(id) {
      return this.body.querySelector('#' + id) || this.head.querySelector('#' + id);
    },
    querySelector(sel) {
      return this.body.querySelector(sel) || this.head.querySelector(sel);
    },
    querySelectorAll(sel) {
      return [...this.head.querySelectorAll(sel), ...this.body.querySelectorAll(sel)];
    },
  };
  doc.documentElement = createMockElement('html', doc);
  doc.head = createMockElement('head', doc);
  doc.body = createMockElement('body', doc);

  const localStorageMock = {
    getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
    setItem(k, v) { storageMap.set(String(k), String(v)); },
    removeItem(k) { storageMap.delete(String(k)); },
    clear() { storageMap.clear(); },
  };

  class MockAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      audioCalls++;
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() { return this; },
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() { return this; },
      };
    }
  }

  const state = {
    profile: 'kid_a',
    stars: 120,
    streak: 4,
    muted: false,
    calm: false,
    night: false,
    cultureMode: 'oceanic',
  };

  const sandbox = {
    THREE,
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    Float32Array,
    Uint8ClampedArray,
    Uint16Array,
    Uint32Array,
    document: doc,
    localStorage: localStorageMock,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    speechSynthesis: {
      speak() { speechCalls++; },
      cancel() {},
      getVoices() { return []; },
    },
    SpeechSynthesisUtterance: function (text) { this.text = text; },
    performance: { now: () => nowMs },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    S: state,
    reefCalm: () => calmFlag || !!state.calm,
    save: () => {},
    toast: () => {},
    ccIcon: () => '<svg></svg>',
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  return {
    sandbox,
    doc,
    storageMap,
    setCalm(v) { calmFlag = !!v; state.calm = !!v; },
    advanceTime(ms) { nowMs += ms; },
    getAudioCalls() { return audioCalls; },
    getSpeechCalls() { return speechCalls; },
    resetMediaCounts() { audioCalls = 0; speechCalls = 0; },
  };
}

function assertFiniteTree(obj, label) {
  if (!obj) return;
  if (typeof obj.traverse === 'function') {
    obj.traverse((node) => {
      if (node.position) {
        assert(Number.isFinite(node.position.x) && Number.isFinite(node.position.y) && Number.isFinite(node.position.z),
          `${label}: non-finite position on ${node.name || node.type}`);
      }
      if (node.rotation) {
        assert(Number.isFinite(node.rotation.x) && Number.isFinite(node.rotation.y) && Number.isFinite(node.rotation.z),
          `${label}: non-finite rotation on ${node.name || node.type}`);
      }
      if (node.scale) {
        assert(Number.isFinite(node.scale.x) && Number.isFinite(node.scale.y) && Number.isFinite(node.scale.z),
          `${label}: non-finite scale on ${node.name || node.type}`);
      }
    });
  }
}

function countDisposables(rootObj) {
  const geos = new Set();
  const mats = new Set();
  if (rootObj && typeof rootObj.traverse === 'function') {
    rootObj.traverse((node) => {
      if (node.geometry) geos.add(node.geometry);
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach((m) => mats.add(m));
        else mats.add(node.material);
      }
    });
  }
  return { geos, mats };
}

function main() {
  // -------------------------------------------------------------------------
  // (a) File presence, zero syntax errors, and expected globals
  // -------------------------------------------------------------------------
  const resolved = {};
  const missing = [];
  for (const file of TARGET_FILES) {
    const p = resolveJsPath(file);
    if (!p) missing.push(file);
    else resolved[file] = p;
  }
  assert.strictEqual(missing.length, 0,
    `Missing required Jamboree module(s): ${missing.join(', ')}`);

  const h = createHarness();
  for (const file of TARGET_FILES) {
    const src = fs.readFileSync(resolved[file], 'utf8');
    // Verify syntax explicitly before running inside IIFE wrapper
    new vm.Script(`(function(){\n"use strict";\n${src}\n})();`, { filename: file });
    vm.runInContext(src, h.sandbox, { filename: file });
  }

  const globals = [
    'WorldState',
    'CulturePacks',
    'JamboreeVisuals',
    'JamboreeRooms',
    'JamboreeRegions',
    'JamboreePlay',
  ];
  for (const g of globals) {
    assert(h.sandbox[g] && typeof h.sandbox[g] === 'object', `Missing global ${g}`);
  }

  const { WorldState, CulturePacks, JamboreeVisuals, JamboreeRooms, JamboreeRegions, JamboreePlay } = h.sandbox;

  // Check expected methods on each module
  assert(typeof WorldState.get === 'function' && typeof WorldState.save === 'function',
    'WorldState must expose get and save');
  assert(typeof CulturePacks.getPack === 'function' && typeof CulturePacks.registerPack === 'function',
    'CulturePacks must expose getPack and registerPack');
  for (const [name, mod] of [
    ['JamboreeVisuals', JamboreeVisuals],
    ['JamboreeRooms', JamboreeRooms],
    ['JamboreeRegions', JamboreeRegions],
    ['JamboreePlay', JamboreePlay],
  ]) {
    const hasAttach = typeof mod.attach === 'function' || typeof mod.attachInterior === 'function';
    assert(hasAttach, `${name} must expose attach() or attachInterior()`);
    assert(typeof mod.tick === 'function', `${name} must expose tick()`);
    assert(typeof mod.dispose === 'function', `${name} must expose dispose()`);
  }

  // -------------------------------------------------------------------------
  // (b) WorldState: profile isolation, bounded arrays, prototype-pollution,
  //     and cultureMode ('oceanic' vs 'culture') persistence
  // -------------------------------------------------------------------------
  WorldState.resetForProfile('alice');
  const aliceState = WorldState.get();
  assert(aliceState && typeof aliceState === 'object', 'WorldState.get() returns state object');

  for (let i = 0; i < 45; i++) {
    WorldState.unlockTrophy('trophy_' + i);
    WorldState.addPhoto({ id: 'photo_' + i, region: 'lagoon', caption: 'Snap ' + i });
    WorldState.placeDecor({ id: 'decor_' + i, kind: 'coral', x: i, y: 0, z: 0 });
    WorldState.unlockGachapon('gacha_' + i);
  }
  const aliceAfter = WorldState.get();
  assert(aliceAfter.trophies.length <= 32, `trophies exceeded 32: ${aliceAfter.trophies.length}`);
  assert(aliceAfter.photos.length <= 18, `photos exceeded 18: ${aliceAfter.photos.length}`);
  assert(aliceAfter.homeIsland.length <= 24, `homeIsland exceeded 24: ${aliceAfter.homeIsland.length}`);
  assert(aliceAfter.gachaponCollection.length <= 32,
    `gachaponCollection exceeded 32: ${aliceAfter.gachaponCollection.length}`);

  // cultureMode persistence ('oceanic' vs 'culture')
  WorldState.setCultureMode('culture');
  assert.strictEqual(WorldState.get().cultureMode, 'culture', 'cultureMode persists as culture');
  WorldState.setCultureMode('oceanic');
  assert.strictEqual(WorldState.get().cultureMode, 'oceanic', 'cultureMode persists as oceanic');

  // Profile isolation check
  WorldState.resetForProfile('bob');
  const bobState = WorldState.get();
  assert.notStrictEqual(bobState, aliceAfter, 'Profiles must not share object reference');
  assert.strictEqual(bobState.trophies.length, 0, 'Bob profile must be isolated from Alice trophies');
  assert.strictEqual(bobState.photos.length, 0, 'Bob profile must be isolated from Alice photos');

  // Prototype-pollution immunity via poisoned localStorage payload
  h.sandbox.localStorage.setItem(
    'coral_world_v1_mallory',
    '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"trophies":["safe_1"]}'
  );
  WorldState.resetForProfile('mallory');
  const malloryState = WorldState.get();
  assert.strictEqual(({}).polluted, undefined, 'Object.prototype must not be polluted');
  assert(Array.isArray(malloryState.trophies), 'Valid fields still load safely');

  // -------------------------------------------------------------------------
  // (c) CulturePacks: 'oceanic', 'ko', 'ja', 'es', plus registerPack('fr', ...)
  // -------------------------------------------------------------------------
  const requiredPacks = ['oceanic', 'ko', 'ja', 'es'];
  for (const code of requiredPacks) {
    const mode = code === 'oceanic' ? 'oceanic' : 'culture';
    const pack = CulturePacks.getPack(code, mode);
    assert(pack && typeof pack === 'object', `CulturePacks.getPack('${code}', '${mode}') returned invalid pack`);
    const props = CulturePacks.getRoomProps(code, 'cafe', mode);
    const orders = CulturePacks.getOrderRecipes(code, 'cafe', mode);
    const signage = CulturePacks.getSignage(code, 'cafe', mode);
    const constellations = CulturePacks.getConstellationWords(code, mode);
    const stickers = CulturePacks.getCameraStickers(code, mode);
    assert(Array.isArray(props) && props.length > 0, `${code} pack missing roomProps`);
    assert(Array.isArray(orders) && orders.length > 0, `${code} pack missing orders/recipes`);
    assert(signage && Array.isArray(signage.tiers) && signage.tiers.length > 0, `${code} pack missing signage`);
    assert(Array.isArray(constellations) && constellations.length > 0, `${code} pack missing constellations`);
    assert(Array.isArray(stickers) && stickers.length > 0, `${code} pack missing stickers`);
  }

  CulturePacks.registerPack('fr', {
    id: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    roomProps: { default: ['croissant-tray'], cafe: ['bistro-awning'] },
    recipes: { cafe: [{ id: 'fr-cafe', name: 'Café au lait', target: 'Café au lait', gloss: 'Coffee with milk', icon: '☕', ingredients: ['café', 'lait'] }] },
    signage: { cafe: { icon: '☕', tiers: [{ label: 'Bistro Corail', gloss: 'Coral Bistro' }] } },
    constellations: [{ id: 'fr-star', word: 'Étoile', gloss: 'Star', stars: 5 }],
    stickers: [{ id: 'fr-beret', label: 'Béret', icon: '🥐' }],
  });
  const frPack = CulturePacks.getPack('fr', 'culture');
  assert(frPack && frPack.id === 'fr', 'registerPack("fr", ...) must be retrievable via getPack("fr", "culture")');
  assert(CulturePacks.getCameraStickers('fr', 'culture').length === 1, 'Custom pack stickers accessible via CulturePacks');

  // -------------------------------------------------------------------------
  // (d) Mock Three.js attach -> tick -> dispose lifecycle
  // -------------------------------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1280 / 800, 0.1, 200);
  camera.position.set(0, 6, 12);
  camera.lookAt(0, 0, 0);
  const hostEl = h.doc.createElement('div');
  h.doc.body.appendChild(hostEl);

  const modules = [
    ['JamboreeVisuals', JamboreeVisuals],
    ['JamboreeRooms', JamboreeRooms],
    ['JamboreeRegions', JamboreeRegions],
    ['JamboreePlay', JamboreePlay],
  ];

  let geoDisposed = 0;
  let matDisposed = 0;
  const origGeoDispose = THREE.BufferGeometry.prototype.dispose;
  const origMatDispose = THREE.Material.prototype.dispose;
  THREE.BufferGeometry.prototype.dispose = function () { geoDisposed++; return origGeoDispose.apply(this, arguments); };
  THREE.Material.prototype.dispose = function () { matDisposed++; return origMatDispose.apply(this, arguments); };

  try {
    for (const [name, mod] of modules) {
      const view = {
        scene,
        camera,
        host: hostEl,
        container: hostEl,
        root: hostEl,
        region: 'lagoon',
        room: 'cafe',
        moving: false,
        THREE,
      };

      if (typeof mod.attach === 'function') {
        mod.attach(view);
      } else {
        mod.attachInterior(view, { room: 'cafe', resident: 'bok' });
      }
      assertFiniteTree(scene, `${name} after attach`);

      // Normal tick
      h.setCalm(false);
      h.sandbox.S.muted = false;
      h.advanceTime(16);
      mod.tick(view, 0.016, 1.0);
      assertFiniteTree(scene, `${name} after normal tick`);

      // Calm motion tick: must not throw or produce NaNs
      h.setCalm(true);
      h.advanceTime(16);
      mod.tick(view, 0.016, 1.016);
      assertFiniteTree(scene, `${name} after reefCalm tick`);

      // Muted audio/speech check
      h.sandbox.S.muted = true;
      h.resetMediaCounts();
      h.advanceTime(16);
      mod.tick(view, 0.016, 1.032);
      assert.strictEqual(h.getAudioCalls(), 0, `${name} must not trigger WebAudio when S.muted is true`);
      assert.strictEqual(h.getSpeechCalls(), 0, `${name} must not trigger SpeechSynthesis when S.muted is true`);

      // Dispose lifecycle
      const beforeResources = countDisposables(scene);
      const beforeListeners = h.doc._listenerCount;
      mod.dispose(view);
      assert(h.doc._listenerCount <= beforeListeners,
        `${name}.dispose() should not leak DOM listeners`);
      if (beforeResources.geos.size > 0 || beforeResources.mats.size > 0) {
        assertFiniteTree(scene, `${name} after dispose`);
      }
    }
    assert(geoDisposed > 0 || matDisposed > 0, 'dispose() must clean up Three.js geometries/materials');
  } finally {
    THREE.BufferGeometry.prototype.dispose = origGeoDispose;
    THREE.Material.prototype.dispose = origMatDispose;
  }

  console.log('PASS: jamboree_systems_test.js — all checks passed (a, b, c, d).');
}

main();
