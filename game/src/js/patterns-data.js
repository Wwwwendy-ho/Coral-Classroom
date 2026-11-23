  /* ---------- PATTERN REEF: the sentence patterns, and the rules that spot common mistakes ----------
     The data for Pattern Reef (patterns.js), kept apart from its screens so the unit test
     (tools/check/test_patterns.js) can load this file on its own.

     PAT_LIST: twelve beginner patterns a traveler needs, in the order they are best learned. Each has
       en, ko    its name, and the pattern itself in Korean
       sum       one line for the list
       rule      the explanation, in plain words (a few short paragraphs)
       ex        example sentences, [Korean, English], built from words in the Korean decks, Story Lagoon and
                 Harbor Town
       items     its practice round, four kinds mixed:
         notice  { ko, en, wrong:[two sentences], why }: pick the sentence that says "en" correctly
         build   { ko, en, extra, why }: put the word tiles in order; extra is one tile that doesn't belong
         change  { from, fromEn, ask, ko, en, wrong:[two], why }: turn one sentence into another (present to
                 past, a statement to "want to"...), picked from three
         fix     { bad, at, n, alt, ko, en, ctx, why }: spot the wrong word in bad (word number at, n words long,
                 1 if left out), then pick its repair from the right one (what ko has there) and alt
     Korean is polite 해요체 throughout. Only the right sentences are ever spoken, each by the natural voice.

     The mistake rules (patFind): checks that need no dictionary beyond a short list of nouns, run on the
     device on wrong answers here and on answers in Harbor Town:
       p-topic, p-object   the particle's form after a consonant or a vowel: 은/는, 이/가, 을/를, 와/과,
                           decided by whether the noun's last syllable has a bottom consonant (받침); and 저가 for 제가
       honor-self          the honorific -세요 / -셨어요 / -시겠어요 (or 성함) used about yourself
       give-have           ordering with 있어요 ("there is") where 주세요 ("please give me") is meant
       counter             Sino numbers (일, 이, 삼) or the long native forms (하나, 둘) before a counter like 개 or 명,
                           and native numbers before 원 or 호선
     Each names the pattern that repairs it (pat). */
  var PAT_LIST = [
    { id:'topic', en:'Topic and subject', ko:'은/는 · 이/가', sum:'Who or what the sentence is about.',
      rule:[
        'Korean puts a small word right after a noun to show its job in the sentence. 은 or 는 marks the topic: what you are talking about, a bit like "as for". 이 or 가 marks the subject, often something new, or the one you are pointing out.',
        'Which form? Look at the last syllable of the noun. If it ends in a consonant (a bottom letter, called 받침), use 은 or 이: 집은, 이름이. If it ends in a vowel, use 는 or 가: 저는, 친구가.',
        'One special case: 저 (I) with 가 becomes 제가.'
      ],
      ex:[ ['저는 안나예요.', 'I am Anna.'], ['이름이 뭐예요?', 'What is your name?'], ['호텔은 어디예요?', 'Where is the hotel?'],
        ['커피가 맛있어요.', 'The coffee is delicious.'], ['제가 안나예요.', 'I am Anna. (the one you are looking for)'] ],
      items:[
        { k:'notice', ko:'친구가 와요.', en:'My friend is coming.', wrong:['친구이 와요.', '친구을 와요.'], why:'친구 ends in a vowel, so it takes 가.' },
        { k:'build', ko:'저는 학생이에요.', en:'I am a student.', extra:'저은', why:'저 ends in a vowel, so it takes 는.' },
        { k:'change', from:'집은 커요.', fromEn:'The house is big.', ask:'Say it about the school (학교) instead.', ko:'학교는 커요.', en:'The school is big.',
          wrong:['학교은 커요.', '학교이 커요.'], why:'집 ends in a consonant (ㅂ), so 은; 학교 ends in a vowel, so 는.' },
        { k:'fix', bad:'선생님가 와요.', at:0, alt:['선생님는'], ko:'선생님이 와요.', en:'The teacher is coming.', why:'선생님 ends in a consonant (ㅁ), so it takes 이, not 가.' },
        { k:'notice', ko:'이름이 뭐예요?', en:'What is your name?', wrong:['이름가 뭐예요?', '이름를 뭐예요?'], why:'이름 ends in a consonant (ㅁ), so it takes 이.' },
        { k:'fix', bad:'저가 안나예요.', at:0, alt:['저이'], ko:'제가 안나예요.', en:'I am Anna.', why:'저 and 가 together become 제가.' }
      ] },

    { id:'object', en:'The object', ko:'을/를 · 와/과', sum:'The thing you eat, drink, buy or see.',
      rule:[
        '을 or 를 marks the object: the thing you eat, drink, buy, read or see. The verb comes last: 커피를 마셔요, coffee (object) I drink.',
        'After a consonant use 을: 책을, 물을. After a vowel use 를: 커피를, 사과를.',
        '와 and 과 join two nouns, like "and", and follow the same rule: 과 after a consonant (빵과), 와 after a vowel (커피와).'
      ],
      ex:[ ['커피를 마셔요.', 'I drink coffee.'], ['책을 읽어요.', 'I read a book.'], ['사과를 사요.', 'I buy apples.'],
        ['물을 마셔요.', 'I drink water.'], ['커피와 빵을 주세요.', 'Coffee and bread, please.'] ],
      items:[
        { k:'notice', ko:'사과를 사요.', en:'I buy apples.', wrong:['사과을 사요.', '사과이 사요.'], why:'사과 ends in a vowel, so it takes 를.' },
        { k:'build', ko:'책을 읽어요.', en:'I read a book.', extra:'책를', why:'책 ends in a consonant (ㄱ), so it takes 을.' },
        { k:'change', from:'커피를 마셔요.', fromEn:'I drink coffee.', ask:'Say it about water (물) instead.', ko:'물을 마셔요.', en:'I drink water.',
          wrong:['물를 마셔요.', '물이 마셔요.'], why:'물 ends in a consonant (ㄹ), so it takes 을.' },
        { k:'fix', bad:'빵를 먹어요.', at:0, alt:['빵이'], ko:'빵을 먹어요.', en:'I eat bread.', why:'빵 ends in a consonant (ㅇ), so it takes 을.' },
        { k:'build', ko:'커피와 빵을 주세요.', en:'Coffee and bread, please.', extra:'커피과', why:'커피 ends in a vowel, so 와; 빵 ends in a consonant, so 을.' },
        { k:'fix', bad:'라면와 김밥을 먹어요.', at:0, alt:['라면이'], ko:'라면과 김밥을 먹어요.', en:'I eat ramyeon and gimbap.', why:'라면 ends in a consonant (ㄴ), so "and" is 과.' }
      ] },

    { id:'present', en:'Polite present', ko:'-아요/어요', sum:'The everyday polite way to talk.',
      rule:[
        'This is the everyday polite way to talk, for now and for habits. Start from the dictionary form (가다, 먹다) and drop 다.',
        'Then look at the last vowel. If it is ㅏ or ㅗ, add 아요; otherwise add 어요: 먹다 → 먹어요. Verbs ending in 하다 become 해요: 공부하다 → 공부해요.',
        'Vowels that meet often merge into one syllable: 가 + 아요 = 가요, 오 + 아요 = 와요, 마시 + 어요 = 마셔요.'
      ],
      ex:[ ['호텔에 가요.', 'I go to the hotel.'], ['김치를 먹어요.', 'I eat kimchi.'], ['한국어를 공부해요.', 'I study Korean.'],
        ['친구가 와요.', 'My friend is coming.'], ['좋아요.', 'It is good.'] ],
      items:[
        { k:'notice', ko:'빵을 먹어요.', en:'I eat bread.', wrong:['빵을 먹아요.', '빵을 먹다요.'], why:'먹 has the vowel ㅓ, so it takes 어요.' },
        { k:'change', from:'호텔에 가다', fromEn:'to go to the hotel (dictionary form)', ask:'Say it politely, for now.', ko:'호텔에 가요.', en:'I go to the hotel.',
          wrong:['호텔에 가어요.', '호텔에 가다요.'], why:'가 has ㅏ, so 아요, and 가 + 아요 merge to 가요.' },
        { k:'build', ko:'한국어를 공부해요.', en:'I study Korean.', extra:'공부하요', why:'하다 verbs become 해요.' },
        { k:'fix', bad:'책을 읽아요.', at:1, alt:['읽요'], ko:'책을 읽어요.', en:'I read a book.', why:'읽 has the vowel ㅣ, not ㅏ or ㅗ, so it takes 어요.' },
        { k:'change', from:'친구를 만나다', fromEn:'to meet a friend (dictionary form)', ask:'Say it politely, for now.', ko:'친구를 만나요.', en:'I meet a friend.',
          wrong:['친구를 만나어요.', '친구를 만나다요.'], why:'만나 has ㅏ, so 아요, and the two ㅏ merge: 만나요.' },
        { k:'fix', bad:'저는 커피를 좋아하요.', at:2, alt:['좋아하어요'], ko:'저는 커피를 좋아해요.', en:'I like coffee.', why:'좋아하다 is a 하다 verb, so it becomes 좋아해요.' }
      ] },

    { id:'have', en:'There is, there isn\'t', ko:'있어요 · 없어요', sum:'Have, don\'t have, and asking if there is one.',
      rule:[
        '있어요 means "there is" or "I have". 없어요 means "there isn\'t" or "I don\'t have". The thing usually takes 이 or 가: 시간이 있어요, I have time.',
        'Add a question mark and lift your voice to ask: 물 있어요? Is there water? Do you have water? For "there isn\'t", always say 없어요, never 안 있어요.',
        'To order or ask a shop for something, don\'t say 있어요 (that only says there is one). Say what you want with 주세요, "please give me": 아메리카노 주세요.'
      ],
      ex:[ ['시간이 있어요.', 'I have time.'], ['돈이 없어요.', 'I don\'t have money.'], ['물 있어요?', 'Is there water?'],
        ['방이 있어요?', 'Do you have a room?'], ['화장실이 있어요?', 'Is there a restroom?'] ],
      items:[
        { k:'notice', ko:'시간이 없어요.', en:'I don\'t have time.', wrong:['시간이 있어요.', '시간을 없어요.'], why:'없어요 is "there isn\'t". The thing takes 이 or 가.' },
        { k:'change', from:'방이 있어요.', fromEn:'There is a room.', ask:'Say there isn\'t one.', ko:'방이 없어요.', en:'There is no room.',
          wrong:['방이 안 있어요.', '방을 없어요.'], why:'"There isn\'t" is its own word, 없어요.' },
        { k:'build', ko:'오늘 방이 있어요?', en:'Do you have a room today?', extra:'방가', why:'방 ends in a consonant (ㅇ), so it takes 이.' },
        { k:'fix', bad:'아메리카노 있어요.', at:1, alt:['없어요'], ko:'아메리카노 주세요.', en:'An americano, please.', ctx:'You are ordering at a cafe.',
          why:'있어요 only says "there is". To order, add 주세요 (please give me).' },
        { k:'change', from:'돈이 있어요.', fromEn:'I have money.', ask:'Say you don\'t.', ko:'돈이 없어요.', en:'I don\'t have money.',
          wrong:['돈이 안 있어요.', '돈은 있어요.'], why:'"I don\'t have" is 없어요.' },
        { k:'fix', bad:'화장실가 있어요?', at:0, alt:['화장실을'], ko:'화장실이 있어요?', en:'Is there a restroom?', why:'화장실 ends in a consonant (ㄹ), so it takes 이.' }
      ] },

    { id:'want', en:'Want to', ko:'-고 싶어요', sum:'Say what you want to do.',
      rule:[
        'To say what you want to do, take the verb\'s dictionary form, drop 다, and add 고 싶어요: 가다 → 가고 싶어요, I want to go. 먹다 → 먹고 싶어요, I want to eat.',
        'Nothing changes with consonants or vowels here: the plain stem always goes straight before 고.',
        'Use it for yourself, or add a question mark to ask someone: 뭐 먹고 싶어요? What do you want to eat?'
      ],
      ex:[ ['서울에 가고 싶어요.', 'I want to go to Seoul.'], ['비빔밥을 먹고 싶어요.', 'I want to eat bibimbap.'], ['한국어를 배우고 싶어요.', 'I want to learn Korean.'],
        ['뭐 마시고 싶어요?', 'What do you want to drink?'], ['좀 쉬고 싶어요.', 'I want to rest a little.'] ],
      items:[
        { k:'notice', ko:'비빔밥을 먹고 싶어요.', en:'I want to eat bibimbap.', wrong:['비빔밥을 먹어 싶어요.', '비빔밥을 먹다 싶어요.'], why:'The stem 먹 goes straight before 고 싶어요.' },
        { k:'change', from:'커피를 마셔요.', fromEn:'I drink coffee.', ask:'Say you want to.', ko:'커피를 마시고 싶어요.', en:'I want to drink coffee.',
          wrong:['커피를 마셔고 싶어요.', '커피를 마시다 싶어요.'], why:'Go back to the stem: 마시다 → 마시 → 마시고 싶어요.' },
        { k:'build', ko:'서울에 가고 싶어요.', en:'I want to go to Seoul.', extra:'가요', why:'가다 → 가 → 가고 싶어요.' },
        { k:'fix', bad:'한국어를 배워고 싶어요.', at:1, alt:['배우다'], ko:'한국어를 배우고 싶어요.', en:'I want to learn Korean.', why:'고 싶어요 joins the plain stem: 배우다 → 배우고 싶어요.' },
        { k:'change', from:'바다를 봐요.', fromEn:'I see the sea.', ask:'Say you want to.', ko:'바다를 보고 싶어요.', en:'I want to see the sea.',
          wrong:['바다를 봐고 싶어요.', '바다를 보다 싶어요.'], why:'보다 → 보 → 보고 싶어요.' },
        { k:'fix', bad:'저는 쉬어 싶어요.', at:1, alt:['쉬다'], ko:'저는 쉬고 싶어요.', en:'I want to rest.', why:'싶어요 needs 고 before it: 쉬고 싶어요.' }
      ] },

    { id:'request', en:'Please', ko:'-(으)세요 · 주세요', sum:'Ask for a thing, or ask someone to do something.',
      rule:[
        '주세요 means "please give me". Put it after a thing: 물 주세요, water, please.',
        'To ask someone politely to do something, add 세요 to a verb stem that ends in a vowel, or 으세요 after a consonant: 가다 → 가세요, please go; 앉다 → 앉으세요, please sit. For "please do it for me", put 주세요 after the 아/어 form: 가 주세요 (to a taxi driver), 천천히 말해 주세요.',
        '-세요 also shows respect when you talk about someone else (어디 가세요? Where are you going?), so never use it about yourself. About yourself, say 가요, 있어요, 아파요.'
      ],
      ex:[ ['물 주세요.', 'Water, please.'], ['여기 앉으세요.', 'Please sit here.'], ['천천히 말해 주세요.', 'Please speak slowly.'],
        ['서울역으로 가 주세요.', 'To Seoul Station, please.'], ['어디 가세요?', 'Where are you going?'] ],
      items:[
        { k:'notice', ko:'여기 앉으세요.', en:'Please sit here.', wrong:['여기 앉세요.', '여기 앉으 주세요.'], why:'앉 ends in a consonant, so it takes 으세요.' },
        { k:'change', from:'사진을 찍어요.', fromEn:'I take a photo.', ask:'Ask someone to do it for you.', ko:'사진을 찍어 주세요.', en:'Please take a photo (for me).',
          wrong:['사진을 찍으 주세요.', '사진을 찍어요 주세요.'], why:'주세요 follows the 아/어 form: 찍어 주세요.' },
        { k:'build', ko:'천천히 말해 주세요.', en:'Please speak slowly.', extra:'줘요', why:'말하다 → 말해 + 주세요.' },
        { k:'fix', bad:'저는 학생이세요.', at:1, alt:['학생예요'], ko:'저는 학생이에요.', en:'I am a student.', why:'-세요 is respect for someone else. About yourself, say 이에요.' },
        { k:'change', from:'여기 앉아요.', fromEn:'I sit here.', ask:'Ask someone politely to sit.', ko:'여기 앉으세요.', en:'Please sit here.',
          wrong:['여기 앉세요.', '여기 앉아세요.'], why:'앉 ends in a consonant, so 으세요.' },
        { k:'fix', bad:'네, 머리가 아프세요.', at:2, alt:['아프요'], ko:'네, 머리가 아파요.', en:'Yes, my head hurts.', ctx:'The doctor asks if your head hurts.',
          why:'아프세요 is for someone else\'s head. About yourself, say 아파요.' }
      ] },

    { id:'place', en:'At, to and from', ko:'-에 · -에서', sum:'Where you go, where it is, where it happens.',
      rule:[
        '에 marks where you go (호텔에 가요), where something is (방에 있어요), and when something happens (세 시에, at three).',
        '에서 marks the place where an action happens: 카페에서 커피를 마셔요, I drink coffee at a cafe. It also means "from": 캐나다에서 왔어요, I came from Canada.',
        'A quick test: with 가요, 와요 and 있어요 use 에; with doing words like eat, study or meet use 에서. Neither changes after a consonant or a vowel.'
      ],
      ex:[ ['호텔에 가요.', 'I go to the hotel.'], ['가방이 방에 있어요.', 'The bag is in the room.'], ['세 시에 만나요.', 'We meet at three o\'clock.'],
        ['카페에서 커피를 마셔요.', 'I drink coffee at a cafe.'], ['캐나다에서 왔어요.', 'I came from Canada.'] ],
      items:[
        { k:'notice', ko:'도서관에서 공부해요.', en:'I study at the library.', wrong:['도서관에 공부해요.', '도서관을 공부해요.'], why:'Studying is an action, so the place takes 에서.' },
        { k:'change', from:'공항에 가요.', fromEn:'I go to the airport.', ask:'Say you eat (먹어요) at the airport.', ko:'공항에서 먹어요.', en:'I eat at the airport.',
          wrong:['공항에 먹어요.', '공항을 먹어요.'], why:'Going takes 에; eating there is an action, so 에서.' },
        { k:'build', ko:'카페에서 커피를 마셔요.', en:'I drink coffee at a cafe.', extra:'카페에', why:'Drinking is an action, so the cafe takes 에서.' },
        { k:'fix', bad:'미국에 왔어요.', at:0, alt:['미국으로'], ko:'미국에서 왔어요.', en:'I came from the United States.', ctx:'Saying where you are from.',
          why:'에 means "to". For "from", use 에서.' },
        { k:'change', from:'방에서 자요.', fromEn:'I sleep in the room.', ask:'Say the bag (가방) is in the room (있어요).', ko:'가방이 방에 있어요.', en:'The bag is in the room.',
          wrong:['가방이 방에서 있어요.', '가방을 방에 있어요.'], why:'Where something is takes 에, even though it means "in".' },
        { k:'fix', bad:'화장실이 어디에서 있어요?', at:1, alt:['어디를'], ko:'화장실이 어디에 있어요?', en:'Where is the restroom?', why:'With 있어요, the place takes 에.' }
      ] },

    { id:'past', en:'Past', ko:'-았/었어요', sum:'What you did.',
      rule:[
        'For the past, choose the same way as the present: after ㅏ or ㅗ add 았어요, otherwise 었어요. 하다 becomes 했어요.',
        'Vowels merge as in the present: 가 → 갔어요, 오 → 왔어요, 마시 → 마셨어요.',
        'A quick way: take the present form, drop 요, and add ㅆ어요. 가요 → 갔어요, 먹어요 → 먹었어요, 해요 → 했어요.'
      ],
      ex:[ ['어제 서울에 갔어요.', 'I went to Seoul yesterday.'], ['비빔밥을 먹었어요.', 'I ate bibimbap.'], ['한국어를 공부했어요.', 'I studied Korean.'],
        ['친구가 왔어요.', 'My friend came.'], ['정말 맛있었어요.', 'It was really delicious.'] ],
      items:[
        { k:'notice', ko:'비빔밥을 먹었어요.', en:'I ate bibimbap.', wrong:['비빔밥을 먹았어요.', '비빔밥을 먹어요.'], why:'먹 has ㅓ, so 었어요.' },
        { k:'change', from:'커피를 마셔요.', fromEn:'I drink coffee.', ask:'Put it in the past.', ko:'커피를 마셨어요.', en:'I drank coffee.',
          wrong:['커피를 마셔었어요.', '커피를 마시았어요.'], why:'마셔요 → 마셔 + ㅆ어요 → 마셨어요.' },
        { k:'build', ko:'어제 친구를 만났어요.', en:'I met a friend yesterday.', extra:'만나었어요', why:'만나 has ㅏ: 만나 + 았어요 → 만났어요.' },
        { k:'fix', bad:'어제 영화를 보었어요.', at:2, alt:['봐었어요'], ko:'어제 영화를 봤어요.', en:'I saw a movie yesterday.', why:'보 has ㅗ, so 았어요, and they merge: 봤어요.' },
        { k:'change', from:'한국어를 공부해요.', fromEn:'I study Korean.', ask:'Put it in the past.', ko:'한국어를 공부했어요.', en:'I studied Korean.',
          wrong:['한국어를 공부하었어요.', '한국어를 공부해었어요.'], why:'하다 verbs: 해요 → 했어요.' },
        { k:'fix', bad:'어제 많이 먹았어요.', at:2, alt:['먹었요'], ko:'어제 많이 먹었어요.', en:'I ate a lot yesterday.', why:'먹 has ㅓ, so 었어요.' }
      ] },

    { id:'future', en:'Will, going to', ko:'-(으)ㄹ 거예요', sum:'Plans, and what will probably happen.',
      rule:[
        'To say what you will do or are going to do, add ㄹ 거예요 to a stem that ends in a vowel (가 → 갈 거예요) and 을 거예요 after a consonant (먹 → 먹을 거예요). 하다 becomes 할 거예요.',
        'A stem that already ends in ㄹ just adds 거예요: 살다 → 살 거예요.',
        'It can also mean "probably": 비가 올 거예요, it will probably rain.'
      ],
      ex:[ ['내일 부산에 갈 거예요.', 'I will go to Busan tomorrow.'], ['저녁에 삼겹살을 먹을 거예요.', 'I am going to eat samgyeopsal in the evening.'],
        ['주말에 쉴 거예요.', 'I am going to rest on the weekend.'], ['내일 비가 올 거예요.', 'It will probably rain tomorrow.'], ['한국어를 공부할 거예요.', 'I will study Korean.'] ],
      items:[
        { k:'notice', ko:'비빔밥을 먹을 거예요.', en:'I will eat bibimbap.', wrong:['비빔밥을 먹었어요.', '비빔밥을 먹 거예요.'], why:'먹 ends in a consonant, so 을 거예요.' },
        { k:'change', from:'부산에 가요.', fromEn:'I go to Busan.', ask:'Say you will.', ko:'부산에 갈 거예요.', en:'I will go to Busan.',
          wrong:['부산에 가을 거예요.', '부산에 가 거예요.'], why:'가 ends in a vowel, so ㄹ joins it: 갈 거예요.' },
        { k:'build', ko:'주말에 쉴 거예요.', en:'I am going to rest on the weekend.', extra:'쉬을', why:'쉬 ends in a vowel: 쉴 거예요.' },
        { k:'fix', bad:'내일 책을 읽 거예요.', at:2, alt:['읽어'], ko:'내일 책을 읽을 거예요.', en:'I will read a book tomorrow.', why:'읽 ends in a consonant, so it needs 을: 읽을 거예요.' },
        { k:'change', from:'한국어를 공부해요.', fromEn:'I study Korean.', ask:'Say you will.', ko:'한국어를 공부할 거예요.', en:'I will study Korean.',
          wrong:['한국어를 공부하을 거예요.', '한국어를 공부해 거예요.'], why:'하다 verbs: 할 거예요.' },
        { k:'fix', bad:'내일 친구를 만나을 거예요.', at:2, alt:['만나'], ko:'내일 친구를 만날 거예요.', en:'I will meet a friend tomorrow.', why:'만나 ends in a vowel, so ㄹ joins it: 만날.' }
      ] },

    { id:'neg', en:'Not', ko:'안 · -지 않아요', sum:'Saying you don\'t, or it isn\'t.',
      rule:[
        'There are two ways to say "not". The short way puts 안 right before the verb: 가요 → 안 가요. The long way adds 지 않아요 to the stem: 가다 → 가지 않아요. They mean the same; 안 is more common when talking.',
        'When a 하다 verb has a noun in front (공부하다), 안 goes between them: 공부 안 해요.',
        'Two set words: "there isn\'t" is 없어요 (not 안 있어요), and "it is not" is 아니에요: 학생이 아니에요.'
      ],
      ex:[ ['저는 고기를 안 먹어요.', 'I don\'t eat meat.'], ['커피를 마시지 않아요.', 'I don\'t drink coffee.'], ['오늘은 공부 안 해요.', 'I am not studying today.'],
        ['안 매워요.', 'It is not spicy.'], ['저는 학생이 아니에요.', 'I am not a student.'] ],
      items:[
        { k:'notice', ko:'고기를 안 먹어요.', en:'I don\'t eat meat.', wrong:['고기를 먹어요 안.', '안 고기를 먹어요.'], why:'안 goes right before the verb.' },
        { k:'change', from:'매워요.', fromEn:'It is spicy.', ask:'Say it isn\'t, the short way.', ko:'안 매워요.', en:'It is not spicy.',
          wrong:['매워요 안.', '매워지 않아요.'], why:'안 goes right before the verb.' },
        { k:'build', ko:'오늘은 공부 안 해요.', en:'I am not studying today.', extra:'공부해요', why:'With 공부하다, 안 goes between 공부 and 해요.' },
        { k:'fix', bad:'저는 커피를 마시지 안아요.', at:3, alt:['안해요'], ko:'저는 커피를 마시지 않아요.', en:'I don\'t drink coffee.', why:'The long way is spelled 않아요, with ㄶ.' },
        { k:'change', from:'고기를 먹어요.', fromEn:'I eat meat.', ask:'Say you don\'t, the long way.', ko:'고기를 먹지 않아요.', en:'I don\'t eat meat.',
          wrong:['고기를 먹어지 않아요.', '고기를 먹지 안 해요.'], why:'The stem 먹 + 지 않아요.' },
        { k:'fix', bad:'오늘 시간이 안 있어요.', at:2, n:2, alt:['안 없어요'], ko:'오늘 시간이 없어요.', en:'I don\'t have time today.', why:'"There isn\'t" is its own word: 없어요.' }
      ] },

    { id:'can', en:'Can, can\'t', ko:'-(으)ㄹ 수 있어요', sum:'What you can and can\'t do.',
      rule:[
        'To say you can do something, add ㄹ 수 있어요 to a stem that ends in a vowel (가 → 갈 수 있어요) and 을 수 있어요 after a consonant (먹 → 먹을 수 있어요). 하다 becomes 할 수 있어요.',
        'For "can\'t", swap 있어요 for 없어요: 갈 수 없어요.',
        'As a question it asks if something is possible, politely: 카드로 계산할 수 있어요? Can I pay by card?'
      ],
      ex:[ ['한국어를 조금 할 수 있어요.', 'I can speak a little Korean.'], ['매운 음식을 먹을 수 있어요.', 'I can eat spicy food.'],
        ['여기서 사진을 찍을 수 있어요?', 'Can I take photos here?'], ['내일은 갈 수 없어요.', 'I can\'t go tomorrow.'], ['카드로 계산할 수 있어요?', 'Can I pay by card?'] ],
      items:[
        { k:'notice', ko:'매운 음식을 먹을 수 있어요.', en:'I can eat spicy food.', wrong:['매운 음식을 먹 수 있어요.', '매운 음식을 먹을 수 없어요.'], why:'먹 ends in a consonant, so 을 수 있어요.' },
        { k:'change', from:'김치를 먹어요.', fromEn:'I eat kimchi.', ask:'Say you can.', ko:'김치를 먹을 수 있어요.', en:'I can eat kimchi.',
          wrong:['김치를 먹어 수 있어요.', '김치를 먹 수 있어요.'], why:'The stem 먹 + 을 수 있어요.' },
        { k:'build', ko:'여기서 사진을 찍을 수 있어요?', en:'Can I take photos here?', extra:'찍어', why:'찍 ends in a consonant: 찍을 수 있어요.' },
        { k:'fix', bad:'내일은 가을 수 있어요.', at:1, alt:['가'], ko:'내일은 갈 수 있어요.', en:'I can go tomorrow.', why:'가 ends in a vowel, so ㄹ joins it: 갈 수 있어요.' },
        { k:'change', from:'갈 수 있어요.', fromEn:'I can go.', ask:'Say you can\'t.', ko:'갈 수 없어요.', en:'I can\'t go.',
          wrong:['갈 수 안 있어요.', '갈 없어요.'], why:'Swap 있어요 for 없어요.' },
        { k:'fix', bad:'한국어를 조금 하을 수 있어요.', at:2, alt:['해'], ko:'한국어를 조금 할 수 있어요.', en:'I can speak a little Korean.', why:'하다 becomes 할 수 있어요.' }
      ] },

    { id:'count', en:'Counting things', ko:'한 개 · 두 명', sum:'Native numbers with counter words.',
      rule:[
        'Korean has two sets of numbers. To count things with a counter word (개 for things, 명 for people, 잔 for cups and glasses, 병 for bottles), use the native Korean numbers: 하나, 둘, 셋, 넷, 다섯...',
        'Before a counter, the first four shorten: 하나 → 한, 둘 → 두, 셋 → 세, 넷 → 네. So: 사과 한 개, 두 명, 커피 세 잔, 맥주 네 병. The order is thing, number, counter.',
        'Hours use native numbers too (세 시, three o\'clock), but money, minutes and floors use the other set: 오천 원, 십 분, 삼 층.'
      ],
      ex:[ ['사과 한 개 주세요.', 'One apple, please.'], ['두 명이요.', 'Two people.'], ['커피 세 잔 주세요.', 'Three coffees, please.'],
        ['맥주 네 병 주세요.', 'Four bottles of beer, please.'], ['학생이 다섯 명 있어요.', 'There are five students.'] ],
      items:[
        { k:'notice', ko:'두 명이요.', en:'Two people.', wrong:['둘 명이요.', '이 명이요.'], why:'People are counted with native numbers, and 둘 shortens to 두.' },
        { k:'change', from:'커피 한 잔 주세요.', fromEn:'One coffee, please.', ask:'Make it two.', ko:'커피 두 잔 주세요.', en:'Two coffees, please.',
          wrong:['커피 둘 잔 주세요.', '커피 이 잔 주세요.'], why:'Native 둘, shortened before 잔: 두 잔.' },
        { k:'build', ko:'맥주 두 병 주세요.', en:'Two bottles of beer, please.', extra:'둘', why:'Thing, number, counter: 맥주 두 병.' },
        { k:'fix', bad:'사과 하나 개 주세요.', at:1, alt:['일'], ko:'사과 한 개 주세요.', en:'One apple, please.', why:'Before a counter, 하나 shortens to 한.' },
        { k:'change', from:'물 한 병 주세요.', fromEn:'One bottle of water, please.', ask:'Make it three.', ko:'물 세 병 주세요.', en:'Three bottles of water, please.',
          wrong:['물 셋 병 주세요.', '물 삼 병 주세요.'], why:'Native 셋, shortened before 병: 세 병.' },
        { k:'fix', bad:'삼 명이요.', at:0, alt:['셋'], ko:'세 명이요.', en:'Three people.', why:'People are counted with native numbers: 세 명, not 삼 명.' }
      ] }
  ];

  // The kinds of mistake the rules can spot, and the pattern that repairs each
  var PAT_SLIPS = {
    'p-topic':   { pat:'topic',   name:'은/는 or 이/가 after a consonant or a vowel' },
    'p-object':  { pat:'object',  name:'을/를 or 와/과 after a consonant or a vowel' },
    'honor-self':{ pat:'request', name:'Respect forms (-세요) used about yourself' },
    'give-have': { pat:'have',    name:'있어요 where 주세요 is meant' },
    'counter':   { pat:'count',   name:'The number before a counter' }
  };
  // Nouns the particle check knows (longest first when matching), from the decks, Story Lagoon, Harbor Town and
  // the patterns. Only known nouns are checked: many verb forms end in 는 or 을 too (먹는, 가을), so guessing would
  // flag right answers.
  var PAT_NOUNS = ('친구 학교 집 선생님 이름 물 커피 빵 책 사과 라면 김밥 비빔밥 김치 김치찌개 삼겹살 불고기 호텔 공항 화장실 방 시간 돈 가방 우산 ' +
    '메뉴 메뉴판 사진 창문 한국어 영어 고기 음식 영화 바다 맥주 우유 주스 녹차 차 카페 식당 역 서울역 지하철 택시 버스 카드 표 아메리카노 ' +
    '라떼 학생 의사 엄마 아빠 동생 가족 여권 열쇠 날씨 오늘 내일 어제 주말 저녁 아침 점심 도서관 병원 공원 시장 가게 옷 신발 티셔츠 ' +
    '사람 한국 미국 캐나다 서울 부산 제주도 숙소 예약 계산 길 문 컵 휴대폰 전화 머리 배 이거 그거 저거 뭐 저').split(' ')
    .sort(function(a, b){ return b.length - a.length; });
  // Things a traveler orders or asks a shop for, where "X 있어요." is a slip for "X 주세요."
  var PAT_ORDERS = '아메리카노 라떼 커피 물 맥주 우유 주스 녹차 차 비빔밥 김치찌개 김밥 라면 빵 사과 삼겹살 불고기 메뉴판 흰색 검은색 파란색 빨간색 이거 이것 티셔츠'.split(' ');
  var PAT_PARTICLES = { '은':'topic', '는':'topic', '이':'subject', '가':'subject', '을':'object', '를':'object', '과':'and', '와':'and' };

  // Whether a syllable ends in a consonant (a 받침): Hangul syllables are numbered so that every 28th has none
  function patBatchim(word){
    var s = String(word || '').replace(/[^가-힣]/g, ''); if(!s) return false;
    return (s.charCodeAt(s.length - 1) - 0xAC00) % 28 !== 0;
  }
  // The right form of a particle after a noun: kind is 'topic' (은/는), 'subject' (이/가), 'object' (을/를) or 'and' (과/와)
  function patParticle(noun, kind){
    var b = patBatchim(noun), f = { topic: b ? '은' : '는', subject: b ? '이' : '가', object: b ? '을' : '를', and: b ? '과' : '와' }[kind];
    if(noun === '저' && kind === 'subject') return '제가';
    return noun + f;
  }
  function patWords(text){ return String(text || '').normalize('NFC').split(/\s+/).map(function(w){ return w.replace(/[^가-힣]/g, ''); }).filter(Boolean); }

  var PAT_SINO = { '일':'한', '이':'두', '삼':'세', '사':'네', '오':'다섯', '육':'여섯', '칠':'일곱', '팔':'여덟', '구':'아홉', '십':'열' };
  var PAT_LONG = { '하나':'한', '둘':'두', '셋':'세', '넷':'네', '스물':'스무' };
  var PAT_TO_SINO = { '한':'일', '하나':'일', '두':'이', '둘':'이', '세':'삼', '셋':'삼', '넷':'사', '다섯':'오', '여섯':'육', '일곱':'칠', '여덟':'팔', '아홉':'구', '열':'십' };
  var PAT_COUNTER = /^(개|명|잔|병|마리|살|권|그릇|장)(이요|이에요|예요|요|이|을|를|은|는|가|만|씩|도)?$/;
  var PAT_SINO_COUNTER = /^(원|호선)(이요|이에요|예요|요|이|을|은|만|도)?$/;
  var PAT_HONOR = /(세요|셨어요|시겠어요|셔요|셨습니까|십니까)$/;
  var PAT_HONOR_OK = /(주세요|안녕하세요|오세요|계세요|수고하세요)$/;

  /* The mistakes in one answer: a list of { slip, pat, word, fix, why }, at most one per slip kind.
     ctx.self: she is answering about herself (Harbor Town), so a respect form in a statement is about her too.
     ctx.typed: she typed it; only the checks that can't misread a right answer are run (the particles, the
     numbers, and -세요 next to 저/제). */
  function patFind(text, ctx){
    ctx = ctx || {};
    var words = patWords(text), out = [], seen = {}, raw = String(text || '').trim();
    var question = /\?\s*$/.test(raw), me = words.some(function(w){ return /^(저는|제가|저도|전|저|제)$/.test(w); });
    function add(slip, word, fix, why){ if(seen[slip]) return; seen[slip] = 1; out.push({ slip: slip, pat: PAT_SLIPS[slip].pat, word: word, fix: fix, why: why }); }
    words.forEach(function(w, i){
      // particles: a known noun with the wrong form after it
      for(var j = 0; j < PAT_NOUNS.length; j++){
        var n = PAT_NOUNS[j];
        if(w.length !== n.length + 1 || w.indexOf(n) !== 0) continue;
        var kind = PAT_PARTICLES[w.slice(n.length)]; if(!kind) continue;
        var right = patParticle(n, kind), b = patBatchim(n);
        if(right !== w) add(kind === 'object' || kind === 'and' ? 'p-object' : 'p-topic', w, right, right === '제가' ? '저 and 가 together become 제가.' :
          n + ' ends in ' + (b ? 'a consonant' : 'a vowel') + ', so it takes ' + right.slice(n.length) + ': ' + right + '.');
        break;
      }
      // numbers before a counter
      var next = words[i + 1] || '';
      if(PAT_COUNTER.test(next)){
        var c = next.match(PAT_COUNTER)[1];
        if(PAT_LONG[w]) add('counter', w + ' ' + c, PAT_LONG[w] + ' ' + c, 'Before a counter like ' + c + ', ' + w + ' shortens to ' + PAT_LONG[w] + '.');
        else if(PAT_SINO[w] && (w !== '이' || /^(명|마리|살)$/.test(c)))   // 이 is also "this" (이 잔, this cup)
          add('counter', w + ' ' + c, PAT_SINO[w] + ' ' + c, c + ' counts with the native numbers: ' + PAT_SINO[w] + ' ' + c + ', not ' + w + ' ' + c + '.');
      }
      if(PAT_SINO_COUNTER.test(next) && PAT_TO_SINO[w]){
        var s = next.match(PAT_SINO_COUNTER)[1];
        add('counter', w + ' ' + s, PAT_TO_SINO[w] + ' ' + s, s + ' counts with the other numbers (일, 이, 삼): ' + PAT_TO_SINO[w] + ' ' + s + '.');
      }
      // numbers glued to a counter: 둘명, 하나개
      var g = w.match(/^(하나|둘|셋|넷)(개|명|잔|병|마리)/);
      if(g) add('counter', g[1] + g[2], PAT_LONG[g[1]] + ' ' + g[2], 'Before a counter like ' + g[2] + ', ' + g[1] + ' shortens to ' + PAT_LONG[g[1]] + '.');
      // respect forms about yourself
      if((PAT_HONOR.test(w) && !PAT_HONOR_OK.test(w) && (me || (ctx.self && !ctx.typed && !question))) || (/^성함/.test(w) && words.indexOf('제') !== -1))
        add('honor-self', w, '', /^성함/.test(w) ? '성함 is the polite word for someone else\'s name. Your own is 이름.' :
          w + ' shows respect to someone else. About yourself, use the plain polite form (-아요/어요).');
    });
    // ordering with 있어요: "아메리카노 있어요." or "김치찌개 하나 있어요." said as a statement
    if(!ctx.typed && !question && words.length >= 2 && words.length <= 3 && words[words.length - 1] === '있어요' && PAT_ORDERS.indexOf(words[0]) !== -1)
      add('give-have', words.join(' '), words.slice(0, -1).join(' ') + ' 주세요', '있어요 only says "there is". To order, add 주세요 (please give me).');
    return out;
  }
