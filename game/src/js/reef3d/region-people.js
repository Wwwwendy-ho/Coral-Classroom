  /* Regional characters sit beside existing spaces. They never award progress or
     replace the board's visit callbacks; their buttons open the real activities. */
  var REGION_PEOPLE = {
    town: { stall:'Harbor stall', hello:'Welcome to Harbor Town! Find a conversation along the piers.', about:'Tap a numbered conversation space to visit a townsperson and practice talking.', activity:'Try a conversation', colors:['#cf7958','#f5dba8','#75513f'], icon:'talk' },
    lagoon: { stall:'Reed stall', hello:'Welcome to Story Lagoon! Every stop has a short story to explore.', about:'Follow the numbered story spaces. Open one to read and practice its conversation.', activity:'Read a story', colors:['#65b7a1','#f4e5ae','#6a7254'], icon:'story' },
    caves: { stall:'Crystal counter', hello:'Welcome to Echo Caves! Listen closely as the sounds bounce around.', about:'The numbered spaces lead to sound pairs, shadowing, and sound rules. Try listening before you echo.', activity:'Practice a sound', colors:['#718ca5','#b7edf1','#45546b'], icon:'sound' },
    patterns: { stall:'Coral boutique', hello:'Welcome to Pattern Reef! Build a sentence one piece at a time.', about:'Each numbered space is a sentence pattern. Visit one to practice using it.', activity:'Build a sentence', colors:['#e398a5','#f5dab8','#937194'], icon:'sentence' },
    beach: { stall:'Driftwood stall', hello:'Welcome to Bottle Beach! There are letters waiting along the shore.', about:'Open a numbered bottle space to read Jisu’s letter and write your reply.', activity:'Open a letter', colors:['#bc8b62','#f8ddb0','#6e8f9b'], icon:'bottle' },
    light: { stall:'Lantern kiosk', hello:'Welcome to the Lighthouse! Look for useful signs on your way.', about:'The numbered spaces lead to signs and everyday manners. Explore one to see what it means.', activity:'Read a sign', colors:['#aab5a0','#f7df96','#536a70'], icon:'lighthouse' },
    captain: { stall:'Naval stores', hello:'Welcome aboard! Check your course, plan, and progress here.', about:'The numbered spaces open today’s plan, your course, and what you can do.', activity:'See the plan', colors:['#708da0','#f0d99c','#384f62'], icon:'anchor' }
  };
  var REGION_TOWN_PEOPLE = {
    cafe:{ species:'seahorse', body:'#e7a46b', belly:'#f7d4a1', accent:'#a9595d', dark:'#80505c' },
    restaurant:{ species:'sea otter', body:'#92684d', belly:'#e7c69f', accent:'#588c87', dark:'#5e473c' },
    shop:{ species:'octopus', body:'#a52f3f', belly:'#e8c2da', accent:'#f1cb77', dark:'#715b84' },
    taxi:{ species:'squid', body:'#8ba7ac', belly:'#d2e0d9', accent:'#e9c45d', dark:'#35485d' },
    subway:{ species:'ray', body:'#263f55', belly:'#f5f3e8', accent:'#853044', dark:'#192a3a' },
    hotel:{ species:'whale', body:'#7385ac', belly:'#e5dfd0', accent:'#cfab73', dark:'#4f6182' },
    pharmacy:{ species:'shrimp', body:'#e69782', belly:'#f9d9c2', accent:'#6ba99f', dark:'#ad6270' },
    friend:{ species:'seal', body:'#b4a6a2', belly:'#f3e2c9', accent:'#de8a87', dark:'#6f6d77' }
  };
  var REGION_HOST_ANIMALS = {
    lagoon:{ species:'sea turtle', body:'#6dab88', belly:'#e5c98b', accent:'#527c72', dark:'#4a6858' },
    caves:{ species:'beluga', body:'#e6e8e5', belly:'#f6f1df', accent:'#467bba', dark:'#62778f' },
    patterns:{ species:'royal gramma', body:'#7838ae', belly:'#efdba6', accent:'#efbc35', dark:'#3f295d' },
    beach:{ species:'hermit crab', body:'#2059a8', belly:'#dce8e5', accent:'#a59478', dark:'#202b38' },
    light:{ species:'jellyfish', body:'#b2d8d0', belly:'#e7f4dd', accent:'#f4d57f', dark:'#648e9a' },
    captain:{ species:'walrus', body:'#9c796b', belly:'#d6b097', accent:'#d7bc81', dark:'#665653' }
  };
  var REGION_TOWN_WELCOME = {
    cafe:'Welcome to my cafe. Come choose a drink.',
    restaurant:'Come in and take a seat. How many are dining today?',
    shop:'Welcome! Have a look around. I can help you find what you need.',
    taxi:'Hop in. Where would you like to go?',
    subway:'Looking for a train? Let’s find your way together.',
    hotel:'Welcome to the hotel. Let’s get you checked in.',
    pharmacy:'Hello. Tell me what you need, and I’ll try to help.',
    friend:'It’s good to meet you. Let’s get to know each other.'
  };
  function regionPersonMeta(region,activityId){
    var id=typeof region==='string'?region:region&&region.id;
    if(id==='town' && activityId){
      var f=typeof TOWN_FOLK!=='undefined' && TOWN_FOLK.find(function(p){ return p.id===activityId; });
      if(f) return { region:id,id:f.id,name:f.en,place:f.place,icon:f.icon,style:REGION_TOWN_PEOPLE[f.id],intro:REGION_TOWN_WELCOME[f.id] };
    }
    var m=REGION_PEOPLE[id];
    return m ? { region:id,id:'host',name:({ lagoon:'Mira',town:'Bok',caves:'Echo',patterns:'Pip',beach:'Jisu',light:'Keeper Hana',captain:'Captain Bay' })[id],place:typeof region==='object'&&region.name||REGION_BOARD_META[id].name,icon:m.icon,
      style:REGION_HOST_ANIMALS[id] || REGION_TOWN_PEOPLE.cafe,intro:m.hello } : null;
  }
  function regionPersonPortrait(region,activityId){
    var m=regionPersonMeta(region,activityId); if(!m) return '';
    var s=m.style, a=s.species, p='';
    function ellipse(x,y,rx,ry,c){ return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+c+'"/>'; }
    function path(d,c){ return '<path d="'+d+'" fill="'+c+'"/>'; }
    var eyes=ellipse(39,49,3,4,'#293d48')+ellipse(57,49,3,4,'#293d48')+ellipse(40,48,1,1,'#fff')+ellipse(58,48,1,1,'#fff');
    // Small fallbacks follow the same mouth anatomy as the authored cast.
    // Cephalopod beaks are beneath the arms; jellyfish have no visible mouth.
    var smile='';
    if(a==='sea otter' || a==='seal' || a==='walrus')
      smile='<path d="M48 57 V61 M43 62 L48 61 L53 62" fill="none" stroke="'+s.dark+'" stroke-width="1.5" stroke-linecap="round"/>';
    else if(a==='shrimp' || a==='hermit crab')
      smile='<path d="M45 59 l2 3 M51 59 l-2 3" fill="none" stroke="'+s.dark+'" stroke-width="1.5" stroke-linecap="round"/>';
    else if(a==='sea turtle' || a==='whale')
      smile='<path d="M43 60 Q48 59 53 60" fill="none" stroke="'+s.dark+'" stroke-width="1.5" stroke-linecap="round"/>';
    if(a==='seahorse'){
      p=path('M46 89 Q22 87 27 71 Q30 63 38 68 Q49 78 38 81 Q34 81 34 76',s.dark)+path('M40 75 Q27 63 34 46 Q28 34 39 25 L61 24 L72 36 L58 43 Q64 59 55 74 Z',s.body)+ellipse(54,35,19,12,s.body)+path('M59 37 L77 41 Q71 47 60 44 Z',s.belly)+path('M36 29 L31 17 L42 24 L47 14 L52 25',s.accent)+eyes+ellipse(76,42,2,3,s.dark);
    } else if(a==='sea otter' || a==='seal' || a==='walrus'){
      p=path('M26 74 Q9 80 16 91 Q26 92 35 83',s.dark)+ellipse(48,67,27,25,s.body)+ellipse(48,72,21,17,s.belly)+ellipse(48,41,25,24,s.body)+ellipse(28,24,8,9,s.body)+ellipse(68,24,8,9,s.body)+ellipse(48,55,14,10,s.belly)+eyes+ellipse(48,55,4,3,s.dark)+smile;
      if(a==='seal') p+=path('M25 71 Q5 67 9 81 Q22 85 32 75 M71 71 Q91 67 87 81 Q74 85 64 75',s.body);
      if(a==='walrus') p+=path('M43 57 L40 83 Q44 88 46 81 L47 58 M53 57 L50 83 Q54 88 56 81 L57 58',s.belly)+'<path d="M28 57 L41 55 M55 55 L68 57" stroke="'+s.dark+'" stroke-width="1.4"/>';
      if(a==='sea otter') p+=path('M27 75 Q14 72 13 83 Q24 87 35 79 M69 75 Q82 72 83 83 Q72 87 61 79',s.dark)+'<path d="M26 54 L39 56 M57 56 L70 54" stroke="'+s.dark+'" stroke-width="1.5"/>';
    } else if(a==='octopus'){
      p=path('M31 63 Q13 67 19 84 Q25 92 33 77 Q27 91 37 91 Q46 90 43 75 Q47 92 55 90 Q62 87 55 74 Q66 88 74 83 Q81 76 65 63',s.body)+ellipse(48,45,26,28,s.body)+ellipse(48,58,18,10,s.belly)+eyes+smile;
      p+=ellipse(27,72,2,2,s.belly)+ellipse(67,72,2,2,s.belly)+path('M34 72 L62 72 L59 91 L37 91 Z','#303966');
    } else if(a==='squid'){
      var squidEyes=activityId==='taxi' ? '<path d="M34 48 Q39 45 44 48 M52 48 Q57 45 62 48" fill="none" stroke="'+s.dark+'" stroke-width="3"/>' : eyes;
      p=path('M30 53 L48 10 L66 53 Q59 65 48 66 Q37 65 30 53 Z',s.body)+path('M31 31 L21 44 L33 49 M65 31 L75 44 L63 49',s.body)+ellipse(48,57,20,13,s.belly)+squidEyes;
      if(activityId==='taxi') p+=path('M29 65 Q48 70 67 65 L67 71 Q48 76 29 71 Z',s.accent)+path('M51 71 L57 72 L58 88 L52 87 Z',s.dark);
      [35,42,49,56,63].forEach(function(x,i){ p+='<path d="M'+x+' 65 Q'+(x+(i-2)*3)+' 80 '+(x+(i-2)*2)+' 90" fill="none" stroke="'+s.body+'" stroke-width="5" stroke-linecap="round"/>'; });
    } else if(a==='ray'){
      p=path('M48 15 Q60 35 85 47 Q71 69 48 66 Q25 69 11 47 Q36 35 48 15 Z',s.body)+ellipse(48,50,16,12,s.belly)+eyes+smile+'<path d="M48 65 Q47 81 52 94" fill="none" stroke="'+s.dark+'" stroke-width="4"/>'+ellipse(26,46,2,2,s.belly)+ellipse(34,41,2,2,s.belly)+ellipse(70,46,2,2,s.belly)+ellipse(62,41,2,2,s.belly)+path('M34 61 L62 61 L62 66 L53 66 L54 76 L49 76 L48 66 L34 66 Z',s.accent);
    } else if(a==='royal gramma'){
      p=path('M20 49 L3 34 L5 65 L23 57 Z',s.accent)+ellipse(45,49,30,20,s.accent)+path('M48 30 Q77 30 80 48 Q74 70 47 69 Z',s.body)+path('M35 30 L44 16 L62 30 M35 68 L47 80 L61 68',s.accent)+ellipse(64,45,8,9,'#fff5df')+ellipse(67,45,5,6,'#382751')+ellipse(68,42,1.6,2,'#fff')+'<path d="M75 54 L80 53" stroke="'+s.dark+'" stroke-width="1.6"/>';
    } else if(a==='whale' || a==='beluga'){
      p=path('M13 62 Q7 39 35 31 Q62 21 77 44 Q84 54 75 69 Q59 82 38 78 Q20 77 13 62 Z',s.body)+ellipse(47,68,26,11,s.belly)+path('M13 56 L3 49 L8 69 L23 68 M77 57 L91 48 L87 69 L70 70',s.body)+path('M43 29 Q36 22 39 15 M48 29 Q49 19 55 16',s.accent)+eyes+(a==='beluga'?'<path d="M43 61 L53 61" stroke="'+s.dark+'" stroke-width="1.6" stroke-linecap="round"/>':smile);
    } else if(a==='shrimp'){
      p=path('M25 24 Q61 15 73 42 Q83 67 52 81 L34 71 Q59 70 62 52 Q59 35 34 37 Z',s.body)+path('M34 37 Q20 43 26 61 Q30 70 43 70 L53 57 Q42 58 43 47 Z',s.belly)+path('M30 23 Q17 9 12 23 M34 25 Q28 7 23 8',s.dark)+eyes+smile;
      p+='<path d="M44 74 l-6 12 M53 75 l-3 13 M62 70 l3 14" stroke="'+s.dark+'" stroke-width="3"/>';
    } else if(a==='sea turtle'){
      p=ellipse(48,64,32,23,s.dark)+ellipse(48,61,29,23,s.accent)+path('M48 37 L60 45 L58 61 L48 70 L36 61 L36 45 Z',s.body)+ellipse(48,42,18,17,s.body)+path('M21 61 L6 73 L24 78 L34 68 M75 61 L90 73 L72 78 L62 68',s.body)+eyes+smile;
    } else if(a==='nautilus'){
      p=ellipse(46,46,31,29,s.belly)+ellipse(45,46,25,24,s.body)+'<circle cx="45" cy="46" r="17" fill="none" stroke="'+s.dark+'" stroke-width="3"/><circle cx="45" cy="46" r="8" fill="none" stroke="'+s.belly+'" stroke-width="3"/>'+ellipse(58,66,17,14,s.body)+eyes+smile;
      [39,47,55,63].forEach(function(x){ p+='<path d="M'+x+' 74 Q'+(x-5)+' 83 '+x+' 91" fill="none" stroke="'+s.body+'" stroke-width="4"/>'; });
    } else if(a==='cuttlefish'){
      p=path('M48 15 Q70 16 73 50 Q74 68 48 72 Q22 68 23 50 Q26 16 48 15 Z',s.body)+path('M26 38 Q12 47 22 64 L31 67 M70 38 Q84 47 74 64 L65 67',s.accent)+ellipse(48,57,19,10,s.belly)+eyes+smile;
      [35,43,51,59].forEach(function(x){ p+='<path d="M'+x+' 69 Q'+(x-3)+' 81 '+x+' 90" fill="none" stroke="'+s.body+'" stroke-width="5"/>'; });
    } else if(a==='hermit crab'){
      p=ellipse(48,45,26,28,s.accent)+'<path d="M38 45 Q47 24 60 40 Q64 49 56 53" fill="none" stroke="'+s.dark+'" stroke-width="4"/>'+ellipse(48,68,24,17,s.body)+path('M26 68 Q9 56 8 72 Q11 84 28 76 M70 68 Q87 56 88 72 Q85 84 68 76',s.body)+eyes+smile+path('M28 72 L42 72 L42 84 L28 84 Z','#d87931')+path('M54 73 L70 73 L70 84 L54 84 Z','#fff1ce')+ellipse(62,78,3,3,'#e87e29');
    } else if(a==='jellyfish'){
      p=path('M15 55 Q14 18 48 17 Q82 18 81 55 Q72 67 64 56 Q56 68 48 56 Q40 68 32 56 Q24 67 15 55 Z',s.body)+ellipse(48,44,26,16,s.belly)+eyes+smile;
      [30,39,48,57,66].forEach(function(x){ p+='<path d="M'+x+' 61 Q'+(x-7)+' 76 '+x+' 88" fill="none" stroke="'+s.accent+'" stroke-width="4" stroke-linecap="round"/>'; });
    }
    return '<svg class="r3-person-portrait-art" viewBox="0 0 96 96" role="img" aria-label="'+esc(m.name+' the '+a)+' portrait" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="46" fill="'+s.belly+'"/>'+p+'</svg>';
  }
  function regionMerchantPortrait(){
    return '<svg class="r3-person-portrait-art" viewBox="0 0 96 96" role="img" aria-label="Bok the pufferfish portrait" xmlns="http://www.w3.org/2000/svg">'+
      '<circle cx="48" cy="48" r="46" fill="#f5dba8"/>'+
      '<path d="M21 70 Q10 63 15 49 L27 54 Z M75 70 Q86 63 81 49 L69 54 Z" fill="#df9355"/>'+
      '<circle cx="48" cy="49" r="32" fill="#f6c768"/><ellipse cx="48" cy="64" rx="25" ry="15" fill="#fff0ba"/>'+
      '<path d="M29 76 Q48 85 67 76 L63 94 L33 94 Z" fill="#f9f0df"/>'+
      '<path d="M21 26 Q48 14 75 26 L76 31 L20 31 Z M30 15 Q48 4 66 15 L64 27 L32 27 Z" fill="#75513f"/>'+
      '<ellipse cx="37" cy="48" rx="7" ry="8" fill="#fff9de"/><ellipse cx="59" cy="48" rx="7" ry="8" fill="#fff9de"/>'+
      '<circle cx="38" cy="49" r="3.4" fill="#263b47"/><circle cx="58" cy="49" r="3.4" fill="#263b47"/>'+
      '<circle cx="39" cy="47" r="1.3" fill="#fff"/><circle cx="59" cy="47" r="1.3" fill="#fff"/>'+
      '<ellipse cx="48" cy="62" rx="5" ry="3" fill="#df9355"/><ellipse cx="48" cy="62" rx="2.5" ry="1.4" fill="#935c42"/>'+
      '</svg>';
  }
  function regionPeopleShopMeta(view){
    var m = view && view.region && REGION_PEOPLE[view.region.id];
    return m ? { name:'Bok', title:'Bok’s ' + m.stall, intro:'Welcome! I brought a few useful things for your travels.', portrait:regionMerchantPortrait() } : null;
  }
  function regionPeopleSide(view, s, distance){
    var choices = [-1, 1].map(function(side){
      var x = s.x + side * distance, z = s.z + .2, near = 99;
      view.spaces.forEach(function(p){ if(p === s) return; near = Math.min(near, Math.hypot(p.x - x, p.z - z)); });
      return { side:side, near:near };
    });
    choices.sort(function(a,b){ return b.near - a.near; });
    return choices[0].side;
  }
  // Compressed game proportions, not a literal biological scale.
  var REGION_PERSON_SCALE={seahorse:.78,'sea otter':1.05,octopus:1.35,squid:.95,ray:1.65,
    whale:1.3,beluga:1.18,'royal gramma':.9,shrimp:.65,seal:1.1,'sea turtle':1.05,nautilus:.72,cuttlefish:.85,'hermit crab':.40,jellyfish:1.05,walrus:1.4};
  function regionPeopleCacheBounds(actor){
    var T=window.THREE, box=new T.Box3().setFromObject(actor), size=new T.Vector3(), center=new T.Vector3();
    box.getSize(size); box.getCenter(center);
    var origin=actor.getWorldPosition(new T.Vector3());
    var bounds={ width:size.x, height:size.y, depth:size.z, centerX:center.x-origin.x,
      centerY:center.y-origin.y, centerZ:center.z-origin.z, top:box.max.y-origin.y,
      radius:Math.hypot(Math.max(Math.abs(box.min.x-origin.x),Math.abs(box.max.x-origin.x)),Math.max(Math.abs(box.min.z-origin.z),Math.abs(box.max.z-origin.z))) };
    actor.userData.regionBounds=bounds; return bounds;
  }
  // Choose the near side first, then move outward until the entire footprint
  // clears the surrounding tiles. The ray prefers the open central basin.
  function regionPeoplePlacement(view,space,bounds,basin){
    var radius=bounds.radius || 0, start=Math.max(2.75,radius+1.35), preferred=space.x>=0?-1:1;
    var best=null;
    [-1,1].forEach(function(side){
      for(var extra=0;extra<=12;extra+=.5){
        var x=space.x+side*(start+extra), z=space.z+.18, min=Infinity;
        view.spaces.forEach(function(tile){ min=Math.min(min,Math.hypot(tile.x-x,tile.z-z)); });
        var deficit=Math.max(0,radius+1.25-min);
        var score=deficit*1000+extra+(basin && side!==preferred ? 1.5 : 0);
        if(!best || score<best.score) best={x:x,z:z,side:side,score:score};
        if(!deficit) break;
      }
    });
    return best;
  }
  // All octopus skin pieces share one bake/material; merge without the world
  // chunk split so the deliberately changing body costs one additional draw.
  function regionOctopusMerge(root,rig,cache){
    var T=window.THREE, U=T.BufferGeometryUtils, result=new T.Group(), pieces=[], material=null;
    if(!U) { result.add(root); return result; }
    root.updateMatrixWorld(true);
    root.traverse(function(mesh){
      if(!mesh.isMesh || !mesh.visible) return;
      reef3dPieces(mesh).forEach(function(piece){
        var g=piece.g; g.applyMatrix4(mesh.matrixWorld);
        if(!g.attributes.normal) g.computeVertexNormals();
        reef3dBakeGeo(g,piece.mat,rig);
        Object.keys(g.attributes).forEach(function(name){ if(name!=='position' && name!=='color') g.deleteAttribute(name); });
        g.morphAttributes={}; g.groups=[];
        material=reef3dBakedMat(cache,piece.mat); pieces.push(g);
      });
    });
    var merged=null;
    try { merged=U.mergeBufferGeometries(pieces,false); } catch(e){}
    if(merged) result.add(new T.Mesh(merged,material));
    else result.add(root);
    pieces.forEach(function(g){ g.dispose(); });
    return result;
  }
  // A skin adapter needs only baked vertex colours: the same interface can be
  // supplied by an authored model's dedicated Skin mesh in a later asset.
  function regionOctopusSkin(root, baseHex, groundHex){
    var T=window.THREE, source=new T.Color(baseHex), ground=new T.Color(groundHex || '#b8aa94');
    var display=[new T.Color('#a52f3f'),new T.Color('#f7eee4'),new T.Color('#4d1826')];
    var meshes=[];
    root.traverse(function(o){
      var g=o.geometry, color=g && g.attributes.color, pos=g && g.attributes.position;
      if(!o.isMesh || !color || !pos) return;
      var original=color.array.slice(), shade=new Float32Array(original.length), mask=new Float32Array(pos.count);
      for(var i=0;i<pos.count;i++){
        // Stable local mottling, computed once. Retain the original bake per channel.
        var x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
        mask[i]=.5+.5*Math.sin(x*13+y*8+Math.sin(z*11))*Math.sin(z*10-y*7);
        shade[i*3]=original[i*3]/Math.max(.001,source.r);
        shade[i*3+1]=original[i*3+1]/Math.max(.001,source.g);
        shade[i*3+2]=original[i*3+2]/Math.max(.001,source.b);
      }
      var palette={ natural:original, camouflage:new Float32Array(original.length), display:new Float32Array(original.length) };
      for(var j=0;j<pos.count;j++){
        var m=mask[j], stone=.70+.52*m, d=m<.31 ? display[2] : m>.69 ? display[1] : display[0];
        for(var k=0;k<3;k++){
          var channel=k===0?'r':k===1?'g':'b', n=j*3+k;
          palette.camouflage[n]=shade[n]*ground[channel]*stone;
          palette.display[n]=shade[n]*d[channel];
        }
      }
      if(color.setUsage && T.DynamicDrawUsage) color.setUsage(T.DynamicDrawUsage);
      meshes.push({attribute:color,palette:palette});
    });
    return meshes.length ? { meshes:meshes, mode:'natural' } : null;
  }
  function regionReactionVisible(view,actor){
    return !!(view && view.regionPeople && !view.regionPeople.disposed && !view.parked &&
      view.wrap && view.wrap.isConnected && !document.hidden && actor && actor.visible &&
      view.encounter && view.encounter.phase==='intro' && view.encounter.actor===actor && regionEncounterActive(view));
  }
  function regionPeopleReactionCancel(view,finish){
    var p=view && view.regionPeople, fx=p && p.reaction;
    if(!fx) return;
    p.reaction=null;
    var i=view.fx.indexOf(fx); if(i>=0) view.fx.splice(i,1);
    fx.end(!!finish);
  }
  function regionOctopusSet(view,skin,mode){
    var p=view.regionPeople, town=p && p.towns.find(function(t){ return t.skin===skin; });
    if(!town || ['natural','camouflage','display'].indexOf(mode)<0) return;
    regionPeopleReactionCancel(view,true);
    var start=skin.meshes.map(function(m){ return m.attribute.array.slice(); });
    skin.mode=mode; skin.pending=false;
    function apply(t){
      skin.meshes.forEach(function(m,i){
        var a=m.attribute.array, from=start[i], to=m.palette[mode];
        for(var n=0;n<a.length;n++) a[n]=from[n]+(to[n]-from[n])*t;
        m.attribute.needsUpdate=true;
      });
    }
    if(reefCalm()){ apply(1); return; }
    var effect={t0:performance.now(),dur:600,step:function(t){
      if(regionReactionVisible(view,town.object)) apply(reefCalm() ? 1 : t*t*(3-2*t));
    },end:function(finish){ if(finish!==false){ if(regionReactionVisible(view,town.object)) apply(1); else skin.pending=true; } if(p.reaction===effect) p.reaction=null; }};
    p.reaction=effect; view.fx.push(effect);
  }
  function regionJisuDelivery(view,actor){
    var p=view.regionPeople, motion=actor && actor.userData.deliveryMotion;
    if(!p || !motion || reefCalm() || !regionReactionVisible(view,actor)) return;
    regionPeopleReactionCancel(view,true);
    var T=window.THREE, geometry=new T.BufferGeometry();
    // Three compact blue-white zigzags in one line draw, with no lighting.
    var points=[-.9,.5,.15,-.72,.62,.15, -.72,.62,.15,-.79,.76,.15, -.79,.76,.15,-.58,.88,.15,
      .88,.46,.12,.72,.59,.12, .72,.59,.12,.79,.72,.12, .79,.72,.12,.58,.85,.12,
      -.52,1.55,.1,-.38,1.65,.1, -.38,1.65,.1,-.43,1.75,.1, -.43,1.75,.1,-.27,1.86,.1];
    geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    var material=new T.LineBasicMaterial({color:'#bceeff',transparent:true,opacity:1,depthWrite:false});
    var arcs=new T.LineSegments(geometry,material), x0=motion.position.x, ended=false;
    motion.add(arcs);
    var effect={t0:performance.now(),dur:540,step:function(t){
      if(!regionReactionVisible(view,actor)) return;
      if(reefCalm()){ motion.position.x=x0; arcs.visible=false; return; }
      motion.position.x=x0+.28*Math.sin(t*Math.PI*2)*Math.sin(t*Math.PI);
      material.opacity=Math.sin(Math.PI*t);
    },end:function(){
      if(ended) return; ended=true; motion.position.x=x0; motion.remove(arcs); geometry.dispose(); material.dispose();
      if(p.reaction===effect) p.reaction=null;
    }};
    p.reaction=effect; view.fx.push(effect);
  }
  function regionPeopleBuild(view){
    if(!view || !view.region || !REGION_PEOPLE[view.region.id] || view.regionPeople) return;
    var T = window.THREE, id = view.region.id, m = REGION_PEOPLE[id], shop = view.spaces.find(function(s){ return s.kind === 'shop'; });
    if(!shop) return;
    var root = new T.Group(), M = view.kit.M, mesh = view.kit.mesh, geos={};
    root.name = 'region-people-' + id;
    var colors = m.colors, mats = {};
    function mat(c){ return mats[c] || (mats[c] = M(c)); }
    function geo(key,build){ return geos[key] || (geos[key]=build()); }
    function part(parent, geo, color, x,y,z){ var o = mesh(geo, mat(color), x,y,z); parent.add(o); return o; }
    function box(parent,w,h,d,c,x,y,z){ return part(parent,geo('b:'+w+':'+h+':'+d,function(){ return new T.BoxGeometry(w,h,d); }),c,x,y,z); }
    function ball(parent,r,c,x,y,z){ return part(parent,geo('s:'+r,function(){ return new T.SphereGeometry(r,12,8); }),c,x,y,z); }
    function cyl(parent,rt,rb,h,c,x,y,z){ return part(parent,geo('c:'+rt+':'+rb+':'+h,function(){ return new T.CylinderGeometry(rt,rb,h,10); }),c,x,y,z); }
    var side = regionPeopleSide(view, shop, 3.3), base = shop.y || 0;
    // Counter and roof echo the surrounding region, with a clear gap around the shop tile.
    var stall = new T.Group(); stall.position.set(shop.x + side * 3.8,base,shop.z - .15); root.add(stall);
    box(stall,1.85,.72,1.2,colors[2],0,.38,0);
    box(stall,2,.16,1.4,colors[1],0,.82,0);
    [-.84,.84].forEach(function(x){ box(stall,.1,1.75,.1,colors[2],x,1.68,-.38); });
    var canopy = box(stall,2.25,.16,1.5,colors[0],0,2.53,-.15); canopy.rotation.z = side * .07;
    for(var j=-1;j<=1;j++) box(stall,.48,.1,1.52,j===0?colors[1]:colors[0],j*.67,2.61,-.15);
    if(id==='caves'){
      for(var c=-1;c<=1;c++) cyl(stall,0,.18,.56,colors[1],c*.55,1.19,.21);
    } else if(id==='lagoon'){
      for(var r=-1;r<=1;r++) box(stall,.1,.82,.08,'#e9d69d',r*.64,1.3,-.41);
    } else if(id==='light'){
      ball(stall,.25,'#ffe694',0,2.2,.53);
    } else if(id==='patterns'){
      [-.65,0,.65].forEach(function(x){ ball(stall,.2,'#f6adbb',x,1.03,.31); });
    } else if(id==='beach'){
      [-.5,.5].forEach(function(x){ box(stall,.38,.3,.24,'#f5e7c5',x,1.09,.25); });
    } else if(id==='captain'){
      box(stall,1.5,.18,.12,'#eacb8d',0,1.47,.58);
    } else {
      [-.5,.5].forEach(function(x){ cyl(stall,.2,.24,.34,'#c8a173',x,1.09,.2); });
    }
    var stallPos=stall.position.clone(); root.remove(stall); stall.position.set(0,0,0);
    stall=reef3dMerge(stall,view.rig,view.bake); stall.position.copy(stallPos); root.add(stall);
    // Bok is a pufferfish merchant: round body, fins, big eyes, apron and cap.
    var actor = new T.Group(); actor.position.set(shop.x + side * 2.72,base,shop.z + .58); root.add(actor);
    ball(actor,.65,'#f6c768',0,1.14,0);
    ball(actor,.52,'#fff0ba',0,.95,.31);
    [-1,1].forEach(function(d){
      var fin=ball(actor,.27,'#df9355',d*.6,1.18,.02); fin.scale.set(.45,.85,.7);
      ball(actor,.2,'#fff9de',d*.23,1.33,.5);
      ball(actor,.095,'#263b47',d*.23,1.32,.67);
      ball(actor,.025,'#ffffff',d*.205,1.37,.752);
    });
    var apron=box(actor,.76,.58,.11,'#f9f0df',0,.64,.55); apron.rotation.x=-.13;
    box(actor,.5,.075,.13,colors[0],0,.72,.63);
    box(actor,.82,.12,.48,colors[2],0,1.78,.05);
    cyl(actor,.35,.43,.3,colors[2],0,1.95,-.02);
    var beak=ball(actor,.043,'#935c42',0,.98,.735); beak.scale.set(1,.48,.35);
    ball(actor,.12,'#df9355',0,1.03,.51);
    var arm=ball(actor,.21,'#df9355',side*.66,1.36,.18); arm.scale.set(.48,.9,.55);
    // The visible body and cap carry the action.
    actor.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='shop'; });
    stall.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='shop'; });
    regionPeopleCacheBounds(actor);
    view.hitables.push(actor,stall);
    function makeMarine(parent, style, personId){
      // Static rounded anatomy faces +z. Every animal rests on the same ground plane.
      var species=style.species, body=style.body, belly=style.belly, accent=style.accent, dark=style.dark;
      function oval(r,c,x,y,z,sx,sy,sz){ var o=ball(parent,r,c,x,y,z); o.scale.set(sx,sy,sz); return o; }
      function cone(r,h,c,x,y,z){ return part(parent,geo('cone:'+r+':'+h,function(){ return new T.ConeGeometry(r,h,10); }),c,x,y,z); }
      function line(x1,y1,z1,x2,y2,z2,r,c){
        var dx=x2-x1,dy=y2-y1,dz=z2-z1,len=Math.hypot(dx,dy,dz);
        var o=cyl(parent,r,r,len,c,(x1+x2)/2,(y1+y2)/2,(z1+z2)/2);
        o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx/len,dy/len,dz/len)); return o;
      }
      function eyes(x,y,z,spread){
        [-1,1].forEach(function(d){
          oval(.125,'#fff8e8',x+d*spread,y,z,.88,1,.55);
          oval(.064,'#2b4050',x+d*spread,y-.005,z+.065,1,1,.55);
          ball(parent,.018,'#ffffff',x+d*spread-.025,y+.027,z+.105);
        });
      }
      function mouth(x,y,z){
        if(species==='octopus' || species==='squid' || species==='cuttlefish' || species==='nautilus' || species==='jellyfish') return;
        if(species==='shrimp' || species==='hermit crab'){
          line(x-.035,y+.01,z,x-.012,y-.018,z+.006,.008,dark);
          line(x+.035,y+.01,z,x+.012,y-.018,z+.006,.008,dark);
        } else if(species==='sea otter' || species==='seal' || species==='walrus'){
          line(x,y+.022,z,x,y-.005,z,.007,dark);
          line(x-.058,y-.016,z,x,y-.005,z+.003,.007,dark);
          line(x,y-.005,z+.003,x+.058,y-.016,z,.007,dark);
        } else if(species==='ray'){
          // The mouth is ventral, below the forward face rather than a grin on top.
          line(x-.055,y-.12,z-.10,x+.055,y-.12,z-.10,.007,dark);
        } else {
          line(x-.064,y,z,x,y+.004,z+.003,.007,dark);
          line(x,y+.004,z+.003,x+.064,y,z,.007,dark);
        }
      }
      if(species==='seahorse'){
        oval(.42,body,-.035,1.03,0,.62,1.25,.61);
        oval(.3,belly,.105,.98,.2,.53,1.05,.36);
        oval(.31,body,.06,1.57,0,.9,.74,.8);
        oval(.22,body,.23,1.46,.24,1.25,.45,.9);
        oval(.11,belly,.47,1.43,.29,1.4,.5,.7);
        eyes(.06,1.66,.25,.16);
        var snoutRim=part(parent,geo('seahorse-mouth-rim',function(){return new T.TorusGeometry(.037,.009,5,12);}),belly,.61,1.43,.29);snoutRim.rotation.y=Math.PI/2;
        oval(.031,dark,.615,1.43,.29,.15,.85,.95);
        [-1,1].forEach(function(d){ var f=oval(.17,accent,d*.28,1.05,-.23,.35,1.05,.58); f.rotation.z=d*.3; });
        [1.71,1.82,1.9].forEach(function(y,i){ cone(.1,.25,accent,-.12+i*.14,y,-.13); });
        line(-.08,.7,-.05,-.25,.35,-.1,.1,body);
        line(-.25,.35,-.1,-.07,.18,-.07,.09,body);
        line(-.07,.18,-.07,.15,.3,-.06,.07,body);
        oval(.1,accent,.15,.29,-.06,.5,.4,.7);
        if(personId==='cafe'){
          cyl(parent,.105,.09,.18,'#fff7e7',.33,1.0,.27);
          part(parent,geo('marine-cup-handle',function(){ return new T.TorusGeometry(.055,.016,5,10); }),accent,.46,1,.27);
        }
      } else if(species==='sea otter' || species==='seal' || species==='walrus'){
        var large=species==='walrus', sleek=species==='seal';
        oval(.59,body,0,.78,-.1,large?1.12:.86,large?1.22:1.05,.85);
        oval(.39,belly,0,.69,.31,large?1.07:.86,1,.45);
        oval(.33,body,0,1.48,.09,large?1.15:1,large?1.04:.97,1);
        oval(.19,belly,0,1.36,.37,1.15,.63,.55);
        eyes(0,1.53,.34,.19);
        oval(.065,dark,0,1.35,.5,1,.65,.55); mouth(0,1.25,.48);
        [-1,1].forEach(function(d){
          var fin=oval(.25,body,d*(large?.59:.47),.76,.16,.57,1.28,.34); fin.rotation.z=d*.42;
          oval(.18,body,d*.26,.12,-.21,1,.35,1.25);
          if(!sleek) oval(.09,body,d*.27,1.73,-.02,.75,.67,.55);
          if(large){ line(d*.08,1.26,.48,d*.12,.98,.52,.035,belly); }
          else { line(d*.12,1.35,.48,d*.32,1.39,.5,.009,dark); line(d*.12,1.31,.48,d*.32,1.27,.5,.009,dark); }
        });
        if(sleek){ var tail=oval(.23,body,0,.13,-.66,1.5,.35,.8); tail.rotation.y=.3; }
        else oval(.16,body,0,.25,-.64,.8,.45,1.8);
        if(personId==='restaurant'){
          cyl(parent,.19,.19,.035,accent,.5,.68,.29);
          cyl(parent,.13,.13,.025,'#fff8df',.5,.71,.29);
        }
        if(large){
          oval(.12,dark,0,1.31,.48,1.45,.67,.55);
          oval(.13,belly,-.12,1.09,.53,.36,1.2,.42);
          oval(.13,belly,.12,1.09,.53,.36,1.2,.42);
        }
      } else if(species==='octopus'){
        function skin(o){ if(personId==='shop') o.userData.octopusSkin=true; return o; }
        for(var i=0;i<8;i++){
          var angle=i*Math.PI/4, dx=Math.cos(angle), dz=Math.sin(angle);
          skin(line(dx*.2,.58,dz*.2,dx*.52,.27,dz*.42,.095,body));
          skin(line(dx*.52,.27,dz*.42,dx*.69,.12,dz*.63,.072,body));
          ball(parent,.08,accent,dx*.69,.12,dz*.63);
        }
        skin(oval(.38,body,0,.88,0,1.02,.77,.9));
        skin(oval(.5,body,0,1.48,0,1.04,.81,.94));
        oval(.22,belly,0,1.29,.35,1.2,.7,.36);
        eyes(0,1.48,.46,.23); mouth(0,1.3,.52);
        [-1,1].forEach(function(d){ ball(parent,.05,accent,d*.37,1.25,.34); });
        if(personId==='shop'){
          box(parent,.58,.50,.09,'#303966',0,.58,.40);
          [-1,1].forEach(function(d){ var strap=box(parent,.07,.35,.07,'#303966',d*.20,.91,.35); strap.rotation.z=-d*.13; });
          box(parent,.24,.12,.05,'#46517c',0,.55,.46);
        }
      } else if(species==='squid'){
        for(var j=-2;j<=2;j++){
          line(j*.095,.67,0,j*.14,.16,.12,.055,body);
          ball(parent,.06,accent,j*.14,.14,.12);
        }
        oval(.3,body,0,.83,0,1.05,1.08,.83);
        cone(.46,1.18,body,0,1.52,-.05);
        oval(.23,belly,0,.72,.24,1.05,.54,.45);
        [-1,1].forEach(function(d){ var fin=cone(.2,.41,accent,d*.39,1.68,-.16); fin.rotation.z=d*.52; });
        if(personId==='taxi'){
          [-1,1].forEach(function(d){
            oval(.125,'#f5f5e8',d*.2,.91,.28,.88,.56,.55);
            oval(.06,dark,d*.2,.90,.35,.85,.60,.5);
            var lid=box(parent,.23,.07,.06,body,d*.2,.955,.365); lid.rotation.z=d*.04;
            var brow=box(parent,.19,.022,.035,dark,d*.2,1.035,.34); brow.rotation.z=d*.04;
          });
          oval(.31,accent,0,.68,.02,1.05,.22,.9);
          var scarf=box(parent,.14,.38,.07,dark,.18,.48,.31); scarf.rotation.z=-.12;
          box(parent,.14,.06,.08,accent,.18,.35,.35);
        } else { eyes(0,.91,.28,.2); mouth(0,.7,.38); }
      } else if(species==='ray'){
        oval(.44,body,0,.94,0,1.05,.47,.9);
        oval(.32,belly,0,.76,.24,.94,.25,.7);
        [-1,1].forEach(function(d){
          var wing=oval(.43,body,d*.83,.88,-.05,1.75,.2,.75); wing.rotation.z=-d*.14;
          [.62,1.02,1.35].forEach(function(x,i){ oval(.045,'#e2f0e9',d*x,.96+i*.02,.12,.8,.28,.85); });
        });
        line(0,.81,-.35,0,.15,-.79,.052,dark);
        eyes(0,1.05,.34,.19); mouth(0,.88,.43);
        if(personId==='subway'){
          box(parent,.48,.10,.07,accent,0,.70,.42);
          var rayScarf=box(parent,.11,.24,.08,accent,.14,.57,.45); rayScarf.rotation.z=.15;
        }
      } else if(species==='royal gramma'){
        var fishGeo=geo('royal-gramma-body',function(){
          var g=new T.SphereGeometry(.48,16,10),p=g.attributes.position,colors=[];
          var purple=new T.Color(body),gold=new T.Color(accent);
          for(var fi=0;fi<p.count;fi++){
            var t=Math.max(0,Math.min(1,(p.getZ(fi)+.09)/.16)),pigment=gold.clone().lerp(purple,t);
            colors.push(pigment.r,pigment.g,pigment.b);
          }
          g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
        });
        var fish=part(parent,fishGeo,'#ffffff',0,.91,0);fish.scale.set(.55,.8,1.5);fish.material=M('#ffffff',{vertexColors:true});
        oval(.23,accent,0,.91,-.88,.12,1,.95);
        var dorsal=oval(.23,body,0,1.28,-.14,.10,.7,1.55);dorsal.rotation.x=.2;
        [-1,1].forEach(function(sd){var fin=oval(.16,belly,sd*.23,.9,.16,.18,.62,1.2);fin.rotation.y=sd*.5;});
        eyes(0,1.03,.59,.14);line(-.035,.87,.71,.035,.87,.71,.008,dark);
      } else if(species==='whale' || species==='beluga'){
        oval(.65,body,0,.85,0,1.05,.84,1);
        oval(.49,belly,0,.56,.31,1.05,.43,.72);
        [-1,1].forEach(function(d){ var f=oval(.24,body,d*.6,.58,.09,1,.27,.63); f.rotation.z=d*.3; });
        line(0,.65,-.62,0,.7,-.93,.11,body);
        [-1,1].forEach(function(d){ oval(.18,body,d*.21,.73,-.96,1.3,.3,.64); });
        if(species==='beluga'){
          oval(.33,body,0,1.12,.32,1,.95,.96);
          oval(.25,belly,0,.83,.52,1.18,.45,.60);
          eyes(0,1.07,.56,.28);line(-.10,.83,.66,.10,.83,.66,.009,dark);
        }else{ eyes(0,1.04,.52,.34); mouth(0,.78,.59); }
        oval(.075,dark,0,1.4,-.12,1,.28,.55);
        if(personId==='hotel'){
          oval(.2,accent,0,1.47,-.08,1.2,.22,.67);
          box(parent,.27,.03,.13,accent,0,1.43,.17);
        }
      } else if(species==='shrimp'){
        [-2,-1,0,1,2].forEach(function(i){
          var x=i*.13, y=.87+Math.abs(i)*.14, z=-Math.abs(i)*.09;
          oval(.23,i%2?body:belly,x,y,z,.72,.8,.7);
          if(i!==0){ line(x,.7,z,x*1.6,.13,z+.18,.025,dark); }
        });
        oval(.26,body,0,1.37,.11,1.05,.94,.85);
        eyes(0,1.46,.34,.16); mouth(0,1.28,.38);
        [-1,1].forEach(function(d){
          line(d*.08,1.58,.06,d*.26,1.86,.11,.018,dark);
          line(d*.26,1.86,.11,d*.38,1.92,.16,.013,dark);
        });
        oval(.17,accent,0,.64,-.38,1.3,.55,.6);
        if(personId==='pharmacy'){
          box(parent,.13,.13,.025,'#fff8e6',.24,1.27,.33);
          box(parent,.025,.09,.031,accent,.24,1.27,.355);
          box(parent,.09,.025,.031,accent,.24,1.27,.36);
        }
      } else if(species==='sea turtle'){
        oval(.49,body,0,.46,0,1.1,.5,.95);
        oval(.52,dark,0,.73,-.08,1.05,.68,.87);
        oval(.49,accent,0,.78,-.08,1,.62,.84);
        [-1,1].forEach(function(d){
          var f=oval(.28,body,d*.5,.34,.23,1.1,.3,.8); f.rotation.z=-d*.22;
          oval(.22,body,d*.39,.19,-.48,.9,.27,.7);
        });
        oval(.28,body,0,.91,.55,.95,.92,1);
        oval(.13,belly,0,.82,.77,1.1,.54,.45);
        eyes(0,1.02,.79,.17); mouth(0,.78,.85);
        [0,1,2].forEach(function(i){ oval(.09,body,(i-1)*.25,1.06,-.08,1,.15,1.3); });
      } else if(species==='nautilus'){
        oval(.55,belly,0,.92,-.14,.96,1,.86);
        oval(.49,body,0,.94,-.17,1,.97,.9);
        var spiral=part(parent,geo('nautilus-spiral',function(){ return new T.TorusGeometry(.28,.045,6,24,Math.PI*1.8); }),dark,-.01,.96,.28);
        spiral.rotation.z=.33;
        oval(.25,body,0,.57,.42,1,.7,.82);
        [-2,-1,0,1,2].forEach(function(i){ line(i*.105,.48,.57,i*.15,.14,.66,.027,body); });
        eyes(0,.66,.61,.16); mouth(0,.48,.64);
      } else if(species==='cuttlefish'){
        oval(.52,body,0,1.02,-.03,.84,1.16,.73);
        oval(.3,belly,0,.83,.37,.85,.85,.34);
        [-1,1].forEach(function(d){ var fin=oval(.28,accent,d*.4,1,-.02,.45,1.55,.52); fin.rotation.z=d*.16; });
        [-2,-1,0,1,2].forEach(function(i){ line(i*.09,.61,.18,i*.14,.14,.31,.055,body); });
        eyes(0,1.11,.47,.2); mouth(0,.88,.49);
        [0,1,2].forEach(function(i){ ball(parent,.055,accent,(i-1)*.23,1.46,.37); });
      } else if(species==='hermit crab'){
        oval(.46,body,0,.5,.17,1,.5,.77);
        oval(.49,accent,0,.9,-.2,1,.95,.9);
        var coil=part(parent,geo('hermit-coil',function(){ return new T.TorusGeometry(.23,.05,6,20,Math.PI*1.7); }),dark,0,.94,.24);
        coil.rotation.z=.25;
        [-1,1].forEach(function(d){
          line(d*.39,.47,.1,d*.65,.18,.25,.06,dark);
          line(d*.54,.52,.17,d*.76,.71,.31,.07,dark);
          oval(.16,body,d*.77,.77,.34,1,.8,.7);
          line(d*.16,.62,.36,d*.2,.96,.48,.04,body);
          ball(parent,.14,belly,d*.2,1.05,.5);
        });
        eyes(0,1.05,.61,.2); mouth(0,.56,.55);
        if(personId==='host'){
          box(parent,.27,.25,.09,'#d87931',-.42,.42,.46);
          box(parent,.31,.20,.06,'#fff1ce',.26,.37,.52);
          // A small orange scallop seal marks the cream envelope.
          oval(.045,'#e87e29',.26,.368,.56,1.1,.58,.35);
          [-2,-1,0,1,2].forEach(function(i){ oval(.019,'#e87e29',.26+i*.022,.385+(2-Math.abs(i))*.006,.56,1,1,.5); });
        }
      } else if(species==='jellyfish'){
        [-2,-1,0,1,2].forEach(function(i){
          line(i*.14,1.03,0,i*.14+(i%2)*.05,.13,.05,.027,accent);
          ball(parent,.055,belly,i*.14+(i%2)*.05,.12,.05);
        });
        oval(.55,body,0,1.46,0,1.12,.82,.95);
        oval(.48,belly,0,1.16,.08,1.09,.28,.9);
        [-1,1].forEach(function(d){ oval(.15,accent,d*.4,1.06,.09,1,.25,.65); });
        eyes(0,1.42,.49,.23); mouth(0,1.2,.51);
        ball(parent,.09,accent,0,2.06,0);
      }
    }
    var deck=view.spaces.find(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity; });
    var marker=null, markerSpace=null, towns=[];
    if(id==='town'){
      view.spaces.forEach(function(s){
        if(s.kind!=='deck' || s.practice || !s.item || !s.item.d || !s.item.d.regionActivity) return;
        var person=regionPersonMeta('town',s.item.d.regionActivity.id); if(!person) return;
        var style=person.style, npc=new T.Group();
        makeMarine(npc,style,person.id);
        var skinRoot=null;
        if(person.id==='shop'){
          skinRoot=new T.Group();
          npc.children.slice().forEach(function(o){ if(o.userData.octopusSkin) skinRoot.add(o); });
        }
        npc=reef3dMerge(npc,view.rig,view.bake);
        var skinState=null;
        if(skinRoot){ var bakedSkin=regionOctopusMerge(skinRoot,view.rig,view.bake); npc.add(bakedSkin); skinState=regionOctopusSkin(bakedSkin,style.body,view.regionGround); }
        npc.userData.species=style.species;
        npc.scale.setScalar(REGION_PERSON_SCALE[style.species] || 1);
        var bounds=regionPeopleCacheBounds(npc), where=regionPeoplePlacement(view,s,bounds,person.id==='subway');
        npc.position.set(where.x,s.y||0,where.z); root.add(npc);
        npc.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='town:'+person.id; });
        view.hitables.push(npc); towns.push({ object:npc, space:s, meta:person, skin:skinState });
      });
    } else if(deck){
      var y=deck.y||0;
      marker=new T.Group();
      makeMarine(marker,regionPersonMeta(view.region).style,'host');
      marker=reef3dMerge(marker,view.rig,view.bake);
      if(id==='beach'){
        var motion=new T.Group(); marker.children.slice().forEach(function(o){ motion.add(o); }); marker.add(motion); marker.userData.deliveryMotion=motion;
      }
      marker.userData.species=regionPersonMeta(view.region).style.species;
      marker.scale.setScalar(REGION_PERSON_SCALE[marker.userData.species] || 1);
      var markerBounds=regionPeopleCacheBounds(marker), markerWhere=regionPeoplePlacement(view,deck,markerBounds,false);
      marker.position.set(markerWhere.x,y,markerWhere.z); root.add(marker);
      marker.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='activity'; });
      view.hitables.push(marker); markerSpace=deck;
    }
    view.scene.add(root);
    var labels=document.createElement('div'); labels.className='r3-people-labels';
    var meet=document.createElement('button'); meet.type='button'; meet.className='r3-person-label'; meet.innerHTML='<span aria-hidden="true">'+ccIcon('bag')+'</span><b>Meet Bok</b>';
    meet.setAttribute('aria-label','Talk with Bok at the '+m.stall); labels.appendChild(meet);
    var practice=null;
    if(marker){ practice=document.createElement('button'); practice.type='button'; practice.className='r3-person-label r3-person-practice'; practice.innerHTML='<span aria-hidden="true">'+ccIcon(m.icon)+'</span><b>'+m.activity+'</b>'; practice.setAttribute('aria-label',m.activity+' in '+view.region.name); labels.appendChild(practice); }
    towns.forEach(function(t){
      var b=document.createElement('button'); b.type='button'; b.className='r3-person-label r3-person-practice'; b.innerHTML='<span aria-hidden="true">'+ccIcon(t.meta.icon)+'</span><b>Talk to '+esc(t.meta.name)+'</b>';
      b.setAttribute('aria-label','Talk to '+t.meta.name+', '+t.meta.place); labels.appendChild(b); t.button=b;
      b.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'town:'+t.meta.id); });
    });
    view.wrap.appendChild(labels);
    var guide=document.createElement('button'); guide.type='button'; guide.className='r3-person-guide'; guide.innerHTML=ccIcon('bag')+' <span>Meet Bok</span>'; guide.setAttribute('aria-label','Talk with Bok at the '+m.stall); view.wrap.appendChild(guide);
    meet.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'shop'); });
    guide.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'shop'); });
    if(practice) practice.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'activity'); });
    view.regionPeople={ root:root, actor:actor, arm:arm, shop:shop, marker:marker, markerSpace:markerSpace, towns:towns, labels:labels, meet:meet, practice:practice, guide:guide, focus:null, disposed:false,
      hitables:[actor,stall].concat(marker?[marker]:[],towns.map(function(t){ return t.object; })), sourceGeos:geos };
    if(typeof regionResidentLoad==='function') regionResidentLoad(view);
  }
  function regionPeopleTick(view,now){
    var p=view && view.regionPeople;
    if(p && p.introAudio && !regionPeopleIntroCurrent(view,p.introAudio)) regionPeopleIntroCancel(view);
    if(!p || p.disposed || view.parked || !view.wrap.isConnected) return;
    if(typeof regionResidentTick==='function') regionResidentTick(view,now);
    var panel=!!view.wrap.querySelector('.r3-panel'), busy=!!view.dice || !!view.leaving || !!view.moving;
    var compact=view.w<=600;
    p.guide.hidden=panel || busy || compact;
    var w=view.w,h=view.h;
    if(!p.uiRects || now-(p.uiAt||0)>350 || p.uiW!==w || p.uiH!==h || p.uiGuideHidden!==p.guide.hidden){
      if(p.uiW!==w || p.uiH!==h) Array.prototype.forEach.call(p.labels.children,function(b){ b.regionPeopleSize=null; });
      p.wrapRect=view.wrap.getBoundingClientRect();
      p.uiRects=[]; p.uiAt=now; p.uiW=w; p.uiH=h; p.uiGuideHidden=p.guide.hidden;
      var board=view.wrap.closest('.rb-root') || view.wrap;
      board.querySelectorAll('.rb-title,.rb-actions,.rb-guide,.r3-hud,.r3-voybtn,.r3-mapbtn,.r3-themebtn,.r3-musicbtn,.r3-gamesbtn,.r3-person-guide').forEach(function(el){
        if(!el.hidden && el.getClientRects().length) p.uiRects.push(el.getBoundingClientRect());
      });
    }
    var placed=[], wrapRect=p.wrapRect;
    function project(button,object){
      if(!button || !object) return;
      var b=object.userData.regionBounds, v=object.position.clone(); v.y+=b ? b.top+.2 : 2.2; v.project(view.cam);
      var x=(v.x+1)*w/2,y=(1-v.y)*h/2;
      var inFrame=x>0 && x<w;
      if(!button.regionPeopleSize && !button.hidden && button.offsetWidth)
        button.regionPeopleSize={w:button.offsetWidth,h:button.offsetHeight};
      var bw=button.regionPeopleSize ? button.regionPeopleSize.w : 130, bh=button.regionPeopleSize ? button.regionPeopleSize.h : 44;
      // One nearby resident action, docked above the phone's thumb controls.
      // Its existing button and accessible name still open that exact resident.
      if(compact){ x=w/2; y=h-86; }
      x=Math.max(13+bw/2,Math.min(w-13-bw/2,x));
      var rect={ left:x-bw/2, right:x+bw/2, top:y-bh, bottom:y };
      var show=!placed.length && !panel && !busy && inFrame && v.z>-1 && v.z<1 && (!compact || v.y>-1 && v.y<1) && rect.left>12 && rect.right<w-12 && rect.top>94 && rect.bottom<h-(compact?70:94) &&
        Math.hypot(object.position.x-view.guide.position.x,object.position.z-view.guide.position.z)<24;
      if(show) show=!p.uiRects.some(function(q){ return rect.left+wrapRect.left<q.right+6 && rect.right+wrapRect.left>q.left-6 && rect.top+wrapRect.top<q.bottom+6 && rect.bottom+wrapRect.top>q.top-6; });
      if(show) show=!placed.some(function(q){ return rect.left<q.right+8 && rect.right>q.left-8 && rect.top<q.bottom+8 && rect.bottom>q.top-8; });
      button.hidden=!show;
      if(show){ button.style.left=x+'px'; button.style.top=y+'px'; placed.push(rect); }
    }
    var candidates=[{button:p.meet,object:p.actor},{button:p.practice,object:p.marker}].concat(p.towns||[]).filter(function(t){ return t.object && t.button; });
    candidates.sort(function(a,b){
      var g=view.guide.position, da=Math.hypot(a.object.position.x-g.x,a.object.position.z-g.z), db=Math.hypot(b.object.position.x-g.x,b.object.position.z-g.z);
      return da-db;
    }).forEach(function(t){ project(t.button,t.object); });
    // One small idle actor, and only while Bok is in the active camera view.
    if(!p.meet.hidden && !(typeof reefCalm==='function' && reefCalm())){
      var t=now*.001; p.actor.position.y=(p.shop.y||0)+Math.sin(t*1.7)*.055;
      p.arm.rotation.z=Math.sin(t*2.1)*.16;
    }
  }
  function regionPeopleApproach(view,person){
    var p=view && view.regionPeople;
    if(!p || p.disposed || view.parked || view.moving || view.dice || view.leaving || view.wrap.querySelector('.r3-panel')) return false;
    var space=person==='shop'?p.shop:person==='activity'?p.markerSpace:null;
    if(typeof person==='string' && person.indexOf('town:')===0){
      var t=p.towns.find(function(x){ return x.meta.id===person.slice(5); });
      space=t && t.space;
    }
    if(!space) return false;
    if(view.at===space.i) return regionPeopleOpen(view,person);
    reef3dGoTo(view,space.i);
    return true;
  }
  // These are the activity's own first lines, never a second dialogue script.
  function regionPeopleOpening(region,activity){
    if(!activity) return null;
    var id=activity.id;
    if(region==='town' && typeof TOWN_FOLK!=='undefined'){
      var folk=TOWN_FOLK.find(function(f){ return f.id===id; });
      var line=folk && folk.nodes[folk.start] && folk.nodes[folk.start].t;
      if(line && line[0] && line[1]) return {ko:line[0],en:line[1],w:line[2]};
    }
    if(region==='beach' && typeof BB_BOTTLES!=='undefined'){
      var bottle=id==='letters' ? BB_BOTTLES[0] : BB_BOTTLES.find(function(b){ return b.id===id; });
      if(bottle && bottle.ko && bottle.en) return {ko:bottle.ko,en:bottle.en,w:bottle.w};
    }
    return null;
  }
  function regionPeopleIntroCurrent(view,audio){
    var p=view && view.regionPeople;
    return !!(p && !p.disposed && p.introAudio===audio && p.dialog===audio.panel &&
      audio.panel.isConnected && view.wrap.isConnected && view.encounter===audio.encounter &&
      view.encounter.phase==='intro' && regionEncounterActive(view));
  }
  function regionPeopleIntroCancel(view){
    var p=view && view.regionPeople, audio=p && p.introAudio;
    if(!audio) return;
    // Clear ownership before stop: speech can complete synchronously on cancel.
    p.introAudio=null; audio.generation++;
    var requested=audio.requested; audio.requested=false; audio.playing=false;
    audio.button.textContent='Listen'; audio.button.setAttribute('aria-label','Listen to the Korean opening line'); audio.button.setAttribute('aria-pressed','false');
    // A completed watchdog may still have a pending clip request, so retain
    // request ownership until close/stop. Navigation already stops speech at the route boundary. Never stop a new
    // lesson's audio if this old board is disposed after the new route renders.
    if(requested && view.encounter===audio.encounter && view.encounter.phase==='intro' &&
       typeof R3!=='undefined' && R3.view===view && S.view===audio.encounter.region &&
       S.profile && S.profile.id===audio.encounter.pid){
      try { Speech.stop(); } catch(e){}
    }
  }
  function regionPeopleIntroListen(view){
    var p=view && view.regionPeople, audio=p && p.introAudio;
    if(!audio || !regionPeopleIntroCurrent(view,audio)) return;
    if(audio.playing){
      audio.generation++; audio.requested=false; audio.playing=false;
      audio.button.textContent='Listen'; audio.button.setAttribute('aria-label','Listen to the Korean opening line'); audio.button.setAttribute('aria-pressed','false');
      audio.status.textContent='';
      try { Speech.stop(); } catch(e){}
      return;
    }
    if(!Sound.isEnabled()){ audio.status.textContent='Turn on sound to listen.'; return; }
    var generation=++audio.generation;
    audio.requested=true; audio.playing=true; audio.button.textContent='Stop'; audio.button.setAttribute('aria-label','Stop the Korean opening line'); audio.button.setAttribute('aria-pressed','true');
    audio.status.textContent='';
    function done(){
      if(audio.generation!==generation || !regionPeopleIntroCurrent(view,audio)) return;
      audio.playing=false; audio.button.textContent='Listen'; audio.button.setAttribute('aria-label','Listen to the Korean opening line'); audio.button.setAttribute('aria-pressed','false');
    }
    try { Speech.speakThen(audio.line.ko,done,null); } catch(e){ done(); if(regionPeopleIntroCurrent(view,audio)) audio.status.textContent='Try listening again.'; }
  }
  function regionPeopleOpen(view, person, forcedActivity){
    var p=view && view.regionPeople, m=view && view.region && REGION_PEOPLE[view.region.id];
    if(!p || p.disposed || view.parked || !view.wrap.isConnected || !m || view.dice || view.moving || view.leaving) return false;
    if(view.wrap.querySelector('.r3-panel')) return false;
    var from=document.activeElement;
    var townId=typeof person==='string' && person.indexOf('town:')===0 ? person.slice(5) : null;
    var town=(p.towns||[]).find(function(t){ return t.meta.id===townId; });
    if(townId && !town) return false;
    var activity=forcedActivity || (town ? town.space.item.d.regionActivity : person==='activity' && p.markerSpace && p.markerSpace.item && p.markerSpace.item.d.regionActivity);
    var host=activity ? regionPersonMeta(view.region,activity.id) : null;
    if(!regionEncounterBegin(view,{region:view.region.id,activity:activity || null,
      actor:town ? town.object : activity ? p.marker : p.actor,
      space:town ? town.space : activity ? p.markerSpace : p.shop})) return false;
    p.focus=from && view.wrap.contains(from) ? from : p.guide;
    // If an interrupted transition finished offscreen, settle it only when
    // the learner opens this resident again.
    if(town && town.skin && town.skin.pending && !document.hidden){
      town.skin.meshes.forEach(function(mesh){ mesh.attribute.array.set(mesh.palette[town.skin.mode]); mesh.attribute.needsUpdate=true; });
      town.skin.pending=false;
    }
    var title=host ? host.name : 'Bok the shopkeeper';
    var body=host ? host.intro : 'Welcome! I brought a few useful things for your travels. Come have a look.';
    var opening=regionPeopleOpening(view.region.id,activity);
    var text=opening ? '<p class="r3-person-text r3-person-opening"><strong lang="ko">'+esc(opening.ko)+'</strong><span>'+esc(opening.en)+'</span><small data-person-audio-status role="status" aria-live="polite"></small></p>' : '<p class="r3-person-text">'+esc(body)+'</p>';
    var first=activity ? '<button type="button" class="r3-btn main" data-person-practice>Talk and practice</button>' : '<button type="button" class="r3-btn main" data-person-shop>Browse goods</button><button type="button" class="r3-btn" data-person-about>About this place</button>';
    if(town && town.meta.id==='shop' && town.skin){
      var colorLabels={ natural:'Show camouflage', camouflage:'Show color display', display:'Show natural color' };
      first+='<button type="button" class="r3-btn" data-octopus-color>'+colorLabels[town.skin.mode]+'</button>';
    }
    if(view.region.id==='beach' && activity && p.marker && p.marker.userData.deliveryMotion) first+='<button type="button" class="r3-btn" data-jisu-delivery>Quick delivery</button>';
    if(opening) first+='<button type="button" class="r3-btn" data-person-listen aria-pressed="false" aria-label="Listen to the Korean opening line">Listen</button>';
    var portrait=host ? regionPersonPortrait(view.region,activity.id) : regionMerchantPortrait();
    var el=reef3dPanel(view,'r3-person-panel',portrait+'<h3 id="r3-person-title">'+esc(title)+'</h3>'+text+'<div class="r3-panel-row">'+first+'<button type="button" class="r3-btn" data-person-close>Close</button></div>');
    p.dialog=el;
    if(opening) p.introAudio={panel:el,encounter:view.encounter,line:opening,button:el.querySelector('[data-person-listen]'),status:el.querySelector('[data-person-audio-status]'),generation:0,playing:false,requested:false};
    el.setAttribute('aria-labelledby','r3-person-title');
    function restore(){ var f=p.focus; if(!regionEncounterActive(view) && f && f.isConnected) try{ f.focus({preventScroll:true}); }catch(e){} }
    function close(keep){ regionPeopleIntroCancel(view); regionPeopleReactionCancel(view, true); if(el.isConnected) el.remove(); if(p.dialog===el) p.dialog=null; if(!keep) regionEncounterEnd(view); requestAnimationFrame(restore); }
    el.addEventListener('click',function(e){
      if(e.target.closest('[data-person-listen]')) regionPeopleIntroListen(view);
      else if(e.target.closest('[data-person-close]')) close();
      else if(e.target.closest('[data-octopus-color]')){
        var btn=e.target.closest('[data-octopus-color]'), modes=['natural','camouflage','display'], next=(modes.indexOf(town.skin.mode)+1)%modes.length;
        regionOctopusSet(view,town.skin,modes[next]);
        btn.textContent=['Show camouflage','Show color display','Show natural color'][next];
      }
      else if(e.target.closest('[data-jisu-delivery]')) regionJisuDelivery(view,p.marker);
      else if(e.target.closest('[data-person-about]')){ el.querySelector('.r3-person-text').textContent=m.about; e.target.textContent='About this place'; }
      else if(e.target.closest('[data-person-shop]')){ close(true); reef3dShop(view,null,true); }
      else if(e.target.closest('[data-person-practice]')){ var a=activity; close(true); if(a) regionBoardLaunch(a); }
    });
    el.addEventListener('keydown',function(e){
      if(e.key==='Escape'){ e.preventDefault(); close(); }
      if(e.key==='Tab'){
        var bs=Array.prototype.slice.call(el.querySelectorAll('button:not([disabled])'));
        if(!bs.length) return;
        var i=bs.indexOf(document.activeElement);
        if(e.shiftKey && i<=0){ e.preventDefault(); bs[bs.length-1].focus(); }
        else if(!e.shiftKey && i===bs.length-1){ e.preventDefault(); bs[0].focus(); }
      }
    });
    return true;
  }
  function regionPeopleMeet(view,space,onContinue){
    if(!view || !view.region || !space) return false;
    var p=view.regionPeople; if(!p || p.disposed) return false;
    if(space.kind==='shop') return regionPeopleOpen(view,'shop');
    if(space.kind!=='deck' || !space.item || !space.item.d || !space.item.d.regionActivity) return false;
    var a=space.item.d.regionActivity, key=view.region.id==='town'?'town:'+a.id:'activity';
    return regionPeopleOpen(view,key,a);
  }
  // Called after a learning screen renders. Its one insert is idempotent, so it is safe
  // for both render hooks and a child-list observer. Town's chat owns its larger hero.
  function regionPeopleLessonSync(){
    var st=S.regionBoard, id=st && st.region, active=st && st.played && st.activity;
    if(!active || !REGION_PEOPLE[id] || id==='town' || !app || !app.isConnected) return;
    var screen={ lagoon:'lagoonRead',caves:'caves',patterns:'patterns',beach:'beach',light:'light',captain:'captain' }[id];
    if(S.view!==screen) return;
    var page=app.querySelector('.lg-read, .cv-page, .pr-page, .bb-page, .lh-page, .cd-page');
    if(!page || page.querySelector('.r3-person-lesson')) return;
    if(id==='caves' && (!S.caves || !S.caves.sec)) return;
    if(id==='patterns' && (!S.patterns || !S.patterns.id)) return;
    if(id==='beach' && (!S.beach || !S.beach.id)) return;
    if(id==='light' && (!S.light || S.light.view==='list')) return;
    var who=regionPersonMeta(id,active); if(!who) return;
    var hero=document.createElement('div'); hero.className='r3-person-lesson';
    hero.innerHTML=regionPersonPortrait(id,active)+'<span><b>With '+esc(who.name)+'</b><small>'+esc(who.place)+'</small></span>';
    page.insertBefore(hero,page.firstChild);
  }
  function regionPeopleDispose(view){
    var p=view && view.regionPeople; if(!p || p.disposed) return;
    regionPeopleIntroCancel(view);
    regionPeopleReactionCancel(view, false);
    if(typeof regionResidentDispose==='function') regionResidentDispose(view);
    p.disposed=true;
    if(p.dialog) p.dialog.remove();
    if(p.labels) p.labels.remove(); if(p.guide) p.guide.remove();
    if(p.root){
      view.scene.remove(p.root);
      var seen=new Set();
      p.root.traverse(function(o){ if(o.geometry && !seen.has(o.geometry)){ seen.add(o.geometry); o.geometry.dispose(); } });
      Object.keys(p.sourceGeos).forEach(function(k){ var g=p.sourceGeos[k]; if(!seen.has(g)){ seen.add(g); g.dispose(); } });
    }
    view.hitables=view.hitables.filter(function(o){ return p.hitables.indexOf(o)===-1; });
    p.focus=null; p.hitables.length=0;
    view.regionPeople=null;
  }
