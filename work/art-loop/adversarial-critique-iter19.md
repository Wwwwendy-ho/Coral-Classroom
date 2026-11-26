# Adversarial Critique — Iteration 19 (`9.34 / 10`)

- **Critic**: `adversarial-critic-v19` (`#209`, `claude-opus-5-5-high`)
- **Weighted Average**: `9.34 / 10`
- **Severity Counts**: `CRITICAL: 0 | MAJOR: 0 | MINOR: 9`
- **Verdict**: `PASS` (clears 8.5 bar, below 9.6/9.8 target)

## Dimension Scores
- **D1 Silhouette**: `9.3`
- **D2 Eyes/Face**: `9.1`
- **D3 Grounding**: `9.5`
- **D4 Density**: `9.2`
- **D5 Craft**: `9.3`
- **D6 Runtime**: `9.8` (telemetry accepted; verified `<=0.94%` pure-white pixels, zero blown-out highlights)

## Scene Scores
- `intro-desktop`: `9.4` | `intro-mobile`: `9.3` (no overflow) | `coral-cove`: `9.5` | `harbor`: `9.5` | `restaurant`: `9.5` | `hotel`: `9.2` | `pharmacy`: `9.4` | `captains-deck`: `9.1` | `lighthouse`: `9.5` | `lagoon`: `9.3` | `caves`: `9.2` | `patterns`: `9.2` | `beach`: `9.5`

## Findings (MINOR: 9)
1. `mira` `proofs-v24`: no mouth or smile line from either angle (`front 285-370,290-330`; `quarter 170-260,250-300`). The pale muzzle also looks lumpy and reads blank.
2. `10-patterns` `Pip`: realistic fish eye only `~13px` across at `(298-312,413-427)`. No sclera, no twin catchlights, no visible mouth, no blush. Below the cast standard.
3. `hotel-whale` proof: from the front it's a near-perfect sphere (`front 175-460,215-485`). Pectoral fins are flat cards (`95-180,350-390` / `465-555,350-390`). The tail is a single blade instead of forked flukes (`quarter 400-570,265-320`; in game `04-hotel 760-875,235-265`). Hard seam where the head sphere meets the vest (`quarter ~295-320,235-410`).
4. Iris ratio: a white sclera ring brings the iris down to `~65-70%`, under the `72-80%` band. Whale front eyes at `185-240,275-355` and `405-455,280-355`. Bok `proofs-v23` front eyes at `228-285,262-322` and `352-410,262-322`.
5. `09-caves`: empty open-water area in the upper right (`830-1024,95-260`) beyond the cave floor rim.
6. `10-patterns`: open water along the right edge (`860-1024,250-420`).
7. `06-captains-deck`: bare plank areas at `(760-1000,250-400)` and `(540-650,60-200)`. Thinner than MP8 ref `03/05` street density.
8. `08-lagoon`: the dock's far-end posts stop above open water with no visible water contact or ripple (`355-378,345-382`).
9. `06-captains-deck` walrus captain: no contact shadow or AO under the body (`620-730,365-382`), so it reads slightly floaty on the planks.

## Passes
- Zero Critical and zero Major defects. Restaurant otter holds its shell plate on an open paw (`705-770,285-320`), counter does not clip it. Pharmacy shrimp grips its bottle in both hands (`640-665,250-280`), counter clear. Hotel whale clear of desk. Hana jellyfish's tentacles dip into pool (`590-700,430-500`). Purple eyes with twin catchlights and blush on hana, otter, turtle and shrimp. No face pinholes or bright dots anywhere. Palms curved & multi-segment. Lagoon cliffs layered with foam rings. Interiors have wainscoting, pendant/sconce cones, stocked shelves, coastal plants.
