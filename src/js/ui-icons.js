  /* ---------- One look for every screen: drawn icons, never emoji, in the app's own chrome ----------
     Titles, buttons, labels, badges and chips across the app (and the Library) were written over years with
     emoji in them. Rather than each screen remembering, this swaps a known emoji at the start or end of a
     piece of UI text (or filling a small icon slot) for the matching drawn icon, as screens appear. Learning
     content is left alone: card faces, stories, answers, the 3D board's labels and a deck's own emoji (the
     one its owner picked, on the board) keep exactly what was typed. An emoji with no drawn match stays as it is. */
  var UI_EMOJI = {
    '🔒':'lock', '🔐':'lock', '🌊':'waves', '⚠':'alert', '🧒':'profiles', '👥':'profiles', '👤':'profiles', '🔧':'settings', '⚙':'settings',
    '🗂':'cards', '🃏':'cards', '➕':'plus', '➖':'minus', '✖':'times', '➗':'divide', '📷':'photo', '🖼':'photo', '🎉':'party', '🎬':'film', '🎞':'film',
    '📜':'story', '📖':'story', '🧮':'maths', '🌐':'globe', '🔤':'letters', '🔠':'letters', '🐚':'shell', '✏':'edit', '✍':'edit', '📤':'archive', '📦':'archive',
    '📥':'download', '💾':'download', '✨':'sparkle', '🪄':'sparkle', '✅':'check', '📒':'worksheet', '📝':'worksheet', '⭐':'star', '🌟':'star', '👏':'star', '💪':'star',
    '🔥':'flame', '💡':'bulb', '🫧':'bubbles', '🦀':'crab', '🐠':'fish', '🐟':'fish', '🐬':'fish', '🐳':'whale', '🐢':'turtle', '🎧':'headphones',
    '📊':'progress', '📈':'trend', '🕒':'clock', '⏱':'clock', '🗓':'calendar', '📅':'calendar', '🏅':'trophy', '🏛':'trophy', '🏆':'trophy', '🏁':'flag',
    '🧩':'puzzle', '🗣':'talk', '💬':'talk', '💭':'talk', '🎙':'mic', '🎤':'mic', '🔇':'sound-off', '🔊':'sound', '🔈':'sound', '🌓':'moon', '🌙':'moon', '☀':'sun',
    '🎚':'sliders', '🔄':'flip', '🔁':'replay', '🔘':'choice', '🧲':'pairs', '👂':'ear', '🔢':'counting', '🚫':'close', '📚':'library', '🔍':'search', '🔎':'search',
    '🖨':'printer', '📂':'folder', '💛':'heart', '🎯':'target', '🧭':'compass', '🌱':'seedling', '🏫':'school', '🏝':'island', '⚓':'anchor', '🎲':'dice',
    '🔀':'shuffle', '🤔':'ask', '❓':'ask', '😌':'bed', '📴':'cloud-off', '🗺':'map', '🎮':'games', '🏷':'cards', '🎓':'school', '🔬':'flask', '🧪':'flask'
  };
  // where UI text lives (anything else is left alone), and where learning content lives (always left alone)
  var UI_SEL = 'button, [role="button"], h1, h2, h3, h4, label, .nav-title, .read-label, .deck-badge, .label, .ic, .icon, .emoji, .hof-title, .clib-source, ' +
    '.clib-tile-e, .clib-next-e, .co-cr-e, .clib-more-e, .clib-huge, .r3-panel-e, .profile-mode-badge, .plan-home-text b, .mic-ask-title, .ms-words, .peek-badge, ' +
    '.r3-hud span, .sound-panel-title, .algo-name, .mode-opt, .subject-chip, .subject-tab, .clib-note, .clib-msg, .clib-pill, .clib-label, p.algo-note, .stats-section h3';
  var UI_SKIP = '.card-text, .face, .feed-card, .feed-word, .choice-row, .drag-tile, .build-tile, .blend-word, .passage-word, .hz-word, .eq-answer, .ns-piece, ' +
    '.ms-page, .ms-text, .r3-labels, .deck-emoji, .r3-emoji, .vocab-pic, .r3-match, .r3-odd, .r3-bubs, .r3-tile, .r3-kopts, .r3-kwords, .r3-kpiece, .r3-kline, ' +
    '.co-opts, .clib-opts, .clib-chat-log, .ask-answer, .clib-say, textarea, [contenteditable], [data-keep-emoji]';
  var UI_EMOJI_RE = new RegExp('(' + Object.keys(UI_EMOJI).map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\uFE0F?', 'g');
  function uiIconText(node){
    var t = node.nodeValue; if(!t || !UI_EMOJI_RE.test(t)) return; UI_EMOJI_RE.lastIndex = 0;
    var trimmed = t.trim(), parts = [], last = 0, m, changed = false;
    while((m = UI_EMOJI_RE.exec(t))){
      var before = t.slice(0, m.index), after = t.slice(m.index + m[0].length);
      // an icon is the emoji that starts or ends a piece of text, or stands alone (a run of them, like ⭐ ⭐, counts too)
      var lead = /^[\s⭐️☀-➿\uD83C-􏰀-\uDFFF]*$/.test(before), trail = /^[\s!.️]*$/.test(after);
      if(!(lead || trail || trimmed === m[0])) continue;
      parts.push(document.createTextNode(t.slice(last, m.index)));
      var s = document.createElement('span'); s.className = 'cc-ui-ic'; s.innerHTML = ccIcon(UI_EMOJI[m[1]]); parts.push(s);
      last = m.index + m[0].length; changed = true;
    }
    if(!changed) return;
    parts.push(document.createTextNode(t.slice(last)));
    var par = node.parentNode; parts.forEach(function(p){ par.insertBefore(p, node); }); par.removeChild(node);
  }
  function uiIconsIn(root){
    if(!root || root.nodeType !== 1 || root.closest(UI_SKIP)) return;
    var els = root.matches(UI_SEL) ? [root] : [];
    root.querySelectorAll(UI_SEL).forEach(function(e){ els.push(e); });
    els.forEach(function(el){
      if(el.closest(UI_SKIP)) return;
      // its own text, and text in plain inline wrappers inside it (a button's <span>emoji</span> Label)
      var texts = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
      while((n = w.nextNode())){ var par = n.parentNode; if(par === el || (par.parentNode === el && !par.className && /^(SPAN|B|I|STRONG|EM)$/.test(par.tagName))) texts.push(n); }
      texts.forEach(uiIconText);
    });
    root.querySelectorAll('input[placeholder]').forEach(function(i){ var p = i.getAttribute('placeholder'), q = p.replace(UI_EMOJI_RE, '').trim(); if(q !== p) i.setAttribute('placeholder', q); });
  }
  (function uiIconsWatch(){
    var pend = [], queued = false;
    function flush(){ queued = false; var l = pend; pend = []; l.forEach(function(el){ if(el.isConnected) uiIconsIn(el); }); }
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        var t = m.target.nodeType === 3 ? m.target.parentNode : m.target; if(!t || t.closest && t.closest('.r3-labels, canvas')) return;
        if(m.type === 'characterData') pend.push(t); else m.addedNodes.forEach(function(n){ pend.push(n.nodeType === 1 ? n : t); });
      });
      if(pend.length && !queued){ queued = true; Promise.resolve().then(flush); }   // before the next paint, so no emoji ever flashes
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    if(document.body) uiIconsIn(document.body);
  })();
