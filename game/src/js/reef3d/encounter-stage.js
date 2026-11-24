  /* Keep the regional board and its real resident on screen while a lesson is open.
     This module owns only a short lived camera/layout state; the board owns WebGL. */
  function regionEncounterActor(view, actor, activity){
    var people = view && view.regionPeople;
    if(!people || people.disposed) return null;
    if(actor && actor.position && actor.rotation) return actor;
    if(actor && actor.object && actor.object.position) return actor.object;
    var id = activity && activity.id;
    if(typeof actor === 'string' && actor.indexOf('town:') === 0) id = actor.slice(5);
    if(view.region && view.region.id === 'town' && id){
      var town = (people.towns || []).find(function(t){ return t.meta && t.meta.id === id; });
      if(town) return town.object;
    }
    if(actor === 'shop' || !activity) return people.actor;
    return people.marker || people.actor;
  }
  function regionEncounterRoute(region){
    return region === 'lagoon' ? 'lagoonRead' : region === 'town' ? 'townTalk' : region;
  }
  function regionEncounterLessonMatches(e){
    var id = e.activityid;
    if(e.region === 'town') return !!S.town && S.town.id === id;
    if(e.region === 'lagoon') return !!S.lagoon && S.lagoon.id === id;
    if(e.region === 'caves') return !!S.caves && S.caves.sec === id;
    if(e.region === 'patterns') return !!S.patterns && S.patterns.id === id;
    if(e.region === 'beach') return !!S.beach && (id === 'letters' ? S.beach.view === 'letters' : S.beach.id === id);
    if(e.region === 'light') return !!S.light && S.light.id === (id.indexOf('manner:') === 0 ? id.slice(7) : id) &&
      S.light.view === (id.indexOf('manner:') === 0 ? 'manner' : 'sign');
    if(e.region === 'captain') return !!S.captain && S.captain.tab === id;
    return false;
  }
  function regionEncounterBegin(view, options){
    options = options || {};
    var board = S.regionBoard, region = options.region || view && view.region && view.region.id;
    region = typeof region === 'string' ? region : region && region.id;
    var activity = options.activity || options.space && options.space.item && options.space.item.d && options.space.item.d.regionActivity;
    var id = activity && (typeof activity === 'string' ? activity : activity.id);
    var pid = S.profile && S.profile.id;
    if(!view || !view.wrap || R3.view !== view || !view.region || view.region.id !== region ||
       !board || board.region !== region || board.pid !== pid || pid == null || S.view !== region ||
       view.parked || !view.wrap.isConnected) return false;
    var actor = regionEncounterActor(view, options.actor, activity);
    if(!actor) return false;
    if(view.encounter) regionEncounterEnd(view);
    var saved = { position:actor.position.clone(), rotation:actor.rotation.clone(), scale:actor.scale.clone() };
    view.encounter = { pid:pid, region:region, activityid:id == null ? null : String(id),
      actor:actor, space:options.space || null, phase:'intro', savedActorTransform:saved,
      savedPostOn:view.post ? view.post.on : null, savedCamMode:view.camMode,
      savedInert:view.wrap.inert };
    var e=view.encounter, bounds=actor.userData.regionBounds || regionPeopleCacheBounds(actor);
    e.actorBounds=bounds;
    e.hiddenObjects=[];
    e.sightlineHidden=[];
    var people=view.regionPeople;
    var quiet=[view.guide,view.crab,view.ring,view.nextStar,people.actor,people.marker,people.stall]
      .concat(people.towns.map(function(t){ return t.object; }),view.spinners || [],
        view.spaces.map(function(s){ return s.qb; }),
        view.party && view.party.gate ? [view.party.gate] : []);
    quiet.forEach(function(o){ if(o && o!==actor){ e.hiddenObjects.push({object:o,visible:o.visible}); o.visible=false; } });
    // The merged world model faces positive Z; turn it a touch toward the learner.
    actor.rotation.y = saved.rotation.y + .1;
    if(typeof regionResidentEncounter==='function') regionResidentEncounter(view,actor);
    regionEncounterSightline(view);
    reef3dQEncounter(view,true);
    if(view.post) view.post.on = false;
    view.wrap.classList.add('rpg-stage-scene', 'rpg-stage-intro');
    view.wrap.inert = false;
    view.w = 0;
    return true;
  }
  function regionEncounterSightline(view){
    var e = view && view.encounter;
    if(!e || !view.cam || !view.scene || !window.THREE) return;
    if(e.sightlineHidden){
      e.sightlineHidden.forEach(function(savedObject){ savedObject.object.visible = savedObject.visible; });
    }
    e.sightlineHidden = [];
    var actor = e.actor, people = view.regionPeople;
    if(!actor) return;
    var bounds = actor.userData.regionBounds || e.actorBounds || regionPeopleCacheBounds(actor);
    e.actorBounds = bounds;
    e.sightlineBounds = bounds;
    e.sightlineX = actor.position.x;
    e.sightlineZ = actor.position.z;
    var T = window.THREE, halfA = Math.tan(view.cam.fov * Math.PI / 360), asp = Math.max(.25, view.cam.aspect);
    var wEst = bounds.width * Math.cos(.1) + bounds.depth * Math.sin(.1);
    var dist = Math.max(.75, wEst / (2 * halfA * asp * .72), bounds.height / (2 * halfA * .76)) + bounds.depth * .55;
    var cx = actor.position.x + bounds.centerX, cy = actor.position.y + bounds.centerY, cz = actor.position.z + bounds.centerZ;
    var camY = cy + bounds.height * .06, camZ = cz + dist;
    var padX = Math.max(.95, bounds.width * .65), padY = Math.max(.85, bounds.height * .65);
    var minZ = cz - Math.min(.25, bounds.depth * .15);
    var camVec = new T.Vector3(cx, camY, camZ), rayDir = new T.Vector3(), rayTarget = new T.Vector3();
    var raycaster = new T.Raycaster(), box = new T.Box3(), bSz = new T.Vector3();
    var rayTargets = [];
    for(var iy = -1; iy <= 1; iy++){
      for(var ix = -1; ix <= 1; ix++){
        rayTargets.push([cx + ix * bounds.width * .45, cy + iy * bounds.height * .4, cz + bounds.depth * .2]);
      }
    }
    var isActorOrChild = function(node){
      for(var p = node; p; p = p.parent) if(p === actor) return true;
      return false;
    };
    var isActorAncestor = function(node){
      for(var q = actor.parent; q; q = q.parent) if(q === node) return true;
      return false;
    };
    var isNodeVisible = function(obj){
      for(var q = obj; q; q = q.parent) if(!q.visible) return false;
      return true;
    };
    var blocksSightline = function(node){
      if(box.containsPoint(camVec)) return true;
      for(var ri = 0; ri < rayTargets.length; ri++){
        var rt = rayTargets[ri];
        rayTarget.set(rt[0], rt[1], rt[2]);
        rayDir.copy(rayTarget).sub(camVec);
        var maxDist = rayDir.length();
        if(maxDist < .05) continue;
        rayDir.multiplyScalar(1 / maxDist);
        raycaster.set(camVec, rayDir);
        raycaster.near = .01;
        raycaster.far = maxDist;
        var hits = raycaster.intersectObject(node, true);
        for(var hi = 0; hi < hits.length; hi++){
          if(hits[hi].distance > .01 && hits[hi].distance < maxDist && isNodeVisible(hits[hi].object)) return true;
        }
      }
      return false;
    };
    var inRegion = false;
    var scan = function(node){
      if(!node || !node.visible || isActorOrChild(node) || (node.userData && node.userData.reefGround)) return;
      if(node.isLight || node.isPoints || node.isSprite) return;
      var isRegionGroup = !!(node.name && node.name.indexOf('region-') === 0);
      var isPeopleRoot = !!(people && node === people.root);
      var isPropUnit = !node.isMesh && node.userData && node.userData.space != null;
      if(isActorAncestor(node) || isPeopleRoot || isRegionGroup || (!node.isMesh && !isPropUnit && node.children && node.children.length)){
        var wasInRegion = inRegion;
        if(isRegionGroup) inRegion = true;
        node.children.forEach(scan);
        inRegion = wasInRegion;
        return;
      }
      if(!node.isMesh && !isPropUnit) return;
      node.updateMatrixWorld(true);
      box.setFromObject(node);
      if(box.isEmpty()) return;
      if(box.max.z <= minZ || box.min.z >= camZ + .35 ||
         box.max.x <= cx - padX || box.min.x >= cx + padX ||
         box.max.y <= cy - padY || box.min.y >= cy + padY) return;
      box.getSize(bSz);
      var smallProp = !inRegion && bSz.x < 5 && bSz.z < 5 && box.max.z > cz + bounds.depth * .1;
      if(smallProp || blocksSightline(node)){
        e.sightlineHidden.push({ object: node, visible: true });
        node.visible = false;
      }
    };
    view.scene.children.forEach(scan);
  }
  function regionEncounterActive(view, activity){
    var e = view && view.encounter, board = S.regionBoard, pid = S.profile && S.profile.id;
    if(!e || pid == null || e.pid !== pid || R3.view !== view || !view.wrap || !view.region ||
       view.region.id !== e.region || !board || board.pid !== pid || board.region !== e.region ||
       view.parked) return false;
    if(activity != null){
      var aRegion = typeof activity === 'object' && activity.region;
      var aId = typeof activity === 'object' ? activity.id : activity;
      if(aRegion && aRegion !== e.region) return false;
      if(String(aId) !== e.activityid) return false;
    }
    if(e.phase === 'intro') return S.view === e.region;
    if(e.phase !== 'lesson' || !e.activityid || S.view !== regionEncounterRoute(e.region)) return false;
    return board.activity === e.activityid && !!board.played && regionEncounterLessonMatches(e);
  }
  function regionEncounterKeep(view, activity){
    if(!regionEncounterActive(view, activity)) return false;
    var e = view.encounter;
    if(e.phase !== 'intro' || !e.activityid) return false;
    if(typeof regionPeopleIntroCancel==='function') regionPeopleIntroCancel(view);
    e.phase = 'lesson';
    view.wrap.classList.remove('rpg-stage-intro');
    view.wrap.classList.add('rpg-stage-lesson');
    view.wrap.inert = true;
    view.w = 0;
    return true;
  }
  function regionEncounterAttach(appRoot){
    var view = R3.view;
    if(!appRoot || !view || !view.encounter || view.encounter.phase !== 'lesson' ||
       !regionEncounterActive(view)) return false;
    var host = appRoot.querySelector(':scope > .rpg-stage-host');
    var dialogue = host && host.querySelector(':scope > .rpg-dialogue');
    if(host && dialogue && view.wrap.parentNode === host && appRoot.children.length === 1){
      document.body.classList.add('rpg-lesson');
      return true;
    }
    var e=view.encounter, scroll=e.dialogue ? e.dialogue.scrollTop : 0;
    if(!host){
      host = document.createElement('div');
      host.className = 'rpg-stage-host';
      dialogue = document.createElement('div');
      dialogue.className = 'rpg-dialogue';
      dialogue.setAttribute('role', 'region');
      dialogue.setAttribute('aria-label', 'Conversation and practice');
      while(appRoot.firstChild) dialogue.appendChild(appRoot.firstChild);
      appRoot.appendChild(host);
      host.appendChild(dialogue);
    } else {
      if(!dialogue){ dialogue = document.createElement('div'); dialogue.className = 'rpg-dialogue'; host.appendChild(dialogue); }
      Array.prototype.slice.call(appRoot.children).forEach(function(child){ if(child !== host) dialogue.appendChild(child); });
    }
    host.insertBefore(view.wrap, dialogue);
    e.dialogue=dialogue;
    dialogue.scrollTop=scroll;
    view.wrap.classList.remove('rpg-stage-intro');
    view.wrap.classList.add('rpg-stage-scene', 'rpg-stage-lesson');
    view.wrap.inert = true;
    document.body.classList.add('rpg-lesson', 'r3-full');
    if(view.post) view.post.on = false;
    view.w = 0;
    if(!view.raf) reef3dLoop(view);
    return true;
  }
  function regionEncounterCamera(view, out, look){
    if(!regionEncounterActive(view)) return false;
    var actor = view.encounter.actor;
    if(!actor || !actor.position) return false;
    var p=actor.position, e=view.encounter, b=e.actorBounds;
    var halfAngle=Math.tan(view.cam.fov*Math.PI/360), aspect=Math.max(.25,view.cam.aspect);
    // Fit the full width on a narrow phone and the height of small residents;
    // depth clearance keeps the near side of a wide body inside the frustum.
    var width=b.width*Math.cos(.1)+b.depth*Math.sin(.1);
    var distance=Math.max(.75, width/(2*halfAngle*aspect*.72), b.height/(2*halfAngle*.76)) + b.depth*.55;
    var cx=p.x+b.centerX, cy=p.y+b.centerY, cz=p.z+b.centerZ;
    out.set(cx,cy+b.height*.06,cz+distance);
    look.set(cx,cy,cz);
    view.camMode = 'encounter';
    return true;
  }
  function regionEncounterTick(view, now){
    var audio=view && view.regionPeople && view.regionPeople.introAudio;
    if(audio && !regionPeopleIntroCurrent(view,audio)) regionPeopleIntroCancel(view);
    if(!regionEncounterActive(view) || document.hidden) return;
    if(typeof regionResidentTick==='function') regionResidentTick(view,now);
    var e = view.encounter, actor = e.actor, base = e.savedActorTransform;
    if(view.post) view.post.on=false;
    if(!actor || !base) return;
    if(e.sightlineBounds !== e.actorBounds || e.sightlineX !== actor.position.x || e.sightlineZ !== actor.position.z){
      regionEncounterSightline(view);
    }
    var speaking = false;
    if(e.region === 'town' && e.phase === 'lesson' && S.town){
      var i = S.town.speaking;
      speaking = typeof i === 'number' && !!S.town.log && !!S.town.log[i] && S.town.log[i].who === 'them';
    }
    var calm = reefCalm(), t = now * .001;
    var rx = 0, rz = 0, py = 0, sc = 1;
    if(!calm && e.react){
      var rp = (now - e.react.t0) / e.react.dur;
      if(rp >= 1) e.react = null;
      else if(e.react.mood === 'happy'){
        py = Math.sin(rp * Math.PI) * .18;
        sc = 1 + Math.sin(rp * Math.PI * 2) * .042;
        rx = -Math.sin(rp * Math.PI) * .055;
      } else {
        rz = Math.sin(rp * Math.PI * 2) * .07;
        rx = Math.sin(rp * Math.PI) * .055;
        py = Math.sin(rp * Math.PI) * .04;
      }
    }
    actor.rotation.x = base.rotation.x + (!calm && speaking ? Math.sin(t * 6.5) * .025 : 0) + rx;
    actor.rotation.z = base.rotation.z + (!calm ? Math.sin(t * 1.4) * .012 : 0) + rz;
    actor.position.y = base.position.y + (!calm && speaking ? Math.sin(t * 6.5) * .025 : 0) + py;
    actor.scale.copy(base.scale).multiplyScalar(sc);
  }
  function regionEncounterReact(view, mood){
    if(!regionEncounterActive(view) || reefCalm()) return;
    var isHappy = mood === 'happy';
    view.encounter.react = { mood: isHappy ? 'happy' : 'encourage', t0: performance.now(), dur: isHappy ? 550 : 450 };
    if(typeof regionResidentPlayReact === 'function'){
      regionResidentPlayReact(view, mood);
    } else if(typeof regionResidentReact === 'function'){
      regionResidentReact(view, view.encounter.actor, mood);
    } else if(typeof regionResidentStates === 'function'){
      var states = regionResidentStates(view), actor = view.encounter.actor;
      var st = states && states.find(function(s){ return s && s.target && s.target.object === actor; });
      if(st){
        var player = st.close && st.close.root ? st.close : st;
        if(player && player.react && player.action && player.mixer){
          try {
            player.react.reset().play();
            player.action.crossFadeTo(player.react, .18, false);
          } catch(err){}
        }
      }
    }
  }
  function regionEncounterEnd(view){
    var e = view && view.encounter;
    if(!e) return false;
    if(typeof regionPeopleIntroCancel==='function') regionPeopleIntroCancel(view);
    if(typeof regionResidentCloseEnd==='function') regionResidentCloseEnd(view,e);
    var actor = e.actor, saved = e.savedActorTransform;
    if(actor && saved){ actor.position.copy(saved.position); actor.rotation.copy(saved.rotation); actor.scale.copy(saved.scale); }
    (e.hiddenObjects || []).forEach(function(savedObject){ savedObject.object.visible=savedObject.visible; });
    (e.sightlineHidden || []).forEach(function(savedObject){ savedObject.object.visible=savedObject.visible; });
    if(view.post && e.savedPostOn !== null) view.post.on = e.savedPostOn;
    view.camMode = e.savedCamMode;
    view.wrap.inert = e.savedInert;
    view.wrap.classList.remove('rpg-stage-scene', 'rpg-stage-intro', 'rpg-stage-lesson');
    var host = document.querySelector('.rpg-stage-host');
    if(host && host.contains(view.wrap)){
      var dialogue = host.querySelector(':scope > .rpg-dialogue');
      if(dialogue && host.parentNode){
        while(dialogue.firstChild) host.parentNode.insertBefore(dialogue.firstChild, host);
      }
      view.wrap.remove();
      host.remove();
    }
    document.body.classList.remove('rpg-lesson');
    if(!document.querySelector('.r3')) document.body.classList.remove('r3-full');
    view.encounter = null;
    reef3dQEncounter(view,false);
    view.w = 0;
    return true;
  }
  function regionEncounterScrollEnd(element){
    var box = app && app.querySelector('.rpg-dialogue');
    if(!box) return false;
    var lines = box.querySelectorAll('.tw-log .lg-line:not(.lg-me)');
    var last = element && box.contains(element) ? element : lines[lines.length - 1];
    var bottom = Math.max(0, box.scrollHeight - box.clientHeight);
    var top = last ? Math.min(bottom, box.scrollTop + last.getBoundingClientRect().top - box.getBoundingClientRect().top - 70) : bottom;
    if(top > box.scrollTop) box.scrollTo({ top:top, behavior:reefCalm() ? 'auto' : 'smooth' });
    return true;
  }
