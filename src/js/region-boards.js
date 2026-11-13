  /* A region supplies ordinary Reef 3D zones. Lessons keep their own screens and progress. */
  var REGION_BOARD_META = {
    lagoon: { name:'Story Lagoon', icon:'story', lead:'Sail between short conversations from your trip.', near:['town','caves','captain'], theme:'lagoon' },
    town: { name:'Harbor Town', icon:'talk', lead:'Visit the townsfolk and practice a conversation.', near:['lagoon','patterns','captain'], theme:'town' },
    caves: { name:'Echo Caves', icon:'sound', lead:'Listen, echo, and learn the sounds of Korean.', near:['town','patterns','captain'], theme:'caves' },
    patterns: { name:'Pattern Reef', icon:'sentence', lead:'Build sentences, one pattern at a time.', near:['caves','beach','captain'], theme:'patterns' },
    beach: { name:'Bottle Beach', icon:'bottle', lead:'Read a letter from Jisu and write back.', near:['patterns','light','captain'], theme:'beach' },
    light: { name:'The Lighthouse', icon:'lighthouse', lead:'Read signs and discover everyday manners.', near:['beach','lagoon','captain'], theme:'light' },
    captain: { name:"Captain's Deck", icon:'anchor', lead:"See today's plan, your course, and your progress.", near:['lagoon','town','light'], theme:'captain' }
  };

  function regionBoardOpen(region, direct){
    if(!REGION_BOARD_META[region]) return;
    S.regionBoard = { region:region, mode:direct ? 'list' : 'board', pid:S.profile && S.profile.id || null };
  }
  function regionBoardState(region){
    var r = S.regionBoard, pid = S.profile && S.profile.id || null;
    if(!r || r.region !== region || r.pid !== pid) regionBoardOpen(region);
    return S.regionBoard;
  }
  function regionBoardActivities(region){
    var out = [];
    function add(id, name, icon, detail, done){ out.push({ region:region, id:id, name:name, icon:icon, detail:detail || '', done:!!done }); }
    if(region === 'lagoon'){
      var lg = lagoonDone();
      LAGOON_STORIES.forEach(function(s){ add(s.id, s.en, LAGOON_ICON[s.id] || 'story', s.ko, lg[s.id]); });
    } else if(region === 'town'){
      var tw = townDone();
      TOWN_FOLK.forEach(function(f){ add(f.id, f.en, f.icon || 'talk', f.place, tw[f.id]); });
    } else if(region === 'caves'){
      var cv = cavesData();
      add('pairs', 'Sound pairs', 'pairs', 'Hear the difference between sounds', false);
      add('shadow', 'Shadow a line', 'mic', 'Listen and echo a Korean line', false);
      add('rules', 'Sound rules', 'bulb', 'Learn how each sound works', CAVES_RULES.every(function(r){ return cv.rules[r.id]; }));
    } else if(region === 'patterns'){
      var pd = patData();
      PAT_LIST.forEach(function(p){ add(p.id, p.en, 'sentence', p.ko, (pd.m[p.id] || 0) >= PAT_MASTERED); });
    } else if(region === 'beach'){
      var bd = bbAnswered(bbData());
      BB_BOTTLES.forEach(function(b){ add(b.id, b.en, 'bottle', b.ko, bd[b.id]); });
      add('letters', 'Your letters', 'story', 'Read the letters you have sent');
    } else if(region === 'light'){
      var ld = lhData();
      LH_SIGNS.forEach(function(s){ add(s.id, s.en, s.icon || 'search', 'Read a sign', ld.s[s.id] === s.qs.length); });
      LH_MANNERS.forEach(function(m){ add('manner:' + m.id, m.en, m.icon || 'heart', 'Everyday manners', ld.m[m.id]); });
    } else if(region === 'captain'){
      add('today', "Today's plan", 'compass', 'Your next legs');
      add('course', 'The course', 'island', 'Islands and checkpoints');
      add('can', 'What you can do', 'progress', 'See your skills and progress');
    }
    return out;
  }
  function regionBoardZones(region){
    var meta = REGION_BOARD_META[region], acts = regionBoardActivities(region);
    var place = reefPlaceFor('korean', meta.name);
    var zone = { id:region, label:meta.name, place:place, region:{ id:region, name:meta.name, theme:meta.theme }, items:acts.map(function(a, i){
      return { d:{ id:'rb-' + region + '-' + a.id, name:a.name, emoji:String(i + 1), regionActivity:{ region:region, id:a.id } },
        dc:{ due:a.done ? 0 : 1, total:1 }, kind:null, state:a.done ? 'done' : 'ready' };
    }) };
    var zones = [zone]; zones.region = zone.region;
    return zones;
  }
  function regionBoardNavigate(region, immediate){
    var go = { lagoon:openLagoon, town:openTown, caves:openCaves, patterns:openPatterns,
      beach:openBeach, light:openLight, captain:openCaptain }[region];
    if(go){ if(immediate) go(); else regionTravel(region, go); }
  }
  function regionBoardLaunch(activity){
    if(!activity || !REGION_BOARD_META[activity.region]) return false;
    var region = activity.region, id = String(activity.id || '');
    if(!regionBoardActivities(region).some(function(a){ return a.id === id; })) return false;
    reef3dUnmount();
    if(S.view !== region && !(region === 'lagoon' && S.view === 'lagoonRead') && !(region === 'town' && S.view === 'townTalk')) regionBoardNavigate(region, true);
    if(region !== 'captain'){
      var st = regionBoardState(region);
      st.played = true; st.activity = id; st.completed = false;
    }
    try { Speech.stop(); } catch(e){}
    if(region === 'lagoon') lagoonOpenStory(id);
    else if(region === 'town') townOpenTalk(id);
    else if(region === 'caves'){
      cavesGo(id);
      if(id === 'pairs'){
        var round = S.caves && S.caves.round;
        setTimeout(function(){
          if(S.view === 'caves' && S.caves && S.caves.sec === 'pairs' && S.caves.round === round &&
             S.regionBoard && S.regionBoard.region === 'caves' && S.regionBoard.activity === 'pairs') cavesPlayQ();
        }, 350);
      }
    } else if(region === 'patterns'){ S.patterns.id = id; S.patterns.round = null; renderPatterns(); }
    else if(region === 'beach'){
      if(id === 'letters'){ S.beach.view = 'letters'; renderBeach(); }
      else { bbStart(bbById(id)); renderBeach(); }
    } else if(region === 'light'){
      if(id.indexOf('manner:') === 0) lhOpenManner(S.light, id.slice(7));
      else lhOpenSign(S.light, id);
      renderLight();
    } else if(region === 'captain'){
      var tab = id === 'course' || id === 'can' ? id : 'today';
      S.captain.tab = tab;
      regionBoardShowList(region);
    }
    window.scrollTo(0, 0);
    return true;
  }
  // A region calls this at a real finish point, after its learning record has been saved.
  // Merely opening or leaving an activity never grants a completion reward.
  function regionBoardActivityCompleted(region, id){
    var st = S.regionBoard, pid = S.profile && S.profile.id || null;
    if(st && st.pid === pid && st.region === region && st.activity === id && st.played) st.completed = true;
  }
  function regionBoardShowList(region){
    var st = regionBoardState(region);
    st.mode = 'list';
    render();
    window.scrollTo(0, 0);
  }
  function regionBoardListNav(region){
    var st = S.regionBoard, page = app.querySelector('.nav-row');
    if(!st || st.region !== region || st.mode !== 'list' || S.view !== region || !page || page.querySelector('[data-rb-board]')) return;
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'back-btn rb-return'; button.dataset.rbBoard = region;
    button.innerHTML = ccIcon('map') + ' Board';
    button.addEventListener('click', function(){ regionBoardReturn(region); });
    page.appendChild(button);
  }
  function regionBoardReturn(region){
    if(!REGION_BOARD_META[region]) return;
    var st = regionBoardState(region); st.mode = 'board';
    if(region === 'lagoon'){ lagoonStop(); S.view = 'lagoon'; }
    else if(region === 'town'){ townStop(); S.view = 'town'; }
    else if(region === 'caves'){ cavesStopAll(); S.caves.sec = null; S.caves.line = null; S.caves.rule = null; S.caves.round = null; S.view = 'caves'; }
    else if(region === 'patterns'){ S.patterns.id = null; S.patterns.round = null; S.view = 'patterns'; }
    else if(region === 'beach'){ S.beach.id = null; S.beach.view = 'list'; S.view = 'beach'; }
    else if(region === 'light'){ S.light.id = null; S.light.view = 'list'; S.view = 'light'; }
    else if(region === 'captain'){ S.captain.cp = null; S.view = 'captain'; }
    render(); window.scrollTo(0, 0);
  }
  function regionBoardRender(region){
    if(!REGION_BOARD_META[region]) return false;
    if(regionBoardState(region).mode === 'list'){
      // Some content screens call their own renderer directly, bypassing the app's afterRender hooks.
      Promise.resolve().then(function(){ regionBoardListNav(region); });
      return false;
    }
    if(S.regionBoard.played){
      R3.fromRegionActivity = { region:region, pid:S.regionBoard.pid, completed:!!S.regionBoard.completed };
      S.regionBoard.played = false; S.regionBoard.completed = false; S.regionBoard.activity = null;
    }
    var meta = REGION_BOARD_META[region], zones = regionBoardZones(region), acts = regionBoardActivities(region);
    var homeLabel = S.deckBack ? "Captain's Deck" : 'Coral Cove';
    var links = meta.near.map(function(id){ var m = REGION_BOARD_META[id]; return '<button type="button" data-rb-region="' + id + '">' + ccIcon(m.icon) + '<span>' + esc(m.name) + '</span></button>'; }).join('');
    var cards = acts.map(function(a){ return '<button type="button" class="rb-card' + (a.done ? ' done' : '') + '" data-rb-activity="' + esc(a.id) + '">' +
      '<span class="rb-card-icon" aria-hidden="true">' + ccIcon(a.icon) + '</span><span><b>' + esc(a.name) + '</b><small>' + esc(a.detail) + '</small></span>' +
      (a.done ? '<span class="rb-done" aria-label="Complete">' + ccIcon('check') + '</span>' : '') + '</button>'; }).join('');
    app.innerHTML = '<section class="rb-root rw ' + (reefNight() ? 'night' : 'day') + '" data-region-board="' + region + '" aria-label="' + esc(meta.name) + ' board">' +
      '<div class="rb-overlay"><div class="rb-title">' + ccIcon(meta.icon) + '<span><b>' + esc(meta.name) + '</b><small>' + esc(meta.lead) + '</small></span></div>' +
      '<div class="rb-actions"><button type="button" data-rb-home aria-label="' + esc(homeLabel) + '">' + ccIcon(S.deckBack ? 'anchor' : 'map') + '<span>' + esc(homeLabel) + '</span></button>' +
      '<button type="button" data-rb-roll aria-label="Choose or roll a die">' + ccIcon('dice') + '<span>Dice</span></button>' +
      '<button type="button" class="rb-activities" data-rb-list aria-label="Activities">' + ccIcon('cards') + '<span>Activities</span></button></div></div>' +
      '<div class="rw-scene rb-scene"><div class="rb-fallback"><h2>' + esc(meta.name) + '</h2><p>' + esc(meta.lead) + '</p>' + cards + '</div></div>' +
      '<details class="rb-guide"><summary>' + ccIcon('cards') + ' All activities</summary><div class="rb-guide-list">' +
      '<nav class="rb-near" aria-label="Nearby places"><span>Nearby</span>' + links + '</nav>' + cards + '</div></details>' +
      '</section>';
    var root = app.querySelector('.rb-root');
    root.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b || !root.contains(b)) return;
      if(b.hasAttribute('data-rb-home')){ regionTravel(S.deckBack ? 'captain' : 'cove', goHome); return; }
      if(b.hasAttribute('data-rb-roll')){
        var v = R3.view;
        if(v && v.region && v.region.id === region && !v.moving && !v.wrap.querySelector('.r3-panel')){
          if(v.dice) reef3dDiceHit(v); else reef3dDice(v);
        }
        return;
      }
      if(b.hasAttribute('data-rb-list')){ regionBoardShowList(region); return; }
      if(b.dataset.rbRegion){ regionBoardNavigate(b.dataset.rbRegion); return; }
      if(b.dataset.rbActivity){ regionBoardLaunch({ region:region, id:b.dataset.rbActivity }); }
    });
    reef3dMount(root, zones);
    reefBoardMenuSync();
    return true;
  }
  window.__regionBoardView = function(){
    var st = S.regionBoard, region = st && st.region, v = R3.view;
    if(!region || !REGION_BOARD_META[region] || !S.profile || st.pid !== S.profile.id ||
       (S.view !== region && !(region === 'lagoon' && S.view === 'lagoonRead') && !(region === 'town' && S.view === 'townTalk'))) return null;
    var root = app.querySelector('.rb-root[data-region-board="' + region + '"]');
    return { region:region, mode:st.mode, activities:regionBoardActivities(region).length,
      has3d:!!(root && v && v.wrap && root.contains(v.wrap) && v.region && v.region.id === region),
      position:v && v.region && v.region.id === region ? v.at : null };
  };
  afterRender('region board lifecycle', function(){
    var root = app.querySelector('.rb-root[data-region-board]');
    if(!root && R3.view && R3.view.region) reef3dUnmount(R3.view.region.id);
    if(!root && S.regionBoard) regionBoardListNav(S.regionBoard.region);
  });
