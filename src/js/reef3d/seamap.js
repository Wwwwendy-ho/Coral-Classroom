  /* ---------- The sea chart: every region of Coral Classroom on one map ----------
     The treasure map gains a second page, The sea: a drawn chart with an island for each region of the language
     school (see the architecture doc). Coral Cove, the flashcard reef, is in the middle and is where you are;
     the others show what they will teach and open one by one as they're built. Only profiles with a language
     course see it for now (reefCourseOn). Tapping an island shows its card; Coral Cove's card leads back to the
     board's own map. */
  var REEF_REGIONS = [
    { id:'cove', say:'Coral Cove, for vocabulary and memory.', name:'Coral Cove', teaches:'Vocabulary and memory', x:150, y:198, open:true,
      about:'The flashcard reef. Every word you meet anywhere ends up here, reviewed just when you are about to forget it.' },
    { id:'deck', say:'Captain\'s Deck, for your plan and progress.', name:'Captain\'s Deck', teaches:'Plan and progress', x:150, y:58,
      about:'Today\'s voyage, your course with its dates, checkpoints, and what you can now do.' },
    { id:'lagoon', say:'Story Lagoon, for listening and reading.', name:'Story Lagoon', teaches:'Listening and reading', x:62, y:124,
      about:'Short stories and conversations made from words you know, to listen to first and then read.' },
    { id:'caves', say:'Echo Caves, for pronunciation.', name:'Echo Caves', teaches:'Pronunciation', x:238, y:124,
      about:'The sounds you mix up, and shadowing a native voice with your pitch shown beside it.' },
    { id:'town', say:'Harbor Town, for conversation.', name:'Harbor Town', teaches:'Conversation', x:52, y:252,
      about:'Townsfolk for each part of your trip: cafes, taxis, shops and a hotel, all in Korean.' },
    { id:'reef', say:'Pattern Reef, for grammar.', name:'Pattern Reef', teaches:'Grammar', x:248, y:252,
      about:'One sentence pattern at a time: build it, break it and rebuild it.' },
    { id:'beach', say:'Bottle Beach, for writing.', name:'Bottle Beach', teaches:'Writing', x:92, y:340,
      about:'Messages in bottles, a travel journal, and a pen-pal who writes back.' },
    { id:'light', say:'The Lighthouse, for culture and real life.', name:'The Lighthouse', teaches:'Culture and real life', x:210, y:340,
      about:'Real menus, signs and tickets, and the manners that go with them.' }
  ];
  // Each island's picture, drawn around (0, 0) in map ink and soft colour
  var SEA_ART = {
    cove: '<path d="M-14 6c-2-8 1-14 4-18M-14 6c-6-5-9-9-9-15M-14 6c5-4 9-10 9-17M4 6c0-9 3-13 7-17M4 6c-5-6-6-11-5-17M14 6c3-6 7-8 10-11" stroke="#e8604e" stroke-width="3.2" stroke-linecap="round" fill="none"/><circle cx="-23" cy="-9" r="2.4" fill="#e8604e"/><circle cx="11" cy="-11" r="2.4" fill="#e8604e"/><circle cx="24" cy="-5" r="2.4" fill="#e8604e"/>',
    deck: '<circle r="13" fill="none" stroke="#7a4f22" stroke-width="3"/><circle r="4" fill="#7a4f22"/><path d="M0-21V21M-21 0H21M-15-15 15 15M15-15-15 15" stroke="#7a4f22" stroke-width="2.4" stroke-linecap="round"/>',
    lagoon: '<path d="M-16-2h14v14h-14zM2-2h14v14H2z" fill="#fff8e6" stroke="#7a4f22" stroke-width="2" stroke-linejoin="round"/><path d="M-13 3h8M-13 7h8M5 3h8M5 7h8" stroke="#2f8f95" stroke-width="1.6" stroke-linecap="round"/><path d="M-2-2c0-4 4-6 4-6" stroke="#7a4f22" stroke-width="1.6" fill="none"/>',
    caves: '<path d="M-20 10c0-16 8-26 20-26S20-6 20 10z" fill="#6f6a5c" stroke="#4a3115" stroke-width="2"/><path d="M-9 10c0-9 4-14 9-14s9 5 9 14z" fill="#2b2a26"/><path d="M24-12c3 3 3 7 0 10M28-16c5 5 5 13 0 18" stroke="#2f8f95" stroke-width="2" fill="none" stroke-linecap="round"/>',
    town: '<path d="M-20 10V-4l8-7 8 7v14zM-2 10V-8l9-8 9 8v18z" fill="#fff8e6" stroke="#7a4f22" stroke-width="2" stroke-linejoin="round"/><path d="M-21-3l9-9 9 9M-3-7l10-10 10 10" fill="none" stroke="#c2553e" stroke-width="3" stroke-linejoin="round"/><path d="M-14 10V3h4v7M5 10V2h4v8" fill="#2f8f95"/><path d="M18 10h12M22 10v5M28 10v5" stroke="#7a4f22" stroke-width="2"/>',
    reef: '<rect x="-17" y="-2" width="11" height="11" rx="2" fill="#2f8f95"/><rect x="-5" y="-2" width="11" height="11" rx="2" fill="#e8a33d"/><rect x="7" y="-2" width="11" height="11" rx="2" fill="#2f8f95"/><rect x="-11" y="-14" width="11" height="11" rx="2" fill="#e8604e"/><rect x="1" y="-14" width="11" height="11" rx="2" fill="#7a4fc2"/>',
    beach: '<g transform="rotate(-28)"><rect x="-6" y="-12" width="12" height="20" rx="5" fill="#8fd3a8" stroke="#2f6b4f" stroke-width="2"/><rect x="-3" y="-18" width="6" height="7" rx="1.5" fill="#8fd3a8" stroke="#2f6b4f" stroke-width="2"/><rect x="-3" y="-21" width="6" height="4" rx="1" fill="#a8814f"/><path d="M-3-4h6M-3 0h6" stroke="#fff8e6" stroke-width="1.6"/></g>',
    light: '<path d="M-7 12l3-26h8l3 26z" fill="#fff8e6" stroke="#7a4f22" stroke-width="2" stroke-linejoin="round"/><path d="M-6 4h12M-5-4h10" stroke="#c2553e" stroke-width="4"/><rect x="-6" y="-21" width="12" height="7" rx="1.5" fill="#ffd36b" stroke="#7a4f22" stroke-width="2"/><path d="M-4-23l4-5 4 5" fill="#c2553e"/><path d="M8-18l18-7M8-17l18 4" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>'
  };
  function reefSeaHTML(view){
    var W = 300, H = 390, c = REEF_REGIONS[0];
    var routes = REEF_REGIONS.slice(1).map(function(r){
      var mx = (c.x + r.x) / 2 + (r.y - c.y) * .18, my = (c.y + r.y) / 2 - (r.x - c.x) * .18;   // a gentle curve, not a ruler line
      return '<path d="M' + c.x + ' ' + c.y + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + r.x + ' ' + r.y + '" fill="none" stroke="#b5452f" stroke-width="2.4" stroke-dasharray="2 8" stroke-linecap="round" opacity=".75"/>';
    }).join('');
    var isles = REEF_REGIONS.map(function(r){
      return '<g transform="translate(' + r.x + ' ' + (r.y - 4) + ')"><ellipse cx="0" cy="14" rx="34" ry="13" fill="#e9d29c" stroke="#a8814f" stroke-width="1.6"/>' +
        '<ellipse cx="0" cy="16" rx="42" ry="17" fill="none" stroke="#7fbdb8" stroke-width="1.4" opacity=".7"/>' + SEA_ART[r.id] + '</g>';
    }).join('');
    // waves and a compass, so the chart reads as sea
    var waves = [[24, 44], [262, 46], [118, 290], [196, 268], [30, 196], [270, 186], [150, 372], [252, 372]].map(function(p){
      return '<path d="M' + p[0] + ' ' + p[1] + 'q5-5 10 0t10 0" fill="none" stroke="#7fbdb8" stroke-width="1.6" stroke-linecap="round"/>'; }).join('');
    var compass = '<g transform="translate(274 300)" opacity=".8"><circle r="13" fill="none" stroke="#a8814f" stroke-width="1.2"/><path d="M0-17L4 0 0 17-4 0z" fill="#b5452f"/><path d="M-17 0L0 3 17 0 0-3z" fill="#a8814f"/><text y="-20" text-anchor="middle" font-size="9" font-weight="800" fill="#7a4f22">N</text></g>';
    var labels = REEF_REGIONS.map(function(r){
      return '<button type="button" class="r3-sea-isle' + (r.open ? ' open' : '') + '" data-sea="' + r.id + '" style="left:' + (r.x / W * 100).toFixed(1) + '%;top:' + (r.y / H * 100).toFixed(1) + '%" aria-label="' + esc(r.name) + ': ' + esc(r.teaches) + (r.open ? '' : ', opening soon') + '">' +
        '<span class="r3-sea-name">' + esc(r.name) + '</span><span class="r3-sea-tag">' + (r.open ? 'You are here' : 'Opening soon') + '</span></button>';
    }).join('');
    return '<div class="r3-sea" role="tabpanel" aria-label="The sea"><div class="r3-sea-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + waves + routes + compass + isles +
      '</svg>' + labels + '<span class="r3-sea-me" style="left:' + (c.x / W * 100).toFixed(1) + '%;top:' + ((c.y - 30) / H * 100).toFixed(1) + '%" aria-hidden="true">' + reefGuideMini(view.night) + '</span></div>' +
      '<div class="r3-sea-info" aria-live="polite"></div></div>';
  }
  function reefSeaInfo(ov, id){
    var r = REEF_REGIONS.find(function(x){ return x.id === id; }), box = ov.querySelector('.r3-sea-info'); if(!r || !box) return;
    ov.querySelectorAll('.r3-sea-isle').forEach(function(b){ b.classList.toggle('picked', b.dataset.sea === id); });
    box.innerHTML = '<b>' + esc(r.name) + '</b><small>' + esc(r.teaches) + '</small><p>' + esc(r.about) + '</p>' +
      (r.open ? '<button type="button" class="r3-btn main" data-sea-tab="cove">' + ccIcon('map') + ' Open Coral Cove</button>' : '<span class="r3-sea-soon">' + ccIcon('sparkle') + ' Opening soon</span>');
    try { Speech.speak(r.say); } catch(e){}
  }
