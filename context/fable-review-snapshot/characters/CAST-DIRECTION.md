# Character direction after the cast survey

The owner's November 16 preferences are recorded in `preferences-2026-11-16.json`. They refer to the images in their actual display order, not the order of the unpublished survey dropdown. Shelly retains her selected lavender-pearl palette and A eye direction while her natural facial acting is developed. Mira is a separate teenage sea turtle, with a related design family, different colors and practical teen accessories.

## Shared art direction

Latest clarification: the owner prefers the expressive A eyes in the naturalness comparison; the overly human smile is the main concern. Keep those A eyes across the cast, and use species-specific mouths/mouthparts plus role-appropriate eye acting. Octopus and squid beaks stay underneath the arm crown; they must not have a human smile painted on the mantle. Jellyfish have no mouth. See `expression-review/manifest.json` and its19 close portraits, including Shelly. The owner accepted this direction for development and explicitly emphasized that each personality must affect the eyes' expressions. Each portrait samples one reaction; develop an expressive range for that character during conversation.

The A preference defines the appealing eye design and rendering. Each character needs an individual resting gaze, lid pose where anatomy supports it, attention shifts and response timing. The taxi has slow, heavy-lidded sideways attention; Jisu's stalks turn with quick eager focus; Echo listens with steady, gentle attention; Pip studies a puzzle with concentrated eye aim. Their expressions should change with the conversation while retaining their personalities. Use species-appropriate controls: stalk orientation for crustaceans, subtle eye aim and head/fins for fish, and restrained bell movement for Hana. Preserve the distinctions between Shelly's curiosity, Mira's confidence and the adults' calmer or more deliberate attention.

Author eye motion into each model's small rig or appropriate morph controls and verify the neutral, attentive and reaction states from dialogue and board cameras. Reuse the existing animation mixer and visibility/Calm Motion lifecycle. Avoid per-frame geometry or texture creation and avoid eye-animation work for hidden residents. The current review portraits are static concepts; runtime eye acting still needs authored controls and implementation.

Use refined organic sculpting, readable expressions, soft lighting and carefully painted surfaces. The owner specifically rejected making the entire cast dreamy and ethereal. Cohesion comes from modeling, facial appeal, texture treatment and rendering; each character needs a clear personality and recognizable silhouette.

Avoid a universal treatment of pearl skin, glowing seams, golden filigree, stars, identical eyelashes and decorative jewelry. Prefer natural shell markings, skin variation, cloth weave, small wear details and restrained highlights. Lumi's lure and Hana's gelatinous bell can carry natural light; the working townsfolk should feel like residents with everyday occupations. Keep the selected shapes, faces and palettes while applying these material differences.

The owner liked the subsequent silhouette/proportion revision, but rejected its overall yellow/brown palette. `biological-palettes-2026-11-16.json` now supplies researched species references and separates animal pigment from occupational clothing colors for the six affected characters. Use neutral daylight for color review. The earlier green/pink and yellow/brown sheets are historical drafts.

| Character | Selected direction | Personality and surface treatment |
|---|---|---|
| Lumi | 2 | Curious night explorer; lavender/indigo fins, readable face, light concentrated in the lure. |
| Bok | 1 | Welcoming, practical merchant; butter-gold skin, cream belly, woven apron and cap, amused eyes. |
| Kiko / Mochi | 1 | Impish and energetic; peach-pink carapace, quick sideways movement and playful claw gestures. |
| Kiko / Hermit | 3, with glasses | Observant and thoughtful; a frilled cream/lilac shell, visible eye stalks, small glasses and cautious peeks. |
| Pharmacist | 3 | Patient, knowledgeable shrimp; apricot shell segments, glasses and a tidy work badge. |
| Friend | 1 | Easygoing and friendly seal; soft mauve fur, warm eyes and a simple scarf. |
| Keeper Hana | 3 | Calm and attentive jellyfish; gentle peach/ivory bell, natural translucent edges and unhurried movement. |
| Captain Bay | 2 | Capable, hearty walrus; slate-blue fur, expressive whiskers, worn navy cloth and restrained brass details. |
| Cafe owner | 1 | Bright, brisk seahorse; peach/gold natural plates and a practical cream barista apron. |
| Restaurant server | 2 | Quick and sociable sea otter; taupe/peach fur, small apron and confident serving gestures. |
| Mira | Teenage option 3, Coastal adventurer | Curious and confident; seafoam/cream skin, slate-blue/sage shell, forehead goggles and coral canvas map satchel, distinct from baby Shelly. |
| Echo | Revised option 3, Beluga | Rounded pearl-white/cool-gray beluga; recognizable melon forehead, no dorsal fin, horizontal flukes, gentle confident expression and a cobalt-blue note satchel. Supersedes the nautilus and the briefly selected bottlenose dolphin. |
| Pip | Revised option 2, Royal gramma | Inventive reef fish; violet-purple anterior body, golden-yellow posterior body and tail, lively mischievous expression and a mint/cream puzzle notebook. Preserve the natural fish body plan with fins, no human limbs. Supersedes the cuttlefish. |
| Jisu | 2; species-informed palette | Small lively pen-pal crab; electric-blue bands on dark limbs, orange antennae, neutral shell and tangerine-orange pouch and orange envelope seal. |
| Town shopkeeper | 2; species-informed palette | Broad adult octopus; naturally brick-red/cream-mottled skin, indigo work apron and a composed expression. Separate from Bok. |
| Taxi driver | 2; species-informed palette | Tall, slender squid; pale translucent cool-gray skin, reddish chromatophore dots, yellow/navy checked work scarf and bored, heavy-lidded eyes with an unhurried sideways gaze. Keep the natural beak underneath the arm crown. |
| Subway guide | 3; species-informed palette | Widest, flattest ray; charcoal/white spotted dorsal surface, pale underside, burgundy scarf and joyful squint. |
| Hotel clerk | 3 | Composed, reassuring whale; slate/cream skin, mature expression and one tidy uniform accent. |

The personality descriptions are implementation guidance inferred from each role, not new dialogue or approved changes to the learning content. Keep all characters marine organisms and preserve existing roles and progress.

## Runtime requirements

Create real inspectable 3D assets after the concept stage. Retain the chosen appearance across front, side, back and game-camera views. Favor shared baked textures and one material per character, appropriate mobile detail levels and loading only the nearby or active conversation cast. Avoid piling transparent effects onto every NPC. Keep the accepted tile/scenery detail level and iPhone XS performance priority.

## Latest implementation refinements

Jisu is the smallest of the comparison group; the adult town octopus is substantially larger, and the spotted eagle ray has the dominant wingspan. Gameplay proportions are compressed rather than literal biological ratios. Close conversation framing should make small characters readable without enlarging their world bodies. The town octopus changes its skin intentionally; its apron and eyes retain their colors. Jisu uses temporary electrical speed cues only during a quick scuttle. The taxi squid's bored personality comes through heavy lids, slow eye aim and relaxed posture; its natural beak stays underneath the arm crown.

The owner requested greater vertebrate variety and selected Echo3 (beluga) and Pip2 (royal gramma) from `echo-pip-vertebrate-options-2026-11-16.png`. These are selected concepts, not yet deployed models. The other approved species remain as selected. The octopus must have exactly eight independent arms, one continuous body-to-tip path per arm, without branches or fused tips. Its latest `art-source/npcs/shop-octopus/concept-input.png` shows all eight tips clearly; check the actual reconstruction from several angles before activation.
