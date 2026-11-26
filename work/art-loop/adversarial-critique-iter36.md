# Adversarial Critique — Iteration 36 (Rubric v3.0: Super Mario Party Jamboree Benchmark)

- **Reviewer**: `adversarial-critic-v36` (`claude-opus-5-5-high`)
- **Evidence Reviewed**: `work/art-loop/refs/jamboree/*.png` + `art_loop_iter36/` (21 PNGs incl. `00-intro-mobile` & `01-coral-cove-mobile` at `390×844`) + `work/cast-upgrade/proofs-v41/` + runtime/test logs
- **Rubric**: `work/art-loop/rubric.md` (v3.0 — Jamboree Benchmark)

## Scores
- **D1 — Visual & Cast Cohesion (20%)**: `8.8`
- **D2 — Fantastical Region Identity & Indoor Craft (25%)**: `8.8`
- **D3 — Camera, Framing, UX & HUD (15%)**: `8.3`
- **D4 — Grounding, Spatial & Anatomical Realism (15%)**: `7.8`
- **D5 — Switch-Era Craft, Lighting & Material Polish (15%)**: `8.6`
- **D6 — Objective Performance & Runtime Stability (10%)**: `9.5`
- **Weighted Total**: `0.20*8.8 + 0.25*8.8 + 0.15*8.3 + 0.15*7.8 + 0.15*8.6 + 0.10*9.5 =` **`8.62 / 10`**
- **Defect Counts**: `CRIT = 2`, `MAJ = 4`, `MIN = 13`
- **Verdict**: **`FAIL`** (`CRIT = 2` despite `>= 8.5` weighted total; 6 of 8 Iter 35 MAJs fully fixed!)

## Resolved in Iteration 36
- `MAJ-1` Eye Diversity (Squid teal cat-almond, Jisu amber crescent, Whale half-lidded sapphire, Otter green tall-almond, Ray sleek almond)
- `MAJ-2` Cafe Seahorse Gaze (points cleanly at Shelly)
- `MAJ-3` Hotel Whale Crescent Fluke (`hotel-whale/side` & `04-hotel`)
- `MAJ-4` Otter Tail Root Seam (`restaurant-otter/side` clean)
- `MAJ-5` Lighthouse Kiko (`07-lighthouse` clean on inner stair tread)
- `MAJ-6` Pattern Reef Pip (`10-pattern-reef` face 100% clear)

## Remaining `CRIT` (2) & `MAJ` (4)
- **CRIT-1 (`12-cafe`, `12-activities-3d-cafe`)**: Board's `"HARBOR TOWN / Signs Restored: 0"` signpost leaks into the Cafe 3D interior and cuts through Shelly.
- **CRIT-2 (`02-harbor-town`)**: Gold `?` cube (`590–700, 590–640`) overlaps Kiko's face/right eye (`605, 610`).
- **MAJ-A**: Flat cyan burst/confetti triangles leak into `12-cafe`, `12-activities`, `15-subway`, `16-friend`, and `17-jisu`.
- **MAJ-B**: `kiko-mochi/side` claws merge into a snout nub and legs read spindly.
- **MAJ-C (`11-bottle-beach`, `17-jisu`)**: Overhead Bottle Beach ribs read as cyan water-slide pipes + flat white-red cork slab.
- **MAJ-D (Indoor Sunbeams)**: `03-restaurant`, `05-pharmacy`, `13-shop`, `12-cafe` floors still need unmistakable diagonal window sunlight bands + mullion shadows like `04-galleria-indoor.png`.
- Plus `13` `MIN`s (details in `#384`).
