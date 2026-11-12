/* Browser QA for the seven shared 3D region boards.
   Captures day and night at phone/tablet portrait and landscape sizes. The interaction checks run once per
   region; Coral Cove is opened separately as a regression baseline.
   Usage: node tools/check/region_boards_smoke.js [port]
   Set REGION_QA_DIR to choose the screenshot directory (defaults to the OS temp directory). */
const { chromium } = require('playwright');
const { enter } = require('./steps');
const fs = require('fs');
const path = require('path');
const os = require('os');

const port = +process.argv[2] || 8831;
const out = process.env.REGION_QA_DIR || path.join(os.tmpdir(), 'coral-region-qa');
const sizes = [
  { name:'phone-portrait', width:375, height:812 },
  { name:'phone-landscape', width:812, height:375 },
  { name:'tablet-portrait', width:768, height:1024 },
  { name:'tablet-landscape', width:1024, height:768 }
];
const regions = [
  { id:'lagoon', sea:'lagoon' }, { id:'town', sea:'town' }, { id:'caves', sea:'caves' },
  { id:'patterns', sea:'reef' }, { id:'beach', sea:'beach' }, { id:'light', sea:'light' }, { id:'captain', sea:'deck' }
];
const selectedRegions = process.env.REGION_QA_REGIONS ? regions.filter(r => process.env.REGION_QA_REGIONS.split(',').includes(r.id)) : regions;
const captures = process.env.REGION_QA_CAPTURES !== '0';
const tracks = regions.map(r => 'region-' + r.id + '-song.mp3');
const neighbor = { lagoon:'town', town:'lagoon', caves:'patterns', patterns:'caves', beach:'patterns', light:'beach', captain:'lagoon' };
const listSelectors = { lagoon:'[data-lg-open]', town:'[data-tw-open]', caves:'[data-cv-go]', patterns:'[data-pr-open], .pr-pattern', beach:'[data-bb-open]', light:'[data-lh-sign], [data-lh-manner]', captain:'.cd-leg, [data-cd-tab]' };
let failures = 0;
function check(name, ok, detail){
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? '  ' + detail : ''));
  if(!ok) failures++;
}
async function stable(p){
  await p.waitForFunction(() => {
    const v = window.__regionBoardView && window.__regionBoardView();
    return v && v.mode === 'board' && v.has3d && document.querySelector('.rb-root canvas');
  }, null, { timeout:30000 });
}
async function openRegion(p, r){
  await p.click('[data-r3-map]');
  await p.waitForSelector('.r3-map');
  await p.click('.r3-map-tab[data-sea-tab="sea"]');
  await p.click('.r3-sea-isle[data-sea="' + r.sea + '"]');
  await p.click('[data-sea-go="' + r.sea + '"]');
  await stable(p);
}
async function overflow(p){
  return p.evaluate(() => {
    const d = document.documentElement, b = document.body, root = document.querySelector('.rb-root');
    const sw = Math.max(d.scrollWidth, b.scrollWidth);
    return { page:sw <= d.clientWidth + 1, board:!root || root.scrollWidth <= root.clientWidth + 1,
      width:d.clientWidth, scroll:sw };
  });
}
async function themeNight(p, desired){
  const night = await p.evaluate(() => { const v = window.__reef3dView && window.__reef3dView(); return !!(v && v.night); });
  if(night !== desired){
    await p.click('.r3-menubtn');
    await p.click('.r3-menu-row:has-text("' + (desired ? 'Night view' : 'Day view') + '")');
    await p.waitForFunction(want => {
      const b = window.__regionBoardView && window.__regionBoardView(), v = window.__reef3dView && window.__reef3dView();
      return b && b.mode === 'board' && v && !!v.night === want && !document.querySelector('.r3-cycle');
    }, desired, { timeout:20000 });
  }
}
async function noSavedPin(p){
  return p.evaluate(() => !Object.keys(localStorage).some(k => /pin|owner.?gate/i.test(k)) &&
    !document.querySelector('.reef-gate, #clibPin, #adultGateInput'));
}
async function musicTarget(p){
  return p.evaluate(() => { const m = window.__reefMusicState && window.__reefMusicState(); return m && m.target && m.target.name; });
}

(async () => {
  fs.mkdirSync(out, { recursive:true });
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });

  // Cove remains the original reef board and retains its guide, crab, models, and 3D renderer.
  let context = await browser.newContext({ viewport:sizes[0], colorScheme:'light', reducedMotion:'reduce' });
  await context.addInitScript(() => { localStorage.setItem('cc-tour-off','1'); localStorage.setItem('cc-3dq3','3'); });
  let p = await context.newPage(); p.setDefaultTimeout(30000); p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  await enter(p, 'wendy', { port, wait:1200 });
  const cove = await p.evaluate(() => {
    const v = window.__reef3dView && window.__reef3dView();
    return { canvas:!!document.querySelector('.r3 canvas'), view:!!v, guide:!!(v && v.guide), crab:!!(v && v.crab), models:!!(v && v.models) };
  });
  check('Coral Cove baseline: original scene is intact', cove.canvas && cove.view && cove.guide && cove.crab && cove.models, JSON.stringify(cove));
  check('Coral Cove baseline: no horizontal overflow', (await overflow(p)).page, JSON.stringify(await overflow(p)));
  check('grown-up maths answer is transient', await noSavedPin(p));
  await p.screenshot({ path:path.join(out, 'coral-cove-phone-portrait-day.png') });
  check('Coral Cove baseline: no page errors', p.errors.length === 0, p.errors.join(' / '));
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout:30000 });
  const precached = await p.evaluate(async names => Promise.all(names.map(async name => {
    const res = await caches.match(new URL(name, location.href).href);
    return { name, ok:!!res && res.ok, type:res && res.headers.get('content-type') };
  })), tracks);
  check('all seven regional songs are precached', precached.every(x => x.ok && /audio|mpeg|octet-stream/i.test(x.type || '')), JSON.stringify(precached));
  try {
    await context.setOffline(true);
    const offline = await p.evaluate(async names => Promise.all(names.map(async name => {
      try {
        const res = await fetch(name);
        return { name, status:res.status, type:res.headers.get('content-type'), bytes:(await res.arrayBuffer()).byteLength };
      } catch(e){ return { name, error:String(e) }; }
    })), tracks);
    check('all seven regional songs play from offline storage', offline.every(x => x.status === 200 && x.bytes > 1000 && /audio|mpeg|octet-stream/i.test(x.type || '')), JSON.stringify(offline));
  } finally { await context.setOffline(false); }
  await context.close();

  for(const r of selectedRegions){
    context = await browser.newContext({ viewport:sizes[0], colorScheme:'light', reducedMotion:'reduce' });
    await context.addInitScript(() => { localStorage.setItem('cc-tour-off','1'); localStorage.setItem('cc-3dq3','3'); });
    p = await context.newPage(); p.setDefaultTimeout(30000); p.errors = [];
    p.on('pageerror', e => p.errors.push(e.message));
    await enter(p, 'wendy', { port, wait:1200 });
    await openRegion(p, r);
    const initial = await p.evaluate(() => {
      const v = window.__regionBoardView(), scene = window.__reef3dView(), root = document.querySelector('.rb-root');
      return { region:v.region, mode:v.mode, has3d:v.has3d, canvas:!!(root && root.querySelector('canvas')),
        guide:!!(scene && scene.guide), crab:!!(scene && scene.crab), models:!!(scene && scene.models),
        perspective:!!(scene && scene.cam && scene.cam.isPerspectiveCamera),
        scenery:!!(scene && scene.scene && scene.scene.getObjectByName('region-' + v.region)), position:v.position };
    });
    check(r.id + ': opens as the shared fullscreen 3D region board', initial.region === r.id && initial.mode === 'board' &&
      initial.has3d && initial.canvas && initial.guide && initial.crab && initial.models && initial.perspective && initial.scenery, JSON.stringify(initial));
    const expectedTrack = 'region-' + r.id + '-song';
    if(await p.evaluate(() => !!window.__reefMusicState)){
      check(r.id + ': music target is its own region track', await musicTarget(p) === expectedTrack, await musicTarget(p) || 'music disabled');
      await p.waitForFunction(name => window.__reefMusicState().current === name, expectedTrack, { timeout:10000 });
      check(r.id + ': own region track is selected for playback', await p.evaluate(name => window.__reefMusicState().current === name, expectedTrack));
    }
    check(r.id + ': no horizontal overflow', (await overflow(p)).page && (await overflow(p)).board, JSON.stringify(await overflow(p)));
    check(r.id + ': grown-up maths answer is transient', await noSavedPin(p));

    // The Activities shortcut opens the same existing front page and supplies a board return control.
    await p.click('[data-rb-list]');
    await p.waitForFunction(() => { const v = window.__regionBoardView && window.__regionBoardView(); return v && v.mode === 'list' && !v.has3d; });
    const listHasLesson = await p.locator(listSelectors[r.id]).count();
    check(r.id + ': Activities opens the existing region list', listHasLesson > 0, 'lesson controls=' + listHasLesson);
    await p.click('[data-rb-board]');
    await stable(p);

    // Seed one learner's saved spot for this region, then make sure visiting a neighbor keeps its own spot.
    const seeded = await p.evaluate(id => {
      const key = 'cc-region-board-at-' + window.CoralCove.profile().id + '-' + id;
      localStorage.setItem(key, '2');
      return key;
    }, r.id);
    await p.click('.rb-guide summary');
    await p.click('[data-rb-region="' + neighbor[r.id] + '"]');
    await stable(p);
    const isolated = await p.evaluate(({ id, from, savedKey }) => {
      const v = window.__regionBoardView(), key = 'cc-region-board-at-' + window.CoralCove.profile().id + '-' + id;
      return { region:v.region, position:v.position, saved:localStorage.getItem(savedKey), neighbor:localStorage.getItem(key) };
    }, { id:neighbor[r.id], from:r.id, savedKey:seeded });
    check(r.id + ': nearby region reads an independent saved position', isolated.region === neighbor[r.id] && isolated.position !== 2 &&
      isolated.saved === '2' && isolated.neighbor !== '2', JSON.stringify(isolated));
    await p.click('.rb-guide summary');
    await p.click('[data-rb-region="' + r.id + '"]');
    await stable(p);
    check(r.id + ': returning restores its own position', await p.evaluate(() => window.__regionBoardView().position === 2));

    // Open an existing lesson through the board's guide; its own back control returns to the same board.
    await p.click('.rb-guide summary');
    const activity = await p.evaluate(() => {
      const b = document.querySelector('.rb-guide [data-rb-activity]');
      return b ? b.dataset.rbActivity : null;
    });
    check(r.id + ': board guide links an existing activity', !!activity, activity || 'no activity button');
    if(activity){
      await p.click('.rb-guide [data-rb-activity="' + activity + '"]');
      await p.waitForFunction(() => { const v = window.__regionBoardView && window.__regionBoardView(); return v && !v.has3d && !document.querySelector('.rb-root canvas'); });
      check(r.id + ': activity opens outside the board renderer', await p.evaluate(() => !document.querySelector('.rb-root canvas')));
      const backs = { lagoon:'[data-act="lg-back"]', town:'[data-act="tw-back"]', caves:'[data-act="cv-back"]',
        patterns:'[data-act="pr-back"]', beach:'[data-act="bb-back"]', light:'[data-act="lh-back"]', captain:'[data-rb-board]' };
      if(r.id === 'captain') await p.click('[data-rb-board]');
      else { await p.waitForSelector(backs[r.id], { timeout:15000 }); await p.click(backs[r.id]); }
      await stable(p);
      check(r.id + ': returns from activity to its region board', await p.evaluate(id => {
        const v = window.__regionBoardView(); return v.region === id && v.mode === 'board' && !!document.querySelector('.rb-root canvas');
      }, r.id));
      check(r.id + ': board menu survives activity return', await p.locator('.r3-menubtn').count() === 1);
      if(await p.evaluate(() => !!window.__reefMusicState)){
        const returnedTrack = await musicTarget(p);
        check(r.id + ': region music resumes after the lesson', returnedTrack === expectedTrack, returnedTrack || 'music disabled');
        await p.waitForFunction(name => window.__reefMusicState().current === name, expectedTrack, { timeout:10000 });
        check(r.id + ': own region track resumes playback after the lesson', await p.evaluate(name => window.__reefMusicState().current === name, expectedTrack));
      }
    }

    // Capture the full viewport/theme matrix without changing profile or region progress between captures.
    for(const night of [false, true]){
      await themeNight(p, night);
      for(const size of sizes){
        await p.setViewportSize({ width:size.width, height:size.height });
        await p.waitForTimeout(250);
        const dims = await overflow(p);
        check(r.id + ' ' + size.name + ' ' + (night ? 'night' : 'day') + ': no horizontal overflow', dims.page && dims.board, JSON.stringify(dims));
        if(captures) await p.screenshot({ path:path.join(out, r.id + '-' + size.name + '-' + (night ? 'night' : 'day') + '.png') });
      }
    }
    await themeNight(p, false);
    if(r.id === 'lagoon'){
      // Use the visible board control and native die once. A hop confirms regional party travel.
      const before = await p.evaluate(() => window.__reef3dView().at);
      const readyDie = await p.locator('.r3-dice-tip').count() === 1;
      if(readyDie && await p.locator('[data-die="regular"]').count()) await p.click('[data-die="regular"]');
      await p.click('[data-rb-roll]');
      const openedDie = await p.locator('.r3-dice-tip').count() === 1;
      check('region Dice button opens or hits the native die', openedDie || await p.evaluate(() => {
        const v = window.__reef3dView(); return v && v.dice && !v.dice.rolling;
      }));
      if(openedDie){
        if(await p.locator('[data-die="regular"]').count()) await p.click('[data-die="regular"]');
        await p.click('.r3-dice-tip');
      }
      await p.waitForFunction(from => {
        const v = window.__reef3dView && window.__reef3dView();
        const key = 'cc-region-board-at-' + window.CoralCove.profile().id + '-lagoon';
        return (v && v.at !== from) || (localStorage.getItem(key) != null && +localStorage.getItem(key) !== from);
      }, before, { timeout:60000 });
      check('shared dice control rolls and moves the guide on the region board', await p.evaluate(from => {
        const v = window.__reef3dView(), key = 'cc-region-board-at-' + window.CoralCove.profile().id + '-lagoon';
        return (v && v.at !== from) || (localStorage.getItem(key) != null && +localStorage.getItem(key) !== from);
      }, before));
    }
    check(r.id + ': no page errors', p.errors.length === 0, p.errors.join(' / '));
    await context.close();
  }

  await browser.close();
  console.log(failures ? failures + ' region board QA check(s) failed' : 'region board QA passed; screenshots saved to ' + out);
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
