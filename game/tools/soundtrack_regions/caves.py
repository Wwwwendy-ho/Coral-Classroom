"""Echo Caves regional soundtrack builder (region-caves-song, region-caves-night-song).

True A Dorian (A B C D E F# G) 48-bar arrangements:
- Macro form: Intro/Hook (4) -> A (8) -> A' (8) -> B (8) -> C Handoff/Solo (8) -> A'' (8) -> Turnaround (4).
- Day (86 BPM, ~134.0s): Luminous Vibraphone & Marimba with Cave Flute solo, Harp cascades,
  Cavern Strings swells, and stereo-panned L/R Crystal & Celesta echo cascades.
- Night (74 BPM, ~155.7s): Bioluminescent Celesta (+12 bell register), Music Box & Harp duet solo,
  Glockenspiel harmonics, Fantasia Glass Pad & Abyssal Slow Strings, and wide L/R Crystal echoes.
"""

import math

TRACKS = [
    {
        "name": "region-caves-song",
        "region": "caves",
        "mode": "day",
        "title": "Echo Caves (Day)",
        "key": "A Dorian",
        "key_midi": "Em",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 86,
        "swing": 0.0,
        "description": "Luminous A Dorian vibraphone & marimba with stereo crystal echo cascades.",
    },
    {
        "name": "region-caves-night-song",
        "region": "caves",
        "mode": "night",
        "title": "Echo Caves (Night)",
        "key": "A Dorian",
        "key_midi": "Em",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 74,
        "swing": 0.0,
        "description": "Bioluminescent glass-bell celesta, crystal echoes, harp & fretless bass hush.",
    },
]

_DORIAN_PCS = (9, 11, 0, 2, 4, 6, 7)  # A, B, C, D, E, F#, G (zero F-natural or G#)
_DORIAN_PC_SET = frozenset(_DORIAN_PCS)

# Custom pure A Dorian chord colors augmenting engine.CH
_EXTRA_DORIAN_CHORDS = {
    "Dadd9": (38, (62, 64, 66, 69)),   # D, E, F#, A
    "Gmaj7": (43, (59, 62, 66, 67)),   # G, B, D, F#
    "Asus2": (45, (57, 59, 64, 69)),   # A, B, E, A
}

# 48 bars: Intro(4) + A(8) + A'(8) + B(8) + C(8) + A''(8) + Turnaround(4)
_DAY_HARMONY = (
    # Intro / Hook (bars 0-3)
    "i", "IVdor", "i6", "IVdor",
    # A (bars 4-11)
    "i", "IVdor", "bIII", "IV7dor", "i6", "iim_dor", "vm_dor", "IVdor",
    # A' (bars 12-19)
    "i", "IVdor", "iim_dor", "vm_dor", "bIII", "IV7dor", "i6", "Dadd9",
    # B (bars 20-27)
    "bIII", "IVdor", "iim_dor", "vm_dor", "IV7dor", "bIIImaj7", "iim_dor", "IVdor",
    # C Handoff / Flute Solo (bars 28-35)
    "i6", "IVdor", "bIII", "vm_dor", "iim_dor", "IV7dor", "vm_dor", "Dadd9",
    # A'' Recapitulation (bars 36-43)
    "i", "IVdor", "bIII", "IV7dor", "i6", "iim_dor", "Gmaj7", "IVdor",
    # Turnaround (bars 44-47)
    "i6", "IVdor", "iim_dor", "vm_dor",
)

_NIGHT_HARMONY = (
    # Intro / Hook (bars 0-3)
    "i9", "IV7dor", "VIImaj6", "i6",
    # A (bars 4-11)
    "i9", "IV7dor", "bIIImaj7", "Dadd9", "i6", "iim_dor", "VIImaj6", "i7",
    # A' (bars 12-19)
    "i7", "IV7dor", "iim_dor", "i9", "bIIImaj7", "Dadd9", "iim_dor", "i6",
    # B (bars 20-27)
    "bIIImaj7", "Gmaj7", "IVdor", "i6", "IV7dor", "iim_dor", "vm_dor", "i9",
    # C Handoff / Music Box & Harp Duet Solo (bars 28-35)
    "i9", "IV7dor", "bIIImaj7", "iim_dor", "VIImaj6", "Dadd9", "iim_dor", "i7",
    # A'' Recapitulation (bars 36-43)
    "i9", "IV7dor", "bIIImaj7", "Dadd9", "i6", "iim_dor", "Gmaj7", "i6",
    # Turnaround (bars 44-47)
    "i9", "IV7dor", "iim_dor", "i7",
)

# Melodic motifs written in A Dorian scale degrees (0=A4, 1=B4, 2=C5, 3=D5, 4=E5, 5=F#5, 6=G5, 7=A5...)
# Format per bar: "beat,degree,dur ..."
_MOTIF_INTRO_TEXT = (
    "0,0,1.0 1.5,4,0.65 2.25,5,0.65 3.0,4,0.85 | "
    "0,3,1.25 1.5,2,0.75 2.5,1,1.20 | "
    "0,0,0.85 1.0,2,0.75 2.0,4,0.85 3.0,6,0.80 | "
    "0,5,1.45 1.75,4,0.75 2.75,3,1.00"
)

_MOTIF_A_TEXT = (
    "0,4,1.05 1.5,5,0.75 2.5,7,1.20 | "
    "0,5,1.20 1.5,4,0.75 2.5,3,1.20 | "
    "0,2,1.00 1.5,4,0.75 2.5,6,1.20 | "
    "0,5,1.40 2.0,3,0.80 3.0,1,0.80 | "
    "0,0,1.00 1.5,2,0.75 2.5,5,1.20 | "
    "0,4,1.05 1.5,3,0.75 2.5,1,1.20 | "
    "0,2,0.95 1.25,1,0.65 2.0,0,0.85 3.0,4,0.80 | "
    "0,5,1.45 2.0,3,1.50"
)

_MOTIF_B_TEXT = (
    "0,4,1.10 1.5,6,0.75 2.5,7,1.25 | "
    "0,8,1.15 1.5,7,0.75 2.5,5,1.25 | "
    "0,4,1.05 1.5,5,0.75 2.5,6,1.20 | "
    "0,4,1.40 2.0,3,0.85 3.0,1,0.80 | "
    "0,5,1.10 1.5,7,0.75 2.5,9,1.20 | "
    "0,8,1.10 1.5,6,0.75 2.5,4,1.20 | "
    "0,5,1.00 1.5,4,0.75 2.5,3,1.15 | "
    "0,4,1.40 2.0,5,1.45"
)

_SOLO_C_DAY_TEXT = (
    "0,4,1.35 1.75,5,0.70 2.75,4,1.00 | "
    "0,3,1.45 2.0,5,0.85 3.0,6,0.80 | "
    "0,7,1.40 1.75,6,0.75 2.75,4,1.00 | "
    "0,2,1.25 1.75,3,0.75 2.75,1,0.95 | "
    "0,3,1.20 1.5,5,0.80 2.5,7,1.25 | "
    "0,5,1.35 1.75,4,0.75 2.75,3,1.00 | "
    "0,2,1.15 1.5,1,0.75 2.5,4,1.20 | "
    "0,5,1.60 2.25,3,1.30"
)

_SOLO_C_NIGHT_TEXT = (
    "0,7,1.10 1.5,5,0.80 2.5,4,1.20 | "
    "0,3,1.30 1.75,5,0.75 2.75,6,1.00 | "
    "0,4,1.15 1.5,6,0.80 2.5,7,1.20 | "
    "0,5,1.35 2.0,3,0.85 3.0,1,0.80 | "
    "0,2,1.10 1.5,4,0.75 2.5,5,1.25 | "
    "0,6,1.15 1.5,5,0.75 2.5,3,1.20 | "
    "0,1,1.10 1.5,2,0.75 2.5,4,1.20 | "
    "0,5,1.45 2.0,4,1.45"
)

_TURNAROUND_TEXT = (
    "0,0,1.00 1.5,4,0.65 2.25,5,0.65 3.0,4,0.85 | "
    "0,3,1.30 1.75,2,0.75 2.75,1,1.00 | "
    "0,2,1.05 1.5,1,0.75 2.5,0,1.20 | "
    "0,4,1.45 2.0,0,1.65"
)


def _snap_dorian(pitch, min_p=24, max_p=106):
    """Snap any MIDI pitch strictly into A Dorian {A, B, C, D, E, F#, G}."""
    p = max(min_p, min(max_p, int(round(pitch))))
    if p % 12 in _DORIAN_PC_SET:
        return p
    for delta in (1, -1, 2, -2):
        cand = p + delta
        if min_p <= cand <= max_p and cand % 12 in _DORIAN_PC_SET:
            return cand
    return 69  # A4 fallback


def _dorian_shift(pitch, steps, min_p=24, max_p=104):
    """Move a pitch diatonically by `steps` degrees inside A Dorian."""
    p = _snap_dorian(pitch, min_p=min_p, max_p=max_p)
    oct_base = (p // 12) * 12
    # Align octave base so A=9 sits nicely
    idx_pc = _DORIAN_PCS.index(p % 12)
    # Build ordered list of Dorian pitches in [min_p, max_p]
    scale_list = [n for n in range(min_p, max_p + 1) if n % 12 in _DORIAN_PC_SET]
    if not scale_list:
        return p
    pos = min(range(len(scale_list)), key=lambda i: abs(scale_list[i] - p))
    target = max(0, min(len(scale_list) - 1, pos + int(steps)))
    return scale_list[target]


def _get_chord(sym, engine):
    if sym in _EXTRA_DORIAN_CHORDS:
        return _EXTRA_DORIAN_CHORDS[sym]
    return engine.CH[sym]


def _voice_lead_dorian(prev_voicing, raw_voicing, min_p=57, max_p=79):
    """Voice-lead a chord into 4 strictly distinct ascending A Dorian pitches."""
    if not prev_voicing:
        center = 65.0
    else:
        center = max(61.0, min(69.0, sum(prev_voicing) / len(prev_voicing)))

    unique_pcs = []
    for p in raw_voicing:
        pc = int(p) % 12
        if pc in _DORIAN_PC_SET and pc not in unique_pcs:
            unique_pcs.append(pc)

    placed = []
    for pc in unique_pcs:
        cands = [pc + 12 * oct_n for oct_n in range(3, 8) if min_p <= pc + 12 * oct_n <= max_p]
        if cands:
            best = min(cands, key=lambda c: abs(c - center))
            if best not in placed:
                placed.append(best)

    placed.sort()
    # Expand 3-pc chords (or any collision) to 4 strictly distinct pitches in [min_p, max_p]
    idx_seed = 0
    while len(placed) < 4 and idx_seed < len(placed) * 2 + 8:
        base = placed[idx_seed % len(placed)] if placed else 69
        added = False
        for cand in (base + 12, base - 12):
            if min_p <= cand <= max_p and cand % 12 in _DORIAN_PC_SET and cand not in placed:
                placed.append(cand)
                placed.sort()
                added = True
                break
        if added:
            idx_seed += 1
            continue
        idx_seed += 1

    if len(placed) < 4:
        for cand in range(min_p, max_p + 1):
            if cand % 12 in _DORIAN_PC_SET and cand not in placed:
                placed.append(cand)
                if len(placed) == 4:
                    break
        placed.sort()

    return tuple(placed[:4])


def _schedule_echo_cascade(s, pitch, beat, vel, bar, night, bar_end):
    """Schedule stereo L/R ping-pong crystal & bell echoes strictly inside A Dorian."""
    left_pan = 16 if bar % 2 == 0 else 110
    right_pan = 110 if bar % 2 == 0 else 16
    mid_pan = 38 if bar % 2 == 0 else 90

    # Echo 1: Crystal (Ch 6) octave up or unison shimmer (clears Echo 2 at beat+1.50 by >=0.08b)
    p1 = _snap_dorian(pitch + 12 if pitch <= 88 else pitch)
    b1 = beat + 0.75
    if b1 + 0.55 <= bar_end:
        s.note(6, p1, b1, min(0.65, bar_end - b1), vel * 0.58, humanize=0.006, pan=left_pan)

    # Echo 2: Opposite channel Crystal + Celesta/Glockenspiel ping-pong (clears Echo 3 at beat+2.25)
    p2 = _snap_dorian(pitch if night else (pitch + 12 if pitch <= 86 else pitch))
    b2 = beat + 1.50
    if b2 + 0.50 <= bar_end:
        s.note(6, p2, b2, min(0.65, bar_end - b2), vel * 0.38, humanize=0.006, pan=right_pan)
        echo_bell_ch = 4 if night else 7
        p_bell = _dorian_shift(pitch, 2 if night else 7)
        s.note(echo_bell_ch, p_bell, b2 + 0.05, min(0.65, bar_end - b2 - 0.05), vel * 0.42, humanize=0.006, pan=right_pan)

    # Echo 3: Gentle cavern tail reflection (ends <= beat+2.90)
    b3 = beat + 2.25
    if b3 + 0.45 <= bar_end:
        p3 = _dorian_shift(pitch, 4 if pitch <= 76 else -3)
        s.note(6, p3, b3, min(0.65, bar_end - b3), vel * 0.24, humanize=0.006, pan=mid_pan)


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Echo Caves track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    bars = spec["bars"]
    tonic = 69  # A4
    total_beats = bars * meter  # 192.0

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 43 + (7 if night else 3),
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        # Day: Luminous Vibraphone & Marimba, Cave Flute solo, Harp, Cavern Strings, L/R Crystal & Celesta
        s.set_channel(0, 11, "Vibraphone Lead", bank=0, pan=60, vol=88, rev=64, cho=20)
        s.set_channel(1, 12, "Marimba Pulse", bank=0, pan=42, vol=72, rev=52, cho=14)
        s.set_channel(2, 73, "Cave Flute Solo", bank=0, pan=82, vol=72, rev=64, cho=22)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=80, rev=26, cho=6)
        s.set_channel(4, 46, "Harp Cascade", bank=0, pan=94, vol=66, rev=72, cho=20)
        s.set_channel(5, 48, "Cavern Strings", bank=0, pan=76, vol=50, rev=70, cho=28)
        s.set_channel(6, 98, "Crystal Echoes", bank=0, pan=20, vol=66, rev=86, cho=32)
        s.set_channel(7, 8, "Celesta Sparkle", bank=0, pan=104, vol=60, rev=78, cho=24)
        s.set_channel(9, 48, "Cavern Percussion", bank=128, pan=64, vol=52, rev=50, cho=8)
    else:
        # Night: Bioluminescent Celesta (+12), Harp, Music Box solo, Fretless Bass, Glockenspiel, Slow Strings, Crystal, Fantasia
        s.set_channel(0, 8, "Celesta Bell Lead", bank=0, pan=64, vol=82, rev=76, cho=22)
        s.set_channel(1, 46, "Bioluminescent Harp", bank=0, pan=36, vol=66, rev=74, cho=22)
        s.set_channel(2, 10, "Music Box Solo", bank=0, pan=92, vol=82, rev=72, cho=24)
        s.set_channel(3, 35, "Soft Fretless Bass", bank=0, pan=64, vol=70, rev=32, cho=8)
        s.set_channel(4, 9, "Glass Bell Chime", bank=0, pan=46, vol=56, rev=80, cho=20)
        s.set_channel(5, 49, "Abyssal Slow Strings", bank=0, pan=80, vol=48, rev=76, cho=30)
        s.set_channel(6, 98, "Biolume Crystal Echo", bank=0, pan=18, vol=60, rev=88, cho=34)
        s.set_channel(7, 88, "Fantasia Glass Pad", bank=0, pan=96, vol=46, rev=82, cho=30)

    harmony = _NIGHT_HARMONY if night else _DAY_HARMONY
    assert len(harmony) == bars

    motif_intro = engine.ph(_MOTIF_INTRO_TEXT)
    motif_a = engine.ph(_MOTIF_A_TEXT)
    motif_b = engine.ph(_MOTIF_B_TEXT)
    solo_c = engine.ph(_SOLO_C_NIGHT_TEXT if night else _SOLO_C_DAY_TEXT)
    turnaround = engine.ph(_TURNAROUND_TEXT)

    # Pure A Dorian harp glissando scale (A4 -> A5)
    dorian_gliss_up = [engine.scale_pitch(tonic, "dorian", d) for d in range(8)]
    dorian_gliss_down = list(reversed(dorian_gliss_up))

    prev_voicing = None

    for bar, sym in enumerate(harmony):
        t = s.bar_beat(bar)
        bar_end = min(total_beats - 0.14, t + meter - 0.10)
        root, raw_voicing = _get_chord(sym, engine)
        voicing = _voice_lead_dorian(prev_voicing, raw_voicing)
        prev_voicing = voicing

        # Identify macro section and local bar index within section
        if bar < 4:
            sec_name, pos, sec_len = "intro", bar, 4
        elif bar < 12:
            sec_name, pos, sec_len = "A", bar - 4, 8
        elif bar < 20:
            sec_name, pos, sec_len = "Ap", bar - 12, 8
        elif bar < 28:
            sec_name, pos, sec_len = "B", bar - 20, 8
        elif bar < 36:
            sec_name, pos, sec_len = "C", bar - 28, 8
        elif bar < 44:
            sec_name, pos, sec_len = "App", bar - 36, 8
        else:
            sec_name, pos, sec_len = "turn", bar - 44, 4

        # Smooth phrase expression & stereo echo panning
        expr = 88 + int(24 * math.sin((pos + 0.5) / sec_len * math.pi))
        s.cc(0, 11, expr, t)
        s.cc(2, 11, expr, t)
        s.cc(4, 11, max(76, expr - 4), t)
        s.cc(6, 10, 18 if bar % 2 == 0 else 110, t)
        if not night:
            s.cc(7, 10, 104 if bar % 2 == 0 else 28, t)
        else:
            s.cc(4, 10, 34 if bar % 2 == 0 else 98, t)

        # Select melodic events & lead channel
        if sec_name == "intro":
            events = list(motif_intro[pos])
            lead_ch = 0
        elif sec_name in ("A", "Ap", "App"):
            events = list(motif_a[pos])
            if sec_name == "Ap" and pos in (1, 3, 5, 7):
                at, deg, dur = events[-1]
                events[-1] = (at, deg + (1 if pos in (1, 5) else 2), dur)
            lead_ch = 0
        elif sec_name == "B":
            events = list(motif_b[pos])
            lead_ch = 0
        elif sec_name == "C":
            # Handoff solo: Day Cave Flute (Ch 2) / Night Music Box (Ch 2)
            events = list(solo_c[pos])
            lead_ch = 2
        else:  # turn
            events = list(turnaround[pos])
            lead_ch = 0

        base_vel = engine.phrase_vel(56 if night else 68, pos, bars_per_phrase=sec_len, arc=0.14)
        if sec_name == "intro":
            base_vel *= 0.94
        elif sec_name == "App":
            base_vel *= 1.07
        elif sec_name == "turn" and pos >= 2:
            base_vel *= (0.90 if pos == 2 else 0.78)

        # Night Ch 0 Celesta sings in +12 bell register; Music Box solo stays bright A5
        octave_lift = 12 if (night and lead_ch == 0) else (12 if (night and lead_ch == 2) else 0)

        for idx_ev, (at, deg, dur) in enumerate(events):
            expected = engine.scale_pitch(tonic + octave_lift, "dorian", int(round(deg)))
            strong = (at == 0) or (dur >= 0.90)
            pitch = engine.chord_pitch(expected, voicing, root, strong=strong)
            pitch = _snap_dorian(pitch, min_p=48, max_p=98)
            d_clamped = min(s.clamp_dur(at, dur, margin=0.08), max(0.12, bar_end - (t + at)))

            s.note(
                lead_ch,
                pitch,
                t + at,
                d_clamped,
                base_vel,
                humanize=0.006 if bar == bars - 1 else 0.009,
                vib=(not night and lead_ch in (0, 2) and d_clamped >= 1.1),
            )

            # A'' harmonic doubling (Dorian third/sixth below)
            if sec_name == "App" and strong:
                harm_p = _dorian_shift(pitch, -2 if idx_ev % 2 == 0 else -5, min_p=48, max_p=96)
                harm_ch = 4 if night else 7
                s.note(harm_ch, harm_p, t + at, d_clamped, base_vel * 0.68, humanize=0.008)

            # Stereo Crystal Echo Cascades on bar downbeats & lyrical peaks
            if at == 0 or (sec_name in ("intro", "B", "App") and idx_ev == len(events) - 1 and at >= 2.5 and bar < bars - 1):
                if at == 0:
                    _schedule_echo_cascade(s, pitch - (12 if night else 0), t + at, base_vel, bar, night, bar_end)
                else:
                    p_peak = _snap_dorian(pitch + (0 if night else 12), min_p=60, max_p=100)
                    b_echo = t + at + 0.50
                    if b_echo + 0.40 <= bar_end:
                        s.note(6, p_peak, b_echo, min(0.65, bar_end - b_echo), base_vel * 0.34, pan=(106 if bar % 2 == 0 else 22))

        # Section C: Ch 0 steps back into sparse resonant cavern bell anchor
        if sec_name == "C":
            anchor_p = _snap_dorian(tonic + (12 if night else 0), min_p=57, max_p=96)
            anchor_p = engine.chord_pitch(anchor_p, voicing, root, strong=True)
            s.note(0, anchor_p, t, 1.85, base_vel * 0.60, humanize=0.008)
            if pos % 2 == 1:
                fifth_p = _dorian_shift(anchor_p, 4, min_p=57, max_p=98)
                s.note(0, fifth_p, t + 2.0, 1.50, base_vel * 0.48, humanize=0.008)

        # Countermelody (Day Cave Flute in A'/B/A''; Night Music Box accents in A/A'/B/A'')
        if not night:
            if sec_name in ("Ap", "B", "App") and pos % 2 == 1:
                c1 = _snap_dorian(voicing[2] + 12, min_p=60, max_p=91)
                c2 = _dorian_shift(c1, 1 if pos % 4 == 1 else -1, min_p=60, max_p=91)
                s.note(2, c1, t + 2.0, 0.90, base_vel * 0.62, vib=False)
                s.note(2, c2, t + 3.0, 0.85, base_vel * 0.66, vib=False)
        else:
            if sec_name in ("A", "Ap", "B", "App") and pos in (1, 3, 5, 7):
                m1 = _snap_dorian(voicing[3] + 12, min_p=69, max_p=96)
                m2 = _dorian_shift(m1, -1, min_p=69, max_p=96)
                s.note(2, m1, t + 2.25, 0.70, base_vel * 0.56)
                s.note(2, m2, t + 3.00, 0.75, base_vel * 0.50)

        # Bar 0 first-2s sparkle guarantees >= 6 notes across >= 3 channels before 2.0s
        if bar == 0:
            if night:
                # Extra early bell shimmer on Ch 4 inside beats 0..2.2
                s.note(4, _snap_dorian(tonic + 12), t + 0.50, 0.90, 42, pan=30)
                s.note(4, _snap_dorian(tonic + 19), t + 1.50, 0.85, 38, pan=98)
            else:
                # Early Celesta echo on Ch 7 inside beats 0..2.4 (clears Echo 2 bell at t+1.55)
                s.note(7, _snap_dorian(tonic + 12), t + 0.50, 0.75, 44, pan=100)
                s.note(7, _snap_dorian(tonic + 19), t + 2.00, 0.80, 40, pan=28)

        # Bass (Ch 3 Fretless Bass) — warm resonant fifths/octaves in A Dorian
        bass_root = _snap_dorian(root, min_p=33, max_p=52)
        bass_fifth = _snap_dorian(bass_root + 7, min_p=33, max_p=55)
        bass_vel = 48 if night else 58
        if sec_name == "turn" and pos == 3:
            # Final bar sustains smoothly until 191.84 for clean loop wrap
            s.note(3, bass_root, t, min(3.82, bar_end - t), bass_vel * 0.88, humanize=0.005)
        elif sec_name == "B":
            for at, p_b, d_b, v_mul in ((0.0, bass_root, 1.35, 1.0), (1.5, bass_fifth, 0.70, 0.78), (2.5, bass_root + 12, 1.15, 0.84)):
                s.note(3, _snap_dorian(p_b, 33, 59), t + at, d_b, bass_vel * v_mul)
        else:
            s.note(3, bass_root, t, 1.65, bass_vel)
            s.note(3, bass_fifth, t + 2.0, 1.45, bass_vel * 0.78)

        is_gliss_bar = (pos == sec_len - 1 and bar < bars - 1 and sec_name in ("intro", "A", "B", "C"))

        # Rhythmic / Arpeggio bed (Day Ch 1 Marimba + Ch 4 Harp; Night Ch 1 Bioluminescent Harp w/ pedal)
        if not night:
            # Marimba cavern water-droplet pulse
            mar_vel = 42 if sec_name not in ("B", "C") else (38 if sec_name == "C" else 46)
            arp_times = (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5) if sec_name in ("Ap", "B", "App") else (0.0, 0.5, 1.5, 2.5, 3.5)
            if sec_name == "turn" and pos == 3:
                arp_times = (0.0, 0.5, 1.0, 2.0)
            for idx_a, at in enumerate(arp_times):
                p_m = _snap_dorian(voicing[idx_a % len(voicing)], min_p=55, max_p=81)
                s.note(1, p_m, t + at, 0.34, mar_vel * (1.0 if idx_a % 2 == 0 else 0.84), humanize=0.006)
            # Harp cascade accompaniment (Ch 4)
            if sec_name in ("A", "Ap", "B", "C", "App"):
                harp_day_times = (0.25, 1.25, 2.25) if is_gliss_bar else (0.25, 1.25, 2.25, 3.25)
                for idx_h, at in enumerate(harp_day_times):
                    p_h = _snap_dorian(voicing[(idx_h + 1) % len(voicing)] + 12, min_p=60, max_p=93)
                    s.note(4, p_h, t + at, min(0.85, bar_end - (t + at)), 38 if sec_name == "C" else 34, pan=(96 if bar % 2 == 0 else 36))
        else:
            # Night Bioluminescent Harp with sustain pedal & flowing Dorian arpeggios
            if pos % 2 == 0 and bar < bars - 1:
                s.pedal(1, t, t + 3.9, val=96)
            if sec_name == "turn" and pos == 3:
                harp_times = (0.0, 1.0, 2.0)
            elif is_gliss_bar:
                harp_times = (0.0, 0.75, 1.5, 2.25)
            else:
                harp_times = (0.0, 0.75, 1.5, 2.25, 3.0)
            harp_dur = 0.90 if (sec_name == "turn" and pos == 3) else 0.68
            for idx_h, at in enumerate(harp_times):
                p_h = _snap_dorian(voicing[idx_h % len(voicing)], min_p=55, max_p=88)
                s.note(1, p_h, t + at, min(harp_dur, bar_end - (t + at)), 38 if sec_name != "C" else 44, humanize=0.007, pan=(28 if idx_h % 2 == 0 else 58))

        # Section-transition Harp Dorian glissando (stereo L->R or R->L)
        if is_gliss_bar:
            g_notes = dorian_gliss_up if bar % 2 == 1 else dorian_gliss_down
            g_pan_a, g_pan_b = (22, 106) if bar % 2 == 1 else (106, 22)
            harp_ch = 1 if night else 4
            s.gliss(harp_ch, g_notes, t + 3.10, step=0.055, dur=0.45, vel=36 if night else 40, vel_step=1, pan_start=g_pan_a, pan_end=g_pan_b)

        # Strings / Pad (Ch 5) — compensated slow attack (>= 1.8b holds) + smooth CC11 swell
        if sec_name != "intro" or night:
            pad_vel = 36 if night else (46 if sec_name in ("B", "App") else 34)
            if sec_name == "turn" and pos == 3:
                pad_vel *= 0.85
            hold_dur = min(3.84, max(1.80, bar_end - t))
            s.swell(5, t, t + hold_dur, low=66, high=112 if sec_name in ("B", "App") else 98, steps=10)
            s.note(5, _snap_dorian(voicing[0], 48, 79), t, hold_dur, pad_vel, humanize=0.005)
            s.note(5, _snap_dorian(voicing[2], 55, 86), t, hold_dur, pad_vel * 0.90, humanize=0.005)
            if night:
                # Ch 7 Fantasia Glass Pad gentle halo
                s.swell(7, t, t + hold_dur, low=62, high=100, steps=8)
                s.note(7, _snap_dorian(voicing[3], 57, 88), t, hold_dur, 28 if sec_name != "B" else 34, humanize=0.005)

        # Day subtle Orchestra Kit cavern shimmer (Triangle & Cabasa, vel 24..38)
        if not night and sec_name in ("Ap", "B", "App"):
            if pos % 2 == 0:
                s.drum(81, t + 0.0, 32, dur=0.25)   # Open Triangle
            else:
                s.drum(80, t + 2.0, 26, dur=0.14)   # Mute Triangle
            s.drum(69, t + 1.0, 24, dur=0.08)       # Cabasa pulse
            s.drum(69, t + 3.0, 26, dur=0.08)
            if sec_name in ("B", "App"):
                s.drum(70, t + 1.5, 22, dur=0.08)   # Maracas off-beat shimmer
                s.drum(70, t + 3.5, 24, dur=0.08)

        # Final Bar 47 tail shimmer so end_beat <= 191.88 & rms_tail500 >= -40 dBFS
        if bar == bars - 1:
            t_tail = t + 2.95
            s.note(6, _snap_dorian(tonic + 12), t_tail, 0.88, 34, humanize=0.004, pan=24)
            s.note(6, _snap_dorian(tonic + 16), t_tail + 0.35, 0.55, 26, humanize=0.004, pan=104)
            if not night:
                s.note(7, _snap_dorian(tonic + 12), t_tail + 0.15, 0.72, 30, humanize=0.004, pan=96)
            else:
                s.note(4, _snap_dorian(tonic + 19), t_tail + 0.15, 0.72, 26, humanize=0.004, pan=36)

    # Module invariant: strictly A Dorian (zero F-natural or G#) and bounded within 48 bars
    for ev in s.ev:
        if ev[2] == "note_on" and ev[3] != 9:
            pc = ev[4] % 12
            if pc not in _DORIAN_PC_SET:
                raise AssertionError(f"Non-Dorian pitch {ev[4]} (pc={pc}) on ch {ev[3]} in {track_name}")

    return s
