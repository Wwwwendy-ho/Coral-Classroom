const assert=require('assert'),fs=require('fs'),vm=require('vm'),THREE=require(process.cwd()+'/three.min.js');
const {createCanvas}=require('@napi-rs/canvas');
const board=fs.readFileSync('src/js/reef3d/board.js','utf8');
function section(a,b){return board.slice(board.indexOf(a),board.indexOf(b,board.indexOf(a)))}
let canvasCount=0;
const c={THREE,console,document:{createElement:()=>{canvasCount++;return createCanvas(1,1)}},URLSearchParams,Math,innerWidth:1024,reefNight:()=>false,regionEncounterCamera:()=>false,location:{search:'?art=crafted'}};
c.window=c;vm.createContext(c);
for(const name of ['vendor/three-gltfloader.js','reef3d/world-routes.js','reef3d/crafted-world.js'])vm.runInContext(fs.readFileSync('src/js/'+name,'utf8'),c);
c.reefInstallGLTF();
vm.runInContext(section('  function reef3dSpaces(','  function reef3dKit(')+section('  function reef3dBand(','  // Swap a moving object')+section('  var REEF3D_REGION_CAMERA','  // A mast standing'),c);
const root=c.ReefCraftedWorld;assert(root.enabled(null,false));assert(!root.enabled({id:'town'},false));assert(!root.enabled(null,true));c.location.search='';assert(!root.enabled(null,false));
const colors={};const M=color=>colors[color]||(colors[color]=new THREE.MeshToonMaterial({color}));
const rig={dir:new THREE.Vector3(6,18,10).normalize(),sky:new THREE.Color('#f8fff7').multiplyScalar(.56),ground:new THREE.Color('#73b8bd').multiplyScalar(.56),sun:new THREE.Color('#fff8ee').multiplyScalar(.72)};
function triangles(group){let n=0;group.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});return n}
function project(object,cam){
  const box=new THREE.Box3(), point=new THREE.Vector3();object.updateMatrixWorld(true);
  object.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;
    for(let i=0;i<a.count;i++)box.expandByPoint(point.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(cam));
  });
  return box;
}
function buildFloor(spaces){
  const bounds=spaces.bounds;
  const x=(bounds.minX+bounds.maxX)*.5,z=(bounds.minZ+bounds.maxZ)*.5;
  const width=Math.max(50,bounds.maxX-bounds.minX+32),length=Math.max(50,bounds.maxZ-bounds.minZ+32);
  const geometry=new THREE.PlaneGeometry(width,length,Math.ceil(width/2),Math.ceil(length/2));
  const pathPts=c.reef3dPathLines(spaces).filter(p=>p.length>1).flatMap(path=>
    new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(p.x,0,p.z))).getSpacedPoints(path.length*6)
  );
  function distance(x,z){
    const near = Math.min(...pathPts.map(p=>(p.x-x)**2+(p.z-z)**2));
    const k=Math.min(1,Math.max(0,(Math.sqrt(near)-1.9)/2.6));
    return k*k*(3-2*k);
  }
  function groundY(x,wz){
    const h=Math.sin(x*.35)*.25+Math.cos((z-wz)*.22+x*.1)*.3;
    const flat=Math.min(h,0)*.4-.06;
    return flat+(h-flat)*distance(x,wz)-.15;
  }
  return {geometry,x,z,groundY,distance};
}
function rgbAt(g,i){ return [g.getX(i),g.getY(i),g.getZ(i)]; }
const warm = (r,g,b)=> r>.94 && g>.83 && g>b;
const violet = (r,g,b)=> b>r+.08 && r>g+.026 && b>.65;
const aqua = (r,g,b)=> g>r+.25 && b>r+.26 && g>.55;
const coral = (r,g,b)=> r>.84 && r>b+.11 && r>g+.14 && g>.35;
function colorKinds(rgb){
  return {
    ivory:rgb.filter(v=>warm(...v)).length,
    violet:rgb.filter(v=>violet(...v)).length,
    aqua:rgb.filter(v=>aqua(...v)).length,
    coral:rgb.filter(v=>coral(...v)).length
  };
}
function sampledColors(mesh, bitmap){
  const rgb=mesh.geometry.attributes.color, uv=mesh.geometry.attributes.uv;
  const colors=[];
  for(let i=0;i<rgb.count;i++){
    let u=Math.round(uv.getX(i)*(bitmap.width-1));
    let v=Math.round((1-uv.getY(i))*(bitmap.height-1));
    const p=(u+v*bitmap.width)*4;
    const [r,g,b]=rgbAt(rgb,i);
    colors.push([r*bitmap.data[p]/255,g*bitmap.data[p+1]/255,b*bitmap.data[p+2]/255]);
  }
  return colors;
}
for(const stops of [2,3,4,6,8,16])for(const [width,height] of [[320,710],[390,844],[640,740],[1280,780],[1440,760]]){
  c.innerWidth=width;
  const zones=[{id:'words',items:Array.from({length:stops},(_,i)=>({state:i===1?'done':'ready',d:{id:i,emoji:'말'}}))}];
  const s=c.reef3dSpaces(zones,null), graph=JSON.stringify(s), statics=new THREE.Group(), tiles=new THREE.Group(), before=canvasCount;
  const taken=s.filter(k=>['deck','treasure','story'].includes(k.kind)).map(k=>{
    const n=c.reef3dAhead(s,k.i),dx=n.x-k.x,dz=n.z-k.z,d=Math.hypot(dx,dz)||1;
    let side=k.x>n.x?1:-1;if(width<640)side=k.x>0?-1:1;if(k.end)side=k.x>s[k.jn].x?1:-1;
    return [k.x-dz/d*side*2.3,k.z+dx/d*side*2.3];
  });
  const floor=buildFloor(s), pavilion=root.garden({THREE,statics,spaces:s,mainN:s.mainN,M,groundY:floor.groundY,taken});
  assert.deepEqual(JSON.stringify(s),graph);
  const house=statics.getObjectByName('Nautilus pavilion'); assert(house,'has visible landmark at '+stops+' '+width);
  const cam=new THREE.PerspectiveCamera(width<640?52:42,width/height,.1,54),target=new THREE.Vector3();
  const guide={position:new THREE.Vector3(s[0].x,.3,s[0].z)};
  c.reef3dCamTarget({spaces:s,guide,at:0,w:width,h:height,craftedPavilion:pavilion},cam.position,target);
  cam.lookAt(target); cam.updateMatrixWorld(true);
  const p=house.position.clone().add(new THREE.Vector3(0,2.25,0)).project(cam), ext=project(house,cam);
  const g=guide.position.clone().add(new THREE.Vector3(0,1,0)).project(cam);
  assert(Math.abs(p.x)<.78&&Math.abs(p.y)<.85,'pavilion center in initial camera at '+width);
  assert(Math.abs(g.x)<.8&&Math.abs(g.y)<.8,'guide center in initial camera at '+width);
  const fixture=stops===2;
  if(fixture) assert(ext.min.x>=-1 && ext.max.x<=1 && ext.min.y>=-1 && ext.max.y<=1,'full pavilion in initial camera at '+width);
  const ctx=root.createContext(THREE), art=[];
  const hide=new THREE.MeshBasicMaterial({visible:false});
  for(const space of s){
    const big=['deck','treasure','story','start','shop'].includes(space.kind), radius=big?1.25:.86;
    const t=ctx.tile(big?'classic':'shell',space,radius,'#888',space.item?space.item.d.emoji:space.kind==='surprise'?'?':space.kind==='chance'?'!':space.kind==='story'?'🍾':'');
    const ray=new THREE.Raycaster(new THREE.Vector3(space.x,5,space.z),new THREE.Vector3(0,-1,0));
    t.hit.userData.space=space.i;t.hit.material=hide;t.hit.updateMatrixWorld(true); t.face.updateMatrixWorld(true);
    assert(ray.intersectObject(t.hit)[0].object.userData.space===space.i);
    assert(ray.intersectObject(t.face).length,'visible cap faces upwards');
    tiles.add(...t.parts,t.face);
    if(fixture) art.push(t);
  }
  assert.equal(canvasCount,before+1);
  const count=triangles(statics)+triangles(tiles);statics.add(tiles);
  const merged=c.reef3dMerge(statics,rig,{});
  assert.equal(triangles(merged),count);
  merged.traverse(o=>{
    if(!o.isMesh)return;
    assert(o.material.isMeshBasicMaterial&&o.material.vertexColors&&!o.material.transparent);
    for(const a of Object.values(o.geometry.attributes))assert(a.array.every(Number.isFinite));
  });
  if(fixture){
    assert(count<=23452*1.25 && merged.children.length<=10,'mobile demo scene budget');
    if(width===1280){
      const atlas=art[0].face.material.map.image, bitmap=atlas.getContext('2d').getImageData(0,0,atlas.width,atlas.height);
      const wallColors=art.flatMap(t=>sampledColors(t.parts[0],bitmap));
      const capColors=art.flatMap(t=>sampledColors(t.face,bitmap));
      const houseColors=[];
      house.traverse(o=>{
        if(!o.isMesh) return;
        const a=o.geometry.attributes.color;
        assert(a && o.material.isMeshBasicMaterial,'pavilion shade already baked to vertex colors');
        for(let i=0;i<a.count;i++) houseColors.push(rgbAt(a,i));
      });
      root.paintFloor(THREE,floor.geometry,floor.x,floor.z,floor.distance);
      const a=floor.geometry.attributes.color, floorColors=Array.from({length:a.count},(_,i)=>rgbAt(a,i));
      const position=floor.geometry.attributes.position, fog = new THREE.Color(root.fogColor).toArray();
      const halfW=floor.geometry.parameters.width/2, halfL=floor.geometry.parameters.height/2;
      for(let i=0;i<position.count;i++){
        const edge=Math.min(halfW-Math.abs(position.getX(i)),halfL-Math.abs(position.getY(i)));
        if(edge<.001) assert(floorColors[i].every((v,k)=>Math.abs(v-fog[k])<.001),'floor edge blends into the scene background');
      }
      const [walls,caps,architecture,seabed]=[wallColors,capColors,houseColors,floorColors].map(colorKinds);
      assert(walls.ivory>40 && caps.aqua>30 && caps.violet>30 && caps.coral>8,'distinct inlays and warm stone in real sampled atlas pixels');
      assert(architecture.ivory>80 && architecture.aqua>200 && architecture.violet>200,'luminous carved stone and mixed translucent-looking glazing');
      assert(seabed.aqua>floorColors.length*.9,'saturated turquoise through the existing floor mesh');
      console.log({walls,caps,architecture,seabed});
    }
  }
  if(fixture) console.log({stops,width,height,spaceCount:s.length,pavilionNdc:[ext.min.x,ext.max.x,ext.min.y,ext.max.y].map(n=>n.toFixed(2)),guideNdc:[g.x,g.y].map(n=>n.toFixed(2)),triangles:count,draws:merged.children.length});
}
console.log('Passed for six deck counts and five viewport sizes.');
