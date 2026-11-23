// Actual exported GLBs through the production loader, adapter and animation mixer.
// Images are decoded/inspected separately. This is not a GPU or phone benchmark.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ROOT='/workspace/coral-classroom',THREE=require(ROOT+'/three.min.js');
const folder=process.argv[2]||'/workspace/work/crafted-shelly-v3';
const loader=fs.readFileSync(ROOT+'/src/js/vendor/three-gltfloader.js','utf8');
const shelly=fs.readFileSync(ROOT+'/src/js/reef3d/shelly.js','utf8');
THREE.TextureLoader.prototype.load=function(url,loaded){const t=new THREE.Texture();queueMicrotask(()=>loaded(t));return t};

async function check(crafted,q){
 const requests=[];
 const c={THREE,console,URL,Blob,TextDecoder,Uint8Array,atob,URLSearchParams,setTimeout,clearTimeout,Promise,
  R3:{q},navigator:{userAgent:'offline asset validation'},REEF3D_HOP_TIME_SCALE:1,
  location:{search:crafted?'?art=crafted&shelly=storybook':'?shelly=storybook'},
  // The obsolete portable payload is deliberately present in the crafted case.
  document:{getElementById:()=>crafted?{textContent:'%%%obsolete-inline-asset'}:null},
  reef3dLoad:()=>Promise.resolve(THREE),
  fetch:async url=>{requests.push(url);const name=url.split('/').at(-1).split('?')[0];
   const p=(crafted?folder:ROOT+'/assets/models')+'/'+name,b=fs.readFileSync(p);
   return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}
 };
 c.window=c;c.self=c;vm.createContext(c);vm.runInContext(loader,c);c.reefInstallGLTF();vm.runInContext(shelly,c);
 const gltf=await c.reef3dShellyLoad();assert(gltf,'actual selected GLB parses');
 const expected=crafted?(q>=2?'crafted-shelly-view.glb':'crafted-shelly.glb'):(q>=2?'shelly-view.glb':'shelly.glb');
 assert.equal(requests.length,1);assert(requests[0].includes('/'+expected+'?'));
 const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});assert.equal(meshes.length,1);
 const skin=meshes[0],boneNames=skin.skeleton.bones.map(b=>b.name);
 assert.deepEqual(boneNames.filter(n=>/^Flipper[FR][LR]$/.test(n)).sort(),['FlipperFL','FlipperFR','FlipperRL','FlipperRR']);
 assert.equal(skin.skeleton.bones.length,11);assert.equal(skin.material.transparent,false);
 const tri=skin.geometry.index.count/3;assert(tri<=(q>=2?11947:23836));
 for(const a of Object.values(skin.geometry.attributes))assert(a.array.every(Number.isFinite));
 const joints=skin.geometry.attributes.skinIndex,weights=skin.geometry.attributes.skinWeight,partCounts={};
 for(let i=0;i<weights.count;i++){
  let total=0;for(let k=0;k<4;k++){const w=weights.array[i*4+k],j=joints.array[i*4+k];assert(w>=0&&j<boneNames.length);total+=w;if(w>.5)partCounts[boneNames[j]]=(partCounts[boneNames[j]]||0)+1;}
  assert(Math.abs(total-1)<1e-4);
 }
 for(const name of ['FlipperFL','FlipperFR','FlipperRL','FlipperRR','Head','Tail'])assert(partCounts[name]>10,name+' owns real mesh vertices');
 const guide=new THREE.Group(),body=new THREE.Group();guide.userData.body=body;guide.add(body);
 const camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(0,10,12);
 const view={guide,cam:camera};assert(c.reef3dShellyAttach(view,gltf));
 const state=guide.userData.shelly;assert.equal(state.variant,crafted?'crafted-organic-3':'natural-1');
 state.mixer.stopAllAction();state.root.updateMatrixWorld(true);
 const bindBox=new THREE.Box3().setFromObject(state.root),size=bindBox.getSize(new THREE.Vector3());
 if(crafted){assert(size.x<=2.051&&size.z<=2.201&&size.y<=1.481);}
 const point=new THREE.Vector3(),ranges={};
 for(const name of ['Idle','Swim','Turn','Happy','Curious','Celebrate']){
  const clip=state.clips[name];assert(clip,name+' clip is present');const bounds=new THREE.Box3();
  state.mixer.stopAllAction();const action=state.actions[name];action.reset().play();action.setEffectiveWeight(1);
  for(const fraction of [0,.25,.5,.75,.98]){
   state.mixer.setTime(clip.duration*fraction);state.root.updateMatrixWorld(true);
   skin.skeleton.update();
   // The adapter clones the skin. Read that actual attached clone's vertices.
   state.root.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();
    const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
     point.fromBufferAttribute(p,i);o.boneTransform(i,point);point.applyMatrix4(o.matrixWorld);
     assert([point.x,point.y,point.z].every(Number.isFinite));bounds.expandByPoint(point);
    }
   });
  }
  const s=bounds.getSize(new THREE.Vector3());assert(s.x<4&&s.y<4&&s.z<4,'bounded '+name+' pose');ranges[name]=s.toArray().map(n=>+n.toFixed(3));
 }
 c.reef3dShellyDispose(view);
 return {crafted,tier:q,file:expected,triangles:tri,bytes:fs.statSync((crafted?folder:ROOT+'/assets/models')+'/'+expected).size,bones:boneNames.length,flipperVertexGroups:partCounts,worldSize:size.toArray(),animatedBounds:ranges};
}
(async()=>{
 const reports=[];for(const q of [0,2])reports.push(await check(true,q));
 reports.push(await check(false,2));
 const out={actualGLBs:true,productionLoader:true,obsoleteInlineIgnored:true,allSixClips:true,browserTested:false,models:reports};
 fs.writeFileSync(folder+'/runtime-audit.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(reports.map(r=>({file:r.file,triangles:r.triangles,bytes:r.bytes,worldSize:r.worldSize}))));
})().catch(e=>{console.error(e);process.exitCode=1});
