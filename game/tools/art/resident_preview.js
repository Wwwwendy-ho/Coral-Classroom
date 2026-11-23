/* Standalone review viewer for the actual resident asset. */
reefInstallGLTF();
(function(){
  'use strict';
  var preview=window.REGION_RESIDENT_PREVIEW || {};
  var canvas=document.getElementById('view'), status=document.getElementById('status'), motion=document.getElementById('motion');
  var renderer;
  try { renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:false,alpha:true,powerPreference:'low-power'}); }
  catch(e){ status.textContent='The 3D preview is unavailable in this browser.'; return; }
  renderer.outputEncoding=THREE.sRGBEncoding;
  var scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(38,1,.01,100);
  scene.add(new THREE.HemisphereLight(0xf0fffc,0x729496,1.05));
  var key=new THREE.DirectionalLight(0xfff4e3,.9); key.position.set(4,7,5); scene.add(key);
  var fill=new THREE.DirectionalLight(0xd7efff,.3); fill.position.set(-4,3,-3); scene.add(fill);
  var mixer, actions={}, active, model, paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var yawOffset=+preview.yawOffset || 0;
  var azimuth=.55+yawOffset, elevation=.14, distance=3.8, targetY=.75, drag=null;
  var raf=0, timer=0, last=0, lastRender=0, dirty=true, onScreen=true;
  function visible(){ return onScreen&&!document.hidden; }
  function animating(){ return visible()&&!paused&&!!active; }
  function cancel(){ if(raf)cancelAnimationFrame(raf); if(timer)clearTimeout(timer); raf=0; timer=0; last=0; }
  function wake(){ dirty=true; if(visible()&&!raf&&!timer)raf=requestAnimationFrame(frame); }
  function schedule(){
    if(!animating()||raf||timer)return;
    timer=setTimeout(function(){ timer=0; if(visible()&&animating())raf=requestAnimationFrame(frame); },Math.max(0,34-(performance.now()-lastRender)));
  }
  function frame(now){
    raf=0;
    if(!visible()){ last=0; return; }
    if(animating()){
      if(last)mixer.update(Math.min(.25,Math.max(0,(now-last)/1000)));
      last=now; dirty=true;
    } else last=0;
    if(dirty){ renderer.render(scene,camera); dirty=false; lastRender=now; }
    schedule();
  }
  function labelMotion(){motion.textContent=paused?'Play animation':'Pause animation';motion.setAttribute('aria-pressed',String(!paused));}
  function fit(){
    var box=canvas.parentElement.getBoundingClientRect(); if(!box.width||!box.height)return;
    var ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(900000/(box.width*box.height)));
    renderer.setPixelRatio(ratio); renderer.setSize(box.width,box.height,false);
    camera.aspect=box.width/box.height; camera.updateProjectionMatrix(); position();
  }
  function position(){var d=distance*Math.max(1,.7/camera.aspect);camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*d,targetY+Math.sin(elevation)*d,Math.cos(azimuth)*Math.cos(elevation)*d);camera.lookAt(0,targetY,0);wake();}
  function preset(name){
    var views={front:[0,.1,3.8,.75],quarter:[.55,.14,3.8,.75],left:[-Math.PI/2,.12,3.8,.75],right:[Math.PI/2,.12,3.8,.75],back:[Math.PI,.12,3.8,.75],face:[0,.02,1.1,1.02]}, v=views[name]||views.quarter;
    azimuth=v[0]+yawOffset;elevation=v[1];distance=v[2];targetY=name==='face' && preview.faceTargetY ? preview.faceTargetY : v[3];position();
  }
  function play(name,explicit){
    if(!actions[name])return;
    if(active&&active!==actions[name])active.stop();
    active=actions[name];active.reset().play();mixer.update(0);
    if(explicit){paused=false;labelMotion();}
    document.querySelectorAll('[data-clip]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.clip===name));});
    wake();
  }
  labelMotion();
  document.querySelectorAll('[data-clip]').forEach(function(b){b.disabled=true;b.addEventListener('click',function(){play(b.dataset.clip,true);});});
  motion.disabled=true;
  var controller=new AbortController(), loadDone=false;
  function fail(){if(loadDone)return;loadDone=true;clearTimeout(loadTimer);controller.abort();status.textContent='Preview could not load. Reload to try again.';}
  function disposeLate(gltf){
    gltf.scene.traverse(function(o){
      if(o.geometry)o.geometry.dispose();
      [].concat(o.material||[]).forEach(function(m){Object.keys(m).forEach(function(k){if(m[k]&&m[k].isTexture)m[k].dispose();});m.dispose();});
    });
  }
  var loadTimer=setTimeout(fail,10000);
  function loaded(gltf){
    if(loadDone){disposeLate(gltf);return;}
    loadDone=true;clearTimeout(loadTimer);
    model=gltf.scene;
    var bounds=new THREE.Box3().setFromObject(model), size=new THREE.Vector3(), center=new THREE.Vector3();
    bounds.getSize(size);bounds.getCenter(center);
    var scale=1.5/Math.max(size.y,size.x*.8,size.z*.8,.001);
    var pivot=new THREE.Group();pivot.scale.setScalar(scale);pivot.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);pivot.add(model);scene.add(pivot);
    mixer=new THREE.AnimationMixer(model);
    gltf.animations.forEach(function(clip){actions[clip.name]=mixer.clipAction(clip);});
    document.querySelectorAll('[data-clip]').forEach(function(b){b.disabled=!actions[b.dataset.clip];});
    motion.disabled=!actions.Idle&&!actions.React;
    if(actions.Idle)play('Idle',false);else if(actions.React)play('React',false);
    status.textContent='Drag or use the angle buttons to inspect the model.'; wake();
  }
  fetch(preview.modelUrl || 'game/assets/models/taxi-squid-close.glb',{signal:controller.signal}).then(function(response){
    if(!response.ok)throw new Error('Load failed');return response.arrayBuffer();
  }).then(function(bytes){
    if(!loadDone)new THREE.GLTFLoader().parse(bytes,'',loaded,fail);
  }).catch(fail);
  motion.addEventListener('click',function(){paused=!paused;labelMotion();cancel();wake();});
  document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){preset(b.dataset.view);});});
  canvas.addEventListener('pointerdown',function(e){drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;azimuth-=(e.clientX-drag[0])*.008;elevation=Math.max(-.45,Math.min(1.2,elevation+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];position();});
  canvas.addEventListener('pointerup',function(){drag=null;});canvas.addEventListener('pointercancel',function(){drag=null;});
  canvas.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')azimuth-=.15;else if(e.key==='ArrowRight')azimuth+=.15;else if(e.key==='ArrowUp')elevation=Math.min(1.2,elevation+.1);else if(e.key==='ArrowDown')elevation=Math.max(-.45,elevation-.1);else return;e.preventDefault();position();});
  document.addEventListener('visibilitychange',function(){if(!visible())cancel();else wake();});
  if(window.IntersectionObserver)new IntersectionObserver(function(entries){onScreen=entries[0].isIntersecting;if(!visible())cancel();else wake();}).observe(canvas);
  window.addEventListener('resize',fit);fit();position();
})();
