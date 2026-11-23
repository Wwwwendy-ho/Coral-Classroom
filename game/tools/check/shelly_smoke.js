/* Functional browser checks for the bounded Shelly Storybook prototype.
   Usage: node tools/check/shelly_smoke.js [port]; SHELLY_QA_DIR selects evidence output. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const port = +process.argv[2] || 8855;
const out = process.env.SHELLY_QA_DIR || '/workspace/work/shelly-prototype/qa';
const base = 'http://localhost:' + port;
const errors = [];
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, passed: !!ok, detail: detail || '' });
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) throw new Error(name + (detail ? ': ' + detail : ''));
}

async function enterAt(page, url, profile, wait) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const splash = await page.$('.cc-splash');
  if (splash) {
    await splash.click();
    await page.waitForSelector('.cc-splash', { state: 'detached', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  if (profile) {
    await page.click('[data-profile="' + profile + '"]');
    await page.waitForTimeout(1200);
    const q = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+)\s*([×x+−\-÷])\s*(\d+)\s*=/);
      return m && [m[1], m[2], m[3]];
    });
    if (q) {
      const a = +q[0], b = +q[2], op = q[1];
      const ans = String(op === '×' || op === 'x' ? a * b : op === '+' ? a + b : op === '÷' ? a / b : a - b);
      for (const d of ans) await page.locator('button', { hasText: new RegExp('^' + d + '$') }).first().click();
      await page.locator('button', { hasText: /^OK$/ }).first().click();
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(wait || 7000);
  }
  await page.waitForFunction(() => {
    const v = window.__reef3dView && window.__reef3dView();
    return v && v.frameN > 5 && !v.flyIn && !v.moving;
  }, null, { timeout: 90000 });
}

async function adapterSummary(page) {
  return page.evaluate(() => {
    const { v, h } = window.__qaGetShelly();
    const guideMeshes = (() => { let n=0; if(v && v.guide) v.guide.traverse(o=>{if(o.isMesh)n++;}); return n; })();
    if (!h) return { available: false, night:!!(v && v.night), quality:window.__reef3dInfo && window.__reef3dInfo(), guideMeshes };
    const clips = Object.keys(h.clips || {});
    const bones = [];
    if (h.root && h.root.traverse) h.root.traverse(o => { if (o.isBone) bones.push(o); });
    const names = Object.keys(v.guide.userData.parts || {});
    return { available: true, clipNames: clips, bones: bones.length, anchorNames: names,
      quality: window.__reef3dInfo && window.__reef3dInfo(), night: v.night,
      rootName: h.root && h.root.name, guideMeshes };
  });
}

async function poseSample(page) {
  return page.evaluate(() => {
    const { h } = window.__qaGetShelly();
    const out = [];
    if (h && h.root) h.root.traverse(o => {
      if (o.isBone) out.push([o.name, ...o.position.toArray(), ...o.quaternion.toArray()]);
    });
    return out;
  });
}

function poseDistance(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return 0;
  let d = 0;
  for (let i = 0; i < a.length; i++) for (let j = 1; j < a[i].length; j++) d += Math.abs(a[i][j] - b[i][j]);
  return d;
}

async function run() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', req => {
      if (/shelly(?:-view)?\.glb/i.test(req.url()) && !/aborted/i.test(req.failure() && req.failure().errorText || '')) errors.push('Shelly request failed: ' + req.url());
    });
    await page.addInitScript(() => {
      localStorage.setItem('cc-tour-off', '1');
      localStorage.setItem('cc-3dq3', '3');
      localStorage.setItem('cc-3dq-lock', '1');
      window.__qaGetShelly = () => {
        const v = window.__reef3dView && window.__reef3dView();
        return { v, h:v && v.guide && v.guide.userData && v.guide.userData.shelly };
      };
    });

    // Control path: the prototype query is opt-in.
    await enterAt(page, base + '/', 'wendy', 7000);
    let classic = await page.evaluate(() => {
      const v = window.__reef3dView();
      return { view: !!v, model: !!(v.guide.userData && v.guide.userData.shelly), meshes: (() => { let n=0; v.guide.traverse(o=>{if(o.isMesh)n++;}); return n; })() };
    });
    check('default route keeps classic Shelly', classic.view && !classic.model && classic.meshes > 0, JSON.stringify(classic));

    // Reload the app into a fresh profile picker with the opt-in prototype flag.
    await enterAt(page, base + '/?shelly=storybook', 'wendy', 7000);
    let summary = await adapterSummary(page);
    check('storybook flag loads the rigged hero adapter', summary.available && summary.bones > 0, JSON.stringify(summary));
    check('six authored clips are exposed', summary.clipNames && summary.clipNames.length === 6, JSON.stringify(summary.clipNames));
    check('quality tier 3 remains selected', summary.quality && (summary.quality.tier === 3 || summary.quality.q === 3 || summary.quality === 3), JSON.stringify(summary.quality));

    // Drive the mixer directly for asset coverage: each sample reads actual animated bones.
    // Runtime behavior is covered separately below through emotes and route movement.
    const clipEvidence = [];
    for (const clip of summary.clipNames) {
      const delta = await page.evaluate(name => {
        const h = window.__qaGetShelly().h, bones=[];
        h.root.traverse(o => { if(o.isBone) bones.push(o); });
        const sample=()=>bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
        h.mixer.stopAllAction(); h.action=null; h.current=null;
        const before=sample(); h.play(name); h.action.setEffectiveWeight(1); h.mixer.update(.36);
        const after=sample(); let d=0;
        for(let i=0;i<before.length;i++) for(let j=0;j<before[i].length;j++) d+=Math.abs(before[i][j]-after[i][j]);
        return d;
      }, clip);
      clipEvidence.push({ clip, poseDelta: delta });
      check('clip changes the live skeleton: ' + clip, delta > 0.003, 'pose delta ' + delta.toFixed(5));
    }
    const facialEvidence=await page.evaluate(() => {
      const h=window.__qaGetShelly().h, out={};
      ['Idle','Happy','Curious','Celebrate'].forEach(name=>{
        const tracks=(h.clips[name].tracks||[]).filter(t=>/Eye[LR]/i.test(t.name));
        const values=tracks.flatMap(t=>Array.from(t.values));
        out[name]={tracks:tracks.map(t=>t.name),range:values.length?Math.max(...values)-Math.min(...values):0};
      });
      return out;
    });
    check('blink and expressive eye animation are authored', ['Idle','Happy','Curious','Celebrate'].every(n=>facialEvidence[n].tracks.length&&facialEvidence[n].range>0.05), JSON.stringify(facialEvidence));

    // Sample the adapter's own action weights during a real clip switch.
    const transition = await page.evaluate(async clips => {
      const h = window.__qaGetShelly().h;
      h.play(clips[0]);
      await new Promise(r => setTimeout(r, 650));
      h.play(clips[1]);
      await new Promise(r => setTimeout(r, 90));
      const weight = a => a && a.getEffectiveWeight ? a.getEffectiveWeight() : a && a.weight;
      return { from: weight(h.actions[clips[0]]), to: weight(h.actions[clips[1]]) };
    }, summary.clipNames);
    check('clip switch crossfades the active mixer actions', transition.from > 0 && transition.to > 0, JSON.stringify(transition));

    // Exercise the actual game emote bridge to authored clips.
    const emoteEvidence=[];
    for(const [emote,expected] of [['hello','Happy'],['look','Curious'],['dance','Celebrate'],['bonk','Turn']]){
      await page.evaluate(name=>window.__reef3dEmote(name),emote);
      await page.waitForFunction(name=>window.__reef3dView().guide.userData.shelly.current===name,expected,{timeout:5000});
      emoteEvidence.push({emote,clip:expected});
      check('game emote uses authored clip: '+emote,await page.evaluate(name=>window.__reef3dView().guide.userData.shelly.current===name,expected),expected);
      await page.waitForTimeout(250);
    }

    // Check real-world attachment transforms as the head animates.
    const anchors = await page.evaluate(async () => {
      const h = window.__qaGetShelly().h, parts = window.__reef3dView().guide.userData.parts || {};
      const hat = parts.hat, mouth = parts.mouth;
      if (!hat || !mouth || !hat.getWorldPosition || !mouth.getWorldPosition) return { valid:false, names:Object.keys(parts) };
      const p = new window.THREE.Vector3();
      const world = o => { o.updateWorldMatrix(true,false); return o.getWorldPosition(p.clone()).toArray(); };
      const h0=world(hat), m0=world(mouth);
      h.mixer.stopAllAction(); h.action=null; h.current=null; h.play('Curious'); h.action.setEffectiveWeight(1); h.mixer.update(.36);
      await new Promise(r=>setTimeout(r,700));
      return { valid:true, hatDelta:world(hat).reduce((s,x,i)=>s+Math.abs(x-h0[i]),0), mouthDelta:world(mouth).reduce((s,x,i)=>s+Math.abs(x-m0[i]),0) };
    });
    check('hat and mouth anchors follow the animated head in world space', anchors.valid && anchors.hatDelta > 0.001 && anchors.mouthDelta > 0.001, JSON.stringify(anchors));

    // Route-only movement follows the game path and exercises its Swim clip without rewards or lessons.
    const routeStart = await page.evaluate(() => {
      const v=window.__reef3dView(); return {at:v.at,shells:+v.wrap.querySelector('.r3-hud-shells b').textContent,
        pearls:+v.wrap.querySelector('.r3-hud-pearls b').textContent,board:JSON.stringify(window.__reefBoard())};
    });
    const target = await page.evaluate(() => {
      const v=window.__reef3dView();
      return v.spaces.find(s=>s.i>v.at&&s.kind==='plain')?.i ?? v.spaces.find(s=>s.i!==v.at)?.i;
    });
    check('a nearby route destination is available', Number.isInteger(target), String(target));
    await page.evaluate(i => { window.__qaSwimSample=null; window.__reef3dTravel(i); },target);
    const routeStarted = await page.evaluate(() => window.__reef3dView().moving);
    check('route helper starts actual guide travel',routeStarted,'target '+target);
    await page.waitForFunction(() => {
      const v=window.__reef3dView(),s=v.guide.userData.shelly;
      if(v.moving&&s.current==='Swim'){
        window.__qaSwimSample={moving:v.moving,clip:s.current,position:v.guide.position.toArray(),at:v.at};
        return true;
      }
      return false;
    }, null, {timeout:10000});
    const routeMotion = await page.evaluate(() => window.__qaSwimSample);
    check('travel uses authored swim animation',routeMotion.moving&&routeMotion.clip==='Swim',JSON.stringify(routeMotion));
    await page.waitForFunction(i=>{const v=window.__reef3dView();return v.at===i&&!v.moving;},target,{timeout:90000});
    const routeEnd = await page.evaluate(() => {const v=window.__reef3dView();return {at:v.at,shells:+v.wrap.querySelector('.r3-hud-shells b').textContent,
      pearls:+v.wrap.querySelector('.r3-hud-pearls b').textContent,board:JSON.stringify(window.__reefBoard())};});
    check('route glide ends at tile without changing rewards or progress',routeEnd.at===target&&routeEnd.shells===routeStart.shells&&routeEnd.pearls===routeStart.pearls&&routeEnd.board===routeStart.board,JSON.stringify({routeStart,target,routeMotion,routeEnd}));

    // Calm Motion is set through the product UI and verified by the real pose samples.
    await page.click('.r3-menubtn');
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await page.waitForSelector('[data-act="toggle-calm-motion"]');
    const calmWasOn = await page.locator('[data-act="toggle-calm-motion"]').evaluate(el => el.classList.contains('active'));
    if (!calmWasOn) await page.click('[data-act="toggle-calm-motion"]');
    await page.click('[data-act="exit-settings"]');
    await page.waitForFunction(() => {
      const v=window.__reef3dView(), s=v&&v.guide.userData.shelly;
      return s && s.calm && s.action && s.action.paused;
    }, null, { timeout:15000 });
    await page.waitForTimeout(250);
    const calmStart = await poseSample(page);
    await page.waitForTimeout(1800);
    const calmEnd = await poseSample(page);
    const calmDelta = poseDistance(calmStart, calmEnd);
    check('Calm Motion keeps Shelly in a quiet pose', calmDelta < 0.015, 'pose delta ' + calmDelta.toFixed(5));

    // Day/night replacement and return exercise adapter disposal/rebuild without changing quality.
    await page.evaluate(() => document.querySelector('[data-r3-theme]').click());
    await page.waitForFunction(() => { const v=window.__reef3dView(); return v && v.night && v.frameN>5 && !v.themeFx && !v.themeIn && !document.querySelector('.r3-cycle'); }, null, { timeout:90000 });
    let night = await adapterSummary(page);
    check('night rebuild keeps the night guide available', !night.available && night.guideMeshes>0 && night.night, JSON.stringify(night));
    await page.evaluate(() => document.querySelector('[data-r3-theme]').click());
    await page.waitForFunction(() => { const v=window.__reef3dView(); return v && !v.night && v.frameN>5 && !v.themeFx && !v.themeIn && !document.querySelector('.r3-cycle'); }, null, { timeout:90000 });
    summary = await adapterSummary(page);
    check('day rebuild preserves a working Shelly adapter', summary.available && summary.bones>0 && !summary.night, JSON.stringify(summary));
    check('day/night rebuild keeps quality tier 3', summary.quality && (summary.quality.tier===3 || summary.quality.q===3 || summary.quality===3), JSON.stringify(summary.quality));

    // Wait until the service worker has the exact requested model response, then reload offline.
    const cacheEvidence = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const keys=await caches.keys(), urls=[];
      for(const key of keys){ const c=await caches.open(key); for(const req of await c.keys()) if(/shelly(?:-view)?\.glb/i.test(req.url)) urls.push({cache:key,url:req.url}); }
      return { controller:!!navigator.serviceWorker.controller, urls };
    });
    check('service worker has cached the Shelly GLB', cacheEvidence.urls.length>0, JSON.stringify(cacheEvidence));
    await context.setOffline(true);
    await enterAt(page, base + '/?shelly=storybook', 'wendy', 7000);
    check('offline reload still loads Storybook Shelly', await page.evaluate(() => !!window.__qaGetShelly().h), 'query flag retained');
    await context.setOffline(false);

    // Separate context: fail only the prototype GLB request and ensure classic guide stays functional.
    const fallbackContext=await browser.newContext({ viewport:{width:375,height:812}, reducedMotion:'no-preference' });
    const fp=await fallbackContext.newPage();
    fp.setDefaultTimeout(90000);
    const fallbackErrors=[]; fp.on('pageerror',e=>fallbackErrors.push(e.message));
    await fp.addInitScript(() => { localStorage.setItem('cc-tour-off','1'); localStorage.setItem('cc-3dq3','3'); localStorage.setItem('cc-3dq-lock','1'); window.__qaGetShelly=()=>{const v=window.__reef3dView&&window.__reef3dView();return {v,h:v&&v.guide&&v.guide.userData&&v.guide.userData.shelly};}; });
    await fp.route(/shelly(?:-view)?\.glb/i, route=>route.abort());
    await enterAt(fp, base+'/?shelly=storybook', 'wendy', 7000);
    const fallbackState=await fp.evaluate(() => { const v=window.__reef3dView(); let meshes=0; v.guide.traverse(o=>{if(o.isMesh)meshes++;}); return { prototype:!!(v.guide.userData&&v.guide.userData.shelly), meshes, board:!!document.querySelector('.r3 canvas') }; });
    check('failed GLB request leaves classic Shelly and board usable', !fallbackState.prototype && fallbackState.meshes>0 && fallbackState.board, JSON.stringify(fallbackState));
    check('fallback context has no uncaught page errors', fallbackErrors.length===0, fallbackErrors.join(' / '));
    await fallbackContext.close();

    check('prototype run has no uncaught browser errors', errors.length===0, errors.join(' / '));
    fs.writeFileSync(path.join(out,'shelly-smoke.json'), JSON.stringify({ date:new Date().toISOString(), port, classic, adapter:summary, clipEvidence, facialEvidence, transition, emoteEvidence, anchors, calmDelta, route:{routeStart,target,routeMotion,routeEnd}, night, cacheEvidence, fallbackState, pageErrors:errors, checks }, null, 2));
    console.log('Shelly prototype smoke passed; evidence ' + out);
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close();
  }
}

run().catch(e => {
  try { fs.writeFileSync(path.join(out,'shelly-smoke-failure.json'), JSON.stringify({ error:e.stack || String(e), pageErrors:errors, checks }, null, 2)); } catch(_) {}
  console.error(e);
  process.exitCode=1;
});
