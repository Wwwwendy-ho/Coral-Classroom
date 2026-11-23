/* Sample real 3D poses at fixed intervals. Encoding these frames does not
   depend on a cloud review browser maintaining the movie's playback rate. */
const {chromium}=require('../check/node_modules/playwright');
const fs=require('fs'),path=require('path');
const out=process.argv[2]||'/workspace/work/cove-world-review/motion-frames';
const url=process.env.SHELLY_PREVIEW_URL||'http://127.0.0.1:8870/build/shelly-preview.html';
const clips=[['Idle',2.8,'face'],['Swim',2,'quarter'],['Happy',2,'face'],['Curious',2.5,'face'],['Celebrate',3,'quarter'],['Turn',2,'quarter']];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:600,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__shellyPreview?.info().ready);
  const metadata={fps:24,size:[512,512],source:'Actual game GLB, deterministic 3D pose samples',clips:[]};let frame=0;
  for(const [name,duration,view] of clips){
   const start=frame,count=Math.round(duration*metadata.fps);
   for(let i=0;i<count;i++){
    const png=await page.evaluate(({name,time,view})=>window.__shellyPreview.sample(name,time,view,512,512),{name,time:i/metadata.fps,view});
    fs.writeFileSync(path.join(out,'frame-'+String(frame++).padStart(4,'0')+'.png'),Buffer.from(png.split(',')[1],'base64'));
   }
   metadata.clips.push({name,view,start,end:frame-1,duration:count/metadata.fps});console.log(name+': '+count+' rendered poses');
  }
  metadata.frames=frame;metadata.pageErrors=errors;
  fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(metadata,null,2));
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Completed '+frame+' fixed-time frames.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
