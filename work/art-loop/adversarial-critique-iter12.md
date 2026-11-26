# Adversarial Visual Critique — Iteration 12

**Critic:** `adversarial-critic-v12` (zero-context, visual evidence only, no code read)
**Evidence:** `rubric.md`; refs `refs/mp8/01-goomba-boardwalk.png` … `05-goomba-boardwalk-tiles.png` (the brief's `01.png`..`05.png` names don't exist; these are the actual files); 11 live 1024×640 shots in `art_loop_iter12/`; 10 close-ups in `cast-upgrade/proofs-v17/`. I checked suspect regions with 2–3× nearest-neighbour crops and sampled pixel values.

> D6 (Runtime Budget) is scored only on what the screenshots show: no missing assets, no fallback materials, no render glitches. I did not check GLB sizes or console errors, so D6 is provisional and capped at 9.0.

## Verdict

| | |
|---|---|
| **11-scene Weighted Average** | **8.67 / 10** (95.325 / 11 = 8.666) |
| Critical | **0** |
| Major | **9** |
| Minor | **15** |
| Pass bar (≥ 8.5 and 0 Critical) | **PASS** |

## Per-Scene Scores

| # | Scene | D1 25% | D2 20% | D3 20% | D4 15% | D5 10% | D6 10% | **Weighted** |
|---|---|---|---|---|---|---|---|---|
| 01 | Coral Cove | 9.0 | 8.5 | 8.5 | 8.5 | 7.5 | 9.0 | **8.58** |
| 02 | Harbor Town | 8.8 | 8.5 | 8.0 | 9.3 | 9.0 | 9.0 | **8.70** |
| 03 | Restaurant | 8.0 | 8.5 | 8.5 | 8.8 | 9.0 | 9.0 | **8.52** |
| 04 | Hotel | 9.0 | 9.0 | 8.8 | 9.0 | 9.0 | 9.0 | **8.96** |
| 05 | Pharmacy | 9.2 | 8.8 | 8.8 | 8.5 | 9.0 | 9.0 | **8.90** |
| 06 | Captain's Deck | 9.0 | 8.0 | 8.5 | 7.0 | 8.0 | 9.0 | **8.30** |
| 07 | Lighthouse | 9.0 | 8.0 | 8.3 | 8.7 | 7.5 | 9.0 | **8.47** |
| 08 | Lagoon | 9.0 | 8.5 | 8.8 | 9.2 | 8.3 | 9.0 | **8.82** |
| 09 | Caves | 9.0 | 8.5 | 8.3 | 8.3 | 8.7 | 9.0 | **8.63** |
| 10 | Patterns | 9.0 | 8.5 | 8.6 | 8.6 | 8.7 | 9.0 | **8.73** |
| 11 | Beach | 9.0 | 8.5 | 8.4 | 9.2 | 8.3 | 9.0 | **8.74** |
| | **Average** | | | | | | | **8.67** |

**Scenes below 8.5:** 06 Captain's Deck (8.30) and 07 Lighthouse (8.47). 03 Restaurant (8.52) only just clears the bar.

## Critical Defect Sweep (all clear)

| Rule | Result |
|---|---|
| Floating feet or floating held prop | None seen. **Not fully verifiable:** in 03 the otter's feet are hidden behind the counter (counter top y≈365). The proof shows feet planted, but there is no floor plane. The otter's plate rests on her paw (see m2). |
| UV pole pinch or bright dot on a face | None on any face at screenshot or proof resolution. The otter's nose highlight (proof 318,218) is ordinary specular, not a pinch. |
| Counter, shelf or prop clipping a character | No visible interpenetration. Near misses are logged as M6, M9 and m3. |
| Stiff cone palm or fallback blob | Palms in 01 and 11 have curved, multi-segment fronds. The drum rocks (M2) and the white orb (M4) are close to this rule; I logged them as Major. |
| Empty quadrant in gameplay camera | No quadrant is fully empty. 06 is the closest case (M1). |

## Major Defects (9)

| ID | Scene | Coordinates (px) | Defect | Dim |
|---|---|---|---|---|
| M1 | 06 | (640–1000, 380–600) and (520–880, 60–230) | A large area of bare deck planks. In the lower-right region luma SD is only 22.6, which is plank grain and nothing else. Nothing frames the walrus. The MP8 boardwalk refs (01/05) fill these areas with rocks and props. | D4 |
| M2 | 07, 11 | 07: (750–1000, 240–500); 11: (715–775, 125–180), (890–975, 150–225) | The sea rocks are smooth rounded drums with a flat orange patch. They have no facets or layering and no foam ring at the waterline, so they read as placeholder blobs, not the "layered foam-ringed cliffs" the rubric asks for. | D5 |
| M3 | 01 | Kelp (775–850, 390–470); star corals with a cyan dot at their centre (706, 470) and (916, 539); lavender rocks (700–810, 450–560) | The bottom-right reef cluster is low-craft. The kelp is flat single-plane spikes. Each purple star coral has a pole pinch with a bright cyan pinhole at its centre. The rocks are untextured blobs. | D5 |
| M4 | 01 | (400–445, 485–535) | A featureless white sphere, clipped to RGB 255,255,255 across its whole disc. It overlaps the rim of the next tile at (420, 535). If it is a pearl it needs shading; as it stands it reads as a fallback sphere. | D5/D3 |
| M5 | 03 + proof | Ears (600–615, 220) and (660–672, 220); body (600–700, 280–360) | The restaurant otter reads as a bear or hamster from the front: round top-mounted ears, a short muzzle, an upright pear body and no visible tail. The tail only shows in the quarter proof. This misses the "instant silhouette recognition / no upright egg clones" bar. | D1 |
| M6 | 02 | Whale (175–335, 360–415); fin on crate (270–300, 415–430) | The hotel whale hovers over the dock planks, not open water. Its pectoral fin dips onto the dock crate. A swimmer should be over the water band, which sits just left of x≈175. | D3 |
| M7 | 06, 07 | Walrus eyes (640, 330), (675, 330); Hana eyes (580, 475), (603, 488) | At board scale these eyes are black beads. No iris colour reads, so they fail the 72–80 % iris / twin-catchlight spec. Hana's violet iris shows clearly in her proof but is lost in game. | D2 |
| M8 | subway-ray proof | front (245, 345), (392, 345) | The face is unreadable from the front: the eyes sit tucked under the disc rim, there is no mouth and no blush. In the quarter view the cephalic fins (165–275, 345–375) read as stubby legs. | D2/D1 |
| M9 | 09, 10, 11 | 09: tail fin (320–335, 220–245) at the awning corner (335, 212); 10: tail (520–530, 150–175) touching a post (530, 145–180); 11: body (450–505, 185–225) covering the counter and leg (505, 170–215) | The vendor puffer, Bok, is wedged against the stall front in every board scene. No interpenetration is visible, but the silhouettes are tangent, so he reads as stuck inside the kiosk. | D3 |

## Minor Defects (15)

| ID | Scene | Coordinates (px) | Defect |
|---|---|---|---|
| m1 | 03 | (600–665, 255–280) | The otter's whiskers alias into stipple dots that look like freckles. |
| m2 | 03 + proof | 03 (690–720, 300–322); quarter proof (345–395, 330–365) | The clam plate sits on a flat paw with no fingers wrapping it. It is supported but not cupped. |
| m3 | 04 | (520–650, 355–362) | The whale's belly is about 4 px above the desk top. That near-tangent reads as resting on the desk. Only one catchlight is visible. |
| m4 | 05 | (720–1024, 420–640); cabinet (890–1024, 230–410) | Bare tile floor in the lower right, and the drawer cabinet is cut off by the frame edge. |
| m5 | 05 | (620, 228), (645, 232) | The shrimp's eyes in game are smaller and darker than in the proof, with weak catchlights. |
| m6 | 06 | (600–710, 300–400) | The walrus has no contact shadow, so its grounding is ambiguous. |
| m7 | 07 | (565–660, 425–525) | Hana crowds the turtle's tile and the "Read a sign" tooltip. |
| m8 | 07, 11 | 07 sail (790–850, 125–210); 11 sail (625–665, 95–160) | The sails are blown out to near-white with no cloth shading. |
| m9 | 07 proof (front/quarter) | bell seam (590–640, 425–460) in game; no mouth in proofs | A faint meridian seam on Hana's bell; she has no mouth; her oral arms (420–450, 450–550) look muddy grey-purple. |
| m10 | 08 | (545–640, 75–135) | A neon green emissive rim on the top of a mound, with bloom bleeding into the haze. |
| m11 | 08 | (50–290, 280–640) | The bush mounds with pink spheres are lumpy, with little leaf articulation. |
| m12 | 09 | (0–400, 470–640) | The lower-left cave floor is sparse grey with only scattered pebbles. |
| m13 | 10 | (0–105, 390–445) | Unexplained yellow stripes on the floor, like a crosswalk, with no clear prop meaning. |
| m14 | 02 | (0–30, 240–300) | The owl NPC is cut off at the left edge of the frame. |
| m15 | taxi-squid proof | arms (90–560, 470–640) | The silhouette reads as an octopus: 8 equal curled arms, no 2 long feeding tentacles, and an egg-shaped mantle. The cap brim also casts a heavy shadow on the forehead (220–420, 210–250). Separately, every proof shows Cycles grain (e.g. otter belly 300–400, 420–540), which makes the matte-satin finish hard to judge. |

## Close-Up Notes (proofs-v17)

| Character | Verdict |
|---|---|
| pharmacy-shrimp | Strongest of the five. Big glossy irises with twin catchlights, rosy blush, clear segmentation in the quarter view, appealing curl. |
| subway-ray | Weakest. See M8. |
| hana | Very appealing bell and eyes, with good brow acting. Needs a mouth and cleaner oral-arm shading (m9). |
| restaurant-otter | Excellent eyes and blush. Species read is weak (M5) and the prop grip is soft (m2). |
| taxi-squid | Charming face and checker cap. Species read is ambiguous (m15). |

## Remaining 10/10 Polish Items

1. **06 deck dressing:** add coiled rope, cannons, a lifebuoy, a hatch, crates and a deck lantern in (640–1000, 380–600) and (520–880, 60–230).
2. **Rocks:** replace the drum rocks in 07 and 11 with faceted, stacked cliff rocks that have a foam ring at the waterline.
3. **01 reef cluster:** use curved multi-segment kelp, remove the star-coral pole pinhole, and give the rocks surface breakup.
4. **01 white orb:** shade it like a pearl with a sheen gradient, or remove it, and clear it off the tile rim.
5. **Otter:** strengthen the otter read with a longer muzzle, low side-set ears, a sleeker neck and the tail visible from the front. Curl the fingers around the plate.
6. **Eyes at board scale:** raise iris luminance and contrast for the walrus, Hana and the shrimp so the colour survives at board size.
7. **Hotel whale:** move it over the water band (x < 175) and keep its fins off the dock.
8. **Bok:** offset him about 0.3 units from the stall front in 09, 10 and 11.
9. **Subway-ray:** move the eyes up onto the disc face, add a mouth and blush, and reduce the leg-like cephalic fins.
10. **Small fixes:** add a whisker line width or min-alpha, add contact shadows for grounded NPCs, tone-map the sails, tame the 08 green emissive, and add a few props to the 05 floor and the 09 lower-left floor.
11. **Re-render proofs** with more samples or denoising so the surface finish can be judged.
