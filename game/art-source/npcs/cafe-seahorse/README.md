# Café seahorse

The café owner uses the attentive A-eye direction from the [cast expression review](../../cast-review/expression-review/sheet-02.png). The [full-body concept](concept-input.png) guided the peach-and-gold scutes, cream apron, coffee badge, and curled tail. The editable [Blender sculpt](polish/cafe-seahorse.blend) contains the packed texture atlases and 11-bone rig.

Each GLB uses one skinned mesh and one material. The color atlas carries the freckles, ridge accents, iris pigment, canvas stitching, and coffee badge. A smaller metallic-roughness atlas controls the eye, skin, canvas, and brass finish.

| Level | Triangles | GLB bytes | Color | Metallic-roughness |
| --- | ---: | ---: | --- | --- |
| [Board](polish/board-report.json) | 7,880 | 530,432 | 1024² JPEG | 256² PNG |
| [Close](polish/close-report.json) | 20,848 | 1,246,092 | 2048² JPEG | 512² PNG |

Idle shifts the eyes briefly toward the counter and returns to the customer. Listen holds the gaze through a small acknowledgment. React gives a brief lift and nod. Independent eye joints aim each eye while the orbital rims follow the head. Both levels contain the same three animation clips.

## Rebuild

Run from the project root with Blender 4.3.

```sh
blender -b --factory-startup --python art-source/npcs/cafe-seahorse/polish/build_candidate.py -- \
  --output /tmp/cafe-seahorse
```

The generator writes the two GLBs, an editable blend file, the generated atlases, and a report for each GLB. The character's Blender forward direction is rotated 34° toward the encounter camera so the snout and near eye are visible together.

The [turntable](turntable.png) and [motion sheet](motion.png) show CPU renders of the exported and reimported GLBs. The board asset was also rendered offline. These renders verify the asset's appearance and rig poses. Phone frame pacing still needs on-device testing.

The active polish pass seats the eyes into a tapered orbital rim, aims the near pupil toward the customer, and clarifies the apron pocket and stitching. The [comparison sheets](polish/face-comparison.png) show before/after actual model views. The original generator remains the base for the reproducible polish layer.
