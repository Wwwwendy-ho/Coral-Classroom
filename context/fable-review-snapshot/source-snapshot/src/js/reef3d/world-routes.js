/* Closed, arc-length sampled board circuits. This only changes positions and the
   closing graph edge; space identities, branch ownership and ordering stay intact. */
window.reef3dWorldRoute = function(spaces, id){
  var n=spaces.mainN, type=id || 'cove';
  if(!n || n<4) return spaces;
  function shape(t){
    var c=Math.cos(t), s=Math.sin(t), r=1, x, z;
    switch(type){
      case 'town': x=1.22*c+.12*Math.cos(2*t); z=.82*s+.10*Math.sin(2*t); break;
      case 'lagoon': r=1+.13*Math.sin(3*t+.4)+.07*Math.cos(5*t); x=1.05*r*c; z=.91*r*s; break;
      case 'caves': r=1+.20*Math.cos(t+.6)+.12*Math.sin(2*t); x=1.12*r*c; z=.87*r*s; break;
      case 'patterns': r=1+.13*Math.cos(5*t); x=1.02*r*c; z=.96*r*s; break;
      case 'beach': r=1+.15*Math.cos(t-.5); x=1.23*r*c; z=.77*r*s+.13*Math.sin(2*t); break;
      case 'light': r=1+.13*Math.cos(3*t+.4); x=1.04*r*c+.12*Math.cos(2*t); z=.93*r*s; break;
      case 'captain': x=1.32*Math.sign(c)*Math.pow(Math.abs(c),.72); z=.76*Math.sign(s)*Math.pow(Math.abs(s),.72); break;
      default: r=1-.24*Math.cos(t)+.09*Math.sin(2*t); x=1.13*r*c; z=.93*r*s; break;
    }
    return [x,z];
  }
  var dense=[], lengths=[0], total=0, count=1024;
  for(var k=0;k<=count;k++){
    var p=shape(k*Math.PI*2/count); dense.push(p);
    if(k){ total+=Math.hypot(p[0]-dense[k-1][0],p[1]-dense[k-1][1]); lengths.push(total); }
  }
  var scale=n*2.85/total, cursor=0, points=[];
  for(var i=0;i<n;i++){
    var target=total*i/n;
    while(cursor<count-1 && lengths[cursor+1]<target) cursor++;
    var f=(target-lengths[cursor])/(lengths[cursor+1]-lengths[cursor] || 1);
    points.push([(dense[cursor][0]*(1-f)+dense[cursor+1][0]*f)*scale,(dense[cursor][1]*(1-f)+dense[cursor+1][1]*f)*scale]);
  }
  // Put the start at the origin, preserving the camera's initial reference point.
  var ox=points[0][0], oz=points[0][1];
  for(i=0;i<n;i++){ spaces[i].x=points[i][0]-ox; spaces[i].z=oz-points[i][1]; }
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
    for(var a=0;a<32;a++){
      var angle=base+a*Math.PI*2/32, ux=Math.cos(angle), uz=Math.sin(angle), score=Infinity;
      branch.forEach(function(s,k){
        var x=fork.x+ux*2.8*(k+1), z=fork.z+uz*2.8*(k+1);
        occupied.forEach(function(o){ if(o===fork) return; score=Math.min(score,Math.hypot(x-o.x,z-o.z)); });
      });
      if(score>best){ best=score; bestAngle=angle; }
    }
    branch.forEach(function(s,k){ s.x=fork.x+Math.cos(bestAngle)*2.8*(k+1); s.z=fork.z+Math.sin(bestAngle)*2.8*(k+1); occupied.push(s); });
  });
  var xs=spaces.map(function(s){return s.x;}), zs=spaces.map(function(s){return s.z;});
  spaces.loop=true;
  spaces.bounds={minX:Math.min.apply(null,xs),maxX:Math.max.apply(null,xs),minZ:Math.min.apply(null,zs),maxZ:Math.max.apply(null,zs)};
  return spaces;
};
