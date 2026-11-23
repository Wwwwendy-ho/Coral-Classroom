/* Actual Three r128 scenery bake/merge and atlas ownership, without a renderer.
   Run from the repository root: node tools/check/world_surfaces_test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const THREE = require('../../three.min.js'), root = path.resolve(__dirname,'../..');
const board = fs.readFileSync(root+'/src/js/reef3d/board.js','utf8');
const surfaceSource = fs.readFileSync(root+'/src/js/reef3d/world-surfaces.js','utf8');
// Pillow decodes the shipped photograph and downsamples it to the actual GPU
// budget. Test every panel's pixel distribution, not guessed neutral swatches.
const art = JSON.parse(require('child_process').execFileSync('python3',['-c',`
import base64, json, sys
from PIL import Image
image = Image.open(sys.argv[1]).convert('RGBA').resize((512,512), Image.Resampling.BILINEAR)
panels = []
for kind in range(8):
    x, y = kind % 4 * 128, kind // 4 * 256
    panel = image.crop((x+4,y+4,x+124,y+252))
    pixels = panel.tobytes()
    hist = [0] * 766
    for i in range(0,len(pixels),4): hist[sum(pixels[i:i+3])] += 1
    panels.append({'hist':hist,'mean':sum(i*n for i,n in enumerate(hist))/(panel.width*panel.height*765)})
print(json.dumps({'rgba':base64.b64encode(image.tobytes()).decode(),'panels':panels}))
`,root+'/assets/world/world-surfaces.jpg'],{encoding:'utf8',maxBuffer:4*1024*1024}));
const artPixels = new Uint8ClampedArray(Buffer.from(art.rgba,'base64'));
const images = [], canvases = [];
let pixelReads=0;
function canvas(){
  const c = {width:0,height:0};
  c.getContext = () => ({
    createImageData(w,h){ return {data:new Uint8ClampedArray(w*h*4)}; },
    putImageData(image){ c.pixels=image.data; },
    drawImage(image){ c.drawn=image; c.pixels=artPixels; },
    getImageData(){ pixelReads++; if(c.drawn.unreadable)throw new Error('tainted canvas');return {data:c.pixels}; }
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
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
  merged.children[0].material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('vReefSurface = reefSurface;'));
  assert(shader.fragmentShader.includes('fract(vUv)')&&shader.fragmentShader.includes('8.5 / 1024.0'),'repeat is confined to the panel’s inset gutter');
  assert.equal((shader.fragmentShader.match(/texture2D\(map,/g)||[]).length,1,'one atlas lookup');
  assert(!shader.fragmentShader.includes('#include <map_fragment>'),'production map chunk has been replaced');
  assert(shader.fragmentShader.includes('dot(texture2D(map, reefUV).rgb, vec3(1.0 / 3.0))'),'neutral detail cannot tint the baked pastel pigment');
  assert(shader.fragmentShader.indexOf('float reefPeak')>shader.fragmentShader.indexOf('#include <color_fragment>'),'highlight headroom is evaluated after baked vertex colors');
  assert.strictEqual(shader.uniforms.reefMeansLow,state.meansLow);assert.strictEqual(shader.uniforms.reefMeansHigh,state.meansHigh);
  assert.equal(pixelReads,0,'fallback normalization reuses generated pixels without a canvas readback');
  const strengthExpression=shader.fragmentShader.match(/float reefStrength = ([^;]+);/)[1];
  const modulationExpression=shader.fragmentShader.match(/diffuseColor\.rgb \*= ([^;]+);/)[1];
  assert(strengthExpression.startsWith('min(0.35,'),'broad material strength stays at .35');
  // Execute the production shader's scalar arithmetic on every actual pixel
  // value. Its headroom fade must stay symmetric around 1, even near white.
  const modulation=new Function('reefPeak','reefMean','reefDetail',`const {min,max}=Math;const reefStrength=${strengthExpression};return ${modulationExpression};`);
  function checkPanel(hist,mean,label){
    const count=hist.reduce((a,b)=>a+b,0);
    for(const pigment of [[.71,.85,.78],[.91,.75,.84],[.5,.59,.54],[.98,.94,.88],[1,1,1],[0,0,0]]){
      const peak=Math.max(...pigment);let average=0,min=1,max=1;
      for(let sum=0;sum<hist.length;sum++)if(hist[sum]){
        const mult=modulation(peak,mean,sum/765);average+=mult*hist[sum]/count;min=Math.min(min,mult);max=Math.max(max,mult);
        for(const color of pigment)assert(color*mult>=0&&color*mult<=1+1e-12,`${label}: no white clipping or negative pigment`);
        if(peak>0)for(const color of pigment)close(color*mult/(peak*mult),color/peak);
      }
      close(average,1); // Existing pigment and directional/form shade survive.
      if(peak>0&&peak<.95)assert(max-min>.015,`${label}: structure remains visible`);
    }
  }
  for(let kind=0;kind<8;kind++){
    checkPanel(art.panels[kind].hist,art.panels[kind].mean,'shipped panel '+kind);
    const hist=Array(766).fill(0),x0=kind%4*32,y0=Math.floor(kind/4)*64;
    for(let y=y0+1;y<y0+63;y++)for(let x=x0+1;x<x0+31;x++){const i=(y*128+x)*4;hist[originalPixels[i]+originalPixels[i+1]+originalPixels[i+2]]++;}
    const uniforms=kind<4?state.meansLow.value:state.meansHigh.value;
    checkPanel(hist,uniforms.getComponent(kind%4),'fallback panel '+kind);
  }
  // A second view owns its GPU state but shares the pending decoded image.
  c.R3.q=0;const otherCache={},other=c.reef3dMerge(scene(true),rig,otherCache), otherState=otherCache.__reefSurface;
  assert.equal(images.length,1);assert.notStrictEqual(otherState.map,map);assert.equal(otherState.size,512);assert.equal(otherState.map.image.width,128);
  const otherShader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
  other.children[0].material.onBeforeCompile(otherShader);
  const meanUniform=otherShader.uniforms.reefMeansLow,meanVector=meanUniform.value;
  let mapDisposed=0,materialDisposed=0;
  map.addEventListener('dispose',()=>mapDisposed++);
  Object.values(state.materials).forEach(m=>m.addEventListener('dispose',()=>materialDisposed++));
  const before=map.image;
  c.reef3dSurfaceDispose(cache);c.reef3dSurfaceDispose(cache);
  assert.equal(mapDisposed,1);assert.equal(materialDisposed,2);assert(!cache.__reefSurface);
  images[0].naturalWidth=images[0].naturalHeight=1024;images[0].onload();await Promise.resolve();await Promise.resolve();
  assert.strictEqual(map.image,before,'late image load cannot attach to a disposed view');
  assert.strictEqual(otherState.map.image.drawn,images[0],'a live view receives the same loaded source');
  assert.equal(otherState.map.image.width,512,'high quality shares the fixed 512 GPU budget');
  assert.equal(pixelReads,1,'disposed views never measure or upload a late atlas');
  assert.strictEqual(otherShader.uniforms.reefMeansLow,meanUniform);assert.strictEqual(meanUniform.value,meanVector,'loading updates existing compiled uniform references');
  for(let kind=0;kind<8;kind++)close((kind<4?otherState.meansLow:otherState.meansHigh).value.getComponent(kind%4),art.panels[kind].mean);
  assert.equal(512*512*4*4/3,1398101.3333333333,'one atlas with mips stays near 1.33 MiB on every tier');
  assert.equal(other.children.length,2);c.reef3dSurfaceDispose(otherCache);
  c.R3.q=2;const liveLowCache={};c.reef3dMerge(scene(true),rig,liveLowCache);await Promise.resolve();
  assert.equal(liveLowCache.__reefSurface.map.image.width,512,'a later low-quality view uploads the cached source at 512 square');
  assert.strictEqual(liveLowCache.__reefSurface.map.image,otherState.map.image,'views share prepared CPU atlas pixels');
  assert.equal(pixelReads,1,'returning views never repeat atlas sampling/normalization');
  assert.equal(images.length,1,'returning to a board reuses the decoded source without another request');
  c.reef3dSurfaceDispose(liveLowCache);
  c.reef3dSurfaceImage=null;c.reef3dSurfaceLoading=null;c.REEF_WORLD_SURFACE_URL='data:image/jpeg;base64,portable-atlas-fixture';
  const compactCache={};c.reef3dMerge(scene(true),rig,compactCache);
  const compact=images[images.length-1];assert.equal(compact.src,c.REEF_WORLD_SURFACE_URL,'portable override is loaded on demand');
  compact.naturalWidth=compact.naturalHeight=512;compact.onload();await Promise.resolve();
  assert.strictEqual(compactCache.__reefSurface.map.image.drawn,compact,'512-square portable atlas preserves the normalized panel contract');
  c.reef3dSurfaceDispose(compactCache);
  // Canvas security/load failures keep a measured, offline-ready fallback.
  c.REEF_WORLD_SURFACE_IMAGE={unreadable:true};
  const offlineCache={};c.reef3dMerge(scene(true),rig,offlineCache);const offlineState=offlineCache.__reefSurface,offlineMap=offlineState.map.image;
  await Promise.resolve();
  assert.strictEqual(offlineState.map.image,offlineMap,'an unreadable image cannot replace the normalized fallback');
  assert.equal(offlineMap.width,128);
  c.reef3dSurfaceDispose(offlineCache);delete c.REEF_WORLD_SURFACE_IMAGE;
  console.log(`World surfaces: passed actual Three merge, pigments, UVs, isolation, async disposal; ${taggedTriangles} triangles, ${extra} extra static bytes, 2 bins/chunk, one 512² map + mips (~1.33 MiB). No device FPS claim.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
