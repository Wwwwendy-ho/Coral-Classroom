  /* ---------- MY WORDS: the profile's own Korean word list, practiced in its weakest way ----------
     A list that fills itself, for profiles with a language course (reefCourseOn):
       missed  every Korean card answered "again", in any deck (commitGrade → myWordsNoteAnswer)
       asked   Korean words and phrases looked up in Ask Shelly (askGo → myWordsNoteAsk)
       shaky   words the learner model (learner.js) holds whose weakest skill has faded below MW_WEAK_R
     Each entry keeps the Korean and an English meaning: the card's other side, or else the offline Korean
     dictionary Ask Shelly answers from (the profile's own cards, KO_MORE, KO_WORDS, KO_FORMS in reef.js). A word
     with no meaning anywhere is left out, since a card needs two sides.
     The list is saved in the Word Bank's own record (store getWordBank / setWordBank, beside its "I know this"
     marks) as mine: { <learnerKey>: { ko, en, from, at, seen } }, where at is when it was added (or missed or
     looked up again) and seen when it was last practiced here. The Word Bank screen shows it under "Mine".
     On the board it is a "My words" deck tile, shown only while something on the list is due: a word just
     added is due at once, and after that a word is due when the learner model says one of its skills is.
     A round asks each word in the skill it's shakiest in (Learner.weakest), using the ordinary card modes, so
     answers go through commitGrade and the learner model hears them like any other card. Nothing here touches a
     deck's own SM-2 or Leitner schedule: the cards are made on the spot and never saved. */
  var MW_ID = 'cc-my-words';
  var MW_DECK = { id: MW_ID, name: 'My words', emoji: '말', subject: 'korean', myWords: true };
  var MW_MAX = 300;          // the list keeps its newest 300 words
  var MW_WEAK_R = 0.7;       // a skill this likely to be forgotten (FSRS recall chance) counts as shaky
  var MW_ROUND = 10;
  var MW_SCAN_MS = 5 * 60e3; // the shaky-word scan runs at most every five minutes
  var MW = { pid: null, doc: null, loading: null, meanings: {}, scanAt: 0 };

  function myWordsPid(){ return S.profile && S.profile.id || null; }
  // The Word Bank record for whoever is signed in, loaded once per profile. Resolves to the record (or null
  // when no profile is open or the store can't read it).
  function myWordsLoad(){
    var pid = myWordsPid();
    if(!pid || !S.store) return Promise.resolve(null);
    if(MW.pid === pid && MW.loading) return MW.loading;
    MW.pid = pid; MW.doc = null; MW.meanings = {}; MW.scanAt = 0;
    var get = S.store.getWordBank ? S.store.getWordBank().catch(function(){ return null; }) : Promise.resolve(null);
    MW.loading = Promise.resolve(get).then(function(doc){
      if(MW.pid !== pid) return null;
      MW.doc = Object.assign({}, doc || {});
      MW.doc.mine = Object.assign({}, MW.doc.mine || {});
      return MW.doc;
    });
    return MW.loading;
  }
  // Saves the record with these fields changed. The Word Bank's marks and this list share it, so every save
  // starts from the whole record and neither erases the other.
  function wbDocSave(patch){
    var pid = myWordsPid();
    return myWordsLoad().then(function(doc){
      if(!doc || MW.pid !== pid || myWordsPid() !== pid || !S.store.setWordBank) return;
      Object.assign(doc, patch || {}, { updatedAt: Date.now() });
      return S.store.setWordBank(doc);
    });
  }
  function myWordsOn(){ try { return reefCourseOn(); } catch(e){ return false; } }
  function myWordsPlain(t){ return askPlainText(t).replace(/\s+/g, ' ').trim(); }

  // The Korean on each card in her decks, with the other side as its meaning, for words that turn up without
  // one (an Ask Shelly lookup, a shaky word). Called with every deck's cards whenever the board counts what's due.
  function myWordsLearnCards(lists){
    var map = {};
    (lists || []).forEach(function(cards){ (cards || []).forEach(function(c){
      if(c.mode === 'hanja' || c.mode === 'numsys' || c.mode === 'blank') return;
      var f = myWordsPlain(c.front), b = myWordsPlain(c.back), fk = learnerHasHangul(f), bk = learnerHasHangul(b);
      if(fk === bk) return;
      var ko = fk ? f : b, en = fk ? b : f;
      if(/[A-Za-z]/.test(en) && !map[learnerKey(ko)]) map[learnerKey(ko)] = en;
    }); });
    MW.meanings = map;
  }
  // An English meaning for Korean text, from her cards first, then the offline dictionary; '' if none.
  function myWordsMeaning(ko){
    var k = learnerKey(ko), bare = String(ko || '').replace(/[^가-힣 ]/g, '').replace(/\s+/g, ' ').trim();
    if(MW.meanings[k]) return MW.meanings[k];
    if(KO_MORE[bare]) return KO_MORE[bare];
    if(KO_WORDS[bare]) return KO_WORDS[bare];
    if(KO_FORMS[bare]) return KO_FORMS[bare][1];
    return '';
  }

  // Adds a word (or brings it back to the top as due now). from: 'missed', 'asked', 'shaky' or 'town' (a phrase Harbor Town's talk needed). A shaky word that
  // is already listed is left as it is, so the weekly drift of memory doesn't keep resetting it.
  function myWordsAdd(ko, en, from){
    ko = myWordsPlain(ko).replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '');
    if(!ko || ko.length > 60 || !learnerHasHangul(ko) || !myWordsOn()) return Promise.resolve(false);
    en = myWordsCap(myWordsPlain(en || '') || myWordsMeaning(ko));
    if(!en) return Promise.resolve(false);
    var pid = myWordsPid();
    return myWordsLoad().then(function(doc){
      if(!doc || myWordsPid() !== pid) return false;
      var mine = doc.mine, k = learnerKey(ko), e = mine[k];
      if(e && from === 'shaky') return false;
      mine[k] = { ko: e ? e.ko : ko, en: (e && e.en) || en.slice(0, 120), from: from, at: Date.now(), seen: 0 };
      var keys = Object.keys(mine);
      if(keys.length > MW_MAX) keys.sort(function(a, b){ return (mine[a].at || 0) - (mine[b].at || 0); }).slice(0, keys.length - MW_MAX).forEach(function(x){ delete mine[x]; });
      return wbDocSave({ mine: mine }).then(function(){ return true; });
    });
  }

  // Called by commitGrade() for every answered card, after the learner model has recorded it. A Korean card
  // answered "again" joins the list; a My words card notes that it was practiced.
  function myWordsNoteAnswer(card, mode, rating){
    try {
      if(card._myWords){
        var doc = MW.doc, e = doc && doc.mine[card._myWords];
        if(e){ e.seen = Date.now(); e.n = (e.n || 0) + 1; wbDocSave({ mine: doc.mine }); }
        return;
      }
      if(rating !== 'again' || mode === 'hanja' || mode === 'numsys' || mode === 'blank') return;
      var f = myWordsPlain(card.front), b = myWordsPlain(card.back), fk = learnerHasHangul(f), bk = learnerHasHangul(b);
      if(fk === bk) return;
      var en = fk ? b : f;
      myWordsAdd(fk ? f : b, /[A-Za-z]/.test(en) ? en : '', 'missed');
    } catch(err){}
  }
  // Called by askGo() with the question: each run of Korean in it, or (for Korean typed in English letters) the
  // word Shelly takes it to be when the match is exact. A phrase with no meaning is tried word by word.
  function myWordsNoteAsk(q, card){
    try {
      if(!myWordsOn()) return;
      var runs = String(q || '').match(/[가-힣]+(?:\s+[가-힣]+)*/g) || [];
      runs.slice(0, 3).forEach(function(run){
        var en = card && myWordsPlain(card.front).replace(/[^가-힣\s]/g, '').trim() === run ? myWordsPlain(card.back) : '';
        if(en && learnerHasHangul(en)) en = '';
        if(en || myWordsMeaning(run)) return myWordsAdd(run, en, 'asked');
        run.split(/\s+/).slice(0, 4).forEach(function(w){ if(myWordsMeaning(w)) myWordsAdd(w, '', 'asked'); });
      });
      if(!runs.length){
        var c = koRomanCandidates(q)[0];
        if(c && c.d === 0) myWordsAdd(c.ko, c.en, 'asked');
      }
    } catch(e){}
  }
  // Words the learner model holds whose shakiest skill has faded below MW_WEAK_R.
  function myWordsScanShaky(now){
    if(!myWordsOn() || !MW.doc) return;
    now = now || Date.now();
    if(now - MW.scanAt < MW_SCAN_MS) return;
    MW.scanAt = now;
    var items = learnerModel().items, mine = MW.doc.mine, adds = 0;
    Object.keys(items).forEach(function(k){
      var it = items[k]; if(it.lang !== 'ko' || mine[k] || adds >= 20) return;
      var ch = Learner.weakest(it.text, now), r = ch ? Learner.retrievability(it.text, ch, now) : null;
      if(r != null && r < MW_WEAK_R && myWordsMeaning(it.text)){ adds++; myWordsAdd(it.text, '', 'shaky'); }
    });
  }
  // Everything after the board's due counts: the list for this profile, her cards' meanings, the shaky scan.
  function myWordsRefresh(lists){
    if(!myWordsOn()) return Promise.resolve();
    return myWordsLoad().then(function(){
      myWordsLearnCards(lists);
      // only once her decks are in: before that, every word would look like it has no meaning
      if((lists || []).some(function(l){ return l && l.length; })) myWordsScanShaky();
    });
  }

  // The words due now, in the order Learner.due() gives (soonest first), then words new to the list.
  function myWordsDue(now){
    if(!myWordsOn() || !MW.doc || MW.pid !== myWordsPid()) return [];
    now = now || Date.now();
    var mine = MW.doc.mine, order = {}, n = 0;
    Learner.due(now).forEach(function(d){ if(order[d.key] == null) order[d.key] = n++; });
    return Object.keys(mine).filter(function(k){ return !mine[k].seen || order[k] != null; })
      .sort(function(a, b){
        var oa = order[a] != null ? order[a] : 1e9, ob = order[b] != null ? order[b] : 1e9;
        return oa - ob || (mine[a].at || 0) - (mine[b].at || 0);
      })
      .map(function(k){ return Object.assign({ key: k }, mine[k]); });
  }
  // The whole list, newest first (the Word Bank's Mine tab)
  function myWordsList(){
    if(!myWordsOn() || !MW.doc || MW.pid !== myWordsPid()) return [];
    var mine = MW.doc.mine;
    return Object.keys(mine).sort(function(a, b){ return (mine[b].at || 0) - (mine[a].at || 0); }).map(function(k){ return Object.assign({ key: k }, mine[k]); });
  }
  // The board's tile (an item like reefZones' own), or null when nothing is due.
  function myWordsTile(){
    var n = myWordsDue().length;
    return n ? { d: MW_DECK, dc: { due: n, total: n }, kind: null, state: 'ready' } : null;
  }
  // The deck for an id, counting My words, which isn't stored with the others
  function deckOrMyWords(id){
    return id === MW_ID ? MW_DECK : S.decks.find(function(d){ return d.id === id; });
  }

  function myWordsCap(t){ t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  // A sentence (three or more words, or ending like one) can be built from its words; a shorter phrase can't.
  function myWordsSentence(ko){
    var n = ko.trim().split(/\s+/).length;
    return n >= 2 && n <= 9 && (n >= 3 || /[.?!]$/.test(ko.trim()));
  }
  // One word, asked in its weakest way:
  //   hear → Listen & Pick    say → Echo    use → Sentence Builder for a sentence, else as recall
  //   read → the Korean shown, pick the English    recall → the English shown, think of the Korean, flip
  // A word the model has never seen practiced starts with read. With too few other meanings to choose from,
  // hear and read become a flip card with the Korean on the front.
  // The way to ask: a skill just missed (due again within the hour) comes back first, the way you missed it;
  // otherwise the one that has faded most (Learner.weakest), or read for a word never practiced.
  function myWordsWay(ko){
    var it = Learner.item(ko), soon = Date.now() + 36e5, pick = null, best = Infinity;
    if(it && it.ch) Object.keys(it.ch).forEach(function(c){ var d = it.ch[c] && it.ch[c].due; if(d && d < soon && d < best){ best = d; pick = c; } });
    return pick || Learner.weakest(ko) || 'read';
  }
  function myWordsCard(e, i, meanings){
    var ch = myWordsWay(e.ko), ko = e.ko, en = myWordsCap(e.en);
    // all capitalized alike, so a dictionary meaning ("water") doesn't stand out among card ones ("Phone")
    // and a word's wrong answers are words, a sentence's are sentences, so the odd one out isn't the answer
    var sentence = function(m){ return /[.?!]$/.test(m) || m.split(/\s+/).length > 3; };
    var others = meanings.filter(function(m){ return m.toLowerCase() !== en.toLowerCase(); });
    var alike = others.filter(function(m){ return sentence(m) === sentence(en); });
    var wrong = shuffle(alike.length >= 2 ? alike : others).slice(0, 3).map(myWordsCap);   // two of the same kind beat three mixed
    var base = { id: 'mw-' + i + '-' + reefHash(e.key), _practice: true, _myWords: e.key, note: '', photoUrl: '', choices: [] };
    if(ch === 'use' && !myWordsSentence(ko)) ch = 'recall';
    if((ch === 'hear' || ch === 'read') && wrong.length < 2) return Object.assign(base, { mode: 'flip', front: ko, back: en });
    if(ch === 'hear') return Object.assign(base, { mode: 'listen', front: ko, back: en, choices: wrong });
    if(ch === 'say') return Object.assign(base, { mode: 'echo', front: ko, back: en });
    if(ch === 'use') return Object.assign(base, { mode: 'build', front: ko, back: en });
    if(ch === 'read') return Object.assign(base, { mode: 'choice', front: ko, back: en, choices: wrong });
    return Object.assign(base, { mode: 'flip', front: en, back: ko });
  }
  function startMyWords(){
    var due = myWordsDue();
    if(!due.length){ goHome(); return; }
    var seen = {}, meanings = [];
    Object.keys(MW.doc.mine).map(function(k){ return MW.doc.mine[k].en; }).concat(Object.keys(MW.meanings).map(function(k){ return MW.meanings[k]; }))
      .forEach(function(m){ var l = String(m || '').toLowerCase(); if(m && !seen[l] && m.length <= 60){ seen[l] = 1; meanings.push(m); } });
    var queue = due.slice(0, MW_ROUND).map(function(e, i){ return myWordsCard(e, i, meanings); });
    S.currentDeckId = MW_ID;
    S.editMode = false;
    studyBegin(queue, queue);
  }
  // Test helper: the words due now, each with the way a round would ask it
  window.__myWordsDue = function(){ return myWordsDue().map(function(e){ return { ko: e.ko, en: e.en, from: e.from, way: myWordsWay(e.ko) }; }); };
  // Test helper: the right answer to the card on screen, so the smoke test can miss it on purpose
  window.__studyAnswer = function(){
    var c = S.view === 'study' && S.studyQueue[0]; if(!c) return null;
    var tc = S.timedChoiceState, ls = S.listenState;
    return tc && tc.cardId === c.id ? tc.answer : ls && ls.cardId === c.id ? ls.answer : c.back;
  };
