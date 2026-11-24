  /* ---------- FSRS-6: when to see a word again ----------
     Modern 21-weight FSRS-6 memory model (MIT-licensed pure JS) behind the learner model (learner.js)
     and primary deck scheduler (learning.js). Each item has a stability S (days until recall drops to
     target retention) and a difficulty D (1 easy … 10 hard), plus same-day short-term stability handling.
     Kept to plain functions with no app state, so tools/check/test_fsrs.js can run this file on its own. */
  var FSRS_W = [
    0.212, 1.2931, 2.3065, 8.2956,
    6.4133, 0.8334, 3.0194, 0.001,
    1.8722, 0.1666, 0.796, 1.4835,
    0.0614, 0.2629, 1.6483, 0.6014,
    1.8729, 0.5425, 0.0912, 0.0658,
    0.1542
  ];
  var FSRS_DECAY = -FSRS_W[20];
  var FSRS_FACTOR = Math.pow(0.9, -1 / FSRS_W[20]) - 1;   // ensures fsrsR(S, S) === 0.90
  var FSRS_RETENTION = 0.9;
  function fsrsClampD(d){ return Math.min(10, Math.max(1, d)); }
  function fsrsInitS(g){ return Math.max(0.01, FSRS_W[g - 1]); }
  function fsrsInitD(g){ return fsrsClampD(FSRS_W[4] - Math.exp(FSRS_W[5] * (g - 1)) + 1); }
  // chance of recall t days after the last review
  function fsrsR(t, s){ return Math.pow(1 + FSRS_FACTOR * Math.max(0, t) / Math.max(0.01, s), FSRS_DECAY); }
  // days until recall falls to the target retention (defaults to 0.9, where interval equals S)
  function fsrsInterval(s, retention){
    var ret = retention == null ? FSRS_RETENTION : Math.min(0.99, Math.max(0.7, +retention || FSRS_RETENTION));
    return Math.max(0.01, s) / FSRS_FACTOR * (Math.pow(ret, 1 / FSRS_DECAY) - 1);
  }
  // FSRS-6 difficulty update with linear damping and mean reversion toward fsrsInitD(4)
  function fsrsNextD(d, g){
    var deltaD = -FSRS_W[6] * (g - 3);
    var next = d + deltaD * (10 - d) / 9;
    return fsrsClampD(FSRS_W[7] * fsrsInitD(4) + (1 - FSRS_W[7]) * next);
  }
  function fsrsRecallS(d, s, r, g){
    var hard = g === 2 ? FSRS_W[15] : 1, easy = g === 4 ? FSRS_W[16] : 1;
    return s * (Math.exp(FSRS_W[8]) * (11 - d) * Math.pow(s, -FSRS_W[9]) * (Math.exp(FSRS_W[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  function fsrsForgetS(d, s, r){
    var next = FSRS_W[11] * Math.pow(d, -FSRS_W[12]) * (Math.pow(s + 1, FSRS_W[13]) - 1) * Math.exp(FSRS_W[14] * (1 - r));
    return Math.min(s, next);
  }
  // FSRS-6 same-day short-term stability update (elapsedDays < 1)
  function fsrsShortTermS(s, g){
    var inc = Math.exp(FSRS_W[17] * (g - 3 + FSRS_W[18])) * Math.pow(Math.max(0.01, s), -FSRS_W[19]);
    if(g >= 3) inc = Math.max(1, inc);
    return Math.max(0.01, s * inc);
  }
  // One review. mem is {s, d, last} (or null for a first review); now and last are in ms.
  // opts.retention optionally overrides target retention (e.g. 0.94 / 0.90 / 0.85).
  function fsrsReview(mem, g, now, opts){
    var s, d;
    if(!mem || !mem.s){
      s = fsrsInitS(g); d = fsrsInitD(g);
    } else {
      var elapsedDays = Math.max(0, (now - (mem.last || now)) / 864e5);
      var r = fsrsR(elapsedDays, mem.s);
      d = fsrsNextD(mem.d, g);
      if(elapsedDays < 1){
        s = fsrsShortTermS(mem.s, g);
      } else {
        s = g === 1 ? fsrsForgetS(mem.d, mem.s, r) : fsrsRecallS(mem.d, mem.s, r, g);
      }
    }
    s = Math.max(0.01, s);
    var retention = opts && opts.retention != null ? opts.retention : FSRS_RETENTION;
    var ivl = g === 1 ? 0 : Math.max(1, Math.round(fsrsInterval(s, retention)));
    return { s: s, d: d, ivl: ivl };
  }
