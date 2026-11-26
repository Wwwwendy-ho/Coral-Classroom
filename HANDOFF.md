# Coral Classroom — Developer Handoff

**Updated:** 2026-11-26 (08:35 PST)  
**Branch:** `upgrade/integrated-2026-11-24`  
**Remote:** `https://github.com/Wwwwendy-ho/Coral-Classroom.git`  
**Current Formal Rubric v3.0 Score:** **`8.64 / 10` (`PASS`)** (Iteration 57, `0 CRIT`, `8 MAJ`, `13 MIN`; `D6 = 9.6 / 10`; 60 FPS Overhaul + Tile Brightness committed in `25187d3`; overnight loop continuing toward `>= 9.8 / 10` until ~09:45 PST).

---

## 1. Quick Start on Your New Computer

### Pull the Branch
```bash
git fetch origin
git checkout upgrade/integrated-2026-11-24
git pull origin upgrade/integrated-2026-11-24
```

### Run Locally
Serve the repository root (note: `game/` is served at `/game/`):
```bash
python -m http.server 8820
# Open http://localhost:8820/game/
```
*(In WSL on this setup: Node is `/home/wendy/.local/share/node-v22.23.5-linux-x64/bin/node`, Python venv is `/home/wendy/.venvs/coral-classroom/bin/python`, Blender Python venv is `/home/wendy/.venvs/bpy311/bin/python`.)*

### Build & Verify Everything
```bash
# 1. Rebuild single-file game/index.html from game/src/
python game/tools/build.py
python game/tools/build.py --check

# 2. Syntax check core 3D modules
node --check game/src/js/reef3d/board.js

# 3. Run all Node test suites (from game/ directory)
cd game
for t in tools/check/*test*.js tools/check/*smoke*.js tools/check/lint.js tools/check/steps.js tools/check/snapshots.js; do
  node "$t"
done

# 4. Verify 16-track soundtrack & review page
python tools/check/soundtrack_verify.py
```

### Blender Character GLB Pipeline
- Always run Blender builds **one at a time** (never in parallel) to respect RAM limits:
  ```bash
  LD_LIBRARY_PATH=/home/wendy/.local/syslibs/usr/lib/x86_64-linux-gnu /home/wendy/.venvs/bpy311/bin/python game/tools/art/<script>.py
  ```
- Asset size budgets enforced by tests & rubric:
  - Board GLB `< 650 KB`
  - Close GLB `< 1.4 MB` (`1433.6 KB`)
  - `M=1 P=1 MAT=1`, `Idle` / `Listen` / `React` clips present.

---

## 2. What Has Been Shipped So Far

### A. 60 FPS Frame-Pacing & GPU Optimization Pass (`board.js`, `jamboree-visuals.js`, `reef-3d.css`, `fixes-and-refresh.css`, `sw.js`)
- Disabled the redundant 9-pass offscreen MSAA `post.js` render pipeline on boards (`view.post = null`, saving 5 render targets + full-screen blur passes per frame while keeping `post.js` intact).
- Removed live `backdrop-filter: blur(...)` over the 60 FPS WebGL canvas on persistent HUD pills (`.r3-hud`, `.r3-topbtn`, `.r3-menubtn`, `.cv3-hero .pill`), preventing per-frame Chrome WebGL readback stalls.
- Replaced per-frame `view.wrap.clientWidth` / `clientHeight` layout reads in `reef3dSize` with a `ResizeObserver` cache + unmount cleanup.
- Fixed `reef3dDrawDue` 60 Hz frame-skipping bug (`if(fps >= 60) return true;`) and raised `R3Q_KEY` to `cc-3dq4`.
- Switched `WebGLRenderer` to `{ alpha: false, powerPreference: 'high-performance' }` with guaranteed `scene.background`, capped DPR (`1.5` boards / `1.75` encounters), throttled `InstancedMesh` uploads in `jamboree-visuals.js` (~20 Hz), throttled `view.motes` (every 3rd frame) and `view.bubbles` (every 2nd frame), pre-filtered `view.qSpaces` / `view.objSpaces` / `view.glowSpaces`, eliminated per-frame `.filter()`/`.forEach()` closures in `reef3dFrame`, and bumped `game/sw.js` cache key (`coral-classroom-20261126-60fps-v1`).

### B. Tile Brightness & Material Sweet Spot (`board.js`)
- Restored crisp, sunny, readable board discs (`color: '#ffffff'` day / `'#dceef6'` night, `emissiveMap` at `0.14` day / `0.18` night, satin `shininess: 48`; bezels `#f2ece0`, `shininess: 68`) with balanced daylight (`HemisphereLight .56`, `DirectionalLight .70`).

### C. Mario Party–Scale World Expansion (`world-routes.js`, `board.js`, `region-scenery.js`, `region-people.js`)
- Expanded regional loop spacing (`2.85 -> 3.90u` on `town`, `lagoon`, `caves`, `patterns`, `beach`; `3.35u` on `captain` & `cove`), stronger asymmetric multi-lobe silhouettes, and smooth 3D elevation (`1.5–2.6u` across 5 outdoor regions).
- Lower street-level `REEF3D_REGION_CAMERA` framing, deeper horizon fog (`fogNear 50–64`, `fogFar 175–220`, `cam.far 360`).
- Added 1 tall central sightline-blocking landmark per non-lighthouse region (Harbor Clock-Tower, Storybook Banyan & Pagoda, Crystal Cathedral Spire, Mosaic Coral Obelisk, Sea-Stack Lighthouse Crag, Chart-Room Mast Atrium) + merged `buildBeyondBoardVistas` outer horizon islands.

### D. 5 Big Idea Jamboree Upgrades (`board.js`, `dice.js`, `party.js`, `region-people.js`)
1. Pooled zero-GC dice bonk bursts (`reef3dDiceBurst`).
2. Hop landing ring + sand/water puff FX (`reef3dHopLandingFx`).
3. Shell collection arc FX + `.r3-hud-shells` HUD pulse (`reef3dShellArcFx`).
4. Smooth `1.8s` Golden Pearl relocation camera pan (`reef3dPanToSpace`).
5. Bobbing color-coded 3D directional fork arrows (`d.forkArrows`) + throttled resident proximity greetings within `7.5u`.

### E. Iterations 33–38 & Soundtrack
- **Captain's Cabin**: 100% indoor vaulted coffered-oak Great Cabin with panoramic ocean gallery windows, chandeliers, curio vitrine, and chests.
- **Harbor Town**: 8 genuinely distinct bespoke 3D indoor room layouts (`cafe`, `restaurant`, `shop`, `taxi`, `subway`, `hotel`, `pharmacy`, `friend`), with Activities entering live 3D rooms.
- **Cast & Companion**: Mario Party eye-shape diversity, velvety finish (`0.86–0.92` roughness), mutual head/neck gaze, Kiko scuttling 1 tile behind Shelly, Subway Ray convex dome, Kiko Mochi rounded toes, Captain's Cabin painting variety.
- **Soundtrack**: 16-track dynamic Day & Night MP3 OST verified by `soundtrack_verify.py` (`285/285`).

---

## 3. Key File Map

| Area | Files |
| :--- | :--- |
| **3D Board Core & Frame Loop** | `game/src/js/reef3d/board.js`, `game/src/js/reef3d/post.js`, `game/src/js/reef3d/world-routes.js` |
| **Scenery, Landmarks & People** | `game/src/js/reef3d/region-scenery.js`, `game/src/js/reef3d/region-people.js`, `game/src/js/reef3d/resident-models.js` |
| **3D Interiors & Encounters** | `game/src/js/reef3d/encounter-interiors.js`, `game/src/js/reef3d/encounter-stage.js`, `game/src/js/reef3d/room-interactions.js` |
| **Gameplay & Jamboree Polish** | `game/src/js/reef3d/dice.js`, `game/src/js/reef3d/party.js`, `game/src/js/reef3d/jamboree-visuals.js`, `game/src/js/reef3d/region-mechanics.js`, `game/src/js/reef3d/jamboree-bridge.js` |
| **Styles & Offline Cache** | `game/src/css/reef-3d.css`, `game/src/css/fixes-and-refresh.css`, `game/src/css/jamboree-features.css`, `game/sw.js` |
| **Build & Checks** | `game/tools/build.py`, `game/tools/check/*.js`, `game/tools/check/soundtrack_verify.py` |
| **Art & Rubric Loop** | `work/art-loop/rubric.md` (Rubric v3.0), `work/art-loop/ledger.json`, `work/art-loop/refs/jamboree/` |

---

## 4. Next Steps Toward >= 9.8 / 10 (`0 CRIT`, `0 MAJ`)

1. **Coral Cove Horizon Fix (spotted in live check)**: Keep `view.bigOne` whale and `sc.h` fish schools cleanly below the distant ocean horizon so neither silhouettes against the yellow sky.
2. **Iteration 39 Full 21-Shot Capture & Adversarial Critic Grade**: Run full desktop (`1280x800`) + mobile (`390x844`) captures on `http://localhost:8820/game/` and grade against `work/art-loop/rubric.md`.
3. **Clear Remaining Iter 37–39 `MAJ` Items**:
   - Diagonal indoor window sunbeams + floor sheen on `pharmacy`, `shop`, `hotel`.
   - Echo Caves resident orientation & lighting polish.
   - Bottle Beach colossal curved glass bottle & neck/cork framing on the expanded loop.
   - Interactive 3D clicking on fork arrows and final `MIN` polish across all 7 regions + Coral Cove.
