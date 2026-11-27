/* ==========================================================================
   JamboreeRegions — Signature 3D & Interactive Mechanics per Region
   Concatenated inside Coral Classroom's single IIFE closure.
   Exposes window.JamboreeRegions.
   ========================================================================== */

var JamboreeRegions = (function(){
  'use strict';

  var CSS_INJECTED = false;

  // ---------- Safe Environment Helpers ----------
  function T(){ return window.THREE || null; }
  function isCalm(){ try { return typeof reefCalm === 'function' && !!reefCalm(); } catch(e){ return false; } }
  function isMuted(){
    try {
      if(window.S && S.muted) return true;
      if(typeof reefSoundOn === 'function' && !reefSoundOn()) return true;
    } catch(e){}
    return false;
  }
  function isNight(view){
    try {
      if(view && typeof view.night === 'boolean') return view.night;
      if(typeof reefNight === 'function') return !!reefNight();
    } catch(e){}
    return false;
  }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function safeArray(arr, maxLen){
    if(!Array.isArray(arr)) return [];
    return arr.slice(0, maxLen || 24);
  }
  function getWorldState(){
    try {
      if(window.WorldState && typeof WorldState.get === 'function'){
        var st = WorldState.get();
        if(st && typeof st === 'object') return st;
      }
    } catch(e){}
    return { trophies: [], snapshots: [], bottleQueue: [], repairedSigns: [] };
  }
  function saveWorldAction(fnName, payload){
    try {
      if(window.WorldState && typeof WorldState[fnName] === 'function'){
        return WorldState[fnName](payload);
      }
    } catch(e){}
    return null;
  }
  function awardShells(view, n, why){
    try {
      if(typeof reef3dShells === 'function' && view && n > 0){
        reef3dShells(view, n, why || 'region');
      }
    } catch(e){}
  }
  function getAudioCtx(){
    if(isMuted()) return null;
    try {
      if(typeof Sound !== 'undefined' && Sound && typeof Sound.getCtx === 'function'){
        var c = Sound.getCtx();
        if(c && c.state === 'suspended' && typeof c.resume === 'function') c.resume();
        return c;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      if(!JamboreeRegions._ac) JamboreeRegions._ac = new AC();
      if(JamboreeRegions._ac.state === 'suspended') JamboreeRegions._ac.resume();
      return JamboreeRegions._ac;
    } catch(e){ return null; }
  }
  function playTone(freq, dur, type, vol, delay){
    if(isMuted()) return;
    var ctx = getAudioCtx();
    if(!ctx) return;
    try {
      var t0 = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      var peak = clamp(vol || 0.14, 0.01, 0.35);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.35));
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + (dur || 0.35) + 0.02);
    } catch(e){}
  }

  // ---------- DOM & Styling Helpers ----------
  function mkEl(tag, cls, text){
    var el = document.createElement(tag);
    if(cls) el.className = cls;
    if(text != null) el.textContent = String(text);
    return el;
  }
  function injectStyles(){
    if(CSS_INJECTED || typeof document === 'undefined') return;
    CSS_INJECTED = true;
    var st = document.createElement('style');
    st.id = 'jr-jamboree-styles';
    st.textContent = [
      '.jr-overlay{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(8,22,38,.72);backdrop-filter:blur(4px);font-family:inherit;}',
      '.jr-card{width:min(520px,96vw);max-height:92vh;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:18px;background:linear-gradient(160deg,#122b44,#0b1d30);color:#f3f8fc;border:2px solid rgba(255,216,130,.45);box-shadow:0 16px 40px rgba(0,0,0,.45);box-sizing:border-box;}',
      '.jr-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
      '.jr-title{margin:0;font-size:1.05rem;font-weight:700;color:#ffe08a;display:flex;align-items:center;gap:6px;}',
      '.jr-sub{font-size:.78rem;color:#b8d7eb;margin:0;}',
      '.jr-close{border:0;border-radius:10px;background:rgba(255,255,255,.14);color:#fff;padding:5px 10px;font-weight:700;cursor:pointer;font-size:.85rem;}',
      '.jr-close:hover{background:rgba(255,255,255,.24);}',
      '.jr-canvas{width:100%;height:auto;border-radius:12px;background:#071728;border:1px solid rgba(255,255,255,.15);display:block;}',
      '.jr-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;}',
      '.jr-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}',
      '.jr-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
      '.jr-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}',
      '.jr-btn{border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.1);color:#f5fbff;padding:6px 8px;font-size:.82rem;font-weight:600;cursor:pointer;text-align:center;transition:background .15s,transform .1s;}',
      '.jr-btn:hover{background:rgba(255,255,255,.2);}',
      '.jr-btn.active{background:#f2b84b;color:#1b2430;border-color:#ffe39a;}',
      '.jr-btn.accent{background:#2ea89c;color:#fff;border-color:#7ce7dc;}',
      '.jr-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.1);font-size:.75rem;color:#d6edf8;}',
      '.jr-tile-slot{min-height:38px;border-radius:10px;border:2px dashed rgba(255,216,130,.45);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;background:rgba(0,0,0,.22);}',
      '.jr-tile-slot.filled{border-style:solid;background:rgba(46,168,156,.28);border-color:#7ce7dc;color:#fff;}',
      '@media(max-width:480px){.jr-card{padding:10px;gap:6px;}.jr-grid4{grid-template-columns:repeat(2,minmax(0,1fr));}.jr-btn{padding:5px 6px;font-size:.78rem;}}'
    ].join('');
    document.head.appendChild(st);
  }

  // ---------- 3D Resource Management ----------
  function ensureState(view){
    if(!view) return null;
    if(view._jamboree && !view._jamboree.disposed) return view._jamboree;
    var THREE = T();
    var grp = THREE ? new THREE.Group() : null;
    if(grp && view.scene){
      grp.name = 'jamboree-region-props';
      view.scene.add(grp);
    }
    var st = {
      regionId: (view.region && view.region.id) || '',
      group: grp,
      geos: [],
      mats: [],
      texs: [],
      timers: [],
      cleanups: [],
      overlay: null,
      disposed: false,
      // Region-specific runtime state
      trophiesGroup: null,
      corkboardTex: null,
      spottedTargets: {},
      tidePhase: 'mid',
      tideTime: 0,
      tideMesh: null,
      sandbarGroup: null,
      tideBottles: [],
      tossedBottles: [],
      mosaicTiles: [],
      resonanceAnim: null,
      storyBooks: [],
      echoPillars: [],
      echoRings: [],
      echoRibbon: null,
      echoGlide: null,
      signTex: null,
      nightCarts: [],
      gramophoneAudio: null
    };
    view._jamboree = st;
    return st;
  }

  function ownGeo(st, g){ if(st && g) st.geos.push(g); return g; }
  function ownMat(st, m){ if(st && m) st.mats.push(m); return m; }
  function ownTex(st, t){ if(st && t) st.texs.push(t); return t; }
  function addTimer(st, id){ if(st && id) st.timers.push(id); return id; }
  function groundYAt(view, x, z){
    try {
      if(view && typeof view.groundY === 'function') return view.groundY(x, z);
    } catch(e){}
    return 0;
  }

  function closeOverlay(view){
    var st = view && view._jamboree;
    if(!st) return;
    if(st.gramophoneAudio){
      try { st.gramophoneAudio.stop(); } catch(e){}
      st.gramophoneAudio = null;
    }
    if(st.overlay){
      if(st.overlay._jrCleanup){
        try { st.overlay._jrCleanup(); } catch(e){}
      }
      if(st.overlay.parentNode) st.overlay.parentNode.removeChild(st.overlay);
      st.overlay = null;
    }
  }

  function openModal(view, titleText, subtitleText, buildBodyFn){
    injectStyles();
    closeOverlay(view);
    var st = ensureState(view);
    if(!st || typeof document === 'undefined') return null;

    var ov = mkEl('div', 'jr-overlay');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    var card = mkEl('div', 'jr-card');

    var hdr = mkEl('div', 'jr-hdr');
    var titleWrap = mkEl('div');
    var h = mkEl('h3', 'jr-title', titleText);
    titleWrap.appendChild(h);
    if(subtitleText){
      titleWrap.appendChild(mkEl('p', 'jr-sub', subtitleText));
    }
    var closeBtn = mkEl('button', 'jr-close', 'Close');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function(){ closeOverlay(view); });
    hdr.appendChild(titleWrap);
    hdr.appendChild(closeBtn);
    card.appendChild(hdr);

    var onKey = function(e){ if(e.key === 'Escape') closeOverlay(view); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function(e){ if(e.target === ov) closeOverlay(view); });

    var extraCleanups = [];
    ov._jrCleanup = function(){
      document.removeEventListener('keydown', onKey);
      extraCleanups.forEach(function(fn){ try { fn(); } catch(e){} });
    };

    buildBodyFn(card, function(fn){ extraCleanups.push(fn); });
    ov.appendChild(card);
    document.body.appendChild(ov);
    st.overlay = ov;
    return ov;
  }

  // ==========================================================================
  // 1. CAPTAIN'S GREAT CABIN
  // ==========================================================================
  function makeTrophyMesh(THREE, st, kind, unlocked){
    var g = new THREE.Group();
    var col = unlocked ? (kind === 'pearl' ? 0xf8f3e6 : kind === 'coral' ? 0xff7b89 : 0xf7c948) : 0x5c768d;
    var mat = ownMat(st, new THREE.MeshStandardMaterial({
      color: col,
      roughness: unlocked ? 0.25 : 0.75,
      metalness: unlocked ? 0.65 : 0.1,
      emissive: unlocked ? col : 0x000000,
      emissiveIntensity: unlocked ? 0.18 : 0
    }));
    var geo;
    if(kind === 'pearl') geo = ownGeo(st, new THREE.SphereGeometry(0.16, 12, 10));
    else if(kind === 'compass') geo = ownGeo(st, new THREE.CylinderGeometry(0.17, 0.17, 0.07, 14));
    else if(kind === 'crown') geo = ownGeo(st, new THREE.ConeGeometry(0.16, 0.28, 6));
    else geo = ownGeo(st, new THREE.OctahedronGeometry(0.17, 0));
    var m = new THREE.Mesh(geo, mat);
    m.position.y = 0.78;
    g.add(m);
    g.userData.keepsake = m;
    g.userData.unlocked = !!unlocked;
    return g;
  }

  function buildCaptainCabin(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    // 1) Living 3D Trophy Museum (Pedestals + Glass Vitrines)
    var ws = getWorldState();
    var unlockedList = safeArray(ws.trophies, 12);
    var trophyDefs = [
      { id: 'first_sail', kind: 'compass', label: 'Compass' },
      { id: 'pearl_keeper', kind: 'pearl', label: 'Pearl' },
      { id: 'pattern_master', kind: 'star', label: 'Star' },
      { id: 'story_weaver', kind: 'crown', label: 'Crown' },
      { id: 'echo_singer', kind: 'star', label: 'Echo' },
      { id: 'harbor_friend', kind: 'pearl', label: 'Harbor' }
    ];

    var museumGrp = new THREE.Group();
    museumGrp.name = 'captain-trophy-museum';
    var pedGeo = ownGeo(st, new THREE.CylinderGeometry(0.24, 0.30, 0.56, 12));
    var pedMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 }));
    var rimGeo = ownGeo(st, new THREE.CylinderGeometry(0.27, 0.27, 0.05, 12));
    var rimMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xd9a84e, metalness: 0.7, roughness: 0.3 }));
    var domeGeo = ownGeo(st, new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12, 1, true));
    var domeMat = ownMat(st, new THREE.MeshStandardMaterial({
      color: 0xcbeeff, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide
    }));

    var sb = view.regionShipBounds || null;
    var museumZ = sb ? (sb.maxZ - 2.2) : -3.8;
    var museumStartX = sb ? Math.max(sb.minX + 5.2, -3.6) : -3.0;
    function capClearOfTiles(px, pz, minD){
      if(!Array.isArray(view.spaces)) return true;
      for(var ti = 0; ti < view.spaces.length; ti++){
        var ts = view.spaces[ti];
        if(ts && Math.hypot(px - ts.x, pz - ts.z) < (minD || 2.4)) return false;
      }
      return true;
    }
    var pedShadowGeo = ownGeo(st, new THREE.CircleGeometry(0.38, 16));
    var pedShadowMat = ownMat(st, new THREE.MeshBasicMaterial({ color: 0x160d06, transparent: true, opacity: 0.42, depthWrite: false }));
    for(var i = 0; i < trophyDefs.length; i++){
      var x = museumStartX + i * 1.35;
      var z = museumZ;
      if(!capClearOfTiles(x, z, 2.3)) z = sb ? (sb.minZ + 2.2) : (z - 1.8);
      var gy = groundYAt(view, x, z);
      var slot = new THREE.Group();
      slot.position.set(x, gy, z);

      var shd = new THREE.Mesh(pedShadowGeo, pedShadowMat);
      shd.rotation.x = -Math.PI / 2;
      shd.position.y = 0.008;
      slot.add(shd);

      var ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 0.28;
      slot.add(ped);

      var rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.y = 0.57;
      slot.add(rim);

      var dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 0.80;
      slot.add(dome);

      var def = trophyDefs[i];
      var isUnlocked = unlockedList.indexOf(def.id) >= 0 || i < unlockedList.length;
      var keep = makeTrophyMesh(THREE, st, def.kind, isUnlocked);
      slot.add(keep);
      museumGrp.add(slot);
    }
    st.group.add(museumGrp);
    st.trophiesGroup = museumGrp;

    // 2) 3D Photo Corkboard tucked neatly by the port-aft gallery wall (zero center-deck clutter!)
    var cx = sb ? (sb.minX + 4.4) : -4.2, cz = sb ? (sb.maxZ - 2.6) : -2.2;
    var cgy = groundYAt(view, cx, cz);
    var boardGrp = new THREE.Group();
    boardGrp.position.set(cx, cgy, cz);
    boardGrp.rotation.y = Math.PI - 0.35;

    var frameMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 }));
    var frame = new THREE.Mesh(ownGeo(st, new THREE.BoxGeometry(1.75, 1.18, 0.08)), frameMat);
    frame.position.y = 1.05;
    boardGrp.add(frame);

    var legGeo = ownGeo(st, new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8));
    var legL = new THREE.Mesh(legGeo, frameMat); legL.position.set(-0.65, 0.45, 0); boardGrp.add(legL);
    var legR = new THREE.Mesh(legGeo, frameMat); legR.position.set(0.65, 0.45, 0); boardGrp.add(legR);

    var cv = document.createElement('canvas');
    cv.width = 512; cv.height = 320;
    var tex = ownTex(st, new THREE.CanvasTexture(cv));
    st.corkboardTex = tex;
    st.corkboardCanvas = cv;
    refreshCorkboardTexture(st);

    var corkMesh = new THREE.Mesh(
      ownGeo(st, new THREE.PlaneGeometry(1.58, 1.02)),
      ownMat(st, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }))
    );
    corkMesh.position.set(0, 1.05, 0.045);
    boardGrp.add(corkMesh);
    st.group.add(boardGrp);

    // 3) 3D Brass Gramophone Prop tucked on the starboard-aft cabin gallery
    var gx = sb ? (museumStartX + trophyDefs.length * 1.35 + 0.6) : 3.8, gz = sb ? (sb.maxZ - 2.5) : -2.3;
    var ggy = groundYAt(view, gx, gz);
    var gramGrp = new THREE.Group();
    gramGrp.position.set(gx, ggy, gz);
    var boxMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x5d371e, roughness: 0.65 }));
    var brassMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xe6b84c, metalness: 0.8, roughness: 0.25 }));
    var baseBox = new THREE.Mesh(ownGeo(st, new THREE.BoxGeometry(0.56, 0.24, 0.56)), boxMat);
    baseBox.position.y = 0.12;
    gramGrp.add(baseBox);
    var disc = new THREE.Mesh(
      ownGeo(st, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18)),
      ownMat(st, new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.35 }))
    );
    disc.position.y = 0.26;
    gramGrp.add(disc);
    var horn = new THREE.Mesh(ownGeo(st, new THREE.ConeGeometry(0.26, 0.46, 14, 1, true)), brassMat);
    horn.position.set(-0.08, 0.52, -0.05);
    horn.rotation.z = -0.65;
    gramGrp.add(horn);
    st.group.add(gramGrp);
  }

  function refreshCorkboardTexture(st){
    if(!st || !st.corkboardCanvas || !st.corkboardTex) return;
    var cv = st.corkboardCanvas;
    var g = cv.getContext('2d');
    g.fillStyle = '#b9834e';
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = 'rgba(70,40,15,.25)';
    g.lineWidth = 4;
    g.strokeRect(6, 6, cv.width - 12, cv.height - 12);

    var snaps = safeArray(getWorldState().snapshots, 6);
    var cols = 3, rows = 2;
    var pw = 136, ph = 112;
    for(var i = 0; i < cols * rows; i++){
      var col = i % cols, row = Math.floor(i / cols);
      var px = 28 + col * 158;
      var py = 26 + row * 138;
      g.save();
      g.translate(px + pw / 2, py + ph / 2);
      g.rotate(((i % 2 === 0 ? 1 : -1) * 0.04));
      g.fillStyle = '#faf6ee';
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = i < snaps.length ? '#2d7a9c' : '#d8cfc0';
      g.fillRect(-pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 26);
      // Pin
      g.fillStyle = i < snaps.length ? '#e5534b' : '#8b7d6b';
      g.beginPath();
      g.arc(0, -ph / 2 + 6, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3c3024';
      g.font = 'bold 12px sans-serif';
      g.textAlign = 'center';
      g.fillText(i < snaps.length ? ('Snap #' + (i + 1)) : 'Empty Slot', 0, ph / 2 - 6);
      g.restore();
    }
    st.corkboardTex.needsUpdate = true;
  }

  function openTelescope(view){
    var st = ensureState(view);
    if(!st) return;
    var targets = [
      { id: 'whale', name: 'Breaching Whale', x: 0.22, y: 0.56, r: 0.09, icon: '🐋' },
      { id: 'bottle', name: 'Giant Bottle', x: 0.54, y: 0.62, r: 0.08, icon: '🍾' },
      { id: 'sailboat', name: 'Banner Sailboat', x: 0.82, y: 0.52, r: 0.08, icon: '⛵' }
    ];
    var pan = 0.5, zoom = 1;

    openModal(view, '🔭 Captain\'s Brass Telescope', 'Pan & zoom out the cabin windows to spot ocean landmarks.', function(card, addCleanup){
      var cv = mkEl('canvas', 'jr-canvas');
      cv.width = 480; cv.height = 240;
      card.appendChild(cv);

      var badges = mkEl('div', 'jr-grid3');
      var badgeEls = {};
      targets.forEach(function(t){
        var b = mkEl('div', 'jr-badge', t.icon + ' ' + t.name + (st.spottedTargets[t.id] ? ' ✓' : ''));
        badgeEls[t.id] = b;
        badges.appendChild(b);
      });
      card.appendChild(badges);

      var controls = mkEl('div', 'jr-row');
      var leftBtn = mkEl('button', 'jr-btn', '◀ Pan Left');
      var rightBtn = mkEl('button', 'jr-btn', 'Pan Right ▶');
      var zoomBtn = mkEl('button', 'jr-btn', 'Zoom: 1x');
      var spotBtn = mkEl('button', 'jr-btn accent', '✨ Spot Target');
      [leftBtn, rightBtn, zoomBtn, spotBtn].forEach(function(b){ b.type = 'button'; controls.appendChild(b); });
      card.appendChild(controls);

      var statusEl = mkEl('p', 'jr-sub', 'Aim the brass crosshair at a landmark and tap Spot!');
      card.appendChild(statusEl);

      function draw(){
        var ctx = cv.getContext('2d');
        var w = cv.width, h = cv.height;
        var night = isNight(view);
        var skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.58);
        skyGrad.addColorStop(0, night ? '#0a1930' : '#4fa8d8');
        skyGrad.addColorStop(1, night ? '#1b3556' : '#a8e0f5');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.58);

        var seaGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
        seaGrad.addColorStop(0, night ? '#0f2b46' : '#1b7fa8');
        seaGrad.addColorStop(1, night ? '#061524' : '#0b4a6e');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, h * 0.58, w, h * 0.42);

        // Draw targets relative to pan & zoom
        targets.forEach(function(t){
          var sx = w * 0.5 + (t.x - pan) * w * zoom * 1.4;
          var sy = h * 0.5 + (t.y - 0.5) * h * zoom;
          if(sx < -60 || sx > w + 60) return;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(zoom, zoom);
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.icon, 0, 0);
          ctx.restore();
        });

        // Brass telescope vignette + crosshair
        var rad = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.65);
        rad.addColorStop(0, 'rgba(0,0,0,0)');
        rad.addColorStop(0.85, 'rgba(18,12,6,0.55)');
        rad.addColorStop(1, 'rgba(10,6,2,0.95)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,216,130,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2);
        ctx.moveTo(w / 2 - 36, h / 2); ctx.lineTo(w / 2 + 36, h / 2);
        ctx.moveTo(w / 2, h / 2 - 36); ctx.lineTo(w / 2, h / 2 + 36);
        ctx.stroke();
      }

      function trySpot(){
        var found = null;
        for(var i = 0; i < targets.length; i++){
          var t = targets[i];
          if(Math.abs(t.x - pan) <= t.r / zoom + 0.04){
            found = t;
            break;
          }
        }
        if(!found){
          statusEl.textContent = 'Only open sea here — pan left or right!';
          playTone(220, 0.14, 'sine', 0.08);
          return;
        }
        if(!st.spottedTargets[found.id]){
          st.spottedTargets[found.id] = true;
          badgeEls[found.id].textContent = found.icon + ' ' + found.name + ' ✓';
          awardShells(view, 2, 'telescope-' + found.id);
          statusEl.textContent = 'Spotted ' + found.name + '! +2 Bonus Shells!';
          playTone(587.33, 0.18, 'triangle', 0.15);
          playTone(880, 0.25, 'triangle', 0.14, 0.12);
        } else {
          statusEl.textContent = found.name + ' already logged on this watch.';
          playTone(523.25, 0.12, 'sine', 0.1);
        }
      }

      leftBtn.addEventListener('click', function(){ pan = clamp(pan - 0.1, 0.05, 0.95); draw(); });
      rightBtn.addEventListener('click', function(){ pan = clamp(pan + 0.1, 0.05, 0.95); draw(); });
      zoomBtn.addEventListener('click', function(){
        zoom = zoom === 1 ? 2 : (zoom === 2 ? 3 : 1);
        zoomBtn.textContent = 'Zoom: ' + zoom + 'x';
        draw();
      });
      spotBtn.addEventListener('click', trySpot);

      var dragging = false, lastX = 0;
      var onDown = function(e){ dragging = true; lastX = e.clientX || (e.touches && e.touches[0].clientX) || 0; };
      var onMove = function(e){
        if(!dragging) return;
        var cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        pan = clamp(pan - (cx - lastX) * 0.0022, 0.05, 0.95);
        lastX = cx;
        draw();
      };
      var onUp = function(){ dragging = false; };
      cv.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      addCleanup(function(){
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      });

      draw();
    });
  }

  function openGramophone(view){
    var st = ensureState(view);
    if(!st) return;

    var themes = [
      { id: 'captain', label: 'Cabin Waltz', notes: [261.63, 329.63, 392.00, 523.25] },
      { id: 'beach', label: 'Bottle Surf', notes: [293.66, 369.99, 440.00, 587.33] },
      { id: 'patterns', label: 'Reef Marimba', notes: [349.23, 440.00, 523.25, 698.46] },
      { id: 'lagoon', label: 'Lagoon Lullaby', notes: [246.94, 311.13, 369.99, 493.88] },
      { id: 'caves', label: 'Echo Crystal', notes: [329.63, 415.30, 493.88, 659.25] },
      { id: 'town', label: 'Harbor Market', notes: [261.63, 349.23, 440.00, 523.25] }
    ];
    var layers = { melody: true, bass: true, chimes: true, waves: true };
    var activeTheme = themes[0];
    var playing = false;
    var step = 0;
    var loopId = null;

    openModal(view, '📻 Brass Gramophone', 'Select a regional theme and toggle or solo musical layers.', function(card, addCleanup){
      var themeGrid = mkEl('div', 'jr-grid3');
      var themeBtns = {};
      themes.forEach(function(th){
        var b = mkEl('button', 'jr-btn' + (th === activeTheme ? ' active' : ''), th.label);
        b.type = 'button';
        b.addEventListener('click', function(){
          activeTheme = th;
          Object.keys(themeBtns).forEach(function(k){ themeBtns[k].classList.toggle('active', k === th.id); });
        });
        themeBtns[th.id] = b;
        themeGrid.appendChild(b);
      });
      card.appendChild(themeGrid);

      var layerTitle = mkEl('p', 'jr-sub', 'Musical Layers (tap to toggle):');
      card.appendChild(layerTitle);

      var layerGrid = mkEl('div', 'jr-grid4');
      var layerBtns = {};
      ['melody', 'bass', 'chimes', 'waves'].forEach(function(lk){
        var b = mkEl('button', 'jr-btn active', lk.charAt(0).toUpperCase() + lk.slice(1));
        b.type = 'button';
        b.addEventListener('click', function(){
          layers[lk] = !layers[lk];
          b.classList.toggle('active', layers[lk]);
        });
        layerBtns[lk] = b;
        layerGrid.appendChild(b);
      });
      card.appendChild(layerGrid);

      var ctrlRow = mkEl('div', 'jr-row');
      var playBtn = mkEl('button', 'jr-btn accent', isMuted() ? '🔇 Muted in Settings' : '▶ Play Gramophone');
      playBtn.type = 'button';
      var soloBtn = mkEl('button', 'jr-btn', 'Solo Melody');
      soloBtn.type = 'button';
      ctrlRow.appendChild(playBtn);
      ctrlRow.appendChild(soloBtn);
      card.appendChild(ctrlRow);

      function stopLoop(){
        playing = false;
        if(loopId){ clearInterval(loopId); loopId = null; }
        playBtn.textContent = isMuted() ? '🔇 Muted in Settings' : '▶ Play Gramophone';
      }

      function tickStep(){
        if(!playing || isMuted()) return;
        var ns = activeTheme.notes;
        var n = ns[step % ns.length];
        if(layers.melody) playTone(n, 0.28, 'triangle', 0.12);
        if(layers.bass && step % 2 === 0) playTone(ns[0] * 0.5, 0.42, 'sine', 0.14);
        if(layers.chimes && step % 4 === 2) playTone(n * 2, 0.35, 'sine', 0.06, 0.06);
        if(layers.waves && step % 4 === 0) playTone(110, 0.55, 'sine', 0.04);
        step++;
      }

      playBtn.addEventListener('click', function(){
        if(isMuted()){
          stopLoop();
          return;
        }
        if(playing){ stopLoop(); return; }
        playing = true;
        playBtn.textContent = '⏹ Stop';
        tickStep();
        loopId = setInterval(tickStep, 380);
      });

      soloBtn.addEventListener('click', function(){
        layers.melody = true; layers.bass = false; layers.chimes = false; layers.waves = false;
        Object.keys(layerBtns).forEach(function(k){ layerBtns[k].classList.toggle('active', layers[k]); });
      });

      st.gramophoneAudio = { stop: stopLoop };
      addCleanup(stopLoop);
    });
  }

  // ==========================================================================
  // 2. BOTTLE BEACH
  // ==========================================================================
  function buildBottleBeach(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    // Animated Tide Water Plane
    var tideGeo = ownGeo(st, new THREE.PlaneGeometry(26, 16));
    tideGeo.rotateX(-Math.PI / 2);
    var tideMat = ownMat(st, new THREE.MeshStandardMaterial({
      color: isNight(view) ? 0x164e70 : 0x32b5d4,
      transparent: true,
      opacity: 0.48,
      roughness: 0.18
    }));
    var tideMesh = new THREE.Mesh(tideGeo, tideMat);
    tideMesh.position.set(-14, -0.62, -5.5);
    tideMesh.visible = false;
    st.group.add(tideMesh);
    st.tideMesh = tideMesh;

    // Low-Tide Stepping-Stone Sandbar
    var sbGrp = new THREE.Group();
    var stoneGeo = ownGeo(st, new THREE.CylinderGeometry(0.45, 0.54, 0.16, 10));
    var stoneMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xdcc79c, roughness: 0.9 }));
    for(var i = 0; i < 5; i++){
      var sm = new THREE.Mesh(stoneGeo, stoneMat);
      sm.position.set(-2.4 + i * 1.2, -0.28, -3.2 + (i % 2) * 0.35);
      sbGrp.add(sm);
    }
    sbGrp.visible = false;
    st.group.add(sbGrp);
    st.sandbarGroup = sbGrp;

    // High-Tide Glowing Bonus Bottles
    var bottleGeo = ownGeo(st, new THREE.CylinderGeometry(0.11, 0.14, 0.42, 10));
    var bottleMat = ownMat(st, new THREE.MeshStandardMaterial({
      color: 0x7ef2d4, emissive: 0x2ec4b6, emissiveIntensity: 0.55, transparent: true, opacity: 0.85
    }));
    for(var b = 0; b < 3; b++){
      var bm = new THREE.Mesh(bottleGeo, bottleMat);
      bm.position.set(-13.5 + b * 2.2, -0.58, -4.6);
      bm.rotation.z = 0.35;
      bm.visible = false;
      st.group.add(bm);
      st.tideBottles.push({ mesh: bm, baseZ: -4.6, phase: b * 1.7 });
    }
  }

  function tossBottle(view, letterMeta){
    var st = ensureState(view);
    var THREE = T();
    if(!st || !THREE || !st.group) return;

    var start = new THREE.Vector3(0, 0.6, 0);
    if(view.guide && view.guide.position) start.copy(view.guide.position).add(new THREE.Vector3(0, 0.55, 0));
    var end = new THREE.Vector3(6.2, -0.15, -5.2);

    var bGrp = new THREE.Group();
    var body = new THREE.Mesh(
      ownGeo(st, new THREE.CylinderGeometry(0.12, 0.15, 0.46, 10)),
      ownMat(st, new THREE.MeshStandardMaterial({
        color: 0xffd166, emissive: 0xf4a261, emissiveIntensity: 0.65, transparent: true, opacity: 0.9
      }))
    );
    var cork = new THREE.Mesh(
      ownGeo(st, new THREE.CylinderGeometry(0.08, 0.07, 0.1, 8)),
      ownMat(st, new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.8 }))
    );
    cork.position.y = 0.27;
    bGrp.add(body);
    bGrp.add(cork);
    bGrp.position.copy(isCalm() ? end : start);
    st.group.add(bGrp);

    st.tossedBottles.push({
      mesh: bGrp,
      start: start,
      end: end,
      t: isCalm() ? 1 : 0,
      dur: 1.35,
      done: false
    });

    // Queue golden return bottle in WorldState
    saveWorldAction('queueReturnBottle', letterMeta || { from: 'beach', at: Date.now() });
    playTone(440, 0.18, 'sine', 0.12);
    playTone(659.25, 0.24, 'triangle', 0.12, 0.15);
  }

  // ==========================================================================
  // 3. PATTERN REEF
  // ==========================================================================
  function buildPatternReef(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    var fMajorColors = [0xff7b89, 0xffa65c, 0xf7d060, 0x8be07b, 0x56cfe1, 0x64dfdf, 0x8093f1, 0xc77dff];
    var baseGeo = ownGeo(st, new THREE.CylinderGeometry(0.44, 0.50, 0.08, 18));
    var rimGeo = ownGeo(st, new THREE.TorusGeometry(0.41, 0.042, 8, 20));
    var domeGeo = ownGeo(st, new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5));
    var baseMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xe6d8be, roughness: 0.62 }));
    var goldMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xe8be58, metalness: 0.65, roughness: 0.28 }));
    for(var i = 0; i < 8; i++){
      var ang = (i / 8) * Math.PI * 2;
      var rad = 4.25;
      var x = Math.cos(ang) * rad;
      var z = Math.sin(ang) * rad;
      var ok = true;
      if(Array.isArray(view.spaces)){
        ok = false;
        for(var tries = 0; tries < 5; tries++){
          var hit = false;
          for(var ti = 0; ti < view.spaces.length; ti++){
            var ts = view.spaces[ti];
            if(ts && Math.hypot(x - ts.x, z - ts.z) < 2.95){ hit = true; break; }
          }
          if(!hit){ ok = true; break; }
          rad = tries % 2 === 0 ? (rad - 0.85) : (rad + 1.05);
          x = Math.cos(ang) * rad;
          z = Math.sin(ang) * rad;
        }
      }
      if(!ok) continue;
      var gy = groundYAt(view, x, z);
      var mat = ownMat(st, new THREE.MeshStandardMaterial({
        color: fMajorColors[i],
        emissive: fMajorColors[i],
        emissiveIntensity: 0.14,
        roughness: 0.22,
        metalness: 0.10
      }));
      var grp = new THREE.Group();
      grp.position.set(x, gy + 0.03, z);
      var plinth = new THREE.Mesh(baseGeo, baseMat);
      plinth.position.y = 0.02;
      grp.add(plinth);
      var rim = new THREE.Mesh(rimGeo, goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.068;
      grp.add(rim);
      var cap = new THREE.Mesh(domeGeo, mat);
      cap.scale.set(1, 0.24, 1);
      cap.position.y = 0.056;
      grp.add(cap);
      st.group.add(grp);
      st.mosaicTiles.push({ mesh: grp, mat: mat, baseY: gy + 0.03 });
    }
  }

  function triggerPatternResonance(view, streak){
    var st = ensureState(view);
    if(!st) return;
    var count = clamp(parseInt(streak, 10) || 3, 1, 8);
    var fMajor = [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25, 698.46];
    var mult = count >= 6 ? 4 : (count >= 4 ? 3 : 2);

    st.resonanceAnim = { t: 0, count: count };
    for(var i = 0; i < count; i++){
      (function(idx){
        var tid = setTimeout(function(){
          if(st.disposed) return;
          playTone(fMajor[idx], 0.38, 'triangle', 0.16);
          if(st.mosaicTiles[idx]){
            st.mosaicTiles[idx].mat.emissiveIntensity = 0.95;
            if(!isCalm()) st.mosaicTiles[idx].mesh.position.y = st.mosaicTiles[idx].baseY + 0.18;
          }
        }, idx * 140);
        addTimer(st, tid);
      })(i);
    }
    if(count >= 2) awardShells(view, mult, 'pattern-resonance-x' + mult);
  }

  function openBlockForge(view){
    var st = ensureState(view);
    if(!st) return;

    var recipes = [];
    try {
      if(window.CulturePacks && typeof CulturePacks.getBlockForgeRecipes === 'function'){
        recipes = safeArray(CulturePacks.getBlockForgeRecipes(), 8);
      }
    } catch(e){}
    if(!recipes.length){
      recipes = [
        { c: 'ㄱ', v: 'ㅏ', out: '가', gloss: 'ga' },
        { c: 'ㄴ', v: 'ㅏ', out: '나', gloss: 'na' },
        { c: 'ㅁ', v: 'ㅜ', out: '무', gloss: 'mu' },
        { c: 'ㅂ', v: 'ㅏ', out: '바', gloss: 'ba' }
      ];
    }

    var pickC = null, pickV = null;
    openModal(view, '🧊 3D Script Block Forge', 'Snap a consonant & vowel magnetic block to fuse a glowing syllable cube.', function(card){
      var preview = mkEl('div', 'jr-tile-slot', 'Select Consonant + Vowel');
      preview.style.minHeight = '54px';
      preview.style.fontSize = '1.35rem';
      card.appendChild(preview);

      var cols = mkEl('div', 'jr-grid2');
      var cWrap = mkEl('div', 'jr-grid2');
      var vWrap = mkEl('div', 'jr-grid2');
      var seenC = {}, seenV = {};
      var cBtns = [], vBtns = [];

      function tryFuse(){
        if(!pickC || !pickV){
          preview.textContent = (pickC || '?') + ' + ' + (pickV || '?');
          preview.classList.remove('filled');
          return;
        }
        var match = recipes.find(function(r){ return r.c === pickC && r.v === pickV; });
        if(match){
          preview.textContent = '✨ ' + match.out + ' (' + (match.gloss || '') + ') ✨';
          preview.classList.add('filled');
          playTone(523.25, 0.2, 'triangle', 0.14);
          playTone(698.46, 0.3, 'triangle', 0.14, 0.12);
          awardShells(view, 1, 'block-forge-' + match.out);
        } else {
          preview.textContent = pickC + ' + ' + pickV + ' (Try another pair!)';
          preview.classList.remove('filled');
          playTone(261.63, 0.15, 'sine', 0.08);
        }
      }

      recipes.forEach(function(r){
        if(!seenC[r.c]){
          seenC[r.c] = true;
          var cb = mkEl('button', 'jr-btn', r.c);
          cb.type = 'button';
          cb.addEventListener('click', function(){
            pickC = r.c;
            cBtns.forEach(function(x){ x.classList.toggle('active', x.textContent === pickC); });
            tryFuse();
          });
          cBtns.push(cb);
          cWrap.appendChild(cb);
        }
        if(!seenV[r.v]){
          seenV[r.v] = true;
          var vb = mkEl('button', 'jr-btn', r.v);
          vb.type = 'button';
          vb.addEventListener('click', function(){
            pickV = r.v;
            vBtns.forEach(function(x){ x.classList.toggle('active', x.textContent === pickV); });
            tryFuse();
          });
          vBtns.push(vb);
          vWrap.appendChild(vb);
        }
      });

      cols.appendChild(cWrap);
      cols.appendChild(vWrap);
      card.appendChild(cols);
    });
  }

  // ==========================================================================
  // 4. STORY LAGOON
  // ==========================================================================
  function buildStoryLagoon(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    // Sculpted open floating storybooks with angled hardcover spreads, cream pages, painted vignette & golden bookmark
    // placed strictly on OPEN turquoise lagoon water (clear of all tiles, sandbars, wooden dock, Bok & Mira!).
    var coverGeo = ownGeo(st, new THREE.BoxGeometry(0.56, 0.04, 0.72));
    var pageGeo = ownGeo(st, new THREE.BoxGeometry(0.50, 0.045, 0.66));
    var spineGeo = ownGeo(st, new THREE.CylinderGeometry(0.045, 0.045, 0.72, 8));
    var ribbonGeo = ownGeo(st, new THREE.BoxGeometry(0.055, 0.015, 0.78));
    var illusGeo = ownGeo(st, new THREE.BoxGeometry(0.32, 0.012, 0.40));
    var rippleGeo = ownGeo(st, new THREE.RingGeometry(0.56, 0.70, 22));
    var pageMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xfbf3e0, roughness: 0.72 }));
    var goldMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.45, roughness: 0.32 }));
    var rippleMat = ownMat(st, new THREE.MeshBasicMaterial({ color: 0xd8faff, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
    var coverCols = [0x2e6f95, 0xb8465c, 0x3b8a6b];
    var illusCols = [0x5cc5cf, 0xf29e68, 0x7bc983];
    var guards = [[-17.65, -10.25], [-14.50, -8.10], [-8.60, -14.70]];
    if(view._shopPos) guards.push([view._shopPos.x, view._shopPos.z]);
    var waterY = -0.58;
    var candidates = [
      [-1.8, -4.6], [2.4, -3.2], [-4.8, 1.4], [3.6, 2.8], [-2.2, 4.2], [5.2, -1.8], [-6.2, -3.6], [0.8, 3.6]
    ];
    function lagoonSpotClear(px, pz){
      if(Array.isArray(view.spaces)){
        for(var ti = 0; ti < view.spaces.length; ti++){
          var ts = view.spaces[ti];
          if(ts && Math.hypot(px - ts.x, pz - ts.z) < 3.4) return false;
        }
      }
      for(var gi = 0; gi < guards.length; gi++){
        if(Math.hypot(px - guards[gi][0], pz - guards[gi][1]) < 4.6) return false;
      }
      if(Array.isArray(view._sceneryObstacles)){
        for(var oi = 0; oi < view._sceneryObstacles.length; oi++){
          var o = view._sceneryObstacles[oi];
          if(o && Math.hypot(px - o.x, pz - o.z) < (o.r || 1.2) + 1.8) return false;
        }
      }
      return true;
    }

    var placed = [];
    for(var i = 0; i < 3; i++){
      var pick = null;
      for(var ci = 0; ci < candidates.length; ci++){
        var cx = candidates[(ci + i * 2) % candidates.length][0];
        var cz = candidates[(ci + i * 2) % candidates.length][1];
        if(placed.some(function(p){ return Math.hypot(p[0] - cx, p[1] - cz) < 3.0; })) continue;
        if(lagoonSpotClear(cx, cz)){ pick = [cx, cz]; break; }
      }
      if(!pick) continue;
      placed.push(pick);
      var covMat = ownMat(st, new THREE.MeshStandardMaterial({ color: coverCols[i % coverCols.length], roughness: 0.55 }));
      var illMat = ownMat(st, new THREE.MeshStandardMaterial({ color: illusCols[i % illusCols.length], roughness: 0.65 }));
      var grp = new THREE.Group();
      grp.position.set(pick[0], waterY + 0.14, pick[1]);
      grp.rotation.y = 0.45 + i * 1.15;

      var rip = new THREE.Mesh(rippleGeo, rippleMat);
      rip.rotation.x = -Math.PI / 2;
      rip.position.y = -0.10;
      grp.add(rip);

      var spine = new THREE.Mesh(spineGeo, covMat);
      spine.rotation.x = Math.PI / 2;
      spine.position.y = 0.01;
      grp.add(spine);

      [-1, 1].forEach(function(sd){
        var board = new THREE.Mesh(coverGeo, covMat);
        board.position.set(sd * 0.27, 0.045, 0);
        board.rotation.z = sd * 0.16;
        grp.add(board);

        var pg = new THREE.Mesh(pageGeo, pageMat);
        pg.position.set(sd * 0.26, 0.082, 0);
        pg.rotation.z = sd * 0.14;
        grp.add(pg);

        var ill = new THREE.Mesh(illusGeo, illMat);
        ill.position.set(sd * 0.26, 0.108, 0);
        ill.rotation.z = sd * 0.14;
        grp.add(ill);
      });

      var rib = new THREE.Mesh(ribbonGeo, goldMat);
      rib.position.set(0.02, 0.088, 0.06);
      grp.add(rib);

      st.group.add(grp);
      st.storyBooks.push({ grp: grp, baseY: waterY + 0.14, phase: i * 2.1 });
    }
  }

  function openPuppetTheater(view, storyData){
    var st = ensureState(view);
    if(!st) return;

    var data = (storyData && Array.isArray(storyData.lines) && storyData.lines.length) ? storyData : {
      title: 'The Lantern Turtle',
      lines: [
        { speaker: 'Shelly', text: 'Look at the glowing paper lanterns on the lagoon!' },
        { speaker: 'Lagoon Keeper', text: 'Each lantern carries a story from across the sea.' },
        { speaker: 'Shelly', text: 'Let us read them together under the moonlight!' }
      ]
    };
    var idx = 0;

    openModal(view, '🎭 ' + (data.title || 'Miniature Puppet Theater'), 'Animated miniature stage rendition.', function(card){
      var cv = mkEl('canvas', 'jr-canvas');
      cv.width = 480; cv.height = 190;
      card.appendChild(cv);

      var lineBox = mkEl('div', 'jr-badge', '');
      lineBox.style.borderRadius = '12px';
      lineBox.style.padding = '8px 12px';
      lineBox.style.fontSize = '.88rem';
      card.appendChild(lineBox);

      var row = mkEl('div', 'jr-row');
      var prevBtn = mkEl('button', 'jr-btn', '◀ Prev');
      var nextBtn = mkEl('button', 'jr-btn accent', 'Next Line ▶');
      prevBtn.type = 'button'; nextBtn.type = 'button';
      row.appendChild(prevBtn);
      row.appendChild(nextBtn);
      card.appendChild(row);

      function renderStage(){
        var ln = data.lines[idx];
        lineBox.textContent = (ln.speaker ? ln.speaker + ': ' : '') + (ln.text || '');
        var ctx = cv.getContext('2d');
        var w = cv.width, h = cv.height;
        ctx.fillStyle = '#14263c';
        ctx.fillRect(0, 0, w, h);
        // Theater curtains
        ctx.fillStyle = '#8b2635';
        ctx.fillRect(0, 0, 34, h);
        ctx.fillRect(w - 34, 0, 34, h);
        ctx.fillRect(0, 0, w, 24);
        // Stage floor
        ctx.fillStyle = '#5c3c24';
        ctx.fillRect(0, h - 32, w, 32);

        // Puppets
        var bounceL = (ln.speaker === 'Shelly' && !isCalm()) ? -10 : 0;
        var bounceR = (ln.speaker !== 'Shelly' && !isCalm()) ? -10 : 0;
        ctx.font = '46px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐢', w * 0.32, h - 46 + bounceL);
        ctx.fillText('🏮', w * 0.50, 74);
        ctx.fillText('🧜', w * 0.68, h - 46 + bounceR);
        playTone(392 + idx * 55, 0.2, 'triangle', 0.1);
      }

      prevBtn.addEventListener('click', function(){
        idx = (idx - 1 + data.lines.length) % data.lines.length;
        renderStage();
      });
      nextBtn.addEventListener('click', function(){
        idx = (idx + 1) % data.lines.length;
        renderStage();
      });
      renderStage();
    });
  }

  // ==========================================================================
  // 5. ECHO CAVES
  // ==========================================================================
  function buildEchoCaves(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    var crystalGeo = ownGeo(st, new THREE.CylinderGeometry(0.02, 0.24, 1.35, 6));
    var subCrystalGeo = ownGeo(st, new THREE.CylinderGeometry(0.015, 0.14, 0.78, 6));
    var plinthGeo = ownGeo(st, new THREE.CylinderGeometry(0.42, 0.56, 0.28, 8));
    var plinthMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x3b4f66, roughness: 0.86 }));
    function caveSpotClear(px, pz){
      if(Array.isArray(view.spaces)){
        for(var ti = 0; ti < view.spaces.length; ti++){
          var ts = view.spaces[ti];
          if(ts && Math.hypot(px - ts.x, pz - ts.z) < 2.55) return false;
        }
      }
      if(Array.isArray(view._sceneryObstacles)){
        for(var oi = 0; oi < view._sceneryObstacles.length; oi++){
          var o = view._sceneryObstacles[oi];
          if(o && Math.hypot(px - o.x, pz - o.z) < (o.r || 1.0) + 1.85) return false;
        }
      }
      return true;
    }
    for(var i = 0; i < 6; i++){
      var ang = (i / 6) * Math.PI * 2 + 0.3;
      var rad = 4.6, x = Math.cos(ang) * rad, z = Math.sin(ang) * rad, ok = false;
      for(var tries = 0; tries < 6; tries++){
        if(caveSpotClear(x, z)){ ok = true; break; }
        rad += (tries % 2 === 0 ? 1.1 : -0.65);
        ang += 0.22;
        x = Math.cos(ang) * rad;
        z = Math.sin(ang) * rad;
      }
      if(!ok) continue;
      var gy = groundYAt(view, x, z);
      var mat = ownMat(st, new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x72efdd : 0x9b8df2,
        emissive: i % 2 ? 0x3ab2d6 : 0x6b5cd4,
        emissiveIntensity: 0.25,
        roughness: 0.22
      }));
      var grp = new THREE.Group();
      grp.position.set(x, gy, z);
      var plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.12;
      grp.add(plinth);
      var mainSpire = new THREE.Mesh(crystalGeo, mat);
      mainSpire.position.y = 0.82;
      grp.add(mainSpire);
      var sideL = new THREE.Mesh(subCrystalGeo, mat);
      sideL.position.set(-0.22, 0.50, 0.12);
      sideL.rotation.z = 0.28;
      grp.add(sideL);
      var sideR = new THREE.Mesh(subCrystalGeo, mat);
      sideR.position.set(0.20, 0.46, -0.14);
      sideR.rotation.z = -0.24;
      grp.add(sideR);
      st.group.add(grp);
      st.echoPillars.push({ mesh: grp, mat: mat });
    }
  }

  function triggerEchoWave(view, pitchScore){
    var st = ensureState(view);
    var THREE = T();
    if(!st || !THREE || !st.group) return;

    var score = clamp(Number(pitchScore) || 0.85, 0.1, 1.0);
    var origin = (view.guide && view.guide.position) ? view.guide.position.clone() : new THREE.Vector3(0, 0.2, 0);

    // 3 concentric cavern soundwave rings
    for(var r = 0; r < 3; r++){
      var rMat = ownMat(st, new THREE.MeshBasicMaterial({
        color: 0x80ffdb, transparent: true, opacity: 0.85, side: THREE.DoubleSide
      }));
      var rMesh = new THREE.Mesh(ownGeo(st, new THREE.RingGeometry(0.35, 0.48, 28)), rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(origin.x, origin.y + 0.2, origin.z);
      st.group.add(rMesh);
      st.echoRings.push({ mesh: rMesh, mat: rMat, t: -r * 0.18, dur: 1.4 });
    }

    // Chime crystal pillars + WebAudio harmonic bells
    var baseFreq = 330 + score * 220;
    st.echoPillars.forEach(function(p, idx){
      p.mat.emissiveIntensity = 1.0;
      playTone(baseFreq * (1 + idx * 0.12), 0.45, 'sine', 0.11, idx * 0.08);
    });

    // Shimmering acoustic ribbon glide (skipped motion in Calm mode)
    if(!isCalm() && view.guide){
      st.echoGlide = { t: 0, dur: 1.5, origin: origin.clone() };
    }
  }

  // ==========================================================================
  // 6. HARBOR TOWN
  // ==========================================================================
  function buildHarborTown(view, st){
    var THREE = T();
    if(!THREE || !st.group) return;

    function townSpotClear(px, pz, minD){
      if(Array.isArray(view.spaces)){
        for(var ti = 0; ti < view.spaces.length; ti++){
          var ts = view.spaces[ti];
          if(ts && Math.hypot(px - ts.x, pz - ts.z) < (minD || 2.55)) return false;
        }
      }
      if(view._shopPos && Math.hypot(px - view._shopPos.x, pz - view._shopPos.z) < 3.0) return false;
      return true;
    }

    // Evolving 3D World Signage — placed cleanly on the sunny outer-right sidewalk clear of Bok, Cafe Seahorse & all tiles!
    var signCands = [[5.2, -4.4], [6.0, -3.6], [4.4, -5.8], [6.4, -5.0], [3.6, -6.2]];
    var sx = 5.2, sz = -4.4;
    for(var sci = 0; sci < signCands.length; sci++){
      if(townSpotClear(signCands[sci][0], signCands[sci][1], 2.85)){
        sx = signCands[sci][0]; sz = signCands[sci][1]; break;
      }
    }
    var sgy = groundYAt(view, sx, sz);
    var signGrp = new THREE.Group();
    signGrp.position.set(sx, sgy, sz);
    signGrp.rotation.y = -0.35;

    var stoneMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xc8bba4, roughness: 0.82 }));
    var postMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 }));
    var capMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0xc45746, roughness: 0.72 }));
    var plinth = new THREE.Mesh(ownGeo(st, new THREE.CylinderGeometry(0.28, 0.34, 0.22, 10)), stoneMat);
    plinth.position.y = 0.11;
    signGrp.add(plinth);
    var post = new THREE.Mesh(ownGeo(st, new THREE.CylinderGeometry(0.08, 0.09, 1.5, 10)), postMat);
    post.position.y = 0.84;
    signGrp.add(post);
    var roofCap = new THREE.Mesh(ownGeo(st, new THREE.BoxGeometry(1.48, 0.10, 0.26)), capMat);
    roofCap.position.y = 1.78;
    signGrp.add(roofCap);

    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    var tex = ownTex(st, new THREE.CanvasTexture(cv));
    st.signCanvas = cv;
    st.signTex = tex;
    refreshTownSign(st);

    var board = new THREE.Mesh(
      ownGeo(st, new THREE.BoxGeometry(1.3, 0.65, 0.08)),
      ownMat(st, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }))
    );
    board.position.y = 1.38;
    signGrp.add(board);
    st.group.add(signGrp);

    // Night Market Carts — tile-clear with wooden wheels & canopies
    var items = [];
    try {
      if(window.CulturePacks && typeof CulturePacks.getNightMarketItems === 'function'){
        items = safeArray(CulturePacks.getNightMarketItems(), 4);
      }
    } catch(e){}
    if(!items.length){
      items = [
        { name: 'Moonlight Boba', col: 0xff9f1c },
        { name: 'Starfish Lantern', col: 0xffbf69 },
        { name: 'Coral Rice Cake', col: 0x2ec4b6 }
      ];
    }

    var nightOn = isNight(view);
    var wheelGeo = ownGeo(st, new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12));
    var wheelMat = ownMat(st, new THREE.MeshStandardMaterial({ color: 0x4f3018, roughness: 0.78 }));
    var poleGeo = ownGeo(st, new THREE.CylinderGeometry(0.028, 0.028, 0.64, 6));
    var cartSpots = [[2.2, -5.2], [4.0, -5.2], [5.8, -5.0]];
    for(var i = 0; i < items.length; i++){
      var cx = cartSpots[i] ? cartSpots[i][0] : (1.6 + i * 1.65);
      var cz = cartSpots[i] ? cartSpots[i][1] : -5.2;
      if(!townSpotClear(cx, cz, 2.35)){ cz -= 1.2; }
      var cgy = groundYAt(view, cx, cz);
      var cart = new THREE.Group();
      cart.position.set(cx, cgy, cz);

      var body = new THREE.Mesh(
        ownGeo(st, new THREE.BoxGeometry(0.86, 0.50, 0.56)),
        ownMat(st, new THREE.MeshStandardMaterial({ color: 0x7f4f24, roughness: 0.8 }))
      );
      body.position.y = 0.36;
      cart.add(body);

      [-0.36, 0.36].forEach(function(wx){
        var wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.rotation.x = Math.PI / 2;
        wh.position.set(wx, 0.16, 0.30);
        cart.add(wh);
        var pl = new THREE.Mesh(poleGeo, wheelMat);
        pl.position.set(wx, 0.84, 0.24);
        cart.add(pl);
        var pl2 = new THREE.Mesh(poleGeo, wheelMat);
        pl2.position.set(wx, 0.84, -0.24);
        cart.add(pl2);
      });

      var awningMat = ownMat(st, new THREE.MeshStandardMaterial({
        color: items[i].col || 0xff9f1c,
        emissive: items[i].col || 0xff9f1c,
        emissiveIntensity: nightOn ? 0.65 : 0.05
      }));
      var awning = new THREE.Mesh(ownGeo(st, new THREE.BoxGeometry(0.98, 0.14, 0.68)), awningMat);
      awning.position.y = 1.14;
      cart.add(awning);

      st.group.add(cart);
      st.nightCarts.push({ grp: cart, awningMat: awningMat });
    }
  }

  function refreshTownSign(st){
    if(!st || !st.signCanvas || !st.signTex) return;
    var cv = st.signCanvas;
    var g = cv.getContext('2d');
    g.fillStyle = '#f3dfc1';
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = '#6b4226';
    g.lineWidth = 8;
    g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
    var ws = getWorldState();
    var repaired = safeArray(ws.repairedSigns, 8).length;
    g.fillStyle = '#3b2412';
    g.font = 'bold 24px sans-serif';
    g.textAlign = 'center';
    g.fillText('HARBOR TOWN', cv.width / 2, 54);
    g.font = '16px sans-serif';
    g.fillText('Signs Restored: ' + repaired, cv.width / 2, 90);
    st.signTex.needsUpdate = true;
  }

  function openSignRepair(view){
    var st = ensureState(view);
    if(!st) return;

    var puzzles = [
      { target: ['항', '구', '마', '을'], scrambled: ['마', '항', '을', '구'], gloss: 'Harbor Village' },
      { target: ['바', '다', '시', '장'], scrambled: ['시', '바', '장', '다'], gloss: 'Sea Market' }
    ];
    var p = puzzles[Math.floor(Math.random() * puzzles.length)];
    var placed = [];

    openModal(view, '🪧 Fix the Mischievous Sign', 'Tap the scrambled syllable blocks in order (' + p.gloss + ').', function(card){
      var slotsRow = mkEl('div', 'jr-grid4');
      var slotEls = [];
      for(var i = 0; i < p.target.length; i++){
        var sl = mkEl('div', 'jr-tile-slot', '?');
        slotEls.push(sl);
        slotsRow.appendChild(sl);
      }
      card.appendChild(slotsRow);

      var btnRow = mkEl('div', 'jr-grid4');
      var statusEl = mkEl('p', 'jr-sub', 'Build: ' + p.target.join(''));
      var resetBtn = mkEl('button', 'jr-btn', '↺ Reset');
      resetBtn.type = 'button';

      function reset(){
        placed = [];
        slotEls.forEach(function(s){ s.textContent = '?'; s.classList.remove('filled'); });
        Array.prototype.forEach.call(btnRow.children, function(b){ b.disabled = false; b.classList.remove('active'); });
        statusEl.textContent = 'Target: ' + p.gloss;
      }

      p.scrambled.forEach(function(syl){
        var b = mkEl('button', 'jr-btn', syl);
        b.type = 'button';
        b.addEventListener('click', function(){
          if(placed.length >= p.target.length) return;
          var nextIdx = placed.length;
          if(syl === p.target[nextIdx]){
            placed.push(syl);
            slotEls[nextIdx].textContent = syl;
            slotEls[nextIdx].classList.add('filled');
            b.disabled = true;
            b.classList.add('active');
            playTone(440 + nextIdx * 80, 0.18, 'triangle', 0.12);
            if(placed.length === p.target.length){
              statusEl.textContent = '✨ Sign Repaired! +2 Bonus Shells!';
              awardShells(view, 2, 'sign-repair');
              saveWorldAction('markSignRepaired', p.target.join(''));
              refreshTownSign(st);
              playTone(698.46, 0.3, 'triangle', 0.15, 0.12);
            }
          } else {
            statusEl.textContent = 'Oops! That tile belongs later.';
            playTone(210, 0.15, 'sine', 0.08);
          }
        });
        btnRow.appendChild(b);
      });

      resetBtn.addEventListener('click', reset);
      card.appendChild(btnRow);
      card.appendChild(statusEl);
      card.appendChild(resetBtn);
    });
  }

  // ==========================================================================
  // LIFECYCLE: attach, tick, onActivityComplete, dispose
  // ==========================================================================
  function attach(view){
    if(!view) return;
    if(view._jamboree && !view._jamboree.disposed) dispose(view);
    var st = ensureState(view);
    if(!st) return;

    if(st.regionId === 'captain') buildCaptainCabin(view, st);
    else if(st.regionId === 'beach') buildBottleBeach(view, st);
    else if(st.regionId === 'patterns') buildPatternReef(view, st);
    else if(st.regionId === 'lagoon') buildStoryLagoon(view, st);
    else if(st.regionId === 'caves') buildEchoCaves(view, st);
    else if(st.regionId === 'town') buildHarborTown(view, st);

    var hideForEnc = !!(view && view.encounter && (view.encounter.interior || st.regionId === 'beach'));
    if(st.group) st.group.visible = !hideForEnc;
  }

  function tick(view, now, dt){
    var st = view && view._jamboree;
    if(!st || st.disposed) return;
    var hideForEnc = !!(view && view.encounter && (view.encounter.interior || st.regionId === 'beach'));
    if(st.group) st.group.visible = !hideForEnc;
    if(hideForEnc) return;
    var step = clamp(dt || 0.016, 0.001, 0.1);
    var calm = isCalm();

    // Captain's Cabin: gentle keepsake rotation
    if(st.regionId === 'captain' && st.trophiesGroup && !calm){
      st.trophiesGroup.children.forEach(function(slot){
        var k = slot.userData && slot.userData.keepsake;
        if(k && slot.userData.unlocked) k.rotation.y += step * 0.9;
      });
    }

    // Bottle Beach: Rising & Falling Tide + Tossed Bottles
    if(st.regionId === 'beach'){
      st.tideTime += calm ? 0 : step * 0.35;
      var wave = calm ? 0 : Math.sin(st.tideTime);
      st.tidePhase = wave < -0.35 ? 'low' : (wave > 0.35 ? 'high' : 'mid');
      if(st.tideMesh){
        st.tideMesh.position.y = -0.62 + wave * 0.03;
      }
      if(st.sandbarGroup){
        st.sandbarGroup.visible = false;
      }
      st.tideBottles.forEach(function(tb){
        var highPush = st.tidePhase === 'high' ? 1.1 : 0;
        tb.mesh.position.z = tb.baseZ + highPush + (calm ? 0 : Math.sin(st.tideTime * 2 + tb.phase) * 0.25);
        tb.mesh.position.y = -0.58 + wave * 0.03 + (calm ? 0 : Math.sin(st.tideTime * 3 + tb.phase) * 0.02);
      });
      for(var i = st.tossedBottles.length - 1; i >= 0; i--){
        var b = st.tossedBottles[i];
        if(!b.done){
          b.t = Math.min(1, b.t + step / b.dur);
          b.mesh.position.lerpVectors(b.start, b.end, b.t);
          b.mesh.position.y += Math.sin(b.t * Math.PI) * 2.2;
          b.mesh.rotation.z += step * 5;
          if(b.t >= 1) b.done = true;
        }
      }
    }

    // Pattern Reef: settle mosaic tiles
    if(st.regionId === 'patterns'){
      st.mosaicTiles.forEach(function(mt){
        mt.mat.emissiveIntensity += (0.12 - mt.mat.emissiveIntensity) * Math.min(1, step * 3);
        mt.mesh.position.y += (mt.baseY - mt.mesh.position.y) * Math.min(1, step * 5);
      });
    }

    // Story Lagoon: gentle storybook float
    if(st.regionId === 'lagoon' && !calm){
      var tSec = (now || 0) * 0.0015;
      st.storyBooks.forEach(function(sb){
        sb.grp.position.y = sb.baseY + Math.sin(tSec + sb.phase) * 0.06;
      });
    }

    // Echo Caves: expanding soundwave rings + crystal decay + ribbon glide
    if(st.regionId === 'caves'){
      st.echoPillars.forEach(function(p){
        p.mat.emissiveIntensity += (0.25 - p.mat.emissiveIntensity) * Math.min(1, step * 2.5);
      });
      for(var r = st.echoRings.length - 1; r >= 0; r--){
        var er = st.echoRings[r];
        er.t += step;
        if(er.t < 0) continue;
        var k = er.t / er.dur;
        if(k >= 1){
          if(st.group) st.group.remove(er.mesh);
          st.echoRings.splice(r, 1);
        } else {
          er.mesh.scale.setScalar(1 + k * 9);
          er.mat.opacity = 0.85 * (1 - k);
        }
      }
      if(st.echoGlide && view.guide){
        st.echoGlide.t += step;
        var gk = st.echoGlide.t / st.echoGlide.dur;
        if(gk >= 1){
          view.guide.position.copy(st.echoGlide.origin);
          st.echoGlide = null;
        } else {
          view.guide.position.y = st.echoGlide.origin.y + Math.sin(gk * Math.PI) * 0.65;
        }
      }
    }

    // Harbor Town: Night Market glow sync
    if(st.regionId === 'town'){
      var nOn = isNight(view);
      var targetEm = nOn ? 0.65 : 0.05;
      st.nightCarts.forEach(function(c){
        c.awningMat.emissiveIntensity = targetEm;
      });
    }
  }

  function onActivityComplete(view, regionId, meta){
    var rid = regionId || (view && view.region && view.region.id) || '';
    var st = ensureState(view);
    if(!st) return;

    if(rid === 'captain'){
      refreshCorkboardTexture(st);
    } else if(rid === 'beach'){
      tossBottle(view, meta);
    } else if(rid === 'patterns'){
      triggerPatternResonance(view, (meta && meta.streak) || 3);
    } else if(rid === 'lagoon'){
      if(meta && meta.storyData) openPuppetTheater(view, meta.storyData);
    } else if(rid === 'caves'){
      triggerEchoWave(view, (meta && meta.pitchScore) || 0.9);
    } else if(rid === 'town'){
      refreshTownSign(st);
    }
  }

  function dispose(view){
    var st = view && view._jamboree;
    if(!st || st.disposed) return;
    st.disposed = true;

    closeOverlay(view);
    st.timers.forEach(function(id){ try { clearTimeout(id); clearInterval(id); } catch(e){} });
    st.cleanups.forEach(function(fn){ try { fn(); } catch(e){} });

    if(st.group && view.scene){
      try { view.scene.remove(st.group); } catch(e){}
    }
    st.geos.forEach(function(g){ try { if(g && g.dispose) g.dispose(); } catch(e){} });
    st.mats.forEach(function(m){ try { if(m && m.dispose) m.dispose(); } catch(e){} });
    st.texs.forEach(function(t){ try { if(t && t.dispose) t.dispose(); } catch(e){} });

    st.geos.length = 0;
    st.mats.length = 0;
    st.texs.length = 0;
    st.timers.length = 0;
    st.cleanups.length = 0;
    view._jamboree = null;
  }

  return {
    attach: attach,
    tick: tick,
    onActivityComplete: onActivityComplete,
    openTelescope: openTelescope,
    openGramophone: openGramophone,
    tossBottle: tossBottle,
    triggerPatternResonance: triggerPatternResonance,
    openBlockForge: openBlockForge,
    openPuppetTheater: openPuppetTheater,
    triggerEchoWave: triggerEchoWave,
    openSignRepair: openSignRepair,
    dispose: dispose
  };
})();

window.JamboreeRegions = JamboreeRegions;
