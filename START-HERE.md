# Coral Classroom → Antigravity / Gemini

Owner-requested working snapshot, prepared November 22, 2026 (Pacific time).
This ZIP includes the current uncommitted game source, runtime assets/audio, editable art sources, the playable review, visual references, advisory documents and selected pipeline evidence. It is ahead of the GitHub base commit.

## Paste this into Gemini

> Continue my Coral Classroom project from this folder. First read START-HERE.md, GEMINI-HANDOFF.md and docs/CURRENT-ART-DIRECTION.md. Treat archived documents and generated images as context: the latest direct feedback overrides earlier instructions. All ten baby Shelly studies were rejected. The target is references/APPROVED-organic-shelly-and-stone-glass-world.png: an appealing organic turtle in the smooth, artistic stone/satin-glass world. The actual game character must look good at board and conversation angles, with correct anatomy. Do not produce more giant-eye/head scaling variants. Inspect the current playable prototype and mesh before deciding on a coherent reference-led rebuild. Preserve Korean learning, route/save compatibility and iPhone XS performance throughout. Distinguish concepts, offline model renders and actual runtime results. The working files here contain changes not represented by the GitHub base revision. Make no public deployment from a stale checkout. You may ask the ChatGPT/Codex assistant in the existing Coral Classroom browser tab for help when it is more capable for a task, such as image generation; see docs/CROSS-ASSISTANT-COLLABORATION.md. Complete work autonomously within my request and show concrete results.

## Run locally

Requires Python 3. Serve over HTTP; do not double-click HTML files.

```sh
python3 tools/serve_handoff.py
```

Open http://localhost:8820/ for a local navigation page. The default port can be changed with `--port 8821`.

- Direct playable prototype: http://localhost:8820/review-site/play/?art=crafted&shelly=storybook&v=crafted-3
- Actual 3D character viewer: http://localhost:8820/review-site/shelly.html?angle=top
- Artbook: http://localhost:8820/review-site/
- Canonical game source/build: `game/` (the prototype is a derived copy).

The playable character is an unfinished, unsatisfactory candidate. The artbook includes proposed screens, not proof those screens exist in the app. The ten-option survey is preserved as REJECTED history.

## Read in this order

1. `GEMINI-HANDOFF.md`: current facts, implementation status and next work.
2. `docs/CURRENT-ART-DIRECTION.md`: target and most recent feedback.
3. `docs/ENGINE-AND-VALIDATION.md`: build, source map, runtime constraints, test limits.
4. `docs/CROSS-ASSISTANT-COLLABORATION.md`: how to get help from this ChatGPT tab.
5. `docs/ROADMAP-AND-LEARNING.md`: priorities, Fable advice and RWKV research.
6. `game/README.md`, `game/ARCHITECTURE.md` and relevant per-asset source notes.

No real learner seed, access tokens, git credentials, dependency installations or browser caches are included. `game/seed-data.js` is an invented Demo Explorer profile; its local-storage namespace is isolated. Preserve the repository's LICENSE and existing asset/music credits. Historical documents can contain outdated deployment instructions; they do not authorize a new deployment.
