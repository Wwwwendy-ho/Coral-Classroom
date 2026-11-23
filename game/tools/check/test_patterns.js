// Pattern Reef (src/js/patterns-data.js): the particle rules pick the right form from the last syllable (사과를,
// 책을, 물을; 학교는, 집은; 친구가, 선생님이), the mistake rules catch the slips they are meant to and leave right
// sentences alone, and the patterns hold together: every fix item differs from its right sentence only where it
// says, every build has its extra tile, every choice offers three different sentences, and every sentence that
// is spoken has a natural-voice clip.
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '../..');
var src = fs.readFileSync(path.join(ROOT, 'src/js/patterns-data.js'), 'utf8');
var P = new Function(src + '; return { L: PAT_LIST, S: PAT_SLIPS, particle: patParticle, batchim: patBatchim, find: patFind, words: patWords };')();
var bad = [];
function eq(what, got, want){ if(got !== want) bad.push(what + ': got ' + got + ', want ' + want); }
[['사과', 'object', '사과를'], ['책', 'object', '책을'], ['물', 'object', '물을'], ['학교', 'topic', '학교는'], ['집', 'topic', '집은'],
 ['친구', 'subject', '친구가'], ['선생님', 'subject', '선생님이'], ['빵', 'and', '빵과'], ['커피', 'and', '커피와'], ['저', 'subject', '제가']]
  .forEach(function(t){ eq('particle ' + t[0] + ' ' + t[1], P.particle(t[0], t[1]), t[2]); });

// the rules: what each sentence should be flagged as ('' for nothing)
var ruled = 0;
function slips(text, ctx){ ruled++; return P.find(text, ctx).map(function(f){ return f.slip; }).sort().join(','); }
[ ['책를 읽어요.', 'p-object'], ['물를 주세요', 'p-object'], ['사과을 사요', 'p-object'], ['라면와 김밥을 먹어요', 'p-object'],
  ['학교은 커요', 'p-topic'], ['집는 커요', 'p-topic'], ['친구이 와요', 'p-topic'], ['선생님가 와요', 'p-topic'], ['저가 안나예요', 'p-topic'],
  ['책을 읽어요.', ''], ['커피와 빵을 주세요.', ''], ['선생님이 와요.', ''], ['제가 안나예요.', ''], ['저는 학생이에요.', ''],
  ['저는 학생이세요.', 'honor-self'], ['네, 머리가 아프세요.', 'honor-self', { self: true }], ['네, 가세요.', 'honor-self', { self: true }],
  ['명동역 가세요?', '', { self: true }], ['여기 앉으세요.', ''], ['물 주세요.', ''], ['어서 오세요.', '', { self: true }], ['제 성함은 사라예요.', 'honor-self', { self: true }],
  ['아메리카노 있어요.', 'give-have', { self: true }], ['김치찌개 하나 있어요.', 'give-have', { self: true }], ['물 있어요?', ''], ['시간이 있어요.', ''],
  ['둘 명이요.', 'counter'], ['삼 명이요.', 'counter'], ['사과 하나 개 주세요.', 'counter'], ['커피 이 잔 주세요.', ''], ['이 명이요', 'counter'],
  ['두 명이요.', ''], ['커피 세 잔 주세요.', ''], ['사천오백 원이에요.', ''], ['다섯 원이에요', 'counter'], ['둘명이요', 'counter'], ['사 호선이요.', '']
].forEach(function(t){ eq('rules on "' + t[0] + '"', slips(t[0], t[2]), t[1]); });
var fixed = P.find('책를 읽어요.')[0]; eq('the fix for 책를', fixed && fixed.fix, '책을');

// the patterns
if(P.L.length !== 12) bad.push('expected 12 patterns, found ' + P.L.length);
Object.keys(P.S).forEach(function(k){ if(!P.L.some(function(p){ return p.id === P.S[k].pat; })) bad.push('slip ' + k + ' names no pattern'); });
var ix = JSON.parse(fs.readFileSync(path.join(ROOT, 'voice/index.json'), 'utf8'));
function key(t){ return String(t).normalize('NFC').trim().toLowerCase().replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '').replace(/\s+/g, ' '); }
var spoken = 0;
function voiced(w, where){ spoken++; if(!ix.clips['n|' + key(w)]) bad.push(where + ': no voice clip for ' + w); }
function toks(s){ return String(s).split(/\s+/).map(function(w){ return w.replace(/[.,!?]/g, ''); }).filter(Boolean); }
var kinds = { notice: 0, build: 0, change: 0, fix: 0 }, ids = {};
P.L.forEach(function(p){
  if(ids[p.id]) bad.push(p.id + ': twice'); ids[p.id] = 1;
  if(!p.en || !p.ko || !p.sum || !p.rule || p.rule.length < 2) bad.push(p.id + ': needs a name, its Korean, a summary and an explanation');
  if(p.ex.length < 3 || p.ex.length > 5) bad.push(p.id + ': needs 3 to 5 examples');
  p.ex.forEach(function(e){ if(!e[1]) bad.push(p.id + ': example ' + e[0] + ' has no English'); voiced(e[0], p.id); });
  if(p.items.length < 4) bad.push(p.id + ': a round needs four items or more');
  var has = {};
  p.items.forEach(function(it, i){
    var w = p.id + '.' + i + ' (' + it.k + ')';
    has[it.k] = 1; kinds[it.k]++;
    if(!it.ko || !it.en || !it.why) bad.push(w + ': needs ko, en and why');
    voiced(it.ko, w);
    if(it.k === 'notice' || it.k === 'change'){
      var all = [it.ko].concat(it.wrong || []);
      if(all.length !== 3 || new Set(all).size !== 3) bad.push(w + ': needs the right sentence and two different wrong ones');
      if(it.k === 'change'){ if(!it.from || !it.fromEn || !it.ask) bad.push(w + ': needs from, fromEn and ask'); else if(/[.?!]$/.test(it.from)) voiced(it.from, w); }
    }
    if(it.k === 'build'){
      var t = toks(it.ko);
      if(t.length < 2) bad.push(w + ': too short to build');
      if(!it.extra || t.indexOf(it.extra) !== -1) bad.push(w + ': the extra tile must differ from every word');
    }
    if(it.k === 'fix'){
      var b = toks(it.bad), k = toks(it.ko), n = it.n || 1, tail = b.length - it.at - n;
      if(b.slice(0, it.at).join(' ') !== k.slice(0, it.at).join(' ') || b.slice(b.length - tail).join(' ') !== k.slice(k.length - tail).join(' '))
        bad.push(w + ': the bad sentence must match the right one outside the spot');
      var right = k.slice(it.at, k.length - tail).join(' '), wrong = b.slice(it.at, it.at + n).join(' ');
      if(!right || right === wrong) bad.push(w + ': the spot holds no mistake');
      if(!it.alt || !it.alt.length || it.alt.indexOf(right) !== -1 || it.alt.indexOf(wrong) !== -1) bad.push(w + ': alt must offer other wrong repairs');
    }
  });
  ['notice', 'build', 'change', 'fix'].forEach(function(k){ if(!has[k]) bad.push(p.id + ': no ' + k + ' item'); });
});
if(bad.length){ console.log(bad.join('\n')); console.log('patterns: ' + bad.length + ' problems'); process.exit(1); }
console.log('patterns: particle forms right, the mistake rules right on ' + ruled + ' sentences, 12 patterns (' + kinds.notice + ' notice, ' + kinds.build + ' build, ' +
  kinds.change + ' change, ' + kinds.fix + ' fix items), ' + spoken + ' spoken sentences all voiced');
