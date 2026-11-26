  /* A region supplies ordinary Reef 3D zones. Lessons keep their own screens and progress. */
  var REGION_BOARD_META = {
    lagoon: { name:'Story Lagoon', icon:'story', lead:'Visit the story keeper among the reed islands.', near:['town','caves','captain'], theme:'lagoon' },
    town: { name:'Harbor Town', icon:'talk', lead:'Meet the townsfolk along the harbor streets.', near:['lagoon','patterns','captain'], theme:'town' },
    caves: { name:'Echo Caves', icon:'sound', lead:'Meet Echo in the crystal caverns.', near:['town','patterns','captain'], theme:'caves' },
    patterns: { name:'Pattern Reef', icon:'sentence', lead:'Build sentences with Pip in the coral gardens.', near:['caves','beach','captain'], theme:'patterns' },
    beach: { name:'Bottle Beach', icon:'bottle', lead:'Find Jisu and write back from the shore.', near:['patterns','light','captain'], theme:'beach' },
    light: { name:'The Lighthouse', icon:'lighthouse', lead:'Visit Keeper Hana on the lighthouse cliffs.', near:['beach','lagoon','captain'], theme:'light' },
    captain: { name:"Captain's Deck", icon:'anchor', lead:"Come aboard and plan your next voyage.", near:['lagoon','town','light'], theme:'captain' }
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
    REGION_PRACTICE[region].forEach(function(practice){
      out.push({ region:region, id:'practice:' + practice.id, name:practice.name, icon:practice.icon,
        detail:practice.detail, done:practice.rule ? !!cv.rules[practice.rule] : false, practice:practice });
    });
    return out;
  }
  function regionBoardZones(region, acts){
    var meta = REGION_BOARD_META[region];
    acts = acts || regionBoardActivities(region);
    var place = reefPlaceFor('korean', meta.name);
    function item(a, emoji){
      var rehearsal = a.practice && !a.practice.rule;
      return { d:{ id:'rb-' + region + '-' + a.id, name:a.name, emoji:emoji, regionActivity:{ region:region, id:a.id } },
        dc:{ due:rehearsal || a.done ? 0 : 1, total:rehearsal ? 0 : 1 }, kind:rehearsal ? 'Rehearsal' : null,
        state:rehearsal ? 'practice' : a.done ? 'done' : 'ready' };
    }
    var zone = { id:region, label:meta.name, place:place, region:{ id:region, name:meta.name, theme:meta.theme },
      items:acts.filter(function(a){ return !a.practice; }).map(function(a, i){ return item(a, String(i + 1)); }) };
    var zones = [zone]; zones.region = zone.region;
    zones.expansion = { learning:acts.filter(function(a){ return a.practice; }).map(function(a){ return item(a, '📝'); }) };
    return zones;
  }
  function regionBoardNavigate(region, immediate){
    var go = { lagoon:openLagoon, town:openTown, caves:openCaves, patterns:openPatterns,
      beach:openBeach, light:openLight, captain:openCaptain }[region];
    if(go){ if(immediate) go(); else regionTravel(region, go); }
  }
  function regionBoardTownVenue(entry){
    if(!entry) return null;
    if(entry.practice && entry.practice.talk) return entry.practice.talk;
    if(typeof TOWN_FOLK !== 'undefined' && TOWN_FOLK.some(function(f){ return f.id === entry.id; })) return entry.id;
    return null;
  }
  function regionBoardCanEnterTown3d(){
    return typeof R3 !== 'undefined' && !R3.failed &&
      typeof regionPeopleOpen === 'function' && typeof reef3dMount === 'function';
  }
  function regionBoardEnterTownPlace(entry, venueId){
    var st = regionBoardState('town');
    var openActivity = entry.practice
      ? { region:'town', id:entry.id, venueId:venueId, practice:entry.practice }
      : { region:'town', id:venueId };
    st.mode = 'board';
    st.practice = null;
    st.played = false;
    st.activity = null;
    st.completed = false;
    st.pendingTownOpen = null;
    try { Speech.stop(); } catch(e){}
    if(S.view !== 'town' && S.view !== 'townTalk') regionBoardNavigate('town', true);
    else S.view = 'town';
    var root = app && typeof app.querySelector === 'function' ? app.querySelector('.rb-root[data-region-board="town"]') : null;
    var guide = root && root.querySelector('.rb-guide');
    if(guide && guide.open) guide.open = false;
    if(R3.view && R3.view.encounter && typeof regionEncounterEnd === 'function') regionEncounterEnd(R3.view);
    if(!root || !R3.view || R3.view.parked || !R3.view.region || R3.view.region.id !== 'town' || !R3.view.wrap || !R3.view.wrap.isConnected){
      if(typeof render === 'function') render();
      else regionBoardRender('town');
      root = app && typeof app.querySelector === 'function' ? app.querySelector('.rb-root[data-region-board="town"]') : null;
      guide = root && root.querySelector('.rb-guide');
      if(guide && guide.open) guide.open = false;
    }
    var view = R3.view;
    if(view && !view.parked && view.region && view.region.id === 'town' && view.regionPeople && view.wrap && view.wrap.isConnected){
      if(view.dice && view.dice.rolling && typeof reef3dDiceDone === 'function') reef3dDiceDone(view, view.dice);
      view.greetEpoch = (view.greetEpoch || 0) + 1;
      if(regionPeopleOpen(view, 'town:' + venueId, openActivity)){
        window.scrollTo(0, 0);
        return true;
      }
      if(!view.leaving && !R3.failed){
        st.pendingTownOpen = { venueId:venueId, activity:openActivity, pid:st.pid };
        window.scrollTo(0, 0);
        return true;
      }
    } else if(!R3.failed){
      st.pendingTownOpen = { venueId:venueId, activity:openActivity, pid:st.pid };
      window.scrollTo(0, 0);
      return true;
    }
    return false;
  }
  function regionBoardLaunch(activity){
    if(!activity || !REGION_BOARD_META[activity.region]) return false;
    var region = activity.region, id = String(activity.id || '');
    var entry = regionBoardActivities(region).find(function(a){ return a.id === id; });
    if(!entry) return false;
    var rehearsal = entry.practice && !entry.practice.rule;
    var townVenue = region === 'town' ? regionBoardTownVenue(entry) : null;
    var keepTarget = townVenue ? { region:'town', id:townVenue } : activity;
    var retainedEncounter = typeof regionEncounterKeep === 'function' && regionEncounterKeep(R3.view, keepTarget);
    if(region === 'town' && townVenue && !retainedEncounter && regionBoardCanEnterTown3d()){
      if(regionBoardEnterTownPlace(entry, townVenue)) return true;
    }
    if(!retainedEncounter) reef3dUnmount();
    if(S.view !== region && !(region === 'lagoon' && S.view === 'lagoonRead') && !(region === 'town' && S.view === 'townTalk')) regionBoardNavigate(region, true);
    var st = regionBoardState(region);
    st.pendingTownOpen = null;
    var townRepairEncounter = !!(retainedEncounter && rehearsal && region === 'town' && townVenue);
    st.played = townRepairEncounter ? true : !rehearsal;
    st.activity = townRepairEncounter ? townVenue : (rehearsal ? null : id);
    st.completed = false;
    try { Speech.stop(); } catch(e){}
    if(rehearsal){
      if(townRepairEncounter){
        S.town = Object.assign(S.town || {}, { id:townVenue, log:[], speaking:false, waiting:false, phase:'talk' });
        S.view = 'townTalk';
      } else {
        S.view = region;
      }
      st.practice = { activity:entry.practice, drafts:{}, revealed:{} };
      regionPracticeRender(region, st.practice);
      if(townRepairEncounter && typeof regionEncounterAttach === 'function') regionEncounterAttach(app);
    } else if(region === 'lagoon') lagoonOpenStory(id);
    else if(region === 'town') townOpenTalk(id);
    else if(region === 'caves'){
      if(entry.practice){ cavesGo('rules'); cavesOpenRule(entry.practice.rule); }
      else cavesGo(id);
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
    st.pendingTownOpen = null;
    render();
    window.scrollTo(0, 0);
  }
  function regionBoardListNav(region){
    var st = S.regionBoard, page = app && typeof app.querySelector === 'function' ? app.querySelector('.nav-row') : null;
    if(!st || st.region !== region || st.mode !== 'list' || S.view !== region || !page) return;
    if(!page.querySelector('[data-rb-board]')){
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'back-btn rb-return'; button.dataset.rbBoard = region;
      button.innerHTML = ccIcon('map') + ' Board';
      button.addEventListener('click', function(){ regionBoardReturn(region); });
      page.appendChild(button);
    }
    if(region === 'town' && typeof REGION_PRACTICE !== 'undefined' && Array.isArray(REGION_PRACTICE.town) && REGION_PRACTICE.town.length){
      var listPage = app.querySelector('.lg-page');
      if(listPage && !listPage.querySelector('[data-rb-town-repairs]')){
        var sec = document.createElement('section');
        sec.className = 'tw-sec rb-town-repairs';
        sec.setAttribute('data-rb-town-repairs', '1');
        sec.innerHTML = '<h3>' + ccIcon('sparkle') + ' Quick repairs</h3><div class="rb-repair-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">' +
          REGION_PRACTICE.town.map(function(pr){
            return '<button type="button" class="rb-card" data-rb-town-repair="practice:' + esc(pr.id) + '" style="border:1px solid rgba(25,58,66,.16);background:rgba(255,250,235,.85)">' +
              '<span class="rb-card-icon" aria-hidden="true">' + ccIcon(pr.icon || 'talk') + '</span>' +
              '<span><b>' + esc(pr.name) + '</b><small>' + esc(pr.detail) + '</small></span></button>';
          }).join('') + '</div>';
        sec.querySelectorAll('[data-rb-town-repair]').forEach(function(b){
          b.addEventListener('click', function(){ regionBoardLaunch({ region:'town', id:b.dataset.rbTownRepair }); });
        });
        listPage.appendChild(sec);
      }
    }
  }
  function regionBoardReturn(region){
    if(!REGION_BOARD_META[region]) return;
    var st = regionBoardState(region); st.mode = 'board';
    st.practice = null;
    st.pendingTownOpen = null;
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
    var st = regionBoardState(region);
    if(st.practice) return regionPracticeRender(region, st.practice);
    if(st.mode === 'list'){
      // Some content screens call their own renderer directly, bypassing the app's afterRender hooks.
      Promise.resolve().then(function(){ regionBoardListNav(region); });
      return false;
    }
    if(S.regionBoard.played){
      R3.fromRegionActivity = { region:region, pid:S.regionBoard.pid, completed:!!S.regionBoard.completed };
      S.regionBoard.played = false; S.regionBoard.completed = false; S.regionBoard.activity = null;
    }
    var meta = REGION_BOARD_META[region], acts = regionBoardActivities(region), zones = regionBoardZones(region, acts);
    var homeLabel = S.deckBack ? "Captain's Deck" : 'Coral Cove';
    var links = meta.near.map(function(id){ var m = REGION_BOARD_META[id]; return '<button type="button" data-rb-region="' + id + '">' + ccIcon(m.icon) + '<span>' + esc(m.name) + '</span></button>'; }).join('');
    var cards = acts.map(function(a){ return '<button type="button" class="rb-card' + (a.done ? ' done' : '') + '" data-rb-activity="' + esc(a.id) + '">' +
      '<span class="rb-card-icon" aria-hidden="true">' + ccIcon(a.icon) + '</span><span><b>' + esc(a.name) + '</b><small>' + esc(a.detail) + '</small></span>' +
      (a.done ? '<span class="rb-done" aria-label="Complete">' + ccIcon('check') + '</span>' : '') + '</button>'; }).join('');
    app.innerHTML = '<section class="rb-root rw ' + (reefNight() ? 'night' : 'day') + '" data-region-board="' + region + '" aria-label="' + esc(meta.name) + ' board">' +
      '<div class="rb-overlay"><div class="rb-title">' + ccIcon(meta.icon) + '<span><b>' + esc(meta.name) + '</b><small>' + esc(meta.lead) + '</small></span></div>' +
      '<div class="rb-actions"><button type="button" data-rb-home aria-label="' + esc(homeLabel) + '">' + ccIcon(S.deckBack ? 'anchor' : 'map') + '<span>' + esc(homeLabel) + '</span></button>' +
      '<button type="button" class="rb-activities" data-rb-list aria-label="Activities">' + ccIcon('cards') + '<span>Activities</span></button>' +
      '<button type="button" class="rb-roll" data-rb-roll aria-label="Choose or roll a die">' + ccIcon('dice') + '<span>Dice</span></button>' +
      '<button type="button" class="rb-map" data-rb-map data-r3-map aria-label="Treasure map">' + ccIcon('map') + '<span>Map</span></button></div></div>' +
      '<div class="rw-scene rb-scene"><div class="rb-fallback"><h2>' + esc(meta.name) + '</h2><p>' + esc(meta.lead) + '</p>' + cards + '</div></div>' +
      '<details class="rb-guide"><summary>' + ccIcon('compass') + ' Travel</summary><div class="rb-guide-list">' +
      '<nav class="rb-near" aria-label="Nearby places"><span>Nearby</span>' + links + '</nav>' + cards + '</div></details>' +
      '</section>';
    var root = app.querySelector('.rb-root'), guide = root.querySelector('.rb-guide');
    root.addEventListener('click', function(e){
      if(guide && guide.open && !guide.contains(e.target) && !e.target.closest('.r3-menu, .r3-menubtn')) guide.open = false;
      var b = e.target.closest('button'); if(!b || !root.contains(b)) return;
      if(b.hasAttribute('data-rb-home')){ regionTravel(S.deckBack ? 'captain' : 'cove', goHome); return; }
      if(b.hasAttribute('data-rb-roll')){
        var v = R3.view;
        if(v && v.region && v.region.id === region && !v.moving && !v.wrap.querySelector('.r3-panel')){
          if(v.dice) reef3dDiceHit(v); else reef3dDice(v);
        }
        return;
      }
      if(b.hasAttribute('data-rb-map')){
        var vm = R3.view;
        if(vm && vm.region && vm.region.id === region && !vm.moving && !vm.wrap.querySelector('.r3-panel')) reef3dMap(vm);
        return;
      }
      if(b.hasAttribute('data-rb-list')){ regionBoardShowList(region); return; }
      if(b.dataset.rbRegion){ regionBoardNavigate(b.dataset.rbRegion); return; }
      if(b.dataset.rbActivity){ regionBoardLaunch({ region:region, id:b.dataset.rbActivity }); }
    });
    if(guide){
      guide.addEventListener('keydown', function(e){ if(e.key === 'Escape' && guide.open){ e.preventDefault(); guide.open = false; } });
    }
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
    var st = S.regionBoard;
    if(st && st.region === 'town' && st.practice && S.view === 'townTalk' &&
       app && typeof app.querySelector === 'function' && !app.querySelector('[data-rp-back]')){
      regionPracticeRender('town', st.practice);
    }
    var root = app && typeof app.querySelector === 'function' ? app.querySelector('.rb-root[data-region-board]') : null;
    var encounter = regionEncounterAttach(app);
    if(!root && !encounter && R3.view && R3.view.region) reef3dUnmount(R3.view.region.id);
    if(!root && st) regionBoardListNav(st.region);
    regionPeopleLessonSync();
  });
  if(typeof app !== 'undefined' && app && typeof app.addEventListener === 'function'){
    app.addEventListener('click', function(e){
      var btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-tw-open]') : null;
      if(!btn || !btn.dataset || !btn.dataset.twOpen) return;
      var st = S.regionBoard;
      if(!st || st.region !== 'town' || (S.view !== 'town' && S.view !== 'townTalk')) return;
      if(!regionBoardCanEnterTown3d()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      regionBoardLaunch({ region:'town', id:btn.dataset.twOpen });
    }, true);
  }
  // Learning screens can render directly after a reply or a listening step.
  var regionPeopleScreenWatch = new MutationObserver(function(){
    if(!regionEncounterAttach(app) && R3.view && R3.view.encounter && !regionEncounterActive(R3.view)) regionEncounterEnd(R3.view);
    regionPeopleLessonSync();
  });
  regionPeopleScreenWatch.observe(app, { childList:true });
