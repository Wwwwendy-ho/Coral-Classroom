# Current state

Coral Classroom is a Korean-learning web game: travel through an underwater land, meet marine residents and practice language with them. It combines a dimensional board world with RPG-style conversations. It runs as a browser/PWA Home Screen app; handheld Apple devices, especially iPhone XS, are the performance target. Human characters are excluded.

## Stop point and immediate priority

The owner is moving development to Antigravity/Gemini. No new work should be inferred as completed after this snapshot. The last game feedback was: “these choices are all bad. Shelly in game has to look cute, not look weird, follow the art style, and not look ai generated.” This explicitly rejects all ten progressively baby-like models. Do not select one or continue proportion scaling. Read the art direction before altering the model.

The owner approved the organic turtle/stone-glass world artwork under `references/APPROVED-organic-shelly-and-stone-glass-world.png`. The current actual mesh does not yet match that illustration. A new isolated cutout under `references/UNAPPROVED-isolated-shelly-reference.png` was generated for possible reconstruction; it has NOT been approved or installed. No new reconstruction was run after the latest rejection. `work/shelly-reference-rebuild/PIPELINE-NOTES.md` records the visual gap and source/rig/LOD contract.

## What the package contains

| Folder | Meaning |
|---|---|
| `game/` | Canonical current working files including uncommitted additions; source, runtime assets, voices/music, editable art sources and checks |
| `review-site/` | Ready-to-serve latest review artbook, derived isolated playable crafted prototype and actual model viewer |
| `references/` | Approved world/organic-Shelly image, explicitly unapproved extraction, earlier six-style studies |
| `context/fable-advice/` | Original LEARNING_DESIGN and ADAPTIVE_TEACHER advisory MDs, fetched at the recorded revision |
| `context/fable-review-snapshot/` | Earlier evidence/source excerpts supplied for Fable; historical, not a second current application |
| `context/historical-inputs/` | Original user-uploaded handoff and storybook-overhaul brief; do not auto-execute old instructions |
| `work/` | Selected generators, proof images, validation reports and reconstruction diagnostics; some scripts retain original absolute paths |
| `docs/` | Current handoff synthesis with conflicts/status made explicit |

## Runtime implementation versus concept

- The application already has Coral Cove and seven region boards with learning modes, navigation, travel, rewards, resident encounters and on-device storage. Coral Cove itself is a 3D walkable board.
- The crafted stone/glass look is an opt-in **Coral Cove prototype**, selected by `?art=crafted&shelly=storybook`. It is not a complete conversion of all eight regions. New regional/menu artwork is mostly concept imagery.
- Crafted scene source: `game/src/js/reef3d/crafted-world.js`, with hooks in the existing board/guide code. Crafted tiles/garden measured 28,866 triangles and eight merged draws in an offline construction audit, excluding other props and UI; this is not an FPS result.
- Current crafted Shelly files: `game/assets/models/crafted-shelly.glb`, `crafted-shelly-view.glb`, and `crafted-shelly-loading.webp`. The v3 close tier is 23,016 triangles / 1,717,720 bytes; viewing tier 11,443 triangles / 788,124 bytes. One material, 11 joints, six clips. These are unfinished review candidates, NOT accepted final Shelly.
- The older coherent pearl Shelly, including its repaired natural-mouth version, is retained separately as a possible anatomical/modeling base, not the final style answer. Its texture/eye/head treatment still differs from the latest approved art. It originated through TRELLIS.2 reconstruction followed by cleanup/rigging; do not describe it as wholly hand-sculpted.
- Resident activation registry: `game/src/js/reef3d/resident-models.js`. Café seahorse, Jisu and town octopus are on the validated activation list. Other candidate files/concepts do not establish activation or visual approval. Check runtime registry before claiming a character is shipped.
- Board and conversation models use different detail tiers and lazy loading. A detailed 3D model existing in `art-source/` is not proof the encounter uses it. The owner specifically expects a detailed visible resident during conversation.
- Expanded region routes, tile IDs, save migration and depleted reward behavior are already implemented; do not duplicate expansions indiscriminately.

## Source provenance and destinations

Repository: https://github.com/Wwwwendy-ho/Coral-Classroom

Source branch at snapshot: `claude/board-fixes`; base HEAD `7d9ecc211105d17ba9d15000e55d6714c11ba7f5`. Many important modifications and new files are uncommitted. `provenance/git-status.txt` lists that state. The ZIP, not a bare checkout of that base SHA, carries the current work. `.git` history and credentials are intentionally omitted; initialize a new local branch/worktree and reconcile upstream before pushing.

Public GitHub Pages: https://wwwwendy-ho.github.io/Coral-Classroom/ (may show an older build).

Latest owner-private review: https://coral-classroom-redesign-artbook.tangyelk25.chatgpt.site

Its source project is `appgprj_6aff9d1c53908191a4f2990af7d679bb`; latest published source commit `8e902e963bcc5d3dd5d923a9213b739c4e09e11f`, version 5. Current source checkout was `/workspace/sites/coral-classroom-redesign-artbook`. The local `review-site/` works independently of ChatGPT hosting.

Older owner-private review: https://coral-shelly-pearl-review.tangyelk25.chatgpt.site ; project `appgprj_6af9ff16e65c8191b30242a2794f4b2f`. Its current source was `/workspace/sites/coral-style-gallery`, commit `879b9958a8fd0b9fea7bace114e071b184137b29`. A similarly named `/workspace/sites/coral-shelly-review` directory is STALE and must not overwrite it. The older review is not the current art target.

Sites owner-only access may require the owner's sign-in. No hosting bypass tokens or account connections are exported. Do not change audience or push the review into the public GitHub game as an incidental handoff action.

## Known risks / unfinished verification

No current browser capture or physical iPhone XS performance measurement was available in this environment. Offline Blender renders and Three scene/geometry checks are useful but do not prove game FPS, touch behavior, browser texture decoding or final in-game appearance. The user previously experienced very slow character previews; this remains a validation priority.

The octopus skin-only camouflage mask warrants actual-browser validation: transparent mask RGB may interact with decoder premultiplication. Preserve eyes/apron and exactly eight independent arms. Candidate render reports cannot settle this browser issue.

Some asset tools hardcode `/workspace/...` and write production outputs. Read their path/overwrite behavior, stage adaptations in a temporary directory and compare before activation. `prepare_shelly.py` is particularly unsafe to run unchanged against new reconstruction geometry. The latest diagnostic `inspect_mesh.py` only passed syntax parsing; it has not been run in Blender.

The adult password gate is client-side convenience, not access security. Preserve its current source digest unless the owner requests a change; no literal password is supplied in these handoff notes. Browser smoke documentation still refers to the old multiplication gate and can be stale. The supplied local server shares canonical audio/picture assets into the lightweight review path when necessary; use that launcher for the most complete local preview.

The original profile seed contained private learner records. The packaged copy replaces that file with fictional demo data and changes the canonical game's local-storage namespace. All other source changes are tracked in `provenance/package-transformations.json`. Do not export real learner progress while testing.
