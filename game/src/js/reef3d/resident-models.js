  /* Optional authored residents. Each view owns its request and GPU resources;
     a failed or unfinished model leaves the procedural resident in place. */
  // Only validated assets belong in the active registry. Multiple residents can
  // share a region; a dormant candidate never triggers download or decoding.
  var REGION_RESIDENT_MODELS = { town:[{ id:'taxi', url:'assets/models/taxi-squid.glb', closeUrl:'assets/models/taxi-squid-close.glb' }] };
  var REGION_RESIDENT_CANDIDATES = {
    'cafe-seahorse':{ region:'town', id:'cafe-seahorse', target:'cafe', url:'assets/models/cafe-seahorse.glb?v=natural-1', closeUrl:'assets/models/cafe-seahorse-close.glb?v=natural-1' },
    jisu:{ region:'beach', id:'jisu', target:'host', url:'assets/models/jisu.glb?v=cast-1', closeUrl:'assets/models/jisu-close.glb?v=cast-1' },
    'shop-octopus':{ region:'town', id:'shop-octopus', target:'shop', skinMask:'baseColorAlpha', url:'assets/models/shop-octopus.glb?v=cast-1', closeUrl:'assets/models/shop-octopus-close.glb?v=cast-1' }
  };
  // Call only after validating both the asset and its cast/reaction contract.
  // A board-only candidate can be activated with includeClose=false.
  function regionResidentEnable(id,includeClose){
    var candidate=REGION_RESIDENT_CANDIDATES[id]; if(!candidate) return false;
    var entries=REGION_RESIDENT_MODELS[candidate.region] || [];
    if(!Array.isArray(entries)) entries=[entries];
    if(entries.some(function(entry){return entry.id===id;})) return false;
    var entry=Object.assign({},candidate); if(includeClose===false) delete entry.closeUrl;
    entries.push(entry);REGION_RESIDENT_MODELS[candidate.region]=entries;return true;
  }
  // Production opt-in: add an ID only after its board and close GLBs pass
  // geometry, texture, performance and cast review. Drafts stay dormant.
  var REGION_RESIDENT_VALIDATED_IDS = ['cafe-seahorse','jisu','shop-octopus'];
  REGION_RESIDENT_VALIDATED_IDS.forEach(regionResidentEnable);
  var regionResidentInFlight=false;

  function regionResidentRelease(root){
    if(!root) return;
    var geometries=new Set(), materials=new Set(), textures=new Set(), skeletons=new Set();
    root.traverse(function(o){
      if(o.geometry) geometries.add(o.geometry);
      if(o.skeleton) skeletons.add(o.skeleton);
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function(m){
        materials.add(m);
        Object.keys(m).forEach(function(k){ if(m[k] && m[k].isTexture) textures.add(m[k]); });
      });
    });
    skeletons.forEach(function(s){ if(s.dispose) s.dispose(); });
    geometries.forEach(function(g){ g.dispose(); }); materials.forEach(function(m){ m.dispose(); }); textures.forEach(function(t){ t.dispose(); });
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
    if(state.requested || regionResidentInFlight || !regionResidentAlive(view,state)) return;
    state.requested=true; regionResidentInFlight=true;
    var finished=false;
    function finish(){ if(!finished){ finished=true; clearTimeout(state.timer); state.timer=null; regionResidentInFlight=false; } }
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
    function parse(bytes,fromInline){
      if(finished || !regionResidentAlive(view,state)){finish(); return;}
      function failed(){ if(finished) return; if(fromInline) network(); else finish(); }
      try { new T.GLTFLoader().parse(bytes,'',function(gltf){
        var accepted=!finished && regionResidentAlive(view,state);
        if(!accepted){finish(); if(gltf && gltf.scene) regionResidentRelease(gltf.scene); return;}
        if(!gltf || !gltf.scene){failed(); return;}
        finish(); state.pending=gltf; regionResidentAttach(view,state);
      },failed); } catch(e){failed();}
    }
    // Decode only after this resident is needed; a bad inline payload falls
    // back to the normal URL under the same request timeout.
    var inline=typeof document.getElementById==='function' && document.getElementById('reef-resident-inline-'+state.entry.id);
    var encoded=inline && inline.textContent && inline.textContent.trim();
    if(encoded){
      try {
        var binary=atob(encoded), bytes=new Uint8Array(binary.length);
        for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
        parse(bytes.buffer,true);
      } catch(e){network();}
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
    gltf.scene.traverse(function(o){
      if(!o.isMesh) return;
      o.castShadow=false;o.receiveShadow=true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        if(!m) return;
        var pigment=!!(weights && masked.indexOf(m)>=0);
        if(pigment){m.transparent=false;m.alphaTest=0;m.opacity=1;}
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
          // The board renderer uses linear output; encode like Shelly.
          shader.fragmentShader=shader.fragmentShader.replace('#include <encodings_fragment>','gl_FragColor = LinearTosRGB( gl_FragColor );');
        };
        m.customProgramCacheKey=function(){return pigment?'resident-srgb-mask-v1':'resident-srgb-v1';};
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
  function regionResidentAttach(view,state){
    if(!regionResidentAlive(view,state) || !state.pending || view.parked ||
       !view.wrap.isConnected || document.hidden) return false;
    var T=window.THREE, actor=state.target.object, gltf=state.pending, model=gltf.scene;
    var encounter=view.encounter, matchingIntro=!!(encounter && encounter.phase==='intro' &&
      encounter.actor===actor && regionEncounterActive(view));
    if(encounter && !matchingIntro) return false;
    if(state.close && state.close.root) return false;
    var old=actor.userData.regionBounds, scale=actor.scale.y || 1;
    var visual=actor.userData.deliveryMotion || actor;
    var box=new T.Box3().setFromObject(model), size=new T.Vector3(), center=new T.Vector3();
    box.getSize(size); box.getCenter(center);
    if(!isFinite(size.y) || size.y<.001){ state.pending=null; regionResidentRelease(model); return false; }
    // Fit to the old unscaled body height, then preserve the species-scale root.
    var factor=(old.height/scale)/size.y, fit=new T.Group();
    fit.scale.setScalar(factor);
    fit.position.set(old.centerX/scale-center.x*factor,(old.centerY-old.height/2)/scale-box.min.y*factor,old.centerZ/scale-center.z*factor);
    if(!regionResidentPrepare(view,state,gltf,state)){state.pending=null;regionResidentRelease(model);return false;}
    fit.add(model);
    // Detach temporarily for a true bound of the replacement; keep the old
    // children hidden for shared-resource cleanup with the rest of the view.
    var fallback=visual.children.slice(), fallbackVisibility=fallback.map(function(o){return o.visible;});
    fallback.forEach(function(o){visual.remove(o);});
    var introYaw=actor.rotation.y;
    if(matchingIntro) actor.rotation.y=encounter.savedActorTransform.rotation.y;
    visual.add(fit); regionPeopleCacheBounds(actor);
    if(matchingIntro) actor.rotation.y=introYaw;
    fallback.forEach(function(o){o.visible=false;visual.add(o);});
    // The far-away fallback must clear the tiles too.
    var footprint={radius:Math.max(old.radius,actor.userData.regionBounds.radius)};
    var where=regionPeoplePlacement(view,state.target.space,footprint,state.entry.id==='subway');
    actor.position.x=where.x; actor.position.z=where.z;
    if(matchingIntro){
      encounter.actorBounds=actor.userData.regionBounds;
      encounter.savedActorTransform.position.x=where.x; encounter.savedActorTransform.position.z=where.z;
    }
    state.pending=null; state.root=fit; state.fallback=fallback.map(function(o,i){return {object:o,visible:fallbackVisibility[i]};}); state.detailed=true;
    if(gltf.animations && gltf.animations.length){
      var idle=gltf.animations.find(function(a){return a.name==='Idle';});
      if(idle){
        state.mixer=new T.AnimationMixer(model); state.action=state.mixer.clipAction(idle); state.action.play();
        var react=gltf.animations.find(function(a){return a.name==='React';});
        if(react){ state.react=state.mixer.clipAction(react); state.react.setLoop(T.LoopOnce,1);
          state.mixer.addEventListener('finished',function(e){ if(e.action===state.react){state.action.reset().play();state.react.crossFadeTo(state.action,.18,false);} }); }
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
    states.forEach(function(state){regionResidentTickOne(view,state,now);});
  }
  function regionResidentTickOne(view,state,now){
    if(!regionResidentAlive(view,state)) return;
    if(state.close && (view.encounter!==state.close.encounter || !regionEncounterActive(view))) regionResidentCloseEndOne(view,state,state.close.encounter);
    if(view.parked || !view.wrap.isConnected || document.hidden){state.lastTime=0; return;}
    var actor=state.target.object, guide=view.guide && view.guide.position;
    var dx=guide ? guide.x-actor.position.x : Infinity, dz=guide ? guide.z-actor.position.z : Infinity;
    var focused=!view.encounter || view.encounter.actor===actor;
    if(focused && !state.requested && ((view.encounter && view.encounter.actor===actor) || dx*dx+dz*dz<18*18)) regionResidentRequest(view,state);
    if(state.pending) regionResidentAttach(view,state);
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
    var limit=state.detailed ? 20 : 16;
    var detailed=seen && (inEncounter || dx*dx+dz*dz<limit*limit);
    if(detailed!==state.detailed){
      state.detailed=detailed;
      if(state.root) state.root.visible=detailed && !close;
      if(state.fallback) state.fallback.forEach(function(item){item.object.visible=!detailed && !close && item.visible;});
    }
    var player=close || state;
    if(!player.mixer || !detailed || reefCalm()){player.lastTime=0; return;}
    var elapsed=player.lastTime ? (now-player.lastTime)/1000 : 0;
    var dt=elapsed>0 && elapsed<.25 ? Math.min(.1,elapsed) : 0;
    player.lastTime=now; player.mixer.update(dt);
  }
  function regionResidentEncounter(view,actor){
    var state=regionResidentStates(view).find(function(item){return item.target.object===actor;});
    if(!state || !regionResidentAlive(view,state)) return;
    if(state.root && !state.detailed){ state.detailed=true; state.root.visible=true; state.fallback.forEach(function(item){item.object.visible=false;}); }
    if(state.react && !reefCalm()){state.react.reset().play(); state.action.crossFadeTo(state.react,.18,false);}
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
       (e.phase!=='intro' && e.phase!=='lesson') || state.close || regionResidentInFlight) return;
    var close=state.close={encounter:e,root:null,controller:typeof AbortController==='function'?new AbortController():null,lastTime:0};
    regionResidentInFlight=true;
    var finished=false;
    function finish(){if(!finished){finished=true;clearTimeout(close.timer);regionResidentInFlight=false;}}
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
    var factor=(old.height/scale)/size.y,fit=new T.Group();fit.scale.setScalar(factor);
    fit.position.set(old.centerX/scale-center.x*factor,(old.centerY-old.height/2)/scale-box.min.y*factor,old.centerZ/scale-center.z*factor);
    if(!regionResidentPrepare(view,state,gltf,close)){regionResidentRelease(model);return;}
    fit.add(model);
    var previous=visual.children.slice(), visibility=previous.map(function(o){return o.visible;});
    previous.forEach(function(o){visual.remove(o);});
    var e=close.encounter,yaw=actor.rotation.y;actor.rotation.y=e.savedActorTransform.rotation.y;
    visual.add(fit);regionPeopleCacheBounds(actor);actor.rotation.y=yaw;
    previous.forEach(function(o){o.visible=false;visual.add(o);});
    var where=regionPeoplePlacement(view,state.target.space,{radius:Math.max(old.radius,actor.userData.regionBounds.radius)},state.entry.id==='subway');
    actor.position.x=where.x;actor.position.z=where.z;e.savedActorTransform.position.x=where.x;e.savedActorTransform.position.z=where.z;e.actorBounds=actor.userData.regionBounds;
    close.previousBounds=old;close.previous=previous.map(function(o,i){return {object:o,visible:visibility[i]};});close.root=fit;
    // Authored attentive listening is conversation-only. Existing residents
    // keep their Idle fallback; this does not add work to hidden characters.
    var clips=gltf.animations || [];
    var idle=clips.find(function(a){return a.name==='Listen';}) || clips.find(function(a){return a.name==='Idle';});
    if(idle){close.mixer=new T.AnimationMixer(model);close.action=close.mixer.clipAction(idle);close.action.play();
      // Preserve the current board idle phase on a smooth quality swap.
      if(state.action && state.action.getClip().name===idle.name && state.action.getClip().duration>0) close.action.time=state.action.time/state.action.getClip().duration*idle.duration;
      var react=(gltf.animations || []).find(function(a){return a.name==='React';});
      if(react && e.phase==='intro' && !reefCalm()){
        close.react=close.mixer.clipAction(react);close.react.setLoop(T.LoopOnce,1);close.react.play();close.action.crossFadeTo(close.react,.18,false);
        close.mixer.addEventListener('finished',function(ev){if(ev.action===close.react){close.action.reset().play();close.react.crossFadeTo(close.action,.18,false);}});
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
    }
    state.lastTime=0;
  }
  function regionResidentDispose(view){
    var p=view && view.regionPeople; if(!p) return;
    regionResidentCloseEnd(view);
    regionResidentStates(view).forEach(function(state){
      regionResidentSkinRelease(state);
      state.disposed=true; if(state.controller) state.controller.abort(); if(state.cancel) state.cancel();
      if(state.mixer){ state.mixer.stopAllAction(); if(state.root) state.mixer.uncacheRoot(state.root.children[0]); }
      if(state.pending && state.pending.scene) regionResidentRelease(state.pending.scene);
      if(state.root){ regionResidentRelease(state.root); if(state.root.parent) state.root.parent.remove(state.root); }
    });
    p.residents=[];p.resident=null;
  }
