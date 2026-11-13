  /* A short voyage between regional boards. The caller owns the actual navigation. */
  var regionTravelActive = null;
  function regionTravelPlace(id){
    var key = { reef:'patterns', deck:'captain', home:'cove' }[id] || id;
    var names = { cove:'Coral Cove', lagoon:'Story Lagoon', town:'Harbor Town', caves:'Echo Caves',
      patterns:'Pattern Reef', beach:'Bottle Beach', light:'The Lighthouse', captain:"Captain's Deck" };
    return names[key] ? { id:key, name:names[key] } : null;
  }
  function regionTravelFrom(){
    var board = S.regionBoard;
    if(board && S.profile && board.pid === S.profile.id &&
       (S.view === board.region || (board.region === 'lagoon' && S.view === 'lagoonRead') ||
        (board.region === 'town' && S.view === 'townTalk'))) return regionTravelPlace(board.region);
    return regionTravelPlace(S.view) || regionTravelPlace('cove');
  }
  function regionTravel(toRegion, fn){
    if(typeof fn !== 'function') return false;
    var to = regionTravelPlace(toRegion);
    if(!to) return false;
    if(regionTravelActive || reefBusy) return false;
    // A hidden page has no visible voyage; let the requested navigation finish at once.
    if(document.hidden || !document.body) { fn(); return true; }

    var from = regionTravelFrom(), calm = reefCalm(), previousTx = !!window.__reefTx;
    var profileId = S.profile && S.profile.id;
    var host = app;
    var token = { done:false, cleaned:false, timer:null, finishTimer:null, observer:null, overlay:null };
    regionTravelActive = token;
    reefBusy = true;
    window.__reefTx = true;

    function cleanup(){
      if(token.cleaned) return;
      token.cleaned = true;
      clearTimeout(token.timer);
      clearTimeout(token.finishTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      if(token.observer) token.observer.disconnect();
      if(token.overlay) token.overlay.remove();
      if(regionTravelActive === token){
        regionTravelActive = null;
        reefBusy = false;
        window.__reefTx = previousTx;
      }
    }
    function swap(){
      if(token.done || token.cleaned || regionTravelActive !== token) return;
      token.done = true;
      try {
        // A profile switch or app teardown cancels a stale destination callback.
        if(host && host.isConnected && (S.profile && S.profile.id) === profileId) fn();
      } catch(e){ console.error('[Coral Classroom] region travel', e); }
      finally {
        if(token.overlay && token.overlay.isConnected){
          token.overlay.querySelector('.rt-status').textContent = 'Arriving at';
          token.overlay.querySelector('.rt-name').textContent = to.name;
          token.overlay.classList.add('rt-arriving');
        }
        if(document.hidden || !host || !host.isConnected) cleanup();
      }
    }
    function onVisibility(){ if(document.hidden){ swap(); cleanup(); } }

    try {
      var ov = document.createElement('div');
      token.overlay = ov;
      ov.className = 'region-travel' + (calm ? ' rt-calm' : '');
      ov.dataset.destination = to.id;
      ov.setAttribute('role', 'status');
      ov.setAttribute('aria-live', 'polite');
      ov.setAttribute('aria-atomic', 'true');
      ov.innerHTML = '<div class="rt-sky"><span class="rt-sun"></span><span class="rt-cloud rt-cloud-one"></span><span class="rt-cloud rt-cloud-two"></span></div>' +
        '<div class="rt-horizon"><span class="rt-island rt-island-left"></span><span class="rt-island rt-island-right"></span></div>' +
        '<div class="rt-water"><span class="rt-wave rt-wave-one"></span><span class="rt-wave rt-wave-two"></span><span class="rt-wave rt-wave-three"></span><span class="rt-spark rt-spark-one"></span><span class="rt-spark rt-spark-two"></span></div>' +
        '<div class="rt-vessel" aria-hidden="true"><svg viewBox="0 0 240 170" focusable="false"><ellipse cx="118" cy="153" rx="97" ry="12" fill="#c9f9e9" opacity=".36"/>' +
        '<path d="M117 9v119" stroke="#704a33" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M111 22L33 119h78z" fill="#fff8dc" stroke="#e9d6a0" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M125 35l62 83h-62z" fill="#ffe08b" stroke="#dfaf5b" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M116 12l31 8-31 8z" fill="#f28368"/>' +
        '<path d="M24 126h194l-19 27H47z" fill="#9a6540" stroke="#68412e" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M28 132h186M57 145h131" stroke="#d7a770" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M15 157q15-9 30 0t30 0m91 0q15-9 30 0t30 0" fill="none" stroke="#e1ffed" stroke-width="5" stroke-linecap="round" opacity=".8"/></svg></div>' +
        '<div class="rt-caption"><span class="rt-status">Leaving</span><strong class="rt-name"></strong><span class="rt-voyage">A little voyage across the sea</span></div>';
      ov.querySelector('.rt-name').textContent = from.name;
      document.body.appendChild(ov);
      document.addEventListener('visibilitychange', onVisibility);
      token.observer = new MutationObserver(function(){ if(!ov.isConnected) cleanup(); });
      token.observer.observe(document.body, { childList:true });
      token.timer = setTimeout(swap, calm ? 80 : 720);
      token.finishTimer = setTimeout(cleanup, calm ? 260 : 1480);
      return true;
    } catch(e){
      cleanup();
      // Failure to draw the scene must never strand navigation.
      fn();
      return true;
    }
  }
