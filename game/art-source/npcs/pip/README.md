# Pip — royal gramma authored candidate

This directory holds an authored 3D candidate for review. Activation and runtime integration belong to the parent task. The models use one skinned primitive/material with two embedded atlas maps at each level.

Rebuild from repository root:

```sh
blender -b -t 4 --factory-startup --python tools/art/build_echo_pip.py -- --character pip --output /workspace/work/vertebrate-production/pip
```

Blender 4.3, NumPy and SciPy are required. `--skip-render` builds assets only; `--render-only` checks existing exported GLBs by importing them into a fresh scene. `--views front,quarter,side,back,eyes` is the default. The close editable blend packs its material images. All review images are CPU renders of exported and reimported GLBs. They do not establish browser or device FPS.

The board atlas is 1024 color / 256 surface; close is 2048 color / 512 surface. Surface channels are R=1, G=roughness, B=metalness. The color atlas contains pigment, iris fibers, natural surface variation and cloth detail. GLB reports count the actual exported triangles, bytes, draws, bones, embedded image dimensions, clip targets, and normalized skin weights. Eye motion reports decode actual GLB animation buffers.

Idle, Listen and React use independent Eye.L / Eye.R tracks with small species motions. The mouth stays anatomically restrained. Pip retains a natural fish body plan, a violet anterior / yellow posterior split, pigmented scales and fin rays, a recessed terminal oval mouth, and a small mint notebook. Its orbital contours are fixed: no eyelid or blink control is present.

Direction: [cast brief](../../cast-review/CAST-DIRECTION.md), [expression manifest](../../cast-review/expression-review/manifest.json).
