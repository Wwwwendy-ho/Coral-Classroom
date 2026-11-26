# Coral Classroom — Adversarial Visual Critique (Iteration 11)

**Reviewer**: `adversarial-critic-v11` (Zero-Context Visual-Only Audit)  
**Evidence Inspected**:
- Rubric: `work/art-loop/rubric.md`
- North-Star References: `work/art-loop/refs/mp8/01-goomba-boardwalk.png` .. `05-goomba-boardwalk-tiles.png`, plus `work/art-loop/refs/ref-diorama-boards.jpg` and `work/art-loop/refs/ref-ocean-cast.jpg`
- Live Board & Interior Captures (`1024×640`): `art_loop_iter11/01-coral-cove.png` .. `11-beach.png`
- Character Close-Ups (`640×640`): `work/cast-upgrade/proofs-v16/{hotel-whale,pharmacy-shrimp,bok,hana,friend-seal,subway-ray,taxi-squid}/{front,quarter}.png`

> **Scope & D6 Methodology Note**: This audit is strictly visual-only (zero source code, GLB binaries, or console logs inspected). Dimension **D6 (Runtime Budget & Stability, 10%)** is scored exclusively from observable visual runtime stability (shader/lighting integrity, UI layout health, and whether upgraded GLBs loaded rather than falling back to legacy/procedural meshes). Binary file-size limits (`< 650 KB` board / `< 1.4 MB` close), single-draw-call/merge counts, and zero console/WebGL errors must be verified separately by runtime telemetry.

---

## 1. Executive Verdict

| Metric | Result | Target / Gate |
|---|---|---|
| **11-Scene Weighted Average** | **8.60 / 10** (`8.5973`) | Pass Bar `>= 8.50` · Celebration Bar `>= 9.60` |
| **Rubric Pass Gate** | **FAIL (Automatic Fail)** | `>= 8.50` **AND** `0 Critical Defects` |
| **Defect Breakdown** | **5 Critical · 14 Major · 36 Minor** | `0 Critical` required to pass |
| **Top Scene** | `03-restaurant.png` (**9.60 / 10**, 0C / 0M) | Already at celebration bar |
| **Lowest Scene** | `02-harbor-town.png` (**6.67 / 10**, 2C / 2M) | Blocked by legacy blobs + multi-actor clipping |
| **v16 Cast Proofs Standalone Mean** | **9.50 / 10** (6 of 7 assets `>= 9.4`) | Strong character pipeline; **3 live deployment gaps** |

### Why Iteration 11 Fails — And Why `>= 9.6 / 10` Is Within Immediate Reach
The art direction and character craftsmanship in `03-restaurant.png` (`9.60`), `01-coral-cove.png` (`9.25`), `09-caves.png` (`9.03`), and the standalone `proofs-v16` renders (`hotel-whale` `9.8`, `friend-seal` `9.7`, `bok` `9.7`, `hana` `9.6`, `subway-ray` `9.5`, `taxi-squid` `9.4`) are genuinely Nintendo/Pixar-caliber.

However, **five unmistakable Critical Defects** trigger an automatic fail under `rubric.md`:
1. **`02-harbor-town.png` `(125..245, 275..415)`** — A legacy/procedural dark-navy spotted manta ray with giant white cartoon sclera eyes (not v16 `subway-ray`) **slices straight through `hotel-whale`'s torso `(160..285, 330..405)` AND clips into the red-and-white ferry boat's stern railing `(205..240, 295..345)`** (Critical Rules 3 & 4).
2. **`02-harbor-town.png` `(205..265, 180..250)`** — A legacy/procedural stacked-sphere gray seal blob with giant white sclera eyes (not v16 `friend-seal`) sits on the wooden dock with its rear flipper hanging off the pier and a yellow flag mast clipping across its chest (Critical Rule 4 & D1 upright egg-clone prohibition).
3. **`04-hotel.png` `(806..820, 170..192)`** — The dark-brown wooden support bracket under the upper-right wall shelf **physically clips straight through the front surface of `hotel-whale`'s pale-blue tail fluke `(775..855, 175..215)`** (Critical Rule 3: shelf clipping into character body).
4. **`10-patterns.png` `(535..592, 118..172)`** — Bok beside the pink-and-white striped stall renders as the **legacy procedural fallback sphere blob** with giant white googly sclera eyes and no overalls/stitching — contradicting v16 Bok properly loaded in Scenes `08`, `09`, and `11` (Critical Rule 4).
5. **`11-beach.png` `(580..1024, 0..410)`** — Roughly `75–80%` of the upper-right quadrant (`x=580..1024, y=0..230` and `x=760..1024, y=230..410`) is **completely empty flat turquoise water** with zero islets, boats, buoys, or floating bottles (Critical Rule 5: blank quadrant in default gameplay camera).

---

## 2. Full 11-Scene Weighted Scorecard

Weights: **D1** Silhouette & Species Appeal (`25%`) · **D2** Eyes, Face & Surface Finish (`20%`) · **D3** Anatomical & Spatial Grounding (`20%`) · **D4** Camera-Band Diorama Density (`15%`) · **D5** Sculpted Craft & Detail (`10%`) · **D6** Runtime Budget & Stability (`10%`).

| # | Scene | D1 (25%) | D2 (20%) | D3 (20%) | D4 (15%) | D5 (10%) | D6 (10%) | Weighted | Crit | Maj | Min | Gate |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | `01-coral-cove.png` | 9.4 | 9.5 | 9.0 | 9.2 | 8.4 | 9.8 | **9.25** | 0 | 0 | 4 | PASS |
| 02 | `02-harbor-town.png` | 6.2 | 6.8 | 4.5 | 9.5 | 8.8 | 5.5 | **6.67** | **2** | 2 | 3 | **FAIL** |
| 03 | `03-restaurant.png` | 9.6 | 9.6 | 9.4 | 9.8 | 9.5 | 9.8 | **9.60** | 0 | 0 | 4 | PASS (`>=9.6`) |
| 04 | `04-hotel.png` | 9.8 | 9.8 | 5.5 | 9.7 | 9.5 | 9.8 | **8.90** | **1** | 0 | 3 | **FAIL** |
| 05 | `05-pharmacy.png` | 8.6 | 9.2 | 7.4 | 9.5 | 8.7 | 9.7 | **8.74** | 0 | 2 | 3 | PASS |
| 06 | `06-captains-deck.png` | 9.2 | 9.0 | 8.5 | 6.4 | 7.5 | 9.7 | **8.48** | 0 | 2 | 2 | Below 8.5 |
| 07 | `07-lighthouse.png` | 9.4 | 9.1 | 8.2 | 8.5 | 7.4 | 9.7 | **8.80** | 0 | 2 | 4 | PASS |
| 08 | `08-lagoon.png` | 9.4 | 9.4 | 7.9 | 8.9 | 7.8 | 9.3 | **8.86** | 0 | 2 | 3 | PASS |
| 09 | `09-caves.png` | 9.3 | 9.3 | 8.5 | 9.0 | 8.3 | 9.6 | **9.03** | 0 | 1 | 4 | PASS |
| 10 | `10-patterns.png` | 7.6 | 7.4 | 8.5 | 8.6 | 8.7 | 6.0 | **7.84** | **1** | 1 | 3 | **FAIL** |
| 11 | `11-beach.png` | 9.4 | 9.3 | 7.8 | 5.8 | 8.2 | 9.7 | **8.43** | **1** | 2 | 3 | **FAIL** |
| **ALL** | **11-Scene Mean / Total** | **8.90** | **8.95** | **7.75** | **8.63** | **8.44** | **8.96** | **8.60** (`8.5973`) | **5** | **14** | **36** | **ITERATION FAIL** |

---

## 3. Audit of the 7 Upgraded `proofs-v16` Character Close-Ups (`640×640`)

| Character | Standalone Score | Strengths | Specific Visual Defects (Proof Coords `640×640`) | Live Scene Integration Status |
|---|---:|---|---|---|
| **`hotel-whale`** | **9.8 / 10** | Iconic horizontal whale silhouette; glossy large-iris blue eyes with twin catchlights; velvety matte sky-blue skin; warm blush; crisp navy bellhop coat with gold piping & brass buttons; zero UV pinholes. | Minor: gold collar trim on back of neck feathers slightly soft in `quarter.png (330..360, 250..295)`. | Loaded in `02` & `04`, but clipped by legacy ray in `02` and wall shelf bracket in `04`. |
| **`friend-seal`** | **9.7 / 10** | Heart-melting spotted seal pup; glossy amber irises with twin catchlights; crisp white whiskers & glossy nose; neat coral-pink striped scarf; zero UV pinholes. | Minor: slight dusty brown AO shading on nasal bridge between eyes in `front.png (295..345, 285..310)`. | **REGRESSED IN `02-harbor-town.png`**: dock seal `(205..265, 180..250)` is still a legacy stacked-sphere blob! |
| **`bok`** | **9.7 / 10** | Delightful spherical golden pufferfish; warm amber glossy eyes + twin catchlights; stitched denim-teal overalls & brass pocket button; stitched sky-blue cap; pearl-white side spines; zero UV pinholes. | Minor: faint diagonal texture brushwork across forehead and tiny skin-tubercle dimples at temples `front.png (215, 265)` & `(420, 260)`. | Loaded in `08`, `09`, `11`; **REGRESSED TO PROCEDURAL BLOB in `10-patterns.png` `(535..592, 118..172)`**! |
| **`hana`** | **9.6 / 10** | Dreamy translucent-look cream-pink jellyfish; large glossy violet irises + twin catchlights; expressive violet eyebrows; scalloped white rim; graceful oral arms & wispy tentacles. | Minor: tiny reddish UV-pole apex pinhole at very top crown `front.png (318, 108)` (not on face); faint vertical center UV seam on front scalloped lip `(318, 294..304)`; minor pinch notch on right outer tentacle `front.png (426, 385)`. | Cleanly loaded in `07-lighthouse.png` `(545..655, 420..535)`. |
| **`subway-ray`** | **9.5 / 10** | Unmistakable sweeping manta-ray wings, sculpted cephalic horns, crisp navy conductor cap with red piping & gold button, glossy deep-blue eyes with twin catchlights. | Minor: razor-thin stray red line/UV bleed on upper-left wing shoulder behind the eye in `quarter.png (285..325, 336..342)` (peak red pixels `(298..308, 339..340)`). | **REGRESSED IN `02-harbor-town.png`**: harbor ray `(125..245, 275..415)` is still a legacy dark-navy spotted cartoon ray! |
| **`taxi-squid`** | **9.4 / 10** | Charming lavender-pink squid; glossy warm-brown eyes + twin catchlights; rosy cheeks; crisp yellow/black checkered taxi cap & visor; flaring mantle fins; curling tentacles with pale suction cups; zero UV pinholes. | Minor: checkered cap squares pinch slightly toward the top button crown; upper mantle between eyes and visor is slightly tall/cylindrical (softly tapering or squishing by ~10% height would elevate Nintendo cuteness). | Not visible in the 11 settled iter11 captures. |
| **`pharmacy-shrimp`** | **8.6 / 10** | Lovely maroon glossy irises with twin catchlights; rosy blush; crisp teal-cross nurse cap; curved segmented shrimp body & tail fan; zero face UV pinholes. | **Major**: peach body-skin triangle **pokes straight out through the white collar** in `quarter.png (343..349, 298..306)` (and reproduces in live `05-pharmacy.png (671..675, 260..267)`); white collar forms a rigid standoff cylinder ring with an open gap behind the cheeks rather than a snug folded lapel collar like `ref-ocean-cast.jpg`. Minor: tiny dark shading pinch dots on lower pincer tips `front.png (254, 431)` & `(385, 431)` and claws read stubbier than `ref-ocean-cast.jpg`. | Loaded in `05-pharmacy.png` & `02-harbor-town.png` (underscaled in `02`). |

---

## 4. Scene-by-Scene Visual Audit (`1024×640` Coordinates)

### Scene 01 — `01-coral-cove.png` — **9.25 / 10** (`0C · 0M · 4m`)
**Strengths**: Sunlit water caustics, harmonious pastel reef palette, glowing starlight beacon, curved multi-segment palm fronds on the BL islet, crisp glossy eyes and velvety finish on Shelly and the crab, all 4 quadrants anchored with landmarks.
- **Minor**:
  1. `(670..725, 145..205)`: Purple spiral shell ornament on the right gazebo clips across the white structural dome ribs, leaving a tiny white clipping sliver on the purple roof panel at `(668..685, 192..200)`.
  2. `(160..225, 480..545)` & `(635..985, 415..640)`: Green shrub on the BL sand islet is a low-poly faceted icosahedron blob, and BL/BR islet rock edges read visibly flat-faceted compared to `ref-diorama-boards.jpg`.
  3. `(455..540, 480..540)`: Companion crab's right rear legs `(522..538, 515..538)` overhang past the cream path edge over open water while its left claw `(458..474, 505..520)` grazes the purple tile rim.
  4. `(830..925, 70..240)`: Sailboat deck is a plain flat brown rectangle sitting inside the red hull rather than sculpted toy-wood trim.

---

### Scene 02 — `02-harbor-town.png` — **6.67 / 10** (`2C · 2M · 3m`) — **FAIL**
**Strengths**: Rich Koopa Tycoon Town (`mp8/02..03`) architecture, warm cobblestone grid, colorful tiled roofs & shutters, cozy awning stalls, clean board tiles, great Shelly & crab renders.
- **CRITICAL**:
  1. **`(125..245, 275..415)` — Legacy Procedural Manta Ray Slicing Through `hotel-whale` and Ferry Boat**: An un-upgraded dark-navy spotted cartoon ray with giant white sclera bug-eyes (not v16 `subway-ray`) pierces straight through `hotel-whale`'s torso `(160..285, 330..405)` (whale tail emerging behind the ray's wing!) AND clips directly into the stern railing/hull of the red-and-white ferry boat `(205..240, 295..345)`.
  2. **`(205..265, 180..250)` — Legacy Procedural Stacked-Sphere Seal Blob on Wooden Pier**: An un-upgraded gray upright-sphere seal/walrus clone with giant white sclera eyes (not v16 `friend-seal`) sits on the dock with its rear flipper hanging off the pier `(205..220, 232..248)` and a yellow flag mast clipping across its front `(250..275, 200..240)`.
- **Major**:
  1. **`(195..365, 375..640)` — Two Sailboat-to-Harbor Collisions**: Yellow sailboat bow clips directly into the gray seawall blocks at `(310..340, 495..530)`; red sailboat mast, rigging, and deck clip straight into the brown pier post & lamppost at `(270..320, 540..635)`.
  2. **`(555..592, 240..280)` — Underscaled Pharmacist Shrimp Straddling Street Curb**: `pharmacy-shrimp` renders at just `~37×40px` perched squarely atop the raised white street gutter/curb strip, losing silhouette readability.
- **Minor**:
  1. `(720..740, 310..360)`: Red-and-white market stall canopy clips slightly into the green-roofed shop's roof eave.
  2. `(670..780, 470..600)`: Two mismatched streetlamps (brown hanging lantern and purple globe lamp) crowd awkwardly beside each other.
  3. `(460..500, 200..220)` & `(595..620, 145..200)`: Curved stone background curb ends abruptly mid-plaza; distant `?` block clips into a green bush/tree.

---

### Scene 03 — `03-restaurant.png` — **9.60 / 10** (`0C · 0M · 4m`) — **PASS (`>= 9.6`)**
**Strengths**: Showcase scene. Warm wainscoting, striped wallpaper, coral/mint canopy, twin pendant light cones, "BISTRO" menu board, seaside harbor window, braided circular rug, endearing `restaurant-otter` with glossy twin-catchlight eyes, rosy blush, zero UV pinholes, and clam dish solidly seated on its left paw. Zero clipping, zero overflow on modal.
- **Minor**:
  1. `(695..716, 307..315)`: Otter's rounded left paw dome pokes ~2px slightly up through the shallow saucer underside directly below the clam hinge (still firmly supported, just lower the paw or raise the plate by ~2mm).
  2. `(795..840, 185..210)`: Center hanging copper pan hangs slightly down behind/overlapping the cork tops of the green and yellow spice jars on the upper shelf.
  3. `(592..608, 222..240)` & `(670..688, 218..236)`: Otter's inner ears show slightly boxy rectangular pink highlights, and thin whisker strands dot-alias slightly at `1024×640`.
  4. `(385..430, 470..490)`: Contact shadow beneath Shelly's far-right front flipper on the woven rug is very soft; strengthening ambient occlusion will lock grounding to `10/10`.

---

### Scene 04 — `04-hotel.png` — **8.90 / 10** (`1C · 0M · 3m`) — **FAIL**
**Strengths**: Luxury coastal hotel charm! Checkered teal floor, navy-and-gold rug, tufted burgundy loveseat, brass floor lamp light cone, timber concierge canopy with clock & glowing globe sconces, lighthouse harbor window, and a `9.8/10` `hotel-whale`.
- **CRITICAL**:
  1. **`(806..820, 170..192)` — Wall Shelf Bracket Piercing `hotel-whale`'s Tail Fluke**: The dark-brown wooden support bracket beneath the upper-right wall shelf cuts directly through and renders in front of the whale's pale-blue tail fluke `(775..855, 175..215)`. *(Fix: shift `hotel-whale` forward in Z by ~0.35 units and/or nudge the right shelf upward/rightward — instantly restores this scene to ~9.7/10!)*
- **Minor**:
  1. `(545..575, 320..340)`: Blossoms in the white desk flower vase graze the underside curve of the whale's chin belly with virtually zero separation.
  2. `(568..652, 145..180)`: Whale's pillbox hat overlaps the lower row of key tags on the "HARBOR HOTEL" key rack directly behind it (fixed automatically by bringing the whale slightly forward/lower or raising the rack).
  3. `(758..798, 315..345)` & `(835..995, 345..420)`: Green banker's lamp shade is an un-beveled cylinder, and luggage-rack legs lack crisp floor contact shadows.

---

### Scene 05 — `05-pharmacy.png` — **8.74 / 10** (`0C · 2M · 3m`)
**Strengths**: Delightful pastel mint apothecary with herb-drying rack, brass birdcage terrarium, louvered garden window, wooden apothecary drawers, brass scale, mortar & pestle, warm overhead light cones, botanical hex rug, and glossy twin-catchlight eyes on `pharmacy-shrimp`.
- **Major**:
  1. **`(598..684, 250..275)` — `pharmacy-shrimp` Collar Skin Poke-Through & Rigid Standoff Ring**: Peach body geometry pokes out through the white collar at `(671..675, 260..267)` (matching `proofs-v16/pharmacy-shrimp/quarter.png (343..349, 298..306)`). The collar stands off like a stiff rigid cylinder ring with daylight gaps behind the cheeks, and the shrimp's right pincer overlaps/clips the teal bow-tie edge at `(620..638, 266..288)`.
  2. **`(500..665, 65..198)` — Three Back-Wall Shelf Bracket / Light-Bulb Bottle Collisions**:
     - Hanging light bulb `(500..528, 65..95)` clips/overlaps across the top-left orange bottle `(515..535, 80..108)`.
     - Upper-shelf right green bracket `(645..665, 112..132)` stabs straight into the neck of the blue bottle `(643..664, 118..148)`.
     - Middle-shelf left green bracket `(520..538, 154..176)` stabs straight into the cork/neck of the green bottle `(520..540, 168..198)`, while the adjacent orange bottle cork `(558..572, 154..165)` presses into the shelf underside above.
- **Minor**:
  1. `(480..895, 0..85)`: Pastel bottles inside the top white wall cabinet are washed out with low contrast against the white backing.
  2. `(580..650, 270..300)`: Shrimp pincers look slightly stubby with dark tip pinch dots compared to `ref-ocean-cast.jpg`.
  3. `(645..685, 290..355)`: Shrimp's hovering tail aligns vertically over a dark-teal wainscoting pilaster, reducing silhouette contrast slightly.

---

### Scene 06 — `06-captains-deck.png` — **8.48 / 10** (`0C · 2M · 2m`)
**Strengths**: Adorable Captain Walrus with glossy eyes, ivory tusks & naval coat, crisp planked wood deck, helm wheel, deck grate, painted compass rose, rope coils, belaying-pin rack, and charming starboard glimpse of palm islet + sailboat + red-white buoy.
- **Major**:
  1. **`(550..1000, 320..640)` & `(450..690, 40..250)` — Severe Sparse Flat-Plank Deck Density**: Huge stretches of bare brown planking dominate the lower-right (`~450×300px` containing only one tiny chest + spyglass) and upper-center-right (`~240×210px` empty planks). Compare against `ref-diorama-boards.jpg` (middle diorama): needs barrel clusters, cargo crates/nets, carved bulwark railing posts with rope swags, stepped quarterdeck stairs, and/or furled sail beams to match Nintendo board richness.
  2. **`(0..150, 175..430)` & `(340..445, 225..315)` — Unfinished Bare Rigging Posts & Weak Contact Shadows**: Left-side wooden posts enter the deck with zero mast collars, cleats, or base shadows; Captain Walrus's flippers/belly cast very little ground contact shadow onto the bright deck planks.
- **Minor**:
  1. `(345..440, 250..300)`: Subtle texture speckling/aliasing along Captain Walrus's light-blue uniform trim and brass buttons.
  2. `(855..1024, 50..180)`: Starboard deck railing is a thin plain brown strip lacking sturdy carved railing posts and rope ties.

---

### Scene 07 — `07-lighthouse.png` — **8.80 / 10** (`0C · 2M · 4m`)
**Strengths**: Super endearing `hana` jellyfish in live gameplay, classic red-and-white striped lighthouse, multi-lobed rounded puff-trees (zero cones!), stone tidepool, bench, sailboat, sunny palette.
- **Major**:
  1. **`(215..345, 360..450)` — Tree Foliage/Trunk Clipping Into Flowerbed & Stone Step**: The foreground left multi-lobed tree buries half of the brown flowerbed `(280..345, 395..445)` and overlaps/clips the adjacent rectangular stone step `(280..350, 385..405)`.
  2. **`(0..850, 150..640)` & `(735..865, 280..640)` — Flat-Faceted Grass Stripes & Missing Layered Foam-Ringed Cliffs**: The green lawn exhibits conspicuous flat-shaded radial polygon bands (`200..550, 180..640`), and the right cliff rim `(735..865, 280..640)` is a stark smooth white/gray geometric bevel — lacking the **layered rocky cliffs with white surf foam rings** specified in Rubric D5 and `ref-diorama-boards.jpg`.
- **Minor**:
  1. `(475..545, 460..520)`: Companion crab viewed from behind exposes prominent white-sclera stalked eyes `(504..524, 470..484)` and its left claw overlaps Shelly's tile rim.
  2. `(830..1024, 245..640)`: Far-right water border beside the cliff is bare empty teal water (adding 1–2 foam-ringed sea-stack rocks like `ref-diorama-boards.jpg` would complete the frame).
  3. `(612..626, 228..264)` & `(670..785, 10..150)`: Small brown door/knob protrudes oddly at the lighthouse's left base, and the heavily DOF-blurred brown mound behind the lighthouse reads as an indistinct blob.
  4. `(603, 444)` & `(545..555, 435..460)`: Faint pale UV-pole pinch at the very top apex of Hana's bell dome, and Hana's left bell edge barely grazes Shelly's white selection ring.

---

### Scene 08 — `08-lagoon.png` — **8.86 / 10** (`0C · 2M · 3m`)
**Strengths**: Enchanting storybook lagoon with bespectacled Story Keeper sea turtle (carrying a strapped book!), properly loaded v16 Bok by the green-striped kiosk, scalloped red-and-cream water pavilion, floral vine arch, lotus pads, and cattails.
- **Major**:
  1. **`(210..242, 315..365)` & `(105..180, 560..615)` — Unstyled Cyan Rectangular Placeholder Boxes Embedded in Mossy Hills**: Two harsh, bright-cyan flat boxes protrude awkwardly out of the bottom-left mossy mounds, reading as stray debug/placeholder water blocks.
  2. **`(322..356, 325..368)` & `(475..565, 190..315)` — Cattail Reeds Piercing Wooden Dock + Wall-Clipping Primitive Coral Tubes**: Four cattail reeds stab directly up through the solid wooden dock planks `(250..365, 325..375)`, AND the yellow/pink vertical tube coral clusters `(475..565, 190..315)` are raw cylinders slicing through each other's open rims, creating jagged cutout notches at `(505..520, 208..218)` and `(540..560, 260..275)`.
- **Minor**:
  1. `(580..605, 430..470)`: Lone tiny red bottle/buoy floats isolated in open water beside Shelly's tile without visual grouping.
  2. `(820..1024, 0..240)`: Outer top-right water behind the pavilion is slightly sparse.
  3. `(40..320, 295..640)`: Mossy hill skirts are sharply low-poly faceted (`~10` straight segments) and the dock outline has stair-stepped jagged plank ends.

---

### Scene 09 — `09-caves.png` — **9.03 / 10** (`0C · 1M · 4m`)
**Strengths**: Atmospheric bioluminescent crystal caverns! Glowing teal & violet crystal formations, pastel mushroom rings, glowing golden sound-bell alcoves, stone cave arches, adorable Echo dolphin with blue messenger satchel, and properly loaded v16 Bok.
- **Major**:
  1. **`(682..736, 232..294)` & `(654..680, 250..278)` — Stray Unanchored Gray Beam & Clipping Orange Wedge on Right Yellow Sound Pad**: A flat dark-gray rectangular bar sits inexplicably across the right edge of the yellow pad `(565..745, 200..315)`, and an orange triangular wedge cuts awkwardly out of the front of the golden gong/pot pedestal.
- **Minor**:
  1. `(50..145, 570..640)`: Bok v16 and his cavern kiosk at bottom-left are heavily covered by the `"Ask Shelly"` HUD pill.
  2. `(565..592, 224..250)`: Echo's tail fluke slightly touches/overlaps the blue mushroom cap on the edge of the yellow sound pad.
  3. `(0..205, 140..285)`, `(150..255, 480..585)`, `(810..1005, 210..395)`: Stone cave arches and foreground boulder are noticeably blocky/low-poly faceted; cave shelf edge lacks layered foam/rock sculpting.
  4. `(795..1024, 395..640)`: Outer lower-right water strip outside the cave shelf is dark bare water.

---

### Scene 10 — `10-patterns.png` — **7.84 / 10** (`1C · 1M · 3m`) — **FAIL**
**Strengths**: Joyful, lush coral-garden density with vibrant brain corals, purple ribbed sea fans, branching corals, starfish, radial reef floor patterns, and cute Pip royal gramma fish.
- **CRITICAL**:
  1. **`(535..592, 118..172)` — Procedural Fallback Bok Blob**: Beside the pink-and-white striped stall, Bok renders as the old smooth procedural sphere blob with giant white cartoon sclera bug-eyes, smooth cyan dome cap, and zero overalls/stitching (failing to load the v16 Bok GLB used in Scenes `08`, `09`, `11`).
- **Major**:
  1. **`(55..175, 360..465)` & `(800..1024, 0..380)` — Coral Mound Clipping Onto Woven Reef Pattern + Open Far-Right Water Band**: On the left floor `(25..225, 420..505)`, a large teal coral mound sits straight across half of the radial woven floor pattern disc; meanwhile the outer right ocean band `(800..1024, 0..380)` is empty flat teal water.
- **Minor**:
  1. `(660..718, 500..550)`: Quest-giver Pip fish is quite small (`~58×48px`) under the prominent `"Build a sentence"` pill, reducing face/eye visibility.
  2. `(715..735, 480..545)`: Green reef shelf edge behind Pip shows a rigid flat rectangular bar protrusion.
  3. `(515..565, 175..215)` & `(710..740, 225..260)`: Fine filigree anemone/coral sprigs alias into faint speckled pixels at `1024×640`.

---

### Scene 11 — `11-beach.png` — **8.43 / 10** (`1C · 2M · 3m`) — **FAIL**
**Strengths**: Sunny tropical beach charm! Genuine curved multi-segment palm trees with drooping fronds (zero cones!), Jisu hermit crab securely holding a tiny red-sealed envelope in its front claw, properly loaded v16 Bok by the beach stall, giant glass message-in-a-bottle sculptures, stone starfish tidepools, striped umbrellas, and wooden pier.
- **CRITICAL**:
  1. **`(580..1024, 0..410)` — Blank Empty Upper-Right Water Quadrant**: Roughly `75–80%` of the upper-right quadrant (`x=580..1024, y=0..230` and `x=760..1024, y=230..410`) is completely blank turquoise water with zero boats, palm islets, sea stacks, buoys, or floating message bottles — only 6 tiny white sparkle dots.
- **Major**:
  1. **`(325..336, 282..330)` & `(768..786, 442..535)` — Straight White Shoreline Foam Bars Piercing Giant Bottle & Pier**: Rigid straight rectangular white shoreline segments extend past curves — one slices straight vertically through the center of the giant teal message bottle `(325..336, 282..330)` and another sticks out awkwardly past the left underside of the wooden dock `(768..786, 442..535)`.
  2. **`(955..995, 515..555)` — Sailboat Mast, Flag & Sail Clipping Wooden Pier Corner**: The bottom-right sailboat's mast, red pennant, and sail corner intersect directly into the front-right plank corner and coiled rope of the pier.
- **Minor**:
  1. `(376..408, 396..428)`: Jisu hermit crab's diagonal orange satchel strap aliases into a jagged 1px line passing right beside its right eye.
  2. `(228..240, 215..235)`: Bok v16's right cheek slightly grazes the edge of the sand mound beside the beach kiosk.
  3. `(630..790, 225..375)`: Curved palm fronds are flat single-tone blades; adding a subtle central midrib fold and 2–3 coconuts under the crown would elevate craft to `ref-diorama-boards.jpg`.

---

## 5. Actionable Roadmap: Clearing FAIL → `>= 9.6 / 10` → `10.0 / 10`

### P0 — Clear All 5 Critical Defects (Estimated Impact: `8.60` → **`~9.35 / 10`**, Pass Gate CLEARED)
1. **Fix `02-harbor-town.png` actor bindings & harbor layout**: Replace the legacy spotted manta ray with v16 `subway-ray`, replace the legacy stacked-sphere dock seal with v16 `friend-seal`, and separate `hotel-whale`, `subway-ray`, and the red ferry boat with clean swimming clearance (plus fix the two sailboat-to-seawall/pier clips and scale up `pharmacy-shrimp` off the white curb).
2. **Fix `04-hotel.png` wall-shelf tail clip**: Move `hotel-whale` forward (`+Z`) by `~0.35` units (or shift the right wall shelves up/right) so the wooden shelf bracket `(806..820, 170..192)` clears the whale's tail fluke completely — also resolves the flower-vase graze and key-rack overlap in one stroke.
3. **Fix `10-patterns.png` Bok fallback regression**: Bind the v16 `bok` GLB into Pattern Reef `(535..592, 118..172)` (matching Scenes `08`, `09`, `11`).
4. **Fill `11-beach.png` blank upper-right ocean quadrant `(580..1024, 0..410)`**: Add a sculpted foam-ringed sandbar/palm islet, an anchored sailboat or red-white harbor buoy, and bobbing message bottles across the upper-right ocean, and convert the straight white shoreline bars into curved contour foam rings so they stop piercing the giant bottle & dock.

### P1 — Clear Top Majors to Break `>= 9.6 / 10`
5. **Polish `pharmacy-shrimp` collar + `05-pharmacy.png` wall shelves**: Re-sculpt the shrimp's collar to hug the neck with soft folded lapels (eliminating the `quarter.png (343..349, 298..306)` / live `(671..675, 260..267)` skin poke-through and claw-to-bowtie graze), and shift the 3 colliding apothecary bottles/brackets/bulb `(500..665, 65..198)`.
6. **Dress `06-captains-deck.png` sparse plank quadrants**: Populate `(550..1000, 320..640)` and `(450..690, 40..250)` with barrel stacks, rope-lashed crates, carved railing posts/rope swags, mast collars, and grounded contact shadows under Captain Walrus.
7. **Fix `07-lighthouse.png` tree-in-flowerbed & cliff craft**: Move the foreground tree `(215..345, 360..450)` off the flowerbed and stone step, smooth grass vertex normals to eliminate radial facet bands, and add layered rocky foam-ringed cliff faces + 1–2 offshore sea stacks along `(735..1024, 245..640)`.
8. **Clean up `08-lagoon.png` & `09-caves.png` prop glitches**: Replace the two cyan placeholder mound boxes in `08-lagoon.png`, shift cattails off the wooden pier, separate intersecting coral cylinders; remove the stray gray beam & clipping orange wedge on the right yellow sound pad in `09-caves.png`.
9. **Fix `10-patterns.png` & `11-beach.png` prop collisions**: Shift the left coral rock off the woven pattern disc in `10-patterns.png`, add 1–2 coral islets in far-right ocean `(800..1024, 0..380)`, and nudge the bottom-right sailboat clear of the wooden pier corner in `11-beach.png`.

### P2 — Final `10.0 / 10` Polish Pass
- Fix the razor-thin stray red UV streak behind `subway-ray`'s eye `quarter.png (285..325, 336..342)`, tiny bell-apex dot & right tentacle notch on `hana`, and slightly boxy inner-ear pink highlight + 2px saucer-top paw graze on `restaurant-otter` in `03-restaurant.png`.
- Raise center copper pan in `03-restaurant.png` slightly clear of the spice jar corks; enrich `05-pharmacy.png` upper-cabinet bottle contrast; adjust `09-caves.png` camera/layout so Bok isn't hidden behind the `"Ask Shelly"` HUD pill; add sculpted rounded rock contours to faceted islets/arches in Scenes `01`, `08`, `09` and stronger AO contact shadows under Shelly & grounded props across interiors.
