/* CPU-only production scenery audit and world-space export; no app/browser/server.
 * node tools/art/audit_world_scenery.cjs [--variant=before|after|both]
 *   [--boards=town,cove,...] [--out=/workspace/work/world-realism]
 * Baseline sources are the unchanged snapshot in OUT/baseline.
 * Region activities, route/kit/builders/bake/merge are actual application code.
 * This isolates scenery, not the whole game or its device frame rate.
 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),zlib=require('zlib'),assert=require('assert');
const root=path.resolve(__dirname,'../..'),THREE=require(root+'/three.min.js');
const acorn=require(root+'/tools/check/node_modules/acorn'),walk=require(root+'/tools/check/node_modules/acorn-walk');
const options=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const output=options.out||'/workspace/work/world-realism';
const boards=(options.boards||'town,cove,lagoon,caves,patterns,beach,light,captain').split(',');
const variants=options.variant&&options.variant!=='both'?[options.variant]:['before','after'];
const read=p=>fs.readFileSync(p,'utf8');
function functionSource(source,name){
  let found=null;
  walk.full(acorn.parse(source,{ecmaVersion:2020,allowReturnOutsideFunction:true}),node=>{if(node.type==='FunctionDeclaration'&&node.id.name===name&&!found)found=node;});
  assert(found,'missing production function '+name);return source.slice(found.start,found.end);
}
function color(css){
  if(css[0]==='#'){
    let h=css.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),1];
  }
  const m=css.match(/[\d.]+/g)||[0,0,0,1];return [+m[0],+m[1],+m[2],m.length>3?+m[3]:1];
}
// The kit and old floor use only filled rectangles and straight strokes. Retain
// their actual pixels so the before export includes its existing floor texture.
function canvas(){
  const cv={width:0,height:0,pixels:null};
  function ensure(){if(!cv.pixels||cv.pixels.length!==cv.width*cv.height*4)cv.pixels=new Uint8ClampedArray(cv.width*cv.height*4);}
  function put(x,y,rgba){
    if(x<0||y<0||x>=cv.width||y>=cv.height)return;
    const i=(y*cv.width+x)*4,a=rgba[3];
    for(let k=0;k<3;k++)cv.pixels[i+k]=rgba[k]*a+cv.pixels[i+k]*(1-a);cv.pixels[i+3]=255;
  }
  let points=[];
  const ctx={fillStyle:'#000000',strokeStyle:'#000000',lineWidth:1,
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
    putImageData(im){cv.pixels=im.data;},
    fillRect(x,y,w,h){ensure();const c=color(this.fillStyle);for(let yy=Math.max(0,Math.floor(y));yy<Math.min(cv.height,Math.ceil(y+h));yy++)for(let xx=Math.max(0,Math.floor(x));xx<Math.min(cv.width,Math.ceil(x+w));xx++)put(xx,yy,c);},
    beginPath(){points=[];},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},
    stroke(){
      ensure();const col=color(this.strokeStyle),r=this.lineWidth/2;
      for(let j=1;j<points.length;j++){
        const a=points[j-1],b=points[j],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;
        for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1])-r));y<Math.min(cv.height,Math.ceil(Math.max(a[1],b[1])+r));y++)
          for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0])-r));x<Math.min(cv.width,Math.ceil(Math.max(a[0],b[0])+r));x++){
            const t=Math.max(0,Math.min(1,((x+.5-a[0])*dx+(y+.5-a[1])*dy)/(l2||1)));
            if(Math.hypot(x+.5-a[0]-t*dx,y+.5-a[1]-t*dy)<=r)put(x,y,col);
          }
      }
    }
  };
  cv.getContext=()=>ctx;return cv;
}
function png(cv){
  const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;};
  function chunk(type,data){const t=Buffer.from(type),body=Buffer.concat([t,data]),n=Buffer.alloc(4),tail=Buffer.alloc(4);n.writeUInt32BE(data.length);tail.writeUInt32BE(crc(body));return Buffer.concat([n,body,tail]);}
  const header=Buffer.alloc(13);header.writeUInt32BE(cv.width,0);header.writeUInt32BE(cv.height,4);header[8]=8;header[9]=6;
  const scan=Buffer.alloc(cv.height*(cv.width*4+1));
  for(let y=0;y<cv.height;y++)Buffer.from(cv.pixels.buffer,cv.pixels.byteOffset+y*cv.width*4,cv.width*4).copy(scan,y*(cv.width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
function runtime(variant){
  const sourceDir=variant==='before'?output+'/baseline':root+'/src/js/reef3d';
  const source={};for(const name of ['board.js','region-scenery.js','world-detail.js'])source[name]=read(sourceDir+'/'+name);
  const c={THREE,console,Math,Float32Array,Uint8ClampedArray,Set,Promise,performance,innerWidth:390,R3:{q:2},REEF3D_CHUNK:16,
    REEF_WORLD_SURFACE_URL:false,document:{createElement:canvas},reefNight:()=>false,
    lagoonDone:()=>({}),townDone:()=>({}),cavesData:()=>({rules:{}}),patData:()=>({m:{}}),PAT_MASTERED:3,
    bbData:()=>({}),bbAnswered:()=>({}),lhData:()=>({s:{},m:{}}),reefPlaceFor:()=>'',LAGOON_ICON:{}};
  c.window=c;vm.createContext(c);
  vm.runInContext(read(root+'/src/js/vendor/three-gltfloader.js'),c);c.reefInstallGLTF();
  for(const f of ['reefRand','reefHash'])vm.runInContext(functionSource(read(root+'/src/js/reef-world.js'),f),c);
  vm.runInContext(read(root+'/src/js/reef3d/world-routes.js'),c);
  if(variant==='after')vm.runInContext(read(root+'/src/js/reef3d/world-surfaces.js'),c);
  for(const name of ['reef3dSpaces','reef3dAhead','reef3dPathLines','reef3dKit','reef3dRig','reef3dBand','reef3dBakeGeo','reef3dBakedMat','reef3dPieces','reef3dMerge','reef3dBakeObject'])vm.runInContext(functionSource(source['board.js'],name),c);
  for(const name of ['lagoon-stories.js','town-talks.js','caves-sounds.js','patterns-data.js','beach-data.js','light-data.js'])vm.runInContext(read(root+'/src/js/'+name),c);
  const regionSource=read(root+'/src/js/region-boards.js');
  vm.runInContext(read(root+'/src/js/region-practice.js'),c);
  vm.runInContext(regionSource.slice(0,regionSource.indexOf('  function regionBoardOpen(')),c);
  for(const name of ['regionBoardActivities','regionBoardZones'])vm.runInContext(functionSource(regionSource,name),c);
  vm.runInContext(source['region-scenery.js'],c);vm.runInContext(source['world-detail.js'],c);
  const lightScene=new THREE.Scene();lightScene.add(new THREE.HemisphereLight('#f8fff7','#73b8bd',.56),new THREE.DirectionalLight('#fff8ee',.72));
  const rig=c.reef3dRig(lightScene);
  return {c,source,rig,sourceDir};
}
function build(env,id){
  const {c,rig,source}=env,kit=c.reef3dKit(THREE,false),scene=new THREE.Scene(),bake={};
  scene.fog=new THREE.Fog('#a9e2ed',15,42);scene.background=new THREE.Color('#a9e2ed');
  if(id!=='cove'){
    const zones=c.regionBoardZones(id),spaces=c.reef3dSpaces(zones,zones.region);
    const view={kit,spaces,scene,bake,rig,region:zones.region,wrap:{classList:{add(){}}},floor:{visible:true}};
    c.regionBoardDecorate(view,{id});return {group:view.regionScenery,spaces,scene,bake,context:[]};
  }
  // A representative established profile has twelve decks: this produces the
  // production 39-stop / 46-space Cove circuit independently of old captures.
  const zones=[{id:'korean',items:Array.from({length:12},(_,i)=>({d:{id:'audit-korean-'+i},state:'ready'}))}];
  const spaces=c.reef3dSpaces(zones,null),statics=new THREE.Group();
  Object.assign(c,{spaces,region:null,night:false,scene,M:kit.M,THREE,mainN:spaces.mainN});
  const floorSection=source['board.js'].slice(source['board.js'].indexOf('    // Sea floor with soft dunes.'),source['board.js'].indexOf('    // Path: a sandy ribbon'));
  vm.runInContext(floorSection,c); // Actual dune functions and floor, no renderer.
  const taken=[];
  // This is the same board prop placement, used only for landmark clearance.
  spaces.forEach(s=>{
    if(!['deck','treasure','story'].includes(s.kind))return;
    const next=c.reef3dAhead(spaces,s.i);let side=s.x>0?-1:1;
    if(s.end)side=s.x>spaces[s.jn].x?1:-1;
    const dx=next.x-s.x,dz=next.z-s.z,len=Math.hypot(dx,dz)||1;
    taken.push([s.x-dz/len*side*2.3,s.z+dx/len*side*2.3]);
  });
  const groundY=(x,z)=>c.sandH(x,-(z-c.floorZ))-.15;
  c.reef3dCoveDetail({THREE,statics,spaces,mainN:spaces.mainN,M:kit.M,groundY,taken});
  const group=c.reef3dMerge(statics,rig,bake);
  c.reef3dBakeObject(c.floor,rig,{});
  return {group,spaces,scene,bake,context:[{kind:'reference-seabed',object:c.floor}],taken};
}
function exportWorld(env,built,variant,id){
  const dir=output+'/'+variant;fs.mkdirSync(dir,{recursive:true});
  let triangleCount=0,staticBytes=0,surfaceBytes=0,surfaceTriangles=0,meshCount=0;
  const materials=new Map(),textures=new Map(),chunks={},objects=[];
  function tex(map,surfaced){
    if(!map)return null;
    if(!textures.has(map)){
      const n=textures.size,cv=map.image;
      const t={id:n,width:cv.width,height:cv.height,repeat:map.repeat.toArray(),offset:map.offset.toArray(),wrapS:map.wrapS,wrapT:map.wrapT,encoding:map.encoding,generateMipmaps:map.generateMipmaps};
      if(surfaced){Object.assign(t,{kind:'world-surface-atlas',file:root+'/assets/world/world-surfaces.jpg',targetSize:built.bake.__reefSurface.size,width:built.bake.__reefSurface.size,height:built.bake.__reefSurface.size,placeholderSize:128,columns:4,rows:2,inset:8.5/1024,strength:.35,normalizePanels:true});}
      else if(cv.pixels){t.kind='existing-canvas-map';t.file=dir+'/'+id+'-texture-'+n+'.png';fs.writeFileSync(t.file,png(cv));}
      else t.kind='unexported-map';
      textures.set(map,t);
    }
    return textures.get(map).id;
  }
  function object(o,context){
    if(!o.isMesh)return;const g=o.geometry,surfaced=!!g.attributes.reefSurface,mat=o.material;
    assert(!Array.isArray(mat),'merged scenery should have a single material');
    if(!materials.has(mat))materials.set(mat,{id:materials.size,type:mat.type,color:mat.color.toArray(),vertexColors:mat.vertexColors,side:mat.side,transparent:mat.transparent,opacity:mat.opacity,depthWrite:mat.depthWrite,fog:mat.fog,map:tex(mat.map,surfaced),surfaceAtlas:surfaced});
    const p=g.attributes.position,world=new THREE.Vector3(),position=[];
    for(let i=0;i<p.count;i++){world.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert([world.x,world.y,world.z].every(Number.isFinite));position.push(world.x,world.y,world.z);}
    const attrs={position};for(const name of ['color','uv','reefSurface'])if(g.attributes[name])attrs[name]=Array.from(g.attributes[name].array);
    const result={name:o.name||id+'-chunk-'+objects.length,material:materials.get(mat).id,attributes:attrs,index:g.index?Array.from(g.index.array):null};
    if(context)result.context=context;
    else{
      meshCount++;const tris=(g.index?g.index.count:p.count)/3;triangleCount+=tris;
      for(const a of Object.values(g.attributes))staticBytes+=a.array.byteLength;if(g.index)staticBytes+=g.index.array.byteLength;
      if(surfaced){surfaceTriangles+=tris;surfaceBytes+=g.attributes.uv.array.byteLength+g.attributes.reefSurface.array.byteLength;}
      g.computeBoundingBox();const center=g.boundingBox.getCenter(new THREE.Vector3()),key=Math.floor(center.z/16)+','+Math.floor(center.x/16);
      (chunks[key]||(chunks[key]=new Set())).add(mat);
    }
    objects.push(result);
  }
  built.group.updateMatrixWorld(true);built.group.traverse(o=>object(o));
  for(const ref of built.context){ref.object.updateMatrixWorld(true);object(ref.object,ref.kind);}
  const perChunk={};for(const [key,set]of Object.entries(chunks))perChunk[key]={materials:set.size,surfaceMaterials:Array.from(set).filter(m=>m.map&&Array.from(textures.values()).find(t=>t.id===materials.get(m).map)?.kind==='world-surface-atlas').length};
  const stats={id,variant,mainStops:built.spaces.mainN,spaces:built.spaces.length,triangles:triangleCount,meshBins:meshCount,uniqueMaterials:new Set(objects.filter(o=>!o.context).map(o=>o.material)).size,staticBytes,surfaceTriangles,surfaceAttributeBytes:surfaceBytes,textureCount:textures.size,surfaceMapCount:Array.from(textures.values()).filter(t=>t.kind==='world-surface-atlas').length,maxAtlasBinsPerChunk:Math.max(0,...Object.values(perChunk).map(c=>c.surfaceMaterials)),chunks:perChunk};
  assert(stats.surfaceMapCount<=1,'one scenery atlas map per board');
  assert(stats.maxAtlasBinsPerChunk<=2,'at most front/double-sided atlas bins per chunk');
  assert.equal(stats.surfaceAttributeBytes,stats.surfaceTriangles*36,'surface buffer budget is 36 bytes per triangle');
  const hashes={};for(const [name,source]of Object.entries(env.source))hashes[name]=crypto.createHash('sha256').update(source).digest('hex');
  const result={schema:'reef-static-world-v1',coordinateSystem:'Three.js right-handed Y-up; all exported positions already in world space',scope:id==='cove'?'CoveDetail only; reference seabed excluded from stats':'regionBoardDecorate only; procedural reef3dKit fallback props; no imported GLTFs',variant,id,sourceDir:env.sourceDir,sourceHashes:hashes,stats,
    materialRules:{vertexColor:'baked pigment and light; multiply material color',worldAtlas:'cell=(kind%4,1-floor(kind/4)); uv=cell*(.25,.5)+8.5/1024+fract(uv)*((.25,.5)-17/1024); color *= 1 + (grayscale(texture)/panelMean - 1) * headroomLimitedStrength(.35)',legacyMap:'ordinary repeating UV map; multiply color'},
    spaces:built.spaces.map(s=>({i:s.i,x:s.x,y:s.y||0,z:s.z,kind:s.kind,links:s.links,branch:s.branch,jn:s.jn})),taken:built.taken||[],background:built.scene.background.toArray(),fog:{color:built.scene.fog.color.toArray(),near:built.scene.fog.near,far:built.scene.fog.far},materials:Array.from(materials.values()),textures:Array.from(textures.values()),objects};
  fs.writeFileSync(dir+'/'+id+'.json',JSON.stringify(result));
  fs.writeFileSync(dir+'/'+id+'-stats.json',JSON.stringify(stats,null,2));
  env.c.reef3dSurfaceDispose?.(built.bake);
  return stats;
}
const results=[];
for(const variant of variants){
  const env=runtime(variant);
  for(const id of boards){const t=performance.now(),built=build(env,id),stats=exportWorld(env,built,variant,id);stats.cpuBuildAndExportMs=Math.round(performance.now()-t);results.push(stats);console.log(variant+' '+id+': '+stats.triangles+' triangles, '+stats.meshBins+' merged bins, '+stats.staticBytes+' static bytes, '+stats.surfaceAttributeBytes+' surface bytes');}
}
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/audit-'+variants.join('-')+'.json',JSON.stringify({scope:'CPU-only actual source scenery construction and merge, not whole-game draw calls or device FPS',results},null,2));
