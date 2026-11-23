/* Actual Three r128 scenery bake/merge and atlas ownership, without a renderer.
   Run from the repository root: node tools/check/world_surfaces_test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const THREE = require('../../three.min.js'), root = path.resolve(__dirname,'../..');
const board = fs.readFileSync(root+'/src/js/reef3d/board.js','utf8');
const surfaceSource = fs.readFileSync(root+'/src/js/reef3d/world-surfaces.js','utf8');
const images = [], canvases = [];
function canvas(){
  const c = {width:0,height:0};
  c.getContext = () => ({
    createImageData(w,h){ return {data:new Uint8ClampedArray(w*h*4)}; },
    putImageData(image){ c.pixels=image.data; },
    drawImage(image){ c.drawn=image; }
  });
  canvases.push(c); return c;
}
class ImageStub { constructor(){ images.push(this); } }
const c = {THREE,console,Math,Float32Array,Promise,Image:ImageStub,R3:{q:2},document:{createElement:canvas}};
c.window = c; vm.createContext(c);
vm.runInContext(fs.readFileSync(root+'/src/js/vendor/three-gltfloader.js','utf8'),c);
c.reefInstallGLTF(); // Use the actual production merge utility, not a test substitute.
vm.runInContext(surfaceSource,c);
vm.runInContext(board.slice(board.indexOf('  function reef3dBand('),board.indexOf('  // Swap a moving object')),c);
const rig = {dir:new THREE.Vector3(.2,.9,.3).normalize(),ground:new THREE.Color('#7c9aa0'),sky:new THREE.Color('#dfeae0'),sun:new THREE.Color('#556b6e')};
const kinds = ['stone','plaster','timber','coral','sand','fabric','roof','rope'];
function scene(tagged){
  const group = new THREE.Group(), geometry = new THREE.BoxGeometry(1,1,1);
  for(let i=0;i<128;i++){
    const m = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:i%2?'#d5b5c9':'#b5d8c7',side:i%3?THREE.FrontSide:THREE.DoubleSide}));
    m.position.set(i%8,.7,Math.floor(i/8)%8);
    if(tagged) c.reef3dSurface(m,kinds[i%8],{scale:2});
    group.add(m);
  }
  return group;
}
function triangles(group){ let n=0; group.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return n; }
function colorTriples(group){ const out=[];group.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.color;for(let i=0;i<a.count;i++)out.push([a.getX(i),a.getY(i),a.getZ(i)].join(','));}});return out.sort(); }
function close(a,b){ assert(Math.abs(a-b)<1e-6,`${a} vs ${b}`); }
async function main(){
  assert.equal(images.length,0,'including the module does not fetch an atlas');
  const group=scene(true), originalGeo=group.children[0].geometry, originalMat=group.children[0].material;
  const positions=originalGeo.attributes.position.array.slice(), normals=originalGeo.attributes.normal.array.slice(), originalUV=originalGeo.attributes.uv.array.slice();
  const cache={}, baseline=c.reef3dMerge(scene(false),rig,{}), merged=c.reef3dMerge(group,rig,cache);
  assert.equal(images.length,1,'first eligible static surface requests the image once');
  assert.equal(images[0].src,'assets/world/world-surfaces.jpg');
  assert.equal(merged.children.length,2,'all eight surfaces merge into at most front/double-sided bins per chunk');
  assert.equal(new Set(merged.children.map(m=>m.material.map)).size,1,'all kinds/sides share one map');
  assert.equal(triangles(merged),triangles(group),'surface texture adds no geometry');
  assert.deepStrictEqual(colorTriples(merged),colorTriples(baseline),'all baked pigment/lighting survives unchanged');
  assert.strictEqual(group.children[0].geometry,originalGeo); assert.strictEqual(group.children[0].material,originalMat);
  assert.deepStrictEqual(originalGeo.attributes.position.array,positions); assert.deepStrictEqual(originalGeo.attributes.normal.array,normals); assert.deepStrictEqual(originalGeo.attributes.uv.array,originalUV);
  assert(!originalGeo.attributes.reefSurface,'tagging never writes the caller’s shared geometry');
  let extra=0, taggedTriangles=0; const seen=new Set();
  merged.traverse(o=>{
    if(!o.isMesh)return;
    const g=o.geometry;
    assert.deepStrictEqual(Object.keys(g.attributes).sort(),['color','position','reefSurface','uv'],'normals and unused attributes do not survive baking');
    extra+=g.attributes.uv.array.byteLength+g.attributes.reefSurface.array.byteLength;
    taggedTriangles+=g.attributes.position.count/3;
    for(const id of g.attributes.reefSurface.array){ assert(Number.isInteger(id)&&id>=0&&id<8);seen.add(id); }
    assert(Array.from(g.attributes.uv.array).every(Number.isFinite));
    assert(o.material.isMeshBasicMaterial&&o.material.vertexColors&&!o.material.transparent,'baked opaque, unlit material');
  });
  assert.equal(seen.size,8); assert.equal(extra,taggedTriangles*36,'UV + panel index stay at 36 bytes per triangle');
  const state=cache.__reefSurface,map=state.map;
  assert.equal(state.size,512); assert.equal(map.image.width,128,'immediate placeholder is tiny, not a full-resolution startup build'); assert(map.generateMipmaps);
  assert.equal(map.minFilter,THREE.LinearMipmapLinearFilter); assert.equal(map.magFilter,THREE.LinearFilter); assert.equal(map.anisotropy,1); assert.equal(map.encoding,THREE.LinearEncoding);
  for(let kind=0;kind<8;kind++){
    let min=255,max=0; const cv=map.image,x0=kind%4*32,y0=Math.floor(kind/4)*64;
    for(let y=y0+2;y<y0+62;y++)for(let x=x0+2;x<x0+30;x++){const p=cv.pixels[(y*128+x)*4];min=Math.min(min,p);max=Math.max(max,p);}
    assert(max-min>12,'each fallback panel contains actual grain/structure');
    assert(min>=193&&max<=253,'neutral fallback preserves the bright pastel palette');
  }
  const originalPixels=map.image.pixels;
  c.reef3dSurfaceSources={};
  assert.deepStrictEqual(c.reef3dSurfaceSource(128).pixels,originalPixels,'offline fallback pixels are deterministic across fresh builds');
  // World units survive translation/nonuniform scale, across separate meshes.
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(4,8),new THREE.MeshLambertMaterial());
  c.reef3dSurface(wall,'plaster',{scale:2}); wall.position.set(6,5,3);wall.updateMatrixWorld(true);
  let wg=wall.geometry.toNonIndexed();wg.applyMatrix4(wall.matrixWorld);
  assert(c.reef3dSurfaceGeometry(wg,wall,wall.material));
  for(let i=0;i<wg.attributes.position.count;i++){close(wg.attributes.uv.getX(i),wg.attributes.position.getX(i)/2);close(wg.attributes.uv.getY(i),wg.attributes.position.getY(i)/4);}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(4,8),wall.material); floor.rotation.x=-Math.PI/2;c.reef3dSurface(floor,'sand',{scale:3});floor.updateMatrixWorld(true);
  const fg=floor.geometry.toNonIndexed();fg.applyMatrix4(floor.matrixWorld);c.reef3dSurfaceGeometry(fg,floor,floor.material);
  for(let i=0;i<fg.attributes.position.count;i++){close(fg.attributes.uv.getX(i),fg.attributes.position.getX(i)/3);close(fg.attributes.uv.getY(i),fg.attributes.position.getZ(i)/6);}
  // Untagged character/reward meshes and existing maps never enter the atlas.
  const untagged=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),wall.material), cloned=untagged.geometry.toNonIndexed();
  assert(!c.reef3dSurfaceGeometry(cloned,untagged,untagged.material));
  c.reef3dSurface(untagged,'unknown');assert(!untagged.userData.reefSurface);
  c.reef3dSurface(untagged,'coral');
  for(const src of [new THREE.MeshBasicMaterial({map:new THREE.Texture()}),new THREE.MeshBasicMaterial({transparent:true}),new THREE.MeshBasicMaterial({side:THREE.BackSide})])assert(!c.reef3dSurfaceGeometry(cloned,untagged,src));
  untagged.isSkinnedMesh=true;assert(!c.reef3dSurfaceGeometry(cloned,untagged,untagged.material));
  const shader={vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
  merged.children[0].material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('vReefSurface = reefSurface;'));
  assert(shader.fragmentShader.includes('fract(vUv)')&&shader.fragmentShader.includes('8.5 / 1024.0'),'repeat is confined to the panel’s inset gutter');
  assert.equal((shader.fragmentShader.match(/texture2D\(map,/g)||[]).length,1,'one atlas lookup');
  assert(!shader.fragmentShader.includes('#include <map_fragment>'),'production map chunk has been replaced');
  const modulation=shader.fragmentShader.match(/diffuseColor\.rgb \*= mix\(vec3\(1\.0\), reefDetail\.rgb, ([\d.]+)\)/);
  assert(modulation,'atlas detail must modulate the existing baked pigment');
  const strength=Number(modulation[1]);
  for(const gray of [.809,.821,.830,.851,.854,.856,.862,.883]){
    const multiplier=1+(gray-1)*strength;
    assert(multiplier>=.89&&multiplier<=.94,'actual art panel averages retain roughly 90–94% of baked pigment');
    assert(multiplier<=1,'surface detail never whitens the pastel pigment');
  }
  // A second view owns its GPU state but shares the pending decoded image.
  c.R3.q=0;const otherCache={},other=c.reef3dMerge(scene(true),rig,otherCache), otherState=otherCache.__reefSurface;
  assert.equal(images.length,1);assert.notStrictEqual(otherState.map,map);assert.equal(otherState.size,1024);assert.equal(otherState.map.image.width,128);
  let mapDisposed=0,materialDisposed=0;
  map.addEventListener('dispose',()=>mapDisposed++);
  Object.values(state.materials).forEach(m=>m.addEventListener('dispose',()=>materialDisposed++));
  const before=map.image;
  c.reef3dSurfaceDispose(cache);c.reef3dSurfaceDispose(cache);
  assert.equal(mapDisposed,1);assert.equal(materialDisposed,2);assert(!cache.__reefSurface);
  images[0].naturalWidth=images[0].naturalHeight=1024;images[0].onload();await Promise.resolve();await Promise.resolve();
  assert.strictEqual(map.image,before,'late image load cannot attach to a disposed view');
  assert.strictEqual(otherState.map.image.drawn,images[0],'a live view receives the same loaded source');
  assert.equal(otherState.map.image.width,1024,'loaded image uses the fixed selected quality');
  assert.equal(other.children.length,2);c.reef3dSurfaceDispose(otherCache);
  c.R3.q=2;const liveLowCache={};c.reef3dMerge(scene(true),rig,liveLowCache);await Promise.resolve();
  assert.equal(liveLowCache.__reefSurface.map.image.width,512,'a later low-quality view uploads the cached source at 512 square');
  assert.equal(images.length,1,'returning to a board reuses the decoded source without another request');
  c.reef3dSurfaceDispose(liveLowCache);
  c.reef3dSurfaceImage=null;c.reef3dSurfaceLoading=null;c.REEF_WORLD_SURFACE_URL='data:image/jpeg;base64,portable-atlas-fixture';
  const compactCache={};c.reef3dMerge(scene(true),rig,compactCache);
  const compact=images[images.length-1];assert.equal(compact.src,c.REEF_WORLD_SURFACE_URL,'portable override is loaded on demand');
  compact.naturalWidth=compact.naturalHeight=512;compact.onload();await Promise.resolve();
  assert.strictEqual(compactCache.__reefSurface.map.image.drawn,compact,'512-square portable atlas preserves the normalized panel contract');
  c.reef3dSurfaceDispose(compactCache);
  console.log(`World surfaces: passed actual Three merge, pigments, UVs, isolation, async disposal; ${taggedTriangles} triangles, ${extra} extra static bytes, 2 bins/chunk, one 512² map + mips (~1.33 MiB). No device FPS claim.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
