# Adversarial Critique — Iteration 35 (Rubric v3.0: Super Mario Party Jamboree Benchmark)

- **Reviewer**: `adversarial-critic-v35` (`claude-opus-5-5-high`)
- **Evidence Reviewed**: `work/art-loop/refs/jamboree/*.png` + `art_loop_iter35/` (20 PNGs) + `work/cast-upgrade/proofs-v40/` + runtime/test logs
- **Rubric**: `work/art-loop/rubric.md` (v3.0 — Jamboree Benchmark)

## Scores
- **D1 — Visual & Cast Cohesion (20%)**: `8.2`
- **D2 — Fantastical Region Identity & Indoor Craft (25%)**: `8.7`
- **D3 — Camera, Framing, UX & HUD (15%)**: `8.6`
- **D4 — Grounding, Spatial & Anatomical Realism (15%)**: `8.7`
- **D5 — Switch-Era Craft, Lighting & Material Polish (15%)**: `8.4`
- **D6 — Objective Performance & Runtime Stability (10%)**: `9.4`
- **Weighted Total**: `0.20*8.2 + 0.25*8.7 + 0.15*8.6 + 0.15*8.7 + 0.15*8.4 + 0.10*9.4 =` **`8.61 / 10`**
- **Defect Counts**: `CRIT = 0`, `MAJ = 8`, `MIN = 17`
- **Verdict**: **`PASS`** (`>= 8.5 / 10` and `CRIT = 0`)

## Summary of 8 Remaining `MAJ`s
1. **MAJ-1 (Eye Diversity)**: `taxi-squid`, `jisu`, `hotel-whale`, `friend-seal`, and `restaurant-otter` still read as nearly the same round brown-iris eye template (only `shop-octopus`, `subway-ray`, and Kiko read distinctly).
2. **MAJ-2 (`12-cafe` / `12-activities-3d-cafe` Mutual Gaze)**: Cafe Seahorse's snout & eye still face screen-left while Shelly is on the right.
3. **MAJ-3 (`hotel-whale` Fluke)**: Tail still reads as a single angled blade in `04-hotel` (`690,270`) & `hotel-whale/side` (`498,356`) instead of a clearly visible horizontal forked crescent.
4. **MAJ-4 (`restaurant-otter/side`)**: Black crescent seam/void where Otter's tail meets its body (`385–425, 470–525`).
5. **MAJ-5 (`07-lighthouse` Kiko)**: Kiko (`728,533`) is half-hidden behind Shelly's tile rim and squeezed against the stair railing (`705,515`).
6. **MAJ-6 (`10-pattern-reef` Pip)**: A striped ABAB colonnade pillar hides Pip's face in the hero view (`850,400`).
7. **MAJ-7 (`11-bottle-beach`, `17-jisu`)**: Bottle Beach reads as having a horizon bottle prop rather than being enclosed inside colossal curved sea-glass bottle walls.
8. **MAJ-8 (All 8 Rooms Indoor Sunbeams & Floor Sheen)**: Window sunbeams & glossy floor reflections are still too subtle to read clearly compared to Jamboree ref `04-galleria-indoor.png`.
- Plus `17` `MIN` polish items (details in `#370`/`#371`).
