  /* ---------- THE LIGHTHOUSE: real-world Korean, and the manners that go with it ----------
     The sixth new region of the sea chart (seamap.js), for culture and real life. One screen (S.view 'light',
     state in S.light) with three faces:
       the list     the ten signs of light-data.js (each with a meter of its two questions) and the eight manners notes
       a sign       drawn as a styled card, the Korean as it really appears. Tap any word for its meaning and its
                    sound (a word she didn't know goes in My words, as in Story Lagoon). Then two quick questions,
                    each picked from three answers.
       a note       one manners note: its phrases to hear, a few short paragraphs, and a tip for the trip
     Looking a word up records 'read' (hard when she knew it, again when she didn't); answering a question records
     'read' for the word it's about, good when right the first time.
     Per profile in localStorage (cc-light-<profile id>): s, each sign's best number of questions right (0–2);
     m, the notes read. Losing it only loses the ticks. */
  function lhStoreKey(){ return 'cc-light-' + (S.profile && S.profile.id || 'guest'); }
  function lhData(){
    var d = null; try { d = JSON.parse(localStorage.getItem(lhStoreKey()) || 'null'); } catch(e){}
    d = d && typeof d === 'object' ? d : {}; d.s = d.s || {}; d.m = d.m || {};
    return d;
  }
  function lhSave(d){ try { localStorage.setItem(lhStoreKey(), JSON.stringify(d)); } catch(e){} }
  function lhSign(id){ return LH_SIGNS.find(function(s){ return s.id === id; }) || null; }
  function lhManner(id){ return LH_MANNERS.find(function(s){ return s.id === id; }) || null; }

  function openLight(){
    try { Speech.stop(); } catch(e){}
    S.currentDeckId = null;
    S.light = { view: 'list', deck: S.light && S.light.deck || null };
    S.view = 'light';
    render(); window.scrollTo(0, 0);
    var decks = (S.decks || []).filter(function(d){ return !d.archived; });
    Promise.all(decks.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); })).then(function(lists){
      if(S.light) S.light.deck = lagoonDeckWords([].concat.apply([], lists));
    }).catch(function(){});
  }
  function renderLight(){
    var L = S.light || (S.light = { view: 'list' });
    var sign = L.view === 'sign' && lhSign(L.id), note = L.view === 'manner' && lhManner(L.id);
    var back = sign || note ? '<button class="back-btn" data-act="lh-back">⟵ Lighthouse</button>' : '<button class="back-btn" data-act="lh-home">⟵ Reef</button>';
    var title = sign ? sign.en : note ? note.en : 'The Lighthouse';
    var body = sign ? lhSignPageHTML(sign, L) : note ? lhMannerHTML(note) : lhFrontHTML();
    app.innerHTML = '<div class="nav-row">' + back + '<span class="nav-title">' + ccIcon('lighthouse') + ' ' + esc(title) + '</span></div>' +
      '<div class="lg-page lh-page">' + body + '</div>';
    lhWire(L, sign);
  }

  /* ---------- The list ---------- */
  function lhFrontHTML(){
    var d = lhData();
    var signs = LH_SIGNS.map(function(s){
      var got = d.s[s.id] || 0, pct = Math.round(got / s.qs.length * 100);
      return '<li><button type="button" class="lg-story lh-pick' + (got === s.qs.length ? ' done' : '') + '" data-lh-sign="' + s.id + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(s.icon) + '</span>' +
        '<span class="lg-st"><b>' + esc(s.en) + '</b><span lang="ko">' + esc(lhWords(s)[0].ko) + '</span>' +
          '<span class="lg-meter" role="img" aria-label="' + got + ' of ' + s.qs.length + ' questions right"><i style="width:' + pct + '%"></i></span>' +
          '<small>' + (d.s[s.id] != null ? got + ' of ' + s.qs.length + ' right' : 'Not read yet') + '</small></span>' +
        '<span class="lg-tag">' + (got === s.qs.length ? ccIcon('check') + ' Read' : '') + '</span></button></li>';
    }).join('');
    var notes = LH_MANNERS.map(function(m){
      return '<li><button type="button" class="lg-story lh-pick' + (d.m[m.id] ? ' done' : '') + '" data-lh-manner="' + m.id + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(m.icon) + '</span>' +
        '<span class="lg-st"><b>' + esc(m.en) + '</b><span lang="ko">' + esc(m.say[0][0]) + '</span></span>' +
        '<span class="lg-tag">' + (d.m[m.id] ? ccIcon('check') + ' Read' : '') + '</span></button></li>';
    }).join('');
    return '<div class="lg-intro"><h2>Korean out in the world</h2><p>Menus, signs and receipts as you will meet them on your trip, and the manners that go with them.</p></div>' +
      '<h3 class="lh-h">' + ccIcon('search') + ' Signs to read</h3><ul class="lg-list lh-list">' + signs + '</ul>' +
      '<h3 class="lh-h">' + ccIcon('heart') + ' Manners</h3><ul class="lg-list lh-list">' + notes + '</ul>';
  }

  /* ---------- A sign ---------- */
  function lhSegHTML(text, ri, L){
    return lhSegs(text).map(function(seg, si){
      if(!seg.ko) return esc(seg.t);
      var on = L.word && L.word[0] === ri && L.word[1] === si;
      return '<button type="button" class="lh-w' + (on ? ' on' : '') + '" data-lh-w="' + ri + ':' + si + '" lang="ko">' + esc(seg.ko) + '</button>';
    }).join('');
  }
  function lhSignHTML(s, L){
    return '<div class="lh-sign lh-' + s.kind + '" role="group" aria-label="' + esc(s.en) + '">' + s.rows.map(function(r, ri){
      var cols = r[1].split('\t');
      if(cols.length > 1) return '<div class="lh-row lh-' + r[0] + '"><span>' + lhSegHTML(cols[0], ri, L) + '</span><span class="lh-r">' + lhSegHTML(cols[1], ri + 1000, L) + '</span></div>';
      return '<div class="lh-row lh-' + r[0] + '">' + lhSegHTML(r[1], ri, L) + '</div>';
    }).join('') + '</div>';
  }
  // The tapped word: ri over 1000 is the right-hand column of row ri - 1000
  function lhWordAt(s, at){
    if(!at) return null;
    var ri = at[0] % 1000, row = s.rows[ri]; if(!row) return null;
    var cols = row[1].split('\t'), text = at[0] >= 1000 ? cols[1] : cols[0];
    var seg = lhSegs(text || '')[at[1]];
    return seg && seg.ko ? seg : null;
  }
  function lhSay(w){ return w.say || w.ko; }
  function lhSignPageHTML(s, L){
    var w = lhWordAt(s, L.word), box = '';
    if(w) box = '<div class="lg-word" role="status"><button type="button" class="lg-mini lg-wsay" data-lh-say="' + esc(lhSay(w)) + '" aria-label="Hear ' + esc(w.ko) + '">' + ccIcon('sound') + '</button>' +
      '<div><b lang="ko">' + esc(w.ko) + '</b><span>' + esc(w.en) + '</span>' + (w.base && w.base !== w.ko ? '<small>From <span lang="ko">' + esc(w.base) + '</span></small>' : '') +
      (L.wordAdded ? '<small class="lg-added">' + ccIcon('sparkle') + ' Added to My words</small>' : '') + '</div>' +
      '<button type="button" class="lg-mini lg-wclose" data-lh-wclose aria-label="Close">' + ccIcon('close') + '</button></div>';
    var qs = s.qs.map(function(q, qi){
      var picked = L.ans[qi], order = L.order[qi];
      var opts = order.map(function(oi){
        var o = q.opts[oi], cls = picked == null ? '' : oi === 0 ? ' right' : oi === picked ? ' wrong' : ' dim';
        return '<li><button type="button" class="lg-opt lh-opt' + cls + '" data-lh-q="' + qi + ':' + oi + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span' + (/[가-힣]/.test(o) ? ' lang="ko"' : '') + '>' + esc(o) + '</span></button></li>';
      }).join('');
      var fb = picked == null ? '' : '<p class="lg-fb ' + (picked === 0 ? 'ok' : 'no') + '" role="status">' + ccIcon(picked === 0 ? 'check' : 'bulb') + '<span>' + (picked === 0 ? 'Yes! ' : 'Not quite. ') + esc(q.why) + '</span></p>';
      return '<div class="lg-quiz"><p class="lg-qn">Question ' + (qi + 1) + ' of ' + s.qs.length + '</p><div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('search') + '</span><div><b>' + esc(q.q) + '</b></div></div>' +
        '<ul class="lg-opts">' + opts + '</ul>' + fb + '</div>';
    }).join('');
    var i = LH_SIGNS.indexOf(s), next = LH_SIGNS[i + 1];
    var all = s.qs.every(function(q, qi){ return L.ans[qi] != null; });
    return '<p class="lg-hint">' + ccIcon('story') + ' Read it the way you would on your trip. Tap any word to see what it means and hear it.</p>' +
      lhSignHTML(s, L) + box + qs +
      (all ? '<div class="lg-bar">' + (next ? '<button type="button" class="btn btn-primary" data-lh-sign="' + next.id + '">Next: ' + esc(next.en) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-act="lh-list">' + ccIcon('lighthouse') + ' All signs</button></div>' : '');
  }
  function lhOpenSign(L, id){
    var s = lhSign(id); if(!s) return;
    L.view = 'sign'; L.id = id; L.word = null; L.wordAdded = false; L.ans = {}; L.looked = {};
    L.order = s.qs.map(function(q){ return shuffle(q.opts.map(function(o, i){ return i; })); });
  }
  function lhTapWord(s, L, at){
    L.word = at; L.wordAdded = false;
    var w = lhWordAt(s, at); if(!w) return;
    var known = lagoonKnows(w, L.deck), k = learnerKey(w.ko);
    if(k && !L.looked[k]){ L.looked[k] = 1; try { Learner.record(w.ko, 'read', known ? 'hard' : 'again'); } catch(e){} }
    if(!known) myWordsAdd(w.ko, w.en, 'asked').then(function(ok){ if(ok && L.word === at && S.view === 'light'){ L.wordAdded = true; lhKeep(); } }).catch(function(){});
    try { Speech.speak(lhSay(w)); } catch(e){}
    lhKeep();
    var on = app.querySelector('.lh-w.on'), card = app.querySelector('.lg-word');
    if(on && card){ var gap = on.getBoundingClientRect().bottom - card.getBoundingClientRect().top + 16; if(gap > 0) window.scrollBy({ top: gap, behavior: reefCalm() ? 'auto' : 'smooth' }); }
  }
  function lhAnswer(s, L, qi, oi){
    if(L.ans[qi] != null) return;
    L.ans[qi] = oi;
    var ok = oi === 0, q = s.qs[qi];
    try { Learner.record(q.key, 'read', ok ? 'good' : 'again'); } catch(e){}
    try { if(ok) Sound.correct(); else Sound.wrong(); } catch(e){}
    if(s.qs.every(function(x, i){ return L.ans[i] != null; })){
      var right = s.qs.filter(function(x, i){ return L.ans[i] === 0; }).length, d = lhData();
      d.s[s.id] = Math.max(d.s[s.id] || 0, right); lhSave(d);
      deckTick('sign', s.id);   // a leg of Captain's Deck's voyage, if today's has this sign
      if(right === s.qs.length) try { if(!reefCalm()) Ocean.bubbles(8); } catch(e){}
    }
    lhKeep();
  }
  function lhKeep(){ var y = window.scrollY; renderLight(); window.scrollTo(0, y); }

  /* ---------- A manners note ---------- */
  function lhMannerHTML(m){
    var i = LH_MANNERS.indexOf(m), next = LH_MANNERS[i + 1];
    return '<div class="lg-title"><h2>' + esc(m.en) + '</h2></div>' +
      '<section class="tw-sec"><h3>' + ccIcon('sound') + ' Say it</h3><ul class="pr-ex">' + m.say.map(function(p){
        return '<li><button type="button" class="lg-mini" data-lh-say="' + esc(p[0]) + '" aria-label="Hear ' + esc(p[0]) + '">' + ccIcon('sound') + '</button><span><b lang="ko">' + esc(p[0]) + '</b><small>' + esc(p[1]) + '</small></span></li>';
      }).join('') + '</ul></section>' +
      '<section class="pr-rule lh-body">' + m.body.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('') + '</section>' +
      '<p class="pr-note lh-tip">' + ccIcon('compass') + '<span><b>On your trip:</b> ' + esc(m.tip) + '</span></p>' +
      '<div class="lg-bar">' + (next ? '<button type="button" class="btn btn-primary" data-lh-manner="' + next.id + '">Next: ' + esc(next.en) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-act="lh-list">' + ccIcon('lighthouse') + ' All notes</button></div>';
  }
  function lhOpenManner(L, id){
    var m = lhManner(id); if(!m) return;
    L.view = 'manner'; L.id = id;
    var d = lhData(); d.m[id] = Date.now(); lhSave(d);
  }

  function lhWire(L, s){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ fn(x, e); }); }); }
    function list(){ try { Speech.stop(); } catch(e){} L.view = 'list'; L.id = null; renderLight(); window.scrollTo(0, 0); }
    on('[data-act="lh-home"]', function(){ try { Speech.stop(); } catch(e){} goHome(); });
    on('[data-act="lh-back"]', list);
    on('[data-act="lh-list"]', list);
    on('[data-lh-sign]', function(x){ try { Speech.stop(); } catch(e){} lhOpenSign(L, x.dataset.lhSign); renderLight(); window.scrollTo(0, 0); });
    on('[data-lh-manner]', function(x){ try { Speech.stop(); } catch(e){} lhOpenManner(L, x.dataset.lhManner); renderLight(); window.scrollTo(0, 0); });
    on('[data-lh-say]', function(x){ try { Speech.speak(x.dataset.lhSay); } catch(e){} });
    if(!s) return;
    on('[data-lh-w]', function(x){ var p = x.dataset.lhW.split(':'); lhTapWord(s, L, [+p[0], +p[1]]); });
    on('[data-lh-wclose]', function(){ L.word = null; lhKeep(); });
    on('[data-lh-q]', function(x){ var p = x.dataset.lhQ.split(':'); lhAnswer(s, L, +p[0], +p[1]); });
  }
  // Test helper: the right answer's button for a question on screen
  window.__lhRight = function(qi){ return '[data-lh-q="' + qi + ':0"]'; };
