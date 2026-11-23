/* Coral Cove opening garden, static geometry only (THREE r128).
 *
 * Integration: after reef3dBlobs(...) is made and immediately before
 * scene.add(reef3dMerge(statics, rig, bake)), call:
 *   if (!night && !region) reef3dCoveDetail({ THREE: THREE, statics: statics,
 *     spaces: spaces, mainN: mainN, M: M, groundY: groundY,
 *     taken: deckObjs.map(function(d){ return [d.position.x, d.position.z]; }) });
 * Load this file in the same script scope as board.js. The later merge bakes its
 * vertex colors, removes normals and UVs, and shares the ordinary opaque,
 * front-sided scenery material. Calling after blob collection adds no shadows.
 * Existing opening scatter/garden should be suppressed separately for an
 * uncluttered replacement; this generator does not mutate those systems.
 *
 * Maximum: three garden groups, shell pavilion, coral gateway and central
 * reef crown, under15,000 triangles in total. One shared opaque surface atlas
 * adds pores/growth marks; no extra lighting, animation or raycasting.
 * Positions are deterministic and reject all route spaces and deck props.
 */
function reef3dCoveDetail(o){
  var T = o.THREE, spaces = o.spaces, n = Math.min(10, o.mainN || spaces.length);
  if(n < 3) return;
  var mat = o.M('#ffffff', { vertexColors: true });
  var palette = ['#98c9bd', '#c7add2', '#e996aa', '#f4d9c4', '#8fcbb8', '#d579a3'];
  var colors = palette.map(function(c){ return new T.Color(c); });
  var root = new T.Group(); root.name = 'cove opening garden';
  var landmarkFeet = [];  // Keep supporting gardens clear of the two landmarks.

  // Parametric meshes carry their color variation in vertices so the existing
  // light bake can give all of them the same merged material as the board.
  function surface(uCount, vCount, point, color, flip, kind){
    var p = [], c = [], idx = [], col = colors[color], u, v;
    for(v = 0; v <= vCount; v++) for(u = 0; u <= uCount; u++){
      var s = u / uCount, t = v / vCount, q = point(s, t);
      p.push(q[0], q[1], q[2]);
      var k = q[3]; c.push(col.r * k, col.g * k, col.b * k);
    }
    for(v = 0; v < vCount; v++) for(u = 0; u < uCount; u++){
      var a = v * (uCount + 1) + u, b = a + uCount + 1;
      if(flip) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    g.setIndex(idx); g.computeVertexNormals();
    var m = new T.Mesh(g, mat); m.raycast = function(){};
    if(typeof reef3dSurface==='function') reef3dSurface(m,kind || 'coral',{scale:kind==='stone'?1.65:1.1,seed:color});
    return m;
  }
  // Asymmetrical, scalloped stones with strata in the vertex colors. Their
  // lower half is buried, keeping the silhouette soft rather than spherical.
  function rock(seed, sx, sy, sz){
    var m = surface(16, 10, function(u, v){
      var a = u * Math.PI * 2, b = v * Math.PI, h = Math.cos(b), ring = Math.pow(Math.sin(b),.78);
      // A broad broken shoulder and offset strata change the silhouette, while
      // the atlas supplies pores and fine mineral detail without more vertices.
      var ledge=.035*Math.sin(h*13+seed), shoulder=.075*Math.sin(3*a+seed)*ring;
      var wobble=1+shoulder+.045*Math.cos(5*a-2*b+seed)+ledge;
      var yy=h+.07*Math.sin(3*a+seed)*ring*ring;
      var band=.94+.035*Math.sin(h*15+Math.sin(a*3+seed));
      return [Math.cos(a)*ring*sx*wobble,yy*sy,Math.sin(a)*ring*sz*wobble,band];
    }, seed % 2 ? 0 : 1, true,'stone');
    m.position.y = sy * .43; return m;
  }
  // A thick folded coral blade. A closed cross-section and rippled edge make
  // it readable from either side without introducing a double-sided bin.
  function leaf(seed, width, height, depth, color){
    return surface(16, 8, function(u, v){
      var a = u * Math.PI * 2, y = v, taper = .18 + .82 * Math.sin(Math.PI * .5 * y);
      var ripple = .16 * Math.sin(5 * a + seed + y * 3) * y;
      var x = Math.cos(a) * width * taper * (1 + ripple);
      var z = Math.sin(a) * depth * taper + .22 * y * y + .045 * Math.cos(a * 5 + seed) * y;
      return [x, height * y + .12 * Math.cos(5 * a + seed) * y * y, z, .88 + .12 * y + .07 * Math.cos(a * 5 + y * 6 + seed)];
    }, color);
  }
  function clear(x, z){
    // Include branches and deck props, not just the first ten main spaces.
    for(var i = 0; i < spaces.length; i++){
      var dx = spaces[i].x - x, dz = spaces[i].z - z;
      if(dx * dx + dz * dz < 4.9 * 4.9) return false;
    }
    var taken = o.taken || [];
    for(var j = 0; j < taken.length; j++){
      var tx = taken[j][0] - x, tz = taken[j][1] - z;
      if(tx * tx + tz * tz < 3.1 * 3.1) return false;
    }
    for(var k = 0; k < landmarkFeet.length; k++){
      var lx = landmarkFeet[k][0] - x, lz = landmarkFeet[k][1] - z;
      var room = landmarkFeet[k][2] || 3.8;
      if(lx * lx + lz * lz < room * room) return false;
    }
    return true;
  }
  // A large, fluted pearl-shell pavilion by the start, facing the camera.
  // Its fan is a continuous sculpted surface, with alternating raised ribs
  // and warm grooves instead of dozens of separately rendered decorations.
  function shellPavilion(){
    var start = spaces[0], x, z, found = false, taken = o.taken || [];
    // The new circuit approaches start again on its left. Try the outside
    // edge to the right of the initial heading first, then nearby safe sites.
    var candidates = [[4.8,-4], [5.4,-5], [4.8,-2], [5.8,-2], [5.8,-6], [5.2,0], [-5,-4], [-5.8,-5]];
    for(var c = 0; c < candidates.length; c++){
      x = start.x + candidates[c][0]; z = start.z + candidates[c][1];
      var safe = true;
      for(var i = 0; i < spaces.length; i++){
        var dx = spaces[i].x - x, dz = spaces[i].z - z;
        if(dx * dx + dz * dz < 3.5 * 3.5){ safe = false; break; }
      }
      for(var j = 0; safe && j < taken.length; j++){
        var tx = taken[j][0] - x, tz = taken[j][1] - z;
        if(tx * tx + tz * tz < 3.1 * 3.1) safe = false;
      }
      if(safe){ found = true; break; }
    }
    if(!found) return;
    var pavilion = new T.Group();
    pavilion.position.set(x, o.groundY(x, z), z);
    var foundation = rock(8, 1.62, .3, .76); pavilion.add(foundation);
    var shell = surface(32, 12, function(u, v){
      var angle = (u - .5) * Math.PI * .94, edge = Math.sin(Math.PI * v);
      var ribs = Math.cos(angle * 11), r = v * (1 + .025 * ribs * v);
      var xx = 1.65 * r * Math.sin(angle), yy = .23 + 2.85 * r * Math.cos(angle);
      var zz = -.12 + .23 * r * r - .25 * Math.pow(Math.sin(angle), 2) * r + .055 * ribs * edge;
      return [xx, yy, zz, .93 + .07 * ribs * edge];
    }, 3, true);
    pavilion.add(shell);
    // A real reverse surface (not a double-sided material) retains the shell
    // as the camera circles the loop. Reversing indices gives outward normals.
    var backGeo = shell.geometry.clone(), backIndex = backGeo.index;
    for(var bi = 0; bi < backIndex.count; bi += 3){
      var swap = backIndex.getX(bi + 1); backIndex.setX(bi + 1, backIndex.getX(bi + 2)); backIndex.setX(bi + 2, swap);
    }
    backGeo.computeVertexNormals();
    var back = new T.Mesh(backGeo, mat); back.position.z = -.13; back.raycast = function(){}; pavilion.add(back);
    if(typeof reef3dSurface==='function') reef3dSurface(back,'coral',{scale:1.1,seed:3});
    var pearl = new T.Mesh(new T.SphereGeometry(.43, 16, 10), o.M('#f4e8df'));
    pearl.position.set(0, .62, .48); pearl.raycast = function(){}; pavilion.add(pearl);
    root.add(pavilion); landmarkFeet.push([x, z]);
  }
  shellPavilion();

  // A broad, asymmetrical coral arch frames the route at tile seven. The
  // feet stand beyond the board; its opening is over eight units wide, with
  // a 4.6-unit crown. A single tube is rippled and tinted per vertex, so its
  // silhouette reads as grown coral rather than a smooth geometric torus.
  function coralGateway(){
    if(n < 8) return;
    var s = spaces[7], prev = spaces[6], next = spaces[8] || s;
    var dx = next.x - prev.x, dz = next.z - prev.z, len = Math.hypot(dx, dz) || 1;
    var px = -dz / len, pz = dx / len, half = 4.65;
    var taken = o.taken || [];
    for(var side = -1; side <= 1; side += 2){
      var fx = s.x + side * px * half, fz = s.z + side * pz * half;
      for(var i = 0; i < spaces.length; i++){
        var ax = spaces[i].x - fx, az = spaces[i].z - fz;
        if(ax * ax + az * az < 2.5 * 2.5) return;
      }
      for(var j = 0; j < taken.length; j++){
        var bx = taken[j][0] - fx, bz = taken[j][1] - fz;
        if(bx * bx + bz * bz < 2.3 * 2.3) return;
      }
    }
    var arch = new T.Group();
    arch.position.set(s.x, o.groundY(s.x, s.z), s.z);
    // Local X follows the path normal. Transform the group, so both feet
    // track the path's turn without displacing any spaces or hit targets.
    arch.rotation.y = Math.atan2(-pz, px);
    var curve = new T.CatmullRomCurve3([
      new T.Vector3(-half, .02, 0), new T.Vector3(-4.42, 1.7, -.06),
      new T.Vector3(-3.65, 3.25, -.16), new T.Vector3(-2.0, 4.18, -.22),
      new T.Vector3(.1, 4.55, -.25), new T.Vector3(2.2, 4.08, -.13),
      new T.Vector3(3.8, 3.0, .05), new T.Vector3(4.45, 1.45, .10),
      new T.Vector3(half, .02, .03)
    ]);
    var geo = new T.TubeGeometry(curve, 40, .43, 10, false), p = geo.attributes.position, normal = geo.attributes.normal, cs = [];
    var base = colors[5], alt = colors[1];
    for(var q = 0; q < p.count; q++){
      var along = Math.floor(q / 11) / 40, around = (q % 11) / 10 * Math.PI * 2;
      var rough = .035 * Math.sin(along * 36 + Math.cos(around * 3)) + .025 * Math.cos(around * 5 + along * 18);
      p.setXYZ(q, p.getX(q) + normal.getX(q) * rough, p.getY(q) + normal.getY(q) * rough, p.getZ(q) + normal.getZ(q) * rough);
      var tint = .93 + .05 * Math.sin(along * 19 + around * 2);
      var blend = .25 + .2 * Math.sin(along * 9);
      cs.push((base.r * (1-blend) + alt.r * blend) * tint, (base.g * (1-blend) + alt.g * blend) * tint, (base.b * (1-blend) + alt.b * blend) * tint);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(cs, 3)); geo.computeVertexNormals();
    var branch = new T.Mesh(geo, mat); branch.raycast = function(){}; arch.add(branch);
    if(typeof reef3dSurface==='function') reef3dSurface(branch,'coral',{scale:1.2,seed:5});
    // Tapered, curving antler-like branches and pale polyp clusters turn the
    // broad arch into living coral, with shapes readable in silhouette.
    function horn(x, y, z, lean, height, color){
      var path = new T.CatmullRomCurve3([new T.Vector3(x,y,z),
        new T.Vector3(x + lean*.22,y + height*.42,z+.03),
        new T.Vector3(x + lean*.7,y + height*.8,z+.06),
        new T.Vector3(x + lean,y + height,z+.04)]);
      var g = new T.TubeGeometry(path, 12, .24, 7, false), pos = g.attributes.position, cols = [];
      var col = colors[color];
      for(var h = 0; h < pos.count; h++){
        var t = Math.floor(h / 8) / 12, center = path.getPointAt(t), scale = 1 - .78*t;
        pos.setXYZ(h, center.x + (pos.getX(h)-center.x)*scale, center.y + (pos.getY(h)-center.y)*scale, center.z + (pos.getZ(h)-center.z)*scale);
        var light = .9 + .12*t; cols.push(col.r*light,col.g*light,col.b*light);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
      var m = new T.Mesh(g, mat); m.raycast = function(){}; arch.add(m);
      if(typeof reef3dSurface==='function') reef3dSurface(m,'coral',{scale:.9,seed:color});
    }
    [[-3.9,2.8,-.08,-.55,.85,2],[-3.0,3.65,-.15,-.4,1.05,5],[-1.9,4.13,-.20,-.33,.72,2],
     [1.4,4.27,-.16,.36,.75,2],[2.65,3.8,-.08,.55,1.02,5],[3.65,3.05,.04,.6,.8,2]].forEach(function(h){ horn.apply(null,h); });
    // Cream buds cluster on the near face and sit above the tube surface.
    var budGeo = new T.SphereGeometry(.115, 8, 6), budMat = o.M('#f6dcc8');
    [[-3.9,2.8],[-3.0,3.65],[-1.9,4.13],[-.9,4.42],[.3,4.52],[1.4,4.27],[2.65,3.8],[3.65,3.05]].forEach(function(b, i){
      for(var k=0; k<2; k++){
        var bud = new T.Mesh(budGeo, budMat); bud.position.set(b[0]+(k-.5)*.19,b[1]+.08+(i%2)*.08,.37); bud.scale.set(.85,1.1,.65); bud.raycast = function(){}; arch.add(bud);
      }
    });
    // Soft feet anchor the arch to the sea floor without crowding the route.
    [-1, 1].forEach(function(sd, i){ var foot = rock(10 + i, .85, .45, .7); foot.position.x = sd * half; arch.add(foot); });
    root.add(arch);
    landmarkFeet.push([s.x + px * half, s.z + pz * half], [s.x - px * half, s.z - pz * half]);
  }
  coralGateway();

  // The circuit's center gets one large, pleated sea-fan crown, a silhouette
  // that reads from a whole-board view. Sample positions around the mean of
  // the main route, but protect every branch, tile and deck prop as well.
  function reefCrown(){
    var main = Math.min(o.mainN || spaces.length, spaces.length), cx = 0, cz = 0;
    for(var i = 0; i < main; i++){ cx += spaces[i].x; cz += spaces[i].z; }
    cx /= main; cz /= main;
    var offsets = [[0,0],[3,0],[-3,0],[0,3],[0,-3],[3,3],[-3,3],[3,-3],[-3,-3],[6,0],[-6,0],[0,6],[0,-6]];
    var taken = o.taken || [], found = false, x, z;
    for(var a = 0; a < offsets.length; a++){
      x = cx + offsets[a][0]; z = cz + offsets[a][1];
      var safe = true;
      for(var j = 0; j < spaces.length; j++){
        var dx = spaces[j].x-x, dz = spaces[j].z-z;
        if(dx*dx+dz*dz < 6*6){ safe = false; break; }
      }
      for(var k = 0; safe && k < taken.length; k++){
        var tx = taken[k][0]-x, tz = taken[k][1]-z;
        if(tx*tx+tz*tz < 5*5) safe = false;
      }
      for(var l = 0; safe && l < landmarkFeet.length; l++){
        var lx = landmarkFeet[l][0]-x, lz = landmarkFeet[l][1]-z;
        if(lx*lx+lz*lz < 7*7) safe = false;
      }
      if(safe){ found = true; break; }
    }
    if(!found) return;
    var crown = new T.Group(); crown.name = 'central reef crown';
    crown.position.set(x, o.groundY(x,z), z);
    var shelf = rock(20, 2.05, .55, 1.35); crown.add(shelf);
    var ledge = rock(21, 1.22, .34, .85); ledge.position.set(-1.4,.08,.2); crown.add(ledge);
    var stone = rock(22, 1.03, .28, .72); stone.position.set(1.5,.05,-.1); crown.add(stone);
    // Broad scalloped fan: ribs run from the base to the flared edge, with
    // soft rose valleys and lavender ridges. Each side has its own normals.
    var fan = surface(32, 12, function(u,v){
      var angle = (u-.5) * Math.PI * .94, wave = Math.cos(angle*13), r = v*(1+.045*wave*v);
      var xx = 2.25*r*Math.sin(angle), yy = .47 + 4.05*r*Math.cos(angle);
      var zz = -.18 + .22*r*r - .16*Math.pow(Math.sin(angle),2)*r + .105*wave*v;
      return [xx, yy, zz, .88 + .12*(.5+.5*wave)];
    }, 1, true);
    crown.add(fan);
    var reverse = fan.geometry.clone(), ix = reverse.index;
    for(var q = 0; q < ix.count; q += 3){ var t = ix.getX(q+1); ix.setX(q+1,ix.getX(q+2)); ix.setX(q+2,t); }
    reverse.computeVertexNormals();
    var fanBack = new T.Mesh(reverse,mat); fanBack.position.z = -.15; fanBack.raycast = function(){}; crown.add(fanBack);
    if(typeof reef3dSurface==='function') reef3dSurface(fanBack,'coral',{scale:1.15,seed:1});
    var left = leaf(41,.75,1.75,.16,2); left.position.set(-1.42,.5,.35); left.rotation.z = .2; crown.add(left);
    var right = leaf(42,.7,1.55,.16,4); right.position.set(1.35,.48,.38); right.rotation.z = -.2; crown.add(right);
    root.add(crown); landmarkFeet.push([x,z,5.7]);
  }
  reefCrown();

  // Three quieter companion gardens. All
  // remain low enough to frame the board rather than cross the camera view.
  [1, 6, 9].forEach(function(index, k){
    index = Math.min(index, n - 1);
    var s = spaces[index], prev = spaces[Math.max(0, index - 1)], next = spaces[Math.min(n - 1, index + 1)];
    var dx = next.x - prev.x, dz = next.z - prev.z, len = Math.hypot(dx, dz) || 1;
    var side = k % 2 ? -1 : 1, px = -dz / len * side, pz = dx / len * side;
    var x, z, found = false;
    for(var distance = 6.4; distance <= 9.4; distance += 1){
      x = s.x + px * distance; z = s.z + pz * distance;
      if(clear(x, z)){ found = true; break; }
    }
    if(!found) return;
    var garden = new T.Group(), landmark = k === 0 || k === 2;
    garden.position.set(x, o.groundY(x, z), z);
    garden.rotation.y = .3 + k * 1.1;
    var base = rock(k + 1, 1.25, .56, .88); garden.add(base);
    var small = rock(k + 2, .62, .36, .53); small.position.set(1.02, .02, .23); garden.add(small);
    var pebble = rock(k + 3, .48, .28, .42); pebble.position.set(-.98, .01, -.17); garden.add(pebble);
    for(var j = 0; j < 3; j++){
      var blade = leaf(k + j, landmark ? .7 : .55, (landmark ? 1.48 : 1.12) - j * .12, .12, [2, 4, 5][j]);
      blade.position.set((j - 1) * .5, .42, (j % 2) * .25 - .08);
      blade.rotation.set(.08 * (j - 1), j * .8 + k * .3, (j - 1) * -.16);
      garden.add(blade);
    }
    root.add(garden);
  });
  o.statics.add(root);
}
