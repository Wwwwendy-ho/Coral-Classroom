// Verify every GLB in game/assets/models: meshes / primitives / materials counts and size budgets.
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '../../game/assets/models');
let bad = 0;
const rows = [];
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.glb')).sort()) {
  const raw = fs.readFileSync(path.join(dir, f));
  const jl = raw.readUInt32LE(12); const d = JSON.parse(raw.slice(20, 20 + jl).toString('utf8'));
  const M = d.meshes.length, P = d.meshes.reduce((s, m) => s + m.primitives.length, 0), MAT = (d.materials || []).length;
  const kb = raw.length / 1024, close = /-close\.glb$/.test(f);
  const limit = close ? 1433.6 : 650;
  const clips = (d.animations || []).map(a => a.name).join('/');
  const ok = M === 1 && P === 1 && MAT === 1 && kb < limit;
  if (!ok) bad++;
  rows.push(`${ok ? 'OK  ' : 'FAIL'} ${f.padEnd(28)} M=${M} P=${P} MAT=${MAT} ${kb.toFixed(1).padStart(8)} KB (limit ${limit}) clips=${clips}`);
}
console.log(rows.join('\n')); console.log(bad ? `FAILURES: ${bad}` : 'ALL GLBs PASS');
process.exit(bad ? 1 : 0);
