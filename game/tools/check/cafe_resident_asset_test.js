'use strict';
// Inspect the actual exported asset, then play its real rig using bundled Three.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const THREE=require('../../three.min.js'),root=path.resolve(__dirname,'../..');
const folder=process.argv[2]||path.join(root,'assets/models');
const c={THREE,console,setTimeout,clearTimeout,Promise,Blob,URL,TextDecoder,navigator:{userAgent:'node asset audit'}};
c.window=c;c.self=c;vm.createContext(c);
vm.runInContext(fs.readFileSync(root+'/src/js/vendor/three-gltfloader.js','utf8'),c);c.reefInstallGLTF();
// GPU image upload is unavailable in Node; actual image payload/dimensions are
// checked separately with Pillow and the actual painted model is rendered offline.
THREE.TextureLoader.prototype.load=function(url,onLoad){const texture=new THREE.Texture();queueMicrotask(()=>onLoad(texture));return texture;};
function read(file){
 const b=fs.readFileSync(file);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());return {b,doc};
}
function parsed(b){return new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',resolve,reject));}
async function main(){
 let previous=0;
 for(const [name,cap,bytes]of [['cafe-seahorse.glb',8000,800000],['cafe-seahorse-close.glb',22000,2000000]]){
  const {b,doc}=read(path.join(folder,name));assert(b.length<bytes,'download budget');
  assert.equal(doc.materials.length,1);assert.equal(doc.meshes.length,1);assert.equal(doc.meshes[0].primitives.length,1);
  assert(!doc.buffers.some(v=>v.uri),'geometry embedded');assert(!doc.images.some(v=>v.uri),'paint embedded');
  assert(doc.materials[0].pbrMetallicRoughness.baseColorTexture,'authored color texture required');
  const primitive=doc.meshes[0].primitives[0];for(const attr of ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'])assert(primitive.attributes[attr]!=null,attr);
  const triangles=doc.accessors[primitive.indices].count/3;assert(triangles<=cap);assert(triangles>previous);previous=triangles;
  const gltf=await parsed(b),skin=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skin.push(o);});assert.equal(skin.length,1);
  const mesh=skin[0];assert(mesh.skeleton.bones.length<=16);
  for(const attr of Object.values(mesh.geometry.attributes))for(const value of attr.array)assert(Number.isFinite(value),'finite geometry');
  const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.002,'normalized skin weights');
  const bones=mesh.skeleton.bones;for(const name of ['Eye.L','Eye.R','Head','Dorsal fin'])assert(bones.some(b=>b.name===THREE.PropertyBinding.sanitizeNodeName(name)));
  const clips=gltf.animations;for(const name of ['Idle','Listen','React']){
   const clip=clips.find(a=>a.name===name);assert(clip&&clip.duration>0);
   const mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.play();
   const eye=bones.find(b=>b.name===THREE.PropertyBinding.sanitizeNodeName('Eye.L')),before=eye.quaternion.clone();let changed=false;
   for(let i=0;i<16;i++){mixer.update(clip.duration/17);if(eye.quaternion.angleTo(before)>.001)changed=true;}
   assert(changed,name+' has authored eye aim, not just a whole-body sway');mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  }
  console.log(name+': '+triangles+' triangles, '+b.length+' bytes, one draw, '+bones.length+' bones; Idle/Listen/React eye motion verified.');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
