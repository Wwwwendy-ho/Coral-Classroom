/* ---------- REEF 3D: Jamboree Board Strategy, Showtime Minigames, Buddies,
   Scenic Transit, Kiko Hints, Cosmetics, Errands, Shell Camera, Home Island & Lantern Festival ---------- */
(function(){
  'use strict';

  var JP_STYLE_ID = 'jp-jamboree-styles';
  var JP_ITEMS = [
    { id: 'doubleDice', name: 'Double Dice', ko: '더블 주사위', cost: 8, emoji: '🎲', desc: 'Roll two dice at once' },
    { id: 'compassDice', name: 'Compass Die', ko: '나침반 주사위', cost: 10, emoji: '🧭', desc: 'Steer +2 exact steps' },
    { id: 'currentWhistle', name: 'Current Whistle', ko: '물살 호루라기', cost: 12, emoji: '🐚', desc: 'Ride a bubble shortcut' }
  ];
  var JP_BUDDIES = {
    'taxi-squid': { name: 'Taxi Squid', ko: '택시 오징어', emoji: '🦑', color: '#ff8a65', accent: '#ffd54f', perk: '+2 steps every roll' },
    'shop-octopus': { name: 'Shop Octopus', ko: '상점 문어', emoji: '🐙', color: '#ba68c8', accent: '#fff176', perk: 'Peeks ? blocks ahead' },
    'pharmacy-shrimp': { name: 'Pharmacy Shrimp', ko: '약국 새우', emoji: '🦐', color: '#ffab91', accent: '#80cbc4', perk: 'Hint shield active' },
    'captain-bay': { name: 'Captain Bay', ko: '선장 베이', emoji: '🦦', color: '#8d6e63', accent: '#4fc3f7', perk: '2x Shells earned' }
  };
  var JP_COSMETICS = [
    { id: 'captainCap', name: 'Captain Cap', emoji: '🧢' },
    { id: 'bistroBeret', name: 'Bistro Beret', emoji: '🎨' },
    { id: 'flowerCrown', name: 'Flower Crown', emoji: '🌸' },
    { id: 'nacreShell', name: 'Nacre Shell', emoji: '✨' }
  ];
  var JP_ORNAMENTS = [
    { id: 'coralArch', name: 'Coral Arch', emoji: '🪸', color: '#ff7b89' },
    { id: 'lanternPost', name: 'Lantern Post', emoji: '🏮', color: '#ffd166' },
    { id: 'shellFountain', name: 'Shell Fountain', emoji: '⛲', color: '#80e5ff' },
    { id: 'hanokTable', name: 'Tea Table', emoji: '🍵', color: '#c49a6c' },
    { id: 'starfishRug', name: 'Starfish Mat', emoji: '⭐', color: '#ffb703' },
    { id: 'pearlStand', name: 'Pearl Stand', emoji: '🦪', color: '#f8edeb' }
  ];
  var JP_DEFAULT_SHOWTIME = {
    bistro: [
      { prompt: '비빔밥 (Bibimbap)', choices: ['비빔밥', '김밥', '떡볶이'], answer: 0 },
      { prompt: '김밥 (Gimbap)', choices: ['라면', '김밥', '만두'], answer: 1 },
      { prompt: '떡볶이 (Tteokbokki)', choices: ['떡볶이', '불고기', '김치'], answer: 0 },
      { prompt: '만두 (Mandu)', choices: ['파전', '잡채', '만두'], answer: 2 }
    ],
    echo: [
      { prompt: 'Do - Mi - Sol', seq: [0, 1, 2], labels: ['도 Do', '미 Mi', '솔 Sol'] },
      { prompt: 'Sol - Mi - Do', seq: [2, 1, 0], labels: ['도 Do', '미 Mi', '솔 Sol'] },
      { prompt: 'Mi - Sol - Mi', seq: [1, 2, 1], labels: ['도 Do', '미 Mi', '솔 Sol'] }
    ],
    tide: [
      { prompt: 'Catch 바다가 (Sea)!', choices: ['바다', '산', '하늘'], answer: 0 },
      { prompt: 'Catch 진주 (Pearl)!', choices: ['모래', '진주', '파도'], answer: 1 },
      { prompt: 'Catch 거북이 (Turtle)!', choices: ['게', '물고기', '거북이'], answer: 2 },
      { prompt: 'Catch 등대 (Lighthouse)!', choices: ['등대', '배', '섬'], answer: 0 }
    ]
  };
  var JP_DEFAULT_STICKERS = ['🌊 파도', '🐚 조개', '🏮 등불', '🌸 벚꽃', '✨ 반짝', '🐢 쉘리'];

  function jpMuted(){
    if(typeof S !== 'undefined' && S && S.muted) return true;
    if(typeof reefSoundOn === 'function' && !reefSoundOn()) return true;
    if(typeof Sound !== 'undefined' && Sound && typeof Sound.isEnabled === 'function' && !Sound.isEnabled()) return true;
    return false;
  }
  function jpCalm(){
    return typeof reefCalm === 'function' ? !!reefCalm() : false;
  }
  function jpSound(fn){
    if(jpMuted()) return;
    try { fn(); } catch(e){}
  }
  function jpEsc(s){
    if(typeof esc === 'function') return esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function jpState(){
    var raw = null;
    if(window.WorldState && typeof window.WorldState.get === 'function'){
      raw = window.WorldState.get();
    } else if(typeof reefBoard === 'function'){
      var b = reefBoard();
      raw = b.jamboree || (b.jamboree = {});
    } else {
      raw = {};
    }
    if(!raw.items || typeof raw.items !== 'object') raw.items = {};
    JP_ITEMS.forEach(function(it){
      var v = parseInt(raw.items[it.id], 10);
      raw.items[it.id] = isFinite(v) && v > 0 ? Math.min(99, v) : 0;
    });
    if(!raw.hearts || typeof raw.hearts !== 'object') raw.hearts = {};
    if(!Array.isArray(raw.homeItems)) raw.homeItems = [];
    raw.homeItems = raw.homeItems.filter(function(id){
      return JP_ORNAMENTS.some(function(o){ return o.id === id; });
    }).slice(0, 12);
    if(!Array.isArray(raw.photos)) raw.photos = [];
    raw.photos = raw.photos.slice(0, 12);
    if(!raw.cosmetic || typeof raw.cosmetic !== 'string') raw.cosmetic = '';
    if(!raw.errand || typeof raw.errand !== 'object') raw.errand = { active: false, stops: ['bistro', 'market', 'lighthouse'], index: 0 };
    if(!Array.isArray(raw.errand.stops) || !raw.errand.stops.length) raw.errand.stops = ['bistro', 'market', 'lighthouse'];
    raw.errand.index = Math.max(0, Math.min(raw.errand.stops.length, parseInt(raw.errand.index, 10) || 0));
    return raw;
  }

  function jpSave(){
    jpState();
    if(window.WorldState && typeof window.WorldState.save === 'function'){
      try { window.WorldState.save(); } catch(e){}
    } else if(typeof reefBoardSave === 'function'){
      try { reefBoardSave(); } catch(e){}
    }
  }

  function jpShells(view, delta, why){
    var jp = jpState();
    var mult = (delta > 0 && jp.buddy === 'captain-bay' && (jp.buddyTurns || 0) > 0) ? 2 : 1;
    var amt = delta > 0 ? delta * mult : delta;
    if(typeof reef3dShells === 'function' && view && view.wrap){
      reef3dShells(view, amt, why || 'jamboree');
    } else if(typeof reefBoard === 'function'){
      var b = reefBoard();
      b.shells = Math.max(0, (b.shells || 0) + amt);
      jpSave();
    }
  }

  function jpGetShellCount(){
    if(typeof reefBoard === 'function') return reefBoard().shells || 0;
    return 0;
  }

  function jpAddHeart(residentId, delta){
    if(!residentId) return 0;
    var jp = jpState();
    var cur = parseInt(jp.hearts[residentId], 10) || 0;
    jp.hearts[residentId] = Math.max(0, Math.min(5, cur + (delta || 1)));
    jpSave();
    return jp.hearts[residentId];
  }

  function jpInjectStyles(){
    if(document.getElementById(JP_STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = JP_STYLE_ID;
    st.textContent =
      '.jp-modal{position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;background:rgba(9,24,42,.56);backdrop-filter:blur(4px);padding:10px;}' +
      '.jp-card{width:min(520px,96vw);max-height:92vh;overflow:hidden;border-radius:18px;background:linear-gradient(160deg,#fffdf6,#eef8fb);color:#173247;box-shadow:0 18px 42px rgba(7,20,34,.35);border:2px solid rgba(255,214,102,.7);padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-family:inherit;}' +
      '.jp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
      '.jp-head h3{margin:0;font-size:16px;line-height:1.2;}' +
      '.jp-pill{background:#fff3c4;border:1px solid #f0c44d;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700;}' +
      '.jp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}' +
      '.jp-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}' +
      '@media(max-width:460px){.jp-grid3{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}.jp-card{padding:10px;gap:6px;}}' +
      '.jp-tile{background:#fff;border:1.5px solid #cfe6ef;border-radius:12px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;}' +
      '.jp-tile b{font-size:12px;line-height:1.2;}.jp-tile small{font-size:10px;color:#4f6d82;line-height:1.15;}' +
      '.jp-emoji{font-size:22px;line-height:1;}' +
      '.jp-btn{border:none;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;background:#e1f2f7;color:#143b54;}' +
      '.jp-btn.main{background:#ff9f43;color:#fff;}' +
      '.jp-btn.good{background:#2ec4b6;color:#fff;}' +
      '.jp-btn:disabled{opacity:.45;cursor:not-allowed;}' +
      '.jp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}' +
      '.jp-bar{height:8px;width:100%;background:#d8edf3;border-radius:999px;overflow:hidden;}' +
      '.jp-bar>i{display:block;height:100%;background:linear-gradient(90deg,#2ec4b6,#ffb703);transition:width .1s linear;}' +
      '.jp-kiko-hint{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);z-index:38;max-width:min(320px,88vw);background:#fffef8;color:#163348;border:2px solid #ffd166;border-radius:16px;padding:7px 12px;font-size:13px;font-weight:600;box-shadow:0 8px 20px rgba(8,25,40,.22);display:flex;align-items:center;gap:7px;cursor:pointer;}' +
      '.jp-banner{position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:39;background:linear-gradient(90deg,#16425b,#2a6f97);color:#fff;border:1.5px solid #ffd166;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;white-space:nowrap;}' +
      '.jp-cam-frame{position:relative;height:150px;border-radius:12px;overflow:hidden;border:2px solid #2ec4b6;background:#0e3147;display:flex;align-items:center;justify-content:center;}' +
      '.jp-cam-frame img{width:100%;height:100%;object-fit:cover;}' +
      '.jp-cam-sticker{position:absolute;right:10px;bottom:8px;background:rgba(255,255,255,.92);color:#173247;border-radius:999px;padding:3px 9px;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.2);}';
    document.head.appendChild(st);
  }

  function jpEnsureCtx(view){
    if(!view) return null;
    if(view._jp) return view._jp;
    var THREE = window.THREE;
    var ctx = {
      root: THREE ? new THREE.Group() : null,
      disposables: [],
      particles: [],
      counterProps: [],
      buddyGroup: null,
      parcelGroup: null,
      clamGroup: null,
      showtimeGroup: null,
      tunnelGroup: null,
      rideGroup: null,
      homeGroup: null,
      festivalGroup: null,
      lanterns: [],
      activeModal: null,
      hintEl: null,
      hintTimer: 0,
      bannerEl: null,
      bannerTimer: 0,
      kikoEmoteUntil: 0,
      shortcutAnim: null,
      rideAnim: null,
      clamAnim: null,
      flashBeacon: null
    };
    if(ctx.root && view.scene){
      ctx.root.name = 'JamboreePlayRoot';
      view.scene.add(ctx.root);
    }
    view._jp = ctx;
    return ctx;
  }

  function jpTrack(ctx, obj){
    if(!ctx || !obj) return obj;
    ctx.disposables.push(obj);
    return obj;
  }

  function jpDisposeObj(obj){
    if(!obj) return;
    if(obj.traverse){
      obj.traverse(function(n){
        if(n.geometry && typeof n.geometry.dispose === 'function') n.geometry.dispose();
        if(n.material){
          var mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(function(m){
            if(m && m.map && typeof m.map.dispose === 'function') m.map.dispose();
            if(m && typeof m.dispose === 'function') m.dispose();
          });
        }
      });
    } else {
      if(obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
      if(obj.material && typeof obj.material.dispose === 'function') obj.material.dispose();
    }
  }

  function jpClearGroup(group){
    if(!group) return;
    while(group.children.length){
      var ch = group.children[0];
      group.remove(ch);
      jpDisposeObj(ch);
    }
  }

  function jpMat(color, opts){
    var THREE = window.THREE;
    if(!THREE) return null;
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.45, metalness: 0.1 }, opts || {}));
  }

  function jpMesh(geo, mat, x, y, z){
    var THREE = window.THREE;
    var m = new THREE.Mesh(geo, mat);
    if(x != null) m.position.set(x, y || 0, z || 0);
    return m;
  }

  function jpCloseModal(view){
    var ctx = view && view._jp;
    if(ctx && ctx.activeModal){
      ctx.activeModal.remove();
      ctx.activeModal = null;
    }
  }

  function jpShowModal(view, html){
    if(!view || !view.wrap) return null;
    jpInjectStyles();
    jpCloseModal(view);
    var ctx = jpEnsureCtx(view);
    var el = document.createElement('div');
    el.className = 'jp-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="jp-card">' + html + '</div>';
    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(e.target === el) jpCloseModal(view);
    });
    el.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    el.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); jpCloseModal(view); } });
    view.wrap.appendChild(el);
    ctx.activeModal = el;
    return el;
  }

  function jpShowBanner(view, text, ms){
    if(!view || !view.wrap) return;
    jpInjectStyles();
    var ctx = jpEnsureCtx(view);
    if(ctx.bannerEl) ctx.bannerEl.remove();
    clearTimeout(ctx.bannerTimer);
    var b = document.createElement('div');
    b.className = 'jp-banner';
    b.textContent = text;
    view.wrap.appendChild(b);
    ctx.bannerEl = b;
    ctx.bannerTimer = setTimeout(function(){
      if(ctx.bannerEl === b){ b.remove(); ctx.bannerEl = null; }
    }, ms || 2600);
  }

  /* ---- 1. Bok's 3D Counter Miniatures & Shop ---- */
  function jpBuildCounterProps(view){
    var THREE = window.THREE;
    var ctx = jpEnsureCtx(view);
    if(!THREE || !ctx || !ctx.root) return;
    ctx.counterProps.forEach(function(p){ if(p.parent) p.parent.remove(p); jpDisposeObj(p); });
    ctx.counterProps.length = 0;

    var stall = view.regionPeople && view.regionPeople.stall;
    var basePos = new THREE.Vector3(0, 0.8, 0);
    if(stall && stall.position){
      if(typeof stall.updateMatrixWorld === 'function') stall.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(stall);
      basePos.set(stall.position.x, box.min.y + (box.max.y - box.min.y) * 0.44, stall.position.z + 0.35);
    } else if(view.spaces){
      var shopSp = view.spaces.find(function(s){ return s.kind === 'shop'; });
      if(!shopSp) return;
      basePos.set(shopSp.x + 1.1, (shopSp.y || 0) + 0.85, shopSp.z);
    } else {
      return;
    }

    // 1. Double Dice (twin golden cubes)
    var g1 = new THREE.Group();
    g1.add(jpMesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), jpMat('#ffd166', { metalness: 0.35 }), -0.09, 0.09, 0));
    g1.add(jpMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), jpMat('#ffe89e', { metalness: 0.35 }), 0.11, 0.08, 0.05));
    g1.position.set(basePos.x - 0.42, basePos.y, basePos.z);

    // 2. Compass Die (octahedron + teal ring)
    var g2 = new THREE.Group();
    g2.add(jpMesh(new THREE.OctahedronGeometry(0.14, 0), jpMat('#2ec4b6', { roughness: 0.25 }), 0, 0.14, 0));
    var ring = jpMesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), jpMat('#f4a261', { metalness: 0.5 }), 0, 0.04, 0);
    ring.rotation.x = Math.PI / 2;
    g2.add(ring);
    g2.position.set(basePos.x, basePos.y, basePos.z);

    // 3. Current Whistle (spiral cone + mouthpiece)
    var g3 = new THREE.Group();
    var cone = jpMesh(new THREE.ConeGeometry(0.11, 0.28, 12), jpMat('#ff8fa3'), 0, 0.11, 0);
    cone.rotation.z = Math.PI * 0.38;
    g3.add(cone);
    g3.add(jpMesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 10), jpMat('#ffd166'), -0.14, 0.08, 0));
    g3.position.set(basePos.x + 0.42, basePos.y, basePos.z);

    [g1, g2, g3].forEach(function(g, idx){
      g.userData.baseY = basePos.y;
      g.userData.phase = idx * 1.4;
      ctx.root.add(g);
      ctx.counterProps.push(g);
      jpTrack(ctx, g);
    });
  }

  function jpOpenBokShop(view){
    if(!view) return;
    var jp = jpState();
    function renderCards(){
      var shells = jpGetShellCount();
      return JP_ITEMS.map(function(it){
        var own = jp.items[it.id] || 0;
        return '<div class="jp-tile">' +
          '<span class="jp-emoji" aria-hidden="true">' + it.emoji + '</span>' +
          '<b>' + jpEsc(it.name) + '</b>' +
          '<small>' + jpEsc(it.ko) + ' · ' + jpEsc(it.desc) + '</small>' +
          '<small>Owned: <b>' + own + '</b></small>' +
          '<div class="jp-row" style="width:100%;justify-content:center">' +
            '<button type="button" class="jp-btn main" data-jp-buy="' + it.id + '"' + (shells < it.cost ? ' disabled' : '') + '>🐚 ' + it.cost + '</button>' +
            '<button type="button" class="jp-btn good" data-jp-use="' + it.id + '"' + (own < 1 ? ' disabled' : '') + '>Use</button>' +
          '</div></div>';
      }).join('');
    }
    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>🦀 Bok\'s Jamboree Counter</h3><span class="jp-pill" data-jp-shells>🐚 ' + jpGetShellCount() + '</span></div>' +
      '<div class="jp-grid3" data-jp-grid>' + renderCards() + '</div>' +
      '<div class="jp-row"><small>Strategy items boost your next roll or whisk you ahead!</small>' +
      '<button type="button" class="jp-btn" data-jp-close>Close</button></div>'
    );
    if(!modal) return;
    jpSound(function(){ Sound.bloop(660, 0, 0.05); });
    modal.addEventListener('click', function(e){
      var buy = e.target.closest('[data-jp-buy]');
      var use = e.target.closest('[data-jp-use]');
      if(buy){
        var it = JP_ITEMS.find(function(x){ return x.id === buy.dataset.jpBuy; });
        if(!it || jpGetShellCount() < it.cost) return;
        jpShells(view, -it.cost, 'bok-item');
        jp.items[it.id] = (jp.items[it.id] || 0) + 1;
        jpSave();
        jpSound(function(){ Sound.sessionStart(); });
        modal.querySelector('[data-jp-shells]').textContent = '🐚 ' + jpGetShellCount();
        modal.querySelector('[data-jp-grid]').innerHTML = renderCards();
      } else if(use){
        jpCloseModal(view);
        JamboreePlay.useItem(view, use.dataset.jpUse);
      } else if(e.target.closest('[data-jp-close]')){
        jpCloseModal(view);
      }
    });
  }

  function jpUseItem(view, itemId){
    var jp = jpState();
    var it = JP_ITEMS.find(function(x){ return x.id === itemId; });
    if(!it) return false;
    if((jp.items[itemId] || 0) < 1){
      jpKikoHint(view, 'Visit Bok\'s counter to pick up ' + it.name + '!');
      return false;
    }
    jp.items[itemId]--;
    jp.activeItem = itemId;
    if(itemId === 'doubleDice' && typeof reefBoard === 'function'){
      reefBoard().dbl = (reefBoard().dbl || 0) + 1;
    }
    jpSave();
    jpSound(function(){ Sound.bloop(880, 0, 0.08); });
    jpRollEffect(view, 10);
    if(itemId === 'currentWhistle'){
      jpTriggerBubbleShortcut(view);
    } else {
      jpShowBanner(view, it.emoji + ' ' + it.name + ' ready for your next roll!');
    }
    return true;
  }

  /* ---- 2. Roll Sparkle & Landing Puffs ---- */
  function jpSpawnBurst(view, pos, color, count, speed){
    var THREE = window.THREE;
    var ctx = jpEnsureCtx(view);
    if(!THREE || !ctx || !ctx.root || !pos) return;
    var n = jpCalm() ? Math.min(4, count || 6) : (count || 12);
    for(var i = 0; i < n; i++){
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      var sp = (speed || 1.4) * (0.6 + Math.random() * 0.6);
      var m = jpMesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 6), jpMat(color, { transparent: true, opacity: 0.9, emissive: color, emissiveIntensity: 0.35 }), pos.x, pos.y + 0.35, pos.z);
      ctx.root.add(m);
      ctx.particles.push({
        mesh: m,
        vx: Math.cos(a) * sp,
        vy: jpCalm() ? 0.25 : (1.1 + Math.random() * 1.1),
        vz: Math.sin(a) * sp,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.25
      });
    }
  }

  function jpRollEffect(view, count){
    if(!view || !view.guide) return;
    var p = view.guide.position;
    jpSpawnBurst(view, p, '#ffd166', count || 10, 1.5);
    jpSpawnBurst(view, p, '#7ef5e8', Math.max(4, Math.floor((count || 10) / 2)), 1.1);
  }

  /* ---- 3. Jamboree Buddies ---- */
  function jpBuildBuddyMesh(residentId){
    var THREE = window.THREE;
    if(!THREE) return null;
    var meta = JP_BUDDIES[residentId] || JP_BUDDIES['taxi-squid'];
    var g = new THREE.Group();
    var bodyMat = jpMat(meta.color);
    var accMat = jpMat(meta.accent);
    // Grounded base & body at y >= 0
    g.add(jpMesh(new THREE.SphereGeometry(0.28, 16, 12), bodyMat, 0, 0.34, 0));
    g.add(jpMesh(new THREE.SphereGeometry(0.18, 14, 10), bodyMat, 0, 0.62, 0.04));
    // Eyes
    var eyeM = jpMat('#1a2b3c');
    g.add(jpMesh(new THREE.SphereGeometry(0.04, 8, 6), eyeM, 0.08, 0.64, 0.19));
    g.add(jpMesh(new THREE.SphereGeometry(0.04, 8, 6), eyeM, -0.08, 0.64, 0.19));
    // Signature perk prop resting on head/body
    var hat = jpMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.09, 12), accMat, 0, 0.8, 0.02);
    g.add(hat);
    // Grounded fins/tentacles
    for(var i = 0; i < 4; i++){
      var a = (i / 4) * Math.PI * 2 + 0.4;
      g.add(jpMesh(new THREE.SphereGeometry(0.09, 8, 6), bodyMat, Math.cos(a) * 0.22, 0.09, Math.sin(a) * 0.22));
    }
    return g;
  }

  function jpInviteBuddy(view, residentId){
    var id = JP_BUDDIES[residentId] ? residentId : 'taxi-squid';
    var jp = jpState();
    jp.buddy = id;
    jp.buddyTurns = 3;
    jpAddHeart(id, 1);
    jpSave();
    var ctx = jpEnsureCtx(view);
    if(ctx && ctx.root && window.THREE){
      if(ctx.buddyGroup){ ctx.root.remove(ctx.buddyGroup); jpDisposeObj(ctx.buddyGroup); }
      ctx.buddyGroup = jpBuildBuddyMesh(id);
      if(ctx.buddyGroup){
        var base = (view.crab && view.crab.position) || (view.guide && view.guide.position) || new window.THREE.Vector3();
        ctx.buddyGroup.position.set(base.x - 1.1, base.y, base.z - 0.9);
        ctx.root.add(ctx.buddyGroup);
      }
    }
    var meta = JP_BUDDIES[id];
    jpSound(function(){ Sound.sessionStart(); });
    jpShowBanner(view, meta.emoji + ' ' + meta.name + ' joined for 3 turns! (' + meta.perk + ')');
  }

  /* ---- 4. 20-Second Showtime 3D Micro-Minigames & Giant-Clam Shell Game ---- */
  function jpGetShowtimeData(gameId){
    if(window.CulturePacks && typeof window.CulturePacks.getShowtimePrompts === 'function'){
      try {
        var res = window.CulturePacks.getShowtimePrompts(gameId);
        if(Array.isArray(res) && res.length) return res;
      } catch(e){}
    }
    return JP_DEFAULT_SHOWTIME[gameId] || JP_DEFAULT_SHOWTIME.bistro;
  }

  function jpStartShowtime(view, gameId){
    if(!view) return;
    var gid = (gameId === 'echo' || gameId === 'tide') ? gameId : 'bistro';
    var titles = { bistro: '🍜 Bistro Rush', echo: '🎶 Echo Pipe Choir', tide: '🌊 Tide Scoop' };
    var prompts = jpGetShowtimeData(gid);
    var round = 0, score = 0, timeLeft = 20.0, done = false;
    var ctx = jpEnsureCtx(view);

    // Spawn 3D Showtime stage props in front of Shelly
    if(ctx && ctx.root && window.THREE && view.guide){
      if(ctx.showtimeGroup){ ctx.root.remove(ctx.showtimeGroup); jpDisposeObj(ctx.showtimeGroup); }
      ctx.showtimeGroup = new window.THREE.Group();
      var gp = view.guide.position;
      for(var i = -1; i <= 1; i++){
        var prop = gid === 'echo'
          ? jpMesh(new window.THREE.CylinderGeometry(0.18, 0.22, 0.7 + (i + 1) * 0.22, 14), jpMat(['#ff7b89', '#ffd166', '#2ec4b6'][i + 1]), gp.x + i * 0.9, gp.y + 0.45, gp.z + 1.5)
          : jpMesh(new window.THREE.SphereGeometry(0.26, 14, 10), jpMat(['#ff9f43', '#2ec4b6', '#ffd166'][i + 1]), gp.x + i * 0.9, gp.y + 0.35, gp.z + 1.5);
        ctx.showtimeGroup.add(prop);
      }
      ctx.root.add(ctx.showtimeGroup);
    }

    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>' + titles[gid] + '</h3><span class="jp-pill" data-st-score>Score: 0</span></div>' +
      '<div class="jp-bar"><i data-st-bar style="width:100%"></i></div>' +
      '<div data-st-body style="text-align:center;font-weight:700;font-size:15px;padding:4px 0"></div>' +
      '<div class="jp-grid3" data-st-opts></div>' +
      '<div class="jp-row"><small data-st-time>20.0s left</small><button type="button" class="jp-btn" data-st-quit>Finish</button></div>'
    );
    if(!modal) return;

    function finish(){
      if(done) return;
      done = true;
      clearInterval(timer);
      if(ctx && ctx.showtimeGroup && ctx.root){ ctx.root.remove(ctx.showtimeGroup); jpDisposeObj(ctx.showtimeGroup); ctx.showtimeGroup = null; }
      var reward = Math.max(3, score * 3);
      jpShells(view, reward, 'showtime-' + gid);
      jpRollEffect(view, 12);
      jpCloseModal(view);
      jpShowBanner(view, titles[gid] + ' complete! +' + reward + ' 🐚');
    }

    function renderRound(){
      var item = prompts[round % prompts.length];
      var body = modal.querySelector('[data-st-body]');
      var opts = modal.querySelector('[data-st-opts]');
      if(!body || !opts) return;
      body.textContent = item.prompt || 'Match!';
      var labels = item.choices || item.labels || ['A', 'B', 'C'];
      var target = typeof item.answer === 'number' ? item.answer : (item.seq ? item.seq[0] : 0);
      opts.innerHTML = labels.map(function(lb, idx){
        return '<button type="button" class="jp-btn main" data-st-pick="' + idx + '">' + jpEsc(lb) + '</button>';
      }).join('');
      opts.dataset.target = String(target);
    }

    renderRound();
    var last = performance.now();
    var timer = setInterval(function(){
      if(!document.body.contains(modal)){ clearInterval(timer); return; }
      var now = performance.now();
      timeLeft = Math.max(0, timeLeft - (now - last) / 1000);
      last = now;
      var bar = modal.querySelector('[data-st-bar]');
      var tm = modal.querySelector('[data-st-time]');
      if(bar) bar.style.width = (timeLeft / 20 * 100).toFixed(1) + '%';
      if(tm) tm.textContent = timeLeft.toFixed(1) + 's left';
      if(timeLeft <= 0) finish();
    }, 100);

    modal.addEventListener('click', function(e){
      var pick = e.target.closest('[data-st-pick]');
      if(pick){
        var target = parseInt(modal.querySelector('[data-st-opts]').dataset.target, 10);
        if(parseInt(pick.dataset.stPick, 10) === target){
          score++;
          jpSound(function(){ Sound.bloop(1040, 0, 0.06); });
          modal.querySelector('[data-st-score]').textContent = 'Score: ' + score;
        } else {
          jpSound(function(){ Sound.bloop(320, 0, 0.05); });
        }
        round++;
        renderRound();
      } else if(e.target.closest('[data-st-quit]')){
        finish();
      }
    });
  }

  function jpStartClamShellGame(view){
    if(!view) return;
    var ctx = jpEnsureCtx(view);
    var winner = Math.floor(Math.random() * 3);
    var canPick = false;

    if(ctx && ctx.root && window.THREE && view.guide){
      if(ctx.clamGroup){ ctx.root.remove(ctx.clamGroup); jpDisposeObj(ctx.clamGroup); }
      ctx.clamGroup = new window.THREE.Group();
      var gp = view.guide.position;
      for(var i = 0; i < 3; i++){
        var clam = new window.THREE.Group();
        var bot = jpMesh(new window.THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), jpMat('#ffcad4'), 0, 0.16, 0);
        var top = jpMesh(new window.THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), jpMat('#f4acb7'), 0, 0.18, 0);
        clam.add(bot, top);
        if(i === winner){
          clam.add(jpMesh(new window.THREE.SphereGeometry(0.11, 12, 10), jpMat('#fff8d6', { emissive: '#ffd166', emissiveIntensity: 0.4 }), 0, 0.22, 0));
        }
        clam.position.set(gp.x + (i - 1) * 1.15, gp.y, gp.z + 1.7);
        clam.userData.slot = i;
        ctx.clamGroup.add(clam);
      }
      ctx.root.add(ctx.clamGroup);
      ctx.clamAnim = { t: 0, dur: jpCalm() ? 0.3 : 1.6 };
    }

    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>🦪 Giant-Clam Shell Game</h3><span class="jp-pill">Win a Pearl!</span></div>' +
      '<p data-clam-msg style="margin:2px 0;font-size:13px;text-align:center">Watch the golden pearl... shuffling clams!</p>' +
      '<div class="jp-grid3">' +
        '<button type="button" class="jp-btn main" data-clam="0" disabled>Left Clam</button>' +
        '<button type="button" class="jp-btn main" data-clam="1" disabled>Center Clam</button>' +
        '<button type="button" class="jp-btn main" data-clam="2" disabled>Right Clam</button>' +
      '</div>'
    );
    if(!modal) return;

    setTimeout(function(){
      if(!document.body.contains(modal)) return;
      canPick = true;
      var msg = modal.querySelector('[data-clam-msg]');
      if(msg) msg.textContent = 'Which giant clam hides the Golden Pearl?';
      modal.querySelectorAll('[data-clam]').forEach(function(b){ b.disabled = false; });
    }, jpCalm() ? 350 : 1650);

    modal.addEventListener('click', function(e){
      var btn = e.target.closest('[data-clam]');
      if(!btn || !canPick) return;
      canPick = false;
      var pick = parseInt(btn.dataset.clam, 10);
      if(ctx && ctx.clamGroup && ctx.root){ ctx.root.remove(ctx.clamGroup); jpDisposeObj(ctx.clamGroup); ctx.clamGroup = null; }
      jpCloseModal(view);
      if(pick === winner){
        if(typeof reefBoard === 'function'){ reefBoard().pearls = (reefBoard().pearls || 0) + 1; jpSave(); }
        if(typeof reef3dHud === 'function') reef3dHud(view);
        jpRollEffect(view, 14);
        jpSound(function(){ Sound.sessionStart(); });
        jpShowBanner(view, '🦪 Jackpot! Found the bonus Golden Pearl (+1 🦪)!');
      } else {
        jpShells(view, 4, 'clam-consolation');
        jpShowBanner(view, '🐚 Close! Found 4 bonus Shells instead!');
      }
    });
  }

  /* ---- 5. Bubble-Current Shortcuts & 1.5s Scenic Rides ---- */
  function jpTriggerBubbleShortcut(view){
    if(!view || !view.spaces || !view.guide) return;
    var ctx = jpEnsureCtx(view);
    var sp = view.spaces;
    var cur = view.at || 0;
    var target = (cur + 4) % sp.length;
    var fromPos = view.guide.position.clone ? view.guide.position.clone() : { x: sp[cur].x, y: sp[cur].y || 0, z: sp[cur].z };
    var toSp = sp[target];

    if(ctx && ctx.root && window.THREE){
      if(ctx.tunnelGroup){ ctx.root.remove(ctx.tunnelGroup); jpDisposeObj(ctx.tunnelGroup); }
      ctx.tunnelGroup = new window.THREE.Group();
      for(var i = 0; i < 6; i++){
        var f = i / 5;
        var ring = jpMesh(
          new window.THREE.TorusGeometry(0.72, 0.045, 8, 24),
          jpMat('#7ef5e8', { transparent: true, opacity: 0.65, emissive: '#2ec4b6', emissiveIntensity: 0.4 }),
          fromPos.x + (toSp.x - fromPos.x) * f,
          (fromPos.y || 0) + 0.55 + Math.sin(f * Math.PI) * 0.6,
          fromPos.z + (toSp.z - fromPos.z) * f
        );
        ctx.tunnelGroup.add(ring);
      }
      ctx.root.add(ctx.tunnelGroup);
    }

    jpSound(function(){ Sound.bloop(980, 0, 0.12); });
    jpShowBanner(view, '🫧 Sunken Bubble-Current Shortcut! +4 spaces');

    if(jpCalm()){
      view.at = target;
      view.guide.position.set(toSp.x, toSp.y || 0, toSp.z);
      if(typeof reef3dSavePosition === 'function') reef3dSavePosition(view, target);
      setTimeout(function(){
        if(ctx && ctx.tunnelGroup && ctx.root){ ctx.root.remove(ctx.tunnelGroup); jpDisposeObj(ctx.tunnelGroup); ctx.tunnelGroup = null; }
      }, 600);
      return;
    }
    ctx.shortcutAnim = {
      t: 0, dur: 1.25,
      from: fromPos,
      to: { x: toSp.x, y: toSp.y || 0, z: toSp.z },
      targetIdx: target
    };
  }

  function jpPlayScenicRide(view, toRegion, mode, onDone){
    var dest = toRegion || 'Next Island';
    var isSub = mode === 'subway';
    var ctx = jpEnsureCtx(view);
    jpShowBanner(view, (isSub ? '🚇 Coastal Subway' : '⛴️ Harbor Ferry') + ' → ' + dest, 1550);
    jpSound(function(){ Sound.bloop(isSub ? 520 : 640, 0, 0.1); });

    if(ctx && ctx.root && window.THREE && view.guide){
      if(ctx.rideGroup){ ctx.root.remove(ctx.rideGroup); jpDisposeObj(ctx.rideGroup); }
      ctx.rideGroup = new window.THREE.Group();
      var hull = jpMesh(
        new window.THREE.BoxGeometry(1.4, 0.35, 0.8),
        jpMat(isSub ? '#48cae4' : '#ff9f43'),
        0, 0.18, 0
      );
      var cabin = jpMesh(new window.THREE.BoxGeometry(0.8, 0.32, 0.62), jpMat('#fffdf6'), 0, 0.48, 0);
      ctx.rideGroup.add(hull, cabin);
      ctx.rideGroup.position.copy(view.guide.position);
      ctx.root.add(ctx.rideGroup);
      ctx.rideAnim = { t: 0, dur: 1.5, startX: view.guide.position.x, calm: jpCalm() };
    }

    setTimeout(function(){
      if(ctx && ctx.rideGroup && ctx.root){ ctx.root.remove(ctx.rideGroup); jpDisposeObj(ctx.rideGroup); ctx.rideGroup = null; }
      ctx.rideAnim = null;
      if(typeof onDone === 'function') onDone();
    }, 1500);
  }

  /* ---- 6. Kiko Co-Star Silent Hint Emotes & Earnable 3D Cosmetics ---- */
  function jpKikoHint(view, text){
    if(!view || !view.wrap) return;
    jpInjectStyles();
    var ctx = jpEnsureCtx(view);
    if(ctx.hintEl) ctx.hintEl.remove();
    clearTimeout(ctx.hintTimer);
    ctx.kikoEmoteUntil = performance.now() + 1800;

    var el = document.createElement('div');
    el.className = 'jp-kiko-hint';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span aria-hidden="true">🦀👓</span><span></span>';
    el.querySelector('span:last-child').textContent = text || 'Check the glowing space ahead!';
    el.addEventListener('click', function(){ el.remove(); if(ctx.hintEl === el) ctx.hintEl = null; });
    view.wrap.appendChild(el);
    ctx.hintEl = el;
    ctx.hintTimer = setTimeout(function(){
      if(ctx.hintEl === el){ el.remove(); ctx.hintEl = null; }
    }, 4200);
  }

  function jpBuildCosmeticHat(id){
    var THREE = window.THREE;
    if(!THREE) return null;
    var g = new THREE.Group();
    if(id === 'captainCap'){
      g.add(jpMesh(new THREE.CylinderGeometry(0.22, 0.24, 0.14, 16), jpMat('#1d3557'), 0, 0.08, 0));
      g.add(jpMesh(new THREE.BoxGeometry(0.32, 0.04, 0.22), jpMat('#14213d'), 0, 0.02, 0.16));
      g.add(jpMesh(new THREE.SphereGeometry(0.05, 8, 6), jpMat('#ffd166'), 0, 0.1, 0.23));
    } else if(id === 'bistroBeret'){
      var dome = jpMesh(new THREE.SphereGeometry(0.24, 16, 10), jpMat('#e63946'), 0, 0.07, 0);
      dome.scale.set(1.15, 0.5, 1.15);
      g.add(dome);
      g.add(jpMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), jpMat('#6d2e46'), 0, 0.18, 0));
    } else if(id === 'flowerCrown'){
      var band = jpMesh(new THREE.TorusGeometry(0.23, 0.035, 8, 20), jpMat('#52b788'), 0, 0.03, 0);
      band.rotation.x = Math.PI / 2;
      g.add(band);
      for(var i = 0; i < 6; i++){
        var a = (i / 6) * Math.PI * 2;
        g.add(jpMesh(new THREE.SphereGeometry(0.065, 8, 6), jpMat(i % 2 ? '#ffb3c6' : '#ffe66d'), Math.cos(a) * 0.23, 0.06, Math.sin(a) * 0.23));
      }
    } else if(id === 'nacreShell'){
      var crest = jpMesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20), jpMat('#f8edeb', { emissive: '#bde0fe', emissiveIntensity: 0.35, metalness: 0.4 }), 0, 0.04, 0);
      crest.rotation.x = Math.PI / 2;
      g.add(crest);
    }
    return g;
  }

  function jpApplyCosmetics(view){
    if(!view || !window.THREE) return;
    var jp = jpState();
    var id = jp.cosmetic;
    var slot = view.guide && view.guide.userData && view.guide.userData.parts && view.guide.userData.parts.hat;
    if(!slot) return;
    while(slot.children.length){
      var old = slot.children[0];
      slot.remove(old);
      jpDisposeObj(old);
    }
    if(!id) return;
    var hat = jpBuildCosmeticHat(id);
    if(hat){
      var k = (slot.userData.size || 0.34) / 0.34 * 1.45;
      hat.scale.setScalar(k);
      slot.add(hat);
    }
  }

  /* ---- 7. Flash Events, Errands, Shell Camera, Home Island & Lantern Festival ---- */
  function jpTriggerFlashEvent(view){
    if(!view) return;
    var events = [
      { title: '✨ Golden Tide Market', msg: 'Bistro Rush bonus +6 Shells!', game: 'bistro' },
      { title: '🎵 Pier Busker Choir', msg: 'Echo Pipe Choir bonus!', game: 'echo' },
      { title: '🌊 Lantern Tide Surge', msg: 'Tide Scoop bonus!', game: 'tide' }
    ];
    var ev = events[Math.floor(Math.random() * events.length)];
    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>' + ev.title + '</h3><span class="jp-pill">Flash Event</span></div>' +
      '<p style="margin:4px 0;font-size:13px">' + ev.msg + '</p>' +
      '<div class="jp-row">' +
        '<button type="button" class="jp-btn main" data-fe-play>Play Showtime</button>' +
        '<button type="button" class="jp-btn good" data-fe-claim>Claim +6 🐚</button>' +
      '</div>'
    );
    if(!modal) return;
    modal.addEventListener('click', function(e){
      if(e.target.closest('[data-fe-play]')){ jpCloseModal(view); jpStartShowtime(view, ev.game); }
      else if(e.target.closest('[data-fe-claim]')){ jpCloseModal(view); jpShells(view, 6, 'flash-event'); jpRollEffect(view, 8); }
    });
  }

  function jpAttachParcel(view, show){
    var ctx = jpEnsureCtx(view);
    if(!ctx || !view || !view.guide || !window.THREE) return;
    if(ctx.parcelGroup){
      if(ctx.parcelGroup.parent) ctx.parcelGroup.parent.remove(ctx.parcelGroup);
      jpDisposeObj(ctx.parcelGroup);
      ctx.parcelGroup = null;
    }
    if(!show) return;
    var parcel = new window.THREE.Group();
    parcel.add(jpMesh(new window.THREE.BoxGeometry(0.28, 0.22, 0.28), jpMat('#f4a261'), 0, 0, 0));
    parcel.add(jpMesh(new window.THREE.BoxGeometry(0.3, 0.05, 0.08), jpMat('#e63946'), 0, 0, 0));
    parcel.position.set(0.45, 0.56, 0.1);
    view.guide.add(parcel);
    ctx.parcelGroup = parcel;
  }

  function jpAdvanceErrand(view, venueId){
    var jp = jpState();
    var er = jp.errand;
    if(!er.active){
      er.active = true;
      er.index = 0;
      jpAttachParcel(view, true);
      jpSave();
      jpShowBanner(view, '📦 Errand started! Deliver parcel to ' + er.stops[0]);
      return;
    }
    var expected = er.stops[er.index];
    if(!venueId || venueId === expected){
      er.index++;
      if(er.index >= er.stops.length){
        er.active = false;
        er.index = 0;
        jpAttachParcel(view, false);
        jpShells(view, 12, 'errand-complete');
        jpAddHeart('captain-bay', 1);
        jpSave();
        jpRollEffect(view, 14);
        jpShowBanner(view, '🎉 Errand complete! +12 🐚 & +1 ❤️ Friendship!');
      } else {
        jpSave();
        jpShowBanner(view, '📦 Stop cleared! Next stop: ' + er.stops[er.index]);
      }
    } else {
      jpKikoHint(view, 'This parcel goes to ' + expected + ' first!');
    }
  }

  function jpOpenShellCamera(view){
    if(!view) return;
    var jp = jpState();
    var stickers = (window.CulturePacks && typeof window.CulturePacks.getCameraStickers === 'function')
      ? window.CulturePacks.getCameraStickers()
      : JP_DEFAULT_STICKERS;
    if(!Array.isArray(stickers) || !stickers.length) stickers = JP_DEFAULT_STICKERS;
    var activeSticker = stickers[0];
    var snapUrl = '';
    try {
      if(view.renderer && view.renderer.domElement) snapUrl = view.renderer.domElement.toDataURL('image/png');
    } catch(e){}

    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>📸 Shell Camera</h3><span class="jp-pill">' + jp.photos.length + '/12 saved</span></div>' +
      '<div class="jp-cam-frame">' +
        (snapUrl ? '<img src="' + snapUrl + '" alt="Board snapshot">' : '<span style="color:#fff">3D Reef View</span>') +
        '<span class="jp-cam-sticker" data-cam-st>' + jpEsc(activeSticker) + '</span>' +
      '</div>' +
      '<div class="jp-grid3">' + stickers.slice(0, 6).map(function(s, i){
        return '<button type="button" class="jp-btn" data-st-i="' + i + '">' + jpEsc(s) + '</button>';
      }).join('') + '</div>' +
      '<div class="jp-row">' +
        '<button type="button" class="jp-btn main" data-cam-snap>Snap Photo</button>' +
        '<button type="button" class="jp-btn" data-cam-close>Close</button>' +
      '</div>'
    );
    if(!modal) return;
    modal.addEventListener('click', function(e){
      var sb = e.target.closest('[data-st-i]');
      if(sb){
        activeSticker = stickers[parseInt(sb.dataset.stI, 10)] || stickers[0];
        modal.querySelector('[data-cam-st]').textContent = activeSticker;
      } else if(e.target.closest('[data-cam-snap]')){
        jp.photos.unshift({ sticker: activeSticker, at: Date.now(), region: (view.region && view.region.id) || 'coral-cove' });
        if(jp.photos.length > 12) jp.photos.length = 12;
        jpSave();
        jpSound(function(){ Sound.tap(); });
        jpCloseModal(view);
        jpShowBanner(view, '📸 Photo saved with ' + activeSticker + '!');
      } else if(e.target.closest('[data-cam-close]')){
        jpCloseModal(view);
      }
    });
  }

  function jpSyncHomeIsland(view){
    var ctx = jpEnsureCtx(view);
    if(!ctx || !ctx.root || !window.THREE) return;
    if(ctx.homeGroup){ ctx.root.remove(ctx.homeGroup); jpDisposeObj(ctx.homeGroup); ctx.homeGroup = null; }
    var jp = jpState();
    if(!jp.homeItems.length) return;
    var sp0 = view.spaces && view.spaces[0];
    var bx = sp0 ? sp0.x - 2.4 : -2.4, by = sp0 ? (sp0.y || 0) : 0, bz = sp0 ? sp0.z - 1.8 : -1.8;
    ctx.homeGroup = new window.THREE.Group();
    jp.homeItems.forEach(function(id, idx){
      var meta = JP_ORNAMENTS.find(function(o){ return o.id === id; }) || JP_ORNAMENTS[0];
      var a = (idx / Math.max(1, jp.homeItems.length)) * Math.PI * 2;
      var ox = bx + Math.cos(a) * 1.15, oz = bz + Math.sin(a) * 1.15;
      var item = jpMesh(new window.THREE.CylinderGeometry(0.18, 0.24, 0.45, 10), jpMat(meta.color), ox, by + 0.225, oz);
      ctx.homeGroup.add(item);
    });
    ctx.root.add(ctx.homeGroup);
  }

  function jpOpenHomeDecorator(view){
    if(!view) return;
    var jp = jpState();
    function grid(){
      return JP_ORNAMENTS.map(function(o){
        var placed = jp.homeItems.indexOf(o.id) >= 0;
        return '<div class="jp-tile"><span class="jp-emoji">' + o.emoji + '</span><b>' + jpEsc(o.name) + '</b>' +
          '<button type="button" class="jp-btn ' + (placed ? 'good' : 'main') + '" data-home-tog="' + o.id + '">' + (placed ? 'Placed' : 'Place') + '</button></div>';
      }).join('');
    }
    var modal = jpShowModal(view,
      '<div class="jp-head"><h3>🏝️ Coral Cove Home Island</h3><span class="jp-pill">' + jp.homeItems.length + ' placed</span></div>' +
      '<div class="jp-grid3" data-home-grid>' + grid() + '</div>' +
      '<div class="jp-row"><small>Tap ornaments to decorate your 3D Coral Cove shore.</small><button type="button" class="jp-btn" data-home-close>Done</button></div>'
    );
    if(!modal) return;
    modal.addEventListener('click', function(e){
      var tog = e.target.closest('[data-home-tog]');
      if(tog){
        var id = tog.dataset.homeTog;
        var idx = jp.homeItems.indexOf(id);
        if(idx >= 0) jp.homeItems.splice(idx, 1);
        else jp.homeItems.push(id);
        jpSave();
        jpSyncHomeIsland(view);
        jpSound(function(){ Sound.tap(); });
        modal.querySelector('[data-home-grid]').innerHTML = grid();
      } else if(e.target.closest('[data-home-close]')){
        jpCloseModal(view);
      }
    });
  }

  function jpTriggerLanternFestival(view){
    if(!view) return;
    var ctx = jpEnsureCtx(view);
    if(ctx && ctx.root && window.THREE && view.guide){
      if(ctx.festivalGroup){ ctx.root.remove(ctx.festivalGroup); jpDisposeObj(ctx.festivalGroup); }
      ctx.festivalGroup = new window.THREE.Group();
      ctx.lanterns.length = 0;
      var gp = view.guide.position;
      var colors = ['#ffd166', '#ff8fa3', '#7ef5e8', '#cdb4db'];
      for(var i = 0; i < 12; i++){
        var a = (i / 12) * Math.PI * 2;
        var r = 1.8 + (i % 3) * 0.9;
        var lan = jpMesh(
          new window.THREE.CylinderGeometry(0.16, 0.14, 0.34, 10),
          jpMat(colors[i % colors.length], { emissive: colors[i % colors.length], emissiveIntensity: 0.65 }),
          gp.x + Math.cos(a) * r,
          (gp.y || 0) + 0.8 + (i % 4) * 0.35,
          gp.z + Math.sin(a) * r
        );
        lan.userData.baseY = lan.position.y;
        lan.userData.phase = i * 0.6;
        ctx.festivalGroup.add(lan);
        ctx.lanterns.push(lan);
      }
      ctx.root.add(ctx.festivalGroup);
    }
    jpRollEffect(view, 16);
    jpSound(function(){ Sound.sessionStart(); });
    jpShowBanner(view, '🏮 Archipelago Lantern Festival! Thank you for playing!', 4200);
  }

  /* ---- Lifecycle: attach, tick, dispose ---- */
  function jpAttach(view){
    if(!view) return;
    jpEnsureCtx(view);
    jpBuildCounterProps(view);
    jpApplyCosmetics(view);
    jpSyncHomeIsland(view);
    var jp = jpState();
    if(jp.errand && jp.errand.active) jpAttachParcel(view, true);
    if(jp.buddy && (jp.buddyTurns || 0) > 0){
      var ctx = view._jp;
      if(ctx && ctx.root && window.THREE && !ctx.buddyGroup){
        ctx.buddyGroup = jpBuildBuddyMesh(jp.buddy);
        if(ctx.buddyGroup) ctx.root.add(ctx.buddyGroup);
      }
    }
  }

  function jpTick(view, now, dt){
    var ctx = view && view._jp;
    if(!ctx) return;
    var calm = jpCalm();
    var t = (now || performance.now()) * 0.001;
    var step = Math.min(0.05, dt || 0.016);

    // Bob Bok's 3D counter items
    ctx.counterProps.forEach(function(p){
      if(!calm){
        p.rotation.y += step * 1.2;
        p.position.y = p.userData.baseY + Math.sin(t * 2.2 + p.userData.phase) * 0.04;
      }
    });

    // Update burst particles
    for(var i = ctx.particles.length - 1; i >= 0; i--){
      var pt = ctx.particles[i];
      pt.life += step;
      if(pt.life >= pt.maxLife){
        if(pt.mesh.parent) pt.mesh.parent.remove(pt.mesh);
        jpDisposeObj(pt.mesh);
        ctx.particles.splice(i, 1);
        continue;
      }
      pt.mesh.position.x += pt.vx * step;
      pt.mesh.position.y += pt.vy * step;
      pt.mesh.position.z += pt.vz * step;
      if(!calm) pt.vy -= 2.4 * step;
      if(pt.mesh.material) pt.mesh.material.opacity = Math.max(0, 1 - pt.life / pt.maxLife);
    }

    // Buddy trailing smoothly behind Kiko/Shelly
    if(ctx.buddyGroup){
      var leader = (view.crab && view.crab.position) || (view.guide && view.guide.position);
      if(leader){
        var tx = leader.x - 0.95, tz = leader.z - 0.85, ty = leader.y || 0;
        ctx.buddyGroup.position.x += (tx - ctx.buddyGroup.position.x) * Math.min(1, step * 5);
        ctx.buddyGroup.position.z += (tz - ctx.buddyGroup.position.z) * Math.min(1, step * 5);
        ctx.buddyGroup.position.y = ty + (calm ? 0 : Math.abs(Math.sin(t * 5)) * 0.06);
      }
    }

    // Kiko hint emote subtle bob
    if(view.crab && ctx.kikoEmoteUntil > (now || performance.now()) && !calm){
      view.crab.rotation.z = Math.sin(t * 14) * 0.12;
    } else if(view.crab){
      view.crab.rotation.z = 0;
    }

    // Bubble shortcut glide
    if(ctx.shortcutAnim && view.guide){
      var sa = ctx.shortcutAnim;
      sa.t += step;
      var u = Math.min(1, sa.t / sa.dur);
      view.guide.position.set(
        sa.from.x + (sa.to.x - sa.from.x) * u,
        (sa.from.y || 0) + (sa.to.y - (sa.from.y || 0)) * u + Math.sin(u * Math.PI) * 0.75,
        sa.from.z + (sa.to.z - sa.from.z) * u
      );
      if(u >= 1){
        view.at = sa.targetIdx;
        if(typeof reef3dSavePosition === 'function') reef3dSavePosition(view, sa.targetIdx);
        ctx.shortcutAnim = null;
        if(ctx.tunnelGroup && ctx.root){ ctx.root.remove(ctx.tunnelGroup); jpDisposeObj(ctx.tunnelGroup); ctx.tunnelGroup = null; }
      }
    }

    // Scenic ride glide
    if(ctx.rideAnim && ctx.rideGroup){
      var ra = ctx.rideAnim;
      ra.t += step;
      if(!ra.calm) ctx.rideGroup.position.x = ra.startX + (ra.t / ra.dur) * 3.5;
    }

    // Clam shuffle animation
    if(ctx.clamAnim && ctx.clamGroup){
      var ca = ctx.clamAnim;
      ca.t += step;
      if(!calm && ca.t < ca.dur){
        ctx.clamGroup.children.forEach(function(c, idx){
          c.position.x += Math.sin(t * 9 + idx * 2.1) * step * 1.4;
        });
      } else {
        ctx.clamAnim = null;
      }
    }

    // Floating festival lanterns
    ctx.lanterns.forEach(function(lan){
      lan.position.y = lan.userData.baseY + (calm ? 0.1 : Math.sin(t * 1.4 + lan.userData.phase) * 0.25 + (t % 4) * 0.15);
    });
  }

  function jpDispose(view){
    var ctx = view && view._jp;
    if(!ctx) return;
    jpCloseModal(view);
    if(ctx.hintEl) ctx.hintEl.remove();
    if(ctx.bannerEl) ctx.bannerEl.remove();
    clearTimeout(ctx.hintTimer);
    clearTimeout(ctx.bannerTimer);
    ctx.particles.forEach(function(pt){ jpDisposeObj(pt.mesh); });
    ctx.particles.length = 0;
    if(ctx.root){
      if(ctx.root.parent) ctx.root.parent.remove(ctx.root);
      jpDisposeObj(ctx.root);
    }
    ctx.disposables.forEach(jpDisposeObj);
    ctx.disposables.length = 0;
    view._jp = null;
  }

  window.JamboreePlay = {
    attach: jpAttach,
    tick: jpTick,
    openBokShop: jpOpenBokShop,
    useItem: jpUseItem,
    rollEffect: jpRollEffect,
    inviteBuddy: jpInviteBuddy,
    startShowtime: jpStartShowtime,
    startClamShellGame: jpStartClamShellGame,
    triggerBubbleShortcut: jpTriggerBubbleShortcut,
    playScenicRide: jpPlayScenicRide,
    kikoHint: jpKikoHint,
    applyCosmetics: jpApplyCosmetics,
    triggerFlashEvent: jpTriggerFlashEvent,
    advanceErrand: jpAdvanceErrand,
    openShellCamera: jpOpenShellCamera,
    openHomeDecorator: jpOpenHomeDecorator,
    triggerLanternFestival: jpTriggerLanternFestival,
    dispose: jpDispose,
    getBuddyPerk: function(){
      var jp = jpState();
      return (jp.buddy && (jp.buddyTurns || 0) > 0) ? JP_BUDDIES[jp.buddy] || null : null;
    }
  };
})();
