  /* Regional board scenery. The board owns the route, characters and camera; this adds
     one still, baked world around that route. All shapes share the board's materials. */
  // The shared space builder applies the regional circuit after creating its graph.
  window.regionBoardSpaces = function(zones){ return reef3dSpaces(zones, zones.region); };
  var _cabinSunbeamTexCache = null;
  function getCabinSunbeamTex(T){
    if(_cabinSunbeamTexCache) return _cabinSunbeamTexCache;
    var beamTex=null, sheenTex=null;
    if(T && typeof document!=='undefined' && typeof document.createElement==='function'){
      var bc=document.createElement('canvas'); bc.width=64; bc.height=128;
      var bg=bc.getContext && bc.getContext('2d');
      if(bg){
        var bImg=bg.createImageData(64,128), bd=bImg.data;
        for(var py=0;py<128;py++){
          var v=1-py/127, vy=v<0.2?(v/0.2):Math.max(0,1-(v-0.2)/0.8);
          for(var px=0;px<64;px++){
            var u=px/63, hx=Math.pow(Math.sin(Math.PI*u),2.0), a=Math.min(1,hx*vy);
            var idx=(py*64+px)*4; bd[idx]=255; bd[idx+1]=244; bd[idx+2]=196; bd[idx+3]=Math.round(a*255);
          }
        }
        bg.putImageData(bImg,0,0);
        beamTex=new T.CanvasTexture(bc);
      }
      var sc=document.createElement('canvas'); sc.width=64; sc.height=64;
      var sg=sc.getContext && sc.getContext('2d');
      if(sg){
        var gr=sg.createRadialGradient(32,32,4,32,32,32);
        gr.addColorStop(0,'rgba(255,244,204,1)'); gr.addColorStop(0.6,'rgba(255,244,204,0.45)'); gr.addColorStop(1,'rgba(255,244,204,0)');
        sg.fillStyle=gr; sg.fillRect(0,0,64,64);
        sheenTex=new T.CanvasTexture(sc);
      }
    }
    _cabinSunbeamTexCache = { beamTex: beamTex, sheenTex: sheenTex };
    return _cabinSunbeamTexCache;
  }
  if(typeof window!=='undefined' && window.THREE && typeof document!=='undefined' && typeof document.createElement==='function'){
    getCabinSunbeamTex(window.THREE);
  }
  window.regionBoardDecorate = function(view, config){
    var id = config && config.id, allowed = { town: 1, lagoon: 1, caves: 1, patterns: 1, beach: 1, light: 1, captain: 1 };
    if(!allowed[id] || !view || !view.kit || !view.spaces) return;
    view._sceneryObstacles = view._sceneryObstacles || [];
    function addObstacle(x,z,r){ view._sceneryObstacles.push({x:x,z:z,r:r||.85}); }
    var T = window.THREE, M = view.kit.M, mesh = view.kit.mesh, sp = view.spaces,
        main = sp.slice(0, sp.mainN || sp.length), root = new T.Group(), extras = new T.Group(), geos = {}, owned = new Set(),
        curRoot = root, propCache = {};
    root.name = 'region-' + id;
    extras.name = 'region-' + id + '-extras';
    function own(g){ owned.add(g); return g; }
    function box(w,h,d){ var k = ['b',w,h,d].join(':'); return geos[k] || (geos[k] = own(new T.BoxGeometry(w,h,d))); }
    function cyl(rt,rb,h,n){ var k = ['c',rt,rb,h,n || 10].join(':'); return geos[k] || (geos[k] = own(new T.CylinderGeometry(rt,rb,h,n || 10))); }
    function cone(r,h,n){ return cyl(0,r,h,n || 7); }
    function ball(r,n,segH){ var k = ['s',r,n || 8,segH || 5].join(':'); return geos[k] || (geos[k] = own(new T.SphereGeometry(r,n || 8,segH || 5))); }
    function torus(r,t){ var k = ['t',r,t].join(':'); return geos[k] || (geos[k] = own(new T.TorusGeometry(r,t,5,12))); }
    function smoothTorus(r,t,rs,ts){ var a=rs||10, b=ts||20, k=['st',r,t,a,b].join(':'); return geos[k] || (geos[k] = own(new T.TorusGeometry(r,t,a,b))); }
    function finish(o,kind,scale){
      if(kind && typeof window.reef3dSurface==='function') window.reef3dSurface(o,kind,{scale:scale||2,seed:Math.abs(o.position.x*.37+o.position.z*.71)%7});
      return o;
    }
    function add(g,col,x,y,z,rx,ry,rz,kind){ var o = mesh(g,M(col,g.attributes.color?{vertexColors:true}:undefined),x,y,z); if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz; curRoot.add(o); return finish(o,kind||false); }
    function block(w,h,d,col,x,y,z,ry,kind){ return add(box(w,h,d),col,x,y,z,0,ry,0,kind); }
    function post(r,h,col,x,y,z){ return add(cyl(r*.87,r,h,8),col,x,y+h/2,z,0,0,0,'timber'); }
    function orb(r,col,x,y,z,kind){ return add(ball(r),col,x,y,z,0,0,0,kind===false?false:kind||'coral'); }
    function smoothOrb(r,col,x,y,z,kind){ return add(ball(r,r>1.2?14:10,r>1.2?10:7),col,x,y,z,0,0,0,kind===false?false:kind||'coral'); }

    // Composite geometry compaction & prop-caching engine: folds multi-part props and
    // repetitive scenery arrays into shared vertex-colored BufferGeometries (and InstancedMeshes
    // in extras) via two-pass pre-allocated Float32Arrays so load-in stays ultra-fast (<12k meshes
    // total across all regions) with zero GC churn and zero visual loss.
    var _cNm = new T.Matrix3(), _cCol = new T.Color(), _cRel = new T.Matrix4(), _cInv = new T.Matrix4(), _cBox = new T.Box3(), _cCtr = new T.Vector3();
    function meshVertCount(m){
      var g = m.geometry;
      if(!g || !g.attributes || !g.attributes.position) return 0;
      var c = g.index ? g.index.count : g.attributes.position.count;
      return c - (c % 3);
    }
    function writeMeshToBucket(bucket, m, origin, invParent){
      var g = m.geometry, mat = m.material;
      if(!g || !g.attributes || !g.attributes.position) return;
      if(!g.attributes.normal) g.computeVertexNormals();
      var pos = g.attributes.position, nor = g.attributes.normal;
      var hasVC = !!(mat && mat.vertexColors && g.attributes.color);
      var vc = hasVC ? g.attributes.color : null;
      var mw = invParent ? _cRel.multiplyMatrices(invParent, m.matrixWorld) : m.matrixWorld;
      var e = mw.elements;
      _cNm.getNormalMatrix(mw);
      var ne = _cNm.elements;
      var flip = mw.determinant() < 0;
      if(mat && mat.color) _cCol.copy(mat.color); else _cCol.setRGB(1, 1, 1);
      var cr = _cCol.r, cg = _cCol.g, cb = _cCol.b;
      var ox = origin ? origin.x : 0, oy = origin ? origin.y : 0, oz = origin ? origin.z : 0;
      var idx = g.index, count = (idx ? idx.count : pos.count);
      count = count - (count % 3);
      var P = bucket.P, N = bucket.N, C = bucket.C, off = bucket.off;
      var pArr = pos.array, pItem = pos.itemSize || 3;
      var nArr = nor.array, nItem = nor.itemSize || 3;
      var cArr = vc ? vc.array : null, cItem = vc ? (vc.itemSize || 3) : 0;
      var e0 = e[0], e1 = e[1], e2 = e[2], e4 = e[4], e5 = e[5], e6 = e[6], e8 = e[8], e9 = e[9], e10 = e[10], e12 = e[12] - ox, e13 = e[13] - oy, e14 = e[14] - oz;
      var n0 = ne[0], n1 = ne[1], n2 = ne[2], n3 = ne[3], n4 = ne[4], n5 = ne[5], n6 = ne[6], n7 = ne[7], n8 = ne[8];
      for(var i = 0; i < count; i += 3){
        var i0 = idx ? idx.getX(i) : i;
        var i1 = idx ? idx.getX(i + (flip ? 2 : 1)) : (i + (flip ? 2 : 1));
        var i2 = idx ? idx.getX(i + (flip ? 1 : 2)) : (i + (flip ? 1 : 2));
        for(var k = 0; k < 3; k++){
          var vi = k === 0 ? i0 : (k === 1 ? i1 : i2);
          var pi = vi * pItem;
          var px = pArr[pi], py = pArr[pi + 1], pz = pArr[pi + 2];
          P[off]     = e0 * px + e4 * py + e8 * pz + e12;
          P[off + 1] = e1 * px + e5 * py + e9 * pz + e13;
          P[off + 2] = e2 * px + e6 * py + e10 * pz + e14;
          var ni = vi * nItem;
          var nx = nArr[ni], ny = nArr[ni + 1], nz = nArr[ni + 2];
          var tx = n0 * nx + n3 * ny + n6 * nz;
          var ty = n1 * nx + n4 * ny + n7 * nz;
          var tz = n2 * nx + n5 * ny + n8 * nz;
          var nl = Math.sqrt(tx * tx + ty * ty + tz * tz);
          if(nl > 1e-6){ nl = 1 / nl; N[off] = tx * nl; N[off + 1] = ty * nl; N[off + 2] = tz * nl; }
          else { N[off] = 0; N[off + 1] = 1; N[off + 2] = 0; }
          if(cArr){
            var ci = vi * cItem;
            C[off] = cArr[ci] * cr; C[off + 1] = cArr[ci + 1] * cg; C[off + 2] = cArr[ci + 2] * cb;
          } else {
            C[off] = cr; C[off + 1] = cg; C[off + 2] = cb;
          }
          off += 3;
        }
      }
      bucket.off = off;
    }
    function bucketKeyForMesh(m, isExtra){
      var mat = m.material;
      var basic = !!mat.isMeshBasicMaterial;
      var trans = !!mat.transparent;
      var op = trans ? Math.round((mat.opacity != null ? mat.opacity : 1) * 1000) : 1000;
      var dw = mat.depthWrite === false ? 0 : 1;
      var fog = mat.fog === false ? 0 : 1;
      var side = mat.side || 0;
      var em = (!basic && mat.emissive) ? mat.emissive.getHex() : 0;
      var emI = (!basic && em && mat.emissiveIntensity != null) ? Math.round(mat.emissiveIntensity * 100) : 100;
      var bl = mat.blending || T.NormalBlending;
      var ro = m.renderOrder || 0;
      var surf = (!isExtra && m.userData && m.userData.reefSurface) ? (m.userData.reefSurface.kind + ':' + (m.userData.reefSurface.scale || 2) + ':' + (m.userData.reefSurface.projection || '')) : '';
      var grd = (!isExtra && m.userData && m.userData.reefGround) ? 1 : 0;
      var po = mat.polygonOffset ? (mat.polygonOffsetFactor + ',' + mat.polygonOffsetUnits) : '';
      return [basic?1:0, trans?1:0, op, dw, fog, side, em, emI, bl, ro, surf, grd, po].join('|');
    }
    function makeBucketMeta(m, isExtra){
      var mat = m.material;
      var surf = (!isExtra && m.userData && m.userData.reefSurface) ? m.userData.reefSurface : null;
      return {
        basic: !!mat.isMeshBasicMaterial,
        trans: !!mat.transparent,
        op: mat.transparent ? Math.round((mat.opacity != null ? mat.opacity : 1) * 1000) : 1000,
        dw: mat.depthWrite !== false,
        fog: mat.fog !== false,
        side: mat.side || 0,
        em: (!mat.isMeshBasicMaterial && mat.emissive) ? mat.emissive.getHex() : 0,
        emI: (!mat.isMeshBasicMaterial && mat.emissive && mat.emissiveIntensity != null) ? Math.round(mat.emissiveIntensity * 100) : 100,
        bl: mat.blending || T.NormalBlending,
        ro: m.renderOrder || 0,
        surfKind: surf ? surf.kind : false,
        surfScale: surf ? (surf.scale || 2) : 2,
        surfProj: surf ? (surf.projection || '') : '',
        grd: (!isExtra && m.userData && m.userData.reefGround) ? true : false,
        po: !!mat.polygonOffset,
        poF: mat.polygonOffsetFactor || 0,
        poU: mat.polygonOffsetUnits || 0
      };
    }
    function makeMaterialForBucket(meta, isExtra){
      if(!isExtra && !meta.basic && !meta.trans && meta.fog && !meta.em && meta.bl === T.NormalBlending && !meta.po){
        var opts = { vertexColors: true };
        if(meta.side) opts.side = meta.side;
        return M('#ffffff', opts);
      }
      if(meta.basic){
        var bo = { color: '#ffffff', vertexColors: true };
        if(meta.trans){ bo.transparent = true; bo.opacity = meta.op / 1000; }
        if(!meta.dw) bo.depthWrite = false;
        if(!meta.fog) bo.fog = false;
        if(meta.side) bo.side = meta.side;
        if(meta.bl !== T.NormalBlending) bo.blending = meta.bl;
        if(meta.po){ bo.polygonOffset = true; bo.polygonOffsetFactor = meta.poF; bo.polygonOffsetUnits = meta.poU; }
        return new T.MeshBasicMaterial(bo);
      }
      var lo = { vertexColors: true };
      if(meta.trans){ lo.transparent = true; lo.opacity = meta.op / 1000; }
      if(!meta.dw) lo.depthWrite = false;
      if(!meta.fog) lo.fog = false;
      if(meta.side) lo.side = meta.side;
      if(meta.em){ lo.emissive = meta.em; if(meta.emI !== 100) lo.emissiveIntensity = meta.emI / 100; }
      if(meta.bl !== T.NormalBlending) lo.blending = meta.bl;
      if(meta.po){ lo.polygonOffset = true; lo.polygonOffsetFactor = meta.poF; lo.polygonOffsetUnits = meta.poU; }
      return M('#ffffff', lo);
    }
    function finishBucketMesh(b, isExtra, origin){
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(b.P, 3));
      g.setAttribute('normal', new T.BufferAttribute(b.N, 3));
      g.setAttribute('color', new T.BufferAttribute(b.C, 3));
      g.computeBoundingSphere();
      if(!isExtra) own(g);
      var mat = makeMaterialForBucket(b.meta, isExtra);
      var om = isExtra ? new T.Mesh(g, mat) : mesh(g, mat, origin ? origin.x : 0, origin ? origin.y : 0, origin ? origin.z : 0);
      if(isExtra && origin) om.position.copy(origin);
      if(b.meta.ro) om.renderOrder = b.meta.ro;
      if(b.meta.grd) om.userData.reefGround = true;
      if(b.meta.surfKind){
        if(b.meta.surfProj && typeof window.reef3dSurface === 'function'){
          window.reef3dSurface(om, b.meta.surfKind, { scale: b.meta.surfScale, projection: b.meta.surfProj });
        } else {
          finish(om, b.meta.surfKind, b.meta.surfScale);
        }
      }
      return om;
    }
    function compactGroupInPlace(grp, isExtra, origin){
      grp.updateMatrixWorld(true);
      var useInv = !!(grp.parent || grp.position.x || grp.position.y || grp.position.z || grp.rotation.x || grp.rotation.y || grp.rotation.z || grp.scale.x !== 1 || grp.scale.y !== 1 || grp.scale.z !== 1);
      var invP = useInv ? _cInv.copy(grp.matrixWorld).invert() : null;
      var buckets = {}, order = [], keep = [];
      var children = grp.children.slice();
      children.forEach(function(ch){
        var hasSkipped = false, meshes = [];
        ch.traverse(function(m){
          if(!m.isMesh) return;
          if(m.isInstancedMesh || m.isSkinnedMesh || !m.visible || Array.isArray(m.material) || !m.material || m.material.map){
            hasSkipped = true;
          } else {
            meshes.push(m);
          }
        });
        if(hasSkipped){
          keep.push(ch);
          return;
        }
        for(var mi = 0; mi < meshes.length; mi++){
          var m = meshes[mi], vc = meshVertCount(m);
          if(!vc) continue;
          var k = bucketKeyForMesh(m, isExtra);
          var b = buckets[k];
          if(!b){
            b = buckets[k] = { meshes: [], vCount: 0, meta: makeBucketMeta(m, isExtra) };
            order.push(k);
          }
          b.meshes.push(m);
          b.vCount += vc;
        }
      });
      if(!order.length) return grp;
      children.forEach(function(ch){ if(keep.indexOf(ch) < 0) grp.remove(ch); });
      for(var oi = 0; oi < order.length; oi++){
        var b = buckets[order[oi]];
        if(!b.vCount) continue;
        b.P = new Float32Array(b.vCount * 3);
        b.N = new Float32Array(b.vCount * 3);
        b.C = new Float32Array(b.vCount * 3);
        b.off = 0;
        for(var bi = 0; bi < b.meshes.length; bi++) writeMeshToBucket(b, b.meshes[bi], origin, invP);
        grp.add(finishBucketMesh(b, isExtra, origin));
      }
      return grp;
    }
    // Pre-compact static opaque root scenery along the exact 16x16 REEF3D_CHUNK grid before reef3dMerge,
    // leaving root.children[0] (water) untouched and preserving every reefSurface/reefGround/side contract.
    function compactRootSpatialChunks(){
      if(root.children.length <= 2) return;
      root.updateMatrixWorld(true);
      var waterChild = root.children[0];
      var rest = root.children.slice(1);
      var buckets = {}, order = [], keep = [];
      for(var ri = 0; ri < rest.length; ri++){
        var ch = rest[ri], hasSkipped = false, meshes = [];
        ch.traverse(function(m){
          if(!m.isMesh) return;
          if(m.isInstancedMesh || m.isSkinnedMesh || !m.visible || Array.isArray(m.material) || !m.material || m.material.map){
            hasSkipped = true;
          } else {
            meshes.push(m);
          }
        });
        if(hasSkipped){ keep.push(ch); continue; }
        for(var mi = 0; mi < meshes.length; mi++){
          var m = meshes[mi], vc = meshVertCount(m);
          if(!vc) continue;
          if(!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
          _cCtr.copy(m.geometry.boundingSphere.center).applyMatrix4(m.matrixWorld);
          var cx16 = Math.floor(_cCtr.x / 16), cz16 = Math.floor(_cCtr.z / 16);
          var k = cx16 + ',' + cz16 + '|' + bucketKeyForMesh(m, false);
          var b = buckets[k];
          if(!b){
            b = buckets[k] = { meshes: [], vCount: 0, meta: makeBucketMeta(m, false) };
            order.push(k);
          }
          b.meshes.push(m);
          b.vCount += vc;
        }
      }
      if(!order.length) return;
      for(var ri2 = 0; ri2 < rest.length; ri2++){
        if(keep.indexOf(rest[ri2]) < 0) root.remove(rest[ri2]);
      }
      for(var oi = 0; oi < order.length; oi++){
        var b = buckets[order[oi]];
        if(!b.vCount) continue;
        b.P = new Float32Array(b.vCount * 3);
        b.N = new Float32Array(b.vCount * 3);
        b.C = new Float32Array(b.vCount * 3);
        b.off = 0;
        for(var bi = 0; bi < b.meshes.length; bi++) writeMeshToBucket(b, b.meshes[bi], null, null);
        root.add(finishBucketMesh(b, false, null));
      }
      if(waterChild && root.children[0] !== waterChild){
        root.remove(waterChild);
        root.children.unshift(waterChild);
        waterChild.parent = root;
      }
    }
    function compactRootRange(g0, x, y, z, rotY){
      var slice = curRoot.children.slice(g0);
      if(slice.length <= 1 && !rotY) return;
      var org = new T.Vector3(x || 0, y || 0, z || 0);
      var tmp = new T.Group();
      slice.forEach(function(ch){ curRoot.remove(ch); tmp.add(ch); });
      compactGroupInPlace(tmp, false, org);
      tmp.children.slice().forEach(function(m){
        tmp.remove(m);
        if(rotY) m.rotation.y = rotY;
        curRoot.add(m);
      });
    }
    function emitCached(cacheKey, x, y, z, rotY, scale, buildFn){
      var parts = propCache[cacheKey];
      if(!parts){
        var tmp = new T.Group(), prev = curRoot;
        curRoot = tmp;
        try { buildFn(); } finally { curRoot = prev; }
        compactGroupInPlace(tmp, false, null);
        parts = [];
        tmp.children.forEach(function(m){
          parts.push({
            g: m.geometry,
            mat: m.material,
            surf: m.userData && m.userData.reefSurface ? m.userData.reefSurface : null,
            grd: !!(m.userData && m.userData.reefGround),
            ro: m.renderOrder || 0
          });
        });
        propCache[cacheKey] = parts;
      }
      var sc = scale != null ? scale : 1;
      for(var i = 0; i < parts.length; i++){
        var pt = parts[i];
        var o = mesh(pt.g, pt.mat, x || 0, y || 0, z || 0);
        if(rotY) o.rotation.y = rotY;
        if(sc !== 1) o.scale.setScalar(sc);
        if(pt.ro) o.renderOrder = pt.ro;
        if(pt.grd) o.userData.reefGround = true;
        if(pt.surf) finish(o, pt.surf.kind, pt.surf.scale);
        curRoot.add(o);
      }
    }
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
      var p=[], colors=[], idx=[], n=16, radii=[.82,1,.90,.58], heights=[-.55,-.26,.22,.55];
      for(var ring=0;ring<4;ring++) for(var a=0;a<n;a++){
        var ang=a*Math.PI*2/n, wobble=.92+.04*Math.sin(a*2.7+seed)+.025*Math.cos(a*4.3+seed*2), r=radii[ring]*wobble;
        p.push(Math.cos(ang)*r+.01*Math.sin(ring+seed),heights[ring]+.03*Math.sin(a*2+seed+ring*.8),Math.sin(ang)*r);
        var shade=[.82,.94,.87,1][ring]*(1+.02*Math.sin(a+seed)); colors.push(shade,shade,shade);
      }
      for(ring=0;ring<3;ring++) for(a=0;a<n;a++){ var b=ring*n+a,c=ring*n+(a+1)%n; idx.push(b,b+n,c,c,b+n,c+n); }
      for(a=1;a<n-1;a++) idx.push(0,a,a+1,3*n,3*n+a+1,3*n+a);
      g=own(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.setAttribute('color',new T.Float32BufferAttribute(colors,3)); g.setIndex(idx);
      g.computeVertexNormals(); geos[k]=g; return g;
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
      emitCached('lantern:' + (col || ''), x, y, z, 0, 1, function(){
        post(.07,2.2,'#50445d',0,0,0); add(cyl(.42,.24,.52,6),'#744f64',0,2.16,0);
        orb(.24,col,0,2.16,0,false); add(cone(.48,.24,6),'#4c5367',0,2.55,0,0,0,0,'roof');
      });
    }
    function crystal(x,y,z,scale,col){
      // I10-4: 3-5 beveled hex-prism shards with pointed hex-pyramid caps around a bright glowing inner core (cached composite!).
      var seed=Math.abs(Math.floor(x*3.1+z*1.7)), variant=seed%3, yaw=(seed*.7)%(Math.PI*2);
      emitCached('crystal:' + variant + ':' + (col || ''), x, y, z, yaw, scale || 1, function(){
        var n=3+variant;
        for(var i=0;i<n;i++){
          var ang=i*2.4, lean=i?.2+.07*(i%3):.05, dist=i?(.2+.05*(i%2)):0,
              h=(i?1.38-.17*i:1.75), r=(i?.2-.014*i:.27), capH=h*.32, bodyH=h-capH,
              tx=Math.sin(lean)*Math.cos(ang), tz=Math.sin(lean)*Math.sin(ang), cl=Math.cos(lean),
              bx=Math.cos(ang)*dist, bz=Math.sin(ang)*dist, rx=Math.asin(tz), rz=-Math.asin(tx);
          add(cyl(r*.84,r,bodyH,6),col,bx+tx*bodyH/2,cl*bodyH/2,bz+tz*bodyH/2,rx,ang,rz,false);
          add(cyl(0,r*.84,capH,6),i%2?'#e8fdff':'#d8f7fb',bx+tx*(bodyH+capH/2),cl*(bodyH+capH/2),bz+tz*(bodyH+capH/2),rx,ang,rz,false);
        }
        orb(.22,'#f6ffff',0,.3,0,false);
        orb(.12,'#ffffff',.04,.62,0,false);
      });
    }
    // A tapered limb from a start point along a direction: cylinder re-oriented with a quaternion. Returns the end point.
    var limbUp=new T.Vector3(0,1,0), limbDir=new T.Vector3();
    function limb(x,y,z,dx,dy,dz,len,r0,r1,col,kind){
      limbDir.set(dx,dy,dz).normalize();
      var ex=x+limbDir.x*len, ey=y+limbDir.y*len, ez=z+limbDir.z*len;
      var o=add(cyl(r1,r0,len,6),col,(x+ex)/2,(y+ey)/2,(z+ez)/2,0,0,0,kind===undefined?false:kind);
      o.quaternion.setFromUnitVectors(limbUp,limbDir);
      return [ex,ey,ez,limbDir.x,limbDir.y,limbDir.z];
    }
    // Branching rounded coral: cached composite (1 mesh instead of 28!).
    function coral(x,y,z,k,col){
      var yaw=((x*1.3+z*2.1)%6.28);
      emitCached('coral:' + (col || ''), x, y, z, yaw, k || 1, function(){
        finish(post(.13,.95,col,0,0,0),'coral');
        for(var a=0;a<3;a++){
          var ang=a*2.094+.3, ca=Math.cos(ang), sa=Math.sin(ang);
          var p1=limb(0,.9,0,ca*.55,1,sa*.55,.62,.1,.07,col,'coral');
          [-1,1].forEach(function(s){
            var p2=limb(p1[0],p1[1],p1[2],ca*.5-sa*s*.55,.95,sa*.5+ca*s*.55,.5,.07,.045,col,'coral');
            orb(.11,'#ffe3d5',p2[0],p2[1]+.04,p2[2]);
            orb(.075,'#ffd0c0',p2[0]+ca*.09,p2[1]-.01,p2[2]+sa*.09);
            orb(.07,'#fff0e6',p2[0]-sa*s*.08,p2[1]+.1,p2[2]+ca*s*.08);
          });
          orb(.09,'#ffe3d5',p1[0],p1[1]+.03,p1[2]);
        }
      });
    }
    function pebble(x,y,z,r,col){
      // Smooth rounded river-stone (10x7 sphere, flattened) — zero sharp octagonal edges.
      var p=add(ball(r,10,7),col,x,y+r*.24,z,0,(x+z)*.43,0,'stone');
      p.scale.set(1.08,.34,.82); return p;
    }
    function seaGrass(x,y,z,k,col){
      emitCached('seaGrass:' + (col || ''), x, y, z, ((x*1.7+z) % 6.28), k || 1, function(){
        for(var j=0;j<4;j++){
          var q=(j-1.5)*.19, blade=add(cone(.09,.65+(j%3)*.19,5),col,q,.39,(j%2)*.16,0,0,0,false);
          blade.rotation.z=q*.9;
        }
      });
    }
    function organicRock(x,y,z,sx,sy,sz,col,kind){
      var seed=Math.abs(Math.floor(x*.7+z*.3))%4, o=add(contour(seed),col,x,y+sy*.55,z,0,Math.sin(z)*.22,0,kind||'stone');
      o.scale.set(sx,sy,sz); return o;
    }
    function kitProp(kind,x,y,z,size,rot){
      var o=null, names={rock:'rock1',plant:'plant',clam:'clam'};
      if(view.models && names[kind]) o=reef3dModel(view.models,names[kind],size,view.kit.grad);
      if(o){
        o.position.set(x,y,z); o.rotation.y=rot||0; curRoot.add(o);
        if(kind==='rock'||kind==='brain'||kind==='clam') o.traverse(function(p){ if(p.isMesh) finish(p,kind==='rock'?'stone':'coral'); });
        return o;
      }
      if(kind==='brain' || (view.kit.B && view.kit.B[kind])){
        emitCached('kitProp:' + kind, x, y, z, rot || 0, size || 1, function(){
          if(kind==='brain'){
            var g=own(new T.SphereGeometry(1,14,8)), p=g.attributes.position;
            for(var i=0;i<p.count;i++){ var ax=p.getX(i),ay=p.getY(i),az=p.getZ(i), r=1+.045*Math.sin(ax*10+az*5)*Math.cos(ay*8); p.setXYZ(i,ax*r,ay*r,az*r); }
            g.computeVertexNormals(); var dome=mesh(g,M('#ef9a86'),0,.55,0); dome.scale.set(1.1,.78,1.1);
            finish(dome,'coral'); curRoot.add(dome);
          } else {
            var built=view.kit.B[kind](function(){ return .43; });
            built.traverse(function(p){
              if(p.isMesh){
                if(p.geometry) own(p.geometry);
                if(kind==='rock'||kind==='clam') finish(p,kind==='rock'?'stone':'coral');
              }
            });
            curRoot.add(built);
          }
        });
        return curRoot.children[curRoot.children.length - 1] || null;
      }
      return null;
    }
    function ropeCoil(x,y,z){
      emitCached('ropeCoil', x, y, z, 0, 1, function(){
        for(var j=0;j<3;j++) add(torus(.38+j*.09,.045),'#dcc28a',0,j*.065,0,Math.PI/2,0,0,'rope');
      });
    }
    function canvasPanel(x,y,z){
      // A shallow wind-filled belly reads as heavy sailcloth even at a distance.
      // Baked cloth-fold & stitched-seam vertex colors keep sunlit sails textured and strictly below bloom blowout.
      var k='sailClothPanel', g=geos[k];
      if(!g){
        var p=[], c=[], idx=[], side,u,v,n=4;
        for(side=0;side<2;side++) for(v=0;v<=n;v++) for(u=0;u<=n;u++){
          var uf=u/n, vf=v/n, belly=Math.sin(uf*Math.PI)*Math.sin(vf*Math.PI);
          p.push((uf-.5)*2.5,(vf-.5)*4,.32*belly+(side?-.055:.055));
          // Vertical wind-belly highlight, subtle bottom fold shadow, and horizontal stitched panel seam at mid-height
          var seam=(v===2)?.93:1, edgeShade=.94+.06*Math.sin(uf*Math.PI), sh=(.80+.13*vf+.07*belly)*seam*edgeShade;
          c.push(sh,sh*.99,sh*.95);
        }
        for(side=0;side<2;side++) for(v=0;v<n;v++) for(u=0;u<n;u++){
          var a=side*25+v*5+u,b=a+5;
          if(side) idx.push(a,b,a+1,b,b+1,a+1); else idx.push(a,a+1,b,b,a+1,b+1);
        }
        var edge=[0,1,2,3,4,9,14,19,24,23,22,21,20,15,10,5];
        for(u=0;u<edge.length;u++){ var edgeA=edge[u],edgeB=edge[(u+1)%edge.length]; idx.push(edgeA,edgeB,edgeA+25,edgeB,edgeB+25,edgeA+25); }
        g=own(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.setAttribute('color',new T.Float32BufferAttribute(c,3)); g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g;
      }
      return add(g,'#e2d2b2',x,y,z,0,0,0,'fabric');
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
    // Strict clearance check against every board space (including branches)
    // so outer scenery never touches a tile, path, or encounter close-up.
    function outerClear(x,z,tileGap){
      var gap=tileGap||4.8;
      for(var i=0;i<sp.length;i++){
        var s=sp[i];
        if(Math.hypot(x-s.x,z-s.z)<gap) return false;
      }
      return true;
    }
    // Camera-space framing (I10-5/I10-13/I11): project world points through the region's opening-frame camera
    // (active saved space or main[0], REEF3D_REGION_CAMERA[id], desktop 42deg / 1.6 aspect) so props stay uncropped.
    var activeIdx=0;
    try{
      if(typeof reef3dPosition==='function' && view.region){
        var savedIdx=reef3dPosition(view);
        if(savedIdx>=0 && savedIdx<main.length) activeIdx=savedIdx;
      }
    }catch(e){}
    var camRigs={};
    function camSetupAt(idx){
      var k=((idx%main.length)+main.length)%main.length;
      if(camRigs[k]) return camRigs[k];
      var table=(typeof window.REEF3D_REGION_CAMERA==='object' && window.REEF3D_REGION_CAMERA) || { town:[15.2,13.3,4.8], lagoon:[15.5,13.6,5.2], caves:[13.8,11.5,3.8],
            patterns:[14.6,12.8,4.7], beach:[15.5,14,5.2], light:[15.7,14,4.8], captain:[14.3,12.7,4] },
          set=table[id]||table.town, s0=main[k]||main[0], s1=main[(k+1)%main.length]||s0,
          dx=s1.x-s0.x, dz=s1.z-s0.z, L=Math.hypot(dx,dz)||1, gy=(s0.y||0)-.3, cam=new T.PerspectiveCamera(42,1.6,.1,300);
      dx/=L; dz/=L;
      cam.position.set(s0.x-dx*set[1],gy+set[0],s0.z-dz*set[1]);
      cam.lookAt(s0.x+dx*set[2],gy+(set[3]!=null?set[3]:.1),s0.z+dz*set[2]);
      cam.updateMatrixWorld(true);
      camRigs[k]={cam:cam,rx:-dz,rz:dx,fx:dx,fz:dz};
      return camRigs[k];
    }
    function camSetup(){ return camSetupAt(activeIdx); }
    function camNDCAt(idx,x,y,z){ var r=camSetupAt(idx); return new T.Vector3(x,y,z).project(r.cam); }
    function camNDC(x,y,z){ return camNDCAt(activeIdx,x,y,z); }
    // Exact production MP8 low follow-camera projection (matching board.js REEF3D_REGION_CAMERA & lookY = gy + 0.30 + set[3])
    var realCamRigs={};
    function realCamSetupAt(idx){
      var k=((idx%main.length)+main.length)%main.length;
      if(realCamRigs[k]) return realCamRigs[k];
      var table=(typeof window!=='undefined' && typeof window.REEF3D_REGION_CAMERA==='object' && window.REEF3D_REGION_CAMERA) || {
        town:[5.6,11.8,3.5,1.40], lagoon:[6.0,13.2,3.0,1.30], caves:[5.6,12.6,2.8,1.25],
        patterns:[5.8,13.0,2.9,1.25], beach:[5.8,12.0,3.6,1.40], light:[4.8,15.0,3.0,1.15], captain:[5.9,13.4,2.2,1.05]
      };
      var set=table[id]||table.town, s0=main[k]||main[0], s1=main[(k+1)%main.length]||s0;
      var dx=s1.x-s0.x, dz=s1.z-s0.z, L=Math.hypot(dx,dz)||1, gy=(s0.y||0);
      dx/=L; dz/=L;
      var cam=new T.PerspectiveCamera(42,1.6,.1,300);
      cam.position.set(s0.x-dx*set[1],gy+set[0],s0.z-dz*set[1]);
      cam.lookAt(s0.x+dx*set[2],gy+0.30+(set[3]!=null?set[3]:1.25),s0.z+dz*set[2]);
      cam.updateMatrixWorld(true);
      realCamRigs[k]={cam:cam,rx:-dz,rz:dx,fx:dx,fz:dz};
      return realCamRigs[k];
    }
    function realCamNDCAt(idx,x,y,z){ var r=realCamSetupAt(idx); return new T.Vector3(x,y,z).project(r.cam); }
    function camRight(){ var r=camSetup(); return [r.rx,r.rz]; }
    // True when a prop of the given ground radius and height projects fully inside [minX,maxX] x [minY,maxY] NDC.
    function camInFrame(x,z,rad,height,bot,minX,maxX,minY,maxY,idx){
      var r=idx===undefined?camSetup():camSetupAt(idx), pts=[[0,0,bot],[-rad,0,bot],[rad,0,bot],[0,0,bot+height],[-rad*.6,0,bot+height*.6],[rad*.6,0,bot+height*.6]];
      for(var i=0;i<pts.length;i++){
        var v=new T.Vector3(x+r.rx*pts[i][0],pts[i][2],z+r.rz*pts[i][0]).project(r.cam);
        if(v.x<minX||v.x>maxX||v.y<minY||v.y>maxY||v.z>1) return false;
      }
      return true;
    }
    // Exact 8-corner oriented-box projection check so no corner of a ferry or islet ever clips a viewport edge.
    function camBoxInFrame(idx,x,z,hx,hz,bot,top,yaw,minX,maxX,minY,maxY){
      var r=camSetupAt(idx), cy=Math.cos(yaw||0), sy=Math.sin(yaw||0), v=new T.Vector3();
      var xs=[-hx,hx], zs=[-hz,hz], ys=[bot,top];
      for(var ix=0;ix<2;ix++) for(var iz=0;iz<2;iz++) for(var iy=0;iy<2;iy++){
        var wx=x+xs[ix]*cy+zs[iz]*sy, wz=z-xs[ix]*sy+zs[iz]*cy;
        v.set(wx,ys[iy],wz).project(r.cam);
        if(v.x<minX||v.x>maxX||v.y<minY||v.y>maxY||v.z>1) return false;
      }
      return true;
    }
    function foamRing(x,y,z,r){
      // Curved 36-segment 3-ring scalloped surf-foam collar with strict upward (+Y) CCW winding
      // so it renders crisply from above around sea rocks, islets, piers, buoys, and vessels.
      var k='foamCollar3', g=geos[k];
      if(!g){
        var p=[], c=[], idx=[], n=36;
        for(var i=0;i<n;i++){
          var a=i*Math.PI*2/n;
          var sc0=1+.045*Math.sin(a*4)+.03*Math.cos(a*7);
          var sc1=1+.085*Math.sin(a*5)+.05*Math.cos(a*3);
          var sc2=1+.105*Math.sin(a*5+.55)+.06*Math.cos(a*4-.35);
          var r0=.66*sc0, r1=.91*sc1, r2=1.10*sc2;
          p.push(Math.cos(a)*r0, .024, Math.sin(a)*r0);
          p.push(Math.cos(a)*r1, .014, Math.sin(a)*r1);
          p.push(Math.cos(a)*r2, .002, Math.sin(a)*r2);
          c.push(.94,.99,1.0, .89,.97,.99, .62,.88,.92);
        }
        for(var i=0;i<n;i++){
          var a=i*3, b=((i+1)%n)*3;
          // CCW from +Y: (innerA, outerB, outerA) & (innerA, innerB, outerB) -> +Y normal
          idx.push(a, b+1, a+1, a, b, b+1);
          idx.push(a+1, b+2, a+2, a+1, b+1, b+2);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g;
      }
      // Keep water-level collars cleanly above the max ocean wave crest (waterY + 0.058)
      var wyRef=id==='captain'?-1.1:-.64;
      var fy=(y<wyRef+.18 && y>wyRef-.22) ? Math.max(y, wyRef+.064) : y;
      var o=add(g,'#ffffff',x,fy,z,0,(x+z)*.37,0,false);
      o.scale.set(r,1,r);
      o.userData.reefGround=true;
      return o;
    }
    function smoothFoamRing(x,y,z,rx,rz){
      var o=foamRing(x,y,z,1);
      o.scale.set(rx,1,rz||rx);
      return o;
    }
    // Delicate outer scalloped surf-wave ripple halo expanding around coastal sea-stacks & cliff buttresses.
    function surfWaveHalo(x,y,z,rx,rz,seed){
      var k='surfWaveHalo', g=geos[k];
      if(!g){
        var p=[], c=[], idx=[], n=36;
        for(var i=0;i<n;i++){
          var a=i*Math.PI*2/n;
          var wave=1+.08*Math.sin(a*4+.8)+.05*Math.cos(a*6-.4);
          var rIn=1.18*wave, rOut=1.34*wave;
          p.push(Math.cos(a)*rIn, .012, Math.sin(a)*rIn);
          p.push(Math.cos(a)*rOut, .002, Math.sin(a)*rOut);
          var pulse=.88+.10*Math.sin(a*3+1.1);
          c.push(.84*pulse,.97*pulse,.99*pulse, .64,.90,.94);
        }
        for(var i=0;i<n;i++){
          var a=i*2, b=((i+1)%n)*2;
          idx.push(a, b+1, a+1, a, b, b+1);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g;
      }
      var wyRef=id==='captain'?-1.1:-.64;
      var fy=(y<wyRef+.18 && y>wyRef-.22) ? Math.max(y, wyRef+.056) : y;
      var o=add(g,'#ffffff',x,fy,z,0,(seed||0)*1.17+(x-z)*.23,0,false);
      o.scale.set(rx,1,rz||rx);
      o.userData.reefGround=true;
      return o;
    }
    // Smooth 24-radial-segment domed sandbar geometry (m20) — zero hard octagonal facets.
    function sandbarGeo(seed){
      var k='sandbar24:'+(seed%4), g=geos[k]; if(g) return g;
      var p=[], colors=[], idx=[], n=24,
          radii=[1.04,.98,.88,.72,.46,.01],
          heights=[-.12,.04,.22,.40,.54,.60],
          shades=[.85,.92,.97,1.0,1.02,1.03];
      for(var ring=0;ring<radii.length;ring++) for(var a=0;a<n;a++){
        var ang=a*Math.PI*2/n,
            wobble=.96+.035*Math.sin(ang*2+seed*1.7)+.02*Math.cos(ang*3-seed*1.1),
            r=radii[ring]*wobble;
        p.push(Math.cos(ang)*r,heights[ring]+.012*Math.sin(ang*2+seed)*Math.sin(ring*.5),Math.sin(ang)*r);
        var sh=shades[ring]; colors.push(sh,sh,sh);
      }
      for(var ring=0;ring<radii.length-1;ring++) for(var a=0;a<n;a++){
        var b=ring*n+a, c=ring*n+(a+1)%n;
        idx.push(b,b+n,c,c,b+n,c+n);
      }
      g=own(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      g.setIndex(idx); g.computeVertexNormals();
      geos[k]=g; return g;
    }
    function smoothSandbar(x,y,z,sx,sy,sz,col){
      var seed=Math.abs(Math.floor(x*.7+z*.3))%4;
      var o=add(sandbarGeo(seed),col||'#ebd29c',x,y,z,0,Math.sin(x+z)*.35,0,'sand');
      o.scale.set(sx,sy,sz); o.userData.reefGround=true; return o;
    }
    // Smooth 24-radial-segment coastal cliff geometry (kept for rounded submerged bases).
    function cliffBodyGeo(seed){
      var k='cliff24:'+(seed%4), g=geos[k]; if(g) return g;
      var p=[], colors=[], idx=[], n=24,
          radii=[1.02,.96,.89,.84,.76,.58],
          heights=[-.05,.22,.48,.74,.92,1.0],
          shades=[.74,.83,.90,.96,.92,1.0];
      for(var ring=0;ring<radii.length;ring++) for(var a=0;a<n;a++){
        var ang=a*Math.PI*2/n,
            wobble=.96+.032*Math.sin(ang*2+seed*1.4)+.020*Math.cos(ang*3+seed*2.1),
            r=radii[ring]*wobble;
        p.push(Math.cos(ang)*r,heights[ring]+.018*Math.sin(ang*2+seed+ring*.6),Math.sin(ang)*r);
        var sh=shades[ring]*(1+.016*Math.sin(ang*2+seed)); colors.push(sh,sh,sh);
      }
      for(var ring=0;ring<radii.length-1;ring++) for(var a=0;a<n;a++){
        var b=ring*n+a, c=ring*n+(a+1)%n;
        idx.push(b,b+n,c,c,b+n,c+n);
      }
      for(var a=1;a<n-1;a++) idx.push(5*n,5*n+a+1,5*n+a);
      g=own(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      g.setIndex(idx); g.computeVertexNormals();
      geos[k]=g; return g;
    }
    // M2: Chiseled, flat-faceted layered coastal cliff-rock geometry (non-indexed planar facets + horizontal erosion strata).
    function facetedCliffGeo(seed){
      var s=Math.abs(Math.floor(seed||0))%4, k='facetCliff:'+s, g=geos[k]; if(g) return g;
      var p=[], colors=[], idx=[], n=9,
          radii=[1.12,.99,.83,.93,.73,.56],
          heights=[-.10,.22,.44,.64,.90,1.00],
          shades=[.64,.82,.69,.96,.99,1.03];
      for(var ring=0;ring<radii.length;ring++) for(var a=0;a<n;a++){
        var baseAng=a*Math.PI*2/n,
            ang=baseAng+.13*Math.sin(a*2.7+s*1.9),
            crag=.84+.16*Math.cos(a*2.3+s*1.7)+.10*Math.sin(a*3.9-s*2.4),
            stratumJog=1+.065*Math.sin(a*2.1+ring*1.9+s),
            r=radii[ring]*crag*stratumJog,
            yJog=(ring===0||ring===5)?0:.038*Math.sin(a*2.5+s*1.3+ring*.9);
        p.push(Math.cos(ang)*r, heights[ring]+yJog, Math.sin(ang)*r);
        var facetVar=1+.06*Math.cos(a*3.1+s*1.5)+.04*Math.sin(ring*2.3-a);
        var sh=Math.min(1.06,shades[ring]*facetVar);
        colors.push(sh,sh*.99,sh*.97);
      }
      for(var ring=0;ring<radii.length-1;ring++) for(var a=0;a<n;a++){
        var b=ring*n+a, c=ring*n+(a+1)%n;
        idx.push(b,b+n,c,c,b+n,c+n);
      }
      for(var a=1;a<n-1;a++) idx.push(5*n,5*n+a+1,5*n+a);
      var raw=new T.BufferGeometry();
      raw.setAttribute('position',new T.Float32BufferAttribute(p,3));
      raw.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      raw.setIndex(idx);
      g=own(raw.toNonIndexed());
      raw.dispose();
      g.computeVertexNormals();
      geos[k]=g; return g;
    }
    // M2: Layered faceted sea-stack rock cluster with wide wave-cut bench, chiseled buttresses,
    // properly seated mossy turf caps (never buried!) and curved double surf-foam rings.
    function layeredSeaStack(x,z,scale,seed,pal){
      var k=scale||1, s=Math.abs(Math.floor(seed||0)), wy=waterY, yBase=wy-.14;
      // Curved layered surf-foam collar + outer scalloped wave-wash halo hugging the whole rock cluster
      smoothFoamRing(x,wy+.064,z,2.35*k,2.04*k);
      surfWaveHalo(x,wy+.056,z,2.28*k,1.98*k,s);
      // 1. Wide wave-cut horizontal rock bench emerging cleanly through the breaking foam
      var benchH=.64*k, bench=add(facetedCliffGeo(s),pal.base,x,yBase,z,0,s*1.15,0,'stone');
      bench.scale.set(1.88*k,benchH,1.62*k);
      // 2. Primary chiseled cliff spire (layered rock strata)
      var h1=1.92*k, top1=yBase+h1;
      var spire1=add(facetedCliffGeo((s+1)%4),pal.main,x-.08*k,yBase,z+.04*k,0,s*1.15+.65,0,'stone');
      spire1.scale.set(1.38*k,h1,1.22*k);
      // 3. Asymmetric secondary stepped cliff shoulder crag
      var h2=1.28*k, top2=yBase+h2, sx2=x+.78*k, sz2=z-.44*k;
      var spire2=add(facetedCliffGeo((s+2)%4),pal.mid,sx2,yBase,sz2,0,s*1.15+1.85,0,'stone');
      spire2.scale.set(1.02*k,h2,.92*k);
      // 4. Low angular seaward crag slab (harmonious coastal rock shade — zero mismatched blotches)
      var h3=.78*k, sx3=x-.94*k, sz3=z+.52*k;
      var crag=add(facetedCliffGeo((s+3)%4),pal.accent,sx3,yBase,sz3,0,s*1.15+2.7,0,'stone');
      crag.scale.set(.86*k,h3,.76*k);
      // 5. Companion sea skerry stone tucked inside the surf collar
      var sk=add(facetedCliffGeo((s+1)%4),pal.base,x+.32*k,yBase,z+.98*k,0,s*1.9,0,'stone');
      sk.scale.set(.54*k,.44*k,.48*k);
      // 6. Properly seated, UNBURIED overhanging mossy turf cushions crowning spire1 & spire2 (ref-diorama-boards.jpg)
      function turfCap(tx,ty,tz,r){
        var overhang=add(cyl(.88*r,.96*r,.14*r,12),pal.turf1,tx,ty-.02*r,tz,0,s*.8,0,false);
        overhang.scale.set(1.06,1,.94);
        var dome=smoothOrb(.78*r,pal.turf2,tx,ty+.14*r,tz,false); dome.scale.set(1.12,.48,1.02);
        var puff1=smoothOrb(.52*r,pal.turf3,tx+.32*r,ty+.18*r,tz-.20*r,false); puff1.scale.set(1.08,.44,1.02);
        var puff2=smoothOrb(.46*r,pal.turf1,tx-.30*r,ty+.12*r,tz+.22*r,false); puff2.scale.set(1.06,.42,1.04);
      }
      turfCap(x-.08*k,top1,z+.04*k,.82*k);
      turfCap(sx2,top2,sz2,.58*k);
      if(pal.withTuft){
        seaGrass(x-.20*k,top1+.18*k,z+.10*k,.42*k,pal.turf1);
      }
      if(pal.starCol){
        for(var st=0;st<5;st++){
          var sa=st*Math.PI*2/5;
          add(cone(.065*k,.24*k,4),pal.starCol,sx3+Math.cos(sa)*.10*k,yBase+h3+.04*k,sz3+Math.sin(sa)*.10*k,-Math.sin(sa)*1.45,0,Math.cos(sa)*1.45,false);
        }
      }
    }
    function pineTree(x,y,z,scale,col){
      // m11: Plush multi-cluster sculpted coastal cypress/pine — cached composite (1-2 meshes instead of 13!).
      var k=scale||1, ang0=(Math.abs(x*.73+z*1.19)*2.3)%(Math.PI*2), cDeep=col||'#3b7c58';
      emitCached('pineTree:' + cDeep, x, y, z, ang0, k, function(){
        var cMid='#4d9664', cLush='#68b66f', cSun='#8ed679', cCrown='#a8e386';
        var moss=smoothOrb(.42,'#67a85c',0,.05,0,false); moss.scale.set(1.15,.28,1.12);
        add(cyl(.11,.18,1.45,10),'#6f503a',0,.72,0,0,0,0,'timber');
        limb(0,1.05,0,.7,.8,0,.55,.08,.05,'#6f503a','timber');
        limb(0,1.15,0,-Math.cos(.6)*.65,.85,-Math.sin(.6)*.65,.52,.075,.045,'#6f503a','timber');
        var lowerRing=[[0,.48,0,1.42,.64,.72,cDeep],[2.1,.44,1,1.52,.60,.74,cMid],[4.2,.46,2,1.46,.62,.72,cDeep],[1.05,.38,3,1.68,.56,.78,cMid]];
        lowerRing.forEach(function(b){
          var sp=smoothOrb(b[4],b[6],Math.cos(b[0])*b[1],b[3],Math.sin(b[0])*b[1],false);
          sp.scale.set(1.12,b[5],1.08);
        });
        var midRing=[[0.5,.36,2.08,.62,cLush],[2.65,.34,2.14,.58,cMid],[4.7,.32,2.02,.56,cLush]];
        midRing.forEach(function(b){
          var sp=smoothOrb(b[3],b[4],Math.cos(b[0])*b[1],b[2],Math.sin(b[0])*b[1],false);
          sp.scale.set(1.08,.86,1.06);
        });
        var top1=smoothOrb(.52,cSun,Math.cos(.9)*.18,2.56,Math.sin(.9)*.18,false); top1.scale.set(1.12,.82,1.08);
        var top2=smoothOrb(.40,cCrown,-Math.cos(.4)*.16,2.86,-Math.sin(.4)*.16,false); top2.scale.set(1.10,.78,1.06);
      });
    }
    function palmFrondGeo(){
      // m6: Curved multi-segment feathery pinnate palm frond with raised arched rachis spine
      // and 8 paired drooping V-creased leaflets separated by crisp serrated notches.
      var k='palmFrondFeathery', g=geos[k]; if(g) return g;
      var p=[], c=[], idx=[];
      function pushV(x,y,z,r,g2,b){ var id=p.length/3; p.push(x,y,z); c.push(r,g2,b); return id; }
      function frondY(t){ return Math.sin(t*Math.PI*.78)*.64-t*t*1.16; }
      function frondZ(t){ return t*2.54; }
      // 1. Arched central rachis spine (8 segments, raised sunlit midrib ridge)
      var segs=8;
      for(var i=0;i<=segs;i++){
        var t=i/segs, rz=frondZ(t), ry=frondY(t), sw=.056*(1-t*.68), rh=.044*(1-t*.48);
        var rib=1.10+.06*t;
        pushV(-sw, ry-.012, rz, .94, 1.02, .88);
        pushV(0,   ry+rh,   rz, rib*1.04, rib*1.06, rib*.80);
        pushV(sw,  ry-.012, rz, .94, 1.02, .88);
      }
      for(var i=0;i<segs;i++){
        var a=i*3, b=a+3;
        idx.push(a, a+1, b+1, a, b+1, b);
        idx.push(a+1, a+2, b+2, a+1, b+2, b+1);
      }
      // 2. Paired feathery serrated leaflets radiating outward & forward along both sides
      var pairs=8;
      for(var li=0;li<pairs;li++){
        var lt=.13+li*.105, z0=frondZ(lt), y0=frondY(lt), sw0=.056*(1-lt*.68);
        var env=Math.sin(Math.pow(lt,.68)*Math.PI);
        var len=env*.68+.18, bw=.132-.030*lt;
        var outFrac=.94-.24*lt, fwdFrac=.46+.36*lt;
        var toneVar=1+(li%2?.045:-.045);
        for(var si=0;si<2;si++){
          var sd=si?1:-1;
          var bx=sd*sw0*.65;
          var x1=sd*(sw0*.55+len*.54*outFrac), z1=z0+len*.54*fwdFrac, y1=y0+.032-len*.075;
          var x2=sd*(sw0*.50+len*outFrac),     z2=z0+len*(fwdFrac+.08), y2=y0-.055-len*(.23+.11*lt);
          var cB=.96*toneVar, cM=1.01*toneVar, cT=.79*toneVar;
          var bBack =pushV(bx, y0-.014, z0-bw*.48, cB*.94, cB*1.02, cB*.90);
          var bMid  =pushV(bx, y0+.016, z0+bw*.02, cB*1.04, cB*1.07, cB*.86);
          var bFront=pushV(bx, y0-.014, z0+bw*.50, cB*.94, cB*1.02, cB*.90);
          var mBack =pushV(x1, y1-.024, z1-bw*.32, cM*.94, cM*1.02, cM*.90);
          var mMid  =pushV(x1, y1+.022, z1,        cM*1.05, cM*1.07, cM*.88);
          var mFront=pushV(x1, y1-.024, z1+bw*.34, cM*.94, cM*1.02, cM*.90);
          var tip   =pushV(x2, y2,      z2,        cT*.94, cT*1.03, cT*.88);
          if(sd>0){
            idx.push(bBack,bMid,mMid, bBack,mMid,mBack);
            idx.push(bMid,bFront,mFront, bMid,mFront,mMid);
            idx.push(mBack,mMid,tip, mMid,mFront,tip);
          }else{
            idx.push(bBack,mMid,bMid, bBack,mBack,mMid);
            idx.push(bMid,mFront,bFront, bMid,mMid,mFront);
            idx.push(mBack,tip,mMid, mMid,tip,mFront);
          }
        }
      }
      // 3. Feathered forked terminal leaflets at the frond apex
      var zEnd=frondZ(.94), yEnd=frondY(.94);
      [-1,1].forEach(function(sd){
        var a0=pushV(0, yEnd+.01, zEnd-.04, 1.02, 1.08, .86);
        var a1=pushV(sd*.05, yEnd-.01, zEnd+.06, .95, 1.03, .88);
        var a2=pushV(sd*.22, yEnd-.18, zEnd+.34, .82, .94, .82);
        if(sd>0) idx.push(a0,a1,a2); else idx.push(a0,a2,a1);
      });
      g=own(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(c,3));
      g.setIndex(idx); g.computeVertexNormals();
      geos[k]=g; return g;
    }
    function palmTree(x,y,z,i,small){
      var scale=small||1, variant=Math.abs(i|0)%3, leanAng=(i*1.73)%(Math.PI*2);
      emitCached('palmTree:' + variant, x, y, z, -leanAng, scale, function(){
        var h=3.7+variant*.42, segH=h/4, px=0, py=0, pz=0;
        add(cyl(.44,.58,.12,12),'#e6cf9c',0,.05,0,0,0,0,false);
        for(var s=0;s<4;s++){
          var rBot=.24-s*.028, rTop=.21-s*.028, curve=(s+.5)*.14, nx=px+curve*.42;
          var seg=add(cyl(rTop,rBot,segH*1.06,10),s%2?'#a6774d':'#b7865a',(px+nx)/2,py+segH/2,0,0,0,0,'timber');
          seg.rotation.z=-curve*.26;
          px=nx; py+=segH*.96;
        }
        smoothOrb(.29,'#5b945f',px,py,pz,false);
        var fg=palmFrondGeo(), frondCols=['#46a45b','#5cb866','#3a9056','#66c26b','#4da95f'];
        for(var j=0;j<5;j++){
          var a=j*(Math.PI*2/5)+variant*.34;
          var frond=mesh(fg,M(frondCols[j%frondCols.length],{side:T.DoubleSide,vertexColors:true}),px,py-.02,pz);
          frond.rotation.order='YXZ'; frond.rotation.y=a; frond.rotation.x=.05+(j%2)*.07;
          frond.scale.setScalar(.98+(j%3)*.05); curRoot.add(frond);
        }
        for(var u=0;u<2;u++){
          var topFrond=mesh(fg,M(u?'#6ac66e':'#59ba64',{side:T.DoubleSide,vertexColors:true}),px,py+.08,pz);
          topFrond.rotation.order='YXZ'; topFrond.rotation.y=u*Math.PI+.62; topFrond.rotation.x=-.26-u*.06;
          topFrond.scale.setScalar(.74); curRoot.add(topFrond);
        }
        for(var c=0;c<3;c++){
          var ca=c*2.094+.35;
          var nut=smoothOrb(.19,c===1?'#8c5832':'#774828',px+Math.cos(ca)*.27,py-.26,pz+Math.sin(ca)*.27,false);
          nut.scale.set(1.04,.94,1.04);
        }
      });
    }
    function stylizedCliff(x,y,z,sx,sy,sz,rockCol,turfCol,withFence,withFoam){
      var g0=curRoot.children.length;
      var seed=Math.abs(Math.floor(x*.7+z*.3))%4;
      if(withFoam){
        smoothFoamRing(x,waterY+.064,z,sx*1.16,sz*1.16);
        surfWaveHalo(x,waterY+.056,z,sx*1.12,sz*1.12,seed);
      }
      var cRock1=rockCol||'#a87643',
          cRock2='#'+new T.Color(cRock1).lerp(new T.Color('#d2c5ab'),.22).getHexString();
      var useSmoothCliff=(id==='lagoon');
      var bodyGeo1=useSmoothCliff?cliffBodyGeo(seed):facetedCliffGeo(seed);
      var bodyGeo2=useSmoothCliff?cliffBodyGeo((seed+1)%4):facetedCliffGeo((seed+1)%4);
      var body1=add(bodyGeo1,cRock1,x,y,z,0,Math.sin(z)*.28,0,'stone');
      if(useSmoothCliff && body1.material && body1.material.flatShading) body1.material.flatShading=false;
      body1.scale.set(sx,sy*.88,sz);
      var body2=add(bodyGeo2,cRock2,x+sx*.14,y+sy*.16,z-sz*.10,0,Math.cos(x)*.35+1.1,0,'stone');
      if(useSmoothCliff && body2.material && body2.material.flatShading) body2.material.flatShading=false;
      body2.scale.set(sx*.82,sy*.70,sz*.80);
      var baseT=new T.Color(turfCol||'#6bb257');
      var tc='#'+baseT.getHexString(),
          tc2='#'+baseT.clone().lerp(new T.Color('#92c670'),.26).getHexString(),
          tc3='#'+baseT.clone().multiplyScalar(.82).getHexString(),
          tcHi='#'+baseT.clone().lerp(new T.Color('#a6de78'),.42).getHexString(),
          R=Math.max(sx,sz), capY=y+sy*.84;
      var lip=add(cyl(.80,.88,.16,18),tc3,x,capY+.04,z,0,seed*.5,0,false);
      lip.scale.set(sx*.94,1,sz*.94);
      [[0,0,.48,.40,0],[.32,.20,.32,.38,1],[-.32,-.20,.34,.40,2],[.12,-.34,.28,.36,1],[-.18,.32,.30,.38,0],[.36,-.08,.24,.36,2],[-.36,.10,.26,.36,1]].forEach(function(l){
        var lb=smoothOrb(R*l[2],[tc,tc2,tc3][l[4]],x+sx*l[0],capY+R*l[2]*.24,z+sz*l[1],false);
        lb.scale.set(l[0]||l[1]?1.05:sx/R,l[3],l[0]||l[1]?1.05:sz/R);
      });
      var crest1=smoothOrb(R*.32,tc2,x-sx*.06,capY+sy*.12+R*.10,z+sz*.04,false); crest1.scale.set(1.10,.48,1.04);
      var crest2=smoothOrb(R*.22,tcHi,x+sx*.10,capY+sy*.17+R*.12,z-sz*.08,false); crest2.scale.set(1.06,.46,1.02);
      if(useSmoothCliff){
        // Lush arching Jamboree fern tufts crowning smooth mossy Lagoon coastal boulders
        var fgCliff=palmFrondGeo();
        for(var cf=0;cf<5;cf++){
          var cfa=cf*Math.PI*2/5+seed*.7;
          var cfr=mesh(fgCliff,M(cf%2?'#44a864':'#68c674',{side:T.DoubleSide,vertexColors:true}),x+Math.cos(cfa)*sx*.36,capY+R*.18,z+Math.sin(cfa)*sz*.36);
          cfr.rotation.order='YXZ'; cfr.rotation.y=cfa; cfr.rotation.x=-.20-(cf%2)*.10;
          cfr.scale.setScalar(.38+(cf%2)*.07); curRoot.add(cfr);
        }
      }
      [[.26,.18,'#f2c96b'],[-.26,-.16,'#e892a8'],[.06,-.28,'#f2e6c2']].forEach(function(fl,fi){
        var fx=x+sx*fl[0], fy=capY+R*.22, fz=z+sz*fl[1];
        for(var lf=0;lf<4;lf++){
          var la=lf*Math.PI/2+fi*.6;
          var blade=add(cone(.075,.30,4),lf%2?tc3:tc,fx+Math.cos(la)*.12,fy+.06,fz+Math.sin(la)*.12,-Math.sin(la)*.95,la,Math.cos(la)*.95,false);
          blade.scale.set(1,1,.45);
        }
        for(var pt=0;pt<5;pt++){
          var pa=pt*Math.PI*2/5+fi;
          orb(.048,fl[2],fx+Math.cos(pa)*.075,fy+.11,fz+Math.sin(pa)*.075,false);
        }
        orb(.042,'#ffe078',fx,fy+.13,fz,false);
      });
      if(withFence){
        var ang=Math.atan2(cx-x,cz-z), nx=Math.sin(ang), nz=Math.cos(ang), tx=nz, tz=-nx, fy=y+sy*1.02;
        [-1,0,1].forEach(function(sd){
          var px=x+nx*sz*.34+tx*sd*sx*.32, pz=z+nz*sz*.34+tz*sd*sx*.32;
          post(.055,.52,'#f4efe2',px,fy,pz);
          orb(.07,'#f4efe2',px,fy+.54,pz,false);
        });
        block(sx*.66,.055,.065,'#d9be88',x+nx*sz*.34,fy+.38,z+nz*sz*.34,ang,'rope');
        block(sx*.66,.045,.055,'#f4efe2',x+nx*sz*.34,fy+.22,z+nz*sz*.34,ang,'timber');
      }
      compactRootRange(g0, x, y, z, 0);
    }
    function umbrella(x,y,z,col1,col2,rot,scale){
      var k=scale||1, c1=col1||'#e86f68', c2=col2||'#fff1d0';
      emitCached('umbrella:' + c1 + ':' + c2, x, y, z, rot || 0, k, function(){
        var uGrp=new T.Group();
        var sandMound=mesh(ball(.18,10,7),M('#e8cc96'),0,-.045,0);
        sandMound.scale.set(1.15,.28,1.15); finish(sandMound,'sand'); uGrp.add(sandMound);
        var anchor=mesh(cyl(.068,.084,.12,10),M('#8f6944'),0,-.015,0);
        finish(anchor,'timber'); uGrp.add(anchor);
        uGrp.add(mesh(cyl(.056,.060,.05,10),M('#d4a64a'),0,.055,0));
        var tiltGrp=new T.Group(); tiltGrp.rotation.z=.055; uGrp.add(tiltGrp);
        var poleH=2.24;
        var pole=mesh(cyl(.032,.038,poleH,10),M('#9e744c'),0,poleH*.5-.14,0);
        finish(pole,'timber'); tiltGrp.add(pole);
        tiltGrp.add(mesh(cyl(.054,.054,.09,10),M('#d4a64a'),0,1.76,0));
        var cyU=2.04, capR=1.18, capH=.42, panels=8;
        for(var w=0;w<panels;w++){
          var a0=w*Math.PI*2/panels, a1=(w+1)*Math.PI*2/panels;
          var pGeo=own(new T.BufferGeometry());
          var rMid=capR*.62, yMid=cyU+capH*.54, yRim=cyU, yApex=cyU+capH;
          pGeo.setAttribute('position',new T.Float32BufferAttribute([
            0,yApex,0,
            Math.cos(a0)*rMid,yMid,Math.sin(a0)*rMid, Math.cos(a1)*rMid,yMid,Math.sin(a1)*rMid,
            Math.cos(a0)*capR,yRim,Math.sin(a0)*capR, Math.cos(a1)*capR,yRim,Math.sin(a1)*capR,
            Math.cos(a0)*capR,yRim-.10,Math.sin(a0)*capR, Math.cos(a1)*capR,yRim-.10,Math.sin(a1)*capR
          ],3));
          pGeo.setIndex([0,2,1, 1,2,4, 1,4,3, 3,4,6, 3,6,5]);
          pGeo.computeVertexNormals();
          var pm=mesh(pGeo,M(w%2?c2:c1,{side:T.DoubleSide}),0,0,0);
          finish(pm,'fabric'); tiltGrp.add(pm);
          var rxE=Math.cos(a0)*capR*.92, rzE=Math.sin(a0)*capR*.92, dyR=(yRim+.04)-1.78;
          var rLen=Math.hypot(rxE,dyR,rzE);
          var rib=mesh(cyl(.014,.016,rLen,5),M('#805c3c'),rxE*.5,1.78+dyR*.5,rzE*.5);
          rib.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(rxE,dyR,rzE).normalize());
          tiltGrp.add(rib);
        }
        tiltGrp.add(mesh(ball(.085,10,7),M('#f0cc6c'),0,cyU+capH+.05,0));
        curRoot.add(uGrp);
      });
    }
    function bench(x,y,z,rot){
      emitCached('bench', x, y, z, rot || 0, 1, function(){
        block(1.35,.1,.48,'#b5865a',0,.42,0,0,'timber');
        block(1.35,.32,.08,'#a3754a',0,.68,-.2,0,'timber');
        [-.52,.52].forEach(function(lx){ block(.1,.42,.42,'#6e4e38',lx,.21,0,0,'timber'); });
      });
    }
    function hedgeRow(x,y,z,len,rot){
      var w=Math.round((len||2.0)*10)/10, variant=Math.abs(Math.floor(x*3.1+z*2.7))%4;
      emitCached('hedgeRow:' + w + ':' + variant, x, y, z, rot || 0, 1, function(){
        // Sculpted beveled warm-limestone garden curb + mossy soil bed (Jamboree ref 05-blossom-park)
        wornBox(w,.18,.54,'#b9b09e',0,.09,0,'stone');
        block(w+.06,.055,.60,'#dfd6c2',0,.19,0,0,'stone');
        block(w-.08,.04,.44,'#384c35',0,.21,0,0,false);
        // Fluffy multi-cluster layered leaf puffs (shaded emerald base -> lush mid -> warm sunlit chartreuse tops)
        var nCl=Math.max(3,Math.round(w/.52));
        var flCols=['#ff748e','#ffe164','#fff7e2','#7ecaf6','#ff9e66'];
        for(var ci=0;ci<nCl;ci++){
          var u=nCl>1?(ci/(nCl-1)-.5)*2:0, cxB=u*(w*.40), hVar=((ci+variant)%3)*.065, zOff=((ci%2)?1:-1)*.045;
          // Deep shaded emerald base puffs gently spilling over the stone coping rim
          var bL=smoothOrb(.27+(ci%2)*.035,'#287044',cxB-.07,.34+hVar*.3,zOff+.07,false); bL.scale.set(1.16,.78,1.08);
          var bR=smoothOrb(.25,'#317e4a',cxB+.09,.33+hVar*.25,-zOff-.06,false); bR.scale.set(1.12,.76,1.06);
          // Vibrant lush meadow-green mid puffs
          var m1=smoothOrb(.26+((ci+1)%2)*.04,'#47a257',cxB,.49+hVar,zOff*.4,false); m1.scale.set(1.14,.84,1.08);
          var m2=smoothOrb(.22,'#58b460',cxB+((ci%2)?.11:-.11),.52+hVar*.8,zOff+.10,false); m2.scale.set(1.06,.82,1.04);
          // Warm sunlit yellow-green upper foliage crown puffs
          var t1=smoothOrb(.19+(ci%2)*.03,'#82d363',cxB+((ci%2)?-.05:.05),.65+hVar,zOff+.04,false); t1.scale.set(1.10,.76,1.04);
          if(ci%2===0){
            var t2=smoothOrb(.14,'#9ee270',cxB+.06,.73+hVar*.9,zOff-.04,false); t2.scale.set(1.08,.74,1.04);
          }
          // Delicate colorful Jamboree blossom clusters nestled across the upper leafy billows
          var fc1=flCols[(ci*2+variant)%flCols.length], fc2=flCols[(ci*2+variant+2)%flCols.length];
          var fx=cxB+((ci%2)?.09:-.08), fy=.62+hVar, fz=.17+zOff*.5;
          for(var fp=0;fp<3;fp++){
            var fa=fp*Math.PI*2/3+ci;
            smoothOrb(.055,fc1,fx+Math.cos(fa)*.055,fy+Math.sin(fa)*.032,fz+.025,false);
          }
          smoothOrb(.036,'#ffe875',fx,fy+.01,fz+.052,false);
          if(ci%2===1){
            var fx2=cxB-.07, fy2=.71+hVar*.9, fz2=-.10+zOff*.4;
            smoothOrb(.058,fc2,fx2,fy2,fz2,false);
            smoothOrb(.046,fc2,fx2+.06,fy2-.02,fz2+.04,false);
            smoothOrb(.034,'#fff4a8',fx2+.02,fy2+.02,fz2+.03,false);
          }
        }
      });
    }
    function crate(x,y,z,s){ var k=s||1; wornBox(.62*k,.58*k,.62*k,'#b8784e',x,y+.29*k,z,'timber'); }
    function barrel(x,y,z,s){
      emitCached('barrel', x, y, z, 0, s || 1, function(){
        add(cyl(.28,.32,.68,8),'#8c6244',0,.34,0,0,0,0,'timber');
        add(cyl(.31,.31,.07,8),'#4d5761',0,.52,0,0,0,0,false);
        add(cyl(.31,.31,.07,8),'#4d5761',0,.18,0,0,0,0,false);
      });
    }
    function cottage(x,y,z,rot,wallCol,roofCol,scale){
      var k=scale||1, wc=wallCol||'#f3e2c8', rc=roofCol||'#b6555a';
      emitCached('cottage:' + wc + ':' + rc, x, y, z, rot || 0, k, function(){
        wornBox(2.8,1.9,2.4,wc,0,.95,0,'plaster');
        block(3.22,.12,2.52,'#6e4e38',0,1.92,0,0,'timber');
        [-1.2,0,1.2].forEach(function(rx){ block(.12,.12,2.76,'#5c402d',rx,1.84,0,0,'timber'); });
        var r1=block(3.25,.16,1.55,rc,0,2.2,-.55,0,'roof'); r1.rotation.x=-.42;
        var r2=block(3.25,.16,1.55,rc,0,2.2,.55,0,'roof'); r2.rotation.x=.42;
        block(3.32,.14,.16,'#3c4e5c',0,2.5,0,0,'roof');
        wornBox(.56,.65,.56,'#8e9491',.85,2.18,-.45,'stone');
        block(.46,.95,.46,'#c8bea6',.85,2.55,-.45,0,'stone');
        block(.58,.12,.58,'#536773',.85,3.04,-.45,0,'stone');
        add(cyl(.11,.13,.22,8),'#9f5c49',.85,3.18,-.45,0,0,0,false);
        block(.64,1.08,.14,'#775142',0,.54,1.22,0,'timber');
        block(.82,.12,.28,'#a9a69b',0,.06,1.32,0,'stone');
        [-1,1].forEach(function(sd){
          var wx=sd*.84, wy=1.08, wz=1.22;
          block(.48,.52,.12,'#ffe79c',wx,wy,wz,0,false);
          block(.56,.08,.18,'#e8d5b5',wx,wy-.28,wz+.02,0,'timber');
          block(.06,.52,.14,'#6e4e38',wx,wy,wz+.02,0,'timber');
          block(.48,.06,.14,'#6e4e38',wx,wy,wz+.02,0,'timber');
          [-1,1].forEach(function(sh){ block(.16,.54,.09,'#4a7582',wx+sh*.33,wy,wz+.01,0,'timber'); });
          var swx=sd*1.42, swy=1.08, swz=0;
          block(.12,.52,.48,'#ffe79c',swx,swy,swz,0,false);
          block(.18,.08,.56,'#e8d5b5',swx+sd*.02,swy-.28,swz,0,'timber');
          block(.14,.52,.06,'#6e4e38',swx+sd*.02,swy,swz,0,'timber');
          block(.14,.06,.48,'#6e4e38',swx+sd*.02,swy,swz,0,'timber');
          [-1,1].forEach(function(sh){ block(.09,.54,.16,'#4a7582',swx+sd*.01,swy,swz+sh*.33,0,'timber'); });
        });
      });
    }
    function cargoChest(x,y,z,rot){
      emitCached('cargoChest', x, y, z, rot || 0, 1, function(){
        wornBox(1.02,.52,.66,'#8d5b3c',0,.26,0,'timber');
        add(cyl(.33,.33,1.02,8),'#9c6745',0,.52,0,0,0,Math.PI/2,'timber');
        [-.32,.32].forEach(function(bx){
          block(.07,.54,.7,'#e3ba58',bx,.27,0,0,false);
          add(cyl(.35,.35,.07,8),'#e3ba58',bx,.52,0,0,0,Math.PI/2,false);
        });
        block(.14,.16,.08,'#f2ce6b',0,.46,.35,0,false);
      });
    }
    function floatingBarrel(x,z,rot,wy){
      var y=wy!==undefined?wy:-1.04, g0=curRoot.children.length;
      foamRing(x,y-.02,z,.58);
      barrel(x,y-.18,z,.9);
      var grp=new T.Group(), org=new T.Vector3(x,y,z);
      curRoot.children.slice(g0+1).forEach(function(p){ p.position.sub(org); grp.add(p); });
      grp.position.copy(org); grp.rotation.set(.28,rot||0,.22); curRoot.add(grp);
    }
    function flowerPlanter(x,y,z,rot){
      var variant=Math.abs(Math.floor(x+z))%5;
      emitCached('flowerPlanter:' + variant, x, y, z, rot || 0, 1, function(){
        // Sculpted Jamboree coastal terracotta-and-stone topiary planter (layered rounded puffs + blossoms)
        wornBox(1.38,.12,.64,'#a89f8d',0,.06,0,'stone');
        wornBox(1.26,.32,.56,'#c46b4c',0,.26,0,'stone');
        block(1.38,.075,.66,'#dc8463',0,.43,0,0,'stone');
        block(1.18,.05,.46,'#463529',0,.46,0,0,false);
        var fCols=['#ff748e','#ffe066','#fff8e6','#78ccf6','#ff9e66'];
        // Billowy multi-tier base leaf puffs overflowing the rim
        for(var fi=-1;fi<=1;fi++){
          var bx=fi*.38, zS=(fi%2)?.05:-.04;
          var lo=smoothOrb(.24,'#2c7847',bx,.54,zS+.05,false); lo.scale.set(1.16,.76,1.10);
          var md=smoothOrb(.22,'#4ea95b',bx+fi*.03,.65,zS-.02,false); md.scale.set(1.12,.82,1.08);
          var hi=smoothOrb(.16,'#86d666',bx-fi*.02,.76,zS+.03,false); hi.scale.set(1.08,.74,1.04);
          var cA=fCols[(fi+3+variant)%5], cB=fCols[(fi+5+variant)%5];
          smoothOrb(.068,cA,bx-.09,.75,zS+.13,false);
          smoothOrb(.055,cA,bx-.03,.79,zS+.14,false);
          smoothOrb(.040,'#ffec7a',bx-.06,.77,zS+.17,false);
          smoothOrb(.062,cB,bx+.11,.73,zS-.09,false);
          smoothOrb(.048,cB,bx+.06,.78,zS-.07,false);
        }
        // Central sculpted mini-topiary puff crown for lively silhouette variety
        add(cyl(.045,.058,.36,8),'#6d4c35',0,.68,0,0,0,0,'timber');
        var tpB=smoothOrb(.26,'#36884e',0,.92,0,false); tpB.scale.set(1.08,.86,1.08);
        var tpM=smoothOrb(.22,'#5ab661',.06,.99,.05,false); tpM.scale.set(1.05,.86,1.05);
        var tpT=smoothOrb(.17,'#92dd6c',-.05,1.09,-.03,false); tpT.scale.set(1.08,.80,1.06);
        for(var tb=0;tb<4;tb++){
          var ta=tb*Math.PI/2+variant*.6;
          smoothOrb(.054,fCols[(tb+variant)%5],Math.cos(ta)*.21,.98+(tb%2)*.07,Math.sin(ta)*.21,false);
        }
      });
    }
    function hangingLantern(x,y,z,rot){
      emitCached('hangingLantern', x, y, z, rot || 0, 1, function(){
        post(.07,2.45,'#55453b',0,0,0);
        block(.1,.1,.62,'#55453b',0,2.36,.26,0,'timber');
        add(cyl(.02,.02,.25,6),'#d6a34b',0,2.2,.5,0,0,0,false);
        add(cyl(.22,.16,.32,6),'#ffd58c',0,1.94,.5,0,0,0,false);
        add(cone(.26,.18,6),'#3c4e5c',0,2.16,.5,0,0,0,'roof');
      });
    }
    function marketStall(x,y,z,rot,col1,col2){
      var c1=col1||'#e86f68', c2=col2||'#fff1d0';
      emitCached('marketStall:' + c1 + ':' + c2, x, y, z, rot || 0, 1, function(){
        wornBox(2.8,.16,2.0,'#936443',0,.08,0,'timber');
        post(.09,2.2,'#754c38',-1.2,0,-.75); post(.09,2.2,'#754c38',1.2,0,-.75);
        post(.08,1.95,'#754c38',-1.2,0,.75); post(.08,1.95,'#754c38',1.2,0,.75);
        for(var aw=-2;aw<=2;aw++){
          var awMesh=block(.54,.1,1.95,aw%2?c2:c1,aw*.54,2.12,0,0,'fabric');
          awMesh.rotation.x=.16;
        }
        wornBox(2.4,.58,.65,'#b5865a',0,.44,.45,'timber');
        crate(-.72,.74,.42,.62); crate(-.72,1.1,.42,.46);
        crate(.65,.16,-.35,.82);
        barrel(-.65,.16,-.35,.88); barrel(.15,.16,-.42,.82);
        ropeCoil(.72,.76,.45);
      });
    }
    function buoy(x,z,col,wy){
      var y=wy!==undefined?wy:-.55, bc=col||'#d85652';
      foamRing(x,y-.03,z,.68);
      emitCached('buoy:' + bc, x, y, z, 0, 1, function(){
        add(cyl(.48,.56,.26,10),bc,0,.08,0,0,0,0,false);
        add(cyl(.22,.36,.52,8),'#f5efe0',0,.45,0,0,0,0,false);
        add(cyl(.14,.18,.34,8),bc,0,.86,0,0,0,0,false);
        orb(.13,'#ffe28a',0,1.1,0,false);
      });
    }
    // iter24 m4: Crafted Mario Party 8 coastal sailboat geometry builders (cached & owned for zero-leak disposal).
    // Sculpted lofted tapered wooden hull (pointed bow, curved sheer, raked transom stern, curved gunwale trim,
    // recessed teak cockpit, cambered foredeck, wooden thwarts, stern rudder & tiller) + curved billowing 3D
    // fabric mainsail with conforming coastal stripe band, billowing 3D jib sail, wooden boom/gaff, stays & pennant.
    function sbHullEval(u,v){
      var zKeel=-1.44+u*3.30, zSheer=-1.60+u*3.78;
      var z=zKeel+(zSheer-zKeel)*Math.pow(v,1.32);
      var ySheer=.50+.12*Math.pow(Math.max(0,1-u/.36),2)+.28*Math.pow(Math.max(0,(u-.36)/.64),2.05);
      var yKeel=-.08+.12*Math.pow(u,2.1)+.05*Math.pow(1-u,2);
      var beam=u<.44 ? (.56+.42*Math.sin((u/.44)*Math.PI*.5)) : (.98*Math.pow(Math.max(0,Math.cos(((u-.44)/.56)*Math.PI*.5)),.80));
      var wf=.06+.94*Math.pow(Math.sin(v*Math.PI*.5),.72);
      var y=yKeel+(ySheer-yKeel)*(.18*v+.82*Math.pow(v,1.15));
      return { x:beam*wf, y:y, z:z, beam:beam, ySheer:ySheer, zSheer:zSheer };
    }
    function sbMainEval(u,v){
      var z0=.24, y0=1.06+v*2.32;
      var z1=-1.36+.92*Math.pow(v,1.15)-.15*Math.sin(v*Math.PI);
      var y1=1.06+v*2.46;
      var z=z0+(z1-z0)*u;
      var y=y0+(y1-y0)*u+.05*Math.sin(u*Math.PI)*(1-v);
      var draftU=Math.sin(Math.pow(u,.80)*Math.PI);
      var draftV=.24+.76*Math.sin(v*Math.PI);
      var belly=.48*draftU*draftV*(1-.20*v);
      var swing=.18*u;
      return [belly+swing, y, z, belly];
    }
    function sbJibEval(u,v){
      var z0=2.24+(0.30-2.24)*v, y0=.86+(3.24-.86)*v;
      var z1=.56+(0.26-.56)*v,  y1=1.04+(3.24-1.04)*v;
      var z=z0+(z1-z0)*u, y=y0+(y1-y0)*u;
      var draftU=Math.sin(Math.pow(u,.82)*Math.PI);
      var draftV=.28+.72*Math.sin(v*Math.PI);
      var belly=.34*draftU*draftV*(1-.70*v*v);
      var swing=.16*u*(1-v);
      return [belly+swing, y, z, belly];
    }
    function buildClosedSailGeo(key,nu,nv,vMin,vMax,evalFn,halfThick,shadeFn){
      if(geos[key]) return geos[key];
      var cols=nu+1, rows=nv+1, ringN=cols*rows, p=[], c=[], idx=[], pts=[], nrms=[];
      for(var j=0;j<=nv;j++){
        var vf=vMin+(vMax-vMin)*(j/nv);
        for(var i=0;i<=nu;i++){
          var uf=i/nu;
          pts.push(evalFn(uf,vf));
        }
      }
      // Compute smooth surface normals via central differences along u & v
      for(var j=0;j<=nv;j++){
        for(var i=0;i<=nu;i++){
          var i0=Math.max(0,i-1), i1=Math.min(nu,i+1), j0=Math.max(0,j-1), j1=Math.min(nv,j+1);
          var pu0=pts[j*cols+i0], pu1=pts[j*cols+i1], pv0=pts[j0*cols+i], pv1=pts[j1*cols+i];
          var dux=pu1[0]-pu0[0], duy=pu1[1]-pu0[1], duz=pu1[2]-pu0[2];
          var dvx=pv1[0]-pv0[0], dvy=pv1[1]-pv0[1], dvz=pv1[2]-pv0[2];
          // u goes -Z, v goes +Y -> du x dv points -X; dv x du points +X (windward belly outward!)
          var nx=dvy*duz-dvz*duy, ny=dvz*dux-dvx*duz, nz=dvx*duy-dvy*dux;
          var nl=Math.hypot(nx,ny,nz)||1;
          if(nx<0){ nx=-nx; ny=-ny; nz=-nz; }
          nrms.push([nx/nl,ny/nl,nz/nl]);
        }
      }
      for(var side=0;side<2;side++){
        var sgn=side?-1:1;
        for(var j=0;j<=nv;j++){
          var vf=vMin+(vMax-vMin)*(j/nv);
          for(var i=0;i<=nu;i++){
            var k=j*cols+i, pt=pts[k], nm=nrms[k];
            p.push(pt[0]+nm[0]*halfThick*sgn, pt[1]+nm[1]*halfThick*sgn, pt[2]+nm[2]*halfThick*sgn);
            var sh=shadeFn(i/nu,vf,pt[3],j,side);
            c.push(sh[0],sh[1],sh[2]);
          }
        }
      }
      // Front face (side=0, outward along +N = +X): since du is -Z and dv is +Y, (du x dv) = (-Z) x (+Y) = +X -> (a, b, cc)!
      for(var j=0;j<nv;j++) for(var i=0;i<nu;i++){
        var a=j*cols+i, b=a+1, cc=a+cols, d=cc+1;
        idx.push(a,b,cc, b,d,cc);
        var a2=ringN+a, b2=ringN+b, c2=ringN+cc, d2=ringN+d;
        idx.push(a2,c2,b2, b2,c2,d2);
      }
      // Stitch watertight sail hem perimeter around all 4 edges (outward CCW)
      var perim=[];
      for(var i=0;i<=nu;i++) perim.push(i);
      for(var j=1;j<=nv;j++) perim.push(j*cols+nu);
      for(var i=nu-1;i>=0;i--) perim.push(nv*cols+i);
      for(var j=nv-1;j>=1;j--) perim.push(j*cols);
      for(var e=0;e<perim.length;e++){
        var eA=perim[e], eB=perim[(e+1)%perim.length];
        idx.push(eA,eA+ringN,eB, eB,eA+ringN,eB+ringN);
      }
      var g=own(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(c,3));
      g.setIndex(idx); g.computeVertexNormals();
      geos[key]=g; return g;
    }
    function sailboatParts(){
      if(geos.sbHull) return;
      // 1. Lofted curved 3D wooden hull (pointed bow, curved sheer, curved bilge, closed raked transom stern)
      var nu=14, nv=7, cols=nv*2+1, p=[], c=[], idx=[];
      for(var i=0;i<=nu;i++){
        var u=i/nu;
        for(var j=0;j<cols;j++){
          var side=j<nv?-1:(j>nv?1:0), v=Math.abs(j-nv)/nv;
          var ev=sbHullEval(u,v);
          p.push(side*ev.x, ev.y, ev.z);
          var plank=1+.024*Math.sin(v*Math.PI*5);
          var sh=(v<.25?(.74+.55*v):(.88+.14*Math.sin(v*Math.PI*.72)))*plank;
          c.push(sh,sh*.99,sh*.97);
        }
      }
      for(var i=0;i<nu;i++) for(var j=0;j<cols-1;j++){
        var a=i*cols+j, b=(i+1)*cols+j, cc=a+1, d=b+1;
        idx.push(a,cc,b, b,cc,d);
      }
      // Closed raked transom stern cap (u=0, normal -Z)
      var tc=p.length/3; p.push(0,.34,-1.54); c.push(.90,.89,.87);
      for(var j=0;j<cols-1;j++) idx.push(tc,j+1,j);
      var hg=own(new T.BufferGeometry());
      hg.setAttribute('position',new T.Float32BufferAttribute(p,3));
      hg.setAttribute('color',new T.Float32BufferAttribute(c,3));
      hg.setIndex(idx); hg.computeVertexNormals(); geos.sbHull=hg;

      // 2. Crisp painted cream cove stripe wrapping smoothly around both curved hull flanks (v in [0.74..0.86])
      var sp=[], sc=[], sidx=[];
      [-1,1].forEach(function(sd,si){
        var base=sp.length/3;
        for(var i=0;i<=nu;i++){
          var u=i/nu, e0=sbHullEval(u,.73), e1=sbHullEval(u,.85);
          var off=u>.96?.004:.016;
          sp.push(sd*(e0.x+off), e0.y, e0.z, sd*(e1.x+off), e1.y, e1.z);
          sc.push(.94,.93,.90, 1.0,1.0,.97);
        }
        for(var i=0;i<nu;i++){
          var a=base+i*2, b=a+2, cc=a+1, d=b+1;
          if(sd>0) sidx.push(a,cc,b, b,cc,d); else sidx.push(a,b,cc, b,d,cc);
        }
      });
      var sg=own(new T.BufferGeometry());
      sg.setAttribute('position',new T.Float32BufferAttribute(sp,3));
      sg.setAttribute('color',new T.Float32BufferAttribute(sc,3));
      sg.setIndex(sidx); sg.computeVertexNormals(); geos.sbStripe=sg;

      // 3. Sculpted curved cream gunwale rub-rail swept smoothly along port sheer, bow stem, starboard sheer & transom
      var gp=[], gc=[], gidx=[];
      function pushRailTube(pts,closed){
        var n=pts.length, base=gp.length/3;
        for(var i=0;i<n;i++){
          var cur=pts[i], prev=pts[Math.max(0,i-1)], next=pts[Math.min(n-1,i+1)];
          var tx=next[0]-prev[0], tz=next[2]-prev[2], tl=Math.hypot(tx,tz)||1;
          // Outward perpendicular in XZ
          var ox=cur[3], oz=cur[4], ol=Math.hypot(ox,oz)||1; ox/=ol; oz/=ol;
          var rO=.055, rI=-.042, yT=.046, yB=-.042;
          gp.push(
            cur[0]+ox*rO, cur[1]+yT, cur[2]+oz*rO,
            cur[0]+ox*rI, cur[1]+yT, cur[2]+oz*rI,
            cur[0]+ox*rI, cur[1]+yB, cur[2]+oz*rI,
            cur[0]+ox*rO, cur[1]+yB, cur[2]+oz*rO
          );
          gc.push(1,1,.98, .96,.95,.92, .84,.82,.78, .92,.90,.87);
        }
        var segs=closed?n:(n-1);
        for(var i=0;i<segs;i++){
          var a=base+i*4, b=base+((i+1)%n)*4;
          for(var f=0;f<4;f++){
            var f2=(f+1)%4;
            gidx.push(a+f,a+f2,b+f, a+f2,b+f2,b+f);
          }
        }
      }
      // Build one continuous closed sheer loop: starboard stern -> bow -> port stern -> across transom
      var sheerLoop=[];
      for(var i=0;i<=nu;i++){ var e=sbHullEval(i/nu,1); sheerLoop.push([e.x, e.y, e.z, i===nu?0:1, i===nu?1:.12]); }
      for(var i=nu-1;i>=0;i--){ var e=sbHullEval(i/nu,1); sheerLoop.push([-e.x, e.y, e.z, -1, .12]); }
      var eT=sbHullEval(0,1);
      sheerLoop.push([-eT.x*.5, eT.y+.005, eT.z, 0, -1]);
      sheerLoop.push([ eT.x*.5, eT.y+.005, eT.z, 0, -1]);
      pushRailTube(sheerLoop,true);
      var gg=own(new T.BufferGeometry());
      gg.setAttribute('position',new T.Float32BufferAttribute(gp,3));
      gg.setAttribute('color',new T.Float32BufferAttribute(gc,3));
      gg.setIndex(gidx); gg.computeVertexNormals(); geos.sbGunwale=gg;

      // 4. Recessed warm-teak cockpit sole (u=0.02..0.58) + cambered foredeck (u=0.56..0.99) — strict +Y upward normals!
      var dp=[], dc=[], didx=[];
      function addDeckStrip(u0,u1,steps,yFn,colLo,colHi){
        var base=dp.length/3;
        for(var i=0;i<=steps;i++){
          var u=u0+(u1-u0)*(i/steps), ev=sbHullEval(u,1), hw=ev.beam*.92, z=ev.zSheer*.98;
          var yEdge=yFn(u,0), yMid=yFn(u,1);
          dp.push(-hw,yEdge,z, 0,yMid,z, hw,yEdge,z);
          var pl=.95+.05*Math.sin(i*1.9);
          dc.push(colLo*pl,colLo*pl*.98,colLo*pl*.94, colHi*pl,colHi*pl*.98,colHi*pl*.95, colLo*pl,colLo*pl*.98,colLo*pl*.94);
        }
        for(var i=0;i<steps;i++){
          var a=base+i*3, b=a+3;
          // +Y normal: (-X -> 0 -> +X) x (+Z): (a+1 - a) is +X, (b - a) is +Z, (+X) x (+Z) = -Y -> so (a, b, a+1) is +Y!
          didx.push(a,b,a+1, a+1,b,b+1, a+1,b+1,a+2, a+2,b+1,b+2);
        }
      }
      addDeckStrip(.02,.58,8,function(){ return .30; },.86,.94);
      addDeckStrip(.56,1.0,8,function(u,mid){ var ev=sbHullEval(u,1), f=Math.sin(Math.min(1,Math.max(0,(u-.56)/.44))*Math.PI); return ev.ySheer-.045+(mid?.045*f:0); },.94,1.02);
      var dg=own(new T.BufferGeometry());
      dg.setAttribute('position',new T.Float32BufferAttribute(dp,3));
      dg.setAttribute('color',new T.Float32BufferAttribute(dc,3));
      dg.setIndex(didx); dg.computeVertexNormals(); geos.sbDeck=dg;

      // 5. Warm varnished cedar inner cockpit wall liner (faces INWARD into cockpit, zero see-through!)
      var lp=[], lc=[], lidx=[];
      [-1,1].forEach(function(sd){
        var base=lp.length/3;
        for(var i=0;i<=8;i++){
          var u=.02+.56*(i/8), ev=sbHullEval(u,1), hw=ev.beam*.92, z=ev.zSheer*.98;
          lp.push(sd*hw,.29,z, sd*hw,ev.ySheer-.01,z);
          lc.push(.78,.75,.70, .96,.94,.90);
        }
        for(var i=0;i<8;i++){
          var a=base+i*2, b=a+2, cc=a+1, d=b+1;
          // Starboard (sd=+1) needs -X normal: (+Z) x (+Y) = -X -> (a, b, cc)
          if(sd>0) lidx.push(a,b,cc, b,d,cc); else lidx.push(a,cc,b, b,cc,d);
        }
      });
      // Transom inner wall (u=.02, normal +Z) & foredeck bulkhead step (u=.58, normal -Z)
      var eS=sbHullEval(.02,1), hwS=eS.beam*.92, zS=eS.zSheer*.98, b0=lp.length/3;
      lp.push(-hwS,.29,zS, hwS,.29,zS, hwS,eS.ySheer-.01,zS, -hwS,eS.ySheer-.01,zS);
      lc.push(.78,.75,.70, .78,.75,.70, .94,.92,.88, .94,.92,.88);
      lidx.push(b0,b0+1,b0+2, b0,b0+2,b0+3);
      var eF=sbHullEval(.58,1), hwF=eF.beam*.92, zF=eF.zSheer*.98, b1=lp.length/3;
      lp.push(hwF,.29,zF, -hwF,.29,zF, -hwF,eF.ySheer-.03,zF, hwF,eF.ySheer-.03,zF);
      lc.push(.78,.75,.70, .78,.75,.70, .94,.92,.88, .94,.92,.88);
      lidx.push(b1,b1+1,b1+2, b1,b1+2,b1+3);
      var lg=own(new T.BufferGeometry());
      lg.setAttribute('position',new T.Float32BufferAttribute(lp,3));
      lg.setAttribute('color',new T.Float32BufferAttribute(lc,3));
      lg.setIndex(lidx); lg.computeVertexNormals(); geos.sbLiner=lg;

      // 6. Curved billowing 3D fabric Mainsail + conforming nautical stripe band + billowing 3D Jib + fluttering Pennant
      buildClosedSailGeo('sbMainSail',8,10,0,1,sbMainEval,.022,function(u,v,belly,row){
        var seam=(row%2===0)?.94:1.0;
        var sh=(.83+.11*v+.10*Math.min(1,belly*2.1))*seam;
        return [sh,sh*.99,sh*.95];
      });
      buildClosedSailGeo('sbMainStripe',8,2,.28,.44,sbMainEval,.032,function(u,v,belly){
        var sh=.92+.10*Math.min(1,belly*2.0);
        return [sh,sh,sh];
      });
      buildClosedSailGeo('sbJibSail',6,8,0,1,sbJibEval,.018,function(u,v,belly,row){
        var seam=(row%2===0)?.95:1.0;
        var sh=(.84+.11*v+.09*Math.min(1,belly*2.5))*seam;
        return [sh,sh*.99,sh*.95];
      });
      buildClosedSailGeo('sbPennant',6,2,0,1,function(u,v){
        var z=.24-u*.66, h=.19*(1-u*.86), y=3.62+(v-.5)*h+.03*Math.sin(u*Math.PI*2.2);
        var wave=.065*Math.sin(u*Math.PI*2.4)*u;
        return [wave, y, z, Math.abs(wave)];
      },.010,function(u){ var sh=.92+.08*(1-u); return [sh,sh,sh]; });
    }
    function sailboat(x,z,rot,hullCol,sailCol,scale,wy){
      sailboatParts();
      var k=scale||1, y=wy!==undefined?wy:-.58, hCol=hullCol||'#4d8898';
      var sTone=sailCol ? '#'+new T.Color(sailCol).lerp(new T.Color('#d9c7a4'),.36).getHexString() : '#e6d8bc';
      smoothFoamRing(x,y+.004,z,1.26*k,2.04*k);
      emitCached('sailboat:' + hCol + ':' + sTone, x, y, z, rot || 0, k, function(){
        add(geos.sbHull,hCol,0,0,0,0,0,0,'timber');
        add(geos.sbStripe,'#f6ebd2',0,0,0,0,0,0,false);
        add(geos.sbGunwale,'#f6ebd2',0,0,0,0,0,0,'timber');
        add(geos.sbDeck,'#d4a972',0,0,0,0,0,0,'timber');
        add(geos.sbLiner,'#9e734a',0,0,0,0,0,0,'timber');
        block(1.58,.065,.28,'#c8965c',0,.43,-.28,0,'timber');
        block(1.34,.065,.26,'#c8965c',0,.44,-.98,0,'timber');
        block(1.06,.065,.24,'#b98650',0,.48,-1.42,0,'timber');
        block(1.52,.07,.09,'#f5e8cc',0,.55,.52,0,'timber');
        limb(0,.74,1.94,0,.22,1,.54,.052,.030,'#8d6342','timber');
        add(cyl(.038,.046,.08,8),'#e5bc5b',0,.69,1.45,0,0,0,false);
        block(.18,.035,.05,'#e5bc5b',0,.74,1.45,0,false);
        block(.065,.56,.26,'#774f34',0,.24,-1.66,0,'timber');
        limb(0,.62,-1.56,.12,.06,1,.64,.034,.026,'#8b5e3c','timber');
        smoothOrb(.040,'#e5bc5b',.08,.66,-.92,false);
        add(cyl(.11,.14,.12,10),'#6a4830',0,.56,.24,0,0,0,'timber');
        add(cyl(.040,.068,3.34,10),'#7d583c',0,2.18,.24,0,0,0,'timber');
        block(.62,.036,.042,'#966b48',0,2.54,.24,0,'timber');
        smoothOrb(.068,'#e8c05c',0,3.86,.24,false);
        add(cyl(.082,.082,.07,10),'#e5bc5b',0,1.04,.24,0,0,0,false);
        limb(0,1.04,.24,.18,0,-1.64,1.65,.044,.034,'#9c714c','timber');
        limb(0,3.39,.24,.18,.16,-.70,.74,.036,.026,'#9c714c','timber');
        var stR=.014;
        limb(0,.86,2.38,0,2.44,-2.14,3.25,stR,stR,'#dbc696','rope');
        limb(0,.62,-1.58,0,2.94,1.82,3.46,stR,stR,'#dbc696','rope');
        [-1,1].forEach(function(sd){ limb(sd*.86,.55,.14,-sd*.86,2.76,.10,2.89,stR,stR,'#d4be8e','rope'); });
        add(geos.sbMainSail,sTone,0,0,0,0,0,0,'fabric');
        add(geos.sbMainStripe,hCol,0,0,0,0,0,0,'fabric');
        add(geos.sbJibSail,sTone,0,0,0,0,0,0,'fabric');
        add(geos.sbPennant,'#e85a50',0,0,0,0,0,0,'fabric');
      });
    }
    // Layered vertex-colored ocean plane below every region: shallow turquoise
    // near the board and islands, blending into deeper cobalt-teal with sunlit crests.
    var bounds=sp.bounds || {minX:-30,maxX:30,minZ:-30,maxZ:30};
    if(view.floor) view.floor.visible=false;
    var midX=(bounds.minX+bounds.maxX)/2, midZ=(bounds.minZ+bounds.maxZ)/2,
        waterW=Math.max(bounds.maxX-bounds.minX+180,240), waterD=Math.max(bounds.maxZ-bounds.minZ+180,240),
        waterY=id==='captain'?-1.1:-.64,
        oceanPal={
          town:{shallow:'#74e2eb',deep:'#164a70',crest:'#d8fdff'},
          lagoon:{shallow:'#58d4c7',deep:'#2a7d8a',crest:'#8be8d8'},
          caves:{shallow:'#5694b6',deep:'#2e5976',crest:'#88c9e4'},
          patterns:{shallow:'#67b7dc',deep:'#35689e',crest:'#8fd3ee'},
          beach:{shallow:'#74dce0',deep:'#3388a8',crest:'#a6efe8'},
          light:{shallow:'#66bdca',deep:'#29607a',crest:'#96e2eb'},
          captain:{shallow:'#56a9cc',deep:'#245782',crest:'#8ad0ec'}
        }[id],
        cShallow=new T.Color(oceanPal.shallow), cDeep=new T.Color(oceanPal.deep),
        cCrest=new T.Color(oceanPal.crest), cTmp=new T.Color(),
        waterSegs=id==='town'?48:32,
        waterGeo=own(new T.PlaneGeometry(waterW,waterD,waterSegs,waterSegs));
    waterGeo.rotateX(-Math.PI/2);
    var wPos=waterGeo.attributes.position, wCol=new Float32Array(wPos.count*3);
    for(var wi=0;wi<wPos.count;wi++){
      var lx=wPos.getX(wi), lz=wPos.getZ(wi), wx=midX+lx, wz=midZ+lz, minD=999;
      for(var si=0;si<sp.length;si++){
        var dSp=Math.hypot(wx-sp[si].x,wz-sp[si].z);
        if(dSp<minD) minD=dSp;
      }
      var wt=Math.min(1,Math.max(0,id==='town'?(minD-1.5)/16:(minD-4.5)/20)); wt=wt*wt*(3-2*wt);
      var wave=.036*Math.sin(wx*.18+wz*.14)+.022*Math.cos(wx*.30-wz*.24);
      wPos.setY(wi,wPos.getY(wi)+wave);
      cTmp.copy(cShallow).lerp(cDeep,wt);
      if(wave>0) cTmp.lerp(cCrest,Math.min(id==='town'?.62:.56,wave*(id==='town'?8.5:6.2)));
      wCol[wi*3]=cTmp.r; wCol[wi*3+1]=cTmp.g; wCol[wi*3+2]=cTmp.b;
    }
    waterGeo.setAttribute('color',new T.BufferAttribute(wCol,3));
    waterGeo.computeVertexNormals();
    var water=add(waterGeo,'#ffffff',midX,waterY,midZ,0,0,0,false);
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
      var out=[],w=wood?6.4:1.2,h=wood?1.15:0.85,gap=wood?.035:.042;
      polygons.forEach(function(poly){
        var xs=poly.map(function(p){return p[0];}),zs=poly.map(function(p){return p[1];});
        for(var row=Math.floor(Math.min.apply(null,zs)/h);row<=Math.floor(Math.max.apply(null,zs)/h);row++){
          var shift=(row%2)*w/2;
          for(var col=Math.floor((Math.min.apply(null,xs)-shift)/w);col<=Math.floor((Math.max.apply(null,xs)-shift)/w);col++){
            var x=col*w+shift,z=row*h,q=clipped(poly,0,x+gap,true);
            q=clipped(q,0,x+w-gap,false);q=clipped(q,1,z+gap,true);q=clipped(q,1,z+h-gap,false);
            if(q.length<3)continue;
            var tone=(wood?.94:.91)+.05*Math.sin(row*13+col*7), minZ=z+gap;
            out.push(q.map(function(v){return [v[0],v[1],tone+.045*(v[1]-minZ)/h+.025*(v[0]-cx)/(bounds.maxX-bounds.minX+1)];}));
          }
        }
      });
      return painted(out,y,wood?'#b78d65':'#d8c8aa',wood?'longitudinal-planks':'staggered-paving');
    }
    // M9 + m7: Seamless repeating MP8-style procedural CanvasTextures for Lighthouse meadow turf,
    // Pattern Reef turquoise coral-sand seabed, and Harbor Town weathered stone curb blocks.
    function makeProcCanvas(size){
      if(typeof document==='undefined' || typeof document.createElement!=='function') return null;
      var cv=document.createElement('canvas');
      if(!cv || typeof cv.getContext!=='function') return null;
      cv.width=size; cv.height=size;
      var ctx=cv.getContext('2d');
      if(!ctx || typeof ctx.fillRect!=='function' || typeof ctx.createRadialGradient!=='function') return null;
      return { cv:cv, ctx:ctx, size:size };
    }
    function procHash(a,b){
      var v=Math.sin(a*127.1+b*311.7)*43758.5453;
      return v-Math.floor(v);
    }
    function wrapTileDraw(size,x,y,pad,fn){
      for(var ox=-size;ox<=size;ox+=size){
        if(x+ox+pad<0 || x+ox-pad>size) continue;
        for(var oy=-size;oy<=size;oy+=size){
          if(y+oy+pad<0 || y+oy-pad>size) continue;
          fn(x+ox,y+oy);
        }
      }
    }
    function makeTurfGroundTex(){
      var S=512, p=makeProcCanvas(S); if(!p) return null;
      var ctx=p.ctx;
      // Rich sunlit coastal meadow base (warm MP8 grass, never flat neon lime)
      ctx.fillStyle='#6db954'; ctx.fillRect(0,0,S,S);
      // 1. Broad organic sunlit clover pools, cool mossy hollows & subtle coastal earth/stone variation
      var patchCols=[
        ['rgba(154,214,94,0.34)','rgba(154,214,94,0.0)'],
        ['rgba(182,226,114,0.24)','rgba(182,226,114,0.0)'],
        ['rgba(70,140,66,0.28)','rgba(70,140,66,0.0)'],
        ['rgba(86,154,74,0.22)','rgba(86,154,74,0.0)'],
        ['rgba(152,150,104,0.16)','rgba(152,150,104,0.0)']
      ];
      for(var i=0;i<30;i++){
        var px=procHash(i,1)*S, py=procHash(i,2)*S, pr=42+procHash(i,3)*78, pc=patchCols[i%patchCols.length];
        wrapTileDraw(S,px,py,pr+4,function(wx,wy){
          var g=ctx.createRadialGradient(wx,wy,pr*.08,wx,wy,pr);
          g.addColorStop(0,pc[0]); g.addColorStop(1,pc[1]);
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(wx,wy,pr,0,Math.PI*2); ctx.fill();
        });
      }
      // 2. Subtle mossy coastal pebble/stone flecks embedded in the turf
      for(var si=0;si<24;si++){
        var sx=procHash(si,11)*S, sy=procHash(si,12)*S, sr=4.5+procHash(si,13)*7.5, sa=procHash(si,14)*Math.PI;
        wrapTileDraw(S,sx,sy,sr+4,function(wx,wy){
          ctx.save(); ctx.translate(wx,wy); ctx.rotate(sa);
          ctx.fillStyle=si%2?'rgba(148,154,116,0.28)':'rgba(176,174,136,0.24)';
          ctx.beginPath(); ctx.ellipse(0,0,sr*1.15,sr*.72,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(76,124,64,0.18)';
          ctx.beginPath(); ctx.ellipse(sr*.12,sr*.18,sr*.95,sr*.58,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        });
      }
      // 3. Layered painterly grass blade tufts (curved tapered strokes in 4 sunlit-to-moss tones)
      var bladeCols=['#4a8f45','#5ca84c','#84ca5d','#a9dc74'];
      ctx.lineCap='round';
      for(var gi=0;gi<340;gi++){
        var gx=procHash(gi,21)*S, gy=procHash(gi,22)*S, gl=11+procHash(gi,23)*15;
        var baseCol=bladeCols[gi%bladeCols.length], lean=(procHash(gi,24)-.5)*11;
        wrapTileDraw(S,gx,gy,gl+8,function(wx,wy){
          ctx.strokeStyle=baseCol;
          for(var b=-1;b<=1;b++){
            ctx.lineWidth=b===0?2.6:1.9;
            var bx=wx+b*3.4, bl=gl*(b===0?1:.76), bend=lean+b*5.2;
            ctx.beginPath();
            ctx.moveTo(bx,wy);
            ctx.quadraticCurveTo(bx+bend*.45,wy-bl*.58,bx+bend,wy-bl);
            ctx.stroke();
          }
        });
      }
      // 4. Warm sunlit clover rosettes & delicate buttercup/daisy pollen specks
      for(var ci=0;ci<42;ci++){
        var cx2=procHash(ci,31)*S, cy2=procHash(ci,32)*S, cr=3.8+procHash(ci,33)*2.8, rot=procHash(ci,34)*Math.PI*2;
        var clCol=ci%2?'rgba(134,206,92,0.68)':'rgba(162,222,108,0.62)';
        wrapTileDraw(S,cx2,cy2,cr*3+2,function(wx,wy){
          ctx.fillStyle=clCol;
          for(var lf=0;lf<3;lf++){
            var la=rot+lf*2.094;
            ctx.beginPath(); ctx.arc(wx+Math.cos(la)*cr*.85,wy+Math.sin(la)*cr*.85,cr*.78,0,Math.PI*2); ctx.fill();
          }
          ctx.fillStyle='rgba(72,134,62,0.45)';
          ctx.beginPath(); ctx.arc(wx,wy,cr*.34,0,Math.PI*2); ctx.fill();
        });
      }
      for(var fi=0;fi<20;fi++){
        var fx=procHash(fi,41)*S, fy=procHash(fi,42)*S, fr=2.2+procHash(fi,43)*1.6;
        wrapTileDraw(S,fx,fy,fr+3,function(wx,wy){
          ctx.fillStyle=fi%3===0?'rgba(255,244,186,0.78)':fi%3===1?'rgba(255,248,224,0.72)':'rgba(255,204,212,0.64)';
          ctx.beginPath(); ctx.arc(wx,wy,fr,0,Math.PI*2); ctx.fill();
        });
      }
      var tex=new T.CanvasTexture(p.cv);
      tex.wrapS=T.RepeatWrapping; tex.wrapT=T.RepeatWrapping; tex.anisotropy=4;
      return tex;
    }
    function makeSeabedGroundTex(){
      var S=512, p=makeProcCanvas(S); if(!p) return null;
      var ctx=p.ctx;
      // Luminous dappled turquoise coral-sand seabed base
      ctx.fillStyle='#7ab9b1'; ctx.fillRect(0,0,S,S);
      // 1. Soft warm coral-sand drifts & cool deeper lagoon pockets
      var drifts=[
        ['rgba(214,214,182,0.28)','rgba(214,214,182,0.0)'],
        ['rgba(154,220,212,0.28)','rgba(154,220,212,0.0)'],
        ['rgba(64,136,140,0.24)','rgba(64,136,140,0.0)'],
        ['rgba(82,158,156,0.22)','rgba(82,158,156,0.0)']
      ];
      for(var i=0;i<24;i++){
        var px=procHash(i,51)*S, py=procHash(i,52)*S, pr=48+procHash(i,53)*78, dc=drifts[i%drifts.length];
        wrapTileDraw(S,px,py,pr+4,function(wx,wy){
          var g=ctx.createRadialGradient(wx,wy,pr*.08,wx,wy,pr);
          g.addColorStop(0,dc[0]); g.addColorStop(1,dc[1]);
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(wx,wy,pr,0,Math.PI*2); ctx.fill();
        });
      }
      // 2. Gentle periodic underwater sand-ripple bands (paired sunlit crest + shaded trough)
      ctx.lineCap='round';
      for(var row=0;row<12;row++){
        var baseY=(row+.5)*(S/12);
        for(var pass=0;pass<2;pass++){
          ctx.strokeStyle=pass===0?'rgba(62,126,130,0.20)':'rgba(176,232,224,0.32)';
          ctx.lineWidth=pass===0?11:7.5;
          var yOff=pass===0?4.5:0;
          ctx.beginPath();
          for(var x=0;x<=S;x+=16){
            var ang=x*Math.PI*2/S;
            var y=baseY+yOff+Math.sin(ang*2+row*1.1)*9+Math.cos(ang-row*.7)*5;
            if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.stroke();
        }
      }
      // 3. Soft interlaced underwater sunlight caustic light-web ribbons (below bloom blowout!)
      for(var ci=0;ci<24;ci++){
        var rx=procHash(ci,61)*S, ry=procHash(ci,62)*S, rr=24+procHash(ci,63)*34;
        var asp=1.0+procHash(ci,64)*.55, rot=procHash(ci,65)*Math.PI;
        wrapTileDraw(S,rx,ry,rr*asp+12,function(wx,wy){
          ctx.strokeStyle='rgba(182,238,230,0.24)'; ctx.lineWidth=8.5;
          ctx.beginPath(); ctx.ellipse(wx,wy,rr*asp,rr*.78,rot,0,Math.PI*2); ctx.stroke();
          ctx.strokeStyle='rgba(222,250,244,0.32)'; ctx.lineWidth=2.6;
          ctx.beginPath(); ctx.ellipse(wx,wy,rr*asp,rr*.78,rot,0,Math.PI*2); ctx.stroke();
        });
      }
      // 4. Speckled coral grit & warm sand grains
      var gritCols=['rgba(244,232,202,0.58)','rgba(236,180,164,0.52)','rgba(178,236,228,0.52)','rgba(216,192,146,0.48)','rgba(76,136,138,0.42)'];
      for(var gi=0;gi<420;gi++){
        var gx=procHash(gi,71)*S, gy=procHash(gi,72)*S, gr=1.2+procHash(gi,73)*2.5;
        ctx.fillStyle=gritCols[gi%gritCols.length];
        wrapTileDraw(S,gx,gy,gr+2,function(wx,wy){
          ctx.beginPath(); ctx.arc(wx,wy,gr,0,Math.PI*2); ctx.fill();
        });
      }
      // 5. Delicate painted shell fragments & miniature scallop crescents
      var shCols=['#f4e7cd','#edc2b4','#e6e0d2','#f8d9b8'];
      for(var si=0;si<30;si++){
        var sx=procHash(si,81)*S, sy=procHash(si,82)*S, sr=4.2+procHash(si,83)*4.2, sRot=procHash(si,84)*Math.PI*2;
        var sCol=shCols[si%shCols.length];
        wrapTileDraw(S,sx,sy,sr+4,function(wx,wy){
          ctx.save(); ctx.translate(wx,wy); ctx.rotate(sRot);
          ctx.fillStyle='rgba(52,102,106,0.32)';
          ctx.beginPath(); ctx.arc(1.2,1.6,sr,0,Math.PI*1.15); ctx.closePath(); ctx.fill();
          ctx.fillStyle=sCol;
          ctx.beginPath(); ctx.arc(0,0,sr,0,Math.PI*1.15); ctx.closePath(); ctx.fill();
          ctx.strokeStyle='rgba(130,118,98,0.35)'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(sr*.85,sr*.35); ctx.moveTo(0,0); ctx.lineTo(sr*.3,sr*.88); ctx.stroke();
          ctx.restore();
        });
      }
      var tex=new T.CanvasTexture(p.cv);
      tex.wrapS=T.RepeatWrapping; tex.wrapT=T.RepeatWrapping; tex.anisotropy=4;
      return tex;
    }
    function makeHarborCurbTex(){
      var S=256, p=makeProcCanvas(S); if(!p) return null;
      var ctx=p.ctx;
      // Dressed weathered harbor granite / coastal limestone base
      ctx.fillStyle='#bab29f'; ctx.fillRect(0,0,S,S);
      // Warm coastal weathering & subtle mossy gutter darkening along outer edges
      var gEdge=ctx.createLinearGradient(0,0,S,0);
      gEdge.addColorStop(0,'rgba(92,88,74,0.34)');
      gEdge.addColorStop(.16,'rgba(226,220,202,0.22)');
      gEdge.addColorStop(.50,'rgba(196,190,172,0.06)');
      gEdge.addColorStop(.84,'rgba(226,220,202,0.20)');
      gEdge.addColorStop(1,'rgba(88,84,72,0.36)');
      ctx.fillStyle=gEdge; ctx.fillRect(0,0,S,S);
      // Soft granite mineral mottling
      for(var i=0;i<22;i++){
        var mx=procHash(i,91)*S, my=procHash(i,92)*S, mr=18+procHash(i,93)*34;
        var g=ctx.createRadialGradient(mx,my,2,mx,my,mr);
        g.addColorStop(0,i%2?'rgba(128,124,110,0.24)':'rgba(232,226,208,0.22)');
        g.addColorStop(1,'rgba(180,174,158,0.0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(mx,my,mr,0,Math.PI*2); ctx.fill();
      }
      // Fine chisel-dressed stone grain & coastal salt/mica flecks
      for(var j=0;j<240;j++){
        var fx=procHash(j,95)*S, fy=procHash(j,96)*S, fr=1+procHash(j,97)*2.2;
        ctx.fillStyle=j%3===0?'rgba(84,80,70,0.32)':j%3===1?'rgba(242,236,218,0.36)':'rgba(132,128,112,0.28)';
        ctx.fillRect(fx,fy,fr*1.3,fr);
      }
      // Subtle dressed stone end-bevel shadow & light chamfer highlight at block ends (v near 0 and 1)
      ctx.fillStyle='rgba(76,72,62,0.44)'; ctx.fillRect(0,0,S,6); ctx.fillRect(0,S-6,S,6);
      ctx.fillStyle='rgba(240,234,216,0.34)'; ctx.fillRect(0,6,S,5); ctx.fillRect(0,S-11,S,5);
      var tex=new T.CanvasTexture(p.cv);
      tex.wrapS=T.RepeatWrapping; tex.wrapT=T.RepeatWrapping; tex.anisotropy=4;
      return tex;
    }
    // m1 assist (iter17): Softly blended painterly CanvasTexture for recessed natural glistening tidepools
    // (Lighthouse Hana tidepool & Beach Bok splash-pool) — natural depth gradient, subtle caustics & feathered wet edge (zero neon pad!).
    function makeTidepoolWaterTex(kind){
      var S=512, p=makeProcCanvas(S); if(!p) return null;
      var ctx=p.ctx, isBeach=kind==='beach', cxT=S*.5, cyT=S*.5, seed=isBeach?2.4:0.9;
      if(typeof ctx.clearRect==='function') ctx.clearRect(0,0,S,S);
      function traceOrganic(scale){
        ctx.beginPath();
        for(var k=0;k<=64;k++){
          var a=k/64*Math.PI*2;
          var wob=1+.030*Math.sin(3*a+seed)+.020*Math.cos(5*a-seed*1.3)+.012*Math.sin(7*a+.6);
          var r=S*.445*scale*wob;
          var px=cxT+Math.cos(a)*r, py=cyT+Math.sin(a)*r;
          if(k===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.closePath();
      }
      // 1. Softly feathered natural translucent water body (deep cool teal center -> sunlit coastal mid -> feathered damp-rim fade)
      if(typeof ctx.save==='function'){
        ctx.save();
        traceOrganic(1.0);
        if(typeof ctx.clip==='function') ctx.clip();
      }
      var gBase=ctx.createRadialGradient(cxT-S*.03,cyT-S*.03,S*.03,cxT,cyT,S*.475);
      if(isBeach){
        gBase.addColorStop(0.00,'rgba(28,128,148,0.95)');
        gBase.addColorStop(0.36,'rgba(44,162,174,0.92)');
        gBase.addColorStop(0.68,'rgba(78,196,192,0.84)');
        gBase.addColorStop(0.86,'rgba(128,204,186,0.58)');
        gBase.addColorStop(0.95,'rgba(182,190,152,0.22)');
        gBase.addColorStop(1.00,'rgba(196,178,136,0.0)');
      }else{
        gBase.addColorStop(0.00,'rgba(26,102,126,0.95)');
        gBase.addColorStop(0.36,'rgba(40,134,152,0.92)');
        gBase.addColorStop(0.68,'rgba(64,168,176,0.84)');
        gBase.addColorStop(0.86,'rgba(82,158,154,0.56)');
        gBase.addColorStop(0.95,'rgba(94,136,120,0.20)');
        gBase.addColorStop(1.00,'rgba(98,126,106,0.0)');
      }
      ctx.fillStyle=gBase; ctx.fillRect(0,0,S,S);
      // 2. Subtle submerged sea-worn pebbles visible through the clear shallow outer band
      for(var pi=0;pi<18;pi++){
        var pa=pi/18*Math.PI*2+procHash(pi,101)*.32, pr=S*(.26+procHash(pi,102)*.12);
        var sx=cxT+Math.cos(pa)*pr, sy=cyT+Math.sin(pa)*pr, sr=6+procHash(pi,103)*9;
        if(typeof ctx.save==='function'){
          ctx.save(); ctx.translate(sx,sy); ctx.rotate(pa+.5);
          ctx.fillStyle=isBeach?(pi%2?'rgba(156,142,102,0.22)':'rgba(32,104,116,0.16)'):(pi%2?'rgba(116,138,118,0.22)':'rgba(22,74,88,0.18)');
          ctx.beginPath(); ctx.ellipse(0,0,sr*1.25,sr*.78,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
      }
      // 3. Gentle sunlit water caustic shimmer ribbons (soft painterly low-contrast curves, never glowing cyan!)
      ctx.lineCap='round';
      for(var ci=0;ci<16;ci++){
        var ca=ci/16*Math.PI*2+procHash(ci,107)*.4, cr=S*(.14+procHash(ci,108)*.21);
        var span=.45+procHash(ci,109)*.45;
        ctx.strokeStyle=isBeach?(ci%2?'rgba(216,250,246,0.24)':'rgba(190,244,238,0.18)'):(ci%2?'rgba(186,238,240,0.22)':'rgba(158,224,230,0.16)');
        ctx.lineWidth=2.6+procHash(ci,110)*2.8;
        ctx.beginPath();
        ctx.arc(cxT+Math.cos(ca+1.2)*S*.03,cyT+Math.sin(ca+1.2)*S*.03,cr,ca,ca+span);
        ctx.stroke();
      }
      // 4. Delicate broken natural shoreline water-lap wisps near the damp edge (no continuous bright ring!)
      for(var wi=0;wi<9;wi++){
        var wa=wi/9*Math.PI*2+.18+procHash(wi,115)*.25, wSpan=.24+procHash(wi,116)*.22;
        var wr=S*(.388+procHash(wi,117)*.020);
        ctx.strokeStyle=isBeach?'rgba(248,252,246,0.32)':'rgba(224,246,244,0.28)';
        ctx.lineWidth=2.4+(wi%2)*.9;
        ctx.beginPath(); ctx.arc(cxT,cyT,wr,wa,wa+wSpan); ctx.stroke();
      }
      // 5. Tiny delicate sunlit glistening water pinpoints (subtle natural specular sparkle)
      var glints=isBeach?[[.22,-.18],[-.26,-.08],[.10,-.29],[-.18,.24],[.30,.12]]:[[.24,-.16],[-.25,-.12],[.12,-.28],[-.20,.23],[.27,.16],[-.06,.30]];
      glints.forEach(function(gl,gi){
        var gx=cxT+gl[0]*S, gy=cyT+gl[1]*S, gr=gi%2?3.2:4.4;
        var gg=ctx.createRadialGradient(gx,gy,0.5,gx,gy,gr*2.8);
        gg.addColorStop(0,'rgba(255,254,246,0.68)');
        gg.addColorStop(.45,'rgba(232,252,250,0.26)');
        gg.addColorStop(1,'rgba(232,252,250,0.0)');
        ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(gx,gy,gr*2.8,0,Math.PI*2); ctx.fill();
      });
      if(typeof ctx.restore==='function') ctx.restore();
      var tex=new T.CanvasTexture(p.cv);
      tex.wrapS=T.ClampToEdgeWrapping; tex.wrapT=T.ClampToEdgeWrapping; tex.anisotropy=4;
      return tex;
    }
    // m1 assist (iter17): Continuous gently sloped recessed natural tidepool mesh + softly feathered glistening water surface
    function buildRecessedTidepool(cxP,czP,opts){
      var segs=36, gY=opts.groundY, wY=opts.waterY, rW=opts.rWater, rPeak=opts.rRimPeak, rOut=opts.rOuter;
      var frontAng=opts.frontAng||1.12, seed=opts.seed||0.9;
      function wob(a){ return 1+.030*Math.sin(3*a+seed)+.020*Math.cos(5*a-seed*1.3)+.012*Math.sin(7*a+.6); }
      var c0=new T.Color(opts.bedCenterCol), c1=new T.Color(opts.bedMidCol), c2=new T.Color(opts.wetSlopeCol);
      var c3=new T.Color(opts.rimCrestCol), c4=new T.Color(opts.shoulderCol), c5=new T.Color(opts.groundCol);
      var pos=[], col=[], idx=[];
      // Center submerged basin floor vertex (index 0)
      pos.push(cxP,wY-.024,czP); col.push(c0.r,c0.g,c0.b);
      var rings=[
        {r:rW*.66, yOff:function(){ return wY-.020; }, c:c1},
        {r:rW*.98, yOff:function(){ return wY-.012; }, c:c2},
        {r:rPeak,  yOff:function(a){ var f=Math.max(0,Math.cos(a-frontAng)); return wY+(opts.rimRiseBack*(1-f*.62)+opts.rimRiseFront*f*.62); }, c:c3},
        {r:rPeak+(rOut-rPeak)*.44, yOff:function(a){ var f=Math.max(0,Math.cos(a-frontAng)); return gY+(opts.shRiseBack*(1-f*.55)+opts.shRiseFront*f*.55); }, c:c4},
        {r:rOut,   yOff:function(){ return gY-.014; }, c:c5}
      ];
      for(var ri=0;ri<rings.length;ri++){
        var rg=rings[ri], rc=rg.c;
        for(var ai=0;ai<segs;ai++){
          var a=ai/segs*Math.PI*2, rr=rg.r*wob(a), sh=.96+.05*Math.sin(a*3+ri*1.1);
          pos.push(cxP+Math.cos(a)*rr, rg.yOff(a), czP+Math.sin(a)*rr);
          col.push(rc.r*sh, rc.g*sh, rc.b*sh);
        }
      }
      function pushUp(a,b,c){
        var cr=(pos[b*3]-pos[a*3])*(pos[c*3+2]-pos[a*3+2])-(pos[b*3+2]-pos[a*3+2])*(pos[c*3]-pos[a*3]);
        if(cr>0) idx.push(a,c,b); else idx.push(a,b,c);
      }
      for(var ai=0;ai<segs;ai++){ var ani=(ai+1)%segs; pushUp(0,1+ai,1+ani); }
      for(var ri=0;ri<rings.length-1;ri++){
        var b0=1+ri*segs, b1=1+(ri+1)*segs;
        for(var ai=0;ai<segs;ai++){
          var ani=(ai+1)%segs;
          pushUp(b0+ai,b1+ai,b1+ani);
          pushUp(b0+ai,b1+ani,b0+ani);
        }
      }
      var bankGeo=own(new T.BufferGeometry());
      bankGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
      bankGeo.setAttribute('color',new T.Float32BufferAttribute(col,3));
      bankGeo.setIndex(idx); bankGeo.computeVertexNormals();
      var bankMesh=add(bankGeo,'#ffffff',0,0,0,0,0,0,false);
      bankMesh.userData.reefGround=true;
      // Softly blended glistening water surface sitting recessed at exact y = wY
      var wSpan=rW*1.14, wPos=[], wUv=[], wCol=[], wIdx=[];
      var wTex=makeTidepoolWaterTex(opts.kind);
      var wcCenter=new T.Color(wTex?'#ffffff':opts.fbWaterCenter), wcEdge=new T.Color(wTex?'#ffffff':opts.fbWaterEdge);
      wPos.push(cxP,wY,czP); wUv.push(.5,.5); wCol.push(wcCenter.r,wcCenter.g,wcCenter.b);
      var wRings=[.50, .86, 1.0];
      for(var wi=0;wi<wRings.length;wi++){
        var wt=wRings[wi], wc=wcCenter.clone().lerp(wcEdge,wt);
        for(var ai=0;ai<segs;ai++){
          var a=ai/segs*Math.PI*2, rr=wSpan*wt*wob(a);
          var dx=Math.cos(a)*rr, dz=Math.sin(a)*rr;
          wPos.push(cxP+dx,wY,czP+dz);
          wUv.push(.5+.5*dx/(wSpan*1.08), .5+.5*dz/(wSpan*1.08));
          wCol.push(wc.r,wc.g,wc.b);
        }
      }
      function pushWUp(a,b,c){
        var cr=(wPos[b*3]-wPos[a*3])*(wPos[c*3+2]-wPos[a*3+2])-(wPos[b*3+2]-wPos[a*3+2])*(wPos[c*3]-wPos[a*3]);
        if(cr>0) wIdx.push(a,c,b); else wIdx.push(a,b,c);
      }
      for(var ai=0;ai<segs;ai++){ var ani=(ai+1)%segs; pushWUp(0,1+ai,1+ani); }
      for(var wi=0;wi<wRings.length-1;wi++){
        var wb0=1+wi*segs, wb1=1+(wi+1)*segs;
        for(var ai=0;ai<segs;ai++){
          var ani=(ai+1)%segs;
          pushWUp(wb0+ai,wb1+ai,wb1+ani);
          pushWUp(wb0+ai,wb1+ani,wb0+ani);
        }
      }
      var waterGeo=own(new T.BufferGeometry());
      waterGeo.setAttribute('position',new T.Float32BufferAttribute(wPos,3));
      waterGeo.setAttribute('uv',new T.Float32BufferAttribute(wUv,2));
      waterGeo.setAttribute('color',new T.Float32BufferAttribute(wCol,3));
      waterGeo.setIndex(wIdx); waterGeo.computeVertexNormals();
      var waterMat=own(new T.MeshLambertMaterial({
        color:'#ffffff', map:wTex||null, vertexColors:true,
        transparent:true, opacity:wTex?1:.88
      }));
      var waterMesh=mesh(waterGeo,waterMat,0,0,0);
      waterMesh.userData.reefGround=true;
      root.add(waterMesh);
      return { bank:bankMesh, water:waterMesh, waterY:wY, wob:wob };
    }
    // Cached unit beveled stone curb block (width 1, height 1, length 1, 45-deg chamfered top/end rims, clean UVs)
    function beveledCurbGeo(){
      var k='beveledCurbStone', g=geos[k]; if(g) return g;
      var hw=.5, hh=.5, hd=.5, bw=.085, bh=.18, bd=.065;
      var p=[], uv=[], c=[];
      function quad(a,b,d,e,ua,ub,ud,ue,sh){
        var verts=[a,b,d, a,d,e], uvs=[ua,ub,ud, ua,ud,ue];
        for(var i=0;i<6;i++){
          p.push(verts[i][0],verts[i][1],verts[i][2]);
          uv.push(uvs[i][0],uvs[i][1]);
          c.push(sh,sh,sh*.98);
        }
      }
      var y0=-hh, y1=hh-bh, y2=hh;
      var xL=-hw, xLi=-hw+bw, xRi=hw-bw, xR=hw;
      var z0=-hd, z0i=-hd+bd, z1i=hd-bd, z1=hd;
      // Dressed top flat face (sunlit)
      quad([xLi,y2,z0i],[xLi,y2,z1i],[xRi,y2,z1i],[xRi,y2,z0i],[.18,.08],[.18,.92],[.82,.92],[.82,.08],1.04);
      // 45-deg chamfered left & right top bevel edges
      quad([xL,y1,z0],[xL,y1,z1],[xLi,y2,z1i],[xLi,y2,z0i],[0,0],[0,1],[.18,.92],[.18,.08],.96);
      quad([xRi,y2,z0i],[xRi,y2,z1i],[xR,y1,z1],[xR,y1,z0],[.82,.08],[.82,.92],[1,1],[1,0],.96);
      // 45-deg chamfered front & back joint bevels (catch light & frame mortar joints crisply!)
      quad([xL,y1,z0],[xLi,y2,z0i],[xRi,y2,z0i],[xR,y1,z0],[0,0],[.18,.08],[.82,.08],[1,0],.88);
      quad([xR,y1,z1],[xRi,y2,z1i],[xLi,y2,z1i],[xL,y1,z1],[1,1],[.82,.92],[.18,.92],[0,1],.88);
      // Vertical side faces down into the cobbles (slightly weathered darker)
      quad([xL,y0,z0],[xL,y0,z1],[xL,y1,z1],[xL,y1,z0],[0,0],[0,1],[.12,1],[.12,0],.82);
      quad([xR,y1,z0],[xR,y1,z1],[xR,y0,z1],[xR,y0,z0],[.88,0],[.88,1],[1,1],[1,0],.82);
      quad([xL,y0,z0],[xL,y1,z0],[xR,y1,z0],[xR,y0,z0],[0,0],[0,.12],[1,.12],[1,0],.74);
      quad([xR,y0,z1],[xR,y1,z1],[xL,y1,z1],[xL,y0,z1],[1,1],[1,.88],[0,.88],[0,1],.74);
      g=own(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      g.setAttribute('color',new T.Float32BufferAttribute(c,3));
      g.computeVertexNormals(); geos[k]=g; return g;
    }
    // m10: Soft warm AO contact patch (vertex-shaded, opaque, zero private canvas texture).
    function contact(x,z,rx,rz,y){
      var tr=rx*.76, tz=rz*.76;
      var ring=[],n=16;
      for(var i=0;i<n;i++){
        var a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
        ring.push([[x,z,.93],[x+Math.cos(a)*tr,z+Math.sin(a)*tz,1],[x+Math.cos(b)*tr,z+Math.sin(b)*tz,1]]);
      }
      return painted(ring,y,id==='captain'?'#b58b63':'#cec4b0','contact-patch');
    }
    function strip(left,right,top,edge,depth){
      var pos=[],colors=[],idx=[],deckY=-.32,
          filled=id==='caves'||id==='patterns'||id==='light',
          widths={town:[3.2,10.5],caves:[4,6.5],patterns:[3,5],beach:[4,6.5],light:[4,8]},
          innerWidth=widths[id][0],outerWidth=widths[id][1],inner=[],outer=[],tops=[],wet=[];
      // Smooth Catmull-Rom closed loop sampling for curved shorelines, foam ribbons & subdivided lighthouse headland.
      function catmullLoop(pts,sub){
        var out=[], n=pts.length;
        for(var k=0;k<n;k++){
          var p0=pts[(k+n-1)%n], p1=pts[k], p2=pts[(k+1)%n], p3=pts[(k+2)%n];
          for(var j=0;j<sub;j++){
            var t=j/sub, t2=t*t, t3=t2*t;
            var x=.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
            var z=.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
            out.push([x,z]);
          }
        }
        return out;
      }
      function loopNormals(pts,outward){
        var n=pts.length, out=[];
        for(var i=0;i<n;i++){
          var a=pts[(i+n-1)%n], b=pts[(i+1)%n], dx=b[0]-a[0], dz=b[1]-a[1], l=Math.hypot(dx,dz)||1;
          var nx=-dz/l, nz=dx/l;
          if(nx*(pts[i][0]-cx)+nz*(pts[i][1]-cz)<0){ nx=-nx; nz=-nz; }
          if(!outward){ nx=-nx; nz=-nz; }
          out.push([nx,nz]);
        }
        return out;
      }
      function curvedSurfFoam(loopPts,outward,yFoam,wInner,wOuter,colInner,colOuter,kind){
        var norms=loopNormals(loopPts,outward), n=loopPts.length, q1=[], q2=[];
        for(var i=0;i<n;i++){
          var ni=(i+1)%n, p1=loopPts[i], p2=loopPts[ni], n1=norms[i], n2=norms[ni];
          var sc1=wInner*(.86+.20*Math.sin(i*1.35)+.12*Math.cos(i*2.1));
          var sc2=wInner*(.86+.20*Math.sin(ni*1.35)+.12*Math.cos(ni*2.1));
          var so1=wOuter*(.88+.22*Math.cos(i*1.15)+.14*Math.sin(i*2.3));
          var so2=wOuter*(.88+.22*Math.cos(ni*1.15)+.14*Math.sin(ni*2.3));
          q1.push([
            [p1[0]-n1[0]*.08,p1[1]-n1[1]*.08,1],
            [p1[0]+n1[0]*sc1,p1[1]+n1[1]*sc1,.86],
            [p2[0]+n2[0]*sc2,p2[1]+n2[1]*sc2,.86],
            [p2[0]-n2[0]*.08,p2[1]-n2[1]*.08,1]
          ]);
          if(colOuter){
            q2.push([
              [p1[0]+n1[0]*(sc1-.06),p1[1]+n1[1]*(sc1-.06),.92],
              [p1[0]+n1[0]*so1,p1[1]+n1[1]*so1,.70],
              [p2[0]+n2[0]*so2,p2[1]+n2[1]*so2,.70],
              [p2[0]+n2[0]*(sc2-.06),p2[1]+n2[1]*(sc2-.06),.92]
            ]);
          }
        }
        painted(q1,yFoam,colInner,kind);
        if(colOuter) painted(q2,yFoam-.009,colOuter,kind);
      }
      main.forEach(function(s,k){
        var f=frame(s),l=[s.x-f.nx*innerWidth,s.z-f.nz*innerWidth],r=[s.x+f.nx*outerWidth,s.z+f.nz*outerWidth];
        inner.push(l);outer.push(r);
        pos.push(l[0],deckY,l[1],r[0],deckY,r[1],l[0],deckY-(depth||.6),l[1],r[0],deckY-(depth||.6),r[1]);
        var broad=.96+.045*Math.sin(k/main.length*Math.PI*2);
        if(id==='light') [broad*.98, broad*.88, .72,.58].forEach(function(v){colors.push(v,v,v);});
        else [broad, broad*.85, .69,.61].forEach(function(v){colors.push(v,v,v);});
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
        var wv=.94+.07*Math.sin(k*1.7);
        tops.push([[inner[k][0],inner[k][1],wv],[outer[k][0],outer[k][1],wv+.03],[outer[next][0],outer[next][1],wv+.02],[inner[next][0],inner[next][1],wv]]);
        // A broad, opaque damp edge has a bright inner lip and a dark waterline.
        function damp(u,v){return [u[0]+(v[0]-u[0])*.965,u[1]+(v[1]-u[1])*.965,1];}
        wet.push([damp(inner[k],outer[k]),[outer[k][0],outer[k][1],.76],[outer[next][0],outer[next][1],.76],damp(inner[next],outer[next])]);
        if(id==='town' && k%2===0){
          var s=main[k],f=frame(s),p=at(s,1,outerWidth,0),q=at(s,-1,innerWidth,0),angle=Math.atan2(f.tx,f.tz);
          block(.22,.12,2.8,edge,p[0],deckY+.03,p[2],angle,false);
          if(!filled)block(.22,.12,2.8,edge,q[0],deckY+.03,q[2],angle,false);
        }
      }
      if(id==='light'){
        // M9: Subdivided smooth Lighthouse headland textured with repeating MP8 coastal meadow turf CanvasTexture
        // (world-space XZ UVs -> zero radial seams!) + layered stepped ochre cliff skirt + scalloped surf foam.
        var smIn=catmullLoop(inner,3), smOut=catmullLoop(outer,3), smN=smIn.length, oNorms=loopNormals(smOut,true);
        var turfTex=makeTurfGroundTex(), turfScale=6.5;
        function meadowShade(x,z){
          return .975+.038*Math.sin(x*.13+z*.11)+.024*Math.cos(x*.20-z*.17)+.014*Math.sin((x-cx)*.09);
        }
        var mPos=[], mUv=[], mCol=[], mIdx=[], mRings=8; // 0 = center, 1..4 = interior meadow, 5..8 = path-to-cliff headland
        var baseC=turfTex ? new T.Color('#ffffff') : new T.Color(top);
        mPos.push(cx,deckY+.014,cz);
        mUv.push(cx/turfScale,cz/turfScale);
        var cs0=meadowShade(cx,cz); mCol.push(baseC.r*cs0,baseC.g*cs0,baseC.b*cs0);
        for(var rg=1;rg<=mRings;rg++){
          for(var ai=0;ai<smN;ai++){
            var pxM, pzM, pyM=deckY+.014;
            if(rg<=4){
              var ft=rg/4;
              pxM=cx+(smIn[ai][0]-cx)*ft; pzM=cz+(smIn[ai][1]-cz)*ft;
            }else{
              var ft2=(rg-4)/4;
              pxM=smIn[ai][0]+(smOut[ai][0]-smIn[ai][0])*ft2;
              pzM=smIn[ai][1]+(smOut[ai][1]-smIn[ai][1])*ft2;
              if(rg===mRings) pyM=deckY+.006;
            }
            var sh=meadowShade(pxM,pzM)*(rg===mRings?.93:1);
            mPos.push(pxM,pyM,pzM);
            mUv.push(pxM/turfScale,pzM/turfScale);
            mCol.push(baseC.r*sh,baseC.g*sh,baseC.b*sh);
          }
        }
        function pushMUp(a,b,c){
          var cr=(mPos[b*3]-mPos[a*3])*(mPos[c*3+2]-mPos[a*3+2])-(mPos[b*3+2]-mPos[a*3+2])*(mPos[c*3]-mPos[a*3]);
          if(cr>0) mIdx.push(a,c,b); else mIdx.push(a,b,c);
        }
        for(var ai=0;ai<smN;ai++){
          var ani=(ai+1)%smN;
          pushMUp(0,1+ai,1+ani);
        }
        for(var rg=1;rg<mRings;rg++){
          var r0=1+(rg-1)*smN, r1=1+rg*smN;
          for(var ai=0;ai<smN;ai++){
            var ani=(ai+1)%smN;
            pushMUp(r0+ai,r1+ai,r1+ani);
            pushMUp(r0+ai,r1+ani,r0+ani);
          }
        }
        var mGeo=own(new T.BufferGeometry());
        mGeo.setAttribute('position',new T.Float32BufferAttribute(mPos,3));
        mGeo.setAttribute('uv',new T.Float32BufferAttribute(mUv,2));
        mGeo.setAttribute('color',new T.Float32BufferAttribute(mCol,3));
        mGeo.setIndex(mIdx); mGeo.computeVertexNormals();
        var meadow;
        if(turfTex){
          var turfMat=own(new T.MeshLambertMaterial({color:'#ffffff',map:turfTex,vertexColors:true}));
          meadow=mesh(mGeo,turfMat,0,0,0); root.add(meadow);
        }else{
          meadow=add(mGeo,'#ffffff',0,0,0,0,0,0,false);
        }
        meadow.userData.reefStructure='meadow-top'; meadow.userData.reefGround=true;
        // Layered stepped ochre/terracotta rocky cliff skirt plunging cleanly into the sea
        var cPos=[], cCol=[], cIdx=[];
        var cliffTiers=[
          {off:-.02, y:deckY+.008, col:'#6bb854', wob:.04},
          {off:.16,  y:deckY-.18,  col:'#5ea84b', wob:.08},
          {off:.22,  y:deckY-.26,  col:'#d3a364', wob:.14},
          {off:.44,  y:deckY-.88,  col:'#be894e', wob:.22},
          {off:.68,  y:deckY-1.08, col:'#c99559', wob:.26},
          {off:.98,  y:deckY-1.92, col:'#9c6f42', wob:.30},
          {off:1.18, y:deckY-2.78, col:'#7a5939', wob:.22}
        ];
        var tCols=cliffTiers.map(function(t){ return new T.Color(t.col); }), cliffBaseLoop=[];
        for(var ti=0;ti<cliffTiers.length;ti++){
          var tier=cliffTiers[ti], tc=tCols[ti];
          for(var ai=0;ai<smN;ai++){
            var pOut=smOut[ai], nOut=oNorms[ai];
            var rockScallop=tier.wob*(.5+.5*Math.sin(ai*1.15+ti*1.3)+.35*Math.cos(ai*2.1-ti));
            var wx=pOut[0]+nOut[0]*(tier.off+rockScallop), wz=pOut[1]+nOut[1]*(tier.off+rockScallop);
            var sh=.92+.09*Math.sin(ai*.8+ti*1.4);
            cPos.push(wx,tier.y,wz);
            cCol.push(tc.r*sh,tc.g*sh,tc.b*sh);
            if(ti===4) cliffBaseLoop.push([wx,wz]);
          }
        }
        for(var ti=0;ti<cliffTiers.length-1;ti++){
          var r0=ti*smN, r1=(ti+1)*smN;
          for(var ai=0;ai<smN;ai++){
            var ani=(ai+1)%smN;
            var a=r0+ai, b=r1+ai, c=r1+ani, d=r0+ani;
            // Ensure triangle faces outward from headland center
            var ax=cPos[a*3], ay=cPos[a*3+1], az=cPos[a*3+2];
            var ux=cPos[b*3]-ax, uy=cPos[b*3+1]-ay, uz=cPos[b*3+2]-az;
            var vx=cPos[c*3]-ax, vy=cPos[c*3+1]-ay, vz=cPos[c*3+2]-az;
            var nxN=uy*vz-uz*vy, nzN=ux*vy-uy*vx;
            if(nxN*(ax-cx)+nzN*(az-cz)>=0){ cIdx.push(a,b,c, a,c,d); }
            else { cIdx.push(a,c,b, a,d,c); }
          }
        }
        var cGeo=own(new T.BufferGeometry());
        cGeo.setAttribute('position',new T.Float32BufferAttribute(cPos,3));
        cGeo.setAttribute('color',new T.Float32BufferAttribute(cCol,3));
        cGeo.setIndex(cIdx); cGeo.computeVertexNormals();
        var cliffSkirt=add(cGeo,'#ffffff',0,0,0,0,0,0,'stone');
        cliffSkirt.userData.reefStructure='broad-ground'; cliffSkirt.userData.reefGround=true;
        // Curved scalloped white surf-foam collar + outer wave-lap ripple hugging the stepped cliff base at waterline
        curvedSurfFoam(cliffBaseLoop,true,waterY+.062,.86,1.48,'#eefcfd','#9be7ee','cliff-surf-foam');
        curvedSurfFoam(cliffBaseLoop,true,waterY+.055,1.62,1.98,'#b6f0f5',null,'cliff-surf-foam');
        return;
      }
      var geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
      var patFloorTex=id==='patterns' ? makeSeabedGroundTex() : null, patFloorMat=null, patScale=6.4;
      if(patFloorTex){
        var gUvs=[];
        for(var gi2=0;gi2<pos.length;gi2+=3) gUvs.push(pos[gi2]/patScale,pos[gi2+2]/patScale);
        geo.setAttribute('uv',new T.Float32BufferAttribute(gUvs,2));
        patFloorMat=own(new T.MeshLambertMaterial({color:'#ffffff',map:patFloorTex,vertexColors:true}));
      }
      var floor;
      if(patFloorMat){ floor=mesh(geo,patFloorMat,0,0,0); root.add(floor); }
      else { floor=add(geo,id==='town'?'#a59b87':top,0,0,0,0,0,0,false); }
      floor.userData.reefStructure='broad-ground';floor.userData.reefGround=true;
      if(id==='town')pattern(tops,deckY+.006,false);
      if(patFloorMat){
        // Keep the damp outer shelf rim textured seamlessly with the same seabed map
        var wp=[], wc=[], wuv=[];
        wet.forEach(function(poly){
          for(var n=1;n<poly.length-1;n++){
            var a=poly[0],b=poly[n],d=poly[n+1],up=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
            [a,up>0?d:b,up>0?b:d].forEach(function(v){
              wp.push(v[0],deckY+.012,v[1]);
              wuv.push(v[0]/patScale,v[1]/patScale);
              var sh=v[2]===undefined?1:v[2]; wc.push(sh,sh,sh);
            });
          }
        });
        var wGeo=own(new T.BufferGeometry());
        wGeo.setAttribute('position',new T.Float32BufferAttribute(wp,3));
        wGeo.setAttribute('uv',new T.Float32BufferAttribute(wuv,2));
        wGeo.setAttribute('color',new T.Float32BufferAttribute(wc,3));
        wGeo.computeVertexNormals();
        var wMesh=mesh(wGeo,patFloorMat,0,0,0); wMesh.userData.reefStructure='wet-shore'; wMesh.userData.reefGround=true; root.add(wMesh);
      }else{
        painted(wet,deckY+.012,top,'wet-shore');
      }
      // Curved water-level surf foam collars for beach, caves & patterns (replaces straight rigid shoreline bar blocks!)
      if(id==='beach'){
        var smBeachOut=catmullLoop(outer,3), smBeachIn=catmullLoop(inner,3);
        curvedSurfFoam(smBeachOut,true,waterY+.062,.74,1.32,'#eefcfd','#aceef2','beach-shore-foam');
        curvedSurfFoam(smBeachOut,true,waterY+.055,1.44,1.76,'#c2f4f7',null,'beach-shore-foam');
        curvedSurfFoam(smBeachIn,false,waterY+.062,.64,1.14,'#eefcfd','#aceef2','beach-shore-foam');
      }else if(id==='caves' || id==='patterns'){
        var smEdgeOut=catmullLoop(outer,3);
        curvedSurfFoam(smEdgeOut,true,waterY+.060,.58,1.04,id==='caves'?'#c8eff6':'#e6fbfc',id==='caves'?'#7ec4d8':'#9ae3e6','shelf-surf-foam');
      }
      if(filled){
        var shape=new T.Shape();inner.forEach(function(p,i){if(i)shape.lineTo(p[0],-p[1]);else shape.moveTo(p[0],-p[1]);});shape.closePath();
        var fill=own(new T.ShapeGeometry(shape));fill.rotateX(-Math.PI/2);
        var fp=fill.attributes.position,fc=[],fuv=[];
        for(var v=0;v<fp.count;v++){
          var vx=fp.getX(v), vz=fp.getZ(v);
          var value=.95+.07*Math.sin(vx*.18+vz*.14)+.04*(vx-cx)/(bounds.maxX-bounds.minX+1);
          fc.push(value,value,value);
          if(patFloorMat) fuv.push(vx/patScale,vz/patScale);
        }
        fill.setAttribute('color',new T.Float32BufferAttribute(fc,3));
        var interior;
        if(patFloorMat){
          fill.setAttribute('uv',new T.Float32BufferAttribute(fuv,2));
          interior=mesh(fill,patFloorMat,0,deckY,0); root.add(interior);
        }else{
          interior=add(fill,top,0,deckY,0,0,0,0,false);
        }
        interior.userData.reefStructure='broad-ground';interior.userData.reefGround=true;
      }
    }
    function shipGround(){
      var xs=sp.map(function(s){return s.x;}),zs=sp.map(function(s){return s.z;}),
          min=Math.min.apply(null,xs)-4.8,max=Math.max.apply(null,xs)+4.4,
          low=Math.min.apply(null,zs)-5.6,high=Math.max.apply(null,zs)+5.6;
      // Ensure no branch space sits near or outside the chamfered bow/stern corners
      sp.forEach(function(s){
        if(s.x<min+4.2&&(s.z<low+4.0||s.z>high-4.0)){ min=Math.min(min,s.x-4.4); low=Math.min(low,s.z-4.0); high=Math.max(high,s.z+4.0); }
        if(s.x>max-4.5&&(s.z<low+4.0||s.z>high-4.0)){ max=Math.max(max,s.x+4.6); low=Math.min(low,s.z-4.0); high=Math.max(high,s.z+4.0); }
      });
      var poly=[[min,low+2.8],[min+3,low],[max-3.5,low],[max+3.2,cz],[max-3.5,high],[min+3,high],[min,high-2.8]];
      function railStanchion(px,pz){
        var baseY=.69;
        wornBox(.24,.13,.24,'#5c3d28',px,baseY+.06,pz,'timber');
        add(cyl(.075,.105,.46,10),'#7c5638',px,baseY+.34,pz,0,0,0,'timber');
        add(cyl(.096,.096,.065,10),'#d9ad50',px,baseY+.48,pz,0,0,0,false);
        smoothOrb(.115,'#ebd19f',px,baseY+.62,pz,false);
      }
      function ropeSwag(x1,z1,x2,z2){
        var yEnd=1.14, sag=.17, segs=4;
        for(var s=0;s<segs;s++){
          var t0=s/segs, t1=(s+1)/segs;
          var ax=x1+(x2-x1)*t0, az=z1+(z2-z1)*t0, ay=yEnd-sag*Math.sin(t0*Math.PI);
          var bx=x1+(x2-x1)*t1, bz=z1+(z2-z1)*t1, by=yEnd-sag*Math.sin(t1*Math.PI);
          var ldx=bx-ax, ldy=by-ay, ldz=bz-az, ll=Math.hypot(ldx,ldy,ldz);
          if(ll>.01) limb(ax,ay,az,ldx,ldy,ldz,ll,.034,.034,'#dcc38c','rope');
        }
      }
      // Counter-clockwise polygon, closed hull sides, pointed eastern bow and
      // a wide transom at the stern. The learning circuit remains unchanged.
      var railG0 = curRoot.children.length;
      for(var i=0;i<poly.length;i++){
        var a=poly[i],b=poly[(i+1)%poly.length];
        var g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute([a[0],-.13,a[1],b[0],-.13,b[1],a[0]*.94+cx*.06,-1.65,a[1]*.9+cz*.1,b[0]*.94+cx*.06,-1.65,b[1]*.9+cz*.1],3));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
        var hull=add(g,i%2?'#644738':'#76503b',0,0,0,0,0,0,false);hull.userData.reefStructure='ship-hull';
        var dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
        // Solid paneled timber bulwark (height 0.72) + chamfered cap rail + inner vertical ribs
        var bulwark=block(.18,.72,length,'#6f4c35',(a[0]+b[0])/2,-.13+.36,(a[1]+b[1])/2,angle,'timber');
        bulwark.userData.reefStructure='ship-bulwark';
        var cap=block(.28,.12,length+.08,'#dec49a',(a[0]+b[0])/2,-.13+.77,(a[1]+b[1])/2,angle,'timber');
        cap.userData.reefStructure='ship-rail';
        var inx=cx-(a[0]+b[0])/2, inz=cz-(a[1]+b[1])/2, ilen=Math.hypot(inx,inz)||1; inx/=ilen; inz/=ilen;
        var ribCount=Math.max(2,Math.ceil(length/2.4));
        for(var j=1;j<ribCount;j++){
          var t=j/ribCount, rx=a[0]+dx*t+inx*.14, rz=a[1]+dz*t+inz*.14;
          block(.14,.68,.14,'#563927',rx,-.13+.34,rz,angle,'timber');
        }
        // Carved railing stanchion posts with brass collars & draped hemp rope swags along every bulwark edge
        var postSegs=Math.max(2,Math.round(length/2.6));
        for(var pj=0;pj<postSegs;pj++){
          var pt0=pj/postSegs, pt1=(pj+1)/postSegs;
          var px0=a[0]+dx*pt0, pz0=a[1]+dz*pt0, px1=a[0]+dx*pt1, pz1=a[1]+dz*pt1;
          railStanchion(px0,pz0);
          ropeSwag(px0,pz0,px1,pz1);
        }
      }
      compactRootRange(railG0, cx, 0, cz, 0);
      painted([poly],-.13,'#694b35','broad-ground');pattern([poly],-.12,true);
      // A small raised stern platform shares the deck's plank axes and sits
      // beyond the westmost tile, leaving the entire circuit and branches clear.
      var stern=[[min+.2,low+3.3],[min+2.5,low+1.3],[min+2.5,high-1.3],[min+.2,high-3.3]];
      painted([stern],.42,'#775438','raised-stern');pattern([stern],.43,true);
      block(2.3,.55,high-low-6.6,'#775438',min+1.35,.145,cz,0,false).userData.reefGround=true;
      view.regionShipBounds={minX:min,maxX:max+3.2,minZ:low,maxZ:high};
      view._shipPoly=poly;
    }
    if(id==='town') strip(4,4,'#c5bba5','#777e79',.8);
    else if(id==='lagoon') main.forEach(function(s,i){
      add(cyl(i%3===0?2.2:1.6,i%3===0?2.4:1.75,.26,11),'#c7d8ae',s.x,-.37,s.z).userData.reefGround=true;
      add(cyl(i%3===0?1.85:1.35,i%3===0?2:1.5,.06,11),'#dfdab7',s.x,-.21,s.z).userData.reefGround=true;
    });
    else if(id==='caves') strip(4,4,'#8aa5b6','#50778a',.8);
    else if(id==='patterns') strip(4,4,'#8bb8ae','#5a9d9c',1.1);
    else if(id==='beach') strip(4,4,'#efd8a5','#f8edcf',.45);
    else if(id==='light'){ /* Colossal sunlit interior rotunda & 3D helical staircase built in light(). */ }
    else if(id==='captain') shipGround();
    var maxR=14;
    sp.forEach(function(s){ var r=Math.hypot(s.x-cx,s.z-cz); if(r>maxR) maxR=r; });
    function town(){
      // Tile foundations were hidden by the route; spend that geometry on the street.
      var waterPlaced=[];
      function waterClear(x,z,minGap){
        var g=minGap||4.5;
        if(!outerClear(x,z,g)) return false;
        for(var wi=0;wi<waterPlaced.length;wi++){
          if(Math.hypot(x-waterPlaced[wi][0],z-waterPlaced[wi][1])<g) return false;
        }
        return true;
      }
      var townDecks=sp.filter(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity; });
      function nearTownDeck(x,z,dist){
        var d=dist||4.6;
        for(var ti=0;ti<townDecks.length;ti++) if(Math.hypot(x-townDecks[ti].x,z-townDecks[ti].z)<d) return true;
        return false;
      }
      // MAJ-2: Strict clearance (>= 2.8u 3D + follow-camera 2D sightline clearance) from ALL "?" / surprise cubes!
      var townSurprises=sp.filter(function(s){ return s.kind==='surprise' || !!s.qb; });
      function nearTownSurprise(x,z,dist){
        var d=dist||2.85;
        for(var qi=0;qi<townSurprises.length;qi++){
          var qs=townSurprises[qi];
          var qx=(qs.qb && qs.qb.position)?qs.qb.position.x:qs.x;
          var qz=(qs.qb && qs.qb.position)?qs.qb.position.z:qs.z;
          if(Math.hypot(x-qx,z-qz)<d) return true;
        }
        return false;
      }
      function umbrellaBlocksTownQ(ux,uz){
        if(nearTownSurprise(ux,uz,3.4)) return true;
        for(var qi=0;qi<townSurprises.length;qi++){
          var qs=townSurprises[qi];
          var qx=(qs.qb && qs.qb.position)?qs.qb.position.x:qs.x;
          var qy=(qs.qb && qs.qb.position)?qs.qb.position.y:(1.85+(qs.y||0));
          var qz=(qs.qb && qs.qb.position)?qs.qb.position.z:qs.z;
          for(var ci=0;ci<main.length;ci++){
            if(Math.hypot(main[ci].x-qx,main[ci].z-qz)>26) continue;
            var qn=realCamNDCAt(ci,qx,qy,qz);
            if(qn.z<-1 || qn.z>1 || Math.abs(qn.x)>.96 || Math.abs(qn.y)>.94) continue;
            var uPole=realCamNDCAt(ci,ux,1.35,uz);
            var uCap=realCamNDCAt(ci,ux,1.98,uz);
            if(uPole.z<1 && Math.abs(uPole.x-qn.x)<.17 && Math.abs(uPole.y-qn.y)<.20) return true;
            if(uCap.z<1 && Math.abs(uCap.x-qn.x)<.18 && Math.abs(uCap.y-qn.y)<.21) return true;
          }
        }
        return false;
      }
      // Register existing board.js deck props (e.g. potted plants) as scenery obstacles so residents never clip into them.
      sp.forEach(function(s){
        if(s.obj && s.obj.position) addObstacle(s.obj.position.x,s.obj.position.z,.95);
      });
      var pharmSpace=sp.find(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id==='pharmacy'; });
      if(pharmSpace){
        var pBest=null;
        [-1,1].forEach(function(side){
          for(var extra=0;extra<=12;extra+=.5){
            var mx=pharmSpace.x+side*(2.75+extra), mz=pharmSpace.z+.18, minD=Infinity;
            sp.forEach(function(tile){ minD=Math.min(minD,Math.hypot(tile.x-mx,tile.z-mz)); });
            var def=Math.max(0,1.7-minD), sc=def*1000+extra;
            if(!pBest || sc<pBest.sc) pBest={x:mx,z:mz,sc:sc};
            if(!def) break;
          }
        });
        if(pBest){
          var my=(pharmSpace.y||0)-.305;
          contact(pBest.x,pBest.z,1.05,1.05,my);
          add(cyl(.94,1.0,.03,16),'#d99e6b',pBest.x,my+.015,pBest.z,0,0,0,'fabric');
          add(cyl(.74,.76,.034,16),'#f2dec0',pBest.x,my+.019,pBest.z,0,0,0,'fabric');
          add(cyl(.44,.44,.038,16),'#6ba99f',pBest.x,my+.023,pBest.z,0,0,0,'fabric');
        }
      }
      // Helper: solid triangular gable-end infill wall under pitched roofs so low MP8 cameras never see hollow eaves
      function gableEnd(x,yBase,z,w,h,thick,col,rotY){
        var k=['gable',w,h,thick].join(':'), g=geos[k];
        if(!g){
          var sh=new T.Shape();
          sh.moveTo(-w/2,0); sh.lineTo(w/2,0); sh.lineTo(0,h); sh.closePath();
          g=own(new T.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:false}));
          g.translate(0,0,-thick/2); geos[k]=g;
        }
        return add(g,col,x,yBase,z,0,rotY||0,0,'plaster');
      }
      // Helper: warm-lit coastal dormer window jutting out of a pitched roof slope
      function roofDormer(x,yBase,z,roofCol,wallCol,litCol){
        wornBox(1.06,0.92,1.15,wallCol,x,yBase+0.46,z,'plaster');
        block(0.62,0.58,0.14,litCol||'#f7dc88',x,yBase+0.48,z+0.55,0,false);
        block(0.06,0.58,0.17,'#f8f2e4',x,yBase+0.48,z+0.58,0,false);
        block(0.62,0.06,0.17,'#f8f2e4',x,yBase+0.48,z+0.58,0,false);
        block(0.72,0.08,0.20,'#f6efe0',x,yBase+0.16,z+0.59,0,'stone');
        gableEnd(x,yBase+0.90,z+0.54,1.12,0.44,0.10,wallCol,0);
        block(0.84,0.10,1.34,roofCol,x-0.34,yBase+1.10,z+0.02,0,'roof').rotation.z=0.58;
        block(0.84,0.10,1.34,roofCol,x+0.34,yBase+1.10,z+0.02,0,'roof').rotation.z=-0.58;
      }
      // Helper: blooming Mediterranean terracotta window flower box (cached composite -> 1-2 meshes instead of 15!)
      var townBlossomCols=['#ff7482','#ffdf5c','#e85c9c','#fff5dc','#ff9468'];
      function terracottaWindowBox(wx,wy,wz,w,rotY,seed){
        var s=Math.abs(Math.floor(seed||0))%5, bw=Math.round((w||.76)*20)/20;
        emitCached('townWinBox:' + bw + ':' + s, wx, wy, wz, rotY || 0, 1, function(){
          [-bw*.34,bw*.34].forEach(function(bx){ block(.06,.14,.20,'#3b4a56',bx,-.12,-.04,0,false); });
          block(bw,.22,.24,'#c9674b',0,0,0,0,'stone');
          block(bw+.08,.07,.28,'#de8062',0,.11,0,0,'stone');
          block(bw-.06,.04,.18,'#4e3828',0,.13,0,0,false);
          var nLeaf=Math.max(3,Math.round(bw/.24));
          for(var li=0;li<nLeaf;li++){
            var u=nLeaf>1?(li/(nLeaf-1)-.5)*2:0, lx=u*(bw*.38);
            var lf=orb(.115+(li%2)*.022,li%2?'#4da866':'#3b9256',lx,.19+(li%2)*.025,.02,false);
            lf.scale.set(1.12,.74,1.04);
            if(li%2===0){
              var tr=orb(.075,'#5bbd70',lx,.06,.14,false); tr.scale.set(.85,1.25,.65);
            }
          }
          var nFl=Math.max(3,Math.round(bw/.22));
          for(var fi=0;fi<nFl;fi++){
            var fu=nFl>1?(fi/(nFl-1)-.5)*2:0, fx=fu*(bw*.39), fz=.05+(fi%2)*.04;
            var fCol=townBlossomCols[(s+fi)%townBlossomCols.length];
            orb(.082+(fi%2)*.016,fCol,fx,.27+(fi%2)*.03,fz,false);
            if(fi%2===1) orb(.055,'#fff7de',fx+.05,.25,fz+.03,false);
          }
        });
      }
      function shop(x,y,z,n,rot){
        var variant=Math.floor(n/3), vIdx=variant%4, isClk=(variant===0)?1:0, parity=n%2;
        contact(x,z,2.75,3.20,-.301);
        emitCached('townShop:' + vIdx + ':' + isClk + ':' + parity, x, y, z, rot || 0, 1, function(){
          var walls=['#eba98b','#b7e1d0','#f6e5c6','#b7d8eb'], roofs=['#c45746','#365d74','#d16d46','#3d6f67'],
              shutters=['#387482','#c8624e','#4a8572','#cc7c46'],
              wall=walls[vIdx], roof=roofs[vIdx], shutCol=shutters[vIdx], wallH=4.75, ridgeH=1.45;
          // Dark masonry base plinth + full-height 2-story coastal stucco mass
          wornBox(4.12,.36,4.30,'#646967',0,.18,0,'stone');
          wornBox(3.96,wallH,4.14,wall,0,wallH/2,0,'plaster');
          // Alternating stepped stone corner quoins climbing all 4 building corners
          [-1,1].forEach(function(cxS){ [-1,1].forEach(function(czS){
            for(var qi=0;qi<8;qi++){
              var qLong=(qi%2===0);
              block(qLong?.36:.24,.44,qLong?.24:.36,qi%2?'#e7dbc2':'#f2e7d2',cxS*(qLong?1.90:1.94),.56+qi*.54,czS*(qLong?2.04:1.98),0,'stone');
            }
          }); });
          // Horizontal coastal stone belt course separating ground shopfront & upper residential story
          block(4.26,.18,4.38,'#ebe0ca',0,2.64,0,0,'stone');
          // Steep pitched terracotta/slate gable roof + scalloped eave tile courses + solid gable ends
          wornBox(4.36,.22,4.42,roof,0,wallH+.06,0,'timber');
          [-1,1].forEach(function(sx){ gableEnd(sx*1.96,wallH+.06,0,4.16,ridgeH,.18,wall,Math.PI/2); });
          block(4.56,.18,2.68,roof,0,wallH+.74,-1.08,0,'roof').rotation.x=-.54;
          block(4.56,.18,2.68,roof,0,wallH+.74,1.08,0,'roof').rotation.x=.54;
          block(4.70,.16,.18,'#263f52',0,wallH+ridgeH+.04,0,0,'roof');
          // Scalloped terracotta/slate roof eave tiles & ridge cap tiles
          var tileCol2=(vIdx%2===0)?'#d9785e':'#4b7c8e';
          for(var ti=-5;ti<=5;ti++){
            add(cyl(.19,.19,.18,8),ti%2?roof:tileCol2,ti*.41,wallH+.04,2.24,Math.PI/2,0,0,'roof');
            add(cyl(.19,.19,.18,8),ti%2?roof:tileCol2,ti*.41,wallH+.04,-2.24,Math.PI/2,0,0,'roof');
            add(cyl(.14,.14,.22,6),ti%2?'#365162':tileCol2,ti*.42,wallH+ridgeH+.10,0,0,0,Math.PI/2,'roof');
          }
          // Roof dormer window + warm brick chimney with stepped crown & twin clay pots + rooftop festoon finial
          if(!isClk){
            roofDormer(0,wallH+.10,1.22,roof,wall,'#fae08c');
            // Brick chimney stack with stepped limestone corbel crown & twin terracotta flue pots
            wornBox(.68,1.32,.68,'#b55d49',-1.28,wallH+1.26,-.62,'stone');
            block(.76,.14,.76,'#c86d54',-1.28,wallH+1.84,-.62,0,'stone');
            block(.82,.12,.82,'#e8dcc4',-1.28,wallH+1.96,-.62,0,'stone');
            add(cyl(.12,.15,.30,8),'#d17254',-1.42,wallH+2.14,-.62,0,0,0,'roof');
            add(cyl(.11,.14,.24,8),'#b85c42',-1.14,wallH+2.11,-.62,0,0,0,'roof');
            add(cyl(.038,.050,1.72,6),'#3c4e5c',0,wallH+ridgeH+.88,1.25,0,0,0,false);
            smoothOrb(.095,'#ecc460',0,wallH+ridgeH+1.74,1.25,false);
          }
          // Arched stone doorway surround with keystone & paneled oak arched door
          block(1.18,1.38,.18,'#ebe0ca',0,.70,2.08,0,'stone');
          add(cyl(.59,.59,.18,12),'#ebe0ca',0,1.38,2.08,Math.PI/2,0,0,'stone');
          block(.22,.24,.24,'#f6eedb',0,1.94,2.10,0,'stone'); // carved arch keystone
          wornBox(.88,1.34,.14,'#774d3b',0,.68,2.12,'timber');
          add(cyl(.44,.44,.14,12),'#6d4534',0,1.34,2.12,Math.PI/2,0,0,'timber');
          add(cyl(.28,.28,.16,10),'#fae08e',0,1.34,2.13,Math.PI/2,0,0,false); // arched transom fanlight
          block(.16,.07,.16,'#eacb80',.26,.82,2.20,0,false);
          // Ground-floor display windows with painted wooden shutters & flower boxes
          [-1,1].forEach(function(sd){
            var glCol=(parity+sd)%2?'#f4d584':'#355365';
            block(.72,.80,.13,glCol,sd*1.22,1.66,2.08);
            block(.82,.09,.20,'#f6f0e2',sd*1.22,2.10,2.14);
            block(.08,.80,.18,'#f6f0e2',sd*1.22,1.66,2.14);
            block(.76,.08,.18,'#f6f0e2',sd*1.22,1.66,2.14);
            [-1,1].forEach(function(sh){ block(.18,.80,.08,shutCol,sd*1.22+sh*.45,1.66,2.12,0,'timber'); });
            terracottaWindowBox(sd*1.22,1.14,2.22,.82,0,vIdx+sd+1);
          });
          // Hanging wrought-iron shop sign jutting gracefully from the right-front corner
          var signSide=parity?1:-1, sgX=signSide*1.86;
          block(.76,.06,.06,'#32424d',sgX+signSide*.36,2.50,2.22,0,false);
          limb(sgX,2.22,2.22,signSide*.8,.55,0,.58,.025,.025,'#32424d',false);
          add(torus(.11,.022),'#32424d',sgX+signSide*.22,2.38,2.22,0,0,0,false);
          block(.56,.44,.07,parity?'#345c72':'#b84e62',sgX+signSide*.44,2.16,2.22,0,'timber');
          block(.48,.36,.09,'#fbf0d4',sgX+signSide*.44,2.16,2.22,0,false);
          orb(.11,parity?'#e6a844':'#4aa49e',sgX+signSide*.44,2.16,2.25,false);
          // Second-story warm lit coastal windows + painted shutters + flower boxes
          [-1,1].forEach(function(sd){
            var litU=((vIdx+sd)%2===0)?'#fae08e':'#f2cc74';
            block(.74,.92,.14,litU,sd*1.08,3.62,2.08);
            block(.08,.92,.18,'#f6f0e2',sd*1.08,3.62,2.13);
            block(.76,.08,.18,'#f6f0e2',sd*1.08,3.62,2.13);
            block(.86,.10,.20,roof,sd*1.08,4.12,2.14);
            [-1,1].forEach(function(sh){ block(.22,.92,.09,shutCol,sd*1.08+sh*.48,3.62,2.12,0,'timber'); });
            terracottaWindowBox(sd*1.08,3.08,2.22,.80,0,vIdx*2+sd+3);
          });
          // Carved corbeled upper timber & wrought-iron Juliet balcony with decorative scrollwork rings!
          block(2.75,.14,.74,'#8a5c3c',0,2.86,2.38,0,'timber');
          [-1.05,0,1.05].forEach(function(bx){ block(.16,.24,.56,'#6a462d',bx,2.68,2.28,0,'timber'); });
          block(2.78,.08,.08,'#3a4a56',0,3.52,2.70,0,false);
          [-1.34,-.67,0,.67,1.34].forEach(function(bx){ block(.07,.64,.07,'#3a4a56',bx,3.20,2.70,0,false); });
          [-1.00,-.34,.34,1.00].forEach(function(sx){
            add(torus(.18,.025),'#3a4a56',sx,3.20,2.70,0,0,0,false);
          });
          [-1.34,1.34].forEach(function(bx){ block(.07,.08,.66,'#3a4a56',bx,3.52,2.40,0,false); });
          terracottaWindowBox(0,3.06,2.68,1.22,0,vIdx+5);
          // Cascading bougainvillea vine draping from the balcony & corner wall
          var vineSide=-signSide, vCol=(vIdx%2===0)?'#d9487c':'#e86284';
          for(var vi=0;vi<7;vi++){
            var vy=3.05-vi*.34, vx=vineSide*(1.46+Math.sin(vi*1.2)*.26), vz=2.14+(vi<2?.32:0);
            orb(.14+(vi%2)*.03,vi%2?'#3f8f54':'#4da862',vx,vy,vz,false);
            if(vi%2===0 || vi===1) orb(.12,vCol,vx+vineSide*.06,vy+.05,vz+.08,false);
          }
          // Side-wall 2-story shuttered windows + upper flower boxes
          [-1,1].forEach(function(sd){
            [1.68,3.62].forEach(function(wy,fi){
              [-.75,.75].forEach(function(wz,wi2){
                var wx=sd*2.00;
                block(.12,.76,.58,fi?'#f7d982':'#314d5e',wx,wy,wz);
                block(.16,.07,.64,'#f6f0e2',wx+sd*.02,wy-.40,wz);
                block(.16,.76,.07,'#f6f0e2',wx+sd*.02,wy,wz);
                block(.16,.07,.58,'#f6f0e2',wx+sd*.02,wy,wz);
                [-1,1].forEach(function(sh){ block(.09,.76,.20,shutCol,wx+sd*.02,wy,wz+sh*.40,0,'timber'); });
                if(fi===1) terracottaWindowBox(wx+sd*.16,wy-.48,wz,.64,sd*Math.PI/2,vIdx+wi2+sd);
              });
            });
          });
          block(2.1,.42,.14,parity?'#b84e65':'#547c87',0,2.34,2.20);
          // Scalloped multi-stripe shopfront awning
          for(var aw=-2;aw<=2;aw++){
            var awCol=aw%2?'#f7e2b7':roof;
            block(.44,.11,.92,awCol,aw*.44,2.05,2.58,0,'fabric').rotation.x=.26;
            add(cyl(.22,.22,.09,10),awCol,aw*.44,1.91,2.99,Math.PI/2,0,0,'fabric');
          }
          block(4.06,.12,1.08,'#b5a890',0,.06,2.50,0,'stone');
          if(isClk){
            wornBox(1.85,3.1,1.85,'#edd4ac',0,wallH+2.15,0,'plaster');
            block(2.02,.16,2.02,'#e5d6b8',0,wallH+3.65,0,0,'stone');
            [-1,1].forEach(function(sd){ post(.085,1.08,'#4b6570',sd*.58,wallH+3.70,.66); });
            add(cyl(.28,.40,.50,8),'#e5b856',0,wallH+4.26,.66,0,0,0,false);
            add(cone(1.42,1.25,4),'#346476',0,wallH+5.30,0,0,Math.PI/4,0,'roof');
            orb(.16,'#f2c864',0,wallH+6.02,0,false);
            add(cyl(.54,.54,.08,16),'#fff4d4',0,wallH+2.40,.98,Math.PI/2,0,0,false);
            block(.06,.36,.06,'#3a5464',0,wallH+2.54,1.04,0,false);
            block(.28,.06,.06,'#3a5464',.10,wallH+2.40,1.04,0,false);
            block(3.2,.68,.55,'#688a89',0,.42,2.62,0,false);
            var fish=orb(.34,'#dae2cc',0,2.36,2.34,false);fish.scale.set(1.6,.55,.22);
            add(cone(.25,.4,3),'#dae2cc',-.62,2.36,2.34,0,0,-Math.PI/2,false);
          }
        });
      }
      var shopPlaced=[], lampPlaced=[], shopRoofAnchors=[], bgRoofAnchors=[];
      function canPlaceLamp(lx,lz){
        for(var li=0;li<lampPlaced.length;li++) if(Math.hypot(lampPlaced[li][0]-lx,lampPlaced[li][1]-lz)<5.2) return false;
        lampPlaced.push([lx,lz]); return true;
      }
      // m7: Weathered beveled harbor granite curb blocks + subtle recessed mortar joints (replaces plain beige bar)
      var curbGeo=beveledCurbGeo();
      var curbTints=['#d8d1be','#c9c2af','#e0d9c7','#c2bba8'];
      main.forEach(function(s,i){
        var f=frame(s), nextS=main[(i+1)%main.length], nf=frame(nextS), faceRot=Math.atan2(-f.nx,-f.nz);
        // Segmented beveled stone curb blocks along the harbor sidewalk edge
        var cp1=at(s,1,3.05,0), cp2=at(nextS,1,3.05,0);
        var cdx=cp2[0]-cp1[0], cdz=cp2[2]-cp1[2], clen=Math.hypot(cdx,cdz);
        if(clen>.5 && clen<7.5 && outerClear((cp1[0]+cp2[0])/2,(cp1[2]+cp2[2])/2,2.45)){
          var cAng=Math.atan2(cdx,cdz);
          // Recessed dark-mortar gutter bed beneath stone joints
          var mortar=block(.36,.12,clen+.16,'#6e6a5e',(cp1[0]+cp2[0])/2,-.25,(cp1[2]+cp2[2])/2,cAng,false);
          mortar.userData.reefGround=true;
          var nBlocks=Math.max(2,Math.round(clen/.92)), stepL=clen/nBlocks, bLen=Math.max(.34,stepL-.055);
          for(var bi=0;bi<nBlocks;bi++){
            var bt=(bi+.5)/nBlocks, bx=cp1[0]+cdx*bt, bz=cp1[2]+cdz*bt;
            var yJit=(((i*7+bi)%3)-1)*.005;
            var st=add(curbGeo,curbTints[(i*3+bi)%curbTints.length],bx,-.155+yJit,bz,0,cAng,0,'stone');
            st.scale.set(.42,.22,bLen);
            st.userData.reefGround=true;
          }
        }
        if(i%3===1){
          placed(s,1,7.5,0,function(x,y,z){
            if(!outerClear(x,z,4.4)) return;
            shopPlaced.push([x,z]);
            shop(x,y,z,i,faceRot);
            // Record high rooftop festoon finial anchor (world y = 7.62..8.15, strictly >= 7.0!)
            var isClk=(Math.floor(i/3)===0);
            shopRoofAnchors.push({x:x-f.nx*(isClk?0.9:1.25), y:isClk?8.12:7.65, z:z-f.nz*(isClk?0.9:1.25), i:i});
            // Trimmed fluffy Jamboree flowering bushes flanking shop yards
            [-1,1].forEach(function(sd){
              var hx=x+f.tx*sd*2.65-f.nx*1.35, hz=z+f.tz*sd*2.65-f.nz*1.35;
              if(outerClear(hx,hz,3.6) && !nearTownSurprise(hx,hz,3.0)){ hedgeRow(hx,y,hz,1.8,faceRot); addObstacle(hx,hz,.95); }
            });
            // Rounded coastal tree tucked beside the shop
            var tx=x+f.tx*(i%2?3.35:-3.35)+f.nx*.65, tz=z+f.tz*(i%2?3.35:-3.35)+f.nz*.65;
            if(outerClear(tx,tz,4.0) && !nearTownSurprise(tx,tz,3.2)){ pineTree(tx,y,tz,.88+(i%2)*.14,i%2?'#4a8c5c':'#3f7b58'); addObstacle(tx,tz,1.0); }
          });
          // Fill bare paving between route and shopfront with sculpted topiary planters & barrels, clear of deck & "?" tiles
          placed(s,1,3.95,0,function(x,y,z){
            if(!outerClear(x,z,3.4) || nearTownDeck(x,z,4.8) || nearTownSurprise(x,z,3.0)) return;
            if(pharmSpace && Math.hypot(x-pharmSpace.x,z-pharmSpace.z)<5.5) return;
            flowerPlanter(x,y,z,faceRot); addObstacle(x,z,.95);
            if(i%6===1 && !nearTownDeck(x+f.tx*1.1,z+f.tz*1.1,4.6) && !nearTownSurprise(x+f.tx*1.1,z+f.tz*1.1,3.0)){
              barrel(x+f.tx*1.1,y,z+f.tz*1.1,.85); addObstacle(x+f.tx*1.1,z+f.tz*1.1,.55);
            }
          });
        }else if(i%3===2){
          // MAJ-2: Enforce strict >= 3.4u 3D & 2D sightline clearance from ALL "?" / surprise cubes before placing any café umbrella!
          var umbSpot=null;
          var umbTries=[[4.8,0],[5.2,2.1],[5.2,-2.1],[5.4,3.1],[5.4,-3.1]];
          for(var ut=0;ut<umbTries.length && !umbSpot;ut++){
            var up=at(s,1,umbTries[ut][0],umbTries[ut][1]);
            if(outerClear(up[0],up[2],3.8) && !nearTownDeck(up[0],up[2],4.5) && !umbrellaBlocksTownQ(up[0],up[2])){
              umbSpot=up;
            }
          }
          if(umbSpot){
            umbrella(umbSpot[0],umbSpot[1],umbSpot[2],i%2?'#e86f68':'#4c96a8','#fff1d0',faceRot,.88); addObstacle(umbSpot[0],umbSpot[2],.9);
            var bxU=umbSpot[0]+f.tx*1.3, bzU=umbSpot[2]+f.tz*1.3;
            if(outerClear(bxU,bzU,3.5) && !nearTownSurprise(bxU,bzU,3.0)){
              bench(bxU,umbSpot[1],bzU,faceRot); addObstacle(bxU,bzU,.85);
            }
          }else{
            placed(s,1,4.6,0,function(x,y,z){
              if(!outerClear(x,z,3.6) || nearTownDeck(x,z,4.5) || nearTownSurprise(x,z,3.0)) return;
              hedgeRow(x,y,z,1.7,faceRot); addObstacle(x,z,.9);
            });
          }
        }else{
          placed(s,1,4.35,0,function(x,y,z){
            if(!outerClear(x,z,3.6) || nearTownDeck(x,z,4.6) || nearTownSurprise(x,z,3.0)) return;
            if(canPlaceLamp(x,z)){ hangingLantern(x,y,z,faceRot); addObstacle(x,z,.65); }
            if(!nearTownSurprise(x-f.tx*.95,z-f.tz*.95,3.0)){
              crate(x-f.tx*.95,y,z-f.tz*.95,.82); addObstacle(x-f.tx*.95,z-f.tz*.95,.55);
            }
          });
        }
      });
      // Tall 3-4 story coastal harbor townhouses rising behind front-row shops (cached composite + quoins, shutters, scalloped tiles, brick chimneys, bougainvillea!)
      function bgHarborBuilding(x,y,z,n,rot){
        var bIdx=n%4, stories=3+(n%2);
        contact(x,z,2.9,2.7,-.301);
        emitCached('townBgBldg:' + bIdx + ':' + stories, x, y, z, rot || 0, 1, function(){
          var walls=['#f2d3a4','#e59c7e','#f7ebd4','#b8dccb'], roofs=['#c35746','#386076','#d26e48','#446d60'],
              shutters=['#386878','#c25946','#497e6c','#ba6844'];
          var wall=walls[bIdx], roof=roofs[bIdx], shutCol=shutters[bIdx], storyH=2.25, h=stories*storyH, ridgeH=1.55;
          wornBox(4.60,.42,4.10,'#626765',0,.21,0,'stone');
          wornBox(4.44,h,3.96,wall,0,h/2,0,'plaster');
          // Alternating stone corner quoins up the full townhouse height
          [-1,1].forEach(function(cxS){ [-1,1].forEach(function(czS){
            for(var qi=0;qi<stories*3;qi++){
              var qLong=(qi%2===0);
              block(qLong?.36:.24,.56,qLong?.24:.36,qi%2?'#e7dbc2':'#f2e7d2',cxS*(qLong?2.14:2.18),.68+qi*.72,czS*(qLong?1.94:1.88),0,'stone');
            }
          }); });
          for(var belt=1;belt<stories;belt++){
            block(4.66,.16,4.16,'#ebe0c8',0,belt*storyH,0,0,'stone');
          }
          for(var fl=0;fl<stories;fl++){
            var wy=1.16+fl*storyH;
            [-1.24,0,1.24].forEach(function(wx,wi){
              var warmLit=((bIdx+fl+wi)%3!==0)?'#f7d984':'#3a5b6e';
              block(.66,.80,.14,warmLit,wx,wy,1.96,0,false);
              block(.07,.80,.17,'#f6f0e2',wx,wy,1.99,0,false);
              block(.66,.07,.17,'#f6f0e2',wx,wy,1.99,0,false);
              block(.78,.10,.20,roof,wx,wy+.45,2.00,0,false);
              if(wi!==1){ [-1,1].forEach(function(sh){ block(.18,.80,.08,shutCol,wx+sh*.42,wy,1.98,0,'timber'); }); }
              if(fl>=1 && (wi!==1 || fl!==1)){
                terracottaWindowBox(wx,wy-.46,2.12,.72,0,bIdx*3+fl*5+wi);
              }
            });
            if(fl===1 || (stories===4 && fl===2)){
              var bW=fl===1?2.35:1.45;
              block(bW,.12,.64,'#8a5d3e',0,wy-.52,2.24,0,'timber');
              block(bW+.04,.07,.07,'#3a4a56',0,wy+.06,2.52,0,false);
              [-bW*.46,0,bW*.46].forEach(function(bpx){ block(.06,.56,.06,'#3a4a56',bpx,wy-.22,2.52,0,false); });
              [-bW*.24,bW*.24].forEach(function(sx){ add(torus(.15,.022),'#3a4a56',sx,wy-.22,2.52,0,0,0,false); });
              terracottaWindowBox(0,wy-.38,2.54,fl===1?1.12:.84,0,bIdx+fl*7);
            }
            [-1,1].forEach(function(sd){
              [-.78,.78].forEach(function(wz,wi2){
                var sx=sd*2.24;
                block(.12,.72,.56,((fl+wi2)%2)?'#f5d680':'#365568',sx,wy,wz,0,false);
                block(.15,.72,.07,'#f6f0e2',sx+sd*.02,wy,wz,0,false);
                block(.15,.07,.56,'#f6f0e2',sx+sd*.02,wy,wz,0,false);
                [-1,1].forEach(function(sh){ block(.08,.72,.18,shutCol,sx+sd*.02,wy,wz+sh*.38,0,'timber'); });
                if(fl>=1 && (fl+wi2)%2===0){
                  terracottaWindowBox(sx+sd*.15,wy-.44,wz,.60,sd*Math.PI/2,bIdx+fl+wi2+sd);
                }
              });
            });
          }
          // Cascading bougainvillea cascading beside 2nd-story balcony
          var bvCol=(bIdx%2===0)?'#d94a7e':'#ec6a8e';
          for(var bvi=0;bvi<6;bvi++){
            orb(.15,bvi%2?'#44985a':'#52ad68',1.35+Math.sin(bvi)*.22,3.15-bvi*.36,2.08,false);
            if(bvi%2===0) orb(.13,bvCol,1.42+Math.sin(bvi)*.20,3.20-bvi*.36,2.16,false);
          }
          wornBox(4.74,.22,4.24,roof,0,h+.08,0,'timber');
          [-1,1].forEach(function(sx){ gableEnd(sx*2.16,h+.08,0,4.02,ridgeH,.18,wall,Math.PI/2); });
          block(4.92,.18,2.62,roof,0,h+.78,-1.02,0,'roof').rotation.x=-.56;
          block(4.92,.18,2.62,roof,0,h+.78,1.02,0,'roof').rotation.x=.56;
          block(5.06,.16,.18,'#243d50',0,h+ridgeH+.04,0,0,'roof');
          // Scalloped terracotta/slate eave tiles
          for(var ti=-5;ti<=5;ti++){
            add(cyl(.19,.19,.18,8),ti%2?roof:'#d97b60',ti*.44,h+.06,2.12,Math.PI/2,0,0,'roof');
          }
          [-1.08,1.08].forEach(function(dx){ roofDormer(dx,h+.12,1.16,roof,wall,'#fae08e'); });
          // Brick chimney + stone corbel crown + twin terracotta pots
          wornBox(.68,1.38,.68,'#b55d49',1.38,h+1.40,-.58,'stone');
          block(.80,.14,.80,'#e8dcc4',1.38,h+2.10,-.58,0,'stone');
          add(cyl(.13,.16,.32,8),'#c8644e',1.24,h+2.28,-.58,0,0,0,'roof');
          add(cyl(.12,.15,.26,8),'#b05440',1.52,h+2.25,-.58,0,0,0,'roof');
        });
      }
      main.forEach(function(s,i){
        if(i%2!==0) return;
        var f=frame(s), faceRot=Math.atan2(-f.nx,-f.nz), dist=11.8+(i%3)*.95;
        placed(s,1,dist,0,function(x,y,z){
          if(!outerClear(x,z,4.6)) return;
          bgHarborBuilding(x,y,z,i,faceRot);
          var stCount=3+(i%2), roofAncY=(stCount===4)?8.85:7.72;
          bgRoofAnchors.push({x:x-f.nx*1.85, y:roofAncY, z:z-f.nz*1.85, i:i});
          var tx=x+f.tx*(i%4===0?3.1:-3.1), tz=z+f.tz*(i%4===0?3.1:-3.1);
          if(outerClear(tx,tz,4.0)) pineTree(tx,y,tz,1.02,'#46845a');
        });
      });
      // iter30 Beyond-MP8: Festive coastal Mediterranean pennant/bunting garlands strung high between
      // the pitched-roof harbor buildings (strictly y >= 7.0 everywhere, including lowest pennant tip — 100% clear of paths & faces!)
      (function buildMediterraneanBuntingGarlands(){
        var g0=curRoot.children.length;
        var penGeo=geos.medPennant;
        if(!penGeo){
          // Crisp double-sided tapered triangular pennant with subtle sea-breeze camber
          var sh=new T.Shape();
          sh.moveTo(-.22,0); sh.lineTo(.22,0); sh.lineTo(0,-.44); sh.closePath();
          penGeo=own(new T.ExtrudeGeometry(sh,{depth:.032,bevelEnabled:false}));
          penGeo.translate(0,0,-.016);
          geos.medPennant=penGeo;
        }
        var penCols=['#e85c54','#ffd452','#3ab8c4','#fff7e2','#f2904e','#e4669c'];
        var gSeq=0;
        function stringGarland(a,b,maxDist){
          var dx=b.x-a.x, dz=b.z-a.z, lenXZ=Math.hypot(dx,dz);
          if(lenXZ<3.2 || lenXZ>(maxDist||16.5)) return;
          gSeq++;
          var yaw=Math.atan2(dx,dz)+Math.PI*0.5;
          var sag=Math.min(0.46,lenXZ*0.036);
          // Clamp cord minimum so every hanging pennant tip (cordY - 0.02 - 0.46) stays strictly >= 7.05!
          function cordY(t){
            var yLin=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*sag;
            return Math.max(7.56,yLin);
          }
          var segs=8, px=a.x, py=cordY(0), pz=a.z;
          for(var si=1;si<=segs;si++){
            var t=si/segs, nx=a.x+dx*t, ny=cordY(t), nz=a.z+dz*t;
            var sl=Math.hypot(nx-px,ny-py,nz-pz);
            if(sl>0.04) limb(px,py,pz,nx-px,ny-py,nz-pz,sl,0.026,0.026,'#ede2c6','rope');
            px=nx; py=ny; pz=nz;
          }
          var nFlags=Math.max(6,Math.min(14,Math.round(lenXZ/0.88)));
          for(var fi=1;fi<nFlags;fi++){
            var ft=fi/nFlags, fx=a.x+dx*ft, fy=cordY(ft)-0.02, fz=a.z+dz*ft;
            var flutter=0.14*Math.sin(fi*1.7+gSeq);
            var flag=add(penGeo,penCols[(gSeq*3+fi)%penCols.length],fx,fy,fz,flutter,yaw,0,'fabric');
            flag.scale.set(1.06,1.04,1);
          }
        }
        // 1. High skyline garlands bridging consecutive tall background Mediterranean townhouses
        for(var bi=0;bi<bgRoofAnchors.length;bi++){
          stringGarland(bgRoofAnchors[bi], bgRoofAnchors[(bi+1)%bgRoofAnchors.length], 16.5);
        }
        // 2. Streetfront festoon garlands bridging consecutive front-row shop rooftop finials
        for(var si2=0;si2<shopRoofAnchors.length;si2++){
          stringGarland(shopRoofAnchors[si2], shopRoofAnchors[(si2+1)%shopRoofAnchors.length], 15.5);
        }
        // 3. Festive cross-lane diagonal garlands linking front-row shop finials back to tall townhouse gables
        shopRoofAnchors.forEach(function(sa,idx){
          var nearest=null, bestD=Infinity;
          bgRoofAnchors.forEach(function(ba){
            var d=Math.hypot(ba.x-sa.x,ba.z-sa.z);
            if(d>=4.0 && d<10.5 && d<bestD){ bestD=d; nearest=ba; }
          });
          if(nearest && idx%2===0) stringGarland(sa,nearest,11.0);
        });
        compactRootRange(g0, cx, 7.6, cz, 0);
      })();
      // Continuous mitered quay curbs, beveled seawall stone blocks, bollard railings & 2-tier scalloped seawall foam ribbon
      var quayG0=curRoot.children.length;
      var prevBollard=null, foamRibbons=[], foamOuterRibbons=[], seawallSegs=[], bollardPts=[], pierBoxes=[];
      main.forEach(function(s,i){
        var f=frame(s), nextS=main[(i+1)%main.length], p=at(s,-1,3.15,0), p2=at(nextS,-1,3.15,0), bx=p[0], by=p[1], bz=p[2];
        var sw1=at(s,-1,4.02,0), sw2=at(nextS,-1,4.02,0);
        seawallSegs.push([sw1[0],sw1[2],sw2[0],sw2[2]]);
        var qdx=p2[0]-bx, qdz=p2[2]-bz, qlen=Math.hypot(qdx,qdz);
        if(qlen>.5 && qlen<7.5){
          var qAng=Math.atan2(qdx,qdz);
          if(outerClear((bx+p2[0])/2,(bz+p2[2])/2,2.6)){
            block(.34,.2,qlen+.22,'#9d998b',(bx+p2[0])/2+f.nx*.28,by+.1,(bz+p2[2])/2+f.nz*.28,qAng,'stone');
          }
          // Beveled seawall stone blocks along the outer harbor wall
          wornBox(.48,.28,qlen*.88,'#858b89',(sw1[0]+sw2[0])/2,-.38,(sw1[2]+sw2[2])/2,'stone').rotation.y=qAng;
          var nf=frame(nextS), ni=(i+1)%main.length;
          var sc1=.58+.16*Math.sin(i*1.9), sc2=.58+.16*Math.sin(ni*1.9);
          var so1=.98+.22*Math.cos(i*2.3), so2=.98+.22*Math.cos(ni*2.3);
          foamRibbons.push([
            [sw1[0]-f.nx*.08,sw1[2]-f.nz*.08,1],
            [sw1[0]-f.nx*sc1,sw1[2]-f.nz*sc1,.82],
            [sw2[0]-nf.nx*sc2,sw2[2]-nf.nz*sc2,.82],
            [sw2[0]-nf.nx*.08,sw2[2]-nf.nz*.08,1]
          ]);
          foamOuterRibbons.push([
            [sw1[0]-f.nx*(sc1-.08),sw1[2]-f.nz*(sc1-.08),.9],
            [sw1[0]-f.nx*so1,sw1[2]-f.nz*so1,.66],
            [sw2[0]-nf.nx*so2,sw2[2]-nf.nz*so2,.66],
            [sw2[0]-nf.nx*(sc2-.08),sw2[2]-nf.nz*(sc2-.08),.9]
          ]);
        }
        var isPier=(i>=2 && i%5===2);
        if(!isPier && outerClear(bx,bz,2.85)){
          post(.1,.74,'#6e4d37',bx,by,bz);
          add(cyl(.12,.12,.08,8),'#d9be88',bx,by+.76,bz,0,0,0,false);
          addObstacle(bx,bz,.55);
          bollardPts.push([bx,bz]);
          if(i%4===0 && !nearTownDeck(bx,bz,4.6) && canPlaceLamp(bx-f.nx*.15,bz-f.nz*.15)){
            hangingLantern(bx-f.nx*.15,by,bz-f.nz*.15,Math.atan2(f.nx,f.nz));
            addObstacle(bx-f.nx*.15,bz-f.nz*.15,.65);
            bollardPts.push([bx-f.nx*.15,bz-f.nz*.15]);
          }
          if(prevBollard){
            var dx=bx-prevBollard[0], dz=bz-prevBollard[2], len=Math.hypot(dx,dz);
            if(len>1.2 && len<6.5){
              var rail=add(cyl(.035,.035,len,6),'#cbb382',(bx+prevBollard[0])/2,by+.56,(bz+prevBollard[2])/2,0,0,0,'rope');
              rail.lookAt(bx,by+.56,bz); rail.rotateX(Math.PI/2);
            }
          }
          prevBollard=[bx,by,bz];
        }else{
          prevBollard=null;
        }
      });
      if(foamRibbons.length) painted(foamRibbons,waterY+.035,'#eefcfd','seawall-foam');
      if(foamOuterRibbons.length) painted(foamOuterRibbons,waterY+.025,'#d6f8fa','seawall-foam');
      compactRootRange(quayG0, cx, -.27, cz, 0);
      // Striped market stalls cleanly clear of front-row shop eaves (>= 4.85 units from shop centers)
      var stallPlaced=[];
      for(var k=3;k<main.length;k+=4){
        var ms=main[k], mf=frame(ms), mRot=Math.atan2(-mf.nx,-mf.nz), mDone=false;
        [4.55,4.25,4.85].forEach(function(sDist){
          if(mDone) return;
          [0,-1.1,1.1,-1.85,1.85].forEach(function(sOff){
            if(mDone) return;
            placed(ms,1,sDist,sOff,function(x,y,z){
              if(mDone || !outerClear(x,z,3.65) || nearTownDeck(x,z,4.4) || nearTownSurprise(x,z,3.2)) return;
              if(shopPlaced.some(function(sp2){ return Math.hypot(sp2[0]-x,sp2[1]-z)<4.85; })) return;
              if(stallPlaced.some(function(p){ return Math.hypot(p[0]-x,p[1]-z)<3.8; })) return;
              mDone=true; stallPlaced.push([x,z]);
              marketStall(x,y,z,mRot,k%2?'#e86f68':'#4c96a8','#fff1d0');
              addObstacle(x,z,1.65);
              [-1,1].forEach(function(sd){
                var hx=x+mf.tx*sd*1.95, hz=z+mf.tz*sd*1.95;
                if(outerClear(hx,hz,3.4) && !nearTownDeck(hx,hz,4.2) && !nearTownSurprise(hx,hz,3.0) && shopPlaced.every(function(sp2){ return Math.hypot(sp2[0]-hx,sp2[1]-hz)>=3.6; })){
                  hedgeRow(hx,y,hz,1.35,mRot); addObstacle(hx,hz,.9);
                }
              });
            });
          });
        });
      }
      // Lively harbor welcome arch & bell detail framing the waterfront plaza
      for(var wa=0;wa<main.length;wa++){
        var ws=main[wa], wf=frame(ws), wRot=Math.atan2(wf.tx,wf.tz), wp=at(ws,1,4.6,0);
        if(outerClear(wp[0],wp[2],3.8)){
          var ax=wp[0], ay=wp[1], az=wp[2], g0=root.children.length;
          [-1,1].forEach(function(sd){
            wornBox(.52,.36,.52,'#8d9491',ax+sd*1.45,ay+.18,az,'stone');
            post(.11,2.85,'#754c38',ax+sd*1.45,ay+.36,az);
            orb(.16,'#ffd58c',ax+sd*1.45,ay+3.28,az,false);
          });
          wornBox(3.4,.48,.34,'#395f75',ax,ay+3.02,az,'timber');
          block(3.55,.12,.4,'#e8cc9c',ax,ay+3.28,az,0,'timber');
          block(2.1,.28,.38,'#e8cc9c',ax,ay+3.02,az,0,'timber');
          // Hanging golden harbor bell
          add(cyl(.03,.03,.28,6),'#55453b',ax,ay+2.68,az,0,0,0,false);
          add(cyl(.14,.26,.34,10),'#e3ba58',ax,ay+2.42,az,0,0,0,false);
          orb(.07,'#8d5d3e',ax,ay+2.24,az,false);
          var archGrp=new T.Group(), archOrg=new T.Vector3(ax,ay,az);
          root.children.slice(g0).forEach(function(p){ p.position.sub(archOrg); archGrp.add(p); });
          archGrp.position.copy(archOrg); archGrp.rotation.y=wRot; root.add(archGrp);
          break;
        }
      }
      // Bustling wooden fishing piers with crates, barrels, lanterns and mooring posts
      for(var pr=2;pr<main.length;pr+=5){
        var ps=main[pr], pf=frame(ps), pAngle=Math.atan2(pf.nx,pf.nz);
        var px=ps.x-pf.nx*5.2, pz=ps.z-pf.nz*5.2;
        var pierNd=camNDC(px,-.2,pz);
        // Keep the in-frame centre of the basin free for the coastal ferry and moored sailboats.
        if(pierNd.x>-.88 && pierNd.x<-.05 && pierNd.y>-.72 && pierNd.y<.28) continue;
        if(waterClear(px,pz,4.5)){
          waterPlaced.push([px,pz]);
          pierBoxes.push({x:px,z:pz,nx:pf.nx,nz:pf.nz,tx:pf.tx,tz:pf.tz,halfL:2.25,halfW:1.05});
          addObstacle(px-pf.nx*1.2,pz-pf.nz*1.2,1.55);
          addObstacle(px+pf.nx*1.1,pz+pf.nz*1.1,1.55);
          block(1.7,.14,4.2,'#9b6d48',px,-.2,pz,pAngle,'timber');
          [-1,1].forEach(function(sd){
            post(.09,.9,'#6a4832',px-pf.nx*1.6+pf.tx*sd*.65,-.68,pz-pf.nz*1.6+pf.tz*sd*.65);
            post(.09,.9,'#6a4832',px+pf.nx*1.2+pf.tx*sd*.65,-.68,pz+pf.nz*1.2+pf.tz*sd*.65);
          });
          crate(px+pf.tx*.35,-.12,pz+pf.tz*.35,.85);
          barrel(px-pf.tx*.4,-.12,pz-pf.tz*.4,.85);
          ropeCoil(px-pf.nx*1.3,.0,pz-pf.nz*1.3);
        }
      }
      // Terraced outer hillside village cottages & coastal pines climbing above the main shops for skyline depth
      for(var hi=0;hi<14;hi++){
        var ha=hi*Math.PI*2/14+.22, hr=maxR+10.5+(hi%3)*2.4,
            hx=cx+Math.cos(ha)*hr, hz=cz+Math.sin(ha)*hr, hillH=2.4+(hi%3)*1.1;
        if(!outerClear(hx,hz,7.2)) continue;
        organicRock(hx,-.75,hz,5.4,hillH,4.8,'#79917e');
        organicRock(hx,hillH-.85,hz,4.1,.45,3.7,'#8ea987');
        var topY=hillH-.55;
        if(hi%2===0){
          cottage(hx,topY,hz,Math.atan2(cx-hx,cz-hz),hi%4===0?'#f4dfc4':'#dbe6de',hi%3===0?'#395f75':'#c25747',1.24);
          pineTree(hx+2.4,topY,hz-1.3,1.15,'#447364');
        }else{
          pineTree(hx,topY,hz,1.38,'#3f6d5e');
          pineTree(hx-1.6,topY-.15,hz+1.4,1.05,'#518371');
        }
      }
      // Outer curving stone breakwater & seawall with red-and-white harbor entrance beacon
      var bwR=maxR+15.5, bwCount=14;
      for(var bi=0;bi<bwCount;bi++){
        if(bi>=5 && bi<=7) continue; // harbor entrance channel gap
        var ba=bi*Math.PI*2/bwCount, bx=cx+Math.cos(ba)*bwR, bz=cz+Math.sin(ba)*bwR;
        if(!outerClear(bx,bz,7.5)) continue;
        foamRing(bx,-.6,bz,2.6);
        block(4.2,1.65,2.2,'#7c8587',bx,-.15,bz,-ba+Math.PI/2,'stone');
        block(4.35,.22,2.45,'#b8b5a6',bx,.75,bz,-ba+Math.PI/2,'stone');
        if(bi===4 || bi===8){
          // Harbor entrance beacon tower on the breakwater head
          add(cyl(1.1,1.35,.5,10),'#6a7376',bx,.95,bz,0,0,0,'stone');
          for(var st=0;st<4;st++) add(cyl(.55-.05*st,.6-.05*st,.75,10),st%2?'#f4ead2':'#d4534f',bx,1.55+st*.72,bz,0,0,0,false);
          add(cyl(.65,.65,.2,10),'#374a57',bx,4.2,bz,0,0,0,false);
          orb(.32,'#ffe496',bx,4.55,bz,false);
          add(cone(.7,.55,10),'#c84c4c',bx,4.98,bz,0,0,0,'roof');
        }
      }
      // m4: Harbor coastal ferry & moored sailboats — slide ferry inward so ALL 8 hull/cabin/mast corners stay strictly inside x >= 6% NDC (minX >= -0.84)
      var ferryX=cx, ferryZ=cz, camR=camRight(), camFw=[camSetup().fx,camSetup().fz], ferryFound=false, ferryGap=4.6, ferryYaw=-.38;
      view._ferryYaw=ferryYaw;
      // The basin is only the water inside the street ring (inner width 3.2): keep every moved hull inside a shrunken copy of that ring.
      var basinCache={};
      function inBasin(x,z,m){
        var poly=basinCache[m]||(basinCache[m]=main.map(function(s){ var f=frame(s); return [s.x-f.nx*m,s.z-f.nz*m]; })), inside=false;
        for(var a=0,b=poly.length-1;a<poly.length;b=a++){
          var xi=poly[a][0],zi=poly[a][1],xj=poly[b][0],zj=poly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) inside=!inside;
        }
        return inside;
      }
      function coastalFerry(x,y,z,yaw){
        var g0=root.children.length;
        smoothFoamRing(x,waterY+.064,z,1.88,2.92);
        // Sculpted tapered-bow hull with deep marine keel, red waterline stripe & cream bulwark
        var fsh=new T.Shape();
        fsh.moveTo(-.92,-2.28); fsh.lineTo(.92,-2.28); fsh.quadraticCurveTo(1.26,-1.45,1.24,-.15);
        fsh.quadraticCurveTo(1.16,1.35,.72,2.15); fsh.quadraticCurveTo(.32,2.62,0,2.78);
        fsh.quadraticCurveTo(-.32,2.62,-.72,2.15); fsh.quadraticCurveTo(-1.16,1.35,-1.24,-.15);
        fsh.quadraticCurveTo(-1.26,-1.45,-.92,-2.28); fsh.closePath();
        var fhull=own(new T.ExtrudeGeometry(fsh,{depth:.62,bevelEnabled:true,bevelSegments:2,bevelSize:.07,bevelThickness:.07,curveSegments:8}));
        fhull.rotateX(-Math.PI/2);
        add(fhull,'#2d6075',x,y,z,0,0,0,'timber');
        // Crisp red coastal waterline band + cream upper rub-rail bulwark
        var wBand=add(fhull,'#d85753',x,y+.46,z,0,0,0,false); wBand.scale.set(1.025,.24,1.02);
        var rub=add(fhull,'#f8edd6',x,y+.62,z,0,0,0,'timber'); rub.scale.set(1.04,.16,1.03);
        // Warm teak fore/aft deck planking + bow mooring bollard
        var dsh=new T.Shape();
        dsh.moveTo(-.84,-2.16); dsh.lineTo(.84,-2.16); dsh.lineTo(1.12,-.15);
        dsh.lineTo(.66,1.98); dsh.lineTo(0,2.52); dsh.lineTo(-.66,1.98); dsh.lineTo(-1.12,-.15); dsh.closePath();
        var fdeck=own(new T.ExtrudeGeometry(dsh,{depth:.08,bevelEnabled:false})); fdeck.rotateX(-Math.PI/2);
        add(fdeck,'#cca16d',x,y+.67,z,0,0,0,'timber');
        add(cyl(.09,.11,.24,8),'#4b5c68',x,y+.84,z+2.18,0,0,0,false);
        add(cyl(.14,.14,.05,8),'#e5bc5b',x,y+.97,z+2.18,0,0,0,false);
        // Deck railings: white timber stanchions + perimeter handrails around bow & stern decks
        var railPts=[[-.92,-2.12],[0,-2.12],[.92,-2.12],[-1.08,-1.1],[1.08,-1.1],[-1.06,1.18],[1.06,1.18],[-.64,1.95],[.64,1.95],[0,2.46]];
        railPts.forEach(function(rp){ post(.032,.34,'#faf3e2',x+rp[0],y+.72,z+rp[1]); });
        block(1.88,.045,.055,'#faf3e2',x,y+1.04,z-2.12,0,'timber');
        [-1,1].forEach(function(sd){
          block(.055,.045,1.05,'#faf3e2',x+sd*1.02,y+1.04,z-1.62,0,'timber');
          block(.055,.045,.92,'#faf3e2',x+sd*.86,y+1.04,z+1.56,sd*-.42,'timber');
          block(.055,.045,.74,'#faf3e2',x+sd*.34,y+1.04,z+2.2,sd*-.86,'timber');
        });
        // Striped red-and-cream painted main passenger cabin
        wornBox(1.82,.96,2.55,'#faf0d8',x,y+1.22,z-.18,'plaster');
        block(1.88,.20,2.60,'#d85753',x,y+.96,z-.18,0,'plaster');
        block(1.88,.09,2.60,'#355c70',x,y+1.58,z-.18,0,'timber');
        // Overhanging main cabin promenade roof with white fascia eaves
        wornBox(2.04,.13,2.82,'#faf3e2',x,y+1.73,z-.18,'timber');
        block(1.94,.08,2.72,'#c84f55',x,y+1.82,z-.18,0,'roof');
        // Arched / brass-rimmed circular porthole windows on BOTH port & starboard flanks + front salon windows
        [-1,1].forEach(function(sd){
          [-.82,0,.82].forEach(function(pz){
            add(cyl(.22,.22,.08,14),'#e5bc5b',x+sd*.92,y+1.30,z-.18+pz,0,0,Math.PI/2,false);
            add(cyl(.16,.16,.11,14),'#ffe699',x+sd*.93,y+1.30,z-.18+pz,0,0,Math.PI/2,false);
            add(cyl(.17,.17,.06,12),'#355c70',x+sd*.93,y+1.40,z-.18+pz,0,0,Math.PI/2,false);
          });
          // Bright orange-and-white striped lifebuoys mounted on the cabin walls
          add(torus(.17,.048),'#f0694a',x+sd*.96,y+.98,z-.65,0,Math.PI/2,0,false);
          add(torus(.17,.048),'#f0694a',x+sd*.96,y+.98,z+.42,0,Math.PI/2,0,false);
          orb(.055,'#fff8e8',x+sd*.99,y+1.14,z-.65,false);
          orb(.055,'#fff8e8',x+sd*.99,y+1.14,z+.42,false);
        });
        [-.42,.42].forEach(function(wx){
          block(.44,.38,.09,'#3a6e82',x+wx,y+1.30,z+1.10,0,false);
          block(.34,.28,.11,'#a8e2f0',x+wx,y+1.30,z+1.10,0,false);
          block(.50,.06,.13,'#e5bc5b',x+wx,y+1.10,z+1.11,0,false);
        });
        // Upper wheelhouse with panoramic bridge windows & sloped coastal roof (MIN 7: crisp coastal contrast!)
        wornBox(1.24,.70,1.22,'#faf2de',x,y+2.18,z+.24,'plaster');
        block(1.28,.12,1.26,'#d85753',x,y+1.94,z+.24,0,'plaster');
        // Angled front & side wheelhouse glass panes with clean coastal-blue framing & sunlit glass contrast
        block(.98,.32,.10,'#39687d',x,y+2.26,z+.84,0,false);
        block(.88,.24,.12,'#b6ecf8',x,y+2.26,z+.85,0,false);
        block(.06,.30,.14,'#faf2de',x,y+2.26,z+.86,0,false);
        [-1,1].forEach(function(sd){
          block(.10,.30,.72,'#39687d',x+sd*.62,y+2.26,z+.28,0,false);
          block(.12,.22,.62,'#ffefa8',x+sd*.63,y+2.26,z+.28,0,false);
        });
        // Sloped wheelhouse roof (pitched left & right eaves + crisp warm-cream fascia trim & ridge beam)
        var rL=block(.84,.11,1.44,'#d25458',x-.35,y+2.64,z+.24,0,'roof'); rL.rotation.z=.26;
        var rR=block(.84,.11,1.44,'#d25458',x+.35,y+2.64,z+.24,0,'roof'); rR.rotation.z=-.26;
        block(.10,.08,1.48,'#fff6e2',x-.73,y+2.54,z+.24,0,'timber');
        block(.10,.08,1.48,'#fff6e2',x+.73,y+2.54,z+.24,0,'timber');
        block(.20,.13,1.50,'#fff7e6',x,y+2.76,z+.24,0,'timber');
        // Crisp maritime cream, crimson & gleaming brass coastal smokestack funnel (eliminates dark wheelhouse smudge)
        add(cyl(.20,.25,.92,12),'#f6ebd4',x,y+2.28,z-.72,0,0,0,'plaster');
        add(cyl(.228,.238,.28,12),'#d85753',x,y+2.42,z-.72,0,0,0,'roof');
        add(cyl(.245,.245,.11,12),'#ecc462',x,y+2.70,z-.72,0,0,0,false);
        add(cyl(.15,.15,.08,10),'#466275',x,y+2.77,z-.72,0,0,0,false);
        // Forward brass/timber signal mast + crossbar + warm bow lamp + pennant
        post(.042,1.15,'#d9ad54',x,y+2.62,z+.56);
        block(.78,.04,.04,'#e5bc5b',x,y+3.36,z+.56,0,false);
        orb(.09,'#ffe89a',x,y+3.80,z+.56,false);
        block(.05,.18,.42,'#e86f68',x,y+3.60,z+.32,0,'fabric');
        // Warm glowing brass bow lantern
        orb(.11,'#ffe494',x,y+1.06,z+2.46,false);
        compactRootRange(g0, x, y, z, yaw || 0);
      }
      // Search the visible basin for the best spot where ALL 8 corners of the ferry stay strictly inside x >= 6% NDC (prefer spots visible from BOTH activeIdx and pharmacy view!)
      var ferryBest=null, pharmIdx=pharmSpace ? pharmSpace.i : -1;
      var ferryGrid=[];
      for(var fr=-8;fr<=20;fr+=.5) for(var ff=-12;ff<=14;ff+=.5) ferryGrid.push([fr,ff]);
      [[-.84,6.4,5.4,true],[-.84,6.2,5.0,false],[-.84,5.8,4.8,false],[-.875,5.4,4.5,false]].forEach(function(cfg){
        if(ferryFound) return;
        for(var fi=0;fi<ferryGrid.length;fi++){
          var tx0=cx+camR[0]*ferryGrid[fi][0]+camFw[0]*ferryGrid[fi][1], tz0=cz+camR[1]*ferryGrid[fi][0]+camFw[1]*ferryGrid[fi][1];
          if(!inBasin(tx0,tz0,cfg[1]) || !waterClear(tx0,tz0,cfg[2])) continue;
          if(!camBoxInFrame(activeIdx,tx0,tz0,1.38,2.85,-.58,3.25,ferryYaw,cfg[0],.84,-.86,.78)) continue;
          if(cfg[3] && pharmIdx>=0 && pharmIdx!==activeIdx && !camBoxInFrame(pharmIdx,tx0,tz0,1.38,2.85,-.58,3.25,ferryYaw,cfg[0],.84,-.86,.78)) continue;
          var nd=camNDC(tx0,.4,tz0);
          var sc=Math.hypot(nd.x-(-.56),nd.y-.14);
          if(!ferryBest || sc<ferryBest.sc){ ferryBest={x:tx0,z:tz0,sc:sc,gap:cfg[2]}; }
        }
        if(ferryBest){ ferryX=ferryBest.x; ferryZ=ferryBest.z; ferryGap=ferryBest.gap; ferryFound=true; }
      });
      var ferryObsPts=[];
      if(ferryFound && waterClear(ferryX,ferryZ,ferryGap)){
        waterPlaced.push([ferryX,ferryZ]);
        coastalFerry(ferryX,-.58,ferryZ,ferryYaw);
        // Register the red ferry's full hull + bow + bowsprit + stern footprint in view._sceneryObstacles so subway-ray, friend-seal & hotel-whale never clip it!
        var fSin=Math.sin(ferryYaw), fCos=Math.cos(ferryYaw);
        ferryObsPts=[
          [ferryX,ferryZ,2.35],
          [ferryX+fSin*1.75,ferryZ+fCos*1.75,2.05],
          [ferryX+fSin*2.65,ferryZ+fCos*2.65,1.85],
          [ferryX-fSin*1.65,ferryZ-fCos*1.65,2.15]
        ];
        ferryObsPts.forEach(function(fo){ addObstacle(fo[0],fo[1],fo[2]); });
      }
      // Exact seawall / pier / bollard / ferry clearance helper so moored basin sailboats stay >= 1.5 units clear of every wall, post & lamp!
      function distToSeg2D(x,z,x1,z1,x2,z2){
        var vx=x2-x1, vz=z2-z1, t=Math.max(0,Math.min(1,((x-x1)*vx+(z-z1)*vz)/(vx*vx+vz*vz||1)));
        return Math.hypot(x-(x1+vx*t),z-(z1+vz*t));
      }
      function basinBoatClear(bx,bz,hullR,extraGap){
        var hr=hullR||1.05, gap=extraGap||1.52;
        if(!inBasin(bx,bz,5.6)) return false;
        if(!outerClear(bx,bz,5.4)) return false;
        for(var si=0;si<seawallSegs.length;si++){
          var sg=seawallSegs[si];
          if(distToSeg2D(bx,bz,sg[0],sg[1],sg[2],sg[3])<hr+gap) return false;
        }
        for(var bi2=0;bi2<bollardPts.length;bi2++){
          if(Math.hypot(bx-bollardPts[bi2][0],bz-bollardPts[bi2][1])<hr+gap+.25) return false;
        }
        for(var pi2=0;pi2<pierBoxes.length;pi2++){
          var pb=pierBoxes[pi2], dx=bx-pb.x, dz=bz-pb.z;
          var aL=Math.abs(dx*pb.nx+dz*pb.nz), aW=Math.abs(dx*pb.tx+dz*pb.tz);
          var ox=Math.max(0,aL-pb.halfL), oz=Math.max(0,aW-pb.halfW);
          if(Math.hypot(ox,oz)<hr+gap) return false;
        }
        for(var fi2=0;fi2<ferryObsPts.length;fi2++){
          if(Math.hypot(bx-ferryObsPts[fi2][0],bz-ferryObsPts[fi2][1])<hr+ferryObsPts[fi2][2]+.35) return false;
        }
        for(var hsi=0;hsi<sp.length;hsi++){
          var hAct=sp[hsi]&&sp[hsi].item&&sp[hsi].item.d&&sp[hsi].item.d.regionActivity&&sp[hsi].item.d.regionActivity.id;
          if((hAct==='hotel' || hAct==='subway') && Math.hypot(bx-sp[hsi].x,bz-sp[hsi].z)<9.8) return false;
        }
        if(Math.hypot(bx-(-15.10),bz-6.30)<7.5) return false; // Keep all moored sailboats >= 7.5u clear of Hotel Whale!
        return true;
      }
      // 3 colorful moored sailboats pushed cleanly inward into open basin water (>= 1.5 units clear of seawalls, piers & lampposts!)
      var mooredCount=0, mooredCols=['#e86f68','#3d9ca8','#e3b34c'];
      function tryMooredBoat(bx,bz,rot,minOuter,minCenter){
        if(mooredCount>=3 || !basinBoatClear(bx,bz,1.05,1.52)) return false;
        if(Math.hypot(bx-ferryX,bz-ferryZ)<Math.max(minCenter||3.8,3.9)) return false;
        // Reject boats whose hull/sails would crop at any frame edge (checking activeIdx or pharmacy camera!)
        var inAct=camInFrame(bx,bz,1.5,2.7,-.58,-.86,.88,-.90,.90,activeIdx);
        var inPh=pharmIdx>=0 && camInFrame(bx,bz,1.5,2.7,-.58,-.86,.88,-.90,.90,pharmIdx);
        if(!inAct && !inPh) return false;
        for(var wi=0;wi<waterPlaced.length;wi++){
          if(Math.hypot(bx-waterPlaced[wi][0],bz-waterPlaced[wi][1])<2.9) return false;
        }
        waterPlaced.push([bx,bz]);
        sailboat(bx,bz,rot,mooredCols[mooredCount],'#fff1cf',.70);
        addObstacle(bx,bz,1.50);
        mooredCount++;
        return true;
      }
      // Pack all 3 moored sailboats cleanly into open in-frame basin water well clear of seawall, piers & ferry
      (function packMooredBoats(){
        var cands=[];
        for(var sr=-18;sr<=18;sr+=.75) for(var sf=-16;sf<=18;sf+=.75){
          var x=ferryX+camR[0]*sr+camFw[0]*sf, z=ferryZ+camR[1]*sr+camFw[1]*sf;
          if(Math.hypot(x-ferryX,z-ferryZ)<3.9 || !basinBoatClear(x,z,1.05,1.55)) continue;
          if(!camInFrame(x,z,1.5,2.7,-.58,-.86,.88,-.90,.90,activeIdx) && !(pharmIdx>=0 && camInFrame(x,z,1.5,2.7,-.58,-.86,.88,-.90,.90,pharmIdx))) continue;
          var free=true; for(var wi=0;wi<waterPlaced.length;wi++) if(Math.hypot(x-waterPlaced[wi][0],z-waterPlaced[wi][1])<2.9){ free=false; break; }
          if(free) cands.push([x,z]);
        }
        var orders=[function(a,b){return Math.hypot(a[0]-cx,a[1]-cz)-Math.hypot(b[0]-cx,b[1]-cz);},
          function(a,b){return a[0]-b[0];},function(a,b){return b[0]-a[0];},function(a,b){return a[1]-b[1];},function(a,b){return b[1]-a[1];},
          function(a,b){return Math.hypot(a[0]-ferryX,a[1]-ferryZ)-Math.hypot(b[0]-ferryX,b[1]-ferryZ);}];
        for(var h=1;h<=24;h++) (function(hh){ orders.push(function(a,b){ return Math.sin(a[0]*12.9898*hh+a[1]*78.233)-Math.sin(b[0]*12.9898*hh+b[1]*78.233); }); })(h);
        var best=[];
        for(var oi=0;oi<orders.length && best.length<3;oi++){
          var pick=[]; cands.slice().sort(orders[oi]).forEach(function(c){
            if(pick.length<3 && pick.every(function(p){ return Math.hypot(p[0]-c[0],p[1]-c[1])>=3.0; })) pick.push(c);
          });
          if(pick.length>best.length) best=pick;
        }
        best.forEach(function(p,k){ tryMooredBoat(p[0],p[1],.35+k*.5,5.6,3.9); });
      })();
      for(var mb=0;mb<Math.min(5,main.length) && mooredCount<3;mb++){
        var mbs=main[mb], mbf=frame(mbs);
        [7.2,8.4,9.6].forEach(function(bDist){
          if(mooredCount>=3) return;
          [0,1.7,-1.7].forEach(function(bDz){
            if(mooredCount>=3) return;
            placed(mbs,-1,bDist,bDz,function(bx,by,bz){
              tryMooredBoat(bx,bz,Math.atan2(mbf.tx,mbf.tz)+mooredCount*.4,5.8,4.2);
            });
          });
        });
      }
      // Camera-space fallback ring around the ferry so all 3 boats land cleanly in open basin water
      if(mooredCount<3){
        var camF=camFw, scan=[];
        for(var sr=-16;sr<=16;sr+=1) for(var sf=-14;sf<=16;sf+=1) scan.push([sr,sf,Math.hypot(sr,sf)]);
        scan.sort(function(a,b){ return a[2]-b[2]; });
        scan.forEach(function(o){
          if(mooredCount>=3 || o[2]<4.2) return;
          tryMooredBoat(ferryX+camR[0]*o[0]+camF[0]*o[1],ferryZ+camR[1]*o[0]+camF[1]*o[1],0.35+mooredCount*0.4,5.8,4.2);
        });
      }
      [[cx-4.8,cz+4.2,.6,'#c66f56'],[cx+5.2,cz-3.8,-1.1,'#4c8391'],[cx+Math.cos(6*Math.PI*2/bwCount)*bwR,cz+Math.sin(6*Math.PI*2/bwCount)*bwR,.3,'#588c99']].forEach(function(sb,sbi){
        var okExtra=sbi<2 ? (basinBoatClear(sb[0],sb[1],1.7,1.6) && waterClear(sb[0],sb[1],4.2)) : waterClear(sb[0],sb[1],4.8);
        if(okExtra && camInFrame(sb[0],sb[1],2.2,3.6,-.58,-.84,.94,-.90,.92)){ waterPlaced.push([sb[0],sb[1]]); sailboat(sb[0],sb[1],sb[2],sb[3],'#fff1cf',.90); addObstacle(sb[0],sb[1],1.8); }
      });
      [[cx-7.5,cz-1.5,'#d85652'],[cx+7.2,cz+2.4,'#f0ede2'],[cx+Math.cos(5.3*Math.PI*2/bwCount)*bwR,cz+Math.sin(5.3*Math.PI*2/bwCount)*bwR,'#d85652']].forEach(function(by){
        if(waterClear(by[0],by[1],4.5) && Math.hypot(by[0]-(-15.10),by[1]-6.30)>6.5){ waterPlaced.push([by[0],by[1]]); buoy(by[0],by[1],by[2]); }
      });
    }
    function lagoon(){
      function hashLagId(str){
        if(typeof reefHash==='function') return reefHash(str);
        var h=7; str=String(str); for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return h;
      }
      function halfArch(r,t){ var k=['lagArch',r,t].join(':'); return geos[k]||(geos[k]=own(new T.TorusGeometry(r,t,8,18,Math.PI))); }
      // iter31 MIN 9: High-segment smooth botanical lily pads (24 rounded perimeter segments, crisp V-notch sinus,
      // gently upturned rolled rim & radial leaf-vein shading) + sculpted curved multi-segment cupped lotus petals!
      function lotusPadGeo(){
        var k='lilyPad24', g=geos[k]; if(g) return g;
        var n=24, notchHalf=0.24, span=Math.PI*2-notchHalf*2;
        var p=[], c=[], idx=[];
        // Center stem dimple (vertex 0 top, vertex 1 bottom for notch end-wall closure)
        p.push(0,0.036,0); c.push(0.84,0.86,0.82);
        p.push(0,0.000,0); c.push(0.74,0.78,0.74);
        // 5 concentric rings across blade, upturned rolled botanical rim, and rounded outer lip
        var rings=[
          { r:0.44, y:0.056, sh:0.91, vein:0.045 },
          { r:0.87, y:0.072, sh:0.97, vein:0.055 },
          { r:0.99, y:0.106, sh:1.06, vein:0.035 },
          { r:1.02, y:0.068, sh:0.93, vein:0.020 },
          { r:0.96, y:0.000, sh:0.78, vein:0.000 }
        ];
        var stride=n+1;
        for(var ri=0;ri<rings.length;ri++){
          var rg=rings[ri];
          for(var i=0;i<=n;i++){
            var u=i/n, ang=notchHalf+u*span;
            var wob=1+0.026*Math.sin(ang*5)+0.015*Math.cos(ang*3);
            var rr=rg.r*(ri>=1?wob:1);
            var yy=rg.y+(ri===2?0.008*Math.sin(ang*5):0);
            p.push(Math.cos(ang)*rr, yy, Math.sin(ang)*rr);
            var vn=rg.vein*Math.cos(ang*12);
            var sh=rg.sh+vn;
            c.push(sh*0.97, sh*1.02, sh*0.96);
          }
        }
        // Center fan (top +Y CCW: (center, i+1, i))
        var r0Base=2;
        for(var i=0;i<n;i++){
          idx.push(0, r0Base+i+1, r0Base+i);
        }
        // Concentric rings (top +Y and rolled outer lip +radially outward!)
        for(var ri=0;ri<rings.length-1;ri++){
          var b0=2+ri*stride, b1=2+(ri+1)*stride;
          for(var i=0;i<n;i++){
            idx.push(b0+i, b0+i+1, b1+i+1, b0+i, b1+i+1, b1+i);
          }
        }
        // Close the 2 botanical V-notch sinus walls cleanly so the leaf notch has crisp 3D thickness
        var rLastBase=2+(rings.length-1)*stride;
        for(var ri=0;ri<rings.length-1;ri++){
          var l0=2+ri*stride, l1=2+(ri+1)*stride;
          var e0=l0+n, e1=l1+n;
          // Left notch wall (i=0) & Right notch wall (i=n) stitched to bottom center (1)
          idx.push(1, l0, l1);
          idx.push(1, e1, e0);
        }
        idx.push(0, 2, 1, 0, 1, 2+n);
        idx.push(1, rLastBase, rLastBase+n);
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g; return g;
      }
      function lotusPetalGeo(){
        var k='lotusPetal3x5', g=geos[k]; if(g) return g;
        // Sculpted curved spoon-cupped lotus petal (3 across x 5 along, solid front+back shell — smooth silhouette, 3.5x lighter!)
        var nU=3, nV=5, p=[], c=[], idx=[];
        var stride=(nU+1)*(nV+1);
        for(var side=0;side<2;side++){
          var sgn=side?-1:1;
          for(var iv=0;iv<=nV;iv++){
            var v=iv/nV;
            var hw=(v>=0.999) ? 0.004 : (0.048+0.215*Math.pow(Math.sin(Math.pow(v,0.78)*Math.PI),0.72));
            var yBase=0.68*Math.sin(v*Math.PI*0.54)+0.08*v;
            var zBase=0.30*Math.pow(v,1.42)+0.075*Math.max(0,v-0.62)*2.6;
            var cupAmp=0.105*Math.sin(v*Math.PI);
            var halfT=Math.max(0.022, 0.032*(1-0.30*v));
            var baseLum=1.05-0.11*v;
            for(var iu=0;iu<=nU;iu++){
              var u=(iu/nU)*2-1;
              var px=u*hw;
              var cup=(1-u*u)*cupAmp;
              var py=yBase-cup*0.26+(side?0.002:-0.002);
              var pz=zBase+cup+sgn*halfT*(0.55+0.45*(1-u*u));
              p.push(px,py,pz);
              var edgeHi=0.04*(u*u);
              var sh=baseLum+edgeHi+(side?0.04:-0.04);
              c.push(sh, sh*(1-0.04*v), sh*(1-0.02*v));
            }
          }
        }
        for(var iv2=0;iv2<nV;iv2++) for(var iu2=0;iu2<nU;iu2++){
          var a=iv2*(nU+1)+iu2, b=a+1, cc=a+(nU+1), d=cc+1;
          idx.push(a,b,d, a,d,cc);
          var a2=stride+a, b2=stride+b, c2=stride+cc, d2=stride+d;
          idx.push(a2,c2,d2, a2,d2,b2);
        }
        for(var iv3=0;iv3<nV;iv3++){
          var l0=iv3*(nU+1), l1=l0+(nU+1), bl0=stride+l0, bl1=stride+l1;
          idx.push(l0,l1,bl1, l0,bl1,bl0);
          var r0=l0+nU, r1=l1+nU, br0=stride+r0, br1=stride+r1;
          idx.push(r0,br0,br1, r0,br1,r1);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g; return g;
      }
      function sculptedLotusBlossom(x,y,z,scale,outerCol,innerCol,seed){
        var k=scale||1, oCol=outerCol||'#f89ec0', iCol=innerCol||'#ffe6ee', a0=(seed||0)*0.7;
        emitCached('lotusBlossom:' + oCol + ':' + iCol, x, y, z, a0, k, function(){
          var pGeo=lotusPetalGeo();
          function placePetal(ang,tilt,scW,scH,col,yOff,rOff){
            var pet=add(pGeo,col,Math.cos(ang)*(rOff||0),yOff||0,Math.sin(ang)*(rOff||0),0,0,0,false);
            pet.rotation.order='YXZ';
            pet.rotation.y=Math.PI*0.5-ang;
            pet.rotation.x=tilt;
            pet.scale.set(scW,scH,scH);
            return pet;
          }
          for(var s0=0;s0<5;s0++) placePetal(s0*Math.PI*2/5+0.2, 0.94, 0.56, 0.52, '#3d9868', -0.01, 0.06);
          for(var p1=0;p1<6;p1++) placePetal(p1*Math.PI*2/6, 0.64, 0.92, 0.80, oCol, 0.04, 0.08);
          for(var p2=0;p2<6;p2++) placePetal((p2+0.5)*Math.PI*2/6, 0.36, 0.72, 0.64, iCol, 0.11, 0.05);
          for(var p3=0;p3<4;p3++) placePetal(p3*Math.PI*2/4+0.4, 0.14, 0.54, 0.50, '#fff7e8', 0.16, 0.03);
          var rec=smoothOrb(0.155,'#f7cf54',0,0.23,0,false); rec.scale.set(1.08,0.68,1.08);
          for(var st=0;st<5;st++){
            var sa=st*Math.PI*2/5;
            orb(0.042,'#fff0a6',Math.cos(sa)*0.14,0.26,Math.sin(sa)*0.14,false);
          }
        });
      }
      var lagPadCols=['#4ca97c','#56b584','#429e72'];
      var lagLotusPositions=[], lagReedPositions=[], lagBookPositions=[];
      function lotusPad(x,z,scale,hasBlossom){
        if(lagReedPositions.some(function(r){ return Math.hypot(r.x-x,r.z-z)<1.8; })) return;
        if(lagBookPositions.some(function(b){ return Math.hypot(b[0]-x,b[1]-z)<2.6; })) return;
        lagLotusPositions.push({x:x,z:z});
        var k=scale||1, y=-.56, pSeed=Math.abs(Math.floor(x*3.7+z*2.3));
        var pad=add(lotusPadGeo(),lagPadCols[pSeed%3],x,y,z,0,(x+z)*.6,0,false);
        pad.scale.setScalar(1.22*k); pad.userData.reefGround=true;
        if(hasBlossom){
          var oCol=(pSeed%3===0)?'#f799bc':((pSeed%3===1)?'#ffad96':'#f5a4d0');
          var iCol=(pSeed%2===0)?'#ffe8ef':'#fff1da';
          sculptedLotusBlossom(x,y+0.07*k,z,0.92*k,oCol,iCol,pSeed);
        }
      }
      // MAJ-4: Replace untextured hollow pastel tube-coral cylinders with sculpted flowering lotus
      // & glowing paper-lantern reed nests (broad layered lily pads, multi-petal lotus blooms,
      // curved emerald cattail reeds, warm miniature stone/paper lantern — ZERO hollow cylinders!).
      function buildLagoonLotusLanternNest(s,ox,oy,oz){
        var g=new T.Group(); g.position.set(ox,oy,oz);
        var seed=Math.abs(Math.floor(ox*3.7+oz*2.9+s.i*5));
        function nPart(geo,col,px,py,pz,rx,ry,rz,kind){
          var o=mesh(geo,M(col,geo.attributes.color?{vertexColors:true}:undefined),px,py,pz);
          if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
          if(kind) finish(o,kind);
          g.add(o); return o;
        }
        function nLimb(x0,y0,z0,dx,dy,dz,len,r0,r1,col){
          limbDir.set(dx,dy,dz).normalize();
          var ex=x0+limbDir.x*len, ey=y0+limbDir.y*len, ez=z0+limbDir.z*len;
          var o=mesh(cyl(r1,r0,len,7),M(col),(x0+ex)/2,(y0+ey)/2,(z0+ez)/2);
          o.quaternion.setFromUnitVectors(limbUp,limbDir);
          g.add(o); return [ex,ey,ez];
        }
        // Soft mossy smooth river-stone anchor pad + 3 broad layered botanical lily pads
        var stoneBase=nPart(ball(.56,12,8),'#6c8e7d',0,.05,0,0,seed*.4,0,'stone');
        stoneBase.scale.set(1.22,.22,1.14);
        var pGeo=lotusPadGeo(), petGeo=lotusPetalGeo();
        [
          {x:-.26, y:.08, z:-.14, sc:.62, rot:seed*.7+0.3, col:'#3d966a'},
          {x:.28,  y:.09, z:.16,  sc:.54, rot:seed*.7+2.2, col:'#4cae78'},
          {x:-.04, y:.07, z:.30,  sc:.48, rot:seed*.7+4.1, col:'#5ec184'}
        ].forEach(function(pd){
          var pm=nPart(pGeo,pd.col,pd.x,pd.y,pd.z,0,pd.rot,0,false);
          pm.scale.setScalar(pd.sc);
        });
        // Two multi-petal cupped lotus blossoms (outer blush-pink/peach + inner ivory + golden stamen crown)
        function nestLotus(lx,ly,lz,sc,outerCol,innerCol){
          for(var oi=0;oi<6;oi++){
            var oa=oi*Math.PI*2/6+seed*.3;
            var op=nPart(petGeo,outerCol,lx+Math.cos(oa)*.07*sc,ly+.01*sc,lz+Math.sin(oa)*.07*sc,0,0,0,false);
            op.rotation.order='YXZ'; op.rotation.y=Math.PI*.5-oa; op.rotation.x=.78; op.scale.set(.68*sc,.62*sc,.64*sc);
          }
          for(var ii=0;ii<5;ii++){
            var ia=(ii+.5)*Math.PI*2/5+seed*.3;
            var ip=nPart(petGeo,innerCol,lx+Math.cos(ia)*.045*sc,ly+.035*sc,lz+Math.sin(ia)*.045*sc,0,0,0,false);
            ip.rotation.order='YXZ'; ip.rotation.y=Math.PI*.5-ia; ip.rotation.x=.42; ip.scale.set(.50*sc,.52*sc,.52*sc);
          }
          var stm=nPart(ball(.085*sc,10,7),'#ffdc5e',lx,ly+.07*sc,lz,0,0,0,false); stm.scale.set(1.1,.72,1.1);
        }
        var oCol1=(seed%2===0)?'#f790b6':'#ffa888', oCol2=(seed%2===0)?'#ffae92':'#f694c2';
        nestLotus(-.26,.11,-.14,.86,oCol1,'#fff0f4');
        nestLotus(-.04,.10,.30,.64,oCol2,'#fff5df');
        // 4 gracefully curved emerald cattail reeds arching outward with velvety cinnamon heads & reed blades
        [
          {x:-.12, z:-.26, ang:2.4,  h:1.08, bend:.36},
          {x:-.34, z:.08,  ang:3.3,  h:.92,  bend:.40},
          {x:.10,  z:-.30, ang:1.3,  h:.98,  bend:.34},
          {x:.38,  z:-.12, ang:0.4,  h:.84,  bend:.38}
        ].forEach(function(rd,ri){
          var rx=rd.x, ry=.08, rz=rd.z, bx=Math.cos(rd.ang), bz=Math.sin(rd.ang), seg=rd.h/3;
          var tilts=[.08, rd.bend*.65, rd.bend], rads=[.034,.026,.020,.014];
          for(var q=0;q<3;q++){
            var e=nLimb(rx,ry,rz,bx*tilts[q],1,bz*tilts[q],seg,rads[q],rads[q+1],q?'#4ca86c':'#358458');
            rx=e[0]; ry=e[1]; rz=e[2];
          }
          // Velvety rounded cinnamon cattail plume + fine tip
          var hTip=nLimb(rx,ry-.02,rz,bx*rd.bend,1,bz*rd.bend,.22,.048,.052,'#9c6b3d');
          nPart(ball(.048,8,6),'#875830',hTip[0],hTip[1],hTip[2],0,0,0,false);
          nPart(ball(.050,8,6),'#9c6b3d',rx,ry-.02,rz,0,0,0,false);
          nLimb(hTip[0],hTip[1],hTip[2],bx*rd.bend,1,bz*rd.bend,.09,.012,.005,'#6a4a2a');
          // Arching emerald ribbon leaf blade beside reed base
          var lfA=rd.ang+(ri%2?.55:-.55);
          nLimb(rd.x, .09, rd.z, Math.cos(lfA)*.75, .95, Math.sin(lfA)*.75, .44, .034, .008, ri%2?'#5cc076':'#3e9962');
        });
        // Warm miniature stone & glowing rice-paper pagoda lantern nestled cleanly on the right lily pad
        var lxL=.28, lzL=.16;
        nPart(cyl(.19,.24,.12,10),'#7d9184',lxL,.16,lzL,0,0,0,'stone');
        nPart(cyl(.14,.17,.14,10),'#97a898',lxL,.27,lzL,0,0,0,'stone');
        // Glowing warm rice-paper lantern chamber + dark-timber vertical mullions + golden inner flame
        nPart(cyl(.15,.13,.26,6),'#fff2ba',lxL,.47,lzL,0,seed*.4,0,false);
        for(var lr=0;lr<3;lr++){
          var la=lr*Math.PI*2/3+seed*.4;
          nPart(cyl(.014,.014,.28,5),'#5a4232',lxL+Math.cos(la)*.145,.47,lzL+Math.sin(la)*.145,0,0,0,'timber');
        }
        // Sculpted curved pagoda roof cap + gleaming gold finial orb
        nPart(cyl(.28,.26,.045,6),'#4a7c7a',lxL,.61,lzL,0,seed*.4,0,'roof');
        nPart(cone(.26,.15,6),'#3a6a6c',lxL,.70,lzL,0,seed*.4,0,'roof');
        nPart(ball(.055,8,6),'#f5cf68',lxL,.79,lzL,0,0,0,false);
        if(typeof reef3dBakeObject==='function' && view.rig && view.bake) reef3dBakeObject(g,view.rig,view.bake);
        if(typeof reef3dCompact==='function') reef3dCompact(g);
        g.traverse(function(c){ c.userData.space=s.i; });
        g.userData.space=s.i;
        return g;
      }
      var lagoonPropSet=['story','clam','sponge','star','fan'];
      if(view.scene && view.hitables){
        sp.forEach(function(s){
          if(!s.obj || !s.obj.position) return;
          var pKind=s.kind==='deck' && s.item && s.item.d ? lagoonPropSet[hashLagId(s.item.d.id)%lagoonPropSet.length] : s.kind;
          var ox=s.obj.position.x, oy=s.obj.position.y, oz=s.obj.position.z;
          if(pKind==='sponge'){
            var old=s.obj;
            view.scene.remove(old);
            var hIdx=view.hitables.indexOf(old); if(hIdx>=0) view.hitables.splice(hIdx,1);
            var nest=buildLagoonLotusLanternNest(s,ox,oy,oz);
            view.scene.add(nest); view.hitables.push(nest); s.obj=nest;
            lagLotusPositions.push({x:ox,z:oz});
            addObstacle(ox,oz,.95);
          }else if(pKind==='star'){
            // MIN-4: Replace flat untextured star extrusion with a sculpted 3D domed 5-arm starfish + central pearl boss on a lily pad
            var oldStar=s.obj;
            view.scene.remove(oldStar);
            var hsIdx=view.hitables.indexOf(oldStar); if(hsIdx>=0) view.hitables.splice(hsIdx,1);
            var stGrp=new T.Group();
            stGrp.position.set(ox,oy,oz);
            stGrp.rotation.y=(s.i*1.17)%6.28;
            var stPad=mesh(lotusPadGeo(),M('#48a678'),0,-.02,0);
            stPad.scale.setScalar(0.82); stPad.userData.reefGround=true; stGrp.add(stPad);
            var stCol='#f07e52', stTipCol='#f7a474';
            var stDom=mesh(ball(.18,12,8),M(stCol),0,.08,0);
            stDom.scale.set(1.05,.52,1.05); stGrp.add(finish(stDom,'coral'));
            for(var saI=0;saI<5;saI++){
              var saA=saI*Math.PI*2/5;
              var arm=mesh(cone(.135,.46,10),M(saI%2?stCol:stTipCol),Math.cos(saA)*.21,.065,Math.sin(saA)*.21);
              arm.rotation.set(-Math.sin(saA)*1.38,0,Math.cos(saA)*1.38);
              arm.scale.set(1.05,1.0,0.68);
              stGrp.add(finish(arm,'coral'));
              var tip=mesh(ball(.046,8,6),M('#f9be92'),Math.cos(saA)*.42,.038,Math.sin(saA)*.42);
              stGrp.add(finish(tip,'coral'));
            }
            var pearlBoss=mesh(ball(.078,10,8),M('#fff5de'),0,.145,0);
            stGrp.add(pearlBoss);
            if(typeof reef3dCompact==='function') reef3dCompact(stGrp);
            stGrp.traverse(function(c){ c.userData.space=s.i; });
            stGrp.userData.space=s.i;
            view.scene.add(stGrp); view.hitables.push(stGrp); s.obj=stGrp;
            addObstacle(ox,oz,.85);
          }else if(pKind==='story'){
            // Ground floating story bottle on a cozy scalloped lily-pad nest so it never floats isolated in open water
            foamRing(ox,-.59,oz,.85);
            lotusPad(ox,oz,.88,false);
            addObstacle(ox,oz,.85);
          }else{
            addObstacle(ox,oz,.85);
          }
        });
      }
      // Build smooth wooden lagoon docks FIRST and track their oriented footprints so NO cattail reeds ever pierce a dock!
      var lagoonDocks=[];
      function nearLagoonDock(x,z,pad){
        var p=pad||1.75;
        for(var di=0;di<lagoonDocks.length;di++){
          var d=lagoonDocks[di], dx=x-d.x, dz=z-d.z;
          var aL=Math.abs(dx*d.nx+dz*d.nz), aW=Math.abs(dx*d.tx+dz*d.tz);
          if(aL<d.halfL+p && aW<d.halfW+p) return true;
        }
        return false;
      }
      // iter20 Minor #8: Crisp scalloped white water-contact foam collar + outer ripple ring around each lagoon dock piling.
      function pilingFoamCollarGeo(){
        var k='lagPilingFoam24', g=geos[k]; if(g) return g;
        var p=[], c=[], idx=[], n=24;
        for(var i=0;i<n;i++){
          var a=i*Math.PI*2/n;
          var sc1=1+.08*Math.sin(a*5)+.045*Math.cos(a*3);
          var sc2=1+.10*Math.sin(a*5+.5)+.05*Math.cos(a*4-.3);
          var r0=.072, r1=.225*sc1, r2=.355*sc2;
          p.push(Math.cos(a)*r0,.026,Math.sin(a)*r0);
          p.push(Math.cos(a)*r1,.016,Math.sin(a)*r1);
          p.push(Math.cos(a)*r2,.004,Math.sin(a)*r2);
          c.push(.98,1.0,1.0, .95,1.0,1.0, .72,.96,.95);
        }
        for(var i=0;i<n;i++){
          var a=i*3, b=((i+1)%n)*3;
          idx.push(a,b+1,a+1, a,b,b+1, a+1,b+2,a+2, a+1,b+1,b+2);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g; return g;
      }
      function pilingRippleRingGeo(){
        var k='lagPilingRipple24', g=geos[k]; if(g) return g;
        var p=[], c=[], idx=[], n=24;
        for(var i=0;i<n;i++){
          var a=i*Math.PI*2/n;
          var wave=1+.07*Math.sin(a*4+.7)+.04*Math.cos(a*6-.3);
          var rIn=.405*wave, rOut=.525*wave;
          p.push(Math.cos(a)*rIn,.012,Math.sin(a)*rIn);
          p.push(Math.cos(a)*rOut,.002,Math.sin(a)*rOut);
          var pulse=.92+.06*Math.sin(a*3+1.0);
          c.push(.90*pulse,.99*pulse,.99*pulse, .62,.93,.91);
        }
        for(var i=0;i<n;i++){
          var a=i*2, b=((i+1)%n)*2;
          idx.push(a,b+1,a+1, a,b,b+1);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g; return g;
      }
      for(var br=1;br<main.length;br+=6){
        var bs=main[br], bf=frame(bs), bsd=br%2?-1:1;
        placed(bs,bsd,5.8,0,function(bx,by,bz){
          if(!outerClear(bx,bz,4.4)) return;
          lagoonDocks.push({x:bx,z:bz,nx:bf.nx,nz:bf.nz,tx:bf.tx,tz:bf.tz,halfL:2.15,halfW:.72});
          addObstacle(bx,bz,1.55);
          var g0=root.children.length, dRot=Math.atan2(bf.nx,bf.nz);
          var pilBot=waterY-.72, pilTop=.26, pilH=pilTop-pilBot;
          // Smooth flush wooden dock deck + twin timber side stringers + 6 deep-set mooring pilings (y < waterY - 0.5) + water-contact foam collars + coiled rope
          [-.56,.56].forEach(function(sx){
            block(.14,.16,4.15,'#75533a',bx+sx,-.16,bz,0,'timber');
            [-1.85,0,1.85].forEach(function(sz,pi){
              post(.090,pilH,'#664731',bx+sx,pilBot,bz+sz);
              // Damp dark-timber splash band right around the waterline
              add(cyl(.093,.098,.20,10),'#473020',bx+sx,waterY+.06,bz+sz,0,0,0,'timber');
              add(cyl(.10,.10,.05,10),'#d8be88',bx+sx,.28,bz+sz,0,0,0,false);
              // Crisp white foam water-contact collar + concentric ripple ring seated cleanly above max wave crest
              var fc=add(pilingFoamCollarGeo(),'#ffffff',bx+sx,waterY+.064,bz+sz,0,(pi+1)*.9+sx,0,false);
              fc.userData.reefGround=true;
              var fr=add(pilingRippleRingGeo(),'#ffffff',bx+sx,waterY+.058,bz+sz,0,(pi+2)*1.3-sx,0,false);
              fr.userData.reefGround=true;
            });
          });
          for(var st=-2;st<=2;st++){
            block(1.36,.10,.76,st%2?'#9d754f':'#a88058',bx,-.06,bz+st*.80,0,'timber');
          }
          var dGrpG0=g0;
          ropeCoil(bx+.26,.02,bz+1.35);
          compactRootRange(dGrpG0, bx, -.06, bz, dRot);
        });
      }
      // M7 assist (synced with iter15-people-sync #159): protect Mira (-8.60,-14.70), Bok (-16.65,-7.85),
      // Reed Stall (-17.50,-10.25), and their full camera sightlines from ALL cattail reeds so faces are 100% unobstructed.
      var lagCastTargets=[
        {x:-8.60,  z:-14.70, r:3.65, rayW:2.65}, // Mira (marker) at=5 open clearing
        {x:-16.65, z:-7.85,  r:3.85, rayW:2.75}, // Bok (actor) legacy guard
        {x:-20.80, z:-8.40,  r:3.45, rayW:2.45}, // Bok (actor) Iter 28 open turquoise water spot
        {x:-17.50, z:-10.25, r:3.35, rayW:2.30}, // Bok's Reed Stall
        {x:1.73,   z:-5.17,  r:3.25, rayW:2.20}  // Mira fallback at=0
      ];
      var lagSightCams=[camSetupAt(Math.min(5,main.length-1)).cam.position, camSetup().cam.position];
      var lagCam0Pos=camSetupAt(0).cam.position, lagRealCam0Pos=realCamSetupAt(0).cam.position;
      function clearOfLagoonCast(x,z,includeRays){
        for(var ci=0;ci<lagCastTargets.length;ci++){
          var tg=lagCastTargets[ci];
          if(Math.hypot(x-tg.x,z-tg.z)<tg.r) return false;
          if(!includeRays) continue;
          for(var ki=0;ki<lagSightCams.length;ki++){
            var cp=lagSightCams[ki], vx=tg.x-cp.x, vz=tg.z-cp.z, len2=vx*vx+vz*vz;
            if(len2<1) continue;
            var t=((x-cp.x)*vx+(z-cp.z)*vz)/len2;
            if(t>.14 && t<1.14){
              var px2=cp.x+vx*t, pz2=cp.z+vz*t;
              if(Math.hypot(x-px2,z-pz2)<tg.rayW) return false;
            }
          }
        }
        return true;
      }
      // I10-10 + M7: curved, tapered three-segment bulrush stalks with rounded brown heads (cached composite -> 1 mesh instead of 35!)
      function reeds(x,y,z){
        if(!outerClear(x,z,3.0) || nearLagoonDock(x,z,1.85) || !clearOfLagoonCast(x,z,true)) return;
        if(Math.hypot(x-lagCam0Pos.x,z-lagCam0Pos.z)<13.5 || Math.hypot(x-lagRealCam0Pos.x,z-lagRealCam0Pos.z)<13.5) return;
        if(lagBookPositions.some(function(b){ return Math.hypot(b[0]-x,b[1]-z)<3.8; })) return;
        if(lagLotusPositions.some(function(l){ return Math.hypot(l.x-x,l.z-z)<1.8; })) return;
        lagReedPositions.push({x:x,z:z});
        addObstacle(x,z,.75);
        var variant=Math.abs(Math.floor(x*3+z*2))%3, yaw=((x*1.3+z*.9)%(Math.PI*2));
        emitCached('lagoonReeds:' + variant, x, y, z, yaw, 1, function(){
          for(var j=0;j<5;j++){
            var dx=(j-2)*.25, h=1.7+((j+variant)%3)*.37, seg=h/3, bend=(j*1.7+variant*1.1)%(Math.PI*2), bx=Math.cos(bend), bz=Math.sin(bend),
                px=dx, pz=(j%2)*.18, py=0, tilts=[.08,.2,.34], radii=[.05,.04,.03,.022];
            for(var q=0;q<3;q++){
              var e=limb(px,py,pz,bx*tilts[q],1,bz*tilts[q],seg,radii[q],radii[q+1],q?'#4a9a78':'#3b8466',false);
              px=e[0]; py=e[1]; pz=e[2];
            }
            var hx=bx*.34, hz=bz*.34, head=limb(px,py-.04,pz,hx,1,hz,.34,.075,.085,'#ac8251',false);
            var cap=orb(.075,'#8e6538',head[0],head[1],head[2],false); cap.scale.set(1,.8,1);
            var base=orb(.082,'#ac8251',px,py-.04,pz,false); base.scale.set(1,.7,1);
            limb(head[0],head[1],head[2],hx,1,hz,.12,.018,.008,'#6c4f33',false);
          }
        });
      }
      // Track EVERY Lagoon sandbar, islet, cliff & shore mass so origami paper boats stay >= 1.8u clear on open turquoise water!
      var lagLandMasses=[];
      function addLagLand(x,z,r){ lagLandMasses.push({x:x,z:z,r:r}); }
      main.forEach(function(s,i){ if(i%3!==0) return; var sd=pathSide(s,i);
        placed(s,sd,4.4,0,function(x,y,z){
          if(!outerClear(x,z,3.7) || nearLagoonDock(x,z,1.85)) return;
          addLagLand(x,z,1.75);
          organicRock(x,y-.04,z,1.35,.24,1.2,'#8cb9a4');
          organicRock(x+.35,y+.15,z+.35,.91,.18,.83,'#e4d7a8','sand');
          if(i%2===0) lagLotusPositions.push({x:x+.45,z:z-.3});
          reeds(x-1.3,y,z-.5);
          seaGrass(x+.8,y+.12,z-.6,.75,'#52957f');
          pebble(x-.6,y+.1,z+.8,.3,'#f0d8a8');
          if(i%2===0){ orb(.34,'#f9a8c4',x+.45,y+.48,z-.3); orb(.18,'#ffe4b3',x+.55,y+.78,z-.28); }
        });
        placed(s,-sd,5.4,1,function(x,y,z){ reeds(x,y,z); reeds(x+1,y,z+.6); });
      });
      for(var lp=2;lp<main.length;lp+=5){ var ls=main[lp], d=pathSide(ls,lp);
        placed(ls,d,7.6,-1.3,function(x,y,z){
          if(!outerClear(x,z,4.2)) return;
          addLagLand(x,z,2.45);
          organicRock(x,y-.07,z,2.2,.3,1.9,'#c2cda9');
          organicRock(x,y+.22,z,1.48,.13,1.35,'#f2dbb4','sand');
          coral(x+.6,y+.36,z-.25,.8,'#e38b91');
          seaGrass(x-.8,y+.33,z+.45,1.1,'#3f997f');
        });
      }
      // Storybook arch gates: tangent-aligned moss-wrapped posts, a half-torus arch, hanging book banners and warm lanterns.
      function bookBanner(x,y,z,rot,col,spine){
        var g0=root.children.length;
        add(cyl(.012,.012,.34,5),'#d6b878',x,y+.17,z,0,0,0,false);
        block(.52,.7,.07,col,x,y-.35,z,0,'fabric');
        block(.07,.7,.1,spine,x-.26,y-.35,z,0,'timber');
        block(.4,.5,.09,'#fff1d0',x+.02,y-.36,z,0,false);
        block(.28,.04,.1,spine,x+.02,y-.25,z,0,false); block(.22,.04,.1,spine,x+.02,y-.36,z,0,false);
        orb(.05,'#ffd56b',x+.02,y-.62,z,false);
        if(rot){ var grp=new T.Group(), org=new T.Vector3(x,y,z); root.children.slice(g0).forEach(function(p){ p.position.sub(org); grp.add(p); }); grp.position.copy(org); grp.rotation.y=rot; root.add(grp); }
      }
      function hangLantern(x,y,z){
        add(cyl(.012,.012,.3,5),'#d6b878',x,y+.15,z,0,0,0,false);
        add(cyl(.17,.13,.28,6),'#ffd58c',x,y-.14,z,0,0,0,false);
        add(cone(.2,.14,6),'#a9573f',x,y+.02,z,0,0,0,'roof');
        orb(.1,'#fff0b8',x,y-.14,z,false);
      }
      function storyGate(x,y,z,f){
        var g0=curRoot.children.length;
        var gAng=Math.atan2(-f.tz,f.tx), th=2.35;
        [-1,1].forEach(function(sd){
          var px=x+f.tx*sd*1.4, pz=z+f.tz*sd*1.4;
          post(.17,th,'#7a604d',px,y,pz);
          add(cyl(.27,.3,.16,8),'#9aa58f',px,y+.05,pz,0,0,0,'stone');
          for(var m=0;m<5;m++){ var ma=m*2.1+sd; orb(.1+(m%2)*.04,m%2?'#6dae72':'#85c27e',px+Math.cos(ma)*.19,y+.3+m*.42,pz+Math.sin(ma)*.19); }
        });
        add(halfArch(1.4,.14),'#8b6a4d',x,y+th,z,0,gAng,0,'timber');
        for(var v=0;v<6;v++){ var va=(v+.5)/6*Math.PI; orb(.11+(v%2)*.03,v%2?'#f6a9c1':'#7fc27e',x+f.tx*Math.cos(va)*1.4,y+th+Math.sin(va)*1.4+.08,z+f.tz*Math.cos(va)*1.4); }
        var crownY=y+th+1.4;
        bookBanner(x-f.tx*.52,crownY-.12,z-f.tz*.52,gAng,'#d9776a','#8f4638');
        bookBanner(x+f.tx*.52,crownY-.12,z+f.tz*.52,gAng,'#5ea9b0','#2f6b72');
        hangLantern(x-f.tx*1.0,y+th+Math.sqrt(1.4*1.4-1.0)-.05,z-f.tz*1.0);
        hangLantern(x+f.tx*1.0,y+th+Math.sqrt(1.4*1.4-1.0)-.05,z+f.tz*1.0);
        compactRootRange(g0, x, y, z, 0);
      }
      for(var k=4;k<main.length;k+=8){
        var gs=main[k], gf=frame(gs);
        placed(gs,-pathSide(gs,k),6,0,function(x,y,z){
          if(!outerClear(x,z,3.6)) return;
          if(Math.hypot(x-lagCam0Pos.x,z-lagCam0Pos.z)<19.0 || Math.hypot(x-lagRealCam0Pos.x,z-lagRealCam0Pos.z)<19.0) return;
          var gNd0=camNDC(x,y+1.2,z), gNdR=realCamNDCAt(0,x,y+1.2,z);
          if((gNd0.z<1 && gNd0.x>0.55 && gNd0.y<-0.05) || (gNdR.z<1 && gNdR.x>0.55 && gNdR.y<-0.05)) return;
          storyGate(x,y,z,gf);
          addObstacle(x,z,1.65);
        });
      }
      // Scalloped fabric canopy (8 petal panels + a scalloped hem) replaces the old plain cone.
      function scallopCanopy(x,y,z,r,hgt,c1,c2){
        for(var w=0;w<8;w++){
          var wa=w*Math.PI/4, wedge=add(cyl(.08,r*.95,hgt*.78,4),w%2?c2:c1,x,y+hgt*.45,z,0,wa+Math.PI/4,0,'fabric');
          wedge.scale.set(.74,1,.74);
          var hem=orb(r*.3,w%2?c2:c1,x+Math.cos(wa+Math.PI/8)*r*.82,y+hgt*.1,z+Math.sin(wa+Math.PI/8)*r*.82,'fabric'); hem.scale.set(1.15,.5,1.15);
        }
        orb(.16,'#f7d97e',x,y+hgt*.88,z,false);
        add(cyl(.04,.05,.3,6),'#a77e56',x,y+hgt*.98,z,0,0,0,'timber');
      }
      function openBook(x,y,z,rot){
        block(.5,.06,.36,'#c46a5a',x,y,z,rot,'timber');
        var l=block(.22,.04,.32,'#fff1d0',x-.1*Math.cos(rot),y+.05,z+.1*Math.sin(rot),rot,false); l.rotation.z=.12;
        var r2=block(.22,.04,.32,'#fff7e0',x+.1*Math.cos(rot),y+.05,z-.1*Math.sin(rot),rot,false); r2.rotation.z=-.12;
      }
      function readingPavilion(x,y,z){
        var g0=curRoot.children.length;
        add(cyl(2.1,2.45,.27,10),'#dfd5ae',x,y,z);
        [[-1.35,-.7],[1.35,-.7],[-1.35,.7],[1.35,.7]].forEach(function(o){ post(.14,2.5,'#987456',x+o[0],y,z+o[1]); orb(.12,'#f7e0a0',x+o[0],y+2.55,z+o[1],false); });
        scallopCanopy(x,y+2.6,z,2.25,1.3,'#d58a72','#f6e3c4');
        add(cyl(.36,.44,.5,8),'#b9aa86',x,y+.25,z,0,0,0,'stone');
        openBook(x,y+.55,z,.3);
        hangLantern(x+1.35,y+2.48,z);
        hangLantern(x-1.35,y+2.48,z);
        compactRootRange(g0, x, y, z, 0);
      }
      var pavSpot=null;
      [7,8.4,9.8,6].forEach(function(pd){
        if(pavSpot) return;
        placed(main[2%main.length],1,pd,0,function(x,y,z){ if(outerClear(x,z,4.6)) pavSpot=[x,y,z]; });
      });
      if(pavSpot){ addLagLand(pavSpot[0],pavSpot[2],2.75); readingPavilion(pavSpot[0],pavSpot[1],pavSpot[2]); addObstacle(pavSpot[0],pavSpot[2],2.35); }
      // C2 (iter16): Lush sculpted tropical lotus-blossom bushes, mossy river rocks & curved arched feathery lagoon fronds
      // crowning the mossy reed islands (ZERO straight-cylinder flat-cap stand-ins anywhere in 08-lagoon!).
      function lagoonLotusBush(bx,by,bz,petalCol,seed){
        var ang0=(seed||0)*1.37, pc=petalCol||'#f393b6';
        emitCached('lagLotusBush:' + pc, bx, by, bz, ang0, 1, function(){
          var b1=smoothOrb(.38,'#3a8c5d',0,.10,0,false); b1.scale.set(1.16,.62,1.10);
          var b2=smoothOrb(.28,'#4fa56b',.24,.14,0,false); b2.scale.set(1.10,.64,1.06);
          var b3=smoothOrb(.24,'#63bb76',-.20,.16,-.12,false); b3.scale.set(1.08,.60,1.08);
          var bPetGeo=lotusPetalGeo();
          for(var lf=0;lf<5;lf++){
            var la=lf*Math.PI*2/5;
            var leaf=add(bPetGeo,lf%2?'#368558':'#54ad6d',Math.cos(la)*.20,.08,Math.sin(la)*.20,0,0,0,false);
            leaf.rotation.order='YXZ'; leaf.rotation.y=Math.PI*0.5-la; leaf.rotation.x=0.98;
            leaf.scale.set(0.46,0.52,0.52);
          }
          [[0,.30,0,.64],[.25,.26,0,.50]].forEach(function(sp2,bi){
            sculptedLotusBlossom(sp2[0],sp2[1],sp2[2],sp2[3],pc,'#fff0d6',bi);
          });
        });
      }
      function lagoonFloraCrown(x,lh,z,seed){
        var g0=curRoot.children.length;
        var ang0=(seed||0)*1.17, topY=lh-.18, shY=lh-.54, fg=palmFrondGeo();
        var r1=organicRock(x+Math.cos(ang0)*.18,topY-.18,z+Math.sin(ang0)*.18,.64,.44,.56,'#6e8c7f','stone'); r1.rotation.y=ang0;
        var m1=smoothOrb(.36,'#59a468',x+Math.cos(ang0)*.18,topY+.20,z+Math.sin(ang0)*.18,false); m1.scale.set(1.18,.40,1.08);
        var r2=organicRock(x-Math.cos(ang0+.7)*.40,topY-.20,z-Math.sin(ang0+.7)*.40,.48,.34,.44,'#9da992','stone'); r2.rotation.y=ang0+1.2;
        var m2=smoothOrb(.25,'#6cb675',x-Math.cos(ang0+.7)*.40,topY+.10,z-Math.sin(ang0+.7)*.40,false); m2.scale.set(1.14,.38,1.06);
        pebble(x+Math.cos(ang0+2.1)*.46,topY-.06,z+Math.sin(ang0+2.1)*.46,.28,'#c2c8ac');
        var outerN=5+(seed%2), outerCols=['#369660','#4cb16a','#2d8458','#5ec073','#40a366','#52b76e'];
        for(var j=0;j<outerN;j++){
          var a=j*(Math.PI*2/outerN)+ang0;
          var frond=mesh(fg,M(outerCols[j%outerCols.length],{side:T.DoubleSide,vertexColors:true}),x,topY+.22,z);
          frond.rotation.order='YXZ'; frond.rotation.y=a; frond.rotation.x=-.24-(j%2)*.07;
          frond.scale.setScalar(.58+(j%3)*.045); curRoot.add(frond);
        }
        var innerCols=['#6ecf7a','#56bb6e','#7ad782'];
        for(var u=0;u<3;u++){
          var ua=u*(Math.PI*2/3)+ang0+.52;
          var innerFrond=mesh(fg,M(innerCols[u%innerCols.length],{side:T.DoubleSide,vertexColors:true}),x,topY+.28,z);
          innerFrond.rotation.order='YXZ'; innerFrond.rotation.y=ua; innerFrond.rotation.x=-.54-(u%2)*.08;
          innerFrond.scale.setScalar(.44+(u%2)*.04); curRoot.add(innerFrond);
        }
        var heart=smoothOrb(.26,'#4b9963',x,topY+.22,z,false); heart.scale.set(1.15,.55,1.15);
        var pCol1=(seed%2===0)?'#f393b6':'#f5a48a', pCol2=(seed%2===0)?'#f6cf70':'#f393b6';
        lagoonLotusBush(x+Math.cos(ang0+.45)*.86,shY,z+Math.sin(ang0+.45)*.82,pCol1,seed+1);
        lagoonLotusBush(x-Math.cos(ang0+.25)*.84,shY,z-Math.sin(ang0+.25)*.80,pCol2,seed+4);
        compactRootRange(g0, x, lh, z, 0);
      }
      function dressLagoonCliffFlanks(lx,lh,lz,seed){
        var g0=curRoot.children.length;
        var fg=palmFrondGeo(), baseAng=(seed||0)*1.31;
        var ledgeSpecs=[
          { a:0.25, r:1.95, yFrac:0.24, sx:1.18, sy:0.46, sz:1.05, rCol:'#5d847c', mCol:'#4da364', fern:true,  lotus:false },
          { a:1.45, r:1.88, yFrac:0.46, sx:1.08, sy:0.42, sz:0.98, rCol:'#75968a', mCol:'#62b870', fern:true,  lotus:true  },
          { a:2.75, r:2.02, yFrac:0.32, sx:1.22, sy:0.48, sz:1.08, rCol:'#587e77', mCol:'#55ad69', fern:true,  lotus:false },
          { a:4.10, r:1.90, yFrac:0.54, sx:1.04, sy:0.40, sz:0.94, rCol:'#6c8f85', mCol:'#6fc378', fern:false, lotus:true  },
          { a:5.30, r:1.96, yFrac:0.38, sx:1.12, sy:0.44, sz:1.02, rCol:'#61877e', mCol:'#53a968', fern:true,  lotus:false }
        ];
        ledgeSpecs.forEach(function(lg,idx){
          var ang=lg.a+baseAng*0.35, ux=Math.cos(ang), uz=Math.sin(ang);
          var rx=lx+ux*lg.r, rz=lz+uz*lg.r;
          if(nearLagoonDock(rx,rz,1.25) || !clearOfLagoonCast(rx,rz,false)) return;
          var ly=-.7+lh*lg.yFrac;
          // MIN-8: Smooth-shaded 24-segment rounded Lagoon coastal rock shelf (flatShading: false) + lush mossy caps & fern tufts!
          var shelf=add(cliffBodyGeo((seed+idx)%4),lg.rCol,rx,ly-lg.sy*0.55,rz,0,ang+0.6,0,'stone');
          if(shelf.material && shelf.material.flatShading) shelf.material.flatShading=false;
          shelf.scale.set(lg.sx,lg.sy*1.35,lg.sz);
          var strata=smoothOrb(lg.sx*0.44,'#8ea394',rx+ux*0.24,ly-0.06,rz+uz*0.24,'stone');
          strata.scale.set(1.25,0.38,1.08);
          var moss1=smoothOrb(lg.sx*0.58,lg.mCol,rx,ly+lg.sy*0.48,rz,false);
          moss1.scale.set(1.22,0.44,1.15);
          var moss2=smoothOrb(lg.sx*0.40,'#82d478',rx+ux*0.22,ly+lg.sy*0.56,rz+uz*0.22,false);
          moss2.scale.set(1.14,0.40,1.10);
          var moss3=smoothOrb(lg.sx*0.30,'#398f58',rx-ux*0.24,ly+lg.sy*0.40,rz-uz*0.20,false);
          moss3.scale.set(1.12,0.38,1.08);
          var topL=ly+lg.sy*0.62;
          // Lush arching emerald & sunlit fern tufts on every mossy coastal rock ledge
          var nFerns=lg.fern?5:3;
          for(var fi=0;fi<nFerns;fi++){
            var fa=ang+(fi-(nFerns-1)*.5)*0.52;
            var fr=mesh(fg,M(fi%2?'#42a563':'#69c874',{side:T.DoubleSide,vertexColors:true}),rx,topL,rz);
            fr.rotation.order='YXZ'; fr.rotation.y=fa; fr.rotation.x=-0.18-(fi%2)*0.12;
            fr.scale.setScalar(0.42+(fi%2)*0.07); curRoot.add(fr);
          }
          if(lg.lotus){
            lagoonLotusBush(rx,topL-0.06,rz,idx%2?'#f497b8':'#f6cf70',seed+idx+2);
          }
        });
        for(var bi=0;bi<6;bi++){
          var ba=bi*Math.PI/3+0.3+baseAng*0.25, bx=lx+Math.cos(ba)*2.38, bz=lz+Math.sin(ba)*2.12;
          if(nearLagoonDock(bx,bz,1.35) || !clearOfLagoonCast(bx,bz,false)) continue;
          var bRock=add(ball(0.40+(bi%2)*0.11,12,9),bi%2?'#5f837a':'#78988d',bx,waterY+0.14,bz,0,ba,0,'stone');
          bRock.scale.set(1.26,0.70,1.10);
          var bMoss=smoothOrb(0.28,'#5db66e',bx,waterY+0.36,bz,false);
          bMoss.scale.set(1.20,0.42,1.10);
          var bSun=smoothOrb(0.18,'#8ad97c',bx+Math.cos(ba)*0.10,waterY+0.44,bz+Math.sin(ba)*0.10,false);
          bSun.scale.set(1.12,0.36,1.06);
          if(bi%2===0) seaGrass(bx+Math.cos(ba)*0.18,waterY+0.24,bz+Math.sin(ba)*0.18,0.56,'#44a46c');
        }
        compactRootRange(g0, lx, 0, lz, 0);
      }
      // Close-in visible band (dist = 4.5..12.5): deduplicated mossy reed islands with feathery lagoon flora & bamboo shrines
      var lagHills=[];
      for(var li=0;li<main.length;li+=3){
        var ls2=main[li], lf=frame(ls2), sd2=li%2?1:-1;
        placed(ls2,sd2,8.5+(li%3)*1.6,0,function(lx,ly,lz){
          if(!outerClear(lx,lz,4.8)) return;
          if(lagHills.some(function(h){ return Math.hypot(h[0]-lx,h[1]-lz)<4.5; })) return;
          lagHills.push([lx,lz]);
          addLagLand(lx,lz,3.75);
          var lh=2.6+(li%3)*1.1;
          stylizedCliff(lx,-.7,lz,2.6,lh,2.3,'#537d75','#73aa7c',false,true);
          dressLagoonCliffFlanks(lx,lh,lz,li);
          addObstacle(lx,lz,2.5);
          if(li%6===0){
            lagoonFloraCrown(lx,lh,lz,li);
          }else{
            add(cyl(1.55,1.8,.32,16),'#c8d4ad',lx,lh-.18,lz,0,0,0,'stone');
            [-1,1].forEach(function(px){ [-1,1].forEach(function(pz){ post(.07,1.8,'#9ab069',lx+px*.65,lh-.05,lz+pz*.65); }); });
            scallopCanopy(lx,lh+1.6,lz,1.5,.8,'#6f9a82','#d8e6b8');
            orb(.22,'#ffdf8e',lx,lh+1.45,lz,false);
          }
        });
      }
      // Right-half water fill (+side, dist 6-11): lotus-pad clusters, floating warm lanterns, a reading-pavilion islet and reed sandbars.
      var lagClaims=[]; if(pavSpot) lagClaims.push([pavSpot[0],pavSpot[2]]);
      function lagClaim(x,z,gap,tileGap){
        if(!outerClear(x,z,tileGap||3.6) || nearLagoonDock(x,z,1.5)) return false;
        for(var q=0;q<lagClaims.length;q++) if(Math.hypot(x-lagClaims[q][0],z-lagClaims[q][1])<gap) return false;
        lagClaims.push([x,z]); return true;
      }
      // iter30 Beyond-MP8: Shimmering Floating Lotus Sea-Lanterns (sculpted multi-tier rose/peach lotus cradle,
      // radiant warm golden paper-lantern glow core, shimmering golden-aqua water reflection halo & hovering firefly motes!)
      var lagLanternGrp=new T.Group(); lagLanternGrp.name='lagoon-floating-lotus-lanterns';
      var lagHaloRingGeo=new T.RingGeometry(0.54,1.02,24); lagHaloRingGeo.rotateX(-Math.PI/2);
      var lagHaloInnerGeo=new T.CircleGeometry(0.68,20); lagHaloInnerGeo.rotateX(-Math.PI/2);
      var lagCoreGeo=new T.CylinderGeometry(0.22,0.18,0.28,10);
      var lagFlameGeo=new T.SphereGeometry(0.14,10,8);
      var lagAuraGeo=new T.SphereGeometry(0.46,10,8);
      var lagMoteGeo=new T.OctahedronGeometry(0.055,0);
      var lagWaterHaloMat=new T.MeshBasicMaterial({color:'#ffe48e',transparent:true,opacity:view.night?0.46:0.34,depthWrite:false,side:T.DoubleSide,fog:false});
      var lagWaterAquaMat=new T.MeshBasicMaterial({color:'#9efcf4',transparent:true,opacity:view.night?0.36:0.28,depthWrite:false,side:T.DoubleSide,fog:false});
      var lagCoreMats=[
        new T.MeshBasicMaterial({color:'#ffe694',fog:false}),
        new T.MeshBasicMaterial({color:'#ffd49c',fog:false})
      ];
      var lagFlameMat=new T.MeshBasicMaterial({color:'#fffbe0',fog:false});
      var lagAuraMat=new T.MeshBasicMaterial({color:'#ffe07c',transparent:true,opacity:view.night?0.34:0.25,depthWrite:false,fog:false});
      extras.add(lagLanternGrp);
      function floatLantern(x,z,i,sc){
        if(lagBookPositions.some(function(b){ return Math.hypot(b[0]-x,b[1]-z)<2.6; })) return;
        lagLotusPositions.push({x:x, z:z});
        var k=sc||1, wy=waterY+0.066, outerCol=(i%2===0)?'#ff98b6':'#ffb48a';
        foamRing(x,-.58,z,.70*k);
        var lpad=add(lotusPadGeo(),'#48a678',x,-.565,z,0,(i||0)*.9,0,false); lpad.scale.setScalar(.86*k); lpad.userData.reefGround=true;
        emitCached('floatLanternCradle:' + outerCol, x, -.48, z, (i||0)*.4, k, function(){
          var lpGeo=lotusPetalGeo();
          for(var op=0;op<6;op++){
            var oa=op*Math.PI*2/6;
            var pet=add(lpGeo,outerCol,Math.cos(oa)*.14,0.02,Math.sin(oa)*.14,0,0,0,false);
            pet.rotation.order='YXZ'; pet.rotation.y=Math.PI*0.5-oa; pet.rotation.x=0.68; pet.scale.set(0.72,0.58,0.58);
          }
          for(var ip=0;ip<6;ip++){
            var ia=(ip+0.5)*Math.PI*2/6;
            var ipet=add(lpGeo,'#fff3d4',Math.cos(ia)*.10,0.05,Math.sin(ia)*.10,0,0,0,false);
            ipet.rotation.order='YXZ'; ipet.rotation.y=Math.PI*0.5-ia; ipet.rotation.x=0.38; ipet.scale.set(0.58,0.50,0.50);
          }
          add(smoothTorus(.22,.025,6,14),'#e6bc58',0,.24+0.08,0,Math.PI/2,0,0,false);
        });
        var coreM=new T.Mesh(lagCoreGeo,lagCoreMats[Math.abs(i||0)%2]);
        coreM.position.set(x,-.31+0.04*k,z); coreM.scale.setScalar(k); lagLanternGrp.add(coreM);
        var flameM=new T.Mesh(lagFlameGeo,lagFlameMat);
        flameM.position.set(x,-.27+0.06*k,z); flameM.scale.setScalar(k); lagLanternGrp.add(flameM);
        var auraM=new T.Mesh(lagAuraGeo,lagAuraMat);
        auraM.position.set(x,-.28+0.06*k,z); auraM.scale.setScalar(k); auraM.renderOrder=2; lagLanternGrp.add(auraM);
        var wIn=new T.Mesh(lagHaloInnerGeo,lagWaterHaloMat);
        wIn.position.set(x,wy+0.008,z); wIn.scale.setScalar(k*1.12); wIn.renderOrder=2; lagLanternGrp.add(wIn);
        var wOut=new T.Mesh(lagHaloRingGeo,lagWaterAquaMat);
        wOut.position.set(x,wy+0.004,z); wOut.scale.setScalar(k*1.16); wOut.renderOrder=2; lagLanternGrp.add(wOut);
        for(var mi=0;mi<3;mi++){
          var ma=mi*Math.PI*2/3+(i||0)*1.3, mr=(0.24+mi*0.09)*k;
          var mt=new T.Mesh(lagMoteGeo,mi===0?lagFlameMat:lagCoreMats[0]);
          mt.position.set(x+Math.cos(ma)*mr, -.04+mi*0.14*k, z+Math.sin(ma)*mr);
          mt.scale.setScalar(k); lagLanternGrp.add(mt);
        }
      }
      // Reading-pavilion islet in the camera-right water: pick the candidate that projects into the right half of the opening frame.
      var isletBest=null;
      main.forEach(function(s,i){
        [7.8,9.0,10.2].forEach(function(dd){
          placed(s,1,dd,0,function(x,y,z){
            if(!outerClear(x,z,4.9)) return;
            if(lagClaims.some(function(q){ return Math.hypot(q[0]-x,q[1]-z)<5.2; })) return;
            var nd=camNDC(x,-.5,z); if(nd.x<.25||nd.x>.8||nd.y<-.55||nd.y>.45) return;
            var sc=Math.abs(nd.x-.5)+Math.abs(nd.y-.05); if(!isletBest||sc<isletBest.sc) isletBest={x:x,z:z,sc:sc};
          });
        });
      });
      if(isletBest && lagClaim(isletBest.x,isletBest.z,5.2,4.9)){
        addLagLand(isletBest.x,isletBest.z,3.0);
        smoothFoamRing(isletBest.x,-.6,isletBest.z,3.2,2.9);
        smoothSandbar(isletBest.x,-.68,isletBest.z,2.6,.72,2.3,'#a9c79f');
        smoothSandbar(isletBest.x,-.38,isletBest.z,2.0,.35,1.8,'#efdcae');
        readingPavilion(isletBest.x,-.22,isletBest.z);
        addObstacle(isletBest.x,isletBest.z,2.5);
      }
      // Place 4 LARGE Sculpted Floating Open Storybooks BEFORE lotusPad/floatLantern placements so zero lotus/pad clips a storybook!
      var lagHeroCam=Math.min(5, main.length-1);
      var lagHeroRig=realCamSetupAt(lagHeroCam);
      var bookCols=['#286e92','#c2445a','#3c8a6c','#7c529a','#c87638'];
      var bookSpots=[];
      var booksPlaced=0;
      function clearOfLagoonHeroCast(wx,wz,pad){
        var p=pad||3.2;
        if(Math.hypot(wx-(-8.60),wz-(-14.70))<Math.max(4.0,p+0.8)) return false; // Mira (>= 2.4u from flipper tip)
        if(Math.hypot(wx-(-17.65),wz-(-10.25))<Math.max(5.6,p+0.8)) return false; // Reed stall (>= 5.6u)
        if(Math.hypot(wx-(-14.50),wz-(-8.10))<Math.max(5.6,p+0.8)) return false;  // Bok (>= 5.5u)
        if(view._shopPos && Math.hypot(wx-view._shopPos.x,wz-view._shopPos.z)<5.6) return false;
        if(pavSpot && Math.hypot(wx-pavSpot[0],wz-pavSpot[2])<5.6) return false;   // Orange gazebo pavilion posts & coral tree (>= 5.6u)
        if(isletBest && Math.hypot(wx-isletBest.x,wz-isletBest.z)<5.2) return false; // Right-water gazebo pavilion posts (>= 5.2u)
        if(view._sceneryObstacles && view._sceneryObstacles.some(function(o){ return Math.hypot(wx-o.x,wz-o.z)<(o.r||1)+2.6; })) return false;
        return true;
      }
      (function placeGiantStorybooks(){
        var bokNd=realCamNDCAt(lagHeroCam,-14.50,waterY+0.90,-8.10);
        var stallNd=realCamNDCAt(lagHeroCam,-17.65,waterY+1.35,-10.25);
        var cands=[];
        for(var wx=bounds.minX-12;wx<=bounds.maxX+14;wx+=1.05) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+14;wz+=1.05){
          if(!outerClear(wx,wz,3.55) || nearLagoonDock(wx,wz,1.9) || !clearOfLagoonCast(wx,wz,true) || !clearOfLagoonHeroCast(wx,wz,3.2)) continue;
          if(lagHills.some(function(h){ return Math.hypot(h[0]-wx,h[1]-wz)<3.6; })) continue;
          var nd=realCamNDCAt(lagHeroCam,wx,waterY+0.42,wz);
          if(nd.z>1 || nd.x<-.82 || nd.x>.84 || nd.y<-.68 || nd.y>.56) continue;
          // Keep hero storybooks clear of Bok & Reed Stall silhouettes in 08-lagoon.png screen space
          if(Math.hypot(nd.x-bokNd.x,(nd.y-bokNd.y)*0.75)<0.36) continue;
          if(Math.hypot(nd.x-stallNd.x,(nd.y-stallNd.y)*0.75)<0.28) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        // 4 unmistakably framed hero storybooks across left-fg, upper-center-left, center-right & mid-right open water!
        var heroNdc=[
          [-.48, -.46, 1.32], // Book 1: Foreground-Left clear turquoise water beside pier & Kiko, well clear of Bok
          [-.18,  .16, 1.44], // Book 2: Upper-Center-Left clear water beyond Stall & Bok
          [ .14,  .04, 1.40], // Book 3: Center-Right clear water between tile curve & mossy island
          [ .60, -.26, 1.36]  // Book 4: Mid-Right open water framing Mira & gazebo
        ];
        heroNdc.forEach(function(tg,bi){
          var best=null;
          cands.forEach(function(c){
            if(bookSpots.some(function(q){ return Math.hypot(q[0]-c.x,q[1]-c.z)<4.2; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best) return;
          bookSpots.push([best.c.x,best.c.z]);
          lagBookPositions.push([best.c.x,best.c.z]);
          lagClaims.push([best.c.x,best.c.z]);
          var faceCam=Math.atan2(lagHeroRig.cam.position.x-best.c.x, lagHeroRig.cam.position.z-best.c.z)+((bi%2)?0.22:-0.22);
          giantFloatingStorybook(best.c.x,best.c.z,faceCam,tg[2],bookCols[bi%bookCols.length],bi);
          addObstacle(best.c.x,best.c.z,1.85);
          booksPlaced++;
        });
        // Additional storybooks around cam@0 and the rest of the lagoon loop
        for(var si=0;si<main.length && booksPlaced<8;si+=6){
          var bs=main[si], bf=frame(bs);
          placed(bs,si%2?1:-1,7.4,0,function(bx,by,bz){
            if(booksPlaced>=8 || !outerClear(bx,bz,4.2) || nearLagoonDock(bx,bz,2.2) || !clearOfLagoonCast(bx,bz,true) || !clearOfLagoonHeroCast(bx,bz,3.2)) return;
            if(lagHills.some(function(h){ return Math.hypot(h[0]-bx,h[1]-bz)<3.8; })) return;
            if(bookSpots.some(function(q){ return Math.hypot(q[0]-bx,q[1]-bz)<4.4; })) return;
            bookSpots.push([bx,bz]);
            lagBookPositions.push([bx,bz]);
            lagClaims.push([bx,bz]);
            giantFloatingStorybook(bx,bz,Math.atan2(bf.tx,bf.tz)+.4,1.25,bookCols[booksPlaced%bookCols.length],booksPlaced);
            addObstacle(bx,bz,1.8);
            booksPlaced++;
          });
        }
      })();
      // Floating scalloped lily pads & blossoms in the visible water (dist = 3.8..10), strictly clear of storybooks
      if(outerClear(cx,cz,4.2)) lotusPad(cx,cz,1.5,true);
      main.forEach(function(s,i){
        if(i%2!==0) return;
        placed(s,i%4===0?1:-1,4.6+(i%3)*1.6,0,function(px2,py2,pz2){
          if(outerClear(px2,pz2,3.8) && !nearLagoonDock(px2,pz2,1.2)) lotusPad(px2,pz2,.9+(i%3)*.22,i%4===0);
        });
      });
      main.forEach(function(s,i){
        [[5.6,1.6],[6.6,-1.4],[7.8,1.4],[9.0,-1.2],[10.3,1.1],[11.4,-.8]].forEach(function(spot,k){
          placed(s,1,spot[0]+(i%2)*.4,spot[1]*(i%2?1:-1),function(x,y,z){
            if(!lagClaim(x,z,2.5,3.4)) return;
            var kind=(i+k)%5;
            if(kind===0||kind===3){
              lotusPad(x,z,1.15,true); lotusPad(x+1.3,z+.6,.8,kind===0); lotusPad(x-.9,z+1.1,.7,false);
            }else if(kind===1){
              floatLantern(x,z,i+k); lotusPad(x+1.1,z-.5,.75,true);
            }else if(kind===2){
              lotusPad(x,z,1.0,false); lotusPad(x+1.0,z-.8,.8,true); floatLantern(x-1.0,z+.7,i+k);
            }else{
              addLagLand(x,z,1.80);
              organicRock(x,-.62,z,1.5,.2,1.3,'#c2cda9'); organicRock(x,-.46,z,1.0,.1,.9,'#f2dbb4','sand');
              reeds(x-.3,-.4,z); coral(x+.45,-.36,z+.2,.55,'#e88b95');
            }
          });
        });
      });
      // Guarantee 2 charming lily-pad + floating warm lantern clusters in the upper-right water (820..1024, 0..240)!
      function placeLagoonUpperRight(camIdx){
        var cands=[];
        for(var wx=bounds.minX-14;wx<=bounds.maxX+22;wx+=1.2) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+22;wz+=1.2){
          if(!outerClear(wx,wz,5.2) || nearLagoonDock(wx,wz,2.0)) continue;
          if(lagClaims.some(function(q){ return Math.hypot(q[0]-wx,q[1]-wz)<3.4; })) continue;
          var nd=camNDCAt(camIdx,wx,-.56,wz);
          if(nd.x<.54 || nd.x>.92 || nd.y<.18 || nd.y>.76 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        [[.74,.52],[.86,.32]].forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(lagClaims.some(function(q){ return Math.hypot(q[0]-c.x,q[1]-c.z)<3.4; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best) return;
          var lx2=best.c.x, lz2=best.c.z;
          lagClaims.push([lx2,lz2]);
          lotusPad(lx2,lz2,1.25,true);
          lotusPad(lx2+1.25,lz2+.55,.88,false);
          lotusPad(lx2-.95,lz2+.85,.78,true);
          floatLantern(lx2+.45,lz2-.95,ti+3);
        });
      }
      var lagFirstDeck=main.find(function(s){ return s.kind==='deck' && !s.practice; });
      placeLagoonUpperRight(lagFirstDeck ? lagFirstDeck.i : activeIdx);
      // iter30 Beyond-MP8: Curated floating lotus sea-lantern trails shimmering across BOTH the foreground-left
      // and right-hand open turquoise lagoon water pockets (strictly clear of tiles, docks, Bok, Mira, Shelly & Kiko!)
      (function placeLagoonLotusLanternTrail(camIdx){
        var cands=[];
        for(var wx=bounds.minX-14;wx<=bounds.maxX+18;wx+=1.0) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+18;wz+=1.0){
          if(!outerClear(wx,wz,3.3) || nearLagoonDock(wx,wz,1.65) || !clearOfLagoonCast(wx,wz,false)) continue;
          if(lagHills.some(function(h){ return Math.hypot(h[0]-wx,h[1]-wz)<3.3; })) continue;
          if(lagClaims.some(function(q){ return Math.hypot(q[0]-wx,q[1]-wz)<2.3; })) continue;
          var nd=camNDCAt(camIdx,wx,-.56,wz);
          if(nd.x<-.88 || nd.x>.90 || nd.y<-.82 || nd.y>.68 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        var spots=[
          [-.52,-.56,1.12], [-.72,-.38,1.02], [-.44,-.26,0.96],
          [.22,-.46,1.08],  [.54,-.36,1.05],  [.76,-.58,1.10],
          [.38,.12,0.98],   [-.30,.28,0.94]
        ];
        spots.forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(lagClaims.some(function(q){ return Math.hypot(q[0]-c.x,q[1]-c.z)<2.35; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best || best.sc>.32) return;
          lagClaims.push([best.c.x,best.c.z]);
          floatLantern(best.c.x,best.c.z,ti+11,tg[2]);
        });
      })(lagFirstDeck ? lagFirstDeck.i : activeIdx);

      // Iter 34 + Iter 36 MIN-13 Story Lagoon Fantastical Identity:
      // 1) 4+ Hero Sculpted Floating Open Storybooks directly inside the 08-lagoon hero camera frustum
      //    with wide graceful open-book spreads (ZERO blank tent flaps!), crimson/gold double borders,
      //    deep navy/gold chapter headers, miniature painted castles/waves/fish/lighthouse vignettes,
      //    illuminated drop-caps & crisp dark calligraphy lines!
      // 2) Crisp Folded White & Pastel Origami Paper Boat fleet gliding right inside the hero turquoise water (1 InstancedMesh!)
      // 3) Hanging Calligraphy Lantern arches & glowing Story-Scroll Pedestals along clear shores
      function bookArchY(u){ return 0.14 + Math.sin(u * Math.PI) * 0.16 + 0.04 * u; }
      function curvedStorybookPagesGeo(){
        var k='lagGiantBookPages2', g=geos[k]; if(g) return g;
        var p=[], c=[], idx=[], nU=10, nV=6;
        [-1,1].forEach(function(side){
          var base=p.length/3;
          for(var iv=0;iv<=nV;iv++){
            var v=iv/nV, pz=(v-.5)*1.84;
            for(var iu=0;iu<=nU;iu++){
              var u=iu/nU;
              var px=side*(0.03+u*1.32);
              var py=bookArchY(u);
              p.push(px,py,pz);
              // Crisp warm-parchment pages with deep shaded center spine crease so the open book gutter pops!
              var crease=0.68+0.32*Math.min(1,u*3.2);
              var edge=1.0-0.05*Math.abs(v-.5)*2;
              var lum=crease*edge;
              c.push(1.00*lum, 0.96*lum, 0.86*lum);
            }
          }
          for(var iv2=0;iv2<nV;iv2++) for(var iu2=0;iu2<nU;iu2++){
            var a=base+iv2*(nU+1)+iu2, b=a+1, cc=a+(nU+1), d=cc+1;
            if(side>0) idx.push(a,cc,b, b,cc,d);
            else idx.push(a,b,cc, b,d,cc);
          }
        });
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        geos[k]=g; return g;
      }
      function giantFloatingStorybook(x,z,rot,scale,coverCol,spreadIdx){
        var k=scale||1.35, cc=coverCol||'#286e92', spI=(spreadIdx||0)%4;
        var floatY=waterY+0.48; // Hovering gracefully above sparkling lagoon water, pitched gently toward viewer!
        smoothFoamRing(x,waterY+.062,z,1.76*k,1.32*k);
        emitCached('giantStorybookV2:' + cc + ':' + spI, x, floatY, z, rot||0, k, function(){
          var bk=new T.Group(); bk.rotation.x=0.22; // Gentle lectern tilt toward camera so BOTH illustrated spreads pop!
          function bAdd(geo,col,px,py,pz,rx,ry,rz,kind){
            var o=mesh(geo,M(col,geo.attributes.color?{vertexColors:true}:undefined),px,py,pz);
            if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
            bk.add(o); return finish(o,kind||false);
          }
          function bBlk(w,h,d,col,px,py,pz,ry,rz,kind){ return bAdd(box(w,h,d),col,px,py,pz,0,ry||0,rz||0,kind); }
          // Helper: place a flat painted storybook artwork layer cleanly hugging the curved open page above the parchment!
          function pageArt(side, uCtr, zCtr, w, d, col, lift){
            var px=side*(0.03+uCtr*1.32);
            var py=0.06+bookArchY(uCtr)+(lift||0.024);
            var slope=(Math.cos(uCtr*Math.PI)*Math.PI*0.16+0.04)/1.32;
            var rz=side*Math.atan(slope);
            return bBlk(w, 0.022, d, col, px, py, zCtr, 0, rz, false);
          }
          // Embossed jewel-leather hardcovers + gilded spine + ornate brass corner clasps
          bBlk(1.46,.12,2.04,cc,-.74,.03,0,0,-.06,'timber');
          bBlk(1.46,.12,2.04,cc,.74,.03,0,0,.06,'timber');
          bBlk(.24,.17,2.08,'#e8be4c',0,.00,0,0,0,false);
          [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
            bBlk(.22,.15,.22,'#f2ca5c',sx*1.36,.09,sz*.92,0,0,false);
          }); });
          // Thick layered ivory page block with fine ruled page-edge trim beneath curved open double pages
          bBlk(1.30,.14,1.86,'#ebd8b2',-.68,.13,0,0,-.05,false);
          bBlk(1.30,.14,1.86,'#ebd8b2',.68,.13,0,0,.05,false);
          bBlk(1.32,.03,1.88,'#c8ab76',-.68,.11,0,0,-.05,false);
          bBlk(1.32,.03,1.88,'#c8ab76',.68,.11,0,0,.05,false);
          // Graceful wide arched ivory open double pages + crisp dark spine crease strip
          var pg=mesh(curvedStorybookPagesGeo(),M('#ffffff',{vertexColors:true,side:T.DoubleSide}),0,.06,0);
          bk.add(pg);
          bBlk(.06,.028,1.84,'#8a6d48',0,.20,0,0,0,false);

          // =========================================================================
          // RICH HIGH-CONTRAST ILLUSTRATED STORYBOOK SPREAD ON BOTH LEFT & RIGHT PAGES!
          // =========================================================================
          // 1) Crisp crimson-red & gilded-gold double page border frames on BOTH Left (-1) & Right (+1) pages!
          [-1, 1].forEach(function(sd){
            // Outer crimson page border (top, bottom, outer margin, inner gutter)
            pageArt(sd, 0.50, -0.82, 1.12, 0.055, '#b8323c', 0.020);
            pageArt(sd, 0.50,  0.82, 1.12, 0.055, '#b8323c', 0.020);
            pageArt(sd, 0.90,  0.00, 0.055, 1.68, '#b8323c', 0.020);
            pageArt(sd, 0.10,  0.00, 0.055, 1.68, '#b8323c', 0.020);
            // Inner burnished-gold border fillet + gilded corner rosette studs
            pageArt(sd, 0.50, -0.76, 1.00, 0.032, '#eab942', 0.024);
            pageArt(sd, 0.50,  0.76, 1.00, 0.032, '#eab942', 0.024);
            pageArt(sd, 0.85,  0.00, 0.032, 1.54, '#eab942', 0.024);
            pageArt(sd, 0.15,  0.00, 0.032, 1.54, '#eab942', 0.024);
            [0.14, 0.86].forEach(function(cu){ [-0.79, 0.79].forEach(function(cz2){
              pageArt(sd, cu, cz2, 0.10, 0.10, '#f4cd56', 0.030);
            }); });
            // Deep navy & burnished-gold Chapter Header Banner crowning BOTH pages!
            pageArt(sd, 0.50, -0.62, 0.88, 0.16, '#1a325c', 0.028);
            pageArt(sd, 0.50, -0.62, 0.66, 0.055, '#ffd452', 0.038);
          });

          // 2) LEFT PAGE: High-Contrast Miniature Painted Storybook Scene Vignette (4 distinct tales!)
          // Deep navy picture frame matte housing the painted vignette
          pageArt(-1, 0.50, 0.12, 0.88, 1.12, '#1c3660', 0.026);
          if(spI === 0){
            // Spread 0: Fairytale Coastal Castle by the Sea (cerulean sky, golden sun, ivory/crimson castle, turquoise waves!)
            pageArt(-1, 0.50, -0.10, 0.78, 0.56, '#2e7ac4', 0.034); // Rich cerulean sky
            pageArt(-1, 0.74, -0.26, 0.19, 0.19, '#ffdc4a', 0.044); // Golden sun disc
            pageArt(-1, 0.50,  0.34, 0.78, 0.42, '#178ea8', 0.034); // Deep turquoise ocean
            pageArt(-1, 0.50,  0.46, 0.72, 0.09, '#72f0ea', 0.042); // Crisp foam wave crest
            pageArt(-1, 0.46,  0.22, 0.62, 0.18, '#329e62', 0.040); // Emerald headland hill
            // Miniature painted ivory castle keep + twin flanking turrets + pointed crimson spires + arched gold gate!
            pageArt(-1, 0.46,  0.04, 0.36, 0.28, '#fff2d2', 0.046);
            pageArt(-1, 0.62,  0.00, 0.13, 0.34, '#f5e4bc', 0.048);
            pageArt(-1, 0.30,  0.00, 0.13, 0.34, '#f5e4bc', 0.048);
            pageArt(-1, 0.62, -0.20, 0.15, 0.14, '#d63e44', 0.052); // Left red spire
            pageArt(-1, 0.30, -0.20, 0.15, 0.14, '#d63e44', 0.052); // Right red spire
            pageArt(-1, 0.46, -0.14, 0.18, 0.13, '#d63e44', 0.052); // Central red gable
            pageArt(-1, 0.46,  0.11, 0.11, 0.14, '#e8b63a', 0.054); // Golden castle arch gate
          } else if(spI === 1){
            // Spread 1: Golden Koi & Lotus Pond (deep indigo pond, emerald lily pads, rose lotus blooms, 2 painted koi fish!)
            pageArt(-1, 0.50,  0.12, 0.78, 1.00, '#1a4a72', 0.034); // Deep twilight indigo pond
            pageArt(-1, 0.66, -0.14, 0.28, 0.24, '#2a9c64', 0.042); // Lily pad 1
            pageArt(-1, 0.32,  0.34, 0.28, 0.24, '#2a9c64', 0.042); // Lily pad 2
            pageArt(-1, 0.66, -0.14, 0.15, 0.15, '#f55680', 0.050); // Rose lotus bloom 1
            pageArt(-1, 0.32,  0.34, 0.15, 0.15, '#f55680', 0.050); // Rose lotus bloom 2
            // Painted Koi Fish #1 (crimson-orange body + gold fin + fanned tail)
            pageArt(-1, 0.44,  0.04, 0.32, 0.14, '#f05a3a', 0.048);
            pageArt(-1, 0.26,  0.04, 0.13, 0.20, '#ffcf48', 0.046);
            // Painted Koi Fish #2 (burnished gold body + coral tail)
            pageArt(-1, 0.58,  0.34, 0.28, 0.13, '#ffcf48', 0.048);
            pageArt(-1, 0.74,  0.34, 0.12, 0.18, '#f05a3a', 0.046);
            pageArt(-1, 0.50, -0.32, 0.62, 0.06, '#6ae4e6', 0.042); // Shimmering pond ripple
          } else if(spI === 2){
            // Spread 2: Starry Voyage & Breaching Whale (midnight navy sky, crescent gold moon, crimson caravel ship, bright waves!)
            pageArt(-1, 0.50, -0.12, 0.78, 0.54, '#182e5c', 0.034); // Midnight navy sky
            pageArt(-1, 0.74, -0.26, 0.18, 0.18, '#ffe258', 0.046); // Radiant golden moon
            pageArt(-1, 0.30, -0.28, 0.08, 0.08, '#fff4a8', 0.044); // Star 1
            pageArt(-1, 0.52, -0.30, 0.07, 0.07, '#fff4a8', 0.044); // Star 2
            pageArt(-1, 0.50,  0.34, 0.78, 0.44, '#1e8aa6', 0.034); // Deep sea
            pageArt(-1, 0.50,  0.46, 0.72, 0.10, '#6cece6', 0.042); // Rolling aqua wave
            // Miniature painted sailing ship (crimson hull + golden mast + twin crisp ivory billowing sails!)
            pageArt(-1, 0.50,  0.22, 0.46, 0.15, '#c83c42', 0.046);
            pageArt(-1, 0.50,  0.00, 0.05, 0.34, '#f0c44a', 0.048);
            pageArt(-1, 0.58,  0.02, 0.22, 0.24, '#fff8e2', 0.052);
            pageArt(-1, 0.38,  0.04, 0.16, 0.20, '#fff2cf', 0.050);
          } else {
            // Spread 3: Rainbow Reef & Striped Lighthouse (sky blue, rainbow bands, turquoise waves, crimson/white lighthouse!)
            pageArt(-1, 0.50, -0.10, 0.78, 0.56, '#3686ce', 0.034); // Sunlit sky
            pageArt(-1, 0.50, -0.28, 0.68, 0.07, '#e8484c', 0.042); // Rainbow red
            pageArt(-1, 0.50, -0.21, 0.62, 0.07, '#ffd448', 0.042); // Rainbow gold
            pageArt(-1, 0.50, -0.14, 0.56, 0.07, '#4ae0c8', 0.042); // Rainbow aqua
            pageArt(-1, 0.50,  0.36, 0.78, 0.42, '#188ea6', 0.034); // Turquoise waves
            pageArt(-1, 0.50,  0.48, 0.72, 0.09, '#74f0ea', 0.042); // Surf foam crest
            // Miniature painted red-and-white striped coastal lighthouse + glowing golden beacon star!
            pageArt(-1, 0.50,  0.24, 0.42, 0.16, '#349e66', 0.040); // Emerald rock island
            pageArt(-1, 0.50,  0.08, 0.18, 0.34, '#fff5de', 0.048);
            pageArt(-1, 0.50,  0.14, 0.19, 0.09, '#d63e44', 0.052);
            pageArt(-1, 0.50,  0.00, 0.19, 0.09, '#d63e44', 0.052);
            pageArt(-1, 0.50, -0.13, 0.18, 0.12, '#ffd84a', 0.054); // Golden beacon lantern
          }

          // 3) RIGHT PAGE: Illuminated Crimson-Gold Drop-Cap + 6 Crisp Dark Calligraphy Text Lines + Painted Fish/Wave Footer Vignette!
          // Illuminated Drop-Cap Box (upper-left of right page)
          pageArt(1, 0.30, -0.32, 0.28, 0.28, '#c2343e', 0.032);
          pageArt(1, 0.30, -0.32, 0.20, 0.20, '#ffd452', 0.038);
          pageArt(1, 0.30, -0.32, 0.09, 0.12, '#1a325c', 0.044);
          // 6 High-contrast dark navy-sepia narrative text lines clearly legible from the hero board camera!
          for(var li=0;li<6;li++){
            var shortRow=(li < 3);
            var lw=shortRow ? 0.42 : 0.78;
            var lu=shortRow ? 0.68 : 0.50;
            var lz=-0.42 + li * 0.125;
            pageArt(1, lu, lz, lw, 0.056, li % 3 === 0 ? '#1e2e4c' : '#3a2a24', 0.028);
          }
          // Miniature painted maritime footer vignette at bottom of Right Page (deep sea panel + golden wave + coral fish!)
          pageArt(1, 0.50, 0.48, 0.82, 0.36, '#1c446c', 0.028);
          pageArt(1, 0.50, 0.56, 0.74, 0.11, '#36c2d4', 0.036);
          pageArt(1, 0.46, 0.46, 0.28, 0.12, '#ffcf48', 0.044); // Golden fish body
          pageArt(1, 0.64, 0.46, 0.11, 0.16, '#ee5844', 0.042); // Coral fish tail
          pageArt(1, 0.28, 0.44, 0.10, 0.10, '#fff2a6', 0.042); // Sun/pearl accent

          // Flowing crimson-and-gold silk ribbon bookmark draped down the center spine & over the front edge!
          bBlk(.13,.04,1.12,'#c8343e',.02,.25,.56,0,0,'fabric');
          bBlk(.07,.045,1.10,'#f4cb54',.02,.26,.56,0,0,'fabric');
          bBlk(.13,.46,.045,'#c8343e',.02,.04,1.10,0,0,'fabric');
          bAdd(cone(.10,.16,4),'#f4cb54',.02,-.22,1.10,Math.PI,0,0,false);
          curRoot.add(bk);
        });
        // Soft warm magic storybook glow halo on the water + 6 rising warm sparkle motes in lagLanternGrp!
        var halo=new T.Mesh(lagHaloInnerGeo,lagWaterHaloMat);
        halo.position.set(x,waterY+0.072,z); halo.scale.set(2.4*k,1,1.82*k); halo.rotation.y=rot||0; halo.renderOrder=2; lagLanternGrp.add(halo);
        for(var mi=0;mi<6;mi++){
          var ma=mi*Math.PI/3+(rot||0), mr=(0.52+(mi%3)*0.24)*k;
          var mt=new T.Mesh(lagMoteGeo,mi%2?lagFlameMat:lagCoreMats[0]);
          mt.position.set(x+Math.cos(ma)*mr, floatY+0.55+(mi%3)*0.30*k, z+Math.sin(ma)*mr);
          mt.scale.setScalar((1.35+(mi%2)*0.35)*k); lagLanternGrp.add(mt);
        }
      }
      function calligraphyLanternArch(x,y,z,rot,seed){
        var v=(seed||0)%2, capCol=v?'#c84b44':'#2f6b72';
        emitCached('lagCalligraphyArch:' + v, x, y, z, rot||0, 1, function(){
          // Graceful curved bamboo/dark-lacquer lantern post with hanging hexagonal calligraphy paper lantern
          add(cyl(.22,.28,.16,10),'#8c9b88',0,.08,0,0,0,0,'stone');
          post(.075,2.55,'#5a3f2f',0,.10,0);
          limb(0,2.52,0,0,.45,.88,.95,.058,.040,'#6a4a36','timber');
          add(cyl(.015,.015,.36,6),'#e5bc5b',0,2.72,.82,0,0,0,false);
          // Tall hexagonal parchment calligraphy lantern body with vermilion/teal lacquered caps & dark ink bands
          add(cyl(.22,.18,.10,6),capCol,0,2.54,.82,0,0,0,false);
          add(cyl(.25,.25,.58,6),'#fff5dc',0,2.20,.82,0,0,0,false);
          add(cyl(.26,.26,.06,6),'#34404d',0,2.30,.82,0,0,0,false); // calligraphy ink stroke band 1
          add(cyl(.26,.26,.05,6),'#34404d',0,2.10,.82,0,0,0,false); // calligraphy ink stroke band 2
          add(cyl(.18,.22,.10,6),capCol,0,1.88,.82,0,0,0,false);
          add(cyl(.035,.015,.32,6),'#d64c56',0,1.68,.82,0,0,0,'fabric'); // crimson silk tassel
        });
        // Radiant inner warm lantern glow in extras
        var wx=x+Math.sin(rot||0)*.82, wz=z+Math.cos(rot||0)*.82;
        var lAura=new T.Mesh(lagAuraGeo,lagAuraMat);
        lAura.position.set(wx,y+2.20,wz); lAura.scale.setScalar(.85); lAura.renderOrder=2; lagLanternGrp.add(lAura);
      }
      function storyScrollPedestal(x,y,z,rot){
        emitCached('lagScrollPedestal', x, y, z, rot||0, 1, function(){
          // Carved mossy limestone pedestal with brass collar & unfurled luminous parchment story scroll
          add(cyl(.44,.52,.18,10),'#8ea08e',0,.09,0,0,0,0,'stone');
          add(cyl(.28,.34,.74,10),'#c8cca8',0,.52,0,0,0,0,'stone');
          add(cyl(.46,.32,.14,10),'#a4b299',0,.94,0,0,0,0,'stone');
          add(cyl(.38,.38,.04,10),'#e2b95a',0,1.02,0,0,0,0,false);
          // Unfurled curved parchment scroll resting slightly tilted toward the viewer
          var scBase=block(.72,.04,.44,'#fff4d6',0,1.12,0,0,false); scBase.rotation.x=.22;
          var scInk1=block(.48,.05,.04,'#6d5642',0,1.15,-.06,0,false); scInk1.rotation.x=.22;
          var scInk2=block(.38,.05,.04,'#6d5642',0,1.12,.06,0,false); scInk2.rotation.x=.22;
          [-.38,.38].forEach(function(rx){
            add(cyl(.065,.065,.52,10),'#7c4d32',rx,1.14,0,Math.PI/2+.22,0,0,'timber');
            add(cyl(.078,.078,.08,10),'#ecc35c',rx,1.14,-.28,Math.PI/2+.22,0,0,false);
            add(cyl(.078,.078,.08,10),'#ecc35c',rx,1.14,.28,Math.PI/2+.22,0,0,false);
          });
        });
        var pAura=new T.Mesh(lagAuraGeo,lagAuraMat);
        pAura.position.set(x,y+1.26,z); pAura.scale.setScalar(.62); pAura.renderOrder=2; lagLanternGrp.add(pAura);
      }
      // Place 6 Hanging Calligraphy Lantern arches & 5 Glowing Story-Scroll Pedestals on clear shore spots
      for(var cl=2;cl<main.length;cl+=6){
        var cs=main[cl], cf=frame(cs), cRot=Math.atan2(-cf.nx,-cf.nz);
        placed(cs,1,4.6,0,function(x,y,z){
          if(!outerClear(x,z,3.6) || nearLagoonDock(x,z,1.8) || !clearOfLagoonCast(x,z,true)) return;
          if(lagClaims.some(function(q){ return Math.hypot(q[0]-x,q[1]-z)<2.4; })) return;
          lagClaims.push([x,z]);
          calligraphyLanternArch(x,y,z,cRot,cl);
          addObstacle(x,z,.8);
        });
        placed(cs,-1,4.8,0,function(x,y,z){
          if(cl%12!==2 || !outerClear(x,z,3.6) || nearLagoonDock(x,z,1.8) || !clearOfLagoonCast(x,z,true)) return;
          if(lagClaims.some(function(q){ return Math.hypot(q[0]-x,q[1]-z)<2.4; })) return;
          lagClaims.push([x,z]);
          storyScrollPedestal(x,y,z,cRot+Math.PI);
          addObstacle(x,z,.8);
        });
      }
      // MIN-10: Crisp Folded Origami Paper Boat fleet gliding strictly on OPEN turquoise water
      // (y = waterY + 0.04, >= 1.8u clear of ALL islands/sandbars/tile pads) with crisp water ripple wakes!
      (function buildOrigamiPaperBoats(){
        // Classic recognizable folded origami boat: flat-bottomed flared trapezoidal hull with crisp brim fold +
        // soft shaded interior boat well + centered triangular folded paper peak (never a shard stuck in sand!)
        var op=[
          // Outer hull flared side panels (length 1.54u, deck width 0.78u, flat keel bottom y = 0.0)
          0,.26,.77,    .39,.25,.24,   .25,.01,.44,
          0,.26,.77,    .25,.01,.44,   0,.01,.62,
          0,.26,.77,    0,.01,.62,    -.25,.01,.44,
          0,.26,.77,   -.25,.01,.44,  -.39,.25,.24,
          .39,.25,.24,  .39,.25,-.24,  .25,.01,-.44,
          .39,.25,.24,  .25,.01,-.44,  .25,.01,.44,
         -.39,.25,.24, -.25,.01,.44,  -.25,.01,-.44,
         -.39,.25,.24, -.25,.01,-.44, -.39,.25,-.24,
          0,.26,-.77,   .25,.01,-.44,  .39,.25,-.24,
          0,.26,-.77,   0,.01,-.62,    .25,.01,-.44,
          0,.26,-.77,  -.25,.01,-.44,  0,.01,-.62,
          0,.26,-.77,  -.39,.25,-.24, -.25,.01,-.44,
          // Folded paper inward gunwale flaps creating the unmistakable open paper-boat well!
          0,.26,.77,    .20,.14,.18,   .39,.25,.24,
          .39,.25,.24,  .20,.14,.18,   .20,.14,-.18,
          .39,.25,.24,  .20,.14,-.18,  .39,.25,-.24,
          0,.26,-.77,   .39,.25,-.24,  .20,.14,-.18,
          0,.26,.77,   -.39,.25,.24,  -.20,.14,.18,
         -.39,.25,.24, -.20,.14,-.18, -.20,.14,.18,
         -.39,.25,.24, -.39,.25,-.24, -.20,.14,-.18,
          0,.26,-.77,  -.20,.14,-.18, -.39,.25,-.24,
          // Classic centered folded paper-boat triangular peak sail (clean proportioned pyramid)
          0,.74,0,      .22,.13,.32,   .22,.13,-.32,
          0,.74,0,     -.22,.13,-.32, -.22,.13,.32,
          0,.74,0,     -.22,.13,.32,   .22,.13,.32,
          0,.74,0,      .22,.13,-.32, -.22,.13,-.32
        ];
        // Crisp origami fold crease shading (bright sunlit sail crest, soft sky-shadowed boat well, crisp outer hull)
        var oc=[];
        for(var vi=0;vi<op.length;vi+=3){
          var px2=Math.abs(op[vi]), py2=op[vi+1];
          var isWell=(vi>=36*3 && vi<60*3 && px2<.24 && py2<.20);
          if(py2>0.55) oc.push(1.0, 1.0, 0.99);
          else if(isWell) oc.push(0.76, 0.84, 0.90);
          else if(py2<0.05) oc.push(0.84, 0.88, 0.90);
          else oc.push(0.96, 0.97, 0.98);
        }
        var boatGeo=new T.BufferGeometry();
        boatGeo.setAttribute('position',new T.Float32BufferAttribute(op,3));
        boatGeo.setAttribute('color',new T.Float32BufferAttribute(oc,3));
        boatGeo.computeVertexNormals();
        var boatMat=new T.MeshToonMaterial({color:'#ffffff',vertexColors:true,gradientMap:view.kit.grad,side:T.DoubleSide});
        var boatSpots=[], boatCols=['#fffef8','#fff3d4','#ffd4e4','#c4ecff','#ccf6e2','#ffe8a6','#fffef8'];
        // Strict open-turquoise-water clearance (>= 1.8u from EVERY tile sandpad, sandbar, cliff flank, island, dock & storybook!)
        function boatSpotOk(bx,bz){
          for(var ti=0;ti<sp.length;ti++){
            var ts=sp[ti], padR=(!ts.branch && ts.i%3===0)?2.45:1.80;
            if(Math.hypot(bx-ts.x,bz-ts.z)<padR+1.88) return false;
            if(ts.obj && ts.obj.position && Math.hypot(bx-ts.obj.position.x,bz-ts.obj.position.z)<2.65) return false;
          }
          for(var li=0;li<lagLandMasses.length;li++){
            var lm=lagLandMasses[li];
            if(Math.hypot(bx-lm.x,bz-lm.z)<lm.r+1.88) return false;
          }
          if(nearLagoonDock(bx,bz,2.10) || !clearOfLagoonCast(bx,bz,false) || !clearOfLagoonHeroCast(bx,bz,2.60)) return false;
          if(lagLotusPositions.some(function(lp){ return Math.hypot(lp.x-bx,lp.z-bz)<2.35; })) return false;
          if(bookSpots.some(function(q){ return Math.hypot(q[0]-bx,q[1]-bz)<2.85; })) return false;
          if(boatSpots.some(function(b){ return Math.hypot(b.x-bx,b.z-bz)<2.35; })) return false;
          return true;
        }
        // First: Place a charming hero origami flotilla strictly on open turquoise water inside 08-lagoon (cam@5)!
        var boatCands=[];
        for(var wx=bounds.minX-12;wx<=bounds.maxX+12;wx+=0.85) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+12;wz+=0.85){
          if(!boatSpotOk(wx,wz)) continue;
          var nd=realCamNDCAt(lagHeroCam,wx,waterY+0.25,wz);
          if(nd.z>1 || nd.x<-.84 || nd.x>.84 || nd.y<-.72 || nd.y>.44) continue;
          boatCands.push({x:wx,z:wz,nd:nd});
        }
        var heroBoatsNdc=[
          [-.62, -.16, 1.24], [-.48, -.44, 1.22], [-.34, -.06, 1.20],
          [ .08,  .22, 1.24], [ .36,  .18, 1.26], [ .44, -.16, 1.22],
          [ .34, -.54, 1.24], [ .74, -.06, 1.20], [-.18,  .26, 1.22]
        ];
        heroBoatsNdc.forEach(function(tg,bi){
          var best=null;
          boatCands.forEach(function(c){
            if(boatSpots.some(function(b){ return Math.hypot(b.x-c.x,b.z-c.z)<2.35; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best || best.sc>.40) return;
          boatSpots.push({x:best.c.x,z:best.c.z,rot:((bi*1.15)+0.55)%6.28,sc:tg[2],col:boatCols[bi%boatCols.length]});
        });
        // Second: Scatter additional origami boats across open lagoon turquoise water around the loop
        main.forEach(function(s,i){
          if(i%2!==0 || boatSpots.length>=22) return;
          placed(s,i%4===0?1:-1,5.2+(i%3)*1.6,1.2,function(bx,by,bz){
            if(boatSpots.length>=22 || !boatSpotOk(bx,bz)) return;
            boatSpots.push({x:bx,z:bz,rot:(i*1.37)%6.28,sc:1.10+(i%3)*.14,col:boatCols[boatSpots.length%boatCols.length]});
          });
        });
        if(boatSpots.length){
          var im=new T.InstancedMesh(boatGeo,boatMat,boatSpots.length);
          var dummy=new T.Object3D(), cObj=new T.Color();
          var boatWakeInnerGeo=new T.RingGeometry(0.46, 0.72, 24); boatWakeInnerGeo.rotateX(-Math.PI/2);
          var boatWakeOuterGeo=new T.RingGeometry(0.84, 1.06, 24); boatWakeOuterGeo.rotateX(-Math.PI/2);
          var boatWakeWhiteMat=new T.MeshBasicMaterial({color:'#eaffff',transparent:true,opacity:view.night?0.48:0.62,depthWrite:false,side:T.DoubleSide,fog:false});
          boatSpots.forEach(function(b,bi){
            dummy.position.set(b.x,waterY+0.04,b.z);
            dummy.rotation.set(0,b.rot,0);
            dummy.scale.setScalar(b.sc);
            dummy.updateMatrix();
            im.setMatrixAt(bi,dummy.matrix);
            im.setColorAt(bi,cObj.set(b.col));
            // Crisp double water ripple wake hugging each floating origami boat on open turquoise water!
            var wakeIn=new T.Mesh(boatWakeInnerGeo,boatWakeWhiteMat);
            wakeIn.position.set(b.x,waterY+0.056,b.z); wakeIn.scale.set(0.76*b.sc,1,1.18*b.sc); wakeIn.rotation.y=b.rot; wakeIn.renderOrder=2;
            lagLanternGrp.add(wakeIn);
            var wakeOut=new T.Mesh(boatWakeOuterGeo,lagWaterAquaMat);
            wakeOut.position.set(b.x-Math.sin(b.rot)*0.18*b.sc,waterY+0.052,b.z-Math.cos(b.rot)*0.18*b.sc);
            wakeOut.scale.set(0.98*b.sc,1,1.38*b.sc); wakeOut.rotation.y=b.rot; wakeOut.renderOrder=2;
            lagLanternGrp.add(wakeOut);
          });
          im.instanceMatrix.needsUpdate=true;
          if(im.instanceColor) im.instanceColor.needsUpdate=true;
          im.frustumCulled=false;
          im.name='lagoon-origami-boats';
          extras.add(im);
        }
      })();
      // Compact all floating lotus lantern glows, storybook halos & origami wakes into ~4 batched extras draw calls!
      compactGroupInPlace(lagLanternGrp, true, null);
    }
    function caves(){
      // M4-caves + m17 + m18 + iter14 M4/M5: Lighter airy cyan cavern fog pushed back (near 36, far 78) so Echo & Echo's tile
      // never wash out, darker indigo-slate cavern rock arch & grotto apron framing Echo, rich lower-left foreground grotto,
      // sculpted Crystal Echo-Shell Shrine, 3 warm golden lantern pools, and faceted crystalline mineral clusters.
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#284353':'#b2e4f2'); view.scene.fog.near=36; view.scene.fog.far=78; }
      var echoDeck=sp.find(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity; });
      var cavesShopSp=sp.find(function(s){ return s.kind==='shop'; }) || echoDeck || main[0];
      // Echo's live MP8 board swim position (-18.50, -6.00) on the open left-midground cavern floor (synced with region-people.js!)
      var echoPoolX = bounds ? (bounds.minX + (bounds.maxX - bounds.minX) * 0.24) : -18.50;
      var echoPoolZ = bounds ? (bounds.minZ + (bounds.maxZ - bounds.minZ) * 0.68) : -6.00;
      if(Math.min.apply(null, sp.map(function(s){ return Math.hypot(s.x - echoPoolX, s.z - echoPoolZ); })) < 3.6){
        echoPoolX += 2.2; echoPoolZ += 1.4;
      }
      view._echoPool = { x: echoPoolX, z: echoPoolZ };
      function nearEcho(x,z,dist){
        if(Math.hypot(x-echoPoolX,z-echoPoolZ)<3.45) return true;
        if(Math.hypot(x-(-1.0),z-(-1.5))<2.85) return true;
        return !!(echoDeck && Math.hypot(x-echoDeck.x,z-echoDeck.z)<(dist||5.6));
      }
      // iter19 m6: Keep Bok's Crystal Counter standing spots clear of unregistered mushrooms/crystal spikes
      // (without altering _sceneryObstacles so Bok, Crystal Counter & Echo remain at their exact verified spots).
      var cavesBokSpots=[[-20.00,-3.85],[-19.40,-5.35]];
      function nearCavesBok(x,z,dist){
        var d=dist||1.85;
        for(var bi=0;bi<cavesBokSpots.length;bi++) if(Math.hypot(x-cavesBokSpots[bi][0],z-cavesBokSpots[bi][1])<d) return true;
        return false;
      }
      var caveClaims=[];
      function caveClaim(x,z,gap,tileGap){
        if(!outerClear(x,z,tileGap||3.4)) return false;
        for(var q=0;q<caveClaims.length;q++) if(Math.hypot(x-caveClaims[q][0],z-caveClaims[q][1])<gap) return false;
        caveClaims.push([x,z]); return true;
      }
      // iter23 Minor #8: Soft-feathered radial bioluminescent glow puddles (CanvasTexture radial alpha gradient fading
      // smoothly from translucent warm-amber/aqua core alpha ~0.32 to 0.0 at rim, depthWrite: false) accented with
      // sculpted dark-slate cave pebbles & tiny crystal shards (zero flat yellow hard-edged sticker discs!).
      var caveGlowMat=null, caveGlowQuad=null, caveGlowTried=false;
      function ensureCaveGlow(){
        if(caveGlowTried) return caveGlowMat;
        caveGlowTried=true;
        var S=256, p=makeProcCanvas(S); if(!p) return null;
        var ctx=p.ctx, half=S*.5;
        if(typeof ctx.clearRect==='function') ctx.clearRect(0,0,S,S);
        var gr=ctx.createRadialGradient(half,half,3,half,half,half-4);
        if(!gr || typeof gr.addColorStop!=='function') return null;
        if(view.night){
          gr.addColorStop(0.00,'rgba(255,224,142,0.36)');
          gr.addColorStop(0.22,'rgba(244,208,128,0.28)');
          gr.addColorStop(0.46,'rgba(146,232,216,0.17)');
          gr.addColorStop(0.70,'rgba(110,222,230,0.08)');
          gr.addColorStop(0.88,'rgba(110,218,228,0.02)');
          gr.addColorStop(1.00,'rgba(110,218,228,0.0)');
        }else{
          gr.addColorStop(0.00,'rgba(255,228,154,0.32)');
          gr.addColorStop(0.22,'rgba(246,214,138,0.24)');
          gr.addColorStop(0.46,'rgba(164,226,210,0.15)');
          gr.addColorStop(0.70,'rgba(122,216,226,0.065)');
          gr.addColorStop(0.88,'rgba(122,214,224,0.015)');
          gr.addColorStop(1.00,'rgba(122,214,224,0.0)');
        }
        ctx.fillStyle=gr; ctx.fillRect(0,0,S,S);
        // Subtle organic off-center bioluminescent mist wisps inside inner 55% so glow feels natural on uneven stone
        [[.18,-.14,.30,'255,232,168',.065],[-.20,.16,.32,'132,236,228',.060],[.12,.22,.26,'164,238,220',.055],[-.18,-.18,.28,'250,220,148',.050]].forEach(function(w){
          var wx=half+w[0]*S, wy=half+w[1]*S, wr=w[2]*S;
          var wg=ctx.createRadialGradient(wx,wy,2,wx,wy,wr);
          if(!wg || typeof wg.addColorStop!=='function') return;
          wg.addColorStop(0,'rgba('+w[3]+','+w[4]+')');
          wg.addColorStop(1,'rgba('+w[3]+',0.0)');
          ctx.fillStyle=wg; ctx.beginPath(); ctx.arc(wx,wy,wr,0,Math.PI*2); ctx.fill();
        });
        var tex=new T.CanvasTexture(p.cv);
        tex.wrapS=T.ClampToEdgeWrapping; tex.wrapT=T.ClampToEdgeWrapping;
        caveGlowMat=own(new T.MeshBasicMaterial({color:'#ffffff',map:tex,transparent:true,opacity:1,depthWrite:false}));
        caveGlowQuad=own(new T.PlaneGeometry(2,2));
        caveGlowQuad.rotateX(-Math.PI/2);
        return caveGlowMat;
      }
      function tinyShard(sx,sz,h,r,leanAng,leanTilt,colBody,colTip){
        var capH=h*.36, bodyH=h-capH, tx=Math.sin(leanTilt)*Math.cos(leanAng), tz=Math.sin(leanTilt)*Math.sin(leanAng), cl=Math.cos(leanTilt);
        var rx=Math.asin(tz), rz=-Math.asin(tx), yBase=-.31;
        add(cyl(r*.78,r,bodyH,6),colBody,sx+tx*bodyH*.5,yBase+cl*bodyH*.5,sz+tz*bodyH*.5,rx,leanAng,rz,false);
        add(cyl(0,r*.78,capH,6),colTip,sx+tx*(bodyH+capH*.5),yBase+cl*(bodyH+capH*.5),sz+tz*(bodyH+capH*.5),rx,leanAng,rz,false);
      }
      function goldPool(x,z,r){
        var mat=ensureCaveGlow();
        if(mat && caveGlowQuad){
          var o=mesh(caveGlowQuad,mat,x,-.296,z);
          o.scale.set(r*1.06,1,r*1.06);
          o.rotation.y=(x*.73+z*.41)%(Math.PI*2);
          o.userData.reefStructure='lantern-pool-glow';
          o.userData.reefGround=true;
          root.add(o);
        }else{
          // NoCanvas headless fallback: subtle vertex-blended cavern-slate floor sheen (never a harsh yellow sticker)
          var tri=[], n=18, rFb=r*.58;
          for(var a=0;a<n;a++){
            var a0=a*Math.PI*2/n, a1=(a+1)*Math.PI*2/n;
            tri.push([[x,z,1.06],[x+Math.cos(a0)*rFb,z+Math.sin(a0)*rFb,.98],[x+Math.cos(a1)*rFb,z+Math.sin(a1)*rFb,.98]]);
          }
          painted(tri,-.298,'#90aebc','lantern-pool-glow');
        }
        // Sculpted dark-slate cave pebbles & tiny crystal shards accenting the bioluminescent light pool
        var seed=Math.abs(Math.floor(x*7.3+z*5.1)), slates=['#42576e','#516a82','#3b4f64','#5c768e'];
        var shardPals=[['#f2cc70','#fff2be'],['#76f6ef','#e2ffff'],['#c2a4ff','#f0e6ff']];
        var nClust=r>=1.5?3:2;
        for(var ci=0;ci<nClust;ci++){
          var ang=(seed*.63+ci*(Math.PI*2/nClust)+.35)%(Math.PI*2);
          var dist=r*(r>=1.5?(.48+.14*(ci%2)):(.64+.12*(ci%2)));
          var px=x+Math.cos(ang)*dist, pz=z+Math.sin(ang)*dist;
          if(!outerClear(px,pz,2.35) || nearCavesBok(px,pz,1.55)) continue;
          pebble(px,-.30,pz,.16+.05*((seed+ci)%2),slates[(seed+ci)%slates.length]);
          var px2=px+Math.cos(ang+1.15)*.26, pz2=pz+Math.sin(ang+1.15)*.26;
          if(outerClear(px2,pz2,2.30) && !nearCavesBok(px2,pz2,1.50)){
            pebble(px2,-.30,pz2,.12+.03*(ci%2),slates[(seed+ci+2)%slates.length]);
          }
          if(r>=1.5 || ci===0){
            var sp=shardPals[(seed+ci)%shardPals.length];
            var sx=px+Math.cos(ang-.75)*.16, sz=pz+Math.sin(ang-.75)*.16;
            if(outerClear(sx,sz,2.35) && !nearCavesBok(sx,sz,1.55)){
              tinyShard(sx,sz,.26+.08*(ci%2),.055+.012*(ci%2),ang+.2,.22,sp[0],sp[1]);
              tinyShard(sx+Math.cos(ang+1.4)*.11,sz+Math.sin(ang+1.4)*.11,.17+.04*(ci%2),.038,ang+1.1,.30,shardPals[(seed+ci+1)%shardPals.length][0],shardPals[(seed+ci+1)%shardPals.length][1]);
            }
          }
        }
      }
      // M4-caves: Sculpted Crystal Echo-Shell Shrine replacing plain yellow box lanterns (s.obj with userData.glow).
      function buildEchoShrine(s,ox,oy,oz){
        var g=new T.Group(), faceY=Math.atan2(camSetup().cam.position.x-ox,camSetup().cam.position.z-oz);
        g.position.set(ox,oy,oz); g.rotation.y=faceY;
        function spPart(geo,col,px,py,pz,rx,ry,rz,kind){
          var o=mesh(geo,M(col),px,py,pz);
          if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
          if(kind) finish(o,kind);
          g.add(o); return o;
        }
        // Stepped beveled octagonal stone plinth + carved gold collar
        spPart(cyl(.64,.74,.20,8),'#6c889b',0,.10,0,0,Math.PI/8,0,'stone');
        spPart(cyl(.50,.58,.18,8),'#8ba8ba',0,.28,0,0,Math.PI/8,0,'stone');
        spPart(torus(.48,.038),'#e5bd64',0,.38,0,Math.PI/2,0,0,false);
        spPart(cyl(.40,.44,.08,8),'#a4c2d4',0,.41,0,0,Math.PI/8,0,'stone');
        // Arching luminous crystal ribs (4 sweeping faceted hex crystal ribs meeting at an ornate crown)
        [[-.36,.12,.22,'#7cf6ef'],[.36,.12,-.22,'#7cf6ef'],[-.28,-.26,.16,'#b8a6ff'],[.28,-.26,-.16,'#b8a6ff']].forEach(function(rb,ri){
          var rx0=rb[0], rz0=rb[1], lean=rb[2], col=rb[3];
          spPart(cyl(.085,.115,.62,6),col,rx0,.68,rz0,0,ri*.7,-lean*.85,false);
          spPart(cyl(.065,.09,.56,6),ri<2?'#b2fbff':'#d4c4ff',rx0*.82,1.18,rz0*.85,0,ri*.7,lean*1.35,false);
          spPart(cyl(.02,.065,.42,6),'#e8fdff',rx0*.36,1.54,rz0*.55,0,ri*.7,lean*2.2,false);
        });
        // Crown crystal crest spire
        spPart(cyl(0,.13,.38,6),'#d6fcff',0,1.82,-.04,0,0,0,false);
        spPart(cyl(.10,.13,.16,6),'#7ef6ee',0,1.62,-.04,0,0,0,false);
        // Carved golden spiral shell relief nestled behind the echo-orb
        var shellBack=spPart(cyl(.36,.40,.10,14),'#d9a544',0,.92,-.20,Math.PI/2,0,0,false); shellBack.scale.set(1.06,1,1.14);
        spPart(torus(.28,.048),'#f2ce74',0,.92,-.14,0,0,0,false);
        spPart(torus(.17,.040),'#e6b652',.04,.94,-.11,0,0,.6,false);
        spPart(torus(.08,.032),'#fff0b0',.01,.93,-.09,0,0,1.2,false);
        // Fluted scallop relief rays along the shell halo
        for(var sr=0;sr<7;sr++){
          var sa=(sr-3)*.34;
          spPart(cyl(.022,.038,.26,6),'#f0ca6c',Math.sin(sa)*.36,.94+Math.cos(sa)*.36,-.18,0,0,-sa,false);
        }
        // Concentric delicate brass acoustic ring around the floating orb
        spPart(torus(.28,.024),'#ebca72',0,.94,.06,.35,.22,0,false);
        // Two warm amber lantern crystal buds on the front plinth corners
        [-1,1].forEach(function(sd){
          spPart(cyl(.04,.06,.18,6),'#e5b95c',sd*.38,.44,.32,0,0,0,false);
          var bud=new T.Mesh(new T.SphereGeometry(.085,10,8),new T.MeshBasicMaterial({color:'#ffdf8c',fog:false}));
          bud.position.set(sd*.38,.56,.32); g.add(bud);
        });
        // Floating warm glowing echo-orb (unlit MeshBasicMaterial driven gently by board.js:1406)
        var echoOrb=new T.Mesh(new T.SphereGeometry(.20,16,12),new T.MeshBasicMaterial({color:'#ffe496',fog:false}));
        echoOrb.position.set(0,.94,.06); g.add(echoOrb);
        var coreGlow=new T.Mesh(new T.SphereGeometry(.11,12,8),new T.MeshBasicMaterial({color:'#fff8d6',fog:false}));
        coreGlow.position.set(0,.98,.12); g.add(coreGlow);
        if(typeof reef3dBakeObject==='function' && view.rig && view.bake) reef3dBakeObject(g,view.rig,view.bake);
        g.traverse(function(c){ c.userData.space=s.i; });
        g.userData.space=s.i; g.userData.glow=echoOrb;
        return g;
      }
      if(view.scene && view.hitables){
        var shrineCamIdx=cavesShopSp ? cavesShopSp.i : activeIdx;
        // Exact live MP8 follow camera for 09-caves ([5.5, 9.4, 4.2, 1.25]) so near-plane clipping check is 100% accurate!
        var mp8Cur=main[shrineCamIdx]||main[0], mp8Nxt=main[(shrineCamIdx+1)%main.length]||mp8Cur;
        var mDx=mp8Nxt.x-mp8Cur.x, mDz=mp8Nxt.z-mp8Cur.z, mL=Math.hypot(mDx,mDz)||1; mDx/=mL; mDz/=mL;
        var cavesMp8Cam=new T.PerspectiveCamera(42,1.6,.1,300);
        cavesMp8Cam.position.set(mp8Cur.x-mDx*9.4,5.5,mp8Cur.z-mDz*9.4);
        cavesMp8Cam.lookAt(mp8Cur.x+mDx*4.2,1.55,mp8Cur.z+mDz*4.2);
        cavesMp8Cam.updateMatrixWorld(true);
        function cavesMp8NDC(px,py,pz){ return new T.Vector3(px,py,pz).project(cavesMp8Cam); }
        sp.forEach(function(s){
          if(!s.obj || !s.obj.position) return;
          if(s.obj.userData && s.obj.userData.glow){
            var old=s.obj, ox=old.position.x, oy=old.position.y, oz=old.position.z;
            // MIN 8: Relocate any foreground Echo Shrine (notably deck[7] at (680-770, 540-640)) that clips
            // the opening MP8 camera's bottom/near plane cleanly out of the foreground clip zone while keeping it beside s!
            var ndBot=cavesMp8NDC(ox,oy,oz), ndTop=cavesMp8NDC(ox,oy+1.82,oz);
            var clipsNear=(ndBot.z>-1 && ndBot.z<1 && ndBot.y<-0.66 && ndBot.x>0.15 && ndBot.x<0.95) ||
                          (ndTop.z>-1 && ndTop.z<1 && ndTop.y<-0.45 && ndBot.y<-0.95 && ndTop.x>0.15);
            if(clipsNear){
              var moved=false;
              // Search radial spots around space s (r = 2.55..3.60) that sit cleanly behind/below the opening viewport
              for(var rTry=2.55;rTry<=3.65 && !moved;rTry+=0.28){
                for(var aTry=0;aTry<16 && !moved;aTry++){
                  var angT=aTry*Math.PI*2/16, tx=s.x+Math.cos(angT)*rTry, tz=s.z+Math.sin(angT)*rTry;
                  if(!outerClear(tx,tz,2.30)) continue;
                  var nT=cavesMp8NDC(tx,oy+1.85,tz);
                  if(nT.y<-1.15 || nT.z>1 || nT.z<-1 || Math.abs(nT.x)>1.20){
                    ox=tx; oz=tz; moved=true;
                  }
                }
              }
            }
            view.scene.remove(old);
            var hIdx=view.hitables.indexOf(old); if(hIdx>=0) view.hitables.splice(hIdx,1);
            var shrine=buildEchoShrine(s,ox,oy,oz);
            view.scene.add(shrine); view.hitables.push(shrine); s.obj=shrine;
            goldPool(ox,oz,1.85);
            addObstacle(ox,oz,1.15);
            caveClaims.push([ox,oz]);
          }else{
            addObstacle(s.obj.position.x,s.obj.position.z,.85);
          }
        });
      }
      // Sculpted faceted acoustic crystal resonance lantern on a stepped hex limestone plinth (cached, replaces beige dome!)
      function echoLantern(x,y,z,rot){
        emitCached('caveEchoLantern', x, y, z, rot || 0, 1, function(){
          add(cyl(.44,.56,.22,6),'#506d86',0,.11,0,0,0,0,'stone');
          add(cyl(.34,.40,.10,6),'#6b8ba4',0,.26,0,0,0,0,'stone');
          add(cyl(.28,.32,.06,6),'#e4bd66',0,.34,0,0,0,0,false);
          // Faceted hexagonal crystal lantern prism core + glowing golden-aqua heart + bronze resonance rings
          add(cyl(.22,.26,.46,6),'#6ef4ec',0,.58,0,0,0,0,false);
          add(cyl(0,.22,.28,6),'#d6ffff',0,.95,0,0,0,0,false);
          add(smoothTorus(.36,.028,6,18),'#eab956',0,.62,0,Math.PI/2,0,0,false);
          add(smoothTorus(.44,.020,6,18),'#7efaf4',0,.62,0,Math.PI/2+.35,0,.22,false);
          // 3 delicate flanking mini-crystal chimes around the plinth
          for(var ci=0;ci<3;ci++){
            var ca=ci*2.094+.4;
            add(cyl(.045,.060,.36,6),ci%2?'#c7a8ff':'#ffe082',Math.cos(ca)*.32,.50,Math.sin(ca)*.32,0,ca,0,false);
          }
          orb(.14,'#fff4be',0,.60,0,false);
        });
        addObstacle(x,z,.8);
      }
      function mushrooms(x,y,z,i){
        var v=Math.abs(i|0)%4;
        emitCached('caveMush:' + v, x, y, z, (i||0)*.6, 1, function(){
          var caps=['#6ef7dc','#cfaaff','#ffa8d8','#8ee4ff'];
          add(cyl(.62,.76,.14,8),'#6d8aa0',0,.05,0,0,0,0,'stone');
          for(var j=0;j<5;j++){
            var a=j*1.32+v, dd=j===0?.05:.28+.24*(j%2), h=(j===0?.62:.34)+.18*((j+v)%3), r=(j===0?.28:.18)+.06*(j%3),
                mx=Math.cos(a)*dd, mz=Math.sin(a)*dd;
            add(cyl(r*.30,r*.44,h,8),'#f4eedc',mx,h/2+.06,mz,0,0,0,false);
            var cp=smoothOrb(r,caps[(j+v)%4],mx,h+.06,mz,false); cp.scale.set(1.06,.58,1.06);
            orb(r*.24,'#ffffff',mx+r*.28,h+r*.36,mz,false);
            orb(r*.16,'#e8ffff',mx-r*.26,h+r*.28,mz+r*.15,false);
          }
          orb(.08,'#b6fff4',.45,.14,.35,false);
        });
      }
      // Faceted crystalline mineral cluster on a stepped hex quartz base (cached composite!)
      function mineralCluster(x,y,z,scale,palIdx){
        var k=scale||1, pi=Math.abs(palIdx||0)%4;
        emitCached('caveMinCluster:' + pi, x, y, z, (palIdx||0)*.5, k, function(){
          var pals=[['#7af6ee','#c4a8ff','#d6fcff'],['#c7a8ff','#7af6ee','#f0e2ff'],['#6ef2cf','#ffd87e','#d8fff4'],['#ffb2dc','#8ee6ff','#fff0f8']];
          var pal=pals[pi];
          add(cyl(.78,.96,.28,6),'#6b889c',0,.14,0,0,0,0,'stone');
          add(cyl(.54,.72,.24,6),'#88a7ba',.08,.34,-.06,0,.4,0,'stone');
          crystal(0,.36,0,1.05,pal[0]);
          crystal(.52,.18,.34,.68,pal[1]);
          crystal(-.48,.16,-.28,.56,pal[2]);
        });
        addObstacle(x,z,.98*k);
      }
      // Stepped terraced mineral spire crowned with glowing crystals (cached composite!)
      function mineralSpire(x,y,z,scale,col){
        var k=scale||1, cc=col||'#7ef8f0';
        emitCached('caveMinSpire:' + cc, x, y, z, x*.3, k, function(){
          add(cyl(.88,1.12,.55,6),'#6a889d',0,.27,0,0,0,0,'stone');
          add(cyl(.64,.84,.75,6),'#84a4b8',.06,.88,-.04,0,.5,0,'stone');
          add(cyl(.40,.60,.72,6),'#a4c4d6',-.04,1.56,.05,0,1.0,0,'stone');
          crystal(0,1.82,0,.82,cc);
          crystal(.58,.55,.32,.52,'#c8abff');
        });
        addObstacle(x,z,1.1*k);
      }
      function geode(x,y,z,i){
        var v=Math.abs(i|0)%2;
        emitCached('caveGeode:' + v, x, y, z, (i||0)*.7, 1, function(){
          add(cyl(.68,.84,.34,6),'#6c889b',0,.16,0,0,0,0,'stone');
          add(cyl(.48,.56,.10,6),'#3c5e75',0,.35,0,0,0,0,false);
          crystal(0,.32,0,.68,v?'#c2a8ff':'#7bf6ee');
          crystal(.48,.06,-.22,.38,'#d4fcff');
        });
        addObstacle(x,z,.95);
      }
      function mineralPool(x,y,z,i){
        emitCached('caveMinPool:' + (Math.abs(i|0)%2), x, y, z, (i||0)*1.0, 1, function(){
          add(cyl(.95,1.10,.14,14),'#7c98ad',0,.02,0,0,0,0,'stone');
          for(var j=0;j<8;j++){
            var a=j*Math.PI*2/8, rr=.88+.08*(j%2);
            var st=smoothOrb(.24+(j%2)*.06,j%2?'#92aebf':'#738fa3',Math.cos(a)*rr,.12,Math.sin(a)*rr*.92,'stone');
            st.scale.set(1.15,.62,1.0);
          }
          add(cyl(.76,.80,.06,16),'#6ff0ec',0,.10,0,0,0,0,false);
          add(cyl(.44,.48,.04,16),'#c2fff6',-.08,.14,.04,0,0,0,false);
          orb(.12,'#f6ffff',.28,.20,-.16,false);
          pebble(.2,.16,.25,.14,'#c2f4ee');
        });
        addObstacle(x,z,1.35);
      }
      function bandProp(kind,x,y,z,i,sd){
        if(kind===0) geode(x,y,z,i);
        else if(kind===1) mushrooms(x,y,z,i);
        else if(kind===2){
          // m18: Keep stone tidepool rings clear of Echo's deck space!
          if(nearEcho(x,z,5.6)) mushrooms(x,y,z,i);
          else mineralPool(x,y,z,i);
        }else echoLantern(x,y,z,i*.8+(sd<0?Math.PI:0));
      }
      // m17: Guarantee 3 warm golden lantern pools visibly along the active path (+ 3 on the opposite arc so every entry view glows warmly!)
      function placeGoldPoolsForCam(camIdx,want){
        var cands=[], placedPools=[];
        main.forEach(function(s,i){
          [1,-1].forEach(function(sd){
            [4.2,5.0].forEach(function(dd){
              placed(s,sd,dd,0,function(x,y,z){
                if(nearEcho(x,z,4.8) || !outerClear(x,z,3.4)) return;
                var nd=camNDCAt(camIdx,x,-.25,z);
                if(nd.x<-.82 || nd.x>.82 || nd.y<-.68 || nd.y>.66 || nd.z>1) return;
                cands.push({x:x,y:y,z:z,sd:sd,nd:nd,sc:Math.abs(nd.x-(sd>0?.32:-.32))+Math.abs(nd.y-.05)});
              });
            });
          });
        });
        cands.sort(function(a,b){ return a.sc-b.sc; });
        // Pick nicely staggered across left/right/mid-far in NDC
        var targets=[[-.36,-.12],[.36,.18],[-.26,.42]];
        targets.forEach(function(tg,tIdx){
          if(placedPools.length>=want) return;
          var best=null;
          cands.forEach(function(c){
            if(placedPools.some(function(p){ return Math.hypot(p[0]-c.x,p[1]-c.z)<5.2; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(best && caveClaim(best.c.x,best.c.z,3.2,3.4)){
            goldPool(best.c.x,best.c.z,2.55);
            echoLantern(best.c.x,best.c.y,best.c.z,tIdx*1.4);
            placedPools.push([best.c.x,best.c.z]);
          }
        });
      }
      placeGoldPoolsForCam(activeIdx,3);
      var altCaveIdx=(activeIdx+Math.floor(main.length/2))%main.length;
      placeGoldPoolsForCam(altCaveIdx,3);
      if(activeIdx!==0) placeGoldPoolsForCam(0,2);
      // Cavern floor polygons shared by Echo's backdrop arch, tufts, outer water crystals & lower-left foreground grotto.
      var cavePoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*5.3,s.z+f.nz*5.3]; });
      var caveShorePoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*6.45,s.z+f.nz*6.45]; });
      var caveOuterPoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*6.8,s.z+f.nz*6.8]; });
      function ptInPoly(poly,x,z){
        var inside=false;
        for(var a=0,b=poly.length-1;a<poly.length;b=a++){
          var xi=poly[a][0],zi=poly[a][1],xj=poly[b][0],zj=poly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) inside=!inside;
        }
        return inside;
      }
      function inCave(x,z){ return ptInPoly(cavePoly,x,z); }
      function inCaveShore(x,z){ return ptInPoly(caveShorePoly,x,z); }
      function inCaveShelf(x,z){ return ptInPoly(caveOuterPoly,x,z); }
      function distToPolyEdge(poly,x,z){
        var md=Infinity;
        for(var a=0;a<poly.length;a++){
          var p1=poly[a], p2=poly[(a+1)%poly.length], vx=p2[0]-p1[0], vz=p2[1]-p1[1];
          var t=Math.max(0,Math.min(1,((x-p1[0])*vx+(z-p1[1])*vz)/(vx*vx+vz*vz||1)));
          md=Math.min(md,Math.hypot(x-(p1[0]+vx*t),z-(p1[1]+vz*t)));
        }
        return md;
      }
      // M4 assist / iter18 m4: Smoothly sculpted, layered satin cavern grotto arch with rounded mineral strata &
      // luminous amethyst/aqua crystal inlays framing Echo with crisp figure-ground contrast (zero faceted blocks!).
      // Placed AFTER bandProp so Bok's stall stays cleanly at its left-side cavern kiosk spot and Echo locks at (-15.85, -15.25).
      var shopSp=sp.find(function(s){ return s.kind==='shop'; }) || echoDeck || main[0];
      // iter24 m1: Keep Echo's grotto head-backdrop sightline free of background geodes/crystals
      // so Echo's white head silhouette sits cleanly against uninterrupted dark-indigo grotto backdrop.
      var echoBackdropInfo=null;
      if(shopSp){
        var fsB=frame(shopSp);
        var exB=shopSp.x+fsB.nx*4.85-fsB.tx*1.0, ezB=shopSp.z+fsB.nz*4.85-fsB.tz*1.0;
        var camShopB=camSetupAt(shopSp.i).cam;
        var rdxB=exB-camShopB.position.x, rdzB=ezB-camShopB.position.z, rLB=Math.hypot(rdxB,rdzB)||1;
        var uxB=rdxB/rLB, uzB=rdzB/rLB;
        echoBackdropInfo={ ex:exB, ez:ezB, ux:uxB, uz:uzB, lx:-uzB, lz:uxB };
      }
      function nearEchoHeadBackdrop(x,z){
        if(!echoBackdropInfo) return false;
        var dx=x-echoBackdropInfo.ex, dz=z-echoBackdropInfo.ez;
        if(Math.hypot(dx,dz)<3.3) return true;
        var along=dx*echoBackdropInfo.ux+dz*echoBackdropInfo.uz;
        var across=Math.abs(dx*echoBackdropInfo.lx+dz*echoBackdropInfo.lz);
        return along>-.6 && along<3.8 && across<2.2;
      }
      function buildEchoBackdropArch(){
        if(!shopSp) return;
        var fs=frame(shopSp);
        // Echo's foreground standing anchor beside sp[7]/sp[8] (lands at (-16.01, -16.10) on production 09-caves)
        var ex=shopSp.x+fs.nx*4.85-fs.tx*1.0, ez=shopSp.z+fs.nz*4.85-fs.tz*1.0;
        var camShop=camSetupAt(shopSp.i).cam;
        var rdx=ex-camShop.position.x, rdz=ez-camShop.position.z, rL=Math.hypot(rdx,rdz)||1;
        var ux=rdx/rL, uz=rdz/rL; // camera -> Echo sightline direction
        var toCamX=-ux, toCamZ=-uz, archYaw=Math.atan2(toCamX,toCamZ);
        // Local +X in world when group.rotation.y = archYaw: (cos(yaw), 0, -sin(yaw)) = (toCamZ, 0, -toCamX)
        var lx=toCamZ, lz=-toCamX;
        // Place arch 3.78u behind Echo along sightline, nudged +0.25u seaward along local +X so arch & pillars stay >= 3.25u clear of Echo and clear of obs[53]
        var ax=ex+ux*3.78+lx*.25, az=ez+uz*3.78+lz*.25;
        if(!outerClear(ax,az,3.2)) return;
        // 1. Smoothly contoured layered satin mineral grotto floor terrace underneath Echo (strictly inside caveShorePoly, zero sharp jagged polygon corners!)
        function grottoApronRing(cxA,czA,rxA,rzA,yA,colA,tagA){
          var n=40, radii=[];
          for(var ai=0;ai<n;ai++){
            var a=ai*Math.PI*2/n, wob=1+.045*Math.sin(a*3+.7)+.028*Math.cos(a*5-.4);
            var dxA=(lx*Math.cos(a)*rxA+toCamX*Math.sin(a)*rzA)*wob;
            var dzA=(lz*Math.cos(a)*rxA+toCamZ*Math.sin(a)*rzA)*wob;
            // Smooth binary search keeps every vertex cleanly inside caveShorePoly without choppy discrete steps
            var lo=0, hi=1;
            if(!inCaveShore(cxA+dxA,czA+dzA) || distToPolyEdge(caveShorePoly,cxA+dxA,czA+dzA)<.18){
              for(var bs=0;bs<10;bs++){
                var mid=(lo+hi)*.5, tx=cxA+dxA*mid, tz=czA+dzA*mid;
                if(inCaveShore(tx,tz) && distToPolyEdge(caveShorePoly,tx,tz)>=.18) lo=mid; else hi=mid;
              }
            }else{ lo=1; }
            radii.push(lo);
          }
          // 2-pass circular smoothing eliminates any abrupt kink where the terrace meets the cavern shore curve
          for(var sp2=0;sp2<2;sp2++){
            var sm=radii.slice();
            for(var si=0;si<n;si++){
              sm[si]=Math.min(radii[si], (radii[(si+n-1)%n]+radii[si]*2+radii[(si+1)%n])*.25);
            }
            radii=sm;
          }
          var pts=[];
          for(var ai2=0;ai2<n;ai2++){
            var a2=ai2*Math.PI*2/n, wob2=1+.045*Math.sin(a2*3+.7)+.028*Math.cos(a2*5-.4), t2=radii[ai2];
            var px=cxA+(lx*Math.cos(a2)*rxA+toCamX*Math.sin(a2)*rzA)*wob2*t2;
            var pz=czA+(lz*Math.cos(a2)*rxA+toCamZ*Math.sin(a2)*rzA)*wob2*t2;
            if(inCaveShore(px,pz)) pts.push([px,pz,1]);
          }
          if(pts.length<3) return;
          var tris=[];
          for(var ti=0;ti<pts.length;ti++){
            tris.push([[cxA,czA,1],pts[ti],pts[(ti+1)%pts.length]]);
          }
          painted(tris,yA,colA,tagA);
        }
        // MAJ 6: Luminous dark-indigo & bioluminescent cyan subterranean grotto pool centered directly
        // beneath Echo's live MP8 position (-18.50, -6.00) flush on top of the cavern floor (deckY = -0.320),
        // giving Echo high figure-ground contrast and unmistakable grounded water contact!
        if(inCaveShore(echoPoolX,echoPoolZ)){
          grottoApronRing(echoPoolX,echoPoolZ,3.10,2.58,-.308,'#3f7b96','echo-grotto-pool-rim');
          grottoApronRing(echoPoolX,echoPoolZ,2.72,2.24,-.303,'#234b6e','echo-grotto-pool-mid');
          grottoApronRing(echoPoolX,echoPoolZ,2.06,1.68,-.298,'#163352','echo-grotto-pool-deep');
          // Glowing cyan bioluminescent ripple rings floating cleanly above the dark grotto pool
          var echoRip1=add(smoothTorus(2.26,.044,6,32),'#58e0f0',echoPoolX,-.293,echoPoolZ,Math.PI/2,0,0,false);
          echoRip1.scale.set(1.06,1,.88); echoRip1.userData.reefGround=true; echoRip1.userData.reefStructure='echo-grotto-pool-sheen';
          var echoRip2=add(smoothTorus(1.52,.038,6,28),'#7ef6ff',echoPoolX,-.292,echoPoolZ,Math.PI/2,0,0,false);
          echoRip2.scale.set(1.04,1,.90); echoRip2.userData.reefGround=true; echoRip2.userData.reefStructure='echo-grotto-pool-sheen';
          var echoRip3=add(smoothTorus(.88,.032,6,24),'#bdfcff',echoPoolX,-.291,echoPoolZ,Math.PI/2,0,0,false);
          echoRip3.userData.reefGround=true; echoRip3.userData.reefStructure='echo-grotto-pool-sheen';
          // Low sculpted dark-slate rim stones ringing the outer pool edge (zero crystals inside Echo's glowing pool halo!)
          for(var er=0;er<10;er++){
            var era=er*Math.PI*2/10+.25, erx=echoPoolX+Math.cos(era)*2.78, erz=echoPoolZ+Math.sin(era)*2.28;
            if(!inCaveShore(erx,erz) || !outerClear(erx,erz,2.35)) continue;
            var ers=smoothOrb(er%2?.22:.17,er%2?'#3d5a74':'#4f708c',erx,-.29,erz,'stone');
            ers.scale.set(1.22,.44,1.04); ers.userData.reefGround=true;
          }
          caveClaims.push([echoPoolX,echoPoolZ]);
        }
        // MIN-6: Sculpted bioluminescent mineral-crystal terraced sanctuary base beneath Echo Caves' Chime Booth
        // (replaces the clunky rectangular beige sandstone blocks; zero addObstacle so stall/Bok/Echo stay locked!).
        var kx=shopSp.x-1.0, kz=shopSp.z-4.0;
        if(inCaveShore(kx,kz) && outerClear(kx,kz,2.5)){
          // Dark luminous indigo-slate grotto pool & glowing turquoise rim framing the sculpted crystal-booth terrace
          grottoApronRing(kx,kz,3.15,2.68,-.306,'#428ea4','kiosk-grotto-pool-sheen');
          grottoApronRing(kx,kz,2.82,2.40,-.302,'#223c58','kiosk-grotto-pool-deep');
          grottoApronRing(kx,kz,2.30,1.94,-.298,'#1a2f48','kiosk-grotto-pool-core');
          var kRip=add(smoothTorus(2.26,.038,6,28),'#62ebf2',kx,-.294,kz,Math.PI/2,0,0,false);
          kRip.scale.set(1.06,1,.88); kRip.userData.reefGround=true; kRip.userData.reefStructure='kiosk-grotto-pool-sheen';
          function plinthTag(o){ o.userData.reefStructure='caves-kiosk-plinth'; return o; }
          // Tier 1: Smooth sculpted dark-indigo basalt elliptical sanctuary base (zero blocky rectangular steps!)
          var t1=plinthTag(add(cyl(1.64,1.88,.18,20),'#2a4158',kx,-.23,kz,0,0,0,'stone'));
          t1.scale.set(1.14,1,.88);
          // Tier 2: Smooth beveled luminous mineral-slate upper terrace meeting booth base flush at y = 0.00
          var t2=plinthTag(add(cyl(1.42,1.56,.14,20),'#3c5d78',kx,-.07,kz,0,0,0,'stone'));
          t2.scale.set(1.12,1,.86);
          // Glowing bioluminescent cyan-aqua inlay ring hugging the upper terrace lip
          var tRing=plinthTag(add(smoothTorus(1.46,.036,8,32),'#6ef4ee',kx,-.01,kz,Math.PI/2,0,0,false));
          tRing.scale.set(1.12,1,.86);
          var tRing2=plinthTag(add(smoothTorus(1.70,.032,6,32),'#9e88f4',kx,-.15,kz,Math.PI/2,0,0,false));
          tRing2.scale.set(1.13,1,.88);
          // Curved organic slate entrance stepping stones on +Z & camera-facing +X flanks
          [[0, 1.38, .72, .12, .34], [0, 1.66, .58, .09, .26], [1.66, 0, .34, .12, .62], [1.96, 0, .26, .09, .48]].forEach(function(st, si){
            var sDisc=plinthTag(add(cyl(1,1.08,st[3],14),si%2?'#36526c':'#4a6c86',kx+st[0],-.25+(si%2===0?.09:.02),kz+st[1],0,0,0,'stone'));
            sDisc.scale.set(st[2],1,st[4]);
          });
          // Four faceted bioluminescent quartz & amethyst crystal clusters framing the curved sanctuary terrace corners
          [[-1.38,-.78,'#6cf4ec',1],[1.38,-.78,'#be9aff',0],[-1.36,.82,'#be9aff',0],[1.36,.82,'#6cf4ec',1]].forEach(function(cc, ci){
            var cxK=kx+cc[0], czK=kz+cc[1];
            var baseP=plinthTag(smoothOrb(.22,'#344e66',cxK,-.12,czK,'stone')); baseP.scale.set(1.15,.52,1.10);
            plinthTag(add(cyl(.065,.095,.42,6),cc[2],cxK,.08,czK,(ci%2?.14:-.12),ci*.9,(ci<2?-.14:.14),false));
            plinthTag(add(cyl(0,.065,.14,6),'#e8ffff',cxK+(ci<2?-.04:.04),.34,czK+(ci%2?.04:-.04),(ci%2?.14:-.12),ci*.9,(ci<2?-.14:.14),false));
            plinthTag(add(cyl(.045,.068,.26,6),ci%2?'#ffe080':'#8cfcf4',cxK+(ci%2?.14:-.14),0,czK+(ci<2?-.10:.10),-.16,ci*1.4,.18,false));
          });
          // Smooth dark cavern pebbles & glowing mineral drops bedding the sanctuary terrace naturally
          [
            [-1.78,-.56,.28,1.20,.42,1.00,'#3b566e'],
            [ 1.56,-.94,.26,1.18,.40,.96,'#44627a'],
            [-.62,-1.32,.30,1.24,.44,.94,'#344f68'],
            [ .72,-1.28,.24,1.18,.40,.92,'#496982']
          ].forEach(function(rk){
            var rxR=kx+rk[0], rzR=kz+rk[1];
            if(!inCaveShore(rxR,rzR) || distToPolyEdge(caveShorePoly,rxR,rzR)<.22) return;
            var b=smoothOrb(rk[2],rk[6],rxR,-.31+rk[2]*rk[4]*.65,rzR,'stone');
            b.scale.set(rk[3],rk[4],rk[5]);
            plinthTag(b);
          });
        }
        // MIN-6: Upgrade Echo Caves' bottom-right stall (built immediately afterward by regionPeopleBuild)
        // from a boxy striped wooden slab into a sculpted Bioluminescent Crystal-Archway Chime Booth!
        if(typeof regionPeopleBuild === 'function' && !regionPeopleBuild._cavesChimeBoothWrapped){
          var origRegionPeopleBuild = regionPeopleBuild;
          regionPeopleBuild = function(v){
            var res = origRegionPeopleBuild.apply(this, arguments);
            if(v && v.region && v.region.id === 'caves' && v.regionPeople && v.regionPeople.stall && window.THREE){
              (function buildBioluminescentChimeBooth(v2, stallGrp){
                var T2 = window.THREE, kitM = v2.kit && v2.kit.M, kitMesh = v2.kit && v2.kit.mesh;
                if(!kitM || !kitMesh) return;
                while(stallGrp.children.length) stallGrp.remove(stallGrp.children[0]);
                var bOpaque = new T2.Group(), bGlow = new T2.Group();
                var upV = new T2.Vector3(0, 1, 0), tmpV = new T2.Vector3();
                function bAdd(geo, col, px, py, pz, rx, ry, rz, kind, sx, sy, sz){
                  var o = kitMesh(geo, kitM(col), px, py, pz);
                  if(rx) o.rotation.x = rx; if(ry) o.rotation.y = ry; if(rz) o.rotation.z = rz;
                  if(sx !== undefined) o.scale.set(sx, sy, sz);
                  if(kind && typeof window.reef3dSurface === 'function') window.reef3dSurface(o, kind, { scale: 2, seed: Math.abs(px * .7 + pz * .9) % 7 });
                  bOpaque.add(o); return o;
                }
                function bLimb(x0, y0, z0, x1, y1, z1, r0, r1, col, segs){
                  var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz) || .01;
                  tmpV.set(dx / len, dy / len, dz / len);
                  var o = kitMesh(new T2.CylinderGeometry(r1, r0, len, segs || 8), kitM(col), (x0 + x1) * .5, (y0 + y1) * .5, (z0 + z1) * .5);
                  o.quaternion.setFromUnitVectors(upV, tmpV);
                  bOpaque.add(o); return o;
                }
                function gAdd(geo, col, px, py, pz, rx, ry, rz, op){
                  var mat = new T2.MeshBasicMaterial({ color: col, transparent: op != null && op < 1, opacity: op != null ? op : 1, depthWrite: !(op != null && op < 1) });
                  var o = new T2.Mesh(geo, mat);
                  o.position.set(px, py, pz);
                  if(rx) o.rotation.x = rx; if(ry) o.rotation.y = ry; if(rz) o.rotation.z = rz;
                  bGlow.add(o); return o;
                }
                // 1. Sculpted rounded-octagonal obsidian-slate & glowing crystal-inlaid counter (y = 0..0.98)
                bAdd(new T2.CylinderGeometry(1.06, 1.18, .15, 14), '#273a50', 0, .075, 0, 0, 0, 0, 'stone', 1.04, 1, .68);
                bAdd(new T2.CylinderGeometry(.96, 1.02, .72, 14), '#344f6b', 0, .50, 0, 0, 0, 0, 'stone', 1.04, 1, .66);
                // Luminous bioluminescent crystal inlay stripes & sculpted brass trim bands around the curved counter
                bAdd(new T2.TorusGeometry(1.02, .034, 8, 24), '#e8c260', 0, .18, 0, Math.PI / 2, 0, 0, false, 1.04, .67, 1);
                bAdd(new T2.TorusGeometry(.99, .032, 8, 24), '#6ef6ee', 0, .84, 0, Math.PI / 2, 0, 0, false, 1.04, .67, 1);
                for(var ci = 0; ci < 8; ci++){
                  var ca = ci * Math.PI / 4 + Math.PI / 8;
                  var cpx = Math.cos(ca) * 1.02, cpz = Math.sin(ca) * .65;
                  bAdd(new T2.CylinderGeometry(.045, .062, .44, 6), ci % 2 ? '#6cf4ee' : '#be9cff', cpx, .50, cpz, 0, -ca, 0, false);
                }
                // Beveled luminous moonstone counter slab (top surface y = 0.98)
                bAdd(new T2.CylinderGeometry(1.12, 1.04, .10, 16), '#8ac4d4', 0, .93, 0, 0, 0, 0, 'stone', 1.05, 1, .70);
                gAdd(new T2.TorusGeometry(1.12, .024, 6, 28), '#8efcf6', 0, .95, 0, Math.PI / 2, 0, 0, .82).scale.set(1.05, .70, 1);
                // Countertop sculpted crystal resonance cluster + glowing acoustic amber chime bell
                bAdd(new T2.CylinderGeometry(.30, .24, .08, 10), '#2d465e', -.44, 1.02, .08, 0, 0, 0, 'stone');
                [[0, 0, .42, .072, '#78fff5', 0, 0], [-.13, .08, .30, .054, '#cba6ff', .20, .24], [.13, .06, .32, .056, '#96ffee', -.16, -.22], [.02, -.10, .26, .048, '#ffe078', .22, -.10]].forEach(function(cr){
                  bAdd(new T2.CylinderGeometry(cr[3] * .75, cr[3], cr[2], 6), cr[4], -.44 + cr[0], 1.05 + cr[2] / 2, .08 + cr[1], cr[5], 0, cr[6], false);
                  bAdd(new T2.CylinderGeometry(0, cr[3] * .75, .12, 6), '#f0ffff', -.44 + cr[0] - Math.sin(cr[6]) * cr[2] * .48, 1.05 + cr[2] + .05, .08 + cr[1] + Math.sin(cr[5]) * cr[2] * .48, cr[5], 0, cr[6], false);
                });
                bAdd(new T2.CylinderGeometry(.24, .28, .12, 10), '#354f68', .42, 1.04, .10, 0, 0, 0, 'stone');
                bAdd(new T2.SphereGeometry(.17, 12, 8), '#ffd262', .42, 1.18, .10, 0, 0, 0, false);
                gAdd(new T2.SphereGeometry(.11, 8, 6), '#fff8cf', .42, 1.22, .12, 0, 0, 0, .92);

                // 2. Four Faceted Quartz & Amethyst Corner Pillars with Brass Lotus Sockets & Sprouting Crystal Clusters!
                [[-.86, .46, '#70f2ee'], [.86, .46, '#c49eff'], [-.86, -.46, '#c49eff'], [.86, -.46, '#70f2ee']].forEach(function(pl, pi){
                  var px = pl[0], pz = pl[1], pCol = pl[2];
                  // Carved brass & dark-slate base socket + capital collar
                  bAdd(new T2.CylinderGeometry(.13, .16, .12, 8), '#30475e', px, 1.02, pz, 0, 0, 0, 'stone');
                  bAdd(new T2.CylinderGeometry(.125, .125, .05, 8), '#ecc460', px, 1.09, pz, 0, 0, 0, false);
                  // Faceted hexagonal quartz/amethyst pillar shaft
                  bAdd(new T2.CylinderGeometry(.078, .102, 1.12, 6), pCol, px, 1.66, pz, 0, pi * .5, 0, false);
                  bAdd(new T2.CylinderGeometry(.13, .09, .10, 8), '#ecc460', px, 2.24, pz, 0, 0, 0, false);
                  // Sprouting faceted side crystal shards at each pillar base
                  var sdX = px > 0 ? 1 : -1, sdZ = pz > 0 ? 1 : -1;
                  bAdd(new T2.CylinderGeometry(.032, .056, .34, 6), pi % 2 ? '#8efcf6' : '#d6b4ff', px + sdX * .10, 1.18, pz + sdZ * .06, sdZ * .24, 0, -sdX * .28, false);
                  bAdd(new T2.CylinderGeometry(0, .032, .10, 6), '#f2ffff', px + sdX * .16, 1.38, pz + sdZ * .10, sdZ * .24, 0, -sdX * .28, false);
                });

                // 3. Curved Bioluminescent Glowing Coral-Archway Eaves Canopy (NO flat striped slab!)
                var archSegs = 12, spanX = .98, baseY = 2.12, archH = .46;
                // Front & Rear glowing arched coral-crystal ribs + graceful side archway curves
                [-.48, .48].forEach(function(az, zi){
                  for(var ai = 0; ai < archSegs; ai++){
                    var t0 = ai / archSegs, t1 = (ai + 1) / archSegs;
                    var a0 = Math.PI * (1 - t0), a1 = Math.PI * (1 - t1);
                    var x0 = Math.cos(a0) * spanX, y0 = baseY + Math.sin(a0) * archH;
                    var x1 = Math.cos(a1) * spanX, y1 = baseY + Math.sin(a1) * archH;
                    bLimb(x0, y0, az, x1, y1, az, .072, .072, zi ? '#4ed2d8' : '#3d7694', 8);
                    // Glowing aqua-cyan bioluminescent underside rim vein
                    gAdd(new T2.SphereGeometry(.046, 6, 5), zi ? '#8efcf6' : '#b8a2ff', (x0 + x1) * .5, (y0 + y1) * .5 - .05, az, 0, 0, 0, .88);
                  }
                });
                // Side curved arch ribs bridging front & rear quartz pillars
                [-.86, .86].forEach(function(ax){
                  for(var si = 0; si < 6; si++){
                    var u0 = si / 6, u1 = (si + 1) / 6;
                    var z0 = -.48 + u0 * .96, z1 = -.48 + u1 * .96;
                    var y0 = baseY + .06 + Math.sin(u0 * Math.PI) * .20;
                    var y1 = baseY + .06 + Math.sin(u1 * Math.PI) * .20;
                    bLimb(ax, y0, z0, ax, y1, z1, .060, .060, '#5accd4', 7);
                  }
                });
                // Curved scalloped glowing coral-shell eave roof arching cleanly across the twin crystal arches!
                var roofCols = ['#2a5c78', '#3c88a2', '#52b8c6', '#72d8dc', '#52b8c6', '#3c88a2', '#2a5c78'];
                for(var ri = 0; ri < 7; ri++){
                  var tu = (ri + .5) / 7, angR = Math.PI * (1 - tu);
                  var rx = Math.cos(angR) * (spanX + .06), ry = baseY + .05 + Math.sin(angR) * (archH + .06);
                  var tiltZ = -(angR - Math.PI * .5);
                  // Curved organic coral rib petal spanning front-to-back with flared scalloped front/back eave tips
                  bAdd(new T2.BoxGeometry(.36, .09, 1.38), roofCols[ri], rx, ry, 0, 0, 0, tiltZ, 'coral');
                  [-.70, .70].forEach(function(ez){
                    var scBall = bAdd(new T2.SphereGeometry(.16, 10, 7), ri % 2 ? '#6cf2ec' : '#9f8cf4', rx, ry - .04, ez, 0, 0, 0, false, 1.05, .44, .75);
                    scBall.rotation.z = tiltZ;
                  });
                }
                // Bioluminescent crystal crown finial & crescent coral crest atop the archway apex!
                bAdd(new T2.CylinderGeometry(.15, .22, .08, 8), '#ecc460', 0, baseY + archH + .12, 0, 0, 0, 0, false);
                bAdd(new T2.CylinderGeometry(.040, .082, .26, 6), '#7cfcf4', 0, baseY + archH + .28, 0, 0, 0, 0, false);
                bAdd(new T2.CylinderGeometry(0, .040, .11, 6), '#f2ffff', 0, baseY + archH + .46, 0, 0, 0, 0, false);
                [-.18, .18].forEach(function(fx){
                  bAdd(new T2.CylinderGeometry(.025, .048, .19, 6), '#cba8ff', fx, baseY + archH + .22, 0, 0, 0, fx > 0 ? -.42 : .42, false);
                });

                // 4. Suspended Crystal Wind-Chimes dangling delicately beneath the front & camera-facing glowing eaves!
                var chimeSpecs = [
                  // Front archway chimes (graduated musical chord!)
                  [-.56, .58, .32, '#7efcf6'], [-.30, .58, .44, '#d2b2ff'], [0, .58, .52, '#ffe684'],
                  [ .30, .58, .42, '#7efcf6'], [ .56, .58, .30, '#b4f8ff'],
                  // Camera-facing +X archway chimes (clearly visible from 09-echo-caves 3/4 view!)
                  [ .94, -.22, .36, '#7efcf6'], [ .94, .22, .44, '#d2b2ff']
                ];
                chimeSpecs.forEach(function(ch){
                  var cxC = ch[0], czC = ch[1], cLen = ch[2], cCol = ch[3];
                  var topY = Math.abs(cxC) > .85
                    ? (baseY + .06 + Math.sin(((czC + .48) / .96) * Math.PI) * .18)
                    : (baseY + Math.sqrt(Math.max(.04, 1 - (cxC / spanX) * (cxC / spanX))) * archH - .04);
                  // Slender gold chime suspension thread
                  bAdd(new T2.CylinderGeometry(.009, .009, .24, 5), '#f2cc62', cxC, topY - .12, czC, 0, 0, 0, false);
                  // Faceted glowing hexagonal crystal chime prism + pointed lower crystal tip
                  bAdd(new T2.CylinderGeometry(.032, .026, cLen, 6), cCol, cxC, topY - .24 - cLen * .5, czC, 0, 0, 0, false);
                  gAdd(new T2.CylinderGeometry(0, .026, .09, 6), '#f2ffff', cxC, topY - .24 - cLen - .045, czC, Math.PI, 0, 0, .95);
                  gAdd(new T2.SphereGeometry(.026, 6, 5), '#fff4b8', cxC, topY - .24 - cLen - .12, czC, 0, 0, 0, .92);
                });

                var mergedBooth = typeof reef3dMerge === 'function' ? reef3dMerge(bOpaque, v2.rig, v2.bake) : bOpaque;
                stallGrp.add(mergedBooth);
                if(bGlow.children.length){
                  compactGroupInPlace(bGlow, true, null);
                  stallGrp.add(bGlow);
                }
                stallGrp.traverse(function(o){ if(o.isMesh) o.userData.regionPerson = 'shop'; });
              })(v, v.regionPeople.stall);
            }
            return res;
          };
          regionPeopleBuild._cavesChimeBoothWrapped = true;
        }
        // 2. Smoothly sculpted, layered satin cavern grotto arch (seam-welded indexed smooth geometry, zero faceted cliffs!)
        var g0=root.children.length, y0=-.27;
        function archPart(geo,col,px,py,pz,rx,ry,rz,kind,sx,sy,sz){
          var o=add(geo,col,ax+px,y0+py,az+pz,rx||0,ry||0,rz||0,kind===undefined?'stone':kind);
          if(sx!==undefined) o.scale.set(sx,sy,sz);
          return o;
        }
        // Smooth welded indexed arched mineral-strata rib tube (28 arch segments x 14 cross-section segments, rounded strata ripples)
        function satinArchRibGeo(rMaj,rMinX,rMinZ,yScale,strataAmp,seed){
          var k=['satinArch',rMaj,rMinX,rMinZ,yScale,strataAmp,seed].join(':'), g=geos[k];
          if(g) return g;
          var nu=28, nv=14, p=[], c=[], idx=[];
          var a0=-.06*Math.PI, a1=1.06*Math.PI;
          for(var iu=0;iu<=nu;iu++){
            var u=iu/nu, ang=a0+(a1-a0)*u, ca=Math.cos(ang), sa=Math.sin(ang);
            // Smooth haunch flare at base tapering gracefully toward crown + gentle rounded mineral strata waves
            var crown=Math.sin(u*Math.PI);
            var haunch=1.22-.26*crown;
            var strata=1+strataAmp*(.65*Math.sin(u*Math.PI*6+seed)+.35*Math.cos(u*Math.PI*10-seed*.7));
            var cxR=ca*rMaj, cyR=sa*rMaj*yScale;
            for(var iv=0;iv<nv;iv++){
              var phi=iv*Math.PI*2/nv, cp=Math.cos(phi), sp2=Math.sin(phi);
              var radR=rMinX*haunch*strata*(1+.06*Math.cos(phi*2));
              var radZ=rMinZ*haunch*strata;
              // Radial outward direction in XY plane = (ca, sa)
              var vx=cxR+ca*cp*radR;
              var vy=cyR+sa*cp*radR*yScale;
              var vz=sp2*radZ;
              p.push(vx,vy,vz);
              // Satin vertex shading: sunlit rounded mineral crown + soft twilight underside & subtle strata banding
              var upLit=.80+.22*Math.max(0,sa)+.08*Math.max(0,cp*sa+sp2*.35)+.03*Math.sin(u*Math.PI*6+seed);
              var sh=Math.min(1.08,upLit);
              c.push(sh*.96,sh*.99,Math.min(1.08,sh*1.04));
            }
          }
          for(var iu2=0;iu2<nu;iu2++){
            var r0=iu2*nv, r1=(iu2+1)*nv;
            for(var iv2=0;iv2<nv;iv2++){
              var ivn=(iv2+1)%nv;
              idx.push(r0+iv2, r1+iv2, r0+ivn, r0+ivn, r1+iv2, r1+ivn);
            }
          }
          g=own(new T.BufferGeometry());
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          geos[k]=g; return g;
        }
        // Smooth concave satin grotto vault shell (backs the arch opening smoothly with zero blocky slabs!)
        function satinVaultGeo(rxV,ryV,rzV){
          var k=['satinVault',rxV,ryV,rzV].join(':'), g=geos[k];
          if(g) return g;
          var nu=24, nv=12, p=[], c=[], idx=[];
          for(var iv=0;iv<=nv;iv++){
            var vf=iv/nv, theta=vf*Math.PI*.5; // 0 = front rim, pi/2 = deep recessed back center
            var ct=Math.cos(theta), st=Math.sin(theta);
            for(var iu=0;iu<=nu;iu++){
              var uf=iu/nu, phi=uf*Math.PI; // 0..pi along arch opening
              var vx=Math.cos(phi)*rxV*ct;
              var vy=Math.sin(phi)*ryV*ct;
              var vz=-st*rzV;
              p.push(vx,vy,vz);
              var sh=.68+.24*(1-st)+.08*Math.sin(phi);
              c.push(sh*.92,sh*.97,Math.min(1.06,sh*1.06));
            }
          }
          var row=nu+1;
          for(var iv2=0;iv2<nv;iv2++) for(var iu2=0;iu2<nu;iu2++){
            var a=iv2*row+iu2, b=a+1, cc=a+row, d=cc+1;
            idx.push(a,b,cc, b,d,cc);
          }
          g=own(new T.BufferGeometry());
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          geos[k]=g; return g;
        }
        // Check shelf support under left/right pillars & center; extend seaward strata plinths solidly down to waterY-.18 + surf foam
        var lpX=ax-lx*1.44, lpZ=az-lz*1.44, rpX=ax+lx*1.44, rpZ=az+lz*1.44;
        var cSea=!inCaveShore(ax,az) || distToPolyEdge(caveShorePoly,ax,az)<.65;
        var lSea=!inCaveShore(lpX,lpZ) || distToPolyEdge(caveShorePoly,lpX,lpZ)<.65;
        var rSea=!inCaveShore(rpX,rpZ) || distToPolyEdge(caveShorePoly,rpX,rpZ)<.65;
        var seaDrop=waterY-.18-y0; // negative drop into ocean floor
        if(rSea) smoothFoamRing(rpX,waterY+.064,rpZ,1.46,1.32);
        if(lSea) smoothFoamRing(lpX,waterY+.064,lpZ,1.46,1.32);
        if(cSea) smoothFoamRing(ax,waterY+.064,az,1.72,1.22);
        // Smooth 24-segment recessed terraced mineral strata base sill & seaward foundation skirt (low organic grotto threshold!)
        var sillH=cSea?(.22-seaDrop):.16, sillY=(cSea?seaDrop:-.08)+sillH*.5;
        archPart(cyl(1.88,2.14,sillH,24),'#435c7c',0,sillY,-.22,0,0,0,'stone',1.06,1,.58);
        archPart(cyl(1.62,1.82,.10,24),'#547194',0,.08,-.18,0,0,0,'stone',1.02,1,.54);
        // Smooth recessed velvety twilight-indigo grotto dome backing inside the arch (crisp contrast behind Echo, zero blocky rocks!)
        var vaultGeo=satinVaultGeo(1.56,1.86,.86);
        var vaultMesh=mesh(vaultGeo,M('#2b3e60',{vertexColors:true,side:T.DoubleSide}),ax,y0+.22,az-.16);
        root.add(finish(vaultMesh,'stone'));
        // Smooth dark-indigo inner floor plug bridging the vault down to the low plinth sill
        archPart(cyl(1.38,1.50,.28,22),'#263858',0,.04,-.44,0,0,0,'stone',1.02,1,.44);
        // Three layered smooth satin mineral-strata arch ribs (outer hood + main sculpted frame + inner recessed trim)
        archPart(satinArchRibGeo(1.86,.38,.44,.98,.065,0.4),'#476285',0,.48,-.24,0,0,0,'stone');
        archPart(satinArchRibGeo(1.56,.30,.34,1.00,.050,1.7),'#5d7b9f',0,.46,.04,0,0,0,'stone');
        archPart(satinArchRibGeo(1.32,.16,.22,1.00,.035,2.9),'#7090b2',0,.44,.18,0,0,0,'stone');
        // Smooth rounded mineral strata shoulder cushions & stepped 20-segment plinths anchoring left & right pillars
        [-1,1].forEach(function(sd){
          var px=sd*1.52, isSea=sd<0?lSea:rSea, baseOff=isSea?seaDrop:-.08;
          var pH=isSea?(.78-baseOff):.52;
          archPart(cyl(.78,.98,pH,20),'#466082',px,baseOff+pH*.5,-.04,0,0,0,'stone',1.08,1,.92);
          archPart(cyl(.64,.76,.26,20),'#5c7a9d',px,.44,-.02,0,0,0,'stone',1.05,1,.88);
          // Layered rounded mineral cushion boulders hugging the outer haunch smoothly (20x14 smooth normals)
          archPart(ball(.58,20,14),'#506d90',px+sd*.46,.42,-.12,0,0,0,'stone',1.15,.62,.96);
          archPart(ball(.44,18,12),'#6686a8',px+sd*.54,.84,-.14,0,0,0,'stone',1.06,.56,.88);
          archPart(ball(.36,16,12),'#7898b8',px+sd*.24,1.34,-.08,0,0,0,'stone',1.04,.52,.84);
        });
        // Smooth sculpted mineral keystone strata cap crowning the grotto arch apex
        archPart(ball(.52,20,14),'#6988aa',0,2.24,-.06,0,0,0,'stone',1.42,.56,.92);
        archPart(ball(.36,18,12),'#7f9fc0',0,2.46,-.04,0,0,0,'stone',1.24,.46,.82);
        // 3. Luminous Amethyst & Aqua Crystal Inlays matching the surrounding Echo Caves aesthetic!
        function archCrystalShard(px,py,pz,r,h,tiltX,tiltZ,colBody,colTip){
          var capH=h*.34, bodyH=h-capH;
          var cg=new T.Group(); cg.position.set(ax+px,y0+py,az+pz);
          if(tiltX) cg.rotation.x=tiltX; if(tiltZ) cg.rotation.z=tiltZ;
          var bM=mesh(cyl(r*.80,r,bodyH,6),M(colBody),0,bodyH*.5,0);
          var tM=mesh(cyl(0,r*.80,capH,6),M(colTip),0,bodyH+capH*.5,0);
          cg.add(bM); cg.add(tM); root.add(cg);
        }
        // Inlaid crystal veins seated smoothly along the arch rib curve (7 radiant aqua/amethyst mineral inlays + glowing core beads)
        [
          {ang:.18*Math.PI, col:'#76f6ef', tip:'#e4ffff', r:.095, h:.54},
          {ang:.32*Math.PI, col:'#c49cff', tip:'#f0e4ff', r:.110, h:.64},
          {ang:.44*Math.PI, col:'#76f6ef', tip:'#e4ffff', r:.095, h:.58},
          {ang:.50*Math.PI, col:'#c8a4ff', tip:'#f4ebff', r:.135, h:.86},
          {ang:.56*Math.PI, col:'#76f6ef', tip:'#e4ffff', r:.095, h:.58},
          {ang:.68*Math.PI, col:'#c49cff', tip:'#f0e4ff', r:.110, h:.64},
          {ang:.82*Math.PI, col:'#76f6ef', tip:'#e4ffff', r:.095, h:.54}
        ].forEach(function(ci){
          var ca=Math.cos(ci.ang), sa=Math.sin(ci.ang);
          var rxI=ca*1.68, ryI=.46+sa*1.68;
          var tiltZ=-(ci.ang-Math.PI*.5)*.82;
          // Smooth stone collar socket cradling the crystal inlay
          archPart(ball(ci.r*1.55,14,10),'#6584a6',rxI,ryI,.16,0,0,0,'stone',1.15,.82,.95);
          archCrystalShard(rxI,ryI,.18,.11*ci.r/.10,ci.h,.18,tiltZ,ci.col,ci.tip);
          // Petite companion crystal shard nestled beside the primary inlay
          archCrystalShard(rxI+ca*.14,ryI+sa*.06,.20,ci.r*.68,ci.h*.62,.24,tiltZ+(ca>0?-.22:.22),ci.col==='#76f6ef'?'#c49cff':'#76f6ef','#f2ffff');
          archPart(ball(ci.r*.52,10,8),'#ecffff',rxI,ryI,.24,0,0,0,false);
        });
        // Crown crest crystal cluster framing the smooth mineral apex (aqua + amethyst triad)
        archCrystalShard(-.24,2.42,.04,.11,.68,.12,.26,'#74f6ee','#e6ffff');
        archCrystalShard(.24,2.42,.04,.11,.64,.12,-.28,'#74f6ee','#e6ffff');
        archPart(ball(.16,12,8),'#f2ffff',0,2.50,.10,0,0,0,false);
        // Sculpted outer shoulder crystal clusters emerging from the smooth terraced plinths (strictly clear of "Practice a sound" pill on left!)
        crystal(ax+1.96,y0+(rSea?.48:.42),az+.16,.72,'#6ef6ee');
        crystal(ax+1.72,y0+.74,az-.08,.52,'#c49eff');
        crystal(ax-1.88,y0+(lSea?.46:.40),az+.18,.54,'#b892ff');
        // Delicate glowing mineral droplets on the smooth front plinth ledges
        [-1.34,1.34].forEach(function(sx,si){
          archPart(ball(.11,12,8),si?'#8cf8f2':'#d2b6ff',sx,.56,.34,0,0,0,false);
          archPart(ball(.07,10,8),'#ffffff',sx+.14,.52,.38,0,0,0,false);
        });
        // Rotate & compact the arch group cleanly to face the board camera
        var archNonGround=[];
        curRoot.children.slice(g0).forEach(function(p){
          if(p.userData && p.userData.reefGround) return;
          archNonGround.push(p);
        });
        var grp=new T.Group(), org=new T.Vector3(ax,y0,az);
        archNonGround.forEach(function(p){ curRoot.remove(p); grp.add(p); });
        compactGroupInPlace(grp, false, org);
        grp.children.slice().forEach(function(m){ grp.remove(m); m.rotation.y=archYaw; curRoot.add(m); });
        // Register solid arch obstacles ONLY (>= 3.45u from Echo!) and reserve Echo's forward spot in caveClaims (no obstacle!)
        // Use r >= 0.90 so region-people.js never misclassifies arch pillars as cavePools (r in 0.74..0.86).
        addObstacle(ax,az,.95);
        addObstacle(lpX,lpZ,.90);
        addObstacle(rpX,rpZ,.90);
        caveClaims.push([ax,az],[lpX,lpZ],[rpX,rpZ],[ex,ez],[ex+ux*1.4,ez+uz*1.4]);
      }
      // Outer rim clusters: cut generic smooth dark boulders by 50%, replacing with stepped mineral spires & crystalline clusters!
      for(var i=2;i<main.length;i+=4) placed(main[i],1,7.8,0,function(x,y,z){
        if(!caveClaim(x,z,3.2,4.4)) return;
        if(i%8===2){
          mineralSpire(x,y,z,1.18,i%16===2?'#7ef8f0':'#c8abff');
        }else{
          mineralCluster(x,y,z,1.15,i);
        }
      });
      main.forEach(function(s,i){ if(i%2!==1) return; var sd=pathSide(s,i);
        placed(s,sd,4.6,0,function(x,y,z){
          if(!caveClaim(x,z,2.4,3.9) || nearEcho(x,z,4.2)) return;
          var cCol=i%3===0?'#6ef6cc':i%2?'#7ef0f5':'#c4abff';
          crystal(x,y,z,1.2,cCol); crystal(x+.82,y,z+.52,.68,'#d6fcff');
          addObstacle(x,z,.95);
        });
        placed(s,-sd,5.2,-1,function(x,y,z){
          if(!caveClaim(x,z,2.4,4.0) || nearEcho(x,z,4.8)) return;
          if(nearCavesBok(x,z,1.95)) return;
          if(i%6===1){
            // M5: Replace flat dark grey disc with a layered faceted slate-indigo amethyst/aqua crystal outcrop + pastel mushroom accent
            var cr1=add(facetedCliffGeo(i%4),'#4c637d',x,y-.04,z,0,i*.7,0,'stone'); cr1.scale.set(1.04,.46,.96);
            var cr2=add(facetedCliffGeo((i+2)%4),'#617c96',x-.54,y-.04,z+.38,0,i*.4+.8,0,'stone'); cr2.scale.set(.68,.30,.64);
            crystal(x+.08,y+.28,z-.06,1.06,'#b58eff');
            crystal(x+.56,y+.12,z+.34,.76,'#6ef6ec');
            crystal(x-.48,y+.16,z-.28,.62,'#d6c0ff');
            // Pair of glowing pastel mushrooms tucked against the faceted rock rim
            [[-.58,.46,.22,'#6ef7dc'],[-.24,.64,.16,'#ffa8d8']].forEach(function(mp){
              add(cyl(mp[2]*.28,mp[2]*.42,mp[2]*1.45,8),'#f4eedc',x+mp[0],y+mp[2]*.72,z+mp[1],0,0,0,false);
              var mc=smoothOrb(mp[2],mp[3],x+mp[0],y+mp[2]*1.42,z+mp[1],false); mc.scale.set(1.06,.58,1.06);
              smoothOrb(mp[2]*.24,'#ffffff',x+mp[0]+mp[2]*.24,y+mp[2]*1.62,z+mp[1],false);
            });
            addObstacle(x,z,1.1);
          }else if(i%6===3){
            mineralCluster(x,y,z,.92,i);
          }else{
            mushrooms(x,y,z,i);
            crystal(x-.55,y,z+.35,.62,'#c7a8ff');
          }
        });
      });
      for(var c=1;c<main.length;c+=4){ var v=main[c];
        for(var p=0;p<3;p++) pebble(v.x+(p-1)*.52,-.24,v.z-1.2-(p%2)*.42,.14+p*.06,p%2?'#9cb6c4':'#b5b6d6');
      }
      // Close-in visible smooth 20+ segment cavern ribs, luminous stepped mineral spires & crystal arches (dist = 8.8..10.5)
      for(var ci=0;ci<main.length;ci++){
        var cs=main[ci], cf=frame(cs), csd=ci%2?1:-1, ck=ci%3;
        placed(cs,csd,9.2+(ci%2)*.9,0,function(wx,wy,wz){
          if(!caveClaim(wx,wz,4.6,4.8)) return;
          var wh=Math.min(2.4,1.9+(ci%3)*.25), cAng=Math.atan2(cf.tx,cf.tz);
          if(ck===0){
            // Smooth 24-segment crystal-studded stone echo arch on a smooth 20-segment layered stone plinth
            add(cyl(1.48,1.82,wh*.55,20),'#688498',wx,-.2,wz,0,cAng,0,'stone');
            add(smoothTorus(2.1,.42,12,24),'#7392a8',wx,.95,wz,0,cAng,0,'stone');
            crystal(wx-.85,.15,wz+.55,1.15,'#7ef8f0');
            crystal(wx+.75,.15,wz-.45,.82,'#c8abff');
            addObstacle(wx,wz,1.8);
          }else if(ck===1){
            // Stepped mineral spire with luminous crystal crown
            mineralSpire(wx,-.45,wz,1.32,ci%2?'#7ef8f0':'#c7a8ff');
          }else{
            // Smooth 20-segment stepped crystalline mineral terrace & glowing turquoise basin
            add(cyl(1.92,2.32,.55,20),'#6c8a9e',wx,-.5,wz,0,ci*.4,0,'stone');
            add(cyl(1.46,1.76,.45,20),'#84a4b8',wx,-.05,wz,0,ci*.4+.5,0,'stone');
            add(cyl(1.16,1.26,.10,20),'#72f2ee',wx,.22,wz,0,0,0,false);
            crystal(wx-.62,.22,wz+.38,1.25,'#7ef8f0');
            crystal(wx+.68,.22,wz-.32,.95,'#c8abff');
            crystal(wx+.12,.22,wz+.68,.68,'#6ef6cc');
            addObstacle(wx,wz,1.9);
          }
        });
      }
      // Mid-band (dist 3.8..6.2, both sides): geodes, luminous mushroom patches, mineral pools (clear of Echo!), and amber echo-shell lanterns.
      main.forEach(function(s,i){
        [1,-1].forEach(function(sd,si){
          [[3.8,-1.3],[4.6,1.4],[5.4,-1.5],[6.1,1.0]].forEach(function(spot,k){
            placed(s,sd,spot[0]+(si?.2:0),spot[1]*(i%2?1:-1),function(x,y,z){
              if(!caveClaim(x,z,2.2,2.6)) return;
              if(nearEcho(x,z,4.8) || nearCavesBok(x,z,1.85) || nearEchoHeadBackdrop(x,z)) return;
              bandProp((i+k*2+si)%4,x,y,z,i+k,sd);
            });
          });
        });
      });
      buildEchoBackdropArch();
      // M5: Warm amber lantern stones nestled in a soft golden floor pool glow
      function amberLanternStones(x,y,z,seed){
        goldPool(x,z,1.02);
        [[0,0,.48,.34,'#4d637c','#f2be52'],[.50,.22,.36,.24,'#5c7590','#ffd978'],[-.42,.28,.32,.22,'#455a73','#f5c65e']].forEach(function(st,si){
          var sx=x+st[0], sz=z+st[1];
          var rk=add(facetedCliffGeo((seed+si)%4),st[4],sx,y-.03,sz,0,(seed+si)*1.1,0,'stone');
          rk.scale.set(st[2],st[3],st[2]*.92);
          add(cyl(st[2]*.26,st[2]*.34,st[3]*.72,6),st[5],sx,y+st[3]+st[3]*.22,sz,0,si*.9,0,false);
          add(cyl(0,st[2]*.26,st[3]*.42,6),'#fff1b8',sx,y+st[3]+st[3]*.76,sz,0,si*.9,0,false);
        });
        pebble(x+.60,y+.02,z-.24,.18,'#9ab4c6');
        pebble(x-.56,y+.02,z-.20,.15,'#bcb4dc');
        addObstacle(x,z,.90);
      }
      // M5: Shallow luminous aqua mineral pool rimmed with smooth cavern stones, warm amber lantern stones & mini crystal/mushroom sprigs
      function luminousMineralPool(x,y,z,seed){
        function ovalDisc(rx,rz,yD,colD,tagD){
          var tri=[], n=20;
          for(var a=0;a<n;a++){
            var a0=a*Math.PI*2/n, a1=(a+1)*Math.PI*2/n;
            var w0=1+.06*Math.sin(a0*3+seed)+.04*Math.cos(a0*5-seed);
            var w1=1+.06*Math.sin(a1*3+seed)+.04*Math.cos(a1*5-seed);
            tri.push([[x,z,1],[x+Math.cos(a0)*rx*w0,z+Math.sin(a0)*rz*w0,1],[x+Math.cos(a1)*rx*w1,z+Math.sin(a1)*rz*w1,1]]);
          }
          painted(tri,yD,colD,tagD);
        }
        ovalDisc(1.32,1.12,-.300,'#56738c','mineral-pool-bed');
        ovalDisc(1.08,.92,-.296,'#44c4d4','mineral-pool-water');
        ovalDisc(.80,.68,-.292,'#78f2ee','mineral-pool-mid');
        ovalDisc(.48,.40,-.288,'#c8fffb','mineral-pool-glow');
        // Sculpted mineral rim stones + 3 warm amber lantern rim stones circling the pool edge
        for(var j=0;j<10;j++){
          var ang=j*Math.PI*2/10+seed*.4, w=1+.06*Math.sin(ang*3+seed);
          var sx=x+Math.cos(ang)*1.12*w, sz=z+Math.sin(ang)*.95*w;
          var isAmber=(j===1 || j===5 || j===8);
          var st=smoothOrb(isAmber?.24:.20+(j%2)*.045,isAmber?'#536982':(j%2?'#6b889e':'#59738a'),sx,y+.09,sz,'stone');
          st.scale.set(1.16,.56,1.02);
          if(isAmber){
            add(cyl(.085,.12,.20,6),'#f2be52',sx,y+.20,sz,0,j*.7,0,false);
            add(cyl(0,.085,.11,6),'#fff1b8',sx,y+.35,sz,0,j*.7,0,false);
          }
        }
        // Petite amethyst & aqua rim crystal sprigs + twin glowing pastel mushrooms hugging the rim
        crystal(x-.92,y+.04,z-.40,.52,'#b68eff');
        crystal(x+.92,y+.04,z+.36,.48,'#6ef6ec');
        [[x+.68,z-.64,.19,'#ffa8d8'],[x+.90,z-.46,.14,'#6ef7dc']].forEach(function(mp){
          add(cyl(mp[2]*.28,mp[2]*.42,mp[2]*1.5,8),'#f4eedc',mp[0],y+mp[2]*.75,mp[1],0,0,0,false);
          var mc=smoothOrb(mp[2],mp[3],mp[0],y+mp[2]*1.48,mp[1],false); mc.scale.set(1.06,.58,1.06);
          smoothOrb(mp[2]*.24,'#ffffff',mp[0]+mp[2]*.22,y+mp[2]*1.66,mp[1],false);
        });
        pebble(x+.22,y+.02,z+.14,.15,'#bdf7f2');
        pebble(x-.28,y+.02,z-.16,.13,'#d2c6f4');
        addObstacle(x,z,1.02);
      }
      // M5: Dress the lower-left foreground grey slab (130-400, 490-640) BEFORE generic caveTuft pebbles
      // with a layered amethyst/aqua crystal cluster, glowing pastel mushrooms, warm amber lantern stones & shallow luminous mineral pool rim!
      function placeCaveLowerLeft(camIdx){
        var curS=main[camIdx]||main[0];
        function clearOfKiko(wx,wz){
          // Guard Kiko's possible standing band beside curS (both current gap=1.4 and iter14 radial gap>=2.25 on either side)
          if(Math.hypot(wx-(curS.x+1.4),wz-(curS.z+1.4))<2.15) return false;
          if(Math.hypot(wx-(curS.x-1.9),wz-(curS.z+1.4))<2.15) return false;
          if(Math.hypot(wx-(curS.x+2.25),wz-(curS.z+1.4))<2.15) return false;
          return true;
        }
        var cands=[];
        for(var wx=bounds.minX-6;wx<=bounds.maxX+6;wx+=.45) for(var wz=bounds.minZ-6;wz<=bounds.maxZ+6;wz+=.45){
          if(!inCave(wx,wz) || !outerClear(wx,wz,2.65) || !clearOfKiko(wx,wz)) continue;
          if(caveClaims.some(function(q){ return Math.hypot(q[0]-wx,q[1]-wz)<1.45; })) continue;
          var nd=camNDCAt(camIdx,wx,-.25,wz);
          // Keep strictly right of bottom-left "Ask Shelly" HUD pill (nd.x >= -0.70 -> px >= 154)
          if(nd.x<-.70 || nd.x>-.22 || nd.y<-.94 || nd.y>-.46 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        [
          {tx:-.40, ty:-.74, kind:'lumpool', sep:1.75},
          {tx:-.38, ty:-.90, kind:'amber',   sep:1.55},
          {tx:-.45, ty:-.54, kind:'mush',    sep:1.45},
          {tx:-.62, ty:-.88, kind:'cryst',   sep:1.50}
        ].forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(caveClaims.some(function(q){ return Math.hypot(q[0]-c.x,q[1]-c.z)<(tg.sep||1.55); })) return;
            var sc=Math.hypot(c.nd.x-tg.tx,c.nd.y-tg.ty);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best || best.sc>.36) return;
          var x=best.c.x, z=best.c.z;
          caveClaims.push([x,z]);
          if(tg.kind==='lumpool'){
            luminousMineralPool(x,-.27,z,ti+3);
          }else if(tg.kind==='mush'){
            mushrooms(x,-.27,z,ti+5);
            crystal(x+.48,-.27,z-.24,.56,'#b894ff');
            addObstacle(x,z,.90);
          }else if(tg.kind==='amber'){
            amberLanternStones(x,-.27,z,ti+2);
          }else{
            mineralCluster(x,-.27,z,.84,ti+1);
            [[x+.54,z+.42,.18,'#ffa8d8'],[x+.28,z+.58,.14,'#6ef7dc']].forEach(function(mp){
              add(cyl(mp[2]*.28,mp[2]*.42,mp[2]*1.45,8),'#f4eedc',mp[0],-.27+mp[2]*.72,mp[1],0,0,0,false);
              var mc=smoothOrb(mp[2],mp[3],mp[0],-.27+mp[2]*1.42,mp[1],false); mc.scale.set(1.06,.58,1.06);
            });
          }
        });
      }
      var caveCamIdx=shopSp ? shopSp.i : (echoDeck ? echoDeck.i : activeIdx);
      placeCaveLowerLeft(caveCamIdx);
      if(echoDeck && echoDeck.i!==caveCamIdx) placeCaveLowerLeft(echoDeck.i);
      if(activeIdx!==caveCamIdx && (!echoDeck || activeIdx!==echoDeck.i)) placeCaveLowerLeft(activeIdx);
      // Small cavern tufts fill the remaining slab between tile discs (cached composites!)
      function caveTuft(kind,x,y,z,i){
        if(kind===0){ crystal(x,y,z,.50,i%2?'#7ef8f0':'#c7a8ff'); }
        else if(kind===1){
          var v=Math.abs(i|0)%4;
          emitCached('caveTuftMush:' + v, x, y, z, (i||0)*.7, 1, function(){
            var mc=['#6ef7dc','#cfaaff','#ffa8d8','#8ee4ff'];
            [[-.22,.12],[.22,-.10],[0,.24]].forEach(function(o,j){
              var h=.24+j*.10;
              add(cyl(.045,.065,h,8),'#f4eedc',o[0],h/2,o[1],0,0,0,false);
              var c2=smoothOrb(.16+j*.035,mc[(v+j)%4],o[0],h,o[1],false); c2.scale.set(1,.58,1);
            });
          });
        }else if(kind===2){
          emitCached('caveTuftPeb', x, y, z, (x+z)*.5, 1, function(){
            pebble(0,0,0,.26,'#9db6c4'); pebble(.36,0,.22,.18,'#b6b5d8'); pebble(-.28,0,.28,.14,'#c4f4ee');
          });
        }else{
          emitCached('caveTuftBud:' + (Math.abs(i|0)%3), x, y, z, (i||0)*.5, 1, function(){
            add(cyl(.22,.28,.16,8),'#7c98ad',0,.08,0,0,0,0,'stone');
            crystal(0,.12,0,.38,i%3===0?'#ffd87e':i%2?'#7ef8f0':'#c8abff');
          });
        }
      }
      for(var cw=0,cRow=0;cw<1;cw++){
        for(var gz=bounds.minZ-6;gz<=bounds.maxZ+6;gz+=1.55,cRow++){
          for(var gx=bounds.minX-6+(cRow%2)*.78,cCol=0;gx<=bounds.maxX+6;gx+=1.60,cCol++){
            var ch1=Math.abs(Math.sin(cRow*12.9898+cCol*78.233)*43758.5453)%1, ch2=Math.abs(Math.sin(cRow*39.346+cCol*11.135)*24634.6345)%1,
                jx=gx+(ch1-.5)*.6, jz=gz+(ch2-.5)*.6;
            if(!inCave(jx,jz) || nearEcho(jx,jz,4.6) || nearCavesBok(jx,jz,1.95) || nearEchoHeadBackdrop(jx,jz) || !caveClaim(jx,jz,1.5,2.4)) continue;
            caveTuft(Math.floor(ch1*4)%4,jx,-.27,jz,cRow*5+cCol);
          }
        }
      }
      // Guarantee 2 glowing bioluminescent crystal outcrops in the lower-right outer water (795..1024, 395..640)!
      function placeCaveOuterWaterCrystals(camIdx){
        var cands=[];
        for(var wx=bounds.minX-14;wx<=bounds.maxX+22;wx+=.95) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+22;wz+=.95){
          if(inCaveShelf(wx,wz) || !outerClear(wx,wz,7.6)) continue;
          if(caveClaims.some(function(q){ return Math.hypot(q[0]-wx,q[1]-wz)<3.3; })) continue;
          var nd=camNDCAt(camIdx,wx,-.56,wz);
          if(nd.x<.52 || nd.x>.93 || nd.y<-.80 || nd.y>-.12 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        [[.76,-.30,1.12],[.86,-.62,.94]].forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(c.nd.x>.92 || c.nd.y<-.78) return;
            if(caveClaims.some(function(q){ return Math.hypot(q[0]-c.x,q[1]-c.z)<3.3; })) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best) return;
          var ox=best.c.x, oz=best.c.z, sc=tg[2];
          caveClaims.push([ox,oz]);
          smoothFoamRing(ox,waterY+.064,oz,2.10*sc,1.88*sc);
          surfWaveHalo(ox,waterY+.056,oz,2.04*sc,1.82*sc,ti);
          var base=add(facetedCliffGeo((ti+2)%4),'#597a92',ox,-.72,oz,0,ti*1.1,0,'stone');
          base.scale.set(1.55*sc,1.02*sc,1.42*sc);
          add(cyl(1.02*sc,1.18*sc,.14,20),'#6ef2ee',ox,.14*sc,oz,0,0,0,false);
          crystal(ox,-.04,oz,1.18*sc,ti%2?'#c7a8ff':'#7ef8f0');
          crystal(ox+.58*sc,-.14,oz-.32*sc,.78*sc,ti%2?'#7ef8f0':'#c8abff');
          crystal(ox-.48*sc,-.16,oz+.36*sc,.62*sc,'#6ef6cc');
        });
      }
      placeCaveOuterWaterCrystals(caveCamIdx);
      if(echoDeck && echoDeck.i!==caveCamIdx) placeCaveOuterWaterCrystals(echoDeck.i);
      // iter20 Minor #5: Fill the empty upper-right open-water pocket (830-1024, 95-260) beyond the cave floor rim
      // with a crafted bioluminescent crystal-spire rocky islet & scalloped foam ring (cleanly below "Travel" HUD & clear of cave path/arch).
      function placeCaveUpperRightCrystalIslet(camIdx){
        var best=null;
        for(var wx=bounds.minX-16;wx<=bounds.maxX+18;wx+=.85) for(var wz=bounds.minZ-20;wz<=bounds.maxZ+18;wz+=.85){
          if(inCaveShelf(wx,wz) || !outerClear(wx,wz,10.0)) continue;
          if(caveClaims.some(function(q){ return Math.hypot(q[0]-wx,q[1]-wz)<4.6; })) continue;
          if(view._sceneryObstacles.some(function(o){ return Math.hypot(o.x-wx,o.z-wz)<4.6; })) continue;
          var nd=camNDCAt(camIdx,wx,waterY,wz);
          if(nd.x<.68 || nd.x>.88 || nd.y<.34 || nd.y>.54 || nd.z>1) continue;
          var ndTop=camNDCAt(camIdx,wx,1.88,wz);
          if(ndTop.y>.67 || ndTop.x>.96 || ndTop.z>1) continue;
          var sc=Math.hypot(nd.x-.80,nd.y-.45);
          if(!best || sc<best.sc) best={x:wx,z:wz,sc:sc};
        }
        if(!best) return;
        var ox=best.x, oz=best.z;
        caveClaims.push([ox,oz]);
        // Crisp scalloped surf-foam ring + outer wave halo wrapping the rocky islet at waterline
        smoothFoamRing(ox,waterY+.064,oz,2.34,2.04);
        surfWaveHalo(ox,waterY+.056,oz,2.26,1.96,7);
        // Smoothly sculpted tiered slate-indigo rocky islet grounded solidly below waterY (zero blocky slabs!)
        add(cyl(1.88,2.28,.72,20),'#47657f',ox,waterY+.00,oz,0,.4,0,'stone');
        add(cyl(1.38,1.70,.40,20),'#5f809b',ox-.08,waterY+.48,oz+.05,0,1.0,0,'stone');
        [
          [1.16,waterY+.26,-.38,.68,1.18,.66,.95,'#52728c'],
          [-1.12,waterY+.22,.46,.58,1.12,.58,.92,'#4a6882'],
          [.56,waterY+.44,.92,.50,1.10,.54,.88,'#6889a4'],
          [-.72,waterY+.38,-.88,.44,1.06,.52,.90,'#5a7a95']
        ].forEach(function(rk){
          var b=smoothOrb(rk[3],rk[7],ox+rk[0],rk[1],oz+rk[2],'stone');
          b.scale.set(rk[4],rk[5],rk[6]);
        });
        // Luminous bioluminescent turquoise mineral basin crowning the upper rocky terrace
        add(cyl(1.06,1.18,.08,20),'#6ef2ee',ox-.06,.06,oz+.04,0,0,0,false);
        add(cyl(.64,.70,.05,18),'#c8fffb',ox-.08,.10,oz+.04,0,0,0,false);
        // Crafted bioluminescent crystal-spire cluster (aqua, amethyst & seafoam-mint hex prisms + glowing cores)
        crystal(ox-.10,.06,oz+.02,1.06,'#7af8f0');
        crystal(ox+.68,-.02,oz-.34,.88,'#c5a2ff');
        crystal(ox-.74,-.04,oz+.32,.74,'#6ef6cc');
        crystal(ox+.48,-.06,oz+.76,.56,'#8cf4ff');
        // Warm golden amber crystal bud + glowing pastel cavern mushrooms & smooth pebbles on the foreground terrace ledge
        add(cyl(.09,.13,.26,6),'#f2be52',ox-.62,.12,oz-.56,0,.6,0,false);
        add(cyl(0,.09,.15,6),'#fff1b8',ox-.62,.32,oz-.56,0,.6,0,false);
        [[ox+.16,oz+.84,.18,'#ffa8d8'],[ox-.12,oz+.92,.14,'#6ef7dc']].forEach(function(mp){
          add(cyl(mp[2]*.28,mp[2]*.42,mp[2]*1.5,8),'#f4eedc',mp[0],-.02+mp[2]*.75,mp[1],0,0,0,false);
          var mc=smoothOrb(mp[2],mp[3],mp[0],-.02+mp[2]*1.48,mp[1],false); mc.scale.set(1.06,.58,1.06);
          smoothOrb(mp[2]*.24,'#ffffff',mp[0]+mp[2]*.20,-.02+mp[2]*1.66,mp[1],false);
        });
        pebble(ox+.92,-.12,oz+.44,.22,'#9ab4c6');
        pebble(ox-.96,-.14,oz-.16,.18,'#b6b5d8');
      }
      placeCaveUpperRightCrystalIslet(caveCamIdx);
      // MIN 6: Dramatic enclosed subterranean rocky cavern ceiling arches, vaulted grotto canopy,
      // hanging faceted stalactites & faint bioluminescent crystal clusters (y >= 6.8 clear of camera/tiles/Echo/Bok,
      // outer cavern enclosure strictly outside maxCamR, and open zenith center for overhead Map zoom!).
      (function buildCavernCeilingGrotto(){
        var ceilGrp=new T.Group();
        ceilGrp.name='caves-cavern-ceiling';
        var rxSpan=Math.max(22,(bounds.maxX-bounds.minX)*0.5);
        var rzSpan=Math.max(19,(bounds.maxZ-bounds.minZ)*0.5);
        // Keep the entire outer rocky wall & buttress piers strictly outside maxCamR (~33.8) around all 360 degrees!
        var rxW=Math.max(rxSpan+23.0,46.0), rzW=Math.max(rzSpan+25.5,45.0);
        var isNight=!!view.night;
        var rockMat=new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,fog:true});
        var cDeep=new T.Color(isNight?'#0d1828':'#16263d');
        var cMid =new T.Color(isNight?'#16273e':'#233b58');
        var cLedge=new T.Color(isNight?'#203a54':'#315272');
        var cAquaB=new T.Color(isNight?'#2a5a6e':'#3f7892');
        var cAmeth=new T.Color(isNight?'#2d2f58':'#454878');
        var cTmp=new T.Color();
        function rockWave(ang,y){
          return 1.0+0.068*Math.sin(ang*5+0.4)+0.046*Math.cos(ang*9-0.7)+0.028*Math.sin(ang*14+y*0.35);
        }
        // Layer A: Continuous 360-degree sculpted rocky subterranean cavern wall + overarching vaulted ceiling canopy
        // Curves cleanly from underwater bedrock (y = waterY - 1.6) up rocky cavern strata to an overarching vaulted
        // ceiling canopy (y = 9.5..18.2, inner rim rFrac = 0.56 keeping zenith Map view 100% unobstructed!).
        (function buildVaultCanopyShell(){
          var nAng=64;
          var rings=[
            { rf:1.06, y:waterY-1.6, bounce:0.15 },
            { rf:1.02, y:0.4,        bounce:0.52 },
            { rf:1.00, y:2.6,        bounce:0.38 },
            { rf:0.98, y:5.2,        bounce:0.22 },
            { rf:0.95, y:7.8,        bounce:0.26 },
            { rf:0.90, y:10.0,       bounce:0.34 },
            { rf:0.82, y:12.2,       bounce:0.38 },
            { rf:0.72, y:14.4,       bounce:0.30 },
            { rf:0.62, y:16.4,       bounce:0.20 },
            { rf:0.54, y:18.2,       bounce:0.10 }
          ];
          var pos=[], cols=[], idx=[];
          for(var ri=0;ri<rings.length;ri++){
            var rk=rings[ri], isCanopy=(ri>=5);
            for(var ai=0;ai<=nAng;ai++){
              var ang=(ai%nAng)*Math.PI*2/nAng;
              var wv=rockWave(ang,rk.y);
              // Subtle stepped geological strata ledges & organic vault arch bays along the cavern perimeter
              var bayIndent=isCanopy ? (1.0-0.06*Math.cos(ang*10)) : (1.0+0.035*Math.sin(ang*10+ri*0.7));
              var rx=rxW*rk.rf*wv*bayIndent, rz=rzW*rk.rf*wv*bayIndent;
              var yArch=isCanopy ? (0.75*Math.sin(ang*10+0.3)+0.42*Math.cos(ang*6-0.5)) : (0.35*Math.sin(ang*8+ri*1.1));
              var vy=rk.y+yArch;
              // Never allow canopy inward rings to dip below y = 7.8
              if(isCanopy && vy<7.8) vy=7.8;
              pos.push(cx+Math.cos(ang)*rx, vy, cz+Math.sin(ang)*rz);
              // Subterranean grotto bounce shading: darker deep vaults, cool slate-indigo strata, subtle turquoise bounce from lake!
              var strata=0.5+0.5*Math.sin(rk.y*1.45+Math.sin(ang*7)*0.9);
              var ribLit=0.5+0.5*Math.cos(ang*10-0.2);
              cTmp.copy(cDeep).lerp(cMid, 0.35+0.45*strata);
              cTmp.lerp(cLedge, ribLit*0.32*(isCanopy?0.85:0.70));
              cTmp.lerp(cAquaB, rk.bounce*(0.32+0.28*ribLit));
              if(ri>=3 && ri<=7 && Math.sin(ang*7+ri*1.3)>0.55){
                cTmp.lerp(cAmeth, 0.22);
              }
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          var stride=nAng+1;
          for(var r2=0;r2<rings.length-1;r2++){
            for(var a2=0;a2<nAng;a2++){
              var i0=r2*stride+a2, i1=i0+1, i2=i0+stride, i3=i2+1;
              idx.push(i0,i2,i1, i1,i2,i3);
            }
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          ceilGrp.add(new T.Mesh(g,rockMat));
        })();
        // Helper: Sculpted faceted rocky cavern arch/rib tube connecting a curve of 3D control points
        function addRockyVaultRib(pts,radii,seed){
          var nSeg=pts.length-1, nCross=7;
          var pos=[], cols=[], idx=[];
          var tan=new T.Vector3(), upV=new T.Vector3(0,1,0), side=new T.Vector3(), norm=new T.Vector3();
          for(var i=0;i<=nSeg;i++){
            var p=pts[i], rad=radii[i];
            var pPrev=pts[Math.max(0,i-1)], pNext=pts[Math.min(nSeg,i+1)];
            tan.subVectors(pNext,pPrev).normalize();
            if(Math.abs(tan.y)>0.96) upV.set(1,0,0); else upV.set(0,1,0);
            side.crossVectors(tan,upV).normalize();
            norm.crossVectors(side,tan).normalize();
            var u=i/nSeg;
            for(var j=0;j<nCross;j++){
              var phi=j*Math.PI*2/nCross;
              // Faceted irregular limestone/slate cross-section
              var jag=0.84+0.20*Math.sin(phi*2+i*1.7+seed)+0.12*Math.cos(phi*3-i*1.3);
              var cr=rad*jag, cp=Math.cos(phi), sp2=Math.sin(phi);
              var vx=p.x+(side.x*cp+norm.x*sp2)*cr;
              var vy=p.y+(side.y*cp+norm.y*sp2)*cr;
              var vz=p.z+(side.z*cp+norm.z*sp2)*cr;
              pos.push(vx,vy,vz);
              // Underside (sp2 < 0) catches subtle turquoise grotto lake bounce; upper sides drop into deep indigo cavern shadow!
              var underBounce=Math.max(0,-sp2);
              var sideLit=0.5+0.5*Math.cos(phi+seed);
              cTmp.copy(cDeep).lerp(cMid,0.32+0.35*sideLit);
              cTmp.lerp(cLedge,0.22*(1-Math.abs(u-0.5)*1.4));
              cTmp.lerp(cAquaB,underBounce*0.42);
              if(Math.sin(i*1.9+seed)>0.5) cTmp.lerp(cAmeth,0.16);
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          for(var i2=0;i2<nSeg;i2++){
            var b0=i2*nCross, b1=(i2+1)*nCross;
            for(var j2=0;j2<nCross;j2++){
              var jn=(j2+1)%nCross;
              idx.push(b0+j2,b1+j2,b0+jn, b0+jn,b1+j2,b1+jn);
            }
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          ceilGrp.add(new T.Mesh(g,rockMat));
        }
        // Helper: Faceted hanging cave stalactite welded cleanly into ceiling/arch above (yTop embeds +0.45u into rock!)
        var stGeoCache={};
        function getStalactiteGeo(seed){
          var k='st:'+seed; if(stGeoCache[k]) return stGeoCache[k];
          var nSides=6, rings=[
            { y: 0.25, r:1.38, sh:0.55 },
            { y: 0.00, r:1.05, sh:0.70 },
            { y:-0.32, r:0.74, sh:0.86 },
            { y:-0.66, r:0.42, sh:0.98 },
            { y:-1.00, r:0.03, sh:1.10 }
          ];
          var pos=[], cols=[], idx=[];
          for(var ri=0;ri<rings.length;ri++){
            var rk=rings[ri];
            for(var si=0;si<nSides;si++){
              var a=si*Math.PI*2/nSides+ri*0.18+seed*0.7;
              var jag=0.84+0.24*Math.sin(a*2.3+seed+ri);
              var r=rk.r*jag;
              pos.push(Math.cos(a)*r, rk.y, Math.sin(a)*r);
              // Darker rock root transitioning to subtly aqua-lit glistening calcite/slate tip
              var tTip=ri/(rings.length-1);
              cTmp.copy(cDeep).lerp(cMid,0.35+0.40*tTip);
              cTmp.lerp(cAquaB,tTip*0.36*(0.65+0.35*Math.cos(a+seed)));
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          for(var r2=0;r2<rings.length-1;r2++){
            var b0=r2*nSides, b1=(r2+1)*nSides;
            for(var s2=0;s2<nSides;s2++){
              var sn=(s2+1)%nSides;
              idx.push(b0+s2,b1+s2,b0+sn, b0+sn,b1+s2,b1+sn);
            }
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          stGeoCache[k]=g; return g;
        }
        function addStalactiteCluster(x,yTop,z,heroLen,heroR,seed,minTipY){
          var distC=Math.hypot(x-cx,z-cz);
          var floorGuard=minTipY!=null?minTipY:6.8;
          if(distC<38.5) floorGuard=Math.max(floorGuard,6.75);
          var specs=[
            [0,0,heroLen,heroR,0,0],
            [heroR*1.15,heroR*0.65,heroLen*0.68,heroR*0.66,0.08,-0.06],
            [-heroR*1.05,heroR*0.75,heroLen*0.54,heroR*0.58,-0.07,0.08],
            [heroR*0.25,-heroR*1.10,heroLen*0.44,heroR*0.50,0.05,0.07]
          ];
          specs.forEach(function(spS,si){
            var len=Math.min(spS[2],Math.max(0.55,yTop-floorGuard));
            if(len<0.55) return;
            var m=new T.Mesh(getStalactiteGeo((seed+si)%5),rockMat);
            m.position.set(x+spS[0],yTop+0.20,z+spS[1]);
            m.scale.set(spS[3],len,spS[3]);
            m.rotation.set(spS[4],seed*0.9+si*1.4,spS[5]);
            ceilGrp.add(m);
          });
        }
        // Helper: Faint bioluminescent hanging ceiling crystal cluster embedded cleanly into arch rock
        var ceilCrystMats=[
          new T.MeshBasicMaterial({color:isNight?'#48c2ca':'#66dce4',fog:true}),
          new T.MeshBasicMaterial({color:isNight?'#7b6cc4':'#9d8ce2',fog:true}),
          new T.MeshBasicMaterial({color:isNight?'#7adce6':'#9aeef6',fog:true})
        ];
        var ceilCrystGeo=new T.ConeGeometry(1,1,6);
        ceilCrystGeo.rotateX(Math.PI); // point downward cleanly
        ceilCrystGeo.translate(0,-0.5,0);
        function addCeilingCrystalCluster(x,yTop,z,sc,palIdx){
          var k=sc||1, matA=ceilCrystMats[palIdx%ceilCrystMats.length], matB=ceilCrystMats[(palIdx+1)%ceilCrystMats.length];
          var distC=Math.hypot(x-cx,z-cz), ySafe=distC<38.5?Math.max(yTop,6.8+1.22*k):yTop;
          [
            [0,0,0,0.22*k,1.18*k,0.12,0.08,matA],
            [0.24*k,0.05*k,0.16*k,0.15*k,0.82*k,0.26,-0.22,matB],
            [-0.22*k,0.04*k,-0.14*k,0.14*k,0.74*k,-0.24,0.20,ceilCrystMats[2]]
          ].forEach(function(cp){
            var cm=new T.Mesh(ceilCrystGeo,cp[7]);
            cm.position.set(x+cp[0],ySafe+cp[1],z+cp[2]);
            cm.scale.set(cp[3],cp[4],cp[3]);
            cm.rotation.set(cp[5],palIdx*1.1,cp[6]);
            ceilGrp.add(cm);
          });
        }
        // iter30 Beyond-MP8: Glowing Aqua & Amethyst Bioluminescent Mineral Veins + Floating Crystal-Wisp Lanterns
        // woven along the cavern ceiling arches, buttress ribs & stalactites (in `extras`, zero obstacles, y >= 6.6 over board!)
        var veinCoreMats=[
          new T.MeshBasicMaterial({color:isNight?'#6cfbf6':'#7afef8',fog:true}),
          new T.MeshBasicMaterial({color:isNight?'#bd8eff':'#cfa8ff',fog:true})
        ];
        var veinGlowMats=[
          new T.MeshBasicMaterial({color:'#8efefa',transparent:true,opacity:isNight?0.34:0.28,depthWrite:false,fog:true}),
          new T.MeshBasicMaterial({color:'#d6b4ff',transparent:true,opacity:isNight?0.34:0.28,depthWrite:false,fog:true})
        ];
        var veinSegGeo=new T.CylinderGeometry(1,1,1,6);
        var veinUp=new T.Vector3(0,1,0), veinDir=new T.Vector3();
        function addMineralVeinRibbon(vPts,baseR,palIdx,inwardShift,yShift){
          var pi=((palIdx%2)+2)%2, coreM=veinCoreMats[pi], glowM=veinGlowMats[pi];
          var inS=inwardShift||0, yS=yShift||0;
          function shifted(pt,idxS){
            var dx=cx-pt.x, dz=cz-pt.z, dl=Math.hypot(dx,dz)||1;
            var wig=0.22*Math.sin(idxS*1.85+palIdx*1.1);
            return new T.Vector3(
              pt.x+(dx/dl)*inS-(dz/dl)*wig,
              pt.y+yS+0.14*Math.cos(idxS*1.5-palIdx),
              pt.z+(dz/dl)*inS+(dx/dl)*wig
            );
          }
          var prev=shifted(vPts[0],0);
          for(var vi=1;vi<vPts.length;vi++){
            var cur=shifted(vPts[vi],vi);
            veinDir.subVectors(cur,prev);
            var segL=veinDir.length();
            if(segL>0.08){
              veinDir.divideScalar(segL);
              var u=vi/vPts.length, rad=baseR*(0.68+0.48*Math.sin(u*Math.PI));
              var mx=(prev.x+cur.x)*0.5, my=(prev.y+cur.y)*0.5, mz=(prev.z+cur.z)*0.5;
              var cm=new T.Mesh(veinSegGeo,coreM);
              cm.position.set(mx,my,mz); cm.scale.set(rad,segL*1.04,rad);
              cm.quaternion.setFromUnitVectors(veinUp,veinDir);
              ceilGrp.add(cm);
              var gm=new T.Mesh(veinSegGeo,glowM);
              gm.position.set(mx,my,mz); gm.scale.set(rad*2.35,segL*1.05,rad*2.35);
              gm.quaternion.setFromUnitVectors(veinUp,veinDir); gm.renderOrder=2;
              ceilGrp.add(gm);
            }
            prev=cur;
          }
        }
        // iter31 MIN 6: Organic Teardrop Bioluminescent Crystal Lanterns + Tiny Soft Firefly Sparks
        // (ZERO flat circular UI-badge medallion discs or torus rings; strictly clear of top-right HUD buttons!)
        function makeTeardropLanternGeo(nRad,nSegs,hTop,hBot,rMax,fluteAmp){
          var p=[], c=[], idx=[];
          for(var vi=0;vi<=nSegs;vi++){
            var v=vi/nSegs;
            var yPos=-hBot+v*(hTop+hBot);
            var rProf;
            if(v<=0.001 || v>=0.999){
              rProf=0;
            }else if(v<0.36){
              rProf=rMax*Math.pow(Math.sin((v/0.36)*Math.PI*0.5),0.72);
            }else{
              rProf=rMax*Math.pow(Math.cos(((v-0.36)/0.64)*Math.PI*0.5),1.52);
            }
            // Bright luminous glow in lower teardrop belly fading gently toward tapered crystal spire top & bottom tip
            var belly=Math.exp(-Math.pow((v-0.34)/0.28,2));
            var sh=0.70+0.30*belly;
            for(var ri=0;ri<nRad;ri++){
              var ang=ri*Math.PI*2/nRad;
              var fl=fluteAmp ? (1+fluteAmp*Math.cos(ang*6)*Math.sin(v*Math.PI)) : 1;
              var rr=rProf*fl;
              p.push(Math.cos(ang)*rr, yPos, Math.sin(ang)*rr);
              c.push(sh,sh,sh);
            }
          }
          for(var vi2=0;vi2<nSegs;vi2++){
            for(var ri2=0;ri2<nRad;ri2++){
              var a=vi2*nRad+ri2, b=vi2*nRad+((ri2+1)%nRad);
              var d=(vi2+1)*nRad+ri2, e=(vi2+1)*nRad+((ri2+1)%nRad);
              // Outward CCW winding: (d-a) x (e-a) points radially outward (+X at ang=0)
              idx.push(a,d,e, a,e,b);
            }
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          return g;
        }
        var wispLanternGeo=makeTeardropLanternGeo(10,12,0.58,0.36,0.21,0.075);
        var wispCoreGeo=makeTeardropLanternGeo(8,8,0.22,0.14,0.125,0);
        var wispVeilGeo=makeTeardropLanternGeo(10,10,0.72,0.45,0.29,0.04);
        var wispCapGeo=new T.CylinderGeometry(0.036,0.135,0.17,6);
        var wispStemGeo=new T.CylinderGeometry(0.015,0.032,0.46,5);
        var wispSparkGeo=new T.OctahedronGeometry(0.052,0);
        var wispSparkHaloGeo=new T.OctahedronGeometry(0.092,0);
        var wispHeartMat=new T.MeshBasicMaterial({color:'#ffffff',fog:false});
        var wispCapMat=new T.MeshBasicMaterial({color:'#587896',fog:true});
        var wispLanternMats=[
          new T.MeshBasicMaterial({color:'#84fff8',vertexColors:true,fog:false}),
          new T.MeshBasicMaterial({color:'#d6b0ff',vertexColors:true,fog:false}),
          new T.MeshBasicMaterial({color:'#96ffd8',vertexColors:true,fog:false})
        ];
        var wispVeilMats=[
          new T.MeshBasicMaterial({color:'#78fff8',vertexColors:true,transparent:true,opacity:isNight?0.24:0.18,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#c69aff',vertexColors:true,transparent:true,opacity:isNight?0.24:0.18,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#84ffd2',vertexColors:true,transparent:true,opacity:isNight?0.22:0.17,depthWrite:false,fog:false})
        ];
        var wispSparkMats=[
          new T.MeshBasicMaterial({color:'#b8fffb',fog:false}),
          new T.MeshBasicMaterial({color:'#ead6ff',fog:false}),
          new T.MeshBasicMaterial({color:'#fff6c8',fog:false})
        ];
        var wispSparkHaloMats=[
          new T.MeshBasicMaterial({color:'#86fff8',transparent:true,opacity:0.30,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#d6b4ff',transparent:true,opacity:0.30,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#ffe89e',transparent:true,opacity:0.30,depthWrite:false,fog:false})
        ];
        // Build exact Echo Caves opening camera(s) at 1024x640 so NO upper lantern or firefly spark ever crowds the top-right HUD!
        var wispHudCams=[];
        (function initWispHudCams(){
          var idxs=[];
          var sIdx=cavesShopSp ? cavesShopSp.i : activeIdx;
          if(idxs.indexOf(sIdx)<0) idxs.push(sIdx);
          if(idxs.indexOf(activeIdx)<0) idxs.push(activeIdx);
          idxs.forEach(function(ci){
            var s0=main[ci]||main[0], s1=main[(ci+1)%main.length]||s0;
            var dx=s1.x-s0.x, dz=s1.z-s0.z, L=Math.hypot(dx,dz)||1; dx/=L; dz/=L;
            var gy=(s0.y||0)-0.3;
            [1.25, 1.55].forEach(function(lyOff){
              var cam=new T.PerspectiveCamera(42,1.6,0.1,300);
              cam.position.set(s0.x-dx*9.4, gy+5.5, s0.z-dz*9.4);
              cam.lookAt(s0.x+dx*4.2, gy+lyOff, s0.z+dz*4.2);
              cam.updateMatrixWorld(true);
              wispHudCams.push(cam);
            });
          });
        })();
        var wispProjV=new T.Vector3();
        function wispHitsHud(wx,wy,wz,k){
          // Test lantern envelope + hanging stem + drifting firefly sparks against strict top-right HUD clearance
          // (requirement: screenX < 870 || screenY > 125 at 1024x640; guard with extra safety margin: sx >= 845 && sy <= 145)
          var rH=0.88*k, yLo=-0.62*k, yHi=1.10*k;
          var pts=[
            [0,0,0],[rH,0,0],[-rH,0,0],[0,0,rH],[0,0,-rH],
            [rH,yHi,0],[-rH,yHi,0],[0,yHi,rH],[0,yHi,-rH],
            [rH,yLo,0],[-rH,yLo,0],[0,yLo,rH],[0,yLo,-rH]
          ];
          for(var ci=0;ci<wispHudCams.length;ci++){
            var cam=wispHudCams[ci];
            for(var pi=0;pi<pts.length;pi++){
              wispProjV.set(wx+pts[pi][0], wy+pts[pi][1], wz+pts[pi][2]).project(cam);
              if(wispProjV.z<-1 || wispProjV.z>1) continue;
              var sx=(wispProjV.x*0.5+0.5)*1024;
              var sy=(0.5-wispProjV.y*0.5)*640;
              // Reject ONLY points actually projecting onto the visible top-right HUD buttons or top-left pill!
              if(sx>=845 && sx<=1045 && sy>=-24 && sy<=145) return true;
              if(sx>=-24 && sx<=225 && sy>=-24 && sy<=68) return true;
            }
          }
          return false;
        }
        function addCrystalWispLantern(x,y,z,sc,palIdx){
          var k=(sc||1)*0.96, pi=((palIdx%3)+3)%3;
          // Guard every vertex (including lower teardrop tip & sparks ~0.72*k) strictly y >= 6.75 inside r < 38.5!
          var distC=Math.hypot(x-cx,z-cz), yPad=0.72*k;
          var wy=(distC<39.6) ? Math.max(y,6.75+yPad) : Math.max(y,5.1+yPad);
          // Strict HUD button clearance: skip any wisp that would enter top-right HUD (sx >= 845 && sy <= 145) or top-left pill
          if(wispHitsHud(x,wy,z,k)) return;
          // 1. Delicate sculpted mineral calyx cap + slender hanging crystal tether stem
          var stem=new T.Mesh(wispStemGeo,wispCapMat);
          stem.position.set(x,wy+0.78*k,z); stem.scale.setScalar(k);
          ceilGrp.add(stem);
          var cap=new T.Mesh(wispCapGeo,wispCapMat);
          cap.position.set(x,wy+0.52*k,z); cap.scale.setScalar(k); cap.rotation.y=palIdx*0.7;
          ceilGrp.add(cap);
          // 2. Sculpted organic teardrop bioluminescent crystal lantern body + bright teardrop jewel tip
          var body=new T.Mesh(wispLanternGeo,wispLanternMats[pi]);
          body.position.set(x,wy,z); body.scale.setScalar(k); body.rotation.y=palIdx*0.9;
          ceilGrp.add(body);
          var core=new T.Mesh(wispCoreGeo,wispHeartMat);
          core.position.set(x,wy-0.32*k,z); core.scale.setScalar(k*0.62);
          ceilGrp.add(core);
          // 3. Soft tightly form-fitting elongated teardrop shimmer veil (NOT a round disc or flat circle badge!)
          var veil=new T.Mesh(wispVeilGeo,wispVeilMats[pi]);
          veil.position.set(x,wy,z); veil.scale.setScalar(k); veil.rotation.y=palIdx*0.9+0.35; veil.renderOrder=2;
          ceilGrp.add(veil);
          // 4. 5 tiny organic drifting bioluminescent firefly sparks scattered softly around the teardrop lantern
          var sparkOffsets=[
            [ 0.44,  0.18,  0.22, 0.95],
            [-0.48, -0.14,  0.28, 0.78],
            [ 0.24, -0.44, -0.36, 0.85],
            [-0.30,  0.34, -0.40, 0.68],
            [ 0.56, -0.26, -0.14, 0.62]
          ];
          var sYaw=palIdx*1.37, cY=Math.cos(sYaw), sY=Math.sin(sYaw);
          for(var mi=0;mi<sparkOffsets.length;mi++){
            var so=sparkOffsets[mi];
            var ox=(so[0]*cY-so[2]*sY)*k, oz=(so[0]*sY+so[2]*cY)*k, oy=so[1]*k;
            var sMat=(mi===0) ? wispHeartMat : wispSparkMats[(pi+mi)%3];
            var spM=new T.Mesh(wispSparkGeo,sMat);
            spM.position.set(x+ox, wy+oy, z+oz);
            spM.scale.setScalar(k*so[3]); spM.rotation.set(mi*0.6, palIdx+mi, 0.4);
            ceilGrp.add(spM);
            if(mi<3){
              var spH=new T.Mesh(wispSparkHaloGeo,wispSparkHaloMats[(pi+mi)%3]);
              spH.position.set(x+ox, wy+oy, z+oz);
              spH.scale.setScalar(k*so[3]*1.15); spH.renderOrder=2;
              ceilGrp.add(spH);
            }
          }
        }
        // Layer B1: 12 Monumental rocky cavern perimeter buttress-ribs curving high into the vaulted roof (360 degrees!)
        var N_BUTT=12;
        for(var bi=0;bi<N_BUTT;bi++){
          var bang=bi*Math.PI*2/N_BUTT+0.12;
          var wvB=rockWave(bang,6.0);
          var pts=[], rads=[];
          var ribSteps=[
            { rf:0.99, y:waterY-1.4, r:2.85 },
            { rf:0.96, y:1.8,        r:2.45 },
            { rf:0.93, y:5.2,        r:2.10 },
            { rf:0.88, y:8.2,        r:1.85 },
            { rf:0.80, y:11.0,       r:1.62 },
            { rf:0.70, y:13.8,       r:1.42 },
            { rf:0.60, y:16.2,       r:1.22 },
            { rf:0.53, y:18.0,       r:1.02 }
          ];
          ribSteps.forEach(function(rs,rsi){
            var angJ=bang+0.035*Math.sin(rsi*1.2+bi);
            pts.push(new T.Vector3(cx+Math.cos(angJ)*rxW*rs.rf*wvB, rs.y, cz+Math.sin(angJ)*rzW*rs.rf*wvB));
            rads.push(rs.r);
          });
          addRockyVaultRib(pts,rads,bi*1.3);
          // Luminous winding aqua/amethyst mineral vein climbing the cavern buttress face from lake up into the vault!
          addMineralVeinRibbon(pts.slice(1,7),0.22,bi,1.82,-0.15);
          // Subtle surf-ripple collar where each cavern rock buttress meets the subterranean lake
          var bxW=cx+Math.cos(bang)*rxW*0.97*wvB, bzW=cz+Math.sin(bang)*rzW*0.97*wvB;
          smoothFoamRing(bxW,waterY+0.060,bzW,3.4,3.1);
          // Hanging stalactite cluster & glowing bioluminescent crystals nestled on the rib's arched underside (y >= 6.8!)
          var stP=pts[4];
          addStalactiteCluster(stP.x,stP.y-0.55,stP.z,3.2+(bi%3)*0.55,0.68,bi,6.8);
          addCeilingCrystalCluster(stP.x,stP.y-0.95,stP.z,1.18+(bi%2)*0.24,bi);
        }
        // Layer B2: Sculpted arcaded stone ceiling arches bridging bay-to-bay around BOTH outer (rf=0.88, r>=38)
        // and inner (rf=0.69, r~30) vault tiers so layered subterranean arches + hanging stalactites boldly frame
        // the entire upper band (0-1024, 0-115px) while staying strictly y >= 6.6 over the playable board & camera!
        for(var aiA=0;aiA<N_BUTT;aiA++){
          var a0=aiA*Math.PI*2/N_BUTT+0.12, a1=(aiA+1)*Math.PI*2/N_BUTT+0.12;
          // Outer cavern arcade arch (strictly outside maxCamR at rf=0.88..0.84, sweeping across sy = 0..90px!)
          var outPts=[], outRads=[];
          for(var tO=0;tO<=8;tO++){
            var uO=tO/8, angO=a0+(a1-a0)*uO, archSin=Math.sin(uO*Math.PI);
            var rfO=0.91-0.06*archSin, wvO=rockWave(angO,8.5);
            var yO=6.5+3.8*archSin+0.32*Math.sin(uO*Math.PI*3+aiA);
            outPts.push(new T.Vector3(cx+Math.cos(angO)*rxW*rfO*wvO, yO, cz+Math.sin(angO)*rzW*rfO*wvO));
            outRads.push(1.52-0.34*archSin);
          }
          addRockyVaultRib(outPts,outRads,aiA*2.1+0.5);
          // Glowing aqua & amethyst mineral veins braided along the outer cavern arcade arch!
          addMineralVeinRibbon(outPts,0.20,aiA,1.12,-0.52);
          // Inner vaulted ceiling framing arch (strictly y >= 7.8 everywhere -> tube underside >= 6.75 > 6.5!)
          var inPts=[], inRads=[];
          for(var tI=0;tI<=8;tI++){
            var uI=tI/8, angI=a0+(a1-a0)*uI, archSinI=Math.sin(uI*Math.PI);
            var rfI=0.73-0.05*archSinI, wvI=rockWave(angI,9.5);
            var yI=8.1+2.6*archSinI+0.24*Math.cos(uI*Math.PI*3-aiA);
            inPts.push(new T.Vector3(cx+Math.cos(angI)*rxW*rfI*wvI, yI, cz+Math.sin(angI)*rzW*rfI*wvI));
            inRads.push(1.12-0.24*archSinI);
          }
          addRockyVaultRib(inPts,inRads,aiA*2.7+1.9);
          // Glowing alternating amethyst/aqua mineral vein tracing the inner ceiling arch underside (y >= 7.2!)
          addMineralVeinRibbon(inPts,0.16,aiA+1,0.72,-0.32);
          // Layer C + D: Hanging stalactite curtains, glowing mineral tips & floating crystal-wisp lanterns!
          [1,3,4,5,7].forEach(function(kIdx,ki){
            var op=outPts[kIdx];
            // Outer rim (r >= 37, well outside board & cameras): dramatic stalactite curtains dipping to y >= 5.0 (sy ~ 85-95px)!
            var isMid=(kIdx===3 || kIdx===4 || kIdx===5);
            addStalactiteCluster(op.x,op.y-0.35,op.z,(isMid?3.6:2.6)+((aiA+ki)%3)*0.65,isMid?0.72:0.54,aiA*5+ki,5.1);
            if(kIdx===3 || kIdx===5) addCeilingCrystalCluster(op.x,op.y-0.65,op.z,1.16+((aiA+ki)%2)*0.24,aiA+ki);
            if(kIdx===4){
              // Floating organic teardrop bioluminescent crystal lantern hanging gracefully inside each outer cavern arch bay!
              var dxW=cx-op.x, dzW=cz-op.z, dlW=Math.hypot(dxW,dzW)||1;
              addCrystalWispLantern(op.x+(dxW/dlW)*1.5, 5.35+(aiA%3)*0.65, op.z+(dzW/dlW)*1.5, 1.16+(aiA%2)*0.16, aiA);
            }
          });
          [2,4,6].forEach(function(kIdx,ki){
            var ip=inPts[kIdx];
            // Inner playable-perimeter framing arch (strictly minTipY = 6.75 > 6.5!): crisp dark stalactites along sy = 0..65px!
            addStalactiteCluster(ip.x,ip.y-0.30,ip.z,2.1+((aiA+ki)%3)*0.55,0.52+(ki===1?0.12:0),aiA*7+ki+2,6.75);
            if(ki===1){
              addCeilingCrystalCluster(ip.x,ip.y-0.55,ip.z,1.02,aiA+2);
              // Inner high-vault floating crystal-wisp lantern hovering cleanly at y = 7.4..8.8!
              addCrystalWispLantern(ip.x, 7.5+(aiA%3)*0.55, ip.z, 0.92+(aiA%2)*0.14, aiA+1);
            }
          });
        }
        // Additional luminous cavern wall mineral crystal pockets + mid-outer drifting crystal-wisp lanterns (r >= 35.5)
        for(var wi=0;wi<18;wi++){
          var wang=wi*Math.PI*2/18+0.22, wvW=rockWave(wang,4.5);
          var wxC=cx+Math.cos(wang)*rxW*0.93*wvW, wzC=cz+Math.sin(wang)*rzW*0.93*wvW;
          var wyC=3.6+(wi%3)*1.45;
          addCeilingCrystalCluster(wxC,wyC,wzC,1.08+(wi%3)*0.22,wi);
          if(wi%2===0){
            var wxL=cx+Math.cos(wang+0.09)*rxW*0.84*wvW, wzL=cz+Math.sin(wang+0.09)*rzW*0.84*wvW;
            addCrystalWispLantern(wxL, 4.7+(wi%3)*0.85, wzL, 0.95+(wi%2)*0.16, wi+2);
          }
        }
        compactGroupInPlace(ceilGrp, true, null);
        ceilGrp.traverse(function(o){
          if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; }
        });
        extras.add(ceilGrp);
      })();
      // iter32 MIN 5: Glowing Bioluminescent Crystal Sanctuary Alcove transforming the upper-right dim lake
      // (620-1024, 60-200) into sculpted tiered limestone cavern ledges, luminous turquoise & amethyst crystal spires,
      // soft glowing water-reflection shimmer rings, and a natural arched rock formation framing the upper-right
      // grotto horizon (strictly clear of path tiles, obstacles, cameras, HUD pills, Echo & Bok; in `extras` with 0 own()).
      (function buildCrystalSanctuaryAlcove(){
        var sancGrp=new T.Group();
        sancGrp.name='caves-crystal-sanctuary';
        var isNight=!!view.night;
        var rxSpan=Math.max(22,(bounds.maxX-bounds.minX)*0.5);
        var rzSpan=Math.max(19,(bounds.maxZ-bounds.minZ)*0.5);
        var rxW=Math.max(rxSpan+23.0,46.0), rzW=Math.max(rzSpan+25.5,45.0);
        // Exact live MP8 follow camera for 09-caves ([5.5, 9.4, 4.2, 1.25], fov=42, aspect=1.6)
        var sCamIdx=cavesShopSp ? cavesShopSp.i : activeIdx;
        var sCur=main[sCamIdx]||main[0], sNxt=main[(sCamIdx+1)%main.length]||sCur;
        var sDx=sNxt.x-sCur.x, sDz=sNxt.z-sCur.z, sL=Math.hypot(sDx,sDz)||1; sDx/=sL; sDz/=sL;
        var sGy=(sCur.y||0);
        var sancCam=new T.PerspectiveCamera(42,1.6,0.1,300);
        sancCam.position.set(sCur.x-sDx*9.4, sGy+5.5, sCur.z-sDz*9.4);
        sancCam.lookAt(sCur.x+sDx*4.2, sGy+1.55, sCur.z+sDz*4.2);
        sancCam.updateMatrixWorld(true);
        // Collect all loop follow-camera positions so no elevated sanctuary rock/crystal ever blocks any tile's camera
        var allCamPts=[];
        for(var ci=0;ci<sp.length;ci++){
          var cs0=sp[ci], cs1=(typeof reef3dAhead==='function') ? reef3dAhead(sp,ci) : main[(ci+1)%main.length];
          if(!cs0 || !cs1) continue;
          var cdx=cs1.x-cs0.x, cdz=cs1.z-cs0.z, cl=Math.hypot(cdx,cdz)||1;
          allCamPts.push([cs0.x-(cdx/cl)*9.4, cs0.z-(cdz/cl)*9.4]);
        }
        var projV=new T.Vector3();
        function proj2D(x,y,z){
          projV.set(x,y,z).project(sancCam);
          return { sx:(projV.x*0.5+0.5)*1024, sy:(0.5-projV.y*0.5)*640, ndcZ:projV.z };
        }
        function clearOfBoardAndCams(x,z,tilePad,camPad){
          if(!outerClear(x,z,tilePad||8.5)) return false;
          if(Math.hypot(x-echoPoolX,z-echoPoolZ)<12.0) return false;
          if(nearCavesBok(x,z,12.0)) return false;
          for(var oi=0;oi<view._sceneryObstacles.length;oi++){
            var o=view._sceneryObstacles[oi];
            if(Math.hypot(x-o.x,z-o.z)<4.0) return false;
          }
          if(camPad>0){
            for(var cpi=0;cpi<allCamPts.length;cpi++){
              if(Math.hypot(x-allCamPts[cpi][0],z-allCamPts[cpi][1])<camPad) return false;
            }
          }
          return true;
        }
        // Locate exact upper-right cavern bay azimuth centered around screen (sx ~ 802, sy ~ 148)
        var bestAng=null, bestSc=Infinity;
        for(var ai=0;ai<144;ai++){
          var aTry=ai*Math.PI*2/144;
          var tx=cx+Math.cos(aTry)*rxW*0.90, tz=cz+Math.sin(aTry)*rzW*0.90;
          if(!clearOfBoardAndCams(tx,tz,9.0,4.5)) continue;
          var p2=proj2D(tx,1.6,tz);
          if(p2.ndcZ<-1 || p2.ndcZ>1) continue;
          var sc=Math.hypot((p2.sx-802)/200,(p2.sy-148)/120);
          if(sc<bestSc){ bestSc=sc; bestAng=aTry; }
        }
        if(bestAng===null) return;
        // Determine angular orientation sign so +dDeg moves strictly left -> right across (620..1024)
        var pNeg=proj2D(cx+Math.cos(bestAng-0.06)*rxW*0.90, 1.4, cz+Math.sin(bestAng-0.06)*rzW*0.90);
        var pPos=proj2D(cx+Math.cos(bestAng+0.06)*rxW*0.90, 1.4, cz+Math.sin(bestAng+0.06)*rzW*0.90);
        var angSign=(pPos.sx>=pNeg.sx)?1:-1;
        function bayPt(dDeg,rf){
          var a=bestAng+angSign*(dDeg*Math.PI/180);
          return { x:cx+Math.cos(a)*rxW*rf, z:cz+Math.sin(a)*rzW*rf, ang:a };
        }
        // Shared materials (vertexColors + bioluminescent fog:false on crystals/shimmer so they glow cleanly!)
        var stoneMat=new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,fog:true});
        var crystMat=new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,fog:false});
        var aquaGlowMat=new T.MeshBasicMaterial({color:isNight?'#56fff6':'#68fff8',transparent:true,opacity:isNight?0.20:0.16,depthWrite:false,side:T.DoubleSide,fog:false});
        var amethGlowMat=new T.MeshBasicMaterial({color:isNight?'#c892ff':'#d4a6ff',transparent:true,opacity:isNight?0.19:0.15,depthWrite:false,side:T.DoubleSide,fog:false});
        var heartMat=new T.MeshBasicMaterial({color:'#f4ffff',fog:false});
        var amberHeartMat=new T.MeshBasicMaterial({color:'#ffe49a',fog:false});
        var cTmp=new T.Color(), cA=new T.Color(), cB=new T.Color(), cC=new T.Color();

        // 1. Soft recessed bioluminescent grotto aura confined strictly INSIDE the sanctuary arch opening (zero spill above arch or HUD!)
        (function addSanctuaryBackGlow(){
          var nU=22, nV=10, pos=[], cols=[], idx=[];
          var cHeart=new T.Color(isNight?'#3ef4ee':'#5af6f0');
          var cMid  =new T.Color(isNight?'#6458c4':'#7e6ed8');
          var cEdge =new T.Color(isNight?'#13243a':'#1c344f');
          for(var iv=0;iv<=nV;iv++){
            var vf=iv/nV;
            for(var iu=0;iu<=nU;iu++){
              var uf=iu/nU;
              var dDeg=-10.0+uf*19.2;
              var archH=Math.sin(uf*Math.PI);
              var yTop=0.55+3.85*Math.pow(archH,0.72);
              var vy=waterY+0.08+vf*(yTop-(waterY+0.08));
              var pt=bayPt(dDeg, 0.958-0.012*archH*Math.sin(vf*Math.PI));
              pos.push(pt.x,vy,pt.z);
              var radial=archH*Math.sin(Math.pow(vf,0.80)*Math.PI);
              var glow=Math.pow(Math.max(0,radial),1.05);
              cTmp.copy(cEdge).lerp(cMid, Math.min(1,glow*0.92));
              cTmp.lerp(cHeart, Math.pow(Math.max(0,radial),1.75)*0.82);
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          var stride=nU+1;
          for(var r=0;r<nV;r++) for(var c=0;c<nU;c++){
            var a=r*stride+c, b=a+1, d=a+stride, e=d+1;
            idx.push(a,d,b, b,d,e);
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          var m=new T.Mesh(g,new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,transparent:true,opacity:isNight?0.44:0.38,depthWrite:false,side:T.DoubleSide,fog:false}));
          m.renderOrder=1;
          sancGrp.add(m);
        })();

        // Helper: Sculpted tiered limestone cavern ledge with crisp undercut strata steps & pale calcite terrace tops
        var cStoneShadow=new T.Color(isNight?'#1d354d':'#274460');
        var cStoneWet   =new T.Color(isNight?'#2b4d6a':'#3b6280');
        var cStoneMid   =new T.Color(isNight?'#4e7894':'#6692ae');
        var cStoneHi    =new T.Color(isNight?'#84b0c8':'#a6cde0');
        var cStoneAq    =new T.Color(isNight?'#4cd4dc':'#68e8ee');
        function addLimestoneLedge(x,z,rx,rz,yBot,yTop,seed,yaw,withPoolCol){
          var nSeg=26, hSpan=Math.max(0.25,yTop-waterY);
          var rings=[
            { rf:1.12, y:yBot,                  lip:0.00, shade:0.05, aq:0.15 },
            { rf:1.06, y:waterY+0.07,           lip:0.03, shade:0.22, aq:0.44 },
            { rf:0.93, y:waterY+hSpan*0.42,     lip:0.01, shade:0.16, aq:0.18 }, // crisp darker undercut shelf
            { rf:1.05, y:waterY+hSpan*0.76,     lip:0.05, shade:0.74, aq:0.22 }, // proud sculpted limestone overhang lip
            { rf:1.00, y:yTop-0.05,             lip:0.02, shade:0.96, aq:0.16 }, // bright pale-calcite terrace rim
            { rf:0.86, y:yTop,                  lip:0.00, shade:1.00, aq:0.12 }
          ];
          var pos=[], cols=[], idx=[];
          var cy=Math.cos(yaw||0), sy=Math.sin(yaw||0);
          for(var ri=0;ri<rings.length;ri++){
            var rk=rings[ri];
            for(var si=0;si<nSeg;si++){
              var a=si*Math.PI*2/nSeg;
              var wob=1+0.080*Math.sin(a*3+seed)+0.045*Math.cos(a*5-seed*1.2)+0.022*Math.sin(a*7+ri*0.5);
              var lx=Math.cos(a)*rx*rk.rf*wob, lz=Math.sin(a)*rz*rk.rf*wob;
              var wx=x+lx*cy-lz*sy, wz=z+lx*sy+lz*cy;
              var wy=rk.y+rk.lip*Math.sin(a*4+seed*0.7);
              pos.push(wx,wy,wz);
              var facet=0.5+0.5*Math.cos(a*2-seed+0.4);
              if(rk.shade<0.30){
                cTmp.copy(cStoneShadow).lerp(cStoneWet, rk.shade/0.30*(0.65+0.35*facet));
              }else{
                var tU=(rk.shade-0.30)/0.70;
                cTmp.copy(cStoneMid).lerp(cStoneHi, tU*(0.52+0.46*facet));
              }
              cTmp.lerp(cStoneAq, rk.aq*(0.42+0.34*facet));
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          // Center crown vertex for smooth bright calcite limestone terrace top
          var topCenterIdx=rings.length*nSeg;
          pos.push(x,yTop+0.04,z);
          cTmp.copy(cStoneHi).lerp(cStoneAq,0.22);
          cols.push(cTmp.r,cTmp.g,cTmp.b);
          for(var r2=0;r2<rings.length-1;r2++){
            var b0=r2*nSeg, b1=(r2+1)*nSeg;
            for(var s2=0;s2<nSeg;s2++){
              var sn=(s2+1)%nSeg;
              idx.push(b0+s2,b0+sn,b1+s2, b0+sn,b1+sn,b1+s2);
            }
          }
          var lastB=(rings.length-1)*nSeg;
          for(var s3=0;s3<nSeg;s3++){
            idx.push(topCenterIdx, lastB+s3, lastB+((s3+1)%nSeg));
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          sancGrp.add(new T.Mesh(g,stoneMat));
          // Optional luminous bioluminescent mineral spring pool nestled cleanly into the top limestone tier
          if(withPoolCol){
            var pPos=[x,yTop+0.068,z], pCol=[], pIdx=[];
            var cPIn=new T.Color(withPoolCol==='amethyst'?'#f4e4ff':'#e6ffff');
            var cPMid=new T.Color(withPoolCol==='amethyst'?'#c68eff':'#5cfaf2');
            var cPOut=new T.Color(withPoolCol==='amethyst'?'#7e56cc':'#28b8cc');
            pCol.push(cPIn.r,cPIn.g,cPIn.b);
            var nP=22;
            for(var pi=0;pi<nP;pi++){
              var pa=pi*Math.PI*2/nP, pw=1+0.06*Math.sin(pa*3+seed);
              var plx=Math.cos(pa)*rx*0.68*pw, plz=Math.sin(pa)*rz*0.68*pw;
              pPos.push(x+plx*cy-plz*sy, yTop+0.058, z+plx*sy+plz*cy);
              cTmp.copy(cPMid).lerp(cPOut,0.5+0.5*Math.sin(pa*2+seed));
              pCol.push(cTmp.r,cTmp.g,cTmp.b);
            }
            for(var pi2=0;pi2<nP;pi2++) pIdx.push(0, 1+pi2, 1+((pi2+1)%nP));
            var pg=new T.BufferGeometry();
            pg.setAttribute('position',new T.Float32BufferAttribute(pPos,3));
            pg.setAttribute('color',new T.Float32BufferAttribute(pCol,3));
            pg.setIndex(pIdx); pg.computeVertexNormals();
            sancGrp.add(new T.Mesh(pg,crystMat));
          }
        }

        // Helper: Smoothly sculpted natural limestone grotto arch with deep slate ridge & luminous aqua soffit bounce
        function addSanctuaryRockArch(dStart,dEnd,rfStart,rfEnd,rfCrown,peakY,radBase,radCrown,seed,withStalactites){
          var nU=32, nV=14, pos=[], cols=[], idx=[];
          var curvePts=[], curveRads=[];
          for(var iu=0;iu<=nU;iu++){
            var u=iu/nU;
            var dDeg=dStart+(dEnd-dStart)*u;
            var archArc=Math.sin(u*Math.PI);
            var rf=rfStart+(rfEnd-rfStart)*u+(rfCrown-(rfStart+rfEnd)*0.5)*archArc;
            var pt=bayPt(dDeg,rf);
            // Graceful natural cavern limestone arch profile with subtle organic rock contour
            var vy=(waterY-1.15)+(peakY-(waterY-1.15))*Math.pow(archArc,0.76)+0.14*Math.sin(u*Math.PI*3+seed);
            if(iu===0 || iu===nU) vy=waterY-1.25;
            curvePts.push(new T.Vector3(pt.x,vy,pt.z));
            curveRads.push(radBase*(1-0.48*Math.pow(archArc,0.84))+radCrown*Math.pow(archArc,0.84)*(0.94+0.09*Math.sin(u*Math.PI*5+seed)));
          }
          var tan=new T.Vector3(), upV=new T.Vector3(0,1,0), side=new T.Vector3(), norm=new T.Vector3();
          for(var i=0;i<=nU;i++){
            var p=curvePts[i], rad=curveRads[i], u2=i/nU;
            var pPrev=curvePts[Math.max(0,i-1)], pNext=curvePts[Math.min(nU,i+1)];
            tan.subVectors(pNext,pPrev).normalize();
            if(Math.abs(tan.y)>0.96) upV.set(1,0,0); else upV.set(0,1,0);
            side.crossVectors(tan,upV).normalize();
            norm.crossVectors(side,tan).normalize();
            for(var j=0;j<nV;j++){
              var phi=j*Math.PI*2/nV;
              var jag=0.90+0.09*Math.sin(phi*2+i*0.9+seed)+0.05*Math.cos(phi*3-i*0.8);
              var cr=rad*jag, cp=Math.cos(phi), sp2=Math.sin(phi);
              var vx=p.x+(side.x*cp*1.10+norm.x*sp2*0.90)*cr;
              var vy2=p.y+(side.y*cp*1.10+norm.y*sp2*0.90)*cr;
              var vz=p.z+(side.z*cp*1.10+norm.z*sp2*0.90)*cr;
              pos.push(vx,vy2,vz);
              // Rich 3D rock relief: deep indigo-slate upper back, sculpted limestone flank, bright luminous turquoise inner soffit!
              var underGlow=Math.max(0,-sp2)*Math.sin(u2*Math.PI);
              var frontFace=0.5+0.5*Math.cos(phi+seed*0.4);
              var crestLit=Math.max(0,sp2)*0.45+0.55*frontFace;
              cTmp.copy(cStoneShadow).lerp(cStoneWet, 0.35+0.55*frontFace);
              cTmp.lerp(cStoneMid, crestLit*0.62);
              cTmp.lerp(cStoneHi, Math.max(0,sp2)*0.34);
              cTmp.lerp(cStoneAq, underGlow*0.76+0.12*(1-Math.abs(u2-0.5)*1.4));
              cols.push(cTmp.r,cTmp.g,cTmp.b);
            }
          }
          for(var i2=0;i2<nU;i2++){
            var b0=i2*nV, b1=(i2+1)*nV;
            for(var j2=0;j2<nV;j2++){
              var jn=(j2+1)%nV;
              idx.push(b0+j2,b1+j2,b0+jn, b0+jn,b1+j2,b1+jn);
            }
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          sancGrp.add(new T.Mesh(g,stoneMat));
          // Glowing bioluminescent crystal inlays & hanging crystal stalactites adorning the natural rock arch
          if(withStalactites){
            [6,11,15,17,21,26].forEach(function(kIdx,ki){
              var cpP=curvePts[kIdx], crP=curveRads[kIdx];
              var dirToCenterX=cx-cpP.x, dirToCenterZ=cz-cpP.z, dCL=Math.hypot(dirToCenterX,dirToCenterZ)||1;
              var inX=dirToCenterX/dCL, inZ=dirToCenterZ/dCL;
              var icLen=0.68+(ki%3)*0.26, icR=0.13+(ki%2)*0.035;
              var isAm=(ki%2===1);
              addCrystalSpire(cpP.x+inX*crP*0.32, cpP.y-crP*0.52, cpP.z+inZ*crP*0.32, icR, icLen, Math.PI+(ki%2?0.10:-0.10), ki*0.8, 0.06, isAm?'amethyst':'turquoise', false);
              if(kIdx===6 || kIdx===16 || kIdx===26){
                addCrystalSpire(cpP.x+inX*crP*0.74, cpP.y+0.02, cpP.z+inZ*crP*0.74, 0.16, 0.82+(kIdx===16?0.32:0), 0.34, Math.atan2(inX,inZ), (kIdx===16?0:(kIdx<16?0.22:-0.22)), kIdx===16?'amethyst':'turquoise', true);
              }
            });
          }
        }

        // Helper: Faceted 6-sided luminous hexagonal crystal spire with crisp high-contrast jewel shading & tight aura
        var crystPals={
          turquoise:{ bot:'#128da6', mid:'#4efcf4', top:'#f2ffff', glow:aquaGlowMat },
          seafoam:  { bot:'#179b84', mid:'#68ffda', top:'#f2fffb', glow:aquaGlowMat },
          amethyst: { bot:'#562cb8', mid:'#c88aff', top:'#faf0ff', glow:amethGlowMat },
          amber:    { bot:'#b8701e', mid:'#ffd86e', top:'#fffbe0', glow:null }
        };
        function makeCrystalPrismGeo(palKey){
          var pal=crystPals[palKey]||crystPals.turquoise;
          cA.set(pal.bot); cB.set(pal.mid); cC.set(pal.top);
          var n=6, pos=[], cols=[];
          var shaftH=0.67, tipH=1.0, rBot=1.0, rMid=0.79;
          function pushTri(ax,ay,az,ca, bx,by,bz,cb, cx2,cy2,cz2,cc){
            pos.push(ax,ay,az, bx,by,bz, cx2,cy2,cz2);
            cols.push(ca.r,ca.g,ca.b, cb.r,cb.g,cb.b, cc.r,cc.g,cc.b);
          }
          var col0=new T.Color(), col1=new T.Color(), col2=new T.Color();
          for(var i=0;i<n;i++){
            var a0=i*Math.PI*2/n, a1=(i+1)*Math.PI*2/n;
            // Crisp jewel-cut facet contrast so every hexagonal edge reads sharply at 1024x640
            var fLit=0.74+0.40*(0.5+0.5*Math.cos(a0-0.55));
            var x0b=Math.cos(a0)*rBot, z0b=Math.sin(a0)*rBot;
            var x1b=Math.cos(a1)*rBot, z1b=Math.sin(a1)*rBot;
            var x0m=Math.cos(a0)*rMid, z0m=Math.sin(a0)*rMid;
            var x1m=Math.cos(a1)*rMid, z1m=Math.sin(a1)*rMid;
            col0.copy(cA).multiplyScalar(Math.min(1.16,fLit));
            col1.copy(cB).multiplyScalar(Math.min(1.18,fLit*1.04));
            col2.copy(cC);
            pushTri(x0b,0,z0b,col0, x0m,shaftH,z0m,col1, x1b,0,z1b,col0);
            pushTri(x1b,0,z1b,col0, x0m,shaftH,z0m,col1, x1m,shaftH,z1m,col1);
            pushTri(x0m,shaftH,z0m,col1, 0,tipH,0,col2, x1m,shaftH,z1m,col1);
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.computeVertexNormals();
          return g;
        }
        var spireGeos={
          turquoise:makeCrystalPrismGeo('turquoise'),
          seafoam:  makeCrystalPrismGeo('seafoam'),
          amethyst: makeCrystalPrismGeo('amethyst'),
          amber:    makeCrystalPrismGeo('amber')
        };
        var spireAuraGeo=new T.ConeGeometry(1.12,1.05,6);
        spireAuraGeo.translate(0,0.52,0);
        var orbHeartGeo=new T.OctahedronGeometry(1,1);
        function addCrystalSpire(x,y,z,r,h,tiltX,rotY,tiltZ,palKey,withAura){
          var g=spireGeos[palKey]||spireGeos.turquoise;
          var m=new T.Mesh(g,crystMat);
          m.position.set(x,y,z);
          m.scale.set(r,h,r);
          m.rotation.set(tiltX||0,rotY||0,tiltZ||0);
          sancGrp.add(m);
          var pal=crystPals[palKey];
          if(withAura && pal && pal.glow){
            var au=new T.Mesh(spireAuraGeo,pal.glow);
            au.position.set(x,y-0.03,z);
            au.scale.set(r*1.24,h*1.04,r*1.24);
            au.rotation.set(tiltX||0,rotY||0,tiltZ||0);
            au.renderOrder=2;
            sancGrp.add(au);
          }
        }
        // Rich asymmetric multi-spire crystal cluster (hero spire + flanking tilted sub-spires + bright root jewel heart!)
        function addCrystalCluster(x,y,z,scale,primaryPal,secondaryPal,seed){
          var k=scale||1;
          var specs=[
            [ 0.00,  0.00, 0.44, 2.85,  0.04, 0.2+seed,  0.04, primaryPal,   true ],
            [-0.54,  0.18, 0.35, 2.22,  0.14, 1.1+seed,  0.28, secondaryPal, true ],
            [ 0.52, -0.14, 0.33, 2.02, -0.12, 2.2+seed, -0.26, primaryPal==='turquoise'?'seafoam':'turquoise', true ],
            [-0.26, -0.44, 0.26, 1.52, -0.24, 0.6+seed,  0.16, primaryPal,   false],
            [ 0.36,  0.42, 0.25, 1.42,  0.22, 1.8+seed, -0.20, secondaryPal, false],
            [-0.70, -0.22, 0.20, 1.05, -0.16, 2.9+seed,  0.38, primaryPal,   false],
            [ 0.68,  0.20, 0.19, 0.98,  0.15, 0.4+seed, -0.36, secondaryPal, false]
          ];
          var cy=Math.cos(seed*0.7), sy=Math.sin(seed*0.7);
          specs.forEach(function(spS){
            var lx=spS[0]*k, lz=spS[1]*k;
            var wx=x+lx*cy-lz*sy, wz=z+lx*sy+lz*cy;
            addCrystalSpire(wx, y-0.08*k, wz, spS[2]*k, spS[3]*k, spS[4], spS[5], spS[6], spS[7], spS[8]);
          });
          var ht=new T.Mesh(orbHeartGeo,heartMat);
          ht.position.set(x,y+0.34*k,z); ht.scale.set(0.32*k,0.26*k,0.32*k);
          sancGrp.add(ht);
          var hGlow=new T.Mesh(orbHeartGeo, primaryPal==='amethyst'?amethGlowMat:aquaGlowMat);
          hGlow.position.set(x,y+0.40*k,z); hGlow.scale.set(0.72*k,0.52*k,0.72*k); hGlow.renderOrder=2;
          sancGrp.add(hGlow);
        }

        // Helper: Crisp, delicate feathered glowing water-reflection shimmer rings (clean spacing, zero muddy sheet overlap!)
        function makeFeatheredRingGeo(rIn,rOut,segs){
          var n=segs||36, pos=[], cols=[], idx=[];
          var rMid=(rIn+rOut)*0.5;
          for(var i=0;i<n;i++){
            var a=i*Math.PI*2/n, ca=Math.cos(a), sa=Math.sin(a);
            var wob=1+0.028*Math.sin(a*3)+0.016*Math.cos(a*5);
            pos.push(ca*rIn*wob, 0, sa*rIn*wob);   cols.push(0.42,0.58,0.68);
            pos.push(ca*rMid*wob,0, sa*rMid*wob);  cols.push(1.00,1.00,1.00);
            pos.push(ca*rOut*wob,0, sa*rOut*wob);  cols.push(0.35,0.52,0.64);
          }
          for(var i2=0;i2<n;i2++){
            var b0=i2*3, b1=((i2+1)%n)*3;
            idx.push(b0,b0+1,b1, b1,b0+1,b1+1);
            idx.push(b0+1,b0+2,b1+1, b1+1,b0+2,b1+2);
          }
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
          g.setIndex(idx); g.computeVertexNormals();
          return g;
        }
        var shimRingThinGeo=makeFeatheredRingGeo(0.88,1.00,36);
        var shimRingMidGeo =makeFeatheredRingGeo(0.80,1.00,36);
        var shimMats={
          foam:   new T.MeshBasicMaterial({color:'#eaffff',vertexColors:true,transparent:true,opacity:isNight?0.74:0.80,depthWrite:false,side:T.DoubleSide,fog:false}),
          aqua1:  new T.MeshBasicMaterial({color:'#6cfef6',vertexColors:true,transparent:true,opacity:isNight?0.56:0.50,depthWrite:false,side:T.DoubleSide,fog:false}),
          aqua2:  new T.MeshBasicMaterial({color:'#48e6f0',vertexColors:true,transparent:true,opacity:isNight?0.32:0.28,depthWrite:false,side:T.DoubleSide,fog:false}),
          ameth1: new T.MeshBasicMaterial({color:'#d09cff',vertexColors:true,transparent:true,opacity:isNight?0.48:0.42,depthWrite:false,side:T.DoubleSide,fog:false}),
          ameth2: new T.MeshBasicMaterial({color:'#a47cf4',vertexColors:true,transparent:true,opacity:isNight?0.26:0.22,depthWrite:false,side:T.DoubleSide,fog:false})
        };
        function addWaterShimmerRings(x,z,rx,rz,yaw,isAmethyst){
          var wyS=waterY+0.068;
          // Tight crisp luminous shoreline foam collar hugging the limestone base
          var r0=new T.Mesh(shimRingThinGeo,shimMats.foam);
          r0.position.set(x,wyS+0.008,z); r0.scale.set(rx*1.12,1,rz*1.12); r0.rotation.y=yaw||0; r0.renderOrder=3;
          sancGrp.add(r0);
          // Delicate glowing bioluminescent reflection shimmer ring around the terrace
          var r1=new T.Mesh(shimRingMidGeo,isAmethyst?shimMats.ameth1:shimMats.aqua1);
          r1.position.set(x,wyS+0.003,z); r1.scale.set(rx*1.34,1,rz*1.34); r1.rotation.y=(yaw||0)+0.35; r1.renderOrder=2;
          sancGrp.add(r1);
        }
        // Clean concentric glowing water-reflection shimmer rings floating gently on the open lake surface
        function addLakeReflectionShimmer(x,z,rx,rz,yaw,isAmethyst){
          var wyR=waterY+0.066;
          var rIn=new T.Mesh(shimRingThinGeo,isAmethyst?shimMats.ameth1:shimMats.aqua1);
          rIn.position.set(x,wyR+0.006,z); rIn.scale.set(rx*0.58,1,rz*0.58); rIn.rotation.y=(yaw||0)+0.15; rIn.renderOrder=3;
          sancGrp.add(rIn);
          var rMid=new T.Mesh(shimRingThinGeo,isAmethyst?shimMats.ameth2:shimMats.aqua1);
          rMid.position.set(x,wyR+0.003,z); rMid.scale.set(rx*0.92,1,rz*0.92); rMid.rotation.y=(yaw||0)-0.2; rMid.renderOrder=2;
          sancGrp.add(rMid);
          var rOut=new T.Mesh(shimRingThinGeo,isAmethyst?shimMats.ameth2:shimMats.aqua2);
          rOut.position.set(x,wyR,z); rOut.scale.set(rx*1.22,1,rz*1.22); rOut.rotation.y=(yaw||0)+0.4; rOut.renderOrder=2;
          sancGrp.add(rOut);
        }

        // 2. Sculpted Tiered Limestone Cavern Ledges + Luminous Turquoise & Amethyst Crystal Spires
        // A) Central Grand Sanctuary Dais (3 bold stepped limestone tiers centered cleanly inside the grand rock arch)
        var pCen=bayPt(-0.8,0.895);
        if(clearOfBoardAndCams(pCen.x,pCen.z,9.0,4.5)){
          var cenYaw=Math.atan2(cx-pCen.x,cz-pCen.z);
          addLimestoneLedge(pCen.x,pCen.z, 4.70,3.45, waterY-1.15, 0.44, 1.2, cenYaw, null);
          addLimestoneLedge(pCen.x+(cx-pCen.x)*0.014, pCen.z+(cz-pCen.z)*0.014, 3.40,2.55, 0.24, 1.15, 2.5, cenYaw+0.3, null);
          addLimestoneLedge(pCen.x-(cx-pCen.x)*0.012, pCen.z-(cz-pCen.z)*0.012, 2.25,1.76, 0.92, 1.78, 3.8, cenYaw-0.2, 'turquoise');
          addWaterShimmerRings(pCen.x,pCen.z, 4.80,3.55, cenYaw, false);
          // Grand Cathedral Crystal Spire Cluster crowning the central limestone dais (tip y ~ 5.05, framed cleanly inside arch!)
          addCrystalCluster(pCen.x, 1.72, pCen.z, 1.24, 'turquoise', 'amethyst', 1.1);
          // Flanking lower-tier amethyst & seafoam crystal accents stepping across the central terrace
          var cL=bayPt(-3.9,0.882), cR=bayPt(2.4,0.884);
          addCrystalCluster(cL.x, 0.42, cL.z, 0.80, 'amethyst', 'turquoise', 2.4);
          addCrystalCluster(cR.x, 0.42, cR.z, 0.76, 'seafoam', 'amethyst', 3.7);
          // Warm amber crystal lantern-bud pair on the central mid-tier step for Mario Party 8 warmth
          addCrystalSpire(pCen.x+(cx-pCen.x)*0.044, 1.12, pCen.z+(cz-pCen.z)*0.044, 0.17, 0.76, 0.12, 0.5, 0.10, 'amber', false);
          var amDot=new T.Mesh(orbHeartGeo,amberHeartMat);
          amDot.position.set(pCen.x+(cx-pCen.x)*0.044, 1.78, pCen.z+(cz-pCen.z)*0.044); amDot.scale.setScalar(0.17);
          sancGrp.add(amDot);
        }

        // B) Left Sanctuary Wing Ledge (tiered limestone shelf cleanly right of butt[6] & red treasure tunnel!)
        var pLeft=bayPt(-8.8,0.892);
        if(clearOfBoardAndCams(pLeft.x,pLeft.z,9.0,4.5)){
          var lYaw=Math.atan2(cx-pLeft.x,cz-pLeft.z);
          addLimestoneLedge(pLeft.x,pLeft.z, 3.85,2.90, waterY-1.15, 0.46, 4.3, lYaw, null);
          addLimestoneLedge(pLeft.x-(cx-pLeft.x)*0.010, pLeft.z-(cz-pLeft.z)*0.010, 2.55,1.95, 0.26, 1.12, 5.6, lYaw-0.25, 'amethyst');
          addWaterShimmerRings(pLeft.x,pLeft.z, 3.92,2.98, lYaw, true);
          addCrystalCluster(pLeft.x, 1.06, pLeft.z, 1.06, 'amethyst', 'turquoise', 4.2);
          // Far-left luminous turquoise crystal shoulder pocket (sx ~ 635..670, strictly clear of butt[6] & coins!)
          var pFarL=bayPt(-10.6,0.904);
          if(clearOfBoardAndCams(pFarL.x,pFarL.z,9.0,4.5)){
            addLimestoneLedge(pFarL.x,pFarL.z, 2.05,1.65, waterY-1.05, 0.36, 6.1, lYaw+0.3, null);
            addCrystalCluster(pFarL.x, 0.32, pFarL.z, 0.78, 'turquoise', 'seafoam', 5.5);
            addWaterShimmerRings(pFarL.x,pFarL.z, 2.10,1.72, lYaw, false);
          }
        }

        // C) Right Sanctuary Wing Ledge (3-tier limestone terrace & glowing spires strictly below top-right HUD pills!)
        var pRight=bayPt(8.2,0.890);
        if(clearOfBoardAndCams(pRight.x,pRight.z,9.0,4.5)){
          var rYaw=Math.atan2(cx-pRight.x,cz-pRight.z);
          addLimestoneLedge(pRight.x,pRight.z, 4.25,3.12, waterY-1.15, 0.42, 7.2, rYaw, null);
          addLimestoneLedge(pRight.x-(cx-pRight.x)*0.012, pRight.z-(cz-pRight.z)*0.012, 2.88,2.18, 0.24, 1.04, 8.4, rYaw+0.2, null);
          addLimestoneLedge(pRight.x-(cx-pRight.x)*0.018, pRight.z-(cz-pRight.z)*0.018, 1.78,1.40, 0.84, 1.50, 9.1, rYaw-0.2, 'turquoise');
          addWaterShimmerRings(pRight.x,pRight.z, 4.35,3.20, rYaw, true);
          addCrystalCluster(pRight.x, 1.46, pRight.z, 0.98, 'amethyst', 'turquoise', 6.8);
          // Far-right grotto ledge extending cleanly to right frame edge (sx ~ 955..1020)
          var pFarR=bayPt(12.8,0.898);
          if(clearOfBoardAndCams(pFarR.x,pFarR.z,9.0,4.5)){
            addLimestoneLedge(pFarR.x,pFarR.z, 2.80,2.18, waterY-1.05, 0.62, 10.2, rYaw-0.3, 'amethyst');
            addCrystalCluster(pFarR.x, 0.58, pFarR.z, 0.84, 'turquoise', 'amethyst', 7.9);
            addWaterShimmerRings(pFarR.x,pFarR.z, 2.88,2.24, rYaw, false);
          }
        }

        // D) Low Foreground Sanctuary Stepping-Stone Shoals (clean foreground-to-horizon lake depth, strictly clear of at=34 cam!)
        [
          { dDeg:-6.2, rf:0.836, rx:1.82, rz:1.42, hTop:0.26, palA:'turquoise', palB:'amethyst', sc:0.58, seed:11.3 },
          { dDeg: 5.8, rf:0.842, rx:1.74, rz:1.36, hTop:0.24, palA:'seafoam',   palB:'amethyst', sc:0.56, seed:12.7 }
        ].forEach(function(sh){
          var ps=bayPt(sh.dDeg,sh.rf);
          if(!clearOfBoardAndCams(ps.x,ps.z,9.0,4.5)) return;
          var sYaw=Math.atan2(cx-ps.x,cz-ps.z);
          addLimestoneLedge(ps.x,ps.z, sh.rx,sh.rz, waterY-0.95, sh.hTop, sh.seed, sYaw, null);
          addCrystalCluster(ps.x, sh.hTop-0.04, ps.z, sh.sc, sh.palA, sh.palB, sh.seed);
          addWaterShimmerRings(ps.x,ps.z, sh.rx*1.06, sh.rz*1.06, sYaw, sh.dDeg>0);
        });

        // 3. Natural Arched Rock Formations Framing the Upper-Right Grotto Horizon!
        // Primary grand sculpted limestone sanctuary arch framing the central cathedral crystal dais (apex sy ~ 66, >=20px below Dice!)
        var archL=bayPt(-10.2,0.908), archR=bayPt(9.4,0.908);
        if(clearOfBoardAndCams(archL.x,archL.z,9.0,4.5) && clearOfBoardAndCams(archR.x,archR.z,9.0,4.5)){
          addSanctuaryRockArch(-10.2, 9.4, 0.908, 0.908, 0.922, 4.95, 1.48, 0.80, 1.4, true);
          // Companion lower coastal grotto side-arch bridging the right sanctuary wing cleanly toward butt[7] (apex sy ~ 104, well below Map/≡!)
          var archFR=bayPt(14.8,0.922);
          if(clearOfBoardAndCams(archFR.x,archFR.z,9.0,4.5)){
            addSanctuaryRockArch(7.6, 14.8, 0.908, 0.926, 0.924, 3.65, 1.12, 0.62, 3.1, true);
          }
          // Subtle inner vaulted rock buttress ribs tucked behind the main arch for layered deep-grotto depth
          [-5.2, 4.4].forEach(function(bDeg,bi){
            var bp=bayPt(bDeg,0.958);
            if(clearOfBoardAndCams(bp.x,bp.z,9.0,4.5)){
              addLimestoneLedge(bp.x,bp.z, 2.25,1.78, waterY-1.1, 2.35+(bi%2)*0.40, 14+bi*2, Math.atan2(cx-bp.x,cz-bp.z), null);
              addCrystalSpire(bp.x, 2.28+(bi%2)*0.40, bp.z, 0.24, 1.42, 0.10, bi*1.4, bi?-0.16:0.16, bi?'turquoise':'amethyst', true);
            }
          });
        }

        // 4. Clean Well-Spaced Bioluminescent Water-Reflection Shimmer Rings across the calm upper-right lake
        // (distinct glowing concentric ripples with breathing room of calm lake water between them; zero muddy sheet overlap!)
        [
          { dDeg: -7.8, rf:0.822, rx:2.25, rz:1.45, am:true  },
          { dDeg: -0.8, rf:0.806, rx:2.95, rz:1.78, am:false },
          { dDeg:  9.2, rf:0.818, rx:2.65, rz:1.62, am:false },
          { dDeg: 13.6, rf:0.842, rx:2.15, rz:1.36, am:true  }
        ].forEach(function(rm){
          var pr=bayPt(rm.dDeg,rm.rf);
          if(!outerClear(pr.x,pr.z,7.8)) return;
          var rYaw=Math.atan2(cx-pr.x,cz-pr.z);
          addLakeReflectionShimmer(pr.x,pr.z, rm.rx,rm.rz, rYaw, rm.am);
        });

        // 5. Delicate Bioluminescent Crystal-Pollen Drifting Motes inside the Sanctuary Arch (strictly below HUD!)
        var moteGeo=new T.OctahedronGeometry(0.11,0);
        var moteHaloGeo=new T.OctahedronGeometry(0.24,0);
        [
          [-8.2,0.87,2.4,false], [-4.8,0.88,3.6,true],  [-1.6,0.89,4.2,false],
          [ 1.8,0.89,4.0,true],  [ 4.6,0.88,3.2,false], [ 7.8,0.87,2.9,true],
          [11.4,0.88,2.5,false], [-6.0,0.85,1.5,false], [ 3.2,0.85,1.8,true],
          [ 9.6,0.85,1.6,false], [-2.5,0.86,2.8,true],  [ 6.0,0.86,2.2,false]
        ].forEach(function(mt,mi){
          var pm=bayPt(mt[0],mt[1]);
          if(!clearOfBoardAndCams(pm.x,pm.z,8.5,4.2)) return;
          var pM=proj2D(pm.x,mt[2],pm.z);
          // Strictly clear of top-right HUD button bar (sx >= 815 && sy <= 62)
          if(pM.sx>=815 && pM.sy<=62) return;
          var mm=new T.Mesh(moteGeo, mi%3===0?heartMat:(mt[3]?amethGlowMat:aquaGlowMat));
          mm.position.set(pm.x,mt[2],pm.z); mm.rotation.set(mi*0.6,mi*1.1,0.3);
          sancGrp.add(mm);
          var mh=new T.Mesh(moteHaloGeo, mt[3]?amethGlowMat:aquaGlowMat);
          mh.position.set(pm.x,mt[2],pm.z); mh.renderOrder=2;
          sancGrp.add(mh);
        });

        compactGroupInPlace(sancGrp, true, null);
        sancGrp.traverse(function(o){
          if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; }
        });
        extras.add(sancGrp);
      })();

      // Iter 33 Beyond-MP8 Echo Caves Fantastical Identity:
      // 1) Glowing Concentric Acoustic Echo Rings radiating in the cavern air & above crystal pools
      // 2) Suspended Organ-Pipe Crystal Chimes hanging cleanly from outer cavern arches (y >= 6.8 over board!)
      // 3) Resonant Tuning-Fork Crystal Pillars humming with glowing acoustic orbs between twin crystal prongs!
      (function buildAcousticEchoLandmarks(){
        var acGrp=new T.Group(); acGrp.name='caves-acoustic-echoes';
        var isNight=!!view.night;
        var ringAquaMat=new T.MeshBasicMaterial({color:'#76fff8',transparent:true,opacity:isNight?0.52:0.42,depthWrite:false,side:T.DoubleSide,fog:false});
        var ringAmethMat=new T.MeshBasicMaterial({color:'#d0a4ff',transparent:true,opacity:isNight?0.48:0.38,depthWrite:false,side:T.DoubleSide,fog:false});
        var ringGoldMat=new T.MeshBasicMaterial({color:'#ffe48c',transparent:true,opacity:isNight?0.44:0.34,depthWrite:false,side:T.DoubleSide,fog:false});
        var pipeMats=[
          new T.MeshBasicMaterial({color:'#72faf4',fog:false}),
          new T.MeshBasicMaterial({color:'#c89eff',fog:false}),
          new T.MeshBasicMaterial({color:'#98ffd8',fog:false})
        ];
        var bronzeMat=new T.MeshBasicMaterial({color:'#e0b556',fog:true});
        var orbGlowMat=new T.MeshBasicMaterial({color:'#fff8d6',fog:false});
        // A. Glowing Concentric Acoustic Echo Rings around clear cavern water & upper echo alcoves
        var echoRingGeo=new T.TorusGeometry(1,0.032,6,32);
        var echoOrbGeo=new T.SphereGeometry(0.18,10,8);
        var pipeGeo=new T.CylinderGeometry(0.085,0.095,1,6);
        var capConeGeo=new T.ConeGeometry(0.095,0.16,6);
        function addAcousticEchoRings(x,y,z,scale,palIdx,tilted){
          var k=scale||1, mats=[ringAquaMat,ringAmethMat,ringGoldMat];
          [0.65, 1.12, 1.62].forEach(function(rad,ri){
            var m=new T.Mesh(echoRingGeo,mats[(palIdx+ri)%3]);
            m.position.set(x, y + (tilted ? ri*0.04 : ri*0.16*k), z);
            if(tilted){ m.rotation.set(0.18, (palIdx*0.9), 0.14); }
            else { m.rotation.x=Math.PI*0.5; }
            m.scale.setScalar(rad*k);
            m.renderOrder=2;
            acGrp.add(m);
          });
        }
        // Place 6 Concentric Acoustic Echo Ring sets hovering cleanly above cavern water & clear alcoves
        for(var ei=0;ei<main.length;ei+=5){
          var es=main[ei], ef=frame(es);
          placed(es,ei%2?1:-1,7.8,0,function(ex,ey,ez){
            if(!outerClear(ex,ez,5.2) || nearEcho(ex,ez,5.5) || nearCavesBok(ex,ez,2.5)) return;
            addAcousticEchoRings(ex, waterY+0.42, ez, 1.15, ei, false);
          });
        }
        // B. Suspended Organ-Pipe Crystal Chimes hanging from bronze chime crowns high under outer cavern arches
        var chimeR=Math.max((bounds.maxX-bounds.minX)*0.5+14.5, 31.0);
        for(var chi=0;chi<8;chi++){
          var ca=chi*Math.PI*2/8+0.35;
          var chX=cx+Math.cos(ca)*chimeR, chZ=cz+Math.sin(ca)*chimeR;
          var chY=7.4+(chi%2)*1.0; // Strictly >= 6.8 everywhere!
          // Bronze acoustic suspension crown ring + vertical tether
          var crown=new T.Mesh(echoRingGeo,bronzeMat);
          crown.position.set(chX,chY,chZ); crown.rotation.x=Math.PI*0.5; crown.scale.setScalar(0.88);
          acGrp.add(crown);
          var tether=new T.Mesh(pipeGeo,bronzeMat);
          tether.position.set(chX,chY+1.4,chZ); tether.scale.set(0.35,2.8,0.35);
          acGrp.add(tether);
          // 6 graduated hexagonal crystal organ pipes hanging down from the chime crown
          var pipeLens=[1.95, 1.65, 1.38, 1.15, 1.48, 1.78];
          for(var pi=0;pi<6;pi++){
            var pa=pi*Math.PI*2/6+chi*0.5, len=pipeLens[pi];
            var px=chX+Math.cos(pa)*0.72, pz=chZ+Math.sin(pa)*0.72;
            var pMat=pipeMats[(chi+pi)%3];
            var pm=new T.Mesh(pipeGeo,pMat);
            pm.position.set(px,chY-len*0.5-0.06,pz); pm.scale.set(1.15,len,1.15);
            acGrp.add(pm);
            var tip=new T.Mesh(capConeGeo,orbGlowMat);
            tip.position.set(px,chY-len-0.14,pz); tip.rotation.x=Math.PI;
            acGrp.add(tip);
          }
          addAcousticEchoRings(chX, chY-1.15, chZ, 0.72, chi, false);
        }
        // C. Resonant Tuning-Fork Crystal Pillars (cached composite in root + luminous hovering resonance orb & echo rings in acGrp!)
        function tuningForkPillar(x,y,z,rot,scale,palIdx){
          var k=scale||1, pi=Math.abs(palIdx||0)%2, cMain=pi?'#c89cff':'#6ef6ee', cHi=pi?'#f0e2ff':'#dcffff';
          emitCached('caveTuningFork:' + pi, x, y, z, rot||0, k, function(){
            // Stepped hex cavern limestone pedestal + bronze tuning-fork yoke
            add(cyl(.68,.86,.32,6),'#4f6d86',0,.16,0,0,0,0,'stone');
            add(cyl(.46,.58,.24,6),'#6b8ba4',0,.42,0,0,0,0,'stone');
            add(cyl(.22,.26,.68,6),'#e0b556',0,.82,0,0,0,0,false);
            // U-shaped crystal yoke cradling twin resonant vertical tuning-fork prongs
            block(1.14,.20,.26,cMain,0,1.18,0,0,false);
            [-.48,.48].forEach(function(px){
              add(cyl(.11,.15,1.72,6),cMain,px,2.08,0,0,0,0,false);
              add(cyl(0,.11,.36,6),cHi,px,3.12,0,0,0,0,false);
              add(cyl(.15,.15,.08,6),'#e5be5e',px,1.42,0,0,0,0,false);
              add(cyl(.14,.14,.07,6),'#e5be5e',px,2.38,0,0,0,0,false);
            });
          });
          // Hovering luminous resonance orb + vertical concentric acoustic wave rings pulsing between the tuning-fork prongs!
          var orbM=new T.Mesh(echoOrbGeo,orbGlowMat);
          orbM.position.set(x,y+2.24*k,z); orbM.scale.setScalar(k); acGrp.add(orbM);
          [0.34, 0.56, 0.80].forEach(function(rr,ri){
            var rm=new T.Mesh(echoRingGeo,ri%2?ringAmethMat:ringAquaMat);
            rm.position.set(x,y+2.24*k,z); rm.rotation.y=rot||0; rm.scale.setScalar(rr*k); rm.renderOrder=2;
            acGrp.add(rm);
          });
          addObstacle(x,z,1.05*k);
        }
        // Place 6 Resonant Tuning-Fork Crystal Pillars around clear cavern alcoves (strictly clear of Echo, Bok & tiles!)
        var forksPlaced=0;
        for(var fi=1;fi<main.length && forksPlaced<6;fi+=5){
          var fs=main[fi], ff=frame(fs);
          placed(fs,fi%2?1:-1,7.4,0,function(fx,fy,fz){
            if(forksPlaced>=6 || !caveClaim(fx,fz,3.4,4.4)) return;
            if(nearEcho(fx,fz,5.6) || nearCavesBok(fx,fz,2.2) || nearEchoHeadBackdrop(fx,fz)) return;
            tuningForkPillar(fx,fy,fz,Math.atan2(-ff.nx,-ff.nz),0.96+(forksPlaced%2)*0.12,forksPlaced);
            forksPlaced++;
          });
        }
        compactGroupInPlace(acGrp, true, null);
        acGrp.traverse(function(o){ if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; } });
        extras.add(acGrp);
      })();
    }
    function patterns(){
      // m14 + m16: Four distinct sculpted coral species (domed ridged brain, tiered table, branching/lobed tube,
      // pastel anemone rosette) across 5 coastal tones, plus obstacle registry & clear +Z/camera Pip sightline corridor.
      var pipDeck=sp.find(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity; });
      var pipCamRig=pipDeck ? camSetupAt(pipDeck.i) : camSetup();
      var pipToCamX=0, pipToCamZ=1, pipRtX=1, pipRtZ=0;
      if(pipDeck){
        var dxC=pipCamRig.cam.position.x-pipDeck.x, dzC=pipCamRig.cam.position.z-pipDeck.z, lenC=Math.hypot(dxC,dzC)||1;
        pipToCamX=dxC/lenC; pipToCamZ=dzC/lenC; pipRtX=-pipToCamZ; pipRtZ=pipToCamX;
      }
      // m14: Keep a generous foreground corridor (+Z and camera-facing side) around Pip's host deck clear of tall fans/corals.
      function inPipCorridor(x,z){
        if(!pipDeck) return false;
        var dx=x-pipDeck.x, dz=z-pipDeck.z;
        if(Math.hypot(dx,dz)<4.5) return true;
        if(dz>-.6 && dz<6.4 && Math.abs(dx)<4.6) return true;
        var along=dx*pipToCamX+dz*pipToCamZ, across=Math.abs(dx*pipRtX+dz*pipRtZ);
        if(along>-1.0 && along<7.2 && across<4.8) return true;
        return false;
      }
      function hashPatId(str){
        if(typeof reefHash==='function') return reefHash(str);
        var h=7; str=String(str); for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return h;
      }
      // Keep ALL '?' surprise cube tiles strictly clear of boulders/coral lumps (MIN-5)!
      var patSurpriseSpaces=sp.filter(function(s){ return s.kind==='surprise'; });
      function clearOfPatSurprise(x,z,pad){
        var p=pad||4.5;
        for(var qi=0;qi<patSurpriseSpaces.length;qi++){
          if(Math.hypot(x-patSurpriseSpaces[qi].x, z-patSurpriseSpaces[qi].z)<p) return false;
        }
        return true;
      }
      // Also keep board.js's deck-adjacent coral boulders (e.g. sp[11].obj peach brain near sp[10] '?') clear of '?' cubes!
      sp.forEach(function(s){
        if(!s.obj || !s.obj.position) return;
        if(clearOfPatSurprise(s.obj.position.x, s.obj.position.z, 4.1)) return;
        var ox=s.obj.position.x-s.x, oz=s.obj.position.z-s.z;
        var fx=s.x-ox*1.08, fz=s.z-oz*1.08;
        if(clearOfPatSurprise(fx, fz, 4.1) && outerClear(fx, fz, 2.15)){
          s.obj.position.x=fx; s.obj.position.z=fz;
        } else {
          // Gently pull away from nearest surprise cube while keeping clear of path
          var nearest=patSurpriseSpaces[0], bestD=1e9;
          patSurpriseSpaces.forEach(function(qs){
            var d=Math.hypot(s.obj.position.x-qs.x, s.obj.position.z-qs.z);
            if(d<bestD){ bestD=d; nearest=qs; }
          });
          if(nearest && bestD>0.1){
            var ux=(s.obj.position.x-nearest.x)/bestD, uz=(s.obj.position.z-nearest.z)/bestD;
            s.obj.position.x=nearest.x+ux*4.35; s.obj.position.z=nearest.z+uz*4.35;
          }
        }
      });
      // Guard prime foreground/midground of 10-pattern-reef hero view (cam@4) so generic lumps NEVER replace geometric patterns!
      var patHeroCam=Math.min(4, main.length-1);
      function inPatHeroForeground(x,z){
        var nd=realCamNDCAt(patHeroCam, x, -0.25, z);
        if(nd.z>1) return false;
        return nd.x>=-0.96 && nd.x<=0.62 && nd.y>=-0.92 && nd.y<=0.18;
      }
      var patPlaced=[], mosaicSpots=[];
      var patShopTile=sp.find(function(t){ return t.kind==='shop'; });
      function mosaicClear(x,z,minDist){
        var md=minDist||2.85;
        if(patShopTile && Math.hypot(x-patShopTile.x,z-patShopTile.z)<3.6) return false;
        if(view._shopPos && Math.hypot(x-view._shopPos.x,z-view._shopPos.z)<3.6) return false;
        for(var mi=0;mi<mosaicSpots.length;mi++) if(Math.hypot(x-mosaicSpots[mi][0],z-mosaicSpots[mi][1])<md) return false;
        return true;
      }
      function patClaim(x,z,gap,tileGap,mosaicGap){
        if(!outerClear(x,z,tileGap||4.0)) return false;
        if(!clearOfPatSurprise(x,z,4.5)) return false;
        if(!mosaicClear(x,z,mosaicGap||3.15)) return false;
        for(var q=0;q<patPlaced.length;q++) if(Math.hypot(x-patPlaced[q][0],z-patPlaced[q][1])<gap) return false;
        patPlaced.push([x,z]); return true;
      }
      function archGeo(r,t){ var k=['arch',r,t].join(':'); return geos[k]||(geos[k]=own(new T.TorusGeometry(r,t,8,18,Math.PI))); }
      // Five-tone coastal coral palette: coral, peach, lavender, aqua, golden-ochre.
      var coralPals=[
        {m:'#ee857a',hi:'#ffbeb0',dk:'#bf5c55'},
        {m:'#f5b282',hi:'#ffd9b6',dk:'#c78256'},
        {m:'#b89ae6',hi:'#decaff',dk:'#866ab8'},
        {m:'#68d2c8',hi:'#aaf2ea',dk:'#409b94'},
        {m:'#e8b85a',hi:'#ffe49e',dk:'#b58634'}
      ];
      // iter31 MIN 8: Diversified Pattern Reef Fan Corals across 4 harmonious reef hues
      // (lavender-violet, sunset-coral, seafoam-teal, warm golden-ochre) and 3 organic forms
      // (lace sea-fans, tiered plate corals, spiral shell-fans) with varied scales & orientations!
      var patFanPals=[
        {m:'#b691e6',hi:'#e4d2ff',dk:'#7d58b4',rib:'#956fd0'}, // 0: Lavender-Violet
        {m:'#f28372',hi:'#ffc4b2',dk:'#be554c',rib:'#dc6a5c'}, // 1: Sunset-Coral
        {m:'#54cbbc',hi:'#aaf4ea',dk:'#2d8e87',rib:'#3db0a4'}, // 2: Seafoam-Teal
        {m:'#ebb652',hi:'#ffe6a0',dk:'#b27d28',rib:'#d49a38'}  // 3: Warm Golden-Ochre
      ];
      function makeLaceSeaFanGeo(seed,registerOwn){
        var k='patLaceFan:'+(seed%2);
        if(registerOwn && geos[k]) return geos[k];
        var nU=22, nV=5, p=[], c=[], idx=[], halfT=0.036;
        var asym=(seed%2===0)?1:-1, stride=(nU+1)*(nV+1);
        for(var side=0;side<2;side++){
          var zOff=side?-halfT:halfT;
          for(var iv=0;iv<=nV;iv++){
            var vf=iv/nV;
            for(var iu=0;iu<=nU;iu++){
              var uf=iu/nU;
              var ang=(uf-0.5)*Math.PI*0.92+asym*0.07;
              // Organic scalloped asymmetrical sea-fan silhouette (never a rigid geometric half-circle!)
              var lobe=0.84+0.15*Math.sin(uf*Math.PI*5+seed*1.2)+0.10*Math.cos(uf*Math.PI*3-asym*0.6)+0.06*Math.sin(uf*Math.PI*9);
              var edgeTaper=Math.pow(Math.sin(Math.max(0.04,Math.min(0.96,uf))*Math.PI),0.36);
              var rOuter=1.08*lobe*(0.72+0.28*edgeTaper);
              var r=0.14+vf*(rOuter-0.14);
              var px=Math.sin(ang)*r;
              var py=0.20+Math.cos(ang)*r*0.96;
              // Graceful 3D ruffled wave depth along Z so the fan catches sunlit curvature from every camera angle
              var waveZ=vf*(0.15*Math.sin(uf*Math.PI*3.2+seed)+0.08*Math.cos(uf*Math.PI*5.0)-0.08*vf);
              p.push(px,py,waveZ+zOff);
              // Rich darker holdfast base grading smoothly to sunlit lacy scalloped crest + subtle radial venation
              var vein=0.05*Math.cos(uf*Math.PI*14);
              var sh=0.76+0.30*vf+vein*(0.3+0.7*vf)+(side?-0.04:0.03);
              c.push(sh,sh,sh);
            }
          }
        }
        for(var iv2=0;iv2<nV;iv2++) for(var iu2=0;iu2<nU;iu2++){
          var a=iv2*(nU+1)+iu2, b=a+1, cc=a+(nU+1), d=cc+1;
          // Front (+Z): (b-a)x(cc-a) = +Z
          idx.push(a,b,d, a,d,cc);
          // Back (-Z)
          var a2=stride+a, b2=stride+b, c2=stride+cc, d2=stride+d;
          idx.push(a2,d2,b2, a2,c2,d2);
        }
        // Stitch scalloped outer crest rim (iv=nV)
        for(var iu3=0;iu3<nU;iu3++){
          var f0=nV*(nU+1)+iu3, f1=f0+1, b0=stride+f0, b1=stride+f1;
          idx.push(f0,f1,b1, f0,b1,b0);
        }
        var g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        if(registerOwn){ own(g); geos[k]=g; }
        return g;
      }
      function makeSpiralShellFanGeo(seed,registerOwn){
        var k='patSpiralFan:'+(seed%2);
        if(registerOwn && geos[k]) return geos[k];
        var nU=26, nV=4, p=[], c=[], idx=[], halfT=0.038;
        var dir=(seed%2===0)?1:-1, stride=(nU+1)*(nV+1);
        for(var side=0;side<2;side++){
          var zOff=side?-halfT:halfT;
          for(var iv=0;iv<=nV;iv++){
            var vf=iv/nV;
            for(var iu=0;iu<=nU;iu++){
              var uf=iu/nU;
              // Graceful 1.25-turn coiled coral-shell fan unfurling upward & outward from holdfast
              var theta=(-0.32+uf*1.28*Math.PI*2)*dir;
              var rEnv=0.18+0.78*Math.pow(uf,0.82);
              var ruffle=1+0.085*Math.sin(uf*Math.PI*12+seed);
              var rIn=rEnv*0.26, rOut=rEnv*ruffle;
              var rr=rIn+vf*(rOut-rIn);
              var px=Math.cos(theta)*rr*0.92;
              var py=0.68+Math.sin(theta)*rr*0.92;
              var curlZ=(uf-0.45)*0.22+vf*0.12*Math.sin(uf*Math.PI*6+seed);
              p.push(px,py,curlZ+zOff);
              var sh=0.74+0.30*vf+0.08*uf+(side?-0.04:0.03);
              c.push(sh,sh,sh);
            }
          }
        }
        for(var iv2=0;iv2<nV;iv2++) for(var iu2=0;iu2<nU;iu2++){
          var a=iv2*(nU+1)+iu2, b=a+1, cc=a+(nU+1), d=cc+1;
          var a2=stride+a, b2=stride+b, c2=stride+cc, d2=stride+d;
          if(dir>0){
            idx.push(a,cc,d, a,d,b);
            idx.push(a2,b2,d2, a2,d2,c2);
          }else{
            idx.push(a,b,d, a,d,cc);
            idx.push(a2,d2,b2, a2,c2,d2);
          }
        }
        for(var iu3=0;iu3<nU;iu3++){
          var f0=nV*(nU+1)+iu3, f1=f0+1, b0=stride+f0, b1=stride+f1;
          if(dir>0) idx.push(f0,b0,b1, f0,b1,f1);
          else idx.push(f0,f1,b1, f0,b1,b0);
        }
        var g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(c,3));
        g.setIndex(idx); g.computeVertexNormals();
        if(registerOwn){ own(g); geos[k]=g; }
        return g;
      }
      var patFanSeq=0;
      function buildPatternFanInto(targetGrp,ox,oy,oz,scale,yaw,seqIdx,isRoot){
        var seq=seqIdx, palIdx=seq%4, shapeIdx=(seq+Math.floor(seq/4))%3;
        var pal=patFanPals[palIdx];
        var k=(scale||1)*(0.86+((seq*7)%5)*0.075);
        var grp=isRoot ? null : targetGrp;
        var yRot=(yaw||0)+((seq%3)-1)*0.34;
        var cY=Math.cos(yRot), sY=Math.sin(yRot);
        var leanZ=((seq%5)-2)*0.055;
        function placePart(geo,col,lx,ly,lz,rx,ry,rz,sx,sy,sz,kind){
          if(isRoot){
            var wx=ox+(lx*cY+lz*sY)*k, wy=oy+ly*k, wz=oz+(-lx*sY+lz*cY)*k;
            var m=add(geo,col,wx,wy,wz,rx||0,yRot+(ry||0),leanZ+(rz||0),kind===undefined?'coral':kind);
            m.scale.set((sx||1)*k,(sy||1)*k,(sz||1)*k);
            return m;
          }else{
            var o=mesh(geo,M(col,geo.attributes.color?{vertexColors:true}:undefined),lx*k,ly*k,lz*k);
            if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
            o.scale.set((sx||1)*k,(sy||1)*k,(sz||1)*k);
            if(kind!==false) finish(o,kind||'coral');
            grp.add(o); return o;
          }
        }
        var gCyl=function(rt,rb,h,n){ return isRoot ? cyl(rt,rb,h,n) : new T.CylinderGeometry(rt,rb,h,n||10); };
        var gOrb=function(r){ return isRoot ? ball(r,10,7) : new T.SphereGeometry(r,10,7); };
        // Grounded coral holdfast foot
        placePart(gCyl(0.16,0.28,0.22,10),pal.dk,0,0.10,0,0,0,0,1,1,1,'coral');
        if(shapeIdx===0){
          // Shape 0: Lace Sea-Fan (ruffled asymmetrical gorgonian fan + 7 branching vein ribs + pale polyp tips)
          placePart(gCyl(0.08,0.14,0.34,8),pal.dk,0,0.26,0,0,0,0,1,1,1,'coral');
          var fg=makeLaceSeaFanGeo(seq,isRoot);
          placePart(fg,pal.m,0,0.16,0,0,0,0,1.02,1.06,1,'coral');
          // Companion smaller angled side fan lobe for rich 3D organic silhouette
          placePart(fg,pal.hi,0.18,0.12,0.14,0.12,0.52,-0.18,0.62,0.68,0.8,'coral');
          // 5 sculpted branching gorgonian spine ribs + delicate pale bud tips along the lacy crest
          for(var ri=0;ri<5;ri++){
            var rf=(ri-2)*0.34, rLen=0.78+0.18*Math.cos(rf*1.5);
            placePart(gCyl(0.022,0.044,rLen,6),pal.rib,Math.sin(rf)*0.38,0.34+Math.cos(rf)*0.38,0.03,0,0,-rf,1,1,1,false);
            placePart(gOrb(0.068),pal.hi,Math.sin(rf)*0.84,0.32+Math.cos(rf)*0.86,0.04,0,0,0,1,1,1,false);
          }
        }else if(shapeIdx===1){
          // Shape 1: Tiered Plate Coral Fan (cascading bouquet of 4 tilted scalloped coral rosette plates!)
          var pg=isRoot ? tablePlateGeo() : tablePlateGeo().clone();
          placePart(gCyl(0.10,0.19,0.62,8),pal.dk,0,0.32,0,0,0,0.08,1,1,1,'coral');
          var tiers=[
            [ 0.00, 0.56,  0.00,  0.22, 0.0,  0.14, 0.88, 0.82, 0.82, pal.m ],
            [-0.24, 0.88,  0.08,  0.34, 0.9, -0.26, 0.70, 0.80, 0.66, pal.hi],
            [ 0.28, 0.72, -0.10, -0.26, 1.8,  0.30, 0.64, 0.78, 0.60, pal.m ],
            [ 0.04, 1.12,  0.06,  0.18, 2.7, -0.12, 0.50, 0.76, 0.48, pal.hi]
          ];
          tiers.forEach(function(tf){
            placePart(pg,tf[9],tf[0],tf[1],tf[2],tf[3],tf[4],tf[5],tf[6],tf[7],tf[8],'coral');
          });
          placePart(gOrb(0.085),pal.hi,-0.16,0.96,0.12,0,0,0,1,1,1,false);
          placePart(gOrb(0.075),pal.hi,0.22,0.80,-0.06,0,0,0,1,1,1,false);
        }else{
          // Shape 2: Spiral Shell-Fan (coiled fluted nautilus-like ruffled coral fan + counter-curled companion bud)
          var sg=makeSpiralShellFanGeo(seq,isRoot);
          placePart(gCyl(0.09,0.16,0.36,8),pal.dk,0,0.24,0,0,0,0,1,1,1,'coral');
          placePart(sg,pal.m,0,0.18,0,0.06,0,0,0.96,1.00,1,'coral');
          placePart(sg,pal.hi,0.24,0.06,0.16,-0.10,0.68,0.16,0.56,0.58,0.85,'coral');
          // Radiant pearl crest nodules nested in the spiral volute eye
          placePart(gOrb(0.11),pal.hi,0.02,0.82,0.06,0,0,0,1,1,1,false);
          placePart(gOrb(0.07),pal.rib,-0.32,0.96,0.08,0,0,0,1,1,1,false);
        }
        if(!isRoot){
          grp.position.set(ox,oy,oz);
          grp.rotation.set(0,yRot,leanZ);
        }
      }
      function patternFanCoral(x,y,z,scale,yaw){
        buildPatternFanInto(root,x,y,z,scale,yaw,patFanSeq++,true);
      }
      // Replace raw board.js uniform purple 'fan' s.obj props on Pattern Reef with our diverse 4-hue x 3-shape fan corals!
      var patPropSet=['brain','staghorn','fan','star'];
      sp.forEach(function(s){
        if(!s.obj || !s.obj.position) return;
        var ox=s.obj.position.x, oy=s.obj.position.y, oz=s.obj.position.z;
        var pKind=(s.kind==='deck' && s.item && s.item.d) ? patPropSet[hashPatId(s.item.d.id)%patPropSet.length] : s.kind;
        if(pKind==='fan' && view.scene && view.hitables){
          var old=s.obj;
          view.scene.remove(old);
          var hIdx=view.hitables.indexOf(old); if(hIdx>=0) view.hitables.splice(hIdx,1);
          var gFan=new T.Group();
          buildPatternFanInto(gFan,ox,oy,oz,0.96,s.i*0.65,patFanSeq++,false);
          if(typeof reef3dBakeObject==='function' && view.rig && view.bake) reef3dBakeObject(gFan,view.rig,view.bake);
          if(typeof reef3dCompact==='function') reef3dCompact(gFan);
          gFan.traverse(function(c){ c.userData.space=s.i; });
          gFan.userData.space=s.i;
          view.scene.add(gFan); view.hitables.push(gFan); s.obj=gFan;
        }
        addObstacle(ox,oz,.9);
      });
      // Cached deeply-ridged brain coral dome geometry (vertex-colored meander grooves — tall dome, never a flat pancake).
      function ridgedBrainGeo(){
        var k='ridgedBrain14', g=geos[k]; if(g) return g;
        g=own(new T.SphereGeometry(1,14,9));
        var p=g.attributes.position, cols=new Float32Array(p.count*3);
        for(var i=0;i<p.count;i++){
          var ax=p.getX(i), ay=p.getY(i), az=p.getZ(i);
          var groove=Math.sin(ax*10.5+Math.sin(az*6.5)*1.7)*Math.cos(az*9.5-Math.sin(ax*5.5)*1.4);
          var dip=groove*groove, r=1.02-.12*dip+.04*Math.sin(ay*8);
          p.setXYZ(i,ax*r,ay*r,az*r);
          var sh=.80+.24*(1-dip)+.05*Math.max(0,ay);
          cols[i*3]=sh; cols[i*3+1]=sh; cols[i*3+2]=sh;
        }
        g.setAttribute('color',new T.BufferAttribute(cols,3));
        g.computeVertexNormals(); geos[k]=g; return g;
      }
      // Cached scalloped table-coral plate geometry (16-segment wavy shallow bowl with upturned pale rim).
      function tablePlateGeo(){
        var k='tablePlate16', g=geos[k]; if(g) return g;
        var p=[], cols=[], idx=[], n=16,
            rads=[.02,.48,.92,1.02,.82,.02],
            ys=[.08,.11,.22,.20,.05,-.02],
            shs=[.86,.96,1.06,1.08,.84,.76];
        for(var ri=0;ri<rads.length;ri++) for(var a=0;a<n;a++){
          var ang=a*Math.PI*2/n, wave=1+.08*Math.sin(ang*6)+.05*Math.cos(ang*4);
          var rr=rads[ri]*(ri>=2&&ri<=4?wave:1);
          var yy=ys[ri]+(ri>=2&&ri<=3?.035*Math.sin(ang*6):0);
          p.push(Math.cos(ang)*rr,yy,Math.sin(ang)*rr);
          cols.push(shs[ri],shs[ri],shs[ri]);
        }
        for(var ri=0;ri<rads.length-1;ri++) for(var a=0;a<n;a++){
          var b=ri*n+a, c=ri*n+(a+1)%n;
          idx.push(b,b+n,c,c,b+n,c+n);
        }
        g=own(new T.BufferGeometry());
        g.setAttribute('position',new T.Float32BufferAttribute(p,3));
        g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
        g.setIndex(idx); g.computeVertexNormals(); geos[k]=g; return g;
      }
      // Species 0: Domed ridged brain coral on a limestone reef foot (cached composite!).
      function brainCoral(x,y,z,scale,palIdx){
        var k=scale||1, pi=((Math.floor(palIdx||0)%coralPals.length)+coralPals.length)%coralPals.length;
        emitCached('patBrain:' + pi, x, y, z, (palIdx||0)*.9, k, function(){
          var pal=coralPals[pi];
          add(cyl(.44,.58,.22,10),pal.dk,0,.10,0,0,0,0,'coral');
          var dome=add(ridgedBrainGeo(),pal.m,0,.54,0,0,0,0,'coral'); dome.scale.set(.68,.62,.66);
          var bud=add(ridgedBrainGeo(),pal.hi,.44,.32,.26,0,1.2,0,'coral'); bud.scale.set(.34,.30,.32);
        });
      }
      // Species 1: Tiered scalloped table coral (cached composite!).
      function tableCoral(x,y,z,scale,palIdx){
        var k=scale||1, pi=((Math.floor(palIdx||0)%coralPals.length)+coralPals.length)%coralPals.length;
        emitCached('patTable:' + pi, x, y, z, (palIdx||0)*.7, k, function(){
          var pal=coralPals[pi];
          add(cyl(.15,.26,.62,8),pal.dk,0,.30,0,0,0,0,'coral');
          var p1=add(tablePlateGeo(),pal.m,0,.50,0,.05,0,-.04,'coral'); p1.scale.set(.92,.85,.84);
          var p2=add(tablePlateGeo(),pal.hi,.26,.74,-.18,-.06,1.1,.05,'coral'); p2.scale.set(.66,.80,.62);
          var p3=add(tablePlateGeo(),pal.m,-.28,.34,.24,.08,2.2,.04,'coral'); p3.scale.set(.54,.75,.50);
        });
      }
      // Species 2: Branching staghorn OR fluted lobed tube coral cluster (cached composite!).
      function branchTubeCoral(x,y,z,scale,palIdx){
        var k=scale||1, idxA=Math.abs(Math.floor(palIdx||0)), pi=idxA%coralPals.length, isTube=(idxA%2===1);
        emitCached('patBranchTube:' + pi + ':' + (isTube?1:0), x, y, z, (palIdx||0)*.5, k, function(){
          var pal=coralPals[pi];
          if(!isTube){
            finish(post(.12,.72,pal.m,0,0,0),'coral');
            for(var a=0;a<3;a++){
              var ang=a*2.094, ca=Math.cos(ang), sa=Math.sin(ang);
              var p1=limb(0,.62,0,ca*.62,1,sa*.62,.58,.10,.072,pal.m,'coral');
              [-1,1].forEach(function(s){
                var p2=limb(p1[0],p1[1],p1[2],ca*.52-sa*s*.52,.95,sa*.52+ca*s*.52,.42,.072,.054,pal.m,'coral');
                orb(.105,pal.hi,p2[0],p2[1]+.03,p2[2]);
              });
              orb(.095,pal.hi,p1[0],p1[1]+.02,p1[2]);
            }
          }else{
            add(cyl(.40,.52,.14,10),pal.dk,0,.07,0,0,0,0,'coral');
            [[0,0,.98,.18,0,0],[.28,.14,.74,.14,.14,-.18],[-.26,.18,.68,.13,-.16,.16],[.12,-.28,.82,.15,.16,.12]].forEach(function(t,ti){
              var tx=t[0], tz=t[1], th=t[2], tr=t[3];
              add(cyl(tr*1.12,tr*.82,th,10),ti%2?pal.hi:pal.m,tx,th/2+.06,tz,t[4],0,t[5],'coral');
              add(smoothTorus(tr*1.02,tr*.24,6,14),pal.hi,tx+t[5]*th*.45,th+.06,tz-t[4]*th*.45,Math.PI/2+t[4],0,t[5],false);
              add(cyl(tr*.72,tr*.72,.04,8),pal.dk,tx+t[5]*th*.44,th+.05,tz-t[4]*th*.44,t[4],0,t[5],false);
            });
          }
        });
      }
      // Species 3: Striped sea-anemone rosette (alternating banded plump tentacles around glowing oral disc — cached 1 mesh instead of 26!).
      function anemoneRosette(x,y,z,scale,palIdx){
        var k=scale||1, pi=((Math.floor(palIdx||0)%coralPals.length)+coralPals.length)%coralPals.length;
        emitCached('patAnemone:' + pi, x, y, z, (palIdx||0)*.3, k, function(){
          var pal=coralPals[pi];
          // Banded anemone foot column (ABAB striped stalk!)
          add(cyl(.36,.44,.14,12),pal.dk,0,.07,0,0,0,0,'coral');
          add(cyl(.34,.36,.12,12),'#fff3d8',0,.19,0,0,0,0,'coral');
          var disc=orb(.26,pal.hi,0,.30,0,false); disc.scale.set(1.1,.52,1.1);
          for(var r1=0;r1<8;r1++){
            var a1=r1*Math.PI/4, c1=Math.cos(a1), s1=Math.sin(a1);
            var bandCol=(r1%2===0)?pal.m:'#fff5e0';
            var tipCol=(r1%2===0)?'#fff6e4':pal.m;
            var pt=limb(c1*.20,.24,s1*.20,c1*1.15,.95,s1*1.15,.40,.085,.064,bandCol,false);
            orb(.088,tipCol,pt[0],pt[1],pt[2],false);
          }
          for(var r2=0;r2<4;r2++){
            var a2=r2*Math.PI/2+.38, c2=Math.cos(a2), s2=Math.sin(a2);
            var pt2=limb(c2*.12,.30,s2*.12,c2*.55,1.25,s2*.55,.32,.072,.054,r2%2?'#fff6e6':pal.hi,false);
            orb(.072,r2%2?pal.m:'#fff8ec',pt2[0],pt2[1],pt2[2],false);
          }
        });
      }
      // iter30 Beyond-MP8: Jewel-toned glowing coral-blossom accents (ruby-magenta, sapphire-aqua, amethyst-orchid & citrine-amber)
      // combining sculpted cupped coral petals in `root` with radiant unlit gemstone cores, glowing stamen pearls & subtle aura in `extras`!
      var patJewelGrp=new T.Group(); patJewelGrp.name='patterns-jewel-coral-blossoms';
      var patJewelPals=[
        { pet:'#ff4b86', inner:'#ff9fc2', core:'#fff0b8', aura:'#ff6ea2' }, // Ruby-Magenta
        { pet:'#28d6f2', inner:'#96f8ff', core:'#e8ffff', aura:'#4ee8ff' }, // Sapphire-Aqua
        { pet:'#b26aff', inner:'#e4c4ff', core:'#fff4dc', aura:'#c68eff' }, // Amethyst-Orchid
        { pet:'#ffae30', inner:'#ffe278', core:'#fffbe0', aura:'#ffc854' }  // Citrine-Amber
      ];
      var patJewelCoreGeo=new T.OctahedronGeometry(0.14,0);
      var patJewelPearlGeo=new T.SphereGeometry(0.052,8,6);
      var patJewelAuraGeo=new T.SphereGeometry(0.36,10,8);
      var patJewelCoreMats=patJewelPals.map(function(p){ return new T.MeshBasicMaterial({color:p.core,fog:false}); });
      var patJewelTipMats=patJewelPals.map(function(p){ return new T.MeshBasicMaterial({color:p.inner,fog:false}); });
      var patJewelAuraMats=patJewelPals.map(function(p){ return new T.MeshBasicMaterial({color:p.aura,transparent:true,opacity:view.night?0.30:0.22,depthWrite:false,fog:false}); });
      extras.add(patJewelGrp);
      function jewelCoralBlossom(x,y,z,scale,jewelIdx){
        var k=scale||0.82, ji=((Math.floor(jewelIdx||0)%4)+4)%4, pal=patJewelPals[ji];
        emitCached('patJewelBase:' + ji, x, y, z, ji*0.5, k, function(){
          add(cyl(0.22,0.30,0.14,10),'#467c82',0,0.07,0,0,0,0,'coral');
          for(var op=0;op<6;op++){
            var oa=op*Math.PI/3;
            var pO=add(cone(0.13,0.34,4),pal.pet,Math.cos(oa)*0.22,0.19,Math.sin(oa)*0.22,-Math.sin(oa)*0.82,oa,Math.cos(oa)*0.82,false);
            pO.scale.set(1,1,0.44);
          }
          for(var ip=0;ip<5;ip++){
            var ia=ip*Math.PI*2/5+0.32;
            var pI=add(cone(0.095,0.26,4),pal.inner,Math.cos(ia)*0.13,0.23,Math.sin(ia)*0.13,-Math.sin(ia)*0.42,ia,Math.cos(ia)*0.42,false);
            pI.scale.set(1,1,0.46);
          }
        });
        var core=new T.Mesh(patJewelCoreGeo,patJewelCoreMats[ji]);
        core.position.set(x,y+0.27*k,z); core.scale.setScalar(k); core.rotation.y=ji*0.8;
        patJewelGrp.add(core);
        for(var st=0;st<4;st++){
          var sa=st*Math.PI*0.5+ji*0.6;
          var prl=new T.Mesh(patJewelPearlGeo,st%2===0?patJewelCoreMats[ji]:patJewelTipMats[ji]);
          prl.position.set(x+Math.cos(sa)*0.17*k,y+0.38*k,z+Math.sin(sa)*0.17*k);
          prl.scale.setScalar(k); patJewelGrp.add(prl);
        }
        var aura=new T.Mesh(patJewelAuraGeo,patJewelAuraMats[ji]);
        aura.position.set(x,y+0.26*k,z); aura.scale.set(k*1.12,k*0.78,k*1.12); aura.renderOrder=2;
        patJewelGrp.add(aura);
      }
      function variedCoral(species,x,y,z,scale,palIdx){
        var spIdx=((species%4)+4)%4;
        if(spIdx===0) brainCoral(x,y,z,scale,palIdx);
        else if(spIdx===1) tableCoral(x,y,z,scale,palIdx);
        else if(spIdx===2) branchTubeCoral(x,y,z,scale,palIdx);
        else anemoneRosette(x,y,z,scale,palIdx);
      }
      // Moss + coral encrustation spiralling up a column, so the shellstone reads as reef-grown rather than bare cream.
      function encrust(x,y,z,h,r){
        for(var j=0;j<6;j++){
          var ang=j*1.9+x*.3, yy=y+h*(j+.5)/6;
          orb(.12+(j%3)*.04,j%2?'#e88c88':'#78b88a',x+Math.cos(ang)*r,yy,z+Math.sin(ang)*r);
        }
      }
      // Iter 34 Beyond-MP8 Pattern Reef: Unmistakable Hero Visual Patterns right in 10-pattern-reef hero view!
      // 1) Bold multi-hue Fibonacci Golden-Spiral Mosaic Plazas (5 sweeping spiral arms + checkered ring rim)
      // 2) Crisp 3D Checkered Turquoise-and-Ivory Stepped Tile Plazas
      // 3) Rhythmic ABAB Alternating Striped Coral Colonnade Pillars lining the main path (placed BEFORE generic scatter!)
      // 4) Nested Concentric Stepping-Stone Rings
      var decalY=-.296;
      function mosaic(x,z,r){
        var k=r||1.95;
        emitCached('patFibSpiralPlaza:' + Math.round(k*10), x, -.296, z, ((x+z)*0.3)%6.28, 1, function(){
          // Sculpted beveled ivory-limestone circular plaza base + crisp turquoise/coral alternating outer border
          var baseD=add(cyl(k,k*1.04,.048,24),'#f6ecd2',0,.024,0,0,0,0,'stone'); baseD.userData.reefGround=true;
          var nRim=20;
          for(var a=0;a<nRim;a++){
            var ang=a*Math.PI*2/nRim;
            var rm=block(k*.24,.032,k*.15,a%2===0?'#26a8b4':'#f0746e',Math.cos(ang)*k*.87,.052,Math.sin(ang)*k*.87,-ang,false);
            rm.userData.reefGround=true;
          }
          // 5 unmistakable sweeping multi-hue Fibonacci Golden-Spiral arms radiating out from a pearl-gold center!
          var armCols=['#24c4cc','#f26b6b','#ffd24a','#ac84ec','#4ad6a8'];
          var nArms=5, stepsPerArm=10;
          for(var arm=0;arm<nArms;arm++){
            var baseA=arm*Math.PI*2/nArms, col=armCols[arm];
            for(var st=0;st<stepsPerArm;st++){
              var u=(st+0.6)/stepsPerArm;
              var rf=k*(0.15+0.63*Math.pow(u, 1.12));
              var af=baseA + u*Math.PI*1.38; // Sweeping logarithmic golden spiral twist!
              var tw=k*(0.085+0.075*u), td=k*(0.115+0.090*u);
              var tile=block(tw,.042,td,col,Math.cos(af)*rf,.058,Math.sin(af)*rf,-af-0.55,false);
              tile.userData.reefGround=true;
            }
          }
          // Radiant gilded center pearl rosette anchoring all 5 Fibonacci spiral arms
          var cRing=add(smoothTorus(k*.16,.032*k*.5,6,16),'#f2ca5c',0,.066,0,Math.PI/2,0,0,false); cRing.userData.reefGround=true;
          var cBoss=add(cyl(k*.12,k*.14,.065,12),'#fff7df',0,.062,0,0,0,0,false); cBoss.userData.reefGround=true;
        });
      }
      // Crisp 3D Checkered Turquoise-and-Ivory Stepped Tile Plaza (clean alternating raised square tiles with sandstone trim!)
      function checkeredReefPlaza(x,z,halfW,rot){
        var hw=halfW||1.85;
        emitCached('patCheckeredPlaza:' + Math.round(hw*10), x, -.296, z, rot||0, 1, function(){
          // Two-tier stepped ivory-sandstone outer apron + dark teal mortar bed
          var outer=block(hw*2+.52,.042,hw*2+.52,'#e9d9b4',0,.021,0,0,'stone'); outer.userData.reefGround=true;
          var grout=block(hw*2+.16,.056,hw*2+.16,'#226b75',0,.032,0,0,'stone'); grout.userData.reefGround=true;
          var cells=4, step=(hw*2)/cells;
          for(var r2=0;r2<cells;r2++) for(var c2=0;c2<cells;c2++){
            var tx=-hw+(c2+.5)*step, tz=-hw+(r2+.5)*step;
            var isTeal=((r2+c2)%2===0);
            var sq=block(step-.075,.074,step-.075,isTeal?'#24a4b2':'#fff8e6',tx,.050,tz,0,'stone');
            sq.userData.reefGround=true;
            // Inner contrasting geometric diamond inlay on alternating center tiles!
            if((r2===1||r2===2) && (c2===1||c2===2)){
              var dia=block(step*.34,.082,step*.34,isTeal?'#ffd65a':'#f2746e',tx,.052,tz,Math.PI/4,false);
              dia.userData.reefGround=true;
            }
          }
          // 4 gilded-coral stepped corner accent pavers
          [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
            var cp=block(.28,.092,.28,'#f2c858',sx*(hw+.14),.046,sz*(hw+.14),0,false);
            cp.userData.reefGround=true;
          }); });
        });
        addObstacle(x, z, hw + 0.85);
      }
      // Nested Concentric Stepping-Stone Rings (sculpted multi-ring bullseye reef stepping stones!)
      function concentricStepStone(x,z,r){
        var k=r||0.95;
        emitCached('patConcentricRing:' + Math.round(k*10), x, -.296, z, 0, 1, function(){
          var r1=add(cyl(k,k*1.06,.042,20),'#f6ebd0',0,.021,0,0,0,0,'stone'); r1.userData.reefGround=true;
          var r2=add(cyl(k*.76,k*.80,.052,18),'#28b0bc',0,.028,0,0,0,0,'stone'); r2.userData.reefGround=true;
          var r3=add(cyl(k*.52,k*.56,.062,16),'#fff6e2',0,.034,0,0,0,0,'stone'); r3.userData.reefGround=true;
          var r4=add(cyl(k*.30,k*.33,.072,14),'#f27870',0,.040,0,0,0,0,'stone'); r4.userData.reefGround=true;
          var r5=add(cyl(k*.14,k*.15,.082,12),'#ffd65a',0,.046,0,0,0,0,false); r5.userData.reefGround=true;
        });
      }
      // Rhythmic ABAB Alternating Striped Coral Colonnade Pillars (A: Tall Coral-Ivory Striped Spire, B: Medium Turquoise-Gold Banded Column)
      function coralColonnadeUnit(isA, x, y, z, rot){
        emitCached('patColonnade:' + (isA ? 'A' : 'B'), x, y, z, rot||0, 1, function(){
          if(isA){
            // 'A': Tall coral-and-ivory alternating horizontal-striped spire column with golden pearl finial (h = 2.65u)
            add(cyl(.40,.48,.22,10),'#e6dcc0',0,.11,0,0,0,0,'stone');
            for(var s=0;s<6;s++){
              add(cyl(.25-s*.012,.27-s*.012,.36,12),s%2===0?'#f26c66':'#fff7e2',0,.40+s*.36,0,0,0,0,'coral');
            }
            add(smoothTorus(.30,.052,6,14),'#ffd458',0,1.48,0,Math.PI/2,0,0,false);
            add(cyl(.32,.24,.14,10),'#f4ebd0',0,2.44,0,0,0,0,'stone');
            orb(.22,'#ffdf72',0,2.68,0,false);
          } else {
            // 'B': Sculpted turquoise-and-gold alternating striped column with twin coral rings & glowing aqua pearl top (h = 1.78u)
            add(cyl(.36,.44,.20,10),'#d0e4e0',0,.10,0,0,0,0,'stone');
            for(var s=0;s<4;s++){
              add(cyl(.22,.24,.32,12),s%2===0?'#26b2be':'#ffd65c',0,.36+s*.32,0,0,0,0,'coral');
            }
            add(smoothTorus(.28,.048,6,14),'#f2746e',0,1.02,0,Math.PI/2,0,0,false);
            add(smoothTorus(.26,.044,6,14),'#fff7e2',0,1.52,0,Math.PI/2,0,0,false);
            orb(.19,'#86faf4',0,1.76,0,false);
          }
        });
      }
      function starfishPat(x,y,z){
        emitCached('patStarfish', x, y, z, (x+z)*.7, 1, function(){
          for(var st=0;st<5;st++){ var sa=st*Math.PI*2/5; add(cone(.07,.26,4),'#f0846a',Math.cos(sa)*.11,.03,Math.sin(sa)*.11,-Math.sin(sa)*1.45,0,Math.cos(sa)*1.45,false); }
        });
      }
      function ripples(x,z,tx,tz){
        pebble(x,decalY+.01,z,.28,'#e9d4ad');
        pebble(x+tx*.52-tz*.22,decalY+.01,z+tz*.52+tx*.22,.20,'#f2b9a8');
        pebble(x-tx*.46+tz*.28,decalY+.01,z-tz*.46-tx*.28,.17,'#cfe4d6');
        orb(.10,'#f6e5c2',x+tx*.16+tz*.34,decalY+.06,z+tz*.16-tx*.34,false);
      }
      // MAJ-2 (10-pattern-reef): Strict 3D (>= 4.0u) AND 2D hero-camera sightline clearance around
      // Pip (host) and Bok (shopkeeper) + Coral Boutique stall (including view._shopPos) before placing ANY ABAB colonnade pillar!
      var patShopSp=sp.find(function(s){ return s.kind==='shop'; });
      var patCastAnchors=[];
      if(pipDeck){
        patCastAnchors.push({ x:pipDeck.x-2.60, z:pipDeck.z+3.25, y:0.85, r3d:3.10, rayW:2.25, ndcX:0.17 }); // Pip (host)
        patCastAnchors.push({ x:pipDeck.x,      z:pipDeck.z,      y:0.75, r3d:2.85, rayW:1.65, ndcX:0.12 }); // Pip deck
      }
      if(view._shopPos){
        patCastAnchors.push({ x:view._shopPos.x, z:view._shopPos.z, y:1.05, r3d:4.25, rayW:4.15, ndcX:0.28 }); // Live view._shopPos
      }
      if(patShopSp){
        // Protect Bok (shopkeeper) & Coral Boutique stall across both default & obstacle-shifted shop placements (>= 4.0u)
        patCastAnchors.push({ x:patShopSp.x+6.45, z:patShopSp.z+2.15, y:1.00, r3d:4.20, rayW:4.10, ndcX:0.26 }); // Outer Bok spot (-2.90, -11.43)
        patCastAnchors.push({ x:patShopSp.x+3.65, z:patShopSp.z+2.15, y:1.00, r3d:4.25, rayW:4.15, ndcX:0.28 }); // Live Bok spot (-5.70, -11.43)
        patCastAnchors.push({ x:patShopSp.x+4.60, z:patShopSp.z-0.15, y:1.10, r3d:4.15, rayW:4.05, ndcX:0.26 }); // Live Stall spot (-4.75, -13.73)
        patCastAnchors.push({ x:patShopSp.x+7.40, z:patShopSp.z-0.15, y:1.10, r3d:4.10, rayW:4.05, ndcX:0.26 }); // Outer Stall spot (-1.95, -13.73)
      }
      var patGuardCams=[patHeroCam];
      if(pipDeck && patGuardCams.indexOf(pipDeck.i)<0) patGuardCams.push(pipDeck.i);
      if(patGuardCams.indexOf(0)<0) patGuardCams.push(0);
      function patPillarClearOfCast(px,pz){
        if(inPipCorridor(px,pz)) return false;
        for(var ai=0;ai<patCastAnchors.length;ai++){
          var a=patCastAnchors[ai];
          if(Math.hypot(px-a.x, pz-a.z) < a.r3d) return false;
          for(var ci=0;ci<patGuardCams.length;ci++){
            var cIdx=patGuardCams[ci], rig=realCamSetupAt(cIdx), cPos=rig.cam.position;
            var vx=a.x-cPos.x, vz=a.z-cPos.z, len2=vx*vx+vz*vz;
            if(len2>0.25){
              var t=((px-cPos.x)*vx+(pz-cPos.z)*vz)/len2;
              if(t>0.04 && t<1.38){
                var perp=Math.hypot(px-(cPos.x+vx*t), pz-(cPos.z+vz*t));
                if(perp < a.rayW) return false;
              }
            }
            var dCast=Math.hypot(a.x-cPos.x, a.z-cPos.z), dPil=Math.hypot(px-cPos.x, pz-cPos.z);
            if(dPil < dCast + 4.5){
              var ndT=realCamNDCAt(cIdx, a.x, a.y, a.z);
              if(ndT.z>-1 && ndT.z<1 && Math.abs(ndT.x)<1.08 && Math.abs(ndT.y)<1.08){
                var ndBot=realCamNDCAt(cIdx, px, -0.27, pz);
                var ndMid=realCamNDCAt(cIdx, px,  1.25, pz);
                var ndTop=realCamNDCAt(cIdx, px,  2.68, pz);
                if(ndMid.z>-1 && ndMid.z<1){
                  var dxN=Math.min(Math.abs(ndBot.x-ndT.x), Math.abs(ndMid.x-ndT.x), Math.abs(ndTop.x-ndT.x));
                  var yLo=Math.min(ndBot.y, ndMid.y, ndTop.y), yHi=Math.max(ndBot.y, ndMid.y, ndTop.y);
                  if(dxN < a.ndcX && yHi >= ndT.y - 0.18 && yLo <= ndT.y + 0.22) return false;
                }
              }
            }
          }
        }
        return true;
      }
      // 1) HERO PATTERN SHOWCASES FIRST (projected right into 10-pattern-reef cam@4 + cam@0 before generic scatter!):
      //    - Hero Checkered Turquoise-and-Ivory Stepped Plaza in foreground-left clearing
      //    - 2 Bold Multi-Hue Fibonacci Golden-Spiral Mosaic Plazas in mid-left & mid-right clearings
      //    - Hero Nested Concentric Stepping-Stone Ring arc on foreground-right & mid-left
      //    - Hero Rhythmic ABAB Alternating Striped Coral Colonnades lining the main hero path!
      (function placePatternHeroLandmarks(){
        function findPatHeroSpot(camIdx, tx, ty, minTile, minMos, minPip){
          var best=null;
          for(var gx=bounds.minX-4;gx<=bounds.maxX+4;gx+=.55) for(var gz=bounds.minZ-4;gz<=bounds.maxZ+4;gz+=.55){
            if(!outerClear(gx,gz,minTile||3.0) || !clearOfPatSurprise(gx,gz,4.0) || !mosaicClear(gx,gz,minMos||3.0)) continue;
            if(minPip && pipDeck && Math.hypot(gx-pipDeck.x,gz-pipDeck.z)<minPip) continue;
            if(patPlaced.some(function(p){ return Math.hypot(p[0]-gx,p[1]-gz)<2.6; })) continue;
            var nd=realCamNDCAt(camIdx,gx,-.24,gz);
            if(nd.z>1 || nd.x<-.88 || nd.x>.88 || nd.y<-.82 || nd.y>.42) continue;
            var sc=Math.hypot(nd.x-tx,nd.y-ty);
            if(!best || sc<best.sc) best={x:gx,z:gz,sc:sc};
          }
          return (best && best.sc<.45) ? best : null;
        }
        // Hero Checkered Turquoise-and-Ivory Stepped Plaza (Foreground-Left of cam@4: replaces generic lumps at (100,460) & (330,450)!)
        var chk1=findPatHeroSpot(patHeroCam, -.48, -.54, 3.15, 3.0, 0);
        if(chk1){
          checkeredReefPlaza(chk1.x, chk1.z, 1.95, 0.35);
          mosaicSpots.push([chk1.x, chk1.z]);
          patPlaced.push([chk1.x, chk1.z]);
        }
        // Hero Bold Multi-Hue Fibonacci Golden-Spiral Plaza #1 (Mid-Left of cam@4)
        var fib1=findPatHeroSpot(patHeroCam, -.56, -.10, 3.20, 3.8, 0);
        if(fib1){
          mosaic(fib1.x, fib1.z, 2.20);
          mosaicSpots.push([fib1.x, fib1.z]);
          patPlaced.push([fib1.x, fib1.z]);
        }
        // Hero Bold Multi-Hue Fibonacci Golden-Spiral Plaza #2 (Mid-Right of cam@4)
        var fib2=findPatHeroSpot(patHeroCam, .52, -.02, 3.15, 3.6, 0);
        if(fib2){
          mosaic(fib2.x, fib2.z, 1.95);
          mosaicSpots.push([fib2.x, fib2.z]);
          patPlaced.push([fib2.x, fib2.z]);
        }
        // Hero Nested Concentric Stepping-Stone Ring Trio (Foreground-Right beside Kiko & mid-left accent)
        [[.46, -.54, 1.05], [.70, -.40, 0.92], [.36, -.26, 0.85], [-.78, -.32, 0.95]].forEach(function(tg){
          var st=findPatHeroSpot(patHeroCam, tg[0], tg[1], 2.35, 2.25, 0);
          if(st){
            concentricStepStone(st.x, st.z, tg[2]);
            mosaicSpots.push([st.x, st.z]);
          }
        });
        // Hero Rhythmic ABAB Alternating Striped Coral Colonnade Pillars lining the visible main path (sp[3]..sp[11])!
        var heroColIdx=0;
        for(var hi=3;hi<=Math.min(11,main.length-1);hi++){
          var hs=main[hi], hf=frame(hs);
          // Outer (+1) rhythmic ABAB colonnade lining the right edge of the main hero path (strictly clear of Pip & Bok 3D + 2D sightlines!)
          var ox=hs.x+hf.nx*3.35, oz=hs.z+hf.nz*3.35;
          if(patPillarClearOfCast(ox,oz) && outerClear(ox,oz,2.55) && clearOfPatSurprise(ox,oz,3.8) &&
             !patPlaced.some(function(p){ return Math.hypot(p[0]-ox,p[1]-oz)<2.1; })){
            patPlaced.push([ox,oz]);
            coralColonnadeUnit(heroColIdx%2===0, ox, -.27, oz, Math.atan2(-hf.nx,-hf.nz));
            addObstacle(ox,oz,.72);
            heroColIdx++;
          }
          // Paired inner (-1) rhythmic ABAB pillars lining the left curve of the main path (strictly clear of Pip, Bok & Stall!)
          if(hi>=3 && hi<=10 && hi%2===0){
            var ix2=hs.x-hf.nx*3.60, iz2=hs.z-hf.nz*3.60;
            if(patPillarClearOfCast(ix2,iz2) && outerClear(ix2,iz2,2.65) && clearOfPatSurprise(ix2,iz2,3.8) && mosaicClear(ix2,iz2,1.95) &&
               !patPlaced.some(function(p){ return Math.hypot(p[0]-ix2,p[1]-iz2)<2.1; })){
              patPlaced.push([ix2,iz2]);
              coralColonnadeUnit(heroColIdx%2===0, ix2, -.27, iz2, Math.atan2(hf.nx,hf.nz));
              addObstacle(ix2,iz2,.72);
              heroColIdx++;
            }
          }
        }
      })();
      // Continue Fibonacci Spiral Mosaics, Checkered Plazas, Concentric Rings & ABAB Colonnades around the entire Pattern Reef loop!
      if(outerClear(cx,cz,3.8) && mosaicClear(cx,cz,3.4)){ mosaic(cx,cz,2.25); mosaicSpots.push([cx,cz]); }
      var colIdx=0;
      main.forEach(function(s,i){
        var f=frame(s);
        if(i%4===2) placed(s,-1,4.8,0,function(x,y,z){
          if(outerClear(x,z,3.4) && mosaicClear(x,z,3.2)){ mosaic(x,z,1.75); mosaicSpots.push([x,z]); }
        });
        else if(i%5===0) placed(s,-1,4.7,0,function(x,y,z){
          if(outerClear(x,z,3.5) && mosaicClear(x,z,3.2)){ checkeredReefPlaza(x,z,1.55,Math.atan2(f.tx,f.tz)); mosaicSpots.push([x,z]); }
        });
        else if(i%3===1) placed(s,1,3.35,0,function(x,y,z){
          if(outerClear(x,z,2.35) && mosaicClear(x,z,2.0)){ concentricStepStone(x,z,.82); }
        });
        if(i%2===0){
          placed(s,1,4.15,0,function(cx3,cy3,cz3){
            if(!patPillarClearOfCast(cx3,cz3) || !outerClear(cx3,cz3,3.0) || !clearOfPatSurprise(cx3,cz3,4.2) || !mosaicClear(cx3,cz3,2.0)) return;
            if(patPlaced.some(function(p){ return Math.hypot(p[0]-cx3,p[1]-cz3)<2.3; })) return;
            patPlaced.push([cx3,cz3]);
            coralColonnadeUnit(colIdx%2===0, cx3, cy3, cz3, Math.atan2(-f.nx,-f.nz));
            addObstacle(cx3,cz3,.76);
            colIdx++;
          });
        }
      });
      function garden(x,y,z,i){
        if(inPatHeroForeground(x,z) || !clearOfPatSurprise(x,z,4.6)) return;
        organicRock(x,y-.2,z,2.1,.68,1.55,'#669f9d','coral');
        organicRock(x-.85,y+.25,z-.55,.95,.42,.78,'#a8c4ad','coral');
        variedCoral(i%4,x-.52,y+.32,z+.42,1.08,i);
        variedCoral((i+1)%4,x+.78,y+.24,z-.42,1.02,i+2);
        if(!inPipCorridor(x-1.2,z-.35)){
          patternFanCoral(x-1.2,y+.30,z-.35,1.12,.25+i*.4);
          addObstacle(x-1.2,z-.35,1.05);
        }
        variedCoral((i+3)%4,x+.28,y+.32,z+.95,.82,i+4);
        jewelCoralBlossom(x+.10,y+.38,z+.18,.84,i);
        if(i%2){
          kitProp('clam',x+1.25,y+.24,z+.62,.62);
          orb(.16,'#fff6dc',x+1.25,y+.45,z+.62,false);
        }
        addObstacle(x,z,1.7);
      }
      main.forEach(function(s,i){ if(i%3) return;
        placed(s,1,5.6,0,function(x,y,z){ if(!inPipCorridor(x,z) && patClaim(x,z,3.4,4.2,3.4)) garden(x,y,z,i); });
      });
      // Mirrored coral gardens on the inner (-1) side so the left half of the opening frame is planted too (strictly clear of mosaic discs!).
      main.forEach(function(s,i){ if(i%3!==1) return;
        placed(s,-1,5.8,(i%2?1.2:-1.2),function(x,y,z){ if(!inPipCorridor(x,z) && patClaim(x,z,3.4,4.2,3.5)) garden(x,y,z,i); });
      });
      // Close-in visible coral shelves, curved coral arches & shellstone temple gateways (dist = 4.5..13.5)
      for(var pi=0;pi<main.length;pi++){
        var ps=main[pi], pf=frame(ps), psd=pi%2?-1:1, pk=pi%3;
        placed(ps,psd,9.2+pk*1.4,0,function(px,py,pz){
          if(inPipCorridor(px,pz) || !patClaim(px,pz,4.4,4.6,3.8)) return;
          var pAng=Math.atan2(pf.tx,pf.tz), rx=Math.cos(pAng), rz=-Math.sin(pAng), lintelAng=Math.atan2(-pf.tz,pf.tx);
          organicRock(px,-.65,pz,3.1,1.0+(pi%2)*.4,2.7,'#5d9997','coral');
          organicRock(px,.2,pz,2.0,.32,1.8,'#81bab0','coral');
          addObstacle(px,pz,2.0);
          if(pk===0){
            // Striped candy-banded coral arch (alternating coral-rose & cream-ivory arched segments!)
            var gArch=curRoot.children.length;
            add(smoothTorus(2.2,.44,10,20),pi%2?'#e28b86':'#42a8b2',px,.25,pz,0,pAng,0,'coral');
            for(var ea=0;ea<7;ea++){
              var aa=.22+ea*(Math.PI-.44)/6;
              var bx=px+rx*Math.cos(aa)*2.2, by=.25+Math.sin(aa)*2.2, bz=pz+rz*Math.cos(aa)*2.2;
              var band=add(cyl(.49,.49,.26,12),ea%2===0?'#fff4dc':(pi%2?'#36a8b4':'#f07c76'),bx,by,bz,0,pAng,aa-Math.PI/2,'coral');
              band.scale.set(1,1,1);
            }
            compactRootRange(gArch, px, .25, pz, 0);
            variedCoral(pi%4,px-.95,.36,pz+.4,1.0,pi);
            variedCoral((pi+2)%4,px+.95,.36,pz-.3,1.02,pi+3);
            jewelCoralBlossom(px,2.52,pz,.90,pi);
          }else if(pk===1){
            // Striped coral-arch gateway: two ABAB banded columns joined by a striped half-torus lintel
            var gGate=curRoot.children.length;
            wornBox(2.9,.55,2.5,'#c8d4c2',px,-.15,pz,'stone');
            block(2.4,.14,2.0,pi%2?'#69b5ad':'#e58d82',px,.18,pz,0,'stone');
            var colH=2.5, colBase=.25;
            [-1,1].forEach(function(sd){
              var cx2=px+pf.tx*sd*.95, cz2=pz+pf.tz*sd*.95;
              for(var bi=0;bi<5;bi++){
                add(cyl(.28-bi*.01,.30-bi*.01,colH/5,10),bi%2===0?'#f6ebd2':(pi%2?'#3ea6b2':'#e87c76'),cx2,colBase+(bi+.5)*colH/5,cz2,0,0,0,'stone');
              }
              block(.7,.2,.7,'#d4cbb2',cx2,colBase+colH+.1,cz2,0,'stone');
            });
            var archY=colBase+colH+.2;
            add(archGeo(.95,.17),pi%2?'#f0a393':'#7fc5b4',px,archY,pz,0,lintelAng,0,'coral');
            for(var la=0;la<7;la++){ var lt=(la+.5)/7*Math.PI; orb(.15,la%2===0?'#fff3d4':(pi%2?'#3ea6b2':'#f07a72'),px+pf.tx*Math.cos(lt)*.95,archY+Math.sin(lt)*.95+.08,pz+pf.tz*Math.cos(lt)*.95); }
            compactRootRange(gGate, px, 0, pz, 0);
            jewelCoralBlossom(px,archY+1.06,pz,.86,pi+1);
            anemoneRosette(px+.1,.38,pz+.9,.85,pi+1);
          }else{
            variedCoral(1,px,.44,pz,1.15,pi+4);
            patternFanCoral(px-.8,.4,pz+.6,1.12,pAng);
            variedCoral(3,px+.7,.40,pz-.5,.95,pi+2);
            jewelCoralBlossom(px-.55,.46,pz-.45,.88,pi+2);
            kitProp('clam',px+.2,.32,pz+.85,.65);
            orb(.16,'#fff6dc',px+.2,.54,pz+.85,false);
          }
        });
      }
      // Reef clusters shared by the mid-band and the inner-floor sweep: kelp forest / anemone bed / table & brain mound / shell cove / fan-coral shelf.
      function reefCluster(kind,x,y,z,i,rs){
        if(inPipCorridor(x,z) || inPatHeroForeground(x,z) || !clearOfPatSurprise(x,z,4.6)) return;
        var rk=rs||1; organicRock(x,y-.12,z,1.6*rk,.30,1.35*rk,'#6fa7a2','coral');
        addObstacle(x,z,1.3*rk);
        if(kind===0){
          for(var kj=0;kj<4;kj++){ var ka=kj*1.6+i; kitProp('kelp',x+Math.cos(ka)*.82,y+.05,z+Math.sin(ka)*.68,.48+(kj%2)*.12); }
          variedCoral(3,x+.75,y+.18,z+.42,.72,i+3);
        }else if(kind===1){
          anemoneRosette(x-.52,y+.24,z+.2,.85,i);
          anemoneRosette(x+.48,y+.24,z-.22,.74,i+2);
          tableCoral(x+.05,y+.20,z+.62,.78,i+4);
          branchTubeCoral(x-.1,y+.20,z-.58,.86,i+1);
          jewelCoralBlossom(x,y+.28,z,.76,i);
        }else if(kind===2){
          tableCoral(x-.32,y+.24,z+.12,1.02,i+1);
          brainCoral(x+.76,y+.22,z-.38,.78,i+3);
          jewelCoralBlossom(x+.18,y+.26,z+.46,.74,i+2);
          patternFanCoral(x-.85,y+.28,z-.65,.96,i*.7);
          addObstacle(x-.85,z-.65,.95);
          kitProp('clam',x+.48,y+.20,z+.75,.52);
        }else if(kind===3){
          kitProp('clam',x-.38,y+.18,z+.1,.68); orb(.15,'#fff6dc',x-.38,y+.42,z+.1,false);
          pebble(x+.68,y+.04,z-.28,.24,'#f5b2a0'); pebble(x+.2,y+.04,z+.76,.20,'#fff0d2');
          starfishPat(x+.75,y+.12,z+.46);
          branchTubeCoral(x+.2,y+.20,z-.64,.82,i+2);
        }else{
          patternFanCoral(x-.3,y+.28,z,1.08,i*.9);
          addObstacle(x-.3,z,1.05);
          brainCoral(x+.68,y+.22,z+.32,.84,i+4);
          tableCoral(x+.08,y+.22,z-.72,.80,i+2);
          anemoneRosette(x-.82,y+.24,z+.58,.68,i+3);
          jewelCoralBlossom(x+.56,y+.26,z-.42,.72,i+1);
        }
      }
      // Mid-band (dist 7-9) on the inner side: kelp forests, anemone rosettes, tiered tables & brain/tube coral mounds.
      main.forEach(function(s,i){
        var mk=i%4;
        [[7.2+(i%2)*.9,i%2?1.1:-1.1],[8.6,i%2?-1.6:1.6]].forEach(function(spot,si){
          placed(s,-1,spot[0],spot[1],function(x,y,z){
            if(!inPipCorridor(x,z) && patClaim(x,z,3.3,4.0)) reefCluster((mk+si)%5,x,y,z,i+si);
          });
        });
      });
      // Inner-floor sweep: a jittered hex lattice over the whole interior so every quadrant reads as a diverse sculpted coral garden.
      var innerPoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*3.9,s.z+f.nz*3.9]; });
      function inInner(x,z){
        var inside=false;
        for(var a=0,b=innerPoly.length-1;a<innerPoly.length;b=a++){
          var xi=innerPoly[a][0],zi=innerPoly[a][1],xj=innerPoly[b][0],zj=innerPoly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) inside=!inside;
        }
        return inside;
      }
      // Small diverse reef tufts: kelp / pastel anemone rosette / ridged brain / table coral / branch-tube / shell & starfish.
      function reefTuft(kind,x,y,z,i){
        if(!patPillarClearOfCast(x,z) || inPatHeroForeground(x,z) || !clearOfPatSurprise(x,z,4.5)){
          // Inside Pip's foreground corridor & hero pattern plaza zone, keep only flat floor detail (starfish & tiny pebbles) — zero generic lumps!
          if(kind%2===0){ starfishPat(x,y+.03,z); pebble(x+.35,y+.02,z+.22,.16,'#f5b2a0'); }
          else { pebble(x,y+.02,z,.18,'#f0d8b0'); pebble(x-.3,y+.02,z+.25,.14,'#fff0d2'); }
          return;
        }
        if(kind===0){ kitProp('kelp',x-.25,y+.04,z,.36); kitProp('kelp',x+.3,y+.04,z+.15,.30); pebble(x,y+.04,z+.48,.18,'#f0d8b0'); }
        else if(kind===1){ anemoneRosette(x,y+.06,z,.68,i); pebble(x+.45,y+.03,z+.3,.18,'#f5b2a0'); addObstacle(x,z,.75); }
        else if(kind===2){ tableCoral(x,y+.06,z,.72,i+2); pebble(x-.52,y+.03,z+.2,.16,'#fff0d2'); addObstacle(x,z,.8); }
        else if(kind===3){ branchTubeCoral(x,y+.06,z,.68,i+1); starfishPat(x+.48,y+.04,z+.28); addObstacle(x,z,.75); }
        else if(kind===4){ brainCoral(x,y+.06,z,.66,i+3); starfishPat(x-.48,y+.04,z-.25); addObstacle(x,z,.75); }
        else { kitProp('clam',x,y+.04,z,.52); starfishPat(x-.48,y+.04,z-.25); seaGrass(x+.4,y+.05,z+.2,.48,'#52a98a'); }
      }
      // M9: Foreground seabed pebble, starfish & low-profile sea-anemone clusters in the lower-left band
      // (runs BEFORE generic reefTuft scatter so Pip's corridor gets lush low-profile floor craft, h <= 0.44u,
      // strictly clear of Pip, mosaic discs, tiles & Ask Shelly HUD pill!)
      var patFirstDeck=main.find(function(s){ return s.kind==='deck' && !s.practice; });
      var patLLPlaced=[];
      function placePatternsLowerLeft(camIdx){
        var cands=[];
        for(var wx=bounds.minX-4;wx<=bounds.maxX+4;wx+=.70) for(var wz=bounds.minZ-4;wz<=bounds.maxZ+4;wz+=.70){
          if(!inInner(wx,wz) || !outerClear(wx,wz,2.45) || !mosaicClear(wx,wz,1.85)) continue;
          if(patPlaced.some(function(p){ return Math.hypot(p[0]-wx,p[1]-wz)<1.95; })) continue;
          var nd=camNDCAt(camIdx,wx,-.27,wz);
          if(nd.x<-.90 || nd.x>-.12 || nd.y<-.88 || nd.y>-.16 || nd.z>1) continue;
          if(nd.x<-.54 && nd.y<-.68) continue; // Keep clear of bottom-left Ask Shelly HUD pill
          cands.push({x:wx,z:wz,nd:nd});
        }
        var llTargets=[
          {tx:-.74, ty:-.46, kind:0, sc:.58},
          {tx:-.44, ty:-.68, kind:1, sc:.55},
          {tx:-.64, ty:-.74, kind:2, sc:.54},
          {tx:-.26, ty:-.76, kind:3, sc:.52},
          {tx:-.80, ty:-.24, kind:0, sc:.56},
          {tx:-.34, ty:-.46, kind:2, sc:.50}
        ];
        llTargets.forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(patLLPlaced.some(function(p){ return Math.hypot(p[0]-c.x,p[1]-c.z)<1.80; })) return;
            var sc=Math.hypot(c.nd.x-tg.tx,c.nd.y-tg.ty);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best || best.sc>.38) return;
          var lx=best.c.x, lz=best.c.z, ly=-.29;
          patLLPlaced.push([lx,lz]);
          patPlaced.push([lx,lz]);
          if(tg.kind===0){
            anemoneRosette(lx,ly,lz,tg.sc,ti);
            jewelCoralBlossom(lx-.36,ly+.01,lz-.32,.56,ti);
            pebble(lx+.46,ly+.01,lz+.26,.22,'#efd8b2');
            pebble(lx-.42,ly+.01,lz+.32,.18,'#f3b8a6');
            pebble(lx+.16,ly+.01,lz-.42,.16,'#cbe2d5');
          }else if(tg.kind===1){
            starfishPat(lx,ly+.03,lz);
            jewelCoralBlossom(lx+.34,ly+.01,lz+.32,.54,ti+1);
            pebble(lx+.42,ly+.01,lz-.22,.24,'#f0d8b0');
            pebble(lx-.36,ly+.01,lz+.34,.19,'#f4bca9');
            kitProp('clam',lx-.44,ly+.02,lz-.24,.40);
            orb(.10,'#fff5db',lx-.44,ly+.16,lz-.24,false);
          }else if(tg.kind===2){
            anemoneRosette(lx-.18,ly,lz-.10,tg.sc,ti+2);
            jewelCoralBlossom(lx+.32,ly+.01,lz-.26,.54,ti+2);
            starfishPat(lx+.42,ly+.03,lz+.28);
            pebble(lx+.22,ly+.01,lz-.38,.20,'#e8d4ae');
            seaGrass(lx-.46,ly+.02,lz+.34,.40,'#52a98a');
          }else{
            pebble(lx,ly+.01,lz,.28,'#e9d4ad');
            pebble(lx+.38,ly+.01,lz+.24,.21,'#f2b9a8');
            pebble(lx-.34,ly+.01,lz-.22,.19,'#cfe4d6');
            starfishPat(lx-.36,ly+.03,lz+.34);
            anemoneRosette(lx+.44,ly,lz-.28,.46,ti+3);
            jewelCoralBlossom(lx-.12,ly+.01,lz-.34,.52,ti+3);
          }
        });
      }
      placePatternsLowerLeft(patFirstDeck ? patFirstDeck.i : activeIdx);
      if(patFirstDeck && patFirstDeck.i!==activeIdx) placePatternsLowerLeft(activeIdx);
      for(var sw=0;sw<2;sw++){
        var swStep=sw?1.80:2.55, swGap=sw?2.35:3.2, swSpace=sw?1.85:2.75;
        for(var gz=bounds.minZ-6,row=0;gz<=bounds.maxZ+6;gz+=swStep,row++){
          for(var gx=bounds.minX-6+(row%2)*swStep*.5,col=0;gx<=bounds.maxX+6;gx+=swStep*1.02,col++){
            var hsh=Math.abs(Math.sin(row*12.9898+col*78.233+sw*3.1)*43758.5453)%1, hsh2=Math.abs(Math.sin(row*39.346+col*11.135+sw)*24634.6345)%1,
                jx=gx+(hsh-.5)*.7, jz=gz+(hsh2-.5)*.7;
            if(!inInner(jx,jz) || !patClaim(jx,jz,swSpace,swGap,sw?2.65:3.25)) continue;
            if(sw) reefTuft(Math.floor(hsh*6)%6,jx,-.27,jz,row*7+col);
            else reefCluster(Math.floor(hsh*5)%5,jx,-.27,jz,row*7+col,.78);
          }
        }
      }
      // Outer-side filler between the gardens (+1, dist 6.4-7.4): varied sculpted coral clusters along the shelf edge.
      main.forEach(function(s,i){ if(i%3!==2) return;
        placed(s,1,6.8,0,function(x,y,z){
          if(inPipCorridor(x,z) || !patClaim(x,z,3.0,4.2,3.2)) return;
          organicRock(x,y-.1,z,1.5,.3,1.3,'#6fa7a2','coral');
          addObstacle(x,z,1.3);
          if(i%2){ kitProp('kelp',x-.5,y+.05,z,.5); variedCoral(1,x+.15,y+.22,z-.65,.88,i+2); variedCoral(0,x+.55,y+.22,z+.32,.76,i+4); }
          else{ anemoneRosette(x-.4,y+.24,z,.82,i+1); branchTubeCoral(x+.5,y+.20,z-.2,.86,i+3); }
        });
      });
      // Soft painted sand-ripple decals on open inner floor (clear of mosaic discs & coral mounds)
      main.forEach(function(s,i){
        var f=frame(s);
        if(i%2===1) placed(s,-1,5.1,(i%4===1?2.0:-2.0),function(x,y,z){
          if(outerClear(x,z,3.3) && mosaicClear(x,z,2.35)) ripples(x,z,f.tx,f.tz,2.8,4);
        });
      });
      // Guarantee 2 vibrant foam-ringed coral reef islets in the far-right ocean (800..1024, 0..380)!
      var patOuterPoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*5.4,s.z+f.nz*5.4]; });
      function inPatShelf(x,z){
        var ins=false;
        for(var a=0,b=patOuterPoly.length-1;a<patOuterPoly.length;b=a++){
          var xi=patOuterPoly[a][0],zi=patOuterPoly[a][1],xj=patOuterPoly[b][0],zj=patOuterPoly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) ins=!ins;
        }
        return ins;
      }
      function placePatternsRightIslets(camIdx){
        var cands=[];
        for(var wx=bounds.minX-14;wx<=bounds.maxX+24;wx+=1.1) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+24;wz+=1.1){
          if(inPatShelf(wx,wz) || !outerClear(wx,wz,7.4)) continue;
          if(patPlaced.some(function(p){ return Math.hypot(p[0]-wx,p[1]-wz)<4.2; })) continue;
          var nd=camNDCAt(camIdx,wx,-.56,wz);
          if(nd.x<.56 || nd.x>.94 || nd.y<-.24 || nd.y>.72 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        [[.76,.42,1.02],[.78,-.08,.94]].forEach(function(tg,ti){
          var best=null;
          cands.forEach(function(c){
            if(c.nd.x>.86) return;
            if(patPlaced.some(function(p){ return Math.hypot(p[0]-c.x,p[1]-c.z)<4.4; })) return;
            if(!camInFrame(c.x,c.z,1.5,1.8,-.64,.50,.94,-.32,.78,camIdx)) return;
            var sc=Math.hypot(c.nd.x-tg[0],c.nd.y-tg[1]);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best) return;
          var ix=best.c.x, iz=best.c.z, k=tg[2];
          patPlaced.push([ix,iz]);
          smoothFoamRing(ix,waterY+.064,iz,2.78*k,2.42*k);
          surfWaveHalo(ix,waterY+.056,iz,2.70*k,2.35*k,ti);
          smoothSandbar(ix,waterY-.02,iz,2.45*k,.95*k,2.15*k,'#73b4ab');
          smoothSandbar(ix,waterY+.32,iz,1.82*k,.46*k,1.60*k,'#efd8a6');
          tableCoral(ix-.42*k,-.02,iz+.22*k,.92*k,ti*2);
          brainCoral(ix+.52*k,-.04,iz-.28*k,.86*k,ti*2+4);
          anemoneRosette(ix+.12*k,-.02,iz+.65*k,.78*k,ti*2+2);
          branchTubeCoral(ix-.55*k,-.04,iz-.48*k,.80*k,ti*2+3);
          patternFanCoral(ix+.72*k,.06,iz+.35*k,1.05*k,ti*.9+.4);
          starfishPat(ix-.08*k,.14,iz-.08*k);
        });
      }
      placePatternsRightIslets(patFirstDeck ? patFirstDeck.i : activeIdx);
      // iter20 Minor #6: Fill the right-edge open water (860-1024, 250-420) with a crafted coral-garden shoal islet
      // (tiered turquoise reef stone, fan coral, tube sponges, pastel anemones, starfish, foam ring).
      function placePatternsMidRightShoal(camIdx){
        var best=null;
        for(var wx=bounds.minX-14;wx<=bounds.maxX+24;wx+=.70) for(var wz=bounds.minZ-14;wz<=bounds.maxZ+24;wz+=.70){
          if(inPatShelf(wx,wz) || !outerClear(wx,wz,8.0)) continue;
          if(patPlaced.some(function(p){ return Math.hypot(p[0]-wx,p[1]-wz)<3.6; })) continue;
          var nd=camNDCAt(camIdx,wx,waterY,wz);
          if(nd.x<.72 || nd.x>.90 || nd.y<-.22 || nd.y>.14 || nd.z>1) continue;
          if(!camInFrame(wx,wz,1.25,1.60,waterY,.62,1.01,-.36,.24,camIdx)) continue;
          var sc=Math.hypot(nd.x-.82,nd.y-(-.05));
          if(!best || sc<best.sc) best={x:wx,z:wz,sc:sc};
        }
        if(!best) return;
        var ix=best.x, iz=best.z;
        patPlaced.push([ix,iz]);
        // Crisp scalloped surf-foam ring + outer wave halo
        smoothFoamRing(ix,waterY+.064,iz,2.68,2.32);
        surfWaveHalo(ix,waterY+.056,iz,2.60,2.24,5);
        // Tiered turquoise reef stone base + flanking coral-stone ledges + sunlit warm sand crown
        smoothSandbar(ix,waterY-.04,iz,2.38,1.00,2.08,'#4d9292');
        organicRock(ix+1.00,waterY+.08,iz-.64,.98,.46,.88,'#5ca09e','coral');
        organicRock(ix-.94,waterY+.06,iz+.58,.92,.40,.84,'#589c9a','coral');
        smoothSandbar(ix-.06,waterY+.30,iz+.04,1.84,.56,1.60,'#72b4ab');
        smoothSandbar(ix-.08,waterY+.52,iz+.06,1.22,.26,1.04,'#efd8a6');
        // Sculpted diverse fan coral, fluted tube sponges, pastel sea-anemones, brain & table coral, starfish & pearl clam
        patternFanCoral(ix+.18,.08,iz-.34,1.04,.62);
        branchTubeCoral(ix-.74,.04,iz-.26,.84,1);
        branchTubeCoral(ix+.70,-.02,iz+.42,.72,3);
        anemoneRosette(ix-.44,.06,iz+.64,.82,3);
        anemoneRosette(ix+.20,.06,iz+.72,.66,0);
        brainCoral(ix+.76,-.02,iz-.08,.72,4);
        tableCoral(ix-.90,-.04,iz+.12,.76,0);
        // Bold 5-arm coral-orange starfish crowning the sunlit shoal + companion starfish on the front turquoise terrace
        for(var st=0;st<5;st++){ var sa=st*Math.PI*2/5+.22; add(cone(.10,.38,4),'#f27f63',ix-.04+Math.cos(sa)*.15,.22,iz+.10+Math.sin(sa)*.15,-Math.sin(sa)*1.45,0,Math.cos(sa)*1.45,false); }
        starfishPat(ix+.44,.02,iz+.82);
        kitProp('clam',ix-.18,.08,iz-.64,.50);
        orb(.12,'#fff5db',ix-.18,.24,iz-.64,false);
        pebble(ix+.18,.12,iz+.36,.20,'#f5b2a0');
        pebble(ix-.38,.12,iz-.14,.18,'#fff0d2');
      }
      placePatternsMidRightShoal(patFirstDeck ? patFirstDeck.i : activeIdx);
      // MIN 11: Sculpted horizon coral sea-stacks with stepped rocky ledges, surf foam rings & vibrant coral/foliage tufts
      // (replaces smooth fallback-like teal blobs at (200-340, 80-165) and (810-1020, 60-210)!)
      var patFrondGeo=palmFrondGeo();
      for(var sm=0;sm<6;sm++){
        var sa=sm*Math.PI/3+.45, sr=maxR+19+(sm%2)*4,
            sx=cx+Math.cos(sa)*sr, sz=cz+Math.sin(sa)*sr;
        if(!outerClear(sx,sz,10)) continue;
        var stH=5.0+(sm%3)*1.55, stR=5.4+(sm%2)*0.9, baseY=waterY-0.18, smG0=curRoot.children.length;
        // 1. Wide scalloped white surf-foam ring + outer surf wave halo hugging the waterline
        smoothFoamRing(sx,waterY+0.064,sz,stR*1.32,stR*1.22);
        surfWaveHalo(sx,waterY+0.056,sz,stR*1.44,stR*1.32,sm+2);
        // 2. Stepped wave-cut dark sea-slate base bench + faceted main sea-stack spire + flanking stepped rocky ledges
        var bench=add(facetedCliffGeo(sm%4),'#35697f',sx,baseY,sz,0,sm*1.1,0,'stone');
        bench.scale.set(stR*1.12,1.65,stR*1.04);
        var midLedge=add(facetedCliffGeo((sm+1)%4),'#437d92',sx+0.6,baseY+0.8,sz-0.5,0,sm*1.1+0.9,0,'stone');
        midLedge.scale.set(stR*0.86,stH*0.58,stR*0.80);
        var peak=add(facetedCliffGeo((sm+2)%4),'#4f8ca0',sx-0.4,baseY+1.4,sz+0.3,0,sm*1.1+1.9,0,'stone');
        peak.scale.set(stR*0.64,stH*0.82,stR*0.60);
        // Asymmetric stepped shoulder crags + seaward skerry stone
        var shA=sa+1.15, shX=sx+Math.cos(shA)*stR*0.68, shZ=sz+Math.sin(shA)*stR*0.68;
        var shoulder=add(facetedCliffGeo((sm+3)%4),'#3d7489',shX,baseY,shZ,0,sm*0.7+2.2,0,'stone');
        shoulder.scale.set(stR*0.56,stH*0.50,stR*0.52);
        var skA=sa-1.35, skX=sx+Math.cos(skA)*stR*0.78, skZ=sz+Math.sin(skA)*stR*0.78;
        var skerry=add(facetedCliffGeo((sm+1)%4),'#3a6f85',skX,baseY,skZ,0,sm*1.4,0,'stone');
        skerry.scale.set(stR*0.42,1.85,stR*0.38);
        // 3. Lush overhanging coastal moss & emerald turf terrace cushions crowning the summit & mid ledges
        var topPeakY=baseY+1.4+stH*0.82*0.86;
        var cap1=smoothOrb(stR*0.48,'#4ca87b',sx-0.4,topPeakY,sz+0.3,false); cap1.scale.set(1.18,0.44,1.10);
        var cap2=smoothOrb(stR*0.34,'#66c08a',sx+0.6,topPeakY+0.35,sz-0.3,false); cap2.scale.set(1.12,0.42,1.06);
        var midTopY=baseY+stH*0.50*0.86;
        var mCap=smoothOrb(stR*0.40,'#56b382',shX,midTopY,shZ,false); mCap.scale.set(1.16,0.40,1.10);
        var bCap=smoothOrb(stR*0.32,'#62bc88',skX,baseY+1.65,skZ,false); bCap.scale.set(1.14,0.38,1.06);
        // 4. Vibrant tropical coral & feathery foliage tufts crowning the summit & stepped ledges (clearly legible on horizon!)
        for(var fi=0;fi<5;fi++){
          var fa=fi*Math.PI*2/5+sm*0.7;
          var fr=mesh(patFrondGeo,M(fi%2?'#4fb878':'#6cd089',{side:T.DoubleSide,vertexColors:true}),sx-0.4,topPeakY+0.38,sz+0.3);
          fr.rotation.order='YXZ'; fr.rotation.y=fa; fr.rotation.x=-0.26-(fi%2)*0.10;
          fr.scale.setScalar(1.35+(fi%2)*0.22); root.add(fr);
        }
        // Bold coral-pink, golden-ochre & lavender reef coral accents perched on the stepped rock ledges + glowing jewel coral-blossoms!
        brainCoral(shX,midTopY+0.15,shZ,1.75,sm);
        tableCoral(skX,baseY+1.70,skZ,1.85,sm+2);
        branchTubeCoral(sx+Math.cos(sa+2.4)*stR*0.42,topPeakY+0.12,sz+Math.sin(sa+2.4)*stR*0.42,1.65,sm+4);
        tableCoral(sx-Math.cos(sa+0.4)*stR*0.58,baseY+1.35,sz-Math.sin(sa+0.4)*stR*0.58,1.55,sm+1);
        jewelCoralBlossom(shX,midTopY+0.55,shZ,1.55,sm);
        jewelCoralBlossom(sx-0.3,topPeakY+0.45,sz+0.2,1.65,sm+2);
        compactRootRange(smG0, sx, baseY, sz, 0);
      }
      compactGroupInPlace(patJewelGrp, true, null);
    }
    function beach(){
      // Removed foundations('#f2dcad') which floated at y=-0.16 above Bottle Beach's -0.32 sand plane.
      // MIN-11: Glossy translucent corked sea-glass beach message bottles (opacity: 0.62) with miniature
      // rolled parchment scrolls & crimson wax ties visibly nestled INSIDE the sea-glass (ZERO flat opaque pastel solids!)
      var beachGlassGrp=new T.Group(); beachGlassGrp.name='beach-translucent-bottles';
      var beachBottleGlassMat=new T.MeshPhongMaterial({
        color:'#ffffff', vertexColors:true,
        shininess:195, specular:'#ffffff',
        emissive:view.night?'#0e3238':'#14464c', emissiveIntensity:view.night?0.24:0.18,
        transparent:true, opacity:0.62, depthWrite:false, side:T.FrontSide
      });
      var beachBottleLathe=(function(){
        var pts=[
          new T.Vector2(0.001, 0.00), new T.Vector2(0.27, 0.02), new T.Vector2(0.32, 0.14),
          new T.Vector2(0.30, 0.56),  new T.Vector2(0.24, 0.68), new T.Vector2(0.135, 0.80),
          new T.Vector2(0.112, 1.00), new T.Vector2(0.145, 1.06), new T.Vector2(0.145, 1.11),
          new T.Vector2(0.105, 1.12), new T.Vector2(0.095, 1.02)
        ];
        return new T.LatheGeometry(pts, 14);
      })();
      var bottleCols=['#46d6ca','#3ca8dc','#52d89e','#eba848','#62e2dc','#e2869c'];
      function addTranslucentBottleShell(x,y,z,rx,ry,rz,sc,colHex){
        var gm=new T.Mesh(beachBottleLathe, M(colHex));
        gm.position.set(x,y,z);
        if(rx) gm.rotation.x=rx; if(ry) gm.rotation.y=ry; if(rz) gm.rotation.z=rz;
        if(sc && sc!==1) gm.scale.setScalar(sc);
        beachGlassGrp.add(gm);
      }
      var beachNoBottleZones=[];
      function nearBeachNoBottleZone(x,z){
        return beachNoBottleZones.some(function(zn){ return Math.hypot(x-zn[0],z-zn[1])<(zn[2]||2.8); });
      }
      function bottle(x,y,z,colIdx){
        if(nearBeachNoBottleZone(x,z)) return;
        var ci=Math.abs(Math.floor(colIdx!=null?colIdx:(x*3+z*2)))%bottleCols.length, gc=bottleCols[ci];
        var rotY=((x+z)*1.1)%6.28;
        // Opaque rolled parchment scroll with crimson ribbon + natural cork stopper inside the translucent sea-glass bottle!
        emitCached('beachBottleIn:' + ci, x, y, z, rotY, 1, function(){
          var sg=new T.Group(); sg.rotation.set(0,0,.22);
          var scM=mesh(cyl(.115,.115,.44,10),M('#fff0cc'),0,.36,0); sg.add(finish(scM,'fabric'));
          var rbM=mesh(cyl(.124,.124,.065,10),M('#d84542'),0,.36,0); sg.add(rbM);
          var twM=mesh(smoothTorus(.122,.022,6,12),M('#dfc080'),0,.96,0); twM.rotation.x=Math.PI/2; sg.add(finish(twM,'rope'));
          var ckM=mesh(cyl(.115,.088,.21,10),M('#c48950'),0,1.15,0); sg.add(finish(ckM,'timber'));
          curRoot.add(sg);
        });
        addTranslucentBottleShell(x, y, z, 0, rotY, .22, 1.02, gc);
      }
      // Readable 1.35x glossy translucent corked message bottle lying on the sand, with rolled parchment scroll inside & beside it!
      function messageBottle(x,y,z,rot){
        if(nearBeachNoBottleZone(x,z)) return;
        var ry=rot||0, k=1.32;
        emitCached('beachMsgBottleIn', x, y, z, ry, 1, function(){
          var g1=new T.Group(); g1.position.set(-.34*k,.30*k,0); g1.rotation.set(0,0,-(Math.PI/2-.08));
          g1.add(finish(mesh(cyl(.115*k,.115*k,.46*k,10),M('#fff0cc'),0,.36*k,0),'fabric'));
          g1.add(mesh(cyl(.125*k,.125*k,.07*k,10),M('#d84542'),0,.36*k,0));
          var tw=mesh(smoothTorus(.125*k,.022*k,6,12),M('#dfc080'),0,.96*k,0); tw.rotation.x=Math.PI/2; g1.add(finish(tw,'rope'));
          g1.add(finish(mesh(cyl(.115*k,.088*k,.21*k,10),M('#c48950'),0,1.15*k,0),'timber'));
          curRoot.add(g1);
          // Companion unrolled/tied letter resting on the sand beside the bottle
          var lx=.14*k, lz=.74*k;
          var sc2=add(cyl(.09*k,.09*k,.60*k,10),'#f8eed2',lx,.11*k,lz,Math.PI/2,0,.2,'fabric');
          add(cyl(.098*k,.098*k,.07*k,10),'#cc4d4a',lx,.11*k,lz,Math.PI/2,0,.2,false);
          orb(.065*k,'#cc4d4a',lx,.19*k,lz+.08*k,false);
          return sc2;
        });
        var cs=Math.cos(ry), sn=Math.sin(ry);
        var ox=-.34*k, gx=x+ox*cs, gz=z-ox*sn;
        addTranslucentBottleShell(gx, y+.30*k, gz, 0, ry, -(Math.PI/2-.08), k, '#46d6ca');
      }
      // Rounded sunlit tidepool (cached composite -> 1-2 meshes instead of 20!).
      function sunTidepool(x,y,z,i){
        emitCached('beachTidepool:' + (Math.abs(i|0)%2), x, y, z, (i||0)*.4, 1, function(){
          function stoneBlob(r,col,px,py,pz,sx,sy,sz){ var o=add(ball(r,10,7),col,px,py,pz,0,0,0,'stone'); o.scale.set(sx,sy,sz); return o; }
          var cols=['#dcc08e','#cfae7c','#e7cfa0','#c8a479'];
          add(cyl(1.0,1.12,.1,12),'#e9d3a4',0,-.04,0,0,0,0,'sand');
          for(var j=0;j<9;j++){
            var a=j*Math.PI*2/9, rr=.92+.1*(j%2);
            stoneBlob(.32+(j%3)*.05,cols[j%4],Math.cos(a)*rr,.12,Math.sin(a)*rr*.9,1.15,.7,1.0);
          }
          add(torus(.82,.07),'#fffaf0',0,.1,0,Math.PI/2,0,0,false);
          add(torus(.72,.04),'#d9f8f2',0,.095,0,Math.PI/2,0,0,false);
          add(cyl(.74,.76,.06,14),'#2fd2cf',0,.07,0,0,0,0,false);
          add(cyl(.46,.5,.04,14),'#9bf0e6',-.1,.105,.05,0,0,0,false);
          orb(.07,'#ffffff',.3,.13,-.28,false);
          starfish(.14,.1,-.12,'#ee7b66');
          orb(.13,'#fff0d6',-.34,.14,.2,false); orb(.07,'#f6b9a8',-.34,.22,.18,false);
        });
      }
      function starfish(x,y,z,col){
        var sc=col||'#ee7b66';
        emitCached('beachStar:' + sc, x, y, z, ((x+z)*1.3)%6.28, 1, function(){
          for(var st=0;st<5;st++){
            var sa=st*Math.PI*2/5;
            add(cone(.08,.28,4),sc,Math.cos(sa)*.12,.04,Math.sin(sa)*.12,-Math.sin(sa)*1.45,0,Math.cos(sa)*1.45,false);
          }
          orb(.048,'#ffe8c8',0,.065,0,false);
        });
      }
      // Grounded sculpted coastal spiral conch shell (cached composite!)
      function spiralShell(x,y,z,rot,scale,colMain,colLip){
        var k=scale||1, c1=colMain||'#f7e2c2', c2=colLip||'#ea9880';
        emitCached('beachShell:' + c1 + ':' + c2, x, y, z, rot || 0, k, function(){
          var b0=smoothOrb(.20,c1,0,.15,0,'stone'); b0.scale.set(1.24,.88,.96);
          var b1=smoothOrb(.15,'#f0d0a8',.17,.14,-.02,'stone'); b1.scale.set(1.12,.86,.92);
          var b2=smoothOrb(.10,c2,.30,.13,-.03,'stone'); b2.scale.set(1.04,.84,.88);
          add(cone(.075,.18,8),c1,.42,.12,-.03,0,0,-Math.PI/2,'stone');
          var lip=smoothOrb(.12,c2,-.16,.11,.06,false); lip.scale.set(.78,.54,1.18);
        });
      }
      // Grounded striped coastal beach towel (cached composite!)
      function beachTowel(x,y,z,rot,colA,colB){
        var c1=colA||'#ee7668', c2=colB||'#fff3d6';
        contact(x,z,.88,.58,y+.006);
        emitCached('beachTowel:' + c1 + ':' + c2, x, y, z, rot || 0, 1, function(){
          block(1.38,.038,.86,c2,0,.022,0,0,'fabric');
          for(var st=-2;st<=2;st++){ if(st%2===0) block(1.32,.044,.14,c1,0,.026,st*.17,0,'fabric'); }
          [-.69,.69].forEach(function(fx){ block(.06,.024,.84,'#f5ebd2',fx,.016,0,0,'fabric'); });
          add(cyl(.095,.095,.62,10),c1,-.46,.10,0,Math.PI/2,0,0,'fabric');
        });
      }
      // Grounded seaside timber crate topped with a glowing brass lantern (cached composite!)
      function seasideCrateLantern(x,y,z,rot,scale){
        var k=scale||1;
        contact(x,z,.76*k,.76*k,y+.008);
        emitCached('beachCrateLantern', x, y, z, rot || 0, k, function(){
          crate(0,0,0,.94);
          [-.24,.24].forEach(function(bx){ block(.055,.55,.60,'#e0b656',bx,.28,0,0,false); });
          var ly=.55;
          add(cyl(.15,.19,.08,10),'#b5873d',0,ly+.04,0,0,0,0,false);
          add(cyl(.14,.13,.26,10),'#f6d47c',0,ly+.21,0,0,0,0,false);
          orb(.09,'#fff1b8',0,ly+.21,0,false);
          add(smoothTorus(.15,.022,6,14),'#b5873d',0,ly+.34,0,Math.PI/2,0,0,false);
          add(cone(.20,.15,10),'#49566a',0,ly+.42,0,0,0,0,'roof');
          orb(.045,'#ecc360',0,ly+.52,0,false);
        });
      }
      var msgBottles=0, shopTile=sp.find(function(t){ return t.kind==='shop'; });
      function beachGrassClear(gx,gz){
        if(view._jisuPos && Math.hypot(gx-view._jisuPos.x,gz-view._jisuPos.z)<3.4) return false;
        for(var jk=0;jk<3;jk++){
          var js=(sp && sp[jk]) || main[jk];
          if(!js) continue;
          var jf=frame(js);
          if(Math.hypot(gx-(js.x-2.70),gz-(js.z+0.16))<3.4) return false;
          if(Math.hypot(gx-(js.x-jf.nx*3.5),gz-(js.z-jf.nz*3.5))<3.4) return false;
        }
        return true;
      }
      function beachStallClear(x,z,r){
        var minR=r||2.8;
        if(Math.hypot(x-(-6.25),z-(-15.55))<minR) return false;
        if(Math.hypot(x-(-6.54),z-(-15.86))<minR) return false;
        return true;
      }
      var beachOceanPlaced=[];
      var beachFirstDeck=main.find(function(s){ return s.kind==='deck' && !s.practice; });
      var archMidX = bounds ? (bounds.minX + bounds.maxX) * 0.5 : -24.5;
      var archMidZ = bounds ? (bounds.minZ + bounds.maxZ) * 0.5 : -12.5;
      var archFx = 0.46, archFz = -0.888, archFLen = Math.hypot(archFx, archFz);
      archFx /= archFLen; archFz /= archFLen;
      var beachBokTargets=[
        {x:-6.25, z:-15.55, r:3.8, rayW:2.2},
        {x:-6.54, z:-15.86, r:3.8, rayW:2.2},
        {x:-6.15, z:-22.55, r:3.8, rayW:2.2},
        {x:archMidX + archFx * 44, z:archMidZ + archFz * 44, r:8.5, rayW:5.0, maxT:1.45},
        {x:archMidX + archFx * 55, z:archMidZ + archFz * 55, r:10.5, rayW:5.5, maxT:1.35}
      ];
      if(view._shopPos) beachBokTargets.push({x:view._shopPos.x, z:view._shopPos.z, r:3.8, rayW:2.2});
      if(view._jisuPos) beachBokTargets.push({x:view._jisuPos.x, z:view._jisuPos.z, r:5.5, rayW:4.5, maxT:1.85});
      var beachSightCams=[
        realCamSetupAt(0).cam.position,
        realCamSetupAt(activeIdx).cam.position,
        camSetupAt(0).cam.position
      ];
      if(beachFirstDeck) beachSightCams.push(realCamSetupAt(beachFirstDeck.i).cam.position);
      function beachPalmClear(x,z){
        for(var bi2=0;bi2<beachBokTargets.length;bi2++){
          var tg=beachBokTargets[bi2];
          if(Math.hypot(x-tg.x,z-tg.z)<tg.r) return false;
          var maxT=tg.maxT||1.15;
          for(var ki=0;ki<beachSightCams.length;ki++){
            var cp=beachSightCams[ki], vx=tg.x-cp.x, vz=tg.z-cp.z, len2=vx*vx+vz*vz;
            if(len2<1) continue;
            var t=((x-cp.x)*vx+(z-cp.z)*vz)/len2;
            if(t>0.05 && t<maxT){
              var px2=cp.x+vx*t, pz2=cp.z+vz*t;
              if(Math.hypot(x-px2,z-pz2)<tg.rayW) return false;
            }
          }
        }
        return true;
      }
      // Pre-register Bottle Beach pier deck, corner posts & seaside crate-lantern zones so NO bottle/messageBottle/shoreBottle/waterBottle clips them!
      var prePierS=main[Math.min(2,main.length-1)], prePierF=frame(prePierS);
      var prePierPx=prePierS.x+prePierF.nx*7.55, prePierPz=prePierS.z+prePierF.nz*7.55;
      if(outerClear(prePierPx,prePierPz,4.6) && outerClear(prePierPx+prePierF.nx*2.1,prePierPz+prePierF.nz*2.1,4.6)){
        beachNoBottleZones.push([prePierPx,prePierPz,2.8]);
        [-1.8,1.8].forEach(function(pStep){
          beachNoBottleZones.push([prePierPx+prePierF.nx*pStep,prePierPz+prePierF.nz*pStep,2.8]);
          [-1,1].forEach(function(sd){
            beachNoBottleZones.push([prePierPx+prePierF.nx*pStep+prePierF.tx*sd*.78,prePierPz+prePierF.nz*pStep+prePierF.tz*sd*.78,2.8]);
          });
        });
        var preLandX=prePierPx-prePierF.nx*2.35, preLandZ=prePierPz-prePierF.nz*2.35;
        var preClX=preLandX-prePierF.tx*1.08+prePierF.nx*.18, preClZ=preLandZ-prePierF.tz*1.08+prePierF.nz*.18;
        if(outerClear(preClX,preClZ,3.4)) beachNoBottleZones.push([preClX,preClZ,2.8]);
        var preSpX=prePierPx+prePierF.nx*1.12-prePierF.tx*1.76, preSpZ=prePierPz+prePierF.nz*1.12-prePierF.tz*1.76;
        if(outerClear(preSpX,preSpZ,5.0)){
          beachNoBottleZones.push([preSpX-prePierF.nx*.62+prePierF.tx*.16,preSpZ-prePierF.nz*.62+prePierF.tz*.16,2.8]);
        }
      }
      main.forEach(function(s,i){
        var f=frame(s), faceRot=Math.atan2(-f.nx,-f.nz);
        if(i%3===0){
          placed(s,1,5.2,0,function(x,y,z){
            if(!outerClear(x,z,4.0)) return;
            var px=x, pz=z;
            if(!beachPalmClear(px,pz)){
              var altX=x+f.tx*3.2, altZ=z+f.tz*3.2;
              if(outerClear(altX,altZ,4.0) && beachPalmClear(altX,altZ)){ px=altX; pz=altZ; }
              else{
                altX=x-f.tx*3.2; altZ=z-f.tz*3.2;
                if(outerClear(altX,altZ,4.0) && beachPalmClear(altX,altZ)){ px=altX; pz=altZ; }
                else return;
              }
            }
            palmTree(px,y,pz,i);
            beachNoBottleZones.push([px,pz,2.5]);
            if(outerClear(px+1.2,pz+.7,3.8)) bottle(px+1.2,y,pz+.7);
            addObstacle(px,pz,.95);
          });
        }else if(i%3===1){
          // Cleanly proportioned grounded beach umbrella with crisp golden sand daylight separating pole, striped towel & wooden bench
          var uDist=i===1?3.65:4.65, uDz=i===1?1.75:0;
          placed(s,1,uDist,uDz,function(x,y,z){
            if(!outerClear(x,z,3.6)) return;
            umbrella(x,y,z,i%2?'#e86f68':'#45a8b8','#fff1d0',faceRot,i===1?.92:.94);
            var twOffT=i===1?1.15:1.18, twOffN=i===1?-.35:0;
            beachTowel(x+f.tx*twOffT+f.nx*twOffN,y,z+f.tz*twOffT+f.nz*twOffN,faceRot,i%2?'#e86f68':'#45a8b8','#fff1d0');
            var bOff=i===1?1.52:1.58;
            var bx=x-f.tx*bOff, bz=z-f.tz*bOff;
            if(outerClear(bx,bz,3.3)){
              bench(bx,y,bz,faceRot);
              beachNoBottleZones.push([bx,bz,2.5]);
              addObstacle(bx,bz,.85);
            }
            addObstacle(x,z,.90);
          });
        }
        if(i%4===0){
          placed(s,-1,4.3,1,function(x,y,z){
            if(!outerClear(x,z,3.6) || !beachStallClear(x,z,3.4)) return;
            // Keep inner sandbar mounds clear of Bok's beach kiosk & enlarged splash-pool
            if(shopTile && Math.hypot(x-shopTile.x,z-shopTile.z)<4.8) return;
            smoothFoamRing(x,waterY+.064,z,2.08,1.84);
            smoothSandbar(x,y-.06,z,1.78,.68,1.58,'#eac991');
            for(var j=0;j<3;j++) orb(.22,['#e58f87','#f7e3bc','#e8ad78'][j],x-.6+j*.52,y+.39,z+.4);
            starfish(x+.7,y+.22,z-.3,'#f07c65');
            if(msgBottles<3){ msgBottles++; messageBottle(x-.35,y+.04,z-.45,faceRot+i*.3); }
            if(beachGrassClear(x-1.2,z-.7)) seaGrass(x-1.2,y+.2,z-.7,.72,'#7dac77');
          });
        }
        if(i%3===2){
          placed(s,-1,3.7,-.6,function(x,y,z){
            if(!outerClear(x,z,3.4) || !beachStallClear(x,z,3.0)) return;
            pebble(x,y,z,.32,'#f5b2a0'); starfish(x-.5,y+.05,z+.35,'#ff9b71');
            if(beachGrassClear(x+.7,z-.45)) seaGrass(x+.7,y,z-.45,.55,'#79aa7d');
          });
        }
      });
      // m20: Smooth 24-segment domed sandbar islets with soft 32-segment rounded foam rims (zero octagonal edges!)
      for(var bi=0;bi<main.length;bi+=4){
        var bs=main[bi], bsd=bi%8===0?1:-1;
        placed(bs,bsd,9.5+(bi%3)*1.6,0,function(bx,by,bz){
          if(!outerClear(bx,bz,5.0)) return;
          beachOceanPlaced.push([bx,bz,3.8]);
          smoothFoamRing(bx,waterY+.064,bz,3.78,3.16);
          surfWaveHalo(bx,waterY+.056,bz,3.68,3.08,bi);
          smoothSandbar(bx,-.62,bz,3.62,1.02,3.02,'#ebd29c');
          if(bi%8===0){
            if(beachPalmClear(bx-.35,bz+.2)){ palmTree(bx-.35,-.14,bz+.2,bi,1.0); beachNoBottleZones.push([bx-.35,bz+.2,2.5]); }
            umbrella(bx+1.1,-.14,bz-.45,'#e86f68','#fff1d0',bi*.7,.85);
          }else{
            sunTidepool(bx+.9,-.04,bz-.5,bi);
            orb(.16,'#f9e8c8',bx-1.1,.02,bz+.8,false);
          }
        });
      }
      // Bustling wooden beach pier extending into the sea with straight upright bollard lamp, crates & clearly spaced moored sailboat
      var pierS=main[Math.min(2,main.length-1)], pierF=frame(pierS);
      var pierAng=Math.atan2(pierF.nx,pierF.nz),
          px=pierS.x+pierF.nx*7.55, pz=pierS.z+pierF.nz*7.55;
      if(outerClear(px,pz,4.6) && outerClear(px+pierF.nx*2.1,pz+pierF.nz*2.1,4.6)){
        beachOceanPlaced.push([px,pz,3.8]);
        beachOceanPlaced.push([px+pierF.nx*2.0,pz+pierF.nz*2.0,3.2]);
        block(1.85,.15,4.6,'#a6825d',px,-.12,pz,pierAng,'timber');
        [-1,1].forEach(function(sd){
          for(var pStep=-1.8;pStep<=1.85;pStep+=1.8){
            post(.09,.95,'#75543a',px+pierF.nx*pStep+pierF.tx*sd*.78,-.65,pz+pierF.nz*pStep+pierF.tz*sd*.78);
          }
        });
        // Straight upright coastal pier bollard lamp (rotation.x = 0, rotation.z = 0, positioned cleanly along pier deck)
        var lx=px+pierF.nx*.75+pierF.tx*.68, ly=-.05, lz=pz+pierF.nz*.75+pierF.tz*.68;
        var lpParts=[
          add(cyl(.18,.22,.16,10),'#654834',lx,ly+.08,lz,0,0,0,'timber'),
          add(cyl(.095,.11,.94,10),'#52445b',lx,ly+.62,lz,0,0,0,'timber'),
          add(cyl(.16,.16,.07,10),'#d8ad52',lx,ly+1.11,lz,0,0,0,false),
          add(cyl(.22,.17,.36,10),'#f0cd7a',lx,ly+1.31,lz,0,0,0,false),
          orb(.14,'#ffeaa2',lx,ly+1.31,lz,false),
          add(cone(.28,.19,10),'#495367',lx,ly+1.58,lz,0,0,0,'roof'),
          orb(.05,'#e5bc5b',lx,ly+1.70,lz,false)
        ];
        lpParts.forEach(function(p){ p.rotation.x=0; p.rotation.z=0; });
        // Low stout mooring bollard + coiled rope at the outer pier corner
        var bxTip=px+pierF.nx*1.85+pierF.tx*.68, bzTip=pz+pierF.nz*1.85+pierF.tz*.68;
        post(.12,.42,'#6e4d37',bxTip,-.05,bzTip);
        add(cyl(.15,.15,.06,10),'#d9be88',bxTip,.38,bzTip,0,0,0,false);
        ropeCoil(px+pierF.nx*1.45-pierF.tx*.48,-.02,pz+pierF.nz*1.45-pierF.tz*.48);
        crate(px+pierF.nx*.55-pierF.tx*.52,-.05,pz+pierF.nz*.55-pierF.tz*.52,.78);
        // Shift moored sailboat +1.8 units seaward/outward into open water clear of pier corner, coiled rope & viewport edge
        var sbX=px+pierF.nx*2.65+pierF.tx*2.75, sbZ=pz+pierF.nz*2.65+pierF.tz*2.75;
        beachOceanPlaced.push([sbX,sbZ,3.0]);
        sailboat(sbX,sbZ,pierAng-.22,'#4d8898','#fff1cf',.78);
        // iter18 m5: Dress the thin lower-right sand around the wooden dock (660..990, 440..575) with grounded coastal
        // beach towels, sculpted spiral shells, starfish, a dockside crate/lantern & a foam-ringed coastal sandbar spit!
        var landX=px-pierF.nx*2.35, landZ=pz-pierF.nz*2.35;
        // 1. Dry dockside sand landing (south-west of pier entrance): seaside crate + glowing brass lantern + rope + spiral shell
        var clX=landX-pierF.tx*1.08+pierF.nx*.18, clZ=landZ-pierF.tz*1.08+pierF.nz*.18;
        if(outerClear(clX,clZ,3.4)){
          seasideCrateLantern(clX,-.30,clZ,pierAng+.24,.94);
          ropeCoil(clX+pierF.nx*.68-pierF.tx*.42,-.28,clZ+pierF.nz*.68-pierF.tz*.42);
          spiralShell(clX-pierF.nx*.58-pierF.tx*.18,-.30,clZ-pierF.nz*.58-pierF.tz*.18,pierAng+.7,.88,'#f7e2c2','#ee9880');
          starfish(clX-pierF.nx*.34+pierF.tx*.52,-.29,clZ-pierF.nz*.34+pierF.tz*.52,'#ee7b66');
        }
        // 2. Dry lower-right cove sand (cleanly between shifted umbrella & shore foam): lagoon-aqua striped beach towel + spiral shells + starfish
        var twX=landX-pierF.tx*2.35+pierF.nx*.35, twZ=landZ-pierF.tz*2.35+pierF.nz*.35;
        if(outerClear(twX,twZ,3.6)){
          beachTowel(twX,-.30,twZ,pierAng+.32,'#45a8b8','#fff3d6');
          spiralShell(twX+pierF.nx*.76+pierF.tx*.22,-.30,twZ+pierF.nz*.76+pierF.tz*.22,pierAng-.6,.92,'#f9e6c8','#e88c7a');
          spiralShell(twX-pierF.nx*.55-pierF.tx*.55,-.30,twZ-pierF.nz*.55-pierF.tz*.55,pierAng+1.4,.78,'#f3d6ae','#f0a488');
          starfish(twX+pierF.nx*.38-pierF.tx*.64,-.29,twZ+pierF.nz*.38-pierF.tz*.64,'#ff9668');
          pebble(twX+pierF.nx*.82-pierF.tx*.32,-.31,twZ+pierF.nz*.82-pierF.tz*.32,.22,'#e8c89c');
        }
        // 3. Dry sand north-west of pier entrance (between palm tree & pier): spiral shells + starfish + sea-grass
        var nwX=landX+pierF.tx*1.12-pierF.nx*.45, nwZ=landZ+pierF.tz*1.12-pierF.nz*.45;
        if(outerClear(nwX,nwZ,3.4)){
          spiralShell(nwX,-.30,nwZ,pierAng-.4,.92,'#f8e4c4','#eb927c');
          starfish(nwX-pierF.nx*.46+pierF.tx*.42,-.29,nwZ-pierF.nz*.46+pierF.tz*.42,'#ee7b66');
          seaGrass(nwX+pierF.nx*.34+pierF.tx*.58,-.30,nwZ+pierF.nz*.34+pierF.tz*.58,.52,'#79aa7d');
        }
        // 4. Lower-right coastal tide-sandbar spit right beside the outer wooden dock (framed cleanly inside 775..985, 495..575
        //    above "Meet Bok"/"Treasure map" HUD pills!) dressed with grounded towel, seaside crate/lantern, spiral shells & starfish
        var spX=px+pierF.nx*1.12-pierF.tx*1.76, spZ=pz+pierF.nz*1.12-pierF.tz*1.76;
        if(outerClear(spX,spZ,5.0)){
          beachOceanPlaced.push([spX,spZ,2.4]);
          smoothFoamRing(spX,waterY+.064,spZ,2.18,1.58);
          surfWaveHalo(spX,waterY+.056,spZ,2.10,1.52,5);
          smoothSandbar(spX,-.58,spZ,1.98,.84,1.44,'#efd6a0');
          // Seated cleanly atop the golden sandbar crown (crown top y ~= -0.16)
          var crownY=-.17;
          seasideCrateLantern(spX-pierF.nx*.62+pierF.tx*.16,crownY,spZ-pierF.nz*.62+pierF.tz*.16,pierAng-.32,.80);
          beachTowel(spX+pierF.nx*.36+pierF.tx*.08,crownY,spZ+pierF.nz*.36+pierF.tz*.08,pierAng+.14,'#f2b950','#fff3d6');
          spiralShell(spX+pierF.nx*1.02+pierF.tx*.28,crownY-.02,spZ+pierF.nz*1.02+pierF.tz*.28,pierAng+.9,.90,'#f9e6c8','#ee927d');
          spiralShell(spX-pierF.nx*.18-pierF.tx*.54,crownY-.02,spZ-pierF.nz*.18-pierF.tz*.54,pierAng-1.1,.82,'#f4d8b2','#e88c7a');
          starfish(spX+pierF.nx*.88-pierF.tx*.32,crownY-.01,spZ+pierF.nz*.88-pierF.tz*.32,'#ee7b66');
          starfish(spX-pierF.nx*.92-pierF.tx*.24,crownY-.02,spZ-pierF.nz*.92-pierF.tz*.24,'#ff9a68');
          pebble(spX+pierF.nx*.42+pierF.tx*.54,crownY-.03,spZ+pierF.nz*.42+pierF.tz*.54,.20,'#e4c394');
          seaGrass(spX+pierF.nx*1.12-pierF.tx*.08,crownY-.04,spZ+pierF.nz*1.12-pierF.tz*.08,.50,'#79aa7d');
        }
      }
      // CRIT-5: Populate the upper-right Beach ocean (580..1024, 0..410) verified with camNDC:
      // sunlit palm-topped foam-ringed sandbar islet + anchored red-and-white sailboat + red-white harbor buoy
      // + 2 bobbing corked message bottles + foam-ringed sea-stack rocks!
      var beachOuterPoly=main.map(function(s){ var f=frame(s); return [s.x+f.nx*6.5,s.z+f.nz*6.5]; });
      function inBeachLand(x,z){
        var ins=false;
        for(var a=0,b=beachOuterPoly.length-1;a<beachOuterPoly.length;b=a++){
          var xi=beachOuterPoly[a][0],zi=beachOuterPoly[a][1],xj=beachOuterPoly[b][0],zj=beachOuterPoly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) ins=!ins;
        }
        return ins;
      }
      function beachShoreDist(x,z){
        var md=Infinity;
        for(var a=0;a<beachOuterPoly.length;a++){
          var p1=beachOuterPoly[a], p2=beachOuterPoly[(a+1)%beachOuterPoly.length], vx=p2[0]-p1[0], vz=p2[1]-p1[1];
          var t=Math.max(0,Math.min(1,((x-p1[0])*vx+(z-p1[1])*vz)/(vx*vx+vz*vz||1)));
          md=Math.min(md,Math.hypot(x-(p1[0]+vx*t),z-(p1[1]+vz*t)));
        }
        return md;
      }
      // iter32 MIN 7: Open-water Bok anchor (-6.15, -22.55) synced with region-people.js (Driftwood Stall at -6.25, -15.55)
      var beachBokWaterX=-6.15, beachBokWaterZ=-22.55;
      function beachOceanClear(x,z,rad,shoreGap){
        if(inBeachLand(x,z) || beachShoreDist(x,z)<(shoreGap||2.6) || !outerClear(x,z,8.6)) return false;
        // Keep boats, islets, buoys & floating bottles generously clear of Bok in open turquoise bay water!
        if(Math.hypot(x-beachBokWaterX,z-beachBokWaterZ)<(rad+2.45)) return false;
        for(var q=0;q<beachOceanPlaced.length;q++){
          if(Math.hypot(x-beachOceanPlaced[q][0],z-beachOceanPlaced[q][1])<(rad+beachOceanPlaced[q][2])) return false;
        }
        return true;
      }
      function floatingBottle(x,z,rot){
        if(nearBeachNoBottleZone(x,z)) return;
        if((sp[0] && Math.hypot(x-sp[0].x,z-sp[0].z)<7.5) || (sp.length>1 && Math.hypot(x-sp[sp.length-1].x,z-sp[sp.length-1].z)<7.5)) return;
        var y=waterY+.04, ry=rot||.4;
        smoothFoamRing(x,waterY+.028,z,.82,.62);
        emitCached('beachFloatBottleIn', x, y+.10, z, ry, 1.22, function(){
          var bGrp=new T.Group(); bGrp.rotation.set(.18,0,-Math.PI*.42);
          bGrp.add(finish(mesh(cyl(.11,.11,.44,10),M('#fff0cc'),0,.36,0),'fabric'));
          bGrp.add(mesh(cyl(.12,.12,.065,10),M('#d84542'),0,.36,0));
          var tw=mesh(smoothTorus(.12,.022,6,12),M('#dfc080'),0,.96,0); tw.rotation.x=Math.PI/2; bGrp.add(finish(tw,'rope'));
          bGrp.add(finish(mesh(cyl(.115,.088,.21,10),M('#c48950'),0,1.15,0),'timber'));
          curRoot.add(bGrp);
        });
        addTranslucentBottleShell(x, y+.10, z, .18, ry, -Math.PI*.42, 1.22, '#48d8cc');
      }
      function beachSeaStack(x,z,scale,seed){
        // M2: Layered faceted tropical sandstone sea-stack rocks with unburied mossy cap & double curved surf-foam rings
        layeredSeaStack(x,z,scale||1,seed||0,{
          main:'#c49762', mid:'#d8b17b', base:'#9b7447', accent:'#dec69b',
          turf1:'#559e50', turf2:'#6cb55c', turf3:'#7ec268', withTuft:true, starCol:'#ee7b66'
        });
      }
      function placeBeachUpperRight(camIdx){
        var cands=[];
        for(var wx=bounds.minX-14;wx<=bounds.maxX+26;wx+=1.15) for(var wz=bounds.minZ-16;wz<=bounds.maxZ+26;wz+=1.15){
          if(inBeachLand(wx,wz) || beachShoreDist(wx,wz)<2.0 || !outerClear(wx,wz,8.2)) continue;
          var nd=camNDCAt(camIdx,wx,-.58,wz);
          if(nd.x<.14 || nd.x>.94 || nd.y<-.26 || nd.y>.82 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        var items=[
          {kind:'islet',   tx:.58, ty:.30, rad:2.8, shore:3.2, h:3.6, minX:.30, maxX:.84, minY:.02, maxY:.58},
          {kind:'boat',    tx:.28, ty:.48, rad:2.1, shore:2.8, h:3.2, minX:.16, maxX:.68, minY:.16, maxY:.66},
          {kind:'stack1',  tx:.84, ty:.24, rad:2.0, shore:2.6, h:2.2, minX:.62, maxX:.90, minY:-.04,maxY:.52},
          {kind:'buoy',    tx:.76, ty:-.02,rad:1.2, shore:2.2, h:1.4, minX:.46, maxX:.89, minY:-.22,maxY:.28},
          {kind:'bottle1', tx:.38, ty:.22, rad:1.0, shore:1.9, h:.6,  minX:.18, maxX:.74, minY:-.12,maxY:.46},
          {kind:'bottle2', tx:.56, ty:.02, rad:1.0, shore:1.9, h:.6,  minX:.32, maxX:.86, minY:-.22,maxY:.24},
          {kind:'stack2',  tx:.46, ty:.44, rad:1.7, shore:2.4, h:1.8, minX:.22, maxX:.74, minY:.22, maxY:.62}
        ];
        items.forEach(function(it,idx){
          var best=null;
          cands.forEach(function(c){
            if(c.nd.x<it.minX || c.nd.x>it.maxX || c.nd.y<it.minY || c.nd.y>it.maxY) return;
            if(!beachOceanClear(c.x,c.z,it.rad,it.shore)) return;
            if(!camInFrame(c.x,c.z,Math.min(1.6,it.rad*.7),it.h,-.60,.10,.93,-.28,.82,camIdx)) return;
            var sc=Math.hypot(c.nd.x-it.tx,c.nd.y-it.ty);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best) return;
          var ix=best.c.x, iz=best.c.z;
          beachOceanPlaced.push([ix,iz,it.rad]);
          if(it.kind==='islet'){
            smoothFoamRing(ix,waterY+.064,iz,3.25,2.76);
            surfWaveHalo(ix,waterY+.056,iz,3.18,2.70,camIdx);
            smoothSandbar(ix,-.62,iz,3.05,.96,2.58,'#ebd29c');
            if(beachPalmClear(ix-.32,iz+.15)){ palmTree(ix-.32,-.10,iz+.15,3+camIdx,.92); beachNoBottleZones.push([ix-.32,iz+.15,2.5]); }
            umbrella(ix+.95,-.12,iz-.42,'#e86f68','#fff1d0',.8,.80);
            starfish(ix+.55,.04,iz+.72,'#f07c65');
            pebble(ix-.95,-.02,iz-.65,.26,'#f2c5a8');
          }else if(it.kind==='boat'){
            var cr=camSetupAt(camIdx), bRot=Math.atan2(cr.fx,cr.fz)-.65;
            sailboat(ix,iz,bRot,'#d85753','#fff4dc',.86);
          }else if(it.kind==='buoy'){
            buoy(ix,iz,'#d85652');
          }else if(it.kind==='bottle1' || it.kind==='bottle2'){
            floatingBottle(ix,iz,idx*1.1+.5);
          }else{
            beachSeaStack(ix,iz,it.kind==='stack1'?.98:.78,idx+camIdx+2);
          }
        });
      }
      placeBeachUpperRight(beachFirstDeck ? beachFirstDeck.i : activeIdx);
      // Replace raw board.js orange/pink 'sponge' cylinder props on dry Beach sand (Critic MIN 1!)
      // with sculpted corked Sea-Glass Message-Bottle Clusters, and keep Driftwood Stall walkway clear!
      function hashBeachId(str){ var h=0; str=String(str||''); for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))|0; return Math.abs(h); }
      function buildBeachBottleCluster(s,ox,oy,oz){
        var g=new T.Group(); g.name='beach-bottle-cluster'; g.position.set(ox,Math.min(oy,-0.31),oz);
        function bp(geo,col,px,py,pz,rx,ry,rz,kind){
          var o=mesh(geo,M(col),px,py,pz);
          if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
          if(kind) finish(o,kind);
          g.add(o); return o;
        }
        // Soft golden sand mound & coiled twine base
        bp(cyl(.58,.72,.14,12),'#ebd2a0',0,.06,0,0,0,0,'sand');
        bp(smoothTorus(.44,.04,6,14),'#d8be88',0,.14,0,Math.PI/2,0,0,'rope');
        // 3 sculpted corked sea-glass bottles: opaque miniature parchment scroll + red wax ribbon + natural cork inside,
        // wrapped in glossy translucent sea-glass shells (opacity: 0.62) added after opaque bake!
        var clusterSpecs=[
          {x:-.12, z:-.06, sc:0.84, col:'#46d6ca', tilt:.08,  yaw:.3},
          {x:.26,  z:.12,  sc:0.68, col:'#3ca8dc', tilt:-.22, yaw:1.2},
          {x:-.26, z:.24,  sc:0.60, col:'#eba848', tilt:.18,  yaw:2.4}
        ];
        clusterSpecs.forEach(function(bt){
          var bg=new T.Group(); bg.position.set(bt.x,.12,bt.z); bg.rotation.set(0,bt.yaw,bt.tilt); bg.scale.setScalar(bt.sc);
          bg.add(mesh(cyl(.115,.115,.44,10),M('#fff0cc'),0,.36,0));
          bg.add(mesh(cyl(.124,.124,.065,10),M('#d84542'),0,.36,0));
          var tw=mesh(smoothTorus(.122,.022,6,12),M('#dfc080'),0,.96,0); tw.rotation.x=Math.PI/2; bg.add(tw);
          bg.add(mesh(cyl(.115,.088,.21,10),M('#c48950'),0,1.15,0));
          g.add(bg);
        });
        if(typeof reef3dBakeObject==='function' && view.rig && view.bake) reef3dBakeObject(g,view.rig,view.bake);
        if(typeof reef3dCompact==='function') reef3dCompact(g);
        // Add glossy translucent sea-glass bottle shells (opacity: 0.62) after opaque compaction so scrolls shine cleanly inside!
        clusterSpecs.forEach(function(bt){
          var gm=new T.Mesh(beachBottleLathe, new T.MeshPhongMaterial({
            color:bt.col, shininess:195, specular:'#ffffff',
            emissive:view.night?'#0e3238':'#14464c', emissiveIntensity:0.18,
            transparent:true, opacity:0.62, depthWrite:false, side:T.FrontSide
          }));
          gm.position.set(bt.x,.12,bt.z); gm.rotation.set(0,bt.yaw,bt.tilt); gm.scale.setScalar(bt.sc);
          gm.renderOrder=3;
          g.add(gm);
        });
        g.traverse(function(c){ c.userData.space=s.i; });
        g.userData.space=s.i;
        return g;
      }
      var beachPropSet=['story','clam','star','sponge'];
      if(sp && sp.length){
        sp.forEach(function(s){
          if(!s.obj || !s.obj.position) return;
          var pKind=(s.kind==='deck' && s.item && s.item.d) ? beachPropSet[hashBeachId(s.item.d.id)%beachPropSet.length] : s.kind;
          var dBok=Math.hypot(s.obj.position.x-(-6.35), s.obj.position.z-(-15.90));
          var dPool=Math.hypot(s.obj.position.x-(-6.54), s.obj.position.z-(-15.86));
          if(dBok<3.6 || dPool<3.4){
            var nxt=(typeof reef3dAhead==='function') ? reef3dAhead(sp, s.i) : main[(s.i+1)%main.length];
            var ox=(nxt ? nxt.x-s.x : 1), oz=(nxt ? nxt.z-s.z : 0), ol=Math.hypot(ox,oz)||1;
            var curSide=(s.side===1||s.side===-1) ? s.side : (s.x>(nxt?nxt.x:s.x-1)?1:-1);
            var oppSide=-curSide;
            var nxP=s.x-oz/ol*oppSide*2.3, nzP=s.z+ox/ol*oppSide*2.3;
            s.obj.position.set(nxP, s.y||0, nzP);
            s.side=oppSide;
          }
          if(pKind==='sponge' && view.scene && view.hitables){
            var old=s.obj, bx0=old.position.x, by0=old.position.y, bz0=old.position.z;
            view.scene.remove(old);
            var hIdx=view.hitables.indexOf(old); if(hIdx>=0) view.hitables.splice(hIdx,1);
            var bCl=buildBeachBottleCluster(s,bx0,Math.min(by0,-0.31),bz0);
            view.scene.add(bCl); view.hitables.push(bCl); s.obj=bCl;
          }
        });
      }
      // iter31: Crisper, larger (0.22-0.34u) sunlit turquoise shoreline surf-sparkle glints & layered surf ribbons
      // sweeping gracefully along Bottle Beach's inner turquoise cove & outer sunny ocean bays
      // (in `extras` with receiveShadow=false, depthWrite=false, zero obstacles, strictly clear of Bok, Jisu & tiles!)
      (function buildBeachSurfSparkleArcs(){
        var surfGrp=new T.Group(); surfGrp.name='beach-surf-sparkles';
        // Crisp 3D 4-point sunlit cross-star sparkle geometry (unit radius -> scaled to exact 0.22..0.34u!)
        // Combines a horizontal water-skimming 4-point star with a slender vertical flare so glints stay crisp at 1024x640!
        function makeSurfStarGeo(){
          var p=[], idx=[];
          function pushStarDiamond(rx,ry,rz){
            var b=p.length/3;
            p.push(
               0,  ry,  0,   // 0: top
               0, -ry,  0,   // 1: bottom
               rx,  0,  0,   // 2: +X tip
              -rx,  0,  0,   // 3: -X tip
               0,   0,  rz,  // 4: +Z tip
               0,   0, -rz   // 5: -Z tip
            );
            // Outward CCW 8-face octahedron
            idx.push(
              b+0,b+4,b+2, b+0,b+2,b+5, b+0,b+5,b+3, b+0,b+3,b+4,
              b+1,b+2,b+4, b+1,b+5,b+2, b+1,b+3,b+5, b+1,b+4,b+3
            );
          }
          // Long crisp horizontal X ray, Z ray, and sunlit vertical cross-flare ray
          pushStarDiamond(1.00, 0.16, 0.22);
          pushStarDiamond(0.22, 0.16, 1.00);
          pushStarDiamond(0.20, 0.68, 0.20);
          var g=new T.BufferGeometry();
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setIndex(idx); g.computeVertexNormals();
          return g;
        }
        var glintGeo=makeSurfStarGeo();
        var glintSheenGeo=new T.OctahedronGeometry(1.0,0);
        var glintMatW=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.98,depthWrite:false,fog:false});
        var glintMatGold=new T.MeshBasicMaterial({color:'#fffbe0',transparent:true,opacity:0.95,depthWrite:false,fog:false});
        var glintMatSheen=new T.MeshBasicMaterial({color:'#8ff8ff',transparent:true,opacity:view.night?0.36:0.46,depthWrite:false,fog:false});
        var arcMat1=new T.MeshBasicMaterial({color:'#f2ffff',transparent:true,opacity:view.night?0.42:0.62,depthWrite:false,side:T.DoubleSide,fog:false});
        var arcMat2=new T.MeshBasicMaterial({color:'#a4f8f8',transparent:true,opacity:view.night?0.34:0.46,depthWrite:false,side:T.DoubleSide,fog:false});
        var arcMat3=new T.MeshBasicMaterial({color:'#5ee8ee',transparent:true,opacity:view.night?0.26:0.34,depthWrite:false,side:T.DoubleSide,fog:false});
        function clearOfBeachIslets(wx,wz,pad){
          for(var bi=0;bi<beachOceanPlaced.length;bi++){
            var bp=beachOceanPlaced[bi];
            if(Math.hypot(wx-bp[0],wz-bp[1])<bp[2]+(pad||0.65)) return false;
          }
          return true;
        }
        function addSurfGlint(gx,gy,gz,rad,rotY,seed){
          // Keep glint radius strictly in 0.22..0.34u for crisp visible shimmer at 1024x640
          var rClamped=Math.max(0.22,Math.min(0.34,rad));
          var sh=new T.Mesh(glintSheenGeo,glintMatSheen);
          sh.position.set(gx,gy-0.02,gz);
          sh.scale.set(rClamped*1.28,0.035,rClamped*1.28);
          sh.rotation.y=rotY; sh.renderOrder=2;
          surfGrp.add(sh);
          var g=new T.Mesh(glintGeo,(seed%3===0)?glintMatGold:glintMatW);
          g.position.set(gx,gy+0.055,gz);
          g.scale.set(rClamped,rClamped*0.92,rClamped);
          g.rotation.y=rotY; g.renderOrder=3;
          surfGrp.add(g);
        }
        // Build a crescent-tapered scalloped surf ribbon sweeping smoothly along a 2D curve of shore-offset points
        function addSurfSparkleArc(pts2D,yH,maxW,mat,seed,withGlints){
          if(pts2D.length<3) return;
          var p=[], idx=[];
          for(var i=0;i<pts2D.length;i++){
            var u=i/(pts2D.length-1), taper=Math.sin(u*Math.PI);
            var prev=pts2D[Math.max(0,i-1)], next=pts2D[Math.min(pts2D.length-1,i+1)];
            var tx=next[0]-prev[0], tz=next[1]-prev[1], tl=Math.hypot(tx,tz)||1;
            var nx=-tz/tl, nz=tx/tl;
            var scall=1+0.22*Math.sin(u*Math.PI*6+seed);
            var hw=maxW*taper*scall*0.5;
            var cxA=pts2D[i][0], czA=pts2D[i][1];
            p.push(cxA-nx*hw, yH, czA-nz*hw);
            p.push(cxA+nx*hw, yH, czA+nz*hw);
            if(withGlints && i>0 && i<pts2D.length-1 && (i%2===0)){
              var gRad=0.22+0.11*taper+((i+seed)%3)*0.015;
              var gx=cxA+nx*hw*0.55, gz=czA+nz*hw*0.55;
              if(!inBeachLand(gx,gz) && outerClear(gx,gz,4.0) && Math.hypot(gx-beachBokWaterX,gz-beachBokWaterZ)>2.25){
                addSurfGlint(gx, yH+0.03, gz, gRad, u*3.8+seed, i+seed);
              }
            }
          }
          for(var j=0;j<pts2D.length-1;j++){
            var b=j*2;
            idx.push(b,b+2,b+3, b,b+3,b+1);
          }
          var gArc=new T.BufferGeometry();
          gArc.setAttribute('position',new T.Float32BufferAttribute(p,3));
          gArc.setIndex(idx); gArc.computeVertexNormals();
          var mArc=new T.Mesh(gArc,mat);
          mArc.renderOrder=2; mArc.receiveShadow=false; mArc.castShadow=false;
          surfGrp.add(mArc);
        }
        // Trace 3 layered sunlit surf-sparkle arcs along both the outer ocean shoreline (+1) and inner turquoise cove (-1)!
        var stepSpan=4;
        for(var bi=0;bi<main.length;bi+=stepSpan){
          [
            { side:1,  offs:[8.05, 8.95, 9.95], mats:[arcMat1,arcMat2,arcMat3], ws:[0.44,0.34,0.24] },
            { side:-1, offs:[5.25, 6.20, 7.20], mats:[arcMat1,arcMat2,arcMat3], ws:[0.40,0.30,0.22] }
          ].forEach(function(cfg,ci){
            for(var ly=0;ly<3;ly++){
              var pts=[];
              for(var k=0;k<=stepSpan;k++){
                var s0=main[(bi+k)%main.length], s1=main[(bi+k+1)%main.length];
                var f0=frame(s0), f1=frame(s1);
                var subN=(k<stepSpan)?2:1;
                for(var sub=0;sub<subN;sub++){
                  var t=sub/2;
                  var px=s0.x+(s1.x-s0.x)*t, pz=s0.z+(s1.z-s0.z)*t;
                  var fnx=f0.nx+(f1.nx-f0.nx)*t, fnz=f0.nz+(f1.nz-f0.nz)*t, fl=Math.hypot(fnx,fnz)||1;
                  fnx/=fl; fnz/=fl;
                  var waveOff=cfg.offs[ly]+0.32*Math.sin((bi+k+t)*1.3+ly*1.1);
                  var wx=px+cfg.side*fnx*waveOff, wz=pz+cfg.side*fnz*waveOff;
                  // Keep strictly clear of tiles, open-water Bok (-6.15, -22.55) & ripple ring, and beach sand land!
                  if(outerClear(wx,wz,4.2) && Math.hypot(wx-beachBokWaterX,wz-beachBokWaterZ)>2.15 && !inBeachLand(wx,wz)){
                    pts.push([wx,wz]);
                  }
                }
              }
              if(pts.length>=4){
                // Place crisp sunlit star glints along the clear turquoise bands (ly >= 1) so they pop against vivid turquoise!
                addSurfSparkleArc(pts, waterY+0.072-ly*0.004, cfg.ws[ly], cfg.mats[ly], bi*3+ci*7+ly, ly>=1);
              }
            }
          });
        }
        // Dedicated sunlit turquoise cove & outer-bay shimmer glints (0.23..0.34u) dancing cleanly across open turquoise shallows!
        for(var si=0;si<main.length;si++){
          var s=main[si], f=frame(s);
          [
            { side:-1, off:6.85+(si%3)*0.95, tanOff:((si%2)?0.75:-0.75), rad:0.24+(si%3)*0.045 },
            { side: 1, off:9.55+(si%3)*1.05, tanOff:((si%2)?-0.85:0.85), rad:0.25+((si+1)%3)*0.042 }
          ].forEach(function(spCfg,sci){
            var gx=s.x+spCfg.side*f.nx*spCfg.off+f.tx*spCfg.tanOff;
            var gz=s.z+spCfg.side*f.nz*spCfg.off+f.tz*spCfg.tanOff;
            if(outerClear(gx,gz,4.3) && Math.hypot(gx-beachBokWaterX,gz-beachBokWaterZ)>2.25 && !inBeachLand(gx,gz) && clearOfBeachIslets(gx,gz,0.75)){
              addSurfGlint(gx, waterY+0.088, gz, spCfg.rad, si*0.9+sci*1.7, si+sci);
              // Delicate twin companion sparkle offset gently across the sunlit ripple
              var gx2=gx+f.tx*0.62+spCfg.side*f.nx*0.42, gz2=gz+f.tz*0.62+spCfg.side*f.nz*0.42;
              if(!inBeachLand(gx2,gz2) && outerClear(gx2,gz2,4.1) && Math.hypot(gx2-beachBokWaterX,gz2-beachBokWaterZ)>2.25 && clearOfBeachIslets(gx2,gz2,0.70)){
                addSurfGlint(gx2, waterY+0.084, gz2, 0.22+((si+sci)%2)*0.028, si*1.3+2.1, si+sci+1);
              }
            }
          });
        }
        // Extra sunlit sparkle crescent halos hugging the visible inner turquoise cove & offshore sandbar islets
        beachOceanPlaced.forEach(function(bp,bpi){
          var ix=bp[0], iz=bp[1], r=bp[2]+1.25;
          var arcPts=[];
          for(var ai=0;ai<=8;ai++){
            var a=bpi*0.9+(ai/8)*Math.PI*1.15;
            var ax=ix+Math.cos(a)*r, az=iz+Math.sin(a)*r;
            if(Math.hypot(ax-beachBokWaterX,az-beachBokWaterZ)>2.15) arcPts.push([ax, az]);
          }
          if(arcPts.length>=4) addSurfSparkleArc(arcPts, waterY+0.070, 0.34, arcMat2, bpi*5+2, true);
        });
        compactGroupInPlace(surfGrp, true, null);
        extras.add(surfGrp);
      })();

      // =========================================================================
      // Iter 36 MAJ-7 & MIN-11 BOTTLE BEACH:
      // 1) COLOSSAL ENCLOSING CURVED SEA-GLASS BOTTLE WALLS & ARCHED AQUA-EMERALD GLASS RIBS
      //    rising cleanly up BOTH the left & right edges of the cove (open zenith over the island
      //    for Map zoom, ZERO harsh thin white horizontal sky streaks!), sweeping smoothly along an
      //    S-curve shoulder into the colossal flared glass bottle neck, thick rolled double-beaded lip,
      //    braided golden hemp rope collar + wax-sealed tag, & sculpted speckled wood-grain cork stopper!
      // 2) GLOSSY TRANSLUCENT CORKED SEA-GLASS BEACH MESSAGE BOTTLES (opacity: 0.62) with miniature
      //    rolled parchment scrolls & crimson wax ties visible inside!
      // =========================================================================
      (function buildGiantSeaGlassBottleWorld(){
        var botGrp=new T.Group();
        botGrp.name='beach-giant-glass-bottle';
        var isNight=!!view.night;

        // Colossal lying glass bottle frame enclosing the ENTIRE Bottle Beach island & cove!
        // Origin centered over the cove, longitudinal axis F angled slightly oblique so BOTH curved glass
        // walls sweep visibly up the left & right edges of 11-bottle-beach AND 17-jisu while the horizon
        // neck, braided rope collar, & sculpted cork read in iconic 3/4 profile cleanly below top HUD!
        var botRad = 11.5;
        var bScale = 1.0;
        var bMidX = bounds ? (bounds.minX + bounds.maxX) * 0.5 : -24.5;
        var bMidZ = bounds ? (bounds.minZ + bounds.maxZ) * 0.5 : -12.5;
        var F=new T.Vector3(0.95, 0.008, -0.31).normalize();
        var O=new T.Vector3(bMidX - 18.0, -1.2, bMidZ - 42.0);
        var U0=new T.Vector3(0, 1, 0);
        var R=new T.Vector3().crossVectors(F, U0).normalize();
        var U=new T.Vector3().crossVectors(R, F).normalize();

        function radiusAt(s){
          if(s <= 8){
            var bt = Math.max(0.05, s / 8.0);
            return botRad * Math.sin(bt * Math.PI * 0.5);
          }
          if(s <= 32) return botRad;
          if(s <= 46){
            var t=(s - 32) / 14.0;
            var sm=t * t * (3 - 2 * t);
            return botRad * (1 - sm) + 4.2 * sm;
          }
          return 4.2;
        }
        function vScaleAt(s){
          return 0.85;
        }
        function yOffAt(s){
          return 0.0;
        }
        function maxElevDegAt(s){
          // Full 90 deg closed cylindrical sea-glass bottle body, shoulder, & flared neck!
          return 90.0;
        }
        function bottlePt(s, side, degElev, rBoost){
          var rad=radiusAt(s) + (rBoost || 0);
          var el=degElev * Math.PI / 180;
          var vSc=vScaleAt(s);
          return new T.Vector3(
            O.x + F.x * s + R.x * (side * Math.cos(el) * rad) + U.x * (yOffAt(s) + Math.sin(el) * rad * vSc),
            O.y + F.y * s + R.y * (side * Math.cos(el) * rad) + U.y * (yOffAt(s) + Math.sin(el) * rad * vSc),
            O.z + F.z * s + R.z * (side * Math.cos(el) * rad) + U.z * (yOffAt(s) + Math.sin(el) * rad * vSc)
          );
        }

        // 1. Clean Closed Horizontal 3/4 Corked Sea-Glass Bottle on Far Turquoise Horizon (1 continuous LatheGeometry, zero internal seams!)
        var glassMat=new T.MeshPhongMaterial({
          color:isNight?'#16787e':'#1fa8a0',
          shininess:220, specular:isNight?'#b8f0f4':'#ffffff',
          emissive:isNight?'#0a3a40':'#0f5452', emissiveIntensity:isNight?0.26:0.28,
          transparent:true, opacity:isNight?0.72:0.68,
          depthWrite:true, side:T.DoubleSide, fog:false
        });
        var glassLipMat=new T.MeshPhongMaterial({
          color:isNight?'#48c4cc':'#6aece4',
          shininess:225, specular:'#ffffff',
          emissive:isNight?'#165860':'#1e7c7e', emissiveIntensity:0.30,
          transparent:true, opacity:isNight?0.80:0.76,
          depthWrite:true, side:T.DoubleSide, fog:false
        });
        var neckRoot=new T.Group();
        neckRoot.position.set(bMidX - 8.5, -1.35, bMidZ - 44.0);
        neckRoot.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), F);
        // Single continuous closed LatheGeometry profile seated physically in the turquoise horizon sea!
        var botPts=[
          new T.Vector2(0.0, 0.0),
          new T.Vector2(2.8, 0.4),
          new T.Vector2(5.4, 1.2),
          new T.Vector2(7.0, 2.2),
          new T.Vector2(7.6, 3.4),
          new T.Vector2(7.6, 21.0)
        ];
        for(var shi=1;shi<=10;shi++){
          var st=shi/10, sm=st*st*(3-2*st);
          botPts.push(new T.Vector2(7.6*(1-sm)+2.80*sm, 21.0+9.5*st));
        }
        botPts.push(
          new T.Vector2(2.80, 36.2),
          new T.Vector2(3.15, 36.8),
          new T.Vector2(3.32, 37.5),
          new T.Vector2(2.98, 38.0),
          new T.Vector2(2.48, 37.7)
        );
        botPts.reverse();
        var giantBotGeo=new T.LatheGeometry(botPts, 36);
        var giantBotMesh=new T.Mesh(giantBotGeo, glassMat);
        giantBotMesh.renderOrder=2;
        neckRoot.add(giantBotMesh);
        // 4 subtle arched translucent sea-glass hull ribs for sculpted glass silhouette
        [6.5, 11.5, 16.5, 20.5].forEach(function(ry){
          var rib=new T.Mesh(new T.TorusGeometry(7.68, 0.20, 8, 28, Math.PI * 1.15), glassLipMat);
          rib.position.set(0, ry, 0);
          rib.rotation.x=Math.PI * 0.5;
          rib.rotation.z=-Math.PI * 0.08;
          rib.renderOrder=3;
          neckRoot.add(rib);
        });
        // Rolled parchment treasure scroll + crimson silk ribbon visible inside the sea-glass bottle
        var bigScroll=new T.Mesh(new T.CylinderGeometry(2.9, 2.9, 12.5, 16), new T.MeshToonMaterial({color:isNight?'#cbb88e':'#f7e6bf', gradientMap:view.kit.grad, fog:false}));
        bigScroll.position.set(0, 12.5, 0); bigScroll.rotation.z=0.06;
        neckRoot.add(bigScroll);
        var bigRibbon=new T.Mesh(new T.CylinderGeometry(3.08, 3.08, 1.4, 16), new T.MeshToonMaterial({color:'#d64844', gradientMap:view.kit.grad, fog:false}));
        bigRibbon.position.set(0, 12.5, 0); bigRibbon.rotation.z=0.06;
        neckRoot.add(bigRibbon);
        // Rolled double-beaded glass mouth lip
        var lipRing=new T.Mesh(new T.TorusGeometry(3.22, 0.40, 12, 28), glassLipMat);
        lipRing.position.set(0, 37.4, 0); lipRing.rotation.x=Math.PI * 0.5; lipRing.renderOrder=4;
        neckRoot.add(lipRing);
        var neckCollar=new T.Mesh(new T.TorusGeometry(3.02, 0.28, 10, 26), glassLipMat);
        neckCollar.position.set(0, 36.1, 0); neckCollar.rotation.x=Math.PI * 0.5; neckCollar.renderOrder=4;
        neckRoot.add(neckCollar);
        // Tight flush braided hemp twine coils hugging the bottle neck (zero gaps!)
        var ropeHempMat=new T.MeshToonMaterial({color:isNight?'#9c7a4c':'#c69a5c', gradientMap:view.kit.grad, fog:false});
        var ropeHempAltMat=new T.MeshToonMaterial({color:isNight?'#7d5d34':'#9e7038', gradientMap:view.kit.grad, fog:false});
        [32.0, 32.48, 32.96, 33.44, 33.92].forEach(function(ry, ri){
          var rLoop=new T.Mesh(new T.TorusGeometry(2.96, 0.32, 10, 26), ri % 2 ? ropeHempAltMat : ropeHempMat);
          rLoop.position.set(0, ry, 0);
          rLoop.rotation.x=Math.PI * 0.5 + (ri % 2 ? 0.02 : -0.02);
          neckRoot.add(rLoop);
        });
        var rKnot=new T.Mesh(new T.SphereGeometry(0.44, 8, 6), ropeHempMat);
        rKnot.position.set(2.98, 33.2, 0.54); neckRoot.add(rKnot);

        // Sculpted Solid Cylindrical Tapered Natural Cork Stopper plugging the bottle mouth!
        var corkGrp=new T.Group();
        corkGrp.position.set(0.0, 38.4, 0.0);
        corkGrp.rotation.set(0.02, 0.03, -0.04);
        var corkGeo=new T.CylinderGeometry(3.24, 2.58, 4.8, 28, 6, false);
        var cPos=corkGeo.attributes.position, cCol=[];
        var cBase=new T.Color(isNight?'#9e6632':'#cf9350'),
            cHi=new T.Color(isNight?'#c48a52':'#e6b376'),
            cPore=new T.Color(isNight?'#5a3414':'#9a6232'),
            cMidDark=new T.Color(isNight?'#7a4a20':'#b3773e'),
            cWork=new T.Color();
        for(var ci=0;ci<cPos.count;ci++){
          var vx=cPos.getX(ci), vy=cPos.getY(ci), vz=cPos.getZ(ci);
          var ang=Math.atan2(vz, vx);
          var grain1=Math.sin(ang * 11 + vy * 0.65) * Math.cos(ang * 7 - vy * 1.1);
          var grain2=Math.sin(ang * 19 - vy * 2.1) * Math.sin(vy * 2.6 + ang * 5);
          var grain3=Math.sin(ang * 31 + vy * 4.3) * Math.cos(ang * 23 - vy * 3.7);
          cWork.copy(cBase);
          if(grain3 < -0.46) cWork.lerp(cPore, Math.min(1, (-grain3 - 0.46) * 2.3));
          else if(grain2 < -0.34) cWork.lerp(cPore, Math.min(1, (-grain2 - 0.34) * 1.9));
          else if(grain1 < -0.22) cWork.lerp(cMidDark, Math.min(1, (-grain1 - 0.22) * 1.25));
          else if(grain1 > 0.24) cWork.lerp(cHi, Math.min(1, (grain1 - 0.24) * 0.85));
          cCol.push(cWork.r, cWork.g, cWork.b);
        }
        corkGeo.setAttribute('color', new T.Float32BufferAttribute(cCol, 3));
        corkGeo.computeVertexNormals();
        corkGrp.add(new T.Mesh(corkGeo, new T.MeshToonMaterial({color:'#ffffff', vertexColors:true, gradientMap:view.kit.grad, fog:false})));
        var corkRingMat=new T.MeshToonMaterial({color:isNight?'#4a2810':'#6e3c16', gradientMap:view.kit.grad, fog:false});
        [-1.8, -0.5, 0.7, 1.8].forEach(function(cy){
          var rAt=2.55 + (cy / 4.4) * 0.60;
          var cRing=new T.Mesh(new T.TorusGeometry(rAt, 0.12, 6, 28), corkRingMat);
          cRing.position.y=cy; cRing.rotation.x=Math.PI * 0.5;
          corkGrp.add(cRing);
        });
        var corkBevel=new T.Mesh(new T.CylinderGeometry(2.60, 2.85, 0.55, 28, 1, false), new T.MeshToonMaterial({color:isNight?'#a67242':'#d4995a', gradientMap:view.kit.grad, fog:false}));
        corkBevel.position.y=2.45; corkGrp.add(corkBevel);
        var ringCols=isNight
          ? ['#c28c58','#6c421c','#b47e4a','#5a3614','#be8854','#744820']
          : ['#f4cca0','#9e6228','#e8b67a','#824c1c','#f0c48e','#965a24'];
        [2.55, 2.1, 1.65, 1.2, 0.8, 0.45].forEach(function(rr, ri){
          var capDisk=new T.Mesh(new T.CylinderGeometry(rr, rr, 0.10, 20), new T.MeshToonMaterial({color:ringCols[ri], gradientMap:view.kit.grad, fog:false}));
          capDisk.position.y=2.76 + ri * 0.014;
          corkGrp.add(capDisk);
        });
        neckRoot.add(corkGrp);
        botGrp.add(neckRoot);
        // Waterline surf-foam collar hugging the colossal sea-glass bottle where it meets the turquoise sea
        var botFoamMat=new T.MeshBasicMaterial({color:isNight?'#7ec8d2':'#e4fbfc',transparent:true,opacity:isNight?0.45:0.72,depthWrite:false,side:T.DoubleSide,fog:false});
        var botFoamRing=new T.Mesh(new T.RingGeometry(4.2, 11.4, 36), botFoamMat);
        botFoamRing.rotation.x=-Math.PI*0.5;
        botFoamRing.position.set(bMidX - 8.5 + F.x * 16.0, waterY + 0.08, bMidZ - 44.0 + F.z * 16.0);
        botFoamRing.scale.set(1.9, 0.82, 1.0);
        botFoamRing.rotation.z=-Math.atan2(F.z, F.x);
        botFoamRing.renderOrder=3;
        botGrp.add(botFoamRing);

        botGrp.traverse(function(o){ if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; } });
        extras.add(botGrp);

        // Compact all standalone translucent sea-glass beach bottles (from bottle(), messageBottle(), floatingBottle())
        // into ONE single glossy Phong draw call (opacity: 0.62) in extras!
        if(beachGlassGrp.children.length){
          beachGlassGrp.updateMatrixWorld(true);
          var totV=0, bMeshes=[];
          beachGlassGrp.traverse(function(m){ if(m.isMesh && m.geometry){ var c=meshVertCount(m); if(c){ totV+=c; bMeshes.push(m); } } });
          if(totV){
            var bB={ P:new Float32Array(totV*3), N:new Float32Array(totV*3), C:new Float32Array(totV*3), off:0 };
            for(var bmi=0;bmi<bMeshes.length;bmi++) writeMeshToBucket(bB, bMeshes[bmi], null, null);
            var bgOut=new T.BufferGeometry();
            bgOut.setAttribute('position', new T.BufferAttribute(bB.P, 3));
            bgOut.setAttribute('normal', new T.BufferAttribute(bB.N, 3));
            bgOut.setAttribute('color', new T.BufferAttribute(bB.C, 3));
            bgOut.computeBoundingSphere();
            var bgMesh=new T.Mesh(bgOut, beachBottleGlassMat);
            bgMesh.name='beach-translucent-bottles-merged';
            bgMesh.renderOrder=3; bgMesh.castShadow=false; bgMesh.receiveShadow=false;
            extras.add(bgMesh);
          }
        }

        // 5. MIN-11: Glossy Translucent Corked Sea-Glass Message-in-a-Bottle Fleet (opacity: 0.62)
        //    with Visible Miniature Rolled Parchment Scrolls + Crimson Ties + Natural Corks inside!
        //    (3 synced InstancedMeshes named *bottle* so Jisu encounter auto-culls foreground bottles cleanly!)
        var glowGrp=new T.Group(); glowGrp.name='beach-bottle-glows';
        var fleetGlassMat=new T.MeshPhongMaterial({
          color:'#ffffff', shininess:195, specular:'#ffffff',
          emissive:isNight?'#0e343c':'#144a52', emissiveIntensity:isNight?0.24:0.18,
          transparent:true, opacity:0.62, depthWrite:false, side:T.FrontSide
        });
        // Merge miniature rolled parchment scroll + crimson silk ribbon tie into 1 vertex-colored BufferGeometry
        var scrollTmp=new T.Group();
        scrollTmp.add(new T.Mesh(new T.CylinderGeometry(0.115, 0.115, 0.46, 10), M('#fff0cc')));
        scrollTmp.children[0].position.y=0.38;
        scrollTmp.add(new T.Mesh(new T.CylinderGeometry(0.125, 0.125, 0.068, 10), M('#da4644')));
        scrollTmp.children[1].position.y=0.38;
        scrollTmp.updateMatrixWorld(true);
        var scV=meshVertCount(scrollTmp.children[0]) + meshVertCount(scrollTmp.children[1]);
        var scB={ P:new Float32Array(scV*3), N:new Float32Array(scV*3), C:new Float32Array(scV*3), off:0 };
        writeMeshToBucket(scB, scrollTmp.children[0], null, null);
        writeMeshToBucket(scB, scrollTmp.children[1], null, null);
        var fleetScrollGeo=new T.BufferGeometry();
        fleetScrollGeo.setAttribute('position', new T.BufferAttribute(scB.P, 3));
        fleetScrollGeo.setAttribute('normal', new T.BufferAttribute(scB.N, 3));
        fleetScrollGeo.setAttribute('color', new T.BufferAttribute(scB.C, 3));
        fleetScrollGeo.computeBoundingSphere();
        var fleetScrollMat=new T.MeshToonMaterial({color:'#ffffff', vertexColors:true, gradientMap:view.kit.grad});

        // Merge natural tapered cork stopper + braided hemp neck collar into 1 vertex-colored BufferGeometry
        var corkTmp=new T.Group();
        var ckMesh=new T.Mesh(new T.CylinderGeometry(0.118, 0.088, 0.22, 10), M('#c48950'));
        ckMesh.position.y=1.15; corkTmp.add(ckMesh);
        var twMesh=new T.Mesh(new T.TorusGeometry(0.125, 0.022, 6, 12), M('#e0c080'));
        twMesh.position.y=0.96; twMesh.rotation.x=Math.PI/2; corkTmp.add(twMesh);
        corkTmp.updateMatrixWorld(true);
        var ckV=meshVertCount(ckMesh) + meshVertCount(twMesh);
        var ckB={ P:new Float32Array(ckV*3), N:new Float32Array(ckV*3), C:new Float32Array(ckV*3), off:0 };
        writeMeshToBucket(ckB, ckMesh, null, null);
        writeMeshToBucket(ckB, twMesh, null, null);
        var fleetCorkGeo=new T.BufferGeometry();
        fleetCorkGeo.setAttribute('position', new T.BufferAttribute(ckB.P, 3));
        fleetCorkGeo.setAttribute('normal', new T.BufferAttribute(ckB.N, 3));
        fleetCorkGeo.setAttribute('color', new T.BufferAttribute(ckB.C, 3));
        fleetCorkGeo.computeBoundingSphere();
        var fleetCorkMat=new T.MeshToonMaterial({color:'#ffffff', vertexColors:true, gradientMap:view.kit.grad});

        var lampAuraGeo=new T.SphereGeometry(0.42, 10, 8);
        var lampCoreGeo=new T.SphereGeometry(0.14, 8, 6);
        var lampHaloGeo=new T.RingGeometry(0.42, 0.82, 18); lampHaloGeo.rotateX(-Math.PI/2);
        var lampCoreMat=new T.MeshBasicMaterial({color:'#fff6c2',fog:false});
        var lampAuraMat=new T.MeshBasicMaterial({color:'#ffe484',transparent:true,opacity:isNight?0.34:0.20,depthWrite:false,fog:false});
        var fleetFoamMat=new T.MeshBasicMaterial({color:'#e8ffff',transparent:true,opacity:0.46,depthWrite:false,side:T.DoubleSide,fog:false});
        var shoreBottles=[], waterBottles=[];
        // Rich translucent sea-glass jewel tints (seafoam-aqua, ocean-cobalt, emerald, amber, turquoise, rose sea-glass)
        var paletteCols=['#46d6ca','#3ca8dc','#52d89e','#eba848','#62e2dc','#e2869c'];
        // Gather ~26 glowing translucent corked sea-glass shore bottles along clear sandy coves (strictly clear of Jisu!)
        main.forEach(function(s,i){
          var f=frame(s);
          [[1, 4.1+(i%3)*0.65, (i%2?1.2:-1.2)], [-1, 3.6+(i%2)*0.7, (i%2?-0.9:0.9)]].forEach(function(cfg,ci){
            if(shoreBottles.length>=26) return;
            var bx=s.x+cfg[0]*f.nx*cfg[1]+f.tx*cfg[2], bz=s.z+cfg[0]*f.nz*cfg[1]+f.tz*cfg[2];
            if(!outerClear(bx,bz,3.8) || nearBeachNoBottleZone(bx,bz) || Math.hypot(bx-(-6.25),bz-(-15.55))<3.2 || Math.hypot(bx-beachBokWaterX,bz-beachBokWaterZ)<3.0) return;
            if((sp[0] && Math.hypot(bx-sp[0].x,bz-sp[0].z)<7.5) || (sp.length>1 && Math.hypot(bx-sp[sp.length-1].x,bz-sp[sp.length-1].z)<7.5)) return;
            // Keep Jisu's immediate beach staging & close-up background cleanly proportioned (zero giant bottle crowding Jisu!)
            if(Math.hypot(bx-(-3.49),bz-(-5.46))<4.8) return;
            if(!inBeachLand(bx,bz)) return;
            if(shoreBottles.some(function(p){ return Math.hypot(p.x-bx,p.z-bz)<2.4; })) return;
            shoreBottles.push({x:bx, y:-.312, z:bz, sc:0.74+((i+ci)%3)*0.11, tilt:0.06, rot:(i*1.7+ci), col:paletteCols[(i+ci)%paletteCols.length]});
          });
        });
        // Gather ~28 bobbing floating translucent sea-glass message bottles across the open turquoise cove & bay water!
        for(var wi=0;wi<main.length;wi++){
          var ws=main[wi], wf=frame(ws);
          [
            [1,  9.2+(wi%4)*1.9, ((wi%2)?1.5:-1.5)],
            [-1, 6.8+(wi%3)*1.8, ((wi%2)?-1.4:1.4)]
          ].forEach(function(wcfg,wci){
            if(waterBottles.length>=28) return;
            var fx=ws.x+wcfg[0]*wf.nx*wcfg[1]+wf.tx*wcfg[2], fz=ws.z+wcfg[0]*wf.nz*wcfg[1]+wf.tz*wcfg[2];
            if((sp[0] && Math.hypot(fx-sp[0].x,fz-sp[0].z)<7.5) || (sp.length>1 && Math.hypot(fx-sp[sp.length-1].x,fz-sp[sp.length-1].z)<7.5)) return;
            if(inBeachLand(fx,fz) || nearBeachNoBottleZone(fx,fz) || !beachOceanClear(fx,fz,1.0,1.6)) return;
            if(waterBottles.some(function(p){ return Math.hypot(p.x-fx,p.z-fz)<2.6; })) return;
            waterBottles.push({x:fx, y:waterY+0.14, z:fz, sc:0.88+((wi+wci)%3)*0.16, rot:(wi*1.3+wci*2.1), col:paletteCols[(wi*2+wci)%paletteCols.length]});
          });
        }
        var allInst=shoreBottles.concat(waterBottles);
        if(allInst.length){
          var imScroll=new T.InstancedMesh(fleetScrollGeo, fleetScrollMat, allInst.length);
          var imCork=new T.InstancedMesh(fleetCorkGeo, fleetCorkMat, allInst.length);
          var imBot=new T.InstancedMesh(beachBottleLathe, fleetGlassMat, allInst.length);
          var dObj=new T.Object3D(), cObj=new T.Color();
          shoreBottles.forEach(function(b,bi){
            dObj.position.set(b.x, b.y, b.z);
            dObj.rotation.set(0, b.rot, b.tilt);
            dObj.scale.setScalar(b.sc);
            dObj.updateMatrix();
            imScroll.setMatrixAt(bi, dObj.matrix);
            imCork.setMatrixAt(bi, dObj.matrix);
            imBot.setMatrixAt(bi, dObj.matrix);
            imBot.setColorAt(bi, cObj.set(b.col));
            var cm=new T.Mesh(lampCoreGeo, lampCoreMat);
            cm.position.set(b.x, b.y+0.40*b.sc, b.z); cm.scale.setScalar(b.sc); glowGrp.add(cm);
            var am=new T.Mesh(lampAuraGeo, lampAuraMat);
            am.position.set(b.x, b.y+0.40*b.sc, b.z); am.scale.setScalar(b.sc); am.renderOrder=2; glowGrp.add(am);
          });
          waterBottles.forEach(function(b,wi){
            var idx=shoreBottles.length+wi;
            dObj.position.set(b.x, b.y, b.z);
            dObj.rotation.set(0.18, b.rot, Math.PI*0.42);
            dObj.scale.setScalar(b.sc);
            dObj.updateMatrix();
            imScroll.setMatrixAt(idx, dObj.matrix);
            imCork.setMatrixAt(idx, dObj.matrix);
            imBot.setMatrixAt(idx, dObj.matrix);
            imBot.setColorAt(idx, cObj.set(b.col));
            var fm=new T.Mesh(lampHaloGeo, fleetFoamMat);
            fm.position.set(b.x, waterY+0.068, b.z); fm.scale.setScalar(b.sc); fm.renderOrder=2; glowGrp.add(fm);
          });
          [imScroll, imCork, imBot].forEach(function(im){
            im.instanceMatrix.needsUpdate=true;
            im.frustumCulled=false;
          });
          if(imBot.instanceColor) imBot.instanceColor.needsUpdate=true;
          imScroll.name='beach-bottle-scrolls'; imScroll.renderOrder=1;
          imCork.name='beach-bottle-corks';     imCork.renderOrder=2;
          imBot.name='beach-bottle-fleet';      imBot.renderOrder=3;
          extras.add(imScroll);
          extras.add(imCork);
          extras.add(imBot);
        }
        compactGroupInPlace(glowGrp, true, null);
        glowGrp.traverse(function(o){ if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; } });
        extras.add(glowGrp);
      })();
    }
    function light(){
      // Colossal Sunlit Mario Party 8 Lighthouse Interior Rotunda & 3D Conical Helical Spiral Staircase.
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#233b4e':'#b6e3f0'); }
      var lh=sp.lighthouse || {
        cx:cx, cz:cz, rBottom:21.5, rTop:11.0, hTotal:22.0, turns:1.75, theta0:Math.PI*0.5,
        rWallBase:27.3, rWallTop:24.5, hWall:38.0, stairWidth:3.5, treadTopOffset:-0.28, floorY:-0.306,
        goalSpace:main.length-1, shopSpace:-1, bokGalleryY:22.0
      };
      var cxL=lh.cx||0, czL=lh.cz||0, rBottom=lh.rBottom||21.5, rTop=lh.rTop||11.0,
          hTotal=lh.hTotal||22.0, rWallBase=lh.rWallBase||(rBottom+5.8), rWallTop=lh.rWallTop||(rBottom+3.0),
          hWall=lh.hWall||38.0, floorY=lh.floorY!=null?lh.floorY:-0.306,
          treadOff=lh.treadTopOffset!=null?lh.treadTopOffset:-0.28;
      function rWallAt(y){
        var f=Math.max(0,Math.min(1,(y-floorY)/Math.max(1,hWall)));
        return rWallBase+(rWallTop-rWallBase)*f;
      }
      function polarPt(s){
        var dx=s.x-cxL, dz=s.z-czL, r=Math.hypot(dx,dz)||1;
        return { r:r, ang:Math.atan2(dz,dx), ux:dx/r, uz:dz/r, tx:dz/r, tz:-dx/r };
      }
      function spiralFrame(i){
        var s=main[i], p=polarPt(s);
        var prev=i>0?main[i-1]:s, next=i<main.length-1?main[i+1]:s;
        var dx=next.x-prev.x, dz=next.z-prev.z, len=Math.hypot(dx,dz)||1;
        return { r:p.r, ang:p.ang, nx:p.ux, nz:p.uz, tx:dx/len, tz:dz/len };
      }
      // Opening camera position (at spaces[0], synced with board.js Iter 28 cam ~ (-12.5, 4.4, 24.2))
      // so MIN 2 never places foreground columns in the viewing corridor.
      var s0L=main[0]||{x:cxL,z:czL+rBottom}, rad0=Math.atan2(s0L.z-czL,s0L.x-cxL);
      var openCamR=Math.min(rWallBase-2.3,Math.hypot(s0L.x-cxL,s0L.z-czL)+3.25);
      var openCamAng=rad0+13.0/Math.max(6,openCamR);
      var openCamX=cxL+Math.cos(openCamAng)*openCamR, openCamZ=czL+Math.sin(openCamAng)*openCamR;
      function segDistXZ(px,pz,ax,az,bx,bz){
        var vx=bx-ax, vz=bz-az, l2=vx*vx+vz*vz;
        if(l2<1e-6) return Math.hypot(px-ax,pz-az);
        var t=Math.max(0,Math.min(1,((px-ax)*vx+(pz-az)*vz)/l2));
        return Math.hypot(px-(ax+vx*t),pz-(az+vz*t));
      }
      function columnClearOfViewCorridor(x,z,topY){
        // Keep a wide, completely open foreground sightline from (-12.5, 24.2) across Shelly, Fountain, Hana & Bok.
        if(Math.hypot(x-openCamX,z-openCamZ)<17.5) return false;
        if(topY>5.0){
          if(segDistXZ(x,z,openCamX,openCamZ,s0L.x,s0L.z)<4.2) return false;
          if(segDistXZ(x,z,openCamX,openCamZ,cxL,czL)<4.2) return false;
          if(lh.hanaLanding && segDistXZ(x,z,openCamX,openCamZ,lh.hanaLanding.x,lh.hanaLanding.z)<4.0) return false;
          if(lh.shopLanding && segDistXZ(x,z,openCamX,openCamZ,lh.shopLanding.x,lh.shopLanding.z)<3.4) return false;
          // Omit tall Turn-2 columns across the front-facing rotunda arc so the opening spiral vista stays 100% open.
          if((z-czL)>6.0 && (x-cxL)>-16.5 && (x-cxL)<17.0) return false;
        }
        return true;
      }
      function columnClearOfSpaces(x,z,topY,minD){
        var need=minD||2.35;
        for(var si=0;si<sp.length;si++){
          var s=sp[si];
          // Skip spaces well above this column's top; check every space at or below topY - 0.8
          if((s.y||0)>topY-0.8) continue;
          if(Math.hypot(x-s.x,z-s.z)<need) return false;
        }
        // Keep central tidal pool fountain clear (r >= 6.45)
        if(Math.hypot(x-cxL,z-czL)<6.45) return false;
        // Keep Hana's mid-stair cantilevered crystal tidepool balcony clear of tall Turn-2 columns
        if(lh.hanaLanding && Math.hypot(x-lh.hanaLanding.x,z-lh.hanaLanding.z)<(lh.hanaLanding.radius||2.55)+1.15) return false;
        // MIN 2: Omit/cull any atrium column inside the opening camera-to-Shelly/atrium viewing corridor
        if(!columnClearOfViewCorridor(x,z,topY)) return false;
        return true;
      }
      // Helper: fluted classical ivory-limestone structural column grounded solidly at floorY up to capY
      function stoneColumn(x,z,capY,rad){
        var r=rad||0.34, h=capY-floorY;
        if(h<0.45) return;
        // Molded warm travertine stone base plinth seated flush on floorY
        add(cyl(r*1.52,r*1.68,0.22,12),'#b5a282',x,floorY+0.11,z,0,0,0,'stone');
        add(cyl(r*1.26,r*1.44,0.18,12),'#cab896',x,floorY+0.30,z,0,0,0,'stone');
        // Tapered classical warm travertine column shaft
        var shaftBot=floorY+0.38, shaftTop=capY-0.34, shaftH=Math.max(0.2,shaftTop-shaftBot);
        add(cyl(r*0.92,r*1.04,shaftH,12),'#d6c4a4',x,shaftBot+shaftH*0.5,z,0,0,0,'stone');
        // Decorative burnished-brass collar bands along tall atrium columns
        for(var by=shaftBot+3.8;by<shaftTop-1.6;by+=4.2){
          add(cyl(r*1.06,r*1.06,0.14,12),'#cfa244',x,by,z,0,0,0,false);
        }
        // Carved limestone capital & abacus supporting the corbel/deck cleanly
        add(cyl(r*1.42,r*0.96,0.22,12),'#cab896',x,capY-0.23,z,0,0,0,'stone');
        wornBox(r*3.0,0.16,r*3.0,'#b5a282',x,capY-0.06,z,'stone');
        addObstacle(x,z,r*1.55);
      }
      // iter31 MIN 7: Smooth curved classical cavetto/ogee coastal limestone corbel bracket oriented radially outward along (nx, nz)
      // (replaces blocky 3-tier rectangular stair-stepped boxes under the spiral stairs & balconies!)
      function smoothCorbelGeo(){
        var k='lhSmoothCorbel14', g=geos[k]; if(g) return g;
        // Side profile in (zRad, y): flat top at y=0 (-0.50..+0.50), outer wall back (+0.48), sweeping 14-segment curved
        // classical S-scroll / cavetto arch underside from cantilevered inner tip (-0.50, -0.14) down to foot (+0.26, -0.94).
        var sh=new T.Shape();
        sh.moveTo(-0.50, 0.0);
        sh.lineTo( 0.50, 0.0);
        sh.lineTo( 0.48,-0.88);
        sh.lineTo( 0.28,-0.94);
        var nCurve=14;
        for(var ci=1;ci<=nCurve;ci++){
          var t=ci/nCurve; // 0 at bottom foot (+0.28,-0.94) -> 1 at inner tip (-0.50,-0.14)
          // Smooth classical cavetto-cyma arch curve (graceful concave sweep with subtle scrolled lip at inner tip)
          var zc=0.28-0.78*Math.pow(t,0.82);
          var yc=-0.94+0.80*(1-Math.pow(1-t,1.85))+0.035*Math.sin(t*Math.PI*2);
          sh.lineTo(zc,yc);
        }
        sh.closePath();
        g=own(new T.ExtrudeGeometry(sh,{
          depth:0.78, steps:1,
          bevelEnabled:true, bevelThickness:0.06, bevelSize:0.045, bevelSegments:2,
          curveSegments:1
        }));
        g.translate(0,0,-0.39);
        // rotateY(-PI/2) maps shape +X (zRad) -> local +Z (aligned with (nx,nz) when rotation.y=atan2(nx,nz))
        g.rotateY(-Math.PI/2);
        g.computeVertexNormals();
        geos[k]=g; return g;
      }
      function stoneCorbel(x,yTop,z,nx,nz,wTan,dRad){
        var yaw=Math.atan2(nx,nz), w=wTan||1.05, d=dRad||2.5;
        // Crisp slender classical abacus cap flush under the oak stair carriage
        wornBox(w*1.04,0.14,d*1.02,'#dfd3bc',x,yTop-0.07,z,'stone').rotation.y=yaw;
        // Smooth curved classical limestone scroll bracket beneath the abacus
        var corb=add(smoothCorbelGeo(),'#cfc1a5',x,yTop-0.06,z,0,yaw,0,'stone');
        corb.scale.set(w*0.92,0.96,d);
      }
      // Shared glowing lantern garland & aura assets for extras (NOT passed to own(), zero disposal hazard!)
      var lhGarlandGrp=new T.Group(); lhGarlandGrp.name='lighthouse-stair-lantern-garlands';
      var lhBulbGeo=new T.SphereGeometry(0.088,10,8);
      var lhGlowGeo=new T.SphereGeometry(0.21,10,8);
      var lhPostGlowGeo=new T.SphereGeometry(0.32,10,8);
      var lhBulbMatA=new T.MeshBasicMaterial({color:'#fff3bc',fog:false});
      var lhBulbMatB=new T.MeshBasicMaterial({color:'#ffe07c',fog:false});
      var lhGlowMat=new T.MeshBasicMaterial({color:view.night?'#ffd97a':'#ffe48c',transparent:true,opacity:view.night?0.34:0.24,depthWrite:false,fog:false});
      var lhCapGeo=new T.ConeGeometry(0.11,0.085,6);
      var lhCapMat=new T.MeshBasicMaterial({color:'#c99738',fog:false});
      extras.add(lhGarlandGrp);
      // Helper: turned dark-oak & burnished-brass handrail newel post with optional warm lantern
      function railPost(x,yBase,z,withLantern){
        add(cyl(0.11,0.14,0.12,8),'#5e3e26',x,yBase+0.06,z,0,0,0,'timber');
        add(cyl(0.064,0.078,0.96,8),'#754d30',x,yBase+0.56,z,0,0,0,'timber');
        add(cyl(0.088,0.088,0.06,8),'#d6a84a',x,yBase+0.92,z,0,0,0,false);
        if(withLantern){
          add(cyl(0.13,0.11,0.24,8),'#f5d784',x,yBase+1.14,z,0,0,0,false);
          smoothOrb(0.085,'#fff4c2',x,yBase+1.14,z,false);
          add(cone(0.18,0.15,8),'#c85c50',x,yBase+1.33,z,0,0,0,'roof');
          smoothOrb(0.045,'#e5be5e',x,yBase+1.43,z,false);
          var pGlow=new T.Mesh(lhPostGlowGeo,lhGlowMat);
          pGlow.position.set(x,yBase+1.14,z); pGlow.renderOrder=2;
          lhGarlandGrp.add(pGlow);
        } else {
          smoothOrb(0.095,'#e4bc5c',x,yBase+1.09,z,false);
        }
      }
      // Helper: continuous brass top handrail + warm hemp-rope mid-rail + draped warm golden glowing lantern garlands
      var lhSpanSeq=0;
      function railSpan(x1,y1,z1,x2,y2,z2){
        var dx=x2-x1, dy=y2-y1, dz=z2-z1, len=Math.hypot(dx,dy,dz);
        if(len<0.08) return;
        lhSpanSeq++;
        // Burnished brass top bar
        limb(x1,y1+0.96,z1,dx,dy,dz,len,0.052,0.052,'#d8ab4c',false);
        // Warm nautical hemp-rope mid-rail (2-segment gentle catenary sag)
        var mx=(x1+x2)*0.5, my=(y1+y2)*0.5+0.47, mz=(z1+z2)*0.5;
        var l1=Math.hypot(mx-x1,my-(y1+0.55),mz-z1), l2=Math.hypot(x2-mx,(y2+0.55)-my,z2-mz);
        if(l1>0.05) limb(x1,y1+0.55,z1,mx-x1,my-(y1+0.55),mz-z1,l1,0.036,0.036,'#dec48d','rope');
        if(l2>0.05) limb(mx,my,mz,x2-mx,(y2+0.55)-my,z2-mz,l2,0.036,0.036,'#dec48d','rope');
        // iter30 Beyond-MP8: Warm golden glowing fairy-lantern garland draped cleanly beneath the brass top rail
        if(len>=1.15){
          var gSag=Math.min(0.24,len*0.095), gSteps=4, pxG=x1, pyG=y1+0.93, pzG=z1;
          for(var gs=1;gs<=gSteps;gs++){
            var gt=gs/gSteps, nxG=x1+dx*gt, nyG=y1+dy*gt+0.93-Math.sin(gt*Math.PI)*gSag, nzG=z1+dz*gt;
            var gl=Math.hypot(nxG-pxG,nyG-pyG,nzG-pzG);
            if(gl>0.04) limb(pxG,pyG,pzG,nxG-pxG,nyG-pyG,nzG-pzG,gl,0.018,0.018,'#c99c42',false);
            pxG=nxG; pyG=nyG; pzG=nzG;
          }
          var beadTs=len>=2.1?[0.24,0.50,0.76]:[0.34,0.66];
          for(var bi=0;bi<beadTs.length;bi++){
            var bt=beadTs[bi], sag=Math.sin(bt*Math.PI)*gSag;
            var bx=x1+dx*bt, by=y1+dy*bt+0.93-sag-0.11, bz=z1+dz*bt;
            var cap=new T.Mesh(lhCapGeo,lhCapMat);
            cap.position.set(bx,by+0.09,bz); lhGarlandGrp.add(cap);
            var bulb=new T.Mesh(lhBulbGeo,((lhSpanSeq+bi)%2===0)?lhBulbMatA:lhBulbMatB);
            bulb.position.set(bx,by,bz); lhGarlandGrp.add(bulb);
            var halo=new T.Mesh(lhGlowGeo,lhGlowMat);
            halo.position.set(bx,by,bz); halo.renderOrder=2; lhGarlandGrp.add(halo);
          }
        }
      }

      // =========================================================================
      // 1. CLEAN NON-SHADOW-RECEIVING BAKED ROTUNDA STONE FLOOR (IN `extras`!)
      //    WARM CREAM/SANDSTONE CONCENTRIC PAVING + FURNISHED LOWER-LEFT LOUNGE
      // =========================================================================
      (function buildRotundaFloor(){
        // MAJ 1 + MIN 1: Build rotundaFloor as a separate non-receiveShadow baked warm-cream/sandstone
        // concentric stone paving mesh in `extras` (NOT merged into shadow-receiving `merged`), with
        // ZERO coplanar foundation drum overlap and ZERO stray red/blue compass rays!
        var rotundaFloor=new T.Group();
        rotundaFloor.name='lighthouse-rotunda-floor';
        var segs=64, rIn=5.55, rOut=rWallBase+2.2;
        var rings=[rIn,6.45,7.65,9.35,11.15,11.72,14.35,16.78,17.36,20.65,rBottom+1.8,rWallBase+0.4,rOut];
        var ringCols=['#e9dec6','#d6c4a2','#f0e5ce','#e5d6b8','#ccb994','#e5d6b8','#f0e5ce','#ccb994','#e7d8bb','#dfd0b2','#e6d8bc','#d8c8a9','#cfc0a2'];
        var fPos=[], fCol=[], fIdx=[], cTmp=new T.Color();
        for(var ri=0;ri<rings.length;ri++){
          var rr=rings[ri], baseC=new T.Color(ringCols[ri%ringCols.length]);
          for(var ai=0;ai<segs;ai++){
            var a=ai*Math.PI*2/segs, wx=cxL+Math.cos(a)*rr, wz=czL+Math.sin(a)*rr;
            fPos.push(wx,floorY,wz);
            // Subtle warm stone block checkerboard + sunlit window bounce + soft architectural perimeter shading
            var blockVar=((ai%4)<2)?1.015:0.968;
            var sunPool=0.955+0.065*Math.cos(a-0.35)+0.030*(1-ri/(rings.length-1));
            var wallShade=(ri>=rings.length-2)?0.93:1.0;
            cTmp.copy(baseC).multiplyScalar(blockVar*sunPool*wallShade);
            fCol.push(Math.min(1,cTmp.r),Math.min(1,cTmp.g),Math.min(1,cTmp.b));
          }
        }
        for(var ri2=0;ri2<rings.length-1;ri2++){
          var b0=ri2*segs, b1=(ri2+1)*segs;
          for(var ai2=0;ai2<segs;ai2++){
            var an=(ai2+1)%segs;
            // Upward (+Y) CCW winding
            fIdx.push(b0+ai2,b0+an,b1+an, b0+ai2,b1+an,b1+ai2);
          }
        }
        var fGeo=new T.BufferGeometry();
        fGeo.setAttribute('position',new T.Float32BufferAttribute(fPos,3));
        fGeo.setAttribute('color',new T.Float32BufferAttribute(fCol,3));
        fGeo.setIndex(fIdx); fGeo.computeVertexNormals();
        var useBake=(typeof reef3dBakeObject==='function' && view.rig && view.bake);
        var fMat=useBake
          ? new T.MeshLambertMaterial({color:'#ffffff',vertexColors:true})
          : new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true});
        var fMesh=new T.Mesh(fGeo,fMat);
        fMesh.receiveShadow=false; fMesh.castShadow=false;
        fMesh.userData.reefGround=true; fMesh.userData.reefStructure='lighthouse-floor';
        rotundaFloor.add(fMesh);
        // Warm inlaid burnished-brass & sandstone concentric plaza rings (replaces old red/blue compass rays!)
        // Flattened gently (scale.z=0.22 in rotated space -> flush height <= 0.028) so rings tuck cleanly under the compass rose medallion!
        [
          [6.45,0.070,'#d6aa4e',0.012],
          [9.35,0.055,'#cbb896',0.010],
          [11.44,0.065,'#d4a94f',0.012],
          [14.35,0.052,'#cbb896',0.010],
          [17.07,0.062,'#d4a94f',0.012],
          [20.65,0.050,'#c9b692',0.010]
        ].forEach(function(rk){
          var rg=new T.TorusGeometry(rk[0],rk[1],6,64);
          var rm=useBake ? new T.MeshLambertMaterial({color:rk[2]}) : new T.MeshBasicMaterial({color:rk[2]});
          var rObj=new T.Mesh(rg,rm);
          rObj.position.set(cxL,floorY+rk[3],czL); rObj.rotation.x=Math.PI/2; rObj.scale.set(1,1,0.22);
          rObj.receiveShadow=false; rObj.castShadow=false; rObj.userData.reefGround=true;
          rotundaFloor.add(rObj);
        });
        (function addLighthouseSunSheens(){
          var lsbt=getCabinSunbeamTex(T), lSheenMat=new T.MeshBasicMaterial({
            color:view.night?'#84c2ee':'#fff4cc', map:lsbt.sheenTex,
            transparent:true, opacity:view.night?0.10:0.26,
            blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false
          });
          var lSheenGeo=new T.PlaneGeometry(7.2, 9.6); lSheenGeo.rotateX(-Math.PI/2);
          [[cxL+2.8, czL+14.0, -0.28], [cxL-4.2, czL+8.5, 0.24], [cxL+5.5, czL+3.2, -0.35]].forEach(function(sp3){
            var sm=new T.Mesh(lSheenGeo, lSheenMat);
            sm.position.set(sp3[0], floorY+0.014, sp3[1]);
            sm.rotation.y=sp3[2];
            sm.receiveShadow=false; sm.castShadow=false; sm.userData.reefGround=true;
            extras.add(sm);
          });
        })();
        // MIN 4: Inlaid decorative brass-and-turquoise Compass Rose Mosaic Medallion in the bottom-center
        // rotunda floor zone (inside non-receiveShadow `rotundaFloor` so ZERO shadow acne & ZERO Z-fighting!).
        (function buildCompassMedallion(){
          var mx=cxL+1.6, mz=czL+18.4, mR=2.95, mYaw=0.26;
          var medGrp=new T.Group();
          medGrp.name='lighthouse-compass-medallion';
          medGrp.position.set(mx,floorY,mz);
          medGrp.rotation.y=mYaw;
          function medMat(col){
            return useBake ? new T.MeshLambertMaterial({color:col}) : new T.MeshBasicMaterial({color:col});
          }
          function medAdd(geo,col,px,py,pz,rx,ry,rz,sx,sy,sz){
            var o=new T.Mesh(geo,medMat(col));
            o.position.set(px||0,py||0,pz||0);
            if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
            if(sx!==undefined) o.scale.set(sx,sy,sz);
            o.receiveShadow=false; o.castShadow=false; o.userData.reefGround=true;
            medGrp.add(o); return o;
          }
          // 1. Flush beveled sandstone-ivory outer mosaic bed (clears floor rings at +0.028 cleanly!)
          medAdd(new T.CylinderGeometry(mR+0.12,mR+0.20,0.032,48),'#eadec4',0,0.016,0);
          // 2. Deep coastal-teal mosaic inlay field & scalloped turquoise decorative band
          medAdd(new T.CylinderGeometry(mR-0.06,mR-0.04,0.038,48),'#2c7c8d',0,0.019,0);
          medAdd(new T.CylinderGeometry(mR-0.30,mR-0.28,0.042,48),'#45a6b5',0,0.021,0);
          // 16 alternating inlaid cream-stone & burnished-brass perimeter mosaic degree ticks
          for(var ti=0;ti<16;ti++){
            var ta=ti*Math.PI*2/16, isCard=(ti%4===0), isDiag=(ti%2===0);
            var tR=mR-0.19, tLen=isCard?0.42:(isDiag?0.34:0.22), tWid=isCard?0.17:(isDiag?0.13:0.09);
            var tCol=isCard?'#ecc462':(isDiag?'#f5ead2':'#d8ae52');
            medAdd(new T.BoxGeometry(tWid,0.020,tLen),tCol,Math.sin(ta)*tR,0.035,Math.cos(ta)*tR,0,ta,0);
          }
          // 3. Inner warm sandstone-ivory mosaic plaza disc + concentric coastal-turquoise & brass rings
          medAdd(new T.CylinderGeometry(mR-0.74,mR-0.72,0.045,48),'#f2e7cf',0,0.0225,0);
          medAdd(new T.CylinderGeometry(1.16,1.18,0.048,36),'#3d9cab',0,0.024,0);
          medAdd(new T.CylinderGeometry(0.92,0.94,0.050,36),'#efe3c8',0,0.025,0);
          // Flattened burnished-brass mosaic bezel rings
          [
            [mR+0.02,0.088,'#dab052',0.040,0.34],
            [mR-0.74,0.062,'#d4a648',0.044,0.32],
            [1.17,0.046,'#dab052',0.047,0.32]
          ].forEach(function(br){
            medAdd(new T.TorusGeometry(br[0],br[1],8,48),br[2],0,br[3],0,Math.PI/2,0,0,1,1,br[4]);
          });
          // 4. Sculpted 8-point two-tone Compass Rose Star (4 tall gold/bronze cardinals + 4 turquoise/teal diagonals)
          function starHalfGeo(len,halfW,yBot,yMid,yTip){
            // Right (+X) and Left (-X) beveled halves with strict upward (+Y) CCW winding
            var gR=new T.BufferGeometry(), gL=new T.BufferGeometry();
            gR.setAttribute('position',new T.Float32BufferAttribute([0,yMid,0, 0,yTip,len, halfW,yBot,len*0.24],3));
            gR.computeVertexNormals();
            gL.setAttribute('position',new T.Float32BufferAttribute([0,yMid,0, -halfW,yBot,len*0.24, 0,yTip,len],3));
            gL.computeVertexNormals();
            return [gR,gL];
          }
          var cardH=starHalfGeo(mR-0.28,0.42,0.046,0.082,0.050);
          var diagH=starHalfGeo(mR-0.88,0.32,0.045,0.072,0.048);
          // 4 diagonal intercardinal rays (bright aqua-turquoise & deep coastal teal)
          for(var di=0;di<4;di++){
            var da=di*Math.PI*0.5+Math.PI*0.25;
            medAdd(diagH[0],'#56cad2',0,0,0,0,da,0);
            medAdd(diagH[1],'#2a7889',0,0,0,0,da,0);
          }
          // 4 cardinal rays (sunlit burnished gold & warm antique bronze)
          for(var ci=0;ci<4;ci++){
            var ca=ci*Math.PI*0.5;
            medAdd(cardH[0],'#f0ca68',0,0,0,0,ca,0);
            medAdd(cardH[1],'#b68534',0,0,0,0,ca,0);
          }
          // 5. Domed burnished-brass central compass boss + luminous turquoise sea-glass cabochon
          medAdd(new T.CylinderGeometry(0.56,0.62,0.052,24),'#d8aa4a',0,0.054,0);
          medAdd(new T.TorusGeometry(0.54,0.048,8,24),'#f0ca68',0,0.078,0,Math.PI/2,0,0,1,1,0.42);
          medAdd(new T.CylinderGeometry(0.36,0.42,0.036,24),'#49bcc7',0,0.082,0);
          medAdd(new T.SphereGeometry(0.32,18,10,0,Math.PI*2,0,Math.PI*0.5),'#7ef0ef',0,0.082,0,0,0,0,1,0.34,1);
          compactGroupInPlace(medGrp, true, null);
          rotundaFloor.add(medGrp);
        })();
        // iter30 MIN fix (07-lighthouse middle floor 430-720, 380-560):
        // Ornate inlaid turquoise-and-gold floor scroll band + radial bridge runners + astrolabe sundial mosaic plaza
        // built strictly inside non-receiveShadow `rotundaFloor` (zero shadow acne, zero Z-fighting!) bridging
        // the central crystal tidal pool fountain, Compass Rose Medallion, and Hana's balcony pier!
        var astroX=cxL+7.8, astroZ=czL+15.0;
        (function buildFloorScrollBandAndRunners(){
          var scGrp=new T.Group();
          scGrp.name='lighthouse-floor-scroll-band';
          function scMat(col){
            return useBake ? new T.MeshLambertMaterial({color:col}) : new T.MeshBasicMaterial({color:col});
          }
          function scAdd(geo,col,px,py,pz,rx,ry,rz,sx,sy,sz){
            var o=new T.Mesh(geo,scMat(col));
            o.position.set(px||0,py||0,pz||0);
            if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
            if(sx!==undefined) o.scale.set(sx,sy,sz);
            o.receiveShadow=false; o.castShadow=false; o.userData.reefGround=true;
            scGrp.add(o); return o;
          }
          // Helper: flat inlaid annular ring strip (strict +Y CCW winding, zero shadow acne)
          function makeRingBandGeo(r0,r1,segsB,yH,waveAmp,waveFreq){
            var p=[], idx=[], n=segsB||72;
            for(var i=0;i<=n;i++){
              var a=i*Math.PI*2/n, wv=waveAmp?Math.sin(a*(waveFreq||24))*waveAmp:0;
              var rr0=r0+wv, rr1=r1+wv;
              p.push(Math.cos(a)*rr0, yH, Math.sin(a)*rr0);
              p.push(Math.cos(a)*rr1, yH, Math.sin(a)*rr1);
            }
            for(var j=0;j<n;j++){
              var b=j*2;
              idx.push(b, b+2, b+3, b, b+3, b+1);
            }
            var g=new T.BufferGeometry();
            g.setAttribute('position',new T.Float32BufferAttribute(p,3));
            g.setIndex(idx); g.computeVertexNormals();
            return g;
          }
          // 1. Grand concentric inlaid turquoise-and-gold mosaic scroll band sweeping across r = 13.6..16.3
          //    (right through the middle cream rotunda floor zone 430-720, 380-560!)
          scAdd(makeRingBandGeo(13.55,16.35,84,floorY+0.008,0,0),'#2b7b8c',cxL,0,czL);
          scAdd(makeRingBandGeo(13.86,16.04,84,floorY+0.011,0,0),'#42a3b2',cxL,0,czL);
          scAdd(makeRingBandGeo(14.32,15.58,84,floorY+0.013,0,0),'#efe4cb',cxL,0,czL);
          // Wavy inlaid aqua sea-scroll ribbon undulating cleanly along the sandstone scroll channel
          scAdd(makeRingBandGeo(14.74,15.16,96,floorY+0.016,0.20,24),'#2e8898',cxL,0,czL);
          scAdd(makeRingBandGeo(14.87,15.03,96,floorY+0.018,0.20,24),'#e6be5e',cxL,0,czL);
          // Flattened burnished-brass border fillets framing both edges of the inlaid scroll band
          [
            [13.55,0.068,'#dab052',0.016],
            [14.32,0.044,'#c6963c',0.016],
            [15.58,0.044,'#c6963c',0.016],
            [16.35,0.068,'#dab052',0.016]
          ].forEach(function(br){
            scAdd(new T.TorusGeometry(br[0],br[1],6,72),br[2],cxL,floorY+br[3],czL,Math.PI/2,0,0,1,1,0.26);
          });
          // 24 Repeating inlaid gilded nautical diamond & turquoise scroll rosettes nested around the scroll band
          var dTileGeo=new T.BoxGeometry(0.42,0.016,0.42), dCoreGeo=new T.CylinderGeometry(0.14,0.14,0.020,10);
          var scrollArcGeo=new T.TorusGeometry(0.28,0.042,6,14,Math.PI);
          for(var si=0;si<24;si++){
            var sa=si*Math.PI*2/24, rMid=14.95;
            var rx=cxL+Math.cos(sa)*rMid, rz=czL+Math.sin(sa)*rMid;
            // Skip right underneath the compass medallion footprint (mx=1.6, mz=18.4) so zero overlap
            if(Math.hypot(rx-(cxL+1.6),rz-(czL+18.4))<3.35) continue;
            scAdd(dTileGeo,si%2?'#ecc462':'#3898a8',rx,floorY+0.015,rz,0,sa+Math.PI*0.25,0);
            scAdd(dCoreGeo,si%2?'#6fe8e8':'#f6e5b6',rx,floorY+0.018,rz);
            // Flanking golden scroll-curl flourishes bridging adjacent rosettes
            var saCurl=sa+Math.PI/24, cxC=cxL+Math.cos(saCurl)*rMid, czC=czL+Math.sin(saCurl)*rMid;
            if(Math.hypot(cxC-(cxL+1.6),czC-(czL+18.4))>=3.35){
              scAdd(scrollArcGeo,'#d9ad4e',cxC,floorY+0.017,czC,Math.PI/2,0,-saCurl,1,1,0.28);
            }
          }
          // 2. Ornate inlaid turquoise-and-gold floor scroll bridge runners directly linking:
          //    (a) Central Crystal Fountain <-> Astrolabe Sundial Plaza
          //    (b) Compass Rose Medallion <-> Astrolabe Sundial Plaza
          //    (c) Astrolabe Sundial Plaza <-> Hana's Balcony Pier
          function inlaidScrollRunner(x1,z1,x2,z2,wBand){
            var dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz);
            if(len<1.0) return;
            var mx=(x1+x2)*0.5, mz=(z1+z2)*0.5, yaw=Math.atan2(dx,dz), w=wBand||1.18;
            scAdd(new T.BoxGeometry(w+0.20,0.014,len),'#dab052',mx,floorY+0.019,mz,0,yaw,0);
            scAdd(new T.BoxGeometry(w,0.017,len-0.06),'#2e8394',mx,floorY+0.021,mz,0,yaw,0);
            scAdd(new T.BoxGeometry(w*0.58,0.020,len-0.14),'#4eb4c0',mx,floorY+0.023,mz,0,yaw,0);
            scAdd(new T.BoxGeometry(w*0.16,0.022,len-0.20),'#f0ca68',mx,floorY+0.025,mz,0,yaw,0);
            var nDots=Math.max(2,Math.floor(len/1.35));
            for(var di=1;di<=nDots;di++){
              var t=di/(nDots+1), px=x1+dx*t, pz=z1+dz*t;
              scAdd(dTileGeo,'#f2ce6e',px,floorY+0.027,pz,0,yaw+Math.PI*0.25,0,0.68,1,0.68);
              scAdd(dCoreGeo,'#7ef2ee',px,floorY+0.029,pz,0,0,0,0.85,1,0.85);
            }
          }
          // Runner A: Central fountain rim toward Astrolabe plaza
          var fDirX=astroX-cxL, fDirZ=astroZ-czL, fDirL=Math.hypot(fDirX,fDirZ)||1;
          inlaidScrollRunner(cxL+fDirX/fDirL*6.45, czL+fDirZ/fDirL*6.45, astroX-fDirX/fDirL*2.05, astroZ-fDirZ/fDirL*2.05, 1.16);
          // Runner B: Compass Rose Medallion edge toward Astrolabe plaza
          var cMx=cxL+1.6, cMz=czL+18.4, mcDx=astroX-cMx, mcDz=astroZ-cMz, mcL=Math.hypot(mcDx,mcDz)||1;
          inlaidScrollRunner(cMx+mcDx/mcL*3.02, cMz+mcDz/mcL*3.02, astroX-mcDx/mcL*2.05, astroZ-mcDz/mcL*2.05, 1.08);
          // Runner C: Astrolabe plaza toward Hana's cantilevered balcony pier
          if(lh.hanaLanding){
            var hDx=lh.hanaLanding.x-astroX, hDz=lh.hanaLanding.z-astroZ, hL=Math.hypot(hDx,hDz)||1;
            inlaidScrollRunner(astroX+hDx/hL*2.05, astroZ+hDz/hL*2.05, lh.hanaLanding.x-hDx/hL*1.25, lh.hanaLanding.z-hDz/hL*1.25, 1.08);
            // Decorative turquoise-gold collar medallion framing Hana's limestone pier base on the rotunda floor
            scAdd(new T.CylinderGeometry(1.88,1.94,0.022,32),'#2d7f90',lh.hanaLanding.x,floorY+0.011,lh.hanaLanding.z);
            scAdd(new T.CylinderGeometry(1.58,1.62,0.026,32),'#4db2bf',lh.hanaLanding.x,floorY+0.013,lh.hanaLanding.z);
            scAdd(new T.TorusGeometry(1.88,0.068,8,32),'#dab052',lh.hanaLanding.x,floorY+0.024,lh.hanaLanding.z,Math.PI/2,0,0,1,1,0.34);
          }
          // 3. Flush circular inlaid turquoise-and-gold Astrolabe Sundial Plaza Medallion at (astroX, astroZ)
          scAdd(new T.CylinderGeometry(2.26,2.34,0.028,40),'#eadec4',astroX,floorY+0.014,astroZ);
          scAdd(new T.CylinderGeometry(2.08,2.10,0.032,40),'#2b7b8c',astroX,floorY+0.016,astroZ);
          scAdd(new T.CylinderGeometry(1.76,1.78,0.036,40),'#46acb9',astroX,floorY+0.018,astroZ);
          scAdd(new T.CylinderGeometry(1.42,1.44,0.040,40),'#f1e6cd',astroX,floorY+0.020,astroZ);
          scAdd(new T.TorusGeometry(2.14,0.072,8,40),'#deb454',astroX,floorY+0.034,astroZ,Math.PI/2,0,0,1,1,0.34);
          scAdd(new T.TorusGeometry(1.44,0.052,8,36),'#cfa244',astroX,floorY+0.036,astroZ,Math.PI/2,0,0,1,1,0.34);
          // 12 radial gilded sundial hour ticks inlaid into the turquoise collar around the astrolabe base
          var hrTickGeo=new T.BoxGeometry(0.09,0.016,0.30);
          for(var hi=0;hi<12;hi++){
            var ha=hi*Math.PI*2/12;
            scAdd(hrTickGeo,hi%3===0?'#f4d06e':'#f2e6ca',astroX+Math.sin(ha)*1.76,floorY+0.033,astroZ+Math.cos(ha)*1.76,0,ha,0);
          }
          compactGroupInPlace(scGrp, true, null);
          rotundaFloor.add(scGrp);
        })();
        if(useBake) reef3dBakeObject(rotundaFloor,view.rig,view.bake);
        rotundaFloor.traverse(function(o){
          if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; o.userData.reefGround=true; }
        });
        extras.add(rotundaFloor);
        // Exterior stepped stone foundation drum cleanly BELOW floorY (-0.16 gap eliminates any coplanar Z-fighting!)
        var drumH=Math.max(0.2,(floorY-0.16)-(waterY-1.1));
        add(cyl(rWallBase+2.2,rWallBase+3.6,drumH,36),'#9d9584',cxL,waterY-1.1+drumH*0.5,czL,0,0,0,'stone').userData.reefGround=true;
        smoothFoamRing(cxL,waterY+0.064,czL,rWallBase+4.1,rWallBase+4.1);
        surfWaveHalo(cxL,waterY+0.056,czL,rWallBase+4.8,rWallBase+4.8,1.2);

        // MAJ 7: Furnish the lower-left & mid-left rotunda floor with a grounded woven nautical rug,
        // carved brass chart/map table, stacked lantern crates, sea chest, bench, and lush potted coastal ferns.
        function rotundaPottedFern(fx,fz,sc){
          var k=sc||1, fg=palmFrondGeo();
          // Sculpted coastal terracotta planter + rim lip + rich dark soil bed seated solidly on floorY
          add(cyl(0.46*k,0.34*k,0.58*k,14),'#c96f55',fx,floorY+0.29*k,fz,0,0,0,'stone');
          add(smoothTorus(0.47*k,0.065*k,8,16),'#d98064',fx,floorY+0.57*k,fz,Math.PI/2,0,0,'stone');
          add(cyl(0.42*k,0.42*k,0.06*k,12),'#543d2c',fx,floorY+0.56*k,fz,0,0,0,false);
          // Arching 2-tier coastal fern rosette (7 outer + 4 upright inner fronds)
          var fCols=['#3b8f56','#4ea562','#327e4d','#5fb86d','#449a5d'];
          for(var fi=0;fi<7;fi++){
            var fa=fi*Math.PI*2/7+(fx+fz)*0.3;
            var fr=mesh(fg,M(fCols[fi%fCols.length],{side:T.DoubleSide,vertexColors:true}),fx,floorY+0.60*k,fz);
            fr.rotation.order='YXZ'; fr.rotation.y=fa; fr.rotation.x=-0.30-(fi%2)*0.08;
            fr.scale.setScalar((0.46+(fi%3)*0.04)*k); root.add(fr);
          }
          for(var fi2=0;fi2<4;fi2++){
            var fa2=fi2*Math.PI/2+0.42+(fx+fz)*0.3;
            var fr2=mesh(fg,M(fi2%2?'#68c274':'#52ae66',{side:T.DoubleSide,vertexColors:true}),fx,floorY+0.64*k,fz);
            fr2.rotation.order='YXZ'; fr2.rotation.y=fa2; fr2.rotation.x=-0.62-(fi2%2)*0.08;
            fr2.scale.setScalar(0.34*k); root.add(fr2);
          }
          var heart=smoothOrb(0.18*k,'#3f9458',fx,floorY+0.62*k,fz,false); heart.scale.set(1.1,0.55,1.1);
          addObstacle(fx,fz,0.55*k);
        }
        function rotundaDeckLantern(lx,ly,lz,sc){
          var k=sc||1;
          add(cyl(0.16*k,0.20*k,0.08*k,10),'#b98a35',lx,ly+0.04*k,lz,0,0,0,false);
          add(cyl(0.14*k,0.13*k,0.28*k,10),'#f7d982',lx,ly+0.22*k,lz,0,0,0,false);
          smoothOrb(0.09*k,'#fff5c6',lx,ly+0.22*k,lz,false);
          add(cone(0.20*k,0.16*k,10),'#c85c50',lx,ly+0.42*k,lz,0,0,0,'roof');
          smoothOrb(0.045*k,'#e5bc5c',lx,ly+0.52*k,lz,false);
        }
        // Vignette A: Lower-left / mid-left Keeper's Nautical Chart Lounge (grounded woven rug + brass chart table + crates + ferns)
        (function buildChartLounge(){
          var lx=cxL+2.4, lz=czL+12.6, yaw=-0.34, g0=root.children.length;
          // 1. Plush grounded woven nautical rug (warm oatmeal center + woven navy-teal & sandstone border + tasseled ends)
          var rugBase=block(5.1,0.048,3.6,'#3c6c7d',lx,floorY+0.024,lz,0,'fabric'); rugBase.userData.reefGround=true;
          var rugMid=block(4.55,0.054,3.05,'#d9956b',lx,floorY+0.027,lz,0,'fabric'); rugMid.userData.reefGround=true;
          var rugIn=block(4.10,0.060,2.60,'#efe2c6',lx,floorY+0.030,lz,0,'fabric'); rugIn.userData.reefGround=true;
          var rugMed=add(cyl(0.72,0.72,0.064,18),'#508694',lx,floorY+0.032,lz,0,0,0,'fabric'); rugMed.userData.reefGround=true;
          var rugCore=add(cyl(0.42,0.42,0.068,16),'#e5bc64',lx,floorY+0.034,lz,0,0,0,'fabric'); rugCore.userData.reefGround=true;
          [-2.62,2.62].forEach(function(exR){
            for(var frI=-6;frI<=6;frI++){
              block(0.18,0.024,0.12,'#f2e7cf',lx+exR,floorY+0.012,lz+frI*0.26,0,'fabric').userData.reefGround=true;
            }
          });
          // 2. Carved Oak & Burnished-Brass Chart / Map Table grounded squarely on the rug
          var rugTop=floorY+0.060;
          [[-0.98,-0.54],[0.98,-0.54],[-0.98,0.54],[0.98,0.54]].forEach(function(lg){
            post(0.085,0.88,'#6a442a',lx+lg[0],rugTop,lz+lg[1]);
            add(cyl(0.11,0.12,0.08,8),'#d6a84a',lx+lg[0],rugTop+0.04,lz+lg[1],0,0,0,false);
          });
          block(1.96,0.09,0.09,'#754b2e',lx,rugTop+0.26,lz-0.54,0,'timber');
          block(1.96,0.09,0.09,'#754b2e',lx,rugTop+0.26,lz+0.54,0,'timber');
          block(0.09,0.09,1.08,'#754b2e',lx-0.98,rugTop+0.26,lz,0,'timber');
          block(0.09,0.09,1.08,'#754b2e',lx+0.98,rugTop+0.26,lz,0,'timber');
          wornBox(2.26,0.14,1.38,'#8c5a36',lx,rugTop+0.88,lz,'timber');
          wornBox(2.42,0.09,1.52,'#c79156',lx,rugTop+0.97,lz,'timber');
          // Brass table corner brackets
          [[-1.16,-0.71],[1.16,-0.71],[-1.16,0.71],[1.16,0.71]].forEach(function(bc){
            block(0.14,0.10,0.14,'#d8ab4c',lx+bc[0],rugTop+0.97,lz+bc[1],0,false);
          });
          // Spread nautical parchment sea chart + compass inlay + rolled scroll + brass spyglass + glowing table lantern
          var tabTop=rugTop+1.02;
          block(1.42,0.028,0.92,'#faf0d5',lx-0.14,tabTop+0.014,lz,0.05,'fabric');
          add(cyl(0.24,0.24,0.032,14),'#5997a3',lx-0.28,tabTop+0.018,lz-0.06,0,0,0,false);
          add(smoothTorus(0.22,0.022,6,16),'#d6a84a',lx-0.28,tabTop+0.034,lz-0.06,Math.PI/2,0,0,false);
          add(cyl(0.065,0.065,0.82,10),'#f3e4be',lx+0.54,tabTop+0.065,lz+0.04,Math.PI/2,0.18,0,'fabric');
          limb(lx-0.68,tabTop+0.06,lz+0.32,0.68,0.04,-0.12,0.70,0.036,0.056,'#dfb656',false);
          rotundaDeckLantern(lx+0.82,tabTop,lz-0.34,1.05);
          // 3. Stacked brass-strapped lantern crates + coiled rope + glowing lantern tucked beside the rug
          crate(lx-2.18,floorY,lz+1.18,1.05);
          crate(lx-2.12,floorY+0.62,lz+1.14,0.72);
          rotundaDeckLantern(lx-2.12,floorY+1.04,lz+1.14,0.92);
          crate(lx-1.35,floorY,lz+1.65,0.82);
          var grpL=new T.Group(), orgL=new T.Vector3(lx,floorY,lz);
          root.children.slice(g0).forEach(function(p){ p.position.sub(orgL); grpL.add(p); });
          grpL.position.copy(orgL); grpL.rotation.y=yaw; root.add(grpL);
          addObstacle(lx,lz,2.35);
          // Flanking lush potted coastal ferns framing the chart lounge
          rotundaPottedFern(lx+2.45,lz-1.15,1.15);
          rotundaPottedFern(lx-2.55,lz-0.85,1.05);
        })();
        // Vignette B: Lower-left Atrium Harbor Bench, Brass Sea Chest & Potted Ferns facing the crystal fountain
        (function buildAtriumNook(){
          var nxN=cxL-3.0, nzN=czL+10.5, yawN=0.48, g0=root.children.length;
          bench(nxN,floorY,nzN,0);
          // Brass-bound coastal oak sea chest beside the bench
          wornBox(1.18,0.56,0.72,'#825232',nxN-1.52,floorY+0.28,nzN+0.12,'timber');
          add(cyl(0.36,0.36,1.16,10),'#97623d',nxN-1.52,floorY+0.56,nzN+0.12,0,0,Math.PI/2,'timber');
          [-0.36,0.36].forEach(function(sbX){
            block(0.08,0.62,0.76,'#d6a84a',nxN-1.52+sbX,floorY+0.32,nzN+0.12,0,false);
          });
          block(0.16,0.16,0.08,'#e5bc5c',nxN-1.52,floorY+0.48,nzN+0.49,0,false);
          // Tall brass keeper's floor lantern stand + coiled hemp rope
          add(cyl(0.24,0.32,0.12,10),'#6a452b',nxN+1.45,floorY+0.06,nzN+0.15,0,0,0,'timber');
          post(0.06,1.35,'#754d30',nxN+1.45,floorY+0.10,nzN+0.15);
          rotundaDeckLantern(nxN+1.45,floorY+1.44,nzN+0.15,1.08);
          var grpN=new T.Group(), orgN=new T.Vector3(nxN,floorY,nzN);
          root.children.slice(g0).forEach(function(p){ p.position.sub(orgN); grpN.add(p); });
          grpN.position.copy(orgN); grpN.rotation.y=yawN; root.add(grpN);
          addObstacle(nxN,nzN,1.95);
          rotundaPottedFern(nxN-2.25,nzN-0.95,1.18);
          rotundaPottedFern(cxL+6.4,czL+9.0,1.10);
          crate(cxL+5.4,floorY,czL+9.5,0.92);
          rotundaDeckLantern(cxL+5.4,floorY+0.55,czL+9.5,0.95);
        })();
        // MIN 4: Subtle grounded coastal accents framing the inlaid Compass Rose Medallion in the bottom-center
        // rotunda floor zone (low carved stone planters, coiled hemp ropes, warm brass lanterns — 100% clear of stairs & Hana's pedestal!).
        (function buildBottomCenterAccents(){
          function rotundaLowCarvedPlanter(px,pz,sc){
            var k=sc||1, fg=palmFrondGeo();
            // Low wide fluted warm-limestone & coastal-terracotta bowl planter seated flush on floorY (max height <= 0.78u)
            add(cyl(0.56*k,0.44*k,0.14*k,16),'#cbbda2',px,floorY+0.07*k,pz,0,0,0,'stone');
            add(cyl(0.66*k,0.52*k,0.34*k,16),'#d68466',px,floorY+0.28*k,pz,0,0,0,'stone');
            add(smoothTorus(0.65*k,0.068*k,8,18),'#e6d7bb',px,floorY+0.44*k,pz,Math.PI/2,0,0,'stone');
            add(smoothTorus(0.57*k,0.036*k,6,18),'#d6aa4e',px,floorY+0.25*k,pz,Math.PI/2,0,0,false);
            add(cyl(0.59*k,0.59*k,0.05*k,14),'#523c2c',px,floorY+0.43*k,pz,0,0,0,false);
            var fCols=['#3b8f56','#4ea562','#348250','#5fb86d','#449a5d'];
            for(var fi=0;fi<8;fi++){
              var fa=fi*Math.PI*2/8+(px+pz)*0.25;
              var fr=mesh(fg,M(fCols[fi%fCols.length],{side:T.DoubleSide,vertexColors:true}),px,floorY+0.46*k,pz);
              fr.rotation.order='YXZ'; fr.rotation.y=fa; fr.rotation.x=-0.16-(fi%2)*0.08;
              fr.scale.setScalar((0.40+(fi%3)*0.04)*k); root.add(fr);
            }
            for(var bi=0;bi<4;bi++){
              var ba=bi*Math.PI*0.5+0.35;
              smoothOrb(0.085*k,bi%2?'#8ef2ec':'#f8e6b4',px+Math.cos(ba)*0.24*k,floorY+0.55*k,pz+Math.sin(ba)*0.24*k,false);
            }
            addObstacle(px,pz,0.68*k);
          }
          // iter30 MIN fix: Sculpted low Brass Astrolabe Sundial Pedestal seated squarely atop its inlaid
          // turquoise-and-gold plaza at (7.8, 15.0) — total height ~1.68u (well below Hana's 2.384 balcony & clear of stairs!)
          (function buildBrassAstrolabeSundial(){
            var ax=astroX, az=astroZ, baseY=floorY+0.038;
            // 1. Stepped octagonal warm limestone & inlaid turquoise plinth
            add(cyl(1.10,1.24,0.16,8),'#cbbca0',ax,baseY+0.08,az,0,Math.PI/8,0,'stone');
            add(cyl(0.88,1.02,0.14,8),'#e5dac2',ax,baseY+0.23,az,0,Math.PI/8,0,'stone');
            add(smoothTorus(0.92,0.048,8,24),'#d9ad4e',ax,baseY+0.29,az,Math.PI/2,0,0,false);
            // 2. Fluted classical stone & turquoise-inlaid sundial column shaft + 4 miniature brass scroll consoles
            add(cyl(0.52,0.62,0.52,16),'#efe4cc',ax,baseY+0.55,az,0,0,0,'stone');
            add(cyl(0.56,0.56,0.14,16),'#3490a0',ax,baseY+0.55,az,0,0,0,false);
            add(smoothTorus(0.57,0.032,6,20),'#e6be5e',ax,baseY+0.63,az,Math.PI/2,0,0,false);
            add(smoothTorus(0.57,0.032,6,20),'#e6be5e',ax,baseY+0.47,az,Math.PI/2,0,0,false);
            for(var scI=0;scI<4;scI++){
              var sa=scI*Math.PI*0.5+Math.PI*0.25;
              var brk=wornBox(0.16,0.34,0.28,'#cfa244',ax+Math.cos(sa)*0.56,baseY+0.68,az+Math.sin(sa)*0.56,false);
              brk.rotation.y=-sa+Math.PI*0.5;
            }
            // 3. Engraved circular burnished-brass Sundial Dial Plate (y = baseY + 0.88)
            var dialY=baseY+0.88;
            add(cyl(0.84,0.68,0.14,24),'#dfd3ba',ax,dialY-0.07,az,0,0,0,'stone');
            add(cyl(0.82,0.84,0.07,28),'#d6a84a',ax,dialY+0.035,az,0,0,0,false);
            add(cyl(0.70,0.70,0.076,28),'#2e8898',ax,dialY+0.040,az,0,0,0,false);
            add(cyl(0.50,0.50,0.082,24),'#f2d06f',ax,dialY+0.044,az,0,0,0,false);
            add(smoothTorus(0.82,0.052,8,28),'#ecc462',ax,dialY+0.07,az,Math.PI/2,0,0,false);
            // Delicate angled brass gnomon shadow fin & cradle stem rising into the miniature celestial astrolabe
            var gnomon=block(0.055,0.42,0.34,'#e4ba56',ax+0.12,dialY+0.22,az-0.06,0.42,false);
            gnomon.rotation.z=-0.38;
            add(cyl(0.055,0.085,0.28,10),'#c8993c',ax,dialY+0.18,az,0,0,0,false);
            // 4. Sculpted tilting brass celestial astrolabe armillary crowning the sundial (top y ~= 1.38, clear of Hana!)
            var orbY=dialY+0.54;
            var ringE=add(smoothTorus(0.52,0.036,8,28),'#f0ca68',ax,orbY,az,0.58,0.32,0,false);
            ringE.rotation.order='YXZ';
            var ringM=add(smoothTorus(0.46,0.032,8,28),'#d6a646',ax,orbY,az,Math.PI*0.5-0.25,0.85,0.38,false);
            ringM.rotation.order='YXZ';
            var ringZ=add(smoothTorus(0.38,0.028,8,24),'#4ecad4',ax,orbY,az,-0.48,-0.55,0.24,false);
            ringZ.rotation.order='YXZ';
            // Slanted polar axis rod + gleaming aqua sea-glass celestial core orb + golden meridian star finials
            limb(ax-0.26,orbY-0.44,az-0.18, 0.52,0.88,0.36, 1.08,0.024,0.024,'#f0ca68',false);
            smoothOrb(0.14,'#7ef6f2',ax,orbY,az,false);
            smoothOrb(0.08,'#fff4be',ax+0.26,orbY+0.44,az+0.18,false);
            smoothOrb(0.065,'#ffe894',ax-0.42,orbY+0.18,az+0.24,false);
            addObstacle(ax,az,1.32);
          })();
          // Accent 1: Mid-right bridging the Astrolabe sundial plaza & lower-right stair curve (px ≈ 654, 442 — >3.6u clear of stairs & Hana pier!)
          var a1x=cxL+11.4, a1z=czL+16.6;
          rotundaLowCarvedPlanter(a1x,a1z,0.92);
          rotundaDeckLantern(a1x-0.68,floorY,a1z-0.62,0.94);
          // Accent 2: Foreground bottom-center-left edge (px ≈ 505, 592 — >5.8u clear of stairs & 4.2u clear of medallion!)
          var a2x=cxL-2.6, a2z=czL+18.4;
          rotundaLowCarvedPlanter(a2x,a2z,0.82);
          rotundaDeckLantern(a2x+0.88,floorY,a2z-0.54,0.94);
        })();
      })();

      // =========================================================================
      // 2. COLOSSAL SUNLIT CIRCULAR WARM-TRAVERTINE & LIMESTONE ROTUNDA (~38u TALL)
      //    12 Grand Bays x 3 Tiers of Open Arched Ocean Windows + Ribbed Cupola
      //    (MIN-12: Warm deepened travertine/limestone shading & crisp stone-course joints!)
      // =========================================================================
      (function buildRotundaWalls(){
        var N_BAYS=12, bayAng=Math.PI*2/N_BAYS, wallThick=1.85;
        // Helper: build a curved tapered warm-travertine masonry wall arc segment with vertical stone-course shading
        function wallArc(ang0,ang1,y0,y1,thick,col,kind,segN){
          var n=segN||4, p=[], c=[], idx=[], th=thick||wallThick;
          var hSpan=Math.max(0.05, y1-y0);
          var nY=(hSpan>2.2) ? Math.min(5, Math.max(2, Math.round(hSpan/2.1))) : 1;
          var rowStride=(n+1)*4;
          for(var iy=0;iy<=nY;iy++){
            var fy=iy/nY, yy=y0+hSpan*fy;
            var rIn=rWallAt(yy), rOut=rIn+th;
            // Subtle warm stone-course alternation + shadowed underside near base & cornice for crisp travertine contrast!
            var courseShade=(nY>1) ? ((iy%2===0)?0.93:1.01) : 1.0;
            var vGrad=0.92 + 0.08*fy;
            var inS=courseShade*vGrad, outS=inS*0.91;
            for(var i=0;i<=n;i++){
              var a=ang0+(ang1-ang0)*(i/n), ca=Math.cos(a), sa=Math.sin(a);
              var bayShade=0.96 + 0.04*Math.sin((i/n)*Math.PI);
              p.push(cxL+ca*rIn, yy, czL+sa*rIn);   // 0: inner
              p.push(cxL+ca*rOut,yy, czL+sa*rOut);  // 1: outer
              var si=inS*bayShade, so=outS*bayShade;
              c.push(si, si*0.985, si*0.955, so, so*0.98, so*0.94);
            }
          }
          var colStride=(n+1)*2;
          for(var iy2=0;iy2<nY;iy2++){
            var r0=iy2*colStride, r1=(iy2+1)*colStride;
            for(var j=0;j<n;j++){
              var a0=r0+j*2, b0=r0+(j+1)*2, a1=r1+j*2, b1=r1+(j+1)*2;
              idx.push(a0,b1,a1, a0,b0,b1);         // Inner face (facing rotunda center)
              idx.push(a0+1,a1+1,b1+1, a0+1,b1+1,b0+1); // Outer face (facing ocean)
            }
            // Left & right end jamb faces (solid window embrasure thickness facing outward into openings!)
            idx.push(r0,r1,r1+1, r0,r1+1,r0+1);
            var er0=r0+n*2, er1=r1+n*2;
            idx.push(er0,er0+1,er1+1, er0,er1+1,er1);
          }
          // Top & bottom caps
          var rTop=nY*colStride;
          for(var j2=0;j2<n;j2++){
            var t0=rTop+j2*2, t1=rTop+(j2+1)*2;
            idx.push(t0,t1+1,t0+1, t0,t1,t1+1);
            var bt0=j2*2, bt1=(j2+1)*2;
            idx.push(bt0,bt0+1,bt1+1, bt0,bt1+1,bt1);
          }
          var g=own(new T.BufferGeometry());
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          return add(g,col,0,0,0,0,0,0,kind||'plaster');
        }
        // Solid lower warm travertine stone dado wainscot ring (floorY -> y = 3.55) + recessed mortar course band
        for(var b0=0;b0<N_BAYS;b0++){
          var aStart=b0*bayAng, aEnd=(b0+1)*bayAng;
          wallArc(aStart,aEnd,floorY-0.3,1.25,wallThick+0.25,'#af9d7e','stone',3);
          wallArc(aStart,aEnd,1.25,1.40,wallThick+0.12,'#968366','stone',2); // Crisp stone course joint recess
          wallArc(aStart,aEnd,1.40,3.50,wallThick,'#c7b492','stone',3);
          // Warm travertine dado cornice rail ledge + shadowed soffit fillet
          wallArc(aStart,aEnd,3.44,3.72,wallThick+0.34,'#d8c6a4','stone',2);
        }
        // Continuous horizontal cornice / string-course rings between window tiers + classic lighthouse heritage bands
        var cornices=[
          { y0:11.86, y1:11.98, col:'#9c886a', kind:'stone',   extra:0.12 }, // Crisp stone shadow joint under terracotta band
          { y0:11.98, y1:12.66, col:'#c45d4a', kind:'plaster', extra:0.24 }, // Tier 1->2 terracotta lighthouse accent band
          { y0:12.66, y1:13.06, col:'#d8c5a2', kind:'stone',   extra:0.44 }, // Molded warm travertine gallery ledge
          { y0:22.16, y1:22.28, col:'#9c886a', kind:'stone',   extra:0.12 }, // Crisp stone shadow joint
          { y0:22.28, y1:22.96, col:'#c45d4a', kind:'plaster', extra:0.24 }, // Tier 2->3 terracotta accent band
          { y0:22.96, y1:23.38, col:'#d9c7a4', kind:'stone',   extra:0.44 }, // Upper gallery cornice
          { y0:33.30, y1:34.25, col:'#cfb994', kind:'stone',   extra:0.52 }  // Grand cupola spring-line cornice
        ];
        cornices.forEach(function(cn){
          for(var cb=0;cb<N_BAYS;cb++){
            wallArc(cb*bayAng,(cb+1)*bayAng,cn.y0,cn.y1,wallThick+cn.extra,cn.col,cn.kind,2);
          }
        });
        // 12 Monumental tapered warm travertine limestone vertical pilasters separating every bay (with stone ashlar joint bands!)
        for(var k=0;k<N_BAYS;k++){
          var pa=k*bayAng, ca=Math.cos(pa), sa=Math.sin(pa);
          var pilCourses=[[floorY,12.1,'#ccb895'],[12.9,22.4,'#d4c19e'],[23.2,33.5,'#dac8a6']];
          pilCourses.forEach(function(pc){
            var yMid=(pc[0]+pc[1])*0.5, yH=pc[1]-pc[0], rM=rWallAt(yMid);
            var px=cxL+ca*(rM+0.45), pz=czL+sa*(rM+0.45);
            wornBox(1.55,yH,wallThick+0.55,pc[2],px,yMid,pz,'stone').rotation.y=-pa+Math.PI/2;
            // Crisp dark-travertine horizontal ashlar course joints across each pilaster pier
            for(var jy=pc[0]+2.6;jy<pc[1]-1.6;jy+=2.8){
              var rJ=rWallAt(jy);
              wornBox(1.62,0.12,wallThick+0.62,'#a49070',cxL+ca*(rJ+0.45),jy,czL+sa*(rJ+0.45),'stone').rotation.y=-pa+Math.PI/2;
            }
            // Interior decorative fluted half-column pier facing the atrium
            var ix=cxL+ca*(rM-0.25), iz=czL+sa*(rM-0.25);
            add(cyl(0.42,0.48,yH,10),'#d9c7a6',ix,yMid,iz,0,0,0,'stone');
            // Molded capital & base collar on each tier + crisp dark-stone necking ring
            add(cyl(0.62,0.46,0.34,10),'#bfa986',ix,pc[1]-0.18,iz,0,0,0,'stone');
            add(cyl(0.48,0.48,0.10,10),'#9d896a',ix,pc[1]-0.38,iz,0,0,0,'stone');
            add(cyl(0.48,0.62,0.30,10),'#b39e7c',ix,pc[0]+0.16,iz,0,0,0,'stone');
          });
        }
        // iter31 MIN 7 + iter36 MIN-12: Smooth multi-segment curved warm-travertine arch spandrel & high-contrast voussoir arch
        function archedSpandrel(wA0,wA1,ySpring,yCrown,yTop,thick,col){
          var n=20, aMid=(wA0+wA1)*0.5, halfOpen=(wA1-wA0)*0.5, archH=yCrown-ySpring;
          var p=[], c=[], idx=[], th=thick||wallThick;
          for(var i=0;i<=n;i++){
            var phi=(i/n)*Math.PI;
            var a=aMid-Math.cos(phi)*halfOpen, ca=Math.cos(a), sa=Math.sin(a);
            var y0=ySpring+Math.sin(phi)*archH, y1=yTop;
            var r0In=rWallAt(y0), r1In=rWallAt(y1), r0Out=r0In+th, r1Out=r1In+th;
            p.push(cxL+ca*r0In,y0,czL+sa*r0In);   // 0: arch intrados inner
            p.push(cxL+ca*r1In,y1,czL+sa*r1In);   // 1: spandrel top inner
            p.push(cxL+ca*r0Out,y0,czL+sa*r0Out); // 2: arch intrados outer
            p.push(cxL+ca*r1Out,y1,czL+sa*r1Out); // 3: spandrel top outer
            // Warm travertine shading: subtly richer shadowed arch reveal rising to sunlit spandrel crown
            var sh0=0.91, sh1=1.00, sh2=0.84, sh3=0.93;
            c.push(sh0,sh0*0.985,sh0*0.955, sh1,sh1*0.99,sh1*0.965, sh2,sh2*0.98,sh2*0.95, sh3,sh3*0.985,sh3*0.955);
          }
          for(var j=0;j<n;j++){
            var a0=j*4, b0=(j+1)*4;
            idx.push(a0,b0+1,a0+1, a0,b0,b0+1);       // Inner face (facing rotunda center)
            idx.push(a0+2,a0+3,b0+3, a0+2,b0+3,b0+2); // Outer face (facing ocean)
            idx.push(a0+1,b0+3,a0+3, a0+1,b0+1,b0+3); // Top cap
            idx.push(a0,a0+2,b0+2, a0,b0+2,b0);       // Smooth curved arch reveal soffit
          }
          var e=n*4;
          idx.push(0,1,3, 0,3,2);
          idx.push(e,e+2,e+3, e,e+3,e+1);
          var g=own(new T.BufferGeometry());
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          return add(g,col,0,0,0,0,0,0,'plaster');
        }
        function voussoirArch(wA0,wA1,ySpring,yCrown,yTop,thick,trimCol){
          // 18-segment classical curved travertine limestone voussoir architrave with crisp alternating stone contrast & keystone
          var nV=18, aMid=(wA0+wA1)*0.5, halfOpen=(wA1-wA0)*0.5, archH=yCrown-ySpring;
          var th=thick||wallThick, p=[], c=[], idx=[];
          for(var vi=0;vi<nV;vi++){
            var isKey=(vi===8 || vi===9);
            var phi0=(vi/nV)*Math.PI, phi1=((vi+1)/nV)*Math.PI;
            var bandAng=isKey ? 0.023 : 0.018;
            var bandH=isKey ? 0.58 : 0.42;
            var inProj=isKey ? 0.25 : 0.17;
            var outProj=0.10;
            // Crisp alternating warm travertine voussoir block contrast (never washed out!)
            var tone=isKey ? 1.06 : ((vi%2===0) ? 1.02 : 0.85);
            var vBase=p.length/3;
            [phi0,phi1].forEach(function(ph){
              var cp=Math.cos(ph), sp2=Math.sin(ph);
              var angI=aMid-cp*(halfOpen-0.002), yI=ySpring+sp2*(archH-0.03);
              var angE=aMid-cp*(halfOpen+bandAng), yE=Math.min(yTop-0.04, ySpring+sp2*(archH+bandH));
              var rIIn=rWallAt(yI)-inProj, rIOut=rWallAt(yI)+th+outProj;
              var rEIn=rWallAt(yE)-inProj, rEOut=rWallAt(yE)+th+outProj;
              var cI=Math.cos(angI), sI=Math.sin(angI), cE=Math.cos(angE), sE=Math.sin(angE);
              p.push(cxL+cI*rIIn, yI, czL+sI*rIIn);   // 0: intrados inner
              p.push(cxL+cE*rEIn, yE, czL+sE*rEIn);   // 1: extrados inner
              p.push(cxL+cI*rIOut,yI, czL+sI*rIOut);  // 2: intrados outer
              p.push(cxL+cE*rEOut,yE, czL+sE*rEOut);  // 3: extrados outer
              var s0=tone*0.95, s1=tone*1.03, s2=tone*0.86, s3=tone*0.95;
              c.push(s0,s0*0.985,s0*0.95, s1,s1*0.99,s1*0.96, s2,s2*0.98,s2*0.94, s3,s3*0.985,s3*0.95);
            });
            var a0=vBase, b0=vBase+4;
            idx.push(a0,b0+1,a0+1, a0,b0,b0+1);       // Inner classical architrave face
            idx.push(a0+2,a0+3,b0+3, a0+2,b0+3,b0+2); // Outer face
            idx.push(a0+1,b0+3,a0+3, a0+1,b0+1,b0+3); // Curved extrados rim
            idx.push(a0,a0+2,b0+2, a0,b0+2,b0);       // Smooth curved limestone arch intrados soffit
            if(vi===8) idx.push(a0,a0+1,a0+3, a0,a0+3,a0+2);
            if(vi===9) idx.push(b0,b0+2,b0+3, b0,b0+3,b0+1);
            if(vi===0) idx.push(a0,a0+1,a0+3, a0,a0+3,a0+2);
            if(vi===nV-1) idx.push(b0,b0+2,b0+3, b0,b0+3,b0+1);
          }
          // Left & right sculpted limestone springline impost ledges projecting inward to seat the voussoir arch cleanly
          [[wA0-0.028, wA0+0.005],[wA1-0.005, wA1+0.028]].forEach(function(im){
            var vBase=p.length/3, y0=ySpring-0.26, y1=ySpring+0.04;
            var r0In=rWallAt(y0)-0.24, r1In=rWallAt(y1)-0.24, r0Out=rWallAt(y0)+th+0.14, r1Out=rWallAt(y1)+th+0.14;
            im.forEach(function(ang){
              var ca=Math.cos(ang), sa=Math.sin(ang);
              p.push(cxL+ca*r0In,y0,czL+sa*r0In, cxL+ca*r1In,y1,czL+sa*r1In, cxL+ca*r0Out,y0,czL+sa*r0Out, cxL+ca*r1Out,y1,czL+sa*r1Out);
              c.push(0.88,0.87,0.84, 1.02,1.01,0.98, 0.82,0.81,0.78, 0.94,0.93,0.90);
            });
            var a0=vBase, b0=vBase+4;
            idx.push(a0,b0+1,a0+1, a0,b0,b0+1, a0+2,a0+3,b0+3, a0+2,b0+3,b0+2,
                     a0+1,b0+3,a0+3, a0+1,b0+1,b0+3, a0,a0+2,b0+2, a0,b0+2,b0,
                     a0,a0+1,a0+3, a0,a0+3,a0+2, b0,b0+2,b0+3, b0,b0+3,b0+1);
          });
          var g=own(new T.BufferGeometry());
          g.setAttribute('position',new T.Float32BufferAttribute(p,3));
          g.setAttribute('color',new T.Float32BufferAttribute(c,3));
          g.setIndex(idx); g.computeVertexNormals();
          return add(g,trimCol||'#c6b28e',0,0,0,0,0,0,'stone');
        }
        // 3 Tiers of Tall Open Arched Ocean Windows (12 bays x 3 tiers = 36 sunlit warm-travertine limestone arches!)
        var tiers=[
          { yBot:3.68,  ySpring:8.8,  yCrown:11.2, yTop:12.00, cheekAng:0.088, wallCol:'#d7c4a0', trimCol:'#bea884' },
          { yBot:13.02, ySpring:18.6, yCrown:21.2, yTop:22.30, cheekAng:0.088, wallCol:'#dbc8a6', trimCol:'#c3ae8a' },
          { yBot:23.35, ySpring:28.4, yCrown:30.9, yTop:33.35, cheekAng:0.098, wallCol:'#dfd0b0', trimCol:'#c8b492' }
        ];
        tiers.forEach(function(tr){
          for(var bi=0;bi<N_BAYS;bi++){
            var a0=bi*bayAng, a1=(bi+1)*bayAng, aMid=(a0+a1)*0.5;
            var wA0=a0+tr.cheekAng, wA1=a1-tr.cheekAng;
            // Left & right warm travertine cheek walls framing the tall ocean window opening
            wallArc(a0,wA0,tr.yBot,tr.yTop,wallThick,tr.wallCol,'plaster',1);
            wallArc(wA1,a1,tr.yBot,tr.yTop,wallThick,tr.wallCol,'plaster',1);
            // Deep beveled coastal limestone window sill + shadowed soffit under-fillet
            wallArc(wA0-0.02,wA1+0.02,tr.yBot-0.14,tr.yBot-0.04,wallThick+0.20,'#9d896b','stone',2);
            wallArc(wA0-0.02,wA1+0.02,tr.yBot-0.04,tr.yBot+0.24,wallThick+0.44,tr.trimCol,'stone',2);
            // Smooth 20-segment curved masonry spandrel fill & 18-segment classical limestone voussoir arch + springline imposts
            archedSpandrel(wA0,wA1,tr.ySpring,tr.yCrown,tr.yTop,wallThick,tr.wallCol);
            voussoirArch(wA0,wA1,tr.ySpring,tr.yCrown,tr.yTop,wallThick,tr.trimCol);
            // Slender burnished-brass lighthouse window mullions (1 center vertical bar + 2 slim horizontal transoms)
            var rMulBot=rWallAt(tr.yBot)+0.45, rMulTop=rWallAt(tr.yCrown)+0.45;
            var mBx=cxL+Math.cos(aMid)*rMulBot, mBz=czL+Math.sin(aMid)*rMulBot;
            var mTx=cxL+Math.cos(aMid)*rMulTop, mTz=czL+Math.sin(aMid)*rMulTop;
            var mLen=Math.hypot(mTx-mBx,tr.yCrown-tr.yBot,mTz-mBz);
            limb(mBx,tr.yBot+0.15,mBz,mTx-mBx,tr.yCrown-tr.yBot-0.15,mTz-mBz,mLen,0.055,0.055,'#c79a40',false);
            [tr.yBot+(tr.ySpring-tr.yBot)*0.52, tr.ySpring].forEach(function(yTr, tri){
              var mA0=tri ? (wA0 + 0.085) : (wA0 + 0.068), mA1=tri ? (wA1 - 0.085) : (wA1 - 0.068);
              var rT=rWallAt(yTr)+0.72;
              var tLx=cxL+Math.cos(mA0)*rT, tLz=czL+Math.sin(mA0)*rT;
              var tRx=cxL+Math.cos(mA1)*rT, tRz=czL+Math.sin(mA1)*rT;
              var tLen=Math.hypot(tRx-tLx,tRz-tLz);
              limb(tLx,yTr,tLz,tRx-tLx,0,tRz-tLz,tLen,0.048,0.048,'#c79a40',false);
            });
          }
        });
        // Grand Sunlit Ribbed Cupola Dome (y = 33.8 -> 42.0) with wide open sunlit sky oculus (r = 9.4)
        var domeRings=[
          { r:rWallTop+0.4, y:33.8, col:'#d8c5a2' },
          { r:rWallTop*0.80, y:37.2, col:'#cfba96' },
          { r:rWallTop*0.58, y:40.0, col:'#c45d4a' },
          { r:9.4,          y:42.0, col:'#ddd0b2' }
        ];
        // Coffered dome shell panels (facing inward/downward so upward views see sunlit architectural ribs!)
        var dPos=[], dCol=[], dIdx=[], dSegs=24;
        for(var dri=0;dri<domeRings.length;dri++){
          var dr=domeRings[dri], dc=new T.Color(dr.col);
          for(var dai=0;dai<dSegs;dai++){
            var da=dai*Math.PI*2/dSegs;
            dPos.push(cxL+Math.cos(da)*dr.r,dr.y,czL+Math.sin(da)*dr.r);
            var sh=0.92+0.08*Math.cos(da-0.6);
            dCol.push(dc.r*sh,dc.g*sh,dc.b*sh);
          }
        }
        for(var dri2=0;dri2<domeRings.length-1;dri2++){
          var db0=dri2*dSegs, db1=(dri2+1)*dSegs;
          for(var dai2=0;dai2<dSegs;dai2++){
            var dan=(dai2+1)%dSegs;
            // Downward-inward + upward-outward double coverage via clean single dome shell
            dIdx.push(db0+dai2,db1+dai2,db1+dan, db0+dai2,db1+dan,db0+dan);
          }
        }
        var dGeo=own(new T.BufferGeometry());
        dGeo.setAttribute('position',new T.Float32BufferAttribute(dPos,3));
        dGeo.setAttribute('color',new T.Float32BufferAttribute(dCol,3));
        dGeo.setIndex(dIdx); dGeo.computeVertexNormals();
        var dMesh=mesh(dGeo,M('#ffffff',{vertexColors:true,side:T.DoubleSide}),0,0,0);
        root.add(finish(dMesh,'plaster'));
        // 12 Sculpted curved dome ceiling ribs + gleaming burnished-brass oculus skylight ring
        for(var rb=0;rb<N_BAYS;rb++){
          var ra=rb*bayAng, rca=Math.cos(ra), rsa=Math.sin(ra);
          for(var rj=0;rj<domeRings.length-1;rj++){
            var p0=domeRings[rj], p1=domeRings[rj+1];
            var x0=cxL+rca*(p0.r-0.35), y0=p0.y-0.25, z0=czL+rsa*(p0.r-0.35);
            var x1=cxL+rca*(p1.r-0.35), y1=p1.y-0.25, z1=czL+rsa*(p1.r-0.35);
            var rl=Math.hypot(x1-x0,y1-y0,z1-z0);
            limb(x0,y0,z0,x1-x0,y1-y0,z1-z0,rl,0.34,0.28,'#cbbca0','stone');
          }
        }
        add(smoothTorus(9.35,0.44,10,36),'#d8cab0',cxL,41.72,czL,Math.PI/2,0,0,'stone');
        add(smoothTorus(9.35,0.36,10,36),'#d6a84a',cxL,41.85,czL,Math.PI/2,0,0,false);
        // MIN-6: Extend 6 radial stone-and-brass vault tie-beams from the oculus ring all the way into the central lighthouse spire collar!
        add(cyl(1.45,1.65,0.75,16),'#cbbca0',cxL,37.20,czL,0,0,0,'stone');
        add(smoothTorus(1.62,0.16,8,24),'#d6a84a',cxL,37.20,czL,Math.PI/2,0,0,false);
        for(var vr=0;vr<6;vr++){
          var va=vr*Math.PI/3, vca=Math.cos(va), vsa=Math.sin(va);
          var vx0=cxL+vca*9.25, vy0=41.72, vz0=czL+vsa*9.25;
          var vx1=cxL+vca*1.45, vy1=37.20, vz1=czL+vsa*1.45;
          var vlen=Math.hypot(vx1-vx0,vy1-vy0,vz1-vz0);
          limb(vx0,vy0,vz0,vx1-vx0,vy1-vy0,vz1-vz0,vlen,0.28,0.22,'#cbbca0','stone');
        }
      })();

      // =========================================================================
      // 3. CENTRAL FEATURE: LUMINOUS CRYSTAL TIDAL POOL FOUNTAIN (y = 0)
      //    + GRAND BRASS & CRYSTAL FRESNEL BEACON COLUMN (y = 0 -> 36.5)
      // =========================================================================
      (function buildCentralBeaconAndFountain(){
        // --- A. Luminous Crystal Tidal Pool Fountain at Base (cxL, czL) ---
        var fBaseY=floorY;
        // Carved circular/16-sided stepped limestone fountain coping basin (r = 5.45..6.20)
        add(cyl(6.25,6.45,0.24,24),'#cbbda2',cxL,fBaseY+0.12,czL,0,0,0,'stone');
        add(smoothTorus(5.82,0.36,10,32),'#e5dac2',cxL,fBaseY+0.36,czL,Math.PI/2,0,0,'stone');
        add(smoothTorus(5.82,0.12,8,32),'#d6a84c',cxL,fBaseY+0.68,czL,Math.PI/2,0,0,false);
        // 8 carved stone fountain coping bollards with glowing pearl finials
        for(var fp=0;fp<8;fp++){
          var fa=fp*Math.PI/4;
          add(cyl(0.24,0.28,0.68,8),'#dfd3ba',cxL+Math.cos(fa)*5.86,fBaseY+0.44,czL+Math.sin(fa)*5.86,0,0,0,'stone');
          smoothOrb(0.16,'#e8fdfa',cxL+Math.cos(fa)*5.86,fBaseY+0.86,czL+Math.sin(fa)*5.86,false);
        }
        // Luminous vertex-colored crystal tidal pool water disc (r = 5.58, y = +0.12)
        var wSegs=32, wRings=[0,1.8,3.2,4.4,5.58], wp=[], wc=[], wi=[];
        var cCenter=new T.Color('#8ff7f2'), cMid=new T.Color('#30c2d0'), cRim=new T.Color('#1d7d96');
        wp.push(cxL,0.12,czL); wc.push(cCenter.r,cCenter.g,cCenter.b);
        for(var wr=1;wr<wRings.length;wr++){
          var rW=wRings[wr], frac=wr/(wRings.length-1), cc=new T.Color();
          if(frac<0.55) cc.copy(cCenter).lerp(cMid,frac/0.55); else cc.copy(cMid).lerp(cRim,(frac-0.55)/0.45);
          for(var wa=0;wa<wSegs;wa++){
            var aW=wa*Math.PI*2/wSegs;
            wp.push(cxL+Math.cos(aW)*rW,0.12,czL+Math.sin(aW)*rW);
            var shimmer=0.95+0.07*Math.sin(aW*4+wr*1.3);
            wc.push(Math.min(1,cc.r*shimmer),Math.min(1,cc.g*shimmer),Math.min(1,cc.b*shimmer));
          }
        }
        for(var wa2=0;wa2<wSegs;wa2++){
          var wan=(wa2+1)%wSegs;
          wi.push(0,1+wan,1+wa2);
        }
        for(var wr2=1;wr2<wRings.length-1;wr2++){
          var r0=1+(wr2-1)*wSegs, r1=1+wr2*wSegs;
          for(var wa3=0;wa3<wSegs;wa3++){
            var wan3=(wa3+1)%wSegs;
            wi.push(r0+wa3,r0+wan3,r1+wan3, r0+wa3,r1+wan3,r1+wa3);
          }
        }
        var pwGeo=own(new T.BufferGeometry());
        pwGeo.setAttribute('position',new T.Float32BufferAttribute(wp,3));
        pwGeo.setAttribute('color',new T.Float32BufferAttribute(wc,3));
        pwGeo.setIndex(wi); pwGeo.computeVertexNormals();
        var pwMesh=mesh(pwGeo,own(new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true})),0,0,0);
        pwMesh.userData.reefGround=true; root.add(pwMesh);
        // Glowing concentric fountain ripple rings & foam collars
        add(smoothTorus(2.85,0.06,6,32),'#dffefd',cxL,0.15,czL,Math.PI/2,0,0,false);
        add(smoothTorus(4.05,0.045,6,32),'#b8f8f5',cxL,0.145,czL,Math.PI/2,0,0,false);
        // iter30 Beyond-MP8: Shimmering aqua caustic light rings on the crystal tidal pool & radiating softly
        // across the sunlit sandstone fountain plaza (in `extras` with receiveShadow=false, depthWrite=false!)
        (function buildTidalPoolCaustics(){
          var causGrp=new T.Group(); causGrp.name='lighthouse-pool-caustics';
          function makeCausticRibbon(rMid,halfW,yH,segsC,wAmp,wFreq,phase,colHex,op){
            var p=[], idx=[], n=segsC||64;
            for(var i=0;i<=n;i++){
              var a=i*Math.PI*2/n;
              var sc=Math.sin(a*wFreq+phase)*wAmp+Math.cos(a*(wFreq-3)-phase*0.7)*(wAmp*0.55);
              var r0=rMid-halfW+sc, r1=rMid+halfW+sc*0.85;
              p.push(cxL+Math.cos(a)*r0, yH, czL+Math.sin(a)*r0);
              p.push(cxL+Math.cos(a)*r1, yH, czL+Math.sin(a)*r1);
            }
            for(var j=0;j<n;j++){
              var b=j*2;
              idx.push(b,b+2,b+3, b,b+3,b+1);
            }
            var g=new T.BufferGeometry();
            g.setAttribute('position',new T.Float32BufferAttribute(p,3));
            g.setIndex(idx); g.computeVertexNormals();
            var m=new T.Mesh(g,new T.MeshBasicMaterial({color:colHex,transparent:true,opacity:op,depthWrite:false,side:T.DoubleSide,fog:false}));
            m.renderOrder=2; m.receiveShadow=false; m.castShadow=false;
            causGrp.add(m);
          }
          // 3 luminous scalloped water caustic ripples dancing across the crystal tidal pool surface
          makeCausticRibbon(2.45,0.13,0.156,56,0.14,7,0.4,'#c6fffd',0.58);
          makeCausticRibbon(3.48,0.16,0.154,64,0.19,9,1.7,'#8cfcf6',0.48);
          makeCausticRibbon(4.56,0.14,0.152,64,0.16,11,3.1,'#aefeff',0.44);
          // 3 soft shimmering aqua caustic light reflection rings radiating across the stone plaza around the fountain!
          makeCausticRibbon(6.95,0.22,floorY+0.024,72,0.18,10,0.6,'#8cf8f4',view.night?0.36:0.28);
          makeCausticRibbon(8.15,0.18,floorY+0.025,72,0.22,12,2.1,'#6eeef0',view.night?0.28:0.21);
          makeCausticRibbon(9.40,0.13,floorY+0.026,72,0.19,14,3.8,'#aefbf8',view.night?0.20:0.15);
          // Crisp diamond sunlit sparkle glints floating delicately over the crystal pool surface
          var spGeo=new T.OctahedronGeometry(0.11,0);
          var spMat=new T.MeshBasicMaterial({color:'#efffff',transparent:true,opacity:0.86,depthWrite:false,fog:false});
          for(var spI=0;spI<14;spI++){
            var sa=spI*Math.PI*2/14+0.25, sr=2.65+(spI%3)*1.05;
            var gl=new T.Mesh(spGeo,spMat);
            gl.position.set(cxL+Math.cos(sa)*sr, 0.21+(spI%2)*0.06, czL+Math.sin(sa)*sr);
            gl.scale.set(1.2,0.28,1.2); gl.rotation.y=sa; gl.renderOrder=2;
            causGrp.add(gl);
          }
          extras.add(causGrp);
        })();
        // 8 luminous aqua-crystal spires emerging organically around the crystal tidal pool rim
        for(var cr=0;cr<8;cr++){
          var ca2=cr*Math.PI/4+0.39;
          crystal(cxL+Math.cos(ca2)*4.72,0.05,czL+Math.sin(ca2)*4.72,cr%2?0.78:0.62,cr%2?'#6ef2ea':'#9be4f8');
        }
        // 4 graceful arched sparkling fountain water jets arcing from pedestal spouts into crystal splash rings
        for(var fj=0;fj<4;fj++){
          var ja=fj*Math.PI/2+Math.PI/4, jcx=Math.cos(ja), jcz=Math.sin(ja);
          // Bronze shell waterspout on central pedestal
          add(cyl(0.14,0.20,0.48,8),'#b88c38',cxL+jcx*2.15,1.82,czL+jcz*2.15,jcz*1.3,0,-jcx*1.3,false);
          var prevJx=cxL+jcx*2.32, prevJy=1.84, prevJz=czL+jcz*2.32;
          for(var js=1;js<=5;js++){
            var jf=js/5, jr=2.32+jf*1.72, jy=1.84+Math.sin(jf*Math.PI)*0.65-jf*jf*1.70;
            var jx=cxL+jcx*jr, jz=czL+jcz*jr, jl=Math.hypot(jx-prevJx,jy-prevJy,jz-prevJz);
            limb(prevJx,prevJy,prevJz,jx-prevJx,jy-prevJy,jz-prevJz,jl,0.065,0.055,'#cdfcf9',false);
            prevJx=jx; prevJy=jy; prevJz=jz;
          }
          add(smoothTorus(0.36,0.045,6,16),'#e8ffff',cxL+jcx*4.04,0.16,czL+jcz*4.04,Math.PI/2,0,0,false);
        }

        // --- B. Grand Brass & Crystal Fresnel Beacon Column (y = 0 -> 36.5) ---
        // Stepped marble & limestone fountain pedestal pier (y = -0.30 -> 3.9)
        add(cyl(2.65,2.95,0.75,16),'#cfc2a7',cxL,fBaseY+0.38,czL,0,0,0,'stone');
        add(cyl(2.15,2.52,1.65,16),'#e5dac2',cxL,fBaseY+1.55,czL,0,0,0,'stone');
        add(cyl(2.26,2.26,0.18,16),'#d4a546',cxL,fBaseY+2.42,czL,0,0,0,false);
        add(cyl(1.82,2.08,1.55,16),'#ede3cc',cxL,fBaseY+3.28,czL,0,0,0,'stone');
        add(cyl(2.05,1.88,0.26,16),'#c85c50',cxL,fBaseY+4.12,czL,0,0,0,'stone');
        // 4 bronze pedestal scroll buttresses + glowing warm amber base lanterns
        for(var pb=0;pb<4;pb++){
          var ba=pb*Math.PI/2, bc=Math.cos(ba), bs=Math.sin(ba);
          wornBox(0.46,2.2,0.88,'#c8b99c',cxL+bc*2.18,1.25,czL+bs*2.18,'stone').rotation.y=-ba+Math.PI/2;
          add(cyl(0.22,0.18,0.46,10),'#f4d47c',cxL+bc*2.42,2.62,czL+bs*2.42,0,0,0,false);
          smoothOrb(0.15,'#fff4c2',cxL+bc*2.42,2.62,czL+bs*2.42,false);
          add(cone(0.30,0.22,10),'#b88832',cxL+bc*2.42,2.96,czL+bs*2.42,0,0,0,false);
        }
        // Monumental tapered fluted stone-and-brass beacon shaft (y = 3.9 -> 17.5)
        var shaftSegs=[
          { y0:3.9,  y1:7.3,  r0:1.78, r1:1.68, col:'#efe4cc' },
          { y0:7.3,  y1:10.7, r0:1.68, r1:1.58, col:'#d26458' },
          { y0:10.7, y1:14.1, r0:1.58, r1:1.48, col:'#efe4cc' },
          { y0:14.1, y1:17.5, r0:1.48, r1:1.40, col:'#d26458' }
        ];
        shaftSegs.forEach(function(sg){
          var hS=sg.y1-sg.y0;
          add(cyl(sg.r1,sg.r0,hS,16),sg.col,cxL,sg.y0+hS*0.5,czL,0,0,0,'plaster');
          add(smoothTorus(sg.r1+0.08,0.11,8,24),'#d6a848',cxL,sg.y1,czL,Math.PI/2,0,0,false);
        });
        // 8 vertical burnished-brass ribs + 8 inlaid luminous aqua-crystal flutes soaring up the shaft
        for(var sf=0;sf<8;sf++){
          var sa2=sf*Math.PI/4, caS=Math.cos(sa2), saS=Math.sin(sa2);
          limb(cxL+caS*1.78,3.95,czL+saS*1.78, -caS*0.36,13.5,-saS*0.36, 13.52,0.11,0.09,'#cfa040',false);
          var caC=Math.cos(sa2+Math.PI/8), saC=Math.sin(sa2+Math.PI/8);
          limb(cxL+caC*1.74,4.4,czL+saC*1.74, -caC*0.34,12.6,-saC*0.34, 12.62,0.075,0.065,'#9af6f4',false);
        }
        // Grand Upper Fresnel Gallery Platform (y = 17.5 -> 18.2, r = 3.95)
        add(cyl(3.95,3.45,0.42,24),'#dfd3ba',cxL,17.88,czL,0,0,0,'stone');
        add(cyl(3.75,3.75,0.14,24),'#b9834b',cxL,18.14,czL,0,0,0,'timber');
        add(smoothTorus(3.96,0.10,8,32),'#d8ab4c',cxL,18.12,czL,Math.PI/2,0,0,false);
        // 8 ornate arched brass support brackets beneath Fresnel gallery platform
        for(var gb=0;gb<8;gb++){
          var ga2=gb*Math.PI/4, gc=Math.cos(ga2), gs=Math.sin(ga2);
          limb(cxL+gc*1.44,15.35,czL+gs*1.44, gc*2.25,2.35,gs*2.25, 3.25,0.14,0.11,'#c69638',false);
        }
        // Ornate brass balustrade around the Fresnel gallery
        add(smoothTorus(3.72,0.065,8,32),'#deb252',cxL,19.12,czL,Math.PI/2,0,0,false);
        add(smoothTorus(3.72,0.045,6,32),'#b88b36',cxL,18.66,czL,Math.PI/2,0,0,false);
        for(var gp=0;gp<16;gp++){
          var pa2=gp*Math.PI/8;
          add(cyl(0.045,0.055,0.94,6),'#c8993e',cxL+Math.cos(pa2)*3.72,18.65,czL+Math.sin(pa2)*3.72,0,0,0,false);
        }
        // Iconic Prismatic Brass & Crystal Fresnel Beacon Chamber (y = 18.2 -> 26.2)
        add(cyl(2.25,2.55,1.05,16),'#624c3a',cxL,18.72,czL,0,0,0,'stone');
        add(smoothTorus(2.32,0.11,8,24),'#d8ab4c',cxL,19.24,czL,Math.PI/2,0,0,false);
        // Radiant luminous warm-golden beacon lamp core (unlit so it glows cleanly below bloom blowout!)
        var coreMat=own(new T.MeshBasicMaterial({color:'#fff0b2'}));
        var coreCyl=mesh(cyl(1.12,1.12,4.45,20),coreMat,cxL,21.85,czL); root.add(coreCyl);
        var coreOrb=mesh(ball(1.26,18,14),own(new T.MeshBasicMaterial({color:'#ffe48a'})),cxL,21.85,czL); root.add(coreOrb);
        // Concentric outer crystal glass prism drum & brass meridian mullions
        add(smoothTorus(2.22,0.12,8,28),'#c69638',cxL,19.45,czL,Math.PI/2,0,0,false);
        add(smoothTorus(2.22,0.10,8,28),'#d8ab4c',cxL,21.85,czL,Math.PI/2,0,0,false);
        add(smoothTorus(2.22,0.12,8,28),'#c69638',cxL,24.30,czL,Math.PI/2,0,0,false);
        for(var fm=0;fm<8;fm++){
          var ma=fm*Math.PI/4;
          add(cyl(0.085,0.095,5.05,8),'#c49438',cxL+Math.cos(ma)*2.24,21.88,czL+Math.sin(ma)*2.24,0,0,0,false);
        }
        // 4 Cardinal Concentric Bull's-Eye Crystal Fresnel Lens Assemblies (0, 90, 180, 270 deg)
        for(var fl=0;fl<4;fl++){
          var fa2=fl*Math.PI/2, fcx=cxL+Math.cos(fa2)*2.12, fcz=czL+Math.sin(fa2)*2.12;
          var lensGrp=new T.Group(); lensGrp.position.set(fcx,21.85,fcz); lensGrp.rotation.y=-fa2+Math.PI/2;
          [0.42,0.82,1.22,1.62].forEach(function(lr,li){
            var ringC=li%2?'#c8f6fb':'#e4fdff';
            var lRing=mesh(smoothTorus(lr,0.095,8,24),M(ringC),0,0,0); lensGrp.add(lRing);
          });
          var bFrame=mesh(smoothTorus(1.74,0.11,8,24),M('#d8ab4c'),0,0,0); lensGrp.add(bFrame);
          var bull=mesh(ball(0.36,14,10),own(new T.MeshBasicMaterial({color:'#fff9d6'})),0,0,0.08);
          bull.scale.set(1,1,0.45); lensGrp.add(bull);
          root.add(lensGrp);
        }
        // Crimson & Burnished-Brass Fresnel Cupola Roof + Gilded Finial Spire reaching to y = 36.6
        add(cyl(2.65,2.35,0.45,16),'#564038',cxL,24.58,czL,0,0,0,false);
        add(cone(2.85,3.25,16),'#cf5c52',cxL,26.42,czL,0,0,0,'roof');
        add(smoothTorus(2.74,0.12,8,24),'#d8ab4c',cxL,24.85,czL,Math.PI/2,0,0,false);
        add(smoothTorus(1.65,0.09,8,24),'#d8ab4c',cxL,26.18,czL,Math.PI/2,0,0,false);
        smoothOrb(0.56,'#e4ba58',cxL,28.25,czL,false);
        add(cyl(0.08,0.22,7.6,10),'#d8ab4c',cxL,32.15,czL,0,0,0,false);
        smoothOrb(0.36,'#ffe894',cxL,36.15,czL,false);
        addObstacle(cxL,czL,6.35);
      })();

      // =========================================================================
      // 4. CANTILEVERED 3D HELICAL SPIRAL STAIRCASE (y = 0 -> 22.0)
      //    4 Crisp Stepped Risers/Span (Dark-Oak Riser Fronts + Bright Oak Treads)
      // =========================================================================
      (function buildSpiralStaircase(){
        var stairG0=curRoot.children.length;
        var SUB=4, stairW=lh.stairWidth||3.5, halfW=stairW*0.5, railRIn=halfW+0.04, railROut=halfW+0.04;
        // Identify branch junction & landing opening spans so railings open gracefully onto every balcony
        var innerOpen={}, outerOpen={};
        if(lh.hanaLanding && lh.hanaLanding.space!=null){
          innerOpen[lh.hanaLanding.space]=true;
          if(lh.hanaLanding.space>0) innerOpen[lh.hanaLanding.space-1]=true;
        }
        if(lh.shopLanding && lh.shopLanding.space!=null){
          outerOpen[lh.shopLanding.space]=true;
          if(lh.shopLanding.space>0) outerOpen[lh.shopLanding.space-1]=true;
        }
        // Check which side each branch exits from its fork
        var branchGroups={};
        for(var bi=main.length;bi<sp.length;bi++){
          var bs=sp[bi];
          (branchGroups[bs.branch]||(branchGroups[bs.branch]=[])).push(bs);
        }
        Object.keys(branchGroups).forEach(function(bk){
          var br=branchGroups[bk], fk=sp[br[0].jn];
          if(!fk) return;
          var rF=Math.hypot(fk.x-cxL,fk.z-czL), rB=Math.hypot(br[0].x-cxL,br[0].z-czL);
          if(rB<rF){ innerOpen[fk.i]=true; if(fk.i>0) innerOpen[fk.i-1]=true; }
          else { outerOpen[fk.i]=true; if(fk.i>0) outerOpen[fk.i-1]=true; }
        });
        // Polar unwrap helper so interpolation between consecutive spaces never jumps across +/-PI
        var polarMain=main.map(function(s){ return polarPt(s); });
        for(var pi=1;pi<polarMain.length;pi++){
          var da=polarMain[pi].ang-polarMain[pi-1].ang;
          while(da>Math.PI) da-=Math.PI*2;
          while(da<-Math.PI) da+=Math.PI*2;
          polarMain[pi].ang=polarMain[pi-1].ang+da;
        }
        function sampleHelix(i,t){
          var p0=polarMain[i], p1=polarMain[i+1], y0=main[i].y||0, y1=main[i+1].y||0;
          var r=p0.r+(p1.r-p0.r)*t, ang=p0.ang+(p1.ang-p0.ang)*t, y=y0+(y1-y0)*t;
          var ca=Math.cos(ang), sa=Math.sin(ang);
          return { x:cxL+r*ca, y:y, z:czL+r*sa, r:r, ang:ang, nx:ca, nz:sa, tx:sa, tz:-ca };
        }
        var prevIn=null, prevOut=null, prevStrIn=null, prevStrOut=null;
        for(var i=0;i<main.length-1;i++){
          var ySpan0=main[i].y||0, ySpan1=main[i+1].y||0, spanRise=Math.max(0.12,ySpan1-ySpan0);
          var spanDist=Math.hypot(main[i+1].x-main[i].x,main[i+1].z-main[i].z)||4.8;
          var stepDepth=Math.max(1.22,spanDist/SUB+0.24), stepRise=spanRise/SUB;
          for(var sub=0;sub<SUB;sub++){
            var tMid=(sub+0.5)/SUB, pt=sampleHelix(i,tMid);
            // Discrete stair-step elevation so every span reads unmistakably as 4 real architectural steps!
            var yTop=ySpan0+spanRise*((sub+0.78)/SUB)+treadOff, treadH=0.11, yaw=Math.atan2(pt.tx,pt.tz);
            // 1. Bright sunlit warm honey-oak horizontal tread slab
            var oakCol=((i*SUB+sub)%2)?'#dea966':'#d39d5b';
            var tread=wornBox(stairW+0.26,treadH,stepDepth,oakCol,pt.x,yTop-treadH*0.5,pt.z,'timber');
            tread.rotation.y=yaw; tread.userData.reefGround=true;
            // 2. High-contrast deep roasted dark-oak vertical riser front on the CAMERA-FACING (-pt.tx, -pt.tz) ascending face!
            var riserH=Math.max(0.24,stepRise+0.14), frontOff=stepDepth*0.44;
            var rxF=pt.x-pt.tx*frontOff, rzF=pt.z-pt.tz*frontOff;
            var riser=block(stairW+0.18,riserH,0.16,'#4d2e19',rxF,yTop-treadH-riserH*0.5+0.04,rzF,yaw,'timber');
            riser.userData.reefGround=true;
            // 3. Crisp burnished-brass step nosing bar crowning the camera-facing front lip of every tread
            var noseLip=block(stairW+0.28,0.045,0.09,'#e6bd5e',pt.x-pt.tx*(stepDepth*0.48),yTop-0.015,pt.z-pt.tz*(stepDepth*0.48),yaw,false);
            noseLip.userData.reefGround=true;
            // Continuous angled twin dark-oak carriage stringers underneath inner & outer tread edges
            var sIx=pt.x-pt.nx*(halfW-0.25), sIz=pt.z-pt.nz*(halfW-0.25);
            var sOx=pt.x+pt.nx*(halfW-0.25), sOz=pt.z+pt.nz*(halfW-0.25);
            var sY=yTop-treadH-riserH*0.65;
            if(prevStrIn){
              var lIn=Math.hypot(sIx-prevStrIn[0],sY-prevStrIn[1],sIz-prevStrIn[2]);
              if(lIn>0.05) limb(prevStrIn[0],prevStrIn[1],prevStrIn[2],sIx-prevStrIn[0],sY-prevStrIn[1],sIz-prevStrIn[2],lIn,0.17,0.17,'#684023','timber');
              var lOut=Math.hypot(sOx-prevStrOut[0],sY-prevStrOut[1],sOz-prevStrOut[2]);
              if(lOut>0.05) limb(prevStrOut[0],prevStrOut[1],prevStrOut[2],sOx-prevStrOut[0],sY-prevStrOut[1],sOz-prevStrOut[2],lOut,0.17,0.17,'#684023','timber');
            }
            prevStrIn=[sIx,sY,sIz]; prevStrOut=[sOx,sY,sOz];
          }
          // Handrail posts & continuous brass/rope spans at space i and mid-span (i + 0.5)
          [0, 0.5].forEach(function(frac){
            var hp=sampleHelix(i,frac), yP=hp.y+treadOff;
            var inX=hp.x-hp.nx*railRIn, inZ=hp.z-hp.nz*railRIn;
            var outX=hp.x+hp.nx*railROut, outZ=hp.z+hp.nz*railROut;
            var skipIn=!!innerOpen[i], skipOut=!!outerOpen[i];
            if(!skipIn){
              railPost(inX,yP,inZ,frac===0 && i%4===0);
              if(prevIn && Math.hypot(inX-prevIn[0],inZ-prevIn[2])<4.2) railSpan(prevIn[0],prevIn[1],prevIn[2],inX,yP,inZ);
              prevIn=[inX,yP,inZ];
            } else { prevIn=null; }
            if(!skipOut){
              railPost(outX,yP,outZ,frac===0 && i%4===2);
              if(prevOut && Math.hypot(outX-prevOut[0],outZ-prevOut[2])<4.2) railSpan(prevOut[0],prevOut[1],prevOut[2],outX,yP,outZ);
              prevOut=[outX,yP,outZ];
            } else { prevOut=null; }
          });
        }
        // Final top tread & end posts at goal space main[main.length - 1]
        var lastS=main[main.length-1], lastF=spiralFrame(main.length-1), lastY=lastS.y+treadOff;
        var lastTread=wornBox(stairW+0.35,0.26,2.3,'#be874e',lastS.x,lastY-0.13,lastS.z,'timber');
        lastTread.rotation.y=Math.atan2(lastF.tx,lastF.tz); lastTread.userData.reefGround=true;
        if(prevIn){
          var eInX=lastS.x-lastF.nx*railRIn, eInZ=lastS.z-lastF.nz*railRIn;
          railPost(eInX,lastY,eInZ,true);
          railSpan(prevIn[0],prevIn[1],prevIn[2],eInX,lastY,eInZ);
        }
        if(prevOut){
          var eOutX=lastS.x+lastF.nx*railROut, eOutZ=lastS.z+lastF.nz*railROut;
          railPost(eOutX,lastY,eOutZ,true);
          railSpan(prevOut[0],prevOut[1],prevOut[2],eOutX,lastY,eOutZ);
        }

        // Per-space carved stone tile pedestals, sculpted stone corbels, wall flying buttresses & grounded columns!
        for(var si=0;si<main.length;si++){
          var s=main[si], sf=spiralFrame(si), sy=s.y||0, yUnder=sy+treadOff-0.24;
          var big=s.kind==='deck'||s.kind==='treasure'||s.kind==='story'||s.kind==='start'||s.kind==='shop';
          var pedR=big?1.44:1.06, pedH=(sy+0.008)-(sy+treadOff-0.02);
          // Carved beveled coastal limestone tile plinth + brass collar meeting tile bottom flush at s.y!
          add(cyl(pedR,pedR+0.12,pedH,16),'#e2d7bf',s.x,sy+treadOff-0.02+pedH*0.5,s.z,0,0,0,'stone').userData.reefGround=true;
          add(smoothTorus(pedR+0.03,0.04,6,20),'#d8aa4a',s.x,sy-0.02,s.z,Math.PI/2,0,0,false);
          // Sculpted 3-tier limestone corbel bracket directly beneath the oak stair carriage
          stoneCorbel(s.x,yUnder,s.z,sf.nx,sf.nz,1.15,stairW*0.78);
          if(sy<1.35){
            // Ground-level solid stepped limestone masonry ramp plinth seated solidly on floorY (zero floating!)
            var gH=Math.max(0.22,yUnder-floorY+0.06);
            var gPlinth=wornBox(stairW+0.05,gH,2.4,'#cfc2a7',s.x,floorY-0.02+gH*0.5,s.z,'stone');
            gPlinth.rotation.y=Math.atan2(sf.tx,sf.tz);
          } else {
            var isOuterTurn=(sf.r>=rBottom-5.2);
            if(isOuterTurn){
              // Flying arched stone buttress connecting Turn 1 stair corbel cleanly into the curved rotunda wall!
              if(si%2===0){
                var rw=rWallAt(sy-1.65)+0.35;
                var wx0=s.x+sf.nx*1.25, wy0=yUnder-0.42, wz0=s.z+sf.nz*1.25;
                var wx1=cxL+sf.nx*rw, wy1=Math.max(floorY+0.4,yUnder-1.55), wz1=czL+sf.nz*rw;
                var blen=Math.hypot(wx1-wx0,wy1-wy0,wz1-wz0);
                if(blen>0.2){
                  limb(wx0,wy0,wz0,wx1-wx0,wy1-wy0,wz1-wz0,blen,0.28,0.34,'#cbbda2','stone');
                  // Carved stone wall corbel console anchoring the strut into the masonry wall
                  wornBox(0.92,0.86,0.96,'#bfb094',wx1-sf.nx*0.45,wy1-0.22,wz1-sf.nz*0.45,'stone').rotation.y=Math.atan2(sf.nx,sf.nz);
                }
              }
              // Grounded fluted limestone structural column on every 3rd outer space
              if(si%3===0){
                var cOx=s.x+sf.nx*1.32, cOz=s.z+sf.nz*1.32;
                if(columnClearOfSpaces(cOx,cOz,yUnder,2.15)) stoneColumn(cOx,cOz,yUnder-0.06,0.34);
              }
            } else {
              // Inner upper Turn 2: tall fluted classical limestone atrium columns reaching straight to floorY
              // whenever clear of spaces (no floating mid-window flying-buttress struts or corbel boxes).
              if(si%2===1 || si===main.length-1){
                if(columnClearOfSpaces(s.x,s.z,yUnder,2.35)){
                  stoneColumn(s.x,s.z,yUnder-0.08,0.36);
                } else {
                  var altX=s.x-sf.nx*1.15, altZ=s.z-sf.nz*1.15;
                  if(columnClearOfSpaces(altX,altZ,yUnder,2.2)){
                    stoneColumn(altX,altZ,yUnder-0.08,0.34);
                  } else {
                    var altX2=s.x+sf.nx*1.15, altZ2=s.z+sf.nz*1.15;
                    if(columnClearOfSpaces(altX2,altZ2,yUnder,2.2)){
                      stoneColumn(altX2,altZ2,yUnder-0.08,0.34);
                    }
                  }
                }
              }
            }
          }
        }

        // --- Branch Cantilevered Balconies ('treasure' & 'story') ---
        Object.keys(branchGroups).forEach(function(bk){
          var br=branchGroups[bk], fk=sp[br[0].jn];
          if(!fk) return;
          var chain=[fk].concat(br), by=fk.y||0, yDeck=by+treadOff, ySub=yDeck-0.26;
          for(var ci=0;ci<chain.length-1;ci++){
            var a=chain[ci], b=chain[ci+1], dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
            var ang=Math.atan2(dx,dz), mx=(a.x+b.x)*0.5, mz=(a.z+b.z)*0.5;
            var nxB=-dz/len, nzB=dx/len;
            // Level cantilevered oak balcony deck + twin dark-oak stringer beams
            var dk=wornBox(3.35,0.24,len+0.65,'#bc854d',mx,yDeck-0.12,mz,'timber');
            dk.rotation.y=ang; dk.userData.reefGround=true;
            [-1.38,1.38].forEach(function(sd){
              limb(a.x+nxB*sd,ySub-0.06,a.z+nzB*sd,dx,0,dz,len,0.14,0.14,'#73492a','timber');
              // Balcony side railings (skip the first half-span touching the main staircase on ci===0)
              var t0=ci===0?0.36:0.0;
              var rx0=a.x+dx*t0+nxB*(sd*1.18), rz0=a.z+dz*t0+nzB*(sd*1.18);
              var rx1=b.x+nxB*(sd*1.18), rz1=b.z+nzB*(sd*1.18);
              railPost(rx1,yDeck,rz1,ci===chain.length-2);
              railSpan(rx0,yDeck,rz0,rx1,yDeck,rz1);
            });
          }
          // Per-branch space tile plinth, stone corbel, and grounded column
          br.forEach(function(bs,bi2){
            var bigB=bs.kind==='treasure'||bs.kind==='story'||bs.kind==='deck';
            var pedRB=bigB?1.44:1.06, pedHB=(by+0.008)-(yDeck-0.02);
            add(cyl(pedRB,pedRB+0.12,pedHB,16),'#e2d7bf',bs.x,yDeck-0.02+pedHB*0.5,bs.z,0,0,0,'stone').userData.reefGround=true;
            add(smoothTorus(pedRB+0.03,0.04,6,20),'#d8aa4a',bs.x,by-0.02,bs.z,Math.PI/2,0,0,false);
            var bp=polarPt(bs);
            stoneCorbel(bs.x,ySub,bs.z,bp.ux,bp.uz,1.1,2.5);
            if(bi2===0 || bi2===br.length-1){
              if(columnClearOfSpaces(bs.x,bs.z,ySub,2.3)) stoneColumn(bs.x,bs.z,ySub-0.06,0.34);
            }
          });
          // Rounded balcony end-cap & curved end railing around the prize space
          var endS=br[br.length-1], prevS=chain[chain.length-2];
          var edx=endS.x-prevS.x, edz=endS.z-prevS.z, elen=Math.hypot(edx,edz)||1;
          edx/=elen; edz/=elen;
          add(cyl(2.05,2.15,0.26,18),'#be874e',endS.x,yDeck-0.13,endS.z,0,0,0,'timber').userData.reefGround=true;
          var eAng0=Math.atan2(edz,edx), prevEnd=null;
          for(var ea=-2;ea<=2;ea++){
            var aE=eAng0+ea*(Math.PI*0.24), exP=endS.x+Math.cos(aE)*1.96, ezP=endS.z+Math.sin(aE)*1.96;
            railPost(exP,yDeck,ezP,ea===0);
            if(prevEnd) railSpan(prevEnd[0],yDeck,prevEnd[1],exP,yDeck,ezP);
            prevEnd=[exP,ezP];
          }
        });
        compactRootRange(stairG0, cxL, 0, czL, 0);
      })();

      // =========================================================================
      // 5. HANA CRYSTAL TIDEPOOL BALCONY, BOK MERCHANT ALCOVE & UPPER BOK GALLERY
      // =========================================================================
      // --- A. Hana's Elevated Mid-Stair Cantilevered Crystal Tidepool Balcony (lh.hanaLanding off spaces[4]) ---
      if(lh.hanaLanding){
        var hl=lh.hanaLanding, hs=sp[hl.space]||main[4]||main[1]||main[0];
        var hFloor=hl.floorY, hWatY=hl.y, hR=hl.radius||2.55;
        // Warm honey-oak connecting bridge from spaces[4] flush onto the cantilevered balcony deck (hFloor ~ 2.384)
        var bDx=hl.x-hs.x, bDz=hl.z-hs.z, bLen=Math.hypot(bDx,bDz)||1;
        var hBridge=wornBox(2.55,0.24,bLen,'#d49f5d',(hl.x+hs.x)*0.5,hFloor-0.12,(hl.z+hs.z)*0.5,'timber');
        hBridge.rotation.y=Math.atan2(bDx,bDz); hBridge.userData.reefGround=true;
        // Dark-oak under-stringers bracing the cantilevered bridge cleanly
        var bNx=-bDz/bLen, bNz=bDx/bLen;
        [-1.02,1.02].forEach(function(sdB){
          limb(hs.x+bNx*sdB,hFloor-0.28,hs.z+bNz*sdB,bDx,0,bDz,bLen,0.12,0.12,'#5e3b22','timber');
        });
        // Carved multi-tier cantilevered limestone balcony slab + burnished-brass cornice ring
        add(cyl(hR,hR+0.14,0.24,28),'#e5dac2',hl.x,hFloor-0.12,hl.z,0,0,0,'stone').userData.reefGround=true;
        add(cyl(hR-0.22,hR-0.55,0.26,24),'#cfc1a5',hl.x,hFloor-0.36,hl.z,0,0,0,'stone');
        add(smoothTorus(hR+0.06,0.065,8,28),'#d8ab4c',hl.x,hFloor-0.02,hl.z,Math.PI/2,0,0,false);
        // Sculpted 4-way flaring limestone corbels + sleek fluted classical stone support pier down to floorY
        // (open air underneath the wide cantilevered slab makes Hana's mid-stair elevation unmistakable!)
        for(var corI=0;corI<4;corI++){
          var cAng=Math.atan2(bDz,bDx)+corI*Math.PI*0.5;
          stoneCorbel(hl.x+Math.cos(cAng)*1.02,hFloor-0.44,hl.z+Math.sin(cAng)*1.02,Math.cos(cAng),Math.sin(cAng),0.86,1.65);
        }
        var pierTop=hFloor-0.46, pierH=Math.max(0.30,pierTop-floorY);
        add(cyl(1.15,0.82,0.28,18),'#dfd3ba',hl.x,pierTop-0.14,hl.z,0,0,0,'stone');
        if(pierH>0.55){
          var pShaftBot=floorY+0.34, pShaftTop=pierTop-0.26, pShaftH=Math.max(0.20,pShaftTop-pShaftBot);
          add(cyl(0.74,0.86,pShaftH,16),'#e8dec8',hl.x,pShaftBot+pShaftH*0.5,hl.z,0,0,0,'stone');
          add(smoothTorus(0.84,0.07,8,20),'#d4a648',hl.x,pShaftBot+pShaftH*0.5,hl.z,Math.PI/2,0,0,false);
          add(cyl(1.06,1.24,0.20,16),'#cbbda2',hl.x,floorY+0.10,hl.z,0,0,0,'stone');
          add(cyl(0.92,1.08,0.18,16),'#dfd3ba',hl.x,floorY+0.27,hl.z,0,0,0,'stone');
        } else {
          add(cyl(0.86,1.02,pierH,16),'#cfc2a7',hl.x,floorY+pierH*0.5,hl.z,0,0,0,'stone');
        }
        addObstacle(hl.x,hl.z,1.35);
        // Open curved brass-and-rope balcony rail framing the far/back arc while keeping camera-front & bridge 100% open for Hana!
        var backArcBase=Math.atan2(bDz,bDx)+0.65, prevHPost=null;
        for(var hpI=0;hpI<=4;hpI++){
          var aH=backArcBase+hpI*0.42;
          var pxH=hl.x+Math.cos(aH)*(hR-0.14), pzH=hl.z+Math.sin(aH)*(hR-0.14);
          railPost(pxH,hFloor,pzH,hpI===0 || hpI===4);
          if(prevHPost) railSpan(prevHPost[0],hFloor,prevHPost[1],pxH,hFloor,pzH);
          prevHPost=[pxH,pzH];
        }
        // Recessed glowing coastal crystal tidepool directly beneath Keeper Hana (water surface = hl.y)
        add(cyl(1.56,1.66,0.12,24),'#b9c7bf',hl.x,hFloor+0.02,hl.z,0,0,0,'stone').userData.reefGround=true;
        var hpWat=mesh(cyl(1.46,1.46,0.06,24),own(new T.MeshBasicMaterial({color:'#36cbd6'})),hl.x,hWatY-0.03,hl.z);
        hpWat.userData.reefGround=true; root.add(hpWat);
        add(smoothTorus(1.49,0.07,6,24),'#e6ddc6',hl.x,hWatY+0.02,hl.z,Math.PI/2,0,0,'stone');
        add(smoothTorus(0.96,0.040,6,20),'#bcfbf7',hl.x,hWatY+0.016,hl.z,Math.PI/2,0,0,false);
        // Delicate coastal pearls & petite aqua crystals hugging the back rim (clear of Hana & camera!)
        for(var hc=0;hc<6;hc++){
          var hca=Math.atan2(bDz,bDx)-0.9+hc*0.36;
          pebble(hl.x+Math.cos(hca)*1.66,hFloor,hl.z+Math.sin(hca)*1.66,0.18,hc%2?'#dfd4bc':'#c5b89e');
        }
        crystal(hl.x+hl.nx*1.90,hFloor,hl.z+hl.nz*1.90,0.50,'#78f4ec');
      }

      // --- B. Bok's Grounded Merchant Alcove Balcony (lh.shopLanding, flush at y = shop.y) ---
      if(lh.shopLanding){
        var sl=lh.shopLanding, ss=sp[sl.space], sY=sl.floorY, sYaw=Math.atan2(sl.tx,sl.tz);
        // Broad cantilevered warm-oak & carved-stone merchant alcove platform (flush at exact shop.y!)
        var shDeck=wornBox(4.8,0.34,6.4,'#bc854d',sl.x,sY-0.17,sl.z,'timber');
        shDeck.rotation.y=sYaw; shDeck.userData.reefGround=true;
        var shRim=wornBox(5.05,0.22,6.65,'#d9cdb4',sl.x,sY-0.36,sl.z,'stone');
        shRim.rotation.y=sYaw;
        // Two carved oak threshold steps rising cleanly from the spiral staircase (shop.y - 0.28) up to shop.y!
        var stepX1=ss.x+sl.ux*1.45, stepZ1=ss.z+sl.uz*1.45;
        var stp1=wornBox(0.62,0.16,3.1,'#b57e46',stepX1,sY-0.21,stepZ1,'timber');
        stp1.rotation.y=sYaw; stp1.userData.reefGround=true;
        var stepX2=ss.x+sl.ux*1.82, stepZ2=ss.z+sl.uz*1.82;
        var stp2=wornBox(0.62,0.26,3.1,'#be874e',stepX2,sY-0.13,stepZ2,'timber');
        stp2.rotation.y=sYaw; stp2.userData.reefGround=true;
        // Sculpted stone corbels + twin fluted limestone columns + outer wall brackets grounding the balcony
        stoneCorbel(sl.x-sl.tx*1.8,sY-0.46,sl.z-sl.tz*1.8,sl.ux,sl.uz,1.3,3.8);
        stoneCorbel(sl.x+sl.tx*1.8,sY-0.46,sl.z+sl.tz*1.8,sl.ux,sl.uz,1.3,3.8);
        [-1.85,1.85].forEach(function(toff){
          var cxS=sl.x+sl.tx*toff, czS=sl.z+sl.tz*toff;
          if(columnClearOfSpaces(cxS,czS,sY-0.46,2.1)) stoneColumn(cxS,czS,sY-0.46,0.36);
        });
        // Guardrails along the two open tangential drop-off edges (keeping front stairs & stall/Bok footprint 100% clear!)
        [-3.05,3.05].forEach(function(sideT){
          var pInX=sl.x+sl.tx*sideT-sl.ux*2.15, pInZ=sl.z+sl.tz*sideT-sl.uz*2.15;
          var pOutX=sl.x+sl.tx*sideT+sl.ux*2.15, pOutZ=sl.z+sl.tz*sideT+sl.uz*2.15;
          railPost(pInX,sY,pInZ,true);
          railPost(pOutX,sY,pOutZ,false);
          railSpan(pInX,sY,pInZ,pOutX,sY,pOutZ);
        });
      }

      // --- C. Cozy Upper Bok Gallery / Observatory Landing (lh.goalGallery, y = 18.0) ---
      if(lh.goalGallery){
        var gg=lh.goalGallery, gs=sp[gg.space]||main[main.length-1], gY=gg.floorY, gYaw=Math.atan2(gg.tx,gg.tz);
        // Grand cantilevered warm-oak & stone observatory gallery terrace wrapping the upper/goal landing!
        var galDeck=wornBox(5.4,0.36,6.8,'#c18a50',gg.x,gY-0.18,gg.z,'timber');
        galDeck.rotation.y=gYaw; galDeck.userData.reefGround=true;
        var galRim=wornBox(5.7,0.24,7.1,'#dfd3ba',gg.x,gY-0.38,gg.z,'stone');
        galRim.rotation.y=gYaw;
        // Two smooth carved oak steps bridging from goal space stair tread (18.0 - 0.28) up onto the y = 18.0 gallery deck!
        var gb1x=gs.x+gg.tx*1.35, gb1z=gs.z+gg.tz*1.35;
        wornBox(3.4,0.18,0.65,'#b78048',gb1x,gY-0.20,gb1z,'timber').rotation.y=gYaw;
        var gb2x=gs.x+gg.tx*1.85, gb2z=gs.z+gg.tz*1.85;
        wornBox(3.4,0.28,0.65,'#c18a50',gb2x,gY-0.14,gb2z,'timber').rotation.y=gYaw;
        // Sculpted stone corbels + twin tall classical limestone columns grounding the upper gallery solidly to floorY!
        stoneCorbel(gg.x-gg.tx*1.5,gY-0.50,gg.z-gg.tz*1.5,gg.ux,gg.uz,1.4,4.2);
        stoneCorbel(gg.x+gg.tx*1.5,gY-0.50,gg.z+gg.tz*1.5,gg.ux,gg.uz,1.4,4.2);
        [-1.7,1.7].forEach(function(gt){
          var gcx=gg.x+gg.tx*gt, gcz=gg.z+gg.tz*gt;
          if(columnClearOfSpaces(gcx,gcz,gY-0.50,2.3)) stoneColumn(gcx,gcz,gY-0.50,0.38);
        });
        // Short curved timber-and-brass Observatory Lookout Bridge jutting inward toward the Fresnel Beacon Gallery!
        var brInX=gg.x-gg.ux*3.8, brInZ=gg.z-gg.uz*3.8;
        var skyBr=wornBox(2.4,0.28,3.6,'#b9834b',gg.x-gg.ux*3.6,gY-0.14,gg.z-gg.uz*3.6,'timber');
        skyBr.rotation.y=Math.atan2(-gg.ux,-gg.uz); skyBr.userData.reefGround=true;
        // Arched brass brace supporting the lookout bridge from underneath
        limb(gg.x-gg.ux*2.4,gY-2.2,gg.z-gg.uz*2.4, -gg.ux*2.6,1.95,-gg.uz*2.6, 3.25,0.13,0.11,'#c69638',false);
        // Perimeter brass-and-rope balustrade wrapping the upper gallery & lookout bridge
        var galCorners=[
          [gg.x+gg.ux*2.55-gg.tx*3.15, gg.z+gg.uz*2.55-gg.tz*3.15, true],
          [gg.x+gg.ux*2.55+gg.tx*3.15, gg.z+gg.uz*2.55+gg.tz*3.15, true],
          [gg.x-gg.ux*2.55+gg.tx*3.15, gg.z-gg.uz*2.55+gg.tz*3.15, true],
          [gg.x-gg.ux*2.55+gg.tx*1.25, gg.z-gg.uz*2.55+gg.tz*1.25, false],
          [brInX-gg.ux*1.45+gg.tx*1.12, brInZ-gg.uz*1.45+gg.tz*1.12, true],
          [brInX-gg.ux*1.45-gg.tx*1.12, brInZ-gg.uz*1.45-gg.tz*1.12, true],
          [gg.x-gg.ux*2.55-gg.tx*1.25, gg.z-gg.uz*2.55-gg.tz*1.25, false]
        ];
        for(var gcI=0;gcI<galCorners.length;gcI++){
          var pA=galCorners[gcI];
          railPost(pA[0],gY,pA[1],pA[2]);
          if(gcI<galCorners.length-1){
            var pB=galCorners[gcI+1];
            railSpan(pA[0],gY,pA[1],pB[0],gY,pB[1]);
          }
        }
        // Cozy Bok Observatory Gallery furnishings tucked cleanly along the outer gallery perimeter
        var gFurn0=root.children.length;
        // 1. Striped crimson-and-cream coastal awning canopy nook
        [-1.35,1.35].forEach(function(px){
          post(0.075,2.45,'#6f492e',gg.x+px,gY,gg.z+1.75);
          smoothOrb(0.11,'#e3ba58',gg.x+px,gY+2.52,gg.z+1.75,false);
        });
        for(var aw=-3;aw<=3;aw++){
          var awC=aw%2?'#faf0d2':'#cf5c52';
          var slp=block(0.45,0.10,1.65,awC,gg.x+aw*0.45,gY+2.36,gg.z+1.35,0,'fabric');
          slp.rotation.x=0.22;
          add(cyl(0.22,0.22,0.08,10),awC,gg.x+aw*0.45,gY+2.18,gg.z+0.58,Math.PI/2,0,0,'fabric');
        }
        // 2. Carved oak lighthouse keeper's chart desk + rolled sea map + glowing brass lantern
        wornBox(1.55,0.82,0.86,'#8d5b37',gg.x-0.35,gY+0.41,gg.z+1.65,'timber');
        wornBox(1.70,0.09,0.98,'#c9965c',gg.x-0.35,gY+0.85,gg.z+1.65,'timber');
        block(1.05,0.03,0.62,'#f7ebd0',gg.x-0.42,gY+0.91,gg.z+1.62,0.08,'fabric');
        add(cyl(0.065,0.065,0.48,8),'#f5e8c8',gg.x+0.15,gY+0.96,gg.z+1.72,0,0.2,Math.PI/2,'fabric');
        add(cyl(0.14,0.18,0.08,10),'#b88834',gg.x+0.30,gY+0.94,gg.z+1.45,0,0,0,false);
        add(cyl(0.13,0.12,0.26,10),'#f7d982',gg.x+0.30,gY+1.11,gg.z+1.45,0,0,0,false);
        smoothOrb(0.08,'#fff4c2',gg.x+0.30,gY+1.11,gg.z+1.45,false);
        add(cone(0.18,0.14,10),'#cf5c52',gg.x+0.30,gY+1.31,gg.z+1.45,0,0,0,'roof');
        // 3. Burnished-brass observatory spyglass on walnut tripod
        var sTx=gg.x+1.38, sTz=gg.z+0.55;
        for(var tL=0;tL<3;tL++){
          var ta=tL*Math.PI*2/3+0.4;
          limb(sTx+Math.cos(ta)*0.26,gY,sTz+Math.sin(ta)*0.26,-Math.cos(ta)*0.24,1.08,-Math.sin(ta)*0.24,1.12,0.035,0.025,'#6b472d','timber');
        }
        add(cyl(0.08,0.09,0.12,8),'#d6a84a',sTx,gY+1.08,sTz,0,0,0,false);
        limb(sTx,gY+1.08,sTz,0.3,0.22,-0.88,0.78,0.048,0.082,'#e2b958',false);
        // 4. Stacked brass-strapped lantern crates & cozy bench tucked cleanly along outer wall corner
        crate(gg.x-1.88,gY,gg.z+1.55,0.92);
        crate(gg.x-1.88,gY+0.54,gg.z+1.55,0.66);
        bench(gg.x-1.55,gY,gg.z-0.35,Math.PI/2);
        var galFurnGrp=new T.Group(), galOrg=new T.Vector3(gg.x,gY,gg.z);
        root.children.slice(gFurn0).forEach(function(p){ p.position.sub(galOrg); galFurnGrp.add(p); });
        galFurnGrp.position.copy(galOrg); galFurnGrp.rotation.y=Math.atan2(gg.ux,gg.uz); root.add(galFurnGrp);
      }

      // =========================================================================
      // 6. SHEER, DEFINED SLANTING VOLUMETRIC GOLDEN GOD-RAY SHAFTS & BEACON CONES
      // =========================================================================
      (function buildSunbeams(){
        var beamTex=null;
        if(typeof document!=='undefined'){
          var bc=document.createElement('canvas'); bc.width=256; bc.height=256;
          var bctx=bc.getContext && bc.getContext('2d');
          if(bctx && typeof bctx.createImageData==='function'){
            var bImg=bctx.createImageData(256,256), bd=bImg.data;
            for(var py=0;py<256;py++){
              var v=py/255; // 0 = arched window origin, 1 = sunlit rotunda tail
              // Smooth entrance inside window frame tapering softly to 0 well before core column
              var vIn=Math.min(1,v/0.10);
              var vFade=(vIn*vIn*(3-2*vIn))*Math.pow(1-v,1.35);
              for(var px=0;px<256;px++){
                var u=(px/255)*2-1; // -1..1 across shaft width
                var au=Math.abs(u);
                // Softly feathered shaft boundary + 3 delicate arched-mullion sunlit pane rays
                var edge=au>=1.0 ? 0 : (au<=0.68 ? 1.0 : (1.0-au)/0.32);
                edge=edge*edge*(3-2*edge);
                var ray1=Math.exp(-Math.pow((u+0.48)/0.21,4));
                var ray2=Math.exp(-Math.pow((u-0.00)/0.23,4));
                var ray3=Math.exp(-Math.pow((u-0.48)/0.21,4));
                var streak=0.18+0.82*Math.max(ray1,Math.max(ray2,ray3));
                var alpha=Math.max(0,Math.min(1,edge*streak*vFade));
                var idx4=(py*256+px)*4;
                // Warm luminous pale-gold sunlight (airy sheer god-rays, zero yellow haze buildup)
                bd[idx4]=255; bd[idx4+1]=238; bd[idx4+2]=174; bd[idx4+3]=Math.round(alpha*255);
              }
            }
            bctx.putImageData(bImg,0,0);
            beamTex=new T.CanvasTexture(bc);
          }
        }
        // MIN 5: Sheer golden god-ray opacity (~0.115 day) with 2 orthogonal planes keeps shafts airy & crisp
        // with zero muddy yellow buildup over the striped central Fresnel core column!
        var beamMat=new T.MeshBasicMaterial({
          color:view.night?'#a8dcfa':'#ffea9e',
          map:beamTex,
          transparent:true,
          opacity:view.night?0.095:0.115,
          blending:T.NormalBlending,
          depthWrite:false,
          side:T.DoubleSide,
          fog:false
        });
        // 2-plane orthogonal volumetric light-shaft frustum (airy sheer visibility from every azimuth without 3-layer mud!)
        function makeBeamMesh(wTop,wBot,len){
          var bg=new T.BufferGeometry();
          var hw0=wTop*0.5, hw1=wBot*0.5, hL=len*0.5;
          var pos=[], uvs=[], idx=[];
          for(var p=0;p<2;p++){
            var pa=p*Math.PI*0.5, ca=Math.cos(pa), sa=Math.sin(pa), base=p*4;
            pos.push(
              -hw0*ca, hL,-hw0*sa,
               hw0*ca, hL, hw0*sa,
               hw1*ca,-hL, hw1*sa,
              -hw1*ca,-hL,-hw1*sa
            );
            uvs.push(0,0, 1,0, 1,1, 0,1);
            idx.push(base,base+1,base+2, base,base+2,base+3);
          }
          bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));
          bg.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
          bg.setIndex(idx);
          return new T.Mesh(bg,beamMat);
        }
        // MIN 5: Aim golden sunbeams cleanly from the visible sunlit east/southeast arched windows
        // (bays 11, 0, 1 across Tier 1 & Tier 2) diagonally into the sunlit rotunda & spiral stairs,
        // keeping every shaft strictly clear (minCoreR >= 13.7u, minScreenX >= 325px) of the striped core column!
        var sunSpecs=[
          { bay:11, yWin:10.6, ex:14.2, ey:1.4, ez:-2.2, w0:1.70, w1:3.25 },
          { bay:11, yWin:20.4, ex:16.5, ey:8.4, ez:-1.4, w0:1.80, w1:3.45 },
          { bay:0,  yWin:10.4, ex:14.2, ey:1.8, ez: 7.4, w0:1.72, w1:3.25 },
          { bay:0,  yWin:20.2, ex:17.5, ey:8.6, ez: 6.4, w0:1.80, w1:3.45 },
          { bay:1,  yWin:10.2, ex:15.5, ey:2.2, ez:15.0, w0:1.68, w1:3.15 }
        ];
        var upVec=new T.Vector3(0,1,0), dirVec=new T.Vector3();
        sunSpecs.forEach(function(sb){
          var wa=(sb.bay+0.5)*Math.PI*2/12, rw=rWallAt(sb.yWin)-0.25;
          var sx=cxL+Math.cos(wa)*rw, sy=sb.yWin, sz=czL+Math.sin(wa)*rw;
          var ex=cxL+sb.ex, ey=Math.max(floorY+0.35,sb.ey), ez=czL+sb.ez;
          dirVec.set(sx-ex,sy-ey,sz-ez);
          var useLen=dirVec.length();
          if(useLen<1) return;
          dirVec.divideScalar(useLen);
          var bm=makeBeamMesh(sb.w0,sb.w1,useLen);
          bm.position.set((sx+ex)*0.5,(sy+ey)*0.5,(sz+ez)*0.5);
          bm.quaternion.setFromUnitVectors(upVec,dirVec);
          bm.renderOrder=3;
          extras.add(bm);
        });
        // Two sheer sweeping Fresnel lighthouse beacon cones radiating from the central brass lens at y = 21.85
        var beaconMat=new T.MeshBasicMaterial({
          color:view.night?'#c8f0ff':'#ffeda6',
          map:beamTex,
          transparent:true,
          opacity:view.night?0.11:0.12,
          blending:T.NormalBlending,
          depthWrite:false,
          side:T.DoubleSide,
          fog:false
        });
        [0.45, 0.45+Math.PI].forEach(function(ba){
          var bCone=makeBeamMesh(1.85,5.4,24);
          bCone.material=beaconMat;
          var bx=cxL+Math.cos(ba)*13.8, bz=czL+Math.sin(ba)*13.8;
          dirVec.set(-Math.cos(ba),0.10,-Math.sin(ba)).normalize();
          bCone.position.set(bx,21.8,bz);
          bCone.quaternion.setFromUnitVectors(upVec,dirVec);
          bCone.renderOrder=3;
          extras.add(bCone);
        });
      })();

      // =========================================================================
      // 6B. BEYOND-MP8: SUSPENDED BRASS CELESTIAL ARMILLARY RINGS & IRIDESCENT
      //     SEA-GLASS PRISM PENDANTS IN THE HIGH SUNLIT ROTUNDA VAULT (y=22..32
      //     + SUNLIT UPPER ARCH BAYS, ZERO SIGHTLINE OBSTRUCTION!)
      // =========================================================================
      (function buildCelestialArmillaryVault(){
        var armGrp=new T.Group();
        armGrp.name='lighthouse-celestial-armillary-vault';
        var brassMatA=new T.MeshBasicMaterial({color:'#ecc460',fog:false});
        var brassMatB=new T.MeshBasicMaterial({color:'#cf9d3d',fog:false});
        var wireMat=new T.MeshBasicMaterial({color:'#d8b058',fog:false});
        var enamelMat=new T.MeshBasicMaterial({color:'#3eb4c2',fog:false});
        var starGoldMat=new T.MeshBasicMaterial({color:'#fff0a8',fog:false});
        var prismMats=[
          new T.MeshBasicMaterial({color:'#86fbf6',transparent:true,opacity:0.86,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#6ef2d0',transparent:true,opacity:0.84,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#ffe88a',transparent:true,opacity:0.86,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#d2c2ff',transparent:true,opacity:0.84,depthWrite:false,fog:false})
        ];
        var prismHaloMats=[
          new T.MeshBasicMaterial({color:'#a6fffb',transparent:true,opacity:0.26,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#9cfce0',transparent:true,opacity:0.24,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#fff2b0',transparent:true,opacity:0.26,depthWrite:false,fog:false}),
          new T.MeshBasicMaterial({color:'#e0d4ff',transparent:true,opacity:0.24,depthWrite:false,fog:false})
        ];
        var prismGeo=new T.OctahedronGeometry(1,0);
        var capGeo=new T.ConeGeometry(0.16,0.18,6);
        var beadGeo=new T.SphereGeometry(0.16,10,8);
        var haloGeo=new T.SphereGeometry(1,10,8);
        var rodGeo=new T.CylinderGeometry(1,1,1,6);
        var upAxis=new T.Vector3(0,1,0), vDir=new T.Vector3();
        function addBrassRod(x0,y0,z0,x1,y1,z1,rad,mat){
          vDir.set(x1-x0,y1-y0,z1-z0);
          var len=vDir.length(); if(len<0.05) return;
          vDir.divideScalar(len);
          var m=new T.Mesh(rodGeo,mat||wireMat);
          m.position.set((x0+x1)*0.5,(y0+y1)*0.5,(z0+z1)*0.5);
          m.scale.set(rad,len,rad);
          m.quaternion.setFromUnitVectors(upAxis,vDir);
          armGrp.add(m);
        }
        function addSeaGlassPrism(x,yTop,z,chainLen,sc,palIdx){
          var k=sc||1, pi=((palIdx%4)+4)%4, pY=yTop-chainLen;
          if(chainLen>0.08) addBrassRod(x,yTop,z,x,pY+0.34*k,z,0.022*Math.max(0.8,k*0.7),wireMat);
          var cap=new T.Mesh(capGeo,brassMatA);
          cap.position.set(x,pY+0.32*k,z); cap.scale.setScalar(k); armGrp.add(cap);
          var pr=new T.Mesh(prismGeo,prismMats[pi]);
          pr.position.set(x,pY,z); pr.scale.set(0.24*k,0.46*k,0.24*k); pr.rotation.y=palIdx*0.8; pr.renderOrder=2;
          armGrp.add(pr);
          var core=new T.Mesh(prismGeo,starGoldMat);
          core.position.set(x,pY,z); core.scale.set(0.10*k,0.22*k,0.10*k); core.rotation.y=palIdx*0.8+0.4;
          armGrp.add(core);
          var hl=new T.Mesh(haloGeo,prismHaloMats[pi]);
          hl.position.set(x,pY,z); hl.scale.set(0.46*k,0.62*k,0.46*k); hl.renderOrder=2;
          armGrp.add(hl);
        }
        // --- Tier A: Grand High Cupola Celestial Armillary Rings (y = 24.5..33.2) encircling the Fresnel Vault ---
        // Positioned strictly >= 3.8u above goalGallery (y = 22.0) and all 50 spaces for 100% zero obstruction!
        var grandCenterY=29.2;
        [
          { r:11.6, t:0.20, rx:Math.PI*0.5+0.24, ry:0.15, rz:0.18, mat:brassMatA, stars:8 },
          { r:13.8, t:0.18, rx:Math.PI*0.5-0.28, ry:0.92, rz:-0.20, mat:brassMatB, stars:10 },
          { r:15.8, t:0.15, rx:Math.PI*0.5+0.12, ry:-0.55, rz:0.14, mat:enamelMat, stars:12 }
        ].forEach(function(rk,ri){
          var ring=new T.Mesh(new T.TorusGeometry(rk.r,rk.t,8,56),rk.mat);
          ring.position.set(cxL,grandCenterY,czL);
          ring.rotation.set(rk.rx,rk.ry,rk.rz);
          armGrp.add(ring);
          // Second inner golden zodiac track hugging the turquoise enamel ring
          if(ri===2){
            var trimR=new T.Mesh(new T.TorusGeometry(rk.r-0.28,0.09,6,56),brassMatA);
            trimR.position.set(cxL,grandCenterY,czL); trimR.rotation.set(rk.rx,rk.ry,rk.rz);
            armGrp.add(trimR);
          }
          // Star medallions & suspended iridescent sea-glass prism pendants around the grand vault rings (y >= 25.8)
          var mQ=new T.Quaternion().setFromEuler(ring.rotation), lp=new T.Vector3();
          for(var si=0;si<rk.stars;si++){
            var sa=si*Math.PI*2/rk.stars+ri*0.4;
            lp.set(Math.cos(sa)*rk.r,Math.sin(sa)*rk.r,0).applyQuaternion(mQ);
            var wx=cxL+lp.x, wy=grandCenterY+lp.y, wz=czL+lp.z;
            var st=new T.Mesh(beadGeo,starGoldMat);
            st.position.set(wx,wy,wz); st.scale.setScalar(1.35); armGrp.add(st);
            if(si%2===0){
              var drop=Math.max(0.95,Math.min(2.2,wy-26.0));
              addSeaGlassPrism(wx,wy-0.12,wz,drop,1.25,ri*3+si);
            }
          }
        });
        // 6 Slender brass suspension cables anchoring the Grand Vault Armillary cleanly to the cupola oculus (y = 41.72)
        for(var ci=0;ci<6;ci++){
          var ca=ci*Math.PI/3+0.26;
          addBrassRod(cxL+Math.cos(ca)*9.35,41.72,czL+Math.sin(ca)*9.35, cxL+Math.cos(ca)*13.8,grandCenterY+1.4,czL+Math.sin(ca)*13.8, 0.045,wireMat);
        }
        // --- Tier B: 6 Suspended Atrium-Vault Brass Celestial Armillary Chandeliers & Sea-Glass Prism Pendants ---
        // Positioned in the high sunlit outer upper arch bays (r = 21.8..22.4, y = 21.4..24.2 — strictly >= 4.2u clear
        // of EVERY Turn-1 & Turn-2 stair space, Hana, Bok & core column, framing the high sunlit rotunda arches!)
        var vaultBaySpecs=[
          { ang:-0.52, r:22.0, y:22.6, sc:1.08, seed:0 }, // East-Northeast sunlit vault bay
          { ang:-0.08, r:22.4, y:22.0, sc:1.12, seed:1 }, // East sunlit central vault bay
          { ang: 0.42, r:22.2, y:21.4, sc:1.05, seed:2 }, // East-Southeast open sky bay
          { ang: 1.55, r:21.8, y:23.0, sc:1.02, seed:3 }, // South vault bay
          { ang: 2.75, r:21.8, y:24.2, sc:1.06, seed:4 }, // West vault bay
          { ang:-1.55, r:21.8, y:23.6, sc:1.04, seed:5 }  // North vault bay
        ];
        vaultBaySpecs.forEach(function(vb){
          var vx=cxL+Math.cos(vb.ang)*vb.r, vz=czL+Math.sin(vb.ang)*vb.r, vy=vb.y, k=vb.sc;
          // Verify >= 4.6u 3D clearance from every single stair space for both chandelier core and lowest pendant
          var safe=true;
          for(var spi=0;spi<sp.length;spi++){
            var ts=sp[spi];
            if(Math.hypot(ts.x-vx,(ts.y||0)-vy,ts.z-vz)<4.8 || Math.hypot(ts.x-vx,(ts.y||0)-(vy-2.1*k),ts.z-vz)<4.4){ safe=false; break; }
          }
          if(!safe) return;
          // Slender brass suspension cable anchoring cleanly up into the arched cupola cornice (y = 33.4)
          addBrassRod(vx,33.4,vz, vx,vy+1.55*k,vz, 0.034,wireMat);
          var crown=new T.Mesh(beadGeo,brassMatA); crown.position.set(vx,vy+1.55*k,vz); crown.scale.setScalar(1.1*k); armGrp.add(crown);
          // Intersecting miniature brass celestial armillary rings + turquoise enamel zodiac band
          var rOuter=new T.Mesh(new T.TorusGeometry(1.48*k,0.085*k,8,32),brassMatA);
          rOuter.position.set(vx,vy,vz); rOuter.rotation.set(Math.PI*0.5+0.24,vb.ang,0.18); armGrp.add(rOuter);
          var rMerid=new T.Mesh(new T.TorusGeometry(1.36*k,0.068*k,8,28),brassMatB);
          rMerid.position.set(vx,vy,vz); rMerid.rotation.set(0.22,vb.ang+0.65,0.28); armGrp.add(rMerid);
          var rEnam=new T.Mesh(new T.TorusGeometry(1.12*k,0.055*k,6,28),enamelMat);
          rEnam.position.set(vx,vy,vz); rEnam.rotation.set(Math.PI*0.5-0.30,vb.ang+1.1,-0.22); armGrp.add(rEnam);
          // Central luminous golden star-core & 4 cascading iridescent sea-glass prism pendants
          var coreOrb=new T.Mesh(beadGeo,starGoldMat); coreOrb.position.set(vx,vy,vz); coreOrb.scale.setScalar(1.45*k); armGrp.add(coreOrb);
          addSeaGlassPrism(vx,vy-0.25*k,vz,1.95*k,1.15*k,vb.seed);
          for(var pi=0;pi<4;pi++){
            var pa=pi*Math.PI*0.5+vb.ang+0.35;
            var px=vx+Math.cos(pa)*1.38*k, pz=vz+Math.sin(pa)*1.38*k;
            addSeaGlassPrism(px,vy-0.18*k,pz,(1.15+(pi%2)*0.55)*k,0.92*k,vb.seed+pi+1);
          }
        });
        compactGroupInPlace(armGrp, true, null);
        armGrp.traverse(function(o){
          if(o.isMesh){ o.receiveShadow=false; o.castShadow=false; }
        });
        extras.add(armGrp);
        compactGroupInPlace(lhGarlandGrp, true, null);
      })();

      // =========================================================================
      // 7. GROUNDED LIGHTHOUSE DECK PROPS (REPLACING FLAT STARFISH AT TRUE s.y!)
      // =========================================================================
      function buildLighthouseDeckLantern(s,px,py,pz){
        var g=new T.Group();
        g.position.set(px,py,pz);
        function lp(geo,col,x,y,z,kind){
          var o=mesh(geo,M(col),x,y,z);
          if(kind) finish(o,kind);
          g.add(o); return o;
        }
        // Compact carved limestone & brass maritime sign-lantern bollard seated flush on the oak stair tread
        lp(cyl(0.24,0.30,0.16,10),'#cfc2a7',0,0.08,0,'stone');
        lp(cyl(0.11,0.14,0.68,10),'#734c30',0,0.50,0,'timber');
        lp(cyl(0.18,0.16,0.07,10),'#d6a84a',0,0.86,0,false);
        lp(cyl(0.17,0.15,0.30,10),'#f6d680',0,1.04,0,false);
        lp(ball(0.10,10,8),'#fff5c4',0,1.04,0,false);
        lp(cone(0.24,0.18,10),s.i%2?'#cf5c52':'#427082',0,1.27,0,'roof');
        lp(ball(0.055,8,6),'#e5bc5c',0,1.39,0,false);
        if(typeof reef3dBakeObject==='function' && view.rig && view.bake) reef3dBakeObject(g,view.rig,view.bake);
        if(typeof reef3dCompact==='function') reef3dCompact(g);
        g.traverse(function(c){ c.userData.space=s.i; });
        g.userData.space=s.i;
        return g;
      }
      if(view.scene && view.hitables){
        sp.forEach(function(s){
          if(!s.obj || !s.obj.position || s.kind!=='deck') return;
          var old=s.obj, pS=polarPt(s), sd=(s.i%2===0)?1:-1;
          var lx=s.x+pS.ux*sd*1.40, lz=s.z+pS.uz*sd*1.40, ly=(s.y||0)+treadOff;
          view.scene.remove(old);
          var hIdx=view.hitables.indexOf(old); if(hIdx>=0) view.hitables.splice(hIdx,1);
          var bollard=buildLighthouseDeckLantern(s,lx,ly,lz);
          view.scene.add(bollard); view.hitables.push(bollard); s.obj=bollard;
        });
      }

      // =========================================================================
      // 8. DISTANT OCEAN HORIZON SAILBOATS & SEA STACKS OUTSIDE ARCHED WINDOWS
      // =========================================================================
      for(var ext=0;ext<6;ext++){
        var ea=ext*Math.PI/3+0.26, er=rWallBase+20+(ext%3)*8.5;
        var ex=cxL+Math.cos(ea)*er, ez=czL+Math.sin(ea)*er;
        if(ext%2===0){
          sailboat(ex,ez,ea+Math.PI*0.5,ext%4===0?'#c95c50':'#457c8d','#fff1cf',1.25);
        } else {
          layeredSeaStack(ex,ez,1.35,ext+2,{
            main:'#9aa3a4', mid:'#b6bcb8', base:'#7d878a', accent:'#b4946c',
            turf1:'#5ba54e', turf2:'#70ba5a', turf3:'#80c566', withTuft:true, starCol:'#ee7b66'
          });
        }
      }
    }
    function captain(){
      var sb=view.regionShipBounds || {minX:cx-12,maxX:cx+14,minZ:cz-10,maxZ:cz+10};
      var shipPoly=view._shipPoly || [[sb.minX,sb.minZ],[sb.maxX,sb.minZ],[sb.maxX,sb.maxZ],[sb.minX,sb.maxZ]];
      function ptInShipPoly(x,z){
        var ins=false;
        for(var a=0,b=shipPoly.length-1;a<shipPoly.length;b=a++){
          var xi=shipPoly[a][0],zi=shipPoly[a][1],xj=shipPoly[b][0],zj=shipPoly[b][1];
          if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) ins=!ins;
        }
        return ins;
      }
      function distToShipPoly(x,z){
        var md=Infinity;
        for(var a=0;a<shipPoly.length;a++){
          var p1=shipPoly[a], p2=shipPoly[(a+1)%shipPoly.length], vx=p2[0]-p1[0], vz=p2[1]-p1[1];
          var t=Math.max(0,Math.min(1,((x-p1[0])*vx+(z-p1[1])*vz)/(vx*vx+vz*vz||1)));
          md=Math.min(md,Math.hypot(x-(p1[0]+vx*t),z-(p1[1]+vz*t)));
        }
        return md;
      }
      function insideShipDeck(x,z,pad){
        var p=pad||1.0;
        return x>sb.minX+3.0 && ptInShipPoly(x,z) && distToShipPoly(x,z)>=p;
      }
      // Sculpted octagonal timber mast collar, iron/brass hoops, deck knees, horned rope cleats & grounded base AO
      function mastBaseCollar(mx,my,mz,rM){
        contact(mx,mz,rM*5.8,rM*5.8,my+.010);
        // Subtle grounded dark-timber partner shadow ring flush on planks
        add(cyl(rM*2.35,rM*2.55,.018,12),'#593b25',mx,my+.012,mz,0,0,0,false).userData.reefGround=true;
        // Stepped octagonal timber mast collar
        add(cyl(rM*1.92,rM*2.18,.22,8),'#5b3d28',mx,my+.11,mz,0,Math.PI/8,0,'timber');
        add(cyl(rM*1.48,rM*1.78,.20,8),'#7e583a',mx,my+.31,mz,0,Math.PI/8,0,'timber');
        add(cyl(rM*1.26,rM*1.32,.11,12),'#454f59',mx,my+.46,mz,0,0,0,false);
        add(smoothTorus(rM*1.28,.028,8,16),'#dfa94c',mx,my+.52,mz,Math.PI/2,0,0,false);
        // Four radial timber brace knees anchoring the collar to the deck
        for(var kn=0;kn<4;kn++){
          var ka=kn*Math.PI/2+Math.PI/4;
          var knee=wornBox(rM*.55,.26,rM*.95,'#6b4930',mx+Math.cos(ka)*rM*1.65,my+.14,mz+Math.sin(ka)*rM*1.65,'timber');
          knee.rotation.y=-ka+Math.PI/2;
        }
        // Twin horned oak-and-brass rope cleats bolted to opposite sides of the lower mast + neat base halyard collar
        [-1,1].forEach(function(sd){
          var clX=mx+sd*(rM+0.05), clY=my+.92;
          block(.10,.14,.12,'#5e402b',clX,clY,mz,0,'timber');
          block(.08,.36,.07,'#d8ad52',clX+sd*.05,clY,mz,0,false);
          add(cyl(.026,.026,.22,6),'#d6be8a',clX+sd*.05,clY,mz,0,0,Math.PI/2,'rope');
        });
        add(smoothTorus(rM*2.18,.042,8,18),'#cbb382',mx,my+.05,mz,Math.PI/2,0,0,'rope');
      }
      function capstan(x,y,z){
        contact(x,z,.88,.88,y+.012);
        add(cyl(.44,.52,.14,12),'#5e402b',x,y+.07,z,0,0,0,'timber');
        add(cyl(.28,.34,.58,10),'#8c6244',x,y+.42,z,0,0,0,'timber');
        add(cyl(.36,.32,.14,10),'#754c38',x,y+.76,z,0,0,0,'timber');
        add(cyl(.22,.22,.08,10),'#d6a34b',x,y+.86,z,0,0,0,false);
        for(var b=0;b<4;b++){
          var ba=b*Math.PI/2;
          block(.07,.07,1.25,'#c79e6b',x,y+.76,z,ba,'timber');
        }
        addObstacle(x,z,.95);
      }
      function deckHatch(hx,hz){
        contact(hx,hz,1.55,1.32,-.107);
        wornBox(2.35,.24,1.95,'#5e402b',hx,-.02,hz,'timber');
        block(.42,.12,1.1,'#7a5438',hx-1.32,-.08,hz,0,'timber');
        block(1.95,.12,1.55,'#2a1d15',hx,.06,hz,0,false);
        for(var gx=-2;gx<=2;gx++) block(.1,.06,1.55,'#9e7348',hx+gx*.36,.13,hz,0,'timber');
        for(var gz=-1;gz<=1;gz++) block(1.95,.05,.1,'#8c633b',hx,.14,hz+gz*.42,0,'timber');
        [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
          block(.2,.08,.2,'#d6a34b',hx+sx*1.02,.12,hz+sz*.82,0,false);
        }); });
        addObstacle(hx,hz,1.45);
      }
      // Raised stepped foredeck + twin timber staircases + secondary foremast with furled sail
      var foreX=sb.maxX-4.6;
      if(outerClear(foreX,cz,3.4) && insideShipDeck(foreX-1.0,cz,2.8)){
        contact(foreX,cz,2.2,2.9,-.107);
        wornBox(2.4,.52,5.4,'#775438',foreX,.13,cz,'timber');
        block(2.48,.08,5.48,'#b78d65',foreX,.41,cz,0,'timber');
        [-1.65,1.65].forEach(function(sz){
          for(var st=0;st<3;st++){
            block(.45,.15,1.05,'#8e6442',foreX-1.35-st*.42,.33-st*.14,cz+sz,0,'timber');
          }
          block(.1,.52,1.4,'#dec49a',foreX-1.85,.35,cz+sz-.56,Math.PI/2,'timber');
        });
        post(.20,5.2,'#6e5139',foreX,.42,cz);
        mastBaseCollar(foreX,.42,cz,.20);
        block(2.6,.11,.11,'#b99866',foreX,4.42,cz,0,'timber');
        add(cyl(.22,.22,2.25,10),'#f3dfb1',foreX+.14,4.35,cz,0,0,Math.PI/2,'fabric');
        [-.75,0,.75].forEach(function(rz){
          add(torus(.23,.035),'#cbb382',foreX+.14,4.35,cz+rz,0,Math.PI/2,0,'rope');
        });
        add(cyl(.68,.52,.40,10),'#7c583f',foreX,4.88,cz,0,0,0,'timber');
        add(torus(.66,.055),'#d9bf91',foreX,5.10,cz,Math.PI/2,0,0,'timber');
        post(.035,.90,'#d9bf91',foreX,5.18,cz);
        block(.07,.22,.78,'#e86f68',foreX,5.96,cz+.38,0,'fabric');
        addObstacle(foreX,cz,2.2);
      }
      // m10 / iter22 Minor #4 / iter24 M1: Tidy MP8-proportioned nautical vignettes (ZERO prop-to-prop clipping!)
      var vigPlaced=[], deckVigSeq=0;
      function tagSubProp(gStart,vigId,subName){
        for(var ti=gStart;ti<root.children.length;ti++){
          root.children[ti].traverse(function(o){
            if(o.isMesh && (!o.userData.reefStructure || o.userData.reefStructure!=='contact-patch') && !o.userData.reefGround){
              o.userData.deckVig=vigId;
              o.userData.deckSubProp=subName;
            }
          });
        }
      }
      function wrapRot(g0,x,y,z,rot,scale){
        var sc=scale||1;
        var slice=curRoot.children.slice(g0);
        if(!slice.length) return;
        var outer=new T.Group(), grp=new T.Group(), org=new T.Vector3(x,y,z);
        slice.forEach(function(p){
          curRoot.remove(p);
          var isKeep = (p.userData && p.userData.reefStructure==='contact-patch') || (p.material && p.material.map);
          if(isKeep){
            var dx = p.position.x - x, dz = p.position.z - z;
            if(sc !== 1){ dx *= sc; dz *= sc; p.scale.x *= sc; p.scale.z *= sc; }
            if(rot){
              var cr = Math.cos(rot), sr = Math.sin(rot);
              var ndx = dx * cr + dz * sr, ndz = -dx * sr + dz * cr;
              dx = ndx; dz = ndz; p.rotation.y += rot;
            }
            p.position.set(x + dx, p.position.y, z + dz);
            curRoot.add(p);
          } else {
            p.position.sub(org);
            grp.add(p);
          }
        });
        if(grp.children.length){
          if(rot) grp.rotation.y=rot;
          if(sc!==1) grp.scale.setScalar(sc);
          outer.add(grp);
          compactGroupInPlace(outer, false, null);
          outer.children.slice().forEach(function(m){
            outer.remove(m);
            m.position.copy(org);
            curRoot.add(m);
          });
        }
      }
      // Compact deck hemp rope coil (outer radius = 0.506 * scale) for crisp >= 0.22u separation
      function deckRopeCoil(x,y,z,scale){
        var k=scale||.74;
        for(var j=0;j<3;j++) add(torus((.30+j*.068)*k,.034*k),'#dcc28a',x,y+j*.052*k,z,Math.PI/2,0,0,'rope');
      }
      // iter23 Minor #7: Varied MP8 maritime deck prop helpers (all flush at y = -0.12, replacing repeated rope coils!)
      function deckLobsterTrap(x,y,z,rot){
        var g0=root.children.length;
        var archGeo=geos.trapArch||(geos.trapArch=own(new T.TorusGeometry(.21,.022,6,12,Math.PI)));
        // Slatted weathered-oak base frame + twin deck skids
        [-.19,.19].forEach(function(sz){ block(.72,.036,.065,'#5a3c27',x,y+.018,z+sz,0,'timber'); });
        wornBox(.70,.048,.46,'#7c5638',x,y+.052,z,'timber');
        // Dark interior bait-cavity shadow + braided hemp funnel entrance ring
        block(.50,.15,.30,'#2b211a',x,y+.15,z,0,false);
        add(smoothTorus(.095,.020,6,12),'#d4bc88',x-.32,y+.16,z,0,Math.PI/2,0,'rope');
        // Three curved oak arch ribs + 5 horizontal side/crown wooden lath slats
        [-.28,0,.28].forEach(function(rx){
          add(archGeo,'#6d4a31',x+rx,y+.07,z,0,Math.PI/2,0,'timber');
        });
        [.32,.85,1.57,2.29,2.82].forEach(function(ang){
          var sy=y+.07+Math.sin(ang)*.21, sz=z+Math.cos(ang)*.21;
          add(box(.68,.026,.048),'#a97c4e',x,sy,sz,ang-Math.PI/2,0,0,'timber');
        });
        // Coral-and-cream painted wooden trap buoy resting flush beside the corner
        var bx=x+.44, bz=z+.14;
        add(cyl(.070,.054,.18,8),'#df5a4f',bx,y+.09,bz,0,0,0,'timber');
        add(cyl(.074,.068,.055,8),'#f5e8c8',bx,y+.11,bz,0,0,0,'timber');
        add(cyl(.016,.016,.11,6),'#c79e6b',bx,y+.21,bz,0,0,0,'timber');
        wrapRot(g0,x,y,z,rot);
      }
      function deckBurlapSacks(x,y,z,rot){
        var g0=root.children.length;
        // Upright plump tied burlap cargo sack (flush at y)
        var s1=smoothOrb(.24,'#c69f6b',x-.12,y+.21,z-.04,'fabric'); s1.scale.set(1.04,.86,.94);
        add(cyl(.082,.130,.10,10),'#b8905e',x-.12,y+.40,z-.04,0,0,0,'fabric');
        add(smoothTorus(.088,.019,6,12),'#c64e46',x-.12,y+.42,z-.04,Math.PI/2,0,0,'rope');
        add(cyl(.135,.076,.082,10),'#d4b380',x-.12,y+.48,z-.04,0,0,0,'fabric');
        // Companion slumped leaning burlap sack tucked warmly against the first (minY >= y)
        var s2=smoothOrb(.21,'#b48a57',x+.17,y+.215,z+.08,'fabric'); s2.scale.set(1.06,.78,.90); s2.rotation.z=-.22;
        add(cyl(.072,.114,.088,10),'#a87e4d',x+.22,y+.375,z+.08,0,0,-.22,'fabric');
        add(smoothTorus(.080,.018,6,12),'#dcc38c',x+.23,y+.395,z+.08,Math.PI/2,-.22,0,'rope');
        add(cyl(.116,.066,.072,10),'#c69f6b',x+.24,y+.445,z+.08,0,0,-.22,'fabric');
        // Small resting spice pouch at the front base
        var s3=smoothOrb(.14,'#cfa976',x+.03,y+.095,z+.22,'fabric'); s3.scale.set(1.12,.64,.90);
        wrapRot(g0,x,y,z,rot);
      }
      function deckBucketAndSwab(x,y,z,rot){
        var g0=root.children.length;
        var bailGeo=geos.bucketBail||(geos.bucketBail=own(new T.TorusGeometry(.21,.015,6,12,Math.PI)));
        // Tapered oak stave ship's bucket + forged-iron hoops + clear seawater fill + iron bail handle
        var bx=x-.09, bz=z-.02;
        add(cyl(.215,.168,.35,10),'#986a43',bx,y+.175,bz,0,0,0,'timber');
        add(cyl(.205,.200,.034,10),'#3f4b56',bx,y+.28,bz,0,0,0,false);
        add(cyl(.182,.178,.034,10),'#3f4b56',bx,y+.095,bz,0,0,0,false);
        add(cyl(.190,.190,.022,10),'#5cc6ce',bx,y+.325,bz,0,0,0,false);
        add(bailGeo,'#495662',bx,y+.335,bz,.34,.2,0,false);
        // Ash-handled deck swab/mop resting cleanly beside the bucket with splayed cream-hemp mop head (minY >= y)
        var mx=x+.18, mz=z+.10;
        add(cyl(.044,.044,.07,8),'#d6a34b',mx,y+.115,mz,0,0,0,false);
        for(var mt=0;mt<5;mt++){
          var ma=mt*Math.PI*2/5+.25;
          add(cyl(.026,.042,.15,6),mt%2?'#d9c390':'#ebe0be',mx+Math.cos(ma)*.078,y+.084,mz+Math.sin(ma)*.078,-Math.sin(ma)*.90,0,Math.cos(ma)*.90,'rope');
        }
        var endPt=limb(mx,y+.13,mz,-.30,.94,-.18,.86,.024,.022,'#c8a06c','timber');
        smoothOrb(.030,'#e3ba58',endPt[0],endPt[1],endPt[2],false);
        wrapRot(g0,x,y,z,rot);
      }
      function deckFoldedTarp(x,y,z,rot){
        var g0=root.children.length;
        // Chunky 3-fold stacked coastal striped sailcloth tarp + rounded fold spine + twin hemp lashing straps
        wornBox(.68,.082,.50,'#f0e2c0',x,y+.041,z,'fabric');
        wornBox(.64,.078,.46,'#3f7b8e',x+.01,y+.118,z,'fabric');
        wornBox(.60,.072,.42,'#f6ebd0',x-.01,y+.190,z,'fabric');
        block(.61,.022,.13,'#d85a4c',x-.01,y+.230,z,0,'fabric');
        add(cyl(.086,.086,.66,10),'#eadab4',x,y+.112,z-.22,0,0,Math.PI/2,'fabric');
        [-.16,.16].forEach(function(sx){ block(.050,.234,.51,'#cfb37c',x+sx,y+.117,z,0,'rope'); });
        wrapRot(g0,x,y,z,rot);
      }
      function deckIronChainCoil(x,y,z,rot){
        var g0=root.children.length;
        // Compact forged-iron chain coil lying 100% flush on planks + short linked tail & brass-pinned clevis shackle (r <= 0.30)
        for(var ci=0;ci<3;ci++){
          add(smoothTorus(.165+ci*.044,.029,8,14),ci%2?'#4f5d6b':'#3d4955',x,y+.030+ci*.035,z,Math.PI/2,0,ci*.35,false);
        }
        for(var lk=0;lk<2;lk++){
          add(torus(.048,.016),'#5a6977',x+.24+lk*.082,y+.020,z+.08+lk*.028,Math.PI/2,0,lk*.42,false);
        }
        add(smoothTorus(.062,.018,6,12),'#4f5d6b',x-.19,y+.022,z+.20,Math.PI/2,0,.3,false);
        add(cyl(.016,.016,.11,6),'#e3ba58',x-.19,y+.022,z+.25,0,0,Math.PI/2,false);
        wrapRot(g0,x,y,z,rot);
      }
      // iter19 M3: Compact warm glowing brass deck lantern seated cleanly on a crate or hatch coaming
      function seatedBrassLantern(lx,ly,lz){
        add(cyl(.15,.18,.08,10),'#b5873d',lx,ly+.04,lz,0,0,0,false);
        add(cyl(.14,.13,.26,10),'#f4cf74',lx,ly+.21,lz,0,0,0,false);
        smoothOrb(.085,'#fff2bc',lx,ly+.21,lz,false);
        add(torus(.15,.022),'#b5873d',lx,ly+.34,lz,Math.PI/2,0,0,false);
        add(cone(.20,.15,10),'#d6a34b',lx,ly+.41,lz,0,0,0,false);
        smoothOrb(.044,'#e8c263',lx,ly+.50,lz,false);
      }
      // Helper: compact rolled coral-and-teal striped coastal sailcloth resting flush on planks (minY >= y)
      function deckRolledSail(sx,y,sz,len,rad,rotY){
        var g0=root.children.length, L=len||.82, R=rad||.148, sy=y+R+.012;
        add(cyl(R,R,L,12),'#f5e8c8',sx,sy,sz,0,0,Math.PI/2,'fabric');
        [-.28,0,.28].forEach(function(so,si){
          add(cyl(R+.006,R+.006,L*.15,12),si===1?'#3f8c9c':'#d85a4c',sx+so*L,sy,sz,0,0,Math.PI/2,'fabric');
        });
        [-.16,.16].forEach(function(to){
          add(smoothTorus(R+.010,.020,6,14),'#dec48a',sx+to*L,sy,sz,0,Math.PI/2,0,'rope');
        });
        wrapRot(g0,sx,y,sz,rotY||0);
      }
      // iter24 M1: Zone 1 mid-left station (110-180, 320-370) — Clean non-clipping strapped crates, mooring bitts, folded striped tarp & brass lantern stanchion (ZERO draped nets!)
      function vignetteDeckNetAndCrates(x,z,rot){
        var g0=root.children.length, y=-.12, vid='deckNetCrates#'+(++deckVigSeq), s0;
        contact(x,z,1.76,1.56,-.107);
        // Sub-prop 1: Brass-strapped stacked wooden cargo crates on rear-left
        s0=root.children.length;
        crate(x-.56,y,z-.44,.94);
        [-.82,-.30].forEach(function(bx){ block(.060,.55,.61,'#e3ba58',x+bx,y+.28,z-.44,0,false); });
        crate(x-.54,y+.55,z-.44,.66);
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 2: Stout low-profile twin-post oak mooring bitt & belaying crossbeam on right
        s0=root.children.length;
        var bx=x+.58, bz=z+.42;
        wornBox(.84,.12,.36,'#5a3c27',bx,y+.06,bz,'timber');
        [-.24,.24].forEach(function(sd){
          post(.090,.74,'#6e4c34',bx+sd,y+.10,bz);
          add(cyl(.105,.105,.052,10),'#e3ba58',bx+sd,y+.86,bz,0,0,0,false);
          add(smoothTorus(.18,.040,8,16),'#cbb382',bx+sd,y+.16,bz,Math.PI/2,0,0,'rope');
        });
        wornBox(.80,.12,.17,'#8c6244',bx,y+.64,bz,'timber');
        [-.16,0,.16].forEach(function(px2){
          add(cyl(.025,.021,.26,8),'#dfc088',bx+px2,y+.76,bz,0,0,0,'timber');
          smoothOrb(.040,'#ebd19c',bx+px2,y+.91,bz,false);
        });
        tagSubProp(s0,vid,'mooringBitts');
        // Sub-prop 3: Folded striped canvas tarp cleanly on planks in front-left (>= 0.35u clear of crates & bitts)
        s0=root.children.length;
        deckFoldedTarp(x-.56,y,z+.54,0);
        tagSubProp(s0,vid,'foldedTarp');
        // Sub-prop 4: Warm glowing brass deck lantern stanchion cleanly at rear-right (arm aimed +X clear of bitts & crates)
        s0=root.children.length;
        var lx=x+.58, lz=z-.54;
        add(cyl(.17,.22,.18,8),'#5e402b',lx,y+.09,lz,0,0,0,'timber');
        post(.056,1.14,'#4e3e34',lx,y+.16,lz);
        block(.34,.054,.054,'#d6a34b',lx+.14,y+1.24,lz,0,false);
        add(cyl(.135,.115,.25,8),'#f4cf74',lx+.28,y+1.06,lz,0,0,0,false);
        smoothOrb(.078,'#fff2bc',lx+.28,y+1.06,lz,false);
        add(torus(.145,.021),'#b5873d',lx+.28,y+1.18,lz,Math.PI/2,0,0,false);
        add(torus(.145,.021),'#b5873d',lx+.28,y+.94,lz,Math.PI/2,0,0,false);
        add(cone(.18,.14,8),'#c4943e',lx+.28,y+1.26,lz,0,0,0,false);
        smoothOrb(.040,'#e8c263',lx+.28,y+1.35,lz,false);
        tagSubProp(s0,vid,'lanternPost');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.44);
      }
      // iter19 M3 / iter24 M1: Zone 2A upper-right station — Crafted Secondary Cargo Hatch + Upright Mast Base + Cleanly Spaced Crates, Sacks & Bucket
      var secMastTops=[];
      function vignetteSecondaryHatchMast(x,z,rot){
        var g0=root.children.length, y=-.12, vid='secHatchMast#'+(++deckVigSeq), s0;
        contact(x,z,2.14,1.76,-.107);
        // Sub-prop 1: Crafted secondary cargo/skylight hatch with dark-oak coaming & brass lifting rings
        s0=root.children.length;
        var hx=x-.62, hz=z+.06;
        wornBox(1.74,.24,1.38,'#5c3e29',hx,y+.12,hz,'timber');
        block(1.42,.10,1.06,'#221812',hx,y+.19,hz,0,false);
        for(var gx=-2;gx<=2;gx++) block(.082,.06,1.06,'#a2764a',hx+gx*.28,y+.25,hz,0,'timber');
        for(var gz=-1;gz<=1;gz++) block(1.42,.05,.082,'#8e643c',hx,y+.26,hz+gz*.31,0,'timber');
        block(1.48,.065,.10,'#e3ba58',hx,y+.29,hz,0,false);
        [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
          block(.16,.08,.16,'#e3ba58',hx+sx*.76,y+.24,hz+sz*.56,0,false);
        }); });
        add(torus(.076,.019),'#e5bc5b',hx+.76,y+.27,hz,Math.PI/2,0,0,false);
        add(torus(.076,.019),'#e5bc5b',hx-.76,y+.27,hz,Math.PI/2,0,0,false);
        tagSubProp(s0,vid,'hatch');
        // Sub-prop 2: Upright octagonal Deck Mast Base + radial knees + belaying pins + rising timber mast
        // dressed with brass-capped crossyard, furled cream sail & fluttering crimson-gold masthead burgee!
        s0=root.children.length;
        var mx=x+1.24, mz=z-.04;
        mastBaseCollar(mx,y,mz,.22);
        post(.22,5.3,'#6e5139',mx,y,mz);
        add(smoothTorus(.33,.044,8,18),'#d6a34b',mx,y+1.14,mz,Math.PI/2,0,0,false);
        for(var bp=0;bp<6;bp++){
          var ba=bp*Math.PI/3;
          add(cyl(.025,.021,.30,6),'#dfc088',mx+Math.cos(ba)*.34,y+1.24,mz+Math.sin(ba)*.34,0,0,0,'timber');
          smoothOrb(.038,'#ebd19c',mx+Math.cos(ba)*.34,y+1.40,mz+Math.sin(ba)*.34,false);
        }
        add(cyl(.24,.24,.10,12),'#454f59',mx,y+1.92,mz,0,0,0,false);
        add(smoothTorus(.25,.026,8,16),'#e3ba58',mx,y+1.99,mz,Math.PI/2,0,0,false);
        add(cyl(.22,.22,.10,12),'#454f59',mx,y+3.26,mz,0,0,0,false);
        // Sculpted cross-yardarm + furled coastal sail + brass masthead cap & fluttering swallowtail burgee!
        block(.12,.12,2.55,'#b9935f',mx,y+4.22,mz,0,'timber');
        add(cyl(.19,.19,2.18,10),'#f4e2b8',mx+.12,y+4.16,mz,Math.PI/2,0,0,'fabric');
        [-.72,0,.72].forEach(function(rz){
          add(torus(.20,.032),'#cbb382',mx+.12,y+4.16,mz+rz,0,0,0,'rope');
        });
        add(cyl(.54,.40,.34,10),'#7c583f',mx,y+4.74,mz,0,0,0,'timber');
        add(smoothTorus(.54,.05,8,16),'#e5bc5b',mx,y+4.92,mz,Math.PI/2,0,0,false);
        smoothOrb(.14,'#ecc460',mx,y+5.36,mz,false);
        // Fluttering crimson-and-gold swallowtail masthead burgee streaming cleanly at mast cap
        block(.06,.30,.64,'#e6524c',mx,y+5.14,mz+.42,.08,'fabric');
        block(.065,.11,.66,'#ffd24c',mx,y+5.14,mz+.42,.08,'fabric');
        block(.05,.12,.38,'#e6524c',mx,y+5.23,mz+.86,-.10,'fabric');
        block(.05,.12,.38,'#e6524c',mx,y+5.05,mz+.86,-.10,'fabric');
        tagSubProp(s0,vid,'mast');
        // Sub-prop 3: Brass-strapped nautical crate + glowing brass lantern cleanly outside front-left coaming
        s0=root.children.length;
        crate(hx-.52,y,hz+1.26,.78);
        [-.22,.22].forEach(function(bx2){ block(.052,.46,.51,'#e3ba58',hx-.52+bx2,y+.23,hz+1.26,0,false); });
        seatedBrassLantern(hx-.52,y+.46,hz+1.26);
        tagSubProp(s0,vid,'frontCrateLantern');
        // Sub-prop 4: Tied burlap cargo sacks cleanly outside front-right coaming
        s0=root.children.length;
        deckBurlapSacks(hx+.52,y,hz+1.32,0);
        tagSubProp(s0,vid,'burlapSacks');
        // Sub-prop 5: Strapped crate + folded cream-and-coral striped sailcloth cleanly outside rear-right coaming
        s0=root.children.length;
        crate(hx+.36,y,hz-1.32,.80);
        [-.22,.22].forEach(function(bx3){ block(.052,.47,.52,'#e3ba58',hx+.36+bx3,y+.24,hz-1.32,0,false); });
        wornBox(.58,.075,.52,'#f2e2bc',hx+.36,y+.51,hz-1.32,'fabric');
        block(.54,.055,.46,'#d86358',hx+.36,y+.555,hz-1.32,0,'fabric');
        add(cyl(.065,.065,.54,10),'#f6ebd0',hx+.62,y+.52,hz-1.32,Math.PI/2,0,0,'fabric');
        tagSubProp(s0,vid,'rearCrateTarp');
        // Sub-prop 6: Wooden ship's bucket & swab cleanly outside rear-left coaming
        s0=root.children.length;
        deckBucketAndSwab(hx-.66,y,hz-1.30,0);
        tagSubProp(s0,vid,'bucketSwab');
        wrapRot(g0,x,y,z,rot,1.14);
        var crM=Math.cos(rot||0), srM=Math.sin(rot||0);
        secMastTops.push({
          x:x+(1.24*crM+(-0.04)*srM)*1.14,
          y:y+4.92*1.14,
          z:z+(-1.24*srM+(-0.04)*crM)*1.14
        });
        addObstacle(x,z,1.72);
      }
      // iter24 M1: Zone 2B & Zone 3 (115-240, 530-630) — Clean non-clipping strapped crates, lantern crate, upright barrel & lobster trap/burlap sacks (ZERO draped nets!)
      function vignetteNettedCargo(x,z,rot){
        var g0=root.children.length, y=-.12, vid='nettedCargo#'+(++deckVigSeq), s0;
        contact(x,z,1.62,1.48,-.107);
        // Sub-prop 1: Stacked brass-strapped cargo crates (rear-left)
        s0=root.children.length;
        crate(x-.52,y,z-.42,.88);
        [-.77,-.27].forEach(function(bx){ block(.055,.52,.57,'#e3ba58',x+bx,y+.26,z-.42,0,false); });
        crate(x-.50,y+.52,z-.42,.60);
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 2: Companion cargo crate topped with glowing brass deck lantern (rear-right, >= 0.32u clear)
        s0=root.children.length;
        crate(x+.48,y,z-.42,.78);
        seatedBrassLantern(x+.48,y+.46,z-.42);
        tagSubProp(s0,vid,'lanternCrate');
        // Sub-prop 3: Upright oak barrel (front-right, >= 0.32u clear)
        s0=root.children.length;
        barrel(x+.56,y,z+.48,.82);
        tagSubProp(s0,vid,'oakBarrel');
        // Sub-prop 4: Slatted lobster trap (left deck) or tied burlap sacks (right deck) cleanly separated in front-left
        s0=root.children.length;
        if(x<-10) deckLobsterTrap(x-.52,y,z+.52,0);
        else deckBurlapSacks(x-.50,y,z+.56,0);
        tagSubProp(s0,vid,'cargoAccent');
        wrapRot(g0,x,y,z,rot,1.12);
        addObstacle(x,z,1.34);
      }
      // Vignette 1: Cargo-crate corner with folded striped tarp, oak barrel & tied burlap cargo sacks
      function vignetteCargo(x,z,rot){
        var g0=root.children.length, y=-.12, vid='cargo#'+(++deckVigSeq), s0;
        contact(x,z,1.52,1.40,-.107);
        s0=root.children.length;
        crate(x-.46,y,z-.36,.92);
        crate(x-.44,y+.54,z-.36,.66);
        wornBox(.56,.075,.52,'#ecd9ad',x-.44,y+.96,z-.36,'fabric');
        block(.52,.055,.46,'#4d8898',x-.44,y+1.01,z-.36,0,'fabric');
        tagSubProp(s0,vid,'crateStack');
        s0=root.children.length;
        crate(x+.46,y,z-.36,.78);
        tagSubProp(s0,vid,'sideCrate');
        s0=root.children.length;
        barrel(x+.52,y,z+.48,.86);
        tagSubProp(s0,vid,'oakBarrel');
        s0=root.children.length;
        deckBurlapSacks(x-.48,y,z+.54,0);
        tagSubProp(s0,vid,'burlapSacks');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.28);
      }
      // Vignette 2: Rope-coil & belaying-pin station (timber pinrail + 4 turned belaying pins + bollard + hawser coil)
      function vignetteRopeStation(x,z,rot){
        var g0=root.children.length, y=-.12, vid='rope#'+(++deckVigSeq), s0;
        contact(x,z,1.44,1.24,-.107);
        s0=root.children.length;
        [-.52,.52].forEach(function(sx){
          wornBox(.18,.12,.32,'#5e402b',x+sx,y+.06,z-.46,'timber');
          post(.072,.90,'#704d36',x+sx,y+.08,z-.46);
        });
        wornBox(1.30,.14,.24,'#8c6244',x,y+.86,z-.46,'timber');
        [-.36,-.12,.12,.36].forEach(function(px){
          add(cyl(.028,.024,.34,8),'#dfc088',x+px,y+1.00,z-.46,0,0,0,'timber');
          smoothOrb(.045,'#ebd19c',x+px,y+1.18,z-.46,false);
        });
        tagSubProp(s0,vid,'pinrail');
        s0=root.children.length;
        post(.12,.58,'#5e402b',x-.54,y,z+.38);
        add(cyl(.14,.14,.06,8),'#d6a34b',x-.54,y+.60,z+.38,0,0,0,false);
        add(torus(.34,.072),'#cbb382',x-.54,y+.08,z+.38,Math.PI/2,0,0,'rope');
        add(torus(.26,.064),'#bfa370',x-.54,y+.18,z+.38,Math.PI/2,0,0,'rope');
        tagSubProp(s0,vid,'bollard');
        s0=root.children.length;
        deckRopeCoil(x+.58,y+.04,z+.40,.72);
        tagSubProp(s0,vid,'ropeCoil');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.20);
      }
      // Vignette 3: Brass spyglass tripod & sea-chest lookout (clean >= 0.24u separation!)
      function vignetteSpyglass(x,z,rot){
        var g0=root.children.length, y=-.12, vid='spyglass#'+(++deckVigSeq), s0;
        contact(x,z,1.48,1.28,-.107);
        s0=root.children.length;
        cargoChest(x-.42,y,z-.28,0);
        add(cyl(.068,.068,.52,10),'#f6ebd0',x-.42,y+.88,z-.28,0,0,Math.PI/2,'fabric');
        add(cyl(.074,.074,.06,10),'#cc4d4a',x-.42,y+.88,z-.28,0,0,Math.PI/2,false);
        tagSubProp(s0,vid,'seaChest');
        s0=root.children.length;
        var tx=x+.58, tz=z+.24;
        for(var lg=0;lg<3;lg++){
          var la=lg*Math.PI*2/3+.3;
          var fxL=tx+Math.cos(la)*.24, fzL=tz+Math.sin(la)*.24;
          add(cyl(.036,.045,.08,8),'#d6a34b',fxL,y+.04,fzL,0,0,0,false);
          limb(fxL,y+.02,fzL,-Math.cos(la)*.23,.96,-Math.sin(la)*.23,.98,.032,.022,'#6e4c35','timber');
        }
        add(cyl(.075,.085,.11,8),'#d9aa48',tx,y+.96,tz,0,0,0,false);
        var scopeDir=[.64,.36,.68];
        var s1=limb(tx-.12,y+.94,tz-.12,scopeDir[0],scopeDir[1],scopeDir[2],.36,.040,.054,'#d9aa48',false);
        var s2=limb(s1[0],s1[1],s1[2],scopeDir[0],scopeDir[1],scopeDir[2],.34,.060,.076,'#f2ce6e',false);
        smoothOrb(.064,'#9ce4f5',s2[0],s2[1],s2[2],false);
        tagSubProp(s0,vid,'spyglassTripod');
        s0=root.children.length;
        wornBox(.36,.16,.34,'#7a4f34',x-.42,y+.08,z+.48,'timber');
        add(cyl(.12,.12,.04,12),'#e5bc5b',x-.42,y+.18,z+.48,0,0,0,false);
        add(cyl(.09,.09,.05,12),'#f5ebd0',x-.42,y+.185,z+.48,0,0,0,false);
        block(.13,.02,.03,'#d4524a',x-.42,y+.215,z+.48,.4,false);
        tagSubProp(s0,vid,'compassBox');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.22);
      }
      // Vignette 4: Warm brass deck lantern stanchion + twin oak barrels & cleanly separated hemp rope coil
      function vignetteDeckLantern(x,z,rot){
        var g0=root.children.length, y=-.12, vid='lantern#'+(++deckVigSeq), s0;
        contact(x,z,1.44,1.22,-.107);
        s0=root.children.length;
        var sx=x+.06, sz=z-.12;
        add(cyl(.19,.24,.20,8),'#5e402b',sx,y+.10,sz,0,0,0,'timber');
        post(.062,1.22,'#4e3e34',sx,y+.18,sz);
        block(.058,.058,.36,'#d6a34b',sx,y+1.34,sz+.15,0,false);
        add(cyl(.145,.125,.26,8),'#f2cb72',sx,y+1.15,sz+.30,0,0,0,false);
        add(torus(.155,.022),'#b5873d',sx,y+1.28,sz+.30,Math.PI/2,0,0,false);
        add(torus(.155,.022),'#b5873d',sx,y+1.02,sz+.30,Math.PI/2,0,0,false);
        add(cone(.19,.15,8),'#c4943e',sx,y+1.36,sz+.30,0,0,0,false);
        smoothOrb(.042,'#e5bc5b',sx,y+1.45,sz+.30,false);
        tagSubProp(s0,vid,'lanternPost');
        s0=root.children.length;
        barrel(x-.64,y,z+.36,.84);
        tagSubProp(s0,vid,'barrel1');
        s0=root.children.length;
        barrel(x-.64,y,z-.44,.76);
        tagSubProp(s0,vid,'barrel2');
        s0=root.children.length;
        deckRopeCoil(x+.88,y+.04,z+.10,.70);
        tagSubProp(s0,vid,'ropeCoil');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.18);
      }
      // Vignette 8 (M5/m5): Compass chart crate with inlaid brass compass dial, sea map, oak barrel & seated brass deck lantern
      function vignetteChartCrate(x,z,rot){
        var g0=root.children.length, y=-.12, vid='chartCrate#'+(++deckVigSeq), s0;
        contact(x,z,1.52,1.26,-.107);
        s0=root.children.length;
        wornBox(.92,.54,.70,'#a66d45',x-.44,y+.27,z-.06,'timber');
        [-.84,-.04].forEach(function(bx){ block(.065,.56,.74,'#e3ba58',x+bx,y+.28,z-.06,0,false); });
        block(.74,.03,.50,'#f4e7c8',x-.44,y+.56,z-.06,.05,'fabric');
        block(.32,.034,.22,'#69b8c4',x-.54,y+.57,z-.12,.08,false);
        block(.18,.036,.15,'#d4a96a',x-.28,y+.57,z+.02,-.06,false);
        add(cyl(.13,.14,.055,14),'#d9aa48',x-.68,y+.58,z+.12,0,0,0,false);
        add(cyl(.10,.10,.065,14),'#faf1d8',x-.68,y+.585,z+.12,0,0,0,false);
        block(.14,.02,.03,'#d4524a',x-.68,y+.62,z+.12,.35,false);
        block(.03,.02,.14,'#355c70',x-.68,y+.62,z+.12,.35,false);
        add(cyl(.054,.054,.44,10),'#efe1be',x-.12,y+.60,z-.04,Math.PI/2,0,.12,'fabric');
        add(cyl(.060,.060,.048,10),'#cc4d4a',x-.12,y+.60,z-.04,Math.PI/2,0,.12,false);
        tagSubProp(s0,vid,'chartCrate');
        s0=root.children.length;
        barrel(x+.60,y,z+.36,.84);
        tagSubProp(s0,vid,'oakBarrel');
        s0=root.children.length;
        crate(x+.58,y,z-.42,.66);
        seatedBrassLantern(x+.58,y+.39,z-.42);
        tagSubProp(s0,vid,'lanternCrate');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.28);
      }
      // Coiled dark-iron anchor chain pile helper (compact outer radius ~0.35, 100% flat on planks -> zero floor sink!)
      function anchorChainCoil(x,y,z){
        for(var ci=0;ci<3;ci++){
          add(smoothTorus(.19+ci*.052,.034,8,16),'#49535e',x,y+.036+ci*.042,z,Math.PI/2,0,ci*.4,false);
        }
        // Short linked iron chain tail lying flat & flush on the wooden deck planks
        for(var lk=0;lk<2;lk++){
          add(torus(.052,.018),'#596570',x+.29+lk*.088,y+.022,z+.10+lk*.03,Math.PI/2,0,lk*.35,false);
        }
      }
      // Vignette 5 (m5 / iter18 m3 / iter24 M1): Chunky MP8 oak barrel pyramid + cleanly separated iron anchor chain & brass-capped mooring bollard
      function vignetteBarrelPyramid(x,z,rot){
        var g0=root.children.length, y=-.12, vid='barrels#'+(++deckVigSeq), s0;
        contact(x,z,1.66,1.42,-.107);
        // Sub-prop 1: Tightly grouped 4-barrel oak pyramid
        s0=root.children.length;
        var bpx=x+.36, bpz=z-.04;
        barrel(bpx-.36,y,bpz-.24,.90);
        barrel(bpx+.36,y,bpz-.24,.88);
        barrel(bpx,    y,bpz+.38,.86);
        barrel(bpx,    y+.62,bpz-.02,.82);
        tagSubProp(s0,vid,'barrelStack');
        // Sub-prop 2: Iron anchor chain coil cleanly separated on front-left flank (tail away -> >= 0.30u clear)
        s0=root.children.length;
        deckIronChainCoil(x-.96,y,z+.56,Math.PI);
        tagSubProp(s0,vid,'ironChain');
        // Sub-prop 3: Brass-capped oak mooring bollard cleanly separated on rear-left flank (>= 0.30u clear)
        s0=root.children.length;
        post(.12,.54,'#5e402b',x-.96,y,z-.46);
        add(cyl(.14,.14,.062,10),'#e3ba58',x-.96,y+.56,z-.46,0,0,0,false);
        add(torus(.21,.046),'#cbb382',x-.96,y+.08,z-.46,Math.PI/2,0,0,'rope');
        tagSubProp(s0,vid,'bollard');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.36);
      }
      // Vignette 9 (m5 / iter18 m3 / iter24 M1): Cohesive Anchor + Bollard + Barrel Mooring Station (zero intra-vignette clipping!)
      function vignetteAnchorAndChain(x,z,rot){
        var g0=root.children.length, y=-.12, vid='anchorChain#'+(++deckVigSeq), s0;
        contact(x,z,1.88,1.58,-.107);
        // Sub-prop 1: Timber deck chock cradling the reclining Admiralty anchor (clean centered lean, zero lateral overhang!)
        s0=root.children.length;
        var ax=x, az=z+.26;
        wornBox(.90,.12,.38,'#6a4831',ax,y+.06,az,'timber');
        var aGrp=new T.Group(); aGrp.position.set(ax,y+.18,az); aGrp.rotation.set(.30,0,-.06);
        function ap(geo,col,px,py,pz,rx,ry,rz,kind){
          var o=mesh(geo,M(col),px,py,pz);
          if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz;
          aGrp.add(finish(o,kind||false)); return o;
        }
        ap(cyl(.062,.090,1.14,10),'#3f4b57',0,.58,0,0,0,0,false);
        ap(cyl(.11,.13,.16,10),'#343f4a',0,.06,0,0,0,0,false);
        [-1,1].forEach(function(sd){
          ap(cyl(.055,.070,.50,8),'#3f4b57',sd*.23,.14,0,0,0,-sd*1.12,false);
          ap(cyl(.022,.062,.32,8),'#4d5b68',sd*.48,.34,0,0,0,-sd*.42,false);
          ap(cone(.115,.19,4),'#596876',sd*.53,.49,0,0,Math.PI/4,-sd*.30,false);
        });
        ap(box(.84,.12,.12),'#7d5336',0,1.02,0,0,0,0,'timber');
        [-.30,.30].forEach(function(sx){ ap(box(.065,.14,.14),'#e3ba58',sx,1.02,0,0,0,0,false); });
        ap(smoothTorus(.13,.030,8,16),'#4d5b68',0,1.26,0,0,0,0,false);
        root.add(aGrp);
        tagSubProp(s0,vid,'anchorChocks');
        // Sub-prop 2: Heavy coiled iron anchor chain cleanly separated on the right flank (>= 0.28u clear)
        s0=root.children.length;
        deckIronChainCoil(x+1.36,y,z+.28,0);
        tagSubProp(s0,vid,'ironChain');
        // Sub-prop 3: Twin brass-capped oak mooring bollards on the left flank (>= 0.28u clear)
        s0=root.children.length;
        [-.32,.34].forEach(function(bzOff,bi){
          var bx2=x-1.20, bz2=z+.26+bzOff;
          post(.12,.56,'#5e402b',bx2,y,bz2);
          add(cyl(.14,.14,.065,10),'#e3ba58',bx2,y+.58,bz2,0,0,0,false);
          add(torus(.22,.050),'#cbb382',bx2,y+.085,bz2,Math.PI/2,0,0,'rope');
          if(bi===1) add(torus(.18,.044),'#bfa370',bx2,y+.18,bz2,Math.PI/2,0,0,'rope');
        });
        tagSubProp(s0,vid,'bollards');
        // Sub-prop 4: Compact 3-barrel oak supply cluster cleanly separated behind anchor (>= 0.30u clear)
        s0=root.children.length;
        barrel(x-.34,y,z-.98,.84);
        barrel(x+.34,y,z-.98,.82);
        barrel(x,    y+.58,z-.98,.76);
        tagSubProp(s0,vid,'barrelStack');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.54);
      }
      // Vignette 10 (m5): Ornate carved timber ship's bell stand + gleaming brass binnacle compass pedestal
      function vignetteShipBellStand(x,z,rot){
        var g0=root.children.length, y=-.12, vid='bellStand#'+(++deckVigSeq), s0;
        contact(x,z,1.52,1.16,-.107);
        s0=root.children.length;
        var bx=x-.38, bz=z-.04;
        wornBox(1.02,.16,.54,'#5b3c27',bx,y+.08,bz,'timber');
        [-.36,.36].forEach(function(sd){
          post(.066,1.36,'#754f36',bx+sd,y+.14,bz);
          add(cyl(.082,.082,.07,8),'#e3ba58',bx+sd,y+.84,bz,0,0,0,false);
          block(.15,.08,.20,'#6a462f',bx+sd*.84,y+.24,bz,0,'timber');
        });
        wornBox(1.12,.14,.26,'#8c6244',bx,y+1.50,bz,'timber');
        block(1.18,.08,.32,'#dec49a',bx,y+1.60,bz,0,'timber');
        [-.46,.46].forEach(function(sd){ smoothOrb(.070,'#ebb952',bx+sd,y+1.70,bz,false); });
        add(cyl(.025,.025,.20,6),'#d6a34b',bx,y+1.36,bz,0,0,0,false);
        add(cyl(.13,.27,.35,16),'#ebb952',bx,y+1.10,bz,0,0,0,false);
        add(smoothTorus(.26,.035,8,18),'#f5d272',bx,y+.94,bz,Math.PI/2,0,0,false);
        orb(.072,'#9e7328',bx,y+.90,bz,false);
        add(cyl(.023,.023,.38,6),'#dec692',bx,y+.68,bz,0,0,0,'rope');
        smoothOrb(.052,'#d9be88',bx,y+.49,bz,false);
        tagSubProp(s0,vid,'bellBelfry');
        s0=root.children.length;
        var cx2=x+.78, cz2=z+.08;
        add(cyl(.23,.28,.14,10),'#5e402b',cx2,y+.07,cz2,0,0,0,'timber');
        add(cyl(.12,.17,.76,10),'#80583c',cx2,y+.50,cz2,0,0,0,'timber');
        add(cyl(.19,.15,.12,12),'#e5bc5b',cx2,y+.94,cz2,0,0,0,false);
        smoothOrb(.16,'#e8c263',cx2,y+1.08,cz2,false);
        smoothOrb(.10,'#9ae8e4',cx2,y+1.08,cz2+.11,false);
        block(.52,.044,.044,'#5e402b',cx2,y+.96,cz2,0,'timber');
        smoothOrb(.080,'#d8524a',cx2-.26,y+.98,cz2,false);
        smoothOrb(.080,'#4aa866',cx2+.26,y+.98,cz2,false);
        tagSubProp(s0,vid,'binnacle');
        wrapRot(g0,x,y,z,rot,1.20);
        addObstacle(x,z,1.32);
      }
      // Vignette 6: Navigator's oak chart table with sea map + cleanly separated hanging brass ship's bell belfry
      function vignetteShipBellAndChart(x,z,rot){
        var g0=root.children.length, y=-.12, vid='bellChart#'+(++deckVigSeq), s0;
        contact(x,z,1.66,1.20,-.107);
        s0=root.children.length;
        var tx=x-.50, tz=z;
        [[-.48,-.32],[.48,-.32],[-.48,.32],[.48,.32]].forEach(function(lg){
          post(.052,.72,'#63432c',tx+lg[0],y,tz+lg[1]);
        });
        block(1.08,.06,.74,'#755036',tx,y+.22,tz,0,'timber');
        wornBox(1.24,.11,.88,'#8f6442',tx,y+.76,tz,'timber');
        block(.92,.03,.62,'#f6ebd0',tx-.04,y+.83,tz,.05,'fabric');
        block(.38,.034,.28,'#69b8c4',tx-.16,y+.84,tz-.07,.10,false);
        block(.24,.036,.16,'#d4a96a',tx+.16,y+.84,tz+.09,-.08,false);
        [-.15,0,.15].forEach(function(dd){ orb(.030,'#d4524a',tx+dd,y+.86,tz-dd*.32,false); });
        add(cyl(.062,.062,.54,10),'#efe1be',tx+.42,y+.87,tz+.05,Math.PI/2,0,.14,'fabric');
        add(cyl(.068,.068,.048,10),'#cc4d4a',tx+.42,y+.87,tz+.05,Math.PI/2,0,.14,false);
        add(cyl(.042,.052,.30,8),'#e5bc5b',tx-.38,y+.86,tz+.22,0,.40,Math.PI/2,false);
        tagSubProp(s0,vid,'chartTable');
        s0=root.children.length;
        var bx=x+.88, bz=z-.04;
        wornBox(.74,.14,.44,'#5e402b',bx,y+.07,bz,'timber');
        [-.27,.27].forEach(function(sd){ post(.052,1.20,'#704d36',bx+sd,y+.12,bz); });
        wornBox(.74,.12,.20,'#8c6244',bx,y+1.32,bz,'timber');
        add(cyl(.022,.022,.16,6),'#d6a34b',bx,y+1.20,bz,0,0,0,false);
        add(cyl(.11,.23,.29,14),'#ebb952',bx,y+1.00,bz,0,0,0,false);
        add(smoothTorus(.22,.030,8,16),'#f6d374',bx,y+.87,bz,Math.PI/2,0,0,false);
        orb(.062,'#9e7328',bx,y+.84,bz,false);
        add(cyl(.021,.021,.35,6),'#d9be88',bx,y+.65,bz,0,0,0,'rope');
        tagSubProp(s0,vid,'bellBelfry');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.40);
      }
      // Vignette 7: Anchor chain windlass & coiled heavy iron chains + cleanly separated bucket & crate
      function vignetteAnchorChainWinch(x,z,rot){
        var g0=root.children.length, y=-.12, vid='chainWinch#'+(++deckVigSeq), s0;
        contact(x,z,1.52,1.28,-.107);
        s0=root.children.length;
        var cx2=x-.38, cz2=z-.12;
        add(cyl(.42,.50,.14,12),'#5e402b',cx2,y+.07,cz2,0,0,0,'timber');
        add(cyl(.27,.33,.56,10),'#8c6244',cx2,y+.41,cz2,0,0,0,'timber');
        add(cyl(.34,.30,.14,10),'#754c38',cx2,y+.74,cz2,0,0,0,'timber');
        add(cyl(.21,.21,.08,10),'#d6a34b',cx2,y+.84,cz2,0,0,0,false);
        for(var b=0;b<4;b++) block(.065,.065,1.16,'#c79e6b',cx2,y+.74,cz2,b*Math.PI/2,'timber');
        tagSubProp(s0,vid,'capstan');
        s0=root.children.length;
        anchorChainCoil(x+.82,y+.02,z+.32);
        tagSubProp(s0,vid,'ironChain');
        s0=root.children.length;
        deckBucketAndSwab(x-.64,y,z+.82,0);
        tagSubProp(s0,vid,'bucketSwab');
        s0=root.children.length;
        crate(x+.74,y,z-.72,.70);
        tagSubProp(s0,vid,'crate');
        wrapRot(g0,x,y,z,rot,1.18);
        addObstacle(x,z,1.30);
      }
      // M1: Red-and-white striped MP8 maritime lifebuoy (flat or leaning solidly on deck planks)
      function lifebuoy(x,y,z,rot,lean){
        var tilt=lean?0.34:0, cy=lean?(y+.548*Math.cos(tilt)+.042):(y+.122);
        var bandGeo=geos.buoyBand||(geos.buoyBand=own(new T.TorusGeometry(.42,.122,8,6,Math.PI/4.2)));
        var bGrp=new T.Group(); bGrp.position.set(x,cy,z);
        var inner=new T.Group(); inner.rotation.x=lean?tilt:Math.PI/2;
        function bp(geo,col,px,py,pz,rz,kind){
          var o=mesh(geo,M(col),px,py,pz); if(rz) o.rotation.z=rz;
          inner.add(finish(o,kind||false)); return o;
        }
        bp(smoothTorus(.42,.112,10,20),'#efe5cf',0,0,0,0,'fabric');
        bp(smoothTorus(.52,.022,6,16),'#e2cea0',0,0,0,0,'rope');
        for(var b=0;b<4;b++){
          var ba=b*Math.PI/2+.12;
          bp(bandGeo,'#d84e48',0,0,0,ba,'fabric');
          bp(box(.07,.07,.24),'#c29b62',Math.cos(ba+.38)*.42,Math.sin(ba+.38)*.42,0,ba+.38,'rope');
        }
        bGrp.add(inner);
        if(rot) bGrp.rotation.y=rot;
        root.add(bGrp);
      }
      // M1 / iter24 M1 (865-985, 380-460): Stylized MP8 wooden & brass naval cannon cleanly separated (>= 0.28u!) from shot garland, ammo crates, barrel & breeching chain
      function vignetteCannon(x,z,rot){
        var g0=root.children.length, y=-.12, vid='cannon#'+(++deckVigSeq), s0;
        contact(x,z,1.54,1.34,-.107);
        // Sub-prop 1: Naval cannon & 4-wheel oak carriage (local X: [-0.48..+0.48], Z: [-0.81..+0.84])
        s0=root.children.length;
        [-.36,.36].forEach(function(wz){
          block(.90,.10,.10,'#5a3c26',x,y+.17,z+wz,0,'timber');
          [-.42,.42].forEach(function(wx){
            add(cyl(.17,.17,.12,12),'#533622',x+wx,y+.17,z+wz,0,0,Math.PI/2,'timber');
            add(cyl(.068,.068,.15,8),'#e5bc5b',x+wx,y+.17,z+wz,0,0,Math.PI/2,false);
          });
        });
        wornBox(.72,.12,1.12,'#6d4a32',x,y+.26,z-.02,'timber');
        [-.32,.32].forEach(function(wx){
          wornBox(.15,.36,1.06,'#7d5438',x+wx,y+.44,z-.04,'timber');
          wornBox(.15,.20,.62,'#8d6040',x+wx,y+.68,z+.16,'timber');
          block(.18,.08,.22,'#e3ba58',x+wx,y+.80,z+.16,0,false);
        });
        block(.34,.16,.28,'#b58450',x,y+.41,z-.38,0,'timber');
        var elev=-.07;
        add(cyl(.20,.24,.68,14),'#3a4957',x,y+.68,z-.22,Math.PI/2+elev,0,0,false);
        add(cyl(.155,.20,.74,14),'#465868',x,y+.73,z+.40,Math.PI/2+elev,0,0,false);
        add(cyl(.248,.248,.08,14),'#e5bc5b',x,y+.66,z-.48,Math.PI/2+elev,0,0,false);
        add(cyl(.215,.215,.075,14),'#e5bc5b',x,y+.70,z+.06,Math.PI/2+elev,0,0,false);
        add(cyl(.205,.18,.11,14),'#e8c263',x,y+.76,z+.76,Math.PI/2+elev,0,0,false);
        add(cyl(.11,.11,.05,12),'#182028',x,y+.765,z+.81,Math.PI/2+elev,0,0,false);
        add(cyl(.075,.075,.86,10),'#3a4957',x,y+.74,z+.16,0,0,Math.PI/2,false);
        add(cyl(.11,.14,.14,10),'#3a4957',x,y+.64,z-.58,Math.PI/2+elev,0,0,false);
        smoothOrb(.13,'#e3b854',x,y+.63,z-.68,false);
        tagSubProp(s0,vid,'cannonCarriage');
        // Sub-prop 2: Wooden shot garland + glossy cannonball pyramid (>= 0.30u open plank clearance left of carriage)
        s0=root.children.length;
        var sx=x-1.04, sz=z+.30;
        wornBox(.48,.08,.48,'#5e402b',sx,y+.04,sz,'timber');
        [[-.11,-.09],[.11,-.09],[0,.10]].forEach(function(bp){
          smoothOrb(.110,'#2e3a46',sx+bp[0],y+.18,sz+bp[1],false);
        });
        smoothOrb(.110,'#3d4c5a',sx,y+.34,sz-.02,false);
        tagSubProp(s0,vid,'shotGarland');
        // Sub-prop 3: Coiled forged-iron breeching chain cleanly aft-left of carriage (>= 0.30u clear of carriage & garland)
        s0=root.children.length;
        deckIronChainCoil(x-1.14,y,z-.60,Math.PI);
        tagSubProp(s0,vid,'ironChain');
        // Sub-prop 4: Brass-strapped ammo crate stack cleanly right of carriage (>= 0.30u open plank clearance!)
        s0=root.children.length;
        crate(x+1.06,y,z-.42,.82);
        crate(x+1.06,y+.48,z-.42,.56);
        [-.23,.23].forEach(function(bx){ block(.055,.48,.53,'#e3ba58',x+1.06+bx,y+.24,z-.42,0,false); });
        tagSubProp(s0,vid,'ammoCrates');
        // Sub-prop 5: Upright oak powder barrel cleanly separated from both carriage & ammo crates (>= 0.30u!)
        s0=root.children.length;
        barrel(x+1.06,y,z+.42,.76);
        tagSubProp(s0,vid,'powderBarrel');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.46);
      }
      // iter18 m3 / iter23 Minor #2 & #7 / iter24 M1 (655-720, 470-540): Cargo Grate Hatch with brass lantern post, crates, lifebuoy & bucket ALL cleanly OUTSIDE hatch coaming (>= 0.25u clear!)
      function vignetteHatchAndBuoy(x,z,rot){
        var g0=root.children.length, y=-.12, vid='hatchBuoy#'+(++deckVigSeq), s0;
        contact(x,z,1.86,1.56,-.107);
        var hx=x-.16, hz=z+.04;
        // Sub-prop 1: Dark-oak coaming & slatted cargo grate hatch (local X: [hx-0.87..hx+0.87], Z: [hz-0.69..hz+0.69])
        s0=root.children.length;
        wornBox(1.74,.24,1.38,'#5e402b',hx,y+.12,hz,'timber');
        block(1.42,.10,1.06,'#241913',hx,y+.19,hz,0,false);
        for(var gx=-2;gx<=2;gx++) block(.084,.06,1.06,'#9e7348',hx+gx*.28,y+.25,hz,0,'timber');
        for(var gz=-1;gz<=1;gz++) block(1.42,.05,.084,'#8c633b',hx,y+.26,hz+gz*.31,0,'timber');
        [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
          block(.16,.08,.16,'#e3ba58',hx+sx*.76,y+.24,hz+sz*.57,0,false);
        }); });
        add(torus(.076,.019),'#e5bc5b',hx+.76,y+.27,hz,Math.PI/2,0,0,false);
        add(torus(.076,.019),'#e5bc5b',hx-.76,y+.27,hz,Math.PI/2,0,0,false);
        tagSubProp(s0,vid,'hatch');
        // Sub-prop 2: Brass deck lantern stanchion cleanly OUTSIDE rear-left hatch coaming corner (>= 0.30u clear of wood; arm points -X parallel to hatch so Kiko gets wide daylight!)
        s0=root.children.length;
        var lx=hx+.58, lz=hz-1.22;
        add(cyl(.17,.21,.20,8),'#5e402b',lx,y+.10,lz,0,0,0,'timber');
        post(.058,1.14,'#4e3e34',lx,y+.18,lz);
        block(.34,.056,.056,'#d6a34b',lx-.14,y+1.24,lz,0,false);
        add(cyl(.14,.12,.25,8),'#f2cb72',lx-.28,y+1.06,lz,0,0,0,false);
        add(torus(.15,.022),'#b5873d',lx-.28,y+1.18,lz,Math.PI/2,0,0,false);
        add(torus(.15,.022),'#b5873d',lx-.28,y+.94,lz,Math.PI/2,0,0,false);
        add(cone(.185,.14,8),'#c4943e',lx-.28,y+1.26,lz,0,0,0,false);
        smoothOrb(.042,'#e8c263',lx-.28,y+1.35,lz,false);
        tagSubProp(s0,vid,'lanternPost');
        // Sub-prop 3: Stacked brass-strapped cargo crates cleanly OUTSIDE +X hatch coaming (>= 0.32u clear!)
        s0=root.children.length;
        crate(hx+1.44,y,hz-.18,.72);
        crate(hx+1.44,y+.42,hz-.18,.50);
        [-.20,.20].forEach(function(bx){ block(.048,.43,.47,'#e3ba58',hx+1.44+bx,y+.215,hz-.18,0,false); });
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 4: Red-and-white lifebuoy cleanly OUTSIDE far-right (+Z) hatch coaming (>= 0.28u clear, wide daylight from Captain Bay!)
        s0=root.children.length;
        lifebuoy(hx-.16,y,hz+1.26,0,true);
        tagSubProp(s0,vid,'lifebuoy');
        // Sub-prop 5: Wooden ship's bucket & deck swab cleanly OUTSIDE front-left (-Z) hatch coaming (>= 0.30u clear!)
        s0=root.children.length;
        deckBucketAndSwab(hx-.56,y,hz-1.26,0);
        tagSubProp(s0,vid,'bucketSwab');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.56);
      }
      // iter18 m3 / iter24 M1 (255-310, 385-460): Cohesive Navigator Station (brass spyglass tripod cleanly separated >= 0.30u from sea chest, chart crate & barrel lantern!)
      function vignetteNavigatorStation(x,z,rot){
        var g0=root.children.length, y=-.12, vid='navigator#'+(++deckVigSeq), s0;
        contact(x,z,1.88,1.58,-.107);
        // Sub-prop 1: Brass-bound sea chest + red-ribboned rolled chart scroll on rear-right
        s0=root.children.length;
        cargoChest(x+.36,y,z-.34,0);
        add(cyl(.066,.066,.52,10),'#f6ebd0',x+.36,y+.88,z-.34,0,0,Math.PI/2,'fabric');
        add(cyl(.072,.072,.06,10),'#cc4d4a',x+.36,y+.88,z-.34,0,0,Math.PI/2,false);
        tagSubProp(s0,vid,'seaChest');
        // Sub-prop 2: Three-legged timber tripod + gleaming stepped brass spyglass cleanly in front-right (>= 0.35u clear of chest & crates!)
        s0=root.children.length;
        var tx=x+.62, tz=z+.68;
        for(var lg=0;lg<3;lg++){
          var la=lg*Math.PI*2/3+.35;
          var fxL=tx+Math.cos(la)*.24, fzL=tz+Math.sin(la)*.24;
          add(cyl(.036,.045,.08,8),'#d6a34b',fxL,y+.04,fzL,0,0,0,false);
          limb(fxL,y+.02,fzL,-Math.cos(la)*.23,.96,-Math.sin(la)*.23,.98,.032,.022,'#6e4c35','timber');
        }
        add(cyl(.075,.085,.11,8),'#d9aa48',tx,y+.96,tz,0,0,0,false);
        var scopeDir=[.64,.36,.66];
        var s1=limb(tx-.12,y+.94,tz-.12,scopeDir[0],scopeDir[1],scopeDir[2],.36,.040,.054,'#d9aa48',false);
        var s2=limb(s1[0],s1[1],s1[2],scopeDir[0],scopeDir[1],scopeDir[2],.34,.060,.076,'#f2ce6e',false);
        smoothOrb(.064,'#9ce4f5',s2[0],s2[1],s2[2],false);
        tagSubProp(s0,vid,'spyglassTripod');
        // Sub-prop 3: Beveled wooden chart crate with open nautical sea map & brass ship's compass cleanly left of chest (>= 0.32u clear!)
        s0=root.children.length;
        var cxN=x-.96, czN=z-.32;
        wornBox(.92,.54,.70,'#a66d45',cxN,y+.27,czN,'timber');
        [-.40,.40].forEach(function(bx){ block(.065,.56,.74,'#e3ba58',cxN+bx,y+.28,czN,0,false); });
        block(.74,.03,.50,'#f4e7c8',cxN,y+.56,czN,.05,'fabric');
        block(.32,.034,.22,'#69b8c4',cxN-.10,y+.57,czN-.06,.08,false);
        block(.18,.036,.15,'#d4a96a',cxN+.15,y+.57,czN+.07,-.06,false);
        add(cyl(.13,.14,.055,14),'#d9aa48',cxN-.22,y+.58,czN+.16,0,0,0,false);
        add(cyl(.10,.10,.065,14),'#faf1d8',cxN-.22,y+.585,czN+.16,0,0,0,false);
        block(.14,.02,.03,'#d4524a',cxN-.22,y+.62,czN+.16,.35,false);
        tagSubProp(s0,vid,'chartCrate');
        // Sub-prop 4: Stout oak barrel topped with glowing brass deck lantern cleanly in front-left (>= 0.34u clear!)
        s0=root.children.length;
        var bxN=x-.76, bzN=z+.70;
        barrel(bxN,y,bzN,.84);
        seatedBrassLantern(bxN,y+.57,bzN);
        tagSubProp(s0,vid,'barrelLantern');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.50);
      }
      // iter18 m3 / iter24 M1: Cohesive Capstan & Belaying-Pin Rigging Station (all 3 sub-props >= 0.32u clear!)
      function vignetteCapstanRigging(x,z,rot){
        var g0=root.children.length, y=-.12, vid='capstanRig#'+(++deckVigSeq), s0;
        contact(x,z,1.76,1.44,-.107);
        // Sub-prop 1: Turned oak & brass capstan on right
        s0=root.children.length;
        var cx2=x+.74, cz2=z+.06;
        add(cyl(.40,.48,.14,12),'#5e402b',cx2,y+.07,cz2,0,0,0,'timber');
        add(cyl(.26,.32,.56,10),'#8c6244',cx2,y+.41,cz2,0,0,0,'timber');
        add(cyl(.34,.30,.14,10),'#754c38',cx2,y+.74,cz2,0,0,0,'timber');
        add(cyl(.20,.20,.08,10),'#d6a34b',cx2,y+.84,cz2,0,0,0,false);
        for(var b=0;b<4;b++) block(.065,.065,1.12,'#c79e6b',cx2,y+.74,cz2,b*Math.PI/2,'timber');
        tagSubProp(s0,vid,'capstan');
        // Sub-prop 2: Timber belaying-pin rail with 4 turned belaying pins cleanly on left-rear
        s0=root.children.length;
        var rx2=x-.80, rz2=z-.56;
        [-.48,.48].forEach(function(sx){
          wornBox(.17,.12,.30,'#5e402b',rx2+sx,y+.06,rz2,'timber');
          post(.068,.88,'#704d36',rx2+sx,y+.08,rz2);
        });
        wornBox(1.22,.14,.22,'#8c6244',rx2,y+.84,rz2,'timber');
        [-.34,-.11,.11,.34].forEach(function(px){
          add(cyl(.026,.022,.32,8),'#dfc088',rx2+px,y+.98,rz2,0,0,0,'timber');
          smoothOrb(.042,'#ebd19c',rx2+px,y+1.15,rz2,false);
        });
        tagSubProp(s0,vid,'pinrail');
        // Sub-prop 3: Mooring bollard wrapped tightly with heavy hawser coils cleanly in front-left (>= 0.35u clear!)
        s0=root.children.length;
        post(.12,.56,'#5e402b',x-.74,y,z+.50);
        add(cyl(.14,.14,.06,8),'#d6a34b',x-.74,y+.58,z+.50,0,0,0,false);
        add(smoothTorus(.32,.070,8,18),'#cbb382',x-.74,y+.08,z+.50,Math.PI/2,0,0,'rope');
        add(smoothTorus(.25,.062,8,18),'#bfa370',x-.74,y+.18,z+.50,Math.PI/2,0,0,'rope');
        tagSubProp(s0,vid,'bollard');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.42);
      }
      // M1/m5: Stacked nautical crates, barrel, cleanly separated coiled rope, lifebuoy & brass deck lantern
      function vignetteCratesLanternBuoy(x,z,rot){
        var g0=root.children.length, y=-.12, vid='cratesLanternBuoy#'+(++deckVigSeq), s0;
        contact(x,z,1.62,1.44,-.107);
        s0=root.children.length;
        crate(x-.48,y,z-.42,.92);
        crate(x-.46,y+.54,z-.42,.64);
        [-.73,-.23].forEach(function(bx){ block(.06,.54,.60,'#e3ba58',x+bx,y+.27,z-.42,0,false); });
        tagSubProp(s0,vid,'crateStack');
        s0=root.children.length;
        crate(x+.42,y,z-.42,.78);
        tagSubProp(s0,vid,'sideCrate');
        s0=root.children.length;
        barrel(x+.64,y,z+.46,.86);
        tagSubProp(s0,vid,'oakBarrel');
        s0=root.children.length;
        lifebuoy(x-.24,y,z+.52,0,true);
        tagSubProp(s0,vid,'lifebuoy');
        s0=root.children.length;
        deckRopeCoil(x-1.08,y+.04,z+.46,.70);
        tagSubProp(s0,vid,'ropeCoil');
        s0=root.children.length;
        var lx=x+1.12, lz=z-.36;
        add(cyl(.18,.23,.18,8),'#5e402b',lx,y+.09,lz,0,0,0,'timber');
        post(.058,1.26,'#4e3e34',lx,y+.16,lz);
        block(.34,.056,.056,'#d6a34b',lx+.14,y+1.36,lz,0,false);
        add(cyl(.14,.12,.26,8),'#f2cb72',lx+.28,y+1.17,lz,0,0,0,false);
        add(torus(.15,.022),'#b5873d',lx+.28,y+1.30,lz,Math.PI/2,0,0,false);
        add(torus(.15,.022),'#b5873d',lx+.28,y+1.04,lz,Math.PI/2,0,0,false);
        add(cone(.19,.15,8),'#c4943e',lx+.28,y+1.38,lz,0,0,0,false);
        tagSubProp(s0,vid,'lanternPost');
        wrapRot(g0,x,y,z,rot,1.16);
        addObstacle(x,z,1.36);
      }
      // iter20 Minor #7 / iter24 M1 Zone A (760-1000, 250-400): Mid-right starboard cargo crates, barrels, horned cleat, rope coil & brass lantern (all >= 0.25u clear!)
      function vignetteStarboardCargoCleat(x,z,rot){
        var g0=root.children.length, y=-.12, vid='starboardCargoCleat#'+(++deckVigSeq), s0;
        contact(x,z,2.04,1.76,-.107);
        // Sub-prop 1: Brass-strapped stacked cargo crates + folded coastal canvas tarp (starboard-front)
        s0=root.children.length;
        crate(x+.64,y,z+.56,.92);
        crate(x+.62,y+.54,z+.56,.64);
        [x+.38,x+.90].forEach(function(bx){ block(.056,.54,.60,'#e3ba58',bx,y+.27,z+.56,0,false); });
        wornBox(.54,.075,.50,'#ecd9ad',x+.62,y+.94,z+.56,'fabric');
        block(.50,.055,.44,'#4d8898',x+.62,y+.99,z+.56,0,'fabric');
        add(cyl(.062,.062,.52,10),'#f5e7c4',x+.87,y+.96,z+.56,Math.PI/2,0,0,'fabric');
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 2: Companion cargo crate cleanly left of crate stack (>= 0.28u clear!)
        s0=root.children.length;
        crate(x-.18,y,z+.56,.78);
        tagSubProp(s0,vid,'sideCrate');
        // Sub-prop 3: Upright oak barrel 1 cleanly behind crate stack
        s0=root.children.length;
        barrel(x+.82,y,z-.48,.82);
        tagSubProp(s0,vid,'barrel1');
        // Sub-prop 4: Upright oak barrel 2 cleanly inboard-rear
        s0=root.children.length;
        barrel(x+.04,y,z-.64,.76);
        tagSubProp(s0,vid,'barrel2');
        // Sub-prop 5: Heavy timber-and-brass horned deck mooring cleat bolted to inboard-rear planks
        s0=root.children.length;
        var clX=x-.96, clZ=z-.92;
        wornBox(.62,.10,.32,'#5a3c26',clX,y+.05,clZ,'timber');
        [-.14,.14].forEach(function(sd){ add(cyl(.050,.064,.16,8),'#d8ad52',clX+sd,y+.16,clZ,0,0,0,false); });
        wornBox(.64,.082,.12,'#e5bc5b',clX,y+.24,clZ,false);
        [-1,1].forEach(function(sd){ add(cyl(.025,.046,.19,8),'#ecc669',clX+sd*.38,y+.255,clZ,0,0,-sd*1.42,false); });
        add(smoothTorus(.125,.028,6,14),'#d9be86',clX-.09,y+.17,clZ,Math.PI/2,.24,0,'rope');
        add(smoothTorus(.125,.028,6,14),'#cbb382',clX+.09,y+.18,clZ,Math.PI/2,-.24,0,'rope');
        tagSubProp(s0,vid,'mooringCleat');
        // Sub-prop 6: Chunky 3-tier coiled hemp hawser cleanly on open planks between cleat & lantern (>= 0.26u clear!)
        s0=root.children.length;
        deckRopeCoil(x-1.02,y+.04,z-.18,.68);
        tagSubProp(s0,vid,'ropeCoil');
        // Sub-prop 7: Warm glowing brass deck lantern stanchion cleanly at aft-inboard flank (arm points -X clear of crate & rope)
        s0=root.children.length;
        var lx=x-1.04, lz=z+.68;
        add(cyl(.17,.22,.18,8),'#5e402b',lx,y+.09,lz,0,0,0,'timber');
        post(.058,1.20,'#4e3e34',lx,y+.16,lz);
        block(.34,.056,.056,'#d6a34b',lx-.14,y+1.30,lz,0,false);
        add(cyl(.14,.12,.25,10),'#f4cf74',lx-.28,y+1.12,lz,0,0,0,false);
        smoothOrb(.080,'#fff2bc',lx-.28,y+1.12,lz,false);
        add(torus(.15,.021),'#b5873d',lx-.28,y+1.24,lz,Math.PI/2,0,0,false);
        add(torus(.15,.021),'#b5873d',lx-.28,y+1.00,lz,Math.PI/2,0,0,false);
        add(cone(.19,.14,10),'#c4943e',lx-.28,y+1.32,lz,0,0,0,false);
        smoothOrb(.042,'#e8c263',lx-.28,y+1.41,lz,false);
        tagSubProp(s0,vid,'lanternPost');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.46);
      }
      // iter20 Minor #7 / iter24 M1 Zone 2 (540-650, 80-195): Foregrounded Timber Grate + Striped-Tarp Crates + Lashed Barrels + Brass Lantern + Bollard & Coiled Rope (ZERO tile clips, ZERO intra clips!)
      function vignetteUpperHatchBarrels(x,z,rot){
        var g0=root.children.length, y=-.12, vid='upperHatchBarrels#'+(++deckVigSeq), s0;
        contact(x,z,2.08,1.88,-.107);
        // Sub-prop 1: Broad honey-oak & brass slatted timber deck grate
        s0=root.children.length;
        var hx=x-.18, hz=z+.02;
        wornBox(1.22,.22,1.56,'#5c3e29',hx,y+.11,hz,'timber');
        block(.96,.09,1.26,'#221812',hx,y+.17,hz,0,false);
        for(var gx=-2;gx<=2;gx++) block(.076,.056,1.26,'#ba8b56',hx+gx*.20,y+.23,hz,0,'timber');
        for(var gz=-2;gz<=2;gz++) block(.96,.048,.076,'#a47746',hx,y+.24,hz+gz*.25,0,'timber');
        block(1.02,.058,.095,'#e5bc5b',hx,y+.27,hz,0,false);
        [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
          block(.15,.078,.15,'#e8c05c',hx+sx*.50,y+.23,hz+sz*.67,0,false);
        }); });
        add(torus(.070,.018),'#ecc669',hx,y+.26,hz+.67,Math.PI/2,0,0,false);
        add(torus(.070,.018),'#ecc669',hx,y+.26,hz-.67,Math.PI/2,0,0,false);
        tagSubProp(s0,vid,'hatch');
        // Sub-prop 2: Left-rear brass-strapped cargo crate stack + cream-and-teal folded striped tarp (>= 0.30u clear of hatch & lantern!)
        s0=root.children.length;
        var cxL=x+.94, czL=z-.96;
        crate(cxL,y,czL,.90);
        [-.25,.25].forEach(function(bs){ block(.054,.53,.58,'#e8c05c',cxL+bs,y+.27,czL,0,false); });
        crate(cxL,y+.53,czL,.62);
        wornBox(.54,.072,.50,'#f2e2bc',cxL,y+.92,czL,'fabric');
        block(.50,.052,.44,'#4d8898',cxL,y+.97,czL,0,'fabric');
        add(cyl(.062,.062,.52,10),'#f6ebd0',cxL+.25,y+.94,czL,Math.PI/2,0,0,'fabric');
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 3: Right-rear lashed 3-barrel oak cluster on timber sea-chock cradle (>= 0.28u clear!)
        s0=root.children.length;
        var bx=x+1.14, bz=z+1.06;
        wornBox(.94,.09,.82,'#5a3c27',bx,y+.045,bz,'timber');
        barrel(bx-.20,y+.04,bz-.18,.82);
        barrel(bx+.22,y+.04,bz+.14,.80);
        barrel(bx+.01,y+.58,bz-.02,.74);
        add(smoothTorus(.48,.028,6,18),'#e4cb96',bx+.01,y+.33,bz-.02,Math.PI/2,0,0,'rope');
        add(smoothTorus(.45,.026,6,18),'#d6bb84',bx+.01,y+.47,bz-.02,Math.PI/2,.10,0,'rope');
        tagSubProp(s0,vid,'barrelCluster');
        // Sub-prop 4: Warm glowing brass deck lantern stanchion cleanly between crate stack & lashed barrels (arm points +X)
        s0=root.children.length;
        var lx=x+.96, lz=z-.02;
        add(cyl(.17,.22,.18,8),'#5e402b',lx,y+.09,lz,0,0,0,'timber');
        post(.058,1.28,'#4e3e34',lx,y+.16,lz);
        block(.34,.054,.054,'#d6a34b',lx+.14,y+1.38,lz,0,false);
        add(cyl(.14,.12,.25,10),'#f6d67a',lx+.28,y+1.20,lz,0,0,0,false);
        smoothOrb(.084,'#fff4c4',lx+.28,y+1.20,lz,false);
        add(torus(.15,.021),'#b5873d',lx+.28,y+1.32,lz,Math.PI/2,0,0,false);
        add(torus(.15,.021),'#b5873d',lx+.28,y+1.07,lz,Math.PI/2,0,0,false);
        add(cone(.19,.14,10),'#d6a34b',lx+.28,y+1.40,lz,0,0,0,false);
        smoothOrb(.042,'#ecc669',lx+.28,y+1.49,lz,false);
        tagSubProp(s0,vid,'lanternPost');
        // Sub-prop 5: Foregrounded twin brass-capped oak mooring bollard cleanly in front-right of grate
        s0=root.children.length;
        var blX=x-1.26, blZ=z+.56;
        wornBox(.36,.10,.66,'#5a3c27',blX,y+.05,blZ,'timber');
        [-.16,.16].forEach(function(sd){
          post(.084,.54,'#5e402b',blX,y+.08,blZ+sd);
          add(cyl(.102,.102,.056,10),'#e8c05c',blX,y+.64,blZ+sd,0,0,0,false);
          add(smoothTorus(.175,.038,8,16),'#e2c890',blX,y+.15,blZ+sd,Math.PI/2,0,0,'rope');
        });
        tagSubProp(s0,vid,'bollard');
        // Sub-prop 6: Chunky 3-tier coiled hemp hawser cleanly in front-left of grate (clear of tiles!)
        s0=root.children.length;
        deckRopeCoil(x-1.30,y+.04,z-.48,.68);
        tagSubProp(s0,vid,'ropeCoil');
        wrapRot(g0,x,y,z,rot,1.12);
        addObstacle(x,z,1.44);
      }
      // iter21 Minor #3 / iter24 M1 Zone 1 (300-460, 290-400): Mid-Left Ship's Bell Belfry + Map Chest + Oak Barrel & Lantern + Burlap Sacks (all >= 0.28u clear!)
      function vignetteMidLeftBellMapChest(x,z,rot){
        var g0=root.children.length, y=-.12, vid='midLeftBellMap#'+(++deckVigSeq), s0;
        contact(x,z,1.92,1.66,-.107);
        // Sub-prop 1: Carved mahogany & brass ship's bell belfry stand
        s0=root.children.length;
        var bx=x+.62, bz=z+.56;
        wornBox(.50,.16,.98,'#5b3c27',bx,y+.08,bz,'timber');
        [-.34,.34].forEach(function(sd){
          post(.064,1.28,'#754f36',bx,y+.14,bz+sd);
          add(cyl(.080,.080,.068,8),'#e5bc5b',bx,y+.82,bz+sd,0,0,0,false);
          block(.20,.08,.15,'#6a462f',bx,y+.24,bz+sd*.84,0,'timber');
        });
        wornBox(.26,.14,1.08,'#8c6244',bx,y+1.42,bz,'timber');
        block(.32,.08,1.14,'#dec49a',bx,y+1.52,bz,0,'timber');
        [-.44,.44].forEach(function(sd){ smoothOrb(.068,'#ebb952',bx,y+1.62,bz+sd,false); });
        add(cyl(.025,.025,.19,6),'#d6a34b',bx,y+1.28,bz,0,0,0,false);
        add(cyl(.125,.26,.34,16),'#ebb952',bx,y+1.03,bz,0,0,0,false);
        add(smoothTorus(.25,.034,8,18),'#f6d374',bx,y+.88,bz,Math.PI/2,0,0,false);
        orb(.070,'#9e7328',bx,y+.84,bz,false);
        add(cyl(.023,.023,.36,6),'#e2c890',bx,y+.64,bz,0,0,0,'rope');
        smoothOrb(.052,'#d9be88',bx,y+.45,bz,false);
        tagSubProp(s0,vid,'bellBelfry');
        // Sub-prop 2: Brass-bound oak nautical map chest topped with open parchment chart & compass
        s0=root.children.length;
        var mx=x-.34, mz=z+.38;
        wornBox(.70,.50,.96,'#8f5c3c',mx,y+.25,mz,'timber');
        [-.32,.32].forEach(function(bs){ block(.74,.52,.065,'#e5bc5b',mx,y+.26,mz+bs,0,false); });
        block(.08,.15,.13,'#f2ce6b',mx-.36,y+.40,mz,0,false);
        block(.52,.030,.76,'#f6ebd0',mx,y+.52,mz,.06,'fabric');
        block(.24,.034,.32,'#69b8c4',mx-.06,y+.53,mz-.11,.10,false);
        block(.17,.036,.20,'#d4a96a',mx+.08,y+.53,mz+.13,-.08,false);
        [-.13,0,.13].forEach(function(dd){ orb(.026,'#d4524a',mx-dd*.32,y+.55,mz+dd,false); });
        add(cyl(.12,.13,.052,14),'#d9aa48',mx-.15,y+.54,mz+.22,0,0,0,false);
        add(cyl(.095,.095,.062,14),'#faf1d8',mx-.15,y+.545,mz+.22,0,0,0,false);
        block(.03,.02,.12,'#d4524a',mx-.15,y+.58,mz+.22,.35,false);
        add(cyl(.055,.055,.45,10),'#efe1be',mx+.15,y+.56,mz-.07,0,.15,Math.PI/2,'fabric');
        add(cyl(.061,.061,.048,10),'#cc4d4a',mx+.15,y+.56,mz-.07,0,.15,Math.PI/2,false);
        tagSubProp(s0,vid,'mapChest');
        // Sub-prop 3: Stout oak barrel + warm seated brass deck lantern cleanly behind-left of chest
        s0=root.children.length;
        var ox=x+.62, oz=z-.72;
        barrel(ox,y,oz,.88);
        seatedBrassLantern(ox,y+.60,oz);
        tagSubProp(s0,vid,'barrelLantern');
        // Sub-prop 4: Tied burlap cargo sacks cleanly separated in front-left (>= 0.28u clear!)
        s0=root.children.length;
        deckBurlapSacks(x-.54,y,z-.84,0);
        tagSubProp(s0,vid,'burlapSacks');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.30);
      }
      // iter21 Minor #3 / iter24 M1 Zone 3 (765-855, 400-470): Ship's Iron-and-Oak Anchor on Timber Chocks cleanly separated (>= 0.28u!) from coiled iron chain & brass deck bollard
      function vignetteDeckAnchorBollard(x,z,rot){
        var g0=root.children.length, y=-.12, vid='deckAnchor#'+(++deckVigSeq), s0;
        contact(x,z,1.66,1.38,-.107);
        // Sub-prop 1: Grounded twin oak timber deck chocks + reclining forged-iron & oak Admiralty anchor (local X:[-0.84..+0.36], Z:[-0.48..+0.36])
        s0=root.children.length;
        var ax=x-.28, az=z-.06;
        wornBox(.96,.06,.15,'#5a3c27',ax,y+.03,az-.26,'timber');
        wornBox(.96,.06,.15,'#5a3c27',ax,y+.03,az+.26,'timber');
        wornBox(.20,.14,.80,'#6d4a31',ax-.30,y+.07,az,'timber');
        wornBox(.20,.22,.80,'#785237',ax+.30,y+.11,az,'timber');
        [-.30,.30].forEach(function(cx3){ [-.30,.30].forEach(function(cz3){
          add(cyl(.028,.028,.034,8),'#3c4752',ax+cx3,y+(cx3>0?.225:.145),az+cz3,0,0,0,false);
        }); });
        limb(ax-.45,y+.20,az,.94,.13,0,.95,.084,.060,'#3c4956',false);
        smoothOrb(.102,'#323e4a',ax-.47,y+.20,az,false);
        [-1,1].forEach(function(sd){
          var p1=limb(ax-.43,y+.20,az+sd*.04,.14,.014,sd*.32,.35,.070,.056,'#3e4b58',false);
          var p2=limb(p1[0],p1[1],p1[2],.24,.022,sd*.19,.31,.056,.036,'#4d5d6d',false);
          limb(p2[0]-.04,p2[1],p2[2]-sd*.03,.21,.018,sd*.05,.22,.118,.016,'#637688',false);
          block(.14,.050,.14,'#566878',p2[0]+.03,p2[1]+.01,p2[2],sd*.20,false);
        });
        wornBox(.14,.14,.86,'#9c6b42',ax+.33,y+.31,az,'timber');
        [-.32,.32].forEach(function(sz2){ block(.16,.16,.075,'#e8c05c',ax+.33,y+.31,az+sz2,0,false); });
        block(.18,.17,.19,'#35414d',ax+.33,y+.31,az,0,false);
        add(smoothTorus(.13,.030,8,16),'#526272',ax+.53,y+.34,az,Math.PI/2,0,0,false);
        tagSubProp(s0,vid,'anchorChocks');
        // Sub-prop 2: Compact coiled forged-iron anchor chain cleanly separated behind-left of anchor (>= 0.28u clear!)
        s0=root.children.length;
        var chX=x+.96, chZ=z-.42;
        for(var ci=0;ci<3;ci++){
          add(smoothTorus(.160+ci*.044,.029,8,16),'#49535e',chX,y+.032+ci*.036,chZ,Math.PI/2,0,0,false);
        }
        tagSubProp(s0,vid,'ironChain');
        // Sub-prop 3: Stout brass-capped oak deck bollard wrapped in cream-hemp hawser turns cleanly separated on right flank (>= 0.28u clear!)
        s0=root.children.length;
        var blX=x+.96, blZ=z+.42;
        wornBox(.40,.10,.40,'#5a3c27',blX,y+.05,blZ,'timber');
        post(.135,.54,'#6c4a32',blX,y+.08,blZ);
        add(cyl(.158,.158,.070,12),'#e8c05c',blX,y+.64,blZ,0,0,0,false);
        smoothOrb(.125,'#f5d578',blX,y+.70,blZ,false);
        add(smoothTorus(.215,.046,8,18),'#e2c890',blX,y+.14,blZ,Math.PI/2,0,0,'rope');
        add(smoothTorus(.195,.042,8,18),'#d6bb84',blX,y+.24,blZ,Math.PI/2,0,0,'rope');
        add(smoothTorus(.178,.038,8,18),'#e2c890',blX,y+.33,blZ,Math.PI/2,0,0,'rope');
        tagSubProp(s0,vid,'bollard');
        wrapRot(g0,x,y,z,rot,1.12);
      }
      // iter22 Minor #4 / iter24 M1 Pocket 1 (0-90, 190-330): Port-side lashed oak barrel pair + horned deck cleat & coiled hawser (all >= 0.30u clear!)
      function vignettePortLashedBarrelsCleat(x,z,rot){
        var g0=root.children.length, y=-.12, vid='portLashedBarrels#'+(++deckVigSeq), s0;
        contact(x,z,1.68,1.46,-.107);
        // Sub-prop 1: Timber sea-chock cradle + chunky lashed oak barrel pair
        s0=root.children.length;
        var bx=x+.56, bz=z-.04;
        wornBox(1.06,.10,.90,'#5a3c27',bx,y+.05,bz,'timber');
        [-.42,.42].forEach(function(cx3){ block(.13,.15,.78,'#6d4a31',bx+cx3,y+.10,bz,0,'timber'); });
        barrel(bx-.28,y+.06,bz-.11,.96);
        barrel(bx+.30,y+.06,bz+.11,.92);
        add(cyl(.052,.052,.04,8),'#c4955a',bx-.28,y+.72,bz-.11,0,0,0,'timber');
        add(cyl(.052,.052,.04,8),'#c4955a',bx+.30,y+.69,bz+.11,0,0,0,'timber');
        add(smoothTorus(.51,.032,8,18),'#e4cb96',bx+.01,y+.36,bz,Math.PI/2,0,0,'rope');
        add(smoothTorus(.49,.028,8,18),'#d6bb84',bx+.01,y+.51,bz,Math.PI/2,0,0,'rope');
        limb(bx-.53,y+.09,bz+.35,.53,.58,-.34,.86,.026,.026,'#e4cb96','rope');
        limb(bx+.55,y+.09,bz-.34,-.53,.58,.34,.86,.026,.026,'#d6bb84','rope');
        tagSubProp(s0,vid,'lashedBarrels');
        // Sub-prop 2: Heavy horned timber-and-brass deck mooring cleat cleanly separated on left-rear
        s0=root.children.length;
        var clX=x-.80, clZ=z-.54;
        wornBox(.38,.10,.70,'#5a3c27',clX,y+.05,clZ,'timber');
        [-.15,.15].forEach(function(sd){ add(cyl(.052,.066,.16,8),'#d8ad52',clX,y+.16,clZ+sd,0,0,0,false); });
        wornBox(.13,.09,.68,'#e8c05c',clX,y+.24,clZ,false);
        [-1,1].forEach(function(sd){ add(cyl(.026,.048,.20,8),'#f2ce6e',clX,y+.255,clZ+sd*.41,sd*1.42,0,0,false); });
        add(smoothTorus(.13,.030,6,14),'#e2c890',clX,y+.17,clZ-.10,Math.PI/2,0,.22,'rope');
        add(smoothTorus(.13,.030,6,14),'#d2b67c',clX,y+.18,clZ+.10,Math.PI/2,0,-.22,'rope');
        tagSubProp(s0,vid,'mooringCleat');
        // Sub-prop 3: Chunky 3-tier coiled hemp hawser cleanly separated in front-left (>= 0.30u clear!)
        s0=root.children.length;
        deckRopeCoil(x-.78,y+.04,z+.62,.70);
        tagSubProp(s0,vid,'ropeCoil');
        wrapRot(g0,x,y,z,rot,1.16);
        addObstacle(x,z,1.42);
      }
      // iter22 Minor #4 / iter24 M1 Pocket 2 (180-270, 360-430): Cleanly seated strapped cargo crates, rolled striped sailcloth on planks, upright oak barrel & brass lantern (ZERO diagonal net!)
      function vignetteMidLeftSailCargoNet(x,z,rot){
        var g0=root.children.length, y=-.12, vid='midLeftSailCargo#'+(++deckVigSeq), s0;
        contact(x,z,1.66,1.44,-.107);
        // Sub-prop 1: Stacked brass-strapped cargo crates + neatly folded coral-and-cream sailcloth on top (rear-left)
        s0=root.children.length;
        crate(x-.48,y,z-.36,.94);
        [-.74,-.22].forEach(function(bx2){ block(.060,.55,.61,'#e8c05c',x+bx2,y+.28,z-.36,0,false); });
        block(.61,.060,.61,'#e5bc5b',x-.48,y+.28,z-.36,0,false);
        crate(x-.48,y+.55,z-.36,.66);
        [-.67,-.29].forEach(function(bx4){ block(.046,.39,.43,'#e8c05c',x+bx4,y+.74,z-.36,0,false); });
        wornBox(.48,.055,.44,'#f5e8c8',x-.48,y+.96,z-.36,'fabric');
        block(.44,.045,.38,'#d85a4c',x-.48,y+.995,z-.36,0,'fabric');
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 2: Companion brass-strapped crate topped with glowing brass deck lantern (rear-right, >= 0.30u clear)
        s0=root.children.length;
        crate(x+.46,y,z-.38,.80);
        [x+.24,x+.68].forEach(function(bx3){ block(.050,.47,.52,'#e5bc5b',bx3,y+.24,z-.38,0,false); });
        seatedBrassLantern(x+.46,y+.47,z-.38);
        tagSubProp(s0,vid,'lanternCrate');
        // Sub-prop 3: Rolled coral-and-teal striped coastal sailcloth lashed with hemp rings resting cleanly on planks (>= 0.30u clear of crates!)
        s0=root.children.length;
        deckRolledSail(x-.38,y,z+.48,.82,.152,0);
        tagSubProp(s0,vid,'rolledSail');
        // Sub-prop 4: Upright oak barrel cleanly on planks beside rolled sail & lantern crate (>= 0.28u clear!)
        s0=root.children.length;
        barrel(x+.58,y,z+.46,.86);
        tagSubProp(s0,vid,'oakBarrel');
        wrapRot(g0,x,y,z,rot,1.16);
        addObstacle(x,z,1.32);
      }
      // iter22 Minor #4 / iter24 M1 Pocket 3 (280-350, 190-280): Mid-upper-left sea chest + stacked oak barrels + lobster trap (all >= 0.30u clear!)
      function vignetteUpperLeftChestBarrels(x,z,rot){
        var g0=root.children.length, y=-.12, vid='upperLeftChestBarrels#'+(++deckVigSeq), s0;
        contact(x,z,1.82,1.50,-.107);
        // Sub-prop 1: Substantial brass-bound oak sea chest on dark-oak skids + rolled chart (rear-left)
        s0=root.children.length;
        var cx3=x-.64, cz3=z-.30;
        [-.24,.24].forEach(function(sz2){ wornBox(1.04,.06,.12,'#5a3c27',cx3,y+.03,cz3+sz2,'timber'); });
        cargoChest(cx3,y+.05,cz3,0);
        add(cyl(.066,.066,.54,10),'#f6ebd0',cx3,y+.92,cz3,0,0,Math.PI/2,'fabric');
        add(cyl(.072,.072,.062,10),'#d4524a',cx3,y+.92,cz3,0,0,Math.PI/2,false);
        tagSubProp(s0,vid,'seaChest');
        // Sub-prop 2: Chunky stacked oak barrel trio cleanly right of sea chest (>= 0.32u clear!)
        s0=root.children.length;
        var bx3=x+.76, bz3=z+.02;
        barrel(bx3-.26,y,bz3-.24,.90);
        barrel(bx3+.26,y,bz3+.18,.88);
        barrel(bx3,    y+.61,bz3-.03,.82);
        tagSubProp(s0,vid,'barrelStack');
        // Sub-prop 3: Wooden slatted lobster trap cage + coral buoy cleanly in front-left (>= 0.32u clear!)
        s0=root.children.length;
        deckLobsterTrap(x-.64,y,z+.66,0);
        tagSubProp(s0,vid,'lobsterTrap');
        wrapRot(g0,x,y,z,rot,1.16);
        addObstacle(x,z,1.42);
      }
      // iter23 Minor #7 / iter24 M1 Upper-Left Pocket A1: Stowed wooden skiff/dinghy + horizontal oak water cask + crate & brass lantern (all >= 0.32u clear!)
      function vignetteBowSkiffAndPallet(x,z,rot){
        var g0=root.children.length, y=-.12, vid='bowSkiffPallet#'+(++deckVigSeq), s0;
        contact(x,z,1.94,2.10,-.107);
        // Sub-prop 1: Stowed wooden ship's skiff on twin oak keel chocks with oars
        s0=root.children.length;
        var sx=x-.40, sz=z-.04;
        [-.54,.54].forEach(function(cz2){
          wornBox(1.04,.14,.18,'#5a3c27',sx,y+.07,sz+cz2,'timber');
          [-.42,.42].forEach(function(cx2){ block(.14,.22,.16,'#6d4a31',sx+cx2,y+.15,sz+cz2,0,'timber'); });
        });
        if(!geos.deckSkiffHull){
          var sh=new T.Shape();
          sh.moveTo(-.36,-1.06); sh.lineTo(.36,-1.06); sh.lineTo(.54,-.22); sh.lineTo(.46,.56);
          sh.lineTo(.22,.98); sh.lineTo(0,1.16); sh.lineTo(-.22,.98); sh.lineTo(-.46,.56); sh.lineTo(-.54,-.22);
          sh.closePath();
          var hg=own(new T.ExtrudeGeometry(sh,{depth:.40,steps:1,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:1,curveSegments:1}));
          hg.rotateX(-Math.PI/2); geos.deckSkiffHull=hg;
          var rg=own(new T.ExtrudeGeometry(sh,{depth:.07,steps:1,bevelEnabled:true,bevelThickness:.02,bevelSize:.05,bevelSegments:1,curveSegments:1}));
          rg.rotateX(-Math.PI/2); geos.deckSkiffRub=rg;
          var ig=own(new T.ExtrudeGeometry(sh,{depth:.16,steps:1,bevelEnabled:false}));
          ig.rotateX(-Math.PI/2); ig.scale(.82,1,.84); geos.deckSkiffIn=ig;
        }
        add(geos.deckSkiffHull,'#b57e4c',sx,y+.16,sz,0,0,0,'timber');
        add(geos.deckSkiffRub,'#d4544c',sx,y+.50,sz,0,0,0,'timber');
        add(geos.deckSkiffIn,'#5a3d28',sx,y+.45,sz,0,0,0,'timber');
        [[-.62,.76],[.0,.96],[.54,.72]].forEach(function(th){
          block(th[1],.055,.22,'#dfb780',sx,y+.59,sz+th[0],0,'timber');
        });
        [-.18,.18].forEach(function(ox,oi){
          add(cyl(.022,.022,1.62,6),'#d6b078',sx+ox,y+.64,sz-.04,Math.PI/2,oi?.07:-.07,0,'timber');
          block(.15,.026,.44,'#428c9c',sx+ox*(oi?1.2:1.1),y+.64,sz-.76,oi?.07:-.07,'timber');
        });
        tagSubProp(s0,vid,'skiff');
        // Sub-prop 2: Cradled horizontal oak water cask cleanly starboard of skiff (>= 0.35u clear!)
        s0=root.children.length;
        var wx=x+.96, wz=z+.42;
        [-.24,.24].forEach(function(cz3){ wornBox(.60,.14,.14,'#5a3c27',wx,y+.07,wz+cz3,'timber'); });
        add(cyl(.25,.25,.66,10),'#8f6240',wx,y+.35,wz,Math.PI/2,0,0,'timber');
        [-.19,.19].forEach(function(ho){ add(cyl(.262,.262,.052,10),'#434f5a',wx,y+.35,wz+ho,Math.PI/2,0,0,false); });
        add(cyl(.044,.044,.04,8),'#e5bc5b',wx,y+.61,wz,0,0,0,false);
        tagSubProp(s0,vid,'waterCask');
        // Sub-prop 3: Compact supply crate + glowing brass deck lantern cleanly separated from cask & skiff (>= 0.35u clear!)
        s0=root.children.length;
        crate(x+.94,y,z-.64,.70);
        seatedBrassLantern(x+.94,y+.41,z-.64);
        tagSubProp(s0,vid,'lanternCrate');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.55);
      }
      // iter23 Minor #7 / iter24 M1 Upper-Left Pocket A2: Canvas-draped cargo pallet + upright oak water cask & brass lantern (>= 0.32u clear!)
      function vignetteCanvasCargoPallet(x,z,rot){
        var g0=root.children.length, y=-.12, vid='canvasCargoPallet#'+(++deckVigSeq), s0;
        contact(x,z,1.56,1.18,-.107);
        s0=root.children.length;
        var px=x-.38, pz=z-.04;
        [-.36,0,.36].forEach(function(sz){ block(1.12,.07,.12,'#5c3e29',px,y+.035,pz+sz,0,'timber'); });
        for(var pl=-2;pl<=2;pl++) block(.18,.045,.88,'#9e7348',px+pl*.22,y+.09,pz,0,'timber');
        crate(px-.24,y+.11,pz-.06,.78);
        crate(px+.26,y+.11,pz+.06,.68);
        wornBox(.94,.085,.76,'#f5e8c8',px-.02,y+.59,pz,'fabric');
        block(.90,.062,.68,'#d85a4c',px-.02,y+.645,pz,0,'fabric');
        block(.88,.066,.22,'#3f8c9c',px-.02,y+.65,pz,0,'fabric');
        add(cyl(.078,.078,.78,10),'#f0e2c0',px+.43,y+.61,pz,Math.PI/2,0,0,'fabric');
        [-.25,.25].forEach(function(rx){ block(.040,.54,.78,'#d4bc88',px+rx,y+.37,pz,0,'rope'); });
        tagSubProp(s0,vid,'cargoPallet');
        s0=root.children.length;
        barrel(x+.82,y,z+.04,.88);
        seatedBrassLantern(x+.82,y+.60,z+.04);
        tagSubProp(s0,vid,'barrelLantern');
        wrapRot(g0,x,y,z,rot,1.12);
        addObstacle(x,z,1.22);
      }
      // iter23 Minor #7 / iter24 M1 Lower-Left Pocket B (0-60, 440-560): Mooring cleat + ship's lantern chest + rolled striped sailcloth (all >= 0.24u clear!)
      function vignetteLowerLeftCleatChest(x,z,rot){
        var g0=root.children.length, y=-.12, vid='lowerLeftCleatChest#'+(++deckVigSeq), s0;
        contact(x,z,1.38,1.22,-.107);
        // Sub-prop 1: Brass-bound ship's lantern chest on oak skids topped with glowing brass lantern
        s0=root.children.length;
        var cx3=x+.26, cz3=z+.24;
        [-.19,.19].forEach(function(sz){ wornBox(.80,.055,.10,'#5a3c27',cx3,y+.028,cz3+sz,'timber'); });
        wornBox(.78,.40,.54,'#8d5b3c',cx3,y+.25,cz3,'timber');
        add(cyl(.25,.25,.76,10),'#7d4e33',cx3,y+.44,cz3,0,0,Math.PI/2,'timber');
        [-.25,.25].forEach(function(bx){ block(.060,.44,.57,'#e5bc5b',cx3+bx,y+.26,cz3,0,false); });
        block(.11,.13,.06,'#f2ce6b',cx3,y+.35,cz3+.28,0,false);
        seatedBrassLantern(cx3,y+.56,cz3);
        tagSubProp(s0,vid,'lanternChest');
        // Sub-prop 2: Heavy horned timber-and-brass deck mooring cleat cleanly left of chest (>= 0.24u clear!)
        s0=root.children.length;
        var clX=x-.64, clZ=z+.14;
        wornBox(.36,.10,.64,'#5a3c27',clX,y+.05,clZ,'timber');
        [-.13,.13].forEach(function(sd){ add(cyl(.048,.060,.15,8),'#d8ad52',clX,y+.155,clZ+sd,0,0,0,false); });
        wornBox(.12,.082,.62,'#e8c05c',clX,y+.23,clZ,false);
        [-1,1].forEach(function(sd){ add(cyl(.024,.044,.18,8),'#f2ce6e',clX,y+.245,clZ+sd*.38,sd*1.42,0,0,false); });
        add(smoothTorus(.12,.028,6,14),'#e2c890',clX,y+.165,clZ-.09,Math.PI/2,0,.22,'rope');
        add(smoothTorus(.12,.028,6,14),'#d2b67c',clX,y+.175,clZ+.09,Math.PI/2,0,-.22,'rope');
        tagSubProp(s0,vid,'mooringCleat');
        // Sub-prop 3: Rolled coral-and-teal striped coastal sailcloth cleanly separated in rear (>= 0.25u clear of chest & cleat!)
        s0=root.children.length;
        deckRolledSail(x+.24,y,z-.52,.74,.138,0);
        tagSubProp(s0,vid,'rolledSail');
        wrapRot(g0,x,y,z,rot,1.10);
        addObstacle(x,z,1.04);
      }
      // iter25 Minor #8: Three distinct, natural, asymmetrical MP8 nautical focal clusters for the left half of Captain's Deck (0-360, 150-640)
      // with snug non-clipping intra-cluster grouping (0.12..0.28u gaps, intraVignetteClips === 0) and wide open teak-plank walkways between clusters!
      // Left Cluster 1 (Foreground-Left): Navigator's Chart & Treasure Lookout (Sea Chest + Brass Spyglass Tripod + Chart Crate + Barrel Lantern + Lobster Trap)
      function vignetteClusterNavigatorLookout(x,z,rot){
        var g0=root.children.length, y=-.12, vid='clusterNavigator#'+(++deckVigSeq), s0;
        contact(x-.22,z+.12,1.76,1.24,-.107);
        // Sub-prop 1: Brass-bound mahogany sea chest + rolled red-ribboned chart (rear-right hero anchor)
        s0=root.children.length;
        cargoChest(x+.36,y,z-.28,0);
        add(cyl(.066,.066,.52,10),'#f6ebd0',x+.36,y+.88,z-.28,0,0,Math.PI/2,'fabric');
        add(cyl(.072,.072,.06,10),'#cc4d4a',x+.36,y+.88,z-.28,0,0,Math.PI/2,false);
        tagSubProp(s0,vid,'seaChest');
        // Sub-prop 2: Three-legged walnut tripod + gleaming stepped brass spyglass (front-right tall accent)
        s0=root.children.length;
        var tx=x+.56, tz=z+.54;
        for(var lg=0;lg<3;lg++){
          var la=lg*Math.PI*2/3+.35;
          var fxL=tx+Math.cos(la)*.24, fzL=tz+Math.sin(la)*.24;
          add(cyl(.036,.045,.08,8),'#d6a34b',fxL,y+.04,fzL,0,0,0,false);
          limb(fxL,y+.02,fzL,-Math.cos(la)*.23,.96,-Math.sin(la)*.23,.98,.032,.022,'#6e4c35','timber');
        }
        add(cyl(.075,.085,.11,8),'#d9aa48',tx,y+.96,tz,0,0,0,false);
        var scopeDir=[.64,.36,.66];
        var s1=limb(tx-.12,y+.94,tz-.12,scopeDir[0],scopeDir[1],scopeDir[2],.36,.040,.054,'#d9aa48',false);
        var s2=limb(s1[0],s1[1],s1[2],scopeDir[0],scopeDir[1],scopeDir[2],.34,.060,.076,'#f2ce6e',false);
        smoothOrb(.064,'#9ce4f5',s2[0],s2[1],s2[2],false);
        tagSubProp(s0,vid,'spyglassTripod');
        // Sub-prop 3: Beveled honey-oak navigator's chart crate with sea map & inlaid brass compass (rear-left)
        s0=root.children.length;
        var cxN=x-.78, czN=z-.28;
        wornBox(.90,.54,.68,'#a66d45',cxN,y+.27,czN,'timber');
        [-.39,.39].forEach(function(bx){ block(.064,.56,.72,'#e3ba58',cxN+bx,y+.28,czN,0,false); });
        block(.72,.03,.48,'#f4e7c8',cxN,y+.56,czN,.05,'fabric');
        block(.31,.034,.21,'#69b8c4',cxN-.10,y+.57,czN-.06,.08,false);
        block(.18,.036,.15,'#d4a96a',cxN+.15,y+.57,czN+.07,-.06,false);
        add(cyl(.13,.14,.055,14),'#d9aa48',cxN-.22,y+.58,czN+.15,0,0,0,false);
        add(cyl(.10,.10,.065,14),'#faf1d8',cxN-.22,y+.585,czN+.15,0,0,0,false);
        block(.14,.02,.03,'#d4524a',cxN-.22,y+.62,czN+.15,.35,false);
        tagSubProp(s0,vid,'chartCrate');
        // Sub-prop 4: Stout banded oak barrel topped with warm glowing brass deck lantern (front-center-left)
        s0=root.children.length;
        var bxN=x-.32, bzN=z+.52;
        barrel(bxN,y,bzN,.84);
        seatedBrassLantern(bxN,y+.57,bzN);
        tagSubProp(s0,vid,'barrelLantern');
        // Sub-prop 5: Low slatted weathered-oak lobster trap & coral buoy stepping silhouette down toward Compass Rose plaza
        s0=root.children.length;
        deckLobsterTrap(x-1.24,y,z+.52,0);
        tagSubProp(s0,vid,'lobsterTrap');
        wrapRot(g0,x,y,z,rot,1.15);
        addObstacle(x,z,1.52);
      }
      // Left Cluster 2 (Mid-Far-Left): Port Sailmaker's & Mooring Wharf Nook (Brass Lantern Post + Strapped Crates + Lashed Twin Barrels + Mooring Bitts + Rolled Striped Sail + Hemp Coil)
      function vignetteClusterPortSailmakers(x,z,rot){
        var g0=root.children.length, y=-.12, vid='clusterPortSail#'+(++deckVigSeq), s0;
        contact(x+.20,z-.08,1.76,1.18,-.107);
        // Sub-prop 1: Stacked brass-strapped cargo crates topped with folded coral-and-cream sailcloth (rear-center-right)
        s0=root.children.length;
        crate(x+.44,y,z-.44,.94);
        [x+.18,x+.70].forEach(function(bx2){ block(.058,.55,.61,'#e8c05c',bx2,y+.28,z-.44,0,false); });
        crate(x+.44,y+.55,z-.44,.66);
        wornBox(.48,.058,.44,'#f5e8c8',x+.44,y+.96,z-.44,'fabric');
        block(.44,.046,.38,'#d85a4c',x+.44,y+.995,z-.44,0,'fabric');
        tagSubProp(s0,vid,'crateStack');
        // Sub-prop 2: Tall glowing brass deck lantern stanchion anchoring rear-right vertical profile (arm pointing +X clear of crates)
        s0=root.children.length;
        var lx=x+1.14, lz=z-.42;
        add(cyl(.17,.22,.18,8),'#5e402b',lx,y+.09,lz,0,0,0,'timber');
        post(.058,1.22,'#4e3e34',lx,y+.16,lz);
        block(.34,.054,.054,'#d6a34b',lx+.14,y+1.32,lz,0,false);
        add(cyl(.138,.118,.25,10),'#f4cf74',lx+.28,y+1.14,lz,0,0,0,false);
        smoothOrb(.080,'#fff2bc',lx+.28,y+1.14,lz,false);
        add(torus(.148,.021),'#b5873d',lx+.28,y+1.26,lz,Math.PI/2,0,0,false);
        add(torus(.148,.021),'#b5873d',lx+.28,y+1.02,lz,Math.PI/2,0,0,false);
        add(cone(.185,.14,10),'#c4943e',lx+.28,y+1.34,lz,0,0,0,false);
        smoothOrb(.042,'#e8c263',lx+.28,y+1.43,lz,false);
        tagSubProp(s0,vid,'lanternPost');
        // Sub-prop 3: Chunky lashed twin oak supply barrels on dark-oak sea-chock cradle (rear-left)
        s0=root.children.length;
        var bx=x-.64, bz=z-.46;
        wornBox(1.02,.10,.86,'#5a3c27',bx,y+.05,bz,'timber');
        [-.40,.40].forEach(function(cx3){ block(.12,.14,.74,'#6d4a31',bx+cx3,y+.10,bz,0,'timber'); });
        barrel(bx-.26,y+.06,bz-.10,.94);
        barrel(bx+.28,y+.06,bz+.10,.90);
        add(smoothTorus(.50,.030,8,18),'#e4cb96',bx+.01,y+.35,bz,Math.PI/2,0,0,'rope');
        add(smoothTorus(.48,.026,8,18),'#d6bb84',bx+.01,y+.50,bz,Math.PI/2,0,0,'rope');
        tagSubProp(s0,vid,'lashedBarrels');
        // Sub-prop 4: Stout twin-post oak mooring bitt & belaying pin crossbeam (front-left)
        s0=root.children.length;
        var mbx=x-.58, mbz=z+.50;
        wornBox(.82,.12,.36,'#5a3c27',mbx,y+.06,mbz,'timber');
        [-.24,.24].forEach(function(sd){
          post(.088,.74,'#6e4c34',mbx+sd,y+.10,mbz);
          add(cyl(.104,.104,.052,10),'#e3ba58',mbx+sd,y+.86,mbz,0,0,0,false);
          add(smoothTorus(.175,.038,8,16),'#cbb382',mbx+sd,y+.16,mbz,Math.PI/2,0,0,'rope');
        });
        wornBox(.78,.12,.17,'#8c6244',mbx,y+.64,mbz,'timber');
        [-.16,0,.16].forEach(function(px2){
          add(cyl(.025,.021,.26,8),'#dfc088',mbx+px2,y+.76,mbz,0,0,0,'timber');
          smoothOrb(.040,'#ebd19c',mbx+px2,y+.91,mbz,false);
        });
        tagSubProp(s0,vid,'mooringBitts');
        // Sub-prop 5: Rolled coral-and-teal striped coastal sailcloth lashed with hemp rings (front-center-right)
        s0=root.children.length;
        deckRolledSail(x+.48,y,z+.30,.80,.150,0);
        tagSubProp(s0,vid,'rolledSail');
        // Sub-prop 6: Chunky 3-tier coiled hemp hawser stepping down cleanly toward the open diagonal walkway
        s0=root.children.length;
        deckRopeCoil(x+1.36,y+.04,z+.32,.66);
        tagSubProp(s0,vid,'ropeCoil');
        wrapRot(g0,x,y,z,rot,1.15);
        addObstacle(x,z,1.54);
      }
      // Left Cluster 3 (Upper-Mid-Left): Quartermaster's Capstan, Ship's Bell & Provision Hoist (Bell Belfry + 4-Barrel Pyramid + Capstan + Map Chest + Burlap Sacks + Iron Chain)
      function vignetteClusterQuartermasterHoist(x,z,rot){
        var g0=root.children.length, y=-.12, vid='clusterQuartermaster#'+(++deckVigSeq), s0;
        contact(x-.24,z+.04,2.04,1.38,-.107);
        // Sub-prop 1: Tall carved mahogany & brass ship's bell belfry stand anchoring starboard-front silhouette
        s0=root.children.length;
        var bx=x+.94, bz=z+.40;
        wornBox(.50,.16,.98,'#5b3c27',bx,y+.08,bz,'timber');
        [-.34,.34].forEach(function(sd){
          post(.064,1.28,'#754f36',bx,y+.14,bz+sd);
          add(cyl(.080,.080,.068,8),'#e5bc5b',bx,y+.82,bz+sd,0,0,0,false);
          block(.20,.08,.15,'#6a462f',bx,y+.24,bz+sd*.84,0,'timber');
        });
        wornBox(.26,.14,1.08,'#8c6244',bx,y+1.42,bz,'timber');
        block(.32,.08,1.14,'#dec49a',bx,y+1.52,bz,0,'timber');
        [-.44,.44].forEach(function(sd){ smoothOrb(.068,'#ebb952',bx,y+1.62,bz+sd,false); });
        add(cyl(.025,.025,.19,6),'#d6a34b',bx,y+1.28,bz,0,0,0,false);
        add(cyl(.125,.26,.34,16),'#ebb952',bx,y+1.03,bz,0,0,0,false);
        add(smoothTorus(.25,.034,8,18),'#f6d374',bx,y+.88,bz,Math.PI/2,0,0,false);
        orb(.070,'#9e7328',bx,y+.84,bz,false);
        add(cyl(.023,.023,.36,6),'#e2c890',bx,y+.64,bz,0,0,0,'rope');
        smoothOrb(.052,'#d9be88',bx,y+.45,bz,false);
        tagSubProp(s0,vid,'bellBelfry');
        // Sub-prop 2: Chunky 4-barrel oak pyramid anchoring center-rear mass
        s0=root.children.length;
        var bpx=x-.14, bpz=z-.54;
        barrel(bpx-.32,y,bpz-.22,.88);
        barrel(bpx+.32,y,bpz-.22,.86);
        barrel(bpx,    y,bpz+.34,.84);
        barrel(bpx,    y+.60,bpz-.02,.80);
        tagSubProp(s0,vid,'barrelStack');
        // Sub-prop 3: Brass-bound oak provision & map chest with open chart (center-front)
        s0=root.children.length;
        var mx=x-.12, mz=z+.66;
        wornBox(.94,.50,.68,'#8f5c3c',mx,y+.25,mz,'timber');
        [-.32,.32].forEach(function(bs){ block(.065,.52,.72,'#e5bc5b',mx+bs,y+.26,mz,0,false); });
        block(.13,.15,.08,'#f2ce6b',mx,y+.40,mz+.35,0,false);
        block(.74,.030,.50,'#f6ebd0',mx,y+.52,mz,.05,'fabric');
        block(.31,.034,.22,'#69b8c4',mx-.11,y+.53,mz-.06,.09,false);
        block(.20,.036,.16,'#d4a96a',mx+.13,y+.53,mz+.07,-.08,false);
        add(cyl(.054,.054,.44,10),'#efe1be',mx-.06,y+.56,mz+.14,0,.15,Math.PI/2,'fabric');
        add(cyl(.060,.060,.048,10),'#cc4d4a',mx-.06,y+.56,mz+.14,0,.15,Math.PI/2,false);
        tagSubProp(s0,vid,'mapChest');
        // Sub-prop 4: Turned oak & brass ship's capstan with 4 wooden bars (port-front focal anchor)
        s0=root.children.length;
        var cx2=x-1.46, cz2=z+.42;
        add(cyl(.40,.48,.14,12),'#5e402b',cx2,y+.07,cz2,0,0,0,'timber');
        add(cyl(.26,.32,.56,10),'#8c6244',cx2,y+.41,cz2,0,0,0,'timber');
        add(cyl(.34,.30,.14,10),'#754c38',cx2,y+.74,cz2,0,0,0,'timber');
        add(cyl(.20,.20,.08,10),'#d6a34b',cx2,y+.84,cz2,0,0,0,false);
        for(var b=0;b<4;b++) block(.065,.065,1.12,'#c79e6b',cx2,y+.74,cz2,b*Math.PI/2,'timber');
        tagSubProp(s0,vid,'capstan');
        // Sub-prop 5: Plump tied burlap cargo sacks stepping down toward the upper-left open planks (port-rear)
        s0=root.children.length;
        deckBurlapSacks(x-1.38,y,z-.64,0);
        tagSubProp(s0,vid,'burlapSacks');
        // Sub-prop 6: Compact forged-iron anchor chain coil balancing the belfry (starboard-rear)
        s0=root.children.length;
        deckIronChainCoil(x+1.04,y,z-.76,0);
        tagSubProp(s0,vid,'ironChain');
        wrapRot(g0,x,y,z,rot,1.14);
        addObstacle(x,z,1.62);
      }
      var canSpace=sp.find(function(s){ return s.kind==='deck' && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id==='can'; });
      // MIN-5: Replace any primary red/blue striped GLB deck barrel prop with warm weathered oak staves & dark iron hoops
      if(view.scene && view.hitables){
        var capPropSet=['treasure','wheel','barrel','anchor'];
        function hashCapId(str){ var h=0; for(var i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))|0; return Math.abs(h); }
        sp.forEach(function(s){
          if(!s.obj || !s.obj.position || s.kind!=='deck' || !s.item || !s.item.d) return;
          if(capPropSet[hashCapId(s.item.d.id)%capPropSet.length]!=='barrel') return;
          var oldB=s.obj, ox=oldB.position.x, oy=oldB.position.y, oz=oldB.position.z;
          view.scene.remove(oldB);
          var hbIdx=view.hitables.indexOf(oldB); if(hbIdx>=0) view.hitables.splice(hbIdx,1);
          var oakGrp=new T.Group();
          oakGrp.position.set(ox,oy,oz);
          oakGrp.rotation.y=(s.i*0.85)%6.28;
          oakGrp.add(finish(mesh(cyl(.36,.42,.92,12),M('#7e583a'),0,.46,0),'timber'));
          oakGrp.add(finish(mesh(cyl(.34,.34,.06,12),M('#63432b'),0,.92,0),'timber'));
          for(var stI=0;stI<8;stI++){
            var saB=stI*Math.PI/4;
            var stv=mesh(box(.045,.86,.03),M('#5b3d26'),Math.cos(saB)*.39,.46,Math.sin(saB)*.39);
            stv.rotation.y=-saB; oakGrp.add(finish(stv,'timber'));
          }
          [.20,.48,.74].forEach(function(hy){
            oakGrp.add(mesh(cyl(.415,.415,.075,12),M('#353b42'),0,hy,0));
          });
          if(typeof reef3dCompact==='function') reef3dCompact(oakGrp);
          oakGrp.traverse(function(c){ c.userData.space=s.i; });
          oakGrp.userData.space=s.i;
          view.scene.add(oakGrp); view.hitables.push(oakGrp); s.obj=oakGrp;
        });
      }
      var capFirstDeck=main.find(function(s){ return s.kind==='deck' && !s.practice; });
      // True mid-aft centerline main mast X symmetrically balancing foreMast across the 55u hull (zero extreme-edge perspective lean!)
      var mainMastX=cx-9.0, compassX=cx-1.0, compassZ=cz+.55;
      // Strictly protect Captain Bay's standing area & his +Z / low-MP8 encounter & follow-camera sightline corridors on canSpace
      var bayAnchor=canSpace ? main[(canSpace.i+1)%main.length] : null;
      function clearOfBayCorridor(x,z){
        if(!bayAnchor) return true;
        // Starboard +Z corridor & Captain Bay starboard anchor
        if(Math.abs(x-bayAnchor.x)<2.85 && z>bayAnchor.z+0.8 && z<bayAnchor.z+9.8) return false;
        if(Math.hypot(x-bayAnchor.x,z-(bayAnchor.z+4.20))<3.60) return false;
        // Actual Captain Bay standing spot near (bayAnchor.x, bayAnchor.z - 3.35) & full sightline corridor
        if(Math.hypot(x-bayAnchor.x,z-(bayAnchor.z-3.35))<3.65) return false;
        if(Math.abs(x-bayAnchor.x)<2.85 && z>bayAnchor.z-5.6 && z<bayAnchor.z+3.2) return false;
        return true;
      }
      // Guard (320-430, 505-595) screen zone on 06-deck so foreground organic clusters stay strictly outside it
      function inDeckProtectedScreenZone(camIdx,x,z,pad){
        var r=pad||1.35, offsets=[[0,0],[r,0],[-r,0],[0,r],[0,-r]];
        for(var oi=0;oi<offsets.length;oi++){
          var nd=camNDCAt(camIdx,x+offsets[oi][0],.25,z+offsets[oi][1]);
          if(nd.z<=1 && nd.x>=-.44 && nd.x<=-.10 && nd.y>=-.90 && nd.y<=-.48) return true;
        }
        return false;
      }
      // Guard board.js deck objects (e.g. ship's wheel on canSpace), centerline mainMast & inlaid compass rose
      function clearOfDeckLandmarks(x,z){
        for(var di=0;di<sp.length;di++){
          var obj=sp[di].obj;
          if(obj && obj.position && Math.hypot(x-obj.position.x,z-obj.position.z)<2.65) return false;
        }
        if(canSpace && Math.hypot(x-canSpace.x,z-(canSpace.z-2.3))<2.65) return false;
        if(Math.hypot(x-mainMastX,z-cz)<2.85) return false;
        if(Math.hypot(x-compassX,z-compassZ)<2.85) return false;
        return true;
      }
      // Guard cropped left/bottom-left camera edge on Captain's Great Cabin hero views (MIN-11: zero cropped dark props!)
      function inCaptainHeroEdgeCrop(x, z){
        var heroCams = [3, 0];
        for(var hi = 0; hi < heroCams.length; hi++){
          if(heroCams[hi] >= main.length) continue;
          var nd = realCamNDCAt(heroCams[hi], x, 0.25, z);
          if(nd.z <= 1){
            // Bottom-left cropped corner around (0..180, 470..640) & left-edge crop zone (0..65, 340..640)
            if(nd.x >= -1.18 && nd.x <= -0.64 && nd.y >= -1.18 && nd.y <= -0.44) return true;
            if(nd.x >= -1.18 && nd.x <= -0.88 && nd.y >= -1.18 && nd.y <= 0.10) return true;
          }
        }
        return false;
      }
      function placeVignette(x,z,kind,rot,minSep,skipFixed){
        if(!outerClear(x,z,2.65) || !insideShipDeck(x,z,1.25)) return false;
        if(!clearOfBayCorridor(x,z) || inCaptainHeroEdgeCrop(x,z)) return false;
        if(!skipFixed && !clearOfDeckLandmarks(x,z)) return false;
        if(vigPlaced.some(function(p){ return Math.hypot(p[0]-x,p[1]-z)<(minSep||4.4); })) return false;
        vigPlaced.push([x,z]);
        if(kind==='cargo') vignetteCargo(x,z,rot);
        else if(kind==='rope') vignetteRopeStation(x,z,rot);
        else if(kind==='spyglass') vignetteSpyglass(x,z,rot);
        else if(kind==='lantern') vignetteDeckLantern(x,z,rot);
        else if(kind==='chartCrate') vignetteChartCrate(x,z,rot);
        else if(kind==='barrels') vignetteBarrelPyramid(x,z,rot);
        else if(kind==='anchorChain') vignetteAnchorAndChain(x,z,rot);
        else if(kind==='bellStand') vignetteShipBellStand(x,z,rot);
        else if(kind==='bellChart') vignetteShipBellAndChart(x,z,rot);
        else if(kind==='chainWinch') vignetteAnchorChainWinch(x,z,rot);
        else if(kind==='cannon') vignetteCannon(x,z,rot);
        else if(kind==='chest'){ cabinTreasureChest(x,-.12,z,rot||0); addObstacle(x,z,1.15); }
        else if(kind==='hatchBuoy') vignetteHatchAndBuoy(x,z,rot);
        else if(kind==='navigator') vignetteNavigatorStation(x,z,rot);
        else if(kind==='capstanRig') vignetteCapstanRigging(x,z,rot);
        else if(kind==='cratesLanternBuoy') vignetteCratesLanternBuoy(x,z,rot);
        else if(kind==='deckNetCrates') vignetteDeckNetAndCrates(x,z,rot);
        else if(kind==='secHatchMast') vignetteSecondaryHatchMast(x,z,rot);
        else if(kind==='nettedCargo') vignetteNettedCargo(x,z,rot);
        else if(kind==='starboardCargoCleat') vignetteStarboardCargoCleat(x,z,rot);
        else if(kind==='upperHatchBarrels') vignetteUpperHatchBarrels(x,z,rot);
        else if(kind==='clusterNavigator') vignetteClusterNavigatorLookout(x,z,rot);
        else if(kind==='clusterPortSail') vignetteClusterPortSailmakers(x,z,rot);
        else if(kind==='clusterQuartermaster') vignetteClusterQuartermasterHoist(x,z,rot);
        else if(kind==='capstan') capstan(x,-.12,z);
        else deckHatch(x,z);
        return true;
      }
      // iter24 M1 + iter25 Minor #8: Tidy starboard stations + 3 distinct, natural, asymmetrical MP8 focal clusters on left half (0-360, 150-640) with wide open plank walkways!
      function placeDeckVignettesForCam(camIdx, isStarboard){
        var cannonOutRot=isStarboard ? 0 : Math.PI;
        var targets=isStarboard ? [
          // Lower-center-right: Cargo Grate Hatch + Outside Brass Lantern + Crates + Far-Right Lifebuoy + Bucket
          {kind:'hatchBuoy',     tx:.44,  ty:-.65, rot:0,            sep:4.6},
          // Far starboard bulwark (lower-right): Gilded Treasure Chest & Curio Display
          {kind:'chest',         tx:.80,  ty:-.42, rot:cannonOutRot, sep:4.6},
          // Upper-right mid-deck: Admiralty Anchor + Twin Bollards + 3-Barrel Mooring Station
          {kind:'anchorChain',   tx:.36,  ty:.44,  rot:0,            sep:4.8},
          // Far starboard bulwark (upper-right): Navigator's Bell & Sea Chart Table
          {kind:'bellChart',     tx:.68,  ty:.48,  rot:cannonOutRot, sep:4.8},
          // Left Cluster 1 (Foreground-Left): Asymmetrical Navigator's Chart & Treasure Lookout (strictly outside 320-430, 505-595 & clear of Compass Rose!)
          {kind:'clusterNavigator',     tx:-.62, ty:-.44, rot:.04,   sep:5.2, minTile:3.15},
          // Left Cluster 2 (Mid-Far-Left): Asymmetrical Port Sailmaker's & Mooring Wharf Nook (cleanly below "3 legs today" & above Compass Rose!)
          {kind:'clusterPortSail',      tx:-.79, ty:.02,  rot:.03,   sep:5.2, minTile:3.10},
          // Left Cluster 3 (Upper-Mid-Left): Asymmetrical Quartermaster's Capstan, Ship's Bell & Provision Hoist (diagonal golden-triangle stagger & guards Bay's starboard anchor!)
          {kind:'clusterQuartermaster', tx:-.30, ty:.06,  rot:-.03,  sep:5.2, minTile:3.05},
          // Upper-Right Secondary Cargo Hatch + Upright Mast Base + Rigging + Crates + Brass Lantern
          {kind:'secHatchMast',  tx:.18,  ty:.71,  rot:-.04,         sep:4.6},
          // Far-Upper-Right Strapped Cargo Crates + Barrel + Burlap Sacks + Brass Lantern
          {kind:'nettedCargo',   tx:.52,  ty:.64,  rot:-.04,         sep:4.4},
          // Mid-Right Starboard Cargo Crates + Horned Brass Cleat + Rope Coil + Brass Lantern
          {kind:'starboardCargoCleat', tx:.74,  ty:-.06, rot:.04,          sep:3.80},
          // Upper-Center Timber Grate + Striped-Tarp Crates + Lashed Barrels + Brass Lantern + Bollard & Rope Coil
          {kind:'upperHatchBarrels',   tx:.20,  ty:.49,  rot:0,            sep:3.80, minTile:3.25}
        ] : [
          // Symmetrical cohesive layout for the port-side view (capFirstDeck; omits foreground-left capstanRig to keep bottom-left edge clean!)
          {kind:'chest',       tx:.68,  ty:-.52, rot:cannonOutRot, sep:4.8},
          {kind:'bellChart',   tx:.40,  ty:.48,  rot:0,            sep:5.0},
          {kind:'chest',       tx:.56,  ty:.46,  rot:cannonOutRot, sep:4.8}
        ];
        var deckCands=[];
        for(var gx=sb.minX+3.2;gx<=sb.maxX-1.5;gx+=.65) for(var gz=sb.minZ+1.25;gz<=sb.maxZ-1.25;gz+=.65){
          if(!outerClear(gx,gz,2.65) || !insideShipDeck(gx,gz,1.25) || !clearOfBayCorridor(gx,gz) || !clearOfDeckLandmarks(gx,gz) || inCaptainHeroEdgeCrop(gx,gz)) continue;
          if(isStarboard && inDeckProtectedScreenZone(camIdx,gx,gz,1.45)) continue;
          var nd=camNDCAt(camIdx,gx,.15,gz);
          if(nd.x<-.84 || nd.x>.88 || nd.y<-.84 || nd.y>.78 || nd.z>1) continue;
          deckCands.push({x:gx,z:gz,nd:nd});
        }
        targets.forEach(function(tg){
          var best=null;
          deckCands.forEach(function(c){
            if(tg.minTile && !outerClear(c.x,c.z,tg.minTile)) return;
            if(tg.minNdX!=null && c.nd.x<tg.minNdX) return;
            if(vigPlaced.some(function(p){ return Math.hypot(p[0]-c.x,p[1]-c.z)<(tg.sep||4.6); })) return;
            var sc=Math.hypot(c.nd.x-tg.tx,c.nd.y-tg.ty);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(best && best.sc<.48) placeVignette(best.c.x,best.c.z,tg.kind,tg.rot,tg.sep||4.6);
        });
      }
      // iter34 Beyond-MP8: True Enclosed Captain Bay's Private Great Cabin — full vaulted coffered oak ceiling
      // (tagged userData.hideOnZoom = true for clean Map zoom lift-off!), curved ceiling beams, dark walnut coffers,
      // luminous stained-glass compass skylights, warm brass chandelier & gimbal lantern drops, panoramic mullioned
      // ocean gallery windows, rich oak wainscoting with large framed sea charts, crimson-and-gold woven carpets,
      // and hero-scale foreground/midground Captain Bay treasure & curiosity pieces right in the main cabin view!
      var cabinExtras = new T.Group(); cabinExtras.name = 'captain-great-cabin-extras';
      var cabinCeilingGrp = new T.Group(); cabinCeilingGrp.name = 'captain-great-cabin-ceiling';
      cabinCeilingGrp.userData.hideOnZoom = true;
      var cabinGlassMat = new T.MeshBasicMaterial({
        color: view.night ? '#74bfd6' : '#c8f5fc', transparent: true,
        opacity: view.night ? 0.16 : 0.18, depthWrite: false, side: T.DoubleSide
      });
      // MIN-6: Crystal-clear glossy translucent vitrine glass (opacity: 0.22, crisp specular highlights)
      var cabinVitrineGlassGrp = new T.Group();
      var cabinVitrineMat = new T.MeshPhongMaterial({
        color: '#ffffff', vertexColors: true,
        shininess: 230, specular: '#ffffff',
        emissive: view.night ? '#245c6c' : '#408898', emissiveIntensity: 0.20,
        transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide
      });
      function addCabinVitrineGlass(geo, colHex, x, y, z, rx, ry, rz){
        var gm = new T.Mesh(geo, M(colHex || (view.night ? '#9ceaf8' : '#e4fcff')));
        gm.position.set(x, y, z);
        if(rx) gm.rotation.x = rx;
        if(ry) gm.rotation.y = ry;
        if(rz) gm.rotation.z = rz;
        cabinVitrineGlassGrp.add(gm);
        return gm;
      }
      // MAJ-6: Subtle tight bulb gleam ONLY (opacity <= 0.14, ZERO oversized flat orange/yellow circle blobs!)
      var cabinGlowMat = new T.MeshBasicMaterial({
        color: '#fff2be', transparent: true, opacity: view.night ? 0.13 : 0.09,
        depthWrite: false, blending: T.AdditiveBlending
      });
      // MAJ-6: Glossy metallic gold, faceted gemstone & luminous pearl buckets for sculpted 3D treasure chests
      var cabinGoldGroup = new T.Group(), cabinGemGroup = new T.Group(), cabinPearlGroup = new T.Group();
      var cabinGoldMat = new T.MeshPhongMaterial({
        color: '#ffffff', vertexColors: true, shininess: 125, specular: '#fff7c8',
        emissive: '#6e4a0c', emissiveIntensity: view.night ? 0.34 : 0.24
      });
      var cabinGemMat = new T.MeshPhongMaterial({
        color: '#ffffff', vertexColors: true, shininess: 175, specular: '#ffffff',
        emissive: '#221428', emissiveIntensity: view.night ? 0.30 : 0.22
      });
      var cabinPearlMat = new T.MeshPhongMaterial({
        color: '#ffffff', vertexColors: true, shininess: 145, specular: '#ffffff',
        emissive: '#584e3c', emissiveIntensity: view.night ? 0.24 : 0.16
      });
      function compactPhongGroup(grp, mat, name){
        if(!grp.children.length) return;
        grp.updateMatrixWorld(true);
        var totV = 0, meshes = [];
        grp.traverse(function(m){ if(m.isMesh && m.geometry){ var c = meshVertCount(m); if(c){ totV += c; meshes.push(m); } } });
        if(!totV) return;
        var b = { P: new Float32Array(totV * 3), N: new Float32Array(totV * 3), C: new Float32Array(totV * 3), off: 0 };
        for(var mi = 0; mi < meshes.length; mi++) writeMeshToBucket(b, meshes[mi], null, null);
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(b.P, 3));
        g.setAttribute('normal', new T.BufferAttribute(b.N, 3));
        g.setAttribute('color', new T.BufferAttribute(b.C, 3));
        g.computeBoundingSphere();
        var om = new T.Mesh(g, mat); om.name = name; om.castShadow = false; om.receiveShadow = true;
        extras.add(om);
      }
      function addCabinGlass(geo, mat, x, y, z, rx, ry, rz){
        var gm = new T.Mesh(geo, mat);
        gm.position.set(x, y, z);
        if(rx) gm.rotation.x = rx;
        if(ry) gm.rotation.y = ry;
        if(rz) gm.rotation.z = rz;
        cabinExtras.add(gm);
        return gm;
      }
      function buildGreatCabinArchitecture(){
        var archG0 = curRoot.children.length;
        // 1. Royal crimson-and-gold woven cabin carpets laid strictly flush on deck planks (y = -0.114, reefGround, zero Z-fighting)
        function wovenCarpet(mx, mz, w, d){
          var y0 = -.114;
          var base = block(w, .008, d, '#d8aa4a', mx, y0, mz, 0, 'fabric'); base.userData.reefGround = true;
          var navy = block(w - .42, .009, d - .42, '#243c56', mx, y0 + .001, mz, 0, 'fabric'); navy.userData.reefGround = true;
          var gold = block(w - .88, .010, d - .88, '#e8c468', mx, y0 + .002, mz, 0, 'fabric'); gold.userData.reefGround = true;
          var crim = block(w - 1.30, .011, d - 1.30, '#9c2d34', mx, y0 + .003, mz, 0, 'fabric'); crim.userData.reefGround = true;
          var innerG = block(w * .54, .012, d * .54, '#e2b858', mx, y0 + .004, mz, 0, 'fabric'); innerG.userData.reefGround = true;
          var innerC = block(w * .48, .013, d * .48, '#b2383e', mx, y0 + .005, mz, 0, 'fabric'); innerC.userData.reefGround = true;
          // Woven diamond medallion & corner gold-ivory rosettes
          var dm = block(Math.min(w, d) * .28, .014, Math.min(w, d) * .28, '#26435e', mx, y0 + .006, mz, Math.PI / 4, 'fabric'); dm.userData.reefGround = true;
          var dm2 = block(Math.min(w, d) * .20, .015, Math.min(w, d) * .20, '#f1dca4', mx, y0 + .007, mz, Math.PI / 4, 'fabric'); dm2.userData.reefGround = true;
          [-1, 1].forEach(function(sx){ [-1, 1].forEach(function(sz){
            var cr = block(1.15, .014, 1.15, '#f2dfa8', mx + sx * (w * .36), y0 + .006, mz + sz * (d * .36), Math.PI / 4, 'fabric'); cr.userData.reefGround = true;
            var cr2 = block(.64, .015, .64, '#243c56', mx + sx * (w * .36), y0 + .007, mz + sz * (d * .36), 0, 'fabric'); cr2.userData.reefGround = true;
          }); });
          // Braided golden fringe tassels along both end hems
          var nFr = Math.max(8, Math.round(d / .95));
          for(var fi = 0; fi < nFr; fi++){
            var fz = mz - d * .46 + (fi + .5) * (d * .92 / nFr);
            var fl = block(.34, .007, .12, '#e6c064', mx - w * .5 - .17, y0, fz, 0, 'rope'); fl.userData.reefGround = true;
            var fr = block(.34, .007, .12, '#e6c064', mx + w * .5 + .17, y0, fz, 0, 'rope'); fr.userData.reefGround = true;
          }
        }
        wovenCarpet(cx + 3.2, cz + 4.2, 22.0, 15.2);
        wovenCarpet(sb.minX + 11.2, cz, 12.6, 11.4);

        // 2. Perimeter Rich Oak Wainscoting, Panoramic Mullioned Ocean Gallery Windows (y = 1.24..3.82),
        //    Solid Wood-Paneled Interior Cabin Walls (stern & port bays with bookshelves & sconce frames),
        //    & Large Framed Nautical Sea Charts mounted along the oak panels!
        var bayCountTotal = 0;
        for(var ei = 0; ei < shipPoly.length; ei++){
          var a = shipPoly[ei], b = shipPoly[(ei + 1) % shipPoly.length];
          var edx = b[0] - a[0], edz = b[1] - a[1], elen = Math.hypot(edx, edz);
          if(elen < 1.5) continue;
          var eang = Math.atan2(edx, edz);
          var tx = edx / elen, tz = edz / elen;
          var inx = -tz, inz = tx;
          if(inx * (cx - (a[0] + b[0]) * .5) + inz * (cz - (a[1] + b[1]) * .5) < 0){ inx = -inx; inz = -inz; }
          var emx = (a[0] + b[0]) * .5, emz = (a[1] + b[1]) * .5;
          // Starboard & bow-facing walls feature wide panoramic mullioned ocean gallery windows;
          // Stern & port-rear walls alternate solid wood-paneled cabin wainscoting/bookcases with framed gallery windows!
          var isOceanGalleryEdge = (emz < cz - 2.0) || (emx > cx + 6.0);
          // Continuous rich dark-oak wainscot dado wall + honey-oak sill + gilded brass dado rail + baseboard
          block(.24, 1.34, elen + .06, '#5a3a25', emx + inx * .08, .55, emz + inz * .08, eang, 'timber');
          block(.36, .14, elen + .12, '#7e5436', emx + inx * .12, 1.25, emz + inz * .12, eang, 'timber');
          block(.32, .065, elen + .08, '#e2b656', emx + inx * .16, 1.16, emz + inz * .16, eang, false);
          block(.34, .16, elen + .08, '#4a2e1d', emx + inx * .14, -.04, emz + inz * .14, eang, 'timber');
          // Window header cornice at y = 3.82 (seamlessly meets the hideOnZoom upper frieze & coffered oak ceiling!)
          block(.40, .28, elen + .18, '#543521', emx + inx * .10, 3.84, emz + inz * .10, eang, 'timber');
          block(.42, .085, elen + .14, '#e6ba5a', emx + inx * .14, 3.70, emz + inz * .14, eang, false);
          if(isOceanGalleryEdge){
            addCabinGlass(new T.PlaneGeometry(elen - .2, 2.42), cabinGlassMat, emx + inx * .06, 2.50, emz + inz * .06, 0, eang + Math.PI / 2, 0);
          }

          var nBays = Math.max(2, Math.round(elen / 4.4));
          var bayW = elen / nBays;
          for(var bi = 0; bi <= nBays; bi++){
            var bt = bi / nBays;
            var px = a[0] + edx * bt + inx * .12, pz = a[1] + edz * bt + inz * .12;
            // Fluted mahogany window pilaster + gilded brass base & capital
            block(.36, 2.66, .36, '#523320', px, 2.52, pz, eang, 'timber');
            block(.42, .13, .42, '#e2b656', px, 3.64, pz, eang, false);
            block(.42, .11, .42, '#cc9c42', px, 1.33, pz, eang, false);
            if(bi < nBays){
              bayCountTotal++;
              var bmx = a[0] + edx * ((bi + .5) / nBays), bmz = a[1] + edz * ((bi + .5) / nBays);
              // Recessed honey-oak wainscoting panel inside the bay
              block(.09, .88, Math.max(.6, bayW - .62), '#8d603c', bmx + inx * .20, .62, bmz + inz * .20, eang, 'timber');
              // Solid wood-paneled cabin bays on interior stern/port walls (keeping center bays windowed for ocean views!)
              var solidBay = !isOceanGalleryEdge && (bi % 2 === 0);
              if(solidBay){
                block(.26, 2.48, Math.max(.6, bayW - .14), '#5e3b24', bmx + inx * .08, 2.50, bmz + inz * .08, eang, 'timber');
                block(.12, 1.98, Math.max(.5, bayW - .76), '#855837', bmx + inx * .20, 2.50, bmz + inz * .20, eang, 'timber');
                // Large gilded framed nautical oil chart mounted at eye level on the solid wood wall!
                // MIN-5: Cycle 3 distinct maritime canvas motifs (tall ship silhouette, golden compass rose, coastal lighthouse cliff)
                var artMotif = bayCountTotal % 3;
                if(bayW > 2.4){
                  var wx = bmx + inx * .29, wz = bmz + inz * .29, wy = 2.50;
                  var fw = Math.min(2.10, bayW - 1.15), cw = Math.min(1.90, bayW - 1.35);
                  block(.08, 1.32, fw, '#e4b854', wx, wy, wz, eang, false);
                  if(artMotif === 0){
                    // Motif 0: Tall ship silhouette against warm sunset sky & deep teal sea
                    block(.09, 1.12, cw, '#f4d49c', wx + inx * .025, wy, wz + inz * .025, eang, 'fabric');
                    block(.10, .36, cw - .08, '#2e7b8e', wx + inx * .036, wy - .34, wz + inz * .036, eang, false);
                    block(.10, .18, cw * .46, '#4d2e1c', wx + inx * .042, wy - .14, wz + inz * .042, eang, false);
                    block(.10, .44, .05, '#3b2416', wx + inx * .044, wy + .14, wz + inz * .044, eang, false);
                    block(.10, .36, cw * .30, '#fff6de', wx + inx * .046, wy + .18, wz + inz * .046, eang, 'fabric');
                    block(.10, .26, cw * .20, '#f8e6ba', wx + inx * .046 + tx * cw * .18, wy + .12, wz + inz * .046 + tz * cw * .18, eang, 'fabric');
                  } else if(artMotif === 1){
                    // Motif 1: Golden compass rose on deep navy-indigo nautical chart
                    block(.09, 1.12, cw, '#1f3f58', wx + inx * .025, wy, wz + inz * .025, eang, false);
                    block(.10, .78, .78, '#e4b854', wx + inx * .036, wy, wz + inz * .036, eang, false);
                    block(.10, .64, .64, '#295370', wx + inx * .040, wy, wz + inz * .040, eang, false);
                    block(.10, .74, .14, '#f6d26e', wx + inx * .044, wy, wz + inz * .044, eang, false);
                    block(.10, .14, .74, '#c84b44', wx + inx * .046, wy, wz + inz * .046, eang, false);
                  } else {
                    // Motif 2: Coastal lighthouse cliff overlooking twilight-aqua sea
                    block(.09, 1.12, cw, '#d8ecf2', wx + inx * .025, wy, wz + inz * .025, eang, 'fabric');
                    block(.10, .34, cw - .08, '#3c8fa0', wx + inx * .036, wy - .35, wz + inz * .036, eang, false);
                    block(.10, .32, cw * .48, '#8a6d4b', wx + inx * .040, wy - .22, wz + inz * .040 - tz * cw * .18, eang, false);
                    block(.10, .52, .18, '#c84b44', wx + inx * .044, wy + .14, wz + inz * .044 - tz * cw * .20, eang, false);
                    block(.10, .18, .20, '#f7ebd0', wx + inx * .046, wy + .14, wz + inz * .046 - tz * cw * .20, eang, 'fabric');
                    block(.10, .14, .14, '#ffe68a', wx + inx * .048, wy + .42, wz + inz * .048 - tz * cw * .20, eang, false);
                  }
                }
              } else {
                if(!isOceanGalleryEdge){
                  addCabinGlass(new T.PlaneGeometry(Math.max(.5, bayW - .28), 2.42), cabinGlassMat, bmx + inx * .06, 2.50, bmz + inz * .06, 0, eang + Math.PI / 2, 0);
                }
                // Crisp brass window mullions (center vertical + two transoms + flanking sidelight mullions)
                block(.08, 2.44, .08, '#deb252', bmx + inx * .08, 2.50, bmz + inz * .08, eang, false);
                block(.08, .08, Math.max(.5, bayW - .28), '#deb252', bmx + inx * .08, 3.12, bmz + inz * .08, eang, false);
                block(.065, .065, Math.max(.5, bayW - .28), '#caa046', bmx + inx * .08, 2.08, bmz + inz * .08, eang, false);
                if(bayW > 3.2){
                  [-.25, .25].forEach(function(off){
                    block(.055, 2.42, .055, '#cca044', bmx + tx * bayW * off + inx * .08, 2.50, bmz + tz * bayW * off + inz * .08, eang, false);
                  });
                }
              }
              // Large readable framed nautical sea charts mounted on oak wainscoting panels!
              if(bayW > 2.4){
                var fx = bmx + inx * .27, fz = bmz + inz * .27, fy = .66;
                var wMotif = bayCountTotal % 3;
                block(.07, .82, 1.56, '#e0b250', fx, fy, fz, eang, false);
                if(wMotif === 0){
                  block(.08, .68, 1.40, '#f4d49c', fx + inx * .025, fy, fz + inz * .025, eang, 'fabric');
                  block(.09, .22, 1.32, '#2e7b8e', fx + inx * .036, fy - .20, fz + inz * .036, eang, false);
                  block(.09, .12, .64, '#4d2e1c', fx + inx * .040, fy - .06, fz + inz * .040, eang, false);
                  block(.09, .26, .42, '#fff6de', fx + inx * .042, fy + .12, fz + inz * .042, eang, 'fabric');
                } else if(wMotif === 1){
                  block(.08, .68, 1.40, '#1f3f58', fx + inx * .025, fy, fz + inz * .025, eang, false);
                  block(.09, .46, .46, '#e4b854', fx + inx * .036, fy, fz + inz * .036, eang, false);
                  block(.09, .38, .38, '#295370', fx + inx * .039, fy, fz + inz * .039, eang, false);
                  block(.09, .44, .10, '#f6d26e', fx + inx * .042, fy, fz + inz * .042, eang, false);
                  block(.09, .10, .44, '#c84b44', fx + inx * .044, fy, fz + inz * .044, eang, false);
                } else {
                  block(.08, .68, 1.40, '#d8ecf2', fx + inx * .025, fy, fz + inz * .025, eang, 'fabric');
                  block(.09, .22, 1.32, '#3c8fa0', fx + inx * .036, fy - .20, fz + inz * .036, eang, false);
                  block(.09, .20, .62, '#8a6d4b', fx + inx * .039, fy - .12, fz + inz * .039 - tz * .26, eang, false);
                  block(.09, .32, .14, '#c84b44', fx + inx * .042, fy + .08, fz + inz * .042 - tz * .28, eang, false);
                  block(.09, .10, .10, '#ffe68a', fx + inx * .044, fy + .26, fz + inz * .044 - tz * .28, eang, false);
                }
              }
            }
          }
        }
        compactRootRange(archG0, cx, 0, cz, 0);

        // 3. FULL ENCLOSED VAULTED COFFERED OAK CEILING (in cabinCeilingGrp tagged userData.hideOnZoom = true!)
        //    Gameplay view is 100% enclosed indoors (NO open sky/clouds above!), while Map zoom (zoomNow > 0.22) lifts it cleanly!
        var pMinX = sb.minX, pMaxX = sb.maxX, pMinZ = sb.minZ, pMaxZ = sb.maxZ;
        var pMidX = (pMinX + pMaxX) * .5, pMidZ = (pMinZ + pMaxZ) * .5, pHalfZ = Math.max(8, (pMaxZ - pMinZ) * .5);
        var wallSpringY = 6.38, vaultRise = 2.18; // >= 6.38 everywhere -> strictly above ALL 31 cameras (cam.y = 5.70)!
        function cabinCeilY(z){
          var u = Math.min(1, Math.abs(z - pMidZ) / (pHalfZ + 0.85));
          return wallSpringY + vaultRise * Math.cos(u * Math.PI * 0.5);
        }
        function cabinCeilSlope(z){
          var u = Math.min(1, Math.abs(z - pMidZ) / (pHalfZ + 0.85));
          var sgn = z >= pMidZ ? 1 : -1;
          return -sgn * vaultRise * (Math.PI * 0.5 / (pHalfZ + 0.85)) * Math.sin(u * Math.PI * 0.5);
        }
        // Convex X-slice [zLo, zHi] of shipPoly (expanded +0.42u outward so perimeter seams are 100% watertight!)
        function polyZSpanAtX(qx){
          var zLo = Infinity, zHi = -Infinity;
          for(var si = 0; si < shipPoly.length; si++){
            var pa = shipPoly[si], pb = shipPoly[(si + 1) % shipPoly.length];
            var x0 = pa[0], z0 = pa[1], x1 = pb[0], z1 = pb[1];
            if((x0 <= qx && x1 >= qx) || (x1 <= qx && x0 >= qx)){
              if(Math.abs(x1 - x0) < 1e-5){
                if(z0 < zLo) zLo = z0; if(z0 > zHi) zHi = z0;
                if(z1 < zLo) zLo = z1; if(z1 > zHi) zHi = z1;
              } else {
                var zInt = z0 + (qx - x0) * (z1 - z0) / (x1 - x0);
                if(zInt < zLo) zLo = zInt; if(zInt > zHi) zHi = zInt;
              }
            }
          }
          if(!isFinite(zLo) || !isFinite(zHi)) return null;
          return [zLo - .42, zHi + .42];
        }
        function polyXSpanAtZ(qz){
          var xLo = Infinity, xHi = -Infinity;
          for(var si = 0; si < shipPoly.length; si++){
            var pa = shipPoly[si], pb = shipPoly[(si + 1) % shipPoly.length];
            var x0 = pa[0], z0 = pa[1], x1 = pb[0], z1 = pb[1];
            if((z0 <= qz && z1 >= qz) || (z1 <= qz && z0 >= qz)){
              if(Math.abs(z1 - z0) < 1e-5){
                if(x0 < xLo) xLo = x0; if(x0 > xHi) xHi = x0;
                if(x1 < xLo) xLo = x1; if(x1 > xHi) xHi = x1;
              } else {
                var xInt = x0 + (qz - z0) * (x1 - x0) / (z1 - z0);
                if(xInt < xLo) xLo = xInt; if(xInt > xHi) xHi = xInt;
              }
            }
          }
          if(!isFinite(xLo) || !isFinite(xHi)) return null;
          return [xLo - .35, xHi + .35];
        }
        var emOak = view.night ? '#2c180b' : '#4f2f18', emOakI = view.night ? .42 : .48;
        var emBeam = view.night ? '#38200f' : '#5e381d', emBeamI = view.night ? .45 : .52;
        var emGold = '#785418', emGoldI = .48;
        var matCofferDark = M('#472a19', { emissive: emOak, emissiveIntensity: emOakI, side: T.DoubleSide });
        var matFriezeMahog = M('#5e3a23', { emissive: emOak, emissiveIntensity: emOakI, side: T.DoubleSide });
        var matFriezeInset = M('#865938', { emissive: emBeam, emissiveIntensity: emBeamI, side: T.DoubleSide });
        var matBeamOak = M('#7c4f2e', { emissive: emBeam, emissiveIntensity: emBeamI });
        var matBeamDark = M('#4f301c', { emissive: emOak, emissiveIntensity: emOakI });
        var matTrimGold = M('#e8be5a', { emissive: emGold, emissiveIntensity: emGoldI });
        var matCandleGlow = new T.MeshBasicMaterial({ color: '#fff5c2' });
        var matLeadDark = M('#2f1e14', { emissive: '#1e120a', emissiveIntensity: .35, side: T.DoubleSide });
        function cAdd(geo, mat, x, y, z, rx, ry, rz){
          var o = new T.Mesh(geo, mat);
          o.position.set(x, y, z);
          if(rx) o.rotation.x = rx;
          if(ry) o.rotation.y = ry;
          if(rz) o.rotation.z = rz;
          cabinCeilingGrp.add(o);
          return o;
        }
        function cLimb(x1, y1, z1, x2, y2, z2, w, h, mat){
          var dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, len = Math.hypot(dx, dy, dz);
          if(len < .05) return;
          var o = new T.Mesh(box(w, h, len), mat);
          o.position.set((x1 + x2) * .5, (y1 + y2) * .5, (z1 + z2) * .5);
          o.lookAt(x2, y2, z2);
          cabinCeilingGrp.add(o);
        }

        // 3a. Watertight Upper Mahogany Frieze & Wall Spandrels sealing EVERY shipPoly edge from y = 3.74 up to cabinCeilY(z) + 0.30!
        var cam0Rig = main.length ? realCamSetupAt(0) : null;
        var cam0Pos = cam0Rig && cam0Rig.cam ? cam0Rig.cam.position : null;
        for(var fei = 0; fei < shipPoly.length; fei++){
          var fa = shipPoly[fei], fb = shipPoly[(fei + 1) % shipPoly.length];
          var fdx = fb[0] - fa[0], fdz = fb[1] - fa[1], flen = Math.hypot(fdx, fdz);
          if(flen < 1.2) continue;
          var fang = Math.atan2(fdx, fdz);
          var finx = -fdz / flen, finz = fdx / flen;
          if(finx * (cx - (fa[0] + fb[0]) * .5) + finz * (cz - (fa[1] + fb[1]) * .5) < 0){ finx = -finx; finz = -finz; }
          var nSeg = Math.max(4, Math.ceil(flen / 4.2));
          var fp = [], fidx = [];
          for(var fs = 0; fs <= nSeg; fs++){
            var ft = fs / nSeg;
            var wx = fa[0] + fdx * ft - finx * .08, wz = fa[1] + fdz * ft - finz * .08;
            var yTop = cabinCeilY(wz) + .32;
            fp.push(wx, 3.74, wz, wx, yTop, wz);
          }
          for(var fs2 = 0; fs2 < nSeg; fs2++){
            var i0 = fs2 * 2, i1 = i0 + 1, i2 = i0 + 2, i3 = i0 + 3;
            fidx.push(i0, i2, i1, i1, i2, i3);
          }
          var fg = new T.BufferGeometry();
          fg.setAttribute('position', new T.Float32BufferAttribute(fp, 3));
          fg.setIndex(fidx); fg.computeVertexNormals();
          cabinCeilingGrp.add(new T.Mesh(fg, matFriezeMahog));
          // Continuous gilded cornice & carved oak frieze panels along the upper wall (y = 3.85..6.35)
          var fmx = (fa[0] + fb[0]) * .5, fmz = (fa[1] + fb[1]) * .5;
          cAdd(box(.32, .12, flen + .12), matTrimGold, fmx + finx * .14, 4.98, fmz + finz * .14, 0, fang, 0);
          cAdd(box(.42, .24, flen + .16), matBeamDark, fmx + finx * .16, 6.26, fmz + finz * .16, 0, fang, 0);
          cAdd(box(.44, .09, flen + .14), matTrimGold, fmx + finx * .18, 6.10, fmz + finz * .18, 0, fang, 0);
          for(var fb2 = 0; fb2 < nSeg; fb2++){
            var bt2 = (fb2 + .5) / nSeg, bpx = fa[0] + fdx * bt2, bpz = fa[1] + fdz * bt2;
            var panelW = Math.max(.8, flen / nSeg - .85);
            // Warm recessed oak frieze panel + gilded corner studs + carved vertical pilaster rising into ceiling beam!
            cAdd(box(.12, .92, panelW), matFriezeInset, bpx + finx * .16, 4.40, bpz + finz * .16, 0, fang, 0);
            cAdd(box(.12, .86, panelW), matFriezeInset, bpx + finx * .16, 5.56, bpz + finz * .16, 0, fang, 0);
            var pilX = fa[0] + fdx * (fb2 / nSeg), pilZ = fa[1] + fdz * (fb2 / nSeg);
            cAdd(box(.38, 2.55, .36), matBeamDark, pilX + finx * .16, 5.08, pilZ + finz * .16, 0, fang, 0);
            cAdd(box(.44, .16, .42), matTrimGold, pilX + finx * .18, 6.18, pilZ + finz * .18, 0, fang, 0);
            // Hanging warm perimeter brass gimbal lantern beneath alternate upper pilasters!
            // MIN-3: Skip any gimbal lantern within 4.8u of cam@0 (sp[0]) or in its foreground-right camera cone
            // so no oversized yellow lantern photobombs the foreground-right treasure chest.
            if(fb2 % 2 === 1){
              var glx = pilX + finx * 1.15, glz = pilZ + finz * 1.15, gly = 4.62;
              var skipGimbal = false;
              if(cam0Pos && main[0]){
                var s0 = main[0];
                for(var gt = 0.15; gt <= 1.01; gt += 0.14){
                  var rx = s0.x + (cam0Pos.x - s0.x) * gt, rz = s0.z + (cam0Pos.z - s0.z) * gt;
                  if(Math.hypot(glx - rx, glz - rz) < 7.2){ skipGimbal = true; break; }
                }
                if(!skipGimbal && Math.hypot(glx - s0.x, glz - s0.z) < 10.5 && glx > s0.x + 1.0) skipGimbal = true;
              }
              if(!skipGimbal){
                cLimb(pilX + finx * .20, 5.45, pilZ + finz * .20, glx, 5.15, glz, .11, .11, matBeamOak);
                cAdd(cyl(.026, .026, .52, 6), matTrimGold, glx, gly + .30, glz);
                cAdd(smoothTorus(.22, .026, 6, 12), matTrimGold, glx, gly - .04, glz, 0, fang, 0);
                cAdd(cyl(.15, .13, .30, 8), matCandleGlow, glx, gly - .04, glz);
                cAdd(cone(.21, .15, 8), matTrimGold, glx, gly + .15, glz);
                cAdd(ball(.065, 8, 5), matTrimGold, glx, gly - .24, glz);
                var glHalo = new T.Mesh(new T.SphereGeometry(.20, 8, 6), cabinGlowMat);
                glHalo.position.set(glx, gly - .04, glz);
                cabinCeilingGrp.add(glHalo);
              }
            }
          }
        }

        // 3b. Watertight Vaulted Dark-Walnut Coffered Ceiling Canopy covering 100% of shipPoly (zero sky pixels!)
        (function buildVaultedRoofCanopy(){
          var nX = 20, nZ = 14, rp = [], rc = [], ridx = [];
          var xSpan0 = pMinX - .40, xSpan1 = pMaxX + .40;
          var cWal = new T.Color('#472a19'), cWarm = new T.Color('#633d24'), cTmp = new T.Color();
          for(var ix = 0; ix <= nX; ix++){
            var ux = ix / nX, qx = xSpan0 + (xSpan1 - xSpan0) * ux;
            var spn = polyZSpanAtX(Math.max(pMinX + .05, Math.min(pMaxX - .05, qx)));
            var z0 = spn ? spn[0] : (pMidZ - 2.0), z1 = spn ? spn[1] : (pMidZ + 2.0);
            for(var iz = 0; iz <= nZ; iz++){
              var uz = iz / nZ, qz = z0 + (z1 - z0) * uz;
              var qy = cabinCeilY(qz) + .12;
              rp.push(qx, qy, qz);
              var crownGlow = Math.sin(uz * Math.PI);
              cTmp.copy(cWal).lerp(cWarm, crownGlow * .55);
              rc.push(cTmp.r, cTmp.g, cTmp.b);
            }
          }
          var row = nZ + 1;
          for(var ix2 = 0; ix2 < nX; ix2++) for(var iz2 = 0; iz2 < nZ; iz2++){
            var v0 = ix2 * row + iz2, v1 = v0 + 1, v2 = v0 + row, v3 = v2 + 1;
            ridx.push(v0, v1, v2, v1, v3, v2);
          }
          var rg = new T.BufferGeometry();
          rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
          rg.setAttribute('color', new T.Float32BufferAttribute(rc, 3));
          rg.setIndex(ridx); rg.computeVertexNormals();
          var rMat = M('#ffffff', { vertexColors: true, emissive: emOak, emissiveIntensity: emOakI, side: T.DoubleSide });
          cabinCeilingGrp.add(new T.Mesh(rg, rMat));
        })();

        // 3c. MIN-6: 1.6x Bolder Carved Transverse Oak Ceiling Beams, Longitudinal Purlins, Gilded Coffer Frames & Rosettes!
        var beamXs = [];
        var nBeams = 9;
        for(var bi2 = 0; bi2 < nBeams; bi2++){
          beamXs.push(pMinX + 2.8 + (pMaxX - pMinX - 5.6) * (bi2 / (nBeams - 1)));
        }
        var purlinZs = [pMidZ - 14.0, pMidZ - 7.0, pMidZ, pMidZ + 7.0, pMidZ + 14.0];
        // Heavy carved transverse oak deck-beams arching from wall to wall + bold timber knee brackets (1.65x profile!)
        beamXs.forEach(function(bx){
          var spn = polyZSpanAtX(bx);
          if(!spn || spn[1] - spn[0] < 3.0) return;
          var nArc = 10, zA = spn[0] + .35, zB = spn[1] - .35;
          for(var ai = 0; ai < nArc; ai++){
            var za = zA + (zB - zA) * (ai / nArc), zb = zA + (zB - zA) * ((ai + 1) / nArc);
            var ya = cabinCeilY(za) - .24, yb = cabinCeilY(zb) - .24;
            cLimb(bx, ya, za, bx, yb, zb, .86, .90, matBeamOak);
            cLimb(bx, ya - .36, za, bx, yb - .36, zb, .56, .22, matBeamDark);
            cLimb(bx, ya - .49, za, bx, yb - .49, zb, .28, .14, matTrimGold);
          }
          // Heavy carved curved knee corbels descending neatly down both side walls into the window pilasters
          [zA, zB].forEach(function(ewZ, ewi){
            var sgn = ewi === 0 ? 1 : -1;
            var yW = cabinCeilY(ewZ) - .22;
            cLimb(bx, yW - 1.68, ewZ + sgn * .12, bx, yW - .05, ewZ + sgn * 1.62, .68, .68, matBeamDark);
            cAdd(ball(.28, 8, 5), matTrimGold, bx, yW - 1.68, ewZ + sgn * .26);
          });
        });
        // Heavy longitudinal oak purlin beams intersecting transverse beams for deep carved walnut coffers (1.65x profile!)
        purlinZs.forEach(function(pz){
          var xsp = polyXSpanAtZ(pz);
          if(!xsp || xsp[1] - xsp[0] < 4.0) return;
          var x0 = xsp[0] + .45, x1 = xsp[1] - .45, py = cabinCeilY(pz) - .22;
          var sl = Math.atan(cabinCeilSlope(pz));
          cAdd(box(x1 - x0, .72, .72), matBeamOak, (x0 + x1) * .5, py, pz, sl, 0, 0);
          cAdd(box(x1 - x0, .18, .48), matBeamDark, (x0 + x1) * .5, py - .32, pz, sl, 0, 0);
          cAdd(box(x1 - x0, .14, .24), matTrimGold, (x0 + x1) * .5, py - .42, pz, sl, 0, 0);
        });
        // Bold carved mahogany & gilded brass coffer trim frames & boss rosettes inside every coffer bay!
        for(var ci = 0; ci < beamXs.length - 1; ci++){
          var cmx = (beamXs[ci] + beamXs[ci + 1]) * .5, cbw = Math.max(1.2, (beamXs[ci + 1] - beamXs[ci]) - 1.25);
          for(var cj = 0; cj < purlinZs.length - 1; cj++){
            var cmz = (purlinZs[cj] + purlinZs[cj + 1]) * .5, cbd = Math.max(1.2, (purlinZs[cj + 1] - purlinZs[cj]) - 1.25);
            if(!insideShipDeck(cmx, cmz, 2.2)) continue;
            // Leave center bays open for the two grand stained-glass compass skylights!
            if(Math.hypot(cmx - pMidX, cmz - pMidZ) < 4.8 || Math.hypot(cmx - (-15.5), cmz - (-7.2)) < 4.8) continue;
            var cmy = cabinCeilY(cmz) - .08, csl = Math.atan(cabinCeilSlope(cmz));
            // Dark walnut recessed coffer panel + bold gilded brass frame bars + center sculpted medallion boss
            cAdd(box(cbw, .14, cbd), matCofferDark, cmx, cmy + .08, cmz, csl, 0, 0);
            cAdd(box(cbw + .22, .18, .22), matTrimGold, cmx, cmy - .06, cmz - cbd * .47, csl, 0, 0);
            cAdd(box(cbw + .22, .18, .22), matTrimGold, cmx, cmy - .06, cmz + cbd * .47, csl, 0, 0);
            cAdd(box(.22, .18, cbd + .22), matTrimGold, cmx - cbw * .47, cmy - .06, cmz, csl, 0, 0);
            cAdd(box(.22, .18, cbd + .22), matTrimGold, cmx + cbw * .47, cmy - .06, cmz, csl, 0, 0);
            cAdd(cyl(.54, .62, .20, 10), matTrimGold, cmx, cmy - .08, cmz, csl, 0, 0);
          }
        }
        // Bold carved golden intersection bosses at every beam-purlin cross
        beamXs.forEach(function(bx){
          purlinZs.forEach(function(pz){
            if(!insideShipDeck(bx, pz, 1.8)) return;
            cAdd(cyl(.48, .56, .30, 10), matTrimGold, bx, cabinCeilY(pz) - .56, pz, Math.atan(cabinCeilSlope(pz)), 0, 0);
          });
        });

        // 3d. Luminous Stained-Glass Compass-Rose Skylights set into the vaulted coffered ceiling!
        //     (1 central cabin skylight + 1 forward-starboard skylight gleaming squarely in cam@3 / cam@0 upper ceiling!)
        function stainedGlassCompassSkylight(sx, sz, rad){
          var sy = cabinCeilY(sz) - .10, sl = Math.atan(cabinCeilSlope(sz));
          var sGrp = new T.Group();
          sGrp.position.set(sx, sy, sz);
          sGrp.rotation.x = sl;
          // Heavy carved mahogany & gilded brass circular bezel frame
          var bezel = new T.Mesh(smoothTorus(rad, .34, 8, 24), matBeamDark); bezel.rotation.x = Math.PI / 2; sGrp.add(bezel);
          var gBezel = new T.Mesh(smoothTorus(rad - .28, .12, 8, 24), matTrimGold); gBezel.rotation.x = Math.PI / 2; gBezel.position.y = -.14; sGrp.add(gBezel);
          var innerRing = new T.Mesh(smoothTorus(rad * .56, .09, 6, 20), matTrimGold); innerRing.rotation.x = Math.PI / 2; innerRing.position.y = -.08; sGrp.add(innerRing);
          // 16 radiant jewel-toned stained-glass compass-rose wedges (turquoise, amber-gold, coral-crimson, sunlit sapphire, ivory)
          var glassCols = view.night
            ? ['#3eb8cc', '#d4a84c', '#c85862', '#4a7ec4', '#3eb8cc', '#e8c468', '#52c8ba', '#4a7ec4']
            : ['#58e4e0', '#ffe066', '#f26d68', '#52aef2', '#58e4e0', '#ffea80', '#70ead0', '#52aef2'];
          var outerR = rad - .26, midR = rad * .56, coreR = rad * .24;
          for(var wi = 0; wi < 16; wi++){
            var a0 = wi * Math.PI / 8, a1 = (wi + 1) * Math.PI / 8, am = (a0 + a1) * .5;
            // Outer stained-glass ring pane
            var oShape = new T.BufferGeometry();
            oShape.setAttribute('position', new T.Float32BufferAttribute([
              Math.cos(a0) * midR, -.02, Math.sin(a0) * midR,
              Math.cos(a0) * outerR, -.02, Math.sin(a0) * outerR,
              Math.cos(a1) * outerR, -.02, Math.sin(a1) * outerR,
              Math.cos(a0) * midR, -.02, Math.sin(a0) * midR,
              Math.cos(a1) * outerR, -.02, Math.sin(a1) * outerR,
              Math.cos(a1) * midR, -.02, Math.sin(a1) * midR
            ], 3));
            oShape.computeVertexNormals();
            sGrp.add(new T.Mesh(oShape, new T.MeshBasicMaterial({ color: glassCols[wi % glassCols.length], side: T.DoubleSide })));
            // Inner compass-star alternating jewel pane
            var iShape = new T.BufferGeometry();
            var tipR = (wi % 2 === 0) ? midR : (midR * .78);
            iShape.setAttribute('position', new T.Float32BufferAttribute([
              0, -.05, 0,
              Math.cos(a0) * tipR, -.04, Math.sin(a0) * tipR,
              Math.cos(a1) * midR, -.04, Math.sin(a1) * midR
            ], 3));
            iShape.computeVertexNormals();
            var starCol = (wi % 2 === 0) ? (view.night ? '#f4cf6a' : '#fff2a8') : (view.night ? '#56c6d4' : '#7ef4ec');
            sGrp.add(new T.Mesh(iShape, new T.MeshBasicMaterial({ color: starCol, side: T.DoubleSide })));
            // Crisp dark leaded-brass radial mullion bar
            var mul = new T.Mesh(box(outerR * .98, .10, .09), wi % 2 === 0 ? matTrimGold : matLeadDark);
            mul.position.set(Math.cos(a0) * outerR * .49, -.10, Math.sin(a0) * outerR * .49);
            mul.rotation.y = -a0;
            sGrp.add(mul);
          }
          // Glowing pearl-gold compass center boss
          var coreM = new T.Mesh(cyl(coreR, coreR, .14, 16), new T.MeshBasicMaterial({ color: '#fff8d4' }));
          coreM.position.y = -.09; sGrp.add(coreM);
          var coreRing = new T.Mesh(smoothTorus(coreR, .08, 6, 16), matTrimGold);
          coreRing.rotation.x = Math.PI / 2; coreRing.position.y = -.14; sGrp.add(coreRing);
          cabinCeilingGrp.add(sGrp);
        }
        stainedGlassCompassSkylight(pMidX, pMidZ, 4.35);
        stainedGlassCompassSkylight(-15.5, -7.2, 4.10);

        // 3e. MIN-6: 1.6x+ Bolder Forged Brass Ship-Wheel Chandeliers descending from the curved oak ceiling beams!
        //     (Kept at y = 5.72..5.88 — gleaming richly in the upper frame, strictly above all characters & tile sightlines!)
        var matChandelierBronze = M('#b8822e', { emissive: '#4a310e', emissiveIntensity: .28 });
        var matChandelierUnder = M('#5c3d18', { emissive: '#261808', emissiveIntensity: .22 });
        var matCandleIvory = M('#f2e5c6', { emissive: '#5a4a2c', emissiveIntensity: .24 });
        var matFlameAmber = new T.MeshBasicMaterial({ color: '#ffba42' });
        var matTipGleam = new T.MeshBasicMaterial({ color: '#ffba42', transparent: true, opacity: .38, depthWrite: false });
        function hangingBrassChandelier(hx, hz, dropY){
          var ceilTop = cabinCeilY(hz) - .28;
          var chY = dropY || 5.25;
          var chainLen = Math.max(.6, ceilTop - chY);
          // Bold carved antique bronze ceiling canopy medallion + heavy hanging bronze chain rod
          cAdd(cyl(.54, .38, .26, 12), matChandelierBronze, hx, ceilTop - .08, hz);
          cAdd(cyl(.078, .078, chainLen, 10), matChandelierBronze, hx, chY + chainLen * .5, hz);
          // 1.75x bolder forged bronze ship-wheel chandelier hoop + deeper bronze underside ring + upper crown ring + 6 thick radial spokes & scrolled struts + ornate acorn finial
          cAdd(smoothTorus(1.06, .118, 10, 22), matChandelierBronze, hx, chY, hz, Math.PI / 2, 0, 0);
          cAdd(smoothTorus(1.06, .048, 8, 20), matChandelierUnder, hx, chY - .09, hz, Math.PI / 2, 0, 0);
          cAdd(smoothTorus(.52, .076, 8, 16), matChandelierBronze, hx, chY + .30, hz, Math.PI / 2, 0, 0);
          cAdd(cyl(.28, .22, .58, 12), matChandelierBronze, hx, chY - .12, hz);
          cAdd(cone(.24, .40, 10), matChandelierBronze, hx, chY - .52, hz, Math.PI, 0, 0);
          for(var spk = 0; spk < 6; spk++){
            var sa = spk * Math.PI / 3;
            var cx2 = hx + Math.cos(sa) * 1.06, cz2 = hz + Math.sin(sa) * 1.06;
            cLimb(hx, chY + .24, hz, cx2, chY + .02, cz2, .075, .075, matChandelierBronze);
            cLimb(hx, chY - .18, hz, cx2, chY - .04, cz2, .062, .062, matChandelierBronze);
            // Substantial forged bronze drip cup + warm shaded ivory-cream candle + small teardrop amber flame + tight gentle gleam
            cAdd(cyl(.17, .12, .12, 10), matChandelierBronze, cx2, chY + .08, cz2);
            cAdd(cyl(.12, .11, .34, 10), matCandleIvory, cx2, chY + .28, cz2);
            var flame = cAdd(ball(.055, 8, 6), matFlameAmber, cx2, chY + .49, cz2);
            flame.scale.set(.85, 1.45, .85);
            var tipGleam = new T.Mesh(new T.SphereGeometry(.095, 6, 5), matTipGleam);
            tipGleam.position.set(cx2, chY + .49, cz2);
            cabinCeilingGrp.add(tipGleam);
          }
        }
        // Hang 6 ornate brass chandeliers cleanly over open cabin carpets & off the z=±9.6 main path
        // (y = 5.72..5.88 -> strictly clear of ALL 31 main camera sightlines while glowing richly in the upper frame!)
        var cW = sb.maxX - sb.minX, cD = sb.maxZ - sb.minZ;
        [
          [sb.minX + cW * 0.28, sb.minZ + cD * 0.28, 5.75],
          [sb.minX + cW * 0.68, sb.minZ + cD * 0.28, 5.78],
          [sb.minX + cW * 0.38, sb.minZ + cD * 0.50, 5.85],
          [sb.minX + cW * 0.78, sb.minZ + cD * 0.50, 5.85],
          [sb.minX + cW * 0.28, sb.minZ + cD * 0.74, 5.78],
          [sb.minX + cW * 0.68, sb.minZ + cD * 0.74, 5.78]
        ].forEach(function(ch){
          if(insideShipDeck(ch[0], ch[1], 3.0)) hangingBrassChandelier(ch[0], ch[1], ch[2]);
        });
      }

      // Captain Bay's Personal Treasure & Curiosity Collection prop builders (standard + hero-scale!)
      function cabinCurioCase(x, y, z, rot, variant, scOpt){
        var sc = scOpt || 1, g0 = curRoot.children.length;
        // Carved mahogany & brass museum pedestal
        wornBox(.86, .12, .86, '#4d3120', x, y + .06, z, 'timber');
        wornBox(.72, .56, .72, '#6f482e', x, y + .38, z, 'timber');
        block(.82, .08, .82, '#deb252', x, y + .68, z, 0, false);
        block(.66, .06, .66, '#9c2d34', x, y + .73, z, 0, 'fabric');
        // Brass vitrine corner posts + domed finial top frame
        [-.32, .32].forEach(function(sx){ [-.32, .32].forEach(function(sz){
          add(cyl(.026, .026, .76, 6), '#e2b858', x + sx, y + 1.12, z + sz, 0, 0, 0, false);
        }); });
        block(.72, .06, .72, '#deb252', x, y + 1.50, z, 0, false);
        add(cone(.22, .16, 8), '#e6be60', x, y + 1.60, z, 0, 0, 0, false);
        // Illuminated curiosity artifact inside the glass vitrine
        if(variant === 0){
          add(cyl(.14, .18, .12, 10), '#e5bc5b', x, y + .82, z, 0, 0, 0, false);
          smoothOrb(.22, '#fff5e4', x, y + 1.06, z, false);
          smoothOrb(.08, '#9be8f2', x + .16, y + .92, z + .14, false);
        } else if(variant === 1){
          add(smoothTorus(.16, .085, 8, 14), '#f0c478', x, y + 1.04, z, 0, .4, 0, false);
          add(cyl(0, .09, .34, 6), '#62e0da', x - .15, y + .98, z + .10, .18, .4, -.2, false);
          add(cyl(0, .07, .26, 6), '#f07872', x + .14, y + .94, z - .12, -.15, 0, .2, false);
        } else {
          add(smoothTorus(.22, .028, 6, 16), '#f2ca66', x, y + 1.08, z, 0, .3, 0, false);
          add(smoothTorus(.16, .022, 6, 14), '#e2b048', x, y + 1.08, z, Math.PI / 2, .3, 0, false);
          smoothOrb(.09, '#6ef0d2', x, y + 1.08, z, false);
        }
        wrapRot(g0, x, y, z, rot || 0, sc);
        addCabinVitrineGlass(new T.BoxGeometry(.65 * sc, .74 * sc, .65 * sc), view.night ? '#9ceaf8' : '#e6fcff', x, y + 1.12 * sc, z, 0, rot || 0, 0);
      }
      // MIN-6: Hero-Scale 4-Sided Crystal-Clear Translucent Glass Curio Vitrine (opacity: 0.22, slender brass corner frames,
      // ZERO opaque red walls!) showcasing Captain Bay's gleaming Golden 3-Masted Ship-in-a-Bottle!
      function heroCabinCurioVitrineWithShip(x, y, z, rot){
        var g0 = curRoot.children.length;
        contact(x, z, 1.35, 1.05, y + .012);
        // Grand carved mahogany museum pedestal base with brass trim & deep navy silk deck cushion
        wornBox(1.76, .16, 1.14, '#46291a', x, y + .08, z, 'timber');
        wornBox(1.58, .72, 1.00, '#6a4027', x, y + .50, z, 'timber');
        block(1.42, .48, .08, '#8a5837', x, y + .50, z + .50, 0, 'timber');
        block(1.42, .48, .08, '#8a5837', x, y + .50, z - .50, 0, 'timber');
        block(1.70, .10, 1.08, '#e8be5a', x, y + .90, z, 0, false);
        block(1.48, .06, .88, '#23445c', x, y + .965, z, 0, 'fabric'); // Deep maritime navy velvet cushion (ZERO opaque red wall!)
        // Slender gilded brass corner frames + crisp top & bottom perimeter glass rails (4-sided see-through showcase!)
        [-.72, .72].forEach(function(sx){ [-.44, .44].forEach(function(sz){
          add(cyl(.036, .036, 1.32, 8), '#f0c862', x + sx, y + 1.62, z + sz, 0, 0, 0, false);
        }); });
        [.98, 2.22].forEach(function(ry){
          [-.44, .44].forEach(function(sz){ block(1.46, .042, .042, '#ebc25c', x, y + ry, z + sz, 0, false); });
          [-.72, .72].forEach(function(sx){ block(.042, .042, .90, '#ebc25c', x + sx, y + ry, z, 0, false); });
        });
        // Crown mahogany cornice cap + gilded finial pediment
        wornBox(1.68, .12, 1.06, '#4e2f1d', x, y + 2.31, z, 'timber');
        block(1.76, .07, 1.14, '#f0c862', x, y + 2.24, z, 0, false);
        add(cone(.28, .22, 8), '#f0c862', x, y + 2.47, z, 0, 0, 0, false);
        // GLEAMING GOLDEN 3-MASTED SHIP-IN-A-BOTTLE resting proudly on carved mahogany chocks inside the crystal-clear vitrine!
        [-.42, .34].forEach(function(cx2){ block(.14, .22, .42, '#52321e', x + cx2, y + 1.10, z, 0, 'timber'); });
        block(1.04, .09, .34, '#36c2d4', x - .08, y + 1.25, z, 0, false); // Vivid turquoise waves inside bottle
        wornBox(.84, .20, .28, '#f5c242', x - .10, y + 1.38, z, false); // Gleaming gilded golden galleon hull
        wornBox(.30, .14, .26, '#e0a228', x - .40, y + 1.50, z, false); // Raised gilded stern castle
        add(cyl(.022, .028, .36, 6), '#ffe082', x + .40, y + 1.50, z, 0, 0, -1.10, false); // Golden bowsprit
        [-.26, 0, .24].forEach(function(mx, mi){
          var mh = mi === 1 ? .56 : .44, sw = mi === 1 ? .22 : .17;
          add(cyl(.022, .026, mh, 6), '#ffe082', x - .10 + mx, y + 1.46 + mh * .5, z, 0, 0, 0, false);
          block(.045, mi === 1 ? .36 : .28, sw * 1.45, '#fff9de', x - .10 + mx, y + 1.50 + mh * .5, z, 0, false);
          block(.032, .028, sw * 1.65, '#f0c44e', x - .10 + mx, y + 1.66 + mh * .5, z, 0, false);
          add(cone(.045, .10, 4), '#e64642', x - .10 + mx, y + 1.48 + mh + .04, z, 0, 0, -Math.PI * .5, false); // Red pennant flag
        });
        // Cork stopper & crimson wax seal at bottle neck inside vitrine
        add(cyl(.125, .105, .22, 10), '#d4a264', x + .60, y + 1.54, z, 0, 0, Math.PI / 2, 'timber');
        add(cyl(.135, .135, .065, 10), '#d63e3c', x + .52, y + 1.54, z, 0, 0, Math.PI / 2, false);
        wrapRot(g0, x, y, z, rot || 0, 1);
        // Crystal-clear glossy translucent 4-pane vitrine glass enclosure (opacity: 0.22) + clear glass bottle shell!
        var cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
        addCabinVitrineGlass(new T.BoxGeometry(1.44, 1.24, .88), view.night ? '#9ceaf8' : '#e8fdff', x, y + 1.60, z, 0, rot || 0, 0);
        addCabinVitrineGlass(new T.CylinderGeometry(.40, .40, 1.16, 14), view.night ? '#84e4ee' : '#cef9fc', x - .08 * cs, y + 1.54, z + .08 * sn, 0, rot || 0, Math.PI / 2);
        addCabinVitrineGlass(new T.CylinderGeometry(.13, .36, .26, 12), view.night ? '#84e4ee' : '#cef9fc', x + .46 * cs, y + 1.54, z - .46 * sn, 0, rot || 0, Math.PI / 2);
        addObstacle(x, z, 1.25);
      }
      function cabinShipInBottle(x, y, z, rot){
        var g0 = curRoot.children.length;
        wornBox(1.10, .10, .64, '#4d3120', x, y + .05, z, 'timber');
        wornBox(.94, .46, .52, '#734a30', x, y + .32, z, 'timber');
        block(1.04, .07, .58, '#dfb254', x, y + .57, z, 0, false);
        [-.26, .26].forEach(function(cx2){ block(.10, .14, .34, '#5a3a25', x + cx2, y + .65, z, 0, 'timber'); });
        block(.56, .05, .20, '#46b5c4', x - .04, y + .76, z, 0, false);
        wornBox(.44, .10, .14, '#7d4b2d', x - .04, y + .82, z, 'timber');
        [-.14, 0, .14].forEach(function(mx, mi){
          add(cyl(.012, .012, mi === 1 ? .26 : .20, 6), '#d9ba84', x - .04 + mx, y + .95, z, 0, 0, 0, 'timber');
          block(.02, mi === 1 ? .17 : .13, .13, '#fff5dc', x - .04 + mx, y + .97, z, 0, 'fabric');
        });
        add(cyl(.082, .074, .14, 10), '#c99b62', x + .58, y + .92, z, 0, 0, Math.PI / 2, 'timber');
        add(cyl(.088, .088, .04, 10), '#c83e3b', x + .54, y + .92, z, 0, 0, Math.PI / 2, false);
        wrapRot(g0, x, y, z, rot || 0, 1);
        var cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
        addCabinVitrineGlass(new T.CylinderGeometry(.24, .24, .78, 12), view.night ? '#84e4ee' : '#cef9fc', x - .02 * cs, y + .92, z + .02 * sn, 0, rot || 0, Math.PI / 2);
        addCabinVitrineGlass(new T.CylinderGeometry(.095, .22, .24, 10), view.night ? '#84e4ee' : '#cef9fc', x + .46 * cs, y + .92, z - .46 * sn, 0, rot || 0, Math.PI / 2);
      }
      function cabinBrassGlobe(x, y, z, rot, scOpt){
        var sc = scOpt || 1, g0 = curRoot.children.length;
        // Turned walnut stand & engraved brass zodiac ring
        add(cyl(.44, .54, .12, 12), '#4e3221', x, y + .06, z, 0, 0, 0, 'timber');
        add(cyl(.34, .36, .04, 12), '#e8be5a', x, y + .13, z, 0, 0, 0, false);
        add(cyl(.12, .16, .66, 10), '#6d472e', x, y + .44, z, 0, 0, 0, 'timber');
        add(smoothTorus(.54, .048, 8, 18), '#ecc05a', x, y + 1.14, z, Math.PI / 2, 0, 0, false);
        for(var a = 0; a < 4; a++){
          var ag = a * Math.PI / 2;
          limb(x, y + .68, z, Math.cos(ag) * .50, .46, Math.sin(ag) * .50, .68, .044, .034, '#6e482f', 'timber');
        }
        // Tilted antique ocean-teal & golden-continent celestial globe inside full circular brass meridian ring
        add(smoothTorus(.47, .038, 8, 18), '#f5d068', x, y + 1.20, z, 0, .35, .28, false);
        smoothOrb(.41, '#44b8c6', x, y + 1.20, z, false);
        add(smoothTorus(.418, .030, 6, 16), '#f0ca6e', x, y + 1.20, z, Math.PI / 2 + .28, 0, 0, false);
        add(smoothTorus(.418, .026, 6, 16), '#f0ca6e', x, y + 1.20, z, .28, .9, 0, false);
        add(cyl(.026, .026, 1.14, 6), '#f5d472', x, y + 1.20, z, 0, 0, .28, false);
        smoothOrb(.088, '#fae084', x - .17, y + 1.74, z, false);
        wrapRot(g0, x, y, z, rot || 0, sc);
      }
      function cabinSextantChartDesk(x, y, z, rot, scOpt){
        var sc = scOpt || 1, g0 = curRoot.children.length;
        wornBox(1.54, .10, .90, '#7a5033', x, y + .74, z, 'timber');
        block(1.58, .055, .94, '#e4b856', x, y + .69, z, 0, false);
        [-.54, .54].forEach(function(dx2){
          wornBox(.40, .68, .78, '#5c3b25', x + dx2, y + .34, z, 'timber');
          [.22, .48].forEach(function(dy2){
            block(.30, .18, .04, '#7d5437', x + dx2, y + dy2, z + .39, 0, 'timber');
            smoothOrb(.032, '#ecc462', x + dx2, y + dy2, z + .43, false);
          });
        });
        block(1.24, .022, .72, '#962b33', x, y + .795, z, 0, 'fabric');
        // Tilted carved oak chart easel displaying a large readable nautical sea chart!
        block(1.06, .76, .06, '#e2b652', x - .08, y + 1.16, z - .16, 0, false);
        block(.94, .64, .07, '#f8edd2', x - .08, y + 1.16, z - .14, 0, 'fabric');
        block(.38, .30, .08, '#46b8c6', x - .24, y + 1.20, z - .13, 0, false);
        block(.26, .20, .08, '#e0b262', x + .12, y + 1.10, z - .13, 0, false);
        block(.78, .04, .08, '#d44842', x - .08, y + 1.06, z - .12, 0, false);
        // Gleaming brass sextant resting cleanly in front of the chart
        var sx = x + .28, sz = z + .14;
        add(smoothTorus(.20, .022, 6, 14), '#f5ce66', sx, y + .85, sz, Math.PI / 2, 0, 0, false);
        limb(sx - .15, y + .85, sz - .11, .15, .02, .24, .28, .020, .016, '#e8bc50', false);
        limb(sx + .15, y + .85, sz - .11, -.15, .02, .24, .28, .020, .016, '#e8bc50', false);
        seatedBrassLantern(x - .58, y + .79, z + .14);
        add(cyl(.058, .058, .48, 8), '#f6ead0', x + .50, y + .84, z - .18, 0, .3, Math.PI / 2, 'fabric');
        add(cyl(.064, .064, .052, 8), '#cc4844', x + .50, y + .84, z - .18, 0, .3, Math.PI / 2, false);
        wrapRot(g0, x, y, z, rot || 0, sc);
      }
      function cabinTreasureChest(x, y, z, rot, scOpt){
        var sc = scOpt || 1, g0 = curRoot.children.length;
        // MAJ-6: Gilded open mahogany treasure chest with sculpted 3D metallic gold coin heap,
        // faceted ruby/sapphire/emerald gems, draped pearl necklace strands & tilted brass chalice (ZERO flat yellow slab or halo blob!)
        wornBox(1.18, .58, .76, '#6e3f24', x, y + .29, z, 'timber');
        // Deep shadowed dark-oak interior chest well (grounds coin stacks naturally with rich depth)
        block(1.04, .12, .62, '#3d2212', x, y + .53, z, 0, 'timber');
        [-.40, 0, .40].forEach(function(bx){ block(.085, .60, .80, '#e5b84c', x + bx, y + .30, z, 0, false); });
        block(1.22, .075, .80, '#dfa942', x, y + .56, z, 0, false);
        block(.18, .20, .08, '#f0c65a', x, y + .42, z + .39, 0, false);
        block(.06, .08, .09, '#3b2416', x, y + .40, z + .40, 0, false); // keyhole recess
        // Propped-open domed mahogany-and-gold chest lid at back with crimson velvet lining
        var lidY = y + .76, lidZ = z - .38;
        add(box(1.16, .20, .64), '#7a4729', x, lidY, lidZ, -.92, 0, 0, 'timber');
        add(box(1.02, .06, .52), '#8c222c', x, lidY - .05, lidZ + .05, -.92, 0, 0, 'fabric');
        add(cyl(.29, .29, 1.14, 10), '#6e3f24', x, lidY + .13, lidZ - .07, 0, 0, Math.PI / 2, 'timber');
        [-.40, .40].forEach(function(bx){ add(box(.085, .26, .66), '#ecc052', x + bx, lidY + .02, lidZ, -.92, 0, 0, false); });
        wrapRot(g0, x, y, z, rot || 0, sc);

        // Build sculpted 3D treasure hoard in chest-local frame -> transformed cleanly into glossy gold/gem/pearl buckets!
        var goldL = new T.Group(), gemL = new T.Group(), pearlL = new T.Group();
        [goldL, gemL, pearlL].forEach(function(gr){ gr.position.set(x, y, z); gr.rotation.y = rot || 0; gr.scale.setScalar(sc); });
        var coinGeo = geos.cabCoin || (geos.cabCoin = own(new T.CylinderGeometry(.082, .082, .026, 10)));
        var smallCoinGeo = geos.cabCoinS || (geos.cabCoinS = own(new T.CylinderGeometry(.066, .066, .022, 10)));
        var gemOctGeo = geos.cabGemOct || (geos.cabGemOct = own(new T.OctahedronGeometry(1, 0)));
        if(!gemOctGeo.attributes.normal) gemOctGeo.computeVertexNormals();
        function addT(parent, geo, col, px, py, pz, rx, ry, rz, sx, sy, sz){
          var o = new T.Mesh(geo, M(col));
          o.position.set(px, py, pz);
          if(rx) o.rotation.x = rx; if(ry) o.rotation.y = ry; if(rz) o.rotation.z = rz;
          if(sx !== undefined) o.scale.set(sx, sy, sz);
          parent.add(o); return o;
        }
        // Subtle dark burnished bronze-gold under-mound deep inside cavity so coin gaps show shadowed gold, never holes
        addT(goldL, ball(.36, 10, 7), '#9e6f1e', -.04, .56, -.02, 0, 0, 0, 1.24, .34, .74);
        // 7 staggered vertical & leaning 3D stacks of metallic gold doubloons rising from the chest!
        var coinShades = ['#f7cc4a', '#e3ad2c', '#ffde68', '#d49a22', '#ffea86'];
        [
          [-.36, -.10, 4, .06, -.08],
          [-.22,  .12, 5, -.05, .06],
          [-.04, -.14, 6, .04, .05],
          [ .02,  .06, 6, -.06, -.04],
          [-.16, -.04, 5, .05, .07],
          [ .20, -.12, 4, -.04, -.06],
          [ .36,  .08, 3, .08, -.05]
        ].forEach(function(st, si){
          for(var ci2 = 0; ci2 < st[2]; ci2++){
            var cy2 = .58 + ci2 * .028;
            addT(goldL, coinGeo, coinShades[(si + ci2) % coinShades.length],
              st[0] + Math.sin(ci2 * 1.7 + si) * .014, cy2, st[1] + Math.cos(ci2 * 1.3 + si) * .014,
              st[3], si * .5 + ci2 * .4, st[4]);
          }
        });
        // 18 individually tumbled metallic gold coins cascading across the mound crest & chest rim!
        [
          [-.42, .63,  .12,  .36, .4,  .28], [-.32, .68,  .02, -.28, .8,  .42],
          [-.26, .74, -.06,  .45, 1.1, -.30], [-.14, .76,  .14, -.35, .2,  .38],
          [-.08, .79, -.02,  .24, 1.5, -.44], [ .08, .77,  .16, -.42, .6, -.25],
          [ .14, .73, -.04,  .38, 2.0,  .34], [ .26, .69,  .14, -.30, 1.2, -.38],
          [ .38, .63, -.06,  .40, .5,  .32], [-.38, .61, -.18, -.26, 1.7,  .40],
          [-.18, .66,  .24,  .52, .3, -.22], [ .04, .68,  .25,  .48, 1.0,  .18],
          [ .22, .65,  .23,  .44, 2.2, -.28], [-.06, .72, -.20, -.42, .9,  .30],
          [ .16, .68, -.20, -.38, 1.4, -.35], [-.44, .60,  .26,  .16, .7,  .12],
          [ .42, .60,  .24,  .12, 1.8, -.16], [-.28, .61,  .32,  .22, .5, -.14]
        ].forEach(function(tc, ti){
          addT(goldL, ti % 3 === 0 ? smallCoinGeo : coinGeo, coinShades[(ti * 2) % coinShades.length],
            tc[0], tc[1], tc[2], tc[3], tc[4], tc[5]);
        });
        // Sculpted tilted brass chalice nestled prominently into the right-center coin pile!
        var chGrp = new T.Group();
        chGrp.position.set(.26, .74, -.02);
        chGrp.rotation.set(.38, .42, -.62);
        addT(chGrp, cyl(.095, .118, .034, 12), '#d8a22c', 0, -.16, 0); // circular foot
        addT(chGrp, cyl(.030, .042, .15, 10), '#e8b83c', 0, -.07, 0);  // slender stem
        addT(chGrp, ball(.052, 8, 6), '#f8d25a', 0, -.06, 0);          // beaded stem knop
        addT(chGrp, cyl(.148, .068, .19, 14), '#f4ca50', 0, .09, 0);   // flared goblet bowl
        addT(chGrp, smoothTorus(.146, .016, 8, 16), '#ffe47c', 0, .185, 0, Math.PI / 2, 0, 0); // rolled rim
        addT(chGrp, cyl(.124, .058, .06, 12), '#7a4d12', 0, .165, 0);  // recessed goblet interior
        goldL.add(chGrp);
        // Faceted Ruby, Emerald, Sapphire & Amethyst gemstones nestled atop the gold coins!
        addT(gemL, gemOctGeo, '#e62244', -.24, .79,  .06, .35, .40, .20, .098, .125, .098); // Ruby
        addT(gemL, gemOctGeo, '#18c474',  .06, .82,  .02, -.25, .85, .30, .095, .120, .095); // Emerald
        addT(gemL, gemOctGeo, '#2678f6', -.08, .80, -.12, .22, 1.30, -.28, .088, .112, .088); // Sapphire
        addT(gemL, gemOctGeo, '#f0305a',  .14, .75,  .18, .42, .20, -.32, .068, .086, .068); // Small Ruby
        addT(gemL, gemOctGeo, '#a454f2', -.34, .71, -.12, -.30, .60, .25, .072, .092, .072); // Amethyst
        // Two draped glossy ivory pearl necklace strands spilling gracefully over the front chest rim!
        var strand1 = [
          [-.38, .66, .24], [-.32, .65, .31], [-.25, .63, .37], [-.18, .59, .41],
          [-.10, .53, .42], [-.02, .49, .42], [ .06, .51, .42], [ .14, .56, .41],
          [ .21, .61, .37], [ .26, .64, .30]
        ];
        strand1.forEach(function(pt, pi){
          addT(pearlL, ball(.042, 8, 6), pi % 2 ? '#fffcf2' : '#f4ead6', pt[0], pt[1], pt[2]);
        });
        var strand2 = [
          [-.44, .63, .14], [-.44, .61, .24], [-.42, .57, .35],
          [-.39, .50, .41], [-.35, .43, .41], [-.30, .38, .41], [-.24, .36, .41]
        ];
        strand2.forEach(function(pt, pi){
          addT(pearlL, ball(.038, 8, 6), pi % 2 ? '#f8efe0' : '#fffdf5', pt[0], pt[1], pt[2]);
        });
        cabinGoldGroup.add(goldL);
        cabinGemGroup.add(gemL);
        cabinPearlGroup.add(pearlL);
      }
      function cabinOceanTelescope(x, y, z, aimYaw, scOpt){
        var sc = scOpt || 1, g0 = curRoot.children.length;
        // Polished walnut & brass observatory tripod
        for(var lg = 0; lg < 3; lg++){
          var la = lg * Math.PI * 2 / 3 + .25;
          var fx = x + Math.cos(la) * .42, fz = z + Math.sin(la) * .42;
          add(cyl(.048, .058, .10, 8), '#e6ba56', fx, y + .05, fz, 0, 0, 0, false);
          limb(fx, y + .04, fz, -Math.cos(la) * .40, 1.44, -Math.sin(la) * .40, 1.52, .044, .030, '#5e3c25', 'timber');
        }
        add(smoothTorus(.22, .026, 6, 12), '#e4b856', x, y + .64, z, Math.PI / 2, 0, 0, false);
        add(cyl(.11, .13, .22, 10), '#ecc25c', x, y + 1.48, z, 0, 0, 0, false);
        // Stepped gleaming brass telescope barrel aimed cleanly outward along +X (rotated by aimYaw)
        var t1 = limb(x - .48, y + 1.44, z, .95, .31, 0, .60, .058, .078, '#dfa844', false);
        var t2 = limb(t1[0], t1[1], t1[2], .95, .31, 0, .64, .084, .108, '#f8d66e', false);
        var t3 = limb(t2[0], t2[1], t2[2], .95, .31, 0, .28, .112, .132, '#e6b850', false);
        smoothOrb(.112, '#9cf0ff', t3[0], t3[1], t3[2], false);
        limb(x - .26, y + 1.66, z, .95, .31, 0, .56, .024, .030, '#f4cc62', false);
        smoothOrb(.054, '#cc9a3a', x - .50, y + 1.43, z, false);
        wrapRot(g0, x, y, z, aimYaw || 0, sc);
      }
      // Cohesive Great Cabin curiosity & treasure salons (zero prop-to-prop clipping!)
      function vignetteGreatCabinCurioSalon(x, z, rot){
        var y = -.12;
        contact(x, z, 2.05, 1.45, -.107);
        cabinSextantChartDesk(x - .36, y, z - .18, rot || 0, 1.08);
        cabinBrassGlobe(x + .98, y, z - .26, (rot || 0) + .35, 1.15);
        cabinCurioCase(x + .90, y, z + .72, rot || 0, 0, 1.12);
        cabinTreasureChest(x - .64, y, z + .82, (rot || 0) + .22, 1.10);
        addObstacle(x, z, 1.68);
      }
      function vignetteGreatCabinObservatory(x, z, rot, aimYaw){
        var y = -.12;
        contact(x, z, 1.85, 1.38, -.107);
        cabinOceanTelescope(x + .42, y, z - .14, aimYaw != null ? aimYaw : 0, 1.18);
        cabinShipInBottle(x - .72, y, z + .16, (rot || 0) + .18);
        cabinCurioCase(x + .58, y, z + .74, rot || 0, 1, 1.12);
        addObstacle(x, z, 1.52);
      }
      function vignetteGreatCabinTreasureVault(x, z, rot){
        var y = -.12;
        contact(x, z, 1.86, 1.38, -.107);
        cabinTreasureChest(x - .52, y, z - .16, (rot || 0) - .15, 1.15);
        cabinShipInBottle(x + .68, y, z - .24, (rot || 0) + .10);
        cabinCurioCase(x - .48, y, z + .74, rot || 0, 2, 1.12);
        cabinBrassGlobe(x + .68, y, z + .68, rot || 0, 1.15);
        addObstacle(x, z, 1.56);
      }

      // Build the Captain's Great Cabin perimeter, carpets, AND full coffered oak ceiling!
      buildGreatCabinArchitecture();

      // HERO FOREGROUND/MIDGROUND CAPTAIN BAY TREASURE & CURIOSITY SHOWPIECES!
      // Placed FIRST using exact realCamNDCAt(3, ...) and realCamNDCAt(0, ...) so they stand out unmistakably
      // in 06-captains-deck.png without blocking any camera sightline or crowding Captain Bay, Bok, Stall, Shelly or Kiko!
      (function placeGreatCabinHeroShowpieces(){
        var baySpotX = -4.30, baySpotZ = -11.46; // Captain Bay's live starboard spot in cam@3
        // MIN-7: Enforce >= 2.8u 3D clearance AND 2D hero-camera sightline clearance around BOTH live Bok (-14.49, -4.57)
        // and Naval Stores stall (-13.54, -6.87) so Bok NEVER intersects or disappears behind a vitrine roof!
        var capGuardCast = [
          { x: -14.49, z: -4.57, r3d: 3.15, rayW: 2.65, ndcX: 0.22 }, // Live Bok (shopkeeper)
          { x: -13.54, z: -6.87, r3d: 3.05, rayW: 2.15, ndcX: 0.16 }, // Live Naval Stores stall
          { x: -13.54, z: -3.15, r3d: 3.00, rayW: 2.00, ndcX: 0.15 }, // Alternate Bok anchor
          { x: -10.32, z: -5.80, r3d: 2.95, rayW: 1.80, ndcX: 0.14 }  // Alternate Stall anchor
        ];
        var heroCam = Math.min(3, main.length - 1);
        var capHeroRig = realCamSetupAt(heroCam);
        function clearOfBokSightline(gx, gz){
          for(var ci = 0; ci < capGuardCast.length; ci++){
            var a = capGuardCast[ci];
            if(Math.hypot(gx - a.x, gz - a.z) < a.r3d) return false;
            // Check 2D ray from heroCam (cam@3) to Bok/Stall so NO vitrine sits in front of Bok!
            var cPos = capHeroRig.cam.position;
            var vx = a.x - cPos.x, vz = a.z - cPos.z, len2 = vx * vx + vz * vz;
            if(len2 > 0.25){
              var t = ((gx - cPos.x) * vx + (gz - cPos.z) * vz) / len2;
              if(t > 0.04 && t < 1.15){
                var perp = Math.hypot(gx - (cPos.x + vx * t), gz - (cPos.z + vz * t));
                if(perp < a.rayW) return false;
              }
            }
            var dCast = Math.hypot(a.x - cPos.x, a.z - cPos.z), dProp = Math.hypot(gx - cPos.x, gz - cPos.z);
            if(dProp < dCast + 1.5){
              var ndA = realCamNDCAt(heroCam, a.x, 0.9, a.z);
              var ndP = realCamNDCAt(heroCam, gx, 1.5, gz);
              if(ndA.z > -1 && ndA.z < 1 && ndP.z > -1 && ndP.z < 1 && Math.abs(ndP.x - ndA.x) < a.ndcX && ndP.y <= ndA.y + 0.24 && ndP.y >= ndA.y - 0.52) return false;
            }
          }
          return true;
        }
        function heroSpotOk(gx, gz, minTile, minBay, minEdge){
          if(!outerClear(gx, gz, minTile || 2.85) || !insideShipDeck(gx, gz, minEdge || 1.35)) return false;
          if(Math.hypot(gx - baySpotX, gz - baySpotZ) < (minBay || 3.45)) return false;
          if(!clearOfBokSightline(gx, gz)) return false;
          if(inCaptainHeroEdgeCrop(gx, gz)) return false;
          if(vigPlaced.some(function(p){ return Math.hypot(p[0] - gx, p[1] - gz) < 3.05; })) return false;
          return true;
        }
        function findHeroSpot(camIdx, tx, ty, minTile, minBay, minEdge){
          var best = null;
          for(var gx = sb.minX + 3.4; gx <= sb.maxX - 1.8; gx += .45){
            for(var gz = sb.minZ + 1.25; gz <= sb.maxZ - 1.25; gz += .45){
              if(!heroSpotOk(gx, gz, minTile, minBay, minEdge)) continue;
              var nd = realCamNDCAt(camIdx, gx, .45, gz);
              if(nd.z > 1 || nd.x < -.82 || nd.x > .82 || nd.y < -.72 || nd.y > .64) continue;
              var sc = Math.hypot(nd.x - tx, nd.y - ty);
              if(!best || sc < best.sc) best = { x: gx, z: gz, sc: sc };
            }
          }
          return (best && best.sc < .46) ? best : null;
        }
        var cabinShopTile = sp.find(function(s){ return s.kind === 'shop'; });
        // 1. Foreground-Left Hero: Grand 4-Sided Translucent Glass Curio Vitrine with Gleaming Golden Ship-in-a-Bottle
        //    placed strictly clear of Bok's sightline (wide open oak planks around Bok!)
        var h1 = findHeroSpot(heroCam, -.78, -.46, 2.95, 3.6, 1.5);
        if(h1){
          vigPlaced.push([h1.x, h1.z]);
          var yaw1 = Math.atan2(realCamSetupAt(heroCam).cam.position.x - h1.x, realCamSetupAt(heroCam).cam.position.z - h1.z);
          heroCabinCurioVitrineWithShip(h1.x, -.12, h1.z, yaw1);
        }
        // 2. Upper-Mid-Left Hero: Tall Brass Celestial Globe on Carved Oak Stand + Framed Sea Chart Desk!
        var h2 = findHeroSpot(heroCam, -.48, .20, 2.85, 3.6, 1.5);
        if(h2){
          vigPlaced.push([h2.x, h2.z]);
          var yaw2 = Math.atan2(realCamSetupAt(heroCam).cam.position.x - h2.x, realCamSetupAt(heroCam).cam.position.z - h2.z);
          contact(h2.x, h2.z, 1.55, 1.10, -.107);
          var gx2 = h2.x + .55, gz2 = h2.z - .18;
          if(!cabinShopTile || Math.hypot(gx2 - cabinShopTile.x, gz2 - cabinShopTile.z) >= 8.2){
            cabinBrassGlobe(gx2, -.12, gz2, yaw2, 1.38);
          }
          cabinSextantChartDesk(h2.x - .72, -.12, h2.z + .22, yaw2 - .25, 1.18);
          addObstacle(h2.x, h2.z, 1.55);
        }
        // 3. Mid-Right Ocean Window Hero: Tall Brass Telescope aimed STRAIGHT OUT the panoramic ocean gallery window + Overflowing Gilded Treasure Chest!
        var h3 = findHeroSpot(heroCam, .24, .18, 2.85, 3.55, 1.15);
        if(h3){
          vigPlaced.push([h3.x, h3.z]);
          contact(h3.x, h3.z, 1.50, 1.12, -.107);
          // Starboard window lies along -Z (sb.minZ = -15.2): aimYaw = +Math.PI/2 aims +X barrel directly toward -Z ocean window!
          cabinOceanTelescope(h3.x + .35, -.12, h3.z - .28, Math.PI * .52, 1.32);
          cabinTreasureChest(h3.x - .75, -.12, h3.z + .34, Math.PI * .18, 1.24);
          addObstacle(h3.x, h3.z, 1.48);
        }
        // 4. Foreground-Right Hero beside Captain Bay: Overflowing Gilded Treasure Chest + Tall Brass Celestial Globe!
        var h4 = findHeroSpot(heroCam, .66, -.44, 2.95, 3.45, 1.20);
        if(h4){
          vigPlaced.push([h4.x, h4.z]);
          var yaw4 = Math.atan2(realCamSetupAt(heroCam).cam.position.x - h4.x, realCamSetupAt(heroCam).cam.position.z - h4.z);
          contact(h4.x, h4.z, 1.50, 1.12, -.107);
          cabinTreasureChest(h4.x - .42, -.12, h4.z + .16, yaw4 - .15, 1.28);
          var gx4 = h4.x + .78, gz4 = h4.z - .34;
          if(!cabinShopTile || Math.hypot(gx4 - cabinShopTile.x, gz4 - cabinShopTile.z) >= 8.2){
            cabinBrassGlobe(gx4, -.12, gz4, yaw4 + .2, 1.30);
          }
          addObstacle(h4.x, h4.z, 1.45);
        }
        // 5. Opening cam@0 Showcase: Curio Vitrine + Ship-in-a-Bottle + Overflowing Chest + Telescope for initial entry too!
        var h0L = findHeroSpot(0, -.52, .05, 2.95, 3.6, 1.5);
        if(h0L){
          vigPlaced.push([h0L.x, h0L.z]);
          var yaw0L = Math.atan2(realCamSetupAt(0).cam.position.x - h0L.x, realCamSetupAt(0).cam.position.z - h0L.z);
          heroCabinCurioVitrineWithShip(h0L.x, -.12, h0L.z, yaw0L);
        }
      })();

      if(canSpace) placeDeckVignettesForCam(canSpace.i, true);
      if(capFirstDeck) placeDeckVignettesForCam(capFirstDeck.i, false);
      if(activeIdx!==0 && activeIdx!==(canSpace?canSpace.i:-1) && activeIdx!==(capFirstDeck?capFirstDeck.i:-1)){
        placeDeckVignettesForCam(activeIdx, !!(main[activeIdx] && main[activeIdx].z>cz+1.5));
      }

      // Place additional Great Cabin Curiosity Salons & Ocean Telescopes across the wider cabin floor!
      function placeGreatCabinSalons(){
        var salonTargets = [];
        if(canSpace){
          salonTargets.push(
            { cam: canSpace.i, kind: 'curioSalon',    tx: -.32, ty: .36, rot: .08,  minTile: 2.95, sep: 4.0 },
            { cam: canSpace.i, kind: 'observatory',   tx: .58,  ty: .52, rot: -.06, aimYaw: -Math.PI * .45, minTile: 2.85, sep: 3.8 },
            { cam: canSpace.i, kind: 'treasureVault', tx: -.66, ty: .24, rot: .12,  minTile: 2.95, sep: 4.0 }
          );
        }
        if(capFirstDeck){
          salonTargets.push(
            { cam: capFirstDeck.i, kind: 'observatory',   tx: .44,  ty: .34, rot: .05, aimYaw: Math.PI * .52, minTile: 2.95, sep: 4.0 },
            { cam: capFirstDeck.i, kind: 'curioSalon',    tx: -.28, ty: .22, rot: Math.PI, minTile: 2.95, sep: 4.0 }
          );
        }
        salonTargets.forEach(function(st){
          var best = null;
          for(var gx = sb.minX + 3.4; gx <= sb.maxX - 2.2; gx += .50){
            for(var gz = sb.minZ + 1.8; gz <= sb.maxZ - 1.8; gz += .50){
              if(!outerClear(gx, gz, st.minTile) || !insideShipDeck(gx, gz, 1.65)) continue;
              if(!clearOfBayCorridor(gx, gz) || !clearOfDeckLandmarks(gx, gz) || inCaptainHeroEdgeCrop(gx, gz)) continue;
              if(st.cam === (canSpace ? canSpace.i : -1) && inDeckProtectedScreenZone(st.cam, gx, gz, 1.45)) continue;
              if(vigPlaced.some(function(p){ return Math.hypot(p[0] - gx, p[1] - gz) < st.sep; })) continue;
              var nd = camNDCAt(st.cam, gx, .25, gz);
              if(nd.x < -.86 || nd.x > .86 || nd.y < -.78 || nd.y > .82 || nd.z > 1) continue;
              var sc = Math.hypot(nd.x - st.tx, nd.y - st.ty);
              if(!best || sc < best.sc) best = { x: gx, z: gz, sc: sc };
            }
          }
          if(best && best.sc < .62){
            vigPlaced.push([best.x, best.z]);
            if(st.kind === 'curioSalon') vignetteGreatCabinCurioSalon(best.x, best.z, st.rot);
            else if(st.kind === 'observatory') vignetteGreatCabinObservatory(best.x, best.z, st.rot, st.aimYaw);
            else vignetteGreatCabinTreasureVault(best.x, best.z, st.rot);
          }
        });
      }
      placeGreatCabinSalons();

      // Crisp far-stern ship-bell & cargo stations so the distant stern quarters feel purposeful
      [[cx-14.5,cz+4.2,'bellStand',0],[cx-14.5,cz-4.2,'cargo',0]].forEach(function(sp2,si){
        placeVignette(sp2[0],sp2[1],sp2[2],sp2[3]!=null?sp2[3]:si*.5,4.2,true);
      });
      // iter21 Minor #3 + iter24 M1 + iter25 Minor #8: Keep right-side anchor station & distant bow framing while preserving wide left-half open walkways!
      if(canSpace && bayAnchor){
        var fillSpecs=[
          // Zone 3 (765-855, 400-470): Crafted Ship's Iron-and-Oak Anchor on Timber Chocks + Coiled Chain + Brass Deck Bollard (cleanly clear of Hatch & Cannon!)
          {kind:'deckAnchor',     tx:.64,  ty:-.28, rot:0,   minTile:4.00, sep:2.65, bayDist:3.30, encGuard:true},
          // Upper-Left Bow Pocket A1 (130-300, 40-130 near port railing): Stowed wooden skiff/dinghy + water cask + brass lantern
          {kind:'bowSkiffPallet',        tx:-.57, ty:.845, rot:.05, minTile:3.30, sep:3.50, bayDist:6.00, encGuard:false, maxNdY:.88, padEdge:1.15},
          // Upper-Left Bow Pocket A2 (245-315, 105-150 inboard right of title card): Canvas-draped cargo pallet + water cask + brass lantern
          {kind:'canvasCargoPallet',     tx:-.43, ty:.58, rot:-.04, minTile:3.50, sep:4.20, bayDist:6.00, encGuard:false}
        ];
        fillSpecs.forEach(function(fs){
          var best=null;
          var minXNd=fs.minNdX!=null?fs.minNdX:-.82;
          var maxYNd=fs.maxNdY!=null?fs.maxNdY:.76;
          var padEdge=fs.padEdge!=null?fs.padEdge:1.35;
          for(var gx=sb.minX+3.2;gx<=sb.maxX-1.5;gx+=.25) for(var gz=sb.minZ+1.25;gz<=sb.maxZ-1.25;gz+=.25){
            if(!outerClear(gx,gz,fs.minTile) || !insideShipDeck(gx,gz,padEdge)) continue;
            if(fs.minComp!=null){
              if(Math.hypot(gx-compassX,gz-compassZ)<fs.minComp) continue;
              if(Math.hypot(gx-mainMastX,gz-cz)<2.85) continue;
              if(canSpace && Math.hypot(gx-canSpace.x,gz-(canSpace.z-2.3))<2.65) continue;
            }else if(!clearOfDeckLandmarks(gx,gz)) continue;
            // Strictly clear of Captain Bay's standing spot & sightline corridor + protected (320-430, 505-595) screen zone
            if(!clearOfBayCorridor(gx,gz) || inDeckProtectedScreenZone(canSpace.i,gx,gz,1.35)) continue;
            if(Math.hypot(gx-bayAnchor.x,gz-(bayAnchor.z+4.20))<fs.bayDist) continue;
            // Keep Zone 3 strictly outside Captain Bay's +Z encounter camera horizontal frustum (x <= bayAnchor.x - 2.75)
            if(fs.encGuard && gx>bayAnchor.x-2.75) continue;
            if(vigPlaced.some(function(p){ return Math.hypot(p[0]-gx,p[1]-gz)<fs.sep; })) continue;
            var nd=camNDCAt(canSpace.i,gx,.15,gz);
            if(nd.x<minXNd || nd.x>.86 || nd.y<-.82 || nd.y>maxYNd || nd.z>1) continue;
            var sc=Math.hypot(nd.x-fs.tx,nd.y-fs.ty);
            if(!best || sc<best.sc) best={x:gx,z:gz,sc:sc};
          }
          if(best && best.sc<.36){
            vigPlaced.push([best.x,best.z]);
            if(fs.kind==='midLeftBellMap') vignetteMidLeftBellMapChest(best.x,best.z,fs.rot);
            else if(fs.kind==='deckAnchor') vignetteDeckAnchorBollard(best.x,best.z,fs.rot);
            else if(fs.kind==='portLashedBarrels') vignettePortLashedBarrelsCleat(best.x,best.z,fs.rot);
            else if(fs.kind==='midLeftSailCargo') vignetteMidLeftSailCargoNet(best.x,best.z,fs.rot);
            else if(fs.kind==='upperLeftChestBarrels') vignetteUpperLeftChestBarrels(best.x,best.z,fs.rot);
            else if(fs.kind==='bowSkiffPallet') vignetteBowSkiffAndPallet(best.x,best.z,fs.rot);
            else if(fs.kind==='canvasCargoPallet') vignetteCanvasCargoPallet(best.x,best.z,fs.rot);
            else if(fs.kind==='lowerLeftCleatChest') vignetteLowerLeftCleatChest(best.x,best.z,fs.rot);
          }
        });
      }
      // Continuous flush inner waterway beams tight against the port & starboard bulwark ribs
      var wwX1=sb.minX+3.0, wwX2=sb.maxX-6.7, wwLen=Math.max(2,wwX2-wwX1), wwMid=(wwX1+wwX2)/2;
      [-1,1].forEach(function(sd){
        var wwZ=sd<0?sb.minZ+.28:sb.maxZ-.28;
        block(wwLen,.08,.24,'#6e4d35',wwMid,-.09,wwZ,0,'timber');
      });
      // Inlaid nautical compass rose seated cleanly & unclipped on the open lower-left deck planks
      if(outerClear(compassX,compassZ,3.0) && insideShipDeck(compassX,compassZ,1.7)){
        add(cyl(1.32,1.38,.08,20),'#6b4a33',compassX,-.08,compassZ,0,0,0,'timber');
        add(smoothTorus(1.15,.048,8,24),'#d6a34b',compassX,-.03,compassZ,Math.PI/2,0,0,false);
        add(cyl(1.08,1.08,.05,20),'#dfc99b',compassX,-.06,compassZ,0,0,0,'timber');
        block(1.75,.04,.16,'#b84e48',compassX,-.025,compassZ,0,false);
        block(.16,.04,1.75,'#385a6e',compassX,-.025,compassZ,0,false);
        block(1.25,.035,.12,'#385a6e',compassX,-.028,compassZ,Math.PI/4,false);
        block(.12,.035,1.25,'#b84e48',compassX,-.028,compassZ,Math.PI/4,false);
        smoothOrb(.14,'#e3ba58',compassX,-.01,compassZ,false);
      }
      // True upright centerline Great Cabin mast pillar stepped through the cabin floor into a gilded ceiling collar!
      if(outerClear(mainMastX,cz,2.8) && insideShipDeck(mainMastX,cz,1.4)){
        post(.28,8.35,'#6a4932',mainMastX,-.12,cz);
        mastBaseCollar(mainMastX,-.12,cz,.28);
        addObstacle(mainMastX,cz,1.25);
        // Brass decorative banding rings & carved ceiling capital meeting the coffered oak vault cleanly
        [2.2, 4.4, 6.6].forEach(function(ry){
          add(smoothTorus(.31,.034,6,14),'#e6bc58',mainMastX,ry,cz,Math.PI/2,0,0,false);
        });
        add(cyl(.64,.36,.42,10),'#563722',mainMastX,7.95,cz,0,0,0,'timber');
        add(smoothTorus(.58,.055,6,14),'#ecc25c',mainMastX,7.74,cz,Math.PI/2,0,0,false);
      }
      // Vessel exterior bowsprit & gilded figurehead outside the bow panoramic ocean window
      var bowX=sb.maxX;
      var bowsprit=add(cyl(.09,.19,6.4,8),'#7a583f',bowX+1.4,1.25,cz,0,0,-1.28,'timber');
      bowsprit.userData.reefStructure='ship-bowsprit';
      block(.07,.22,.78,'#49a6b5',bowX+3.9,2.15,cz+.35,0,'fabric');
      add(cyl(.2,.32,.95,8),'#e6ba58',bowX+.25,.28,cz,0,0,-.65,false);
      orb(.24,'#f7d97e',bowX+.68,.62,cz,false);
      block(.12,.45,.65,'#e6ba58',bowX+.3,.42,cz,0,false);
      var stayG0 = curRoot.children.length;
      // Aft stern cabin fascia with glowing round portholes, brass lanterns, wheelhouse & Great Cabin stern curios
      var sternX=sb.minX+.35, sternW=Math.max(4,sb.maxZ-sb.minZ-6.8);
      block(.32,.85,sternW,'#6d4c37',sternX,.85,cz,0,'timber');
      block(.4,.16,sternW+.3,'#dec49a',sternX,1.34,cz,0,'timber');
      for(var wi=-1;wi<=1;wi++){
        var pz=cz+wi*(sternW*.26);
        add(cyl(.28,.28,.12,12),'#d6a34b',sternX-.14,.88,pz,0,0,Math.PI/2,false);
        add(cyl(.21,.21,.15,12),'#ffe496',sternX-.15,.88,pz,0,0,Math.PI/2,false);
      }
      [-1,1].forEach(function(sd){
        var lz=cz+sd*(sternW*.44);
        post(.06,.55,'#4a3a30',sternX+.1,1.35,lz);
        orb(.18,'#ffdf88',sternX+.1,1.98,lz,false);
        add(cone(.24,.22,6),'#d6a34b',sternX+.1,2.18,lz,0,0,0,false);
      });
      var helmX=sb.minX+1.65;
      block(.12,.14,sternW*.72,'#dec49a',helmX+.55,1.18,cz,0,'timber');
      [-1,0,1].forEach(function(sd){ post(.06,.75,'#79583f',helmX+.55,.43,cz+sd*(sternW*.3)); });
      post(.09,.82,'#6e5139',helmX,.43,cz);
      add(torus(.36,.045),'#a6774c',helmX-.18,1.18,cz,0,Math.PI/2,0,'timber');
      add(cyl(.025,.025,.72,6),'#d6a34b',helmX-.18,1.18,cz,Math.PI/2,0,0,false);
      add(cyl(.025,.025,.72,6),'#d6a34b',helmX-.18,1.18,cz,0,0,0,false);
      add(cyl(.11,.15,.68,8),'#d6a34b',helmX+.35,.76,cz+.65,0,0,0,false);
      orb(.14,'#a8f5ee',helmX+.35,1.14,cz+.65,false);
      // Raised stern gallery curios & brass telescope aimed aft out the panoramic stern ocean windows!
      cabinOceanTelescope(helmX + .05, .43, cz - 3.2, Math.PI, 1.15);
      cabinShipInBottle(helmX + .10, .43, cz + 3.2, Math.PI / 2);
      cabinCurioCase(helmX + .15, .43, cz - 6.2, 0, 0, 1.15);
      cabinTreasureChest(helmX + .15, .43, cz + 6.2, -Math.PI / 2, 1.15);
      compactRootRange(stayG0, cx, 0, cz, 0);
      // Compact all translucent Great Cabin ocean gallery panes, vitrines, ship-in-bottles & gimbal lantern glows!
      if(cabinExtras.children.length){
        compactGroupInPlace(cabinExtras, true);
        extras.add(cabinExtras);
      }
      // Compact glossy metallic gold coins/chalices, faceted gems, draped pearls & crystal-clear vitrine glass (4 draw calls total!)
      compactPhongGroup(cabinGoldGroup, cabinGoldMat, 'captain-treasure-gold');
      compactPhongGroup(cabinGemGroup, cabinGemMat, 'captain-treasure-gems');
      compactPhongGroup(cabinPearlGroup, cabinPearlMat, 'captain-treasure-pearls');
      compactPhongGroup(cabinVitrineGlassGrp, cabinVitrineMat, 'captain-vitrine-glass');
      extras.children.forEach(function(ch){
        if(ch && ch.name === 'captain-vitrine-glass'){ ch.renderOrder = 3; ch.receiveShadow = false; }
      });
      // Compact & attach the enclosed Great Cabin vaulted coffered oak ceiling directly to view.scene
      // (tagged userData.hideOnZoom = true so gameplay is 100% enclosed indoors while overhead Map zoom opens cleanly!)
      if(cabinCeilingGrp.children.length){
        compactGroupInPlace(cabinCeilingGrp, true, null);
        cabinCeilingGrp.traverse(function(o){ if(o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });
        cabinCeilingGrp.userData.hideOnZoom = true;
        view.scene.add(cabinCeilingGrp);
        view._cabinCeiling = cabinCeilingGrp;
      }
      // m8: Sunlit coral islet + channel buoy + coastal sailboat right inside the visible upper-right ocean window!
      var shipWaterPlaced=[];
      function shipWaterClear(x,z,pad,outerPad,sep){
        if(ptInShipPoly(x,z) || distToShipPoly(x,z)<(pad||2.4) || !outerClear(x,z,outerPad||3.2)) return false;
        for(var wi=0;wi<shipWaterPlaced.length;wi++){
          if(Math.hypot(x-shipWaterPlaced[wi][0],z-shipWaterPlaced[wi][1])<(sep||3.2)) return false;
        }
        return true;
      }
      // MIN 5: Sculpted coral-and-sand reef islet (low buoy-safe rock shoal near hull; tall palm islands belong out on open sea!)
      function drawHeroCoralIslet(ix,iz,seed){
        smoothFoamRing(ix,waterY+.064,iz,2.58,2.30);
        surfWaveHalo(ix,waterY+.056,iz,2.50,2.22,seed||3);
        smoothSandbar(ix,-1.12,iz,2.25,.82,2.0,'#ebd29c');
        // Low sculpted coral rock & pastel reef cluster (NO bare palm poking behind the deck rail without a visible island!)
        var rk=add(facetedCliffGeo((seed||3)%4),'#9b8e78',ix-.22,-.92,iz+.12,0,(seed||3)*1.1,0,'stone');
        rk.scale.set(1.05,.72,.92);
        coral(ix+.82,-.62,iz-.48,.48,'#ef8b82');
        coral(ix-.55,-.58,iz+.35,.44,'#6ecfc4');
        smoothOrb(.22,'#70d6cb',ix+.55,-.56,iz+.65,false);
        pebble(ix-.78,-.56,iz-.52,.28,'#e8caa0');
      }
      // MIN 5: Sculpted open-ocean sandy coral islands positioned 16..24u past the ship rail so the ENTIRE
      // golden sandbar beach, rocky limestone knoll, white surf foam ring, AND curved palm trees read clearly above the rail!
      function drawHorizonPalmCoralIslet(ix,iz,seed,scale){
        var k=scale||1, s=Math.abs(Math.floor(seed||0));
        smoothFoamRing(ix,waterY+.064,iz,5.8*k,4.9*k);
        surfWaveHalo(ix,waterY+.056,iz,6.5*k,5.5*k,s+1);
        // Broad sunlit golden sandbar rising clearly above waterY and above the far ship rail line
        smoothSandbar(ix,waterY-.06,iz,4.9*k,1.72*k,4.2*k,'#efd69e');
        smoothSandbar(ix+.45*k,waterY+.62*k,iz-.35*k,3.2*k,1.08*k,2.8*k,'#f5e1b2');
        // Sculpted coastal limestone headland & mossy emerald dune cap grounding the palms solidly
        var knoll=add(facetedCliffGeo(s%4),'#a8987c',ix-.85*k,waterY+.18,iz+.35*k,0,s*.9,0,'stone');
        knoll.scale.set(2.25*k,1.95*k,1.95*k);
        var turf1=smoothOrb(1.65*k,'#5ab468',ix-.72*k,waterY+1.75*k,iz+.28*k,false); turf1.scale.set(1.25,.42,1.12);
        var turf2=smoothOrb(1.18*k,'#73c878',ix+.55*k,waterY+1.45*k,iz-.30*k,false); turf2.scale.set(1.18,.40,1.08);
        // Two curved tropical palm trees planted firmly inside the visible golden sandy island mound
        palmTree(ix-.48*k,waterY+1.65*k,iz+.12*k,s+1,1.02*k);
        palmTree(ix+1.15*k,waterY+1.38*k,iz-.42*k,s+4,0.78*k);
        // Vibrant coral & coastal boulder accents along the sunny sandy beach rim
        coral(ix+2.15*k,waterY+0.88*k,iz+.78*k,0.85*k,'#ef877e');
        coral(ix-2.05*k,waterY+0.82*k,iz-.72*k,0.75*k,'#6ed4c8');
        pebble(ix+1.45*k,waterY+0.96*k,iz+1.25*k,0.52*k,'#d9c49d');
      }
      // Guarantee a sunlit palm-topped coral islet + red-and-white channel buoy + coastal sailboat visibly inside the upper-right ocean window (verified with camNDC!)
      function placeUpperRightTrio(camIdx){
        var cands=[];
        for(var wx=sb.minX-14;wx<=sb.maxX+18;wx+=1.0) for(var wz=sb.minZ-18;wz<=sb.maxZ+18;wz+=1.0){
          if(!shipWaterClear(wx,wz,2.3,3.0,2.8)) continue;
          var nd=camNDCAt(camIdx,wx,-.95,wz);
          if(nd.x<.52 || nd.x>.95 || nd.y<.12 || nd.y>.86 || nd.z>1) continue;
          cands.push({x:wx,z:wz,nd:nd});
        }
        var trioSpecs=[
          {kind:'islet', tx:.78, ty:.66, maxX:.87, maxY:.74, rad:1.8, h:2.8, bot:-1.1},
          {kind:'boat',  tx:.68, ty:.78, maxX:.90, maxY:.84, rad:1.5, h:2.6, bot:-1.04},
          {kind:'buoy',  tx:.88, ty:.48, maxX:.93, maxY:.72, rad:.8,  h:1.4, bot:-1.0}
        ];
        var pickedNdc=[];
        trioSpecs.forEach(function(sp3,si){
          var best=null;
          cands.forEach(function(c){
            if(c.nd.x>sp3.maxX || c.nd.y>sp3.maxY) return;
            if(!shipWaterClear(c.x,c.z,sp3.kind==='islet'?2.3:2.0,2.8,2.9)) return;
            if(!camInFrame(c.x,c.z,sp3.rad,sp3.h,sp3.bot,-.95,.95,-.94,.92,camIdx)) return;
            if(pickedNdc.some(function(h){ return Math.hypot(h[0]-c.nd.x,(h[1]-c.nd.y)*.85)<.11; })) return;
            var sc=Math.hypot(c.nd.x-sp3.tx,c.nd.y-sp3.ty);
            if(!best || sc<best.sc) best={c:c,sc:sc};
          });
          if(!best){
            // Relax screen-edge framing slightly so all 3 still appear visibly in the ocean window
            cands.forEach(function(c){
              if(c.nd.x>sp3.maxX+.06 || c.nd.y>sp3.maxY+.10) return;
              if(!shipWaterClear(c.x,c.z,2.0,2.5,2.6)) return;
              if(pickedNdc.some(function(h){ return Math.hypot(h[0]-c.nd.x,(h[1]-c.nd.y)*.85)<.08; })) return;
              var sc=Math.hypot(c.nd.x-sp3.tx,c.nd.y-sp3.ty);
              if(!best || sc<best.sc) best={c:c,sc:sc};
            });
          }
          if(!best) return;
          var ix=best.c.x, iz=best.c.z;
          shipWaterPlaced.push([ix,iz]);
          pickedNdc.push([best.c.nd.x,best.c.nd.y]);
          if(sp3.kind==='islet'){
            drawHeroCoralIslet(ix,iz,3+camIdx);
          }else if(sp3.kind==='buoy'){
            buoy(ix,iz,'#d85652',-1.01);
          }else{
            var cr2=camSetupAt(camIdx), boatRot=Math.atan2(cr2.fx,cr2.fz)-.55;
            sailboat(ix,iz,boatRot,'#487e89','#fff1cf',.88,-1.04);
          }
        });
      }
      placeUpperRightTrio(activeIdx);
      if(canSpace && canSpace.i!==activeIdx) placeUpperRightTrio(canSpace.i);
      if(activeIdx!==0) placeUpperRightTrio(0);
      var shipPerimeter=[
        [cx-5.8,sb.minZ-3.6,1],
        [sb.minX-4.2,cz-4.4,1],[sb.minX-4.4,cz+4.4,1],[sb.maxX+3.8,cz-4.2,1],[sb.maxX+4.0,cz+4.2,1],
        [cx-8.4,sb.minZ-2.8,2],[cx+8.2,sb.minZ-2.9,2],[cx-8.0,sb.maxZ+2.9,2],[cx+8.0,sb.maxZ+3.0,2],
        [sb.maxX+3.1,cz,2],[sb.minX-3.4,cz,2],
        [cx-1.8,sb.minZ-2.8,3],[cx+2.4,sb.maxZ+2.9,3],[sb.minX-3.1,cz-2.4,3],[sb.maxX+2.9,cz+2.2,3]
      ];
      shipPerimeter.forEach(function(pt,oi){
        var ox=pt[0], oz=pt[1], kind=pt[2];
        if(!shipWaterClear(ox,oz,2.4)) return;
        shipWaterPlaced.push([ox,oz]);
        if(kind===1){
          drawHeroCoralIslet(ox,oz,oi);
        }else if(kind===2){
          buoy(ox,oz,oi%2?'#d85652':'#f0ede2',-1.01);
        }else{
          floatingBarrel(ox,oz,oi*.9,-1.04);
          if(oi%2===0) floatingBarrel(ox+1.25,oz+.65,oi*.4+1.1,-1.04);
        }
      });
      // Port companion sloop cruising alongside the ship
      if(shipWaterClear(cx+1.6,sb.minZ-3.8,2.5)){
        shipWaterPlaced.push([cx+1.6,sb.minZ-3.8]);
        sailboat(cx+1.6,sb.minZ-3.8,Math.PI/2-.18,'#b56550','#fff1cf',1.0,-1.04);
      }
      // MIN 5: Sculpted open-ocean sandy coral islets well beyond the ship's far rail so every visible palm
      // stands unmistakably on a sunlit golden sand island with surf foam!
      var horizonIslets=[
        [sb.maxX-18.0, sb.minZ-19.5, 1, 1.02],
        [sb.maxX-2.0,  sb.minZ-23.5, 3, 1.08],
        [sb.maxX+14.0, sb.minZ-20.5, 5, 0.98],
        [sb.minX-14.0, cz-10.0,      7, 1.00],
        [cx+4.0,       sb.maxZ+20.0, 9, 1.04]
      ];
      horizonIslets.forEach(function(hi){
        if(shipWaterClear(hi[0],hi[1],5.5,6.0,6.5)){
          shipWaterPlaced.push([hi[0],hi[1]]);
          drawHorizonPalmCoralIslet(hi[0],hi[1],hi[2],hi[3]);
        }
      });
      // Jamboree 04-galleria-indoor parity: soft feathered diagonal golden window sunbeams + warm oak floor sheen inside Captain's Great Cabin
      (function addCabinSunbeams(){
        var sbt=getCabinSunbeamTex(T), beamTex=sbt.beamTex, sheenTex=sbt.sheenTex;
        var beamMat=new T.MeshBasicMaterial({
          color:view.night?'#a4d6f8':'#ffea9e', map:beamTex,
          transparent:true, opacity:view.night?0.12:0.28,
          blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false
        });
        var sheenMat=new T.MeshBasicMaterial({
          color:view.night?'#84c2ee':'#fff4cc', map:sheenTex,
          transparent:true, opacity:view.night?0.18:0.44,
          blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false
        });
        var beamGeo=new T.PlaneGeometry(3.4, 8.8);
        var sheenGeo=new T.PlaneGeometry(4.4, 6.4); sheenGeo.rotateX(-Math.PI/2);
        [[2.4, -2.0], [1.4, -5.6], [-0.2, -9.0], [-4.8, -11.4], [-10.8, -11.4], [-16.6, -11.0]].forEach(function(bp){
          var bx=bp[0], bz=bp[1];
          var bm=new T.Mesh(beamGeo, beamMat);
          bm.position.set(bx - 1.4, 2.35, bz);
          bm.rotation.set(0, -0.32, 0.58);
          bm.userData.hideOnZoom=true; bm.userData.noFootprint=true;
          extras.add(bm);
          var sh=new T.Mesh(sheenGeo, sheenMat);
          sh.position.set(bx - 2.6, -0.112, bz + 0.4);
          sh.rotation.y=-0.32;
          sh.userData.hideOnZoom=true; sh.userData.noFootprint=true;
          extras.add(sh);
        });
      })();
    }
    ({ town:town, lagoon:lagoon, caves:caves, patterns:patterns, beach:beach, light:light, captain:captain })[id]();

    // Central Sightline-Blocking Landmarks (1 per non-lighthouse region, strictly >= 4.5u clear of spaces & Space 0 cam)
    (function buildCentralSightlineLandmark(){
      if(id==='light') return;
      var bnds = sp.bounds || { minX:-20, maxX:20, minZ:-20, maxZ:20 };
      var lcx = (bnds.minX + bnds.maxX) * 0.5, lcz = (bnds.minZ + bnds.maxZ) * 0.5;
      function spaceMinD(x, z){
        var md = 999;
        for(var si=0; si<sp.length; si++){
          var d = Math.hypot(sp[si].x - x, sp[si].z - z);
          if(d < md) md = d;
        }
        return md;
      }
      var bestX = lcx, bestZ = lcz, bestD = spaceMinD(lcx, lcz);
      if(bestD < 4.8){
        for(var rad=2.0; rad<=10.0; rad+=2.0){
          for(var a=0; a<12; a++){
            var ang = a * Math.PI * 2 / 12;
            var tx = lcx + Math.cos(ang) * rad, tz = lcz + Math.sin(ang) * rad;
            var d = spaceMinD(tx, tz);
            if(d > bestD){ bestD = d; bestX = tx; bestZ = tz; }
          }
        }
      }
      if(bestD < 4.2) return;
      var lx = bestX, lz = bestZ, ly = 0;
      if(id==='town'){
        // Grand Harbor Clock-Tower & Arch Plaza (~14.5u tall)
        add(cyl(3.8, 4.3, 0.7, 16), '#d8cbb4', lx, ly + 0.35, lz, 0, 0, 0, 'stone');
        add(cyl(3.3, 3.6, 0.4, 16), '#b88c66', lx, ly + 0.9, lz, 0, 0, 0, 'stone');
        wornBox(3.1, 5.2, 3.1, '#f4ebd8', lx, ly + 3.7, lz, 'stone');
        wornBox(3.35, 0.45, 3.35, '#8c6244', lx, ly + 6.45, lz, 'timber');
        wornBox(2.55, 4.4, 2.55, '#f9f2e2', lx, ly + 8.85, lz, 'stone');
        [0, Math.PI/2, Math.PI, -Math.PI/2].forEach(function(ra){
          var fx = lx + Math.sin(ra)*1.30, fz = lz + Math.cos(ra)*1.30;
          var clk = add(cyl(0.68, 0.68, 0.14, 16), '#e6b84c', fx, ly + 9.2, fz, Math.PI/2, 0, ra, false);
          clk.rotation.set(Math.PI/2, 0, ra);
          add(cyl(0.54, 0.54, 0.16, 14), '#fff9eb', fx, ly + 9.2, fz, Math.PI/2, 0, ra, false);
        });
        add(cone(2.35, 3.8, 4), '#d96b52', lx, ly + 12.95, lz, 0, Math.PI/4, 0, 'stone');
        add(cyl(0.10, 0.14, 1.4, 8), '#e6b84c', lx, ly + 15.2, lz, 0, 0, 0, false);
      } else if(id==='lagoon'){
        // Ancient Storybook Banyan Island (~12u tall, organic faceted foliage boughs + flared roots + aerial vines + shoreline stones)
        var mound=smoothOrb(3.8, '#74b882', lx, ly + 0.1, lz, 'stone');
        mound.scale.set(1.22, 0.36, 1.15);
        for(var stI=0; stI<5; stI++){
          var stA=stI*Math.PI*2/5 + 0.4;
          var stM=add(new T.IcosahedronGeometry(0.68 + (stI%2)*0.22, 0), stI%2?'#6b8278':'#82988c', lx+Math.cos(stA)*3.9, ly+0.12, lz+Math.sin(stA)*3.7, 0, stA, 0, 'stone');
          stM.scale.set(1.3, 0.55, 1.1);
        }
        add(cyl(0.50, 0.96, 5.4, 12), '#7d5638', lx, ly + 3.4, lz, 0, 0, 0, 'timber');
        for(var rtI=0; rtI<4; rtI++){
          var rtA=rtI*Math.PI*0.5 + 0.35;
          add(cyl(0.16, 0.42, 2.5, 8), '#6b472d', lx+Math.cos(rtA)*0.95, ly+1.35, lz+Math.sin(rtA)*0.95, Math.sin(rtA)*0.48, 0, -Math.cos(rtA)*0.48, 'timber');
        }
        [[-1.3, 5.4, 0.7, 0.45, -0.52], [1.2, 5.6, -0.6, -0.35, 0.48], [0.2, 5.3, -1.2, -0.48, -0.15]].forEach(function(br){
          add(cyl(0.20, 0.34, 3.0, 8), '#7d5638', lx + br[0], ly + br[1], lz + br[2], br[3], 0, br[4], 'timber');
        });
        [
          [0, 6.7, 0, 1.48, '#2d7a4f', 1.38, 0.62, 1.28],
          [-2.3, 6.4, 1.2, 1.34, '#3b8d5b', 1.32, 0.64, 1.22],
          [2.2, 6.5, -1.1, 1.36, '#3d925e', 1.34, 0.62, 1.24],
          [1.4, 6.0, 1.9, 1.26, '#4ea662', 1.28, 0.64, 1.18],
          [-1.5, 7.5, -1.3, 1.28, '#62bc6a', 1.26, 0.64, 1.18],
          [0.3, 8.2, 0.7, 1.26, '#7ed46e', 1.28, 0.60, 1.20],
          [-0.5, 6.1, -2.0, 1.22, '#469c62', 1.24, 0.64, 1.16],
          [-1.9, 7.3, 0.2, 1.20, '#58b46b', 1.22, 0.64, 1.14],
          [1.7, 7.5, 0.9, 1.18, '#70c86c', 1.22, 0.60, 1.14],
          [-2.9, 7.0, -0.7, 1.10, '#4ea662', 1.20, 0.66, 1.12],
          [2.7, 7.1, 0.2, 1.12, '#5cb569', 1.20, 0.64, 1.12],
          [-0.8, 8.4, -0.5, 1.14, '#78cf6e', 1.22, 0.62, 1.14],
          [1.0, 8.3, -0.8, 1.10, '#68c26c', 1.20, 0.62, 1.12],
          [0.0, 9.0, 0.0, 1.08, '#9ce276', 1.26, 0.58, 1.18],
          [-1.2, 6.8, 1.7, 1.12, '#469c62', 1.22, 0.62, 1.14],
          [1.1, 6.9, -1.8, 1.10, '#3d925e', 1.22, 0.62, 1.14],
          [-2.2, 7.8, 1.0, 1.04, '#70c86c', 1.18, 0.62, 1.12],
          [2.0, 7.9, -0.6, 1.04, '#7cd06e', 1.18, 0.60, 1.12],
          [0.2, 7.6, 1.8, 1.06, '#62bc6a', 1.20, 0.62, 1.14],
          [-0.4, 7.7, -1.8, 1.04, '#58b46b', 1.20, 0.62, 1.14],
          [-1.5, 8.6, 0.4, 0.98, '#8be076', 1.18, 0.60, 1.10],
          [1.4, 8.7, 0.3, 0.96, '#92de76', 1.18, 0.60, 1.10],
          [-3.2, 6.5, 0.4, 0.94, '#469c62', 1.18, 0.66, 1.10],
          [3.0, 6.6, -0.4, 0.92, '#4ea662', 1.18, 0.66, 1.10],
          [-0.9, 5.8, 0.9, 0.98, '#2c6e4b', 1.24, 0.54, 1.16],
          [0.9, 5.9, -0.8, 0.96, '#2c6e4b', 1.24, 0.54, 1.16],
          [0.0, 7.2, -1.0, 1.14, '#5cb569', 1.22, 0.62, 1.16],
          [0.0, 7.4, 1.0, 1.12, '#68c26c', 1.22, 0.62, 1.16]
        ].forEach(function(cp, cpi){
          var leafGeo=own(new T.IcosahedronGeometry(cp[3], 1));
          var puff = add(leafGeo, cp[4], lx + cp[0], ly + cp[1], lz + cp[2], (cpi%3)*0.42, (cpi%5)*0.7, (cpi%2)*0.18, 'coral');
          puff.scale.set(cp[5], cp[6], cp[7]);
        });
        [[-2.4, 4.4, 1.2, 3.0], [2.2, 4.5, -1.0, 2.8], [-1.5, 4.3, -1.5, 2.9], [1.6, 4.2, 1.6, 3.1], [-2.9, 4.6, -0.3, 2.6], [2.6, 4.7, 0.5, 2.5]].forEach(function(vn){
          add(cyl(0.055, 0.075, vn[3], 6), '#6b4f35', lx + vn[0], ly + vn[1], lz + vn[2], 0, 0, 0, 'timber');
        });
      } else if(id==='caves'){
        // Bioluminescent Crystal Cathedral Spire (~15u tall)
        add(cyl(3.4, 4.4, 1.5, 10), '#525b78', lx, ly + 0.45, lz, 0, 0, 0, 'stone');
        add(cone(1.65, 11.5, 6), '#52e2e8', lx, ly + 6.9, lz, 0, 0, 0, false);
        [[1.4, 4.8, 0.9, 0.9, 6.5, 0.22], [-1.3, 4.4, -0.8, 0.85, 5.8, -0.20], [0.2, 4.2, -1.5, 0.8, 5.2, 0.18]].forEach(function(sp2){
          add(cone(sp2[3], sp2[4], 6), '#a87cf0', lx + sp2[0], ly + sp2[1], lz + sp2[2], sp2[5], 0, -sp2[5], false);
        });
        add(smoothTorus(2.6, 0.12, 8, 24), '#7cf6ff', lx, ly + 8.6, lz, Math.PI/2 + 0.18, 0, 0, false);
      } else if(id==='patterns'){
        // Polychrome Mosaic Coral Obelisk & Sunlit Arch (~13.5u tall)
        add(cyl(3.2, 3.8, 0.9, 8), '#e8dec4', lx, ly + 0.45, lz, 0, 0, 0, 'stone');
        add(cyl(2.2, 2.7, 0.8, 8), '#4aa8b8', lx, ly + 1.3, lz, 0, 0, 0, 'stone');
        add(cyl(0.85, 1.45, 9.2, 4), '#f4ead2', lx, ly + 6.3, lz, 0, Math.PI/4, 0, 'stone');
        [3.4, 5.8, 8.2].forEach(function(by, bi){
          add(cyl(1.32 - bi*0.16, 1.38 - bi*0.16, 0.55, 4), bi%2?'#e87664':'#3ea4ec', lx, ly + by, lz, 0, Math.PI/4, 0, false);
        });
        add(cone(1.05, 1.9, 4), '#f2be3e', lx, ly + 11.8, lz, 0, Math.PI/4, 0, false);
      } else if(id==='beach'){
        // Sea-Stack Lookout Crag & Perched Miniature Lighthouse (~12u tall)
        add(cyl(2.8, 4.0, 5.2, 10), '#d4aa78', lx, ly + 2.4, lz, 0, 0, 0, 'stone');
        add(cyl(2.4, 2.9, 0.5, 10), '#56a86e', lx, ly + 5.1, lz, 0, 0, 0, 'stone');
        add(cyl(0.85, 1.15, 4.4, 12), '#fff8ec', lx, ly + 7.5, lz, 0, 0, 0, 'stone');
        add(cyl(0.96, 1.04, 1.1, 12), '#df5b48', lx, ly + 7.4, lz, 0, 0, 0, 'stone');
        add(cyl(0.75, 0.75, 0.9, 10), '#ffe484', lx, ly + 10.1, lz, 0, 0, 0, false);
        add(cone(1.05, 1.1, 10), '#df5b48', lx, ly + 11.1, lz, 0, 0, 0, 'stone');
      } else if(id==='captain' && bestD >= 4.5){
        // Central Chart-Room Mast Atrium Pillar & Brass Astrolabe Ring
        add(cyl(0.65, 0.85, 6.2, 12), '#6a4428', lx, ly + 3.0, lz, 0, 0, 0, 'timber');
        add(smoothTorus(2.1, 0.14, 8, 24), '#d8aa4a', lx, ly + 3.8, lz, Math.PI/2, 0, 0, false);
        add(smoothTorus(1.5, 0.10, 8, 20), '#b8822e', lx, ly + 3.8, lz, 0.4, 0.5, 0, false);
      }
      addObstacle(lx, lz, 3.8);
    })();

    // Lightweight "Beyond-the-Board" Horizon Vista Ring (mid-distance islands/villages + far mountain silhouettes)
    (function buildBeyondBoardVistas(){
      if(id==='captain') return;
      var vGrp = new T.Group();
      vGrp.name = 'beyond-board-vistas';
      var bnds = sp.bounds || { minX:-20, maxX:20, minZ:-20, maxZ:20 };
      var vcx = (id==='light' && sp.lighthouse) ? sp.lighthouse.cx : (bnds.minX + bnds.maxX) * 0.5;
      var vcz = (id==='light' && sp.lighthouse) ? sp.lighthouse.cz : (bnds.minZ + bnds.maxZ) * 0.5;
      var baseSpan = (id==='light' && sp.lighthouse) ? (sp.lighthouse.rWallBase + 20) : (Math.max(bnds.maxX - bnds.minX, bnds.maxZ - bnds.minZ) * 0.5 + 16);
      var rMid = baseSpan + 30, rFar = baseSpan + 64;
      var pal = {
        town:     { mid:'#9ec6b4', roof:'#d9785e', far:'#bfd8d2' },
        lagoon:   { mid:'#7ebda2', roof:'#569e94', far:'#b4d8ca' },
        caves:    { mid:'#4f6084', roof:'#66d0e0', far:'#6f85aa' },
        patterns: { mid:'#96c4be', roof:'#e6b85a', far:'#c2ddd8' },
        beach:    { mid:'#d2b98e', roof:'#64a87e', far:'#b8d8d6' },
        light:    { mid:'#8ebea8', roof:'#d88068', far:'#bfd8d4' }
      }[id] || { mid:'#98c4b4', roof:'#d88068', far:'#bfd8d4' };
      var midMat = new T.MeshLambertMaterial({ color: pal.mid });
      var roofMat = new T.MeshLambertMaterial({ color: pal.roof });
      var farMat = new T.MeshLambertMaterial({ color: pal.far });
      var domeGeo = new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
      for(var i=0; i<16; i++){
        var ang = i * Math.PI * 2 / 16 + 0.15;
        var dist = rMid + (i % 3) * 8;
        var vx = vcx + Math.cos(ang) * dist, vz = vcz + Math.sin(ang) * dist;
        var w = 10 + (i % 4) * 4, h = 5.5 + (i % 3) * 3.5;
        var isl = new T.Mesh(domeGeo, midMat);
        isl.scale.set(w * 0.92, h * 0.62, w * 0.84);
        isl.position.set(vx, -1.6, vz);
        isl.rotation.y = ang + 0.4;
        vGrp.add(isl);
        var kOff = w * 0.48 * (i % 2 ? 1 : -1);
        var knoll = new T.Mesh(domeGeo, midMat);
        knoll.scale.set(w * 0.54, h * 0.40, w * 0.50);
        knoll.position.set(vx - Math.sin(ang) * kOff, -1.6, vz + Math.cos(ang) * kOff);
        knoll.rotation.y = ang - 0.3;
        vGrp.add(knoll);
        if(id==='town' || id==='lagoon' || id==='light' || id==='patterns' || id==='beach'){
          var cap = new T.Mesh(domeGeo, roofMat);
          cap.scale.set(w * 0.38, h * 0.28, w * 0.35);
          cap.position.set(vx + Math.cos(ang + 1.2) * (w * 0.14), -1.6 + h * 0.36, vz + Math.sin(ang + 1.2) * (w * 0.14));
          vGrp.add(cap);
        }
      }
      for(var j=0; j<14; j++){
        var fang = j * Math.PI * 2 / 14 + 0.35;
        var fdist = rFar + (j % 2) * 14;
        var fx = vcx + Math.cos(fang) * fdist, fz = vcz + Math.sin(fang) * fdist;
        var fw = 22 + (j % 3) * 8, fh = 12 + (j % 4) * 5;
        var mt = new T.Mesh(domeGeo, farMat);
        mt.scale.set(fw * 1.05, fh * 0.58, fw * 0.88);
        mt.position.set(fx, -2.2, fz);
        mt.rotation.y = fang + 0.25;
        vGrp.add(mt);
        var fOff = fw * 0.55 * (j % 2 ? -1 : 1);
        var ridge = new T.Mesh(domeGeo, farMat);
        ridge.scale.set(fw * 0.62, fh * 0.38, fw * 0.58);
        ridge.position.set(fx - Math.sin(fang) * fOff, -2.2, fz + Math.cos(fang) * fOff);
        ridge.rotation.y = fang - 0.35;
        vGrp.add(ridge);
      }
      vGrp.traverse(function(o){ o.userData.noFootprint = true; o.castShadow = false; o.receiveShadow = false; });
      compactGroupInPlace(vGrp, true, null);
      extras.add(vGrp);
    })();

    // MIN 6: Lush sunlit multi-puff Mario Party 8 cumulus clouds across the visible upper sky band
    // (Skip caves & enclosed indoor Captain's Great Cabin so ZERO outdoor clouds ever appear above the cabin!)
    if(id!=='caves' && id!=='captain' && typeof window.reef3dAddHorizonClouds==='function'){
      var cloudCenterX=(id==='light' && sp.lighthouse)?sp.lighthouse.cx:cx;
      var cloudCenterZ=(id==='light' && sp.lighthouse)?sp.lighthouse.cz:cz;
      var cloudBaseR=(id==='light' && sp.lighthouse)?(sp.lighthouse.rWallBase+28):(Math.max(maxR,20)+32);
      window.reef3dAddHorizonClouds(extras,{
        cx:cloudCenterX, cz:cloudCenterZ,
        rInner:cloudBaseR, rOuter:cloudBaseR+(id==='light'?24:20),
        yMin:id==='light'?11:6.0, yMax:id==='light'?28:11.2,
        count:id==='light'?22:32,
        night:!!view.night
      });
    }
    if(view.scene.fog){
      var wantNear=id==='caves'?52:(id==='light'?64:52);
      var wantFar=id==='caves'?185:(id==='light'?220:195);
      view.scene.fog.near=Math.max(view.scene.fog.near||0,wantNear);
      view.scene.fog.far=Math.max(view.scene.fog.far||0,wantFar);
      if(view.cam){ view.cam.far=Math.max(view.cam.far||0,view.scene.fog.far+95); view.cam.updateProjectionMatrix(); }
      if(view.scene.background && view.scene.background.isColor) view.scene.background.copy(view.scene.fog.color);
    }
    // Pre-compact static opaque meshes on the exact 16x16 chunk grid so reef3dMerge stays ultra-fast
    // and total scene meshes across all 7 regions (Day + Night) remain cleanly well below 12,000!
    compactRootSpatialChunks();
    // Chunked baked meshes use the same fast path and fog as the original board scenery.
    var merged = reef3dMerge(root,view.rig,view.bake);
    // The bake clones its inputs. Release only geometries created here; kit and
    // imported model geometry belongs to their own caches. Fallback keeps root.
    if(merged!==root && !root.parent) owned.forEach(function(g){ g.dispose(); });
    if(extras.children.length) merged.add(extras);
    merged.name = root.name; view.scene.add(merged);
    view.regionScenery = merged;
  };

  // Shared Mario Party 8 lush multi-puff sunlit cumulus horizon cloud ring (usable on outdoor boards & main cove).
  window.reef3dAddHorizonClouds = function(parent, opts){
    var T = window.THREE;
    if(!T || !parent) return null;
    var o = opts || {}, cxC = o.cx || 0, czC = o.cz || 0,
        rIn = o.rInner || 54, rOut = o.rOuter || (rIn + 20),
        yMin = o.yMin != null ? o.yMin : 6.0, yMax = o.yMax != null ? o.yMax : 11.2,
        count = o.count || 44, night = !!o.night;
    var grp = new T.Group(); grp.name = 'mp8-horizon-clouds';
    // Pre-merge the 8-lobe sculpted MP8 cumulus cloud into ONE shared BufferGeometry and render all
    // clouds via 2 InstancedMeshes (near + far) -> 2 draw calls instead of 256 per outdoor board!
    var baseSphere = new T.SphereGeometry(1, 10, 7);
    var bPos = baseSphere.attributes.position, bIdx = baseSphere.index;
    var cTop = new T.Color(night ? '#c8daf0' : '#fffef9'),
        cMid = new T.Color(night ? '#9ab4d4' : '#f7fafe'),
        cBot = new T.Color(night ? '#5d7aa0' : '#a0c5e4'),
        cTmp = new T.Color();
    var lobes = [
      [ 0.00,  0.58,  0.00,  2.55, 1.85, 1.95],
      [-2.20,  0.22,  0.24,  2.05, 1.38, 1.62],
      [ 2.30,  0.30, -0.20,  2.15, 1.46, 1.68],
      [-3.85, -0.14, -0.10,  1.52, 0.96, 1.28],
      [ 3.95, -0.10,  0.14,  1.56, 1.00, 1.30],
      [ 0.85,  0.98, -0.45,  1.78, 1.38, 1.46],
      [-0.95,  0.84,  0.38,  1.62, 1.24, 1.40],
      [ 0.15, -0.22,  0.52,  2.75, 0.78, 1.55]
    ];
    var mPos = [], mCol = [], mIdx = [];
    for(var li = 0; li < lobes.length; li++){
      var lb = lobes[li], vBase = mPos.length / 3;
      for(var vi = 0; vi < bPos.count; vi++){
        var sx = bPos.getX(vi), sy = bPos.getY(vi), sz = bPos.getZ(vi);
        mPos.push(lb[0] + sx * lb[3], lb[1] + sy * lb[4], lb[2] + sz * lb[5]);
        if(sy >= 0) cTmp.copy(cMid).lerp(cTop, Math.pow(sy, 0.72));
        else cTmp.copy(cMid).lerp(cBot, Math.pow(-sy, 0.78));
        mCol.push(cTmp.r, cTmp.g, cTmp.b);
      }
      if(bIdx){
        for(var ii = 0; ii < bIdx.count; ii++) mIdx.push(vBase + bIdx.getX(ii));
      }
    }
    baseSphere.dispose();
    var cloudGeo = new T.BufferGeometry();
    cloudGeo.setAttribute('position', new T.Float32BufferAttribute(mPos, 3));
    cloudGeo.setAttribute('color', new T.Float32BufferAttribute(mCol, 3));
    if(mIdx.length) cloudGeo.setIndex(mIdx);
    cloudGeo.computeBoundingSphere();
    var matNear = new T.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, fog: false });
    var matFar  = new T.MeshBasicMaterial({ color: night ? '#b4cae4' : '#f4f9fe', vertexColors: true, fog: false });
    var nearMats = [], farMats = [], dummy = new T.Object3D();
    for(var i = 0; i < count; i++){
      var farLayer = (i % 2 === 1);
      var ang = (i + 0.18 + ((i * 7) % 3 - 1) * 0.08) * Math.PI * 2 / count;
      var rad = farLayer ? (rOut + ((i * 7) % 9) * 1.15) : (rIn + ((i * 5) % 7) * 1.15);
      var hPat = [0.12, 0.56, 0.30, 0.78, 0.44, 0.88, 0.22][i % 7];
      var cy = yMin + (yMax - yMin) * (farLayer ? (0.35 + hPat * 0.62) : (0.04 + hPat * 0.56));
      var sc = (farLayer ? 1.42 : 1.06) * (0.86 + 0.30 * ((i * 11) % 5) / 4);
      dummy.position.set(cxC + Math.cos(ang) * rad, cy, czC + Math.sin(ang) * rad);
      dummy.rotation.set(0, -ang + Math.PI * 0.5, 0);
      dummy.scale.set(sc, sc * 0.94, sc * 0.94);
      dummy.updateMatrix();
      (farLayer ? farMats : nearMats).push(dummy.matrix.clone());
    }
    if(nearMats.length){
      var imNear = new T.InstancedMesh(cloudGeo, matNear, nearMats.length);
      for(var ni = 0; ni < nearMats.length; ni++) imNear.setMatrixAt(ni, nearMats[ni]);
      imNear.instanceMatrix.needsUpdate = true;
      imNear.frustumCulled = false;
      grp.add(imNear);
    }
    if(farMats.length){
      var imFar = new T.InstancedMesh(cloudGeo, matFar, farMats.length);
      for(var fi = 0; fi < farMats.length; fi++) imFar.setMatrixAt(fi, farMats[fi]);
      imFar.instanceMatrix.needsUpdate = true;
      imFar.frustumCulled = false;
      grp.add(imFar);
    }
    parent.add(grp);
    return grp;
  };
