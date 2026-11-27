  /* Optional authored residents. Each view owns its request and GPU resources;
     a failed or unfinished model leaves the procedural resident in place. */
  // Only validated assets belong in the active registry. Multiple residents can
  // share a region; a dormant candidate never triggers download or decoding.
  var REGION_RESIDENT_MODELS = { town:[{ id:'taxi', url:'assets/models/taxi-squid.glb?v=mp-43', closeUrl:'assets/models/taxi-squid-close.glb?v=mp-43' }] };
  var REGION_RESIDENT_CANDIDATES = {
    'cafe-seahorse':{ region:'town', id:'cafe-seahorse', target:'cafe', localFwdYaw:-0.58, url:'assets/models/cafe-seahorse.glb?v=mp-39', closeUrl:'assets/models/cafe-seahorse-close.glb?v=mp-39' },
    jisu:{ region:'beach', id:'jisu', target:'host', boardScale:1.75, url:'assets/models/jisu.glb?v=mp-39', closeUrl:'assets/models/jisu-close.glb?v=mp-39' },
    'shop-octopus':{ region:'town', id:'shop-octopus', target:'shop', skinMask:'baseColorAlpha', url:'assets/models/shop-octopus.glb?v=mp-39', closeUrl:'assets/models/shop-octopus-close.glb?v=mp-39' },
    mira:{ region:'lagoon', id:'mira', target:'host', boardScale:1.26, url:'assets/models/mira.glb?v=mp-39', closeUrl:'assets/models/mira-close.glb?v=mp-39' },
    echo:{ region:'caves', id:'echo', target:'host', boardScale:1.24, url:'assets/models/echo.glb?v=mp-44', closeUrl:'assets/models/echo-close.glb?v=mp-44' },
    pip:{ region:'patterns', id:'pip', target:'host', boardScale:2.15, url:'assets/models/pip.glb?v=mp-44', closeUrl:'assets/models/pip-close.glb?v=mp-44' },
    hana:{ region:'light', id:'hana', target:'host', url:'assets/models/hana.glb?v=mp-44', closeUrl:'assets/models/hana-close.glb?v=mp-44' },
    'captain-bay':{ region:'captain', id:'captain-bay', target:'host', boardScale:0.72, url:'assets/models/captain-bay.glb?v=mp-44', closeUrl:'assets/models/captain-bay-close.glb?v=mp-44' },
    'restaurant-otter':{ region:'town', id:'restaurant-otter', target:'restaurant', url:'assets/models/restaurant-otter.glb?v=mp-40', closeUrl:'assets/models/restaurant-otter-close.glb?v=mp-40' },
    'hotel-whale':{ region:'town', id:'hotel-whale', target:'hotel', boardScale:0.85, url:'assets/models/hotel-whale.glb?v=mp-40', closeUrl:'assets/models/hotel-whale-close.glb?v=mp-40' },
    'pharmacy-shrimp':{ region:'town', id:'pharmacy-shrimp', target:'pharmacy', boardScale:1.45, url:'assets/models/pharmacy-shrimp.glb?v=mp-39', closeUrl:'assets/models/pharmacy-shrimp-close.glb?v=mp-39' },
    'subway-ray':{ region:'town', id:'subway-ray', target:'subway', boardScale:0.38, url:'assets/models/subway-ray.glb?v=mp-41', closeUrl:'assets/models/subway-ray-close.glb?v=mp-41' },
    'friend-seal':{ region:'town', id:'friend-seal', target:'friend', boardScale:0.68, url:'assets/models/friend-seal.glb?v=mp-41', closeUrl:'assets/models/friend-seal-close.glb?v=mp-41' },
    bok:{ regions:['town','lagoon','caves','patterns','beach','light','captain'], id:'bok', target:'shopkeeper', url:'assets/models/bok.glb?v=mp-44', closeUrl:'assets/models/bok-close.glb?v=mp-44' }
  };
  // Call only after validating both the asset and its cast/reaction contract.
  // A board-only candidate can be activated with includeClose=false.
  function regionResidentEnable(id,includeClose){
    var candidate=REGION_RESIDENT_CANDIDATES[id]; if(!candidate) return false;
    var regions=candidate.regions || [candidate.region], added=false;
    regions.forEach(function(region){
      var entries=REGION_RESIDENT_MODELS[region] || [];
      if(!Array.isArray(entries)) entries=[entries];
      if(entries.some(function(entry){return entry.id===id;})) return;
      var entry=Object.assign({},candidate,{region:region}); delete entry.regions;
      if(includeClose===false) delete entry.closeUrl;
      entries.push(entry);REGION_RESIDENT_MODELS[region]=entries;added=true;
    });
    return added;
  }
  // Production opt-in: add an ID only after its board and close GLBs pass
  // geometry, texture, performance and cast review. Drafts stay dormant.
  var REGION_RESIDENT_VALIDATED_IDS = ['cafe-seahorse','jisu','shop-octopus','mira','echo','pip','hana','captain-bay','bok','restaurant-otter','hotel-whale','pharmacy-shrimp','subway-ray','friend-seal'];
  REGION_RESIDENT_VALIDATED_IDS.forEach(regionResidentEnable);
  var regionResidentInFlightCount=0, REGION_RESIDENT_MAX_INFLIGHT=1;
  var regionResidentInFlight=false;

  // Cached per-renderer procedural sunlit sky/ocean PMREM environment map for
  // living Pixar corneal sparkle, warm coastal rim bounce & satin oceanic sheen.
  function regionResidentCorneaEnvMap(view){
    var T=window.THREE;
    if(!T || !T.PMREMGenerator || !view || !view.renderer || typeof view.renderer.getContext!=='function') return null;
    var night=!!view.night;
    if(view._residentCorneaEnv && view._residentCorneaEnv.texture && view._residentCorneaEnvNight===night)
      return view._residentCorneaEnv.texture;
    if(view._residentCorneaEnvFailed) return null;
    var pmrem=null, geos=[], mats=[];
    try {
      var envScene=new T.Scene();
      envScene.background=new T.Color(night ? '#1c3556' : '#7ecbf0');
      var domeGeo=new T.SphereGeometry(12,24,16), pos=domeGeo.attributes.position, cols=new Float32Array(pos.count*3);
      var cZenith=new T.Color(night ? '#162b4d' : '#40a6e6');
      var cHorizon=new T.Color(night ? '#5a89ad' : '#fff5de');
      var cOceanHi=new T.Color(night ? '#1e5a78' : '#4ed0dc');
      var cOceanLo=new T.Color(night ? '#0d2238' : '#186a8c');
      var tmp=new T.Color();
      for(var i=0;i<pos.count;i++){
        var ny=pos.getY(i)/12;
        if(ny>=0) tmp.copy(cHorizon).lerp(cZenith,Math.pow(ny,.66));
        else tmp.copy(cOceanHi).lerp(cOceanLo,Math.pow(-ny,.64));
        cols[i*3]=tmp.r; cols[i*3+1]=tmp.g; cols[i*3+2]=tmp.b;
      }
      domeGeo.setAttribute('color',new T.BufferAttribute(cols,3));
      var domeMat=new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide});
      geos.push(domeGeo); mats.push(domeMat);
      envScene.add(new T.Mesh(domeGeo,domeMat));
      function addLightCard(radius,segs,hex,mult,x,y,z){
        var g=new T.CircleGeometry(radius,segs);
        var m=new T.MeshBasicMaterial({color:new T.Color(hex),side:T.DoubleSide});
        if(mult && mult!==1) m.color.multiplyScalar(mult);
        var card=new T.Mesh(g,m);
        card.position.set(x,y,z); card.lookAt(0,0,0);
        geos.push(g); mats.push(m);
        envScene.add(card);
      }
      // Layered upper-right sunlit sky window + crisp corneal sparkle hot-core matching the board sun rig.
      addLightCard(2.65,20,night ? '#ffeeb8' : '#ffefc8',night ? 1.05 : 1.28,4.6,6.4,5.4);
      addLightCard(0.92,16,night ? '#fff8df' : '#fffef4',night ? 1.55 : 2.35,4.55,6.35,5.32);
      // Soft opposite sky fill window for dimensional translucent eye & cheek wrap.
      addLightCard(3.10,16,night ? '#74b0d6' : '#dff6ff',night ? 1.0 : 1.08,-5.8,3.8,4.2);
      // Warm coastal back-rim sky cards so silhouette edges & gold trim glow from every camera angle.
      addLightCard(2.50,16,night ? '#78c4dc' : '#fff0cc',night ? 1.05 : 1.25,3.8,5.0,-5.8);
      addLightCard(2.40,16,night ? '#5ea6c8' : '#d8f3ff',night ? 0.95 : 1.10,-4.0,4.6,-5.6);
      // Lower turquoise oceanic caustic bounce + warm sunlit reef-sand bounce under chins & irises.
      addLightCard(3.60,16,night ? '#2e84a2' : '#7ae8ef',night ? 1.0 : 1.12,-1.6,-4.8,5.8);
      addLightCard(2.80,16,night ? '#1e5874' : '#f4e4c4',1.0,2.8,-5.2,4.4);
      pmrem=new T.PMREMGenerator(view.renderer);
      var rt=pmrem.fromScene(envScene,0.024);
      if(view._residentCorneaEnv && view._residentCorneaEnv.dispose) view._residentCorneaEnv.dispose();
      if(rt && rt.texture){
        rt.texture.userData=rt.texture.userData || {};
        rt.texture.userData.sharedResidentEnvMap=true;
      }
      view._residentCorneaEnv=rt;
      view._residentCorneaEnvNight=night;
      return rt ? rt.texture : null;
    } catch(e){
      view._residentCorneaEnvFailed=true;
      return null;
    } finally {
      if(pmrem && pmrem.dispose) try { pmrem.dispose(); } catch(e){}
      geos.forEach(function(g){ try { g.dispose(); } catch(e){} });
      mats.forEach(function(m){ try { m.dispose(); } catch(e){} });
    }
  }
  function regionResidentCanDefer(view){
    return !!(view && view.renderer && typeof requestAnimationFrame==='function');
  }
  function regionResidentCancelEnvMap(view){
    if(!view) return;
    if(view._residentEnvRaf && typeof cancelAnimationFrame==='function') cancelAnimationFrame(view._residentEnvRaf);
    if(view._residentEnvIdle && typeof cancelIdleCallback==='function') cancelIdleCallback(view._residentEnvIdle);
    if(view._residentEnvTimer) clearTimeout(view._residentEnvTimer);
    view._residentEnvRaf=null; view._residentEnvIdle=null; view._residentEnvTimer=null;
    view._residentEnvScheduled=false; view._residentEnvPending=null;
  }
  function regionResidentApplyEnvPending(view,envTex){
    var pending=view && view._residentEnvPending;
    if(!pending || !pending.length) return;
    view._residentEnvPending=null;
    if(!envTex) return;
    for(var i=0;i<pending.length;i++){
      var item=pending[i];
      if(!item || !item.mat || item.mat._residentDisposed) continue;
      item.mat.envMap=envTex;
      item.mat.envMapIntensity=item.isNight ? 0.62 : 0.72;
      item.mat.needsUpdate=true;
    }
  }
  function regionResidentScheduleEnvMap(view){
    if(!view || view._residentEnvScheduled || view._residentCorneaEnvFailed) return;
    if(!regionResidentCanDefer(view)) return;
    view._residentEnvScheduled=true;
    function buildNow(){
      view._residentEnvRaf=null; view._residentEnvIdle=null; view._residentEnvTimer=null;
      view._residentEnvScheduled=false;
      if(!view || !view.regionPeople || view.regionPeople.disposed || R3.view!==view || view.parked || (typeof document!=='undefined' && document.hidden)) return;
      var envTex=regionResidentCorneaEnvMap(view);
      regionResidentApplyEnvPending(view,envTex);
    }
    function waitFrames(){
      view._residentEnvRaf=null;
      if(!view || !view.regionPeople || view.regionPeople.disposed || R3.view!==view){ view._residentEnvScheduled=false; return; }
      if((view.frameN || 0)<3 && !view.encounter){
        view._residentEnvRaf=requestAnimationFrame(waitFrames);
        return;
      }
      if(typeof requestIdleCallback==='function'){
        view._residentEnvIdle=requestIdleCallback(buildNow,{timeout:240});
      } else {
        view._residentEnvTimer=setTimeout(buildNow,view.encounter ? 16 : 64);
      }
    }
    view._residentEnvRaf=requestAnimationFrame(waitFrames);
  }
  function regionResidentRelease(root){
    if(!root) return;
    var geometries=new Set(), materials=new Set(), textures=new Set(), skeletons=new Set();
    root.traverse(function(o){
      if(o.geometry) geometries.add(o.geometry);
      if(o.skeleton) skeletons.add(o.skeleton);
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function(m){
        materials.add(m);
        Object.keys(m).forEach(function(k){
          var v=m[k];
          if(v && v.isTexture && !(v.userData && v.userData.sharedResidentEnvMap)) textures.add(v);
        });
      });
    });
    skeletons.forEach(function(s){ if(s.dispose) s.dispose(); });
    geometries.forEach(function(g){ g.dispose(); }); materials.forEach(function(m){ m._residentDisposed=true; m.dispose(); }); textures.forEach(function(t){ t.dispose(); });
  }
  function regionResidentStates(view){
    var p=view && view.regionPeople;
    return p ? (p.residents || (p.resident ? [p.resident] : [])) : [];
  }
  function regionResidentAlive(view,state){
    return !!(view && view.regionPeople && !view.regionPeople.disposed &&
      regionResidentStates(view).indexOf(state)>=0 && !state.disposed && R3.view===view);
  }
  function regionResidentLoad(view){
    var p=view && view.regionPeople, registry=view && view.region && REGION_RESIDENT_MODELS[view.region.id];
    if(!p || p.disposed || !registry) return;
    if(!p.residents) p.residents=p.resident ? [p.resident] : [];
    (Array.isArray(registry) ? registry : [registry]).forEach(function(entry){
      if(window.REEF_RESIDENT_INLINE_ONLY && !(typeof document.getElementById==='function' && document.getElementById('reef-resident-inline-'+entry.id))) return;
      if(p.residents.some(function(state){return state.entry.id===entry.id;})) return;
      var id=entry.target || entry.id;
      var target=id==='host' && p.marker ? {object:p.marker,space:p.markerSpace} :
        id==='shopkeeper' && p.actor ? {object:p.actor,space:p.shop,fixedPos:true} :
        (p.towns || []).find(function(t){return t.meta.id===id;});
      if(!target || !target.object || !target.object.userData.regionBounds) return;
      var state={target:target,entry:entry,disposed:false,pending:null,root:null,mixer:null,lastTime:0,
        requested:false,point:new window.THREE.Vector3(),controller:null};
      p.residents.push(state);
    });
    // Compatibility for older diagnostics; ownership and routing use the list.
    p.resident=p.residents[0] || null;
  }
  function regionResidentRequest(view,state){
    if(state.requested || regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT || !regionResidentAlive(view,state)) return;
    state.requested=true; regionResidentInFlightCount++; regionResidentInFlight=regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT;
    var finished=false;
    var isEncounterFocus=!!(view.encounter && view.encounter.actor===state.target.object);
    var staggerParse=regionResidentCanDefer(view) && !isEncounterFocus;
    function finish(){
      if(!finished){
        finished=true;
        clearTimeout(state.timer); state.timer=null;
        if(state.parseRaf && typeof cancelAnimationFrame==='function'){ cancelAnimationFrame(state.parseRaf); state.parseRaf=null; }
        if(regionResidentInFlightCount>0) regionResidentInFlightCount--;
        regionResidentInFlight=regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT;
      }
    }
    state.cancel=finish;
    state.controller=typeof AbortController==='function' ? new AbortController() : null;
    // A loader can stall in either download or parse. A late parse result is
    // disposed below and cannot attach after this request is cancelled.
    state.timer=setTimeout(function(){if(state.controller) state.controller.abort(); finish();},10000);
    try { reefInstallGLTF(); } catch(e){ finish(); return; }
    var T=window.THREE;
    if(!T || !T.GLTFLoader){ finish(); return; }
    function network(){
      if(finished || !regionResidentAlive(view,state)){ finish(); return; }
      fetch(state.entry.url,state.controller ? {signal:state.controller.signal} : {}).then(function(response){
        if(!response.ok) throw new Error('Resident model HTTP '+response.status);
        return response.arrayBuffer();
      }).then(function(bytes){parse(bytes,false);}).catch(function(){finish();});
    }
    function runParse(bytes,fromInline){
      if(finished || !regionResidentAlive(view,state)){finish(); return;}
      function failed(){ if(finished) return; if(fromInline) network(); else finish(); }
      try { new T.GLTFLoader().parse(bytes,'',function(gltf){
        var accepted=!finished && regionResidentAlive(view,state);
        if(!accepted){finish(); if(gltf && gltf.scene) regionResidentRelease(gltf.scene); return;}
        if(!gltf || !gltf.scene){failed(); return;}
        finish(); state.pending=gltf;
        // Split GLB parse (frame N) from scene-graph instantiation & GPU upload (frame N+1)
        // for background board residents; keep active encounter intros immediate.
        if(staggerParse && !(view.encounter && view.encounter.actor===state.target.object)) return;
        regionResidentAttach(view,state);
      },failed); } catch(e){failed();}
    }
    function parse(bytes,fromInline){
      if(finished || !regionResidentAlive(view,state)){finish(); return;}
      if(staggerParse && !(view.encounter && view.encounter.actor===state.target.object)){
        state.parseRaf=requestAnimationFrame(function(){
          state.parseRaf=null;
          runParse(bytes,fromInline);
        });
      } else {
        runParse(bytes,fromInline);
      }
    }
    // Decode only after this resident is needed; a bad inline payload falls
    // back to the normal URL under the same request timeout.
    var inline=typeof document.getElementById==='function' && document.getElementById('reef-resident-inline-'+state.entry.id);
    var encoded=inline && inline.textContent && inline.textContent.trim();
    if(encoded){
      function decodeInline(){
        if(finished || !regionResidentAlive(view,state)){finish(); return;}
        try {
          var binary=atob(encoded), bytes=new Uint8Array(binary.length);
          for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
          runParse(bytes.buffer,true);
        } catch(e){network();}
      }
      if(staggerParse && !(view.encounter && view.encounter.actor===state.target.object)){
        state.parseRaf=requestAnimationFrame(function(){ state.parseRaf=null; decodeInline(); });
      } else decodeInline();
    } else network();
  }
  // A generated octopus may share one material across skin and costume. Its
  // UV-authored baseColor alpha mask must select skin only; OPAQUE keeps eyes,
  // clothes, props and suckers visible. No unmarked asset may replace the live
  // procedural colour reaction. The mask adds no texture request or draw call.
  function regionResidentPrepare(view,state,gltf,owner){
    var T=window.THREE, skin=state.target.skin, masked=[];
    gltf.scene.traverse(function(o){
      if(!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        if(m && m.map && o.geometry && o.geometry.attributes.uv &&
           ((m.userData && m.userData.residentSkinMask==='baseColorAlpha') || m.name==='OctopusSkinMask') && masked.indexOf(m)<0) masked.push(m);
      });
    });
    if(state.entry.skinMask && (!skin || !masked.length)) return false;
    var weights=null;
    if(state.entry.skinMask){
      // Complete any older interpolation before extending its mesh list: the
      // existing reaction captures that list's starting values at activation.
      if(typeof regionPeopleReactionCancel==='function') regionPeopleReactionCancel(view,true);
      var mode=skin.mode || 'natural';
      weights=new Float32Array([mode==='camouflage'?1:0,mode==='display'?1:0]);
      var adapter={attribute:{array:weights,needsUpdate:false},palette:{natural:[0,0],camouflage:[1,0],display:[0,1]}};
      skin.meshes.push(adapter);owner.skinAdapter={skin:skin,mesh:adapter};
    }
    var isNight=!!(view && view.night);
    var cachedEnv=(view && view._residentCorneaEnv && view._residentCorneaEnv.texture && view._residentCorneaEnvNight===isNight)
      ? view._residentCorneaEnv.texture : null;
    var deferEnv=!cachedEnv && regionResidentCanDefer(view) && !(view && view._residentCorneaEnvFailed);
    var corneaEnv=cachedEnv || (deferEnv ? null : regionResidentCorneaEnvMap(view));
    var canUseEnv=!!(corneaEnv || (deferEnv && T && T.PMREMGenerator && view && view.renderer && typeof view.renderer.getContext==='function'));
    gltf.scene.traverse(function(o){
      if(!o.isMesh) return;
      o.castShadow=false;o.receiveShadow=true;
      if(!o.userData.residentRaycastGuarded && o.raycast){
        var baseRaycast=o.raycast;
        o.raycast=function(raycaster,intersects){
          for(var p=this;p;p=p.parent) if(p.visible===false) return;
          return baseRaycast.call(this,raycaster,intersects);
        };
        o.userData.residentRaycastGuarded=true;
      }
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        if(!m) return;
        var pigment=!!(weights && masked.indexOf(m)>=0);
        if(pigment){m.transparent=false;m.alphaTest=0;m.opacity=1;}
        var isEyeMat=/eye|cornea|iris/i.test(m.name || '') || /eye|cornea|iris/i.test(o.name || '');
        var wantsCorneaEnv=!!(canUseEnv && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && (isEyeMat || m.roughnessMap || (typeof m.roughness==='number' && m.roughness<=.35)));
        var dedicatedEye=isEyeMat && !m.roughnessMap;
        if(wantsCorneaEnv){
          if(corneaEnv){
            m.envMap=corneaEnv;
            m.envMapIntensity=isNight ? 0.62 : 0.72;
          } else {
            if(!view._residentEnvPending) view._residentEnvPending=[];
            view._residentEnvPending.push({mat:m,isNight:isNight});
            regionResidentScheduleEnvMap(view);
          }
        }
        m.onBeforeCompile=function(shader){
          if(pigment){
            shader.uniforms.residentPigment={value:weights};
            shader.uniforms.residentGround={value:new T.Color(view.regionGround || '#b8aa94')};
            shader.fragmentShader='uniform float residentPigment[2];\nuniform vec3 residentGround;\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
              '#include <map_fragment>\n#ifdef USE_MAP\n'+
              'float residentMask=clamp(texelColor.a,0.0,1.0);\n'+
              'float residentMottle=0.5+0.5*sin(vUv.x*73.0+sin(vUv.y*51.0))*sin(vUv.y*67.0-vUv.x*31.0);\n'+
              // Texture luminance retains the authored shading and fine mottling.
              'float residentShade=clamp(dot(texelColor.rgb,vec3(0.2126,0.7152,0.0722))/0.42,0.18,1.8);\n'+
              'vec3 residentCamo=residentGround*(0.70+0.52*residentMottle)*residentShade;\n'+
              'vec3 residentDisplay=(residentMottle<0.31?vec3(0.078,0.009,0.019):residentMottle>0.69?vec3(0.930,0.855,0.784):vec3(0.376,0.028,0.050))*residentShade;\n'+
              'float residentMix=clamp(residentPigment[0]+residentPigment[1],0.0,1.0);\n'+
              'diffuseColor.rgb=diffuseColor.rgb*(1.0-residentMask*residentMix)+residentMask*(residentCamo*residentPigment[0]+residentDisplay*residentPigment[1]);\n'+
              'diffuseColor.a=opacity;\n#endif');
          }
          if(wantsCorneaEnv){
            if(!dedicatedEye){
              // Linear warm sunlit rim + luminous oceanic aqua bounce (strictly grazing-angle so matte face softness stays intact).
              shader.uniforms.residentRimSun={value:new T.Vector3(isNight?0.48:1.00,isNight?0.82:0.89,isNight?1.00:0.66)};
              shader.uniforms.residentRimSea={value:new T.Vector3(isNight?0.14:0.26,isNight?0.56:0.74,isNight?0.72:0.80)};
              shader.fragmentShader='uniform vec3 residentRimSun;\nuniform vec3 residentRimSea;\n'+shader.fragmentShader;
            }
            shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',
              '#include <lights_fragment_maps>\n#if defined( USE_ENVMAP )\n'+
              'float residentNdotV=clamp(dot(geometry.normal,geometry.viewDir),0.0,1.0);\n'+
              'float residentFresnel=pow(1.0-residentNdotV,3.1);\n'+
              (dedicatedEye
                ? '#if defined( RE_IndirectDiffuse )\niblIrradiance*=0.15;\n#endif\n'+
                  '#if defined( RE_IndirectSpecular )\nradiance*=(1.05+0.25*residentFresnel);\n#endif\n'
                : 'float residentSunSide=smoothstep(-0.35,0.68,geometry.normal.x*0.52+geometry.normal.y*0.85);\n'+
                  'float residentOceanUp=smoothstep(0.18,-0.72,geometry.normal.y);\n'+
                  // Directive #364: Strict cornea-only mirror reflections (roughness < 0.16) & matte-velvet body cap (<= 0.03) so bodies never look plastic/robotic!
                  'float residentCorneaMask=(1.0-smoothstep(0.10,0.16,material.specularRoughness))*(1.0-smoothstep(0.06,0.16,metalnessFactor));\n'+
                  'float residentMetalMask=smoothstep(0.32,0.68,metalnessFactor);\n'+
                  'float residentBodyMask=(1.0-residentCorneaMask)*(1.0-residentMetalMask);\n'+
                  'float residentSatinMask=(1.0-smoothstep(0.32,0.56,material.specularRoughness));\n'+
                  '#if defined( RE_IndirectDiffuse )\n'+
                  'iblIrradiance*=clamp(residentCorneaMask*0.15+residentMetalMask*0.12+residentBodyMask*(0.065+0.045*residentSunSide+0.025*residentOceanUp),0.0,1.0);\n'+
                  '#endif\n'+
                  '#if defined( RE_IndirectSpecular )\n'+
                  'radiance*=clamp(residentCorneaMask*(1.08+0.22*residentFresnel)+residentMetalMask*0.58+residentBodyMask*residentFresnel*residentSatinMask*0.025,0.0,1.35);\n'+
                  '#endif\n')+
              '#endif');
            if(!dedicatedEye){
              shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',
                '#include <lights_fragment_end>\n#if defined( USE_ENVMAP ) && defined( RE_IndirectDiffuse )\n'+
                'vec3 residentRimTint=mix(residentRimSea,residentRimSun,residentSunSide);\n'+
                'vec3 residentVelvetBase=mix(vec3(1.0),material.diffuseColor,0.62);\n'+
                'reflectedLight.indirectDiffuse+=residentVelvetBase*residentRimTint*residentFresnel*residentBodyMask*(0.025+0.075*residentSunSide+0.035*residentOceanUp);\n'+
                '#endif');
            }
          }
          // The board renderer uses linear output; encode like Shelly.
          shader.fragmentShader=shader.fragmentShader.replace('#include <encodings_fragment>','gl_FragColor = LinearTosRGB( gl_FragColor );');
        };
        m.customProgramCacheKey=function(){
          var activeEnv=!!(wantsCorneaEnv && m.envMap);
          return (pigment?'resident-srgb-mask':'resident-srgb')+(activeEnv?(dedicatedEye?'-eyeenv-v3':'-corneaenv-v3'):'-v1');
        };
        m.skinning=!!o.isSkinnedMesh;m.needsUpdate=true;
      });
    });
    return true;
  }
  function regionResidentSkinRelease(owner){
    var adapter=owner.skinAdapter;if(!adapter) return;
    var i=adapter.skin.meshes.indexOf(adapter.mesh);if(i>=0) adapter.skin.meshes.splice(i,1);
    owner.skinAdapter=null;
  }
  function regionResidentEncounterShift(actor,ep,interior){
    if(!ep || (!ep.roomX && !ep.roomZ && !ep.xShift && !ep.zShift)) return {x:0,z:0};
    var s=(actor && actor.scale && actor.scale.y) || 1;
    var lx=(ep.xShift||0)/s, lz=(ep.zShift||0)/s;
    if(ep.roomX || ep.roomZ){
      var rx=ep.roomX||0, rz=ep.roomZ||0;
      var relYaw=(interior && typeof interior.yaw==='number' && actor && actor.rotation) ? (actor.rotation.y-interior.yaw) : 0;
      var c=Math.cos(relYaw), sn=Math.sin(relYaw);
      lx+=(rx*c-rz*sn)/s;
      lz+=(rx*sn+rz*c)/s;
    }
    return {x:lx,z:lz};
  }
  function regionResidentApplyPose(root,anchor,yaw,pitch,pitchYaw,roll,yOff,useEuler,xOff,zOff){
    if(!root || !anchor) return;
    var T=window.THREE, ox=xOff||0, oz=zOff||0;
    if((pitch || roll) && T && T.Quaternion && T.Vector3){
      var q;
      if(useEuler && T.Euler){
        q=new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,roll,'YXZ'));
      } else {
        // Board-only nose-up pitch toward the overhead board camera (resets cleanly to 0 during encounters).
        // Applying Ry(pitchYaw) * Rx(pitch) * Ry(yaw - pitchYaw) keeps eyes horizontally level in 3/4 view.
        q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),pitchYaw)
          .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch))
          .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw-pitchYaw));
      }
      root.rotation.order='YXZ';
      root.rotation.setFromQuaternion(q,'YXZ');
      var v=new T.Vector3(anchor.cx,anchor.cy||0,anchor.cz).applyQuaternion(q);
      root.position.x=anchor.baseX-v.x+ox;
      if(typeof anchor.baseY==='number') root.position.y=anchor.baseY+yOff+((anchor.cy||0)-v.y);
      root.position.z=anchor.baseZ-v.z+oz;
    } else {
      var cy=Math.cos(yaw), sy=Math.sin(yaw);
      root.rotation.order='YXZ';
      root.rotation.set(0,yaw,0);
      root.position.x=anchor.baseX-(anchor.cx*cy+anchor.cz*sy)+ox;
      if(typeof anchor.baseY==='number') root.position.y=anchor.baseY+yOff;
      root.position.z=anchor.baseZ-(-anchor.cx*sy+anchor.cz*cy)+oz;
    }
  }
  function regionResidentApplyBoardYaw(state,inEncounter,hasInterior,encounterRegion){
    if(!state) return;
    var actor=state.target && state.target.object;
    var sh=actor && actor.userData && actor.userData.contactShadow;
    if(sh && sh.userData && (sh.userData.isWaterRipple || sh.userData.isContactShadow)) sh.visible=!inEncounter;
    if(!state.root || !state.fitAnchor) return;
    var ud=actor && actor.userData;
    var allowEp=!!(inEncounter && ud && ud.encounterPose && (hasInterior || (ud.encounterPose.allowOutdoor && encounterRegion==='beach')));
    var ep=allowEp ? ud.encounterPose : null;
    var yaw=ep ? (ep.yaw||0) : ((!inEncounter && ud && typeof ud.boardYaw==='number') ? ud.boardYaw : 0);
    var pitch=ep ? (ep.pitch||0) : ((!inEncounter && ud && typeof ud.boardPitch==='number') ? ud.boardPitch : 0);
    var pitchYaw=ep ? yaw : ((!inEncounter && ud && typeof ud.boardPitchYaw==='number') ? ud.boardPitchYaw : yaw);
    var roll=ep ? (ep.roll||0) : 0;
    var yOff=ep ? ((ep.yLift||0)/(actor.scale.y || 1)) : ((!inEncounter && ud && typeof ud.boardYOffset==='number') ? ud.boardYOffset/(actor.scale.y || 1) : 0);
    var shift=regionResidentEncounterShift(actor,ep,hasInterior);
    var xOff=shift.x, zOff=shift.z;
    var useEuler=!!ep;
    if(state.appliedYaw===yaw && state.appliedPitch===pitch && state.appliedPitchYaw===pitchYaw && state.appliedRoll===roll && state.appliedYOff===yOff && state.appliedXOff===xOff && state.appliedZOff===zOff && state.appliedEuler===useEuler) return;
    state.appliedYaw=yaw; state.appliedPitch=pitch; state.appliedPitchYaw=pitchYaw; state.appliedRoll=roll; state.appliedYOff=yOff; state.appliedXOff=xOff; state.appliedZOff=zOff; state.appliedEuler=useEuler;
    regionResidentApplyPose(state.root,state.fitAnchor,yaw,pitch,pitchYaw,roll,yOff,useEuler,xOff,zOff);
  }
  var regionResidentGazeScratch=null;
  function regionResidentFindGazeBone(root){
    if(!root || typeof root.traverse!=='function') return null;
    var head=null, neck=null, mantle=null;
    root.traverse(function(o){
      var nm=o && o.name;
      if(!nm) return;
      if(!head && /^Head$/i.test(nm)) head=o;
      else if(!neck && /^Neck$/i.test(nm)) neck=o;
      else if(!mantle && /^Mantle$/i.test(nm)) mantle=o;
    });
    return head || neck || mantle || null;
  }
  // Directive #364 (Mutual Eye Contact): Smooth world-space head gaze tracking toward Shelly's head during
  // every encounter & whenever Shelly approaches within 9.5u on the board (invariant to local bone axes!).
  function regionResidentApplyGaze(view,state,player,dt,inEncounter){
    var T=window.THREE;
    if(!T || !T.Vector3 || !T.Quaternion || !player || !player.root) return;
    if(typeof player.root.getWorldQuaternion!=='function') return;
    var actor=state && state.target && state.target.object;
    if(!actor) return;
    if(!player._gazeResolved){
      player._gazeBone=regionResidentFindGazeBone(player.root);
      player._gazeResolved=true;
      player._gazeYaw=0;
      player._gazePitch=0;
      player._gazeBaseQ=null;
      player._gazeLastOutQ=null;
    }
    var bone=player._gazeBone;
    if(!bone || !bone.parent || !bone.quaternion || typeof bone.parent.getWorldQuaternion!=='function') return;
    if(!regionResidentGazeScratch){
      regionResidentGazeScratch={
        up:new T.Vector3(0,1,0),
        headPos:new T.Vector3(),
        tgtPos:new T.Vector3(),
        toTgt:new T.Vector3(),
        fwd:new T.Vector3(),
        fwdYawed:new T.Vector3(),
        right:new T.Vector3(),
        rootQ:new T.Quaternion(),
        parentQ:new T.Quaternion(),
        parentInvQ:new T.Quaternion(),
        qYaw:new T.Quaternion(),
        qPitch:new T.Quaternion(),
        qWorldDelta:new T.Quaternion(),
        qLocalDelta:new T.Quaternion()
      };
    }
    var sc=regionResidentGazeScratch;
    // FPS Fix #378: Skip odd frames on non-encounter board residents (re-apply cached gaze delta if bone was reset by mixer, near-zero CPU cost!).
    if(!inEncounter && view && typeof view.frameN==='number' && (view.frameN & 1)===1){
      if(player._gazeLastDeltaQ && (Math.abs(player._gazeYaw)>=0.001 || Math.abs(player._gazePitch)>=0.001)){
        if(!player._gazeLastOutQ || Math.abs(bone.quaternion.dot(player._gazeLastOutQ))<=0.999998){
          if(!player._gazeBaseQ) player._gazeBaseQ=new T.Quaternion();
          player._gazeBaseQ.copy(bone.quaternion);
          bone.quaternion.premultiply(player._gazeLastDeltaQ);
          if(!player._gazeLastOutQ) player._gazeLastOutQ=new T.Quaternion();
          player._gazeLastOutQ.copy(bone.quaternion);
        }
      }
      return;
    }
    // Non-accumulating base-pose tracking so static bones, dt===0, & reefCalm() never spin!
    if(player._gazeLastOutQ && player._gazeBaseQ && Math.abs(bone.quaternion.dot(player._gazeLastOutQ))>0.999998){
      bone.quaternion.copy(player._gazeBaseQ);
    } else {
      if(!player._gazeBaseQ) player._gazeBaseQ=new T.Quaternion();
      player._gazeBaseQ.copy(bone.quaternion);
    }

    var fwdBias=(state && state.entry && typeof state.entry.localFwdYaw==='number') ? state.entry.localFwdYaw : 0;
    var fwdX=fwdBias ? Math.sin(fwdBias) : 0, fwdZ=fwdBias ? Math.cos(fwdBias) : 1;
    function syncActorWorld(){
      var ax=actor.position.x, ay=actor.position.y, az=actor.position.z;
      var ary=actor.rotation ? actor.rotation.y : 0;
      var rry=player.root.rotation ? player.root.rotation.y : 0;
      if(inEncounter || !player._gazeMatReady ||
         player._gazeAx!==ax || player._gazeAy!==ay || player._gazeAz!==az ||
         player._gazeAry!==ary || player._gazeRry!==rry){
        actor.updateMatrixWorld(true);
        player._gazeMatReady=true;
        player._gazeAx=ax; player._gazeAy=ay; player._gazeAz=az;
        player._gazeAry=ary; player._gazeRry=rry;
      }
    }

    var guide=view && view.guide;
    var hasGuide=!!(guide && guide.position && guide.visible!==false);
    var useCamFallback=!!(inEncounter && !hasGuide && view && view.cam && view.cam.position);
    var targetYaw=0, targetPitch=0, wantGaze=false;
    if(hasGuide || useCamFallback){
      if(hasGuide){
        sc.tgtPos.set(guide.position.x,guide.position.y+0.55,guide.position.z);
      } else {
        sc.tgtPos.copy(view.cam.position);
      }
      var dxG=sc.tgtPos.x-actor.position.x, dzG=sc.tgtPos.z-actor.position.z;
      if(inEncounter || (dxG*dxG+dzG*dzG)<13.5*13.5){
        syncActorWorld();
        sc.headPos.setFromMatrixPosition(bone.matrixWorld);
        player.root.getWorldQuaternion(sc.rootQ);
        sc.fwd.set(fwdX,0,fwdZ).applyQuaternion(sc.rootQ);
        sc.fwd.y=0;
        var fLen=sc.fwd.length();
        if(fLen>1e-4){
          sc.fwd.divideScalar(fLen);
          sc.toTgt.subVectors(sc.tgtPos,sc.headPos);
          var hDist=Math.hypot(sc.toTgt.x,sc.toTgt.z);
          if(hDist>0.12){
            var curAz=Math.atan2(sc.fwd.x,sc.fwd.z);
            var tgtAz=Math.atan2(sc.toTgt.x,sc.toTgt.z);
            var rawYaw=Math.atan2(Math.sin(tgtAz-curAz),Math.cos(tgtAz-curAz));
            if(inEncounter || Math.abs(rawYaw)<2.15){
              targetYaw=Math.max(-0.68,Math.min(0.68,rawYaw));
              var rawPitch=Math.atan2(sc.toTgt.y,Math.max(0.25,hDist));
              targetPitch=Math.max(-0.28,Math.min(0.22,rawPitch));
              wantGaze=true;
            }
          }
        }
      }
    }
    var stepDt=(!inEncounter && view && typeof view.frameN==='number') ? (dt*2) : dt;
    var firstSnap=!!(wantGaze && !player._gazeSettled);
    var instant=firstSnap || !!((inEncounter || wantGaze) && (dt<=0 || (typeof reefCalm==='function' && reefCalm())));
    var ease=instant ? 1 : (stepDt>0 ? (1-Math.exp(-stepDt*7.5)) : 0);
    if(ease>0){
      player._gazeYaw+=(targetYaw-player._gazeYaw)*ease;
      player._gazePitch+=(targetPitch-player._gazePitch)*ease;
      if(wantGaze) player._gazeSettled=true;
    }
    if(Math.abs(player._gazeYaw)<0.001 && Math.abs(player._gazePitch)<0.001){
      if(!wantGaze){ player._gazeYaw=0; player._gazePitch=0; }
      player._gazeLastDeltaQ=null;
      if(!player._gazeLastOutQ) player._gazeLastOutQ=new T.Quaternion();
      player._gazeLastOutQ.copy(bone.quaternion);
      return;
    }
    if(!wantGaze){
      syncActorWorld();
      player.root.getWorldQuaternion(sc.rootQ);
      sc.fwd.set(fwdX,0,fwdZ).applyQuaternion(sc.rootQ);
      sc.fwd.y=0;
      if(sc.fwd.lengthSq()>1e-6) sc.fwd.normalize(); else sc.fwd.set(0,0,1);
    }
    // World-space quaternion conjugation: Q_local_new = Q_parent^-1 * Q_worldDelta * Q_parent * Q_local_base
    bone.parent.getWorldQuaternion(sc.parentQ);
    sc.parentInvQ.copy(sc.parentQ).conjugate();
    sc.qYaw.setFromAxisAngle(sc.up,player._gazeYaw);
    sc.fwdYawed.copy(sc.fwd).applyQuaternion(sc.qYaw);
    sc.right.crossVectors(sc.fwdYawed,sc.up);
    if(sc.right.lengthSq()>1e-6) sc.right.normalize(); else sc.right.set(-1,0,0);
    sc.qPitch.setFromAxisAngle(sc.right,player._gazePitch);
    sc.qWorldDelta.multiplyQuaternions(sc.qPitch,sc.qYaw);
    sc.qLocalDelta.multiplyQuaternions(sc.parentInvQ,sc.qWorldDelta).multiply(sc.parentQ);
    if(!player._gazeLastDeltaQ) player._gazeLastDeltaQ=new T.Quaternion();
    player._gazeLastDeltaQ.copy(sc.qLocalDelta);
    bone.quaternion.premultiply(sc.qLocalDelta);
    if(!player._gazeLastOutQ) player._gazeLastOutQ=new T.Quaternion();
    player._gazeLastOutQ.copy(bone.quaternion);
  }
  function regionResidentAttach(view,state){
    if(!regionResidentAlive(view,state) || !state.pending || view.parked ||
       !view.wrap.isConnected || document.hidden) return false;
    var T=window.THREE, actor=state.target.object, gltf=state.pending, model=gltf.scene;
    var encounter=view.encounter, matchingIntro=!!(encounter && encounter.phase==='intro' &&
      encounter.actor===actor && regionEncounterActive(view));
    if(encounter && !matchingIntro) return false;
    if(state.close && state.close.root) return false;
    var old=actor.userData.regionBounds, scale=actor.scale.y || 1;
    if(!state.baseHeight) state.baseHeight=old.height;
    var visual=actor.userData.deliveryMotion || actor;
    var box=new T.Box3().setFromObject(model), size=new T.Vector3(), center=new T.Vector3();
    box.getSize(size); box.getCenter(center);
    if(!isFinite(size.y) || size.y<.001){ state.pending=null; regionResidentRelease(model); return false; }
    // Fit to the old unscaled body height, then preserve the species-scale root.
    var factor=((old.height/scale)/size.y)*(state.entry.boardScale || 1), fit=new T.Group();
    fit.scale.setScalar(factor);
    var fitBaseY=(old.centerY-old.height/2)/scale-box.min.y*factor;
    fit.position.set(old.centerX/scale-center.x*factor,fitBaseY,old.centerZ/scale-center.z*factor);
    if(!regionResidentPrepare(view,state,gltf,state)){state.pending=null;regionResidentRelease(model);return false;}
    fit.add(model);
    // Detach temporarily for a true bound of the replacement; keep the old
    // children hidden for shared-resource cleanup with the rest of the view.
    var fallback=visual.children.slice(), fallbackVisibility=fallback.map(function(o){return o.visible;});
    var tag=null;
    fallback.forEach(function(o){o.traverse(function(c){if(tag==null && c.userData && c.userData.regionPerson!=null) tag=c.userData.regionPerson;});});
    if(tag!=null) fit.traverse(function(c){if(c.isMesh) c.userData.regionPerson=tag;});
    fallback.forEach(function(o){visual.remove(o);});
    var introYaw=actor.rotation.y;
    if(matchingIntro) actor.rotation.y=encounter.savedActorTransform.rotation.y;
    visual.add(fit); regionPeopleCacheBounds(actor);
    if(matchingIntro) actor.rotation.y=introYaw;
    fallback.forEach(function(o){o.visible=false;visual.add(o);});
    // The far-away fallback must clear the tiles too.
    if(!state.target.fixedPos){
      var nb=actor.userData.regionBounds;
      var footprint={radius:Math.max(old.radius,nb.radius),centerX:nb.centerX,centerY:nb.centerY,centerZ:nb.centerZ,width:nb.width,height:nb.height,depth:nb.depth,top:nb.top};
      var where=regionPeoplePlacement(view,state.target.space,footprint,state.entry.target==='subway' || state.entry.id==='subway',actor);
      actor.position.x=where.x; if(typeof where.y==='number') actor.position.y=where.y; actor.position.z=where.z;
      if(typeof where.boardYaw==='number') actor.userData.boardYaw=where.boardYaw;
      if(typeof where.boardPitch==='number') actor.userData.boardPitch=where.boardPitch;
      if(typeof where.boardPitchYaw==='number') actor.userData.boardPitchYaw=where.boardPitchYaw;
      if(typeof where.boardYOffset==='number') actor.userData.boardYOffset=where.boardYOffset;
      if(where.labelOffset) actor.userData.labelOffset=where.labelOffset;
      if(typeof regionPeopleTrackPlaced==='function') regionPeopleTrackPlaced(view,actor,state.target.space,where.x,where.z,footprint.radius);
      if(matchingIntro){
        encounter.savedActorTransform.position.x=where.x;
        if(typeof where.y==='number') encounter.savedActorTransform.position.y=where.y;
        encounter.savedActorTransform.position.z=where.z;
      }
    } else if(typeof regionPeopleTrackPlaced==='function'){
      regionPeopleTrackPlaced(view,actor,state.target.space,actor.position.x,actor.position.z,actor.userData.regionBounds.radius);
    }
    if(typeof regionPeopleSyncShadow==='function') regionPeopleSyncShadow(actor);
    // CRIT-2: Invalidate Kiko's cached spot/move clearance so Kiko immediately re-checks 3D clearance around any swapped resident GLB.
    view._crabMoveCache=null;
    view._crabSpotCache=null;
    if(matchingIntro) encounter.actorBounds=actor.userData.regionBounds;
    actor.userData.hasResidentGlb=true;
    if(!matchingIntro) actor.rotation.y=0;
    state.pending=null; state.root=fit; state.fitAnchor={baseX:old.centerX/scale,baseY:fitBaseY,baseZ:old.centerZ/scale,cx:center.x*factor,cy:center.y*factor,cz:center.z*factor}; state.appliedYaw=0; state.appliedPitch=0; state.appliedPitchYaw=0; state.appliedRoll=0; state.appliedYOff=0; state.appliedXOff=0; state.appliedZOff=0; state.appliedEuler=false;
    state.fallback=fallback.map(function(o,i){return {object:o,visible:fallbackVisibility[i]};}); state.detailed=true;
    if(matchingIntro && encounter && encounter.interior && typeof regionEncounterInteriorPlaceActor==='function'){
      regionResidentApplyBoardYaw(state,true,null,encounter.region);
      regionEncounterInteriorPlaceActor(view,encounter);
      regionResidentApplyBoardYaw(state,true,encounter.interior,encounter.region);
    } else {
      regionResidentApplyBoardYaw(state,matchingIntro,null,encounter ? encounter.region : null);
    }
    if(gltf.animations && gltf.animations.length){
      var idle=gltf.animations.find(function(a){return a.name==='Idle';});
      if(idle){
        state.mixer=new T.AnimationMixer(model); state.action=state.mixer.clipAction(idle); state.action.play();
        var react=gltf.animations.find(function(a){return a.name==='React';});
        if(react){ state.react=state.mixer.clipAction(react); state.react.setLoop(T.LoopOnce,1);
          state.mixer.addEventListener('finished',function(e){ if(e.action===state.react){state.action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();state.react.crossFadeTo(state.action,.18,false);} }); }
      }
    }
    state.lastTime=0;
    if(matchingIntro) regionResidentEncounter(view,actor);
    return true;
  }
  function regionResidentTick(view,now){
    var states=regionResidentStates(view);
    // Give the current encounter its close asset before another near-board
    // resident claims the single global fetch/parse transaction.
    states.forEach(function(state){
      if(regionResidentAlive(view,state) && view.encounter && view.encounter.actor===state.target.object &&
         !view.parked && view.wrap.isConnected && !document.hidden) regionResidentCloseRequest(view,state);
    });
    // Prioritize region hosts ahead of the shopkeeper so hosts claim the
    // single global fetch/parse slot first on regions like Lighthouse.
    // Visibility-first: on-screen residents claim the slot before off-screen
    // ones, then nearest to the guide, then hosts ahead of shopkeepers.
    var gp=view.guide && view.guide.position;
    function rank(state){
      var actor=state.target && state.target.object, vis=0, d2=0;
      if(actor && actor.position){
        if(view.cam && state.point && state.point.copy){
          var p=state.point.copy(actor.position);
          if(actor.userData && actor.userData.regionBounds) p.y+=actor.userData.regionBounds.centerY||0;
          p.project(view.cam);
          vis=(Math.abs(p.x)<1.15 && Math.abs(p.y)<1.15 && p.z>-1 && p.z<1)?0:1;
        }
        if(gp){ var dx=actor.position.x-gp.x, dz=actor.position.z-gp.z; d2=dx*dx+dz*dz; }
      }
      var t=state.entry.target, id=state.entry.id;
      var heroFg=(t==='host' || id==='hotel-whale' || id==='friend-seal' || id==='pharmacy-shrimp');
      return {vis:vis,d2:d2,pri:heroFg?0:(t==='shopkeeper'?2:1)};
    }
    var ranks=new Map();
    states.forEach(function(state){ranks.set(state,rank(state));});
    var ordered=states.slice().sort(function(a,b){
      var ra=ranks.get(a), rb=ranks.get(b);
      return (ra.vis-rb.vis) || (ra.d2-rb.d2) || (ra.pri-rb.pri);
    });
    var deferMode=regionResidentCanDefer(view);
    var frameN=view && typeof view.frameN==='number' ? view.frameN : 0;
    var tickBudget={
      defer:deferMode,
      attachesLeft:deferMode ? 1 : Infinity,
      canRequestBoard:!deferMode || (frameN>=1 &&
        (view._residentNextReqFrame==null || frameN>=view._residentNextReqFrame) &&
        (view._residentNextReqAt==null || now>=view._residentNextReqAt))
    };
    ordered.forEach(function(state){regionResidentTickOne(view,state,now,tickBudget);});
  }
  function regionResidentTickOne(view,state,now,tickBudget){
    if(!regionResidentAlive(view,state)) return;
    if(state.close && (view.encounter!==state.close.encounter || !regionEncounterActive(view))) regionResidentCloseEndOne(view,state,state.close.encounter);
    if(view.parked || !view.wrap.isConnected || document.hidden){state.lastTime=0; return;}
    var actor=state.target.object, guide=view.guide && view.guide.position;
    var dx=guide ? guide.x-actor.position.x : Infinity, dz=guide ? guide.z-actor.position.z : Infinity;
    var isEncActor=!!(view.encounter && view.encounter.actor===actor);
    var focused=!view.encounter || isEncActor;
    var allowRequest=isEncActor || !tickBudget || tickBudget.canRequestBoard;
    if(focused && allowRequest && !state.requested && !state.root && (isEncActor || dx*dx+dz*dz<52*52)){
      regionResidentRequest(view,state);
      if(tickBudget && !isEncActor) tickBudget.canRequestBoard=false;
    }
    if(state.pending && (isEncActor || !tickBudget || tickBudget.attachesLeft>0)){
      if(regionResidentAttach(view,state) && tickBudget && tickBudget.defer && !isEncActor){
        tickBudget.attachesLeft--;
        tickBudget.canRequestBoard=false;
        view._residentNextReqFrame=(view.frameN || 0)+1;
        view._residentNextReqAt=now+16;
      }
    }
    if(view.encounter && view.encounter.actor===actor && regionEncounterActive(view)) regionResidentCloseRequest(view,state);
    var close=state.close && state.close.root ? state.close : null;
    if(!state.root && !close) return;
    var seen=!!(view.encounter && view.encounter.actor===actor);
    if(!seen && actor.visible && view.cam){
      var point=state.point.copy(actor.position); point.y+=actor.userData.regionBounds.centerY; point.project(view.cam);
      seen=point.z>-1 && point.z<1 && Math.abs(point.x)<1.2 && Math.abs(point.y)<1.2;
    }
    // Keep the authored mesh for a nearby visible resident or its encounter;
    // the lightweight procedural version carries far-away board views.
    var inEncounter=!!(view.encounter && view.encounter.actor===actor);
    var encRegion=inEncounter && view.encounter ? view.encounter.region : null;
    regionResidentApplyBoardYaw(state,inEncounter,(inEncounter && !close) ? view.encounter.interior : null,encRegion);
    var limit=state.detailed ? 54 : 48;
    var detailed=seen && (inEncounter || dx*dx+dz*dz<limit*limit);
    if(detailed!==state.detailed){
      state.detailed=detailed;
      if(state.root) state.root.visible=detailed && !close;
      if(state.fallback) state.fallback.forEach(function(item){item.object.visible=!detailed && !close && item.visible;});
    } else if(close && state.root && state.root.visible){
      state.root.visible=false;
    }
    var player=close || state;
    if(!detailed) { player.lastTime=0; return; }
    var calmNow=typeof reefCalm==='function' && reefCalm();
    var dt=0;
    if(!player.mixer || calmNow){
      player.lastTime=0;
    } else {
      var elapsed=player.lastTime ? (now-player.lastTime)/1000 : 0;
      dt=elapsed>0 && elapsed<.25 ? Math.min(.1,elapsed) : 0;
      player.lastTime=now;
      player.mixer.update(dt);
    }
    regionResidentApplyGaze(view,state,player,dt,inEncounter);
  }
  function regionResidentFindState(target){
    if(!target) return null;
    if(target.entry && target.target) return target;
    var view=(target.regionPeople && target.scene) ? target : (typeof R3!=='undefined' && R3.view);
    var actor=target.encounter ? target.encounter.actor : (target.isObject3D || target.position) ? target : null;
    if(!view || !actor) return null;
    return regionResidentStates(view).find(function(item){return item.target && item.target.object===actor;}) || null;
  }
  function regionResidentPlayReact(stateOrActor,mood){
    if(typeof reefCalm==='function' && reefCalm()) return false;
    var state=regionResidentFindState(stateOrActor);
    if(!state || state.disposed) return false;
    var view=(stateOrActor && stateOrActor.regionPeople && stateOrActor.scene) ? stateOrActor : (typeof R3!=='undefined' && R3.view);
    if(view && !regionResidentAlive(view,state)) return false;
    var player=(state.close && state.close.root) ? state.close : (state.root && state.detailed ? state : null);
    if(!player || !player.mixer || !player.react) return false;
    var speed=mood==='happy' ? 1.15 : mood==='encourage' ? .92 : 1;
    player.react.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).play();
    if(player.action && player.action!==player.react && player.action.isRunning()){
      player.action.crossFadeTo(player.react,.14,false);
    }
    return true;
  }
  function regionResidentEncounter(view,actor){
    var state=regionResidentStates(view).find(function(item){return item.target.object===actor;});
    if(!state || !regionResidentAlive(view,state)) return;
    regionResidentApplyBoardYaw(state,true,view.encounter ? view.encounter.interior : null,view.encounter ? view.encounter.region : null);
    if(state.root && !state.detailed){ state.detailed=true; state.root.visible=true; state.fallback.forEach(function(item){item.object.visible=false;}); }
    regionResidentPlayReact(state);
    regionResidentCloseRequest(view,state);
  }
  // The close asset is scoped to one encounter. The board model stays cached,
  // and is restored immediately when that encounter ends.
  function regionResidentCloseRequest(view,state){
    if(!regionResidentAlive(view,state) || view.parked || !view.wrap.isConnected || document.hidden) return;
    var e=view.encounter, entry=state.entry;
    // The portable edition has a fixed byte limit and embeds the board model.
    // Its close view still gets the sharper render budget without a missing URL.
    if(typeof document.getElementById==='function' && document.getElementById('reef-resident-inline-'+entry.id) &&
       !document.getElementById('reef-resident-inline-'+entry.id+'-close')) return;
    if(!entry.closeUrl || !e || e.actor!==state.target.object || !regionEncounterActive(view) ||
       (e.phase!=='intro' && e.phase!=='lesson') || state.close || regionResidentInFlight || regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT) return;
    var close=state.close={encounter:e,root:null,controller:typeof AbortController==='function'?new AbortController():null,lastTime:0};
    regionResidentInFlightCount++; regionResidentInFlight=regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT;
    var finished=false;
    function finish(){if(!finished){finished=true;clearTimeout(close.timer);if(regionResidentInFlightCount>0) regionResidentInFlightCount--;regionResidentInFlight=regionResidentInFlightCount>=REGION_RESIDENT_MAX_INFLIGHT;}}
    close.cancel=finish;
    close.timer=setTimeout(function(){if(close.controller) close.controller.abort();finish();},10000);
    function valid(){return !finished && regionResidentAlive(view,state) && state.close===close &&
      view.encounter===e && (e.phase==='intro' || e.phase==='lesson') && regionEncounterActive(view);}
    function network(){
      if(!valid()){finish();return;}
      fetch(entry.closeUrl,close.controller?{signal:close.controller.signal}:{}).then(function(r){
        if(!r.ok) throw new Error('Resident close model HTTP '+r.status);return r.arrayBuffer();
      }).then(function(b){parse(b,false);}).catch(finish);
    }
    function parse(bytes,inline){
      if(!valid()){finish();return;}
      function failed(){if(finished)return; if(inline) network();else finish();}
      try {new window.THREE.GLTFLoader().parse(bytes,'',function(gltf){
        var ok=valid();finish();
        if(!ok){if(gltf && gltf.scene) regionResidentRelease(gltf.scene);return;}
        if(!gltf || !gltf.scene) return;
        regionResidentCloseAttach(view,state,close,gltf);
      },failed);} catch(err){failed();}
    }
    try {reefInstallGLTF();} catch(err){finish();return;}
    if(!window.THREE.GLTFLoader){finish();return;}
    var tag=typeof document.getElementById==='function' && document.getElementById('reef-resident-inline-'+entry.id+'-close');
    var encoded=tag && tag.textContent && tag.textContent.trim();
    if(encoded){try{var binary=atob(encoded),bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);parse(bytes.buffer,true);}catch(err){network();}}
    else network();
  }
  function regionResidentCloseAttach(view,state,close,gltf){
    if(!regionResidentAlive(view,state) || state.close!==close || view.encounter!==close.encounter ||
       !regionEncounterActive(view) || (close.encounter.phase!=='intro' && close.encounter.phase!=='lesson')){regionResidentRelease(gltf.scene);return;}
    var T=window.THREE, actor=state.target.object, visual=actor.userData.deliveryMotion || actor;
    var old=actor.userData.regionBounds, scale=actor.scale.y || 1, model=gltf.scene;
    var box=new T.Box3().setFromObject(model),size=new T.Vector3(),center=new T.Vector3(); box.getSize(size);box.getCenter(center);
    if(!isFinite(size.y) || size.y<.001){regionResidentRelease(model);return;}
    var baseH=(state.entry.boardScale && state.baseHeight) ? state.baseHeight : old.height;
    var factor=(baseH/scale)/size.y,fit=new T.Group();fit.scale.setScalar(factor);
    var fitBaseX=old.centerX/scale,fitBaseY=(old.centerY-old.height/2)/scale-box.min.y*factor,fitBaseZ=old.centerZ/scale;
    fit.position.set(fitBaseX-center.x*factor,fitBaseY,fitBaseZ-center.z*factor);
    if(!regionResidentPrepare(view,state,gltf,close)){regionResidentRelease(model);return;}
    fit.add(model);
    var previous=visual.children.slice(), visibility=previous.map(function(o){return o.visible;});
    var tag=null;
    previous.forEach(function(o){o.traverse(function(c){if(tag==null && c.userData && c.userData.regionPerson!=null) tag=c.userData.regionPerson;});});
    if(tag!=null) fit.traverse(function(c){if(c.isMesh) c.userData.regionPerson=tag;});
    previous.forEach(function(o){visual.remove(o);});
    var e=close.encounter,yaw=actor.rotation.y;actor.rotation.y=e.savedActorTransform.rotation.y;
    visual.add(fit);regionPeopleCacheBounds(actor);actor.rotation.y=yaw;
    previous.forEach(function(o){o.visible=false;visual.add(o);});
    if(!state.target.fixedPos && !e.interior){
      var cb=actor.userData.regionBounds;
      if(state.entry.boardScale && state.entry.boardScale<1) close.previousPosition=actor.position.clone();
      var where=regionPeoplePlacement(view,state.target.space,{radius:Math.max(old.radius,cb.radius),centerX:cb.centerX,centerY:cb.centerY,centerZ:cb.centerZ,width:cb.width,height:cb.height,depth:cb.depth,top:cb.top},state.entry.target==='subway' || state.entry.id==='subway',actor);
      actor.position.x=where.x; if(typeof where.y==='number') actor.position.y=where.y; actor.position.z=where.z;
      if(!close.previousPosition){
        e.savedActorTransform.position.x=where.x; if(typeof where.y==='number') e.savedActorTransform.position.y=where.y; e.savedActorTransform.position.z=where.z;
      }
      if(typeof regionPeopleTrackPlaced==='function') regionPeopleTrackPlaced(view,actor,state.target.space,where.x,where.z,Math.max(old.radius,actor.userData.regionBounds.radius));
      if(typeof regionPeopleSyncShadow==='function') regionPeopleSyncShadow(actor);
      view._crabMoveCache=null;
      view._crabSpotCache=null;
    }
    e.actorBounds=actor.userData.regionBounds;
    close.previousBounds=old;close.previous=previous.map(function(o,i){return {object:o,visible:visibility[i]};});close.root=fit;
    if(e.interior && typeof regionEncounterInteriorPlaceActor==='function'){
      regionResidentApplyBoardYaw(state,true,null,null);
      regionEncounterInteriorPlaceActor(view,e);
    }
    var applyCloseEp=actor.userData && actor.userData.encounterPose && (e.interior || (actor.userData.encounterPose.allowOutdoor && e.region==='beach'));
    if(applyCloseEp){
      var ep=actor.userData.encounterPose;
      var sh=regionResidentEncounterShift(actor,ep,e.interior);
      regionResidentApplyPose(fit,{baseX:fitBaseX,baseY:fitBaseY,baseZ:fitBaseZ,cx:center.x*factor,cy:center.y*factor,cz:center.z*factor},ep.yaw||0,ep.pitch||0,ep.yaw||0,ep.roll||0,(ep.yLift||0)/(actor.scale.y || 1),true,sh.x,sh.z);
    }
    // Authored attentive listening is conversation-only. Existing residents
    // keep their Idle fallback; this does not add work to hidden characters.
    var clips=gltf.animations || [];
    var idle=clips.find(function(a){return a.name==='Listen';}) || clips.find(function(a){return a.name==='Idle';});
    if(idle){close.mixer=new T.AnimationMixer(model);close.action=close.mixer.clipAction(idle);close.action.play();
      // Preserve the current board idle phase on a smooth quality swap.
      if(state.action && state.action.getClip().name===idle.name && state.action.getClip().duration>0) close.action.time=state.action.time/state.action.getClip().duration*idle.duration;
      var react=(gltf.animations || []).find(function(a){return a.name==='React';});
      if(react){
        close.react=close.mixer.clipAction(react);close.react.setLoop(T.LoopOnce,1);
        close.mixer.addEventListener('finished',function(ev){if(ev.action===close.react){close.action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();close.react.crossFadeTo(close.action,.18,false);}});
        if(e.phase==='intro' && !reefCalm()){
          close.react.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();close.action.crossFadeTo(close.react,.18,false);
        }
      }
    }
  }
  function regionResidentCloseEnd(view,encounter){
    regionResidentStates(view).forEach(function(state){regionResidentCloseEndOne(view,state,encounter);});
  }
  function regionResidentCloseEndOne(view,state,encounter){
    var close=state && state.close;
    if(!close || (encounter && close.encounter!==encounter)) return;
    regionResidentSkinRelease(close);
    state.close=null;if(close.controller) close.controller.abort();if(close.cancel) close.cancel();
    if(close.mixer){close.mixer.stopAllAction();if(close.root)close.mixer.uncacheRoot(close.root.children[0]);}
    if(close.root){
      if(close.root.parent) close.root.parent.remove(close.root);regionResidentRelease(close.root);
      close.previous.forEach(function(item){item.object.visible=item.visible;});
      state.target.object.userData.regionBounds=close.previousBounds;
      if(close.previousPosition){
        state.target.object.position.copy(close.previousPosition);
        if(typeof regionPeopleTrackPlaced==='function') regionPeopleTrackPlaced(view,state.target.object,state.target.space,close.previousPosition.x,close.previousPosition.z,close.previousBounds.radius);
        if(typeof regionPeopleSyncShadow==='function') regionPeopleSyncShadow(state.target.object);
      }
      regionResidentApplyBoardYaw(state,false,false);
    }
    state.lastTime=0;
  }
  function regionResidentDispose(view){
    var p=view && view.regionPeople; if(!p) return;
    regionResidentCancelEnvMap(view);
    regionResidentCloseEnd(view);
    regionResidentStates(view).forEach(function(state){
      regionResidentSkinRelease(state);
      state.disposed=true; if(state.controller) state.controller.abort(); if(state.cancel) state.cancel();
      if(state.mixer){ state.mixer.stopAllAction(); if(state.root) state.mixer.uncacheRoot(state.root.children[0]); }
      if(state.pending && state.pending.scene) regionResidentRelease(state.pending.scene);
      if(state.root){ regionResidentRelease(state.root); if(state.root.parent) state.root.parent.remove(state.root); }
    });
    if(view._residentCorneaEnv){
      if(view._residentCorneaEnv.dispose) view._residentCorneaEnv.dispose();
      view._residentCorneaEnv=null;
    }
    p.residents=[];p.resident=null;
  }
