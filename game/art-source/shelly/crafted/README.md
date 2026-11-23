# Organic Shelly for the crafted world

This is the separately authored sea-turtle model used by `?art=crafted&shelly=storybook`. It replaces the old creature only in that opt-in preview. The original Shelly assets remain unchanged.

`tools/art/build_crafted_shelly.py` generates new head, neck, shell, belly, four paddles, eyes, tail and painted maps while retargeting the existing 11-joint animation skeleton and six clips. Rebuild with `python3 tools/art/build_crafted_shelly.py --output-dir /tmp/crafted-shelly`. It uses NumPy, SciPy, Pillow and the original model's rig/container. The skin and opaque lavender scutes are biological surfaces; they are not glass or stone.

The two runtime GLBs and a lightweight transparent loading pose are under `assets/models/crafted-shelly*`. The manifest records the activated files. The loading image is an offline render of the same lightweight asset, used as 2D artwork without creating another 3D scene.

Review included reimported front, quarter, side, back and overhead images. Four continuous separately weighted flippers are visible overhead. The small centered tail remains tucked under the rear shell. `validation.json` records topology groups, joint transforms, weights, anchors, texture sizes and clips. `runtime-audit.json` independently exercises the actual Three loader, attachment, detail selection and animated poses, including ignoring the obsolete inline model. Both tiers fit the original triangle and encoded-file budgets.

These checks do not establish pixel identity with the approved illustration or performance on a physical iPhone XS. Browser capture was unavailable during this revision. Continue inspecting anatomy and rendered poses when changing the model or animations.

## Elevated-camera face revision

The owner found the v2 eyes too snake-like from above. V3 changes the actual sockets and corneas, bringing the eyes forward and making their upward-facing volume more readable. The forehead is rounder and its scale contrast is softer; the turtle retains a natural closed beak. This is an implemented review candidate, not a new approval of the whole cast.

Reimported GLB renders were checked at the board camera and directly overhead, as well as front and side angles. `eye-projection-comparison.json` records projected dark-pupil vertex proportions as supporting evidence of reduced foreshortening; it is not a cuteness score or an occlusion/GPU test. Anatomy and all six clips were rechecked. The prior manifest is retained as `manifest-v2.json`.
