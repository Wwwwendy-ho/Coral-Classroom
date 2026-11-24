# Latest visual direction

## Target

Use `../references/APPROVED-organic-shelly-and-stone-glass-world.png` as the primary style reference. It combines an organic mint/seafoam turtle, cream underside, opaque lavender/periwinkle shell and appealing naturally integrated eyes with smooth sculptural stone and satin/frosted glass scenery. Shelly is a living animal, not glass, stone, wood, a toy or clay. Avoid a reptilian/snaky top-down appearance, giant button eyes, exposed stalk-like neck, human lips/teeth/grin and uncanny baby proportions.

### Locked shared visual bar (2026-11-22 — Modern Mario Party / Animal Crossing)

Characters and map must share the exact same clean, readable surface frequency (modeled on *Mario Party* / *Animal Crossing*): keep appealing organic 3D silhouettes (avoiding lumpy primitives and noisy AI micro-speckle or dense scale crackle), and pair them with smooth sculpted gradients, deliberate broad markings, expressive glossy eyes, and satin-matte dielectric shading across Shelly (`stage-organic-v3-mp`), all resident NPCs, board companions, and ~15% board tile bevel/AO polish.

Environmental material mix can vary by region: stone, glass, restrained wood and thematic plastic. The owner wanted the feel of human arts/crafts, biodegradable materials where appropriate, and plastic for bad/polluted places or objects. Do not equate all glass/plastic use with evil without context. Current preference is less grain/wood, more smooth stone and glass, rich colors, dimensional forms, diffuse lighting and low reflectivity. Avoid noisy roughness, mirror surfaces and the dull/brown look of earlier drafts.

The owner likes 2D where reasonable to save cost. Use dimensional terrain, important silhouettes, route tiles and characters where camera/interaction needs them; illustrated distance, menus and static chart layers can be 2D/2.5D. The result must read as a world. Do not spend the phone budget on unnecessary geometry or transparent layers.

## Acceptance for the next Shelly

- Coherent sculpted brow, naturally recessed rounded eyes, restrained turtle beak seam, nostrils, cheeks and short integrated throat; personality mostly through the eyes and motion.
- Fine authored shell/scute/skin detail carried by painting, shading and silhouette. Avoid lumpy assembled primitives and random procedural texture.
- Exactly four flippers, no extra rear appendage mistaken for a fifth/sixth leg; tiny centered/tucked tail if used. Check shell/limb intersections and all animation poses.
- View the actual asset from front, quarter, side, rear, elevated board and straight-down cameras. Review at actual phone game size, not only a large image. Loading artwork must match the accepted creature too.
- Keep main/viewing LOD, single opaque material, texture and rig budget. Staging proofs and actual in-engine result must be labeled accurately.
- The new isolated cutout is an unapproved helper image, not a new approved design. All ten baby proportions are rejected. Earlier preference IDs “6” and expression “17” are historical background, superseded where the new organic art conflicts.

## World / camera

The world prototype is a good start but is not final. Give each region instantly recognizable landmarks, a distinct composition/material palette and intentional looped route, not a straight line with forks. Larger structures should divide areas and interrupt repeated filler. Maintain clear tile spacing, visible next destinations and readable NPC silhouettes. Labels were cluttered; prefer current/relevant labels and clear hierarchy. Outskirts visible during zoom-out transitions must not be bare.

Route tile quality has priority over background detail. The user wanted a modest additional detail increase (~15%), not unbounded geometry. Stone should have smaller contours, wear and shading rather than look like a plain ellipsoid; tiles need crafted surface/edge treatment. Bake curvature, occlusion and contact cues into textures/colors. Preserve saturated readable colors. Use near/board/overview detail levels and quiet negative space. Sailing/swimming transitions and faster satisfying tile hops should respect Calm Motion and should not dominate learning time.

## Cast decisions to preserve

Use `game/art-source/cast-review/CAST-DIRECTION.md`, preferences and biological palettes for full history, interpreted under this newer art direction. Do not homogenize expression, size, accessories or color.

| Character / role | Current decision |
|---|---|
| Shelly | Organic appealing sea turtle; newest reference above; unresolved actual model |
| Mira, Story Lagoon | Younger teenage turtle, coastal palette, different accessories from Shelly |
| Echo, Echo Caves | Beluga, superseding nautilus and bottlenose dolphin; no dorsal fin |
| Pip, Pattern Reef | Royal gramma, purple anterior/yellow posterior; no walking human limbs |
| Jisu, postal helper | Tiny eager hermit crab; brighter orange bag and orange envelope shell/seal; brief electrical speed effects |
| Town shopkeeper | Adult octopus, much bigger than Jisu; intentional skin-only camouflage; exactly eight independent arms, no branching tips |
| Taxi driver | Bored/heavy-lidded squid, yellow/navy occupational palette; eight arms and two tentacles |
| Subway guide | Large ray with biologically substantial wingspan, not resized to Jisu |
| Café owner | Seahorse; needs continued visual/eye/occupational polish in shared style |
| Hana, Lighthouse | Jellyfish; species-appropriate bell/eye acting, no external human mouth |
| Bay, Captain’s Deck | Walrus captain |
| Others | Hotel whale, otter server, seal friend, shrimp pharmacist, Lumi anglerfish, Bok puffer and the approved resident cast |

Personalities affect eye pose, attention, timing and movement. A bored taxi, eager Jisu, attentive Echo and confident Mira should not all wear the same dreamy smile. Organic biological colors plus occupational accessories should distinguish residents. Keep a shared level of rendering and authoring quality; the world must support the characters without overwhelming the iPhone XS.
