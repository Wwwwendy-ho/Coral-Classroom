  /* ---------- PATTERN REEF: one sentence pattern at a time ----------
     The fourth new region of the sea chart (seamap.js), for grammar. One screen (S.view 'patterns', state in
     S.patterns) with three faces:
       the list     the twelve patterns of patterns-data.js in the order to learn them, each with its mastery
                    meter; the first one not yet mastered is suggested, but any can be opened. Above them,
                    "Patterns to repair": the patterns her slips point to, here and in Harbor Town.
       a pattern    how it works in plain words, and its examples to hear
       a round      its practice: notice it (pick the right sentence), build it (word tiles, as in Sentence
                    Builder), change it (present to past, a statement to "want to"...) and fix it (tap the wrong
                    word, then pick its repair). Then a celebration with the new mastery.
     Every answer tells the learner model: 'use' for the item's sentence, good when right the first time and
     again otherwise. A wrong answer goes through the mistake rules (patFind): a slip they recognize is counted
     against the pattern that repairs it, and anything else against the pattern being practiced.
     Per profile in localStorage (cc-patterns-<profile id>): m, each pattern's mastery (0–1, the latest round
     weighed equally with all before it); r, rounds played; s, slips per pattern ({ n: all, open: since the last
     good round, last: { said, fix, why, from } }). A round with at most one miss closes a pattern's open slips.
     Losing it only resets those. */
  var PAT_KIND = { notice: ['search', 'Notice it'], build: ['puzzle', 'Build it'], change: ['shuffle', 'Change it'], fix: ['edit', 'Fix it'] };
  var PAT_MASTERED = 0.8;
  function patStoreKey(){ return 'cc-patterns-' + (S.profile && S.profile.id || 'guest'); }
  function patData(){
    var d = null; try { d = JSON.parse(localStorage.getItem(patStoreKey()) || 'null'); } catch(e){}
    d = d && typeof d === 'object' ? d : {};
    d.m = d.m || {}; d.r = d.r || {}; d.s = d.s || {};
    return d;
  }
  function patSave(d){ try { localStorage.setItem(patStoreKey(), JSON.stringify(d)); } catch(e){} }
  function patById(id){ return PAT_LIST.find(function(p){ return p.id === id; }) || null; }
  // The slips in one answer, counted against the patterns that repair them; returns what the rules found
  function patNote(text, ctx, from){
    var found = patFind(text, ctx);
    if(found.length) patCount(found.map(function(f){ return { pat: f.pat, said: f.word, fix: f.fix, why: f.why }; }), from);
    return found;
  }
  function patCount(list, from){
    var d = patData();
    list.forEach(function(x){
      var s = d.s[x.pat] || (d.s[x.pat] = { n: 0, open: 0 });
      s.n++; s.open++; s.at = Date.now(); s.last = { said: x.said, fix: x.fix || '', why: x.why || '', from: from };
    });
    patSave(d);
  }
  // The patterns to repair: open slips, most first
  function patRepairs(d){
    return PAT_LIST.filter(function(p){ return d.s[p.id] && d.s[p.id].open > 0; })
      .sort(function(a, b){ return d.s[b.id].open - d.s[a.id].open || d.s[b.id].at - d.s[a.id].at; });
  }
  // The pattern to suggest: the first one, in order, not yet mastered
  function patNext(d){ return PAT_LIST.find(function(p){ return (d.m[p.id] || 0) < PAT_MASTERED; }) || null; }

  function openPatterns(id){
    try { Speech.stop(); } catch(e){}
    S.currentDeckId = null;
    S.patterns = { id: patById(id) ? id : null, round: null };
    S.view = 'patterns';
    render(); window.scrollTo(0, 0);
  }
  function renderPatterns(){
    var P = S.patterns || (S.patterns = {}), p = patById(P.id);
    var R = P.round, title = p ? p.en : 'Pattern Reef';
    var back = p ? '<button class="back-btn" data-act="pr-back">⟵ Reef</button>' : '<button class="back-btn" data-act="pr-home">⟵ Lagoon</button>';
    var body = !p ? patFrontHTML() : R ? (R.done ? patDoneHTML(p, R) : patItemHTML(p, R)) : patPageHTML(p);
    app.innerHTML = '<div class="nav-row">' + back + '<span class="nav-title">' + ccIcon('sentence') + ' ' + esc(title) + '</span></div>' +
      '<div class="lg-page pr-page">' + body + '</div>';
    patWire(P, p);
  }

  /* ---------- The list ---------- */
  function patMeter(d, p){
    var pct = Math.round((d.m[p.id] || 0) * 100);
    return '<span class="lg-meter" role="img" aria-label="' + esc(p.en) + ': ' + pct + '% mastered"><i style="width:' + pct + '%"></i></span>';
  }
  function patFrontHTML(){
    var d = patData(), next = patNext(d), fix = patRepairs(d);
    var rows = PAT_LIST.map(function(p, i){
      var m = d.m[p.id] || 0, done = m >= PAT_MASTERED, open = d.s[p.id] && d.s[p.id].open > 0;
      return '<li><button type="button" class="lg-story pr-pat' + (done ? ' done' : '') + (p === next ? ' best' : '') + '" data-pr-open="' + p.id + '">' +
        '<span class="lg-ic pr-num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="lg-st"><b>' + esc(p.en) + '</b><span lang="ko">' + esc(p.ko) + '</span><small>' + esc(p.sum) + '</small>' + patMeter(d, p) +
          '<small>' + (d.r[p.id] ? Math.round(m * 100) + '% mastered' : 'Not practiced yet') + '</small></span>' +
        '<span class="lg-tag">' + (open ? ccIcon('edit') + ' Repair' : done ? ccIcon('check') + ' Mastered' : p === next ? 'Next' : '') + '</span></button></li>';
    }).join('');
    return '<div class="lg-intro"><h2>One pattern at a time</h2><p>Twelve sentence patterns for your trip, in the order to learn them. Read how each one works, then notice it, build it, change it and fix it.</p></div>' +
      patRepairHTML(d, fix) + '<ul class="lg-list pr-list">' + rows + '</ul>';
  }
  function patRepairHTML(d, fix){
    if(!fix.length) return '';
    return '<section class="tw-sec pr-repair"><h3>' + ccIcon('edit') + ' Patterns to repair</h3><p>Slips from your answers here and in Harbor Town. A good round puts each one right.</p><ul class="pr-rlist">' +
      fix.slice(0, 3).map(function(p){
        var s = d.s[p.id], l = s.last || {};
        return '<li><span><b>' + esc(p.en) + '</b> <span lang="ko">' + esc(p.ko) + '</span>' +
          '<small>' + (l.said ? 'You said <b lang="ko">' + esc(l.said) + '</b>' + (l.fix ? '; better: <b lang="ko">' + esc(l.fix) + '</b>' : '') + (l.from ? ' (' + esc(l.from) + ')' : '') : '') + '</small>' +
          (s.open > 1 ? '<small>' + s.open + ' slips</small>' : '') + '</span>' +
          '<button type="button" class="btn btn-primary" data-pr-open="' + p.id + '">' + ccIcon('edit') + ' Repair</button></li>';
      }).join('') + '</ul></section>';
  }

  /* ---------- A pattern: how it works, and its examples ---------- */
  function patSay(ko){ return '<button type="button" class="lg-mini" data-pr-say="' + esc(ko) + '" aria-label="Hear ' + esc(ko) + '">' + ccIcon('sound') + '</button>'; }
  function patPageHTML(p){
    var d = patData(), i = PAT_LIST.indexOf(p), s = d.s[p.id], l = s && s.open > 0 && s.last;
    return '<div class="lg-title"><h2>' + esc(p.en) + '</h2><span lang="ko">' + esc(p.ko) + '</span>' + patMeter(d, p) + '</div>' +
      (l ? '<p class="pr-note">' + ccIcon('edit') + '<span>To repair: you said <b lang="ko">' + esc(l.said) + '</b>' + (l.fix ? ', better <b lang="ko">' + esc(l.fix) + '</b>' : '') + '. ' + esc(l.why) + '</span></p>' : '') +
      '<section class="pr-rule"><h3>' + ccIcon('bulb') + ' How it works</h3>' + p.rule.map(function(r){ return '<p>' + esc(r) + '</p>'; }).join('') + '</section>' +
      '<section class="tw-sec"><h3>' + ccIcon('sound') + ' Examples</h3><ul class="pr-ex">' +
        p.ex.map(function(e){ return '<li>' + patSay(e[0]) + '<span><b lang="ko">' + esc(e[0]) + '</b><small>' + esc(e[1]) + '</small></span></li>'; }).join('') + '</ul></section>' +
      '<div class="lg-bar"><button type="button" class="btn btn-primary" data-pr-start>' + ccIcon('puzzle') + ' Practice (' + p.items.length + ')</button>' +
        (PAT_LIST[i + 1] ? '<button type="button" class="btn btn-ghost" data-pr-open="' + PAT_LIST[i + 1].id + '">Next: ' + esc(PAT_LIST[i + 1].en) + '</button>' : '') + '</div>';
  }

  /* ---------- A round ---------- */
  function patWordsOf(s){ return String(s || '').split(/\s+/).filter(Boolean); }
  function patBare(s){ return String(s || '').replace(/[.,!?]/g, ''); }
  function patStart(p){
    S.patterns.round = { i: 0, right: 0, done: false, misses: [] };
    patItemStart(p);
    renderPatterns(); window.scrollTo(0, 0);
  }
  function patItemStart(p){
    var R = S.patterns.round, it = p.items[R.i], st = { answered: false, ok: false };
    if(it.k === 'notice' || it.k === 'change') st.opts = shuffle([it.ko].concat(it.wrong));
    if(it.k === 'build'){
      var tk = buildTokens(it.ko), tiles = tk.words.map(function(w, i){ return { id: 't' + i, t: w }; }).concat([{ id: 'x', t: it.extra }]);
      var order = shuffle(tiles);
      for(var k = 0; k < 6 && order.slice(0, tk.words.length).map(function(x){ return x.t; }).join(' ') === tk.words.join(' '); k++) order = shuffle(tiles);
      st.words = tk.words; st.end = tk.end; st.tiles = order; st.placed = []; st.locked = 0; st.attempt = 1;
    }
    if(it.k === 'fix'){
      var b = patWordsOf(it.bad), k2 = patWordsOf(it.ko), n = it.n || 1, tail = b.length - it.at - n;
      st.right = patBare(k2.slice(it.at, k2.length - tail).join(' '));
      st.opts = shuffle([st.right].concat(it.alt)); st.spot = null; st.wrongAt = []; st.picked = null;
    }
    R.st = st;
  }
  // One answer: the learner model hears it, a wrong one goes through the mistake rules, and the right sentence plays
  function patAnswer(p, ok, said){
    var R = S.patterns.round, it = p.items[R.i], st = R.st;
    st.answered = true; st.ok = ok;
    try { Learner.record(it.ko, 'use', ok ? 'good' : 'again'); } catch(e){}
    if(ok){ R.right++; try { Sound.correct(); } catch(e){} }
    else {
      R.misses.push(it.ko);
      var found = said ? patNote(said, {}, 'Pattern Reef') : [];
      if(!found.some(function(f){ return f.pat === p.id; })) patCount([{ pat: p.id, said: said || '', fix: patBare(it.ko), why: it.why }], 'Pattern Reef');
      try { Sound.wrong(); } catch(e){}
    }
    var y = window.scrollY; renderPatterns(); window.scrollTo(0, y);
    setTimeout(function(){ if(S.view === 'patterns' && S.patterns.round === R && R.st === st) try { Speech.speak(it.ko); } catch(e){} }, ok ? 350 : 650);
  }
  function patItemHTML(p, R){
    var it = p.items[R.i], st = R.st, K = PAT_KIND[it.k];
    var head = '<div class="lg-title"><h2>' + ccIcon(K[0]) + ' ' + K[1] + '</h2><span>' + esc(p.en) + ' · ' + (R.i + 1) + ' of ' + p.items.length + '</span>' +
      '<ol class="pr-dots" aria-hidden="true">' + p.items.map(function(x, i){ return '<li class="' + (i < R.i ? 'past' : i === R.i ? 'now' : '') + '"></li>'; }).join('') + '</ol></div>';
    var body = it.k === 'build' ? patBuildHTML(it, st) : it.k === 'fix' ? patFixHTML(it, st) : patChoiceHTML(it, st);
    var fb = '';
    if(st.answered){
      fb = '<p class="lg-fb ' + (st.ok ? 'ok' : 'no') + '" role="status">' + ccIcon(st.ok ? 'check' : 'bulb') + '<span>' + (st.ok ? 'Yes! ' : 'The right one: ') +
          '<b lang="ko">' + esc(it.ko) + '</b> ' + esc(it.en) + '</span>' + patSay(it.ko) + '</p>' +
        '<p class="pr-why">' + ccIcon('bulb') + '<span>' + esc(it.why) + '</span></p>' +
        '<div class="lg-bar"><button type="button" class="btn btn-primary" data-pr-next>' + (R.i + 1 < p.items.length ? 'Next' : 'Finish') + '</button></div>';
    }
    return head + body + fb;
  }
  function patChoiceHTML(it, st){
    var q = it.k === 'notice'
      ? '<div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('search') + '</span><div><b>Which one says "' + esc(it.en) + '"?</b><span>Pick the sentence that uses the pattern correctly.</span></div></div>'
      : '<div class="lg-q pr-from">' + patSay(it.from) + '<div><b lang="ko">' + esc(it.from) + '</b><span>' + esc(it.fromEn) + '</span><span class="pr-ask">' + ccIcon('shuffle') + esc(it.ask) + '</span></div></div>';
    var opts = st.opts.map(function(o, i){
      var cls = !st.answered ? '' : o === it.ko ? ' right' : i === st.picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt pr-opt' + cls + '" data-pr-pick="' + i + '"' + (st.answered ? ' aria-disabled="true"' : '') + '><span lang="ko">' + esc(o) + '</span></button></li>';
    }).join('');
    return q + '<ul class="lg-opts">' + opts + '</ul>';
  }
  function patBuildHTML(it, st){
    var byId = {}; st.tiles.forEach(function(t){ byId[t.id] = t; });
    var done = st.answered, slots = st.placed.map(function(id, i){
      var lock = i < st.locked || done;
      return '<button type="button" class="build-tile placed' + (lock && (!done || st.ok) ? ' ok' : '') + '" data-pr-placed="' + i + '"' + (lock ? ' disabled' : '') + ' lang="ko">' + esc(byId[id].t) + '</button>';
    }).join('');
    if(done && !st.ok) slots = st.words.map(function(w){ return '<span class="build-tile placed ok" lang="ko">' + esc(w) + '</span>'; }).join('');
    for(var e = done ? st.words.length : st.placed.length; e < st.words.length; e++) slots += '<span class="build-slot" aria-hidden="true"></span>';
    var bank = done ? '' : st.tiles.filter(function(t){ return st.placed.indexOf(t.id) === -1; }).map(function(t){
      return '<button type="button" class="build-tile" data-pr-tile="' + t.id + '" lang="ko">' + esc(t.t) + '</button>'; }).join('');
    return '<div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('puzzle') + '</span><div><b>' + esc(it.en) + '</b><span>' +
        (st.attempt > 1 && !done ? 'Nearly! The green tiles are right; one more try.' : 'Tap the tiles in order. One tile doesn\'t belong.') + '</span></div></div>' +
      '<div class="build-line pr-line" aria-label="Your sentence">' + slots + (st.end ? '<span class="build-end">' + esc(st.end) + '</span>' : '') + '</div>' +
      (bank ? '<div class="build-bank">' + bank + '</div>' : '') +
      (!done && st.placed.length > st.locked ? '<div class="lg-bar"><button type="button" class="btn btn-ghost" data-pr-undo>' + ccIcon('back') + ' Undo</button></div>' : '');
  }
  function patFixHTML(it, st){
    var n = it.n || 1, words = patWordsOf(it.bad);
    var line = words.map(function(w, i){
      var inSpot = i >= it.at && i < it.at + n, cls = st.spot && inSpot ? ' spot' : st.wrongAt.indexOf(i) !== -1 ? ' miss' : '';
      if(st.spot && inSpot && st.picked != null){ if(i > it.at) return ''; w = (st.ok ? st.right : st.opts[st.picked]) + (words[it.at + n - 1].match(/[.,!?]+$/) || [''])[0]; }
      return '<button type="button" class="pr-word' + cls + '" data-pr-word="' + i + '"' + (st.spot ? ' disabled' : '') + ' lang="ko">' + esc(w) + '</button>';
    }).join(' ');
    var ask = !st.spot ? '<b>One part is wrong. Tap it.</b><span>' + (st.wrongAt.length ? 'Not that one. Look again.' : it.ctx ? esc(it.ctx) : 'It should say: ' + esc(it.en)) + '</span>'
      : '<b>Now pick the repair.</b><span>' + (st.spot === 'shown' ? 'This was the wrong part.' : 'Yes, that part is wrong.') + ' It should say: ' + esc(it.en) + '</span>';
    var opts = !st.spot ? '' : '<ul class="lg-opts pr-repairs">' + st.opts.map(function(o, i){
      var cls = st.picked == null ? '' : o === st.right ? ' right' : i === st.picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt pr-opt' + cls + '" data-pr-fix="' + i + '"' + (st.picked != null ? ' aria-disabled="true"' : '') + '><span lang="ko">' + esc(o) + '</span></button></li>'; }).join('') + '</ul>';
    return '<div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('edit') + '</span><div>' + ask + '</div></div>' +
      '<p class="pr-fixline">' + line + '</p>' + opts;
  }
  function patTile(p, id){
    var R = S.patterns.round, st = R.st; if(st.answered || st.placed.indexOf(id) !== -1) return;
    st.placed.push(id);
    try { Sound.bloop(480 + st.placed.length * 40); } catch(e){}
    if(st.placed.length < st.words.length){ var y = window.scrollY; renderPatterns(); window.scrollTo(0, y); return; }
    var byId = {}; st.tiles.forEach(function(t){ byId[t.id] = t.t; });
    var built = st.placed.map(function(x){ return byId[x]; });
    if(built.join(' ') === st.words.join(' ')) return patAnswer(p, st.attempt === 1, built.join(' ') + st.end);
    if(st.attempt === 1){
      // the tiles right from the start stay, as in Sentence Builder; the rest go back for one more try
      var k = 0; while(k < built.length && built[k] === st.words[k]) k++;
      st.placed = st.placed.slice(0, k); st.locked = k; st.attempt = 2;
      try { Sound.wrong(); } catch(e){}
      var y2 = window.scrollY; renderPatterns(); window.scrollTo(0, y2);
      return;
    }
    patAnswer(p, false, built.join(' ') + st.end);
  }
  function patWord(p, i){
    var it = p.items[S.patterns.round.i], st = S.patterns.round.st, n = it.n || 1; if(st.spot) return;
    if(i >= it.at && i < it.at + n) st.spot = st.wrongAt.length ? 'late' : 'first';
    else { st.wrongAt.push(i); try { Sound.wrong(); } catch(e){} if(st.wrongAt.length >= 2) st.spot = 'shown'; }
    var y = window.scrollY; renderPatterns(); window.scrollTo(0, y);
  }
  function patFix(p, i){
    var it = p.items[S.patterns.round.i], st = S.patterns.round.st; if(!st.spot || st.picked != null) return;
    st.picked = i;
    var good = st.opts[i] === st.right, w = patWordsOf(it.bad), n = it.n || 1;
    var said = w.slice(0, it.at).concat([st.opts[i]], w.slice(it.at + n)).join(' ');
    patAnswer(p, good && st.spot === 'first', good ? (st.spot === 'first' ? '' : it.bad) : said);
  }
  function patNextItem(p){
    var R = S.patterns.round;
    R.i++;
    if(R.i >= p.items.length) return patFinish(p);
    patItemStart(p);
    renderPatterns(); window.scrollTo(0, 0);
  }
  function patFinish(p){
    var R = S.patterns.round, d = patData(), score = R.right / p.items.length, before = d.m[p.id];
    d.m[p.id] = before == null ? score : (before + score) / 2;
    d.r[p.id] = (d.r[p.id] || 0) + 1;
    if(p.items.length - R.right <= 1 && d.s[p.id]) d.s[p.id].open = 0;   // a good round puts her slips right
    patSave(d);
    R.done = true; R.mastery = d.m[p.id];
    try { reefWinSound(R.right === p.items.length); } catch(e){}
    try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
    renderPatterns(); window.scrollTo(0, 0);
  }
  function patDoneHTML(p, R){
    var all = R.right === p.items.length, d = patData(), i = PAT_LIST.indexOf(p);
    var next = patNext(d), after = next && next !== p ? next : PAT_LIST[i + 1];
    var fixed = p.items.length - R.right <= 1;
    return '<div class="summary-card reef-sum-card lg-done">' +
        '<span class="lg-done-ic" aria-hidden="true">' + ccIcon(all ? 'trophy' : 'star') + '</span>' +
        '<h2>' + (all ? 'Pattern mastered!' : R.mastery >= PAT_MASTERED ? 'Well built!' : 'Round finished!') + '</h2>' +
        '<p>' + esc(all ? reefPraiseLine() : fixed ? 'Nearly every one right. This pattern is settling in.' : 'Good work. Read how it works once more, then try another round.') + '</p>' +
        '<p class="lg-score">' + R.right + ' of ' + p.items.length + ' right the first time</p>' +
        '<div class="pr-done-meter">' + patMeter(d, p) + '<small>' + Math.round(R.mastery * 100) + '% mastered</small></div>' +
        '<div class="reef-sum-actions">' +
          (after ? '<button type="button" class="btn btn-primary" data-pr-open="' + after.id + '">Next: ' + esc(after.en) + '</button>' : '') +
          '<button type="button" class="btn btn-ghost" data-pr-again>' + ccIcon('replay') + ' Practice again</button>' +
          '<button type="button" class="btn btn-ghost" data-act="pr-list">' + ccIcon('sentence') + ' All patterns</button>' +
        '</div></div>';
  }
  // Test helper: the right answer on screen (an option's index, a tile id, a word's index or a repair's index)
  window.__patAnswer = function(){
    var P = S.view === 'patterns' && S.patterns, R = P && P.round, p = P && patById(P.id); if(!R || R.done || R.st.answered) return null;
    var it = p.items[R.i], st = R.st;
    if(it.k === 'build'){ var w = st.words[st.placed.length]; var t = st.tiles.find(function(x){ return x.t === w && st.placed.indexOf(x.id) === -1; }); return { k: 'build', tile: t && t.id }; }
    if(it.k === 'fix') return st.spot ? { k: 'fix', repair: st.opts.indexOf(st.right) } : { k: 'fix', word: it.at };
    return { k: it.k, pick: st.opts.indexOf(it.ko) };
  };

  function patWire(P, p){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(b){ b.addEventListener('click', function(e){ fn(b, e); }); }); }
    on('[data-act="pr-home"]', function(){ try { Speech.stop(); } catch(e){} goHome(); });
    on('[data-act="pr-back"]', function(){
      try { Speech.stop(); } catch(e){}
      if(P.round && !P.round.done) P.round = null; else { P.id = null; P.round = null; }
      renderPatterns(); window.scrollTo(0, 0);
    });
    on('[data-act="pr-list"]', function(){ P.id = null; P.round = null; renderPatterns(); window.scrollTo(0, 0); });
    on('[data-pr-open]', function(b){ try { Speech.stop(); } catch(e){} P.id = b.dataset.prOpen; P.round = null; renderPatterns(); window.scrollTo(0, 0); });
    on('[data-pr-say]', function(b){ try { Speech.speak(b.dataset.prSay); } catch(e){} });
    if(!p) return;
    on('[data-pr-start]', function(){ patStart(p); });
    on('[data-pr-again]', function(){ patStart(p); });
    on('[data-pr-next]', function(){ patNextItem(p); });
    on('[data-pr-pick]', function(b){ var st = P.round && P.round.st; if(!st || st.answered) return; st.picked = +b.dataset.prPick; var o = st.opts[st.picked]; patAnswer(p, o === p.items[P.round.i].ko, o); });
    on('[data-pr-tile]', function(b){ patTile(p, b.dataset.prTile); });
    on('[data-pr-placed]', function(b){ var st = P.round.st, i = +b.dataset.prPlaced; if(st.answered || i < st.locked) return; st.placed.splice(i, 1); var y = window.scrollY; renderPatterns(); window.scrollTo(0, y); });
    on('[data-pr-undo]', function(){ var st = P.round.st; if(st.placed.length > st.locked){ st.placed.pop(); var y = window.scrollY; renderPatterns(); window.scrollTo(0, y); } });
    on('[data-pr-word]', function(b){ patWord(p, +b.dataset.prWord); });
    on('[data-pr-fix]', function(b){ patFix(p, +b.dataset.prFix); });
  }
