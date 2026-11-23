# Café seahorse polish

This candidate follows the original seahorse sculpt and approved palette. The eye sockets taper into the bridge and cheeks, and the near eye aims closer to the encounter camera. Both eyes remain open during Idle, Listen, and React.

Warmer peach pigment and golden scute edges give the face and plates more definition. The apron keeps its cream canvas and coffee badge. Its pocket opening sits below the waist strap. Darker stitches outline the pocket and seams.

The geometry uses the original triangle counts and UVs. Both versions retain one draw, one material, 11 joints, and the shared color and metallic-roughness atlases. [Validation details](validation.json)

[Face comparison](face-comparison.png) · [Full-body comparison](body-comparison.png) · [Idle comparison](idle-comparison.png)

## Rebuild

From the project root, run with Blender 4.3.

```sh
blender -b --factory-startup --python art-source/npcs/cafe-seahorse/polish/build_candidate.py -- \
  --output /tmp/cafe-polish
```

The Blender source and board and close GLBs are generated in the output folder.
