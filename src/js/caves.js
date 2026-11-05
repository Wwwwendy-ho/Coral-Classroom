  /* ---------- ECHO CAVES: hear the sounds, then say them ----------
     The third new region of the sea chart (seamap.js), for pronunciation. One screen (S.view 'caves', state in
     S.caves) with three parts, picked from its front page (S.caves.sec):
       pairs    Sound pairs: a word plays, she picks which of two or three look-alike words it was (달 / 탈 / 딸).
                Eight a round. The contrasts she misses come up more, and the ones she keeps missing are listed
                as "your tricky sounds". No microphone.
       shadow   Shadowing: a line she has met (her Korean cards, the Story Lagoon and Harbor Town lines she has
                finished), shortest first. She hears it, records herself, and sees her pitch line and length beside
                the voice's, both measured here on the device (cavesPitch in caves-sounds.js); then both play, one
                after the other. Nothing claims to judge her sounds: it only says how alike the pitch shape and the
                length are, kindly, and she says whether it sounded right. Without a microphone she says it along
                with the voice, as in Echo cards.
       rules    Sound rules: seven cards on the changes she meets first (한국어 said [한구거]...), each with examples
                to hear and a quick check.
     The microphone is asked for and handled exactly as in Echo cards (Mic, echoStartPhase in card-types.js), and
     recordings never leave the device: they live in this page's memory and are let go when she moves on.
     The learner model hears about it: 'hear' for each sound-pair word and each sound-rule check (good or again),
     'say' for each shadowed line (good when it sounded right the first time, hard after another try).
     Per profile in localStorage (cc-caves-<profile id>): how often each contrast is missed (c), which rules she has
     checked (rules) and how often she shadowed each line (said); losing it only resets those. */
  var CAVES_ROUND = 8;
  var CAVES_ICON = { pairs: 'ear', shadow: 'mic', rules: 'bulb' };
  function cavesStoreKey(){ return 'cc-caves-' + (S.profile && S.profile.id || 'guest'); }
  function cavesData(){
    var d = null; try { d = JSON.parse(localStorage.getItem(cavesStoreKey()) || 'null'); } catch(e){}
    d = d && typeof d === 'object' ? d : {};
    d.c = d.c || {}; d.rules = d.rules || {}; d.said = d.said || {};
    return d;
  }
  function cavesSave(d){ try { localStorage.setItem(cavesStoreKey(), JSON.stringify(d)); } catch(e){} }
  function cavesContrast(id){ return CAVES_PAIRS.find(function(c){ return c.id === id; }) || null; }
  // How shaky a contrast is, 0–1: a running share of misses that leans on the latest answers. Untried starts at .5.
  function cavesWeak(d, id){ var s = d.c[id]; return s ? s.w : 0.5; }
  // Her tricky sounds: tried twice or more, and missed often enough lately (a miss and then a right answer still counts); shakiest first
  function cavesTricky(d){
    return CAVES_PAIRS.filter(function(c){ var s = d.c[c.id]; return s && s.n >= 2 && s.w >= 0.4; })
      .sort(function(a, b){ return d.c[b.id].w - d.c[a.id].w; }).slice(0, 4);
  }

  function openCaves(sec){
    try { Speech.stop(); } catch(e){}
    cavesStopAll();
    S.currentDeckId = null;
    S.caves = { sec: sec || null, cards: S.caves && S.caves.cards || null, voice: !!(S.caves && S.caves.voice) };
    S.view = 'caves';
    render(); window.scrollTo(0, 0);
    // her Korean cards, for shadowing, and the voice index, to know which lines have the natural voice
    var decks = (S.decks || []).filter(function(d){ return !d.archived; });
    Promise.all(decks.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); })).then(function(lists){
      if(!S.caves) return;
      S.caves.cards = [].concat.apply([], lists);
      if(S.view === 'caves' && (!S.caves.sec || S.caves.sec === 'shadow') && !S.caves.line) render();
    }).catch(function(){});
    VoicePack.loadIndex().then(function(){
      if(!S.caves) return; S.caves.voice = true;
      if(S.view === 'caves' && (!S.caves.sec || S.caves.sec === 'shadow') && !S.caves.line) render();
    });
  }
  function cavesGo(sec){
    var C = S.caves; cavesStopAll();
    C.sec = sec; C.round = null; C.line = null; C.rule = null;
    if(sec === 'pairs') cavesRoundStart();
    render(); window.scrollTo(0, 0);
  }
  function cavesStopAll(){
    try { Speech.stop(); } catch(e){}
    cavesRecReset();
  }

  function renderCaves(){
    var C = S.caves || (S.caves = {});
    if(cavesRec && !C.line) cavesRecReset();
    var title = C.sec === 'pairs' ? 'Sound pairs' : C.sec === 'shadow' ? 'Shadowing' : C.sec === 'rules' ? 'Sound rules' : 'Echo Caves';
    var back = C.sec ? '<button class="back-btn" data-act="cv-back">⟵ Caves</button>' : '<button class="back-btn" data-act="cv-home">⟵ Lagoon</button>';
    var body = C.sec === 'pairs' ? cavesPairsHTML(C) : C.sec === 'shadow' ? (C.line ? cavesShadowHTML(C) : cavesLinesHTML(C)) :
      C.sec === 'rules' ? (C.rule ? cavesRuleHTML(C) : cavesRulesHTML()) : cavesFrontHTML(C);
    app.innerHTML = '<div class="nav-row">' + back + '<span class="nav-title">' + ccIcon(C.sec ? CAVES_ICON[C.sec] : 'mic') + ' ' + title + '</span></div>' +
      '<div class="lg-page cv-page">' + body + '</div>';
    cavesWire(C);
  }

  /* ---------- The front page: the three parts, and her tricky sounds ---------- */
  function cavesFrontHTML(C){
    var d = cavesData(), tricky = cavesTricky(d), lines = cavesLines(C), rulesDone = CAVES_RULES.filter(function(r){ return d.rules[r.id]; }).length;
    var pct = Math.round(rulesDone / CAVES_RULES.length * 100);
    function row(sec, name, ko, about, extra, tag){
      return '<li><button type="button" class="lg-story cv-sec" data-cv-go="' + sec + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(CAVES_ICON[sec]) + '</span>' +
        '<span class="lg-st"><b>' + name + '</b><span lang="ko">' + ko + '</span><small>' + about + '</small>' + extra + '</span>' +
        '<span class="lg-tag">' + (tag || '') + '</span></button></li>';
    }
    var rows = row('pairs', 'Sound pairs', '소리 짝', 'Hear a word, then pick which of two look-alike words it was.',
        tricky.length ? '<small>Tricky for you: <span lang="ko">' + tricky.map(function(c){ return esc(c.label); }).join(', ') + '</span></small>' : '', tricky.length ? '' : 'Start here') +
      row('shadow', 'Shadowing', '따라 말하기', 'Hear a line, say it yourself, and see your pitch beside the voice\'s.',
        '<small>' + (C.cards && C.voice ? lines.length + ' lines from your cards and stories' : 'Finding your lines…') + '</small>') +
      row('rules', 'Sound rules', '발음 규칙', 'Why 한국어 is said [한구거]: the changes you can hear.',
        '<span class="lg-meter" role="img" aria-label="' + rulesDone + ' of ' + CAVES_RULES.length + ' rules checked"><i style="width:' + pct + '%"></i></span><small>' + rulesDone + ' of ' + CAVES_RULES.length + ' checked</small>',
        rulesDone === CAVES_RULES.length ? ccIcon('check') + ' Done' : '');
    return '<div class="lg-intro"><h2>Hear the sounds, then say them</h2><p>Korean sounds that English doesn\'t have, practiced by ear first and then out loud. Recordings stay on this device.</p></div>' +
      '<ul class="lg-list cv-secs">' + rows + '</ul>' + cavesTrickyHTML(tricky);
  }
  function cavesTrickyHTML(tricky){
    if(!tricky.length) return '';
    return '<section class="tw-sec cv-tricky"><h3>' + ccIcon('ear') + ' Your tricky sounds</h3><p>These come up more often in Sound pairs until they settle.</p><ul class="cv-tlist">' +
      tricky.map(function(c){ return '<li><b lang="ko">' + esc(c.label) + '</b><span>' + esc(c.tip) + '</span></li>'; }).join('') + '</ul></section>';
  }

  /* ---------- Sound pairs ----------
     A round is eight words. Each picks a contrast at random, leaning on the shaky ones (weight .2 + how shaky), and
     a contrast she just missed comes back two words later. Within a contrast a set is picked at random, but not the
     same set twice running. */
  function cavesRoundStart(){
    S.caves.round = { i: 0, right: 0, q: null, again: [], last: {}, missed: [], done: false };
    cavesNextQ();
  }
  function cavesNextQ(){
    var R = S.caves.round, d = cavesData(), id = null;
    var due = R.again.findIndex(function(a){ return a.at <= R.i; });
    if(due >= 0){ id = R.again[due].id; R.again.splice(due, 1); }
    else {
      var prev = R.q && R.q.c, pool = CAVES_PAIRS.filter(function(c){ return c.id !== prev; });
      var total = pool.reduce(function(s, c){ return s + 0.2 + cavesWeak(d, c.id); }, 0), r = Math.random() * total;
      for(var i = 0; i < pool.length; i++){ r -= 0.2 + cavesWeak(d, pool[i].id); if(r <= 0){ id = pool[i].id; break; } }
      id = id || pool[pool.length - 1].id;
    }
    var c = cavesContrast(id), choices = c.sets.map(function(s, si){ return si; }).filter(function(si){ return c.sets.length < 2 || si !== R.last[id]; });
    var si = choices[Math.floor(Math.random() * choices.length)], set = c.sets[si];
    R.last[id] = si;
    R.q = { c: id, set: set, a: Math.floor(Math.random() * set.length), picked: null };
  }
  function cavesPlayQ(){ var R = S.caves.round; if(R && R.q) try { Speech.speak(R.q.set[R.q.a][0]); } catch(e){} }
  function cavesPairsAnswer(i){
    var R = S.caves.round, q = R && R.q; if(!q || q.picked != null) return;
    q.picked = i;
    var ok = i === q.a, word = q.set[q.a][0], d = cavesData(), s = d.c[q.c] || { n: 0, miss: 0, w: 0.5 };
    s.n++; if(!ok) s.miss++;
    s.w = s.w * 0.7 + (ok ? 0 : 0.3);   // a running share of misses: three right answers in a row take it from .5 to under .2
    d.c[q.c] = s; cavesSave(d);
    try { Learner.record(word, 'hear', ok ? 'good' : 'again'); } catch(e){}
    if(ok){ R.right++; try { Sound.correct(); } catch(e){} }
    else { R.missed.push(q.c); R.again.push({ id: q.c, at: R.i + 3 }); try { Sound.wrong(); } catch(e){} }
    var y = window.scrollY; renderCaves(); window.scrollTo(0, y);
  }
  function cavesPairsNext(){
    var R = S.caves.round;
    R.i++;
    if(R.i >= CAVES_ROUND){
      R.done = true;
      try { reefWinSound(R.right === CAVES_ROUND); } catch(e){}
      try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
    } else cavesNextQ();
    renderCaves(); window.scrollTo(0, 0);
    if(!R.done) setTimeout(function(){ if(S.view === 'caves' && S.caves.round === R) cavesPlayQ(); }, 300);
  }
  function cavesPairsHTML(C){
    var R = C.round; if(!R) return '';
    if(R.done) return cavesRoundDoneHTML(R);
    var q = R.q, c = cavesContrast(q.c), picked = q.picked;
    var opts = q.set.map(function(w, i){
      var cls = picked == null ? '' : i === q.a ? ' right' : i === picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt cv-opt' + cls + '" data-cv-pick="' + i + '"' + (picked != null ? ' aria-disabled="true"' : '') + '>' +
        '<span lang="ko">' + esc(w[0]) + '</span><small>' + esc(w[1]) + '</small></button></li>';
    }).join('');
    var fb = '';
    if(picked != null){
      var right = q.set[q.a], ok = picked === q.a;
      fb = '<p class="lg-fb ' + (ok ? 'ok' : 'no') + '" role="status">' + ccIcon(ok ? 'check' : 'ear') + '<span>' + (ok ? 'Yes: <b lang="ko">' + esc(right[0]) + '</b> (' + esc(right[1]) + ').' :
          'That was <b lang="ko">' + esc(right[0]) + '</b> (' + esc(right[1]) + '). Hear them side by side:') + '</span></p>' +
        '<div class="cv-hear-each">' + q.set.map(function(w){ return '<button type="button" class="lg-mini" data-cv-say="' + esc(w[0]) + '" aria-label="Hear ' + esc(w[0]) + '">' + ccIcon('sound') + '<span lang="ko">' + esc(w[0]) + '</span></button>'; }).join('') + '</div>' +
        '<p class="cv-tip">' + ccIcon('bulb') + '<span>' + esc(c.tip) + '</span></p>' +
        '<div class="lg-bar"><button type="button" class="btn btn-primary" data-cv-next>' + (R.i + 1 < CAVES_ROUND ? 'Next sound' : 'Finish') + '</button></div>';
    }
    return '<div class="lg-title"><h2>' + esc(c.label) + '</h2><span>' + esc(c.kind) + ' · Sound ' + (R.i + 1) + ' of ' + CAVES_ROUND + '</span></div>' +
      '<div class="lg-q cv-q"><button type="button" class="listen-play cv-play" data-cv-hear aria-label="Hear it again">' + ccIcon('sound') + '</button>' +
        '<div><b>Which word did you hear?</b><span>Tap the speaker to hear it again.</span></div></div>' +
      '<ul class="lg-opts cv-opts">' + opts + '</ul>' + fb +
      (R.i === 0 && picked == null ? '<p class="cv-note">' + ccIcon('sparkle') + '<span><b lang="ko">' + esc(CAVES_MERGED.label) + '</b>: ' + esc(CAVES_MERGED.say) + '</span></p>' : '');
  }
  // Test helper: which answer of the sound pair on screen is right, so a test or screenshot can miss one on purpose
  window.__cavesAnswer = function(){ var R = S.view === 'caves' && S.caves && S.caves.round; return R && R.q && !R.done ? R.q.a : null; };
  function cavesRoundDoneHTML(R){
    var all = R.right === CAVES_ROUND, tricky = cavesTricky(cavesData());
    return '<div class="summary-card reef-sum-card lg-done">' +
        '<span class="lg-done-ic" aria-hidden="true">' + ccIcon(all ? 'trophy' : 'star') + '</span>' +
        '<h2>' + (all ? 'Sharp ears!' : 'Round finished!') + '</h2>' +
        '<p>' + esc(all ? reefPraiseLine() : 'Good listening. The sounds you missed will come up again.') + '</p>' +
        '<p class="lg-score">' + R.right + ' of ' + CAVES_ROUND + ' heard right</p>' +
        '<div class="reef-sum-actions">' +
          '<button type="button" class="btn btn-primary" data-cv-again>' + ccIcon('replay') + ' Another round</button>' +
          '<button type="button" class="btn btn-ghost" data-act="cv-back">' + ccIcon('mic') + ' Echo Caves</button>' +
        '</div></div>' + cavesTrickyHTML(tricky);
  }

  /* ---------- Shadowing ----------
     The lines: the Korean side of her cards (a word or a short sentence, no English letters), and every line of the
     Story Lagoon stories and Harbor Town talks she has finished, each once, only those with a natural-voice clip,
     shortest first. Before she has any, the sound-rule words stand in. */
  function cavesLines(C){
    var seen = {}, out = [];
    function add(ko, en, from){
      ko = String(ko || '').trim(); var k = learnerKey(ko);
      if(!k || seen[k] || !learnerHasHangul(ko) || /[A-Za-z]/.test(ko) || ko.length > 40 || !VoicePack.has(ko)) return;
      seen[k] = 1; out.push({ ko: ko, en: String(en || '').trim(), from: from });
    }
    (C.cards || []).forEach(function(c){ if(learnerHasHangul(c.front) && !learnerHasHangul(c.back)) add(c.front, c.back, 'Your cards'); });
    var ld = lagoonDone(), td = townDone();
    LAGOON_STORIES.forEach(function(s){ if(ld[s.id]) s.lines.forEach(function(l){ add(l[1], l[2], 'Story Lagoon'); }); });
    TOWN_FOLK.forEach(function(f){ if(td[f.id]) Object.keys(f.nodes).forEach(function(id){ var n = f.nodes[id]; add(n.t[0], n.t[1], 'Harbor Town'); }); });
    if(!out.length) CAVES_RULES.forEach(function(r){ add(r.word, r.mean, 'Sound rules'); });
    return out.sort(function(a, b){ return a.ko.length - b.ko.length; });
  }
  function cavesLinesHTML(C){
    if(!C.cards || !C.voice) return '<p class="lg-hint">' + ccIcon('mic') + ' Finding your lines…</p>';
    var d = cavesData(), all = cavesLines(C), lines = all.slice(0, C.more || 30);   // thirty at a time, so a long list stays quick
    C.lines = lines;
    return '<div class="lg-intro"><h2>Say it like the voice</h2><p>Pick a line, listen, then record yourself. Your pitch line and length appear beside the voice\'s. The shortest lines are first.</p></div>' +
      '<ul class="lg-list cv-lines">' + lines.map(function(l, i){
        var n = d.said[learnerKey(l.ko)] || 0;
        return '<li><button type="button" class="lg-story cv-line' + (n ? ' done' : '') + '" data-cv-line="' + i + '">' +
          '<span class="lg-ic" aria-hidden="true">' + ccIcon('mic') + '</span>' +
          '<span class="lg-st"><b lang="ko">' + esc(l.ko) + '</b><small>' + esc(l.en) + '</small><small class="cv-from">' + esc(l.from) + '</small></span>' +
          '<span class="lg-tag">' + (n ? ccIcon('check') + ' Said' : '') + '</span></button></li>';
      }).join('') + '</ul>' + (all.length > lines.length ? '<div class="lg-bar"><button type="button" class="btn btn-ghost" data-cv-more>Show longer lines</button></div>' : '');
  }
  function cavesOpenLine(i){
    var C = S.caves, l = C.lines && C.lines[i]; if(!l) return;
    cavesStopAll();
    var ph = echoStartPhase(), blocked = ph === 'ready' && !Mic.frameAllows();
    C.line = { i: i, ko: l.ko, en: l.en, from: l.from, phase: blocked ? 'nomic' : ph, micError: blocked ? 'blocked' : null, recUrl: null, tries: 0, model: null, me: null, rated: false };
    renderCaves(); window.scrollTo(0, 0);
    var L = C.line;
    setTimeout(function(){ if(S.caves && S.caves.line === L && L.phase !== 'recording') cavesSay(L); }, 350);
    VoicePack.find(L.ko, null, 4000).then(function(c){ return c ? cavesMeasure(c.url) : null; }).then(function(m){
      if(S.caves && S.caves.line === L){ L.model = m; cavesPaintPitch(); }
    });
  }
  function cavesSay(L, slow){ try { Speech.speak(L.ko, slow ? { rate: 0.7, variant: 'slow' } : null); } catch(e){} }
  // A clip's pitch, its speaking span and its shape, measured here; null if it can't be decoded
  function cavesMeasure(url){
    return echoDecode(url).then(function(ab){
      if(!ab) return null;
      var p = cavesPitch(ab.getChannelData(0), ab.sampleRate), sp = cavesSpan(p);
      return { p: p, span: sp, shape: cavesShape(p, 30), voiced: p.f0.filter(Boolean).length };
    }).catch(function(){ return null; });
  }

  // The microphone, as in Echo cards: one recording at a time, stopped by her or after a time that suits the line
  var cavesRec = null;
  function cavesRecReset(){
    if(cavesRec){
      var r = cavesRec; cavesRec = null; r.dropped = true;
      try { if(r.recorder && r.recorder.state !== 'inactive') r.recorder.stop(); } catch(e){}
      cavesRecFree(r);
    }
    var L = S.caves && S.caves.line;
    if(L && L.recUrl){ try { URL.revokeObjectURL(L.recUrl); } catch(e){} L.recUrl = null; }
  }
  function cavesRecFree(r){
    try { if(r.raf) cancelAnimationFrame(r.raf); } catch(e){}
    try { if(r.stopTimer) clearTimeout(r.stopTimer); } catch(e){}
    try { r.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
    try { if(r.ctx && r.ctx.close) r.ctx.close(); } catch(e){}
  }
  function cavesRecord(){
    var L = S.caves && S.caves.line; if(!L || L.phase === 'recording' || L.phase === 'starting') return;
    try { Speech.stop(); } catch(e){}
    L.phase = 'starting'; renderCaves();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function(stream){
      if(!S.caves || S.caves.line !== L || S.view !== 'caves'){ stream.getTracks().forEach(function(t){ t.stop(); }); return; }
      var types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'], type = '';
      for(var i = 0; i < types.length; i++){ try { if(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])){ type = types[i]; break; } } catch(e){} }
      var recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      var rec = cavesRec = { stream: stream, recorder: recorder, chunks: [] };
      recorder.ondataavailable = function(e){ if(e.data && e.data.size) rec.chunks.push(e.data); };
      recorder.onstop = function(){
        cavesRecFree(rec);
        if(rec.dropped || !S.caves || S.caves.line !== L) return;
        cavesRec = null;
        var blob = new Blob(rec.chunks, { type: recorder.mimeType || type || 'audio/webm' });
        if(L.recUrl){ try { URL.revokeObjectURL(L.recUrl); } catch(e){} }
        L.recUrl = blob.size ? URL.createObjectURL(blob) : null;
        L.phase = L.recUrl ? 'compare' : 'ready'; L.me = null;
        if(L.recUrl) L.tries++;
        renderCaves();
        if(!L.recUrl) return;
        cavesMeasure(L.recUrl).then(function(m){ if(S.caves && S.caves.line === L){ L.me = m || { failed: true }; cavesPaintPitch(); } });
        cavesPlayBoth(L);
      };
      // a live level meter, so it's clear the microphone hears her
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        rec.ctx = new AC(); var an = rec.ctx.createAnalyser(); an.fftSize = 512; rec.ctx.createMediaStreamSource(stream).connect(an);
        var data = new Uint8Array(an.fftSize);
        (function tick(){
          if(cavesRec !== rec) return;
          an.getByteTimeDomainData(data);
          var peak = 0; for(var k = 0; k < data.length; k++) peak = Math.max(peak, Math.abs(data[k] - 128));
          var el = document.getElementById('cvLevel'); if(el) el.style.transform = 'scaleX(' + Math.min(1, peak / 64).toFixed(3) + ')';
          rec.raf = requestAnimationFrame(tick);
        })();
      } catch(e){}
      recorder.start();
      L.phase = 'recording';
      var secs = L.model && L.model.span.secs || 2;
      rec.stopTimer = setTimeout(cavesStopRecording, Math.max(4000, Math.min(ECHO_MAX_MS, secs * 2600 + 2000)));
      renderCaves();
    }).catch(function(err){
      if(!S.caves || S.caves.line !== L) return;
      L.phase = 'nomic'; L.micError = Mic.why(err);
      renderCaves();
    });
  }
  function cavesStopRecording(){
    var r = cavesRec; if(!r || !r.recorder) return;
    try { if(r.recorder.state !== 'inactive') r.recorder.stop(); else { cavesRec = null; cavesRecFree(r); } } catch(e){ cavesRec = null; cavesRecFree(r); }
  }
  // The voice, then her, with a short gap: the comparison that makes shadowing work
  function cavesPlayBoth(L){
    Speech.speakThen(L.ko, function(){
      if(S.caves && S.caves.line === L && L.recUrl) setTimeout(function(){ if(S.caves && S.caves.line === L && L.recUrl) Speech.playUrl(L.recUrl, 1); }, 350);
    });
  }
  function cavesRate(good){
    var C = S.caves, L = C.line; if(!L) return;
    if(!good){
      L.retried = true;
      if(L.phase === 'compare' || L.phase === 'ready') cavesRecord(); else cavesSay(L);
      return;
    }
    // 'say': right the first time is good; after another try it's hard
    try { Learner.record(L.ko, 'say', L.retried ? 'hard' : 'good'); } catch(e){}
    var d = cavesData(), k = learnerKey(L.ko); d.said[k] = (d.said[k] || 0) + 1; cavesSave(d);
    try { Sound.correct(); } catch(e){}
    if(C.lines && C.lines[L.i + 1]) cavesOpenLine(L.i + 1);
    else { cavesStopAll(); C.line = null; renderCaves(); window.scrollTo(0, 0); }
  }

  // The pitch lines: one lane each for the voice and for her, on the same time scale (so the lengths compare too),
  // in semitones from each speaker's own middle pitch (so a low voice and a high one compare fairly)
  function cavesLaneHTML(m, who, cls, longest){
    if(!m || m.failed || !m.span.secs) return '';
    var p = m.p, sp = m.span, W = 300, H = 64, wpx = Math.max(0.2, sp.secs / longest) * W, n = sp.to - sp.from + 1;
    var on = p.f0.slice(sp.from, sp.to + 1).filter(Boolean).sort(function(a, b){ return a - b; }), mid = on[Math.floor(on.length / 2)] || 1;
    var path = '', pen = false;
    for(var i = 0; i < n; i++){
      var v = p.f0[sp.from + i];
      if(!v){ pen = false; continue; }
      var x = (n > 1 ? i / (n - 1) : 0) * wpx, st = Math.max(-9, Math.min(9, 12 * Math.log2(v / mid))), y = H / 2 - st * 3.2;
      path += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); pen = true;
    }
    return '<div class="cv-lane ' + cls + '"><span class="cv-lane-label">' + ccIcon(cls === 'voice' ? 'sound' : 'mic') + who + ' <small>' + sp.secs.toFixed(1) + ' s</small></span>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><line class="cv-mid" x1="0" y1="' + H / 2 + '" x2="' + W + '" y2="' + H / 2 + '"/>' +
      '<rect class="cv-len" x="0" y="' + (H - 6) + '" width="' + wpx.toFixed(1) + '" height="6" rx="3"/><path class="cv-pline" d="' + path + '"/></svg></div>';
  }
  // Kind words about the pitch shape and the length: how alike they are, never a mark for her sounds
  function cavesFeedback(L){
    var a = L.model, b = L.me;
    if(!b) return '<p class="lg-hint">' + ccIcon('sparkle') + ' Measuring…</p>';
    if(b.failed || b.voiced < 5) return '<p class="lg-hint">' + ccIcon('mic') + ' I couldn\'t hear much voice in that one. Try again a little closer to the microphone.</p>';
    if(!a) return '<p class="lg-hint">' + ccIcon('check') + ' Recorded. Listen to the voice and to yourself, then say how it went.</p>';
    var like = cavesLikeness(a.shape, b.shape), ratio = b.span.secs / (a.span.secs || 1);
    var pitch = like == null ? 'Listen for where the voice goes up and where it comes down.' :
      like >= 0.6 ? 'Your pitch rises and falls much like the voice\'s.' :
      like >= 0.25 ? 'Your pitch shape is close in places. Listen for where the voice goes up and where it comes down.' :
      'Try following the voice\'s pitch: where it goes up, and where it comes down.';
    var len = ratio <= 1.25 && ratio >= 0.8 ? 'It\'s about the same length as the voice.' :
      ratio > 1.25 ? 'You took a little longer than the voice, which is normal while you learn.' : 'You were a little quicker than the voice. Try taking your time.';
    return '<ul class="cv-fb" role="status"><li>' + ccIcon(like != null && like >= 0.6 ? 'star' : 'trend') + '<span>' + pitch + '</span></li><li>' + ccIcon('clock') + '<span>' + len + '</span></li></ul>';
  }
  function cavesPaintPitch(){
    var L = S.caves && S.caves.line, box = document.getElementById('cvPitch'), fb = document.getElementById('cvFb'); if(!L || !box) return;
    var longest = Math.max(L.model && L.model.span ? L.model.span.secs : 0, L.me && L.me.span ? L.me.span.secs : 0) || 1;
    box.innerHTML = cavesLaneHTML(L.model, 'Voice', 'voice', longest) + cavesLaneHTML(L.me, 'You', 'me', longest);
    if(fb) fb.innerHTML = L.phase === 'compare' ? cavesFeedback(L) : '';
  }
  function cavesShadowHTML(C){
    var L = C.line, ph = L.phase, mic;
    if(ph === 'recording') mic = '<button type="button" class="echo-rec on" data-cv-stop aria-label="Stop recording"><span class="echo-dot"></span>Stop</button><div class="echo-level"><i id="cvLevel"></i></div>';
    else if(ph === 'starting') mic = '<button type="button" class="echo-rec" disabled><span class="echo-dot"></span>Getting the microphone…</button>';
    else if(ph === 'ask') mic = '<div class="mic-ask" role="group" aria-labelledby="cvAskTitle"><div class="mic-ask-title" id="cvAskTitle">' + ccIcon('mic') + ' Use the microphone?</div>' +
        '<p>Coral Classroom can record you saying it, so you can hear yourself next to the voice and see your pitch beside it. The recording stays on this device and is let go when you move on.</p>' +
        '<div class="mic-ask-btns"><button type="button" class="btn btn-primary" data-cv-mic="yes">Yes, use the microphone</button><button type="button" class="btn btn-ghost" data-cv-mic="no">Not now</button></div>' +
        '<small>Your browser will ask too. You can change this any time in Settings.</small></div>';
    else if(ph === 'askadult') mic = '<div class="mic-ask"><p>' + ccIcon('mic') + ' A grown-up can turn on the microphone in Settings.</p></div>';
    else if(ph === 'off') mic = '<button type="button" class="btn btn-ghost mic-turnon" data-cv-mic="yes">' + ccIcon('mic') + ' Turn on the microphone</button>';
    else if(ph === 'nomic') mic = L.micError && ['blocked', 'unsupported', 'nomic'].indexOf(L.micError) < 0 ? '<button type="button" class="btn btn-ghost mic-turnon" data-cv-rec>' + ccIcon('mic') + ' Try again</button>' : '';
    else mic = '<button type="button" class="echo-rec" data-cv-rec><span class="echo-dot"></span>' + (L.tries ? 'Record again' : 'Record yourself') + '</button>';
    var along = 'Say it out loud along with the voice, then say how it went.';
    var hint = ph === 'nomic' ? (L.micError ? Mic.msg(L.micError) + (L.micError === 'blocked' || L.micError === 'unsupported' ? '' : ' Or say it out loud along with the voice.') : along) :
      (ph === 'ask' || ph === 'askadult' || ph === 'off') ? along :
      ph === 'recording' ? 'Say it now, then tap Stop.' : ph === 'compare' ? 'Listen to both, and look at the two pitch lines.' : 'Listen, then record yourself saying it.';
    var compare = ph === 'compare' ? '<div class="echo-compare cv-compare"><button type="button" class="btn btn-ghost" data-cv-both>' + ccIcon('replay') + ' Voice, then you</button><button type="button" class="btn btn-ghost" data-cv-me>' + ccIcon('mic') + ' Just you</button></div>' : '';
    var rate = ph === 'recording' || ph === 'starting' || ph === 'ask' ? '' :
      '<div class="lg-bar cv-rate"><button type="button" class="btn btn-primary" data-cv-rate="good">' + ccIcon('check') + ' Sounded right</button>' +
        '<button type="button" class="btn btn-ghost" data-cv-rate="again">' + ccIcon('replay') + ' Try again</button></div>';
    var nomic = ph === 'nomic' || ph === 'off' || ph === 'askadult';
    return '<div class="lg-title cv-say"><h2 lang="ko">' + esc(L.ko) + '</h2><span>' + esc(L.en) + '</span></div>' +
      '<div class="cv-stage' + (nomic ? ' cv-nomic' : '') + '">' +
        '<div class="listen-big cv-listen"><button type="button" class="listen-play" data-cv-voice aria-label="Hear it">' + ccIcon('sound') + '</button>' +
          '<button type="button" class="btn btn-ghost listen-slow" data-cv-slow>' + ccIcon('turtle') + ' Slower</button></div>' +
        '<div class="echo-mic">' + mic + '</div>' +
        '<p class="cv-hint" role="status">' + esc(hint) + '</p>' +
        '<div class="cv-pitch" id="cvPitch" role="img" aria-label="Pitch lines of the voice and of your recording"></div>' +
        '<div id="cvFb"></div>' + compare +
      '</div>' + rate;
  }

  /* ---------- Sound rules ---------- */
  function cavesRule(id){ return CAVES_RULES.find(function(r){ return r.id === id; }) || null; }
  function cavesRulesHTML(){
    var d = cavesData();
    return '<div class="lg-intro"><h2>Why it sounds that way</h2><p>Korean is written one way and said a little differently. These are the changes you will hear first, each with words to listen to.</p></div>' +
      '<ul class="lg-list cv-rules">' + CAVES_RULES.map(function(r){
        var ok = !!d.rules[r.id];
        return '<li><button type="button" class="lg-story cv-rule' + (ok ? ' done' : '') + '" data-cv-rule="' + r.id + '">' +
          '<span class="lg-ic" aria-hidden="true">' + ccIcon('bulb') + '</span>' +
          '<span class="lg-st"><b>' + esc(r.en) + '</b><span lang="ko">' + esc(r.ko) + '</span><small><span lang="ko">' + esc(r.word) + ' → [' + esc(r.said) + ']</span></small></span>' +
          '<span class="lg-tag">' + (ok ? ccIcon('check') + ' Checked' : '') + '</span></button></li>';
      }).join('') + '</ul>';
  }
  function cavesOpenRule(id){
    var r = cavesRule(id); if(!r) return;
    cavesStopAll();
    var opts = r.check.opts.slice();
    for(var i = opts.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    S.caves.rule = { id: id, opts: opts, picked: null };
    renderCaves(); window.scrollTo(0, 0);
    setTimeout(function(){ if(S.caves && S.caves.rule && S.caves.rule.id === id) try { Speech.speak(r.word); } catch(e){} }, 350);
  }
  function cavesRuleAnswer(i){
    var Rs = S.caves.rule, r = Rs && cavesRule(Rs.id); if(!r || Rs.picked != null) return;
    Rs.picked = i;
    var ok = Rs.opts[i] === r.check.word;
    try { Learner.record(r.check.word, 'hear', ok ? 'good' : 'again'); } catch(e){}
    if(ok){ var d = cavesData(); d.rules[r.id] = Date.now(); cavesSave(d); try { Sound.correct(); } catch(e){} }
    else try { Sound.wrong(); } catch(e){}
    var y = window.scrollY; renderCaves(); window.scrollTo(0, y);
    try { Speech.speak(r.check.word); } catch(e){}
  }
  function cavesRuleHTML(C){
    var Rs = C.rule, r = cavesRule(Rs.id), idx = CAVES_RULES.indexOf(r), next = CAVES_RULES[idx + 1];
    function say(w){ return '<button type="button" class="lg-mini" data-cv-say="' + esc(w) + '" aria-label="Hear ' + esc(w) + '">' + ccIcon('sound') + '</button>'; }
    var more = r.more.map(function(m){
      return '<li>' + say(m[0]) + '<span><b lang="ko">' + esc(m[0]) + '</b> <span class="cv-said" lang="ko">[' + esc(m[1]) + ']</span><small>' + esc(m[2]) + '</small></span></li>'; }).join('');
    var picked = Rs.picked, ok = picked != null && Rs.opts[picked] === r.check.word;
    var opts = Rs.opts.map(function(o, i){
      var cls = picked == null ? '' : o === r.check.word ? ' right' : i === picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt cv-opt' + cls + '" data-cv-ropt="' + i + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span lang="ko">' + esc(o) + '</span></button></li>'; }).join('');
    var fb = picked == null ? '' : '<p class="lg-fb ' + (ok ? 'ok' : 'no') + '" role="status">' + ccIcon(ok ? 'check' : 'bulb') + '<span>' +
      (ok ? 'Yes: it\'s spelled <b lang="ko">' + esc(r.check.word) + '</b> and said [<span lang="ko">' + esc(r.check.opts[1]) + '</span>].' :
        'It\'s spelled <b lang="ko">' + esc(r.check.word) + '</b>, and said [<span lang="ko">' + esc(r.check.opts[1]) + '</span>].') + '</span></p>' +
      '<div class="lg-bar">' + (next ? '<button type="button" class="btn btn-primary" data-cv-rule="' + next.id + '">Next: ' + esc(next.en) + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-cv-rules>' + ccIcon('bulb') + ' All rules</button></div>';
    return '<div class="lg-title"><h2>' + esc(r.en) + '</h2><span lang="ko">' + esc(r.ko) + '</span></div>' +
      '<div class="cv-rulecard"><div class="cv-big">' + say(r.word) + '<span><b lang="ko">' + esc(r.word) + '</b><span class="cv-arrow" aria-hidden="true">→</span><b class="cv-said" lang="ko">[' + esc(r.said) + ']</b><small>' + esc(r.mean) + '</small></span></div>' +
        '<p>' + esc(r.rule) + '</p><ul class="cv-more">' + more + '</ul></div>' +
      '<div class="lg-quiz cv-check"><p class="lg-qn">' + ccIcon('ear') + ' Check</p>' +
        '<div class="lg-q"><button type="button" class="listen-play cv-play" data-cv-say="' + esc(r.check.word) + '" aria-label="Hear the word">' + ccIcon('sound') + '</button>' +
          '<div><b>Which spelling matches what you hear?</b><span>It means "' + esc(r.check.mean) + '".</span></div></div>' +
        '<ul class="lg-opts">' + opts + '</ul>' + fb + '</div>';
  }

  function cavesWire(C){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(b){ b.addEventListener('click', function(e){ fn(b, e); }); }); }
    on('[data-act="cv-home"]', function(){ cavesStopAll(); goHome(); });
    on('[data-act="cv-back"]', function(){
      cavesStopAll();
      if(C.sec === 'shadow' && C.line){ C.line = null; }
      else if(C.sec === 'rules' && C.rule){ C.rule = null; }
      else { C.sec = null; C.round = null; }
      renderCaves(); window.scrollTo(0, 0);
    });
    on('[data-cv-go]', function(b){ cavesGo(b.dataset.cvGo); if(b.dataset.cvGo === 'pairs') setTimeout(function(){ if(S.view === 'caves') cavesPlayQ(); }, 350); });
    on('[data-cv-hear]', function(){ cavesPlayQ(); });
    on('[data-cv-pick]', function(b){ cavesPairsAnswer(+b.dataset.cvPick); });
    on('[data-cv-next]', function(){ cavesPairsNext(); });
    on('[data-cv-again]', function(){ cavesRoundStart(); renderCaves(); window.scrollTo(0, 0); setTimeout(function(){ if(S.view === 'caves') cavesPlayQ(); }, 300); });
    on('[data-cv-say]', function(b){ try { Speech.speak(b.dataset.cvSay); } catch(e){} });
    on('[data-cv-line]', function(b){ cavesOpenLine(+b.dataset.cvLine); });
    on('[data-cv-more]', function(){ C.more = (C.more || 30) + 30; var y = window.scrollY; renderCaves(); window.scrollTo(0, y); });
    on('[data-cv-voice]', function(){ if(C.line) cavesSay(C.line); });
    on('[data-cv-slow]', function(){ if(C.line) cavesSay(C.line, true); });
    on('[data-cv-mic]', function(b){
      if(b.dataset.cvMic === 'yes'){ Mic.set('yes'); cavesRecord(); }
      else { Mic.set('no'); C.line.phase = 'off'; renderCaves(); }
    });
    on('[data-cv-rec]', function(){ cavesRecord(); });
    on('[data-cv-stop]', function(){ cavesStopRecording(); });
    on('[data-cv-both]', function(){ if(C.line) cavesPlayBoth(C.line); });
    on('[data-cv-me]', function(){ if(C.line && C.line.recUrl) Speech.playUrl(C.line.recUrl, 1); });
    on('[data-cv-rate]', function(b){ cavesRate(b.dataset.cvRate === 'good'); });
    on('[data-cv-rule]', function(b){ cavesOpenRule(b.dataset.cvRule); });
    on('[data-cv-rules]', function(){ cavesStopAll(); C.rule = null; renderCaves(); window.scrollTo(0, 0); });
    on('[data-cv-ropt]', function(b){ cavesRuleAnswer(+b.dataset.cvRopt); });
    if(C.line) cavesPaintPitch();
  }
