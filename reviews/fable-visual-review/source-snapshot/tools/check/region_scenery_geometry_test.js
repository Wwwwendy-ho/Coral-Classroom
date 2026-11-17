// Production route + scenery construction in Three CPU. No browser/WebGL needed.
// Run: node tools/check/region_scenery_geometry_test.js
const assert=require('assert'),fs=require('fs'),vm=require('vm'),THREE=require('../../three.min.js');
const board=fs.readFileSync('src/js/reef3d/board.js','utf8');
function section(from,to){const a=board.indexOf(from);assert(a>=0);const b=board.indexOf(to,a);assert(b>a);return board.slice(a,b)}
let canvasCount=0;
const drawing=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=()=>{})});
const c={window:{THREE},document:{createElement:()=>{canvasCount++;return {getContext:()=>drawing}}},Math,Set,Float32Array,innerWidth:390,reefNight:()=>false};
vm.createContext(c);
vm.runInContext(fs.readFileSync('src/js/reef3d/world-routes.js','utf8'),c);
vm.runInContext(section('  function reef3dSpaces(','  function reef3dRoute(')+section('  function reef3dKit(','  function reef3dTileGeo('),c);
c.window.reef3dSurface=(o,kind,opts)=>{o.userData.reefSurface={kind,...opts};return o};
vm.runInContext(fs.readFileSync('src/js/reef3d/region-scenery.js','utf8'),c);
const ids=['town','lagoon','caves','patterns','beach','light','captain'];
// Measured before this change with the same production kit and route generator.
const baseline={23:[6152,13508,3275,17621,8942,2695,4549],24:[6158,13596,3280,17626,9064,2700,4554],33:[8662,18848,4530,26407,13384,3545,6723]};
for(const width of [390,1024]) for(const stops of [3,8,17]) for(const [index,id] of ids.entries()){
 c.innerWidth=width;
 const spaces=c.reef3dSpaces([{items:Array.from({length:stops},(_,i)=>({d:{id:i}}))}],{id});
 const graph=JSON.stringify(spaces),kit=c.reef3dKit(THREE,false),beforeCanvas=canvasCount;
 let triangles=0,root,source=new Set(),disposed=new Map(),kinds=new Set();
 c.reef3dMerge=input=>{
  root=input;input.updateMatrixWorld(true);
  input.traverse(o=>{
   if(!o.isMesh)return;
   const g=o.geometry,p=g.attributes.position;
   assert(p && p.count>0);assert(Array.from(p.array).every(Number.isFinite),`${id}: finite geometry`);
   assert(!o.material.map,`${id}: uses shared atlas metadata, no private map`);
   assert(!o.material.transparent,`${id}: opaque scenery`);
   triangles+=(g.index?g.index.count:p.count)/3;
   if(!source.has(g)){source.add(g);disposed.set(g,0);g.addEventListener('dispose',()=>disposed.set(g,disposed.get(g)+1))}
   if(o.userData.reefSurface)kinds.add(o.userData.reefSurface.kind);
  });
  assert(!input.children[0].userData.reefSurface,`${id}: water excluded from atlas`);
  return new THREE.Group();
 };
 const view={spaces,kit,scene:new THREE.Scene()};c.window.regionBoardDecorate(view,{id});
 assert.equal(JSON.stringify(spaces),graph,`${id}: positions, tile indices and links unchanged`);
 assert.equal(canvasCount,beforeCanvas,`${id}: no per-region texture allocation`);
 assert(triangles<=baseline[spaces.mainN][index]*1.15,`${id}: triangle budget ${triangles}`);
 assert(kinds.size>0,`${id}: atlas surfaces`);
 assert.equal(view.regionScenery.name,'region-'+id);
 for(const g of source)assert.equal(disposed.get(g),1,`${id}: owned source geometry disposed once`);
 if(id==='town')for(const kind of ['plaster','roof','fabric','timber'])assert(kinds.has(kind));
 if(id==='captain')for(const kind of ['timber','rope','fabric'])assert(kinds.has(kind));
 if(width===390)console.log(`${id} / ${spaces.mainN}: ${triangles} triangles (${Math.round((triangles/baseline[spaces.mainN][index]-1)*100)}%)`);
 // Without BufferGeometryUtils the real merge keeps the source root alive.
 let fallbackDisposals=0,fallbackRoot;
 c.reef3dMerge=input=>{fallbackRoot=input;input.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>fallbackDisposals++)});const out=new THREE.Group();out.add(input);return out};
 c.window.regionBoardDecorate({spaces,kit,scene:new THREE.Scene()},{id});
 assert(root.parent===null); // The preceding baked root stays detached.
 assert(fallbackRoot.parent);assert.equal(fallbackDisposals,0,`${id}: fallback keeps live source geometry`);
}
console.log('Passed all seven regions: route invariants, phone/desktop budgets, finite opaque geometry, shared-atlas tags and owned-source disposal.');
