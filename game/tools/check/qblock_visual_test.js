'use strict';
// Actual Three raycasts: compact visible art keeps the original touch surface.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../..'),THREE=require(root+'/three.min.js');
const acorn=require('acorn'),walk=require('acorn-walk');
function source(file,name){
  const text=fs.readFileSync(root+'/'+file,'utf8');let found;
  walk.full(acorn.parse(text,{ecmaVersion:2020}),n=>{if(n.type==='FunctionDeclaration'&&n.id.name===name)found=text.slice(n.start,n.end);});
  assert(found,name);return found;
}
const c={THREE,window:{THREE},Math,R3:{q:3},REEF3D_QY:2,
  reef3dQFace:()=>new THREE.Texture(),reef3dBlobTex:()=>new THREE.Texture(),reef3dGlintTex:()=>new THREE.Texture()};
vm.createContext(c);
vm.runInContext(source('src/js/reef3d/scenes.js','reef3dRoundBox'),c);
for(const name of ['reef3dQBlock','reef3dQUsed','reef3dQIdle'])vm.runInContext(source('src/js/reef3d/scenes.js',name),c);
for(const night of [false,true]){
  const g=c.reef3dQBlock(night),box=g.userData.box,side=night?.9:1.05;
  box.geometry.computeBoundingBox();
  const width=box.geometry.boundingBox.getSize(new THREE.Vector3()).x;
  assert(Math.abs(width-side*2/3)<1e-6,'visible block is a third smaller');
  assert.equal(g.children.filter(o=>o.isMesh).length,1,'no rendered proxy');
  box.userData.space=7;g.position.set(4,3,-5);g.rotation.y=.37;g.scale.set(1.1,.9,1.1);g.updateMatrixWorld(true);
  const reference=new THREE.Mesh(c.reef3dRoundBox(side,.15,4),box.material);reference.matrixWorld.copy(g.matrixWorld);
  let marginHits=0;
  for(let x=-.5;x<=.5;x+=.05)for(let y=-.5;y<=.5;y+=.05){
    const origin=new THREE.Vector3(x,y,4).applyMatrix4(g.matrixWorld);
    const direction=new THREE.Vector3(0,0,-1).transformDirection(g.matrixWorld);
    const ray=new THREE.Raycaster(origin,direction),old=[],now=[],visible=[];
    reference.raycast(ray,old);box.raycast(ray,now);THREE.Mesh.prototype.raycast.call(box,ray,visible);
    assert.equal(now.length>0,old.length>0,'tap surface matches the old rounded block');
    if(now.length){assert.strictEqual(now[0].object,box);assert.equal(now[0].object.userData.space,7);assert(Math.abs(now[0].distance-old[0].distance)<1e-5);}
    if(now.length&&!visible.length)marginHits++;
  }
  assert(marginHits>0,'generous hit margin outside the smaller art');
  c.reef3dQUsed(g);c.reef3dQIdle({qb:g,i:1},2);
  assert.equal(g.userData.used,1);assert.strictEqual(box.material.map,g.userData.texUsed);
  assert(g.userData.glints.every(o=>!o.visible));
}
console.log('Compact question blocks preserve actual Three touch bounds, hit identity, bonk transforms and depleted appearance.');
