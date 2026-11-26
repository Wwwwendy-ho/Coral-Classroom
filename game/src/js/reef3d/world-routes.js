/* Insert extra regional stops between old ones, then route the longer circuit. */
function reef3dExpandRegion(legacy, zone, expansion){
  var mainN = legacy.mainN, additions = [];
  var plains = legacy.filter(function(s){ return s.kind === 'plain'; }).length;
  var chance = legacy.filter(function(s){ return s.kind === 'chance'; }).length;
  var events = chance + legacy.filter(function(s){ return s.kind === 'surprise'; }).length;
  var extraEvents = Math.ceil(events * .3);
  var extraChance = Math.min(extraEvents, Math.max(1, Math.round(chance * extraEvents / (events || 1))));
  function add(kind, count, offset, makeSpace){
    for(var i = 0; i < count; i++){
      var space = makeSpace ? makeSpace(i) : {};
      space.kind = kind;
      space.added = true;
      space.positionId = 'extra:' + (space.item ? space.item.d.id : kind + ':' + i);
      additions.push({ order:(i + offset) / count, space:space });
    }
  }
  add('plain', Math.ceil(plains * .3), .18);
  add('surprise', extraEvents - extraChance, .62);
  add('chance', extraChance, .56);
  add('deck', expansion.learning.length, .5, function(i){
    return { item:expansion.learning[i], zone:zone, practice:true };
  });
  additions.sort(function(a, b){ return a.order - b.order; });

  var list = legacy.slice(0, mainN);
  additions.forEach(function(a, i){
    var before = Math.round((i + 1) * mainN / (additions.length + 1));
    list.splice(Math.max(1, before) + i, 0, a.space);
  });
  list.mainN = list.length;
  for(var i = mainN; i < legacy.length; i++) list.push(legacy[i]);
  legacy.forEach(function(s){
    s.positionId = s.kind === 'deck' ? 'deck:' + s.item.d.id : 'route:' + s.i;
  });
  list.forEach(function(s, i){ s.i = i; if(s.y == null) s.y = 0; s.links = []; });
  list.legacyPositions = legacy.map(function(s){ return s.i; });
  list.gateAt = legacy.gateAt < 0 ? -1 : list.legacyPositions[legacy.gateAt];
  function link(a, b){ a.links.push(b.i); b.links.push(a.i); }
  list.forEach(function(s, i){
    if(s.pair != null) s.pair = list.legacyPositions[s.pair];
    if(s.branch){
      s.jn = list.legacyPositions[s.jn];
      var prev = list[i - 1];
      link(s, prev.branch === s.branch ? prev : list[s.jn]);
    } else if(i > 0) link(s, list[i - 1]);
  });
  return list;
}

/* Closed, arc-length sampled board circuits. This changes positions and the
   closing graph edge while keeping space identities and branch ownership. */
window.reef3dWorldRoute = function(spaces, id){
  var n=spaces.mainN, type=id || 'cove';
  if(!n || n<4) return spaces;
  if(type==='light'){
    // Colossal 1.75-turn conical helical spiral staircase ascending inside the sunlit Lighthouse rotunda.
    var turns=1.75, R_start=Math.max(21.5,n*0.56), R_end=R_start-10.5, hTotal=22.0, cx=0, cz=0, theta0=Math.PI*0.5;
    var sDense=[], sLengths=[0], sTotal=0, sCount=1024;
    for(var sk=0;sk<=sCount;sk++){
      var su=sk/sCount, sr=R_start+(R_end-R_start)*su, sa=theta0-su*turns*Math.PI*2;
      var spx=cx+sr*Math.cos(sa), spz=cz+sr*Math.sin(sa);
      sDense.push([spx,spz]);
      if(sk){ sTotal+=Math.hypot(spx-sDense[sk-1][0],spz-sDense[sk-1][1]); sLengths.push(sTotal); }
    }
    var sCur=0;
    for(var si=0;si<n;si++){
      var sTarget=sTotal*si/(n-1);
      while(sCur<sCount-1 && sLengths[sCur+1]<sTarget) sCur++;
      var sf=(sTarget-sLengths[sCur])/(sLengths[sCur+1]-sLengths[sCur] || 1);
      var suY=si/(n-1);
      spaces[si].x=sDense[sCur][0]*(1-sf)+sDense[sCur+1][0]*sf;
      spaces[si].z=sDense[sCur][1]*(1-sf)+sDense[sCur+1][1]*sf;
      // Smooth dramatic helical ascent: steeper initial Turn-1 climb (spaces[4] ~ 2.66, shop ~ 5.83) rising to 22.0
      spaces[si].y=hTotal*suY*(1.30-0.30*suY);
    }
    var sLast=spaces[n-1], sFirst=spaces[0];
    if(sLast.links.indexOf(0)<0) sLast.links.push(0);
    if(sFirst.links.indexOf(n-1)<0) sFirst.links.push(n-1);
    // Level cantilevered balcony branches joining smoothly at fork.y with > 2.64 XZ separation from all spaces.
    var sOccupied=spaces.slice(0,n), sGroups={};
    for(var bi=n;bi<spaces.length;bi++) (sGroups[spaces[bi].branch] || (sGroups[spaces[bi].branch]=[])).push(spaces[bi]);
    Object.keys(sGroups).forEach(function(key){
      var branch=sGroups[key], fork=spaces[branch[0].jn];
      var rf=Math.hypot(fork.x-cx,fork.z-cz), af=Math.atan2(fork.z-cz,fork.x-cx);
      var maxBalcR=R_start-0.4, minBalcR=5.2, bestPts=null, bestScore=-Infinity;
      [1,-1].forEach(function(rDir){
        [3.15,3.5,2.9,3.85].forEach(function(dr){
          var rBalc=rf+rDir*dr;
          if(rBalc<minBalcR || rBalc>maxBalcR) return;
          [-1,1].forEach(function(aDir){
            [2.95,3.2].forEach(function(step){
              var pts=[], dAng=step/rBalc;
              for(var bk=0;bk<branch.length;bk++){
                var ba=af+aDir*bk*dAng;
                pts.push([cx+rBalc*Math.cos(ba),cz+rBalc*Math.sin(ba)]);
              }
              var sc=Infinity;
              for(var p1=0;p1<pts.length;p1++){
                for(var o1=0;o1<sOccupied.length;o1++){
                  var o=sOccupied[o1];
                  var d=Math.hypot(pts[p1][0]-o.x,pts[p1][1]-o.z);
                  if(d<sc) sc=d;
                }
                for(var p2=p1+1;p2<pts.length;p2++){
                  var d2=Math.hypot(pts[p1][0]-pts[p2][0],pts[p1][1]-pts[p2][1]);
                  if(d2<sc) sc=d2;
                }
              }
              if(sc>bestScore){ bestScore=sc; bestPts=pts; }
            });
          });
        });
      });
      if(!bestPts || bestScore<=2.70){
        for(var angI=0;angI<36;angI++){
          var aTry=angI*Math.PI*2/36, ux=Math.cos(aTry), uz=Math.sin(aTry), pts2=[], okR=true, sc2=Infinity;
          for(var bk2=0;bk2<branch.length;bk2++){
            var px=fork.x+ux*2.9*(bk2+1), pz=fork.z+uz*2.9*(bk2+1), pr=Math.hypot(px-cx,pz-cz);
            if(pr<minBalcR || pr>maxBalcR){ okR=false; break; }
            pts2.push([px,pz]);
          }
          if(!okR) continue;
          for(var q1=0;q1<pts2.length;q1++){
            for(var q2=0;q2<sOccupied.length;q2++){
              var d3=Math.hypot(pts2[q1][0]-sOccupied[q2].x,pts2[q1][1]-sOccupied[q2].z);
              if(d3<sc2) sc2=d3;
            }
          }
          if(sc2>bestScore){ bestScore=sc2; bestPts=pts2; }
        }
      }
      branch.forEach(function(s,bk){
        s.x=bestPts[bk][0]; s.z=bestPts[bk][1]; s.y=fork.y;
        sOccupied.push(s);
      });
    });
    var sxs=spaces.map(function(s){return s.x;}), szs=spaces.map(function(s){return s.z;});
    spaces.loop=true;
    spaces.bounds={minX:Math.min.apply(null,sxs),maxX:Math.max.apply(null,sxs),minZ:Math.min.apply(null,szs),maxZ:Math.max.apply(null,szs)};
    var shopSp=spaces.find(function(s){ return s.kind==='shop'; });
    var hanaSp=spaces[Math.min(4,n-1)] || spaces[0], goalSp=spaces[n-1];
    function polarOf(s){
      var r=Math.hypot(s.x-cx,s.z-cz)||1, ux=(s.x-cx)/r, uz=(s.z-cz)/r;
      // Ascending counter-clockwise tangent: theta decreases so d/d(-theta) = (uz, -ux)
      return { r:r, ux:ux, uz:uz, tx:uz, tz:-ux };
    }
    var hp=polarOf(hanaSp), gp=polarOf(goalSp), shp=shopSp ? polarOf(shopSp) : null;
    spaces.lighthouse={
      cx:cx, cz:cz, rBottom:R_start, rTop:R_end, hTotal:hTotal,
      turns:turns, theta0:theta0,
      rWallBase:R_start+5.8, rWallTop:R_start+3.0, hWall:38.0,
      stairWidth:3.5, treadTopOffset:-0.28, floorY:-0.306,
      goalSpace:n-1, shopSpace:shopSp?shopSp.i:-1, bokGalleryY:hTotal,
      hanaLanding:{
        space:hanaSp.i, x:hanaSp.x-hp.ux*3.65, z:hanaSp.z-hp.uz*3.65,
        y:hanaSp.y-0.22, floorY:hanaSp.y-0.28, radius:2.55,
        nx:-hp.ux, nz:-hp.uz
      },
      shopLanding:shopSp ? {
        space:shopSp.i, x:shopSp.x+shp.ux*3.9, z:shopSp.z+shp.uz*3.9,
        stallX:shopSp.x+shp.ux*4.45+shp.tx*0.65, stallZ:shopSp.z+shp.uz*4.45+shp.tz*0.65,
        bokX:shopSp.x+shp.ux*2.95-shp.tx*1.15, bokZ:shopSp.z+shp.uz*2.95-shp.tz*1.15,
        y:shopSp.y, floorY:shopSp.y, radius:3.3,
        ux:shp.ux, uz:shp.uz, tx:shp.tx, tz:shp.tz
      } : null,
      goalGallery:{
        space:goalSp.i, x:goalSp.x+gp.tx*3.4+gp.ux*0.4, z:goalSp.z+gp.tz*3.4+gp.uz*0.4,
        y:hTotal, floorY:hTotal, radius:3.4,
        ux:gp.ux, uz:gp.uz, tx:gp.tx, tz:gp.tz
      }
    };
    return spaces;
  }
  function shape(t){
    var c=Math.cos(t), s=Math.sin(t), r=1, x, z;
    switch(type){
      case 'town':
        r=1+.18*Math.cos(2*t)-.14*Math.sin(3*t);
        x=1.28*r*c+.14*Math.cos(2*t); z=.86*r*s+.14*Math.sin(2*t); break;
      case 'lagoon':
        r=1+.20*Math.sin(3*t+.4)+.12*Math.cos(2*t)-.08*Math.cos(5*t);
        x=1.14*r*c; z=.94*r*s; break;
      case 'caves':
        r=1+.24*Math.cos(t+.6)+.18*Math.sin(2*t)-.08*Math.cos(4*t);
        x=1.18*r*c; z=.90*r*s; break;
      case 'patterns':
        r=1+.18*Math.cos(4*t)+.12*Math.sin(3*t);
        x=1.12*r*c; z=.98*r*s; break;
      case 'beach':
        r=1+.20*Math.cos(t-.5)+.14*Math.sin(2*t);
        x=1.28*r*c; z=.82*r*s+.16*Math.sin(2*t); break;
      case 'light': r=1+.13*Math.cos(3*t+.4); x=1.04*r*c+.12*Math.cos(2*t); z=.93*r*s; break;
      case 'captain': x=1.34*Math.sign(c)*Math.pow(Math.abs(c),.70); z=.78*Math.sign(s)*Math.pow(Math.abs(s),.70); break;
      default: r=1-.24*Math.cos(t)+.09*Math.sin(2*t); x=1.13*r*c; z=.93*r*s; break;
    }
    return [x,z];
  }
  var dense=[], lengths=[0], total=0, count=1024;
  for(var k=0;k<=count;k++){
    var p=shape(k*Math.PI*2/count); dense.push(p);
    if(k){ total+=Math.hypot(p[0]-dense[k-1][0],p[1]-dense[k-1][1]); lengths.push(total); }
  }
  var stepSpacing=(type==='town'||type==='lagoon'||type==='caves'||type==='patterns'||type==='beach') ? 3.90 : 3.35;
  var scale=n*stepSpacing/total, cursor=0, points=[];
  for(var i=0;i<n;i++){
    var target=total*i/n;
    while(cursor<count-1 && lengths[cursor+1]<target) cursor++;
    var f=(target-lengths[cursor])/(lengths[cursor+1]-lengths[cursor] || 1);
    points.push([(dense[cursor][0]*(1-f)+dense[cursor+1][0]*f)*scale,(dense[cursor][1]*(1-f)+dense[cursor+1][1]*f)*scale]);
  }
  // Put the start at the origin, preserving the camera's initial reference point.
  var elevPeak={ town:1.5, lagoon:2.1, caves:2.6, patterns:1.9, beach:1.6 }[type] || 0;
  var ox=points[0][0], oz=points[0][1];
  for(i=0;i<n;i++){
    spaces[i].x=points[i][0]-ox; spaces[i].z=oz-points[i][1];
    if(elevPeak>0){
      var u=i/n, env=Math.sin(Math.PI*u); env*=env;
      spaces[i].y=+(elevPeak*env*(0.65+0.35*Math.sin(u*Math.PI*4+0.4))).toFixed(3);
    }
  }
  var last=spaces[n-1], first=spaces[0];
  if(last.links.indexOf(0)<0) last.links.push(0);
  if(first.links.indexOf(n-1)<0) first.links.push(n-1);
  // Test outward headings against the entire circuit and already placed branches.
  var occupied=spaces.slice(0,n), groups={};
  for(i=n;i<spaces.length;i++) (groups[spaces[i].branch] || (groups[spaces[i].branch]=[])).push(spaces[i]);
  Object.keys(groups).forEach(function(key){
    var branch=groups[key], fork=spaces[branch[0].jn], j=fork.i,
        prev=spaces[(j+n-1)%n], next=spaces[(j+1)%n], dx=next.x-prev.x,dz=next.z-prev.z,
        base=Math.atan2(dx,-dz), best=-Infinity, bestAngle=base;
    var bStep=(type==='town'||type==='lagoon'||type==='caves'||type==='patterns'||type==='beach') ? 3.2 : 2.8;
    for(var a=0;a<32;a++){
      var angle=base+a*Math.PI*2/32, ux=Math.cos(angle), uz=Math.sin(angle), score=Infinity;
      branch.forEach(function(s,k){
        var x=fork.x+ux*bStep*(k+1), z=fork.z+uz*bStep*(k+1);
        occupied.forEach(function(o){ if(o===fork) return; score=Math.min(score,Math.hypot(x-o.x,z-o.z)); });
      });
      if(score>best){ best=score; bestAngle=angle; }
    }
    branch.forEach(function(s,k){
      s.x=fork.x+Math.cos(bestAngle)*bStep*(k+1);
      s.z=fork.z+Math.sin(bestAngle)*bStep*(k+1);
      s.y=fork.y||0;
      occupied.push(s);
    });
  });
  var xs=spaces.map(function(s){return s.x;}), zs=spaces.map(function(s){return s.z;});
  spaces.loop=true;
  spaces.bounds={minX:Math.min.apply(null,xs),maxX:Math.max.apply(null,xs),minZ:Math.min.apply(null,zs),maxZ:Math.max.apply(null,zs)};
  return spaces;
};
