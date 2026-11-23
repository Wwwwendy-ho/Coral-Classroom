# Adult shop octopus candidate

Authored 3D production candidate for root visual review. These files do not activate or replace runtime assets.

`shop-octopus-board.glb` and `shop-octopus-close.glb` contain one skinned primitive, one OPAQUE `OctopusSkinMask` material, two embedded PNG maps, twenty bones, and `Idle`, `Listen`, `React` clips. The packed `shop-octopus.blend` is the editable close source. All eight arm centerlines and the mesh/atlas/rig are reproducible from `tools/art/build_shop_octopus.py`; the reconstruction source GLB is unused.

The adult silhouette has a broad weighted mantle, eight asymmetrically curled tapering arms, two cream sucker rows on each arm, ruby/brick skin with restrained mottles and seeded nonperiodic papilla/pore shading, and a stitched indigo denim apron. Each eye has its own aim bone; measured customer/item glances and a small service-arm gesture accompany the three calm clips. There is no visible mantle mouth or smile. The interior beak is not exposed in this mobile mesh.

| Asset | Triangles | Bytes | Color / surface |
| --- | ---: | ---: | --- |
| Board | 7,808 | 933,684 | 1024 / 256 |
| Close | 21,744 | 2,375,644 | 2048 / 512 |

Both levels have twenty bones, at most two normalized vertex influences and one material/primitive.

## Rebuild and inspect

From the repository root, using Blender 4.3 and Python with Pillow:

```sh
blender -b -t 4 --factory-startup --python tools/art/build_shop_octopus.py -- --output art-source/npcs/shop-octopus/production
blender -b -t 4 --factory-startup --python tools/art/render_npc_turntable.py -- --source art-source/npcs/shop-octopus/production/shop-octopus-close.glb --output art-source/npcs/shop-octopus/production/review-close --size 768 --samples 32
blender -b -t 4 --factory-startup --python tools/art/render_npc_turntable.py -- --source art-source/npcs/shop-octopus/production/shop-octopus-close.glb --output /workspace/work/octopus-production/review-react --size 768 --samples 32 --clip React --frame 25
```

The helper audits the actual GLB, preserves its exact indexed PNG payloads, checks embedded alpha by decoding the PNG data, checks normalized weights, and reimports both models to inspect the real exported animation matrices. `*-report.json` records final byte/triangle/map budgets; `*-anatomy.json` records each arm's control stations, independent vertex range, one root/one tip cap, connected component, Euler characteristic and manifold edge count. `*-reimport-proof.json` records conservative arm surface clearances and eight tip positions in nine poses per clip from the imported rig. Shared crown attachments before arm parameter .28 are explicitly excluded from the clearance calculation.

The atlas uses color alpha 255 only for skin/arms; eyes, suckers, apron, pocket, straps and brass all have alpha 0. It remains an OPAQUE material. The runtime's existing `baseColorAlpha` skin adapter can therefore recolor skin without affecting those protected regions. RGB under alpha 0 is preserved by quantizing RGB before constructing the two mask palette ranges. There are no alpha-blended overlays, extra materials, normal-map requests or runtime texture creation.

`review-close` contains CPU Cycles renders of the exported/reimported model from front, quarter, side and back, plus Listen/React front and quarter poses. `review-board` contains board front/quarter checks. Offline proofs do not claim browser, dialogue lifecycle, intentional camouflage or device performance validation; those remain root integration checks. The eight-arm tube topology is proved at generation and conservative imported-pose clearances are sampled rather than a continuous collision solver.
