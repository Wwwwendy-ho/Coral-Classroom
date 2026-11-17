# Proposed next work

This is the current developer plan for critique, not a claim that the listed work is implemented or that every design proposal is owner-approved.

## Current local pass, ready for review

- One small grayscale material atlas modulates existing baked colors. World-projected UVs keep reused geometry coherent. Characters, travel tiles, effects and existing mapped meshes do not enter this surface system.
- Broad sculpted stone contours, worn/beveled surfaces, improved roofing and curved canvas replace some obvious primitive surfaces. Most region scenery now has fewer triangles; draw-batch and attribute costs are explicitly audited.
- Existing route loops, lesson destinations, tile identities, overview outskirts and interaction placement are retained. Tile art remains the foreground quality reference.
- Source integration, focused CPU/geometry tests, lint and a portable build pass. This pass has not yet been validated in a current browser or on a physical iPhone XS.

## 1. Validate the material pass in the running game

Judge actual board-camera output before adding more scenery: texture scale at phone resolution, roof/stone contrast, aliasing during hops, visible seams, close/overview readability and bright pigment retention. Adjust atlas coverage/strength if grain overwhelms large calm surfaces. Test slow network entry, rapid region switching, return visits, conversation open/close and disposal. Profile on iPhone XS with warm and cold loads; record frame times, long tasks, draw calls and memory. Do not infer smoothness from the offline render speed.

## 2. Compose each region around fewer, stronger landmarks

Keep distinct loop routes and tile clearances. Establish a main landmark, a secondary encounter vignette and quiet negative space in every region. Improve silhouette and layered terrain before adding scatter. Possible design studies to discuss with Fable:

| Region | Identity to strengthen | Low-cost design study |
|---|---|---|
| Coral Cove | Living reef circuit | Ribbed shell gateway, asymmetric reef terraces and a coherent coral crown |
| Harbor Town | Working waterfront | A recognizable harbor building, irregular quay, sail/net market canopy and moored boats |
| Story Lagoon | Sheltered story islands | Layered lagoon banks and a shell-shaped gathering place framing the host |
| Echo Caves | Resonant stone chamber | A strong cave-mouth silhouette, ledged rock walls and quiet dark recesses |
| Pattern Reef | Interlocking reef shapes | Larger patterned coral forms organizing the route, with restrained fine surface noise |
| Bottle Beach | Coastal message shore | Curved shoreline shelves, driftwood/bottle vignette and clearly grouped beach vegetation |
| Lighthouse | Beacon above the reef | Stepped cliff mass, characteristic tower/crown and a clear approach to the host |
| Captain’s Deck | A recognizable vessel | Strong bow/stern, believable plank direction, curved sails and rigging kept away from faces |

Prefer shared small meshes, painted curvature/occlusion and baked contact shading. Avoid equal-sized decorations at equal spacing. Keep distant outskirts cheaper than foreground landmarks and avoid transparent foliage stacks.

## 3. Complete characters one at a time

Clean and author Jisu and the octopus drafts before activation; do not ship white reconstructions. Validate octopus topology from every angle, skin-only camouflage, and Jisu’s small silhouette and orange mail. Preserve exact species choices, biological scale hierarchy and distinctive occupational palettes. For each resident produce neutral front/side/back/three-quarter views, board LOD, lazy close LOD, and a small authored motion set. Check natural mouths in profile as well as front view.

Author a few eye/head/stalk controls appropriate to each species. Test resting, attentive and reaction states in actual dialogue. A sleepy taxi, eager Jisu and steady Echo should have different timing and gaze without a universal human grin. Pause hidden residents, share geometry/materials where appropriate and release close-view resources on exit. Introduce electrical cues only during Jisu’s short speed burst.

## 4. Refine camera and interaction staging

Use board cameras to keep current/next tiles and adjacent shops readable. Transition overviews should reveal recognizable landmarks without an empty ocean floor or labels competing everywhere. Dialogue frames need enough body/context to feel like approaching an NPC, with a clean silhouette and clear lower screen space for Korean, translation and controls. Tune framing by species size rather than enlarging Jisu to match the ray. Keep touch controls and text legible on the phone; respect Calm Motion.

## 5. Align presentation with the learning roadmap

Fable’s new documents propose content IDs, one scheduler, an output ladder, listening/input and adaptive teaching. Those are a separate feature roadmap. Visually reserve room for listen-first tasks, word building and typed/dictated answers without covering the character’s face. Keep hops/travel short so they do not dominate learning time. Use a small readable host note for adaptation and no reminders/notifications. Do not implement the entire curriculum while the current visual review is pending.

## Questions for Fable

Which two landmark rebuilds would establish the visual standard fastest? Is the atlas too granular or too evenly applied? Where should contact shading carry detail instead of geometry? Which camera/view is the best acceptance target? Which current primitives remain conspicuous beside Shelly? Which planned change offers too little visual benefit for its runtime cost?
