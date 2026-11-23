# How Coral Classroom is built

Coral Classroom is the whole app; Coral Cove is its flashcard board (the reef at the heart of the sea map).

A guide for whoever works on the code next. `README.md` covers using the app; this covers where things are and
how they fit together. Function names below can be searched for in the files.

## Files

| File | What it holds |
| --- | --- |
| `src/` | The app's code, in about 30 files (see Editing the code) |
| `index.html` | The whole app in one page, **built from `src/`** by `tools/build.py`. Don't edit it directly |
| `storage.js` | The on-device database used on GitHub Pages (see Saving) |
| `seed-data.js`, `audio-clips.js` | Starting decks, profiles and progress, and recorded pronunciation clips |
| `library.js` | The Library (tutor, worksheets, check my work, progress), exposed through `window.CoralCove` |
| `words.js`, `words-data.js` | Ask Shelly's offline English and Chinese word help and its dictionary |
| `reef-models.js` | The 3D models (GLB files as base64) |
| `three.min.js` | three.js r128 |
| `*.mp3`, `voice/` | Background songs and the natural voice packs |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Offline support and the Home Screen app |
| `tools/` | Build and check scripts (see Tools) |

## Editing the code

The app is one page, `index.html`, but its code lives in `src/` so each part can be found and read on its own:

- `src/page.html` is the page: the head, the screen's outline, and a line like `<!-- include: js/learning.js -->`
  wherever a file goes. Its script block opens with a map of every script file and what it holds. Start there.
- `src/css/`: `base.css` (the main app styles, with its own contents list), `fixes-and-refresh.css` (later
  layers: accessibility fixes, the ocean tokens, art direction, status colours), `swim.css` (the swimming
  mascot), `ask.css` (Ask Shelly), `reef.css` (the Child Mode look) and `reef-3d.css` (the board and lobby).
- `src/js/`: the script, in order. `src/js/reef3d/` holds the 3D board and lobby, and `src/js/vendor/` the
  third-party GLTFLoader.

The script files are not separate programs: they are pieces of one function, and `tools/build.py` joins them
back into one script, in the order `page.html` lists them. So a file can use any variable or function from
another, as when it was all one file. Keep new code in the file it belongs to, and add a new file with a new
include line in `page.html`.

After an edit: `python3 tools/build.py` writes `index.html` (each file in it sits between `/* from src/... */` and
`/* end of src/... */` comment lines, which help when reading errors in the browser),
then `sh tools/check/run.sh`. The check fails if `index.html` wasn't rebuilt, and lint gives `src/` file names and
line numbers.

## The two copies

GitHub is the main copy. The Claude artifact is a viewing copy built from it by `tools/build_claude.py`, which
puts the side files inside the page (Claude can't load them) and loads three.js from cdnjs. Inside Claude,
`storage.js` and the seed data are left out and the app saves to the artifact's own database instead.

Code that must behave differently in the two places checks `reefNoPin()` (true inside Claude, where there is no
seed data). The main difference: the Claude version has no grown-up checks at all.

## Shelly character review prototype

`src/js/reef3d/shelly.js` owns an opt-in rigged Shelly child, enabled by
`?shelly=storybook` (or `window.REEF_SHELLY_PREVIEW`). The existing guide wrapper
retains route, dice, reward and progress behavior. The adapter loads the GLB,
clones its skeleton/materials, crossfades six clips, follows Calm Motion, and
keeps the classic guide if the model is unavailable. Day boards use the prototype;
Lumi, the lobby and the study mascot retain their existing implementations.

`assets/models/shelly.glb` is the 23,999-triangle main asset. Quality tiers 2–3
use a cached 1024 color texture; higher tiers retain 2048. The smaller
`shelly-view.glb` (11,998 triangles, 1024 color) is embedded by
`tools/build_claude.py` so the self-contained page and its songs fit the artifact
limit. The main game keeps its full-quality songs and main model. The character
is a review prototype awaiting visual approval, not a default site-wide rollout.

`art-source/shelly/README.md` documents the concept/reconstruction provenance,
editable Blender source and canonical `tools/art/prepare_shelly.py` exporter.
`tools/art/build_shelly_preview.py` builds an offline orbit/animation viewer using
the same main GLB. `tools/check/shelly_smoke.js` covers opt-in/fallback loading,
clips, emotes, head anchors, travel, Calm Motion, rebuilds and offline reuse.

## Start-up

The current review draft also includes the following world-rendering work:

- `world-routes.js` gives the sunlit Cove and seven regions arc-length sampled circuits, preserving space identities and branch ownership. Free dice travel wraps forward; Story mode follows the same shortest route used for its planned count. Cove's night wreck keeps its existing staircase route.
- `tile-art.js` owns crafted tile geometry and shared painted atlases. Visible tops join the static merge; lightweight non-rendering meshes preserve raycast hit identities. `art-source/tiles/README.md` documents the source texture and budgets.
- `world-overview.js` fills the seabed revealed during map trips and entry fly-ins with themed reef banks and plant clusters. One opaque baked mesh adds at most 8,364 triangles and one draw while zoomed out; small idle batches prepare it without a large synchronous build. It stays hidden at normal playing height. Cancelled preparation can restart if a retained regional view returns.
- Treasure maps keep destination names in one selected-place card. Collision-aware 44 px markers use short guide lines to their actual route positions; the sea chart also shows one selected region's name and travel action. Packing runs on open/resize, never every frame.
- Static merges use 16-unit X/Z cells so a looping map can cull scenery across its width. Regional land follows route normals, with solid cliff/chamber/ship interiors and a separate harbor basin.
- Touch devices start without optional post passes. Lower tiers use smaller pixel budgets and the lighter Shelly asset, while UI text remains native resolution. Time-based draw pacing avoids halving a 30 Hz Low Power Mode display to 15 fps. Waiting dice no longer prevent automatic quality adaptation.

The private Sites review source is separate at `/workspace/sites/coral-shelly-review`; its landing page uses video/stills, with live WebGL on separate character and game pages. It has not replaced the public GitHub Pages game.

1. The head loads `seed-data.js`, `audio-clips.js`, `storage.js` (which creates `window.claude.use('db')` when
   Claude's doesn't exist), `library.js` and `words.js`, and registers `sw.js`.
2. The main script defines everything, then the `boot` section opens the store, loads settings and profiles,
   and calls `render()`.
3. The title screen (`renderSplash`) floats over the profile picker until it is tapped; that tap starts the
   music, because browsers only allow sound after a tap.
4. Picking a profile loads its decks. Child profiles open the reef board (`REEF 3D`); grown-up profiles open
   the deck list after the grown-up password check.

## State and drawing

All screen state lives in one object, `S` (search `var S = {`). Its fields are commented where they are defined.

`render()` redraws the current screen from `S`: `renderScreen()` picks the screen (profile picker, home, study,
feeds, stats, editor, ...) from `S.view` and a few flags. After that, `render()` runs the after-render hooks:
features that react to whatever is on screen (the swimming mascot, the study buddy, music, the Ask Shelly
button) register with `afterRender(name, fn)`. Add new ones the same way rather than wrapping `render()`.

Event handlers change `S` and call `render()` again. The 3D board is the exception: it keeps its own scene
alive between renders (see 3D).

## Saving

The app talks to one small database interface (`store adapter`): profiles, decks, cards and settings.
- Inside Claude it is the artifact's `db` capability, shared between devices.
- On GitHub Pages `storage.js` provides the same interface in the iPad's `localStorage`. Seed data the device
  doesn't have yet is added on open without overwriting progress.
- If neither works, an in-memory store keeps the app usable and shows a warning.

`coveWrapStore` (in `boot`) adds a 45-second cache for card reads; any write clears it.

## Learning engine

The scheduler is Anki-style SM-2 (constants at the top of the script, `DIFFICULTIES` for the three levels).
Each card type (timed choice, sound-out blend, Hangul Blend, Listen & Pick, Echo, Mic, Sentence Builder,
Chinese bridge, Native or Sino?) has its own section with its state on `S` and a render function.

Alongside the scheduler, the learner model (`src/js/learner.js`, `Learner`) tracks each Korean word in five skills
with FSRS. `src/js/my-words.js` builds a profile's My words list from missed cards, Ask Shelly lookups and fading
words (saved in the Word Bank's record), shows it as a deck tile on the board while words are due, and makes a
round of cards in each word's weakest skill on the spot (they're never saved, so deck schedules don't change).
Story Lagoon, the first region of the sea after Coral Cove, is `src/js/lagoon-stories.js` (twelve built-in trip
conversations with word meanings and questions) and `src/js/lagoon.js` (the story list, best fit first, and the reader:
listen, read with tap-a-word, questions). Taps and answers feed the learner model and My words.
Harbor Town, the second region, is `src/js/town-talks.js` (eight townsfolk, each a small map of turns: the
townsperson's line, then two or three answers graded best, ok or a gentle mistake with a hint, where answers can
lead to different lines) and `src/js/town.js` (the list, best fit first by Story Lagoon's word-knowledge helpers,
and the chat: tap or type an answer, matched in Hangul or loose romanization with reef.js's `koLoose` and
`koRomSaid`, then a debrief). It records 'hear', 'use' and 'read' in the learner model and adds the phrases
she needed to My words (from 'town'). `tools/check/test_town.js` checks every line is glossed and every path ends.
Echo Caves, the third region, is `src/js/caves-sounds.js` (the minimal-pair sets for each sound contrast, the
sound-rule cards, and `cavesPitch`: pitch by autocorrelation on 40 ms frames, median-smoothed, plus the span and
shape helpers that compare two pitch lines in semitones) and `src/js/caves.js` (one screen, S.view 'caves', with
three parts: sound pairs weighted toward the contrasts she misses, shadowing that records with Echo's `Mic` and
measures both clips with `echoDecode`, and the rule cards). Recordings stay in page memory. It records 'hear' and
'say' in the learner model; per-contrast misses, checked rules and shadowed lines live in localStorage
(cc-caves-<profile id>). `tools/check/test_caves.js` checks the pitch measure on synthetic tones and that every word
has a voice clip.
Pattern Reef, the fourth region, is `src/js/patterns-data.js` (twelve grammar patterns in learning order, each with
a plain-English explanation, examples and a practice round of notice / build / change / fix items; and `patFind`,
the mistake rules: particle form after a consonant or vowel by the 받침 of a known noun, -세요 about yourself,
있어요 for 주세요 when ordering, and Sino or long native numbers before a counter) and `src/js/patterns.js` (one
screen, S.view 'patterns': the list with mastery meters and "patterns to repair", a pattern's page, and its round;
the build item reuses Sentence Builder's `buildTokens` and look). Each answer records 'use' for its sentence.
Harbor Town runs `patNote` on its mistake answers and typed answers, and its debrief links to the pattern. Mastery,
rounds and slips live in localStorage (cc-patterns-<profile id>). `tools/check/test_patterns.js` checks the
particle rules, the mistake rules on right and wrong sentences, the shape of every item, and the voice clips.
Bottle Beach, the fifth region, is `src/js/beach-data.js` (지수's twelve letters, each with its words, sentence
starters, model answers and pre-written replies picked by the words in an answer; and `bbCheck`, the writing feedback:
what's right first, from the patterns used correctly (`bbGood`), polite endings and known words, then at most two
fixes, Pattern Reef's `patFind` rules first and then a possible spelling slip, a word one letter (jamo) away from one
in the dictionary) and `src/js/beach.js` (S.view 'beach': the bottles, writing by keyboard or tiles, the feedback,
지수's answer and the journal; its dictionary is Ask Shelly's beginner words, every region's words and her cards).
Sending records 'use' for each sentence the rules pass and counts slips in Pattern Reef. Letters live in
localStorage (cc-bottles-<profile id>). Its handwriting link opens the Library's Hangul tracing worksheet.
The Lighthouse, the sixth, is `src/js/light-data.js` (ten signs as rows of marked-up text, drawn by kind as styled
cards, each with two questions; eight manners notes) and `src/js/light.js` (S.view 'light': the list, a sign with
tap-a-word as in Story Lagoon and its questions, a note). Best scores and notes read live in localStorage
(cc-light-<profile id>). `tools/check/test_beach.js` checks the feedback, the data's shape and the voice clips.
Captain's Deck, the last, is `src/js/deck-plan.js` (no screen code: `deckPlan`, today's legs from a summary of her
progress, due review first, the course unit's deck, one input and one output leg, a skill leg only when something
is weak, at most four; the ten trip situations with the regions' content tagged to each; the can-do statements and
their tests; each course unit's checkpoint picks) and `src/js/deck.js` (S.view 'captain': `deckInput` reads the
learner model, My words, the course and every region's localStorage; tabs for today, the course as islands with
its checkpoint, and what you can do). Each region's finish point calls `deckTick(kind, id)`; a leg opens its region
at its item and sets S.deckBack, so `goHome()` returns to the deck (`deckBackHome`). A checkpoint's score goes
through the Library's own `courseAdjust` (exported on window.CoralLibrary). Today's voyage and checkpoint results
live in localStorage (cc-deck-<profile id>). `tools/check/test_deck.js` checks the planner and the tables.

## Grown-up checks

On GitHub and the private game preview, `reefGrownUpGate(kind)` shows a password form; successful local SHA-256 verification calls
`grownUpPassed(kind)`, which carries on to what was asked for (a grown-up profile, ending a session, Edit Mode,
...). Leaving a deck early on the child profile asks a subtraction question instead. Every check goes through
`renderPinPad(kind)`, which skips it in the Claude version (`reefNoPin()`) and inside a grown-up profile
(`reefInsideAdult(kind)`: only opening the profile and Manage Profiles ask). The Library asks the app through
`window.CoralCove.needsGrownUpCheck()`, so its Settings follow the same rules.

## Regional 3D boards

`src/js/region-boards.js` adapts the seven regions to Coral Cove's existing `reef3dMount` renderer and party engine. Front-page render functions call `regionBoardRender`; direct learning screens keep their existing content, learner records and audio. `regionBoardLaunch` opens a space's activity, and Activities keeps a direct list/dashboard available. Captain's Deck also preserves explicit tab links.

Zones carry a `region` descriptor and each learning destination carries `d.regionActivity`. The renderer shares characters, camera, dice, travel, shop, rewards, effects and quality controls; regional decoration is in `reef3d/region-scenery.js`. Regional ground and scenery replace the reef/wreck setting. `cc-region-board-at-<profile>-<region>` stores each region's position separately from Coral Cove. `region-boards.css` arranges regional navigation around the shared controls. The old standalone Harbor Town renderer has been removed.

`region-travel.js` owns the sailing overlay and runs the destination callback under a navigation lock; reduced motion uses a short fade. `regionBoardActivityCompleted` records only the board-launched activity's actual finish so returning rewards completion rather than visits. Regional scenery is baked into material/chunk meshes rather than adding separate live objects.

`reef3dUnmount` can park one idle regional renderer while its own list or lesson is open. Resume refreshes activity labels, tile states and HUD without rebuilding. Region/profile/theme/layout incompatibility or active effects dispose normally. Pending greeting timers are invalidated when parked. `window.__reef3dLoadPerf()` reports model timing, caustic builds, board builds and reuse. Model parsing yields between assets; lobby and Cove share caustic pixels, while regional worlds skip caustics. Songs stream when selected instead of warming the full playlist from the page; the service worker still precaches songs for offline use.

`region-scenery.js` supplies `window.regionBoardSpaces`. The shared board builder inserts the extra regional stops and `world-routes.js` spreads the closed circuits by arc length. Each of the seven regions adds 30% more plain tiles, 20% more learning tiles and 30% more combined ? and Chance tiles, rounded up per region. That adds two ? tiles and one Chance tile to each circuit. The builder maps older numeric saved spots to stable tile IDs under the same per-profile keys. Original ? block keys carry forward, and each added ? block has its own depletion key.

`region-practice.js` uses reviewed material from the regional lessons. The independent rehearsals let learners produce a line, repair part of a sentence, trim a draft or cite evidence from a sign before comparing a model. Rehearsals carry no due items and leave mastery and voyage completion to the existing lessons. Echo Caves also has a direct stop for the existing linking lesson.

Terrain and region-specific landmarks are baked in chunks. `region-people.js` owns visible merchants, Town residents, regional hosts, projected character controls and matching SVG portraits. `regionPeopleApproach` walks to the existing stop; `regionPeopleMeet` introduces its person on arrival; practice still calls `regionBoardLaunch` and the existing learning record and audio paths. Town renders a persistent character card; other learning screens receive a compact host portrait through `regionPeopleLessonSync`. Static people and stalls use baked merged meshes; one merchant can idle, and disposal releases only their owned geometry.

Town encounter openings reuse `TOWN_FOLK.nodes[start].t`; Jisu's Bottle Beach openings reuse `BB_BOTTLES` rather than maintaining another dialogue script. Korean and its English meaning replace the generic introduction, with explicit Listen/Stop through the existing Speech API. Opening a panel never requests audio. The intro owns its speech generation until Close, practice, encounter end or disposal; stale callbacks cannot update a replaced panel or stop a later lesson. Hosts without curated opening lines retain their English introduction. These introductions do not award progress.

`tools/check/npc_worlds_smoke.js` exercises world characters, approach and talk, matching lesson portraits, shop browsing and return without completion rewards. Music composition lives in `tools/compose_regions.py`; each 32-bar loop has a developed opening, varied return, contrasting middle and closing return. Every render starts with a fresh synth/reverb state and folds its tail into the opening. Existing day/night recordings are not regenerated.

`reef3d/resident-models.js` optionally replaces a nearby procedural resident with an authored GLB while retaining the actor root and hit target. The first detailed resident is the bored taxi squid. Requests and parsing are serialized, have a ten-second timeout, and are cancelled on disposal; stale results release their resources. The detailed model is visible only near the player or in its encounter, and its existing frame tick pauses while hidden, parked or in Calm Motion. `region-people.js` caches species-scaled bounds for tile clearance and labels; `encounter-stage.js` uses those bounds for small or wide subjects. The octopus's body-color reaction keeps its apron separate; Jisu's delivery effect is short-lived. `tools/check/region_people_actual_test.js` constructs the real procedural residents against generated routes in Node, and the resident/reaction tests exercise lifecycle, camera and resource cleanup. These checks do not establish mobile frame rates.

Each view can own several resident states in `regionPeople.residents`; `resident` aliases the first for existing diagnostics. The global fetch/parse slot remains serialized and the active encounter has priority. `REGION_RESIDENT_VALIDATED_IDS` explicitly enables new candidates after asset review; its current empty list keeps Jisu and octopus drafts out of the game. Authored octopus assets require an opaque base-color texture whose alpha stores a UV-aligned skin mask, marked by material extras `residentSkinMask: 'baseColorAlpha'`. Skin pixels can change pigment while clothing, eyes and suckers stay opaque and retain their colors. A missing mask preserves the procedural octopus. The mask contract needs a real semantic authoring/visual pass before activation.

`tools/check/region_boards_smoke.js` verifies shared-engine worlds and learning/board navigation and captures phone/tablet orientations in day/night. `window.__regionBoardView()` supplies read-only adapter diagnostics alongside the existing Reef 3D view diagnostics. Physical iPhone XS performance still requires a hardware check.

## 3D (the reef board and lobby)

- `reef3dBuild` builds the board scene from the decks (zones) and models; `attach()` puts it on screen.
- `reef3dWarm` compiles the effect shaders while the board loads, so the first star burst or dive doesn't pause.
- `reef3dQTick` lowers or raises picture quality (shadows, resolution) from the frame rate, but never during a
  hop, dive, dice roll or day/night switch.
- The party board (dice, shells, pearls, shop, minigames), story mode and the night shipwreck are sections
  inside `REEF 3D`.
- `REEF LOBBY` is the 3D profile picker. `REEF WORLD` is the 2D map used when 3D can't start.
- The three.js GLTFLoader is bundled inside the script, marked `THIRD-PARTY CODE`; don't edit it.

## Sound

The seven regional boards select `region-<id>-song.mp3` through `reefMusicTarget`; learning screens retain the quiet deck/timer music. `tools/compose_regions.py` renders the original scores with the MIT-licensed FluidR3 General MIDI soundfont, preserves loop tails, and normalizes them consistently. The service worker precaches all board music. `window.__reefMusicState()` exposes read-only target and playback levels for QA.

`Background music` picks a song per place (day reef, night ship, lobby, deck, timed cards, minigames). Spoken
answers use the voice packs in `voice/` on GitHub, recorded clips where they exist, and the device's voice
otherwise.

## Ask Shelly

The Ask Shelly button opens a chat about the card on screen. Offline answers come first: `askLocal` tries
Korean (`koLocalAnswer`, in `src/js/reef.js`) and then `words.js` (English and Chinese). `words-data.js` loads the
first time Ask Shelly opens. `tools/words/README.md` explains how the dictionary is built.

## The Library

`library.js` adds the Library's modes beside the board. It uses the app only through `window.CoralCove`
(search `window.CoralCove = {`): profiles, decks, cards, the store, speech and the grown-up check.

Its home is built around the profile's learning goals: deck subjects saved on the profile as `goals`, or until a
grown-up picks them in the Library's settings, the subjects of the profile's live decks (`profileGoals` in
`src/js/library-api.js`). Each goal has a list of activities in `goalPlan` (`library.js`); the first four are
today's plan, and what's done today is kept per profile on the device.

## Styles

`base.css` and `fixes-and-refresh.css` hold the app styles, in order of application, with the colour tokens as
custom properties on `:root` (each with its dark-mode value beside it). The fonts are `--font-display` (Fredoka)
and `--font-body` (Nunito Sans), from Google Fonts; `sw.js` saves them for offline use. `reef.css` and `reef-3d.css` hold the game
look: Child Mode, the board and the lobby. A later rule with the same selector wins, so look
for an existing rule before adding one; `tools/check/css_audit.py` reports values that are overridden.

## Tools

| Tool | Use |
| --- | --- |
| `tools/build.py` | Builds `index.html` from `src/` |
| `tools/check/run.sh` | Run before every push: build check, lint, style audit, word tests, browser smoke test |
| `tools/check/snapshots.js` + `compare.py` | Screenshots and computed styles of 16 screens, to compare before and after a change |
| `tools/build_claude.py` | Builds the Claude version into `build/` |
| `tools/export_seed.py` | Replaces the starting data with a database export from the Claude version |
| `tools/words/` | Builds the offline dictionary |
| `tools/compose_music.py` | Makes the songs |

After changing site files: run `python3 tools/build.py`, bump the cache name in `sw.js` (so iPads fetch the new
version), then run `sh tools/check/run.sh`.

## Resident detail and travel (November16)

The taxi keeps its7,999-triangle/1024-color board asset and lazy-loads the22,000-triangle/2048-color single-material close asset only for its own conversation. Encounter end restores the board model and disposes the close rig, textures and geometry. Future authored residents use the same `url`/`closeUrl` contract. All marine encounters receive a sharper canvas budget, with tier3 falling back to the ordinary450k-pixel cap under sustained pressure; ordinary boards keep their original budgets. The standalone taxi viewer uses the close asset and a900k-pixel cap. The portable16MiB edition keeps its embedded smaller resident asset and still uses sharper encounter rendering. Hops retain their phases and callback ordering at68% of the preceding duration.

The adult password uses a stored digest only; typed input is cleared, case-sensitive, never logged or saved, and asynchronous checks cannot act after cancellation, rerender or profile changes. Library settings share the same verifier. Child-mode early-exit arithmetic and the existing adult/portable skip rules retain their prior behavior. Browser gate checks take the password from `CORAL_GROWN_UP_PASSWORD` rather than putting it in source.
