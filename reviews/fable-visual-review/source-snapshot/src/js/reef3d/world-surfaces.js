/* Opaque scenery detail, opt-in only. No light, extra mesh, tick or startup fetch.
 * reef3dSurface(mesh, 'stone', {scale:2, seed:0, projection:'xz'}) tags ONE mesh.
 * The static merge projects its cloned world geometry; caller geometry/material
 * and pastel pigments stay intact. scale is panel width in world units; panel
 * height is twice that. Omit projection for a dominant plane per triangle.
 *
 * Atlas contract: 1024 square (portable copy 512), 4 columns x 2 rows, image TOP row stone/plaster/
 * timber/coral, bottom sand/fabric/roof/rope. Each 256 x 512 panel has an 8px
 * duplicated edge gutter; pale neutral, seamless detail multiplies baked color.
 * UV repeat happens INSIDE that inset, avoiding neighboring atlas panels.
 * Mipmaps fade fine grains in the distance instead of letting them shimmer;
 * their coarsest levels average the uniformly pale panels without hue bleed.
 * A cached 128 square neutral placeholder appears immediately; the local art
 * replaces it asynchronously at 512/1024 square. Final GPU image is about
 * 1.33 MiB on touch quality / 5.33 MiB on high quality.
 * Extra static buffer cost is 12 bytes/nonindexed vertex (UV + panel index).
 *
 * The view.bake cache owns one map and at most two materials (front/double side).
 * Call reef3dSurfaceDispose(view.bake) on final view disposal, not parking.
 */
var REEF3D_SURFACE_KINDS = {stone:0, plaster:1, timber:2, coral:3, sand:4, fabric:5, roof:6, rope:7};
var reef3dSurfaceSources = {}, reef3dSurfaceImage = null, reef3dSurfaceLoading = null;

function reef3dSurface(mesh, kind, opts){
  if(!mesh || !mesh.isMesh || !Object.prototype.hasOwnProperty.call(REEF3D_SURFACE_KINDS, kind)) return mesh;
  opts = opts || {};
  mesh.userData.reefSurface = {kind:kind, scale:Math.max(.1, +opts.scale || 2), seed:+opts.seed || 0, projection:opts.projection || ''};
  return mesh;
}
window.reef3dSurface = reef3dSurface;

// A deterministic material fallback, cached as pixels rather than GPU textures.
// It remains useful offline and while the optional photographed atlas is loading.
function reef3dSurfaceSource(size){
  if(reef3dSurfaceSources[size]) return reef3dSurfaceSources[size];
  var canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d'), image = ctx.createImageData(size, size), data = image.data;
  var cw = size / 4, ch = size / 2, pad = size / 128, m = Math;
  function noise(x,y,s){ var n = m.imul(x + s * 739, 374761393) + m.imul(y + s * 313, 668265263); n = m.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; }
  for(var y = 0; y < size; y++) for(var x = 0; x < size; x++){
    var col = m.floor(x / cw), row = m.floor(y / ch), kind = row * 4 + col;
    // Clamp into the interior to duplicate its edge into the gutters.
    var px = m.max(pad, m.min(cw-pad-1, x-col*cw))-pad;
    var py = m.max(pad, m.min(ch-pad-1, y-row*ch))-pad;
    var u = px / (cw-pad*2), v = py / (ch-pad*2), tau = m.PI * 2;
    var grain = noise(px,py,kind), cloud = m.sin(tau*u*3 + m.sin(tau*v*2)) * m.cos(tau*v*4);
    var value = 241 + cloud * 4 + (grain-.5)*9;
    if(kind === 0){ // Shellstone: shallow strata, flecks and occasional pores.
      value -= m.pow(m.max(0,m.cos(tau*(v*7 + .025*m.sin(tau*u*2)))),22)*10;
      if(grain < .025) value -= 23;
    } else if(kind === 1){ // Plaster: broad worn patches with fine sand grains.
      value += m.sin(tau*u)*m.cos(tau*v)*4;
      if(grain < .065) value -= 13;
    } else if(kind === 2){ // Timber: continuous wavy grain, not a flat plank fill.
      value -= m.pow(m.max(0,m.cos(tau*(u*22 + .23*m.sin(tau*v*2)))),8)*15;
      value -= m.pow(m.max(0,m.cos(tau*u*4)),34)*17;
    } else if(kind === 3){ // Coral limestone: tiny irregular clustered pores.
      if(grain < .13 + cloud*.04) value -= 21;
      value += m.sin(tau*(u*5+v*3))*3;
    } else if(kind === 4){ // Sand: very shallow wind/water ripples.
      value += m.sin(tau*(v*13 + .13*m.sin(tau*u*2)))*4;
      if(grain < .035) value -= 12;
    } else if(kind === 5){ // Fabric: understated crossing threads.
      value -= (m.cos(tau*u*40)+m.cos(tau*v*80))*2.8;
      value += m.sin(tau*v*3)*3;
    } else if(kind === 6){ // Roof: softened overlapping rows and ceramic grains.
      value -= m.pow(m.max(0,m.cos(tau*v*12)),24)*22;
      value -= m.pow(m.max(0,m.cos(tau*(u*4 + m.floor(v*12)%2*.5))),28)*9;
    } else { // Rope: diagonal strands and smaller twisted fibres.
      value -= m.pow(m.max(0,m.cos(tau*(u*6+v*18))),7)*23;
      value += m.sin(tau*(u*24-v*12))*3;
    }
    var i = (y*size+x)*4, c = m.max(193,m.min(253,m.round(value)));
    data[i] = data[i+1] = data[i+2] = c; data[i+3] = 255;
  }
  ctx.putImageData(image,0,0); reef3dSurfaceSources[size] = canvas; return canvas;
}

function reef3dSurfaceLoad(){
  if(window.REEF_WORLD_SURFACE_IMAGE) return Promise.resolve(window.REEF_WORLD_SURFACE_IMAGE);
  if(reef3dSurfaceImage || window.REEF_WORLD_SURFACE_URL === false) return Promise.resolve(reef3dSurfaceImage);
  if(reef3dSurfaceLoading) return reef3dSurfaceLoading;
  reef3dSurfaceLoading = new Promise(function(resolve){
    var image = new Image();
    image.onload = function(){
      image.onload = image.onerror = null;
      // Wrong aspect/layout would contaminate every surface. Keep the fallback.
      var width = image.naturalWidth;
      reef3dSurfaceImage = (width === 512 || width === 1024) && image.naturalHeight === width ? image : null;
      resolve(reef3dSurfaceImage);
    };
    image.onerror = function(){ image.onload = image.onerror = null; resolve(null); };
    image.src = window.REEF_WORLD_SURFACE_URL || 'assets/world/world-surfaces.jpg';
  });
  return reef3dSurfaceLoading;
}

function reef3dSurfaceState(cache){
  if(cache.__reefSurface) return cache.__reefSurface;
  var T = window.THREE, size = typeof R3 !== 'undefined' && R3.q >= 2 ? 512 : 1024;
  var map = new T.CanvasTexture(reef3dSurfaceSource(128));
  map.generateMipmaps = true; map.minFilter = T.LinearMipmapLinearFilter; map.magFilter = T.LinearFilter;
  map.wrapS = map.wrapT = T.ClampToEdgeWrapping; map.anisotropy = 1;
  // The atlas is neutral modulation data; existing vertex colors own pigment.
  map.encoding = T.LinearEncoding;
  var state = {map:map, materials:{}, disposed:false, size:size}; cache.__reefSurface = state;
  reef3dSurfaceLoad().then(function(image){
    if(!image || state.disposed) return;
    var canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(image,0,0,size,size);
    map.image = canvas; map.needsUpdate = true;
  });
  return state;
}

function reef3dSurfaceMaterial(cache, src){
  var T = window.THREE, state = reef3dSurfaceState(cache), key = src.side;
  if(state.materials[key]) return state.materials[key];
  var mat = new T.MeshBasicMaterial({vertexColors:true, map:state.map, side:src.side});
  mat.onBeforeCompile = function(shader){
    shader.vertexShader = shader.vertexShader.replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute float reefSurface;\nvarying float vReefSurface;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvReefSurface = reefSurface;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\nvarying float vReefSurface;')
      .replace('#include <map_fragment>',
        'vec2 reefCell = vec2(mod(floor(vReefSurface + 0.5), 4.0), 1.0 - floor((vReefSurface + 0.5) / 4.0));\n' +
        'vec2 reefInset = vec2(8.5 / 1024.0);\n' +
        'vec2 reefSpan = vec2(0.25, 0.5) - 2.0 * reefInset;\n' +
        'vec2 reefUV = reefCell * vec2(0.25, 0.5) + reefInset + fract(vUv) * reefSpan;\n' +
        'vec4 reefDetail = texture2D(map, reefUV);\n' +
        'diffuseColor.rgb *= mix(vec3(1.0), reefDetail.rgb, 0.55);');
  };
  mat.customProgramCacheKey = function(){ return 'reef-surface-atlas-v1'; };
  state.materials[key] = mat; return mat;
}

// g is a private, nonindexed world-space clone made by reef3dPieces. Calculate a
// consistent plane from each triangle, so a vertical wall never smears its top UV.
function reef3dSurfaceGeometry(g, mesh, src){
  var tag = mesh.userData.reefSurface, T = window.THREE;
  if(!tag || !Object.prototype.hasOwnProperty.call(REEF3D_SURFACE_KINDS,tag.kind) || src.map || src.transparent || mesh.isSkinnedMesh || (src.side !== T.FrontSide && src.side !== T.DoubleSide)) return false;
  var p = g.attributes.position, uv = new Float32Array(p.count*2), ids = new Float32Array(p.count);
  var a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), normal = new T.Vector3();
  var scale = Math.max(.1,+tag.scale || 2), seed = +tag.seed || 0;
  var du = Math.sin(seed*127.1)*.5, dv = Math.sin(seed*311.7)*.5;
  for(var i = 0; i < p.count; i += 3){
    a.fromBufferAttribute(p,i); b.fromBufferAttribute(p,i+1); c.fromBufferAttribute(p,i+2);
    normal.crossVectors(b.sub(a),c.sub(a));
    var nx = Math.abs(normal.x), ny = Math.abs(normal.y), nz = Math.abs(normal.z);
    var plane = tag.projection || (ny >= nx && ny >= nz ? 'xz' : nx >= nz ? 'zy' : 'xy');
    for(var k = i; k < i+3; k++){
      var u = plane === 'zy' ? p.getZ(k) : p.getX(k), v = plane === 'xz' ? p.getZ(k) : p.getY(k);
      uv[k*2] = u/scale + du; uv[k*2+1] = v/(scale*2) + dv; ids[k] = REEF3D_SURFACE_KINDS[tag.kind];
    }
  }
  g.setAttribute('uv',new T.BufferAttribute(uv,2)); g.setAttribute('reefSurface',new T.BufferAttribute(ids,1)); return true;
}

function reef3dSurfaceDispose(cache){
  var state = cache && cache.__reefSurface; if(!state || state.disposed) return;
  state.disposed = true;
  Object.keys(state.materials).forEach(function(k){ state.materials[k].dispose(); });
  state.map.dispose(); delete cache.__reefSurface;
}
