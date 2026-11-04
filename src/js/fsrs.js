  /* ---------- FSRS-4.5: when to see a word again ----------
     The memory model behind the learner model (learner.js). Each thing a learner knows has a stability S (how many
     days until the chance of remembering it falls to 90%) and a difficulty D (1 easy … 10 hard). A review with a
     grade (1 again, 2 hard, 3 good, 4 easy) updates both, and the next review is set for when recall is expected
     to have dropped to the target. These are the published FSRS-4.5 formulas with its default weights.
     Kept to plain functions with no app state, so tools/check/test_fsrs.js can run this file on its own. */
  var FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  var FSRS_DECAY = -0.5;
  var FSRS_FACTOR = 19 / 81;      // chosen so that recall is exactly 90% after S days
  var FSRS_RETENTION = 0.9;
  function fsrsClampD(d){ return Math.min(10, Math.max(1, d)); }
  function fsrsInitS(g){ return FSRS_W[g - 1]; }
  function fsrsInitD(g){ return fsrsClampD(FSRS_W[4] - (g - 3) * FSRS_W[5]); }
  // chance of recall t days after the last review
  function fsrsR(t, s){ return Math.pow(1 + FSRS_FACTOR * Math.max(0, t) / s, FSRS_DECAY); }
  // days until recall falls to the target (with a 0.9 target this equals S)
  function fsrsInterval(s){ return s / FSRS_FACTOR * (Math.pow(FSRS_RETENTION, 1 / FSRS_DECAY) - 1); }
  // Difficulty moves with the grade, then is pulled a little back toward a new card's "good" difficulty, so
  // one bad day can't pin a word at 10 forever.
  function fsrsNextD(d, g){
    var moved = d - FSRS_W[6] * (g - 3);
    return fsrsClampD(FSRS_W[7] * fsrsInitD(3) + (1 - FSRS_W[7]) * moved);
  }
  function fsrsRecallS(d, s, r, g){
    var hard = g === 2 ? FSRS_W[15] : 1, easy = g === 4 ? FSRS_W[16] : 1;
    return s * (Math.exp(FSRS_W[8]) * (11 - d) * Math.pow(s, -FSRS_W[9]) * (Math.exp(FSRS_W[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  // A forgotten word restarts from a lower stability. It never comes out higher than before the lapse (the
  // formula can, for a very new word), since forgetting can't make a memory stronger.
  function fsrsForgetS(d, s, r){
    var next = FSRS_W[11] * Math.pow(d, -FSRS_W[12]) * (Math.pow(s + 1, FSRS_W[13]) - 1) * Math.exp(FSRS_W[14] * (1 - r));
    return Math.min(s, next);
  }
  // One review. mem is {s, d, last} (or null for a first review); now and last are in ms. Returns the new
  // {s, d, ivl} with ivl in days: at least one day after a pass, and 0 after "again" (see again soon).
  function fsrsReview(mem, g, now){
    var s, d;
    if(!mem || !mem.s){
      s = fsrsInitS(g); d = fsrsInitD(g);
    } else {
      var r = fsrsR((now - (mem.last || now)) / 864e5, mem.s);
      d = fsrsNextD(mem.d, g);
      // the stability update uses the difficulty from before this review, as FSRS does
      s = g === 1 ? fsrsForgetS(mem.d, mem.s, r) : fsrsRecallS(mem.d, mem.s, r, g);
    }
    s = Math.max(0.01, s);
    var ivl = g === 1 ? 0 : Math.max(1, Math.round(fsrsInterval(s)));
    return { s: s, d: d, ivl: ivl };
  }
