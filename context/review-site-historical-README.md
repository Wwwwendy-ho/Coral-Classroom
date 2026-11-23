# Coral Classroom redesign art book

Private visual review of organic marine characters, eight regional destinations and lightweight 2D menu concepts in the approved smooth stone/satin-glass/painterly style.

The illustrations are concept proposals and screen mockups, not captures of an implemented runtime redesign. Original generation files remain in the execution workspace; the Site contains web-optimized copies. No learner data, credentials or private progress records are included.

This is a buildless static Site served from `dist/`. Images use ordinary HTML, native full-size links and lazy loading. The game production source is maintained separately at `/workspace/coral-classroom`.

## Playable crafted Coral Cove

`play/?art=crafted&shelly=storybook` opens the existing game engine with an opt-in first implementation of crafted route tiles, a sculptural shell pavilion and a cool reef garden. This is a playable visual prototype, not a completed migration of all regions. Its near character uses the actual Shelly GLB. Gallery illustrations remain concepts.

The derived copy is built by `/workspace/work/redesign-artbook/build_play_preview.py` after the source build. It authors its own Demo Explorer seed and isolates its local database; no production learner seed or progress is copied. The dedicated launch hook opens the demo board directly. Service-worker registration is removed for this preview. The Save world image control exports the actual WebGL world canvas without the HTML interface.

Validation covers JavaScript compilation, asset references, decoded images, demo data isolation and real Three scene construction. Browser capture is unavailable in this environment; physical iPhone XS performance is unmeasured.

The second playable revision selects separately authored `crafted-shelly` GLBs through the real guide loader. Their new surfaces use the existing animation skeleton and six retargeted clips. The original Shelly files remain available for the classic game; the crafted path ignores obsolete portable inline models. The dedicated 3D viewer and lightweight loading avatar use this new creature. Both detail tiers stay below the original triangle and encoded-byte budgets.

The brighter crafted world uses painted color at the material/vertex level, contoured ledges, rounded coral and a floor edge that meets the fog color. It adds no transparent glass or new runtime lighting. The demo tile and garden geometry is 28,866 triangles and eight merged draws, excluding other game props and UI. Tests retain actual raycast space identity and unchanged route data across 30 deck/viewport combinations; these counts do not establish phone frame rate.

The third character revision brings the eyes forward and gives them more upward-readable volume, softens the crown pattern and rounds the head. It addresses the narrow eye shape seen from elevated views. The 3D viewer opens at the board camera and offers a From above view, including `shelly.html?angle=top`. Model triangle counts remain unchanged. The crafted-world builders are identical to the preceding deployed preview.

## Ten-option character survey

`shelly-options.html` presents ten actual 3D proportion studies with matched three-quarter and straight-down renders. Their head-to-shell ratio, eye size, neck and paddle proportions progress gradually while material, palette, lighting and cameras stay consistent. The page includes all twenty full-size views and a labeled overview. Its favorite selector saves locally and asks the reviewer to reply with the number in chat; it does not submit anything or change the playable character.

The candidates are generated separately by `tools/art/build_crafted_shelly_options.py` into `/workspace/work/shelly-cuteness-survey/`. All ten retain the four-flipper rig, texture layout and six retargeted animation clips. The Site serves only the lightweight images, not ten simultaneously loaded 3D models. The existing playable preview and its character assets are unchanged by this survey.
