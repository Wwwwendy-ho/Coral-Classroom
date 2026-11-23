// Node/Three integration harness. Run: node tools/check/region_people_actual_test.js
const assert=require('assert'),fs=require('fs'),vm=require('vm'),THREE=require('../../three.min.js');
const people=fs.readFileSync('src/js/reef3d/region-people.js','utf8');
const board=fs.readFileSync('src/js/reef3d/board.js','utf8');
const encounter=fs.readFileSync('src/js/reef3d/encounter-stage.js','utf8');
// Production merge utility is normally loaded with Three in the browser. This
// compatible position/color merge keeps the actual actor geometry for testing.
THREE.BufferGeometryUtils={mergeBufferGeometries(gs){
 const result=new THREE.BufferGeometry();
 Object.keys(gs[0].attributes).forEach(name=>{
  const attrs=gs.map(g=>g.attributes[name]); if(attrs.some(a=>!a)) throw Error('attribute mismatch');
  let n=0; attrs.forEach(a=>n+=a.array.length); const data=new Float32Array(n); let i=0;
  attrs.forEach(a=>{data.set(a.array,i);i+=a.array.length}); result.setAttribute(name,new THREE.BufferAttribute(data,attrs[0].itemSize));
 }); return result;
}};
function el(){return {children:[],style:{},isConnected:true,appendChild(o){this.children.push(o);o.parentNode=this},setAttribute(){},addEventListener(){},querySelector(){return null},contains(){return false},remove(){this.isConnected=false}}}
let panelCalls=0;
const c={window:{THREE,reef3dWorldRoute(){}},document:{createElement:el,activeElement:null,hidden:false},innerWidth:390,Math,Float32Array,Set,performance:{now:()=>0},
 reefNight:()=>false,reefCalm:()=>false,ccIcon:()=>'',esc:s=>s,regionEncounterActive:()=>true,regionEncounterBegin:()=>false,
 reef3dPanel:()=>{panelCalls++;return el()}};
vm.createContext(c);
vm.runInContext(fs.readFileSync('src/js/town-talks.js','utf8'),c);
vm.runInContext(fs.readFileSync('src/js/beach-data.js','utf8'),c);
function section(source,from,to){return source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)))}
vm.runInContext(section(board,'  function reef3dSpaces(','  function reef3dKit('),c);
vm.runInContext(section(board,'  function reef3dBand(','  // Swap a moving object'),c);
vm.runInContext(people,c);
vm.runInContext(section(encounter,'  function regionEncounterCamera(','  function regionEncounterTick('),c);
function makeView(id, ids){
 const region={id,name:id},zones=[{items:ids.map(x=>({d:{regionActivity:{id:x}}}))}];
 const spaces=c.reef3dSpaces(zones,region);
 const M=col=>new THREE.MeshLambertMaterial({color:col}), mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);return o};
 const view={region,spaces,kit:{M,mesh},scene:new THREE.Scene(),wrap:el(),hitables:[],fx:[],regionGround:'#b8aa94',
  rig:{dir:new THREE.Vector3(.2,.9,.3).normalize(),ground:new THREE.Color('#596777'),sky:new THREE.Color('#aabbd0'),sun:new THREE.Color('#445566')},bake:{}};
 c.regionPeopleBuild(view); assert(view.regionPeople); return view;
}
const town=makeView('town',c.TOWN_FOLK.map(x=>x.id)), beach=makeView('beach',c.BB_BOTTLES.map(x=>x.id).concat('letters'));
const oct=town.regionPeople.towns.find(t=>t.meta.id==='shop'),ray=town.regionPeople.towns.find(t=>t.meta.id==='subway'),jisu=beach.regionPeople.marker;
assert(oct && ray && jisu); const ob=oct.object.userData.regionBounds,rb=ray.object.userData.regionBounds,jb=jisu.userData.regionBounds;
assert(jb.height<ob.height*.3,`Jisu ${jb.height} vs octopus ${ob.height}`);
assert(rb.width>ob.width*2,`ray ${rb.width} vs octopus ${ob.width}`);
assert(oct.skin && oct.skin.meshes.length===1); assert(jisu.userData.deliveryMotion);
for(const [view,actor] of [[town,oct.object],[town,ray.object],[beach,jisu]]){
 const b=actor.userData.regionBounds;
 for(const tile of view.spaces) assert(Math.hypot(actor.position.x-tile.x,actor.position.z-tile.z)>=b.radius+1.25-1e-6,'tile footprint');
 const actual=new THREE.Box3().setFromObject(actor); assert(Math.abs(actual.max.y-actor.position.y-b.top)<1e-5,'label top bound');
}
function meshColors(root){let all=[];root.traverse(o=>{if(o.isMesh && o.geometry.attributes.color) all.push(o.geometry.attributes.color)});return all}
let skinAttr=oct.skin.meshes[0].attribute, other=meshColors(oct.object).filter(a=>a!==skinAttr), before=other.map(a=>Array.from(a.array));
c.reefCalm=()=>true; c.regionOctopusSet(town,oct.skin,'camouflage'); assert(before.every((x,i)=>x.every((v,j)=>v===other[i].array[j])),'camo changes skin only');
function projected(actor,b,aspect){
 actor.rotation.y=.1; actor.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(42,aspect,.1,100), v={encounter:{actor,actorBounds:b},cam:camera},out=new THREE.Vector3(),look=new THREE.Vector3();
 c.regionEncounterCamera(v,out,look);camera.position.copy(out);camera.lookAt(look);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
 let maxX=0,maxY=0;actor.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;const q=new THREE.Vector3();for(let i=0;i<p.count;i++){q.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);maxX=Math.max(maxX,Math.abs(q.x));maxY=Math.max(maxY,Math.abs(q.y));}});
 assert(maxX<1 && maxY<1,`framing ${maxX}, ${maxY}`);return out.distanceTo(look);
}
assert(projected(jisu,jb,.5)<3.4); projected(ray.object,rb,.5); projected(oct.object,ob,.5);
c.innerWidth=1024;
const desktopTown=makeView('town',c.TOWN_FOLK.map(x=>x.id)), desktopBeach=makeView('beach',c.BB_BOTTLES.map(x=>x.id).concat('letters'));
for(const [view,actor] of [[desktopTown,desktopTown.regionPeople.towns.find(t=>t.meta.id==='shop').object],[desktopTown,desktopTown.regionPeople.towns.find(t=>t.meta.id==='subway').object],[desktopBeach,desktopBeach.regionPeople.marker]]){
 const b=actor.userData.regionBounds; for(const tile of view.spaces) assert(Math.hypot(actor.position.x-tile.x,actor.position.z-tile.z)>=b.radius+1.25-1e-6,'desktop tile footprint');
}
const prior=town.regionPeople.focus; assert.equal(c.regionPeopleOpen(town,'town:shop'),false);assert.equal(panelCalls,0);assert.equal(town.regionPeople.focus,prior);
console.log('Actual built actors (game units): Jisu '+jb.height.toFixed(2)+' high; octopus '+ob.height.toFixed(2)+' high, '+ob.width.toFixed(2)+' wide; ray '+rb.width.toFixed(2)+' wide.');
console.log('Passed actual route/actor construction, skin isolation, tile clearance, cached label bounds, portrait framing and rejected encounter entry.');
