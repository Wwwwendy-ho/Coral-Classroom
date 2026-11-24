// Run with: node tools/check/region_resident_close_test.js
const assert=require('assert'),fs=require('fs'),vm=require('vm'),THREE=require('../../three.min.js');
const people=fs.readFileSync('src/js/reef3d/region-people.js','utf8'),moduleCode=fs.readFileSync('src/js/reef3d/resident-models.js','utf8');
let fetches=[],parseCallback=null,timers=[],inlineIds=new Set(),calm=false;
THREE.GLTFLoader=class {parse(bytes,path,ok){parseCallback=ok;}};
const c={window:{THREE},document:{hidden:false,getElementById(id){return inlineIds.has(id)?{textContent:'AQID'}:null;}},R3:{view:null},Math,Set,AbortController,
 setTimeout(fn){const t={fn,cleared:false};timers.push(t);return t;},clearTimeout(t){if(t)t.cleared=true;},reefCalm:()=>calm,regionEncounterActive:()=>true,
 reefInstallGLTF(){},fetch(url,options){fetches.push({url,options});return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))});}};
vm.createContext(c);const a=people.indexOf('  var REGION_PERSON_SCALE='),b=people.indexOf('  // All octopus skin pieces',a);
vm.runInContext(people.slice(a,b)+moduleCode,c);
const tick=()=>new Promise(r=>setImmediate(r));
function fixtureModel(height=1.4,resources={}){
 const root=new THREE.Group(),geometry=resources.geometry||new THREE.BoxGeometry(.8,height,.6),material=resources.material||new THREE.MeshStandardMaterial();
 if(resources.texture) material.map=resources.texture;
 const mesh=new THREE.Mesh(geometry,material);mesh.position.y=height/2;root.add(mesh);
 if(resources.skeleton) mesh.skeleton=resources.skeleton;
 return {scene:root,animations:[new THREE.AnimationClip('Idle',1,[]),new THREE.AnimationClip('React',.5,[])]};
}
function makeView(){
 const actor=new THREE.Group(),old=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());old.position.y=1;actor.add(old);actor.scale.setScalar(.95);c.regionPeopleCacheBounds(actor);
 const town={meta:{id:'taxi'},object:actor,space:{i:1,x:0,z:0}},view={region:{id:'town'},regionPeople:{towns:[town]},wrap:{isConnected:true},spaces:[{i:0,x:20,z:0}],guide:{position:new THREE.Vector3(100,0,0)},cam:new THREE.PerspectiveCamera(42,1,.1,100)};
 c.R3.view=view;c.regionResidentLoad(view);const state=view.regionPeople.resident;
 state.pending=fixtureModel(1.6);assert(c.regionResidentAttach(view,state),'prepare actual board LOD');
 return {view,actor,old,state,boardRoot:state.root,boardBounds:actor.userData.regionBounds};
}
function begin(view,actor,phase='intro'){
 const saved={position:actor.position.clone(),rotation:actor.rotation.clone(),scale:actor.scale.clone()};
 view.encounter={phase,actor,savedActorTransform:saved,actorBounds:actor.userData.regionBounds};return view.encounter;
}
function startClose(f,phase='intro'){
 const e=begin(f.view,f.actor,phase);c.regionResidentCloseRequest(f.view,f.state);return e;
}

(async()=>{
 // A distant board view never fetches the close model; it fetches only when a
 // matching encounter starts, and repeated tick/request calls share one fetch.
 let f=makeView();c.regionResidentTick(f.view,10);assert.equal(fetches.length,0,'no close fetch while only on board');
 const intro=startClose(f,'intro');assert.equal(fetches.length,1);assert.equal(fetches[0].url.split('?')[0],'assets/models/taxi-squid-close.glb');
 c.regionResidentCloseRequest(f.view,f.state);c.regionResidentTick(f.view,20);assert.equal(fetches.length,1,'one request per encounter');
 await tick();const cb=parseCallback;const tex=new THREE.Texture(),skel=new THREE.Skeleton();let gd=0,md=0,td=0,sd=0;
 const cg=new THREE.BoxGeometry(.7,1.2,.5),cm=new THREE.MeshStandardMaterial();cg.addEventListener('dispose',()=>gd++);cm.addEventListener('dispose',()=>md++);tex.addEventListener('dispose',()=>td++);skel.dispose=()=>sd++;
 cb(fixtureModel(1.2,{geometry:cg,material:cm,texture:tex,skeleton:skel}));
 const close=f.state.close;assert(close.root && close.root.parent,'close model attached');assert.strictEqual(f.view.encounter.actor,f.actor,'same hit-test actor');
 assert(Math.abs(f.actor.userData.regionBounds.height-f.boardBounds.height)<1e-5,'close LOD preserves actor height');
 assert.strictEqual(f.view.encounter.actorBounds,f.actor.userData.regionBounds,'encounter bounds refreshed');
 assert(!f.boardRoot.visible && !f.old.visible,'board and procedural fallback hidden during close');
 // While the matching encounter remains active, distant LOD checks leave both
 // board models hidden beneath the close view. Normal end restores their state.
 f.view.guide.position.set(1000,0,1000);c.regionResidentTick(f.view,50);
 assert(!f.old.visible && !f.boardRoot.visible,'matching encounter keeps both board models hidden');
 c.regionResidentCloseEnd(f.view,intro);
 assert.strictEqual(f.actor.userData.regionBounds,f.boardBounds,'previous bounds restored');
 assert(f.boardRoot.parent && f.boardRoot.visible && !f.old.visible,'board restored and unused fallback remains hidden');
 assert(!close.root.parent,'close root detached on end');assert.equal(gd,1);assert.equal(md,1);assert.equal(td,1);assert.equal(sd,1,'unique close GPU and skeleton resources disposed');
 c.regionResidentDispose(f.view);

 // If navigation clears the encounter without the normal end hook, the next
 // tick closes the transient LOD and exposes only the far-board fallback.
 f=makeView();const orphaned=startClose(f,'lesson');await tick();
 const orphanCallback=parseCallback,og=new THREE.BoxGeometry(.7,1.2,.5),om=new THREE.MeshStandardMaterial();let orphanDisposed=0;
 og.addEventListener('dispose',()=>orphanDisposed++);orphanCallback(fixtureModel(1.2,{geometry:og,material:om}));
 const orphanRoot=f.state.close.root,orphanBounds=f.state.close.previousBounds;
 f.view.encounter=null;f.view.guide.position.set(1000,0,1000);c.regionResidentTick(f.view,80);
 assert.strictEqual(f.state.close,null,'orphan close cleaned on tick');assert(!orphanRoot.parent,'orphan close root detached');
 assert.strictEqual(f.actor.userData.regionBounds,orphanBounds,'orphan close bounds restored');
 assert(f.old.visible && !f.boardRoot.visible,'far board shows only procedural fallback after orphan cleanup');assert.equal(orphanDisposed,1,'orphan close resources disposed');
 c.regionResidentDispose(f.view);

 // Lesson requests are supported, and a completed/end encounter releases the
 // in-flight slot so the next encounter can make one fresh close request.
 f=makeView();let beforeFetches=fetches.length;const lesson=startClose(f,'lesson');assert.equal(fetches.length,beforeFetches+1);await tick();
 const late=parseCallback,lateAsset=fixtureModel(1.2);let lateDisposed=0;lateAsset.scene.children[0].geometry.addEventListener('dispose',()=>lateDisposed++);
 c.regionResidentCloseEnd(f.view,lesson);late(lateAsset);assert.equal(lateDisposed,1,'late callback after encounter end disposes parsed model');assert(!f.state.close);
 f.view.encounter=null;const next=startClose(f,'intro');assert.equal(fetches.length,beforeFetches+2,'next encounter can request close model');
 await tick();parseCallback(fixtureModel(1.2));assert(f.state.close.root,'next encounter attaches close model');
 c.regionResidentCloseEnd(f.view,next);c.regionResidentDispose(f.view);

 // A stale callback from a replaced profile/view also disposes instead of attaching.
 f=makeView();const staleEncounter=startClose(f);await tick();const staleCallback=parseCallback,staleAsset=fixtureModel(1.2);let staleDisposed=0;
 staleAsset.scene.children[0].geometry.addEventListener('dispose',()=>staleDisposed++);c.regionResidentDispose(f.view);const newer=makeView();staleCallback(staleAsset);
 assert.equal(staleDisposed,1,'stale profile/view callback disposes model');assert(!newer.state.close || !newer.state.close.root,'stale model never attaches to replacement view');c.regionResidentDispose(newer.view);

 // Timed out parsing likewise cannot attach later, and the next request can run.
 f=makeView();const timed=startClose(f);const timer=timers[timers.length-1];await tick();const timeoutCb=parseCallback;timer.fn();
 const timedAsset=fixtureModel(1.2);let timedDisposed=0;timedAsset.scene.children[0].geometry.addEventListener('dispose',()=>timedDisposed++);timeoutCb(timedAsset);
 assert.equal(timedDisposed,1,'late timed-out parse disposed');assert(!f.state.close.root,'timed-out parse does not attach');c.regionResidentCloseEnd(f.view,timed);c.regionResidentDispose(f.view);

 // Portable inline board without close payload must keep the close URL dormant.
 inlineIds.add('reef-resident-inline-taxi');f=makeView();beforeFetches=fetches.length;startClose(f,'lesson');assert.equal(fetches.length,beforeFetches,'no external close fetch for board-only inline portable build');
 assert(!f.state.close,'portable build skips unavailable close request');inlineIds.clear();c.regionResidentDispose(f.view);

 // A failed board-model download does not prevent an encounter-only close
 // request, and the close mixer continues even when there is no board root.
 f=makeView();c.regionResidentDispose(f.view); // dispose the prepared board and make a fresh unloaded view
 {
  const actor=new THREE.Group(),old=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());old.position.y=1;actor.add(old);actor.scale.setScalar(.95);c.regionPeopleCacheBounds(actor);
  const view={region:{id:'town'},regionPeople:{towns:[{meta:{id:'taxi'},object:actor,space:{i:1,x:0,z:0}}]},wrap:{isConnected:true},spaces:[{i:0,x:20,z:0}],guide:{position:new THREE.Vector3(0,0,0)},cam:new THREE.PerspectiveCamera(42,1,.1,100)};
  c.R3.view=view;c.regionResidentLoad(view);const state=view.regionPeople.resident;let boardAttempts=0,closeRequests=0;
  c.fetch=url=>{if(url.indexOf('taxi-squid-close')>=0){closeRequests++;return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))});}boardAttempts++;return Promise.reject(Error('board fixture offline'));};
  c.regionResidentTick(view,100);await tick();await tick();assert.equal(boardAttempts,1,'board request fails once');assert(!state.root);
  const e=begin(view,actor,'lesson');c.regionResidentTick(view,120);await tick();assert.equal(closeRequests,1,'close request proceeds after board failure');parseCallback(fixtureModel(1.2));
  assert(!state.root && state.close.root,'close model attaches without board root');let updates=0;state.close.mixer.update=()=>updates++;
  c.regionResidentTick(view,140);c.regionResidentTick(view,156);assert(updates>0,'close mixer animates without board root');
  c.regionResidentCloseEnd(view,e);c.regionResidentDispose(view);
 }
 // A resident can author attentive eye acting for conversations independently
 // of its board idle. No idle phase is transferred between different clips.
 f=makeView();f.state.action.time=.6;const listening=startClose(f,'lesson');await tick();
 const listeningAsset=fixtureModel(1.2);listeningAsset.animations.push(new THREE.AnimationClip('Listen',2,[]));
 parseCallback(listeningAsset);assert.equal(f.state.close.action.getClip().name,'Listen');
 assert.equal(f.state.close.action.time,0,'listening starts deliberately rather than at an unrelated idle pose');
 const poseTime=f.state.close.action.time;calm=true;c.regionResidentTick(f.view,500);
 assert.equal(f.state.close.action.time,poseTime,'Calm Motion pauses the attentive clip');calm=false;
 c.regionResidentCloseEnd(f.view,listening);assert(f.boardRoot.visible);c.regionResidentDispose(f.view);
 console.log('Passed: encounter-scoped close loading, attentive clip selection, identity/bounds, visibility restore, disposal, stale/timeout cleanup and portable inline behavior.');
})().catch(e=>{console.error(e);process.exitCode=1;});
