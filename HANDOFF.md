# Coral Classroom — Developer Handoff

**Updated:** 2026-11-27 (12:40 PST)  
**Branch:** `upgrade/integrated-2026-11-24`  
**Remote:** `https://github.com/Wwwwendy-ho/Coral-Classroom.git`  
**Current Formal Rubric v4.5 (Locked Highest-Realistic-Ceiling Standard) Score:** **`9.90 / 10` (`PASS` — Target Goal Achieved)** (Iteration 73, **`0 CRIT`, `0 MAJ`, `0 MIN`**; `D1 = 9.85`, `D2 = 9.85`, `D3 = 9.90`, `D4 = 9.90`, `D5 = 9.95`, `D6 = 9.95`; verified across 24 live desktop `1280×800` & iPhone portrait `390×844` captures, `shadowOn: true` on 24/24 views, `285/285` soundtrack checks, and all automated geometry/security/system tests).

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

### F. Iterations 59–63 (`8.86 -> 9.82 / 10`, `0 CRIT`, `0 MAJ`)
- **Cast & Blender GLBs (`conforming_eye.py`, `build_supporting_hosts.py`, `resident-models.js`)**: Rebuilt 5 host/merchant GLB pairs (`echo`, `pip`, `bok`, `captain-bay`, `hana` at `?v=mp-44`) in Blender 4.3.2 with bold species-specific non-circular Mario Party eye silhouettes (`cat_almond`, `crescent_smile`, `half_lid`), enriched Echo's pearlescent seafoam flank mottling, reduced `pip.glb` board mesh to `5,192` tris (`<= 6,500`), and expanded board mutual gaze (`13.5u`, `±0.68 rad`, frame-1 settle snap).
- **Grounding & Sightline Precision (`region-people.js`, `region-scenery.js`, `region-mechanics.js`, `board.js`)**:
  - Fixed Jisu outdoor encounter grounding using visible-mesh-only bounding boxes seated cleanly onto Bottle Beach dune sand (`-0.303`, zero floating gap).
  - Grounded Harbor Town & Captain's Cabin Bok in oak-and-brass splash tubs and upgraded Pharmacist Shrimp's stepped ceramic-and-brass apothecary basin.
  - Cleared Captain Bay's opening sightline (`clearOfBayCorridor` covering `cam@0` + `cam@3`), sealed the vaulted Great Cabin roof overhang & wall frieze (zero sky sliver), and relocated the trophy museum/corkboard/gramophone cleanly along the cabin perimeter.
  - Framed Echo prominently inside Echo Caves' opening cavern clearing (`detailed: true`) with mushroom-free tail clearance, striated limestone strata texture, and grounded slate-plinth crystal spires.
  - Replaced Story Lagoon placeholder cones with sculpted curved-spread open floating storybooks on open water, framed hero giant storybooks at `cam@0`, and refined Mira's framing.
  - Upgraded Pattern Reef stepping stones to tile-clear gold-rimmed beveled jewel plinths, moved Harbor Town's signpost onto the outer-right sidewalk with wheeled market carts & curved harbor basin ripples, and separated Lighthouse Kiko cleanly onto the rotunda floor behind stair 0.
- **Material & Botanical Craft (`board.js`, `crafted-world.js`, `encounter-interiors.js`)**: Upgraded board medallions with 7-ring metallic bevel rims & glossy dome caps, replaced `B.fan` Wi-Fi semicircle & `B.anemone` with branching organic gorgonian fans & plush anemones, replaced flat mint foreground discs with domed warm coral-sand shoals, widened Coral Cove's radial horizon haze blend, smoothed Bottle Beach dune sand, and upgraded interior `regionInteriorAddPlant` to lush arched-leaf blooming coastal plants across Cafe, Restaurant, and Friend.

### G. Iterations 64–67 (`9.82 -> 9.95 / 10`, `0 CRIT`, `0 MAJ`, `0 MIN` Zero-Defect Pass)
- **Horizon & Water Glints (`board.js`, `crafted-world.js`, `jamboree-visuals.js`)**: Unified Coral Cove seafloor radius (`+116u` past `fogFar=96`) and `crafted-world.js` `FOG = '#dff0e6'` to eliminate the far-left diagonal horizon edge; replaced untextured square water glint planes with soft 4-point star sparkles seated at water level (`y = -0.54`) and hidden inside `captain`, `light`, `town`, and `caves`.
- **Harbor Town Signpost, Market Carts & Resident GLB Persistence (`region-mechanics.js`, `region-scenery.js`, `region-people.js`, `resident-models.js`)**: Moved the `HARBOR TOWN` signpost support pole cleanly behind the signboard, registered the harbor welcome arch as an obstacle, replaced the unchecked hardcoded signpost fallback with a clearance-maximizing sidewalk search clear of all tiles/stalls/arches/residents, boosted Cafe Seahorse & Captain Bay contact shadows, and paused non-active board residents during indoor encounters so exiting any room immediately restores Bok (in his splash tub) and all residents in full authored Blender GLB quality with zero procedural flash-back.
- **Indoor & Outdoor Micro-Craft (`encounter-interiors.js`, `region-scenery.js`, `region-people.js`, `encounter-stage.js`)**: Hid sibling `regionPeople.root` children during 3D indoor encounters (eliminating exterior slivers peeking through Cafe walls), upgraded Cafe banquette pillows to plump tufted cushions and Subway's right desk box to a sculpted transit terminal kiosk, replaced Story Lagoon stacked pink spheres with sculpted multi-petal lotus blossoms, shifted Captain's Cabin's exterior bowsprit outward so it never penetrates the right wall, registered all Pattern Reef mosaic/checkered/concentric plazas so stepping stones stay clear, exempted Jisu's bespoke coastal foreground stage from sightline hiding, pulled Jisu's right-flank props cleanly inboard, and locked Jisu's sand-grounded Y coordinate per frame across `jisu-close.glb` attachment.

### H. Iterations 68–73 — Real Wendy Profile & Locked Rubric v4.5 Highest-Realistic-Ceiling Pass (`9.90 / 10`, `0 CRIT`, `0 MAJ`, `0 MIN`)
- **Real `Wendy` Profile & Frictionless Full-World UX (`seed-data.js`, `reef.js`, `screens.js`, `grown-up-screens.js`, `library-api.js`)**:
  - Replaced `"Demo Explorer"` with real profile **`Wendy`** (`profiles/wendy`, `CORAL_COVE_SEED_VERSION = 'wendy-v1'`, preserving `createdAt/order/initialMode` so existing saves auto-migrate via `storage.js:moveRenamedProfiles()`), including 3 curated Korean starter decks (*At the Café*, *Ocean Words*, *Getting Around*).
  - Removed parent password prompts everywhere (`reefNoPin() -> true`, `needsGrownUpCheck() -> false`) and unlocked **Map → The sea** for all 8 islands by default (`reefCourseOn() -> p.courseOn !== false`).
  - Fixed pixel-centered tile icons (`<= 1px` via `getImageData` bounding-box centering in `crafted-world.js`, `tile-art.js`, `board.js`) and cleared foreground Coral Cove obstructions on tiles `0..3` (`reef3dCamClearCrafted` + Coral Cove sea-fan pullback).
- **Switch-Era Shadows, Living Water & Sculpted Worlds (`board.js`, `region-scenery.js`, `encounter-interiors.js`, `resident-models.js`, `region-people.js`, `scenes.js`)**:
  - Enabled live `THREE.PCFSoftShadowMap` across **all 24/24** desktop & mobile boards and 8 Harbor Town indoor rooms (`shadowOn: true` everywhere, throttled `autoUpdate = false`), upgraded `reef3dBakeGeo` warm golden key + cool cerulean shadow bounce, upgraded `contact()` to sun-angled cast shadows, and added crisp mullion-grid sunlit oak floor light patches inside Captain's Cabin (`04-galleria-indoor.png` parity) + recessed inner-jamb shadows and diagonal glass reflection sheen on all 8 Harbor Town room windows.
  - Added 1-draw-call animated domain-warped organic water caustics (`view.waterShimmer`, zero Voronoi polygons) + non-linear vertex-packed 4-band coastal depth gradients across all coastal boards, plus luminous aqua/amethyst/amber bioluminescent crystal & lantern floor glow pools in Echo Caves.
  - Replaced primitive horizon hills with sculpted multi-ridge stratified landmasses (`makeSculptedLandmass`), upgraded outdoor clouds to volumetric sunlit cream crowns with cool lavender undersides, enriched Harbor Town cobblestones with weathered tonal variety, recessed Harbor Town windows with sky/warm glazing, deepened `pineTree` dappled multi-cluster foliage (`05-blossom-park.png` parity), enriched Bottle Beach with 4-band sand relief & shell flecks, and upgraded Story Lagoon gazebos to carved-timber tiered pagodas with Mira framed unobstructed in the open right turquoise clearing.
  - Added in-memory GLB ArrayBuffer caching (`REGION_RESIDENT_BYTES`) and priority loading in `resident-models.js` (eliminating procedural Bok flash-back on `21-pharmacy-board.png`) and volume-preserving squash-and-stretch hop anticipation/landing bounce for Shelly (`scenes.js`).

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
| **Art & Rubric Loop** | `work/art-loop/rubric.md` (Locked Rubric v4.5), `work/art-loop/ledger.json`, `work/art-loop/refs/jamboree/` |

---

## 4. Handoff Status, Verification & Next Steps

### Recent Local Commits (`upgrade/integrated-2026-11-24`)
- `412840c` — `fix: pixel-center tile icons, clear Cafe camera obstruction, remove parent password, and unlock all regions`
- `0e4d5c9` — `art-loop: Iter 63 PASS 9.82/10 (0 CRIT, 0 MAJ) - 5 Host GLBs, Grounding, Sightlines & Craft`
- `c5b9b5f` — `art-loop: Iter 58 PASS 8.86/10 (0 CRIT, 6 MAJ) - Tidepools, Brass Sashes, Taxi, Cork Foam & Haze`

### Verification Gate Results (Iter 73 Final Rubric v4.5 Run)
- `python game/tools/build.py --check`: **PASS** (`build: index.html matches src/`, `4.4 MB`)
- `node --check` on all modified `game/src/js/reef3d/*.js`, `game/seed-data.js`, & `game/sw.js`: **PASS**
- `node tools/check/region_scenery_geometry_test.js`: **PASS** (all 7 regions × 23/24/33 stops, `-3%..+11%`, `pureAtlas` 0-canvas invariant)
- `node tools/check/jamboree_systems_test.js`: **PASS**
- `node tools/check/encounter_quality_test.js`: **PASS**
- `node tools/check/security_hardening_test.js`: **PASS**
- `node tools/check/qblock_visual_test.js`: **PASS**
- `python game/tools/check/soundtrack_verify.py`: **PASS** (`285/285`, `0` failures)
- Live Playwright 24-shot desktop (`1280×800`) & iPhone portrait (`390×844`) full-circuit capture: **PASS** (`0` page errors, `0` console errors, `0` HTTP errors, `0` layout/panel overflow, `shadowOn: true` on **24/24**, `maxCalls: 151`, `maxMeshes: 429`, `profileText: "W\nWendy"`, `manageProfilesNoPassword: true`, **`9.90 / 10` — `0 CRIT`, `0 MAJ`, `0 MIN`**)
- Service worker cache key bumped to `coral-classroom-20261127-v45-iter3`.

### Push to GitHub
Push the updated local commits on `upgrade/integrated-2026-11-24`:
```bash
git push -u origin upgrade/integrated-2026-11-24
```
