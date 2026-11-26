"""Harbor Town regional soundtrack builder (region-town-song, region-town-night-song)."""

import math

TRACKS = [
    {
        "name": "region-town-song",
        "region": "town",
        "mode": "day",
        "title": "Harbor Town (Day)",
        "key": "G Major",
        "key_midi": "G",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 118,
        "swing": 0.14,
        "description": "Upbeat boardwalk accordion, nylon guitar, flute & brass swing.",
    },
    {
        "name": "region-town-night-song",
        "region": "town",
        "mode": "night",
        "title": "Harbor Town (Night)",
        "key": "G Major",
        "key_midi": "G",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 88,
        "swing": 0.12,
        "description": "Lantern-lit detuned tine EP jazz lounge, muted trumpet, vibraphone & brush groove.",
    },
]

# 48 bars: Intro/Hook (4) -> A (8) -> A' (8) -> B (8) -> C (8) -> A'' (8) -> Turnaround (4)
_SECTIONS_DAY = (
    ("intro", "Imaj6 V/vi vi7 V7"),
    ("A", "I V/vi vi IV ii7 V7 I6 II"),
    ("Ap", "I6 V/vi vi7 IV ii7 V7 I V7"),
    ("B", "IV iv I6 II ii7 V7 I6 V7"),
    ("C", "I V/vi vi IV ii7 II Vsus4 V7"),
    ("App", "I V/vi vi7 IV ii7 V7 I6 V7"),
    ("turn", "IV ii7 I6 V7"),
)

_SECTIONS_NIGHT = (
    ("intro", "Imaj9 V/vi ii9 V13"),
    ("A", "Imaj9 iii vi9 ii9 V13 Imaj7 ii9 V13"),
    ("Ap", "Imaj9 V/ii ii9 V13 iii V/vi ii9 V9"),
    ("B", "IVmaj7 iv7 iii V/ii iim7b5 V7 vi7 V9"),
    ("C", "ii9 V13 Imaj9 vi9 iim7b5 V7 Imaj9 V13"),
    ("App", "Imaj9 iii vi9 ii9 V13 Imaj7 iim7b5 V9"),
    ("turn", "ii9 bVImaj7 ii9 V13"),
)

# Events: beat,semitone_step_from_tonic,dur,strong_snap(1=snap to chord tone, 0=keep chromatic neighbor)
# All offbeats strictly on .5 so Score._swing_beat shifts them cleanly without .75 clashes.
_MOTIF_HOOK_TEXT = (
    "0,-5,.45,1 0.5,4,.85,1 1.5,2,.45,0 2.0,0,.45,1 2.5,-1,.40,0 3.0,0,.82,1 | "
    "0,-1,.45,1 0.5,4,.85,1 1.5,2,.45,1 2.0,-1,.45,1 2.5,-4,.42,1 3.0,-1,.78,1 | "
    "0,-3,.45,1 0.5,0,.45,1 1.0,2,.40,0 1.5,4,.85,1 2.5,7,.82,1 3.5,4,.32,1 | "
    "0,5,.45,1 0.5,2,.45,1 1.5,0,.40,0 2.0,-1,.82,1 3.0,2,.78,1"
)

_MOTIF_A_TEXT = (
    "0,-5,.45,1 0.5,4,.85,1 1.5,3,.38,0 2.0,4,.45,1 2.5,2,.42,0 3.0,0,.80,1 | "
    "0,-1,.45,1 0.5,4,.85,1 1.5,2,.45,1 2.0,-1,.45,1 2.5,-4,.42,1 3.0,-1,.78,1 | "
    "0,-3,.45,1 0.5,4,.85,1 1.5,7,.85,1 2.5,6,.38,0 3.0,7,.80,1 | "
    "0,5,.45,1 0.5,9,.85,1 1.5,7,.45,1 2.0,5,.45,1 2.5,4,.42,0 3.0,2,.80,1 | "
    "0,2,.45,1 0.5,5,.85,1 1.5,4,.45,1 2.0,2,.42,0 2.5,0,.45,1 3.0,-1,.80,1 | "
    "0,-1,.45,1 0.5,7,.85,1 1.5,5,.45,1 2.0,4,.45,1 2.5,2,.45,1 3.0,0,.80,1 | "
    "0,-5,.45,1 0.5,0,.45,1 1.0,2,.42,0 1.5,4,.85,1 2.5,7,.82,1 3.5,4,.32,1 | "
    "0,6,.45,1 0.5,9,.85,1 1.5,7,.45,1 2.0,6,.45,1 2.5,2,.82,1"
)

_MOTIF_B_TEXT = (
    "0,5,.45,1 0.5,9,.85,1 1.5,7,.45,1 2.0,5,.45,1 2.5,4,.45,1 3.0,0,.80,1 | "
    "0,3,.45,1 0.5,8,.85,1 1.5,7,.45,1 2.0,5,.45,1 2.5,3,.45,1 3.0,0,.80,1 | "
    "0,-1,.45,1 0.5,4,.85,1 1.5,7,.85,1 2.5,4,.45,1 3.0,2,.80,1 | "
    "0,2,.45,1 0.5,6,.85,1 1.5,9,.85,1 2.5,7,.45,1 3.0,4,.80,1 | "
    "0,5,.45,1 0.5,8,.85,1 1.5,5,.45,1 2.0,3,.45,1 2.5,2,.45,1 3.0,0,.80,1 | "
    "0,-1,.45,1 0.5,2,.45,1 1.0,5,.45,1 1.5,9,.85,1 2.5,7,.45,1 3.0,5,.80,1 | "
    "0,4,.45,1 0.5,7,.85,1 1.5,4,.45,1 2.0,2,.45,1 2.5,0,.45,1 3.0,-3,.80,1 | "
    "0,-1,.45,1 0.5,2,.85,1 1.5,5,.85,1 2.5,2,.45,1 3.0,-1,.80,1"
)

_SOLO_C_TEXT = (
    "0,4,.45,1 0.5,7,.85,1 1.5,9,.45,1 2.0,7,.45,1 2.5,4,.45,1 3.0,0,.80,1 | "
    "0,-4,.45,1 0.5,-1,.45,1 1.0,2,.45,1 1.5,4,.85,1 2.5,2,.45,1 3.0,-1,.80,1 | "
    "0,-3,.45,1 0.5,4,.85,1 1.5,7,.45,1 2.0,6,.40,0 2.5,7,.45,1 3.0,9,.80,1 | "
    "0,5,.45,1 0.5,9,.85,1 1.5,7,.45,1 2.0,4,.45,1 2.5,0,.45,1 3.0,2,.80,1 | "
    "0,2,.45,1 0.5,5,.85,1 1.5,7,.45,1 2.0,5,.45,1 2.5,4,.45,1 3.0,2,.80,1 | "
    "0,6,.45,1 0.5,9,.85,1 1.5,7,.45,1 2.0,4,.45,1 2.5,2,.45,1 3.0,0,.80,1 | "
    "0,0,.45,1 0.5,4,.85,1 1.5,7,.85,1 2.5,9,.45,1 3.0,7,.80,1 | "
    "0,5,.45,1 0.5,2,.45,1 1.5,0,.45,1 2.0,-1,.85,1 3.0,2,.75,1"
)


def _voice_lead_distinct(prev_voicing, raw_voicing, min_p=55, max_p=84):
    center = sum(prev_voicing) / max(1, len(prev_voicing))
    pcs = list(dict.fromkeys(p % 12 for p in raw_voicing))
    led = []
    for pc in pcs:
        cands = [pc + 12 * o for o in range(1, 9) if min_p <= pc + 12 * o <= max_p]
        if not cands:
            cands = [pc + 12 * o for o in range(1, 9)]
        best = min(cands, key=lambda x: abs(x - center))
        if best not in led:
            led.append(best)
    led.sort()
    idx = 0
    while len(led) < 4 and led:
        base = led[idx % len(led)]
        added = False
        for cand in (base + 12, base - 12, base + 24, base - 24):
            if min_p <= cand <= max_p and cand not in led:
                led.append(cand)
                led.sort()
                added = True
                break
        if not added:
            cand = led[-1] + 12
            while cand in led:
                cand += 12
            led.append(cand)
            led.sort()
        idx += 1
    return tuple(led)


def _closest_pc_in_range(pc, target, low=40, high=58):
    cands = [p for p in range(low, high + 1) if p % 12 == pc % 12]
    if not cands:
        return max(low, min(high, target))
    return min(cands, key=lambda p: (abs(p - target), abs(p - 48)))


def _walk_bass_bar(engine, prev_bass, root, voicing, next_root, shift, four_beat, night, pos, is_last_bar):
    """Build a smooth scalar/chromatic walking upright bass line inside E2..D4 (40..62)."""
    b0 = _closest_pc_in_range(root, prev_bass, low=40, high=59)

    if not four_beat:
        b2 = (b0 + 7) if (b0 + 7 <= 57) else _closest_pc_in_range(root + 7, b0, low=40, high=58)
        if is_last_bar:
            return [(0.0, b0, 1.80, 1.0), (2.0, b2, 1.80, 0.88)]
        hits = [(0.0, b0, 1.75, 1.0), (2.0, b2, 1.35, 0.88)]
        if pos % 2 == 1:
            cands = [
                p for p in range(40, 59)
                if p % 12 in ((next_root - 1) % 12, (next_root + 1) % 12)
            ]
            lead = min(cands, key=lambda p: abs(p - b2)) if cands else b2
            hits.append((3.5, lead, 0.32, 0.72))
        return hits

    chord_pcs = {p % 12 for p in voicing} | {root % 12}
    scale_pcs = {(shift + iv) % 12 for iv in engine.SCALES["major"]}

    # Beat 1: smooth chord tone near b0 (2..5 semitones away), biased toward center ~48
    cands_1 = [
        p for p in range(max(40, b0 - 5), min(59, b0 + 6))
        if p != b0 and p % 12 in chord_pcs
    ]
    if not cands_1:
        cands_1 = [p for p in range(max(40, b0 - 4), min(59, b0 + 5)) if p != b0 and p % 12 in scale_pcs]
    b1 = min(cands_1, key=lambda p: (abs(abs(p - b0) - 3), abs(p - 48)))

    # Beat 2: scalar or chord tone continuing smoothly
    direction = 1 if b1 >= b0 else -1
    cands_2 = [
        p for p in range(max(40, b1 - 5), min(59, b1 + 6))
        if p != b1 and (p % 12 in chord_pcs or p % 12 in scale_pcs)
    ]
    b2 = min(
        cands_2,
        key=lambda p: (
            0 if p % 12 in chord_pcs else 1,
            0 if (p - b1) * direction > 0 else 1,
            abs(abs(p - b1) - 2),
            abs(p - 48),
        ),
    )

    if is_last_bar:
        b3_cands = [p for p in range(max(40, b2 - 4), min(59, b2 + 5)) if p != b2 and p % 12 in chord_pcs]
        b3 = min(b3_cands, key=lambda p: abs(p - b2)) if b3_cands else b2
        return [
            (0.0, b0, 0.90, 1.0),
            (1.0, b1, 0.90, 0.78),
            (2.0, b2, 0.90, 0.88),
            (3.0, b3, 0.82, 0.80),
        ]

    # Beat 3: closest chromatic approach to next bar's root within smooth reach of b2
    approach_cands = [
        p for p in range(40, 59)
        if p % 12 in ((next_root - 1) % 12, (next_root + 1) % 12) and p != b2
    ]
    b3 = min(approach_cands, key=lambda p: abs(p - b2)) if approach_cands else b2
    if abs(b3 - b2) > 6:
        step_cands = [p for p in range(max(40, b2 - 4), min(59, b2 + 5)) if p != b2 and p % 12 in scale_pcs]
        if step_cands:
            next_anchor = _closest_pc_in_range(next_root, b2, low=40, high=57)
            b3 = min(step_cands, key=lambda p: abs(p - next_anchor))

    hits = [
        (0.0, b0, 0.90, 1.0),
        (1.0, b1, 0.90, 0.78),
        (2.0, b2, 0.90, 0.88),
        (3.0, b3, 0.82, 0.82),
    ]
    if night and pos % 2 == 1:
        hits[2] = (2.0, b2, 0.45, 0.86)
        ghost = b2 + (2 if b3 >= b2 else -2)
        if 40 <= ghost <= 59 and ghost != b3 and abs(ghost - b2) <= 4 and abs(b3 - ghost) <= 5:
            hits.insert(3, (2.5, ghost, 0.40, 0.62))
    return hits


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Harbor Town track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    shift = 7  # G Major
    # Day: G5 center (stays in G4..E6 sweet spot); Night: warm G4 lounge register (-12 semitones)
    tonic = (60 if night else 72) + shift

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 37,
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        s.set_channel(0, 21, "Italian Accordion Lead", bank=8, pan=58, vol=86, rev=52, cho=18)
        s.set_channel(1, 24, "Nylon Guitar Comp", bank=0, pan=36, vol=62, rev=48, cho=16)
        s.set_channel(2, 73, "Flute Fills", bank=0, pan=92, vol=66, rev=58, cho=20)
        s.set_channel(3, 32, "Upright Bass", bank=0, pan=64, vol=80, rev=24, cho=6)
        s.set_channel(4, 56, "Trumpet Solo", bank=0, pan=76, vol=78, rev=54, cho=16)
        s.set_channel(5, 61, "Boardwalk Brass", bank=0, pan=84, vol=62, rev=56, cho=18)
        s.set_channel(9, 32, "Jazz Kit", bank=128, pan=64, vol=54, rev=26, cho=8)
    else:
        s.set_channel(0, 4, "Detuned Tine EP", bank=8, pan=58, vol=78, rev=58, cho=24)
        s.set_channel(1, 24, "Nylon Guitar Lounge", bank=0, pan=36, vol=54, rev=54, cho=18)
        s.set_channel(2, 59, "Muted Trumpet", bank=0, pan=92, vol=62, rev=62, cho=20)
        s.set_channel(3, 32, "Upright Bass", bank=0, pan=64, vol=74, rev=26, cho=6)
        s.set_channel(4, 11, "Vibraphone Lounge", bank=0, pan=74, vol=68, rev=64, cho=22)
        s.set_channel(5, 49, "Lounge Strings", bank=0, pan=84, vol=44, rev=72, cho=28)
        s.set_channel(9, 40, "Brush Kit", bank=128, pan=64, vol=42, rev=30, cho=8)

    motif_hook = engine.ph(_MOTIF_HOOK_TEXT)
    motif_a = engine.ph(_MOTIF_A_TEXT)
    motif_b = engine.ph(_MOTIF_B_TEXT)
    solo_c = engine.ph(_SOLO_C_TEXT)

    sec_spec = _SECTIONS_NIGHT if night else _SECTIONS_DAY
    bar_plan = []
    for sec_name, chords_str in sec_spec:
        syms = chords_str.split()
        for pos, sym in enumerate(syms):
            bar_plan.append((sec_name, pos, len(syms), sym))

    n_bars = len(bar_plan)
    prev_comp = (62, 66, 69, 71) if night else (62, 67, 71, 74)
    prev_pad = (59, 62, 67, 71)
    prev_bass = 43  # G2

    for bar, (sec_name, pos, sec_len, sym) in enumerate(bar_plan):
        t = s.bar_beat(bar)
        is_last = bar == n_bars - 1
        root, raw_voicing = engine.CH[sym]
        root += shift
        raw_shifted = tuple(p + shift for p in raw_voicing)
        voicing = _voice_lead_distinct(prev_comp, raw_shifted)
        prev_comp = voicing

        next_sym = bar_plan[(bar + 1) % n_bars][3]
        next_root = engine.CH[next_sym][0] + shift

        # Expressive CC11 phrase curves (no bar-47 overrun)
        if pos % 2 == 0 and bar + 1 < n_bars:
            s.swell(0, t, t + meter * 1.9, low=88, high=116, steps=8)
            if sec_name == "C":
                s.swell(4 if (not night or pos < 4) else 2, t, t + meter * 1.9, low=90, high=118, steps=8)

        # Primary melody events
        if sec_name == "intro":
            events = list(motif_hook[pos])
            lead_ch = 0
        elif sec_name == "B":
            events = list(motif_b[pos])
            lead_ch = 0
        elif sec_name == "C":
            events = list(solo_c[pos])
            lead_ch = 4 if (not night or pos < 4) else 2
        elif sec_name == "turn":
            if pos < 3:
                events = list(motif_hook[pos])
            else:
                events = [(0.0, 2.0, 0.90, 1.0), (1.0, 0.0, 0.90, 1.0), (2.0, -1.0, 1.75, 1.0)]
            lead_ch = 0
        else:
            events = list(motif_a[pos])
            lead_ch = 0

        # Subtle A' / A'' melodic ornamentation on turnaround bars
        if sec_name in ("Ap", "App") and pos in (1, 3, 5):
            at, step, dur, snap = events[-1]
            events[-1] = (at, step + (2.0 if pos == 3 else -2.0), dur, 1.0)

        base_vel = engine.phrase_vel(54 if night else 66, pos, bars_per_phrase=max(4, sec_len))
        if sec_name == "intro":
            base_vel *= 0.94
        elif sec_name == "App":
            base_vel *= 1.08

        # Night lounge phrasing: soften quick passing eighths and warm sustains
        filtered_ev = []
        for idx, (at, step, dur, snap) in enumerate(events):
            if is_last and at >= 3.4:
                continue
            if night and sec_name in ("A", "Ap", "B", "App") and idx == 2 and len(events) >= 5:
                # Give Night lounge breathing space while keeping shared motif DNA strong
                continue
            filtered_ev.append((at, step, dur, snap))

        vibe_hits = []
        for e_idx, (at, step, dur, snap) in enumerate(filtered_ev):
            expected = tonic + int(round(step))
            pitch = engine.chord_pitch(expected, voicing, root, strong=bool(snap >= 0.5))
            # Keep Day Accordion strictly in G4..E6 sweet spot (67..88)
            if not night:
                while pitch > 88:
                    pitch -= 12
                while pitch < 67:
                    pitch += 12
            d_eff = dur * (1.12 if night else 1.0)
            if e_idx + 1 < len(filtered_ev):
                next_at = filtered_ev[e_idx + 1][0]
                ioi_swung = s._swing_beat(next_at) - s._swing_beat(at)
                d_eff = min(d_eff, max(0.06, ioi_swung - 0.035))
            d_clamped = s.clamp_dur(at, d_eff, margin=0.14 if is_last else 0.08)
            vel_note = base_vel * (1.0 if at in (0.0, 2.0) else 0.90)
            s.note(lead_ch, pitch, t + at, d_clamped, vel_note, vib=(not night and lead_ch in (0, 2, 4)))

            # Day Trumpet harmony in A' / A''; Night Vibraphone chordal shimmer in A' / A''
            if sec_name in ("Ap", "App") and (at == 0.0 or dur >= 0.78):
                if not night:
                    harm_p = engine.chord_pitch(pitch - 4, voicing, root, True)
                    s.note(4, harm_p, t + at, d_clamped, base_vel * 0.68, vib=True)
                else:
                    vibe_p = engine.chord_pitch(pitch + 12, voicing, root, True)
                    if 60 <= vibe_p <= 96:
                        vibe_hits.append((at, vibe_p, d_clamped))

        for v_idx, (vat, vibe_p, v_base_d) in enumerate(vibe_hits):
            vdur = min(1.4, v_base_d + 0.35)
            if v_idx + 1 < len(vibe_hits):
                v_ioi = s._swing_beat(vibe_hits[v_idx + 1][0]) - s._swing_beat(vat)
                vdur = min(vdur, max(0.06, v_ioi - 0.035))
            vdur = s.clamp_dur(vat + 0.01, vdur, margin=0.14 if is_last else 0.06)
            s.note(4, vibe_p, t + vat + 0.01, vdur, base_vel * 0.56, vib=False)

        # Keep Ch 0 softly active with Harbor Town motif-head echoes during Section C solo handoff
        if sec_name == "C":
            echo_vel = 36 if night else 42
            p0 = engine.chord_pitch(tonic + (-5 if pos % 2 == 0 else -1), voicing, root, True)
            p1 = engine.chord_pitch(tonic + 4, voicing, root, True)
            if not night:
                while p0 > 84:
                    p0 -= 12
                while p1 > 86:
                    p1 -= 12
            s.note(0, p0, t + 0.0, 0.45, echo_vel, vib=False)
            s.note(0, p1, t + 0.5, 0.85, echo_vel * 0.92, vib=False)

        # Call-and-response fills: Flute (Day Ch 2) / Muted Trumpet (Night Ch 2)
        if sec_name != "C" and not is_last:
            if pos in (1, 3, 5, 7):
                fill_v = base_vel * (0.62 if night else 0.66)
                f1 = voicing[-1] + (0 if night else 12)
                f2 = voicing[-2] + (0 if night else 12)
                while f1 > (84 if night else 91):
                    f1 -= 12
                while f2 > (82 if night else 89):
                    f2 -= 12
                if f1 == f2:
                    f2 = voicing[0] + (0 if night else 12)
                # Flute 250 ms attack requires >= 0.55 beat durations
                s.note(2, f2, t + 2.0, 0.50 if night else 0.55, fill_v, vib=False)
                s.note(2, f1, t + 2.5, 0.95, fill_v * 1.06, vib=True)
        elif sec_name == "C" and not night and pos in (3, 7):
            # Flute trades short bright answers at Trumpet solo phrase endings
            f1 = voicing[-1] + 12
            while f1 > 91:
                f1 -= 12
            s.note(2, f1 - 2, t + 2.5, 0.55, base_vel * 0.62, vib=False)
            s.note(2, f1, t + 3.0, 0.85, base_vel * 0.68, vib=True)

        # Section B, C, A'', Turnaround Layer: Boardwalk Brass punches (Day Ch 5) vs Lounge Strings (Night Ch 5)
        if not night:
            if sec_name in ("B", "C", "App", "turn") and not is_last:
                brass_vel = 42 if sec_name in ("B", "App") else 36
                stab_beats = (1.5, 3.5) if pos % 2 == 0 else (0.5, 2.5)
                for sb in stab_beats:
                    dur_b = 0.34 if sb == 3.5 else 0.42
                    for p in voicing[:3]:
                        s.note(5, p, t + sb, dur_b, brass_vel, humanize=0.006, vib=False)
        else:
            # Lounge Strings (0:49): kept out of Intro (bars 0-3), -0.20 beat attack comp + CC11 swell
            if sec_name in ("B", "C", "App", "turn"):
                pad_v = _voice_lead_distinct(prev_pad, voicing, min_p=52, max_p=72)
                prev_pad = pad_v
                pad_vel = 36 if sec_name in ("B", "App") else 30
                pre = -0.20 if (bar > 0 and t >= 0.25) else 0.0
                start_b = t + pre
                dur_p = (3.70 if is_last else meter - 0.25) - pre
                s.swell(5, max(0.0, start_b), t + (3.80 if is_last else meter - 0.05), low=66, high=108, steps=8)
                for p in (pad_v[0], pad_v[2]):
                    s.note(5, p, start_b, dur_p, pad_vel, humanize=0.005, vib=False)

        # Night Vibraphone lush shell swells in B & Turnaround
        if night and sec_name in ("B", "turn"):
            if is_last:
                s.strum(4, voicing, t + 0.0, 3.65, 42, spread=0.04, up=False)
            elif pos % 2 == 0:
                s.strum(4, voicing, t + 0.0, 1.85, 40, spread=0.035, up=False)

        # Smooth Walking Upright Bass (E2..D4 = 40..62)
        four_beat_bass = sec_name in ("Ap", "B", "C", "App", "turn") or (sec_name == "A" and pos >= 4)
        bass_hits = _walk_bass_bar(
            engine, prev_bass, root, voicing, next_root, shift, four_beat_bass, night, pos, is_last
        )
        prev_bass = bass_hits[-1][1]
        v_bass = 50 if night else 62
        for at, p, dur, mult in bass_hits:
            d_b = s.clamp_dur(at, dur, margin=0.14 if is_last else 0.06)
            s.note(3, p, t + at, d_b, v_bass * mult, humanize=0.008, vib=False)

        # Nylon Guitar Comping (Ch 1)
        if not night:
            if is_last:
                s.strum(1, voicing[:3], t + 0.0, 1.4, 48, spread=0.018, up=False)
                s.strum(1, voicing[:3], t + 2.0, 1.75, 46, spread=0.018, up=False)
            else:
                # Crisp Freddie Green / Charleston boardwalk swing comp on 0, 1.5, 2.5
                s.strum(1, voicing[:3], t + 0.0, 0.72, 48, spread=0.016, up=False)
                s.strum(1, voicing[1:], t + 1.5, 0.58, 42, spread=0.014, up=True)
                s.strum(1, voicing[:3], t + 2.5, 0.78, 45, spread=0.016, up=False)
        else:
            # Sparse rootless jazz shell/9th comping (0.0 and swung 2.5)
            shell = (voicing[0], voicing[1], voicing[3]) if len(voicing) >= 4 else voicing[:3]
            if is_last:
                s.strum(1, shell, t + 0.0, 3.65, 38, spread=0.028, up=False)
            else:
                s.strum(1, shell, t + 0.0, 1.45, 38, spread=0.024, up=False)
                if pos % 2 == 0:
                    s.strum(1, shell, t + 2.5, 1.05, 32, spread=0.020, up=True)

        # Drums (128:32 Jazz Kit Day / 128:40 Brush Kit Night — attenuated for hot SF2 kit gain)
        if not night:
            # Jazz Kit (128:32)
            if pos == 0 and sec_name in ("A", "B", "C", "App"):
                s.drum(49, t + 0.0, 26, dur=0.45)  # section crash
            if is_last:
                s.drum(36, t + 0.0, 24)
                s.drum(51, t + 0.0, 24, dur=0.35)
                s.drum(51, t + 1.0, 20, dur=0.30)
                s.drum(44, t + 1.0, 16, dur=0.08)
                s.drum(51, t + 2.0, 22, dur=1.60)
                s.drum(44, t + 3.0, 15, dur=0.08)
            else:
                # Classic swung ride spang-a-lang + pedal hat on 2 & 4 + feathered kick
                for at, v_r in ((0.0, 25), (1.0, 22), (1.5, 19), (2.0, 25), (3.0, 22), (3.5, 19)):
                    s.drum(51, t + at, v_r, dur=0.22)
                for at in (1.0, 3.0):
                    s.drum(44, t + at, 17, dur=0.08)
                for at in (0.0, 2.0):
                    s.drum(36, t + at, 23 if sec_name != "intro" else 19, dur=0.12)
                # Snare ghost comping + phrase-end turnarounds
                if sec_name != "intro":
                    s.drum(38, t + 1.0, 18, dur=0.10)
                    s.drum(38, t + 3.0, 19, dur=0.10)
                if pos in (3, 7):
                    s.drum(38, t + 2.5, 20, dur=0.10)
                    s.drum(38, t + 3.5, 22, dur=0.10)
        else:
            # Brush Kit (128:40)
            if is_last:
                s.drum(36, t + 0.0, 16)
                s.drum(40, t + 0.0, 20, dur=0.65)
                s.drum(51, t + 0.0, 15, dur=0.80)
                s.drum(44, t + 1.0, 14, dur=0.08)
                s.drum(40, t + 2.0, 18, dur=1.45)
            else:
                for at in (0.0, 2.0):
                    s.drum(36, t + at, 17 if at == 0.0 else 14, dur=0.12)
                # Soft brush swirl (40) + gentle tap (38) + hi-hat chick (44) + ride shimmer (51)
                for at in (1.0, 3.0):
                    s.drum(40, t + at, 22, dur=0.28)
                    s.drum(38, t + at, 15, dur=0.09)
                    s.drum(44, t + at, 14, dur=0.08)
                for at in (0.5, 2.5):
                    s.drum(40, t + at, 14, dur=0.20)
                for at, v_r in ((0.0, 16), (1.5, 13), (2.0, 15), (3.5, 13)):
                    s.drum(51, t + at, v_r, dur=0.25)
                if pos in (3, 7):
                    s.drum(38, t + 3.5, 14, dur=0.09)

    return s
