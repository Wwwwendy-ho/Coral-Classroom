# Adversarial Critique — Iteration 27 (MP8 Overhaul)

**Model**: `claude-opus-5-5-high` (zero-context)
**Weighted Total**: **7.92 / 10** (`D1: 8.0 · D2: 8.3 · D3: 7.6 · D4: 7.8 · D5: 8.2 · D6: 7.5`)
**Verdict**: FAIL (below 8.5 / 9.8 target)
**Counts**: `CRIT: 0 · MAJ: 7 · MIN: 14`

## MP8 Overhaul Pillars
1. **Follow Cam**: PASS (mostly) — `02/06/08/09/10/11` sit at ~28–34° pitch, showing 5–7 spaces ahead with horizon/sky (`06`, `08–11`) or tall buildings (`02`).
2. **HUD**: PASS — Clean 2-corner HUD (top-left location/shells/pearls pill, top-right Dice/Map/Menu); zero idle purple labels, zero "Meet ..." pill, Menu closed on all 13 captures.
3. **Lighthouse Rotunda (`07-lighthouse.png`)**: FAIL — Arched ocean windows present, but walkway reads too flat from initial camera angle, Hana is low, Bok is distant/small, and floor has heavy shadow acne/banding (`MAJ 1–3, 7`).
4. **Living Eyes & Whale Silhouette**: PARTIAL — Unified single-sun catchlights, warm cream sclera, and blush present; `hotel-whale` tail silhouette still reads as a single flat paddle in side/quarter views (`MAJ 4`).

## Major Issues (`MAJ: 7`)
1. `07-lighthouse` floor `(0–420, 330–640)`: heavy horizontal shadow acne/banding streaks.
2. `07-lighthouse` walkway `(180–1000, 230–640)`: reads as flat ring boardwalk from current camera angle; needs steeper visible helical rise and inward framing toward central beacon.
3. `07-lighthouse`: Hana sits at floor-level pedestal `(480,480)` and Bok is distant/tiny; elevate/frame spiral landings cleanly inside follow-cam frustum.
4. `hotel-whale` `quarter.png` & `04-hotel`: tail reads as one thin straight paddle without visible bilobed horizontal fluke & dorsal hump in profile/quarter.
5. Pink crab companion (`Kiko`) cut off at bottom frame edge across `01, 02, 06, 08, 09, 10, 11`.
6. `09-caves`: Echo (`230–400, 220–340`) floats over dry cave floor without grotto water cue/contact shadow directly beneath her.
7. `07-lighthouse` lower-left `(0–380, 320–640)`: empty floor + acne + occluding pillar.

## Minor Issues (`MIN: 14`)
1. `07`: stray red/blue lines on floor `(0–80, 375–420)`.
2. `07`: foreground column `(60–160, 0–640)` blocks left 15% of frame.
3. `07`: sunbeams read as bloom haze `(150–300, 150–260)` rather than defined shafts.
4. `06` & `09`: DoF-blurred `?` blocks read as dark floating crates.
5. `06`: palms beyond rail appear to stand in open ocean without sand islets.
6. `08/09/10/11`: flat mint haze sky with 1 small cloud; needs richer blue gradient + 3–5 cumulus clouds.
7. `01`: dark navy object clipped at top-right edge `(1012–1024, 30–65)` behind Menu button.
8. `09`: foreground prop `(680–770, 540–640)` and tile ring `(300–620, 560–640)` clip near plane.
9. `echo/front.png`: front view lacks subtle muzzle/nose/whisker dots.
10. `hotel-whale`: enlarge iris slightly toward 72% target and deepen upper-lid crease.
11. `10-patterns`: distant teal domes lack ledges/foam rings/foliage.
12. `08-lagoon`: left cliff faceted; Bok near rock/dock edge.
13. `jisu/front.png`: close claw cleanly around quill shaft.
14. `01`: foreground `?` block `(80–220, 410–545)` oversized (`0.6x` or higher float).
