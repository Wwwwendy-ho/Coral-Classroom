  /* ---------- HARBOR TOWN: talk with the townsfolk ----------
     The second new region of the sea chart (seamap.js), for conversation. A list of the townsfolk (town-talks.js),
     the best fit first, then one conversation as chat bubbles:
       the townsperson's line appears and plays in the natural Korean voice (tap a word for its meaning, or
       English for the whole line)
       the player answers: taps one of two or three Korean answers, or types one (Hangul, or Korean spelled in
       English letters, matched loosely as Ask Shelly does it: koLoose and koRomSaid in reef.js)
       a good answer moves the talk on, and different answers can lead to different lines; a gentle mistake
       gets a hint and another try
       a debrief at the end: what went well, up to two things to fix, and the phrases she needed, which go in
       My words
     It looks and behaves like Story Lagoon (lagoon.js) and reuses its word-knowledge helpers (lagoonKnows,
     lagoonMiss, lagoonDeckWords), so "best fit" means the same in both: about 90–95% of the words known.
     The learner model hears about it all: 'hear' for each townsperson line (hard if she needed the English),
     'use' for each answer (good when right the first time, again when she first slipped), 'read' for a looked-up
     word. Screens: S.view 'town' (the list) and 'townTalk' (one conversation), state in S.town. Which talks she
     has finished is kept per profile in localStorage (cc-town-done-<profile id>); losing it only loses the ticks. */
  function townFolk(id){ return TOWN_FOLK.find(function(f){ return f.id === id; }) || null; }
  // "여권=passport;좀=please" -> [{ ko, en, base }]
  function townWords(gloss){
    return String(gloss || '').split(';').map(function(p){ var b = p.split('='); return { ko: b[0], en: b[1] || '', base: b[2] || '' }; });
  }
  function townDoneKey(){ return 'cc-town-done-' + (S.profile && S.profile.id || 'guest'); }
  function townDone(){ try { return JSON.parse(localStorage.getItem(townDoneKey()) || '{}') || {}; } catch(e){ return {}; } }
  function townMarkDone(id, good){
    var d = townDone(); d[id] = { at: Date.now(), good: good };
    try { localStorage.setItem(townDoneKey(), JSON.stringify(d)); } catch(e){}
  }
  // The words she needs for a talk: everything the townsperson says, and the best answers (the mistakes are left out)
  function townCoverage(f, deck){
    var seen = {}, known = 0, total = 0;
    function add(gloss){ townWords(gloss).forEach(function(w){
      var k = learnerKey(w.ko); if(!k || seen[k]) return; seen[k] = 1; total++;
      if(lagoonKnows(w, deck)) known++;
    }); }
    Object.keys(f.nodes).forEach(function(id){
      var n = f.nodes[id]; add(n.t[2]);
      (n.c || []).forEach(function(c){ if(c.g === 'best') add(c.w); });
    });
    return { known: known, total: total, share: total ? known / total : 0 };
  }
  function townRanked(deck){
    var done = townDone();
    return TOWN_FOLK.map(function(f, i){
      var c = townCoverage(f, deck);
      return { f: f, i: i, c: c, done: !!done[f.id], miss: lagoonMiss(c.share) };
    }).sort(function(a, b){ return (a.done - b.done) || (a.miss - b.miss) || (a.i - b.i); });   // talks already had go last
  }

  function openTown(){
    regionBoardOpen('town');
    try { Speech.stop(); } catch(e){}
    S.currentDeckId = null;
    S.town = { deck: S.town && S.town.deck || null, slow: !!(S.town && S.town.slow) };
    S.view = 'town';
    render(); window.scrollTo(0, 0);
    var decks = (S.decks || []).filter(function(d){ return !d.archived; });
    Promise.all(decks.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); })).then(function(lists){
      if(!S.town) return;
      S.town.deck = lagoonDeckWords([].concat.apply([], lists));
      if(S.view === 'town') render();
    }).catch(function(){});
  }
  function renderTown(){
    if((true) && regionBoardRender('town')) return;
    var T = S.town || (S.town = {}), list = townRanked(T.deck);
    var best = list.find(function(x){ return !x.done; });
    var rows = list.map(function(x){
      var pct = Math.round(x.c.share * 100), fit = !x.miss && !x.done;
      return '<li><button type="button" class="lg-story tw-folk' + (x.done ? ' done' : '') + (x === best ? ' best' : '') + '" data-tw-open="' + x.f.id + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(x.f.icon) + '</span>' +
        '<span class="lg-st"><b>' + esc(x.f.en) + '</b><span lang="ko">' + esc(x.f.ko) + '</span><small>' + esc(x.f.place) + '</small>' +
          '<span class="lg-meter" role="img" aria-label="You know ' + x.c.known + ' of the ' + x.c.total + ' words you need"><i style="width:' + pct + '%"></i></span>' +
          '<small>' + (T.deck ? 'Words you know: ' + pct + '%' : 'Counting your words…') + '</small></span>' +
        '<span class="lg-tag">' + (x.done ? ccIcon('check') + ' Talked' : x === best ? 'Try this' : fit ? 'Good fit' : '') + '</span>' +
      '</button></li>';
    }).join('');
    app.innerHTML = '<div class="nav-row"><button class="back-btn" data-act="tw-home">⟵ Reef</button><span class="nav-title">' + ccIcon('talk') + ' Harbor Town</span></div>' +
      '<div class="lg-page">' +
        '<div class="lg-intro"><h2>Talk with the townsfolk</h2><p>Jump straight into a conversation whenever you like. Your next suggested conversation is at the top.</p></div>' +
        '<ul class="lg-list">' + rows + '</ul>' +
      '</div>';
    app.querySelector('[data-act="tw-home"]').addEventListener('click', function(){ goHome(); });
    app.querySelectorAll('[data-tw-open]').forEach(function(b){ b.addEventListener('click', function(){ townOpenTalk(b.dataset.twOpen); }); });
  }

  function townOpenTalk(id){
    var f = townFolk(id); if(!f) return;
    try { Speech.stop(); } catch(e){}
    var T = S.town || (S.town = {});
    T.id = id; T.node = f.start; T.log = []; T.tried = {}; T.turns = {}; T.showEn = {}; T.word = null; T.typed = ''; T.typeMsg = '';
    T.choiceEn = false; T.phase = 'talk'; T.speaking = false; T.waiting = false; T.debrief = null; T.pat = {};
    S.view = 'townTalk';
    try { Sound.bloop(560); } catch(e){}
    townSay(f, f.start, true);
    window.scrollTo(0, 0);
  }
  // The townsperson's next line: a moment of "typing" dots, then the line appears and plays
  function townSay(f, id, first){
    var T = S.town, n = f.nodes[id];
    T.node = id; T.waiting = !first;
    var token = T.token = (T.token || 0) + 1;
    function show(){
      if(token !== T.token || S.view !== 'townTalk') return;
      T.waiting = false;
      T.log.push({ who: 'them', ko: n.t[0], en: n.t[1], w: n.t[2], node: id });
      renderTownTalk(); townScrollEnd();
      townPlay(T.log.length - 1);
    }
    if(first) show();
    else { renderTownTalk(); townScrollEnd(); setTimeout(show, reefCalm() ? 250 : 650); }
  }
  function townOpts(T){ return T.slow ? { rate: 0.7, variant: 'slow' } : null; }
  function townPlay(i){
    var T = S.town, e = T.log[i]; if(!e) return;
    var token = T.token = (T.token || 0) + 1;
    T.speaking = i; townPaint();
    Speech.speakThen(e.ko, function(){ if(token === T.token){ T.speaking = false; townPaint(); } }, e.who === 'them' ? townOpts(T) : null);
  }
  function townStop(){ var T = S.town; if(T){ T.token = (T.token || 0) + 1; T.speaking = false; } try { Speech.stop(); } catch(e){} }
  // Scrolls down to the newest part of the talk: as far as the page goes (the answers sit at the bottom), but never
  // so far that the townsperson's newest line slides off the top, which on an iPhone held sideways it otherwise would
  function townScrollEnd(){
    var lines = app.querySelectorAll('.tw-log .lg-line:not(.lg-me)'), last = lines[lines.length - 1];
    var bottom = document.documentElement.scrollHeight - window.innerHeight;
    var y = last ? Math.min(bottom, last.getBoundingClientRect().top + window.scrollY - 70) : bottom;
    if(y > window.scrollY) window.scrollTo({ top: y, behavior: reefCalm() ? 'auto' : 'smooth' });
  }
  // Only the playing highlight changes while a line plays, so the page doesn't jump about
  function townPaint(){
    var T = S.town;
    app.querySelectorAll('[data-tw-line]').forEach(function(el){ el.classList.toggle('playing', +el.dataset.twLine === T.speaking); });
  }

  /* ---------- Typed answers ----------
     She can type an answer in Hangul or in English letters, roughly. Each answer (and its "also" list of other
     ways to say the same) is compared without spaces or punctuation: Hangul exactly or a letter off in a long one,
     English letters loosely, both as spelled and as said (koRom / koRomSaid), the way Ask Shelly reads them.
     Returns the matching answer, or null. */
  function townPlain(s){ return String(s || '').normalize('NFC').replace(/[^가-힣a-zA-Z]/g, '').toLowerCase(); }
  function townMatch(typed, choices){
    var raw = String(typed || '').trim(); if(!raw) return null;
    var hangul = /[가-힣]/.test(raw), t = townPlain(raw), best = null;
    if(!t) return null;
    var loose = hangul ? '' : koLoose(raw), L = loose.length;
    var allow = hangul ? (t.length >= 6 ? 1 : 0) : L <= 3 ? 0 : L <= 5 ? 1 : L <= 8 ? 2 : Math.ceil(L / 4);
    choices.forEach(function(c, ci){
      [c.ko].concat(c.also || []).forEach(function(say){
        var p = townPlain(say), d;
        if(hangul) d = koEdit(t, p);
        else d = Math.min(koEdit(loose, koLoose(koRom(p))), koEdit(loose, koLoose(koRomSaid(p))));
        if(d > allow) return;
        // a closer match wins; on a tie the better answer does
        var score = d + (c.g === 'best' ? 0 : c.g === 'ok' ? .1 : .2);
        if(!best || score < best.score) best = { i: ci, score: score };
      });
    });
    if(!best && hangul) choices.forEach(function(c, ci){ if(!best && c.re && c.re.test(raw.replace(/[.,!?~\s]+$/, ''))) best = { i: ci }; });
    return best ? best.i : null;
  }

  function townBest(n){ return n.c.find(function(c){ return c.g === 'best'; }); }
  function townAnswer(f, i, typed){
    var T = S.town, id = T.node, n = f.nodes[id], c = n && n.c && n.c[i];
    if(!c || T.phase !== 'talk' || T.waiting || (T.tried[id] || []).indexOf(i) !== -1) return;
    townStop();
    T.word = null; T.typeMsg = ''; T.typed = '';
    var turn = T.turns[id] || (T.turns[id] = { slipped: false, hints: [] });
    T.log.push({ who: 'me', ko: c.ko, en: c.en, w: c.w, g: c.g, typed: typed || '' });
    var mine = T.log.length - 1;
    if(c.g === 'oops'){
      (T.tried[id] = T.tried[id] || []).push(i);
      turn.slipped = true; turn.hints.push(c.hint);
      T.log.push({ who: 'hint', text: c.hint });
      if(!townPatCheck(T, c.ko, { self: true }).length && typed) townPatCheck(T, typed, { typed: true });
      try { Sound.wrong(); } catch(e){}
      renderTownTalk(); townScrollEnd();
      return;
    }
    turn.said = c.ko; turn.en = c.en; turn.g = c.g; turn.typed = !!typed;
    // a typed answer close enough to count can still hold a slip the rules know (물를 for 물을): say so, gently
    if(typed) townPatCheck(T, typed, { typed: true }).slice(0, 1).forEach(function(x){ T.log.push({ who: 'hint', text: 'You typed ' + x.word + '. ' + x.why }); });
    if(c.g === 'ok'){ var b = townBest(n); turn.better = b; if(b) T.log.push({ who: 'note', ko: b.ko, en: b.en }); }
    // 'use': right the first time is good (typed from memory, easy); after a slip, the phrase she needed is missed
    try { Learner.record(c.ko, 'use', turn.slipped ? 'again' : typed && c.g === 'best' ? 'easy' : 'good'); } catch(e){}
    try { if(!turn.slipped) Sound.correct(); } catch(e){}
    // she hears her answer said well, then the townsperson replies; the answers are put away meanwhile
    var token = T.token = (T.token || 0) + 1;
    T.waiting = 'me'; T.speaking = mine;
    renderTownTalk(); townScrollEnd();
    Speech.speakThen(c.ko, function(){ if(token === T.token && S.view === 'townTalk'){ T.speaking = false; townSay(f, c.to); } });
  }
  function townTyped(f){
    var T = S.town, n = f.nodes[T.node], inp = app.querySelector('#twType');
    var text = inp ? inp.value : '';
    if(!text.trim() || !n || !n.c) return;
    var tried = T.tried[T.node] || [];
    // a mistake she has already made is out of the running, so typing it again isn't matched to it
    var i = townMatch(text, n.c.map(function(c, ci){ return tried.indexOf(ci) === -1 ? c : { ko: '', g: 'oops' }; }));
    if(i == null){
      T.typed = text;
      var slip = townPatCheck(T, text, { typed: true })[0];
      T.typeMsg = 'I did not quite catch that. ' + (slip ? 'Check ' + slip.word + ': ' + slip.why + ' ' : '') + 'Try again, or tap one of the answers.';
      renderTownTalk();
      var again = app.querySelector('#twType'); if(again){ again.focus(); }
      return;
    }
    townAnswer(f, i, text.trim());
  }

  function townFinish(f){
    var T = S.town;
    townStop();
    var turns = Object.keys(T.turns).map(function(k){ return T.turns[k]; }).filter(function(t){ return t.said; });
    var well = turns.filter(function(t){ return !t.slipped && t.g === 'best'; });
    var fixes = [];
    turns.forEach(function(t){ t.hints.forEach(function(h){ if(fixes.length < 2) fixes.push({ hint: h }); }); });
    turns.forEach(function(t){ if(fixes.length < 2 && t.better) fixes.push({ said: t.said, better: t.better }); });
    // the phrases she needed: the answer she reached after a slip, and the better one where hers only worked
    var need = [], seen = {};
    turns.forEach(function(t){
      var p = t.slipped ? { ko: t.said, en: t.en } : t.better ? { ko: t.better.ko, en: t.better.en } : null;
      if(p && !seen[p.ko]){ seen[p.ko] = 1; need.push(p); }
    });
    need.forEach(function(p){ try { myWordsAdd(p.ko.replace(/[.?!]+$/, ''), p.en, 'town'); } catch(e){} });
    // 'hear' for every line of hers she heard: good, or hard if she needed the English
    T.log.forEach(function(e, i){ if(e.who === 'them') try { Learner.record(e.ko, 'hear', T.showEn[i] ? 'hard' : 'good'); } catch(x){} });
    T.debrief = { well: well, fixes: fixes, need: need, turns: turns.length, pat: Object.keys(T.pat || {}) };
    T.phase = 'done';
    townMarkDone(f.id, well.length);
    regionBoardActivityCompleted('town', f.id);
    deckTick('talk', f.id);   // a leg of Captain's Deck's voyage, if today's has this talk
    try { reefWinSound(true); } catch(e){}
    try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
    renderTownTalk(); window.scrollTo(0, 0);
  }

  function renderTownTalk(){
    var T = S.town || {}, f = townFolk(T.id);
    if(!f){ S.view = 'town'; return renderTown(); }
    var head = '<div class="nav-row"><button class="back-btn" data-act="tw-back">⟵ Town</button><span class="nav-title">' + ccIcon(f.icon) + ' ' + esc(f.en) + '</span></div>';
    var title = '<div class="lg-title"><h2 lang="ko">' + esc(f.ko) + '</h2><span>' + esc(f.place) + '</span></div>';
    app.innerHTML = head + '<div class="lg-page tw-page">' + title + (T.phase === 'done' ? townDebriefHTML(f, T) : townChatHTML(f, T)) + '</div>';
    townWire(f, T);
  }
  function townWordsHTML(e, li){
    return '<span class="lg-ko" lang="ko">' + e.ko.split(/\s+/).map(function(tok, wi){
      return '<button type="button" class="lg-w' + (S.town.word && S.town.word[0] === li && S.town.word[1] === wi ? ' on' : '') + '" data-tw-w="' + li + ':' + wi + '">' + esc(tok) + '</button>'; }).join(' ') + '</span>';
  }
  function townChatHTML(f, T){
    var n = f.nodes[T.node];
    var log = T.log.map(function(e, i){
      if(e.who === 'hint') return '<li class="tw-hint" role="status">' + ccIcon('bulb') + '<span>' + esc(e.text) + '</span></li>';
      if(e.who === 'note') return '<li class="tw-hint tw-note" role="status">' + ccIcon('sparkle') + '<span>That works. You could also say <b lang="ko">' + esc(e.ko) + '</b> (' + esc(e.en) + ').</span></li>';
      var me = e.who === 'me';
      return '<li class="lg-line' + (me ? ' lg-me' : '') + (me && e.g === 'oops' ? ' tw-oops' : '') + (T.speaking === i ? ' playing' : '') + '" data-tw-line="' + i + '">' +
        '<span class="lg-who">' + esc(me ? 'You' : f.en) + '</span>' +
        '<div class="lg-bubble">' + townWordsHTML(e, i) +
          (e.typed ? '<span class="tw-typed">You typed: ' + esc(e.typed) + '</span>' : '') +
          (T.showEn[i] ? '<span class="lg-en">' + esc(e.en) + '</span>' : '') +
          '<span class="lg-tools"><button type="button" class="lg-mini" data-tw-say="' + i + '" aria-label="Hear this line">' + ccIcon('sound') + '</button>' +
            '<button type="button" class="lg-mini" data-tw-en="' + i + '" aria-pressed="' + !!T.showEn[i] + '">' + (T.showEn[i] ? 'Hide English' : 'English') + '</button></span>' +
        '</div></li>';
    }).join('');
    if(T.waiting === true) log += '<li class="lg-line tw-dots" aria-label="' + esc(f.en) + ' is answering"><div class="lg-bubble"><i></i><i></i><i></i></div></li>';
    var wordBox = '';
    if(T.word){
      var e = T.log[T.word[0]], w = e && townWords(e.w)[T.word[1]];
      if(w) wordBox = '<div class="lg-word" role="status"><button type="button" class="lg-mini lg-wsay" data-tw-wsay aria-label="Hear ' + esc(w.ko) + '">' + ccIcon('sound') + '</button>' +
        '<div><b lang="ko">' + esc(w.ko) + '</b><span>' + esc(w.en) + '</span>' + (w.base && w.base !== w.ko ? '<small>From <span lang="ko">' + esc(w.base) + '</span></small>' : '') +
        (T.wordAdded ? '<small class="lg-added">' + ccIcon('sparkle') + ' Added to My words</small>' : '') + '</div>' +
        '<button type="button" class="lg-mini lg-wclose" data-tw-wclose aria-label="Close">' + ccIcon('close') + '</button></div>';
    }
    var turn = '';
    if(!T.waiting && n && n.end){
      turn = '<div class="tw-turn"><div class="lg-bar"><button type="button" class="btn btn-primary" data-tw-finish>' + ccIcon('check') + ' Finish</button></div></div>';
    } else if(!T.waiting && n && n.c){
      var tried = T.tried[T.node] || [];
      var opts = n.c.map(function(c, i){
        var off = tried.indexOf(i) !== -1;
        return '<li><button type="button" class="lg-opt tw-opt' + (off ? ' wrong' : '') + '" data-tw-opt="' + i + '"' + (off ? ' disabled aria-disabled="true"' : '') + '><span lang="ko">' + esc(c.ko) + '</span>' +
          (T.choiceEn || off ? '<small>' + esc(c.en) + '</small>' : '') + '</button></li>'; }).join('');
      turn = '<div class="tw-turn" role="group" aria-label="Your answer">' +
        '<div class="tw-turn-head"><b>Your turn</b><button type="button" class="lg-mini" data-tw-cen aria-pressed="' + !!T.choiceEn + '">' + (T.choiceEn ? 'Hide English' : 'English') + '</button></div>' +
        '<ul class="lg-opts">' + opts + '</ul>' +
        '<form class="tw-type" data-tw-form autocomplete="off"><label for="twType">Or type your answer, in Korean or in English letters (like <i>gamsahamnida</i>)</label>' +
          '<span class="tw-type-row"><input id="twType" type="text" lang="ko" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="Type your answer" value="' + esc(T.typed || '') + '">' +
          '<button type="submit" class="btn btn-primary">Send</button></span>' +
          (T.typeMsg ? '<span class="tw-type-msg" role="status">' + esc(T.typeMsg) + '</span>' : '') + '</form></div>';
    }
    var bar = '<div class="lg-bar tw-bar"><button type="button" class="btn btn-ghost lg-slow" data-tw-slow aria-pressed="' + !!T.slow + '">' + ccIcon('turtle') + (T.slow ? ' Slower: on' : ' Slower') + '</button></div>';
    return '<p class="lg-hint">' + ccIcon('talk') + ' Listen, then answer. Tap any word to see what it means.</p>' +
      '<ol class="lg-lines tw-log">' + log + '</ol>' + turn + wordBox + bar;
  }
  function townDebriefHTML(f, T){
    var D = T.debrief || { well: [], fixes: [], need: [] }, perfect = !D.fixes.length;
    var nextUp = townRanked(T.deck).find(function(x){ return !x.done && x.f.id !== f.id; });
    var well = D.well.slice(0, 3).map(function(t){ return '<li><b lang="ko">' + esc(t.said) + '</b><small>' + esc(t.en) + (t.typed ? ' · typed from memory' : '') + '</small></li>'; }).join('');
    var fixes = D.fixes.map(function(x){
      return '<li>' + (x.hint ? esc(x.hint) : 'You said <b lang="ko">' + esc(x.said) + '</b>, which works. Also natural: <b lang="ko">' + esc(x.better.ko) + '</b> (' + esc(x.better.en) + ').') + '</li>'; }).join('');
    var need = D.need.map(function(p){ return '<li><button type="button" class="lg-mini tw-needsay" data-tw-sayko="' + esc(p.ko) + '" aria-label="Hear ' + esc(p.ko) + '">' + ccIcon('sound') + '</button><span><b lang="ko">' + esc(p.ko) + '</b><small>' + esc(p.en) + '</small></span></li>'; }).join('');
    return '<div class="summary-card reef-sum-card lg-done tw-done">' +
        '<span class="lg-done-ic" aria-hidden="true">' + ccIcon(perfect ? 'trophy' : 'star') + '</span>' +
        '<h2>' + (perfect ? 'A perfect conversation!' : 'Conversation finished!') + '</h2>' +
        '<p>' + esc(perfect ? reefPraiseLine() : 'Good talking. The phrases you needed will come back in your practice.') + '</p>' +
      '</div>' +
      '<section class="tw-sec"><h3>' + ccIcon('check') + ' What went well</h3>' +
        (well ? '<ul class="tw-phr">' + well + '</ul>' : '<p>You kept the conversation going to the end. That is the hardest part.</p>') + '</section>' +
      '<section class="tw-sec"><h3>' + ccIcon('bulb') + ' ' + (perfect ? 'Nothing to fix' : 'To work on') + '</h3>' +
        (fixes ? '<ul class="tw-fix">' + fixes + '</ul>' : '<p>Every answer was right the first time.</p>') + townPatHTML(D) + '</section>' +
      (need ? '<section class="tw-sec"><h3>' + ccIcon('sparkle') + ' Phrases you needed</h3><p>These are now in My words, to practice.</p><ul class="tw-phr tw-need">' + need + '</ul></section>' : '') +
      '<div class="reef-sum-actions tw-actions">' +
        (nextUp ? '<button type="button" class="btn btn-primary" data-tw-open="' + nextUp.f.id + '">Next: ' + esc(nextUp.f.en) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-tw-again>' + ccIcon('replay') + ' Talk again</button>' +
        '<button type="button" class="btn btn-ghost" data-act="tw-back">' + ccIcon('talk') + ' All townsfolk</button>' +
      '</div>';
  }

  /* Pattern Reef's mistake rules (patterns-data.js) on what she said: a slip they recognize is counted there, and
     the debrief offers to repair that pattern. Returns what they found. */
  function townPatCheck(T, text, ctx){
    var found = [];
    try { found = patNote(text, ctx, 'Harbor Town'); } catch(e){}
    found.forEach(function(x){ T.pat = T.pat || {}; T.pat[x.pat] = x; });
    return found;
  }
  function townPatHTML(D){
    var pats = (D.pat || []).map(patById).filter(Boolean).slice(0, 2);
    if(!pats.length) return '';
    return '<div class="tw-pat">' + pats.map(function(p){
      return '<button type="button" class="btn btn-ghost" data-tw-pat="' + p.id + '">' + ccIcon('sentence') + '<span>Repair this in Pattern Reef<small>' + esc(p.en) + ' <span lang="ko">' + esc(p.ko) + '</span></small></span></button>';
    }).join('') + '</div>';
  }
  function townTapWord(f, T, li, wi){
    var e = T.log[li], w = e && townWords(e.w)[wi]; if(!w) return;
    townStop();
    var known = lagoonKnows(w, T.deck);
    T.word = [li, wi]; T.wordAdded = false;
    T.looked = T.looked || {};
    // looking a word up says she wasn't sure: a word she didn't know is missed, one she did is "hard" (once per talk)
    var k = learnerKey(w.ko);
    if(k && !T.looked[k]){ T.looked[k] = 1; try { Learner.record(w.ko, 'read', known ? 'hard' : 'again'); } catch(x){} }
    if(!known) myWordsAdd(w.ko, w.en, 'asked').then(function(ok){ if(ok && T.word && T.word[0] === li && T.word[1] === wi && S.view === 'townTalk'){ T.wordAdded = true; renderTownTalk(); } }).catch(function(){});
    try { Speech.speak(w.ko); } catch(x){}
    var y = window.scrollY;
    renderTownTalk(); window.scrollTo(0, y);
    // the meaning card sits at the bottom of the screen: a word low down scrolls up so the card doesn't cover it
    var on = app.querySelector('.lg-w.on'), card = app.querySelector('.lg-word');
    if(on && card){ var gap = on.getBoundingClientRect().bottom - card.getBoundingClientRect().top + 16; if(gap > 0) window.scrollBy({ top: gap, behavior: reefCalm() ? 'auto' : 'smooth' }); }
  }
  function townWire(f, T){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(b){ b.addEventListener('click', function(e){ fn(b, e); }); }); }
    on('[data-act="tw-back"]', function(){ townStop(); S.view = 'town'; render(); window.scrollTo(0, 0); });
    on('[data-tw-opt]', function(b){ townAnswer(f, +b.dataset.twOpt); });
    on('[data-tw-say]', function(b){ townPlay(+b.dataset.twSay); });
    on('[data-tw-en]', function(b){ var i = +b.dataset.twEn; T.showEn[i] = !T.showEn[i]; var y = window.scrollY; renderTownTalk(); window.scrollTo(0, y); });
    on('[data-tw-cen]', function(){ T.choiceEn = !T.choiceEn; var y = window.scrollY; renderTownTalk(); window.scrollTo(0, y); });
    on('[data-tw-slow]', function(b){ T.slow = !T.slow; b.setAttribute('aria-pressed', String(T.slow)); b.innerHTML = ccIcon('turtle') + (T.slow ? ' Slower: on' : ' Slower'); });
    on('[data-tw-w]', function(b){ var p = b.dataset.twW.split(':'); townTapWord(f, T, +p[0], +p[1]); });
    on('[data-tw-wsay]', function(){ var e = T.word && T.log[T.word[0]], w = e && townWords(e.w)[T.word[1]]; if(w) try { Speech.speak(w.ko); } catch(x){} });
    on('[data-tw-wclose]', function(){ T.word = null; var y = window.scrollY; renderTownTalk(); window.scrollTo(0, y); });
    on('[data-tw-finish]', function(){ townFinish(f); });
    on('[data-tw-open]', function(b){ townOpenTalk(b.dataset.twOpen); });
    on('[data-tw-again]', function(){ townOpenTalk(f.id); });
    on('[data-tw-sayko]', function(b){ try { Speech.speak(b.dataset.twSayko); } catch(x){} });
    on('[data-tw-pat]', function(b){ townStop(); openPatterns(b.dataset.twPat); });
    var form = app.querySelector('[data-tw-form]');
    if(form) form.addEventListener('submit', function(e){ e.preventDefault(); townTyped(f); });
    var inp = app.querySelector('#twType');
    if(inp) inp.addEventListener('input', function(){ T.typed = inp.value; });
  }
