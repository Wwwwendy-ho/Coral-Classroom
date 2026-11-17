# Fable's visual review

Review date: November 17, 2026. This answers the eight questions in `FABLE-PROMPT.md`.

**What I looked at:** every Markdown file in this folder except the offline render method; all 18 November 15 game captures; all 16 close before/after renders; both concept sheets; the Shelly three-quarter model view; the atlas; and `world-surfaces.js` in the source snapshot. I did not open the 16 overview before/after renders, the captain concept, the taxi model or the other source files, and I did not run anything on a device.

Each point is marked **[seen]** (visible in an image or the code) or **[inferred]**.

## Summary

1. The characters and tiles are at one level of finish and the world is at another. The gap is mostly in the **ground, shorelines and repeated props**, not in surface grain.
2. The material pass makes every region darker and replaces two designed surfaces (town paving, deck planks) with photographic noise. Fix its brightness and narrow where it is used before adding anything.
3. Most regions are told apart by color. Each needs one landmark that owns the silhouette.
4. The concept portraits are far beyond what the iPhone XS can draw. Agree a runtime look, using the real Shelly model as the bar, before modeling more cast.

## 1. The five biggest weaknesses

1. **Flat ground with a hard polygon edge.** In every overview the play area is one flat color, cut out as a many-sided disc, sitting in flat teal: `town-overview`, `caves-overview`, `patterns-overview`, `light-overview`, `captain-overview`. It fills most of the screen and has no shoreline, depth or value change. **[seen]**
2. **Identical props at equal spacing.** Pattern Reef has seven copies of one coral cluster around the rim. The Lighthouse has six identical hexagonal plinths. Harbor Town has four copies of one house. Bottle Beach has one palm, repeated. **[seen]**
3. **Primitive shapes beside a sculpted Shelly.** `tile-close` and `town-play` show it best: Shelly and the tiles have painted texture and soft form, and next to them are box houses, box boats, an octagonal orange prism for the lagoon shelter (`lagoon-play`) and smooth ellipsoid boulders (`caves-play`). **[seen]**
4. **Landmarks too small to read.** The lighthouse tower is a small object at the rim of its own region. Captain's Deck is a wooden disc with one mast and no bow, stern or rail, so it reads as a raft. **[seen]**
5. **Crowded screen.** A region board shows about ten floating controls at once: four top buttons, Travel, the region card, the legs pill, "Meet Bok", a "Talk to…" bubble, Ask Shelly and Treasure map (`town-play`). "Meet Bok" sits in the middle of the play area in every region. The ? blocks are large enough to cover Shelly (`caves-play`, `captain-play`). **[seen]**

## 2. Do the characters and the world belong together?

Not yet. The characters are hand-painted, with soft gradients and warm rim light. The world is flat-shaded polygons, and the new atlas adds photographic grain. Those are three different rendering languages. **[seen]**

To close the gap cheaply, move the world toward the tiles, which already match Shelly:

- **Painted value, not grain.** Bake two or three large, soft gradients into vertex colors: lighter toward the sun side, cooler and darker near water, a warm lift around the route.
- **Contact shading.** A soft dark patch under every prop, building and rock. The tiles already have one; the buildings and boats do not, which is why they float. **[seen]**
- **Rounded silhouettes.** Bevel roof edges, taper walls slightly, curve boat hulls. A few extra triangles on the outline do more than any texture.
- **Color.** The owner asked for vivid pastel. Caves, the Lighthouse and Harbor Town's ground are grey-green or beige. Keep their hue identity but raise saturation in the lit areas and put the grey only in shadow.

## 3. Region recognition, and one improvement each

Recognizable by shape today: Story Lagoon (islet chain) and Bottle Beach (ring of sand with palms). The rest rely on color. Caves, Pattern Reef and Captain's Deck share nearly the same loop with the same tail. **[seen]**

| Region | One improvement |
|---|---|
| Coral Cove | A tall coral crown or shell arch at one point of the ring, so the ring has a "top". The pink arch in `cove-close` is a start; make it three times larger and put the start tile under it. |
| Harbor Town | One distinct harbor building (a clock or bell tower, or a fish-market hall with a long roof) at the far side of the basin, and break the four identical houses into three different shop fronts. |
| Story Lagoon | Replace the prism shelter with a large open shell or a reed-roofed reading hut on stilts, big enough to frame the host. |
| Echo Caves | A cave mouth: two tall rock walls that lean in over the far side of the loop, with dark behind them. Right now it is an open plateau with nothing overhead. |
| Pattern Reef | Three large interlocking coral forms inside the loop, in three colors, replacing the seven rim copies. The pattern idea should be visible from above. |
| Bottle Beach | One large bottle half-buried at the lagoon's edge and a short pier. Vary palm height and lean. |
| The Lighthouse | Move the tower to the highest point near the center-back and make it about three times taller, on a stepped cliff. Cut the six plinths to two or three rocks of different sizes. |
| Captain's Deck | Give it a hull outline: pointed bow, raised stern, a rail, and plank lines running bow to stern. Then it is a ship from any angle. |

All of these keep the closed routes and tile clearances.

## 4. Camera, hierarchy and labels

- **Board camera.** The angle works. The haze does not: in `town-play` and `light-play` the top third of the screen is washed to near white, which hides the landmark. Push the fog start further out, or tint it with the region's water color. **[seen]**
- **Overview.** It is close to straight down, which flattens every landmark into a footprint. Tilt it to about 55–60 degrees and rotate each region so its landmark is at top center. **[inferred]**
- **Dialogue.** No dialogue capture is in the package, so this is a recommendation only: the character in the top 55% of the screen, its eye line a third from the top, and the Korean line, translation and controls in the bottom 45%. Frame by species; Jisu should fill the frame as much as the ray does.
- **Labels.** Show one context action at a time, docked at bottom center above the thumb. Drop the floating "Talk to…" bubble for a small marker over the character. On a phone, fold Coral Cove, Dice, Activities and Travel into the menu. The package has no phone capture of a region board; please add one.
- **? blocks.** Reduce them by about a third, or raise them so they never overlap the player.

## 5. The material pass

**It darkens everything.** The shader multiplies color by `mix(1, texture, 0.55)`. The atlas panels average 0.80–0.87 brightness, so every textured surface loses 7–11%. I measured the close renders: overall brightness falls in seven of eight regions, most in Captain's Deck (0.68 to 0.59) and the Lighthouse (0.69 to 0.64). Saturation is unchanged. **[seen, measured]**

Fix: divide each panel by its own mean in the shader, or re-level the atlas so each panel averages 1.0. Detail should lighten as often as it darkens.

**Where it helps:**

- Bottle Beach sand: the ripples read as sand at any distance.
- Lagoon islets and beach rocks: now clearly stone.
- Lighthouse rock sides.

**Where it hurts:**

- Harbor Town ground: the pale brick paving, which looked designed, became mottled mud.
- Captain's Deck: the plank pattern, which told you it was a deck, is nearly gone and the wood is much darker.
- Caves and Pattern Reef floors: an even grain over a huge flat area. On a phone this will read as noise and may shimmer during hops. **[inferred]**

**What I would change:**

- Keep the atlas for sand, rock and roof shingles. Remove it from the large flat floors in Town, Captain, Caves and Patterns, and paint those with vertex color.
- Restore the town paving and deck planks as drawn patterns. Structure beats grain at this camera distance.
- Lower strength from 0.55 to about 0.35 on anything larger than a prop.
- Spend the effort on contour: the triangle savings in this pass are good and should go into silhouettes.

## 6. Characters

**Strong:** the eye design, the natural mouths, the species variety, and the working-clothes accents. The taxi squid's heavy lids and the octopus's composed stare already carry personality without a human smile. **[seen]**

**Risks:**

- **Concept versus runtime.** The portraits show fur, translucent skin and subsurface glow. The real Shelly model is a painted texture on a smooth mesh, and it looks good. Use that as the target and redraw the otter, seal and jellyfish in that language before modeling. **[inferred]**
- **Pairs that will be confused at board size:**
  - Seal and otter: both tan, furry, round-headed mammals with a cloth accent. Push the seal greyer and spotted, keep it lying low, and make the otter upright and holding something.
  - Jisu, Kiko Hermit and the purple-shelled hermit crab that already follows Shelly: three shells with legs. Give Jisu a distinctly different shell shape and keep the orange satchel large.
  - Lumi and Pip: both purple fish with orange. Lumi's lure only reads at night. Shift Lumi toward deep indigo-blue.
  - Shelly and Mira: near-identical faces. The goggles help; a different shell shape would help more.
- **Shelly's current mouth.** The in-game Shelly (`tile-close`, model view) has an open human grin, which the new direction rejects. She is on screen more than anyone, so she should be the first fixed.

**Eye acting without humanizing.** Vary only timing and aim, and let the body do the rest:

| Character | Eyes | Body |
|---|---|---|
| Taxi squid | Half-lidded; slow drift to the player; long holds | Arms hang; one slow color ripple when spoken to |
| Jisu | Stalks snap to the player; quick small re-aims | Antennae flick; tiny hops |
| Echo | Steady; slow blink; turns the whole head to listen | Gentle nod of the melon |
| Pip | Looks at the object, then you, then back | Fins flare on an idea |
| Octopus | One eye tracks, the other stays; rarely blinks | Skin pattern shifts, not the face |
| Bok | Wide, with a slow blink | Puffs slightly when pleased |
| Hana | Dot eyes stay fixed | Bell pulse rate carries mood |

No eyebrows and no curling mouth corners on anyone.

## 7. Where the plan overspends

- **Extra vertex data on big meshes.** The surface attribute adds 450–610 KB to Cove and Pattern Reef. Taking the atlas off the large floors removes most of it. **[seen in audit]**
- **Batch splits.** Lagoon went from 11 to 20 merged bins and Beach from 11 to 21. These are upper bounds on draw calls, not measurements, but doubling is the wrong direction. Merge by material after narrowing atlas use.
- **Atlas size.** 1024² on iPad costs about 5.3 MB against 1.3 MB at 512². With less coverage, 512² everywhere is enough. **[inferred]**
- **The cast.** Eighteen characters with close-up models and textures is the largest memory risk in the plan. Load a close model only when a conversation opens, release it on exit, and keep one small texture per character.
- **Transparency.** The jellyfish, tile glows, haze and light beams stack on the same pixels. Cap it: no more than two transparent layers over any part of the screen.

None of this replaces a frame-time capture on the iPhone XS.

## 8. Suggested order

| # | Change | Benefit | How | Cost | Success test |
|---|---|---|---|---|---|
| 1 | Fix atlas brightness; remove it from large floors; restore paving and planks | Stops the pass working against "vivid pastel" | Normalize panels; retag meshes; vertex-painted patterns | Small | Mean brightness after ≥ before in every region; town and deck patterns readable on a 375px phone |
| 2 | Paint ground and shoreline in all regions | Fixes the largest area of every screen | Vertex-color gradients, a foam ring and wet band at the water's edge, contact patches under props | Small to medium | No region shows a single flat ground color or a straight polygon edge in overview |
| 3 | Rebuild two landmarks: Captain's Deck hull and Harbor Town harbor building | Sets the world standard where the player goes most | New low-poly meshes with beveled outlines and baked shading | Medium | A person shown only a grey silhouette names the region |
| 4 | Declutter the board and stage dialogue | Readability, and room for the learning tasks | One docked action, folded top bar, smaller ? blocks, dialogue framing as in section 4 | Medium | At most five controls visible on the phone board; nothing covers the character's face in dialogue |
| 5 | One character taken to finish at runtime budget, then Shelly's mouth | Proves the look is achievable before 17 more | Painted texture, board and close models, three eye states | Medium to large | Sits beside Shelly in `tile-close` framing without looking like a different game; XS frame time unchanged |

Then the remaining six landmarks, then the rest of the cast one at a time.

**Should wait:** more atlas panels; eye rigs for the whole cast; octopus camouflage; Jisu's electrical effect; night versions of the new regions.

**The acceptance view:** Harbor Town on a 375px-wide phone, board camera at tile 1 with the café owner in frame, plus one dialogue screen. If that looks right, the rest follows.

## Extra evidence that would help

- Phone captures of every region board, upright.
- One real dialogue screen.
- In-game captures of the material pass, not only offline renders.
- Frame times, draw calls and memory on the iPhone XS for Harbor Town and Pattern Reef.
