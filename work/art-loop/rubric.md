# Coral Classroom — Super Mario Party Jamboree Art Director Rubric v3.0

Every iteration is scored `0–10` across **6 weighted dimensions** against the real **Super Mario Party Jamboree (Nintendo Switch, 2024)** north-star references in `work/art-loop/refs/jamboree/` (`01-western-wide.png`, `02-space-closeup.png`, `03-shop-encounter.png`, `04-galleria-indoor.png`, `05-blossom-park.png`) and the Coral Classroom Pixar/Nintendo quality bar. Critics must score strictly from observable evidence (screenshots, character proof renders, runtime telemetry, and verification outputs) using the anchored calibration bands below.

## Pass Bar
- **Weighted Average >= 8.5 / 10** AND **zero Critical Defects (`CRIT = 0`)**.
- **Target Goal**: **`>= 9.8 / 10`** (`0 CRIT`, `0 MAJ`).
- Weighted score formula:
  `Total = 0.20*D1 + 0.25*D2 + 0.15*D3 + 0.15*D4 + 0.15*D5 + 0.10*D6`

## Anchored Calibration Scale

| Score Band | Anchor | What It Looks Like in Practice |
| :--- | :--- | :--- |
| **`< 8.0`** | **Below Bar / Regressions** | Noticeable anatomical, spatial, UX, or visual breakdowns: segmented "snowman" rigs, strange shell holes, teleporting companion, floating sky-high `?` cubes, flat 2D Harbor Town Activities bypass, towering/imposing character framing, repeated audio nudges, heavy load-in lag, or any Critical Defect. |
| **`8.5`** | **Solid Wii / MP8-Tier Parity (Pass Bar)** | Clean readability and species silhouettes with zero Critical Defects; indoor Captain's Cabin, distinct bespoke rooms, and fantastical region themes work solidly end-to-end, though Switch-era lighting, material richness, and ambient life still lag behind Jamboree. |
| **`9.0`** | **Modern HD / Approaching Jamboree** | Zero `CRIT` and zero `MAJ`. Cohesive, appealing Pixar-grade cast with smooth non-snowman articulation and natural side-by-side Kiko scuttling; unmistakable fantastical themes across every region (100% indoor coffered-ceiling Great Cabin w/ ocean gallery & treasures; Giant Glass Bottle beach; Story Lagoon floating storybooks & origami boats; Pattern Reef spirals/checkers/ABAB colonnades; Echo Caves chimes/rings; detailed Harbor Town architecture & 8 genuinely distinct 3D room layouts); clean 2-corner HUD & verified `390×844` mobile layout. |
| **`9.5`** | **True Super Mario Party Jamboree Parity (`refs/jamboree/`)** | Matches Jamboree's Switch-era visual richness: luminous ACES sunlit atmosphere & warm horizon depth haze (`01-western-wide.png`), angled diagonal window sunbeams & glossy floor sheen/reflections indoors (`04-galleria-indoor.png`), sleek flush-seated jewel-gloss board tokens with crisp metallic rims & grounded contact-AO (`02-space-closeup.png`), rich multi-layered textures/relief with zero flat plastic slabs, fluffy multi-cluster foliage & blooming hedges (`05-blossom-park.png`), physical 3D counter props & frosted tactile dialogue cards (`03-shop-encounter.png`), and vibrant ambient world life. |
| **`9.8–10.0`** | **Beyond Jamboree — Flagship Nintendo / Pixar Showcase** | Zero `CRIT`, zero `MAJ`, and near-zero `MIN` across every desktop and mobile frame, character proof, animation clip, soundtrack, and performance probe — exceeding Jamboree in bespoke storybook worldcraft, lighting, material response, spatial storytelling, and silky runtime fluidity. |

## Weighted Dimensions

1. **D1 — Visual & Cast Cohesion (20%)**
   - **Mario Party Eye-Shape Diversity**: Characters have expressive, species-appropriate non-circular eye silhouettes (almond/tilted w/ sculpted eyelids & lashes on `taxi-squid`/`jisu`/`mira`/`hana`; tall upright ovals on `otter`/`seal`/`seahorse`; warm half-lidded brow-ridged eyes on `hotel-whale`/`shop-octopus`/`captain-bay`; sleek smaller almond-ovals on `subway-ray`/`shrimp`/`bok`/`echo`/`pip`; round starry eyes reserved for Kiko) — never stamped identical circles.
   - **Shelly-Grade Realism & Velvety Finish**: Painterly organic skin/scale/fur mottling, soft subsurface cheek/belly warmth, baked crease AO, sculpted eyelid/muzzle contours, and velvety non-robotic matte-satin roughness (`0.86–0.92`, zero shiny plastic body glare; ONLY eye corneas stay glossy).
   - **Active Mutual Eye Contact**: Residents turn their bodies and `Head`/`Neck` bones to look directly at Shelly during encounters and nearby board interactions (never staring blankly into space), and Shelly turns to look back at the resident.
   - Cohesive, smoothly skin-weighted articulated rigs (`0.0..1.0` joint falloffs) with unified full-body breathing in `Idle`/`Listen`/`React` — zero rigid stacked-ball "snowman" bobbing or jagged claw/limb seams.
   - Clean organic shell craft (`kiko-hermit`, `jisu`) and unmistakable species silhouettes (`taxi-squid` tall pointed torpedo squid mantle + spearhead tail fins + streamlined arms/tentacles; `subway-ray` fuller arched dome + proportionate smaller face; `hotel-whale` horizontal forked crescent flukes; `kiko-mochi` wide crab stance).
   - Natural companion movement: Kiko smoothly scuttles beside Shelly on every tile step with steady side-preference hysteresis — never teleporting, intersecting residents, or wandering ahead behind stair rims.

2. **D2 — Fantastical Region Identity & Indoor Craft (25%)**
   - **Captain's Cabin (`captain`) — MUST BE 100% INDOORS**: Enclosed wood-paneled Great Cabin with full vaulted coffered oak ceiling & beams overhead (zero open sky/clouds above walls during gameplay; opens cleanly on Map zoom), warm brass chandeliers/lanterns, and Captain Bay's treasure & curiosity collection (glass curio vitrine w/ ship-in-a-bottle, brass celestial globe, gilded chests, sea charts, telescope) looking out through panoramic mullioned ocean gallery windows.
   - **Bottle Beach (`beach`)**: Sunlit tropical cove enclosed within colossal curved translucent sea-glass bottle walls & specular ribs (open at zenith for Map zoom), clearly flared glass bottle neck w/ hemp rope, sculpted tapered cork with grain rings, glowing message-in-a-bottle lamps, and floating bottle fleets.
   - **Pattern Reef (`patterns`)**: Unmistakable visual patterns right in the hero view (Fibonacci golden-spiral mosaics, checkered plazas, ABAB striped coral colonnades, concentric stepping-stone rings) paired with pattern-driven Day & Night music.
   - **Story Lagoon (`lagoon`)**: Giant floating open storybooks with curved painted spreads, folded origami paper boats on the water, hanging calligraphy lanterns, and zero stray placeholder cylinders/bottles.
   - **Echo Caves (`caves`)**: Glowing concentric acoustic echo rings, suspended organ-pipe crystal chimes, and resonant tuning-fork crystal pillars.
   - **Harbor Town (`town`)**: Rich coastal architecture (scalloped roof tiles, stone quoins, arched doorways, hanging iron shop signs, Juliet balconies, shutters, chimneys, bougainvillea) PLUS **8 genuinely distinct bespoke 3D room layouts** (`cafe`, `restaurant`, `shop`, `taxi`, `subway` w/ platform mat cleanly clear of train tracks, `hotel`, `pharmacy`, `friend` w/ painterly sunset water shimmer behind Sua) — never reusing one identical floor-plan template.

3. **D3 — Camera, Framing, UX & HUD (15%)**
   - Jamboree-tier dynamic follow cameras with rich foreground/midground/background horizon depth and zero blank water/slab quadrants on desktop (`1280×800`) and true mobile (`390×844`).
   - Warm, approachable character encounter framing — well-composed medium close-up on Jisu (zero foreground tile/bottle obstruction) and crisp framing on all residents.
   - Clicking any Harbor Town character in Activities enters their live 3D room encounter (with the 3D character and interior staying live alongside `"Talk and practice"`).
   - Zero repeated audio nudges (`"Tap the glowing button!"` suppressed during encounters; max once per screen state), clean 2-corner HUD, and zero vertical scroll (`scrollHeight <= clientHeight`) on compact overlays across desktop and mobile.

4. **D4 — Grounding, Spatial & Anatomical Realism (15%)**
   - Held props sit physically inside and are gripped by the character's hand, claw, fin, or tentacle — never floating.
   - Grounded characters rest solidly on surfaces with crisp contact shadows/AO (no floating feet or floor sinking); swimmers float naturally in water or behind counters without clipping turnstiles/benches/walls.
   - Zero clipping between `?` cubes, characters, scenery props, and encounter sightlines (board `?` cubes hidden inside 3D interiors; Harbor Town `?` cubes strictly clear of residents).
   - Grounded, Jamboree-crisp `?` / star cubes resting cleanly over their tile (steady `0.25` hover on arrival, crisp bonk bounce on activation).

5. **D5 — Switch-Era Craft, Lighting & Material Polish (15%)**
   - Luminous Switch-era ACES daylight, warm atmospheric distance depth haze, sky-blue shadow bounce, angled indoor window sunbeams & subtle floor sheen/reflections, rich multi-layered textures/relief (no flat plastic slabs), fluffy multi-cluster foliage, and crisp legible typography.
   - Zero console errors, zero page errors, zero WebGL warnings/fallbacks, and HTTP 200 on all assets with up-to-date cache-busters.

6. **D6 — Objective Performance & Runtime Stability (10%)**
   - Fast, lag-free initial load-in and smooth interactive framerate (staggered resident GLB instantiation, lazy `PMREMGenerator` cornea environment map).
   - Total static scenery mesh count `< 12,000` across all regions.
   - Asset budgets met (`board GLB < 650 KB`, `close GLB < 1.4 MB`, `M=1 P=1 MAT=1`, `Idle/Listen/React` clips present) and 100% of syntax, Node, build, GLB, and soundtrack checks passing.

## Defect Severity & Automatic Iteration FAIL (`CRIT`)

- **`CRIT` (Automatic Iteration FAIL)**:
  - Any grounded character with floating feet or any floating/detached held prop.
  - Any UV pole pinhole on a face, black void/strange hole on `kiko-hermit`/`jisu`, or obvious rigid "snowman" separation during animation.
  - Any `?` cube, counter, wall, turnstile, or prop clipping into a character's body/face or obstructing the encounter sightline (including board `?` cubes appearing inside 3D interiors).
  - Captain's Cabin appearing open-air with sky/clouds overhead instead of an enclosed indoor cabin during normal gameplay.
  - Any `?` cube shooting high into the air on arrival, or Kiko teleporting/intersecting residents.
  - Harbor Town Activities bypassing the 3D room into a flat 2D text screen, or repeated spoken audio nudges during encounters.
  - Unacceptable runtime regression: `>= 12,000` scenery meshes, synchronous frame-0 PMREM/load stall, broken GLBs, console/network errors, or failing verification checks.
- **`MAJ`**: Clear multi-pixel defect, duplicate/reskinned room layout template, weak Jamboree lighting/material polish, awkward encounter framing, unverified mobile viewport, or UX friction.
- **`MIN`**: Small localized polish opportunity (subtle edge alignment, minor shadow/color tweak, tiny background density gap).

## Required Critique Output Format
Every critique must report:
1. Exact `D1..D6` scores (`0.0–10.0`) and exact weighted total (`X.XX / 10`).
2. Exact `CRIT`, `MAJ`, and `MIN` counts and explicit `PASS` / `FAIL` verdict.
3. Concise evidence-backed comparison against the **Super Mario Party Jamboree** references (`work/art-loop/refs/jamboree/*.png`) across regions, cast proofs, UX/audio, and performance.
4. Numbered list of every remaining defect with severity and exact native pixel coordinates `(x, y)` or test evidence.
