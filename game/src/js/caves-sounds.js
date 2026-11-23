  /* ---------- ECHO CAVES: the sounds, the sound rules and the pitch measure ----------
     The data for Echo Caves (caves.js), and its one piece of signal work, kept apart from the screens so the unit
     test (tools/check/test_caves.js) can load this file on its own.

     CAVES_PAIRS: the Korean sound contrasts English speakers find hardest, each with sets of real, common words
     that differ only in that sound (a minimal pair or trio). A set is a list of [Korean, meaning].
       stops     plain / breathy (aspirated) / tight (tense): ㄱㅋㄲ, ㄷㅌㄸ, ㅂㅍㅃ, ㅈㅊㅉ, and ㅅ/ㅆ
       vowels    ㅓ/ㅗ and ㅡ/ㅜ (ㅐ/ㅔ is left out of the rounds: most speakers today say them the same; see CAVES_MERGED)
       endings   the final consonant (받침): ㄴ / ㅇ / ㅁ, and the unreleased ㄱ / ㄷ / ㅂ
     Each word is said by the natural voice (voice/index.json has a clip for every one).

     CAVES_RULES: the sound changes a learner meets first, each with the spelling and how it's said, a few more
     examples, and a check: the word is played, its meaning given, and she picks its spelling from three (the
     right one, the way it sounds written out, and one more). Pronunciations follow the standard rules
     (표준 발음법) and match what the voice says. */
  var CAVES_PAIRS = [
    { id:'k', label:'ㄱ ㅋ ㄲ', kind:'Plain, breathy or tight',
      tip:'ㅋ comes with a puff of air. ㄲ is tight, with no puff at all. ㄱ is in between: a little air, and the vowel after it starts lower in pitch.',
      sets:[ [['공', 'ball'], ['콩', 'bean']], [['굴', 'oyster'], ['꿀', 'honey']], [['개', 'dog'], ['깨', 'sesame']],
        [['크다', 'to be big'], ['끄다', 'to turn off']], [['고리', 'ring, loop'], ['꼬리', 'tail']], [['가다', 'to go'], ['까다', 'to peel']] ] },
    { id:'t', label:'ㄷ ㅌ ㄸ', kind:'Plain, breathy or tight',
      tip:'ㅌ comes with a puff of air. ㄸ is tight, with no puff at all. ㄷ is in between: a little air, and the vowel after it starts lower in pitch.',
      sets:[ [['달', 'moon'], ['탈', 'mask'], ['딸', 'daughter']], [['타다', 'to ride'], ['따다', 'to pick (fruit)']], [['덜', 'less'], ['털', 'fur, hair']] ] },
    { id:'p', label:'ㅂ ㅍ ㅃ', kind:'Plain, breathy or tight',
      tip:'ㅍ comes with a puff of air. ㅃ is tight, with no puff at all. ㅂ is in between: a little air, and the vowel after it starts lower in pitch.',
      sets:[ [['불', 'fire'], ['풀', 'grass'], ['뿔', 'horn']], [['방', 'room'], ['빵', 'bread']], [['비', 'rain'], ['피', 'blood']],
        [['발', 'foot'], ['팔', 'arm']], [['부리', 'beak'], ['뿌리', 'root']] ] },
    { id:'c', label:'ㅈ ㅊ ㅉ', kind:'Plain, breathy or tight',
      tip:'ㅊ comes with a puff of air. ㅉ is tight, with no puff at all. ㅈ is in between: a little air, and the vowel after it starts lower in pitch.',
      sets:[ [['자다', 'to sleep'], ['차다', 'to kick'], ['짜다', 'to be salty']], [['지다', 'to lose'], ['치다', 'to hit'], ['찌다', 'to steam']],
        [['자', 'ruler'], ['차', 'car; tea']] ] },
    { id:'s', label:'ㅅ ㅆ', kind:'Soft or tight hiss',
      tip:'ㅆ is a tight, sharp hiss, and the vowel after it starts higher. ㅅ is softer, with a little breath in it.',
      sets:[ [['사다', 'to buy'], ['싸다', 'to be cheap']], [['살', 'flesh; years old'], ['쌀', 'rice (uncooked)']], [['시', 'poem; o\'clock'], ['씨', 'seed']] ] },
    { id:'eo', label:'ㅓ ㅗ', kind:'Open or round',
      tip:'ㅗ has round lips, like "oh". ㅓ is open, with the lips relaxed and not rounded, a little like the "u" in "cup", held longer.',
      sets:[ [['거리', 'street'], ['고리', 'ring, loop']], [['섬', 'island'], ['솜', 'cotton']], [['벌', 'bee'], ['볼', 'cheek']], [['덜', 'less'], ['돌', 'stone']] ] },
    { id:'eu', label:'ㅡ ㅜ', kind:'Flat or round',
      tip:'ㅜ has round lips, like "oo". ㅡ keeps the tongue in the same place but the lips flat and spread, as if smiling.',
      sets:[ [['들', 'field'], ['둘', 'two']], [['은', 'silver'], ['운', 'luck']], [['글', 'writing'], ['굴', 'oyster']] ] },
    { id:'nasal', label:'ㄴ ㅇ ㅁ at the end', kind:'Word endings',
      tip:'At the end of a syllable: ㄴ puts the tongue tip up behind the teeth, ㅇ is "ng" as in "sing", and ㅁ closes the lips.',
      sets:[ [['반', 'half'], ['방', 'room'], ['밤', 'night']], [['간', 'liver'], ['강', 'river'], ['감', 'persimmon']], [['산', 'mountain'], ['상', 'prize']] ] },
    { id:'stop', label:'ㄱ ㄷ ㅂ at the end', kind:'Word endings',
      tip:'A final ㄱ, ㄷ or ㅂ is held, not let go: no puff after it. ㅂ closes the lips, ㄷ the tongue tip, ㄱ the back of the tongue. 밖 ends in a ㄱ sound and 밭 in a ㄷ sound.',
      sets:[ [['밥', 'rice, a meal'], ['밖', 'outside'], ['밭', 'field (for crops)']], [['국', 'soup'], ['굽', 'heel (of a shoe)']] ] }
  ];
  // Shown beside the rounds, not tested: two vowels most speakers no longer tell apart
  var CAVES_MERGED = { label:'ㅐ ㅔ', words:[['개', 'dog'], ['게', 'crab']],
    say:'Most people in Seoul today say ㅐ and ㅔ the same way, so 개 (dog) and 게 (crab) sound alike. Even Koreans tell them apart by the meaning around them, so this one isn\'t in the rounds.' };

  var CAVES_RULES = [
    { id:'link', ko:'연음', en:'Linking', word:'한국어', said:'한구거', mean:'the Korean language',
      rule:'When a syllable ends in a consonant and the next one starts with a silent ㅇ, the consonant slides over and starts the next syllable.',
      more:[['음악', '으막', 'music'], ['직업', '지겁', 'job'], ['옷이', '오시', 'the clothes (subject)']],
      check:{ word:'음악', mean:'music', opts:['음악', '으막', '음막'] } },
    { id:'nasal', ko:'비음화', en:'Becoming ㅇ, ㄴ, ㅁ', word:'감사합니다', said:'감사함니다', mean:'thank you',
      rule:'A ㄱ, ㄷ or ㅂ sound right before ㄴ or ㅁ turns into its nose sound: ㄱ becomes ㅇ, ㄷ becomes ㄴ, ㅂ becomes ㅁ.',
      more:[['입니다', '임니다', 'it is'], ['작년', '장년', 'last year'], ['거짓말', '거진말', 'a lie']],
      check:{ word:'국물', mean:'broth, soup', opts:['국물', '궁물', '군물'] } },
    { id:'tense', ko:'경음화', en:'Tightening', word:'학교', said:'학꾜', mean:'school',
      rule:'After a ㄱ, ㄷ or ㅂ sound, a plain ㄱ, ㄷ, ㅂ, ㅅ or ㅈ is said tight: ㄲ, ㄸ, ㅃ, ㅆ, ㅉ.',
      more:[['잡지', '잡찌', 'magazine'], ['국밥', '국빱', 'soup with rice'], ['약속', '약쏙', 'a promise, an appointment']],
      check:{ word:'식당', mean:'restaurant', opts:['식당', '식땅', '싱당'] } },
    { id:'h-drop', ko:'ㅎ 탈락', en:'Silent ㅎ', word:'좋아요', said:'조아요', mean:'it\'s good',
      rule:'A ㅎ at the end of a syllable goes silent when the next syllable starts with a vowel.',
      more:[['괜찮아요', '괜차나요', 'it\'s okay'], ['넣어요', '너어요', 'I put it in'], ['싫어요', '시러요', 'I don\'t like it']],
      check:{ word:'많이', mean:'a lot', opts:['많이', '마니', '만히'] } },
    { id:'aspirate', ko:'격음화', en:'Adding a puff', word:'축하해요', said:'추카해요', mean:'congratulations',
      rule:'A ㄱ, ㄷ, ㅂ or ㅈ next to a ㅎ joins with it into the breathy sound: ㅋ, ㅌ, ㅍ, ㅊ.',
      more:[['좋다', '조타', 'to be good'], ['입학', '이팍', 'starting school'], ['어떻게', '어떠케', 'how']],
      check:{ word:'입학', mean:'starting school', opts:['입학', '이팍', '임학'] } },
    { id:'palatal', ko:'구개음화', en:'ㄷ, ㅌ before 이', word:'같이', said:'가치', mean:'together',
      rule:'A final ㄷ or ㅌ before 이 is said ㅈ or ㅊ.',
      more:[['굳이', '구지', 'going out of one\'s way'], ['해돋이', '해도지', 'sunrise'], ['밭이', '바치', 'the field (subject)']],
      check:{ word:'해돋이', mean:'sunrise', opts:['해돋이', '해도지', '해도디'] } },
    { id:'liquid', ko:'유음화', en:'ㄴ next to ㄹ', word:'연락', said:'열락', mean:'contact, getting in touch',
      rule:'A ㄴ next to a ㄹ is said ㄹ too, so the two together sound like a long "l".',
      more:[['설날', '설랄', 'Lunar New Year'], ['신라', '실라', 'Silla (an old kingdom)'], ['편리', '펼리', 'convenience']],
      check:{ word:'연락', mean:'contact, getting in touch', opts:['연락', '열락', '연낙'] } }
  ];

  /* ---------- Pitch, measured on the device ----------
     cavesPitch(samples, rate) -> { hop, f0: [Hz or 0 per 20 ms step] }. Plain autocorrelation: each 40 ms frame is
     compared with itself shifted by every lag that fits a speaking voice (70–450 Hz), and the best lag gives the
     pitch, refined between samples. A frame counts as voiced only if it's loud enough (compared with the loudest
     frame) and clearly periodic; the result is then smoothed with a 5-step median, which also mends the odd
     octave jump. The audio is first thinned to about 11 kHz, plenty for a voice's pitch, so it runs fast on a phone.
     Nothing is judged: Echo Caves only draws the line and compares its shape and length with the voice's. */
  function cavesPitch(samples, rate){
    var step = Math.max(1, Math.floor(rate / 11025)), sr = rate / step, n = Math.floor(samples.length / step), x = new Float32Array(n), i, j, k;
    for(i = 0; i < n; i++){ var s = 0; for(j = 0; j < step; j++) s += samples[i * step + j]; x[i] = s / step; }
    var win = Math.round(sr * 0.04), hop = Math.round(sr * 0.02), minLag = Math.floor(sr / 450), maxLag = Math.ceil(sr / 70);
    var frames = [], loudest = 0;
    for(var at = 0; at + win + maxLag <= n; at += hop){
      var e = 0; for(i = 0; i < win; i++) e += x[at + i] * x[at + i];
      var rms = Math.sqrt(e / win); frames.push({ at: at, rms: rms }); if(rms > loudest) loudest = rms;
    }
    var f0 = frames.map(function(f){
      if(f.rms < loudest * 0.12 || f.rms < 1e-4) return 0;
      var best = 0, bestLag = 0, r = [];
      for(var lag = minLag - 1; lag <= maxLag + 1; lag++){
        var c = 0, e1 = 0, e2 = 0;
        for(k = 0; k < win; k++){ var a = x[f.at + k], b = x[f.at + k + lag]; c += a * b; e1 += a * a; e2 += b * b; }
        r[lag] = c / (Math.sqrt(e1 * e2) || 1);
      }
      for(lag = minLag; lag <= maxLag; lag++) if(r[lag] > best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]){ best = r[lag]; bestLag = lag; }
      if(best < 0.5 || !bestLag) return 0;
      // a shorter lag nearly as good is the true period (the longer one is a multiple of it)
      for(var d = 2; d <= 4; d++){ var sub = Math.round(bestLag / d); if(sub >= minLag && r[sub] > best * 0.9 && r[sub] >= r[sub - 1] && r[sub] >= r[sub + 1]){ bestLag = sub; best = r[sub]; } }
      var y0 = r[bestLag - 1], y1 = r[bestLag], y2 = r[bestLag + 1], den = y0 - 2 * y1 + y2;
      var shift = den ? Math.max(-0.5, Math.min(0.5, 0.5 * (y0 - y2) / den)) : 0;
      return sr / (bestLag + shift);
    });
    var out = f0.map(function(v, idx){
      if(!v) return 0;
      var w = []; for(var q = idx - 2; q <= idx + 2; q++) if(f0[q]) w.push(f0[q]);
      w.sort(function(a, b){ return a - b; });
      return w[Math.floor(w.length / 2)];
    });
    return { hop: hop / sr, f0: out };
  }
  // The stretch from the first voiced step to the last, in seconds (how long the speaking itself took)
  function cavesSpan(p){
    var a = -1, b = -1; p.f0.forEach(function(v, i){ if(v){ if(a < 0) a = i; b = i; } });
    return a < 0 ? { from: 0, to: 0, secs: 0 } : { from: a, to: b, secs: (b - a + 1) * p.hop };
  }
  // The voiced part in semitones from the speaker's own middle pitch (so a low and a high voice compare fairly),
  // stretched to `n` points, with the gaps between syllables filled in straight
  function cavesShape(p, n){
    var sp = cavesSpan(p); if(sp.to - sp.from < 4) return null;
    var seg = p.f0.slice(sp.from, sp.to + 1), on = seg.filter(Boolean).slice().sort(function(a, b){ return a - b; });
    if(on.length < 4) return null;
    var mid = on[Math.floor(on.length / 2)], st = seg.map(function(v){ return v ? 12 * Math.log2(v / mid) : null; });
    for(var i = 0; i < st.length; i++) if(st[i] == null){
      var l = i - 1, r = i + 1; while(r < st.length && st[r] == null) r++;
      st[i] = l < 0 ? st[r] : r >= st.length ? st[l] : st[l] + (st[r] - st[l]) * (i - l) / (r - l);
    }
    var out = []; for(var j = 0; j < n; j++){ var t = j * (st.length - 1) / (n - 1), lo = Math.floor(t), hi = Math.min(st.length - 1, lo + 1); out.push(st[lo] + (st[hi] - st[lo]) * (t - lo)); }
    return out;
  }
  // How alike two pitch shapes are, -1 to 1 (a plain correlation); null if either has too little voice
  function cavesLikeness(a, b){
    if(!a || !b) return null;
    var n = a.length, ma = 0, mb = 0, i; for(i = 0; i < n; i++){ ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    var c = 0, va = 0, vb = 0; for(i = 0; i < n; i++){ c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) * (a[i] - ma); vb += (b[i] - mb) * (b[i] - mb); }
    return va < 0.5 || vb < 0.5 ? (va < 0.5 && vb < 0.5 ? 1 : 0) : c / Math.sqrt(va * vb);   // both flat counts as alike
  }
