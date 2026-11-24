  /* Regional board scenery. The board owns the route, characters and camera; this adds
     one still, baked world around that route. All shapes share the board's materials. */
  // The shared space builder applies the regional circuit after creating its graph.
  window.regionBoardSpaces = function(zones){ return reef3dSpaces(zones, zones.region); };
  window.regionBoardDecorate = function(view, config){
    var id = config && config.id, allowed = { town: 1, lagoon: 1, caves: 1, patterns: 1, beach: 1, light: 1, captain: 1 };
    if(!allowed[id] || !view || !view.kit || !view.spaces) return;
    var T = window.THREE, M = view.kit.M, mesh = view.kit.mesh, sp = view.spaces,
        main = sp.slice(0, sp.mainN || sp.length), root = new T.Group(), geos = {}, owned = new Set();
    root.name = 'region-' + id;
    function own(g){ owned.add(g); return g; }
    function box(w,h,d){ var k = ['b',w,h,d].join(':'); return geos[k] || (geos[k] = own(new T.BoxGeometry(w,h,d))); }
    function cyl(rt,rb,h,n){ var k = ['c',rt,rb,h,n || 10].join(':'); return geos[k] || (geos[k] = own(new T.CylinderGeometry(rt,rb,h,n || 10))); }
    function cone(r,h,n){ return cyl(0,r,h,n || 7); }
    function ball(r,n){ var k = ['s',r,n || 8].join(':'); return geos[k] || (geos[k] = own(new T.SphereGeometry(r,n || 8,5))); }
    function torus(r,t){ var k = ['t',r,t].join(':'); return geos[k] || (geos[k] = own(new T.TorusGeometry(r,t,5,12))); }
    function finish(o,kind,scale){
      if(kind && typeof window.reef3dSurface==='function') window.reef3dSurface(o,kind,{scale:scale||2,seed:Math.abs(o.position.x*.37+o.position.z*.71)%7});
      return o;
    }
    function add(g,col,x,y,z,rx,ry,rz,kind){ var o = mesh(g,M(col,g.attributes.color?{vertexColors:true}:undefined),x,y,z); if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz; root.add(o); return finish(o,kind||false); }
    function block(w,h,d,col,x,y,z,ry,kind){ return add(box(w,h,d),col,x,y,z,0,ry,0,kind); }
    function post(r,h,col,x,y,z){ return add(cyl(r*.87,r,h,8),col,x,y+h/2,z,0,0,0,'timber'); }
    function orb(r,col,x,y,z,kind){ return add(ball(r),col,x,y,z,0,0,0,kind===false?false:kind||'coral'); }
    // Worn corners catch the baked sky light; one cached extrusion replaces a
    // sharp box, without adding trim pieces or individual masonry blocks.
    function wornBox(w,h,d,col,x,y,z,kind){
      var k=['w',w,h,d].join(':'), g=geos[k];
      if(!g){
        var b=Math.min(.12,w*.07,h*.07,d*.07), hw=w/2-b, hh=h/2-b, sh=new T.Shape();
        sh.moveTo(-hw+b,-hh); sh.lineTo(hw-b,-hh); sh.lineTo(hw,-hh+b); sh.lineTo(hw,hh-b);
        sh.lineTo(hw-b,hh); sh.lineTo(-hw+b,hh); sh.lineTo(-hw,hh-b); sh.lineTo(-hw,-hh+b); sh.closePath();
        g=own(new T.ExtrudeGeometry(sh,{depth:d-2*b,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:b,bevelThickness:b,curveSegments:1}));
        g.translate(0,0,-d/2+b); geos[k]=g;
      }
      return add(g,col,x,y,z,0,0,0,kind);
    }
    // Irregular horizontal ledges and broad fracture faces, rather than smooth
    // ellipsoids. Four profiles share their source geometry across the region.
    function contour(seed){
      var k='strata:'+seed, g=geos[k]; if(g) return g;
      var p=[], colors=[], idx=[], n=9, radii=[.79,1,.88,.56], heights=[-.55,-.28,.2,.55];
      for(var ring=0;ring<4;ring++) for(var a=0;a<n;a++){
        var ang=a*Math.PI*2/n, wobble=.87+.08*Math.sin(a*2.7+seed)+.04*Math.cos(a*4.3+seed*2), r=radii[ring]*wobble;
        p.push(Math.cos(ang)*r+.01*Math.sin(ring+seed),heights[ring]+.055*Math.sin(a*2+seed+ring*.8),Math.sin(ang)*r);
        var shade=[.81,.93,.84,1][ring]*(1+.025*Math.sin(a+seed)); colors.push(shade,shade,shade);
      }
      for(ring=0;ring<3;ring++) for(a=0;a<n;a++){ var b=ring*n+a,c=ring*n+(a+1)%n; idx.push(b,b+n,c,c,b+n,c+n); }
      for(a=1;a<n-1;a++) idx.push(0,a,a+1,3*n,3*n+a+1,3*n+a);
      g=own(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.setAttribute('color',new T.Float32BufferAttribute(colors,3)); g.setIndex(idx);
      var flat=own(g.toNonIndexed()); flat.computeVertexNormals(); geos[k]=flat; return flat;
    }
    var cx=0, cz=0;
    main.forEach(function(s){ cx+=s.x; cz+=s.z; }); cx/=main.length; cz/=main.length;
    function frame(s){
      var i=s.i, prev=main[(i+main.length-1)%main.length], next=main[(i+1)%main.length];
      var dx=next.x-prev.x, dz=next.z-prev.z, len=Math.hypot(dx,dz)||1, nx=-dz/len, nz=dx/len;
      if(nx*(s.x-cx)+nz*(s.z-cz)<0){ nx=-nx; nz=-nz; }
      return {nx:nx,nz:nz,tx:dx/len,tz:dz/len};
    }
    function at(s,side,dist,dz){ var f=frame(s); return [s.x+side*(dist||5)*f.nx+(dz||0)*f.tx,-.27,s.z+side*(dist||5)*f.nz+(dz||0)*f.tz]; }
    function placed(s,side,dist,dz,fn){ var p=at(s,side,dist,dz); fn(p[0],p[1],p[2]); }
    function pathSide(s,i){ return i%2 ? 1 : -1; }
    function foundations(col){
      main.forEach(function(s,i){ if(i%2) return; add(cyl(1.75,1.9,.12,12),col,s.x,(s.y||0)-.16,s.z).userData.reefGround=true; });
    }
    function lantern(x,y,z,col){
      post(.07,2.2,'#50445d',x,y,z); add(cyl(.42,.24,.52,6),'#744f64',x,y+2.16,z);
      orb(.24,col,x,y+2.16,z,false); add(cone(.48,.24,6),'#4c5367',x,y+2.55,z,0,0,0,'roof');
    }
    function crystal(x,y,z,scale,col){
      add(cyl(0,.43*scale,1.8*scale,5),col,x,y+.9*scale,z,0,(x+z)*.2,.16);
      add(cone(.23*scale,.72*scale,5),'#d8f7fb',x+.27*scale,y+.4*scale,z+.17*scale,0,0,-.32);
    }
    function coral(x,y,z,k,col){
      finish(post(.13*k,1.5*k,col,x,y,z),'coral');
      for(var a=0;a<3;a++){ var ang=a*2.094+.3, bx=x+Math.cos(ang)*.45*k, bz=z+Math.sin(ang)*.45*k;
        add(cyl(.04*k,.1*k,1.15*k,5),col,bx,y+.85*k,bz,Math.sin(ang)*.42,0,Math.cos(ang)*-.42,'coral');
        orb(.12*k,'#ffe3d5',bx+Math.cos(ang)*.15*k,y+1.48*k,bz+Math.sin(ang)*.15*k);
      }
    }
    function pebble(x,y,z,r,col){
      var p=add(cyl(r*.85,r,.14,7),col,x,y+.06,z,0,(x+z)*.43);
      p.scale.z=.67; return p;
    }
    function seaGrass(x,y,z,k,col){
      for(var j=0;j<4;j++){
        var q=(j-1.5)*.19, blade=add(cone(.09*k,(.65+(j%3)*.19)*k,5),col,x+q,y+.39*k,z+(j%2)*.16,0,0,0,false);
        blade.rotation.z=q*.9;
      }
    }
    function organicRock(x,y,z,sx,sy,sz,col,kind){
      var seed=Math.abs(Math.floor(x*.7+z*.3))%4, o=add(contour(seed),col,x,y+sy*.55,z,0,Math.sin(z)*.22,0,kind||'stone');
      o.scale.set(sx,sy,sz); return o;
    }
    var propSources={};
    function kitProp(kind,x,y,z,size,rot){
      var o=null, names={rock:'rock1',plant:'plant',clam:'clam'};
      if(view.models && names[kind]) o=reef3dModel(view.models,names[kind],size,view.kit.grad);
      if(!o && kind==='brain'){
        // Most of this coral's identity is the meandering pore finish. A broad
        // lobed dome replaces the old detail-4 icosahedron at every garden.
        if(!propSources.brain){
          var g=own(new T.SphereGeometry(1,16,8)), p=g.attributes.position;
          for(var i=0;i<p.count;i++){ var ax=p.getX(i),ay=p.getY(i),az=p.getZ(i), r=1+.045*Math.sin(ax*10+az*5)*Math.cos(ay*8); p.setXYZ(i,ax*r,ay*r,az*r); }
          g.computeVertexNormals(); var dome=mesh(g,M('#ef9a86'),0,.55,0); dome.scale.set(1.1,.78,1.1); propSources.brain=new T.Group(); propSources.brain.add(dome);
        }
        o=propSources.brain.clone(); o.scale.multiplyScalar(size);
      }
      if(!o && view.kit.B && view.kit.B[kind]){
        if(!propSources[kind]){ propSources[kind]=view.kit.B[kind](function(){ return .43; }); propSources[kind].traverse(function(p){ if(p.geometry) own(p.geometry); }); }
        o=propSources[kind].clone(); o.scale.multiplyScalar(size);
      }
      if(o){ o.position.set(x,y,z); o.rotation.y=rot||0; root.add(o);
        // Large rock/coral masses earn surface detail; fine fans, grass and
        // decorative silhouettes keep their painted shading and smaller buffers.
        if(kind==='rock'||kind==='brain'||kind==='clam')o.traverse(function(p){ if(p.isMesh) finish(p,kind==='rock'?'stone':'coral'); });
      }
      return o;
    }
    function ropeCoil(x,y,z){
      for(var j=0;j<3;j++) add(torus(.38+j*.09,.045),'#dcc28a',x,y+j*.065,z,Math.PI/2,0,0,'rope');
    }
    function canvasPanel(x,y,z){
      // A shallow wind-filled belly reads as heavy sailcloth even at a distance.
      // Closed edges retain the single opaque front-sided surface material.
      var p=[], idx=[], side,u,v,n=4;
      for(side=0;side<2;side++) for(v=0;v<=n;v++) for(u=0;u<=n;u++)
        p.push((u/n-.5)*2.5,(v/n-.5)*4,.32*Math.sin(u*Math.PI/n)*Math.sin(v*Math.PI/n)+(side?-.055:.055));
      for(side=0;side<2;side++) for(v=0;v<n;v++) for(u=0;u<n;u++){
        var a=side*25+v*5+u,b=a+5;
        if(side) idx.push(a,b,a+1,b,b+1,a+1); else idx.push(a,a+1,b,b,a+1,b+1);
      }
      var edge=[0,1,2,3,4,9,14,19,24,23,22,21,20,15,10,5];
      for(u=0;u<edge.length;u++){ var edgeA=edge[u],edgeB=edge[(u+1)%edge.length]; idx.push(edgeA,edgeB,edgeA+25,edgeB,edgeB+25,edgeA+25); }
      var g=own(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.setIndex(idx); g.computeVertexNormals();
      return add(g,'#f3dfb1',x,y,z,0,0,0,'fabric');
    }
    function harborBoat(x,z,n){
      var sh=new T.Shape(); sh.moveTo(-.67,-1.4); sh.lineTo(.67,-1.4);
      sh.lineTo(1,0); sh.lineTo(.67,1.4); sh.lineTo(-.67,1.4); sh.lineTo(-1,0); sh.closePath();
      var hull=own(new T.ExtrudeGeometry(sh,{depth:.42,bevelEnabled:false})); hull.rotateX(-Math.PI/2);
      add(hull,n%2?'#c66f56':'#487e89',x,-.42,z,0,0,0,'timber');
      block(1.38,.08,2.25,'#d8be8c',x,-.03,z,0,'timber');
      [-1,1].forEach(function(sd){ block(.12,.12,2.6,'#f5e7be',x+sd*.72,.08,z,0,'timber'); });
      post(.055,2.6,'#795d49',x,-.02,z);
      var sail=own(new T.BufferGeometry()); sail.setAttribute('position',new T.Float32BufferAttribute([
        0,.35,0, 0,2.35,0, .9,.35,0,
        0,.35,0, -.68,.35,0, 0,1.65,0
      ],3)); sail.computeVertexNormals();
      var canvas=mesh(sail,M(n%2?'#fff1cf':'#f7d9bf',{side:T.DoubleSide}),x,-.02,z); root.add(canvas); finish(canvas,'fabric',1.8);
      block(.1,.07,.36,'#efb665',x,.55,z+.95);
    }
    // A water plane is below every region. Land follows the route, with real edges
    // instead of the same rectangular floor in seven colours.
    var bounds=sp.bounds || {minX:-30,maxX:30,minZ:-30,maxZ:30};
    if(view.floor) view.floor.visible=false;
    var water=block(bounds.maxX-bounds.minX+35,.08,bounds.maxZ-bounds.minZ+35,{town:'#419fb8',lagoon:'#45bdb9',caves:'#395d83',patterns:'#5c9bd0',beach:'#64cbd3',light:'#5aaec0',captain:'#438fba'}[id],(bounds.minX+bounds.maxX)/2,id==='captain'?-1.1:-.66,(bounds.minZ+bounds.maxZ)/2,0,false);
    water.userData.reefGround=true;
    if(view.wrap) view.wrap.classList.add('region-'+id);
    // Large floors keep their colour and construction in the baked geometry.
    // A shared world grid gives paving staggered joints and deck planks a single
    // longitudinal direction, even where the route bends around the harbour.
    function painted(polygons,y,col,kind){
      var p=[],c=[],base=new T.Color(col);
      polygons.forEach(function(poly){
        for(var n=1;n<poly.length-1;n++){
          var a=poly[0],b=poly[n],d=poly[n+1],up=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
          [a,up>0?d:b,up>0?b:d].forEach(function(v){
          p.push(v[0],y,v[1]);
          var shade=v[2]===undefined?1:v[2]; c.push(base.r*shade,base.g*shade,base.b*shade);
        });}
      });
      var g=own(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(c,3)); g.computeVertexNormals();
      var o=add(g,'#ffffff',0,0,0,0,0,0,false); o.userData.reefStructure=kind; o.userData.reefGround=true; return o;
    }
    function clipped(poly,axis,limit,greater){
      var out=[];
      for(var i=0;i<poly.length;i++){
        var a=poly[i],b=poly[(i+1)%poly.length],aa=greater?a[axis]>=limit:a[axis]<=limit,bb=greater?b[axis]>=limit:b[axis]<=limit;
        if(aa) out.push(a);
        if(aa!==bb){var t=(limit-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      }
      return out;
    }
    function pattern(polygons,y,wood){
      var out=[],w=wood?6.4:2.8,h=wood?1.15:1.75,gap=wood?.035:.055;
      polygons.forEach(function(poly){
        var xs=poly.map(function(p){return p[0];}),zs=poly.map(function(p){return p[1];});
        for(var row=Math.floor(Math.min.apply(null,zs)/h);row<=Math.floor(Math.max.apply(null,zs)/h);row++){
          var shift=(row%2)*w/2;
          for(var col=Math.floor((Math.min.apply(null,xs)-shift)/w);col<=Math.floor((Math.max.apply(null,xs)-shift)/w);col++){
            var x=col*w+shift,z=row*h,q=clipped(poly,0,x+gap,true);
            q=clipped(q,0,x+w-gap,false);q=clipped(q,1,z+gap,true);q=clipped(q,1,z+h-gap,false);
            if(q.length<3)continue;
            var tone=.94+.035*Math.sin(row*13+col*7), minZ=z+gap;
            out.push(q.map(function(v){return [v[0],v[1],tone+.045*(v[1]-minZ)/h+.025*(v[0]-cx)/(bounds.maxX-bounds.minX+1)];}));
          }
        }
      });
      return painted(out,y,wood?'#b78d65':'#c7beaa',wood?'longitudinal-planks':'staggered-paving');
    }
    function contact(x,z,rx,rz,y){
      var ring=[],n=10;
      // Opaque concentric faces: the rim shares the ground value, the small
      // central patch is darkest. No alpha, shadows, extra lights or updates.
      for(var i=0;i<n;i++){
        var a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
        ring.push([[x,z,.68],[x+Math.cos(a)*rx,z+Math.sin(a)*rz,1],[x+Math.cos(b)*rx,z+Math.sin(b)*rz,1]]);
      }
      return painted(ring,y,id==='captain'?'#ac8058':'#c4bba7','contact-patch');
    }
    function strip(left,right,top,edge,depth){
      var pos=[],colors=[],idx=[],deckY=-.32,
          filled=id==='caves'||id==='patterns'||id==='light',
          widths={town:[3.2,10.5],caves:[4,6.5],patterns:[3,5],beach:[4,6.5],light:[4,8]},
          innerWidth=widths[id][0],outerWidth=widths[id][1],inner=[],outer=[],tops=[],wet=[];
      main.forEach(function(s,k){
        var f=frame(s),l=[s.x-f.nx*innerWidth,s.z-f.nz*innerWidth],r=[s.x+f.nx*outerWidth,s.z+f.nz*outerWidth];
        inner.push(l);outer.push(r);
        pos.push(l[0],deckY,l[1],r[0],deckY,r[1],l[0],deckY-(depth||.6),l[1],r[0],deckY-(depth||.6),r[1]);
        var broad=.96+.045*Math.sin(k/main.length*Math.PI*2);
        [broad, broad*.85, .69,.61].forEach(function(v){colors.push(v,v,v);});
      });
      function topTriangle(a,b,c){
        if((pos[b*3]-pos[a*3])*(pos[c*3+2]-pos[a*3+2])-(pos[b*3+2]-pos[a*3+2])*(pos[c*3]-pos[a*3])>0)idx.push(a,c,b);
        else idx.push(a,b,c);
      }
      for(var k=0;k<main.length;k++){
        var next=(k+1)%main.length,a=k*4,b=next*4;
        topTriangle(a,a+1,b+1);topTriangle(a,b+1,b);
        idx.push(a+1,a+3,b+3,a+1,b+3,b+1);
        if(!filled)idx.push(a+2,a,b,b+2,a+2,b);
        tops.push([inner[k],outer[k],outer[next],inner[next]]);
        // A broad, opaque damp edge has a bright inner lip and a dark waterline.
        function damp(u,v){return [u[0]+(v[0]-u[0])*.965,u[1]+(v[1]-u[1])*.965,1];}
        wet.push([damp(inner[k],outer[k]),[outer[k][0],outer[k][1],.76],[outer[next][0],outer[next][1],.76],damp(inner[next],outer[next])]);
        if(k%2===0){var s=main[k],f=frame(s),p=at(s,1,outerWidth,0),q=at(s,-1,innerWidth,0),angle=Math.atan2(f.tx,f.tz);
          block(.22,.12,2.8,edge,p[0],deckY+.03,p[2],angle,false);
          if(!filled)block(.22,.12,2.8,edge,q[0],deckY+.03,q[2],angle,false);
        }
      }
      var geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
      var floor=add(geo,id==='town'?'#a59b87':top,0,0,0,0,0,0,false);floor.userData.reefStructure='broad-ground';floor.userData.reefGround=true;
      if(id==='town')pattern(tops,deckY+.006,false);
      if(id!=='light')painted(wet,deckY+.012,top,'wet-shore');
      if(filled){
        var shape=new T.Shape();inner.forEach(function(p,i){if(i)shape.lineTo(p[0],-p[1]);else shape.moveTo(p[0],-p[1]);});shape.closePath();
        var fill=own(new T.ShapeGeometry(shape));fill.rotateX(-Math.PI/2);
        var fp=fill.attributes.position,fc=[];for(var v=0;v<fp.count;v++){var value=.97+.045*(fp.getX(v)-cx)/(bounds.maxX-bounds.minX+1);fc.push(value,value,value);}
        fill.setAttribute('color',new T.Float32BufferAttribute(fc,3));
        var interior=add(fill,top,0,deckY,0,0,0,0,false);interior.userData.reefStructure='broad-ground';interior.userData.reefGround=true;
      }
    }
    function shipGround(){
      var xs=main.map(function(s){return s.x;}),zs=main.map(function(s){return s.z;}),
          min=Math.min.apply(null,xs)-4.6,max=Math.max.apply(null,xs)+4.2,
          low=Math.min.apply(null,zs)-5.8,high=Math.max.apply(null,zs)+5.8;
      var poly=[[min,low+2.8],[min+3,low],[max-3.5,low],[max+3.2,cz],[max-3.5,high],[min+3,high],[min,high-2.8]];
      // Counter-clockwise polygon, closed hull sides, pointed eastern bow and
      // a wide transom at the stern. The learning circuit remains unchanged.
      for(var i=0;i<poly.length;i++){
        var a=poly[i],b=poly[(i+1)%poly.length];
        var g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute([a[0],-.13,a[1],b[0],-.13,b[1],a[0]*.94+cx*.06,-1.65,a[1]*.9+cz*.1,b[0]*.94+cx*.06,-1.65,b[1]*.9+cz*.1],3));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
        var hull=add(g,i%2?'#644738':'#76503b',0,0,0,0,0,0,false);hull.userData.reefStructure='ship-hull';
        var dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
        var beam=block(.13,.16,length,'#dec49a',(a[0]+b[0])/2,.82,(a[1]+b[1])/2,angle,false);beam.userData.reefStructure='ship-rail';
        for(var j=0;j<Math.ceil(length/4);j++){var t=j/Math.ceil(length/4);post(.075,.96,'#79583f',a[0]+dx*t,-.12,a[1]+dz*t);}
      }
      painted([poly],-.13,'#694b35','broad-ground');pattern([poly],-.12,true);
      // A small raised stern platform shares the deck's plank axes and sits
      // beyond the westmost tile, leaving the entire circuit and branches clear.
      var stern=[[min+.2,low+3.3],[min+2.5,low+1.3],[min+2.5,high-1.3],[min+.2,high-3.3]];
      painted([stern],.42,'#775438','raised-stern');pattern([stern],.43,true);
      block(2.3,.55,high-low-6.6,'#775438',min+1.35,.145,cz,0,false).userData.reefGround=true;
      view.regionShipBounds={minX:min,maxX:max+3.2,minZ:low,maxZ:high};
    }
    if(id==='town') strip(4,4,'#c5bba5','#777e79',.8);
    else if(id==='lagoon') main.forEach(function(s,i){
      add(cyl(i%3===0?2.2:1.6,i%3===0?2.4:1.75,.26,11),'#c7d8ae',s.x,-.37,s.z).userData.reefGround=true;
      add(cyl(i%3===0?1.85:1.35,i%3===0?2:1.5,.06,11),'#dfdab7',s.x,-.21,s.z).userData.reefGround=true;
    });
    else if(id==='caves') strip(4,4,'#657987','#3d5d6d',.8);
    else if(id==='patterns') strip(4,4,'#8bb8ae','#5a9d9c',1.1);
    else if(id==='beach') strip(4,4,'#efd8a5','#f8edcf',.45);
    else if(id==='light') strip(4,4,'#9da99b','#687d78',2.7);
    else if(id==='captain') shipGround();
    function town(){
      // Tile foundations were hidden by the route; spend that geometry on the street.

      for(var boat=1;boat<main.length;boat+=9) placed(main[boat],-1,6.5,0,function(x,y,z){ harborBoat(x,z,boat); });
      function shop(x,y,z,n){
        var variant=Math.floor(n/6), wall=variant%3===0?'#f5dbc1':variant%3===1?'#d8e6dd':'#e8d5d5', roof=variant%2?'#335b72':'#aa4e58';
        contact(x,z,2.7,3.15,-.301);
        wornBox(4.05,2.9,4.25,wall,x,y+1.45,z,'plaster');
        wornBox(4.4,.2,4.45,roof,x,y+2.98,z,'timber');
        // Sloped roofs and deep eaves make a recognizable harbor street.
        block(4.55,.17,2.55,roof,x,y+3.36,z-1.05,0,'roof'); root.children[root.children.length-1].rotation.x=-.31;
        block(4.55,.17,2.55,roof,x,y+3.36,z+1.05,0,'roof'); root.children[root.children.length-1].rotation.x=.31;
        block(4.7,.14,.16,'#243d50',x,y+3.76,z,0,'roof');
        // Broad roof courses live in the atlas; deep eaves carry the silhouette.
        block(4.45,.18,.25,'#e7b889',x,y+2.68,z+2.18);
        wornBox(.95,1.68,.12,'#7c5245',x,y+.83,z+2.16,'timber');
        block(.25,.15,.13,'#eacb80',x+.29,y+.84,z+2.25);
        [-1,1].forEach(function(sd){
          block(.69,.78,.13,'#47758a',x+sd*1.25,y+1.75,z+2.17);
          block(.79,.09,.2,'#f0be84',x+sd*1.25,y+2.18,z+2.22);
          block(.1,.82,.2,'#f0be84',x+sd*1.25,y+1.75,z+2.24);
          block(.65,.3,.12,'#78968c',x+sd*1.25,y+.47,z+2.24);
        });
        block(2.1,.42,.14,n%2?'#b84e65':'#547c87',x,y+2.36,z+2.27);
        for(var aw=-1;aw<=1;aw++) block(.67,.12,.88,aw===0?'#f7e2b7':roof,x+aw*.72,y+2.13,z+2.65,0,'fabric');
        block(3.8,.12,.9,'#ad9e84',x,y+.07,z+2.53);
        if(variant===0){
          // The fish market keeps the same footprint as a shop. Its raised bell
          // roof, open counter and fish sign give the harbour a single anchor.
          wornBox(1.65,2.45,1.65,'#edd4ac',x,y+4.8,z,'plaster');
          [-1,1].forEach(function(sd){post(.08,.95,'#4b6570',x+sd*.51,y+5.6,z+.62);});
          add(cyl(.26,.38,.46,8),'#d9aa59',x,y+6.12,z+.62,0,0,0,false);
          add(cone(1.2,.85,4),'#366878',x,y+6.85,z,0,Math.PI/4,0,'roof');
          add(cyl(.46,.46,.08,16),'#fff2d1',x,y+4.9,z+.88,Math.PI/2,0,0,false);
          block(.06,.32,.06,'#486574',x,y+5.02,z+.94,0,false);
          block(.25,.06,.06,'#486574',x+.09,y+4.9,z+.94,0,false);
          block(3.3,.7,.58,'#688a89',x,y+.44,z+2.7,0,false);
          var fish=orb(.34,'#dae2cc',x,y+2.4,z+2.4,false);fish.scale.set(1.6,.55,.22);
          add(cone(.25,.4,3),'#dae2cc',x-.62,y+2.4,z+2.4,0,0,-Math.PI/2,false);
        }else if(variant%2){
          // A small chimney changes the second roofline, without street clutter.
          block(.6,1.1,.65,'#eee1c6',x-1.2,y+3.85,z-.55,0,false);
          block(.78,.14,.83,'#56707b',x-1.2,y+4.46,z-.55,0,false);
        }
        lantern(x+2.7,y,z+1.3,'#ffd58c');
      }
      main.forEach(function(s,i){ if(i%6!==1) return; placed(s,1,7.5,0,function(x,y,z){ shop(x,y,z,i); }); });
      main.forEach(function(s,i){ if(i%2) return; placed(s,-1,3.4,0,function(x,y,z){
        if(i%4===0)pebble(x,y,z,.5,'#eee1c8');
      }); });
      for(var k=4;k<main.length;k+=9) placed(main[k],1,5.7,0,function(x,y,z){
        wornBox(3.1,.18,2.2,'#936443',x,y+.1,z,'timber');
        post(.12,2.5,'#754c38',x-1.3,y,z); post(.12,2.5,'#754c38',x+1.3,y,z);
        block(2.8,.16,.14,'#e8cc9c',x,y+2.45,z);
        wornBox(.8,.73,.8,'#b8784e',x-.75,y+.55,z-.2,'timber');
        add(cyl(.44,.49,.85,8),'#987052',x+.65,y+.53,z+.2,0,0,0,'timber');
        ropeCoil(x,y+.26,z+.9);
      });
    }
    function lagoon(){
      foundations('#7fbdad');
      function reeds(x,y,z){ for(var j=0;j<5;j++){ var dx=(j-2)*.25, h=1.7+(j%3)*.37;
        add(cyl(.025,.05,h,5),'#408970',x+dx,y+h/2,z+(j%2)*.18,0,0,dx*.23,false);
        add(cyl(.075,.09,.37,6),'#ac8251',x+dx+dx*.12,y+h-.1,z+(j%2)*.18,0,0,0,false);
      } }
      main.forEach(function(s,i){ if(i%3!==0) return; var sd=pathSide(s,i);
        placed(s,sd,4.4,0,function(x,y,z){
          organicRock(x,y-.04,z,1.35,.24,1.2,'#8cb9a4');
          organicRock(x+.35,y+.15,z+.35,.91,.18,.83,'#e4d7a8','sand');
          reeds(x-1.3,y,z-.5);
          seaGrass(x+.8,y+.12,z-.6,.75,'#52957f');
          pebble(x-.6,y+.1,z+.8,.3,'#f0d8a8');
          if(i%2===0){ orb(.34,'#f9a8c4',x+.45,y+.48,z-.3); orb(.18,'#ffe4b3',x+.55,y+.78,z-.28); }
        });
        placed(s,-sd,5.4,1,function(x,y,z){ reeds(x,y,z); reeds(x+1,y,z+.6); });
      });
      for(var lp=2;lp<main.length;lp+=5){ var ls=main[lp], d=pathSide(ls,lp);
        placed(ls,d,7.6,-1.3,function(x,y,z){
          organicRock(x,y-.07,z,2.2,.3,1.9,'#c2cda9');
          organicRock(x,y+.22,z,1.48,.13,1.35,'#f2dbb4','sand');
          coral(x+.6,y+.36,z-.25,.8,'#e38b91');
          seaGrass(x-.8,y+.33,z+.45,1.1,'#3f997f');
        });
      }
      for(var k=4;k<main.length;k+=8) placed(main[k],-pathSide(main[k],k),6,0,function(x,y,z){
        post(.17,2.6,'#7a604d',x-1.4,y,z); post(.17,2.6,'#7a604d',x+1.4,y,z);
        block(3,.19,.55,'#b59568',x,y+2.45,z); block(2.6,.13,.44,'#5b907e',x,y+2.15,z);
      });
      placed(main[2],1,7,0,function(x,y,z){
        add(cyl(2.1,2.45,.27,10),'#dfd5ae',x,y,z);
        [-1,1].forEach(function(sd){ post(.14,2.5,'#987456',x+sd*1.35,y,z+sd*.7); });
        add(cone(2.2,1.2,8),'#d58a72',x,y+2.9,z,0,0,0,'fabric');
      });
    }
    function caves(){
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#284353':'#83b5c9'); view.scene.fog.near=17; view.scene.fog.far=47; }
      foundations('#7b93a3');
      for(var i=2;i<main.length;i+=5) placed(main[i],1,7.5,0,function(x,y,z){
        organicRock(x,y,z,2.2,3.8,2.2,'#405a6b'); crystal(x,y,z,1,'#90e4d8');
      });
      main.forEach(function(s,i){ if(i%3!==1) return; var sd=pathSide(s,i);
        placed(s,sd,4.6,0,function(x,y,z){ crystal(x,y,z,1.25,i%2?'#79d5dc':'#aaa7e9'); crystal(x+1,y,z+.65,.65,'#c5eaff'); });
        placed(s,-sd,5.2,-1,function(x,y,z){
          add(cone(.8,2,7),'#556878',x,y+1,z); crystal(x+.8,y,z,.58,'#8de4e4');
        });
      });
      for(var c=1;c<main.length;c+=4){ var v=main[c];
        for(var p=0;p<4;p++) pebble(v.x+(p-1.5)*.5,-.24,v.z-1.2-(p%2)*.48,.13+p*.07,p%2?'#8fa4a8':'#a3a4c3');
      }
    }
    function patterns(){
      function garden(x,y,z,i){
        organicRock(x,y-.2,z,2.2,.75,1.6,'#669f9d','coral');
        organicRock(x-.9,y+.3,z-.6,1,.45,.8,'#a8c4ad','coral');
        kitProp('brain',x-.55,y+.35,z+.45,1.2);
        kitProp('staghorn',x+.8,y+.23,z-.45,1.2);
        var fan=kitProp('fan',x-1.3,y+.32,z-.35,1.3); if(fan) fan.rotation.y=.25;
        kitProp('anemone',x+.3,y+.38,z+1,.85);
        if(i%2) kitProp('clam',x+1.35,y+.26,z+.65,.7);
      }
      main.forEach(function(s,i){ if(i%4) return;
        placed(s,1,6,0,function(x,y,z){ garden(x,y,z,i); });
      });
    }
    function beach(){
      foundations('#f2dcad');
      function palm(x,y,z,i,small){
        var scale=small||1, h=(3.8+(i%3)*.45)*scale;
        add(cyl(.16,.25,h,8),'#a77b54',x,y+h/2,z,0,0,.11,'timber');
        orb(.38*scale,'#c79c68',x+.22*scale,y+h,z);
        for(var j=0;j<6;j++){ var a=j*Math.PI/3;
          var leaf=add(cone(.45*scale,2.3*scale,5),j%2?'#5eaa76':'#3a9277',x+.22*scale+Math.cos(a)*1.05*scale,y+h-.2*scale,z+Math.sin(a)*1.05*scale,0,0,0,false);
          leaf.rotation.z=Math.cos(a)*1.18; leaf.rotation.x=-Math.sin(a)*1.18;
        }
        for(var c=0;c<3;c++) orb(.16*scale,'#9a7045',x+.22*scale+(c-1)*.2*scale,y+h-.38*scale,z+.18*scale);
      }
      function bottle(x,y,z){
        add(cyl(.27,.33,.75,10),'#8fc9bb',x,y+.45,z,0,0,.36,false);
        add(cyl(.11,.11,.32,10),'#addbd0',x-.15,y+.91,z,0,0,.36,false);
        add(cyl(.12,.12,.12,8),'#b98754',x-.2,y+1.09,z,0,0,.36,'timber');
        block(.42,.3,.06,'#fff0d0',x,y+.48,z+.27,.36,'fabric');
      }
      main.forEach(function(s,i){ if(i%4!==0) return; var sd=1;
        placed(s,sd,5.5,0,function(x,y,z){ palm(x,y,z,i); bottle(x+1.3,y,z+.8); });
        placed(s,-sd,4.7,1,function(x,y,z){
          organicRock(x,y-.05,z,1.7,.38,1.5,'#eac991','sand');
          for(var j=0;j<3;j++) orb(.22,['#e58f87','#f7e3bc','#e8ad78'][j],x-.6+j*.52,y+.39,z+.4);
          seaGrass(x-1.3,y+.2,z-.7,.72,'#7dac77');
        });
      });
      main.forEach(function(s,i){ if(i%3!==2) return;
        placed(s,-1,3.7,-.7,function(x,y,z){
          pebble(x,y,z,.35,'#f5b2a0'); pebble(x-.7,y,z+.35,.2,'#f7f0d0');
          seaGrass(x+.7,y,z-.45,.55,'#79aa7d');
        });
      });
    }
    function light(){
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#365565':'#a9dfe5'); view.scene.fog.far=55; }
      foundations('#b9b8aa');
      function cliff(x,y,z,i){
        var h=2.5+(i%3)*.75;
        organicRock(x,y-.05,z,2.55,h*.87,2.1,'#7d8d8d');
        organicRock(x,y+h-.04,z,2.3,.3,2.25,'#b7b8a5');
        for(var j=0;j<3;j++) add(cone(.46,1.1,6),'#5f8584',x+(j-1)*1.1,y+h+.63,z+.7);
      }
      main.forEach(function(s,i){ if(i%5!==1) return; placed(s,-1,6.1,0,function(x,y,z){ cliff(x,y,z,i); }); });
      main.forEach(function(s,i){ if(i%4!==0) return;
        placed(s,-1,4.3,-.3,function(x,y,z){
          pebble(x,y+.1,z,.7,'#b6b9a7');
          seaGrass(x-.7,y+.19,z+.5,.72,'#608b77');
        });
      });
      var mid=main[Math.min(3,main.length-1)] || main[0];
      if(mid) (function(x,y,z){
        var first=root.children.length;
        add(cyl(3,3.5,3.2,12),'#747f81',x,y+1.6,z);
        add(cyl(2.7,2.85,.35,12),'#e4d9be',x,y+3.37,z);
        for(var q=0;q<6;q++){
          var ledgeAngle=q*Math.PI/3;
          block(1.1,.14,.34,'#a5aaa1',x+Math.cos(ledgeAngle)*2.3,y+1.1,z+Math.sin(ledgeAngle)*2.3,ledgeAngle);
        }
        for(var l=0;l<5;l++) add(cyl(l%2?1.1:1.18,l%2?1.12:1.2,1.08,12),l%2?'#d75d5d':'#fff0dc',x,y+4.1+l*1.07,z);
        add(cyl(1.5,1.5,.26,12),'#384f5c',x,y+9.55,z);
        add(cyl(1.05,1.05,1.15,12),'#ffe09b',x,y+10.24,z,0,0,0,false);
        for(var k=0;k<6;k++){ var a=k*Math.PI/3; post(.06,1.08,'#354e60',x+Math.cos(a)*1.06,y+9.65,z+Math.sin(a)*1.06); }
        add(cone(1.68,.83,12),'#c9545e',x,y+11.22,z,0,0,0,'roof');
        var tower=new T.Group(), origin=new T.Vector3(x,y,z);
        root.children.slice(first).forEach(function(part){ part.position.sub(origin); tower.add(part); });
        tower.position.copy(origin); tower.scale.setScalar(.54); root.add(tower);
      }).apply(null,at(mid,1,7,0));
    }
    function captain(){
      main.forEach(function(s,i){ if(i%6) return;
        placed(s,1,5.2,0,function(x,y,z){
          post(.13,1.3,'#704d36',x,y,z); ropeCoil(x,y+.08,z);
        });
      });
      // Keep the mast in the open deck interior and clear of the perimeter tiles.
      contact(cx,cz,1.3,1.1,-.107);
      post(.25,7,'#6e5139',cx,-.12,cz);
      block(3,.12,.12,'#b99866',cx+1,5.88,cz,0,'timber');
      canvasPanel(cx+1.1,3.68,cz);
    }
    ({ town:town, lagoon:lagoon, caves:caves, patterns:patterns, beach:beach, light:light, captain:captain })[id]();
    if(view.scene.fog && view.scene.background && view.scene.background.isColor)
      view.scene.background.copy(view.scene.fog.color);
    // Chunked baked meshes use the same fast path and fog as the original board scenery.
    var merged = reef3dMerge(root,view.rig,view.bake);
    // The bake clones its inputs. Release only geometries created here; kit and
    // imported model geometry belongs to their own caches. Fallback keeps root.
    if(merged!==root && !root.parent) owned.forEach(function(g){ g.dispose(); });
    merged.name = root.name; view.scene.add(merged);
    view.regionScenery = merged;
  };
