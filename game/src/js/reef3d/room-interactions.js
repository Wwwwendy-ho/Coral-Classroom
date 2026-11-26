  /* ==========================================================================
     Tactile Animal-Crossing-Style 3D Room Immersion (window.JamboreeRooms)
     ========================================================================== */
  (function(){
    var T = window.THREE;

    // Room-local (x, y, z) prop anchor coordinates aligned with encounter-interiors.js
    var VENUE_PROP_ANCHORS = {
      cafe: [
        { id: 'espresso_machine', pos: [-2.24, 1.06, -1.24], icon: '☕', word: '에스프레소 머신', gloss: 'Espresso machine', action: 'order' },
        { id: 'pastry_cloche',    pos: [-0.54, 0.92, -0.78], icon: '🥐', word: '크루아상', gloss: 'Pastry cloche', action: 'order' },
        { id: 'menu_board',       pos: [-1.26, 2.04, -2.76], icon: '📋', word: '메뉴판', gloss: 'Menu board', action: 'order' }
      ],
      restaurant: [
        { id: 'soup_pot',       pos: [-0.28, 0.96, -1.62], icon: '🍲', word: '찌개 냄비', gloss: 'Hot soup pot', action: 'order' },
        { id: 'specials_easel', pos: [ 1.64, 1.04, -1.42], icon: '🪧', word: '오늘의 메뉴', gloss: 'Specials easel', action: 'order' },
        { id: 'tea_cup',        pos: [-0.92, 0.88, -0.82], icon: '🍵', word: '따뜻한 차', gloss: 'Warm tea cup', action: 'order' }
      ],
      shop: [
        { id: 'pearl_stand',  pos: [-0.46, 0.96, -0.92], icon: '🦪', word: '진주 진열대', gloss: 'Pearl stand' },
        { id: 'gachapon',     pos: [ 1.44, 1.08, -1.04], icon: '🔮', word: '가챠폰', gloss: 'Capsule gachapon', action: 'gachapon' },
        { id: 'scarf_basket', pos: [-1.24, 0.72, -1.32], icon: '🧣', word: '스카프 바구니', gloss: 'Scarf basket' }
      ],
      taxi: [
        { id: 'fare_meter',     pos: [ 0.72, 0.96, -1.16], icon: '📟', word: '요금 미터기', gloss: 'Fare meter' },
        { id: 'route_map',      pos: [-0.22, 1.48, -2.52], icon: '🗺️', word: '노선도', gloss: 'City route map' },
        { id: 'steering_wheel', pos: [ 1.38, 0.92, -1.12], icon: '🛞', word: '운전대', gloss: 'Steering wheel' }
      ],
      subway: [
        { id: 'transit_map', pos: [ 0.42, 1.72, -2.64], icon: '🚇', word: '지하철 노선도', gloss: 'Subway transit map' },
        { id: 'turnstile',   pos: [-0.48, 0.98, -0.92], icon: '🎫', word: '개찰구', gloss: 'Ticket turnstile' },
        { id: 'clock',       pos: [ 1.88, 2.02, -2.62], icon: '🕒', word: '역 시계', gloss: 'Station clock' }
      ],
      hotel: [
        { id: 'desk_bell', pos: [-0.14, 0.94, -0.96], icon: '🛎️', word: '프런트 벨', gloss: 'Front desk bell' },
        { id: 'key_rack',  pos: [ 0.56, 1.66, -2.64], icon: '🔑', word: '열쇠 선반', gloss: 'Room key rack' },
        { id: 'luggage',   pos: [-1.88, 0.78, -1.26], icon: '🧳', word: '여행 가방', gloss: 'Luggage cart' }
      ],
      pharmacy: [
        { id: 'mortar_pestle',     pos: [ 0.22, 0.94, -0.96], icon: '🥣', word: '약사발과 공이', gloss: 'Mortar & pestle' },
        { id: 'herb_jar',          pos: [ 1.66, 1.18, -1.78], icon: '🌿', word: '약초 병', gloss: 'Herbal remedy jar' },
        { id: 'apothecary_drawer', pos: [ 0.88, 1.48, -2.54], icon: '🗄️', word: '약재 서랍', gloss: 'Apothecary drawer' }
      ],
      friend: [
        { id: 'teapot',          pos: [-0.18, 0.88, -0.78], icon: '🫖', word: '찻주전자', gloss: 'Porcelain teapot' },
        { id: 'promenade_bench', pos: [-1.42, 0.78, -1.68], icon: '🪑', word: '산책 벤치', gloss: 'Promenade bench' },
        { id: 'lantern',         pos: [ 0.36, 0.96, -0.82], icon: '🏮', word: '초롱불', gloss: 'Warm lantern' }
      ]
    };

    var ORDER_MENUS = {
      cafe: [
        { id: 'latte',     icon: '☕', word: '카페라떼',   romaja: 'ka-pe-ra-tte',    gloss: 'Cafe Latte',     color: 0xd9a066, shape: 'cup' },
        { id: 'americano', icon: '🧋', word: '아이스 아메리카노', romaja: 'a-i-seu a-me-ri-ka-no', gloss: 'Iced Americano', color: 0x4b2e1e, shape: 'tall' },
        { id: 'croissant', icon: '🥐', word: '크루아상',   romaja: 'keu-ru-a-sang',   gloss: 'Croissant',      color: 0xe3a857, shape: 'pastry' },
        { id: 'matcha',    icon: '🍵', word: '말차 라떼',  romaja: 'mal-cha ra-tte',  gloss: 'Matcha Latte',   color: 0x76b06b, shape: 'cup' }
      ],
      restaurant: [
        { id: 'bibimbap',    icon: '🍲', word: '비빔밥',   romaja: 'bi-bim-bap',      gloss: 'Bibimbap Bowl',  color: 0xd65b42, shape: 'bowl' },
        { id: 'tteokbokki',  icon: '🍢', word: '떡볶이',   romaja: 'tteok-bok-ki',    gloss: 'Tteokbokki',     color: 0xc9382b, shape: 'bowl' },
        { id: 'kimbap',      icon: '🍙', word: '김밥',     romaja: 'gim-bap',         gloss: 'Kimbap Roll',    color: 0x2f3640, shape: 'pastry' },
        { id: 'greentea',    icon: '🍵', word: '녹차',     romaja: 'nok-cha',         gloss: 'Green Tea',      color: 0x7fb86a, shape: 'cup' }
      ]
    };

    var GACHAPON_FIGURINES = [
      { id: 'golden_seahorse', icon: '🐡', name: 'Golden Seahorse', word: '황금 해마',   color: 0xf4c542 },
      { id: 'matcha_otter',    icon: '🦦', name: 'Matcha Otter',    word: '말차 수달',   color: 0x77b87d },
      { id: 'pearl_octopus',   icon: '🐙', name: 'Pearl Octopus',   word: '진주 문어',   color: 0xe87fa0 },
      { id: 'coral_crab',      icon: '🦀', name: 'Coral Crab',      word: '산호 꽃게',   color: 0xe8654a },
      { id: 'lantern_seal',    icon: '🦭', name: 'Lantern Seal',    word: '등불 물범',   color: 0x7cc6e8 },
      { id: 'starlight_squid', icon: '🦑', name: 'Starlight Squid', word: '별빛 오징어', color: 0xa98be8 }
    ];

    // ---- Safety & Environment Helpers ----
    function isCalm(){
      return typeof reefCalm === 'function' && !!reefCalm();
    }

    function isMuted(){
      if(typeof S !== 'undefined' && S && S.muted) return true;
      if(typeof Sound !== 'undefined' && Sound && typeof Sound.isEnabled === 'function' && !Sound.isEnabled()) return true;
      return false;
    }

    function safeSpeak(text){
      if(!text || isMuted()) return;
      if(typeof Speech !== 'undefined' && Speech && typeof Speech.speak === 'function'){
        try { Speech.speak(String(text)); } catch(_e){}
      }
    }

    function safeSound(fnName, arg){
      if(isMuted()) return;
      if(typeof Sound !== 'undefined' && Sound && typeof Sound[fnName] === 'function'){
        try { Sound[fnName](arg); } catch(_e){}
      }
    }

    function sanitizeText(v, maxLen){
      var s = v == null ? '' : String(v);
      s = s.replace(/[\u0000-\u001f\u007f]/g, '').trim();
      if(maxLen && s.length > maxLen) s = s.slice(0, maxLen);
      return s;
    }

    function ensureStyles(){
      if(typeof document === 'undefined' || document.getElementById('jr-room-styles')) return;
      var st = document.createElement('style');
      st.id = 'jr-room-styles';
      st.textContent = [
        '.jr-ui-layer{position:absolute;inset:0;pointer-events:none;z-index:28;overflow:hidden;font-family:inherit;}',
        '.jr-speech-bubble{position:absolute;transform:translate(-50%,-100%);max-width:min(270px,76vw);background:#fffdf7;color:#1e293b;border:2.5px solid #2b6cb0;border-radius:18px;padding:8px 13px;box-shadow:0 8px 22px rgba(15,23,42,.22);font-size:13px;line-height:1.35;font-weight:700;pointer-events:auto;transition:opacity .18s ease;opacity:0;}',
        '.jr-speech-bubble.is-open{opacity:1;}',
        '.jr-speech-bubble::after{content:"";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);border-width:9px 8px 0 8px;border-style:solid;border-color:#2b6cb0 transparent transparent transparent;}',
        '.jr-speech-bubble::before{content:"";position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);border-width:7px 6px 0 6px;border-style:solid;border-color:#fffdf7 transparent transparent transparent;z-index:1;}',
        '.jr-speech-speaker{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#2b6cb0;margin-bottom:2px;}',
        '.jr-prop-pill{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:rgba(15,23,42,.92);color:#f8fafc;border:1.5px solid rgba(255,214,120,.65);border-radius:999px;padding:7px 12px;box-shadow:0 10px 24px rgba(0,0,0,.32);pointer-events:auto;max-width:min(92vw,420px);white-space:nowrap;}',
        '.jr-prop-pill-icon{font-size:18px;line-height:1;}',
        '.jr-prop-pill-text{display:flex;flex-direction:column;min-width:0;}',
        '.jr-prop-pill-word{font-size:13px;font-weight:800;color:#fde68a;overflow:hidden;text-overflow:ellipsis;}',
        '.jr-prop-pill-gloss{font-size:11px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;}',
        '.jr-pill-btn{border:none;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;background:#38bdf8;color:#0f172a;}',
        '.jr-pill-btn.is-gold{background:#fbbf24;color:#1e293b;}',
        '.jr-pill-btn.is-close{background:rgba(255,255,255,.16);color:#f8fafc;padding:5px 8px;}',
        '.jr-politeness-chip{position:absolute;top:12px;left:50%;transform:translateX(-50%);padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;box-shadow:0 6px 18px rgba(0,0,0,.22);pointer-events:none;white-space:nowrap;}',
        '.jr-politeness-chip.is-polite{background:#fef3c7;color:#92400e;border:1.5px solid #f59e0b;}',
        '.jr-politeness-chip.is-casual{background:#e0f2fe;color:#075985;border:1.5px solid #38bdf8;}',
        '.jr-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:10px;pointer-events:auto;z-index:35;}',
        '.jr-modal{width:min(380px,94vw);max-height:92vh;background:#fffdf8;color:#1e293b;border-radius:18px;border:2px solid #cbd5e1;box-shadow:0 18px 40px rgba(15,23,42,.35);padding:12px 14px;display:flex;flex-direction:column;gap:8px;overflow:hidden;}',
        '.jr-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
        '.jr-modal-title{margin:0;font-size:15px;font-weight:900;color:#0f172a;}',
        '.jr-modal-sub{margin:0;font-size:11.5px;color:#475569;}',
        '.jr-modal-close{border:none;background:#e2e8f0;color:#334155;border-radius:999px;width:26px;height:26px;font-weight:900;cursor:pointer;line-height:1;}',
        '.jr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}',
        '.jr-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
        '.jr-item-btn{display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:12px;border:1.5px solid #cbd5e1;background:#ffffff;cursor:pointer;text-align:left;transition:transform .1s ease,border-color .15s ease;}',
        '.jr-item-btn.is-picked{border-color:#0ea5e9;background:#e0f2fe;}',
        '.jr-item-ico{font-size:18px;line-height:1;flex:0 0 auto;}',
        '.jr-item-meta{display:flex;flex-direction:column;min-width:0;}',
        '.jr-item-word{font-size:12px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.jr-item-gloss{font-size:10.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.jr-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:7px;flex-wrap:wrap;}',
        '.jr-btn{border:none;border-radius:10px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;background:#e2e8f0;color:#1e293b;}',
        '.jr-btn.is-primary{background:#0284c7;color:#ffffff;}',
        '.jr-btn.is-gold{background:#f59e0b;color:#ffffff;}',
        '.jr-gacha-slot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:#f8fafc;border:1.5px solid #e2e8f0;}',
        '.jr-badge-card{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 4px;border-radius:10px;border:1.5px solid #e2e8f0;background:#f8fafc;text-align:center;opacity:.45;}',
        '.jr-badge-card.is-owned{opacity:1;border-color:#fbbf24;background:#fffbeb;}',
        '.jr-badge-ico{font-size:17px;line-height:1.1;}',
        '.jr-badge-name{font-size:9.5px;font-weight:800;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}'
      ].join('\n');
      document.head.appendChild(st);
    }

    // ---- WorldState & CulturePacks Adapters (with safe fallbacks) ----
    function getPropDefinitions(kind){
      var base = VENUE_PROP_ANCHORS[kind] || VENUE_PROP_ANCHORS.cafe;
      var packProps = null;
      if(window.CulturePacks && typeof window.CulturePacks.getRoomProps === 'function'){
        try { packProps = window.CulturePacks.getRoomProps(kind); } catch(_e){ packProps = null; }
      }
      var byId = {};
      if(Array.isArray(packProps)){
        for(var i = 0; i < packProps.length; i++){
          var p = packProps[i];
          if(p && p.id) byId[String(p.id)] = p;
        }
      }
      return base.map(function(def){
        var over = byId[def.id];
        return {
          id: def.id,
          pos: def.pos,
          icon: sanitizeText((over && over.icon) || def.icon, 4) || '✨',
          word: sanitizeText((over && (over.word || over.label || over.ko)) || def.word, 40),
          gloss: sanitizeText((over && (over.gloss || over.en)) || def.gloss, 48),
          action: def.action || (over && over.action) || null
        };
      });
    }

    function getPearlsBalance(){
      if(window.WorldState && typeof window.WorldState.getPearls === 'function'){
        try { return Math.max(0, Number(window.WorldState.getPearls()) || 0); } catch(_e){}
      }
      if(typeof S !== 'undefined' && S && S.profile && typeof S.profile.pearls === 'number'){
        return Math.max(0, S.profile.pearls);
      }
      return 3;
    }

    function spendPearl(){
      if(window.WorldState && typeof window.WorldState.spendPearls === 'function'){
        try { return !!window.WorldState.spendPearls(1); } catch(_e){}
      }
      if(typeof S !== 'undefined' && S && S.profile && typeof S.profile.pearls === 'number'){
        if(S.profile.pearls > 0){ S.profile.pearls -= 1; return true; }
      }
      return true; // Demo fallback when WorldState is absent
    }

    function getOwnedCollectibles(){
      var list = [];
      if(window.WorldState && typeof window.WorldState.getCollectibles === 'function'){
        try { list = window.WorldState.getCollectibles() || []; } catch(_e){ list = []; }
      } else if(typeof S !== 'undefined' && S && S.profile && Array.isArray(S.profile.collectibles)){
        list = S.profile.collectibles;
      }
      var map = {};
      if(Array.isArray(list)){
        for(var i = 0; i < Math.min(list.length, 64); i++){
          map[sanitizeText(list[i], 40)] = true;
        }
      }
      return map;
    }

    function awardCollectible(id){
      var safeId = sanitizeText(id, 40);
      if(!safeId) return;
      if(window.WorldState && typeof window.WorldState.addCollectible === 'function'){
        try { window.WorldState.addCollectible(safeId); return; } catch(_e){}
      }
      if(typeof S !== 'undefined' && S && S.profile){
        if(!Array.isArray(S.profile.collectibles)) S.profile.collectibles = [];
        if(S.profile.collectibles.indexOf(safeId) < 0 && S.profile.collectibles.length < 64){
          S.profile.collectibles.push(safeId);
        }
      }
    }

    // ---- State Management per View ----
    function getState(view){
      return view && view._jamboreeRoom ? view._jamboreeRoom : null;
    }

    function trackDisposable(st, obj){
      if(st && obj) st.disposables.push(obj);
      return obj;
    }

    function addTrackedMesh(st, parent, geo, mat){
      if(!T) return null;
      trackDisposable(st, geo);
      trackDisposable(st, mat);
      var m = new T.Mesh(geo, mat);
      if(parent) parent.add(m);
      return m;
    }

    function ensureUiLayer(view, st){
      if(st.uiLayer && st.uiLayer.parentNode) return st.uiLayer;
      if(!view || !view.wrap) return null;
      ensureStyles();
      var layer = document.createElement('div');
      layer.className = 'jr-ui-layer';
      view.wrap.appendChild(layer);
      st.uiLayer = layer;
      return layer;
    }

    function spawnSparkleBurst(st, worldPos, colorHex, count){
      if(!T || !st || !st.fxGroup || isCalm()) return;
      var n = count || 9;
      var geo = trackDisposable(st, new T.OctahedronGeometry(0.036, 0));
      for(var i = 0; i < n; i++){
        var mat = trackDisposable(st, new T.MeshBasicMaterial({
          color: i % 2 === 0 ? (colorHex || 0xfde047) : 0x67e8f9,
          transparent: true,
          opacity: 0.95
        }));
        var m = new T.Mesh(geo, mat);
        m.position.copy(worldPos);
        var ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        var spd = 0.65 + Math.random() * 0.55;
        st.fxGroup.add(m);
        st.particles.push({
          mesh: m,
          mat: mat,
          vx: Math.cos(ang) * spd,
          vy: 0.9 + Math.random() * 0.7,
          vz: Math.sin(ang) * spd,
          age: 0,
          life: 0.62
        });
      }
    }

    // ---- Public API: attachInterior ----
    function attachInterior(view, encounter){
      if(!view || !T) return false;
      dispose(view);
      var enc = encounter || view.encounter;
      if(!enc || !enc.interior || !enc.interior.room) return false;

      var room = enc.interior.room;
      var kind = enc.interior.kind || 'cafe';
      var st = {
        kind: kind,
        room: room,
        disposables: [],
        props: [],
        hitMeshes: [],
        particles: [],
        celebrations: [],
        politenessFx: null,
        swoop: null,
        trayGroup: null,
        gachaDrop: null,
        uiLayer: null,
        pillEl: null,
        pillTimer: null,
        bubbleEl: null,
        chipEl: null,
        chipTimer: null,
        modalEl: null,
        raycaster: new T.Raycaster(),
        ndc: new T.Vector2(),
        projVec: new T.Vector3(),
        propGroup: new T.Group(),
        fxGroup: new T.Group()
      };
      room.add(st.propGroup);
      room.add(st.fxGroup);
      view._jamboreeRoom = st;

      var defs = getPropDefinitions(kind);
      var hitGeo = trackDisposable(st, new T.SphereGeometry(0.24, 10, 8));
      var hitMat = trackDisposable(st, new T.MeshBasicMaterial({ visible: false }));
      var ringGeo = trackDisposable(st, new T.TorusGeometry(0.095, 0.014, 8, 18));
      var gemGeo = trackDisposable(st, new T.OctahedronGeometry(0.052, 0));

      for(var i = 0; i < defs.length; i++){
        var d = defs[i];
        var anchor = new T.Group();
        anchor.position.set(d.pos[0], d.pos[1], d.pos[2]);
        st.propGroup.add(anchor);

        var ringMat = trackDisposable(st, new T.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.72
        }));
        var ring = new T.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        anchor.add(ring);

        var gemMat = trackDisposable(st, new T.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.15
        }));
        var gem = new T.Mesh(gemGeo, gemMat);
        gem.position.y = 0.07;
        anchor.add(gem);

        var hit = new T.Mesh(hitGeo, hitMat);
        hit.userData.jrPropIndex = i;
        anchor.add(hit);

        st.hitMeshes.push(hit);
        st.props.push({
          def: d,
          group: anchor,
          ring: ring,
          gem: gem,
          baseY: d.pos[1],
          bounce: 0
        });
      }

      ensureUiLayer(view, st);
      return true;
    }

    // ---- Public API: swoopTransition (0.45s cubic ease, instant if reefCalm()) ----
    function swoopTransition(view, onReady){
      var st = getState(view);
      if(!view || !view.cam || !view.camPos || !view.camLook || isCalm() || !st){
        if(view && view.cam && view.camPos && view.camLook){
          view.cam.position.copy(view.camPos);
          view.cam.lookAt(view.camLook);
        }
        if(typeof onReady === 'function') onReady();
        return;
      }

      var endPos = view.camPos.clone();
      var endLook = view.camLook.clone();
      var dir = new T.Vector3().subVectors(endPos, endLook).normalize();
      var startPos = endPos.clone().addScaledVector(dir, 1.85);
      startPos.y += 0.55;
      var startLook = endLook.clone();
      startLook.y -= 0.18;

      view.cam.position.copy(startPos);
      view.cam.lookAt(startLook);
      view.camPin = true;

      st.swoop = {
        t: 0,
        dur: 0.45,
        startPos: startPos,
        endPos: endPos,
        startLook: startLook,
        endLook: endLook,
        onReady: typeof onReady === 'function' ? onReady : null
      };
    }

    // ---- Public API: onPointerDown ----
    function onPointerDown(view, clientX, clientY){
      var st = getState(view);
      if(!st || !view || !view.cam || !view.renderer || !view.renderer.domElement) return false;
      if(st.modalEl) return false;

      var rect = view.renderer.domElement.getBoundingClientRect();
      if(!rect.width || !rect.height) return false;
      st.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      st.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      st.raycaster.setFromCamera(st.ndc, view.cam);
      var hits = st.raycaster.intersectObjects(st.hitMeshes, false);
      if(!hits || !hits.length) return false;

      var idx = hits[0].object.userData.jrPropIndex;
      var prop = st.props[idx];
      if(!prop) return false;

      prop.bounce = 1.0;
      var wp = new T.Vector3();
      prop.group.getWorldPosition(wp);
      spawnSparkleBurst(st, wp, 0xfde047, 10);
      safeSound('bloop', 640);
      safeSpeak(prop.def.word);
      showPropPill(view, st, prop.def);
      return true;
    }

    function showPropPill(view, st, def){
      var layer = ensureUiLayer(view, st);
      if(!layer) return;
      if(st.pillEl && st.pillEl.parentNode) st.pillEl.parentNode.removeChild(st.pillEl);
      clearTimeout(st.pillTimer);

      var pill = document.createElement('div');
      pill.className = 'jr-prop-pill';

      var ico = document.createElement('span');
      ico.className = 'jr-prop-pill-icon';
      ico.textContent = def.icon;
      pill.appendChild(ico);

      var txt = document.createElement('div');
      txt.className = 'jr-prop-pill-text';
      var w = document.createElement('span');
      w.className = 'jr-prop-pill-word';
      w.textContent = def.word;
      var g = document.createElement('span');
      g.className = 'jr-prop-pill-gloss';
      g.textContent = def.gloss;
      txt.appendChild(w);
      txt.appendChild(g);
      pill.appendChild(txt);

      var hearBtn = document.createElement('button');
      hearBtn.type = 'button';
      hearBtn.className = 'jr-pill-btn';
      hearBtn.textContent = 'Hear';
      hearBtn.addEventListener('click', function(ev){
        ev.stopPropagation();
        safeSpeak(def.word);
      });
      pill.appendChild(hearBtn);

      if(def.action === 'order'){
        var ordBtn = document.createElement('button');
        ordBtn.type = 'button';
        ordBtn.className = 'jr-pill-btn is-gold';
        ordBtn.textContent = 'Order';
        ordBtn.addEventListener('click', function(ev){
          ev.stopPropagation();
          openOrderBuilder(view, st.kind);
        });
        pill.appendChild(ordBtn);
      } else if(def.action === 'gachapon'){
        var gacBtn = document.createElement('button');
        gacBtn.type = 'button';
        gacBtn.className = 'jr-pill-btn is-gold';
        gacBtn.textContent = 'Gacha';
        gacBtn.addEventListener('click', function(ev){
          ev.stopPropagation();
          openGachapon(view);
        });
        pill.appendChild(gacBtn);
      }

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'jr-pill-btn is-close';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(pill.parentNode) pill.parentNode.removeChild(pill);
        if(st.pillEl === pill) st.pillEl = null;
      });
      pill.appendChild(closeBtn);

      layer.appendChild(pill);
      st.pillEl = pill;
      st.pillTimer = setTimeout(function(){
        if(pill.parentNode) pill.parentNode.removeChild(pill);
        if(st.pillEl === pill) st.pillEl = null;
      }, 4500);
    }

    // ---- 3D-Anchored Jamboree Speech Bubbles ----
    function updateSpeechBubble(view, st){
      var enc = view && view.encounter;
      var text = enc && enc.bubbleText ? sanitizeText(enc.bubbleText, 180) : '';
      if(!text){
        if(st.bubbleEl) st.bubbleEl.classList.remove('is-open');
        return;
      }
      var layer = ensureUiLayer(view, st);
      if(!layer || !view.cam || !enc.actor) return;

      if(!st.bubbleEl){
        var b = document.createElement('div');
        b.className = 'jr-speech-bubble';
        var sp = document.createElement('span');
        sp.className = 'jr-speech-speaker';
        var body = document.createElement('span');
        body.className = 'jr-speech-body';
        b.appendChild(sp);
        b.appendChild(body);
        layer.appendChild(b);
        st.bubbleEl = b;
      }

      var speaker = sanitizeText(enc.bubbleSpeaker || '', 32);
      st.bubbleEl.querySelector('.jr-speech-speaker').textContent = speaker;
      st.bubbleEl.querySelector('.jr-speech-speaker').style.display = speaker ? 'block' : 'none';
      st.bubbleEl.querySelector('.jr-speech-body').textContent = text;
      st.bubbleEl.classList.add('is-open');

      var bounds = enc.actorBounds || (enc.actor.userData && enc.actor.userData.regionBounds);
      var headY = enc.actor.position.y + (bounds ? bounds.height * 0.92 : 1.15);
      st.projVec.set(enc.actor.position.x, headY, enc.actor.position.z);
      st.projVec.project(view.cam);

      var w = layer.clientWidth || 320;
      var h = layer.clientHeight || 240;
      var sx = (st.projVec.x * 0.5 + 0.5) * w;
      var sy = (-st.projVec.y * 0.5 + 0.5) * h - 10;
      sx = Math.max(96, Math.min(w - 96, sx));
      sy = Math.max(54, Math.min(h - 48, sy));
      st.bubbleEl.style.left = Math.round(sx) + 'px';
      st.bubbleEl.style.top = Math.round(sy) + 'px';
    }

    // ---- Public API: celebrate(view, kind) ----
    function celebrate(view, kind){
      var st = getState(view);
      if(!st || !T) return;
      var k = kind || st.kind || 'cafe';
      safeSound('correct');

      var center = new T.Vector3(0, 1.05, -1.1);
      if(view.encounter && view.encounter.actor){
        center.copy(view.encounter.actor.position);
        center.y += 1.0;
      }
      spawnSparkleBurst(st, center, 0xfbbf24, 14);

      if(isCalm()) return;

      if(k === 'cafe' || k === 'restaurant'){
        // Rising steam hearts / warm platter lift
        for(var i = 0; i < 4; i++){
          var heart = addTrackedMesh(
            st, st.fxGroup,
            new T.SphereGeometry(0.065, 10, 8),
            new T.MeshBasicMaterial({ color: i % 2 ? 0xfb7185 : 0xfde047, transparent: true, opacity: 0.9 })
          );
          heart.position.set(center.x + (i - 1.5) * 0.22, center.y - 0.2, center.z + 0.2);
          st.celebrations.push({ type: 'rise', mesh: heart, age: 0, life: 1.25, baseX: heart.position.x });
        }
      } else if(k === 'taxi' || k === 'subway'){
        // Headlight blink rings
        for(var j = 0; j < 2; j++){
          var beam = addTrackedMesh(
            st, st.fxGroup,
            new T.TorusGeometry(0.22, 0.03, 8, 20),
            new T.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 })
          );
          beam.position.set(center.x + (j === 0 ? -0.35 : 0.35), center.y, center.z + 0.35);
          st.celebrations.push({ type: 'pulse', mesh: beam, age: 0, life: 0.95 });
        }
      } else {
        // Bell bounce / golden fountain ring
        var aura = addTrackedMesh(
          st, st.fxGroup,
          new T.TorusGeometry(0.36, 0.035, 10, 24),
          new T.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 })
        );
        aura.rotation.x = Math.PI / 2;
        aura.position.set(center.x, center.y - 0.35, center.z);
        st.celebrations.push({ type: 'pulse', mesh: aura, age: 0, life: 1.0 });
      }
    }

    // ---- Public API: triggerPoliteness(view, registerKind) ----
    function triggerPoliteness(view, registerKind){
      var st = getState(view);
      if(!st || !T) return;
      var actor = view && view.encounter && view.encounter.actor;
      var layer = ensureUiLayer(view, st);

      if(st.politenessFx && st.politenessFx.mesh && st.politenessFx.mesh.parent){
        st.politenessFx.mesh.parent.remove(st.politenessFx.mesh);
      }
      st.politenessFx = null;

      if(layer){
        if(st.chipEl && st.chipEl.parentNode) st.chipEl.parentNode.removeChild(st.chipEl);
        clearTimeout(st.chipTimer);
        var chip = document.createElement('div');
        chip.className = 'jr-politeness-chip ' + (registerKind === 'casual_slip' ? 'is-casual' : 'is-polite');
        chip.textContent = registerKind === 'casual_slip'
          ? '💧 Casual slip! Try polite ~요 / ~세요'
          : '✨ Polite & warm! (~요 / ~세요)';
        layer.appendChild(chip);
        st.chipEl = chip;
        st.chipTimer = setTimeout(function(){
          if(chip.parentNode) chip.parentNode.removeChild(chip);
          if(st.chipEl === chip) st.chipEl = null;
        }, 2800);
      }

      if(!actor) return;
      if(registerKind === 'casual_slip'){
        safeSound('bloop', 340);
        var drop = addTrackedMesh(
          st, st.fxGroup,
          new T.ConeGeometry(0.06, 0.15, 10),
          new T.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.2 })
        );
        drop.position.set(actor.position.x + 0.32, actor.position.y + 1.15, actor.position.z + 0.18);
        st.politenessFx = {
          kind: 'casual_slip',
          mesh: drop,
          actor: actor,
          baseRotZ: actor.rotation.z,
          baseRotX: actor.rotation.x,
          age: 0,
          life: 1.1
        };
      } else {
        safeSound('correct');
        var halo = addTrackedMesh(
          st, st.fxGroup,
          new T.TorusGeometry(0.42, 0.032, 10, 26),
          new T.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 })
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.set(actor.position.x, actor.position.y + 0.55, actor.position.z);
        st.politenessFx = {
          kind: 'polite',
          mesh: halo,
          actor: actor,
          baseRotZ: actor.rotation.z,
          baseRotX: actor.rotation.x,
          age: 0,
          life: 1.1
        };
      }
    }

    // ---- 3D Order Tray Helper ----
    function syncOrderTray3D(st, pickedItems){
      if(!st || !T || !st.room) return;
      if(st.trayGroup && st.trayGroup.parent){
        st.trayGroup.parent.remove(st.trayGroup);
      }
      var tg = new T.Group();
      var tx = st.kind === 'restaurant' ? -0.15 : -1.05;
      var tz = st.kind === 'restaurant' ? -0.82 : -0.78;
      tg.position.set(tx, 0.59, tz);

      addTrackedMesh(
        st, tg,
        new T.BoxGeometry(0.68, 0.03, 0.42),
        new T.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.45 })
      );

      for(var i = 0; i < pickedItems.length; i++){
        var it = pickedItems[i];
        var ox = (i - (pickedItems.length - 1) * 0.5) * 0.16;
        var geo = it.shape === 'tall'
          ? new T.CylinderGeometry(0.042, 0.034, 0.14, 12)
          : it.shape === 'bowl'
            ? new T.CylinderGeometry(0.068, 0.044, 0.075, 14)
            : it.shape === 'pastry'
              ? new T.TorusGeometry(0.042, 0.018, 8, 12, Math.PI * 1.25)
              : new T.CylinderGeometry(0.048, 0.038, 0.085, 12);
        var mesh = addTrackedMesh(
          st, tg, geo,
          new T.MeshStandardMaterial({ color: it.color || 0xe2e8f0, roughness: 0.35 })
        );
        mesh.position.set(ox, it.shape === 'tall' ? 0.085 : 0.055, 0);
      }
      st.room.add(tg);
      st.trayGroup = tg;
    }

    // ---- Public API: openOrderBuilder(view, kind) ----
    function openOrderBuilder(view, kind){
      var st = getState(view);
      if(!st) return;
      var k = (kind === 'restaurant' || st.kind === 'restaurant') ? 'restaurant' : 'cafe';
      var items = ORDER_MENUS[k];
      var picked = {};
      var layer = ensureUiLayer(view, st);
      if(!layer) return;
      closeModal(st);

      var backdrop = document.createElement('div');
      backdrop.className = 'jr-modal-backdrop';
      var modal = document.createElement('div');
      modal.className = 'jr-modal';

      var head = document.createElement('div');
      head.className = 'jr-modal-head';
      var title = document.createElement('h3');
      title.className = 'jr-modal-title';
      title.textContent = k === 'restaurant' ? '🍲 Bistro Order Tray' : '☕ Cafe Order Tray';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'jr-modal-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function(){ closeModal(st); });
      head.appendChild(title);
      head.appendChild(closeBtn);
      modal.appendChild(head);

      var preview = document.createElement('p');
      preview.className = 'jr-modal-sub';
      modal.appendChild(preview);

      var grid = document.createElement('div');
      grid.className = 'jr-grid';
      modal.appendChild(grid);

      function getPickedList(){
        return items.filter(function(it){ return !!picked[it.id]; });
      }

      function buildPhrase(){
        var list = getPickedList();
        if(!list.length) return '메뉴를 골라 주세요 (Pick items for your tray)';
        return list.map(function(it){ return it.word; }).join(', ') + ' 주세요!';
      }

      function refresh(){
        var list = getPickedList();
        preview.textContent = buildPhrase();
        syncOrderTray3D(st, list);
        var btns = grid.querySelectorAll('.jr-item-btn');
        for(var bi = 0; bi < btns.length; bi++){
          var id = btns[bi].getAttribute('data-id');
          btns[bi].classList.toggle('is-picked', !!picked[id]);
        }
      }

      items.forEach(function(it){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'jr-item-btn';
        btn.setAttribute('data-id', it.id);
        var ico = document.createElement('span');
        ico.className = 'jr-item-ico';
        ico.textContent = it.icon;
        var meta = document.createElement('div');
        meta.className = 'jr-item-meta';
        var wd = document.createElement('span');
        wd.className = 'jr-item-word';
        wd.textContent = it.word;
        var gl = document.createElement('span');
        gl.className = 'jr-item-gloss';
        gl.textContent = it.gloss;
        meta.appendChild(wd);
        meta.appendChild(gl);
        btn.appendChild(ico);
        btn.appendChild(meta);
        btn.addEventListener('click', function(){
          picked[it.id] = !picked[it.id];
          safeSound('tap');
          if(picked[it.id]) safeSpeak(it.word);
          refresh();
        });
        grid.appendChild(btn);
      });

      var foot = document.createElement('div');
      foot.className = 'jr-modal-foot';

      var speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'jr-btn';
      speakBtn.textContent = '🔊 Speak Order';
      speakBtn.addEventListener('click', function(){
        var list = getPickedList();
        if(list.length) safeSpeak(buildPhrase());
      });

      var serveBtn = document.createElement('button');
      serveBtn.type = 'button';
      serveBtn.className = 'jr-btn is-primary';
      serveBtn.textContent = 'Serve Tray ✨';
      serveBtn.addEventListener('click', function(){
        var list = getPickedList();
        if(list.length) safeSpeak(buildPhrase());
        celebrate(view, k);
        triggerPoliteness(view, 'polite');
        closeModal(st);
      });

      foot.appendChild(speakBtn);
      foot.appendChild(serveBtn);
      modal.appendChild(foot);
      backdrop.appendChild(modal);
      layer.appendChild(backdrop);
      st.modalEl = backdrop;
      refresh();
    }

    // ---- Public API: openGachapon(view) ----
    function openGachapon(view){
      var st = getState(view);
      if(!st) return;
      var layer = ensureUiLayer(view, st);
      if(!layer) return;
      closeModal(st);

      var backdrop = document.createElement('div');
      backdrop.className = 'jr-modal-backdrop';
      var modal = document.createElement('div');
      modal.className = 'jr-modal';

      var head = document.createElement('div');
      head.className = 'jr-modal-head';
      var title = document.createElement('h3');
      title.className = 'jr-modal-title';
      title.textContent = '🔮 Shell Boutique Gachapon';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'jr-modal-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function(){ closeModal(st); });
      head.appendChild(title);
      head.appendChild(closeBtn);
      modal.appendChild(head);

      var slot = document.createElement('div');
      slot.className = 'jr-gacha-slot';
      var statusTxt = document.createElement('span');
      statusTxt.className = 'jr-modal-sub';
      var crankBtn = document.createElement('button');
      crankBtn.type = 'button';
      crankBtn.className = 'jr-btn is-gold';
      crankBtn.textContent = 'Crank (1 🫧)';
      slot.appendChild(statusTxt);
      slot.appendChild(crankBtn);
      modal.appendChild(slot);

      var shelf = document.createElement('div');
      shelf.className = 'jr-grid-3';
      modal.appendChild(shelf);

      function renderShelf(justWonId){
        var owned = getOwnedCollectibles();
        var pearls = getPearlsBalance();
        statusTxt.textContent = 'Pearls: ' + pearls + ' 🫧' + (justWonId ? ' · Unlocked!' : '');
        shelf.innerHTML = '';
        GACHAPON_FIGURINES.forEach(function(fig){
          var card = document.createElement('div');
          card.className = 'jr-badge-card' + (owned[fig.id] ? ' is-owned' : '');
          var ico = document.createElement('span');
          ico.className = 'jr-badge-ico';
          ico.textContent = fig.icon;
          var nm = document.createElement('span');
          nm.className = 'jr-badge-name';
          nm.textContent = fig.name;
          card.appendChild(ico);
          card.appendChild(nm);
          shelf.appendChild(card);
        });
      }

      crankBtn.addEventListener('click', function(){
        spendPearl();
        var owned = getOwnedCollectibles();
        var unowned = GACHAPON_FIGURINES.filter(function(f){ return !owned[f.id]; });
        var pool = unowned.length ? unowned : GACHAPON_FIGURINES;
        var prize = pool[Math.floor(Math.random() * pool.length)];
        awardCollectible(prize.id);
        safeSpeak(prize.word);
        celebrate(view, 'shop');

        if(T && st.fxGroup){
          if(st.gachaDrop && st.gachaDrop.parent) st.gachaDrop.parent.remove(st.gachaDrop);
          var cap = addTrackedMesh(
            st, st.fxGroup,
            new T.SphereGeometry(0.11, 14, 12),
            new T.MeshStandardMaterial({ color: prize.color, roughness: 0.25, metalness: 0.15 })
          );
          cap.position.set(1.44, 1.35, -1.04);
          st.gachaDrop = cap;
          st.celebrations.push({ type: 'drop', mesh: cap, age: 0, life: 0.7, startY: 1.35, endY: 0.72 });
        }
        renderShelf(prize.id);
      });

      backdrop.appendChild(modal);
      layer.appendChild(backdrop);
      st.modalEl = backdrop;
      renderShelf(null);
    }

    function closeModal(st){
      if(st && st.modalEl && st.modalEl.parentNode){
        st.modalEl.parentNode.removeChild(st.modalEl);
      }
      if(st) st.modalEl = null;
    }

    // ---- Public API: tick(view, now, dt) ----
    function tick(view, now, dt){
      var st = getState(view);
      if(!st) return;
      var step = Math.min(0.05, Math.max(0, dt || 0.016));
      var calm = isCalm();

      // 1. 0.45s Doorway Camera Swoop
      if(st.swoop && view.cam){
        var sw = st.swoop;
        sw.t += step;
        var u = Math.min(1, sw.t / sw.dur);
        var ease = 1 - Math.pow(1 - u, 3);
        view.cam.position.lerpVectors(sw.startPos, sw.endPos, ease);
        var lookNow = st.projVec.lerpVectors(sw.startLook, sw.endLook, ease);
        view.cam.lookAt(lookNow);
        if(u >= 1){
          view.camPin = false;
          var done = sw.onReady;
          st.swoop = null;
          if(done) done();
        }
      }

      // 2. Prop hotspot hover & click spring bounce
      var t = (now || 0) * 0.001;
      for(var i = 0; i < st.props.length; i++){
        var p = st.props[i];
        if(p.bounce > 0){
          p.bounce = Math.max(0, p.bounce - step * 2.8);
          var s = 1 + Math.sin(p.bounce * Math.PI) * 0.35;
          p.group.scale.setScalar(calm ? 1 : s);
          p.group.position.y = p.baseY + (calm ? 0 : Math.sin(p.bounce * Math.PI) * 0.12);
        } else {
          p.group.scale.setScalar(1);
          p.group.position.y = p.baseY + (calm ? 0 : Math.sin(t * 2.4 + i * 1.3) * 0.028);
        }
        if(!calm) p.gem.rotation.y += step * 1.4;
      }

      // 3. Sparkle burst particles
      for(var pi = st.particles.length - 1; pi >= 0; pi--){
        var pt = st.particles[pi];
        pt.age += step;
        if(pt.age >= pt.life){
          if(pt.mesh.parent) pt.mesh.parent.remove(pt.mesh);
          st.particles.splice(pi, 1);
          continue;
        }
        pt.mesh.position.x += pt.vx * step;
        pt.mesh.position.y += pt.vy * step;
        pt.mesh.position.z += pt.vz * step;
        pt.vy -= 2.2 * step;
        pt.mat.opacity = 1 - (pt.age / pt.life);
      }

      // 4. Celebration FX
      for(var ci = st.celebrations.length - 1; ci >= 0; ci--){
        var c = st.celebrations[ci];
        c.age += step;
        var k = Math.min(1, c.age / c.life);
        if(c.type === 'rise'){
          c.mesh.position.y += step * 0.72;
          c.mesh.position.x = c.baseX + Math.sin(c.age * 5) * 0.06;
          c.mesh.material.opacity = 1 - k;
        } else if(c.type === 'pulse'){
          c.mesh.scale.setScalar(1 + k * 1.4);
          c.mesh.material.opacity = 1 - k;
        } else if(c.type === 'drop'){
          c.mesh.position.y = c.startY + (c.endY - c.startY) * (1 - Math.pow(1 - k, 2));
        }
        if(k >= 1 && c.type !== 'drop'){
          if(c.mesh.parent) c.mesh.parent.remove(c.mesh);
          st.celebrations.splice(ci, 1);
        } else if(k >= 1 && c.type === 'drop'){
          st.celebrations.splice(ci, 1);
        }
      }

      // 5. Politeness FX
      if(st.politenessFx){
        var pf = st.politenessFx;
        pf.age += step;
        var pk = Math.min(1, pf.age / pf.life);
        if(!calm){
          if(pf.kind === 'casual_slip'){
            pf.actor.rotation.z = pf.baseRotZ + Math.sin(pk * Math.PI * 3) * 0.09 * (1 - pk);
            pf.mesh.position.y += step * 0.18;
          } else {
            pf.actor.rotation.x = pf.baseRotX + Math.sin(pk * Math.PI) * 0.12;
            pf.mesh.scale.setScalar(1 + pk * 0.65);
            pf.mesh.material.opacity = 1 - pk;
          }
        }
        if(pk >= 1){
          pf.actor.rotation.z = pf.baseRotZ;
          pf.actor.rotation.x = pf.baseRotX;
          if(pf.mesh.parent) pf.mesh.parent.remove(pf.mesh);
          st.politenessFx = null;
        }
      }

      // 6. 3D-Anchored Jamboree Speech Bubble
      updateSpeechBubble(view, st);
    }

    // ---- Public API: dispose(view) ----
    function dispose(view){
      var st = getState(view);
      if(!st) return;
      clearTimeout(st.pillTimer);
      clearTimeout(st.chipTimer);
      closeModal(st);
      if(st.uiLayer && st.uiLayer.parentNode){
        st.uiLayer.parentNode.removeChild(st.uiLayer);
      }
      if(st.propGroup && st.propGroup.parent) st.propGroup.parent.remove(st.propGroup);
      if(st.fxGroup && st.fxGroup.parent) st.fxGroup.parent.remove(st.fxGroup);
      if(st.trayGroup && st.trayGroup.parent) st.trayGroup.parent.remove(st.trayGroup);
      for(var i = 0; i < st.disposables.length; i++){
        var d = st.disposables[i];
        if(d && typeof d.dispose === 'function'){
          try { d.dispose(); } catch(_e){}
        }
      }
      if(view) view.camPin = false;
      delete view._jamboreeRoom;
    }

    window.JamboreeRooms = {
      attachInterior: attachInterior,
      tick: tick,
      onPointerDown: onPointerDown,
      celebrate: celebrate,
      triggerPoliteness: triggerPoliteness,
      openOrderBuilder: openOrderBuilder,
      openGachapon: openGachapon,
      swoopTransition: swoopTransition,
      dispose: dispose
    };
  })();
