---
name: coral-art-loop
description: Self-improving 5-stage Mario Party art-director loop for Coral Classroom maps, 3D interiors, and characters.
---

# Coral Classroom Self-Improving Art Loop

Run this 5-stage closed loop whenever iterating on 3D maps, interiors, or characters:

1. **North-Star Visual Reference (`work/art-loop/refs/`)**: Maintain target Mario Party 8 & Nintendo-style concept sheets for boards and cast so every critique compares against concrete visual quality rather than text-only checklists.
2. **Fast Multi-Angle Capture**: Render Blender CPU turntable proofs (`front`, `quarter`, `side`) for changed characters AND capture settled `1280×800` live muted browser screenshots of the exact gameplay camera & interiors.
3. **Independent Zero-Context Adversarial Critic (`work/art-loop/rubric.md`)**: Spawn a fresh, zero-context critic worker (pinned to `claude-opus-5-5-high` when quota is available, or `gemini-4-neon-xhigh` otherwise — never forked from the builder) to inspect every proof and live screenshot side-by-side against the North-Star & MP8 references using `read_file`. Score all 6 rubric dimensions (`0–10`) ruthlessly, hunt specifically for Critical Defects (floating feet/props, UV pole pinches on faces, counter clipping, cone trees, blank camera quadrants, unrefined flat polygons), and emit ranked Defect Tickets.
4. **Targeted Specialist Refinement**: Dispatch disjoint-ownership fixes for the lowest-scoring dimensions and all Defect Tickets, rebuild (`game/tools/build.py --check`), and run all 8 Node suites.
5. **Ledger & Rule Distillation (`work/art-loop/ledger.json`)**: Record numerical scores, remaining defects, and distilled engineering/art rules after every iteration until `weightedAverage >= 8.5` with `0` Critical Defects.
