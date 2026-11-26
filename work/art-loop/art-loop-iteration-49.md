# Art Loop Iteration 49 — Grounding, Placement & Jamboree Benchmark Pass

- **Date**: 2026-11-26
- **Rubric**: `v3.0-jamboree` (Super Mario Party Jamboree Benchmark)
- **Verdict**: **`PASS`** (`0 CRIT`, `3 MAJ`, `11 MIN`)
- **Overall Weighted Score**: **`8.98 / 10`** (`D1: 9.2 | D2: 9.0 | D3: 9.1 | D4: 8.9 | D5: 8.6 | D6: 9.0`)
- **Screenshot Set**: `art_loop_iter49/` (21 PNGs: desktop `1280×800`, mobile `390×844`, all board captures with Menu CLOSED and audio strictly muted)

## Changes Applied in Iteration 49
1. **Jisu Board & Encounter Grounding (`game/src/js/reef3d/region-people.js`)**:
   - Set `best.boardPitch = 0`, `best.boardYOffset = -.414 - jMinY - (space.y || 0)`, and `jisuEncY = boardYOffset - 0.075` so all 6 hermit-crab legs sit solidly on both the Bottle Beach shoreline (`11-bottle-beach.png`) and golden encounter sand (`17-jisu-encounter.png`).
2. **Taxi Yellow Cab Roof Drip-Rail Fix (`game/src/js/reef3d/encounter-interiors.js`)**:
   - Fixed the 13-argument `regionInteriorAddCyl` call in `regionInteriorAddParkedYellowCab` to 12 arguments (`0, Math.PI / 2`), eliminating the two vertical rabbit-ear spikes on `14-taxi.png`.
3. **Lighthouse Rotunda Floor Cleanup (`game/src/js/reef3d/region-scenery.js`)**:
   - Removed the 4 `ropeCoil` floor placements in `light()` (`07-lighthouse.png`), leaving the marble rotunda floor, potted ferns, and compass inlay clean.
4. **Story Lagoon Storybooks & Reeds Clearance (`game/src/js/reef3d/region-scenery.js`)**:
   - Added `2.8u` `lagBookPositions` and `8.2u` hero-camera clearance to `reeds()`, widened `pavSpot` clearance to `4.4u`, and added `view._sceneryObstacles` clearance (`>= (o.r||1) + 2.4u`) in `placeGiantStorybooks()` (`08-lagoon.png`).
5. **Bottle Beach Bench & Palm Bottle Clearance (`game/src/js/reef3d/region-scenery.js`)**:
   - Registered `palmTree` and `bench` coordinates in `beachNoBottleZones` (`r = 2.5u`) (`11-bottle-beach.png`).
6. **Resident In-Flight Serialization (`game/src/js/reef3d/resident-models.js`)**:
   - Restored `REGION_RESIDENT_MAX_INFLIGHT = 1`.

## Automated Verification
- `python tools/build.py` & `python tools/build.py --check` -> PASS (`index.html matches src/`)
- `python tools/check/soundtrack_verify.py` -> PASS (`285/285`)
- `node tools/check/region_resident_close_test.js` -> PASS
- `node tools/check/region_resident_cast_test.js` -> PASS
- `node tools/check/region_people_actual_test.js` -> PASS
- `node tools/check/region_people_bounds_test.js` -> PASS
- `node tools/check/region_scenery_geometry_test.js` -> PASS (all 7 regions across `23`/`24`/`33` stops)
- `node tools/check/world_surfaces_test.js` -> PASS
- `node tools/check/resident_asset_test.js` (critic run): 8/9 cast IDs pass (`pip.glb` `7040 > 6500` tris logged as `MAJ-3`)

## Remaining Non-Critical Follow-Ups (`3 MAJ`, `11 MIN`)
- `MAJ-1`: `08-lagoon.png` opaque white sky beam wedge right of the HUD pill.
- `MAJ-2`: `02-harbor-town.png` Sua's nose touching tugboat bow post sphere & Hotel Whale half-cropped at left edge.
- `MAJ-3`: `game/assets/models/pip.glb` triangle budget (`7040 > 6500`).
