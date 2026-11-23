  /* ---------- CAPTAIN'S DECK: the voyage planner and the tables that tie the regions together ----------
     Kept apart from deck.js and free of screen code, so tools/check/test_deck.js can run deckPlan() on made-up
     progress. deck.js gathers the real progress (the learner model, My words, the course and each region's
     localStorage) into the shape deckPlan() reads, then draws the screens. */

  // Each region as a leg shows it: its name and its drawn icon (the same as the sea chart's, seamap.js)
  var DECK_REGION = {
    cove: ['Coral Cove', 'map'], lagoon: ['Story Lagoon', 'story'], town: ['Harbor Town', 'talk'], caves: ['Echo Caves', 'mic'],
    reef: ['Pattern Reef', 'sentence'], beach: ['Bottle Beach', 'bottle'], light: ['The Lighthouse', 'lighthouse']
  };
  var DECK_MAX_LEGS = 4;

  /* Today's voyage, from what the regions say about her:
       review   { mw: true, n, deckId, name }   words due in My words, or the Coral Cove deck with the most cards due
       unit     { deckId, name, n, unit }       the deck the course's current unit is teaching, if it has cards to do
       story    { id, en }                      Story Lagoon's best fit (input)
       talk     { id, en } / letter { id, en }  the next Harbor Town talk and the next bottle (output: one of them)
       sound    { id, label }                   her shakiest tricky sound in Echo Caves, only when there is one
       repair   { id, en }                      the Pattern Reef pattern with the most slips to repair, only then
       sign     { id, en }                      a Lighthouse sign not read yet, a short extra leg on light days
       day      the day number (days since 1970), which turns the output leg and the skill leg between their two kinds
     Order: what's due first (forgetting is the one thing that can't wait), then the course's new words, then one
     input leg and one output leg, then a skill leg only when something is weak. Never more than four legs: when all
     five would fit, the unit's deck gives way, since the review leg already draws on the unit's decks (Daily Plan).
     A day with fewer than three legs gets a sign to read, so a voyage is never just one stop. */
  function deckPlan(p){
    p = p || {};
    var day = p.day || 0, legs = [];
    function leg(kind, region, item, title, min, why, any){
      return { key: kind + ':' + (item || 'any'), kind: kind, region: region, item: item || null, any: !!any,
        title: title, min: min, why: why, icon: DECK_REGION[region][1], place: DECK_REGION[region][0] };
    }
    var r = p.review, u = p.unit;
    if(r && r.n > 0){
      var min = Math.max(2, Math.min(10, Math.ceil(r.n * 0.4)));
      legs.push(r.mw ? leg('cards', 'cove', r.deckId, 'Review ' + r.n + ' of my words', min, 'Due today, before they fade')
        : leg('cards', 'cove', r.deckId, 'Review ' + r.name, min, r.n + ' card' + (r.n === 1 ? '' : 's') + ' due today'));
    }
    if(u && u.n > 0 && !(r && r.deckId === u.deckId))
      legs.push(leg('cards', 'cove', u.deckId, 'Learn ' + u.name, 5, 'New words for ' + (u.unit || 'this unit')));
    if(p.story) legs.push(leg('story', 'lagoon', p.story.id, 'Read "' + p.story.en + '"', 5, 'The best fit for the words you know'));
    var out = p.talk && p.letter ? (day % 2 ? 'letter' : 'talk') : p.talk ? 'talk' : p.letter ? 'letter' : null;
    if(out === 'talk') legs.push(leg('talk', 'town', p.talk.id, 'Talk with ' + (/^a /i.test(p.talk.en) ? '' : 'the ') + p.talk.en.toLowerCase(), 5, 'Say it in a real conversation'));
    if(out === 'letter') legs.push(leg('letter', 'beach', p.letter.id, 'Answer 지수\'s bottle', 5, '"' + p.letter.en + '"'));
    var skill = p.sound && p.repair ? (day % 2 ? 'repair' : 'sound') : p.sound ? 'sound' : p.repair ? 'repair' : null;
    if(skill === 'sound') legs.push(leg('sound', 'caves', p.sound.id, 'Hear ' + p.sound.label + ' apart', 3, 'A sound you have been mixing up', true));
    if(skill === 'repair') legs.push(leg('pattern', 'reef', p.repair.id, 'Repair "' + p.repair.en + '"', 5, 'A pattern your slips point to'));
    if(legs.length > DECK_MAX_LEGS){
      var ui = legs.findIndex(function(l){ return u && l.kind === 'cards' && l.item === u.deckId; });
      legs.splice(ui >= 0 ? ui : DECK_MAX_LEGS, 1);
    }
    if(legs.length < 3 && p.sign) legs.push(leg('sign', 'light', p.sign.id, 'Read the ' + p.sign.en.toLowerCase(), 3, 'Korean as you will see it on your trip'));
    return legs.slice(0, DECK_MAX_LEGS);
  }
  // The leg a finished activity ticks off: the same kind and item, or a leg that takes any item of its kind (a round
  // of sound pairs counts whatever came up). An exact match goes first, so a round of the unit's deck ticks the
  // unit's leg rather than the review.
  function deckLegFor(legs, done, kind, item){
    var open = legs.filter(function(l){ return l.kind === kind && !done[l.key]; });
    return open.find(function(l){ return l.item === item; }) || open.find(function(l){ return l.any || l.item == null; }) || null;
  }

  /* Trip readiness: the ten situations of the trip, and the content in each region tagged with them. A situation is
     as ready as the share of its pieces she has done: a story read, a talk had, a sign read, a manners note read. */
  var DECK_SITS = [
    { id:'arrive', en:'Arriving', icon:'globe', lagoon:['arrive'], town:[], sign:[], note:['bow'] },
    { id:'hotel', en:'The hotel', icon:'bed', lagoon:['hotel'], town:['hotel'], sign:['hotel'], note:['shoes'] },
    { id:'cafe', en:'Cafes', icon:'cup', lagoon:['cafe'], town:['cafe'], sign:['cafe'], note:[] },
    { id:'restaurant', en:'Restaurants', icon:'bowl', lagoon:['restaurant'], town:['restaurant'], sign:['restaurant'], note:['server', 'tips', 'table'] },
    { id:'shopping', en:'Shopping', icon:'bag', lagoon:['shopping', 'market'], town:['shop'], sign:['store'], note:['hands'] },
    { id:'subway', en:'The subway', icon:'train', lagoon:['subway'], town:['subway'], sign:['subway'], note:[] },
    { id:'taxi', en:'Taxis', icon:'car', lagoon:['taxi'], town:['taxi'], sign:['taxi'], note:[] },
    { id:'way', en:'Directions', icon:'compass', lagoon:['way'], town:[], sign:['bus', 'toilet', 'door'], note:[] },
    { id:'meet', en:'Meeting people', icon:'wave', lagoon:['meet', 'weather', 'goodbye'], town:['friend'], sign:[], note:['polite', 'titles'] },
    { id:'pharmacy', en:'The pharmacy', icon:'plus', lagoon:[], town:['pharmacy'], sign:['pharmacy'], note:[] }
  ];
  // done: { lagoon: {id:1}, town: {...}, sign: {...}, note: {...} } -> [{ sit, got, all, share }] and the overall share
  function deckReadiness(done){
    var rows = DECK_SITS.map(function(s){
      var got = 0, all = 0;
      ['lagoon', 'town', 'sign', 'note'].forEach(function(k){ s[k].forEach(function(id){ all++; if(done[k] && done[k][id]) got++; }); });
      return { sit: s, got: got, all: all, share: all ? got / all : 0 };
    });
    return { rows: rows, share: rows.reduce(function(t, r){ return t + r.share; }, 0) / rows.length };
  }

  /* What you can do: plain statements, each met by something done in a region. `test` names the check deck.js runs
     (deckCanMet): talk:<id> a Harbor Town talk done well (two answers or more right the first time), story:<id> a
     Story Lagoon story read, sign:<id> a sign with both questions right, sound:<id> a sound contrast heard right lately,
     pattern:<id> a pattern mastered, letters:<n> that many bottles answered. */
  var DECK_CAN = [
    { say:'Greet someone and introduce yourself', test:'talk:friend' },
    { say:'Order at a cafe', test:'talk:cafe' },
    { say:'Order a meal and ask for the bill', test:'talk:restaurant' },
    { say:'Shop for clothes and ask the price', test:'talk:shop' },
    { say:'Tell a taxi where to go', test:'talk:taxi' },
    { say:'Find your train on the subway', test:'talk:subway' },
    { say:'Check in at a hotel', test:'talk:hotel' },
    { say:'Ask a pharmacist for help', test:'talk:pharmacy' },
    { say:'Follow a conversation at the airport', test:'story:arrive' },
    { say:'Ask the way and follow the answer', test:'story:way' },
    { say:'Read a cafe menu board', test:'sign:cafe' },
    { say:'Read a subway sign', test:'sign:subway' },
    { say:'Find the restroom', test:'sign:toilet' },
    { say:'Hear 달, 탈 and 딸 apart', test:'sound:t' },
    { say:'Count things with the right counter', test:'pattern:count' },
    { say:'Say what you did yesterday', test:'pattern:past' },
    { say:'Write a short letter in Korean', test:'letters:1' },
    { say:'Write about your day, five letters in', test:'letters:5' }
  ];
  // The course's own can-do statements (library.js), matched to the same tests by their words, so a statement can be
  // met before its unit is finished. A statement no rule matches is met when its unit is done.
  var DECK_CANDO_RULES = [
    [/달, 탈|hear the difference/i, 'sound:t'], [/read any hangul/i, 'sign:subway'], [/write my name/i, 'letters:1'],
    [/greet|introduce myself/i, 'talk:friend'], [/thank you, sorry/i, 'talk:friend'],
    [/order food|hot or cold|for here or to go/i, 'talk:cafe'], [/water, the menu or the bill/i, 'talk:restaurant'],
    [/prices|shop purchase|pay by card/i, 'talk:shop'], [/count things/i, 'pattern:count'], [/café order/i, 'talk:cafe'],
    [/where a place is|left, right/i, 'story:way'], [/taxi/i, 'talk:taxi'], [/family|what i like|weather|question back/i, 'letters:3'],
    [/check in at a hotel/i, 'talk:hotel'], [/restroom/i, 'sign:toilet'], [/ask for help/i, 'talk:pharmacy'],
    [/five sentences|in writing/i, 'letters:5']
  ];
  function deckCandoTest(text){
    var r = DECK_CANDO_RULES.find(function(x){ return x[0].test(String(text || '')); });
    return r ? r[1] : null;
  }

  /* A unit's checkpoint: a few items from the regions, picked by the unit (its key in library.js's Korean course).
     sounds: contrast ids in Echo Caves (one pair each); talk: a Harbor Town talk (its first exchange); pattern: a
     Pattern Reef pattern (its first "notice it" item); sign: a Lighthouse sign (its first question). A unit not listed
     (a course planned for other subjects, or a catch-up week) uses its place in the course to pick from the list. */
  var DECK_UNITS = {
    hangul: { sounds:['k', 't', 'p'], talk:null, pattern:null, sign:'toilet' },
    hello: { sounds:['eo', 's'], talk:'friend', pattern:'topic', sign:'door' },
    food: { sounds:['c', 'eu'], talk:'cafe', pattern:'request', sign:'cafe' },
    numbers: { sounds:['p', 'k'], talk:'shop', pattern:'count', sign:'store' },
    review1: { sounds:['t', 'stop'], talk:'restaurant', pattern:'object', sign:'restaurant' },
    around: { sounds:['nasal', 's'], talk:'taxi', pattern:'place', sign:'subway' },
    you: { sounds:['eo', 'eu'], talk:'friend', pattern:'want', sign:'bus' },
    stay: { sounds:['c', 'nasal'], talk:'hotel', pattern:'have', sign:'hotel' },
    final: { sounds:['k', 't'], talk:'pharmacy', pattern:'past', sign:'taxi' }
  };
  var DECK_UNIT_ORDER = ['hangul', 'hello', 'food', 'numbers', 'review1', 'around', 'you', 'stay', 'final'];
  function deckUnitPicks(unit, i){
    return DECK_UNITS[unit && unit.key] || DECK_UNITS[DECK_UNIT_ORDER[Math.min(DECK_UNIT_ORDER.length - 1, Math.max(0, i || 0))]];
  }
