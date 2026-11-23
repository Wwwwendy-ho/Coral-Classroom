// Run with: node tools/check/shelly_preview_source_test.js
// No browser/server: exercise builder payloads and the exact loader-selection helper.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process');
const source=fs.readFileSync('tools/art/shelly_preview.js','utf8');
const begin=source.indexOf('  function loadModelSource('),end=source.indexOf('  var source=__MODEL_SOURCE__;',begin);
assert(begin>=0 && end>begin);
const requests=[],parsed=[];
let parseFailure=null,loadFailure=null;
const c={THREE:{GLTFLoader:class{
 load(url,ok,progress,error){requests.push({url,ok,error});if(loadFailure)error(loadFailure);}
 parse(bytes,base,ok,error){parsed.push({bytes:Array.from(new Uint8Array(bytes)),base,ok,error});if(parseFailure)error(parseFailure);}
}},atob:global.atob,Uint8Array};
vm.createContext(c);vm.runInContext(source.slice(begin,end),c);
let errors=[];const success=()=>{},failure=error=>errors.push(error);
c.loadModelSource({embedded:Buffer.from([1,2,3]).toString('base64')},success,failure);
assert.equal(requests.length,0,'embedded mode makes no URL request');assert.equal(parsed.length,1);
assert.deepEqual(parsed[0].bytes,[1,2,3]);assert.equal(parsed[0].base,'');assert.strictEqual(parsed[0].ok,success);
c.loadModelSource({url:'game/assets/models/shelly.glb'},success,failure);
assert.equal(requests.length,1);assert.equal(parsed.length,1,'hosted mode never base64-decodes/parses an embedded payload');
assert.equal(requests[0].url,'game/assets/models/shelly.glb');assert.strictEqual(requests[0].ok,success);assert.strictEqual(requests[0].error,failure);
loadFailure=Error('404');c.loadModelSource({url:'missing.glb'},success,failure);assert.strictEqual(errors.at(-1),loadFailure);
parseFailure=Error('bad glb');c.loadModelSource({embedded:'AQID'},success,failure);assert.strictEqual(errors.at(-1),parseFailure);
c.loadModelSource({embedded:'%%%bad'},success,failure);assert(errors.at(-1) instanceof Error || String(errors.at(-1)).includes('Invalid'),'bad embedded encoding uses the shared error handler');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'shelly-preview-source-'));
try {
 const model=path.join(tmp,'fixture.glb');fs.writeFileSync(model,Buffer.from([4,5,6,7]));
 function build(name,args){
  const output=path.join(tmp,name),result=spawnSync('python3',['tools/art/build_shelly_preview.py',output,...args],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const html=fs.readFileSync(output,'utf8');
  const match=html.match(/  var source=(\{[^\n]+\});/);assert(match,'builder replaces model-source placeholder');
  assert(!html.includes('__MODEL_SOURCE__'));assert(!html.includes('__MODEL__'));
  return {html,config:JSON.parse(match[1])};
 }
 const portable=build('portable.html',['--model',model]);assert.deepEqual(portable.config,{embedded:'BAUGBw=='});
 const hosted=build('hosted.html',['--model-url','game/assets/models/shelly.glb']);
 assert.deepEqual(hosted.config,{url:'game/assets/models/shelly.glb'});assert(!hosted.html.includes('BAUGBw=='));
 // Default CLI still embeds the real game model for offline portability.
 const defaultBuild=build('default.html',[]);assert.equal(typeof defaultBuild.config.embedded,'string');assert(defaultBuild.config.embedded.length>0);assert.equal(defaultBuild.config.url,undefined);
 const url='game/shelly.glb?note="quoted"&value=</script>雪';
 const escaped=build('escaped.html',['--model-url',url]);assert.equal(escaped.config.url,url);assert(!escaped.html.includes('value=</script>'));
 const both=spawnSync('python3',['tools/art/build_shelly_preview.py',path.join(tmp,'both.html'),'--model',model,'--model-url','model.glb'],{encoding:'utf8'});
 assert.notEqual(both.status,0,'CLI rejects contradictory source modes');
 const empty=spawnSync('python3',['tools/art/build_shelly_preview.py',path.join(tmp,'empty.html'),'--model-url',''],{encoding:'utf8'});assert.notEqual(empty.status,0);
 console.log('Passed: default portable embedding, candidate embedding, hosted shared URL without embedded model, URL escaping, mutual exclusion and shared loading/error callbacks.');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
