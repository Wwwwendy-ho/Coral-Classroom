// Bottle Beach (src/js/beach-data.js) and the Lighthouse (src/js/light-data.js): the writing feedback praises a
// right sentence and gives it no fixes, catches a particle slip (사과을), -세요 about yourself, a counter slip and a
// possible spelling slip, and never gives more than two fixes; 지수 answers by the words in a reply; every letter's
// words line up with its question; every sign question has three answers and its key word on the sign; and
// every Korean line either region speaks has a natural-voice clip.
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '../..');
function read(f){ return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
var D = new Function(read('src/js/patterns-data.js') + read('src/js/beach-data.js') + read('src/js/light-data.js') +
  '; return { B: BB_BOTTLES, check: bbCheck, reply: bbReply, words: bbWords, S: LH_SIGNS, M: LH_MANNERS, lw: lhWords, segs: lhSegs };')();
var bad = [];
function eq(what, got, want){ if(got !== want) bad.push(what + ': got ' + got + ', want ' + want); }

// a small dictionary: the words of the bottles, as the app's is built from them and more
var dict = {};
'사과 비빔밥 친구 학교 명동 쇼핑 오늘 저 호텔 카페 가족 엄마 아빠 동생 사람 학생 경복궁 한국 음식 내일'.split(' ').forEach(function(w){ dict[w] = 1; });
var lex = { has: function(w){ return !!dict[w]; }, known: function(w){ return w === '사과' || w === '오늘'; }, list: Object.keys(dict) };
function fixes(t){ return D.check(t, lex).fixes.map(function(f){ return f.kind === 'rule' ? f.pat : 'spell'; }).join(','); }
[ ['저는 사과를 좋아해요.', ''], ['오늘 명동에 갔어요. 쇼핑했어요!', ''], ['내일은 경복궁에 갈 거예요.', ''], ['한글을 읽을 수 있어요.', ''],
  ['우리 가족은 네 명이에요.', ''], ['사과을 사요.', 'object'], ['저는 학생이세요.', 'request'], ['우리 가족은 사 명이에요.', 'count'],
  ['비빔밤을 좋아해요.', 'spell'], ['저는 안나예요. 미국에서 왔어요.', '']
].forEach(function(t){ eq('fixes for "' + t[0] + '"', fixes(t[0]), t[1]); });
var right = D.check('저는 사과를 좋아해요.', lex);
eq('a right sentence is praised for its patterns', right.good.map(function(g){ return g.pat; }).join(','), 'topic,object,present');
eq('a right sentence is polite', right.polite, true);
eq('a right sentence counts as clean', right.clean.length, 1);
eq('words she knows are named', right.known.join(','), '사과를');
var slip = D.check('사과을 사요.', lex);
eq('the particle fix for 사과을', slip.fixes[0] && slip.fixes[0].fix, '사과를');
eq('a sentence with a slip is not clean', slip.clean.length, 0);
eq('never more than two fixes', D.check('저가 사과을 사요. 비빔밤을 먹어요. 학교은 커요.', lex).fixes.length, 2);
eq('no Hangul, no sentences', D.check('hello', lex).sentences.length, 0);

// 지수's replies
var food = D.B.find(function(b){ return b.id === 'food'; });
eq('a reply about bibimbap', D.reply(food, '비빔밥을 좋아해요').ko.indexOf('비빔밥') !== -1, true);
eq('a reply with no key word gets the last one', D.reply(food, '라면이 좋아요'), food.replies[food.replies.length - 1]);

// the bottles
if(D.B.length !== 12) bad.push('expected 12 bottles, found ' + D.B.length);
D.B.forEach(function(b){
  if(b.ko.split(/\s+/).length !== D.words(b).length) bad.push(b.id + ': its words don\'t line up with its question');
  if(b.models.length < 2 || b.models.length > 3) bad.push(b.id + ': needs 2 or 3 model answers');
  if(b.starters.length < 5) bad.push(b.id + ': needs sentence starters');
  if(b.replies[b.replies.length - 1].k) bad.push(b.id + ': the last reply must have no key words');
  b.models.forEach(function(m){ if(D.check(m[0], null).fixes.length) bad.push(b.id + ': a model answer trips the rules: ' + m[0]); });
});
// the signs and notes
if(D.S.length !== 10) bad.push('expected 10 signs, found ' + D.S.length);
if(D.M.length !== 8) bad.push('expected 8 manners notes, found ' + D.M.length);
D.S.forEach(function(s){
  var words = D.lw(s).map(function(w){ return w.ko; });
  if(s.qs.length !== 2) bad.push(s.id + ': needs two questions');
  s.qs.forEach(function(q){
    if(q.opts.length !== 3 || new Set(q.opts).size !== 3) bad.push(s.id + ': "' + q.q + '" needs three different answers');
    if(words.indexOf(q.key) === -1) bad.push(s.id + ': the key word ' + q.key + ' is not on the sign');
  });
  D.lw(s).forEach(function(w){ if(!w.en) bad.push(s.id + ': ' + w.ko + ' has no meaning'); });
});

var ix = JSON.parse(read('voice/index.json'));
function key(t){ return String(t).normalize('NFC').trim().toLowerCase().replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '').replace(/\s+/g, ' '); }
var spoken = 0;
function voiced(t, where){ spoken++; if(!ix.clips['n|' + key(t)]) bad.push(where + ': no voice clip for ' + t); }
D.B.forEach(function(b){
  voiced(b.ko, b.id); D.words(b).forEach(function(w){ voiced(w.ko.replace(/[?!.]/g, ''), b.id); });
  b.models.forEach(function(m){ voiced(m[0], b.id); }); b.replies.forEach(function(r){ voiced(r.ko, b.id); });
});
D.S.forEach(function(s){ D.lw(s).forEach(function(w){ voiced(w.say || w.ko, s.id); }); });
D.M.forEach(function(m){ m.say.forEach(function(p){ voiced(p[0], m.id); }); });

if(bad.length){ console.log(bad.join('\n')); console.log('beach: ' + bad.length + ' problem(s)'); process.exit(1); }
console.log('beach: the writing feedback, 12 bottles, ' + D.S.length + ' signs, ' + D.M.length + ' manners notes and ' + spoken + ' spoken lines all check out');
