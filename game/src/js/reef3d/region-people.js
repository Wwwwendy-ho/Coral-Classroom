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
    whale:1.3,beluga:1.18,'royal gramma':.9,shrimp:.65,seal:1.1,'sea turtle':1.05,nautilus:.72,cuttlefish:.85,'hermit crab':.42,jellyfish:1.05,walrus:1.4};
  function regionPeopleCacheBounds(actor){
    var T=window.THREE, box=new T.Box3().setFromObject(actor), size=new T.Vector3(), center=new T.Vector3();
    box.getSize(size); box.getCenter(center);
    var origin=actor.getWorldPosition(new T.Vector3());
    var bounds={ width:size.x, height:size.y, depth:size.z, centerX:center.x-origin.x,
      centerY:center.y-origin.y, centerZ:center.z-origin.z, top:box.max.y-origin.y,
      radius:Math.hypot(Math.max(Math.abs(box.min.x-origin.x),Math.abs(box.max.x-origin.x)),Math.max(Math.abs(box.min.z-origin.z),Math.abs(box.max.z-origin.z))) };
    actor.userData.regionBounds=bounds;
    if(typeof R3!=='undefined' && R3.view && R3.view.encounter && R3.view.encounter.actor===actor &&
       typeof regionEncounterSightline==='function' && typeof Promise==='function'){
      var v=R3.view;
      Promise.resolve().then(function(){ if(R3.view===v && v.encounter && !v.encounter.interior && v.encounter.actor===actor) regionEncounterSightline(v); });
    }
    return bounds;
  }
  function regionPeopleStartIndex(view){
    if(!view || !view.spaces || !view.spaces.length) return 0;
    if(typeof view.at==='number' && view.at>0 && view.at<view.spaces.length) return view.at;
    if(typeof reef3dPosition==='function' && view.region){
      try {
        var saved=reef3dPosition(view);
        if(saved!=null && saved>=0 && saved<view.spaces.length) return saved;
      } catch(e){}
    }
    return 0;
  }
  function regionPeopleCamAt(view,idx){
    if(!view || !window.THREE || !view.spaces || !view.spaces.loop || view.spaces.length<=2 || !view.region) return null;
    var T=window.THREE, mainN=view.spaces.mainN || view.spaces.length;
    var k=((idx%mainN)+mainN)%mainN;
    var cur=view.spaces[k] || view.spaces[0];
    var nxt=(typeof reef3dAhead==='function' ? reef3dAhead(view.spaces,k) : view.spaces[(k+1)%mainN]) || cur;
    var table=(typeof REEF3D_REGION_CAMERA==='object' && REEF3D_REGION_CAMERA) || {
      town:[6.0,10.4,4.6,1.35], lagoon:[6.2,10.8,4.8,1.35], caves:[5.5,9.4,4.2,1.25],
      patterns:[5.9,10.2,4.6,1.30], beach:[6.2,11.0,4.8,1.45], light:[4.2,9.5,5.4,2.20], captain:[5.7,9.8,4.2,1.25]
    };
    var set=table[view.region.id] || table.town;
    var dx=nxt.x-cur.x, dz=nxt.z-cur.z, L=Math.hypot(dx,dz) || 1, cy=cur.y||0, gy=cy-.3;
    var lookY=set[3]!=null ? (cy+set[3]) : (gy+.1);
    dx/=L; dz/=L;
    var cam=new T.PerspectiveCamera(42,1.6,.1,300);
    cam.position.set(cur.x-dx*set[1],gy+set[0],cur.z-dz*set[1]);
    cam.lookAt(cur.x+dx*set[2],lookY,cur.z+dz*set[2]);
    cam.updateMatrixWorld(true);
    return cam;
  }
  function regionPeopleActiveCam(view){
    if(!view || !view.cam || !window.THREE) return null;
    if(view.cam.position && view.cam.position.lengthSq()>.01) return view.cam;
    return regionPeopleCamAt(view,regionPeopleStartIndex(view)) || view.cam;
  }
  function regionPeopleObstacles(view){
    var out=[];
    if(view && Array.isArray(view._sceneryObstacles)){
      view._sceneryObstacles.forEach(function(o){
        if(o && typeof o.x==='number' && typeof o.z==='number') out.push({x:o.x,z:o.z,r:o.r||.8});
      });
    }
    if(view && Array.isArray(view.spaces)){
      view.spaces.forEach(function(t){
        if(t && t.obj && t.obj.position) out.push({x:t.obj.position.x,z:t.obj.position.z,r:.85});
      });
    }
    return out;
  }
  function regionPeopleObsPenalty(x,z,radius,obstacles,toCamX,toCamZ){
    if(!obstacles || !obstacles.length) return 0;
    var pen=0, hasCamDir=(toCamX || toCamZ) && (Math.abs(toCamX)>.05 || Math.abs(toCamZ-1)>.05);
    for(var i=0;i<obstacles.length;i++){
      var o=obstacles[i], or=o.r || .8, dx=o.x-x, dz=o.z-z;
      if(Math.hypot(dx,dz) < radius + or + .65) pen += 1500;
      if(dz > .1 && dz < 3.8 && Math.abs(dx) < radius + or + .45) pen += 1000;
      if(hasCamDir){
        var proj=dx*toCamX+dz*toCamZ, lat=Math.abs(dx*(-toCamZ)+dz*toCamX);
        if(proj > .1 && proj < 3.8 && lat < radius + or + .45) pen += 1000;
      }
    }
    return pen;
  }
  function regionPeopleLoopFrame(view,s){
    var sp=view.spaces, n=sp.mainN || sp.length, cx=0, cz=0;
    for(var i=0;i<n;i++){ cx+=sp[i].x; cz+=sp[i].z; }
    cx/=n; cz/=n;
    var idx=(s && typeof s.i==='number' && s.i<n) ? s.i : 0;
    var prev=sp[(idx+n-1)%n], next=sp[(idx+1)%n];
    var dx=next.x-prev.x, dz=next.z-prev.z, len=Math.hypot(dx,dz) || 1;
    var nx=-dz/len, nz=dx/len;
    if(nx*(s.x-cx)+nz*(s.z-cz)<0){ nx=-nx; nz=-nz; }
    return {cx:cx,cz:cz,nx:nx,nz:nz,tx:dx/len,tz:dz/len};
  }
  function regionPeopleInPoly(poly,x,z){
    var inside=false;
    for(var a=0,b=poly.length-1;a<poly.length;b=a++){
      var xi=poly[a][0], zi=poly[a][1], xj=poly[b][0], zj=poly[b][1];
      if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi) inside=!inside;
    }
    return inside;
  }
  function regionPeopleTrackPlaced(view,actor,space,x,z,r){
    if(!view) return;
    if(!Array.isArray(view._placedPeople)) view._placedPeople=[];
    for(var i=0;i<view._placedPeople.length;i++){
      var p=view._placedPeople[i];
      if((actor && p.actor===actor) || (!actor && space && p.space===space)){
        p.x=x; p.z=z; p.r=r||0; return;
      }
    }
    view._placedPeople.push({actor:actor||null,space:space||null,x:x,z:z,r:r||0});
  }
  function regionPeopleSyncShadow(actor){
    var sh=actor && actor.userData && actor.userData.contactShadow;
    if(!sh) return;
    var b=actor.userData.regionBounds;
    if(sh.userData && sh.userData.isFixedBasin){
      sh.position.x=actor.position.x+(b ? b.centerX : 0);
      sh.position.z=actor.position.z+(b ? b.centerZ : 0);
      return;
    }
    var cx=b ? b.centerX : 0, cz=b ? b.centerZ : 0;
    var yaw=typeof actor.userData.boardYaw==='number' ? actor.userData.boardYaw : 0;
    if(sh.userData && sh.userData.isWaterRipple){
      var cy=Math.cos(yaw), sy=Math.sin(yaw);
      if(typeof sh.userData.rippleFwd==='number'){
        sh.position.x=actor.position.x+cx+sh.userData.rippleFwd*sy;
        sh.position.z=actor.position.z+cz+sh.userData.rippleFwd*cy;
      } else {
        sh.position.x=actor.position.x+(cx*cy+cz*sy);
        sh.position.z=actor.position.z+(-cx*sy+cz*cy);
      }
      sh.rotation.y=yaw;
      var rs=sh.userData.rippleScale;
      if(rs){
        sh.scale.set(Array.isArray(rs)?rs[0]:rs,1,Array.isArray(rs)?rs[1]:rs);
      } else {
        sh.scale.set(b ? Math.max(.9,b.width*.68) : 1.2,1,b ? Math.max(1.0,b.depth*.58) : 1.5);
      }
      return;
    }
    var ss=sh.userData && sh.userData.shadowScale, sf=sh.userData && sh.userData.shadowFwd;
    if(ss || typeof sf==='number'){
      if(typeof sf==='number'){
        var cy2=Math.cos(yaw), sy2=Math.sin(yaw), lz=cz+sf;
        sh.position.x=actor.position.x+(cx*cy2+lz*sy2);
        sh.position.z=actor.position.z+(-cx*sy2+lz*cy2);
      } else {
        sh.position.x=actor.position.x+cx;
        sh.position.z=actor.position.z+cz;
      }
      sh.rotation.y=yaw;
      var sx2=ss ? (Array.isArray(ss)?ss[0]:ss) : (b ? Math.max(.72, Math.min(1.42, b.width*.58)) : 1.0);
      var sz2=ss ? (Array.isArray(ss)?ss[1]:ss) : (b ? Math.max(.72, Math.min(1.42, b.depth*.58)) : 1.0);
      if(b && sh.userData.shadowExpand){
        sx2=Math.max(sx2, Math.min(2.38, b.width*sh.userData.shadowExpand[0]));
        sz2=Math.max(sz2, Math.min(2.15, b.depth*sh.userData.shadowExpand[1]));
      }
      sh.scale.set(sx2,1,sz2);
      return;
    }
    var rx=b ? Math.max(.72, Math.min(1.42, b.width*.58)) : 1.0, rz=b ? Math.max(.72, Math.min(1.42, b.depth*.58)) : 1.0;
    sh.position.x=actor.position.x+cx;
    sh.position.z=actor.position.z+cz;
    sh.rotation.y=yaw;
    sh.scale.set(rx,1,rz);
  }
  // Choose the near side first, then move outward until the entire footprint
  // clears the surrounding tiles. The ray prefers the open central basin.
  function regionPeoplePlacement(view,space,bounds,basin,selfActor){
    var radius=bounds.radius || 0, start=Math.max(2.75,radius+1.35), preferred=space.x>=0?-1:1;
    var best=null, cam=regionPeopleActiveCam(view), dzs=cam ? [.18,-1.6,1.8,-3.2] : [.18], probe=null;
    if(cam && window.THREE) probe=new window.THREE.Vector3();
    else cam=null;
    var obstacles=regionPeopleObstacles(view);
    var toCamX=0, toCamZ=1;
    if(cam && cam.position && cam.position.lengthSq()>.01){
      var cdx=cam.position.x-space.x, cdz=cam.position.z-space.z, cL=Math.hypot(cdx,cdz)||1;
      toCamX=cdx/cL; toCamZ=cdz/cL;
    }
    var regionId=view && view.region && view.region.id;
    var actId=space && space.item && space.item.d && space.item.d.regionActivity && space.item.d.regionActivity.id;
    var isLoop=!!(view && view.spaces && view.spaces.loop && view.spaces.length>2);
    function minTileDist(x,z){
      var m=Infinity;
      view.spaces.forEach(function(tile){ m=Math.min(m,Math.hypot(tile.x-x,tile.z-z)); });
      return m;
    }
    function placedPenalty(x,z){
      if(!view || !Array.isArray(view._placedPeople)) return 0;
      var pen=0;
      for(var i=0;i<view._placedPeople.length;i++){
        var p=view._placedPeople[i];
        if(!p || (selfActor && p.actor===selfActor) || (!selfActor && p.space && p.space===space)) continue;
        if(Math.hypot(x-p.x,z-p.z) < radius + (p.r || 0) + 2.2) pen += 2000;
      }
      return pen;
    }
    // CRIT-1: Enforce strict >= 3.4u horizontal clearance from every '?' cube space (s.qb / surprise tile)
    // so no Harbor Town street resident ever collides with or gets swallowed by a floating '?' cube.
    var qCubeSpaces=[];
    if(view && Array.isArray(view.spaces)){
      view.spaces.forEach(function(qs){
        if(!qs || (!qs.qb && qs.kind!=='surprise')) return;
        qCubeSpaces.push({x:qs.x,z:qs.z,y:qs.y||0});
        if(qs.qb && qs.qb.position && Math.hypot(qs.qb.position.x-qs.x,qs.qb.position.z-qs.z)>.05){
          qCubeSpaces.push({x:qs.qb.position.x,z:qs.qb.position.z,y:qs.qb.position.y||0});
        }
      });
    }
    var qCubeMinDist=3.4;
    function qCubePenalty(x,z){
      var pen=0;
      for(var qi=0;qi<qCubeSpaces.length;qi++){
        var q=qCubeSpaces[qi], d=Math.hypot(x-q.x,z-q.z);
        if(d<qCubeMinDist) pen+=25000+(qCubeMinDist-d)*12000;
      }
      return pen;
    }
    function evalPoint(x,z,side,baseCost,ndcLimits){
      var min=minTileDist(x,z);
      var deficit=Math.max(0,radius+1.25-min);
      var shopPenalty=(view && view._shopPos && Math.hypot(view._shopPos.x-x,view._shopPos.z-z)<4.2) ? 2000 : 0;
      var obsPenalty=regionPeopleObsPenalty(x,z,radius,obstacles,toCamX,toCamZ);
      var peoplePenalty=placedPenalty(x,z);
      var qPenalty=qCubePenalty(x,z);
      var camPenalty=0;
      if(cam){
        probe.set(x,(space.y||0)+(bounds.centerY||0),z).project(cam);
        var nx=probe.x, ny=probe.y;
        if(ndcLimits){
          if(Math.abs(nx)>ndcLimits.mx || ny>ndcLimits.maxY || ny<ndcLimits.minY || probe.z<-1 || probe.z>1) camPenalty+=2000;
        } else {
          if(Math.abs(nx)>.72 || ny>.55 || ny<-.68 || probe.z<-1 || probe.z>1) camPenalty+=300;
          if(ny>.35 && Math.abs(nx)>.5) camPenalty+=300;
        }
      }
      var score=deficit*8000+shopPenalty+obsPenalty+peoplePenalty+qPenalty+camPenalty+baseCost;
      return {x:x,z:z,side:side,score:score,clean:!deficit && !shopPenalty && !obsPenalty && !peoplePenalty && !qPenalty && !camPenalty};
    }
    function horizObsPen(x,z,rad,list,margin,weight){
      var pen=0, m=margin==null?.55:margin, w=weight||1500;
      for(var i=0;i<list.length;i++){
        var o=list[i], or=o.r||.8;
        if(Math.hypot(o.x-x,o.z-z) < rad+or+m) pen+=w;
      }
      return pen;
    }
    function camBackAz(c,px,pz,fallback){
      if(c && c.position && c.position.lengthSq()>.01){
        if(c.matrixWorld && c.matrixWorld.elements){
          var e=c.matrixWorld.elements;
          if(Math.hypot(e[8],e[10])>.01) return Math.atan2(e[8],e[10]);
        }
        return Math.atan2(c.position.x-px,c.position.z-pz);
      }
      return fallback;
    }
    // Harbor Town Whale (M6 / MIN 8): seated naturally in open foreground-left turquoise basin water
    // so the ENTIRE whale (snout, bellhop hat, flippers & crescent fluke) sits comfortably inside screenPx X >= 95..320
    // on both 02-harbor-town (pharmacy view) & hotel view, strictly upright (roll = 0) and clear of seawall, ferry, boats & piers.
    if(isLoop && regionId==='town' && actId==='hotel'){
      var hf=regionPeopleLoopFrame(view,space), nMain=view.spaces.mainN || view.spaces.length;
      var hotelCam=regionPeopleCamAt(view,space.i) || cam;
      var pharmSpace=view.spaces.find(function(s){ return s && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id==='pharmacy'; });
      // Build exact live board.js follow camera (lookY = cy + 0.3 + set[3]) at the pharmacy opening space.
      var pharmCam=null;
      if(pharmSpace && window.THREE){
        var pCur=pharmSpace, pNxt=(typeof reef3dAhead==='function' ? reef3dAhead(view.spaces,pCur.i) : view.spaces[(pCur.i+1)%nMain]) || pCur;
        var pdx0=pNxt.x-pCur.x, pdz0=pNxt.z-pCur.z, pLen0=Math.hypot(pdx0,pdz0)||1;
        var pTab=(typeof REEF3D_REGION_CAMERA==='object' && REEF3D_REGION_CAMERA && REEF3D_REGION_CAMERA.town) || [6.0,10.4,4.6,1.35];
        pharmCam=new window.THREE.PerspectiveCamera(42,1.6,.1,300);
        pharmCam.position.set(pCur.x-pdx0/pLen0*pTab[1],(pCur.y||0)-.3+pTab[0],pCur.z-pdz0/pLen0*pTab[1]);
        pharmCam.lookAt(pCur.x+pdx0/pLen0*pTab[2],(pCur.y||0)+.3+(pTab[3]!=null?pTab[3]:1.35),pCur.z+pdz0/pLen0*pTab[2]);
        pharmCam.updateMatrixWorld(true);
      }
      var frameCam=pharmCam || hotelCam || cam;
      var pierOBBs=[], hotelPierBoxes=[], seawallPoly=[];
      for(var pr=0;pr<nMain;pr++){
        var ps=view.spaces[pr], pf=regionPeopleLoopFrame(view,ps);
        // Exact water-facing inner edge of the beveled stone seawall coping blocks (4.02 + 0.24 = 4.26).
        seawallPoly.push([ps.x-pf.nx*4.26,ps.z-pf.nz*4.26]);
        if(pr>=2 && pr%5===2){
          var ppx=ps.x-pf.nx*5.2, ppz=ps.z-pf.nz*5.2;
          // Only guard wooden piers that were actually built by region-scenery.js (r = 1.55 in _sceneryObstacles).
          var pierExists=obstacles.some(function(o){ return o.r && Math.abs(o.r-1.55)<.05 && Math.hypot(o.x-ppx,o.z-ppz)<2.2; });
          if(pierExists){
            pierOBBs.push({x:ppx,z:ppz,nx:pf.nx,nz:pf.nz,tx:pf.tx,tz:pf.tz,halfL:2.25,halfW:1.05});
            if(frameCam && probe && Math.hypot(ppx-space.x,ppz-space.z)<20){
              var pMinX=1e9, pMaxX=-1e9, pMinY=1e9, pMaxY=-1e9, inFront=false;
              [-2.15,2.15].forEach(function(dl){ [-.9,.9].forEach(function(dw){ [-.27,.72].forEach(function(py){
                probe.set(ppx+pf.nx*dl+pf.tx*dw,py,ppz+pf.nz*dl+pf.tz*dw).project(frameCam);
                if(probe.z>-1 && probe.z<1) inFront=true;
                var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
                if(sx<pMinX) pMinX=sx; if(sx>pMaxX) pMaxX=sx;
                if(sy<pMinY) pMinY=sy; if(sy>pMaxY) pMaxY=sy;
              }); }); });
              if(inFront && pMaxX>0 && pMinX<1024 && pMaxY>0 && pMinY<640) hotelPierBoxes.push({minX:pMinX,maxX:pMaxX,minY:pMinY,maxY:pMaxY});
            }
          }
        }
      }
      function distSeawall(x,z){
        var md=1e9;
        for(var si=0;si<seawallPoly.length;si++){
          var a=seawallPoly[si], b=seawallPoly[(si+1)%seawallPoly.length];
          var vx=b[0]-a[0], vz=b[1]-a[1], t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1)));
          var d=Math.hypot(x-(a[0]+vx*t),z-(a[1]+vz*t));
          if(d<md) md=d;
        }
        return md;
      }
      var ferryObsH=obstacles.filter(function(o){ return o.r && o.r>=2.0; });
      var ferryCenter=ferryObsH.length ? ferryObsH[0] : null;
      var nonFerryObs=obstacles.filter(function(o){ return !(o.r && o.r>=2.0); });
      var wMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
      var waterYOff=-1.22-wMinY-(space.y||0);
      // Anatomical whale silhouette envelope for v34 0.85x board model (~1.96w x 3.35l, snout +Z, flukes -Z).
      var wHalfX=Math.min(1.00,Math.max(.82,(bounds.width||1.96)*.5));
      var wHalfZ=Math.min(1.68,Math.max(1.25,(bounds.depth||3.35)*.5));
      var wTopY=Math.min(.52,(bounds.top||1.45)+waterYOff);
      var wBotY=wMinY+waterYOff;
      var wMidY=wBotY+(wTopY-wBotY)*.62;
      var wYawRef=camBackAz(frameCam,space.x+7.4,space.z-4.7,-1.53)+.21;
      var wCy=Math.cos(wYawRef), wSy=Math.sin(wYawRef);
      // Match resident-models.js fitAnchor: GLB center sits at actor.pos + unrotated (centerX, centerZ).
      var wOffX=bounds.centerX||0, wOffZ=bounds.centerZ||0;
      var hullPts=[
        [0,wHalfZ*.98],[wHalfX*.58,wHalfZ*.55],[-wHalfX*.58,wHalfZ*.55],
        [wHalfX*.96,wHalfZ*.10],[-wHalfX*.96,wHalfZ*.10],
        [wHalfX*.58,-wHalfZ*.98],[-wHalfX*.58,-wHalfZ*.98]
      ];
      for(var inDist=4.5;inDist<=7.0;inDist+=.10){
        for(var along=4.2;along<=9.2;along+=.12){
          var wx=space.x-hf.nx*inDist+hf.tx*along, wz=space.z-hf.nz*inDist+hf.tz*along;
          var wcx=wx+wOffX, wcz=wz+wOffZ;
          var min=minTileDist(wx,wz), deficit=Math.max(0,radius+1.25-min);
          var shopPenalty=(view && view._shopPos && Math.hypot(view._shopPos.x-wx,view._shopPos.z-wz)<4.2) ? 2000 : 0;
          var obsPen=horizObsPen(wcx,wcz,radius*.64,nonFerryObs,.40,2800);
          var ferryPen=0;
          if(ferryCenter){
            var fyaw=(view && typeof view._ferryYaw==='number') ? view._ferryYaw : -.38;
            var fcy=Math.cos(fyaw), fsy=Math.sin(fyaw);
            for(var fi4=0;fi4<hullPts.length;fi4++){
              var hpx4=wcx+hullPts[fi4][0]*wCy+hullPts[fi4][1]*wSy;
              var hpz4=wcz-hullPts[fi4][0]*wSy+hullPts[fi4][1]*wCy;
              var frx=hpx4-ferryCenter.x, frz=hpz4-ferryCenter.z;
              var flx=frx*fcy-frz*fsy, flz=frx*fsy+frz*fcy;
              var fDist=Math.hypot(Math.max(0,Math.abs(flx)-1.26),Math.max(0,Math.abs(flz)-2.72));
              if(fDist<.95){ ferryPen+=4500+(.95-fDist)*2000; break; }
            }
          }
          var swPen=0;
          if(!regionPeopleInPoly(seawallPoly,wcx,wcz)) swPen+=6000;
          else {
            var minSw=distSeawall(wcx,wcz);
            if(minSw<1.80) swPen+=3200+(1.80-minSw)*2500;
            // Verify all anatomical hull points stay strictly inside the 4.26 stone seawall coping.
            for(var ci=0;ci<hullPts.length;ci++){
              var cxw=wcx+hullPts[ci][0]*wCy+hullPts[ci][1]*wSy;
              var czw=wcz-hullPts[ci][0]*wSy+hullPts[ci][1]*wCy;
              if(!regionPeopleInPoly(seawallPoly,cxw,czw)) swPen+=4500;
              else {
                var cSw=distSeawall(cxw,czw);
                if(cSw<.85) swPen+=2600+(.85-cSw)*3000;
              }
            }
          }
          var pierPen=0;
          for(var pi2=0;pi2<pierOBBs.length;pi2++){
            var pb=pierOBBs[pi2], pdx=wcx-pb.x, pdz=wcz-pb.z;
            var aL=Math.abs(pdx*pb.nx+pdz*pb.nz), aW=Math.abs(pdx*pb.tx+pdz*pb.tz);
            var pDist=Math.hypot(Math.max(0,aL-pb.halfL),Math.max(0,aW-pb.halfW));
            if(pDist<1.75) pierPen+=4500;
            else if(pDist<2.05) pierPen+=650;
          }
          var pplPen=placedPenalty(wx,wz);
          var camPen=0;
          if(frameCam && probe){
            var sMinX=1e9, sMaxX=-1e9, sMinY=1e9, sMaxY=-1e9, badZ=false;
            for(var hi2=0;hi2<hullPts.length;hi2++){
              var lx=hullPts[hi2][0], lz=hullPts[hi2][1];
              for(var iy=0;iy<2;iy++){
                var ly=iy?wMidY:wBotY;
                probe.set(wcx+lx*wCy+lz*wSy,(space.y||0)+ly,wcz-lx*wSy+lz*wCy).project(frameCam);
                if(probe.z<-1 || probe.z>1) badZ=true;
                var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
                if(sx<sMinX) sMinX=sx; if(sx>sMaxX) sMaxX=sx;
                if(sy<sMinY) sMinY=sy; if(sy>sMaxY) sMaxY=sy;
              }
            }
            // Project bellhop hat crown explicitly.
            probe.set(wcx+(wHalfZ*.22)*wSy,(space.y||0)+wTopY,wcz+(wHalfZ*.22)*wCy).project(frameCam);
            if(probe.z<-1 || probe.z>1) badZ=true;
            var hxC=(probe.x+1)*512, hyC=(1-probe.y)*320;
            if(hxC<sMinX) sMinX=hxC; if(hxC>sMaxX) sMaxX=hxC;
            if(hyC<sMinY) sMinY=hyC; if(hyC>sMaxY) sMaxY=hyC;
            // Keep ENTIRE whale (snout, bellhop hat, flippers & tail) comfortably inside screenPx X >= 245..350 & below ferry hull (Y >= 438..595).
            if(badZ || sMinX<245 || sMaxX>350 || sMinY<438 || sMaxY>595) camPen+=3800;
            if(sMinX<252) camPen+=(252-sMinX)*2.0;
            if(sMinY<442) camPen+=(442-sMinY)*2.5;
            for(var hb=0;hb<hotelPierBoxes.length;hb++){
              var hpb=hotelPierBoxes[hb];
              if(sMaxX>hpb.minX-24 && sMinX<hpb.maxX+24 && sMaxY>hpb.minY-24 && sMinY<hpb.maxY+24){
                camPen+=4000; break;
              }
            }
            for(var fhi=0;fhi<ferryObsH.length;fhi++){
              var fho=ferryObsH[fhi], fhMinX=1e9, fhMaxX=-1e9, fhMinY=1e9, fhMaxY=-1e9, fhIn=false;
              [-fho.r*.85,fho.r*.85].forEach(function(fdx){ [-fho.r*.85,fho.r*.85].forEach(function(fdz){ [-.58,3.45].forEach(function(fpy){
                probe.set(fho.x+fdx,fpy,fho.z+fdz).project(frameCam);
                if(probe.z>-1 && probe.z<1) fhIn=true;
                var fsx=(probe.x+1)*512, fsy=(1-probe.y)*320;
                if(fsx<fhMinX) fhMinX=fsx; if(fsx>fhMaxX) fhMaxX=fsx;
                if(fsy<fhMinY) fhMinY=fsy; if(fsy>fhMaxY) fhMaxY=fsy;
              }); }); });
              if(fhIn && sMaxX>fhMinX-24 && sMinX<fhMaxX+24 && sMaxY>fhMinY-24 && sMinY<fhMaxY+24){
                camPen+=5000; break;
              }
            }
            if(hotelCam && hotelCam!==frameCam){
              probe.set(wcx,(space.y||0)+(bounds.centerY||0)+waterYOff,wcz).project(hotelCam);
              var hpx=(probe.x+1)*512, hpy=(1-probe.y)*320;
              if(probe.z<-1 || probe.z>1 || hpx<110 || hpx>420 || hpy<220 || hpy>530) camPen+=1600;
            }
          }
          var spotBias=Math.hypot(wx-(-15.10),wz-6.30)*.8;
          var score=deficit*8000+shopPenalty+obsPen+ferryPen+swPen+pierPen+pplPen+qCubePenalty(wx,wz)+camPen+spotBias;
          if(!best || score<best.score) best={x:wx,z:wz,side:-1,score:score,boardPitch:0,boardYOffset:waterYOff};
        }
      }
      if(best){
        var wCamAz=camBackAz(frameCam,best.x,best.z,-1.53);
        best.boardYaw=wCamAz+.54;
        return best;
      }
    }
    // Harbor Town Subway Ray (MIN 7): glide at waterY = -0.64 with a waterline ripple ring in wide-open western
    // turquoise basin water right beside sp[18], with strict 3D and 2D sightline separation from the coastal ferry wheelhouse.
    if(isLoop && regionId==='town' && actId==='subway'){
      var sf=regionPeopleLoopFrame(view,space), rMain=view.spaces.mainN || view.spaces.length;
      var subCam=regionPeopleCamAt(view,space.i) || cam;
      var pharmSpaceS=view.spaces.find(function(s){ return s && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id==='pharmacy'; });
      var pharmCamS=pharmSpaceS ? regionPeopleCamAt(view,pharmSpaceS.i) : null;
      var rayPiers=[], basinPoly=[];
      for(var ri=0;ri<rMain;ri++){
        var rs=view.spaces[ri], rf=regionPeopleLoopFrame(view,rs);
        basinPoly.push([rs.x-rf.nx*6.15,rs.z-rf.nz*6.15]);
        if(ri>=2 && ri%5===2){
          var rpx=rs.x-rf.nx*5.2, rpz=rs.z-rf.nz*5.2;
          if(obstacles.every(function(o){ return Math.hypot(o.x-rpx,o.z-rpz)>2.0; })) rayPiers.push({x:rpx,z:rpz,r:1.55});
        }
      }
      var rayObs=obstacles.concat(rayPiers);
      var ferryObsS=obstacles.filter(function(o){ return o.r && o.r>=2.0; });
      function buildFerry2D(c){
        if(!c || !probe || !ferryObsS.length) return null;
        var fmX0=1e9, fmX1=-1e9, fmY0=1e9, fmY1=-1e9, anyIn=false;
        ferryObsS.forEach(function(fo){
          [-fo.r*.85,fo.r*.85].forEach(function(dx){ [-fo.r*.85,fo.r*.85].forEach(function(dz){ [-.58,3.45].forEach(function(py){
            probe.set(fo.x+dx,py,fo.z+dz).project(c);
            if(probe.z>-1 && probe.z<1) anyIn=true;
            var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
            if(sx<fmX0) fmX0=sx; if(sx>fmX1) fmX1=sx; if(sy<fmY0) fmY0=sy; if(sy>fmY1) fmY1=sy;
          }); }); });
        });
        return anyIn ? {cam:c,minX:fmX0,maxX:fmX1,minY:fmY0,maxY:fmY1} : null;
      }
      var ferryBoxes=[];
      [subCam,pharmCamS,cam].forEach(function(c){
        if(!c || ferryBoxes.some(function(fb){ return fb.cam===c; })) return;
        var fb=buildFerry2D(c); if(fb) ferryBoxes.push(fb);
      });
      var rMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
      var rayYOff=-.52-rMinY;
      for(var gx=-11.5;gx<=11.5;gx+=.5){
        for(var gz=-7.5;gz<=7.5;gz+=.25){
          var rx2=sf.cx+gx, rz2=sf.cz+gz;
          if(!regionPeopleInPoly(basinPoly,rx2,rz2)) continue;
          var minR=minTileDist(rx2,rz2), defR=Math.max(0,radius+1.25-minR);
          var shpR=(view && view._shopPos && Math.hypot(view._shopPos.x-rx2,view._shopPos.z-rz2)<4.2) ? 2000 : 0;
          var obsR=horizObsPen(rx2,rz2,radius*.58,rayObs,.45,2800);
          // Strict 3D separation from coastal ferry so subway-ray never hugs or hides behind the wheelhouse.
          for(var fi3=0;fi3<ferryObsS.length;fi3++){
            var fo3=ferryObsS[fi3];
            if(Math.hypot(rx2-fo3.x,rz2-fo3.z)<radius*.72+fo3.r+1.4) obsR+=9000;
          }
          var pplR=placedPenalty(rx2,rz2);
          var camR=0, targetBias=Math.hypot(rx2-space.x,rz2-space.z)*.35;
          var ryMid=(space.y||0)+(bounds.centerY||0)+rayYOff;
          // Reject any 2D screen overlap with the ferry wheelhouse/hull across active, opening & own cameras (strictly > offscreen 4000).
          for(var fbi=0;fbi<ferryBoxes.length;fbi++){
            var fb2=ferryBoxes[fbi];
            probe.set(rx2,ryMid,rz2).project(fb2.cam);
            if(probe.z>-1 && probe.z<1){
              var fpx=(probe.x+1)*512, fpy=(1-probe.y)*320;
              if(fpx+96>fb2.minX-16 && fpx-96<fb2.maxX+16 && fpy+64>fb2.minY-24 && fpy-64<fb2.maxY+16){
                camR+=12000; break;
              }
            }
          }
          if(subCam && probe){
            probe.set(rx2,ryMid,rz2).project(subCam);
            if(probe.z<-1 || probe.z>1 || probe.x<-.78 || probe.x>.68 || probe.y<-.62 || probe.y>.49) camR+=4000;
            else if((probe.x<-.44 && probe.y>.46) || (probe.x<-.68 && probe.y>.30) || (probe.x<-.66 && probe.y<-.68)) camR+=3200;
            else targetBias+=Math.hypot(probe.x-(-.48),probe.y-(-.26))*2.5;
          }
          var scR=defR*8000+shpR+obsR+pplR+qCubePenalty(rx2,rz2)+camR+targetBias;
          if(!best || scR<best.score) best={x:rx2,z:rz2,side:-1,score:scR};
        }
      }
      if(best){
        best.boardYaw=(subCam && subCam.position && subCam.position.lengthSq()>.01) ? Math.atan2(subCam.position.x-best.x,subCam.position.z-best.z)*.62 : -.75;
        best.boardYOffset=rayYOff;
        return best;
      }
    }
    // Harbor Town Friend Seal (CRIT-2 / iter19 M1): squarely on flat sunlit cobblestones strictly inside the -0.070 stone quay curb,
    // turned to a cheerful 3/4 view so belly rests ON cobblestones (minY >= -0.314), flippers sit below the scarf, and contact shadow reads clearly.
    if(isLoop && regionId==='town' && actId==='friend'){
      var fMain=view.spaces.mainN || view.spaces.length;
      var pierAnchors=[];
      for(var fp=2;fp<fMain;fp+=5){
        var fps=view.spaces[fp];
        pierAnchors.push({s:fps,d:Math.hypot(fps.x-space.x,fps.z-space.z)});
      }
      pierAnchors.sort(function(a,b){ return a.d-b.d; });
      pierAnchors.slice(0,1).forEach(function(pa,pai){
        var ps=pa.s, pf=regionPeopleLoopFrame(view,ps);
        var pierMidX=ps.x-pf.nx*5.2, pierMidZ=ps.z-pf.nz*5.2;
        // Keep all real obstacles (ferry, boats, bollards, planters) + pier crate/barrel center.
        var sealObs=obstacles.filter(function(o){ return Math.hypot(o.x-pierMidX,o.z-pierMidZ)>=2.4; });
        sealObs.push({x:pierMidX,z:pierMidZ,r:.95});
        // Pull Sua inward onto flat sunlit cobblestones clear of the quay rail & ferry bow.
        [-1.50,-1.60,-1.70,-1.80].forEach(function(outD,oi){
          [-1.40,-1.28,-1.52,1.40,1.25].forEach(function(along,ai){
            var fx=ps.x+pf.nx*outD+pf.tx*along, fz=ps.z+pf.nz*outD+pf.tz*along;
            var minF=minTileDist(fx,fz), defF=Math.max(0,2.34-minF);
            var shpF=(view && view._shopPos && Math.hypot(view._shopPos.x-fx,view._shopPos.z-fz)<4.2) ? 2000 : 0;
            var obsF=horizObsPen(fx,fz,radius*.62,sealObs,.35);
            for(var foi=0;foi<sealObs.length;foi++){
              var fop=sealObs[foi];
              if(fop.r>=2.0 && Math.hypot(fx-fop.x,fz-fop.z)<fop.r+1.8) obsF+=2400;
            }
            var pplF=placedPenalty(fx,fz);
            var camF=0;
            if(cam){
              probe.set(fx,(space.y||0)+(bounds.centerY||0),fz).project(cam);
              if(probe.z<-1 || probe.z>1 || Math.abs(probe.x)>.78 || probe.y>.56 || probe.y<-.60) camF+=1200;
            }
            var scF=defF*8000+shpF+obsF+pplF+qCubePenalty(fx,fz)+camF+pai*12+oi*.45+ai*.35;
            if(!best || scF<best.score) best={x:fx,z:fz,side:-1,score:scF};
          });
        });
      });
      if(best){
        var fStartCam=regionPeopleCamAt(view,regionPeopleStartIndex(view)) || cam;
        best.boardYaw=(fStartCam && fStartCam.position) ? Math.atan2(fStartCam.position.x-best.x,fStartCam.position.z-best.z)+0.16 : -.4;
        var fMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        // Seat Friend Seal's belly solidly on -0.314 Harbor Town cobblestones (compensating for space.y & GLB root offset).
        best.boardYOffset=-.415-fMinY-(space.y||0);
        return best;
      }
    }
    // Harbor Town Pharmacist Shrimp (M2 / iter18 M3): nudged inward off the raised white street curb onto flat sunlit cobblestones,
    // turned to a clear 3/4 side-profile facing Shelly & the path with gentle upward boardPitch so the 5 coral-banded carapace segments,
    // 6 walking legs, fanned 5-petal tail, and gripped emerald bottle read clearly from the overhead 02-harbor-town camera.
    if(isLoop && regionId==='town' && actId==='pharmacy'){
      var pf2=regionPeopleLoopFrame(view,space);
      [1.72,1.82,1.92,1.62,1.52].forEach(function(outDist,di){
        [1.55,1.35,1.75,1.15,1.95].forEach(function(along,ai){
          var px=space.x+pf2.nx*outDist+pf2.tx*along, pz=space.z+pf2.nz*outDist+pf2.tz*along;
          var curbPen=(Math.abs(outDist-3.05)<1.25 || outDist>2.05) ? 2800 : 0;
          var cand=evalPoint(px,pz,1,di*.45+ai*.2+curbPen,{mx:.68,minY:-.60,maxY:.45});
          if(!best || cand.score<best.score) best=cand;
        });
      });
      if(best){
        var phCam=regionPeopleCamAt(view,space.i) || cam;
        var phCamAz=camBackAz(phCam,best.x,best.z,-1.65);
        best.boardPitchYaw=phCamAz;
        best.boardYaw=phCamAz-.10;
        best.boardPitch=-.35;
        var pMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        best.boardYOffset=-.28-pMinY-(space.y||0);
        // m6: Shift "Talk to Pharmacist" outward along street normal onto open cobblestones clear of the clipboard tile edge.
        best.labelOffset={x:pf2.nx*1.15,y:.10,z:pf2.nz*1.15};
        return best;
      }
    }
    // Harbor Town Street Residents (C1, M3, m14): keep cafe, restaurant, shop & taxi solidly on sunlit cobblestones
    // strictly outside the harbor basin, shop facades, striped awning overhangs, planters & market-stall poles.
    if(isLoop && regionId==='town' && (actId==='cafe' || actId==='restaurant' || actId==='shop' || actId==='taxi')){
      var stF=regionPeopleLoopFrame(view,space), stMain=view.spaces.mainN || view.spaces.length, stBasin=[];
      var stDecks=view.spaces.filter(function(s){ return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity; });
      function stOuterClear(x,z,g){
        for(var oi=0;oi<view.spaces.length;oi++) if(Math.hypot(x-view.spaces[oi].x,z-view.spaces[oi].z)<g) return false;
        return true;
      }
      function stNearDeck(x,z,d){
        for(var di2=0;di2<stDecks.length;di2++) if(Math.hypot(x-stDecks[di2].x,z-stDecks[di2].z)<d) return true;
        return false;
      }
      function obbSep2D(a,b){
        var axes=[[a.ux,a.uz],[a.vx,a.vz],[b.ux,b.uz],[b.vx,b.vz]], dx=b.cx-a.cx, dz=b.cz-a.cz, m=-1e9;
        for(var i=0;i<4;i++){
          var ax=axes[i][0], az=axes[i][1];
          var ra=a.hx*Math.abs(a.ux*ax+a.uz*az)+a.hz*Math.abs(a.vx*ax+a.vz*az);
          var rb=b.hx*Math.abs(b.ux*ax+b.uz*az)+b.hz*Math.abs(b.vx*ax+b.vz*az);
          var s=Math.abs(dx*ax+dz*az)-ra-rb;
          if(s>m) m=s;
        }
        return m;
      }
      function obbPtDist(obb,px,pz){
        var dx=px-obb.cx, dz=pz-obb.cz;
        var lx=Math.abs(dx*obb.ux+dz*obb.uz), lz=Math.abs(dx*obb.vx+dz*obb.vz);
        return Math.hypot(Math.max(0,lx-obb.hx),Math.max(0,lz-obb.hz));
      }
      var ab=(bounds && bounds.width && bounds.depth) ? bounds : (selfActor && selfActor.userData && selfActor.userData.regionBounds) || bounds;
      var halfW=(ab && ab.width) ? ab.width*.5 : radius, halfD=(ab && ab.depth) ? ab.depth*.5 : radius;
      var offX=(ab && ab.centerX) || 0, offZ=(ab && ab.centerZ) || 0;
      var actorH=(ab && ab.height) || 1.9, actorTop=(ab && ab.top) || actorH;
      function makeActorObb(x,z,yaw){
        var cy=Math.cos(yaw), sy=Math.sin(yaw);
        return {cx:x+offX*cy+offZ*sy,cz:z-offX*sy+offZ*cy,ux:cy,uz:-sy,vx:sy,vz:cy,hx:halfW,hz:halfD};
      }
      // Reconstruct exact world-space OBBs for Harbor Town shop facades, striped awning overhangs, planters, stalls & street props.
      var townOBBs=[], stShopCenters=[], stStallCenters=[], ownAwning=null;
      for(var sbi=0;sbi<stMain;sbi++){
        var sbs=view.spaces[sbi], sbf=regionPeopleLoopFrame(view,sbs);
        stBasin.push([sbs.x-sbf.nx*2.9,sbs.z-sbf.nz*2.9]);
        var fRot=Math.atan2(-sbf.nx,-sbf.nz), ux=Math.cos(fRot), uz=-Math.sin(fRot), vx=Math.sin(fRot), vz=Math.cos(fRot);
        if(sbi%3===1){
          var bpx=sbs.x+sbf.nx*7.5, bpz=sbs.z+sbf.nz*7.5;
          if(stOuterClear(bpx,bpz,4.4)){
            stShopCenters.push([bpx,bpz]);
            townOBBs.push({cx:bpx,cz:bpz,ux:ux,uz:uz,vx:vx,vz:vz,hx:2.15,hz:2.15});
            var awn={cx:bpx+vx*2.57,cz:bpz+vz*2.57,ux:ux,uz:uz,vx:vx,vz:vz,hx:1.12,hz:.48};
            townOBBs.push(awn);
            if(sbi===space.i) ownAwning=awn;
            [-1,1].forEach(function(sd){
              var hx2=bpx+sbf.tx*sd*2.65-sbf.nx*1.35, hz2=bpz+sbf.tz*sd*2.65-sbf.nz*1.35;
              if(stOuterClear(hx2,hz2,3.6)) townOBBs.push({cx:hx2,cz:hz2,ux:ux,uz:uz,vx:vx,vz:vz,hx:.92,hz:.28});
            });
          }
          var plx=sbs.x+sbf.nx*3.95, plz=sbs.z+sbf.nz*3.95;
          if(stOuterClear(plx,plz,3.4) && !stNearDeck(plx,plz,4.8)){
            townOBBs.push({cx:plx,cz:plz,ux:ux,uz:uz,vx:vx,vz:vz,hx:.70,hz:.30});
          }
        } else if(sbi%3===2){
          var umx=sbs.x+sbf.nx*4.8, umz=sbs.z+sbf.nz*4.8;
          if(stOuterClear(umx,umz,3.8) && !stNearDeck(umx,umz,4.5)){
            townOBBs.push({cx:umx,cz:umz,ux:ux,uz:uz,vx:vx,vz:vz,hx:.85,hz:.85});
            townOBBs.push({cx:umx+sbf.tx*1.3,cz:umz+sbf.tz*1.3,ux:ux,uz:uz,vx:vx,vz:vz,hx:.70,hz:.28});
          }
        } else {
          var lpx=sbs.x+sbf.nx*4.35, lpz=sbs.z+sbf.nz*4.35;
          if(stOuterClear(lpx,lpz,3.6) && !stNearDeck(lpx,lpz,4.6)){
            townOBBs.push({cx:lpx,cz:lpz,ux:ux,uz:uz,vx:vx,vz:vz,hx:.35,hz:.45});
            townOBBs.push({cx:lpx-sbf.tx*.95,cz:lpz-sbf.tz*.95,ux:ux,uz:uz,vx:vx,vz:vz,hx:.30,hz:.30});
          }
        }
      }
      for(var mk=3;mk<stMain;mk+=4){
        var ms=view.spaces[mk], mf=regionPeopleLoopFrame(view,ms), mDone=false;
        [4.55,4.25,4.85].forEach(function(sDist){
          if(mDone) return;
          [0,-1.1,1.1,-1.85,1.85].forEach(function(sOff){
            if(mDone) return;
            var mx=ms.x+mf.nx*sDist+mf.tx*sOff, mz=ms.z+mf.nz*sDist+mf.tz*sOff;
            if(!stOuterClear(mx,mz,3.65) || stNearDeck(mx,mz,4.4)) return;
            if(stShopCenters.some(function(sc){ return Math.hypot(sc[0]-mx,sc[1]-mz)<4.85; })) return;
            if(stStallCenters.some(function(sc){ return Math.hypot(sc[0]-mx,sc[1]-mz)<3.8; })) return;
            mDone=true; stStallCenters.push([mx,mz]);
            var mRot=Math.atan2(-mf.nx,-mf.nz), mux=Math.cos(mRot), muz=-Math.sin(mRot), mvx=Math.sin(mRot), mvz=Math.cos(mRot);
            townOBBs.push({cx:mx,cz:mz,ux:mux,uz:muz,vx:mvx,vz:mvz,hx:1.45,hz:1.05});
            [-1,1].forEach(function(sd){
              var shx=mx+mf.tx*sd*1.95, shz=mz+mf.tz*sd*1.95;
              if(stOuterClear(shx,shz,3.4) && !stNearDeck(shx,shz,4.2) && stShopCenters.every(function(sc){ return Math.hypot(sc[0]-shx,sc[1]-shz)>=3.6; })){
                townOBBs.push({cx:shx,cz:shz,ux:mux,uz:muz,vx:mvx,vz:mvz,hx:.70,hz:.28});
              }
            });
          });
        });
      }
      view.spaces.forEach(function(ts){
        if(ts && ts.obj && ts.obj.position) townOBBs.push({cx:ts.obj.position.x,cz:ts.obj.position.z,ux:1,uz:0,vx:0,vz:1,hx:.45,hz:.45});
      });
      function townObbPen(aObb,minGap){
        var pen=0;
        for(var oi=0;oi<townOBBs.length;oi++){
          var sep=obbSep2D(aObb,townOBBs[oi]);
          if(sep<minGap) pen+=3000+(minGap-sep)*4500;
        }
        return pen;
      }
      var stCam=regionPeopleCamAt(view,space.i) || cam;
      var stMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
      // Precompute 2D '?' cube positions on the active opening camera & own camera so street residents never hide behind a '?' cube.
      var stPharmSp=view.spaces.find(function(s){ return s && s.item && s.item.d && s.item.d.regionActivity && s.item.d.regionActivity.id==='pharmacy'; });
      var stPharmCam=stPharmSp ? regionPeopleCamAt(view,stPharmSp.i) : null;
      var stQCams=[];
      [cam,stPharmCam,stCam].forEach(function(qc){ if(qc && stQCams.indexOf(qc)<0) stQCams.push(qc); });
      var stQScreen=[];
      if(probe && qCubeSpaces.length){
        stQCams.forEach(function(qc){
          qCubeSpaces.forEach(function(q){
            probe.set(q.x,(q.y||0)+1.55,q.z).project(qc);
            if(probe.z>-1 && probe.z<1 && Math.abs(probe.x)<1.08 && Math.abs(probe.y)<1.08){
              var qd=qc.position ? Math.hypot(q.x-qc.position.x,q.z-qc.position.z) : 0;
              stQScreen.push({cam:qc,sx:(probe.x+1)*512,sy:(1-probe.y)*320,dist:qd});
            }
          });
        });
      }
      function qCubeScreenPen(x,z,yMid){
        if(!probe || !stQScreen.length) return 0;
        var pen=0;
        for(var qi=0;qi<stQScreen.length;qi++){
          var qs=stQScreen[qi];
          probe.set(x,yMid,z).project(qs.cam);
          if(probe.z>-1 && probe.z<1){
            var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
            var pd=qs.cam.position ? Math.hypot(x-qs.cam.position.x,z-qs.cam.position.z) : 0;
            if(pd>=qs.dist-2.2 && Math.abs(sx-qs.sx)<72 && Math.abs(sy-qs.sy)<82) pen+=6500;
          }
        }
        return pen;
      }
      if(actId==='restaurant'){
        // C1: Place restaurant-otter forward/west on the flat cobbled sidewalk strictly clear of shop[7]'s striped awning in both 3D OBB (>= 0.65u) and 2D screen space (body + floating pill).
        var awn2D=null;
        if(ownAwning && stCam && probe){
          var aMinX=1e9, aMaxX=-1e9, aMinY=1e9, aMaxY=-1e9;
          [-ownAwning.hx,ownAwning.hx].forEach(function(lx){ [-ownAwning.hz,ownAwning.hz].forEach(function(lz){ [1.40,1.95].forEach(function(ly){
            probe.set(ownAwning.cx+lx*ownAwning.ux+lz*ownAwning.vx,ly,ownAwning.cz+lx*ownAwning.uz+lz*ownAwning.vz).project(stCam);
            var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
            if(sx<aMinX) aMinX=sx; if(sx>aMaxX) aMaxX=sx; if(sy<aMinY) aMinY=sy; if(sy>aMaxY) aMaxY=sy;
          }); }); });
          awn2D={minX:aMinX,maxX:aMaxX,minY:aMinY,maxY:aMaxY};
        }
        for(var rOut=1.95;rOut<=2.75;rOut+=.15){
          for(var rAl=0;rAl<=3.0;rAl+=.20){
            var rx3=space.x+stF.nx*rOut+stF.tx*rAl, rz3=space.z+stF.nz*rOut+stF.tz*rAl;
            var rMinT=minTileDist(rx3,rz3), rDef=Math.max(0,radius+1.25-rMinT);
            var rShp=(view && view._shopPos && Math.hypot(view._shopPos.x-rx3,view._shopPos.z-rz3)<4.2) ? 2000 : 0;
            var rYaw=(stCam && stCam.position && stCam.position.lengthSq()>.01) ? Math.atan2(stCam.position.x-rx3,stCam.position.z-rz3) : Math.atan2(-stF.nx,-stF.nz);
            var rObb=makeActorObb(rx3,rz3,rYaw);
            var rObs=townObbPen(rObb,.65);
            var rPpl=placedPenalty(rx3,rz3);
            var rQ=qCubePenalty(rx3,rz3);
            var rBas=regionPeopleInPoly(stBasin,rx3,rz3) ? 4500 : 0;
            var rCurb=Math.abs(rOut-3.05)<.45 ? 1200 : 0;
            var rCam=0;
            if(stCam && probe){
              var cMinX=1e9, cMaxX=-1e9, cMinY=1e9, cMaxY=-1e9, rCy=Math.cos(rYaw), rSy=Math.sin(rYaw);
              [offX-halfW,offX+halfW].forEach(function(lx){ [offZ-halfD,offZ+halfD].forEach(function(lz){ [0,actorH].forEach(function(ly){
                probe.set(rx3+lx*rCy+lz*rSy,(space.y||0)+ly,rz3-lx*rSy+lz*rCy).project(stCam);
                var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
                if(sx<cMinX) cMinX=sx; if(sx>cMaxX) cMaxX=sx; if(sy<cMinY) cMinY=sy; if(sy>cMaxY) cMaxY=sy;
              }); }); });
              if(cMinX<60 || cMaxX>964 || cMinY<60 || cMaxY>580) rCam+=1200;
              if(awn2D && cMaxX>awn2D.minX-10 && cMinX<awn2D.maxX+10 && cMaxY>awn2D.minY-8 && cMinY<awn2D.maxY+8) rCam+=4000;
              probe.set(rx3,(space.y||0)+actorTop+.65,rz3).project(stCam);
              var plX=(probe.x+1)*512, plY=(1-probe.y)*320;
              if(awn2D && plX+88>awn2D.minX-4 && plX-88<awn2D.maxX+4 && plY>awn2D.minY-4 && plY-36<awn2D.maxY+4) rCam+=3500;
            }
            var rSc=rDef*8000+rShp+rObs+rPpl+rQ+rBas+rCurb+rCam+Math.hypot(rx3-space.x,rz3-space.z)*.6+Math.abs(rOut-2.25)*.8;
            if(!best || rSc<best.score) best={x:rx3,z:rz3,side:1,score:rSc,boardYaw:rYaw};
          }
        }
        if(best){ best.boardYOffset=-.312-stMinY; return best; }
      } else if(actId==='shop'){
        // M3 + CRIT-1: Place shop-octopus on the open cobbled street/plaza with >= 0.62u 3D OBB clearance from awnings/stalls and >= 3.4u from any '?' cube.
        var oAnchor=view.spaces[(space.i-1+stMain)%stMain] || space;
        var oF=regionPeopleLoopFrame(view,oAnchor);
        for(var oOut=2.10;oOut<=3.70;oOut+=.15){
          for(var oAl=-3.40;oAl<=4.20;oAl+=.20){
            var ox3=oAnchor.x+oF.nx*oOut+oF.tx*oAl, oz3=oAnchor.z+oF.nz*oOut+oF.tz*oAl;
            if(regionPeopleInPoly(stBasin,ox3,oz3)) continue;
            var oMinT=minTileDist(ox3,oz3);
            if(oMinT<2.38) continue;
            var oShp=(view && view._shopPos && Math.hypot(view._shopPos.x-ox3,view._shopPos.z-oz3)<4.2) ? 2000 : 0;
            var oPpl=placedPenalty(ox3,oz3);
            var oQ=qCubePenalty(ox3,oz3);
            [0.25,0.30,0.20,0.35].forEach(function(oYaw,yi){
              var oObb=makeActorObb(ox3,oz3,oYaw);
              var oObs=townObbPen(oObb,.62);
              var tileRim=1e9;
              for(var ti=0;ti<view.spaces.length;ti++){
                var gap=obbPtDist(oObb,view.spaces[ti].x,view.spaces[ti].z)-1.15;
                if(gap<tileRim) tileRim=gap;
              }
              var tPen=tileRim<0 ? 6000+(-tileRim)*8000 : (tileRim<.06 ? (.06-tileRim)*400 : 0);
              var oCam=0;
              if(cam && probe){
                probe.set(ox3,(space.y||0)+(bounds.centerY||0),oz3).project(cam);
                if(probe.z>-1 && probe.z<1 && probe.y>-.95 && probe.y<.95 && probe.x>-1.18 && probe.x<-.82) oCam+=900;
              }
              var oSc=tPen+oShp+oObs+oPpl+oQ+oCam+Math.hypot(ox3-space.x,oz3-space.z)*.35+yi*.05;
              if(!best || oSc<best.score) best={x:ox3,z:oz3,side:1,score:oSc,boardYaw:oYaw};
            });
          }
        }
        if(best){ best.boardYOffset=-.312-stMinY; return best; }
      } else if(actId==='taxi'){
        // MIN-5 & MIN-16: Place Harbor Squid cleanly on the sunlit promenade with >= 0.75u clearance from EVERY
        // market stall counter & prop (and zero 2D overlap with the striped market stall), turned cleanly toward Shelly!
        var stallBoxes2D=[];
        if(stCam && probe){
          stStallCenters.forEach(function(sc){
            if(Math.hypot(sc[0]-space.x,sc[1]-space.z)>18) return;
            probe.set(sc[0],1.0,sc[1]).project(stCam);
            if(probe.z<=-1 || probe.z>=1 || Math.abs(probe.x)>1.05 || Math.abs(probe.y)>1.05) return;
            var sMinX=1e9, sMaxX=-1e9, sMinY=1e9, sMaxY=-1e9, inF=false;
            [-1.45,1.45].forEach(function(dx){ [-1.05,1.05].forEach(function(dz){ [-.31,2.30].forEach(function(ly){
              probe.set(sc[0]+dx,ly,sc[1]+dz).project(stCam);
              if(probe.z<=-1 || probe.z>=1) return;
              inF=true;
              var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
              if(sx<sMinX) sMinX=sx; if(sx>sMaxX) sMaxX=sx;
              if(sy<sMinY) sMinY=sy; if(sy>sMaxY) sMaxY=sy;
            }); }); });
            if(inF && sMaxX>0 && sMinX<1024 && sMaxY>0 && sMinY<640) stallBoxes2D.push({minX:sMinX,maxX:sMaxX,minY:sMinY,maxY:sMaxY});
          });
        }
        var tCamAzRef=(stCam && stCam.position && stCam.position.lengthSq()>.01);
        var ownPot=(space && space.obj && space.obj.position) ? space.obj.position : null;
        var taxiObs=ownPot ? obstacles.filter(function(o){ return Math.hypot(o.x-ownPot.x,o.z-ownPot.z)>.35; }) : obstacles;
        function taxiObbPen(aObb){
          var pen=0;
          for(var oi=0;oi<townOBBs.length;oi++){
            var ob=townOBBs[oi];
            // Overhead wall awning (y=1.40..1.95) & small knee-high pot across the stone curb need strict non-overlap (>= 0.12u);
            // EVERY market stall, shop wall, umbrella, bench, lamp & planter strictly enforces >= 0.78u clearance!
            var isOwnAwn=(ownAwning && ob===ownAwning);
            var isOwnPot=(ownPot && Math.hypot(ob.cx-ownPot.x,ob.cz-ownPot.z)<.35);
            var req=(isOwnAwn || isOwnPot) ? .12 : .78;
            var sep=obbSep2D(aObb,ob);
            if(sep<req) pen+=3000+(req-sep)*4500;
          }
          return pen;
        }
        for(var tOut=3.50;tOut<=3.90;tOut+=.05){
          for(var tAl=-1.15;tAl<=-.55;tAl+=.05){
            var tx3=space.x+stF.nx*tOut+stF.tx*tAl, tz3=space.z+stF.nz*tOut+stF.tz*tAl;
            if(regionPeopleInPoly(stBasin,tx3,tz3)) continue;
            var tMinT=minTileDist(tx3,tz3), tDef=Math.max(0,radius+1.25-tMinT);
            var tShp=(view && view._shopPos && Math.hypot(view._shopPos.x-tx3,view._shopPos.z-tz3)<4.2) ? 2000 : 0;
            var tToShelly=Math.atan2(space.x-tx3,space.z-tz3);
            var tToCam=tCamAzRef ? Math.atan2(stCam.position.x-tx3,stCam.position.z-tz3) : tToShelly;
            var tDelta=Math.atan2(Math.sin(tToShelly-tToCam),Math.cos(tToShelly-tToCam));
            var tYaw=tToCam+tDelta*.72;
            var tObb=makeActorObb(tx3,tz3,tYaw);
            var tObs=taxiObbPen(tObb)+horizObsPen(tx3,tz3,radius*.85,taxiObs,.75,2600);
            var tPpl=placedPenalty(tx3,tz3);
            var tQ=qCubePenalty(tx3,tz3)+qCubeScreenPen(tx3,tz3,(space.y||0)+(bounds.centerY||0)-.312-stMinY+actorH*.2);
            var tCurb=Math.abs(tOut-3.05)<.42 ? 1600 : 0;
            var tCam=0;
            if(stCam && probe){
              var qMinX=1e9, qMaxX=-1e9, qMinY=1e9, qMaxY=-1e9, qCy=Math.cos(tYaw), qSy=Math.sin(tYaw);
              [offX-halfW,offX+halfW].forEach(function(lx){ [offZ-halfD,offZ+halfD].forEach(function(lz){ [-.31,-.31+actorH].forEach(function(ly){
                probe.set(tx3+lx*qCy+lz*qSy,(space.y||0)+ly,tz3-lx*qSy+lz*qCy).project(stCam);
                var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
                if(sx<qMinX) qMinX=sx; if(sx>qMaxX) qMaxX=sx;
                if(sy<qMinY) qMinY=sy; if(sy>qMaxY) qMaxY=sy;
              }); }); });
              if(qMinX<520 || qMaxX>945 || qMinY<260 || qMaxY>632) tCam+=2200;
              for(var sb2=0;sb2<stallBoxes2D.length;sb2++){
                var sbx=stallBoxes2D[sb2];
                if(qMaxX>sbx.minX-6 && qMinX<sbx.maxX+6 && qMaxY>sbx.minY-6 && qMinY<sbx.maxY+8){
                  tCam+=4500; break;
                }
              }
            }
            var tBias=Math.hypot(tOut-3.65,tAl-(-.88))*1.4;
            var tSc=tDef*8000+tShp+tObs+tPpl+tQ+tCurb+tCam+tBias;
            if(!best || tSc<best.score) best={x:tx3,z:tz3,side:1,score:tSc,boardYaw:tYaw};
          }
        }
        if(best && best.score<1800){ best.boardYOffset=-.312-stMinY; return best; }
        best=null;
      }
      [2.05,2.25,2.55,2.95,3.35,3.75,4.15,4.65,1.85,-2.05,-2.35].forEach(function(outD,di){
        [0,.85,-.85,1.65,-1.65,2.4,-2.4,3.1,-3.1].forEach(function(al,ai){
          var sx2=space.x+stF.nx*outD+stF.tx*al, sz2=space.z+stF.nz*outD+stF.tz*al;
          var minS=minTileDist(sx2,sz2), defS=Math.max(0,radius+1.25-minS);
          var shpS=(view && view._shopPos && Math.hypot(view._shopPos.x-sx2,view._shopPos.z-sz2)<4.2) ? 2000 : 0;
          var sYaw=(stCam && stCam.position && stCam.position.lengthSq()>.01) ? Math.atan2(stCam.position.x-sx2,stCam.position.z-sz2) : Math.atan2(-stF.nx,-stF.nz);
          var obsS=horizObsPen(sx2,sz2,radius*.85,obstacles,.45,2000)+townObbPen(makeActorObb(sx2,sz2,sYaw),.55);
          var pplS=placedPenalty(sx2,sz2);
          var qS=qCubePenalty(sx2,sz2)+qCubeScreenPen(sx2,sz2,(space.y||0)+(bounds.centerY||0)+(actId==='cafe' ? -.22 : -.312)-stMinY+actorH*.2);
          var curbS=(Math.abs(outD-3.05)<.55 || (actId==='pharmacy' && outD>2.40)) ? 2800 : 0;
          var basS=regionPeopleInPoly(stBasin,sx2,sz2) ? 4500 : 0;
          var camS=0;
          if(stCam && probe){
            probe.set(sx2,(space.y||0)+(bounds.centerY||0),sz2).project(stCam);
            if(probe.z<-1 || probe.z>1 || Math.abs(probe.x)>.72 || probe.y>.50 || probe.y<-.65) camS+=300;
          }
          if(cam && cam!==stCam && probe){
            probe.set(sx2,(space.y||0)+(bounds.centerY||0),sz2).project(cam);
            if(probe.z>-1 && probe.z<1 && probe.y>-.95 && probe.y<.95 && probe.x>-1.18 && probe.x<-.82) camS+=900;
          }
          var scS=defS*8000+shpS+obsS+pplS+qS+curbS+basS+camS+di*.4+ai*.2;
          if(!best || scS<best.score) best={x:sx2,z:sz2,side:outD>=0?1:-1,score:scS,boardYaw:sYaw};
        });
      });
      if(best){ best.boardYOffset=(actId==='cafe' ? -.22 : -.312)-stMinY; return best; }
    }
    // The Lighthouse Host (Giant Spiral Lighthouse & fallback): seat Keeper Hana at true 3D space.y
    // directly over her elevated cantilevered crystal tidepool balcony (spaces.lighthouse.hanaLanding), zero floating or floor-sinking.
    if(isLoop && regionId==='light'){
      var lh=view.spaces && view.spaces.lighthouse, lhStart=view.spaces[0] || space;
      if(lh && lh.hanaLanding){
        var hl=lh.hanaLanding;
        var hanaSp=(typeof hl.space==='number' && view.spaces[hl.space]) ? view.spaces[hl.space] : space;
        var hanaBaseY=typeof hanaSp.y==='number' ? hanaSp.y : (typeof hl.y==='number' ? hl.y+.22 : (space.y||0));
        var hMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        var poolSurfY=typeof hl.y==='number' ? hl.y : (hanaBaseY-.22);
        return {
          x:hl.x, y:hanaBaseY, z:hl.z, side:-1, score:0,
          boardYaw:Math.atan2(lhStart.x-hl.x,lhStart.z-hl.z),
          boardYOffset:(poolSurfY+.08)-(hanaBaseY+hMinY),
          labelOffset:{y:.50}
        };
      }
      var lf=regionPeopleLoopFrame(view,space), lhAct=view.spaces[regionPeopleStartIndex(view)] || space;
      var lhCam=regionPeopleCamAt(view,space.i) || cam;
      var hanaPoolX=1.91, hanaPoolZ=-4.17;
      function evalHana(hx3,hz3){
        var lMinT=minTileDist(hx3,hz3), lDef=Math.max(0,Math.max(radius+1.25,3.15)-lMinT);
        var dStart=Math.hypot(hx3-lhStart.x,hz3-lhStart.z), dAct=Math.hypot(hx3-lhAct.x,hz3-lhAct.z);
        var clearPen=(dStart<3.60 ? (3.60-dStart)*6000 : 0)+(dAct<3.20 ? (3.20-dAct)*6000 : 0);
        var lShp=(view && view._shopPos && Math.hypot(view._shopPos.x-hx3,view._shopPos.z-hz3)<4.2) ? 2000 : 0;
        var lObs=horizObsPen(hx3,hz3,radius*.85,obstacles,.55,2500);
        var lPpl=placedPenalty(hx3,hz3);
        var dSp1=Math.hypot(hx3-space.x,hz3-space.z);
        var meadowPen=(dSp1>3.95 ? (dSp1-3.95)*2400 : 0)+(dStart>5.05 ? (dStart-5.05)*1800 : 0);
        var lCam=0;
        if(lhCam && probe){
          probe.set(hx3,(space.y||0)+(bounds.centerY||0),hz3).project(lhCam);
          if(probe.z<-1 || probe.z>1 || probe.x<.08 || probe.x>.62 || probe.y<-.45 || probe.y>.35) lCam+=1800;
        }
        var poolBias=Math.hypot(hx3-hanaPoolX,hz3-hanaPoolZ)*4.0;
        var lSc=lDef*8000+clearPen+lShp+lObs+lPpl+meadowPen+lCam+poolBias;
        if(!best || lSc<best.score) best={x:hx3,z:hz3,side:1,score:lSc};
      }
      evalHana(hanaPoolX,hanaPoolZ);
      for(var lOut=3.20;lOut<=4.00;lOut+=.15){
        for(var lAl=-.30;lAl<=.85;lAl+=.15){
          evalHana(space.x+lf.nx*lOut+lf.tx*lAl,space.z+lf.nz*lOut+lf.tz*lAl);
        }
      }
      if(best){
        best.boardYaw=(lhCam && lhCam.position && lhCam.position.lengthSq()>.01) ? Math.atan2(lhCam.position.x-best.x,lhCam.position.z-best.z) : Math.atan2(-lf.nx,-lf.nz);
        best.boardYOffset=.07;
        // m6: Float "Read a sign" cleanly above Hana's wide dome with generous daylight.
        best.labelOffset={y:.50};
        return best;
      }
    }
    // Echo Caves Host (09-caves, M4 assist): foreground-biased placement beside Echo's tile clear of golden pools, obstacles & HUD so Echo pops at board distance out of back fog.
    if(isLoop && regionId==='caves'){
      var cvMain=view.spaces.mainN || view.spaces.length, cavePoly=[];
      for(var cvi=0;cvi<cvMain;cvi++){
        var cvs=view.spaces[cvi], cvf=regionPeopleLoopFrame(view,cvs);
        cavePoly.push([cvs.x+cvf.nx*5.4,cvs.z+cvf.nz*5.4]);
      }
      var cavePools=[], caveSolid=[];
      obstacles.forEach(function(o){
        if(o.r && Math.abs(o.r-.8)<.02) cavePools.push(o);
        else caveSolid.push(o);
      });
      var cvAt=regionPeopleStartIndex(view), cvCur=view.spaces[cvAt] || space;
      var cvF=regionPeopleLoopFrame(view,space), cvNear=Math.hypot(cvCur.x-space.x,cvCur.z-space.z)<8;
      var cvAnchor=cvNear ? cvCur : space;
      var cvCam=(cvNear && cam) ? cam : (regionPeopleCamAt(view,cvAt) || regionPeopleCamAt(view,space.i) || cam);
      var echoGrotto=!!((view && view._echoPool) || Math.hypot(cvAnchor.x-(-15.95),cvAnchor.z-(-11.15))<4.0);
      function evalEcho(ex,ez){
        if(!regionPeopleInPoly(cavePoly,ex,ez)) return;
        var minE=minTileDist(ex,ez), defE=Math.max(0,Math.max(1.6,radius+.80)-minE);
        var shpE=(view && view._shopPos && Math.hypot(view._shopPos.x-ex,view._shopPos.z-ez)<4.2) ? 2500 : 0;
        var poolPen=0;
        for(var pi3=0;pi3<cavePools.length;pi3++){
          if(Math.hypot(ex-cavePools[pi3].x,ez-cavePools[pi3].z)<2.40){ poolPen=4500; break; }
        }
        var obsE=poolPen+horizObsPen(ex,ez,radius*.65,caveSolid,.45,3600);
        var pplE=placedPenalty(ex,ez);
        var camE=0, distBias=Math.hypot(ex-cvCur.x,ez-cvCur.z)*.20, archPen=0;
        if(cvCam && probe){
          var ey=(space.y||0)+(bounds.centerY||0);
          probe.set(ex,ey,ez).project(cvCam);
          if(probe.z<-1 || probe.z>1 || probe.x<-.36 || probe.x>-.08 || probe.y<-.18 || probe.y>.24) camE+=2400;
          // Stay clear of bottom-left "Ask Shelly" and bottom-right "Meet Bok" / "Treasure map" HUD pills.
          if(probe.x<-.40 && probe.y<-.40) camE+=3000;
          if(probe.x>.48 && probe.y<-.43) camE+=3000;
          var camDist=cvCam.position.distanceTo ? Math.hypot(cvCam.position.x-ex,cvCam.position.y-ey,cvCam.position.z-ez) : 9;
          if(camDist<6.5 || camDist>13.0) camE+=(camDist<6.5?(6.5-camDist):(camDist-13.0))*600+1200;
          // Bias Echo prominently into the center-left open cavern clearing (6.5..13u from cvCam).
          distBias=Math.abs(camDist-9.0)*1.0+Math.hypot(ex-cvCur.x,ez-cvCur.z)*.20+Math.hypot(probe.x-(-.22),probe.y-(.02))*8.0;
          var tcX=cvCam.position.x-ex, tcZ=cvCam.position.z-ez, tcL=Math.hypot(tcX,tcZ)||1;
          tcX/=tcL; tcZ/=tcL;
          for(var ai2=0;ai2<caveSolid.length;ai2++){
            var ao=caveSolid[ai2], dAx=ao.x-ex, dAz=ao.z-ez;
            // Only penalize cavern arch/pillar rocks behind Echo along the sightline, never foreground props.
            if(dAx*tcX+dAz*tcZ<-1.2){
              var dA=Math.hypot(dAx,dAz);
              if(dA<4.05) archPen+=(4.05-dA)*4.5;
            }
          }
        }
        var scE=defE*8000+shpE+obsE+pplE+camE+distBias+archPen;
        if(!best || scE<best.score) best={x:ex,z:ez,side:1,score:scE};
      }
      // MAJ-4: Place Echo prominently in the midground-left open cavern clearing relative to sp[0] / cvCam
      // (probe.x in [-0.58, -0.18], probe.y in [-0.18, 0.28], 6..12u from cvCam, minTileDist >= 2.2, clear of crystals).
      var baseX=Math.round(cvAnchor.x*2)/2, baseZ=Math.round(cvAnchor.z*2)/2;
      for(var ecx=-10;ecx<=10;ecx+=.5){
        for(var ecz=-10;ecz<=10;ecz+=.5){
          evalEcho(baseX+ecx,baseZ+ecz);
        }
      }
      var curBaseX=Math.round(cvCur.x*2)/2, curBaseZ=Math.round(cvCur.z*2)/2;
      for(var ecxC=-12;ecxC<=12;ecxC+=.5){
        for(var eczC=-12;eczC<=12;eczC+=.5){
          evalEcho(curBaseX+ecxC,curBaseZ+eczC);
        }
      }
      if(!best || best.score>1000){
        for(var ecx2=-14;ecx2<=14;ecx2+=.75){
          for(var ecz2=-12;ecz2<=12;ecz2+=.75){
            evalEcho((space.x+cvCur.x)*.5+ecx2,(space.z+cvCur.z)*.5+ecz2);
          }
        }
      }
      if(best){
        var echoCamAz=camBackAz(cvCam,best.x,best.z,Math.atan2(-cvF.nx,-cvF.nz));
        var echoToShelly=Math.atan2(cvCur.x-best.x,cvCur.z-best.z);
        var echoToCam=(cvCam && cvCam.position && cvCam.position.lengthSq()>.01)
          ? Math.atan2(cvCam.position.x-best.x,cvCam.position.z-best.z) : echoCamAz;
        var echoDelta=Math.atan2(Math.sin(echoToShelly-echoToCam),Math.cos(echoToShelly-echoToCam));
        var eMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        best.boardPitchYaw=echoToCam;
        best.boardYaw=echoToCam+echoDelta*.68;
        best.boardPitch=-.14;
        best.boardYOffset=-.250-eMinY;
        // m6: Float "Practice a sound" cleanly above Echo's head to the left of the dark indigo crystal cave arch.
        if(cvCam && cvCam.position && cvCam.position.lengthSq()>.01){
          var eToCamX=cvCam.position.x-best.x, eToCamZ=cvCam.position.z-best.z, eL=Math.hypot(eToCamX,eToCamZ)||1;
          eToCamX/=eL; eToCamZ/=eL;
          var eLeftX=-eToCamZ, eLeftZ=eToCamX;
          best.labelOffset={x:eToCamX*.52+eLeftX*1.62,y:-.05,z:eToCamZ*.52+eLeftZ*1.62};
        } else {
          best.labelOffset={y:-.05};
        }
        return best;
      }
    }
    // Captain's Deck Host (m7 / D4 MIN): frame Captain Bay cleanly on the open starboard deck beside Shelly,
    // keeping every board tile behind him (especially the starboard story-branch teal '?' tile sp[36]) 100% visible
    // and readable with zero rail/prop clipping and flippers solidly planted on the -0.12 wooden deck planks.
    if(isLoop && regionId==='captain'){
      var cMainN=view.spaces.mainN || view.spaces.length;
      var activeAt=regionPeopleStartIndex(view);
      var cCur=view.spaces[activeAt] || space;
      var cNxt=(typeof reef3dAhead==='function' ? reef3dAhead(view.spaces,activeAt) : view.spaces[(activeAt+1)%cMainN]) || cCur;
      var fdx=cNxt.x-cCur.x, fdz=cNxt.z-cCur.z, fL=Math.hypot(fdx,fdz)||1;
      var fx=fdx/fL, fz=fdz/fL, rx=-fz, rz=fx;
      var sb=view.regionShipBounds || null;
      var cCenter=regionPeopleLoopFrame(view,cCur);
      var capCam=cam;
      if(window.THREE){
        var cTab=(typeof REEF3D_REGION_CAMERA==='object' && REEF3D_REGION_CAMERA && REEF3D_REGION_CAMERA.captain) || [4.85,12.8,2.4,1.38];
        cTab=[4.85,12.8,2.4,1.38];
        capCam=new window.THREE.PerspectiveCamera(42,1.6,.1,300);
        capCam.position.set(cCur.x-fx*cTab[1],(cCur.y||0)+cTab[0],cCur.z-fz*cTab[1]);
        capCam.lookAt(cCur.x+fx*cTab[2],(cCur.y||0)+.3+(cTab[3]!=null?cTab[3]:1.25),cCur.z+fz*cTab[2]);
        capCam.updateMatrixWorld(true);
      }
      var capTileBoxes=[];
      if(capCam && probe){
        view.spaces.forEach(function(ts){
          var dAhead=(ts.x-cCur.x)*fx+(ts.z-cCur.z)*fz;
          if(dAhead<1.2 || dAhead>16.0) return;
          var tMinX=1e9, tMaxX=-1e9, tMinY=1e9, tMaxY=-1e9, inF=false;
          for(var ta=0;ta<8;ta++){
            var ang=ta*Math.PI/4;
            probe.set(ts.x+Math.cos(ang)*1.15,(ts.y||0)+.08,ts.z+Math.sin(ang)*1.15).project(capCam);
            if(probe.z>-1 && probe.z<1) inF=true;
            var sx=(probe.x+1)*512, sy=(1-probe.y)*320;
            if(sx<tMinX) tMinX=sx; if(sx>tMaxX) tMaxX=sx;
            if(sy<tMinY) tMinY=sy; if(sy>tMaxY) tMaxY=sy;
          }
          if(inF && tMaxX>0 && tMinX<1024 && tMaxY>0 && tMinY<640){
            capTileBoxes.push({s:ts,minX:tMinX,maxX:tMaxX,minY:tMinY,maxY:tMaxY,ahead:dAhead});
          }
        });
      }
      // Keep procedural & boardScale=0.72 captain-bay.glb aligned to the exact same tile-clear spot (zero swap pop),
      // with >= 24px crisp daylight from Shelly's tile rim, 0 overlap with sp[36] teal '?' tile, and 0 overlap with the foreground lantern.
      var capNeedR=Math.max(radius,2.06);
      var capH=Math.min(bounds.height||1.78,1.79);
      var capTopY=-.086+capH;
      var capSpecs=[
        {st:0,sides:[1,-1],dists:[3.48,3.52,3.60,3.75,4.05],fwdOffs:[.54,.46,.34,.16,-.04,-.16]},
        {st:1,sides:[1,-1],dists:[3.48,3.80,4.20],fwdOffs:[0,.65,-.65]},
        {st:2,sides:[1,-1],dists:[3.48,3.80,4.20],fwdOffs:[0,.65,-.65]}
      ];
      capSpecs.forEach(function(spec,si){
        var anchor=view.spaces[(activeAt+spec.st)%cMainN] || cCur;
        spec.sides.forEach(function(sd,sdi){
          spec.dists.forEach(function(dist,di){
            spec.fwdOffs.forEach(function(fo,fi){
              var cx2=anchor.x+rx*sd*dist+fx*fo, cz2=anchor.z+rz*sd*dist+fz*fo;
              var minC=minTileDist(cx2,cz2), defC=Math.max(0,capNeedR+1.25-minC);
              var deckPen=0;
              if(sb && (cx2<sb.minX+3.2 || cx2>sb.maxX-4.8 || cz2<sb.minZ+1.3 || cz2>sb.maxZ-1.3)) deckPen+=2500;
              if(view._shipPoly){
                if(!regionPeopleInPoly(view._shipPoly,cx2,cz2)) deckPen+=2500;
                else {
                  var spPoly=view._shipPoly, minEdge=1e9;
                  for(var ei=0;ei<spPoly.length;ei++){
                    var ea=spPoly[ei], eb=spPoly[(ei+1)%spPoly.length];
                    var evx=eb[0]-ea[0], evz=eb[1]-ea[1], et=Math.max(0,Math.min(1,((cx2-ea[0])*evx+(cz2-ea[1])*evz)/(evx*evx+evz*evz||1)));
                    var ed=Math.hypot(cx2-(ea[0]+evx*et),cz2-(ea[1]+evz*et));
                    if(ed<minEdge) minEdge=ed;
                  }
                  if(minEdge<3.4) deckPen+=2500;
                }
              }
              var shpC=(view && view._shopPos && Math.hypot(view._shopPos.x-cx2,view._shopPos.z-cz2)<4.2) ? 2000 : 0;
              var obsC=horizObsPen(cx2,cz2,capNeedR*.62,obstacles,.35,2400);
              var pplC=placedPenalty(cx2,cz2);
              var camC=0, tileOcclPen=0;
              if(capCam && probe){
                var candAhead=(cx2-cCur.x)*fx+(cz2-cCur.z)*fz;
                var bMinX=1e9, bMaxX=-1e9, bMinY=1e9, bMaxY=-1e9, badZ=false, silPts=[];
                [[0,capTopY,28],[.34,capTopY-.08,20],[-.34,capTopY-.08,20],[.72,capTopY-.62,18],[-.72,capTopY-.62,18],[0,-.086,0],[1.05,-.086,0],[-1.05,-.086,0]].forEach(function(pt){
                  probe.set(cx2+rx*pt[0],(space.y||0)+pt[1],cz2+rz*pt[0]).project(capCam);
                  if(probe.z<-1 || probe.z>1) badZ=true;
                  var px=(probe.x+1)*512, py=(1-probe.y)*320;
                  if(px<bMinX) bMinX=px; if(px>bMaxX) bMaxX=px;
                  if(py<bMinY) bMinY=py; if(py>bMaxY) bMaxY=py;
                  if(pt[2]>0) silPts.push([px,py,pt[2]]);
                });
                if(badZ || bMinX<55 || bMaxX>970 || bMinY<105 || bMaxY>622) camC+=2400;
                for(var ti=0;ti<capTileBoxes.length;ti++){
                  var tb=capTileBoxes[ti];
                  if(tb.ahead<=candAhead+.8) continue;
                  var hitTb=false;
                  for(var si2=0;si2<silPts.length;si2++){
                    var sp2=silPts[si2];
                    if(sp2[0]+sp2[2]>tb.minX && sp2[0]-sp2[2]<tb.maxX && sp2[1]+16>tb.minY && sp2[1]-2<tb.maxY){ hitTb=true; break; }
                  }
                  if(hitTb){ tileOcclPen+=4800; break; }
                }
              }
              var inwardDist=Math.hypot(cx2-cCenter.cx,cz2-cCenter.cz);
              var anchorDist=Math.hypot(anchor.x-cCenter.cx,anchor.z-cCenter.cz);
              var sideBias=sdi*8.0+(inwardDist>anchorDist ? .4 : 0);
              var scC=defC*8000+deckPen+shpC+obsC+pplC+camC+tileOcclPen+si*1.4+di*.35+fi*.25+sideBias;
              if(!best || scC<best.score) best={x:cx2,z:cz2,side:sd,step:spec.st,score:scC};
            });
          });
        });
      });
      if(best){
        var capCamRef=(capCam && capCam.position && capCam.position.lengthSq()>.01) ? capCam : cam;
        // MIN-5: Turn Captain Bay cleanly 3/4 toward Shelly on Captain's Deck (72% Shelly / 28% camera)
        // instead of staring straight at the camera, keeping >= 24px tile-rim daylight & zero prop clipping!
        var capToShelly=Math.atan2(cCur.x-best.x,cCur.z-best.z);
        var capToCam=(capCamRef && capCamRef.position && capCamRef.position.lengthSq()>.01)
          ? Math.atan2(capCamRef.position.x-best.x,capCamRef.position.z-best.z) : capToShelly;
        var capDelta=Math.atan2(Math.sin(capToShelly-capToCam),Math.cos(capToShelly-capToCam));
        best.boardYaw=capToCam+capDelta*.35;
        var capMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        // Seat Captain Bay's belly & flippers solidly on the -0.12 wooden deck planks (accounting for space.y elevation).
        best.boardYOffset=-.118-capMinY-(space.y||0);
        return best;
      }
    }
    // Pattern Reef Host (10-pattern-reef, MAJ-2): place scaled Pip (boardScale 2.15) in the open turquoise water clearing
    // visible in 10-pattern-reef.png's start camera (cvAt), clear of tiles, Bok, and coral rocks (ndc.x in [0.15, 0.55],
    // ndc.y in [-0.18, +0.25]), oriented 3/4 toward Shelly & the camera so both eyes & smile read unmistakably.
    if(isLoop && regionId==='patterns'){
      var patAt=regionPeopleStartIndex(view), patStart=view.spaces[patAt] || space;
      var patCam=regionPeopleCamAt(view,patAt) || regionPeopleCamAt(view,space.i) || cam;
      var patMidX=(patStart.x+space.x)*.5, patMidZ=(patStart.z+space.z)*.5;
      for(var pdx=-9.0;pdx<=9.0;pdx+=.45){
        for(var pdz=-9.0;pdz<=9.0;pdz+=.45){
          var px3=patMidX+pdx, pz3=patMidZ+pdz;
          var pMinT=minTileDist(px3,pz3), pDef=Math.max(0,radius+1.25-pMinT);
          var pShp=(view && view._shopPos && Math.hypot(view._shopPos.x-px3,view._shopPos.z-pz3)<4.2) ? 2400 : 0;
          var pObs=horizObsPen(px3,pz3,radius*.72,obstacles,.35,2600);
          var pPpl=placedPenalty(px3,pz3);
          var pCamPen=0, pNdcBias=0;
          if(patCam && probe){
            probe.set(px3,(space.y||0)+(bounds.centerY||0),pz3).project(patCam);
            if(probe.z<-1 || probe.z>1 || probe.x<.15 || probe.x>.55 || probe.y<-.18 || probe.y>.25) pCamPen+=2400;
            pNdcBias=Math.hypot(probe.x-.34,probe.y-.04)*4.0;
          }
          var pBias=Math.hypot(px3-space.x,pz3-space.z)*.35;
          var pSc=pDef*8000+pShp+pObs+pPpl+pCamPen+pNdcBias+pBias;
          if(!best || pSc<best.score) best={x:px3,z:pz3,side:1,score:pSc};
        }
      }
      if(best){
        var patToCam=(patCam && patCam.position && patCam.position.lengthSq()>.01)
          ? Math.atan2(patCam.position.x-best.x,patCam.position.z-best.z)
          : camBackAz(patCam,best.x,best.z,.97);
        var patToShelly=Math.atan2(patStart.x-best.x,patStart.z-best.z);
        var patDelta=Math.atan2(Math.sin(patToShelly-patToCam),Math.cos(patToShelly-patToCam));
        best.boardPitchYaw=patToCam;
        best.boardYaw=patToCam+patDelta*.35;
        best.boardPitch=-.36;
        best.boardYOffset=.12;
        best.labelOffset={y:.22};
        return best;
      }
    }
    // Story Lagoon Host (08-lagoon, MAJ-2): frame Mira in the open foreground-left / mid-left turquoise water clearing
    // strictly clear of floating storybooks, reeds, tiles & tube corals so her friendly face is 100% visible.
    if(isLoop && regionId==='lagoon'){
      var lgMain=view.spaces.mainN || view.spaces.length;
      var lgCam=regionPeopleCamAt(view,Math.min(5,lgMain-1)) || cam;
      var lgSp0=view.spaces[0];
      var lgBaseX=lgSp0 ? lgSp0.x : space.x, lgBaseZ=lgSp0 ? lgSp0.z : space.z;
      for(var lgdx=-9.6;lgdx<=6.4;lgdx+=.4){
        for(var lgdz=-8.0;lgdz<=8.0;lgdz+=.4){
          var lgx=lgBaseX+lgdx, lgz=lgBaseZ+lgdz;
          var lMinT=minTileDist(lgx,lgz), lDef=Math.max(0,radius+1.85-lMinT);
          var lSp0Pen=(lgSp0 && Math.hypot(lgx-lgSp0.x,lgz-lgSp0.z)<3.4) ? 8000 : 0;
          var lShp=(view && view._shopPos && Math.hypot(view._shopPos.x-lgx,view._shopPos.z-lgz)<4.5) ? 2000 : 0;
          var lObs=horizObsPen(lgx,lgz,radius*.85,obstacles,.45,5000);
          var lPpl=placedPenalty(lgx,lgz);
          var lCam=0, lBias=0;
          if(lgCam && probe){
            probe.set(lgx,(space.y||0)+(bounds.centerY||0),lgz).project(lgCam);
            if(probe.z<-1 || probe.z>1 || probe.x<-.68 || probe.x>-.10 || probe.y<-.52 || probe.y>.25) lCam+=2400;
            lBias=Math.hypot(probe.x-(-.38),probe.y-(-.14))*4.0;
          }
          if(lgSp0) lBias+=Math.abs(Math.hypot(lgx-lgSp0.x,lgz-lgSp0.z)-4.8)*1.2;
          var lSc=lDef*8000+lSp0Pen+lShp+lObs+lPpl+lCam+lBias;
          if(!best || lSc<best.score) best={x:lgx,z:lgz,side:1,score:lSc};
        }
      }
      if(best){
        var lgCamAz=camBackAz(lgCam,best.x,best.z,.86);
        var lgToSp0=lgSp0 ? Math.atan2(lgSp0.x-best.x,lgSp0.z-best.z) : lgCamAz;
        var lgToCam=(lgCam && lgCam.position && lgCam.position.lengthSq()>.01) ? Math.atan2(lgCam.position.x-best.x,lgCam.position.z-best.z) : lgCamAz;
        var lgDelta=Math.atan2(Math.sin(lgToCam-lgToSp0),Math.cos(lgToCam-lgToSp0));
        best.boardPitchYaw=lgCamAz;
        best.boardYaw=lgToSp0+lgDelta*.35;
        best.boardPitch=0;
        best.labelOffset={y:.38};
        return best;
      }
    }
    // Bottle Beach Host (11-beach): place scaled Jisu (boardScale 1.75) squarely on dry golden beach sand beside sp[2],
    // turned toward the 11-beach camera with gentle nose-up pitch so her sunlit face, 76% eyes, feather quill in Claw.R & postal cap read warmly.
    if(isLoop && regionId==='beach'){
      var bhMain=view.spaces.mainN || view.spaces.length;
      var bhCam=regionPeopleCamAt(view,space.i) || cam;
      var bhOuter=[], bhInner=[];
      for(var bi3=0;bi3<bhMain;bi3++){
        var bs3=view.spaces[bi3], bf3=regionPeopleLoopFrame(view,bs3);
        bhOuter.push([bs3.x+bf3.nx*4.9,bs3.z+bf3.nz*4.9]);
        bhInner.push([bs3.x-bf3.nx*2.7,bs3.z-bf3.nz*2.7]);
      }
      var bhRefX=space.x-2.70, bhRefZ=space.z+.16;
      for(var bdx=-3.8;bdx<=-2.2;bdx+=.15){
        for(var bdz=-.9;bdz<=1.1;bdz+=.15){
          var jx=space.x+bdx, jz=space.z+bdz;
          var jMinT=minTileDist(jx,jz), jDef=Math.max(0,radius+1.25-jMinT);
          var jShp=(view && view._shopPos && Math.hypot(view._shopPos.x-jx,view._shopPos.z-jz)<4.2) ? 2000 : 0;
          var jObs=horizObsPen(jx,jz,radius*.75,obstacles,.35,2400);
          var jPpl=placedPenalty(jx,jz);
          var jSand=(!regionPeopleInPoly(bhOuter,jx,jz) || regionPeopleInPoly(bhInner,jx,jz)) ? 3200 : 0;
          var jCam=0;
          if(bhCam && probe){
            probe.set(jx,(space.y||0)+(bounds.centerY||0),jz).project(bhCam);
            if(probe.z<-1 || probe.z>1 || probe.x<-.55 || probe.x>.25 || probe.y<-.55 || probe.y>.25) jCam+=1800;
          }
          var jBias=Math.hypot(jx-bhRefX,jz-bhRefZ)*2.0;
          var jSc=jDef*8000+jShp+jObs+jPpl+jSand+jCam+jBias;
          if(!best || jSc<best.score) best={x:jx,z:jz,side:-1,score:jSc};
        }
      }
      if(best){
        var bhCamAz=camBackAz(bhCam,best.x,best.z,.62);
        best.boardPitchYaw=bhCamAz;
        best.boardYaw=bhCamAz-.16;
        best.boardPitch=0;
        var jMinY=(bounds.centerY||0)-(bounds.height||0)*.5;
        // Seat all 6 hermit-crab legs solidly in the -0.316 golden beach sand contact shadow (compensating for space.y elevation & Idle pose leg lift).
        best.boardYOffset=-.414-jMinY-(space.y||0);
        best.labelOffset={y:.28};
        return best;
      }
    }
    var loopDzs=(isLoop && cam) ? [.18,-1.6,1.8,-3.2,3.2] : dzs;
    [-1,1].forEach(function(side){
      loopDzs.forEach(function(dz,dzi){
        for(var extra=0;extra<=12;extra+=.5){
          var x=space.x+side*(start+extra), z=space.z+dz;
          var cand=evalPoint(x,z,side,extra+(dzi*.35)+(basin && side!==preferred ? 1.5 : 0),null);
          if(!best || cand.score<best.score) best=cand;
          if(cand.clean) break;
        }
      });
    });
    // On live looped boards, also try perpendicular +/-Z offsets if X-axis candidates hit obstacles/HUD.
    if(isLoop && cam && (!best || !best.clean)){
      [-1,1].forEach(function(zSide){
        [0,-1.4,1.4].forEach(function(dxOff,dxi){
          for(var extra=0;extra<=8;extra+=.5){
            var x=space.x+dxOff, z=space.z+zSide*(start+extra);
            var cand=evalPoint(x,z,zSide,extra+1.2+dxi*.35,null);
            if(!best || cand.score<best.score) best=cand;
            if(cand.clean) break;
          }
        });
      });
    }
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
  function regionPeopleHideJisuForeground(view, e, out, look){
    var T = window.THREE;
    if(!T || !view || !e || !e.actor || !out || !look) return;
    var actor = e.actor, b = e.actorBounds || actor.userData.regionBounds;
    var fgKey = Math.round(actor.position.x * 20) + ':' + Math.round(actor.position.z * 20) + ':' + Math.round(((b && b.depth) || 0) * 20);
    if(e._jisuFgKey === fgKey) return;
    e._jisuFgKey = fgKey;
    if(!Array.isArray(e.hiddenObjects)) e.hiddenObjects = [];
    if(!e._jisuFgSet) e._jisuFgSet = new Set();

    var cx = look.x, cz = look.z;
    var sx = look.x - out.x, sz = look.z - out.z;
    var segLenSq = sx * sx + sz * sz || 1, segLen = Math.sqrt(segLenSq);
    var fx = sx / segLen, fz = sz / segLen;

    function isAncestorOf(node, target){
      for(var cur = target; cur; cur = cur.parent) if(cur === node) return true;
      return false;
    }
    function blocksSight(px, pz, nearRad, coneRad){
      if(Math.hypot(px - cx, pz - cz) < nearRad) return true;
      var vx = px - out.x, vz = pz - out.z;
      var along = vx * fx + vz * fz;
      if(along < -0.25 || along > segLen + 0.55) return false;
      var lat = Math.abs(vx * (-fz) + vz * fx);
      return lat < coneRad;
    }
    function hideObj(obj){
      if(!obj || !obj.visible || e._jisuFgSet.has(obj)) return;
      if(obj === actor || isAncestorOf(obj, actor) || isAncestorOf(actor, obj)) return;
      e._jisuFgSet.add(obj);
      e.hiddenObjects.push({ object: obj, visible: obj.visible });
      obj.visible = false;
    }

    if(view.crab && view.crab !== actor) hideObj(view.crab);
    if(view.blobC) hideObj(view.blobC);

    // 1. Temporarily hide ALL board space props / '?' blocks across Bottle Beach during Jisu's close-up (restored on encounter end).
    if(Array.isArray(view.spaces)){
      view.spaces.forEach(function(sp){
        if(!sp) return;
        [sp.obj, sp.qb].forEach(function(o){
          if(o && o.visible) hideObj(o);
        });
      });
    }

    if(Array.isArray(view.spinners)){
      view.spinners.forEach(function(sp){
        var sObj = sp && (sp.isObject3D ? sp : (sp.mesh || sp.group || sp.obj));
        if(!sObj) return;
        hideObj(sObj);
        if(typeof sObj.traverse === 'function') sObj.traverse(function(c){ hideObj(c); });
      });
    }
    if(view.guide) hideObj(view.guide);
    if(view.crab) hideObj(view.crab);
    if(view.blobG) hideObj(view.blobG);
    if(view.blobC) hideObj(view.blobC);
    if(view.glowG) hideObj(view.glowG);

    // 1b. MIN-6 / MIN-1: Hide Bottle Beach's Driftwood stall (including all child meshes/props) & Bok/marker props
    // so stall bottles/tabletop items never float behind Jisu's camera frustum.
    var shopPos = view._shopPos || null;
    if(view.regionPeople){
      var rp = view.regionPeople;
      if(rp.stall){
        if(!shopPos && rp.stall.position) shopPos = { x: rp.stall.position.x, z: rp.stall.position.z };
        hideObj(rp.stall);
        if(typeof rp.stall.traverse === 'function') rp.stall.traverse(function(c){ if(c.isMesh) hideObj(c); });
      }
      if(rp.shop && (rp.shop.isObject3D || typeof rp.shop.traverse === 'function')){
        hideObj(rp.shop);
        if(typeof rp.shop.traverse === 'function') rp.shop.traverse(function(c){ if(c.isMesh) hideObj(c); });
      }
      if(rp.actor && rp.actor !== actor) hideObj(rp.actor);
      if(rp.marker && rp.marker !== actor) hideObj(rp.marker);
      if(rp.hostShadow) hideObj(rp.hostShadow);
      if(Array.isArray(rp.extraShadows)) rp.extraShadows.forEach(hideObj);
    }

    // 2. Temporarily hide any foreground/background bottle instance (beach-bottle-fleet), static props near Bok's stall,
    // or standalone bottle/tile/prop mesh in Jisu's frustum.
    if(view.scene && typeof view.scene.traverse === 'function'){
      var tmpPos = new T.Vector3(), tmpBox = new T.Box3();
      view.scene.updateMatrixWorld(true);
      view.scene.traverse(function(o){
        if(!o || !o.visible || o.isLight) return;
        if(o === actor || isAncestorOf(o, actor) || isAncestorOf(actor, o)) return;
        if(e._jisuStage && (o === e._jisuStage || isAncestorOf(e._jisuStage, o))) return;
        if(o.name === 'beach-bottle-glows' || /bottle-cluster|beach-translucent-bottles/i.test(o.name || '') || (o.isInstancedMesh && /bottle/i.test(o.name || ''))){
          hideObj(o);
          return;
        }
        var nm = o.name || '';
        // MIN-11 / #376: Temporarily hide edge-on board stepping-stone tile layers during Jisu's outdoor beach close-up
        // so flat white background slabs never float across the horizon behind Jisu (restored on encounter end!).
        if(/^Board space /i.test(nm)){
          hideObj(o);
          if(typeof o.traverse === 'function') o.traverse(function(c){ hideObj(c); });
          return;
        }
        if(o.isMesh && /grass|tuft|reed|weed|blade|bottle|boardwalk|plank|dock|tile|slab/i.test(nm)){
          tmpBox.setFromObject(o);
          if(isFinite(tmpBox.min.x)){
            tmpBox.getCenter(tmpPos);
            if(Math.hypot(tmpPos.x - cx, tmpPos.z - cz) < 4.5 || blocksSight(tmpPos.x, tmpPos.z, 4.5, 2.2)){
              hideObj(o);
              return;
            }
          }
        }
        if(!o.isMesh || (o.userData && (o.userData.reefGround || o.userData.noFootprint))) return;
        if(/ground|floor|sand|ocean|water|sea|sky|cloud|sun|horizon|island|reef/i.test(nm)) return;
        tmpBox.setFromObject(o);
        if(!isFinite(tmpBox.min.x)) return;
        tmpBox.getCenter(tmpPos);
        if(shopPos && Math.hypot(tmpPos.x - shopPos.x, tmpPos.z - shopPos.z) < 3.2){
          hideObj(o);
          return;
        }
        if(/static|palm|dock|pier/i.test(nm)) return;
        if(!/bottle|tile|slab|prop|clam|star|crate|stall|coral|flower|shell|rim|petal|stone/i.test(nm)) return;
        var vx = tmpPos.x - out.x, vz = tmpPos.z - out.z;
        var along = vx * fx + vz * fz;
        var lat = Math.abs(vx * (-fz) + vz * fx);
        if(blocksSight(tmpPos.x, tmpPos.z, 2.65, 1.75) || (along > -0.25 && lat < 2.4 + Math.max(0, along) * 0.6) || (along > -1.0 && Math.hypot(tmpPos.x - cx, tmpPos.z - cz) < 8.5 && tmpPos.y > -0.45) || (tmpPos.x < look.x - 1.2 && tmpPos.z > look.z - 2.6)) hideObj(o);
      });
    }
  }
  // MIN-3: Grounded multi-lobe contact shadow beneath Jisu's shell & all 6 legs + rich Jamboree coastal foreground sand
  // (wind-blown sand-ripple relief, coastal scallop/spiral shells, 5-arm starfish, sea-glass pebbles, & corked message bottle).
  function regionPeopleEnsureJisuStage(view, e, out, look, sandY){
    var T = window.THREE;
    if(!T || !view || !view.scene || !e || !out || !look) return;
    if(!(view.spaces && view.spaces.loop)) return;
    var cx = look.x, cz = look.z;
    var toCamX = out.x - cx, toCamZ = out.z - cz;
    var aimY = Math.atan2(toCamX, toCamZ);
    if(e._jisuStage){
      e._jisuStage.position.set(cx, sandY, cz);
      e._jisuStage.rotation.y = aimY;
      return;
    }

    var stage = new T.Group();
    stage.name = 'jisu-encounter-beach-stage';
    stage.position.set(cx, sandY, cz);
    stage.rotation.y = aimY;
    var disposables = [];
    function track(obj){ if(obj) disposables.push(obj); return obj; }
    function makeRadialTex(size, stops){
      if(typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
      var cv = document.createElement('canvas');
      var ctx = cv && typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
      if(!ctx) return null;
      cv.width = size; cv.height = size;
      var gr = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.04, size * 0.5, size * 0.5, size * 0.5);
      stops.forEach(function(st){ gr.addColorStop(st[0], st[1]); });
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, size, size);
      return track(new T.CanvasTexture(cv));
    }
    function makeSandRippleTex(){
      if(typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
      var cv = document.createElement('canvas');
      var ctx = cv && typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
      if(!ctx) return null;
      var w = 512, h = 512;
      cv.width = w; cv.height = h;
      ctx.clearRect(0, 0, w, h);
      // Warm sunlit coastal sand base
      var baseGr = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.06, w * 0.5, h * 0.5, w * 0.49);
      baseGr.addColorStop(0.0, 'rgba(244, 214, 154, 0.72)');
      baseGr.addColorStop(0.60, 'rgba(238, 206, 144, 0.50)');
      baseGr.addColorStop(1.0, 'rgba(232, 198, 136, 0.0)');
      ctx.fillStyle = baseGr;
      ctx.fillRect(0, 0, w, h);
      // Organic wind-blown coastal sand-ripple crests & warm ochre trough shadows
      for(var r = 0; r < 14; r++){
        var ry = 36 + r * 33;
        ctx.beginPath();
        for(var x = 0; x <= w; x += 16){
          var wave = Math.sin(x * 0.022 + r * 0.9) * 7 + Math.cos(x * 0.011 - r * 0.4) * 4;
          if(x === 0) ctx.moveTo(x, ry + wave);
          else ctx.lineTo(x, ry + wave);
        }
        ctx.strokeStyle = 'rgba(255, 241, 202, 0.46)';
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.beginPath();
        for(var x2 = 0; x2 <= w; x2 += 16){
          var wave2 = Math.sin(x2 * 0.022 + r * 0.9) * 7 + Math.cos(x2 * 0.011 - r * 0.4) * 4;
          if(x2 === 0) ctx.moveTo(x2, ry + 7 + wave2);
          else ctx.lineTo(x2, ry + 7 + wave2);
        }
        ctx.strokeStyle = 'rgba(182, 134, 76, 0.28)';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      // Sunlit golden sand grains & tiny coral-shell flecks
      for(var s = 0; s < 340; s++){
        var sx = ((s * 97 + 31) % 480) + 16;
        var sy = ((s * 173 + 53) % 480) + 16;
        var dx = (sx - 256) / 230, dy = (sy - 256) / 230;
        if(dx * dx + dy * dy > 0.88) continue;
        ctx.fillStyle = (s % 5 === 0) ? 'rgba(255, 248, 224, 0.65)' : ((s % 7 === 0) ? 'rgba(232, 162, 136, 0.42)' : 'rgba(176, 128, 72, 0.30)');
        ctx.beginPath();
        ctx.arc(sx, sy, (s % 3) ? 1.5 : 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Feather radial edge seamlessly into live beach sand
      ctx.globalCompositeOperation = 'destination-in';
      var mask = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.14, w * 0.5, h * 0.5, w * 0.49);
      mask.addColorStop(0.0, 'rgba(0,0,0,1.0)');
      mask.addColorStop(0.68, 'rgba(0,0,0,0.86)');
      mask.addColorStop(1.0, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, w, h);
      return track(new T.CanvasTexture(cv));
    }

    var shCoreTex = makeRadialTex(128, [
      [0.0, 'rgba(54, 30, 12, 0.94)'],
      [0.44, 'rgba(54, 30, 12, 0.72)'],
      [0.76, 'rgba(54, 30, 12, 0.24)'],
      [1.0, 'rgba(54, 30, 12, 0.0)']
    ]);
    var shSoftTex = makeRadialTex(128, [
      [0.0, 'rgba(64, 38, 16, 0.82)'],
      [0.50, 'rgba(64, 38, 16, 0.36)'],
      [1.0, 'rgba(64, 38, 16, 0.0)']
    ]);
    var shCoreMat = shCoreTex ? track(new T.MeshBasicMaterial({ map: shCoreTex, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })) : null;
    var shSoftMat = shSoftTex ? track(new T.MeshBasicMaterial({ map: shSoftTex, transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })) : null;
    var plane1 = track(new T.PlaneGeometry(1, 1));
    plane1.rotateX(-Math.PI / 2);

    function addShadow(x, z, w, d, core, y){
      var mMat = core ? shCoreMat : shSoftMat;
      if(!mMat) return;
      var sh = new T.Mesh(plane1, mMat);
      sh.scale.set(w, 1, d);
      sh.position.set(x, y != null ? y : 0.005, z);
      sh.renderOrder = core ? 4 : 3;
      sh.raycast = function(){};
      stage.add(sh);
    }

    // 1. Feathered coastal sand-ripple texture patch across the lower foreground sand
    var rippleTex = makeSandRippleTex();
    if(rippleTex){
      var ripMat = track(new T.MeshBasicMaterial({ map: rippleTex, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      var ripMesh = new T.Mesh(plane1, ripMat);
      ripMesh.scale.set(3.4, 1, 2.5);
      ripMesh.position.set(0, 0.002, 0.44);
      ripMesh.renderOrder = 1;
      ripMesh.raycast = function(){};
      stage.add(ripMesh);
    }

    // 2. Crisp multi-lobe grounded contact shadow directly beneath Jisu's body, shell, all 6 planted leg tips & front-left claw tip!
    addShadow(0, -0.02, 1.12, 0.88, false, 0.0045);
    addShadow(0, -0.02, 0.74, 0.58, true, 0.0055);
    [[-0.24, 0.08], [-0.28, -0.02], [-0.22, -0.10], [0.24, 0.08], [0.28, -0.02], [0.22, -0.10]].forEach(function(lp){
      addShadow(lp[0], lp[1], 0.11, 0.09, false, 0.006);
    });
    // MIN-11: Subtle grounded contact shadow beneath Jisu's front-left claw tip so it feels resting cleanly on the sand!
    addShadow(-0.42, 0.22, 0.30, 0.22, false, 0.0052);
    addShadow(-0.42, 0.22, 0.18, 0.13, true, 0.0062);

    // Helper for sculpted 3D foreground beach props (all disposed cleanly on encounter end!)
    var matCache = {};
    function propMat(hex, opts){
      var k = hex + ':' + (opts ? JSON.stringify(opts) : '');
      if(matCache[k]) return matCache[k];
      var cfg = { color: hex };
      if(opts){ for(var pk in opts) cfg[pk] = opts[pk]; }
      var m = track(new T.MeshLambertMaterial(cfg));
      matCache[k] = m;
      return m;
    }
    function addProp(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz){
      var m = new T.Mesh(track(geo), mat);
      m.position.set(x, y, z);
      if(rx) m.rotation.x = rx;
      if(ry) m.rotation.y = ry;
      if(rz) m.rotation.z = rz;
      if(sx != null) m.scale.set(sx, sy != null ? sy : sx, sz != null ? sz : sx);
      m.raycast = function(){};
      stage.add(m);
      return m;
    }

    // 3. Sculpted 3D golden sand-ripple relief crests catching coastal sunlight across the lower 40% foreground
    var sandCrestMat = propMat(0xf4daa2);
    var sandCrestWarm = propMat(0xecc98b);
    [
      [-0.64, 0.48, 0.62, 0.014, 0.14, 0.18, sandCrestMat],
      [ 0.18, 0.54, 0.78, 0.015, 0.15, -0.10, sandCrestWarm],
      [-0.22, 0.64, 0.86, 0.016, 0.16, 0.12, sandCrestMat],
      [ 0.68, 0.66, 0.68, 0.015, 0.14, -0.16, sandCrestWarm],
      [-0.58, 0.78, 0.74, 0.016, 0.15, 0.08, sandCrestWarm],
      [ 0.12, 0.82, 0.90, 0.017, 0.16, -0.06, sandCrestMat]
    ].forEach(function(sr){
      addProp(new T.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), sr[6], sr[0], 0.0, sr[1], 0, sr[5], 0, sr[2], sr[3] * 2.0, sr[4]);
    });

    // 4. Sculpted 5-arm Jamboree coral-orange starfish on lower-right foreground sand (x = +0.58, z = +0.44)
    var stx = 0.58, stz = 0.44;
    var starMat = propMat(0xf0724f), studMat = propMat(0xffe5be);
    addShadow(stx, stz, 0.30, 0.28, true, 0.005);
    addProp(new T.SphereGeometry(0.046, 10, 8), starMat, stx, 0.014, stz, 0, 0, 0, 1.0, 0.48, 1.0);
    for(var sa = 0; sa < 5; sa++){
      var ang = 0.26 + sa * (Math.PI * 2 / 5);
      var ax = stx + Math.cos(ang) * 0.066, az = stz + Math.sin(ang) * 0.066;
      addProp(new T.ConeGeometry(0.032, 0.125, 8), starMat, ax, 0.015, az, Math.PI * 0.5, -ang + Math.PI * 0.5, 0, 1.0, 1.0, 0.42);
      addProp(new T.SphereGeometry(0.009, 6, 6), studMat, stx + Math.cos(ang) * 0.048, 0.028, stz + Math.sin(ang) * 0.048);
      addProp(new T.SphereGeometry(0.007, 6, 6), studMat, stx + Math.cos(ang) * 0.082, 0.022, stz + Math.sin(ang) * 0.082);
    }

    // 5. Corked aqua sea-glass message bottle w/ rolled parchment scroll tucked cleanly to lower-left side (x = -0.84, z = +0.50, well clear of Jisu's claw)
    var bGrp = new T.Group();
    bGrp.position.set(-0.84, 0.046, 0.50);
    bGrp.rotation.set(0.06, 0.36, 0.04);
    var glassMat = track(new T.MeshLambertMaterial({ color: 0x7de4da, transparent: true, opacity: 0.66 }));
    var scrollMat = propMat(0xfaf0d2), ribbonMat = propMat(0xd94e46), corkMat = propMat(0xb67b48);
    function addB(geo, mat, bx, by, bz, rx, ry, rz){
      var bm = new T.Mesh(track(geo), mat);
      bm.position.set(bx, by, bz);
      if(rx) bm.rotation.x = rx;
      if(ry) bm.rotation.y = ry;
      if(rz) bm.rotation.z = rz;
      bm.raycast = function(){};
      bGrp.add(bm);
    }
    addB(new T.CylinderGeometry(0.056, 0.058, 0.21, 14), glassMat, 0, 0, 0, 0, 0, Math.PI / 2);
    addB(new T.SphereGeometry(0.056, 12, 8), glassMat, -0.105, 0, 0);
    addB(new T.CylinderGeometry(0.026, 0.054, 0.068, 12), glassMat, 0.135, 0, 0, 0, 0, -Math.PI / 2);
    addB(new T.CylinderGeometry(0.024, 0.026, 0.070, 12), glassMat, 0.195, 0, 0, 0, 0, Math.PI / 2);
    addB(new T.TorusGeometry(0.026, 0.007, 6, 12), glassMat, 0.228, 0, 0, 0, Math.PI / 2, 0);
    addB(new T.CylinderGeometry(0.022, 0.018, 0.044, 10), corkMat, 0.244, 0, 0, 0, 0, -Math.PI / 2);
    // Rolled parchment letter scroll + crimson wax ribbon inside translucent bottle
    addB(new T.CylinderGeometry(0.026, 0.026, 0.145, 10), scrollMat, -0.015, -0.008, 0.004, 0, 0, Math.PI / 2);
    addB(new T.CylinderGeometry(0.028, 0.028, 0.022, 10), ribbonMat, -0.015, -0.008, 0.004, 0, 0, Math.PI / 2);
    stage.add(bGrp);
    addShadow(-0.80, 0.50, 0.42, 0.19, true, 0.005);

    // 6. Sculpted pastel scallop shells, spiral conch shell & smooth coastal pebbles across foreground sand
    function addScallop(sx, sz, sc, col, ry){
      addShadow(sx, sz, 0.18 * sc, 0.15 * sc, true, 0.005);
      var sMat = propMat(col), ribMat = propMat(0xfff5e4);
      addProp(new T.SphereGeometry(0.068 * sc, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), sMat, sx, 0.004, sz, 0, ry, 0, 1.15, 0.42, 1.0);
      addProp(new T.BoxGeometry(0.052 * sc, 0.016 * sc, 0.026 * sc), sMat, sx - Math.sin(ry) * 0.062 * sc, 0.010, sz - Math.cos(ry) * 0.062 * sc, 0, ry, 0);
      for(var rb = -2; rb <= 2; rb++){
        var ra = ry + rb * 0.28;
        addProp(new T.CylinderGeometry(0.004 * sc, 0.006 * sc, 0.072 * sc, 6), ribMat, sx + Math.sin(ra) * 0.022 * sc, 0.022 * sc, sz + Math.cos(ra) * 0.022 * sc, Math.PI * 0.44, ra, 0);
      }
    }
    addScallop( 0.24, 0.60, 1.05, 0xf6b8b0, -0.45);
    addScallop(-0.46, 0.68, 0.85, 0xf8e2b8,  0.65);
    addScallop( 0.78, 0.22, 0.88, 0xecd4e8, -1.15);

    // Spiral ivory-apricot sea snail / conch shell (x = -0.26, z = +0.58)
    var spx = -0.26, spz = 0.58;
    addShadow(spx, spz, 0.22, 0.14, true, 0.005);
    var spMat = propMat(0xf5d6ad), spBand = propMat(0xd99268);
    addProp(new T.SphereGeometry(0.044, 10, 8), spMat, spx, 0.032, spz, 0, 0.35, 0, 1.18, 0.84, 0.92);
    addProp(new T.ConeGeometry(0.034, 0.086, 10), spBand, spx + 0.056, 0.026, spz - 0.014, 0, 0.24, -Math.PI * 0.48);
    addProp(new T.TorusGeometry(0.034, 0.008, 6, 10), spMat, spx + 0.024, 0.030, spz - 0.006, 0, Math.PI * 0.5, 0);

    // Smooth sunlit river/sea-glass pebbles scattered organically in foreground
    [
      [-0.04, 0.52, 0.032, 0.015, 0.024, 0x9cd4cc,  0.30],
      [ 0.42, 0.66, 0.038, 0.017, 0.028, 0xe8d0ae, -0.52],
      [-0.36, 0.46, 0.028, 0.014, 0.022, 0xd9b898,  0.80],
      [ 0.10, 0.74, 0.036, 0.016, 0.026, 0xf2e4cc, -0.22],
      [-0.14, 0.68, 0.026, 0.013, 0.022, 0xb8dfd8,  0.44]
    ].forEach(function(pb){
      addShadow(pb[0], pb[1], pb[2] * 3.1, pb[4] * 3.1, false, 0.0045);
      addProp(new T.SphereGeometry(1, 10, 7), propMat(pb[5]), pb[0], pb[3] * 0.68, pb[1], 0, pb[6], 0, pb[2], pb[3], pb[4]);
    });

    view.scene.add(stage);
    e._jisuStage = stage;
    if(!Array.isArray(e.hiddenObjects)) e.hiddenObjects = [];
    e.hiddenObjects.push({
      object: {
        set visible(v){
          if(!v) return;
          if(stage.parent) stage.parent.remove(stage);
          disposables.forEach(function(d){ if(d && typeof d.dispose === 'function') d.dispose(); });
          disposables.length = 0;
          if(e._jisuStage === stage) e._jisuStage = null;
        }
      },
      visible: true
    });
  }
  function regionPeopleEnsureJisuCamera(){
    if(typeof regionEncounterCamera !== 'function' || regionEncounterCamera._jisuFramed) return;
    var origCam = regionEncounterCamera;
    var wrapped = function(view, out, look){
      var ok = origCam(view, out, look);
      if(!ok) return false;
      var e = view && view.encounter;
      if(e && !e.interior && e.region === 'beach' && e.actor && e.actor.userData && e.actor.userData.species === 'hermit crab'){
        // CRIT-1: Anchor Jisu's outdoor beach stage cleanly +0.014u above Bottle Beach's -0.312 sand plane
        // so stage props sit 100% on top of the sand and Jisu's 6 leg tips touch her dark contact shadows.
        var beachSandY = -0.312;
        var T3 = window.THREE;
        var jb = T3 ? new T3.Box3().setFromObject(e.actor) : null;
        if(jb && Number.isFinite(jb.min.y) && (jb.min.y < -0.314 || jb.min.y > -0.298)){
          e.actor.position.y += (-0.306 - jb.min.y);
          e.actor.updateMatrixWorld(true);
          jb.setFromObject(e.actor);
        }
        var sandY = (jb && Number.isFinite(jb.min.y)) ? (jb.min.y - 0.002) : -0.308;
        var b = e.actorBounds || e.actor.userData.regionBounds;
        var h = (b && b.height) || 0.52;
        var ep = e.actor.userData.encounterPose;
        var yLift = (ep && ep.allowOutdoor && typeof ep.yLift === 'number') ? ep.yLift : 0;
        var cx = look.x, cy = look.y + yLift, cz = look.z;
        var baseDist = Math.hypot(out.x - cx, out.z - cz) || 1.3;
        var pull = 0.82;
        var dist = baseDist * pull;
        var aspect = (view.cam && view.cam.aspect) ? view.cam.aspect : 1.6;
        // Orbit slightly toward the nearest adjacent tile so the camera looks away from that foreground tile slab.
        var tileSide = 1;
        if(Array.isArray(view.spaces)){
          var bestTD = Infinity;
          for(var ti = 0; ti < view.spaces.length; ti++){
            var ts = view.spaces[ti];
            if(!ts) continue;
            var td = Math.hypot(ts.x - cx, ts.z - cz);
            if(td < bestTD && ts.z > cz - 1.8){
              bestTD = td;
              tileSide = (ts.x - cx) >= 0 ? 1 : -1;
            }
          }
        }
        var theta = tileSide * (aspect < 0.9 ? 0.24 : 0.36);
        var lookShiftY = e.phase === 'intro' ? -h * 0.22 : -h * 0.05;
        look.set(cx, cy + lookShiftY, cz);
        out.set(cx + Math.sin(theta) * dist, cy + h * 0.16, cz + Math.cos(theta) * dist);
        regionPeopleHideJisuForeground(view, e, out, look);
        regionPeopleEnsureJisuStage(view, e, out, look, sandY);
      }
      return true;
    };
    wrapped._jisuFramed = true;
    regionEncounterCamera = wrapped;
  }
  function regionPeopleBuild(view){
    if(!view || !view.region || !REGION_PEOPLE[view.region.id] || view.regionPeople) return;
    regionPeopleEnsureJisuCamera();
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
    view._placedPeople = [];
    // Explicit tile & obstacle clearance: the stall keeps >=2.60 from every board tile and
    // Bok (>=2.30) stands >=.95 clear in front of the counter's front edge (M9 / m15).
    var STALL_DZ=-.15, COUNTER_FRONT=.7, BOK_RADIUS=.65, BOK_GAP=.95;
    var bokDz=COUNTER_FRONT+BOK_RADIUS+BOK_GAP, bokDx=.95, stallX=shop.x+side*3.8, stallZ=shop.z+STALL_DZ, bokX=shop.x+side*2.85, bokZ=stallZ+bokDz, bestFit=null;
    var stallObs=regionPeopleObstacles(view);
    var isLoopBoard=!!(view.spaces && view.spaces.loop && view.spaces.length>2);
    var mainCount=view.spaces.mainN || view.spaces.length;
    var beachOuterPoly=null, beachInnerPoly=null, townBasinPoly=null;
    if(isLoopBoard && id==='town'){
      townBasinPoly=[];
      for(var tpi=0;tpi<mainCount;tpi++){
        var tps=view.spaces[tpi], tpf=regionPeopleLoopFrame(view,tps);
        townBasinPoly.push([tps.x-tpf.nx*2.9,tps.z-tpf.nz*2.9]);
      }
    }
    if(isLoopBoard && id==='beach'){
      // Keep Bok & beach kiosk on flat dry golden sand (between inner lagoon -2.7 & outer surf +4.9, well inside outerWidth=6.5) cleanly clear of sandbar mounds (11-beach).
      beachOuterPoly=[]; beachInnerPoly=[];
      for(var bpi=0;bpi<mainCount;bpi++){
        var bps=view.spaces[bpi], bpf=regionPeopleLoopFrame(view,bps);
        beachOuterPoly.push([bps.x+bpf.nx*4.9,bps.z+bpf.nz*4.9]);
        beachInnerPoly.push([bps.x-bpf.nx*2.7,bps.z-bpf.nz*2.7]);
        if(bpi%4===0) stallObs.push({x:bps.x-bpf.nx*4.3+bpf.tx,z:bps.z-bpf.nz*4.3+bpf.tz,r:2.25});
      }
    }
    var caveFloorPoly=null, cavePoolsShop=[];
    if(isLoopBoard && id==='caves'){
      caveFloorPoly=[];
      for(var cpi=0;cpi<mainCount;cpi++){
        var cps=view.spaces[cpi], cpf=regionPeopleLoopFrame(view,cps);
        caveFloorPoly.push([cps.x+cpf.nx*5.4,cps.z+cpf.nz*5.4]);
      }
      var keptObs=[];
      stallObs.forEach(function(o){
        if(o.r && o.r<=.85 && Math.abs(o.r-.8)<.06) cavePoolsShop.push(o);
        else keptObs.push(o);
      });
      stallObs=keptObs;
    }
    var stallCam=isLoopBoard ? regionPeopleActiveCam(view) : null;
    var stallAppCam=isLoopBoard ? regionPeopleCamAt(view,id==='caves'?shop.i:(shop.i-4+mainCount)%mainCount) : null;
    var stallProbe=(stallCam || stallAppCam) && window.THREE ? new window.THREE.Vector3() : null;
    var stallProbe2=(stallCam || stallAppCam) && window.THREE ? new window.THREE.Vector3() : null;
    function minTile(x,z){ var m=Infinity; view.spaces.forEach(function(t){ m=Math.min(m,Math.hypot(t.x-x,t.z-z)); }); return m; }
    function stallObsPen(x,z,rad){
      var p=0;
      for(var oi=0;oi<stallObs.length;oi++){
        var o=stallObs[oi], need=rad+(o.r||.8)+.55, d=Math.hypot(x-o.x,z-o.z);
        if(d<need) p+=1500+(need-d)*1200;
      }
      return p;
    }
    // Prefer the Bok offset side that creates crisp 2D daylight beside the stall counter instead of silhouette overlap (M9).
    function stallSepPen(sx,sz,bx,bz){
      var sc=stallAppCam || stallCam;
      if(!sc || !stallProbe || !stallProbe2) return 0;
      stallProbe.set(sx,base+1.0,sz).project(sc);
      stallProbe2.set(bx,base+1.0,bz).project(sc);
      var sepX=Math.abs(stallProbe2.x-stallProbe.x);
      var p=sepX<.145 ? (.145-sepX)*80 : 0;
      if(sepX<.085) p+=2400;
      return p;
    }
    function stallHudPen(sx,sz,bx,bz){
      var pen=0;
      if(caveFloorPoly && (!regionPeopleInPoly(caveFloorPoly,sx,sz) || !regionPeopleInPoly(caveFloorPoly,bx,bz))) pen+=3000;
      if(cavePoolsShop.length){
        for(var pi4=0;pi4<cavePoolsShop.length;pi4++){
          var cp=cavePoolsShop[pi4];
          if(Math.hypot(sx-cp.x,sz-cp.z)<3.60 || Math.hypot(bx-cp.x,bz-cp.z)<3.25){ pen+=4500; break; }
        }
      }
      if(stallCam && stallProbe && id==='caves'){
        stallProbe.set(bx,base+1.0,bz).project(stallCam);
        if(stallProbe.z<-1 || stallProbe.z>1 || Math.abs(stallProbe.x)>.84 || stallProbe.y<-.68 || stallProbe.y>.72) pen+=2500;
        // Keep Bok & cavern kiosk cleanly clear of the bottom-left "Ask Shelly" HUD pill.
        if(stallProbe.x<-.45 && stallProbe.y<-.42) pen+=3500;
        stallProbe.set(sx,base+1.0,sz).project(stallCam);
        if(stallProbe.z<-1 || stallProbe.z>1 || Math.abs(stallProbe.x)>.88 || stallProbe.y<-.76 || stallProbe.y>.78) pen+=2000;
        if(stallProbe.x<-.45 && stallProbe.y<-.45) pen+=3500;
      }
      return pen;
    }
    var lhShopLand=(isLoopBoard && id==='light' && view.spaces && view.spaces.lighthouse && view.spaces.lighthouse.shopLanding) ? view.spaces.lighthouse.shopLanding : null;
    if(lhShopLand){
      base=typeof lhShopLand.floorY==='number' ? lhShopLand.floorY : (typeof lhShopLand.y==='number' ? lhShopLand.y : base);
      bestFit={score:0,side:1,stallX:lhShopLand.stallX,stallZ:lhShopLand.stallZ,bokX:lhShopLand.bokX,bokZ:lhShopLand.bokZ};
    } else if(isLoopBoard && id==='caves'){
      // Seat Bok's Crystal Counter squarely on its stepped limestone kiosk plinth (shop.x - 1.0, shop.z - 4.0)
      // and keep the stall & Bok strictly clear of Echo's bioluminescent echo-grotto-pool at (-18.50, -6.00)
      // and cleanly clear of any foreground chime pavilion / shrine columns (>= 3.4u from center, >= 1.2u from pillars).
      var cavesShrine = view && view._cavesShrine;
      function cavesPavilionPen(sx,sz,bx,bz){
        var pen=0;
        if(cavesShrine && typeof cavesShrine.x==='number' && typeof cavesShrine.z==='number'){
          if(Math.hypot(sx-cavesShrine.x,sz-cavesShrine.z)<3.40) pen+=4500;
          if(Math.hypot(bx-cavesShrine.x,bz-cavesShrine.z)<3.40) pen+=4500;
        }
        if(Math.hypot(sx-shop.x,sz-shop.z)<3.40) pen+=3500;
        for(var oi=0;oi<stallObs.length;oi++){
          var o=stallObs[oi], or=o.r||.8;
          if(or>=.85 && Math.hypot(sx-o.x,sz-o.z)<3.40) pen+=3500;
          if(Math.hypot(bx-o.x,bz-o.z)<or+1.25) pen+=3500;
        }
        return pen;
      }
      var cavePlinthSX=shop.x-1.0, cavePlinthSZ=shop.z-4.0, cavePlinthBX=cavePlinthSX-1.15, cavePlinthBZ=cavePlinthSZ+2.55;
      var cavePlinthOk=minTile(cavePlinthSX,cavePlinthSZ)>=2.60 && minTile(cavePlinthBX,cavePlinthBZ)>=2.30 &&
        stallObsPen(cavePlinthSX,cavePlinthSZ,1.1)===0 && stallObsPen(cavePlinthBX,cavePlinthBZ,.75)===0 &&
        stallHudPen(cavePlinthSX,cavePlinthSZ,cavePlinthBX,cavePlinthBZ)===0 &&
        cavesPavilionPen(cavePlinthSX,cavePlinthSZ,cavePlinthBX,cavePlinthBZ)===0;
      if(cavePlinthOk){
        bestFit={score:0,side:1,stallX:cavePlinthSX,stallZ:cavePlinthSZ,bokX:cavePlinthBX,bokZ:cavePlinthBZ};
      } else {
        for(var cdx=-7.0;cdx<=7.0;cdx+=.5){
          for(var cdz=-6.5;cdz<=6.5;cdz+=.5){
            var csx=shop.x+cdx, csz=shop.z+cdz;
            [-1,1].forEach(function(csd){
              var cbx=csx-csd*1.15, cbz=csz+2.55;
              var cDef=Math.max(0,2.60-minTile(csx,csz))+Math.max(0,2.30-minTile(cbx,cbz));
              var cObs=stallObsPen(csx,csz,1.1)+stallObsPen(cbx,cbz,.75);
              var epSX=(view && view._echoPool) ? view._echoPool.x : -18.50, epSZ=(view && view._echoPool) ? view._echoPool.z : -6.00;
              var cPool=(Math.hypot(csx-epSX,csz-epSZ)<4.8 || Math.hypot(cbx-epSX,cbz-epSZ)<4.5) ? 4500 : 0;
              var cHud=stallHudPen(csx,csz,cbx,cbz);
              var cPav=cavesPavilionPen(csx,csz,cbx,cbz);
              var cSep=stallSepPen(csx,csz,cbx,cbz);
              var cSc=cDef*8000+cObs+cPool+cHud+cPav+cSep+Math.hypot(cdx,cdz)*.5;
              if(!bestFit || cSc<bestFit.score) bestFit={score:cSc,side:csd,stallX:csx,stallZ:csz,bokX:cbx,bokZ:cbz};
            });
          }
        }
      }
    } else if(isLoopBoard && id==='beach'){
      // iter32 MIN 7: Seat Driftwood Stall on the vacated dry golden sand beside sp[6] at (-6.25, -15.55),
      // and relocate Bok into the real open turquoise bay water right behind/beside the stall shoreline at (-6.15, -22.55)
      // (> 1.2u clear of sand edge, > 0.7u clear of boats, > 9u clear of tiles) — eliminating the dry-sand bathtub puddle completely!
      var beachStallX=-6.25, beachStallZ=-15.55, beachBokX=-6.15, beachBokZ=-22.55;
      var beachSyncedOk=minTile(beachStallX,beachStallZ)>=2.60 && minTile(beachBokX,beachBokZ)>=2.30 &&
        regionPeopleInPoly(beachOuterPoly,beachStallX,beachStallZ) && !regionPeopleInPoly(beachInnerPoly,beachStallX,beachStallZ) &&
        !regionPeopleInPoly(beachOuterPoly,beachBokX,beachBokZ) &&
        stallObsPen(beachStallX,beachStallZ,1.05)===0 && stallObsPen(beachBokX,beachBokZ,.75)===0;
      if(beachSyncedOk){
        bestFit={score:0,side:1,stallX:beachStallX,stallZ:beachStallZ,bokX:beachBokX,bokZ:beachBokZ};
      } else {
        var bsf=regionPeopleLoopFrame(view,shop);
        [1,-1].forEach(function(sd){
          for(var outB=2.4;outB<=4.85;outB+=.25){
            for(var alB=-3.2;alB<=3.2;alB+=.35){
              var bsx=shop.x+bsf.nx*sd*outB+bsf.tx*alB, bsz=shop.z+bsf.nz*sd*outB+bsf.tz*alB;
              [6.8,7.4,8.0].forEach(function(waterOut){
                var bbx=shop.x+bsf.nx*waterOut+bsf.tx*(alB+1.2), bbz=shop.z+bsf.nz*waterOut+bsf.tz*(alB+1.2);
                var bDef=Math.max(0,2.60-minTile(bsx,bsz))+Math.max(0,2.30-minTile(bbx,bbz));
                var sandPen=0;
                if(!regionPeopleInPoly(beachOuterPoly,bsx,bsz) || regionPeopleInPoly(beachInnerPoly,bsx,bsz) ||
                   regionPeopleInPoly(beachOuterPoly,bbx,bbz)) sandPen=4500;
                var bObs=stallObsPen(bsx,bsz,1.05)+stallObsPen(bbx,bbz,.75);
                var bSep=stallSepPen(bsx,bsz,bbx,bbz);
                var bDist=Math.hypot(bsx-shop.x,bsz-shop.z)*.35+(sd<0?1.2:0);
                var bSc=bDef*8000+sandPen+bObs+bSep+bDist;
                if(!bestFit || bSc<bestFit.score) bestFit={score:bSc,side:1,stallX:bsx,stallZ:bsz,bokX:bbx,bokZ:bbz};
              });
            }
          }
        });
      }
    } else if(isLoopBoard && id==='lagoon'){
      // MIN 12: Seat Reed Stall at (-17.65, -10.25) and nudge Bok out into pure open turquoise lagoon water at (-20.80, -8.40)
      // well clear (> 5u) of the wooden dock & rocky left cliff with full unobstructed water-ripple visibility.
      var lgStallCam=regionPeopleCamAt(view,regionPeopleStartIndex(view)) || stallCam;
      var lgNonReed=stallObs.filter(function(o){ return !o || Math.abs((o.r||0)-.75)>.01; });
      function lgObsPen(x,z,rad){
        var p=0;
        for(var oi=0;oi<lgNonReed.length;oi++){
          var o=lgNonReed[oi], need=rad+(o.r||.8)+.75, d=Math.hypot(x-o.x,z-o.z);
          if(d<need) p+=1500+(need-d)*1200;
        }
        return p;
      }
      var lgRefSX=(shop && typeof shop.x==='number') ? (shop.x-3.2) : -17.65, lgRefSZ=(shop && typeof shop.z==='number') ? (shop.z-2.4) : -10.25;
      for(var lsx=-18.85;lsx<=-16.85;lsx+=.2){
        for(var lsz=-10.65;lsz<=-9.65;lsz+=.2){
          var lbx=lsx-4.20, lbz=lsz+2.70;
          var lDef=Math.max(0,2.65-minTile(lsx,lsz))+Math.max(0,2.35-minTile(lbx,lbz));
          var lObs=lgObsPen(lsx,lsz,1.15)+lgObsPen(lbx,lbz,1.05);
          var lCam=0;
          if(lgStallCam && stallProbe){
            stallProbe.set(lbx,base+1.1,lbz).project(lgStallCam);
            if(stallProbe.z<-1 || stallProbe.z>1 || stallProbe.x<-.84 || stallProbe.x>.20 || stallProbe.y<-.36 || stallProbe.y>.34) lCam+=3000;
          }
          var lSc=lDef*8000+lObs+lCam+Math.hypot(lsx-lgRefSX,lsz-lgRefSZ)*2.5;
          if(!bestFit || lSc<bestFit.score) bestFit={score:lSc,side:-1,stallX:lsx,stallZ:lsz,bokX:lbx,bokZ:lbz};
        }
      }
    } else {
      var stallDzTries=isLoopBoard ? [0,-.85,.85,-1.65,1.65,-2.85,2.85,-4.0,4.0] : (stallObs.length ? [0,-.85,.85,-1.65,1.65,-2.85,2.85] : [0]);
      var bsdTries=isLoopBoard ? [1,-1] : [1];
      [side,-side].forEach(function(sd){
        stallDzTries.forEach(function(dzOff,dzi){
          for(var extra=0;extra<=6.01;extra+=.4){
            var sx=shop.x+sd*(3.8+extra), sz=shop.z+STALL_DZ+dzOff;
            for(var bi2=0;bi2<bsdTries.length;bi2++){
              var bsd=sd*bsdTries[bi2], bx=sx-bsd*bokDx, bz=sz+bokDz;
              var deficit=Math.max(0,2.60-minTile(sx,sz))+Math.max(0,(id==='patterns'?2.65:2.30)-minTile(bx,bz));
              var obsPen=stallObsPen(sx,sz,1.2)+stallObsPen(bx,bz,.8);
              var basinPen=(townBasinPoly && (regionPeopleInPoly(townBasinPoly,sx,sz) || regionPeopleInPoly(townBasinPoly,bx,bz))) ? 4500 : 0;
              var sepPen=isLoopBoard ? stallSepPen(sx,sz,bx,bz) : 0;
              var score=deficit*8000+basinPen+obsPen+sepPen+extra+(dzi*.6)+(sd!==side?1.5:0)+(bi2*.8);
              if(!bestFit || score<bestFit.score) bestFit={score:score,side:bsd,stallX:sx,stallZ:sz,bokX:bx,bokZ:bz};
            }
          }
        });
      });
    }
    if(bestFit){ side=bestFit.side; stallX=bestFit.stallX; stallZ=bestFit.stallZ; bokX=bestFit.bokX; bokZ=bestFit.bokZ; }
    // Mario Party 8 artisan market kiosk: stepped plinth, paneled counter with beveled overhang,
    // turned cylindrical posts & brackets, scalloped striped fabric awning, warm lanterns & sculpted regional wares (M4).
    var stall = new T.Group(); stall.position.set(stallX,base,stallZ); root.add(stall);
    function surf(o,kind){
      if(kind && typeof window.reef3dSurface==='function') window.reef3dSurface(o,kind,{scale:2,seed:Math.abs(o.position.x*.7+o.position.z*.9+o.position.y*.5)%7});
      return o;
    }
    function sbox(w,h,d,c,x,y,z,kind){ return surf(box(stall,w,h,d,c,x,y,z),kind); }
    function scyl(rt,rb,h,c,x,y,z,n,kind){
      var seg=n||10;
      return surf(part(stall,geo('c:'+rt+':'+rb+':'+h+':'+seg,function(){ return new T.CylinderGeometry(rt,rb,h,seg); }),c,x,y,z),kind);
    }
    function sball(r,c,x,y,z,kind){ return surf(ball(stall,r,c,x,y,z),kind); }
    var stPal = ({
      lagoon:  { plinth:'#5e6b53', woodDark:'#6a4e37', woodMid:'#94714e', panel:'#d9be8d', top:'#f5e2ba', awnA:'#4da892', awnB:'#fbf0c9', brass:'#e4ba59' },
      caves:   { plinth:'#576270', woodDark:'#5b493f', woodMid:'#7e6757', panel:'#b89d7d', top:'#dec9a6', awnA:'#5c8299', awnB:'#f4dfb4', brass:'#e6bd60' },
      patterns:{ plinth:'#775c7a', woodDark:'#734a5d', woodMid:'#9d6c7e', panel:'#ebd0c8', top:'#f7e4c4', awnA:'#e3889a', awnB:'#fff1d4', brass:'#ebc264' },
      beach:   { plinth:'#6c7a7c', woodDark:'#78583c', woodMid:'#a87f54', panel:'#ebd3a9', top:'#f8e4be', awnA:'#d67e4f', awnB:'#fdf2ce', brass:'#e4b95a' },
      light:   { plinth:'#5f6c68', woodDark:'#5e4b3c', woodMid:'#7d8b79', panel:'#dde0c4', top:'#f7e6bd', awnA:'#cf5e52', awnB:'#fff4d4', brass:'#e8be5a' },
      captain: { plinth:'#3c4d5e', woodDark:'#4c3b32', woodMid:'#5d7184', panel:'#c7b592', top:'#f0d9a8', awnA:'#3b6788', awnB:'#f6e2a8', brass:'#e5ba56' },
      town:    { plinth:'#685241', woodDark:'#6e4b38', woodMid:'#9b6b4e', panel:'#e4c599', top:'#f5e0b8', awnA:'#cf6b52', awnB:'#fdf0cc', brass:'#e4b958' }
    })[id] || { plinth:colors[2], woodDark:colors[2], woodMid:colors[0], panel:colors[1], top:colors[1], awnA:colors[0], awnB:colors[1], brass:'#e4b958' };
    // Stepped stone/timber plinth
    sbox(2.12,.12,1.38,stPal.plinth,0,.06,0,id==='caves'?'stone':'timber');
    sbox(1.96,.08,1.24,stPal.woodDark,0,.16,0,'timber');
    // Paneled counter with corner pilasters, recessed wainscoting & apron molding
    sbox(1.84,.62,1.08,stPal.woodMid,0,.51,0,'timber');
    [-.87,-.29,.29,.87].forEach(function(px){ sbox(.10,.62,.10,stPal.woodDark,px,.51,.52,'timber'); });
    [-.58,0,.58].forEach(function(px){ sbox(.44,.40,.05,stPal.panel,px,.51,.54,'timber'); });
    [-.92,.92].forEach(function(px){ sbox(.05,.40,.72,stPal.panel,px,.51,0,'timber'); });
    sbox(1.94,.08,1.18,stPal.woodDark,0,.80,0,'timber');
    // 2-tier beveled overhanging counter top (top surface y = 0.99)
    sbox(2.02,.06,1.26,stPal.woodMid,0,.87,0,'timber');
    sbox(2.14,.09,1.36,stPal.top,0,.945,0,id==='caves'?'stone':'timber');
    // 4 turned cylindrical posts with collar rings, brackets & fascia header beams
    [-.88,.88].forEach(function(px){
      scyl(.062,.074,1.48,stPal.woodDark,px,1.73,-.46,10,'timber');
      scyl(.095,.105,.07,stPal.woodMid,px,1.025,-.46,10,'timber');
      scyl(.084,.084,.05,stPal.brass,px,1.65,-.46,10,false);
      scyl(.10,.078,.08,stPal.woodMid,px,2.43,-.46,10,'timber');
      scyl(.056,.068,1.26,stPal.woodDark,px,1.62,.48,10,'timber');
      scyl(.090,.098,.07,stPal.woodMid,px,1.025,.48,10,'timber');
      scyl(.095,.074,.07,stPal.woodMid,px,2.22,.48,10,'timber');
      var br=sbox(.055,.34,.055,stPal.woodDark,px-(px>0?.14:-.14),2.10,.48,'timber');
      br.rotation.z=px>0?-.78:.78;
      var rf=sbox(.07,.08,1.16,stPal.woodDark,px,2.34,.01,'timber');
      rf.rotation.x=.22;
    });
    sbox(1.94,.10,.09,stPal.woodDark,0,2.22,.48,'timber');
    sbox(1.94,.11,.09,stPal.woodDark,0,2.46,-.46,'timber');
    // Scalloped striped fabric awning (6 alternating panels + 6 rounded half-cylinder front scallops)
    for(var ai=0;ai<6;ai++){
      var ax=(ai-2.5)*.375, ac=ai%2===0?stPal.awnA:stPal.awnB;
      var ap=sbox(.378,.085,1.48,ac,ax,2.40,.07,'fabric'); ap.rotation.x=.22;
      sbox(.378,.13,.07,ac,ax,2.22,.76,'fabric');
      var sc=scyl(.186,.186,.072,ac,ax,2.15,.76,12,'fabric'); sc.rotation.x=Math.PI/2;
    }
    var ridge=scyl(.052,.052,2.38,stPal.woodDark,0,2.57,-.60,10,'timber'); ridge.rotation.z=Math.PI/2;
    [-1.20,1.20].forEach(function(fx){ sball(.085,stPal.brass,fx,2.57,-.60,false); });
    // Warm hanging glowing lanterns under the front eaves
    [-.66,.66].forEach(function(lx){
      scyl(.016,.016,.18,stPal.woodDark,lx,2.10,.58,6,false);
      scyl(.035,.13,.08,stPal.brass,lx,1.99,.58,8,false);
      scyl(.085,.072,.17,'#ffe996',lx,1.88,.58,8,false);
      sball(.055,'#fffbe0',lx,1.88,.58,false);
      scyl(.082,.04,.05,stPal.brass,lx,1.78,.58,8,false);
    });
    // Sculpted region-specific display wares on counter top (y = 0.99)
    if(id==='lagoon'){
      // Rolled ribboned scrolls pyramid
      [[-.62,1.055,.16,'#cf635a'],[-.46,1.055,.16,'#4da892'],[-.54,1.165,.16,'#e4b958']].forEach(function(scSpec){
        var sr=scyl(.065,.065,.42,'#f7ebd0',scSpec[0],scSpec[1],scSpec[2],10,'fabric'); sr.rotation.x=Math.PI/2;
        var rb=scyl(.072,.072,.055,scSpec[3],scSpec[0],scSpec[1],scSpec[2],10,false); rb.rotation.x=Math.PI/2;
      });
      // Stacked colorful storybooks
      [['#3e8e85',1.035,.06,.08],['#d46c5e',1.12,.04,-.12],['#5a6ea8',1.205,.08,.18]].forEach(function(bk){
        var cv=sbox(.34,.08,.26,bk[0],.10,bk[1],bk[2],'timber'); cv.rotation.y=bk[3];
        var pg=sbox(.30,.055,.22,'#fff7e2',.11,bk[1],bk[2]+.01,false); pg.rotation.y=bk[3];
      });
      // Standing storybook easel & vertical hanging fabric story banners
      var eas=sbox(.28,.32,.05,'#c96754',.60,1.15,.08,'timber'); eas.rotation.x=-.28; eas.rotation.y=-.25;
      var easP=sbox(.22,.26,.04,'#fff8e6',.60,1.15,.10,false); easP.rotation.x=-.28; easP.rotation.y=-.25;
      [-.46,.46].forEach(function(bx,bi){
        var dw=scyl(.024,.024,.44,stPal.woodDark,bx,2.04,-.43,8,'timber'); dw.rotation.z=Math.PI/2;
        sbox(.34,.62,.04,bi?'#e2836a':'#4ea896',bx,1.72,-.43,'fabric');
        var tip=scyl(0,.17,.16,bi?'#e2836a':'#4ea896',bx,1.33,-.43,4,'fabric'); tip.rotation.z=Math.PI; tip.rotation.y=Math.PI/4;
        sball(.07,'#fff3cc',bx,1.74,-.40,false);
      });
    } else if(id==='caves'){
      // Warm carved stone dish + glowing faceted hex crystal cluster (NO cold ice cube!)
      scyl(.30,.24,.08,'#5b6775',-.46,1.03,.12,8,'stone');
      [[0,0,.38,.075,'#78f5ec',0,0],[-.12,.08,.28,.058,'#c5a6ff',.18,.24],[.12,.06,.30,.060,'#98ffee',-.14,-.22],[.02,-.10,.24,.052,'#ffd97d',.22,-.10]].forEach(function(cr){
        var sh=scyl(cr[3]*.78,cr[3],cr[2],cr[4],-.46+cr[0],1.06+cr[2]/2,.12+cr[1],6,false); sh.rotation.x=cr[5]; sh.rotation.z=cr[6];
        var tp=scyl(0,cr[3]*.78,.11,'#edffff',-.46+cr[0]-Math.sin(cr[6])*cr[2]*.5,1.06+cr[2]+.04,.12+cr[1]+Math.sin(cr[5])*cr[2]*.5,6,false); tp.rotation.x=cr[5]; tp.rotation.z=cr[6];
      });
      // Warm amber geode lantern on right
      scyl(.24,.28,.16,'#5e534a',.44,1.07,.14,8,'stone');
      sball(.16,'#ffcf66',.44,1.21,.14,false);
      sball(.09,'#fff4c2',.44,1.25,.18,false);
      scyl(.06,.11,.14,'#ffcf66',.04,1.06,.18,6,false);
      scyl(0,.06,.09,'#fff3c2',.04,1.17,.18,6,false);
    } else if(id==='patterns'){
      // Sculpted coral fans & luminous pearl jars
      scyl(.22,.26,.07,'#856e87',-.52,1.025,.12,8,'stone');
      [-.38,0,.38].forEach(function(ang,fi){
        var fan=sbox(.11,.36,.04,fi===1?'#f497ad':'#c99be8',-.52+ang*.32,1.22,.12,false); fan.rotation.z=-ang*.75;
        sball(.075,'#ffd4df',-.52+ang*.44,1.38,.12,false);
      });
      [[.12,'#88e0d8'],[.40,'#f7b8cc'],[.66,'#ffe194']].forEach(function(jr){
        scyl(.09,.10,.22,'#e9f6f4',jr[0],1.10,.14,10,false);
        sball(.065,jr[1],jr[0],1.12,.14,false);
        scyl(.06,.065,.06,'#b58052',jr[0],1.23,.14,8,'timber');
      });
    } else if(id==='beach'){
      // Woven basket of corked message bottles + sealed letters
      scyl(.28,.21,.22,'#c89b61',-.42,1.10,.12,12,'timber');
      scyl(.29,.29,.05,'#a87b45',-.42,1.21,.12,12,'timber');
      [[-.50,.10,-.22,'#74d8cf'],[-.34,.14,.20,'#8de3b8'],[-.42,.04,.05,'#72c9e0']].forEach(function(bt){
        var b1=scyl(.052,.062,.24,bt[3],bt[0],1.27,bt[1],8,false); b1.rotation.z=bt[2];
        var nk=scyl(.026,.038,.09,bt[3],bt[0]-bt[2]*.14,1.41,bt[1],8,false); nk.rotation.z=bt[2];
        var ck=scyl(.024,.024,.05,'#b8824e',bt[0]-bt[2]*.18,1.47,bt[1],8,'timber'); ck.rotation.z=bt[2];
      });
      var env=sbox(.34,.05,.22,'#fff3d4',.36,1.02,.18,false); env.rotation.y=-.18;
      sball(.045,'#e06a48',.36,1.055,.18,false);
      sball(.10,'#f6b6be',.66,1.04,.08,false);
    } else if(id==='captain'){
      // Brass spyglass on cradle + mini brass-bound treasure chest + nautical chart
      sbox(.06,.12,.14,stPal.woodDark,-.58,1.05,.14,'timber');
      sbox(.06,.12,.14,stPal.woodDark,-.30,1.05,.14,'timber');
      var sg=scyl(.058,.036,.48,stPal.brass,-.44,1.13,.14,10,false); sg.rotation.z=Math.PI/2;
      var sgGrip=scyl(.054,.050,.20,'#6e432c',-.44,1.13,.14,10,'timber'); sgGrip.rotation.z=Math.PI/2;
      sbox(.42,.20,.28,'#7c4e32',.40,1.09,.12,'timber');
      var lid=scyl(.14,.14,.42,'#8d5b3b',.40,1.19,.12,10,'timber'); lid.rotation.z=Math.PI/2;
      [-.13,.13].forEach(function(cx2){ sbox(.045,.26,.30,stPal.brass,.40+cx2,1.12,.12,false); });
      sbox(.07,.07,.05,'#ffe17d',.40,1.15,.27,false);
      var ch=scyl(.055,.055,.34,'#f8ebd0',-.02,1.045,.18,10,'fabric'); ch.rotation.x=Math.PI/2;
    } else if(id==='light'){
      // Miniature brass beacon & coastal flower pitcher
      scyl(.16,.20,.08,stPal.brass,-.44,1.03,.14,10,false);
      scyl(.11,.12,.22,'#ffe98f',-.44,1.18,.14,10,false);
      sball(.07,'#fffbe0',-.44,1.18,.14,false);
      scyl(0,.15,.14,'#cf5e52',-.44,1.35,.14,10,false);
      scyl(.11,.15,.24,'#e9dec4',.38,1.11,.14,10,'stone');
      [[-.09,.04,'#f27d72'],[.09,.05,'#ffe066'],[0,-.08,'#fff8e6'],[.02,.10,'#f49ab4'],[-.06,-.04,'#68b86e'],[.08,-.04,'#5aa665']].forEach(function(fl){
        sball(.075,fl[2],.38+fl[0],1.28+Math.abs(fl[0])*.2,.14+fl[1],false);
      });
    } else {
      // Town: slatted fish crate & woven bread basket
      sbox(.48,.20,.34,'#a97b4c',-.44,1.09,.12,'timber');
      sbox(.42,.08,.28,'#755233',-.44,1.16,.12,'timber');
      [-.52,-.36].forEach(function(fx){
        var fsh=sball(.085,'#7eb6d4',fx,1.21,.12,false); fsh.scale.set(.7,.6,1.6);
      });
      scyl(.24,.19,.16,'#c89c62',.38,1.07,.14,12,'timber');
      [[-.07,.03,'#dfa154'],[.08,.04,'#ecc074'],[0,-.06,'#d9964a']].forEach(function(br){
        var lv=sball(.09,br[2],.38+br[0],1.18,.14+br[1],false); lv.scale.set(1.1,.72,1.2);
      });
      scyl(.065,.09,.22,'#d47d5a',.02,1.10,.16,10,'stone');
    }
    var stallPos=stall.position.clone(); root.remove(stall); stall.position.set(0,0,0);
    stall=reef3dMerge(stall,view.rig,view.bake); stall.position.copy(stallPos);
    if(lhShopLand && (lhShopLand.ux || lhShopLand.uz)) stall.rotation.y=Math.atan2(-lhShopLand.ux,-lhShopLand.uz);
    root.add(stall);
    view._shopPos = { x: stall.position.x, z: stall.position.z };
    // Bok is a pufferfish merchant: smooth plush body, fins, big glossy eyes, teal overalls and cap.
    var TEAL='#3fa9b5', IRIS='#16242c';
    var actor = new T.Group(); actor.position.set(bokX,base,bokZ); root.add(actor);
    function smooth(parent,r,c,x,y,z){ return part(parent,geo('ss:'+r,function(){ return new T.SphereGeometry(r,28,20); }),c,x,y,z); }
    function dome(parent,r,c,x,y,z){ return part(parent,geo('dome:'+r,function(){ return new T.SphereGeometry(r,28,14,0,Math.PI*2,0,Math.PI/2); }),c,x,y,z); }
    var iris=mat(IRIS); if(iris && iris.roughness!==undefined){ iris.roughness=.12; if(iris.metalness!==undefined) iris.metalness=.1; }
    smooth(actor,.65,'#f6c768',0,1.14,0);
    var belly=smooth(actor,.45,'#fff0ba',0,1.0,.26);
    [-1,1].forEach(function(d){
      var fin=smooth(actor,.27,'#df9355',d*.6,1.18,.02); fin.scale.set(.45,.85,.7);
      smooth(actor,.21,'#fff9de',d*.23,1.34,.5);
      var pupil=smooth(actor,.115,IRIS,d*.23,1.34,.66);
      smooth(actor,.032,'#ffffff',d*.23-d*.04,1.34+.05,.66+.104);
      smooth(actor,.016,'#ffffff',d*.23+d*.04,1.34-.04,.66+.105);
    });
    // Teal overalls: lower shell, bib, straps and buttons.
    var shell=smooth(actor,.68,TEAL,0,.88,0); shell.scale.set(1,.6,1);
    var bib=box(actor,.6,.48,.1,TEAL,0,.98,.71); bib.rotation.x=-.1;
    [-1,1].forEach(function(d){
      var strap=box(actor,.09,.6,.08,TEAL,d*.22,1.22,.5); strap.rotation.x=.55;
      smooth(actor,.045,'#ffe694',d*.22,1.12,.76);
    });
    // Rounded dome cap with a soft brim.
    dome(actor,.5,TEAL,0,1.56,-.02);
    var brim=smooth(actor,.3,TEAL,0,1.6,.42); brim.scale.set(1.15,.14,.85);
    smooth(actor,.06,'#ffe694',0,2.06,-.02);
    var beak=smooth(actor,.043,'#935c42',0,1.0,.735); beak.scale.set(1,.48,.35);
    smooth(actor,.12,'#df9355',0,1.1,.5);
    var arm=smooth(actor,.21,'#df9355',side*.66,1.36,.18); arm.scale.set(.48,.9,.55);
    // The visible body and cap carry the action.
    actor.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='shop'; });
    stall.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='shop'; });
    regionPeopleCacheBounds(actor);
    if(isLoopBoard && id==='town'){
      actor.userData.boardYaw=1.45;
      actor.userData.boardYOffset=-1.35;
    } else if(isLoopBoard && id==='lagoon'){
      var lgBokCam=regionPeopleCamAt(view,regionPeopleStartIndex(view)) || stallCam;
      if(lgBokCam && lgBokCam.position && lgBokCam.position.lengthSq()>.01){
        actor.userData.boardYaw=Math.atan2(lgBokCam.position.x-bokX,lgBokCam.position.z-bokZ);
      }
      actor.userData.boardYOffset=-1.20;
    } else if(isLoopBoard && id==='beach'){
      var bhBokCam=stallCam || regionPeopleCamAt(view,shop.i);
      actor.userData.boardYaw=(bhBokCam && bhBokCam.position && bhBokCam.position.lengthSq()>.01)
        ? Math.atan2(bhBokCam.position.x-bokX,bhBokCam.position.z-bokZ)*.85 : .32;
      // iter32 MIN 7: Float Bok buoyantly in real open turquoise bay water (waterY = -0.64).
      actor.userData.boardYOffset=-1.16;
    } else if(isLoopBoard && id==='caves'){
      // m6 assist: Orient Bok 3/4 toward the 09-caves camera so his face reads cleanly and his pectoral fin never projects as an edge-on spike.
      var cvBokB=actor.userData.regionBounds;
      var cvBokMinY=cvBokB ? ((cvBokB.centerY||0)-(cvBokB.height||0)*.5) : 0;
      var cvBokCam=stallCam || regionPeopleCamAt(view,shop.i);
      if(cvBokCam && cvBokCam.position && cvBokCam.position.lengthSq()>.01){
        actor.userData.boardYaw=Math.atan2(cvBokCam.position.x-bokX,cvBokCam.position.z-bokZ)-.22;
      }
      actor.userData.boardYOffset=-.26-cvBokMinY-(shop.y||0);
    } else if(isLoopBoard && id==='captain'){
      var cbB=actor.userData.regionBounds;
      var cbMinY=cbB ? ((cbB.centerY||0)-(cbB.height||0)*.5) : 0;
      var capBokCam=regionPeopleCamAt(view,regionPeopleStartIndex(view)) || stallCam || regionPeopleCamAt(view,shop.i);
      if(capBokCam && capBokCam.position && capBokCam.position.lengthSq()>.01){
        actor.userData.boardYaw=Math.atan2(capBokCam.position.x-bokX,capBokCam.position.z-bokZ);
      }
      actor.userData.boardYOffset=.22-cbMinY-(shop.y||0);
    } else if(lhShopLand){
      // Giant Spiral Lighthouse: seat Bok flush at true 3D shopLanding.floorY on the cantilevered oak merchant balcony,
      // warmly angled 3/4 toward both the ascending stairs (shop) and opening rotunda view (spaces[0]).
      var lhBokB=actor.userData.regionBounds;
      var lhBokMinY=lhBokB ? ((lhBokB.centerY||0)-(lhBokB.height||0)*.5) : .472;
      var lhStartSp=(view.spaces && view.spaces[0]) || shop;
      actor.userData.boardYaw=Math.atan2((shop.x*.45+lhStartSp.x*.55)-bokX,(shop.z*.45+lhStartSp.z*.55)-bokZ);
      actor.userData.boardYOffset=-lhBokMinY+.032;
    }
    regionPeopleTrackPlaced(view,actor,shop,actor.position.x,actor.position.z,actor.userData.regionBounds.radius);
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
          cyl(parent,.105,.09,.18,'#fff7e7',.25,1.0,.20);
          part(parent,geo('marine-cup-handle',function(){ return new T.TorusGeometry(.055,.016,5,10); }),accent,.37,1.0,.20);
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
          if(personId==='restaurant' && d===1){ fin.rotation.x=-.35; fin.position.z=.22; }
          oval(.18,body,d*.26,sleek||personId==='restaurant'?.063:.12,-.21,1,.35,1.25);
          if(!sleek) oval(.09,body,d*.27,1.73,-.02,.75,.67,.55);
          if(large){ line(d*.08,1.26,.48,d*.12,.98,.52,.035,belly); }
          else { line(d*.12,1.35,.48,d*.32,1.39,.5,.009,dark); line(d*.12,1.31,.48,d*.32,1.27,.5,.009,dark); }
        });
        if(sleek){ var tail=oval(.23,body,0,.085,-.66,1.5,.35,.8); tail.rotation.y=.3; }
        else oval(.16,body,0,.25,-.64,.8,.45,1.8);
        if(personId==='restaurant'){
          cyl(parent,.19,.19,.035,accent,.46,.67,.22);
          cyl(parent,.13,.13,.025,'#fff8df',.46,.70,.22);
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
          box(parent,.48,.10,.07,accent,0,.72,.36);
          var rayScarf=box(parent,.11,.24,.08,accent,.14,.60,.38); rayScarf.rotation.z=.15;
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
          oval(.2,accent,0,1.41,.08,1.2,.22,.67);
          box(parent,.27,.03,.13,accent,0,1.37,.32);
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
          box(parent,.13,.13,.025,'#fff8e6',.11,1.18,.22);
          box(parent,.025,.09,.031,accent,.11,1.18,.245);
          box(parent,.09,.025,.031,accent,.11,1.18,.25);
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
    if(id==='captain' && view.spaces.length){
      var capStart=view.spaces[regionPeopleStartIndex(view)];
      if(capStart){
        var nearDeck=null, nearDist=Infinity;
        view.spaces.forEach(function(s){
          if(s.kind!=='deck' || s.practice || !s.item || !s.item.d || !s.item.d.regionActivity) return;
          var d=Math.hypot(s.x-capStart.x,s.z-capStart.z);
          if(d<nearDist){ nearDist=d; nearDeck=s; }
        });
        if(nearDeck && nearDist<9.5) deck=nearDeck;
      }
    }
    if(id==='lagoon' && shop && view.spaces.length){
      var nearLagDeck=null, nearLagDist=Infinity;
      view.spaces.forEach(function(s){
        if(s.kind!=='deck' || s.practice || !s.item || !s.item.d || !s.item.d.regionActivity) return;
        var d=Math.hypot(s.x-shop.x,s.z-shop.z);
        if(d<nearLagDist){ nearLagDist=d; nearLagDeck=s; }
      });
      if(nearLagDeck) deck=nearLagDeck;
    }
    var marker=null, markerSpace=null, towns=[], hostShadow=null, extraShadows=[];
    var townShadowTex=null, townShadowGeo=null;
    function addStreetShadow(targetActor, ySurf, opacity, opts){
      if(!isLoopBoard || typeof document==='undefined' || typeof document.createElement!=='function') return null;
      var tex=null;
      if(opts && Array.isArray(opts.stops)){
        var ccv=document.createElement('canvas');
        var cctx=ccv && typeof ccv.getContext==='function' ? ccv.getContext('2d') : null;
        if(!cctx) return null;
        ccv.width=128; ccv.height=128;
        var cgr=cctx.createRadialGradient(64,64,6,64,64,62);
        opts.stops.forEach(function(st){ cgr.addColorStop(st[0],st[1]); });
        cctx.fillStyle=cgr; cctx.fillRect(0,0,128,128);
        tex=new T.CanvasTexture(ccv);
        if(!townShadowGeo){ townShadowGeo=new T.PlaneGeometry(2,2); townShadowGeo.rotateX(-Math.PI/2); }
      } else {
        if(!townShadowTex){
          var scv=document.createElement('canvas');
          var sctx=scv && typeof scv.getContext==='function' ? scv.getContext('2d') : null;
          if(!sctx) return null;
          scv.width=128; scv.height=128;
          var sgr=sctx.createRadialGradient(64,64,8,64,64,62);
          sgr.addColorStop(0,'rgba(36,26,16,0.92)');
          sgr.addColorStop(.42,'rgba(36,26,16,0.58)');
          sgr.addColorStop(.74,'rgba(36,26,16,0.18)');
          sgr.addColorStop(1,'rgba(36,26,16,0.0)');
          sctx.fillStyle=sgr; sctx.fillRect(0,0,128,128);
          townShadowTex=new T.CanvasTexture(scv);
          if(!townShadowGeo){ townShadowGeo=new T.PlaneGeometry(2,2); townShadowGeo.rotateX(-Math.PI/2); }
        }
        tex=townShadowTex;
      }
      var smat=new T.MeshBasicMaterial({map:tex,transparent:true,opacity:opacity==null?.48:opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      var smesh=new T.Mesh(townShadowGeo,smat);
      smesh.position.y=ySurf;
      smesh.renderOrder=2;
      smesh.raycast=function(){};
      smesh.userData.isContactShadow=true;
      if(opts && opts.shadowScale!=null) smesh.userData.shadowScale=opts.shadowScale;
      if(opts && typeof opts.shadowFwd==='number') smesh.userData.shadowFwd=opts.shadowFwd;
      targetActor.userData.contactShadow=smesh;
      regionPeopleSyncShadow(targetActor);
      extraShadows.push(smesh);
      root.add(smesh);
      return smesh;
    }
    function addWaterRipple(targetActor, ySurf, opts){
      if(!isLoopBoard || typeof document==='undefined' || typeof document.createElement!=='function') return null;
      var wrCv=document.createElement('canvas');
      var wrCtx=wrCv && typeof wrCv.getContext==='function' ? wrCv.getContext('2d') : null;
      if(!wrCtx) return null;
      wrCv.width=128; wrCv.height=128;
      var wrGr=wrCtx.createRadialGradient(64,64,20,64,64,62);
      if(opts && Array.isArray(opts.stops)){
        opts.stops.forEach(function(st){ wrGr.addColorStop(st[0],st[1]); });
      } else {
        wrGr.addColorStop(0,'rgba(22,82,112,0.34)');
        wrGr.addColorStop(.48,'rgba(22,82,112,0.22)');
        wrGr.addColorStop(.68,'rgba(242,253,255,0.88)');
        wrGr.addColorStop(.82,'rgba(220,252,255,0.52)');
        wrGr.addColorStop(1,'rgba(220,252,255,0.0)');
      }
      wrCtx.fillStyle=wrGr; wrCtx.fillRect(0,0,128,128);
      var wrTex=new T.CanvasTexture(wrCv);
      var wrGeo=new T.PlaneGeometry(2,2); wrGeo.rotateX(-Math.PI/2);
      var wrMat=new T.MeshBasicMaterial({map:wrTex,transparent:true,opacity:opts&&opts.opacity!=null?opts.opacity:.78,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      var wrMesh=new T.Mesh(wrGeo,wrMat);
      wrMesh.position.y=ySurf;
      wrMesh.renderOrder=2;
      wrMesh.raycast=function(){};
      wrMesh.userData.isWaterRipple=true;
      if(opts && typeof opts.rippleFwd==='number') wrMesh.userData.rippleFwd=opts.rippleFwd;
      if(opts && opts.rippleScale!=null) wrMesh.userData.rippleScale=opts.rippleScale;
      targetActor.userData.contactShadow=wrMesh;
      regionPeopleSyncShadow(targetActor);
      extraShadows.push(wrMesh);
      root.add(wrMesh);
      return wrMesh;
    }
    if(isLoopBoard && id==='town'){
      // Translucent white waterline foam ripple ring grounding Bok naturally IN the harbor water (M2).
      addWaterRipple(actor,-.605,{rippleFwd:.28,rippleScale:1.00,opacity:.82});
    } else if(isLoopBoard && id==='lagoon'){
      // MIN 12: Crisp translucent foam water-ripple ring grounding Bok buoyantly in open turquoise lagoon water (> max wave crest -0.582).
      addWaterRipple(actor,-.576,{rippleFwd:.14,rippleScale:1.28,opacity:.90});
    } else if(isLoopBoard && id==='beach'){
      // iter32 MIN 7: Crisp white-foam water ripple ring grounding Bok buoyantly in real open turquoise bay water (> max wave crest -0.582).
      addWaterRipple(actor,-.574,{
        rippleFwd:.14,
        rippleScale:1.26,
        opacity:.92,
        stops:[
          [0,'rgba(16,86,118,0.36)'],
          [.44,'rgba(22,102,134,0.22)'],
          [.64,'rgba(250,255,255,0.96)'],
          [.76,'rgba(232,253,255,0.72)'],
          [.88,'rgba(196,248,255,0.28)'],
          [1,'rgba(196,248,255,0.0)']
        ]
      });
    } else if(isLoopBoard && id==='caves'){
      var cvT=window.THREE;
      if(cvT){
        var caveBokBasin=new cvT.Group();
        caveBokBasin.position.set(actor.position.x,-0.312,actor.position.z);
        var cbPed=new cvT.Mesh(new cvT.CylinderGeometry(1.06,1.16,0.10,22),new cvT.MeshToonMaterial({color:'#39546e',gradientMap:view.kit&&view.kit.grad}));
        cbPed.position.y=0.02; caveBokBasin.add(cbPed);
        var cbRim=new cvT.Mesh(new cvT.TorusGeometry(1.02,0.09,8,22),new cvT.MeshToonMaterial({color:'#4c6b86',gradientMap:view.kit&&view.kit.grad}));
        cbRim.rotation.x=Math.PI/2; cbRim.position.y=0.06; caveBokBasin.add(cbRim);
        var cbPool=new cvT.Mesh(new cvT.CircleGeometry(0.98,22),new cvT.MeshBasicMaterial({color:'#3fd2e0',transparent:true,opacity:0.90}));
        cbPool.rotation.x=-Math.PI/2; cbPool.position.y=0.072; caveBokBasin.add(cbPool);
        var cbRing=new cvT.Mesh(new cvT.TorusGeometry(0.68,0.026,6,20),new cvT.MeshBasicMaterial({color:'#a8fdff',transparent:true,opacity:0.86}));
        cbRing.rotation.x=Math.PI/2; cbRing.position.y=0.076; caveBokBasin.add(cbRing);
        caveBokBasin.userData.isContactShadow=true; caveBokBasin.userData.isFixedBasin=true;
        actor.userData.contactShadow=caveBokBasin; regionPeopleSyncShadow(actor); extraShadows.push(caveBokBasin); root.add(caveBokBasin);
      }
    } else if(isLoopBoard && id==='captain'){
      var cbB=actor.userData.regionBounds;
      var cbMinY=cbB ? ((cbB.centerY||0)-(cbB.height||0)*.5) : 0;
      var capBokCam=regionPeopleCamAt(view,regionPeopleStartIndex(view)) || stallCam || regionPeopleCamAt(view,shop.i);
      if(capBokCam && capBokCam.position && capBokCam.position.lengthSq()>.01){
        actor.userData.boardYaw=Math.atan2(capBokCam.position.x-bokX,capBokCam.position.z-bokZ);
      }
      actor.userData.boardYOffset=.22-cbMinY-(shop.y||0);
    } else if(lhShopLand){
      // Warm contact shadow grounding Bok solidly on the elevated oak merchant balcony at true 3D shop.y.
      addStreetShadow(actor,base+.012,.50,{shadowScale:[1.18,1.12]});
    } else if(isLoopBoard && id==='captain'){
      var tbT=window.THREE;
      if(tbT){
        var capTub=new tbT.Group();
        capTub.position.set(actor.position.x,-0.118,actor.position.z);
        var oakMat=new tbT.MeshToonMaterial({color:'#6b4428',gradientMap:view.kit&&view.kit.grad});
        var darkOakMat=new tbT.MeshToonMaterial({color:'#52321c',gradientMap:view.kit&&view.kit.grad});
        var brassMat=new tbT.MeshToonMaterial({color:'#e2b652',gradientMap:view.kit&&view.kit.grad});
        var tubBody=new tbT.Mesh(new tbT.CylinderGeometry(0.86,0.78,0.56,20),oakMat);
        tubBody.position.y=0.28; capTub.add(tubBody);
        [0.16,0.42].forEach(function(hy){
          var hp=new tbT.Mesh(new tbT.TorusGeometry(0.85,0.042,8,24),brassMat);
          hp.rotation.x=Math.PI/2; hp.position.y=hy; capTub.add(hp);
        });
        var tubRim=new tbT.Mesh(new tbT.TorusGeometry(0.86,0.058,8,24),darkOakMat);
        tubRim.rotation.x=Math.PI/2; tubRim.position.y=0.55; capTub.add(tubRim);
        var tubWat=new tbT.Mesh(new tbT.CircleGeometry(0.82,24),new tbT.MeshBasicMaterial({color:'#3dc8d0',transparent:true,opacity:0.90}));
        tubWat.rotation.x=-Math.PI/2; tubWat.position.y=0.52; capTub.add(tubWat);
        var tubRip=new tbT.Mesh(new tbT.TorusGeometry(0.56,0.025,6,20),new tbT.MeshBasicMaterial({color:'#aef8fc',transparent:true,opacity:0.85}));
        tubRip.rotation.x=Math.PI/2; tubRip.position.y=0.53; capTub.add(tubRip);
        var tubSh=new tbT.Mesh(new tbT.CircleGeometry(1.06,20),new tbT.MeshBasicMaterial({color:'#160d06',transparent:true,opacity:0.58,depthWrite:false}));
        tubSh.rotation.x=-Math.PI/2; tubSh.position.y=0.008; capTub.add(tubSh);
        capTub.userData.isContactShadow=true; capTub.userData.isFixedBasin=true;
        actor.userData.contactShadow=capTub; regionPeopleSyncShadow(actor); extraShadows.push(capTub); root.add(capTub);
      }
    }
    if(id==='town'){
      // Place hotel-whale before subway-ray so hotel keeps lower-left open basin and subway claims mid-left basin around it.
      var townSpaces=view.spaces.filter(function(s){
        return s.kind==='deck' && !s.practice && s.item && s.item.d && s.item.d.regionActivity;
      }).sort(function(a,b){
        var pa=(a.item.d.regionActivity.id==='hotel' || a.item.d.regionActivity.id==='friend')?0:(a.item.d.regionActivity.id==='subway'?2:1);
        var pb=(b.item.d.regionActivity.id==='hotel' || b.item.d.regionActivity.id==='friend')?0:(b.item.d.regionActivity.id==='subway'?2:1);
        return (pa-pb) || (a.i-b.i);
      });
      townSpaces.forEach(function(s){
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
        var bounds=regionPeopleCacheBounds(npc), where=regionPeoplePlacement(view,s,bounds,person.id==='subway',npc);
        npc.position.set(where.x,s.y||0,where.z);
        if(typeof where.boardYaw==='number') npc.userData.boardYaw=where.boardYaw;
        if(typeof where.boardPitch==='number') npc.userData.boardPitch=where.boardPitch;
        if(typeof where.boardPitchYaw==='number') npc.userData.boardPitchYaw=where.boardPitchYaw;
        if(typeof where.boardYOffset==='number') npc.userData.boardYOffset=where.boardYOffset;
        if(where.labelOffset) npc.userData.labelOffset=where.labelOffset;
        regionPeopleTrackPlaced(view,npc,s,where.x,where.z,bounds.radius);
        root.add(npc);
        // Translucent waterline ripple ring grounding hotel-whale & subway-ray naturally in Harbor Town basin water (M6 / iter19 M2).
        if(person.id==='hotel'){
          // Upright dignified Whale behind concierge desk with crisp horizontal forked flukes & warm eye contact.
          npc.userData.encounterPose={yaw:-.52,pitch:-.14,roll:0,yLift:.10,roomX:-.04,roomZ:.12};
        } else if(person.id==='cafe'){
          // MAJ-2: Compensate cafe-seahorse GLB's built-in -0.58 rad (-33 deg) rest yaw so Seahorse turns down-right directly toward Shelly!
          npc.userData.encounterPose={yaw:.42,pitch:.14,modelForwardFix:true};
        } else if(person.id==='shop'){
          npc.userData.encounterPose={yaw:-.20,pitch:.06,modelForwardFix:true};
        } else if(person.id==='pharmacy'){
          // Seat Pharmacist Shrimp cleanly inside the grounded 3D ceramic apothecary pedestal bowl.
          npc.userData.encounterPose={roomX:-.10,yLift:-.06};
        }
        if(isLoopBoard && person.id==='hotel'){
          addWaterRipple(npc,-.605,{rippleScale:[1.02,1.52],opacity:.76});
        } else if(isLoopBoard && person.id==='subway'){
          addWaterRipple(npc,-.605,{rippleFwd:.10,rippleScale:[1.65,1.25],opacity:.80});
        } else if(isLoopBoard && person.id==='friend'){
          // MAJ-3: Grounded dark oval contact shadow seated cleanly on cobblestones (y = -0.310) beneath friend-seal Sua.
          addStreetShadow(npc,-.310,.78,{
            shadowScale:[1.50,1.40],
            stops:[[0,'rgba(22,18,14,0.94)'],[.46,'rgba(22,18,14,0.84)'],[.68,'rgba(22,18,14,0.56)'],[.85,'rgba(22,18,14,0.22)'],[1,'rgba(22,18,14,0.0)']]
          });
        } else if(isLoopBoard && person.id==='pharmacy'){
          // Shallow ceramic & turquoise apothecary tide-basin mounted in world space (root) so GLB swap never hides it.
          var phT=window.THREE;
          if(phT){
            var phBasin=new phT.Group();
            phBasin.position.set(where.x,-0.308,where.z);
            var phPed=new phT.Mesh(new phT.CylinderGeometry(0.84,0.90,0.08,20),new phT.MeshToonMaterial({color:'#d8c29e',gradientMap:view.kit&&view.kit.grad}));
            phPed.position.y=0.01; phBasin.add(phPed);
            var phRim=new phT.Mesh(new phT.TorusGeometry(0.82,0.10,10,24),new phT.MeshToonMaterial({color:'#efe0c4',gradientMap:view.kit&&view.kit.grad}));
            phRim.rotation.x=Math.PI/2; phRim.position.y=0.05; phBasin.add(phRim);
            var phPool=new phT.Mesh(new phT.CircleGeometry(0.78,24),new phT.MeshBasicMaterial({color:'#4ec9cb',transparent:true,opacity:0.88}));
            phPool.rotation.x=-Math.PI/2; phPool.position.y=0.065; phBasin.add(phPool);
            phBasin.userData.isContactShadow=true;
            phBasin.userData.isFixedBasin=true;
            npc.userData.contactShadow=phBasin;
            regionPeopleSyncShadow(npc);
            extraShadows.push(phBasin);
            root.add(phBasin);
          }
        } else if(isLoopBoard){
          // Soft grounded contact shadow disc beneath every Harbor Town street resident on the cobblestones (m7 / iter19 M1).
          addStreetShadow(npc,-.310,person.id==='cafe'?.38:.48);
        }
        npc.traverse(function(o){ if(o.isMesh) o.userData.regionPerson='town:'+person.id; });
        view.hitables.push(npc); towns.push({ object:npc, space:s, meta:person, skin:skinState });
      });
      towns.sort(function(a,b){ return a.space.i-b.space.i; });
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
      var markerBounds=regionPeopleCacheBounds(marker), markerWhere=regionPeoplePlacement(view,deck,markerBounds,false,marker);
      var markerY=typeof markerWhere.y==='number' ? markerWhere.y : y;
      marker.position.set(markerWhere.x,markerY,markerWhere.z);
      if(typeof markerWhere.boardYaw==='number') marker.userData.boardYaw=markerWhere.boardYaw;
      if(typeof markerWhere.boardPitch==='number') marker.userData.boardPitch=markerWhere.boardPitch;
      if(typeof markerWhere.boardPitchYaw==='number') marker.userData.boardPitchYaw=markerWhere.boardPitchYaw;
      if(typeof markerWhere.boardYOffset==='number') marker.userData.boardYOffset=markerWhere.boardYOffset;
      if(id==='beach' && isLoopBoard){
        var jisuEncY=(typeof markerWhere.boardYOffset==='number' ? markerWhere.boardYOffset : -.44) + 0.045;
        marker.userData.encounterPose={yLift:jisuEncY,allowOutdoor:true};
      }
      if(markerWhere.labelOffset) marker.userData.labelOffset=markerWhere.labelOffset;
      regionPeopleTrackPlaced(view,marker,deck,markerWhere.x,markerWhere.z,markerBounds.radius);
      root.add(marker);
      // Translucent crystal water ripple ring grounding Keeper Hana directly over her crystal tidepool at true 3D space.y.
      if(isLoopBoard && id==='lagoon'){
        var lgMMinY=(markerBounds.centerY||0)-(markerBounds.height||0)*.5;
        marker.userData.boardYOffset=-(markerY)-.56-lgMMinY;
        addWaterRipple(marker,-.565,{rippleFwd:.08,rippleScale:1.18,opacity:.82});
      } else if(isLoopBoard && id==='light'){
        var lhHana=view.spaces && view.spaces.lighthouse && view.spaces.lighthouse.hanaLanding;
        var hanaRippleY=(lhHana && typeof lhHana.y==='number') ? (lhHana.y+.008) : -.262;
        addWaterRipple(marker,hanaRippleY,{rippleFwd:0,rippleScale:1.08,opacity:.52});
      } else if(isLoopBoard && id==='caves'){
        var ecT=window.THREE;
        if(ecT){
          var echoBasin=new ecT.Group();
          echoBasin.position.set(marker.position.x,-0.312,marker.position.z);
          var ebPed=new ecT.Mesh(new ecT.CylinderGeometry(1.52,1.64,0.12,24),new ecT.MeshToonMaterial({color:'#39546e',gradientMap:view.kit&&view.kit.grad}));
          ebPed.position.y=0.02; echoBasin.add(ebPed);
          var ebRim=new ecT.Mesh(new ecT.TorusGeometry(1.48,0.11,8,24),new ecT.MeshToonMaterial({color:'#4c6b86',gradientMap:view.kit&&view.kit.grad}));
          ebRim.rotation.x=Math.PI/2; ebRim.position.y=0.06; echoBasin.add(ebRim);
          var ebPool=new ecT.Mesh(new ecT.CircleGeometry(1.42,24),new ecT.MeshBasicMaterial({color:'#3fd2e0',transparent:true,opacity:0.90}));
          ebPool.rotation.x=-Math.PI/2; ebPool.position.y=0.072; echoBasin.add(ebPool);
          [1.05,0.62].forEach(function(rr){
            var ebR=new ecT.Mesh(new ecT.TorusGeometry(rr,0.030,6,24),new ecT.MeshBasicMaterial({color:'#a8fdff',transparent:true,opacity:0.88}));
            ebR.rotation.x=Math.PI/2; ebR.position.y=0.078; echoBasin.add(ebR);
          });
          echoBasin.userData.isContactShadow=true; echoBasin.userData.isFixedBasin=true;
          marker.userData.contactShadow=echoBasin; regionPeopleSyncShadow(marker); extraShadows.push(echoBasin); root.add(echoBasin);
        }
      }
      // Soft grounded contact shadow disc beneath grounded region hosts (Captain Bay on 06-captains-deck, Jisu on 11-beach).
      if((id==='captain' || id==='beach') && typeof document!=='undefined' && typeof document.createElement==='function'){
        var shCv=document.createElement('canvas');
        var shCtx=shCv && typeof shCv.getContext==='function' ? shCv.getContext('2d') : null;
        if(shCtx){
          shCv.width=128; shCv.height=128;
          var shGr=shCtx.createRadialGradient(64,64,6,64,64,62);
          if(id==='captain'){
            // iter23 Minor #2: Tight warm-dark ambient occlusion hugging strictly beneath Captain Bay's belly & fore-flippers on the wooden planks (zero spill above/behind head).
            shGr.addColorStop(0,'rgba(26,14,6,0.94)');
            shGr.addColorStop(.44,'rgba(26,14,6,0.84)');
            shGr.addColorStop(.66,'rgba(26,14,6,0.50)');
            shGr.addColorStop(.84,'rgba(26,14,6,0.14)');
            shGr.addColorStop(1,'rgba(26,14,6,0.0)');
          } else {
            shGr.addColorStop(0,'rgba(36,22,10,0.92)');
            shGr.addColorStop(.44,'rgba(36,22,10,0.55)');
            shGr.addColorStop(.76,'rgba(36,22,10,0.16)');
            shGr.addColorStop(1,'rgba(36,22,10,0.0)');
          }
          shCtx.fillStyle=shGr; shCtx.fillRect(0,0,128,128);
          var shTex=new T.CanvasTexture(shCv);
          var shGeo=new T.PlaneGeometry(2,2); shGeo.rotateX(-Math.PI/2);
          var shMat=new T.MeshBasicMaterial({map:shTex,transparent:true,opacity:id==='captain'?.58:.62,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
          hostShadow=new T.Mesh(shGeo,shMat);
          hostShadow.position.y=id==='captain'?-.112:-.310;
          hostShadow.renderOrder=2;
          hostShadow.raycast=function(){};
          hostShadow.userData.isContactShadow=true;
          if(id==='captain'){
            hostShadow.userData.shadowScale=[1.26,.94];
            hostShadow.userData.shadowFwd=.44;
          } else if(id==='beach'){
            hostShadow.userData.shadowScale=[1.15,.95];
          }
          marker.userData.contactShadow=hostShadow;
          regionPeopleSyncShadow(marker);
          root.add(hostShadow);
        }
      }
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
    // Keep the docked bottom-right "Meet Bok" pill hidden on idle boards so corners stay completely clean.
    var guide=document.createElement('button'); guide.type='button'; guide.className='r3-person-guide'; guide.innerHTML=ccIcon('bag')+' <span>Meet Bok</span>'; guide.setAttribute('aria-label','Talk with Bok at the '+m.stall);
    guide.hidden=true;
    view.wrap.appendChild(guide);
    meet.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'shop'); });
    guide.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'shop'); });
    if(practice) practice.addEventListener('click',function(e){ e.stopPropagation(); regionPeopleApproach(view,'activity'); });
    var rpState={ root:root, actor:actor, actorBaseY:base, stall:stall, arm:arm, shop:shop, marker:marker, markerSpace:markerSpace, hostShadow:hostShadow, extraShadows:extraShadows, towns:towns, labels:labels, meet:meet, practice:practice, guide:guide, focus:null, hoverPerson:null, hoverLabel:null, focusPerson:null, pointerPerson:null, hoverAt:0, disposed:false,
      hitables:[actor,stall].concat(marker?[marker]:[],towns.map(function(t){ return t.object; })), sourceGeos:geos };
    view.regionPeople=rpState;
    // Hide floating resident label pills on idle boards; reveal ONLY on pointer hover or keyboard/pointer focus.
    function wireLabel(btn, key){
      if(!btn) return;
      regionPeopleSetLabelVis(btn,false,true);
      if(typeof btn.addEventListener!=='function') return;
      btn.addEventListener('focus',function(){
        rpState.focusPerson=key;
        regionPeopleTick(view,typeof performance!=='undefined' && performance.now ? performance.now() : 0);
      });
      btn.addEventListener('blur',function(){
        if(rpState.focusPerson===key){
          rpState.focusPerson=null;
          regionPeopleTick(view,typeof performance!=='undefined' && performance.now ? performance.now() : 0);
        }
      });
      btn.addEventListener('pointerenter',function(){ rpState.hoverLabel=key; });
      btn.addEventListener('pointerleave',function(){ if(rpState.hoverLabel===key) rpState.hoverLabel=null; });
    }
    wireLabel(meet,'shop');
    if(practice) wireLabel(practice,'activity');
    towns.forEach(function(t){ wireLabel(t.button,'town:'+t.meta.id); });
    if(view.wrap && typeof view.wrap.addEventListener==='function'){
      var hoverRay=window.THREE && window.THREE.Raycaster ? new window.THREE.Raycaster() : null;
      var hoverPtr=window.THREE && window.THREE.Vector2 ? new window.THREE.Vector2() : null;
      function pickResident(e){
        if(!hoverRay || !hoverPtr || rpState.disposed || view.parked || view.encounter || view.moving || view.dice || view.leaving) return null;
        var dom=view.renderer && view.renderer.domElement;
        if(!dom || !view.cam || typeof dom.getBoundingClientRect!=='function') return null;
        var rc=dom.getBoundingClientRect();
        if(!rc || !rc.width || !rc.height) return null;
        hoverPtr.set((e.clientX-rc.left)/rc.width*2-1,-((e.clientY-rc.top)/rc.height)*2+1);
        hoverRay.setFromCamera(hoverPtr,view.cam);
        var hits=hoverRay.intersectObjects(rpState.hitables,true);
        for(var hi=0;hi<hits.length;hi++){
          var tag=hits[hi].object && hits[hi].object.userData && hits[hi].object.userData.regionPerson;
          if(tag!=null) return tag;
        }
        return null;
      }
      function onWrapMove(e){
        if(e && e.target && typeof e.target.closest==='function' && e.target.closest('.r3-person-label')) return;
        var tNow=typeof performance!=='undefined' && performance.now ? performance.now() : 0;
        if(tNow && tNow-(rpState.hoverAt||0)<45) return;
        rpState.hoverAt=tNow;
        var hit=pickResident(e);
        if(hit!==rpState.hoverPerson){
          rpState.hoverPerson=hit;
          regionPeopleTick(view,tNow);
        }
      }
      function onWrapLeave(){
        if(rpState.hoverPerson || rpState.hoverLabel){
          rpState.hoverPerson=null; rpState.hoverLabel=null;
          regionPeopleTick(view,typeof performance!=='undefined' && performance.now ? performance.now() : 0);
        }
      }
      function onWrapDown(e){
        if(e && e.target && typeof e.target.closest==='function' && e.target.closest('.r3-person-label')) return;
        rpState.pointerPerson=pickResident(e);
      }
      view.wrap.addEventListener('pointermove',onWrapMove);
      view.wrap.addEventListener('pointerleave',onWrapLeave);
      view.wrap.addEventListener('pointerdown',onWrapDown);
      rpState._cleanup=function(){
        if(view.wrap && typeof view.wrap.removeEventListener==='function'){
          view.wrap.removeEventListener('pointermove',onWrapMove);
          view.wrap.removeEventListener('pointerleave',onWrapLeave);
          view.wrap.removeEventListener('pointerdown',onWrapDown);
        }
      };
    }
    if(typeof regionResidentLoad==='function') regionResidentLoad(view);
  }
  function regionPeopleSetLabelVis(btn,show,keepFocusable){
    if(!btn) return;
    if(!show && !keepFocusable){
      btn.hidden=true;
      if(typeof btn.setAttribute==='function') btn.setAttribute('data-idle-collapsed','true');
      return;
    }
    btn.hidden=false;
    if(typeof btn.setAttribute==='function') btn.setAttribute('data-idle-collapsed',show?'false':'true');
    if(!btn.style) return;
    if(show){
      btn.style.width=''; btn.style.height=''; btn.style.minHeight='';
      btn.style.padding=''; btn.style.borderWidth=''; btn.style.margin='';
      btn.style.overflow=''; btn.style.opacity=''; btn.style.boxShadow='';
      btn.style.pointerEvents=''; btn.style.clipPath=''; btn.style.transform='';
    } else {
      btn.style.left='0px'; btn.style.top='0px'; btn.style.transform='none';
      btn.style.width='0px'; btn.style.height='0px'; btn.style.minHeight='0px';
      btn.style.padding='0px'; btn.style.borderWidth='0px'; btn.style.margin='0px';
      btn.style.overflow='hidden'; btn.style.opacity='0'; btn.style.boxShadow='none';
      btn.style.pointerEvents='none'; btn.style.clipPath='inset(50%)';
    }
  }
  function regionPeopleTick(view,now){
    var p=view && view.regionPeople;
    if(p && p.introAudio && !regionPeopleIntroCurrent(view,p.introAudio)) regionPeopleIntroCancel(view);
    if(!p || p.disposed || view.parked || !view.wrap.isConnected) return;
    if(p.extraShadows && p.extraShadows.length){
      var showRipple=!view.encounter;
      for(var esi=0;esi<p.extraShadows.length;esi++) p.extraShadows[esi].visible=showRipple;
    }
    if(typeof regionResidentTick==='function') regionResidentTick(view,now);
    var pendingTown=typeof S!=='undefined' && S && S.regionBoard && S.regionBoard.pendingTownOpen;
    if(pendingTown && view.region && view.region.id==='town' && !view.encounter && !view.moving && !view.dice && !view.leaving && !view.wrap.querySelector('.r3-panel')){
      if(S.profile && pendingTown.pid===S.profile.id && S.view==='town' && S.regionBoard.mode==='board'){
        S.regionBoard.pendingTownOpen=null;
        view.greetEpoch=(view.greetEpoch||0)+1;
        regionPeopleOpen(view,'town:'+pendingTown.venueId,pendingTown.activity);
        return;
      }
      S.regionBoard.pendingTownOpen=null;
    }
    var panel=!!view.wrap.querySelector('.r3-panel'), busy=!!view.dice || !!view.leaving || !!view.moving || !!view.encounter;
    if(!panel && !view.encounter && view.guide && (!p._proxAt || now - p._proxAt > 50)){
      p._proxAt=now;
      var gx=view.guide.position.x, gz=view.guide.position.z;
      var proxList=[p.actor, p.marker].concat((p.towns||[]).map(function(t){ return t.object; }));
      for(var pi=0; pi<proxList.length; pi++){
        var po=proxList[pi];
        if(!po || po.visible===false || typeof po.userData.boardYaw!=='number') continue;
        var dxP=gx-po.position.x, dzP=gz-po.position.z, dP=Math.hypot(dxP, dzP);
        if(dP<7.5){
          var toSh=Math.atan2(dxP, dzP), restY=po.userData.boardYaw;
          var diffY=Math.atan2(Math.sin(toSh-restY), Math.cos(toSh-restY));
          var wantY=po.userData.hasResidentGlb ? (diffY*0.25) : (restY+diffY*0.32);
          po.rotation.y+=Math.atan2(Math.sin(wantY-po.rotation.y), Math.cos(wantY-po.rotation.y))*0.18;
          if(!po.userData._greetAt || now-po.userData._greetAt>12000){
            po.userData._greetAt=now; po.userData._greetY0=po.position.y;
          }
        } else if(dP>9.0){
          var restTarget=po.userData.hasResidentGlb ? 0 : po.userData.boardYaw;
          var dBack=Math.atan2(Math.sin(restTarget-po.rotation.y), Math.cos(restTarget-po.rotation.y));
          po.rotation.y+=dBack*0.12;
        }
        if(po.userData._greetAt){
          var gp=Math.min(1, (now-po.userData._greetAt)/450);
          if(gp>=1){ po.position.y=po.userData._greetY0; po.userData._greetAt=0; }
          else { po.position.y=po.userData._greetY0+Math.sin(gp*Math.PI)*0.22; }
        }
      }
    }
    var compact=view.w<=600;
    // Docked bottom-right "Meet Bok" pill stays hidden on idle boards for a clean 2-corner HUD.
    if(p.guide) p.guide.hidden=true;
    var w=view.w,h=view.h;
    var candidates=[{key:'shop',button:p.meet,object:p.actor},{key:'activity',button:p.practice,object:p.marker}]
      .concat((p.towns||[]).map(function(t){ return {key:'town:'+t.meta.id,button:t.button,object:t.object}; }))
      .filter(function(t){ return t.object && t.button; });
    if(panel || busy){
      p.hoverPerson=null; p.hoverLabel=null; p.pointerPerson=null;
      candidates.forEach(function(t){ regionPeopleSetLabelVis(t.button,false,false); });
      return;
    }
    var activeKey=p.focusPerson || p.hoverLabel || p.hoverPerson || p.pointerPerson || null;
    if(!activeKey){
      candidates.forEach(function(t){ regionPeopleSetLabelVis(t.button,false,true); });
    } else {
      if(!p.uiRects || now-(p.uiAt||0)>350 || p.uiW!==w || p.uiH!==h){
        if(p.uiW!==w || p.uiH!==h) Array.prototype.forEach.call(p.labels.children,function(b){ b.regionPeopleSize=null; });
        p.wrapRect=typeof view.wrap.getBoundingClientRect==='function' ? view.wrap.getBoundingClientRect() : {left:0,top:0};
        p.uiRects=[]; p.uiAt=now; p.uiW=w; p.uiH=h;
        var board=(typeof view.wrap.closest==='function' && view.wrap.closest('.rb-root')) || view.wrap;
        if(typeof board.querySelectorAll==='function'){
          board.querySelectorAll('.rb-title,.rb-actions,.rb-guide,.r3-hud,.r3-voybtn,.r3-mapbtn,.r3-themebtn,.r3-musicbtn,.r3-gamesbtn,.r3-person-guide').forEach(function(el){
            if(!el.hidden && el.getClientRects && el.getClientRects().length) p.uiRects.push(el.getBoundingClientRect());
          });
        }
      }
      candidates.forEach(function(t){
        if(t.key!==activeKey){ regionPeopleSetLabelVis(t.button,false,true); return; }
        var button=t.button, object=t.object;
        var b=object.userData.regionBounds, yOff=(object.userData && typeof object.userData.boardYOffset==='number') ? object.userData.boardYOffset : 0;
        var lOff=object.userData && object.userData.labelOffset;
        var v=(p.scratchPos || (p.scratchPos=new window.THREE.Vector3())).copy(object.position);
        if(lOff){ v.x+=(lOff.x||0); v.z+=(lOff.z||0); }
        v.y+=(b ? b.top+.65 : 2.2)+yOff+(lOff && lOff.y ? lOff.y : 0);
        if(view.cam) v.project(view.cam);
        var x=(v.x+1)*w/2, y=(1-v.y)*h/2;
        var inFrame=w>0 && h>0 && x>-40 && x<w+40 && v.z>-1 && v.z<1;
        var isFocused=p.focusPerson===t.key;
        if(!inFrame && !isFocused){ regionPeopleSetLabelVis(button,false,true); return; }
        regionPeopleSetLabelVis(button,true,true);
        if(!button.regionPeopleSize && button.offsetWidth)
          button.regionPeopleSize={w:button.offsetWidth,h:button.offsetHeight};
        var bw=button.regionPeopleSize ? button.regionPeopleSize.w : 130, bh=button.regionPeopleSize ? button.regionPeopleSize.h : 44;
        if(compact || !inFrame){ x=w/2; y=compact ? h-86 : Math.max(106,Math.min(h-94,y)); }
        x=Math.max(13+bw/2,Math.min(w-13-bw/2,x));
        y=Math.max(bh+16,Math.min(h-24,y));
        if(button.style){ button.style.left=x+'px'; button.style.top=y+'px'; }
      });
    }
    // Gentle procedural Bok idle motion only when no authored GLB is driving Bok.
    var bokHasGlb=!!(p.residents && p.residents.some(function(r){ return r && r.target && r.target.object===p.actor && r.detailed && r.root; }));
    if(!bokHasGlb && p.actor && p.arm && !(typeof reefCalm==='function' && reefCalm())){
      var t=now*.001, baseY=typeof p.actorBaseY==='number' ? p.actorBaseY : (p.shop.y||0);
      p.actor.position.y=baseY+Math.sin(t*1.7)*.055;
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
    regionPeopleEnsureJisuCamera();
    var p=view && view.regionPeople, m=view && view.region && REGION_PEOPLE[view.region.id];
    if(!p || p.disposed || view.parked || !view.wrap.isConnected || !m || view.dice || view.moving || view.leaving) return false;
    if(view.wrap.querySelector('.r3-panel')) return false;
    var from=document.activeElement;
    var townId=typeof person==='string' && person.indexOf('town:')===0 ? person.slice(5) : null;
    var town=(p.towns||[]).find(function(t){ return t.meta.id===townId; });
    if(townId && !town) return false;
    var activity=forcedActivity || (town ? town.space.item.d.regionActivity : person==='activity' && p.markerSpace && p.markerSpace.item && p.markerSpace.item.d.regionActivity);
    var hostId=(activity && activity.venueId) || townId || (activity && activity.id);
    var host=(activity || townId) ? regionPersonMeta(view.region,hostId) : null;
    var encounterActivity=(activity && activity.venueId) ? { region:activity.region || view.region.id, id:activity.venueId } : (activity || null);
    if(!regionEncounterBegin(view,{region:view.region.id,activity:encounterActivity,
      actor:town ? town.object : activity ? p.marker : p.actor,
      space:town ? town.space : activity ? p.markerSpace : p.shop})) return false;
    if(view.region.id==='beach' && !townId && activity){
      view.camModeWas='encounter'; view.camGlide=0;
      if(view.camPos && view.camLook && typeof regionEncounterCamera==='function'){
        regionEncounterCamera(view, view.camPos, view.camLook);
      }
    }
    p.hoverPerson=null; p.hoverLabel=null; p.pointerPerson=null;
    p.focus=from && view.wrap.contains(from) ? from : p.guide;
    // If an interrupted transition finished offscreen, settle it only when
    // the learner opens this resident again.
    if(town && town.skin && town.skin.pending && !document.hidden){
      town.skin.meshes.forEach(function(mesh){ mesh.attribute.array.set(mesh.palette[town.skin.mode]); mesh.attribute.needsUpdate=true; });
      town.skin.pending=false;
    }
    var isRepair=!!(activity && activity.practice);
    var title=host ? (isRepair ? host.name+' · '+activity.practice.name : host.name) : 'Bok the shopkeeper';
    var body=isRepair ? activity.practice.detail : (host ? host.intro : 'Welcome! I brought a few useful things for your travels. Come have a look.');
    var opening=isRepair ? null : regionPeopleOpening(view.region.id,activity);
    var text=opening ? '<p class="r3-person-text r3-person-opening"><strong lang="ko">'+esc(opening.ko)+'</strong><span>'+esc(opening.en)+'</span><small data-person-audio-status role="status" aria-live="polite"></small></p>' : '<p class="r3-person-text">'+esc(body)+'</p>';
    var first=activity ? '<button type="button" class="r3-btn main" data-person-practice>Talk and practice</button>' : '<button type="button" class="r3-btn main" data-person-shop>Browse goods</button><button type="button" class="r3-btn" data-person-about>About this place</button>';
    if(town && town.meta.id==='shop' && town.skin){
      var colorLabels={ natural:'Show camouflage', camouflage:'Show color display', display:'Show natural color' };
      first+='<button type="button" class="r3-btn" data-octopus-color>'+colorLabels[town.skin.mode]+'</button>';
    }
    if(view.region.id==='beach' && activity && p.marker && p.marker.userData.deliveryMotion) first+='<button type="button" class="r3-btn" data-jisu-delivery>Quick delivery</button>';
    if(opening) first+='<button type="button" class="r3-btn" data-person-listen aria-pressed="false" aria-label="Listen to the Korean opening line">Listen</button>';
    var portrait=host ? regionPersonPortrait(view.region,hostId) : regionMerchantPortrait();
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
    if(p._cleanup){ p._cleanup(); p._cleanup=null; }
    p.disposed=true;
    if(p.dialog) p.dialog.remove();
    if(p.labels) p.labels.remove(); if(p.guide) p.guide.remove();
    if(p.hostShadow && p.hostShadow.material){
      if(p.hostShadow.material.map) p.hostShadow.material.map.dispose();
      p.hostShadow.material.dispose();
    }
    if(p.extraShadows && p.extraShadows.length){
      p.extraShadows.forEach(function(sh){
        if(sh && sh.material){ if(sh.material.map) sh.material.map.dispose(); sh.material.dispose(); }
      });
    }
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
