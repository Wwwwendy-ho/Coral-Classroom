  /* ---------- REEF LOBBY: the profile picker as a 3D underwater room. Shelly (Lumi at night) swims
     around; tapping the water drops food she swims over to eat. The profile buttons, title and links
     are the picker's own HTML, styled as game-board spaces floating over the scene. ---------- */
  var RL = { view: null };
  window.__reefLobbyView = function(){ return RL.view; };   // test helper
  // The profile screen's day/night button: the choice is kept on this device, and the next profile that opens
  // takes it over (saved to that profile), so the board looks the way it did when she tapped.
  var RL_THEME_K = 'cc-lobby-theme', rlThemeHandOff = null;
  function reefThemeFor(profile){
    if(!profile){ try { return localStorage.getItem(RL_THEME_K); } catch(e){ return null; } }
    if(rlThemeHandOff){
      var m = rlThemeHandOff; rlThemeHandOff = null;
      if(profile.themeMode !== m){ profile.themeMode = m; try { S.store.updateProfile(profile.id, { themeMode: m }); } catch(e){} }
    }
    return profile.themeMode;
  }
  function reefLobby(){
    var shell = app.querySelector('.lock-screen');
    if(!shell || R3.failed) return;
    function attach(models){
      if(!document.body.contains(shell)) return;
      try {
        var night = reefNight(), view = RL.view;
        if(!view || view.night !== night){
          if(view){
            view.disposed = true;
            if(view.raf){ cancelAnimationFrame(view.raf); view.raf = null; }
            if(typeof reef3dShellyDispose === 'function') reef3dShellyDispose(view);
            if(typeof reefCrabDispose === 'function'){
              reefCrabDispose(view.crab); reefCrabDispose(view.spareCrab); reefCrabDispose(view.leaving);
            }
            if(view.post && view.post.dispose) view.post.dispose();
            if(typeof reef3dSurfaceDispose === 'function' && view.bake) reef3dSurfaceDispose(view.bake);
            view.renderer.dispose(); view.renderer.forceContextLoss && view.renderer.forceContextLoss();
          }
          view = RL.view = reefLobbyBuild(models, night);
        }
        document.body.classList.add('r3-lobby');
        app.insertBefore(view.wrap, app.firstChild);
        view.w = 0; reefLobbyLoop(view);
      } catch(err){ try { console.warn('3D lobby turned off:', err); } catch(e){} document.body.classList.remove('r3-lobby'); }
    }
    if(window.THREE && R3.modelsReady){ attach(R3.modelsReady); return; }
    document.body.classList.add('r3-lobby');   // the lobby look (sea background, game-board profiles) right away
    reef3dLoad().then(function(){
      return Promise.all([
        reef3dModels(),
        !reefNight() && typeof reef3dShellyLoad === 'function' ? reef3dShellyLoad() : Promise.resolve(null)
      ]);
    }).then(function(res){
      if(res[1]) R3.shellyModel = res[1];
      attach(res[0]);
    }, function(){ document.body.classList.remove('r3-lobby'); });
  }

  /* ---------- Crafted MP8 lobby props: wooden & brass treasure chest, smooth satin coastal boulders,
     and low-profile foreground shells / starfish / pebbles for balanced desktop & portrait framing. ---------- */
  function rlPaintGeo(THREE, geo, baseHex, topHex, botHex){
    if(geo.index) geo = geo.toNonIndexed();
    if(!geo.attributes.normal) geo.computeVertexNormals();
    geo.computeBoundingBox();
    var pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
    var minY = geo.boundingBox.min.y, spanY = Math.max(.001, geo.boundingBox.max.y - minY);
    var baseC = new THREE.Color(baseHex), topC = new THREE.Color(topHex || baseHex), botC = new THREE.Color(botHex || baseHex), c = new THREE.Color();
    var out = new Float32Array(n * 3);
    for(var i = 0; i < n; i++){
      var h = Math.min(1, Math.max(0, (pos.getY(i) - minY) / spanY));
      var ny = nor ? nor.getY(i) : 0;
      c.copy(baseC);
      if(ny > 0) c.lerp(topC, Math.min(1, ny * .55 + h * .28));
      else c.lerp(botC, Math.min(1, (-ny) * .45 + (1 - h) * .25));
      out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
    return geo;
  }

  function rlPanelGrid(THREE, nu, nv, fn, doubleSide){
    var verts = [], cols = [], idx = [], stride = nv + 1;
    for(var i = 0; i <= nu; i++){
      var u = i / nu;
      for(var j = 0; j <= nv; j++){
        var v = j / nv, q = fn(u, v);
        verts.push(q[0], q[1], q[2]);
        cols.push(q[3].r, q[3].g, q[3].b);
      }
    }
    for(var i2 = 0; i2 < nu; i2++){
      for(var j2 = 0; j2 < nv; j2++){
        var a = i2 * stride + j2, b = (i2 + 1) * stride + j2, c = b + 1, d = a + 1;
        idx.push(a, b, c, a, c, d);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    var mat = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
    return new THREE.Mesh(geo, mat);
  }

  function rlGroundTilt(obj, groundY, x, z){
    var gx = (groundY(x + .25, z) - groundY(x - .25, z)) / .5;
    var gz = (groundY(x, z + .25) - groundY(x, z - .25)) / .5;
    obj.rotation.order = 'YXZ';
    obj.rotation.x = Math.atan(gz) * .85;
    obj.rotation.z = -Math.atan(gx) * .85;
  }

  // Crafted MP8 wooden-plank & brass-bound treasure chest: arched planked warm oak lid, dark lid-seam groove,
  // plank seams, hammered-brass straps & corner brackets, rear hinges, side rings, and gold keyhole latch plate.
  function buildLobbyChest(THREE, night){
    var g = new THREE.Group();
    var vMat = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
    var oakPal = night ? ['#6d4d38', '#5e412e', '#76553e', '#634632'] : ['#b6763d', '#9f632f', '#c28146', '#a86b35'];
    var oakHi  = night ? '#8a684e' : '#d89b5d';
    var oakLo  = night ? '#3c2719' : '#73421c';
    var seamC  = night ? '#1b0f08' : '#31190b';
    var brBase = night ? '#9c8244' : '#d9a238';
    var brHi   = night ? '#cbb066' : '#f7d674';
    var brLo   = night ? '#5f4b20' : '#8f5e16';
    var goldC  = night ? '#c8a34a' : '#f2c144';
    var goldHi = night ? '#edd07c' : '#ffea94';
    var goldLo = night ? '#795c1e' : '#a16d16';
    var rivetC = night ? '#dfc474' : '#fce288';
    var keyC   = night ? '#120b06' : '#1b0f07';

    var W = 1.72, D = 1.06, Hb = .64, lidY = .725, Rz = .535, Ry = .46;
    function addPart(geo, base, hi, lo, x, y, z, surface, seed){
      var m = new THREE.Mesh(rlPaintGeo(THREE, geo, base, hi || base, lo || base), vMat);
      m.position.set(x || 0, y || 0, z || 0);
      if(surface && typeof reef3dSurface === 'function') reef3dSurface(m, surface, { scale: 1.25, seed: seed || 1 });
      g.add(m); return m;
    }
    function addArchStrap(xCenter, width, rOff, thick, base, hi, lo){
      var segs = 18, verts = [], idx = [];
      function ring(ang){
        var r0z = Rz + rOff, r0y = Ry + rOff, r1z = r0z + thick, r1y = r0y + thick;
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var x0 = xCenter - width * .5, x1 = xCenter + width * .5;
        return [
          [x0, lidY + sa * r0y, ca * r0z], [x1, lidY + sa * r0y, ca * r0z],
          [x1, lidY + sa * r1y, ca * r1z], [x0, lidY + sa * r1y, ca * r1z]
        ];
      }
      var rings = [];
      for(var s = 0; s <= segs; s++) rings.push(ring(-.03 + (s / segs) * (Math.PI + .06)));
      function quad(p0, p1, p2, p3){
        var st = verts.length / 3;
        verts.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
        idx.push(st, st + 1, st + 2, st, st + 2, st + 3);
      }
      for(var s2 = 0; s2 < segs; s2++){
        var A = rings[s2], B = rings[s2 + 1];
        quad(A[3], A[2], B[2], B[3]);   // outer arch top
        quad(A[0], B[0], B[1], A[1]);   // inner arch underside
        quad(A[0], A[3], B[3], B[0]);   // left cheek (-x)
        quad(A[1], B[1], B[2], A[2]);   // right cheek (+x)
      }
      quad(rings[0][0], rings[0][1], rings[0][2], rings[0][3]);                   // front cap
      quad(rings[segs][1], rings[segs][0], rings[segs][3], rings[segs][2]);       // rear cap
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      addPart(geo, base, hi, lo, 0, 0, 0);
    }

    // 1. Grounded oak sled base rails & dark recessed seam core.
    [-.64, .64].forEach(function(rx, ri){ addPart(new THREE.BoxGeometry(.16, .065, .98), oakPal[1], oakHi, oakLo, rx, .032, 0, 'timber', 11 + ri); });
    addPart(new THREE.BoxGeometry(W - .10, .59, D - .10), seamC, seamC, seamC, 0, .345, 0);

    // 2. Tapered horizontal oak planks on front, back, left & right box walls with crisp dark plank seams.
    for(var pi = 0; pi < 4; pi++){
      var py = .122 + pi * .142, tf = .935 + ((pi + .5) / 4) * .065;
      var pw = W * tf, pd = D * tf, col = oakPal[pi % oakPal.length];
      addPart(new THREE.BoxGeometry(pw, .118, .06), col, oakHi, oakLo, 0, py, pd * .5 - .022, 'timber', 21 + pi);
      addPart(new THREE.BoxGeometry(pw, .118, .06), col, oakHi, oakLo, 0, py, -(pd * .5 - .022), 'timber', 31 + pi);
      addPart(new THREE.BoxGeometry(.06, .118, pd - .03), oakPal[(pi + 1) % oakPal.length], oakHi, oakLo, pw * .5 - .022, py, 0, 'timber', 41 + pi);
      addPart(new THREE.BoxGeometry(.06, .118, pd - .03), oakPal[(pi + 1) % oakPal.length], oakHi, oakLo, -(pw * .5 - .022), py, 0, 'timber', 51 + pi);
    }

    // 3. Dark recessed lid-seam groove circling all four sides + overhanging warm oak lid collar.
    addPart(new THREE.BoxGeometry(W - .025, .072, D - .025), seamC, seamC, seamC, 0, .664, 0);
    addPart(new THREE.BoxGeometry(W + .035, .048, D + .035), oakPal[0], oakHi, oakLo, 0, .712, 0, 'timber', 61);

    // 4. Arched barrel lid: dark seam core + 7 curved longitudinal oak staves + planked gable end-caps.
    var lidCore = new THREE.CylinderGeometry(.495, .495, W - .05, 22, 1, false, 0, Math.PI);
    lidCore.rotateZ(Math.PI / 2);
    lidCore.scale(1, Ry / .495, Rz / .495);
    addPart(lidCore, seamC, seamC, seamC, 0, lidY, 0);

    var staveN = 7;
    for(var si = 0; si < staveN; si++){
      var phi = .13 + (si / (staveN - 1)) * (Math.PI - .26);
      var sm = addPart(new THREE.BoxGeometry(W + .015, .064, .185), oakPal[si % oakPal.length], oakHi, oakLo, 0, lidY + Math.sin(phi) * Ry, Math.cos(phi) * Rz, 'timber', 71 + si);
      sm.rotation.x = Math.atan2(Ry * Math.cos(phi), Rz * Math.sin(phi));
    }

    // Arched oak gable end-caps closing left & right ends with horizontal plank seam grooves.
    var gableSh = new THREE.Shape();
    gableSh.moveTo(-Rz * .98, 0);
    for(var gi = 0; gi <= 18; gi++){
      var ga = Math.PI - (gi / 18) * Math.PI;
      gableSh.lineTo(Math.cos(ga) * Rz * .98, Math.sin(ga) * Ry * .98);
    }
    gableSh.closePath();
    var gableGeo = new THREE.ExtrudeGeometry(gableSh, { depth: .042, bevelEnabled: false });
    gableGeo.rotateY(Math.PI / 2);
    [-1, 1].forEach(function(sd, ei){
      addPart(gableGeo.clone(), oakPal[2], oakHi, oakLo, sd * (W * .5 - .022) - .021, lidY, 0, 'timber', 85 + ei);
      [.14, .29].forEach(function(hy){
        var span = 2 * Rz * Math.sqrt(Math.max(.05, 1 - (hy / Ry) * (hy / Ry))) * .92;
        addPart(new THREE.BoxGeometry(.016, .022, span), seamC, seamC, seamC, sd * (W * .5 + .004), lidY + hy, 0);
      });
    });

    // 5. Hammered-brass binding straps (2 inner straps + 2 outer end-rim bands) + gleaming dome rivets.
    var strapXs = [-.50, .50, -(W * .5 - .028), W * .5 - .028];
    strapXs.forEach(function(sx, idx){
      var sw = idx < 2 ? .132 : .092;
      addArchStrap(sx, sw, .016, .036, brBase, brHi, brLo);
      [-1, 1].forEach(function(fz){
        var leg = addPart(new THREE.BoxGeometry(sw, Hb - .03, .042), brBase, brHi, brLo, sx, .34, fz * (D * .5 + .002));
        leg.rotation.x = -fz * .055;
      });
      // Rivets marching across the front leg and over the arched lid strap.
      [.15, .36, .55].forEach(function(ry){
        addPart(new THREE.SphereGeometry(.023, 8, 6), rivetC, goldHi, brBase, sx, ry, D * .5 + .022);
      });
      for(var rv = 0; rv < 5; rv++){
        var rphi = .24 + (rv / 4) * (Math.PI - .48);
        addPart(new THREE.SphereGeometry(.023, 8, 6), rivetC, goldHi, brBase, sx, lidY + Math.sin(rphi) * (Ry + .052), Math.cos(rphi) * (Rz + .052));
      }
    });
    // Horizontal brass base & lid-lip trim strips tying the frame together.
    [-1, 1].forEach(function(fz){
      addPart(new THREE.BoxGeometry(W + .045, .048, .044), brBase, brHi, brLo, 0, .062, fz * (D * .5 - .015));
      addPart(new THREE.BoxGeometry(W + .068, .054, .048), brBase, brHi, brLo, 0, .712, fz * (D * .5 + .018));
    });
    [-1, 1].forEach(function(sx){
      addPart(new THREE.BoxGeometry(.044, .048, D + .035), brBase, brHi, brLo, sx * (W * .5 - .015), .062, 0);
      addPart(new THREE.BoxGeometry(.048, .054, D + .064), brBase, brHi, brLo, sx * (W * .5 + .018), .712, 0);
    });

    // 6. Eight hammered-brass L-shaped corner brackets with raised corner rivets.
    [-1, 1].forEach(function(sx){
      [-1, 1].forEach(function(sz){
        [.11, .565].forEach(function(cy){
          var tfC = cy < .3 ? .95 : 1.0;
          var cx = sx * (W * .5 * tfC + .006), cz = sz * (D * .5 * tfC + .006);
          addPart(new THREE.BoxGeometry(.18, .13, .046), brBase, brHi, brLo, cx - sx * .072, cy, cz);
          addPart(new THREE.BoxGeometry(.046, .13, .18), brBase, brHi, brLo, cx, cy, cz - sz * .072);
          addPart(new THREE.SphereGeometry(.020, 7, 5), rivetC, goldHi, brBase, cx - sx * .11, cy, cz + sz * .022);
          addPart(new THREE.SphereGeometry(.020, 7, 5), rivetC, goldHi, brBase, cx + sx * .022, cy, cz - sz * .11);
        });
      });
    });

    // 7. Two rear forged-brass strap hinges with horizontal cylindrical knuckle barrels & pin caps.
    [-.48, .48].forEach(function(hx){
      var knuckle = new THREE.CylinderGeometry(.048, .048, .20, 14);
      knuckle.rotateZ(Math.PI / 2);
      addPart(knuckle, brBase, brHi, brLo, hx, .685, -(D * .5 + .034));
      [-.105, .105].forEach(function(dx){ addPart(new THREE.SphereGeometry(.044, 8, 6), rivetC, goldHi, brBase, hx + dx, .685, -(D * .5 + .034)); });
      addPart(new THREE.BoxGeometry(.155, .20, .036), brBase, brHi, brLo, hx, .555, -(D * .5 + .016));
      var topLeaf = addPart(new THREE.BoxGeometry(.155, .21, .036), brBase, brHi, brLo, hx, .80, -(D * .5 + .006));
      topLeaf.rotation.x = .26;
      addPart(new THREE.SphereGeometry(.020, 7, 5), rivetC, goldHi, brBase, hx, .50, -(D * .5 + .035));
      addPart(new THREE.SphereGeometry(.020, 7, 5), rivetC, goldHi, brBase, hx, .84, -(D * .5 + .022));
    });

    // 8. Forged brass side-carry drop-ring handles on left & right walls.
    [-1, 1].forEach(function(sx){
      addPart(new THREE.BoxGeometry(.038, .18, .18), brBase, brHi, brLo, sx * (W * .5 + .008), .39, 0);
      var lug = new THREE.CylinderGeometry(.026, .026, .08, 10); lug.rotateX(Math.PI / 2);
      addPart(lug, brBase, brHi, brLo, sx * (W * .5 + .036), .42, 0);
      var ring = new THREE.TorusGeometry(.115, .024, 8, 18); ring.rotateY(Math.PI / 2);
      var rm = addPart(ring, goldC, goldHi, brLo, sx * (W * .5 + .055), .33, 0);
      rm.rotation.z = sx * .22;
    });

    // 9. Ornate beveled gold keyhole latch plate & hinged lid hasp on front center.
    var plateSh = new THREE.Shape();
    plateSh.moveTo(-.165, .155); plateSh.lineTo(.165, .155); plateSh.lineTo(.152, -.075);
    plateSh.quadraticCurveTo(.135, -.155, 0, -.185);
    plateSh.quadraticCurveTo(-.135, -.155, -.152, -.075);
    plateSh.closePath();
    var plateBezel = new THREE.ExtrudeGeometry(plateSh, { depth: .042, bevelEnabled: true, bevelThickness: .018, bevelSize: .016, bevelSegments: 2 });
    addPart(plateBezel, goldLo, goldC, brLo, 0, .595, D * .5 + .012);
    var plateFace = new THREE.ExtrudeGeometry(plateSh, { depth: .024, bevelEnabled: false });
    plateFace.scale(.86, .86, 1);
    addPart(plateFace, goldC, goldHi, goldLo, 0, .598, D * .5 + .046);
    // Hinged gold hasp strap descending from the front lid arch over the upper lock plate.
    var hasp = addPart(new THREE.BoxGeometry(.135, .195, .042), goldC, goldHi, goldLo, 0, .755, D * .5 + .048);
    hasp.rotation.x = -.16;
    var haspPin = new THREE.CylinderGeometry(.028, .028, .175, 10); haspPin.rotateZ(Math.PI / 2);
    addPart(haspPin, rivetC, goldHi, goldLo, 0, .725, D * .5 + .058);
    // Crisp recessed dark keyhole cutout (round upper bore + tapered lower key slot).
    var khCyl = new THREE.CylinderGeometry(.038, .038, .02, 14); khCyl.rotateX(Math.PI / 2);
    addPart(khCyl, keyC, keyC, keyC, 0, .605, D * .5 + .068);
    var slotSh = new THREE.Shape();
    slotSh.moveTo(-.020, .01); slotSh.lineTo(.020, .01); slotSh.lineTo(.032, -.092); slotSh.lineTo(-.032, -.092); slotSh.closePath();
    addPart(new THREE.ExtrudeGeometry(slotSh, { depth: .018, bevelEnabled: false }), keyC, keyC, keyC, 0, .595, D * .5 + .060);
    [[-.115, .69], [.115, .69], [-.105, .505], [.105, .505]].forEach(function(pt){
      addPart(new THREE.SphereGeometry(.016, 7, 5), rivetC, goldHi, goldLo, pt[0], pt[1], D * .5 + .068);
    });

    // 10. Grounding detail: 3 small gleaming gold doubloon coins nestled on the sand at the front base.
    [[-.36, .056, .74, .06], [-.14, .054, .82, -.05], [-.50, .052, .84, .04]].forEach(function(cn){
      var cm = addPart(new THREE.CylinderGeometry(.095, .095, .03, 14), goldC, goldHi, goldLo, cn[0], cn[1], cn[2]);
      cm.rotation.z = cn[3];
    });
    return g;
  }

  // Average the SphereGeometry meridian seam normals (u=0 and u=1) so satin pebbles & boulders are 100% crease-free.
  function rlWeldSphereSeamNormals(geo, wSeg, hSeg){
    var nor = geo.attributes.normal, stride = wSeg + 1;
    if(!nor) return;
    for(var row = 0; row <= hSeg; row++){
      var a = row * stride, b = row * stride + wSeg;
      var nx = nor.getX(a) + nor.getX(b), ny = nor.getY(a) + nor.getY(b), nz = nor.getZ(a) + nor.getZ(b);
      var len = Math.hypot(nx, ny, nz) || 1;
      nor.setXYZ(a, nx / len, ny / len, nz / len);
      nor.setXYZ(b, nx / len, ny / len, nz / len);
    }
    nor.needsUpdate = true;
  }

  // Smooth satin rounded coastal pebbles & boulders in warm sand-taupe & sea-washed limestone (replaces flat faceted grey rocks).
  function buildLobbyBoulder(THREE, kind, size, night, seed){
    var g = new THREE.Group(), r = reefRand(seed || 73);
    var vMat = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
    var pal = night
      ? [['#496068', '#627c84', '#2e4148'], ['#54686d', '#6d8488', '#35484e'], ['#3f555e', '#576f78', '#293b42']]
      : [['#d2c1a5', '#ece1cd', '#a69174'], ['#ded4bf', '#f4ede0', '#b7aa92'], ['#c7b293', '#e2d1b6', '#9b8669'], ['#d9c7aa', '#f0e3cc', '#ae9a7e']];

    function addStone(rad, sx, sy, sz, ox, oy, oz, ry, ci){
      var wSeg = 24, hSeg = 16;
      var geo = new THREE.SphereGeometry(rad, wSeg, hSeg), pos = geo.attributes.position;
      var p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
      for(var i = 0; i < pos.count; i++){
        var vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i), inv = 1 / (rad || 1);
        var nx = vx * inv, ny = vy * inv, nz = vz * inv;
        var wave = 1 + .055 * Math.sin(nx * 2.3 + p1) * Math.cos(nz * 2.1 + p2) + .035 * Math.cos(ny * 2.6 - nx * 1.8 + p3);
        var flatY = vy < 0 ? vy * .60 : vy;
        pos.setXYZ(i, vx * sx * wave, flatY * sy * wave, vz * sz * wave);
      }
      geo.computeVertexNormals();
      rlWeldSphereSeamNormals(geo, wSeg, hSeg);
      var q = pal[ci % pal.length];
      var m = new THREE.Mesh(rlPaintGeo(THREE, geo, q[0], q[1], q[2]), vMat);
      m.position.set(ox, oy + rad * sy * .46, oz);
      m.rotation.y = ry;
      if(typeof reef3dSurface === 'function') reef3dSurface(m, 'stone', { scale: 1.9, seed: seed + ci * 17 });
      g.add(m);
    }

    var baseR = .62 * (size || 1);
    var shapes = [
      [1.30, .64, 1.04],
      [1.16, .74, 1.12],
      [1.42, .56, .95]
    ];
    var sp = shapes[kind % shapes.length];
    addStone(baseR, sp[0], sp[1], sp[2], 0, 0, 0, r() * 6.28, kind);
    // Tuck 1-2 smooth companion coastal pebbles snugly at the boulder shoulder for natural tidepool grouping.
    var subN = kind === 2 ? 2 : 1;
    for(var k = 0; k < subN; k++){
      var sa = r() * 6.28, dist = baseR * (.76 + r() * .28), sr = baseR * (.36 + r() * .16);
      addStone(sr, 1.18 + r() * .25, .52 + r() * .18, .92 + r() * .22, Math.cos(sa) * dist, -.02, Math.sin(sa) * dist, r() * 6.28, kind + 1 + k);
    }
    return g;
  }

  // Low-profile coastal foreground props (sculpted starfish, fluted scallops, spiral conches, sand dollars & pebbles).
  function rlLobbyStarfish(THREE, rad, pigment, night){
    var g = new THREE.Group();
    var base = new THREE.Color(night ? '#8e6258' : pigment);
    var tip = base.clone().lerp(new THREE.Color(night ? '#c29f90' : '#fff2dc'), .42);
    var col = new THREE.Color();
    var body = rlPanelGrid(THREE, 30, 5, function(u, v){
      var a = u * Math.PI * 2, arm = Math.pow(.5 + .5 * Math.cos(5 * a), 1.55);
      var rr = v * rad * (.34 + .66 * arm);
      var yy = (1 - v * v) * rad * .26 * (.70 + .30 * arm) + .016;
      col.copy(base).lerp(tip, v * .52 * arm + (1 - v) * .12);
      return [Math.cos(a) * rr, yy, Math.sin(a) * rr, col];
    }, true);
    g.add(body);
    var beadMat = new THREE.MeshLambertMaterial({ color: night ? '#b59a8e' : '#fff3db' });
    var bR = Math.max(.016, rad * .072);
    var centerBead = new THREE.Mesh(new THREE.SphereGeometry(bR * 1.15, 7, 5), beadMat);
    centerBead.position.set(0, rad * .27, 0); g.add(centerBead);
    for(var k = 0; k < 5; k++){
      var ka = k * (Math.PI * 2 / 5);
      for(var d = 0; d < 2; d++){
        var f = d ? .60 : .33, br = rad * f;
        var bm = new THREE.Mesh(new THREE.SphereGeometry(bR * (d ? .76 : .94), 7, 5), beadMat);
        bm.position.set(Math.cos(ka) * br, (1 - f * f) * rad * .26 + .02, Math.sin(ka) * br);
        g.add(bm);
      }
    }
    return g;
  }

  function rlLobbyScallop(THREE, rad, baseHex, edgeHex, night){
    var g = new THREE.Group();
    var c0 = new THREE.Color(night ? '#7a6f68' : baseHex), c1 = new THREE.Color(night ? '#595050' : edgeHex), col = new THREE.Color();
    var fan = rlPanelGrid(THREE, 22, 7, function(u, v){
      var a = -.42 * Math.PI + u * .84 * Math.PI;
      var rib = .5 + .5 * Math.cos(u * Math.PI * 16);
      var rr = v * rad * (.94 + .06 * rib) * (.86 + .14 * Math.cos(a * .9));
      var dome = Math.sin(v * Math.PI * .92) * rad * .24 + rib * rad * .042 * v;
      col.copy(c0).lerp(c1, v * .65 + (1 - rib) * .22);
      return [Math.sin(a) * rr, dome + .012, -Math.cos(a) * rr + rad * .35, col];
    }, true);
    g.add(fan);
    var earMat = new THREE.MeshLambertMaterial({ color: night ? '#665d58' : baseHex });
    [-1, 1].forEach(function(sd){
      var ear = new THREE.Mesh(new THREE.BoxGeometry(rad * .24, rad * .07, rad * .14), earMat);
      ear.position.set(sd * rad * .14, rad * .04, rad * .32); ear.rotation.y = sd * .22; g.add(ear);
    });
    return g;
  }

  function rlLobbyConch(THREE, sc, pigment, night){
    var base = new THREE.Color(night ? '#7c645e' : pigment), stripe = new THREE.Color(night ? '#a49488' : '#fff5e4'), col = new THREE.Color();
    return rlPanelGrid(THREE, 16, 12, function(u, v){
      var a = u * Math.PI * 2, rib = Math.cos(a * 5 + v * 7);
      var rad = sc * .32 * Math.sin(v * Math.PI) * (1 - .36 * v) * (1 + .14 * rib);
      var len = (v - .42) * sc * 1.18;
      col.copy(base).lerp(stripe, .25 + .45 * (.5 + .5 * rib));
      return [Math.cos(a) * rad, Math.sin(a) * rad + sc * .21, len, col];
    }, true);
  }

  function rlLobbySandDollar(THREE, rad, night){
    var iv = new THREE.Color(night ? '#8c8a7e' : '#faf0da'), pet = new THREE.Color(night ? '#636058' : '#c9ae89'), col = new THREE.Color();
    return rlPanelGrid(THREE, 20, 5, function(u, v){
      var a = u * Math.PI * 2, rr = v * rad;
      var star = Math.pow(Math.max(0, Math.cos(5 * a)), 3) * Math.sin(v * Math.PI);
      var yy = Math.sqrt(Math.max(0, 1 - v * v * .88)) * rad * .16 + .012;
      col.copy(iv).lerp(pet, .52 * star);
      return [Math.cos(a) * rr, yy, Math.sin(a) * rr, col];
    }, true);
  }

  function rlLobbyPebbleGroup(THREE, sc, night, seed){
    var g = new THREE.Group(), r = reefRand(seed || 41);
    var vMat = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
    var pal = night
      ? [['#495e66', '#617982', '#31424a'], ['#55676b', '#6d8286', '#37484d']]
      : [['#d2c0a3', '#ece0cb', '#a79173'], ['#dfd5c0', '#f5eee0', '#b8ab92'], ['#c9b495', '#e4d3b8', '#9f8a6d']];
    for(var i = 0; i < 3; i++){
      var rad = (.16 + (i === 0 ? .09 : i === 1 ? .04 : 0)) * sc;
      var sx = 1.25 + r() * .25, sy = .46 + r() * .14, sz = .95 + r() * .22;
      var geo = new THREE.SphereGeometry(rad, 16, 12);
      geo.scale(sx, sy, sz);
      geo.computeVertexNormals();
      rlWeldSphereSeamNormals(geo, 16, 12);
      var q = pal[i % pal.length];
      var m = new THREE.Mesh(rlPaintGeo(THREE, geo, q[0], q[1], q[2]), vMat);
      var ang = i * 2.2 + r() * .4, dist = i === 0 ? 0 : (.26 + r() * .12) * sc;
      m.position.set(Math.cos(ang) * dist, rad * sy * .42, Math.sin(ang) * dist);
      m.rotation.y = r() * 6.28;
      if(typeof reef3dSurface === 'function') reef3dSurface(m, 'stone', { scale: 1.3, seed: seed + i * 11 });
      g.add(m);
    }
    return g;
  }

  // Shared portrait Kiko spot & exclusion radius so mobile framing and foreground shells never drift out of sync.
  var RL_PORTRAIT_KIKO = { x: -.60, z: 7.18, ry: .34, sc: .62 };
  var RL_PORTRAIT_KIKO_CLEAR = 1.55;

  // Dress the lower foreground sand band (for portrait mobile & desktop corners) + balanced portrait horizon framing,
  // keeping all profile buttons 100% crisp, high-contrast, and clear of tall obstructions, and keeping >= 1.55u clear of portrait Kiko.
  function rlLobbyForeground(THREE, group, groundY, night, B){
    function place(obj, x, z, ry, tilt){
      if(Math.hypot(x - RL_PORTRAIT_KIKO.x, z - RL_PORTRAIT_KIKO.z) < RL_PORTRAIT_KIKO_CLEAR) return;
      obj.position.set(x, groundY(x, z), z);
      if(tilt) rlGroundTilt(obj, groundY, x, z);
      obj.rotation.y = ry || 0;
      group.add(obj);
    }
    // Lower foreground band (z = 5.9..8.1): below Mobile action buttons (offscreen below Desktop y=640), zero bare 40% bottom sand,
    // strictly >= 1.55u clear of RL_PORTRAIT_KIKO (-0.60, 7.18) so zero crab legs ever intersect shells or pebbles.
    place(rlLobbyStarfish(THREE, .28, '#f2b154', night), -1.82, 5.95, .35, true);
    place(rlLobbyConch(THREE, .44, '#efb293', night), .76, 6.18, -2.35, true);
    place(rlLobbyPebbleGroup(THREE, .60, night, 317), 1.18, 6.82, 1.2, true);
    place(rlLobbyStarfish(THREE, .29, '#ee8364', night), .96, 7.56, -.28, true);
    place(rlLobbyScallop(THREE, .28, '#fdf2e6', '#e6a0b0', night), .76, 8.12, -.45, true);
    place(rlLobbySandDollar(THREE, .24, night), 1.32, 8.06, .65, true);

    // Side flanks (z = 2.8..4.5, outside the central profile-token corridor): frames both Mobile margins & Desktop lower corners.
    place(rlLobbyPebbleGroup(THREE, .86, night, 349), -2.42, 3.85, .9, true);
    place(rlLobbyScallop(THREE, .35, '#fbf0e2', '#eeb090', night), -2.62, 3.15, .75, true);
    place(rlLobbyStarfish(THREE, .34, '#f0a856', night), 2.40, 3.92, .5, true);
    place(rlLobbyPebbleGroup(THREE, .92, night, 367), 2.66, 3.10, 1.7, true);
    place(rlLobbyScallop(THREE, .34, '#fcf2e4', '#e8a2b2', night), 2.38, 3.45, -.6, true);
    place(rlLobbyStarfish(THREE, .40, '#ee8466', night), 4.55, 2.85, .25, true);
    place(rlLobbyPebbleGroup(THREE, 1.05, night, 383), 5.32, 2.18, 2.5, true);
    place(rlLobbySandDollar(THREE, .34, night), -3.28, 4.35, .4, true);
    place(rlLobbyConch(THREE, .56, '#f0b696', night), -2.92, 4.72, 1.85, true);

    // Balanced mid-right coastal boulder + framing kelp edge visible on portrait mobile without obstructing Shelly or buttons.
    var midStone = buildLobbyBoulder(THREE, 1, .82, night, 409);
    midStone.position.set(2.85, groundY(2.85, -8.6) - .05, -8.6); midStone.rotation.y = 1.1; group.add(midStone);
    place(rlLobbyScallop(THREE, .40, '#fcf2e4', '#eeac8e', night), 2.25, -7.55, -.35, true);
    var edgeKelp = B.kelp(reefRand(night ? 91 : 79));
    edgeKelp.position.set(5.35, groundY(5.35, -10.6) - .08, -10.6); edgeKelp.rotation.y = .8; edgeKelp.scale.setScalar(.92);
    group.add(edgeKelp);
  }

  function reefLobbyBuild(models, night){
    var THREE = window.THREE, r = reefRand(night ? 17 : 11);
    var wrap = document.createElement('div');
    wrap.className = 'rl ' + (night ? 'night' : 'day');
    wrap.innerHTML = '<canvas class="rl-canvas" aria-hidden="true"></canvas>' + reefMusicButtonHTML('rl-musicbtn') +
      '<div class="r3-bubble rl-note" role="status" hidden></div>' +
      '<button type="button" class="rl-themebtn" data-rl-theme aria-label="' + (night ? 'Switch to the sunlit reef (light mode)' : 'Switch to the midnight wreck (dark mode)') + '">' + (night ? '☀️' : '🌙') + '</button>';
    var renderer = new THREE.WebGLRenderer({ canvas: wrap.querySelector('canvas'), antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
    var scene = new THREE.Scene(); scene.fog = new THREE.Fog(night ? '#123844' : '#94dfe5', 15, 40);
    var cam = new THREE.PerspectiveCamera(45, 1, .1, 100); cam.position.set(0, 5.5, 13); cam.lookAt(0, 2.2, 0);
    var kit = reef3dKit(THREE, night), B = kit.B, M = kit.M;
    scene.add(new THREE.HemisphereLight(night ? '#7fb6c4' : '#f8fff7', night ? '#18343f' : '#73b8bd', night ? .6 : .56));
    var sun = new THREE.DirectionalLight(night ? '#a9e6ff' : '#fff8ee', night ? .6 : .72); sun.position.set(6, 16, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; scene.add(sun);
    var rig = reef3dRig(scene), bake = {};   // baked lighting and painted shadows, as on the board (see reef3dBakeGeo)
    renderer.shadowMap.enabled = false; sun.castShadow = false;

    // Sand with drifting sunlight (or faint glow at night), like the board.
    var floorGeo = new THREE.PlaneGeometry(60, 50, 60, 50), pos = floorGeo.attributes.position;
    for(var v = 0; v < pos.count; v++){ var fx = pos.getX(v), fy = pos.getY(v); pos.setZ(v, Math.sin(fx * .35) * .25 + Math.cos(fy * .22 + fx * .1) * .3 + Math.max(0, -fy - 6) * .18); }
    floorGeo.computeVertexNormals();
    var caus = reef3dCausticTexture(12, 10);
    var floor = new THREE.Mesh(floorGeo, M(night ? '#2f3e3e' : '#d9cba6'));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.15; scene.add(floor);
    reef3dBakeObject(floor, rig, bake); floor.material = reef3dSandMat(caus, new THREE.Color(night ? '#2a6f78' : '#fff6da').multiplyScalar(.2));
    function groundY(x, z){ var fy = -z; return Math.sin(x * .35) * .25 + Math.cos(fy * .22 + x * .1) * .3 + Math.max(0, -fy - 6) * .18 - .15; }

    // A ring of scenery around the room, kept clear of the middle where Shelly swims.
    var lobbyStatics = new THREE.Group();
    var setD = night ? ['kelp', 'rock', 'coralBall', 'plank'] : ['kelp', 'coralBall', 'staghorn', 'rock', 'star', 'kelp'];
    for(var n = 0; n < 34; n++){
      var a = r() * Math.PI * 2, rad = 7 + r() * 12, sx = Math.cos(a) * rad, sz = Math.sin(a) * rad * .8 - 4;
      if(sz > 6) continue;
      if(Math.abs(sx) < 5.5 && sz > -2.5) continue;   // keep foreground behind profile tokens clear
      if(Math.hypot(sx + 4.5, sz - 2) < 2.4) continue;   // keep >= 2.4u clearance around Kiko (-4.5, 0, 2)
      if(Math.hypot(sx - 6.5, sz + 2) < 2.1) continue;   // keep >= 2.1u clearance around the crafted treasure chest
      var nm = setD[Math.floor(r() * setD.length)], d = null;
      if(nm === 'kelp' && Math.abs(sx) < 5.5 && sz < 3.5) continue;   // keep tall kelp out of Shelly's middle swimming corridor & background sightline
      if(nm === 'rock'){
        var rockKind = Math.floor(r() * 3), rockSize = .7 + r() * .9;
        d = buildLobbyBoulder(THREE, rockKind, rockSize, night, n * 131 + (night ? 53 : 19));
      } else {
        d = B[nm](r);
      }
      var yOff = nm === 'rock' ? -.06 : nm === 'kelp' ? -.08 : nm === 'star' ? .01 : -.03;
      d.position.set(sx, groundY(sx, sz) + yOff, sz); d.rotation.y = r() * 6; d.scale.multiplyScalar(.8 + r() * .7); lobbyStatics.add(d);
    }
    var wreck = night ? reef3dModel(models, 'wreck', 6, kit.grad, '#3c5560') : null;
    if(wreck){ wreck.traverse(function(m){ if(/^grass/.test(m.name || '')) m.visible = false; }); wreck.position.set(-9, groundY(-9, -10) - .3, -10); wreck.rotation.y = .7; lobbyStatics.add(wreck); }
    var chest = buildLobbyChest(THREE, night);
    chest.position.set(6.5, groundY(6.5, -2) - .04, -2); chest.rotation.y = -.58; lobbyStatics.add(chest);
    rlLobbyForeground(THREE, lobbyStatics, groundY, night, B);

    var blobList = [], blobMat = reef3dBlobMat(reef3dBlobTex(), night);
    lobbyStatics.updateMatrixWorld(true); lobbyStatics.children.forEach(function(c){ reef3dFootprint(c, blobList); });
    scene.add(reef3dMerge(lobbyStatics, rig, bake));
    // Kiko (Mochi or Hermit, the same one as on the board) sits grounded on the sand; tap it to swap crabs.
    var crabHome = { x: -4.5, z: 2, ry: .6, sc: .9 };
    var crab = reefCrabBuild(reefCrabNow, kit.grad, crabHome.sc);
    crab.position.set(crabHome.x, groundY(crabHome.x, crabHome.z), crabHome.z); crab.rotation.y = crabHome.ry; scene.add(crab);

    // Rays of light and a few fish, as on the board.
    var rayTex = (function(){ var c = document.createElement('canvas'); c.width = 64; c.height = 256; var g = c.getContext('2d');
      var gv = g.createLinearGradient(0, 0, 0, 256); gv.addColorStop(0, 'rgba(255,255,255,1)'); gv.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gv; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'destination-in'; var gh = g.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(.5, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gh; g.fillRect(0, 0, 64, 256);
      return new THREE.CanvasTexture(c); })();
    var rays = [];
    for(var ri = 0; ri < 6; ri++){
      var rm = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + r() * 1.6, 16), new THREE.MeshBasicMaterial({ map: rayTex, color: night ? '#7fe0d6' : '#fffbe8', transparent: true, opacity: night ? .05 : .14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      rm.position.set((r() - .5) * 18, 6, -3 - r() * 8); rm.rotation.set(0, (r() - .5) * .8, .32); rm.userData.base = rm.material.opacity; rm.userData.ph = r() * 6; scene.add(rm); rays.push(rm);
    }
    var fish = [], mixers = [];
    // Stratify ambient intro fish cleanly into lower-reef (-1) and upper-channel (+1) lanes well clear of Shelly's shell.
    var fishBands = [-1, 1, -1, 1, -1, 1, -1];
    for(var fI = 0; fI < 7; fI++){
      var fm = reef3dModel(models, fI % 2 ? 'fish2' : 'fish1', .4, kit.grad, fI % 3 === 2 ? '#ffd166' : null);
      if(!fm) break;
      var holder = new THREE.Group(); holder.add(fm); scene.add(holder);
      var mx = new THREE.AnimationMixer(fm.userData.root), clip = fm.userData.gltf.animations[0]; if(clip){ var ac = mx.clipAction(clip); ac.play(); ac.time = r() * clip.duration; } mixers.push(mx);
      var band = fishBands[fI % fishBands.length];
      var baseH = band < 0 ? (1.55 + r() * .75) : (5.75 + r() * .55);
      holder.userData = { rad: 6.2 + r() * 4.6, h: baseH, band: band, spd: (.15 + r() * .14) * (fI % 2 ? 1 : -1), ph: (fI / 7) * Math.PI * 2 + (r() - .5) * .45 };
      fish.push(holder);
    }

    var blobs = reef3dBlobs(blobList, blobMat, groundY); if(blobs) scene.add(blobs);
    var cbGeo = new THREE.PlaneGeometry(1.75, 1.75); cbGeo.rotateX(-Math.PI / 2);
    var blobC = new THREE.Mesh(cbGeo, blobMat.clone()); blobC.renderOrder = 2; scene.add(blobC);
    var guide = B.guide(); guide.position.set(0, 4, -1); scene.add(guide);
    // Shelly swims high in the lobby, so her shadow is soft and faint; at night Lumi's lure lights the sand instead
    var gb = new THREE.PlaneGeometry(2.6, 2.6); gb.rotateX(-Math.PI / 2);
    var blobG = new THREE.Mesh(gb, night ? new THREE.MeshBasicMaterial({ map: reef3dBlobTex(true), color: '#5ff0e0', transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }) : blobMat.clone());
    if(night) blobG.scale.setScalar(2.4); else blobG.material.opacity = .55;
    blobG.renderOrder = 3; scene.add(blobG);
    var t0 = performance.now();
    var view = { wrap: wrap, renderer: renderer, scene: scene, cam: cam, night: night, guide: guide, caus: caus, rays: rays, fish: fish, mixers: mixers, crab: crab, crabHome: crabHome, leaving: null, spareCrab: null,
      food: [], target: new THREE.Vector3(0, 4, -1), vel: new THREE.Vector3(), t0: t0, lastT: t0, wanderAt: t0 + 2600, kit: kit, bake: bake, floorY: -.15, baked: true, blobG: blobG, blobC: blobC, groundY: groundY, portrait: null, moving: false, disposed: false };
    // Mount the real hero Shelly GLB in day mode so the intro turtle matches the board cast.
    if(!night && typeof reef3dShellyAttach === 'function'){
      if(typeof R3 !== 'undefined' && R3 && R3.shellyModel) reef3dShellyAttach(view, R3.shellyModel);
      else if(typeof reef3dShellyLoad === 'function'){
        reef3dShellyLoad().then(function(gltf){
          if(gltf && !view.disposed && !view.night){
            if(typeof R3 !== 'undefined' && R3) R3.shellyModel = gltf;
            reef3dShellyAttach(view, gltf);
          }
        });
      }
    }

    // Tap the water: a food (picked by chance, see reef_food.js) appears where you tapped and sinks slowly.
    var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
    renderer.domElement.addEventListener('click', function(e){
      var rc = renderer.domElement.getBoundingClientRect();
      ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ptr, cam);
      if(view.crab && !view.leaving && !view.crab.userData.entering &&
         (ray.intersectObject(view.crab, true).length || reef3dTapDist(view, view.crab.position.clone().setY(view.crab.position.y + .45), e, rc) < 60)){
        reefCrabSwap(view, { x: view.portrait ? 3.4 : 7.5, z: view.crabHome.z }, -1); return;
      }
      if(!ray.ray.intersectPlane(plane, hit)) return;
      hit.x = Math.max(-8, Math.min(8, hit.x)); hit.y = Math.max(1, Math.min(6, hit.y));
      var pellet = reefFoodBuild(reefFoodPick(), kit.grad, night), sc = pellet.userData.kind === 'bag' ? 1.7 : 1.3;   // the bag is a bit bigger, so it can be seen
      pellet.scale.setScalar(sc); pellet.userData.base = sc;
      pellet.position.copy(hit); scene.add(pellet); view.food.push(pellet);
      if(view.food.length > 6){ var old = view.food.shift(); scene.remove(old); }
      try { Sound.unlock(); Sound.bloop(760, 0, .04); } catch(err){}
      try { localStorage.setItem(COVE_FED_K, '1'); } catch(err){}
    });
    // Day ⇄ night from the profile screen: a soft wash covers the switch while the room is rebuilt for the new time of day.
    wrap.querySelector('[data-rl-theme]').addEventListener('click', function(){
      if(view.switching) return; view.switching = true;
      try { Sound.unlock(); reefThemeSting(!night); } catch(err){}
      var w = reef3dWash(!night);
      setTimeout(function(){
        var mode = night ? 'light' : 'dark'; rlThemeHandOff = mode;
        try { localStorage.setItem(RL_THEME_K, mode); } catch(err){}
        render();
      }, reefCalm() ? 280 : 450);
      setTimeout(function(){ reef3dWashOut(w); }, reefCalm() ? 420 : 900);
    });
    reef3dQApply(view);
    return view;
  }

  // The plastic bag: she won't eat it. It floats up and away, and a note (which stays until OK) explains why.
  function reefLobbyRefuse(view, bag, now, calm){
    view.food.shift(); view.refuseAt = now;
    if(view.target && view.guide) view.target.copy(view.guide.position);
    view.wanderAt = Math.max(view.wanderAt || 0, now + 1800);
    if(view.guide && view.guide.userData.shelly && !calm && typeof reef3dEmote === 'function') reef3dEmote(view, 'look');
    if(calm) view.scene.remove(bag);
    else { var from = bag.position.clone(), mats = [];
      bag.traverse(function(o){ if(o.material && mats.indexOf(o.material) < 0) mats.push(o.material); });
      (view.fx = view.fx || []).push({ t0: performance.now(), dur: 2600,
        step: function(p){ bag.position.set(from.x + p * .8, from.y + p * 3, from.z); mats.forEach(function(m){ m.opacity = .85 * (1 - p); }); },
        end: function(){ view.scene.remove(bag); } }); }
    var note = view.wrap.querySelector('.rl-note'); if(!note) return;
    var who = view.night ? 'Lumi' : 'Shelly';
    note.innerHTML = reefGuideMini(view.night, 'rl-note-e') +
      '<span><b>No, thank you!</b> ' + who + ' does not eat plastic bags. Plastic in the sea can make sea animals sick. ' +
      'Help keep the ocean clean: put trash in a trash can.</span><button type="button" class="rl-note-ok">OK</button>';
    note.hidden = false; note.classList.remove('show'); void note.offsetWidth; note.classList.add('show');
    note.querySelector('.rl-note-ok').addEventListener('click', function(){ note.hidden = true; });
  }

  function reefLobbyFrame(view, now){
    var THREE = window.THREE, calm = reefCalm(), t = (now - view.t0) / 1000, dt = Math.min(.05, Math.max(0, (now - view.lastT) / 1000)); view.lastT = now;
    var w = view.wrap.clientWidth || 1, h = view.wrap.clientHeight || 1;
    if(view.w !== w || view.h !== h){
      var portrait = w < h;
      view.w = w; view.h = h; view.portrait = portrait;
      view.renderer.setSize(w, h, false);
      view.cam.aspect = w / h;
      view.cam.fov = portrait ? 52 : (w < 640 ? 54 : 45);
      if(portrait) view.cam.position.set(0, 5.8, 15.2);
      else view.cam.position.set(0, 5.5, 13);
      view.cam.lookAt(0, 2.2, 0);
      view.cam.updateProjectionMatrix();
      if(view.scene.fog){ view.scene.fog.near = portrait ? 17.5 : 15; view.scene.fog.far = portrait ? 44 : 40; }
      view.crabHome = portrait
        ? { x: RL_PORTRAIT_KIKO.x, z: RL_PORTRAIT_KIKO.z, ry: RL_PORTRAIT_KIKO.ry, sc: RL_PORTRAIT_KIKO.sc }
        : { x: -4.5, z: 2, ry: .6, sc: .9 };
      if(view.crab && !view.crab.userData.entering){
        view.crab.position.set(view.crabHome.x, view.groundY(view.crabHome.x, view.crabHome.z), view.crabHome.z);
        view.crab.rotation.y = view.crabHome.ry;
        view.crab.scale.setScalar(view.crabHome.sc);
      }
      if(view.post){ view.post.band = portrait ? .32 : .26; view.post.U.focusY.value = portrait ? .35 : .38; }
    }
    var g = view.guide, body = g.userData.body, parts = g.userData.parts;
    if(view.blobG){ var gp = g.position; view.blobG.position.set(gp.x, view.groundY(gp.x, gp.z) + .07, gp.z); }
    if(view.blobC && view.crab){
      var cp = view.crab.position;
      view.blobC.position.set(cp.x, view.groundY(cp.x, cp.z) + .05, cp.z);
      view.blobC.scale.setScalar((view.crab.scale.x || .9) / .9);
    }
    // Shelly heads for the nearest food, or wanders to a new spot every few seconds.
    var food = view.food[0], mouthAt = null;
    if(food && parts.mouth){   // swim so her MOUTH meets the food: aim her middle at the food minus the mouth's offset
      g.updateMatrixWorld(true); mouthAt = parts.mouth.getWorldPosition(new THREE.Vector3());
      view.target.copy(food.position).sub(mouthAt).add(g.position);
    } else if(food) view.target.copy(food.position);
    else if(now > view.wanderAt){ view.target.set((Math.random() - .5) * (view.portrait ? 4.4 : 9), 3.2 + Math.random() * 2.2, (Math.random() - .5) * 4 - 2); view.wanderAt = now + 3500 + Math.random() * 3000; }
    var to = view.target.clone().sub(g.position), dist = to.length();
    if(calm){ if(food){ g.position.copy(view.target); } }
    else if(dist > .05){ var sp = (food ? 3.2 : 1.1) * dt; g.position.add(to.multiplyScalar(Math.min(1, sp / dist))); }
    var aim = food ? food.position : view.target;   // with food, she turns to face the food itself
    if((dist > .1 || food) && !calm){ var want = Math.atan2(aim.x - g.position.x, aim.z - g.position.z); var dA = ((want - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; g.rotation.y += dA * Math.min(1, dt * 4); }
    var reached = food && (mouthAt ? mouthAt.distanceTo(food.position) < .32 : g.position.distanceTo(food.position) < .55);
    if(reached && food.userData.kind === 'bag'){ reefLobbyRefuse(view, food, now, calm); reached = false; }
    if(reached){ // gulp: the food shrinks into her mouth
      view.food.shift();
      if(calm || !mouthAt) view.scene.remove(food);
      else { var bite = food, from = food.position.clone(), s0 = food.scale.x;
        (view.fx = view.fx || []).push({ t0: performance.now(), dur: 180,
          step: function(p){ g.updateMatrixWorld(true); bite.position.lerpVectors(from, parts.mouth.getWorldPosition(new THREE.Vector3()), p); bite.scale.setScalar(s0 * (1 - p)); },
          end: function(){ view.scene.remove(bite); } }); }
      try { Sound.bloop(420, 0, .06); } catch(e){}
      view.gulpAt = now;
      view.target.copy(g.position); view.wanderAt = Math.max(view.wanderAt || 0, now + 1800);
      var kind = food.userData.kind;   // rare foods: a twirl and sparkles for the star treat, a small sparkle for the jellyfish
      if(!calm && kind === 'star'){ view.twirlAt = now; reefFoodSparkle(view, food.position.clone(), true); try { Sound.bloop(880, .05, .05); Sound.bloop(1175, .15, .05); Sound.bloop(1568, .25, .05); } catch(e){} }
      else if(!calm && kind === 'jelly') reefFoodSparkle(view, food.position.clone(), false);
      if(g.userData.shelly && !calm && typeof reef3dEmote === 'function') reef3dEmote(view, kind === 'star' ? 'twirl' : 'hello');
    }
    view.moving = !calm && (!!view.food[0] || (!view.emote && g.position.distanceTo(view.target) > .25));
    var pose = typeof reef3dPose === 'function' ? reef3dPose() : null;
    if(!calm && view.emote){
      var ep = Math.max(0, (now - view.emote.t0) / view.emote.dur);
      if(ep >= 1 || view.moving){
        var doneEm = view.emote; view.emote = null; view.emoteEnd = now;
        if(doneEm.after) doneEm.after();
      } else if(pose && typeof REEF3D_EMOTES !== 'undefined' && REEF3D_EMOTES[view.emote.name]){
        REEF3D_EMOTES[view.emote.name].pose(ep, pose, t);
      }
    }
    view.food.forEach(function(f){ if(f.position.y > .25) f.position.y -= dt * .35; if(!calm) reefFoodIdle(f, t, dt); });
    if(view.fx) view.fx = view.fx.filter(function(fx){ var p = Math.min(1, (performance.now() - fx.t0) / fx.dur); fx.step(p); if(p >= 1){ fx.end(); return false; } return true; });
    if(!calm){
      var gs = view.gulpAt && now - view.gulpAt < 300 ? 1 + Math.sin((now - view.gulpAt) / 300 * Math.PI) * .18 : 1;
      body.scale.setScalar(gs);
      if(!g.userData.shelly){
        body.position.y = Math.sin(t * 2) * .12;
        var tw = view.twirlAt ? Math.min(1, (now - view.twirlAt) / 900) : 1;   // the star-treat twirl: one full happy spin
        body.rotation.y = tw < 1 ? (1 - Math.pow(1 - tw, 3)) * Math.PI * 2 : 0;
        var nope = view.refuseAt ? Math.min(1, (now - view.refuseAt) / 1000) : 1;   // the plastic bag: a slow "no" shake of the head
        if(nope < 1) body.rotation.y = Math.sin(nope * Math.PI * 4) * .35 * (1 - nope);
        (parts.flippers || []).forEach(function(f, i){
          var sp2 = dist > .3 ? 9 : 2.2, amp = dist > .3 ? .5 : .2;
          if(view.night) f.rotation.z = f.userData.side * Math.sin(t * sp2 * 1.4 + i) * amp;
          else { f.rotation.y = f.userData.side * Math.sin(t * sp2 + (f.userData.front ? 0 : 1.6)) * amp; f.rotation.z = f.userData.side * Math.sin(t * sp2 + .8) * amp * .4; }
        });
        if(parts.tail) parts.tail.rotation.y = Math.sin(t * 6) * .45;
        (parts.eyes || []).forEach(function(e){ e.scale.y = (t % 3.7) < .13 ? .12 : 1; });
      }
      view.mixers.forEach(function(m){ m.update(dt); });
      var lc = view.crab, home = view.crabHome || { x: -4.5, z: 2, ry: .6, sc: .9 };   // a crab swapped in scuttles over to Kiko's spot, then dances
      if(lc && lc.userData.entering){
        var hx = home.x - lc.position.x, hz = home.z - lc.position.z, hd = Math.hypot(hx, hz);
        lc.scale.setScalar(home.sc);
        if(hd < .1){ lc.userData.entering = false; lc.position.set(home.x, view.groundY(home.x, home.z), home.z); lc.rotation.y = home.ry; reefCrabPlay(lc, 'Dance'); }
        else { var cs = Math.min(hd, dt * 4.5); lc.position.x += hx / hd * cs; lc.position.z += hz / hd * cs; lc.position.y = view.groundY(lc.position.x, lc.position.z); lc.rotation.y = 0; if(lc.userData.anim.name !== 'Walk') reefCrabPlay(lc, 'Walk'); }
      }
      if(lc) reefCrabAnimate(lc);
      reefCrabLeaveTick(view, dt);
      if(view.leaving) view.leaving.position.y = view.groundY(view.leaving.position.x, view.leaving.position.z);
      view.caus.offset.set(t * .012, t * .02);
      view.rays.forEach(function(rm){ rm.material.opacity = rm.userData.base * (.65 + .35 * Math.sin(t * .5 + rm.userData.ph)); });
    }
    if(!calm || !view._fishPlaced){
      view._fishPlaced = true;
      var cam = view.cam, gpF = g.position, shX = gpF.x, shY = gpF.y, shZ = gpF.z;
      cam.updateMatrixWorld(true);
      var fInv = view._fishCamInv || (view._fishCamInv = new THREE.Matrix4());
      fInv.copy(cam.matrixWorld).invert();
      var fV = view._fishProj || (view._fishProj = new THREE.Vector3());
      var fVL = view._fishProjL || (view._fishProjL = new THREE.Vector3());
      // Project Shelly's full 3D bounding box (shell, head & flippers) into exact NDC space once per frame.
      var sMinX = 1e9, sMaxX = -1e9, sMinY = 1e9, sMaxY = -1e9;
      for(var sxS = -1; sxS <= 1; sxS += 2){
        for(var syS = 0; syS <= 1; syS++){
          for(var szS = -1; szS <= 1; szS += 2){
            fV.set(shX + sxS * .98, shY + (syS ? .78 : -.40), shZ + szS * .96).project(cam);
            if(fV.x < sMinX) sMinX = fV.x; if(fV.x > sMaxX) sMaxX = fV.x;
            if(fV.y < sMinY) sMinY = fV.y; if(fV.y > sMaxY) sMaxY = fV.y;
          }
        }
      }
      var tanHalf = Math.tan((cam.fov || 52) * Math.PI / 360);
      var asp = cam.aspect || (w / Math.max(1, h));
      var safeNdcTop = view.portrait ? .66 : .72; // cleanly below header/subtitle banner
      function evalLobbyFish(u, tt, out){
        var a = tt * u.spd + u.ph;
        var fx = Math.cos(a) * u.rad, fy = u.h + Math.sin(tt + u.ph) * .24, fz = Math.sin(a) * u.rad * .46 - 3.8;
        // Exact NDC clearance against Shelly's shell + fish body half-extents + generous open-water daylight.
        fVL.set(fx, fy, fz).applyMatrix4(fInv);
        var dep = Math.max(2.5, -fVL.z);
        var halfHWorld = dep * tanHalf;
        var halfWWorld = halfHWorld * asp;
        // Fish half-size in NDC + crisp open-water daylight margin (>= 34px on mobile 390x844 & desktop 1024x640)
        var padX = .66 / halfWWorld + (view.portrait ? .24 : .12);
        var padY = .36 / halfHWorld + (view.portrait ? .12 : .14);
        fV.set(fx, fy, fz).project(cam);
        var exMin = sMinX - padX, exMax = sMaxX + padX, exMidX = (exMin + exMax) * .5, exHalfX = (exMax - exMin) * .5 || .1;
        var exMinY = sMinY - padY, exMaxY = sMaxY + padY, exMidY = (exMinY + exMaxY) * .5, exHalfY = (exMaxY - exMinY) * .5 || .1;
        var nx = (fV.x - exMidX) / exHalfX, ny = (fV.y - exMidY) / exHalfY;
        if(nx * nx + ny * ny < 1.0){
          var arcH = exHalfY * Math.sqrt(Math.max(0, 1.06 - nx * nx));
          var dir = u.band || (ny >= 0 ? 1 : -1);
          var wantNdcY = exMidY + dir * arcH;
          var minFy = view.groundY(fx, fz) + 1.05;
          var candY = fy + (wantNdcY - fV.y) * halfHWorld;
          if(wantNdcY > safeNdcTop || candY < minFy){
            var altNdcY = exMidY - dir * arcH;
            var altY = fy + (altNdcY - fV.y) * halfHWorld;
            if(altNdcY <= safeNdcTop && altY >= minFy) candY = altY;
            else {
              candY = Math.max(minFy, candY);
              var arcW = exHalfX * Math.sqrt(Math.max(0, 1.08 - Math.min(1, Math.pow((Math.min(safeNdcTop, wantNdcY) - exMidY) / exHalfY, 2))));
              var wantNdcX = exMidX + (nx >= 0 ? 1 : -1) * arcW;
              fx += (wantNdcX - fV.x) * halfWWorld;
            }
          }
          fy = candY;
        }
        // Also enforce strict 3D separation (>= 2.5u) from Shelly's shell.
        var d3 = Math.hypot(fx - shX, fy - (shY + .18), fz - shZ);
        if(d3 < 2.55){
          var pushDir = (u.band || (fy >= shY ? 1 : -1));
          fy = Math.max(view.groundY(fx, fz) + 1.05, fy + pushDir * (2.55 - d3));
        }
        out.x = fx; out.y = fy; out.z = fz;
      }
      var fp0 = view._fp0 || (view._fp0 = { x: 0, y: 0, z: 0 }), fp1 = view._fp1 || (view._fp1 = { x: 0, y: 0, z: 0 });
      view.fish.forEach(function(f){
        var u = f.userData;
        evalLobbyFish(u, t, fp0);
        evalLobbyFish(u, t + .06, fp1);
        f.position.set(fp0.x, fp0.y, fp0.z);
        f.rotation.y = Math.atan2(fp1.x - fp0.x, fp1.z - fp0.z);
      });
    }
    if(typeof reef3dShellyFrame === 'function') reef3dShellyFrame(view, now, dt, calm, pose);
    // Occasional shadow updates, as on the board, to keep the iPad cool.
    view.frameN = (view.frameN || 0) + 1;
    if(view.frameN % (view.every === 2 ? 6 : 12) === 0 || view.frameN < 4) view.renderer.shadowMap.needsUpdate = true;
    if(!view.post){ view.post = reef3dPost(view.renderer, view.night); if(view.post){ view.post.on = reef3dPostWanted(R3.q); view.post.band = view.portrait ? .32 : .26; view.post.U.focusY.value = view.portrait ? .35 : .38; } }   // the same look as the board (post.js)
    if(view.post) view.post.render(view.scene, view.cam); else view.renderer.render(view.scene, view.cam);
  }
  function reefLobbyLoop(view){
    if(view.raf) return;
    function tick(now){
      if(!document.body.contains(view.wrap)){ view.raf = null; if(!app.querySelector('.lock-screen .profile-grid')) document.body.classList.remove('r3-lobby'); return; }
      view.tick = (view.tick || 0) + 1;
      if(view.tick % (view.every || 1) === 0){ reefLobbyFrame(view, now); reef3dQTick(view, now); }
      view.raf = requestAnimationFrame(tick);
    }
    view.raf = requestAnimationFrame(tick);
  }
