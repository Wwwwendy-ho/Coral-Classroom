# Adversarial Critique — Iteration 25 (`9.49 / 10`)

- **Critic**: `adversarial-critic-v25` (`#263`, `claude-opus-5-5-high`)
- **Weighted Average**: `9.49 / 10`
- **Severity Counts**: `CRITICAL: 0 | MAJOR: 1 | MINOR: 5`
- **Verdict**: `PASS` on rubric bar (`>=8.5`); misses `9.8 / 0-Major` target due to `M1` (`hotel-whale` tail)

## Dimension Scores
- **D1 Silhouette**: `9.2`
- **D2 Eyes/Face**: `9.6`
- **D3 Grounding**: `9.6`
- **D4 Density**: `9.4`
- **D5 Craft**: `9.4`
- **D6 Runtime**: `10.0` (telemetry accepted)

## Scene Scores
- `intro-desktop`: `9.6` | `intro-mobile`: `9.5` | `coral-cove`: `9.6` | `harbor`: `9.3` | `restaurant`: `9.6` | `hotel`: `9.0` | `pharmacy`: `9.7` | `captains-deck`: `9.3` | `lighthouse`: `9.6` | `lagoon`: `9.5` | `caves`: `9.4` | `patterns`: `9.6` | `beach`: `9.4`

## Findings
### MAJOR
- **M1**. `hotel-whale` doesn't read as a whale: `04-hotel.png` tail reads as a thin tapered tube at `(640-920, 225-275)` (`~2x` head/body length, edge-on); `proofs-v30/quarter.png` shows the same tube tail; `front.png` shows 4 matching wing-like fins. Fix: shorten peduncle to `~0.8×` body length, thicken base, add wide plump horizontal tail flukes + soft dorsal hump, and bank/yaw slightly in `04-hotel` so both fluke lobes & V-notch read clearly!

### MINOR
- **m1**. `02-harbor-town`: `hotel-whale` cut off by `"Ask Shelly"` pill `(10-130, 585-630)` and `x=0` edge (`body bbox 35-220, 455-610`), rolled pose turns bellhop hat into side "earmuff" `(145-180, 505-545)`. Fix `hotel-whale` harbor placement/yaw/roll in `region-people.js`!
- **m2**. `06-captains-deck`: bare plank zone at `(290-460, 470-610)` next to Shelly's path. Add a small non-clipping deck vignette cluster.
- **m3**. `11-beach`: umbrella pole/lounger reads as a chunky upright brown slab at `(615-670, 525-600)` instead of a slim pole. Refine lounger/umbrella separation & slimness.
- **m4**. `09-caves`: Echo `(265-430, 170-245)` is white-on-grey with low value contrast against cave floor. Deepen cave floor/slate pool contrast under Echo.
- **m5**. `03-restaurant`: bread tray sits on the floor at `(100-220, 555-612)` (counter/table item on floor). Replace with a floor-appropriate potted Mediterranean olive/lemon tree or menu chalkboard!

## Passes
- Zero floating grounded actors; held props gripped properly (`otter` plate, `shrimp` bottle, `jisu` quill); zero counter/face clipping; swimmers hover `15-25px` above counters; all 10 cast have large-iris eyes (`72-80%`) with twin catchlights & rosy cheeks; zero UV pole pinholes at 3x zoom; curved multi-frond palms; lobed foliage; stocked interiors with wainscoting & pendant cones; zero blank quadrants; Menu closed & HUD clean; mobile intro fits without overflow.
