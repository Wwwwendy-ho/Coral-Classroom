  /* ---------- Jamboree & Beyond-MP Integration Bridge ----------
     Connects WorldState, CulturePacks, JamboreeVisuals, JamboreeRooms,
     JamboreeRegions, and JamboreePlay cleanly into board.js, encounter-interiors.js,
     and the collapsed BOARD_MENU without cluttering the 2-corner HUD. */
  var JamboreeBridge = (function(){
    var activePid = null;

    function syncProfile(){
      if(!window.WorldState) return;
      var pid = (typeof S !== 'undefined' && S && S.activeProfileId) ? String(S.activeProfileId) : 'default';
      if(activePid !== pid){
        activePid = pid;
        try { window.WorldState.resetForProfile(pid); } catch(e){}
      }
    }

    function regionIdOf(view){
      return (view && view.region && view.region.id) ? view.region.id : 'cove';
    }

    function onFrame(view, now, dt){
      if(!view || view.disposed || view.parked) return;
      syncProfile();
      if(!view._jmbAttached){
        view._jmbAttached = true;
        try { if(window.JamboreeVisuals && JamboreeVisuals.attach) JamboreeVisuals.attach(view); } catch(e){}
        try { if(window.JamboreeRegions && JamboreeRegions.attach) JamboreeRegions.attach(view); } catch(e){}
        try { if(window.JamboreePlay && JamboreePlay.attach) JamboreePlay.attach(view); } catch(e){}
        if(view.wrap && !view._jmbPtr && typeof view.wrap.addEventListener === 'function'){
          view._jmbPtr = function(ev){
            if(!view.encounter || !view.encounter.interior) return;
            if(ev.target && ev.target.closest && ev.target.closest('button, a, input, select, .rpg-dialogue, .tw-page, .jmb-overlay')) return;
            try {
              if(window.JamboreeRooms && JamboreeRooms.onPointerDown){
                JamboreeRooms.onPointerDown(view, ev.clientX, ev.clientY);
              }
            } catch(err){}
          };
          view.wrap.addEventListener('pointerdown', view._jmbPtr);
        }
      }
      var safeDt = (typeof dt === 'number' && isFinite(dt)) ? dt : 0.016;
      try { if(window.JamboreeVisuals && JamboreeVisuals.tick) JamboreeVisuals.tick(view, now, safeDt); } catch(e){}
      try { if(window.JamboreeRegions && JamboreeRegions.tick) JamboreeRegions.tick(view, now, safeDt); } catch(e){}
      try { if(window.JamboreePlay && JamboreePlay.tick) JamboreePlay.tick(view, now, safeDt); } catch(e){}
    }

    function onDispose(view){
      if(!view) return;
      if(view.wrap && view._jmbPtr && typeof view.wrap.removeEventListener === 'function'){
        view.wrap.removeEventListener('pointerdown', view._jmbPtr);
        view._jmbPtr = null;
      }
      view._jmbAttached = false;
      try { if(window.JamboreeRooms && JamboreeRooms.dispose) JamboreeRooms.dispose(view); } catch(e){}
      try { if(window.JamboreeVisuals && JamboreeVisuals.dispose) JamboreeVisuals.dispose(view); } catch(e){}
      try { if(window.JamboreeRegions && JamboreeRegions.dispose) JamboreeRegions.dispose(view); } catch(e){}
      try { if(window.JamboreePlay && JamboreePlay.dispose) JamboreePlay.dispose(view); } catch(e){}
    }

    function onInteriorBegin(view, e){
      if(!view || !e || !e.interior) return;
      syncProfile();
      try {
        if(window.JamboreeRooms && JamboreeRooms.attachInterior){
          JamboreeRooms.attachInterior(view, e);
        }
      } catch(err){}
    }

    function onInteriorTick(view, now){
      if(!view || !view.encounter || !view.encounter.interior) return;
      try {
        if(window.JamboreeRooms && JamboreeRooms.tick){
          JamboreeRooms.tick(view, now, 0.016);
        }
      } catch(err){}
    }

    function onInteriorEnd(view, e){
      if(!view) return;
      try {
        if(window.JamboreeRooms && JamboreeRooms.dispose){
          JamboreeRooms.dispose(view);
        }
      } catch(err){}
    }

    function onAnswer(view, meta){
      syncProfile();
      var m = meta || {};
      var ok = m.ok !== false;
      var rid = regionIdOf(view);
      try {
        if(window.WorldState && m.residentId){
          WorldState.addFriendshipXP(m.residentId, ok ? 15 : 5);
        }
      } catch(e){}
      if(view && view.encounter && view.encounter.interior && window.JamboreeRooms){
        try {
          if(ok && JamboreeRooms.celebrate) JamboreeRooms.celebrate(view, view.encounter.interior.kind);
          if(m.registerKind && JamboreeRooms.triggerPoliteness) JamboreeRooms.triggerPoliteness(view, m.registerKind);
        } catch(e){}
      }
      if(view && window.JamboreeRegions && JamboreeRegions.onActivityComplete){
        try { JamboreeRegions.onActivityComplete(view, rid, m); } catch(e){}
      }
      if(view && !ok && m.hint && window.JamboreePlay && JamboreePlay.kikoHint){
        try { JamboreePlay.kikoHint(view, m.hint); } catch(e){}
      }
    }

    function triggerSpecial(view){
      if(!view) return;
      var rid = regionIdOf(view);
      if(rid === 'captain' && window.JamboreeRegions && JamboreeRegions.openTelescope){
        JamboreeRegions.openTelescope(view);
      } else if(rid === 'patterns' && window.JamboreeRegions && JamboreeRegions.openBlockForge){
        JamboreeRegions.openBlockForge(view);
      } else if(rid === 'lagoon' && window.JamboreeRegions && JamboreeRegions.openPuppetTheater){
        JamboreeRegions.openPuppetTheater(view);
      } else if(rid === 'town' && window.JamboreeRegions && JamboreeRegions.openSignRepair){
        JamboreeRegions.openSignRepair(view);
      } else if(rid === 'beach' && window.JamboreePlay && JamboreePlay.startClamShellGame){
        JamboreePlay.startClamShellGame(view);
      } else if(rid === 'caves' && window.JamboreeRegions && JamboreeRegions.triggerEchoWave){
        JamboreeRegions.triggerEchoWave(view, 0.92);
      } else if(rid === 'light' && window.JamboreeVisuals && JamboreeVisuals.setWeather){
        var modes = ['morning', 'golden', 'starlight', 'aurora'];
        var cur = (window.WorldState && WorldState.get().lighthouseWeather) || 'morning';
        var next = modes[(modes.indexOf(cur) + 1) % modes.length];
        if(window.WorldState && WorldState.setLighthouseWeather) WorldState.setLighthouseWeather(next);
        JamboreeVisuals.setWeather(view, next);
      } else if(window.JamboreePlay && JamboreePlay.openHomeDecorator){
        JamboreePlay.openHomeDecorator(view);
      }
    }

    function toggleTheme(btn){
      syncProfile();
      if(!window.WorldState) return;
      var cur = WorldState.get().cultureMode === 'culture' ? 'culture' : 'oceanic';
      var next = cur === 'oceanic' ? 'culture' : 'oceanic';
      if(WorldState.setCultureMode) WorldState.setCultureMode(next);
      else { WorldState.get().cultureMode = next; WorldState.save(); }
      if(btn) btn.setAttribute('data-jmb-theme-mode', next);
      if(typeof R3 !== 'undefined' && R3 && R3.view){
        try {
          if(window.JamboreeRegions && JamboreeRegions.attach) JamboreeRegions.attach(R3.view);
        } catch(e){}
      }
    }

    function syncMenuActions(){
      var bar = document.querySelector('.cv3-hero .topbar > :last-child') || document.querySelector('.rb-actions');
      if(!bar || bar.querySelector('[data-jmb-cam]')) return;
      syncProfile();
      function addHidden(attr, label, fn){
        var b = document.createElement('button');
        b.type = 'button';
        b.hidden = true;
        b.setAttribute(attr, '');
        b.setAttribute('aria-label', label);
        b.addEventListener('click', fn);
        bar.appendChild(b);
        return b;
      }
      addHidden('data-jmb-cam', 'Shell camera', function(){
        if(typeof R3 !== 'undefined' && R3 && R3.view && window.JamboreePlay && JamboreePlay.openShellCamera){
          JamboreePlay.openShellCamera(R3.view);
        }
      });
      addHidden('data-jmb-shop', 'Bok\'s item shop', function(){
        if(typeof R3 !== 'undefined' && R3 && R3.view && window.JamboreePlay && JamboreePlay.openBokShop){
          JamboreePlay.openBokShop(R3.view);
        }
      });
      addHidden('data-jmb-showtime', 'Showtime minigame', function(){
        if(typeof R3 !== 'undefined' && R3 && R3.view && window.JamboreePlay && JamboreePlay.startShowtime){
          var rid = regionIdOf(R3.view);
          var g = rid === 'caves' ? 'echoChoir' : (rid === 'beach' ? 'tideScoop' : 'bistroRush');
          JamboreePlay.startShowtime(R3.view, g);
        }
      });
      addHidden('data-jmb-special', 'Region activity', function(){
        if(typeof R3 !== 'undefined' && R3 && R3.view) triggerSpecial(R3.view);
      });
      var tb = addHidden('data-jmb-theme', 'Theme', function(){ toggleTheme(tb); });
      var mode = (window.WorldState && WorldState.get().cultureMode) || 'oceanic';
      tb.setAttribute('data-jmb-theme-mode', mode);
    }

    if(typeof afterRender === 'function') afterRender('jamboree menu', syncMenuActions);

    return {
      onFrame: onFrame,
      onDispose: onDispose,
      onInteriorBegin: onInteriorBegin,
      onInteriorTick: onInteriorTick,
      onInteriorEnd: onInteriorEnd,
      onAnswer: onAnswer,
      triggerSpecial: triggerSpecial,
      toggleTheme: toggleTheme
    };
  })();
  window.JamboreeBridge = JamboreeBridge;
