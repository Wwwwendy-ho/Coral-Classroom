# Coral Classroom — Developer Handoff

**Updated:** 2026-11-26 (10:20 PST)  
**Branch:** `upgrade/integrated-2026-11-24`  
**Remote:** `https://github.com/Wwwwendy-ho/Coral-Classroom.git`  
**Current Formal Rubric v3.0 Score:** **`8.86 / 10` (`PASS`)** (Iteration 58, `0 CRIT`, `6 MAJ`, `14 MIN`; `D1 = 8.6`, `D2 = 9.1`, `D3 = 9.2`, `D4 = 8.7`, `D5 = 8.2`, `D6 = 9.5`; 60 FPS Overhaul + Tile Brightness committed in `25187d3`; overnight loop Iter 39–58 committed locally and ready for handoff).

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

### E. Iterations 33–58 & Soundtrack
- **Captain's Cabin**: 100% indoor vaulted coffered-oak Great Cabin with panoramic ocean gallery windows, chandeliers, curio vitrine, chests, sunbeams, and crew facing.
- **Harbor Town**: 8 genuinely distinct bespoke 3D indoor room layouts (`cafe`, `restaurant`, `shop`, `taxi`, `subway`, `hotel`, `pharmacy`, `friend`), with Activities entering live 3D rooms, Taxi Squid counter grounding, Mobile Shop 2x2 dialogue card, and Mobile Town planter fix.
- **Regions & Landmarks**: Bottle Beach cyan tide-plane removal, horizon ribbed sea-glass bottle, cork surf foam, and slab framing; Echo Caves cavern tidepools; Lighthouse brass window sashes; smooth Lagoon Banyan canopy; double-`boardYaw` orientation fix.
- **Cast & Companion**: Mario Party eye-shape diversity, velvety finish (`0.86–0.92` roughness), mutual head/neck gaze, `kiko-mochi` companion scuttling 1 tile behind Shelly, Subway Ray convex dome, Captain's Cabin painting variety.
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

## 4. Handoff Status, Verification & Next Steps

### Recent Local Commits (`upgrade/integrated-2026-11-24`)
- `c5b9b5f` — `art-loop: Iter 58 PASS 8.86/10 (0 CRIT, 6 MAJ) - Tidepools, Brass Sashes, Taxi, Cork Foam & Haze`
- `16436ae` — `art-loop: Iter 57 PASS 8.64/10 (0 CRIT) - Bottle Beach slab & horizon bottle, Cabin sunbeams, Banyan, Kiko`
- `25187d3` — `feat: 60fps frame-pacing overhaul, Mario Party world scale, tile brightness, 5 gameplay upgrades, and HANDOFF.md`

### Verification Gate Results (Latest Run)
- `build.py --check`: **PASS** (`build: index.html matches src/`)
- `soundtrack_verify.py`: **PASS** (`total=285 pass=285 fail=0 baseline_gap=0`)
- `game/tools/check/` Node checks: **`27/37` passed** (all 27 standalone Node/Three CPU tests passed). The remaining 10 checks failed/could not run in this environment due to missing external dependencies or required CLI args:
  - Missing `playwright` (6): `npc_worlds_smoke.js`, `region_boards_smoke.js`, `region_resident_mask_render_test.js`, `shelly_smoke.js`, `smoke.js`, `snapshots.js`
  - Missing `eslint` (1): `lint.js`
  - Missing `acorn` (1): `qblock_visual_test.js`
  - Missing `PIL` in system `python` (1): `world_surfaces_test.js`
  - Requires `<id>` CLI arg (1): `resident_asset_test.js`

### Push to GitHub
WSL has no stored GitHub credentials (`terminal prompts disabled`), so push from your terminal:
```bash
wsl bash -c 'cd /mnt/c/Users/20750/.gemini/antigravity/scratch/Coral-Classroom && git push -u origin upgrade/integrated-2026-11-24'
```

### Remaining 6 `MAJ` Items (Iter 58 -> `>= 9.8 / 10`, `0 MAJ`)
1. `02` / `19`: Harbor Town board shrimp basin + mutual gaze.
2. `12`: Echo Caves almond-oval eyes, mottling, gaze, and crystal clearance.
3. `13` / `16`: Pattern Reef `pip` & Lighthouse legacy merchant almond-oval eyes.
4. `01` / `02` / `11` / `18` / `19`: Beveled 3D medallions + starfish pebble clip.
5. `14` / `12` / `01`: Terrain ripples & strata detail.
6. `11` / `02` / rooms: Multi-cluster foliage polish.
