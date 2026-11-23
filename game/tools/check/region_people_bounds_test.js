// Run with: node tools/check/region_people_bounds_test.js
const assert=require('assert'), fs=require('fs'), vm=require('vm'), THREE=require('../../three.min.js');
const people=fs.readFileSync('src/js/reef3d/region-people.js','utf8');
const encounter=fs.readFileSync('src/js/reef3d/encounter-stage.js','utf8');
const from=people.indexOf('  var REGION_PERSON_SCALE='), to=people.indexOf('  // All octopus skin pieces',from);
const cf=encounter.indexOf('  function regionEncounterCamera('), ct=encounter.indexOf('  function regionEncounterTick(',cf);
const c={window:{THREE},Math,regionEncounterActive:()=>true}; vm.createContext(c);
vm.runInContext(people.slice(from,to)+encounter.slice(cf,ct),c);
function actor(width,height,depth,scale){
 const root=new THREE.Group(), mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),new THREE.MeshBasicMaterial());
 mesh.position.y=height/2; root.add(mesh); root.scale.setScalar(scale);
 return root;
}
const jisu=actor(1.6,1.4,1.1,c.REGION_PERSON_SCALE['hermit crab']);
const octopus=actor(1.5,1.9,1.3,c.REGION_PERSON_SCALE.octopus);
const ray=actor(3.2,1.2,1.5,c.REGION_PERSON_SCALE.ray);
const jb=c.regionPeopleCacheBounds(jisu), ob=c.regionPeopleCacheBounds(octopus), rb=c.regionPeopleCacheBounds(ray);
assert(jb.height<ob.height*.3); assert(rb.width>ob.width*2); assert.equal(jisu.userData.regionBounds,jb);
assert(Math.abs(jb.top-jb.height)<1e-6);
const spaces=[{x:4,z:0},{x:3,z:2.6},{x:3,z:-2.6},{x:-2,z:0}];
const place=c.regionPeoplePlacement({spaces},spaces[0],rb,true);
const simple=[{x:4,z:0}]; assert.equal(c.regionPeoplePlacement({spaces:simple},simple[0],rb,true).side,-1);
for(const tile of spaces) assert(Math.hypot(tile.x-place.x,tile.z-place.z)>=rb.radius+1.25-1e-9);
function framing(a,b,aspect){
 const view={encounter:{actor:a,actorBounds:b},cam:{fov:42,aspect}};
 const out=new THREE.Vector3(),look=new THREE.Vector3(); assert(c.regionEncounterCamera(view,out,look));
 return {distance:out.z-look.z,look};
}
const small=framing(jisu,jb,1), wide=framing(ray,rb,.5), wideLandscape=framing(ray,rb,1.5);
assert(small.distance<3.4); assert(wide.distance>wideLandscape.distance);
const tan=Math.tan(42*Math.PI/360), near=wide.distance-rb.depth*.55;
assert(near*tan*.5*2*.72 >= rb.width*Math.cos(.1)+rb.depth*Math.sin(.1)-1e-8);
console.log('Passed: cached scaled bounds, size hierarchy, tile clearance, basin preference, close framing and portrait wing fit.');
