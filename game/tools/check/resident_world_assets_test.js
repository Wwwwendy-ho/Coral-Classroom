'use strict';
// Exercise actual resident GLBs through the real actor builder and attachment
// adapter. This is not a browser, GPU, visual, mask-coverage or topology test.
// Run: node tools/check/resident_world_assets_test.js
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createRequire}=require('module'),THREE=require('../../three.min.js'),root=path.resolve(__dirname,'../..');

// Reuse the checked-in integration fixture rather than rebuilding its actual
// town/beach actors. Appending this export has no effect on the source fixture.
const fixturePath=path.join(root,'tools/check/region_people_actual_test.js'),fixtureModule={exports:{}};
const fixtureSandbox={require:createRequire(fixturePath),module:fixtureModule,exports:fixtureModule.exports,
  __filename:fixturePath,__dirname:path.dirname(fixturePath),console};
vm.runInNewContext(fs.readFileSync(fixturePath,'utf8')+'\nmodule.exports={c,makeView};',fixtureSandbox,{filename:fixturePath});
const {c,makeView}=fixtureModule.exports;
const residentSource=fs.readFileSync(path.join(root,'src/js/reef3d/resident-models.js'),'utf8');
const loaderSource=fs.readFileSync(path.join(root,'src/js/vendor/three-gltfloader.js'),'utf8');
c.THREE=THREE;c.self=c;c.URL=URL;c.Blob=Blob;c.TextDecoder=TextDecoder;c.R3={view:null};
vm.runInContext(loaderSource,c);c.reefInstallGLTF();
vm.runInContext(residentSource,c);
// This test registry is local to the fixture context; no runtime files change.
c.regionResidentEnable('jisu');c.regionResidentEnable('shop-octopus');
c.REGION_RESIDENT_CANDIDATES['shop-octopus'].url='candidate-board.glb';
c.REGION_RESIDENT_CANDIDATES['shop-octopus'].closeUrl='candidate-close.glb';
THREE.TextureLoader.prototype.load=function(url,onLoad){const texture=new THREE.Texture();queueMicrotask(()=>onLoad(texture));return texture;};

function bytes(file){assert(fs.existsSync(file),'missing actual GLB: '+file);return fs.readFileSync(file);}
function parse(file){
  const b=bytes(file),buffer=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
  return new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(buffer,'',resolve,reject));
}
function cloneTransform(actor){return {position:actor.position.clone(),rotation:actor.rotation.clone(),scale:actor.scale.clone()};}
function deliveryPreserved(motion){
  return motion.position.distanceTo(new THREE.Vector3(.19,.03,-.08))<1e-6&&
    Math.abs(motion.rotation.x)<1e-6&&Math.abs(motion.rotation.y-.11)<1e-6&&Math.abs(motion.rotation.z)<1e-6;
}
function addResident(view,id){
  c.R3.view=view;view.cam=new THREE.PerspectiveCamera(42,.5,.1,100);
  c.regionResidentLoad(view);
  const state=view.regionPeople.residents.find(s=>s.entry.id===id);
  assert(state,id+' target resolves in actual procedural actor fixture');
  return state;
}
function assertTileClear(view,actor){
  const b=actor.userData.regionBounds;
  for(const tile of view.spaces)
    assert(Math.hypot(actor.position.x-tile.x,actor.position.z-tile.z)>=b.radius+1.25-1e-5,
      actor.userData.species+' footprint overlaps a tile');
}
function assertCameraFits(view,actor,visual){
  const out=new THREE.Vector3(),look=new THREE.Vector3();
  assert(c.regionEncounterCamera(view,out,look),'encounter camera accepted actual target');
  view.cam.position.copy(out);view.cam.lookAt(look);view.cam.updateProjectionMatrix();view.cam.updateMatrixWorld(true);
  actor.updateMatrixWorld(true);
  const p=new THREE.Vector3();let maxX=0,maxY=0,count=0;
  visual.traverse(o=>{
    if(!o.isMesh||!o.geometry.attributes.position)return;
    const attr=o.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
      p.fromBufferAttribute(attr,i);
      if(o.isSkinnedMesh)o.boneTransform(i,p);
      p.applyMatrix4(o.matrixWorld).project(view.cam);
      maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));count++;
    }
  });
  assert(count>0,'actual mesh vertices were projected');
  assert(maxX<1&&maxY<1,'deformed resident fits encounter portrait frame ('+maxX.toFixed(3)+', '+maxY.toFixed(3)+')');
}
function triangleCount(root){
  let count=0;root.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry.attributes.position)
    count+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return count;
}
async function exercise(id,region,activities,files){
  const view=makeView(region,activities),state=addResident(view,id),actor=state.target.object;
  const motion=actor.userData.deliveryMotion;
  if(id==='jisu'){
    assert(motion,'Jisu target retains deliveryMotion parent');
    // Translation plus yaw exercise preservation without changing world height.
    motion.position.set(.19,.03,-.08);motion.rotation.set(0,.11,0);
  }
  const fallbackHeight=actor.userData.regionBounds.height;
  const skin=state.target.skin,skinAdapters=skin&&skin.meshes.length;
  state.pending=await parse(files.board);
  assert(c.regionResidentAttach(view,state),id+' actual board GLB attaches');
  const boardRoot=state.root,boardBounds=actor.userData.regionBounds,boardTriangles=triangleCount(boardRoot);
  assert(Math.abs(boardBounds.height-fallbackHeight)<1e-4,id+' board fit preserves procedural world height ('+fallbackHeight+' -> '+boardBounds.height+')');
  assertTileClear(view,actor);
  if(id==='jisu'){
    assert.strictEqual(boardRoot.parent,motion,'Jisu board model remains inside deliveryMotion');
    assert(deliveryPreserved(motion),'Jisu delivery transform is preserved');
  } else {
    assert(skin.meshes.length===skinAdapters+1,'octopus board skin adapter attaches');
  }

  const encounter={phase:'intro',actor,savedActorTransform:cloneTransform(actor),actorBounds:boardBounds};
  view.encounter=encounter;
  assertCameraFits(view,actor,boardRoot);
  assert(state.mixer,'actual board Idle mixer exists');state.mixer.update(.32);assertCameraFits(view,actor,boardRoot);
  const close={encounter};state.close=close;
  const closeModel=await parse(files.close),disposed=[];
  const closeTriangles=triangleCount(closeModel.scene);
  closeModel.scene.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>disposed.push(o.geometry));});
  c.regionResidentCloseAttach(view,state,close,closeModel);
  assert(close.root,'actual close GLB attaches');
  assert(Math.abs(actor.userData.regionBounds.height-fallbackHeight)<1e-4,id+' close fit preserves procedural world height');
  assertTileClear(view,actor);
  assertCameraFits(view,actor,close.root);
  assert(close.mixer,'actual close Listen mixer exists');close.mixer.update(.28);assertCameraFits(view,actor,close.root);
  if(id==='jisu'){
    assert.strictEqual(close.root.parent,motion,'Jisu close model remains inside deliveryMotion');
    assert(deliveryPreserved(motion),'Jisu close preserves delivery transform');
  } else {
    assert(skin.meshes.length===skinAdapters+2,'octopus close skin adapter attaches');
  }
  c.regionResidentCloseEnd(view,encounter);
  assert.strictEqual(actor.userData.regionBounds,boardBounds,id+' close end restores board bounds');
  assert(boardRoot.visible&&boardRoot.parent,'close end restores actual board LOD');
  assert(disposed.length>0,'close geometry disposed on encounter end');
  if(id==='jisu'){
    assert.strictEqual(boardRoot.parent,motion,'Jisu board remains under delivery parent after close');
    assert(deliveryPreserved(motion),'Jisu delivery transform survives close cleanup');
  } else {
    assert.equal(skin.meshes.length,skinAdapters+1,'close cleanup releases only close skin adapter');
  }
  c.regionResidentDispose(view);
  if(id==='shop-octopus')assert.equal(skin.meshes.length,skinAdapters,'dispose releases board skin adapter');
  return {id,worldHeight:fallbackHeight,boardTriangles,closeTriangles};
}

(async()=>{
  const octDir=path.join(root,'art-source/npcs/shop-octopus/production');
  const results=[];
  results.push(await exercise('jisu','beach',c.BB_BOTTLES.map(x=>x.id).concat('letters'),{
    board:path.join(root,'assets/models/jisu.glb'),close:path.join(root,'assets/models/jisu-close.glb')}));
  results.push(await exercise('shop-octopus','town',c.TOWN_FOLK.map(x=>x.id),{
    board:path.join(octDir,'shop-octopus-board.glb'),close:path.join(octDir,'shop-octopus-close.glb')}));
  assert(results[0].worldHeight<results[1].worldHeight*.3,'Jisu remains tiny relative to town octopus');
  console.log(JSON.stringify({pass:true,results,note:'Actual actor/GLB attachment and projection only; no browser/device, alpha-coverage, species appearance, or eight-arm topology claim.'},null,2));
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
