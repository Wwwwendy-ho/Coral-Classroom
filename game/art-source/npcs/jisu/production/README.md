# Jisu production candidate

Review candidate only. No active GLB, runtime code or Site files were changed.

Jisu is a small, low-bodied *Calcinus elegans* hermit crab with six grounded walking legs and two unequal chelipeds. The dark navy cuticle has cobalt bands and pale claw speckles; the carried shell has continuous helical shoulders, weathering, fine growth lines, a rolled aperture and an interior bowl. Orange antennae and peduncles support the approved glossy near-black eyes with a muted gray-violet surround. The mouth consists only of paired small maxillipeds. A rounded orange canvas pouch, strap, cream envelope and sculpted orange scallop seal carry the postal role.

| Level | Triangles | GLB bytes | Color | Surface | Export vertices |
| --- | ---: | ---: | --- | --- | ---: |
| Board | 7,658 | 663,688 | 1024² JPEG | 256² PNG | 4,738 |
| Close | 21,318 | 1,771,084 | 2048² JPEG | 512² PNG | 12,135 |

Each GLB has one skinned primitive, one material, two embedded textures and 14 bones. Actual serialized joint/weight buffers were audited: no unweighted vertices, one influence per vertex, every weight sum exactly 1.0. `Idle` (2.43 s), `Listen` (1.57 s) and `React` (1.03 s) contain independent eye-stalk orientation, readable lateral lean, antenna response and small body/claw gestures.

Open `jisu-production.blend` for the editable packed mesh, rig, actions and textures. `turntable-close.jpg` and `turntable-board.jpg` collect the actual exported/reimported GLBs' front, quarter, side and back CPU Cycles renders. Individual full-size images are in `review-close/` and `review-board/`. `eye-acting.jpg` compares neutral, idle focus shift, listening and quick reaction. The pose folders retain individual images.

Rebuild from the repository root:

```sh
blender -b -t 4 --factory-startup --python tools/art/build_jisu.py -- --output /workspace/work/jisu-rebuild
```

The builder uses the existing `build_cafe_seahorse.py` mesh, atlas-material and GLB-report helpers. Jisu's anatomy, shell, painted atlas and motion are authored in `build_jisu.py`. The raw million-triangle reconstruction and obsolete human grin were not used.

Reproduce a review render:

```sh
blender -b -t 4 --factory-startup --python art-source/npcs/jisu/production/render-review.py -- --source art-source/npcs/jisu/production/jisu-close.glb --output /workspace/work/jisu-review --size 640 --samples 24
```

Add `--clip Listen --frame 17 --views front`, `--clip React --frame 9 --views front`, or `--clip Idle --frame 21 --views front` for eye acting proof. All rendering is offline on the CPU; no browser, server or paid compute was used.

The mobile rig provides restrained leg and claw gestures; it does not include multi-joint walking IK or a pincer-opening cycle. Fine shell growth marks and canvas weave combine geometric shape with painted relief shading in the shared atlas. World-size fitting and existing delivery/electrical cues remain responsibilities of the resident adapter. Root visual review is required before activation.
