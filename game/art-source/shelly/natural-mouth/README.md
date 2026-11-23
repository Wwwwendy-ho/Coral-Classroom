# Natural beak refinement

The accepted pearl Shelly retains her eyes, pastel palette, shell and flippers. This pass replaces only the open mouth cavity, tongue and adjacent lower-face patch with a continuous closed beak and shallow crease. Both runtime detail tiers use the same local surface design.

`shelly.blend` is a packed editable import of the full exported model. `face-views.jpg` and `whole-views.jpg` show offline CPU renders of the actual GLB from multiple sides. They are appearance checks, not browser or device performance measurements.

| Runtime file | Triangles | Bytes |
| --- | ---: | ---: |
| `assets/models/shelly.glb` | 23,836 | 3,118,368 |
| `assets/models/shelly-view.glb` | 11,947 | 1,257,572 |

Both retain one skinned primitive, one material, the 11-joint rig, HatAnchor and MouthAnchor, and the original Idle, Swim, Turn, Happy, Curious and Celebrate animation payloads. The mouth is a sculpted resting expression; this does not add speech lip-sync.

## Rebuild

First rebuild the original accepted pearl exports with `tools/art/prepare_shelly.py` into a separate baseline directory. Then run:

```sh
python3 tools/art/refine_shelly_mouth.py --source-dir /path/to/baseline --output-dir /path/to/candidate
```

The refinement uses NumPy, SciPy, Pillow and Blender 4.3. It preserves the retained vertex attributes and reuses a former mouth-interior atlas chart for the new surface. Do not run it a second time on an already-refined model. Inspect front, quarter, both profiles and low angles before replacing runtime assets. The historical `tools/art/shelly.py` is not the source of this accepted pearl character.
