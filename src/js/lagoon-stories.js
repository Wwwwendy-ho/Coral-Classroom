  /* ---------- STORY LAGOON: the built-in stories ----------
     Twelve short conversations for a grown-up getting ready for a trip to Korea, in the order the trip happens.
     Anna, a traveler from Canada, is in every one, so the stories feel like one journey.
     Each line is [speaker, Korean, English, words]. speaker is 0 or 1, an index into cast. words glosses every
     space-separated piece of the Korean line, in order, as "piece=meaning" or "piece=meaning=base", joined by ";".
     The piece is written without its punctuation; base is the plain word as the Korean decks have it (공항에 →
     공항), so a word known from a deck counts as known here too. Each question names the lines (at) its answer
     comes from, so a right or wrong answer is recorded against those lines' words.
     Korean is polite 해요체 throughout, with the set phrases (감사합니다, 반갑습니다) as Koreans say them. */
  var LAGOON_STORIES = [
    { id:'arrive', en:'Arriving', ko:'공항에 도착했어요', cast:[['Officer','직원'], ['Anna','안나']],
      lines:[
        [0, '안녕하세요. 여권 좀 보여 주세요.', 'Hello. Please show me your passport.', '안녕하세요=hello;여권=passport;좀=please (softens a request);보여=show=보여 주다;주세요=please (do it for me)=주세요'],
        [1, '네, 여기 있어요.', 'Sure, here it is.', '네=yes;여기=here;있어요=it is (there is)=있어요'],
        [0, '여행 오셨어요?', 'Are you here to travel?', '여행=travel, a trip;오셨어요=came (polite, said to you)=와요'],
        [1, '네, 여행 왔어요.', 'Yes, I came to travel.', '네=yes;여행=travel, a trip;왔어요=came=와요'],
        [0, '며칠 동안 계실 거예요?', 'How many days will you stay?', '며칠=how many days;동안=for (a length of time);계실=stay (polite, said to you)=있어요;거예요=will (going to)'],
        [1, '일주일 동안 있을 거예요.', 'I will stay for a week.', '일주일=one week;동안=for (a length of time);있을=stay=있어요;거예요=will (going to)'],
        [0, '좋은 여행 되세요.', 'Have a good trip.', '좋은=good;여행=trip=여행;되세요=have (may it be)']
      ],
      qs:[
        { q:'안나는 왜 한국에 왔어요?', en:'Why did Anna come to Korea?', o:[['여행 왔어요.', 'To travel.'], ['일하러 왔어요.', 'To work.'], ['공부하러 왔어요.', 'To study.']], a:0, at:[2, 3] },
        { q:'며칠 동안 있을 거예요?', en:'How many days will she stay?', o:[['사흘 동안요.', 'Three days.'], ['일주일 동안요.', 'A week.'], ['한 달 동안요.', 'A month.']], a:1, at:[4, 5] }
      ] },
    { id:'hotel', en:'The hotel', ko:'호텔에서', cast:[['Front desk','직원'], ['Anna','안나']],
      lines:[
        [1, '안녕하세요. 체크인하고 싶어요.', 'Hello. I would like to check in.', '안녕하세요=hello;체크인하고=check in;싶어요=I would like to'],
        [0, '성함이 어떻게 되세요?', 'May I have your name?', '성함이=name (polite)=이름;어떻게=how=어떻게;되세요=is (polite)'],
        [1, '안나예요.', 'It is Anna.', '안나예요=it is Anna'],
        [0, '네, 방은 칠 층이에요.', 'All right, your room is on the seventh floor.', '네=all right, yes;방은=the room=방;칠=seven=칠;층이에요=is the floor=층'],
        [1, '아침 식사는 몇 시예요?', 'What time is breakfast?', '아침=morning=아침;식사는=meal=아침 식사;몇=what (how many)=몇;시예요=o\'clock is it=시'],
        [0, '일곱 시부터 열 시까지예요.', 'It is from seven to ten.', '일곱=seven=일곱;시부터=o\'clock, from=시;열=ten=열;시까지예요=o\'clock, until=시'],
        [0, '엘리베이터는 저쪽에 있어요.', 'The elevator is over there.', '엘리베이터는=the elevator;저쪽에=over there;있어요=is (there)=있어요'],
        [1, '감사합니다.', 'Thank you.', '감사합니다=thank you']
      ],
      qs:[
        { q:'안나의 방은 몇 층이에요?', en:'What floor is Anna\'s room on?', o:[['삼 층이에요.', 'The third floor.'], ['칠 층이에요.', 'The seventh floor.'], ['십 층이에요.', 'The tenth floor.']], a:1, at:[3] },
        { q:'아침 식사는 몇 시부터예요?', en:'What time does breakfast start?', o:[['여섯 시부터요.', 'From six.'], ['일곱 시부터요.', 'From seven.'], ['열 시부터요.', 'From ten.']], a:1, at:[4, 5] }
      ] },
    { id:'cafe', en:'At a cafe', ko:'카페에서', cast:[['Barista','직원'], ['Anna','안나']],
      lines:[
        [0, '어서 오세요. 뭐 드릴까요?', 'Welcome. What can I get you?', '어서=welcome (with 오세요)=어서 오세요;오세요=welcome, please come in=어서 오세요;뭐=what=뭐;드릴까요=shall I give you'],
        [1, '아이스 아메리카노 한 잔 주세요.', 'One iced americano, please.', '아이스=iced;아메리카노=americano;한=one;잔=cup (counter)=잔;주세요=please give me=주세요'],
        [0, '드시고 가세요?', 'Is it for here?', '드시고=have it (eat or drink, polite), and;가세요=go (are you going)'],
        [1, '아니요, 가져갈게요.', 'No, I will take it with me.', '아니요=no=아니요;가져갈게요=I will take it with me'],
        [1, '이 빵도 하나 주세요.', 'One of this bread too, please.', '이=this=이것;빵도=bread too=빵;하나=one=하나;주세요=please give me=주세요'],
        [0, '네, 모두 칠천 원이에요.', 'Sure, that is seven thousand won in all.', '네=sure, yes;모두=in all, everything;칠천=seven thousand;원이에요=won it is=원'],
        [1, '카드 돼요?', 'Can I pay by card?', '카드=card;돼요=is it okay, does it work'],
        [0, '네, 돼요.', 'Yes, that works.', '네=yes;돼요=it works, it is okay']
      ],
      qs:[
        { q:'안나는 커피를 여기서 마셔요?', en:'Does Anna drink her coffee here?', o:[['네, 여기서 마셔요.', 'Yes, she drinks it here.'], ['아니요, 가져가요.', 'No, she takes it with her.'], ['커피를 안 마셔요.', 'She does not drink coffee.']], a:1, at:[2, 3] },
        { q:'모두 얼마예요?', en:'How much is it in all?', o:[['사천 원이에요.', 'Four thousand won.'], ['칠천 원이에요.', 'Seven thousand won.'], ['만 원이에요.', 'Ten thousand won.']], a:1, at:[5] }
      ] },
    { id:'restaurant', en:'At a restaurant', ko:'식당에서', cast:[['Server','직원'], ['Anna','안나']],
      lines:[
        [0, '어서 오세요. 몇 분이세요?', 'Welcome. How many are you?', '어서=welcome (with 오세요)=어서 오세요;오세요=welcome, please come in=어서 오세요;몇=how many=몇;분이세요=people (polite) are you'],
        [1, '두 명이요.', 'Two people.', '두=two=둘;명이요=people (counter)=명'],
        [0, '이쪽으로 앉으세요.', 'Please sit over here.', '이쪽으로=this way, over here;앉으세요=please sit=앉아요'],
        [1, '비빔밥 하나하고 김치찌개 하나 주세요.', 'One bibimbap and one kimchi stew, please.', '비빔밥=bibimbap (rice mixed with vegetables);하나하고=one, and=하나;김치찌개=kimchi stew=김치;하나=one=하나;주세요=please give me=주세요'],
        [0, '김치찌개는 좀 매워요. 괜찮으세요?', 'The kimchi stew is a little spicy. Is that all right?', '김치찌개는=the kimchi stew=김치;좀=a little;매워요=is spicy;괜찮으세요=is it all right for you=괜찮아요'],
        [1, '네, 괜찮아요. 매운 음식을 좋아해요.', 'Yes, it is fine. I like spicy food.', '네=yes;괜찮아요=it is fine=괜찮아요;매운=spicy;음식을=food=음식;좋아해요=I like=좋아해요'],
        [0, '맛있게 드세요.', 'Enjoy your meal.', '맛있게=deliciously, with enjoyment=맛있어요;드세요=please eat'],
        [1, '여기요, 물 좀 주세요.', 'Excuse me, some water, please.', '여기요=excuse me (to call staff)=여기;물=water=물;좀=some, please;주세요=please give me=주세요']
      ],
      qs:[
        { q:'몇 명이 왔어요?', en:'How many people came?', o:[['한 명이요.', 'One.'], ['두 명이요.', 'Two.'], ['세 명이요.', 'Three.']], a:1, at:[1] },
        { q:'뭐가 매워요?', en:'What is spicy?', o:[['비빔밥이요.', 'The bibimbap.'], ['김치찌개요.', 'The kimchi stew.'], ['물이요.', 'The water.']], a:1, at:[4] }
      ] },
    { id:'shopping', en:'Shopping', ko:'옷 가게에서', cast:[['Clerk','직원'], ['Anna','안나']],
      lines:[
        [1, '이 티셔츠 얼마예요?', 'How much is this T-shirt?', '이=this=이것;티셔츠=T-shirt=셔츠;얼마예요=how much is it=얼마'],
        [0, '이만 원이에요.', 'It is twenty thousand won.', '이만=twenty thousand;원이에요=won it is=원'],
        [1, '좀 비싸요. 더 싼 거 있어요?', 'That is a little expensive. Do you have a cheaper one?', '좀=a little;비싸요=is expensive=비싸요;더=more=더;싼=cheap=싸요;거=one, thing;있어요=do you have=있어요'],
        [0, '이건 만 오천 원이에요.', 'This one is fifteen thousand won.', '이건=this one=이것;만=ten thousand;오천=five thousand;원이에요=won it is=원'],
        [1, '다른 색도 있어요?', 'Do you have other colors too?', '다른=other;색도=color too;있어요=do you have=있어요'],
        [0, '네, 흰색하고 파란색이 있어요.', 'Yes, we have white and blue.', '네=yes;흰색하고=white, and=흰색;파란색이=blue=파란색;있어요=we have=있어요'],
        [1, '파란색으로 주세요.', 'The blue one, please.', '파란색으로=the blue one=파란색;주세요=please give me=주세요']
      ],
      qs:[
        { q:'처음 티셔츠는 얼마예요?', en:'How much is the first T-shirt?', o:[['만 원이에요.', 'Ten thousand won.'], ['만 오천 원이에요.', 'Fifteen thousand won.'], ['이만 원이에요.', 'Twenty thousand won.']], a:2, at:[0, 1] },
        { q:'안나는 무슨 색을 사요?', en:'What color does Anna buy?', o:[['흰색이요.', 'White.'], ['파란색이요.', 'Blue.'], ['빨간색이요.', 'Red.']], a:1, at:[5, 6] }
      ] },
    { id:'subway', en:'The subway', ko:'지하철 타기', cast:[['A local','시민'], ['Anna','안나']],
      lines:[
        [1, '실례합니다. 명동역에 가고 싶어요.', 'Excuse me. I want to go to Myeongdong Station.', '실례합니다=excuse me=실례합니다;명동역에=to Myeongdong Station=역;가고=go=가요;싶어요=I want to'],
        [0, '사 호선을 타세요.', 'Take Line 4.', '사=four=사;호선을=subway line;타세요=please take (ride)'],
        [1, '여기서 멀어요?', 'Is it far from here?', '여기서=from here=여기;멀어요=is it far'],
        [0, '아니요, 세 정거장이에요.', 'No, it is three stops.', '아니요=no=아니요;세=three=셋;정거장이에요=stops it is'],
        [1, '표는 어디에서 사요?', 'Where do I buy a ticket?', '표는=a ticket;어디에서=where=어디;사요=do I buy=사요'],
        [0, '저기 기계에서 사요. 교통카드도 돼요.', 'You buy it at that machine. A transit card works too.', '저기=over there;기계에서=at the machine;사요=you buy=사요;교통카드도=a transit card too;돼요=works, is okay'],
        [1, '정말 감사합니다.', 'Thank you so much.', '정말=really, so;감사합니다=thank you=감사합니다']
      ],
      qs:[
        { q:'몇 호선을 타요?', en:'Which line does Anna take?', o:[['이 호선이요.', 'Line 2.'], ['사 호선이요.', 'Line 4.'], ['칠 호선이요.', 'Line 7.']], a:1, at:[1] },
        { q:'명동역은 몇 정거장이에요?', en:'How many stops to Myeongdong Station?', o:[['두 정거장이에요.', 'Two stops.'], ['세 정거장이에요.', 'Three stops.'], ['다섯 정거장이에요.', 'Five stops.']], a:1, at:[3] }
      ] },
    { id:'taxi', en:'A taxi', ko:'택시 타기', cast:[['Driver','기사님'], ['Anna','안나']],
      lines:[
        [0, '안녕하세요. 어디로 가세요?', 'Hello. Where are you going?', '안녕하세요=hello;어디로=where to=어디;가세요=are you going (polite)=가요'],
        [1, '서울역으로 가 주세요.', 'To Seoul Station, please.', '서울역으로=to Seoul Station=역;가=go=가요;주세요=please (do it for me)'],
        [0, '네. 안전벨트 매세요.', 'All right. Please fasten your seat belt.', '네=all right, yes;안전벨트=seat belt;매세요=please fasten'],
        [1, '얼마나 걸려요?', 'How long does it take?', '얼마나=how long, how much=얼마나;걸려요=does it take (time)'],
        [0, '길이 막혀서 삼십 분쯤 걸려요.', 'The traffic is heavy, so it takes about thirty minutes.', '길이=the road;막혀서=is jammed, so;삼십=thirty=삼십 분;분쯤=minutes, about=분;걸려요=it takes (time)'],
        [1, '여기서 세워 주세요.', 'Please stop here.', '여기서=here=여기;세워=stop (the car);주세요=please (do it for me)'],
        [0, '만 이천 원이에요.', 'That is twelve thousand won.', '만=ten thousand;이천=two thousand;원이에요=won it is=원']
      ],
      qs:[
        { q:'안나는 어디로 가요?', en:'Where is Anna going?', o:[['서울역이요.', 'Seoul Station.'], ['공항이요.', 'The airport.'], ['호텔이요.', 'The hotel.']], a:0, at:[1] },
        { q:'얼마나 걸려요?', en:'How long does it take?', o:[['십 분쯤 걸려요.', 'About ten minutes.'], ['삼십 분쯤 걸려요.', 'About thirty minutes.'], ['한 시간쯤 걸려요.', 'About an hour.']], a:1, at:[3, 4] }
      ] },
    { id:'way', en:'Asking the way', ko:'길 묻기', cast:[['A local','시민'], ['Anna','안나']],
      lines:[
        [1, '저기요, 이 근처에 은행이 있어요?', 'Excuse me, is there a bank near here?', '저기요=excuse me;이=this=이것;근처에=nearby, around here;은행이=a bank=은행;있어요=is there=있어요'],
        [0, '네, 이 길로 쭉 가세요.', 'Yes, go straight down this street.', '네=yes;이=this=이것;길로=along the street;쭉=straight on;가세요=please go=가요'],
        [0, '편의점 앞에서 오른쪽으로 도세요.', 'Turn right at the convenience store.', '편의점=convenience store;앞에서=in front of;오른쪽으로=to the right;도세요=please turn'],
        [0, '은행은 병원 옆에 있어요.', 'The bank is next to the hospital.', '은행은=the bank=은행;병원=hospital=병원;옆에=next to;있어요=is (there)=있어요'],
        [1, '걸어서 갈 수 있어요?', 'Can I walk there?', '걸어서=on foot=걸어요;갈=go=가요;수=can (with 있어요);있어요=can (I)=있어요'],
        [0, '네, 오 분쯤 걸려요.', 'Yes, it takes about five minutes.', '네=yes;오=five=오;분쯤=minutes, about=분;걸려요=it takes (time)'],
        [1, '감사합니다!', 'Thank you!', '감사합니다=thank you']
      ],
      qs:[
        { q:'은행은 어디에 있어요?', en:'Where is the bank?', o:[['병원 옆에 있어요.', 'Next to the hospital.'], ['학교 뒤에 있어요.', 'Behind the school.'], ['공원 앞에 있어요.', 'In front of the park.']], a:0, at:[3] },
        { q:'편의점 앞에서 어디로 가요?', en:'Which way does Anna go at the convenience store?', o:[['왼쪽으로 가요.', 'Left.'], ['오른쪽으로 가요.', 'Right.'], ['뒤로 가요.', 'Back.']], a:1, at:[2] }
      ] },
    { id:'meet', en:'Meeting someone', ko:'처음 만났어요', cast:[['Minsu','민수'], ['Anna','안나']],
      lines:[
        [0, '안녕하세요. 저는 민수예요.', 'Hello. I am Minsu.', '안녕하세요=hello;저는=I=저;민수예요=am Minsu'],
        [1, '안녕하세요. 저는 안나예요. 만나서 반갑습니다.', 'Hello. I am Anna. Nice to meet you.', '안녕하세요=hello;저는=I=저;안나예요=am Anna;만나서=to meet you=만나서 반갑습니다;반갑습니다=I am glad=만나서 반갑습니다'],
        [0, '어느 나라 사람이에요?', 'What country are you from?', '어느=which=어느 것;나라=country=나라;사람이에요=person are you'],
        [1, '캐나다 사람이에요.', 'I am Canadian.', '캐나다=Canada;사람이에요=a person I am'],
        [0, '한국어를 잘하네요!', 'You speak Korean well!', '한국어를=Korean (the language);잘하네요=you are good at it'],
        [1, '아니에요, 아직 잘 못해요.', 'Not really, I am not good at it yet.', '아니에요=not really, no=아니요;아직=yet, still;잘=well;못해요=cannot do'],
        [0, '한국 음식 좋아해요?', 'Do you like Korean food?', '한국=Korea, Korean;음식=food=음식;좋아해요=do you like=좋아해요'],
        [1, '네, 김치를 정말 좋아해요.', 'Yes, I really like kimchi.', '네=yes;김치를=kimchi=김치;정말=really;좋아해요=I like=좋아해요']
      ],
      qs:[
        { q:'안나는 어느 나라 사람이에요?', en:'What country is Anna from?', o:[['한국 사람이에요.', 'Korea.'], ['캐나다 사람이에요.', 'Canada.'], ['중국 사람이에요.', 'China.']], a:1, at:[2, 3] },
        { q:'안나는 뭘 정말 좋아해요?', en:'What does Anna really like?', o:[['김치를 좋아해요.', 'Kimchi.'], ['커피를 좋아해요.', 'Coffee.'], ['국수를 좋아해요.', 'Noodles.']], a:0, at:[7] }
      ] },
    { id:'weather', en:'The weather', ko:'오늘 날씨', cast:[['Minsu','민수'], ['Anna','안나']],
      lines:[
        [1, '오늘 날씨가 어때요?', 'What is the weather like today?', '오늘=today=오늘;날씨가=the weather=날씨;어때요=how is it'],
        [0, '오늘은 좀 추워요.', 'It is a little cold today.', '오늘은=today=오늘;좀=a little;추워요=it is cold=추워요'],
        [1, '오후에 비가 와요?', 'Is it going to rain in the afternoon?', '오후에=in the afternoon=오후;비가=rain=비;와요=comes, falls=와요'],
        [0, '네, 오후부터 비가 와요.', 'Yes, it rains from the afternoon.', '네=yes;오후부터=from the afternoon=오후;비가=rain=비;와요=comes, falls=와요'],
        [0, '우산 있어요?', 'Do you have an umbrella?', '우산=umbrella=우산;있어요=do you have=있어요'],
        [1, '아니요, 없어요. 편의점에서 살게요.', 'No, I do not. I will buy one at a convenience store.', '아니요=no=아니요;없어요=I do not have;편의점에서=at a convenience store;살게요=I will buy=사요'],
        [0, '내일은 날씨가 좋아요.', 'Tomorrow the weather is nice.', '내일은=tomorrow=내일;날씨가=the weather=날씨;좋아요=is good, nice']
      ],
      qs:[
        { q:'오늘 날씨가 어때요?', en:'What is the weather like today?', o:[['더워요.', 'It is hot.'], ['추워요.', 'It is cold.'], ['따뜻해요.', 'It is warm.']], a:1, at:[1] },
        { q:'안나는 우산을 어디에서 사요?', en:'Where will Anna buy an umbrella?', o:[['편의점에서 사요.', 'At a convenience store.'], ['시장에서 사요.', 'At the market.'], ['호텔에서 사요.', 'At the hotel.']], a:0, at:[4, 5] }
      ] },
    { id:'market', en:'At the market', ko:'시장에서', cast:[['Seller','사장님'], ['Anna','안나']],
      lines:[
        [1, '사과 얼마예요?', 'How much are the apples?', '사과=apple;얼마예요=how much is it=얼마'],
        [0, '다섯 개에 만 원이에요.', 'Five for ten thousand won.', '다섯=five=다섯;개에=for (things)=개;만=ten thousand;원이에요=won it is=원'],
        [1, '이 귤도 맛있어요?', 'Are these tangerines good too?', '이=these, this=이것;귤도=tangerines too;맛있어요=are they tasty=맛있어요'],
        [0, '네, 아주 달아요. 하나 드셔 보세요.', 'Yes, they are very sweet. Try one.', '네=yes;아주=very;달아요=they are sweet;하나=one=하나;드셔=eat (polite);보세요=try (and see)=봐요'],
        [1, '와, 정말 맛있어요!', 'Wow, it is really good!', '와=wow;정말=really;맛있어요=it is tasty=맛있어요'],
        [1, '사과 다섯 개하고 귤 한 봉지 주세요.', 'Five apples and a bag of tangerines, please.', '사과=apple;다섯=five=다섯;개하고=(things), and=개;귤=tangerine;한=one;봉지=bag;주세요=please give me=주세요'],
        [0, '감사합니다. 또 오세요.', 'Thank you. Come again.', '감사합니다=thank you;또=again;오세요=please come=와요']
      ],
      qs:[
        { q:'사과 다섯 개에 얼마예요?', en:'How much are five apples?', o:[['오천 원이에요.', 'Five thousand won.'], ['만 원이에요.', 'Ten thousand won.'], ['이만 원이에요.', 'Twenty thousand won.']], a:1, at:[1] },
        { q:'귤은 어때요?', en:'What are the tangerines like?', o:[['달아요.', 'Sweet.'], ['매워요.', 'Spicy.'], ['비싸요.', 'Expensive.']], a:0, at:[3] }
      ] },
    { id:'goodbye', en:'Saying goodbye', ko:'다음에 또 만나요', cast:[['Minsu','민수'], ['Anna','안나']],
      lines:[
        [1, '내일 캐나다로 돌아가요.', 'I go back to Canada tomorrow.', '내일=tomorrow=내일;캐나다로=to Canada;돌아가요=I go back'],
        [0, '벌써요? 시간이 정말 빨리 가요.', 'Already? Time goes by so fast.', '벌써요=already;시간이=time;정말=really, so;빨리=fast=빨라요;가요=goes=가요'],
        [0, '한국 여행은 어땠어요?', 'How was your trip to Korea?', '한국=Korea;여행은=the trip=여행;어땠어요=how was it'],
        [1, '정말 재미있었어요. 음식도 맛있었어요.', 'It was really fun. The food was delicious too.', '정말=really;재미있었어요=it was fun;음식도=the food too=음식;맛있었어요=was delicious=맛있어요'],
        [0, '다음에 또 오세요.', 'Come again next time.', '다음에=next time=다음에 봐요;또=again;오세요=please come=와요'],
        [1, '네, 꼭 다시 올게요.', 'Yes, I will be sure to come back.', '네=yes;꼭=for sure;다시=again;올게요=I will come=와요'],
        [0, '잘 가요. 건강하세요!', 'Goodbye. Take care!', '잘=well, safely;가요=go=가요;건강하세요=stay healthy, take care']
      ],
      qs:[
        { q:'안나는 언제 캐나다로 돌아가요?', en:'When does Anna go back to Canada?', o:[['오늘 돌아가요.', 'Today.'], ['내일 돌아가요.', 'Tomorrow.'], ['다음 주에 돌아가요.', 'Next week.']], a:1, at:[0] },
        { q:'한국 여행은 어땠어요?', en:'How was the trip to Korea?', o:[['재미있었어요.', 'It was fun.'], ['심심했어요.', 'It was boring.'], ['무서웠어요.', 'It was scary.']], a:0, at:[3] }
      ] }
  ];
