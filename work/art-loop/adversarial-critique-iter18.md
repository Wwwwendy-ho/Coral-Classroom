# Adversarial Critique — Iteration 18 (`8.32 / 10`)

- **Critic**: `adversarial-critic-v18` (`#198`, `claude-opus-5-5-high`)
- **Weighted Average**: `8.32 / 10`
- **Severity Counts**: `CRITICAL: 1 | MAJOR: 5 | MINOR: 6`
- **Verdict**: `FAIL` (Critical present, below 8.5)

## Dimension Scores
- **D1 Silhouette/Species**: `8.6`
- **D2 Eyes/Face/Finish**: `7.6`
- **D3 Grounding**: `8.0`
- **D4 Density**: `8.2`
- **D5 Craft**: `8.7`
- **D6 Runtime**: `9.5` (telemetry accepted as reported)

## Scene Scores
- `00-desk`: `8.8` | `00-mob`: `8.7` | `01`: `8.6` | `02`: `7.9` | `03`: `8.8` | `04`: `8.4` | `05`: `8.8` | `06`: `7.6` | `07`: `7.8` | `08`: `8.6` | `09`: `8.6` | `10`: `8.7` | `11`: `8.4`

## Findings
### CRITICAL
- **C1**. `07-lighthouse` Hana: bright white dot on the top of the bell between the brows, screen `≈(650,422)`. Looks like a UV-pole/specular hotspot at the dome tip. NOT visible in the v21 proof, so it only shows up in-engine at the board camera's tilt. Fix: move the UV pole/apex off the side facing the camera, or smooth the apex normals / damp specular there.

### MAJOR
- **M1**. `02` `friend-seal` `≈(390,270)`: flippers sit level with the scarf, the body below the scarf is hidden, no contact shadow. Reads as sunk into the quay. Check bbox min y=0.
- **M2**. `02` `subway-ray` `≈(250,200)`: a swimmer hovering mid-air at the boat cabin's height above the harbor. The boat's red flag/pole `≈(258,208)` overlaps the ray's face. Lower it to the water surface and move it off the boat's axis.
- **M3**. `06` Captain's Deck: bare plank fields at `(0–200,280–420)`, `(540–850,40–150)`, `(60–250,520–640 apart from the compass)`. Reads as an empty brown slab next to MP8 boardwalk density. Add crates, coiled rope, nets, lanterns, a hatch and a mast base.
- **M4**. Mira (v22 quarter proof; `08` `≈(615,370)`): iris only `≈55–60%` of the eye with a wide white sclera (spec `72–80%`), and the goggle half-covers the eye. At board scale the face is an unreadable beige blob.
- **M5**. Jisu, `11` `≈(410,410)`: the host renders `≈35px`, the face is a dark smudge and the quill isn't visible. It's the smallest actor in its own encounter. Scale it `~1.4×` and turn it toward the camera.

### MINOR
- **m1**. `01` crab `≈(480,530)` is jammed against the tile cushion, lower half hidden. Nudge it `~0.3u`.
- **m2**. `04` `hotel-whale` is in strict profile and its tail is an upright fish-style blade. Whale flukes should be horizontal.
- **m3**. `07` starfish lying in the grass meadow `≈(210,590),(525,232),(455,155)`: marine props on land.
- **m4**. `03/04` bottom-right floor is empty `≈(780–1024,470–640)`. Add a plant or stool.
- **m5**. `11` Bok is beached in a one-tile puddle `≈(490,200)`. Enlarge the tide pool or move him into the surf.
- **m6**. `09` a thin stray spike sticks out under Bok `≈(255,250)`. Needs checking.

## Passes
- Otter on the counter with the shell plate cupped in its paw; shrimp grips its bottle; Jisu's quill is in its claw (proof); all palms have curved multi-segment fronds; interiors have wainscoting and pendant lights; mobile intro has no overflow; finish is matte-satin across the cast; no pinholes on otter/seal/walrus/Jisu proofs.
