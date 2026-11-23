# Build, runtime and verification

## Source and build

The application is static HTML/CSS/JavaScript with Three.js r128 and a small build script. `game/src/page.html` includes source fragments under `src/js/` and `src/css/`; they share one script scope. `index.html` is generated. Edit source, then:

```sh
cd game
python3 tools/build.py
python3 tools/build.py --check
```

Use the supplied `tools/serve_handoff.py` launcher from the handoff root. It opens a loopback-only server at port 8820; Ctrl+C stops it. It also serves canonical `game/` assets as a fallback under `review-site/play/` for voices, vocabulary/friend pictures and regional audio omitted from the lightweight original hosted preview. This avoids duplicating large audio folders. A plain generic HTTP server will still show the original review but will not provide that fallback. There is no runtime npm install required for the app. Voices/audio/images are shipped static assets. PWA behavior depends on `manifest.webmanifest` and `sw.js`; the isolated review copy removes SW registration. A stale service worker can explain old assets on a normal production origin.

## Source map

| Path in `game/` | Responsibility |
|---|---|
| `src/js/reef3d/board.js`, `scenes.js` | Board scene composition, movement, lifecycle |
| `src/js/reef3d/crafted-world.js` | Opt-in crafted Coral Cove scene |
| `src/js/reef3d/shelly.js` | Guide loader, model/animation adapter |
| `src/js/reef3d/resident-models.js` | Resident model registry and lazy loading |
| `src/js/reef3d/region-people.js`, `encounter-stage.js` | Resident placement / actual NPC encounter view |
| `src/js/reef3d/world-routes.js`, `tile-art.js` | Route placement and tile geometry/art |
| `src/js/reef3d/world-surfaces.js`, `world-detail.js`, `world-overview.js`, `region-scenery.js` | Baked surface system, contours, landmarks and outskirts |
| `src/js/region-boards.js`, region-specific source files | Regional activities and route learning hooks |
| `assets/models/`, `reef-models.js` | Runtime models and legacy inline model payload |
| `art-source/`, `tools/art/` | Editable art assets, concepts, atlas sources, Blender generators and audits |
| `storage.js`, `seed-data.js` | On-device DB adapter and fictional packaged starting data |
| `tools/check/` | Focused CPU, source and browser checks |

## Test setup on Antigravity

Read `game/tools/check/README.md`, then install developer dependencies in the destination if needed:

```sh
cd game/tools/check
npm install
npx playwright install chromium
python3 -m pip install tinycss2 pillow
cd ../..
sh tools/check/run.sh
```

The full suite starts a local server and invokes Playwright. Run it only where browser execution is supported. In this original managed Sites environment, browser/server control was unavailable; offline checks were used, and no current browser/phone pass is claimed. Some old smoke selectors refer to the removed multiplication gate; inspect/update meaningful expectations rather than bypassing failures. Focused tests include region expansion, depleted surprise blocks, route geometry, resident lifecycle/bounds and asset anatomy. Run checks relevant to each change, then required integration checks; do not claim the entire old suite passes based on one focused check.

For art, Blender 4.3.2 was available; Python NumPy/SciPy/Pillow and local Three were used for export/validation. EEVEE rendering failed in the previous headless container due to EGL; Cycles CPU worked. This does not imply the same limit on the destination computer.

## iPhone XS constraints

- One shared renderer/canvas for board and encounters; avoid creating additional contexts or holding every detailed resident at once.
- Lazy load the active region and near/encounter models; reuse warmed assets selectively, suspend hidden views and dispose ownership correctly.
- Board/view LOD and separate close tier; high-resolution textures only when meaningful. Batch static scenery, share materials and atlas data.
- Prefer opaque satin-glass impressions, baked lighting/contact shading and painted detail to refraction, real-time shadows, extra post passes and alpha stacks.
- Keep detail concentrated on travel tiles, active NPC and landmarks; background silhouettes cheaper. Avoid per-frame allocation or geometry/texture regeneration.
- Adaptive pixel ratio/resolution, existing touch tiers and time-based pacing support Low Power Mode. Do not assume requestAnimationFrame is always 60 Hz or halve a 30 Hz callback stream again.
- Measure cold/warm loading, rapid region changes, encounter open/close, memory retention, long tasks, frame-time percentiles and input responsiveness on actual iPhone XS. Offline render time and triangle counts alone are not performance validation.

## Staging hazards

`tools/art/prepare_shelly.py` hardcodes old geometry/atlas/pivots and overwrites runtime/editable outputs. `refine_shelly_mouth.py` has old-model-specific crop coordinates and topology assumptions. `tools/art/build_crafted_shelly.py` creates the current unsatisfactory procedural candidate; `build_crafted_shelly_options.py` creates the REJECTED studies. Do not run them as a purported fix without changing the underlying approach.

Selected `work/redesign-artbook/` build scripts contain original `/workspace/` paths and file-copy assumptions. The provided `review-site/` can be served immediately, but regenerating it on Antigravity requires re-rooting those paths against `game/` and this handoff directory. Do not hand-edit generated game code as the long-term fix. Hosting credential helpers and deployment secrets were not exported.
