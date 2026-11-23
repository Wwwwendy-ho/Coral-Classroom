'use strict';
// Validate an authored resident GLB pair before enabling its runtime registry
// entry. This does not establish visual quality, mask coverage or anatomy.
// Usage: node tools/check/resident_asset_test.js <id> --board path.glb --close path.glb
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const THREE=require('../../three.min.js'),root=path.resolve(__dirname,'../..');

const IDS=new Set(['jisu','shop-octopus','echo','pip','mira','cafe','bok','hana','captain-bay']);
const LIMITS={
  // The established authored-resident envelope: compact board model and a
  // sharper conversation model. Cafe has its existing tighter byte limits.
  default:{boardTriangles:7500,closeTriangles:21000,boardBytes:850000,closeBytes:2000000,bones:16},
  jisu:{boardTriangles:8000,closeTriangles:22000,boardBytes:1000000,closeBytes:2500000,bones:16},
  'shop-octopus':{boardTriangles:8000,closeTriangles:22000,boardBytes:1200000,closeBytes:3000000,bones:20},
  echo:{boardTriangles:6500,closeTriangles:18000,boardBytes:850000,closeBytes:2000000,bones:14},
  pip:{boardTriangles:6500,closeTriangles:18000,boardBytes:850000,closeBytes:2000000,bones:14},
  mira:{boardTriangles:12000,closeTriangles:24000,boardBytes:1200000,closeBytes:3000000,bones:16},
  cafe:{boardTriangles:8000,closeTriangles:22000,boardBytes:800000,closeBytes:2000000,bones:16}
};
const REQUIRED_CLIPS=['Idle','Listen','React'];
const EYE_RE=/eye|stalk/i;

function usage(){
  return 'Usage: node tools/check/resident_asset_test.js <id> --board <board.glb> --close <close.glb>\n'+
    'Supported IDs: '+Array.from(IDS).join(', ');
}
function argsOf(argv){
  const args={};
  if(!argv.length) throw Error('Missing resident id.\n'+usage());
  args.id=argv[0];
  for(let i=1;i<argv.length;i++){
    const flag=argv[i];
    if(flag!=='--board'&&flag!=='--close') throw Error('Unknown argument: '+flag+'\n'+usage());
    if(!argv[i+1]||argv[i+1].startsWith('--')) throw Error('Missing path after '+flag+'\n'+usage());
    if(args[flag.slice(2)]) throw Error('Duplicate argument: '+flag);
    args[flag.slice(2)]=path.resolve(argv[++i]);
  }
  if(!IDS.has(args.id)) throw Error('Unsupported resident id: '+args.id+'\n'+usage());
  for(const flag of ['board','close']){
    if(!args[flag]) throw Error('Missing required --'+flag+' input.\n'+usage());
    if(!fs.existsSync(args[flag])) throw Error('Missing '+flag+' GLB input: '+args[flag]);
    if(!fs.statSync(args[flag]).isFile()) throw Error(flag+' input is not a file: '+args[flag]);
  }
  return args;
}

const context={THREE,console,setTimeout,clearTimeout,Promise,Blob,URL,TextDecoder,
  navigator:{userAgent:'node resident asset audit'}};
context.window=context;context.self=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/js/vendor/three-gltfloader.js'),'utf8'),context);
context.reefInstallGLTF();
// The offline audit has no GPU/image decoder. Geometry and animation are the
// actual GLB payloads; image inspection belongs to the separate Pillow review.
THREE.TextureLoader.prototype.load=function(url,onLoad){
  const texture=new THREE.Texture();queueMicrotask(()=>onLoad(texture));return texture;
};

function read(file){
  const b=fs.readFileSync(file);
  assert(b.length>=20,file+': truncated GLB');
  assert.equal(b.readUInt32LE(0),0x46546c67,file+': invalid GLB magic');
  assert.equal(b.readUInt32LE(4),2,file+': expected GLB version 2');
  assert.equal(b.readUInt32LE(8),b.length,file+': invalid GLB byte length');
  const jsonLength=b.readUInt32LE(12),jsonType=b.readUInt32LE(16);
  assert.equal(jsonType,0x4e4f534a,file+': JSON chunk missing');
  assert(20+jsonLength+8<=b.length,file+': truncated JSON chunk');
  const doc=JSON.parse(b.subarray(20,20+jsonLength).toString());
  assert(!doc.buffers.some(v=>v.uri),file+': external geometry buffer is not supported');
  assert(!doc.images.some(v=>v.uri),file+': external image is not supported');
  return {b,doc};
}
function parse(b,file){
  return new Promise((resolve,reject)=>{
    const bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
    new THREE.GLTFLoader().parse(bytes,'',resolve,error=>reject(Error(file+': GLTF parse failed: '+error)));
  });
}
function triangleCount(doc,file){
  assert.equal(doc.meshes.length,1,file+': expected exactly one mesh');
  assert.equal(doc.meshes[0].primitives.length,1,file+': expected exactly one primitive/draw');
  const primitive=doc.meshes[0].primitives[0];
  for(const attr of ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'])
    assert(primitive.attributes[attr]!=null,file+': missing '+attr);
  const accessor=doc.accessors[primitive.indices];
  assert(accessor,file+': missing index accessor');
  assert.equal(accessor.count%3,0,file+': indices are not triangles');
  return accessor.count/3;
}
function checkOctopusMask(doc,file){
  const material=doc.materials[0];
  const marked=material.name==='OctopusSkinMask'||
    (material.extras&&material.extras.residentSkinMask==='baseColorAlpha');
  assert(marked,file+': octopus material must be named OctopusSkinMask or mark extras.residentSkinMask=baseColorAlpha');
  const texture=material.pbrMetallicRoughness&&material.pbrMetallicRoughness.baseColorTexture;
  assert(texture,file+': octopus baseColor texture is required');
  const tex=doc.textures[texture.index];
  assert(tex&&doc.images[tex.source],file+': octopus baseColor image missing');
  assert.equal(doc.images[tex.source].mimeType,'image/png',file+': octopus baseColor image must be embedded PNG for alpha mask');
}
function isEyeName(name){return EYE_RE.test(name||'');}
function checkNoEyeScalingOrBlink(id,doc,gltf,file){
  if(!['jisu','pip','bok','hana'].includes(id)) return;
  const names=doc.nodes.map(n=>n.name||'');
  for(const animation of doc.animations||[]){
    for(const channel of animation.channels){
      const target=channel.target||{},name=names[target.node]||'';
      assert(!/blink|lid/i.test(name),file+': '+id+' must not animate eyelid/blink node '+name);
      if(target.path==='weights'){
        const node=doc.nodes[target.node]||{},mesh=node.mesh!=null&&doc.meshes[node.mesh];
        const names=(mesh&&mesh.extras&&mesh.extras.targetNames)||[];
        assert(!names.some(n=>/eye|blink|lid/i.test(n)),file+': '+id+' must not animate eye/blink morph targets');
      }
    }
  }
  // Blender samples identity scale tracks even when eyes only rotate. Reject
  // actual scaling over time rather than treating a constant channel as a blink.
  for(const clip of gltf.animations) for(const track of clip.tracks){
    if(!isEyeName(track.name)||!track.name.endsWith('.scale')) continue;
    const stride=track.getValueSize(),values=track.values;
    for(let i=stride;i<values.length;i++)
      assert(Math.abs(values[i]-values[i%stride])<1e-4,file+': '+id+' must not scale eyes/stalks (blinking)');
  }
}
function snapshot(obj){return {p:obj.position.clone(),q:obj.quaternion.clone(),s:obj.scale.clone()};}
function changed(a,b){return a.p.distanceTo(b.position)>1e-4||a.q.angleTo(b.quaternion)>1e-4||a.s.distanceTo(b.scale)>1e-4;}
function checkEyeMotion(id,doc,gltf,file){
  const controls=gltf._residentBones.filter(bone=>isEyeName(bone.name));
  assert(controls.length,file+': expected at least one named eye/stalk rig control (/eye|stalk/i)');
  const moving=[];
  for(const clip of gltf.animations){
    const mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);
    const initial=new Map(controls.map(b=>[b,snapshot(b)]));
    action.play();let moved=false;
    const steps=24,dt=Math.max(clip.duration/steps,1/240);
    for(let i=0;i<steps;i++){
      mixer.update(dt);
      if(controls.some(b=>changed(initial.get(b),b))){moved=true;break;}
    }
    assert(moved,file+': '+clip.name+' must move an eye/stalk by position or rotation'+
      ((id==='jisu'||id==='pip')?' (eye scale/blink is not accepted)':''));
    moving.push(clip.name);
    mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  }
  return moving;
}
async function inspect(id,file,kind,limits){
  const {b,doc}=read(file);
  assert.equal(doc.materials.length,1,file+': expected one material');
  assert.equal(doc.skins.length,1,file+': expected exactly one skin');
  assert(doc.images.length>0,file+': embedded authored texture is required');
  for(const image of doc.images)
    assert(image.bufferView!=null&&image.mimeType,file+': images must be embedded with a MIME type');
  assert(doc.materials[0].pbrMetallicRoughness&&doc.materials[0].pbrMetallicRoughness.baseColorTexture,
    file+': baseColor texture is required');
  const triangles=triangleCount(doc,file);
  const byteCap=kind==='board'?limits.boardBytes:limits.closeBytes;
  const triangleCap=kind==='board'?limits.boardTriangles:limits.closeTriangles;
  assert(b.length<byteCap,file+': '+kind+' exceeds byte budget ('+b.length+' >= '+byteCap+')');
  assert(triangles<=triangleCap,file+': '+kind+' exceeds triangle budget ('+triangles+' > '+triangleCap+')');
  if(id==='shop-octopus') checkOctopusMask(doc,file);
  const gltf=await parse(b,file),skinned=[];
  gltf.scene.traverse(obj=>{if(obj.isSkinnedMesh)skinned.push(obj);});
  assert.equal(skinned.length,1,file+': expected exactly one skinned mesh');
  const mesh=skinned[0];
  assert(mesh.skeleton.bones.length<=limits.bones,file+': bone cap exceeded ('+mesh.skeleton.bones.length+' > '+limits.bones+')');
  const attributes=mesh.geometry.attributes;
  for(const attrName of ['position','normal','uv','skinIndex','skinWeight'])
    assert(attributes[attrName],file+': parsed mesh missing '+attrName);
  for(const attr of Object.values(attributes))
    for(const value of attr.array) assert(Number.isFinite(value),file+': non-finite geometry/skin attribute');
  const weights=attributes.skinWeight;
  for(let i=0;i<weights.count;i++)
    assert(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.002,
      file+': skin weights are not normalized at vertex '+i);
  const bones=mesh.skeleton.bones;
  gltf._residentBones=bones;
  checkNoEyeScalingOrBlink(id,doc,gltf,file);
  const clips=gltf.animations;
  for(const name of REQUIRED_CLIPS) assert(clips.some(clip=>clip.name===name),file+': missing required '+name+' clip');
  const moving=checkEyeMotion(id,doc,gltf,file);
  return {file:path.resolve(file),bytes:b.length,triangles,bones:bones.length,materials:doc.materials.length,
    meshes:doc.meshes.length,primitives:doc.meshes[0].primitives.length,
    images:doc.images.length,clips:clips.map(c=>c.name),eyeMotionClips:moving,
    octopusMaskMarkerAndPngChecked: id==='shop-octopus'};
}
async function main(){
  const args=argsOf(process.argv.slice(2)),limits=LIMITS[args.id]||LIMITS.default;
  const board=await inspect(args.id,args.board,'board',limits);
  const close=await inspect(args.id,args.close,'close',limits);
  assert(close.bytes>board.bytes,'close GLB must exceed board GLB bytes');
  assert(close.triangles>board.triangles,'close GLB must exceed board GLB triangles');
  console.log(JSON.stringify({id:args.id,pass:true,budgets:limits,board,close,
    note:'Structural/motion contract only; does not validate visual appearance, image dimensions, octopus alpha coverage, or topology.'},null,2));
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
