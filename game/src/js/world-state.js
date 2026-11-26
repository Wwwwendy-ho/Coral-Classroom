/* ============================================================================
   world-state.js — Profile-scoped bounded persistence for Coral Classroom 3D
   Exposes window.WorldState inside the concatenated app IIFE (and in Node).
   ============================================================================ */
(function(){
  'use strict';

  var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  var STORAGE_PREFIX = 'cc-world-state:';
  var VALID_MODES = { oceanic: true, culture: true };
  var VALID_WEATHER = { morning: true, golden: true, starlight: true, aurora: true };
  var VALID_TIDES = { low: true, mid: true, high: true };
  var VALID_BOK_ITEMS = { doubleDice: true, compassDice: true, currentWhistle: true };

  var RESIDENT_IDS = [
    'cafe-seahorse',
    'restaurant-otter',
    'shop-octopus',
    'taxi-squid',
    'subway-ray',
    'hotel-whale',
    'pharmacy-shrimp',
    'friend-seal',
    'bok',
    'jisu',
    'mira',
    'echo',
    'pip',
    'hana',
    'captain-bay'
  ];

  var HEART_XP_THRESHOLDS = [0, 20, 60, 120, 220, 350];

  var MAX_TROPHIES = 32;
  var MAX_COSMETICS_UNLOCKED = 64;
  var MAX_HOME_ISLAND = 24;
  var MAX_PHOTOS = 18;
  var MAX_GACHAPON = 32;
  var MAX_ERRANDS_COMPLETED = 64;
  var MAX_BOTTLE_QUEUE = 12;
  var MAX_BOK_ITEM_QTY = 9;
  var MAX_STREAK = 99;
  var MAX_XP = 999999;
  var MAX_FESTIVAL_COUNT = 9999;

  var memoryStore = Object.create(null);
  var activeProfileId = 'default';
  var explicitProfile = false;
  var cachedState = null;
  var listeners = [];

  function isPlainObject(v){
    return Boolean(v && typeof v === 'object' && !Array.isArray(v));
  }

  function sanitizeKey(k){
    if(typeof k !== 'string') return '';
    if(k === '__proto__' || k === 'constructor' || k === 'prototype') return '';
    return k.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 64);
  }

  function sanitizeText(v, maxLen){
    if(v == null) return '';
    var s = String(v).replace(/[\x00-\x1F\x7F]/g, '').trim();
    return s.slice(0, maxLen || 120);
  }

  function clampInt(v, min, max, fallback){
    var n = Number(v);
    if(!isFinite(n)) return fallback;
    n = Math.floor(n);
    if(n < min) return min;
    if(n > max) return max;
    return n;
  }

  function clampNum(v, min, max, fallback){
    var n = Number(v);
    if(!isFinite(n)) return fallback;
    if(n < min) return min;
    if(n > max) return max;
    return n;
  }

  function safeParse(raw){
    if(typeof raw !== 'string' || !raw) return null;
    if(typeof safeJsonParse === 'function'){
      return safeJsonParse(raw, null);
    }
    try {
      return JSON.parse(raw, function(key, value){
        if(key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
        return value;
      });
    } catch(e){
      return null;
    }
  }

  function storageGet(key){
    try {
      if(typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function'){
        var v = localStorage.getItem(key);
        if(v !== null) return v;
      }
    } catch(e){}
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }

  function storageSet(key, val){
    memoryStore[key] = val;
    try {
      if(typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function'){
        localStorage.setItem(key, val);
      }
    } catch(e){}
  }

  function storageRemove(key){
    delete memoryStore[key];
    try {
      if(typeof localStorage !== 'undefined' && localStorage && typeof localStorage.removeItem === 'function'){
        localStorage.removeItem(key);
      }
    } catch(e){}
  }

  function heartsForXP(xp){
    var h = 0;
    for(var i = 1; i < HEART_XP_THRESHOLDS.length; i++){
      if(xp >= HEART_XP_THRESHOLDS[i]) h = i;
    }
    return h;
  }

  function defaultFriendship(){
    return { xp: 0, hearts: 0, unlockedStory: false, unlockedKeepsake: false };
  }

  function createDefaultState(){
    var friendships = {};
    for(var i = 0; i < RESIDENT_IDS.length; i++){
      friendships[RESIDENT_IDS[i]] = defaultFriendship();
    }
    return {
      v: 1,
      cultureMode: 'oceanic',
      activeLanguage: 'ko',
      friendships: friendships,
      trophies: [],
      cosmetics: {
        shellyHat: null,
        kikoHat: null,
        unlocked: []
      },
      homeIsland: [],
      photos: [],
      bokItems: {
        doubleDice: 0,
        compassDice: 0,
        currentWhistle: 0
      },
      buddy: null,
      errands: {
        activeId: null,
        step: 0,
        carriedParcel: null,
        completed: []
      },
      gachaponCollection: [],
      lighthouseWeather: 'morning',
      patternStreak: 0,
      tidePhase: 'mid',
      bottleTossQueue: [],
      festivalCount: 0
    };
  }

  function sanitizeIdList(arr, maxLen){
    var out = [];
    var seen = Object.create(null);
    if(!Array.isArray(arr)) return out;
    for(var i = 0; i < arr.length && out.length < maxLen; i++){
      var id = sanitizeKey(typeof arr[i] === 'string' ? arr[i] : '');
      if(id && !seen[id]){
        seen[id] = true;
        out.push(id);
      }
    }
    return out;
  }

  function sanitizeState(raw){
    var def = createDefaultState();
    if(!isPlainObject(raw)) return def;

    if(typeof raw.cultureMode === 'string' && VALID_MODES[raw.cultureMode]){
      def.cultureMode = raw.cultureMode;
    }

    if(typeof raw.activeLanguage === 'string'){
      var lang = sanitizeKey(raw.activeLanguage).toLowerCase();
      if(/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/.test(lang)) def.activeLanguage = lang;
    }

    if(isPlainObject(raw.friendships)){
      for(var i = 0; i < RESIDENT_IDS.length; i++){
        var rid = RESIDENT_IDS[i];
        var src = Object.prototype.hasOwnProperty.call(raw.friendships, rid) ? raw.friendships[rid] : null;
        if(isPlainObject(src)){
          var xp = clampInt(src.xp, 0, MAX_XP, 0);
          var hearts = clampInt(src.hearts, 0, 5, heartsForXP(xp));
          var calcHearts = heartsForXP(xp);
          if(calcHearts > hearts) hearts = calcHearts;
          def.friendships[rid] = {
            xp: xp,
            hearts: hearts,
            unlockedStory: Boolean(src.unlockedStory || hearts >= 3),
            unlockedKeepsake: Boolean(src.unlockedKeepsake || hearts >= 5)
          };
        }
      }
    }

    def.trophies = sanitizeIdList(raw.trophies, MAX_TROPHIES);

    if(isPlainObject(raw.cosmetics)){
      var sh = typeof raw.cosmetics.shellyHat === 'string' ? sanitizeKey(raw.cosmetics.shellyHat) : null;
      var kh = typeof raw.cosmetics.kikoHat === 'string' ? sanitizeKey(raw.cosmetics.kikoHat) : null;
      def.cosmetics = {
        shellyHat: sh || null,
        kikoHat: kh || null,
        unlocked: sanitizeIdList(raw.cosmetics.unlocked, MAX_COSMETICS_UNLOCKED)
      };
    }

    if(Array.isArray(raw.homeIsland)){
      for(var h = 0; h < raw.homeIsland.length && def.homeIsland.length < MAX_HOME_ISLAND; h++){
        var item = raw.homeIsland[h];
        if(isPlainObject(item)){
          var itemId = sanitizeKey(typeof item.id === 'string' ? item.id : '');
          if(itemId){
            def.homeIsland.push({
              id: itemId,
              x: clampNum(item.x, -50, 50, 0),
              z: clampNum(item.z, -50, 50, 0),
              rot: clampNum(item.rot, -Math.PI * 2, Math.PI * 2, 0)
            });
          }
        }
      }
    }

    if(Array.isArray(raw.photos)){
      for(var p = 0; p < raw.photos.length && def.photos.length < MAX_PHOTOS; p++){
        var ph = raw.photos[p];
        if(isPlainObject(ph)){
          var pid = sanitizeKey(typeof ph.id === 'string' ? ph.id : ('photo-' + p));
          if(pid){
            def.photos.push({
              id: pid,
              region: sanitizeText(ph.region, 48),
              resident: sanitizeKey(typeof ph.resident === 'string' ? ph.resident : ''),
              caption: sanitizeText(ph.caption, 140),
              ts: clampInt(ph.ts, 0, 9999999999999, Date.now())
            });
          }
        }
      }
    }

    if(isPlainObject(raw.bokItems)){
      def.bokItems = {
        doubleDice: clampInt(raw.bokItems.doubleDice, 0, MAX_BOK_ITEM_QTY, 0),
        compassDice: clampInt(raw.bokItems.compassDice, 0, MAX_BOK_ITEM_QTY, 0),
        currentWhistle: clampInt(raw.bokItems.currentWhistle, 0, MAX_BOK_ITEM_QTY, 0)
      };
    }

    if(isPlainObject(raw.buddy)){
      var bid = sanitizeKey(typeof raw.buddy.id === 'string' ? raw.buddy.id : '');
      var turns = clampInt(raw.buddy.turnsLeft, 0, 99, 0);
      if(bid && turns > 0){
        def.buddy = { id: bid, turnsLeft: turns };
      }
    }

    if(isPlainObject(raw.errands)){
      var aid = typeof raw.errands.activeId === 'string' ? sanitizeKey(raw.errands.activeId) : null;
      var parcel = typeof raw.errands.carriedParcel === 'string' ? sanitizeKey(raw.errands.carriedParcel) : null;
      def.errands = {
        activeId: aid || null,
        step: clampInt(raw.errands.step, 0, 99, 0),
        carriedParcel: parcel || null,
        completed: sanitizeIdList(raw.errands.completed, MAX_ERRANDS_COMPLETED)
      };
    }

    def.gachaponCollection = sanitizeIdList(raw.gachaponCollection, MAX_GACHAPON);

    if(typeof raw.lighthouseWeather === 'string' && VALID_WEATHER[raw.lighthouseWeather]){
      def.lighthouseWeather = raw.lighthouseWeather;
    }

    def.patternStreak = clampInt(raw.patternStreak, 0, MAX_STREAK, 0);

    if(typeof raw.tidePhase === 'string' && VALID_TIDES[raw.tidePhase]){
      def.tidePhase = raw.tidePhase;
    }

    if(Array.isArray(raw.bottleTossQueue)){
      for(var b = 0; b < raw.bottleTossQueue.length && def.bottleTossQueue.length < MAX_BOTTLE_QUEUE; b++){
        var entry = raw.bottleTossQueue[b];
        if(typeof entry === 'string'){
          var txt = sanitizeText(entry, 160);
          if(txt) def.bottleTossQueue.push(txt);
        } else if(isPlainObject(entry)){
          var msg = sanitizeText(entry.text || entry.message, 160);
          if(msg){
            def.bottleTossQueue.push({
              id: sanitizeKey(typeof entry.id === 'string' ? entry.id : ('bottle-' + b)),
              text: msg,
              lang: sanitizeKey(typeof entry.lang === 'string' ? entry.lang : def.activeLanguage) || def.activeLanguage,
              ts: clampInt(entry.ts, 0, 9999999999999, Date.now())
            });
          }
        }
      }
    }

    def.festivalCount = clampInt(raw.festivalCount, 0, MAX_FESTIVAL_COUNT, 0);

    return def;
  }

  function resolveRuntimeProfileId(){
    if(!explicitProfile && typeof S !== 'undefined' && S && S.profile && typeof S.profile.id === 'string'){
      var sid = sanitizeKey(S.profile.id);
      if(sid) return sid;
    }
    return activeProfileId;
  }

  function ensureLoaded(){
    var pid = resolveRuntimeProfileId();
    if(cachedState && activeProfileId === pid) return cachedState;
    activeProfileId = pid;
    var raw = storageGet(STORAGE_PREFIX + pid);
    var parsed = safeParse(raw);
    cachedState = sanitizeState(parsed);
    return cachedState;
  }

  function notifyListeners(){
    for(var i = 0; i < listeners.length; i++){
      try { listeners[i](cachedState, activeProfileId); } catch(e){}
    }
  }

  function save(){
    var st = ensureLoaded();
    st = sanitizeState(st);
    cachedState = st;
    try {
      storageSet(STORAGE_PREFIX + activeProfileId, JSON.stringify(st));
    } catch(e){}
    notifyListeners();
    return st;
  }

  function resetForProfile(id, opts){
    var pid = sanitizeKey(typeof id === 'string' ? id : '') || 'default';
    activeProfileId = pid;
    explicitProfile = true;
    var key = STORAGE_PREFIX + pid;
    if(opts && opts.wipe){
      storageRemove(key);
      cachedState = createDefaultState();
    } else {
      var raw = storageGet(key);
      var parsed = safeParse(raw);
      cachedState = sanitizeState(parsed);
    }
    save();
    return cachedState;
  }

  function get(){
    return ensureLoaded();
  }

  function setCultureMode(mode){
    var st = ensureLoaded();
    if(typeof mode === 'string' && VALID_MODES[mode]){
      st.cultureMode = mode;
      save();
    }
    return st.cultureMode;
  }

  function setActiveLanguage(lang){
    var st = ensureLoaded();
    var clean = sanitizeKey(typeof lang === 'string' ? lang : '').toLowerCase();
    if(/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/.test(clean)){
      st.activeLanguage = clean;
      save();
    }
    return st.activeLanguage;
  }

  function getFriendship(id){
    var st = ensureLoaded();
    var rid = sanitizeKey(id);
    if(!rid || !Object.prototype.hasOwnProperty.call(st.friendships, rid)){
      return null;
    }
    return st.friendships[rid];
  }

  function addFriendshipXP(id, amt){
    var st = ensureLoaded();
    var rid = sanitizeKey(id);
    if(!rid) return null;
    if(!Object.prototype.hasOwnProperty.call(st.friendships, rid)){
      if(RESIDENT_IDS.indexOf(rid) === -1) return null;
      st.friendships[rid] = defaultFriendship();
    }
    var entry = st.friendships[rid];
    var delta = clampInt(amt, -MAX_XP, MAX_XP, 0);
    var prevHearts = entry.hearts;
    entry.xp = clampInt(entry.xp + delta, 0, MAX_XP, entry.xp);
    entry.hearts = clampInt(Math.max(entry.hearts, heartsForXP(entry.xp)), 0, 5, 0);
    if(entry.hearts >= 3) entry.unlockedStory = true;
    if(entry.hearts >= 5) entry.unlockedKeepsake = true;
    save();
    return {
      xp: entry.xp,
      hearts: entry.hearts,
      unlockedStory: entry.unlockedStory,
      unlockedKeepsake: entry.unlockedKeepsake,
      leveledUp: entry.hearts > prevHearts
    };
  }

  function unlockTrophy(id){
    var st = ensureLoaded();
    var tid = sanitizeKey(id);
    if(!tid) return false;
    if(st.trophies.indexOf(tid) !== -1) return false;
    if(st.trophies.length >= MAX_TROPHIES) return false;
    st.trophies.push(tid);
    save();
    return true;
  }

  function addPhoto(meta){
    var st = ensureLoaded();
    var src = isPlainObject(meta) ? meta : {};
    var photo = {
      id: sanitizeKey(typeof src.id === 'string' ? src.id : '') || ('photo-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
      region: sanitizeText(src.region, 48) || 'coral-cove',
      resident: sanitizeKey(typeof src.resident === 'string' ? src.resident : ''),
      caption: sanitizeText(src.caption, 140),
      ts: clampInt(src.ts, 0, 9999999999999, Date.now())
    };
    st.photos.unshift(photo);
    if(st.photos.length > MAX_PHOTOS){
      st.photos.length = MAX_PHOTOS;
    }
    save();
    return photo;
  }

  function grantItem(item, n){
    var st = ensureLoaded();
    var key = sanitizeKey(item);
    if(!VALID_BOK_ITEMS[key]) return 0;
    var count = clampInt(n == null ? 1 : n, 0, MAX_BOK_ITEM_QTY, 1);
    st.bokItems[key] = clampInt(st.bokItems[key] + count, 0, MAX_BOK_ITEM_QTY, 0);
    save();
    return st.bokItems[key];
  }

  function consumeItem(item){
    var st = ensureLoaded();
    var key = sanitizeKey(item);
    if(!VALID_BOK_ITEMS[key]) return false;
    if(st.bokItems[key] <= 0) return false;
    st.bokItems[key] -= 1;
    save();
    return true;
  }

  function unlockCosmetic(id){
    var st = ensureLoaded();
    var cid = sanitizeKey(id);
    if(!cid) return false;
    if(st.cosmetics.unlocked.indexOf(cid) !== -1) return false;
    if(st.cosmetics.unlocked.length >= MAX_COSMETICS_UNLOCKED) return false;
    st.cosmetics.unlocked.push(cid);
    save();
    return true;
  }

  function equipCosmetic(slot, id){
    var st = ensureLoaded();
    if(slot !== 'shellyHat' && slot !== 'kikoHat') return false;
    if(id === null || id === ''){
      st.cosmetics[slot] = null;
      save();
      return true;
    }
    var cid = sanitizeKey(id);
    if(!cid) return false;
    st.cosmetics[slot] = cid;
    save();
    return true;
  }

  function placeDecor(item){
    var st = ensureLoaded();
    if(!isPlainObject(item) || st.homeIsland.length >= MAX_HOME_ISLAND) return false;
    var id = sanitizeKey(typeof item.id === 'string' ? item.id : '');
    if(!id) return false;
    st.homeIsland.push({
      id: id,
      x: clampNum(item.x, -50, 50, 0),
      z: clampNum(item.z, -50, 50, 0),
      rot: clampNum(item.rot, -Math.PI * 2, Math.PI * 2, 0)
    });
    save();
    return true;
  }

  function removeDecor(index){
    var st = ensureLoaded();
    var idx = clampInt(index, 0, st.homeIsland.length - 1, -1);
    if(idx < 0 || idx >= st.homeIsland.length) return false;
    st.homeIsland.splice(idx, 1);
    save();
    return true;
  }

  function setBuddy(id, turnsLeft){
    var st = ensureLoaded();
    if(!id){
      st.buddy = null;
      save();
      return null;
    }
    var bid = sanitizeKey(id);
    var turns = clampInt(turnsLeft == null ? 3 : turnsLeft, 0, 99, 3);
    st.buddy = (bid && turns > 0) ? { id: bid, turnsLeft: turns } : null;
    save();
    return st.buddy;
  }

  function tickBuddyTurn(){
    var st = ensureLoaded();
    if(!st.buddy) return null;
    st.buddy.turnsLeft = Math.max(0, st.buddy.turnsLeft - 1);
    if(st.buddy.turnsLeft === 0) st.buddy = null;
    save();
    return st.buddy;
  }

  function startErrand(id, parcel){
    var st = ensureLoaded();
    var eid = sanitizeKey(id);
    if(!eid) return null;
    st.errands.activeId = eid;
    st.errands.step = 1;
    st.errands.carriedParcel = parcel ? sanitizeKey(parcel) : null;
    save();
    return st.errands;
  }

  function advanceErrand(step, parcel){
    var st = ensureLoaded();
    if(!st.errands.activeId) return null;
    st.errands.step = clampInt(step == null ? st.errands.step + 1 : step, 0, 99, st.errands.step);
    if(parcel !== undefined){
      st.errands.carriedParcel = parcel ? sanitizeKey(parcel) : null;
    }
    save();
    return st.errands;
  }

  function completeErrand(id){
    var st = ensureLoaded();
    var eid = sanitizeKey(id || st.errands.activeId);
    if(!eid) return false;
    if(st.errands.completed.indexOf(eid) === -1 && st.errands.completed.length < MAX_ERRANDS_COMPLETED){
      st.errands.completed.push(eid);
    }
    if(st.errands.activeId === eid){
      st.errands.activeId = null;
      st.errands.step = 0;
      st.errands.carriedParcel = null;
    }
    save();
    return true;
  }

  function unlockGachapon(id){
    var st = ensureLoaded();
    var gid = sanitizeKey(id);
    if(!gid) return false;
    if(st.gachaponCollection.indexOf(gid) !== -1) return false;
    if(st.gachaponCollection.length >= MAX_GACHAPON) return false;
    st.gachaponCollection.push(gid);
    save();
    return true;
  }

  function setLighthouseWeather(weather){
    var st = ensureLoaded();
    if(typeof weather === 'string' && VALID_WEATHER[weather]){
      st.lighthouseWeather = weather;
      save();
    }
    return st.lighthouseWeather;
  }

  function setPatternStreak(n){
    var st = ensureLoaded();
    st.patternStreak = clampInt(n, 0, MAX_STREAK, st.patternStreak);
    save();
    return st.patternStreak;
  }

  function setTidePhase(phase){
    var st = ensureLoaded();
    if(typeof phase === 'string' && VALID_TIDES[phase]){
      st.tidePhase = phase;
      save();
    }
    return st.tidePhase;
  }

  function enqueueBottle(note){
    var st = ensureLoaded();
    if(st.bottleTossQueue.length >= MAX_BOTTLE_QUEUE) return false;
    if(typeof note === 'string'){
      var clean = sanitizeText(note, 160);
      if(!clean) return false;
      st.bottleTossQueue.push(clean);
    } else if(isPlainObject(note)){
      var msg = sanitizeText(note.text || note.message, 160);
      if(!msg) return false;
      st.bottleTossQueue.push({
        id: sanitizeKey(typeof note.id === 'string' ? note.id : '') || ('bottle-' + Date.now()),
        text: msg,
        lang: sanitizeKey(typeof note.lang === 'string' ? note.lang : st.activeLanguage) || st.activeLanguage,
        ts: clampInt(note.ts, 0, 9999999999999, Date.now())
      });
    } else {
      return false;
    }
    save();
    return true;
  }

  function dequeueBottle(){
    var st = ensureLoaded();
    if(!st.bottleTossQueue.length) return null;
    var item = st.bottleTossQueue.shift();
    save();
    return item;
  }

  function incrementFestivalCount(){
    var st = ensureLoaded();
    st.festivalCount = clampInt(st.festivalCount + 1, 0, MAX_FESTIVAL_COUNT, st.festivalCount);
    save();
    return st.festivalCount;
  }

  function subscribe(fn){
    if(typeof fn === 'function' && listeners.indexOf(fn) === -1){
      listeners.push(fn);
    }
  }

  function unsubscribe(fn){
    var idx = listeners.indexOf(fn);
    if(idx !== -1) listeners.splice(idx, 1);
  }

  root.WorldState = {
    RESIDENT_IDS: RESIDENT_IDS.slice(),
    HEART_XP_THRESHOLDS: HEART_XP_THRESHOLDS.slice(),
    resetForProfile: resetForProfile,
    get: get,
    save: save,
    setCultureMode: setCultureMode,
    setActiveLanguage: setActiveLanguage,
    getFriendship: getFriendship,
    addFriendshipXP: addFriendshipXP,
    unlockTrophy: unlockTrophy,
    addPhoto: addPhoto,
    grantItem: grantItem,
    consumeItem: consumeItem,
    unlockCosmetic: unlockCosmetic,
    equipCosmetic: equipCosmetic,
    placeDecor: placeDecor,
    removeDecor: removeDecor,
    setBuddy: setBuddy,
    tickBuddyTurn: tickBuddyTurn,
    startErrand: startErrand,
    advanceErrand: advanceErrand,
    completeErrand: completeErrand,
    unlockGachapon: unlockGachapon,
    setLighthouseWeather: setLighthouseWeather,
    setPatternStreak: setPatternStreak,
    setTidePhase: setTidePhase,
    enqueueBottle: enqueueBottle,
    dequeueBottle: dequeueBottle,
    incrementFestivalCount: incrementFestivalCount,
    subscribe: subscribe,
    unsubscribe: unsubscribe
  };
})();
