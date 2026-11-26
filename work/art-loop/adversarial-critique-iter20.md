# Adversarial Critique — Iteration 20 (`9.45 / 10`)

- **Critic**: `adversarial-critic-v20` (`#217`, `claude-opus-5-5-high`)
- **Weighted Average**: `9.45 / 10`
- **Severity Counts**: `CRITICAL: 0 | MAJOR: 0 | MINOR: 8`
- **Verdict**: `PASS` (clears 8.5 bar, below 9.6/9.8 target)

## Dimension Scores
- **D1 Silhouette**: `9.4`
- **D2 Eyes/Face**: `9.4`
- **D3 Grounding**: `9.5`
- **D4 Density**: `9.3`
- **D5 Craft**: `9.4`
- **D6 Runtime**: `9.8` (telemetry accepted; verified `<=0.94%` pure-white pixels, all UI/HUD)

## Scene Scores
- `intro-desktop`: `9.4` | `intro-mobile`: `9.3` | `coral-cove`: `9.3` | `harbor`: `9.5` | `restaurant`: `9.6` | `hotel`: `9.3` | `pharmacy`: `9.5` | `captains-deck`: `9.2` | `lighthouse`: `9.5` | `lagoon`: `9.5` | `caves`: `9.4` | `patterns`: `9.4` | `beach`: `9.5`

## Findings (MINOR: 8)
1. `hotel-whale` fluke fork doesn't read: shows as a short rounded lobe plus one long blade with no visible median V-notch (`proof quarter 330-570,270-345`; `04-hotel 740-910,210-280`).
2. `04-hotel`: whale's right pectoral fin tip is cut flat along the desk's back edge (`712-750,363-366`), reading as resting on/sinking into the counter. Raise the whale or angle the fin up `~0.05u`.
3. `06-captains-deck`: bare plank areas remain at `(300-460,290-400)`, `(540-650,60-200)`, and `(760-870,370-470)`.
4. `01-coral-cove`: settled capture had the menu dropdown open over `(838-1012,48-482)`. Recapture with menu closed.
5. `10-patterns` `Pip` in game (`~70px`): smile barely readable `(300-318,424-432)` and only one catchlight shows at this scale `(310-325,405-420)`.
6. `Pip` proof front: dorsal fin is a single thin quill `(300-340,95-250)` rather than a sculpted fin.
7. `09-caves` `Echo` beluga: pectoral fins are flat thin cards `(753-827,450-482)`.
8. `06-captains-deck` `captain-bay` walrus: stacked dome/egg silhouette with stub flippers `(610-725,285-385)`, weakest species silhouette in the cast.

## Passes
- Mira smooth muzzle, crisp chestnut smile, nostril dots & peach blush in both proofs.
- Pip sclera ring, large iris, twin catchlights, smile & blush in both proofs.
- Bok and hotel-whale irises `~76-78%`.
- Whale collar with gold piping & tapered shaded pectorals.
- Lagoon dock posts have foam/ripple contact rings (`~297-372,370-382`).
- Walrus has soft contact shadow on planks.
- Caves and patterns right edges filled with crystal and coral islands.
- Restaurant otter holds shell plate on open paw; shrimp grips bottle; Hana tentacles dip into pool; zero Critical/Major defects; zero face pinholes.
