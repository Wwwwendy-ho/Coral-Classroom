  /* ---------- Security utilities: URL validation, prototype-pollution-safe JSON, constant-time compare,
     and strict backup / import bounds. Loaded first inside the app IIFE. ---------- */
  var COVE_MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  var COVE_MAX_BACKUP_KEYS = 200;
  var COVE_MAX_ANKI_BYTES = 2 * 1024 * 1024;
  var COVE_MAX_ANKI_CARDS = 5000;
  var COVE_MAX_PHOTO_DATA_BYTES = 2.5 * 1024 * 1024;

  function stripControlChars(s){
    return String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  function safePhotoUrl(url){
    if(typeof url !== 'string') return '';
    var s = url.trim();
    if(!s || /[\x00-\x1F\x7F\s]/.test(s)) return '';
    if(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(s)){
      return s.length <= COVE_MAX_PHOTO_DATA_BYTES ? s : '';
    }
    if(/^(?:vocab-pics|friend-pics|assets)\/[A-Za-z0-9._\/-]+\.(?:png|jpe?g|webp|gif)$/i.test(s)){
      return s.indexOf('..') === -1 ? s : '';
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

  function safeJsonReviver(key, value){
    if(key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    return value;
  }

  function safeJsonParse(raw, fallback){
    if(typeof raw !== 'string' || !raw) return fallback;
    try { return JSON.parse(raw, safeJsonReviver); }
    catch(e){ return fallback; }
  }

  function sanitizePlainData(val, depth){
    depth = depth || 0;
    if(depth > 16 || val == null) return val == null ? null : undefined;
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
    return typeof key === 'string' && key.length > 0 && key.length <= 128 &&
      /^(?:coralClassroom\.|cc-|coralCove|reef[A-Z_]|cove[A-Z_])/.test(key);
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
    var keys = Object.keys(b.items);
    if(keys.length > COVE_MAX_BACKUP_KEYS) return { ok:false, reason:'Backup contains too many entries.' };
    var cleanItems = {};
    for(var i = 0; i < keys.length; i++){
      var k = keys[i];
      if(!isAllowedStorageKey(k)) return { ok:false, reason:'Backup contains an unrecognized storage key.' };
      var v = b.items[k];
      if(typeof v !== 'string') return { ok:false, reason:'Backup contains an invalid entry.' };
      var trimmed = v.trim();
      if(trimmed && (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[')){
        var parsed = safeJsonParse(v, undefined);
        if(parsed !== undefined){
          v = JSON.stringify(sanitizePlainData(parsed, 0));
        }
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
