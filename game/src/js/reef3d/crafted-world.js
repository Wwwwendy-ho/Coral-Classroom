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
    var channel = new T.Color('#198fb8'), bank = new T.Color('#3cc7cd'), light = new T.Color('#8be6d5'), color = new T.Color();
    var fog = new T.Color(FOG), halfW = geometry.parameters.width/2, halfL = geometry.parameters.height/2;
    var fadeWidth = Math.min(halfW, halfL)*.16;
    for(var i = 0; i < p.count; i++){
      var localX = p.getX(i), localY = p.getY(i), x = localX + floorX, z = floorZ - localY;
      var shore = 1 - distance(x,z);
      var wash = .5 + .5 * Math.sin(x*.37 + z*.24 + .7*Math.sin(z*.36 - x*.14));
      var caustic = Math.pow(wash,5) * (.55 + .45 * Math.cos(z*.39 - x*.23));
      var pool = .5 + .5 * Math.cos(x*.13 - z*.18 + Math.sin(x*.17)*.76);
      color.copy(channel).lerp(bank,.24+.39*shore+.30*pool).lerp(light,.20*caustic+.06*wash);
      // Blend the outermost dune rows into the water beyond the floor mesh.
      var edge = Math.min(halfW-Math.abs(localX),halfL-Math.abs(localY));
      var k = Math.max(0,Math.min(1,edge/fadeWidth));
      color.lerp(fog,1-k*k*(3-2*k));
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
    var sun = new T.Vector3(-.42,.79,.45).normalize();
    var sky = new T.Color('#d7f4ff'), snow = new T.Color('#fff9e8');
    var recess = new T.Color('#776bc2'), reflectedSea = new T.Color('#62becf');
    var coldGlass = new T.Color('#276ac4'), lilacGlass = new T.Color('#bc91f5'), lilacEdge = new T.Color('#7159bb');
    function mesh(g, mat, x, y, z, parent){
      var m = new T.Mesh(g, mat); m.position.set(x,y,z); parent.add(m); return m;
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
    function panelGrid(uCount, vCount, fn, parent, flip){
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
      return mesh(geom,painted,0,0,0,parent);
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
      lathe(house,[[0,0],[1,0],[1.02,.03],[1,.1],[.94,.14],[0,.14]],trim,0,.31,0,2.85,1.83,32);
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
      // The portico has real open spans. Each cream border arches up to the
      // roof fascia, with a lavender inner lip just behind it.
      [[-2.12,-.97],[-.97,.91],[.91,2.12]].forEach(function(span){
        var a=span[0], b=span[1], dx=b-a;
        var pts=[[a,1.79,1.16-.17*a*a],[a+dx*.16,2.04,1.22-.17*a*a],
          [(a+b)/2,2.17,1.34-.17*Math.pow((a+b)/2,2)],[b-dx*.16,2.04,1.22-.17*b*b],[b,1.79,1.16-.17*b*b]];
        tube(house,pts,.125,lavender,14);
        tube(house,pts.map(function(p){ return [p[0],p[1]+.045,p[2]+.045]; }),.10,trim,14);
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
      shell.position.set(1.34,3.19,.91); shell.rotation.set(.04,.18,-.32);
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
    // Chipped strata form real ledges, so the reef beds have distinct
    // silhouettes and cool overhangs even without a texture or another draw.
    var shelf = [[0,-.22],[.71,-.20],[1.04,.07],[1.08,.29],[.79,.41],[.87,.61],[.57,.83],[0,.78]]
      .map(function(p){ return new T.Vector2(p[0],p[1]); });
    var rockShapes = ['#62c0cc','#7aa9db','#b698e0'].map(function(tone,k){
      var g = new T.LatheGeometry(shelf,10), p = g.attributes.position;
      for(var i=0;i<p.count;i++){
        var x=p.getX(i), y=p.getY(i), z=p.getZ(i), a=Math.atan2(x,z);
        var edge=1+.12*Math.cos(a*3+k)+.09*Math.sin(a*5-k+y*3);
        var tilt=.12*x-.08*z;
        p.setXYZ(i,x*edge+.16*y,y+tilt,z*edge-.09*y);
      }
      g.computeVertexNormals();
      return sculpt(g,tone,true);
    });
    var greens = [new T.Color('#138582'),new T.Color('#7cca74'),new T.Color('#f1e05a')];
    function kelp(parent,x,z,height,turn,seed){
      var cs=Math.cos(turn), sn=Math.sin(turn);
      var blade = panelGrid(6,8,function(u,v){
        var a = u*TAU, curl = Math.sin(v*4.7+seed);
        var wide = (.037+.29*Math.sin(v*Math.PI)) * Math.pow(1-v,.39);
        var across = Math.cos(a)*wide, roll = .93*Math.sin(v*3.6+seed);
        var xx = across*Math.cos(roll)+.25*Math.sin(v*4.3)*v;
        var zz = across*Math.sin(roll)+.35*curl*v+.033*Math.sin(a)*Math.sin(Math.PI*v);
        var key = .5+.5*Math.cos(a-roll-turn-.8), glint = (.23+.49*v)*Math.pow(key,.82);
        var tone = greens[0].clone().lerp(greens[1],.15+.63*v+.21*key).lerp(greens[2],glint);
        return [(cs*xx+sn*zz)*height,v*height,(cs*zz-sn*xx)*height,tone];
      },parent,false);
      blade.position.set(x,.12,z);
    }
    function coral(parent,x,z,height,seed,pigment){
      var tip = new T.Color(pigment), rootColor = tip.clone().lerp(recess,.37);
      var shadow = rootColor.clone().multiplyScalar(.62);
      for(var arm=0;arm<3;arm++){
        var theta = seed+arm*2.29, spread = arm ? .32+.07*random(seed+arm) : .13;
        var h = height*(arm ? .60+.17*random(seed+arm+5) : .91);
        var twig = panelGrid(6,7,function(u,v){
          var a = u*TAU, stem = Math.min(1,v/.72), cap = Math.max(0,(v-.72)/.28)*Math.PI*.5;
          var round = (.092-.032*stem+.022*Math.sin(stem*Math.PI))*Math.cos(cap);
          var flare = height*spread*stem*stem, baseHeight = arm ? height*.16 : 0;
          var key = .5+.5*Math.cos(a-1.8)*Math.cos(cap);
          var tone = rootColor.clone().lerp(tip,.23+stem*.76).lerp(shadow,(1-key)*.34*(1-.25*stem)).lerp(snow,key*stem*.34);
          return [Math.cos(theta)*flare + Math.cos(a)*height*round,baseHeight+(h-baseHeight)*stem+height*.065*Math.sin(cap),
            Math.sin(theta)*flare + Math.sin(a)*height*round,tone];
        },parent,false);
        twig.position.set(x,.17,z);
      }
    }
    function coralCup(parent,x,z,h,seed,pigment){
      var shape = [[.06,0],[.12,.41],[.24,.68],[.46,1],[.40,.99],[.24,.77],[.13,.66],[.05,.64]];
      var g = new T.LatheGeometry(shape.map(function(p){ return new T.Vector2(p[0],p[1]*h); }),14);
      var p = g.attributes.position;
      for(var i=0;i<p.count;i++){
        var px=p.getX(i), py=p.getY(i), pz=p.getZ(i), v=py/h, a=Math.atan2(px,pz);
        var ripple = Math.cos(a*4+seed)*v*v, edge = 1+.18*ripple;
        p.setXYZ(i,px*edge+.11*v*v,py+.085*h*ripple,pz*edge-.083*v);
      }
      g.computeVertexNormals();
      mesh(sculpt(g,pigment,true),painted,x,.17,z,parent).rotation.z = .15;
    }
    function bed(x,z,seed,size,far){
      if(!clear(x,z,2.37+size,1.95+size) || (site && Math.hypot(x-site.x,z-site.z)<3.65+size)) return;
      if(planted.some(function(p){ return Math.hypot(p[0]-x,p[1]-z)<2.1; })) return;
      planted.push([x,z]);
      var y=o.groundY(x,z), cluster=new T.Group();
      cluster.position.set(x,y-.09,z); root.add(cluster);
      for(var k=0;k<(far?2:3);k++){
        var off=(k-1)*size*.64, b=mesh(rockShapes[k],painted,off,.03,Math.sin(seed+k)*.38*size,cluster);
        b.scale.set(size*(.54+random(seed+k)*.33),size*(.24+random(seed+k+4)*.25),size*.65); b.rotation.y=seed+k;
      }
      for(var p=0;p<(far?3:2);p++){
        var a=random(seed+p+20)*TAU, h=size*(.98+random(seed+p+90)*1.02) * (far ? 1.24 : 1);
        kelp(cluster,Math.cos(a)*size*.69,Math.sin(a)*size*.54,h,a,seed*.7+p);
      }
      if(!far){
        coral(cluster,.52*size,.40*size,size*(.92+random(seed)*.57),seed,plants[seed%plants.length]);
        var cup=size*(.54+.32*random(seed+13));
        coralCup(cluster,-.54*size,.21*size,cup,seed,plants[(seed+3)%plants.length]);
      }
    }
    [[-4.1,1.9],[4.3,-1.7],[-7.7,7.3]].forEach(function(c,k){
      bed(start.x-fz*c[0]+fx*c[1],start.z+fx*c[0]+fz*c[1],27+k*6,1.15+k*.12,k===2);
    });
    [[5.15,1.05,35,1.15],[1.2,10.65,36,1.52],[7.05,-3.25,43,1.35]].forEach(function(c){
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
    return house ? house.position.clone() : null;
  }
  return { enabled:enabled, createContext:createContext, garden:garden, paintFloor:paintFloor, fogColor:FOG };
})();
