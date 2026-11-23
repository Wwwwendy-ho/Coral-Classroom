/* Distant seabed for the camera's map trips. One baked, opaque mesh, created
 * once on demand and hidden at playing height. No textures, shadows or ticks.
 * The gardens are grouped into irregular shoals, with clear water between. */
function reef3dOverviewLayout(spaces, id){
  var b = spaces.bounds, main = spaces.slice(0, spaces.mainN || spaces.length);
  if(!b || !main.length) return [];
  var cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  var rx = Math.max(14, (b.maxX - b.minX) / 2), rz = Math.max(14, (b.maxZ - b.minZ) / 2);
  var seed = 137; for(var h = 0; h < id.length; h++) seed += id.charCodeAt(h) * (h + 1);
  var r = reefRand(seed), gardens = [];
  // Protect the continuous route, including branches, rather than only its
  // tile centres. Wide patches and their tallest growth stay well away.
  function clear(x, z, radius){
    var gap = 6.5 + radius;
    for(var i = 0; i < spaces.length; i++){
      var s = spaces[i], links = s.links || [];
      for(var j = 0; j < links.length; j++){
        if(links[j] < i) continue;
        var t = spaces[links[j]], dx = t.x - s.x, dz = t.z - s.z;
        var u = Math.max(0, Math.min(1, ((x - s.x) * dx + (z - s.z) * dz) / (dx * dx + dz * dz || 1)));
        var ax = x - s.x - u * dx, az = z - s.z - u * dz;
        if(ax * ax + az * az < gap * gap) return false;
      }
    }
    return true;
  }
  function put(x, z, scale, band){
    if(!clear(x, z, scale * 1.9)) return;
    for(var k = 0; k < gardens.length; k++){
      var g = gardens[k], dx = g.x - x, dz = g.z - z, room = (g.scale + scale) * 1.7;
      if(dx * dx + dz * dz < room * room) return;
    }
    gardens.push({ x:x, z:z, scale:scale, band:band, seed:r() * 20, turn:r() * Math.PI * 2 });
  }
  // A little life inside the circuit, leaving its central landmark clear.
  if(!/^(town|light|captain|caves|patterns)$/.test(id)){
    for(var a = 0; a < 12; a++){
      var ang = a / 12 * Math.PI * 2 + r() * .4;
      put(cx + Math.cos(ang) * rx * .4, cz + Math.sin(ang) * rz * .4, 1.3 + r() * .45, 0);
    }
  }
  [12, 14, 18, 20].forEach(function(count, band){
    var rings = [1.55, 2.3, 3.25, 4.5], phase = r() * Math.PI * 2;
    for(var n = 0; n < count; n++){
      var ang = phase + (n + r() * .65) / count * Math.PI * 2, ring = rings[band] + (r() - .5) * .3;
      put(cx + Math.cos(ang) * (rx + 2) * ring, cz + Math.sin(ang) * (rz + 2) * ring,
        (1.35 + band * .65) * (.8 + r() * .55), band + 1);
    }
  });
  return gardens;
}

function reef3dOverviewDress(view, root){
  var T = window.THREE, id = view.region ? view.region.id : 'cove', gardens = reef3dOverviewLayout(view.spaces, id);
  var palettes = {
    cove:['#a6c9b9','#a6d1bd','#c6acd9','#efb4ac'], town:['#419fb8','#83bba5','#d5c6a0','#99c5cf'],
    lagoon:['#45bdb9','#80c7a3','#aed7b5','#dfcfa3'], caves:['#395d83','#587ca0','#9593bb','#adc5db'],
    patterns:['#5c9bd0','#8ac5bd','#c3adde','#e5afc9'], beach:['#64cbd3','#9ccfb2','#e6d4ad','#f2e4c9'],
    light:['#5aaec0','#91bcb6','#bac9af','#dbd5ac'], captain:['#438fba','#77b3ae','#aacabc','#d6c9ab']
  };
  var pal = palettes[id] || palettes.cove, colors = pal.map(function(c){ return new T.Color(c); });
  // The Cove's outer sand and its floor share the same base before baking.
  var sand = new T.Color(id === 'cove' ? '#b9bbaa' : pal[0]);
  var positions = [], cols = [], S = 10;
  function vertex(p, c, k){ positions.push(p[0],p[1],p[2]); cols.push(c.r*k,c.g*k,c.b*k); }
  function tri(a,b,c,col,ka,kb,kc){ vertex(a,col,ka == null ? 1 : ka); vertex(b,col,kb == null ? 1 : kb); vertex(c,col,kc == null ? 1 : kc); }
  function blend(a,b,t){ return a.clone().lerp(b,t); }
  function height(x,z){
    if(view.region) return -.575;
    var f = view.floor, b = view.spaces.bounds;
    var fw = Math.max(50,b.maxX-b.minX+32), fl = Math.max(50,b.maxZ-b.minZ+32);
    if(Math.abs(x-f.position.x) < fw/2-1 && Math.abs(z-f.position.z) < fl/2-1) return view.groundY(x,z)+.035;
    return -.575;
  }
  // Low scalloped banks with finer colour contours, rather than smooth
  // ellipsoids. All detail is in this single surface, not stacked ornaments.
  function rock(x,y,z,scale,seed,col){
    var rings = [];
    for(var k=0;k<3;k++){
      var ring=[], rr=[1,.94,.38][k], hh=[0,.5,.84][k];
      for(var i=0;i<S;i++){
        var a=i/S*Math.PI*2, wobble=1+.12*Math.sin(a*3+seed)+.06*Math.cos(a*5-seed);
        ring.push([x+Math.cos(a)*scale*rr*wobble,y+scale*(hh+.05*Math.sin(a*3+seed)*k),z+Math.sin(a)*scale*rr*wobble*.72]);
      }
      rings.push(ring);
    }
    for(var j=0;j<2;j++) for(var n=0;n<S;n++){
      var next=(n+1)%S, c=blend(col,colors[3],j*.08), shade=.9+.06*Math.sin(n*1.8+seed);
      tri(rings[j][n],rings[j+1][n],rings[j][next],c,shade,1,shade);
      tri(rings[j][next],rings[j+1][n],rings[j+1][next],c,shade,1,1);
    }
    for(var t=0;t<S;t++) tri(rings[2][t],[x,y+scale*.94,z],rings[2][(t+1)%S],col,.98,1.04,.98);
  }
  // Folded coral blades / seagrass: closed, gently curving surfaces with
  // contrasting veins baked in. They read from both sides of a camera trip.
  function blade(x,y,z,scale,turn,col,wide){
    var left=[],right=[],backLeft=[],backRight=[], w=wide?.55:.19, h=wide?1.25:1.85;
    for(var k=0;k<4;k++){
      var t=k/3, width=Math.sin((.12+t*.88)*Math.PI)*w*scale+.025*scale;
      var bend=Math.sin(t*2.1)*.3*scale, yy=y+t*h*scale;
      function p(side,back){ var xx=side*width, zz=bend+(back?.045:0)*scale; return [x+xx*Math.cos(turn)+zz*Math.sin(turn),yy,z-xx*Math.sin(turn)+zz*Math.cos(turn)]; }
      left.push(p(-1,false));right.push(p(1,false));backLeft.push(p(-1,true));backRight.push(p(1,true));
    }
    for(var j=0;j<3;j++){
      tri(left[j],right[j],left[j+1],col,.85,.95,1);tri(right[j],right[j+1],left[j+1],col,.95,1.06,1);
      tri(backRight[j],backLeft[j],backLeft[j+1],col,.8,.8,.94);tri(backRight[j],backLeft[j+1],backRight[j+1],col,.8,.94,.98);
      tri(left[j],left[j+1],backLeft[j],col,.8,.9,.8);tri(backLeft[j],left[j+1],backLeft[j+1],col,.8,.9,.9);
      tri(right[j+1],right[j],backRight[j],col,1,.9,.9);tri(backRight[j+1],right[j+1],backRight[j],col,1,1,.9);
    }
  }
  function garden(g,index){
    var x=g.x,z=g.z,s=g.scale,y=height(x,z), inner=[],outer=[], patch=blend(colors[1],sand,.38);
    // The outside ring matches the seabed, keeping meadows soft-edged with
    // opaque vertex colour instead of transparent full-screen overdraw.
    for(var n=0;n<12;n++){
      var a=n/12*Math.PI*2, wobble=1+.13*Math.sin(a*3+g.seed)+.07*Math.sin(a*5-g.seed);
      var px=x+Math.cos(a)*s*1.9*wobble,pz=z+Math.sin(a)*s*1.45*wobble;
      inner.push([x+(px-x)*.62,height(x+(px-x)*.62,z+(pz-z)*.62),z+(pz-z)*.62]);
      outer.push([px,height(px,pz),pz]);
    }
    for(var t=0;t<12;t++){
      var next=(t+1)%12;
      tri([x,y,z],inner[next],inner[t],patch,.92,1,1);
      vertex(inner[t],patch,1);vertex(inner[next],patch,1);vertex(outer[t],sand,1);
      vertex(outer[t],sand,1);vertex(inner[next],patch,1);vertex(outer[next],sand,1);
    }
    // Large quiet banks in rocky regions; coral and seagrass elsewhere.
    var rocky=/^(town|caves|light|captain)$/.test(id), col=colors[rocky?2:index%2+2];
    rock(x+s*.12,y-.03,z,s*(rocky?.85:.58),g.seed,col);
    if(g.band<4 || index%2===0){
      blade(x-s*.5,y,z+s*.25,s*.65,g.turn,colors[1],false);
      if(!rocky || id==='caves') blade(x+s*.55,y,z-s*.2,s*.7,g.turn+.7,colors[id==='caves'?3:2],true);
    }
  }
  // Prepare a few gardens between frames. Building or baking the whole coast
  // in a camera frame would turn the first map trip into a visible hitch.
  var parts=[], cursor=0, total=0, alive=true;
  root.userData.overviewPending=true;root.userData.overviewCancelled=false;
  function queue(){
    if(window.requestIdleCallback) window.requestIdleCallback(step,{timeout:180});
    else setTimeout(step,16); // Safari: leave a rendering opportunity between small batches.
  }
  function step(){
    if(!alive || view.wrap && !view.wrap.isConnected){ root.userData.overviewPending=false;root.userData.overviewCancelled=true;parts.length=0;return; }
    var start=performance.now(), count=0;
    do { garden(gardens[cursor],cursor);cursor++;count++; }
    while(cursor<gardens.length && count<3 && performance.now()-start<4);
    var part=new T.BufferGeometry();
    part.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    part.setAttribute('color',new T.Float32BufferAttribute(cols,3));part.computeVertexNormals();
    reef3dBakeGeo(part,view.kit.M('#ffffff',{vertexColors:true}),view.rig);
    parts.push({position:part.attributes.position.array,color:part.attributes.color.array});
    total+=positions.length;positions=[];cols=[];part.dispose();
    if(cursor<gardens.length) return queue();
    var pos=new Float32Array(total), color=new Float32Array(total), offset=0;
    parts.forEach(function(p){pos.set(p.position,offset);color.set(p.color,offset);offset+=p.position.length;});parts.length=0;
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(color,3));geo.computeBoundingSphere();
    var mesh=new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true}));
    mesh.name='distant seabed gardens';mesh.matrixAutoUpdate=false;mesh.raycast=function(){};
    mesh.userData.gardens=gardens.length;mesh.userData.triangles=total/9;
    root.userData.overviewPending=false;root.userData.overviewReady=true;
    root.add(mesh);view.dirty=true;alive=false;
  }
  if(gardens.length) queue(); else root.userData.overviewPending=false;
}
