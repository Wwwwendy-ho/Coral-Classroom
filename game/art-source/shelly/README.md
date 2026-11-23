# Shelly pearl prototype — awaiting visual approval

The current target is **option 6's Lavender pearl appearance with option 17's Bright explorer expression**. This is a review prototype, not an approved replacement for the whole cast. The earlier procedural models did not meet the requested direction.

Private browser review: https://coral-shelly-pearl-review.tangyelk25.chatgpt.site . This separate review Site hosts the 3D viewer, animation video, still views and download. The main game has not been rolled out. Its hosting source is `/workspace/sites/coral-shelly-review`; preserve that checkout's Site identity when updating the review.

The current surface was reconstructed from the original generated concept with [Microsoft TRELLIS.2](https://huggingface.co/microsoft/TRELLIS.2) (MIT), then its materials were calibrated, stray geometry removed, mesh simplified, and skeletal motion authored in Blender 4.3.2. It is an image-assisted reconstruction with Blender cleanup and rigging. It is not a wholly hand-sculpted production character. The successful reconstruction used the public free Space; no paid compute or account credits were used.

## Current editable inputs

- `concept-input.png`: the original generated full-body reconstruction input combining the selected direction.
- `pearl-source.glb`: calibrated high-resolution reconstruction before cleanup and rigging.
- `pearl-color.png`, `pearl-surface.png`: lossless calibrated source textures.
- `pearl-color-runtime.jpg`: 2048 × 2048 color texture used by the exporter.
- `pearl-surface-512.png`: derived compact roughness/metalness texture.
- `shelly.blend`: current full-detail mesh, packed textures, 11-bone armature, six actions and attachment anchors. This file is saved **before** producing the smaller viewing LOD.
- `../../tools/art/prepare_shelly.py`: canonical reproducible cleanup, rigging and export script.

From the repository root:

```sh
blender -b --factory-startup --python tools/art/prepare_shelly.py
python3 tools/art/build_shelly_preview.py build/shelly-preview.html
```

The exporter writes both GLBs below and an asset report in `build/shelly-pearl/`. Set `SHELLY_REVIEW_DIR` to change the report directory. It runs locally without remote inference. Reconstructing the original mesh again is not necessary to edit or export this character.

## Export and runtime contract

| Export | Geometry | Textures | Size |
| --- | --- | --- | --- |
| `assets/models/shelly.glb` — higher tiers and orbit review | 23,999 triangles, one skinned primitive/material | 2048 color, 512 surface | 3,258,932 bytes |
| `assets/models/shelly-view.glb` — mobile tiers and embedded game | 11,998 triangles, one skinned primitive/material | 1024 color, 256 surface | 1,297,924 bytes |

Both exports contain 11 bones, `HatAnchor` and `MouthAnchor`, and six root-motion-free clips: `Idle`, `Swim`, `Turn`, `Happy`, `Curious`, `Celebrate`. No required glTF extensions or external textures are needed. The smaller viewing export shares the rig, UVs, material style and clips, with reduced mesh and texture detail.

Blender uses Z-up and faces -Y; glTF uses Y-up and faces game +Z. The runtime fits the character to 1.48 game units. Eye-region bones provide stylized squint, widening and blink motion; this prototype has no separate eyelid or lip-sync rig. Every clip keys neutral boundary transforms to avoid stale poses.

`src/js/reef3d/shelly.js` loads the new character only for `?shelly=storybook` or `window.REEF_SHELLY_PREVIEW`. The regular route retains the classic guide. The adapter preserves the board's route/reward ownership, swaps the animated child after successful loading, crossfades clips, retains the original guide on failure, and freezes a quiet pose for Calm Motion. Day boards use Shelly; the night guide remains Lumi. The lobby and study mascots are outside this prototype.

Quality tiers 2–3 load the smaller authored model for the visit; higher tiers load the main model. Later quality changes adjust texture size without downloading or replacing a live rig. The hero alone receives sRGB output correction, without changing the board's global lighting or color behavior.

The revised clips use clearer paddling, waving, head tilts and eye-region squints. Neutral diagnostic geometry/appearance is unchanged. The offline review movie samples actual poses at 24 fps; it is a motion demonstration, not a device performance measurement.

## Historical files

`tools/art/shelly.py`, `shelly-sculpt.blend`, the older atlas/face/body images, and `rejected-sage-draft/` preserve earlier rejected work. **Do not run the historical script to regenerate the current production-path GLB.** `PAUSED.md` is retained as a dated record with a supersession notice.

Review the actual orbit views and in-game captures before approving the design. Cloud Chromium checks do not establish physical iPhone/iPad performance.
