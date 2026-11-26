# Adversarial Critique — Iteration 33 (Rubric v2.0)

- **Reviewer**: `adversarial-critic-v33` (`claude-opus-5-5-high`)
- **Evidence Reviewed**: `art_loop_iter33/` (20 PNGs) + `work/cast-upgrade/proofs-v38/{kiko-hermit,kiko-mochi,jisu}/{front,quarter,side}.png` + runtime/test verification logs
- **Rubric**: `work/art-loop/rubric.md` (v2.0)

## Scores
- **D1 — Visual & Cast Cohesion (20%)**: `8.4`
- **D2 — Fantastical Region Identity Beyond MP8 (25%)**: `8.3`
- **D3 — Camera, Framing, UX & HUD (15%)**: `8.4`
- **D4 — Grounding, Spatial & Anatomical Realism (15%)**: `7.5`
- **D5 — Craft, Readability & Polish (15%)**: `8.6`
- **D6 — Objective Performance & Runtime Stability (10%)**: `9.4`
- **Weighted Total**: `0.20*8.4 + 0.25*8.3 + 0.15*8.4 + 0.15*7.5 + 0.15*8.6 + 0.10*9.4 =` **`8.37 / 10`**
- **Defect Counts**: `CRIT = 2`, `MAJ = 11`, `MIN = 16`
- **Verdict**: **`FAIL`** (`< 8.5 / 10` and `CRIT > 0`)

## Summary
- **Strong**: Harbor Town exterior architectural polish (scalloped tiles, balconies, bunting, wrought-iron signs), Lighthouse atrium, Echo Caves echo rings & hanging crystal chimes, `kiko-hermit` & `jisu` proofs, smooth Kiko scuttling on most boards, compact HUD/dialogs, and `D6 = 9.4` performance (`84,258 -> 2,144` scenery meshes, `285/285` soundtrack checks, `26/26` GLBs OK, `0` console/HTTP errors).
- **Critical & Major Gaps**:
  - **CRIT-1**: `02-harbor-town.png`: `?` cube at `(331, 247)` swallows a resident's head (`(338, 282)`).
  - **CRIT-2**: `09-echo-caves.png`: Kiko `(135, 390)` intersects Echo the Beluga `(175, 405)` and is ~380px from Shelly `(510, 490)`.
  - **MAJ-1**: `07-lighthouse.png`: Kiko `(752, 318)` is 3 tiles ahead of Shelly behind a tile rim.
  - **MAJ-2**: `06-captains-deck.png`: Still reads as an open-air deck with sky/clouds `(500, 40)` rather than an enclosed wood-paneled Great Cabin with ceiling & readable curio cases/ship-in-bottle/globe.
  - **MAJ-3**: `08-lagoon.png`: Storybooks & origami boats are not readable in the hero camera; upright cylinders at `(515,300)`, `(585,330)`, `(630,340)` read as plain cylinders.
  - **MAJ-4**: `10-pattern-reef.png`: Only 2 mosaic disks, 1 striped arch, and 1 ring stone are visible; generic lumps dominate and ABAB colonnades / checkered plaza / Fibonacci spirals need hero placement.
  - **MAJ-5**: Rooms `03, 04, 05, 12, 13, 14, 15` share the exact same architectural layout template (window + counter + rug/Shelly position) — need distinct room layouts.
  - **MAJ-6**: `16-friend-interior.png`: Board `?` cube appears inside the friend gazebo `(955, 140)` intersecting the pillar `(935, 150)`.
  - **MAJ-7**: `16-friend-interior.png`: Seal says `"저는 지수예요 / Hi! I am Jisu"`, colliding with Bottle Beach's hermit-crab courier Jisu.
  - **MAJ-8**: `13-jisu-encounter.png`: Foreground tile `(720–1024, 370–640)` & bottle `(260, 400)` crowd the frame while Jisu is small `(110×90px)`.
  - **MAJ-9**: `kiko-mochi/side`: Hard seam at claw base `(160–215, 205–215)` and straight tube legs.
  - **MAJ-10**: `14-taxi.png`: Taxi Squid silhouette from counter height reads as a pink egg with a checkered cap.
  - **MAJ-11**: `00-intro-mobile.png` was captured at `1024×640` instead of a true mobile viewport (`390×844`).
- Plus `16` `MIN` polish items (details in `#346`).
