  /* ---------- BOTTLE BEACH: 지수's bottles, and the feedback on what she writes ----------
     The data for Bottle Beach (beach.js), kept apart from its screens so the unit test (tools/check/test_beach.js)
     can load it with Pattern Reef's rules (patterns-data.js) and nothing else.

     BB_BOTTLES: twelve short letters from 지수, the new friend from Harbor Town, about the trip and daily life. Each has
       ko, en     her question, and what it means
       w          its words for tap-a-word, one per space-separated token: "ko=meaning=dictionary form;…"
       starters   tiles to build a reply from: short chunks, each a word or a word with its ending
       models     two or three beginner answers, [Korean, English]
       replies    지수's answers to a reply: the first whose key words are in it, else the last (which has none)
     Korean is polite 해요체 throughout, the right level for a new friend. Every Korean line is spoken by the
     natural voice.

     The feedback (bbCheck) runs on the device. It never marks a page in red: it says first what is right, then at
     most two fixes. What is right: Pattern Reef's patterns used correctly (bbGood), polite endings, and words she
     knows. The fixes: Pattern Reef's mistake rules (patFind: particle form by 받침, -세요 about herself, counters),
     then a word that is in neither her words nor the dictionary but one letter away from one that is, shown as a
     possible spelling slip. Rules come first because they name a pattern she can practice. */
  var BB_BOTTLES = [
    { id:'today', ko:'오늘 뭐 했어요?', en:'What did you do today?',
      w:'오늘=today=오늘;뭐=what=뭐;했어요=did (you) do=해요',
      starters:['오늘', '저는', '명동에 갔어요', '친구를 만났어요', '쇼핑했어요', '호텔에서 쉬었어요', '재미있었어요', '맛있었어요'],
      models:[ ['오늘 명동에 갔어요. 쇼핑했어요.', 'Today I went to Myeongdong. I went shopping.'], ['오늘은 호텔에서 쉬었어요.', 'Today I rested at the hotel.'],
        ['박물관에 갔어요. 재미있었어요.', 'I went to a museum. It was fun.'] ],
      replies:[ { k:['쇼핑', '명동', '샀'], ko:'와, 명동 좋죠! 저도 거기서 자주 쇼핑해요.', en:'Wow, Myeongdong is great! I often shop there too.' },
        { k:['쉬었', '피곤'], ko:'잘했어요! 여행할 때는 쉬는 것도 중요해요.', en:'Good idea! Resting is important too when you travel.' },
        { ko:'재미있었겠어요! 내일은 뭐 할 거예요?', en:'That sounds like fun! What will you do tomorrow?' } ] },
    { id:'food', ko:'한국 음식 중에 뭐가 제일 좋아요?', en:'Which Korean food do you like best?',
      w:'한국=Korea=한국;음식=food=음식;중에=among;뭐가=what=뭐;제일=the most;좋아요=do (you) like=좋아요',
      starters:['저는', '비빔밥을', '불고기를', '김치찌개를', '제일 좋아해요', '정말 맛있어요', '조금 매워요'],
      models:[ ['저는 비빔밥을 제일 좋아해요.', 'I like bibimbap best.'], ['불고기가 제일 좋아요. 정말 맛있어요.', 'Bulgogi is my favorite. It is really delicious.'] ],
      replies:[ { k:['비빔밥'], ko:'저도 비빔밥 좋아해요! 전주 비빔밥이 유명해요.', en:'I like bibimbap too! Jeonju bibimbap is famous.' },
        { k:['불고기', '고기', '삼겹살'], ko:'고기를 좋아하는군요! 다음에 같이 삼겹살 먹어요.', en:'So you like meat! Let\'s have samgyeopsal together next time.' },
        { k:['김치', '매워', '매운'], ko:'매운 음식도 잘 먹네요! 대단해요.', en:'You can eat spicy food too! Impressive.' },
        { ko:'좋은 선택이에요! 저는 떡볶이를 제일 좋아해요.', en:'Good choice! I like tteokbokki best.' } ] },
    { id:'weather', ko:'거기 날씨는 어때요?', en:'How is the weather there?',
      w:'거기=there;날씨는=the weather=날씨;어때요=how is (it)',
      starters:['오늘은', '날씨가', '좋아요', '추워요', '더워요', '비가 와요', '바람이 불어요'],
      models:[ ['오늘은 날씨가 좋아요.', 'The weather is nice today.'], ['비가 와요. 조금 추워요.', 'It is raining. It is a little cold.'] ],
      replies:[ { k:['추워', '추웠'], ko:'따뜻하게 입으세요! 감기 조심하세요.', en:'Dress warmly! Take care not to catch a cold.' },
        { k:['비가', '비'], ko:'우산 꼭 챙기세요!', en:'Be sure to take an umbrella!' },
        { k:['더워', '더웠'], ko:'물 많이 마시세요!', en:'Drink lots of water!' },
        { ko:'좋네요! 산책하기 좋은 날씨예요.', en:'Nice! It is good weather for a walk.' } ] },
    { id:'where', ko:'지금 어디에 있어요?', en:'Where are you now?',
      w:'지금=now=지금;어디에=where=어디;있어요=are (you)=있어요',
      starters:['지금', '호텔에 있어요', '카페에 있어요', '서울에 있어요', '부산에 있어요', '친구하고 같이'],
      models:[ ['지금 카페에 있어요.', 'I am at a cafe now.'], ['서울에 있어요. 호텔에서 쉬고 있어요.', 'I am in Seoul. I am resting at the hotel.'] ],
      replies:[ { k:['카페', '커피'], ko:'커피 맛있게 드세요!', en:'Enjoy your coffee!' },
        { k:['부산', '바다'], ko:'부산 좋아요! 바다가 정말 예뻐요.', en:'Busan is great! The sea is really pretty.' },
        { k:['호텔'], ko:'푹 쉬세요! 내일 또 연락해요.', en:'Get a good rest! Let\'s talk again tomorrow.' },
        { ko:'좋은 곳이네요! 사진 보내 주세요.', en:'What a nice place! Please send me a photo.' } ] },
    { id:'tomorrow', ko:'내일은 뭐 할 거예요?', en:'What will you do tomorrow?',
      w:'내일은=tomorrow=내일;뭐=what=뭐;할=(will) do=해요;거예요=(it) will be',
      starters:['내일은', '경복궁에', '갈 거예요', '쇼핑할 거예요', '친구를 만날 거예요', '한국 음식을 먹을 거예요'],
      models:[ ['내일은 경복궁에 갈 거예요.', 'Tomorrow I will go to Gyeongbokgung.'], ['친구를 만날 거예요. 같이 밥을 먹을 거예요.', 'I will meet a friend. We will eat together.'] ],
      replies:[ { k:['경복궁', '궁'], ko:'한복을 입으면 경복궁에 무료로 들어갈 수 있어요!', en:'If you wear a hanbok, you can get into Gyeongbokgung for free!' },
        { k:['쇼핑'], ko:'홍대도 쇼핑하기 좋아요!', en:'Hongdae is good for shopping too!' },
        { k:['먹을', '음식', '밥'], ko:'맛있는 거 많이 드세요!', en:'Eat lots of delicious things!' },
        { ko:'재미있겠어요! 즐거운 하루 보내세요.', en:'That sounds like fun! Have a great day.' } ] },
    { id:'family', ko:'가족이 몇 명이에요?', en:'How many people are in your family?',
      w:'가족이=(your) family=가족;몇=how many=몇;명이에요=people (is it)=명',
      starters:['우리 가족은', '세 명이에요', '네 명이에요', '엄마', '아빠', '동생이 있어요', '언니가 있어요'],
      models:[ ['우리 가족은 네 명이에요.', 'There are four people in my family.'], ['세 명이에요. 엄마, 아빠, 저예요.', 'Three. My mom, my dad and me.'] ],
      replies:[ { k:['동생'], ko:'저도 동생이 있어요! 남동생이에요.', en:'I have a younger sibling too! A younger brother.' },
        { k:['언니', '누나', '오빠', '형'], ko:'형제가 있어서 좋겠어요!', en:'It must be nice to have brothers and sisters!' },
        { ko:'가족이 보고 싶겠어요!', en:'You must miss your family!' } ] },
    { id:'free', ko:'시간이 있을 때 뭐 해요?', en:'What do you do in your free time?',
      w:'시간이=time=시간;있을=(when there) is=있어요;때=when, the time;뭐=what=뭐;해요=do (you) do=해요',
      starters:['저는', '주말에', '영화를 봐요', '책을 읽어요', '음악을 들어요', '운동해요', '요리해요'],
      models:[ ['저는 영화를 봐요.', 'I watch movies.'], ['주말에 책을 읽어요. 음악도 들어요.', 'On weekends I read books. I also listen to music.'] ],
      replies:[ { k:['영화', '드라마'], ko:'한국 드라마도 봐요? 제가 추천해 줄게요!', en:'Do you watch Korean dramas too? I will recommend some!' },
        { k:['음악', '노래'], ko:'저는 케이팝을 자주 들어요.', en:'I often listen to K-pop.' },
        { k:['운동', '산책'], ko:'한강에서 자전거를 타 보세요! 정말 좋아요.', en:'Try riding a bike by the Han River! It is really nice.' },
        { k:['책'], ko:'저도 책 읽는 거 좋아해요.', en:'I like reading too.' },
        { ko:'멋있어요! 저는 주말에 보통 카페에 가요.', en:'Cool! On weekends I usually go to a cafe.' } ] },
    { id:'study', ko:'한국어 공부는 어때요?', en:'How is your Korean study going?',
      w:'한국어=Korean=한국어;공부는=study=공부;어때요=how is (it)',
      starters:['한국어는', '재미있어요', '조금 어려워요', '매일', '공부해요', '단어를 배워요', '한글을 읽을 수 있어요'],
      models:[ ['재미있어요. 그런데 조금 어려워요.', 'It is fun. But it is a little hard.'], ['매일 공부해요. 한글을 읽을 수 있어요.', 'I study every day. I can read Hangul.'] ],
      replies:[ { k:['어려워', '어렵'], ko:'괜찮아요! 천천히 하면 돼요. 정말 잘하고 있어요.', en:'It is okay! Going slowly is fine. You are doing really well.' },
        { k:['읽을 수', '한글'], ko:'벌써 한글을 읽을 수 있어요? 대단해요!', en:'You can already read Hangul? Amazing!' },
        { ko:'한국어 정말 잘해요! 계속 편지 써 주세요.', en:'Your Korean is really good! Please keep writing to me.' } ] },
    { id:'bought', ko:'한국에서 뭐 샀어요?', en:'What did you buy in Korea?',
      w:'한국에서=in Korea=한국;뭐=what=뭐;샀어요=did (you) buy=사요',
      starters:['저는', '시장에서', '기념품을', '옷을', '가족 선물을', '샀어요', '화장품을 샀어요'],
      models:[ ['시장에서 기념품을 샀어요.', 'I bought souvenirs at the market.'], ['옷을 샀어요. 가족 선물도 샀어요.', 'I bought clothes. I also bought presents for my family.'] ],
      replies:[ { k:['화장품'], ko:'한국 화장품 좋죠! 저도 자주 사요.', en:'Korean skincare is great! I buy it often too.' },
        { k:['선물'], ko:'가족이 정말 좋아할 거예요!', en:'Your family will really love them!' },
        { k:['시장'], ko:'시장 구경 재미있죠? 다음에는 광장시장에 가 보세요.', en:'Markets are fun to look around, right? Next time, try Gwangjang Market.' },
        { ko:'쇼핑 잘했네요! 사진 보여 주세요.', en:'Sounds like good shopping! Show me a photo.' } ] },
    { id:'best', ko:'여행에서 뭐가 제일 좋았어요?', en:'What was the best part of your trip?',
      w:'여행에서=on (your) trip=여행;뭐가=what=뭐;제일=the most;좋았어요=was good=좋아요',
      starters:['음식이', '사람들이', '경복궁이', '제일 좋았어요', '정말 친절했어요', '바다가 예뻤어요'],
      models:[ ['음식이 제일 좋았어요.', 'The food was the best.'], ['사람들이 정말 친절했어요.', 'People were really kind.'] ],
      replies:[ { k:['음식', '맛있'], ko:'다행이에요! 다음에 또 맛집을 알려 줄게요.', en:'I am glad! Next time I will tell you more good places to eat.' },
        { k:['친절', '사람'], ko:'그렇게 말해 줘서 고마워요!', en:'Thank you for saying that!' },
        { ko:'좋은 추억이 됐으면 좋겠어요!', en:'I hope it became a good memory!' } ] },
    { id:'home', ko:'언제 집에 돌아가요?', en:'When do you go back home?',
      w:'언제=when=언제;집에=home=집;돌아가요=do (you) go back=돌아가요',
      starters:['다음 주에', '금요일에', '집에', '돌아가요', '아쉬워요', '또 올 거예요'],
      models:[ ['다음 주에 돌아가요. 아쉬워요.', 'I go back next week. I am sad to leave.'], ['금요일에 집에 돌아가요. 또 올 거예요!', 'I go home on Friday. I will come again!'] ],
      replies:[ { k:['또 올', '다시'], ko:'꼭 다시 오세요! 기다릴게요.', en:'Please be sure to come again! I will be waiting.' },
        { k:['아쉬'], ko:'저도 아쉬워요. 우리 계속 연락해요!', en:'I am sad too. Let\'s keep in touch!' },
        { ko:'남은 시간 즐겁게 보내세요!', en:'Enjoy the rest of your time!' } ] },
    { id:'next', ko:'다음에 같이 뭐 하고 싶어요?', en:'What do you want to do together next time?',
      w:'다음에=next time=다음;같이=together;뭐=what=뭐;하고=to do=해요;싶어요=do (you) want=싶어요',
      starters:['다음에', '같이', '밥을 먹고 싶어요', '노래방에 가고 싶어요', '한강에 가고 싶어요', '카페에 가고 싶어요'],
      models:[ ['같이 노래방에 가고 싶어요.', 'I want to go to a karaoke room together.'], ['한강에 가고 싶어요. 치킨을 먹고 싶어요.', 'I want to go to the Han River. I want to eat chicken.'] ],
      replies:[ { k:['노래방', '노래'], ko:'좋아요! 그런데 저는 노래를 잘 못해요.', en:'Sounds good! But I am not a good singer.' },
        { k:['한강', '치킨'], ko:'한강에서 치킨 먹는 거 최고예요!', en:'Eating chicken by the Han River is the best!' },
        { k:['밥', '먹고'], ko:'좋아요! 맛있는 식당을 알아요.', en:'Great! I know a good restaurant.' },
        { ko:'좋아요! 꼭 같이 해요.', en:'Great! Let\'s do it together for sure.' } ] }
  ];

  // "오늘=today=오늘;…" -> [{ ko, en, base }], one per token of the question
  function bbWords(b){
    return String(b.w || '').split(';').map(function(p){ var x = p.split('='); return { ko: x[0], en: x[1] || '', base: x[2] || '' }; });
  }
  // 지수's answer to what she wrote: the first reply whose key words are in it, else the last one
  function bbReply(b, text){
    var t = String(text || '').normalize('NFC');
    var hit = b.replies.find(function(r){ return r.k && r.k.some(function(k){ return t.indexOf(k) !== -1; }); });
    return hit || b.replies[b.replies.length - 1];
  }
  // The sentences of a reply, each with its end mark
  function bbSentences(text){
    return (String(text || '').normalize('NFC').match(/[^.!?。\n]+[.!?。]*/g) || []).map(function(s){ return s.trim(); }).filter(function(s){ return /[가-힣]/.test(s); });
  }

  /* ---------- Words: the dictionary check ---------- */
  // Particles and the copula a noun can carry, longest first: what's left is the word to look up
  var BB_TAILS = ['이에요', '예요', '에서', '에게', '한테', '하고', '이랑', '까지', '부터', '으로', '이요', '은', '는', '이', '가', '을', '를', '에', '도', '만', '와', '과', '로', '랑', '의', '요'];
  // Words ending like a verb or adverb: their many forms aren't all in the dictionary, so they aren't spell-checked
  var BB_VERBISH = /(요|다|고|서|면|지|게|까|니|데|며|죠|네|던)$/;
  function bbPlain(w){ return String(w || '').normalize('NFC').replace(/[^가-힣]/g, ''); }
  // A word and the shorter words it could be under its particles: 사과를 -> [사과를, 사과]
  function bbStems(w){
    var p = bbPlain(w), out = [p];
    BB_TAILS.forEach(function(t){ if(p.length > t.length && p.slice(-t.length) === t) out.push(p.slice(0, -t.length)); });
    return out;
  }
  // A word as letters (jamo), so 비빔밤 and 비빔밥 are one letter apart
  function bbJamo(s){
    var out = [];
    Array.prototype.forEach.call(String(s || ''), function(ch){
      var c = ch.charCodeAt(0) - 0xAC00;
      if(c < 0 || c > 11171){ out.push(ch); return; }
      out.push('L' + Math.floor(c / 588), 'V' + Math.floor(c % 588 / 28));
      if(c % 28) out.push('T' + c % 28);
    });
    return out;
  }
  // Whether two letter lists are at most one change apart (a letter added, dropped or swapped for another)
  function bbOneOff(a, b){
    if(Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, diff = 0;
    while(i < a.length && j < b.length){
      if(a[i] === b[j]){ i++; j++; continue; }
      if(++diff > 1) return false;
      if(a.length > b.length) i++; else if(b.length > a.length) j++; else { i++; j++; }
    }
    return diff + (a.length - i) + (b.length - j) <= 1;
  }
  // The dictionary word closest to one she wrote that isn't in it, or null. lex.has(word), lex.list: dictionary words.
  // next: the word after it, since 갈, 먹을 and 있을 before 거예요, 수 or 때 are verbs, not nouns
  function bbSpell(word, lex, next){
    var stems = bbStems(word);
    if(stems.some(function(s){ return lex.has(s); })) return null;
    var p = stems[0];
    if(p.length < 2) return null;
    if(!/(이에요|예요|이요)$/.test(p) && BB_VERBISH.test(p)) return null;   // a noun with 이에요 is still checked
    if(/^(거예요|거|것|수|때|줄)/.test(next || '') || (p.charCodeAt(p.length - 1) - 0xAC00) % 28 === 8 && !/을$/.test(p)) return null;
    for(var i = 0; i < stems.length; i++){
      var s = stems[i]; if(s.length < 2) continue;
      var sj = bbJamo(s);
      var near = lex.list.find(function(d){ return d.length >= 2 && Math.abs(d.length - s.length) <= 1 && d !== s && bbOneOff(sj, bbJamo(d)); });
      if(near) return { word: s, fix: near };
    }
    return null;
  }

  /* ---------- What is right ---------- */
  // The Pattern Reef patterns a reply uses: [{ pat, word }], each pattern once, in the order they are learned
  function bbGood(text){
    var words = patWords(text), found = {};
    function add(pat, word){ if(!found[pat]) found[pat] = word; }
    words.forEach(function(w, i){
      for(var j = 0; j < PAT_NOUNS.length; j++){
        var n = PAT_NOUNS[j];
        if(w.length !== n.length + 1 || w.indexOf(n) !== 0) continue;
        var kind = PAT_PARTICLES[w.slice(n.length)];
        if(kind && patParticle(n, kind) === w) add(kind === 'object' || kind === 'and' ? 'object' : 'topic', w);
        break;
      }
      if(/^(저는|제가)$/.test(w)) add('topic', w);
      if(w.length > 2 && /에서$/.test(w) || w.length > 1 && /[^에]에$/.test(w) && w !== '때에') add('place', w);
      if(/[았었였했]어요$/.test(w) || /했어요$/.test(w)) add('past', w);
      if(w === '싶어요' && /고$/.test(words[i - 1] || '')) add('want', words[i - 1] + ' ' + w);
      if(w === '거예요' && i > 0 && (words[i - 1].charCodeAt(words[i - 1].length - 1) - 0xAC00) % 28 === 8) add('future', words[i - 1] + ' ' + w);
      if(w === '수' && /^(있어요|없어요)$/.test(words[i + 1] || '')) add('can', words[i - 1] + ' ' + w + ' ' + words[i + 1]);
      if(w === '안' && words[i + 1] || /지$/.test(w) && words[i + 1] === '않아요') add('neg', w + ' ' + words[i + 1]);
      if(/^(있어요|없어요)$/.test(w) && words[i - 1] !== '수') add('have', w);
      if(PAT_COUNTER.test(words[i + 1] || '') && /^(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)$/.test(w)) add('count', w + ' ' + words[i + 1]);
      if(/(주세요)$/.test(w)) add('request', w);
    });
    if(!found.past && !found.want && !found.future && !found.can && !found.have){
      var pres = words.find(function(w){ return /[아어해]요$/.test(w) && !/(세요|이에요|예요)$/.test(w); });
      if(pres) add('present', pres);
    }
    return PAT_LIST.filter(function(p){ return found[p.id]; }).map(function(p){ return { pat: p.id, word: found[p.id] }; });
  }

  /* The feedback on one reply:
       { sentences, good: [{ pat, word }], polite, known: [words], fixes: [{ kind: 'rule'|'spell', word, fix, why, pat }],
         clean: [the sentences with no rule slip] }
     lex: { has(word), known(word), list }. A pattern the rules found a slip in isn't praised as right. */
  function bbCheck(text, lex){
    var sents = bbSentences(text), slips = patFind(text, { typed: true });
    var bad = {}; slips.forEach(function(s){ bad[s.pat] = 1; });
    var good = bbGood(text).filter(function(g){ return !bad[g.pat]; });
    var polite = sents.length > 0 && sents.every(function(s){ return /(요|니다)[.!?。]*$/.test(s); });
    var fixes = slips.map(function(s){ return { kind: 'rule', word: s.word, fix: s.fix, why: s.why, pat: s.pat }; });
    var seen = {}, known = [];
    var all = patWords(text);
    all.forEach(function(w, i){
      if(seen[w]) return; seen[w] = 1;
      var stems = bbStems(w), slipped = slips.some(function(s){ return s.word.indexOf(w) !== -1; });
      if(lex && !slipped && stems.some(function(s){ return lex.known(s); })) known.push(w);
      if(lex && fixes.length < 2 && !slipped){
        var sp = bbSpell(w, lex, all[i + 1]);
        if(sp) fixes.push({ kind: 'spell', word: sp.word, fix: sp.fix, why: sp.word + ' isn\'t in your words or the dictionary. Did you mean ' + sp.fix + '?' });
      }
    });
    var clean = sents.filter(function(s){ return !patFind(s, { typed: true }).length; });
    return { sentences: sents, good: good, polite: polite, known: known.slice(0, 6), fixes: fixes.slice(0, 2), clean: clean };
  }
