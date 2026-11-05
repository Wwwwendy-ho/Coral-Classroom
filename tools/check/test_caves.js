// Echo Caves (src/js/caves-sounds.js): the pitch measure finds the pitch of a plain tone (200 Hz -> about 200, at the
// sample rates phones record at), stays quiet in silence, follows a rising tone, and finds a falling tone unlike a
// rising one; and the data holds together: every word has a natural-voice clip, every set's words differ, and every
// sound-rule check offers its own word among three different spellings.
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '../..');
var src = fs.readFileSync(path.join(ROOT, 'src/js/caves-sounds.js'), 'utf8');
var C = new Function(src + '; return { P: CAVES_PAIRS, M: CAVES_MERGED, R: CAVES_RULES, pitch: cavesPitch, span: cavesSpan, shape: cavesShape, like: cavesLikeness };')();
var bad = [];
function tone(rate, secs, hz){   // hz: a number, or a function of time
  var n = Math.round(rate * secs), x = new Float32Array(n), ph = 0;
  for(var i = 0; i < n; i++){ var f = typeof hz === 'function' ? hz(i / rate) : hz; ph += 2 * Math.PI * f / rate; x[i] = 0.5 * Math.sin(ph) + 0.15 * Math.sin(2 * ph); }
  return x;
}
function median(a){ a = a.slice().sort(function(p, q){ return p - q; }); return a[Math.floor(a.length / 2)]; }
[44100, 48000, 16000].forEach(function(rate){
  [120, 200, 310].forEach(function(hz){
    var p = C.pitch(tone(rate, 1, hz), rate), on = p.f0.filter(Boolean);
    var m = on.length ? median(on) : 0;
    if(on.length < p.f0.length * 0.8) bad.push(rate + ' Hz audio, ' + hz + ' Hz tone: only ' + on.length + ' of ' + p.f0.length + ' steps voiced');
    if(Math.abs(m - hz) > hz * 0.03) bad.push(rate + ' Hz audio, ' + hz + ' Hz tone: measured ' + m.toFixed(1));
  });
});
var quiet = C.pitch(new Float32Array(44100), 44100);
if(quiet.f0.some(Boolean)) bad.push('silence was given a pitch');
var noise = new Float32Array(44100); for(var i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 0.4;
var nz = C.pitch(noise, 44100); if(nz.f0.filter(Boolean).length > nz.f0.length * 0.1) bad.push('noise was mostly given a pitch');
// silence, a second of tone, silence: the speaking span is about one second
var pad = new Float32Array(44100 * 2.5); pad.set(tone(44100, 1, 200), 44100 * 0.75);
var sp = C.span(C.pitch(pad, 44100)); if(Math.abs(sp.secs - 1) > 0.1) bad.push('span of a one-second tone: ' + sp.secs.toFixed(2) + ' s');
var up = C.pitch(tone(44100, 1, function(t){ return 150 + 100 * t; }), 44100), upOn = up.f0.filter(Boolean);
if(!(upOn[3] < 170 && upOn[upOn.length - 4] > 230)) bad.push('a rising tone did not rise: ' + upOn[3] + ' -> ' + upOn[upOn.length - 4]);
var down = C.pitch(tone(48000, 0.8, function(t){ return 260 - 120 * t; }), 48000);
var lUp = C.like(C.shape(up, 30), C.shape(C.pitch(tone(48000, 1.3, function(t){ return 110 + 60 * t; }), 48000), 30));
var lDown = C.like(C.shape(up, 30), C.shape(down, 30));
if(!(lUp > 0.9)) bad.push('two rising tones (different voices and lengths) should match: ' + lUp);
if(!(lDown < 0)) bad.push('a rising and a falling tone should not match: ' + lDown);

var ix = JSON.parse(fs.readFileSync(path.join(ROOT, 'voice/index.json'), 'utf8'));
function key(t){ return String(t).normalize('NFC').trim().toLowerCase().replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '').replace(/\s+/g, ' '); }
function voiced(w, where){ if(!ix.clips['n|' + key(w)]) bad.push(where + ': no voice clip for ' + w); }
var words = 0;
C.P.forEach(function(c){
  if(!c.tip || !c.label) bad.push(c.id + ': needs a label and a tip');
  c.sets.forEach(function(s, i){
    if(s.length < 2) bad.push(c.id + '.' + i + ': a set needs two words or more');
    if(new Set(s.map(function(w){ return w[0]; })).size !== s.length) bad.push(c.id + '.' + i + ': the same word twice');
    s.forEach(function(w){ words++; voiced(w[0], c.id); if(!w[1]) bad.push(c.id + ': ' + w[0] + ' has no meaning'); });
  });
});
C.M.words.forEach(function(w){ voiced(w[0], 'merged'); });
C.R.forEach(function(r){
  [r.word, r.check.word].concat(r.more.map(function(m){ return m[0]; })).forEach(function(w){ voiced(w, r.id); });
  if(r.check.opts.indexOf(r.check.word) < 0) bad.push(r.id + ': the check does not offer its word');
  if(new Set(r.check.opts).size !== r.check.opts.length || r.check.opts.length !== 3) bad.push(r.id + ': the check needs three different spellings');
  if(!r.said || !r.rule || !r.mean) bad.push(r.id + ': needs how it\'s said, the rule and the meaning');
});
if(C.R.length < 5 || C.R.length > 8) bad.push('expected 5 to 8 sound rules, found ' + C.R.length);
if(bad.length){ console.log(bad.join('\n')); console.log('caves: ' + bad.length + ' problems'); process.exit(1); }
console.log('caves: pitch within 3% on 9 tones, ' + C.P.length + ' sound contrasts (' + words + ' words) and ' + C.R.length + ' sound rules, all voiced');
