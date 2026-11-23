// Run: node tools/check/test_travel.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('src/js/reef3d/scenes.js','utf8');
const start = source.indexOf('  var REEF3D_HOP_TIME_SCALE'), end = source.indexOf('\n  /* ---------- Night:',start);
let now = 0, queue = [], calm = false, events = [];
const ctx = {Math, performance:{now:()=>now}, requestAnimationFrame:f=>queue.push(f), Sound:{bloop(){}},
  reefCalm:()=>calm, reef3dEase:p=>p*p*(3-2*p), reef3dRoute:(spaces,at,target)=>Array.from({length:target-at},(_,i)=>at+i+1),
  reef3dPlace:(v,i)=>{v.at=i;const b=v.spaces[i];v.guide.position.set(b.x,.3+(b.y||0),b.z)}, reef3dPuff(){}, R3:{view:null}};
vm.createContext(ctx); vm.runInContext(source.slice(start,end),ctx);
function vec(){return {x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}}}
function make(spaces){now=0;queue=[];events=[]; const body={position:vec(),rotation:vec(),scale:vec()}, guide={position:vec(),rotation:vec(),userData:{body,shelly:true}}, v={at:0,spaces,guide,wrap:{isConnected:true}}; ctx.R3.view=v;guide.position.set(spaces[0].x,.3+(spaces[0].y||0),spaces[0].z);return v}
function tick(dt){now+=dt;const q=queue;queue=[];q.forEach(f=>f(now));}
function run(dt){let n=0;while(queue.length && n++<500)tick(dt);assert(n<500);}
for(const hz of [30,60]){
  const dt=1000/hz, duration=(540+3*65)*.68;
  let v=make([{x:0,z:0,y:0},{x:0,z:3,y:1},{x:2,z:3,y:-1}]);
  ctx.reef3dTravel(v,2,()=>events.push(['done',now]), n=>events.push(['hop',n,now]));
  tick(dt); assert.equal(v.guide.position.z,0,'anticipation holds position'); assert(v.guide.userData.body.rotation.x>0);
  while(now<duration*.5)tick(dt);assert(v.guide.userData.body.position.y>.5,'arc at midpoint');assert.equal(v.guide.userData.body.scale.y,1);
  while(now<duration*.9)tick(dt);assert.equal(v.guide.position.z,3,'landing holds destination');assert(Math.abs(v.guide.userData.body.position.y)<1e-10);assert.equal(events.length,0,'no callback during landing');
  run(dt);assert.deepStrictEqual(events.map(e=>e.slice(0,2)),[['hop',1],['hop',0],['done',events[2][1]]]);
  assert(events[0][2]<600,'normal tile travel stays below600ms');assert(events[0][2]>=duration && events[0][2]<duration+dt+1e-7);assert.equal(v.at,2);assert.equal(v.moving,false);
  assert(Math.abs(v.guide.position.y+.7)<1e-9);assert.equal(v.guide.position.x,2);assert(Math.abs(v.guide.rotation.y-Math.PI/2)<1e-9);assert.equal(v.guide.userData.body.rotation.x,0);
  v=make([{x:0,z:0,y:0},{x:4,z:0,y:1}]);v.spaces.ship={half:2,roll:0,pitch:0};ctx.reef3dTravel(v,1,()=>events.push('done'),n=>events.push(n));let clearance=-Infinity;
  while(queue.length){tick(dt);if(Math.abs(v.guide.position.x-2)<.25)clearance=Math.max(clearance,v.guide.position.y+v.guide.userData.body.position.y);}
  assert(clearance>=1.7,'rail clearance at '+hz+' Hz');assert.deepStrictEqual(events,[0,'done']);
  v=make([{x:0,z:0},{x:1,z:0}]);ctx.reef3dTravel(v,1,()=>events.push('done'),n=>events.push(n));v.wrap.isConnected=false;tick(dt);assert.equal(queue.length,0);assert.deepStrictEqual(events,[]);assert.equal(v.moving,false);
  calm=true;v=make([{x:0,z:0},{x:1,z:0}]);ctx.reef3dTravel(v,1,()=>events.push('done'),n=>events.push(n));assert.equal(v.at,1);assert.deepStrictEqual(events,[0,'done']);assert.equal(queue.length,0);calm=false;
}
assert(fs.readFileSync('src/js/reef3d/shelly.js','utf8').includes('2.4 / REEF3D_HOP_TIME_SCALE'));
console.log('30/60 Hz travel: phase boundaries, timing, multihop callbacks, elevation, yaw, rail clearance, cancellation and Calm Motion passed');
