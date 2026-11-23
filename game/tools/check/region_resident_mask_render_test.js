// Run with: node tools/check/region_resident_mask_render_test.js
// Exercise the actual Three r128/WebGL shader, including black mask pixels on
// one OPAQUE texture, rather than checking only the inserted shader source.
const assert=require('assert'),fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.setContent('<canvas id="render" width="64" height="32"></canvas>');
  await page.addScriptTag({content:fs.readFileSync('three.min.js','utf8')});
  await page.addScriptTag({content:fs.readFileSync('src/js/reef3d/resident-models.js','utf8')});
  const result=await page.evaluate(()=>{
   const T=window.THREE;
   const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),alpha:true,preserveDrawingBuffer:true});
   renderer.setSize(64,32,false);renderer.outputEncoding=T.LinearEncoding;
   const texture=new T.DataTexture(new Uint8Array([160,65,80,255, 80,32,40,255, 35,100,190,0, 235,225,210,0]),4,1,T.RGBAFormat);
   texture.encoding=T.sRGBEncoding;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.needsUpdate=true;
   const material=new T.MeshBasicMaterial({map:texture});material.userData.residentSkinMask='baseColorAlpha';
   const mesh=new T.Mesh(new T.PlaneGeometry(2,2),material),skin={meshes:[],mode:'natural'};
   const owner={},view={regionGround:'#b8aa94'},state={entry:{skinMask:'baseColorAlpha'},target:{skin}};
   const accepted=regionResidentPrepare(view,state,{scene:mesh},owner);
   const scene=new T.Scene();scene.add(mesh);const camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;
   const ctx=renderer.getContext();
   function snapshot(){
    renderer.render(scene,camera);const pixels=[];
    for(const x of [8,24,40,56]){const p=new Uint8Array(4);ctx.readPixels(x,16,1,1,ctx.RGBA,ctx.UNSIGNED_BYTE,p);pixels.push(Array.from(p));}
    return pixels;
   }
   const natural=snapshot();owner.skinAdapter.mesh.attribute.array.set([1,0]);const camouflage=snapshot();
   owner.skinAdapter.mesh.attribute.array.set([0,1]);const display=snapshot();
   regionResidentSkinRelease(owner);renderer.dispose();return {accepted,natural,camouflage,display,adapters:skin.meshes.length};
  });
  assert.deepEqual(errors,[],'shader compiles and renders without WebGL errors');assert(result.accepted);
  const expected=[[160,65,80],[80,32,40],[35,100,190],[235,225,210]];
  for(let i=0;i<4;i++)for(let channel=0;channel<3;channel++)assert(Math.abs(result.natural[i][channel]-expected[i][channel])<=2,'natural texture colours survive encoding');
  for(const mode of ['natural','camouflage','display'])for(const pixel of result[mode])assert.equal(pixel[3],255,'skin-mask alpha never makes opaque appearance transparent');
  for(const mode of ['camouflage','display']){
   for(const i of [2,3])assert.deepEqual(result[mode][i],result.natural[i],'clothing and sucker pixels stay unchanged');
   assert(result[mode][0].some((value,i)=>i<3 && Math.abs(value-result.natural[0][i])>25),'skin pigment visibly changes');
   assert(result[mode][0].slice(0,3).reduce((a,b)=>a+b)>result[mode][1].slice(0,3).reduce((a,b)=>a+b),'painted dark/light shading survives pigment change');
  }
  assert.equal(result.adapters,0,'adapter ownership released');
  console.log('Passed: actual WebGL skin-mask shader, natural colour encoding, skin pigment, opaque costume/sucker protection, painted shading and adapter cleanup.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
