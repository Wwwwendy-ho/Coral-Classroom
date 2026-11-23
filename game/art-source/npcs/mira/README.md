# Mira: coastal teenage sea turtle candidate

Candidate review assets only. No runtime asset, registry or world scale is changed.

The continuous organic base derives from the accepted `art-source/shelly/natural-mouth/shelly.blend`, preserving the A-eye appeal and closed natural beak. The head is reduced to 88% while the body is broadened to 114%, lengthened to 117%, and the foreflippers gain reach. This is a family relationship with an older juvenile silhouette. Mira has seafoam/cream skin, a matte slate/sage shell, practical copper-rim forehead goggles, fitted crossbody webbing and a coral canvas chart satchel. The full back, hidden side of the bag and convex lenses are real geometry.

Goggles are rigidly Head weighted; the bag and webbing follow Body. `HatAnchor` and `MouthAnchor` remain parented to Head. `Idle`, `Listen` and `React` have authored eye scale/attention shifts and head/flipper motion: alert relaxed attention, decisive exploration and a companion check-back. The natural resting beak does not change into a human expression. The source has baked facial highlights; the export's packed surface map makes the skin and shell matte, the brass restrained and the opaque blue lenses smoother.

| Export | Triangles | Bytes | Color | Packed surface |
| --- | ---: | ---: | --- | --- |
| `production/mira-close.glb` | 23,700 | 2,375,784 | 2048² JPEG | 512² PNG |
| `production/mira-board.glb` | 11,200 | 1,121,280 | 1024² JPEG | 256² PNG |

Each export has one skinned mesh, one primitive, one material, two embedded maps and 11 joints. `production/mira.blend` is the packed editable close source. `validation.json` reads the actual GLB buffers and embedded textures; it checks budgets, normalized weights, finite geometry, clip eye/head channels, anchors and nonzero body roughness. `asset-report.json` describes the authored source and tier contract.

`production/close-proof/` and `production/board-proof/` contain neutral daylight CPU Cycles renders after GLB reimport: front, quarter, both sides, back, attentive Listen and exploratory React. The close set also includes face front and quarter views. These are static offline appearance/rig proofs; they are not device performance measurements. Root owns final direction approval, teen world scale and active integration.

Rebuild from the repository root with Blender 4.3, NumPy and Pillow available:

```sh
blender -b -t 4 --factory-startup --python tools/art/build_mira.py
python3 art-source/npcs/mira/validate.py art-source/npcs/mira/production
blender -b -t 3 --factory-startup --python tools/art/build_mira.py -- --render --tier close --size 512
blender -b -t 3 --factory-startup --python tools/art/build_mira.py -- --render --tier board --size 384
```

An optional `--output /path/to/review` stages the entire build away from the source tree. No inference, remote generation or browser renderer is required. Do not rerun the source derivation against Mira; it deliberately starts from the accepted natural-beak family source each time.
