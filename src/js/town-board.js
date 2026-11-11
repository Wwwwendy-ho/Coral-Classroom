  /* Harbor Town pilot board. Kept in a closure so its scene and game state do not add to the shared app scope.
     The three functions at the end are the only integration points for town.js. */
  var TownBoard = (function(){
    var N = 36, current = null, rollToken = 0;
    var kinds = [
      'talk','blue','blue','question','red','talk','blue','shop','blue','chance','talk','red',
      'blue','minigame','talk','blue','question','star','talk','blue','red','chance','talk','blue',
      'shop','blue','talk','question','red','minigame','talk','blue','chance','blue','talk','star'
    ];
    // The talk IDs are taken from TOWN_FOLK by index below, so additions to that data remain usable.
    var talkAt = { 0:0, 5:1, 10:2, 14:3, 18:4, 22:5, 26:6, 30:7, 34:0 };
    var names = { blue:'Blue space', red:'Red space', question:'Mystery space', chance:'Chance Time',
      shop:'Bok’s shop', minigame:'Lantern game', star:'Star space', talk:'Town conversation' };
    var colors = { blue:'#4e9ddd', red:'#ec7373', question:'#a77ad4', chance:'#ec9dca',
      shop:'#e9b85c', minigame:'#58bdad', star:'#f5d371', talk:'#68afae' };
    var pos = [];
    for(var i = 0; i < N; i++){
      var t = i * Math.PI * 2 / N;
      pos.push({ x: 4.2 * Math.sin(2 * t) + (i === 0 ? .48 : i === 18 ? -.48 : 0),
        z: 6.75 * Math.sin(t) + (i === 0 ? -.48 : i === 18 ? .48 : 0) });
    }
    var edges = [];
    for(i = 0; i < N; i++) edges.push([i, (i + 1) % N]);
    edges.push([8, 13], [26, 31]);

    function key(){ return 'cc-town-board-' + (S.profile && S.profile.id || 'guest'); }
    function read(){
      var v = null;
      try { v = JSON.parse(localStorage.getItem(key()) || 'null'); } catch(e){}
      v = v && typeof v === 'object' ? v : {};
      return { position: Number.isInteger(v.position) && v.position >= 0 && v.position < N ? v.position : 0,
        shells: Number.isInteger(v.shells) && v.shells >= 0 ? Math.min(v.shells, 999) : 8,
        stars: Number.isInteger(v.stars) && v.stars >= 0 ? Math.min(v.stars, 999) : 0,
        turns: Number.isInteger(v.turns) && v.turns >= 0 ? v.turns : 0,
        pass: !!v.pass, double: !!v.double, night: typeof v.night === 'boolean' ? v.night : reefNight() };
    }
    function save(){
      if(!current) return;
      var a = current.state;
      try { localStorage.setItem(key(), JSON.stringify({ position:a.position, shells:a.shells, stars:a.stars,
        turns:a.turns, pass:a.pass, double:a.double, night:a.night })); } catch(e){}
    }
    function icon(kind){
      return ccIcon({blue:'sparkle',red:'heart',question:'bulb',chance:'sparkle',shop:'bag',
        minigame:'games',star:'star',talk:'talk'}[kind] || 'map');
    }
    function folkAt(n){ return TOWN_FOLK[talkAt[n] || 0] || TOWN_FOLK[0]; }
    function tileDescription(n){
      var kind = kinds[n];
      return kind === 'talk' ? folkAt(n).en + ' · ' + folkAt(n).place : names[kind];
    }
    function html(){
      var a = read();
      var roads = edges.map(function(e){ var p=pos[e[0]], q=pos[e[1]];
        return '<path d="M' + (180+p.x*16).toFixed(1) + ' ' + (180+p.z*16).toFixed(1) + 'L' + (180+q.x*16).toFixed(1) + ' ' + (180+q.z*16).toFixed(1) + '"/>';
      }).join('');
      var mapTiles = pos.map(function(p,n){ return '<circle cx="' + (180+p.x*16).toFixed(1) + '" cy="' +
        (180+p.z*16).toFixed(1) + '" r="6" fill="' + colors[kinds[n]] + '"/>'; }).join('');
      var fallback = '<svg viewBox="0 0 360 360" role="img" aria-label="Figure eight town map with 36 colored spaces">' +
        '<ellipse cx="180" cy="180" rx="100" ry="149" fill="' + (a.night ? '#536f6e' : '#e5d5ab') + '"/>' +
        '<g fill="none" stroke="' + (a.night ? '#ad987e' : '#fdf2cc') + '" stroke-width="9" stroke-linecap="round">' + roads + '</g>' +
        '<g stroke="#fff8e7" stroke-width="2">' + mapTiles + '</g></svg>';
      var guide = kinds.map(function(kind, n){
        return '<button type="button" class="tb-guide-space" data-tb-preview="' + n + '"><span class="tb-dot tb-' + kind + '"></span><b>' +
          (n + 1) + '</b><span>' + esc(tileDescription(n)) + '</span></button>';
      }).join('');
      return '<section class="tb-root' + (a.night ? ' tb-night' : '') + '" aria-label="Harbor Town board">' +
        '<div class="tb-top"><div><span class="tb-kicker">STREETS BY THE SEA</span><h2>Take a walk through town</h2></div>' +
          '<button type="button" class="tb-theme" data-tb-night aria-label="Switch to ' + (a.night ? 'day' : 'night') + ' view">' + ccIcon(a.night ? 'sun' : 'moon') + '</button></div>' +
        '<div class="tb-stage"><div class="tb-canvas" aria-hidden="true">' + fallback + '</div><div class="tb-stage-label">Two streets, two shortcuts, a town full of conversations</div></div>' +
        '<div class="tb-legend" aria-label="Board space colors"><span><i class="tb-blue"></i>+3 shells</span><span><i class="tb-red"></i>−2 shells</span>' +
          '<span><i class="tb-question"></i>surprise</span><span><i class="tb-talk"></i>conversation</span><span><i class="tb-star"></i>star</span></div>' +
        '<div class="tb-dashboard"><div class="tb-score"><span>' + ccIcon('shell') + ' Shells <b data-tb-shells>' + a.shells + '</b></span>' +
          '<span>' + ccIcon('star') + ' Stars <b data-tb-stars>' + a.stars + '</b></span>' +
          '<span>Walks <b data-tb-turns>' + a.turns + '</b></span></div>' +
          '<div class="tb-actions"><button type="button" class="tb-roll" data-tb-roll>' + ccIcon('dice') + ' Roll the die</button>' +
          '<button type="button" class="tb-visit" data-tb-visit>Talk here</button></div></div>' +
        '<div class="tb-place" data-tb-place role="status"></div>' +
        '<div class="tb-event" data-tb-event aria-live="polite" hidden></div>' +
        '<nav class="tb-sail" aria-label="Nearby places"><button type="button" data-tb-go="lagoon">' + ccIcon('bottle') + ' Story Lagoon</button>' +
          '<button type="button" data-tb-go="captain">' + ccIcon('anchor') + ' Captain’s Deck</button>' +
          '<button type="button" data-tb-go="caves">' + ccIcon('sound') + ' Echo Caves</button></nav>' +
        '<details class="tb-guide"><summary>Street guide · all 36 spaces</summary><div class="tb-guide-grid">' + guide + '</div></details>' +
      '</section>';
    }
    function sound(note){ try { Sound.bloop(note); } catch(e){} }
    function status(message){
      if(!current) return;
      var c = current, a = c.state, root = c.root, n = a.position;
      root.querySelector('[data-tb-shells]').textContent = a.shells;
      root.querySelector('[data-tb-stars]').textContent = a.stars;
      root.querySelector('[data-tb-turns]').textContent = a.turns;
      root.querySelector('[data-tb-place]').innerHTML = '<span class="tb-place-mark tb-' + kinds[n] + '">' + icon(kinds[n]) + '</span>' +
        '<span><b>Space ' + (n + 1) + ' · ' + esc(tileDescription(n)) + '</b><small>' + esc(message || 'Roll to explore, or choose a conversation here.') + '</small></span>';
      root.querySelector('[data-tb-visit]').hidden = kinds[n] !== 'talk';
      root.querySelector('[data-tb-roll]').disabled = !!c.busy;
      root.querySelector('[data-tb-roll]').innerHTML = c.busy ? 'Walking…' : ccIcon('dice') + ' Roll the die';
      root.querySelector('[data-tb-night]').disabled = !!c.busy;
      if(c.tokenMesh){ c.tokenMesh.position.set(pos[n].x, .72, pos[n].z); render3d(c); }
      root.querySelectorAll('[data-tb-preview]').forEach(function(b){ b.classList.toggle('is-here', +b.dataset.tbPreview === n); });
    }
    function event(title, body, options){
      if(!current) return;
      var el = current.root.querySelector('[data-tb-event]');
      el.hidden = false;
      el.innerHTML = '<div class="tb-event-heading"><b>' + esc(title) + '</b><button type="button" data-tb-close aria-label="Close">' + ccIcon('close') + '</button></div>' +
        '<p>' + esc(body) + '</p><div class="tb-event-buttons">' + (options || []).map(function(o,j){
          return '<button type="button" data-tb-choice="' + j + '"' + (o.disabled ? ' disabled' : '') + '>' + esc(o.label) + '</button>';
        }).join('') + '</div>';
      current.options = options || [];
      el.scrollIntoView({ block:'nearest', behavior: reefCalm() ? 'auto' : 'smooth' });
    }
    function closeEvent(){
      if(!current) return;
      current.root.querySelector('[data-tb-event]').hidden = true;
      current.options = [];
    }
    function effect(kind){
      if(!current) return;
      var a = current.state, n = a.position, who, reward;
      if(kind === 'talk'){
        who = folkAt(n);
        event('A conversation awaits', who.en + ' is here. Practice a real exchange and add useful phrases to My words.',
          [{label:'Talk with ' + who.en, action:function(){ openTalk(who.id); }}, {label:'Keep walking', action:closeEvent}]);
      } else if(kind === 'blue'){
        a.shells += 3; save(); status('You found 3 shells.'); event('Blue space', 'You found 3 shells for the town shop.', [{label:'Continue',action:closeEvent}]); sound(650);
      } else if(kind === 'red'){
        if(a.pass){ a.pass = false; status('Your Lucky Pass protected your shells.'); event('Lucky Pass!', 'Your pass protected you from this red space.', [{label:'Continue',action:closeEvent}]); }
        else { a.shells = Math.max(0, a.shells - 2); status('You lost 2 shells.'); event('Red space', 'A gust carried away 2 shells.', [{label:'Continue',action:closeEvent}]); }
        save(); sound(320);
      } else if(kind === 'question'){
        reward = (a.turns + n) % 3;
        if(reward === 0){ a.shells += 5; status('A mystery crate held 5 shells.'); event('Mystery crate', 'Five shells were tucked inside.', [{label:'Continue',action:closeEvent}]); }
        else if(reward === 1){ a.pass = true; status('You found a Lucky Pass for a red space.'); event('Mystery crate', 'A Lucky Pass will protect you from your next red space.', [{label:'Continue',action:closeEvent}]); }
        else { a.double = true; status('Your next die roll will double.'); event('Mystery crate', 'Your next die roll will double.', [{label:'Continue',action:closeEvent}]); }
        save(); sound(720);
      } else if(kind === 'chance'){
        var cards = [
          {label:'Shell shower', body:'You gained 6 shells.', apply:function(){ a.shells += 6; }},
          {label:'Windfall', body:'You lost 3 shells.', apply:function(){ a.shells = Math.max(0, a.shells - 3); }},
          {label:'Second wind', body:'Your next die roll will double.', apply:function(){ a.double = true; }}
        ];
        var card = cards[Math.floor(Math.random() * cards.length)]; card.apply(); save(); status(card.body);
        event('Chance Time · ' + card.label, card.body, [{label:'Continue',action:closeEvent}]); sound(800);
      } else if(kind === 'shop'){
        event('Bok’s shop', 'Spend shells on something useful for the next walk.', [
          {label:'Lucky Pass · 5 shells',disabled:a.shells < 5,action:function(){ a.shells -= 5; a.pass = true; save(); status('Lucky Pass ready.'); event('Lucky Pass ready', 'Your next red space will cost no shells.', [{label:'Continue',action:closeEvent}]); }},
          {label:'Double die · 7 shells',disabled:a.shells < 7,action:function(){ a.shells -= 7; a.double = true; save(); status('Your next die roll will double.'); event('Double die ready', 'Your next die roll will double.', [{label:'Continue',action:closeEvent}]); }},
          {label:'Leave shop',action:closeEvent}
        ]);
      } else if(kind === 'minigame'){
        lanternQuiz(0);
      } else if(kind === 'star'){
        event('Star space', 'Trade 12 shells for a star. Stars mark your town adventures.', [
          {label:'Take a star · 12 shells',disabled:a.shells < 12,action:function(){ a.shells -= 12; a.stars++; save(); status('You earned a star!'); event('A new star!', 'Your Harbor Town collection grew by one star.', [{label:'Continue',action:closeEvent}]); sound(950); }},
          {label:'Save your shells',action:closeEvent}
        ]);
      }
    }
    function lanternQuiz(attempt){
      if(!current) return;
      var a = current.state, idx = (a.turns + a.position + attempt) % TOWN_FOLK.length;
      var f = TOWN_FOLK[idx], phrase = f.nodes[f.start].t, candidates = [idx,(idx + 3) % TOWN_FOLK.length,(idx + 5) % TOWN_FOLK.length];
      candidates.sort(function(){ return Math.random() - .5; });
      event('Lantern game · read and choose', 'What does “' + phrase[0] + '” mean?', candidates.map(function(k){
        return {label:TOWN_FOLK[k].nodes[TOWN_FOLK[k].start].t[1],action:function(){
          if(k === idx){
            var prize = attempt ? 3 : 6; a.shells += prize; save(); status('You earned ' + prize + ' shells.');
            event('You got it!', 'That phrase means “' + phrase[1] + '” You earned ' + prize + ' shells.', [{label:'Continue',action:closeEvent}]); sound(850);
          } else if(!attempt){
            event('Try another lantern', '“' + phrase[0] + '” means “' + phrase[1] + '” Try one more phrase for 3 shells.',
              [{label:'Try again',action:function(){ lanternQuiz(1); }},{label:'Keep walking',action:closeEvent}]); sound(430);
          } else {
            a.shells++; save(); status('You found 1 shell.');
            event('A little light', '“' + phrase[0] + '” means “' + phrase[1] + '” You found 1 shell.', [{label:'Continue',action:closeEvent}]); sound(430);
          }
        }};
      }));
    }
    function openTalk(id){ stop(); townOpenTalk(id); }
    function nextChoices(n){ return n === 8 ? [9,13] : n === 26 ? [27,31] : [(n + 1) % N]; }
    function moveOne(to, token){
      return new Promise(function(resolve){
        var c = current, from = c.state.position, start = performance.now(), duration = reefCalm() ? 90 : 300;
        function frame(now){
          if(!current || current !== c || token !== rollToken){ resolve(false); return; }
          var p = Math.min(1, (now - start) / duration), lift = Math.sin(p * Math.PI) * .68;
          if(c.tokenMesh){ c.tokenMesh.position.set(pos[from].x + (pos[to].x - pos[from].x) * p,
            .72 + lift, pos[from].z + (pos[to].z - pos[from].z) * p); render3d(c); }
          if(p < 1){ c.raf = requestAnimationFrame(frame); }
          else { c.state.position = to; save(); status(); sound(480 + (to % 5) * 40); resolve(true); }
        }
        c.raf = requestAnimationFrame(frame);
      });
    }
    async function advance(token){
      var c = current;
      while(current === c && token === rollToken && c.remaining > 0){
        var choices = nextChoices(c.state.position);
        if(choices.length > 1){
          event('Choose a street', 'The harbor path splits here. Pick the market street or the quay shortcut.', [
            {label:'Market street · space ' + (choices[0] + 1),action:function(){ closeEvent(); resume(choices[0], token); }},
            {label:'Quay shortcut · space ' + (choices[1] + 1),action:function(){ closeEvent(); resume(choices[1], token); }}
          ]);
          return;
        }
        if(!await moveOne(choices[0], token)) return;
        c.remaining--;
      }
      if(current === c && token === rollToken){ c.busy = false; status(); effect(kinds[c.state.position]); }
    }
    async function resume(to, token){
      var c = current;
      if(!c || token !== rollToken || !c.busy) return;
      if(!await moveOne(to, token)) return;
      c.remaining--; advance(token);
    }
    function roll(){
      var c = current;
      if(!c || c.busy) return;
      closeEvent(); c.busy = true; c.state.turns++;
      var die = 1 + Math.floor(Math.random() * 6), doubled = c.state.double;
      c.state.double = false; c.remaining = doubled ? die * 2 : die; save();
      status('You rolled ' + die + (doubled ? ' × 2' : '') + '. Walking ' + c.remaining + ' spaces…');
      sound(700); advance(++rollToken);
    }
    function preview(n){
      var c = current;
      if(!c || c.busy) return;
      event('Space ' + (n + 1) + ' · ' + tileDescription(n),
        kinds[n] === 'talk' ? 'Talk with ' + folkAt(n).en + ' here.' : 'Land here to use this ' + names[kinds[n]].toLowerCase() + '.',
        [{label:'Close',action:closeEvent}]);
    }
    function go(where){
      stop();
      if(where === 'lagoon') openLagoon();
      if(where === 'caves') openCaves();
      if(where === 'captain') openCaptain();
    }
    function mount(){
      var root = app.querySelector('.tb-root');
      if(!root) return;
      stop();
      var c = current = { root:root, state:read(), options:[], busy:false, raf:0, renderer:null, tokenMesh:null };
      root.addEventListener('click', function(e){
        var b = e.target.closest('button'); if(!b || !root.contains(b)) return;
        if(b.hasAttribute('data-tb-roll')) roll();
        else if(b.hasAttribute('data-tb-night') && !c.busy){ c.state.night = !c.state.night; save(); root.classList.toggle('tb-night', c.state.night);
          b.innerHTML = ccIcon(c.state.night ? 'sun' : 'moon'); b.setAttribute('aria-label', 'Switch to ' + (c.state.night ? 'day' : 'night') + ' view'); build3d(c); }
        else if(b.hasAttribute('data-tb-visit')) openTalk(folkAt(c.state.position).id);
        else if(b.hasAttribute('data-tb-choice')){ var o = c.options[+b.dataset.tbChoice]; if(o && !o.disabled) o.action(); }
        else if(b.hasAttribute('data-tb-close')){ if(c.busy && c.remaining > 0) return; closeEvent(); }
        else if(b.hasAttribute('data-tb-preview')) preview(+b.dataset.tbPreview);
        else if(b.hasAttribute('data-tb-go')) go(b.dataset.tbGo);
      });
      status(); build3d(c);
    }
    function render3d(c){ if(c.renderer) c.renderer.render(c.scene, c.camera); }
    function dispose3d(c){
      if(c.raf) cancelAnimationFrame(c.raf);
      if(c.resizeObserver){ c.resizeObserver.disconnect(); c.resizeObserver = null; }
      if(c.resizeHandler){ window.removeEventListener('resize', c.resizeHandler); c.resizeHandler = null; }
      if(c.scene){
        var seen = [];
        c.scene.traverse(function(o){
          if(o.geometry && seen.indexOf(o.geometry) < 0){ seen.push(o.geometry); o.geometry.dispose(); }
          var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          mats.forEach(function(m){ if(seen.indexOf(m) >= 0) return; seen.push(m); if(m.map && seen.indexOf(m.map) < 0){ seen.push(m.map); m.map.dispose(); } m.dispose(); });
        });
      }
      if(c.renderer){ c.renderer.dispose(); try { c.renderer.forceContextLoss(); } catch(e){} c.renderer.domElement.remove(); }
      var host = c.root && c.root.querySelector('.tb-canvas'); if(host) host.classList.remove('tb-webgl');
      c.scene = null; c.renderer = null; c.tokenMesh = null;
    }
    function stop(){
      rollToken++;
      if(!current) return;
      dispose3d(current);
      current = null;
    }

    function build3d(c){
      dispose3d(c);
      var host = c.root.querySelector('.tb-canvas');
      if(!host || !window.THREE) return;
      var T = window.THREE, night = c.state.night;
      try {
        var renderer = new T.WebGLRenderer({ antialias:false, alpha:true, powerPreference:'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
        renderer.setClearColor(night ? 0x163948 : 0x79c8d5, 1);
        host.appendChild(renderer.domElement); c.renderer = renderer;
        var scene = c.scene = new T.Scene();
        scene.fog = new T.Fog(night ? 0x163948 : 0x79c8d5, 32, 55);
        scene.add(new T.HemisphereLight(night ? 0xa8d5ed : 0xfff6df, night ? 0x18394a : 0x5e887e, .75));
        var sun = new T.DirectionalLight(night ? 0xb7dafa : 0xffe6ac, night ? .55 : .65);
        sun.position.set(-6, 11, 6); scene.add(sun);
        var camera = c.camera = new T.OrthographicCamera(-10, 10, 8, -8, .1, 100);
        camera.position.set(0, 17, 13); camera.lookAt(0, 0, 0);
        var mat = function(col, opt){ return new T.MeshLambertMaterial(Object.assign({color:col}, opt || {})); };
        var mesh = function(geo, material, x, y, z){ var o = new T.Mesh(geo, material); o.position.set(x || 0,y || 0,z || 0); scene.add(o); return o; };
        var water = mesh(new T.PlaneGeometry(48, 32), new T.MeshBasicMaterial({color:night ? 0x17485b : 0x6bbacd}));
        water.rotation.x = -Math.PI / 2; water.position.y = -.25;
        var island = mesh(new T.CylinderGeometry(10.1, 10.4, .22, 48), mat(night ? 0x58716b : 0xdccda1));
        island.scale.x = .63; island.position.y = -.2;
        var roadMat = mat(night ? 0x9a8b78 : 0xf9e5ba), railMat = mat(night ? 0x5d594a : 0x9e8067);
        edges.forEach(function(edge){
          var p = pos[edge[0]], q = pos[edge[1]], v1 = new T.Vector3(p.x,.04,p.z), v2 = new T.Vector3(q.x,.04,q.z);
          var curve = new T.LineCurve3(v1,v2), path = mesh(new T.TubeGeometry(curve, 1, .26, 6, false), roadMat);
          path.name = 'street';
        });
        var tileGeo = new T.CylinderGeometry(.36,.43,.18,12), trimGeo = new T.CylinderGeometry(.44,.47,.07,12);
        var trim = mat(night ? 0x2e4650 : 0x9b886f);
        var faces = {};
        kinds.forEach(function(kind){ if(faces[kind]) return;
          var cv = document.createElement('canvas'); cv.width = cv.height = 128;
          var g = cv.getContext('2d'); g.fillStyle = colors[kind]; g.fillRect(0,0,128,128);
          g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 7; g.beginPath(); g.arc(64,64,49,0,Math.PI*2); g.stroke();
          g.fillStyle = '#fffdf6'; g.font = '900 76px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText({blue:'+',red:'−',question:'?',chance:'!',shop:'$',minigame:'M',star:'★',talk:'T'}[kind],64,69);
          var tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter;
          faces[kind] = [mat(colors[kind]), new T.MeshBasicMaterial({map:tex}), mat(colors[kind])];
        });
        pos.forEach(function(p,n){
          mesh(trimGeo,trim,p.x,.16,p.z);
          mesh(tileGeo,faces[kinds[n]],p.x,.29,p.z);
        });
        // Simple shopfronts, rooflines and piers give the town a silhouette without model downloads.
        var house = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
        house.forEach(function(h){
          var angle = h * Math.PI * 2 / house.length, x = Math.cos(angle) * 5.9, z = Math.sin(angle) * 8.45;
          var height = .65 + (h % 3) * .19;
          mesh(new T.BoxGeometry(.95,height,.7),mat(night ? 0x728c86 : [0xf2ddba,0xf0c9a6,0xc4d7c4][h%3]),x,height/2-.05,z);
          var roof = mesh(new T.ConeGeometry(.76,.42,4),mat(night ? 0x9b6881 : [0xc66c68,0x6d9995,0xa8829d][h%3]),x,height+.1,z);
          roof.rotation.y = Math.PI/4;
          if(night){ var lamp = mesh(new T.PlaneGeometry(.25,.3),new T.MeshBasicMaterial({color:0xffd58a,side:T.DoubleSide}),x,height*.58,z+(z>0?.37:-.37)); lamp.rotation.y = z>0 ? 0 : Math.PI; }
        });
        for(var d = 0; d < 4; d++){
          var dx = -4.8 + d * 3.2, dz = d % 2 ? 8.9 : -8.9;
          mesh(new T.BoxGeometry(1.45,.13,1.2),railMat,dx,-.08,dz);
          mesh(new T.CylinderGeometry(.07,.07,.5,6),railMat,dx-.6,.1,dz);
          mesh(new T.CylinderGeometry(.07,.07,.5,6),railMat,dx+.6,.1,dz);
        }
        var pawn = new T.Group();
        pawn.add(new T.Mesh(new T.SphereGeometry(.37,12,9),mat(night ? 0xffdc8f : 0xffd97f)));
        var cap = new T.Mesh(new T.ConeGeometry(.31,.34,10),mat(0x397d99)); cap.position.y = .39; pawn.add(cap);
        scene.add(pawn); c.tokenMesh = pawn;
        pawn.position.set(pos[c.state.position].x,.72,pos[c.state.position].z);
        function resize(){ if(!current || current !== c || !c.renderer) return;
          var w = Math.max(1,host.clientWidth), h = Math.max(1,host.clientHeight), aspect = w/h;
          camera.left=-9.6*aspect; camera.right=9.6*aspect; camera.top=9.6; camera.bottom=-9.6; camera.updateProjectionMatrix();
          renderer.setSize(w,h,false); render3d(c);
        }
        host.classList.add('tb-webgl');
        if(window.ResizeObserver){ c.resizeObserver = new ResizeObserver(resize); c.resizeObserver.observe(host); }
        else { c.resizeHandler = resize; window.addEventListener('resize', resize); }
        resize();
      } catch(e){ dispose3d(c); host.classList.add('tb-no-webgl'); }
    }
    function inspect(){
      if(!current) return null;
      return { tiles:N, forks:[8,26], position:current.state.position, state:Object.assign({},current.state),
        webgl:!!current.renderer, renderer:current.renderer ? {
          calls:current.renderer.info.render.calls, triangles:current.renderer.info.render.triangles,
          geometries:current.renderer.info.memory.geometries, textures:current.renderer.info.memory.textures,
          pixelRatio:current.renderer.getPixelRatio()
        } : null };
    }
    return { html:html, mount:mount, stop:stop, inspect:inspect };
  })();
  function townBoardHTML(){ return TownBoard.html(); }
  function townBoardMount(){ TownBoard.mount(); }
  function townBoardStop(){ TownBoard.stop(); }
  // Read-only diagnostics for the pilot's phone and tablet performance checks.
  window.__townBoardView = function(){ return TownBoard.inspect(); };
