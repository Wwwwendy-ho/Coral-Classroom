  /* These stops reuse reviewed Korean from the regional lessons. Learners produce or explain an
     answer before comparing with the source. The rehearsal itself is independent of course progress. */
  var REGION_PRACTICE = {
    lagoon: [
      { id:'hotel-role', name:'Hotel role rehearsal', icon:'bed', detail:'Check in and ask about breakfast in Korean.', story:'hotel', lines:[0,4] },
      { id:'subway-role', name:'Subway role rehearsal', icon:'train', detail:'Say where you are going and ask where to buy a ticket.', story:'subway', lines:[0,4] },
      { id:'taxi-role', name:'Taxi role rehearsal', icon:'car', detail:'Give a destination, ask how long it takes and ask to stop.', story:'taxi', lines:[1,3,5] }
    ],
    town: [
      { id:'order-repair', name:'Repair a cafe order', icon:'cup', detail:'Turn a description into a request a cafe owner can act on.', talk:'cafe', node:'a', model:0 },
      { id:'register-repair', name:'Repair a restaurant request', icon:'bowl', detail:'Make a request to a server using polite speech.', talk:'restaurant', node:'menu', model:1 }
    ],
    caves: [
      { id:'linking', name:'Hear linking', icon:'sound', detail:'Hear how a final consonant moves before a vowel.', rule:'link' }
    ],
    patterns: [
      { id:'place-recall', name:'Repair the place marker', icon:'sentence', detail:'Replace the word carrying the wrong place particle.', pattern:'place', repair:true },
      { id:'request-recall', name:'Change a request ending', icon:'sentence', detail:'Keep the sentence and change the phrase that makes it a request.', pattern:'request' },
      { id:'count-recall', name:'Change a quantity', icon:'counting', detail:'Change only the number before a Korean counter.', pattern:'count' }
    ],
    beach: [
      { id:'day-draft', name:'Trim a note about today', icon:'bottle', detail:'Keep where you went and cut the extra activity.', bottle:'today', model:0, keep:0 },
      { id:'plans-draft', name:'Trim a note about tomorrow', icon:'bottle', detail:'Keep who you plan to meet and cut the extra plan.', bottle:'tomorrow', model:1, keep:0 },
      { id:'study-draft', name:'Trim a note about studying', icon:'bottle', detail:'Keep what you can do in Korean and cut the study schedule.', bottle:'study', model:1, keep:1 }
    ],
    light: [
      { id:'subway-explain', name:'Find the subway exit', icon:'train', detail:'Use a station sign to explain which way to go.', sign:'subway' },
      { id:'receipt-explain', name:'Explain a receipt', icon:'bag', detail:'Point out the total and how it was paid.', sign:'store' },
      { id:'hours-explain', name:'Check pharmacy hours', icon:'plus', detail:'Read the opening hours and find a word for medicine.', sign:'pharmacy' },
      { id:'room-explain', name:'Read the hotel key card', icon:'bed', detail:'Find breakfast and check-out information on the card.', sign:'hotel' }
    ],
    captain: [
      { id:'arrival-role', name:'Arrival day rehearsal', icon:'compass', detail:'Practice what to say at immigration, in a taxi and at check-in.', arrival:true }
    ]
  };

  function regionPracticeChange(from, to){
    var oldWords = from.replace(/[.?!]+$/, '').split(/\s+/);
    var newWords = to.replace(/[.?!]+$/, '').split(/\s+/);
    var start = 0, oldEnd = oldWords.length, newEnd = newWords.length;
    while(start < Math.min(oldEnd, newEnd) && oldWords[start] === newWords[start]) start++;
    while(oldEnd > start && newEnd > start && oldWords[oldEnd - 1] === newWords[newEnd - 1]){ oldEnd--; newEnd--; }
    return newWords.slice(start, newEnd).join(' ');
  }
  function regionPracticeTasks(activity){
    function storyTasks(id, lines){
      var story = lagoonStory(id);
      return lines.map(function(i){
        var line = story.lines[i];
        return { prompt:line[2], context:activity.arrival ? story.en : '', answers:[[line[1], line[2]]] };
      });
    }
    if(activity.story) return storyTasks(activity.story, activity.lines);
    if(activity.arrival) return storyTasks('arrive', [5]).concat(storyTasks('taxi', [1]), storyTasks('hotel', [0]));
    if(activity.talk){
      var node = townFolk(activity.talk).nodes[activity.node], example = node.c[activity.model];
      var mistake = node.c.find(function(c){ return c.g === 'oops'; });
      return [{ prompt:example.en, setup:node.t, source:[mistake.ko, mistake.en], answers:[[example.ko, example.en]], reason:mistake.hint }];
    }
    if(activity.pattern) return patById(activity.pattern).items.filter(function(it){ return it.k === (activity.repair ? 'fix' : 'change'); }).map(function(it){
      var from = it.from || it.bad;
      return { prompt:it.ask || it.en, source:[from, it.fromEn || ''], answers:[[regionPracticeChange(from, it.ko), 'Replacement']],
        full:[it.ko, it.en], reason:it.why };
    });
    if(activity.bottle){
      var bottle = bbById(activity.bottle), draft = bottle.models[activity.model];
      var shorter = draft.map(function(text){ return text.match(/[^.!?]+[.!?]+/g)[activity.keep].trim(); });
      return [{ prompt:activity.detail, setup:[bottle.ko,bottle.en], source:draft, answers:[shorter] }];
    }
    return lhSign(activity.sign).qs.map(function(q){
      return { prompt:q.q + ' Which part of the sign tells you?', answers:[[q.opts[0]]], reason:q.why };
    });
  }

  function regionPracticeRender(region, practice){
    var activity = practice.activity, sign = activity.sign && lhSign(activity.sign);
    var compare = sign ? 'Check the sign' : 'Compare with the model';
    var instruction = sign ? 'Read the sign. Answer in your own words and say which Korean text helped you.' :
      activity.bottle ? 'Read Jisu’s question and the draft. Edit the draft into one sentence that still answers her.' :
      activity.talk ? 'Read the learner’s line and try saying what they meant in polite Korean.' :
      activity.pattern ? 'Keep the rest of the sentence. Say or write only the replacement word or phrase in Korean.' :
      'Take the traveler’s role. Say or write each line in Korean from memory.';
    function phrase(ko, en, showAudio){
      return '<li>' + (showAudio === false ? '' : '<button type="button" class="lg-mini" data-rp-hear="' + esc(ko) + '" aria-label="Hear ' + esc(ko) + '">' + ccIcon('sound') + '</button>') +
        '<span><b lang="ko">' + esc(ko) + '</b>' + (en ? '<small>' + esc(en) + '</small>' : '') + '</span></li>';
    }
    var tasks = regionPracticeTasks(activity).map(function(task, i){
      var example = task.answers.map(function(a){
        if(a.length > 1) return phrase(a[0], a[1]);
        return '<li><b' + (/[가-힣]/.test(a[0]) ? ' lang="ko"' : '') + '>' + esc(a[0]) + '</b></li>';
      }).join('');
      var shown = !!practice.revealed[i];
      return '<section class="tw-sec bb-write">' + (task.context ? '<p>' + esc(task.context) + '</p>' : '') +
        '<h3><label for="rp-answer-' + i + '">' + esc(task.prompt) + '</label></h3>' +
        (task.source ? '<ul class="pr-ex">' + (task.setup ? phrase(task.setup[0], task.setup[1]) : '') + phrase(task.source[0], task.source[1], !activity.talk && !activity.repair) + '</ul>' : '') +
        '<textarea id="rp-answer-' + i + '" data-rp-answer="' + i + '" rows="2" lang="' + (sign ? 'en' : 'ko') + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">' + esc(practice.drafts[i] || '') + '</textarea>' +
        '<button type="button" class="btn btn-ghost" data-rp-compare="' + i + '" aria-controls="rp-model-' + i + '" aria-expanded="' + shown + '">' +
        (shown ? 'Hide the model' : (practice.drafts[i] || '').trim() ? compare : 'I tried aloud') + '</button>' +
        '<div id="rp-model-' + i + '"' + (shown ? '' : ' hidden') + '><ul class="pr-ex">' + example + (task.full ? phrase(task.full[0], task.full[1]) : '') + '</ul>' +
        (task.reason ? '<p class="pr-why">' + esc(task.reason) + '</p>' : '') + '</div></section>';
    }).join('');
    app.innerHTML = '<div class="nav-row"><button type="button" class="back-btn" data-rp-back>' + ccIcon('map') + ' Board</button>' +
      '<span class="nav-title">' + ccIcon(REGION_BOARD_META[region].icon) + ' ' + esc(REGION_BOARD_META[region].name) + '</span></div>' +
      '<div class="lg-page"><div class="lg-intro"><h2 id="rp-title" tabindex="-1">' + esc(activity.name) + '</h2><p>' + esc(instruction) + '</p></div>' +
      (sign ? lhSignHTML(sign, {}) : '') + tasks + '</div>';
    if(!practice.entered){ practice.entered = true; app.querySelector('#rp-title').focus({ preventScroll:true }); }
    app.querySelector('[data-rp-back]').onclick = function(){ try { Speech.stop(); } catch(e){} regionBoardReturn(region); };
    app.querySelectorAll('[data-rp-compare]').forEach(function(button){
      var i = button.dataset.rpCompare, input = app.querySelector('#rp-answer-' + i), model = app.querySelector('#rp-model-' + i);
      function update(){
        var show = !!practice.revealed[i];
        model.hidden = !show;
        button.setAttribute('aria-expanded', String(show));
        button.textContent = show ? 'Hide the model' : input.value.trim() ? compare : 'I tried aloud';
      }
      input.oninput = function(){ practice.drafts[i] = input.value; update(); };
      button.onclick = function(){ practice.revealed[i] = !practice.revealed[i]; update(); };
    });
    app.querySelectorAll('[data-rp-hear]').forEach(function(button){
      button.onclick = function(){ try { Speech.speak(button.dataset.rpHear); } catch(e){} };
    });
    app.querySelectorAll('[data-lh-w]').forEach(function(button){
      button.onclick = function(){
        var word = lhWordAt(sign, button.dataset.lhW.split(':').map(Number));
        if(word) try { Speech.speak(lhSay(word)); } catch(e){}
      };
    });
    return true;
  }
