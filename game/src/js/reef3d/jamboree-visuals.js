/* ==========================================================================
   JamboreeVisuals — 8 Beyond-Mario-Party Visual Pillars for Coral Classroom
   Three.js r128 | Concatenated IIFE-safe | Zero-NaN | < 150 added meshes
   ========================================================================== */
var JamboreeVisuals = (function(){
  var DEFAULT_WORDS = ['CORAL', 'PEARL', 'TIDE', 'STAR'];

  var WEATHER_PRESETS = {
    morning: {
      hemiSky: 0xf4fffb, hemiGround: 0x73b8bd, hemiInt: 0.50,
      sunCol: 0xfff8ee, sunInt: 0.64,
      fogCol: 0xdff0e6, rayCol: 0xfff4cc, rayOp: 0.16,
      glintCol: 0xffffff, skyGlow: 0x000000, skyGlowOp: 0.0,
      starOp: 0.0, auroraOp: 0.0
    },
    golden: {
      hemiSky: 0xffe4b8, hemiGround: 0x9c6e58, hemiInt: 0.66,
      sunCol: 0xffb86b, sunInt: 0.92,
      fogCol: 0xf5d6b0, rayCol: 0xffd08a, rayOp: 0.24,
      glintCol: 0xffe4a8, skyGlow: 0xff9f5a, skyGlowOp: 0.12,
      starOp: 0.12, auroraOp: 0.0
    },
    starlight: {
      hemiSky: 0x6ea8d6, hemiGround: 0x1b3344, hemiInt: 0.72,
      sunCol: 0xaee6f2, sunInt: 0.74,
      fogCol: 0x0e2736, rayCol: 0x8be4f0, rayOp: 0.12,
      glintCol: 0xcff8ff, skyGlow: 0x1b4c6e, skyGlowOp: 0.18,
      starOp: 0.92, auroraOp: 0.10
    },
    aurora: {
      hemiSky: 0x7ef2d4, hemiGround: 0x20354a, hemiInt: 0.76,
      sunCol: 0xb8ffe8, sunInt: 0.78,
      fogCol: 0x122b3d, rayCol: 0x7effd4, rayOp: 0.18,
      glintCol: 0xa8ffe6, skyGlow: 0x35d4b2, skyGlowOp: 0.26,
      starOp: 0.85, auroraOp: 0.55
    }
  };

  function isCalm(){
    try { return typeof reefCalm === 'function' && !!reefCalm(); }
    catch(e){ return false; }
  }

  function finite(v, fallback){
    return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
  }

  function clamp(v, lo, hi){
    v = finite(v, lo);
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function makeNoRaycast(obj){
    if(obj) obj.raycast = function(){};
    return obj;
  }

  function trackRes(st, res){
    if(!st || !res) return res;
    if(res.isGeometry || res.isBufferGeometry) st.geometries.push(res);
    else if(res.isMaterial) st.materials.push(res);
    else if(res.isTexture) st.textures.push(res);
    return res;
  }

  function makeCausticTex(THREE, st){
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(210, 255, 250, 0.38)';
    g.lineWidth = 2.2;
    for(var i = 0; i < 14; i++){
      var cx = ((i * 37) % 128), cy = ((i * 53) % 128), r = 14 + (i % 4) * 7;
      for(var ox = -128; ox <= 128; ox += 128){
        for(var oy = -128; oy <= 128; oy += 128){
          g.beginPath();
          g.ellipse(cx + ox, cy + oy, r, r * 0.68, (i * 0.7), 0, Math.PI * 2);
          g.stroke();
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return trackRes(st, tex);
  }

  function makeBeamTex(THREE, st){
    var c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    var g = c.getContext('2d');
    var img = g.createImageData(64, 128), d = img.data;
    for(var y = 0; y < 128; y++){
      var v = 1 - y / 127;
      var vert = v < 0.18 ? (v / 0.18) : Math.max(0, 1 - (v - 0.18) / 0.82);
      for(var x = 0; x < 64; x++){
        var u = x / 63;
        var horiz = Math.pow(Math.sin(Math.PI * u), 2.0);
        var a = Math.min(1, horiz * vert);
        var idx = (y * 64 + x) * 4;
        d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255;
        d[idx + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    return trackRes(st, tex);
  }

  function makeSoftGlowTex(THREE, st){
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    return trackRes(st, tex);
  }

  function makeGlyphTex(THREE, word){
    var label = String(word || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 16) || 'STAR';
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 256, 64);
    g.font = '600 24px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(140, 235, 255, 0.9)';
    g.shadowBlur = 10;
    g.fillStyle = 'rgba(235, 252, 255, 0.95)';
    g.fillText(label, 128, 32);
    return new THREE.CanvasTexture(c);
  }

  function getSceneCenter(view){
    var x = 0, y = 0, z = 0;
    if(view && view.guide && view.guide.position){
      x = finite(view.guide.position.x, 0);
      y = finite(view.guide.position.y, 0);
      z = finite(view.guide.position.z, 0);
    } else if(view && view.spaces && view.spaces.bounds){
      var b = view.spaces.bounds;
      x = finite((b.minX + b.maxX) * 0.5, 0);
      z = finite((b.minZ + b.maxZ) * 0.5, 0);
    }
    return { x: x, y: y, z: z };
  }

  function groundHeight(view, x, z){
    if(view && typeof view.groundY === 'function'){
      var gy = view.groundY(x, z);
      if(Number.isFinite(gy)) return gy;
    }
    return 0;
  }

  function findLights(scene){
    var hemi = null, sun = null;
    if(!scene || !scene.traverse) return { hemi: null, sun: null };
    scene.traverse(function(o){
      if(!hemi && o.isHemisphereLight) hemi = o;
      if(!sun && o.isDirectionalLight) sun = o;
    });
    return { hemi: hemi, sun: sun };
  }

  function getCulturalAccentHex(){
    try {
      var mode = (typeof WorldState !== 'undefined' && WorldState && WorldState.cultureMode)
        || (typeof S !== 'undefined' && S && S.cultureMode);
      if(mode !== 'culture') return null;
      if(typeof CulturePacks !== 'undefined' && CulturePacks){
        if(typeof CulturePacks.getAccentHex === 'function') return CulturePacks.getAccentHex();
        if(CulturePacks.active && CulturePacks.active.accentHex) return CulturePacks.active.accentHex;
      }
      return 0xffc87a;
    } catch(e){
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Pillar 1: 3-Layer Stylized Ocean Enhancement
  // (Sun-glitter InstancedMesh + Shoreline foam rings + Caustic shimmer planes)
  // --------------------------------------------------------------------------
  function buildOceanLayer(THREE, st, view){
    var center = getSceneCenter(view);
    var group = new THREE.Group();
    group.name = 'jv-ocean';

    // Layer A: Crisp diamond sun-glitter sparkles (InstancedMesh, 48 instances)
    var glintGeo = trackRes(st, new THREE.PlaneGeometry(0.28, 0.28));
    var glintMat = trackRes(st, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: true
    }));
    var GLINT_N = 48;
    var glints = makeNoRaycast(new THREE.InstancedMesh(glintGeo, glintMat, GLINT_N));
    glints.frustumCulled = false;
    var glintData = [];
    for(var i = 0; i < GLINT_N; i++){
      var ang = (i * 2.39996) % (Math.PI * 2);
      var rad = 6 + ((i * 1.73) % 26);
      glintData.push({
        x: center.x + Math.cos(ang) * rad,
        z: center.z + Math.sin(ang) * rad,
        ph: i * 0.91,
        sp: 1.6 + (i % 5) * 0.45,
        sc: 0.65 + (i % 4) * 0.28
      });
    }
    group.add(glints);

    // Layer B: Subtle shoreline foam rings (InstancedMesh, 10 rings)
    var foamGeo = trackRes(st, new THREE.RingGeometry(1.15, 1.38, 28));
    foamGeo.rotateX(-Math.PI / 2);
    var foamMat = trackRes(st, new THREE.MeshBasicMaterial({
      color: 0xeefcff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true
    }));
    var FOAM_N = 10;
    var foam = makeNoRaycast(new THREE.InstancedMesh(foamGeo, foamMat, FOAM_N));
    foam.frustumCulled = false;
    var foamData = [];
    for(var f = 0; f < FOAM_N; f++){
      var fa = (f / FOAM_N) * Math.PI * 2;
      var fr = 17 + (f % 3) * 7;
      var fx = center.x + Math.cos(fa) * fr;
      var fz = center.z + Math.sin(fa) * fr;
      foamData.push({
        x: fx,
        y: groundHeight(view, fx, fz) + 0.04,
        z: fz,
        ph: f * 0.72,
        baseSc: 0.9 + (f % 3) * 0.45
      });
    }
    group.add(foam);

    // Layer C: Dual animated underwater caustic shimmer planes
    var causTex = makeCausticTex(THREE, st);
    var causTex2 = causTex.clone();
    causTex2.needsUpdate = true;
    trackRes(st, causTex2);
    var causGeo = trackRes(st, new THREE.PlaneGeometry(54, 54));
    causGeo.rotateX(-Math.PI / 2);
    var causMat1 = trackRes(st, new THREE.MeshBasicMaterial({
      map: causTex, color: 0xbefcf5, transparent: true, opacity: 0.14,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: true
    }));
    var causMat2 = trackRes(st, new THREE.MeshBasicMaterial({
      map: causTex2, color: 0x8ae8f2, transparent: true, opacity: 0.10,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: true
    }));
    var caus1 = makeNoRaycast(new THREE.Mesh(causGeo, causMat1));
    var caus2 = makeNoRaycast(new THREE.Mesh(causGeo, causMat2));
    caus1.position.set(center.x, 0.05, center.z);
    caus2.position.set(center.x, 0.06, center.z);
    caus2.rotation.y = 0.65;
    var initRid = view && view.region && view.region.id;
    if(initRid === 'captain' || initRid === 'light' || initRid === 'town' || initRid === 'beach' || initRid === 'caves'){
      caus1.visible = false;
      caus2.visible = false;
      foam.visible = false;
      if(initRid === 'captain') glints.visible = false;
    }
    group.add(caus1, caus2);

    st.root.add(group);
    st.ocean = {
      glints: glints, glintMat: glintMat, glintData: glintData,
      foam: foam, foamMat: foamMat, foamData: foamData,
      causTex1: causTex, causTex2: causTex2, caus1: caus1, caus2: caus2
    };
  }

  // --------------------------------------------------------------------------
  // Pillar 2 & 3: Subsurface Backlit Glow & Iridescent Nacre Shimmer
  // --------------------------------------------------------------------------
  function applyShaderToMaterial(mat, keyTag, patchFn){
    if(!mat || !mat.isMaterial || mat.userData[keyTag]) return;
    mat.userData[keyTag] = true;
    var prevCompile = mat.onBeforeCompile;
    var prevKey = mat.customProgramCacheKey;
    mat.customProgramCacheKey = function(){
      var base = typeof prevKey === 'function' ? prevKey.call(this) : '';
      return base + '|' + keyTag;
    };
    mat.onBeforeCompile = function(shader, renderer){
      if(typeof prevCompile === 'function') prevCompile.call(this, shader, renderer);
      patchFn(shader);
    };
    mat.needsUpdate = true;
  }

  function forEachMaterial(obj, fn){
    if(!obj) return;
    var visit = function(node){
      if(node.material){
        if(Array.isArray(node.material)){
          for(var i = 0; i < node.material.length; i++) fn(node.material[i]);
        } else {
          fn(node.material);
        }
      }
    };
    if(typeof obj.traverse === 'function') obj.traverse(visit);
    else visit(obj);
  }

  function applySubsurface(mesh, colorHex, intensity){
    var THREE = window.THREE;
    if(!THREE || !mesh) return mesh;
    var col = new THREE.Color(colorHex != null ? colorHex : 0xffb3d9);
    var amp = clamp(intensity != null ? intensity : 0.65, 0.0, 2.5);

    forEachMaterial(mesh, function(mat){
      applyShaderToMaterial(mat, 'jvSss_v1', function(shader){
        shader.uniforms.uJvSssColor = { value: col };
        shader.uniforms.uJvSssIntensity = { value: amp };

        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vJvSssNormal;\nvarying vec3 vJvSssViewDir;')
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvec4 jvSssWp = modelMatrix * vec4(transformed, 1.0);\nvJvSssNormal = normalize(mat3(modelMatrix) * normal);\nvJvSssViewDir = normalize(cameraPosition - jvSssWp.xyz);'
          );

        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uJvSssColor;\nuniform float uJvSssIntensity;\nvarying vec3 vJvSssNormal;\nvarying vec3 vJvSssViewDir;')
          .replace(
            '#include <dithering_fragment>',
            'vec3 jvSN = normalize(vJvSssNormal);\nvec3 jvSV = normalize(vJvSssViewDir);\nfloat jvSFres = pow(1.0 - clamp(abs(dot(jvSN, jvSV)), 0.0, 1.0), 2.3);\nfloat jvSBack = clamp(dot(-jvSN, normalize(vec3(0.35, 0.85, 0.4))) * 0.5 + 0.5, 0.0, 1.0);\ngl_FragColor.rgb += uJvSssColor * (jvSFres * 0.72 + jvSBack * 0.28) * uJvSssIntensity;\n#include <dithering_fragment>'
          );
      });
    });
    return mesh;
  }

  function applyNacreShimmer(mesh, tintHex){
    var THREE = window.THREE;
    if(!THREE || !mesh) return mesh;
    var cultural = getCulturalAccentHex();
    var col = new THREE.Color(tintHex != null ? tintHex : (cultural != null ? cultural : 0xffe6f7));

    forEachMaterial(mesh, function(mat){
      applyShaderToMaterial(mat, 'jvNacre_v1', function(shader){
        var timeUni = { value: 0.0 };
        shader.uniforms.uJvNacreTint = { value: col };
        shader.uniforms.uJvNacreTime = timeUni;
        mat.userData._jvNacreTimeUni = timeUni;

        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vJvNacreNormal;\nvarying vec3 vJvNacreViewDir;')
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvec4 jvNWp = modelMatrix * vec4(transformed, 1.0);\nvJvNacreNormal = normalize(mat3(modelMatrix) * normal);\nvJvNacreViewDir = normalize(cameraPosition - jvNWp.xyz);'
          );

        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uJvNacreTint;\nuniform float uJvNacreTime;\nvarying vec3 vJvNacreNormal;\nvarying vec3 vJvNacreViewDir;')
          .replace(
            '#include <dithering_fragment>',
            'vec3 jvNN = normalize(vJvNacreNormal);\nvec3 jvNV = normalize(vJvNacreViewDir);\nfloat jvNFres = 1.0 - clamp(abs(dot(jvNN, jvNV)), 0.0, 1.0);\nvec3 jvIrid = 0.5 + 0.5 * cos(6.28318 * (jvNFres * 1.15 + uJvNacreTime * 0.06 + vec3(0.0, 0.33, 0.67)));\nvec3 jvPearl = mix(jvIrid, uJvNacreTint, 0.42);\ngl_FragColor.rgb += jvPearl * (pow(jvNFres, 1.8) * 0.42 + 0.06);\n#include <dithering_fragment>'
          );
      });
    });
    return mesh;
  }

  // --------------------------------------------------------------------------
  // Pillar 4 & 5: Volumetric God Rays, Fresnel Lighthouse, & Lived-In Micro-Life
  // --------------------------------------------------------------------------
  function buildGodRaysAndLife(THREE, st, view){
    var center = getSceneCenter(view);
    var beamTex = makeBeamTex(THREE, st);
    var glowTex = makeSoftGlowTex(THREE, st);

    // 1. Soft additive diagonal sunbeams (6 meshes)
    var rayGroup = new THREE.Group();
    rayGroup.name = 'jv-godrays';
    var rayGeo = trackRes(st, new THREE.PlaneGeometry(3.2, 18));
    var rayMat = trackRes(st, new THREE.MeshBasicMaterial({
      map: beamTex, color: 0xfff4cc, transparent: true, opacity: 0.15,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false
    }));
    var rayOffsets = [
      [-8, -6], [6, -10], [-14, 4], [12, 6], [0, -16], [16, -2]
    ];
    for(var r = 0; r < rayOffsets.length; r++){
      var rm = makeNoRaycast(new THREE.Mesh(rayGeo, rayMat));
      var rx = center.x + rayOffsets[r][0], rz = center.z + rayOffsets[r][1];
      rm.position.set(rx, groundHeight(view, rx, rz) + 7.5, rz);
      rm.rotation.z = -0.26;
      rm.rotation.y = r * 0.55;
      rayGroup.add(rm);
    }
    st.root.add(rayGroup);

    // 2. Drifting petals / dust motes (InstancedMesh, 48 particles < 60)
    var MOTE_N = 48;
    var moteGeo = trackRes(st, new THREE.PlaneGeometry(0.11, 0.11));
    var moteMat = trackRes(st, new THREE.MeshBasicMaterial({
      map: glowTex, color: 0xfff6dd, transparent: true, opacity: 0.36,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: true
    }));
    var motes = makeNoRaycast(new THREE.InstancedMesh(moteGeo, moteMat, MOTE_N));
    motes.frustumCulled = false;
    var moteData = [];
    for(var m = 0; m < MOTE_N; m++){
      moteData.push({
        ox: ((m * 7.3) % 28) - 14,
        oy: 0.6 + ((m * 1.9) % 7.5),
        oz: ((m * 11.1) % 28) - 14,
        ph: m * 0.85,
        sp: 0.35 + (m % 5) * 0.12
      });
    }
    st.root.add(motes);

    // 3. Circling distant seagulls (4 gulls * 2 wings = 8 meshes)
    var gulls = [];
    var gullGeo = trackRes(st, new THREE.PlaneGeometry(0.65, 0.22));
    var gullMat = trackRes(st, new THREE.MeshBasicMaterial({
      color: 0xfafcff, side: THREE.DoubleSide, fog: true
    }));
    for(var g = 0; g < 4; g++){
      var gg = new THREE.Group();
      var lw = makeNoRaycast(new THREE.Mesh(gullGeo, gullMat));
      var rw = makeNoRaycast(new THREE.Mesh(gullGeo, gullMat));
      lw.position.x = -0.32;
      rw.position.x = 0.32;
      gg.add(lw, rw);
      st.root.add(gg);
      gulls.push({
        group: gg, lw: lw, rw: rw,
        rad: 18 + g * 4.5,
        y: 13.5 + g * 1.6,
        sp: 0.22 + g * 0.04,
        ph: g * 1.57
      });
    }

    // 4. Reactive darting fish school near Shelly (InstancedMesh, 18 fish)
    var FISH_N = 18;
    var fishGeo = trackRes(st, new THREE.ConeGeometry(0.08, 0.32, 5));
    fishGeo.rotateX(Math.PI / 2);
    var fishMat = trackRes(st, new THREE.MeshBasicMaterial({
      color: 0x7be8f0, transparent: true, opacity: 0.88, fog: true
    }));
    var fish = makeNoRaycast(new THREE.InstancedMesh(fishGeo, fishMat, FISH_N));
    fish.frustumCulled = false;
    var initRid = view.region && view.region.id;
    fish.visible = !(initRid === 'town' || initRid === 'captain' || initRid === 'caves' || initRid === 'light');
    var fishData = [];
    for(var fi = 0; fi < FISH_N; fi++){
      fishData.push({
        ang: (fi / FISH_N) * Math.PI * 2,
        rad: 9.5 + (fi % 4) * 1.15,
        yOff: 0.35 + (fi % 3) * 0.28,
        ph: fi * 0.77,
        dart: 0
      });
    }
    st.root.add(fish);

    // 5. Glowing lantern-moths on streaks (InstancedMesh, 16 moths)
    var MOTH_N = 16;
    var mothGeo = trackRes(st, new THREE.PlaneGeometry(0.24, 0.24));
    var mothMat = trackRes(st, new THREE.MeshBasicMaterial({
      map: glowTex, color: 0xffd97a, transparent: true, opacity: 0.0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    var moths = makeNoRaycast(new THREE.InstancedMesh(mothGeo, mothMat, MOTH_N));
    moths.frustumCulled = false;
    var mothData = [];
    for(var mi = 0; mi < MOTH_N; mi++){
      mothData.push({
        ang: (mi / MOTH_N) * Math.PI * 2,
        rad: 1.4 + (mi % 4) * 0.55,
        y: 0.9 + (mi % 5) * 0.35,
        ph: mi * 1.13
      });
    }
    st.root.add(moths);

    // 6. Slowly sweeping Lighthouse Fresnel light beam (2 meshes)
    var beaconGroup = new THREE.Group();
    beaconGroup.name = 'jv-fresnel-beacon';
    var coneGeo = trackRes(st, new THREE.ConeGeometry(4.2, 26, 20, 1, true));
    coneGeo.translate(0, -13, 0);
    coneGeo.rotateX(Math.PI / 2);
    var coneMat = trackRes(st, new THREE.MeshBasicMaterial({
      color: 0xfff0b8, transparent: true, opacity: 0.10,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false
    }));
    var coneMesh = makeNoRaycast(new THREE.Mesh(coneGeo, coneMat));
    var coreSprite = makeNoRaycast(new THREE.Sprite(trackRes(st, new THREE.SpriteMaterial({
      map: glowTex, color: 0xfff8dc, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }))));
    coreSprite.scale.set(2.8, 2.8, 1);
    beaconGroup.add(coneMesh, coreSprite);
    beaconGroup.position.set(center.x - 14, 14.5, center.z - 18);
    beaconGroup.rotation.x = 0.16;
    st.root.add(beaconGroup);

    // 7. Subtle aurora / sky-glow ribbon dome (1 mesh)
    var skyRibbonGeo = trackRes(st, new THREE.CylinderGeometry(42, 46, 12, 32, 1, true));
    var skyRibbonMat = trackRes(st, new THREE.MeshBasicMaterial({
      map: beamTex, color: 0x35d4b2, transparent: true, opacity: 0.0,
      depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false
    }));
    var skyRibbon = makeNoRaycast(new THREE.Mesh(skyRibbonGeo, skyRibbonMat));
    skyRibbon.position.set(center.x, 22, center.z);
    st.root.add(skyRibbon);

    st.rays = { group: rayGroup, mat: rayMat };
    st.motes = { mesh: motes, data: moteData };
    st.gulls = gulls;
    st.fish = { mesh: fish, data: fishData };
    st.moths = { mesh: moths, mat: mothMat, data: mothData };
    st.beacon = { group: beaconGroup, coneMat: coneMat };
    st.skyRibbon = { mesh: skyRibbon, mat: skyRibbonMat };
  }

  // --------------------------------------------------------------------------
  // Pillar 6: Star Constellations & Script Glyphs in Sky Dome
  // --------------------------------------------------------------------------
  function disposeGroupChildren(group){
    if(!group) return;
    group.traverse(function(o){
      if(o.geometry && typeof o.geometry.dispose === 'function') o.geometry.dispose();
      if(o.material){
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for(var i = 0; i < mats.length; i++){
          if(mats[i].map && typeof mats[i].map.dispose === 'function') mats[i].map.dispose();
          if(typeof mats[i].dispose === 'function') mats[i].dispose();
        }
      }
    });
  }

  function buildConstellations(view, words){
    var THREE = window.THREE;
    if(!THREE || !view || !view.scene) return;
    var st = view._jamboreeVisuals || attach(view);
    if(!st) return;

    if(st.constellations && st.constellations.group){
      st.root.remove(st.constellations.group);
      disposeGroupChildren(st.constellations.group);
    }

    var list = Array.isArray(words) && words.length ? words.slice(0, 6) : DEFAULT_WORDS;
    var center = getSceneCenter(view);
    var group = new THREE.Group();
    group.name = 'jv-constellations';

    var linePositions = [];
    var starGeo = new THREE.OctahedronGeometry(0.32, 0);
    var starMat = new THREE.MeshBasicMaterial({
      color: 0xdff8ff, transparent: true, opacity: 0.0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    var starsPerWord = 5;
    var totalStars = list.length * starsPerWord;
    var starInst = makeNoRaycast(new THREE.InstancedMesh(starGeo, starMat, totalStars));
    starInst.frustumCulled = false;

    var m4 = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    var sc = new THREE.Vector3(1, 1, 1);
    var p = new THREE.Vector3();
    var glyphMats = [];

    for(var w = 0; w < list.length; w++){
      var raw = list[w];
      var text = (raw && typeof raw === 'object') ? (raw.word || raw.text || raw.label || '') : raw;
      var baseAng = -Math.PI * 0.8 + (w / Math.max(1, list.length - 1)) * Math.PI * 0.6;
      if(list.length === 1) baseAng = -Math.PI * 0.5;
      var domeR = 46;
      var pts = [];

      for(var s = 0; s < starsPerWord; s++){
        var a = baseAng + (s - 2) * 0.085;
        var elev = 28 + ((w * 3 + s * 5) % 9) * 1.4;
        var sx = center.x + Math.cos(a) * domeR;
        var sz = center.z + Math.sin(a) * domeR;
        pts.push(sx, elev, sz);
        p.set(sx, elev, sz);
        m4.compose(p, q, sc);
        starInst.setMatrixAt(w * starsPerWord + s, m4);
        if(s > 0){
          linePositions.push(pts[(s - 1) * 3], pts[(s - 1) * 3 + 1], pts[(s - 1) * 3 + 2]);
          linePositions.push(sx, elev, sz);
        }
      }
      starInst.instanceMatrix.needsUpdate = true;

      var glyphTex = makeGlyphTex(THREE, text);
      var glyphMat = new THREE.SpriteMaterial({
        map: glyphTex, color: 0xe6fbff, transparent: true, opacity: 0.0,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false
      });
      var glyph = makeNoRaycast(new THREE.Sprite(glyphMat));
      glyph.position.set(pts[6], pts[7] + 2.4, pts[8]);
      glyph.scale.set(7.5, 1.9, 1);
      group.add(glyph);
      glyphMats.push(glyphMat);
    }

    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x9ae8ff, transparent: true, opacity: 0.0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    var lines = makeNoRaycast(new THREE.LineSegments(lineGeo, lineMat));

    group.add(starInst, lines);
    st.root.add(group);
    st.constellations = {
      group: group,
      starMat: starMat,
      lineMat: lineMat,
      glyphMats: glyphMats
    };
    return group;
  }

  // --------------------------------------------------------------------------
  // Pillar 7: Pixar Color Script Weather
  // --------------------------------------------------------------------------
  function setWeather(view, mode){
    if(!view || !view.scene) return;
    var st = view._jamboreeVisuals || attach(view);
    if(!st) return;
    var key = WEATHER_PRESETS[mode] ? mode : (view.night ? 'starlight' : 'morning');
    st.weatherMode = key;
    st.weatherTarget = WEATHER_PRESETS[key];
    if(isCalm()){
      applyWeatherInstant(st, view, st.weatherTarget);
    }
  }

  function applyWeatherInstant(st, view, target){
    var THREE = window.THREE;
    if(!THREE || !target) return;
    if(st.lights.hemi){
      st.lights.hemi.color.setHex(target.hemiSky);
      st.lights.hemi.groundColor.setHex(target.hemiGround);
      st.lights.hemi.intensity = target.hemiInt;
    }
    if(st.lights.sun){
      st.lights.sun.color.setHex(target.sunCol);
      st.lights.sun.intensity = target.sunInt;
    }
    if(view.scene.fog && view.scene.fog.color){
      view.scene.fog.color.setHex(target.fogCol);
    }
    if(view.scene.background && view.scene.background.isColor){
      view.scene.background.setHex(target.fogCol);
    }
    if(st.rays){
      st.rays.mat.color.setHex(target.rayCol);
      st.rays.mat.opacity = target.rayOp;
    }
    if(st.ocean){
      st.ocean.glintMat.color.setHex(target.glintCol);
    }
    if(st.skyRibbon){
      st.skyRibbon.mat.color.setHex(target.skyGlow);
      st.skyRibbon.mat.opacity = target.auroraOp;
    }
    if(st.constellations){
      var sop = target.starOp;
      st.constellations.starMat.opacity = sop;
      st.constellations.lineMat.opacity = sop * 0.55;
      for(var i = 0; i < st.constellations.glyphMats.length; i++){
        st.constellations.glyphMats[i].opacity = sop * 0.85;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Pillar 8: Pixar Character Micro-Life & Streak Pulse
  // --------------------------------------------------------------------------
  function pulseStreak(view, level){
    if(!view) return;
    var st = view._jamboreeVisuals;
    if(!st) return;
    var lv = clamp(Number(level), 0, 10);
    st.streakLevel = lv;
    if(lv > 0) st.streakPulse = 1.0;
  }

  function applyCharacterMicroLife(actor, now, isMoving, calm){
    if(!actor || !actor.scale || !actor.position) return;
    var ud = actor.userData || (actor.userData = {});
    if(!ud._jvBase){
      ud._jvBase = {
        sx: finite(actor.scale.x, 1),
        sy: finite(actor.scale.y, 1),
        sz: finite(actor.scale.z, 1),
        rz: finite(actor.rotation ? actor.rotation.z : 0, 0)
      };
    }
    var b = ud._jvBase;
    if(calm){
      actor.scale.set(b.sx, b.sy, b.sz);
      if(actor.rotation) actor.rotation.z = b.rz;
      return;
    }

    var t = (finite(now, performance.now())) * 0.001;
    var sy = 1.0, sxz = 1.0, tilt = 0.0;
    if(isMoving){
      var hop = Math.sin(t * 11.0);
      sy = clamp(1.0 + hop * 0.065, 0.85, 1.18);
      sxz = clamp(1.0 / Math.sqrt(sy), 0.88, 1.14);
      tilt = Math.sin(t * 5.5) * 0.04;
    } else {
      var breath = Math.sin(t * 2.2);
      sy = clamp(1.0 + breath * 0.022, 0.94, 1.06);
      sxz = clamp(1.0 - breath * 0.011, 0.94, 1.06);
      tilt = Math.sin(t * 1.1) * 0.012;
    }

    actor.scale.set(b.sx * sxz, b.sy * sy, b.sz * sxz);
    if(actor.rotation) actor.rotation.z = b.rz + tilt;

    if(typeof actor.traverse === 'function'){
      actor.traverse(function(child){
        if(child === actor || !child.rotation) return;
        var nm = (child.name || '').toLowerCase();
        if(nm.indexOf('antenna') !== -1 || nm.indexOf('fin') !== -1){
          if(child.userData._jvRx == null) child.userData._jvRx = finite(child.rotation.x, 0);
          child.rotation.x = child.userData._jvRx + Math.sin(t * (isMoving ? 7.5 : 2.8)) * 0.08;
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // Lifecycle: attach, tick, dispose
  // --------------------------------------------------------------------------
  function attach(view){
    var THREE = window.THREE;
    if(!THREE || !view || !view.scene) return null;
    if(view._jamboreeVisuals) return view._jamboreeVisuals;

    var root = new THREE.Group();
    root.name = 'jamboree-visuals-root';
    var inEncounter = !!(view && view.encounter);
    root.visible = !inEncounter;
    view.scene.add(root);

    var lights = findLights(view.scene);
    var st = {
      root: root,
      lights: lights,
      nacreUniforms: [],
      nacreSceneChildCount: -1,
      geometries: [],
      materials: [],
      textures: [],
      ocean: null,
      rays: null,
      motes: null,
      gulls: null,
      fish: null,
      moths: null,
      beacon: null,
      skyRibbon: null,
      constellations: null,
      weatherMode: view.night ? 'starlight' : 'morning',
      weatherTarget: WEATHER_PRESETS[view.night ? 'starlight' : 'morning'],
      streakLevel: 0,
      streakPulse: 0,
      tmpColor: new THREE.Color(),
      m4: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      sc: new THREE.Vector3(1, 1, 1)
    };
    view._jamboreeVisuals = st;

    buildOceanLayer(THREE, st, view);
    buildGodRaysAndLife(THREE, st, view);
    buildConstellations(view, DEFAULT_WORDS);
    applyWeatherInstant(st, view, st.weatherTarget);
    return st;
  }

  function tick(view, now, dt){
    var THREE = window.THREE;
    if(!THREE || !view || !view._jamboreeVisuals) return;
    var st = view._jamboreeVisuals;
    var inEncounter = !!(view && view.encounter);
    if(st.root) st.root.visible = !inEncounter;
    if(inEncounter) return;
    var calm = isCalm();
    var t = finite(now, performance.now()) * 0.001;
    var step = clamp(finite(dt, 0.016), 0.0, 0.1);
    var lerpK = calm ? 1.0 : Math.min(1.0, step * 2.5);

    // 1. Smooth Color Script weather transitions
    var wt = st.weatherTarget;
    if(wt){
      if(st.lights.hemi){
        st.tmpColor.setHex(wt.hemiSky);
        st.lights.hemi.color.lerp(st.tmpColor, lerpK);
        st.tmpColor.setHex(wt.hemiGround);
        st.lights.hemi.groundColor.lerp(st.tmpColor, lerpK);
        st.lights.hemi.intensity += (wt.hemiInt - st.lights.hemi.intensity) * lerpK;
      }
      if(st.lights.sun){
        st.tmpColor.setHex(wt.sunCol);
        st.lights.sun.color.lerp(st.tmpColor, lerpK);
        st.lights.sun.intensity += (wt.sunInt - st.lights.sun.intensity) * lerpK;
      }
      if(view.scene.fog && view.scene.fog.color){
        st.tmpColor.setHex(wt.fogCol);
        view.scene.fog.color.lerp(st.tmpColor, lerpK);
      }
      if(view.scene.background && view.scene.background.isColor){
        st.tmpColor.setHex(wt.fogCol);
        view.scene.background.lerp(st.tmpColor, lerpK);
      }
      if(st.rays){
        st.tmpColor.setHex(wt.rayCol);
        st.rays.mat.color.lerp(st.tmpColor, lerpK);
        st.rays.mat.opacity += (wt.rayOp - st.rays.mat.opacity) * lerpK;
      }
      if(st.ocean){
        st.tmpColor.setHex(wt.glintCol);
        st.ocean.glintMat.color.lerp(st.tmpColor, lerpK);
      }
      if(st.skyRibbon){
        st.tmpColor.setHex(wt.skyGlow);
        st.skyRibbon.mat.color.lerp(st.tmpColor, lerpK);
        st.skyRibbon.mat.opacity += (wt.auroraOp - st.skyRibbon.mat.opacity) * lerpK;
        if(!calm) st.skyRibbon.mesh.rotation.y = t * 0.03;
      }
      if(st.constellations){
        var sop = wt.starOp * (calm ? 1.0 : (0.85 + 0.15 * Math.sin(t * 1.4)));
        st.constellations.starMat.opacity += (sop - st.constellations.starMat.opacity) * lerpK;
        st.constellations.lineMat.opacity += (sop * 0.55 - st.constellations.lineMat.opacity) * lerpK;
        for(var gi = 0; gi < st.constellations.glyphMats.length; gi++){
          st.constellations.glyphMats[gi].opacity += (sop * 0.85 - st.constellations.glyphMats[gi].opacity) * lerpK;
        }
      }
    }

    // 2. Ocean sparkles, foam rings, and caustic scroll
    var oc = st.ocean;
    if(oc){
      var rid = view && view.region && view.region.id;
      if(rid === 'captain' || rid === 'light' || rid === 'town' || rid === 'beach' || rid === 'caves'){
        if(oc.caus1) oc.caus1.visible = false;
        if(oc.caus2) oc.caus2.visible = false;
        if(oc.foam) oc.foam.visible = false;
        if(rid === 'captain' && oc.glints) oc.glints.visible = false;
      } else if(!calm){
        oc.causTex1.offset.x = (t * 0.018) % 1;
        oc.causTex1.offset.y = (t * 0.012) % 1;
        oc.causTex2.offset.x = (-t * 0.014) % 1;
        oc.causTex2.offset.y = (t * 0.016) % 1;
      }
    }
    st._instAccum = (st._instAccum || 0) + step;
    var doInst = !st._instInit || calm || st._instAccum >= 0.048;
    if(doInst){ st._instAccum = 0; st._instInit = true; }
    if(oc && doInst){
      for(var i = 0; i < oc.glintData.length; i++){
        var gd = oc.glintData[i];
        var pulse = calm ? 0.55 : Math.max(0, Math.sin(t * gd.sp + gd.ph));
        var s = gd.sc * pulse;
        st.pos.set(gd.x, 0.09, gd.z);
        st.euler.set(-Math.PI / 2, 0, Math.PI / 4 + (calm ? 0 : t * 0.4));
        st.quat.setFromEuler(st.euler);
        st.sc.setScalar(s);
        st.m4.compose(st.pos, st.quat, st.sc);
        oc.glints.setMatrixAt(i, st.m4);
      }
      oc.glints.instanceMatrix.needsUpdate = true;

      for(var fi = 0; fi < oc.foamData.length; fi++){
        var fd = oc.foamData[fi];
        var fs = fd.baseSc * (calm ? 1.0 : (0.9 + 0.18 * Math.sin(t * 1.1 + fd.ph)));
        st.pos.set(fd.x, fd.y, fd.z);
        st.quat.identity();
        st.sc.set(fs, 1, fs);
        st.m4.compose(st.pos, st.quat, st.sc);
        oc.foam.setMatrixAt(fi, st.m4);
      }
      oc.foam.instanceMatrix.needsUpdate = true;
    }

    // 3. Nacre shimmer time uniforms (cached to avoid per-frame scene.traverse)
    if(!calm && view.scene){
      var childCount = view.scene.children ? view.scene.children.length : 0;
      if(st.nacreSceneChildCount !== childCount){
        st.nacreSceneChildCount = childCount;
        st.nacreUniforms.length = 0;
        view.scene.traverse(function(o){
          if(!o.material) return;
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          for(var mi = 0; mi < mats.length; mi++){
            if(mats[mi] && mats[mi].userData && mats[mi].userData._jvNacreTimeUni){
              st.nacreUniforms.push(mats[mi].userData._jvNacreTimeUni);
            }
          }
        });
      }
      for(var ni = 0; ni < st.nacreUniforms.length; ni++){
        st.nacreUniforms[ni].value = t;
      }
    }

    // 4. Drifting petals / dust motes
    var center = getSceneCenter(view);
    if(st.motes && doInst){
      for(var m = 0; m < st.motes.data.length; m++){
        var md = st.motes.data[m];
        var mx = center.x + md.ox + (calm ? 0 : Math.sin(t * md.sp + md.ph) * 1.4);
        var my = md.oy + (calm ? 0 : Math.cos(t * md.sp * 0.8 + md.ph) * 0.45);
        var mz = center.z + md.oz + (calm ? 0 : Math.cos(t * md.sp + md.ph) * 1.4);
        st.pos.set(mx, my, mz);
        st.euler.set(calm ? 0 : t * 0.7 + md.ph, calm ? 0 : t * 0.5, 0);
        st.quat.setFromEuler(st.euler);
        st.sc.setScalar(calm ? 0.65 : 0.85);
        st.m4.compose(st.pos, st.quat, st.sc);
        st.motes.mesh.setMatrixAt(m, st.m4);
      }
      st.motes.mesh.instanceMatrix.needsUpdate = true;
    }

    // 5. Circling distant seagulls
    if(st.gulls){
      for(var gi2 = 0; gi2 < st.gulls.length; gi2++){
        var gl = st.gulls[gi2];
        var ga = gl.ph + (calm ? 0 : t * gl.sp);
        gl.group.position.set(
          center.x + Math.cos(ga) * gl.rad,
          gl.y + (calm ? 0 : Math.sin(t * 0.9 + gl.ph) * 0.6),
          center.z + Math.sin(ga) * gl.rad
        );
        gl.group.rotation.y = -ga;
        var flap = calm ? 0.18 : Math.sin(t * 5.2 + gl.ph) * 0.45;
        gl.lw.rotation.z = flap;
        gl.rw.rotation.z = -flap;
      }
    }

    // 6. Reactive darting fish school near Shelly
    if(st.fish){
      var rid = view.region && view.region.id;
      var dryRegion = (rid === 'town' || rid === 'captain' || rid === 'caves' || rid === 'light');
      st.fish.mesh.visible = !dryRegion;
      if(!dryRegion && doInst){
        var moving = !!view.moving;
        for(var fIdx = 0; fIdx < st.fish.data.length; fIdx++){
          var fsh = st.fish.data[fIdx];
          var targetDart = moving && !calm ? 1.65 : 0.0;
          fsh.dart += (targetDart - fsh.dart) * Math.min(1, step * 4);
          var fa = fsh.ang + (calm ? 0 : t * (moving ? 2.1 : 0.75));
          var fr = Math.max(9.5, fsh.rad) + fsh.dart;
          var fx = center.x + Math.cos(fa) * fr;
          var fz = center.z + Math.sin(fa) * fr;
          var fy = groundHeight(view, fx, fz) + fsh.yOff + (calm ? 0 : Math.sin(t * 2.4 + fsh.ph) * 0.12);
          st.pos.set(fx, fy, fz);
          st.euler.set(0, -fa + Math.PI / 2, 0);
          st.quat.setFromEuler(st.euler);
          st.sc.setScalar(1.0);
          st.m4.compose(st.pos, st.quat, st.sc);
          st.fish.mesh.setMatrixAt(fIdx, st.m4);
        }
        st.fish.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 7. Glowing lantern-moths on streaks
    if(st.moths){
      st.streakPulse = Math.max(0, st.streakPulse - step * 0.65);
      var wantMothOp = st.streakLevel > 0 ? clamp(0.35 + st.streakLevel * 0.12 + st.streakPulse * 0.45, 0, 0.95) : 0.0;
      st.moths.mat.opacity += (wantMothOp - st.moths.mat.opacity) * lerpK;
      var mothActive = st.moths.mat.opacity > 0.01;
      st.moths.mesh.visible = mothActive;
      if(mothActive){
        for(var mi2 = 0; mi2 < st.moths.data.length; mi2++){
          var mth = st.moths.data[mi2];
          var ma = mth.ang + (calm ? 0 : t * 1.4);
          st.pos.set(
            center.x + Math.cos(ma) * mth.rad,
            center.y + mth.y + (calm ? 0 : Math.sin(t * 3.1 + mth.ph) * 0.25),
            center.z + Math.sin(ma) * mth.rad
          );
          st.quat.identity();
          st.sc.setScalar(0.85 + st.streakPulse * 0.45);
          st.m4.compose(st.pos, st.quat, st.sc);
          st.moths.mesh.setMatrixAt(mi2, st.m4);
        }
        st.moths.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 8. Slowly sweeping Lighthouse Fresnel light beam
    if(st.beacon && !calm){
      st.beacon.group.rotation.y = t * 0.22;
    }
  }

  function dispose(view){
    if(!view || !view._jamboreeVisuals) return;
    var st = view._jamboreeVisuals;
    if(view.scene && st.root) view.scene.remove(st.root);
    if(st.constellations && st.constellations.group){
      disposeGroupChildren(st.constellations.group);
    }
    for(var i = 0; i < st.geometries.length; i++){
      if(st.geometries[i] && typeof st.geometries[i].dispose === 'function') st.geometries[i].dispose();
    }
    for(var j = 0; j < st.materials.length; j++){
      if(st.materials[j] && typeof st.materials[j].dispose === 'function') st.materials[j].dispose();
    }
    for(var k = 0; k < st.textures.length; k++){
      if(st.textures[k] && typeof st.textures[k].dispose === 'function') st.textures[k].dispose();
    }
    st.geometries.length = 0;
    st.materials.length = 0;
    st.textures.length = 0;
    view._jamboreeVisuals = null;
  }

  return {
    attach: attach,
    tick: tick,
    setWeather: setWeather,
    applySubsurface: applySubsurface,
    applyNacreShimmer: applyNacreShimmer,
    buildConstellations: buildConstellations,
    pulseStreak: pulseStreak,
    applyCharacterMicroLife: applyCharacterMicroLife,
    dispose: dispose
  };
})();
window.JamboreeVisuals = JamboreeVisuals;
