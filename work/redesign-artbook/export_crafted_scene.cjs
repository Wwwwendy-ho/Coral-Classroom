// Export actual crafted builders, real atlas pixels and baked colors for offline inspection.
// This is not a browser screenshot: excludes dynamic game props, caustics and HTML HUD.
const fs=require('fs'),path=require('path');
const source=fs.readFileSync('/workspace/work/redesign-artbook/check_crafted_geometry.js','utf8');
const prefix=source.slice(0,source.indexOf('for(const stops of [2,3,4,6,8,16])'));
const body=`
const out=process.argv[2]||'/workspace/work/redesign-artbook/scene-proof';fs.mkdirSync(out,{recursive:true});
const width=1280,height=780;c.innerWidth=width;
const zones=[{id:'words',items:Array.from({length:2},(_,i)=>({state:'ready',d:{id:i,emoji:'말'}}))}];
const spaces=c.reef3dSpaces(zones,null),statics=new THREE.Group(),tiles=new THREE.Group();
const floor=buildFloor(spaces);
const taken=spaces.filter(s=>['deck','treasure','story'].includes(s.kind)).map(s=>{
 const n=c.reef3dAhead(spaces,s.i),dx=n.x-s.x,dz=n.z-s.z,d=Math.hypot(dx,dz)||1;
 let side=s.x>n.x?1:-1;if(width<640)side=s.x>0?-1:1;if(s.end)side=s.x>spaces[s.jn].x?1:-1;
 return [s.x-dz/d*side*2.3,s.z+dx/d*side*2.3];
});
const pavilion=root.garden({THREE,statics,spaces,mainN:spaces.mainN,M,groundY:floor.groundY,taken});
const ctx=root.createContext(THREE);
for(const s of spaces){const big=['deck','treasure','story','start','shop'].includes(s.kind);const t=ctx.tile(big?'classic':'shell',s,big?1.25:.86,'#888',s.item?s.item.d.emoji:s.kind==='surprise'?'?':s.kind==='chance'?'!':'');tiles.add(...t.parts,t.face)}
statics.add(tiles);const merged=c.reef3dMerge(statics,rig,{});
root.paintFloor(THREE,floor.geometry,floor.x,floor.z,floor.distance);
const a=floor.geometry.attributes.position;
for(let i=0;i<a.count;i++)a.setZ(i,floor.groundY(a.getX(i)+floor.x,floor.z-a.getY(i))+.15);
const ground=new THREE.Mesh(floor.geometry,new THREE.MeshBasicMaterial({vertexColors:true}));ground.rotation.x=-Math.PI/2;ground.position.set(floor.x,-.15,floor.z);merged.add(ground);merged.updateMatrixWorld(true);
const materials=[],textures=[],objects=[],mats=new Map(),maps=new Map();
merged.traverse(o=>{if(!o.isMesh)return;let mat=o.material;
 if(!mats.has(mat.uuid)){let map=null;if(mat.map){if(!maps.has(mat.map.uuid)){map=textures.length;const file=out+'/atlas-'+map+'.png';fs.writeFileSync(file,mat.map.image.toBuffer('image/png'));maps.set(mat.map.uuid,map);textures.push({id:map,file})}map=maps.get(mat.map.uuid)}const id=materials.length;mats.set(mat.uuid,id);materials.push({id,color:mat.color.toArray(),map,side:mat.side,fog:mat.fog})}
 const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),attributes={};for(const key of ['position','color','uv'])if(geo.attributes[key])attributes[key]=Array.from(geo.attributes[key].array);
 objects.push({name:o.name||'crafted-'+objects.length,material:mats.get(mat.uuid),attributes,index:geo.index?Array.from(geo.index.array):null});
});
const cam=new THREE.PerspectiveCamera(42,width/height,.1,54),target=new THREE.Vector3(),guide=new THREE.Vector3(spaces[0].x,.3,spaces[0].z);
c.reef3dCamTarget({spaces,guide:{position:guide},at:0,w:width,h:height,craftedPavilion:pavilion},cam.position,target);
const data={scope:'Offline inspection of actual crafted tile and scenery geometry; ground omits runtime caustics; no dynamic game props, characters or HTML interface',textures,materials,objects,background:new THREE.Color('#79cce2').toArray(),fog:{color:new THREE.Color('#79cce2').toArray(),near:20,far:49},camera:{position:cam.position.toArray(),target:target.toArray(),fov:42,width,height},guide:guide.toArray()};
fs.writeFileSync(out+'/scene.json',JSON.stringify(data));console.log(JSON.stringify({objects:objects.length,materials:materials.length,textures:textures.length,output:out+'/scene.json'}));
`;
new Function('require','process',prefix+body)(require,process);
