// Run: node tools/check/encounter_quality_test.js
const assert=require('assert'), fs=require('fs'), vm=require('vm');
const source=fs.readFileSync('src/js/reef3d/board.js','utf8');
const start=source.indexOf("  var R3Q_KEY ="),end=source.indexOf('  // For checking performance:',start);
const c={R3:{qualityProbed:true},navigator:{maxTouchPoints:5},localStorage:{getItem:()=>null,setItem(){}},
  devicePixelRatio:3,innerWidth:375,innerHeight:812,Math,window:{},reef3dShellyQuality(){},reef3dPostWanted:()=>false};
vm.createContext(c);vm.runInContext(source.slice(start,end),c);c.R3.q=3;
const area=c.innerWidth*c.innerHeight, board=c.reef3dQRatio(3,false), close=c.reef3dQRatio(3,true);
assert(board*board*area<=450000+1e-6);assert(close>board);assert(close*close*area<=650000+1e-6);
let ratio=0;const view={encounter:{},w:375,renderer:{setPixelRatio:r=>ratio=r},drawFps:30,
  qs:{n:0,t0:0,last:0,hold:0}};
c.reef3dQEncounter(view,true);assert.equal(ratio,close);assert.equal(view.w,0);
view.qs={n:0,t0:0,last:0,hold:0};
// Two measured 20-fps windows at the lowest tier trigger the ordinary pixel cap.
for(let now=50;now<=4100;now+=50)c.reef3dQTick(view,now);
assert(view.encounter.pixelPressure,'sustained pressure lowers close-up pixel load');
assert.equal(ratio,board);assert.equal(c.R3.q,3,'does not invent a fifth quality tier');
view.encounter=null;c.reef3dQEncounter(view,false);assert.equal(ratio,board,'closing restores the board budget');
c.innerWidth=1024;c.innerHeight=768;
assert(c.reef3dQRatio(2,true)>c.reef3dQRatio(2,false));
assert(c.reef3dQRatio(2,true,true)**2*c.innerWidth*c.innerHeight<=450000+1e-6);
console.log('Passed: unchanged board pixels, sharper mobile conversations, sustained-pressure fallback and board restore.');
