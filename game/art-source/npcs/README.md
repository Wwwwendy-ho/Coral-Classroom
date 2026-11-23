# Resident asset production

The approved cast choices remain in `../cast-review/`. Each production concept is preserved as `<id>/concept-input.png`. These images are references, not game sprites.

The first exported candidate is `taxi-squid/source-reconstruction.glb`, reconstructed using the connected Hugging Face TRELLIS.2 MCP Space. The original is retained without modification. `taxi-squid/taxi.blend` is the editable mobile cleanup and two-bone rig. The runtime file is `../../assets/models/taxi-squid.glb`: 7,999 triangles, one material, 1,257,900 bytes, 1024 color and 512 surface textures, `Idle` and `React` clips. Its bored eyelids and closed mouth are sculpted; these clips move the body rather than animate the face.

Reproduce the export with:

```sh
blender -b --factory-startup --python tools/art/prepare_npc_reconstruction.py -- --source art-source/npcs/taxi-squid/source-reconstruction.glb --output assets/models/taxi-squid.glb --name TaxiSquid --forward=-Y --triangles 8000 --texture-size 1024 --roughness-floor .58 --metallic-scale .1 --blend-output art-source/npcs/taxi-squid/taxi.blend
```

Do not weld the split reconstruction seams before decimation: the taxi source became distorted in that trial. The exporter now preserves those seams. The surface calibration raises roughness and reduces metallic response without repainting the base-color texture. Review the remaining lavender cast and warmer scarf against the concept before treating this as final palette approval.

Actual GLB front/quarter/side/back and motion extrema were inspected with `tools/art/render_npc_turntable.py`. `tools/art/build_resident_preview.py` builds the separate interactive angle review. Browser rendering and physical iPhone XS frame pacing have not been verified in this pass.

Jisu and the octopus concepts are ready, but their detailed model exports did not complete before the connected service's daily free allowance ran out. Keep the improved procedural residents and their interactions until actual source models are available. Never register absent files or substitute the concept images for 3D actors.

The conversation tier is `taxi-squid-close.glb`:22,000 triangles,2048 color,512 surface,one material,2,946,048bytes. It is loaded only for the matching conversation and released on exit. The8k board and512-color portable copies retain their existing byte budgets. All marine encounters get a sharper render budget; low-tier sustained frame pressure falls back to the board pixel cap. Browser and physical iPhone XS checks remain outstanding.
