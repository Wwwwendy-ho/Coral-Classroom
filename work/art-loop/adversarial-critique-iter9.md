# Coral Classroom — Independent Adversarial Art Director Critique (Iteration 9)

> **Auditor**: `adversarial-critic-v9` (zero-context, read-only)
> **User target**: `>= 9.6 / 10` Weighted Average **AND** `0` Critical **AND** `0` Major defects across the entire game.
>
> | Scope | Weighted Avg | Critical | Major | vs. `9.6` target |
> |---|---:|---:|---:|---|
> | **Core 7 (`01–07`)** | **`8.84 / 10`** (Iter 8: 8.76, `+0.08`) | **0** | **3** | **FAIL** (`-0.76`) |
> | **Outer 4 (`08–11`)** | **`6.02 / 10`** | **3** | **5** | **FAIL** (`-3.58`) |
> | **Full 11 (`01–11`)** | **`7.81 / 10`** | **3** | **8** (distinct, `I10-5…I10-12`) | **FAIL** (`-1.79`) |
>
> Core 7 still clears the original `rubric.md` L6 bar (`>= 8.5`, `0` Critical). The full game does **not**: the 4 outer regions trip **3** automatic-fail Critical rules (`rubric.md` L19, L20, L21).

> [!IMPORTANT]
> **Iteration 9 core work did not change the two headline framing defects on screen.** `region-scenery.js` was edited (L1086, L1093, L1944) and the edits are **in the shipped bundle** (`game/index.html` rebuilt 22:22:21, contains `if(bx<=cx+2.8) return;` @ L29925 and the new islet trio @ L30783). The screenshots were captured *after* that (22:23–22:25), yet `02` and `06` look the same as Iter 8 in those regions. Both fixes used world axes (`+X`, `sb.minZ`) that do not map to the screen the way the fix assumed. **`MAJOR-1` and `MAJOR-2` are still open.**

> [!NOTE]
> **Capture note**: All 11 iter-9 PNGs are **`1024×640`**, not the `1280×800` the brief states (checked with `System.Drawing`). All screen coordinates below are percentages of the actual frame.

---

## 1. Iteration 8 Defect Verification (`MAJOR-1`, `MAJOR-2`, `MINOR-1..5`)

| Iter 8 ID | Status | Evidence |
|---|---|---|
| **MAJOR-1** Harbor yellow sailboat cropped at `x=0` | **FAIL** | `02-harbor-town.png` yellow hull is still at **`x 0–6.3%, y 33–45%`**, ~30% cut off at the left edge. It matches Iter 8 to the pixel. Code changed: `region-scenery.js` L1086 `if(bx<=cx+2.8) return;` and L1093 fallback list `[[cx+3.4,cz-2.2],…]` with a `pt[0]>cx+2.5` guard (L1094). In the Harbor camera, world `+X` relative to the ferry centre `cx` does **not** mean screen-right, so the guard filters the wrong axis. The big white/red **ferry** (L1047–1065, `cx,cz`) is **also cropped at `x=0`** (`x 0–14%, y 55–75%`). |
| **MAJOR-2** Captain's Deck upper-right islet + sloop | **FAIL** | `06-captains-deck.png` upper-right ocean (`x 85–100%, y 0–40%`) is still plain water, with no islet, buoy or boat. The trio moved to `[[sb.maxX+2.2,sb.minZ+2.0],[sb.maxX+2.0,sb.minZ-1.6],[sb.maxX+3.2,cz-1.5]]` (L1944). However, `sb.minZ` is the bow, which sits **above the top of the frame**: the visible deck window is only ~14×18 units around Shelly, not the whole hull. Also, `shipWaterClear()` (L1946) **silently returns** when it rejects a spot, so nothing logs the miss. |
| **MINOR-1** Captain Bay visor hides left brow | **PASS** | `build_supporting_hosts.py` L341 roll is now `+.018*(2*u-1)` and the base is raised to `2.210`. In `proofs-v12/captain-bay/front.png` both ivory brows read symmetrically under a level visor with no eye clipping. The rebuilt `captain-bay.glb` (22:21) is served at `?v=mp-14` (`resident-models.js` L14). |
| **MINOR-2** Hard octagonal contact patches / chest margin | **PASS** | `contact()` L598–606 is now a 16-gon with captain centre shade `.80`. The chest moved to `cargoChest(cx-1.95,-.12,cz+1.55)` (L1867), and `06` shows a clear gap to the compass rose (`x 10–16%, y 69–78%`). |
| **MINOR-3** Geometric oval caustics | **PASS (subtle)** | L521 now varies the aspect (`1.0+(ri%10)*.1`) and rotation, and L527–532 add secondary arcs. On screen it is still dominated by closed ellipses, so this stays open as an Iter 10 nice-to-have, not a defect. |
| **MINOR-4** Lighthouse right-edge sailboat crop | **FAIL** | `07-lighthouse.png` sloop is still cropped at **`x 95–100%, y 42–58%`**. `region-scenery.js` L1592–1633 is unchanged. |
| **MINOR-5** Cache-bust query hygiene | **PASS** | `resident-models.js` L15 / L17 now use `?v=mp-11` for `restaurant-otter` and `pharmacy-shrimp`. |

**Score: 4/7 resolved.** Both Majors and `MINOR-4` carry into Iteration 10.

---

## 2. Critical Defect Gate (`rubric.md` L16–21), All 11 Scenes

| Rule | Core 7 | Outer 4 | Evidence |
|---|---|---|---|
| L17 floating feet / props | 0 | 0 | Otter and its clam platter are grounded and cupped (`03`). Shelly and Kiko are grounded. Swimmers hover naturally. |
| L18 UV pole pinch on face | 0 | 0 | No new face pinholes in `proofs-v12` or the interiors. |
| **L19 prop clipping into a character face/body** | 0 | **1 — CRIT-B** | **The `?` surprise block is buried in Shelly's head** in `10-patterns.png` (`x 45–49%, y 67–75%`) and `11-beach.png` (`x 45–49%, y 66–74%`). `board.js` L957–960 parks a block at `REEF3D_QY` over every surprise space and never lifts it when the guide stands on that space. Shelly's face is completely hidden in both frames. |
| **L20 cone palm / procedural fallback blob** | 0 | **1 — CRIT-A** | **Procedural low-poly Bok in settled screenshots**: `08-lagoon.png` (`x 50–56%, y 62–71%`) and `09-caves.png` (`x 47–54%, y 45–55%`). This is the `SphereGeometry(r,12,8)` actor from `region-people.js` L317–333: faceted yellow ball, flat white eye discs, orange cheek ball, and a dark `colors[2]` box/cylinder cap. Compare the authored `bok.glb` (smooth, teal cap) in `10`/`11`. Cause: Iter 9 added host-first ordering for the single fetch slot (`resident-models.js` L259–266). The shopkeeper now always loads last, so the screenshot was taken before Bok swapped in. In `08` the fallback also overlaps Shelly's shell and head. |
| **L21 empty/blank quadrant** | 0 | **1 — CRIT-C (2 scenes)** | **`10-patterns.png`**: lower-left quadrant ≈ 75% bare flat sea-green floor (one starfish and one teal mound with two bare cream pillars); the upper-left is similar. **`09-caves.png`**: lower-right quadrant is a featureless grey floor, one giant pale octagonal slab (`x 55–67%, y 73–100%`), one 5-sided cone crystal and plain slate water. The right half is otherwise just two huge dark boulders. |

**Total: Core 7 = `0` Critical; Full 11 = `3` Critical (A, B, C).**

---

## 3. Rubric Scoring

### 3a. Core 7 (`01–07`)

| # | Dimension | Wt | Iter 8 | **Iter 9** | Weighted | Justification |
|---|---|---:|---:|---:|---:|---|
| 1 | Silhouette & Species Appeal | 25% | 8.7 | **8.8** | 2.200 | +0.1 for the symmetric Captain Bay visor/brows (`proofs-v12`). Held back by Otter's cylindrical lower torso (`03`) and Captain Bay, the region host, cut by the frame edge and hidden behind the shells HUD pill in `06` (`x 0–4%, y 4–14%`). |
| 2 | Eyes, Face & Surface | 20% | 8.7 | **8.8** | 1.760 | Both brows are now clear. Harbor water gained secondary arcs. Held back by still-ovular caustics (`02`), a bloom-blown featureless glowing ovoid on the path in `02` (`x 34–36%, y 15–19%`) and `06` (`x 48–53%, y 44–53%`), and stacked-cone pines (`07`). |
| 3 | Anatomical & Spatial Grounding | 20% | 8.8 | **8.9** | 1.780 | Chest/compass margin fixed (`06`). Interiors are clean. Held back by the host walrus partly behind the HUD (`06`). |
| 4 | Camera-Band Diorama Density | 15% | 8.2 | **8.2** | 1.230 | **No visible change**: yellow sailboat and ferry still cropped at `x=0` (`02`), upper-right ocean still bare (`06`), right-edge sloop still cropped (`07`), and `07` lower-right (`x 65–100%, y 60–100%`) is thin grass plus a pale cliff/foam strip. |
| 5 | Sculpted Craft & Detail | 10% | 8.7 | **8.8** | 0.880 | Contact patches are now soft 16-gons. Interiors (`03–05`) and Coral Cove (`01`) remain best-in-game. |
| 6 | Runtime Budget & Stability | 10% | 9.8 | **9.9** | 0.990 | All 39/39 GLBs are `M=1 P=1 MAT=1` and the cache-bust is fixed. `-0.1` for unused legacy `shelly.glb` (3,045 KB) and `shelly-view.glb`. |
| | **CORE-7 TOTAL** | | 8.76 | **8.84** | **8.840** | **`0` Critical, `3` Major. Short of 9.6 by 0.76.** |

Per-scene: `01` **9.1** · `02` **8.7** · `03` **9.0** · `04` **9.0** · `05` **9.0** · `06` **8.6** · `07` **8.5**.

### 3b. Outer 4 (`08` Story Lagoon, `09` Echo Caves, `10` Pattern Reef, `11` Bottle Beach)

| # | Dimension | Wt | **Score** | Weighted | Justification |
|---|---|---:|---:|---:|---|
| 1 | Silhouette & Species Appeal | 25% | **6.0** | 1.500 | Bok GLB reads well in `10`/`11`. However: procedural Bok in `08`/`09`. Hosts **Mira (`08`) and Echo (`09`) are not in frame at all**, even though the region subtitles promise them. **Jisu is ~25 px tall** (`11`, `x 39–42%, y 63–67%`) because `REGION_PERSON_SCALE['hermit crab']=.40` (`region-people.js` L133), and its older photoreal navy-banded legs clash with the plush cast. **Pip** (`10`, `x 57–63%, y 82–89%`) is half under the "Build a sentence" pill. |
| 2 | Eyes, Face & Surface | 20% | **5.8** | 1.160 | Fallback Bok has flat faceted spheres for eyes. Shelly's face is hidden by the `?` block (`10`, `11`). The scenery is flat-shaded low-segment `organicRock` octagons with pancake moss caps (`08`). The cave palette is muddy slate (`09`). |
| 3 | Anatomical & Spatial Grounding | 20% | **5.2** | 1.040 | The `?` block clips through Shelly (`10`, `11`). **Bok GLB stands on a board tile** (`11`, red-ring space at `x 41–49%, y 37–44%`) and its fin clips the stall counter (`10`, `x 63–69%, y 31–39%`). Fallback Bok overlaps Shelly (`08`). |
| 4 | Camera-Band Diorama Density | 15% | **5.5** | 0.825 | Blank left half in `10` (Critical). Blank lower-right and right half in `09` (Critical). `08` right half (`x 60–100%, y 15–70%`) is empty teal water apart from one sandbar. `11` is acceptable. |
| 5 | Sculpted Craft & Detail | 10% | **5.6** | 0.560 | Crystals are single 5-gon cones. Reeds are 5-sided sticks with cylinder cattails. Coral is pastel cylinder tubes. Stalls are primitive boxes. Pattern Reef ruins are bare cream cylinders and blocks. Bottle Beach sandbars carry dark flat grey stone discs that read as holes, plus a featureless cream clam puck beside Shelly (`x 55–64%, y 62–74%`). Beach palms are the only MP8-grade foliage. |
| 6 | Runtime Budget & Stability | 10% | **9.3** | 0.930 | Budgets pass, but swap-in latency is visible: the procedural fallback is still showing in 2/4 settled captures. |
| | **OUTER-4 TOTAL** | | **6.02** | **6.015** | **`3` Critical, `5` Major.** |

Per-scene: `08` **6.0** · `09` **5.3** · `10` **5.8** · `11` **7.0**.

### 3c. Full 11 (scene-weighted: 7/11 core + 4/11 outer)

| Dim | D1 | D2 | D3 | D4 | D5 | D6 | **Weighted** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Full-11 | 7.78 | 7.71 | 7.55 | 7.22 | 7.64 | 9.68 | **`7.81 / 10`** |

---

## 4. GLB Budget & Topology Audit (`game/assets/models/`, parsed from glTF JSON)

- **39/39 files: `M=1, P=1, MAT=1`** (1 draw call each).
- **Board max**: `mira.glb` **624.22 KB** (< 650; only 4% headroom). **Close max**: `crafted-shelly.glb` 1,395.91 KB, `cafe-seahorse-close.glb` 1,394.71 KB, `mira-close.glb` 1,354.78 KB (all < 1,433.6).
- **Rebuilt in Iter 9**: only `captain-bay.glb` (414.10 KB, V=4,614) and `captain-bay-close.glb` (988.22 KB, V=11,267), timestamped 22:21.
- **Remaining cast with no modern proof** (no `proofs-v9..v12` folder; built 11-22/23 on the older pipeline): `taxi-squid` (450.32 / 924.12 KB), `mira` (624.22 / 1,354.78), `pip` (450.47 / 1,181.63), `echo` (349.67 / 867.35), `jisu` (403.66 / 962.85).
- Single-slot `regionResidentInFlight` serialization (`resident-models.js` L41, L85–88) is preserved. This is an intentional tested invariant (`region_resident_cast_test.js` L72–82), **not a defect**. The tickets below keep it.

---

## 5. Ranked Iteration 10 Defect Tickets

### P0 — Critical (automatic fail)

**I10-1 [CRIT-A] Procedural Bok visible in settled frames (`08`, `09`)**
- `resident-models.js` L259–266: strict host-first order puts the shopkeeper last, and L275 starts a request only within 26 units. Keep the single slot, but **order the queue by on-screen visibility first, then distance to the guide** (host breaks ties). Use the same NDC test as L281–283 so whichever resident is in the camera claims the slot first.
- `region-people.js` L317–333: replace the 12×8 faceted proxy with a smooth stand-in that matches `bok.glb`: 32×24 segments, teal `#3fa9b5` cap and overalls instead of the region-dark `colors[2]` box (L329–330), and real iris/catchlight discs.
- Art-loop harness: add a settle gate before each capture (every `regionResidentStates(view)` entry with `seen` must have `state.root && state.detailed`).
- **Done when** `08` and `09` show the authored Bok GLB.

**I10-2 [CRIT-B] `?` block buried in Shelly's head (`10`, `11`)**
- `board.js` L957–960 (`qb.position.set(s.x, REEF3D_QY+(s.y||0), s.z)`): when the guide occupies the space (`view.at === s.i`), ease `qb.position.y` to `guideTop + 0.75` (MP8 hover-above-head), or shrink and fade it to 0. Restore it when she leaves. The guide's top is available from `view.guide` bounds.
- **Done when** Shelly's whole face is visible with ≥ 0.3 units of clearance under the block.

**I10-3 [CRIT-C] Pattern Reef blank left half (`10`)**
- `region-scenery.js` L1278–1280 places `garden()` only at `placed(s,1,5.6,…)` on every 3rd space. Add a mirrored `placed(s,-1,5.8,±1.2,…)` garden on `i%3===1`. Add a mid-band (dist 7–9) of kelp forests, anemone clusters and brain coral on side `-1`.
- Theme the floor: sentence-tile mosaic / sand-ripple decals.
- L1294–1301 "temple columns" are bare cream cylinders and caps: encrust them with coral, moss and barnacles and arch them (torus lintel), or swap them for coral-arch gateways.
- **Done when** all 4 quadrants have ≤ 35% bare floor.

**I10-4 [CRIT-C] Echo Caves blank lower-right and oppressive boulders (`09`)**
- L1244–1247 `organicRock(wx,-.8,wz,3.2,4.2–6.6,2.9)` places ~6-unit dark boulders at 9.2 that dominate the right half: cut to ≤ 3.5 tall within 10 units of the camera band.
- Fill the lower-right band (dist 4.6–7, both sides) with glowing crystal geodes, bioluminescent mushroom clusters, mineral tidepools (reuse L1252–1256) and echo-shell lanterns.
- `crystal()` L72–75 (`cyl(0,.43,1.8,5)` + `cone(.23,.72,5)`): rebuild as a 3–5-shard cluster of beveled hex prisms with pointed caps and an emissive inner core.
- Lift the fog (L1218 `#83b5c9` → lighter cyan, near 24) and add 2–3 warm lantern pools to break the slate monotony.

### P1 — Major

**I10-5 Harbor yellow sailboat + ferry cropped at `x=0` (`02`)**
- `region-scenery.js` L1068–1095: the world-`X` guard (L1086, L1094) is axis-wrong. Replace it with a **camera-space guard**: project `(bx,−.5,bz)` through `view.cam` (or the region camera's right vector from `frame(main[0])`) and reject NDC `x < −0.80`. Do the same for the ferry at L1047 (`cx,cz`) by shifting it along camera-right until its hull projects inside `x ≥ 4%`.
- **Done when** all 3 moored sailboats and the ferry are 100% inside the frame.

**I10-6 Captain's Deck upper-right islet/sloop off-frame (`06`)**
- L1944: anchor to Space 0 / guide Z, not `sb.minZ`: islet `[sb.maxX+2.4, s0.z−5.5]`, buoy `[sb.maxX+2.0, s0.z−8.5]`, boat `[sb.maxX+3.6, s0.z−2.0]`.
- L1946 silent reject: retry at pad 1.4 / outerPad 2.2 and `console.warn` on final rejection.
- **Done when** the palm islet projects into `x 86–97%, y 14–38%`, clear of the Travel pill.

**I10-7 Captain Bay (host) hidden behind HUD (`06`, `x 0–4%`)**
- `region-people.js` L611 `regionPeoplePlacement()` (L151–166) searches only ±X. Add a camera-visibility term: penalise NDC `|x|>0.70` or `y>0.55`, and the HUD pill rects. Also add Z-offset candidates.

**I10-8 Outer hosts unreadable or absent**
- Mira (`08`) and Echo (`09`) are not in frame: apply the I10-7 placement scoring.
- Jisu: `REGION_PERSON_SCALE['hermit crab']` `.40` → `.62` (L133).
- Pip and Jisu are covered by activity pills: offset the anchor of the `practice` label (L621) above the actor's bounds top.

**I10-9 Bok GLB on a board tile / clipping its stall (`10`, `11`)**
- `region-people.js` L291–293 / L318 (`shop.x+side*2.72, shop.z+.58`) with `fixedPos:true` (`resident-models.js` L74) bypasses tile clearance. Run the actor through a clearance check: min tile distance ≥ `radius+1.25`, ≥ 0.35 from the stall counter box. Place Bok **in front of** the stall along camera-forward, not along world X.

**I10-10 Story Lagoon craft & density (`08`)**
- L1106–1109 `reeds()` (5-sided sticks + cylinder cattails): curved tapered 3-segment reeds with rounded bulrush heads.
- L1125 `coral()` pastel tubes: branching rounded coral with lobed tips.
- L1129–1132 bare post+beam gate: storybook arch with hanging book banners and lanterns.
- L1136 `cone(2.2,1.2,8)` canopy: scalloped fabric canopy.
- L1179 `stylizedCliff` pancake moss caps: multi-lobed rounded foliage.
- Fill the right-half water (+side, dist 6–11) with lily-pad clusters (L1161 `lotusPad`), a reading-pavilion islet and floating lanterns.

**I10-11 Bottle Beach props (`11`)**
- L1377–1378: flat grey `organicRock(…'#8f9c99')` plus a flat cyan cylinder reads as dark holes. Replace with rounded tide-pool rocks: foam rim, glossy water and a crab or starfish inside.
- Cream clam puck beside Shelly: deck prop `clam` (`board.js` L962–966, beach set): open scalloped clam with a pearl, or scale ≤ 0.7.
- Make `bottle()` (L1322–1327) readable (×1.4, cork, rolled letter) on 2–3 near-path sandbars.

**I10-12 Remaining cast to the v11/v12 plush standard**
- Rebuild **`taxi-squid`, `mira`, `pip`, `echo`, `jisu`** with `game/tools/art/build_mira.py`, `build_echo_pip.py`, `build_jisu.py` and the taxi builder, matching the `build_supporting_hosts.py` v12 look:
  - 72–80% glossy iris with twin catchlights, roughness .80–.88, rosy blush
  - plush proportions; Jisu's photoreal navy banded legs → soft rounded plush legs
- Emit `proofs-v13/{taxi-squid,mira,pip,echo,jisu}/{front,quarter}.png`.
- Keep board < 650 KB (watch `mira`: 624 KB now) and close < 1,433.6 KB.
- Bump `?v=` (`resident-models.js` L5, L8, L10–12).

### P2 — Minor

- **I10-13** Lighthouse right-edge sloop crop: `region-scenery.js` L1595 boat `dist 15.2 → 12.6`, or L1619 `13.8+(li%4)*1.5` capped at 13.0. Furnish the `07` lower-right with flower beds, a bench and tidepools near Hana.
- **I10-14** Glowing featureless ovoid on the path (`02` `x 34–36% y 15–19%`; `06` `x 48–53% y 44–53%`), new vs. Iter 8. Identify it (likely a closed clam/pearl prop, `board.js` L318–321), cut emissive/bloom and add scallop ridges.
- **I10-15** Duplicate "Meet Bok" pills (`region-people.js` L618 world label + L628 HUD guide) both visible in `08`/`09`: hide the guide while the world label is on screen.
- **I10-16** Capture harness: frames are `1024×640`, not `1280×800`. Fix the viewport/DPR and add the I10-1 settle gate.
- **I10-17** Delete or archive unused legacy `shelly.glb` / `shelly-view.glb`.

---

## 6. Path to `>= 9.6 / 10` with `0` Critical / `0` Major

- **I10-1 … I10-4** are enough to clear the Critical gate.
- **I10-5 … I10-12** are needed for 0 Major. Expected scores:
  - Core 7: ≈ **9.2**, from D4 8.2 → 9.3 (I10-5/6/7/13) and D1/D3 +0.2 (I10-7).
  - Outer 4: ≈ **8.6–8.9** after I10-1…12.
  - Full-11: ≈ **9.0**.
- **Reaching 9.6 needs a second pass after that**: every outer region taken to `01-coral-cove.png` density and craft, plus the 5 legacy cast rebuilt to `proofs-v12` quality. Realistically that is Iteration 11.

**VERDICT: `FAIL` against the user target.** Core 7 = `8.84` (0 Critical / 3 Major). Full 11 = `7.81` (3 Critical / 8 Major).

