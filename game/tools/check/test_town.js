// Harbor Town's conversations (src/js/town-talks.js) hold together: every line's words are glossed one for one,
// every answer leads somewhere that exists (or, for a gentle mistake, has a hint), every turn has a best answer,
// and every conversation can be walked from its start to an end.
var fs = require('fs'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '../../src/js/town-talks.js'), 'utf8');
var TOWN_FOLK = new Function(src + '; return TOWN_FOLK;')();
var bad = [], lines = 0;
function gloss(where, ko, w){
  var toks = ko.split(/\s+/).map(function(t){ return t.replace(/[.,!?~]/g, ''); }).filter(Boolean);
  var parts = String(w || '').split(';').map(function(p){ return p.split('=')[0]; });
  if(toks.join('|') !== parts.join('|')) bad.push(where + ': words ' + toks.join(' ') + ' vs glosses ' + parts.join(' '));
  lines++;
}
if(TOWN_FOLK.length !== 8) bad.push('expected 8 townsfolk, found ' + TOWN_FOLK.length);
TOWN_FOLK.forEach(function(f){
  var N = f.nodes, seen = {}, ends = 0;
  if(!N[f.start]) bad.push(f.id + ': no start node');
  (function walk(id){
    if(seen[id]) return; seen[id] = 1;
    var n = N[id]; if(!n){ bad.push(f.id + ': missing node ' + id); return; }
    gloss(f.id + '.' + id, n.t[0], n.t[2]);
    if(n.end){ ends++; return; }
    if(!n.c || !n.c.length){ bad.push(f.id + '.' + id + ': no answers'); return; }
    if(!n.c.some(function(c){ return c.g === 'best'; })) bad.push(f.id + '.' + id + ': no best answer');
    n.c.forEach(function(c, i){
      gloss(f.id + '.' + id + '.c' + i, c.ko, c.w);
      if(['best', 'ok', 'oops'].indexOf(c.g) < 0) bad.push(f.id + '.' + id + '.c' + i + ': grade ' + c.g);
      if(c.g === 'oops'){ if(!c.hint) bad.push(f.id + '.' + id + '.c' + i + ': a mistake needs a hint'); }
      else walk(c.to);
    });
  })(f.start);
  if(!ends) bad.push(f.id + ': never ends');
  Object.keys(N).forEach(function(k){ if(!seen[k]) bad.push(f.id + ': node ' + k + ' cannot be reached'); });
});
if(bad.length){ console.log(bad.join('\n')); console.log('town: ' + bad.length + ' problems'); process.exit(1); }
console.log('town: 8 conversations, ' + lines + ' lines and answers glossed and connected');
