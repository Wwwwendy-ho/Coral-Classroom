"""Bottle Beach regional soundtrack builder (region-beach-song, region-beach-night-song)."""

import math

TRACKS = [
    {
        "name": "region-beach-song",
        "region": "beach",
        "mode": "day",
        "title": "Bottle Beach (Day)",
        "key": "C Major",
        "key_midi": "C",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 98,
        "swing": 0.03,
        "description": "Breezy steel drum, nylon guitar bossa clave, harp ripples & flute.",
    },
    {
        "name": "region-beach-night-song",
        "region": "beach",
        "mode": "night",
        "title": "Bottle Beach (Night)",
        "key": "C Major",
        "key_midi": "C",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 78,
        "swing": 0.0,
        "description": "Moonlit fingerpicked nylon guitar, detuned Rhodes, cello & brush whisper.",
    },
]

# 48-bar macro form:
# Intro/Hook (0-3) -> A (4-11) -> A' (12-19) -> B (20-27) -> C (28-35) -> A'' (36-43) -> Turnaround (44-47)
_HARMONY_BARS = (
    # Intro/Hook (0-3): warm Maj7 -> Lydian II -> ii9 -> V13
    "Imaj7", "II", "ii9", "V13",
    # A (4-11)
    "Imaj9", "II", "ii9", "V13",
    "iii", "vi9", "ii9", "V13",
    # A' (12-19)
    "Imaj7", "II", "ii9", "V13",
    "iii", "vi9", "IVmaj7", "V9",
    # B (20-27): bittersweet minor-iv bossa lift
    "IVmaj7", "iv7", "iii", "vi9",
    "ii9", "V13", "Imaj7", "V/ii",
    # C (28-35): Flute/Harp (Day) & Harp/Rhodes (Night) handoff
    "ii9", "V13", "Imaj7", "vi9",
    "IVmaj7", "II", "ii9", "V13",
    # A'' (36-43)
    "Imaj9", "II", "ii9", "V13",
    "iii", "vi9", "IVmaj7", "V13",
    # Turnaround (44-47): dreamy bVImaj7 backdoor resolution into Bar 0
    "Imaj9", "bVImaj7", "ii9", "V13",
)

# Intro/Hook (4 bars): syncopated 3rd/7th/Lydian #4 bossa hook (no C-E-G triad opening)
_MOTIF_HOOK_TEXT = (
    "0,4,.65 0.75,11,.65 1.5,9,.65 2.25,7,.65 3.0,2,.78 | "
    "0,6,.65 0.75,9,.65 1.5,14,.65 2.25,12,.65 3.0,6,.78 | "
    "0,5,.65 0.75,9,.65 1.5,12,.65 2.25,9,.65 3.0,4,.78 | "
    "0,11,.65 0.75,9,.65 1.5,7,.65 2.5,4,.95"
)

# Section A / A' / A'' (8 bars)
_MOTIF_A_TEXT = (
    "0,11,.65 0.75,14,.65 1.5,12,.65 2.25,11,.65 3.0,7,.78 | "
    "0,6,.65 0.75,9,.65 1.5,12,.65 2.25,9,.65 3.0,6,.78 | "
    "0,5,.65 0.75,7,.65 1.5,9,.65 2.25,12,.65 3.0,9,.78 | "
    "0,11,.65 0.75,9,.65 1.5,7,.65 2.25,4,.85 | "
    "0,7,.65 0.75,11,.65 1.5,14,.65 2.25,12,.65 3.0,11,.78 | "
    "0,9,.65 0.75,11,.65 1.5,12,.65 2.25,11,.65 3.0,7,.78 | "
    "0,5,.65 0.75,4,.65 1.5,2,.65 2.25,5,.65 3.0,9,.78 | "
    "0,7,.72 0.75,4,.65 1.5,2,.72 2.5,11,.90"
)

# Section B (8 bars): bittersweet IVmaj7 -> iv7 -> iii -> vi9 -> V/ii
_MOTIF_B_TEXT = (
    "0,9,.65 0.75,12,.65 1.5,16,.65 2.25,14,.65 3.0,12,.78 | "
    "0,8,.65 0.75,12,.65 1.5,15,.65 2.25,12,.65 3.0,8,.78 | "
    "0,7,.65 0.75,11,.65 1.5,14,.65 2.25,11,.65 3.0,7,.78 | "
    "0,9,.65 0.75,7,.65 1.5,4,.75 2.5,7,.85 | "
    "0,5,.65 0.75,9,.65 1.5,12,.65 2.25,11,.65 3.0,9,.78 | "
    "0,7,.65 0.75,9,.65 1.5,11,.65 2.25,9,.65 3.0,4,.78 | "
    "0,4,.65 0.75,7,.65 1.5,11,.65 2.25,9,.65 3.0,7,.78 | "
    "0,9,.65 0.75,7,.65 1.5,4,.65 2.25,1,.88"
)

# Turnaround (4 bars): Imaj9 -> bVImaj7 -> ii9 -> V13
_MOTIF_TURN_TEXT = (
    "0,4,.65 0.75,11,.65 1.5,9,.65 2.25,7,.65 3.0,2,.78 | "
    "0,3,.65 0.75,7,.65 1.5,8,.65 2.25,12,.65 3.0,7,.78 | "
    "0,5,.65 0.75,9,.65 1.5,12,.65 2.25,9,.65 3.0,4,.78 | "
    "0,11,.72 0.75,9,.72 1.5,7,1.20"
)

# Section C Day Flute solo (bars 28-31) and Harp solo (bars 32-35)
_SOLO_C_FLUTE_TEXT = (
    "0,9,1.35 1.5,12,1.20 2.75,14,1.15 | "
    "0,11,1.40 1.5,9,1.15 2.75,7,1.15 | "
    "0,11,1.45 1.5,14,1.15 2.75,16,1.10 | "
    "0,14,1.40 1.5,12,1.15 2.75,11,1.10"
)
_SOLO_C_HARP_TEXT = (
    "0,9,.7 0.5,12,.7 1.0,16,.7 1.5,14,.7 2.25,12,.7 3.0,9,.85 | "
    "0,6,.7 0.5,9,.7 1.0,12,.7 1.5,14,.7 2.25,12,.7 3.0,9,.85 | "
    "0,5,.7 0.5,9,.7 1.0,12,.7 1.5,16,.7 2.25,14,.7 3.0,12,.85 | "
    "0,11,.7 0.75,9,.7 1.5,7,.7 2.25,4,.7 3.0,2,.85"
)


def _dedup_voicing(voicing, low=55, high=78):
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


def _section_info(bar):
    """Return (section_name, local_pos, section_len) for 48-bar Bottle Beach form."""
    if bar < 4:
        return "hook", bar, 4
    if bar < 12:
        return "A", bar - 4, 8
    if bar < 20:
        return "A1", bar - 12, 8
    if bar < 28:
        return "B", bar - 20, 8
    if bar < 36:
        return "C", bar - 28, 8
    if bar < 44:
        return "A2", bar - 36, 8
    return "turn", bar - 44, 4


def _clamp_bar_end(bar, at, dur, meter):
    if bar == 47:
        return max(0.06, min(dur, meter - 0.10 - at))
    return max(0.06, dur)


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Bottle Beach track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    shift = 0
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
        s.set_channel(0, 114, "Steel Drums Lead", bank=0, pan=62, vol=86, rev=56, cho=18)
        s.set_channel(1, 24, "Nylon Guitar Bossa", bank=0, pan=38, vol=64, rev=50, cho=16)
        s.set_channel(2, 73, "Flute Counter", bank=0, pan=88, vol=64, rev=62, cho=22)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=78, rev=26, cho=6)
        s.set_channel(4, 46, "Harp Harmony", bank=0, pan=36, vol=64, rev=72, cho=24)
        s.set_channel(5, 48, "Warm Strings", bank=0, pan=84, vol=46, rev=68, cho=28)
        s.set_channel(9, 32, "Beach Bossa Percussion", bank=128, pan=64, vol=38, rev=28, cho=8)
    else:
        s.set_channel(0, 24, "Nylon Guitar Lead", bank=0, pan=60, vol=82, rev=58, cho=18)
        s.set_channel(1, 4, "Detuned Rhodes", bank=8, pan=38, vol=56, rev=58, cho=24)
        s.set_channel(2, 42, "Cello Counter", bank=0, pan=88, vol=58, rev=62, cho=20)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=68, rev=26, cho=6)
        s.set_channel(4, 46, "Harp Moonlight", bank=0, pan=36, vol=62, rev=74, cho=24)
        s.set_channel(5, 89, "Moonlit Warm Pad", bank=0, pan=82, vol=38, rev=72, cho=28)
        s.set_channel(9, 40, "Brush Whisper", bank=128, pan=64, vol=24, rev=32, cho=8)

    motif_hook = engine.ph(_MOTIF_HOOK_TEXT)
    motif_a = engine.ph(_MOTIF_A_TEXT)
    motif_b = engine.ph(_MOTIF_B_TEXT)
    motif_turn = engine.ph(_MOTIF_TURN_TEXT)
    solo_c_flute = engine.ph(_SOLO_C_FLUTE_TEXT)
    solo_c_harp = engine.ph(_SOLO_C_HARP_TEXT)

    prev_comp_voicing = (60, 64, 67, 71)
    prev_pad_voicing = (60, 64, 67, 71)

    for bar, sym in enumerate(_HARMONY_BARS):
        sec_name, pos, sec_len = _section_info(bar)
        t = s.bar_beat(bar)
        root, raw_voicing = engine.CH[sym]
        root += shift
        raw_voicing = tuple(p + shift for p in raw_voicing)

        prev_comp_voicing = engine.voice_lead(prev_comp_voicing, raw_voicing)
        comp_voicing = _dedup_voicing(prev_comp_voicing)
        prev_pad_voicing = engine.voice_lead(prev_pad_voicing, raw_voicing)
        pad_voicing = _dedup_voicing(prev_pad_voicing)

        # Smooth 2-bar CC11 swells on lead/strings/counter voices
        if bar % 2 == 0:
            span = meter * 2.0 - (0.12 if bar >= 46 else 0.0)
            s.swell(0, t, t + span, low=84, high=116, steps=8)
            s.swell(4, t, t + span, low=80, high=112, steps=8)
            if sec_name in ("A1", "B", "C", "A2"):
                s.swell(2, t, t + span, low=78, high=114, steps=8)
                s.swell(5, t, t + span, low=74, high=112, steps=8)

        if night:
            s.pedal(1, t, t + meter + (0.02 if bar == 47 else 0.0))

        # --- Primary Ch 0 Regional Motif DNA ---
        base_vel = engine.phrase_vel(54 if night else 68, pos, bars_per_phrase=sec_len)
        if sec_name == "hook":
            events = list(motif_hook[pos])
            lead_vel = base_vel * 0.90
        elif sec_name in ("A", "A1", "A2"):
            events = list(motif_a[pos])
            if sec_name == "A1" and pos in (1, 3, 5):
                at, step, dur = events[-1]
                events[-1] = (at, step + (2 if pos == 3 else -2), dur)
            elif sec_name == "A2" and pos == 7:
                at, step, dur = events[-1]
                events[-1] = (at, step + 3, dur)
            lead_vel = base_vel * (1.06 if sec_name == "A2" else 1.0)
        elif sec_name == "B":
            events = list(motif_b[pos])
            lead_vel = base_vel * 1.02
        elif sec_name == "C":
            # Soft motif-head echoes on Ch 0 during Section C solo handoff
            src = motif_a[pos]
            events = [(src[0][0] + 1.5 if src[0][0] == 0 else src[0][0], src[0][1], 0.65)]
            if len(src) >= 3:
                events.append((3.0, src[2][1], 0.70))
            lead_vel = base_vel * 0.56
        else:
            events = list(motif_turn[pos])
            lead_vel = base_vel * (0.82 if pos >= 2 else 0.94)

        for at, step, dur in events:
            # Preserve color tones (9th, 13th, Lydian #4) while locking downbeats to chord tones
            strong = at == 0 and sec_name != "hook"
            pitch = engine.chord_pitch(tonic + int(step), raw_voicing, root, strong)
            if night:
                cap = (meter - 0.05 - at) if bar < 47 else (meter - 0.10 - at)
                note_dur = max(0.06, min(dur * 1.28, cap))
            else:
                note_dur = _clamp_bar_end(bar, at, dur, meter)
            s.note(0, pitch, t + at, note_dur, lead_vel, vib=False if night else dur >= 1.1)

            # Day A'/A'' subtle Harp harmonic double on phrase anchors
            if not night and sec_name in ("A1", "A2") and at == 0:
                harm_p = engine.chord_pitch(pitch - 4, raw_voicing, root, True)
                s.note(4, harm_p, t + at, note_dur, lead_vel * 0.62)

        # --- Section C Solo Handoff (bars 28-35) ---
        if sec_name == "C":
            if not night:
                if pos < 4:
                    # Bars 28-31: Singing Flute solo (long 1.1-1.45 beat phrases)
                    for at, step, dur in solo_c_flute[pos]:
                        p = engine.chord_pitch(tonic + int(step), raw_voicing, root, at == 0)
                        s.note(2, p, t + at, dur, base_vel * 0.92, vib=True)
                    # Gentle Harp chord ripple underneath
                    s.note(4, comp_voicing[1], t + 0.5, 0.95, 42, pan=42)
                    s.note(4, comp_voicing[3], t + 2.0, 0.95, 40, pan=84)
                else:
                    # Bars 32-35: Shimmering Harp solo with drifting stereo pan
                    harp_pan = 42 + (pos - 4) * 14
                    for idx, (at, step, dur) in enumerate(solo_c_harp[pos - 4]):
                        p = engine.chord_pitch(tonic + int(step), raw_voicing, root, at == 0)
                        s.note(4, p, t + at, dur, base_vel * 0.88, pan=min(98, harp_pan + idx * 3))
                    # Sustained Flute warmth underneath (compensating for 250 ms breath attack)
                    s.note(2, comp_voicing[2] + 12, t + 0.0, 2.25, 44, vib=True)
            else:
                if pos < 4:
                    # Bars 28-31: Moonlit Harp solo ripples
                    arp_notes = [
                        comp_voicing[0] + 12,
                        comp_voicing[2] + 12,
                        comp_voicing[3] + 12,
                        comp_voicing[1] + 12,
                        comp_voicing[3] + 12,
                        comp_voicing[2] + 12,
                    ]
                    for idx, at in enumerate((0.0, 0.5, 1.0, 1.75, 2.5, 3.25)):
                        s.note(4, arp_notes[idx], t + at, 0.95, 48 - idx * 2, pan=36 + idx * 11)
                    # Singing Cello pedal beneath (-0.18 beat attack comp)
                    s.note(2, root + 24, max(0.0, t - 0.18), 3.30, 44, vib=True)
                else:
                    # Bars 32-35: Detuned Rhodes upper-register singing solo
                    rhodes_mel = [
                        comp_voicing[3] + 12,
                        comp_voicing[2] + 12,
                        comp_voicing[1] + 12,
                        comp_voicing[3] + 12,
                    ]
                    for idx, at in enumerate((0.0, 1.0, 2.0, 3.0)):
                        s.note(1, rhodes_mel[idx], t + at, 0.95, 52, vib=False)
                    # Answering Harp cascade on odd bars
                    if pos % 2 == 1:
                        s.gliss(4, [comp_voicing[0] + 12, comp_voicing[1] + 12, comp_voicing[2] + 12, comp_voicing[3] + 12],
                                t + 2.0, step=0.18, dur=0.95, vel=42, pan_start=88, pan_end=40)

        # --- Ch 2 Counter-Melody (Day Flute 250ms peak / Night Cello 650ms peak) ---
        if not night:
            if sec_name in ("A", "A1", "B", "A2") and pos in (1, 3, 5, 7):
                # Long lyrical Flute phrases (1.25-2.10 beats)
                fl_p1 = comp_voicing[2] + 12
                fl_p2 = comp_voicing[3] + 12
                if pos in (1, 5):
                    s.note(2, fl_p1, t + 1.75, 1.95, base_vel * 0.64, vib=True)
                else:
                    s.note(2, fl_p2, t + 1.50, 1.20, base_vel * 0.66, vib=True)
                    s.note(2, fl_p1, t + 2.75, 1.20, base_vel * 0.62, vib=True)
            elif sec_name == "A2" and pos in (0, 4):
                s.note(2, comp_voicing[3] + 12, t + 0.0, 1.85, base_vel * 0.60, vib=True)
        else:
            # Night Cello (0:42, 650 ms bow peak): long 1.6-3.2 beat lines in C3-G4 tenor register, -0.18b attack comp
            if sec_name in ("A", "A1", "B", "A2"):
                cello_base = comp_voicing[1] - 12  # ~E3-G3-B3 range
                cello_top = comp_voicing[3] - 12
                if pos in (0, 2, 4, 6):
                    s.note(2, cello_base, max(0.0, t - 0.18), 2.35, 42, vib=True)
                else:
                    s.note(2, cello_top, max(0.0, t + 0.82), 1.65, 46, vib=True)
                    s.note(2, cello_base, t + 2.40, 1.34, 42, vib=True)
            elif sec_name == "turn" and pos in (0, 1):
                s.note(2, comp_voicing[2] - 12, max(0.0, t - 0.18), 3.40, 38, vib=True)

        # --- Ch 4 Harp Sparkles & Section Cadence Glisses (Day & Night) ---
        if sec_name == "hook":
            # Immediate <2s Harp Maj7/Lydian wave ripples
            wave = [comp_voicing[0], comp_voicing[1], comp_voicing[2], comp_voicing[3]]
            for idx, at in enumerate((0.5, 1.5, 2.5, 3.25)):
                s.note(4, wave[idx] + 12, t + at, 0.85, 38 + idx * 2, pan=36 + idx * 16)
        elif sec_name in ("A", "A1", "B", "A2"):
            if pos in (3, 7):
                gliss_notes = sorted({
                    comp_voicing[0], comp_voicing[1], comp_voicing[2],
                    comp_voicing[3], comp_voicing[0] + 12, comp_voicing[2] + 12,
                })
                s.gliss(4, gliss_notes, t + 2.15, step=0.075, dur=0.75,
                        vel=38 if night else 44, vel_step=2,
                        pan_start=34 if pos == 3 else 94, pan_end=94 if pos == 3 else 34)
        elif sec_name == "turn" and pos == 3:
            gliss_notes = sorted({
                comp_voicing[0], comp_voicing[1], comp_voicing[2],
                comp_voicing[3], comp_voicing[0] + 12, comp_voicing[2] + 12,
            })
            s.gliss(4, gliss_notes, t + 1.85, step=0.09, dur=0.70,
                    vel=36 if night else 42, vel_step=2, pan_start=30, pan_end=98)

        # --- Ch 5 Sustained Strings (Day 0:48, 109 ms attack) / Moonlit Warm Pad (Night 0:89, 680 ms swell) ---
        if not night:
            if sec_name in ("A1", "B", "C", "A2") or (sec_name == "turn" and pos < 3):
                pad_vel = 42 if sec_name in ("B", "A2") else 34
                start_b = t - 0.16
                dur_b = 3.90
                s.note(5, pad_voicing[0], start_b, dur_b, pad_vel)
                s.note(5, pad_voicing[2], start_b, dur_b, pad_vel * 0.90)
                if sec_name in ("B", "A2"):
                    s.note(5, pad_voicing[3], start_b, dur_b, pad_vel * 0.80)
        else:
            # Warm Pad needs >= 2-4 beats to bloom past 680 ms attack
            if sec_name in ("A", "A1", "B", "C", "A2") or (sec_name == "turn" and pos < 3):
                pad_vel = 32 if sec_name in ("B", "A2") else 26
                start_b = max(0.0, t - 0.22)
                dur_b = 3.95 if bar < 46 else 3.70
                s.note(5, pad_voicing[0], start_b, dur_b, pad_vel)
                s.note(5, pad_voicing[2], start_b, dur_b, pad_vel * 0.90)
                if sec_name in ("B", "A2"):
                    s.note(5, pad_voicing[3], start_b, dur_b, pad_vel * 0.82)
            elif bar == 47:
                # Soft gentle pad tail into bar 47 end (no bar 48 overshoot)
                s.swell(5, t - 0.22, t + 3.96, low=76, high=102, steps=6)
                s.note(5, pad_voicing[0], t - 0.22, 4.18, 24, humanize=0.0)
                s.note(5, pad_voicing[1], t - 0.22, 4.18, 22, humanize=0.0)
                s.note(5, pad_voicing[2], t - 0.22, 4.18, 22, humanize=0.0)

        # --- Ch 3 Fretless Bass: Dotted Bossa Pattern (0.0, 1.5, 2.0, 3.5) ---
        fifth = root + 7
        next_sym = _HARMONY_BARS[(bar + 1) % len(_HARMONY_BARS)]
        next_root = engine.CH[next_sym][0] + shift
        approach = next_root - 1 if abs(next_root - root) > 2 else fifth
        if not night:
            bass_events = (
                (0.0, root, 1.32, 56),
                (1.5, fifth, 0.42, 42),
                (2.0, fifth if pos % 2 == 0 else root + 12, 1.32, 48),
                (3.5, approach, _clamp_bar_end(bar, 3.5, 0.40, meter), 40),
            )
            if sec_name == "turn" and pos == 3:
                bass_events = ((0.0, root, 1.85, 48), (2.0, fifth, 1.80, 40))
            for at, p, dur, vel in bass_events:
                s.note(3, p, t + at, dur, vel)
        else:
            # Gentle moonlit bossa bass
            s.note(3, root, t + 0.0, 1.78, 46)
            if bar == 47:
                s.note(3, fifth, t + 2.0, 1.40, 36)
                s.note(3, approach, t + 3.5, 0.46, 34, humanize=0.0)
            else:
                s.note(3, fifth, t + 2.0, 1.35, 38)
                if pos % 2 == 1:
                    s.note(3, approach, t + 3.5, 0.40, 32)

        # --- Ch 1 Harmony Comp & Ch 9 Percussion ---
        if not night:
            # Nylon Guitar: 3-2 bossa clave chord comp
            if bar % 2 == 0:
                comp_hits = ((0.0, comp_voicing[:3], 0.65, 50, False),
                             (0.75, comp_voicing[1:], 0.55, 44, True),
                             (1.5, comp_voicing[:3], 0.75, 48, False),
                             (2.5, comp_voicing[1:], 0.44, 44, True),
                             (3.0, comp_voicing[:4], 0.70, 48, False))
            else:
                comp_hits = ((0.0, comp_voicing[:3], 0.44, 46, False),
                             (0.5, comp_voicing[1:], 0.75, 48, True),
                             (1.5, comp_voicing[:3], 0.70, 48, False),
                             (2.5, comp_voicing[1:], 0.55, 44, True),
                             (3.25, comp_voicing[:3], _clamp_bar_end(bar, 3.25, 0.55, meter), 42, False))
            for at, chord_p, dur, vel, up_str in comp_hits:
                s.strum(1, chord_p, t + at, dur, vel * (0.86 if sec_name == "hook" else 1.0), spread=0.016, up=up_str)

            # Beach Bossa Percussion (128:32 Jazz Kit - attenuated velocities for 2-3x hotter SF2 gain!)
            clave_hits = (0.0, 0.75, 1.5) if bar % 2 == 0 else (0.5, 1.5, 2.5)
            for at in clave_hits:
                s.drum(37, t + at, 22 if sec_name in ("hook", "turn") else 26)
            if not (sec_name == "hook" and pos < 2) and not (sec_name == "turn" and pos == 3):
                for at, vel in ((0.0, 26), (1.5, 20), (2.0, 24), (3.5, 18)):
                    s.drum(36, t + at, vel)
            for idx, at in enumerate((0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)):
                if sec_name == "turn" and pos == 3 and at >= 3.0:
                    continue
                s.drum(82, t + at, 15 if idx % 2 == 0 else 11, dur=0.07)
            if pos in (3, 7) and sec_name in ("A", "A1", "B", "A2"):
                s.drum(64, t + 3.0, 20, dur=0.10)
                s.drum(63, t + 3.5, 22, dur=0.10)
        else:
            # Night Detuned Rhodes (8:4): warm rolled Maj7/9 chords + gentle fingerpicked inner pulse
            if pos % 2 == 0:
                s.strum(1, comp_voicing, t + 0.0, 1.65, 40, spread=0.032, up=False)
                s.strum(1, comp_voicing[1:], t + 2.0, 1.65, 36, spread=0.026, up=True)
            else:
                s.strum(1, comp_voicing, t + 0.0, 1.35, 38, spread=0.028, up=False)
                for idx, at in enumerate((1.5, 2.25, 3.0)):
                    dur = 0.96 if (bar == 47 and at == 3.0) else _clamp_bar_end(bar, at, 0.80, meter)
                    s.note(1, comp_voicing[(idx + 1) % len(comp_voicing)],
                           t + at, dur, 32,
                           humanize=0.0 if (bar == 47 and at == 3.0) else 0.010)

            # Ultra-soft Brush Whisper (128:40)
            for at in (1.0, 3.0):
                s.drum(40, t + at, 14 if sec_name in ("hook", "turn") else 17, dur=0.12)
            for at in (0.5, 1.5, 2.5, 3.5):
                if sec_name == "turn" and pos == 3 and at >= 3.0:
                    continue
                s.drum(42, t + at, 10, dur=0.08)
            if sec_name in ("A", "A1", "B", "A2") and bar % 2 == 0:
                s.drum(36, t + 0.0, 14, dur=0.10)
                s.drum(82, t + 2.75, 10, dur=0.07)

    return s
