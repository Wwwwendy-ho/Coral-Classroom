/* Harbor Town pilot browser QA across phone/tablet sizes and board themes.
   Usage: node tools/check/town_board_smoke.js [port]
   Screenshots default to the OS temp directory; set TOWN_QA_DIR to choose another folder.
   Uses a fresh browser context for each case. --capture-only refreshes screenshots without interaction checks. */
const { chromium } = require('playwright');
const { enter } = require('./steps');
const fs = require('fs');
const path = require('path');
const os = require('os');

const port = +process.argv[2] || 8831;
const captureOnly = process.argv.includes('--capture-only');
const captureNamesArg = process.argv.find(a => a.startsWith('--capture-names='));
const captureNames = captureNamesArg ? captureNamesArg.slice('--capture-names='.length).split(',') : null;
const out = process.env.TOWN_QA_DIR || path.join(os.tmpdir(), 'coral-town-qa');
const sizes = [
  { name:'phone-portrait', width:375, height:812 },
  { name:'phone-landscape', width:812, height:375 },
  { name:'tablet-portrait', width:768, height:1024 },
  { name:'tablet-landscape', width:1024, height:768 }
];
const cases = sizes.flatMap(s => ['day','night'].map(theme => ({ ...s, theme })));
let failures = 0;
function check(name, ok, detail){
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? '  ' + detail : ''));
  if(!ok) failures++;
}
async function waitBoard(p){
  await p.waitForFunction(() => !!(window.__townBoardView && window.__townBoardView()), null, { timeout:20000 });
}
async function noOverflow(p){
  return p.evaluate(() => {
    const d = document.documentElement, b = document.body;
    return { page:Math.max(d.scrollWidth,b.scrollWidth) <= d.clientWidth + 1,
      board:!document.querySelector('.tb-root') || document.querySelector('.tb-root').scrollWidth <= document.querySelector('.tb-root').clientWidth + 1,
      width:d.clientWidth, scroll:Math.max(d.scrollWidth,b.scrollWidth) };
  });
}
async function waitPosition(p, n){
  await p.waitForFunction(n => {
    const v = window.__townBoardView && window.__townBoardView();
    const roll = document.querySelector('[data-tb-roll]');
    return v && v.position === n && roll && !roll.disabled;
  }, n, { timeout:15000 });
}

(async () => {
  fs.mkdirSync(out, { recursive:true });
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for(let ci = 0; ci < cases.length; ci++){
    const c = cases[ci], label = c.name + '-' + c.theme;
    if(captureOnly && captureNames && !captureNames.includes(label)) continue;
    const context = await browser.newContext({ viewport:{ width:c.width, height:c.height }, colorScheme:c.theme === 'night' ? 'dark' : 'light', reducedMotion:'reduce' });
    await context.addInitScript(() => {
      localStorage.setItem('cc-tour-off','1');
      localStorage.setItem('cc-3dq3','3');
      // Set the seeded die only immediately before a roll; the rest of the app keeps normal randomness.
    });
    const p = await context.newPage(); p.errors = [];
    p.on('pageerror', e => p.errors.push(e.message));
    await enter(p, 'wendy', { port, wait:1200 }); // gate answer is entered transiently through the UI, never saved or captured
    await p.evaluate(() => window.CoralCove.openTown());
    await waitBoard(p);

    let view = await p.evaluate(() => window.__townBoardView());
    if(!!view.state.night !== (c.theme === 'night')){
      await p.click('[data-tb-night]');
      await p.waitForFunction(night => {
        const v = window.__townBoardView && window.__townBoardView();
        return v && v.state.night === night;
      }, c.theme === 'night');
      view = await p.evaluate(() => window.__townBoardView());
    }
    check(label + ': 36 board tiles and two forks', view.tiles === 36 && JSON.stringify(view.forks) === '[8,26]',
      'tiles=' + view.tiles + ' forks=' + JSON.stringify(view.forks));
    check(label + ': renderer mounted', view.webgl && !!view.renderer, 'webgl=' + view.webgl);
    check(label + ': no horizontal overflow', (await noOverflow(p)).page && (await noOverflow(p)).board,
      JSON.stringify(await noOverflow(p)));
    await p.screenshot({ path:path.join(out, label + '.png'), fullPage:true });
    if(captureOnly){ await context.close(); continue; }

    // Force two four-step rolls to land on space 8, then a third roll reaches the fork prompt there.
    for(const expected of [4,8]){
      await p.evaluate(() => { Math.random = () => .5; });
      await p.click('[data-tb-roll]');
      await waitPosition(p, expected);
      const event = await p.$('[data-tb-event]:not([hidden])');
      if(event) await p.click('[data-tb-choice]');
    }
    await p.evaluate(() => { Math.random = () => .5; });
    await p.click('[data-tb-roll]');
    await p.waitForFunction(() => {
      const v = window.__townBoardView && window.__townBoardView();
      const e = document.querySelector('[data-tb-event]:not([hidden])');
      return v && v.position === 8 && e && /Choose a street/.test(e.innerText);
    }, null, { timeout:15000 });
    const choices = await p.locator('[data-tb-event]:not([hidden]) [data-tb-choice]').count();
    check(label + ': roll reaches fork with two street choices', choices === 2, 'choices=' + choices);
    const branch = ci % 2 ? 1 : 0;
    await p.locator('[data-tb-event]:not([hidden]) [data-tb-choice]').nth(branch).click();
    await waitPosition(p, branch ? 16 : 12);
    const saved = await p.evaluate(() => {
      const id = window.CoralCove.profile().id;
      return JSON.parse(localStorage.getItem('cc-town-board-' + id) || 'null');
    });
    check(label + ': walk state saved per profile', !!saved && saved.position === (branch ? 16 : 12) && saved.night === (c.theme === 'night'), JSON.stringify(saved));

    // The guide exposes all eight existing talks. Opening a talk disposes the board renderer; returning remounts it.
    await p.evaluate(() => window.CoralCove.openTown());
    await waitBoard(p);
    const ids = await p.locator('[data-tw-open]').evaluateAll(xs => xs.map(x => x.dataset.twOpen));
    check(label + ': all eight town conversations are linked', ids.length === 8, 'ids=' + ids.join(','));
    for(const id of ids){
      await p.click('[data-tw-open="' + id + '"]');
      await p.waitForSelector('.tw-page');
      check(label + ': ' + id + ' opens a conversation', await p.locator('.tw-page h2[lang="ko"]').count() === 1);
      check(label + ': board renderer stops during ' + id, await p.evaluate(() => window.__townBoardView() === null));
      await p.click('[data-act="tw-back"]');
      await waitBoard(p);
      const resumed = await p.evaluate(() => window.__townBoardView());
      check(label + ': ' + id + ' returns to board with theme', !!resumed && resumed.state.night === (c.theme === 'night') && resumed.webgl);
    }

    // Leave Harbor Town for the reef and re-enter through its supported API. The board's save must reload.
    await p.click('[data-act="tw-home"]');
    await p.waitForFunction(() => !!(window.__reef3dView && window.__reef3dView()), null, { timeout:20000 });
    check(label + ': reef scene renders after leaving Harbor Town', await p.evaluate(() => !!document.querySelector('.r3 canvas')));
    await p.evaluate(() => window.CoralCove.openTown());
    await waitBoard(p);
    const resumed = await p.evaluate(() => window.__townBoardView());
    const finalSaved = await p.evaluate(() => JSON.parse(localStorage.getItem('cc-town-board-' + window.CoralCove.profile().id) || 'null'));
    check(label + ': board render resumes from saved position and theme', !!resumed && !!finalSaved &&
      resumed.position === finalSaved.position && resumed.state.night === (c.theme === 'night') && resumed.webgl,
      JSON.stringify({ position:resumed && resumed.position, saved:finalSaved }));
    check(label + ': no page errors', p.errors.length === 0, p.errors.join(' / '));
    await context.close();
  }
  await browser.close();
  console.log(failures ? failures + ' town board QA check(s) failed' : captureOnly ? 'town board screenshot capture completed' : 'town board QA passed all 8 viewport/theme cases');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
