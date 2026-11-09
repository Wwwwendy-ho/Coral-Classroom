  /* ---------- What's new: Shelly shows you what changed ----------
     After an update, the first time a profile opens the board, Shelly (Lumi at night) points out each new thing:
     the screen dims, a soft ring lights up the new button or place, and she says one or two lines in the natural
     voice. It plays once per profile, can be skipped at any step, and "What's new" in the menu plays the latest one
     again.

     Each release adds an entry to REEF_WHATS_NEW (newest last): an id, the date it went live, and its steps. A step
     points at something on the board with a CSS selector (`at`), or at nothing (a step in the middle of the screen).
     `who` limits an entry to 'adult' or 'child' profiles; `need:'course'` to profiles with a language course. The smoke test opens the board and checks that every
     step's selector finds something (window.__whatsNewMissing), so a walkthrough can never point at a button that
     has moved or gone. Lines are short: they're spoken, and tools/voice/harvest.py records them. */
  var REEF_WHATS_NEW = [
    { id:'menu-and-travel', date:'2026-11-03', steps:[
      { at:'.r3-menubtn', say:'Settings, music, sounds and the minigame corner now live in this menu.' },
      { at:'.r3-mapbtn', say:'Pick a place on the treasure map, and you will zoom right out and dive back in there.' }
    ] },
    { id:'coral-classroom', date:'2026-11-04', steps:[
      { say:'Welcome to Coral Classroom! Coral Cove is now the flashcard reef at its heart, with more of the sea to explore soon.' },
      { at:'[aria-label="Open the Library"]', who:'adult', say:'Your course lives in the Library, under My course.' }
    ] },
    { id:'sea-chart', date:'2026-11-04', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Open the treasure map and tap The sea, to see every part of Coral Classroom. More islands open soon.' }
    ] },
    { id:'what-you-know', date:'2026-11-04', need:'course', steps:[
      { at:'[aria-label="Open the Library"]', say:'Every Korean card you answer now teaches me what you know. See it in the Library, under My course.' }
    ] },
    // The My words tile is only on the board while words are due, so this points at the map, which lists it then
    { id:'my-words', date:'2026-11-04', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Korean words you miss or look up now go in My words, a new stop on the reef. Find it on the treasure map.' }
    ] },
    { id:'story-lagoon', date:'2026-11-04', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Story Lagoon is open on the treasure map, with short Korean stories to hear and then read.' }
    ] },
    { id:'harbor-town', date:'2026-11-05', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Harbor Town is open on the treasure map. Talk with the townsfolk of your trip, in Korean.' }
    ] },
    { id:'echo-caves', date:'2026-11-05', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Echo Caves is open on the treasure map. Hear tricky Korean sounds apart, then say them like the voice.' }
    ] },
    { id:'pattern-reef', date:'2026-11-05', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Pattern Reef is open on the treasure map. Learn Korean sentence patterns one at a time.' }
    ] },
    { id:'bottle-beach', date:'2026-11-05', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Bottle Beach is open on the treasure map. Write back to your friend Jisu in Korean.' }
    ] },
    { id:'lighthouse', date:'2026-11-05', need:'course', steps:[
      { at:'.r3-mapbtn', say:'The Lighthouse is open on the treasure map. Read real Korean signs and menus, and learn the manners.' }
    ] },
    { id:'captains-deck', date:'2026-11-09', need:'course', steps:[
      { at:'.r3-mapbtn', say:'Captain\'s Deck is open on the treasure map, with today\'s voyage and what you can now do.' }
    ] }
  ];
  var WN_RECENT_DAYS = 14;   // a brand-new profile is shown only what's new in the last two weeks, not the whole history

  function whatsNewKey(){ return 'cc-new-seen-' + (S.profile && S.profile.id || 'guest'); }
  function whatsNewSeen(){
    var raw = null; try { raw = localStorage.getItem(whatsNewKey()); } catch(e){}
    if(raw){ try { return JSON.parse(raw) || []; } catch(e){ return []; } }
    // first time for this profile: older entries count as seen
    var cut = Date.now() - WN_RECENT_DAYS * 864e5, seen = REEF_WHATS_NEW.filter(function(e){ return Date.parse(e.date) < cut; }).map(function(e){ return e.id; });
    whatsNewSave(seen); return seen;
  }
  function whatsNewSave(seen){ try { localStorage.setItem(whatsNewKey(), JSON.stringify(seen)); } catch(e){} }
  function whatsNewWho(){ return S.profile && S.profile.mode === 'child' ? 'child' : 'adult'; }
  function whatsNewSteps(entries){
    var who = whatsNewWho(), out = [];
    entries.forEach(function(e){ if(e.who && e.who !== who || e.need === 'course' && !reefCourseOn()) return; e.steps.forEach(function(st){ if(!st.who || st.who === who) out.push(st); }); });
    return out;
  }
  // Something else is on screen (a panel, the map, a transition, the Library, a minigame): wait for it to clear.
  function whatsNewBusy(){
    var v = window.__reef3dView && window.__reef3dView();
    return !v || window.__reefTx || v.moving || v.flyIn || v.zoomNow || v.emote && v.emote.name === 'dance' ||
      document.querySelector('.cc-tour, .r3-map, .r3-panel, .r3-menu, .reef-gate, .clib:not([hidden]), .ask-panel.open');
  }

  function reefWhatsNew(replay){
    if(document.querySelector('.cc-tour')) return;
    var entries;
    if(replay){ var mine = REEF_WHATS_NEW.filter(function(e){ return whatsNewSteps([e]).length; }); entries = mine.slice(-1); }   // the newest one meant for this profile
    else { var seen = whatsNewSeen(); entries = REEF_WHATS_NEW.filter(function(e){ return seen.indexOf(e.id) < 0; }).reverse(); }   // newest first
    var steps = whatsNewSteps(entries).filter(function(st){ return !st.at || document.querySelector(st.at); });
    var done = function(){ if(!replay){ var s = whatsNewSeen(); entries.forEach(function(e){ if(s.indexOf(e.id) < 0) s.push(e.id); }); whatsNewSave(s); } };
    if(!steps.length){ done(); return; }
    var night = reefNight(), calm = reefCalm(), i = 0;
    var tour = document.createElement('div'); tour.className = 'cc-tour' + (night ? ' night' : '') + (calm ? ' calm' : '');
    tour.setAttribute('role', 'dialog'); tour.setAttribute('aria-modal', 'true'); tour.setAttribute('aria-label', 'What\'s new');
    tour.innerHTML = '<div class="cc-tour-hole" aria-hidden="true"></div>' +
      '<div class="cc-tour-card"><div class="cc-tour-who">' + reefGuideMini(night) + '<b>What\'s new</b><span class="cc-tour-n"></span></div>' +
      '<p class="cc-tour-say" aria-live="polite"></p>' +
      '<div class="cc-tour-row"><button type="button" class="cc-tour-skip" data-tour-skip>Skip</button><button type="button" class="cc-tour-next" data-tour-next>Next</button></div></div>';
    document.body.appendChild(tour);
    var hole = tour.querySelector('.cc-tour-hole'), card = tour.querySelector('.cc-tour-card'), say = tour.querySelector('.cc-tour-say'), next = tour.querySelector('[data-tour-next]');
    function place(){
      var st = steps.at(i), el = st.at ? document.querySelector(st.at) : null, vw = innerWidth, vh = innerHeight, pad = 10;
      if(el){
        var r = el.getBoundingClientRect(), x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
        hole.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:' + Math.min(28, h / 2) + 'px';
        tour.classList.remove('nohole');
        // the card goes on whichever side of the ring has more room, kept on screen
        var cw = Math.min(360, vw - 32), ch = card.offsetHeight || 150, below = vh - (y + h), above = y;
        var cy = below >= ch + 16 || below >= above ? Math.min(vh - ch - 16, y + h + 14) : Math.max(16, y - ch - 14);
        var cx = Math.max(16, Math.min(vw - cw - 16, x + w / 2 - cw / 2));
        card.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + cw + 'px';
      } else {
        tour.classList.add('nohole');
        var cw2 = Math.min(380, vw - 32);
        card.style.cssText = 'left:' + (vw - cw2) / 2 + 'px;top:' + Math.max(16, vh * .38 - 80) + 'px;width:' + cw2 + 'px';
      }
    }
    function show(){
      var st = steps.at(i);
      say.textContent = st.say;
      tour.querySelector('.cc-tour-n').textContent = steps.length > 1 ? (i + 1) + ' of ' + steps.length : '';
      next.textContent = i === steps.length - 1 ? 'Got it' : 'Next';
      place(); requestAnimationFrame(place);   // once the text is in, the card's height is known
      try { Speech.speak(st.say); } catch(e){}
      try { next.focus({ preventScroll:true }); } catch(e){}
    }
    function close(){
      done(); window.removeEventListener('resize', place); document.removeEventListener('keydown', onKey, true);
      try { Speech.stop && Speech.stop(); } catch(e){}
      tour.classList.add('out'); setTimeout(function(){ tour.remove(); }, calm ? 0 : 220);
    }
    function onKey(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } }
    next.addEventListener('click', function(){ if(i < steps.length - 1){ i++; show(); } else close(); });
    tour.querySelector('[data-tour-skip]').addEventListener('click', close);
    hole.addEventListener('click', function(){ next.click(); });   // tapping the lit-up thing moves on, it doesn't press it
    window.addEventListener('resize', place); document.addEventListener('keydown', onKey, true);
    show();
  }

  // Shown on the board, once nothing else is on screen
  afterRender('whats new', function(){
    if(!S.profile || S.view !== 'home' || reefWhatsNew.waiting) return;
    try { if(localStorage.getItem('cc-tour-off')) return; } catch(e){}   // tests turn it off, then open it themselves
    var seen = whatsNewSeen();
    if(!REEF_WHATS_NEW.some(function(e){ return seen.indexOf(e.id) < 0 && whatsNewSteps([e]).length; })) return;
    reefWhatsNew.waiting = true;
    var tries = 0;
    (function wait(){
      if(!document.querySelector('.r3 canvas') || S.view !== 'home'){ if(++tries < 40) return setTimeout(wait, 500); reefWhatsNew.waiting = false; return; }
      if(whatsNewBusy()){ if(++tries < 120) return setTimeout(wait, 500); reefWhatsNew.waiting = false; return; }
      setTimeout(function(){ reefWhatsNew.waiting = false; if(!whatsNewBusy() && S.view === 'home') reefWhatsNew(false); }, 900);
    })();
  });
  window.__whatsNewShow = function(){ reefWhatsNew(true); };   // test helper: the latest walkthrough, as the menu plays it
  // Test helper: steps whose selector finds nothing on the board as it is now (should be none)
  window.__whatsNewMissing = function(){
    var miss = [];
    REEF_WHATS_NEW.forEach(function(e){ if(e.need === 'course' && !reefCourseOn()) return; e.steps.forEach(function(st){ if(st.at && (!st.who || st.who === whatsNewWho()) && !document.querySelector(st.at)) miss.push(e.id + ': ' + st.at); }); });
    return miss;
  };
