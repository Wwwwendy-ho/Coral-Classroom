/* ============================================================================
   culture-packs.js — Modular multi-language & cultural theming packs
   Exposes window.CulturePacks inside the concatenated app IIFE (and in Node).
   ============================================================================ */
(function(){
  'use strict';

  var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  var registry = Object.create(null);

  function cloneSafe(val){
    if(Array.isArray(val)) return val.map(cloneSafe);
    if(val && typeof val === 'object'){
      var out = {};
      var keys = Object.keys(val);
      for(var i = 0; i < keys.length; i++){
        var k = keys[i];
        if(k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        out[k] = cloneSafe(val[k]);
      }
      return out;
    }
    return val;
  }

  function resolveContext(langId, mode){
    var ws = (root.WorldState && typeof root.WorldState.get === 'function') ? root.WorldState.get() : null;
    var resolvedLang = (typeof langId === 'string' && langId) ? langId.toLowerCase() : (ws && ws.activeLanguage ? ws.activeLanguage : 'ko');
    var resolvedMode = (mode === 'oceanic' || mode === 'culture') ? mode : (ws && ws.cultureMode ? ws.cultureMode : 'oceanic');
    return { lang: resolvedLang, mode: resolvedMode };
  }

  function registerPack(langId, pack){
    if(typeof langId !== 'string' || !langId.trim() || !pack || typeof pack !== 'object') return false;
    var id = langId.trim().toLowerCase();
    registry[id] = cloneSafe(pack);
    return true;
  }

  function getPack(langId, mode){
    var ctx = resolveContext(langId, mode);
    var base = registry.oceanic || {};
    var langPack = registry[ctx.lang] || base;

    if(ctx.lang === 'oceanic'){
      return cloneSafe(base);
    }

    if(ctx.mode === 'oceanic'){
      return {
        id: langPack.id || ctx.lang,
        label: langPack.label || ctx.lang.toUpperCase(),
        nativeLabel: langPack.nativeLabel || langPack.label || ctx.lang.toUpperCase(),
        mode: 'oceanic',
        theme: cloneSafe(base.theme || {}),
        roomProps: cloneSafe(base.roomProps || {}),
        nightMarket: cloneSafe(base.nightMarket || []),
        stickers: cloneSafe(base.stickers || []),
        recipes: cloneSafe(langPack.recipes || base.recipes || {}),
        signage: cloneSafe(langPack.signage || base.signage || {}),
        politeness: cloneSafe(langPack.politeness || base.politeness || {}),
        blockForge: cloneSafe(langPack.blockForge || base.blockForge || []),
        signPuzzles: cloneSafe(langPack.signPuzzles || base.signPuzzles || []),
        showtime: cloneSafe(langPack.showtime || base.showtime || {}),
        constellations: cloneSafe(langPack.constellations || base.constellations || [])
      };
    }

    return {
      id: langPack.id || ctx.lang,
      label: langPack.label || ctx.lang.toUpperCase(),
      nativeLabel: langPack.nativeLabel || langPack.label || ctx.lang.toUpperCase(),
      mode: 'culture',
      theme: cloneSafe(langPack.theme || base.theme || {}),
      roomProps: cloneSafe(langPack.roomProps || base.roomProps || {}),
      nightMarket: cloneSafe(langPack.nightMarket || base.nightMarket || []),
      stickers: cloneSafe(langPack.stickers || base.stickers || []),
      recipes: cloneSafe(langPack.recipes || base.recipes || {}),
      signage: cloneSafe(langPack.signage || base.signage || {}),
      politeness: cloneSafe(langPack.politeness || base.politeness || {}),
      blockForge: cloneSafe(langPack.blockForge || base.blockForge || []),
      signPuzzles: cloneSafe(langPack.signPuzzles || base.signPuzzles || []),
      showtime: cloneSafe(langPack.showtime || base.showtime || {}),
      constellations: cloneSafe(langPack.constellations || base.constellations || [])
    };
  }

  function listLanguages(){
    var out = [];
    var keys = Object.keys(registry);
    for(var i = 0; i < keys.length; i++){
      var id = keys[i];
      if(id === 'oceanic') continue;
      var p = registry[id];
      out.push({
        id: id,
        label: p.label || id.toUpperCase(),
        nativeLabel: p.nativeLabel || p.label || id.toUpperCase()
      });
    }
    return out;
  }

  function getRoomProps(venueId, langId, mode){
    var pack = getPack(langId, mode);
    var map = pack.roomProps || {};
    var key = typeof venueId === 'string' ? venueId : 'default';
    return cloneSafe(map[key] || map.default || []);
  }

  function getOrderRecipes(venueId, langId, mode){
    var pack = getPack(langId, mode);
    var map = pack.recipes || {};
    var key = typeof venueId === 'string' ? venueId : 'cafe';
    return cloneSafe(map[key] || map.cafe || []);
  }

  function getSignage(venueId, mastery, langId, mode){
    var pack = getPack(langId, mode);
    var map = pack.signage || {};
    var key = typeof venueId === 'string' ? venueId : 'cafe';
    var entry = map[key] || map.cafe || { tiers: [] };
    var tiers = Array.isArray(entry.tiers) ? entry.tiers : [];
    var m = typeof mastery === 'number' && isFinite(mastery) ? Math.max(0, Math.min(tiers.length - 1, Math.floor(mastery))) : 0;
    return cloneSafe({
      venueId: key,
      icon: entry.icon || '🐚',
      tier: tiers[m] || { label: key, romanized: '', gloss: '' },
      tiers: tiers
    });
  }

  function getNightMarketItems(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.nightMarket || []);
  }

  function getPolitenessRules(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.politeness || {});
  }

  function getBlockForgeRecipes(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.blockForge || []);
  }

  function getSignPuzzles(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.signPuzzles || []);
  }

  function getShowtimePrompts(gameId, langId, mode){
    var pack = getPack(langId, mode);
    var map = pack.showtime || {};
    if(typeof gameId === 'string' && map[gameId]) return cloneSafe(map[gameId]);
    return cloneSafe(map['rhythm-tide'] || []);
  }

  function getConstellationWords(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.constellations || []);
  }

  function getCameraStickers(langId, mode){
    var pack = getPack(langId, mode);
    return cloneSafe(pack.stickers || []);
  }

  /* -------------------- 1. Universal Oceanic Classic ('oceanic') -------------------- */
  registerPack('oceanic', {
    id: 'oceanic',
    label: 'Oceanic Classic',
    nativeLabel: 'Oceanic Classic',
    theme: {
      palette: 'coral-harbor',
      awningStyle: 'striped-sail',
      lanternStyle: 'shell-glass',
      bannerAccent: '#2ec4b6'
    },
    roomProps: {
      default: ['shell-lamp', 'driftwood-shelf', 'sea-glass-jar'],
      cafe: ['espresso-coral-machine', 'scallop-pastry-case', 'driftwood-counter', 'shell-lamp'],
      restaurant: ['kelp-cauldron', 'pearl-plate-stack', 'harbor-menu-board', 'tide-bell'],
      shop: ['compass-display', 'woven-kelp-basket', 'bottled-starlight', 'ribbon-spool'],
      taxi: ['wave-meter', 'shell-steering-wheel', 'harbor-route-map'],
      subway: ['tide-timetable', 'coral-turnstile', 'platform-lantern'],
      hotel: ['conch-concierge-bell', 'pearl-key-rack', 'velvet-tide-sofa'],
      pharmacy: ['sea-mineral-apothecary', 'kelp-balm-jars', 'mortar-and-shell'],
      friend: ['seashell-windchime', 'story-cushion', 'teacup-tray'],
      lighthouse: ['prism-lens', 'star-chart-table', 'weather-vane'],
      market: ['sailcloth-canopy', 'rope-lanterns', 'wooden-crate-stall']
    },
    recipes: {
      cafe: [
        { id: 'sea-salt-latte', name: 'Sea-Salt Latte', target: 'Sea-Salt Latte', romanized: '', gloss: 'Creamy harbor latte', icon: '☕', ingredients: ['milk', 'espresso', 'sea-salt'] },
        { id: 'berry-shell-tart', name: 'Berry Shell Tart', target: 'Berry Shell Tart', romanized: '', gloss: 'Sweet coastal pastry', icon: '🥐', ingredients: ['flour', 'berries', 'butter'] },
        { id: 'honey-kelp-tea', name: 'Honey Kelp Tea', target: 'Honey Kelp Tea', romanized: '', gloss: 'Warm soothing tea', icon: '🍵', ingredients: ['honey', 'water', 'mint'] }
      ],
      restaurant: [
        { id: 'harbor-chowder', name: 'Harbor Chowder', target: 'Harbor Chowder', romanized: '', gloss: 'Warm sea-herb soup', icon: '🍲', ingredients: ['broth', 'herbs', 'bread'] },
        { id: 'kelp-roll', name: 'Crispy Kelp Roll', target: 'Crispy Kelp Roll', romanized: '', gloss: 'Toasted rice & kelp', icon: '🍙', ingredients: ['rice', 'kelp', 'sesame'] }
      ],
      shop: [
        { id: 'pearl-keyring', name: 'Pearl Keyring', target: 'Pearl Keyring', romanized: '', gloss: 'Harbor keepsake', icon: '🔑', ingredients: ['pearl', 'ribbon'] },
        { id: 'shell-postcard', name: 'Shell Postcard', target: 'Shell Postcard', romanized: '', gloss: 'Illustrated cove card', icon: '✉️', ingredients: ['paper', 'stamp'] }
      ],
      pharmacy: [
        { id: 'kelp-balm', name: 'Soothing Kelp Balm', target: 'Soothing Kelp Balm', romanized: '', gloss: 'Gentle sea balm', icon: '🧴', ingredients: ['kelp', 'aloe'] }
      ]
    },
    signage: {
      cafe: { icon: '☕', tiers: [{ label: 'Harbor Cafe', romanized: '', gloss: 'Cozy sea-breeze coffee' }, { label: 'Open for Tea & Pastries', romanized: '', gloss: 'Fresh baked daily' }, { label: 'Welcome! What can I brew?', romanized: '', gloss: 'Friendly greeting' }] },
      restaurant: { icon: '🍲', tiers: [{ label: 'Tidepool Kitchen', romanized: '', gloss: 'Warm coastal meals' }, { label: 'Today: Harbor Chowder', romanized: '', gloss: 'Daily special' }, { label: 'Take a seat by the window!', romanized: '', gloss: 'Warm welcome' }] },
      shop: { icon: '🛍️', tiers: [{ label: 'Coral Curios', romanized: '', gloss: 'Gifts & keepsakes' }, { label: 'Shells, Maps & Ribbons', romanized: '', gloss: 'Travel supplies' }, { label: 'Find a treasure for home!', romanized: '', gloss: 'Shopkeeper invite' }] },
      hotel: { icon: '🏨', tiers: [{ label: 'Whale Crest Inn', romanized: '', gloss: 'Restful harbor stay' }, { label: 'Check-In Desk', romanized: '', gloss: 'Lobby sign' }, { label: 'Sweet dreams by the tide!', romanized: '', gloss: 'Evening wish' }] },
      lighthouse: { icon: '🗼', tiers: [{ label: 'Starlight Beacon', romanized: '', gloss: 'Harbor lookout' }, { label: 'Weather & Tide Watch', romanized: '', gloss: 'Observatory' }, { label: 'Guiding every sailor home', romanized: '', gloss: 'Beacon motto' }] }
    },
    nightMarket: [
      { id: 'sea-salt-pretzel', name: 'Sea-Salt Pretzel', target: 'Sea-Salt Pretzel', gloss: 'Warm twisted bread', icon: '🥨', price: 3 },
      { id: 'moon-shell-tart', name: 'Moon Shell Tart', target: 'Moon Shell Tart', gloss: 'Golden custard tart', icon: '🥧', price: 4 },
      { id: 'pearl-boba', name: 'Pearl Harbor Tea', target: 'Pearl Harbor Tea', gloss: 'Sweet milk tea', icon: '🧋', price: 4 },
      { id: 'starfruit-skewer', name: 'Starfruit Skewer', target: 'Starfruit Skewer', gloss: 'Glazed fruit stick', icon: '🍡', price: 3 }
    ],
    politeness: {
      systemName: 'Harbor Courtesy',
      registers: [
        { id: 'polite', label: 'Polite', description: 'Warm, respectful tone for elders, captains, and shopkeepers.', examples: ['Could I please have one?', 'Thank you very much!'] },
        { id: 'casual', label: 'Friendly', description: 'Relaxed, playful tone for close buddies and sea critters.', examples: ['One of these, please!', 'Thanks, buddy!'] }
      ]
    },
    blockForge: [
      { id: 'forge-sea', parts: ['s', 'ea'], result: 'sea', gloss: 'ocean water', icon: '🌊' },
      { id: 'forge-star', parts: ['st', 'ar'], result: 'star', gloss: 'bright sky light', icon: '⭐' },
      { id: 'forge-shell', parts: ['sh', 'ell'], result: 'shell', gloss: 'coastal treasure', icon: '🐚' }
    ],
    signPuzzles: [
      { id: 'puz-cafe', broken: 'CFAA', fixed: 'CAFE', hint: 'Swap the mischievous crab letters!', gloss: 'Coffee house' },
      { id: 'puz-wave', broken: 'WVEA', fixed: 'WAVE', hint: 'Ocean swell', gloss: 'Ocean wave' }
    ],
    showtime: {
      'rhythm-tide': [
        { prompt: 'Wave', romanized: '', gloss: 'Ocean swell', beat: 2 },
        { prompt: 'Shell', romanized: '', gloss: 'Seaside treasure', beat: 2 },
        { prompt: 'Starlight', romanized: '', gloss: 'Night glow', beat: 3 }
      ],
      'shell-charades': [
        { prompt: 'Swim like a whale', gloss: 'Gentle giant', icon: '🐋' },
        { prompt: 'Sip hot tea', gloss: 'Warm cup', icon: '🍵' }
      ],
      'echo-stage': [
        { prompt: 'Welcome to Coral Cove!', gloss: 'Harbor greeting' },
        { prompt: 'The tide is rising!', gloss: 'Tide call' }
      ],
      'word-splash': [
        { prompt: 'Coral', gloss: 'Reef builder' },
        { prompt: 'Beacon', gloss: 'Lighthouse light' }
      ]
    },
    constellations: [
      { id: 'const-star', word: 'Star', romanized: '', gloss: 'Shining night light', stars: 5 },
      { id: 'const-wave', word: 'Wave', romanized: '', gloss: 'Rolling sea', stars: 4 },
      { id: 'const-moon', word: 'Moon', romanized: '', gloss: 'Silver night orb', stars: 4 },
      { id: 'const-whale', word: 'Whale', romanized: '', gloss: 'Gentle ocean singer', stars: 6 }
    ],
    stickers: [
      { id: 'coral-frame', label: 'Coral Frame', icon: '🪸' },
      { id: 'bubble-heart', label: 'Bubble Heart', icon: '🫧' },
      { id: 'starfish-sparkle', label: 'Starfish Sparkle', icon: '🌟' },
      { id: 'captain-crest', label: 'Captain Crest', icon: '⚓' }
    ]
  });

  /* -------------------- 2. Korean Culture Pack ('ko') -------------------- */
  registerPack('ko', {
    id: 'ko',
    label: 'Korean',
    nativeLabel: '한국어',
    theme: {
      palette: 'dancheong-harbor',
      awningStyle: 'pojangmacha-stripe',
      lanternStyle: 'cheongsachorong',
      bannerAccent: '#e63946'
    },
    roomProps: {
      default: ['cheongsachorong-lantern', 'hanji-screen', 'celadon-vase'],
      cafe: ['hangul-menu-board', 'hanok-wood-counter', 'celadon-espresso-cup', 'cheongsachorong-lantern'],
      restaurant: ['ttukbaegi-pot', 'brass-spoon-set', 'pojangmacha-menu', 'kimchi-jar'],
      shop: ['norigae-display', 'hanji-fan-rack', 'mother-of-pearl-box'],
      taxi: ['seoul-harbor-meter', 't-money-reader', 'route-placard'],
      subway: ['metro-line-strip', 't-money-gate', 'station-bell'],
      hotel: ['ondol-cushion', 'mother-of-pearl-desk', 'brass-key-tag'],
      pharmacy: ['yak-sign', 'herbal-drawer-cabinet', 'ceramic-mortar'],
      friend: ['floor-cushion', 'soban-tea-table', 'paper-lantern'],
      lighthouse: ['star-scroll', 'brass-compass', 'hanji-lamp'],
      market: ['pojangmacha-awning', 'steaming-cart', 'red-paper-lantern']
    },
    recipes: {
      cafe: [
        { id: 'iced-latte', name: '아이스 라떼', target: '아이스 라떼', romanized: 'a-i-seu ra-tte', gloss: 'Iced Latte', icon: '☕', ingredients: ['우유', '커피', '얼음'] },
        { id: 'strawberry-cake', name: '딸기 케이크', target: '딸기 케이크', romanized: 'ttal-gi ke-i-keu', gloss: 'Strawberry Cake', icon: '🍰', ingredients: ['딸기', '크림', '빵'] },
        { id: 'yuja-tea', name: '유자차', target: '유자차', romanized: 'yu-ja-cha', gloss: 'Citron Honey Tea', icon: '🍵', ingredients: ['유자', '꿀', '물'] }
      ],
      restaurant: [
        { id: 'gimbap', name: '김밥', target: '김밥', romanized: 'gim-bap', gloss: 'Seaweed Rice Roll', icon: '🍙', ingredients: ['김', '밥', '당근'] },
        { id: 'bibimbap', name: '비빔밥', target: '비빔밥', romanized: 'bi-bim-bap', gloss: 'Mixed Rice Bowl', icon: '🍚', ingredients: ['밥', '나물', '고추장'] },
        { id: 'tteokbokki', name: '떡볶이', target: '떡볶이', romanized: 'tteok-bok-kki', gloss: 'Spicy Rice Cakes', icon: '🍢', ingredients: ['떡', '고추장', '어묵'] }
      ],
      shop: [
        { id: 'shell-keyring', name: '조개 열쇠고리', target: '조개 열쇠고리', romanized: 'jo-gae yeol-soe-go-ri', gloss: 'Shell Keyring', icon: '🔑', ingredients: ['조개', '고리'] },
        { id: 'postcard', name: '바다 엽서', target: '바다 엽서', romanized: 'ba-da yeop-seo', gloss: 'Ocean Postcard', icon: '✉️', ingredients: ['종이', '우표'] }
      ],
      pharmacy: [
        { id: 'band-aid', name: '반창고', target: '반창고', romanized: 'ban-chang-go', gloss: 'Bandage', icon: '🩹', ingredients: ['거즈', '테이프'] }
      ]
    },
    signage: {
      cafe: {
        icon: '☕',
        tiers: [
          { label: '카페', romanized: 'ka-pe', gloss: 'Cafe' },
          { label: '카페 · 라떼 & 케이크', romanized: 'ka-pe · ra-tte & ke-i-keu', gloss: 'Cafe · Latte & Cake' },
          { label: '어서 오세요! 무엇을 드릴까요?', romanized: 'eo-seo o-se-yo! mu-eo-seul deu-ril-kka-yo?', gloss: 'Welcome! What may I get you?' }
        ]
      },
      restaurant: {
        icon: '🍲',
        tiers: [
          { label: '식당', romanized: 'sik-dang', gloss: 'Restaurant' },
          { label: '오늘의 메뉴: 김밥', romanized: 'o-neu-rui me-nyu: gim-bap', gloss: 'Today’s Menu: Gimbap' },
          { label: '맛있게 드세요!', romanized: 'ma-sit-ge deu-se-yo!', gloss: 'Enjoy your meal!' }
        ]
      },
      shop: {
        icon: '🛍️',
        tiers: [
          { label: '상점', romanized: 'sang-jeom', gloss: 'Shop' },
          { label: '선물 & 기념품', romanized: 'seon-mul & gi-nyeom-pum', gloss: 'Gifts & Souvenirs' },
          { label: '천천히 구경하세요!', romanized: 'cheon-cheon-hi gu-gyeong-ha-se-yo!', gloss: 'Take your time browsing!' }
        ]
      },
      hotel: {
        icon: '🏨',
        tiers: [
          { label: '호텔', romanized: 'ho-tel', gloss: 'Hotel' },
          { label: '체크인 안내', romanized: 'che-keu-in an-nae', gloss: 'Check-in Desk' },
          { label: '편안한 밤 되세요!', romanized: 'pyeon-an-han bam doe-se-yo!', gloss: 'Have a restful night!' }
        ]
      },
      lighthouse: {
        icon: '🗼',
        tiers: [
          { label: '등대', romanized: 'deung-dae', gloss: 'Lighthouse' },
          { label: '별빛 전망대', romanized: 'byeol-bit jeon-mang-dae', gloss: 'Starlight Observatory' },
          { label: '오늘 밤 바다가 참 맑아요', romanized: 'o-neul bam ba-da-ga cham mal-ga-yo', gloss: 'The sea is so clear tonight' }
        ]
      }
    },
    nightMarket: [
      { id: 'tteokbokki', name: '떡볶이', target: '떡볶이', romanized: 'tteok-bok-kki', gloss: 'Simmered Rice Cakes', icon: '🍢', price: 3 },
      { id: 'hotteok', name: '호떡', target: '호떡', romanized: 'ho-tteok', gloss: 'Sweet Filled Pancake', icon: '🥞', price: 3 },
      { id: 'eomuk', name: '어묵', target: '어묵', romanized: 'eo-muk', gloss: 'Warm Fishcake Skewer', icon: '🍡', price: 2 },
      { id: 'bungeoppang', name: '붕어빵', target: '붕어빵', romanized: 'bung-eo-ppang', gloss: 'Fish-Shaped Pastry', icon: '🐟', price: 3 }
    ],
    politeness: {
      systemName: '존댓말 vs 반말',
      registers: [
        {
          id: 'polite',
          label: '존댓말 (Polite)',
          description: 'Ends with -요 or -습니다. Use with elders, Captain Bay, and shopkeepers.',
          examples: ['아이스 라떼 주세요.', '감사합니다!']
        },
        {
          id: 'casual',
          label: '반말 (Casual)',
          description: 'Friendly & direct without -요. Use with close buddies like Pip, Bok, and Kiko.',
          examples: ['이거 하나 줘!', '고마워!']
        }
      ]
    },
    blockForge: [
      { id: 'ko-han', parts: ['ㅎ', 'ㅏ', 'ㄴ'], result: '한', romanized: 'han', gloss: 'one / Korea', icon: '✨' },
      { id: 'ko-mul', parts: ['ㅁ', 'ㅜ', 'ㄹ'], result: '물', romanized: 'mul', gloss: 'water', icon: '💧' },
      { id: 'ko-byeol', parts: ['ㅂ', 'ㅕ', 'ㄹ'], result: '별', romanized: 'byeol', gloss: 'star', icon: '⭐' },
      { id: 'ko-bada', parts: ['바', '다'], result: '바다', romanized: 'ba-da', gloss: 'ocean / sea', icon: '🌊' },
      { id: 'ko-keopi', parts: ['커', '피'], result: '커피', romanized: 'keo-pi', gloss: 'coffee', icon: '☕' }
    ],
    signPuzzles: [
      { id: 'ko-puz-cafe', broken: '가페', fixed: '카페', romanized: 'ka-pe', hint: 'Aspirated ㅋ for Cafe!', gloss: 'Cafe' },
      { id: 'ko-puz-bada', broken: '바타', fixed: '바다', romanized: 'ba-da', hint: 'Soft ㄷ for Sea!', gloss: 'Sea / Ocean' },
      { id: 'ko-puz-haneul', broken: '하놀', fixed: '하늘', romanized: 'ha-neul', hint: 'Flat vowel ㅡ for Sky!', gloss: 'Sky' }
    ],
    showtime: {
      'rhythm-tide': [
        { prompt: '바다', romanized: 'ba-da', gloss: 'Ocean', beat: 2 },
        { prompt: '고래', romanized: 'go-rae', gloss: 'Whale', beat: 2 },
        { prompt: '별빛', romanized: 'byeol-bit', gloss: 'Starlight', beat: 2 },
        { prompt: '감사합니다', romanized: 'gam-sa-ham-ni-da', gloss: 'Thank you', beat: 5 }
      ],
      'shell-charades': [
        { prompt: '수영해요', romanized: 'su-yeong-hae-yo', gloss: 'Swimming!', icon: '🏊' },
        { prompt: '커피 마셔요', romanized: 'keo-pi ma-syeo-yo', gloss: 'Drinking coffee!', icon: '☕' }
      ],
      'echo-stage': [
        { prompt: '안녕하세요!', romanized: 'an-nyeong-ha-se-yo!', gloss: 'Hello!' },
        { prompt: '반가워요!', romanized: 'ban-ga-wo-yo!', gloss: 'Nice to meet you!' }
      ],
      'word-splash': [
        { prompt: '파도', romanized: 'pa-do', gloss: 'Wave' },
        { prompt: '등대', romanized: 'deung-dae', gloss: 'Lighthouse' }
      ]
    },
    constellations: [
      { id: 'ko-byeol', word: '별', romanized: 'byeol', gloss: 'Star', stars: 4 },
      { id: 'ko-bada', word: '바다', romanized: 'ba-da', gloss: 'Ocean', stars: 5 },
      { id: 'ko-dal', word: '달', romanized: 'dal', gloss: 'Moon', stars: 4 },
      { id: 'ko-pado', word: '파도', romanized: 'pa-do', gloss: 'Wave', stars: 5 },
      { id: 'ko-gorae', word: '고래', romanized: 'go-rae', gloss: 'Whale', stars: 6 }
    ],
    stickers: [
      { id: 'ko-fan', label: '태극 부채', icon: '🪭' },
      { id: 'ko-star', label: '한글 별', icon: '🌟' },
      { id: 'ko-pouch', label: '복주머니', icon: '🧧' },
      { id: 'ko-flower', label: '무궁화', icon: '🌺' }
    ]
  });

  /* -------------------- 3. Japanese Example Pack ('ja') -------------------- */
  registerPack('ja', {
    id: 'ja',
    label: 'Japanese',
    nativeLabel: '日本語',
    theme: {
      palette: 'indigo-lantern',
      awningStyle: 'noren-curtain',
      lanternStyle: 'chochin',
      bannerAccent: '#3a86ff'
    },
    roomProps: {
      default: ['chochin-lantern', 'tatami-mat', 'ceramic-teapot'],
      cafe: ['noren-curtain', 'matcha-whisk-set', 'kanji-menu-board'],
      market: ['yatai-cart', 'paper-chochin', 'wooden-sign']
    },
    recipes: {
      cafe: [
        { id: 'matcha-latte', name: '抹茶ラテ', target: '抹茶ラテ', romanized: 'mat-cha ra-te', gloss: 'Matcha Latte', icon: '🍵', ingredients: ['抹茶', '牛乳'] },
        { id: 'ichigo-cake', name: 'いちごケーキ', target: 'いちごケーキ', romanized: 'i-chi-go ke-ki', gloss: 'Strawberry Cake', icon: '🍰', ingredients: ['いちご', 'クリーム'] }
      ],
      restaurant: [
        { id: 'onigiri', name: 'おにぎり', target: 'おにぎり', romanized: 'o-ni-gi-ri', gloss: 'Rice Ball', icon: '🍙', ingredients: ['ごはん', 'のり'] }
      ]
    },
    signage: {
      cafe: {
        icon: '🍵',
        tiers: [
          { label: 'カフェ', romanized: 'ka-fe', gloss: 'Cafe' },
          { label: 'カフェ · 抹茶とケーキ', romanized: 'ka-fe · mat-cha to ke-ki', gloss: 'Cafe · Matcha & Cake' },
          { label: 'いらっしゃいませ！', romanized: 'i-ras-shai-ma-se!', gloss: 'Welcome!' }
        ]
      }
    },
    nightMarket: [
      { id: 'onigiri', name: 'おにぎり', target: 'おにぎり', romanized: 'o-ni-gi-ri', gloss: 'Warm Rice Ball', icon: '🍙', price: 2 },
      { id: 'taiyaki', name: 'たい焼き', target: 'たい焼き', romanized: 'tai-ya-ki', gloss: 'Sweet Fish Pastry', icon: '🐟', price: 3 },
      { id: 'takoyaki', name: 'たこ焼き', target: 'たこ焼き', romanized: 'ta-ko-ya-ki', gloss: 'Octopus Fritters', icon: '🍡', price: 4 }
    ],
    politeness: {
      systemName: '敬語 (Keigo) vs タメ口',
      registers: [
        { id: 'polite', label: '丁寧語 (Polite)', description: 'Uses です / ます endings for elders and shopkeepers.', examples: ['これをください。', 'ありがとうございます。'] },
        { id: 'casual', label: 'タメ口 (Casual)', description: 'Short plain forms for close friends and buddies.', examples: ['これちょうだい！', 'ありがとう！'] }
      ]
    },
    blockForge: [
      { id: 'ja-ai', parts: ['あ', 'い'], result: 'あい', romanized: 'a-i', gloss: 'love', icon: '💗' },
      { id: 'ja-umi', parts: ['う', 'み'], result: 'うみ', romanized: 'u-mi', gloss: 'sea', icon: '🌊' },
      { id: 'ja-hoshi', parts: ['ほ', 'し'], result: 'ほし', romanized: 'ho-shi', gloss: 'star', icon: '⭐' }
    ],
    signPuzzles: [
      { id: 'ja-puz-umi', broken: 'うぬ', fixed: 'うみ', romanized: 'u-mi', hint: 'Kana み for Sea!', gloss: 'Sea' }
    ],
    showtime: {
      'rhythm-tide': [
        { prompt: 'うみ', romanized: 'u-mi', gloss: 'Sea', beat: 2 },
        { prompt: 'ほし', romanized: 'ho-shi', gloss: 'Star', beat: 2 }
      ]
    },
    constellations: [
      { id: 'ja-hoshi', word: 'ほし', romanized: 'ho-shi', gloss: 'Star', stars: 4 },
      { id: 'ja-umi', word: 'うみ', romanized: 'u-mi', gloss: 'Sea', stars: 4 },
      { id: 'ja-tsuki', word: 'つき', romanized: 'tsu-ki', gloss: 'Moon', stars: 4 }
    ],
    stickers: [
      { id: 'ja-sakura', label: 'さくら', icon: '🌸' },
      { id: 'ja-wave', label: 'なみ', icon: '🌊' }
    ]
  });

  /* -------------------- 4. Spanish Example Pack ('es') -------------------- */
  registerPack('es', {
    id: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    theme: {
      palette: 'terracotta-coast',
      awningStyle: 'terracotta-stripe',
      lanternStyle: 'mosaic-glass',
      bannerAccent: '#f4a261'
    },
    roomProps: {
      default: ['mosaic-lantern', 'terracotta-pot', 'painted-tile-shelf'],
      cafe: ['espresso-bar', 'churro-stand', 'tile-menu-board'],
      market: ['fiesta-bunting', 'fruit-crate-stall', 'warm-lanterns']
    },
    recipes: {
      cafe: [
        { id: 'cafe-con-leche', name: 'Café con leche', target: 'Café con leche', romanized: '', gloss: 'Coffee with milk', icon: '☕', ingredients: ['café', 'leche'] },
        { id: 'churros', name: 'Churros', target: 'Churros', romanized: '', gloss: 'Sweet fried pastry', icon: '🥖', ingredients: ['masa', 'azúcar'] }
      ],
      restaurant: [
        { id: 'tacos', name: 'Tacos de pescado', target: 'Tacos de pescado', romanized: '', gloss: 'Coastal fish tacos', icon: '🌮', ingredients: ['tortilla', 'limón'] }
      ]
    },
    signage: {
      cafe: {
        icon: '☕',
        tiers: [
          { label: 'Café', romanized: '', gloss: 'Cafe' },
          { label: 'Café y Churros', romanized: '', gloss: 'Coffee & Churros' },
          { label: '¡Bienvenidos! ¿Qué desea?', romanized: '', gloss: 'Welcome! What would you like?' }
        ]
      }
    },
    nightMarket: [
      { id: 'tacos', name: 'Tacos', target: 'Tacos', gloss: 'Warm street tacos', icon: '🌮', price: 3 },
      { id: 'churros', name: 'Churros', target: 'Churros', gloss: 'Cinnamon sugar churros', icon: '🥖', price: 3 },
      { id: 'agua-fresca', name: 'Agua fresca', target: 'Agua fresca', gloss: 'Chilled fruit drink', icon: '🥤', price: 2 }
    ],
    politeness: {
      systemName: 'Usted vs Tú',
      registers: [
        { id: 'polite', label: 'Usted (Formal)', description: 'Polite form used with elders, captains, and shopkeepers.', examples: ['¿Me da uno, por favor?', '¡Muchas gracias!'] },
        { id: 'casual', label: 'Tú (Friendly)', description: 'Warm, informal form for close friends and buddies.', examples: ['¡Dame uno, porfa!', '¡Gracias, amigo!'] }
      ]
    },
    blockForge: [
      { id: 'es-mar', parts: ['ma', 'r'], result: 'mar', gloss: 'sea', icon: '🌊' },
      { id: 'es-sol', parts: ['so', 'l'], result: 'sol', gloss: 'sun', icon: '☀️' },
      { id: 'es-luna', parts: ['lu', 'na'], result: 'luna', gloss: 'moon', icon: '🌙' }
    ],
    signPuzzles: [
      { id: 'es-puz-cafe', broken: 'CEFA', fixed: 'CAFÉ', hint: 'Swap the vowels for Coffee!', gloss: 'Cafe' }
    ],
    showtime: {
      'rhythm-tide': [
        { prompt: 'Mar', gloss: 'Sea', beat: 1 },
        { prompt: 'Estrella', gloss: 'Star', beat: 3 }
      ]
    },
    constellations: [
      { id: 'es-estrella', word: 'Estrella', gloss: 'Star', stars: 5 },
      { id: 'es-mar', word: 'Mar', gloss: 'Sea', stars: 4 },
      { id: 'es-luna', word: 'Luna', gloss: 'Moon', stars: 4 }
    ],
    stickers: [
      { id: 'es-sun', label: 'Sol', icon: '☀️' },
      { id: 'es-star', label: 'Estrella', icon: '🌟' }
    ]
  });

  root.CulturePacks = {
    registerPack: registerPack,
    getPack: getPack,
    listLanguages: listLanguages,
    getRoomProps: getRoomProps,
    getOrderRecipes: getOrderRecipes,
    getSignage: getSignage,
    getNightMarketItems: getNightMarketItems,
    getPolitenessRules: getPolitenessRules,
    getBlockForgeRecipes: getBlockForgeRecipes,
    getSignPuzzles: getSignPuzzles,
    getShowtimePrompts: getShowtimePrompts,
    getConstellationWords: getConstellationWords,
    getCameraStickers: getCameraStickers
  };
})();
