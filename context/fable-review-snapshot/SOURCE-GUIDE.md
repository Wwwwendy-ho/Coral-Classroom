# Source guide

`source-snapshot/` contains selected current development files copied into this review, with hashes in `manifest.json`. These are not a complete runnable checkout; dependencies, learning modules and large model/audio assets are deliberately omitted. The repository root still contains the older public game. Do not combine the two trees and assume that is a tested release.

| Review concern | Snapshot files |
|---|---|
| Atlas shader, UV projection, ownership, mobile sizes | `src/js/reef3d/world-surfaces.js` |
| Static color baking and spatial batches | `src/js/reef3d/board.js` |
| Regional geometry and materials | `src/js/reef3d/region-scenery.js` |
| Sculpted Cove contours and larger scene systems | `src/js/reef3d/world-detail.js`, `scenes.js` |
| Travel tile surfaces and top/body batching | `src/js/reef3d/tile-art.js` |
| Region route loops / overview environment | `src/js/reef3d/world-routes.js`, `world-overview.js` |
| Residents, scale, interaction staging and model LOD | `region-people.js`, `resident-models.js`, `encounter-stage.js` |
| Shelly asset and motion lifecycle | `src/js/reef3d/shelly.js` |
| Cameras, quality tiers, disposal | `src/js/reef.js`, `region-boards.js`, `reef3d/day-night.js`, `post.js` |
| UI legibility / dialogue layout | Snapshot `src/css/` files |
| Actual offline export/render implementation | Snapshot `tools/art/` files |

[World-pass diff](evidence/world-pass-diff.patch) compares selected files with a same-session pre-pass working-tree baseline, not public main. The new world-surfaces helper appears in full in the snapshot. Cove’s newly tagged ReefGarden/Wreck systems in scenes.js are outside the narrower CoveDetail audit/render scope. Other omitted game systems are listed in the audit.

The static audit uses bundled Three r128 and production constructors/mergers. Geometry attributes, texture modulation, character/tile exclusions, lifetime/disposal and regional geometry bounds have focused tests. The integration report records build, lint and portable artifact checks. No current full-app browser render or physical-device measurement was available for this pass. Earlier browser images are clearly separated.
