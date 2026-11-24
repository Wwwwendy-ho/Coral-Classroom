  /* Shelly's opt-in storybook model. The board still owns the guide, route and
     body wrapper; this file owns only the animated child and its materials. */
  var R3shelly = null;
  var REEF3D_SHELLY_CLIPS = ['Idle', 'Swim', 'Turn', 'Happy', 'Curious', 'Celebrate'];
  var R3shellySmallTextures = {};

  // Keep painted detail at high quality; older-device tiers upload a 1K color
  // copy. The decoded source is shared, and no extra model download is needed.
  function reef3dShellyQuality(view){
    var state = view && view.guide && view.guide.userData.shelly;
    if(!state) return;
    var limit = R3.q >= 2 ? 1024 : 2048;
    if(state.textureLimit === limit) return;
    state.textureLimit = limit;
    state.maps.forEach(function(binding){
      var source = binding.texture, img = source.image, selected = source;
      if(img && Math.max(img.width, img.height) > limit){
        var key = source.uuid + ':' + limit;
        selected = R3shellySmallTextures[key];
        if(!selected){
          var canvas = document.createElement('canvas'), ratio = limit / Math.max(img.width, img.height);
          canvas.width = Math.round(img.width * ratio); canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          selected = source.clone(); selected.image = canvas; selected.needsUpdate = true;
          R3shellySmallTextures[key] = selected;
        }
      }
      binding.material[binding.property] = selected;
      binding.material.needsUpdate = true;
    });
  }

  function reef3dShellyLoad(){
    var search = (window.location && window.location.search) || '';
    if(!window.REEF_SHELLY_PREVIEW && new URLSearchParams(search).get('shelly') === 'procedural') return Promise.resolve(null);
    if(R3shelly) return R3shelly;
    R3shelly = reef3dLoad().then(function(){
      reefInstallGLTF();
      var THREE = window.THREE;
      if(!THREE || !THREE.GLTFLoader || !THREE.SkeletonUtils) return null;
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer;
      var timeout = new Promise(function(resolve){ timer = setTimeout(function(){
        if(controller) controller.abort();
        resolve(null);
      }, 10000); });
      var crafted = new URLSearchParams(search).get('art') !== 'classic';
      // The crafted preview has its own authored creature. Never substitute the
      // older portable inline asset for it, even when that payload is present.
      var inline = !crafted && document.getElementById('reef-shelly-inline');
      var bytes = inline && inline.textContent.trim();
      // Keep the lighter authored mesh for a low-power visit. Switching quality
      // later changes texture size without downloading or rebuilding the rig.
      var asset = R3.q >= 2 ? 'assets/models/shelly-view.glb?v=natural-1' : 'assets/models/shelly.glb?v=natural-1';
      if(crafted) asset = R3.q >= 2 ? 'assets/models/crafted-shelly-view.glb?v=organic-mp-2' : 'assets/models/crafted-shelly.glb?v=organic-mp-2';
      var source = bytes ? Promise.resolve().then(function(){
        var binary = atob(bytes), array = new Uint8Array(binary.length);
        for(var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        return array.buffer;
      }) : fetch(asset, controller ? { signal: controller.signal } : {}).then(function(response){
        if(!response.ok) throw new Error('Shelly model HTTP ' + response.status);
        return response.arrayBuffer();
      });
      var request = source.then(function(buffer){
        return new Promise(function(resolve){
          try { new THREE.GLTFLoader().parse(buffer, '', resolve, function(){ resolve(null); }); }
          catch(e){ resolve(null); }
        });
      }).catch(function(){ return null; });
      return Promise.race([request, timeout]).then(function(gltf){
        clearTimeout(timer);
        if(gltf){ gltf.userData = gltf.userData || {}; gltf.userData.reefShellyVariant = crafted ? 'crafted-organic-3' : 'natural-1'; }
        else R3shelly = null;
        return gltf;
      });
    }).catch(function(){ R3shelly = null; return null; });
    return R3shelly;
  }

  function reef3dShellyClipForEmote(name){
    if(name === 'hello' || name === 'cheer' || name === 'giggle') return 'Happy';
    if(name === 'look' || name === 'startle') return 'Curious';
    if(name === 'dance' || name === 'twirl') return 'Celebrate';
    if(name === 'dive') return 'Swim';
    if(name === 'bonk') return 'Turn';
    return 'Idle';
  }

  function reef3dShellyCameraYaw(view){
    var gp = view.guide.position;
    var angle = Math.atan2(view.cam.position.x - gp.x, view.cam.position.z - gp.z) - view.guide.rotation.y;
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function reef3dShellyDisposeRig(root){
    if(!root) return;
    var seen = [];
    root.traverse(function(obj){
      var skeleton = obj.isSkinnedMesh && obj.skeleton;
      if(skeleton && seen.indexOf(skeleton) < 0){
        seen.push(skeleton);
        skeleton.dispose(); // releases this clone's GPU bone texture
      }
    });
  }

  function reef3dShellyAttach(view, gltf){
    if(!view || view.night || !gltf || !gltf.scene || !gltf.animations || !view.guide) return false;
    var THREE = window.THREE, body = view.guide.userData.body;
    if(!THREE || !THREE.SkeletonUtils || !body || view.guide.userData.shelly) return false;
    var clips = {};
    gltf.animations.forEach(function(clip){ clips[clip.name] = clip; });
    if(REEF3D_SHELLY_CLIPS.some(function(name){ return !clips[name]; })) return false;

    var root, hat, mouth, head, mats = [], maps = [];
    try {
      root = THREE.SkeletonUtils.clone(gltf.scene);
      root.traverse(function(obj){
        if(obj.name === 'HatAnchor') hat = obj;
        else if(obj.name === 'MouthAnchor') mouth = obj;
        else if(obj.name === 'Head') head = obj;
      });
      if(!hat || !mouth || !head) throw new Error('Missing Shelly anchor');

      // Keep the authored linear vertex/material colours and PBR settings.
      // The board's legacy renderer writes linear output; encode only Shelly's
      // final lit colour so her palette matches an sRGB reference/viewer.
      root.traverse(function(obj){
        if(!obj.isMesh) return;
        function copyMaterial(src){
          var mat = src.clone(); mats.push(mat);
          mat.onBeforeCompile = function(shader){
            shader.fragmentShader = shader.fragmentShader.replace('#include <encodings_fragment>', 'gl_FragColor = LinearTosRGB( gl_FragColor );');
          };
          mat.customProgramCacheKey = function(){ return 'shelly-srgb-v1'; };
          mat.skinning = !!obj.isSkinnedMesh;
          mat.morphTargets = !!(obj.morphTargetInfluences && obj.morphTargetInfluences.length);
          mat.morphNormals = !!(obj.geometry.morphAttributes && obj.geometry.morphAttributes.normal && obj.geometry.morphAttributes.normal.length);
          if(mat.map && mat.emissiveMap && mat.map.image === mat.emissiveMap.image) mat.emissiveMap = mat.map;
          ['map','emissiveMap','roughnessMap','metalnessMap','normalMap','aoMap'].forEach(function(property){
            if(mat[property]) maps.push({ material: mat, property: property, texture: mat[property] });
          });
          mat.needsUpdate = true;
          return mat;
        }
        obj.material = Array.isArray(obj.material) ? obj.material.map(copyMaterial) : copyMaterial(obj.material);
        obj.castShadow = true;
        obj.receiveShadow = true;
        if(obj.isSkinnedMesh) obj.frustumCulled = false;
      });

      // Fit her baby proportions to the route without shrinking her face.
      var box = new THREE.Box3().setFromObject(root), size = new THREE.Vector3();
      box.getSize(size);
      if(!isFinite(size.y) || size.y < .01) throw new Error('Empty Shelly model');
      var crafted = gltf.userData && gltf.userData.reefShellyVariant === 'crafted-organic-3';
      var scale = crafted ? Math.min(1.48 / size.y, 2.05 / size.x, 2.2 / size.z) : 1.48 / size.y;
      root.scale.setScalar(scale);
      root.position.set(-(box.min.x + size.x / 2) * scale, -box.min.y * scale, -(box.min.z + size.z / 2) * scale);
      hat.userData.size = .34 / scale;
      var mixer = new THREE.AnimationMixer(root), actions = {};
      REEF3D_SHELLY_CLIPS.forEach(function(name){
        var action = mixer.clipAction(clips[name]);
        if(name !== 'Idle' && name !== 'Swim'){
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        actions[name] = action;
      });
      var state = {
        root: root, mixer: mixer, actions: actions, clips: clips, materials: mats, maps: maps,
        variant: crafted ? 'crafted-organic-3' : 'natural-1',
        current: null, action: null, calm: false, lastX: view.guide.position.x,
        lastZ: view.guide.position.z, lastYaw: view.guide.rotation.y, turnUntil: 0,
        idleAt: 0,
        play: function(name){
          var next = actions[name] || actions.Idle;
          if(this.action === next) return;
          var prev = this.action;
          next.reset().play();
          if(prev) prev.crossFadeTo(next, .22, false);
          else next.fadeIn(.22);
          this.action = next;
          this.current = name;
        }
      };
      state.play('Idle');
      while(body.children.length) body.remove(body.children[0]);
      body.add(root);
      view.guide.userData.parts = { hat: hat, mouth: mouth, neck: head, flippers: [] };
      view.guide.userData.shelly = state;
      reef3dShellyQuality(view);
      return true;
    } catch(e){
      reef3dShellyDisposeRig(root);
      mats.forEach(function(mat){ mat.dispose(); });
      return false;
    }
  }

  function reef3dShellyFrame(view, now, dt, calm, pose){
    var state = view && view.guide && view.guide.userData.shelly;
    if(!state) return;
    var elapsed = state.frameAt ? Math.max(0, Math.min(.5, (now - state.frameAt) / 1000)) : dt;
    state.frameAt = now;
    if(calm){
      if(!state.calm){
        state.mixer.stopAllAction();
        state.action = null;
        state.current = null;
        state.play('Idle');
        state.action.setEffectiveWeight(1);
        state.action.paused = true;
        state.mixer.update(0);
        state.idleAt = 0;
        if(!view.moving){
          var body = view.guide.userData.body;
          body.position.set(0, 0, 0);
          body.rotation.set(0, reef3dShellyCameraYaw(view) * .82, 0);
          body.scale.set(1, 1, 1);
        }
        state.calm = true;
      }
      state.lastX = view.guide.position.x;
      state.lastZ = view.guide.position.z;
      state.lastYaw = view.guide.rotation.y;
      if(!view.moving) view.guide.userData.body.rotation.y = reef3dShellyCameraYaw(view) * .82;
      return;
    }
    if(state.calm){ state.action.paused = false; state.calm = false; }
    if(view.moving){
      // A greeting may have aimed at the viewer just before a route starts.
      // Ease that local offset out so the swim follows the route's heading.
      view.guide.userData.body.rotation.y *= Math.max(0, 1 - dt * 8);
    } else {
      var heroBody = view.guide.userData.body;
      var emote = view.emote && view.emote.name;
      var face = emote === 'bonk' || emote === 'dive' ? 0 : Math.max(.82, pose && pose.face || 0);
      var angle = reef3dShellyCameraYaw(view) * face;
      var ease = Math.min(1, dt * 7), yawOff = Math.atan2(Math.sin(angle - heroBody.rotation.y), Math.cos(angle - heroBody.rotation.y));
      heroBody.rotation.y += yawOff * ease;
      var lift = emote === 'bonk' || emote === 'dive' ? pose && pose.y || 0 : 0;
      if(emote === 'bonk') lift *= .72; // the taller baby head reaches the same dice block
      var pitch = emote === 'dive' || emote === 'bonk' ? pose && pose.rx || 0 : 0;
      heroBody.position.y += (lift - heroBody.position.y) * ease;
      heroBody.rotation.x += (pitch - heroBody.rotation.x) * ease;
      heroBody.rotation.z += (0 - heroBody.rotation.z) * ease;
      if(!view.emote){
        if(!state.idleAt) state.idleAt = now + 6000 + Math.random() * 5000;
        else if(now > state.idleAt){ state.idleAt = 0; reef3dEmote(view, 'look'); }
      } else state.idleAt = 0;
    }
    var pos = view.guide.position, dx = pos.x - state.lastX, dz = pos.z - state.lastZ;
    var speed = elapsed > 0 ? Math.sqrt(dx * dx + dz * dz) / elapsed : 0;
    state.lastX = pos.x; state.lastZ = pos.z;
    var yaw = view.guide.rotation.y;
    var turn = Math.atan2(Math.sin(yaw - state.lastYaw), Math.cos(yaw - state.lastYaw));
    state.lastYaw = yaw;
    if(!view.moving && Math.abs(turn) > .09) state.turnUntil = now + 500;
    var wanted = view.emote ? reef3dShellyClipForEmote(view.emote.name) :
      view.moving ? 'Swim' : now < state.turnUntil ? 'Turn' : 'Idle';
    state.play(wanted);
    if(wanted === 'Swim') state.action.timeScale = view.moving ? 2.4 / REEF3D_HOP_TIME_SCALE : Math.max(.75, Math.min(1.7, speed / 6));
    else state.action.timeScale = 1;
    state.mixer.update(Math.max(0, elapsed || 0));
  }

  function reef3dShellyDispose(view){
    var state = view && view.guide && view.guide.userData.shelly;
    if(!state) return;
    state.mixer.stopAllAction();
    state.mixer.uncacheRoot(state.root);
    reef3dShellyDisposeRig(state.root);
    if(state.root.parent) state.root.parent.remove(state.root);
    state.materials.forEach(function(mat){ mat.dispose(); });
    view.guide.userData.shelly = null;
  }
