# Shelly reference rebuild handoff

The art target is the foreground Shelly in `generated_images/exec-c5c0781d-ccec-4077-83d0-c86a1737c794.png`. The ten proportion studies were rejected. The current crafted proof at `work/crafted-shelly-v3/proofs/quarter.png` records the starting point for this request.

## Changes the reference calls for

- The reference has a rounded sculpted brow and cheeks, recessed round eyes with dark rose-brown irises, integrated eyelid rims, small nostrils and a short closed beak seam. The game model’s wide flat eye assembly and upright exposed neck read differently even at the intended camera distance.
- The head flows into a short ridged throat and shoulder. The lavender dome has defined overlapping scutes, and the flippers are tapered, cupped and close to the plastron. Scale and scute detail follow the anatomy. Preserve these relationships when considering a new mesh or a paint pass.
- Review the silhouette and expression at the elevated game camera as well as at front, quarter, side and back. A reconstruction can reproduce a visible image while inventing its underside and hidden limbs.

## Available source and fallback

- `coral-classroom/art-source/shelly/pearl-source.glb` is the older coherent TRELLIS.2 reconstruction, with a 2K UV color map and a packed metallic/roughness map. `coral-classroom/art-source/shelly/shelly.blend` includes its editable `ShellyRig` and all six actions. The pose and face come from the earlier concept.
- `work/shelly-natural-mouth/final/shelly.glb` and `shelly-view.glb` already have an authored closed mouth, all eleven joints and six clips. `work/shelly-natural-mouth/final-whole-quarter.png` shows the reconstructed shell, creased throat and tapered fins. This is a plausible base for an exploratory face correction. The remaining differences include baked eyebrows and lashes, large white sclera, pupils that look sideways, forward human-like cheeks and a near-spherical head. Correcting the eyes requires work across the color atlas and lash geometry. The newer target also calls for head and brow shape work.
- `coral-classroom/tools/art/prepare_shelly.py` directly writes runtime models and editable source outputs even with `SHELLY_REVIEW_DIR` set. It refers to the old atlas names and uses old pose coordinates for eye, neck, flipper and anchor placement. Stage any adaptation in a separate directory with an explicit input and output path.
- `coral-classroom/tools/art/refine_shelly_mouth.py` stages separate GLBs and preserves the existing rig. Its boundary extraction, constrained hole fill and atlas patch are useful techniques. Its cut region, axis rotation and two-skin-loop assumption are specific to the existing pearl mesh.
- `work/shelly-pearl/workflow/reconstruct.py` describes the older public TRELLIS.2 sequence, from background preprocessing through image-to-3D and GLB extraction. `calibrate_trellis.py` converts the raw source’s WebP maps to JPEG and PNG for the legacy loader. Both scripts have fixed paths to the earlier source and outputs. No reconstruction was started during this audit.

## Runtime contract and staging

- Use a single opaque skinned mesh and material. Keep a 2048 px painted color atlas plus a 512 px packed roughness/metallic map for the main model. The viewing tier uses 1024 px color plus 256 px surface. Work within the existing 23,836 and 11,947 triangle ceilings. Keep UVs intact during topology cleanup and check actual exported counts.
- Reuse the animation names `Idle`, `Swim`, `Turn`, `Happy`, `Curious` and `Celebrate`. The armature uses `Root`, `Body`, `Neck`, `Head`, `FlipperFL`, `FlipperFR`, `FlipperRL`, `FlipperRR`, `Tail`, `EyeL` and `EyeR`. Place `HatAnchor` at the crown and `MouthAnchor` at the muzzle, both attached to `Head`. Refit pivots and weight falloff against the new mesh. The legacy eye deformation is a shallow squint of a painted surface, so review it closely with any revised eyes.
- In Blender the model faces −Y and rests at Z = 0. glTF export converts this to +Z forward and Y up. The crafted adapter reads `crafted-shelly.glb` and `crafted-shelly-view.glb` and fits the creature to the existing guide wrapper. `work/redesign-artbook/check_crafted_shelly.cjs <staged-directory>` exercises the production loader and attachment code offline, including skin weights, model limits and all six clips. Visual poses and actual game-camera framing require separate inspection.
- Start with all-angle and topology inspection before rigging. Review disconnected components by bounds and significance before dropping them. UV-split vertices can make one intact surface look disconnected, and welding distinct undersides or folds can damage the shape. Retain the untouched reconstruction. Test the downsampled viewing tier separately because eyelids, beak edges and scute breaks can degrade first.

## Work left in this folder

`inspect_mesh.py` is a draft, offline Blender diagnostic for an unrigged input GLB. It normalizes height and yaw, reports the bounds of positional components using a temporary analysis mesh, and can render color or clay views into a caller-selected folder. No renders, output GLBs or rigging adaptation were produced during this audit. The script has not been exercised in Blender. The current runtime, source assets and earlier review outputs were left as found.
