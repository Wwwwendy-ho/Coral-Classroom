// Captain's Deck (src/js/deck-plan.js): today's voyage puts what's due first, then the course's next deck, then one
// input leg and one output leg, adds a skill leg only when something is weak, and never has more than four legs;
// a finished activity ticks off the right leg; trip readiness counts the pieces done in each situation; and every
// table names content that really exists in the regions.
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '../..');
function read(f){ return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
var D = new Function(read('src/js/deck-plan.js') + read('src/js/lagoon-stories.js') + read('src/js/town-talks.js') + read('src/js/caves-sounds.js') +
  read('src/js/patterns-data.js') + read('src/js/light-data.js') +
  '; return { plan: deckPlan, legFor: deckLegFor, ready: deckReadiness, SITS: DECK_SITS, CAN: DECK_CAN, UNITS: DECK_UNITS, cando: deckCandoTest,' +
  ' LG: LAGOON_STORIES, TW: TOWN_FOLK, CV: CAVES_PAIRS, PAT: PAT_LIST, LS: LH_SIGNS, LM: LH_MANNERS };')();
var bad = [], n = 0;
function eq(what, got, want){ n++; if(got !== want) bad.push(what + ': got ' + got + ', want ' + want); }
function kinds(legs){ return legs.map(function(l){ return l.kind + (l.kind === 'cards' ? '(' + l.item + ')' : ''); }).join(','); }

var story = { id: 'cafe', en: 'At a cafe' }, talk = { id: 'taxi', en: 'Taxi driver' }, letter = { id: 'food', en: 'Which food?' };
var sound = { id: 't', label: 'ㄷ ㅌ ㄸ' }, repair = { id: 'object', en: 'The object' }, sign = { id: 'subway', en: 'Subway station sign' };
var review = { mw: true, n: 12, deckId: 'cc-my-words' }, unit = { deckId: 'd1', name: 'Korean words', n: 8, unit: 'At the cafe' };

// nothing weak: review first, the unit's deck, then one input and one output leg, and no skill leg
var a = D.plan({ day: 2, review: review, unit: unit, story: story, talk: talk, letter: letter, sign: sign });
eq('nothing weak: the legs', kinds(a), 'cards(cc-my-words),cards(d1),story,talk');
eq('the review leg comes first', a[0].kind === 'cards' && a[0].item === 'cc-my-words', true);
eq('exactly one input leg', a.filter(function(l){ return l.kind === 'story'; }).length, 1);
eq('exactly one output leg', a.filter(function(l){ return l.kind === 'talk' || l.kind === 'letter'; }).length, 1);
eq('no skill leg when nothing is weak', a.some(function(l){ return l.kind === 'sound' || l.kind === 'pattern'; }), false);
eq('every leg has a region icon, a title and minutes', a.every(function(l){ return l.icon && l.place && l.title && l.min > 0; }), true);
eq('a talk with "A new friend" reads well', D.plan({ talk: { id: 'friend', en: 'A new friend' } })[0].title, 'Talk with a new friend');
// a weak sound: the skill leg comes in, and four is still the most
var b = D.plan({ day: 2, review: review, unit: unit, story: story, talk: talk, letter: letter, sound: sound, sign: sign });
eq('a weak sound: at most four legs', b.length, 4);
eq('a weak sound: the skill leg is there, the unit deck gives way', kinds(b), 'cards(cc-my-words),story,talk,sound');
eq('the review stays first', b[0].item, 'cc-my-words');
// both weak: one skill leg, turning with the day
eq('both weak, even day: the sound', kinds(D.plan({ day: 4, story: story, talk: talk, sound: sound, repair: repair })), 'story,talk,sound');
eq('both weak, odd day: the pattern', kinds(D.plan({ day: 5, story: story, talk: talk, sound: sound, repair: repair })), 'story,talk,pattern');
eq('only one skill leg', D.plan({ day: 5, review: review, story: story, talk: talk, letter: letter, sound: sound, repair: repair }).filter(function(l){ return l.kind === 'sound' || l.kind === 'pattern'; }).length, 1);
// the output leg turns between a talk and a letter
eq('odd day: a letter', kinds(D.plan({ day: 3, review: review, story: story, talk: talk, letter: letter })), 'cards(cc-my-words),story,letter');
eq('only a talk left: the talk', kinds(D.plan({ day: 3, story: story, talk: talk, sign: sign })), 'story,talk,sign');
// nothing due: no review leg; a light day gets a sign
var c = D.plan({ day: 2, review: { mw: true, n: 0 }, story: story, talk: talk, sign: sign });
eq('nothing due: no review leg, and a sign so there are three', kinds(c), 'story,talk,sign');
eq('a full day never has a sign leg as well', D.plan({ day: 2, review: review, unit: unit, story: story, talk: talk, sign: sign }).some(function(l){ return l.kind === 'sign'; }), false);
eq('a review of the same deck as the unit is one leg', kinds(D.plan({ day: 2, review: { n: 5, deckId: 'd1', name: 'Korean words' }, unit: unit, story: story, talk: talk })), 'cards(d1),story,talk');
for(var i = 0; i < 50; i++){
  var all = D.plan({ day: i, review: review, unit: unit, story: story, talk: talk, letter: letter, sound: i % 3 ? sound : null, repair: i % 2 ? repair : null, sign: sign });
  if(all.length > 4 || all.length < 3) bad.push('day ' + i + ': ' + all.length + ' legs');
}
// ticking off
var legs = D.plan({ day: 2, review: { n: 5, deckId: 'd9', name: 'Old words' }, unit: unit, story: story, talk: talk });
eq('a round of the unit deck ticks the unit leg', D.legFor(legs, {}, 'cards', 'd1').item, 'd1');
eq('a story ticks its leg', D.legFor(legs, {}, 'story', 'cafe').kind, 'story');
eq('another story ticks nothing', D.legFor(legs, {}, 'story', 'hotel'), null);
eq('any round of sound pairs ticks the sound leg', D.legFor(D.plan({ story: story, sound: sound }), {}, 'sound', null).kind, 'sound');
eq('a leg already done is not ticked again', D.legFor(legs, { 'story:cafe': 1 }, 'story', 'cafe'), null);

// readiness
var none = D.ready({}), some = D.ready({ town: { cafe: 1 }, lagoon: { cafe: 1 }, sign: { cafe: 1 } });
eq('nothing done: not ready', none.share, 0);
eq('ten situations', none.rows.length, 10);
eq('the cafe, all three pieces done', some.rows.find(function(r){ return r.sit.id === 'cafe'; }).share, 1);
eq('one situation done of ten', Math.round(some.share * 100), 10);

// every table names real content
var ids = { lagoon: D.LG, town: D.TW, sign: D.LS, note: D.LM };
D.SITS.forEach(function(s){ Object.keys(ids).forEach(function(k){ s[k].forEach(function(id){
  if(!ids[k].some(function(x){ return x.id === id; })) bad.push('situation ' + s.id + ': no ' + k + ' ' + id); }); }); });
function testOk(t){
  var p = t.split(':'), k = p[0], id = p[1];
  if(k === 'letters') return +id > 0;
  var list = { talk: D.TW, story: D.LG, sign: D.LS, sound: D.CV, pattern: D.PAT }[k];
  return !!list && list.some(function(x){ return x.id === id; });
}
D.CAN.forEach(function(c){ if(!testOk(c.test)) bad.push('can-do "' + c.say + '": unknown ' + c.test); });
Object.keys(D.UNITS).forEach(function(k){ var u = D.UNITS[k];
  u.sounds.forEach(function(id){ if(!testOk('sound:' + id)) bad.push('unit ' + k + ': no sound ' + id); });
  if(u.talk && !testOk('talk:' + u.talk)) bad.push('unit ' + k + ': no talk ' + u.talk);
  if(u.pattern && !testOk('pattern:' + u.pattern)) bad.push('unit ' + k + ': no pattern ' + u.pattern);
  if(u.pattern && testOk('pattern:' + u.pattern) && !D.PAT.find(function(p){ return p.id === u.pattern; }).items.some(function(it){ return it.k === 'notice'; })) bad.push('unit ' + k + ': pattern ' + u.pattern + ' has no notice item');
  if(!testOk('sign:' + u.sign)) bad.push('unit ' + k + ': no sign ' + u.sign);
});
eq('a course can-do about ordering is met in Harbor Town\'s cafe', D.cando('I can order food and drinks with 주세요'), 'talk:cafe');
eq('a course can-do no rule knows waits for its unit', D.cando('I can remember the words in Animals'), null);
['I can hear the difference between 달, 탈 and 딸', 'I can check in at a hotel with my name and reservation'].forEach(function(t){ if(!testOk(D.cando(t) || 'x:x')) bad.push('can-do "' + t + '" has no test'); });

if(bad.length){ console.log(bad.join('\n')); console.log('deck: ' + bad.length + ' problem(s)'); process.exit(1); }
console.log('deck: all ' + n + ' checks passed');
