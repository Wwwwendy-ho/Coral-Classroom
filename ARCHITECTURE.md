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

## Start-up

1. The head loads `seed-data.js`, `audio-clips.js`, `storage.js` (which creates `window.claude.use('db')` when
   Claude's doesn't exist), `library.js` and `words.js`, and registers `sw.js`.
2. The main script defines everything, then the `boot` section opens the store, loads settings and profiles,
   and calls `render()`.
3. The title screen (`renderSplash`) floats over the profile picker until it is tapped; that tap starts the
   music, because browsers only allow sound after a tap.
4. Picking a profile loads its decks. Child profiles open the reef board (`REEF 3D`); grown-up profiles open
   the deck list after the grown-up maths question.

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

There is no PIN. On GitHub, `reefGrownUpGate(kind)` shows a times question; a right answer calls
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
