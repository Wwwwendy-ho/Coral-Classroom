  /* ---------- THE LIGHTHOUSE: real-world Korean, and the manners that go with it ----------
     The data for the Lighthouse (light.js), kept apart from its screens so the unit test (tools/check/test_light.js)
     can load it on its own.

     LH_SIGNS: ten signs a traveler meets, drawn in the app as styled cards (no photos). Each has
       en, icon, kind   its name, its list icon, and its look (kind picks the card's style: a chalk menu board,
                        a paper menu, a station sign, a receipt…)
       rows             the sign line by line, as [style, text]. In the text, {한국어|meaning|dictionary form|said as}
                        is a word to tap (the last two may be empty), anything else is printed as it is, and a tab
                        splits a line into a left and a right column (a price, a time)
       qs               two quick questions: { q, opts: [three, the right one first], why, key: the word it's about }
     Real signs often carry English too, in smaller letters; here only the Korean is shown, as it is the part to learn.

     LH_MANNERS: eight short notes on manners useful on the trip. Each has en, icon, say ([Korean, English] phrases
     to hear), body (a few short paragraphs) and tip (one line for the trip). Plain and practical: what people
     usually do, never what "all Koreans" are like. */
  var LH_SIGNS = [
    { id:'cafe', en:'Cafe menu board', icon:'cup', kind:'board',
      rows:[ ['title', '{메뉴|menu}'], ['head', '{커피|coffee}'],
        ['item', '{아메리카노|americano}\t4,500'], ['item', '{카페라떼|cafe latte}\t5,000'], ['item', '{바닐라라떼|vanilla latte}\t5,500'],
        ['head', '{차|tea}'], ['item', '{녹차|green tea}\t4,500'], ['item', '{유자차|yuja tea (citron tea)}\t5,000'],
        ['note', '{아이스|iced} +500 · {사이즈|size} {업|up} +500'] ],
      qs:[ { q:'How much is the americano?', opts:['4,500 won', '5,000 won', '5,500 won'], why:'아메리카노 is on the first line: 4,500 won.', key:'아메리카노' },
        { q:'You want green tea. Which one do you order?', opts:['녹차', '유자차', '카페라떼'], why:'녹 means green, and 차 is tea: 녹차.', key:'녹차' } ] },
    { id:'restaurant', en:'Restaurant menu', icon:'bowl', kind:'paper',
      rows:[ ['title', '{식사|meals}'],
        ['item', '{김치찌개|kimchi stew}\t9,000'], ['item', '{된장찌개|soybean paste stew}\t9,000'], ['item', '{비빔밥|bibimbap (rice mixed with vegetables)}\t10,000'],
        ['item', '{불고기|bulgogi (grilled marinated beef)} {정식|set meal}\t13,000'],
        ['head', '{추가|extras}'], ['item', '{공깃밥|an extra bowl of rice}\t1,000'], ['item', '{음료수|soft drink}\t2,000'],
        ['note', '{모든|all} {메뉴|menu} {포장|takeout} {가능|possible}'] ],
      qs:[ { q:'How much is the bibimbap?', opts:['10,000 won', '9,000 won', '13,000 won'], why:'비빔밥 is 10,000 won.', key:'비빔밥' },
        { q:'You want one more bowl of rice. What do you ask for?', opts:['공깃밥', '음료수', '정식'], why:'공깃밥 is a bowl of rice, ordered as an extra.', key:'공깃밥' } ] },
    { id:'subway', en:'Subway station sign', icon:'train', kind:'subway',
      rows:[ ['line', '{2호선|Line 2||이 호선}'], ['station', '{시청|City Hall}'],
        ['dir', '← {충정로|Chungjeongro (a station)} {방면|toward}\t{을지로입구|Euljiro 1-ga (a station)} {방면|toward} →'],
        ['head', '{출구|exit}'], ['exit', '1\t{서울광장|Seoul Plaza}'], ['exit', '2\t{덕수궁|Deoksugung Palace}'], ['exit', '4\t{버스|bus} {타는|where you take|타요} {곳|place}'],
        ['note', '{1호선|Line 1||일 호선} {갈아타는|changing (trains)|갈아타요} {곳|place}'] ],
      qs:[ { q:'Which exit for Deoksugung Palace?', opts:['Exit 2', 'Exit 1', 'Exit 4'], why:'덕수궁 is next to 2.', key:'출구' },
        { q:'What does 방면 mean on the sign?', opts:['Toward (that way)', 'Exit', 'Change trains here'], why:'방면 means "in the direction of": the trains on this side go toward that station.', key:'방면' } ] },
    { id:'bus', en:'Bus stop', icon:'map', kind:'bus',
      rows:[ ['title', '{버스|bus} {정류장|stop}'], ['station', '{광화문|Gwanghwamun}'],
        ['route', '{간선|trunk line (blue bus)}\t470 · 601'], ['route', '{지선|branch line (green bus)}\t7212'],
        ['note', '{다음|next} {정류장|stop}: {경복궁|Gyeongbokgung}'],
        ['head', '{도착|arrival} {정보|information}'], ['item', '470\t{3분|3 minutes||삼 분} {후|later, in}'], ['item', '601\t{곧|soon} {도착|arrival}'] ],
      qs:[ { q:'Which bus is arriving soon?', opts:['601', '470', '7212'], why:'곧 도착 means arriving soon. 470 comes in 3 minutes.', key:'곧' },
        { q:'What is the next stop?', opts:['Gyeongbokgung', 'Gwanghwamun', 'City Hall'], why:'다음 정류장 is the next stop: 경복궁.', key:'다음' } ] },
    { id:'store', en:'Convenience store receipt', icon:'bag', kind:'receipt',
      rows:[ ['title', '{편의점|convenience store}'], ['head', '{영수증|receipt}'],
        ['item', '{삼각김밥|triangle kimbap}\t1,500'], ['item', '{바나나우유|banana milk}\t1,700'], ['item', '{생수|bottled water}\t1,000'],
        ['total', '{합계|total}\t4,200'], ['item', '{카드|card} {결제|payment}\t4,200'],
        ['note', '{감사합니다|thank you}'] ],
      qs:[ { q:'What was the total?', opts:['4,200 won', '1,700 won', '4,000 won'], why:'합계 is the total: 4,200 won.', key:'합계' },
        { q:'How was it paid?', opts:['By card', 'In cash', 'With points'], why:'카드 결제 means card payment.', key:'결제' } ] },
    { id:'pharmacy', en:'Pharmacy', icon:'plus', kind:'pharmacy',
      rows:[ ['big', '{약|medicine}'], ['title', '{바다|sea} {약국|pharmacy}'],
        ['head', '{영업시간|opening hours}'], ['item', '{평일|weekdays}\t09:00 – 21:00'], ['item', '{토요일|Saturday}\t09:00 – 18:00'], ['item', '{일요일|Sunday}\t{휴무|closed}'],
        ['note', '{감기약|cold medicine} · {두통약|headache medicine} · {소화제|medicine for an upset stomach}'] ],
      qs:[ { q:'Is it open on Sunday?', opts:['No, it is closed on Sunday', 'Yes, from 9 to 6', 'Yes, all day'], why:'일요일 is Sunday, and 휴무 means closed.', key:'휴무' },
        { q:'You have a headache. Which word do you look for?', opts:['두통약', '감기약', '소화제'], why:'두통 is a headache, and 약 is medicine.', key:'두통약' } ] },
    { id:'hotel', en:'Hotel key card', icon:'bed', kind:'card',
      rows:[ ['title', '{객실|guest room} 1207'],
        ['item', '{체크아웃|check-out}\t11:00'], ['item', '{조식|breakfast}\t07:00 – 10:00'], ['item', '{식당|restaurant} {2층|2nd floor||이 층}'],
        ['item', '{와이파이|Wi-Fi} {비밀번호|password}\tcoral2026'],
        ['note', '{객실|guest room} {키는|the key|키} {프런트에|to the front desk|프런트} {반납해|return|반납해요} {주세요|please}'] ],
      qs:[ { q:'Where is breakfast?', opts:['The restaurant on the 2nd floor', 'Room 1207', 'The 1st floor'], why:'조식 is breakfast, and 식당 2층 is the restaurant on the 2nd floor.', key:'조식' },
        { q:'When is check-out?', opts:['11:00', '7:00', '10:00'], why:'체크아웃 is check-out: 11:00.', key:'체크아웃' } ] },
    { id:'taxi', en:'Taxi receipt', icon:'car', kind:'receipt',
      rows:[ ['title', '{택시|taxi} {영수증|receipt}'],
        ['item', '{승차|getting in}\t21:05'], ['item', '{하차|getting out}\t21:32'], ['item', '{거리|distance}\t12.4 km'],
        ['total', '{요금|fare}\t15,800'], ['item', '{결제|payment}\t{카드|card}'], ['note', '{차량번호|car number} 서울 12 바 3456'] ],
      qs:[ { q:'How much was the fare?', opts:['15,800 won', '12,400 won', '21,320 won'], why:'요금 is the fare: 15,800 won.', key:'요금' },
        { q:'What does 하차 mean?', opts:['Getting out', 'Getting in', 'Payment'], why:'하차 is getting out (21:32); 승차 is getting in.', key:'하차' } ] },
    { id:'door', en:'Push and pull door', icon:'lock', kind:'door',
      rows:[ ['side', 'Outside'], ['big', '{미세요|push (please)|밀다}'], ['side', 'Inside'], ['big', '{당기세요|pull (please)|당기다}'],
        ['note', '{자동문|automatic door}'] ],
      qs:[ { q:'The door says 당기세요. What do you do?', opts:['Pull it', 'Push it', 'Wait for it to open'], why:'당기세요 comes from 당기다, to pull.', key:'당기세요' },
        { q:'Which word means push?', opts:['미세요', '당기세요', '자동문'], why:'미세요 comes from 밀다, to push.', key:'미세요' } ] },
    { id:'toilet', en:'Restroom signs', icon:'compass', kind:'toilet',
      rows:[ ['title', '{화장실|restroom} →'], ['pair', '{남|men}\t{여|women}'], ['note', '{장애인|disabled people} {화장실|restroom}'], ['lock', '{사용|use} {중|in the middle of}'] ],
      qs:[ { q:'Which door is for women?', opts:['여', '남', '화장실'], why:'여 is women (from 여자), and 남 is men (from 남자).', key:'여' },
        { q:'The lock shows 사용 중. What does it mean?', opts:['Someone is inside', 'It is free', 'It is out of order'], why:'사용 중 means "in use".', key:'사용' } ] }
  ];

  var LH_MANNERS = [
    { id:'bow', en:'Bowing and greetings', icon:'wave',
      say:[ ['안녕하세요', 'Hello'], ['감사합니다', 'Thank you'] ],
      body:[ 'People in Korea greet with a small bow, bending a little from the waist, often while saying 안녕하세요. A light nod is fine with people your own age; a deeper bow shows more respect, for example to older people.',
        'Handshakes are common too, often with a slight bow. Someone younger may hold their right forearm with their left hand while shaking hands with someone older.' ],
      tip:'Walking into a small shop or meeting your host, a small bow and 안녕하세요 is always welcome.' },
    { id:'hands', en:'Two hands to give and receive', icon:'heart',
      say:[ ['여기 있어요', 'Here you are'] ],
      body:[ 'When you hand something to someone older, or to anyone you want to show respect, such as money, a card, a gift or a business card, use both hands. Your right hand with your left hand touching your right wrist or forearm works the same way.',
        'Receive things the same way. When pouring a drink for someone older, hold the bottle with both hands too.' ],
      tip:'Paying at a counter, hand over your card with both hands.' },
    { id:'shoes', en:'Shoes off indoors', icon:'school',
      say:[ ['신발은 여기에 벗어 주세요', 'Please take your shoes off here'] ],
      body:[ 'In Korean homes, people take their shoes off at the entrance, a small area often a step lower than the floor. Slippers may be offered.',
        'Some restaurants with floor seating, temples and guesthouses ask the same. Look for shoes lined up by the door or a shoe rack, and follow what others do.' ],
      tip:'Visiting a home, wear socks you are happy to show.' },
    { id:'polite', en:'Polite and casual speech', icon:'talk',
      say:[ ['감사합니다', 'Thank you (formal)'], ['고마워요', 'Thank you (polite)'], ['고마워', 'Thanks (casual)'], ['말 편하게 해도 돼요?', 'May I speak casually with you?'] ],
      body:[ 'Korean changes its endings for how polite you are being. 존댓말 is polite speech. 반말 is casual speech, for close friends your own age, younger family and children.',
        'The -요 ending (해요체) is the everyday polite style. It is right with shop staff, taxi drivers, new friends and almost everyone you meet as a traveler. The more formal -습니다 style is heard in announcements, the news and at work.',
        '반말 with a stranger or someone older can sound rude, so when you are not sure, keep the -요. Friends sometimes agree to switch to 반말 once they know each other.' ],
      tip:'With 지수 and everyone on your trip, the -요 ending is just right.' },
    { id:'server', en:'Calling a server', icon:'ask',
      say:[ ['여기요!', 'Over here!'], ['저기요!', 'Excuse me!'], ['계산해 주세요', 'The bill, please'] ],
      body:[ 'In many Korean restaurants, staff don\'t come to the table unless you call them. When you are ready to order or need something, raise your hand a little and call 여기요 ("over here") or 저기요 ("excuse me"). It is normal and polite.',
        'Many tables have a call button: just press it. Water is often self-service, and you usually pay at the counter by the door on your way out.' ],
      tip:'Ready to order? Catch someone\'s eye and say 여기요.' },
    { id:'tips', en:'No tipping', icon:'bag',
      say:[ ['잘 먹었습니다', 'Thank you for the meal (I ate well)'] ],
      body:[ 'Tipping isn\'t customary in Korea. The price in restaurants, cafes and taxis is what you pay, and tax is usually already included in the price shown.',
        'Leaving extra money can confuse staff, who may come after you to return it. Some upscale hotels add a service charge to the bill instead.' ],
      tip:'Leaving a restaurant, say 잘 먹었습니다: that is the thank-you.' },
    { id:'table', en:'Chopsticks and spoon', icon:'bowl',
      say:[ ['잘 먹겠습니다', 'Thank you for the meal (before eating)'], ['반찬 더 주세요', 'More side dishes, please'] ],
      body:[ 'Korean meals come with metal chopsticks and a long spoon. Rice and soup are eaten with the spoon, and the chopsticks are for side dishes (반찬). Bowls usually stay on the table instead of being lifted to the mouth.',
        'Don\'t stand chopsticks upright in your rice: that is how food is offered at memorial rites for the dead. Side dishes are shared, and refills are usually free.',
        'At a meal with older people, it is polite to wait until the oldest person starts eating.' ],
      tip:'Before eating, say 잘 먹겠습니다.' },
    { id:'titles', en:'Age and titles', icon:'profiles',
      say:[ ['언니', 'older sister (said by a woman)'], ['오빠', 'older brother (said by a woman)'], ['형', 'older brother (said by a man)'], ['누나', 'older sister (said by a man)'], ['지수 씨', 'Jisu (polite)'] ],
      body:[ 'Age shapes how people speak to each other in Korea, so asking someone\'s age when you meet is common, not rude.',
        'Friends often call an older friend by a family word instead of their name. A woman calls an older woman 언니 and an older man 오빠; a man calls an older man 형 and an older woman 누나. These are for people you are close to.',
        'Between adults who aren\'t close, a name with 씨 is polite (지수 씨), though not for someone much older or senior: they are called by their title, such as 선생님. Never add 씨 to your own name.' ],
      tip:'Not sure what to call someone? Use their name with 씨, or ask.' }
  ];

  // "{한국어|meaning|form|said as} and plain text" -> [{ t: plain } or { ko, en, base, say }]
  function lhSegs(text){
    var out = [], re = /\{([^}]*)\}/g, last = 0, m;
    while((m = re.exec(text))){
      if(m.index > last) out.push({ t: text.slice(last, m.index) });
      var p = m[1].split('|'); out.push({ ko: p[0], en: p[1] || '', base: p[2] || '', say: p[3] || '' });
      last = re.lastIndex;
    }
    if(last < text.length) out.push({ t: text.slice(last) });
    return out;
  }
  // Every word to tap on a sign, in order
  function lhWords(sign){
    var out = [];
    sign.rows.forEach(function(r){ lhSegs(r[1]).forEach(function(s){ if(s.ko) out.push(s); }); });
    return out;
  }
