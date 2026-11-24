  /* ---------- LEARNER MODEL: what this person knows, and in which way ----------
     A deck's scheduler (learning.js) tracks cards. This tracks the words and sentences themselves, across every
     deck and card type, in five separate ways of knowing them, because hearing a word, reading it, recalling it
     from English, saying it and using it in a sentence are different skills that grow at different speeds:
       hear    recognize it when heard          read    recognize it when read
       recall  produce it from the English      say     say it out loud
       use     use it in a sentence
     Each (item, channel) pair has its own FSRS memory (fsrs.js). For now this only records alongside the deck
     scheduler, which still decides what a round shows; later features (the Daily Plan, the sea map) can read
     it to pick the weakest skill.
     Saved per profile in localStorage as cc-learner-<profile id>:
       { v:1, items:{ <key>:{ text, lang, ch:{ <channel>:{ s, d, due, last, reps, lapses } } } } }
     where key is the normalized text (see learnerKey), s and d are FSRS stability (days) and difficulty, and due
     and last are times in ms. Everything stays on the device. */
  var LEARNER_CHANNELS = ['hear', 'read', 'recall', 'say', 'use'];
  var LEARNER_KNOWN_DAYS = 21;     // a memory that lasts three weeks counts as known
  var LEARNER_AGAIN_MS = 10 * 60e3;  // a missed word comes back in ten minutes, like a learning step
  var LEARNER_GRADES = { again: 1, hard: 2, good: 3, easy: 4 };
  var learnerData = null, learnerPid, learnerSaveT = null;
  var learnerEvents = null, learnerEventPid = null;
  var LEARNER_MAX_EVENTS = 2000;

  // "  Hello,  World! " and "hello world" are the same item
  function learnerKey(text){
    return String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ')
      .replace(/^[\s"'“”‘’«»「」『』(（\[]+/, '').replace(/[\s.,!?;:…。！？、，．"'“”‘’«»「」『』)）\]~-]+$/, '');
  }
  function learnerHasHangul(text){ return /[ᄀ-ᇿ㄰-㆏가-힯]/.test(String(text || '')); }
  function learnerLang(text){
    if(learnerHasHangul(text)) return 'ko';
    if(/[㐀-鿿豈-﫿]/.test(String(text || ''))) return 'zh';
    return 'en';
  }

  // The model for whoever is signed in, loaded when first needed and again after a profile switch. With no
  // profile (the picker), changes stay in memory only.
  function learnerStoreKey(pid){ return 'cc-learner-' + pid; }
  function learnerEventKey(pid){ return 'cc-events-' + pid; }
  function learnerEventLog(){
    var pid = S.profile && S.profile.id ? S.profile.id : null;
    if(learnerEvents && learnerEventPid === pid) return learnerEvents;
    learnerEventPid = pid; learnerEvents = null;
    if(pid){
      try {
        var raw = localStorage.getItem(learnerEventKey(pid));
        var got = typeof safeJsonParse === 'function' ? safeJsonParse(raw, null) : (raw ? JSON.parse(raw) : null);
        if(got && got.v === 1 && Array.isArray(got.list)) learnerEvents = got;
      } catch(e){}
    }
    if(!learnerEvents) learnerEvents = { v: 1, list: [] };
    return learnerEvents;
  }
  function learnerModel(){
    var pid = S.profile && S.profile.id ? S.profile.id : null;
    if(learnerData && learnerPid === pid) return learnerData;
    learnerFlush();
    learnerPid = pid; learnerData = null;
    if(pid){
      try {
        var raw = localStorage.getItem(learnerStoreKey(pid));
        var got = typeof safeJsonParse === 'function' ? safeJsonParse(raw, null) : (raw ? JSON.parse(raw) : null);
        if(got && got.v === 1 && got.items && typeof got.items === 'object') learnerData = got;
      } catch(e){}
    }
    if(!learnerData) learnerData = { v: 1, items: {} };
    return learnerData;
  }
  // A round answers a card every few seconds, so saves wait a moment and go out together.
  function learnerSaveSoon(){
    clearTimeout(learnerSaveT);
    learnerSaveT = setTimeout(learnerFlush, 1500);
  }
  function learnerFlush(){
    clearTimeout(learnerSaveT); learnerSaveT = null;
    if(learnerData && learnerPid && learnerData.dirty){
      delete learnerData.dirty;
      try { localStorage.setItem(learnerStoreKey(learnerPid), JSON.stringify(learnerData)); } catch(e){ learnerData.dirty = true; }
    }
    if(learnerEvents && learnerEventPid && learnerEvents.dirty){
      delete learnerEvents.dirty;
      try { localStorage.setItem(learnerEventKey(learnerEventPid), JSON.stringify(learnerEvents)); } catch(e){ learnerEvents.dirty = true; }
    }
  }
  // iOS can close a Home Screen app without warning; pagehide is the last moment it reliably tells us.
  window.addEventListener('pagehide', learnerFlush);

  function learnerGrade(grade){
    if(grade === true) return 3;
    if(grade === false) return 1;
    if(typeof grade === 'string') return LEARNER_GRADES[grade] || 0;
    var g = Math.round(+grade);
    return g >= 1 && g <= 4 ? g : 0;
  }
  function learnerRecall(c, now){ return c && c.s ? fsrsR((now - (c.last || now)) / 864e5, c.s) : null; }

  var Learner = {
    channels: LEARNER_CHANNELS.slice(),
    // One answer: grade 1–4 (again, hard, good, easy), true (good) or false (again). opts.now sets the time
    // (for tests). Returns the channel's new memory, or null when nothing was recorded.
    record: function(text, channel, grade, opts){
      var key = learnerKey(text), g = learnerGrade(grade);
      if(!key || LEARNER_CHANNELS.indexOf(channel) < 0 || !g) return null;
      var now = opts && opts.now != null ? +opts.now : Date.now();
      var m = learnerModel();
      var it = m.items[key] || (m.items[key] = { text: String(text).trim(), lang: learnerLang(text), ch: {} });
      var c = it.ch[channel] || { s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0 };
      var lapsed = g === 1 && c.reps > 0;
      var next = fsrsReview(c.reps ? c : null, g, now);
      c.s = next.s; c.d = next.d; c.last = now; c.reps += 1;
      if(lapsed) c.lapses += 1;
      c.due = next.ivl ? now + next.ivl * 864e5 : now + LEARNER_AGAIN_MS;
      it.ch[channel] = c;
      m.dirty = true;
      var ev = learnerEventLog();
      ev.list.push({ ts: now, k: key.slice(0, 80), ch: channel, g: g, ms: opts && opts.ms != null ? Math.round(+opts.ms) : 0, m: opts && opts.mode ? String(opts.mode).slice(0, 16) : '' });
      if(ev.list.length > LEARNER_MAX_EVENTS) ev.list = ev.list.slice(-LEARNER_MAX_EVENTS);
      ev.dirty = true;
      learnerSaveSoon();
      return { s: c.s, d: c.d, due: c.due, last: c.last, reps: c.reps, lapses: c.lapses };
    },
    // Everything known about one item (a copy), or null
    item: function(text){
      var it = learnerModel().items[learnerKey(text)];
      return it ? JSON.parse(JSON.stringify(it)) : null;
    },
    // Chance (0–1) of recalling the item in that channel right now; null if never practiced that way
    retrievability: function(text, channel, now){
      var it = learnerModel().items[learnerKey(text)];
      return it ? learnerRecall(it.ch[channel], now || Date.now()) : null;
    },
    // Items ready for review, one entry per item and channel, soonest first. channel narrows it to one skill.
    due: function(now, channel){
      now = now || Date.now();
      var out = [], items = learnerModel().items;
      Object.keys(items).forEach(function(k){
        var it = items[k];
        Object.keys(it.ch).forEach(function(ch){
          if(channel && ch !== channel) return;
          var c = it.ch[ch];
          if(c.due <= now) out.push({ key: k, text: it.text, lang: it.lang, channel: ch, due: c.due });
        });
      });
      return out.sort(function(a, b){ return a.due - b.due; });
    },
    // The skill this item is shakiest in today, among the ones it has been practiced in (null if none)
    weakest: function(text, now){
      var it = learnerModel().items[learnerKey(text)];
      if(!it) return null;
      now = now || Date.now();
      var best = null, low = 2;
      LEARNER_CHANNELS.forEach(function(ch){
        var r = learnerRecall(it.ch[ch], now);
        if(r != null && r < low){ low = r; best = ch; }
      });
      return best;
    },
    // Per channel: new (an item the model holds but never practiced this way), learning, known (lasts 21+ days)
    summary: function(){
      var out = { items: 0 }, items = learnerModel().items;
      LEARNER_CHANNELS.forEach(function(ch){ out[ch] = { new: 0, learning: 0, known: 0 }; });
      Object.keys(items).forEach(function(k){
        out.items += 1;
        LEARNER_CHANNELS.forEach(function(ch){
          var c = items[k].ch[ch];
          if(!c || !c.reps) out[ch].new += 1;
          else if(c.s >= LEARNER_KNOWN_DAYS) out[ch].known += 1;
          else out[ch].learning += 1;
        });
      });
      return out;
    },
    events: function(limit){
      var list = learnerEventLog().list;
      return limit ? list.slice(-limit) : list.slice();
    },
    regionFocus: function(now){
      now = now || Date.now();
      var byCh = { hear:0, read:0, recall:0, say:0, use:0 };
      var items = learnerModel().items;
      Object.keys(items).forEach(function(k){
        var it = items[k];
        LEARNER_CHANNELS.forEach(function(ch){
          var c = it.ch[ch];
          if(!c || !c.reps) return;
          var r = learnerRecall(c, now);
          if(c.due <= now || (r != null && r < 0.85)) byCh[ch] += 1;
        });
      });
      var dueByRegion = {
        lagoon: byCh.read + byCh.hear,
        caves: byCh.say + byCh.hear,
        reef: byCh.use,
        beach: byCh.recall + byCh.use,
        town: byCh.hear + byCh.use,
        cove: byCh.hear + byCh.read + byCh.recall + byCh.say + byCh.use
      };
      var weakestChannel = null, maxCh = 0;
      LEARNER_CHANNELS.forEach(function(ch){ if(byCh[ch] > maxCh){ maxCh = byCh[ch]; weakestChannel = ch; } });
      var recommended = null, maxReg = 0;
      ['caves', 'reef', 'beach', 'lagoon', 'town'].forEach(function(reg){
        if(dueByRegion[reg] > maxReg){ maxReg = dueByRegion[reg]; recommended = reg; }
      });
      return { byChannel: byCh, dueByRegion: dueByRegion, weakestChannel: weakestChannel, recommended: recommended };
    }
  };

  /* ---------- Korean Hangul Jamo Diagnostics: specific phonetic/batchim feedback ---------- */
  var KO_CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var KO_JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var KO_JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var KO_CONS_GROUPS = ['ㄱㅋㄲ','ㄷㅌㄸ','ㅂㅍㅃ','ㅈㅊㅉ','ㅅㅆ'];
  var KO_VOWEL_GROUPS = ['ㅓㅗ','ㅐㅔ','ㅜㅡ','ㅕㅛ','ㅏㅓ'];
  function koDecompose(str){
    var out = [];
    for(var i = 0; i < str.length; i++){
      var code = str.charCodeAt(i);
      if(code >= 0xAC00 && code <= 0xD7A3){
        var s = code - 0xAC00;
        var jong = s % 28, jung = ((s - jong) / 28) % 21, cho = Math.floor(s / 588);
        out.push({ c: KO_CHO[cho], v: KO_JUNG[jung], b: KO_JONG[jong] });
      }
    }
    return out;
  }
  function koSameGroup(a, b, groups){
    return a !== b && groups.some(function(g){ return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
  }
  function koJamoDiag(expected, actual){
    var e = koDecompose(String(expected || '').normalize('NFC'));
    var a = koDecompose(String(actual || '').normalize('NFC'));
    if(!e.length || !a.length || Math.abs(e.length - a.length) > 1) return null;
    var n = Math.min(e.length, a.length), diffs = 0, consHint = false, vowelHint = false, batchimHint = false;
    for(var i = 0; i < n; i++){
      if(e[i].c !== a[i].c){ diffs++; if(koSameGroup(e[i].c, a[i].c, KO_CONS_GROUPS)) consHint = true; }
      if(e[i].v !== a[i].v){ diffs++; if(koSameGroup(e[i].v, a[i].v, KO_VOWEL_GROUPS)) vowelHint = true; }
      if(e[i].b !== a[i].b){ diffs++; batchimHint = true; }
    }
    if(diffs === 0 || diffs > 3) return null;
    if(consHint) return 'Close! Watch the consonant sound (plain vs. strong/tense).';
    if(vowelHint) return 'Almost! Double-check the vowel shape (e.g. ㅓ vs ㅗ / ㅐ vs ㅔ).';
    if(batchimHint) return 'So close! Check the bottom consonant (받침) on that syllable.';
    return null;
  }
  if(typeof window !== 'undefined') window.koJamoDiag = koJamoDiag;

  // Called by commitGrade() for every answered study card, before the card's round state is cleared. Records
  // the Korean side of the card in the channel the card type practices:
  //   listen → hear · echo → say · build, blank → use
  //   every other type → read when the question shown is Korean, recall when it's English (or Chinese) and the
  //   answer is Korean
  // Only cards with Hangul count for now: the language course is Korean first.
  function learnerNoteAnswer(card, mode, rating){
    try {
      var front = String(card.front || '').trim(), back = String(card.back || '').trim();
      var ko = learnerHasHangul(front) ? front : (learnerHasHangul(back) ? back : '');
      if(!ko) return;
      var channel, prompt = front;
      if(mode === 'listen') channel = 'hear';
      else if(mode === 'echo') channel = 'say';
      else if(mode === 'build') channel = 'use';
      else if(mode === 'blank'){
        // The word that goes in the blank is what's being used; a blank sentence with an English answer counts
        // as the whole sentence, filled in.
        channel = 'use';
        ko = learnerHasHangul(back) ? back : front.replace('___', back);
      } else {
        if(mode === 'timedchoice' && S.timedChoiceState && S.timedChoiceState.cardId === card.id) prompt = S.timedChoiceState.prompt;
        else if(mode === 'hanja' && S.hanjaState && S.hanjaState.dir === 'zh2ko') prompt = hanjaZh(card);
        else if(mode === 'numsys') prompt = back;
        channel = learnerHasHangul(prompt) ? 'read' : 'recall';
      }
      Learner.record(ko, channel, rating);
    } catch(e){}
  }
