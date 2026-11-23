# Travel tile surfaces

`shellstone-source.png` is original generated shellstone artwork created for Coral Classroom. `assets/world/shellstone-color.jpg` is its compact 512 × 512 runtime copy (about 53 KB). The original is retained for further art work.

`src/js/reef3d/tile-art.js` builds a continuous worn bevel with small chips and scallops, a recessed painted top, and baked surface shading. It draws the stone artwork, colour fields and markings into a shared 1024 × 1024 atlas before the board renders. A page supports 63 painted variants plus the body material; additional pages are created only if a board exceeds that count. Classic tiles use 520 triangles and small shell tiles use 288, including their tops.

The visible tops and bodies enter the ordinary static scenery merge, grouped spatially in X and Z. Non-rendering raycast proxies retain each tile's identity and touch area. The atlas is not repainted each frame; this introduces no new shadow maps or lighting passes. The top markings remain readable and retain their existing gameplay meanings.

Surface loading is cached, has a two-second fallback, and is included in offline assets. The self-contained viewing build embeds the compact image. The tile atlas is owned by its board and is released with the scene's shared materials/textures.
