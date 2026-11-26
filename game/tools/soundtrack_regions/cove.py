"""Coral Cove regional soundtrack builder (day-song, night-song)."""

import math

TRACKS = [
    {
        "name": "day-song",
        "region": "cove",
        "mode": "day",
        "title": "Coral Cove (Day)",
        "key": "C Major",
        "key_midi": "C",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 104,
        "swing": 0.04,
        "description": "Sunlit marimba, nylon guitar, flute, vibraphone & island percussion hub.",
    },
    {
        "name": "night-song",
        "region": "cove",
        "mode": "night",
        "title": "Coral Cove (Night)",
        "key": "C Major",
        "key_midi": "C",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 80,
        "swing": 0.0,
        "description": "Starry celesta, detuned tine EP, harp, cello & slow strings lullaby.",
    },
]

# 48-bar macro form:
#   Intro/Hook (bars 0-3)
#   A          (bars 4-11)
#   A'         (bars 12-19)
#   B          (bars 20-27)
#   C          (bars 28-35: Handoff/Solo while Ch 0 keeps soft ostinato/echo)
#   A''        (bars 36-43)
#   Turnaround (bars 44-47: Smooth resolution into Bar 0)
_HARMONY_DAY = (
    # Intro/Hook (0-3)
    "Iadd9 IVmaj7 ii7 Vsus4 "
    # A (4-11)
    "Imaj6 Iadd9 vi7 IVmaj7 ii9 V13 Iadd9 V7 "
    # A' (12-19)
    "Iadd9 iii IVmaj7 I6 vi9 ii9 Vsus4 V7 "
    # B (20-27)
    "IVmaj7 iv7 iii vi7 ii9 V/vi vi7 V13 "
    # C (28-35)
    "vi9 IVmaj7 Iadd9 V/ii ii9 IV6 Vsus4 V7 "
    # A'' (36-43)
    "Iadd9 iii IVmaj7 V13 vi9 IVadd9 ii9 V7 "
    # Turnaround (44-47)
    "IVmaj7 ii9 Vsus4 V7"
).split()

_HARMONY_NIGHT = (
    # Intro/Hook (0-3)
    "Iadd9 IVadd9 ii9 Vsus4 "
    # A (4-11)
    "Iadd9 Isus2 vi9 IVmaj7 ii9 Vsus4 Iadd9 V9 "
    # A' (12-19)
    "Iadd9 iii IVmaj7 Imaj6 vi9 ii9 Vsus4 V9 "
    # B (20-27)
    "IVmaj7 iv iii vi9 ii9 V/vi ii7 Vsus4 "
    # C (28-35)
    "vi7 IVadd9 Iadd9 V/ii ii9 IV6 Vsus4 V9 "
    # A'' (36-43)
    "Iadd9 iii IVmaj7 V9 vi9 IVadd9 ii9 V13 "
    # Turnaround (44-47)
    "IVadd9 ii9 Vsus4 V9"
).split()

# Intro/Hook (4 bars): opens on warm wave-lilt E5 -> G5 -> A5 -> G5 -> E5 -> D5
_INTRO_DAY_TEXT = (
    "0,4,.58 0.75,7,.52 1.5,9,.58 2.25,7,.52 3.0,4,.42 3.5,2,.40 | "
    "0,0,.65 1.0,9,.60 2.0,7,.65 3.0,4,.62 | "
    "0,5,.60 0.75,9,.55 1.5,12,.68 2.5,9,.55 3.25,5,.58 | "
    "0,7,.72 1.25,2,.65 2.25,4,.62 3.0,7,.75"
)

_INTRO_NIGHT_TEXT = (
    "0,4,.70 0.75,7,.70 1.5,9,.72 2.25,7,.70 3.0,4,.46 3.5,2,.44 | "
    "0,0,.90 1.0,9,.85 2.0,7,.90 3.0,4,.85 | "
    "0,5,.75 0.75,9,.70 1.5,12,.92 2.5,9,.70 3.25,5,.65 | "
    "0,7,.95 1.25,2,.85 2.25,4,.80 3.0,7,.85"
)

# Section A / A' / A'' (8 bars): Coral Cove sunlit & starlit theme
_THEME_A_DAY_TEXT = (
    "0,4,.62 0.75,7,.58 1.5,12,.72 2.5,9,.58 3.25,7,.60 | "
    "0,4,.65 1.0,0,.65 2.0,2,.65 3.0,7,.72 | "
    "0,9,.65 1.0,4,.60 2.0,7,.62 2.75,4,.55 3.5,0,.42 | "
    "0,5,.65 1.0,12,.72 2.25,9,.65 3.25,7,.62 | "
    "0,5,.58 0.75,4,.52 1.5,2,.62 2.5,9,.60 3.25,7,.58 | "
    "0,7,.62 1.0,11,.60 2.0,7,.62 3.0,4,.62 | "
    "0,4,.60 0.75,7,.55 1.5,12,.70 2.5,7,.58 3.25,4,.58 | "
    "0,2,.65 1.0,7,.62 2.0,5,.62 3.0,2,.65"
)

_THEME_A_NIGHT_TEXT = (
    "0,4,.75 0.75,7,.70 1.5,12,.95 2.5,9,.72 3.25,7,.65 | "
    "0,4,.88 1.0,0,.85 2.0,2,.85 3.0,7,.88 | "
    "0,9,.85 1.0,4,.82 2.0,7,.72 2.75,4,.68 3.5,0,.44 | "
    "0,5,.85 1.0,12,.98 2.25,9,.85 3.25,7,.68 | "
    "0,5,.72 0.75,4,.68 1.5,2,.88 2.5,9,.72 3.25,7,.65 | "
    "0,7,.88 1.0,11,.85 2.0,7,.85 3.0,4,.85 | "
    "0,4,.75 0.75,7,.70 1.5,12,.95 2.5,7,.72 3.25,4,.65 | "
    "0,2,.92 1.0,7,.85 2.0,5,.85 3.0,2,.85"
)

# Section B (8 bars): Warm borrowed-harmony bridge
_THEME_B_DAY_TEXT = (
    "0,9,.60 1.0,12,.58 2.0,11,.58 3.0,9,.58 | "
    "0,8,.62 0.75,7,.52 1.5,5,.60 2.5,3,.58 3.25,5,.55 | "
    "0,7,.58 0.75,4,.52 1.5,2,.58 2.5,4,.55 3.25,7,.55 | "
    "0,9,.58 0.75,7,.52 1.5,4,.62 2.5,7,.58 | "
    "0,5,.58 0.75,7,.52 1.5,9,.58 2.25,12,.60 3.0,9,.58 | "
    "0,11,.58 0.75,9,.52 1.5,8,.62 2.5,4,.58 3.25,8,.55 | "
    "0,9,.58 0.75,7,.52 1.5,4,.58 2.5,2,.58 | "
    "0,4,.58 0.75,7,.52 1.5,9,.60 2.5,7,.55 3.25,5,.55"
)

_THEME_B_NIGHT_TEXT = (
    "0,9,.88 1.5,12,.72 2.5,11,.72 3.25,9,.62 | "
    "0,8,.90 1.5,5,.72 2.5,3,.70 3.25,5,.62 | "
    "0,7,.85 1.5,4,.70 2.5,2,.70 3.25,7,.62 | "
    "0,9,.90 1.5,7,.72 2.5,4,.95 | "
    "0,5,.85 1.5,9,.72 2.5,12,.85 3.25,9,.62 | "
    "0,11,.85 1.5,8,.85 2.75,4,.85 | "
    "0,9,.85 1.5,7,.70 2.5,4,.75 3.25,2,.62 | "
    "0,4,.85 1.5,7,.72 2.5,9,.72 3.25,5,.62"
)

# Section C Solo Spotlights (8 bars)
# Day: Bars 28-31 Flute solo, Bars 32-35 Vibraphone solo
_SOLO_C_DAY_TEXT = (
    "0,12,1.25 1.5,11,.65 2.25,9,.70 3.0,7,.82 | "
    "0,9,1.15 1.5,7,.65 2.25,5,.70 3.0,4,.82 | "
    "0,7,1.25 1.5,9,.65 2.25,12,.75 3.0,14,.80 | "
    "0,13,1.25 1.5,9,.70 2.5,7,.65 3.25,9,.58 | "
    "0,5,.80 0.75,9,.65 1.5,12,.75 2.5,9,.75 | "
    "0,7,.80 0.75,5,.65 1.5,4,.75 2.5,2,.80 | "
    "0,0,.80 1.0,2,.75 2.0,4,.75 3.0,7,.75 | "
    "0,5,.80 1.0,4,.75 2.0,2,.90"
)

# Night: Cello lyrical tenor solo (low octave relative to tonic - 12 = C4..A4)
_SOLO_C_NIGHT_TEXT = (
    "0,0,1.6 1.75,4,.95 2.75,7,1.05 | "
    "0,9,1.6 1.75,7,.95 2.75,5,1.05 | "
    "0,4,1.6 1.75,2,.95 2.75,0,1.05 | "
    "0,-3,1.6 1.75,1,.95 2.75,4,1.05 | "
    "0,5,1.5 1.75,7,.95 2.75,9,1.05 | "
    "0,7,1.5 1.75,5,.95 2.75,4,1.05 | "
    "0,2,1.6 1.75,4,.95 2.75,7,1.05 | "
    "0,5,1.4 1.75,4,.95 2.75,2,1.05"
)

# Turnaround (4 bars: 44-47)
_TURN_DAY_TEXT = (
    "0,4,.58 0.75,7,.52 1.5,9,.58 2.25,7,.52 3.0,5,.58 | "
    "0,4,.58 0.75,2,.52 1.5,5,.58 2.5,4,.58 | "
    "0,2,.62 1.0,4,.58 2.0,7,.65 3.0,5,.58 | "
    "0,4,.62 1.0,2,.65 2.0,7,.80"
)

_TURN_NIGHT_TEXT = (
    "0,4,.72 0.75,7,.70 1.5,9,.72 2.25,7,.70 3.0,5,.72 | "
    "0,4,.75 1.5,2,.72 2.5,5,.72 3.25,4,.62 | "
    "0,2,.90 1.5,4,.72 2.5,7,.90 | "
    "0,4,.85 1.5,2,1.10"
)


def _voice_lead_distinct(prev_voicing, raw_voicing, min_p=55, max_p=79):
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


def _distinct_seq(pitches):
    descending = len(pitches) >= 2 and pitches[0] > pitches[-1]
    out = []
    seen = set()
    for p in pitches:
        cand = p
        while cand in seen:
            cand += -12 if (descending and cand - 12 >= 48) else 12
        seen.add(cand)
        out.append(cand)
    return out


def _clamp_bar47_dur(bar, n_bars, start_in_bar, dur, meter):
    if bar == n_bars - 1:
        return max(0.06, min(dur, meter - start_in_bar - 0.16))
    return max(0.06, dur)


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Coral Cove track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    tonic = 72  # C5

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 43 + 17,
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        s.set_channel(0, 12, "Marimba Lead", bank=0, pan=58, vol=88, rev=54, cho=16)
        s.set_channel(1, 24, "Nylon Guitar", bank=0, pan=38, vol=66, rev=50, cho=18)
        s.set_channel(2, 73, "Flute Counter", bank=0, pan=88, vol=72, rev=62, cho=22)
        s.set_channel(3, 32, "Acoustic Bass", bank=0, pan=64, vol=80, rev=26, cho=6)
        s.set_channel(4, 11, "Vibraphone", bank=0, pan=76, vol=74, rev=58, cho=20)
        s.set_channel(5, 45, "Pizzicato Strings", bank=0, pan=48, vol=66, rev=50, cho=14)
        s.set_channel(6, 48, "Warm Strings", bank=0, pan=82, vol=54, rev=68, cho=26)
        s.set_channel(7, 46, "Harp", bank=0, pan=34, vol=60, rev=72, cho=22)
        s.set_channel(9, 0, "Island Kit", bank=128, pan=64, vol=54, rev=28, cho=8)
    else:
        s.set_channel(0, 8, "Celesta Lead", bank=0, pan=60, vol=80, rev=64, cho=20)
        s.set_channel(1, 4, "Detuned Tine EP", bank=8, pan=44, vol=64, rev=56, cho=24)
        s.set_channel(2, 46, "Harp", bank=0, pan=88, vol=62, rev=70, cho=22)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=72, rev=30, cho=6)
        s.set_channel(4, 42, "Cello", bank=0, pan=48, vol=66, rev=64, cho=18)
        s.set_channel(5, 49, "Slow Strings", bank=0, pan=84, vol=50, rev=74, cho=28)
        s.set_channel(6, 9, "Glockenspiel", bank=0, pan=36, vol=48, rev=72, cho=20)

    intro_ph = engine.ph(_INTRO_NIGHT_TEXT if night else _INTRO_DAY_TEXT)
    theme_a_ph = engine.ph(_THEME_A_NIGHT_TEXT if night else _THEME_A_DAY_TEXT)
    theme_b_ph = engine.ph(_THEME_B_NIGHT_TEXT if night else _THEME_B_DAY_TEXT)
    solo_c_ph = engine.ph(_SOLO_C_NIGHT_TEXT if night else _SOLO_C_DAY_TEXT)
    turn_ph = engine.ph(_TURN_NIGHT_TEXT if night else _TURN_DAY_TEXT)

    harmony = _HARMONY_NIGHT if night else _HARMONY_DAY
    n_bars = len(harmony)  # 48

    # Smooth voice-leading states
    prev_comp_voicing = (60, 64, 67, 74)
    prev_pad_voicing = (60, 64, 67, 72)

    # Phrase-level CC11 swells & stereo pan motion
    for p_start, p_len, hi_s in ((0, 4, 102), (4, 8, 112), (12, 8, 114), (20, 8, 116), (28, 8, 108), (36, 8, 118), (44, 4, 102)):
        b0 = s.bar_beat(p_start)
        b1 = s.bar_beat(p_start + p_len) - 0.15
        s.swell(0, b0, b1, low=78, high=hi_s, steps=12, cc_num=11)
        if not night:
            s.swell(2, b0, b1, low=72, high=hi_s - 2, steps=10, cc_num=11)
            s.swell(4, b0, b1, low=74, high=hi_s - 4, steps=10, cc_num=11)
            if p_start >= 12:
                s.swell(6, max(0.0, b0 - 0.18), b1, low=64, high=hi_s - 2, steps=14, cc_num=11)
        else:
            s.swell(4, max(0.0, b0 - 0.14), b1, low=70, high=hi_s, steps=12, cc_num=11)
            if p_start >= 12:
                s.swell(5, max(0.0, b0 - 0.20), b1, low=62, high=hi_s - 4, steps=14, cc_num=11)

    for bar, sym in enumerate(harmony):
        t = s.bar_beat(bar)
        root, raw_voicing = engine.CH[sym]
        comp_v = _voice_lead_distinct(prev_comp_voicing, raw_voicing)
        prev_comp_voicing = comp_v
        pad_v = _voice_lead_distinct(prev_pad_voicing, raw_voicing, min_p=50, max_p=74)
        prev_pad_voicing = pad_v

        # Determine macro section & phrase position
        if bar < 4:
            sec_name, pos, sec_len = "intro", bar, 4
        elif bar < 12:
            sec_name, pos, sec_len = "A", bar - 4, 8
        elif bar < 20:
            sec_name, pos, sec_len = "A1", bar - 12, 8
        elif bar < 28:
            sec_name, pos, sec_len = "B", bar - 20, 8
        elif bar < 36:
            sec_name, pos, sec_len = "C", bar - 28, 8
        elif bar < 44:
            sec_name, pos, sec_len = "A2", bar - 36, 8
        else:
            sec_name, pos, sec_len = "turn", bar - 44, 4

        base_vel = engine.phrase_vel(54 if night else 66, pos, bars_per_phrase=sec_len, arc=0.14)
        if sec_name == "A2":
            base_vel *= 1.07
        elif sec_name == "turn" and pos >= 2:
            base_vel *= 0.88 if pos == 2 else 0.78

        if night:
            s.pedal(1, t, t + meter - 0.08 if bar == n_bars - 1 else t + meter)

        # ------------------------------------------------------------------
        # 1. Primary Ch 0 Motif DNA (continuous across all sections!)
        # ------------------------------------------------------------------
        if sec_name == "intro":
            mel_events = list(intro_ph[pos])
        elif sec_name in ("A", "A1", "A2"):
            mel_events = list(theme_a_ph[pos])
            # Gentle melodic variation in A1 (bars 12-19) and A2 (bars 36-43)
            if sec_name == "A1" and pos in (1, 5):
                at0, st0, du0 = mel_events[-1]
                mel_events[-1] = (at0, st0 + (2 if pos == 1 else -2), du0)
            if sec_name == "A2" and pos in (2, 6):
                at0, st0, du0 = mel_events[2]
                mel_events[2] = (at0, st0 + 2, du0)
        elif sec_name == "B":
            mel_events = list(theme_b_ph[pos])
        elif sec_name == "C":
            # Keep Ch 0 softly shimmering with motif-head ostinato/echo during solo handoff
            if not night:
                mel_events = [(0.0, 4, 0.45), (0.75, 7, 0.42), (1.5, 9, 0.45), (2.25, 7, 0.42)]
            else:
                mel_events = [(0.0, 4, 0.75), (1.5, 7, 0.75), (3.0, 9, 0.75)] if pos % 2 == 1 else [(0.0, 4, 0.80), (2.0, 7, 0.80)]
        else:
            mel_events = list(turn_ph[pos])

        ch0_vel = base_vel * (0.60 if sec_name == "C" else 1.0)
        for m_idx, (at, step, dur) in enumerate(mel_events):
            strong = (at == 0) if sec_name in ("intro", "A") else (at == 0 or (at >= 1.5 and dur >= 0.55))
            # Preserve exact opening wave-lilt Bar 0 on E5-G5-A5-G5-E5-D5
            if bar == 0:
                strong = False
            expected = tonic + int(step)
            pitch = engine.chord_pitch(expected, raw_voicing, root, strong=strong)
            d_base = dur
            if m_idx + 1 < len(mel_events):
                next_at = mel_events[m_idx + 1][0]
                ioi_swung = s._swing_beat(next_at) - s._swing_beat(at)
                d_base = min(d_base, max(0.06, ioi_swung - 0.035))
            d_clamped = _clamp_bar47_dur(bar, n_bars, at, s.clamp_dur(at, d_base), meter)
            s.note(0, pitch, t + at, d_clamped, ch0_vel, vib=False)

            # Day Vibraphone harmony doubles in A' and A''
            if not night and sec_name in ("A1", "A2") and (at == 0 or at == 1.5):
                harm_p = engine.chord_pitch(pitch - 3, raw_voicing, root, True)
                s.note(4, harm_p, t + at, min(1.1, d_clamped + 0.18), base_vel * 0.70, vib=True)
            # Night Glockenspiel starry octave sparkles on phrase peaks in A' / A'' / turn
            if night and sec_name in ("A1", "A2", "turn") and at == 1.5 and pos % 2 == 0:
                s.note(6, min(100, pitch + 12), t + at, d_clamped, base_vel * 0.56, vib=False)

        # ------------------------------------------------------------------
        # 2. Section C Solo Spotlight (bars 28-35)
        # ------------------------------------------------------------------
        if sec_name == "C":
            solo_ev = solo_c_ph[pos]
            if not night:
                # Bars 28-31: Flute solo (Ch 2); Bars 32-35: Vibraphone solo (Ch 4)
                solo_ch = 2 if pos < 4 else 4
                for at, step, dur in solo_ev:
                    p_solo = engine.chord_pitch(tonic + int(step), raw_voicing, root, at == 0 or dur >= 0.75)
                    d_c = _clamp_bar47_dur(bar, n_bars, at, s.clamp_dur(at, dur), meter)
                    pan_s = 82 if solo_ch == 2 else 46
                    s.note(solo_ch, p_solo, t + at, d_c, base_vel * 0.96, vib=True, pan=pan_s)
            else:
                # Night Cello lyrical tenor solo (Ch 4, -0.14b attack compensation)
                for at, step, dur in solo_ev:
                    p_solo = engine.chord_pitch((tonic - 12) + int(step), raw_voicing, root, at == 0 or dur >= 0.95)
                    t_att = max(0.0, t + at - 0.14) if (bar > 0 and at == 0.0) else (t + at)
                    d_c = max(0.10, dur)
                    s.note(4, p_solo, t_att, d_c, base_vel * 1.04, vib=True, pan=54)
                # Night Harp cascading fills in Sec C
                arp_c = _distinct_seq([comp_v[0], comp_v[1], comp_v[2], comp_v[3], comp_v[1] + 12, comp_v[2] + 12])
                arp_beats = (0.5, 1.0, 1.5) if pos == 7 else (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)
                for idx, at in enumerate(arp_beats):
                    pan_h = 34 + idx * 11
                    d_arp = min(0.72, 2.04 - at) if pos == 7 else 0.72
                    s.note(2, arp_c[idx], t + at, d_arp, base_vel * 0.68, pan=pan_h)

        # ------------------------------------------------------------------
        # 3. Day vs Night Counter-Voices & Orchestration
        # ------------------------------------------------------------------
        if not night:
            # Flute counter-answers (Ch 2) in A, A', B, A'', Turnaround (sustained >= 0.75b so 250ms attack blooms)
            if sec_name in ("A", "A1", "B", "A2", "turn") and pos % 2 == 1:
                fl_pan = 88 - (pos * 4)
                d1 = _clamp_bar47_dur(bar, n_bars, 1.5, 1.15, meter)
                d2 = _clamp_bar47_dur(bar, n_bars, 2.75, 0.95, meter)
                s.note(2, comp_v[2] + 12, t + 1.5, d1, base_vel * 0.74, vib=True, pan=fl_pan)
                if bar < n_bars - 1:
                    s.note(2, comp_v[3] + 12, t + 2.75, d2, base_vel * 0.78, vib=True, pan=fl_pan + 6)

            # Vibraphone gentle chord shimmer in Intro, A, B
            if sec_name in ("intro", "A", "B") and pos % 2 == 0:
                s.note(4, comp_v[3] + 12, t + 2.0, 1.2, base_vel * 0.62, vib=True, pan=74 if bar % 4 == 0 else 54)

            # Pizzicato Strings (Ch 5): buoyant hub off-beats
            if sec_name in ("intro", "A", "A1", "B", "A2"):
                pizz_beats = (0.5, 1.5, 2.5, 3.5) if sec_name in ("A1", "B", "A2") else (0.5, 2.0, 3.5)
                for idx, at in enumerate(pizz_beats):
                    p_pizz = comp_v[(idx + 1) % len(comp_v)]
                    s.note(5, p_pizz, t + at, 0.28, base_vel * (0.64 if idx % 2 == 0 else 0.54), pan=44 + (idx % 2) * 14)

            # Warm Strings (Ch 6): A', B, C, A'', Turnaround with -0.18b attack compensation
            if sec_name in ("A1", "B", "C", "A2", "turn"):
                t_str = max(0.0, t - 0.18) if bar > 0 else t
                str_dur = 4.02 if bar == n_bars - 1 else 3.85
                str_vel = 48 if sec_name == "A2" else (38 if sec_name == "turn" and pos >= 2 else 40)
                s.note(6, pad_v[0], t_str, str_dur, str_vel)
                s.note(6, pad_v[2], t_str, str_dur, str_vel * 0.92)
                if sec_name in ("B", "A2"):
                    s.note(6, pad_v[3], t_str, str_dur, str_vel * 0.82)

            # Harp (Ch 7): sunlit intro wave ripples + stereo-swept transition glisses
            if sec_name == "intro":
                harp_notes = _distinct_seq((comp_v[0], comp_v[1], comp_v[2], comp_v[3], comp_v[0] + 12, comp_v[2] + 12))
                intro_beats = (0.0, 0.5, 1.0, 1.5) if pos == 3 else (0.0, 0.5, 1.0, 1.5, 2.0, 2.75)
                for idx, at in enumerate(intro_beats):
                    s.note(7, harp_notes[idx], t + at, 0.55 if pos == 3 else 0.72, 46 + idx * 2, pan=34 + idx * 10)
            if (sec_name == "intro" and pos == 3) or (pos == 7 and sec_name in ("A", "A1", "B", "C", "A2")) or (bar == n_bars - 1):
                gliss_notes = _distinct_seq([comp_v[0], comp_v[1], comp_v[2], comp_v[3], comp_v[0] + 12, comp_v[2] + 12])
                g_start = 2.0 if bar == n_bars - 1 else 2.2
                s.gliss(7, gliss_notes, t + g_start, step=0.065, dur=0.55, vel=44, vel_step=3, pan_start=30, pan_end=98)

            # Nylon Guitar (Ch 1): island strums using voice-led chords
            if sec_name == "turn" and pos >= 2:
                d_g = _clamp_bar47_dur(bar, n_bars, 0.0, 1.8 if pos == 2 else 3.72, meter)
                s.strum(1, comp_v[:3], t + 0.0, d_g, 50 if pos == 2 else 46, spread=0.024, up=False)
                if pos == 2:
                    s.strum(1, comp_v[1:], t + 2.0, 1.5, 44, spread=0.020, up=True)
            else:
                s.strum(1, comp_v[:3], t + 0.0, 0.90, 52, spread=0.018, up=False)
                s.strum(1, comp_v[1:], t + 1.5, 0.70, 45, spread=0.014, up=True)
                s.strum(1, comp_v[:3], t + 2.5, 0.85, 48, spread=0.018, up=False)

            # Acoustic Bass (Ch 3)
            fifth = root + 7
            if sec_name == "intro" and pos < 2:
                # Warm pedal C anchor in bars 0-1
                s.note(3, 36, t + 0.0, 1.7, 52)
                s.note(3, 43, t + 2.0, 1.3, 42)
            elif bar == n_bars - 1:
                s.note(3, root, t + 0.0, 1.85, 52)
                s.note(3, fifth, t + 2.0, 1.80, 44)
            else:
                s.note(3, root, t + 0.0, 1.45, 54)
                s.note(3, fifth, t + 2.0, 1.15, 42)
                if sec_name in ("A1", "B", "A2") and pos % 2 == 1:
                    s.note(3, root + 12, t + 3.5, 0.35, 38)

            # Island Kit (Ch 9, 128:0, all notes in 21..108)
            if sec_name == "turn" and pos == 3:
                # Gentle thinning out on final bar into Bar 0
                s.drum(36, t + 0.0, 26)
                s.drum(69, t + 0.5, 16, dur=0.08)
                s.drum(81, t + 1.5, 18, dur=0.25)
            elif sec_name == "intro":
                s.drum(36, t + 0.0, 28)
                s.drum(37, t + 1.0, 20)
                s.drum(37, t + 3.0, 20)
                for at in (0.5, 1.5, 2.5, 3.5):
                    s.drum(69, t + at, 18, dur=0.08)
            else:
                k_vel = 36 if sec_name in ("A1", "A2") else 30
                s.drum(36, t + 0.0, k_vel)
                s.drum(36, t + 2.0, k_vel - 4)
                s.drum(37 if sec_name == "C" else 38, t + 1.0, 22 if sec_name == "C" else 24)
                s.drum(37 if sec_name == "C" else 38, t + 3.0, 22 if sec_name == "C" else 24)
                for at in (0.5, 1.5, 2.5, 3.5):
                    s.drum(70 if sec_name in ("A", "C") else 69, t + at, 20, dur=0.08)
                    if sec_name != "C":
                        s.drum(63 if at in (0.5, 2.5) else 64, t + at, 20, dur=0.08)
                if pos in (3, 7) and sec_name in ("A1", "B", "A2"):
                    s.drum(62, t + 3.25, 24, dur=0.08)
                    s.drum(63, t + 3.5, 26, dur=0.08)
                    s.drum(64, t + 3.75, 24, dur=0.08)
                if pos == 0 and sec_name in ("A", "A1", "A2"):
                    s.drum(81, t + 0.0, 22, dur=0.35)

        else:
            # ------------------------------------------------------------------
            # Night Orchestration
            # ------------------------------------------------------------------
            # Detuned Tine EP (Ch 1, bank=8 prog=4)
            if sec_name == "intro":
                s.strum(1, comp_v, t + 0.0, 1.88, 44, spread=0.032, up=False)
                s.note(1, comp_v[2], t + 2.0, 1.65, 34)
            elif sec_name == "turn" and pos >= 2:
                d_ep = _clamp_bar47_dur(bar, n_bars, 0.0, 3.75, meter)
                s.strum(1, comp_v, t + 0.0, d_ep, 42 if pos == 2 else 36, spread=0.035, up=False)
            else:
                ep_vel = 40 if sec_name in ("A2", "B") else 36
                for idx, at in enumerate((0.0, 1.0, 1.75, 2.5, 3.25)):
                    d_ep_hit = 0.68 if at in (1.0, 3.25) else 0.72
                    s.note(1, comp_v[idx % len(comp_v)], t + at, d_ep_hit, ep_vel - (2 if idx > 0 else 0))

            # Harp (Ch 2): broken-9th ripples in Intro/A/B/A'' + glisses at transitions
            is_gliss = (sec_name == "intro" and pos == 3) or (pos == 7 and sec_name in ("A", "A1", "B", "C", "A2")) or (bar == n_bars - 1)
            if sec_name in ("intro", "A", "B", "A2") and sec_name != "C":
                harp_beats = (0.25, 0.75, 1.25, 1.75, 2.25, 3.0) if sec_name == "intro" else (0.5, 1.5, 2.5, 3.25)
                if is_gliss:
                    harp_beats = tuple(b for b in harp_beats if b < 1.6)
                harp_pitches = _distinct_seq([comp_v[idx % len(comp_v)] + (12 if idx >= 4 else 0) for idx in range(len(harp_beats))])
                for idx, at in enumerate(harp_beats):
                    d_hb = min(0.75, 2.04 - at) if is_gliss else 0.75
                    s.note(2, harp_pitches[idx], t + at, d_hb, 38 + (idx % 3) * 3, pan=92 - idx * 8)

            if is_gliss:
                gliss_n = _distinct_seq(
                    [comp_v[3] + 12, comp_v[2] + 12, comp_v[1] + 12, comp_v[0] + 12, comp_v[3], comp_v[2]]
                    if bar == n_bars - 1
                    else [comp_v[0], comp_v[1], comp_v[2], comp_v[3], comp_v[0] + 12, comp_v[2] + 12]
                )
                g_start = 1.8 if bar == n_bars - 1 else 2.1
                s.gliss(2, gliss_n, t + g_start, step=0.075, dur=0.65, vel=38, vel_step=2, pan_start=96, pan_end=34)

            # Cello (Ch 4): warm bowed tenor counterlines in A, A', B, A'' (-0.14b attack comp)
            if sec_name in ("A", "A1", "B", "A2"):
                t_cel = max(0.0, t - 0.14) if bar > 0 else t
                c_vel = 48 if sec_name in ("B", "A2") else 42
                if pos % 2 == 0:
                    s.note(4, comp_v[1] - 12, t_cel, 2.2, c_vel, vib=True, pan=48)
                    s.note(4, comp_v[2] - 12, t + 2.0, 1.75, c_vel * 0.92, vib=True, pan=52)
                else:
                    s.note(4, comp_v[0] - 12, t_cel, 1.8, c_vel, vib=True, pan=48)
                    s.note(4, comp_v[3] - 12, t + 1.86, 1.85, c_vel * 0.94, vib=True, pan=50)

            # Slow Strings (Ch 5): nocturnal velvet cushion in A', B, C, A'', Turnaround (-0.20b attack comp)
            if sec_name in ("A1", "B", "C", "A2", "turn"):
                t_str = max(0.0, t - 0.20) if bar > 0 else t
                str_dur = 3.72 if bar == n_bars - 1 else 3.85
                str_vel = 42 if sec_name == "A2" else (28 if sec_name == "turn" and pos >= 2 else 35)
                s.note(5, pad_v[0], t_str, str_dur, str_vel)
                s.note(5, pad_v[2], t_str, str_dur, str_vel * 0.90)
                if sec_name in ("B", "A2"):
                    s.note(5, pad_v[3], t_str, str_dur, str_vel * 0.80)

            # Fretless Bass (Ch 3)
            fifth = root + 7
            if sec_name == "intro" and pos < 2:
                s.note(3, 36, t + 0.0, 1.8, 44)
                s.note(3, 43, t + 2.0, 1.4, 36)
            elif bar == n_bars - 1:
                s.note(3, root, t + 0.0, 1.8, 42)
                s.note(3, fifth, t + 2.0, 1.76, 34)
            else:
                s.note(3, root, t + 0.0, 1.65, 45)
                s.note(3, fifth, t + 2.0, 1.35, 36)

    return s
