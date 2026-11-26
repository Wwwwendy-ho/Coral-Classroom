# Coral Classroom — Independent Adversarial Art Director Critique (Iteration 7)

> **Audit Verdict**: **FAIL — `8.26 / 10` Weighted Average (`1` Active Automatic-Fail Critical Defect)**
> **Delta vs. Iteration 6**: **`+0.38` points (`7.88 → 8.26 / 10`)** — Critical Defect #2 (Pharmacy Shrimp face UV pole pinch) is **100% eliminated**, and **5 of 7 live scenes** (`01-coral-cove.png`, `03-restaurant.png`, `04-hotel.png`, `05-pharmacy.png`, `07-lighthouse.png`) now meet or exceed the `8.5+` Mario Party 8 standard.
>
> **Genuine High-Impact Wins Verified in Iteration 7**:
> - **Pharmacy Shrimp Completely Rescued (`proofs-v10/pharmacy-shrimp/*`, `05-pharmacy.png`)**: The Iter 6 automatic-fail UV pole pinch dot, protruding snout lump, vertical forehead clefts, dark under-eye cheek rings, and open hollow collar side gaps are **100% GONE**. Replacing the front-face axial pole with a vertical-Z spherical `head_dome` + double-sided U-folded apothecary collar produces a smooth, plush, studio-grade shrimp silhouette that directly echoes `ref-ocean-cast.jpg`, while preserving clean shelf & counter clearances in `05-pharmacy.png`.
> - **Coral Cove Reaches `9.0 / 10` (`01-coral-cove.png`)**: The double-sided coral-red/cream + teal-striped Hero Sailboat (`x: 84–93%, y: 12–39%`) is restored 100% solid and uncropped in the upper-right lagoon, balancing the Conch Pavilion, Pearl Arch Shrine, uncropped left palm islet, and feathered star beam across all four quadrants.
> - **Harbor Town Coarse Water Creases Eliminated (`02-harbor-town.png`)**: The faceted dark Gouroud-shaded diagonal basin triangles from Iter 6 are **100% GONE** (`waterGeo` smooth depth ramp), yielding clean turquoise harbor water.
> - **Otter & Bok Targeted Fixes Landed (`proofs-v10/{restaurant-otter,bok}/*`, `03-restaurant.png`)**: Restaurant Otter's blurry pink waistband bleed on the white apron is **100% GONE** and its rosy cheeks now read warmly in `03-restaurant.png`; Bok's two white dermal poke-through specks on the lower-left blue bib are **100% GONE**.
> - **100% Active Cast GLB Budget & Draw-Call Compliance**: All `39/39` `.glb` files in `game/assets/models/` (including all `8` rebuilt Iter 7 files) verify at **`M=1, P=1, MAT=1`** (`1` draw call each), every active board GLB `<= 624.22 KB` (`< 650 KB`), and every `-close.glb` `<= 1,394.71 KB` (`< 1,433.6 KB`). Single-slot fetch serialization in `resident-models.js` is confirmed as an intentional tested repo invariant (`game/tools/check/region_resident_cast_test.js` L72–82).
>
> **Why Iteration 7 Still Fails (`1` Active Automatic-Fail Critical Defect + `1` New Major Character Regression + `8.26 < 8.5`)**:
> 1. **[CRITICAL — Empty Quadrants & HUD-Hidden Palm Islet] Captain's Deck Still Has 3 Barren Plank Quadrants (`06-captains-deck.png`)**: In `art_loop_iter7/06-captains-deck.png`, **three of four quadrants** — lower-left (`x: 0–42%, y: 38–100%`, ~92% bare planks), lower-right (`x: 54–100%, y: 58–100%`, ~85% bare planks with only clipped bottom-edge slivers), and upper-left (`x: 0–50%, y: 0–30%`, ~85% bare planks) — are vast empty brown wood expanses (`rubric.md` L21 Automatic-Fail), AND the starboard palm islet (`x: 70–82%, y: 0–18%`) shifted straight underneath the `Coral Cove` HUD pill and top frame edge `y = 0%`. **Root cause**: `region-scenery.js` L1733–1745 only placed 9 `camBandSpecs` around one narrow midships patch (`cx`, `sb.maxZ`) while leaving the rest of the huge ship deck (entire inboard oval interior + `treasure`/`story` branch corridors + port/bow flanks) nearly bare (`main.forEach` L1751 only fires `i % 3 === 0` outboard with `outerClear 3.4`), so when `06-captains-deck.png` rendered near the `treasure` branch fork, almost none of those 9 midships vignettes were in frame!
> 2. **[MAJOR REGRESSION — Brow-Into-Eyeball Clipping] Captain Bay's Lowered Eyebrows Pierce Both Eyeballs (`proofs-v10/captain-bay/{front,quarter}.png`)**: Lowering Captain Bay's beige brow ellipsoids to `z = 1.945, y = -0.355` (`build_supporting_hosts.py` L305) drove them **directly into the upper glossy black irises** (`eye center z = 1.855, r = 0.204 -> top z = 2.059`, front cornea `y ≈ -0.381` vs brow front `y = -0.400`), leaving beige lumps embedded inside the top of both eyes.

---

## 1. Forensic Verification of All 5 Iteration 7 Defect Tickets (`I7-1` – `I7-5`)

| Iter 7 Ticket | Target | Iter 7 Status | Forensic Visual & Source-Code Evidence |
|---|---|---|---|
| **I7-1 [P0 — CRITICAL]** | Captain's Deck: furnish barren quadrants around `cx` + uncrop starboard palm islet + frame upper-left aft sail (`region-scenery.js`) | **`FAIL`** | **CRITICAL DEFECT PERSISTS / WORSE IN CAPTURED VIEW**: In `art_loop_iter7/06-captains-deck.png` (captured near the `treasure` branch fork, unlike Iter 6's `story` branch view), **~65–70% of the entire viewport is barren flat brown wood planks** — lower-left (`x: 0–42%, y: 38–100%`) is ~92% empty planks (only 1 small crate at `x: 31%, y: 83%`), lower-right (`x: 54–100%, y: 58–100%`) is ~85% empty planks (only a lone `B.wheel` and two cropped bottom-edge slivers at `y: 95–100%`), and upper-left (`x: 0–50%, y: 0–30%`) is ~85% empty planks with no furled sail framing it. Meanwhile, moving the palm islet to `[sbBaseX - 1.6, sb.maxZ + 2.4]` (`L1908`) shifted it straight **behind the `Coral Cove` pill and cropped at `y = 0%`** (`x: 70–82%, y: 0–18%`), while an unappealing dark blurry grey rock sits at `x: 88–99%, y: 12–29%` and the companion sailboat (`[sb.maxX + 1.4, sb.maxZ - 3.2]`) vanished from the frame. **Root cause**: furnishing only 9 static points around `cx` leaves the rest of the ship's vast inboard & branch deck completely empty whenever Shelly stands elsewhere on the loop. |
| **I7-2 [P0 — CRITICAL]** | Pharmacy Shrimp: pole-free vertical-Z spherical head dome + closed double-sided U-folded collar + cheek/claw polish (`build_town_residents.py`) | **`PASS`** | **100% RESOLVED**: `proofs-v10/pharmacy-shrimp/{front,quarter}.png` and `art_loop_iter7/05-pharmacy.png` confirm a completely smooth, pole-free spherical plush head (`head_dome`, L640–653, poles hidden cleanly under the cap & inside the collar), warm outward rosy cheeks, cute open-notched rounded pincer claws, and a solid double-sided U-folded white apothecary collar (`L763–782`) that completely eliminates Iter 6's hollow dark side gaps. Shelf & counter clearances in `05-pharmacy.png` remain crisp (`0` clipping). *(Minor polish note only: painted mint cross at `L227–229` maps to `u = 0.5` on the invisible back of the cap instead of `u = 0` front, and outer collar `r = 0.305..0.315` flares slightly wide in `quarter.png`.)* |
| **I7-3 [P1 — HIGH]** | Harbor Town: eliminate coarse diagonal water creases, add sunlit caustic texture, uncrop leftmost yellow sailboat, separate lamp from planter (`region-scenery.js`) | **`PARTIAL`** | **Water creases FIXED; 2 of 3 sub-items FAILED + 1 texture bug**: (1) Coarse dark diagonal water triangles are **100% GONE** (`02-harbor-town.png`), leaving smooth turquoise harbor water — however `townWaterTex` (`L518–536`) draws `rgba(255,255,255,0.16)` and `rgba(225,253,255,0.22)` strokes onto a solid `#ffffff` canvas, yielding ~0% contrast (matte flat water without sunlit caustic sparkle). (2) Leftmost yellow sailboat (`x: 0–6.5%, y: 26–45%`) is **STILL 35% sliced off at `x = 0%`** because the ferry `(cx, cz)` sits at `x = 4%` on screen, so the `L1081` clamp (`bx <= cx - 4.6`) still permits boats off the left edge. (3) Right-sidewalk hanging lantern (`x: 66–69%, y: 61–73%`) **STILL overlaps/clips the flower planter's blooms (`x: 66.5%, y: 64%`)** because shifting the duplicate `i % 3 === 0` planter (`L851`) to `+f.tx * 2.15` pushes it directly beneath the `2.45`-unit-tall lantern shade's up-screen perspective projection! |
| **I7-4 [P1 — HIGH]** | Coral Cove: restore visible solid double-sided Hero Sailboat in upper-right lagoon (`crafted-world.js`) | **`PASS`** | **100% RESOLVED**: `art_loop_iter7/01-coral-cove.png` (`x: 84–93%, y: 12–39%`) displays the coral-red/cream hull and billowing teal-and-cream striped mainsail **100% solid, double-sided, and uncropped**, cleanly clear of the Conch Pavilion, Pearl Arch Shrine, and top-right HUD buttons. |
| **I7-5 [P2 — POLISH]** | Restaurant Otter (apron bleed, cheeks, smile), Bok (bib dermal specks, cap button stitch ring), Captain Bay (brows clear of visor, rounded front flippers) | **`PARTIAL`** *(New Major Regression on Captain Bay)* | **Otter**: Apron pink waistband bleed **100% FIXED** and rosy cheeks now read warmly in `03-restaurant.png`; dark mouth cavity (`L861`, `z = 1.278, y = -0.398`) sits above/in front of the pink tongue (`z = 1.268`), giving a slightly startled `▲`/`∩` mouth expression in `03-restaurant.png` rather than a beaming upward `:3` smile. **Bok**: Lower-bib white dermal poke-through specks **100% FIXED** (`proofs-v10/bok/*`), though the cap dome (`L240`, `v = 0` at crown) still rings the top button with a faint pale stitch halo. **Captain Bay (REGRESSION)**: Lowering brow ellipsoids to `z = 1.945` (`build_supporting_hosts.py` L305) caused them to **clip directly into the upper glossy black irises of both eyes** (`eye top z = 2.059`), and front flipper tips (`L318–320`) still terminate in sharp flat-chopped trapezoid edges (`proofs-v10/captain-bay/quarter.png`). |

---

## 2. Honest Rubric Re-Scoring (`0–10`)

| # | Dimension | Weight | Iter 6 | Iter 7 | Weighted | Objective Justification vs. Mario Party 8, North-Star Sheets & Shelly |
|---|---|---:|---:|---:|---:|---|
| 1 | **Silhouette & Species Appeal** | 25% | 7.4 | **8.3** | 2.075 | Huge leap (`+0.9`): Pharmacy Shrimp (`proofs-v10`, `05-pharmacy.png`) is now genuinely adorable and instantly readable (smooth plush dome head, C-arched segmented carapace, articulated open-notch claws, solid folded collar matching `ref-ocean-cast.jpg`). Hotel Whale (`04`), Keeper Hana (`07`), Restaurant Otter (`03`), Bok (`proofs-v10`), Shelly, and Kiko Hermit all read strongly. Held at `8.3` by Captain Bay's stiff flat-chopped front flipper tips (`quarter.png`), Shrimp's slightly wide/tubular collar flare (`quarter.png`), and Otter's slightly cylindrical lower torso. |
| 2 | **Eyes, Face & Surface Finish** | 20% | 7.5 | **8.1** | 1.620 | **Zero UV pole pinches across the entire cast** (`rubric.md` L18 Critical eliminated on Shrimp); Shrimp's warm cheeks sit cleanly off the eye sockets; Otter's blurry pink apron bleed is 100% gone and cheeks read clearly in `03-restaurant.png`; Bok's bib is spotless; Harbor Town's dark diagonal water creases are 100% gone (`02`). Held back by **Captain Bay's brow-into-eyeball clipping regression (`proofs-v10`)**, Otter's slightly startled `▲` mouth shape (`03`), Harbor Town's invisible white-on-white `townWaterTex` ripples (`02`), Bok's tiny cap-crown stitch ring, and Shrimp's back-facing mint cap cross. |
| 3 | **Anatomical & Spatial Grounding** | 20% | 8.5 | **8.3** | 1.660 | Shrimp's hollow collar side gaps are 100% sealed, and all 3 interiors (`03–05`) plus Coral Cove (`01`) and The Lighthouse (`07`) maintain crisp clearances (`0` counter/shelf/boulder clipping). Deducted (`-0.2`) for the **new Major Captain Bay brow-into-eyeball mesh clipping regression** (`build_supporting_hosts.py` L305) and Harbor Town's still-unfixed sidewalk hanging lantern overlapping the flower planter (`02-harbor-town.png`, `x: 66.5%, y: 64%`). |
| 4 | **Camera-Band Diorama Density** | 15% | 7.1 | **7.2** | 1.080 | **Coral Cove (`01`)** leaps to `9.0 / 10` with the restored solid uncropped Hero Sailboat; **The Lighthouse (`07`)** (`8.7`) and **Harbor Town (`02`)** (`8.3`, barring the clipped yellow boat) feel lively and MP8-dense. Strictly capped at `7.2` by **Captain's Deck (`06-captains-deck.png`) STILL exposing 3 barren plank quadrants (`85–92%` empty)** and burying its palm islet behind `Coral Cove` + `y = 0%`, plus Harbor Town's 35%-cropped leftmost yellow sailboat. |
| 5 | **Sculpted Craft & Detail** | 10% | 7.9 | **8.4** | 0.840 | Coral Cove's solid billowing striped Hero Sailboat (`01`), Shrimp's segmented carapace & U-folded collar (`05`), Otter's razor-crisp stitched bistro apron (`03`), Hotel Whale's piped vest (`04`), and smooth Harbor Town basin water (`02`) push sculpted craft near studio standard. Deducted for Harbor Town's flat white-on-white water caustic texture, Captain's Deck's bare mid-deck planks + twin standalone floor wheels (`06`), and Captain Bay's flat-edged flipper tips. |
| 6 | **Runtime Budget & Stability** | 10% | 9.7 | **9.8** | 0.980 | **All `39/39` `.glb` files verified at `M=1, P=1, MAT=1`** (`1` draw call each). All active board GLBs `<= 624.22 KB` (`< 650 KB`), all active `-close.glb` files `<= 1,394.71 KB` (`< 1,433.6 KB`), `crafted-shelly.glb` = `1,395.91 KB`, `crafted-shelly-view.glb` = `738.28 KB`. Static scenery merged via `reef3dMerge`; zero procedural fallback blobs; single-slot `resident-models.js` confirmed as tested invariant (`region_resident_cast_test.js` L72–82). `-0.2` minor note only for unused non-crafted legacy fallback `shelly.glb` (`3,045.28 KB`) / `shelly-view.glb` (`1,228.10 KB`) still present in `game/assets/models/`. |
| | **WEIGHTED TOTAL** | **100%** | 7.88 | **8.26 / 10** | **8.255** | **FAIL** (Requires `>= 8.5 / 10` AND `0` Critical Defects; currently `8.26 / 10` with `1` Critical Defect) |

---

## 3. Complete GLB Budget & Topology Audit (`game/assets/models/`)

All `39` `.glb` files parsed directly from binary glTF JSON headers:
- **Draw Calls / Topology**: **`39 / 39` PASS** (`M=1, P=1, MAT=1`).
- **Iteration 7 Rebuilt Cast (`8` files)**:
  - `pharmacy-shrimp.glb` (`337.41 KB`, `V=3,844`) / `pharmacy-shrimp-close.glb` (`601.64 KB`, `V=8,107`) — **PASS**
  - `restaurant-otter.glb` (`360.57 KB`, `V=4,573`) / `restaurant-otter-close.glb` (`712.98 KB`, `V=10,296`) — **PASS**
  - `captain-bay.glb` (`414.10 KB`, `V=4,614`) / `captain-bay-close.glb` (`988.22 KB`, `V=11,267`) — **PASS**
  - `bok.glb` (`408.89 KB`, `V=4,386`) / `bok-close.glb` (`924.00 KB`, `V=9,768`) — **PASS**
- **Unchanged Iteration 6 Cast (`4` files)**:
  - `hotel-whale.glb` (`343.60 KB`, `V=4,078`) / `hotel-whale-close.glb` (`620.57 KB`, `V=8,562`) — **PASS**
  - `hana.glb` (`427.15 KB`, `V=4,533`) / `hana-close.glb` (`1,000.44 KB`, `V=11,516`) — **PASS**
- **All Other Active Cast (`25` files)**: Max active board GLB is `mira.glb` (`624.22 KB < 650 KB`); max active close GLB is `cafe-seahorse-close.glb` (`1,394.71 KB < 1,433.6 KB`); `crafted-shelly.glb` (`1,395.91 KB`) & `crafted-shelly-view.glb` (`738.28 KB`) PASS cleanly.
- **Legacy Non-Crafted Fallbacks (`2` files)**: `shelly.glb` (`3,045.28 KB`, `M=1, P=1, MAT=1`) and `shelly-view.glb` (`1,228.10 KB`, `M=1, P=1, MAT=1`) are only loaded when `crafted === false` (`shelly.js` L54–55), unused in default crafted mode.

---

## 4. Defects Catalog (Critical / Major / Minor)

### Critical Defects (Automatic Iteration FAIL — `1` Active)
1. **CRITICAL-1 — Captain's Deck Has 3 Barren Plank Quadrants & HUD-Buried Palm Islet (`06-captains-deck.png`, `region-scenery.js` L1691–1785, L1905–1932; `board.js` L963)**:
   - Lower-left (`x: 0–42%, y: 38–100%`, ~92% empty planks), lower-right (`x: 54–100%, y: 58–100%`, ~85% empty planks), and upper-left (`x: 0–50%, y: 0–30%`, ~85% empty planks) violate `rubric.md` Line 21 ("Any empty/blank quadrant in the default gameplay camera").
   - Starboard palm islet (`x: 70–82%, y: 0–18%`) is 60% obscured behind the `Coral Cove` pill and cropped at `y = 0%`, while a dark blurry grey rock sits in the open upper-right water (`x: 88–99%, y: 12–29%`) and the companion sailboat is out of frame.
   - **Root cause**: `camBandSpecs` (L1733–1745) only furnished one narrow midships patch around `cx` on `sb.maxZ`, while `main.forEach` (L1751) only runs every 3rd space outboard (`outerClear 3.4`), leaving the entire inboard oval deck, port flank, and both branch corridors nearly bare — exposed immediately when Shelly is at the `treasure` branch fork in `06-captains-deck.png`!

### Major Defects (`3`)
1. **MAJOR-1 (New Regression) — Captain Bay Eyebrows Clipping Directly Into Both Eyeballs (`proofs-v10/captain-bay/{front,quarter}.png`, `build_supporting_hosts.py` L297, L303–305, L339–342)**:
   - Lowering brow ellipsoids to `z = 1.945, y = -0.355` (`ry = 0.045 -> y_front = -0.400`) placed them `0.114` units *below* the top of the glossy eye spheres (`c.z = 1.855, r = 0.204 -> z_top = 2.059`, front cornea `y ≈ -0.381`), driving beige lumps directly into the upper black iris of both eyes.
2. **MAJOR-2 (Unfixed from Iter 6) — Harbor Town Leftmost Yellow Sailboat Still 35% Clipped at `x = 0%` (`02-harbor-town.png`, `region-scenery.js` L1074–1091)**:
   - The harbor ferry at `(cx, cz)` already sits at `x = 4%` on screen, so `if (bx <= cx - 4.6)` (`L1081`) still lets the yellow sailboat sit at `x: 0–6.5%, y: 26–45%`, sliced off by the left frame edge.
3. **MAJOR-3 (Unfixed from Iter 6) — Harbor Town Sidewalk Hanging Lantern Still Overlaps Flower Planter Blooms (`02-harbor-town.png`, `region-scenery.js` L848–853)**:
   - Shifting the duplicate `i % 3 === 0` planter (`L851`) to `+f.tx * 2.15` places it straight up-screen directly underneath the `2.45`-unit-tall lantern post's perspective projection (`x: 66.5%, y: 63–65%`), so the hanging lamp shade visibly clips into the planter's flowers.

### Minor Defects (`6`)
1. **MINOR-1 — Harbor Town Invisible White-on-White `townWaterTex` Ripples (`02-harbor-town.png`, `region-scenery.js` L518–536)**: Painting `rgba(255,255,255,0.16)` and `rgba(225,253,255,0.22)` strokes on a `#ffffff` canvas produces ~0% contrast, leaving the harbor basin flat matte turquoise instead of sunlit-sparkling like `ref-diorama-boards.jpg`.
2. **MINOR-2 — Restaurant Otter Startled `▲`/`∩` Mouth Read (`03-restaurant.png`, `proofs-v10/restaurant-otter/front.png`, `build_town_residents.py` L860–862)**: The dark mouth cavity (`z = 1.278, y = -0.398`) sits *above* and *in front of* the pink tongue (`z = 1.268`), reading slightly startled/concerned from dead-ahead instead of a beaming upward `:3` smile.
3. **MINOR-3 — Captain Bay Flat-Chopped Front Flipper Tips (`proofs-v10/captain-bay/quarter.png`, `build_supporting_hosts.py` L318–320)**: `flipper()` does not taper `w` smoothly back to `0` at `v = 1`, leaving a sharp rectangular trapezoid distal tip.
4. **MINOR-4 — Bok Top Cap Crown Hem-Stitch Ring (`proofs-v10/bok/{front,quarter}.png`, `build_supporting_hosts.py` L240)**: The cap dome's `v = 0` crown edge around the button still samples the pale cloth hem-stitch border.
5. **MINOR-5 — Pharmacy Shrimp Mint Cap Cross Facing Back & Slight Collar Width (`proofs-v10/pharmacy-shrimp/{front,quarter}.png`, `build_town_residents.py` L227–229, L773–788)**: `L788` maps `u = 0` to front `-Y` while `L227–228` paints the mint cross at `u = 0.5` (back of cap); collar `r_outer = 0.305..0.315` flares slightly wide in `quarter.png`.
6. **MINOR-6 — Captain's Deck Twin Bare Floor `B.wheel` Props (`06-captains-deck.png`, `board.js` L963)** & **Lighthouse Right-Edge Sailboat Slight Crop (`07-lighthouse.png`, `x: 95–100%, y: 42–58%`)**: Varying `captain: ['barrel', 'crate', 'cannon', 'wheel']` replaces identical lone wheels planted mid-deck with authentic nautical deck stops.

---

## 5. Ranked Iteration 8 Defect Tickets (Final Surgical Push to `>= 8.8 / 10` & `0` Criticals)

> **Mandatory Visual Gate Before Submitting Iteration 8**: Inspect EVERY `art_loop_iter8/01–07.png` AND EVERY updated `proofs-v11/*.png` before requesting re-audit:
> - `06-captains-deck.png` MUST have **ZERO empty/barren quadrants** (all four quadrants — lower-left inboard, lower-right starboard/branch, upper-left deck, and upper-right ocean — richly dressed with cohesive nautical vignettes) AND an **uncropped curved-frond palm islet + companion sailboat** cleanly clear of BOTH `Coral Cove` and `Travel` HUD pills;
> - `proofs-v11/captain-bay/{front,quarter}.png` MUST show clear blue brow skin between glossy dark eyes and cap visor (`0` brow-into-eyeball clipping) and plump rounded front flipper paddles;
> - `02-harbor-town.png` MUST show all `3` moored sailboats 100% uncropped inside `x: 7–32%`, clear cobblestone between the right-sidewalk hanging lantern and flower planters, and crisp sunlit water ripple highlights without diagonal polygon creases;
> - `03-restaurant.png` & `proofs-v11/{restaurant-otter,bok,pharmacy-shrimp}/*` MUST confirm Otter's cheerful upward `:3` smile, Bok's clean cap crown, and Shrimp's front-facing mint apothecary cap cross;
> - All active `.glb` files remain `< 650 KB` board / `< 1.4 MB` close (`1,433.6 KB`) and `M=1, P=1, MAT=1`, and `region_resident_cast_test.js` continues to pass.

### Ticket I8-1 [P0 — CRITICAL]: Captain's Deck — Full-Ship 360° Deck Furnishing & Clean Upper-Right Ocean Framing
- **Files**: `game/src/js/reef3d/region-scenery.js` (`captain()`, L1691–1785, L1905–1932) & `game/src/js/reef3d/board.js` (L963)
- **Fix**:
  1. **Furnish the ENTIRE inboard & outboard deck around the full circuit (not just 9 points near `cx`) (`region-scenery.js` L1691–1785)**:
     - Keep `placeCaptainVignette(x, z, kind, sd)` with `outerClear(x, z, 2.05) && insideShipDeck(x, z, 0.75)` and `minSpacing = 2.4`.
     - Replace the sparse `main.forEach` (`L1751–1757`) with a **full-loop inboard + outboard vignette pass** across EVERY 2nd main space (`i = 0..main.length - 1`):
       - **Inboard (`side = -1`, `dist = 3.5` and fallback `4.4`)** on `i % 2 === 0`: cycle `['cluster', 'crates', 'capstan', 'hawser', 'chest', 'lantern']` so the vast empty oval deck interior (left half of `06-captains-deck.png`) is richly populated from **every** tile on the board!
       - **Outboard (`side = +1`, `dist = 3.6` and fallback `4.6`)** on `i % 2 === 1`: cycle `['cluster', 'chest', 'hawser', 'crates', 'lantern', 'capstan']` so the deck between the track and gunwales is lively around both port & starboard sides!
     - Add a **branch-corridor vignette pass** over `sp.filter(s => s.branch)` placing compact nautical clusters (`'cluster'`, `'hawser'`, `'chest'`, `'lantern'`, `'crates'`) at `±3.0` and `±4.2` units perpendicular to each branch (`outerClear(x, z, 2.05) && insideShipDeck(x, z, 0.75)`), filling BOTH sides of the `treasure` branch (`06-captains-deck.png` lower-right & upper-right deck) AND the `story` branch!
     - Add a **multi-station central deck spine** spanning the ship's centerline (`x` at `cx - 9, cx - 4.5, cx + 4.5, cx + 9`, `z = cz ± 2.6`) with a second `deckHatch`, `capstan`, stacked timber cargo crates, and coiled mooring hawsers (skipping any spot colliding with mast/hatch/compass/tiles), guaranteeing zero empty interior patches anywhere on the `36×20` deck!
     - Lower `deckSteps` rail spacing (`L1759`, `deckSteps = 8`, `outerClear(dx, dz, 2.35)`) so the port & starboard bulwarks carry continuous rich clusters of barrels, brass chests, rope coils, and warm deck lanterns rather than sparse isolated edge props.
  2. **Place curved-frond palm islet + sailboat cleanly in the unobstructed upper-right ocean window (`L1905–1932`)**:
     - Eliminate the dark grey `organicRock` (`kind = 0`) right off the visible bow/starboard corner (`L1926`: replace `[sb.maxX + 4.0, cz + 4.2, 0]` / `[sb.minX - 4.2, cz - 4.4, 0]` with `kind = 1` curved-frond palm islets or sailboats!).
     - Place a guaranteed uncropped **curved-frond palm sandbar islet (`palmTree` scale `0.68`) + red/white channel buoy + companion sailboat** along the visible ocean rail band clear of BOTH `Coral Cove` (`x: 68–79%, y: 1–7%`) AND `Travel` (`x: 91–99%, y: 8–14%`) — i.e., positioned so in `06-captains-deck.png` the palm islet sits squarely inside `x: 80–94%, y: 16–32%` with all fronds 100% visible!
  3. **Diversify Captain's Deck stop props (`board.js` L963)**:
     - Change `captain:['wheel']` to `captain:['barrel','crate','cannon','wheel']` so deck stops display varied nautical props instead of twin standalone steering wheels sticking out of open planks.

### Ticket I8-2 [P1 — MAJOR REGRESSION]: Captain Bay — Fix Brow-Into-Eyeball Clipping & Round Front Flippers
- **File**: `game/tools/art/build_supporting_hosts.py` (`captain_eye` L296–297, `captain_mesh` L303–305, L318–320, L339–342)
- **Fix**:
  1. **Clear brows cleanly from BOTH eyeballs and cap visor**:
     - Slightly lower/tighten eyes (`L297`: `c = Vector((side * .372, -.308, 1.825))`, `L303`: `r = .192` -> eye top `z = 2.017`).
     - Raise the naval cap slightly (`L339–340`: base `z = 2.090 -> 2.155`, `L341`: visor `2.13 -> 2.195`, `L342`: gold badge `z = 2.215 -> 2.280`).
     - Seat bushy ivory brows cleanly in the open blue forehead band between eyes and visor (`L305`: `b.ellipsoid((s * .345, -.338, 2.045), (.112, .036, .028), 'ivory', 'Head', ...)`), verifying zero overlap with both eyeballs (`2.045 - 0.028 = 2.017 >= eye_top`) and cap visor (`2.045 + 0.028 = 2.073 < visor_bottom ~2.09`).
  2. **Plump rounded paddle front flippers (`L318–320`)**:
     - Taper the distal edge smoothly at `v -> 1` using `tip = math.sin(math.pi * (.12 + .86 * v)) ** .75` on `w` (or replace with a smooth curved closed paddle surface/ellipsoid pair) so `proofs-v11/captain-bay/quarter.png` shows soft rounded walrus paddles with zero flat-chopped trapezoid corners.
  3. Rebuild `captain-bay.glb` & `captain-bay-close.glb`, verify `proofs-v11/captain-bay/{front,quarter}.png`, and confirm budgets (`< 650 KB` / `< 1.4 MB`, `M=1, P=1, MAT=1`).

### Ticket I8-3 [P1 — MAJOR]: Harbor Town — Uncrop Yellow Sailboat, Separate Lamp/Planter & Fix Sunlit Water Ripples
- **File**: `game/src/js/reef3d/region-scenery.js` (`waterGeo` L515–543, `town()` L848–853, L1074–1091)
- **Fix**:
  1. **Uncrop leftmost yellow moored sailboat (`L1074–1091`)**:
     - Tighten the left-edge guard at `L1081` from `if (bx <= cx - 4.6) return;` to `if (bx <= cx + 0.5) return;` and shift fallback basin anchors at `L1088` rightward into the visible upper-inner basin (`[[cx + 1.2, cz - 3.6], [cx + 3.2, cz - 2.0], [cx + 2.4, cz + 2.4], [cx + 0.8, cz - 4.4]]`) so ALL `3` colorful sailboats sit 100% uncropped inside `x: 7–32%` in `02-harbor-town.png`.
  2. **Eliminate sidewalk hanging lantern / flower planter overlap (`L848–853`)**:
     - Remove the duplicate `flowerPlanter` call at `L851` inside the `i % 3 === 0` block (leaving `hangingLantern` + `crate` cleanly framed on open cobblestone, while `i % 3 === 1` at `L838` already populates the sidewalk with lush flower planters!).
  3. **Make Harbor Town's sunlit caustic water texture actually visible (`L485, L518–537`)**:
     - Change `L518` canvas fill from `#ffffff` to **`#d2e7eb`** (and nudge `oceanPal.town.shallow` at `L485` to `'#74e2eb'` to preserve vibrant brightness) and stroke crisp sunlit caustic ovals & ripples in **`rgba(255, 255, 255, 0.72)`** and **`rgba(220, 253, 255, 0.52)`**, delivering sparkling sunlit harbor water with zero diagonal polygon creases.

### Ticket I8-4 [P2 — POLISH]: Otter Cheerful Smile, Bok Cap Crown UV & Shrimp Front Apothecary Cross
- **Files**: `game/tools/art/build_town_residents.py` (`otter_mesh` L860–862, `shrimp_mesh` L773–788), `game/tools/art/build_supporting_hosts.py` (`bok_mesh` L240)
- **Fix**:
  1. **Restaurant Otter joyful `:3` smile (`build_town_residents.py` L860–862)**:
     - Lower & nestle the dark mouth cavity cleanly below the twin cheek pads (`z = 1.264, y = -.390, radii = (.048, .014, .022)`) with the pink tongue peeking gently at the *bottom* of the open smile (`z = 1.256, y = -.394, radii = (.040, .018, .016)`) and an upward-curving smile line (`z = 1.292 - .024 * math.sin(t * math.pi)`) so Otter beams warmly in `03-restaurant.png`.
  2. **Bok cap crown UV (`build_supporting_hosts.py` L240)**:
     - Add `uvfn=lambda u, v: (u, .18 + .82 * v)` to the newsboy cap dome (`L240`) so the `v = 0` crown edge around the top button samples clean solid sky-blue cloth with zero pale stitch halo.
  3. **Pharmacy Shrimp front-facing mint apothecary cross & snug collar (`build_town_residents.py` L773–788)**:
     - Change `L788` cap `uvfn` from `lambda u, v: (u, 1 - v)` to `lambda u, v: ((u + .5) % 1, 1 - v)` so the painted mint apothecary cross shines clearly on the **front** of Shrimp's white cap in `05-pharmacy.png`; optionally trim outer collar `r` at `L773–777` slightly (`0.292..0.298` vs `0.305..0.315`) for an even snugger turtleneck silhouette in `quarter.png`.
  4. Rebuild `restaurant-otter`, `bok`, and `pharmacy-shrimp` GLBs, verify `proofs-v11/*`, and confirm all budgets (`< 650 KB` / `< 1.4 MB`, `M=1, P=1, MAT=1`).
