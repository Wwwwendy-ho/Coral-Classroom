/* Semantic regression check for the actual baked-lighting function.
   Usage: node tools/check/color_pipeline_test.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const root = require('path').resolve(__dirname, '../..');
const currentPath = root + '/src/js/reef3d/board.js';
const fixturePath = root + '/tools/check/fixtures/color-bake-before-20261116.json';
const threePath = root + '/three.min.js';

function extract(source, name){
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'could not find ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for(let i = open; i < source.length; i++){
    const ch = source[i], next = source[i + 1];
    if(lineComment){ if(ch === '\n') lineComment = false; continue; }
    if(blockComment){ if(ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if(quote){
      if(escaped) escaped = false;
      else if(ch === '\\') escaped = true;
      else if(ch === quote) quote = '';
      continue;
    }
    if(ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if(ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if(ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if(ch === '{') depth++;
    if(ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}
function runtime(){
  const sandbox = { console, Math, Float32Array };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(threePath, 'utf8'), sandbox, { filename:'three.min.js' });
  assert(sandbox.THREE && sandbox.THREE.REVISION === '128', 'expected bundled Three.js r128');
  return sandbox;
}
function fixture(THREE, unlit, config){
  config = config || {};
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array(config.positions || [0,0,0, 1,0,0, 2,1,0, 3,1,0]);
  const normals = new Float32Array(config.normals || [0,0,1, 0,0,1, 0,1,0, 0,1,0]);
  const colors = new Float32Array(config.albedoVertexRGB || [.91,.38,.48, .36,.66,.76, .91,.38,.48, .36,.66,.76]);
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = unlit ? new THREE.MeshBasicMaterial({ color:'#ffffff', vertexColors:true }) : { color:new THREE.Color('#ffffff'), vertexColors:true, emissive:null };
  const rigConfig = config.rig || { sky:'#fff6e2', hemisphereIntensity:.56, ground:'#73b8bd', sun:'#fff8ee', sunIntensity:.72, direction:[6,18,10] };
  const rig = {
    sky:new THREE.Color(rigConfig.sky).multiplyScalar(rigConfig.hemisphereIntensity),
    ground:new THREE.Color(rigConfig.ground).multiplyScalar(rigConfig.hemisphereIntensity),
    sun:new THREE.Color(rigConfig.sun).multiplyScalar(rigConfig.sunIntensity),
    dir:new THREE.Vector3(...rigConfig.direction).normalize()
  };
  return { g, mat, rig, positions:g.attributes.position.array, material:mat };
}
function runBake(source, f, context){
  const fn = extract(source, 'reef3dBakeGeo');
  context.window = context;
  context.reef3dBand = vm.runInContext('(' + extract(source, 'reef3dBand') + ')', context);
  context.reef3dBakeGeo = vm.runInContext('(' + fn + ')', context);
  context.reef3dBakeGeo(f.g, f.mat, f.rig);
  return Array.from(f.g.attributes.color.array);
}
function luma(rgb){ return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
function rgbAt(a, i){ return a.slice(i * 3, i * 3 + 3); }

const current = fs.readFileSync(currentPath, 'utf8');
const fnCurrent = extract(current, 'reef3dBakeGeo');
assert(!/new\s+THREE\.(Mesh|Material|Texture|WebGLRenderer)|\.render\s*\(|reef3dPost/.test(fnCurrent), 'bake must stay a geometry-only CPU pass');
const golden = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
assert.strictEqual(golden.provenance.commit, 'a36f2c22de676407fdc3a6fa236f4510599ed236', 'golden fixture provenance');
const ctx = runtime(), THREE = ctx.THREE;
const fresh = fixture(THREE, false, golden.geometry);
const freshMat = fresh.material, freshPositions = fresh.positions;
const nextColors = runBake(current, fresh, ctx);
const oldColors = golden.bakedRGB;

assert(nextColors.length === fresh.g.attributes.position.count * 3, 'one RGB triplet per vertex');
assert(nextColors.every(Number.isFinite), 'baked colors are finite');
assert(fresh.g.attributes.position.array === freshPositions, 'bake leaves geometry positions intact');
assert(fresh.mat === freshMat, 'bake leaves material identity intact');
assert(nextColors.every(c => c >= 0 && c <= 1.5), 'baked channels stay bounded and avoid white clipping');
assert(luma(rgbAt(nextColors, 0)) > luma(rgbAt(oldColors, 0)) + .025, 'near-ground pastel is brighter than baseline');
const pink = rgbAt(nextColors, 0), blue = rgbAt(nextColors, 1);
assert(pink[0] > pink[2] && blue[2] > blue[0], 'pink and blue albedos retain their distinct hues');
assert(Math.hypot(pink[0]-blue[0], pink[1]-blue[1], pink[2]-blue[2]) > .15, 'pastel colors remain visibly distinct');
assert(Math.abs(luma(rgbAt(nextColors, 2)) - luma(rgbAt(nextColors, 0))) > .015, 'normal and height differences retain shape shading');

const unlit = fixture(THREE, true, golden.geometry);
const ua = runBake(current, unlit, ctx);
assert(ua.every((v, i) => Math.abs(v - golden.geometry.albedoVertexRGB[i]) < 1e-6), 'unlit geometry copies its incoming albedo unchanged');

const roof = fixture(THREE, false, {
  positions:[0,1.5,0, 1,1.5,0, 2,1.5,0, 3,1.5,0],
  normals:[0,1,0, 0,1,0, 0,1,0, 0,1,0],
  albedoVertexRGB:[.88,.69,.47, .88,.69,.47, .88,.69,.47, .88,.69,.47]
});
const roofColors = runBake(current, roof, ctx);
assert(roofColors.every(Number.isFinite) && roofColors.every(c => c >= 0 && c < 1), 'lit pastel roof highlight stays below white clipping');
assert(roofColors[0] > roofColors[1] && roofColors[1] > roofColors[2], 'warm roof highlight preserves red-gold channel ordering');

const postPath = root + '/src/js/reef3d/post.js';
const postSource = fs.readFileSync(postPath, 'utf8');
assert(/function\s+reef3dPostWanted\s*\(q\)\s*\{\s*return\s+q\s*<\s*2\s*;/.test(postSource), 'mobile quality tiers keep post passes disabled');
console.log('color pipeline semantics: passed (actual current bake, frozen baseline RGB fixture, Three.js r128)');
