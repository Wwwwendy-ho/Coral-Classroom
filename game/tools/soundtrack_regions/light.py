"""The Lighthouse regional soundtrack builder (region-light-song, region-light-night-song)."""

import math

TRACKS = [
    {
        "name": "region-light-song",
        "region": "light",
        "mode": "day",
        "title": "The Lighthouse (Day)",
        "key": "Eb Major",
        "key_midi": "Eb",
        "meter": (3, 4),
        "beats_per_bar": 3.0,
        "bars": 48,
        "bpm": 86,
        "swing": 0.0,
        "description": "Deadpan solemn 3/4 clockwork waltz jolted awake by crisp stay-alert pings.",
    },
    {
        "name": "region-light-night-song",
        "region": "light",
        "mode": "night",
        "title": "The Lighthouse (Night)",
        "key": "Eb Major",
        "key_midi": "Eb",
        "meter": (3, 4),
        "beats_per_bar": 3.0,
        "bars": 48,
        "bpm": 74,
        "swing": 0.0,
        "description": "Dignified sleepy night-watch piano, bassoon & sweeping stereo lighthouse beam.",
    },
]

# 48-bar macro architecture:
# Intro/Hook (4) -> A (8) -> A' (8) -> B (8) -> C (8) -> A'' (8) -> Turnaround (4)
_SECTIONS = (
    ("intro", ("I", "V", "vi", "V7")),
    ("A", ("I", "iii", "vi", "IV", "ii", "I6", "Vsus4", "V7")),
    ("A'", ("Iadd9", "V/vi", "vi", "IV", "ii", "V", "I6", "V7")),
    ("B", ("IV", "ii", "iii", "vi", "bVImaj7", "iv7", "Vsus4", "V7")),
    ("C", ("vi", "IV", "I6", "V/ii", "ii", "viim7b5", "Vsus4", "V7")),
    ("A''", ("I", "iii", "IV", "I6", "ii", "V", "I6", "V7")),
    ("turn", ("Iadd9", "vi", "ii", "V7")),
)

# Signature Lighthouse Motif A (solemn clockwork pendulum & sleepy sigh; disjoint from +4/+3/+2)
_MOTIF_A_TEXT = (
    "0,0,1.75 2,-5,0.85 | "
    "0,4,1.75 2,2,0.85 | "
    "0,0,1.35 1.5,-1,0.65 2.25,-3,0.60 | "
    "0,2,1.75 2,-5,0.75 | "
    "0,5,1.75 2,4,0.85 | "
    "0,2,1.35 1.5,0,0.65 2.25,-1,0.60 | "
    "0,0,1.75 2,4,0.85 | "
    "0,2,1.75 2,-5,0.75"
)

# Contrasting Section B (pompous maritime watch bridge)
_MOTIF_B_TEXT = (
    "0,5,1.75 2,7,0.85 | "
    "0,8,1.75 2,5,0.85 | "
    "0,7,1.45 1.5,5,0.65 2.25,4,0.60 | "
    "0,7,1.75 2,9,0.85 | "
    "0,8,1.75 2,7,0.85 | "
    "0,5,1.45 1.5,3,0.65 2.25,2,0.60 | "
    "0,0,1.75 2,2,0.85 | "
    "0,2,1.75 2,-5,0.75"
)

# C-section Piccolo/Celesta clockwork patrol solo (bars 28..31)
_C_SOLO_TEXT = (
    "0,12,0.45 1.0,15,0.45 2.0,12,0.45 | "
    "0,17,0.45 1.0,15,0.45 2.0,14,0.45 | "
    "0,12,0.45 1.0,14,0.45 2.0,15,0.45 | "
    "0,19,0.90 1.5,16,0.45 2.25,14,0.45"
)

# Bars where the watchkeeper is jolted awake on beat 2.0..2.5 (Day)
_DAY_JOLT_BARS = frozenset((3, 11, 19, 27, 35, 43, 47))
# Extra-stiff upright downbeats immediately following a jolt (including loop wrap into bar 0)
_STIFF_DOWNBEAT_BARS = frozenset((0, 4, 12, 20, 28, 36, 44))
# Drowsy micro-lag sigh bars in Day
_SLEEPY_SIGH_BARS = frozenset((1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 37, 38, 41, 42))


def _clamp_bar_dur(at_in_bar, dur, meter=3.0, margin=0.08):
    return max(0.06, min(dur, meter - at_in_bar - margin))


def _build_bar_plan():
    plan = []
    bar_idx = 0
    for sec_name, chords in _SECTIONS:
        sec_len = len(chords)
        for pos, sym in enumerate(chords):
            plan.append((bar_idx, sec_name, pos, sec_len, sym))
            bar_idx += 1
    return plan


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown The Lighthouse track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    total_bars = spec["bars"]
    total_beats = total_bars * meter
    shift = 3  # Eb Major

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 41 + (17 if night else 7),
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        # Day: Deadpan solemn clockwork waltz + crisp stay-alert jolts
        s.set_channel(0, 70, "Bassoon Lead", bank=0, pan=58, vol=88, rev=48, cho=12)
        s.set_channel(1, 0, "Mellow Grand Waltz", bank=8, pan=38, vol=74, rev=42, cho=10)
        s.set_channel(2, 115, "Woodblock Clockwork", bank=0, pan=88, vol=62, rev=28, cho=4)
        s.set_channel(3, 42, "Cello Bass", bank=0, pan=52, vol=72, rev=32, cho=8)
        s.set_channel(4, 72, "Piccolo Alert", bank=0, pan=84, vol=76, rev=50, cho=14)
        s.set_channel(5, 48, "Strings Fast Pad", bank=0, pan=92, vol=42, rev=62, cho=20)
        s.set_channel(6, 9, "Glockenspiel Alert", bank=0, pan=34, vol=80, rev=56, cho=16)
        s.set_channel(7, 45, "Pizzicato Posture Snap", bank=0, pan=74, vol=76, rev=40, cho=14)
        s.set_channel(9, 48, "Orchestra Kit", bank=128, pan=64, vol=64, rev=34, cho=6)
    else:
        # Night: Dignified sleepy night-watch + sweeping stereo lighthouse-beam chime
        s.set_channel(0, 0, "Mellow Grand Lead", bank=8, pan=76, vol=84, rev=62, cho=16)
        s.set_channel(1, 70, "Bassoon Night-Watch", bank=0, pan=56, vol=64, rev=56, cho=14)
        s.set_channel(2, 46, "Harp Night-Watch", bank=0, pan=88, vol=58, rev=66, cho=20)
        s.set_channel(3, 42, "Cello Bass", bank=0, pan=64, vol=68, rev=36, cho=8)
        s.set_channel(4, 8, "Celesta Handoff", bank=0, pan=84, vol=70, rev=66, cho=20)
        s.set_channel(5, 49, "Slow Strings", bank=0, pan=94, vol=44, rev=74, cho=26)
        s.set_channel(6, 9, "Beacon Beam Glockenspiel", bank=0, pan=64, vol=62, rev=74, cho=22)
        s.set_channel(7, 98, "Beacon Crystal Halo", bank=0, pan=64, vol=52, rev=78, cho=26)

    motif_a = engine.ph(_MOTIF_A_TEXT)
    motif_b = engine.ph(_MOTIF_B_TEXT)
    c_solo = engine.ph(_C_SOLO_TEXT)
    tonic = 63 if night else 51  # Eb4 (Night Mellow Grand) vs Eb3 (Day Bassoon)

    bar_plan = _build_bar_plan()
    assert len(bar_plan) == total_bars

    for bar, sec_name, pos, sec_len, sym in bar_plan:
        t = s.bar_beat(bar)
        root, voicing = engine.CH[sym]
        root += shift
        voicing = tuple(p + shift for p in voicing)

        is_jolt = (not night) and (bar in _DAY_JOLT_BARS)
        is_stiff = (not night) and (bar in _STIFF_DOWNBEAT_BARS)
        is_sleepy = (not night) and (bar in _SLEEPY_SIGH_BARS)

        # Phrase expression & sustain/pan automation
        expr = 88 + int(22 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi))
        s.cc(0, 11, expr, t)
        s.cc(4, 11, expr, t)

        if night:
            # Smooth sustain pedal on Piano (Ch 0) and Harp (Ch 2)
            s.pedal(0, t, t + meter, val=104)
            s.pedal(2, t, t + meter, val=96)

            # Sweeping stereo lighthouse-beam chime: 4-bar L->R and R->L sine arcs
            if bar % 4 == 0:
                cycle = bar // 4
                pan_start, pan_end = (18, 110) if (cycle % 2 == 0) else (110, 18)
                ramp_end = min(total_beats - 0.12, t + 11.8)
                s.cc_ramp(6, 10, pan_start, pan_end, t, ramp_end, steps=24, curve="sine")
                s.cc_ramp(7, 10, pan_start, pan_end, t, ramp_end, steps=24, curve="sine")

        # ------------------------------------------------------------------
        # 1. Lead Melody (Ch 0) & C-section Handoff (Ch 4)
        # ------------------------------------------------------------------
        if sec_name == "intro":
            events = list(motif_a[pos])
            lead_active = True
        elif sec_name in ("A", "A'", "A''"):
            events = list(motif_a[pos])
            lead_active = True
        elif sec_name == "B":
            events = list(motif_b[pos])
            lead_active = True
        elif sec_name == "C":
            if pos < 4:
                events = []
                lead_active = False
            else:
                events = list(motif_a[pos])
                lead_active = True
        else:  # turn (bars 44..47)
            events = list(motif_a[4 + pos])
            lead_active = True

        # Subtle A' sleepy sigh embellishment (keep Motif A contour intact)
        if sec_name == "A'" and pos in (1, 5) and len(events) >= 2:
            at, step, dur = events[-1]
            events[-1] = (at, step - 1, dur)

        # On Day jolt bars (3, 11, 19, 27, 35, 43, 47), trim beat-2 melody slightly for alert jolt
        if is_jolt and len(events) >= 2:
            at0, step0, dur0 = events[0]
            events = [(at0, step0, min(dur0, 1.65))]

        base_vel = engine.phrase_vel(58 if night else 66, pos, bars_per_phrase=max(4, sec_len), arc=0.14)
        if lead_active:
            for idx_ev, (at, step, dur) in enumerate(events):
                strong = (at == 0) or (at >= 1.0 and dur >= 0.75)
                pitch = engine.chord_pitch(tonic + int(step), voicing, root, strong)
                lag = 0.032 if (is_sleepy and at >= 1.4) else 0.0
                vel_ev = base_vel
                if is_stiff and idx_ev == 0:
                    vel_ev += 8
                elif is_sleepy and at >= 1.4:
                    vel_ev *= 0.90

                d_clamped = _clamp_bar_dur(at + lag, dur, meter=meter, margin=0.08)
                s.note(
                    0,
                    pitch,
                    t + at + lag,
                    d_clamped,
                    vel_ev,
                    humanize=0.0 if is_stiff else (0.008 if not night else 0.010),
                    vib=(not night) and (not is_stiff) and (dur >= 1.2),
                )

                # Night Celesta subtle octave shimmer on A' and A''
                if night and sec_name in ("A'", "A''") and pos in (1, 3, 5, 7) and idx_ev == 0:
                    cel_p = engine.chord_pitch(pitch + 12, voicing, root, True)
                    s.note(4, cel_p, t + 1.0, 0.85, base_vel * 0.68, humanize=0.008)

        # C-section Handoff (bars 28..31)
        if sec_name == "C" and pos < 4:
            solo_events = list(c_solo[pos])
            if not night:
                # Day: stiffly alert Piccolo (-0.05b) + Pizzicato clockwork patrol
                for at, step, dur in solo_events:
                    p_pic = engine.chord_pitch(63 + int(step), voicing, root, at == 0)
                    t_pic = max(0.0, t + at - 0.05)
                    s.note(4, p_pic, t_pic, dur, 64, humanize=0.0)
                    if at in (0.0, 2.0):
                        s.note(7, voicing[1], t + at, 0.25, 62, humanize=0.0)
                        s.note(7, voicing[2], t + at, 0.25, 60, humanize=0.0)
            else:
                # Night: Celesta nocturnal chime melody
                for at, step, dur in solo_events:
                    p_cel = engine.chord_pitch(63 + int(step), voicing, root, at == 0)
                    s.note(4, p_cel, t + at, min(dur + 0.25, 1.1), 58, humanize=0.008)

        # ------------------------------------------------------------------
        # 2. Waltz Piano / Bassoon Counter & Harp Night-Watch
        # ------------------------------------------------------------------
        if not night:
            # Day Ch 1: Mellow Grand Piano dry oom-pah-pah waltz
            # Beat 0.0 root/5th reinforcement locks with Cello -0.09b attack comp
            down_vel = 58 if is_stiff else 48
            s.note(1, root + 12, t, 0.42, down_vel, humanize=0.0 if is_stiff else 0.006)
            for at in (1.0, 2.0):
                if is_jolt and at == 2.0:
                    continue  # leave crisp space for the alert snap on beat 2.0
                chord_vel = 48 if is_stiff else (38 if sec_name in ("intro", "A") else 42)
                for p in voicing[1:4]:
                    s.note(1, p, t + at, 0.40, chord_vel, humanize=0.0 if is_stiff else 0.006)

            # Day Ch 2: Woodblock Clockwork steady 1-2-3 pendulum
            wb_vel_0 = 62 if is_stiff else (46 if sec_name == "B" else 54)
            wb_vel_off = 44 if sec_name == "B" else 48
            s.note(2, 72, t, 0.16, wb_vel_0, humanize=0.0)
            s.note(2, 77, t + 1.0, 0.14, wb_vel_off, humanize=0.0)
            if not is_jolt:
                s.note(2, 77, t + 2.0, 0.14, wb_vel_off, humanize=0.0)
        else:
            # Night Ch 1: Bassoon warm low-mid night-watch breathing anchors
            b_pitch = engine.chord_pitch(root + 12, voicing, root, True)
            b_fifth = engine.chord_pitch(root + 19, voicing, root, True)
            s.note(1, b_pitch, t, 1.55, 48 if sec_name != "intro" else 52, humanize=0.010, vib=True)
            if bar == 0 or pos % 2 == 0 or sec_name in ("B", "A''"):
                s.note(1, b_fifth, t + 2.0, _clamp_bar_dur(2.0, 0.82, meter), 40, humanize=0.010)

            # Night Ch 2: Harp gentle 3/4 broken arpeggio
            arp_times = (0.0, 1.0, 2.0) if sec_name in ("intro", "A", "turn") else (0.0, 0.5, 1.0, 1.5, 2.0, 2.5)
            arp_notes = (voicing[0], voicing[1], voicing[2], voicing[3], voicing[2], voicing[1])
            for idx_a, at in enumerate(arp_times):
                p_harp = arp_notes[idx_a % len(arp_notes)]
                dur_h = _clamp_bar_dur(at, 1.1 if len(arp_times) == 3 else 0.75, meter)
                s.note(2, p_harp, t + at, dur_h, 46 if idx_a == 0 else 38, humanize=0.008)

        # ------------------------------------------------------------------
        # 3. Cello Bass (Ch 3) with SF2 Attack Compensation
        # ------------------------------------------------------------------
        cello_comp = 0.08 if night else 0.09
        t_c0 = max(0.0, t - cello_comp)
        c_vel_0 = 62 if is_stiff else (56 if not night else 50)
        if not night:
            # Solemn oom-pah-pah Cello bass (beat 0.0 sustained, beat 2.0 lift)
            s.note(3, root, t_c0, 1.75, c_vel_0, humanize=0.0 if is_stiff else 0.006)
            if not is_jolt:
                t_c2 = max(0.0, t + 2.0 - cello_comp)
                d_c2 = min(0.82, total_beats - t_c2 - 0.08)
                s.note(3, root + 7, t_c2, d_c2, 42, humanize=0.006)
        else:
            # Night rich sustained Cello pedal tones (ringing to end on bar 47)
            d_c0 = min(2.75 if bar == total_bars - 1 else 1.85, total_beats - t_c0 - 0.08)
            s.note(3, root, t_c0, d_c0, c_vel_0, humanize=0.008)
            if bar < total_bars - 1 and pos % 2 == 1:
                t_c2 = max(0.0, t + 2.0 - cello_comp)
                s.note(3, root + 7, t_c2, min(0.85, total_beats - t_c2 - 0.08), 40, humanize=0.008)

        # ------------------------------------------------------------------
        # 4. Strings Pads (Ch 5) with SF2 Attack Compensation & Swell
        # ------------------------------------------------------------------
        if not night and sec_name in ("B", "A''"):
            t_str = max(0.0, t - 0.10)
            if pos == 0:
                s.swell(5, t_str, min(total_beats - 0.1, t_str + meter * 4.0), low=68, high=112, steps=16)
            pad_vel = 46 if sec_name == "B" else 42
            s.note(5, voicing[0], t_str, 2.80, pad_vel, humanize=0.008)
            s.note(5, voicing[2], t_str, 2.80, pad_vel * 0.88, humanize=0.008)
        elif night and sec_name in ("A'", "B", "C", "A''", "turn"):
            t_str = max(0.0, t - 0.18)
            if pos == 0:
                s.swell(
                    5,
                    t_str,
                    min(total_beats - 0.1, t_str + meter * min(4, sec_len)),
                    low=64,
                    high=114,
                    steps=16,
                )
            pad_vel = 42 if sec_name in ("B", "A''") else 34
            d_str = min(2.85, total_beats - t_str - 0.08)
            s.note(5, voicing[0], t_str, d_str, pad_vel, humanize=0.010)
            s.note(5, voicing[2], t_str, d_str, pad_vel * 0.88, humanize=0.010)

        # ------------------------------------------------------------------
        # 5. Day "Stay-Alert!" Jolts vs Night Sweeping Lighthouse Beam Chime
        # ------------------------------------------------------------------
        if not night:
            # Subtle Orchestra Kit Woodblock tick on beat 0.0 of every bar (keeps Ch 9 present & clockwork crisp)
            s.drum(76, t, 34 if is_stiff else 24, dur=0.08, humanize=0.0)
            if is_jolt:
                # Crisp "Stay alert!" jolt at beat 2.0..2.5
                s.drum(81, t + 2.0, 74, dur=0.45, humanize=0.0)  # Open Triangle
                s.drum(38, t + 2.0, 58, dur=0.08, humanize=0.0)  # Concert Snare
                if bar == 27:
                    s.drum(38, t + 2.25, 50, dur=0.07, humanize=0.0)  # Grand inspection ruff
                s.drum(38, t + 2.5, 62, dur=0.08, humanize=0.0)

                # Ch 6 Glockenspiel crisp ping (Eb6 -> Bb6)
                s.note(6, 87, t + 2.0, 0.35, 78, humanize=0.0)
                s.note(6, 94, t + 2.5, _clamp_bar_dur(2.5, 0.42, meter), 84, humanize=0.0)

                # Ch 4 Piccolo -0.05b attack comp crisp chirp
                s.note(4, 87, t + 1.95, 0.25, 72, humanize=0.0)
                s.note(4, 94, t + 2.45, _clamp_bar_dur(2.45, 0.32, meter), 78, humanize=0.0)

                # Ch 7 Pizzicato upright chord posture snap
                for p in voicing[1:4]:
                    s.note(7, p, t + 2.0, 0.22, 76, humanize=0.0)
                    s.note(7, p, t + 2.5, 0.25, 82, humanize=0.0)
        else:
            # Night: Sweeping Beacon Crystal Halo (Ch 7) + Beacon Beam Glockenspiel (Ch 6)
            if bar == 0 or bar % 2 == 0:
                # Crystal beacon halo rings cleanly across 2 bars (clamped safely on bar 46..47)
                d_crys = min(5.75, total_beats - t - 0.10)
                crys_vel = 44 if sec_name in ("C", "A''") else 36
                s.note(7, voicing[0] + 12, t, d_crys, crys_vel, humanize=0.008)
                s.note(7, voicing[2] + 12, t, d_crys, crys_vel * 0.85, humanize=0.008)

            # Beacon Glockenspiel chimes ride the rotating L->C->R->C->L beam
            if bar == 0:
                # Early beacon shimmer in <2.0s for distinct Night opening signature
                s.note(6, voicing[2] + 12, t + 0.5, 0.85, 42, humanize=0.006)
                s.note(6, voicing[3] + 12, t + 1.5, 0.85, 46, humanize=0.006)
            elif bar % 2 == 0 or sec_name == "C" or bar == total_bars - 1:
                beam_vel = 50 if sec_name in ("C", "A''") else 42
                s.note(6, voicing[2] + 12, t + 0.5, 0.80, beam_vel, humanize=0.006)
                s.note(6, voicing[3] + 12, t + 1.5, 0.80, beam_vel + 4, humanize=0.006)
                s.note(6, voicing[0] + 24 if voicing[0] + 24 <= 108 else voicing[0] + 12, t + 2.5, _clamp_bar_dur(2.5, 0.42, meter), beam_vel - 2, humanize=0.006)

    return s
