/* Shelly review: embedded offline by default, optionally a shared hosted GLB. Separate from game state. */
reefInstallGLTF();
(function(){
  'use strict';
  var canvas=document.getElementById('view'),status=document.getElementById('status'),renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:false,alpha:true,powerPreference:'low-power'});}
  catch(e){status.textContent='3D is unavailable here. The animation video and still views are available below.';return;}
  renderer.outputEncoding=THREE.sRGBEncoding;
  var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,40);
  scene.add(new THREE.HemisphereLight('#fff6e2','#3f7f88',.5));
  var key=new THREE.DirectionalLight('#fff1d2',.72);key.position.set(6,18,8);scene.add(key);
  var mixer,actions={},active,model,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var azimuth=.55,elevation=.24,distance=3.4,targetY=.74,drag=null,raf=0,last=0,dirty=true;
  var onScreen=true,mode='smooth',budget=450000,software=false,windowStart=0,frameCount=0,fps=0;
  var gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  if(debug)software=/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  if(software)budget=280000;
  var motion=document.getElementById('motion');
  function motionLabel(){motion.textContent=paused?'Play animation':'Pause animation';motion.setAttribute('aria-pressed',String(paused));}
  function shouldAnimate(){return !!mixer&&!!active&&!paused&&onScreen&&!document.hidden;}
  function wake(){dirty=true;if(!raf&&onScreen&&!document.hidden){last=performance.now();raf=requestAnimationFrame(frame);}}
  function fit(){
    var box=canvas.parentElement.getBoundingClientRect(),pixels=Math.max(1,box.width*box.height);
    renderer.setPixelRatio(Math.max(.5,Math.min(devicePixelRatio||1,mode==='fine'?1.5:1,Math.sqrt(budget/pixels))));
    renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();wake();
  }
  function positionCamera(){camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance+targetY,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(0,targetY,0);wake();}
  function preset(name){
    var views={front:[0,.12,3.4,.74],quarter:[.55,.24,3.4,.74],left:[-Math.PI/2,.2,3.4,.74],right:[Math.PI/2,.2,3.4,.74],back:[Math.PI,.25,3.4,.74],game:[.15,.86,3.4,.74],face:[0,.10,2.55,1.02]},v=views[name]||views.quarter;
    azimuth=v[0];elevation=v[1];distance=v[2];targetY=v[3];positionCamera();
  }
  function play(name,user){
    if(!actions[name])return;
    if(user){paused=false;motionLabel();preset(name==='Happy'||name==='Curious'?'face':'quarter');}
    var next=actions[name];next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if(active&&active!==next)active.crossFadeTo(next,.2,false);active=next;
    document.querySelectorAll('[data-clip]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.clip===name));});
    if(paused)mixer.update(0);wake();
  }
  function frame(now){
    raf=0;
    // Advance by elapsed visible time. A slow renderer must not turn a wave into
    // imperceptible slow motion; the old 50ms cap did exactly that below 20fps.
    var dt=last?Math.max(0,Math.min(1,(now-last)/1000)):0;last=now;
    if(shouldAnimate()){mixer.update(dt);dirty=true;}
    if(dirty){renderer.render(scene,camera);dirty=false;frameCount++;}
    if(!windowStart)windowStart=now;
    if(now-windowStart>=1800&&shouldAnimate()){
      fps=frameCount*1000/(now-windowStart);frameCount=0;windowStart=now;
      if(mode==='smooth'&&fps<24&&budget>160000){budget=Math.max(160000,Math.round(budget*.7));fit();}
    }
    if(!raf&&(shouldAnimate()||dirty))raf=requestAnimationFrame(frame);
  }
  motionLabel();
  function loadModelSource(source,onLoad,onError){
    var loader=new THREE.GLTFLoader();
    if(source.url){loader.load(source.url,onLoad,undefined,onError);return;}
    try {
      var raw=atob(source.embedded),bytes=new Uint8Array(raw.length);
      for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      loader.parse(bytes.buffer,'',onLoad,onError);
    } catch(error){onError(error);}
  }
  var source=__MODEL_SOURCE__;
  loadModelSource(source,function(gltf){
    model=gltf.scene;
    model.traverse(function(o){if(!o.isMesh)return;o.frustumCulled=false;[].concat(o.material).forEach(function(m){m.skinning=!!o.isSkinnedMesh;m.morphTargets=!!o.morphTargetInfluences;if(m.map&&m.emissiveMap&&m.map.image===m.emissiveMap.image)m.emissiveMap=m.map;m.needsUpdate=true;});});
    var box=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();box.getSize(size);var scale=1.48/(size.y||1);model.scale.setScalar(scale);model.position.set(-(box.min.x+size.x/2)*scale,-box.min.y*scale,-(box.min.z+size.z/2)*scale);
    scene.add(model);mixer=new THREE.AnimationMixer(model);gltf.animations.forEach(function(c){actions[c.name]=mixer.clipAction(c);});
    document.querySelectorAll('[data-clip]').forEach(function(b){b.disabled=!actions[b.dataset.clip];});play('Idle',false);
    status.textContent='Drag to rotate · Select a clip to play · Try Face view for the eyes and head gestures';wake();
  },function(){status.textContent='The 3D model could not load. The animation video and still views are available below.';});
  document.querySelectorAll('[data-clip]').forEach(function(b){b.addEventListener('click',function(){play(b.dataset.clip,true);});});
  motion.addEventListener('click',function(){paused=!paused;motionLabel();wake();});
  document.getElementById('reset').addEventListener('click',function(){preset('quarter');});
  document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){preset(b.dataset.view);});});
  document.querySelectorAll('[data-quality]').forEach(function(b){b.addEventListener('click',function(){mode=b.dataset.quality;budget=mode==='fine'?1000000:software?280000:450000;document.querySelectorAll('[data-quality]').forEach(function(q){q.setAttribute('aria-pressed',String(q===b));});fit();});});
  canvas.addEventListener('pointerdown',function(e){drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;azimuth-=(e.clientX-drag[0])*.008;elevation=Math.max(.05,Math.min(1.4,elevation+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];positionCamera();});
  canvas.addEventListener('pointerup',function(){drag=null;});canvas.addEventListener('pointercancel',function(){drag=null;});
  canvas.addEventListener('wheel',function(e){e.preventDefault();distance=Math.max(1.8,Math.min(8,distance+e.deltaY*.003));positionCamera();},{passive:false});
  canvas.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')azimuth-=.15;else if(e.key==='ArrowRight')azimuth+=.15;else if(e.key==='ArrowUp')elevation=Math.min(1.4,elevation+.1);else if(e.key==='ArrowDown')elevation=Math.max(.05,elevation-.1);else if(e.key==='+')distance=Math.max(1.8,distance-.3);else if(e.key==='-')distance=Math.min(8,distance+.3);else return;e.preventDefault();positionCamera();});
  document.addEventListener('visibilitychange',function(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});
  if(window.IntersectionObserver)new IntersectionObserver(function(entries){onScreen=entries[0].isIntersecting;if(!onScreen){cancelAnimationFrame(raf);raf=0;}else wake();}).observe(canvas);
  addEventListener('resize',fit);fit();positionCamera();
  // Deterministic asset production and existing project checks. A sampled movie
  // can play smoothly even when a review browser uses software graphics.
  window.__shellyPreview={
    info:function(){return {ready:!!model,paused:paused,active:active&&active.getClip().name,time:active&&active.time,fps:fps,software:software,pixels:canvas.width*canvas.height,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,budget:budget};},
    sample:function(name,time,view,w,h){
      if(!mixer||!actions[name])throw Error('Model is not ready');
      paused=true;motionLabel();cancelAnimationFrame(raf);raf=0;
      mixer.stopAllAction();active=actions[name];active.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();mixer.update(time);preset(view||'quarter');cancelAnimationFrame(raf);raf=0;
      if(w&&h){renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
      var background=scene.background;scene.background=new THREE.Color('#d7e8df');renderer.render(scene,camera);scene.background=background;dirty=false;return canvas.toDataURL('image/png');
    }
  };
})();
