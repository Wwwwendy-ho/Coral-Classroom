  /* ============ generic tap sound (delegated, covers every button not already voiced) ============ */
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if(!btn) return;
    if(btn.hasAttribute('data-outcome') || btn.hasAttribute('data-rating') || btn.hasAttribute('data-choice-idx') || btn.hasAttribute('data-gate-digit')) return;   // these play their own sound
    Sound.tap();
  }, true);

  /* ============ keyboard feed navigation ============ */
  // Down/Page Down = next card and Up/Page Up = previous card, in whichever swipe feed is on screen.
  // This is the same one-card move the wheel makes. Wired once globally,
  // and it acts on whatever wireVerticalSwipeFeed() registered most recently. It stays quiet while a
  // PIN prompt or the sound shop is open, or while typing in a field.
  document.addEventListener('keydown', function(e){
    if(S.pinPromptFor || S.soundPickerOpen || !activeFeedSwipe) return;
    if(!document.body.contains(activeFeedSwipe.stage)) return;
    var t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if(e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key === 'ArrowDown' || e.key === 'PageDown'){ e.preventDefault(); activeFeedSwipe.go(1); }
    else if(e.key === 'ArrowUp' || e.key === 'PageUp'){ e.preventDefault(); activeFeedSwipe.go(-1); }
  });

  /* ============ boot ============ */
  // Shared grown-up password digest. The entered password is never saved.
  var BAKED_PIN_HASH = 'cbe8a370d6693561c0f7a61e69452f8bc88ecfcdc3bf25a812035dedaf7fd433';
  // A short-lived cache in front of the store: each deck's cards are read on every redraw of the board and the
  // deck list, so getCardsOnce answers from memory for 45 seconds. Any change to profiles, decks or cards clears it.
  function coveWrapStore(st){
    if(!st || st.__coveperf || typeof st.getCardsOnce !== 'function') return;
    st.__coveperf = 1;
    var cache = {}, gen = 0, TTL = 45000, orig = st.getCardsOnce.bind(st);
    function cp(c){ return Object.assign({}, c); }
    function bump(){ gen++; cache = {}; }
    ['setActiveProfile','addProfile','deleteProfile','addDeck','deleteDeck','addCard','updateCard','deleteCard'].forEach(function(n){
      var f = st[n]; if(typeof f !== 'function') return;
      st[n] = function(){
        bump();
        var r = f.apply(st, arguments);
        if(r && typeof r.then === 'function') r.then(bump, bump);
        return r;
      };
    });
    st.getCardsOnce = function(deckId){
      var e = cache[deckId];
      if(e && Date.now() - e.t < TTL) return Promise.resolve(e.c.map(cp));
      var g = gen;
      return orig(deckId).then(function(cards){
        if(g === gen && cards) cache[deckId] = { t: Date.now(), c: cards.map(cp) };
        return cards;
      });
    };
  }
