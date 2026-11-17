# Offline scenery inspection

These are offline Blender CPU renders of actual exported baked scenery geometry. They are not game screenshots or device performance measurements. Baked vertex colors multiply the actual texture atlas with the production fract/inset formula and 0.55 blend; legacy repeating floor PNGs are used in before views. Emission materials, one sample, Raw color transform, no artistic lights or invented detail. Before/after pairs share camera, bounds and exposure. Distance fog is omitted by default to expose geometry; use `--fog` to apply exported depth fog.

Pale simple disks show route tile positions; the orange disk is start. These disks are reference markers, not actual game tile art. Cove includes the exported reference seabed; it is excluded from scenery counts. Character models, full board assets, UI and imported GLTF decorations are outside these exports. Region exports use the actual procedural fallback prop kit. See manifest.json for source hashes, scope, exact camera and CPU geometry counts. Counts are scenery-only and do not establish device FPS or full-game frame rate.

Files are named REGION-FRAME-VARIANT.png; compare before/after at the same frame.

Source provenance is recorded in source-provenance.json. The CPU audit and previews cover regional scenery and CoveDetail. The additional ReefGarden/Wreck atlas tags in scenes.js are outside this export scope.
