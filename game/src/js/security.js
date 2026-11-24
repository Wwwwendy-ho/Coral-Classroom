  /* ---------- Security utilities: URL validation, prototype-pollution-safe JSON, constant-time compare,
     and strict backup / import bounds. Loaded first inside the app IIFE. ---------- */
  var COVE_MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  var COVE_MAX_BACKUP_KEYS = 200;
  var COVE_MAX_ANKI_BYTES = 2 * 1024 * 1024;
  var COVE_MAX_ANKI_CARDS = 5000;
  var COVE_MAX_PHOTO_DATA_BYTES = 2.5 * 1024 * 1024;
  var COVE_MAX_NESTING_DEPTH = 16;
  var COVE_GATE_LOCK_KEY = 'cc-gate-lock';

  function stripControlChars(s){
    return String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  var SAFE_HTML_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
    lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D'
  };

  function safePlainText(str){
    var s = String(str == null ? '' : str);
    for(var pass = 0; pass < 8; pass++){
      var prev = s;
      s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ');
      s = s.replace(/<!--[\s\S]*?(?:-->|$)/g, ' ');
      s = s.replace(/<\/?[a-zA-Z!?](?:[^<>"']|"[^"]*"|'[^']*')*>/g, ' ');
      s = s.replace(/<(?:\/|!|\?|[a-zA-Z]+[\s/][^>]*=)[^>]*$/g, '');
      if(s === prev) break;
    }
    s = s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g, function(m, dec, hex, name){
      if(dec != null || hex != null){
        var cp = parseInt(dec != null ? dec : hex, dec != null ? 10 : 16);
        if(!isFinite(cp) || cp < 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return '';
        if(cp === 9 || cp === 10 || cp === 13) return ' ';
        if(cp < 32 || cp === 127) return '';
        return typeof String.fromCodePoint === 'function' ? String.fromCodePoint(cp) : String.fromCharCode(cp);
      }
      var low = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(SAFE_HTML_ENTITIES, low) ? SAFE_HTML_ENTITIES[low] : m;
    });
    return stripControlChars(s).replace(/\s+/g, ' ').trim();
  }

  function safePhotoUrl(url){
    if(typeof url !== 'string') return '';
    var s = url.trim();
    if(!s || /[\x00-\x1F\x7F\s]/.test(s)) return '';
    if(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(s)){
      return s.length <= COVE_MAX_PHOTO_DATA_BYTES ? s : '';
    }
    if(/^(?:vocab-pics|friend-pics|assets)\/[A-Za-z0-9._\/-]+\.(?:png|jpe?g|webp|gif)$/i.test(s)){
      return s.indexOf('..') === -1 && s.indexOf('//') === -1 && s.indexOf('/.') === -1 ? s : '';
    }
    if(/^blob:/i.test(s)){
      try {
        if(typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null'){
          return new URL(s).origin === window.location.origin ? s : '';
        }
      } catch(e){}
      return '';
    }
    return '';
  }

  function safeProxyUrl(url){
    if(typeof url !== 'string') return '';
    var s = url.trim();
    if(!s || /[\x00-\x1F\x7F\s]/.test(s)) return '';
    try {
      var u = new URL(s);
      if(u.username || u.password || !u.hostname) return '';
      if(u.protocol === 'https:') return u.href;
      if(u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return u.href;
    } catch(e){}
    return '';
  }

  function safeJsonReviver(key, value){
    if(key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    return value;
  }

  function safeJsonParse(raw, fallback){
    if(typeof raw !== 'string' || !raw) return fallback;
    try { return JSON.parse(raw, safeJsonReviver); }
    catch(e){ return fallback; }
  }

  function jsonDepthExceeds(val, maxDepth, depth){
    depth = depth || 0;
    if(depth > maxDepth) return true;
    if(val == null || typeof val !== 'object') return false;
    if(Array.isArray(val)){
      for(var i = 0; i < val.length; i++){
        if(jsonDepthExceeds(val[i], maxDepth, depth + 1)) return true;
      }
      return false;
    }
    var keys = Object.keys(val);
    for(var j = 0; j < keys.length; j++){
      if(jsonDepthExceeds(val[keys[j]], maxDepth, depth + 1)) return true;
    }
    return false;
  }

  function sanitizePlainData(val, depth){
    depth = depth || 0;
    if(depth > COVE_MAX_NESTING_DEPTH || val == null) return val == null ? null : undefined;
    var t = typeof val;
    if(t === 'string' || t === 'number' || t === 'boolean') return val;
    if(Array.isArray(val)){
      var arr = [];
      for(var i = 0; i < val.length; i++){
        var v = sanitizePlainData(val[i], depth + 1);
        arr.push(v === undefined ? null : v);
      }
      return arr;
    }
    if(t === 'object'){
      var out = {};
      var keys = Object.keys(val);
      for(var j = 0; j < keys.length; j++){
        var k = keys[j];
        if(k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        var sv = sanitizePlainData(val[k], depth + 1);
        if(sv !== undefined){
          if(k === 'photoUrl' && typeof sv === 'string') sv = safePhotoUrl(sv);
          else if(k === 'proxyUrl' && typeof sv === 'string') sv = safeProxyUrl(sv);
          out[k] = sv;
        }
      }
      return out;
    }
    return undefined;
  }

  function timingSafeEqual(a, b){
    if(typeof a !== 'string' || typeof b !== 'string') return false;
    var len = Math.max(a.length, b.length);
    var diff = a.length ^ b.length;
    for(var i = 0; i < len; i++){
      diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diff === 0;
  }

  function sha256Hex(text){
    if(typeof window === 'undefined' || !window.crypto || !window.crypto.subtle || typeof TextEncoder !== 'function'){
      return Promise.reject(new Error('SHA-256 unavailable'));
    }
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(n){ return ('0' + n.toString(16)).slice(-2); }).join('');
    });
  }

  function isAllowedStorageKey(key){
    if(typeof key !== 'string' || !key.length || key.length > 128) return false;
    if(key === COVE_GATE_LOCK_KEY) return false;
    if(key === 'coral-lib-settings' || /^coral-lib:[A-Za-z0-9._-]+$/.test(key)){
      return !/(?:__proto__|constructor|prototype)/.test(key);
    }
    return /^(?:coralClassroom\.|cc-|coralCove|reef[A-Z_]|cove[A-Z_])/.test(key);
  }

  function isSafeAssetFilename(name, extRe){
    if(typeof name !== 'string' || !name || name.length > 128) return false;
    if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || name.indexOf('..') !== -1) return false;
    if(extRe && !extRe.test(name)) return false;
    return true;
  }

  function canonicalItemsJson(items){
    var sorted = {};
    Object.keys(items).sort().forEach(function(k){ sorted[k] = items[k]; });
    return JSON.stringify(sorted);
  }

  function validateBackupPayload(rawText){
    if(typeof rawText !== 'string' || !rawText) return { ok:false, reason:'Empty backup file.' };
    if(rawText.length > COVE_MAX_BACKUP_BYTES) return { ok:false, reason:'Backup file is too large.' };
    var b = safeJsonParse(rawText, null);
    if(!b || typeof b !== 'object' || Array.isArray(b)) return { ok:false, reason:'Invalid backup format.' };
    var kind = typeof COVE_BACKUP_KIND === 'string' ? COVE_BACKUP_KIND : 'coral-classroom-backup';
    if(b.kind !== kind || !b.items || typeof b.items !== 'object' || Array.isArray(b.items)){
      return { ok:false, reason:'That file isn\'t a Coral Classroom backup.' };
    }
    if(jsonDepthExceeds(b, COVE_MAX_NESTING_DEPTH, 0)){
      return { ok:false, reason:'Backup data is nested too deeply.' };
    }
    var keys = Object.keys(b.items);
    if(keys.length > COVE_MAX_BACKUP_KEYS) return { ok:false, reason:'Backup contains too many entries.' };
    var cleanItems = {};
    for(var i = 0; i < keys.length; i++){
      var k = keys[i];
      if(!isAllowedStorageKey(k)) return { ok:false, reason:'Backup contains an unrecognized storage key.' };
      var v = b.items[k];
      if(typeof v !== 'string') return { ok:false, reason:'Backup contains an invalid entry.' };
      var trimmed = v.trim();
      var isLibKey = k === 'coral-lib-settings' || k.indexOf('coral-lib:') === 0;
      if(isLibKey || (trimmed && (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '['))){
        var parsed = safeJsonParse(v, undefined);
        if(parsed === undefined) return { ok:false, reason:'Backup contains malformed JSON data.' };
        if(isLibKey && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))){
          return { ok:false, reason:'Backup contains invalid Library data.' };
        }
        if(jsonDepthExceeds(parsed, COVE_MAX_NESTING_DEPTH, 0)){
          return { ok:false, reason:'Backup data is nested too deeply.' };
        }
        var sanitized = sanitizePlainData(parsed, 0);
        if(sanitized === undefined) return { ok:false, reason:'Backup contains invalid data.' };
        v = JSON.stringify(sanitized);
      }
      cleanItems[k] = v;
    }
    return {
      ok: true,
      items: cleanItems,
      savedAt: b.savedAt || null,
      digest: typeof b.digest === 'string' ? b.digest : null,
      rawItemsJson: canonicalItemsJson(b.items)
    };
  }

  function reefGateBackoffSecs(fails){
    var nf = Math.floor(Number(fails) || 0);
    return nf >= 5 ? Math.min(300, 15 * Math.pow(2, Math.min(nf - 5, 10))) : 0;
  }

  function reefGateReadLock(){
    try {
      if(typeof localStorage === 'undefined') return { fails:0, until:0 };
      var o = safeJsonParse(localStorage.getItem(COVE_GATE_LOCK_KEY), null);
      return o && typeof o.fails === 'number' && isFinite(o.fails) && o.fails >= 0 &&
        typeof o.until === 'number' && isFinite(o.until) && o.until >= 0
        ? { fails: Math.floor(o.fails), until: o.until }
        : { fails:0, until:0 };
    } catch(e){ return { fails:0, until:0 }; }
  }

  function reefGateWriteLock(o){
    try {
      if(typeof localStorage !== 'undefined'){
        localStorage.setItem(COVE_GATE_LOCK_KEY, JSON.stringify({ fails: Math.max(0, Math.floor(o.fails || 0)), until: Math.max(0, Number(o.until) || 0) }));
      }
    } catch(e){}
  }

  function reefGateCheckLock(now){
    var t = typeof now === 'number' ? now : Date.now();
    var lk = reefGateReadLock();
    var locked = lk.until > t;
    return {
      locked: locked,
      waitSecs: locked ? Math.ceil((lk.until - t) / 1000) : 0,
      fails: lk.fails,
      until: lk.until
    };
  }

  function reefGateRecordFailure(now){
    var t = typeof now === 'number' ? now : Date.now();
    var lk = reefGateReadLock();
    var nf = lk.fails + 1;
    var secs = reefGateBackoffSecs(nf);
    var until = secs ? t + secs * 1000 : 0;
    reefGateWriteLock({ fails: nf, until: until });
    return { fails: nf, secs: secs, until: until };
  }

  function reefGateResetLock(){
    reefGateWriteLock({ fails:0, until:0 });
  }

  if(typeof window !== 'undefined'){
    window.CoralCoveSecurity = {
      safePlainText: safePlainText,
      safePhotoUrl: safePhotoUrl,
      safeProxyUrl: safeProxyUrl,
      safeJsonParse: safeJsonParse,
      sanitizePlainData: sanitizePlainData,
      isAllowedStorageKey: isAllowedStorageKey,
      isSafeAssetFilename: isSafeAssetFilename,
      validateBackupPayload: validateBackupPayload,
      timingSafeEqual: timingSafeEqual,
      sha256Hex: sha256Hex,
      canonicalItemsJson: canonicalItemsJson
    };
    window.CoralCoveGate = {
      checkLock: reefGateCheckLock,
      recordFailure: reefGateRecordFailure,
      resetLock: reefGateResetLock,
      backoffSecs: reefGateBackoffSecs
    };
  }
