"""Story Lagoon regional soundtrack builder (region-lagoon-song, region-lagoon-night-song)."""

import math

TRACKS = [
    {
        "name": "region-lagoon-song",
        "region": "lagoon",
        "mode": "day",
        "title": "Story Lagoon (Day)",
        "key": "D Major",
        "key_midi": "D",
        "meter": (6, 8),
        "beats_per_bar": 3.0,
        "bars": 48,
        "bpm": 90,
        "swing": 0.0,
        "description": (
            "Dreamy 6/8 barcarolle with flute, oboe, rolling harp, storybook strings, "
            "lyrical cello & glockenspiel."
        ),
    },
    {
        "name": "region-lagoon-night-song",
        "region": "lagoon",
        "mode": "night",
        "title": "Story Lagoon (Night)",
        "key": "D Major",
        "key_midi": "D",
        "meter": (6, 8),
        "beats_per_bar": 3.0,
        "bars": 48,
        "bpm": 72,
        "swing": 0.0,
        "description": (
            "Bedtime 6/8 lullaby with music box, moonlit rolling harp, warm cello, "
            "celesta & hushed flute."
        ),
    },
]

# 48-bar Macro Form:
# Intro/Hook (0-3) -> A (4-11) -> A' (12-19) -> B (20-27) -> C (28-35) -> A'' (36-43) -> Turnaround (44-47)
_HARMONIES_DAY = (
    "Iadd9 IVmaj7 ii9 Vsus4",                       # Intro/Hook (0-3)
    "Iadd9 iii IVmaj7 I6 vi9 ii9 Vsus4 V7",        # A (4-11)
    "Iadd9 V/vi vi9 IVadd9 ii9 IVmaj7 Vsus4 V7",   # A' (12-19)
    "IVmaj7 iv iii vi9 ii9 bVII Vsus4 V7",         # B (20-27)
    "vi9 IVmaj7 Iadd9 V/vi vi7 ii9 Vsus4 V7",      # C (28-35)
    "Iadd9 V/vi vi9 IVmaj7 iv I6 ii9 V13",         # A'' (36-43)
    "IVmaj7 ii9 Vsus4 V7",                         # Turnaround (44-47)
)

_HARMONIES_NIGHT = (
    "Iadd9 Imaj6 iv Vsus4",                        # Intro/Hook (0-3)
    "Imaj7 V/vi vi9 IVmaj7 Iadd9 ii7 IVmaj7 V7",   # A (4-11)
    "Iadd9 iii vi7 iv7 I6 ii9 Vsus4 V13",          # A' (12-19)
    "IVmaj7 iv7 I6 V/vi vi9 bVII ii9 V7",          # B (20-27)
    "vi9 IVadd9 Imaj7 iii iv I6 ii7 V7",           # C (28-35)
    "Iadd9 iii IVmaj7 iv7 vi9 ii9 Vsus4 V7",       # A'' (36-43)
    "IVmaj7 iv Vsus4 V7",                          # Turnaround (44-47)
)

# Pure 6/8 compound subdivisions (0.0, 0.5, 1.0, 1.5, 2.0, 2.5) — zero .25 duple offsets.
_MOTIF_INTRO_TEXT = (
    "0,7,1.4 1.5,4,0.45 2.0,2,0.9 | "
    "0,4,0.95 1.0,7,0.45 1.5,9,1.35 | "
    "0,2,0.95 1.0,5,0.45 1.5,4,0.95 2.5,0,0.42 | "
    "0,2,2.2 2.5,7,0.42"
)

_MOTIF_A_TEXT = (
    "0,4,0.95 1.0,7,0.45 1.5,12,0.95 2.5,14,0.42 | "
    "0,11,1.4 1.5,9,0.45 2.0,7,0.9 | "
    "0,9,0.95 1.0,12,0.45 1.5,7,0.95 2.5,4,0.42 | "
    "0,5,1.4 1.5,4,0.45 2.0,2,0.9 | "
    "0,0,0.95 1.0,4,0.45 1.5,7,0.95 2.5,9,0.42 | "
    "0,5,0.95 1.0,9,0.45 1.5,14,0.95 2.5,12,0.42 | "
    "0,12,1.4 1.5,9,0.45 2.0,7,0.9 | "
    "0,7,1.4 1.5,5,0.45 2.0,2,0.9"
)

_MOTIF_B_TEXT = (
    "0,9,1.4 1.5,12,0.45 2.0,16,0.9 | "
    "0,15,1.4 1.5,12,0.45 2.0,10,0.9 | "
    "0,7,0.95 1.0,11,0.45 1.5,14,0.95 2.5,12,0.42 | "
    "0,11,1.4 1.5,9,0.45 2.0,4,0.9 | "
    "0,5,0.95 1.0,9,0.45 1.5,12,0.95 2.5,10,0.42 | "
    "0,10,1.4 1.5,5,0.45 2.0,2,0.9 | "
    "0,5,0.95 1.0,7,0.45 1.5,12,1.35 | "
    "0,11,1.4 1.5,7,0.45 2.5,2,0.42"
)

# Section C handoff melody (Oboe/Glockenspiel Day; Celesta/Hushed Flute Night)
_MOTIF_C_TEXT = (
    "0,14,1.4 1.5,12,0.45 2.0,9,0.9 | "
    "0,7,0.95 1.0,9,0.45 1.5,11,1.35 | "
    "0,12,1.4 1.5,9,0.45 2.0,7,0.9 | "
    "0,6,0.95 1.0,9,0.45 1.5,11,0.95 2.5,12,0.42 | "
    "0,14,1.4 1.5,11,0.45 2.0,9,0.9 | "
    "0,7,0.95 1.0,12,0.45 1.5,11,0.95 2.5,9,0.42 | "
    "0,7,1.4 1.5,5,0.45 2.0,4,0.9 | "
    "0,2,1.4 1.5,5,0.45 2.5,7,0.42"
)

_MOTIF_TURN_TEXT = (
    "0,7,1.4 1.5,4,0.45 2.0,2,0.9 | "
    "0,4,0.95 1.0,7,0.45 1.5,9,1.35 | "
    "0,7,1.4 1.5,5,0.45 2.0,4,0.9 | "
    "0,2,1.4 1.5,4,0.45 2.0,5,0.65"
)

_SECTIONS = (
    ("intro", 0, 4),
    ("A", 4, 8),
    ("Ap", 12, 8),
    ("B", 20, 8),
    ("C", 28, 8),
    ("App", 36, 8),
    ("turn", 44, 4),
)


def _wrap_in_range(pc_source, low, high):
    pc = int(pc_source) % 12
    candidates = [pc + 12 * oct_n for oct_n in range(1, 8) if low <= pc + 12 * oct_n <= high]
    if candidates:
        return candidates[0]
    mid = (low + high) / 2.0
    return min((pc + 12 * oct_n for oct_n in range(1, 8)), key=lambda p: abs(p - mid))


def _dedup_voicing(voicing, low=54, high=78):
    if len(set(voicing)) == len(voicing):
        return voicing
    used = set()
    out = []
    for p in sorted(voicing):
        while p in used:
            p += 12
        while p > high and (p - 12) >= low and (p - 12) not in used:
            p -= 12
        used.add(p)
        out.append(p)
    return tuple(sorted(out))


def _section_for_bar(bar):
    for name, start, length in _SECTIONS:
        if start <= bar < start + length:
            return name, bar - start, length
    return "turn", 0, 4


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Story Lagoon track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    shift = 2  # D Major
    tonic = 72 + shift  # D5 = 74

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 37,
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        # Day: 7 distinct GM programs {9, 35, 42, 46, 48, 68, 73}
        s.set_channel(0, 73, "Flute Lead", bank=0, pan=58, vol=92, rev=58, cho=18)
        s.set_channel(1, 46, "Rolling Harp", bank=0, pan=36, vol=78, rev=56, cho=20)
        s.set_channel(2, 68, "Oboe Counter", bank=0, pan=88, vol=76, rev=60, cho=22)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=82, rev=28, cho=6)
        s.set_channel(4, 9, "Glockenspiel Sparkle", bank=0, pan=76, vol=70, rev=62, cho=18)
        s.set_channel(5, 48, "Storybook Strings", bank=0, pan=92, vol=64, rev=68, cho=26)
        s.set_channel(6, 46, "Harp Gliss", bank=0, pan=40, vol=68, rev=72, cho=22)
        s.set_channel(7, 42, "Lyrical Cello", bank=0, pan=46, vol=80, rev=58, cho=20)
    else:
        # Night: 6 distinct GM programs {8, 10, 42, 46, 49, 73} -> prog_jacc = 3/10 = 0.300
        s.set_channel(0, 10, "Music Box Lead", bank=0, pan=54, vol=88, rev=60, cho=18)
        s.set_channel(1, 46, "Moonlit Harp", bank=0, pan=82, vol=72, rev=58, cho=22)
        s.set_channel(2, 42, "Bedtime Cello", bank=0, pan=64, vol=82, rev=60, cho=18)
        s.set_channel(4, 8, "Celesta Handoff", bank=0, pan=76, vol=76, rev=64, cho=20)
        s.set_channel(5, 49, "Hushed Slow Strings", bank=0, pan=40, vol=64, rev=72, cho=28)
        s.set_channel(7, 73, "Hushed Flute", bank=0, pan=46, vol=66, rev=64, cho=22)

    motif_intro = engine.ph(_MOTIF_INTRO_TEXT)
    motif_a = engine.ph(_MOTIF_A_TEXT)
    motif_b = engine.ph(_MOTIF_B_TEXT)
    motif_c = engine.ph(_MOTIF_C_TEXT)
    motif_turn = engine.ph(_MOTIF_TURN_TEXT)

    harmony_src = _HARMONIES_NIGHT if night else _HARMONIES_DAY
    harmony = [sym for sec in harmony_src for sym in sec.split()]
    n_bars = len(harmony)

    prev_harp_voicing = (62, 66, 69, 74)
    prev_str_voicing = (62, 66, 69, 73)

    for bar, sym in enumerate(harmony):
        sec_name, pos, sec_len = _section_for_bar(bar)
        t = s.bar_beat(bar)

        raw_root, raw_voicing = engine.CH[sym]
        root = raw_root + shift
        voicing = tuple(p + shift for p in raw_voicing)
        next_root = engine.CH[harmony[(bar + 1) % n_bars]][0] + shift

        prev_harp_voicing = engine.voice_lead(prev_harp_voicing, voicing)
        harp_voicing = _dedup_voicing(prev_harp_voicing)
        prev_str_voicing = engine.voice_lead(prev_str_voicing, voicing)
        str_voicing = _dedup_voicing(prev_str_voicing)

        # Expressive CC11 swells per phrase
        if sec_name in ("intro", "turn"):
            swell_end = t + meter - 0.08 if (night and bar == 47) else t + meter
            sw_lo = (76 if sec_name == "intro" else 80) if night else 88
            sw_hi = (102 if sec_name == "intro" else 106) if night else 116
            s.swell(0, t, swell_end, low=sw_lo, high=sw_hi, steps=6)
        else:
            if pos % 2 == 0:
                sw0_lo = (92 if sec_name == "App" else 84) if night else 86
                sw0_hi = (122 if sec_name == "App" else 114) if night else 118
                s.swell(0, t, t + meter * 2, low=sw0_lo, high=sw0_hi, steps=10)
            s.swell(4, t, t + meter, low=88 if (night and sec_name == "App") else 84, high=118 if (night and sec_name == "App") else 114, steps=6)

        pedal_end = t + meter - 0.02 if (night and bar == 47) else t + meter - 0.04
        s.pedal(1, t, pedal_end, val=96 if night else 108)

        # Select primary Ch 0 motif events
        if sec_name == "intro":
            events = list(motif_intro[pos])
        elif sec_name == "B":
            events = list(motif_b[pos])
        elif sec_name == "turn":
            events = list(motif_turn[pos])
        elif sec_name == "C":
            # Ch 0 drops back to gentle motif-head echoes while soloists lead Section C
            base_ev = motif_a[pos]
            if pos % 2 == 0:
                events = [base_ev[0], (1.5, base_ev[0][1] + 2, 0.95)]
            elif not night:
                events = [(0.0, base_ev[0][1], 1.1)]
            else:
                events = [(1.5, base_ev[0][1], 0.9)]
        else:
            events = list(motif_a[pos])

        # Subtle A' / A'' melodic ornamentation (all 6/8 subdivisions)
        if sec_name == "Ap" and pos in (1, 3, 5):
            at, step, dur = events[-1]
            events[-1] = (at, step + (2 if pos == 3 else -2), dur)
        elif sec_name == "App" and not night and pos in (0, 4):
            at0, step0, dur0 = events[0]
            if dur0 >= 1.2:
                events[0] = (at0, step0, 0.95)
                events.insert(1, (1.0, step0 + 2, 0.45))

        if bar == 47:
            if night:
                events = [(at, st, min(du, 2.90 - at)) for at, st, du in events if at < 2.6]
            else:
                events = [(at, st, min(du, 2.85 - at)) for at, st, du in events if at < 2.6]

        # Ch 0 Velocity & Articulation
        if night:
            base_lead = {
                "intro": 58,
                "A": 63,
                "Ap": 66,
                "B": 68,
                "C": 48,
                "App": 73,
                "turn": 64 - pos * 2,
            }[sec_name]
        else:
            base_lead = 76
            if sec_name == "C":
                base_lead = 54
            elif sec_name == "App":
                base_lead = 82
            elif sec_name == "intro":
                base_lead = 74

        lead_vel = engine.phrase_vel(base_lead, pos, bars_per_phrase=sec_len, arc=0.14)

        for idx, (at, step, dur) in enumerate(events):
            # Night music box occasionally omits ornamental 2.5 pickup in A' for gentler lullaby space
            if night and sec_name == "Ap" and at == 2.5 and pos in (2, 4):
                continue
            strong = (at in (0.0, 1.5)) or dur >= 0.9
            pitch = engine.chord_pitch(tonic + int(step), voicing, root, strong)
            if sec_name == "App" and not night and pos in (0, 1, 2, 5):
                pitch = min(93, pitch)
            d_use = dur * (0.78 if night else 1.0)
            d_clamped = s.clamp_dur(at, d_use, margin=0.08)
            use_vib = (not night) and (d_clamped >= 1.1)
            s.note(0, pitch, t + at, d_clamped, lead_vel, vib=use_vib)

            # Day Glockenspiel (Ch 4) / Night Celesta (Ch 4) delicate bell sparkle
            if sec_name == "Ap" and idx == 0 and pos % 2 == 0:
                bell_p = min(98, pitch + 12)
                s.note(4, bell_p, t + at, min(0.85, d_clamped), lead_vel * (0.54 if night else 0.52))
            elif sec_name == "App":
                if not night and idx == 0 and pos % 2 == 0:
                    bell_p = min(98, pitch + 12)
                    s.note(4, bell_p, t + at, min(0.85, d_clamped), lead_vel * 0.52)
                elif night and (idx == 0 or (pos % 2 == 0 and at == 1.5)):
                    bell_p = min(98, pitch + 12)
                    s.note(4, bell_p, t + at, min(0.95, d_clamped), lead_vel * 0.66)

        # Section C Handoff / Duet Spotlight (bars 28-35)
        if sec_name == "C":
            solo_events = list(motif_c[pos])
            solo_vel = engine.phrase_vel(74 if night else 78, pos, bars_per_phrase=8, arc=0.15)
            for at, step, dur in solo_events:
                sp = engine.chord_pitch(tonic + int(step), voicing, root, at in (0.0, 1.5))
                d_clamped = s.clamp_dur(at, dur, margin=0.08)
                if not night:
                    # Day: Oboe (Ch 2) lyrical lead + Glockenspiel (Ch 4) crystalline octave/3rd chime
                    s.note(2, sp - 12 if sp > 83 else sp, t + at, d_clamped, solo_vel, vib=True)
                    if at in (0.0, 1.5):
                        s.note(4, min(96, sp + 12), t + at, min(0.75, d_clamped), solo_vel * 0.62)
                else:
                    # Night: Celesta (Ch 4) tender solo + Hushed Flute (Ch 7) soft lower-octave breath on downbeats
                    s.note(4, sp, t + at, min(1.1, d_clamped), solo_vel)
                    if at == 0.0 and pos % 2 == 0:
                        fl_p = engine.chord_pitch(sp - 12, voicing, root, True)
                        s.note(7, fl_p, t + 0.0, s.clamp_dur(0.0, 1.45), solo_vel * 0.66, vib=False)

        # Counter-melodies: Day Oboe (Ch 2) & Night Hushed Flute (Ch 7)
        if not night and sec_name != "C":
            if sec_name in ("A", "Ap", "App") and pos in (1, 3, 5, 7):
                ob_p = _wrap_in_range(voicing[2], 64, 78)
                ob_p2 = _wrap_in_range(voicing[1], 62, 76)
                s.note(2, ob_p, t + 1.5, 0.85, 52, vib=True)
                s.note(2, ob_p2, t + 2.5, 0.42, 48)
            elif sec_name == "B":
                ob_b = _wrap_in_range(voicing[1], 64, 77)
                s.note(2, ob_b, t + 0.0, 1.35, 54, vib=True)
                s.note(2, _wrap_in_range(voicing[2], 64, 79), t + 1.5, 1.25, 50)
        elif night and sec_name in ("A", "Ap", "B", "App") and (pos in (3, 7) or (sec_name == "App" and pos in (1, 5))):
            # Long breathy flute echoes (>= 1.2 beats so 250ms attack blooms cleanly)
            fl_echo = _wrap_in_range(voicing[2], 72, 84)
            fl_v1 = {"A": 46, "Ap": 50, "B": 54, "App": 58}[sec_name]
            s.note(7, fl_echo, t + 0.0, 1.45, fl_v1)
            s.note(7, _wrap_in_range(voicing[1], 69, 81), t + 1.5, 1.25, fl_v1 - 4)

        # Rolling 6/8 Harp Arpeggio (Ch 1) — continuous water-ripple wave (0.0, 0.5, 1.0, 1.5, 2.0, 2.5)
        harp_bass = _wrap_in_range(root, 48, 60)
        v0, v1, v2, v3 = harp_voicing[0], harp_voicing[1], harp_voicing[2], harp_voicing[3]
        if harp_bass >= v0:
            harp_bass = max(42, harp_bass - 12)
        if sec_name in ("B", "App"):
            pattern = (harp_bass, v0, v1, v3, v2, v1)
        elif sec_name == "C":
            pattern = (v0, v1, v2, v3, v2, v0)
        else:
            pattern = (harp_bass, v0, v1, v2, v1, v0)

        if night:
            harp_base_vel = {
                "intro": 46,
                "A": 50,
                "Ap": 53,
                "B": 55,
                "C": 50,
                "App": 60,
                "turn": 54 - pos * 2,
            }[sec_name]
        else:
            harp_base_vel = 60
            if sec_name == "App":
                harp_base_vel += 5
        for idx, at in enumerate((0.0, 0.5, 1.0, 1.5, 2.0, 2.5)):
            if bar == 47 and at == 2.5 and not night:
                continue
            if night and sec_name == "intro" and bar == 3 and at == 2.5:
                continue
            weight = 1.0 if idx == 0 else (0.90 if idx == 3 else (0.78 if idx in (2, 5) else 0.72))
            dur_h = 0.68 if at < 2.5 else 0.38
            if bar == 47:
                dur_h = min(dur_h, (2.93 if night else 2.88) - at)
            s.note(1, pattern[idx], t + at, dur_h, harp_base_vel * weight)

        # Stereo-swept Harp Glisses at section cadences
        if not night and sec_name in ("Ap", "B", "C", "App", "turn") and pos == sec_len - 1:
            gliss_notes = sorted({harp_bass, v0, v1, v2, v3, v0 + 12, v2 + 12})
            pan_a, pan_b = (38, 92) if sec_name in ("Ap", "C", "turn") else (92, 38)
            s.gliss(6, gliss_notes, t + 1.5, step=0.11, dur=0.55, vel=46, vel_step=3, pan_start=pan_a, pan_end=pan_b)

        # Storybook Strings (Day Ch 5, 0:48) & Hushed Slow Strings (Night Ch 5, 0:49)
        # Attack compensation: -0.16b Day, -0.18b Night (omitted from Intro/Hook & Night first 2s!)
        play_strings = (not night and sec_name != "intro") or (night and sec_name not in ("intro", "A"))
        if play_strings:
            comp = -0.18 if night else -0.16
            t_str = max(0.0, t + comp)
            if bar < 47:
                dur_str = meter - 0.06
            else:
                dur_str = (2.94 if night else 2.82) - comp
            if night:
                pad_vel = {"Ap": 44, "B": 50, "C": 44, "App": 56, "turn": 48 - pos * 2}[sec_name]
                sw_str_lo = 76 if bar == 47 else (78 if sec_name == "App" else 68)
                sw_str_hi = 96 if bar == 47 else (114 if sec_name == "App" else 104)
            else:
                pad_vel = 52 if sec_name in ("B", "App") else 46
                sw_str_lo, sw_str_hi = 76, 116
            s.swell(5, t_str, t_str + dur_str, low=sw_str_lo, high=sw_str_hi, steps=8)
            s.note(5, str_voicing[0], t_str, dur_str, pad_vel)
            s.note(5, str_voicing[2], t_str, dur_str, pad_vel * 0.90)
            if sec_name in ("B", "App"):
                s.note(5, str_voicing[3], t_str, dur_str, pad_vel * 0.78)

        # True-Register Bowed Cello (Day Ch 7: D3-F#4 [50..66]; Night Ch 2: D3-D4 [50..62])
        if not night:
            cello_low = _wrap_in_range(voicing[1], 50, 62)
            cello_high = _wrap_in_range(voicing[2], 54, 66)
            if cello_high <= cello_low:
                cello_high = min(66, cello_low + 4)
            c_offset = 0.0 if bar == 0 else -0.12
            if bar == 0 or pos in (0, 2, 4, 6) or sec_name in ("B", "App"):
                c_start = max(0.0, t + c_offset)
                c_dur = 2.65 if bar == 47 else (2.70 if pos in (0, 4) and sec_name == "intro" else 1.55)
                s.swell(7, c_start, c_start + c_dur, low=78, high=114, steps=6)
                s.note(7, cello_low, c_start, c_dur, 62 if sec_name != "App" else 68)
                if c_dur < 2.0 and bar < 47:
                    c2_start = t + 1.5 + c_offset
                    s.note(7, cello_high, c2_start, 1.35, 58)
            else:
                c_start = t + c_offset
                s.swell(7, c_start, c_start + 2.65, low=76, high=110, steps=6)
                s.note(7, cello_high, c_start, 2.55 if bar == 47 else 2.65, 60)
        else:
            # Night Bedtime Cello (Ch 2) anchors the low end (no Fretless Bass)
            c_root = _wrap_in_range(root, 50, 61)
            c_fifth = _wrap_in_range(root + 7, 52, 62)
            c_offset = 0.0 if bar == 0 else -0.12
            c_v1, c_v2 = {
                "intro": (52, 46),
                "A": (56, 50),
                "Ap": (58, 52),
                "B": (62, 55),
                "C": (58, 52),
                "App": (66, 58),
                "turn": (58 - pos * 2, 52 - pos * 2),
            }[sec_name]
            if bar == 47:
                s.note(2, c_root, t + c_offset, 2.94 - c_offset, c_v1, humanize=0.004)
            elif sec_name == "B" and pos % 2 == 1:
                c_third = _wrap_in_range(voicing[1], 54, 64)
                s.note(2, c_root, max(0.0, t + c_offset), 1.50, c_v1)
                s.note(2, c_third, t + 1.5 + c_offset, 1.35, c_v2)
            else:
                s.note(2, c_root, max(0.0, t + c_offset), 1.50, c_v1)
                s.note(2, c_fifth, t + 1.5 + c_offset, 1.35, c_v2)

        # Day Fretless Bass (Ch 3, 0:35) compound 6/8 pulse (Day only!)
        if not night:
            b_root = _wrap_in_range(root, 38, 50)
            b_fifth = _wrap_in_range(root + 7, 43, 55)
            b_next = _wrap_in_range(next_root, 38, 50)
            s.note(3, b_root, t + 0.0, 1.38, 66 if sec_name != "C" else 58)
            if bar == 47:
                s.note(3, b_fifth, t + 1.5, 1.30, 56)
            elif pos == sec_len - 1:
                s.note(3, b_fifth, t + 1.5, 0.92, 58)
                approach = b_next - 1 if abs(b_next - 1 - b_fifth) <= 5 else b_next + 2
                s.note(3, max(38, min(57, approach)), t + 2.5, 0.38, 54)
            else:
                s.note(3, b_fifth, t + 1.5, 1.25, 56 if sec_name != "C" else 50)

    return s
