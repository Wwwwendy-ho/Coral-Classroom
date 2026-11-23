// Run with: node tools/check/region_resident_cast_test.js
const assert=require('assert'),fs=require('fs'),vm=require('vm'),THREE=require('../../three.min.js');
const people=fs.readFileSync('src/js/reef3d/region-people.js','utf8');
const residentCode=fs.readFileSync('src/js/reef3d/resident-models.js','utf8');
// Check the real activation list, then use a bounded registry fixture to keep
// dormant/explicit-activation scenarios independent of new production releases.
const production={};vm.createContext(production);vm.runInContext(residentCode,production);
assert(production.REGION_RESIDENT_VALIDATED_IDS.includes('cafe-seahorse'));
assert(production.REGION_RESIDENT_VALIDATED_IDS.includes('jisu'));
for(const id of production.REGION_RESIDENT_VALIDATED_IDS){
 const entry=production.REGION_RESIDENT_CANDIDATES[id];assert(entry,'validated resident candidate exists');
 for(const key of ['url','closeUrl']) assert(entry[key]&&fs.existsSync(entry[key].split('?')[0]),id+' '+key+' exists');
}
const fixtureCode=residentCode.replace(/var REGION_RESIDENT_VALIDATED_IDS = \[[^\]]*\];/,"var REGION_RESIDENT_VALIDATED_IDS = ['cafe-seahorse'];");
const requests=[],parses=[],timers=[];let calm=false;
THREE.GLTFLoader=class {parse(bytes,path,ok){parses.push(ok);}};
const c={window:{THREE},document:{hidden:false},R3:{view:null},Math,Set,Float32Array,AbortController,performance:{now:()=>0},
 reefCalm:()=>calm,regionEncounterActive:()=>true,reefInstallGLTF(){},
 setTimeout(fn){const t={fn};timers.push(t);return t;},clearTimeout(){},
 fetch(url,options){requests.push({url,options});return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))});}};
vm.createContext(c);
vm.runInContext(people.slice(people.indexOf('  var REGION_PERSON_SCALE='),people.indexOf('  // All octopus skin pieces'))+
 people.slice(people.indexOf('  function regionReactionVisible('),people.indexOf('  function regionJisuDelivery('))+fixtureCode,c);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function actor(x=0,motion=false){
 const root=new THREE.Group(),old=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());old.position.y=1;
 if(motion){const delivery=new THREE.Group();delivery.add(old);root.add(delivery);root.userData.deliveryMotion=delivery;}else root.add(old);
 root.position.x=x;c.regionPeopleCacheBounds(root);return {root,old};
}
function model(mask=false){
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 if(mask){material.map=new THREE.Texture();material.userData.residentSkinMask='baseColorAlpha';}
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.8,1.6,.6),material);mesh.position.y=.8;root.add(mesh);
 return {scene:root,animations:[new THREE.AnimationClip('Idle',1,[]),new THREE.AnimationClip('React',.5,[])]};
}
function view(towns,marker){
 const v={region:{id:marker?'beach':'town'},regionGround:'#b8aa94',regionPeople:{towns:towns||[],marker:marker&&marker.root,markerSpace:{x:0,z:0}},
  wrap:{isConnected:true},spaces:[],guide:{position:new THREE.Vector3(100,0,100)},cam:new THREE.PerspectiveCamera(42,1,.1,100),fx:[]};
 c.R3.view=v;c.regionResidentLoad(v);return v;
}
function town(id,a){return {meta:{id},object:a.root,space:{x:a.root.position.x,z:0}};}
function begin(v,a,phase='intro'){
 return v.encounter={actor:a.root,phase,savedActorTransform:{position:a.root.position.clone(),rotation:a.root.rotation.clone(),scale:a.root.scale.clone()},actorBounds:a.root.userData.regionBounds};
}
function finishModel(asset=model()){assert(parses.length,'pending parser');parses.shift()(asset);return asset;}
(async()=>{
 // Only reviewed assets opt in. Draft candidates stay dormant; a different
 // deployment can select a reviewed ID without enabling all candidates.
 assert.deepEqual(Array.from(c.REGION_RESIDENT_VALIDATED_IDS),['cafe-seahorse']);
 const cafeEntry=c.REGION_RESIDENT_MODELS.town.find(entry=>entry.id==='cafe-seahorse');
 assert(cafeEntry && cafeEntry.target==='cafe','validated cafe routes to the existing resident');
 let cafeView=view([town('cafe',actor(3))]);
 assert.equal(cafeView.regionPeople.residents.length,1);assert.equal(cafeView.regionPeople.resident.entry.id,'cafe-seahorse');
 c.regionResidentDispose(cafeView);
 c.window.REEF_RESIDENT_INLINE_ONLY=true;
 cafeView=view([town('cafe',actor(3))]);assert.equal(cafeView.regionPeople.residents.length,0,'portable skips unavailable authored residents');c.regionResidentDispose(cafeView);
 c.document.getElementById=id=>id==='reef-resident-inline-cafe-seahorse'?{textContent:'AQID'}:null;
 cafeView=view([town('cafe',actor(3))]);assert.equal(cafeView.regionPeople.residents.length,1,'a deliberately embedded cafe is supported');c.regionResidentDispose(cafeView);
 delete c.window.REEF_RESIDENT_INLINE_ONLY;delete c.document.getElementById;
 const configured={};vm.createContext(configured);
 vm.runInContext(residentCode.replace(/var REGION_RESIDENT_VALIDATED_IDS = \[[^\]]*\];/,"var REGION_RESIDENT_VALIDATED_IDS = ['jisu'];"),configured);
 assert.equal(configured.REGION_RESIDENT_MODELS.beach[0].id,'jisu');
 assert.equal(configured.REGION_RESIDENT_MODELS.beach[0].closeUrl.split('?')[0],'assets/models/jisu-close.glb');
 assert.equal(configured.REGION_RESIDENT_MODELS.town.length,1,'one reviewed ID does not enable another candidate');
 // Merely describing candidates never opts a production route into their URLs.
 const dormant=view([town('taxi',actor()),town('shop',actor(2))]);
 assert.equal(dormant.regionPeople.residents.length,1);assert.equal(c.REGION_RESIDENT_MODELS.beach,undefined);
 c.regionResidentTick(dormant,0);assert.equal(requests.length,0);c.regionResidentDispose(dormant);
 assert(c.regionResidentEnable('shop-octopus'));assert(!c.regionResidentEnable('shop-octopus'),'activation idempotent');
 assert(c.regionResidentEnable('jisu'));

 // Two nearby residents serialize through one global fetch/parse slot. Opening
 // the second resident gives its close request priority over its board request.
 const taxi=actor(),shop=actor(2),shopTown=town('shop',shop);
 shopTown.skin={meshes:[],mode:'natural'};
 let v=view([town('taxi',taxi),shopTown]);const [taxiState,shopState]=v.regionPeople.residents;
 assert.strictEqual(v.regionPeople.resident,taxiState,'legacy diagnostic alias');
 c.regionResidentLoad(v);assert.equal(v.regionPeople.residents.length,2,'load is idempotent');
 v.guide.position.set(0,0,0);let count=requests.length;c.regionResidentTick(v,10);c.regionResidentTick(v,11);
 assert.equal(requests.length,count+1);assert.equal(requests.at(-1).url,'assets/models/taxi-squid.glb');
 await flush();c.regionResidentTick(v,12);assert.equal(requests.length,count+1,'parsing retains global slot');
 finishModel();assert(taxiState.root);
 const encounter=begin(v,shop);c.regionResidentTick(v,20);assert.equal(requests.at(-1).url.split('?')[0],'assets/models/shop-octopus-close.glb');
 assert(!shopState.requested,'close is prioritized ahead of second board');await flush();finishModel(model(true));
 assert(shopState.close.root);assert(!taxiState.close,'encounter routes to matching resident');
 assert.equal(shopTown.skin.meshes.length,1,'close owns one reaction adapter');
 c.regionResidentTick(v,21);assert.equal(requests.at(-1).url.split('?')[0],'assets/models/shop-octopus.glb');await flush();
 const board=model(true);finishModel(board);assert(shopState.pending && !shopState.root,'late board waits under close asset');
 c.regionResidentCloseEnd(v,encounter);assert(!shopState.close && shopTown.skin.meshes.length===0);
 v.encounter=null;c.regionResidentTick(v,30);assert(shopState.root && !shopState.pending,'board attaches after close ends');
 assert.equal(shopTown.skin.meshes.length,1);
 const shopGeometry=board.scene.children[0].geometry;let disposed=0;shopGeometry.addEventListener('dispose',()=>disposed++);
 c.regionResidentDispose(v);assert.equal(disposed,1);assert.equal(shopTown.skin.meshes.length,0);assert.equal(v.regionPeople.residents.length,0);

 // The same adapter participates in the real procedural reaction interpolation.
 // Costume/sucker pixels are protected by the UV mask, independent of mesh names.
 const skinActor=actor(),skinTown=town('shop',skinActor);
 const procedural={attribute:{array:new Float32Array([.2,.3,.4])},palette:{natural:[.2,.3,.4],camouflage:[.4,.5,.6],display:[.6,.2,.1]}};
 skinTown.skin={meshes:[procedural],mode:'natural'};
 v=view([skinTown]);const state=v.regionPeople.residents[0];state.pending=model(true);assert(c.regionResidentAttach(v,state));
 const material=state.root.children[0].children[0].material;
 const shader={uniforms:{},fragmentShader:'#include <map_fragment>\n#include <encodings_fragment>'};material.onBeforeCompile(shader);
 const weights=shader.uniforms.residentPigment.value;
 assert.deepEqual(Array.from(weights),[0,0]);assert(shader.fragmentShader.includes('residentMask=clamp(texelColor.a'));
 assert(shader.fragmentShader.includes('dot(texelColor.rgb'),'painted shading/mottling retained');
 assert(shader.fragmentShader.includes('diffuseColor.a=opacity'),'mask cannot make costume transparent');
 assert.equal(material.transparent,false);assert.equal(material.alphaTest,0);
 begin(v,skinActor);c.regionOctopusSet(v,skinTown.skin,'camouflage');const reaction=v.regionPeople.reaction;
 reaction.step(.5);assert.deepEqual(Array.from(weights),[.5,0]);reaction.end(true);assert.deepEqual(Array.from(weights),[1,0]);
 calm=true;c.regionOctopusSet(v,skinTown.skin,'display');assert.deepEqual(Array.from(weights),[0,1]);calm=false;
 c.regionResidentDispose(v);assert.equal(skinTown.skin.meshes.length,1,'only authored adapter removed');

 // A missing mask never silently replaces the octopus with a non-reactive mesh.
 const missing=actor(),missingTown=town('shop',missing);missingTown.skin={meshes:[procedural],mode:'natural'};
 v=view([missingTown]);const missingState=v.regionPeople.residents[0],bad=model();let badDisposed=0;
 bad.scene.children[0].geometry.addEventListener('dispose',()=>badDisposed++);missingState.pending=bad;
 assert.equal(c.regionResidentAttach(v,missingState),false);assert(!missingState.root && !missingState.pending);
 assert(missing.old.visible);assert.equal(badDisposed,1);assert.equal(missingTown.skin.meshes.length,1);c.regionResidentDispose(v);

 // Jisu's original outer delivery group survives both board/close swaps. Ending
 // the encounter disposes close geometry and restores the authored board group.
 const jisu=actor(0,true),motion=jisu.root.userData.deliveryMotion;motion.position.x=.2;motion.rotation.z=.15;
 v=view([],jisu);const jisuState=v.regionPeople.resident;assert.equal(jisuState.entry.id,'jisu');
 jisuState.pending=model();assert(c.regionResidentAttach(v,jisuState));assert.strictEqual(jisuState.root.parent,motion);
 assert.strictEqual(jisu.root.userData.deliveryMotion,motion);assert.equal(motion.position.x,.2);assert.equal(motion.rotation.z,.15);
 const deliveryEncounter=begin(v,jisu);c.regionResidentCloseRequest(v,jisuState);await flush();finishModel();
 assert.strictEqual(jisuState.close.root.parent,motion);assert.equal(motion.position.x,.2);assert.equal(motion.rotation.z,.15);
 c.regionResidentCloseEnd(v,deliveryEncounter);assert(jisuState.root.visible);assert.equal(motion.rotation.z,.15);c.regionResidentDispose(v);

 // Both residents cancel their owned pending/root resources on navigation. A
 // stale callback cannot clear a newer view's global transaction or attach.
 const oldTaxi=actor(),oldShop=actor(2);v=view([town('taxi',oldTaxi),town('shop',oldShop)]);v.guide.position.set(0,0,0);
 c.regionResidentTick(v,50);await flush();const late=parses.shift();c.regionResidentDispose(v);
 const fresh=view([town('taxi',actor())]);fresh.guide.position.set(0,0,0);c.regionResidentTick(fresh,60);await flush();
 const stale=model();let staleDisposed=0;stale.scene.children[0].geometry.addEventListener('dispose',()=>staleDisposed++);late(stale);
 assert.equal(staleDisposed,1);assert.equal(c.regionResidentInFlight,true,'stale callback leaves newer request lock intact');finishModel();
 c.regionResidentDispose(fresh);
 console.log('Passed: dormant activation, multiple residents, serialized loading/encounter priority, late board/close, mask reaction/interpolation/fallback, Jisu transform and owned cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
