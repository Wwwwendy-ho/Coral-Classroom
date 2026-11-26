# Adversarial Critique — Iteration 34 (Rubric v3.0: Super Mario Party Jamboree Benchmark)

- **Reviewer**: `adversarial-critic-v34` (`claude-opus-5-5-high`)
- **Evidence Reviewed**: `work/art-loop/refs/jamboree/*.png` (5 frames) + `art_loop_iter34/` (20 PNGs) + `work/cast-upgrade/proofs-v39/{kiko-hermit,kiko-mochi,jisu,taxi-squid,hotel-whale}/{front,quarter,side}.png` + runtime/test logs
- **Rubric**: `work/art-loop/rubric.md` (v3.0 — Jamboree Benchmark)

## Scores
- **D1 — Visual & Cast Cohesion (20%)**: `8.8`
- **D2 — Fantastical Region Identity & Indoor Craft (25%)**: `8.8`
- **D3 — Camera, Framing, UX & HUD (15%)**: `8.9`
- **D4 — Grounding, Spatial & Anatomical Realism (15%)**: `8.5`
- **D5 — Switch-Era Craft, Lighting & Material Polish (15%)**: `8.2`
- **D6 — Objective Performance & Runtime Stability (10%)**: `9.6`
- **Weighted Total**: `0.20*8.8 + 0.25*8.8 + 0.15*8.9 + 0.15*8.5 + 0.15*8.2 + 0.10*9.6 =` **`8.76 / 10`**
- **Defect Counts**: `CRIT = 0`, `MAJ = 7`, `MIN = 16`
- **Verdict**: **`PASS`** (`>= 8.5 / 10` and `CRIT = 0`; below `>= 9.8 / 10` target due to 7 `MAJ`s)

## Jamboree Comparison Summary
- **Strong**: Fully enclosed indoor Captain's Great Cabin (coffered ceiling, chandeliers, vitrines, globe, chests, telescope, ocean gallery), Pattern Reef spirals/checkers/ABAB colonnades, Echo Caves rings & chimes, Harbor Town architecture, 8 bespoke Harbor Town 3D rooms, cohesive cast proofs (glasses flush, Jisu quill gripped, zero pinholes/voids/snowman splits), clean 2-corner HUD, true `390×844` mobile intro, and `D6 = 9.6` (`2,194` meshes, `285/285` music, `25/25` unit suites, `26+` GLBs OK, `0` errors).
- **Remaining Jamboree Gaps (`7 MAJ`, `16 MIN`)**:
  - **MAJ-1 (`03-restaurant`)**: Otter is jammed behind the dining table (`(575,390)`) with foot hovering above floor (`(595,405)`), no contact shadow.
  - **MAJ-2 (`02-harbor-town`)**: `?` cube impaled on a café umbrella pole at `(325, 245)`.
  - **MAJ-3 (`02-harbor-town`)**: Kiko `(700, 393)` wanders ~3 tiles ahead of Shelly across the curb instead of scuttling beside her.
  - **MAJ-4 (`08-lagoon`)**: Untextured hollow pastel cylinders at `(500–540, 270–330)` and `(560–600, 305–360)`.
  - **MAJ-5 (All 8 rooms)**: Missing diagonal window sunbeams & glossy floor sheen/reflections (unlike `04-galleria-indoor.png`).
  - **MAJ-6 (`06-captains-deck`)**: Flat translucent bloom sprites on chandelier/lanterns and yellow halo slab over chest `(930, 520)`.
  - **MAJ-7 (`11-bottle-beach`, `17-jisu`)**: Giant bottle walls read as faint thin white streaks across the sky; neck/cork `(330, 100)` don't read cleanly as a bottle.
  - Plus `16` `MIN` polish items (matte board spaces without metallic rim/AO vs `02-space-closeup.png`, boxy hedges/flat-shaded rocks vs `05-blossom-park.png`, missing warm horizon haze vs `01-western-wide.png`, seal/Jisu floor contact shadows, taxi tentacle/antenna cross, lighthouse Kiko rim tuck, coral cove open-water star cube, echo caves blocky stall, lagoon boat placement).
