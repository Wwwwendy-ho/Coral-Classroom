  /* ---------- CAPTAIN'S DECK: today's voyage, your course, and what you can do ----------
     The last region of the sea chart (seamap.js), for plan and progress: the one place that reads every other
     region's progress and ties it together. One screen (S.view 'captain', state in S.captain) with three tabs:
       today    today's voyage: three or four short legs across the regions (deckPlan in deck-plan.js), each with its
                region's icon, what it is and about how long. Tapping a leg opens that region right at that item; a
                leg ticks itself off when its region's own finish point says so (deckTick, called from each region),
                and leaving the region comes back here.
       course   the course units as islands with their dates (the treasure map's voyage strip, bigger), the picked
                unit's can-do statements, ticked when met, and an optional checkpoint at the end of the current unit:
                a few items from the regions (sound pairs, a Harbor Town exchange, a Pattern Reef item, a sign). Its
                result re-plans the course through the Library's own check code (CoralLibrary.courseAdjust).
       can      what you can do, in plain words: can-do statements met, the five skills of the learner model as
                meters, the counts from each region, and trip readiness across the ten trip situations.
     Per profile in localStorage (cc-deck-<profile id>): day, the date of the voyage in legs; done, the legs ticked
     off (by key); cp, each unit's last checkpoint ({ at, score }). A new day plans a new voyage; losing it only
     re-plans today. */
  var DECK_ALL_DONE_SAY = 'Every leg of today\'s voyage is done. Well sailed!';
  var DECK_SKILLS = [['hear', 'Hear it', 'ear'], ['read', 'Read it', 'search'], ['recall', 'Recall it', 'bulb'], ['say', 'Say it', 'mic'], ['use', 'Use it', 'talk']];
  function deckStoreKey(){ return 'cc-deck-' + (S.profile && S.profile.id || 'guest'); }
  function deckToday(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function deckDayNum(){ var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); }
  function deckData(){
    var d = null; try { d = JSON.parse(localStorage.getItem(deckStoreKey()) || 'null'); } catch(e){}
    d = d && typeof d === 'object' ? d : {};
    d.legs = Array.isArray(d.legs) ? d.legs : []; d.done = d.done || {}; d.cp = d.cp || {};
    return d;
  }
  function deckSave(d){ try { localStorage.setItem(deckStoreKey(), JSON.stringify(d)); } catch(e){} }
  // Today's legs if they are planned already (the board and the treasure map read this, without waiting)
  function deckTodayPlan(){ var d = deckData(); return d.day === deckToday() && d.legs.length ? d : null; }
  function deckLeft(d){ return d ? d.legs.filter(function(l){ return !d.done[l.key]; }).length : 0; }

  /* ---------- Planning ---------- */
  // What the regions say about her today, in the shape deckPlan() reads. words: the Korean on her cards.
  function deckInput(words){
    var mw = myWordsDue(), review = null, live = (S.decks || []).filter(function(d){ return !d.archived; });
    if(mw.length) review = { mw: true, n: mw.length, deckId: MW_ID };
    else {
      var cd = reefCourseDecks(), pool = cd ? live.filter(function(d){ return cd.indexOf(d.id) >= 0; }) : live;
      var top = pool.map(function(d){ return { d: d, n: (S.dueCounts[d.id] || {}).due || 0 }; }).sort(function(a, b){ return b.n - a.n; })[0];
      if(top && top.n) review = { n: top.n, deckId: top.d.id, name: top.d.name };
    }
    var now = reefCourseNow(), unit = null;
    if(now && now.unit){
      var dk = (now.unit.decks || []).find(function(x){ return x.role === 'learn' && live.some(function(d){ return d.id === x.id; }); });
      if(dk) unit = { deckId: dk.id, name: dk.name, n: (S.dueCounts[dk.id] || {}).due || 0, unit: now.unit.title };
    }
    var story = lagoonRanked(words).find(function(x){ return !x.done; });
    var talks = townRanked(words), talk = talks.find(function(x){ return !x.done; }) || talks[0];
    var answered = bbAnswered(bbData()), letter = BB_BOTTLES.find(function(b){ return !answered[b.id]; });
    var tricky = cavesTricky(cavesData())[0], fix = patRepairs(patData())[0], lh = lhData();
    var sign = LH_SIGNS.find(function(s){ return lh.s[s.id] == null; });
    return {
      day: deckDayNum(), review: review, unit: unit,
      story: story && { id: story.s.id, en: story.s.en }, talk: talk && { id: talk.f.id, en: talk.f.en },
      letter: letter && { id: letter.id, en: letter.en }, sound: tricky && { id: tricky.id, label: tricky.label },
      repair: fix && { id: fix.id, en: fix.en }, sign: sign && { id: sign.id, en: sign.en }
    };
  }
  // Today's voyage: the stored one, or a new one planned from her cards, My words and every region's progress
  var deckPlanning = null;
  function deckEnsure(){
    var have = deckTodayPlan(); if(have) return Promise.resolve(have);
    var key = deckStoreKey() + deckToday();
    if(deckPlanning && deckPlanning.key === key) return deckPlanning.p;
    var live = (S.decks || []).filter(function(d){ return !d.archived; });
    var p = Promise.all([
      myWordsLoad().catch(function(){}),
      Promise.all(live.map(function(d){ return S.store.getCardsOnce(d.id).catch(function(){ return []; }); }))
    ]).then(function(r){
      if(deckStoreKey() + deckToday() !== key) return deckData();   // she changed profile while it was planning
      var d = deckData();
      d.day = deckToday(); d.done = {};
      d.legs = deckPlan(deckInput(lagoonDeckWords([].concat.apply([], r[1]))));
      deckSave(d);
      return d;
    }).catch(function(e){ console.error('[Coral Classroom] planning the voyage', e); return deckData(); });
    deckPlanning = { key: key, p: p };
    return p;
  }
  // Called from each region's finish point: ticks off today's matching leg, if there is one
  function deckTick(kind, item){
    try {
      var d = deckData(); if(d.day !== deckToday()) return;
      var l = deckLegFor(d.legs, d.done, kind, item == null ? null : item); if(!l) return;
      d.done[l.key] = Date.now(); deckSave(d);
      if(!deckLeft(d)) S.deckCheer = true;   // said when Captain's Deck next shows
    } catch(e){}
  }

  /* ---------- Opening it, and coming back ---------- */
  function openCaptain(tab){
    try { Speech.stop(); } catch(e){}
    S.deckBack = false;
    S.currentDeckId = null;
    var C = S.captain && S.captain.pid === (S.profile && S.profile.id) ? S.captain : {};
    S.captain = { pid: S.profile && S.profile.id, tab: tab || C.tab || 'today', pick: C.pick, cp: null, plan: deckTodayPlan() };
    S.view = 'captain';
    render(); window.scrollTo(0, 0);
    var me = S.captain;
    deckEnsure().then(function(d){
      if(S.captain !== me) return;
      me.plan = d;
      if(S.view === 'captain' && me.tab === 'today' && !me.cp) deckKeep();
      deckCheerNow();
    });
  }
  function deckCheerNow(){
    if(!S.deckCheer || S.view !== 'captain') return;
    S.deckCheer = false;
    setTimeout(function(){ try { Speech.speak(DECK_ALL_DONE_SAY); } catch(e){} }, 500);
    try { if(!reefCalm()) Ocean.bubbles(10); } catch(e){}
  }
  // A leg opens its region right at its item; leaving the region (its own way out, goHome) comes back here
  function deckOpenLeg(l){
    var go = {
      cards: function(){ reefStartDeck(l.item); },
      story: function(){ openLagoon(); lagoonOpenStory(l.item); },
      talk: function(){ openTown(); townOpenTalk(l.item); },
      letter: function(){ openBeach(); var b = bbById(l.item); if(b){ bbStart(b); renderBeach(); window.scrollTo(0, 0); } },
      sound: function(){ openCaves(); S.caves.focus = l.item; cavesGo('pairs'); setTimeout(function(){ if(S.view === 'caves') cavesPlayQ(); }, 400); },
      pattern: function(){ openPatterns(l.item); },
      sign: function(){ openLight(); lhOpenSign(S.light, l.item); renderLight(); }
    }[l.kind];
    if(!go) return;
    try { Speech.stop(); } catch(e){}
    try { Sound.bloop(520); } catch(e){}
    function open(){ go(); S.deckBack = true; }
    if(reefGame()) reefGo('dive', null, open); else open();
  }
  // goHome() asks this first: a region opened from a leg goes back to Captain's Deck instead of the board
  function deckBackHome(){
    if(!S.deckBack || S.view === 'captain') return false;
    S.deckBack = false;
    if(reefGame()) reefGo('dive', null, function(){ openCaptain('today'); }); else openCaptain('today');
    return true;
  }
  // From the board, the treasure map or the Library
  function deckOpenFromBoard(el){
    try { Sound.bloop(560); } catch(e){}
    S.reefReturnY = window.scrollY;
    if(reefGame()) reefGo('dive', el || null, function(){ openCaptain(); }); else openCaptain();
  }

  /* ---------- The screen ---------- */
  function renderCaptain(){
    var C = S.captain || (S.captain = { tab: 'today' });
    var tabs = [['today', 'Today', 'compass'], ['course', 'Your course', 'map'], ['can', 'What you can do', 'trophy']];
    var body = C.cp ? deckCheckHTML(C) : C.tab === 'course' ? deckCourseHTML(C) : C.tab === 'can' ? deckCanHTML() : deckTodayHTML(C);
    app.innerHTML = '<div class="nav-row"><button class="back-btn" data-act="cd-home">⟵ Lagoon</button><span class="nav-title">' + ccIcon('anchor') + ' Captain\'s Deck</span></div>' +
      '<div class="lg-page cd-page">' +
        (C.cp ? '' : '<div class="cd-tabs" role="tablist" aria-label="Captain\'s Deck">' + tabs.map(function(t){
          return '<button type="button" role="tab" class="cd-tab' + (C.tab === t[0] ? ' on' : '') + '" aria-selected="' + (C.tab === t[0]) + '" data-cd-tab="' + t[0] + '">' + ccIcon(t[2]) + '<span>' + t[1] + '</span></button>';
        }).join('') + '</div>') +
        body + '</div>';
    deckWire(C);
  }
  function deckKeep(){ var y = window.scrollY; renderCaptain(); window.scrollTo(0, y); }
  function deckNiceDate(iso){ var p = String(iso || '').split('-'); try { return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch(e){ return iso; } }

  // Today's voyage
  function deckTodayHTML(C){
    var d = C.plan;
    if(!d) return '<div class="lg-intro"><h2>Today\'s voyage</h2><p>Charting today\'s course across the sea…</p></div>';
    var n = d.legs.length, left = deckLeft(d), pct = n ? Math.round((n - left) / n * 100) : 0;
    var when = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    var next = d.legs.find(function(l){ return !d.done[l.key]; });
    var rows = d.legs.map(function(l, i){
      var done = !!d.done[l.key];
      return '<li><button type="button" class="lg-story cd-leg' + (done ? ' done' : '') + (l === next ? ' best' : '') + '" data-cd-leg="' + i + '">' +
        '<span class="lg-ic" aria-hidden="true">' + ccIcon(l.icon) + '</span>' +
        '<span class="lg-st"><b>' + esc(l.title) + '</b><small>' + esc(l.place) + ' · about ' + l.min + ' min</small><small class="cd-why">' + esc(l.why) + '</small></span>' +
        '<span class="lg-tag">' + (done ? ccIcon('check') + ' Done' : l === next ? 'Start' : '') + '</span></button></li>';
    }).join('');
    return '<div class="lg-intro cd-intro"><h2>Today\'s voyage</h2><p>' + esc(when) + '. ' + (n ? (left ? n + ' short legs across the sea, about ' + d.legs.reduce(function(t, l){ return t + l.min; }, 0) + ' minutes in all.' : 'Every leg is done. Well sailed!') : 'Nothing to plan yet: add some Korean cards first.') + '</p>' +
        (n ? '<span class="lg-meter cd-meter" role="img" aria-label="' + (n - left) + ' of ' + n + ' legs done"><i style="width:' + pct + '%"></i></span><small class="cd-count">' + (n - left) + ' of ' + n + ' legs done</small>' : '') + '</div>' +
      '<ol class="lg-list cd-legs">' + rows + '</ol>' +
      (n && !left ? '<p class="cd-cheer">' + ccIcon('star') + '<span>' + esc(DECK_ALL_DONE_SAY) + ' A new voyage is charted tomorrow.</span></p>' : '');
  }

  // Your course: the units as islands, the picked one's can-do statements and its checkpoint
  function deckCourseHTML(C){
    var now = reefCourseNow();
    if(!now || !now.co.units.length) return '<div class="lg-intro"><h2>Your course</h2><p>Plan a course in the Library: a few questions, then units with goals and dates. Your voyage follows it.</p></div>' +
      '<div class="lg-bar"><button type="button" class="btn btn-primary" data-cd-library>' + ccIcon('school') + ' Plan my course</button></div>';
    var co = now.co, pick = C.pick != null && co.units[C.pick] ? C.pick : Math.min(now.i, co.units.length - 1), u = co.units[pick];
    var isles = co.units.map(function(x, i){
      var st = x.done ? 'done' : i === now.i ? 'now' : 'later';
      return '<li><button type="button" class="cd-isle ' + st + (x.review ? ' review' : '') + (i === pick ? ' picked' : '') + '" data-cd-unit="' + i + '" aria-label="Unit ' + (i + 1) + ': ' + esc(x.title) + (x.done ? ', done' : i === now.i ? ', now' : '') + '">' +
        '<span class="cd-isle-i" aria-hidden="true">' + (x.done ? ccIcon('flag') : i === now.i ? reefGuideMini(reefNight()) : x.review ? ccIcon('star') : ccIcon('island')) + '</span>' +
        '<span class="cd-isle-t">' + esc(x.title) + '</span><small>' + deckNiceDate(x.start) + '</small></button></li>';
    }).join('');
    var st = deckProgress(), cp = deckData().cp[u.id];
    var cando = (u.cando || []).map(function(t){
      var test = deckCandoTest(t), met = u.done || !!(test && deckCanMet(test, st));
      return '<li class="' + (met ? 'met' : '') + '">' + ccIcon(met ? 'check' : 'target') + '<span>' + esc(t) + '</span></li>';
    }).join('');
    var isNow = pick === now.i && !u.done;
    return '<div class="lg-intro"><h2>Your course</h2><p>' + esc(co.goal || 'My course') + (co.target ? ' · trip ' + deckNiceDate(co.target) : '') + '</p></div>' +
      '<div class="cd-voyage"><ol class="cd-isles">' + isles + '</ol></div>' +
      '<section class="tw-sec cd-unit"><span class="cd-utag">Unit ' + (pick + 1) + ' of ' + co.units.length + ' · ' + deckNiceDate(u.start) + ' to ' + deckNiceDate(u.end) + (u.done ? ' · done' : isNow ? ' · now' : '') + '</span>' +
        '<h3>' + esc(u.title) + '</h3>' + (u.focus ? '<p class="cd-focus">' + esc(u.focus) + '</p>' : '') +
        '<h4>By the end I can…</h4><ul class="cd-cando">' + cando + '</ul></section>' +
      (isNow ? '<section class="tw-sec cd-cp"><h3>' + ccIcon('flag') + ' Checkpoint (optional)</h3>' +
        '<p>A few quick items from the regions: sound pairs, a Harbor Town exchange, a pattern and a sign. A strong result moves the course along; a hard one gives this unit more time. Your dates follow.</p>' +
        (cp ? '<p class="cd-last">' + ccIcon('check') + ' Last time: ' + Math.round(cp.score * 100) + '%, ' + deckNiceDate(cp.day) + '</p>' : '') +
        '<div class="lg-bar"><button type="button" class="btn btn-primary" data-cd-check>' + ccIcon('flag') + ' Take the checkpoint</button>' +
        '<button type="button" class="btn btn-ghost" data-cd-library>' + ccIcon('school') + ' My course in the Library</button></div></section>' :
        '<div class="lg-bar"><button type="button" class="btn btn-ghost" data-cd-library>' + ccIcon('school') + ' My course in the Library</button></div>');
  }

  /* ---------- What you can do ---------- */
  // Every region's progress at once, read from localStorage
  function deckProgress(){ return { lagoon: lagoonDone(), town: townDone(), light: lhData(), caves: cavesData(), pat: patData(), bb: bbData() }; }
  function deckCanMet(test, st){
    var p = String(test).split(':'), k = p[0], id = p[1];
    if(k === 'talk') return !!(st.town[id] && st.town[id].good >= 2);
    if(k === 'story') return !!st.lagoon[id];
    if(k === 'sign'){ var s = lhSign(id); return !!s && (st.light.s[id] || 0) >= s.qs.length; }
    if(k === 'sound'){ var c = st.caves.c[id]; return !!c && c.n >= 3 && c.w < 0.35; }
    if(k === 'pattern') return (st.pat.m[id] || 0) >= PAT_MASTERED;
    if(k === 'letters') return Object.keys(bbAnswered(st.bb)).length >= +id;
    return false;
  }
  function deckCanHTML(){
    var st = deckProgress();
    var met = DECK_CAN.filter(function(c){ return deckCanMet(c.test, st); }), todo = DECK_CAN.filter(function(c){ return !deckCanMet(c.test, st); });
    var now = reefCourseNow(), units = now ? now.co.units : [], done = units.filter(function(u){ return u.done; });
    var cando = [].concat.apply([], units.map(function(u){ return (u.cando || []).map(function(t){ var x = deckCandoTest(t); return u.done || !!(x && deckCanMet(x, st)); }); }));
    var cmet = cando.filter(Boolean).length;
    // the five skills: a word known (lasting three weeks or more) counts whole, one being learned counts half
    var sum = Learner.summary(), skills = DECK_SKILLS.map(function(s){
      var c = sum[s[0]] || { known: 0, learning: 0 }, pct = sum.items ? Math.round((c.known + c.learning / 2) / sum.items * 100) : 0;
      return '<li><span class="cd-sk-i" aria-hidden="true">' + ccIcon(s[2]) + '</span><span class="cd-sk-t"><b>' + s[1] + '</b><small>' + c.known + ' known · ' + c.learning + ' learning</small>' +
        '<span class="lg-meter" role="img" aria-label="' + s[1] + ': ' + pct + '%"><i style="width:' + pct + '%"></i></span></span></li>';
    }).join('');
    var tricky = cavesTricky(st.caves), signs = LH_SIGNS.filter(function(s){ return st.light.s[s.id] != null; }).length;
    var mastered = PAT_LIST.filter(function(p){ return (st.pat.m[p.id] || 0) >= PAT_MASTERED; }).length;
    var counts = [
      ['story', Object.keys(st.lagoon).length, 'of ' + LAGOON_STORIES.length + ' stories read'],
      ['talk', Object.keys(st.town).length, 'of ' + TOWN_FOLK.length + ' conversations had'],
      ['bottle', st.bb.l.length, st.bb.l.length === 1 ? 'letter written' : 'letters written'],
      ['lighthouse', signs, 'of ' + LH_SIGNS.length + ' signs read'],
      ['sentence', mastered, 'of ' + PAT_LIST.length + ' patterns mastered'],
      ['mic', tricky.length, tricky.length === 1 ? 'tricky sound: ' + tricky[0].label : tricky.length ? 'tricky sounds: ' + tricky.map(function(c){ return c.label; }).join(', ') : 'tricky sounds']
    ].map(function(c){ return '<li><span class="lg-ic" aria-hidden="true">' + ccIcon(c[0]) + '</span><span><b>' + c[1] + '</b><small>' + esc(c[2]) + '</small></span></li>'; }).join('');
    var rd = deckReadiness({
      lagoon: st.lagoon, town: st.town, note: st.light.m,
      sign: LH_SIGNS.reduce(function(o, s){ if(st.light.s[s.id] != null) o[s.id] = 1; return o; }, {})
    });
    var sits = rd.rows.map(function(r){
      var pct = Math.round(r.share * 100);
      return '<li class="' + (r.share >= 1 ? 'ready' : '') + '"><span class="cd-sit-i" aria-hidden="true">' + ccIcon(r.sit.icon) + '</span><span class="cd-sit-t"><b>' + esc(r.sit.en) + '</b>' +
        '<span class="lg-meter" role="img" aria-label="' + esc(r.sit.en) + ': ' + r.got + ' of ' + r.all + '"><i style="width:' + pct + '%"></i></span></span><small>' + r.got + ' of ' + r.all + '</small></li>';
    }).join('');
    return '<div class="lg-intro"><h2>What you can do</h2><p>In plain words: what you have shown you can do for your trip so far.' +
        (units.length ? ' ' + cmet + ' of the ' + cando.length + ' things your course aims for are done, and ' + done.length + ' of ' + units.length + ' units.' : '') + '</p></div>' +
      '<section class="tw-sec cd-can"><h3>' + ccIcon('check') + ' You can</h3>' +
        (met.length ? '<ul class="cd-cando">' + met.map(function(c){ return '<li class="met">' + ccIcon('check') + '<span>' + esc(c.say) + '</span></li>'; }).join('') + '</ul>' : '<p>Nothing yet: each leg of your voyage adds to this list.</p>') +
        (todo.length ? '<h4>Coming up</h4><ul class="cd-cando">' + todo.slice(0, 3).map(function(c){ return '<li>' + ccIcon('target') + '<span>' + esc(c.say) + '</span></li>'; }).join('') + '</ul>' : '') + '</section>' +
      '<section class="tw-sec"><h3>' + ccIcon('progress') + ' Your five skills</h3><ul class="cd-skills">' + skills + '</ul>' +
        (sum.items ? '<p class="cd-note">Across the ' + sum.items + ' Korean words and phrases you have met.</p>' : '<p class="cd-note">Answer some Korean cards and these fill in.</p>') + '</section>' +
      '<section class="tw-sec"><h3>' + ccIcon('compass') + ' Along the way</h3><ul class="cd-counts">' + counts + '</ul></section>' +
      '<section class="tw-sec cd-ready"><h3>' + ccIcon('globe') + ' Trip readiness</h3>' +
        '<p class="cd-big"><b>' + Math.round(rd.share * 100) + '%</b> of the trip\'s situations covered</p>' +
        '<span class="lg-meter cd-meter" role="img" aria-label="Trip readiness ' + Math.round(rd.share * 100) + '%"><i style="width:' + Math.round(rd.share * 100) + '%"></i></span>' +
        '<ul class="cd-sits">' + sits + '</ul><p class="cd-note">Each situation counts its stories, talks, signs and manners notes done.</p></section>';
  }

  /* ---------- The checkpoint ---------- */
  function deckCheckItems(u, i){
    var pk = deckUnitPicks(u, i), items = [];
    pk.sounds.slice(0, pk.talk && pk.pattern ? 2 : 3).forEach(function(id){
      var c = cavesContrast(id); if(!c) return;
      var set = c.sets[Math.floor(Math.random() * c.sets.length)];
      items.push({ k: 'sound', label: c.label, set: set, a: Math.floor(Math.random() * set.length) });
    });
    var f = pk.talk && townFolk(pk.talk);
    if(f){
      // the first exchange that has a gentle mistake among its answers, so there is something to tell apart
      var ids = [f.start].concat(Object.keys(f.nodes)), node = null;
      for(var j = 0; j < ids.length && !node; j++){ var nd = f.nodes[ids[j]]; if(nd && nd.c && nd.c.some(function(x){ return x.g === 'oops'; }) && nd.c.some(function(x){ return x.g === 'best'; })) node = nd; }
      if(node){
        var best = node.c.find(function(x){ return x.g === 'best'; }), oops = node.c.filter(function(x){ return x.g === 'oops'; });
        items.push({ k: 'talk', who: f.en, line: node.t[0], en: node.t[1], opts: shuffle([best].concat(oops)).map(function(x){ return x.ko; }), right: best.ko, why: best.en });
      }
    }
    var p = pk.pattern && patById(pk.pattern), it = p && p.items.find(function(x){ return x.k === 'notice'; });
    if(it) items.push({ k: 'pattern', pat: p.en, en: it.en, opts: shuffle([it.ko].concat(it.wrong)), right: it.ko, why: it.why });
    var s = lhSign(pk.sign), q = s && s.qs[0];
    if(q) items.push({ k: 'sign', sign: s.id, q: q.q, opts: shuffle(q.opts), right: q.opts[0], why: q.why, key: q.key });
    return items;
  }
  function deckCheckStart(C){
    var now = reefCourseNow(); if(!now || !now.unit) return;
    var items = deckCheckItems(now.unit, now.i); if(!items.length) return;
    C.cp = { unit: now.i, title: now.unit.title, items: items, i: 0, right: 0, picked: null, result: null };
    renderCaptain(); window.scrollTo(0, 0);
    setTimeout(deckCheckSay, 350);
  }
  function deckCheckSay(){
    var C = S.captain, it = C && C.cp && C.cp.items[C.cp.i]; if(!it || S.view !== 'captain') return;
    try { if(it.k === 'sound') Speech.speak(it.set[it.a][0]); else if(it.k === 'talk') Speech.speak(it.line); } catch(e){}
  }
  function deckCheckHTML(C){
    var P = C.cp;
    if(P.result) return '<div class="summary-card reef-sum-card lg-done cd-done"><span class="lg-done-ic" aria-hidden="true">' + ccIcon(P.result.score >= 0.75 ? 'trophy' : 'seedling') + '</span>' +
      '<h2>' + P.right + ' of ' + P.items.length + '</h2><p>' + esc(P.result.msg) + '</p>' +
      '<div class="reef-sum-actions"><button type="button" class="btn btn-primary" data-cd-cpdone>' + ccIcon('map') + ' See my course</button></div></div>';
    var it = P.items[P.i], picked = P.picked, right = it.k === 'sound' ? it.set[it.a][0] : it.right;
    var opts = (it.k === 'sound' ? it.set.map(function(w){ return w[0]; }) : it.opts).map(function(o, oi){
      var cls = picked == null ? '' : o === right ? ' right' : oi === picked ? ' wrong' : ' dim';
      return '<li><button type="button" class="lg-opt' + cls + '" data-cd-opt="' + oi + '"' + (picked != null ? ' aria-disabled="true"' : '') + '><span' + (/[가-힣]/.test(o) ? ' lang="ko"' : '') + '>' + esc(o) + '</span></button></li>';
    }).join('');
    var ask = it.k === 'sound' ? '<div class="lg-q"><button type="button" class="lg-mini" data-cd-hear aria-label="Hear it again">' + ccIcon('sound') + '</button><div><b>Which word did you hear?</b><span>' + esc(it.label) + '</span></div></div>' :
      it.k === 'talk' ? '<div class="lg-q"><button type="button" class="lg-mini" data-cd-hear aria-label="Hear it again">' + ccIcon('sound') + '</button><div><span>' + esc(it.who) + ' says</span><b lang="ko">' + esc(it.line) + '</b><span>' + esc(it.en) + '</span><span>What do you answer?</span></div></div>' :
      it.k === 'pattern' ? '<div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('sentence') + '</span><div><b>Which one says "' + esc(it.en) + '"?</b><span>' + esc(it.pat) + '</span></div></div>' :
      '<div class="cd-sign" aria-hidden="true">' + lhSignHTML(lhSign(it.sign), {}) + '</div><div class="lg-q"><span class="pr-qic" aria-hidden="true">' + ccIcon('search') + '</span><div><b>' + esc(it.q) + '</b></div></div>';
    var ok = picked != null && (it.k === 'sound' ? picked === it.a : it.opts[picked] === it.right);
    var fb = picked == null ? '' : '<p class="lg-fb ' + (ok ? 'ok' : 'no') + '" role="status">' + ccIcon(ok ? 'check' : 'bulb') + '<span>' + (ok ? 'Yes! ' : 'Not quite: it was ' + right + '. ') +
      esc(it.k === 'sound' ? it.set[it.a][1] : it.why || '') + '</span></p>';
    return '<div class="lg-title"><h2>Checkpoint</h2><span>' + esc(P.title) + ' · ' + (P.i + 1) + ' of ' + P.items.length + '</span></div>' +
      '<div class="lg-quiz">' + ask + '<ul class="lg-opts">' + opts + '</ul>' + fb + '</div>' +
      '<div class="lg-bar">' + (picked != null ? '<button type="button" class="btn btn-primary" data-cd-next>' + (P.i + 1 < P.items.length ? 'Next' : 'See how it went') + '</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-cd-quit>Stop the checkpoint</button></div>';
  }
  function deckCheckAnswer(C, oi){
    var P = C.cp, it = P.items[P.i]; if(P.picked != null) return;
    P.picked = oi;
    var ok = it.k === 'sound' ? oi === it.a : it.opts[oi] === it.right;
    if(ok) P.right++;
    try {
      if(it.k === 'sound') Learner.record(it.set[it.a][0], 'hear', ok ? 'good' : 'again');
      else if(it.k === 'sign') Learner.record(it.key, 'read', ok ? 'good' : 'again');
      else Learner.record(it.right, 'use', ok ? 'good' : 'again');
    } catch(e){}
    try { if(ok) Sound.correct(); else Sound.wrong(); } catch(e){}
    deckKeep();
  }
  // The result goes through the Library's own check code, so a checkpoint moves the course exactly as its unit check does
  function deckCheckFinish(C){
    var P = C.cp, score = P.right / P.items.length, co = window.CoralCove && window.CoralCove.course(), lib = window.CoralLibrary;
    var u = co && co.units[P.unit], msg;
    if(co && u && lib && lib.courseAdjust){
      msg = lib.courseAdjust(co, u.review ? 'review' : 'unit', P.unit, score, [], {});
      window.CoralCove.setCourse(co);
    } else msg = 'Checkpoint: ' + Math.round(score * 100) + '%. Open My course in the Library to see your plan.';
    var d = deckData(); d.cp[u ? u.id : 'u' + P.unit] = { day: deckToday(), score: score }; deckSave(d);
    P.result = { score: score, msg: msg };
    try { reefWinSound(score >= 0.75); } catch(e){}
    try { if(score >= 0.75 && !reefCalm()) Ocean.bubbles(10); } catch(e){}
    renderCaptain(); window.scrollTo(0, 0);
  }

  function deckWire(C){
    function on(sel, fn){ app.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ fn(x, e); }); }); }
    on('[data-act="cd-home"]', function(){ try { Speech.stop(); } catch(e){} C.cp = null; goHome(); });
    on('[data-cd-tab]', function(x){ try { Speech.stop(); } catch(e){} C.tab = x.dataset.cdTab; renderCaptain(); window.scrollTo(0, 0); });
    on('[data-cd-leg]', function(x){ var l = C.plan && C.plan.legs[+x.dataset.cdLeg]; if(l) deckOpenLeg(l); });
    on('[data-cd-unit]', function(x){ C.pick = +x.dataset.cdUnit; deckKeep(); });
    on('[data-cd-library]', function(){ if(window.CoralLibrary){ window.CoralLibrary.open(); window.CoralLibrary.go('classroom'); } });
    on('[data-cd-check]', function(){ deckCheckStart(C); });
    on('[data-cd-hear]', deckCheckSay);
    on('[data-cd-opt]', function(x){ deckCheckAnswer(C, +x.dataset.cdOpt); });
    on('[data-cd-next]', function(){ var P = C.cp; P.i++; P.picked = null; if(P.i >= P.items.length) return deckCheckFinish(C); renderCaptain(); window.scrollTo(0, 0); setTimeout(deckCheckSay, 300); });
    on('[data-cd-quit]', function(){ try { Speech.stop(); } catch(e){} C.cp = null; renderCaptain(); window.scrollTo(0, 0); });
    on('[data-cd-cpdone]', function(){ C.cp = null; C.tab = 'course'; C.pick = null; renderCaptain(); window.scrollTo(0, 0); });
    var cur = app.querySelector('.cd-isle.picked'); if(cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ---------- On the board and the treasure map ---------- */
  // The board's small way in: shown for a profile with a course while today's voyage has legs left
  function deckBoardButton(wrap){
    var b = wrap && wrap.querySelector('[data-r3-voy]'); if(!b) return;
    if(!reefCourseOn()) return;
    b.addEventListener('click', function(e){ e.stopPropagation(); deckOpenFromBoard(b); });
    var pid = S.profile && S.profile.id;
    deckEnsure().then(function(d){
      if(!b.isConnected || (S.profile && S.profile.id) !== pid) return;
      var left = deckLeft(d);
      b.hidden = !left;
      b.querySelector('span').textContent = left + ' leg' + (left === 1 ? '' : 's') + ' today';
      b.setAttribute('aria-label', 'Captain\'s Deck: ' + left + ' leg' + (left === 1 ? '' : 's') + ' of today\'s voyage left');
    });
  }
  // Today's legs under the voyage strip in the treasure map
  function deckMapTodayHTML(){
    var d = deckTodayPlan(); if(!d) return '';
    return '<div class="r3-voy-today"><b class="r3-voy-h">Today\'s voyage: ' + (d.legs.length - deckLeft(d)) + ' of ' + d.legs.length + ' done</b><ul>' + d.legs.map(function(l){
      var done = !!d.done[l.key];
      return '<li class="' + (done ? 'done' : '') + '"><span class="r3-voy-li" aria-hidden="true">' + ccIcon(done ? 'check' : l.icon) + '</span><span>' + esc(l.title) + '</span></li>';
    }).join('') + '</ul><button type="button" class="r3-btn" data-r3-deck>' + ccIcon('anchor') + ' Open Captain\'s Deck</button></div>';
  }
