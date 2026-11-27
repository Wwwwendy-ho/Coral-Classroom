/* The crafted Cove shares the board's route, hit targets, and static light bake. */
var ReefCraftedWorld = (function(){
  'use strict';
  var TAU = Math.PI * 2, CELL = 128, SIZE = 1024, FOG = '#79cce2';
  var glass = {
    jade: ['#53e2e5', '#3ca9df', '#af8de9', '#62eed2'],
    lilac: ['#80d2fb', '#9d87e6', '#d698e9', '#56dce3'],
    coral: ['#ffcea1', '#ec8dae', '#a9a3ed', '#ffb79e']
  };
  var stone = {
    ivory: ['#978cac', '#c1acca', '#e5cdd5', '#ffefd8', '#fff8e8'],
    mauve: ['#8a77b0', '#aa91cc', '#c3a3df', '#e6c9f5', '#ecd8fa']
  };
  function enabled(region, night){
    var search = (window.location && window.location.search) || '';
    return !region && !night && new URLSearchParams(search).get('art') !== 'classic';
  }
  function random(n){
    var x = Math.sin(n * 621.127 + 7.17) * 31214.823;
    return x - Math.floor(x);
  }
  function rounded(a){
    return Math.sign(a) * Math.pow(Math.abs(a), .76);
  }
  function textureGrain(g, dark, count, strength){
    for(var i = 0; i < count; i++){
      g.fillStyle = i % 3 ? dark : '#fff9eb';
      g.globalAlpha = strength * (.3 + random(i * 5 + 6) * .7);
      g.fillRect(random(i * 5 + 2) * CELL, random(i * 5 + 3) * CELL, i % 8 ? 1 : 2, i % 9 ? 1 : 2);
    }
    g.globalAlpha = 1;
  }
  function paintStone(g, mark){
    g.fillStyle = '#fffdf8';
    g.fillRect(0, 0, CELL, CELL);
    for(var i = 0; i < 10; i++){
      var x = random(i * 3 + 1) * CELL, y = random(i * 3 + 2) * CELL, r = 8 + random(i * 3 + 3) * 20;
      var vein = g.createRadialGradient(x, y, 0, x, y, r);
      vein.addColorStop(0, 'rgba(152,131,177,.13)');
      vein.addColorStop(1, 'rgba(144,133,155,0)');
      g.fillStyle = vein; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    textureGrain(g, '#94809e', 420, .14);
    if(mark) paintMark(g, mark, '#9e82b2', 2.5);
  }
  function paintMark(g, mark, ink, line){
    g.lineCap = 'round'; g.lineJoin = 'round';
    if(mark === 'wave'){
      for(var wave = 0; wave < 2; wave++){
        var y = 59 + wave * 14;
        g.beginPath(); g.moveTo(38, y + 2); g.bezierCurveTo(58, y - 16, 66, y + 12, 89, y - 3);
        g.lineWidth = line + 1.2; g.strokeStyle = '#fff9ee'; g.stroke();
        g.lineWidth = line; g.strokeStyle = ink; g.stroke();
      }
      return;
    }
    if(mark === 'shell'){
      g.lineWidth = line; g.strokeStyle = ink;
      g.beginPath(); g.moveTo(64, 86); g.bezierCurveTo(30, 77, 35, 45, 49, 47);
      g.quadraticCurveTo(51, 36, 60, 41); g.quadraticCurveTo(64, 32, 71, 41);
      g.quadraticCurveTo(80, 38, 83, 47); g.bezierCurveTo(97, 48, 101, 76, 64, 86); g.stroke();
      for(var fan = -2; fan <= 2; fan++){
        g.beginPath(); g.moveTo(64, 81); g.quadraticCurveTo(64 + fan * 6, 66, 64 + fan * 8, 47 + Math.abs(fan) * 6); g.stroke();
      }
      return;
    }
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = mark === '?' || mark === '!' || /[가-힣]/.test(mark) ? '800 53px system-ui, sans-serif'
      : '49px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(mark, 64, 66);
  }
  function paintGlass(g, palette, mark, done){
    var cols = glass[palette], origin = [64, 108];
    var corners = [[-33,100],[-24,57],[10,-15],[57,-28],[108,-20],[151,40],[163,91],[143,154],[-20,154]];
    function paneEdge(k, reverse){
      var p = corners[k];
      var tx = origin[0] + (p[0] - origin[0]) * .58 + (k - 4) * 2, ty = origin[1] + (p[1] - origin[1]) * .55 - 11;
      if(reverse) g.quadraticCurveTo(tx, ty, origin[0], origin[1]);
      else g.quadraticCurveTo(tx, ty, p[0], p[1]);
    }
    g.fillStyle = cols[1]; g.fillRect(0, 0, CELL, CELL);
    for(var i = 0; i < corners.length - 1; i++){
      var lobe = g.createLinearGradient(24, 12, 83, 110);
      lobe.addColorStop(0, cols[(i + 1) % cols.length]);
      lobe.addColorStop(.62, cols[i % cols.length]);
      lobe.addColorStop(1, cols[(i + 1) % cols.length]);
      g.fillStyle = lobe; g.strokeStyle = 'rgba(50,82,162,.58)'; g.lineWidth = 1.65;
      g.beginPath(); g.moveTo(origin[0], origin[1]); paneEdge(i, false);
      g.lineTo(corners[i + 1][0], corners[i + 1][1]); paneEdge(i + 1, true);
      g.closePath(); g.fill(); g.stroke();
    }
    var satin = g.createLinearGradient(25, 0, 78, 126);
    satin.addColorStop(0, 'rgba(239,255,252,.52)');
    satin.addColorStop(.24, 'rgba(246,255,251,.10)');
    satin.addColorStop(.39, 'rgba(247,255,253,.34)');
    satin.addColorStop(.46, 'rgba(231,247,255,.08)');
    satin.addColorStop(1, 'rgba(72,64,170,.31)');
    g.fillStyle = satin; g.fillRect(0, 0, CELL, CELL);
    var rim = g.createLinearGradient(22,45,99,29);
    rim.addColorStop(0,'rgba(228,255,250,.04)'); rim.addColorStop(.42,'rgba(255,255,246,.84)'); rim.addColorStop(1,'rgba(230,243,255,0)');
    g.strokeStyle = rim; g.lineWidth = 3;
    g.beginPath(); g.moveTo(21, 48); g.bezierCurveTo(37, 21, 74, 16, 96, 31); g.stroke();
    var glint = g.createRadialGradient(91,83,1,91,83,24);
    glint.addColorStop(0,'rgba(226,255,250,.57)'); glint.addColorStop(1,'rgba(232,255,251,0)');
    g.fillStyle = glint; g.fillRect(67,59,48,48);
    textureGrain(g, '#507bc0', 180, .12);
    if(mark) paintMark(g, mark, '#285a72', 2.3);
    if(done){ g.font = '800 25px system-ui, sans-serif'; g.fillStyle = '#fff6ce'; g.fillText('★', 95, 37); }
  }

  function createContext(T){
    var pages = [], slots = Object.create(null), profiles = Object.create(null), hitDiscs = {};
    function page(){
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      var g = canvas.getContext('2d'), map = new T.CanvasTexture(canvas);
      map.anisotropy = 2;
      var p = { g:g, map:map, material:new T.MeshBasicMaterial({ map:map, vertexColors:true }), count:0 };
      pages.push(p); return p;
    }
    function slot(key, painter){
      if(slots[key]) return slots[key];
      var p = pages[pages.length - 1];
      if(!p || p.count === (SIZE / CELL) * (SIZE / CELL)) p = page();
      var x = (p.count % (SIZE / CELL)) * CELL, y = Math.floor(p.count / (SIZE / CELL)) * CELL;
      p.count++; p.g.save(); p.g.translate(x,y);
      p.g.beginPath(); p.g.rect(0,0,CELL,CELL); p.g.clip();
      painter(p.g); p.g.restore(); p.map.needsUpdate = true;
      return (slots[key] = { page:p, x:x, y:y });
    }
    // Both profiles curve over the shoulder. The dark compressed rings at the
    // stone–glass join are the actual recess, as well as a colored seam.
    function profile(R, rings, atlas, seed){
      var n = 28, positions = [], uv = [], colors = [], idx = [];
      rings.forEach(function(row, j){
        var c = new T.Color(row[2]);
        for(var i = 0; i <= n; i++){
          var a = i * TAU / n, irregular = 1 + .016 * Math.sin(3 * a + seed) + .012 * Math.cos(5 * a + seed);
          var x = rounded(Math.cos(a)) * row[0] * irregular, z = rounded(Math.sin(a)) * row[0] * irregular;
          positions.push(x * R, row[1], z * R * .93);
          var shade = 1 - (.05 + .05 * Math.cos(a - .6)) * Math.min(1, row[0] * 1.2);
          colors.push(c.r * shade, c.g * shade, c.b * shade);
          uv.push((atlas.x + 4 + (x / 2.15 + .5) * (CELL - 8)) / SIZE,
            1 - (atlas.y + 4 + (z / 2.15 + .5) * (CELL - 8)) / SIZE);
          if(j && i){ var k = j * (n + 1) + i; idx.push(k - n - 2,k - 1,k - n - 1,k - n - 1,k - 1,k); }
        }
      });
      var geom = new T.BufferGeometry();
      geom.setAttribute('position', new T.Float32BufferAttribute(positions,3));
      geom.setAttribute('uv', new T.Float32BufferAttribute(uv,2));
      geom.setAttribute('color', new T.Float32BufferAttribute(colors,3));
      geom.setIndex(idx); geom.computeVertexNormals();
      return geom;
    }
    function tile(style, s, R, top, icon){
      var family = (s.i % 2 === 0 || style === 'classic') && s.kind !== 'chance' ? 'ivory' : 'mauve';
      var tones = stone[family], plain = s.kind === 'plain';
      var palette = /^(chance|story)$/.test(s.kind) ? 'coral' : s.i % 2 ? 'lilac' : 'jade';
      var mark = plain ? (s.i % 3 ? 'wave' : 'shell') : s.kind === 'start' ? 'shell' : icon;
      var done = s.kind === 'deck' && s.item.state === 'done';
      var wallSlot = slot('stone', function(g){ paintStone(g); });
      var faceSlot = slot([plain ? family : palette,mark,done].join('|'), function(g){
        if(plain) paintStone(g, mark); else paintGlass(g, palette, mark, done);
      });
      var seed = s.i % 6 * .97;
      var wallKey = [R,family,seed,plain].join('|');
      var wall = profiles[wallKey] || (profiles[wallKey] = profile(R, [
        [.91,-.19,tones[0]], [1.015,-.138,tones[0]], [1.052,-.053,tones[1]],
        [1.04,.18,tones[2]], [1.005,.274,tones[3]], [.955,.317,tones[4]],
        [plain ? .916 : .799,.327,tones[4]], [plain ? .912 : .766,.286,'#8576ad']
      ], wallSlot, seed));
      var bevel = plain ? tones[3] : '#afb0d9', center = plain ? tones[4] : '#ffffff';
      var cap = profile(R, [
        [plain ? .918 : .782,.303,bevel], [plain ? .911 : .764,.324,bevel],
        [plain ? .88 : .706,.341,center], [.51,.350,center], [0,.352,center]
      ], faceSlot, seed);
      var body = new T.Mesh(wall, wallSlot.page.material), face = new T.Mesh(cap, faceSlot.page.material);
      body.position.set(s.x,0,s.z); face.position.copy(body.position);
      var disc = hitDiscs[R] || (hitDiscs[R] = new T.CircleGeometry(R*.901,24).rotateX(-Math.PI/2));
      var hit = new T.Mesh(disc,wallSlot.page.material); hit.position.set(s.x,.352,s.z);
      return { parts:[body], face:face, hit:hit };
    }
    return { tile:tile };
  }

  function paintFloor(T, geometry, floorX, floorZ, distance){
    var p = geometry.attributes.position, rgb = new Float32Array(p.count * 3);
    var deep = new T.Color('#106b96'), channel = new T.Color('#198fb8'), bank = new T.Color('#3cc7cd');
    var light = new T.Color('#8be6d5'), sandbar = new T.Color('#e6dfb8'), color = new T.Color();
    var fog = new T.Color(FOG), halfW = geometry.parameters.width/2, halfL = geometry.parameters.height/2;
    var fadeWidth = Math.min(halfW, halfL)*.28;
    for(var i = 0; i < p.count; i++){
      var localX = p.getX(i), localY = p.getY(i), x = localX + floorX, z = floorZ - localY;
      var shore = 1 - distance(x,z);
      var wash = .5 + .5 * Math.sin(x*.37 + z*.24 + .7*Math.sin(z*.36 - x*.14));
      var caustic = Math.pow(wash,5) * (.55 + .45 * Math.cos(z*.39 - x*.23));
      var pool = .5 + .5 * Math.cos(x*.13 - z*.18 + Math.sin(x*.17)*.76);
      // Current-sculpted seabed sand-ripple crests + shallow reef-limestone strata contours (01-coral-cove terrain detail).
      var ripPhase = x * .92 + z * .68 + Math.sin(x * .22 - z * .28) * 1.35;
      var sandRipple = Math.pow(.5 + .5 * Math.sin(ripPhase), 1.8) - .42;
      var strataContour = Math.sin(Math.hypot(x * .42, z * .42) * 3.1 + Math.sin(x * .16 + z * .19) * 1.1);
      var strataBand = Math.max(0, strataContour) * .55;
      // Warm shallow turquoise sandbar rings in the mid-ground & deeper outer-channel contrast.
      var radial = Math.hypot(localX / Math.max(1, halfW), localY / Math.max(1, halfL));
      var ringWave = Math.sin(radial * 11.5 + Math.sin(x * .09 - z * .08) * 1.4);
      var sandRing = Math.max(0, ringWave) * Math.max(0, 1 - Math.abs(radial - .56) * 2.8) * (1 - shore);
      var outerDeep = Math.max(0, Math.min(1, (radial - .42) / .48)) * (1 - shore);
      color.copy(channel).lerp(deep, .58 * outerDeep * (1 - .45 * pool));
      color.lerp(bank, .22 + .42 * shore + .28 * pool * (1 - .35 * outerDeep) + .06 * strataBand * (1 - outerDeep * .5));
      color.lerp(sandbar, .34 * sandRing + .14 * shore * pool + Math.max(0, sandRipple) * (.13 * shore + .09 * sandRing));
      color.lerp(light, .22 * caustic + .08 * wash + Math.max(0, sandRipple) * .055);
      if(sandRipple < 0) color.lerp(deep, -sandRipple * (.14 * shore + .08));
      // Blend both the outer rectangle rim and far radial horizon smoothly into the sunlit horizon haze (zero tilted sea corner!).
      var edge = Math.min(halfW-Math.abs(localX),halfL-Math.abs(localY));
      var k = Math.max(0,Math.min(1,edge/fadeWidth));
      var radFade = Math.max(0,Math.min(1,(radial-.68)/.28));
      var fogMix = Math.max(1-k*k*(3-2*k), radFade*radFade*(3-2*radFade));
      color.lerp(fog,fogMix);
      var b = i * 3; rgb[b] = color.r; rgb[b+1] = color.g; rgb[b+2] = color.b;
    }
    geometry.setAttribute('color',new T.BufferAttribute(rgb,3));
  }

  function garden(o){
    var T = o.THREE, spaces = o.spaces, start = spaces[0], next = spaces[1];
    if(!next) return;
    var root = new T.Group();
    root.name = 'Crafted Cove stone gardens';
    o.statics.add(root);
    var painted = new T.MeshBasicMaterial({ vertexColors:true });
    var paintedDouble = new T.MeshBasicMaterial({ vertexColors:true, side:T.DoubleSide });
    var foamMat = new T.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:.66, side:T.DoubleSide, depthWrite:false });
    var sun = new T.Vector3(-.42,.79,.45).normalize();
    var sky = new T.Color('#d7f4ff'), snow = new T.Color('#fff9e8');
    var recess = new T.Color('#776bc2'), reflectedSea = new T.Color('#62becf');
    var coldGlass = new T.Color('#276ac4'), lilacGlass = new T.Color('#bc91f5'), lilacEdge = new T.Color('#7159bb');
    function mesh(g, mat, x, y, z, parent){
      var m = new T.Mesh(g, mat); m.position.set(x,y,z); parent.add(m); return m;
    }
    function tagSurface(m, kind, scale, seed){
      if(typeof window !== 'undefined' && typeof window.reef3dSurface === 'function'){
        window.reef3dSurface(m, kind, { scale: scale || 1.35, seed: seed || 0 });
      }
      return m;
    }
    // Keep the cool bounce in shaded ivory. Resolve the lighting onto the
    // ornament before merging so the game only interpolates vertex colors.
    function sculpt(g, pigment, reefForm){
      var rgb = [], n = g.attributes.normal, base = new T.Color(pigment), color = new T.Color();
      var shadow = reefForm ? base.clone().lerp(recess,.4).multiplyScalar(.52) : recess;
      var contrast = reefForm ? .72 : .36;
      for(var i = 0; i < n.count; i++){
        var hit = Math.max(0,sun.x*n.getX(i)+sun.y*n.getY(i)+sun.z*n.getZ(i));
        var shade = (1-hit) * (contrast-.10*n.getY(i));
        var bounce = Math.max(0,-n.getY(i)) * .13;
        color.copy(base).lerp(shadow,shade).lerp(reflectedSea,bounce).lerp(snow,.12*hit);
        rgb.push(color.r,color.g,color.b);
      }
      g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
      return g;
    }
    function panelGrid(uCount, vCount, fn, parent, flip, mat){
      var pts = [], rgb = [], ix = [];
      for(var v = 0; v <= vCount; v++) for(var u = 0; u <= uCount; u++){
        var p = fn(u / uCount, v / vCount);
        pts.push(p[0],p[1],p[2]); rgb.push(p[3].r,p[3].g,p[3].b);
        if(u && v){
          var d = v * (uCount + 1) + u, c = d - 1, b = d - uCount - 1, a = b - 1;
          if(flip) ix.push(a,b,c,b,d,c); else ix.push(a,c,b,b,c,d);
        }
      }
      var geom = new T.BufferGeometry();
      geom.setAttribute('position',new T.Float32BufferAttribute(pts,3));
      geom.setAttribute('color',new T.Float32BufferAttribute(rgb,3)); geom.setIndex(ix); geom.computeVertexNormals();
      return mesh(geom,mat || painted,0,0,0,parent);
    }
    function lathe(parent, points, color, x, y, z, sx, sz, cut){
      var profile = points.map(function(p){ return new T.Vector2(p[0],p[1]); });
      var m = mesh(sculpt(new T.LatheGeometry(profile,cut),color),painted,x,y,z,parent);
      m.scale.set(sx,1,sz);
      return m;
    }
    function tube(parent, pts, radius, color, segments){
      var curve = new T.CatmullRomCurve3(pts.map(function(p){ return new T.Vector3(p[0],p[1],p[2]); }));
      return mesh(sculpt(new T.TubeGeometry(curve,segments,radius,5),color),painted,0,0,0,parent);
    }
    var taken = o.taken || [];
    function clear(x,z,gap,propGap){
      return spaces.every(function(p){ return Math.hypot(x-p.x,z-p.z) >= gap; }) &&
        taken.every(function(p){ return Math.hypot(x-p[0],z-p[1]) >= propGap; });
    }
    var length = Math.hypot(next.x-start.x,next.z-start.z) || 1, fx = (next.x-start.x)/length, fz = (next.z-start.z)/length;
    var spots = [[5.45,6.4],[-5.45,6.4],[5.9,5],[-5.9,5],[6.3,8],[-6.3,8],[6.5,3.8],[-6.5,3.8]];
    var site = null;
    spots.some(function(p){
      var x = start.x - fz*p[0] + fx*p[1], z = start.z + fx*p[0] + fz*p[1];
      if(!clear(x,z,4.55,4.15)) return false;
      site = { x:x,z:z }; return true;
    });
    var ivory = '#ffeed7', trim = '#fff8e7', lavender = '#cfb6ee';
    function pavilion(){
      if(!site) return;
      var house = new T.Group(); house.name = 'Nautilus pavilion';
      house.position.set(site.x,o.groundY(site.x,site.z)-.07,site.z);
      house.rotation.y = Math.atan2(start.x-site.x,start.z-site.z) * .67;
      o.statics.add(house);
      lathe(house,[[0,0],[1,0],[1.04,.07],[1,.15],[.95,.19],[0,.19]],'#54c6cc',0,0,0,3.25,2.15,32);
      lathe(house,[[0,0],[1,0],[1.03,.06],[1,.18],[.96,.22],[0,.22]],lavender,0,.13,0,2.99,1.97,32);
      var floorMesh = lathe(house,[[0,0],[1,0],[1.02,.03],[1,.1],[.94,.14],[.76,.14],[.58,.14],[.38,.14],[.18,.14],[0,.14]],'#f0e2ce',0,.31,0,2.85,1.83,32);
      (function bakePillarAO(){
        var fp = floorMesh.geometry.attributes.position, fc = floorMesh.geometry.attributes.color;
        var contacts = [[-.41,.82]];
        [-2.12,-.97,.91,2.12].forEach(function(px){
          contacts.push([px,1.16-.17*px*px],[px,-.93+.12*px*px]);
        });
        var aoTone = new T.Color('#8f7ca8');
        for(var i=0;i<fp.count;i++){
          if(fp.getY(i) < .13) continue;
          var vx = fp.getX(i)*2.85, vz = fp.getZ(i)*1.83, minD = 9;
          for(var c=0;c<contacts.length;c++){
            var d = Math.hypot(vx-contacts[c][0], vz-contacts[c][1]);
            if(d < minD) minD = d;
          }
          if(minD < .64){
            var k = Math.pow(1 - minD/.64, 1.6);
            var r = fc.getX(i)*(1-.14*k) + aoTone.r*.14*k;
            var g = fc.getY(i)*(1-.14*k) + aoTone.g*.14*k;
            var b = fc.getZ(i)*(1-.14*k) + aoTone.b*.14*k;
            fc.setXYZ(i, r*(1-.14*k), g*(1-.14*k), b*(1-.14*k));
          }
        }
        fc.needsUpdate = true;
      })();
      for(var stair=0;stair<3;stair++){
        lathe(house,[[0,0],[1,0],[1.04,.05],[1,.1],[0,.1]],stair===1?lavender:ivory,-.35,stair*.115,1.58-stair*.23,1.35,.85-stair*.08,20);
      }
      var shaft = [[0,0],[.22,0],[.23,.07],[.15,.15],[.11,.23],[.105,1.28],[.16,1.41],[.24,1.48],[.23,1.55],[0,1.55]];
      [-2.12,-.97,.91,2.12].forEach(function(x){
        lathe(house,shaft,ivory,x,.42,1.16-.17*x*x,1,1,12);
        lathe(house,shaft,ivory,x,.42,-.93+.12*x*x,1,1,12);
      });
      [-1.48,1.46].forEach(function(x){
        lathe(house,[[0,0],[.022,0],[.022,.23],[0,.23]],'#cba470',x,1.69,.82,1,1,8);
        lathe(house,[[0,0],[.07,.025],[.127,.088],[.13,.168],[.087,.246],[.032,.268],[0,.268]],
          '#ffd098',x,1.46,.82,1,1,12);
      });
      // The portico has real open spans. Each cream border arches cleanly below the
      // roof fascia cornice so no trim sliver ever pokes through the dome glass panels.
      [[-2.12,-.97],[-.97,.91],[.91,2.12]].forEach(function(span){
        var a=span[0], b=span[1], dx=b-a;
        var pts=[[a,1.78,1.15-.17*a*a],[a+dx*.16,1.97,1.19-.17*a*a],
          [(a+b)/2,2.04,1.24-.17*Math.pow((a+b)/2,2)],[b-dx*.16,1.97,1.19-.17*b*b],[b,1.78,1.15-.17*b*b]];
        tube(house,pts,.115,lavender,16);
        tube(house,pts.map(function(p){ return [p[0],p[1]+.035,p[2]+.035]; }),.090,trim,16);
      });
      lathe(house,[[0,0],[1,0],[1.045,.085],[.99,.18],[0,.18]],ivory,0,1.96,-.04,2.49,1.43,32);
      var glaze = ['#56dce9','#b590f5','#4fcfea','#c69cf3','#75d9fb','#bf91ed','#51e5d7','#b68cf0'].map(function(c){ return new T.Color(c); });
      // Glazed rear alcoves still leave the portico open. Put the glass in
      // the back of the room so the pillars and stairs carry real parallax.
      var inner = new T.Color('#50e7e4');
      [-1.39,0,1.39].forEach(function(c,k){
        panelGrid(9,5,function(u,v){
          var x = u*2-1, head = Math.sqrt(Math.max(0,1-x*x));
          var y = .43+v*(.83+.54*head);
          var sweep = .42+.4*Math.cos(u*8-v*4+k);
          var tone = inner.clone().lerp(lilacGlass,sweep).lerp(coldGlass,.23*(1-v));
          tone.lerp(sky,.3*Math.pow(Math.max(0,Math.sin(u*4 + v*3)),8));
          return [c+x*.62,y,-.79+.16*Math.abs(c)+.08*x*x,tone];
        },house,true);
      });
      function dome(u,v){
        var a = TAU*u+v*.78, d = v*Math.PI*.5, r = Math.cos(d);
        return [Math.sin(a)*2.49*r-.4*v,2.11+Math.sin(d)*2.67,Math.cos(a)*1.49*r-.04];
      }
      glaze.forEach(function(color,k){
        var edge = k % 2 ? lilacEdge : coldGlass;
        panelGrid(5,10,function(u,v){
          var p = dome((k+u)/glaze.length,v);
          var sheen = .4*Math.exp(-Math.pow((v-.43-.12*u)*7,2)-Math.pow((u-.38)*2.1,2));
          var edges = .1 + .24 * Math.pow(Math.abs(u*2-1),3) + .13*Math.pow(1-v,2);
          p.push(color.clone().lerp(glaze[(k+1)%glaze.length],u*.16).lerp(edge,edges).lerp(sky,sheen)); return p;
        },house,true);
      });
      for(var rib=0;rib<8;rib++){
        var meridian=[];
        for(var j=0;j<=10;j++) meridian.push(dome(rib/8,j/10));
        tube(house,meridian,.057,trim,14);
      }
      [.31,.62].forEach(function(v){
        var band=[];
        for(var k=0;k<=32;k++) band.push(dome(k/32,v));
        tube(house,band,.067,ivory,32);
      });
      // One continuous sculpted nautilus curls over the glass roof. Raised
      // spiral flutes carry different pigment on their lit and shaded slopes.
      var cream = new T.Color('#ffeed7'), purple = new T.Color('#bf96eb'), shade = new T.Color('#8e75c7');
      var shell = panelGrid(56,24,function(u,v){
        var a = u*TAU, d = Math.PI*v, r = Math.sin(d), twist = a-1.35*Math.log(.25+r);
        var flute = Math.cos(twist*10), lobe = 1+.065*flute*r+.09*Math.sin(a+.4);
        var color = cream.clone().lerp(purple,.46+.44*flute);
        color.lerp(shade,.15*(1-Math.cos(d))+.12*Math.max(0,Math.cos(a-1.1)));
        color.lerp(snow,.22*Math.max(0,Math.sin(a+.3))*Math.max(0,Math.cos(d)));
        return [Math.cos(a)*r*lobe*1.57,Math.sin(a)*r*lobe*1.63,Math.cos(d)*.58+flute*r*.08,color];
      },house,false);
      shell.position.set(1.48,3.27,1.06); shell.rotation.set(.04,.36,-.32);
      var scroll=[];
      for(var step=0;step<=21;step++){
        var t=step/21,a=2.45+TAU*1.42*t,r=.76*Math.pow(1-t,1.36)+.017;
        scroll.push([r*Math.cos(a)*1.57,r*Math.sin(a)*1.63,.59*Math.sqrt(1-r*r)+.034]);
      }
      var lip=tube(house,scroll,.057,trim,36);
      lip.position.copy(shell.position); lip.rotation.copy(shell.rotation);
      var pearl = mesh(sculpt(new T.SphereGeometry(.23,14,10),'#ffe1b0'),painted,-.41,.76,.82,house);
      pearl.scale.y = 1.1;
      lathe(house,[[0,0],[.33,0],[.31,.07],[.22,.12],[.36,.18],[.32,.22],[0,.22]],lavender,-.41,.43,.82,1,1,14);
      return house;
    }
    var house = pavilion(), planted = [];
    var plants = ['#ff9c91','#b881ef','#59d9ed','#ffc775','#f094c4'];
    // Sculpted terraced coastal reef-limestone outcrops (SphereGeometry 18x12) with MP8 sunlit rim highlights & base AO.
    var rockShapes = ['#58bcc9','#73a4da','#b091df'].map(function(tone,k){
      var g = new T.SphereGeometry(1, 18, 12), p = g.attributes.position;
      for(var i=0;i<p.count;i++){
        var x=p.getX(i), y=p.getY(i), z=p.getZ(i), r=Math.hypot(x,z), a=Math.atan2(x,z);
        var h = (y + 1) * .5;
        var ny = -.14 + .90 * (h * (1.24 - .24 * h));
        var terrace = .045 * Math.sin(h * Math.PI * 5 + k * 1.1) * Math.sin(h * Math.PI);
        var ledge = .052 * Math.cos(a*3+k*1.4) + .038 * Math.sin(a*5-h*2.6+k) + .022 * Math.cos(a*7+h*4.2);
        var dimple = -.026 * Math.pow(Math.max(0, Math.sin(a*4+k) * Math.sin(h*Math.PI*2.2)), 2);
        var edge = (1 + ledge + terrace + dimple) * (1 + .05 * Math.sin(h*Math.PI));
        var tilt = (.05*x - .035*z) * r;
        p.setXYZ(i, x*edge + .045*ny*r, ny + tilt + terrace*.35, z*edge - .03*ny*r);
      }
      g.computeVertexNormals();
      var n = g.attributes.normal, rgb = [];
      var base = new T.Color(tone);
      var deepShadow = base.clone().lerp(recess, .46).multiplyScalar(.54);
      var rimLight = base.clone().lerp(snow, .54);
      var baseAo = new T.Color('#28647c'), col = new T.Color();
      for(var j=0;j<n.count;j++){
        var nx = n.getX(j), ny2 = n.getY(j), nz = n.getZ(j), py = p.getY(j);
        var hit = Math.max(0, sun.x*nx + sun.y*ny2 + sun.z*nz);
        var shade = (1 - hit) * (.68 - .14*ny2);
        var bounce = Math.max(0, -ny2) * .16;
        var shoulder = Math.pow(Math.max(0, ny2*.65 + hit*.55 - .25), 2.4) * .42;
        var strataBand = Math.max(0, Math.sin(py*15 + k*1.3)) * .08;
        col.copy(base).lerp(deepShadow, shade).lerp(reflectedSea, bounce);
        col.lerp(rimLight, Math.min(.52, shoulder + .14*hit + strataBand));
        if(py < .18){
          var kAo = Math.max(0, Math.min(1, (.18 - py) / .30));
          var m = 1 - .34 * kAo;
          col.setRGB(
            col.r*m + baseAo.r*.09*kAo,
            col.g*m + baseAo.g*.09*kAo,
            col.b*m + baseAo.b*.09*kAo
          );
        }
        rgb.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
      return g;
    });
    var greens = [new T.Color('#0e6d74'),new T.Color('#28a974'),new T.Color('#7bd865'),new T.Color('#e8f078')];
    var kelpVein = new T.Color('#147864');
    // Curved, layered 3D kelp ribbon tuft (3 arching ribbons with midrib camber, ruffled edges & rounded leaf tips).
    function kelp(parent,x,z,height,turn,seed){
      var tuft = new T.Group();
      tuft.position.set(x, .02, z);
      parent.add(tuft);
      var holdfast = new T.SphereGeometry(Math.min(.18, .08 + height*.045), 8, 5);
      holdfast.scale(1.25, .48, 1.15);
      mesh(sculpt(holdfast, '#147875', true), painted, 0, .03, 0, tuft);
      var specs = [
        [1.00, turn,        .34, seed,       0,    0],
        [.76,  turn + .92,  .44, seed + 2.1, .06,  .05],
        [.58,  turn - .88,  .48, seed + 4.3, -.06, .04]
      ];
      specs.forEach(function(sp){
        var h = height * sp[0], az = sp[1], lean = sp[2], ph = sp[3];
        var cs = Math.cos(az), sn = Math.sin(az);
        var wMax = Math.min(.20, Math.max(.085, h * .115));
        var ribbon = panelGrid(8, 12, function(u, v){
          var ang = u * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
          var swell = Math.sin(Math.pow(v, .68) * Math.PI);
          var tip = v > .86 ? Math.cos(((v - .86) / .14) * Math.PI * .5) : 1;
          var w = wMax * (.22 + .82 * swell) * tip;
          var midRidge = Math.exp(-ca * ca * 5.0);
          var th = wMax * (.19 + .16 * midRidge) * (1 - .42 * v) * tip;
          var ruffle = .085 * wMax * Math.sin(v * 11.5 + ph) * Math.sin(v * Math.PI) * ca;
          var cup = .20 * w * ca * ca;
          var cx = ca * w, cz = sa * th + cup + ruffle;
          var twist = .58 * Math.sin(v * 3.1 + ph) + .42 * v;
          var ct = Math.cos(twist), st = Math.sin(twist);
          var rx = cx * ct - cz * st, rz = cx * st + cz * ct;
          var spineX = h * (lean * Math.pow(v, 1.55) + .11 * Math.sin(v * 4.4 + ph) * v);
          var spineZ = h * (.13 * Math.sin(v * 3.8 + ph * 1.3) * v);
          var spineY = h * (v - .085 * v * v * v);
          var lx = spineX + rx, lz = spineZ + rz;
          var key = .5 + .5 * Math.cos(ang - twist - az - .75);
          var edgeRim = Math.pow(Math.abs(ca), 1.8) * (.30 + .55 * v) * (.45 + .55 * key);
          var tone = greens[0].clone()
            .lerp(greens[1], Math.min(1, .20 + .72 * Math.pow(v, .75) + .12 * key))
            .lerp(greens[2], Math.max(0, v - .22) * .78 * (.45 + .55 * key))
            .lerp(kelpVein, midRidge * .24 * (1 - .5 * v))
            .lerp(greens[3], Math.min(.62, edgeRim * .72 + Math.pow(v, 1.8) * key * .28));
          return [cs * lx - sn * lz, spineY, sn * lx + cs * lz, tone];
        }, tuft, false);
        ribbon.position.set(sp[4], 0, sp[5]);
      });
    }
    // Sculpted 4-arm branching staghorn coral with rounded sunlit polyp tips & coral surface grain.
    function coral(parent,x,z,height,seed,pigment){
      var grp = new T.Group();
      grp.position.set(x, .16, z);
      parent.add(grp);
      var tip = new T.Color(pigment), rootColor = tip.clone().lerp(recess, .40);
      var shadow = rootColor.clone().multiplyScalar(.60), rim = tip.clone().lerp(snow, .52);
      var foot = new T.SphereGeometry(Math.max(.09, height * .13), 8, 5);
      foot.scale(1.15, .55, 1.15);
      tagSurface(mesh(sculpt(foot, rootColor.getStyle(), true), painted, 0, .02, 0, grp), 'coral', .9, seed);
      for(var arm=0;arm<4;arm++){
        var theta = seed + arm * 1.68 + (arm ? .35 : 0);
        var spread = arm ? .28 + .09 * random(seed + arm) : .10;
        var h = height * (arm === 0 ? .94 : .54 + .20 * random(seed + arm + 5));
        var twig = panelGrid(8, 8, function(u, v){
          var a = u * TAU, stem = Math.min(1, v / .78), cap = Math.max(0, (v - .78) / .22) * Math.PI * .5;
          var bulb = 1 + .14 * Math.sin(Math.max(0, stem - .55) / .45 * Math.PI);
          var round = (.086 - .026 * stem + .018 * Math.sin(stem * Math.PI)) * bulb * Math.cos(cap);
          var flare = height * spread * stem * stem, baseHeight = arm ? height * .14 : 0;
          var nx = Math.cos(a) * Math.cos(cap), ny = Math.sin(cap), nz = Math.sin(a) * Math.cos(cap);
          var hit = Math.max(0, sun.x * nx + sun.y * ny + sun.z * nz);
          var tone = rootColor.clone()
            .lerp(tip, .24 + stem * .76)
            .lerp(shadow, (1 - hit) * .38 * (1 - .22 * stem))
            .lerp(rim, Math.min(.55, hit * (.26 + .32 * stem) + ny * .20));
          return [
            Math.cos(theta) * flare + Math.cos(a) * height * round,
            baseHeight + (h - baseHeight) * stem + height * .068 * Math.sin(cap),
            Math.sin(theta) * flare + Math.sin(a) * height * round,
            tone
          ];
        }, grp, false);
        tagSurface(twig, 'coral', .9, seed + arm);
      }
    }
    // Fully closed 5-petal sea-blossom chalice coral (r=0 poles + inner polyp cushion -> zero cyan pinhole!).
    function coralCup(parent,x,z,h,seed,pigment,yBase){
      var shape = [
        [0, 0], [.09, 0], [.13, .38], [.26, .69], [.46, .97],
        [.46, 1.02], [.39, .96], [.23, .73], [.09, .61], [0, .58]
      ];
      var g = new T.LatheGeometry(shape.map(function(pt){ return new T.Vector2(pt[0], pt[1] * h); }), 24);
      var p = g.attributes.position, rowLen = shape.length;
      var baseC = new T.Color(pigment);
      var deepThroat = baseC.clone().lerp(new T.Color('#3e286e'), .58);
      var shadowC = baseC.clone().lerp(recess, .44).multiplyScalar(.58);
      var rimHi = baseC.clone().lerp(snow, .64);
      var isInner = new Uint8Array(p.count), ringR0 = new Float32Array(p.count);
      for(var i=0;i<p.count;i++){
        var rIdx = i % rowLen;
        isInner[i] = rIdx >= 6 ? 1 : 0;
        ringR0[i] = shape[rIdx][0];
        var px=p.getX(i), py=p.getY(i), pz=p.getZ(i);
        var rad = Math.hypot(px, pz), v = Math.max(0, Math.min(1.05, py / h));
        var radK = Math.max(0, Math.min(1, (rad - .065) / .20));
        radK = radK * radK * (3 - 2 * radK);
        var a = rad > 1e-4 ? Math.atan2(px, pz) : 0;
        var petal = Math.cos(a * 5 + seed), flute = Math.cos(a * 10 + seed * 2) * .035;
        var edge = 1 + (petal * .17 + flute) * v * v * radK;
        p.setXYZ(i, px * edge + .09 * v * v, py + .075 * h * petal * v * v * radK, pz * edge - .065 * v);
      }
      g.computeVertexNormals();
      var n = g.attributes.normal, rgb = [], col = new T.Color();
      for(var j=0;j<p.count;j++){
        var rIdx2 = j % rowLen, r0 = ringR0[j], inner = isInner[j];
        var nx = n.getX(j), ny = n.getY(j), nz = n.getZ(j);
        var hit = Math.max(0, sun.x * nx + sun.y * ny + sun.z * nz);
        var py2 = p.getY(j) / h;
        var px2 = p.getX(j) - .09 * py2 * py2, pz2 = p.getZ(j) + .065 * py2;
        var fluteLit = .5 + .5 * Math.cos(Math.atan2(px2, pz2) * 5 + seed);
        if(inner){
          var depthK = Math.max(0, Math.min(1, (.32 - r0) / .32));
          col.copy(baseC).lerp(deepThroat, .35 + .52 * depthK).lerp(rimHi, (1 - depthK) * .28 * hit);
        } else {
          var shade = (1 - hit) * (.62 - .12 * ny);
          col.copy(baseC).lerp(shadowC, shade).lerp(reflectedSea, Math.max(0, -ny) * .14).lerp(snow, .14 * hit + .08 * fluteLit);
        }
        if(rIdx2 >= 4 && rIdx2 <= 6){
          var rimK = rIdx2 === 5 ? .54 : .28;
          col.lerp(rimHi, rimK * (.55 + .45 * hit));
        }
        rgb.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
      var grp = new T.Group();
      grp.position.set(x, yBase != null ? yBase : .16, z);
      grp.rotation.z = .12;
      parent.add(grp);
      tagSurface(mesh(g, painted, 0, 0, 0, grp), 'coral', .85, seed);
      // Warm golden-cream coral polyp stamen cluster nestled cleanly on the closed cup floor.
      var cy = .595 * h, cx0 = .09 * .58 * .58, cz0 = -.065 * .58;
      var budR = Math.max(.032, .056 * h);
      mesh(sculpt(new T.SphereGeometry(budR * 1.12, 8, 6), '#ffe094', false), painted, cx0, cy + budR * .5, cz0, grp);
      for(var b=0;b<5;b++){
        var ba = seed + b * (TAU / 5), br = budR * 1.42;
        mesh(sculpt(new T.SphereGeometry(budR * .76, 7, 5), b % 2 ? '#ffd0a4' : '#ffefc0', false), painted,
          cx0 + Math.cos(ba) * br, cy + budR * .28, cz0 + Math.sin(ba) * br, grp);
      }
    }
    // Sculpted MP8 lavender-amethyst coral cluster: carved brain mound + scalloped table-coral shelves + closed fluted tube chimneys.
    function lavenderCoralCluster(parent, x, y, z, scale, seed){
      var grp = new T.Group();
      grp.position.set(x, y, z);
      parent.add(grp);
      var lavBase = new T.Color('#b68be6'), lavDeep = new T.Color('#5f439b'), lavRim = new T.Color('#f4e6ff');
      var tubeMid = new T.Color('#c899f0'), tubeWell = new T.Color('#422b74');
      // 1. Carved meandering brain-coral mound with crisp sunlit ridge crests & violet crevices.
      var mg = new T.SphereGeometry(scale * .62, 18, 10, 0, TAU, 0, Math.PI * .60);
      var mp = mg.attributes.position, mrgb = [], mcol = new T.Color();
      for(var i=0;i<mp.count;i++){
        var mx = mp.getX(i), my = mp.getY(i), mz = mp.getZ(i);
        var inv = 1 / (scale * .62 || 1), nx0 = mx * inv, ny0 = my * inv, nz0 = mz * inv;
        var ridge = Math.sin(nx0 * 9.5 + Math.cos(nz0 * 7.5 + seed)) * Math.cos(nz0 * 9.5 - Math.sin(nx0 * 6.5));
        var d = 1 + .085 * ridge;
        mp.setXYZ(i, mx * d * 1.12, my * d * .76, mz * d * 1.04);
      }
      mg.computeVertexNormals();
      var mn = mg.attributes.normal;
      for(var j=0;j<mp.count;j++){
        var px = mp.getX(j), py = mp.getY(j), pz = mp.getZ(j);
        var inv2 = 1 / (scale * .62 || 1);
        var ridge2 = Math.sin((px / 1.12) * inv2 * 9.5 + Math.cos((pz / 1.04) * inv2 * 7.5 + seed)) *
          Math.cos((pz / 1.04) * inv2 * 9.5 - Math.sin((px / 1.12) * inv2 * 6.5));
        var hit = Math.max(0, sun.x * mn.getX(j) + sun.y * mn.getY(j) + sun.z * mn.getZ(j));
        mcol.copy(lavBase).lerp(lavDeep, Math.max(0, -ridge2) * .68 + (1 - hit) * .32);
        mcol.lerp(lavRim, Math.min(.62, Math.max(0, ridge2) * .42 * (.4 + .6 * hit) + Math.pow(hit, 2.2) * .28));
        if(py < scale * .08) mcol.multiplyScalar(.82);
        mrgb.push(mcol.r, mcol.g, mcol.b);
      }
      mg.setAttribute('color', new T.Float32BufferAttribute(mrgb, 3));
      tagSurface(mesh(mg, painted, 0, .02, 0, grp), 'coral', 1.05, seed);
      // 2. Three tiered scalloped lavender table-coral shelf plates with ruffled sunlit rims.
      var plateShape = [
        [0, -.02], [.22, .00], [.46, .10], [.50, .15], [.43, .18], [.20, .14], [0, .12]
      ];
      var shelves = [
        [-.32, .16, .24, .74, .18, -.10, seed + 1.1],
        [.26,  .28, .18, .64, -.14, .12, seed + 2.7],
        [-.06, .38, -.18, .54, .10, .16, seed + 4.3]
      ];
      shelves.forEach(function(sh, si){
        var ps = scale * sh[3];
        var pg = new T.LatheGeometry(plateShape.map(function(pt){ return new T.Vector2(pt[0] * ps, pt[1] * ps); }), 22);
        var pp = pg.attributes.position, pLen = plateShape.length;
        for(var k=0;k<pp.count;k++){
          var vx = pp.getX(k), vy = pp.getY(k), vz = pp.getZ(k), rad = Math.hypot(vx, vz);
          var rk = Math.max(0, Math.min(1, (rad - ps * .09) / (ps * .24)));
          rk = rk * rk * (3 - 2 * rk);
          var ang = rad > 1e-4 ? Math.atan2(vx, vz) : 0;
          var sc = 1 + (.15 * Math.cos(ang * 7 + sh[6]) + .05 * Math.sin(ang * 11 - sh[6])) * rk;
          var waveY = .045 * ps * Math.cos(ang * 7 + sh[6]) * rk;
          pp.setXYZ(k, vx * sc, vy + waveY, vz * sc);
        }
        pg.computeVertexNormals();
        var pn = pg.attributes.normal, prgb = [], pcol = new T.Color();
        var plateCol = si === 1 ? new T.Color('#d29ef2') : lavBase;
        for(var m=0;m<pp.count;m++){
          var rIdx = m % pLen;
          var hit2 = Math.max(0, sun.x * pn.getX(m) + sun.y * pn.getY(m) + sun.z * pn.getZ(m));
          pcol.copy(plateCol).lerp(lavDeep, (1 - hit2) * .45 + (rIdx <= 1 ? .32 : 0));
          if(rIdx >= 2 && rIdx <= 4) pcol.lerp(lavRim, (rIdx === 3 ? .64 : .34) * (.55 + .45 * hit2));
          else if(rIdx >= 5) pcol.lerp(lavRim, .18 * hit2);
          prgb.push(pcol.r, pcol.g, pcol.b);
        }
        pg.setAttribute('color', new T.Float32BufferAttribute(prgb, 3));
        var pm = mesh(pg, painted, sh[0] * scale, sh[1] * scale, sh[2] * scale, grp);
        pm.rotation.set(sh[4], sh[6], sh[5]);
        tagSurface(pm, 'coral', .85, seed + si + 3);
      });
      // 3. Four closed fluted amethyst tube-coral chimneys with deep throats & crisp sunlit lips.
      var tubeShape = [
        [0, 0], [.09, 0], [.11, .42], [.142, .95], [.128, 1.00], [.095, .96], [.05, .65], [0, .62]
      ];
      var chimneys = [
        [.32,  .06, -.26, .66, -.12, .14],
        [.46,  .04, -.04, .52,  .10, .18],
        [.16,  .10, -.38, .58, -.16, -.08],
        [.36,  .04,  .14, .42,  .16, .10]
      ];
      chimneys.forEach(function(ch, ci){
        var chH = scale * ch[3], chR = scale * (.92 + .14 * (ci % 2));
        var tg = new T.LatheGeometry(tubeShape.map(function(pt){ return new T.Vector2(pt[0] * chR, pt[1] * chH); }), 14);
        var tp = tg.attributes.position, tLen = tubeShape.length;
        for(var k=0;k<tp.count;k++){
          var vx = tp.getX(k), vy = tp.getY(k), vz = tp.getZ(k), rad = Math.hypot(vx, vz);
          var rk = Math.max(0, Math.min(1, (rad - chR * .04) / (chR * .07)));
          var ang = rad > 1e-4 ? Math.atan2(vx, vz) : 0;
          var fl = 1 + .08 * Math.cos(ang * 8 + seed + ci) * rk;
          tp.setXYZ(k, vx * fl, vy, vz * fl);
        }
        tg.computeVertexNormals();
        var tn = tg.attributes.normal, trgb = [], tcol = new T.Color();
        for(var m=0;m<tp.count;m++){
          var rIdx = m % tLen;
          var hit3 = Math.max(0, sun.x * tn.getX(m) + sun.y * tn.getY(m) + sun.z * tn.getZ(m));
          if(rIdx >= 6){
            tcol.copy(tubeMid).lerp(tubeWell, .55 + .35 * (rIdx - 6));
          } else {
            tcol.copy(tubeMid).lerp(lavDeep, (1 - hit3) * .48).lerp(lavRim, .14 * hit3);
            if(rIdx >= 3 && rIdx <= 5) tcol.lerp(lavRim, (rIdx === 4 ? .68 : .36) * (.55 + .45 * hit3));
          }
          trgb.push(tcol.r, tcol.g, tcol.b);
        }
        tg.setAttribute('color', new T.Float32BufferAttribute(trgb, 3));
        var tm = mesh(tg, painted, ch[0] * scale, ch[1] * scale, ch[2] * scale, grp);
        tm.rotation.set(ch[4], seed + ci, ch[5]);
        tagSurface(tm, 'coral', .80, seed + ci + 9);
      });
    }
    var placed = site ? [[site.x, site.z, 5.5]] : [];
    function findStartBandSpot(candidates, rad, siteGap, minD, maxD){
      minD = minD || 5.4; maxD = maxD || 14.0;
      for(var ci=0;ci<candidates.length;ci++){
        var p = candidates[ci], d = Math.hypot(p[0], p[1]);
        if(d < minD || d > maxD) continue;
        var x = start.x - fz*p[0] + fx*p[1], z = start.z + fx*p[0] + fz*p[1];
        if(!clear(x, z, 4.6, 4.0)) continue;
        if(site && Math.hypot(x-site.x, z-site.z) < siteGap) continue;
        if(placed.some(function(q, qi){ return (qi > 0 || !site) && Math.hypot(x-q[0], z-q[1]) < q[2]+rad; })) continue;
        placed.push([x, z, rad]);
        return { x:x, z:z, y:o.groundY(x, z) };
      }
      return null;
    }
    var heroIsletSpot = findStartBandSpot([[-4.8,-1.6],[-5.2,-1.0],[-5.4,-1.8],[-5.6,-1.2],[-6.0,-1.4]], 2.5, 5.2);
    var heroShrineSpot = findStartBandSpot([[7.6,4.2],[8.2,2.4],[6.8,6.2],[8.8,1.4],[5.8,7.6],[8.6,5.2],[7.2,7.0],[9.2,3.4]], 2.3, 4.9);
    var heroBoatSpot = findStartBandSpot([[11.8,8.2],[11.4,9.0],[12.4,7.8],[10.8,9.6],[12.8,8.4],[10.2,10.2],[13.0,7.2],[12.2,6.4]], 1.8, 6.2, 5.4, 17.5);
    if(!heroBoatSpot) heroBoatSpot = findStartBandSpot([[12.6,7.4],[11.6,9.4],[13.2,8.4]], 1.4, 5.4, 5.0, 18.5);
    var skirtSand = new T.Color('#e8d7b2'), skirtTurq = new T.Color('#47c4c6'), skirtDeep = new T.Color('#2d9eb0'), skirtAo = new T.Color('#7ca89d');
    function bed(x,z,seed,size,far){
      if(!clear(x,z,2.37+size,1.95+size) || (site && Math.hypot(x-site.x,z-site.z)<3.65+size)) return;
      if(placed.some(function(p){ return Math.hypot(p[0]-x,p[1]-z)<p[2]+size*.85; })) return;
      if(planted.some(function(p){ return Math.hypot(p[0]-x,p[1]-z)<2.1; })) return;
      planted.push([x,z]);
      var y=o.groundY(x,z), cluster=new T.Group();
      cluster.position.set(x,Math.max(y-.09,.015),z); root.add(cluster);
      var skirt = panelGrid(36,5,function(u,v){
        var a = u*TAU;
        var lobe = 1 + .11*Math.cos(a*3+seed) + .06*Math.sin(a*5-seed*1.3);
        var rad = size*(.32 + v*1.42)*lobe;
        var sy = (1 - v*v)*.145;
        var col = v < .35 ? skirtAo.clone().lerp(skirtSand, v/.35)
          : v < .72 ? skirtSand.clone().lerp(skirtTurq, (v-.35)/.37)
          : skirtTurq.clone().lerp(skirtDeep, (v-.72)/.28);
        return [Math.cos(a)*rad, sy, Math.sin(a)*rad, col];
      },cluster,true);
      skirt.userData.reefGround = true;
      // Sculpted terraced reef limestone bases (k=0,1) + hero sculpted lavender coral cluster replacing untextured lavender blobs.
      var rock0 = mesh(rockShapes[0], painted, -.54*size, .02, .16*size, cluster);
      rock0.scale.set(size*(.58+random(seed)*.22), size*(.28+random(seed+4)*.16), size*.62);
      rock0.rotation.y = seed;
      tagSurface(rock0, 'stone', 1.25, seed);
      var rock1 = mesh(rockShapes[1], painted, .04*size, .03, -.04*size, cluster);
      rock1.scale.set(size*(.56+random(seed+1)*.22), size*(.30+random(seed+5)*.18), size*.60);
      rock1.rotation.y = seed + 1.1;
      tagSurface(rock1, 'stone', 1.25, seed + 1);
      if(!far){
        lavenderCoralCluster(cluster, .62*size, .05, .02*size, size*.62, seed);
      } else {
        var rock2 = mesh(rockShapes[2], painted, .58*size, .02, -.12*size, cluster);
        rock2.scale.set(size*.52, size*.26, size*.54); rock2.rotation.y = seed + 2.2;
        tagSurface(rock2, 'coral', 1.2, seed + 2);
      }
      // Lush layered 3D kelp tufts placed strictly on rear framing arcs (-Z) so zero blades slice through foreground corals.
      var kelpSpots = far
        ? [[-.52, -.38, -2.2], [.50, -.44, .7]]
        : [[-.32, -.52, -.45], [.42, -.56, .62]];
      kelpSpots.forEach(function(ks, kp){
        var jx = (random(seed + kp * 7 + 20) - .5) * .14;
        var jz = (random(seed + kp * 7 + 25) - .5) * .10;
        var h = size * (.88 + random(seed + kp + 90) * .52) * (far ? 1.18 : 1);
        kelp(cluster, (ks[0] + jx) * size, (ks[1] + jz) * size, h, ks[2] + (random(seed + kp) - .5) * .45, seed * .7 + kp * 1.9);
      });
      if(!far){
        var coralPal = plants[(seed + (seed % 2 ? 0 : 1)) % plants.length];
        var cupPal = plants[(seed + 3) % plants.length];
        if(seed === 43){ coralPal = '#ff9c91'; cupPal = '#b881ef'; }
        coral(cluster, .16*size, .36*size, size*(.86+random(seed)*.42), seed, coralPal);
        var cup = size*(.56+.24*random(seed+13));
        coralCup(cluster, -.56*size, .22*size, cup, seed, cupPal, .19*size);
        // Foreground sandy shelf accent: sculpted tropical starfish + smooth tidepool pebbles.
        var sfBase = new T.Color(seed % 2 ? '#ff8b70' : '#ffbf5e'), sfTip = sfBase.clone().lerp(snow, .36), sfCol = new T.Color();
        var sfR = .22 * size;
        var sf = panelGrid(15, 3, function(u, v){
          var a = u * TAU, arm = Math.pow(.5 + .5 * Math.cos(5 * a), 1.65);
          var rad = v * sfR * (.36 + .64 * arm);
          var yy = (1 - v * v) * sfR * .26 * (.72 + .28 * arm) + .018;
          sfCol.copy(sfBase).lerp(sfTip, v * .58 * arm);
          return [Math.cos(a) * rad, yy, Math.sin(a) * rad, sfCol];
        }, cluster, true);
        sf.position.set(-.24 * size, .095, .66 * size);
        sf.rotation.y = seed * 1.3;
        tagSurface(sf, 'coral', .65, seed + 17);
        for(var pb=0;pb<2;pb++){
          var pg = new T.SphereGeometry(1, 10, 7);
          pg.scale(size*(.13 - pb*.025), size*(.068 - pb*.012), size*(.11 - pb*.02));
          var pm = mesh(sculpt(pg, pb ? '#e8cfa6' : '#8fd2d8', true), painted, (.44 + pb*.24)*size, .088, (.58 - pb*.14)*size, cluster);
          pm.rotation.y = seed + pb * 1.4;
          tagSurface(pm, 'stone', .8, seed + pb + 21);
        }
      }
    }
    [[-4.1,1.9],[5.85,-2.25],[-7.7,7.3]].forEach(function(c,k){
      bed(start.x-fz*c[0]+fx*c[1],start.z+fx*c[0]+fz*c[1],27+k*6,1.15+k*.12,k===2);
    });
    [[5.15,1.05,35,1.15],[1.2,10.65,36,1.52],[8.25,-3.75,43,1.35]].forEach(function(c){
      bed(start.x-fz*c[0]+fx*c[1],start.z+fx*c[0]+fz*c[1],c[2],c[3],false);
    });
    // Leave open sand and water between small gardens. The far planting is
    // built from the same silhouette at lower contrast and lower resolution.
    for(var i=1;i<o.mainN;i+=3){
      var s=spaces[i], t=spaces[(i+1)%o.mainN], dx=t.x-s.x, dz=t.z-s.z, d=Math.hypot(dx,dz)||1;
      for(var side=-1;side<=1;side+=2){
        var width=4.55+random(i+side)*1.7, mag=.91+random(i*7+side)*.62;
        bed(s.x-dz/d*width*side,s.z+dx/d*width*side,i+side+3,mag,false);
        if(i%2) bed(s.x-dz/d*(width+5.2)*side,s.z+dx/d*(width+5.2)*side,i+side+22,mag*1.7,true);
      }
    }

    // Outer Reef Rim, Atoll Islets & Mid-ground Storytelling Landmarks.
    // All attach to outerRoot (merged into static batches, zero extra draw calls).
    var outerRoot = new T.Group();
    outerRoot.name = 'Crafted Cove outer reef';
    outerRoot.userData.noFootprint = true;
    o.statics.add(outerRoot);

    var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    spaces.forEach(function(sp){
      if(sp.x < minX) minX = sp.x; if(sp.x > maxX) maxX = sp.x;
      if(sp.z < minZ) minZ = sp.z; if(sp.z > maxZ) maxZ = sp.z;
    });
    var cx = (minX + maxX) * .5, cz = (minZ + maxZ) * .5;
    var rx = Math.max(8, (maxX - minX) * .5), rz = Math.max(8, (maxZ - minZ) * .5);
    function outerClear(x, z, spaceGap, propGap, rad){
      if(!clear(x, z, spaceGap, propGap)) return false;
      if(planted.some(function(p){ return Math.hypot(p[0] - x, p[1] - z) < 2.8 + rad; })) return false;
      return placed.every(function(p){ return Math.hypot(p[0] - x, p[1] - z) >= p[2] + rad; });
    }
    function findOuterSpot(angle, minOut, maxOut, rad, spaceGap, propGap){
      for(var step = 0; step < 6; step++){
        var out = minOut + (maxOut - minOut) * (step / 5);
        var x = cx + Math.cos(angle) * (rx + out), z = cz + Math.sin(angle) * (rz + out);
        if(outerClear(x, z, spaceGap || 8.0, propGap || 5.8, rad)){
          placed.push([x, z, rad]);
          return { x:x, z:z, y:o.groundY(x, z) };
        }
      }
      return null;
    }

    function sculptStrata(radius, height, seed, topTone, midTone, baseTone){
      var pts = [[0,-.35],[1,-.35],[1.06,.08],[.96,.34],[.84,.48],[.82,.72],[.62,.94],[.26,1.02],[0,1.02]]
        .map(function(p){ return new T.Vector2(p[0]*radius, p[1]*height); });
      var g = new T.LatheGeometry(pts, 32), p = g.attributes.position;
      for(var i = 0; i < p.count; i++){
        var px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(px, pz);
        var h01 = Math.max(0, Math.min(1, py / height));
        var crag = 1 + .11 * Math.cos(a * 3 + seed) + .055 * Math.sin(a * 5 - h01 * 3 + seed * 1.7);
        p.setXYZ(i, px * crag + .14 * Math.sin(seed) * h01, py, pz * crag + .14 * Math.cos(seed) * h01);
      }
      g.computeVertexNormals();
      var n = g.attributes.normal, rgb = [];
      var cTop = new T.Color(topTone), cMid = new T.Color(midTone), cBase = new T.Color(baseTone), col = new T.Color();
      for(var j = 0; j < n.count; j++){
        var h = Math.max(0, Math.min(1, p.getY(j) / height));
        var hit = Math.max(0, sun.x * n.getX(j) + sun.y * n.getY(j) + sun.z * n.getZ(j));
        col.copy(cBase).lerp(cMid, Math.min(1, h * 1.6)).lerp(cTop, Math.max(0, (h - .45) * 1.8));
        col.lerp(recess, (1 - hit) * .28).lerp(snow, hit * .14);
        rgb.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
      return g;
    }

    function reefCliff(spot, radius, height, seed){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .18, spot.z); outerRoot.add(grp);
      mesh(sculptStrata(radius, height, seed, '#f6e7cb', '#68c3cf', '#5674b8'), painted, 0, 0, 0, grp);
      var sub = mesh(sculptStrata(radius * .68, height * .62, seed + 2.3, '#f2dfc2', '#7aa9db', '#506cb0'),
        painted, Math.cos(seed) * radius * .72, -.05, Math.sin(seed) * radius * .72, grp);
      sub.rotation.y = seed;
    }

    // Sculpted 5-petal tropical Hibiscus blossom (cupped ruffled petals + velvet throat + projecting golden stamen).
    function hibiscusBlossom(parent, x, y, z, r, tiltX, rotY, tiltZ, petalHex, throatHex){
      var grp = new T.Group();
      grp.position.set(x, y, z);
      grp.rotation.order = 'YXZ';
      grp.rotation.set(tiltX, rotY, tiltZ);
      parent.add(grp);
      // Small green calyx cup anchoring flower cleanly to stem.
      lathe(grp, [[0,-.06*r],[.12*r,-.04*r],[.24*r,.06*r],[.18*r,.13*r],[0,.09*r]], '#2b8c50', 0, -.04*r, 0, 1, 1, 8);
      var cPetal = new T.Color(petalHex), cThroat = new T.Color(throatHex);
      var cRim = cPetal.clone().lerp(snow, .44), cCol = new T.Color();
      for(var k = 0; k < 5; k++){
        var pa = k * (TAU / 5), cs = Math.cos(pa), sn = Math.sin(pa);
        var zLift = k * .009 * r;
        panelGrid(4, 5, function(u, v){
          var ac = (u - .5) * 2;
          var w = r * (.13 + .58 * Math.sin(Math.pow(v, .62) * Math.PI * .90));
          var ruffle = 1 + .075 * Math.sin(u * Math.PI * 3) * v * v;
          var rad = r * (.07 + .95 * v) * ruffle;
          var py = r * (.34 * Math.sin(v * Math.PI * .78) - .10 * v * v + .055 * Math.cos(ac * Math.PI * .5) * v) + zLift;
          var lx = rad, lz = ac * w;
          var vein = .055 * Math.cos(ac * Math.PI * 4) * v;
          if(v < .30){
            cCol.copy(cThroat).lerp(cPetal, v / .30);
          } else {
            cCol.copy(cPetal).lerp(cRim, Math.max(0, (v - .64) / .36) * .72 + Math.max(0, vein));
          }
          cCol.lerp(cThroat, Math.max(0, -vein) * .45);
          return [cs * lx - sn * lz, py, sn * lx + cs * lz, cCol];
        }, grp, true, paintedDouble);
      }
      // Slender projecting hibiscus stamen column tipped with sunlit golden pollen anthers & crimson stigma.
      lathe(grp, [[0,0],[.065*r,0],[.045*r,.48*r],[.036*r,.82*r],[0,.85*r]], '#ffd37a', 0, .02*r, 0, 1, 1, 7);
      for(var a = 0; a < 4; a++){
        var aa = a * (TAU / 4) + .4;
        mesh(sculpt(new T.SphereGeometry(.078 * r, 7, 5), '#fff08c', false), painted,
          Math.cos(aa) * .085 * r, (.60 + (a % 2) * .12) * r, Math.sin(aa) * .085 * r, grp);
      }
      mesh(sculpt(new T.SphereGeometry(.088 * r, 8, 6), '#ff3b72', false), painted, 0, .88 * r, 0, grp);
    }

    // Arched serrated tropical fern frond (raised sunlit rachis + 7 paired plump V-notched pinnae + apex).
    function fernFrond(parent, origin, az, pitch, fLen, fWid, baseHex, tipHex, seed){
      var p = [], c = [], idx = [];
      function pushV(vx, vy, vz, col){ var id = p.length / 3; p.push(vx, vy, vz); c.push(col.r, col.g, col.b); return id; }
      function fY(t){ return fLen * (Math.sin(t * Math.PI * .82) * .28 - t * t * .26); }
      function fZ(t){ return fLen * t; }
      var cBase = new T.Color(baseHex), cTip = new T.Color(tipHex), cDark = cBase.clone().multiplyScalar(.74);
      var cRib = cTip.clone().lerp(snow, .26), col = new T.Color();
      var segs = 7;
      for(var i = 0; i <= segs; i++){
        var t = i / segs, rz = fZ(t), ry = fY(t), sw = fLen * .034 * (1 - t * .66), rh = fLen * .024 * (1 - t * .5);
        col.copy(cBase).lerp(cTip, t * .75);
        pushV(-sw, ry - .007 * fLen, rz, col);
        pushV(0, ry + rh, rz, col.clone().lerp(cRib, .58));
        pushV(sw, ry - .007 * fLen, rz, col);
      }
      for(var si = 0; si < segs; si++){
        var a0 = si * 3, b0 = a0 + 3;
        idx.push(a0, a0 + 1, b0 + 1, a0, b0 + 1, b0);
        idx.push(a0 + 1, a0 + 2, b0 + 2, a0 + 1, b0 + 2, b0 + 1);
      }
      var pairs = 7;
      for(var li = 0; li < pairs; li++){
        var lt = .12 + li * .118, z0 = fZ(lt), y0 = fY(lt), sw0 = fLen * .030 * (1 - lt * .66);
        var env = Math.sin(Math.pow(lt, .54) * Math.PI);
        var len = fWid * (.28 + .88 * env), bw = fLen * (.096 - .026 * lt);
        var outF = .92 - .24 * lt, fwdF = .38 + .32 * lt;
        var alt = li % 2 ? .06 : -.05;
        for(var s = 0; s < 2; s++){
          var sd = s ? 1 : -1;
          var bx = sd * sw0 * .55;
          var x1 = sd * (sw0 * .45 + len * .54 * outF), z1 = z0 + len * .54 * fwdF, y1 = y0 + .026 * fLen - len * .03;
          var x2 = sd * (sw0 * .35 + len * outF), z2 = z0 + len * (fwdF + .10), y2 = y0 - .012 * fLen - len * .14;
          var cB = cBase.clone().lerp(cTip, lt * .42 + Math.max(0, alt));
          var cM = cBase.clone().lerp(cTip, .38 + lt * .52).lerp(snow, Math.max(0, .14 + alt));
          var cT = cDark.clone().lerp(cTip, .30 + lt * .35);
          var bBack = pushV(bx, y0 - .009 * fLen, z0 - bw * .48, cB);
          var bMid  = pushV(bx, y0 + .016 * fLen, z0 + bw * .02, cM);
          var bFront= pushV(bx, y0 - .009 * fLen, z0 + bw * .50, cB);
          var mBack = pushV(x1, y1 - .012 * fLen, z1 - bw * .38, cB);
          var mMid  = pushV(x1, y1 + .018 * fLen, z1,           cM);
          var mFront= pushV(x1, y1 - .012 * fLen, z1 + bw * .40, cB);
          var tip   = pushV(x2, y2,               z2,           cT);
          if(sd > 0){
            idx.push(bBack, bMid, mMid, bBack, mMid, mBack);
            idx.push(bMid, bFront, mFront, bMid, mFront, mMid);
            idx.push(mBack, mMid, tip, mMid, mFront, tip);
          } else {
            idx.push(bBack, mMid, bMid, bBack, mBack, mMid);
            idx.push(bMid, mFront, bFront, bMid, mMid, mFront);
            idx.push(mBack, tip, mMid, mMid, tip, mFront);
          }
        }
      }
      var zEnd = fZ(.93), yEnd = fY(.93);
      var ap0 = pushV(-fLen * .048, yEnd, zEnd - .02 * fLen, cTip);
      var ap1 = pushV(0, yEnd + .016 * fLen, zEnd, cRib);
      var ap2 = pushV(fLen * .048, yEnd, zEnd - .02 * fLen, cTip);
      var apT = pushV(0, yEnd - .03 * fLen, zEnd + .15 * fLen, cTip.clone().lerp(snow, .18));
      idx.push(ap0, ap1, apT, ap1, ap2, apT);
      var geom = new T.BufferGeometry();
      geom.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geom.setAttribute('color', new T.Float32BufferAttribute(c, 3));
      geom.setIndex(idx); geom.computeVertexNormals();
      var fm = mesh(geom, paintedDouble, origin[0], origin[1], origin[2], parent);
      fm.rotation.order = 'YXZ';
      fm.rotation.y = az;
      fm.rotation.x = pitch;
      fm.rotation.z = (random(seed + 19) - .5) * .10;
      return fm;
    }

    // M5: Sculpted tropical fern rosette + 5-petal hibiscus blossom cluster + smooth coastal pebbles (zero sphere-blob mounds).
    function coastalShrub(parent, x, y, z, scale, seed){
      var grp = new T.Group();
      grp.position.set(x, y, z);
      parent.add(grp);
      // 1. Grounded smooth coastal river-worn pebbles framing the sandy rosette base.
      var pebSpecs = [
        [ .44, .34, .22, .088, .17, seed + .5, '#dfd3be'],
        [-.42, .38, .18, .074, .15, seed + 2.1, '#9fc4c9'],
        [ .16, .52, .16, .066, .13, seed + 3.8, '#cfc3b6']
      ];
      pebSpecs.forEach(function(ps, pi){
        var pg = new T.SphereGeometry(1, 12, 8);
        pg.scale(scale * ps[2], scale * ps[3], scale * ps[4]);
        var pm = mesh(sculpt(pg, ps[6], true), painted, scale * ps[0], scale * ps[3] * .28, scale * ps[1], grp);
        pm.rotation.y = ps[5];
        tagSurface(pm, 'stone', .85, seed + pi * 5);
      });
      // 2. Compact grounded basal rosette core anchoring all fern petioles & flower stems.
      var coreG = new T.SphereGeometry(scale * .14, 10, 7);
      coreG.scale(1.22, .50, 1.18);
      mesh(sculpt(coreG, '#1b6d4a', true), painted, 0, scale * .045, 0, grp);
      // 3. 2-tier radiating lush serrated tropical fern fronds (7 wide outer arching + 5 perkier inner fronds).
      var outerGreens = [['#1d7c52','#5fd26a'], ['#248d58','#76de70'], ['#19724d','#52c566']];
      for(var f = 0; f < 7; f++){
        var fa = seed + f * (TAU / 7) + (f % 2) * .12;
        var fl = scale * (.74 + .12 * random(seed + f * 3));
        var pal = outerGreens[f % outerGreens.length];
        fernFrond(grp, [Math.cos(fa) * scale * .04, scale * .075, Math.sin(fa) * scale * .04],
          fa, -.10 - (f % 2) * .06, fl, fl * .46, pal[0], pal[1], seed + f);
      }
      for(var u = 0; u < 5; u++){
        var ua = seed + .42 + u * (TAU / 5);
        var ul = scale * (.52 + .08 * random(seed + u + 17));
        fernFrond(grp, [Math.cos(ua) * scale * .03, scale * .11, Math.sin(ua) * scale * .03],
          ua, -.40 - (u % 2) * .08, ul, ul * .46, '#29985c', '#98eb74', seed + u + 20);
      }
      // 4. Sculpted 5-petal tropical Hibiscus blossoms on curved stems + spiral coral bud.
      var b1x = scale * .10, b1y = scale * .37, b1z = scale * .14;
      tube(grp, [[0, scale * .05, 0], [b1x * .55, b1y * .56, b1z * .55], [b1x, b1y - scale * .03, b1z]], scale * .024, '#29894f', 6);
      hibiscusBlossom(grp, b1x, b1y, b1z, scale * .25, .34, .42, -.16, '#ff4e84', '#b01850');
      var b2x = -scale * .19, b2y = scale * .30, b2z = scale * .06;
      tube(grp, [[0, scale * .05, 0], [b2x * .55, b2y * .56, b2z * .55], [b2x, b2y - scale * .03, b2z]], scale * .021, '#29894f', 6);
      hibiscusBlossom(grp, b2x, b2y, b2z, scale * .20, .30, -.68, .24, '#ff7d56', '#c42c44');
      var budX = scale * .08, budY = scale * .26, budZ = -scale * .17;
      tube(grp, [[0, scale * .05, 0], [budX * .6, budY * .6, budZ * .6], [budX, budY, budZ]], scale * .018, '#2d9355', 5);
      var bud = lathe(grp, [[0,0],[.055*scale,.02*scale],[.080*scale,.09*scale],[.052*scale,.17*scale],[0,.21*scale]], '#ff648e', budX, budY, budZ, 1, 1, 9);
      bud.rotation.set(-.32, seed, .22);
    }

    // M5: Curved multi-segment feathery pinnate palm frond matching 11-beach's pinnate palm craft
    // (raised sunlit arched rachis + 8 paired lush drooping V-creased serrated leaflets with crisp open V-notches + forked apex).
    function pinnatePalmFrond(parent, origin, az, pitch, roll, fLen, baseHex, seed){
      var p = [], c = [], idx = [];
      function pushV(vx, vy, vz, col){ var id = p.length / 3; p.push(vx, vy, vz); c.push(col.r, col.g, col.b); return id; }
      function frondY(t){ return fLen * (Math.sin(t * Math.PI * .78) * .254 - t * t * .458); }
      function frondZ(t){ return fLen * t; }
      var cLeaf = new T.Color(baseHex);
      var cMid = cLeaf.clone().lerp(new T.Color('#a4e668'), .30);
      var cRib = new T.Color('#b4e66a').lerp(new T.Color('#e2f480'), .42);
      var cTip = cLeaf.clone().lerp(new T.Color('#186240'), .34);
      var cEdge = cLeaf.clone().multiplyScalar(.92);
      var col = new T.Color();
      // 1. Arched central rachis spine (8 segments, bright sunlit raised midrib ridge).
      var segs = 8;
      for(var i = 0; i <= segs; i++){
        var t = i / segs, rz = frondZ(t), ry = frondY(t);
        var sw = fLen * .028 * (1 - t * .66), rh = fLen * .022 * (1 - t * .46);
        col.copy(cLeaf).lerp(cMid, .35 + .35 * t);
        var ribC = cRib.clone().lerp(snow, .12 * t);
        pushV(-sw, ry - .006 * fLen, rz, col);
        pushV(0,   ry + rh,          rz, ribC);
        pushV(sw,  ry - .006 * fLen, rz, col);
      }
      for(var si = 0; si < segs; si++){
        var a0 = si * 3, b0 = a0 + 3;
        idx.push(a0, a0 + 1, b0 + 1, a0, b0 + 1, b0);
        idx.push(a0 + 1, a0 + 2, b0 + 2, a0 + 1, b0 + 2, b0 + 1);
      }
      // 2. 8 paired lush feathery serrated V-creased leaflets separated by crisp open V-notches.
      var pairs = 8;
      for(var li = 0; li < pairs; li++){
        var lt = .12 + li * .106, z0 = frondZ(lt), y0 = frondY(lt), sw0 = fLen * .028 * (1 - lt * .66);
        var env = Math.sin(Math.pow(lt, .66) * Math.PI);
        var len = fLen * (.088 + .315 * env), bw = fLen * (.068 - .015 * lt);
        var outFrac = .94 - .24 * lt, fwdFrac = .44 + .36 * lt;
        var toneVar = li % 2 ? 1.05 : .93;
        for(var s = 0; s < 2; s++){
          var sd = s ? 1 : -1;
          var bx = sd * sw0 * .62;
          var x1 = sd * (sw0 * .52 + len * .54 * outFrac), z1 = z0 + len * .54 * fwdFrac, y1 = y0 + .016 * fLen - len * .075;
          var x2 = sd * (sw0 * .46 + len * outFrac),       z2 = z0 + len * (fwdFrac + .08), y2 = y0 - .022 * fLen - len * (.23 + .11 * lt);
          var cB = cEdge.clone().multiplyScalar(toneVar);
          var cBR = cMid.clone().multiplyScalar(Math.min(1.08, toneVar * 1.02));
          var cMR = cMid.clone().lerp(cRib, .24).multiplyScalar(Math.min(1.10, toneVar * 1.03));
          var cT = cTip.clone().multiplyScalar(toneVar);
          var bBack  = pushV(bx, y0 - .007 * fLen, z0 - bw * .48, cB);
          var bMid   = pushV(bx, y0 + .011 * fLen, z0 + bw * .02, cBR);
          var bFront = pushV(bx, y0 - .007 * fLen, z0 + bw * .50, cB);
          var mBack  = pushV(x1, y1 - .012 * fLen, z1 - bw * .36, cB);
          var mMid   = pushV(x1, y1 + .014 * fLen, z1,            cMR);
          var mFront = pushV(x1, y1 - .012 * fLen, z1 + bw * .38, cB);
          var tip    = pushV(x2, y2,               z2,            cT);
          if(sd > 0){
            idx.push(bBack, bMid, mMid, bBack, mMid, mBack);
            idx.push(bMid, bFront, mFront, bMid, mFront, mMid);
            idx.push(mBack, mMid, tip, mMid, mFront, tip);
          } else {
            idx.push(bBack, mMid, bMid, bBack, mBack, mMid);
            idx.push(bMid, mFront, bFront, bMid, mMid, mFront);
            idx.push(mBack, tip, mMid, mMid, tip, mFront);
          }
        }
      }
      // 3. Feathered forked terminal leaflets at the frond apex.
      var zEnd = frondZ(.94), yEnd = frondY(.94);
      [-1, 1].forEach(function(sd){
        var a0 = pushV(0, yEnd + .007 * fLen, zEnd - .020 * fLen, cRib);
        var a1 = pushV(sd * .032 * fLen, yEnd - .006 * fLen, zEnd + .028 * fLen, cMid);
        var a2 = pushV(sd * .108 * fLen, yEnd - .072 * fLen, zEnd + .150 * fLen, cTip);
        if(sd > 0) idx.push(a0, a1, a2); else idx.push(a0, a2, a1);
      });
      var geom = new T.BufferGeometry();
      geom.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geom.setAttribute('color', new T.Float32BufferAttribute(c, 3));
      geom.setIndex(idx); geom.computeVertexNormals();
      var fm = mesh(geom, paintedDouble, origin.x, origin.y, origin.z, parent);
      fm.rotation.order = 'YXZ';
      fm.rotation.y = az;
      fm.rotation.x = pitch;
      fm.rotation.z = roll;
      return fm;
    }

    function palmTree(parent, x, y, z, height, lean, dir, seed){
      var dx = Math.cos(dir), dz = Math.sin(dir);
      // Warm grounded sand/root collar at trunk base.
      lathe(parent, [[0,0],[.27,0],[.23,.055],[.16,.11],[0,.11]], '#e7cfa0', x, y - .05, z, 1, 1, 12);
      var pts = [];
      for(var i = 0; i <= 5; i++){
        var t = i / 5;
        pts.push(new T.Vector3(x + dx * lean * t * t, y - .04 + (height + .04) * t, z + dz * lean * t * t));
      }
      var curve = new T.CatmullRomCurve3(pts);
      var segsT = 14, radSegs = 9;
      var trunkG = new T.TubeGeometry(curve, segsT, .145, radSegs, false), tp = trunkG.attributes.position;
      for(var q = 0; q < tp.count; q++){
        var along = Math.floor(q / (radSegs + 1)) / segsT, ctr = curve.getPointAt(along);
        var ring = 1 + .045 * Math.sin(along * Math.PI * 14);
        var taper = (1 - .46 * along) * ring;
        tp.setXYZ(q, ctr.x + (tp.getX(q) - ctr.x) * taper, ctr.y + (tp.getY(q) - ctr.y) * taper, ctr.z + (tp.getZ(q) - ctr.z) * taper);
      }
      trunkG.computeVertexNormals();
      var tn = trunkG.attributes.normal, tc = [];
      var barkA = new T.Color('#8c613c'), barkB = new T.Color('#cb9e70'), barkSh = new T.Color('#5a3d2a'), tmp = new T.Color();
      for(var q2 = 0; q2 < tp.count; q2++){
        var along2 = Math.floor(q2 / (radSegs + 1)) / segsT;
        var hit = Math.max(0, sun.x * tn.getX(q2) + sun.y * tn.getY(q2) + sun.z * tn.getZ(q2));
        var band = .5 + .5 * Math.sin(along2 * Math.PI * 14);
        tmp.copy(barkA).lerp(barkB, .20 + .48 * along2 + .24 * band);
        tmp.lerp(barkSh, (1 - hit) * .42).lerp(snow, hit * .10);
        tc.push(tmp.r, tmp.g, tmp.b);
      }
      trunkG.setAttribute('color', new T.Float32BufferAttribute(tc, 3));
      tagSurface(mesh(trunkG, painted, 0, 0, 0, parent), 'timber', 1.1, seed);
      var top = pts[pts.length - 1];
      // Sculpted emerald crownshaft + 3 plump warm-brown coconuts nestled beneath the frond crown.
      var sheath = new T.SphereGeometry(.125, 10, 7); sheath.scale(1.05, .86, 1.05);
      mesh(sculpt(sheath, '#4c8e55', true), painted, top.x, top.y - .01, top.z, parent);
      for(var c = 0; c < 3; c++){
        var ca = seed + c * 2.094 + .35;
        var nutG = new T.SphereGeometry(.102, 12, 8); nutG.scale(1.04, .93, 1.04);
        mesh(sculpt(nutG, c === 1 ? '#8c5933' : '#744626', true), painted,
          top.x + Math.cos(ca) * .125, top.y - .105, top.z + Math.sin(ca) * .125, parent);
      }
      // 2-tier crown of 9 curved feathery pinnate fronds (6 full outer arching + 3 perkier sunlit upper fronds).
      var outerCols = ['#2f9458', '#42ab60', '#54be67', '#298651', '#4db664', '#399f5c'];
      var outerN = 6;
      for(var f = 0; f < outerN; f++){
        var fa = seed + f * (TAU / outerN) + (f % 2) * .14;
        var fLen = height * (.64 + .07 * random(seed + f));
        pinnatePalmFrond(parent, { x: top.x, y: top.y - .015, z: top.z }, fa, .04 + (f % 2) * .065,
          (random(seed + f + 7) - .5) * .09, fLen, outerCols[f % outerCols.length], seed + f);
      }
      var innerCols = ['#59c268', '#68ce6f', '#4eb862'];
      for(var u = 0; u < 3; u++){
        var ua = seed + .52 + u * (TAU / 3);
        var uLen = height * (.46 + .05 * random(seed + u + 13));
        pinnatePalmFrond(parent, { x: top.x, y: top.y + .065, z: top.z }, ua, -.25 - (u % 2) * .06,
          (random(seed + u + 23) - .5) * .08, uLen, innerCols[u % innerCols.length], seed + u + 13);
      }
    }

    function atollIslet(spot, radius, height, seed, opts){
      opts = opts || {};
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .16, spot.z); outerRoot.add(grp);
      var waterLocalY = -grp.position.y;
      // Shallow turquoise sandbar shelf, soft pearl-to-turquoise surf collar, and warm sunlit sand mound.
      var shelfG = new T.LatheGeometry([new T.Vector2(0,0), new T.Vector2(radius*1.28,.04), new T.Vector2(radius*1.1,.18), new T.Vector2(0,.22)], 36);
      mesh(sculpt(shelfG, '#56d1ce', true), painted, 0, -.02, 0, grp);
      var foamInner = new T.Color('#d8f6f2'), foamMid = new T.Color('#9ee8e4'), foamEdge = new T.Color('#56d1ce');
      panelGrid(48, 4, function(u, v){
        var a = u * TAU;
        var scallop = 1 + .028 * Math.sin(a * 3 + seed) + .018 * Math.cos(a * 5 - seed * 1.2);
        var rBand = radius * (1.02 + .36 * v) * scallop;
        var yBand = waterLocalY + .065 - .030 * v;
        var col = v < .4 ? foamInner.clone().lerp(foamMid, v / .4) : foamMid.clone().lerp(foamEdge, (v - .4) / .6);
        return [Math.cos(a) * rBand, yBand, Math.sin(a) * rBand, col];
      }, grp, true);
      mesh(sculptStrata(radius * .88, height, seed, '#f7e6bf', '#efd4a3', '#6fd7cf'), painted, 0, .06, 0, grp);
      var pH1 = opts.palmH1 || (3.0 + random(seed) * .95);
      var pH2 = opts.palmH2 || (2.25 + random(seed + 4) * .7);
      var pLean1 = opts.lean !== undefined ? opts.lean : .78;
      var pLean2 = opts.lean !== undefined ? opts.lean : .64;
      var pDir1 = opts.awayDir !== undefined ? opts.awayDir - .56 : seed;
      var pDir2 = opts.awayDir !== undefined ? opts.awayDir + .54 : seed + 2.3;
      palmTree(grp, -radius * .20, height * .86, radius * .06, pH1, pLean1, pDir1, seed);
      palmTree(grp, radius * .24, height * .82, -radius * .16, pH2, pLean2, pDir2, seed + 3);
      coastalShrub(grp, radius * .36, height * .89, radius * .24, .84, seed + 1.1);
      coastalShrub(grp, -radius * .34, height * .87, -radius * .22, .68, seed + 4.4);
      var bIdx = Math.floor(seed) % rockShapes.length;
      if(bIdx === 2){
        lavenderCoralCluster(grp, radius * .62, .12, radius * .38, .66, seed);
      } else {
        var b = mesh(rockShapes[bIdx], painted, radius * .62, .12, radius * .38, grp);
        b.scale.set(.68, .38, .58); b.rotation.y = seed;
        tagSurface(b, 'stone', 1.2, seed);
      }
    }

    function seaStack(spot, radius, height, seed){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .2, spot.z); outerRoot.add(grp);
      var pts = [[0,-.3],[1.15,-.3],[1.08,.12],[.72,.38],[.54,.68],[.66,.88],[.42,1.02],[0,1.0]]
        .map(function(p){ return new T.Vector2(p[0]*radius, p[1]*height); });
      var g = new T.LatheGeometry(pts, 20), p = g.attributes.position;
      for(var i = 0; i < p.count; i++){
        var px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(px, pz);
        var wobble = 1 + .16 * Math.sin(a * 3 + seed) + .08 * Math.cos(a * 5 + py);
        p.setXYZ(i, px * wobble + .22 * (py / height), py, pz * wobble);
      }
      g.computeVertexNormals();
      mesh(sculpt(g, '#e9d8c4', true), painted, 0, 0, 0, grp);
      coastalShrub(grp, .18, height * .94, 0, .55, seed + 2);
    }

    function horizonArch(spot, span, height, rotY, seed){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .18, spot.z); grp.rotation.y = rotY; outerRoot.add(grp);
      var half = span * .5;
      var curve = new T.CatmullRomCurve3([
        new T.Vector3(-half, -.2, 0), new T.Vector3(-half * .82, height * .48, .12),
        new T.Vector3(-half * .42, height * .90, .06), new T.Vector3(0, height, -.05),
        new T.Vector3(half * .45, height * .86, -.08), new T.Vector3(half * .84, height * .44, .05),
        new T.Vector3(half, -.2, 0)
      ]);
      var g = new T.TubeGeometry(curve, 22, .62, 7, false), p = g.attributes.position, n = g.attributes.normal, rgb = [];
      var cFoot = new T.Color('#5bc2cd'), cMid = new T.Color('#d2b4e8'), cTop = new T.Color('#f6e5cb'), col = new T.Color();
      for(var i = 0; i < p.count; i++){
        var along = Math.floor(i / 8) / 22, around = (i % 8) / 7 * TAU;
        var rough = .12 * Math.sin(along * 18 + seed) + .08 * Math.cos(around * 3 + along * 9);
        p.setXYZ(i, p.getX(i) + n.getX(i) * rough, p.getY(i) + n.getY(i) * rough, p.getZ(i) + n.getZ(i) * rough);
        var archH = Math.sin(along * Math.PI);
        col.copy(cFoot).lerp(cMid, archH).lerp(cTop, Math.max(0, archH - .35) * 1.4);
        var hit = Math.max(0, sun.x * n.getX(i) + sun.y * n.getY(i) + sun.z * n.getZ(i));
        col.lerp(recess, (1 - hit) * .25);
        rgb.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.computeVertexNormals();
      mesh(g, painted, 0, 0, 0, grp);
      [-1, 1].forEach(function(sd, idx){
        mesh(sculptStrata(1.25, 1.35, seed + idx * 3, '#f2dfc5', '#76bed1', '#5473b8'), painted, sd * half, 0, 0, grp);
      });
    }

    function coveJetty(spot, rotY){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y, spot.z); grp.rotation.y = rotY; outerRoot.add(grp);
      var postG = new T.CylinderGeometry(.11, .13, 1.35, 6);
      var plankG = new T.BoxGeometry(1.75, .09, .34);
      var woodTones = ['#b48a60', '#c79f75', '#96704b'];
      for(var p = 0; p < 3; p++){
        var pz = -1.6 + p * 1.6;
        [-.74, .74].forEach(function(px, side){
          var post = mesh(sculpt(postG.clone(), '#876444', true), painted, px, .38 + (p === 2 ? .08 : 0), pz, grp);
          post.rotation.z = (side ? -1 : 1) * .03;
          // Mooring bollard cap & rope coil on the seaward post.
          if(p === 2 && side === 1){
            var coil = mesh(sculpt(new T.TorusGeometry(.21, .045, 6, 12), '#e8d2a6'), painted, px - .28, .89, pz - .15, grp);
            coil.rotation.x = Math.PI * .5;
          }
        });
      }
      for(var k = 0; k < 10; k++){
        var plank = mesh(sculpt(plankG.clone(), woodTones[k % woodTones.length], true), painted, 0, .82, -1.8 + k * .4, grp);
        plank.rotation.y = (random(k + 5) - .5) * .04;
      }
      // Coastal pier lantern at the end.
      lathe(grp, [[0,0],[.09,0],[.07,.95],[.14,1.0],[0,1.0]], '#6d5239', -.68, .86, 1.75, 1, 1, 6);
      mesh(sculpt(new T.SphereGeometry(.16, 8, 6), '#ffe498'), painted, -.68, 1.98, 1.75, grp);
      lathe(grp, [[0,0],[.22,0],[.12,.14],[0,.18]], '#525e78', -.68, 2.08, 1.75, 1, 1, 6);
    }

    function mooredSailboat(spot, rotY){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y + .05, spot.z); grp.rotation.y = rotY; outerRoot.add(grp);
      var hullRed = new T.Color('#e8685c'), hullCream = new T.Color('#fff5df'), keelTone = new T.Color('#47628a');
      function hullBeam(v){ return .92 * Math.pow(Math.max(0, Math.sin(v * Math.PI)), .62); }
      function hullSheer(v){ return .52 * (.75 + .25 * Math.abs(v - .5)); }
      // Smooth sculpted closed boat hull resting cleanly in the water.
      [false, true].forEach(function(flip){
        panelGrid(16, 12, function(u, v){
          var z = (v - .5) * 3.8, beam = hullBeam(v) * (flip ? .94 : 1);
          var a = u * Math.PI, x = Math.cos(a) * beam, y = (.52 - Math.sin(a) * .56) * (.75 + .25 * Math.abs(v - .5)) + (flip ? .03 : 0);
          var col = Math.sin(a) < .35 ? hullCream.clone() : hullRed.clone().lerp(keelTone, Math.max(0, Math.sin(a) - .65) * 1.4);
          return [x, y, z, col];
        }, grp, flip);
      });
      // Hull-conforming cambered toy-wood planked deck (zero protruding rectangle corners).
      var teakLight = new T.Color('#dfba86'), teakWarm = new T.Color('#c89862'), teakSeam = new T.Color('#9c6e42');
      panelGrid(14, 18, function(u, v){
        var vv = .02 + v * .96, z = (vv - .5) * 3.8, across = (u - .5) * 2;
        var x = across * hullBeam(vv) * .935;
        var y = hullSheer(vv) - .020 + .028 * Math.cos(across * Math.PI * .5);
        var plankPos = u * 7, seam = Math.max(0, 1 - Math.min(plankPos % 1, 1 - (plankPos % 1)) * 9);
        var tone = (Math.floor(plankPos) % 2 === 0 ? teakLight : teakWarm).clone();
        tone.lerp(teakSeam, seam * .45 + Math.pow(Math.abs(across), 3) * .22);
        return [x, y, z, tone];
      }, grp, false);
      // Sculpted mahogany gunwale cap rails hugging port & starboard sheerlines + bowsprit spar.
      [-1, 1].forEach(function(sd){
        var railPts = [];
        for(var ri = 0; ri <= 14; ri++){
          var rv = .02 + (ri / 14) * .96;
          railPts.push([sd * hullBeam(rv) * .955, hullSheer(rv) + .022, (rv - .5) * 3.8]);
        }
        tube(grp, railPts, .042, '#8f5c39', 16);
      });
      tube(grp, [[0, .44, -1.48], [0, .50, -1.88], [0, .56, -2.26]], .034, '#b58556', 6);
      // Foredeck skylight hatch & coiled mooring rope.
      mesh(sculpt(new T.BoxGeometry(.36, .06, .34), '#8f5c39', true), painted, 0, .44, -.76, grp);
      mesh(sculpt(new T.BoxGeometry(.41, .035, .39), '#cfa06b', true), painted, 0, .48, -.76, grp);
      var rope = mesh(sculpt(new T.TorusGeometry(.13, .032, 8, 18), '#f2dfb6'), painted, .22, .45, -1.16, grp);
      rope.rotation.x = Math.PI * .5;
      // Charming toy-wood cabin / coachhouse aft of mast with brass portholes & cambered teak coachroof.
      mesh(sculpt(new T.BoxGeometry(.82, .08, 1.08), '#8f5c39', true), painted, 0, .42, .56, grp);
      mesh(sculpt(new T.BoxGeometry(.76, .26, 1.02), '#fff6e2', true), painted, 0, .57, .56, grp);
      mesh(sculpt(new T.BoxGeometry(.84, .05, 1.12), '#9c6a42', true), painted, 0, .71, .56, grp);
      var roofTop = new T.Color('#d9a86e'), roofEdge = new T.Color('#ad7847');
      panelGrid(8, 8, function(u, v){
        var across = (u - .5) * 2, rx = across * .43, rz = .56 + (v - .5) * 1.12;
        var ry = .735 + .055 * Math.cos(across * Math.PI * .5) * (1 - .14 * Math.pow((v - .5) * 2, 2));
        return [rx, ry, rz, roofTop.clone().lerp(roofEdge, Math.abs(across) * .45)];
      }, grp, false);
      [-1, 1].forEach(function(sd){
        [.32, .80].forEach(function(pz){
          var pr = mesh(sculpt(new T.TorusGeometry(.066, .016, 8, 16), '#e5be5c'), painted, sd * .384, .58, pz, grp);
          pr.rotation.y = Math.PI * .5;
          var gl = mesh(sculpt(new T.CylinderGeometry(.058, .058, .02, 14), '#3b82a6'), painted, sd * .380, .58, pz, grp);
          gl.rotation.z = Math.PI * .5;
        });
      });
      // Aft teak helm bench.
      mesh(sculpt(new T.BoxGeometry(.68, .06, .22), '#b88652', true), painted, 0, .46, 1.32, grp);
      // Turned mast collar, tapered wooden mast, crosstree spreader, boom, finial & rigging stays.
      lathe(grp, [[0,0],[.15,0],[.14,.06],[.10,.14],[.07,.18],[0,.18]], '#8f5c39', 0, .39, -.15, 1, 1, 12);
      lathe(grp, [[0,0],[.064,0],[.050,1.65],[.034,3.30],[0,3.36]], '#b88a5a', 0, .42, -.15, 1, 1, 10);
      mesh(sculpt(new T.SphereGeometry(.062, 12, 8), '#f4cc62'), painted, 0, 3.80, -.15, grp);
      var spreader = mesh(sculpt(new T.CylinderGeometry(.018, .018, .72, 6), '#a37648', true), painted, 0, 2.52, -.15, grp);
      spreader.rotation.z = Math.PI * .5;
      lathe(grp, [[0,0],[.044,0],[.032,1.66],[0,1.68]], '#b88a5a', 0, 1.10, -.12, 1, 1, 8).rotation.x = Math.PI * .5;
      tube(grp, [[0, 3.36, -.15], [0, 1.94, -1.14], [0, .56, -2.14]], .015, '#e8d5b0', 6);
      tube(grp, [[0, 3.56, -.15], [0, 2.02, .78], [0, .46, 1.72]], .015, '#e8d5b0', 6);
      // Billowed striped mainsail + sunlit cream fore-jib + fluttering coral masthead pennant.
      var sailCream = new T.Color('#f4e6cb'), sailShade = new T.Color('#d7bfa0'), sailTeal = new T.Color('#47c2d0'), jibHem = new T.Color('#efb6a4');
      [false, true].forEach(function(flip){
        var mainSail = panelGrid(6, 8, function(u, v){
          var sy = 1.14 + v * 2.45, sz = -.10 + u * 1.56 * (1 - v * .88);
          var belly = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .28 + (flip ? -.02 : .02);
          var col = Math.floor(v * 5) % 2 === 0 ? sailCream.clone() : sailTeal.clone();
          var fold = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
          col.lerp(sailShade, (1 - fold) * .22 + (flip ? .08 : 0)).lerp(snow, fold * .10 * (1 - u));
          return [belly, sy, sz, col];
        }, grp, flip);
        tagSurface(mainSail, 'fabric', 1.4, 3);
        var jibSail = panelGrid(5, 7, function(u, v){
          var sy = .64 + v * 2.66, sz = -.24 - u * 1.52 * (1 - v * .90);
          var belly = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .20 + (flip ? -.016 : .016);
          var fold = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
          var col = sailCream.clone().lerp(jibHem, v < .14 ? .38 : 0).lerp(sailShade, (1 - fold) * .24 + (flip ? .08 : 0)).lerp(snow, fold * .09 * v);
          return [belly, sy, sz, col];
        }, grp, flip);
        tagSurface(jibSail, 'fabric', 1.4, 7);
        var penA = new T.Color('#ef6a5b'), penB = new T.Color('#ffaa8a');
        panelGrid(6, 2, function(u, v){
          var sz = -.15 + u * .64, halfH = .11 * (1 - u * .92);
          var sy = 3.66 + (v - .5) * 2 * halfH, sx = Math.sin(u * 4.8) * .06 * u + (flip ? -.008 : .008);
          return [sx, sy, sz, penA.clone().lerp(penB, u * .6)];
        }, grp, flip);
      });
    }

    function flutedColumn(parent, x, y, z, height, baseR, topR, flutes, stoneTone, coralTone){
      var cStone = new T.Color(stoneTone), cCoral = new T.Color(coralTone), cCol = new T.Color();
      var colM = panelGrid(18, 8, function(u, v){
        var a = u * TAU, flute = Math.cos(a * flutes);
        var r = baseR + (topR - baseR) * v - .025 * Math.sin(v * Math.PI) + .026 * flute;
        var hit = Math.max(0, sun.x * Math.cos(a) + sun.z * Math.sin(a));
        cCol.copy(cStone).lerp(cCoral, .22 * (1 - v) + .12 * (1 - flute)).lerp(recess, (1 - hit) * .22).lerp(snow, hit * .12);
        return [Math.cos(a) * r, v * height, Math.sin(a) * r, cCol];
      }, parent, false);
      colM.position.set(x, y, z);
      lathe(parent, [[0,0],[baseR*1.32,0],[baseR*1.26,.09],[baseR*1.04,.16],[0,.16]], stoneTone, x, y - .02, z, 1, 1, 12);
      lathe(parent, [[0,0],[topR*1.05,0],[topR*1.36,.10],[topR*1.42,.18],[0,.18]], coralTone, x, y + height - .02, z, 1, 1, 12);
    }

    function pearlShrine(spot, rotY, seed){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .15, spot.z); grp.rotation.y = rotY; outerRoot.add(grp);
      // Stepped turquoise-and-shellstone pedestal plinth.
      mesh(sculptStrata(1.75, .44, seed, '#f6e7cb', '#72ccd4', '#5473b8'), painted, 0, 0, 0, grp);
      lathe(grp, [[0,0],[1.22,0],[1.26,.08],[1.14,.16],[0,.16]], '#fff4de', 0, .36, 0, 1, 1, 16);
      // Twin fluted coral-and-shellstone columns.
      flutedColumn(grp, -.72, .50, 0, 1.48, .21, .17, 9, '#fff2db', '#e6a8d7');
      flutedColumn(grp, .72, .50, 0, 1.48, .21, .17, 9, '#fff2db', '#e6a8d7');
      // Curved shellstone archway lintel + fluted shell crest fan.
      var archPts = [
        [-.76, 1.98, 0], [-.66, 2.38, 0], [-.35, 2.66, 0], [0, 2.75, 0],
        [.35, 2.66, 0], [.66, 2.38, 0], [.76, 1.98, 0]
      ];
      tube(grp, archPts, .15, '#ffefd6', 18);
      tube(grp, archPts.map(function(p){ return [p[0], p[1] + .06, p[2] + .06]; }), .08, '#d5b2ef', 18);
      var crestA = new T.Color('#ffe8cf'), crestB = new T.Color('#f09ec7');
      var crest = panelGrid(14, 5, function(u, v){
        var ang = (u - .5) * Math.PI * .92, rib = Math.cos(ang * 9);
        var r = .16 + v * (.52 + .035 * rib);
        var col = crestA.clone().lerp(crestB, .25 + .45 * v + .2 * (.5 - .5 * rib));
        return [r * Math.sin(ang), r * Math.cos(ang), .04 * rib * v, col];
      }, grp, false);
      crest.position.set(0, 2.62, .05);
      // Glowing luminous pearl resting on a lavender chalice pedestal inside the shrine.
      lathe(grp, [[0,0],[.34,0],[.30,.08],[.18,.16],[.32,.26],[.28,.30],[0,.30]], '#cfaee8', 0, .50, 0, 1, 1, 14);
      var pearl = mesh(sculpt(new T.SphereGeometry(.28, 18, 12), '#f2d9a4'), painted, 0, .98, 0, grp);
      pearl.scale.y = 1.06;
      // Wrapped in curling layered 3D kelp ribbons and colorful coral clusters.
      kelp(grp, -1.04, .24, 1.38, -2.4, seed + 1);
      kelp(grp, 1.02, -.26, 1.32, .55, seed + 3);
      kelp(grp, -.88, -.48, 1.06, -1.8, seed + 5);
      coral(grp, .94, .42, .95, seed + 2, '#ff9c91');
      coralCup(grp, -.94, -.12, .68, seed + 4, '#59d9ed');
      brainCoral(grp, .48, .44, .52, .32, '#f094c4');
    }

    function seaAnemone(parent, x, y, z, radius, seed, baseTone, tipTone){
      var cup = lathe(parent, [[0,0],[radius*.62,0],[radius*.78,.18*radius],[radius*.55,.38*radius],[0,.32*radius]], baseTone, x, y, z, 1, 1, 10);
      cup.rotation.y = seed;
      var cBase = new T.Color(baseTone), cTip = new T.Color(tipTone), col = new T.Color();
      for(var t = 0; t < 9; t++){
        var ang = seed + t * (TAU / 9), lean = radius * (.75 + .25 * (t % 2));
        var h = radius * (1.05 + .35 * random(seed + t));
        var pts = [
          new T.Vector3(x + Math.cos(ang) * radius * .28, y + .22 * radius, z + Math.sin(ang) * radius * .28),
          new T.Vector3(x + Math.cos(ang) * lean * .65, y + h * .68, z + Math.sin(ang) * lean * .65),
          new T.Vector3(x + Math.cos(ang) * lean, y + h, z + Math.sin(ang) * lean)
        ];
        var curve = new T.CatmullRomCurve3(pts);
        var tg = new T.TubeGeometry(curve, 6, radius * .085, 5, false), tp = tg.attributes.position, tc = [];
        for(var q = 0; q < tp.count; q++){
          var along = Math.floor(q / 6) / 6, ctr = curve.getPointAt(along), taper = 1 - .55 * along;
          tp.setXYZ(q, ctr.x + (tp.getX(q) - ctr.x) * taper, ctr.y + (tp.getY(q) - ctr.y) * taper, ctr.z + (tp.getZ(q) - ctr.z) * taper);
          col.copy(cBase).lerp(cTip, Math.pow(along, .75));
          tc.push(col.r, col.g, col.b);
        }
        tg.setAttribute('color', new T.Float32BufferAttribute(tc, 3)); tg.computeVertexNormals();
        mesh(tg, painted, 0, 0, 0, parent);
      }
    }

    function brainCoral(parent, x, y, z, radius, pigment){
      var g = new T.SphereGeometry(radius, 18, 12, 0, TAU, 0, Math.PI * .58), p = g.attributes.position, rgb = [];
      var base = new T.Color(pigment), groove = base.clone().lerp(recess, .48), rim = base.clone().lerp(snow, .45), col = new T.Color();
      for(var i = 0; i < p.count; i++){
        var px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
        var ridge = Math.sin(px * 11 + Math.cos(pz * 9)) * Math.cos(pz * 11);
        var s = 1 + .08 * ridge;
        p.setXYZ(i, px * s, py * s, pz * s);
        col.copy(base).lerp(groove, Math.max(0, -ridge) * .65).lerp(rim, Math.max(0, ridge) * .35);
        rgb.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.computeVertexNormals();
      tagSurface(mesh(g, painted, x, y, z, parent), 'coral', .95, Math.round(x * 7 + z * 11));
    }

    function fanCoral(parent, x, y, z, height, rotY, pigment){
      var base = new T.Color(pigment), tip = base.clone().lerp(snow, .38);
      var fan = panelGrid(8, 6, function(u, v){
        var ang = (u - .5) * Math.PI * .82, pleat = Math.cos(ang * 9) * .09 * v;
        var r = v * height * (.92 + .08 * Math.cos(ang * 5));
        return [r * Math.sin(ang), r * Math.cos(ang), pleat, base.clone().lerp(tip, v * .8)];
      }, parent, false);
      fan.position.set(x, y, z); fan.rotation.y = rotY;
    }

    function outerCoralTerrace(spot, size, seed){
      var grp = new T.Group(); grp.position.set(spot.x, spot.y - .12, spot.z); outerRoot.add(grp);
      // Tiered pastel coral ledges.
      mesh(sculptStrata(size * 1.12, size * .48, seed, '#ffd9c8', '#7cd4db', '#6480c4'), painted, 0, 0, 0, grp);
      for(var k = 0; k < 2; k++){
        var rIdx = (k + Math.floor(seed)) % rockShapes.length;
        var b = mesh(rockShapes[rIdx], painted, (k - .5) * size * .72, .16 * size + k * .12 * size, (k ? -.2 : .2) * size, grp);
        b.scale.set(size * .64, size * (.28 + k * .14), size * .58); b.rotation.y = seed + k * 1.3;
        tagSurface(b, rIdx === 2 ? 'coral' : 'stone', 1.2, seed + k);
      }
      for(var s = 0; s < 3; s++){
        var a = seed + s * 2.1;
        kelp(grp, Math.cos(a) * size * .58, Math.sin(a) * size * .48, size * (1.05 + .32 * random(seed + s)), a, seed + s);
      }
      brainCoral(grp, .42 * size, .28 * size, .22 * size, .42 * size, plants[Math.floor(seed) % plants.length]);
      fanCoral(grp, -.38 * size, .32 * size, -.14 * size, 1.08 * size, seed, plants[(Math.floor(seed) + 2) % plants.length]);
      coralCup(grp, .04 * size, .44 * size, .68 * size, seed, plants[(Math.floor(seed) + 4) % plants.length]);
      seaAnemone(grp, -.18 * size, .36 * size, .28 * size, .36 * size, seed + 1.5, '#d56eb4', '#ffe8a8');
    }

    function starfish(parent, x, y, z, r, rotY, pigment){
      var grp = new T.Group();
      grp.position.set(x, y, z); grp.rotation.y = rotY;
      parent.add(grp);
      var base = new T.Color(pigment), tip = base.clone().lerp(snow, .38), ridge = base.clone().lerp(snow, .52), col = new T.Color();
      var m = panelGrid(25, 4, function(u, v){
        var a = u * TAU, arm = Math.pow(.5 + .5 * Math.cos(5 * a), 1.55);
        var rad = v * r * (.35 + .65 * arm);
        var yy = (1 - v * v) * r * .28 * (.70 + .30 * arm) + .018;
        col.copy(base).lerp(tip, v * .52 * arm).lerp(ridge, (1 - v) * .16);
        return [Math.cos(a) * rad, yy, Math.sin(a) * rad, col];
      }, grp, true);
      tagSurface(m, 'coral', .60, Math.round((x + z) * 13));
      // Sculpted pale dorsal tubercle beads along the 5 starfish arms.
      var beadR = Math.max(.014, r * .072);
      mesh(sculpt(new T.SphereGeometry(beadR * 1.15, 6, 5), '#fff2d8', false), painted, 0, r * .29, 0, grp);
      for(var k = 0; k < 5; k++){
        var ka = k * (TAU / 5);
        for(var d = 0; d < 2; d++){
          var f = d ? .62 : .34, br = r * f;
          mesh(sculpt(new T.SphereGeometry(beadR * (d ? .76 : .94), 6, 5), '#fff0d2', false), painted,
            Math.cos(ka) * br, (1 - f * f) * r * .28 + .022, Math.sin(ka) * br, grp);
        }
      }
    }

    function sandDollar(parent, x, y, z, r, rotY){
      var ivoryC = new T.Color('#fff5e0'), petalC = new T.Color('#ccb08c'), col = new T.Color();
      var m = panelGrid(18, 4, function(u, v){
        var a = u * TAU, rad = v * r;
        var petal = Math.pow(Math.max(0, Math.cos(5 * a)), 3) * Math.sin(v * Math.PI);
        var yy = Math.sqrt(Math.max(0, 1 - v * v * .9)) * r * .17 + .012;
        col.copy(ivoryC).lerp(petalC, .52 * petal);
        return [Math.cos(a) * rad, yy, Math.sin(a) * rad, col];
      }, parent, true);
      m.position.set(x, y, z); m.rotation.y = rotY;
    }

    function conchShell(parent, x, y, z, scale, rotY, pigment){
      var base = new T.Color(pigment), stripe = new T.Color('#fff5e4'), col = new T.Color();
      var m = panelGrid(12, 10, function(u, v){
        var a = u * TAU, rib = Math.cos(a * 5 + v * 7);
        var rad = scale * .34 * Math.sin(v * Math.PI) * (1 - .38 * v) * (1 + .14 * rib);
        var len = (v - .42) * scale * 1.15;
        col.copy(base).lerp(stripe, .25 + .45 * (.5 + .5 * rib));
        return [Math.cos(a) * rad, Math.sin(a) * rad + scale * .24, len, col];
      }, parent, true, paintedDouble);
      m.position.set(x, y, z); m.rotation.y = rotY;
    }

    function tidepoolPebble(parent, x, y, z, sx, sy, sz, rotY, pigment){
      var g = new T.SphereGeometry(1, 14, 10);
      g.scale(sx, sy, sz);
      var m = mesh(sculpt(g, pigment, true), painted, x, y + sy * .35, z, parent);
      m.rotation.y = rotY;
      tagSurface(m, 'stone', .85, Math.round(rotY * 17));
    }

    // m5: Sculpted low-profile branching gorgonian sea fan (radial arched coral ribs + scalloped lacy webbing).
    function seaFanLace(parent, x, y, z, height, rotY, tiltX, pigment, seed){
      var grp = new T.Group();
      grp.position.set(x, y, z);
      grp.rotation.order = 'YXZ';
      grp.rotation.set(tiltX, rotY, 0);
      parent.add(grp);
      var baseC = new T.Color(pigment), deepC = baseC.clone().lerp(recess, .34);
      var tipC = baseC.clone().lerp(snow, .46), col = new T.Color();
      // Holdfast foot seated solidly on the shoal.
      var footG = new T.SphereGeometry(height * .13, 8, 5);
      footG.scale(1.18, .52, 1.10);
      mesh(sculpt(footG, deepC.getStyle(), true), painted, 0, .02, 0, grp);
      // 5 curving branching coral ribs fanning gracefully upward & cupped in Z.
      for(var rb = -2; rb <= 2; rb++){
        var ang = rb * .32 + (random(seed + rb + 5) - .5) * .05;
        var rLen = height * (.82 + .18 * Math.cos(ang * 1.4));
        var pts = [
          [0, .03, 0],
          [Math.sin(ang) * rLen * .38, Math.cos(ang) * rLen * .40, .04 * height],
          [Math.sin(ang * 1.06) * rLen * .74, Math.cos(ang * 1.04) * rLen * .76, .07 * height],
          [Math.sin(ang * 1.12) * rLen, Math.cos(ang * 1.08) * rLen, .04 * height]
        ];
        tube(grp, pts, height * .026, rb % 2 ? pigment : tipC.getStyle(), 8);
      }
      // Scalloped deeply-notched lacy fan webbing stretched across the branching ribs.
      panelGrid(16, 6, function(u, v){
        var ang = (u - .5) * Math.PI * .82;
        var lobe = .78 + .22 * Math.pow(Math.abs(Math.cos(ang * 5.2 + seed * .4)), 1.35);
        var rad = (.10 + .90 * v) * height * lobe * (.84 + .16 * Math.cos(ang * 1.3));
        var cup = Math.sin(v * Math.PI) * .075 * height + Math.cos(ang * 10) * .032 * height * v;
        var vein = .5 + .5 * Math.cos(ang * 10);
        col.copy(deepC).lerp(baseC, .25 + .65 * v).lerp(tipC, Math.min(.78, v * .52 + vein * .20 * v));
        return [Math.sin(ang) * rad, Math.cos(ang) * rad + .02, cup, col];
      }, grp, true, paintedDouble);
    }

    // m5: Compact low-profile 3-prong rounded coral sprout with sunlit polyp tips.
    function coralSprout(parent, x, y, z, height, seed, pigment){
      var grp = new T.Group();
      grp.position.set(x, y, z);
      parent.add(grp);
      var tip = new T.Color(pigment), rootC = tip.clone().lerp(recess, .38);
      var shC = rootC.clone().multiplyScalar(.62), rim = tip.clone().lerp(snow, .54);
      var foot = new T.SphereGeometry(Math.max(.07, height * .16), 8, 5);
      foot.scale(1.18, .52, 1.18);
      tagSurface(mesh(sculpt(foot, rootC.getStyle(), true), painted, 0, .02, 0, grp), 'coral', .85, seed);
      for(var arm = 0; arm < 3; arm++){
        var theta = seed + arm * 2.15 + (arm ? .22 : 0);
        var spread = arm ? .34 + .08 * random(seed + arm) : .12;
        var h = height * (arm === 0 ? .95 : .62 + .18 * random(seed + arm + 3));
        var twig = panelGrid(7, 7, function(u, v){
          var a = u * TAU, stem = Math.min(1, v / .76), cap = Math.max(0, (v - .76) / .24) * Math.PI * .5;
          var bulb = 1 + .16 * Math.sin(Math.max(0, stem - .50) / .50 * Math.PI);
          var round = (.115 - .028 * stem + .020 * Math.sin(stem * Math.PI)) * bulb * Math.cos(cap);
          var flare = height * spread * stem * stem, baseH = arm ? height * .12 : 0;
          var nx = Math.cos(a) * Math.cos(cap), ny = Math.sin(cap), nz = Math.sin(a) * Math.cos(cap);
          var hit = Math.max(0, sun.x * nx + sun.y * ny + sun.z * nz);
          var tone = rootC.clone().lerp(tip, .26 + stem * .74).lerp(shC, (1 - hit) * .34).lerp(rim, Math.min(.56, hit * (.28 + .30 * stem) + ny * .22));
          return [
            Math.cos(theta) * flare + Math.cos(a) * height * round,
            baseH + (h - baseH) * stem + height * .078 * Math.sin(cap),
            Math.sin(theta) * flare + Math.sin(a) * height * round,
            tone
          ];
        }, grp, false);
        tagSurface(twig, 'coral', .85, seed + arm);
      }
    }

    // m5: Low-profile MP8 reef shoal vignette (scalloped sandy shoal + lacy foam shimmer + sea fans, starfish, coral sprouts & pebbles).
    function reefShoal(spot, radius, seed, style){
      var grp = new T.Group();
      grp.position.set(spot.x, Math.max(spot.y - .04, -.16), spot.z);
      outerRoot.add(grp);
      // 1. Low-profile scalloped sandy-aqua shoal shelf blending cleanly into the caustic seafloor.
      var sSand = new T.Color('#f4e5c0'), sAqua = new T.Color('#6cdcd5'), sEdge = new T.Color('#30b6c6');
      var shelf = panelGrid(32, 4, function(u, v){
        var a = u * TAU;
        var lobe = 1 + .095 * Math.cos(a * 3 + seed) + .055 * Math.sin(a * 5 - seed * 1.4);
        var rad = radius * (.20 + .82 * v) * lobe;
        var yy = (1 - v * v) * .085 + .012;
        var col = v < .46 ? sSand.clone().lerp(sAqua, v / .46) : sAqua.clone().lerp(sEdge, (v - .46) / .54);
        return [Math.cos(a) * rad, yy, Math.sin(a) * rad, col];
      }, grp, true);
      shelf.userData.reefGround = true;
      // 2. Delicate translucent pearl-white foam shimmer collar + 2 floating seafoam shimmer arcs.
      var fmHi = new T.Color('#ffffff'), fmMid = new T.Color('#d2faf7'), fmOut = new T.Color('#5cd2d8');
      var halo = panelGrid(38, 3, function(u, v){
        var a = u * TAU;
        var lobe = 1 + .095 * Math.cos(a * 3 + seed) + .055 * Math.sin(a * 5 - seed * 1.4);
        var lace = .045 * Math.sin(a * 8 + seed * 2) * v;
        var rad = radius * (.86 + .34 * v + lace) * lobe;
        var yy = .044 - .014 * v;
        var crest = Math.sin(v * Math.PI);
        var col = crest > .5 ? fmMid.clone().lerp(fmHi, (crest - .5) * 2) : fmOut.clone().lerp(fmMid, crest * 2);
        return [Math.cos(a) * rad, yy, Math.sin(a) * rad, col];
      }, grp, true, foamMat);
      halo.userData.reefGround = true;
      for(var wa = 0; wa < 2; wa++){
        var wAng0 = seed * 1.2 + wa * Math.PI + .4, wSpan = .82, wDist = radius * (1.18 + wa * .08);
        var wArc = panelGrid(10, 2, function(u, v){
          var aa = wAng0 + (u - .5) * wSpan;
          var env = .10 + .90 * Math.sin(u * Math.PI);
          var rr = wDist + (v - .5) * .11 * env;
          return [Math.cos(aa) * rr, .038, Math.sin(aa) * rr, fmMid.clone().lerp(fmHi, env * (1 - Math.abs(v - .5) * 2))];
        }, grp, true, foamMat);
        wArc.userData.reefGround = true;
      }
      // 3. Low-profile MP8 shoal props (4 distinct compositions so no shoals read as clones).
      var faceRot = Math.atan2(start.x - spot.x, start.z - spot.z) * .35;
      if(style === 0){
        seaFanLace(grp, -.22 * radius, .07, -.16 * radius, .68 * radius + .10, faceRot + .35, .10, '#ff6e82', seed);
        coralSprout(grp, .30 * radius, .06, -.10 * radius, .48 * radius + .08, seed + 1.7, '#be86f2');
        starfish(grp, .08 * radius, .075, .30 * radius, .31 * radius + .03, seed + .8, '#ffb642');
        sandDollar(grp, -.36 * radius, .065, .24 * radius, .19 * radius, seed + 2.4);
        tidepoolPebble(grp, .42 * radius, .05, .22 * radius, .14 * radius, .065 * radius, .11 * radius, seed, '#e6d3b0');
        tidepoolPebble(grp, -.04 * radius, .055, -.38 * radius, .12 * radius, .058 * radius, .10 * radius, seed + 1.5, '#8fd0d6');
        tidepoolPebble(grp, -.48 * radius, .05, -.02 * radius, .11 * radius, .052 * radius, .09 * radius, seed + 3.1, '#d2c2d8');
      } else if(style === 1){
        seaFanLace(grp, .20 * radius, .07, -.18 * radius, .66 * radius + .10, faceRot - .42, .08, '#c284f2', seed + 2);
        coralSprout(grp, -.30 * radius, .06, -.08 * radius, .46 * radius + .08, seed + 3.1, '#54dce0');
        starfish(grp, -.10 * radius, .075, .28 * radius, .32 * radius + .03, seed + 1.9, '#ff6b52');
        conchShell(grp, .34 * radius, .04, .22 * radius, .32 * radius, seed + .6, '#f490b2');
        tidepoolPebble(grp, -.40 * radius, .05, .26 * radius, .13 * radius, .060 * radius, .10 * radius, seed + .9, '#e8d5b2');
        tidepoolPebble(grp, .06 * radius, .055, -.36 * radius, .12 * radius, .056 * radius, .10 * radius, seed + 2.7, '#94d2d6');
      } else if(style === 2){
        seaFanLace(grp, -.26 * radius, .07, -.18 * radius, .70 * radius + .10, faceRot + .28, .08, '#ff9852', seed + 4);
        seaFanLace(grp, .28 * radius, .065, -.24 * radius, .54 * radius + .08, faceRot - .55, .12, '#f26ca8', seed + 7);
        coralSprout(grp, .36 * radius, .06, .12 * radius, .44 * radius + .07, seed + 5.2, '#ff8e7e');
        seaAnemone(grp, -.32 * radius, .06, .16 * radius, .24 * radius, seed + 1.3, '#c868c0', '#ffea98');
        starfish(grp, .02 * radius, .08, .32 * radius, .32 * radius + .03, seed + 2.2, '#ffbe48');
        sandDollar(grp, .02 * radius, .065, -.02 * radius, .18 * radius, seed + 4.0);
        tidepoolPebble(grp, -.06 * radius, .055, -.40 * radius, .14 * radius, .064 * radius, .11 * radius, seed + 1.1, '#e6d2ad');
        tidepoolPebble(grp, .46 * radius, .05, -.06 * radius, .11 * radius, .052 * radius, .09 * radius, seed + 3.4, '#8cced4');
      } else {
        seaFanLace(grp, -.16 * radius, .07, -.14 * radius, .64 * radius + .10, faceRot - .25, .10, '#ff78a8', seed + 6);
        coralSprout(grp, .28 * radius, .06, -.16 * radius, .46 * radius + .08, seed + 4.4, '#ffba66');
        starfish(grp, -.24 * radius, .075, .26 * radius, .30 * radius + .02, seed + 1.2, '#ff7250');
        starfish(grp, .26 * radius, .07, .24 * radius, .20 * radius + .02, seed + 3.8, '#ffc658');
        conchShell(grp, .02 * radius, .04, .36 * radius, .28 * radius, seed + 2.5, '#f6b292');
        tidepoolPebble(grp, -.42 * radius, .05, -.04 * radius, .13 * radius, .060 * radius, .10 * radius, seed + 2.1, '#dfd2bc');
        tidepoolPebble(grp, .40 * radius, .05, .04 * radius, .11 * radius, .054 * radius, .09 * radius, seed + .5, '#92d0d8');
      }
    }

    // 0. Hero Landmarks anchored directly relative to start inside the default 14x18 camera band.
    if(heroIsletSpot) atollIslet(heroIsletSpot, 2.1, .86, 77, {
      palmH1: 2.08, palmH2: 1.56, lean: .34,
      awayDir: Math.atan2(start.z - heroIsletSpot.z, start.x - heroIsletSpot.x) + 0.45
    });
    if(heroShrineSpot) pearlShrine(heroShrineSpot, Math.atan2(start.x - heroShrineSpot.x, start.z - heroShrineSpot.z), 17);
    if(heroBoatSpot) mooredSailboat(heroBoatSpot, Math.atan2(start.x - heroBoatSpot.x, start.z - heroBoatSpot.z) + 1.15);

    // 1. Mid-ground Cove Jetty + Moored Sailboat right in the visible camera band (dist = 8..13).
    for(var ja = 0; ja < 8; ja++){
      var jAng = .55 + ja * (TAU / 8);
      var jettySpot = findOuterSpot(jAng, 8.0, 11.8, 3.3, 6.2);
      if(jettySpot){
        coveJetty(jettySpot, Math.atan2(cx - jettySpot.x, cz - jettySpot.z) + Math.PI);
        var bx = jettySpot.x + Math.cos(jAng + .24) * 3.7, bz = jettySpot.z + Math.sin(jAng + .24) * 3.7;
        if(outerClear(bx, bz, 6.0, 4.4, 2.2)){
          placed.push([bx, bz, 2.2]);
          mooredSailboat({ x:bx, z:bz, y:o.groundY(bx, bz) }, jAng + 1.3);
        }
        break;
      }
    }

    // 2. Two Ornate Fluted Coral-and-Shellstone Pearl Shrines (visible perimeter).
    [2.35, 5.35].forEach(function(ang, idx){
      var rSpot = findOuterSpot(ang, 7.6, 12.6, 2.6, 6.2);
      if(rSpot) pearlShrine(rSpot, Math.atan2(cx - rSpot.x, cz - rSpot.z), 11 + idx * 7);
    });

    // Subtle warm sandy/shellstone path border under the Coral Cove tile circuit
    // (echoing MP8's unified path framing, merged into statics with zero extra draw calls).
    var pathSamples = [];
    (function pathBorder(){
      var pathRoot = new T.Group();
      pathRoot.name = 'Crafted Cove path border';
      pathRoot.userData.noFootprint = true;
      o.statics.add(pathRoot);
      var mainN = o.mainN || spaces.length, rawLines = [spaces.slice(0, mainN)], cur = null;
      for(var i = mainN; i < spaces.length; i++){
        var sp = spaces[i];
        if(!cur || cur.name !== sp.branch){ cur = { name: sp.branch, pts: [spaces[sp.jn]] }; rawLines.push(cur.pts); }
        cur.pts.push(sp);
      }
      var cFeather = new T.Color('#c9dcc4'), cCurbBase = new T.Color('#ddd0b8');
      var cCurbTop = new T.Color('#f6ebd4'), cBedA = new T.Color('#edd9b6'), cBedB = new T.Color('#e4cca2');
      var profile = [
        [-1.32, -.142, cFeather],
        [-1.14, -.102, cCurbBase],
        [-1.00, -.072, cCurbTop],
        [ 0.00, -.086, cBedA],
        [ 1.00, -.072, cCurbTop],
        [ 1.14, -.102, cCurbBase],
        [ 1.32, -.142, cFeather]
      ];
      rawLines.forEach(function(ln, li){
        if(ln.length < 2) return;
        var closed = !!(spaces.loop && li === 0);
        var curve = new T.CatmullRomCurve3(ln.map(function(s){ return new T.Vector3(s.x, s.y || 0, s.z); }), closed);
        var sampleCount = Math.max(24, ln.length * 8);
        for(var si = 0; si <= sampleCount; si++){
          var spt = curve.getPointAt(si / sampleCount);
          pathSamples.push([spt.x, spt.z]);
        }
        var segs = Math.max(32, ln.length * 10);
        var blockCount = Math.max(8, Math.round(ln.length * 2.2));
        var cols = profile.length - 1;
        // Gently widen the sunlit sandy path shoulder beneath Kiko's Coral Cove resting spot beside start
        // so the curved beach bay flows seamlessly under Kiko with zero abrupt edge or water gap.
        var kBayX = start.x + fx * .45, kBayZ = start.z + fz * .45;
        var m = panelGrid(cols, segs, function(u, v){
          var idx = Math.round(u * cols), row = profile[idx];
          var pt = curve.getPointAt(v % 1), tan = curve.getTangentAt(v % 1);
          var hlen = Math.hypot(tan.x, tan.z) || 1, nx = -tan.z / hlen, nz = tan.x / hlen;
          var latOff = row[0];
          if(li === 0 && latOff !== 0){
            var dBay = Math.hypot(pt.x - kBayX, pt.z - kBayZ);
            if(dBay < 4.2){
              var outSign = (nx * (pt.x - cx) + nz * (pt.z - cz)) >= 0 ? 1 : -1;
              if(latOff * outSign > 0){
                var swell = Math.pow(Math.cos((dBay / 4.2) * Math.PI * .5), 1.55) * .72;
                latOff += outSign * swell;
              }
            }
          }
          var col = row[2];
          var bPos = v * blockCount, bIdx = Math.floor(bPos), bFrac = bPos - bIdx;
          var seam = Math.max(0, 1 - Math.min(bFrac, 1 - bFrac) * 14);
          var toneShift = (random(bIdx + li * 31 + (idx > 3 ? 7 : 0)) - .5) * .14;
          if(idx === 1 || idx === 2 || idx === 4 || idx === 5){
            var curbBase = row[2].clone();
            curbBase.lerp(toneShift >= 0 ? cCurbTop : cBedB, Math.abs(toneShift) * 2.2);
            if(seam > 0) curbBase.lerp(cCurbBase, seam * .45);
            col = curbBase;
          } else if(idx === 3){
            var warm = .5 + .5 * Math.sin(pt.x * .45 + pt.z * .38);
            col = cBedA.clone().lerp(cBedB, Math.max(0, Math.min(1, warm * .55 + toneShift)));
          }
          return [pt.x + nx * latOff, pt.y + row[1], pt.z + nz * latOff, col];
        }, pathRoot, true);
        m.userData.reefGround = true;
      });
    })();

    // 3. Four Curved-Frond Palm-Crowned Turquoise Sandbar Islets in the visible corners (dist = 6.2..9.5).
    [1.15, 2.95, 4.15, 5.85].forEach(function(ang, idx){
      var iSpot = null, offsets = [0, .24, -.24];
      for(var oi = 0; oi < offsets.length && !iSpot; oi++){
        iSpot = findOuterSpot(ang + offsets[oi], 6.2, 9.5, 2.65, 5.4, 4.8);
      }
      if(iSpot) atollIslet(iSpot, 2.0 + random(idx + 5) * .45, .82 + random(idx + 9) * .32, 70 + idx * 3);
    });

    // 4. Eight Tiered Pastel Coral Ledges & Glowing Sea-Anemone Shelves framing the outer edges.
    for(var ti = 0; ti < 8; ti++){
      var tAng = ti * (TAU / 8) + .22;
      var tSpot = findOuterSpot(tAng, 5.2, 13.0, 2.1, 5.0);
      if(tSpot) outerCoralTerrace(tSpot, 1.08 + .28 * random(ti + 40), 50 + ti * 3);
    }

    // 5. Outer Horizon Framing (13.5..21 units outside the circuit): Reef Cliffs, Horizon Arches & Sea Stacks.
    function clearOfPavilionSilhouette(spot){
      if(!site) return true;
      var svx = site.x - start.x, svz = site.z - start.z, sLen = Math.hypot(svx, svz) || 1;
      var sdx = svx / sLen, sdz = svz / sLen;
      var rxv = spot.x - start.x, rzv = spot.z - start.z;
      var along = rxv * sdx + rzv * sdz;
      var perp = Math.abs(-rxv * sdz + rzv * sdx);
      return !(along > sLen * .75 && perp < 6.4);
    }
    var rimTypes = ['cliff', 'arch', 'stack', 'cliff', 'arch', 'stack', 'cliff', 'arch', 'stack'];
    rimTypes.forEach(function(kind, idx){
      var ang = idx * (TAU / rimTypes.length) + (random(idx + 90) - .5) * .22;
      var rad = kind === 'arch' ? 3.2 : 2.6;
      var spot = null, nudges = kind === 'stack' ? [0, .34, -.34, .62, -.62] : [0];
      for(var ni = 0; ni < nudges.length && !spot; ni++){
        var cand = findOuterSpot(ang + nudges[ni], 13.5, 21.0, rad, 8.2);
        if(!cand) continue;
        if(kind === 'stack' && !clearOfPavilionSilhouette(cand)){ placed.pop(); continue; }
        spot = cand;
      }
      if(!spot) return;
      if(kind === 'cliff') reefCliff(spot, 2.2 + random(idx + 12) * .8, 2.0 + random(idx + 16) * 1.2, 90 + idx * 5);
      else if(kind === 'arch') horizonArch(spot, 5.2 + random(idx + 20) * 1.2, 3.5 + random(idx + 24) * .8, ang + Math.PI * .5, 110 + idx);
      else seaStack(spot, 1.3 + random(idx + 30) * .45, 2.6 + random(idx + 34) * 1.1, 130 + idx * 2);
    });

    // 6. m5: Low-profile MP8 mid-water reef shoal accents framing open-water bands
    // (250-400, 280-400) & (560-850, 300-420), strictly clear of tiles, path, Shelly, Kiko & landmarks.
    var shoalPlaced = [];
    var kikoSpot = null;
    (function computeKiko(){
      var mainN2 = o.mainN || spaces.length;
      var prev = spaces.loop ? spaces[mainN2 - 1] : null;
      if(!prev) return;
      var bx = prev.x - start.x, bz = prev.z - start.z, bl = Math.hypot(bx, bz);
      if(bl > .1){
        bx /= bl; bz /= bl;
        var rxK = bz, rzK = -bx;
        kikoSpot = [start.x + bx * 2.18 + rxK * .62, start.z + bz * 2.18 + rzK * .62];
      }
    })();
    var pavRot = house ? house.rotation.y : 0;
    var pavCos = Math.cos(-pavRot), pavSin = Math.sin(-pavRot);
    function clearOfPavilionPlinth(x, z, r){
      if(!site) return true;
      var dxP = x - site.x, dzP = z - site.z;
      var lx = dxP * pavCos - dzP * pavSin;
      var lz = dxP * pavSin + dzP * pavCos;
      var a = 3.25 + r + .32, b = 2.22 + r + .32;
      return (lx * lx) / (a * a) + (lz * lz) / (b * b) >= 1;
    }
    function shoalClear(x, z, r){
      if(!clear(x, z, 2.55, 2.25 + r)) return false;
      if(Math.hypot(x - start.x, z - start.z) < 3.25) return false;
      if(kikoSpot && Math.hypot(x - kikoSpot[0], z - kikoSpot[1]) < 4.0) return false;
      if(!clearOfPavilionPlinth(x, z, r)) return false;
      var pathNeed = 1.32 + r + .42;
      for(var pi = 0; pi < pathSamples.length; pi++){
        if(Math.hypot(x - pathSamples[pi][0], z - pathSamples[pi][1]) < pathNeed) return false;
      }
      for(var qi = 0; qi < placed.length; qi++){
        if(site && qi === 0) continue;
        var q = placed[qi];
        var qRad = (heroShrineSpot && Math.abs(q[0] - heroShrineSpot.x) < .05 && Math.abs(q[1] - heroShrineSpot.z) < .05) ? 1.80 : q[2];
        if(Math.hypot(x - q[0], z - q[1]) < qRad + r + .25) return false;
      }
      for(var gi = 0; gi < planted.length; gi++){
        if(Math.hypot(x - planted[gi][0], z - planted[gi][1]) < 2.00 + r) return false;
      }
      for(var si = 0; si < shoalPlaced.length; si++){
        var sh = shoalPlaced[si];
        if(Math.hypot(x - sh[0], z - sh[1]) < sh[2] + r + .28) return false;
      }
      return true;
    }
    var midWaterShoals = [
      // Band A (250-400, 280-400): inner-curve bay left of path.
      { r: .82, style: 0, seed: 201, tries: [[-2.85, 2.35], [-2.95, 2.60], [-2.70, 2.15], [-3.10, 2.85]] },
      { r: .74, style: 1, seed: 213, tries: [[-3.85, 4.20], [-3.65, 4.40], [-4.00, 4.00], [-3.50, 4.55]] },
      // Band B (560-850, 300-420): open turquoise corridor between path, Pavilion, Shrine & foreground garden.
      { r: .76, style: 1, seed: 227, tries: [[3.65, 4.15], [3.85, 4.00], [3.50, 4.30], [4.05, 3.85]] },
      { r: .74, style: 2, seed: 241, tries: [[5.45, 2.75], [5.30, 2.60], [5.60, 2.90], [5.15, 2.50]] },
      { r: .66, style: 3, seed: 257, tries: [[5.95, 1.15], [6.05, 1.35], [5.85, 1.00], [6.15, 1.65]] },
      { r: .56, style: 0, seed: 271, tries: [[7.15, 3.45], [7.00, 3.30], [7.30, 3.60], [6.80, 3.15]] }
    ];
    midWaterShoals.forEach(function(cfg){
      for(var ti = 0; ti < cfg.tries.length; ti++){
        var p = cfg.tries[ti];
        var x = start.x - fz * p[0] + fx * p[1], z = start.z + fx * p[0] + fz * p[1];
        if(!shoalClear(x, z, cfg.r)) continue;
        shoalPlaced.push([x, z, cfg.r]);
        reefShoal({ x: x, z: z, y: o.groundY(x, z) }, cfg.r, cfg.seed, cfg.style);
        break;
      }
    });

    return house ? house.position.clone() : null;
  }
  return { enabled:enabled, createContext:createContext, garden:garden, paintFloor:paintFloor, fogColor:FOG };
})();
