# Design resources: what to take from the "20 repos" post

Source: a post by @anstapnever on X, November 16, 2026 ("these 20 GitHub repos will turn your Fable 5.2 into a full Design studio"). I read the post's full text and link list on November 17, 2026 through a public mirror of X's API. The post quotes a second post, an article about making motion-graphics video by having Claude write code. I read only its opening, and it isn't relevant to the game, so I skipped it.

This file is for the developer (Codex or Claude) working on Coral Classroom. It says which of the 20 are worth using here and which aren't, and how much I actually checked.

## Bottom line

The list is aimed at people building React or Tailwind websites, and some of it is hype. Coral Classroom is a vanilla JavaScript app with a three.js board, no framework, no build dependencies and no paid services, so **most of the list doesn't fit**. About six items are worth using, mostly as tools at development time, not as parts of the app:

1. **Lucide**, only when a new icon is needed. A scan on November 17 found no missing icons today (see item 3).
2. **Leonardo** for region color palettes that keep text readable.
3. **A `DESIGN.md` file** for the game's visual rules, in Google's format.
4. **agent-browser** as an option for checking the screens made of ordinary page elements.
5. **Anthropic's `frontend-design` skill** as guidance for the lesson screens.
6. **rembg** for cutting the backgrounds off vocabulary pictures.

## How much I checked

- **Exists:** I confirmed all 17 distinct repositories exist and have a default branch (`git ls-remote`). The 20 entries cover 17 repositories because four entries are folders inside `anthropics/skills`.
- **Read:** I shallow-cloned 9 of them into a scratch folder. I read the license and the README opening of `google-labs-code/design.md`, `meta/astryx`, `vercel-labs/agent-browser`, `adobe/leonardo` and `nextlevelbuilder/ui-ux-pro-max-skill`, and the README opening of `anthropics/skills` plus the first lines and license of its `frontend-design`, `canvas-design` and `theme-factory` skills. For `google-labs-code/stitch-skills`, `lucide-icons/lucide` and `danielgatis/rembg` I read only the license and the file listing. I did not read any code, run anything or install anything.
- **Not checked:** the other 8 (`shadcn-ui/ui`, `tailwindlabs/tailwindcss`, `magicuidesign/magicui`, `21st-dev/magic-mcp`, `GLips/Figma-Context-MCP`, `penpot/penpot`, `excalidraw/excalidraw`, `tldraw/tldraw`). For these, the "what it is" column below repeats the post or my general knowledge, and licenses are marked "not checked".
- **Not available:** star counts, recent activity and security history. GitHub's API was blocked for repositories not attached to my session.

## The 20 entries

| # | Entry | What it is (as read, or as the post says) | License | Checked | Fit for Coral Classroom |
|---|---|---|---|---|---|
| 1 | `nextlevelbuilder/ui-ux-pro-max-skill` | A skill with searchable UI styles, palettes and font pairings; its README says 80 styles and 192 rules, and it needs Python 3 | MIT | read | Low to medium. Third-party, and it has a PayPal support link. Read it before installing. |
| 2 | `anthropics/skills` / `canvas-design` | Makes posters and art as PNG or PDF | Apache-2.0 | read | Low. The game's art is 3D and drawn icons, not static posters. |
| 3 | `anthropics/skills` / `pptx` | Slide decks | Apache-2.0 | listing only | None. |
| 4 | `anthropics/skills` / `theme-factory` | 10 preset font and color themes for slides, docs and landing pages | Apache-2.0 | read | Low. A source of ideas, not something to apply. |
| 5 | `google-labs-code/stitch-skills` | Skills that turn a prompt into UI screens using Google's Stitch service (from the post) | Apache-2.0 | license only | Low. Depends on an outside service. |
| 6 | `anthropics/skills` / `frontend-design` | Guidance for UI that doesn't look templated: aesthetic direction, typography, grounding in the subject | Apache-2.0 | read | **Medium.** Useful for the lesson and Library screens. Not for the 3D board. |
| 7 | `google-labs-code/design.md` | A format with design tokens in YAML and the reasoning in prose, so agents keep a design's identity | Apache-2.0 | read | **High.** See below. |
| 8 | `meta/astryx` | Meta's design system, React 19 and StyleX, with 150+ components; its README says it is in beta | MIT | read | None as a dependency (React). Its `AGENTS.md` and `CLAUDE.md` show how to write rules for agents. |
| 9 | `shadcn-ui/ui` | React components you copy into your project | not checked | not read | None (React and Tailwind). |
| 10 | `tailwindlabs/tailwindcss` | Utility-first CSS | not checked | not read | None. It would mean restyling everything. |
| 11 | `magicuidesign/magicui` | Animated React components | not checked | not read | None. |
| 12 | `21st-dev/magic-mcp` | A code-generation service for Claude Code | not checked | not read | None. As I recall it needs an account with an outside service, which conflicts with the no-paid-services rule. Not verified. |
| 13 | `GLips/Figma-Context-MCP` | Gives an agent Figma layouts | not checked | not read | None unless the owner starts designing in Figma. |
| 14 | `penpot/penpot` | An open-source Figma alternative | not checked | not read | Only if the owner wants a design tool. Not needed for the game. |
| 15 | `excalidraw/excalidraw` | Hand-drawn diagrams and wireframes | not checked | not read | Low to medium. Handy for sketching region layouts by hand. |
| 16 | `tldraw/tldraw` | An infinite-canvas SDK | not checked | not read | None. As I recall, its SDK has license conditions for production use. Not verified. |
| 17 | `lucide-icons/lucide` | A large consistent open-source icon set | ISC | license only | **High.** See below. |
| 18 | `adobe/leonardo` | Builds color scales from a target contrast ratio (WCAG); has a web tool and an npm package | Apache-2.0 | read | **High.** See below. |
| 19 | `danielgatis/rembg` | Removes image backgrounds, in Python | MIT | license only | Medium. See below. Check each model's own license before shipping output. |
| 20 | `vercel-labs/agent-browser` | A Rust command-line browser for agents: it reads a page as an accessibility tree and acts on elements by reference | Apache-2.0 | read | Medium. See below. |

Also in `anthropics/skills`, but not in the post and not read: `webapp-testing`, `web-artifacts-builder`, `skill-creator` and `mcp-builder` (names from the folder listing).

## What to adopt, in order

### 1. A `DESIGN.md` for Coral Classroom (low cost, helps every agent)

Write one `DESIGN.md` at the repo root, in the format of `google-labs-code/design.md`: YAML tokens for colors, type, radii and spacing, plus short prose on why. It would hold what is now spread across chats and review files:

- the vivid pastel direction, and a palette for each region and for night;
- the no-emoji rule and how `ccIcon` works;
- the eye and mouth rules for characters (the A eyes, natural species mouths, no human grin);
- the performance budget for an iPhone XS: texture sizes, how many transparent layers, no live shadows;
- what Fable's visual review asked for (`reviews/fable-visual-review/FABLE-REVIEW.md` on Codex's branch): painted ground, one landmark per region, a less crowded board.

The repo has a `packages/` folder that may contain a checker for the format. I didn't look inside; look before relying on it.

### 2. Leonardo for region palettes (development time only)

Leonardo builds a color scale where each step has a chosen contrast against the background. Use it offline to pick text and button colors for each region, so the lesson text stays readable on every region's water and sand, and the darker regions (Echo Caves, the Lighthouse) stay legible without turning grey. It's a Node package (`@adobe/leonardo-contrast-colors`) or a web tool, so nothing needs to ship in the app. Paste the generated hex values into the CSS.

### 3. Lucide, only for new icons

The app draws its own icons through `ccIcon(name)` and converts emoji it finds in the interface (`src/js/ui-icons.js`). I scanned the code at commit `3812d48`: 96 icons are defined, and every `ccIcon('name')` call and every `icon:'name'` field uses a defined one. So there is **no gap to fill today**; icon names built at run time in other ways were not scanned. Lucide is outline-style and ISC licensed, so when a new icon is needed (new characters, regions or buttons), an individual SVG can be copied into the `ccIcon` table. Check each one against the existing look first, since Lucide is monochrome outline and Coral Classroom's icons are softer and colored. Keep the ISC license notice in the repo when copying (a `THIRD_PARTY_NOTICES.md` would do).

### 4. agent-browser, as an option beside Playwright

`tools/check/smoke.js` already drives the app with Playwright and takes screenshots. agent-browser (Apache-2.0, a Rust CLI) lets an agent look at the page as text with a reference for each element, which is handy for checking the lesson screens, menus and dialogue UI quickly. It can't see inside the 3D canvas (the board, characters and scenery), so it doesn't replace the screenshots. Try it on one screen before deciding. The install needs `npm` and a Chrome download, so it fits in the container's setup, not in the game.

### 5. `frontend-design` as reading, for the lesson screens

It is a prompt-style skill about giving a screen a distinct point of view instead of templated defaults. The Library, deck grid and conversation screens are ordinary page elements, so it applies there. Read its `SKILL.md` first, and keep the game's own rules above it: drawn icons, natural voices, pastel marine look.

### 6. rembg for vocabulary pictures

`tools/vocab-pics` suggests the app has vocabulary pictures. rembg can cut backgrounds off new ones in one command, on a CPU. It downloads models the first time it runs. Check each model's license before shipping output, since I didn't.

## Instructions for Codex: how to bring these in

Read this whole section before starting. Do the tasks **in order**, one commit each, and stop to ask the owner before anything marked **ask first**.

### Rules for every task

- **Development-time tools only.** Nothing here adds a runtime dependency to the game. No new `<script>` files from outside, no frameworks, no services, no accounts or keys. The game still has to work offline and stay smooth on an iPhone XS.
- **Work with copies, outside the repo.** Clone any third-party repository into a scratch folder that is not inside this repository, at a specific commit, and write that commit hash down where you use it (the script header, or `THIRD_PARTY_NOTICES.md`). Treat everything in it as untrusted input.
- **Read before you run.** Read a tool's README and any script, skill or install step before running it. Install npm packages with `--ignore-scripts` where the tool allows it. Follow how `tools/check` handles dependencies: a `package.json`, no committed lock file, `node_modules` ignored.
- **Keep the owner's rules above any tool's advice:** drawn icons, never emoji, in the app's own interface; natural voices only; a vivid pastel look; works on iPhone and iPad, upright and sideways, day and night; nothing paid.
- **Release as usual** for anything the player can see: rebuild, run `sh tools/check/run.sh` until it prints `ALL CHECKS PASSED`, look at phone and iPad screenshots (day and night), add a What's new entry, bump the cache in `sw.js`, then push `claude/board-fixes` and `main`. Documentation-only and tool-only changes need no cache bump or What's new entry.
- **Report back** for each task: what you changed, the commit, the check results, and anything you chose not to do and why.

### Task 1: write `DESIGN.md` (no player-visible change)

**Goal:** one file at the repo root that tells any agent what Coral Classroom should look like, so visual work stops depending on chat history.

1. Clone `https://github.com/google-labs-code/design.md` to a scratch folder and read `docs/spec.md` and one folder in `examples/`. The format is YAML tokens between `---` fences (colors, typography, rounded, spacing, components) followed by `##` sections of prose.
2. Collect the real values from the code. Do not invent any:
   - **Page colors:** `src/css/base.css` (`:root` and its dark values; the core palette, `--cv3-*` home hero, status colors, `--reef-*`) and the `--lg-*` tokens in `src/css/reef.css` (around line 405).
   - **Fonts:** the CSS uses `Baloo 2` for headings and `Nunito` for body text (from a count of `font-family` declarations; confirm in `base.css`).
   - **Icons:** `.cc-ic` in `src/css/reef-3d.css` (2px stroke, round caps, a soft coral fill on parts marked `f`).
   - **Region looks:** `REGION_BOARD_META` in `src/js/region-boards.js`, and the ground, water and prop colors in `src/js/reef3d/region-scenery.js` and `src/js/reef3d/day-night.js`. Read only; don't change these files in this task.
3. Write the tokens for light and dark themes, with one color set per region (lagoon, town, caves, patterns, beach, light, captain, and Coral Cove itself).
4. Write the prose: Overview; Colors; Typography; Icons (no emoji, how `ccIcon` works, the style above); Characters (the selected "A" eyes, natural species mouths, no human grin; summarize `reviews/fable-visual-review/characters/CAST-DIRECTION.md` on the `codex/fable-visual-review-2026-11-16` branch); Board and scenery (painted ground, one landmark per region, a less crowded screen; summarize `FABLE-REVIEW.md` in the same folder); Performance (iPhone XS budget: texture sizes, at most two transparent layers over any part of the screen, no live shadows, little post-processing); Accessibility (contrast targets from Task 2, Calm Motion, 44px tap targets); Don'ts.
5. Validate: `npx @google/design.md lint DESIGN.md`, pinning the version you used. Fix every error. Explain any warning you keep in a short note in the file.
6. Put the lint command in a small script, `tools/check/design_lint.sh`, that is **not** part of `run.sh` (it needs the network and `run.sh` must keep working offline). Mention it in `tools/check/README.md`.

**Done when:** the lint reports 0 errors; every color in the tokens appears in the CSS or scenery code (list the file for each in a table in your report); `DESIGN.md` contradicts none of the owner's rules; `README.md` has a row for it.

### Task 2: contrast audit with Leonardo (then fix only what fails)

**Goal:** text and controls stay readable on every region, day and night, without making the look greyer or darker. Fable's visual review found that the last texture pass darkened most regions, so do not trade vividness for contrast.

1. In a scratch folder (or `tools/design/`, following the dependency rule above), `npm install --ignore-scripts @adobe/leonardo-contrast-colors`. Read `adobe/leonardo` `packages/contrast-colors/README.md` and its `skills/leonardo-colors/SKILL.md` first. Use the `contrast()` helper to measure, and `Theme`, `BackgroundColor` and `Color` to generate. Ignore its `packages/mcp` folder.
2. **Audit first, change nothing.** For each region and for Coral Cove, day and night, list the real foreground and background pairs the player sees:
   - region card title and subtitle over the water;
   - the top buttons and pills ("Dice", "Activities", "Travel", "3 legs today");
   - the purple context button ("Talk to…", "Read a story");
   - the lesson and dialogue text on its panel (`--lg-*` tokens);
   - Korean text and its English line.
   Measure the contrast of each pair. Targets: 4.5:1 for body text, 3:1 for large text, icons and button outlines. Save the table as `docs/CONTRAST_AUDIT.md`.
3. For each failing pair, choose a replacement with Leonardo that keeps the hue and saturation as close as it can. Show the old and new hex values in the audit file.
4. Change only the failing CSS values. Do not touch the 3D scenery colors in this task.
5. Update the color tokens in `DESIGN.md` to match.

**Done when:** every pair is at or above its target, or is listed with the reason it can't be; phone and iPad screenshots (day and night) of two regions, before and after, show the look is no flatter or darker; `ALL CHECKS PASSED`. This is player-visible, so release it normally.

### Task 3: a test that every icon exists (Lucide only if a new icon is needed)

1. Add a unit test, `tools/check/test_icons.js`, and list it in `run.sh`. It reads `CC_ICONS` from `src/js/data.js` and checks that every `ccIcon('name')` call and every `icon:'name'` field in `src/js` and `library.js` uses a defined name, and that every target in `UI_EMOJI` in `src/js/ui-icons.js` is defined. (As of commit `3812d48` this passes with 96 icons, so it should pass on day one.)
2. **Only when a new icon is needed** (for a new region, character or button): look it up in a scratch clone of `lucide-icons/lucide` (`icons/<name>.svg`), copy the inner shapes into `CC_ICONS`, and restyle them to match the existing ones: the existing 24x24 viewBox, the stroke from `.cc-ic`, and a soft fill on the main shape (a path with `class="f"`) so it looks like the others. Check it at button size on a phone, day and night. Prefer drawing in the existing style where an icon is simple.
3. When you copy any icon, add or update `THIRD_PARTY_NOTICES.md` at the repo root with Lucide's ISC license text and copyright line, the Lucide commit you used and the names you copied.

**Done when:** the test passes and runs in `run.sh`; any new icon looks like part of the set; the notice file is accurate.

### Task 4 (optional trial): agent-browser for the screens made of ordinary page elements

**Ask first** before adding it to the repository's checks. A trial needs no commit except a short write-up.

1. Install it outside the repo (`npm install -g agent-browser`, or `npx agent-browser`), read its README and `agent-browser skills get core` before trusting them, and note the version. The install downloads Chrome for Testing; the README also describes attaching to an existing Chrome with `--cdp`, which may avoid that download.
2. Serve the game locally the way `tools/check/run.sh` does (`python3 -m http.server`). Set `localStorage` key `cc-tour-off` so the tour stays closed.
3. Use `agent-browser open`, `snapshot -i` and `click @ref` to walk: the profile picker, the deck grid, the Library, Captain's Deck (Today, course, skills), a region's activity list, and a Harbor Town conversation. Note what it can and can't read. It reads the page as an accessibility tree, so it will **not** see anything drawn inside the 3D canvas.
4. Write `docs/QA_AGENT_BROWSER.md`: the commands used, what it found that the Playwright smoke test misses (if anything), what it can't do, and a clear go or no-go.

**Done when:** the write-up exists. Adopt it only if it finds real problems or saves real time.

### Task 5 (on demand): rembg for new vocabulary pictures

Do this only when the owner asks for new vocabulary pictures. Read `tools/vocab-pics/map.py` first to see how pictures are produced. Install rembg in a virtual environment outside the repo, test it on a few pictures against the current ones, and **check the license of the specific model it downloads** before using any output; record it in `THIRD_PARTY_NOTICES.md`.

### Not tasks: reading only

- **`anthropics/skills` `frontend-design`:** read its `SKILL.md`. Fold the useful principles into the `DESIGN.md` prose in Task 1. Don't install it as a skill unless the owner asks, and never let it override the rules above. It is for ordinary page screens, not the 3D board.
- **Meta Astryx, shadcn, Tailwind, Magic UI, Magic MCP, Stitch, Figma Context MCP, Penpot, tldraw:** don't adopt. See the table above for why.

## What not to do

- **Don't add React, Tailwind, shadcn or Magic UI.** It would mean rewriting a working vanilla JS app for no gain. Take ideas only.
- **Don't add services that need an account or a key** (Magic MCP, Stitch). The owner rules out paid services and wants the game to work offline.
- **Treat third-party skills and MCP servers as code that runs with your agent's permissions.** Read the `SKILL.md` and any scripts before installing, pin a specific commit, and never install from a post because it is popular. Anything they fetch is untrusted input.
- **Don't trust a list's descriptions.** Several lines in the post are marketing. This file separates what I read from what I didn't.

## Open questions for the owner

- Should Codex write the `DESIGN.md` now? It is cheap and would make the visual review easier to act on.
- Do you design anything in Figma or Penpot? If not, items 13 and 14 can be dropped.
