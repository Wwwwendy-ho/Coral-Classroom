# Coral Classroom — Final Highest-Realistic-Ceiling Art Director Rubric (v4.5 — Locked)

This is the **final, locked highest realistic ceiling standard** for a 60 FPS vanilla Three.js r128 browser + iPhone/iPad Switch-inspired 3D game, anchored directly against **Super Mario Party Jamboree (Nintendo Switch, 2024)** (`work/art-loop/refs/jamboree/`). We do not move the goalposts after this rubric; we iterate until the live build legitimately scores **`>= 9.8 / 10`** with **`0 CRIT` and `0 MAJ`** across all 24 desktop (`1280×800`) + iPhone portrait (`390×844`) full-circuit captures and every automated gate.

## Pass Bar & Target
- **Pass Bar**: Weighted Average **`>= 9.0 / 10`** AND **`CRIT = 0`**.
- **Target Goal (Completion Bar)**: Weighted Average **`>= 9.8 / 10`** AND **`CRIT = 0`, `MAJ = 0`**, near-zero `MIN`.
- Weighted score formula:
  `Total = 0.20*D1 + 0.20*D2 + 0.15*D3 + 0.15*D4 + 0.15*D5 + 0.15*D6`

## Weighted Dimensions (Highest Realistic WebGL / Switch Ceiling)

1. **D1 — Switch-Era Lighting, Real Shadows & Sky/Atmosphere (20%)**
   - **Live Soft Directional Cast Shadows**: Active `PCFSoftShadowMap` (`shadowOn: true`) casting cool sky-tinted directional shadows under Shelly, Kiko, residents, `?` blocks, and indoor room furniture/counters onto floors and ground — zero acne, zero detachments.
   - **Sun-Angled Grounding & Color Contrast**: Buildings, stalls, trees, palms, awnings, and props cast crisp sun-aligned directional shadows (`contact()`). Warm golden sunlit key lift + cool sky-cerulean shadow bounce across all baked geometry (`reef3dBakeGeo`).
   - **Volumetric Sunlit Clouds & Horizon Scattering**: Multi-puff clouds with warm sunlit cream crowns & soft sky-lavender shaded undersides (never flat chalk blobs), luminous sky-to-horizon scattering, crisp **diagonal sunlit floor patches + mullion shadows** inside Captain's Cabin and all 8 Harbor Town 3D rooms (`04-galleria-indoor.png` parity).

2. **D2 — Sculpted Diorama Terrain, Architecture & Lush Foliage (20%)**
   - **Zero Primitive Rubber Hills or Flat Sand Ribbons**: Sculpted multi-ridge stratified horizon landmasses with natural shoreline collars & perched landmarks (`01-western-wide.png`); textured sunlit coastal sand with warm ripple/pebble/shell relief & damp shoreline wash on Bottle Beach (`14-beach.png`); weathered varied-tone cobblestone & plaza stone richness in Harbor Town (`02-harbor-town.png`).
   - **Tactile Recessed Architecture & Bespoke Rooms**: Harbor Town buildings feature recessed window depth with sky-catch glass reflections & crisp mullions (never flat yellow stickers), carved-timber tiered Story Lagoon gazebos, enclosed coffered-oak Captain's Cabin, and 8 genuinely distinct bespoke 3D rooms with **recessed 3D window jambs, glass sheen, and warm hanging-lamp glow cones** (`03-cafe`..`10-friend`).
   - **Dappled Multi-Cluster Foliage (`05-blossom-park.png` Parity)**: Harbor Town trees & hedges feature layered sunlit lime-emerald crowns, shaded deep-teal under-clusters, and pastel blossom accents (never single solid green spheres); sculpted multi-petal lotuses and arched palm fronds everywhere.

3. **D3 — Living Coastal Water & Material/Glow Craft (15%)**
   - **Silky Organic Animated Coastal Water**: Dense vertex-packed 4-band depth gradients (shoreline foam → turquoise shoal → aquamarine → deep sapphire) + domain-warped organic sunlit caustic ripples (zero polygonal Voronoi hexagons, zero flat cyan slabs!) across **Coral Cove, Harbor Town, Story Lagoon, Bottle Beach, Pattern Reef, Lighthouse, Echo Caves, and outside Captain's Cabin windows**.
   - **Luminous Crystal & Material Contrast**: Echo Caves crystal clusters feature bright emissive inner cores & soft colored bioluminescent floor light-pools; clear PBR contrast between velvety matte character skin (`0.86–0.92`), glossy eye corneas, metallic gold/brass tile rims, glazed indoor tiles/varnished wood, and translucent sea-glass bottles.

4. **D4 — Cast Appeal, Grounding, Instant GLB Persistence & Micro-Animation Life (15%)**
   - Expressive species-diverse Mario Party eye silhouettes, mutual head/neck gaze, clean smooth articulation, grounded contact (zero floating feet/props, zero UV pinholes, zero clipping).
   - **Zero Procedural Flash-Back**: In-memory GLB byte cache restores Bok (seated cleanly in his splash tub) and all residents immediately on room exit (`21-pharmacy-board.png`).
   - **Animation Juice & Living World**: Shelly hop squash-and-stretch anticipation/landing bounce, animated water ripples, fish schools, swaying flora, floating particles, and natural Kiko scuttling.

5. **D5 — Full-Circuit Camera, Tile Polish & Real Player UX (15%)**
   - **Full-Circuit Unobstructed Camera**: Verified clear across `tile 0`, `tile 2` (At the Café), and `tile 3` (Shop) on Coral Cove + all 7 region hero views on BOTH desktop (`1280×800`) and iPhone portrait (`390×844`) — zero pavilion, arch, or coral fan obstructing Shelly; Mira framed cleanly in Story Lagoon with zero edge crop.
   - **Pixel-Centered Tile Icons**: Every emoji, Hangul glyph, `?`, `!`, wave, and shell icon visually centered to `<= 1px` across Coral Cove, regional boards, and fallback tiles.
   - **Real Wendy UX**: Real **`Wendy`** profile (zero `"Demo Explorer"`), 3 curated Korean starter decks, **Map → The sea** unlocked for all 8 islands by default, zero parent password prompts anywhere, clean 2-corner HUD, zero mobile scroll overflow.

6. **D6 — 60 FPS Runtime Discipline & Automated Gate Integrity (15%)**
   - Zero page errors, zero console errors, zero HTTP >= 400 errors, zero WebGL warnings.
   - Draw calls lean (`< 160`), shadow maps throttled (`autoUpdate = false`), water shimmer in 1 draw call, static scenery compacted (`< 12,000` meshes), and 100% pass across `build.py --check`, `soundtrack_verify.py`, `security_hardening_test.js`, `jamboree_systems_test.js`, `encounter_quality_test.js`, `qblock_visual_test.js`, and `region_scenery_geometry_test.js`.

## Automatic Iteration FAIL (`CRIT`)
- Any floating character/prop, face pinhole, snowman seam, or `?`-cube/scenery clipping a character.
- Any foreground structure blocking Shelly on Coral Cove tiles `0..3` (desktop or mobile) or on any regional hero view.
- `shadowOn: false` on boards or indoor rooms, or polygonal Voronoi / flat matte water slabs, or smooth rubber half-sphere horizon hills.
- Any procedural fallback flash-back (e.g. floating Bok on `21-pharmacy-board.png`) or off-center tile icon.
- Any parent password prompt, locked Sea Map, `"Demo Explorer"` branding, or console/page/HTTP/test failure.
