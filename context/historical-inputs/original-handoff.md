# Coral Classroom: handoff

This brief is for the agent taking over Coral Classroom. It covers what the project is, how it's built, the owner's rules, what's done, and what comes next. Read it fully before changing anything.

## The project

Coral Classroom is a web app for learning Korean, built as a 3D board game in the style of Mario Party. It runs from GitHub Pages and is used as a Home Screen app on an iPhone XS and an iPad.

- **Repo:** https://github.com/Wwwwendy-ho/Coral-Classroom (renamed from `coral-cove`, which still redirects).
- **Work branch:** `claude/board-fixes`. `main` is what GitHub Pages serves. Both are at the same commit.
- **Live site:** https://wwwwendy-ho.github.io/Coral-Classroom/ (the capital letters matter).
- **The owner** is learning Korean to be conversational on a trip to Korea. There is also a child profile used for non-Korean learning.
- **Design doc:** "Coral Classroom: language learning architecture" (a Claude Doc). Its content is summarized below, and `ARCHITECTURE.md` in the repo covers the code.

## Rules from the owner (always follow)

1. **No AI attribution in git.** Commits and pull requests get no Co-Authored-By line, no session links and no "Generated with…" line.
2. **Finished, tested work goes live on its own.** Run every check, bump the service worker cache, commit, then push to both `claude/board-fixes` and `main`. Afterwards, confirm the live `sw.js` shows the new cache name.
3. **Works offline, without paid services.** Avoid depending on an AI service at runtime, and don't use paid models or services. Content and voices are made ahead of time and shipped with the app.
4. **Natural human voices only, never the robot voice.** Every spoken line has a pre-recorded clip.
5. **Drawn icons, never emoji, in the app's own interface.** Use `ccIcon(name)`. `src/js/ui-icons.js` converts known emoji as screens render.
6. **Works on iPhone and iPad, upright and sideways.** It must stay smooth on an iPhone XS.
7. **Check your work visually.** Take Playwright screenshots on phone and iPad, day and night, and look at them before releasing.
8. **Every release gets a short "What's new" walkthrough.** Add an entry to `REEF_WHATS_NEW` in `src/js/whats-new.js`.
9. **Music, visuals and UX get as much attention as the learning.**
10. **Board tiles follow Mario Party** (blue, red, ?, Chance Time, shop, minigame, star). What a tile asks of you changes with the region.
11. **Use smooth transitions.** Keep the language plain and the spelling American.
12. **Never store or write down the owner's app PIN** anywhere.

## How the code works

- **Edit `src/`, never `index.html`.** `src/page.html` lists the includes, and `python3 tools/build.py` builds `index.html` from them.
- **The files in `src/js/*.js` share one function scope** when built: there are no modules, and function names must not clash. `library.js`, at the repo root, stands alone and is versioned with `?v=` in `page.html`. The bridge between the two is `window.CoralCove` (in `src/js/library-api.js`) and `window.CoralLibrary`.
- **3D:** three.js r128 (`three.min.js`), in `src/js/reef3d/`:
  - `board.js`, `scenes.js` (the ship), `party.js` (map travel, the treasure map), `dice.js`;
  - `post.js` (bloom, tilt-shift, color grade; switched off at quality level 2 and above);
  - `life.js` (beam, orbiting lights, confetti);
  - `seamap.js` (the sea chart of all regions, `REEF_REGIONS`).
- **Learner model:** FSRS-4.5 (`src/js/fsrs.js`, `src/js/learner.js`), with five channels per word: hear, read, recall, say and use. It's stored in localStorage under `cc-learner-<profileId>`.
- **Regions** (each has a data file and a screen file):

  | Region | Files | What it teaches |
  |---|---|---|
  | Coral Cove | the board itself | flashcards |
  | Story Lagoon | `lagoon.js`, `lagoon-stories.js` | 12 stories |
  | Harbor Town | `town.js`, `town-talks.js` | 8 branching conversations |
  | Echo Caves | `caves.js`, `caves-sounds.js` | sound pairs, shadowing with pitch |
  | Pattern Reef | `patterns.js`, `patterns-data.js` | 12 grammar patterns |
  | Bottle Beach | `beach.js`, `beach-data.js` | writing, a pen-pal called Jisu |
  | The Lighthouse | `light.js`, `light-data.js` | real signs, manners |
  | Captain's Deck | `deck-plan.js` (pure planner), `deck.js` (screen) | today's voyage, your course, what you can do |

- **Voice:**
  - The `voice/` folder holds packed MP3s plus `voice/index.json`, where keys are `"variant|text"`.
  - Korean uses the SNAP Piper Korean model (speaker 2). Pronunciation is handled by `tools/voice/ko_g2p.py`.
  - English uses Kokoro (`tools/voice/gen.py`, `harvest.py`, `pack.py`).
  - Any new spoken line needs a clip generated and packed.
- **Checks:** run `sh tools/check/run.sh`, and only release when it prints `ALL CHECKS PASSED`. It runs:
  - the build check, lint and the CSS audit;
  - unit tests for word help, FSRS, Harbor Town, Echo Caves, Pattern Reef, Bottle Beach and Captain's Deck;
  - a Playwright smoke test, which sets `cc-tour-off` so the What's new tour stays closed.

  First-time setup: `cd tools/check && npm install && npx playwright install chromium`, then `pip install tinycss2`.
- **Releasing:**
  1. Bump `CACHE` in `sw.js` (format `coral-classroom-YYYYMMDDx`).
  2. Rebuild, run the checks, commit, and push both branches.
  3. Add a `CHANGELOG.md` entry, and update `ARCHITECTURE.md` when the structure changes.

## Status

All 8 phases of the architecture are built and live (latest cache: `coral-classroom-20261109a`).

1. Shared learner model and the sea chart
2. Everything feeds Coral Cove (a My words tile; review in the way you're weakest)
3. Story Lagoon
4. Harbor Town
5. Echo Caves
6. Pattern Reef
7. Bottle Beach and the Lighthouse
8. Captain's Deck: a daily voyage of 3–4 legs across the regions, the course as islands with an optional checkpoint, and a "What you can do" report with trip readiness for 10 situations.

**Known small issues:**

- The floating Ask Shelly button overlaps content on iPhone in the regions and on Captain's Deck.
- The "What you can do" tab label wraps on a 375px-wide phone.
- The voyage is planned once per day, the first time the board loads.
- A leftover branch, `worktree-agent-aa22b1a48239a7aee`, can be deleted on GitHub.

## What's next (drafted, not built)

Before starting on these, read the review below: it suggests a different order. Ask the owner which order to follow.

The design doc has three draft sections:

- **Region maps.** Each region becomes its own playable board, with 30–40 spaces on a tall loop, 1–2 forks, a night version, and a way through to neighboring regions. All boards are drawn by one data-driven board engine.
  - Captain's Deck: a ship's deck split into 7 sections, one for each weekday.
  - Story Lagoon: stepping stones that fork at story choices.
  - Echo Caves: a spiral of crystals that ring a note when you land on them.
  - Harbor Town: streets in a figure eight.
  - Pattern Reef: coral terraces you climb.
  - Bottle Beach: a shoreline where the tide changes the path.
  - The Lighthouse: a cliff path that switches back and forth up to the lighthouse.
- **New characters.** Most come from Korean folklore and culture.
  - Players who roll with you: Tokki the rabbit (from the folk tale 별주부전), Kkachi the magpie (speaks casual Korean), and Bada, a seal pup who makes your mistakes.
  - Region hosts: Captain Gorae the whale, Sudal the otter, Dal and Ttal (twin shrimp named after a sound pair), Muno the octopus, the Harbor Town townsfolk with names, Sora the hermit crab, and Halmeoni Sun, a retired haenyeo diver. Her stories need careful, respectful research.
  - Characters seen everywhere: Bok the pufferfish runs the shop, a dokkaebi hosts Chance Time, and the Dragon King gives out stars.
- **Character voices.**
  - Plan: design each character's voice once with VoxCPM2, which supports Korean but needs minutes per sentence on a CPU. Then copy that voice for every line with OmniVoice, which runs on a CPU.
  - Not yet checked: Korean quality compared with Piper, speed, and the model licenses. The OmniVoice GGUF build is non-commercial only, so don't use it.
  - VoiceStudio (debpalash/VoiceStudio, AGPL) is just a wrapper app around these models.

**Open decisions for the owner:**

- whether each board gets its own song or a version of one shared theme;
- whether each board's loop should match the course's week;
- how to judge the learner's speech: on-device pitch only, or a speech service, which would mean recordings leave the device.

**Later:**

- a music and visual polish pass (a song and soundscape for each region);
- fixing the Ask Shelly overlap;
- generalizing the board engine.

## Independent review (Fable)

A second model (Fable) reviewed the design doc and the code on November 11, 2026. It read them but did not run the app. I spot-checked the storage and offline claims against the code, and they hold:

- every release bumps the cache, and the service worker deletes all older caches;
- the voice folder is 54 MB;
- the seed data is 561 KB.

**Its recommended order replaces "build all the boards next":**

1. **Watch about two weeks of the owner's real use** before building more. Six regions shipped within five days, so there's almost no usage data yet.
2. **Have a fluent speaker review the Korean.** Everything was drafted by AI and is being memorized through spaced repetition.
3. **Add 5–10 times more content, with more voices.** The regions hold about 5,700 Korean words in all, and Story Lagoon only about 1,000. All Korean is a single synthetic voice. The story picker aims for 90–95% known words, but with only 12 stories it has almost nothing to choose from. Training with many speakers works better for new sound contrasts. Also add a ramp in listening speed up to natural and fast speech; today there is only a 0.7× "slower" option.
4. **Sync progress between devices.** The iPhone and the iPad each keep their own learner model, and the only bridge is a manual backup that replaces everything.
5. **Build one pilot board, Harbor Town,** on a data-driven engine. Measure frame rate and memory on an iPhone XS before deciding on the other boards. Keep Captain's Deck as a screen you reach in one tap. Boards don't add content, and the dice and hops between items reduce time spent learning.
6. **Then do the music polish pass, and character voices last.** Spend new voices on learning first: sound pairs with several speakers, and stories.

**Architecture problems to fix as content grows:**

- **The "content graph" in the doc doesn't exist in code.** Links are hand-written tables (`DECK_SITS`, `DECK_UNITS`) and regexes over English can-do text (`DECK_CANDO_RULES`). Learner items are keyed by their surface text, so 커피 and 커피를 count as separate words.
- **Regions keep their own records, despite what the doc says.** Sound misses, pattern mastery, letters and sign scores live in per-region localStorage keys (`cc-caves-`, `cc-patterns-` and so on), outside the learner model and with no schema versions.
- **Storage won't scale.** `storage.js` rewrites the whole database as one JSON string on every save, against a quota of about 5 MB. Learner save failures are swallowed silently. Move to IndexedDB.
- **Offline isn't guaranteed.** Voice packs aren't precached; they're cached only once played online. Each release's cache bump wipes the cached songs and packs. Add an explicit, verified offline download.
- **There are two schedulers.** SM-2 drives the decks, while FSRS only shadows them and drives My words. The five-channel signals are noisy: grades are mostly binary, a tap on a word counts as a "read" lapse, and "hear = good" is inferred from not opening the English.
- **The shared scope is a risk.** About 20,000 lines run in one closure with a global `S`. Builder agents working with partial context will collide on names. New regions should be modules with a narrow interface.
- **Some testing is missing:** storage migrations, device performance, and screen logic beyond the smoke test.

**Learning gaps:**

- **Harbor Town mostly asks you to recognize answers.** You pick from 2–3 options. Ask for typed or spoken recall before the options appear.
- **Free speech-to-text:** try dictation with the iOS Korean keyboard.
- **Real conversation:** the app should suggest free language-exchange conversations with real people, outside the app.
- **Missing grammar:** the connectives -고, -아서 and -지만; 이에요/예요; -(으)ㄹ게요; and understanding the honorific and 합니다 forms that staff actually use.
- **Expectations:** the app alone probably reaches confident survival exchanges in the 10 trip situations, not full conversation.

**On the drafts:**

- **Echo Caves crystals:** cut "crystals tuned to the pitch of the word." Standard Seoul Korean has no word-level pitch accent. Keep the pitch shown during shadowing, which is about sentence intonation. In Seoul Korean, pitch also helps tell 달, 탈 and 딸 apart, which Fable noted but didn't check against the current voice. (This note is mine, not Fable's.)
- **Night versions** of every board double the art cost.
- **Kkachi:** her casual 반말 needs explicit framing, so the learner doesn't copy it with strangers.
- **Halmeoni Sun:** consider a plain 할머니 lighthouse keeper instead of a haenyeo. The haenyeo are a real, living Jeju community, which carries a risk of misrepresenting them. If she keeps a name, use Korean order (순 할머니).
- **The dokkaebi:** avoid the horned, oni-like look, which Fable believes is criticized as Japanese-derived (it wasn't certain).
- **Scope:** about 14 new characters, each with a model and a voice, is a big cost in work and memory.
- **Character voices:**
  - The licenses are unread.
  - Cloned voices need the same pronunciation check and a fluent listener as the current voice.
  - At minutes per sentence on a CPU, making thousands of clips per voice takes days.
  - "Natural voices" are currently met by TTS, not human recordings.

Each point above comes from the code, the doc, or Fable's own judgment. The ones from judgment are medium confidence.

## How to work

- Read `ARCHITECTURE.md` and the relevant `src/js` files before changing anything. Make targeted patches, not rewrites.
- Write Korean carefully: check particles, speech levels and pronunciation rules. A fluent speaker should eventually review the core trip phrases.
- After a change: rebuild, run the checks, look at screenshots (phone and iPad, upright and sideways, day and night), add a What's new entry, bump the cache, then commit and push both branches.
