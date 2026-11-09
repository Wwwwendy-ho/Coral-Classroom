  /* ---------- BOTTLE BEACH: write back to 지수 ----------
     The fifth new region of the sea chart (seamap.js), for writing. One screen (S.view 'beach', state in S.beach)
     with three faces:
       the beach    the twelve bottles of beach-data.js, the first unanswered one suggested, a meter of letters
                    written, and links to her letters and to the Library's Hangul handwriting practice
       a bottle     지수's question (tap any word for its meaning and sound), then her reply: typed with the
                    device keyboard or built from tiles (the bottle's starters and words she knows). "Check my
                    reply" runs bbCheck on the device: what's right first, then at most two fixes, each rule's
                    fix linking to its pattern in Pattern Reef. "Send the bottle" brings 지수's reply, a letter
                    in a bottle picked from her pre-written answers by the words in the reply.
       her letters  the journal: every reply she sent, with 지수's question and answer, newest first
     A sentence that passes the rules records 'use' in the learner model (good); one with a slip is counted in
     Pattern Reef (patNote) when the bottle is sent, so it shows under "Patterns to repair".
     Per profile in localStorage (cc-bottles-<profile id>): { l: [{ id, at, text, r }] }, the letters, newest first
     (r is the index of 지수's reply). Losing it only loses the journal. */
  var BB_KEEP = 80;   // letters kept in the journal: plenty for a trip, and small in storage
  function bbStoreKey(){ return 'cc-bottles-' + (S.profile && S.profile.id || 'guest'); }
  function bbData(){
    var d = null; try { d = JSON.parse(localStorage.getItem(bbStoreKey()) || 'null'); } catch(e){}
    d = d && typeof d === 'object' ? d : {}; d.l = Array.isArray(d.l) ? d.l : [];
    return d;
  }
  function bbSave(d){ try { localStorage.setItem(bbStoreKey(), JSON.stringify(d)); } catch(e){} }
  function bbById(id){ return BB_BOTTLES.find(function(b){ return b.id === id; }) || null; }
  function bbAnswered(d){ var a = {}; d.l.forEach(function(x){ a[x.id] = 1; }); return a; }

  /* The dictionary for the spelling check: Ask Shelly's beginner words, Pattern Reef's nouns, and every word in
     the bottles, Story Lagoon, Harbor Town and the Lighthouse, plus her own cards. Built once per visit. */
  function bbLexicon(deck){
    var set = {};
    function add(t){ bbStems(t).forEach(function(s){ if(s) set[s] = 1; }); }
    function addLine(t){ String(t || '').split(/\s+/).forEach(add); }
    [KO_WORDS, KO_MORE, KO_FORMS].forEach(function(o){ Object.keys(o).forEach(add); });
    PAT_NOUNS.forEach(add);
    BB_BOTTLES.forEach(function(b){
      addLine(b.ko); bbWords(b).forEach(function(w){ add(w.base); });
      b.starters.forEach(addLine); b.models.forEach(function(m){ addLine(m[0]); }); b.replies.forEach(function(r){ addLine(r.ko); });
    });
    LAGOON_STORIES.forEach(function(s){ s.lines.forEach(function(l){ addLine(l[1]); lagoonWords(l).forEach(function(w){ add(w.base); }); }); });
    TOWN_FOLK.forEach(function(f){ Object.keys(f.nodes).forEach(function(k){
      var n = f.nodes[k]; if(n.t) addLine(n.t[0]);
      (n.c || []).forEach(function(c){ addLine(c.ko); (c.also || []).forEach(addLine); });
    }); });
    LH_SIGNS.forEach(function(s){ lhWords(s).forEach(function(w){ add(w.ko); add(w.base); }); });
    Object.keys(deck || {}).forEach(function(k){ if(k.indexOf(' ') === -1) add(k); });
    var list = Object.keys(set).filter(function(w){ return w.length >= 2; });
    return {
      has: function(w){ return !!set[w] || !!(deck && deck[learnerKey(w)]); },
      known: function(w){ return w.length > 0 && lagoonKnows({ ko: w }, deck); },
      list: list
    };
  }

  function openBeach(){
    try { Speech.stop(); } catch(e){}
    S.currentDeckId = null;
    S.beach = { id: null, view: 'list', deck: S.beach && S.beach.deck || null };
    S.view = 'beach';
    render(); window.scrollTo(0, 0);
    var decks = (S.decks || []).filter(function(d){ return !d.archived; });
    Promise.all(decks.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); })).then(function(lists){
      if(!S.beach) return;
      S.beach.deck = lagoonDeckWords([].concat.apply([], lists)); S.beach.lex = null;
      if(S.view === 'beach' && S.beach.view === 'list') render();
    }).catch(function(){});
  }
  function bbLex(B){ return B.lex || (B.lex = bbLexicon(B.deck)); }
  function renderBeach(){
    var B = S.beach || (S.beach = { view: 'list' }), b = bbById(B.id);
    var back = B.view === 'list' ? '<button class="back-btn" data-act="bb-home">⟵ Reef</button>' : '<button class="back-btn" data-act="bb-back">⟵ Beach</button>';
    var title = B.view === 'letters' ? 'Your letters' : b ? 'A bottle from 지수' : 'Bottle Beach';
    var body = B.view === 'letters' ? bbLettersHTML() : b ? (B.sent ? bbSentHTML(b, B) : bbBottleHTML(b, B)) : bbFrontHTML();
    app.innerHTML = '<div class="nav-row">' + back + '<span class="nav-title">' + ccIcon('bottle') + ' ' + esc(title) + '</span></div>' +
      '<div class="lg-page bb-page">' + body + '</div>';
    bbWire(B, b);
  }

  /* ---------- The beach ---------- */
  function bbFrontHTML(){
    var d = bbData(), done = bbAnswered(d), n = Object.keys(done).length;
    var next = BB_BOTTLES.find(function(b){ return !done[b.id]; });
    var pct = Math.round(n / BB_BOTTLES.length * 100);
    var rows = BB_BOTTLES.map(function(b){
      return '<li><button type="button" class="lg-story bb-bottle' + (done[b.id] ? ' done' : '') + (b === next ? ' best' : '') + '" data-bb-open="' + b.id + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon('bottle') + '</span>' +
        '<span class="lg-st"><b lang="ko">' + esc(b.ko) + '</b><small>' + esc(b.en) + '</small></span>' +
        '<span class="lg-tag">' + (done[b.id] ? ccIcon('check') + ' Answered' : b === next ? 'Open this' : '') + '</span></button></li>';
    }).join('');
    return '<div class="lg-intro"><h2>Messages in bottles</h2><p>Your new friend 지수 from Harbor Town writes about your trip and your day. Write back in a sentence or three, in Korean. She always answers.</p>' +
        '<span class="lg-meter bb-meter" role="img" aria-label="' + n + ' of ' + BB_BOTTLES.length + ' bottles answered"><i style="width:' + pct + '%"></i></span>' +
        '<small class="bb-count">' + n + ' of ' + BB_BOTTLES.length + ' bottles answered</small></div>' +
      '<div class="bb-links">' +
        '<button type="button" class="tw-sec bb-link" data-bb-letters>' + ccIcon('story') + '<span><b>Your letters</b><small>' + (d.l.length ? d.l.length + ' sent, with 지수\'s answers' : 'Your replies will be kept here') + '</small></span></button>' +
        '<button type="button" class="tw-sec bb-link" data-bb-hand>' + ccIcon('edit') + '<span><b>Hangul handwriting</b><small>Trace the letters by hand, in the Library</small></span></button>' +
      '</div>' +
      '<ul class="lg-list bb-list">' + rows + '</ul>';
  }

  /* ---------- A bottle ---------- */
  function bbSay(ko, label){ return '<button type="button" class="lg-mini" data-bb-say="' + esc(ko) + '" aria-label="Hear ' + esc(label || ko) + '">' + ccIcon('sound') + '</button>'; }
  function bbStart(b){
    var B = S.beach, lex = bbLex(B);
    // her words for tiles: nouns from Pattern Reef's list that she knows, a few each time
    var mine = shuffle(PAT_NOUNS.filter(function(w){ return w.length >= 2 && lex.known(w); })).slice(0, 6);
    B.id = b.id; B.view = 'bottle'; B.text = ''; B.fb = null; B.sent = null; B.word = null; B.wordAdded = false; B.showEn = false; B.showEx = false;
    B.mine = mine.filter(function(w){ return b.starters.indexOf(w) === -1; });
  }
  function bbLetterWordsHTML(b, B){
    return '<span class="lg-ko" lang="ko">' + b.ko.split(/\s+/).map(function(tok, wi){
      return '<button type="button" class="lg-w' + (B.word === wi ? ' on' : '') + '" data-bb-w="' + wi + '">' + esc(tok) + '</button>'; }).join(' ') + '</span>';
  }
  function bbBottleHTML(b, B){
    var letter = '<div class="bb-letter" role="group" aria-label="지수\'s letter">' +
        '<span class="bb-from">' + ccIcon('bottle') + ' From 지수</span>' + bbLetterWordsHTML(b, B) +
        (B.showEn ? '<span class="lg-en">' + esc(b.en) + '</span>' : '') +
        '<span class="lg-tools">' + bbSay(b.ko, 'the letter') +
          '<button type="button" class="lg-mini" data-bb-en aria-pressed="' + !!B.showEn + '">' + (B.showEn ? 'Hide English' : 'English') + '</button></span></div>';
    var tiles = b.starters.map(function(t){ return '<button type="button" class="build-tile bb-tile" data-bb-tile="' + esc(t) + '" lang="ko">' + esc(t) + '</button>'; }).join('');
    var mine = (B.mine || []).map(function(t){ return '<button type="button" class="build-tile bb-tile mine" data-bb-tile="' + esc(t) + '" lang="ko">' + esc(t) + '</button>'; }).join('');
    var ex = B.showEx ? '<ul class="pr-ex bb-ex">' + b.models.map(function(m){ return '<li>' + bbSay(m[0]) + '<span><b lang="ko">' + esc(m[0]) + '</b><small>' + esc(m[1]) + '</small></span></li>'; }).join('') + '</ul>' : '';
    var write = '<section class="tw-sec bb-write"><h3>' + ccIcon('edit') + ' Your reply</h3>' +
        '<label for="bbText" class="bb-label">One to three sentences. Type with the Korean keyboard, or tap the tiles to build it.</label>' +
        '<textarea id="bbText" rows="3" lang="ko" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Write to 지수">' + esc(B.text || '') + '</textarea>' +
        '<div class="bb-tilebar"><button type="button" class="lg-mini" data-bb-undo>' + ccIcon('backspace') + ' Last word</button><button type="button" class="lg-mini" data-bb-clear>' + ccIcon('trash') + ' Clear</button></div>' +
        '<p class="bb-tiles-h">Sentence starters</p><div class="build-bank bb-tiles">' + tiles + '</div>' +
        (mine ? '<p class="bb-tiles-h">Words you know</p><div class="build-bank bb-tiles">' + mine + '</div>' : '') +
        '<button type="button" class="lg-mini bb-exbtn" data-bb-ex aria-pressed="' + !!B.showEx + '">' + ccIcon('bulb') + (B.showEx ? ' Hide examples' : ' Show examples') + '</button>' + ex +
      '</section>';
    var bar = '<div class="lg-bar"><button type="button" class="btn ' + (B.fb ? 'btn-ghost' : 'btn-primary') + '" data-bb-check>' + ccIcon('search') + ' Check my reply</button>' +
      (B.fb && B.fb.sentences.length ? '<button type="button" class="btn btn-primary" data-bb-send>' + ccIcon('bottle') + ' Send the bottle</button>' : '') + '</div>';
    return letter + bbWordBoxHTML(b, B) + write + (B.fb ? bbFeedbackHTML(B.fb) : '') + bar;
  }
  function bbWordBoxHTML(b, B){
    var w = B.word != null && bbWords(b)[B.word]; if(!w) return '';
    return '<div class="lg-word" role="status"><button type="button" class="lg-mini lg-wsay" data-bb-say="' + esc(w.ko.replace(/[?!.]/g, '')) + '" aria-label="Hear ' + esc(w.ko) + '">' + ccIcon('sound') + '</button>' +
      '<div><b lang="ko">' + esc(w.ko) + '</b><span>' + esc(w.en) + '</span>' + (w.base && w.base !== w.ko ? '<small>From <span lang="ko">' + esc(w.base) + '</span></small>' : '') +
      (B.wordAdded ? '<small class="lg-added">' + ccIcon('sparkle') + ' Added to My words</small>' : '') + '</div>' +
      '<button type="button" class="lg-mini lg-wclose" data-bb-wclose aria-label="Close">' + ccIcon('close') + '</button></div>';
  }
  // What's right first, in green, then at most two things to look at: never a page of red
  function bbFeedbackHTML(fb){
    if(!fb.sentences.length) return '<p class="lg-fb no bb-empty" role="status">' + ccIcon('bulb') + '<span>Write your reply in Korean letters: type it, or tap the tiles.</span></p>';
    var n = fb.sentences.length, right = [];
    right.push(esc(n === 1 ? 'One sentence, written in Korean.' : n + ' sentences, written in Korean.'));
    if(fb.polite) right.push(esc((n === 1 ? 'It ends' : 'Every sentence ends') + ' politely with -요, just right for a new friend.'));
    fb.good.slice(0, 3).forEach(function(g){ var p = patById(g.pat); if(p) right.push(esc('You used ' + p.en.toLowerCase() + ' (' + p.ko + '): ') + '<b lang="ko">' + esc(g.word) + '</b>'); });
    var good = '<section class="tw-sec bb-good"><h3>' + ccIcon('check') + ' What\'s right</h3><ul>' + right.map(function(r){ return '<li>' + r + '</li>'; }).join('') + '</ul>' +
      (fb.known.length ? '<p class="bb-known">Words you know: ' + fb.known.map(function(w){ return '<span class="bb-chip" lang="ko">' + esc(w) + '</span>'; }).join(' ') + '</p>' : '') + '</section>';
    var fixes = !fb.fixes.length ? '<p class="lg-fb ok" role="status">' + ccIcon('sparkle') + '<span>Nothing to fix. Ready to send!</span></p>' :
      '<section class="tw-sec bb-fix" role="status"><h3>' + ccIcon('bulb') + (fb.fixes.length === 1 ? ' One thing to look at' : ' Two things to look at') + '</h3><ul>' +
        fb.fixes.map(function(f){
          var p = f.pat && patById(f.pat);
          return '<li><span><span class="bb-pair"><b lang="ko">' + esc(f.word) + '</b>' + (f.fix ? ' → <b lang="ko">' + esc(f.fix) + '</b>' : '') + '</span><small>' + esc(f.kind === 'spell' ? 'Maybe a spelling slip. ' + f.why : f.why) + '</small></span>' +
            (p ? '<button type="button" class="btn btn-ghost" data-bb-pat="' + p.id + '">' + ccIcon('sentence') + '<span>See it in Pattern Reef<small>' + esc(p.en) + ' <span lang="ko">' + esc(p.ko) + '</span></small></span></button>' : '') + '</li>';
        }).join('') + '</ul><p>Fix it and check again, or send it as it is: 지수 will understand.</p></section>';
    return good + fixes;
  }
  function bbCheckNow(B){
    var inp = app.querySelector('#bbText'); if(inp) B.text = inp.value;
    B.fb = bbCheck(B.text, bbLex(B));
    try { if(B.fb.fixes.length) Sound.bloop(420); else Sound.correct(); } catch(e){}
    var y = window.scrollY; renderBeach(); window.scrollTo(0, y);
    var fb = app.querySelector('.bb-good, .bb-empty');
    if(fb) try { fb.scrollIntoView({ block: 'nearest', behavior: reefCalm() ? 'auto' : 'smooth' }); } catch(e){}
  }
  // Sending: the learner model hears the sentences that pass, slips go to Pattern Reef, the letter is kept,
  // and 지수's answer washes up
  function bbSend(b, B){
    var inp = app.querySelector('#bbText'); if(inp) B.text = inp.value;
    var fb = bbCheck(B.text, bbLex(B)); if(!fb.sentences.length){ B.fb = fb; return renderBeach(); }
    fb.clean.forEach(function(s){ try { Learner.record(s, 'use', 'good'); } catch(e){} });
    try { patNote(B.text, { typed: true }, 'Bottle Beach'); } catch(e){}
    var r = bbReply(b, B.text), d = bbData();
    d.l.unshift({ id: b.id, at: Date.now(), text: B.text.trim().slice(0, 400), r: b.replies.indexOf(r) });
    d.l = d.l.slice(0, BB_KEEP); bbSave(d);
    deckTick('letter', b.id);   // a leg of Captain's Deck's voyage, if today's has this bottle
    B.sent = { r: r, showEn: false };
    try { reefWinSound(true); } catch(e){}
    try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
    renderBeach(); window.scrollTo(0, 0);
    setTimeout(function(){ if(S.view === 'beach' && S.beach === B && B.sent) try { Speech.speak(r.ko); } catch(e){} }, 700);
  }
  function bbSentHTML(b, B){
    var r = B.sent.r, d = bbData(), done = bbAnswered(d);
    var next = BB_BOTTLES.find(function(x){ return !done[x.id]; });
    return '<div class="bb-mine"><span class="bb-from">You wrote</span><p lang="ko">' + esc(B.text) + '</p></div>' +
      '<div class="bb-letter bb-reply' + (reefCalm() ? '' : ' wash') + '" role="status"><span class="bb-art" aria-hidden="true">' + ccIcon('bottle') + '</span>' +
        '<span class="bb-from">' + ccIcon('heart') + ' 지수 wrote back</span><span class="lg-ko" lang="ko">' + esc(r.ko) + '</span>' +
        (B.sent.showEn ? '<span class="lg-en">' + esc(r.en) + '</span>' : '') +
        '<span class="lg-tools">' + bbSay(r.ko, '지수\'s answer') +
          '<button type="button" class="lg-mini" data-bb-ren aria-pressed="' + !!B.sent.showEn + '">' + (B.sent.showEn ? 'Hide English' : 'English') + '</button></span></div>' +
      '<p class="lg-hint">' + ccIcon('story') + ' Kept in your letters.</p>' +
      '<div class="lg-bar">' + (next ? '<button type="button" class="btn btn-primary" data-bb-open="' + next.id + '">' + ccIcon('bottle') + ' Next bottle</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-bb-letters>' + ccIcon('story') + ' Your letters</button>' +
        '<button type="button" class="btn btn-ghost" data-act="bb-list">All bottles</button></div>';
  }

  /* ---------- Her letters ---------- */
  function bbLettersHTML(){
    var d = bbData();
    if(!d.l.length) return '<div class="lg-intro"><h2>Your letters</h2><p>Nothing sent yet. Open a bottle from 지수 and write back: every reply is kept here, with her answer.</p></div>' +
      '<div class="lg-bar"><button type="button" class="btn btn-primary" data-act="bb-list">' + ccIcon('bottle') + ' The bottles</button></div>';
    return '<div class="lg-intro"><h2>Your letters</h2><p>' + d.l.length + (d.l.length === 1 ? ' letter' : ' letters') + ' to 지수, newest first.</p></div>' +
      '<ol class="bb-journal">' + d.l.map(function(x){
        var b = bbById(x.id), r = b && b.replies[x.r];
        if(!b) return '';
        return '<li class="tw-sec"><small class="bb-date">' + esc(new Date(x.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })) + '</small>' +
          '<p class="bb-q"><span lang="ko">' + esc(b.ko) + '</span><small>' + esc(b.en) + '</small></p>' +
          '<p class="bb-you" lang="ko">' + esc(x.text) + '</p>' +
          (r ? '<p class="bb-her">' + bbSay(r.ko, '지수\'s answer') + '<span><span lang="ko">' + esc(r.ko) + '</span><small>' + esc(r.en) + '</small></span></p>' : '') + '</li>';
      }).join('') + '</ol>';
  }

  function bbTapWord(b, B, wi){
    var w = bbWords(b)[wi]; if(!w) return;
    B.word = wi; B.wordAdded = false;
    var known = lagoonKnows(w, B.deck);
    B.looked = B.looked || {};
    var k = learnerKey(w.ko);
    if(k && !B.looked[k]){ B.looked[k] = 1; try { Learner.record(w.ko, 'read', known ? 'hard' : 'again'); } catch(e){} }
    if(!known) myWordsAdd(w.ko.replace(/[?!.]/g, ''), w.en, 'asked').then(function(ok){ if(ok && B.word === wi && S.view === 'beach' && B.id === b.id && !B.sent){ B.wordAdded = true; bbKeep(B); } }).catch(function(){});
    try { Speech.speak(w.ko.replace(/[?!.]/g, '')); } catch(e){}
    bbKeep(B);
  }
  // Re-render in place, keeping where the page was. What she types is already in B.text (the input listener in
  // bbWire), so a tile, Undo or Clear that just changed B.text isn't overwritten by the box's old value.
  function bbKeep(B){
    var y = window.scrollY; renderBeach(); window.scrollTo(0, y);
  }
  function bbAddTile(B, t){
    var inp = app.querySelector('#bbText'); if(inp) B.text = inp.value;
    var cur = String(B.text || '').replace(/\s+$/, '');
    B.text = (cur ? cur + ' ' : '') + t;
    try { Sound.bloop(520); } catch(e){}
    bbKeep(B);
  }
  function openHandwriting(){
    var L = window.CoralLibrary; if(!L) return;
    try { Speech.stop(); } catch(e){}
    L.open(); L.go('wsMake', JSON.stringify({ src: 'trace', script: 'hangul' }));
  }

  function bbWire(B, b){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ fn(x, e); }); }); }
    on('[data-act="bb-home"]', function(){ try { Speech.stop(); } catch(e){} goHome(); });
    on('[data-act="bb-back"]', function(){
      try { Speech.stop(); } catch(e){}
      var inp = app.querySelector('#bbText'); if(inp) B.text = inp.value;
      B.view = 'list'; B.id = null; renderBeach(); window.scrollTo(0, 0);
    });
    on('[data-act="bb-list"]', function(){ B.view = 'list'; B.id = null; renderBeach(); window.scrollTo(0, 0); });
    on('[data-bb-open]', function(x){ try { Speech.stop(); } catch(e){} var nb = bbById(x.dataset.bbOpen); if(!nb) return; bbStart(nb); renderBeach(); window.scrollTo(0, 0); });
    on('[data-bb-letters]', function(){ try { Speech.stop(); } catch(e){} B.view = 'letters'; B.id = null; renderBeach(); window.scrollTo(0, 0); });
    on('[data-bb-hand]', function(){ openHandwriting(); });
    on('[data-bb-say]', function(x){ try { Speech.speak(x.dataset.bbSay); } catch(e){} });
    if(!b) return;
    var inp = app.querySelector('#bbText');
    if(inp) inp.addEventListener('input', function(){ B.text = inp.value; });
    on('[data-bb-w]', function(x){ bbTapWord(b, B, +x.dataset.bbW); });
    on('[data-bb-wclose]', function(){ B.word = null; bbKeep(B); });
    on('[data-bb-en]', function(){ B.showEn = !B.showEn; bbKeep(B); });
    on('[data-bb-ex]', function(){ B.showEx = !B.showEx; bbKeep(B); });
    on('[data-bb-tile]', function(x){ bbAddTile(B, x.dataset.bbTile); });
    on('[data-bb-undo]', function(){ if(inp) B.text = inp.value; B.text = String(B.text || '').replace(/\s*\S+\s*$/, ''); bbKeep(B); });
    on('[data-bb-clear]', function(){ B.text = ''; B.fb = null; bbKeep(B); });
    on('[data-bb-check]', function(){ bbCheckNow(B); });
    on('[data-bb-send]', function(){ bbSend(b, B); });
    on('[data-bb-pat]', function(x){ try { Speech.stop(); } catch(e){} openPatterns(x.dataset.bbPat); });
    on('[data-bb-ren]', function(){ B.sent.showEn = !B.sent.showEn; bbKeep(B); });
  }
