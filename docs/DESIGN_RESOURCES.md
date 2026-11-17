# Design resources: what to take from the "20 repos" post

Source: a post by @anstapnever on X, November 16, 2026 ("these 20 GitHub repos will turn your Fable 5.2 into a full Design studio"). I read the post's full text and link list on November 17, 2026 through a public mirror of X's API. The post quotes a second post, an article about making motion-graphics video by having Claude write code. I read only its opening, and it isn't relevant to the game, so I skipped it.

This file is for the developer (Codex or Claude) working on Coral Classroom. It says which of the 20 are worth using here and which aren't, and how much I actually checked.

## Bottom line

The list is aimed at people building React or Tailwind websites, and some of it is hype. Coral Classroom is a vanilla JavaScript app with a three.js board, no framework, no build dependencies and no paid services, so **most of the list doesn't fit**. About six items are worth using, mostly as tools at development time, not as parts of the app:

1. **Lucide** for filling gaps in the drawn icon set.
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

### 3. Lucide for icon gaps

The app draws its own icons through `ccIcon(name)` and converts emoji it finds in the interface (`src/js/ui-icons.js`). Lucide is outline-style and ISC licensed, so individual SVG icons can be copied into the `ccIcon` table where the current set has no match. Check each one against the existing look first, since Lucide is monochrome outline and Coral Classroom's icons are softer and colored. Keep the ISC license notice in the repo when copying (a `THIRD_PARTY_NOTICES.md` would do).

### 4. agent-browser, as an option beside Playwright

`tools/check/smoke.js` already drives the app with Playwright and takes screenshots. agent-browser (Apache-2.0, a Rust CLI) lets an agent look at the page as text with a reference for each element, which is handy for checking the lesson screens, menus and dialogue UI quickly. It can't see inside the 3D canvas (the board, characters and scenery), so it doesn't replace the screenshots. Try it on one screen before deciding. The install needs `npm` and a Chrome download, so it fits in the container's setup, not in the game.

### 5. `frontend-design` as reading, for the lesson screens

It is a prompt-style skill about giving a screen a distinct point of view instead of templated defaults. The Library, deck grid and conversation screens are ordinary page elements, so it applies there. Read its `SKILL.md` first, and keep the game's own rules above it: drawn icons, natural voices, pastel marine look.

### 6. rembg for vocabulary pictures

`tools/vocab-pics` suggests the app has vocabulary pictures. rembg can cut backgrounds off new ones in one command, on a CPU. It downloads models the first time it runs. Check each model's license before shipping output, since I didn't.

## What not to do

- **Don't add React, Tailwind, shadcn or Magic UI.** It would mean rewriting a working vanilla JS app for no gain. Take ideas only.
- **Don't add services that need an account or a key** (Magic MCP, Stitch). The owner rules out paid services and wants the game to work offline.
- **Treat third-party skills and MCP servers as code that runs with your agent's permissions.** Read the `SKILL.md` and any scripts before installing, pin a specific commit, and never install from a post because it is popular. Anything they fetch is untrusted input.
- **Don't trust a list's descriptions.** Several lines in the post are marketing. This file separates what I read from what I didn't.

## Open questions for the owner

- Should Codex write the `DESIGN.md` now? It is cheap and would make the visual review easier to act on.
- Do you design anything in Figma or Penpot? If not, items 13 and 14 can be dropped.
