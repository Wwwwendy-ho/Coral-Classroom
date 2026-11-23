// Run with node tools/check/test_surprise_blocks.js; no browser or server required.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const root = path.join(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, 'src/js/reef3d', f), 'utf8');
let current = 'a', saved = {a: {}, b: {}}, timers = [], effects = [], night = false, calm = false;
const S = {profile: {id:'a'}, stats: {}, store: {
  getStats(id){ return Promise.resolve(JSON.parse(JSON.stringify(saved[id || current]))); },
  setStats(v, id){ saved[id || current] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); }
}};
const ctx = vm.createContext({S, console, Promise, Math, JSON, innerWidth: 900,
  navigator: {maxTouchPoints: 0}, window: {reef3dWorldRoute(){}}, reefNight: () => night, reefCalm: () => calm,
  setTimeout: (fn, ms) => { timers.push({fn, ms}); }, clearTimeout(){},
  performance: {now: () => 0}, document: {body: {contains: () => true}}, Sound: {bloop(){effects.push('sound');}},
});
vm.runInContext(read('party.js') + '\n' + read('board.js') + '\n' + read('scenes.js'), ctx);
const realHit = ctx.reef3dQHit;
ctx.reef3dQHit = () => effects.push('hit');
ctx.reef3dEmote = (v, name) => effects.push(name);
ctx.reef3dCrabAct = () => effects.push('crab');
ctx.reef3dPrize = () => effects.push('prize');
ctx.reef3dSwimBy = () => effects.push('swim');
ctx.reef3dSavePosition = () => {};
ctx.REEF_FRIENDS = [{e:'fish', name:'Fish', fact:'fact'}];
const zones = [{items: Array.from({length: 12}, (_, i) => ({d:{id:'deck'+i}}))}];
function make(region){ const a = ctx.reef3dSpaces(zones, region); a.filter(s => s.kind === 'surprise').forEach(s => s.qKey = ctx.reef3dQKey(a, s, region)); return a; }
function flush(){ timers.sort((a,b) => a.ms - b.ms); while(timers.length) timers.shift().fn(); }
const view = {wrap:{querySelector: () => null}, region:null};
async function main(){
  const day = make(), block = day.find(s => s.kind === 'surprise' && !s.branch), branch = day.find(s => s.branch && s.kind === 'surprise');
  let done = 0; ctx.reef3dVisitKind(view, block, () => done++); ctx.reef3dVisitKind(view, block, () => done++);
  assert.equal(done, 1); flush(); assert.equal(done, 2); assert.equal(effects.filter(x => x === 'prize').length, 1); assert.equal(effects.filter(x => x === 'hit').length, 1);
  effects = []; ctx.reef3dArrive(view, block); flush(); assert.deepEqual(effects, []);
  await ctx.reefBoardQ; assert(saved.a.board.usedBlocks[block.qKey]);
  S.stats = JSON.parse(JSON.stringify(saved.a)); night = true;
  const rebuilt = make(), same = rebuilt.find(s => s.qKey === block.qKey), sameBranch = rebuilt.find(s => s.qKey === branch.qKey);
  assert(same && sameBranch); assert(ctx.reef3dQDepleted(same));
  const expanded = [{items:[{d:{id:'new1'}},{d:{id:'new2'}},{d:{id:'new3'}}].concat(zones[0].items)}];
  const changed = ctx.reef3dSpaces(expanded, null); changed.forEach(s => {if(s.kind === 'surprise') s.qKey = ctx.reef3dQKey(changed, s, null);});
  assert(changed.some(s => s.qKey === block.qKey));
  const region = {id:'town'}, regional = make(region); assert(!ctx.reef3dQDepleted(regional.find(s => s.kind === 'surprise')));
  current = 'b'; S.profile = {id:'b'}; S.stats = {}; calm = true; effects = [];
  ctx.reef3dVisitKind(view, same, () => done++); ctx.reef3dVisitKind(view, same, () => done++); flush();
  assert.equal(effects.filter(x => x === 'prize').length, 1); await ctx.reefBoardQ;
  assert(saved.b.board.usedBlocks[same.qKey]); assert(!saved.a.board.usedBlocks[branch.qKey]);
  // The rendering helper must initialize a loaded block with the used face and no glow/glints.
  const qb = {userData:{mat:{}, texUsed:{}, halo:{material:{}}, glints:[{visible:true}]}};
  ctx.reef3dQUsed(qb); assert.strictEqual(qb.userData.mat.map, qb.userData.texUsed); assert.equal(qb.userData.used, 1); assert.equal(qb.userData.glints[0].visible, false);
  const timerCount = timers.length; realHit(view, {qb}); realHit(view, {qb});
  assert.equal(timers.length, timerCount); assert.equal(effects.filter(x => x === 'sound').length, 0);
  // A save queued before an immediate profile switch must still land on the original profile.
  const pending = regional.find(s => s.kind === 'surprise');
  assert(ctx.reef3dQReserve(pending));
  current = 'a'; S.profile = {id:'a'}; S.stats = JSON.parse(JSON.stringify(saved.a));
  await ctx.reefBoardQ;
  assert(saved.b.board.usedBlocks[pending.qKey]); assert(!saved.a.board.usedBlocks[pending.qKey]);
  current = 'b'; S.profile = {id:'b'}; S.stats = JSON.parse(JSON.stringify(saved.b));
  // A fresh direct arrival also reserves before the first animation callback.
  calm = false; effects = []; ctx.reef3dArrive(view, branch); ctx.reef3dArrive(view, branch); flush();
  assert.equal(effects.filter(x => x === 'prize').length, 1); assert.equal(effects.filter(x => x === 'bonk').length, 1);
  await ctx.reefBoardQ;
  console.log('surprise block tests passed');
}
main().catch(e => {console.error(e); process.exitCode = 1;});
