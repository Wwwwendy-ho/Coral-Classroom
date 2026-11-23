/* Walk to regional characters, enter their real lessons, and browse their shop.
   Usage: node tools/check/npc_worlds_smoke.js [port]; NPC_QA_DIR selects screenshots. */
const { chromium } = require('playwright');
const { enter } = require('./steps');
const fs = require('fs');
const path = require('path');
const os = require('os');
const port = +process.argv[2] || 8845;
const out = process.env.NPC_QA_DIR || path.join(os.tmpdir(), 'coral-npc-qa');
const regions = [['town','town'], ['lagoon','lagoon'], ['caves','caves'], ['patterns','reef'], ['beach','beach'], ['light','light'], ['captain','deck']];
const backs = { town:'[data-act="tw-back"]', lagoon:'[data-act="lg-back"]', caves:'[data-act="cv-back"]', patterns:'[data-act="pr-back"]', beach:'[data-act="bb-back"]', light:'[data-act="lh-back"]', captain:'[data-rb-board]' };
function check(name, result, detail){
  console.log((result ? 'ok    ' : 'FAIL  ') + name + (detail ? '  '+detail : ''));
  if(!result) throw Error(name);
}
async function board(p, id){
  await p.waitForFunction(id => { const v=window.__regionBoardView(); const scene=window.__reef3dView(); return v && v.region===id && v.has3d && scene.frameN>=3 && scene.w===innerWidth && scene.h===innerHeight && !document.querySelector('.region-travel'); }, id);
}
async function openRegion(p,id,sea){
  await p.click('[data-r3-map]');
  await p.click('[data-sea-tab="sea"]');
  await p.click('[data-sea="'+sea+'"]');
  await p.click('[data-sea-go="'+sea+'"]');
  await board(p,id);
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const p=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
    p.setDefaultTimeout(45000);
    const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{localStorage.setItem('cc-tour-off','1');localStorage.setItem('cc-3dq3','3');});
    await enter(p,'wendy',{port,wait:1200});
    for(const [id,sea] of regions.filter(r=>!process.env.NPC_QA_REGIONS || process.env.NPC_QA_REGIONS.split(',').includes(r[0]))){
      await openRegion(p,id,sea);
      const initial=await p.evaluate(()=>{
        const v=window.__reef3dView(), people=v.regionPeople;
        const target=v.region.id==='town'?people.towns[0]:{object:people.marker,space:people.markerSpace};
        const position=target.object.position.clone(); position.y+=1;
        position.project(v.cam);
        const button=v.region.id==='town'?people.towns[0].button:people.practice;
        return {towns:people.towns.length, merchant:!!people.actor, host:!!target.object,
          species:v.region.id==='town'?people.towns.map(t=>t.object.userData.species):[people.marker.userData.species],
          label:button.getAttribute('aria-label'),
          target:target.space.i, activity:target.space.item.d.regionActivity.id,
          x:(position.x+1)*v.wrap.clientWidth/2,y:(1-position.y)*v.wrap.clientHeight/2,
          shells:document.querySelector('.r3-hud-shells b').textContent};
      });
      check(id+': world contains its merchant and learning character',initial.merchant && initial.host);
      if(id==='town') check('Town has all eight townsfolk',initial.towns===8);
      const marine=new Set(['seahorse','sea otter','octopus','squid','ray','whale','shrimp','seal','sea turtle','nautilus','cuttlefish','hermit crab','jellyfish','walrus']);
      check(id+': every resident is a marine organism',initial.species.every(s=>marine.has(s)),initial.species.join(', '));
      if(initial.x<18 || initial.x>357 || initial.y<205 || initial.y>710){
        // Farther stops can be behind the title in the opening view. The local
        // map brings the player to that place before they tap the resident.
        await p.click('[data-r3-map]');
        await p.click('[data-r3-go="'+initial.target+'"]');
        await p.waitForFunction(i=>{const v=window.__reef3dView();return v.at===i&&!v.moving&&!document.querySelector('.r3-map');},initial.target);
        await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        const pos=await p.evaluate(()=>{
          const v=window.__reef3dView(), person=v.region.id==='town'?v.regionPeople.towns[0].object:v.regionPeople.marker;
          const pos=person.position.clone();pos.y+=1;pos.project(v.cam);
          return {x:(pos.x+1)*v.wrap.clientWidth/2,y:(1-pos.y)*v.wrap.clientHeight/2};
        });
        initial.x=pos.x;initial.y=pos.y;
      }
      check(id+': learning character is visible from its stop',initial.x>0&&initial.x<375&&initial.y>104&&initial.y<710,JSON.stringify({x:initial.x,y:initial.y}));
      // Click the character's visible mesh, rather than invoking a game helper.
      await p.screenshot({path:path.join(out,id+'-before-talk-phone.png')});
      const residentButton=p.getByRole('button',{name:initial.label,exact:true});
      if(await residentButton.isVisible()) await residentButton.click();
      else await p.mouse.click(initial.x,initial.y);
      try { await p.waitForSelector('.r3-person-panel'); }
      catch(e){
        console.log('NPC click diagnostic',await p.evaluate(({x,y})=>{
          const v=window.__reef3dView(), box=v.renderer.domElement.getBoundingClientRect(), ray=new window.THREE.Raycaster();
          ray.setFromCamera(new window.THREE.Vector2((x-box.left)/box.width*2-1,-((y-box.top)/box.height)*2+1),v.cam);
          const el=document.elementFromPoint(x,y);
          return {at:v.at,moving:!!v.moving,dice:!!v.dice,leaving:!!v.leaving,element:el&&el.outerHTML.slice(0,180),hits:ray.intersectObjects(v.hitables,true).slice(0,5).map(h=>({data:h.object.userData,distance:h.distance}))};
        },initial));
        throw e;
      }
      check(id+': player walks to the character before talking',await p.evaluate(i=>window.__reef3dView().at===i,initial.target));
      check(id+': greeting frames the actual 3D resident',await p.evaluate(()=>{const v=window.__reef3dView();window.__qaNpcView=v;window.__qaNpcRenderer=v.renderer;window.__qaNpcActor=v.encounter&&v.encounter.actor;return !!window.__qaNpcActor&&v.encounter.phase==='intro';}));
      check(id+': greeting does not substitute a flat portrait',await p.locator('.r3-person-panel svg[role="img"]').isHidden());
      await p.screenshot({path:path.join(out,id+'-greeting-phone.png')});
      await p.click('[data-person-practice]');
      await p.waitForFunction(()=>!document.querySelector('.rb-root canvas'));
      if(id==='town'){
        await p.waitForSelector('.tw-character[data-person-id="cafe"]',{state:'attached'});
        check('Same 3D cafe owner and renderer stay through Korean dialogue',await p.evaluate(()=>{const v=window.__reef3dView();return v===window.__qaNpcView&&v.renderer===window.__qaNpcRenderer&&v.encounter&&v.encounter.actor===window.__qaNpcActor&&v.encounter.phase==='lesson'&&document.querySelector('.rpg-stage-host canvas');}));
        await p.click('[data-tw-en]');
        check('3D cafe owner survives a direct conversation redraw',await p.evaluate(()=>{const v=window.__reef3dView();return v===window.__qaNpcView&&v.encounter&&v.encounter.actor===window.__qaNpcActor&&document.querySelector('.rpg-stage-host canvas');}));
      }else if(id!=='captain'){
        await p.waitForSelector('.r3-person-lesson',{state:'attached'});
        check(id+': same 3D host accompanies the lesson',await p.evaluate(()=>{const v=window.__reef3dView();return v===window.__qaNpcView&&v.renderer===window.__qaNpcRenderer&&v.encounter&&v.encounter.actor===window.__qaNpcActor&&document.querySelector('.rpg-stage-host canvas');}));
      }else check('Captain introduces the real voyage dashboard',await p.locator('.cd-tabs').count()===1);
      await p.screenshot({path:path.join(out,id+'-lesson-phone.png')});
      await p.click(backs[id]);
      await board(p,id);
      await p.waitForTimeout(800);
      check(id+': merely meeting or leaving a lesson awards no shells',await p.locator('.r3-hud-shells b').textContent()===initial.shells);
      await p.click('.r3-person-guide');
      await p.waitForSelector('.r3-person-panel');
      check(id+': merchant greeting shows the 3D Bok',await p.evaluate(()=>{const v=window.__reef3dView();return v.encounter&&v.encounter.actor===v.regionPeople.actor;}));
      check(id+': player reaches the actual shop stand',await p.evaluate(()=>{const v=window.__reef3dView();return v.at===v.regionPeople.shop.i;}));
      await p.click('[data-person-shop]');
      await p.waitForSelector('.r3-shop');
      check(id+': goods and merchant stay together',await p.locator('.r3-shop [data-buy]').count()===5 && await p.evaluate(()=>{const v=window.__reef3dView();return v.encounter&&v.encounter.actor===v.regionPeople.actor;}));
      check(id+': region navigation does not cover the shopkeeper',await p.locator('.rb-title').isHidden());
      await p.screenshot({path:path.join(out,id+'-shop-phone.png')});
      await p.click('.r3-shop [data-done]');
      check(id+': closing the shop clears its dialog',await p.locator('.r3-panel').count()===0);
      check(id+': phone page does not overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    check('No uncaught browser errors',errors.length===0,errors.join(' / '));
    console.log('NPC world interaction QA passed; screenshots '+out);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
