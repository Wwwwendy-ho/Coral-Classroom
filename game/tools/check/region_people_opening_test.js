// Run: node tools/check/region_people_opening_test.js (no DOM/server/packages).
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/js/reef3d/region-people.js','utf8');
const encounter=fs.readFileSync('src/js/reef3d/encounter-stage.js','utf8');
let enabled=true, speeches=[], stops=0, launches=0, html='';
function element(){return {isConnected:true,textContent:'',attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn},remove(){this.isConnected=false},focus(){}}}
const c={console,Math,Set,document:{activeElement:null,hidden:false,body:{classList:{remove(){}}},querySelector(){return null}},requestAnimationFrame:fn=>fn(),
 S:{view:'town',profile:{id:'child'},regionBoard:{region:'town',pid:'child'}},R3:{view:null},
 Sound:{isEnabled:()=>enabled},Speech:{speakThen(text,end,opts){speeches.push({text,end,opts})},stop(){stops++}},esc:s=>s,ccIcon:()=>'',
 REGION_BOARD_META:{town:{name:'Harbor Town'},beach:{name:'Bottle Beach'},caves:{name:'Echo Caves'}},
 regionEncounterActive(view){return c.R3.view===view && view.encounter && view.encounter.pid===c.S.profile.id && c.S.view===view.encounter.region && !view.parked},
 regionEncounterBegin(view,options){view.encounter={region:view.region.id,pid:c.S.profile.id,phase:'intro',actor:options.actor};return true},
 reef3dQEncounter(){},regionBoardLaunch(){launches++},reef3dShop(){},
 reef3dPanel(view,cls,markup){html=markup;const el=element();el.parts={};for(const name of ['listen','audio-status'])el.parts[name]=element();
 el.querySelector=sel=>el.parts[sel.includes('audio-status')?'audio-status':'listen'];el.querySelectorAll=()=>[];return el}
};
vm.createContext(c);
for(const path of ['src/js/town-talks.js','src/js/beach-data.js'])vm.runInContext(fs.readFileSync(path,'utf8'),c);
vm.runInContext(source,c);
function slice(from,to){return encounter.slice(encounter.indexOf(from),encounter.indexOf(to,encounter.indexOf(from)))}
vm.runInContext(slice('  function regionEncounterKeep(','  function regionEncounterAttach(')+slice('  function regionEncounterEnd(','  function regionEncounterScrollEnd(')+slice('  function regionEncounterTick(','  function regionEncounterEnd('),c);
function view(region='town',id='cafe'){
 c.S.view=region;c.S.profile={id:'child'};c.S.regionBoard={region,pid:'child'};
 const activity={id},space={item:{d:{regionActivity:activity}}},actor={userData:{}},p={disposed:false,towns:region==='town'?[{meta:{id},space,object:actor}]:[],marker:actor,markerSpace:space,actor,shop:{},guide:element(),hitables:[],sourceGeos:{}};
 const v={region:{id:region,name:region},regionPeople:p,wrap:{isConnected:true,inert:false,querySelector:()=>null,contains:()=>false,classList:{remove(){},add(){}}},fx:[],hitables:[]};
 c.R3.view=v;return v;
}
function open(v,id='cafe'){assert(c.regionPeopleOpen(v,v.region.id==='town'?'town:'+id:'activity'));return v.regionPeople.introAudio}
function click(v,key){v.regionPeople.dialog.listeners.click({target:{closest:sel=>sel==='[data-'+key+']'?{}:null}})}
function esc(v){v.regionPeople.dialog.listeners.keydown({key:'Escape',preventDefault(){}})}
const initial=JSON.stringify(c.S);
for(const folk of c.TOWN_FOLK){const line=c.regionPeopleOpening('town',{id:folk.id});assert.equal(line.ko,folk.nodes[folk.start].t[0]);assert.equal(line.en,folk.nodes[folk.start].t[1]);assert.equal(line.w,folk.nodes[folk.start].t[2])}
for(const bottle of c.BB_BOTTLES){const line=c.regionPeopleOpening('beach',{id:bottle.id});assert.equal(line.ko,bottle.ko);assert.equal(line.en,bottle.en)}
assert.equal(c.regionPeopleOpening('beach',{id:'letters'}).ko,c.BB_BOTTLES[0].ko);
assert.equal(c.regionPeopleOpening('beach',{id:'missing'}),null);assert.equal(c.regionPeopleOpening('caves',{id:'pairs'}),null);assert.equal(c.regionPeopleOpening('town',null),null);
assert.equal(JSON.stringify(c.S),initial,'lookup never writes progress');
let v=view();const beforeOpen=JSON.stringify(c.S);let a=open(v);assert.equal(JSON.stringify(c.S),beforeOpen,'opening never writes progress');assert.equal(speeches.length,0,'opening is silent');assert(html.includes('lang="ko"')&&html.includes(a.line.ko)&&html.includes(a.line.en));assert(!html.includes(c.REGION_TOWN_WELCOME.cafe),'generic body replaced');assert(html.includes('data-person-practice')&&html.includes('data-person-close'));
enabled=false;click(v,'person-listen');assert.equal(speeches.length,0);assert.equal(a.status.textContent,'Turn on sound to listen.');enabled=true;
const before=JSON.stringify(c.S);click(v,'person-listen');assert.equal(speeches.length,1);assert.equal(speeches[0].text,a.line.ko);assert.equal(a.button.textContent,'Stop');assert.equal(a.button.attrs['aria-pressed'],'true');
click(v,'person-listen');assert.equal(stops,1);assert.equal(a.button.textContent,'Listen');
click(v,'person-listen');assert.equal(speeches.length,2);speeches[0].end();assert.equal(a.button.textContent,'Stop','old completion cannot end replay');speeches[1].end();assert.equal(a.button.textContent,'Listen');
assert.equal(JSON.stringify(c.S),before,'listening never writes profile/progress');
click(v,'person-listen');const closed=speeches.at(-1);esc(v);const afterClose=stops;assert.equal(v.regionPeople.introAudio,null);assert.equal(v.encounter,null);closed.end();assert.equal(stops,afterClose);
v=view();a=open(v);click(v,'person-listen');const lesson=speeches.at(-1);click(v,'person-practice');assert.equal(launches,1);assert.equal(v.regionPeople.introAudio,null);const afterLesson=stops;lesson.end();assert.equal(stops,afterLesson,'late completion never stops lesson audio');
v=view();a=open(v);click(v,'person-listen');v.encounter.activityid='cafe';assert(c.regionEncounterKeep(v));assert.equal(v.regionPeople.introAudio,null);assert.equal(v.encounter.phase,'lesson');
v=view();a=open(v);click(v,'person-listen');speeches.at(-1).end();const beforeWatchdog=stops;click(v,'person-close');assert.equal(stops,beforeWatchdog+1,'close cancels pending clip even after watchdog completion');
v=view();a=open(v);click(v,'person-listen');const disposed=speeches.at(-1);c.regionPeopleDispose(v);assert.equal(v.regionPeople,null);const afterDispose=stops;disposed.end();assert.equal(stops,afterDispose);
for(const invalidate of [v=>c.S.profile={id:'other'},v=>c.R3.view={},v=>v.wrap.isConnected=false,v=>v.regionPeople.dialog.isConnected=false,v=>v.encounter={...v.encounter},v=>c.S.view='townTalk']){
 v=view();a=open(v);click(v,'person-listen');const done=speeches.at(-1).end;invalidate(v);done();assert.equal(a.button.textContent,'Stop','stale callback leaves old UI alone');
 const was=stops;c.regionPeopleIntroCancel(v);assert.equal(v.regionPeople.introAudio,null);if(c.S.view==='townTalk'||c.R3.view!==v||c.S.profile.id==='other')assert.equal(stops,was,'no stop after route/view/profile handoff');
}
v=view();a=open(v);click(v,'person-listen');v.regionPeople.dialog.isConnected=false;const beforeOrphan=stops;c.regionEncounterTick(v,0);assert.equal(stops,beforeOrphan+1);assert.equal(v.regionPeople.introAudio,null,'orphaned active intro cancels in encounter tick');
v=view('beach','food');a=open(v);assert.equal(a.line.ko,c.BB_BOTTLES.find(b=>b.id==='food').ko);assert(html.includes('data-person-listen'));
v=view('beach','letters');a=open(v);assert.equal(a.line.ko,c.BB_BOTTLES[0].ko);
v=view('caves','pairs');open(v);assert(!html.includes('data-person-listen'),'hosts without curated lines keep English');
const css=fs.readFileSync('src/css/region-people.css','utf8'),stageCss=fs.readFileSync('src/css/encounter-stage.css','utf8');
assert(css.includes('min-height:44px'));assert(stageCss.includes('45dvh'));
console.log('Passed curated town/beach reuse, silent opening, Listen/Stop/replay, mute guidance, close/Escape, practice/keep, dispose, stale callback/handoff guards, and no progress writes.');
