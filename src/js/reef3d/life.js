  /* ---------- Life on the board: little touches that make the reef feel alive ----------
     · a beam of light over the next deck (it stands with the floating star), with motes drifting up it
     · while she waits for you to roll, three small lights orbit her, each trailing a comet tail
     · finishing a deck: a victory dance and a burst of confetti
     · when nobody touches the screen for a while, the camera drifts gently, like a slow breath
     · the first time the board opens in a visit, the camera swoops down from high above onto her
     All of it is a handful of glow sprites and one instanced confetti draw, so it costs almost nothing.
     Calm Motion keeps the beam (still) and skips the rest. */

  // victory dance: hop to one side, hop to the other, then a big spinning jump, a bounce and a wave
  REEF3D_EMOTES.dance = { dur: 2900, pose: function(p, q){
    var a = reef3dSeg(p, 0, .22), b = reef3dSeg(p, .22, .44), j = reef3dSeg(p, .48, .8), l = reef3dSeg(p, .8, .9), w = reef3dSeg(p, .84, 1);
    q.y = .55 * reef3dBounce(a) + .55 * reef3dBounce(b) + 1.6 * reef3dBounce(j);
    q.rz = .38 * reef3dBounce(a) - .38 * reef3dBounce(b);
    q.ry = -.55 * reef3dBounce(a) + .55 * reef3dBounce(b) + Math.PI * 2 * reef3dEase(j);
    q.sy = 1 - .2 * reef3dBounce(reef3dSeg(p, .44, .5)) + .2 * reef3dBounce(j) - .26 * reef3dBounce(l);
    q.flap = (a > 0 && a < 1) || (b > 0 && b < 1) || (j > 0 && j < 1) ? 1 : 0; q.wave = w > 0 && w < 1 ? 1 : 0;
    q.face = reef3dEase(reef3dSeg(p, .82, .9)); q.eyes = .4;
  } };

  function reef3dGlowMat(col, op){ var THREE = window.THREE; return new THREE.SpriteMaterial({ map: reef3dBlobTex(true), color: col, transparent: true, opacity: op, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }); }
  function reef3dLifeBuild(view){
    var THREE = window.THREE, night = view.night, L = view.life = { orb: 0 };
    // the beam: two open cylinders, a soft wide one and a bright core, fading out as they rise
    var c = document.createElement('canvas'); c.width = 4; c.height = 128; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    var tex = new THREE.CanvasTexture(c), col = night ? '#ffd98a' : '#fff0b8';
    var bm = function(op){ return new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }); };
    var beam = new THREE.Group();
    var outer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 11, 24, 1, true), bm(night ? .28 : .2)); outer.position.y = 5.5;
    var core = new THREE.Mesh(new THREE.CylinderGeometry(.32, .5, 11, 16, 1, true), bm(night ? .55 : .4)); core.position.y = 5.5;
    var pool = new THREE.Sprite(reef3dGlowMat(col, night ? .7 : .45)); pool.scale.set(4.2, 4.2, 1); pool.position.y = .3;
    beam.add(outer, core, pool); beam.visible = false;
    [outer, core, pool].forEach(function(m){ m.raycast = function(){}; });
    L.motes = [];
    for(var i = 0; i < 9; i++){ var s = new THREE.Sprite(reef3dGlowMat(col, 0)); s.scale.setScalar(.32); s.userData = { ph: i / 9, a: i * 2.4, r: .3 + (i % 3) * .3 }; beam.add(s); L.motes.push(s); }
    view.scene.add(beam); L.beam = beam; L.outer = outer; L.core = core;
    // orbiting lights, each with a comet tail (its last few positions, smaller and fainter)
    // (adding light shows at night; on bright sand by day they're painted warm gold so they still stand out)
    var oc = night ? '#8ff5df' : '#ffc53d', om = function(){ var m = reef3dGlowMat(oc, 0); if(!night) m.blending = THREE.NormalBlending; return m; };
    L.orbs = [0, 1, 2].map(function(k){
      var head = new THREE.Sprite(om()); head.scale.setScalar(night ? .55 : .85); view.scene.add(head);
      var tail = []; for(var j = 0; j < 12; j++){ var t = new THREE.Sprite(om()); t.scale.setScalar((night ? .42 : .62) * (1 - j / 13)); view.scene.add(t); tail.push(t); }
      return { head: head, tail: tail, hist: [], tilt: [.5, -.6, .15][k], spin: [2.1, -1.7, 2.6][k], ph: k * 2.1, r: [1.3, 1.5, 1.15][k] };
    });
  }
  function reef3dLifeFrame(view, now, t, dt, calm){
    var L = view.life; if(!L) return;
    // the beam stands wherever the floating star is
    var st = view.nextStar, on = !!(st && st.visible);
    L.beam.visible = on;
    if(on){
      var x = st.position.x, z = st.position.z; L.beam.position.set(x, view.groundY(x, z), z);
      var pulse = (calm ? 1 : .85 + .15 * Math.sin(t * 2.2)) * Math.max(.3, Math.min(1, (Math.hypot(view.cam.position.x - x, view.cam.position.z - z) - 6) / 10));   // softer up close, so it never blinds the view
      L.outer.material.opacity = (view.night ? .28 : .2) * pulse; L.core.material.opacity = (view.night ? .55 : .4) * pulse;
      L.outer.rotation.y = t * .3;
      L.motes.forEach(function(m){
        var u = calm ? m.userData.ph : (m.userData.ph + t * .12) % 1, a = m.userData.a + t * .8;
        m.position.set(Math.cos(a) * m.userData.r, .4 + u * 8, Math.sin(a) * m.userData.r);
        m.material.opacity = calm ? 0 : Math.sin(u * Math.PI) * .8;
      });
    }
    // the orbiting lights come in while the dice waits for a tap, and fade away when she sets off
    var want = !calm && view.dice && view.dice.rolling && !view.moving && !view.zoomNow ? 1 : 0;   // (the die spins until it's tapped)
    L.orb += (want - L.orb) * Math.min(1, dt * 3);
    var g = view.guide.position, cy = g.y + 1.25;
    L.orbs.forEach(function(o){
      var vis = L.orb > .01;
      o.head.visible = vis; o.tail.forEach(function(s){ s.visible = vis; });
      if(!vis){ o.hist.length = 0; return; }
      var a = o.ph + t * o.spin, px = Math.cos(a) * o.r, pz = Math.sin(a) * o.r, py = Math.sin(a) * o.tilt * o.r;
      var p = { x: g.x + px, y: cy + py + Math.sin(t * 1.3 + o.ph) * .15, z: g.z + pz };
      o.head.position.set(p.x, p.y, p.z); o.head.material.opacity = .95 * L.orb;
      o.hist.unshift(p); if(o.hist.length > 24) o.hist.length = 24;
      o.tail.forEach(function(s, j){ var h = o.hist[Math.min(o.hist.length - 1, j * 2 + 1)]; s.position.set(h.x, h.y, h.z); s.material.opacity = .7 * (1 - j / 12) * L.orb; });
    });
  }

  // A burst of confetti from where she stands: paper bits flutter as they fall. One instanced draw.
  function reef3dConfetti(view){
    if(reefCalm()) return;
    var THREE = window.THREE, N = 130, g = view.guide.position;
    var mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.26, .15), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }), N);
    mesh.frustumCulled = false; mesh.raycast = function(){};
    var cols = ['#ff7a6b', '#ffd25a', '#4fd1c5', '#ff9ed2', '#a98bff', '#7be07b', '#ffffff'].map(function(c){ return new THREE.Color(c); });
    var bits = [];
    for(var i = 0; i < N; i++){
      var a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.2;
      bits.push({ v: new THREE.Vector3(Math.cos(a) * sp * .6, 6 + Math.random() * 5, Math.sin(a) * sp * .6), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new THREE.Vector3(4 + Math.random() * 8, 3 + Math.random() * 6, 2 + Math.random() * 5), ph: Math.random() * 6 });
      mesh.setColorAt(i, cols[i % cols.length]);
    }
    if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    view.scene.add(mesh);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), y0 = g.y + 1.2;
    view.fx.push({ t0: performance.now(), dur: 3800,
      step: function(p){
        var tt = p * 3.8;
        bits.forEach(function(b, i){
          // up fast, then air drag takes over and they flutter down, swaying
          var up = b.v.y * (1 - Math.exp(-tt * 2.2)) / 2.2 - .35 * tt * tt - .55 * Math.max(0, tt - .6);   // paper falls slowly: drag wins over gravity
          pos.set(g.x + b.v.x * (1 - Math.exp(-tt * 1.5)) / 1.5 + Math.sin(tt * 3 + b.ph) * .35, y0 + up, g.z + b.v.z * (1 - Math.exp(-tt * 1.5)) / 1.5 + Math.cos(tt * 2.5 + b.ph) * .25);
          q.setFromEuler(new THREE.Euler(b.r.x + tt * b.w.x, b.r.y + tt * b.w.y, b.r.z + tt * b.w.z));
          sc.setScalar(up < -1 ? 0 : p > .82 ? 1 - (p - .82) / .18 : 1);
          m4.compose(pos, q, sc); mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
      end: function(){ view.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); } });
  }
  function reef3dCelebrate(view){ reef3dEmote(view, 'dance'); reef3dConfetti(view); }

  /* The camera's extra moves. Called after the usual follow camera is placed (not while pinching to the map). */
  function reef3dCamLife(view, now, t, calm){
    var THREE = window.THREE, cam = view.cam;
    // the swoop in: from high above and off to one side, easing down onto her
    var f = view.flyIn;
    if(f){
      if(f.t0 == null) f.t0 = now;   // from the first frame actually drawn (not under the opening transition)
      var p = Math.min(1, (now - f.t0) / f.dur), e = 1 - Math.pow(1 - p, 3);
      if(p >= 1 || calm){ view.flyIn = null; }
      else {
        var look = view.camLook, off = cam.position.clone().sub(look), d = off.length();
        var ang = (1 - e) * .9, h = (1 - e);
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).normalize();
        off.y += h * 2.2; off.normalize().multiplyScalar(d * (1 + h * 2.4));
        cam.position.copy(look).add(off); cam.lookAt(look);
        view.touchAt = now;
        return;
      }
    }
    // the slow breath when nobody is touching: a gentle sway that fades in, and out again at the first touch
    var still = !calm && !view.moving && !(view.dice && !view.dice.rolling) && !view.emote && !view.zoomNow && now - (view.touchAt || 0) > 5000;
    view.drift = (view.drift || 0) + ((still ? 1 : 0) - (view.drift || 0)) * .02;
    if(view.drift > .001){
      var k = view.drift;
      cam.position.x += Math.sin(t * .23) * .9 * k; cam.position.y += Math.sin(t * .17 + 1) * .35 * k; cam.position.z += Math.sin(t * .19 + 2) * .4 * k;
      cam.lookAt(view.camLook);
    }
  }
