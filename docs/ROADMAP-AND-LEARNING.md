# Priorities and learning roadmap

Most recent art feedback controls the immediate next work: resolve the actual Shelly model's appeal and consistency with the approved art, then carry the accepted approach into characters and regional scenes without sacrificing handheld performance.

The owner's earlier explicit work order was plan items **2 → 3 → 4 → 5 → 6 → 1**: character polish, remaining cast, regional identity, NPC interactions, learning roadmap, dedicated phone performance checkpoint. The performance constraint applies during every item; it is not postponed until last. `game/docs/DEVELOPMENT-ORDER.md` records that order but predates the later art redesign and Shelly rejection.

## Existing regional learning identities

| Region | Focus / host |
|---|---|
| Coral Cove | Core vocabulary/review and exploration, Shelly |
| Harbor Town | Everyday roleplay and purposeful NPC conversations |
| Story Lagoon | Stories/comprehension, teenage Mira |
| Echo Caves | Pronunciation/shadowing, beluga Echo |
| Pattern Reef | Grammar/patterns, royal gramma Pip |
| Bottle Beach | Writing/messages, Jisu |
| Lighthouse | Culture/signs/menus/manners, Hana |
| Captain’s Deck | Daily voyage/course/progress planning, Bay |

The owner corrected the expansion request to **? and Chance tiles**, not “minigame tiles”: approximately +30% ?/Chance, +30% plain and +20% learning tiles. Expanded route lengths already present are Lagoon 35→44, Town 31→39, Caves 30→38, Patterns 35→44, Beach 36→45, Lighthouse 40→50, Captain 30→38. Preserve stable tile identity, save-position migration, existing lesson destinations and depletion state. An emptied lucky block must not award or be hit again. New learning modes need a distinct focused language purpose, not cosmetic duplicates.

## Fable advice: proposals, not blanket implementation claims

`context/fable-advice/LEARNING_DESIGN.md` and `ADAPTIVE_TEACHER.md` were read from GitHub commit `5fe853303572fef67d777c1eb77cf3567ca31d60`; blob IDs are recorded in `context/fable-review-snapshot/FABLE-NOTES-READ.md`. The former explicitly excludes boards/art/music. They propose stable content IDs and migrations, one coherent scheduler with channel-specific evidence, a Harbor Town output ladder, more listen-first input, fluency and assessment, plus bounded local adaptive teaching with evidence thresholds, pinned preferences, undo and supportive recovery. No reminders/notifications.

Do not claim this entire proposed curriculum/teacher is implemented. Inspect current source and phase changes with migration/testing. Maintain purposeful language exchanges with visible marine NPCs; avoid decorative travel consuming most study time. Leave readable space for Korean, audio, word building and typed answers. Retain offline support and pre-recorded natural voices; do not introduce paid inference as a required runtime dependency.

`context/fable-review-snapshot/` is the earlier package FOR critique, with old screenshots/source excerpts and proposed work. Do not mistake every MD in it for advice authored by Fable or for the newest implementation. `context/world-realism/FABLE-PASS-STATUS.md` records an earlier material/landmark/UI pass and its verification limits.

## Anki RWKV research

Owner asked whether JSchoreels/anki-rwkv is better and to use it if warranted. It was studied but **not integrated**. The app still defaults to SM2_speed, with SM2/Leitner and separate FSRS 4.5 logic; do not silently substitute a model. Evidence: `context/rwkv-review/evidence.json` and upstream https://github.com/JSchoreels/anki-rwkv .

In the cited upstream days-ahead benchmark (9,999 collections; 349,923,850 evaluation reviews, excluding same-day), reported log loss was FSRS4.5 .3625, FSRS6 .3460, FSRS7 .3370 and RWKVCurve .3193. RWKVInstant .2773 is a different instantaneous prediction task and not a fair direct scheduler comparison. Better predictive log loss does not establish a proportional decrease in learning workload or guaranteed retention outcomes. Verify current upstream results before making new claims.

The small 333K-parameter candidate looked technically plausible, with reported ~403 bits/card state, but browser inference/latency and physical iPhone XS costs were not measured. Code/checkpoint redistribution licensing remained unresolved in the research (upstream issue 353). Adoption needs usable causal review-event logs, stable item IDs, held-out calibration/workload evaluation, licensing resolution and measured mobile parity. No learner data was uploaded for this investigation. Consider a modern FSRS upgrade and unified evidence model separately; do not conflate that with RWKV deployment.

## Delegation preference

The owner prefers cheaper models for rote inventory/validation and Sol or Astra for architecture and difficult coding/art-pipeline decisions. Delegate bounded independent tasks with explicit source paths and acceptance checks; avoid competing edits to shared scene files. Do not assume Antigravity exposes the same models or account quotas. Root synthesis, integration and final verification remain necessary.
