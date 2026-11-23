# CPU scenery source comparison

Generated with `node tools/art/audit_world_scenery.cjs` using actual bundled Three r128, production BufferGeometryUtils, reef3dKit, production routes, regional activity data/zone builder, regionBoardDecorate and CoveDetail. The before source files were copied from today’s dirty working tree before this pass; hashes are embedded in each export. No browser, server, renderer or device timing was used.

Regions use the real procedural kit fallback props, with no imported GLTFs. Cove uses a representative twelve-deck profile (39 main stops / 46 total), exact production ground dunes and prop-clearance placement. Its audit includes CoveDetail only. A separately marked reference seabed is included in the Cove export for visual context and excluded from all stats. Characters, tiles, route ribbon, rewards, overview outskirt and other game scene systems are outside this scope.

| Scenery | Triangles before → after | Merged bins before → after | Static bytes before → after | New surface attribute bytes |
|---|---:|---:|---:|---:|
| town | 6,158 → 5,898 | 15 → 18 | 446,832 → 627,336 | 202,680 |
| cove | 14,064 → 14,064 | 4 → 7 | 1,012,608 → 1,462,464 | 449,856 |
| lagoon | 16,524 → 15,900 | 11 → 20 | 1,189,728 → 1,444,608 | 299,808 |
| caves | 3,275 → 2,895 | 8 → 9 | 235,800 → 312,228 | 103,788 |
| patterns | 20,562 → 17,006 | 18 → 19 | 1,480,464 → 1,836,216 | 611,784 |
| beach | 11,798 → 8,886 | 11 → 21 | 849,456 → 873,576 | 233,784 |
| light | 3,545 → 4,049 | 13 → 17 | 255,240 → 415,692 | 124,164 |
| captain | 4,549 → 3,337 | 7 → 7 | 330,240 → 359,964 | 119,700 |

Merged bins count all constructed chunk meshes, not visible frame draw calls. Frustum/fog culling can skip them. Surface vs. solid splitting increases some mesh counts while reducing most geometry counts. Every board passed the one-atlas-map, at-most-two-atlas-materials-per-chunk and 36-extra-bytes-per-tagged-triangle assertions. These static budgets do not establish iPhone XS FPS.

The atlas uses one texture lookup, baked vertex lighting, no normal map, lights, shadows, postprocessing or per-frame material work. One shared cached 128×128 neutral placeholder is generated immediately (64 KiB RGBA / ~85 KiB with mips); the shipped local JPG loads on demand and draws once into each live view’s fixed 512×512 or 1024×1024 canvas. Final GPU image allocation with mips is approximately 1.33 MiB or 5.33 MiB respectively. A view owns one map and up to two front/double-sided materials. The shared decoded source is cached; each view disposes its own GPU state.

## JSON format

`before/*.json` and `after/*.json` use schema `reef-static-world-v1` (`*-stats.json` are summaries). `objects[].attributes.position` contains flat XYZ triplets already transformed to Three.js Y-up world space. `color` contains baked RGB triplets, `uv` contains pairs and `reefSurface` contains one panel index per vertex when applicable. `index` is null for merged nonindexed triangles, so every three consecutive vertices form a face. The integer `material` indexes `materials[]`; material `map` indexes `textures[]`. Objects with `context` are outside the audit.

Current atlas textures point to the real `assets/world/world-surfaces.jpg`. For each vertex, shader panel = `(kind % 4, 1 - floor(kind / 4))`; sample UV = `panel * (.25,.5) + 8.5/1024 + fract(uv) * ((.25,.5) - 17/1024)`. Multiply baked RGB by `1 + (sampleRGB - 1) * .55` (LinearEncoding / neutral modulation data). There is one material across all eight panels for each culling side. Existing before Town/Captain Canvas maps are exported as actual RGBA PNGs generated from their production Canvas drawing operations. Ordinary repeated UV sampling multiplies those before materials.

Visual previews rendered from this data are offline approximations of source geometry/material layout, not app screenshots or WebGL/device validation.
