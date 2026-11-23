const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ROOT='/workspace/coral-classroom',DIR='/workspace/work/shelly-cuteness-survey',THREE=require(ROOT+'/three.min.js');
const c={THREE,console,URL,Blob,TextDecoder,setTimeout,clearTimeout,navigator:{userAgent:'offline survey audit'}};c.window=c;c.self=c;vm.createContext(c);
vm.runInContext(fs.readFileSync(ROOT+'/src/js/vendor/three-gltfloader.js','utf8'),c);c.reefInstallGLTF();
THREE.TextureLoader.prototype.load=function(url,loaded){const t=new THREE.Texture();queueMicrotask(()=>loaded(t));return t};
const parse=b=>new Promise((ok,fail)=>new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',ok,fail));
(async()=>{const reports=[];let previousRatio=0;
for(let n=1;n<=10;n++){
 const path=DIR+'/'+String(n).padStart(2,'0')+'/shelly.glb',bytes=fs.readFileSync(path),g=await parse(bytes),meshes=[];
 g.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});assert.equal(meshes.length,1);const mesh=meshes[0],a=mesh.geometry.attributes;
 const names=mesh.skeleton.bones.map(x=>x.name);assert.equal(names.length,11);
 assert.deepEqual(names.filter(n=>n.startsWith('Flipper')).sort(),['FlipperFL','FlipperFR','FlipperRL','FlipperRR']);
 assert.equal(mesh.geometry.index.count/3,11443);assert(bytes.length<850000);
 const head=new THREE.Box3(),body=new THREE.Box3(),p=new THREE.Vector3();const flippers={};
 for(let i=0;i<a.position.count;i++){
  p.fromBufferAttribute(a.position,i);assert([p.x,p.y,p.z].every(Number.isFinite));let sum=0,headWeight=0,bodyWeight=0;
  for(let k=0;k<4;k++){const w=a.skinWeight.array[i*4+k],j=a.skinIndex.array[i*4+k],name=names[j];sum+=w;assert(w>=0&&j<11);if(['Head','EyeL','EyeR'].includes(name))headWeight+=w;if(name==='Body')bodyWeight+=w;if(name.startsWith('Flipper')&&w>.5)flippers[name]=(flippers[name]||0)+1;}
  assert(Math.abs(sum-1)<1e-4);if(headWeight>.5)head.expandByPoint(p);if(bodyWeight>.99)body.expandByPoint(p);
 }
 for(const name of ['FlipperFL','FlipperFR','FlipperRL','FlipperRR'])assert(flippers[name]>50);
 const ratio=head.getSize(new THREE.Vector3()).x/body.getSize(new THREE.Vector3()).x;assert(ratio>previousRatio);previousRatio=ratio;
 const mixer=new THREE.AnimationMixer(g.scene);g.scene.updateMatrixWorld(true);
 for(const name of ['Idle','Swim','Turn','Happy','Curious','Celebrate']){
  const clip=g.animations.find(x=>x.name===name);assert(clip);mixer.stopAllAction();mixer.clipAction(clip).reset().play();
  for(const f of [0,.5,.95]){mixer.setTime(clip.duration*f);g.scene.updateMatrixWorld(true);mesh.skeleton.update();
   for(let i=0;i<a.position.count;i+=7){p.fromBufferAttribute(a.position,i);mesh.boneTransform(i,p);assert([p.x,p.y,p.z].every(Number.isFinite));assert(p.length()<5);}
  }
 }
 reports.push({id:n,triangles:11443,bytes:bytes.length,flippers,headToShellWidthRatio:ratio,clips:6});
}
fs.writeFileSync(DIR+'/model-validation.json',JSON.stringify({actualGLBs:true,monotonicProportions:true,models:reports},null,2)+'\n');console.log(JSON.stringify(reports.map(x=>({id:x.id,headToShell:+x.headToShellWidthRatio.toFixed(3)}))));
})().catch(e=>{console.error(e);process.exitCode=1});
