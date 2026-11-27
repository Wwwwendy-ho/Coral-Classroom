  /* ---------- REEF 3D: a game board on the sea floor (a sunken ship at night). Shelly (Lumi at night)
     stands on a space; tapping a deck or a surprise space makes her hop along the path to it while the
     camera follows. The painted 2D reef stays underneath as the fallback when 3D can't run. ---------- */
  var REEF_THREE_URL = 'three.min.js';
  var R3 = { loading: null, failed: false, view: null };
  var reef3dLoadPerf = { causticBuilds: 0, causticMs: 0, modelCount: 0, modelFailures: 0, modelDecodeMs: 0, modelParseMs: 0, modelLoadMs: 0, boardBuilds: 0, boardBuildMs: 0 };
  window.__reef3dLoadPerf = function(){ return Object.assign({}, reef3dLoadPerf); };
  // The sand pattern is independent of the world. Keep its pixels, but give each view its own
  // texture so the lobby and board can scroll and repeat it independently.
  var reef3dCausticSource = null;
  function reef3dCausticTexture(xRepeat, yRepeat){
    var THREE = window.THREE;
    if(!reef3dCausticSource){
      var start = performance.now(), N = 128, half = N * .5, c = document.createElement('canvas'); c.width = c.height = N;
      var g = c.getContext('2d'), img = g.createImageData(N, N), data = img.data, rand = reefRand(1709);
      var px = new Float32Array(22), py = new Float32Array(22);
      for(var q = 0; q < 22; q++){ px[q] = rand() * N; py[q] = rand() * N; }
      for(var y = 0; y < N; y++){
        var row = y * N;
        for(var x = 0; x < N; x++){
          var d1 = 1e9, d2 = 1e9;
          for(var pi = 0; pi < 22; pi++){
            var dx = Math.abs(x - px[pi]); if(dx > half) dx = N - dx;
            var dy = Math.abs(y - py[pi]); if(dy > half) dy = N - dy;
            var d = dx * dx + dy * dy;
            if(d < d1){ d2 = d1; d1 = d; } else if(d < d2) d2 = d;
          }
          var e = Math.max(0, 1 - (Math.sqrt(d2) - Math.sqrt(d1)) / 5), val = Math.round(255 * e * e), o = (row + x) * 4;
          data[o] = data[o + 1] = data[o + 2] = val; data[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0); reef3dCausticSource = c;
      reef3dLoadPerf.causticBuilds++;
      reef3dLoadPerf.causticMs += performance.now() - start;
    }
    var t = new THREE.CanvasTexture(reef3dCausticSource);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(xRepeat, yRepeat); return t;
  }
  // Coral Cove keeps its established position in S. Each region has its own saved spot per profile.
  function reef3dPositionKey(region){ return 'cc-region-board-at-' + (S.profile && S.profile.id || '') + '-' + region.id; }
  function reef3dPosition(view){
    if(!view.region) return S.reef3dAt;
    try {
      var saved = localStorage.getItem(reef3dPositionKey(view.region));
      if(saved == null) return 0;
      if(/^\d+$/.test(saved)){
        var legacy = view.spaces.legacyPositions;
        return legacy ? legacy[+saved] || 0 : +saved;
      }
      var space = view.spaces.find(function(s){ return s.positionId === saved; });
      return space ? space.i : 0;
    } catch(e){ return 0; }
  }
  function reef3dSavePosition(view, i){
    if(!view.region){ S.reef3dAt = i; return; }
    var space = view.spaces[i];
    if(space) try { localStorage.setItem(reef3dPositionKey(view.region), space.positionId || String(i)); } catch(e){}
  }
  /* Auto quality. Each device is different and we can't test them all, so the board and lobby time their own frames
     and step down one level at a time while drawing runs slow, and back up again when there's room to spare.
     0: sharpest, 60 a second · 1: a little less sharp · 2: no light rays · 3: 30 a second
     UI text stays native resolution. The lower tiers can reduce the 3D canvas
     below CSS resolution on a large screen to respect their pixel budget. */
  var R3Q_KEY = 'cc-3dq4', R3Q_MAX = 3;
  var R3Q_BUDGET = [1.6e6, 1.05e6, .7e6, .45e6];
  var R3Q_TOUCH = (navigator.maxTouchPoints || 0) > 0;
  R3.qMin = R3Q_TOUCH ? 2 : 0;
  R3.q = (function(){ try { var n = parseInt(localStorage.getItem(R3Q_KEY), 10); return n >= 0 && n <= R3Q_MAX ? Math.max(R3.qMin, n) : R3.qMin; } catch(e){ return R3.qMin; } })();
  function reef3dQRatio(q, encounter, pressure){
    var dpr = devicePixelRatio || 1, css = Math.max(1, innerWidth * innerHeight);
    var budget = encounter ? [1.6e6, 1.3e6, 1e6, .65e6][q] : R3Q_BUDGET[q];
    if(encounter && pressure) budget=Math.min(budget,R3Q_BUDGET[R3Q_MAX]);
    return Math.min(dpr, encounter ? 1.75 : 1.5, Math.max(encounter ? .5 : q >= 2 ? .65 : 1, Math.sqrt(budget / css)));
  }
  function reef3dQEncounter(view, active){
    view.renderer.setPixelRatio(reef3dQRatio(R3.q,active,!!(view.encounter && view.encounter.pixelPressure)));
    view.w=0; view.qs=null;
  }
  function reef3dQApply(view){
    var q = R3.q, r = view.renderer;
    if(!R3.qualityProbed){
      R3.qualityProbed = true;
      var gl = r.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
      if(debug && /swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))){ R3.qMin = R3.q = q = 3; }
    }
    r.setPixelRatio(reef3dQRatio(q,!!view.encounter,!!(view.encounter && view.encounter.pixelPressure)));
    var sh = q < 2 && !view.baked;
    if(r.shadowMap.enabled !== sh){
      r.shadowMap.enabled = sh; r.shadowMap.needsUpdate = true;
      view.scene.traverse(function(o){ if(o.material) [].concat(o.material).forEach(function(m){ m.needsUpdate = true; }); });
    }
    (view.rayList || view.rays || []).forEach(function(rm){ rm.visible = q < 2; });
    view.every = q >= 3 ? 2 : 1; view.w = 0; view.qs = null; view.drawNext = null;
    if(view.post) view.post.on = q < 1 && reef3dPostWanted(q);
    reef3dShellyQuality(view);
  }
  function reef3dQSet(view, q, now){
    R3.q = q; try { localStorage.setItem(R3Q_KEY, String(q)); } catch(e){}
    reef3dQApply(view); view.qs = { n: 0, t0: now, last: now, hold: now + 1500 };
  }
  // Called on every drawn frame. Skips start-up, the moment after a change, and pauses (hidden tab, app switch).
  // Ordinary short stalls need two slow readings; a severe sustained slowdown
  // steps down sooner. Touch devices begin without the optional post passes.
  function reef3dQTick(view, now){
    try { if(localStorage.getItem('cc-3dq-lock')) return; } catch(e){}   // tests hold the level steady
    var s = view.qs || (view.qs = { n: 0, t0: now, last: now, hold: now + 2500, dropped: 0, gaps: [] });
    if(!s.gaps) s.gaps = [];
    if(s.dropped == null) s.dropped = 0;
    var gap = now - s.last; s.last = now;
    // Ignore covered transitions and theme rebuilds. A waiting die and ordinary
    // movement remain measurable, otherwise some boards never adapt at all.
    var busy = window.__reefTx || view.themeFx || view.themeIn;
    if(now < s.hold || gap > 1000 || busy){ s.n = 0; s.t0 = now; s.dropped = 0; s.gaps.length = 0; if(busy) s.hold = Math.max(s.hold, now + 1000); return; }
    s.n++;
    if(gap > 22) s.dropped++;
    s.gaps.push(gap);
    if(now - s.t0 < 2000) return;
    var span = now - s.t0, fps = s.n * 1000 / span, want = view.drawFps || (view.every === 2 ? 30 : 60);
    view.fps = Math.round(fps);
    if(fps < 55 && view.post && view.post.on) view.post.on = false;
    var sortedGaps = s.gaps.slice().sort(function(a, b){ return a - b; });
    var p95Ms = sortedGaps.length ? sortedGaps[Math.min(sortedGaps.length - 1, Math.floor(sortedGaps.length * 0.95))] : 0;
    try {
      var infoR = view.renderer && view.renderer.info ? view.renderer.info.render : null;
      window.__ccPerf = {
        fps: view.fps,
        avgMs: +(span / Math.max(1, s.n)).toFixed(2),
        p95Ms: +p95Ms.toFixed(2),
        dropped: s.dropped,
        calls: infoR ? infoR.calls : 0,
        tris: infoR ? infoR.triangles : 0,
        q: R3.q,
        dpr: +(view.renderer ? view.renderer.getPixelRatio() : 1).toFixed(2)
      };
    } catch(e){}
    s.n = 0; s.t0 = now; s.dropped = 0; s.gaps.length = 0;
    var R = R3.qRun || (R3.qRun = { slow: 0, fast: 0 });
    if(fps < want * .8){ R.fast = 0; R.slow++; if(R.slow >= 2 || fps < want * .5){
      if(R3.q < R3Q_MAX){
        R.slow = 0;
        if(R.upAt && now - R.upAt < 15000) R3.qMin = R3.q + 1;   // just stepped up and it's slow again: stay at the lower level this visit
        reef3dQSet(view, R3.q + 1, now);
      } else if(view.encounter && !view.encounter.pixelPressure){
        R.slow=0; view.encounter.pixelPressure=true; reef3dQEncounter(view,true);
      }
    } }
    else if(fps > want * .95){ R.slow = 0; if(++R.fast >= 4 && R3.q > (R3.qMin || 0) && !R3Q_TOUCH){ R.fast = 0; R.upAt = now; reef3dQSet(view, R3.q - 1, now); } }
    else R.slow = R.fast = 0;
  }
  // For checking performance: how many draws and triangles the board's last frame took.
  window.__reef3dScene = function(){   // test helper: what the board draws, biggest first
    var v = R3.view; if(!v) return null; var rows = [];
    v.scene.traverse(function(o){
      if(!o.isMesh && !o.isPoints) return; var g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      var inst = o.isInstancedMesh ? o.count : 1, mats = [].concat(o.material);
      var vis = true; for(var q = o; q; q = q.parent) if(!q.visible) vis = false;
      rows.push({ name: (o.name || o.parent && o.parent.name || '').slice(0, 18), tris: Math.round(n * inst), inst: inst, mat: mats.map(function(m){ return m.type.replace('Mesh', '').replace('Material', '') + (m.transparent ? '*' : ''); }).join(','), cast: o.castShadow, recv: o.receiveShadow, vis: vis, size: [o.scale.x].map(function(x){ return +x.toFixed(2); })[0] });
    });
    rows.sort(function(a, b){ return b.tris - a.tris; }); return rows;
  };
  window.__reef3dBench = function(n){   // test helper: milliseconds per frame, waiting for the GPU each time
    var v = R3.view; if(!v) return null; var gl = v.renderer.getContext(), px = new Uint8Array(4), t0, i, out = {};
    v.renderer.render(v.scene, v.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    t0 = performance.now(); for(i = 0; i < n; i++){ v.renderer.render(v.scene, v.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } out.still = +((performance.now() - t0) / n).toFixed(1);
    if(v.renderer.shadowMap.enabled){ t0 = performance.now(); for(i = 0; i < n; i++){ v.renderer.shadowMap.needsUpdate = true; v.renderer.render(v.scene, v.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } out.moving = +((performance.now() - t0) / n).toFixed(1); }
    else out.moving = out.still;
    if(v.post && v.post.on){ t0 = performance.now(); for(i = 0; i < n; i++){ v.post.render(v.scene, v.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } out.look = +((performance.now() - t0) / n).toFixed(1); }   // with the look (post.js)
    out.calls = v.renderer.info.render.calls; out.tris = v.renderer.info.render.triangles; out.programs = v.renderer.info.programs.length;
    return out;
  };
  window.__reef3dView = function(){ return R3.view; };
  window.__reef3dThemeAt = function(p){ var v = R3.view; if(!v) return; if(!v.themeFx) reef3dThemeShow(v, true); v.themeFx.hold = p; };   // test helper
  window.__reef3dGo = function(i){ if(R3.view) reef3dGoTo(R3.view, i); };   // test helper
  window.__reef3dTravel = function(i){ var v = R3.view; if(v && v.spaces[i]) reef3dTravel(v, i, function(){}); };   // test helper: route without opening a lesson or awarding anything
  window.__reef3dDice = function(){ if(R3.view) reef3dDice(R3.view); };   // test helper
  window.__reefBoard = function(){ return reefBoard(); };   // test helper
  window.__reef3dPlace = function(i){ if(R3.view){ reef3dPlace(R3.view, i); R3.view.touchAt = performance.now(); } };   // test helper: put her on a space, no deck
  window.__reef3dCamPin = function(p, l){ var v = R3.view, T = window.THREE; if(v) v.camPin = p ? [new T.Vector3().fromArray(p), new T.Vector3().fromArray(l)] : null; };   // test helper
  window.__reef3dCelebrate = function(){ if(R3.view) reef3dCelebrate(R3.view); };   // test helper
  window.__reef3dEmote = function(n){ if(R3.view) reef3dEmote(R3.view, n); return R3.view && R3.view.emote && R3.view.emote.name; };   // test helper   // test helper
  window.__reef3dInfo = function(){ var v = R3.view; return v ? { calls: v.renderer.info.render.calls, triangles: v.renderer.info.render.triangles, tier: R3.q, fps: v.fps } : { tier: R3.q }; };
  function reef3dLoad(){
    if(window.THREE) return Promise.resolve(window.THREE);
    if(R3.failed) return Promise.reject(new Error('3D unavailable'));
    if(!R3.loading) R3.loading = new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = REEF_THREE_URL; s.async = true;
      s.onload = function(){ window.THREE ? res(window.THREE) : rej(new Error('three.js did not load')); };
      s.onerror = function(){ rej(new Error('three.js did not load')); };
      document.head.appendChild(s);
    }).catch(function(e){ R3.failed = true; R3.loading = null; throw e; });
    return R3.loading;
  }

  // Board spaces in order: per subject a run of decks with a plain and a surprise space between
  // each pair; the Treasure Reef and Story Bottle close the path.
  function reef3dSpaces(zones, region){
    var list = [{ kind: 'start' }];
    if(region){
      // Construct the original stops and party features before inserting the new tiles.
      // This also reconstructs the routes used by older numeric position saves.
      var stops = [];
      zones.forEach(function(z){ z.items.forEach(function(it, i){ stops.push({ kind: 'deck', item: it, zone: z, first: i === 0 }); }); });
      var targetMain = Math.max(23, Math.min(33, stops.length + 16));
      var spare = Math.max(0, targetMain - 1 - stops.length), placed = 0;
      var caveSpread = !!(region && (region.id === 'caves' || region.id === 'captain') && stops.length === 3 && spare === 19);
      function isSpareSurprise(p){
        if(caveSpread){
          if(p === 7 || p === 16) return false;
          if(p === 8 || p === 15) return true;
        }
        return p % 3 === 1;
      }
      stops.forEach(function(stop, i){
        var before = Math.floor((i + 1) * spare / (stops.length + 1)) - Math.floor(i * spare / (stops.length + 1));
        for(var j = 0; j < before; j++){ placed++; list.push({ kind: isSpareSurprise(placed) ? 'surprise' : 'plain' }); }
        list.push(stop);
      });
      while(placed < spare){ placed++; list.push({ kind: isSpareSurprise(placed) ? 'surprise' : 'plain' }); }
    } else {
      zones.forEach(function(z, zi){
        z.items.forEach(function(it, i){
          list.push({ kind: 'plain' });
          if(i > 0 || zi > 0) list.push({ kind: 'surprise' });
          list.push({ kind: 'deck', item: it, zone: z, first: i === 0 });
        });
      });
      list.push({ kind: 'plain' }, { kind: 'surprise' }, { kind: 'plain' });
    }
    // Night: halfway along, the path winds down a broken spiral staircase into the ship's hold (see reef3dWreckDeck).
    // Three stair spaces go in after a deck near the middle; everything after them is on the lower deck.
    var night = reefNight() && !region, REEF3D_HOLD = 6, k0 = -1;
    if(night && list.length > 10){
      for(var q = Math.round(list.length * .5); q < list.length - 4; q++) if(list[q].kind === 'deck'){ k0 = q; break; }
      if(k0 > 0) list.splice(k0 + 1, 0, { kind: 'plain', stair: 1 }, { kind: 'plain', stair: 2 }, { kind: 'plain', stair: 3 });
    }
    var amp = innerWidth < 640 ? .5 : 1; // a narrower board on phones so the path stays on screen
    list.forEach(function(s, i){
      s.i = i;
      s.x = (Math.sin(i * .42) * 4.2 + Math.sin(i * .13) * 1.6) * amp;
      s.z = -i * 2.6; s.y = 0;
      s.links = [];
      if(i > 0){ s.links.push(i - 1); list[i - 1].links.push(i); }
    });
    if(k0 > 0){
      var top = list[k0], cx = top.x, cz = top.z - 2.6, rad = 2.6;
      list.stair = { cx: cx, cz: cz, rad: rad, low: -REEF3D_HOLD, k0: k0 };
      for(var j = 1; j <= 3; j++){ var th = (90 + j * 60) * Math.PI / 180, st = list[k0 + j]; st.x = cx + Math.cos(th) * rad; st.z = cz + Math.sin(th) * rad; st.y = -REEF3D_HOLD * j / 4; }
      for(var after = k0 + 4; after < list.length; after++){ list[after].z += 2.6 + 2.6; list[after].y = -REEF3D_HOLD; }   // the hold carries on from the foot of the stairs
    }
    if(night){
      // How the wreck has settled: it lists well over to one side (roll, per unit across), that side sunk deeper into
      // the sand. (pitch, per unit along, could nose the bow down too; Wendy chose the sideways list, so it's 0.)
      var ship = list.ship = { half: Math.max.apply(null, list.map(function(s){ return Math.abs(s.x); })) + 4.5, roll: .16, pitch: 0, sand: -3.35 };
      list.forEach(function(s){ s.y += s.x * ship.roll + s.z * ship.pitch; });
    }
    // Party spaces: a hermit crab's shop, a pair of whirlpools, Chance Time on every third surprise, and a clam
    // gate between two spaces that opens and closes every turn (see reef3dParty*).
    var plains = list.filter(function(s){ return s.kind === 'plain' && !s.stair && s.i > 1 && s.i < list.length - 2; });
    function takePlain(f){ if(!plains.length) return null; var k = Math.min(plains.length - 1, Math.round(f * (plains.length - 1))); return plains.splice(k, 1)[0]; }
    var shop = takePlain(.18); if(shop) shop.kind = 'shop';
    if(plains.length >= 5){ var w1 = takePlain(.25), w2 = takePlain(.8); if(w1 && w2){ w1.kind = w2.kind = 'whirl'; w1.pair = w2.i; w2.pair = w1.i; } }
    list.filter(function(s){ return s.kind === 'surprise'; }).forEach(function(s, k){ if(k % 3 === 1) s.kind = 'chance'; });
    list.gateAt = list.length > 12 ? Math.round(list.length * .58) : -1;
    if(list.stair && list.gateAt >= k0 - 1 && list.gateAt <= k0 + 4) list.gateAt = k0 + 5 < list.length - 1 ? k0 + 5 : -1;   // never across the stairs
    // Side branches (like a Mario Party fork): the Treasure Reef and the Story Bottle sit at the end of their own
    // short paths off the main one. A fork is a plain space; the branch curls out to the open side and dead-ends.
    var mainN = list.length;
    function forkNear(f){
      for(var d = 0; d < mainN; d++){ var k = [Math.round(mainN * f) + d, Math.round(mainN * f) - d];
        for(var j = 0; j < 2; j++){ var c = list[k[j]]; if(c && c.kind === 'plain' && !c.stair && c.i > 1 && c.i < mainN - 1 && !c.fork) return c; } }
      return list[mainN - 1];
    }
    [{ name: 'treasure', at: .42, kinds: ['plain', 'surprise', 'plain', 'treasure'] },
     { name: 'story', at: .78, kinds: ['plain', 'surprise', 'story'] }].forEach(function(br){
      var j = forkNear(br.at), side = j.x >= 0 ? 1 : -1, prev = j, step = innerWidth < 640 ? 2 : 2.4, sandN = 0;
      j.fork = br.name;
      br.kinds.forEach(function(kind, k){
        var s = { kind: kind, i: list.length, branch: br.name, jn: j.i, links: [prev.i], end: k === br.kinds.length - 1, y: j.y };
        s.x = j.x + side * step * (k + 1); s.z = j.z - .7 * (k + 1) + Math.sin(k * 1.3) * .5;
        if(list.ship && list.stair && j.i > list.stair.k0){   // from the hold the hull walls are too high to climb: the branch runs along the wall inside
          var lim = list.ship.half - 2;
          s.x = side * Math.min(lim, Math.abs(j.x) + step); s.z = j.z - .6 - step * .95 * k; s.y = j.y + (s.x - j.x) * list.ship.roll + (s.z - j.z) * list.ship.pitch;
        } else if(list.ship){   // at night a branch steps off the wreck, down a plank, onto the sand outside
          var sh = list.ship, ax = Math.abs(s.x);
          if(ax > sh.half - .6){ s.x = side * Math.max(ax, sh.half + 1.7 + step * sandN); sandN++; s.y = sh.sand; }   // each space on the sand a full step further out
          else s.y = j.y + (s.x - j.x) * sh.roll + (s.z - j.z) * sh.pitch;
        }
        prev.links.push(s.i); list.push(s); prev = s;
      });
    });
    list.mainN = mainN;
    if(region && zones.expansion) list = reef3dExpandRegion(list, zones[0], zones.expansion);
    if(!(night && !region)) window.reef3dWorldRoute(list, region && region.id);
    return list;
  }
  // The shortest way along the paths from one space to another (spaces in order, not counting the start).
  function reef3dRoute(spaces, from, to){
    if(from === to) return [];
    var back = {}, q = [from]; back[from] = -1;
    while(q.length){ var c = q.shift(); if(c === to) break; (spaces[c].links || []).forEach(function(n){ if(back[n] === undefined){ back[n] = c; q.push(n); } }); }
    if(back[to] === undefined) return [];
    var r = []; for(var x = to; x !== from; x = back[x]) r.unshift(x); return r;
  }
  // The space a guide standing here would face: the next one along (on a branch, toward its end; at an end, back).
  function reef3dAhead(spaces, i){
    var s = spaces[i], L = s.links || [];
    if(s.branch) return spaces[s.end ? L[0] : L[L.length - 1]];
    if(spaces.loop && i === spaces.mainN - 1) return spaces[0];
    var fwd = L.filter(function(n){ return n > i && !spaces[n].branch; })[0];
    return spaces[fwd != null ? fwd : (L[0] != null ? L[0] : i)];
  }
  // The path as separate lines: the main path, then each branch starting from its fork.
  function reef3dPathLines(spaces){
    var n = spaces.mainN || spaces.length, lines = [spaces.slice(0, n)], cur = null;
    if(spaces.loop && !spaces.lighthouse) lines[0].push(spaces[0]);
    for(var i = n; i < spaces.length; i++){ var s = spaces[i]; if(!cur || cur.name !== s.branch){ cur = { name: s.branch, pts: [spaces[s.jn]] }; lines.push(cur.pts); } cur.pts.push(s); }
    return lines;
  }

  /* ---- little 3D builders, all simple shapes with cartoon (toon) shading ---- */
  function reef3dKit(THREE, night){
    var grad = (function(){ // three soft light bands give the cartoon look
      var c = document.createElement('canvas'); c.width = 4; c.height = 1;
      var g = c.getContext('2d'); ['#6a6a6a', '#b4b4b4', '#ffffff', '#ffffff'].forEach(function(col, i){ g.fillStyle = col; g.fillRect(i, 0, 1, 1); });
      var t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; return t;
    })();
    var mats = {};
    function M(color, extra){
      var key = color + JSON.stringify(extra || {});
      if(!mats[key]){ var o = { color: color, gradientMap: grad }; for(var k in extra) o[k] = extra[k]; mats[key] = new THREE.MeshToonMaterial(o); }
      return mats[key];
    }
    function mesh(geo, mat, x, y, z){ var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; return m; }
    function group(){ var g = new THREE.Group(); for(var i = 0; i < arguments.length; i++) g.add(arguments[i]); return g; }
    var B = {
      brain: function(){ // grooves pressed into a dome, like a real brain coral
        var geo = new THREE.IcosahedronGeometry(1, 4), pos = geo.attributes.position, v = new THREE.Vector3();
        for(var i = 0; i < pos.count; i++){ v.fromBufferAttribute(pos, i); var n = v.clone().normalize(); var groove = Math.sin(n.x * 9 + Math.sin(n.z * 6) * 1.6) * .5 + .5; v.copy(n.multiplyScalar(1 - groove * groove * .09)); pos.setXYZ(i, v.x, v.y, v.z); }
        geo.computeVertexNormals();
        var s = mesh(geo, M('#ef9a86'), 0, .55, 0); s.scale.set(1.1, .78, 1.1); var g = group(s);
        var foot = mesh(new THREE.CylinderGeometry(.7, .9, .3, 20), M('#c97a66'), 0, .12, 0); g.add(foot); return g; },
      staghorn: function(){ // branching coral: tapered, curving arms with pale tips
        var g = group(), mat = M('#f08ca0'), tipM = M('#ffd3dc');
        function arm(x0, y0, z0, dx, dy, dz, r0){
          var c = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x0 + dx * .45, y0 + dy * .55, z0 + dz * .45), new THREE.Vector3(x0 + dx, y0 + dy, z0 + dz)]);
          var tube = mesh(new THREE.TubeGeometry(c, 6, r0, 6), mat); g.add(tube);
          g.add(mesh(new THREE.SphereGeometry(r0 * 1.15, 7, 5), tipM, x0 + dx, y0 + dy, z0 + dz));
        }
        arm(0, 0, 0, .05, 1.5, 0, .16); arm(0, .6, 0, -.6, .8, .2, .12); arm(0, .8, 0, .55, .75, -.2, .12); arm(0, 1.1, 0, .2, .7, .45, .1); arm(-.35, 1.1, .1, -.3, .5, -.25, .08); arm(.35, 1.2, -.1, .35, .45, .2, .08);
        return g; },
      fan: function(){ // Organic branching gorgonian coral sea-fan (zero geometric Wi-Fi semicircle)
        var g = group(), stemM = M('#7c5eb8'), frondM = M('#b28ce6'), tipM = M('#f4c8f0');
        g.add(mesh(new THREE.CylinderGeometry(.07, .12, .38, 8), stemM, 0, .18, 0));
        var fronds = [
          [-.72, .96, .08, .052], [-.44, 1.32, -.05, .050], [-.18, 1.50, .06, .048],
          [ .08, 1.56, -.04, .050], [ .34, 1.42, .05, .048], [ .58, 1.18, -.06, .046], [ .78, .88, .06, .042]
        ];
        fronds.forEach(function(fr, fi){
          var c = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, .30, 0),
            new THREE.Vector3(fr[0] * .46, .30 + fr[1] * .52, fr[2] * .5),
            new THREE.Vector3(fr[0], .30 + fr[1], fr[2])
          ]);
          g.add(mesh(new THREE.TubeGeometry(c, 7, fr[3], 6), fi % 2 ? frondM : stemM));
          g.add(mesh(new THREE.SphereGeometry(fr[3] * 1.45, 7, 5), tipM, fr[0], .30 + fr[1], fr[2]));
          // Secondary delicate twig fork
          var c2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(fr[0] * .52, .30 + fr[1] * .55, fr[2] * .4),
            new THREE.Vector3(fr[0] * .84 + (fi % 2 ? .14 : -.14), .30 + fr[1] * .88, fr[2] + .06)
          ]);
          g.add(mesh(new THREE.TubeGeometry(c2, 4, fr[3] * .68, 5), frondM));
        });
        return g; },
      clam: function(){ var g = group(), shell = M('#f1ead8');
        var lo = mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shell, 0, .5, 0); lo.scale.set(1, .45, .8);
        var hi = mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, .5, 0); hi.scale.set(1, .5, .8);
        var hinge = new THREE.Group(); hinge.position.set(0, .5, -.75); hi.position.set(0, 0, .75); hinge.add(hi); hinge.rotation.x = -.55;
        g.add(lo, hinge, mesh(new THREE.SphereGeometry(.2, 16, 12), M('#f8f1dc'), 0, .6, .15));
        // sculpted radial scallop ridges: meridian ribs over both shells (children inherit the shell scale, so they hug the dome)
        var rib = M('#e2d6b8');
        for(var ri = 0; ri < 9; ri++){ var ra = ri / 9 * Math.PI;
          var ru = mesh(new THREE.TorusGeometry(1.01, .035, 5, 18, Math.PI), rib, 0, 0, 0); ru.rotation.y = ra; hi.add(ru);
          var rd = mesh(new THREE.TorusGeometry(1.01, .035, 5, 18, Math.PI), rib, 0, 0, 0); rd.rotation.set(0, ra, Math.PI); lo.add(rd); }
        g.scale.setScalar(.46); g.userData.lid = hinge; return g; },
      sponge: function(){ var g = group(); [['#f2b46a', 0, 0, 1.5], ['#d983b4', .45, .2, 1.1], ['#f2b46a', -.4, .25, .9]].forEach(function(t){
          g.add(mesh(new THREE.CylinderGeometry(.26, .3, t[3], 14, 1, true), M(t[0], { side: THREE.DoubleSide }), t[1], t[3] / 2, t[2])); }); return g; },
      anemone: function(){ // Plush multi-petal sea anemone with glowing cream bulb tips on a reef cushion
        var g = group(), baseM = M('#9a72be'), tentM = M('#f4a8e0'), innerM = M('#ffbdd0'), tipM = M('#fff4d4');
        var cushion = mesh(new THREE.SphereGeometry(.52, 14, 9, 0, Math.PI * 2, 0, Math.PI * .55), baseM, 0, .05, 0);
        cushion.scale.set(1.04, .66, 1.04); g.add(cushion);
        for(var i = 0; i < 12; i++){
          var a = i / 12 * Math.PI * 2;
          var c = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(a) * .28, .34, Math.sin(a) * .28),
            new THREE.Vector3(Math.cos(a) * .54, .68, Math.sin(a) * .54),
            new THREE.Vector3(Math.cos(a) * .68, .92, Math.sin(a) * .68)
          ]);
          g.add(mesh(new THREE.TubeGeometry(c, 5, .056, 6), tentM));
          g.add(mesh(new THREE.SphereGeometry(.072, 7, 5), tipM, Math.cos(a) * .68, .92, Math.sin(a) * .68));
        }
        for(var j = 0; j < 7; j++){
          var a2 = (j + .5) / 7 * Math.PI * 2;
          var c2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(a2) * .14, .38, Math.sin(a2) * .14),
            new THREE.Vector3(Math.cos(a2) * .28, .76, Math.sin(a2) * .28),
            new THREE.Vector3(Math.cos(a2) * .34, 1.06, Math.sin(a2) * .34)
          ]);
          g.add(mesh(new THREE.TubeGeometry(c2, 5, .048, 6), innerM));
          g.add(mesh(new THREE.SphereGeometry(.064, 7, 5), tipM, Math.cos(a2) * .34, 1.06, Math.sin(a2) * .34));
        }
        return g; },
      crate: function(){ var g = group(); g.add(mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), M('#9a6b3f'), 0, .55, 0));
        [-.36, .36].forEach(function(y){ g.add(mesh(new THREE.BoxGeometry(1.46, .12, 1.26), M('#6b4626'), 0, .55 + y, 0)); }); g.rotation.y = .3; return g; },
      barrel: function(){ var g = group();
        var prof = [[0, 0], [.48, 0], [.56, .3], [.6, .65], [.56, 1], [.48, 1.3], [0, 1.3]].map(function(q){ return new THREE.Vector2(q[0], q[1]); });
        g.add(mesh(new THREE.LatheGeometry(prof, 24), M('#8a5a32')));
        for(var k = 0; k < 8; k++){ var st = mesh(new THREE.BoxGeometry(.03, 1.26, .02), M('#6b4424'), Math.cos(k * .785) * .585, .65, Math.sin(k * .785) * .585); st.rotation.y = -k * .785; g.add(st); }
        [.22, 1.08].forEach(function(y){ var r = mesh(new THREE.TorusGeometry(.565, .045, 6, 28), M('#4a5458'), 0, y, 0); r.rotation.x = Math.PI / 2; g.add(r); });
        var r2 = mesh(new THREE.TorusGeometry(.61, .045, 6, 28), M('#4a5458'), 0, .65, 0); r2.rotation.x = Math.PI / 2; g.add(r2);
        g.rotation.z = .12; return g; },
      anchor: function(){ var g = group(), iron = M('#7a5a46');
        g.add(mesh(new THREE.CylinderGeometry(.1, .1, 1.6, 8), iron, 0, .95, 0));
        var arc = mesh(new THREE.TorusGeometry(.6, .1, 8, 20, Math.PI), iron, 0, .35, 0); arc.rotation.z = Math.PI; g.add(arc);
        var ring = mesh(new THREE.TorusGeometry(.22, .07, 8, 16), iron, 0, 1.9, 0); g.add(ring);
        g.add(mesh(new THREE.BoxGeometry(.9, .12, .12), iron, 0, 1.45, 0)); g.rotation.z = .25; return g; },
      wheel: function(){ var g = group(), wood = M('#a8743f'), oak = M('#6b4626'), trim = M('#7d5430'), brass = M('#d9b45a'), ry = .85;
        var w = new THREE.Group(); w.position.y = 1.25; w.rotation.y = ry;
        w.add(mesh(new THREE.TorusGeometry(.61, .07, 10, 28), wood)); // outer rim radius 0.68 -> bottom at y = 0.57, clear of planks
        w.add(mesh(new THREE.TorusGeometry(.55, .022, 6, 24), brass));
        var hub = mesh(new THREE.CylinderGeometry(.15, .15, .18, 14), brass); hub.rotation.x = Math.PI / 2; w.add(hub);
        w.add(mesh(new THREE.SphereGeometry(.09, 10, 8), brass, 0, 0, .09));
        var axle = mesh(new THREE.CylinderGeometry(.065, .065, .24, 10), brass, 0, 0, -.09); axle.rotation.x = Math.PI / 2; w.add(axle);
        for(var i = 0; i < 4; i++){ var s = mesh(new THREE.CylinderGeometry(.045, .045, 1.60, 8), wood); s.rotation.z = i * Math.PI / 4; w.add(s); }
        for(var k = 0; k < 8; k++){ var a = k * Math.PI / 4; w.add(mesh(new THREE.SphereGeometry(.055, 8, 6), wood, Math.cos(a) * .78, Math.sin(a) * .78, 0)); }
        var px = -Math.sin(ry) * .17, pz = -Math.cos(ry) * .17;
        g.add(w,
          mesh(new THREE.CylinderGeometry(.42, .52, .38, 8), oak, 0, .19, 0),
          mesh(new THREE.CylinderGeometry(.32, .42, .06, 8), trim, 0, .41, 0),
          mesh(new THREE.CylinderGeometry(.43, .44, .032, 8), brass, 0, .38, 0),
          mesh(new THREE.CylinderGeometry(.12, .16, .92, 8), oak, px, .87, pz),
          mesh(new THREE.SphereGeometry(.12, 10, 8), brass, px, 1.34, pz));
        g.userData.spin = w; return g; },
      cannon: function(){ var g = group(); var c = mesh(new THREE.CylinderGeometry(.28, .38, 1.8, 16), M('#4f5a60'), 0, .75, 0); c.rotation.z = Math.PI / 2 - .25; g.add(c);
        [-.45, .45].forEach(function(z){ var w = mesh(new THREE.CylinderGeometry(.35, .35, .14, 16), M('#7a5230'), -.1, .35, z); w.rotation.x = Math.PI / 2; g.add(w); }); return g; },
      lantern: function(){ var g = group(); g.add(mesh(new THREE.BoxGeometry(.8, .12, .8), M('#b8902f'), 0, .06, 0), mesh(new THREE.BoxGeometry(.8, .12, .8), M('#b8902f'), 0, 1.4, 0));
        [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]].forEach(function(p){ g.add(mesh(new THREE.CylinderGeometry(.05, .05, 1.3, 6), M('#b8902f'), p[0], .72, p[1])); });
        var glow = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe08a', fog: false })); glow.position.y = .72; g.add(glow);
        // a warm halo round the flame, so the lantern really glows in the dark water (the frame loop makes it flicker)
        var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: R3haloTex || (R3haloTex = reef3dBlobTex(true)), color: '#ffb84a', transparent: true, opacity: .42, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        halo.position.y = .72; halo.scale.setScalar(2.1); halo.renderOrder = 4; g.add(halo);
        g.add(mesh(new THREE.TorusGeometry(.18, .05, 6, 14), M('#b8902f'), 0, 1.62, 0)); g.userData.glow = glow; g.userData.halo = halo;
        reefCrabMerge(g, [glow]);   // the brass frame in one draw; the flame stays apart so it can flicker
        return g; },
      treasure: function(){ var g = group(); g.add(mesh(new THREE.BoxGeometry(1.5, .8, 1), M('#9a5f2c'), 0, .4, 0));
        var lid = mesh(new THREE.CylinderGeometry(.5, .5, 1.5, 16, 1, false, 0, Math.PI), M('#b8743a'), 0, .8, 0); lid.rotation.z = Math.PI / 2; g.add(lid);
        [-.45, .45].forEach(function(x){ g.add(mesh(new THREE.BoxGeometry(.14, 1.32, 1.04), M('#f0c35a'), x, .62, 0)); });
        g.add(mesh(new THREE.BoxGeometry(.24, .3, .1), M('#f0c35a'), 0, .7, .52));
        for(var i = 0; i < 5; i++) g.add(mesh(new THREE.CylinderGeometry(.16, .16, .05, 14), M('#f6d36b', { emissive: '#4a3500' }), Math.cos(i * 1.3) * .9, .03, .6 + Math.sin(i * 1.3) * .3));
        return g; },
      story: function(){ var g = group(); var b = new THREE.Group(); b.position.y = .45; b.rotation.z = .5;
        b.add(mesh(new THREE.CylinderGeometry(.45, .45, 1.3, 18), new THREE.MeshToonMaterial({ color: '#9ed6e0', transparent: true, opacity: .6, gradientMap: grad })));
        b.add(mesh(new THREE.CylinderGeometry(.18, .3, .45, 14), new THREE.MeshToonMaterial({ color: '#9ed6e0', transparent: true, opacity: .6, gradientMap: grad }), 0, .85, 0));
        b.add(mesh(new THREE.CylinderGeometry(.16, .16, .25, 12), M('#9a6b3f'), 0, 1.15, 0));
        var paper = mesh(new THREE.CylinderGeometry(.2, .2, .9, 12), M('#fff4d6'), 0, 0, 0); b.add(paper); g.add(b); return g; },
      kelp: function(r){ var g = group(), col = night ? '#2f5a4e' : '#5fa478';
        for(var i = 0; i < 3; i++){
          var h = 3 + r() * 3, pts = [];
          for(var j = 0; j <= 6; j++) pts.push(new THREE.Vector3(Math.sin(j * .9 + i) * .35, j / 6 * h, Math.cos(j * .7 + i) * .2));
          var t = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .12, 5), M(col), (i - 1) * .4, 0, (r() - .5) * .4); g.add(t);
        }
        g.userData.sway = true; return g; },
      rock: function(r){ r = r || Math.random;
        var geo = new THREE.SphereGeometry(1, 14, 10), pos = geo.attributes.position, p1 = r() * 6.28, p2 = r() * 6.28;
        for(var i = 0; i < pos.count; i++){
          var vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
          var n = 1 + .11 * Math.sin(vx * 2.6 + p1) * Math.cos(vz * 2.4 + p2) + .07 * Math.sin(vy * 3.1 - vx * 1.9 + p2);
          pos.setXYZ(i, vx * n, vy * n * (vy < 0 ? .72 : 1), vz * n);
        }
        geo.computeVertexNormals();
        var s = mesh(geo, M(night ? '#3b4a50' : '#a7b7b4'), 0, .3, 0); s.scale.set(1 + r(), .55 + r() * .4, 1 + r() * .6); s.rotation.y = r() * 3; return group(s); },
      coralBall: function(r){ r = r || Math.random;
        var g = group(), pal = night ? ['#5a4a66', '#4a5a66'] : ['#f2a59a', '#f6c08c', '#c4aee6', '#f7cfc0'];
        for(var i = 0; i < 4; i++){
          var rad = .4 + r() * .4, geo = new THREE.SphereGeometry(rad, 14, 10), pos = geo.attributes.position, p1 = r() * 6.28, p2 = r() * 6.28;
          for(var vi = 0; vi < pos.count; vi++){
            var vx = pos.getX(vi), vy = pos.getY(vi), vz = pos.getZ(vi), inv = 1 / (rad || 1);
            var nx = vx * inv, ny = vy * inv, nz = vz * inv;
            var n = 1 + .09 * Math.sin(nx * 3.4 + p1) * Math.cos(nz * 3.1 + p2) + .05 * Math.cos(ny * 4.2 + p1);
            pos.setXYZ(vi, vx * n, vy * n, vz * n);
          }
          geo.computeVertexNormals();
          var s = mesh(geo, M(pal[Math.floor(r() * pal.length)]), (r() - .5) * 1.4, .3, (r() - .5) * 1.2); s.scale.y = .8; g.add(s);
        } return g; },
      star: function(){ var sh = new THREE.Shape(); for(var i = 0; i < 10; i++){ var a = i / 10 * Math.PI * 2, rr = i % 2 ? .22 : .55; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
        var s = mesh(new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2 }), M(night ? '#8a6056' : '#f29b74'), 0, .1, 0); s.rotation.x = -Math.PI / 2; return group(s); },
      plank: function(r){ var p = mesh(new THREE.BoxGeometry(2.4, .14, .45), M('#6b4f3a'), 0, .1, 0); p.rotation.y = r() * 3; p.rotation.z = .08; return group(p); },
      plant: function(){ var g = group();
        g.add(mesh(new THREE.CylinderGeometry(.34, .24, .34, 14), M('#c96b4b'), 0, .17, 0));
        g.add(mesh(new THREE.CylinderGeometry(.39, .35, .085, 14), M('#b8593c'), 0, .35, 0));
        g.add(mesh(new THREE.CylinderGeometry(.30, .30, .05, 12), M('#5f4635'), 0, .37, 0));
        var deepM = M('#2d7648'), leafM = M('#479e5b'), hiM = M('#6fc26e'), sunM = M('#96de76');
        // Shaded emerald lower overhang puffs + lush mid billows + warm sunlit upper clusters
        for(var i = 0; i < 7; i++){ var a = i / 7 * Math.PI * 2;
          var baseP = mesh(new THREE.SphereGeometry(.155, 10, 8), i % 2 ? leafM : deepM, Math.cos(a) * .20, .46 + (i % 2) * .035, Math.sin(a) * .20);
          baseP.scale.set(1.12, .76, 1.06); g.add(baseP);
        }
        for(var j = 0; j < 5; j++){ var a2 = j / 5 * Math.PI * 2 + .35;
          var midP = mesh(new THREE.SphereGeometry(.145, 10, 8), j % 2 ? hiM : leafM, Math.cos(a2) * .12, .59 + (j % 2) * .045, Math.sin(a2) * .12);
          midP.scale.set(1.08, .82, 1.06); g.add(midP);
        }
        var crown1 = mesh(new THREE.SphereGeometry(.135, 10, 8), sunM, -.04, .69, .03); crown1.scale.set(1.10, .78, 1.06); g.add(crown1);
        var crown2 = mesh(new THREE.SphereGeometry(.105, 10, 8), hiM, .08, .67, -.05); crown2.scale.set(1.06, .76, 1.06); g.add(crown2);
        [[-.17, .58, .14, '#ffd86b'], [.18, .57, -.11, '#ff7d8e'], [.03, .74, .06, '#fff3b0'], [-.08, .66, -.15, '#ff9f78'], [.14, .65, .15, '#fff8e2']].forEach(function(fl){
          g.add(mesh(new THREE.SphereGeometry(.056, 8, 6), M(fl[3]), fl[0], fl[1], fl[2]));
          g.add(mesh(new THREE.SphereGeometry(.032, 6, 5), M('#ffe87a'), fl[0] * 1.06, fl[1] + .028, fl[2] * 1.06));
        });
        return g; }
    };
    // The guide: Shelly the turtle by day, Lumi the anglerfish at night. Parts that animate
    // (flippers, eyes, fins, the lure) are kept in userData so the frame loop can move them.
    function eye(x, y, z, r){
      var e = new THREE.Group(); e.position.set(x, y, z);
      e.add(mesh(new THREE.SphereGeometry(r, 16, 12), M('#ffffff')));
      var pupil = mesh(new THREE.SphereGeometry(r * .62, 14, 10), M('#14232a'), 0, 0, r * .5); e.add(pupil);
      var glint = new THREE.Mesh(new THREE.SphereGeometry(r * .2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); glint.position.set(r * .22, r * .25, r * 1.02); e.add(glint);
      return e;
    }
    // Shelly's shell plates, painted to wrap round the dome: u runs around, v from the top (0) to the rim (1). Each plate is
    // six-sided with a lighter middle, and the dark seams zig-zag, so they read as a real turtle's scutes.
    function shellTexture(EQ){   // EQ: the canvas row of the shell's widest line (see the body shape below)
      var c = document.createElement('canvas'); c.width = 512; c.height = 256; var g = c.getContext('2d');
      g.fillStyle = '#3f8550'; g.fillRect(0, 0, 512, 256);
      function plate(pts){
        var xs = pts.map(function(p){ return p[0]; }), ys = pts.map(function(p){ return p[1]; });
        var cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
        var gr = g.createRadialGradient(cx, cy, 2, cx, cy, Math.max(Math.max.apply(0, xs) - cx, Math.max.apply(0, ys) - cy) * 1.2);
        gr.addColorStop(0, '#5fae6c'); gr.addColorStop(1, '#4f9a5e'); g.fillStyle = gr;
        g.beginPath(); pts.forEach(function(p, k){ g[k ? 'lineTo' : 'moveTo'](p[0], p[1]); }); g.closePath(); g.fill();
      }
      g.save(); g.scale(1, EQ / 230);   // the plates fill the dome above the widest line (EQ); the belly is painted below it
      plate([[0, 0], [512, 0], [512, 50], [0, 50]]);                                    // the middle plate, on top of the dome
      for(var q = 0; q < 5; q++){ var x0 = q * 102.4, xm = x0 + 51.2, x1 = x0 + 102.4;    // a ring of five big plates
        plate([[x0 + 5, 66], [xm, 58], [x1 - 5, 66], [x1 - 5, 150], [xm, 160], [x0 + 5, 150]]); }
      for(var q2 = 0; q2 < 11; q2++){ var y0 = q2 * 46.5, ym = y0 + 23.3, y1 = y0 + 46.5; // eleven small plates round the edge
        plate([[y0 + 4, 172], [ym, 166], [y1 - 4, 172], [y1 - 4, 222], [ym, 228], [y0 + 4, 222]]); }
      g.restore();
      // no hard edge: the shell's green fades softly into the cream belly round the widest line
      var fade = g.createLinearGradient(0, EQ - 6, 0, EQ + 14); fade.addColorStop(0, 'rgba(240,220,160,0)'); fade.addColorStop(1, '#f0dca0');
      g.fillStyle = fade; g.fillRect(0, EQ - 6, 512, 20); g.fillStyle = '#f0dca0'; g.fillRect(0, EQ + 14, 512, 256);
      var t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
    }
    // A smooth flipper: a bevelled curved paddle lying flat, pointing out along +x.
    function paddle(len, wid, sweep){
      var s = new THREE.Shape(); s.moveTo(0, -wid * .5);
      s.bezierCurveTo(len * .35, -wid * .75, len * .8, -wid * .35 - sweep, len, -sweep);
      s.bezierCurveTo(len * .85, wid * .25 - sweep, len * .4, wid * .6, 0, wid * .5); s.lineTo(0, -wid * .5);
      var geo = new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 4, curveSegments: 16 });
      geo.translate(0, 0, -.015); geo.rotateX(Math.PI / 2); return geo;
    }
    B.guide = function(){
      var g = new THREE.Group(), body = new THREE.Group(), parts = {}; g.add(body);
      if(!night){
        // Shelly (Wendy picked the smooth sea turtle): one flowing domed shell with a soft rolled lip, an egg-shaped head on
        // a short tapered neck, and paddle flippers. The parts the frame loop moves keep their names (neck, eyes, flippers).
        // The shell and belly are one smooth pebble (no lip or seam): from the middle of the belly, out round the widest
        // line, then up over the dome. Listed bottom to top, so the surface faces outward.
        var R = .82, H = .56, HB = .2, OV = 1.16, pts = [], NB = 10, NT = 26;
        for(var si = 0; si <= NB; si++){ var th = Math.PI - si / NB * Math.PI / 2; pts.push(new THREE.Vector2(R * Math.pow(Math.sin(th), .7), HB * Math.cos(th))); }
        for(var sj = 1; sj <= NT; sj++){ var th2 = Math.PI / 2 - sj / NT * Math.PI / 2; pts.push(new THREE.Vector2(R * Math.pow(Math.sin(th2), .7), H * Math.pow(Math.cos(th2), .85))); }
        var sg = new THREE.LatheGeometry(pts, 48), sp = sg.attributes.position;
        for(var sv = 0; sv < sp.count; sv++){ var vz = sp.getZ(sv); sp.setZ(sv, vz * OV); if(vz < 0) sp.setX(sv, sp.getX(sv) * (1 - .08 * (-vz / R))); }   // oval, narrower at the back
        sg.computeVertexNormals();
        body.add(mesh(sg, new THREE.MeshToonMaterial({ map: shellTexture(Math.round((1 - NB / (NB + NT)) * 256)), gradientMap: grad }), 0, .3, 0));
        var neck = new THREE.Group(); neck.position.set(0, .4, R * OV * .92); body.add(neck);
        var nk = mesh(new THREE.CylinderGeometry(.17, .22, .32, 16), M('#8fd18e'), 0, .02, .09); nk.rotation.x = Math.PI / 2 - .35; neck.add(nk);
        var hr = .34, hz = .22 + hr * .55;
        var head = mesh(new THREE.SphereGeometry(hr, 28, 20), M('#8fd18e'), 0, .12, hz); head.scale.set(1, .9, 1.12); neck.add(head);
        parts.hat = new THREE.Group(); parts.hat.position.set(0, .12 + hr * .8, hz - .03); parts.hat.userData.size = hr; neck.add(parts.hat);   // where a shop hat sits
        var chin = mesh(new THREE.SphereGeometry(hr * .8, 20, 14), M('#b8e6a8'), 0, .02, hz + hr * .3); chin.scale.set(.95, .55, .9); neck.add(chin);
        var eL = eye(hr * .44, .12 + hr * .38, hz + hr * .78, .115), eR = eye(-hr * .44, .12 + hr * .38, hz + hr * .78, .115); neck.add(eL, eR); parts.eyes = [eL, eR];
        [-1, 1].forEach(function(sd){ var ck = mesh(new THREE.SphereGeometry(hr * .22, 12, 8), M('#f6a5a0', { transparent: true, opacity: .75 }), sd * hr * .7, .06, hz + hr * .72); ck.scale.set(1, .6, .4); neck.add(ck); });
        var smile = mesh(new THREE.TorusGeometry(hr * .24, .022, 6, 16, Math.PI), M('#1f3a2c'), 0, .12 - hr * .22, hz + hr); smile.rotation.z = Math.PI; smile.rotation.x = -.35; neck.add(smile);
        parts.mouth = new THREE.Object3D(); parts.mouth.position.set(0, .12 - hr * .2, hz + hr * 1.05); neck.add(parts.mouth);   // where food goes in (see reefLobbyFrame)
        parts.flippers = [];
        var frontG = paddle(.72, .34, .22), backG = paddle(.36, .29, .08);
        [[.62, .52, 1], [-.62, .52, -1], [.5, -.62, 1], [-.5, -.62, -1]].forEach(function(p, i){
          var pivot = new THREE.Group(); pivot.position.set(p[0], .26, p[1] * OV); body.add(pivot);
          var f = mesh(i < 2 ? frontG : backG, M('#8fd18e'), 0, 0, 0); f.scale.x = p[2]; f.rotation.y = i < 2 ? -p[2] * .35 : p[2] * .5; f.rotation.z = -p[2] * (i < 2 ? .18 : .1); pivot.add(f);   // tips droop a little
          if(i < 2) [[.3, .02], [.5, -.1]].forEach(function(d){ var dot = mesh(new THREE.SphereGeometry(.045, 8, 6), M('#b8e6a8'), d[0], .07, d[1]); dot.scale.y = .3; f.add(dot); });
          pivot.userData.side = p[2]; pivot.userData.front = i < 2; parts.flippers.push(pivot);
        });
        var tail = mesh(new THREE.ConeGeometry(.1, .32, 12), M('#8fd18e'), 0, .24, -R * OV - .08); tail.rotation.x = -Math.PI / 2 - .2; body.add(tail);
        parts.neck = neck;
      } else {
        var fish = mesh(new THREE.SphereGeometry(.68, 28, 20), M('#3d6f9a'), 0, .95, 0); fish.scale.set(.9, .85, 1.1); body.add(fish);
        body.add(mesh(new THREE.SphereGeometry(.62, 24, 12, 0, Math.PI * 2, Math.PI * .55, Math.PI * .45), M('#9cc6e0'), 0, .93, .05));
        // A friendly face like Shelly's: round eyes sitting on the surface (not sunk in, which made them slits), a
        // thin smile in a soft navy, two little rounded teeth and pink cheeks (it was a thick dark jaw with fangs).
        var smile2 = mesh(new THREE.TorusGeometry(.16, .021, 8, 20, Math.PI * .8), M('#3f6f99'), 0, .82, .72); smile2.rotation.z = Math.PI * 1.1; smile2.rotation.x = -.28; body.add(smile2);
        [-1, 1].forEach(function(sd){ var tooth = mesh(new THREE.SphereGeometry(.035, 8, 6), M('#ffffff'), sd * .055, .675, .742); tooth.scale.set(1, 1.25, .6); body.add(tooth); });
        [-1, 1].forEach(function(sd){ var ck = mesh(new THREE.SphereGeometry(.09, 12, 8), M('#f7a3c0', { transparent: true, opacity: .7 }), sd * .33, .93, .62); ck.scale.set(1, .6, .35); ck.rotation.y = sd * .5; body.add(ck); });
        parts.mouth = new THREE.Object3D(); parts.mouth.position.set(0, .74, .74); body.add(parts.mouth);
        var eL2 = eye(.25, 1.17, .6, .16), eR2 = eye(-.25, 1.17, .6, .16); body.add(eL2, eR2); parts.eyes = [eL2, eR2];
        parts.hat = new THREE.Group(); parts.hat.position.set(0, 1.47, -.18); parts.hat.userData.size = .42; body.add(parts.hat);
        var tailP = new THREE.Group(); tailP.position.set(0, .95, -.75); body.add(tailP);
        var tail2 = mesh(new THREE.ConeGeometry(.42, .55, 4), M('#2e5878'), 0, 0, -.25); tail2.rotation.x = -Math.PI / 2; tail2.scale.set(.25, 1, 1); tailP.add(tail2);
        parts.tail = tailP; parts.flippers = [];
        [1, -1].forEach(function(s){ var fp = new THREE.Group(); fp.position.set(s * .58, .85, .05); body.add(fp);
          var fin = mesh(new THREE.ConeGeometry(.2, .45, 4), M('#2e5878'), s * .15, 0, 0); fin.rotation.z = s * -Math.PI / 2; fin.scale.set(.3, 1, 1); fp.add(fin); fp.userData.side = s; parts.flippers.push(fp); });
        var stalk = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.5, .1), new THREE.Vector3(0, 1.95, .35), new THREE.Vector3(0, 1.75, .78)]), 12, .035, 6), M('#2e5878'));
        stalk.userData.noOutline = true; body.add(stalk);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 10), new THREE.MeshBasicMaterial({ color: '#b8fff2' })); bulb.position.set(0, 1.68, .82); body.add(bulb);
        var glow = new THREE.PointLight('#8ffff0', 1.4, 7, 2); glow.position.copy(bulb.position); body.add(glow);
        parts.bulb = bulb; parts.glow = glow;
      }
      g.userData.body = body; g.userData.parts = parts; return g;
    };
    return { M: M, mesh: mesh, B: B, grad: grad };
  }

  // A board space: a puck with a rounded bevel, like a game-board tile.
  var R3geo = {};
  function reef3dTileGeo(R){
    if(R3geo[R]) return R3geo[R];
    var THREE = window.THREE, pts = [[0, .34], [R - .14, .34], [R - .05, .32], [R, .26], [R + .02, .1], [R + .05, 0], [0, 0]].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    return (R3geo[R] = new THREE.LatheGeometry(pts, 48));
  }
  function reef3dShade(hex, amt){
    var c = new window.THREE.Color(hex), hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString();
  }
  // The painted top of a space: the deck's emoji, a "?" for surprises, a shell for plain spaces.
  var R3tex = {};
  var R3glyphScratch = null;
  function reef3dDrawCenteredGlyph(g, text, cx, cy, font, fillStyle, maxBox){
    var drawDirect = function(ctx, ox, oy){
      if(fillStyle) ctx.fillStyle = fillStyle;
      ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, ox, oy);
    };
    try {
      if(typeof document === 'undefined' || !document.createElement){ drawDirect(g, cx, cy); return; }
      if(!R3glyphScratch){ R3glyphScratch = document.createElement('canvas'); R3glyphScratch.width = R3glyphScratch.height = 256; }
      var sg = R3glyphScratch.getContext && R3glyphScratch.getContext('2d', { willReadFrequently: true });
      if(!sg || typeof sg.getImageData !== 'function'){ drawDirect(g, cx, cy); return; }
      sg.clearRect(0, 0, 256, 256);
      sg.save(); drawDirect(sg, 128, 128); sg.restore();
      var img = sg.getImageData(0, 0, 256, 256), data = img && img.data;
      if(!data || data.length < 256 * 256 * 4){ drawDirect(g, cx, cy); return; }
      var minX = 256, minY = 256, maxX = -1, maxY = -1;
      for(var y = 0; y < 256; y++){
        var row = y * 256 * 4;
        for(var x = 0; x < 256; x++){
          if(data[row + x * 4 + 3] > 16){
            if(x < minX) minX = x; if(x > maxX) maxX = x;
            if(y < minY) minY = y; if(y > maxY) maxY = y;
          }
        }
      }
      if(maxX < minX || maxY < minY){ drawDirect(g, cx, cy); return; }
      var sw = maxX - minX + 1, sh = maxY - minY + 1;
      var sc = maxBox ? Math.min(1, maxBox / sw, maxBox / sh) : 1;
      var dw = sw * sc, dh = sh * sc;
      g.drawImage(R3glyphScratch, minX, minY, sw, sh, cx - dw * .5, cy - dh * .5, dw, dh);
    } catch(e){
      drawDirect(g, cx, cy);
    }
  }
  function reef3dTileTex(col, icon, night, kind){
    var key = col + icon + night + kind; if(R3tex[key]) return R3tex[key];
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
    var gr = g.createRadialGradient(100, 90, 20, 128, 128, 130); gr.addColorStop(0, reef3dShade(col, .14)); gr.addColorStop(1, reef3dShade(col, -.04));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 10; g.setLineDash(kind === 'plain' ? [] : [18, 14]);
    g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    if(/^deck/.test(kind)){   // decks: a white badge behind a big emoji, and a gold star once it's all done
      g.fillStyle = night ? 'rgba(255,246,222,.92)' : 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(128, 128, 82, 0, Math.PI * 2); g.fill();
      var isHangul = /[가-힣]/.test(icon);
      var dFont = isHangul ? '700 116px system-ui, sans-serif' : '128px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      var dFill = isHangul ? (night ? '#6b4514' : '#0d5262') : (night ? '#6b4514' : '#0d5262');
      reef3dDrawCenteredGlyph(g, icon, 128, 128, dFont, dFill, 126);
      if(kind === 'deck-done'){ g.font = '900 64px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffcf3f'; g.strokeStyle = '#8a5a12'; g.lineWidth = 6; g.strokeText('★', 200, 58); g.fillText('★', 200, 58); }
      var dt = new window.THREE.CanvasTexture(c); dt.anisotropy = 4; return (R3tex[key] = dt);
    }
    if(icon === '?'){ reef3dDrawCenteredGlyph(g, '?', 128, 128, '900 150px "Baloo 2", system-ui, sans-serif', night ? '#ffe29a' : '#ffffff', 148); }
    else if(icon){ reef3dDrawCenteredGlyph(g, icon, 128, 128, (kind === 'plain' ? 90 : 120) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', '#155664', kind === 'plain' ? 104 : 132); }
    else { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(128, 128, 26, 0, Math.PI * 2); g.fill(); }
    var t = new window.THREE.CanvasTexture(c); t.anisotropy = 4; return (R3tex[key] = t);
  }
  // Lightweight sunlit coastal PMREM environment map so glossy board spaces & metallic bezels
  // catch crisp specular sky/sun reflections from every compass direction around 360-deg loops.
  function reef3dBuildTileEnv(THREE, renderer, night){
    if(!THREE || !THREE.PMREMGenerator || !renderer || typeof renderer.getContext !== 'function') return null;
    var pmrem = null, geos = [], mats = [];
    try {
      var envScene = new THREE.Scene();
      envScene.background = new THREE.Color(night ? '#1c3a58' : '#8ed6f6');
      var domeGeo = new THREE.SphereGeometry(12, 24, 16), pos = domeGeo.attributes.position, cols = new Float32Array(pos.count * 3);
      var cZen = new THREE.Color(night ? '#18365a' : '#3ea4e8');
      var cHor = new THREE.Color(night ? '#5a94b6' : '#fff5dc');
      var cSea = new THREE.Color(night ? '#164660' : '#5ad2df');
      var tmp = new THREE.Color();
      for(var i = 0; i < pos.count; i++){
        var ny = pos.getY(i) / 12;
        if(ny >= 0) tmp.copy(cHor).lerp(cZen, Math.pow(ny, .62));
        else tmp.copy(cHor).lerp(cSea, Math.pow(-ny, .55));
        cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
      }
      domeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      var domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
      geos.push(domeGeo); mats.push(domeMat);
      envScene.add(new THREE.Mesh(domeGeo, domeMat));
      function addCard(rad, hex, mult, x, y, z){
        var g = new THREE.CircleGeometry(rad, 18);
        var m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), side: THREE.DoubleSide });
        if(mult && mult !== 1) m.color.multiplyScalar(mult);
        var card = new THREE.Mesh(g, m);
        card.position.set(x, y, z); card.lookAt(0, 0, 0);
        geos.push(g); mats.push(m);
        envScene.add(card);
      }
      // Four broad sunlit sky/sun specular softboxes around 30..58 deg elevation + zenith crown
      // so every glossy tile disc and metallic rim gleams cleanly from any follow-camera heading.
      addCard(3.2, night ? '#c8f4ff' : '#fff7dc', night ? 1.35 : 1.75,  4.8, 6.4,  4.8);
      addCard(1.4, night ? '#eefcff' : '#fffff6', night ? 1.80 : 2.55,  4.6, 6.2,  4.6);
      addCard(3.4, night ? '#a6e4f8' : '#fff4d4', night ? 1.25 : 1.65, -4.6, 5.8, -5.0);
      addCard(3.2, night ? '#9ad8f4' : '#e4f8ff', night ? 1.15 : 1.50,  5.0, 5.6, -4.8);
      addCard(3.2, night ? '#9ad8f4' : '#e8f9ff', night ? 1.15 : 1.48, -5.0, 5.6,  4.8);
      addCard(4.2, night ? '#7ec4e0' : '#f4fcff', night ? 1.05 : 1.25,  0.0, 9.2,  0.0);
      pmrem = new THREE.PMREMGenerator(renderer);
      return pmrem.fromScene(envScene, .028);
    } catch(e){
      return null;
    } finally {
      if(pmrem && pmrem.dispose) try { pmrem.dispose(); } catch(e){}
      geos.forEach(function(g){ try { g.dispose(); } catch(e){} });
      mats.forEach(function(m){ try { m.dispose(); } catch(e){} });
    }
  }
  // Soft dark radial contact-AO ring texture hugging the base perimeter of every board space.
  var R3tileAOTex = null;
  function reef3dTileAOTex(THREE){
    if(R3tileAOTex) return R3tileAOTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 34, 64, 64, 63);
    gr.addColorStop(0.00, 'rgba(0,0,0,0)');
    gr.addColorStop(0.24, 'rgba(0,0,0,.78)');
    gr.addColorStop(0.42, 'rgba(0,0,0,.86)');
    gr.addColorStop(0.68, 'rgba(0,0,0,.38)');
    gr.addColorStop(0.88, 'rgba(0,0,0,.10)');
    gr.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (R3tileAOTex = new THREE.CanvasTexture(c));
  }
  function reef3dTileContour(a, pr, R, style, crafted, seed){
    if(crafted){
      var irr = 1 + .016 * Math.sin(3 * a + seed) + .012 * Math.cos(5 * a + seed);
      var ca = Math.cos(a), sa = Math.sin(a);
      return [
        Math.sign(ca) * Math.pow(Math.abs(ca), .76) * pr * irr * R,
        Math.sign(sa) * Math.pow(Math.abs(sa), .76) * pr * irr * R * .93
      ];
    }
    var sc = style === 'shell' ? (1 + .035 * Math.cos(a * 12)) : (1 + .009 * Math.sin(a * 5 + .7));
    var chip = Math.pow(Math.max(0, Math.cos(a - 2.37)), 34) * .024 + Math.pow(Math.max(0, Math.cos(a - 5.04)), 42) * .018;
    var rr = R * pr * (1 + (sc - 1 - chip) * .55);
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  }
  // Jamboree sleek metallic champagne-gold / pearl outer bevel ring hugging every board space rim.
  // Rings run outer-lower -> crown -> inner-tuck so cross-product normals face strictly outward & upward.
  function reef3dTileMetallicRimGeo(style, s, R, night, crafted){
    var THREE = window.THREE; if(!THREE) return null;
    var plain = s.kind === 'plain', seed = crafted ? ((s.i % 6) * .97) : 0;
    var seg = crafted ? 32 : 36, TAU = Math.PI * 2;
    var gold = s.kind === 'deck' || s.kind === 'shop' || s.kind === 'start' || s.kind === 'treasure' || s.kind === 'story';
    var profile = crafted
      ? (plain
        ? [[1.055, .175, .80], [1.038, .265, .91], [1.008, .332, .98], [.972, .368, 1.0], [.932, .374, 1.0], [.906, .358, .94], [.892, .336, .84]]
        : [[1.058, .180, .80], [1.036, .270, .91], [.992, .336, .98], [.942, .372, 1.0], [.874, .378, 1.0], [.816, .360, .94], [.784, .334, .84]])
      : style === 'shell'
        ? [[1.058, .170, .80], [1.038, .262, .91], [1.006, .330, .98], [.972, .366, 1.0], [.934, .372, 1.0], [.904, .356, .94], [.888, .336, .84]]
        : [[1.064, .176, .80], [1.044, .270, .91], [1.010, .340, .98], [.974, .375, 1.0], [.936, .381, 1.0], [.906, .363, .94], [.890, .340, .84]];
    var cCrown = new THREE.Color(night ? (gold ? '#fce7a4' : '#eefcfc') : (gold ? '#fff4c6' : (crafted ? '#fffcf8' : '#fffdf6')));
    var cMid   = new THREE.Color(night ? (gold ? '#d8b664' : '#a8d8e4') : (gold ? '#f0c45e' : (crafted ? '#ede0ea' : '#ecdcc2')));
    var cLow   = new THREE.Color(night ? (gold ? '#967638' : '#6e9eb0') : (gold ? '#c89438' : (crafted ? '#cbb8d8' : '#cbb490')));
    var pos = [], cols = [], idx = [], tmp = new THREE.Color();
    var sy = s.y || 0;
    for(var j = 0; j < profile.length; j++){
      var pr = profile[j][0], py = profile[j][1] + sy, lum = profile[j][2];
      var isTop = j === 3 || j === 4;
      for(var i = 0; i <= seg; i++){
        var a = i / seg * TAU, pt = reef3dTileContour(a, pr, R, style, crafted, seed);
        pos.push(s.x + pt[0], py, s.z + pt[1]);
        var sunK = .5 + .5 * Math.cos(a - 2.35);
        tmp.copy(cLow).lerp(cMid, .35 + .65 * sunK).lerp(cCrown, isTop ? (.52 + .40 * Math.pow(sunK, 1.8)) : .18 * sunK);
        tmp.multiplyScalar(lum);
        cols.push(tmp.r, tmp.g, tmp.b);
        if(j && i){
          var k0 = j * (seg + 1) + i;
          idx.push(k0 - seg - 2, k0 - 1, k0 - seg - 1, k0 - seg - 1, k0 - 1, k0);
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  // Subtle bright luminous inner ring accent seated right inside the metallic bezel framing the jewel disc.
  function reef3dTileInnerRingGeo(style, s, R, top, night, crafted){
    var THREE = window.THREE; if(!THREE) return null;
    var plain = s.kind === 'plain', seed = crafted ? ((s.i % 6) * .97) : 0;
    var seg = crafted ? 32 : 36, TAU = Math.PI * 2;
    var profile = crafted
      ? (plain
        ? [[.894, .346], [.872, .358], [.848, .349]]
        : [[.780, .342], [.752, .355], [.724, .346]])
      : style === 'shell'
        ? [[.890, .344], [.864, .356], [.836, .347]]
        : [[.892, .348], [.866, .361], [.838, .351]];
    var baseCol = new THREE.Color(night ? '#e8fffc' : '#fffef8');
    if(top){
      var tint = new THREE.Color(top);
      baseCol.lerp(tint, night ? .26 : .22);
    }
    var pos = [], cols = [], idx = [], sy = s.y || 0;
    for(var j = 0; j < profile.length; j++){
      var pr = profile[j][0], py = profile[j][1] + sy, lum = j === 1 ? 1.0 : .90;
      for(var i = 0; i <= seg; i++){
        var a = i / seg * TAU, pt = reef3dTileContour(a, pr, R, style, crafted, seed);
        pos.push(s.x + pt[0], py, s.z + pt[1]);
        cols.push(baseCol.r * lum, baseCol.g * lum, baseCol.b * lum);
        if(j && i){
          var k0 = j * (seg + 1) + i;
          idx.push(k0 - seg - 2, k0 - 1, k0 - seg - 1, k0 - seg - 1, k0 - 1, k0);
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  // Gently convex cabochon glossy center disc preserving exact atlas UVs so every tile catches
  // a rich curved specular sheen instead of flat matte lighting.
  function reef3dTileGlossyDiscGeo(faceMesh, s, R, style, crafted){
    var THREE = window.THREE; if(!THREE || !faceMesh || !faceMesh.geometry) return null;
    faceMesh.updateMatrixWorld(true);
    if(crafted){
      var cg = faceMesh.geometry.index ? faceMesh.geometry.toNonIndexed() : faceMesh.geometry.clone();
      cg.applyMatrix4(faceMesh.matrixWorld);
      if(!cg.attributes.color){
        var nC = cg.attributes.position.count, arrC = new Float32Array(nC * 3);
        for(var ci = 0; ci < nC * 3; ci++) arrC[ci] = 1;
        cg.setAttribute('color', new THREE.BufferAttribute(arrC, 3));
      }
      Object.keys(cg.attributes).forEach(function(n){ if(n !== 'position' && n !== 'normal' && n !== 'uv' && n !== 'color') cg.deleteAttribute(n); });
      cg.computeVertexNormals();
      var cn = cg.attributes.normal;
      for(var cni = 0; cni < cn.count; cni++){
        var nx0 = cn.getX(cni), ny0 = cn.getY(cni), nz0 = cn.getZ(cni);
        if(nx0 * nx0 + ny0 * ny0 + nz0 * nz0 < .01 || ny0 < .2) cn.setXYZ(cni, 0, 1, 0);
      }
      return cg;
    }
    var srcUV = faceMesh.geometry.attributes.uv, srcPos = faceMesh.geometry.attributes.position;
    if(!srcUV || !srcPos || srcPos.count < 4) return null;
    // Extract exact affine UV center & half-extents from CircleGeometry's center vertex (0) and outer ring.
    var uC = srcUV.getX(0), vC = srcUV.getY(0);
    var uMin = 1e9, uMax = -1e9, vMin = 1e9, vMax = -1e9;
    for(var ui = 1; ui < srcUV.count; ui++){
      var uu = srcUV.getX(ui), vv = srcUV.getY(ui);
      if(uu < uMin) uMin = uu; if(uu > uMax) uMax = uu;
      if(vv < vMin) vMin = vv; if(vv > vMax) vMax = vv;
    }
    var uRad = Math.max(1e-5, (uMax - uMin) * .5), vRad = Math.max(1e-5, (vMax - vMin) * .5);
    var seg = style === 'shell' ? 32 : 40, TAU = Math.PI * 2;
    var discR = R * .901, baseY = faceMesh.position.y, domeH = .042;
    // Outer -> inner rings give outward/upward FrontSide normals with smooth spherical cabochon curvature.
    var ringFracs = [1.0, .86, .66, .40, .14, 0.0];
    var pos = [], nrms = [], uvs = [], cols = [], idx = [];
    for(var j = 0; j < ringFracs.length; j++){
      var f = ringFracs[j];
      var domeY = baseY + domeH * (1 - f * f);
      // Smooth analytical cabochon normal (zero pole degeneracy at f=0; ~15 deg gentle rim tilt catches sweeping glossy highlights).
      var tilt = .26 * f, nLen = Math.hypot(tilt, 1);
      var nRad = tilt / nLen, nUp = 1 / nLen;
      // Subtle radial jewel brightness (luminous center -> rich jewel rim depth).
      var lum = 0.92 - .10 * f * f;
      for(var i = 0; i <= seg; i++){
        var a = i / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
        // Match CircleGeometry.rotateX(-PI/2) mapping: local (x, y) -> world (x, 0, -y), uv = (uC + x*uRad, vC + y*vRad)
        pos.push(s.x + ca * discR * f, domeY, s.z - sa * discR * f);
        nrms.push(ca * nRad, nUp, -sa * nRad);
        uvs.push(uC + ca * f * uRad, vC + sa * f * vRad);
        cols.push(lum, lum, lum);
        if(j && i){
          var k0 = j * (seg + 1) + i;
          // Winding flipped for z = -sin(a) so normal points strictly +Y.
          idx.push(k0 - seg - 2, k0 - seg - 1, k0 - 1, k0 - seg - 1, k0, k0 - 1);
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    return geo;
  }
  // Soft dark grounded contact-AO ring seated directly beneath every tile rim.
  function reef3dTileContactAOGeo(s, R, crafted, isLight){
    var THREE = window.THREE; if(!THREE) return null;
    var aoR = R * (crafted ? 1.28 : 1.32);
    var g = new THREE.PlaneGeometry(aoR * 2, aoR * 2);
    g.rotateX(-Math.PI / 2);
    if(crafted) g.scale(1.02, 1, .95);
    var aoY = (s.y || 0) + (crafted ? -.060 : isLight ? .012 : .010);
    g.translate(s.x, aoY, s.z);
    return g;
  }
  // Subtle contact shadow seated on a "?" tile center directly beneath its floating "?" / star cube.
  function reef3dTileQShadowGeo(s){
    var THREE = window.THREE; if(!THREE) return null;
    var g = new THREE.PlaneGeometry(.92, .92);
    g.rotateX(-Math.PI / 2);
    g.translate(s.x, (s.y || 0) + .360, s.z);
    return g;
  }
  // Builds one board space: returns the still parts (merged with the scenery) and the painted top (tappable).
  // 'classic' is the sandy pedestal (decks, treasure, story, start); 'shell' is a fluted seashell (plain and ? spaces).
  function reef3dTile(style, s, R, top, icon, night, kit, M, mesh){
    if(kit.tileArt){
      return kit.tileArt.tile(style, s, R, top, icon, night, kit, M, mesh);
    }
    var THREE = window.THREE, parts = [], faceY = .345, faceR = R - .1;
    var base = mesh(new THREE.CylinderGeometry(R + .16, R + .26, .12, 40), M(night ? '#26302f' : '#cdb684'), s.x, .03, s.z); parts.push(base);
    if(style === 'shell'){
      var sh = new THREE.Shape(), n = 14, k;
      for(k = 0; k <= 96; k++){ var a = k / 96 * Math.PI * 2, rr = R * (1 + .07 * Math.cos(n * a)); sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      var g = new THREE.ExtrudeGeometry(sh, { depth: .26, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3, curveSegments: 4 }); g.rotateX(-Math.PI / 2);
      var shell = mesh(g, M(reef3dShade(top, -.12)), s.x, .02, s.z); parts.push(shell);
      faceY = .335; faceR = R - .06;
    } else {
      parts.push(mesh(reef3dTileGeo(R), M(reef3dShade(top, -.18)), s.x, 0, s.z));
      if(s.kind === 'deck'){   // a deck stands out from every other space: a raised gold rim
        var rim = mesh(new THREE.TorusGeometry(R - .04, .1, 8, 44), M(night ? '#e0b44a' : '#f2c14e'), s.x, .37, s.z); rim.rotation.x = Math.PI / 2; parts.push(rim);
      }
    }
    var face = new THREE.Mesh(new THREE.CircleGeometry(faceR, 48), new THREE.MeshToonMaterial({ map: style === 'classic' ? reef3dTileTex(top, icon, night, s.kind === 'deck' ? 'deck-' + s.item.state : s.kind) : reef3dTileTex2(style, top, icon, night, s.kind), gradientMap: kit.grad }));
    face.rotation.x = -Math.PI / 2; face.position.set(s.x, faceY, s.z);
    return { parts: parts, face: face };
  }
  function reef3dTileTex2(style, col, icon, night, kind){   // the seashell's painted top
    var key = style + col + icon + night + kind; if(R3tex[key]) return R3tex[key];
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), k;
    if(style === 'shell'){
      var gr = g.createRadialGradient(128, 128, 10, 128, 128, 130); gr.addColorStop(0, reef3dShade(col, .18)); gr.addColorStop(1, reef3dShade(col, -.02));
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 7;   // the shell's fluting: ridges fanning out to each wave of the edge
      for(k = 0; k < 14; k++){ var a = k / 14 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); g.lineTo(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126); g.stroke(); }
      g.fillStyle = night ? '#3c4a47' : '#fff6e2'; g.beginPath(); g.arc(128, 128, 66, 0, Math.PI * 2); g.fill();
    }
    if(icon === '?'){ reef3dDrawCenteredGlyph(g, '?', 128, 128, '900 140px "Baloo 2", system-ui, sans-serif', night ? '#ffe29a' : '#ffffff', 132); }
    else if(icon){ reef3dDrawCenteredGlyph(g, icon, 128, 128, (kind === 'plain' ? 86 : 112) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', '#155664', style === 'shell' ? 104 : 124); }
    else { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(128, 128, 24, 0, Math.PI * 2); g.fill(); }
    var t = new window.THREE.CanvasTexture(c); t.anisotropy = 4; return (R3tex[key] = t);
  }

  // Cartoon outline: a dark copy of each part, slightly larger and drawn inside-out.
  function reef3dOutline(obj, color, amt){
    var THREE = window.THREE, mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.BackSide }), list = [];
    obj.traverse(function(m){ if(m.isMesh && !m.userData.noOutline && !(m.material && m.material.transparent)) list.push(m); });
    list.forEach(function(m){
      // grow the copy around the part's own middle (not its pivot), so parts built away from their pivot (Lumi's lure
      // stalk, her belly) get an even line instead of a shifted dark shadow; tiny parts (teeth) get no line at all
      if(!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      var bs = m.geometry.boundingSphere, sc = m.scale, size = bs.radius * Math.min(Math.abs(sc.x), Math.abs(sc.y), Math.abs(sc.z));
      if(size < .09) return;
      var o = new THREE.Mesh(m.geometry, mat); o.scale.setScalar(1 + amt); o.position.copy(bs.center).multiplyScalar(-amt);
      o.userData.noOutline = true; o.raycast = function(){}; m.add(o);
    });
  }

  // The CC0 models (see REEF_MODELS), parsed once and given the same cartoon shading as everything else.
  var R3models = null;
  // The model data lives in its own file next to the page, fetched the first time the board opens.
  function reef3dModelData(){
    if(window.REEF_MODELS) return Promise.resolve(window.REEF_MODELS);
    return new Promise(function(res){
      var s = document.createElement('script'); s.src = 'reef-models.js'; s.async = true;
      s.onload = function(){ res(window.REEF_MODELS || {}); }; s.onerror = function(){ res({}); };
      document.head.appendChild(s);
    });
  }
  function reef3dModels(){
    if(R3models) return R3models;
    try { reefInstallGLTF(); } catch(e){}
    var THREE = window.THREE;
    if(!THREE.GLTFLoader) return (R3models = Promise.resolve({}));
    var loader = new THREE.GLTFLoader();
    R3models = reef3dModelData().then(function(data){
      var packed = data || {}, keys = Object.keys(packed), ready = {}, at = 0, started = performance.now();
      return new Promise(function(resolve){
        function next(){
          if(at >= keys.length){ reef3dLoadPerf.modelLoadMs = performance.now() - started; R3.modelsReady = ready; resolve(ready); return; }
          var k = keys[at++], t0 = performance.now(), done = false;
          function finish(g){
            if(done) return; done = true;
            reef3dLoadPerf.modelCount++;
            if(g) ready[k] = g; else reef3dLoadPerf.modelFailures++;
            // One model per browser task lets input and painting run between large GLB parses.
            setTimeout(next, 0);
          }
          try {
            var s = atob(packed[k]), u = new Uint8Array(s.length);
            for(var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
            reef3dLoadPerf.modelDecodeMs += performance.now() - t0;
            t0 = performance.now();
            loader.parse(u.buffer, '', function(g){ finish(g); }, function(){ finish(null); });
            reef3dLoadPerf.modelParseMs += performance.now() - t0;
          } catch(e){ finish(null); }
        }
        next();
      });
    });
    return R3models;
  }
  // A ready-to-place copy of a model, scaled to the given height, sitting on y = 0.
  function reef3dModel(models, name, height, grad, tint){
    var THREE = window.THREE, g = models && models[name]; if(!g) return null;
    var root = THREE.SkeletonUtils && g.animations && g.animations.length ? THREE.SkeletonUtils.clone(g.scene) : g.scene.clone(true);
    root.traverse(function(m){
      if(!m.isMesh) return;
      var mats = Array.isArray(m.material) ? m.material : [m.material];
      var out = mats.map(function(src){
        // model colours are stored as linear light; this page draws without colour conversion, so convert them
        var col = src.color ? src.color.clone() : new THREE.Color('#ffffff');
        if(!/fish|dolphin|whale|manta/.test(name)) col.convertLinearToSRGB(); // the converted fish already hold display colours
        if(tint) col.lerp(new THREE.Color(tint), .35);
        return new THREE.MeshToonMaterial({ color: col, map: src.map || null, gradientMap: grad, skinning: !!m.isSkinnedMesh, vertexColors: !!src.vertexColors, transparent: !!src.transparent, opacity: src.opacity });
      });
      m.material = Array.isArray(m.material) ? out : out[0];
      m.castShadow = true; m.receiveShadow = true;
      if(m.isSkinnedMesh) m.frustumCulled = false; // its bounds are measured in the rest pose
    });
    var box = new THREE.Box3().setFromObject(root), size = new THREE.Vector3(); box.getSize(size);
    var k = height / (size.y || 1); root.scale.setScalar(k);
    var holder = new THREE.Group(); holder.add(root);
    root.position.set(-(box.min.x + size.x / 2) * k, -box.min.y * k, -(box.min.z + size.z / 2) * k);
    holder.userData.gltf = g; holder.userData.root = root;
    return holder;
  }

  /* ---------- Baked lighting ----------
     The scenery never moves and neither do the lights' directions, so the light each corner of each shape
     receives is worked out once, when the board is built, and stored as that corner's colour. The iPad then
     draws scenery with no lighting maths and no shadow maps: the single biggest cost on a tablet's graphics chip.
     The bake uses the same sky light, sun and three cartoon light bands as the live toon material, so it looks
     the same; contact shadows are soft painted blobs instead of a shadow map. */
  function reef3dRig(scene){
    var THREE = window.THREE, rig = { sky: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), dir: new THREE.Vector3(6, 18, 10).normalize() };
    scene.children.forEach(function(l){
      if(l.isHemisphereLight){ rig.sky.copy(l.color).multiplyScalar(l.intensity); rig.ground.copy(l.groundColor).multiplyScalar(l.intensity); }
      if(l.isDirectionalLight) rig.sun.copy(l.color).multiplyScalar(l.intensity);
    });
    return rig;
  }
  // The toon material's three bands (see reef3dKit's gradient), with the edges softened a little: a bake stores
  // light per corner, and hard steps between corners would look jagged on low-detail shapes.
  function reef3dBand(d){
    var c = d * .5 + .5, sm = function(e0, e1, x){ var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    return .416 + (.706 - .416) * sm(.21, .29, c) + (1 - .706) * sm(.46, .54, c);
  }
  // Writes lit colour into a world-space geometry's colour attribute: albedo × (sky + sun band) × ground shade + glow.
  function reef3dBakeGeo(g, mat, rig, opts){
    var THREE = window.THREE, pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
    var old = mat.vertexColors && g.attributes.color, out = new Float32Array(n * 3), v = new THREE.Vector3(), c = new THREE.Color();
    var alb = mat.color || new THREE.Color(1, 1, 1), em = mat.emissive || null, ao = !(opts && opts.noAO), unlit = !!mat.isMeshBasicMaterial;
    for(var i = 0; i < n; i++){
      if(unlit){ c.copy(alb); if(old){ c.r *= old.getX(i); c.g *= old.getY(i); c.b *= old.getZ(i); } out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b; continue; }
      v.fromBufferAttribute(nor, i); var len = v.length(); if(len) v.multiplyScalar(1 / len);
      var up = v.y * .5 + .5, band = reef3dBand(v.dot(rig.dir));
      c.r = rig.ground.r + (rig.sky.r - rig.ground.r) * up + rig.sun.r * band;
      c.g = rig.ground.g + (rig.sky.g - rig.ground.g) * up + rig.sun.g * band;
      c.b = rig.ground.b + (rig.sky.b - rig.ground.b) * up + rig.sun.b * band;
      // fake ambient occlusion: shapes darken toward the sea floor, the way crevices and undersides would
      // (tops that face the open water stay bright; sides and undersides near the sand get the shade)
      if(ao){ var y = pos.getY(i), t = Math.min(1, Math.max(0, (y + .1) / 1.5)), sh = .78 + .22 * t * t * (3 - 2 * t), open = Math.max(0, v.y); c.multiplyScalar(sh + (1 - sh) * open * open); }
      // Compress bright illumination before applying pigment. Per-channel
      // framebuffer clipping otherwise turns pale roofs and coral chalk white.
      var peak=Math.max(c.r,c.g,c.b);
      if(peak>1) c.multiplyScalar((1+(peak-1)*.12)/peak);
      c.r *= alb.r; c.g *= alb.g; c.b *= alb.b;
      if(old){ c.r *= old.getX(i); c.g *= old.getY(i); c.b *= old.getZ(i); }
      if(em){ c.r += em.r; c.g += em.g; c.b += em.b; }
      out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  }
  // One unlit material per look (texture, see-through, two-sided); colour lives in the shapes, so almost all
  // scenery shares a handful of materials.
  function reef3dBakedMat(cache, src){
    var THREE = window.THREE, key = (src.map ? src.map.uuid : '-') + '|' + (src.transparent ? src.opacity : 1) + '|' + src.side;
    return cache[key] || (cache[key] = new THREE.MeshBasicMaterial({ vertexColors: true, map: src.map || null, transparent: !!src.transparent, opacity: src.transparent ? src.opacity : 1, side: src.side, depthWrite: !src.transparent }));
  }
  // Pieces of one mesh, one per material (models can carry several materials in one mesh).
  function reef3dPieces(m){
    var mats = Array.isArray(m.material) ? m.material : [m.material];
    var g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    if(!Array.isArray(m.material) || !g.groups.length) return [{ g: g, mat: mats[0] }];
    var THREE = window.THREE;
    return g.groups.map(function(gr){
      var part = new THREE.BufferGeometry();
      Object.keys(g.attributes).forEach(function(n){ var a = g.attributes[n], s = a.itemSize; part.setAttribute(n, new THREE.BufferAttribute(a.array.slice(gr.start * s, (gr.start + gr.count) * s), s)); });
      return { g: part, mat: mats[gr.materialIndex] || mats[0] };
    });
  }
  // Bake a group into world space and merge it into a few big meshes, cut into sections along the path so the
  // sections off screen are skipped entirely.
  var REEF3D_CHUNK = 16;
  function reef3dMerge(root, rig, cache){
    var THREE = window.THREE, U = THREE.BufferGeometryUtils, buckets = {}, out = new THREE.Group(), ctr = new THREE.Vector3();
    if(!U){ out.add(root); return out; }
    root.updateMatrixWorld(true);
    root.traverse(function(m){
      if(!m.isMesh || m.isSkinnedMesh || !m.visible) return;
      var vis = true; m.traverseAncestors(function(a){ if(a.visible === false) vis = false; }); if(!vis) return;
      reef3dPieces(m).forEach(function(pc){
        var g = pc.g;
        g.applyMatrix4(m.matrixWorld);
        if(!g.attributes.normal) g.computeVertexNormals();
        reef3dBakeGeo(g, pc.mat, rig);
        var surfaced = typeof reef3dSurfaceGeometry === 'function' && reef3dSurfaceGeometry(g, m, pc.mat);
        Object.keys(g.attributes).forEach(function(n){ if(n !== 'position' && n !== 'color' && !(n === 'uv' && (pc.mat.map || surfaced)) && !(n === 'reefSurface' && surfaced)) g.deleteAttribute(n); });
        g.morphAttributes = {}; g.groups = [];
        g.computeBoundingBox(); g.boundingBox.getCenter(ctr);
        var ground = !!(m.userData && m.userData.reefGround);
        var mat = surfaced ? reef3dSurfaceMaterial(cache, pc.mat) : reef3dBakedMat(cache, pc.mat), key = (ground ? 'g:' : '') + mat.uuid + '@' + Math.floor(ctr.z / REEF3D_CHUNK) + ',' + Math.floor(ctr.x / REEF3D_CHUNK);
        var bucket = buckets[key] || (buckets[key] = { mat: mat, geos: [], ground: ground });
        bucket.geos.push(g);
      });
    });
    Object.keys(buckets).forEach(function(k){
      var b = buckets[k], merged = null;
      try { merged = U.mergeBufferGeometries(b.geos, false); } catch(e){}
      if(merged){ var mm = new THREE.Mesh(merged, b.mat); mm.matrixAutoUpdate = false; mm.renderOrder = b.mat.transparent ? 1 : 0; if(b.ground) mm.userData.reefGround = true; out.add(mm); }
      b.geos.forEach(function(g){ g.dispose(); });
    });
    return out;
  }
  // Swap a moving object's materials (a deck's coral, a ship's barrel) for baked, unlit ones. Its lighting is
  // baked where it stands; small sways don't change it enough to notice.
  function reef3dBakeObject(o, rig, cache){
    o.updateMatrixWorld(true);
    o.traverse(function(m){
      if(!m.isMesh || m.isSkinnedMesh || Array.isArray(m.material) || m.material.isMeshBasicMaterial) return;
      var g = m.geometry.clone(), world = g.clone();
      world.applyMatrix4(m.matrixWorld); if(!world.attributes.normal) world.computeVertexNormals();
      reef3dBakeGeo(world, m.material, rig);
      g.setAttribute('color', world.attributes.color); world.dispose();
      m.geometry = g; m.material = reef3dBakedMat(cache, m.material);
    });
  }
  // After baking, fuse an object's parts into one mesh per material (in the object's own space, so it can still
  // sway, spin or bob as a whole). Parts the frame loop moves on their own (a clam's lid, a wheel, a glow) stay apart.
  function reef3dCompact(o){
    var THREE = window.THREE, U = THREE.BufferGeometryUtils; if(!U) return o;
    var keep = []; Object.keys(o.userData).forEach(function(k){ var v = o.userData[k]; if(k !== 'root' && v && v.isObject3D) keep.push(v); });   // 'root' is the whole model, not a moving part
    o.updateMatrixWorld(true);
    var inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), rel = new THREE.Matrix4(), buckets = {}, victims = [];
    o.traverse(function(m){
      if(!m.isMesh || m.isSkinnedMesh || Array.isArray(m.material) || !m.material.isMeshBasicMaterial || !m.material.vertexColors) return;
      for(var q = m; q && q !== o; q = q.parent) if(keep.indexOf(q) >= 0) return;
      var g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
      Object.keys(g.attributes).forEach(function(n){ if(n !== 'position' && n !== 'color' && !(n === 'uv' && m.material.map)) g.deleteAttribute(n); });
      g.morphAttributes = {}; g.groups = [];
      (buckets[m.material.uuid] = buckets[m.material.uuid] || { mat: m.material, geos: [] }).geos.push(g); victims.push(m);
    });
    if(victims.length < 2) return o;
    var made = [];
    Object.keys(buckets).forEach(function(k){
      var b = buckets[k], merged = null; try { merged = U.mergeBufferGeometries(b.geos, false); } catch(e){}
      if(!merged) return; var mm = new THREE.Mesh(merged, b.mat); mm.userData.space = o.userData.space; made.push(mm);
    });
    if(made.length !== Object.keys(buckets).length) return o;   // something wouldn't merge: leave the object as it was
    victims.forEach(function(m){ m.parent.remove(m); });
    made.forEach(function(mm){ o.add(mm); });
    return o;
  }
  // Unlit sand: its baked colour, plus the caustic pattern added as light (a texture lookup and an add per pixel).
  function reef3dSandMat(caus, glow){
    var THREE = window.THREE, m = new THREE.MeshBasicMaterial({ vertexColors: true, map: caus });
    m.onBeforeCompile = function(sh){
      sh.uniforms.causGlow = { value: glow };
      sh.fragmentShader = 'uniform vec3 causGlow;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', '')
        .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb += texture2D( map, vUv ).rgb * causGlow;');
    };
    return m;
  }
  // Soft round shadows painted on the sand: one texture, all the still ones merged into a single draw.
  var R3haloTex = null;
  function reef3dBlobTex(light, crisp){   // dark for shadows, white for glows
    var THREE = window.THREE, c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), k = light ? '255,255,255' : '0,0,0';
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if(crisp){ gr.addColorStop(0, 'rgba(' + k + ',1)'); gr.addColorStop(.52, 'rgba(' + k + ',.64)'); gr.addColorStop(1, 'rgba(' + k + ',0)'); }
    else { gr.addColorStop(0, 'rgba(' + k + ',.55)'); gr.addColorStop(.55, 'rgba(' + k + ',.28)'); gr.addColorStop(1, 'rgba(' + k + ',0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function reef3dBlobMat(tex, night){
    var THREE = window.THREE;
    return new THREE.MeshBasicMaterial({ map: tex, color: night ? '#06141a' : '#3a4a40', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  function reef3dBlobs(list, mat, groundY){   // list of [x, z, radius]
    var THREE = window.THREE, U = THREE.BufferGeometryUtils, geos = [];
    list.forEach(function(b){ var g = new THREE.PlaneGeometry(b[2] * 2, b[2] * 2); g.rotateX(-Math.PI / 2); g.translate(b[0], groundY(b[0], b[1]) + .05, b[1]); geos.push(g); });
    if(!geos.length || !U) return null;
    var m = new THREE.Mesh(U.mergeBufferGeometries(geos, false), mat); m.renderOrder = 2; m.matrixAutoUpdate = false; return m;
  }
  // Where an object sits on the sand: a blob under its middle, sized to its footprint.
  // A thin column of rising air bubbles. Each grows and wobbles more as it rises, and shrinks away at the top.
  function reef3dPlume(p, d, t){
    var u = p.userData, n = p.count;
    for(var i = 0; i < n; i++){
      var h = (t * .8 + i / n * u.h) % u.h, w = .12 + h * .03;
      d.position.set(u.x + Math.sin(t * 2.1 + i * 1.7) * w, u.y + h, u.z + Math.cos(t * 1.7 + i * 2.3) * w * .7);
      d.scale.setScalar((.55 + (i % 3) * .22) * (1 + h / u.h * .4) * Math.min(1, (u.h - h) / .8)); d.updateMatrix(); p.setMatrixAt(i, d.matrix);
    }
    p.instanceMatrix.needsUpdate = true;
  }
  function reef3dFootprint(o, list){
    var THREE = window.THREE, box = new THREE.Box3().setFromObject(o), size = new THREE.Vector3(), c = new THREE.Vector3();
    if(box.isEmpty()) return; box.getSize(size); box.getCenter(c);
    if(size.y < .45 || box.min.y > 1.2 || Math.max(size.x, size.z) > 10) return;   // flat tiles, floating things, huge pieces
    list.push([c.x, c.z, Math.min(3.2, Math.max(size.x, size.z) * .62)]);
  }

  // Vibrant Mario Party 8 sunlit cerulean-to-sky-blue dome for outdoor boards (dense horizon rings so the
  // low follow-camera sky band shows a rich blue gradient) + vaulted subterranean indigo-slate cavern dome for caves
  // + warm sunlit horizon glow & soft coastal cumulus clouds for Coral Cove Day.
  function reef3dSkyDome(THREE, region, night, fogCol){
    var rid = region && region.id, isCaves = rid === 'caves', isOutdoor = !!region && !isCaves;
    var isCoveDay = !region && !night;
    var domeR = isCaves ? 92 : 185, segLon = isCaves ? 64 : 48;
    // Pack latitude rings densely across the visible low-camera sky band (-12 deg .. +24 deg) for silky gradients.
    var latDegs = [
      -90, -45, -18, -12.0, -9.5, -8.0, -6.5, -5.0, -4.0, -3.0, -2.0, -1.2, -0.5,
      0.0, 0.7, 1.4, 2.2, 3.0, 3.9, 4.9, 6.0, 7.2, 8.6, 10.2, 12.2, 15.0, 19.0, 25.0, 34.0, 48.0, 68.0, 90.0
    ];
    var nLat = latDegs.length, pos = [], cols = [], idx = [];
    var tmp = new THREE.Color(), v = new THREE.Vector3();
    var cFog = new THREE.Color(fogCol || '#a9e2ed');
    var sunDir = isCoveDay ? new THREE.Vector3(.42, .06, -.90).normalize() : new THREE.Vector3(.42, .30, .86).normalize();
    if(isCaves){
      // Vaulted subterranean indigo-slate cavern dome with soft stone arch ribs, stalactite ceiling contour & subtle bioluminescent shimmer.
      var cWater = new THREE.Color(night ? '#16283a' : '#4a7794');
      var cWall  = new THREE.Color(night ? '#18263b' : '#2f4566');
      var cMidC  = new THREE.Color(night ? '#111d30' : '#213350');
      var cVault = new THREE.Color(night ? '#0b1424' : '#16243d');
      var cRib   = new THREE.Color(night ? '#1e324a' : '#3a5478');
      var cAqua  = new THREE.Color('#64d6e6'), cAmeth = new THREE.Color('#8e78c8');
      for(var li = 0; li < nLat; li++){
        var phi = latDegs[li] * Math.PI / 180, cy = Math.sin(phi), cr = Math.cos(phi);
        for(var lo = 0; lo <= segLon; lo++){
          var th = lo / segLon * Math.PI * 2, vx = cr * Math.cos(th), vz = cr * Math.sin(th);
          pos.push(vx * domeR, cy * domeR, vz * domeR);
          var el = cy;
          // Soft undulating cave-rib vault arches & stalactite hanging shadow contour along the upper band
          var rib = .5 + .5 * Math.cos(th * 8 + Math.sin(th * 3) * .5);
          var archWave = Math.sin(th * 8) * .014 + Math.sin(th * 19 + 1.1) * .006;
          var eAdj = el + archWave;
          if(eAdj <= -.085){
            tmp.copy(cWater);
          } else if(eAdj < -.030){
            var k0 = (eAdj + .085) / .055;
            tmp.copy(cWater).lerp(cWall, k0 * k0 * (3 - 2 * k0));
          } else if(eAdj < .045){
            var k1 = (eAdj + .030) / .075;
            tmp.copy(cWall).lerp(cMidC, k1 * k1 * (3 - 2 * k1));
          } else {
            var k2 = Math.min(1, (eAdj - .045) / .14);
            tmp.copy(cMidC).lerp(cVault, Math.pow(k2, .85));
          }
          // Subtle sculpted stone arch ribs & stalactite depth shading across the visible vault
          var ribBand = Math.max(0, Math.min(1, (el + .04) / .07)) * (1 - Math.max(0, (el - .32) / .5));
          tmp.lerp(cRib, rib * .16 * ribBand);
          // Delicate bioluminescent aqua/amethyst mineral bounce along cavern seams
          var shimmer = Math.pow(.5 + .5 * Math.sin(th * 14 + el * 46), 6) * ribBand;
          if(shimmer > .01) tmp.lerp(Math.sin(th * 5) > 0 ? cAqua : cAmeth, shimmer * (night ? .16 : .12));
          cols.push(tmp.r, tmp.g, tmp.b);
        }
      }
    } else if(isCoveDay){
      // Sunlit Coral Cove coastal sky dome: warm golden-apricot horizon glow lifting cleanly from the water line
      // (-7.5 deg) into luminous pastel sky-aqua & bright coastal cerulean across the visible upper sky band (MIN-15).
      var cMistC  = cFog.clone().lerp(new THREE.Color('#bcebf2'), .35);
      var cWarmH  = new THREE.Color('#ffefc6');
      var cPastel = new THREE.Color('#9ce0f8');
      var cMidSky = new THREE.Color('#4dbaf0');
      var cUpSky  = new THREE.Color('#2794e2');
      var cZenC   = new THREE.Color('#1672cf');
      var cSunBl  = new THREE.Color('#ffe8b2');
      for(var liC = 0; liC < nLat; liC++){
        var phiC = latDegs[liC] * Math.PI / 180, cyC = Math.sin(phiC), crC = Math.cos(phiC);
        for(var loC = 0; loC <= segLon; loC++){
          var thC = loC / segLon * Math.PI * 2, vxC = crC * Math.cos(thC), vzC = crC * Math.sin(thC);
          pos.push(vxC * domeR, cyC * domeR, vzC * domeR);
          v.set(vxC, cyC, vzC);
          var elC = cyC;
          if(elC <= -.135){
            tmp.copy(cMistC);
          } else if(elC < -.072){
            var t0 = (elC + .135) / .063;
            tmp.copy(cMistC).lerp(cWarmH, t0 * t0 * (3 - 2 * t0));
          } else if(elC < -.008){
            var t1 = (elC + .072) / .064;
            tmp.copy(cWarmH).lerp(cPastel, t1 * t1 * (3 - 2 * t1));
          } else if(elC < .068){
            var t2 = (elC + .008) / .076;
            tmp.copy(cPastel).lerp(cMidSky, t2 * t2 * (3 - 2 * t2));
          } else if(elC < .240){
            var t3 = (elC - .068) / .172;
            tmp.copy(cMidSky).lerp(cUpSky, t3 * t3 * (3 - 2 * t3));
          } else {
            var t4 = Math.min(1, (elC - .240) / .55);
            tmp.copy(cUpSky).lerp(cZenC, Math.pow(t4, .85));
          }
          // Warm coastal sun-kissed horizon glow across the lower sky band (no blank pale hazy strip)
          var sDotC = Math.max(0, v.dot(sunDir));
          var hBandC = Math.exp(-Math.pow((elC + .068) / .062, 2));
          var sBloom = Math.pow(sDotC, 2.8) * (.22 + .78 * hBandC) * Math.max(0, Math.min(1, (elC + .14) / .07));
          tmp.lerp(cSunBl, Math.min(.42, sBloom * .34 + hBandC * .12));
          cols.push(tmp.r, tmp.g, tmp.b);
        }
      }
    } else {
      // Warm luminous Super Mario Party Jamboree sunlit coastal horizon haze melting smoothly into
      // airy pastel sky-cerulean overhead (zero hard saturated blue edge right at the horizon).
      var warmSun = !night && (isOutdoor || !region);
      var cHoriz = night ? new THREE.Color('#1a3b56')
        : isOutdoor ? cFog.clone().lerp(new THREE.Color(rid === 'town' || rid === 'beach' ? '#fff3d2' : '#f7f4dc'), .22)
        : cFog.clone().lerp(new THREE.Color('#f7f4de'), .26);
      var cHazeMid = night ? new THREE.Color('#183654')
        : isOutdoor ? new THREE.Color(rid === 'town' ? '#e2eedf' : rid === 'beach' ? '#e5f0e2' : rid === 'lagoon' ? '#d8efe4' : rid === 'patterns' ? '#dcefe6' : '#d8edf4')
        : new THREE.Color('#d2f0eb');
      var cLow = night ? new THREE.Color('#132f52')
        : isOutdoor ? new THREE.Color(rid === 'beach' ? '#6cccf6' : rid === 'captain' ? '#62c2f2' : rid === 'lagoon' ? '#68caf4' : '#6ecaf6')
        : new THREE.Color('#74d4ee');
      var cUpper = night ? new THREE.Color('#0c2142')
        : isOutdoor ? new THREE.Color(rid === 'beach' ? '#2e9ee8' : rid === 'captain' ? '#2894e2' : rid === 'lagoon' ? '#2e9ee6' : '#30a0e8')
        : new THREE.Color('#44b2e2');
      var cZen = night ? new THREE.Color('#07142e')
        : isOutdoor ? new THREE.Color('#1674d0')
        : new THREE.Color('#2a92d4');
      var cGlow = new THREE.Color(night ? '#224f6e' : '#fff2c8');
      for(var li2 = 0; li2 < nLat; li2++){
        var phi2 = latDegs[li2] * Math.PI / 180, cy2 = Math.sin(phi2), cr2 = Math.cos(phi2);
        for(var lo2 = 0; lo2 <= segLon; lo2++){
          var th2 = lo2 / segLon * Math.PI * 2, vx2 = cr2 * Math.cos(th2), vz2 = cr2 * Math.sin(th2);
          pos.push(vx2 * domeR, cy2 * domeR, vz2 * domeR);
          v.set(vx2, cy2, vz2);
          var el2 = cy2;
          if(el2 <= .004){
            tmp.copy(cFog).lerp(cHoriz, warmSun ? Math.max(0, (el2 + .030) / .034) : .55);
          } else if(el2 < .072){
            var s0 = (el2 - .004) / .068;
            tmp.copy(cHoriz).lerp(cHazeMid, s0 * s0 * (3 - 2 * s0));
          } else if(el2 < .165){
            var s1 = (el2 - .072) / .093;
            tmp.copy(cHazeMid).lerp(cLow, s1 * s1 * (3 - 2 * s1));
          } else if(el2 < .340){
            var s1b = (el2 - .165) / .175;
            tmp.copy(cLow).lerp(cUpper, s1b * s1b * (3 - 2 * s1b));
          } else {
            var s2 = Math.min(1, (el2 - .340) / .50);
            tmp.copy(cUpper).lerp(cZen, Math.pow(s2, .85));
          }
          if(!night && el2 > -.015){
            var sunDot = Math.max(0, v.dot(sunDir));
            var horizBand = Math.exp(-Math.pow((el2 - .032) / .085, 2));
            var sunAmt = Math.pow(sunDot, 3.6) * (.22 + .78 * horizBand) * Math.min(1, (el2 + .015) / .06);
            var warmVeil = horizBand * (isOutdoor ? .12 : .10);
            tmp.lerp(cGlow, Math.min(.38, sunAmt * .30 + warmVeil));
          }
          cols.push(tmp.r, tmp.g, tmp.b);
        }
      }
    }
    var rowW = segLon + 1;
    for(var rj = 0; rj < nLat - 1; rj++){
      for(var cj = 0; cj < segLon; cj++){
        var a = rj * rowW + cj, b = a + 1, c = a + rowW, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    var mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: isCaves });
    var dome = new THREE.Mesh(geo, mat);
    dome.name = isCaves ? 'Subterranean cavern vault dome' : 'Sunlit sky dome';
    dome.userData.isCavesVault = isCaves;
    dome.renderOrder = isCaves ? 0 : -10;
    dome.frustumCulled = false;
    dome.raycast = function(){};
    // Soft sculpted sunlit coastal cumulus cloud ring on Coral Cove Day (2 InstancedMeshes, fog: false, depthWrite: false,
    // renderOrder: -8 -> always cleanly behind whale, arch, sailboat & pavilion, and hidden on overhead Map zoom).
    if(isCoveDay && THREE.InstancedMesh){
      var cloudGrp = new THREE.Group();
      cloudGrp.name = 'Coral Cove coastal cumulus clouds';
      cloudGrp.userData.hideOnZoom = true;
      var baseSph = new THREE.SphereGeometry(1, 10, 7);
      var bp = baseSph.attributes.position, bi = baseSph.index;
      var cTop = new THREE.Color('#fffef9'), cMid = new THREE.Color('#fff7ea'), cBot = new THREE.Color('#a6cee8'), cTmp = new THREE.Color();
      var lobes = [
        [ 0.00,  0.56,  0.00, 2.65, 1.72, 1.85],
        [-2.25,  0.20,  0.22, 2.10, 1.32, 1.55],
        [ 2.35,  0.26, -0.18, 2.20, 1.38, 1.62],
        [-3.95, -0.14, -0.08, 1.55, 0.90, 1.24],
        [ 4.05, -0.12,  0.12, 1.58, 0.94, 1.26],
        [ 0.88,  0.92, -0.40, 1.80, 1.28, 1.42],
        [-0.98,  0.80,  0.34, 1.64, 1.18, 1.36],
        [ 0.12, -0.22,  0.48, 2.85, 0.72, 1.50]
      ];
      var mPos = [], mCol = [], mIdx = [];
      for(var ci = 0; ci < lobes.length; ci++){
        var lb = lobes[ci], vBase = mPos.length / 3;
        for(var vi = 0; vi < bp.count; vi++){
          var sx = bp.getX(vi), sy = bp.getY(vi), sz = bp.getZ(vi);
          mPos.push(lb[0] + sx * lb[3], lb[1] + sy * lb[4], lb[2] + sz * lb[5]);
          if(sy >= 0) cTmp.copy(cMid).lerp(cTop, Math.pow(sy, .72));
          else cTmp.copy(cMid).lerp(cBot, Math.pow(-sy, .82));
          mCol.push(cTmp.r, cTmp.g, cTmp.b);
        }
        if(bi){ for(var ii = 0; ii < bi.count; ii++) mIdx.push(vBase + bi.getX(ii)); }
      }
      baseSph.dispose();
      var cGeo = new THREE.BufferGeometry();
      cGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
      cGeo.setAttribute('color', new THREE.Float32BufferAttribute(mCol, 3));
      if(mIdx.length) cGeo.setIndex(mIdx);
      cGeo.computeBoundingSphere();
      var matNear = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, fog: false, depthWrite: false });
      var matFar  = new THREE.MeshBasicMaterial({ color: '#f7fbff', vertexColors: true, fog: false, depthWrite: false });
      var nearMats = [], farMats = [], dummy = new THREE.Object3D();
      var cloudCount = 26;
      for(var k = 0; k < cloudCount; k++){
        var farL = (k % 2 === 1);
        var ang = (k + .22 + ((k * 7) % 3 - 1) * .07) * Math.PI * 2 / cloudCount;
        var rad = farL ? (164 + ((k * 5) % 5) * 1.8) : (148 + ((k * 3) % 5) * 1.8);
        var hPat = [.14, .68, .34, .82, .48, .92, .22][k % 7];
        // Span Coral Cove's visible follow-camera sky band (-0.036 .. +0.052 -> py ~ 20..108 across the upper sky!)
        var elCl = farL ? (-.036 + hPat * .058) : (-.010 + hPat * .060);
        var sc = (farL ? 3.55 : 2.75) * (.86 + .28 * ((k * 11) % 5) / 4);
        dummy.position.set(Math.cos(ang) * rad, Math.sin(elCl) * rad, Math.sin(ang) * rad);
        dummy.rotation.set(0, -ang + Math.PI * .5, 0);
        dummy.scale.set(sc * 1.12, sc * .78, sc * .85);
        dummy.updateMatrix();
        (farL ? farMats : nearMats).push(dummy.matrix.clone());
      }
      if(nearMats.length){
        var imN = new THREE.InstancedMesh(cGeo, matNear, nearMats.length);
        for(var ni = 0; ni < nearMats.length; ni++) imN.setMatrixAt(ni, nearMats[ni]);
        imN.instanceMatrix.needsUpdate = true;
        imN.renderOrder = -8; imN.frustumCulled = false; imN.raycast = function(){};
        cloudGrp.add(imN);
      }
      if(farMats.length){
        var imF = new THREE.InstancedMesh(cGeo, matFar, farMats.length);
        for(var fi = 0; fi < farMats.length; fi++) imF.setMatrixAt(fi, farMats[fi]);
        imF.instanceMatrix.needsUpdate = true;
        imF.renderOrder = -9; imF.frustumCulled = false; imF.raycast = function(){};
        cloudGrp.add(imF);
      }
      dome.add(cloudGrp);
    }
    return dome;
  }
  // True 3D horizontal-cross-section path ribbon for elevated routes (Giant Spiral Lighthouse),
  // avoiding squashed TubeGeometry tilt distortion on steep climbs.
  function reef3dElevatedRibbonGeo(THREE, curve, segs, halfW, thick){
    var pos = [], idx = [], n = Math.max(8, segs);
    for(var i = 0; i <= n; i++){
      var u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      var hl = Math.hypot(t.x, t.z) || 1, nx = -t.z / hl, nz = t.x / hl;
      var lx = p.x - nx * halfW, lz = p.z - nz * halfW, rx = p.x + nx * halfW, rz = p.z + nz * halfW;
      var yTop = p.y + thick * .5, yBot = p.y - thick * .5;
      // 4 ring verts per slice: top-left, top-right, bottom-right, bottom-left
      pos.push(lx, yTop, lz, rx, yTop, rz, rx, yBot, rz, lx, yBot, lz);
      if(i > 0){
        var b0 = (i - 1) * 4, b1 = i * 4;
        // top face
        idx.push(b0, b1, b0 + 1, b0 + 1, b1, b1 + 1);
        // right side
        idx.push(b0 + 1, b1 + 1, b0 + 2, b0 + 2, b1 + 1, b1 + 2);
        // left side
        idx.push(b0 + 3, b1 + 3, b0, b0, b1 + 3, b1);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Gentle sunlit vertex-shaded humpback/blue whale for Coral Cove's upper water channel:
  // rounded whale brow & plump baleen throat pleats, low smooth rounded dorsal hump (no shark fin or finlets),
  // long sweeping curved pectoral flippers, and a broad horizontal twin-lobe crescent whale fluke.
  function reef3dBuildReefWhale(THREE, fogCol){
    var g = new THREE.Group();
    var cMist  = new THREE.Color(fogCol || '#79cce2');
    var cSun   = new THREE.Color('#96ddf8');
    var cCrown = new THREE.Color('#4f94d8');
    var cFlank = new THREE.Color('#4e86c6');
    var cAqua  = new THREE.Color('#94d8e8');
    var cBelly = new THREE.Color('#eef9f4');
    var cPleat = new THREE.Color('#c8e8ec');
    var tmp = new THREE.Color();
    var mat = new THREE.MeshLambertMaterial({
      vertexColors: true, emissive: '#3b98be', emissiveIntensity: .34, fog: true
    });
    // 1. Sculpted organic humpback/blue whale body (rounded brow at +Z = +4.10, peduncle at -Z = -3.30)
    var nU = 48, nV = 30, pos = [], cols = [], idx = [], TAU = Math.PI * 2;
    function bodyProfile(u){
      var z = 4.10 - u * 7.40;
      var uc = Math.max(0, Math.min(1, u));
      // Full, rounded hemispherical whale brow/rostrum at u=0..0.28 tapering smoothly into a streamlined peduncle
      var domeFront = Math.pow(Math.sin(Math.pow(uc, .56) * Math.PI), .72);
      var tailTaper = 1 - .62 * Math.pow(uc, 1.55);
      var browFull = Math.exp(-Math.pow((uc - .16) / .16, 2)) * .22;
      var jawFull = Math.exp(-Math.pow((uc - .24) / .20, 2)) * .24;
      // Low, smooth, rounded humpback dorsal hump far back along the spine (~64% back, height ~0.22u)
      var dorsalHump = Math.exp(-Math.pow((uc - .63) / .085, 2)) * .22;
      var rx = Math.max(.032, (.96 * domeFront + browFull) * (1 - .46 * Math.pow(uc, 1.55)));
      var ryTop = Math.max(.032, .70 * domeFront * tailTaper + Math.exp(-Math.pow((uc - .14) / .15, 2)) * .14 + dorsalHump);
      var ryBot = Math.max(.030, .62 * domeFront * tailTaper + jawFull);
      var ySp = .18 * Math.sin(uc * Math.PI) - .14 * uc * uc;
      return { z: z, rx: rx, ryTop: ryTop, ryBot: ryBot, ySp: ySp, dorsalHump: dorsalHump };
    }
    for(var iu = 0; iu <= nU; iu++){
      var u = iu / nU, bp = bodyProfile(u);
      for(var iv = 0; iv <= nV; iv++){
        var a = iv / nV * TAU, ca = Math.cos(a), sa = Math.sin(a);
        // Rounded whale brow & full ventral baleen throat; slightly narrower dorsal ridge along the hump
        var humpPinch = (sa > .35 && bp.dorsalHump > .01) ? (1 - .28 * bp.dorsalHump * (sa - .35)) : 1;
        var rxAdj = bp.rx * (1 + .06 * Math.cos(2 * a) * Math.sin(u * Math.PI)) * humpPinch;
        var vx = ca * rxAdj;
        var vy = bp.ySp + (sa >= 0 ? sa * bp.ryTop : sa * bp.ryBot);
        var vz = bp.z;
        pos.push(vx, vy, vz);
        // Smooth sunlit cerulean-to-pearl countershading (cetacean blue/humpback palette)
        if(sa > .48){
          var kTop = Math.min(1, (sa - .48) / .52);
          tmp.copy(cCrown).lerp(cSun, Math.pow(kTop, 1.3) * .56);
        } else if(sa > .02){
          var kUp = (sa - .02) / .46;
          tmp.copy(cFlank).lerp(cCrown, kUp * kUp * (3 - 2 * kUp));
        } else if(sa > -.28){
          var kMid = (sa + .28) / .30;
          tmp.copy(cAqua).lerp(cFlank, kMid * kMid * (3 - 2 * kMid));
        } else {
          var kBot = Math.min(1, (-.28 - sa) / .72);
          tmp.copy(cAqua).lerp(cBelly, Math.pow(kBot, .68));
          // Subtle soft baleen ventral throat pleats along lower jaw/chest
          if(u > .06 && u < .48){
            var pleatEnv = Math.sin((u - .06) / .42 * Math.PI) * Math.min(1, kBot * 1.4);
            var pleat = (.5 + .5 * Math.sin(a * 16.0)) * .28 * pleatEnv;
            tmp.lerp(cPleat, pleat);
          }
        }
        // Soft sunlit caustic shimmer on upper whale back (no shark spots, no gill slits)
        if(sa > .25 && u > .10 && u < .86){
          var shimmer = (.5 + .5 * Math.sin(u * 20.0 + Math.cos(a * 3.0) * .6)) * .14 * Math.min(1, (sa - .25) / .45);
          tmp.lerp(cSun, shimmer);
        }
        // Atmospheric underwater depth tinting matching Coral Cove's bright turquoise channel
        var mistAmt = .24 + .12 * u + (sa < 0 ? .05 : 0);
        tmp.lerp(cMist, Math.min(.42, mistAmt));
        cols.push(tmp.r, tmp.g, tmp.b);
      }
    }
    var stride = nV + 1;
    for(var ju = 0; ju < nU; ju++){
      for(var jv = 0; jv < nV; jv++){
        var a0 = ju * stride + jv, b0 = a0 + 1, c0 = a0 + stride, d0 = c0 + 1;
        idx.push(a0, c0, b0, b0, c0, d0);
      }
    }
    var bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    bodyGeo.setIndex(idx);
    bodyGeo.computeVertexNormals();
    g.add(new THREE.Mesh(bodyGeo, mat));

    // Helper: sculpted tapered 3D hydrofoil flipper/fluke with sunlit cerulean top & cream-aqua underside
    function buildFin(slices, cA, cB){
      var fPos = [], fCol = [], fIdx = [], ringN = 12, nS = slices.length;
      for(var k = 0; k < nS; k++){
        var sl = slices[k], uF = k / (nS - 1);
        for(var m = 0; m <= ringN; m++){
          var th = m / ringN * TAU, cth = Math.cos(th), sth = Math.sin(th);
          // Smooth hydrofoil cross-section along Z (chord) and perpendicular thickness
          var lx = sl.x + sl.nx * sth * sl.th;
          var ly = sl.y + sl.ny * sth * sl.th;
          var lz = sl.z + cth * sl.ch * .5;
          fPos.push(lx, ly, lz);
          var upMix = .5 + .5 * sth;
          tmp.copy(cB).lerp(cA, upMix).lerp(cSun, uF * .28 * upMix).lerp(cMist, .25 + .10 * uF);
          fCol.push(tmp.r, tmp.g, tmp.b);
        }
      }
      var fSt = ringN + 1;
      for(var fk = 0; fk < nS - 1; fk++){
        for(var fm = 0; fm < ringN; fm++){
          var p0 = fk * fSt + fm, p1 = p0 + 1, p2 = p0 + fSt, p3 = p2 + 1;
          fIdx.push(p0, p1, p2, p1, p3, p2);
        }
      }
      var fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
      fg.setAttribute('color', new THREE.Float32BufferAttribute(fCol, 3));
      fg.setIndex(fIdx);
      fg.computeVertexNormals();
      return new THREE.Mesh(fg, mat);
    }

    // 2. Iconic long sweeping curved humpback pectoral flippers (left & right, gently arched in buoyant glide)
    var fins = [];
    [-1, 1].forEach(function(side){
      var fp = new THREE.Group();
      fp.position.set(side * .82, -.24, 1.32);
      var slices = [];
      for(var k = 0; k <= 12; k++){
        var u = k / 12;
        var span = u * 2.68;
        var sweep = -Math.pow(u, 1.28) * 1.56 + .16 * Math.sin(u * Math.PI);
        var arch = -.18 * u - .32 * u * u + .12 * Math.sin(u * Math.PI);
        var chord = Math.max(.09, 1.06 * Math.pow(1 - u * .86, .78) + .16 * Math.sin(u * Math.PI));
        var thick = Math.max(.026, .135 * (1 - .78 * u));
        slices.push({ x: side * span, y: arch, z: sweep, ch: chord, th: thick, nx: 0, ny: 1 });
      }
      var fm = buildFin(slices, cCrown, cBelly);
      if(side < 0) fm.geometry.index.array.reverse(); // keep outward winding on mirrored side
      fm.geometry.computeVertexNormals();
      fp.add(fm);
      g.add(fp);
      fins.push(fp);
    });

    // 3. Broad, unmistakable HORIZONTAL twin-lobe crescent whale fluke spanning ±X (with median notch)
    var tailPivot = new THREE.Group();
    tailPivot.position.set(0, -.12, -3.22);
    [-1, 1].forEach(function(side){
      var lobe = [];
      for(var tk = 0; tk <= 12; tk++){
        var tu = tk / 12;
        // Wide horizontal crescent lobe (±2.42u half-span = 4.84u total horizontal whale fluke width)
        var spanX = side * (tu * 2.42);
        // Swept crescent center-chord curving smoothly back from peduncle with central median notch at tu=0
        var zLead = -.08 - Math.pow(tu, 1.18) * 1.18;
        var zTrail = -.62 - Math.sin(tu * Math.PI) * .96 - Math.pow(tu, 1.55) * .68;
        var zMid = (zLead + zTrail) * .5;
        var chord = Math.max(.09, Math.abs(zLead - zTrail));
        var thick = Math.max(.024, .14 * (1 - .82 * tu));
        var glideY = .14 * tu * tu - .04 * Math.sin(tu * Math.PI);
        lobe.push({ x: spanX, y: glideY, z: zMid, ch: chord, th: thick, nx: 0, ny: 1 });
      }
      var flMesh = buildFin(lobe, cCrown, cBelly);
      if(side < 0) flMesh.geometry.index.array.reverse();
      flMesh.geometry.computeVertexNormals();
      tailPivot.add(flMesh);
    });
    tailPivot.rotation.x = -.30; // gentle natural horizontal crescent fluke glide angle (4:1 horizontal silhouette)
    g.add(tailPivot);

    // 4. Gentle friendly whale eyes tucked near the jaw corner with soft pearl catchlights
    var eyeMat = new THREE.MeshLambertMaterial({ color: '#1b3e64', emissive: '#102840', emissiveIntensity: .2, fog: true });
    var glintMat = new THREE.MeshBasicMaterial({ color: '#f4feff', fog: true });
    [-1, 1].forEach(function(side){
      var eye = new THREE.Mesh(new THREE.SphereGeometry(.095, 10, 8), eyeMat);
      eye.position.set(side * .88, -.02, 2.38);
      var glint = new THREE.Mesh(new THREE.SphereGeometry(.034, 6, 5), glintMat);
      glint.position.set(side * .95, .02, 2.42);
      g.add(eye, glint);
    });

    // Keep roll nearly level (+0.05 rad) so horizontal twin-lobe crescent whale flukes always read cleanly horizontal!
    g.rotation.z = .05;
    g.scale.setScalar(.96);
    g.traverse(function(o){ o.raycast = function(){}; });
    g.userData.tailPivot = tailPivot;
    g.userData.finL = fins[0];
    g.userData.finR = fins[1];
    g.userData.isReefWhale = true;
    return g;
  }

  function reef3dBuild(host, zones, models){
    var buildStarted = performance.now();
    var THREE = window.THREE, night = reefNight(), region = zones.region || null;
    var crafted = ReefCraftedWorld.enabled(region, night);
    var spaces = region && typeof window.regionBoardSpaces === 'function' && window.regionBoardSpaces(zones) || reef3dSpaces(zones, region);
    var wrap = document.createElement('div');
    wrap.className = 'r3 ' + (night ? 'night' : 'day');
    if(crafted) wrap.dataset.art = 'crafted';
    var hudIcon = region ? ((typeof REGION_BOARD_META === 'object' && REGION_BOARD_META[region.id] && REGION_BOARD_META[region.id].icon) || 'island') : (night ? 'moon' : 'island');
    var hudName = region ? region.name : (night ? 'Midnight Wreck' : 'Coral Cove');
    wrap.innerHTML = '<canvas class="r3-canvas" aria-hidden="true"></canvas><div class="r3-labels"></div>' +
      '<button type="button" class="r3-mapbtn" data-r3-map>'+ccIcon('map')+'<span>Treasure map</span></button>' +
      reefMusicButtonHTML('r3-musicbtn') +
      '<button type="button" class="r3-themebtn" data-r3-theme aria-label="'+(night ? 'Switch to the sunlit reef (light mode)' : 'Switch to the midnight wreck (dark mode)')+'">'+ccIcon(night ? 'sun' : 'moon')+'</button>' +
      '<div class="r3-bubble" aria-live="polite" hidden></div>' +
      '<div class="r3-hud" aria-live="polite"><span class="r3-hud-place">' + ccIcon(hudIcon) + '<b>' + esc(hudName) + '</b></span><span class="r3-hud-shells" title="Shells">🐚 <b>0</b></span><span class="r3-hud-pearls" title="Golden pearls">🫧 <b>0</b></span></div>' +
      '<button type="button" class="r3-modebtn" data-r3-mode hidden></button>' +
      '<button type="button" class="r3-voybtn" data-r3-voy hidden>' + ccIcon('anchor') + '<span></span></button>' +   // Captain's Deck, while today's voyage has legs left (deck.js)
      '<button type="button" class="r3-gamesbtn" data-r3-games aria-label="Minigame corner">'+ccIcon('games')+'</button>';
    var canvas = wrap.querySelector('canvas');
    // Keep canvas MSAA enabled for smooth silhouettes across boards and encounter interiors.
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; // redrawn only when things move (see reef3dFrame)
    var scene = new THREE.Scene();
    var regionGround = region && { town:'#dfc9a9', lagoon:'#97d3ae', caves:'#8385ae', patterns:'#b6c8df', beach:'#f3dfb5', light:'#c2d0b5', captain:'#c69b76' }[region.id];
    var regionSky = region && { town:'#f3e7cf', lagoon:'#e7f0de', caves:'#94bddb', patterns:'#ebeede', beach:'#f6ebd4', light:'#eef2e4', captain:'#edf0e4' }[region.id];
    var regionNightSky = region && { town:'#a9e2ed', lagoon:'#a1e3d3', caves:'#94bddb', patterns:'#b1d7ef', beach:'#b0e9ef', light:'#b2e2ed', captain:'#a8d9eb' }[region.id];
    var fogCol = regionSky ? (night ? reef3dShade(regionNightSky, -.5) : regionSky) : (night ? '#0c2a30' : '#dff0e6');
    if(crafted && !night) fogCol = '#dff0e6';
    var ridFog = region && region.id;
    var isCaves = ridFog === 'caves', isLight = ridFog === 'light', isCaptain = ridFog === 'captain';
    var fogNear = night ? (region ? 48 : 26)
      : isLight ? 64 : isCaves ? 52 : isCaptain ? 52
      : ridFog === 'town' ? 50 : region ? 54 : crafted ? 36 : 34;
    var fogFar = night ? (region ? 165 : 92)
      : isLight ? 220 : isCaves ? 185 : isCaptain ? 175
      : ridFog === 'town' ? 150 : ridFog === 'lagoon' ? 148 : ridFog === 'patterns' ? 150 : ridFog === 'beach' ? 145 : crafted ? 96 : 112;
    scene.fog = new THREE.Fog(fogCol, fogNear, fogFar);
    scene.background = new THREE.Color(fogCol);
    var skyDome = reef3dSkyDome(THREE, region, night, fogCol);
    if(skyDome) scene.add(skyDome);
    var cam = new THREE.PerspectiveCamera(42, 1, .1, Math.max(fogFar + 110, 360));   // wide far plane keeps distant horizon vistas, arches, clouds & sky dome crisp
    var kit = reef3dKit(THREE, night), B = kit.B, M = kit.M, mesh = kit.mesh;
    kit.tileArt = crafted ? ReefCraftedWorld.createContext(THREE) : window.ReefTileArt.createContext({ region: region, night: night });
    var mainN = spaces.mainN || spaces.length;
    var r = reefRand(mainN * 131 + (night ? 5 : 1));

    scene.add(new THREE.HemisphereLight(night ? '#86c9c0' : '#f8fff7', night ? '#24434b' : '#73b8bd', night ? .78 : .56));
    var sun = new THREE.DirectionalLight(night ? '#b5f0e6' : '#fff8ee', night ? .78 : .70);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60; sun.shadow.bias = -.0022; sun.shadow.normalBias = .06;
    scene.add(sun, sun.target);
    var rig = reef3dRig(scene), bake = {};   // lighting is baked into the scenery (see reef3dBakeGeo), so no shadow maps
    renderer.shadowMap.enabled = false; sun.castShadow = false;

    // Sea floor with soft dunes — extend wide past fogFar on Coral Cove so the left/right ocean horizon is 100% seamless.
    var bounds = spaces.bounds;
    var covePad = (!region && crafted) ? 116 : 32;
    var len = spaces.loop ? Math.max((!region && crafted) ? 168 : 50, bounds.maxZ - bounds.minZ + covePad) : mainN * 2.6 + 40;
    var floorWidth = spaces.loop ? Math.max((!region && crafted) ? 168 : 50, bounds.maxX - bounds.minX + covePad) : 70;
    var floorX = spaces.loop ? (bounds.minX + bounds.maxX) / 2 : 0;
    var floorSegX = region ? 1 : Math.min(64, Math.ceil(floorWidth / 2));
    var floorSegZ = region ? 1 : Math.min(64, Math.ceil(len / 2));
    var floorGeo = new THREE.PlaneGeometry(floorWidth, len, floorSegX, floorSegZ);
    var pos = floorGeo.attributes.position;
    // The dunes settle down under the path and just around it, so no tile or bit of path sinks into the sand.
    var pathLines = reef3dPathLines(spaces), pathPts = [];
    if(!region) pathLines.forEach(function(ln){ if(ln.length > 1) pathPts = pathPts.concat(new THREE.CatmullRomCurve3(ln.map(function(s){ return new THREE.Vector3(s.x, 0, s.z); })).getSpacedPoints(ln.length * 6)); });
    function duneK(x, z){
      var d2 = 1e9; for(var pi = 0; pi < pathPts.length; pi++){ var dx = pathPts[pi].x - x, dz = pathPts[pi].z - z, q = dx * dx + dz * dz; if(q < d2) d2 = q; }
      var k = Math.min(1, Math.max(0, (Math.sqrt(d2) - 1.9) / 2.6)); return k * k * (3 - 2 * k);   // 0 on the path, 1 a few steps away
    }
    // Keep Coral Cove's caustic water seafloor cleanly below the sandy path shoulder & Kiko's sand terrace
    // (preserving duneK unchanged for paintFloor shore coloring) so seafloor dunes never poke through Kiko's sand apron.
    function sandBasinK(x, z){
      var d2 = 1e9; for(var pi = 0; pi < pathPts.length; pi++){ var dx = pathPts[pi].x - x, dz = pathPts[pi].z - z, q = dx * dx + dz * dz; if(q < d2) d2 = q; }
      var k = Math.min(1, Math.max(0, (Math.sqrt(d2) - 4.6) / 3.2)); return k * k * (3 - 2 * k);
    }
    function duneH(fx, fy, k){ var h = Math.sin(fx * .35) * .25 + Math.cos(fy * .22 + fx * .1) * .3; return Math.min(h, 0) * .4 - .06 + (h - Math.min(h, 0) * .4 + .06) * k; }
    var floorZ = spaces.loop ? (bounds.minZ + bounds.maxZ) / 2 : -len / 2 + 14;
    // Night: the main path runs along the deck of a huge abandoned ship (see reef3dWreckDeck). The deck spans the
    // path with room to spare; the silt under it is pushed down so it never shows through the planks.
    var shipDeck = night && spaces.ship ? { half: spaces.ship.half, roll: spaces.ship.roll, pitch: spaces.ship.pitch, sand: spaces.ship.sand, stair: spaces.stair,
      z0: spaces[0].z + 7, z1: spaces[mainN - 1].z - 9, y: -.02 } : null;
    if(shipDeck) shipDeck.holeZ = shipDeck.stair ? shipDeck.stair.cz + 2 : -1e9;
    function onDeck(x, z){ return shipDeck && Math.abs(x) < shipDeck.half + .6 && z < shipDeck.z0 + .6 && z > shipDeck.z1 - shipDeck.half * 1.4; }
    // Night: the sea floor sits low, a third of the way up the hull, and drifts of sand bank up against its sides.
    function sandH(fx, fy){
      if(region) return 0;
      if(crafted) return Math.min(duneH(fx, fy, sandBasinK(fx, floorZ - fy)), .01);
      var h = duneH(fx, fy, duneK(fx, floorZ - fy)) + (!spaces.loop && Math.abs(fx) > 12 ? (Math.abs(fx) - 12) * .25 : 0);
      if(!shipDeck) return h;
      var zz = floorZ - fy, along = zz < shipDeck.z0 + 2 && zz > shipDeck.z1 - shipDeck.half * 1.4, out = Math.abs(fx) - shipDeck.half;
      return h + shipDeck.sand + (along && out > 0 ? Math.max(0, 1 - out / 6) * 1.1 * duneK(fx, zz) : 0);
    }
    for(var v = 0; v < pos.count; v++){ var fx = pos.getX(v) + floorX, fy = pos.getY(v);
      pos.setZ(v, onDeck(fx, floorZ - fy) ? (shipDeck.sand - 3 - shipDeck.half * shipDeck.roll + Math.min(0, (floorZ - fy) * shipDeck.pitch) - 1) : sandH(fx, fy)); }   // below the lowest corner of the hold, however the wreck has settled
    floorGeo.computeVertexNormals();
    if(crafted){
      ReefCraftedWorld.paintFloor(THREE,floorGeo,floorX,floorZ,duneK);
    } else if(!region){
      // Broad painted values use the existing dune grid and baked color buffer.
      var sandColors=new Float32Array(pos.count*3);
      for(var sv=0;sv<pos.count;sv++){
        var sandX=pos.getX(sv)+floorX, sandZ=floorZ-pos.getY(sv);
        var away=duneK(sandX,sandZ), wash=Math.sin(sandX*.075+sandZ*.045)*.025;
        sandColors[sv*3]=.98-away*.10+wash;
        sandColors[sv*3+1]=.98-away*.025+wash;
        sandColors[sv*3+2]=.90+away*.10+wash;
      }
      floorGeo.setAttribute('color',new THREE.BufferAttribute(sandColors,3));
    }
    var floor = new THREE.Mesh(floorGeo, M(night ? '#2f3e3e' : '#d9cba6'));
    floor.rotation.x = -Math.PI / 2; floor.position.set(floorX, -.15, floorZ); floor.receiveShadow = true; if(!spaces.lighthouse) scene.add(floor);

    // Path: a sandy ribbon joining the spaces, then the round spaces themselves.
    var statics = new THREE.Group(); // parts that never move; merged into a few draws at the end
    var tilePedestalStatics = new THREE.Group();
    var ribbonLines = [];
    pathLines.forEach(function(ln){ var cur = []; ln.forEach(function(s){ if(s.stair){ if(cur.length) ribbonLines.push(cur); cur = []; } else cur.push(s); }); if(cur.length) ribbonLines.push(cur); });
    if(!crafted) ribbonLines.forEach(function(ln){
      if(ln.length < 2) return;
      if(region && !spaces.lighthouse) return;
      var has3dY = !!spaces.lighthouse || ln.some(function(s){ return Math.abs(s.y || 0) > .05; });
      if(spaces.lighthouse || (region && has3dY)){
        var treadOff = (spaces.lighthouse && typeof spaces.lighthouse.treadTopOffset === 'number') ? spaces.lighthouse.treadTopOffset : 0;
        var curve3 = new THREE.CatmullRomCurve3(ln.map(function(s){ return new THREE.Vector3(s.x, (s.y || 0) + treadOff - .04, s.z); }));
        var ribbon3 = mesh(reef3dElevatedRibbonGeo(THREE, curve3, ln.length * 10, .46, .08), M(night ? '#6b5640' : '#ead4a2'));
        ribbon3.name = 'Board space ribbon';
        scene.add(ribbon3); reef3dBakeObject(ribbon3, rig, bake);
        // Subtle raised golden/brass path beads riding smoothly along the 3D spiral between spaces.
        var beadGeo = new THREE.SphereGeometry(.10, 8, 6), beadMat = M(night ? '#d9b566' : '#f0c868');
        var beadCount = ln.length * 3;
        for(var bi = 1; bi < beadCount; bi++){
          var bp = curve3.getPointAt(bi / beadCount);
          var tooClose = ln.some(function(sp0){ return Math.hypot(bp.x - sp0.x, bp.z - sp0.z) < 1.15 && Math.abs(bp.y - ((sp0.y || 0) + treadOff)) < 1.0; });
          if(tooClose) continue;
          var bd = mesh(beadGeo, beadMat, bp.x, bp.y + .04, bp.z);
          bd.scale.set(1, .55, 1);
          bd.userData.noFootprint = true;
          bd.userData.reefGround = true;
          tilePedestalStatics.add(bd);
        }
        return;
      }
      var curve = new THREE.CatmullRomCurve3(ln.map(function(s){ return new THREE.Vector3(s.x, (s.y || 0) / .12, s.z); }));   // the tube is squashed to .12 high
      var ribbon = mesh(new THREE.TubeGeometry(curve, ln.length * 8, .55, 8), M(night ? '#6b5640' : '#efdcb4'));
      ribbon.name = 'Board space ribbon';
      ribbon.scale.y = .12; ribbon.position.y = -.09; scene.add(ribbon); reef3dBakeObject(ribbon, rig, bake);
    });
    var hitables = [], deckObjs = [], swayers = [], chestModel = null, spinners = [];
    var tileHitMaterial = new THREE.MeshBasicMaterial({ visible: false });
    var tileEnvRT = null; // Fast glossy MeshPhongMaterial skips heavy PMREM envMap allocation on every region mount.
    var tileRimGeos = [], tileInnerGeos = [], tileAOGeos = [], tileQShadowGeos = [], tileDiscBuckets = {};
    spaces.forEach(function(s){
      var big = s.kind === 'deck' || s.kind === 'treasure' || s.kind === 'story' || s.kind === 'start' || s.kind === 'shop';
      var style = big ? 'classic' : 'shell';
      var top = s.kind === 'chance' ? (night ? '#c24e76' : '#f25e86')
        : s.kind === 'whirl' ? (night ? '#3d58b8' : '#4b74e8')
        : s.kind === 'shop' ? (night ? '#c28822' : '#f5b02e')
        : s.kind === 'surprise' ? (night ? '#2fa8b0' : '#2ac2bc')
        : s.kind === 'plain' ? (night ? '#3c7fa6' : '#3ea4ec')
        : (s.zone ? s.zone.place.hue : (night ? '#c99a2e' : '#f2be3e'));
      var R = big ? (region ? 1.14 : 1.25) : (region ? .78 : .86), icon = s.kind === 'deck' ? s.item.d.emoji : s.kind === 'surprise' ? '?' : s.kind === 'treasure' ? '🧰' : s.kind === 'story' ? '🍾' : s.kind === 'start' ? '⭐' : s.kind === 'chance' ? '!' : s.kind === 'whirl' ? '🌀' : s.kind === 'shop' ? '🛍️' : '';
      var tile = reef3dTile(style, s, R, top, icon, night, kit, M, mesh);   // Wendy's mix: decks keep the sandy pedestal, the spaces between are seashells
      var isCraftedTile = !!(kit.tileArt && tile.hit);
      if(s.y){ tile.parts.forEach(function(pt){ pt.position.y += s.y; }); tile.face.position.y += s.y; if(tile.hit) tile.hit.position.y += s.y; }
      var face = tile.face;
      tile.parts.forEach(function(p){ p.userData.reefGround = true; tilePedestalStatics.add(p); });
      var rimGeo = reef3dTileMetallicRimGeo(style, s, R, night, isCraftedTile);
      if(rimGeo) tileRimGeos.push(rimGeo);
      var innerGeo = reef3dTileInnerRingGeo(style, s, R, top, night, isCraftedTile);
      if(innerGeo) tileInnerGeos.push(innerGeo);
      var aoGeo = reef3dTileContactAOGeo(s, R, isCraftedTile, !!spaces.lighthouse);
      if(aoGeo) tileAOGeos.push(aoGeo);
      if(kit.tileArt){
        // Keep painted discs on glossy MeshPhongMaterial (shininess 85, specular #ffffff)
        // merged per atlas page, while a non-rendering proxy preserves exact hit identity.
        var srcMap = face.material && face.material.map;
        var discGeo = srcMap ? reef3dTileGlossyDiscGeo(face, s, R, style, isCraftedTile) : null;
        if(discGeo){
          var bKey = srcMap.uuid;
          (tileDiscBuckets[bKey] || (tileDiscBuckets[bKey] = { map: srcMap, geos: [] })).geos.push(discGeo);
        } else {
          var painted = tile.hit ? face : face.clone(); painted.userData.noFootprint = true; painted.userData.reefGround = true; statics.add(painted);
        }
        face = tile.hit || face;
        face.material = tileHitMaterial; face.updateMatrixWorld(true);
      } else {
        if(face.material && face.material.map && THREE.MeshPhongMaterial){
          var faceMatOpts = {
            map: face.material.map,
            color: night ? '#dceef6' : '#ffffff',
            specular: new THREE.Color(night ? '#5a7888' : '#4a463c'),
            shininess: 48,
            emissiveMap: face.material.map,
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: night ? 0.18 : 0.14
          };
          face.material = new THREE.MeshPhongMaterial(faceMatOpts);
        } else { reef3dBakeObject(face, rig, bake); }
        face.userData.reefGround = true; scene.add(face);
      }
      face.userData.space = s.i; hitables.push(face);
      if(s.kind === 'surprise'){ // a floating "?" block over every surprise space
        s.qKey = reef3dQKey(spaces, s, region);
        var qb = reef3dQBlock(night);
        var qDepleted = reef3dQDepleted(s);
        if(qDepleted) reef3dQUsed(qb);
        else if(!night && qb.userData && qb.userData.mat) qb.userData.mat.emissiveIntensity = .34;
        qb.position.set(s.x, (qDepleted ? (REEF3D_QY - .12) : REEF3D_QY) + (s.y || 0), s.z); qb.traverse(function(c){ c.userData.space = s.i; }); scene.add(qb); hitables.push(qb); s.qb = qb;
        var qSh = reef3dTileQShadowGeo(s);
        if(qSh) tileQShadowGeos.push(qSh);
      }
      if(s.kind === 'deck' || s.kind === 'treasure' || s.kind === 'story'){
        var regionProps = { town:['plant'], lagoon:['clam','star','fan'], caves:['lantern','star','rock'], patterns:['brain','staghorn','fan','star'], beach:['story','clam','star'], light:['star'], captain:['treasure','wheel','barrel','anchor'] };
        var set = region ? (regionProps[region.id] || regionProps.town) : night ? ['crate', 'barrel', 'anchor', 'wheel', 'cannon', 'lantern'] : ['brain', 'staghorn', 'fan', 'clam', 'sponge', 'anemone'];
        var kind = s.kind === 'deck' ? set[reefHash(s.item.d.id) % set.length] : s.kind;
        var MODEL_FOR = { crate: [s.i % 2 ? 'crateBottles' : 'crate', 1.1], barrel: ['barrel', 1.2], cannon: ['cannon', 1], treasure: ['chest', 1.1], story: ['bottle', .72] };
        var o = (MODEL_FOR[kind] && reef3dModel(models, MODEL_FOR[kind][0], MODEL_FOR[kind][1], kit.grad)) || B[kind](r);
        if(s.kind === 'treasure' && o.userData.gltf) chestModel = o;
        var nxt = (spaces.lighthouse && !s.branch && s.i === mainN - 1 && s.i > 0) ? spaces[s.i - 1] : reef3dAhead(spaces, s.i), side = s.x > nxt.x ? 1 : -1;
        if(innerWidth < 640) side = s.x > 0 ? -1 : 1; // on phones, keep objects toward the middle
        if(s.end) side = s.x > spaces[s.jn].x ? 1 : -1;   // a branch's prize sits past its end, away from the main path
        function placeProp(sd){
          if(spaces.lighthouse){
            var lox = (s.i === mainN - 1 && !s.branch) ? (s.x - nxt.x) : (nxt.x - s.x);
            var loz = (s.i === mainN - 1 && !s.branch) ? (s.z - nxt.z) : (nxt.z - s.z);
            var lol = Math.hypot(lox, loz) || 1;
            var treadY = (s.y || 0) + (typeof spaces.lighthouse.treadTopOffset === 'number' ? spaces.lighthouse.treadTopOffset : -.28);
            o.position.set(s.x + lox / lol * 1.32 - loz / lol * sd * .92, treadY, s.z + loz / lol * 1.32 + lox / lol * sd * .92);
          } else if(spaces.loop){
            var ox = nxt.x - s.x, oz = nxt.z - s.z, ol = Math.hypot(ox, oz) || 1;
            o.position.set(s.x - oz / ol * sd * 2.3, s.y || 0, s.z + ox / ol * sd * 2.3);
          } else {
            o.position.set(s.x + sd * 2.1, s.y || 0, s.z - .2);
          }
        }
        placeProp(side);
        var skipProp = false;
        if(region && region.id === 'town' && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id === 'pharmacy') skipProp = true;
        if(region && region.id === 'light'){
          var nearStart = function(){
            return [spaces[0], spaces[1]].some(function(ts){ return ts && Math.hypot(o.position.x - ts.x, o.position.z - ts.z) < 3.2 && Math.abs(o.position.y - (ts.y || 0)) < 2.2; });
          };
          if(nearStart()){
            side = -side;
            placeProp(side);
            if(nearStart()) skipProp = true;
          }
        }
        if(!skipProp){
          o.scale.setScalar(spaces.lighthouse ? (kind === 'story' ? .75 : .78) : (kind === 'clam' ? .46 : kind === 'story' ? 1.0 : 1.25));
          o.traverse(function(c){ c.userData.space = s.i; });
          o.userData.space = s.i; s.obj = o; s.side = side;
          scene.add(o); deckObjs.push(o); hitables.push(o);
          if(/staghorn|fan|anemone|kelp/.test(kind)) swayers.push(o);
        }
      }
    });
    // Merge & attach Jamboree glossy MeshPhongMaterial tile layers (4 draw calls total, zero PMREM overhead):
    // 1) metallic champagne-gold / pearl outer bevel ring (shininess 95, specular #fff4d6),
    // 2) luminous glossy painted center discs (shininess 85, specular #ffffff),
    // 3) subtle bright inner ring accent, 4) grounded contact-AO ring + "?" cube tile shadow.
    (function attachJamboreeTileLayers(){
      var U = THREE.BufferGeometryUtils;
      function addMergedLayer(geos, mat, name, renderOrder){
        if(!geos.length) return;
        var merged = null;
        if(U && U.mergeBufferGeometries){
          try { merged = U.mergeBufferGeometries(geos, false); } catch(e){}
        }
        if(merged){
          geos.forEach(function(g){ if(g && g.dispose) g.dispose(); });
          var m = new THREE.Mesh(merged, mat);
          m.name = name; m.matrixAutoUpdate = false; m.raycast = function(){};
          m.userData.reefGround = true; m.userData.noFootprint = true;
          if(renderOrder) m.renderOrder = renderOrder;
          scene.add(m);
        } else {
          geos.forEach(function(g){
            var m = new THREE.Mesh(g, mat);
            m.name = name; m.raycast = function(){};
            m.userData.reefGround = true; m.userData.noFootprint = true;
            if(renderOrder) m.renderOrder = renderOrder;
            scene.add(m);
          });
        }
      }
      var rimMat = THREE.MeshPhongMaterial
        ? new THREE.MeshPhongMaterial({
            color: night ? '#dceaf2' : '#f4eee2', vertexColors: true, shininess: 112,
            specular: new THREE.Color(night ? '#98c4d4' : '#b8a57a'),
            emissive: new THREE.Color(night ? '#2c4c58' : '#5a4a2c'), emissiveIntensity: night ? 0.12 : 0.06
          })
        : new THREE.MeshBasicMaterial({ vertexColors: true });
      addMergedLayer(tileRimGeos, rimMat, 'Board space metallic bezels', 0);

      var innerMat = THREE.MeshPhongMaterial
        ? new THREE.MeshPhongMaterial({
            color: night ? '#dceaf2' : '#f4eee2', vertexColors: true, shininess: 102,
            specular: new THREE.Color(night ? '#98c4d4' : '#b2a078'),
            emissive: new THREE.Color(night ? '#dceaf2' : '#4a3e28'), emissiveIntensity: night ? 0.12 : 0.06
          })
        : new THREE.MeshBasicMaterial({ vertexColors: true });
      addMergedLayer(tileInnerGeos, innerMat, 'Board space inner ring accents', 0);

      Object.keys(tileDiscBuckets).forEach(function(k){
        var b = tileDiscBuckets[k];
        var discMatOpts = {
          map: b.map,
          color: night ? '#dceef6' : '#ffffff',
          vertexColors: true,
          specular: new THREE.Color(night ? '#688c9e' : '#5e584a'),
          shininess: 92,
          emissiveMap: b.map,
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: night ? 0.18 : 0.14
        };
        var discMat = THREE.MeshPhongMaterial
          ? new THREE.MeshPhongMaterial(discMatOpts)
          : new THREE.MeshBasicMaterial({ map: b.map, vertexColors: true });
        addMergedLayer(b.geos, discMat, 'Board space glossy discs', 0);
      });

      var aoMat = new THREE.MeshBasicMaterial({
        map: reef3dTileAOTex(THREE), color: night ? '#051018' : '#1b242c',
        transparent: true, opacity: night ? .62 : .58, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      });
      addMergedLayer(tileAOGeos, aoMat, 'Board space contact AO rings', 1);

      if(tileQShadowGeos.length){
        var qShMat = new THREE.MeshBasicMaterial({
          map: reef3dBlobTex(false, false), color: night ? '#071c24' : '#1b2d34',
          transparent: true, opacity: night ? .34 : .28, depthWrite: false,
          polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
        });
        addMergedLayer(tileQShadowGeos, qShMat, 'Surprise cube tile shadows', 2);
      }
    })();
    // Scenery off the path.
    function nearPath(x, z){ for(var i = 0; i < spaces.length; i++){ var dx = spaces[i].x - x, dz = spaces[i].z - z; if(dx * dx + dz * dz < 12) return true; } return false; }
    var setD = night ? ['kelp', 'rock', 'plank', 'coralBall', 'rock'] : ['kelp', 'coralBall', 'rock', 'staghorn', 'coralBall', 'star', 'kelp'];
    for(var n = 0; !crafted && !region && n < mainN * 3.2; n++){
      var ra = r(), rb = r(), sx = (ra - .5) * 30, sz = 8 - rb * (mainN * 2.6 + 18);
      if(spaces.loop){
        var anchor = spaces[(n * 11) % mainN], ap = spaces[(anchor.i + mainN - 1) % mainN], an = spaces[(anchor.i + 1) % mainN];
        var ax = an.x - ap.x, az = an.z - ap.z, al = Math.hypot(ax, az) || 1, nx = -az / al, nz = ax / al;
        if(nx * (anchor.x - floorX) + nz * (anchor.z - floorZ) < 0){ nx = -nx; nz = -nz; }
        sx = anchor.x + nx * (5 + ra * 7) + ax / al * (rb - .5) * 3;
        sz = anchor.z + nz * (5 + ra * 7) + az / al * (rb - .5) * 3;
      }
      if(nearPath(sx, sz)) continue;
      if(shipDeck && Math.abs(sx) < shipDeck.half + 1.5 && sz < shipDeck.z0 + 1 && sz > shipDeck.z1 - shipDeck.half * 1.5) continue;   // nothing grows on the wreck
      var nm = setD[Math.floor(r() * setD.length)];
      if(nm === 'kelp' && Math.abs(sx) < 9) nm = 'coralBall'; // tall kelp only at the sides, so it never hides the board
      var d = null;
      if(nm === 'rock' && models.rock1) d = reef3dModel(models, ['rock1', 'rock2', 'rockp', 'rock1'][Math.floor(r() * 4)], .6 + r() * .9, kit.grad, night ? '#30464e' : '#9fb8bb');
      else if(!night && nm === 'coralBall' && models.plant && r() < .35) d = reef3dModel(models, 'plant', .8 + r() * .5, kit.grad, '#5fa478');
      if(!d) d = B[nm](r);
      d.position.set(sx, shipDeck ? groundY(sx, sz) + .15 : 0, sz); d.rotation.y = r() * 6; d.scale.multiplyScalar(.7 + r() * .7);
      var inOpening = !night && spaces.slice(0, 10).some(function(s){ return Math.hypot(s.x - sx, s.z - sz) < 11; });
      if(!inOpening) statics.add(d);
    }
    var wreckM = night && !region ? reef3dModel(models, 'wreck', 7, kit.grad, '#3c5560') : null;
    if(wreckM){ // the pirate shipwreck lies beside the middle of the path
      wreckM.traverse(function(m){ if(/^grass/.test(m.name || '')) m.visible = false; });
      var wmid = spaces[Math.floor(mainN / 2)], wside = wmid.x > 0 ? -1 : 1;
      wreckM.position.set(wmid.x + wside * (shipDeck ? shipDeck.half + 13 : 11), shipDeck ? shipDeck.sand - 1 : -.3, wmid.z - 3); wreckM.rotation.y = wside > 0 ? -.6 : Math.PI + .6; wreckM.scale.multiplyScalar(1);
      statics.add(wreckM);
    } else if(night && !region){ // the sunken ship lies on its side beside the middle of the path, half buried in the silt
      var mid = spaces[Math.floor(mainN / 2)], ship = new THREE.Group();
      var hs = new THREE.Shape(); hs.moveTo(-6, 1.2); hs.quadraticCurveTo(-5.4, -1.6, -1, -2); hs.lineTo(3.6, -2); hs.quadraticCurveTo(6.4, -1.4, 7, 1.6); hs.lineTo(-6, 1.2);
      var hull = mesh(new THREE.ExtrudeGeometry(hs, { depth: 3, bevelEnabled: true, bevelSize: .35, bevelThickness: .35, bevelSegments: 3, curveSegments: 18 }), M('#5a4332'));
      hull.position.z = -1.5; ship.add(hull);
      for(var pl = 0; pl < 5; pl++){ var plank = mesh(new THREE.BoxGeometry(12.4 - pl * .9, .06, .06), M('#3a2b20'), .4, -1.6 + pl * .62, 1.88); ship.add(plank); }
      var deck = mesh(new THREE.BoxGeometry(12.6, .25, 3.4), M('#7a5f48'), .5, 1.3, 0); ship.add(deck);
      for(var rl = 0; rl < 9; rl++) ship.add(mesh(new THREE.CylinderGeometry(.07, .07, .7, 6), M('#4a3a2c'), -5 + rl * 1.35, 1.75, 1.6));
      ship.add(mesh(new THREE.BoxGeometry(12, .1, .1), M('#4a3a2c'), .5, 2.1, 1.6));
      for(var ph = 0; ph < 4; ph++){ var hole = new THREE.Mesh(new THREE.CircleGeometry(.36, 18), new THREE.MeshBasicMaterial({ color: '#ffe6a6' })); hole.position.set(-3.4 + ph * 2.4, -.2, 1.9); ship.add(hole);
        var ringP = mesh(new THREE.TorusGeometry(.4, .08, 6, 18), M('#b8902f'), -3.4 + ph * 2.4, -.2, 1.92); ship.add(ringP); }
      var mast = mesh(new THREE.CylinderGeometry(.22, .3, 8, 10), M('#3a2b20'), 1.2, 5.2, 0); ship.add(mast);
      var nest = mesh(new THREE.CylinderGeometry(.7, .55, .6, 12, 1, true), M('#4a3a2c', { side: THREE.DoubleSide }), 1.2, 8.4, 0); ship.add(nest);
      var sail = mesh(new THREE.PlaneGeometry(3.4, 2.6, 6, 4), M('#8c8576', { side: THREE.DoubleSide, transparent: true, opacity: .85 }), 1.2, 5.8, .3); sail.rotation.y = .3; ship.add(sail);
      var mastB = mesh(new THREE.CylinderGeometry(.18, .22, 4.5, 8), M('#3a2b20'), -3.6, 3.2, 0); mastB.rotation.z = .5; ship.add(mastB);
      var side = mid.x > 0 ? -1 : 1;
      ship.position.set(mid.x + side * 11.5, .6, mid.z - 3); ship.rotation.set(0, side > 0 ? -.35 : Math.PI + .35, side * .32);
      statics.add(ship);
    } else if(!region && !spaces.loop){ // the old corridor's arch; loop routes use a placed gateway
      var a = spaces[Math.floor(mainN * .6)], arch = mesh(new THREE.TorusGeometry(4.2, .9, 12, 36, Math.PI), M('#a9bcb9'), a.x, -.2, a.z);
      statics.add(arch);
      for(var q = 0; q < 9; q++){ var ang = q / 8 * Math.PI, cb = B.coralBall(r); cb.position.set(a.x + Math.cos(ang) * 4.2, Math.sin(ang) * 4.2 + .5, a.z); cb.scale.setScalar(.55); statics.add(cb); }
    }
    // The landmark comes alive: a thin stream of air bubbles rises from the wreck (from a vent at the foot of the
    // coral arch by day), and at night a lantern stands on the sand by the wreck in a warm pool of light.
    // No r() calls here, so the rest of the seeded layout stays where it was.
    var landmark = wreckM || ship || arch, plume = null, lamp = null;
    if(landmark){
      statics.updateMatrixWorld(true);
      var lmBox = new THREE.Box3().setFromObject(landmark), lmC = new THREE.Vector3(); lmBox.getCenter(lmC);
      var px = arch ? a.x - 4.2 : lmC.x, py = arch ? 0 : lmBox.max.y * .55, pz = arch ? a.z : lmC.z;
      plume = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 8, 6), new THREE.MeshBasicMaterial({ color: night ? '#cfeff0' : '#ffffff', transparent: true, opacity: .7 }), 16);
      plume.userData = { x: px, y: py, z: pz, h: 9 }; plume.frustumCulled = false; reef3dPlume(plume, new THREE.Object3D(), 0); scene.add(plume);
      if(night){
        var lmMid = spaces[Math.floor(mainN / 2)], lx = lmC.x + (lmMid.x - lmC.x) * .55, lz = lmC.z + 1.5;
        var lantern = B.lantern(); lantern.position.set(lx, groundY(lx, lz) + .15, lz); lantern.rotation.y = .4; lantern.scale.setScalar(1.1); deckObjs.push(lantern); scene.add(lantern);
        var poolGeo = new THREE.PlaneGeometry(13, 13); poolGeo.rotateX(-Math.PI / 2);   // Wendy chose the warmer, bigger glow
        var pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: reef3dBlobTex(true), color: '#ffab45', transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
        pool.position.set(lx, groundY(lx, lz) + .08, lz); pool.renderOrder = 3; scene.add(pool);
        lamp = { glow: lantern.userData.glow, halo: lantern.userData.halo, pool: pool };
      }
    }
    var reefFx = !crafted && !night && !region ? reef3dReefGarden({ THREE: THREE, scene: scene, statics: statics, spaces: spaces, mainN: mainN, M: M, mesh: mesh, B: B, r: reefRand(mainN * 17 + 3), groundY: groundY, taken: deckObjs.map(function(d){ return [d.position.x, d.position.z]; }) }) : null;
    var wreckFx = shipDeck && !region ? reef3dWreckDeck({ THREE: THREE, scene: scene, statics: statics, deck: shipDeck, spaces: spaces, mainN: mainN, M: M, mesh: mesh, B: B, r: r, models: models, kit: kit, deckObjs: deckObjs }) : null;
    // Tall towers in the haze on both sides give the sea floor depth: coral by day, rock spires at night.
    for(var tz = 6; !region && !spaces.loop && tz > -mainN * 2.6 - 10; tz -= 7 + r() * 5){
      [-1, 1].forEach(function(sd){
        var tw = new THREE.Group(), hgt = 4 + r() * 6, x = sd * (15 + r() * 8);
        if(night){ var sp = mesh(new THREE.ConeGeometry(1.4 + r(), hgt, 7), M('#25363c')); sp.position.y = hgt / 2; tw.add(sp); }
        else {
          var cols = ['#e7a39a', '#efc196', '#bcaedd', '#9fcfb0'], cc = cols[Math.floor(r() * cols.length)], yy = 0;
          for(var lv = 0; lv < 3; lv++){ var seg = mesh(new THREE.CylinderGeometry(.9 - lv * .2, 1.2 - lv * .2, hgt / 3, 8), M(reef3dShade(cc, -.05 * lv))); seg.position.y = yy + hgt / 6; yy += hgt / 3; tw.add(seg); }
          var cap = mesh(new THREE.SphereGeometry(1.1, 10, 7), M(cc)); cap.position.y = yy; cap.scale.y = .7; tw.add(cap);
        }
        tw.position.set(x, shipDeck ? groundY(x, tz) - .1 : -.2, tz); statics.add(tw);
      });
    }
    // Drifting bubbles (by day) or marine snow (by night).
    var bubbleGeo = new THREE.SphereGeometry(.07, 8, 6), bubbleMat = new THREE.MeshBasicMaterial({ color: night ? '#d8efe8' : crafted ? '#e4faff' : '#ffffff', transparent: true, opacity: crafted ? .42 : .55 });
    var bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, region ? 1 : 70), bubbleData = [], dummy = new THREE.Object3D();
    if(!region){ for(var bI = 0; bI < 70; bI++) bubbleData.push({ x: (r() - .5) * 26, y: r() * 8, z: 6 - r() * 40, s: .4 + r() * 1.2, v: .2 + r() * .5 });
      scene.add(bubbles); }

    // Moving caustics on the sand: a cell pattern in the floor's glow channel that drifts.
    var caus = region ? null : reef3dCausticTexture(16, Math.round(len / 4.5));
    // The sand covers the whole screen, so it gets the cheapest shader of all: baked light plus the drifting
    // caustics added on top (see reef3dSandMat).
    if(!crafted){
      floor.material = M(regionGround ? (night ? reef3dShade(regionGround, -.42) : regionGround) : (night ? '#2f3e3e' : '#e3d8b6'), {vertexColors:!region});
      reef3dBakeObject(floor, rig, bake);
    }
    if(!region) floor.material = reef3dSandMat(caus, new THREE.Color(night ? '#2a6f78' : crafted ? '#abfff3' : '#fff6da').multiplyScalar(night ? .2 : crafted ? .15 : .09));

    // Light rays slanting down from the surface; smooth Gaussian radial falloff + gentle pastel aqua-gold tint (cached once, skipped on regions).
    var rays = new THREE.Group(), rayList = [];
    if(!region){
      var rayCanvas = R3.rayCanvas || (R3.rayCanvas = (function(){
        var c = document.createElement('canvas'); c.width = 96; c.height = 192; var g = c.getContext('2d');
        var img = g.createImageData(96, 192), d = img.data;
        for(var iy = 0; iy < 192; iy++){
          var v = iy / 191;
          var vert = Math.pow(Math.max(0, 1 - v), 1.35) * Math.min(1, v / .08);
          for(var ix = 0; ix < 96; ix++){
            var u = (ix / 95) * 2 - 1;
            var gauss = Math.exp(-(u * u) / (2 * .34 * .34)) * Math.pow(Math.max(0, Math.cos(u * Math.PI * .5)), 1.35);
            var a = Math.max(0, Math.min(1, gauss * vert));
            var idx = (iy * 96 + ix) * 4;
            d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; d[idx + 3] = Math.round(a * 255);
          }
        }
        g.putImageData(img, 0, 0);
        return c;
      })());
      var rayTex = new THREE.CanvasTexture(rayCanvas);
      for(var ri = 0; ri < 7; ri++){
        var rm = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + r() * 2.0, 18), new THREE.MeshBasicMaterial({ map: rayTex, color: night ? '#7fe0d6' : '#e6f9f0', transparent: true, opacity: night ? .05 : .11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        rm.position.set((r() - .5) * 20, 6.5, -4 - r() * 14); rm.rotation.set(0, (r() - .5) * .8, .32 + (r() - .5) * .1);
        rm.userData.base = rm.material.opacity; rm.userData.ph = r() * 6; rays.add(rm); rayList.push(rm);
      }
    }
    scene.add(rays);

    // Little fish swimming in loose schools around the board.
    function fishMesh(col){
      var f = new THREE.Group();
      var b = mesh(new THREE.SphereGeometry(.2, 12, 8), M(col)); b.scale.set(.6, .8, 1.3); f.add(b);
      var tl = mesh(new THREE.ConeGeometry(.14, .22, 4), M(col), 0, 0, -.32); tl.rotation.x = -Math.PI / 2; tl.scale.set(.3, 1, 1); f.add(tl);
      f.add(mesh(new THREE.SphereGeometry(.045, 6, 6), M('#14232a'), .1, .05, .16));
      return f;
    }
    var fishMixers = [], schools = [], schoolCols = night ? ['#6fb3c9', '#8a7fc4', '#5fa39a'] : ['#ff9a6b', '#ffd166', '#7fc8f0'];
    for(var sI = 0; !region && sI < 3; sI++){
      var sch = { fish: [], ph: r() * 6, rad: 3.5 + r() * 2.5, h: 0.95 + r() * 0.55, spd: (.16 + r() * .1) * (sI % 2 ? -1 : 1), off: (r() - .5) * 8, hx: null, hz: null };
      for(var fI = 0; fI < (models.fish1 ? 3 : 5); fI++){
        var fm = reef3dModel(models, ['fish1', 'fish2', 'fish1'][sI], .36, kit.grad, sI === 2 ? '#ffd166' : null), mx = null;
        if(fm){ // a real swimming fish: its own copy of the swim animation, started at a random point
          var inner = new THREE.Group(); inner.add(fm); fm = inner;
          mx = new THREE.AnimationMixer(inner.children[0].userData.root); var clip = inner.children[0].userData.gltf.animations[0];
          if(clip){ var ac = mx.clipAction(clip); ac.play(); ac.time = r() * clip.duration; } fishMixers.push(mx);
        } else fm = fishMesh(schoolCols[sI]);
        fm.userData.o = new THREE.Vector3((r() - .5) * 1.8, (r() - .5) * .9, (r() - .5) * 1.8); scene.add(fm); sch.fish.push(fm);
      }
      schools.push(sch);
    }
    // A sunlit vertex-shaded gentle humpback/blue reef whale (a manta ray at night) glides slowly far off in the open reef haze, well clear of HUD & screen edges.
    var bigOne = !region ? (night ? reef3dModel(models, 'manta', .45, kit.grad) : reef3dBuildReefWhale(THREE, fogCol)) : null, bigMixer = null;
    // It starts far off in the deep distant channel: with Calm motion it never swims, so it must not clip the HUD or sit on the guide.
    if(bigOne){
      var bw = new THREE.Group(); bw.add(bigOne);
      bw.userData.whale = bigOne;
      bigOne = bw;
      var ba0 = 1.24;
      bw.position.set(Math.cos(ba0) * 10 - 5.2, night ? .10 : -.78, spaces[0].z - (night ? 25 : 17) + Math.sin(ba0) * 3);
      bw.rotation.y = Math.atan2(-Math.sin(ba0) * 10, Math.cos(ba0) * 3);
      scene.add(bigOne);
      var innerW = bw.children[0];
      if(innerW && innerW.userData && innerW.userData.root && innerW.userData.gltf && innerW.userData.gltf.animations){
        bigMixer = new THREE.AnimationMixer(innerW.userData.root);
        var bc = innerW.userData.gltf.animations[0];
        if(bc) bigMixer.clipAction(bc).play();
        fishMixers.push(bigMixer);
      }
    }
    // Coins in a ring around the Treasure Reef, gems here and there, and a star over the next deck.
    var tSpace = spaces.find(function(s){ return s.kind === 'treasure'; });
    if(tSpace && models.coin) for(var ci = 0; ci < 6; ci++){ var cn = reef3dModel(models, 'coin', .55, kit.grad); var ca = ci / 6 * Math.PI * 2; cn.position.set(tSpace.x + Math.cos(ca) * 1.9, .9 + (tSpace.y || 0), tSpace.z + Math.sin(ca) * 1.9); cn.userData.y0 = .9 + (tSpace.y || 0); reef3dBakeObject(cn, rig, bake); reef3dCompact(cn); cn.name = 'Board space coin'; cn.traverse(function(c){ c.name = 'Board space coin'; }); scene.add(cn); spinners.push(cn); }
    if(!region && models.gemPink) for(var gi = 0; gi < spaces.length; gi += 5){
      var gs = spaces[gi], gx = gs.x + (gi % 2 ? 2.6 : -2.6), gz = gs.z + 1;
      if(!spaces.every(function(ts){ return Math.hypot(ts.x - gx, ts.z - gz) >= 2.6; })) continue;
      var gm = reef3dModel(models, gi % 10 ? 'gemBlue' : 'gemPink', .5, kit.grad);
      gm.position.set(gx, .8 + (gs.y || 0), gz); gm.userData.y0 = .8 + (gs.y || 0); reef3dBakeObject(gm, rig, bake); reef3dCompact(gm); gm.name = 'Board space gem'; gm.traverse(function(c){ c.name = 'Board space gem'; }); scene.add(gm); spinners.push(gm);
    }
    var nextStar = reef3dModel(models, 'star', .8, kit.grad);
    if(nextStar){ nextStar.visible = false; scene.add(nextStar); }
    // Kiko the crab (Mochi or Hermit, see reef_crabs.js) walks along with the guide and dances at surprises.
    var crab = reefCrabBuild(reefCrabNow, kit.grad, .95); scene.add(crab);
    var chestMixer = null, chestActs = {};
    if(chestModel){ chestMixer = new THREE.AnimationMixer(chestModel.userData.root); chestModel.userData.gltf.animations.forEach(function(c){ chestActs[c.name] = chestMixer.clipAction(c); }); }
    // Soft shadows under everything that stands on the sand, then the still scenery baked and merged.
    var hasElev = !spaces.lighthouse && region && spaces.some(function(s){ return Math.abs(s.y || 0) > .05; });
    function groundY(x, z){
      if(spaces.lighthouse){
        var lhG = spaces.lighthouse, bestD = 3.2, bestY = typeof lhG.floorY === 'number' ? lhG.floorY : -.306;
        var treadOffG = typeof lhG.treadTopOffset === 'number' ? lhG.treadTopOffset : -.28;
        for(var gi2 = 0; gi2 < spaces.length; gi2++){
          var sg = spaces[gi2], d2 = Math.hypot(sg.x - x, sg.z - z);
          if(d2 < bestD){ bestD = d2; bestY = (sg.y || 0) + treadOffG; }
        }
        return bestY;
      }
      if(hasElev){
        var wSum = 0, ySum = 0, nearD = 99;
        for(var ei = 0; ei < spaces.length; ei++){
          var es = spaces[ei], ed = Math.hypot(es.x - x, es.z - z);
          if(ed < nearD) nearD = ed;
          if(ed < 3.4){
            var w = Math.max(0, 1 - ed / 3.4); w *= w;
            wSum += w; ySum += w * (es.y || 0);
          }
        }
        if(wSum > 0){
          var blend = Math.max(0, Math.min(1, 1 - (nearD - 1.6) / 1.8));
          return (ySum / wSum) * blend - .15 * (1 - blend);
        }
      }
      if(onDeck(x, z) && Math.abs(x) < shipDeck.half) return (z < shipDeck.holeZ && shipDeck.stair ? shipDeck.stair.low : 0) + shipDeck.y + x * shipDeck.roll + z * shipDeck.pitch;
      return sandH(x, -(z - floorZ)) - .15;
    }
    var blobList = [], blobMat = reef3dBlobMat(reef3dBlobTex(), night);
    var dress = { THREE: THREE, statics: statics, spaces: spaces, mainN: mainN, M: M, groundY: groundY, taken: deckObjs.map(function(d){ return [d.position.x, d.position.z]; }) };
    var craftedPavilion = crafted ? ReefCraftedWorld.garden(dress) : null;
    statics.updateMatrixWorld(true);
    var coveObstacles = [];
    if(crafted){
      statics.children.forEach(function(ch){
        if(!ch || ch.name === 'Crafted Cove path border' || ch.userData && ch.userData.reefGround) return;
        var list = (ch.name === 'Crafted Cove stone gardens' || ch.name === 'Crafted Cove outer reef') ? ch.children : [ch];
        for(var ci2 = 0; ci2 < list.length; ci2++){
          var sub = list[ci2]; if(!sub) continue;
          var sb = new THREE.Box3().setFromObject(sub); if(sb.isEmpty() || sb.max.y < .12) continue;
          var sc2 = new THREE.Vector3(), ss2 = new THREE.Vector3(); sb.getCenter(sc2); sb.getSize(ss2);
          var spanR = Math.max(ss2.x, ss2.z) * .52;
          coveObstacles.push({
            x: sc2.x, z: sc2.z,
            r: Math.max(1.85, spanR),
            hx: ss2.x * .5, hz: ss2.z * .5,
            minY: sb.min.y, maxY: sb.max.y,
            isCoveIslet: true
          });
        }
      });
      // Add 3 compact sunlit miniature reef clusters (turquoise sandbar disc + coral fan + golden starfish + shell)
      // in the lower-right foreground shallow water of Coral Cove (strictly clear of Shelly's path & Kiko's zone)
      // so 01-coral-cove-mobile.png portrait framing feels lively and balanced.
      var s0C = spaces[0];
      if(s0C){
        var coveFgClusters = [
          { dx: 1.90, dz: 1.80, rad: .72, sc: .78, rot: .35, hasFan: true,  hasShell: false },
          { dx: 3.05, dz: 2.35, rad: .82, sc: .82, rot: -.50, hasFan: true,  hasShell: true },
          { dx: 2.25, dz: 3.25, rad: .68, sc: .74, rot: 1.15, hasFan: false, hasShell: true }
        ];
        coveFgClusters.forEach(function(cl){
          var ax = s0C.x + cl.dx, az = s0C.z + cl.dz;
          if(spaces.some(function(ts){ return Math.hypot(ts.x - ax, ts.z - az) < 2.35; })) return;
          if(coveObstacles.some(function(co){ return Math.hypot(co.x - ax, co.z - az) < (co.r || 1.8) + .45; })) return;
          var cg = new THREE.Group();
          // Softly domed warm coral-sand shoal mound over a submerged turquoise sandbar skirt (zero flat mint discs!)
          var skirt = mesh(new THREE.SphereGeometry(cl.rad + .18, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), M('#79d9d2'), 0, -.12, 0);
          skirt.scale.set(1.06, .16, .98); cg.add(skirt);
          var shoal = mesh(new THREE.SphereGeometry(cl.rad + .04, 16, 9, 0, Math.PI * 2, 0, Math.PI * .5), M('#eddcb6'), 0, -.04, 0);
          shoal.scale.set(1.04, .22, .94); cg.add(shoal);
          // Keep starfish strictly clear of coral fan & shell/pebble (>= 0.56u center gap vs 0.45u combined radii).
          var st = B.star(r); st.scale.setScalar(cl.sc * .66); st.rotation.y = cl.rot; st.position.set(-.30, .09, .14); cg.add(st);
          if(cl.hasFan){
            var fn = B.fan(r); fn.scale.setScalar(cl.sc * .56); fn.rotation.y = cl.rot - .7; fn.position.set(.26, .06, -.22); cg.add(fn);
          }
          if(cl.hasShell){
            var sh = mesh(new THREE.SphereGeometry(.15, 10, 7), M('#ffd8be'), .28, .10, .24);
            sh.scale.set(1.20, .56, .92); sh.rotation.y = cl.rot + .6; cg.add(sh);
          }
          cg.position.set(ax, Math.min(.01, groundY(ax, az) + .15) + .02, az);
          cg.userData.noFootprint = true;
          statics.add(cg);
        });
      }
    }
    statics.children.forEach(function(c){ if(!c.userData.noFootprint) reef3dFootprint(c, blobList); });
    if(tilePedestalStatics.children.length){
      tilePedestalStatics.children.forEach(function(c){ if(!c.userData.noFootprint) reef3dFootprint(c, blobList); });
      var pedMerged = reef3dMerge(tilePedestalStatics, rig, bake);
      pedMerged.name = 'Board space pedestals';
      pedMerged.userData.reefGround = true;
      pedMerged.userData.noFootprint = true;
      scene.add(pedMerged);
    }
    deckObjs.forEach(function(o){ reef3dFootprint(o, blobList); if(o !== chestModel){ reef3dBakeObject(o, rig, bake); reef3dCompact(o); } });
    var blobs = reef3dBlobs(blobList, blobMat, groundY); if(blobs) scene.add(blobs);
    if(!crafted && !night && !region) reef3dCoveDetail(dress);
    scene.add(reef3dMerge(statics, rig, bake));
    var guide = B.guide(); reef3dOutline(guide, night ? '#173d5c' : '#1f3a2c', night ? .035 : .05); scene.add(guide);
    var crabFit = reefCrabExtent(guide) * .60; reefCrabFit(crab, crabFit);   // compact companion fit inside tile bevel rims
    function moverBlob(r, mat){ var g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2); var b = new THREE.Mesh(g, mat || blobMat); b.renderOrder = 2; scene.add(b); return b; }
    var crabBlobMat = crab ? new THREE.MeshBasicMaterial({ map: reef3dBlobTex(false, true), color: night ? '#051016' : '#243630', transparent: true, opacity: night ? .5 : .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }) : null;
    var blobG = moverBlob(1.1), blobC = crab ? moverBlob(.68, crabBlobMat) : null, glowG = null;
    if(night){
      var gtex = reef3dBlobTex(true), gg = new THREE.PlaneGeometry(11, 11); gg.rotateX(-Math.PI / 2);
      glowG = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ map: gtex, color: '#5ff0e0', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      glowG.renderOrder = 3; scene.add(glowG);
    }
    var ringGeo = new THREE.RingGeometry((region ? 1.14 : 1.25) - .02, (region ? 1.14 : 1.25) + .08, 40);
    ringGeo.rotateX(-Math.PI / 2);
    var ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: night ? '#ffe29a' : '#ffd966', transparent: true, opacity: .45, depthWrite: false }));
    ring.visible = false; scene.add(ring);

    // HTML labels for the decks (crisp text, real buttons for touch and screen readers).
    var labels = wrap.querySelector('.r3-labels');
    spaces.forEach(function(s){
      if(!s.obj) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'r3-label';
      if(s.kind === 'deck'){
        var it = s.item, label = it.state === 'ready' ? 'Ready' : it.state === 'done' ? 'All done' : it.kind;
        b.classList.add(it.state);
        if(it.d.myWords) b.classList.add('mywords');   // What's new and the smoke test find the My words tile by this
        b.innerHTML = '<span class="r3-emoji" aria-hidden="true">'+it.d.emoji+'</span><span><b>'+esc(it.d.name)+'</b><small>'+esc(label)+'</small></span>' + (it.state === 'done' ? '<i class="r3-star" aria-hidden="true">★</i>' : '');
        b.setAttribute('aria-label', it.d.name + '. ' + (it.state === 'ready' ? 'Ready to practice.' : it.state === 'done' ? 'All done. Tap to play again.' : it.state === 'practice' ? 'Optional rehearsal. Tap to practice.' : 'Tap to ' + it.kind.toLowerCase() + '.'));
      } else {
        var t = s.kind === 'treasure' ? (region ? ['🧰', 'Treasure cache', 'Find extra shells'] : ['🐠', 'Aquarium', 'My sea friends'])
          : (region ? ['🍾', 'Bonus bottle', 'A surprise on the route'] : ['🍾', 'Story Bottle', 'Make a story']);
        b.innerHTML = '<span class="r3-emoji" aria-hidden="true">'+t[0]+'</span><span><b>'+t[1]+'</b><small>'+t[2]+'</small></span>';
        b.setAttribute('aria-label', t[1] + '. ' + t[2] + '.');
      }
      b.dataset.space = s.i; s.label = b; labels.appendChild(b);
      if(s.kind === 'deck' && s.first){
        var names = REEF_ZONE_NAMES[night ? 'night' : 'day'], zn = region ? region.name : names[s.zone.id] || s.zone.label;
        var sign = document.createElement('button'); sign.type = 'button'; sign.className = 'r3-sign'; sign.dataset.space = s.i; sign.setAttribute('aria-label', zn + '. Go to ' + s.item.d.name + '.');
        sign.innerHTML = '<b>'+esc(zn)+'</b><small>'+esc(s.zone.label)+'</small>'; s.sign = sign; labels.appendChild(sign);
      }
    });

    var view = {
      wrap: wrap, renderer: renderer, scene: scene, cam: cam, spaces: spaces, qSpaces: spaces.filter(function(s){ return !!s.qb; }), objSpaces: spaces.filter(function(s){ return !!s.obj; }), glowSpaces: spaces.filter(function(s){ return !!(s.obj && s.obj.userData && s.obj.userData.glow); }), guide: guide, ring: ring, night: night, region: region,
      at: 0, moving: false, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), t0: performance.now(),
      bubbles: bubbles, bubbleData: bubbleData, dummy: dummy, swayers: swayers, hitables: hitables, deckObjs: deckObjs, sun: sun, key: '', dirty: true,
      caus: caus, rays: rays, rayList: rayList, schools: schools, fx: [], kit: kit, regionGround: regionGround,
      fishMixers: fishMixers, bigOne: bigOne, models: models, baked: true, blobG: blobG, blobC: blobC, glowG: glowG, groundY: groundY,
      crab: crab, crabFit: crabFit, crabGap: reefCrabExtent(guide) / 2 + crabFit / 2 + .2, leaving: null, spareCrab: null, chestMixer: chestMixer, chestActs: chestActs, nextStar: nextStar, spinners: spinners, lastT: performance.now(),
      plume: plume, lamp: lamp, wreck: wreckFx, reefFx: reefFx, shipDeck: shipDeck, rig: rig, bake: bake, floor: floor, craftedPavilion: craftedPavilion, _coveObstacles: coveObstacles,
      skyDome: skyDome, motes: reef3dAmbientMotes(scene, region, night), _tileEnvRT: tileEnvRT
    };
    view.post = null; // Direct MSAA render avoids 5 offscreen RenderTargets + 9 shader passes per frame.
    if(view.crab){
      var initCrabSpot = reef3dCrabSpot(view);
      view.crab.position.set(initCrabSpot.x, initCrabSpot.y != null ? initCrabSpot.y : (view.guide.position.y - .3 - (view.craftedPavilion ? .07 : 0)), initCrabSpot.z);
    }
    reef3dLifeBuild(view);
    reef3dStyleStarBeam(view);
    var who = S.profile && S.profile.id;
    if(R3.flownFor !== who && !reefCalm()){ R3.flownFor = who; view.flyIn = { t0: null, dur: 2600 }; }   // the swoop in, once per visit (see life.js)
    reef3dPartyBuild(view);
    reef3dStylePearl(view);
    reef3dQApply(view);
    if(!region) reef3dCoveBarSync();
    reef3dLoadPerf.boardBuilds++;
    reef3dLoadPerf.boardBuildMs += performance.now() - buildStarted;
    return view;
  }

  // Fold secondary board actions cleanly into the shared Menu drawer (closed by default) and
  // keep Coral Cove's top-right cluster to a compact single row: Dice, Map, Menu.
  if(typeof BOARD_MENU !== 'undefined' && Array.isArray(BOARD_MENU)){
    if(!BOARD_MENU.some(function(it){ return it[0] === '#askBtn'; })){
      var voyIdx = BOARD_MENU.findIndex(function(it){ return it[0] === '[data-r3-voy]'; });
      BOARD_MENU.splice(
        voyIdx >= 0 ? voyIdx + 1 : BOARD_MENU.length,
        0,
        ['#askBtn', 'ask', function(b){ return b.getAttribute('aria-label') || 'Ask Shelly'; }],
        ['[data-act="open-library"]', 'library', 'Library'],
        ['[data-r3-mode]:not([hidden])', 'story', function(b){ return (b.textContent || '').trim() || 'Play mode'; }]
      );
    }
  }
  function reef3dCoveBarSync(){
    if(typeof document === 'undefined' || !document.querySelector) return;
    var bar = document.querySelector('.cv3-hero .topbar > :last-child');
    if(!bar || bar.querySelector('[data-r3-roll]')) return;
    var menuBtn = bar.querySelector('.r3-menubtn');
    var roll = document.createElement('button');
    roll.type = 'button'; roll.className = 'r3-topbtn r3-top-roll'; roll.setAttribute('data-r3-roll', '');
    roll.setAttribute('aria-label', 'Choose or roll a die');
    roll.innerHTML = (typeof ccIcon === 'function' ? ccIcon('dice') : '') + '<span>Dice</span>';
    roll.addEventListener('click', function(){
      var v = R3.view;
      if(v && !v.region && !v.moving && !v.wrap.querySelector('.r3-panel')){
        if(v.dice) reef3dDiceHit(v); else reef3dDice(v);
      }
    });
    var map = document.createElement('button');
    map.type = 'button'; map.className = 'r3-topbtn r3-top-map'; map.setAttribute('data-r3-map', '');
    map.setAttribute('aria-label', 'Treasure map');
    map.innerHTML = (typeof ccIcon === 'function' ? ccIcon('map') : '') + '<span>Map</span>';
    map.addEventListener('click', function(){
      var v = R3.view;
      if(v && !v.region && !v.moving && !v.wrap.querySelector('.r3-panel')) reef3dMap(v);
    });
    bar.insertBefore(roll, menuBtn || null);
    bar.insertBefore(map, menuBtn || null);
  }
  if(typeof afterRender === 'function') afterRender('cove top actions', reef3dCoveBarSync);

  var R3softBeamTex = null;
  function reef3dSoftBeamTex(night){
    var THREE = window.THREE; if(!THREE) return null;
    var key = night ? 'n' : 'd';
    if(R3softBeamTex && R3softBeamTex[key]) return R3softBeamTex[key];
    R3softBeamTex = R3softBeamTex || {};
    var W = 128, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    // Pastel aqua-gold sunlight gradient: warm champagne-gold core melting radially & upward into airy seafoam-aqua
    var cCore = night ? [175, 246, 232] : [255, 240, 198];
    var cEdge = night ? [116, 224, 218] : [164, 240, 232];
    for(var iy = 0; iy < H; iy++){
      var v = 1 - iy / (H - 1); // 0 = seabed, 1 = top of water column
      var fb = Math.min(1, v / .16); fb = fb * fb * (3 - 2 * fb);
      var ft = v <= .20 ? 1 : Math.pow(Math.max(0, 1 - (v - .20) / .80), 1.55);
      var vert = fb * ft;
      for(var ix = 0; ix < W; ix++){
        var u = (ix / (W - 1)) * 2 - 1; // -1..1 across wide column
        // Wide smooth Gaussian radial falloff + cosine edge taper -> strictly 0.000 at quad borders (zero hard edge!)
        var gauss = Math.exp(-(u * u) / (2 * .34 * .34));
        var taper = Math.pow(Math.max(0, Math.cos(u * Math.PI * .5)), 1.45);
        var rad = gauss * taper;
        var a = Math.max(0, Math.min(1, rad * vert));
        var mix = Math.min(1, Math.abs(u) * .85 + Math.max(0, v - .18) * .65);
        var idx = (iy * W + ix) * 4;
        d[idx]     = Math.round(cCore[0] + (cEdge[0] - cCore[0]) * mix);
        d[idx + 1] = Math.round(cCore[1] + (cEdge[1] - cCore[1]) * mix);
        d[idx + 2] = Math.round(cCore[2] + (cEdge[2] - cCore[2]) * mix);
        d[idx + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    R3softBeamTex[key] = tex;
    return tex;
  }
  // Soften the vertical next-deck starlight beam into an airy, wide Gaussian pastel aqua-gold sunbeam
  // (opacity ~0.26-0.34, single Y-billboarded plane, NormalBlending -> zero hard white laser column!).
  function reef3dStyleStarBeam(view){
    var THREE = window.THREE, L = view && view.life;
    if(!THREE || !L || !L.beam || !L.outer) return;
    var night = !!view.night, tex = reef3dSoftBeamTex(night);
    var softMat = new THREE.MeshBasicMaterial({
      map: tex, color: '#ffffff', transparent: true,
      opacity: night ? .33 : .29,
      depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.NormalBlending, fog: false
    });
    // Replace crossed planes in L.outer with one wide, silky Y-billboarded Gaussian ribbon (zero double-stack seam!)
    while(L.outer.children.length){
      var old = L.outer.children[0]; L.outer.remove(old);
      if(old.geometry && old.geometry.dispose) old.geometry.dispose();
    }
    if(L.outerMat && L.outerMat.dispose) L.outerMat.dispose();
    var wideGeo = new THREE.PlaneGeometry(4.8, 10.2);
    var veil = new THREE.Mesh(wideGeo, softMat);
    veil.raycast = function(){};
    L.outer.position.y = 5.05;
    L.outer.add(veil);
    L.outerMat = softMat;
    if(L.core){ L.core.visible = false; }
    if(L.coreMat){ L.coreMat.opacity = 0; L.coreMat.visible = false; }
    // Soften seabed glow pool sprite & rising motes to harmonious pastel aqua-gold
    L.beam.children.forEach(function(ch){
      if(ch !== L.outer && ch !== L.core && ch.material && ch.isSprite){
        if(L.motes && L.motes.indexOf(ch) >= 0){
          ch.scale.setScalar(.24);
          ch.material.color.set(night ? '#a4f4e8' : '#eefae4');
          ch.material.blending = THREE.NormalBlending;
        } else {
          ch.scale.set(3.4, 3.4, 1);
          ch.material.color.set(night ? '#8ceee2' : '#d8f4d8');
          ch.material.opacity = night ? .26 : .18;
          ch.material.blending = THREE.NormalBlending;
        }
      }
    });
    L.styledBeam = true;
  }
  function reef3dStyleStarBeamTick(view, t, calm){
    var L = view && view.life;
    if(!L || !L.styledBeam || !L.beam || !L.beam.visible) return;
    if(L.core) L.core.visible = false;
    var bx = L.beam.position.x, bz = L.beam.position.z;
    var camP = view.cam && view.cam.position;
    if(camP){
      L.outer.rotation.y = Math.atan2(camP.x - bx, camP.z - bz);
      var distF = Math.max(.45, Math.min(1, (Math.hypot(camP.x - bx, camP.z - bz) - 5) / 10));
      var pulse = (calm ? 1 : .90 + .10 * Math.sin(t * 2.0)) * distF;
      L.outerMat.opacity = (view.night ? .33 : .29) * pulse;
    }
    if(L.motes){
      for(var mi = 0; mi < L.motes.length; mi++){
        var m = L.motes[mi];
        if(m && m.material) m.material.opacity = Math.min(.42, m.material.opacity || 0);
      }
    }
  }

  // Upgrade the floating Golden Pearl into an unclipped, shaded nacreous pearl cradled in a fluted
  // scallop shell centered cleanly inside its tile, and enforce circular loop distance on loop boards.
  function reef3dStylePearl(view){
    var p = view.party && view.party.pearl; if(!p) return;
    var THREE = window.THREE, M = view.kit && view.kit.M, night = view.night;
    if(view.spaces && view.spaces.loop && typeof reefBoard === 'function' && typeof reef3dPearlShow === 'function'){
      var b = reefBoard(), at0 = reef3dPosition(view) || 0, mainN = view.spaces.mainN || view.spaces.length;
      if(b && typeof b.pearlAt === 'number' && b.pearlAt >= 0 && b.pearlAt < mainN){
        var d0 = Math.abs(b.pearlAt - at0), ldist = Math.min(d0, mainN - d0);
        if(ldist < 4){
          var cands = view.spaces.filter(function(s){
            if(s.kind !== 'plain' || s.branch || s.fork || s.i >= mainN || s.i <= 1) return false;
            var dd = Math.abs(s.i - at0);
            return Math.min(dd, mainN - dd) >= 6;
          });
          if(cands.length){
            b.pearlAt = cands[Math.floor(cands.length * .35)].i;
            if(typeof reefBoardSave === 'function') reefBoardSave();
            reef3dPearlShow(view);
          }
        }
      }
    }
    var halo = p.userData.halo;
    while(p.children.length) p.remove(p.children[0]);
    var yOff = -.76;
    var body = new THREE.Group(); body.position.y = yOff;
    // Latitude-shaded champagne-gold pearl (never clipped RGB 255,255,255; rotation-invariant around Y).
    var pg = new THREE.SphereGeometry(.25, 28, 20), pp = pg.attributes.position, prgb = [];
    var cTop = new THREE.Color('#c8a45c'), cMid = new THREE.Color('#b28446'), cBot = new THREE.Color('#9c6d6c'), tmp = new THREE.Color();
    for(var i = 0; i < pp.count; i++){
      var t = Math.max(0, Math.min(1, (pp.getY(i) / .25) * .5 + .5));
      if(t < .5) tmp.copy(cBot).lerp(cMid, t * 2);
      else tmp.copy(cMid).lerp(cTop, (t - .5) * 2);
      prgb.push(tmp.r, tmp.g, tmp.b);
    }
    pg.setAttribute('color', new THREE.Float32BufferAttribute(prgb, 3));
    var pm = new THREE.Mesh(pg, new THREE.MeshPhongMaterial({
      color: '#ffffff', vertexColors: true,
      emissive: night ? '#6e4c14' : '#3a2206', emissiveIntensity: night ? .30 : .08,
      specular: '#fff0c4', shininess: 62
    }));
    pm.userData.space = -1; body.add(pm);
    // Closed 10-flute pearlescent rose-lavender scallop cradle with satin gold rim & bead accents.
    var cupProf = [[0,-.25],[.12,-.24],[.22,-.19],[.29,-.09],[.31,-.03],[.27,-.01],[.19,-.08],[.09,-.15],[0,-.17]]
      .map(function(q){ return new THREE.Vector2(q[0], q[1]); });
    var cg = new THREE.LatheGeometry(cupProf, 26), cp = cg.attributes.position;
    for(var j = 0; j < cp.count; j++){
      var cx = cp.getX(j), cy = cp.getY(j), cz = cp.getZ(j), rad = Math.hypot(cx, cz);
      var rk = Math.max(0, Math.min(1, (rad - .06) / .16)); rk = rk * rk * (3 - 2 * rk);
      var ang = rad > 1e-4 ? Math.atan2(cx, cz) : 0;
      var flute = 1 + .085 * Math.cos(ang * 10) * rk;
      cp.setXYZ(j, cx * flute, cy + .016 * Math.cos(ang * 10) * rk, cz * flute);
    }
    cg.computeVertexNormals();
    var cupMat = M ? M('#df98b0') : new THREE.MeshLambertMaterial({ color: '#df98b0' });
    body.add(new THREE.Mesh(cg, cupMat));
    var goldMat = M ? M('#d8ae56') : new THREE.MeshLambertMaterial({ color: '#d8ae56' });
    var rim = new THREE.Mesh(new THREE.TorusGeometry(.272, .022, 8, 28), goldMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = -.045; body.add(rim);
    var beadGeo = new THREE.SphereGeometry(.026, 8, 6);
    for(var bi = 0; bi < 6; bi++){
      var ba = bi / 6 * Math.PI * 2;
      var bd = new THREE.Mesh(beadGeo, goldMat);
      bd.position.set(Math.cos(ba) * .282, -.032, Math.sin(ba) * .282);
      body.add(bd);
    }
    body.traverse(function(o){ o.raycast = function(){}; });
    p.add(body);
    if(halo){
      halo.position.set(0, yOff, 0);
      halo.scale.setScalar(.95);
      halo.material.color.set('#f2c464');
      halo.material.opacity = night ? .26 : .14;
      halo.renderOrder = 3;
      halo.raycast = function(){};
      p.add(halo);
    }
    p.userData.styledPearl = true;
  }

  function reef3dPlace(view, i){
    var s = view.spaces[i]; view.at = i;
    view.guide.position.set(s.x, .3 + (s.y || 0), s.z);
    var mN = view.spaces.mainN || view.spaces.length;
    if(view.spaces.lighthouse && !s.branch && i === mN - 1 && i > 0){
      var pv = view.spaces[i - 1];
      view.guide.rotation.y = Math.atan2(s.x - pv.x, s.z - pv.z);
    } else {
      var nx = reef3dAhead(view.spaces, i);
      if(nx !== s) view.guide.rotation.y = Math.atan2(nx.x - s.x, nx.z - s.z);
    }
    // the crab starts at its place beside her (it used to appear on top of her and walk out)
    if(view.crab && !view.crab.userData.entering){
      view._crabSide = null;
      view._crabSpotCache = null;
      view._crabMoveCache = null;
      var cs = reef3dCrabSpot(view);
      view.crab.position.set(cs.x, cs.y != null ? cs.y : (view.guide.position.y - .3 - (view.craftedPavilion ? .07 : 0)), cs.z);
      reef3dSyncCrabSand(view, cs);
    }
  }
  function reef3dTileOuterR(s, px, pz, crafted){
    var big = s && (s.kind === 'deck' || s.kind === 'treasure' || s.kind === 'story' || s.kind === 'start' || s.kind === 'shop');
    var R = big ? 1.25 : .86;
    if(crafted){
      var dx = px - s.x, dz = pz - s.z;
      if(dx * dx + dz * dz < 1e-6) return R * 1.09;
      var ang = Math.atan2(dz / .93, dx), seed = (s.i % 6) * .97;
      var irr = 1 + .016 * Math.sin(3 * ang + seed) + .012 * Math.cos(5 * ang + seed);
      var rx = Math.pow(Math.abs(Math.cos(ang)), .76) * 1.052 * irr * R;
      var rz = Math.pow(Math.abs(Math.sin(ang)), .76) * 1.052 * irr * R * .93;
      return Math.hypot(rx, rz);
    }
    return big ? 1.34 : .93;
  }
  function reef3dPointInPoly(poly, x, z){
    var inside = false;
    for(var a = 0, b = poly.length - 1; a < poly.length; b = a++){
      var xi = poly[a][0], zi = poly[a][1], xj = poly[b][0], zj = poly[b][1];
      if(((zi > z) !== (zj > z)) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }
  function reef3dDistToPolyEdge(poly, x, z){
    var best = Infinity;
    for(var i = 0; i < poly.length; i++){
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1;
      var t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2));
      var d = Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t));
      if(d < best) best = d;
    }
    return best;
  }
  function reef3dCrabPathInfo(view){
    if(view._crabPathInfo) return view._crabPathInfo;
    var THREE = window.THREE, spaces = view.spaces, mainN = spaces.mainN || spaces.length, isLH = !!spaces.lighthouse;
    var cx = 0, cz = 0;
    for(var i = 0; i < mainN; i++){ cx += spaces[i].x; cz += spaces[i].z; }
    cx /= (mainN || 1); cz /= (mainN || 1);
    if(isLH && typeof spaces.lighthouse.cx === 'number'){ cx = spaces.lighthouse.cx; cz = spaces.lighthouse.cz; }
    var mainCurve = null, mainSamples = [], branchSamples = [];
    if(THREE && mainN > 1){
      var pts = [];
      for(var m = 0; m < mainN; m++) pts.push(new THREE.Vector3(spaces[m].x, isLH ? (spaces[m].y || 0) : 0, spaces[m].z));
      mainCurve = new THREE.CatmullRomCurve3(pts, !!spaces.loop && !isLH);
      var nSamp = Math.max(48, mainN * 8);
      for(var k = 0; k < nSamp; k++){
        var u = isLH ? (k / Math.max(1, nSamp - 1)) : (k / nSamp), p = mainCurve.getPointAt(u), tan = mainCurve.getTangentAt(u);
        var hl = Math.hypot(tan.x, tan.z) || 1, tx = tan.x / hl, tz = tan.z / hl, nx = -tz, nz = tx;
        if(spaces.loop && nx * (p.x - cx) + nz * (p.z - cz) < 0){ nx = -nx; nz = -nz; }
        mainSamples.push({ x: p.x, y: p.y, z: p.z, tx: tx, tz: tz, nx: nx, nz: nz, u: u });
      }
      var lines = reef3dPathLines(spaces);
      for(var li = 1; li < lines.length; li++){
        var ln = lines[li]; if(ln.length < 2) continue;
        var bc = new THREE.CatmullRomCurve3(ln.map(function(s){ return new THREE.Vector3(s.x, isLH ? (s.y || 0) : 0, s.z); }));
        var bsN = ln.length * 6;
        for(var bi = 0; bi <= bsN; bi++){
          var bp = bc.getPointAt(bi / bsN);
          branchSamples.push({ x: bp.x, y: bp.y, z: bp.z });
        }
      }
    }
    var stripWidths = { town: [3.2, 10.5], caves: [4, 6.5], patterns: [3, 5], beach: [4, 6.5], light: [4, 8] };
    var rid = view.region && view.region.id, stripInfo = null;
    if(rid && stripWidths[rid] && spaces.loop && !isLH && mainN > 2){
      var iw = stripWidths[rid][0], ow = stripWidths[rid][1], innerPoly = [], outerPoly = [], curbPoly = rid === 'town' ? [] : null;
      for(var si = 0; si < mainN; si++){
        var s = spaces[si], sp = spaces[(si + mainN - 1) % mainN], sn = spaces[(si + 1) % mainN];
        var dx = sn.x - sp.x, dz = sn.z - sp.z, l = Math.hypot(dx, dz) || 1, nx2 = -dz / l, nz2 = dx / l;
        if(nx2 * (s.x - cx) + nz2 * (s.z - cz) < 0){ nx2 = -nx2; nz2 = -nz2; }
        innerPoly.push([s.x - nx2 * iw, s.z - nz2 * iw]);
        outerPoly.push([s.x + nx2 * ow, s.z + nz2 * ow]);
        if(curbPoly) curbPoly.push([s.x + nx2 * 3.05, s.z + nz2 * 3.05]);
      }
      stripInfo = { innerPoly: innerPoly, outerPoly: outerPoly, curbPoly: curbPoly, filled: rid === 'caves' || rid === 'patterns' || rid === 'light', iw: iw, ow: ow };
    }
    return (view._crabPathInfo = { mainN: mainN, cx: cx, cz: cz, mainCurve: mainCurve, mainSamples: mainSamples, branchSamples: branchSamples, stripInfo: stripInfo });
  }
  function reef3dCrabY(view, interpY){
    var curSpace = view.spaces && view.spaces[view.at];
    var baseY = typeof interpY === 'number' ? interpY : ((curSpace && typeof curSpace.y === 'number') ? curSpace.y : (view.guide ? view.guide.position.y - .3 : 0));
    if(view.spaces && view.spaces.lighthouse){
      var off = typeof view.spaces.lighthouse.treadTopOffset === 'number' ? view.spaces.lighthouse.treadTopOffset : -.28;
      return baseY + off;
    }
    if(view.craftedPavilion) return baseY - .070;
    var rid = view.region && view.region.id;
    if(!rid) return view.guide ? view.guide.position.y - .3 : baseY;
    if(rid === 'captain') return baseY - .120;
    if(rid === 'lagoon') return baseY - .094;
    if(rid === 'light') return baseY - .304;
    if(rid === 'town') return baseY - .312;
    return baseY - .316;
  }
  // Sculpt a single seamless flat-topped cream-sand beach cove / lagoon sandbank directly beneath Kiko
  // on water-surrounded boards (Coral Cove & Story Lagoon) so all legs rest 100% on solid flat sand with
  // zero tile-rim clipping and zero open-water overhang.
  function reef3dBuildCrabSandGeo(THREE, kx, kz, ax, az, bx, bz, flatR, style, baseY){
    var mx = (ax + bx) * .5, mz = (az + bz) * .5;
    var kMix = style === 'cove' ? .80 : .74;
    var cx = kx * kMix + mx * (1 - kMix), cz = kz * kMix + mz * (1 - kMix), nSeg = 28;
    function circleRay(ox, oz, rad, dx, dz){
      var ex = cx - ox, ez = cz - oz, b = ex * dx + ez * dz, c = ex * ex + ez * ez - rad * rad, disc = b * b - c;
      return disc < 0 ? 0 : Math.max(0, -b + Math.sqrt(disc));
    }
    var baseR = [];
    for(var i = 0; i < nSeg; i++){
      var ang = i / nSeg * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
      var rK = circleRay(kx, kz, flatR, dx, dz);
      var rM = circleRay(mx, mz, style === 'cove' ? .98 : .92, dx, dz);
      var rA = style === 'lagoon' ? circleRay(ax, az, .90, dx, dz) * .84 : 0;
      var rB = style === 'lagoon' ? circleRay(bx, bz, .90, dx, dz) * .84 : 0;
      var m0 = Math.max(rK, rM, rA, rB);
      var sm = m0 + .14 * Math.log(
        Math.exp((rK - m0) / .14) + Math.exp((rM - m0) / .14) +
        (rA > 0 ? Math.exp((rA - m0) / .14) : 0) + (rB > 0 ? Math.exp((rB - m0) / .14) : 0)
      );
      var wob = .024 * (.5 + .5 * Math.sin(ang * 3 + kx * .7 + kz * .5));
      baseR.push(Math.max(rK + .02, sm + wob));
    }
    for(var pass = 0; pass < 2; pass++){
      var nextR = [];
      for(var j = 0; j < nSeg; j++){
        var prev = baseR[(j + nSeg - 1) % nSeg], cur = baseR[j], nxt = baseR[(j + 1) % nSeg];
        var ang2 = j / nSeg * Math.PI * 2;
        var minNeed = circleRay(kx, kz, flatR, Math.cos(ang2), Math.sin(ang2)) + .02;
        nextR.push(Math.max(minNeed, prev * .22 + cur * .56 + nxt * .22));
      }
      baseR = nextR;
    }
    var y0 = baseY || 0;
    var rings = style === 'cove' ? [
      { dr: 0.00, y: y0 - .070, col: new THREE.Color('#f2e2c4') },
      { dr: 0.04, y: y0 - .071, col: new THREE.Color('#f6ebd4') },
      { dr: 0.16, y: y0 - .102, col: new THREE.Color('#ddd0b8') },
      { dr: 0.30, y: y0 - .143, col: new THREE.Color('#c9dcc4') }
    ] : [
      { dr: 0.00, y: y0 - .096, col: new THREE.Color('#e6dab6') },
      { dr: 0.04, y: y0 - .098, col: new THREE.Color('#dfdab7') },
      { dr: 0.18, y: y0 - .236, col: new THREE.Color('#c7d8ae') },
      { dr: 0.34, y: y0 - .495, col: new THREE.Color('#b6cba0') },
      { dr: 0.48, y: y0 - .595, col: new THREE.Color('#7fbdad') }
    ];
    var pos = [], cols = [], idx = [], c0 = rings[0].col;
    pos.push(cx, rings[0].y, cz);
    cols.push(c0.r, c0.g, c0.b);
    for(var ri = 0; ri < rings.length; ri++){
      var rg = rings[ri], rc = rg.col;
      for(var ai = 0; ai < nSeg; ai++){
        var a = ai / nSeg * Math.PI * 2, rr = baseR[ai] + rg.dr;
        var vx = cx + Math.cos(a) * rr, vz = cz + Math.sin(a) * rr;
        var shade = ri <= 1 ? (.985 + .02 * Math.sin(vx * .45 + vz * .38)) : (.96 + .04 * Math.cos(a - .6));
        pos.push(vx, rg.y, vz);
        cols.push(Math.min(1, rc.r * shade), Math.min(1, rc.g * shade), Math.min(1, rc.b * shade));
      }
    }
    for(var fi = 0; fi < nSeg; fi++) idx.push(0, 1 + (fi + 1) % nSeg, 1 + fi);
    for(var rj = 0; rj < rings.length - 1; rj++){
      var row0 = 1 + rj * nSeg, row1 = 1 + (rj + 1) * nSeg;
      for(var qi = 0; qi < nSeg; qi++){
        var qn = (qi + 1) % nSeg;
        idx.push(row0 + qi, row0 + qn, row1 + qn, row0 + qi, row1 + qn, row1 + qi);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  function reef3dSyncCrabSand(view, spot){
    if(view && view._crabSand){
      if(view._crabSand.parent) view._crabSand.parent.remove(view._crabSand);
      if(view._crabSand.geometry && view._crabSand.geometry.dispose) view._crabSand.geometry.dispose();
      view._crabSand = null;
    }
  }
  // Compute a "?" block's stall-avoidance offset so no "?" block ever intersects or overlaps Bok's stall awning/poles
  // in 3D (< 2.85u horizontally) OR in camera-projected 2D screen space (e.g. Story Lagoon sp[10] behind Reed Stall).
  function reef3dQBlockStallShift(view, s, projCam, qx, qy, qz, qScale, out){
    var dx = 0, dy = 0, dz = 0;
    var THREE = window.THREE;
    var people = view && view.regionPeople;
    var stall = people && !people.disposed && people.stall && people.stall.visible !== false ? people.stall : null;
    if(!stall || !stall.position || !THREE || view.at === s.i){
      if(out){ out.dx = 0; out.dy = 0; out.dz = 0; return out; }
      return { dx: 0, dy: 0, dz: 0 };
    }
    var stp = stall.position;
    var dXZ = Math.hypot(qx - stp.x, qz - stp.z);
    if(dXZ >= 10.8){
      if(out){ out.dx = 0; out.dy = 0; out.dz = 0; return out; }
      return { dx: 0, dy: 0, dz: 0 };
    }
    // Cache world-space stall Box3 (padded slightly for finials/eaves) invalidated if stall moves or turns.
    var stKey = stp.x.toFixed(2) + ',' + (stp.y || 0).toFixed(2) + ',' + stp.z.toFixed(2) + ',' + ((stall.rotation && stall.rotation.y) || 0).toFixed(2);
    var sBox = stall.userData && stall.userData._qbStallBox;
    if(!sBox || stall.userData._qbStallKey !== stKey){
      if(typeof stall.updateMatrixWorld === 'function') stall.updateMatrixWorld(true);
      var b = new THREE.Box3().setFromObject(stall);
      if(b.isEmpty()){
        b.set(
          new THREE.Vector3(stp.x - 1.35, (stp.y || 0), stp.z - .90),
          new THREE.Vector3(stp.x + 1.35, (stp.y || 0) + 2.70, stp.z + .90)
        );
      } else {
        b.min.x -= .10; b.max.x += .10; b.min.z -= .10; b.max.z += .10; b.max.y += .08;
      }
      stall.userData = stall.userData || {};
      stall.userData._qbStallBox = sBox = b;
      stall.userData._qbStallKey = stKey;
    }
    // 1. Direct 3D proximity guard (< 2.85u horizontally from stall center): vertical-only lift over awning (maxXZShift = 0.00).
    if(dXZ < 2.85){
      dy = Math.max(dy, Math.max(.65, (sBox.max.y + .58) - qy));
    }
    // 2. Exact camera-projected 2D awning-pole & roof overlap guard (vertical-only lift so every cube stays strictly centered over its tile, maxXZShift = 0.00).
    if(projCam && THREE.Vector3 && THREE.Matrix4){
      var refW = 1024, refH = 1024 / Math.max(.4, projCam.aspect || (1024 / 640));
      var pv = view._qbStV || (view._qbStV = new THREE.Vector3());
      var pvL = view._qbStVL || (view._qbStVL = new THREE.Vector3());
      var cInv = view._qbStInv || (view._qbStInv = new THREE.Matrix4());
      cInv.copy(projCam.matrixWorld).invert();
      var stMinX = 1e9, stMaxX = -1e9, stMinY = 1e9, stMaxY = -1e9, stFront = 0;
      for(var ix = 0; ix < 2; ix++){
        for(var iy = 0; iy < 2; iy++){
          for(var iz = 0; iz < 2; iz++){
            var sx0 = ix ? sBox.max.x : sBox.min.x, sy0 = iy ? sBox.max.y : sBox.min.y, sz0 = iz ? sBox.max.z : sBox.min.z;
            pvL.set(sx0, sy0, sz0).applyMatrix4(cInv);
            if(pvL.z > -.4) continue;
            stFront++;
            pv.set(sx0, sy0, sz0).project(projCam);
            var px0 = (pv.x * .5 + .5) * refW, py0 = (-pv.y * .5 + .5) * refH;
            if(px0 < stMinX) stMinX = px0; if(px0 > stMaxX) stMaxX = px0;
            if(py0 < stMinY) stMinY = py0; if(py0 > stMaxY) stMaxY = py0;
          }
        }
      }
      if(stFront >= 2 && stMaxX > -40 && stMinX < refW + 40 && stMaxY > -40 && stMinY < refH + 40){
        var qHr = .44 * qScale, qVr = .54 * qScale; // vertical pad includes idle bob
        function evalGap(tx, ty, tz){
          var qMinX = 1e9, qMaxX = -1e9, qMinY = 1e9, qMaxY = -1e9, qFront = 0;
          for(var qxS = -1; qxS <= 1; qxS += 2){
            for(var qyS = -1; qyS <= 1; qyS += 2){
              for(var qzS = -1; qzS <= 1; qzS += 2){
                var wxQ = tx + qxS * qHr, wyQ = ty + qyS * qVr, wzQ = tz + qzS * qHr;
                pvL.set(wxQ, wyQ, wzQ).applyMatrix4(cInv);
                if(pvL.z > -.4) continue;
                qFront++;
                pv.set(wxQ, wyQ, wzQ).project(projCam);
                var qxp = (pv.x * .5 + .5) * refW, qyp = (-pv.y * .5 + .5) * refH;
                if(qxp < qMinX) qMinX = qxp; if(qxp > qMaxX) qMaxX = qxp;
                if(qyp < qMinY) qMinY = qyp; if(qyp > qMaxY) qMaxY = qyp;
              }
            }
          }
          if(qFront < 2) return { gap: 999, minY: 999, cx: 0 };
          var gx = Math.max(0, qMinX - stMaxX, stMinX - qMaxX);
          var gy = Math.max(0, qMinY - stMaxY, stMinY - qMaxY);
          var gap = (gx <= 0 && gy <= 0)
            ? -Math.min(Math.min(qMaxX, stMaxX) - Math.max(qMinX, stMinX), Math.min(qMaxY, stMaxY) - Math.max(qMinY, stMinY))
            : Math.hypot(gx, gy);
          return { gap: gap, minY: qMinY, cx: (qMinX + qMaxX) * .5 };
        }
        var curE = evalGap(qx, qy + dy, qz);
        if(curE.gap < 16){
          var tries = [.55, .85, 1.15, 1.45];
          var best = null;
          for(var ti = 0; ti < tries.length; ti++){
            var tdY = Math.max(dy, tries[ti]);
            var res = evalGap(qx, qy + tdY, qz);
            if(res.gap >= 16 && res.minY > 48){
              dy = tdY;
              best = res;
              break;
            }
            if(!best || res.gap > best.gap){
              best = { gap: res.gap, dy: tdY };
            }
          }
          if(best && best.dy != null && best.gap > curE.gap){
            dy = best.dy;
          }
        }
      }
    }
    if(out){ out.dx = 0; out.dy = dy; out.dz = 0; return out; }
    return { dx: 0, dy: dy, dz: 0 };
  }
  // Compute a "?" block's effective world position & scale (strictly centered directly over its tile center,
  // maxXZShift = 0.00, with vertical-only stall awning clearance on region boards) so reef3dCrabSpot and reef3dFrame agree 100%.
  function reef3dQBlockEffectivePos(view, s, projCam, out){
    var used = !!(s.qb && s.qb.userData && s.qb.userData.used);
    var qy0 = (used ? (REEF3D_QY - .12) : REEF3D_QY) + (s.y || 0), qx = s.x, qy = qy0, qz = s.z, qScale = 1;
    if(view.at === s.i) qy += 1.06;
    if(view.crab && view._crabTile === s.i) qy += 0.95;
    if(view && view.regionPeople && !view.regionPeople.disposed && view.regionPeople.stall && view.at !== s.i){
      var stSh = reef3dQBlockStallShift(view, s, projCam, qx, qy, qz, qScale, view._qbStOut || (view._qbStOut = {}));
      qy += stSh.dy;
    }
    if(out){ out.x = qx; out.y = qy; out.z = qz; out.scale = qScale; return out; }
    return { x: qx, y: qy, z: qz, scale: qScale };
  }
  // Kiko follows strictly ONE TILE BEHIND Shelly, grounded 0.00u flush on top of the previous tile's surface
  // (or 1.75u directly behind start space 0 along the backward tangent on non-loop boards like Lighthouse).
  function reef3dCrabSpot(view){
    var g = view.guide.position, spaces = view.spaces;
    var cur = spaces && spaces[view.at];
    if(!spaces || !cur){
      return { x: g.x - 1.75, z: g.z, y: reef3dCrabY(view), tileIndex: -1, onTile: false };
    }
    var mN = spaces.mainN || spaces.length;
    var lh = !!(spaces && spaces.lighthouse);
    var prev = null;
    if(cur.branch){
      var backId = (cur.links || []).find(function(k){ return k !== cur.i && k < cur.i; });
      prev = backId != null ? spaces[backId] : spaces[cur.jn];
      if(prev && (prev === cur || Math.hypot(prev.x - cur.x, prev.z - cur.z) < 2.0) && spaces[cur.jn] && spaces[cur.jn] !== cur){
        prev = spaces[cur.jn];
      }
    } else if(cur.i > 0){
      prev = spaces[cur.i - 1];
    } else if(spaces.loop && !lh){
      prev = spaces[mN - 1];
    }
    if(prev && prev.kind === 'surprise'){
      var prev2 = prev.i > 0 ? spaces[prev.i - 1] : (spaces.loop && !lh ? spaces[mN - 1] : null);
      if(prev2 && prev2 !== cur && prev2.kind !== 'surprise' && Math.hypot(prev2.x - cur.x, prev2.z - cur.z) >= 2.0){
        prev = prev2;
      } else {
        prev = null;
      }
    }
    if(prev && (prev === cur || Math.hypot(prev.x - cur.x, prev.z - cur.z) < 2.0)){
      prev = null;
    }
    view._crabTile = prev ? prev.i : -1;
    if(prev){
      var isCrafted = !!view.craftedPavilion;
      var hasTileArt = !!(view.kit && view.kit.tileArt);
      var bigPrev = prev.kind === 'deck' || prev.kind === 'treasure' || prev.kind === 'story' || prev.kind === 'start' || prev.kind === 'shop';
      var discTop = isCrafted ? 0.352 : (hasTileArt ? 0.326 : (bigPrev ? 0.345 : 0.335));
      var tileTopY = (prev.y || 0) + discTop;
      return { x: prev.x, z: prev.z, y: tileTopY, tileIndex: prev.i, onTile: true };
    }
    var nxt = reef3dAhead(spaces, cur.i);
    var dx = (nxt && nxt !== cur) ? (nxt.x - cur.x) : Math.sin(view.guide.rotation.y || 0);
    var dz = (nxt && nxt !== cur) ? (nxt.z - cur.z) : Math.cos(view.guide.rotation.y || 0);
    var len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    var startBack = (lh && cur.i === 0) ? 2.28 : 1.75;
    var bx = cur.x - dx * startBack, bz = cur.z - dz * startBack;
    var startGroundY = lh
      ? (typeof spaces.lighthouse.floorY === 'number' ? spaces.lighthouse.floorY : reef3dCrabY(view, cur.y))
      : ((view.region || view.craftedPavilion) ? reef3dCrabY(view, cur.y) : (view.groundY ? view.groundY(bx, bz) : reef3dCrabY(view)));
    return { x: bx, z: bz, y: startGroundY, tileIndex: -1, onTile: false };
  }
  // Gently seat Shelly slightly back-left on her encounter rug (moving her 3 rug contact shadows in lockstep)
  // and refine interior camera framing so her outstretched front flippers clear the top edge of the bottom dialog card.
  function reef3dTuneEncounterInterior(view, out, look){
    var e = view && view.encounter, intr = e && e.interior;
    if(!intr) return;
    var yaw = intr.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
    if(!intr._shellyDialogFramed && view.guide){
      intr._shellyDialogFramed = true;
      var dx = -.24, dz = -.34, yawOff = -.10;
      var wdx = dx * cy + dz * sy, wdz = -dx * sy + dz * cy;
      intr.shellyX += wdx;
      intr.shellyZ += wdz;
      intr.shellyBaseRotY = (intr.shellyBaseRotY != null ? intr.shellyBaseRotY : view.guide.rotation.y) + yawOff;
      view.guide.position.x = intr.shellyX;
      view.guide.position.z = intr.shellyZ;
      view.guide.rotation.y = intr.shellyBaseRotY;
      view.guide.scale.multiplyScalar(.95);
      if(intr.room && Array.isArray(intr.room.children)){
        for(var ci = 0; ci < intr.room.children.length; ci++){
          var ch = intr.room.children[ci];
          if(ch && ch.isMesh && ch.position && ch.position.y > .020 && ch.position.y < .025){
            ch.position.x += dx;
            ch.position.z += dz;
          }
        }
      }
    }
    if(out && look){
      var camDz = .16;
      out.x += camDz * sy;
      out.y += .04;
      out.z += camDz * cy;
      look.y -= .025;
    }
  }
  // Mario Party 8 low over-the-shoulder follow cameras: [height, back, lookAhead, lookYAboveGuide]
  var REEF3D_REGION_CAMERA = {
    town:     [5.6, 11.8, 3.5, 1.40],
    lagoon:   [6.0, 13.2, 3.0, 1.30],
    caves:    [5.6, 12.6, 2.8, 1.25],
    patterns: [5.8, 13.0, 2.9, 1.25],
    beach:    [5.8, 12.0, 3.6, 1.40],
    light:    [4.9, 15.6, 2.7, 1.15],
    captain:  [4.85, 12.8, 2.4, 1.38]
  };
  if(typeof window !== 'undefined') window.REEF3D_REGION_CAMERA = REEF3D_REGION_CAMERA;
  function reef3dCamTarget(view, out, look){
    if(regionEncounterCamera(view, out, look)){
      reef3dTuneEncounterInterior(view, out, look);
      return;
    }
    var g = view.guide.position;
    var f = view.w && view.w < 640 ? .95 : .6;
    var gy = g.y - .3;   // the level she's on (the ship's hold at night or helical stair step)
    // Giant Spiral Lighthouse: dramatic inward-and-upward helical camera inside the sunlit rotunda
    // showcasing Shelly & Kiko on stepped spiral stairs, elevated Keeper Hana, central Fresnel beacon & tidal pool,
    // Turn 1 climbing up to Bok's stall, and Turn 2 spiraling overhead.
    if(view.region && view.region.id === 'light' && (view.spaces.lighthouse || view.spaces.some(function(s){ return Math.abs(s.y || 0) > .5; }))){
      var lh = view.spaces.lighthouse || {};
      var sp = view.spaces, mN = sp.mainN || sp.length, cur = sp[view.at] || sp[0];
      var cx = typeof lh.cx === 'number' ? lh.cx : 0, cz = typeof lh.cz === 'number' ? lh.cz : 0;
      var rBot = lh.rBottom || 24.0, hTot = lh.hTotal || 22.0, hWall = lh.hWall || 38.0;
      var rWallBase = lh.rWallBase || (rBot + 5.8), rWallTop = lh.rWallTop || (rBot + 3.0);
      var setL = REEF3D_REGION_CAMERA.light;
      var asp = view.w && view.h ? view.w / view.h : 1.6;
      var portrait = Math.max(0, Math.min(1, (1.05 - asp) / .45));
      var radAng = Math.atan2(g.z - cz, g.x - cx), radX = Math.cos(radAng), radZ = Math.sin(radAng);
      var rCur = Math.hypot(g.x - cx, g.z - cz);
      var wallFrac = Math.max(0, Math.min(1, (gy + setL[0]) / Math.max(1, hWall)));
      var wallR = rWallBase + (rWallTop - rWallBase) * wallFrac;
      var climbFrac = Math.max(0, Math.min(1, gy / Math.max(1, hTot)));
      if(cur.branch){
        var nxtB = reef3dAhead(sp, view.at);
        var bdx = nxtB.x - cur.x, bdz = nxtB.z - cur.z, bL = Math.hypot(bdx, bdz) || 1;
        bdx /= bL; bdz /= bL;
        var bcx = g.x - bdx * 10.2, bcz = g.z - bdz * 10.2;
        var bcr = Math.hypot(bcx - cx, bcz - cz), maxBR = Math.max(rCur + 1.0, wallR - 2.3);
        if(bcr > maxBR && bcr > .1){ var bs = maxBR / bcr; bcx = cx + (bcx - cx) * bs; bcz = cz + (bcz - cz) * bs; }
        out.set(bcx, gy + setL[0] + .4, bcz);
        look.set(g.x + bdx * 5.2 - radX * 1.6, g.y + 2.2, g.z + bdz * 5.2 - radZ * 1.6);
      } else {
        var i2 = Math.min(mN - 1, cur.i + 2);
        var pA = cur.i < mN - 1 ? cur : sp[Math.max(0, cur.i - 1)];
        var pB = cur.i < mN - 1 ? sp[i2] : cur;
        var fwdX = pB.x - pA.x, fwdZ = pB.z - pA.z, fL = Math.hypot(fwdX, fwdZ) || 1;
        fwdX /= fL; fwdZ /= fL;
        var angSign = (radX * fwdZ - radZ * fwdX) >= 0 ? 1 : -1;
        var camR = Math.min(wallR - 2.3, rCur + (3.4 - portrait * 3.1) + climbFrac * (1.2 - portrait * .9));
        var backD = (setL[1] - climbFrac * 2.4) * (1 - portrait * .04);
        var dTheta = -angSign * (backD / Math.max(6, camR));
        var camAng = radAng + dTheta;
        out.set(cx + Math.cos(camAng) * camR, gy + setL[0] + portrait * .4, cz + Math.sin(camAng) * camR);
        // Sweep lookR inward across the rotunda on desktop so Shelly, Kiko & Hana read as bold foreground stars
        // while still framing the Fresnel beacon, crystal tidal pool, compass rose, astrolabe & climbing stairs (and centered on phones).
        var inwardSweep = (4.60 - portrait * 5.60) * (1 - climbFrac * .52);
        var lookR = Math.max(4.5, rCur - inwardSweep);
        var lookArc = setL[2] * (1 - portrait * .36) * (1 - climbFrac * .25);
        var lookAng = radAng + angSign * (lookArc / Math.max(6, rCur));
        var lookY = setL[3] * (1 - portrait * .42) * (1 - climbFrac * .42);
        look.set(cx + Math.cos(lookAng) * lookR, g.y + lookY, cz + Math.sin(lookAng) * lookR);
      }
      view.camMode = 'light'; return;
    }
    if(view.spaces.loop){
      var current = view.spaces[view.at], ahead = reef3dAhead(view.spaces, view.at);
      var dx = ahead.x - current.x, dz = ahead.z - current.z, length = Math.hypot(dx, dz) || 1;
      var settingLoop = view.region ? REEF3D_REGION_CAMERA[view.region.id] : [6.8, 12.6, 2.7, 0.90];
      var lookYOff = settingLoop[3] != null ? settingLoop[3] : 1.25;
      dx /= length; dz /= length;
      out.set(g.x - dx * settingLoop[1], gy + settingLoop[0], g.z - dz * settingLoop[1]);
      look.set(g.x + dx * settingLoop[2], g.y + lookYOff, g.z + dz * settingLoop[2]);
      if(view.crab){
        var spLoop = view.spaces, mNLoop = spLoop.mainN || spLoop.length, prevLoop = null;
        if(current.branch){
          var backLoopId = (current.links || []).find(function(k){ return k < current.i; });
          prevLoop = backLoopId != null ? spLoop[backLoopId] : spLoop[current.jn];
        } else if(current.i > 0){
          prevLoop = spLoop[current.i - 1];
        } else {
          prevLoop = spLoop[mNLoop - 1];
        }
        if(prevLoop && Math.hypot(prevLoop.x - current.x, prevLoop.z - current.z) <= 4.5){
          look.x += (prevLoop.x - look.x) * .15;
          look.z += (prevLoop.z - look.z) * .15;
        }
      }
      if(view.region && view.region.id === 'captain' && view._shipPoly){
        var capWallPad = 2.45;
        if(!reef3dPointInPoly(view._shipPoly, out.x, out.z) || reef3dDistToPolyEdge(view._shipPoly, out.x, out.z) < capWallPad){
          var capLo = .35, capHi = 1.0;
          for(var capIt = 0; capIt < 10; capIt++){
            var capMid = (capLo + capHi) * .5;
            var capTx = g.x + (out.x - g.x) * capMid, capTz = g.z + (out.z - g.z) * capMid;
            if(reef3dPointInPoly(view._shipPoly, capTx, capTz) && reef3dDistToPolyEdge(view._shipPoly, capTx, capTz) >= capWallPad) capLo = capMid;
            else capHi = capMid;
          }
          out.x = g.x + (out.x - g.x) * capLo;
          out.z = g.z + (out.z - g.z) * capLo;
          out.y = gy + 2.8 + (settingLoop[0] - 2.8) * capLo;
        }
      }
      if(view.craftedPavilion){
        var aspect = view.w && view.h ? view.w / view.h : 1.02;
        var portraitC = Math.max(0, Math.min(1, (1.02 - aspect) / .56));
        if(view.at === 0){
          // Keep the Nautilus pavilion, Shelly, and "?" block together in the opening frame.
          var p0 = view.craftedPavilion, toward = Math.sign(-dz * (p0.x - current.x) + dx * (p0.z - current.z));
          var shift = (.42 + portraitC * .55) * toward;
          look.x -= dz * shift + dx * portraitC * 1.4;
          look.z += dx * shift - dz * portraitC * 1.4;
          look.y += .22;
          out.x -= dx * portraitC * 2.4; out.z -= dz * portraitC * 2.4;
          out.y += portraitC * 1.0 - .35;
        } else {
          reef3dCamClearCrafted(view, out, look, g, portraitC);
        }
      }
      view.camMode = 'loop'; return;
    }
    if(view.region){
      var setting = REEF3D_REGION_CAMERA[view.region.id];
      var lookYOffR = setting[3] != null ? setting[3] : 1.3;
      out.set(g.x * f, gy + setting[0], g.z + setting[1]);
      look.set(g.x * (f + .05), g.y + lookYOffR, g.z - setting[2]);
      view.camMode = 'region'; return;
    }
    if(view.night){
      // On the spiral staircase the camera swings out to a three-quarter view of it, so the climb down reads.
      var st = view.spaces.stair;
      if(st && Math.hypot(g.x - st.cx, g.z - st.cz) < 4.4 && gy < -.5 && gy > st.low + .5){
        var sd = st.cx > 0 ? -1 : 1;   // from above the open hold, a little to the side, looking down into the spiral
        out.set(st.cx + sd * 3, st.low + 12.5, st.cz - 6.5); look.set(st.cx, gy - .8, st.cz + .3); view.camMode = 'stair'; return;
      }
      if(st && gy < st.low + .8){   // down in the hold: high above and looking steeply down, so the broken deck edge
        // and the top deck's things don't block her, and the path ahead along the hold stays in view
        out.set(g.x * f, gy + 15.5, g.z + 7.5); look.set(g.x * (f + .05), gy + .2, g.z - 5.5); view.camMode = 'hold';
        reef3dCamMasts(view, out, 3.4); return;   // the mast that rises out of the hold is tall: step round it here too
      }
      var sd2 = view.shipDeck, side = g.x > 0 ? 1 : -1;
      if(sd2 && Math.abs(g.x) > sd2.half + .5){   // off the ship on the sand: the camera goes out there too, not behind the hull
        out.set(g.x + side * 5, 9 + gy * .3, g.z + 9); look.set(g.x - side * .5, gy + .5, g.z - 3); view.camMode = 'sand'; return;   // from outside and above the gangplank
      }
      // Elsewhere on the ship it sits lower and looks ahead, so the masts, sails and the drop to the hold show.
      out.set(g.x * f, 8.2 + gy * .55, g.z + 11.5 + (gy < -1 ? -gy * .25 : 0));
      look.set(g.x * (f + .05), g.y + 1.35, g.z - 4.5); view.camMode = 'deck';
      reef3dCamMasts(view, out, 2.8);
      return;
    }
    out.set(g.x * f, 6.4 + gy, g.z + 10.6);
    look.set(g.x * (f + .05), g.y + 1.15, g.z - 4.0);
  }
  // Keep tall Coral Cove structures (especially the Nautilus Pavilion) out of the camera-to-Shelly sightline.
  function reef3dCamClearCrafted(view, out, look, g, portraitC){
    var p = view.craftedPavilion;
    if(!p) return;
    var blockers = [{ x: p.x, z: p.z, r: 5.5 + portraitC * .65, topY: (p.y || 0) + 7.8 }];
    var obs = view._coveObstacles || [];
    for(var i = 0; i < obs.length; i++){
      var ob = obs[i];
      if(!ob || ob.maxY < 1.15) continue;
      if(Math.hypot(ob.x - p.x, ob.z - p.z) < 2.6) continue;
      var tall = ob.maxY >= 2.2;
      blockers.push({
        x: ob.x, z: ob.z,
        r: tall ? Math.max(2.3, Math.min(4.8, (ob.r || 2.0) + 1.0 + portraitC * .35))
          : Math.max(1.35, Math.min(2.5, (ob.r || 1.1) + .65 + portraitC * .25)),
        topY: ob.maxY + (tall ? 1.0 : .75)
      });
    }
    var tx = g.x, ty = g.y + .9, tz = g.z;
    function occlusion(cx, cy, cz){
      var sx = tx - cx, sy = ty - cy, sz = tz - cz, L2 = sx * sx + sz * sz;
      if(L2 < .1) return 0;
      var pen = 0;
      for(var k = 0; k < blockers.length; k++){
        var b = blockers[k];
        var u = ((b.x - cx) * sx + (b.z - cz) * sz) / L2;
        if(u < -.22 || u > .94) continue;
        var uc = Math.max(0, Math.min(1, u));
        var rx = cx + sx * uc, rz = cz + sz * uc, ry = cy + sy * uc;
        if(ry > b.topY) continue;
        var dist = Math.hypot(rx - b.x, rz - b.z);
        if(dist < b.r){
          var weight = uc < .55 ? 1.35 : 1.0;
          pen = Math.max(pen, (b.r - dist) * weight);
        }
      }
      return pen;
    }
    if(occlusion(out.x, out.y, out.z) <= 0) return;
    // Compute loop center so ties prefer swinging inward over open lagoon water.
    var lcx = 0, lcz = 0, sp = view.spaces || [], mN = sp.mainN || sp.length || 1;
    for(var s = 0; s < mN; s++){ lcx += sp[s].x; lcz += sp[s].z; }
    lcx /= mN; lcz /= mN;
    var ox = out.x - g.x, oz = out.z - g.z, rad = Math.hypot(ox, oz) || 12.6, baseA = Math.atan2(oz, ox);
    var bestX = out.x, bestY = out.y, bestZ = out.z, bestCost = 1e9;
    var yOffsets = [0, 1.4, 2.8];
    for(var yi = 0; yi < yOffsets.length; yi++){
      var cy = out.y + yOffsets[yi];
      for(var step = 1; step <= 18; step++){
        var deg = step * 7 * Math.PI / 180;
        for(var dir = -1; dir <= 1; dir += 2){
          var ang = baseA + dir * deg;
          var cx = g.x + Math.cos(ang) * rad, cz = g.z + Math.sin(ang) * rad;
          var occ = occlusion(cx, cy, cz);
          var toCenter = Math.hypot(cx - lcx, cz - lcz) * .018;
          var cost = occ * 100 + deg * 1.6 + yOffsets[yi] * .55 + toCenter;
          if(cost < bestCost){
            bestCost = cost; bestX = cx; bestY = cy; bestZ = cz;
          }
          if(occ <= 0 && yi === 0 && step <= 12){
            // Found a clean horizontal orbit with zero occlusion; still test the opposite sign on this step.
            break;
          }
        }
        if(bestCost < 10 && yi === 0) break;
      }
      if(bestCost < 10) break;
    }
    out.set(bestX, bestY, bestZ);
    // Keep Shelly cleanly framed slightly below center while still looking gently down the path ahead.
    look.x = g.x + (look.x - g.x) * .68;
    look.z = g.z + (look.z - g.z) * .68;
  }
  // A mast standing between the camera and her: slide the camera sideways until it clears (by room, in units).
  function reef3dCamMasts(view, out, room){
    var g = view.guide.position, ms = view.wreck && view.wreck.masts;
    (ms || []).forEach(function(m){
      var dx = g.x - out.x, dz = g.z - out.z, L2 = dx * dx + dz * dz, u = ((m.x - out.x) * dx + (m.z - out.z) * dz) / L2;
      if(u < .08 || u > .92) return;
      var px = out.x + dx * u - m.x, pz = out.z + dz * u - m.z, dist = Math.sqrt(px * px + pz * pz);
      if(dist < room){ var push = (room - dist) / (1 - u) + .4, dir = px !== 0 ? Math.sign(px) : (m.x > g.x ? -1 : 1); out.x += dir * push; }
    });
  }
  function reef3dWantFov(view, w){
    if(w < 640) return 52;
    var inEnc = typeof regionEncounterActive === 'function' && regionEncounterActive(view);
    if(!inEnc && view.region && view.region.id === 'light') return 49;
    return 42;
  }
  function reef3dSize(view){
    if(!view._sizeObsInit || (!view._sizeObs && !view._onWinResize)){
      view._sizeObsInit = true;
      view._sizeDirty = true;
      if(typeof ResizeObserver === 'function' && view.wrap && !view._sizeObs){
        view._sizeObs = new ResizeObserver(function(entries){
          var cr = entries && entries[0] && entries[0].contentRect;
          if(cr && cr.width > 0 && cr.height > 0){
            view._wrapW = Math.round(cr.width);
            view._wrapH = Math.round(cr.height);
          }
          view._sizeDirty = true;
        });
        view._sizeObs.observe(view.wrap);
      }
      if(typeof window !== 'undefined' && !view._onWinResize){
        view._onWinResize = function(){ view._wrapW = 0; view._wrapH = 0; view._sizeDirty = true; };
        window.addEventListener('resize', view._onWinResize);
      }
    }
    if(!view._sizeDirty && view.w > 0){
      var wantFovCached = reef3dWantFov(view, view.w);
      if(view.cam.fov !== wantFovCached){ view.cam.fov = wantFovCached; view.cam.updateProjectionMatrix(); view.dirty = true; }
      return;
    }
    var w = (view.wrap && view.wrap.clientWidth) || view._wrapW || 1;
    var h = (view.wrap && view.wrap.clientHeight) || view._wrapH || 1;
    view._sizeDirty = false;
    var wantFov = reef3dWantFov(view, w);
    if(view.w === w && view.h === h){
      if(view.cam.fov !== wantFov){ view.cam.fov = wantFov; view.cam.updateProjectionMatrix(); view.dirty = true; }
      return;
    }
    view.w = w; view.h = h; view.renderer.setSize(w, h, false);
    view.cam.aspect = w / h; view.cam.fov = wantFov; view.cam.updateProjectionMatrix(); view.dirty = true;
  }
  function reef3dCollectHideOnZoom(obj, out){
    if(!obj) return;
    if(obj.userData && obj.userData.hideOnZoom === true) out.push(obj);
    var ch = obj.children;
    if(!ch) return;
    for(var i = 0; i < ch.length; i++) reef3dCollectHideOnZoom(ch[i], out);
  }
  function reef3dSyncHideOnZoom(viewOrObj, show){
    if(!viewOrObj) return;
    if(viewOrObj.scene){
      var view = viewOrObj;
      var wantShow = show !== undefined ? !!show : !(view.zoomNow > 0.22);
      var sc = view.regionScenery || null;
      var needBuild = !view._hideOnZoomNodes || view._hideOnZoomScenery !== sc;
      if(!needBuild && wantShow === view._lastHideOnZoom) return;
      if(needBuild){
        var list = [];
        reef3dCollectHideOnZoom(view.scene, list);
        view._hideOnZoomNodes = list;
        view._hideOnZoomScenery = sc;
      }
      view._lastHideOnZoom = wantShow;
      var nodes = view._hideOnZoomNodes;
      for(var i = 0; i < nodes.length; i++) nodes[i].visible = wantShow;
      return;
    }
    if(viewOrObj.userData && viewOrObj.userData.hideOnZoom === true) viewOrObj.visible = show;
    var ch = viewOrObj.children;
    if(!ch) return;
    for(var j = 0; j < ch.length; j++) reef3dSyncHideOnZoom(ch[j], show);
  }
  function reef3dQbBlocks(camP, tx, ty, tz, px, py, pz, rad){
    var lx = tx - camP.x, ly = ty - camP.y, lz = tz - camP.z, ll = lx * lx + ly * ly + lz * lz || 1;
    var u = ((px - camP.x) * lx + (py - camP.y) * ly + (pz - camP.z) * lz) / ll;
    if(u <= .12 || u >= .97) return false;
    var rx = camP.x + lx * u - px, ry = camP.y + ly * u - py, rz = camP.z + lz * u - pz;
    return rx * rx + ry * ry + rz * rz < rad * rad;
  }
  function reef3dPushMoteGuard(guards, gn, mcX, mcY, mcZ, gx, gy, gz, gr){
    var item = guards[gn] || (guards[gn] = { x: 0, y: 0, z: 0, r: 0, dx: 0, dy: 0, dz: 0, d: 0 });
    var ddx = gx - mcX, ddy = gy - mcY, ddz = gz - mcZ, dd = Math.hypot(ddx, ddy, ddz) || 1;
    item.x = gx; item.y = gy; item.z = gz; item.r = gr;
    item.dx = ddx / dd; item.dy = ddy / dd; item.dz = ddz / dd; item.d = dd;
    return gn + 1;
  }
  function reef3dPushActorGuard(guards, gn, mcX, mcY, mcZ, obj){
    if(!obj || !obj.visible || !obj.position) return gn;
    var rb = obj.userData && obj.userData.regionBounds;
    var yOffM = (obj.userData && typeof obj.userData.boardYOffset === 'number') ? obj.userData.boardYOffset : 0;
    var cy = (rb ? (rb.centerY || rb.height * .5 || 1.0) : 1.0) + yOffM + .22;
    var rad = Math.max(2.95, (rb ? Math.max(rb.radius || 0, (rb.height || 0) * .60) : 1.0) + 1.75);
    return reef3dPushMoteGuard(guards, gn, mcX, mcY, mcZ, obj.position.x, obj.position.y + cy, obj.position.z, rad);
  }
  function reef3dMoteHitsGuard(guards, gn, mcX, mcY, mcZ, x, y, z){
    var vx = x - mcX, vy = y - mcY, vz = z - mcZ, v2 = vx * vx + vy * vy + vz * vz;
    for(var gi = 0; gi < gn; gi++){
      var ag = guards[gi], proj = vx * ag.dx + vy * ag.dy + vz * ag.dz;
      if(proj <= .4 || proj > ag.d + 3.5) continue;
      var rAt = ag.r * (proj / ag.d);
      if(v2 - proj * proj < rAt * rAt) return gi;
    }
    return -1;
  }
  function reef3dFrame(view, now){
    var THREE = window.THREE, calm = reefCalm(), t = (now - view.t0) / 1000;
    var dt = Math.min(.05, Math.max(0, (now - view.lastT) / 1000)); view.lastT = now;
    reef3dSize(view);
    var tp = view._tp || (view._tp = new THREE.Vector3()), tl = view._tl || (view._tl = new THREE.Vector3());
    reef3dCamTarget(view, tp, tl);
    if(view.encounter && view.encounter.interior && !view.encounter.interior._camSynced){
      view.encounter.interior._camSynced = true;
      view.camPos.copy(tp); view.camLook.copy(tl);
    }
    var up = view.themeFx || view.themeIn ? reef3dThemeFrame(view, now, t) : 0;
    if(!up && view.wrap.classList.contains('r3-sky')) view.wrap.classList.remove('r3-sky');
    if(up){ tl.y += 15 * up; tl.z -= 12 * up; tp.y -= 4 * up; tp.z += 2 * up; }
    // A change of view (onto the stairs, into the hold, out onto the sand) glides over about two seconds
    // instead of snapping; the rest of the time the camera keeps up with her briskly.
    if(view.camMode !== view.camModeWas){ if(view.camModeWas) view.camGlide = now + 2200; view.camModeWas = view.camMode; }
    var k = calm || up ? 1 : 1 - Math.pow(view.camGlide > now ? .955 : .84, dt * 30);
    view.camPos.lerp(tp, k); view.camLook.lerp(tl, k);
    view.cam.position.copy(view.camPos); view.cam.lookAt(view.camLook);
    if(reef3dZoomFrame(view, now)){   // pinching out to the map
      // The camera's distance changes by the same proportion for each bit of the pinch (like a map app), while it
      // turns from looking along the path to looking straight down on the middle of the board.
      var zc = view.zoomCenter, z = view.zoomNow, zt = Math.min(1, z), turn = zt * zt * (3 - 2 * zt);
      var zl = view.camLook.clone().lerp(zc, turn);
      var dir0 = view.camPos.clone().sub(view.camLook), d0 = Math.max(1, dir0.length()), dir1 = new THREE.Vector3(0, 1, .32).normalize();
      var zDist = d0 * Math.pow(view.zoomH * 1.05 / d0, zt) * (z > 1 ? 1 + (z - 1) * .8 : 1);
      var zp = zl.clone().add(dir0.normalize().lerp(dir1, turn).normalize().multiplyScalar(zDist));
      view.cam.position.copy(zp); view.cam.lookAt(zl);
      // the fog (and the far edge of what's drawn) moves back with the camera, so the whole board stays clear
      var fog = view.scene.fog; if(!view.fog0) view.fog0 = { near: fog.near, far: fog.far, cam: view.cam.far };
      var extra = zp.distanceTo(view.camPos);
      fog.near = view.fog0.near + extra; fog.far = view.fog0.far + extra * 1.3; view.cam.far = Math.max(view.fog0.cam, fog.far + 80); view.cam.updateProjectionMatrix(); }
    else reef3dCamLife(view, now, t, calm);
    if(!view.zoomNow && view.fog0){ view.scene.fog.near = view.fog0.near; view.scene.fog.far = view.fog0.far; view.cam.far = view.fog0.cam; view.cam.updateProjectionMatrix(); view.fog0 = null; }
    if(view.skyDome){
      view.skyDome.visible = !(view.encounter && view.encounter.interior);
      view.skyDome.position.copy(view.cam.position);
      if(view.skyDome.userData && view.skyDome.userData.isCavesVault){
        view.skyDome.scale.setScalar(1 + Math.max(0, view.zoomNow || 0) * 1.25);
      }
    }
    if(view.scene){
      var wantShow = !(view.zoomNow > 0.22);
      if(wantShow !== view._lastHideOnZoom || !view._hideOnZoomNodes || view._hideOnZoomScenery !== (view.regionScenery || null)){
        reef3dSyncHideOnZoom(view, wantShow);
      }
    }
    var g = view.guide.position;
    view.sun.position.set(g.x + 6, g.y + 18, g.z + 8); view.sun.target.position.set(g.x, g.y - .3, g.z - 2);
    if(view.motes){
      view.motes.visible = !calm && !view.encounter;
      if(view.motes.visible && (((view.frameN || 0) % 3) === 0 || view.moving)){
        var mp = view.motes.geometry.attributes.position, md = view.motes.userData.seeds;
        var mCam = view.camPin ? view.camPin[0] : view.cam.position;
        var mcX = mCam.x, mcY = mCam.y, mcZ = mCam.z;
        var guards = view._moteGuards || (view._moteGuards = []), gn = 0;
        gn = reef3dPushMoteGuard(guards, gn, mcX, mcY, mcZ, g.x, g.y + .65, g.z, 2.85);
        if(view.crab && view.crab.visible) gn = reef3dPushMoteGuard(guards, gn, mcX, mcY, mcZ, view.crab.position.x, view.crab.position.y + .52, view.crab.position.z, 2.15);
        var rp = view.regionPeople;
        if(rp && !rp.disposed){
          gn = reef3dPushActorGuard(guards, gn, mcX, mcY, mcZ, rp.marker);
          gn = reef3dPushActorGuard(guards, gn, mcX, mcY, mcZ, rp.actor);
          if(rp.towns) for(var ti = 0; ti < rp.towns.length; ti++) gn = reef3dPushActorGuard(guards, gn, mcX, mcY, mcZ, rp.towns[ti] && rp.towns[ti].object);
        }
        for(var mi = 0; mi < md.length; mi++){
          var ms = md[mi];
          var mx = g.x + ms.ox + Math.sin(t * .6 + ms.p) * .65;
          var my = (g.y - .3) + ms.y + Math.sin(t * .9 + ms.p * 1.3) * .35;
          var mz = g.z + ms.oz + Math.cos(t * .5 + ms.p) * .65;
          var hit = reef3dMoteHitsGuard(guards, gn, mcX, mcY, mcZ, mx, my, mz);
          if(hit >= 0){
            var ag = guards[hit], vx = mx - mcX, vy = my - mcY, vz = mz - mcZ;
            var proj = vx * ag.dx + vy * ag.dy + vz * ag.dz;
            var px = vx - proj * ag.dx, py = vy - proj * ag.dy, pz = vz - proj * ag.dz;
            var pl = Math.hypot(px, py, pz), need = ag.r * (proj / ag.d) + .6;
            if(pl > 1e-4){ mx += px / pl * (need - pl); my += py / pl * (need - pl); mz += pz / pl * (need - pl); }
            else { mx += need; }
            if(reef3dMoteHitsGuard(guards, gn, mcX, mcY, mcZ, mx, my, mz) >= 0) my = -99;
          }
          mp.setXYZ(mi, mx, my, mz);
        }
        mp.needsUpdate = true;
        if(view.motes.material && view.motes.userData.baseOpacity){
          view.motes.material.opacity = view.motes.userData.baseOpacity * (.80 + .20 * Math.sin(t * 1.45));
        }
      }
    }
    if(!calm){
      var body = view.guide.userData.body, q = reef3dPose(), em = view.emote;
      if(em){ var ep = (now - em.t0) / em.dur; if(ep >= 1 || view.moving){ view.emote = null; view.emoteEnd = now; if(em.after) em.after(); } else REEF3D_EMOTES[em.name].pose(ep, q, t); }
      if(view.skyUp){ q.headX -= .6 * view.skyUp; q.rx -= .32 * view.skyUp; q.eyes = Math.max(q.eyes, 1.15); }   // looking up at the sky with you
      if(!view.moving && !view.guide.userData.shelly){
        var sxz = 1 / Math.sqrt(q.sy);
        body.position.y = Math.sin(t * 2.2) * .08 + q.y; body.rotation.z = Math.sin(t * 1.3) * .04 + q.rz;
        var ry = q.ry;
        if(q.face){ var gp = view.guide.position, toCam = Math.atan2(view.cam.position.x - gp.x, view.cam.position.z - gp.z) - view.guide.rotation.y;
          toCam = Math.atan2(Math.sin(toCam), Math.cos(toCam)); ry += toCam * q.face; }   // the shortest way round
        if(!view.guide.userData.parts.neck) ry += q.headY * .6;   // Lumi has no neck: she turns her whole body to look
        body.rotation.x = q.rx; body.rotation.y = ry; body.scale.set(sxz, q.sy, sxz);
        // idle life: every so often she looks around, or does a little twirl
        if(!view.emote){ if(!view.idleAt) view.idleAt = now + 6000 + Math.random() * 5000; else if(now > view.idleAt){ view.idleAt = 0; reef3dEmote(view, Math.random() < .25 ? 'twirl' : 'look'); } }
        else view.idleAt = 0;
      }
      for(var swi = 0; swi < view.swayers.length; swi++){
        var sw = view.swayers[swi];
        sw.rotation.z = Math.sin(t * .9 + swi) * .06; sw.rotation.x = Math.cos(t * .7 + swi) * .05;
      }
      var glList = view.glowSpaces || view.spaces;
      for(var gli = 0; gli < glList.length; gli++){
        var gs = glList[gli], gu = gs.obj && gs.obj.userData;
        if(!gu || !gu.glow) continue;
        var gw = Math.sin(t * 2 + gs.i);
        gu.glow.material.color.setHSL(.12, 1, .68 + gw * .06);
        if(gu.halo) gu.halo.scale.setScalar(2.5 + gw * .25 + Math.sin(t * 9 + gs.i * 3) * .08);
      }
      if(((view.frameN || 0) & 1) === 0){
        var bdList = view.bubbleData, bdDummy = view.dummy, bdNight = view.night;
        for(var bi = 0; bi < bdList.length; bi++){
          var b = bdList[bi], y = (b.y + t * b.v) % 9;
          var bz = g.z + 6 - (((g.z + 6 - b.z) % 40) + 40) % 40;
          bdDummy.position.set(b.x + Math.sin(t + bi) * .3, bdNight ? 9 - y : y, bz);
          bdDummy.scale.setScalar(b.s); bdDummy.updateMatrix(); view.bubbles.setMatrixAt(bi, bdDummy.matrix);
        }
        view.bubbles.instanceMatrix.needsUpdate = true;
      }
      if(view.plume) reef3dPlume(view.plume, view.dummy, t);
      if(view.lamp){ var lf = .5 + Math.sin(t * 1.6) * .5, fk = Math.sin(t * 7.3) * .5 + Math.sin(t * 11.1) * .5;   // a slow breath plus a candle flicker
        view.lamp.pool.material.opacity = .85 + lf * .12 + fk * .03; if(view.lamp.glow) view.lamp.glow.material.color.setHSL(.12, 1, .68 + lf * .08);
        if(view.lamp.halo){ view.lamp.halo.scale.setScalar(3.4 + lf * .5 + fk * .12); view.lamp.halo.material.opacity = .62 + fk * .08; } }
      view.ring.scale.setScalar(1 + Math.sin(t * 2.4) * .06);
      var parts = view.guide.userData.parts, mv = view.moving;
      var fl = mv ? 1 : q.flap;
      if(!view.guide.userData.shelly){
      (parts.flippers || []).forEach(function(f, i){
        var sp = 2.2 + 10.8 * fl, amp = .18 + .37 * fl;
        if(view.night) f.rotation.z = f.userData.side * Math.sin(t * sp * 1.4 + i) * amp;
        else { f.rotation.y = f.userData.side * Math.sin(t * sp + (f.userData.front ? 0 : 1.6)) * amp; f.rotation.z = f.userData.side * Math.sin(t * sp + .8) * amp * .4; }
        // a wave: the front right flipper (or fin) lifts high and waves
        if(q.wave && i === 0){ var wv = f.userData.side * (1.05 + Math.sin(t * 13) * .38); f.rotation.z = f.rotation.z * (1 - q.wave) + wv * q.wave; f.rotation.y *= 1 - q.wave; }
      });
      if(parts.tail) parts.tail.rotation.y = Math.sin(t * (mv ? 14 : 4)) * .45;
      if(parts.neck){ parts.neck.rotation.y = Math.sin(t * .7) * .18 * (1 - Math.min(1, Math.abs(q.headY) * 2)) + q.headY; parts.neck.rotation.x = q.headX; }
      var blink = (t % 3.7) < .13 ? .12 : 1;
      // eyes: blink, happy squint (^ ^) or wide with surprise
      (parts.eyes || []).forEach(function(e){ var w = q.eyes > 1 ? q.eyes : 1; e.scale.set(w, blink * q.eyes, w); });
      }
      if(parts.glow) parts.glow.intensity = 1.2 + Math.sin(t * 3) * .25;
      if(view.caus) view.caus.offset.set(t * .012, t * .02);
      view.rays.position.set(g.x * .5, 0, g.z);
      var rayK = Math.max(0, 1 - (view.zoomNow || 0) * 3);   // seen from straight above they'd read as stripes, so they fade as she pulls out
      for(var rmi = 0; rmi < view.rayList.length; rmi++){ var rm = view.rayList[rmi]; rm.material.opacity = rm.userData.base * rayK * (.65 + .35 * Math.sin(t * .5 + rm.userData.ph)); }
      // Each school circles its own home on the reef; it doesn't follow Shelly. A school she has left far
      // behind swims (not jumps) to a new home ahead of her. Fish face the way they are really moving.
      view.fishLvl = (view.fishLvl || 0) + ((g.y - .3) - (view.fishLvl || 0)) * Math.min(1, dt * 1.5);
      view.schools.forEach(function(sc, k){
        if(sc.hz == null){ sc.hx = sc.off; sc.hz = g.z - 4 - k * 7; sc.tx = sc.hx; sc.tz = sc.hz; }
        if(Math.abs(sc.tz - g.z) > 18){ sc.tz = g.z - 6 - Math.random() * 8; sc.tx = (Math.random() - .5) * 10; }
        // after a tap the fish dart apart (fl.k rises fast), then drift back together while the school swims to its new home
        var fl = sc.flee, fa = fl ? performance.now() / 1000 - fl.t0 : 9;
        if(fl && fa > fl.dur) sc.flee = fl = null;
        var mx = sc.tx - sc.hx, mz = sc.tz - sc.hz, md = Math.sqrt(mx * mx + mz * mz), step = Math.min(md, dt * (fl ? 4 : 1.8));
        if(md > .01){ sc.hx += mx / md * step; sc.hz += mz / md * step; }
        var sdk = view.shipDeck, rad = sc.rad;
        if(sdk){   // night: the schools stay inside the wreck (never through the hull, never down in the sand)
          rad = Math.min(sc.rad, sdk.half - 3); var room = sdk.half - 1.8 - rad;
          sc.hx = Math.max(-room, Math.min(room, sc.hx)); sc.tx = Math.max(-room, Math.min(room, sc.tx));
        }
        var a = t * sc.spd + sc.ph, cx = sc.hx + Math.cos(a) * rad, cz = sc.hz + Math.sin(a) * rad * .7;
        if(sdk){   // swim over whichever deck is below the school: the top deck, or down in the open hold
          var floor = (sdk.stair && cz < sdk.holeZ - 1 ? sdk.stair.low + sdk.y : sdk.y) + cx * sdk.roll + cz * (sdk.pitch || 0);
          sc.lvl = sc.lvl == null ? floor : sc.lvl + (floor - sc.lvl) * Math.min(1, dt * 1.2);
        }
        var lvl = sdk ? sc.lvl : view.fishLvl;
        sc.fish.forEach(function(f, j){
          var o = f.userData.o, px = f.position.x, pz = f.position.z;
          var fo = fl ? reef3dFleeOff(fl, j, fa) : null;
          var fx = cx + o.x + Math.sin(t * .9 + j) * .12 + (fo ? fo.x : 0);
          var fy = sc.h + lvl + o.y + Math.sin(t * 2 + j) * .12 + (fo ? Math.min(.5, fo.y) : 0);
          var fz = cz + o.z + (fo ? fo.z : 0);
          // Keep Coral Cove swimming fish cleanly separated from Shelly's shell.
          var dShF = Math.hypot(fx - g.x, fz - g.z);
          if(dShF < 2.65 && fy < g.y + 2.05) fy = Math.max(fy, g.y + 2.05 + (2.65 - dShF) * .35);
          f.position.set(fx, fy, fz);
          // Face the way the fish is really going: its velocity is smoothed over a few frames, and it turns
          // no faster than about a half-turn a second, so small wobbles never make it spin on the spot.
          var sv = f.userData.v || (f.userData.v = { x: 0, z: 0 }), ease = Math.min(1, dt * 4);
          if(dt > 0){ sv.x += ((f.position.x - px) / dt - sv.x) * ease; sv.z += ((f.position.z - pz) / dt - sv.z) * ease; }
          if(sv.x * sv.x + sv.z * sv.z > .01){
            var want = Math.atan2(sv.x, sv.z), d = Math.atan2(Math.sin(want - f.rotation.y), Math.cos(want - f.rotation.y)), turn = dt * 3.2;
            f.rotation.y += Math.max(-turn, Math.min(turn, d * Math.min(1, dt * 5)));
          }
          if(!f.children[0].userData.gltf && f.children[1]) f.children[1].rotation.y = Math.sin(t * 12 + j) * .5;
        });
      });
      for(var fmi = 0; fmi < view.fishMixers.length; fmi++) view.fishMixers[fmi].update(dt);
      if(view.bigOne){
        var ba = t * .05 + 1.24;
        view.bigOne.position.set(Math.cos(ba) * 10 - 5.2, (view.night ? .10 + Math.sin(t * .3) * .22 : -.78 + Math.sin(t * .3) * .11), g.z - (view.night ? 25 : 17) + Math.sin(ba) * 3);
        view.bigOne.rotation.y = Math.atan2(-Math.sin(ba) * 10, Math.cos(ba) * 3);
        var wh = view.bigOne.userData && view.bigOne.userData.whale;
        if(wh && wh.userData && wh.userData.tailPivot){
          // Vertical up-and-down cetacean fluke stroke (gentle humpback/blue whale glide)
          wh.userData.tailPivot.rotation.x = -.30 + Math.sin(t * 1.15) * .14;
          wh.userData.tailPivot.rotation.y = 0;
          if(wh.userData.finL) wh.userData.finL.rotation.z = Math.sin(t * .85) * .06;
          if(wh.userData.finR) wh.userData.finR.rotation.z = -Math.sin(t * .85) * .06;
          wh.rotation.x = Math.cos(t * .3) * .03;
          wh.rotation.z = .05 + Math.sin(t * .45) * .02;
        }
      }
      if(view.crab) reefCrabAnimate(view.crab);
      reefCrabLeaveTick(view, dt);
      if(view.chestMixer) view.chestMixer.update(dt);
      for(var spi = 0; spi < view.spinners.length; spi++){
        var sp = view.spinners[spi];
        sp.rotation.y = t * 1.4 + spi; sp.position.y = (sp.userData.y0 != null ? sp.userData.y0 : .8) + Math.sin(t * 2 + spi) * .12;
      }
      if(view.nextStar && view.nextStar.visible){ var starYaw = Math.atan2(view.cam.position.x - view.nextStar.position.x, view.cam.position.z - view.nextStar.position.z); view.nextStar.rotation.y = starYaw + Math.sin(t * 1.4) * 0.28; view.nextStar.position.y = view.nextStar.userData.y + Math.sin(t * 2.4) * .15; }
      var qIdleList = view.qSpaces || view.spaces;
      for(var qi0 = 0; qi0 < qIdleList.length; qi0++){
        var qs0 = qIdleList[qi0];
        if(!qs0.qb) continue;
        reef3dQIdle(qs0, t);
        if(!view.night && qs0.qb.userData && !qs0.qb.userData.used && qs0.qb.userData.mat){
          qs0.qb.userData.mat.emissiveIntensity = Math.max(qs0.qb.userData.mat.emissiveIntensity, .30 + .08 * (.5 + .5 * Math.sin(t * 2.4 + qs0.i)));
        }
      }
      reef3dDiceTick(view, now, t);
      reef3dPartyTick(view, now, t);
      if(view.party && view.party.pearl && view.party.pearl.userData.styledPearl && view.party.pearl.userData.halo){
        view.party.pearl.userData.halo.material.opacity = (view.night ? .26 : .14) + .04 * Math.sin(t * 3);
      }
      reef3dWreckTick(view, t);
      reef3dReefTick(view, t);
      var objList = view.objSpaces || view.spaces;
      for(var oi = 0; oi < objList.length; oi++){
        var os = objList[oi];
        if(!os.obj) continue;
        if(os.obj.userData.lid) os.obj.userData.lid.rotation.x = -.25 - .35 * (Math.sin(t * .7 + os.i) * .5 + .5);
        if(os.obj.userData.spin) os.obj.userData.spin.rotation.z = t * .25;
      }
    }
    reef3dShellyFrame(view, now, dt, calm, q);
    if(calm) reef3dDiceTick(view, now, t);
    // short-lived effects (sand puffs, star bursts) run even in Calm motion as a single still frame
    reef3dLifeFrame(view, now, t, dt, calm);
    reef3dStyleStarBeamTick(view, t, calm);
    for(var fxi = view.fx.length - 1; fxi >= 0; fxi--){ var fxItem = view.fx[fxi], fxp = Math.min(1, (now - fxItem.t0) / fxItem.dur); fxItem.step(fxp); if(fxp >= 1){ fxItem.end(); view.fx.splice(fxi, 1); } }
    if(!calm && view.amb && now - (view.ambBlip || 0) > 3500 + Math.random() * 4000){ view.ambBlip = now; try { if(Sound.isEnabled()) Sound.bloop(700 + Math.random() * 500, 0, .012); } catch(e){} }
    var crabSpot = null;
    if(view.crab){ // the crab trots one tile behind Shelly
      crabSpot = reef3dCrabSpot(view);
      var tx = crabSpot.x, tz = crabSpot.z;
      if(!view.moving) reef3dSyncCrabSand(view, crabSpot);
      var cp = view.crab.position, dx = tx - cp.x, dz = tz - cp.z, dist = Math.sqrt(dx * dx + dz * dz);
      var entering = view.crab.userData.entering && !calm;   // a crab swapped in scuttles over from the side
      var crabY = crabSpot.y != null ? crabSpot.y : (view.guide.position.y - .3 - (view.craftedPavilion ? .07 : 0));
      // Smooth continuous scuttling on every tile step — keep only a far-out recovery clamp (dist > 14) or Calm motion snap.
      if(!entering && (calm || dist > 14)){ cp.set(tx, crabY, tz); dist = 0; }
      else if(dist > .05){
        var crabSpeed = entering ? 4.5 : Math.min(10.5, 6.2 + dist * .75);
        var st = Math.min(dist, dt * crabSpeed);
        cp.x += dx / dist * st; cp.z += dz / dist * st;
      }
      // Hard minimum separation guard from Shelly so Kiko never clips into her neck/flippers.
      var sx = cp.x - g.x, sz = cp.z - g.z, sDist = Math.hypot(sx, sz);
      if(sDist < 1.65){
        if(sDist > 0.1){
          cp.x = g.x + (sx / sDist) * 1.65;
          cp.z = g.z + (sz / sDist) * 1.65;
        } else {
          var txDirX = tx - g.x, txDirZ = tz - g.z, txDirLen = Math.hypot(txDirX, txDirZ);
          if(txDirLen > 0.1){
            cp.x = g.x + (txDirX / txDirLen) * 1.65;
            cp.z = g.z + (txDirZ / txDirLen) * 1.65;
          } else {
            var sy = view.guide.rotation.y || 0;
            cp.x = g.x - Math.sin(sy) * 1.65;
            cp.z = g.z - Math.cos(sy) * 1.65;
          }
        }
      }
      cp.y += (crabY - cp.y) * (calm ? 1 : Math.min(1, dt * 10));   // the crab keeps to her level (stairs, the hold, sand curb)
      if(entering && dist < .3){ view.crab.userData.entering = false; view.crabBusy = false; reef3dCrabAct(view, 'Dance', true); }
      var walking = dist > .25 && !calm;
      if(walking){
        var walkYaw = Math.atan2(dx, dz) - Math.PI / 2;   // crabs walk sideways
        var dWalk = Math.atan2(Math.sin(walkYaw - view.crab.rotation.y), Math.cos(walkYaw - view.crab.rotation.y));
        view.crab.rotation.y += dWalk * Math.min(1, dt * 12);
      } else if(!view.crabBusy){
        var shellyYaw = Math.atan2(g.x - cp.x, g.z - cp.z);
        var camYaw = Math.atan2(view.cam.position.x - cp.x, view.cam.position.z - cp.z);
        var diffSC = Math.atan2(Math.sin(camYaw - shellyYaw), Math.cos(camYaw - shellyYaw));
        var idleYaw = shellyYaw + diffSC * 0.86;
        var dIdle = Math.atan2(Math.sin(idleYaw - view.crab.rotation.y), Math.cos(idleYaw - view.crab.rotation.y));
        view.crab.rotation.y += dIdle * Math.min(1, dt * 6);
      }
      if(!view.crabBusy) reef3dCrabAct(view, walking ? 'Walk' : 'Idle');
    }
    if(view.blobG){
      var bg = view.guide.position, lhB = view.spaces && view.spaces.lighthouse;
      var bgY = lhB ? (bg.y - .3 + (typeof lhB.treadTopOffset === 'number' ? lhB.treadTopOffset : -.28) + .04) : (view.groundY(bg.x, bg.z) + .07);
      view.blobG.position.set(bg.x, bgY, bg.z);
      if(view.glowG){ view.glowG.position.set(bg.x, bgY + .02, bg.z + .6); view.glowG.material.opacity = .45 + Math.sin(t * 3) * .1; }
    }
    if(view.blobC && view.crab){
      var bc = view.crab.position;
      view.blobC.position.set(bc.x, bc.y + .015, bc.z);
    }
    // Keep "?" blocks grounded and Mario-Party-crisp over their tiles (only a subtle +0.25u hover when Shelly stands on
    // the space so the bonk animation meets it cleanly), while tucking away foreground blocks that cut across the hero sightline.
    var camP = view.camPin ? view.camPin[0] : view.cam.position;
    var hasStallQB = !!(view.regionPeople && !view.regionPeople.disposed && view.regionPeople.stall && view.regionPeople.stall.visible !== false);
    var coveCam = null;
    if(hasStallQB){
      // Evaluate against the settled follow camera so flyIn or gentle idle drift never causes "?" blocks to jitter.
      coveCam = view._coveCam || (view._coveCam = new THREE.PerspectiveCamera(view.cam.fov, view.cam.aspect, view.cam.near, view.cam.far));
      if(coveCam.fov !== view.cam.fov || coveCam.aspect !== view.cam.aspect){
        coveCam.fov = view.cam.fov; coveCam.aspect = view.cam.aspect; coveCam.updateProjectionMatrix();
      }
      coveCam.position.copy(view.camPin ? view.camPin[0] : tp);
      coveCam.lookAt(view.camPin ? view.camPin[1] : tl);
      coveCam.updateMatrixWorld();
    }
    var stShiftOut = hasStallQB ? (view._qbStFrameOut || (view._qbStFrameOut = {})) : null;
    (view.qSpaces || view.spaces).forEach(function(s){
      if(!s.qb) return;
      if(view.encounter && view.encounter.interior){ s.qb.visible = false; return; }
      if(s.qb.userData.bumping) return;
      var qBaseY = ((s.qb.userData && s.qb.userData.used) ? (REEF3D_QY - .12) : REEF3D_QY) + (s.y || 0);
      if(calm) s.qb.position.y = qBaseY;
      var onHere = view.at === s.i, crabHere = !onHere && crabSpot && crabSpot.onTile && crabSpot.tileIndex === s.i;
      var want = onHere ? 1.06 : (crabHere ? 0.42 : 0);
      s.qLift = s.qLift == null || calm ? want : s.qLift + (want - s.qLift) * Math.min(1, (dt || .016) * 6);
      if(Math.abs(want - s.qLift) < .002) s.qLift = want;
      // Anchor every Coral Cove & region "?" / star cube strictly centered over its tile center (maxXZShift = 0.00).
      s.qb.position.x = s.x;
      s.qb.position.z = s.z;
      s.qb.position.y += s.qLift;
      var occludes = false;
      // Keep every "?" block cleanly clear of Bok's stall awning/roof with vertical-only lift (dx = dz = 0).
      if(hasStallQB && !onHere){
        if(view.moving || ((view.frameN || 0) % 4 === 0) || s.qStDy == null) reef3dQBlockStallShift(view, s, coveCam, s.x, qBaseY + s.qLift, s.z, 1, stShiftOut);
        var stEase = s.qStDy == null || calm ? 1 : Math.min(1, (dt || .016) * 10);
        s.qStDx = 0;
        s.qStDy = s.qStDy == null ? stShiftOut.dy : s.qStDy + (stShiftOut.dy - s.qStDy) * stEase;
        s.qStDz = 0;
        s.qb.position.y += s.qStDy;
      } else if(s.qStDx || s.qStDy || s.qStDz){
        s.qStDx = s.qStDy = s.qStDz = 0;
      }
      if(!onHere && !(view.zoomNow > .9)){
        var qbx = s.qb.position.x, qby = s.qb.position.y, qbz = s.qb.position.z;
        occludes = reef3dQbBlocks(camP, g.x, g.y + .55, g.z, qbx, qby, qbz, 1.85) ||
          (view.crab && reef3dQbBlocks(camP, view.crab.position.x, view.crab.position.y + .40, view.crab.position.z, qbx, qby, qbz, 1.50));
      }
      var wantVis = occludes ? 0 : 1;
      s.qVis = s.qVis == null || calm ? wantVis : s.qVis + (wantVis - s.qVis) * Math.min(1, (dt || .016) * 10);
      if(Math.abs(wantVis - s.qVis) < .01) s.qVis = wantVis;
      s.qb.visible = !(view.encounter && view.encounter.interior) && !(view.dice && view.dice.here === s) && s.qVis > .02;
      s.qb.scale.setScalar(Math.max(.001, s.qVis));
    });
    // Keep it light on the iPad: full speed while something is moving, half speed when it's calm,
    // and shadows recalculated only while Shelly moves or now and then for the fish.
    view.frameN = (view.frameN || 0) + 1;
    var busy = view.moving || view.fx.length || view.camPos.distanceToSquared(tp) > .0004;
    if(view.renderer.shadowMap.enabled && (busy || view.frameN % (view.every === 2 ? 6 : 12) === 0)) view.renderer.shadowMap.needsUpdate = true;
    if(view.camPan && !calm){
      var cp0 = view.camPan, cpk = Math.min(1, (now - cp0.t0) / cp0.dur);
      if(cpk >= 1){ view.camPan = null; }
      else {
        var holdK = cpk < .30 ? (cpk / .30) : (cpk > .68 ? (1 - (cpk - .68) / .32) : 1);
        var easeK = holdK * holdK * (3 - 2 * holdK);
        var ps = cp0.space;
        var panPos = (view._panP || (view._panP = new THREE.Vector3())).set(ps.x, (ps.y || 0) + 7.2, ps.z + 10.5);
        var panLook = (view._panL || (view._panL = new THREE.Vector3())).set(ps.x, (ps.y || 0) + 1.2, ps.z);
        view.cam.position.lerpVectors(view.camPos, panPos, easeK);
        var lk = (view._panCurL || (view._panCurL = new THREE.Vector3())).lerpVectors(view.camLook, panLook, easeK);
        view.cam.lookAt(lk);
      }
    }
    if(view.camPin){ view.cam.position.copy(view.camPin[0]); view.cam.lookAt(view.camPin[1]); }   // test helper: a fixed camera (see __reef3dCamPin)
    reef3dSailFade(view, calm);
    regionEncounterTick(view, now);
    if(view.post && view.post.on){
      // Keep MP8 follow-camera vistas crisp & sharp (no blurry DoF on distant ? blocks, buildings, or arches).
      var fp = (view._fp || (view._fp = new THREE.Vector3())).copy(view.guide.position).project(view.cam), fy = Math.min(.8, Math.max(.2, (fp.y + 1) / 2)), zk = Math.min(1, view.zoomNow || 0);
      fy += (.5 - fy) * zk;
      view.post.U.focusY.value += (fy - view.post.U.focusY.value) * (calm ? 1 : .12);
      view.post.tilt = 0; view.post.band = .45 + zk * .15; view.post.extraTilt = 0;
      view.post.render(view.scene, view.cam);
    } else view.renderer.render(view.scene, view.cam);
    if(view.region && !regionEncounterActive(view)) regionPeopleTick(view, now);
    // reef3dLabels(view) is off: the deck names no longer hover over the board (the tiles show which deck is which,
    // and the treasure map lists them). The label buttons stay, hidden, for screen readers and keyboards.
    // nothing important moving: a device that has shown it struggles may draw the gentle idle motion at half speed
    view.idle = !busy && !view.emote && !view.dice && !view.themeFx && !view.themeIn && now - (view.touchAt || 0) > 2000 &&
      !view.schools.some(function(sc){ return sc.flee; });
    if(window.JamboreeBridge && JamboreeBridge.onFrame) JamboreeBridge.onFrame(view, now, dt);
  }
  var R3moteTex = null;
  function reef3dAmbientMotes(scene, region, night){
    var THREE = window.THREE; if(!THREE || !scene) return null;
    // Soft pastel sunlit coastal shimmer tints (never harsh pure white) clear of character faces.
    var cols = { town:'#f6dfa6', lagoon:'#f7db8a', caves:'#8ce6f4', patterns:'#f2bad2', beach:'#f5dfa6', light:'#f2d484', captain:'#b4e0f0' };
    var col = night ? '#84d6e8' : (region && cols[region.id]) || '#dcf8f2';
    var seedBase = 733 + (region ? region.id.charCodeAt(0) * 31 + region.id.length * 17 : 11) + (night ? 53 : 0);
    var rnd = typeof reefRand === 'function' ? reefRand(seedBase) : Math.random;
    var n = R3.q >= 2 ? 16 : 26, pos = new Float32Array(n * 3), seeds = [];
    for(var i = 0; i < n; i++){
      // Gently elevated, peripheral golden-angle ring strictly clear of foreground character faces.
      var ang = i * 2.399963 + (rnd() - .5) * .35;
      var rad = 8.8 + (i % 6) * 1.55 + (rnd() - .5) * 1.0;
      var s = { ox: Math.cos(ang) * rad, y: 2.9 + rnd() * 3.5, oz: Math.sin(ang) * rad, p: rnd() * 6.28 };
      seeds.push(s); pos[i * 3] = s.ox; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.oz;
    }
    if(!R3moteTex){
      var cv = document.createElement('canvas'); cv.width = cv.height = 64;
      var g = cv.getContext('2d');
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 28);
      gr.addColorStop(0, 'rgba(255,255,250,.76)'); gr.addColorStop(.32, 'rgba(255,252,240,.34)'); gr.addColorStop(.70, 'rgba(255,250,235,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      // Delicate 4-point sunlit water/air diamond shimmer cross-glint
      g.fillStyle = 'rgba(255,254,246,.68)';
      g.beginPath();
      g.moveTo(32, 8); g.quadraticCurveTo(33.8, 30.2, 56, 32);
      g.quadraticCurveTo(33.8, 33.8, 32, 56);
      g.quadraticCurveTo(30.2, 33.8, 8, 32);
      g.quadraticCurveTo(30.2, 30.2, 32, 8);
      g.closePath(); g.fill();
      R3moteTex = new THREE.CanvasTexture(cv);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var baseOp = night ? .30 : (region && region.id === 'caves' ? .32 : .27);
    var mat = new THREE.PointsMaterial({ color: col, map: R3moteTex, size: .28, transparent: true, opacity: baseOp, depthWrite: false, blending: THREE.NormalBlending });
    var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.userData.seeds = seeds; pts.userData.baseOpacity = baseOp; pts.raycast = function(){};
    scene.add(pts);
    return pts;
  }
  function reef3dFxPool(view){
    if(view._fxPool) return view._fxPool;
    var THREE = window.THREE;
    return (view._fxPool = {
      ringGeo: new THREE.RingGeometry(.22, .42, 20),
      puffGeo: new THREE.SphereGeometry(.13, 8, 6),
      shellGeo: new THREE.OctahedronGeometry(.18, 0),
      ringMat: new THREE.MeshBasicMaterial({ color: '#ffd966', transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }),
      puffMat: new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: .75, depthWrite: false }),
      shellMat: new THREE.MeshBasicMaterial({ color: '#ffd24c', transparent: true, opacity: .95 })
    });
  }
  function reef3dDiceBurst(view, pos){
    if(!view || !view.scene || !pos || reefCalm()) return;
    var THREE = window.THREE, pool = reef3dFxPool(view), grp = new THREE.Group();
    var ring = new THREE.Mesh(pool.ringGeo, pool.ringMat.clone());
    ring.rotation.x = -Math.PI / 2; grp.add(ring);
    var dots = [];
    for(var i = 0; i < 8; i++){
      var d = new THREE.Mesh(pool.puffGeo, pool.shellMat);
      d.userData.ang = i * Math.PI / 4; grp.add(d); dots.push(d);
    }
    grp.position.copy(pos); view.scene.add(grp);
    view.fx.push({ t0: performance.now(), dur: 520, step: function(p){
      var s = 1 + p * 3.4; ring.scale.setScalar(s); ring.material.opacity = .85 * (1 - p);
      for(var j = 0; j < dots.length; j++){
        var a = dots[j].userData.ang, r = p * 1.45;
        dots[j].position.set(Math.cos(a) * r, Math.sin(p * Math.PI) * .55, Math.sin(a) * r);
        dots[j].scale.setScalar(Math.max(.01, 1 - p));
      }
    }, end: function(){ view.scene.remove(grp); ring.material.dispose(); } });
  }
  function reef3dHopLandingFx(view, space){
    if(!view || !view.scene || !space || reefCalm()) return;
    var THREE = window.THREE, pool = reef3dFxPool(view), grp = new THREE.Group();
    var ring = new THREE.Mesh(pool.ringGeo, pool.puffMat.clone());
    ring.rotation.x = -Math.PI / 2; grp.add(ring);
    var puffs = [];
    for(var i = 0; i < 6; i++){
      var pf = new THREE.Mesh(pool.puffGeo, pool.puffMat);
      pf.userData.ang = i * Math.PI / 3; grp.add(pf); puffs.push(pf);
    }
    grp.position.set(space.x, (space.y || 0) + .12, space.z); view.scene.add(grp);
    view.fx.push({ t0: performance.now(), dur: 420, step: function(p){
      ring.scale.setScalar(1 + p * 2.2); ring.material.opacity = .7 * (1 - p);
      for(var j = 0; j < puffs.length; j++){
        var a = puffs[j].userData.ang, r = .3 + p * .75;
        puffs[j].position.set(Math.cos(a) * r, Math.sin(p * Math.PI) * .28, Math.sin(a) * r);
        puffs[j].scale.setScalar(Math.max(.01, (1 - p) * .9));
      }
    }, end: function(){ view.scene.remove(grp); ring.material.dispose(); } });
  }
  function reef3dShellArcFx(view, count){
    if(!view || !view.scene || !view.guide || reefCalm()) return;
    var THREE = window.THREE, pool = reef3dFxPool(view), n = Math.min(Math.max(1, count || 1), 6);
    var grp = new THREE.Group(), toks = [];
    for(var i = 0; i < n; i++){
      var tk = new THREE.Mesh(pool.shellGeo, pool.shellMat);
      tk.userData.ang = (i / n) * Math.PI * 2 + .3;
      tk.userData.delay = i * .06;
      grp.add(tk); toks.push(tk);
    }
    grp.position.copy(view.guide.position); view.scene.add(grp);
    view.fx.push({ t0: performance.now(), dur: 760, step: function(p){
      for(var j = 0; j < toks.length; j++){
        var lp = Math.max(0, Math.min(1, (p - toks[j].userData.delay) / .7));
        var a = toks[j].userData.ang, r = lp * 1.1;
        toks[j].position.set(Math.cos(a) * r, .5 + Math.sin(lp * Math.PI) * 1.85 + lp * .8, Math.sin(a) * r);
        toks[j].rotation.y = lp * Math.PI * 4;
        toks[j].scale.setScalar(lp > .8 ? (1 - (lp - .8) / .2) : 1);
      }
    }, end: function(){ view.scene.remove(grp); } });
  }
  function reef3dPanToSpace(view, space, durMs){
    if(!view || !space || reefCalm()) return;
    view.camPan = { t0: performance.now(), dur: durMs || 1800, space: space };
  }
  function reef3dLoop(view){
    if(view.raf) return;
    var firstTick = true;
    function tick(now){
      if(!document.body.contains(view.wrap)){ view.raf = null; if(view._sizeObs){ try{ view._sizeObs.disconnect(); }catch(e){} view._sizeObs = null; } if(view._onWinResize){ window.removeEventListener('resize', view._onWinResize); view._onWinResize = null; } view._sizeObsInit = false; view._wrapW = 0; view._wrapH = 0; view._sizeDirty = true; if(window.JamboreeBridge && JamboreeBridge.onDispose) JamboreeBridge.onDispose(view); if(view._tileEnvRT && view._tileEnvRT.dispose){ view._tileEnvRT.dispose(); view._tileEnvRT = null; } reef3dAmbience(view, false); if(!document.querySelector('.r3')) document.body.classList.remove('r3-full'); return; }
      if(firstTick){ firstTick = false; view.lastT = now; view.drawNext = now; }
      view.tick = (view.tick || 0) + 1;
      if(window.__reefTx){ if(view.qs) view.qs.hold = now + 800; view.drawNext = null; }
      else {
        var fps = view.every === 2 || (view.idle && R3.q >= 2) ? 30 : 60;
        if(reef3dDrawDue(view, now, fps)){ reef3dFrame(view, now); reef3dQTick(view, now); }
      }
      view.raf = requestAnimationFrame(tick);
    }
    view.raf = requestAnimationFrame(tick);
  }
  // Time-based pacing stays at 30fps on a 30Hz Low Power Mode display. Skipping
  // every other callback would halve that display to 15fps.
  function reef3dDrawDue(view, now, fps){
    if(fps >= 60){ view.drawFps = 60; view.drawNext = now; return true; }
    if(view.drawFps !== fps || view.drawNext == null){ view.drawFps = fps; view.drawNext = now; }
    if(now + 3.5 < view.drawNext) return false;
    var step = 1000 / fps;
    view.drawNext += step;
    if(view.drawNext < now + 3.5) view.drawNext = now + step;
    return true;
  }

  // Hop along the path one space at a time; Calm motion skips straight there.
