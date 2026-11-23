// Actual VoicePack/AudioClips/Speech with fake network, audio, synthesis and timers.
// Run: node tools/check/speech_cancellation_test.js [optional learning.js path]
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const learning=fs.readFileSync(process.argv[2]||'src/js/learning.js','utf8');
const start=learning.indexOf('  var VoicePack = (function(){');
const end=learning.indexOf('\n  })();',learning.indexOf('  var Speech = (function(){'))+'\n  })();'.length;
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve()}
function harness({clips=[],voices=true,pendingIndex=false}={}){
 let nextId=0,voiceList=voices?[{name:'Test Korean',lang:'ko-KR'}]:[],synthCancels=0,audioPauses=0,constructHook=null;
 const intervals=new Map(),timeouts=new Map(),spoken=[],plays=[],fetches=[],playResults=[],indexLoad=deferred();
 const entries={};clips.forEach((text,i)=>{entries['n|'+text.replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu,'')]=[0,i,1]});
 const index={clips:entries,packs:['ko.mp3'],v:1};
 const synth={speaking:false,pending:false,getVoices:()=>voiceList,cancel(){synthCancels++},speak(utter){spoken.push(utter)}};
 function FakeAudio(){if(constructHook)constructHook();this.addEventListener=()=>{};this.pause=()=>{audioPauses++};this.play=()=>{plays.push(this.src);return playResults.length?playResults.shift():Promise.resolve()}}
 const c={console,Promise,Math,Blob,Sound:{isEnabled:()=>true},deckSpeechMuted:()=>false,
  localStorage:{getItem:()=>null},document:{addEventListener(){}},Audio:FakeAudio,
  SpeechSynthesisUtterance:function(text){this.text=text},URL:{createObjectURL:()=> 'blob:test-clip',revokeObjectURL(){}},
  setTimeout(fn,ms){const id=++nextId;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),
  setInterval(fn,ms){const id=++nextId;intervals.set(id,{fn,ms});return id},clearInterval:id=>intervals.delete(id),
  fetch(url){fetches.push(url);if(url==='voice/index.json')return pendingIndex?indexLoad.promise:Promise.resolve({ok:true,json:()=>Promise.resolve(index)});return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(clips.length||1))})}
 };
 c.window={speechSynthesis:synth,SpeechSynthesisUtterance:c.SpeechSynthesisUtterance,fetch:c.fetch};
 vm.createContext(c);vm.runInContext(learning.slice(start,end),c);
 return {speech:c.Speech,spoken,plays,fetches,playResults,indexLoad,index,intervals,timeouts,
  get cancels(){return synthCancels},get pauses(){return audioPauses},synth,
  voicesOn(){voiceList=[{name:'Test Korean',lang:'ko-KR'}]},intervalTick(){for(const t of [...intervals.values()])t.fn()},
  timeoutTick(ms){for(const [id,t]of [...timeouts])if(t.ms===ms){timeouts.delete(id);t.fn()}},
  constructorHook(fn){constructHook=fn}}
}
(async()=>{
 // No hidden startup fetch or audio. Cancel while the actual voice-index fetch waits.
 let h=harness({clips:['안녕하세요'],pendingIndex:true}),ends=0;assert.equal(h.fetches.length,0);assert.equal(h.plays.length,0);
 h.speech.speakThen('안녕하세요',()=>ends++);await flush();assert.deepEqual(h.fetches,['voice/index.json']);h.speech.stop();
 h.indexLoad.resolve({ok:true,json:()=>Promise.resolve(h.index)});await flush();assert.equal(h.plays.length,0);assert.equal(h.spoken.length,0);assert.equal(ends,1);
 // Pending play rejection used to synthesize the canceled intro and cancel the newer lesson.
 h=harness({clips:['안녕하세요','새 수업']});const oldPlay=deferred();h.playResults.push(oldPlay.promise);ends=0;
 h.speech.speakThen('안녕하세요',()=>ends++);await flush();assert.equal(h.plays.length,1);h.speech.stop();h.speech.speakThen('새 수업',()=>{});await flush();
 const cancelBefore=h.cancels,pauseBefore=h.pauses;oldPlay.reject(Error('late playback failure'));await flush();
 assert.equal(h.spoken.length,0,'canceled playback fallback must not synthesize');assert.equal(h.cancels,cancelBefore,'stale fallback must not cancel the lesson');assert.equal(h.pauses,pauseBefore,'stale fallback must not pause lesson clip');assert.equal(ends,1);
 // A current rejected recording still uses synthesis and completes once.
 h=harness({clips:['안녕하세요']});h.playResults.push(Promise.reject(Error('blocked playback')));ends=0;
 h.speech.speakThen('안녕하세요',()=>ends++);await flush();assert.equal(h.spoken.length,1);assert.equal(h.spoken[0].text,'안녕하세요');h.spoken[0].onend();h.spoken[0].onerror();assert.equal(ends,1);
 // Voice discovery waits are canceled too, including a subsequent line superseding the request.
 for(const replace of [false,true]){
  h=harness({voices:false});ends=0;h.speech.speakThen('이전 인사',()=>ends++);await flush();assert.equal(h.intervals.size,1);
  if(replace)h.speech.speakThen('새 수업',()=>{});else h.speech.stop();await flush();h.voicesOn();const before=h.cancels;h.intervalTick();
  assert(!h.spoken.some(u=>u.text==='이전 인사'),'stale voice wait must not speak');assert.equal(ends,1);assert.equal(h.intervals.size,0);
  if(replace){assert.equal(h.spoken.length,1);assert.equal(h.spoken[0].text,'새 수업')}else assert.equal(h.cancels,before);
 }
 h=harness({voices:false});ends=0;h.speech.speakThen('현재 인사',()=>ends++);await flush();h.voicesOn();h.intervalTick();assert.equal(h.spoken[0].text,'현재 인사');h.spoken[0].onend();assert.equal(ends,1,'current voice-wait fallback preserved');
 // Stitched sentences have their own recording fallback, with the same token guard.
 h=harness({clips:['첫 문장.','다음 문장.']});const partPlay=deferred();h.playResults.push(partPlay.promise);ends=0;
 h.speech.speakThen('첫 문장. 다음 문장.',()=>ends++);await flush();assert.equal(h.plays.length,1);h.speech.stop();const beforePart=h.cancels;partPlay.reject(Error('late part failure'));await flush();assert.equal(h.spoken.length,0);assert.equal(h.plays.length,1);assert.equal(h.cancels,beforePart);assert.equal(ends,1);
 // The outer resolve/play chain's catch is also guarded: a thrown Audio constructor
 // after cancellation used to trigger the unguarded synthetic fallback.
 h=harness({clips:['안녕하세요']});ends=0;h.constructorHook(()=>{h.speech.stop();throw Error('audio construction failed')});
 h.speech.speakThen('안녕하세요',()=>ends++);await flush();assert.equal(h.spoken.length,0);assert.equal(ends,1);
 h=harness({clips:['안녕하세요']});h.constructorHook(()=>{throw Error('audio construction failed')});h.speech.speakThen('안녕하세요',()=>{});await flush();assert.equal(h.spoken[0].text,'안녕하세요','current outer catch still falls back');
 // Plain speak shares the voice wait and iOS delayed-synthesis helpers.
 h=harness({voices:false});h.speech.speak('이전 인사');await flush();assert.equal(h.intervals.size,1);h.speech.stop();h.voicesOn();h.intervalTick();assert.equal(h.spoken.length,0);assert.equal(h.intervals.size,0);
 h=harness();h.synth.speaking=true;h.speech.speak('이전 인사');await flush();assert.equal(h.spoken.length,0);h.speech.stop();h.timeoutTick(60);assert.equal(h.spoken.length,0,'stop also cancels delayed iOS synth');
 console.log('Passed actual Speech: pending fetch/play cancellation, newer lesson isolation, canceled/current voice waits, stitched fallback, outer catch, exactly-once completion, and iOS delay.');
})().catch(e=>{console.error(e);process.exitCode=1});
