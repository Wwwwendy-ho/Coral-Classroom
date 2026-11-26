# Coral Classroom — Independent Adversarial Visual Critique (Iteration 10)

> **Auditor**: `adversarial-critic-v10`. I worked from visual evidence only: `rubric.md`, the MP8 refs `01–05`, the 11 live `1024×640` captures in `art_loop_iter10/`, and `proofs-v15` front/quarter for 9 cast members. I did not open any implementation code.
> **Target**: Weighted Average `>= 9.6` **AND** `0` Critical **AND** `0` Major.
> All coordinates are pixels in the `1024×640` frame, written `(x, y)` or `(x1–x2, y1–y2)`.

| Scope | Weighted Avg | Critical | Major | Minor | Verdict |
|---|---:|---:|---:|---:|---|
| **Full 11 (`01–11`)** | **`9.02 / 10`** (Iter 9: 7.81, `+1.21`) | **0** | **4** | **22** | **FAIL** (`-0.58` to 9.6, plus 4 Majors) |
| Cast eye audit (9 × front/quarter) | — | 0 | 0 | 7 (included above) | **Eye integration: PASS** |

Iteration 10 cleared all three Iter-9 Criticals: the procedural Bok, the empty quadrants in `09`/`10`, and the `?` block buried in Shelly's head. The game now clears the original `rubric.md` L6 bar (`>= 8.5`, `0` Critical). It does **not** yet clear the 9.6 / 0-Major bar.

---

## 1. Iter-9 Ticket Re-verification (visual)

| Iter-9 ticket | Status | Iter-10 evidence |
|---|---|---|
| CRIT-A Procedural Bok in `08`/`09` | **FIXED** | The authored teal-cap puffer is in `08` `(545–620, 505–585)` and `09` `(490–555, 170–230)`. No faceted fallback appears in any frame. |
| CRIT-B `?` block buried in Shelly's head (`10`/`11`) | **PARTIAL → Major M1** | Shelly's head and one eye now show to the right of the block. The block is still on Shelly's own tile, touching her, and it hides her left fore-flipper and the left half of her face. |
| CRIT-C Blank quadrants `09`/`10` | **FIXED** | `10` left half is dense coral and kelp. `09` lower-right now has the stone pool, Echo, crystals and the gold box. `08` right half is lily pads, reeds and sandbars. |
| I10-5 Harbor sailboat/ferry cropped | **PARTIAL** | Both sailboats are fully in frame. The ferry is still cut at `x=0` `(0–130, 195–290)` (Minor m4). |
| I10-6 Deck upper-right bare ocean | **OPEN (Minor m8)** | `(860–1024, 40–140)` is plain water behind the Travel pill. |
| I10-7 Captain Bay behind HUD (`06`) | **CHANGED** | Captain Bay is no longer behind the HUD. It is now **absent from the frame** (Minor m7). |
| I10-8 Hosts absent/unreadable | **PARTIAL → Major M3** | Mira (glasses turtle, `08` `(315–405, 490–560)`) and Echo (`09` `(640–760, 410–500)`) are in frame. Jisu is still a ~22 px speck (`11`). |
| I10-9 Bok on tile / clipping stall | **MOSTLY FIXED** | `11`: Bok is beside the stall and off the tiles. `10`: Bok still overlaps the gold tile's front-right rim (Minor m15). |
| I10-10 Lagoon craft | **PARTIAL → Major M4** | Reeds and lily pads are improved. The lean-to hut `(640–760, 440–600)` is still flat untextured slabs. |
| I10-11 Beach props | **FIXED** | Tide pools are rounded stone rings with cyan water and starfish. The clam is now an open, scalloped shell (it is too big: Minor m19). |
| Lighthouse right-edge sloop crop | **FIXED** | `07` sloop is fully inside `(895–1000, 240–400)`. |

---

## 2. Critical Gate (`rubric.md` L16–21)

| Rule | Count | Evidence |
|---|---:|---|
| L17 floating feet / floating held props | 0 | The Otter's clam platter is cupped in its paw `(690–745, 270–325)` in `03`. Swimmers hover consistently. |
| L18 UV pole pinch / bright dot on face | 0 | I found none in any live frame or in the 18 proofs. |
| L19 prop clipping into character face/body | 0 confirmed | Two contact/occlusion cases did not provably intersect, so they are logged as Major: **M1** (`?` block vs Shelly) and **M2** (shrimp vs planter). **Escalate either to Critical if a depth check shows interpenetration.** |
| L20 cone palm / procedural fallback blob | 0 | Every palm (`01`, `11`) has curved, multi-segment fronds. No fallback actors. The stacked-cone pines in `07` are not palms (Minor m11). |
| L21 empty quadrant | 0 | All 11 frames are framed on every side. |

---

## 3. Scene Scores (D1 Silhouette 25 · D2 Eyes/Surface 20 · D3 Grounding 20 · D4 Density 15 · D5 Craft 10 · D6 Runtime 10)

| # | Scene | D1 | D2 | D3 | D4 | D5 | D6 | **Weighted** | Main drag |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | Coral Cove | 9.3 | 9.3 | 9.0 | 9.5 | 9.0 | 9.6 | **9.270** | Crab hovering at the water/rock edge, faceted reef plates in the lower-right |
| 02 | Harbor Town | 9.0 | 9.0 | 8.2 | 9.4 | 8.8 | 9.6 | **8.940** | **M2** shrimp face in the planter, whale over the quay wall, boxy ferry |
| 03 | Restaurant | 9.2 | 9.4 | 9.5 | 9.2 | 9.3 | 9.6 | **9.350** | Template sameness with `04`/`05` |
| 04 | Hotel | 8.8 | 9.0 | 9.3 | 9.2 | 9.3 | 9.6 | **9.130** | Ball-silhouette whale with visible facet seams |
| 05 | Pharmacy | 9.2 | 9.3 | 9.2 | 9.3 | 9.4 | 9.6 | **9.295** | Shrimp tail fan reads as a flat white disc above the counter |
| 06 | Captain's Deck | 8.8 | 9.0 | 8.9 | 8.8 | 8.6 | 9.6 | **8.920** | Host absent, randomly scattered props with stain decals, helm wheel sunk into the deck |
| 07 | Lighthouse | 9.1 | 9.0 | 9.2 | 9.3 | 8.8 | 9.6 | **9.150** | Stacked-cone pines, pebble confetti, lighthouse bloom |
| 08 | Story Lagoon | 9.0 | 8.8 | 9.0 | 9.0 | 8.0 | 9.5 | **8.910** | **M4** slab hut, pancake-capped faceted cliffs |
| 09 | Echo Caves | 8.9 | 8.5 | 8.9 | 8.6 | 7.8 | 9.5 | **8.725** | **M4** gold box and ice kiosk primitives, monotone slate boulder field |
| 10 | Pattern Reef | 8.8 | 8.6 | 8.2 | 9.3 | 8.6 | 9.5 | **8.765** | **M1** `?` block on Shelly, Pip half behind a sea fan, repeated pancake corals |
| 11 | Bottle Beach | 8.6 | 8.8 | 8.3 | 9.3 | 9.0 | 9.5 | **8.815** | **M1** `?` block on Shelly, **M3** Jisu speck, oversized clam |
| | **11-scene mean** | 8.97 | 8.97 | 8.88 | 9.21 | 8.78 | 9.56 | **`9.025 → 9.02`** | |

D6 note: I can only judge runtime from what is on screen. There are no error overlays, no fallback pop-ins, and every authored GLB is resident in every frame. I could not verify the byte budgets.

---

## 4. Defects

### Critical — 0

### Major — 4

**M1 · `?` surprise block contacts and occludes Shelly on her own tile (`10`, `11`)**
- `10`: the block is at `(458–505, 425–480)`. Its right face touches Shelly's head/neck at `(500–515, 430–455)` and hides her left fore-flipper and the left half of her face.
- `11`: the block is at `(455–500, 425–475)` and hides her left flipper. The crab `(445–495, 465–500)` is wedged under the block, so the three overlap in one stack.
- MP8 hovers the dice block **above** the player's head, never at body height beside them.
- **Fix**: when the guide is on a surprise space, lift the block to `guideHeadY + ~0.9` above Shelly (MP8 style), or hide or offset it ≥ 1.2 units along camera-right. Keep the crab companion off the block's footprint.

**M2 · Pharmacy shrimp face-planted into the planter on the Harbor quay (`02`)**
- The shrimp is at `(365–420, 330–360)`. Its mouth/eye region rests on the top-left of the bush crown at `(405–420, 345–355)`.
- The right end of its white collar disappears **behind** the bush while its face sits **on top of** it. This mixed occlusion means the head is inside or right against the foliage. Its eye is hidden.
- Its abdomen is perched on the rope-fence post cap `(385–395, 355–365)`.
- **Fix**: move the shrimp ≥ 0.5 units off the planter and fence line, onto open quay paving or over the water, facing the camera so both eyes read.

**M3 · Jisu (Bottle Beach host) is unreadable (`11`)**
- The hermit crab at `(400–425, 405–430)` is about 22 px across, against Shelly's ~100 px.
- It sits 15 px below the "Open a letter" pill. The subtitle "Find Jisu…" points at a speck.
- **Fix**: raise the hermit-crab scale (~×1.5) and anchor the activity pill above the actor's bounds.

**M4 · Placeholder-grade primitive props next to the hero path (`08`, `09`)**
- `08` lean-to hut `(640–760, 440–600)`: flat untextured cream and teal slabs. The roof boards are misaligned and the posts are bare sticks. It is the weakest object in the frame, and it sits right beside Shelly.
- `09` gold box `(580–650, 490–605)`: a plain yellow box with an arched cutout and a slot.
- `09` ice kiosk `(570–645, 130–260)`: a translucent cube on a dark box with a flat slab umbrella.
- All three read as blockout geometry next to the plush cast.
- **Fix**: rebuild with bevelled planks, a scalloped canopy, hanging book banners and lanterns (lagoon). Turn the gold box into a crystal-lit echo-shell shrine. Turn the kiosk into a faceted geode stall with emissive shards.

### Minor — 22

| ID | Scene | Coordinates | Observation |
|---|---|---|---|
| m1 | 01 | `(560–640, 455–495)` | The crab sits at the water/rock seam with no contact shadow, so it reads as hovering on the water surface. |
| m2 | 01 | `(640–1024, 410–600)` | The reef cluster's purple cup corals and teal rocks are faceted low-poly plates, a step below the sculpted palm island at `(30–240, 380–600)`. |
| m3 | 02 | `(230–375, 455–545)` | The hotel whale hovers across the stone quay coping and the rope-fence line instead of over open water. |
| m4 | 02 | `(0–130, 195–290)` | The ferry is cut at `x=0` and built from stacked untextured boxes. |
| m5 | 02, 06, 07, 10, 11 | `(463–562, 540–575)` | The "Meet Bok" pill covers the shop tile beneath it in every board frame. |
| m6 | 03 / 04 / 05 | — | The interiors share an identical template: same window and lighthouse view, left plant, rug, counter, and valance with pendant lights. Vary the window view, rug shape and side props per venue. |
| m7 | 06 | — | The region host (Captain Bay) is not in frame. |
| m8 | 06 | `(860–1024, 40–140)` | Bare ocean sliver behind the Travel pill. |
| m9 | 06 | `(385–425, 345–450)` | The helm wheel stands edge-on on a short post, and its lower rim sinks into the deck planks. |
| m10 | 06 | Whole deck | Barrels, crates and rope coils are scattered on a uniform grid, each with a dark brown circular decal (e.g. `(250–310, 340–400)`, `(630–700, 410–460)`) that reads as stains rather than soft AO. |
| m11 | 07 | `(85–300, 160–470)` | Stacked-cone pines. Acceptable, but below the curved-frond standard. |
| m12 | 07 | Whole grass field | Dense octagonal pebble confetti adds noise and competes with the path read. |
| m13 | 07 | `(660–750, 60–130)` | Lighthouse lamp bloom blows out the lantern room. |
| m14 | 10 | `(620–690, 455–495)` | Pip is half-hidden behind a purple sea fan. |
| m15 | 10 | `(615–670, 210–265)` | Bok's left side overlaps the gold tile's front-right rim. |
| m16 | 10 | Whole frame | About 30 near-identical flat-topped orange "pancake" coral heads. Vary them with brain, table and branching lobed coral. |
| m17 | 09 | Whole floor | Monotone slate-on-slate palette. The ~12 near-identical smooth dark boulders read generic. |
| m18 | 09 | `(640–760, 410–500)` | Echo hovers diagonally over the stone pool ring rather than in the water. |
| m19 | 11 | `(555–660, 395–470)` | The open clam is larger than Shelly and overlaps her tile's right rim at `(560–570, 420–440)`. |
| m20 | 11 | `(0–230, 330–600)` | Sandbars show hard octagonal facet edges. The lamp post at `(950–1000, 385–470)` leans. |
| m21 | 04 | `(540–760, 130–320)` | The whale's head shows faint diagonal flat-shading facet seams across the sphere. The pure-ball silhouette weakens species read. |
| m22 | 05 | `(670–735, 330–345)` | The shrimp tail fan renders as a flat white disc floating just above the counter's back edge. |

---

## 5. Cast Eye-Integration Audit (`proofs-v15`, front + quarter)

**Verdict: PASS.** All 9 cast members have large iris / low sclera eyes with twin catchlights. Each eye sits in a soft socket with eyelid or brow shading. I found zero stuck-on marble domes, zero goggle seams on the eyes, and zero eye clipping.

| Character | Eyes | Notes (counted in Minors where marked) |
|---|---|---|
| restaurant-otter | ✅ Amber ~78% iris, twin catchlights, upper-lid crease, seated in the muzzle | Feet grounded and platter cupped. Best in cast. |
| pharmacy-shrimp | ✅ Red-brown ~80% iris with a soft lid ring, seated | The lower whisker-antennae rest on or graze the collar rim (front `(210–280, 310–320)`, quarter `(390–510, 465–520)` @3×). The upper antennae root cleanly below the cap brim. *(cast-minor, folded into m22's ticket)* |
| hotel-whale | ✅ Blue iris with brow line, seated in the side of the head | Flat paper-card tail flukes. Ball body (m21). |
| bok | ✅ Amber iris with a thin lid ring and upper-lid shadow from the cap | Quarter: the left suspender strap floats just outside the body silhouette `(125–150, 230–330)`. Both straps tuck under the cap brim. *(cast-minor)* |
| captain-bay | ✅ Blue iris under ivory brows, the visor clears both brows | Clean. |
| hana | ✅ Violet iris with pink brows, seated in the bell | The oral arms are grey and noisy ("dirty ribbon") against the pastel bell. *(cast-minor)* |
| taxi-squid | ✅ Brown iris with lids | The silhouette reads as an **octopus** (round mantle, 8 arms, no fins). *(cast-minor)* |
| friend-seal | ✅ Amber iris, seated, whiskers | Front fore-flippers are stiff straight sticks `(150–215, 380–460)`. *(cast-minor)* |
| subway-ray | ✅ Blue iris with lid ring, seated | The visor underside shows a dark band with white noise flecks. Front-on it reads like a toothy mouth `(300–345, 330–340)`. The cephalic lobes read as hollow open tubes. *(cast-minor)* |

---

## 6. Path to `10 / 10` (ranked)

1. **M1**: lift the `?` block above Shelly's head on surprise spaces, and keep the crab off its footprint. Worth about **+0.10** on `10`/`11`.
2. **M2**: move the Harbor shrimp clear of the planter and fence, with both eyes visible. Worth **+0.15** on `02`.
3. **M4**: rebuild the `08` hut and the `09` gold box and ice kiosk to the interior-craft standard. Worth **+0.25** on `08`/`09`.
4. **M3**: scale Jisu ×1.5 and lift the pill. Worth **+0.10** on `11`.
5. **`09` mood pass**: lighter cyan fog, 2–3 warm lantern pools, and fewer and more varied boulders (m17).
6. **`06` deck dressing**: put Captain Bay in frame, cluster the props into vignettes (cargo corner, rope station, helm on a pedestal), swap the stain decals for soft AO, and add an islet in the upper-right (m7–m10).
7. **Variety pass**: break up the interior template (m6), the `10` pancake coral (m16) and the `07` pebble confetti and pines (m11–m12).
8. **Cast polish**: shrimp antennae vs collar, Bok strap contact, Hana oral-arm tint, subway-ray visor texture and lobes, seal flippers, and whale facets and flukes.

Clearing M1–M4 and items 5–6 should lift the 11-scene mean to roughly **9.45–9.55**. Reaching ≥ 9.6 also needs the variety and polish passes (items 7–8).
