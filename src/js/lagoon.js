  /* ---------- STORY LAGOON: listen first, then read ----------
     The first new region of the sea chart (seamap.js). A list of the built-in stories (lagoon-stories.js), the
     ones that fit best first, then a reader in four steps:
       listen   every line plays in the natural Korean voice and lights up as it plays, with a slower option
       read     tap any word for its meaning and its sound; a word she didn't know goes in My words
       quiz     two questions, each answered by picking one of three Korean answers
       done     the finish moment, as at the end of a deck
     A story fits best when about 90–95% of its words are already known: enough to follow it, with a few new ones
     to pick up. A word counts as known when the learner model (learner.js) says she would recognize it, reading
     or hearing it, with a 70% chance or better, or when it's on a card in one of her Korean decks.
     Screens: S.view 'lagoon' (the list) and 'lagoonRead' (one story), state in S.lagoon. Which stories she has
     finished is kept per profile in localStorage (cc-lagoon-done-<profile id>); losing it only loses the ticks. */
  var LAGOON_KNOWN_R = 0.7;
  var LAGOON_AIM = [0.90, 0.95];
  var LAGOON_ICON = { arrive:'globe', hotel:'bed', cafe:'cup', restaurant:'bowl', shopping:'bag', subway:'train', taxi:'car',
    way:'compass', meet:'wave', weather:'sun', market:'apple', goodbye:'heart' };

  // "여권=passport;좀=please" -> [{ ko, en, base }]
  function lagoonWords(line){
    return String(line[3] || '').split(';').map(function(p){ var b = p.split('='); return { ko: b[0], en: b[1] || '', base: b[2] || '' }; });
  }
  function lagoonStory(id){ return LAGOON_STORIES.find(function(s){ return s.id === id; }) || null; }
  function lagoonDoneKey(){ return 'cc-lagoon-done-' + (S.profile && S.profile.id || 'guest'); }
  function lagoonDone(){ try { return JSON.parse(localStorage.getItem(lagoonDoneKey()) || '{}') || {}; } catch(e){ return {}; } }
  function lagoonMarkDone(id, right){
    var d = lagoonDone(); d[id] = { at: Date.now(), right: right };
    try { localStorage.setItem(lagoonDoneKey(), JSON.stringify(d)); } catch(e){}
  }

  // Every Korean word and phrase on the profile's cards, as learner keys: whole sides, the parts of "A / B", and each
  // word of a sentence, so 커피 is known from "커피 한 잔 주세요" as well as from its own card.
  function lagoonDeckWords(cards){
    var set = {};
    function add(t){ var k = learnerKey(t); if(k && learnerHasHangul(k)) set[k] = 1; }
    cards.forEach(function(c){
      [c.front, c.back].forEach(function(side){
        var t = String(side || '').replace(/["“”]/g, '');
        if(!learnerHasHangul(t)) return;
        add(t);
        t.split('/').forEach(add);
        t.split(/\s+/).forEach(function(w){ add(w.replace(/[.,!?~]/g, '')); });
      });
    });
    return set;
  }
  function lagoonKnows(w, deck){
    var keys = [w.ko, w.base].filter(Boolean);
    for(var i = 0; i < keys.length; i++){
      var k = learnerKey(keys[i]);
      if(deck && deck[k]) return true;
      var rr = Learner.retrievability(keys[i], 'read'), rh = Learner.retrievability(keys[i], 'hear');
      if((rr != null && rr >= LAGOON_KNOWN_R) || (rh != null && rh >= LAGOON_KNOWN_R)) return true;
    }
    return false;
  }
  // -> { known, total, share }: each different word once
  function lagoonCoverage(s, deck){
    var seen = {}, known = 0, total = 0;
    s.lines.forEach(function(l){ lagoonWords(l).forEach(function(w){
      var k = learnerKey(w.ko); if(seen[k]) return; seen[k] = 1; total++;
      if(lagoonKnows(w, deck)) known++;
    }); });
    return { known: known, total: total, share: total ? known / total : 0 };
  }
  // How far a story is from the 90–95% aim: below it counts double, since too many new words is worse than too few.
  function lagoonMiss(share){ return share < LAGOON_AIM[0] ? (LAGOON_AIM[0] - share) * 2 : share > LAGOON_AIM[1] ? share - LAGOON_AIM[1] : 0; }
  function lagoonRanked(deck){
    var done = lagoonDone();
    return LAGOON_STORIES.map(function(s, i){
      var c = lagoonCoverage(s, deck);
      return { s: s, i: i, c: c, done: !!done[s.id], miss: lagoonMiss(c.share) };
    }).sort(function(a, b){ return (a.done - b.done) || (a.miss - b.miss) || (a.i - b.i); });   // stories already read go last
  }

  function openLagoon(){
    try { Speech.stop(); } catch(e){}
    S.currentDeckId = null;
    S.lagoon = { deck: S.lagoon && S.lagoon.deck || null };
    S.view = 'lagoon';
    render(); window.scrollTo(0, 0);
    var decks = (S.decks || []).filter(function(d){ return !d.archived; });
    Promise.all(decks.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); })).then(function(lists){
      if(!S.lagoon) return;
      S.lagoon.deck = lagoonDeckWords([].concat.apply([], lists));
      if(S.view === 'lagoon') render();
    }).catch(function(){});
  }
  function renderLagoon(){
    var L = S.lagoon || (S.lagoon = {}), list = lagoonRanked(L.deck);
    var best = list.find(function(x){ return !x.done; });
    var rows = list.map(function(x){
      var pct = Math.round(x.c.share * 100), fit = !x.miss && !x.done;
      return '<li><button type="button" class="lg-story' + (x.done ? ' done' : '') + (x === best ? ' best' : '') + '" data-lg-open="' + x.s.id + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(LAGOON_ICON[x.s.id] || 'story') + '</span>' +
        '<span class="lg-st"><b>' + esc(x.s.en) + '</b><span lang="ko">' + esc(x.s.ko) + '</span>' +
          '<span class="lg-meter" role="img" aria-label="You know ' + x.c.known + ' of its ' + x.c.total + ' words"><i style="width:' + pct + '%"></i></span>' +
          '<small>' + (L.deck ? 'Words you know: ' + pct + '%' : 'Counting your words…') + '</small></span>' +
        '<span class="lg-tag">' + (x.done ? ccIcon('check') + ' Read' : x === best ? 'Try this' : fit ? 'Good fit' : '') + '</span>' +
      '</button></li>';
    }).join('');
    app.innerHTML = '<div class="nav-row"><button class="back-btn" data-act="lg-home">⟵ Lagoon</button><span class="nav-title">' + ccIcon('story') + ' Story Lagoon</span></div>' +
      '<div class="lg-page">' +
        '<div class="lg-intro"><h2>Listen first, then read</h2><p>Short conversations for your trip. The best fit for you is at the top: most of its words you know already, and a few are new.</p></div>' +
        '<ul class="lg-list">' + rows + '</ul>' +
      '</div>';
    app.querySelector('[data-act="lg-home"]').addEventListener('click', function(){ goHome(); });
    app.querySelectorAll('[data-lg-open]').forEach(function(b){ b.addEventListener('click', function(){ lagoonOpenStory(b.dataset.lgOpen); }); });
  }

  function lagoonOpenStory(id){
    var s = lagoonStory(id); if(!s) return;
    try { Speech.stop(); } catch(e){}
    var L = S.lagoon || (S.lagoon = {});
    L.id = id; L.phase = 'listen'; L.playing = -1; L.slow = !!L.slow; L.showEn = {}; L.word = null; L.q = 0; L.picked = null; L.right = 0; L.graded = {}; L.heard = false;
    S.view = 'lagoonRead';
    try { Sound.bloop(560); } catch(e){}
    render(); window.scrollTo(0, 0);
  }
  function lagoonStop(){ var L = S.lagoon; if(L){ L.playing = -1; L.token = (L.token || 0) + 1; } try { Speech.stop(); } catch(e){} }
  // Plays the lines one after another from `from`, lighting each up as it plays
  function lagoonPlay(from){
    var L = S.lagoon, s = lagoonStory(L.id); if(!s) return;
    var token = L.token = (L.token || 0) + 1;
    function step(i){
      if(token !== L.token || S.view !== 'lagoonRead') return;
      if(i >= s.lines.length){ L.playing = -1; L.heard = true; lagoonPaint(); return; }
      L.playing = i; lagoonPaint();
      Speech.speakThen(s.lines[i][1], function(){ if(token === L.token) setTimeout(function(){ step(i + 1); }, L.slow ? 700 : 450); },
        L.slow ? { rate: 0.7, variant: 'slow' } : null);
    }
    step(from || 0);
  }
  // Only the parts that change while it plays are touched, so the page doesn't jump about
  function lagoonPaint(){
    var L = S.lagoon;
    app.querySelectorAll('[data-lg-line]').forEach(function(el){
      var on = +el.dataset.lgLine === L.playing;
      el.classList.toggle('playing', on);
      if(on && !reefCalm()) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    var pb = app.querySelector('[data-lg-play]');
    if(pb) pb.innerHTML = L.playing >= 0 ? ccIcon('sound-off') + ' Stop' : ccIcon(L.heard ? 'replay' : 'headphones') + (L.heard ? ' Listen again' : ' Listen');
    var nx = app.querySelector('[data-lg-next]'); if(nx) nx.classList.toggle('btn-primary', L.heard || L.phase !== 'listen');
  }

  function renderLagoonRead(){
    var L = S.lagoon || {}, s = lagoonStory(L.id);
    if(!s){ S.view = 'lagoon'; return renderLagoon(); }
    var head = '<div class="nav-row"><button class="back-btn" data-act="lg-back">⟵ Lagoon</button><span class="nav-title">' + ccIcon(LAGOON_ICON[s.id] || 'story') + ' ' + esc(s.en) + '</span></div>';
    var steps = [['listen', 'Listen'], ['read', 'Read'], ['quiz', 'Questions']];
    var at = L.phase === 'done' ? 3 : steps.map(function(x){ return x[0]; }).indexOf(L.phase);
    var stepsHTML = '<ol class="lg-steps" aria-label="Steps">' + steps.map(function(x, i){
      return '<li class="' + (i < at ? 'past' : i === at ? 'now' : '') + '"' + (i === at ? ' aria-current="step"' : '') + '>' + (i < at ? ccIcon('check') : '<span>' + (i + 1) + '</span>') + x[1] + '</li>'; }).join('') + '</ol>';
    var body = '';
    if(L.phase === 'listen' || L.phase === 'read') body = lagoonLinesHTML(s, L);
    else if(L.phase === 'quiz') body = lagoonQuizHTML(s, L);
    else body = lagoonDoneHTML(s, L);
    app.innerHTML = head + '<div class="lg-page lg-read' + (L.phase === 'listen' ? ' listening' : '') + '">' +
      '<div class="lg-title"><h2 lang="ko">' + esc(s.ko) + '</h2><span>' + esc(s.en) + '</span></div>' + (L.phase === 'done' ? '' : stepsHTML) + body + '</div>';
    lagoonWire(s, L);
  }
  function lagoonLinesHTML(s, L){
    var listen = L.phase === 'listen';
    var lines = s.lines.map(function(l, i){
      var who = s.cast[l[0]] || ['', ''];
      var words = listen ? '<span class="lg-ko" lang="ko">' + esc(l[1]) + '</span>' :
        '<span class="lg-ko" lang="ko">' + l[1].split(/\s+/).map(function(tok, wi){
          return '<button type="button" class="lg-w' + (L.word && L.word[0] === i && L.word[1] === wi ? ' on' : '') + '" data-lg-w="' + i + ':' + wi + '">' + esc(tok) + '</button>'; }).join(' ') + '</span>';
      return '<li class="lg-line' + (l[0] ? ' lg-me' : '') + (L.playing === i ? ' playing' : '') + '" data-lg-line="' + i + '">' +
        '<span class="lg-who">' + esc(who[0]) + '</span>' +
        '<div class="lg-bubble">' + words +
          (!listen && L.showEn[i] ? '<span class="lg-en">' + esc(l[2]) + '</span>' : '') +
          (listen ? '' : '<span class="lg-tools"><button type="button" class="lg-mini" data-lg-say="' + i + '" aria-label="Hear this line">' + ccIcon('sound') + '</button>' +
            '<button type="button" class="lg-mini" data-lg-en="' + i + '" aria-pressed="' + !!L.showEn[i] + '">' + (L.showEn[i] ? 'Hide English' : 'English') + '</button></span>') +
        '</div></li>';
    }).join('');
    var wordBox = '';
    if(!listen && L.word){
      var w = lagoonWords(s.lines[L.word[0]])[L.word[1]];
      if(w) wordBox = '<div class="lg-word" role="status"><button type="button" class="lg-mini lg-wsay" data-lg-wsay aria-label="Hear ' + esc(w.ko) + '">' + ccIcon('sound') + '</button>' +
        '<div><b lang="ko">' + esc(w.ko) + '</b><span>' + esc(w.en) + '</span>' + (w.base && w.base !== w.ko ? '<small>From <span lang="ko">' + esc(w.base) + '</span></small>' : '') +
        (L.wordAdded ? '<small class="lg-added">' + ccIcon('sparkle') + ' Added to My words</small>' : '') + '</div>' +
        '<button type="button" class="lg-mini lg-wclose" data-lg-wclose aria-label="Close">' + ccIcon('close') + '</button></div>';
    }
    var hint = listen ? '<p class="lg-hint">' + ccIcon('ear') + ' Listen to the whole conversation first. Try to follow it before you read the words.</p>'
                      : '<p class="lg-hint">' + ccIcon('story') + ' Now read along. Tap any word to see what it means and hear it.</p>';
    var bar = '<div class="lg-bar">' +
      '<button type="button" class="btn ' + (listen && !L.heard ? 'btn-primary' : 'btn-ghost') + ' lg-play" data-lg-play>' + (L.playing >= 0 ? ccIcon('sound-off') + ' Stop' : ccIcon(L.heard ? 'replay' : 'headphones') + (L.heard ? ' Listen again' : ' Listen')) + '</button>' +
      '<button type="button" class="btn btn-ghost lg-slow" data-lg-slow aria-pressed="' + !!L.slow + '">' + ccIcon('turtle') + (L.slow ? ' Slower: on' : ' Slower') + '</button>' +
      '<button type="button" class="btn ' + (L.heard || !listen ? 'btn-primary' : 'btn-ghost') + ' lg-next" data-lg-next>' + (listen ? 'Now read it' : 'Questions') + '</button></div>';
    return hint + '<ol class="lg-lines">' + lines + '</ol>' + wordBox + bar;
  }
  function lagoonQuizHTML(s, L){
    var q = s.qs[L.q]; if(!q) return '';
    var picked = L.picked;
    var opts = q.o.map(function(o, i){
      var st = picked == null ? '' : i === q.a ? ' right' : i === picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt' + st + '" data-lg-opt="' + i + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span lang="ko">' + esc(o[0]) + '</span>' +
        (picked != null ? '<small>' + esc(o[1]) + '</small>' : '') + '</button></li>'; }).join('');
    var fb = picked == null ? '' : '<p class="lg-fb ' + (picked === q.a ? 'ok' : 'no') + '" role="status">' +
      (picked === q.a ? ccIcon('check') + ' ' + esc(reefPraiseLine()) : 'The answer is in this line: <span lang="ko">' + esc(s.lines[q.at[q.at.length - 1]][1]) + '</span>') + '</p>';
    return '<div class="lg-quiz"><p class="lg-qn">Question ' + (L.q + 1) + ' of ' + s.qs.length + '</p>' +
      '<div class="lg-q"><button type="button" class="lg-mini" data-lg-qsay aria-label="Hear the question">' + ccIcon('sound') + '</button><div><b lang="ko">' + esc(q.q) + '</b>' +
        (L.qEn || picked != null ? '<span>' + esc(q.en) + '</span>' : '<button type="button" class="lg-mini lg-qen" data-lg-qen>English</button>') + '</div></div>' +
      '<ul class="lg-opts">' + opts + '</ul>' + fb +
      (picked != null ? '<div class="lg-bar"><button type="button" class="btn btn-primary" data-lg-qnext>' + (L.q + 1 < s.qs.length ? 'Next question' : 'Finish') + '</button></div>' : '') + '</div>';
  }
  function lagoonDoneHTML(s, L){
    var n = s.qs.length, all = L.right === n;
    var nextUp = lagoonRanked(S.lagoon.deck).find(function(x){ return !x.done && x.s.id !== s.id; });
    return '<div class="summary-card reef-sum-card lg-done">' +
      '<span class="lg-done-ic" aria-hidden="true">' + ccIcon(all ? 'trophy' : 'star') + '</span>' +
      '<h2>' + (all ? 'Story finished!' : 'Story read!') + '</h2>' +
      '<p>' + esc(all ? reefPraiseLine() : 'Good listening. The lines you missed will come back in your practice.') + '</p>' +
      '<p class="lg-score">' + L.right + ' of ' + n + ' questions right</p>' +
      '<div class="reef-sum-actions">' +
        (nextUp ? '<button type="button" class="btn btn-primary" data-lg-open="' + nextUp.s.id + '">Next story: ' + esc(nextUp.s.en) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-lg-again>' + ccIcon('replay') + ' Read it again</button>' +
        '<button type="button" class="btn btn-ghost" data-act="lg-back">' + ccIcon('story') + ' All stories</button>' +
      '</div></div>';
  }

  // Records one answer per word per reading, so a word that shows up in both questions isn't counted twice
  function lagoonGrade(L, w, grade){
    var k = learnerKey(w.ko); if(!k || L.graded[k]) return;
    L.graded[k] = grade;
    try { Learner.record(w.ko, 'read', grade); } catch(e){}
  }
  function lagoonTapWord(s, L, li, wi){
    var w = lagoonWords(s.lines[li])[wi]; if(!w) return;
    lagoonStop();
    var known = lagoonKnows(w, L.deck);
    L.word = [li, wi]; L.wordAdded = false;
    // looking a word up says it wasn't sure: a word she didn't know is missed, one she did is "hard"
    lagoonGrade(L, w, known ? 'hard' : 'again');
    if(!known) myWordsAdd(w.ko, w.en, 'asked').then(function(ok){ if(ok && L.word && L.word[0] === li && L.word[1] === wi && S.view === 'lagoonRead'){ L.wordAdded = true; renderLagoonRead(); } }).catch(function(){});
    try { Speech.speak(w.ko); } catch(e){}
    renderLagoonRead();
    // the meaning card sits at the bottom of the screen: a word low down scrolls up so the card doesn't cover it
    var on = app.querySelector('.lg-w.on'), card = app.querySelector('.lg-word');
    if(on && card){ var gap = on.getBoundingClientRect().bottom - card.getBoundingClientRect().top + 16; if(gap > 0) window.scrollBy({ top: gap, behavior: reefCalm() ? 'auto' : 'smooth' }); }
  }
  function lagoonAnswer(s, L, i){
    var q = s.qs[L.q]; if(!q || L.picked != null) return;
    L.picked = i;
    var ok = i === q.a;
    if(ok){ L.right++; try { Sound.correct(); } catch(e){} } else { try { Sound.wrong(); } catch(e){} }
    q.at.forEach(function(li){ lagoonWords(s.lines[li]).forEach(function(w){ lagoonGrade(L, w, ok ? 'good' : 'again'); }); });
    renderLagoonRead();
    try { Speech.speak(q.o[q.a][0]); } catch(e){}
  }
  function lagoonFinish(s, L){
    L.phase = 'done';
    lagoonMarkDone(s.id, L.right);
    try { reefWinSound(true); } catch(e){}
    try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
    renderLagoonRead(); window.scrollTo(0, 0);
  }
  function lagoonWire(s, L){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(b){ b.addEventListener('click', function(e){ fn(b, e); }); }); }
    on('[data-act="lg-back"]', function(){ lagoonStop(); S.view = 'lagoon'; render(); window.scrollTo(0, 0); });
    on('[data-lg-play]', function(){ if(L.playing >= 0){ lagoonStop(); lagoonPaint(); } else lagoonPlay(0); });
    on('[data-lg-slow]', function(b){ L.slow = !L.slow; b.setAttribute('aria-pressed', String(L.slow)); b.innerHTML = ccIcon('turtle') + (L.slow ? ' Slower: on' : ' Slower');
      if(L.playing >= 0){ var at = L.playing; lagoonStop(); lagoonPlay(at); } });
    on('[data-lg-next]', function(){ lagoonStop(); if(L.phase === 'listen'){ L.phase = 'read'; L.heard = true; } else { L.phase = 'quiz'; L.word = null; } renderLagoonRead(); window.scrollTo(0, 0);
      if(L.phase === 'quiz') try { Speech.speak(s.qs[0].q); } catch(e){} });
    on('[data-lg-w]', function(b){ var p = b.dataset.lgW.split(':'); lagoonTapWord(s, L, +p[0], +p[1]); });
    on('[data-lg-wsay]', function(){ var w = L.word && lagoonWords(s.lines[L.word[0]])[L.word[1]]; if(w) try { Speech.speak(w.ko); } catch(e){} });
    on('[data-lg-wclose]', function(){ L.word = null; renderLagoonRead(); });
    on('[data-lg-say]', function(b){ lagoonStop(); var i = +b.dataset.lgSay; L.playing = i; lagoonPaint();
      var token = L.token; Speech.speakThen(s.lines[i][1], function(){ if(token === L.token){ L.playing = -1; lagoonPaint(); } }, L.slow ? { rate: 0.7, variant: 'slow' } : null); });
    on('[data-lg-en]', function(b){ var i = +b.dataset.lgEn; L.showEn[i] = !L.showEn[i]; renderLagoonRead(); });
    on('[data-lg-qsay]', function(){ try { Speech.speak(s.qs[L.q].q); } catch(e){} });
    on('[data-lg-qen]', function(){ L.qEn = true; renderLagoonRead(); });
    on('[data-lg-opt]', function(b){ lagoonAnswer(s, L, +b.dataset.lgOpt); });
    on('[data-lg-qnext]', function(){ if(L.q + 1 < s.qs.length){ L.q++; L.picked = null; L.qEn = false; renderLagoonRead(); try { Speech.speak(s.qs[L.q].q); } catch(e){} } else lagoonFinish(s, L); });
    on('[data-lg-open]', function(b){ lagoonOpenStory(b.dataset.lgOpen); });
    on('[data-lg-again]', function(){ lagoonOpenStory(s.id); });
  }
