// Production regional activities, route graph, and saved positions without WebGL.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const saved = new Map();
const storedStats = new Map();
const timers = [];
const ctx = vm.createContext({
  window:{ scrollTo(){} }, navigator:{ maxTouchPoints:1 }, innerWidth:375, app:{},
  S:{ profile:{ id:'region-a' }, stats:{}, store:{
    getStats:id => Promise.resolve(JSON.parse(storedStats.get(id) || '{}')),
    setStats:(stats, id) => Promise.resolve(storedStats.set(id, JSON.stringify(stats)))
  } }, MutationObserver:class { observe(){} }, afterRender(){},
  reefNight:() => false, reefCalm:() => true, reefPlaceFor:() => ({ hue:'#c4f5ec' }),
  localStorage:{ getItem:key => saved.get(key) ?? null, setItem:(key, value) => saved.set(key, value) },
  setTimeout:fn => { timers.push(fn); }, document:{ body:{ contains:() => true } },
  Speech:{ stop(){} }
});
const files = [
  'lagoon-stories', 'lagoon', 'town-talks', 'town', 'caves-sounds', 'caves', 'patterns-data', 'patterns',
  'beach-data', 'beach', 'light-data', 'light', 'region-practice', 'region-boards',
  'reef3d/world-routes', 'reef3d/board', 'reef3d/party', 'reef3d/dice'
];
for(const file of files){
  const name = path.join(__dirname, '../../src/js', file + '.js');
  vm.runInContext(fs.readFileSync(name, 'utf8'), ctx, { filename:name });
}

const originalCounts = {
  lagoon:[10,12,5], town:[10,8,5], caves:[12,3,7], patterns:[10,12,5], beach:[10,13,5], light:[9,18,5], captain:[12,3,7]
};
const counts = (spaces, kind) => spaces.filter(space => space.kind === kind).length;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const notes = [];
const addedQuestionKeys = new Set();
let expandedTown;
for(const [region, [plain, deck, questions]] of Object.entries(originalCounts)){
  const zones = ctx.regionBoardZones(region);
  const original = ctx.reef3dSpaces([zones[0]], zones.region);
  const spaces = ctx.reef3dSpaces(zones, zones.region);
  const view = { region:zones.region, spaces };
  assert.equal(counts(original, 'plain'), plain, region);
  assert.equal(counts(original, 'deck'), deck, region);
  assert.equal(counts(original, 'surprise'), questions, region);
  assert.equal(counts(original, 'chance'), 2, region);
  assert.equal(counts(spaces, 'plain'), plain + Math.ceil(.3 * plain), region);
  assert.equal(counts(spaces, 'deck'), deck + Math.ceil(.2 * deck), region);
  assert.equal(counts(spaces, 'surprise'), questions + 2, region);
  assert.equal(counts(spaces, 'chance'), 3, region);
  assert.equal(counts(spaces, 'surprise') + counts(spaces, 'chance'), Math.ceil(1.3 * (questions + 2)), region);
  assert.equal(counts(spaces, 'minigame'), 0, region);
  for(const kind of ['shop', 'whirl', 'treasure', 'story']){
    assert.equal(counts(spaces, kind), counts(original, kind), `${region} ${kind}`);
  }
  assert.equal(spaces.legacyPositions.length, original.length);
  assert.equal(new Set(spaces.map(s => s.positionId)).size, spaces.length);
  assert.equal(spaces.gateAt, spaces.legacyPositions[original.gateAt]);
  assert(spaces.loop && spaces[0].links.includes(spaces.mainN - 1));
  assert(spaces[spaces.mainN - 1].links.includes(0));
  assert(ctx.reef3dWays(spaces, spaces.mainN - 1).includes(0));
  assert(spaces.bounds.maxX - spaces.bounds.minX > original.bounds.maxX - original.bounds.minX);
  assert(spaces.bounds.maxZ - spaces.bounds.minZ > original.bounds.maxZ - original.bounds.minZ);
  for(const old of original){
    const index = spaces.legacyPositions[old.i], space = spaces[index];
    assert.equal(space.kind, old.kind);
    assert.equal(space.fork, old.fork);
    assert.equal(space.branch, old.branch);
    if(old.branch) assert.equal(space.jn, spaces.legacyPositions[old.jn]);
    if(old.kind === 'whirl') assert.equal(space.pair, spaces.legacyPositions[old.pair]);
    if(old.kind === 'deck') assert.equal(space.item.d.id, old.item.d.id);
    if(old.kind === 'surprise') assert.equal(ctx.reef3dQKey(spaces, space, zones.region), ctx.reef3dQKey(original, old, zones.region));
    const key = 'cc-region-board-at-region-a-' + region;
    saved.set(key, String(old.i));
    assert.equal(ctx.reef3dPosition(view), index);
    ctx.reef3dSavePosition(view, index);
    assert.equal(saved.get(key), space.positionId);
    assert.equal(ctx.reef3dPosition(view), index);
    ctx.S.profile.id = 'region-b';
    assert.equal(ctx.reef3dPosition(view), 0);
    ctx.S.profile.id = 'region-a';
  }
  for(const space of spaces){
    assert(space.i === 0 || ctx.reef3dRoute(spaces, 0, space.i).length > 0);
    assert.equal(new Set(space.links).size, space.links.length);
    for(const link of space.links) assert(spaces[link].links.includes(space.i));
    for(const other of spaces.slice(space.i + 1)){
      assert(distance(space, other) > 2.64, `${region} tiles ${space.i} and ${other.i} require clearance`);
    }
  }
  const allQuestionKeys = spaces.filter(space => space.kind === 'surprise').map(space => ctx.reef3dQKey(spaces, space, zones.region));
  assert.equal(new Set(allQuestionKeys).size, allQuestionKeys.length);
  for(const question of spaces.filter(space => space.added && space.kind === 'surprise')){
    question.qKey = ctx.reef3dQKey(spaces, question, zones.region);
    assert(!addedQuestionKeys.has(question.qKey));
    addedQuestionKeys.add(question.qKey);
  }
  if(region === 'town') expandedTown = { view, zones };
  for(const activity of ctx.regionBoardActivities(region).filter(a => a.practice)){
    const tile = spaces.find(s => s.practice && s.item.d.regionActivity.id === activity.id);
    assert(tile && tile.item.d.regionActivity.region === region);
    if(activity.practice.rule){ assert(ctx.cavesRule(activity.practice.rule)); continue; }
    const tasks = ctx.regionPracticeTasks(activity.practice);
    assert(tasks.length && tasks.every(task => task.prompt && task.answers.every(a => a[0])));
    assert.equal(activity.done, false);
    assert.equal(tile.item.state, 'practice');
    assert.equal(tile.item.dc.due, 0);
    assert.equal(tile.item.dc.total, 0);
    if(region === 'patterns') assert(tasks.every(task => task.answers[0][0].length < task.full[0].length));
    if(region === 'beach') assert(tasks.every(task => task.source[0].includes(task.answers[0][0]) && task.source[0] !== task.answers[0][0]));
    if(region === 'light') assert(tasks.every(task => task.prompt.includes('Which part of the sign') && task.reason));
  }
  notes.push([region, plain, counts(spaces, 'plain'), deck, counts(spaces, 'deck'), questions, original.length, spaces.length]);
}

// The additions enter the existing surprise and Chance paths. Rebuilding the
// board restores the used question block for the same profile.
assert.equal(addedQuestionKeys.size, 14);
const town = expandedTown.view;
const question = town.spaces.find(space => space.added && space.kind === 'surprise');
const chance = town.spaces.find(space => space.added && space.kind === 'chance');
let rewards = 0, visits = 0, chances = 0;
ctx.reef3dQHit = () => {};
ctx.reef3dSurprise = () => { rewards++; };
ctx.reef3dChance = (view, tile, done) => {
  assert.equal(tile, chance);
  chances++;
  done();
};
ctx.reef3dVisitKind(town, question, () => { visits++; });
ctx.reef3dVisitKind(town, question, () => { visits++; });
timers.shift()();
assert.equal(rewards, 1);
assert.equal(visits, 2);
assert.equal(timers.length, 0);
const rebuilt = ctx.reef3dSpaces(expandedTown.zones, town.region);
const sameQuestion = rebuilt.find(space => space.positionId === question.positionId);
sameQuestion.qKey = ctx.reef3dQKey(rebuilt, sameQuestion, town.region);
assert.equal(sameQuestion.qKey, question.qKey);
ctx.reef3dVisitKind(town, chance, () => { visits++; });
assert.equal(chances, 1);
assert.equal(visits, 3);

async function finish(){
  await ctx.reefBoardQ;
  ctx.S.stats = await ctx.S.store.getStats('region-a');
  assert(ctx.reef3dQDepleted(sameQuestion));
  ctx.S.profile.id = 'region-b';
  ctx.S.stats = await ctx.S.store.getStats('region-b');
  assert(!ctx.reef3dQDepleted(sameQuestion));

  console.log('Region    Plain      Learning   ?          Chance     Total');
  for(const [id, plain, newPlain, learn, newLearn, questions, total, newTotal] of notes){
    console.log(`${id.padEnd(10)}${`${plain} → ${newPlain}`.padEnd(11)}${`${learn} → ${newLearn}`.padEnd(11)}${`${questions} → ${questions + 2}`.padEnd(11)}${'2 → 3'.padEnd(11)}${total} → ${newTotal}`);
  }
  console.log('Expanded circuits, tile clearance, branch identities, saved positions, learning sources, surprise depletion and Chance dispatch passed.');
}
finish().catch(error => { console.error(error); process.exitCode = 1; });
