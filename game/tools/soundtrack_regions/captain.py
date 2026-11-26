"""Captain's Deck regional soundtrack builder (region-captain-song, region-captain-night-song)."""

import math

TRACKS = [
    {
        "name": "region-captain-song",
        "region": "captain",
        "mode": "day",
        "title": "Captain's Deck (Day)",
        "key": "D Minor",
        "key_midi": "Dm",
        "meter": (6, 8),
        "beats_per_bar": 3.0,
        "bars": 64,
        "bpm": 124,
        "swing": 0.0,
        "description": "Heroic 6/8 French horn & brass, galloping spiccato strings, accordion & fiddle march.",
    },
    {
        "name": "region-captain-night-song",
        "region": "captain",
        "mode": "night",
        "title": "Captain's Deck (Night)",
        "key": "D Minor",
        "key_midi": "Dm",
        "meter": (6, 8),
        "beats_per_bar": 3.0,
        "bars": 64,
        "bpm": 92,
        "swing": 0.0,
        "description": "Noble starlit naval watch: solo French horn, nylon guitar, harp, cello & slow strings.",
    },
]

# 64-bar 8-section narrative:
# Intro/Hook (0-7) -> A (8-15) -> A' (16-23) -> B (24-31) ->
# C1 Accordion (32-39) -> C2 Fiddle/Cello-Harp (40-47) -> A'' Climax (48-55) -> Turnaround (56-63)
_HARMONIES = (
    "Dm C Gm7 A7 Dm F Em7b5 A7",
    "Dm Gm7 C Fmaj7 Bbmaj7 Em7b5 Asus4 A7",
    "Dm C Bbmaj7 Gm7 Dm F Em7b5 A7",
    "F C Dm Gm7 Bb C G A7",
    "Gm7 Dm C F Bb Gm7 Em7b5 A7",
    "Dm C Bb F Gm7 Dm/A Asus4 A7",
    "Dm Gm7 C Fmaj7 Bbmaj7 Em7b5 Asus4 A7",
    "Dm Bb Gm7 A7 F C Em7b5 A7",
)

# All motif steps are semitones relative to tonic D4 = 62.
_MOTIF_HOOK_DAY = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.65 0.75,2,.22 1,5,.42 1.5,10,.9 2.5,7,.42 | "
    "0,8,.9 1,7,.42 1.5,5,.42 2,3,.42 2.5,2,.42 | "
    "0,7,1.35 1.5,2,.42 2,-1,.42 2.5,7,.42 | "
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.42 0.5,12,.9 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,8,.9 1,5,.42 1.5,3,.42 2,2,.42 2.5,0,.42 | "
    "0,-1,1.35 1.5,2,.42 2,5,.42 2.5,7,.42"
)

_MOTIF_HOOK_NIGHT = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.9 1,2,.42 1.5,10,.9 2.5,7,.42 | "
    "0,8,1.35 1.5,5,.42 2,3,.42 2.5,2,.42 | "
    "0,7,1.4 1.5,2,.9 2.5,-1,.42 | "
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.42 0.5,12,.9 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,8,1.35 1.5,3,.42 2,2,.42 2.5,0,.42 | "
    "0,-1,1.4 1.5,2,.9 2.5,7,.42"
)

_MOTIF_A_DAY = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.65 0.75,2,.22 1,5,.42 1.5,10,.9 2.5,8,.42 | "
    "0,7,.9 1,10,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,10,1.35 1.5,7,.42 2,5,.42 2.5,10,.42 | "
    "0,8,.42 0.5,12,.42 1,15,.9 2,14,.42 2.5,12,.42 | "
    "0,14,.9 1,12,.42 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,12,.9 1,10,.42 1.5,7,.42 2,5,.42 2.5,3,.42 | "
    "0,2,1.35 1.5,-1,.42 2,2,.42 2.5,7,.42"
)

_MOTIF_A_NIGHT = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.9 1,5,.42 1.5,10,.9 2.5,8,.42 | "
    "0,7,1.35 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,10,1.4 1.5,7,.9 2.5,10,.42 | "
    "0,8,.42 0.5,12,.42 1,15,.9 2,14,.42 2.5,12,.42 | "
    "0,14,1.35 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,12,1.35 1.5,7,.42 2,5,.42 2.5,3,.42 | "
    "0,2,1.4 1.5,-1,.9 2.5,7,.42"
)

_MOTIF_AP_DAY = (
    "0,0,.9 1,7,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,5,.42 0.5,7,.42 1,10,.9 2,7,.42 2.5,5,.42 | "
    "0,12,.65 0.75,12,.22 1,10,.42 1.5,8,.9 2.5,12,.42 | "
    "0,10,.65 0.75,8,.22 1,7,.42 1.5,5,.9 2.5,3,.42 | "
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.42 0.5,12,.9 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,8,.9 1,5,.42 1.5,3,.42 2,2,.42 2.5,0,.42 | "
    "0,-1,1.35 1.5,2,.42 2,5,.42 2.5,7,.42"
)

_MOTIF_AP_NIGHT = (
    "0,0,.9 1,7,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,5,.9 1,10,.9 2,7,.42 2.5,5,.42 | "
    "0,12,.9 1,10,.42 1.5,8,.9 2.5,12,.42 | "
    "0,10,.9 1,7,.42 1.5,5,.9 2.5,3,.42 | "
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,5,.42 0.5,12,.9 1.5,10,.42 2,8,.42 2.5,7,.42 | "
    "0,8,1.35 1.5,3,.42 2,2,.42 2.5,0,.42 | "
    "0,-1,1.4 1.5,2,.9 2.5,7,.42"
)

_MOTIF_B_DAY = (
    "0,3,.9 1,10,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,5,.9 1,10,.42 1.5,14,.42 2,10,.42 2.5,7,.42 | "
    "0,7,.9 1,8,.42 1.5,7,.42 2,3,.42 2.5,0,.42 | "
    "0,5,1.35 1.5,3,.42 2,5,.42 2.5,7,.42 | "
    "0,8,.9 1,12,.42 1.5,15,.42 2,12,.42 2.5,8,.42 | "
    "0,10,.9 1,14,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,9,.9 1,12,.42 1.5,14,.42 2,12,.42 2.5,9,.42 | "
    "0,7,1.35 1.5,11,.42 2,9,.42 2.5,7,.42"
)

_MOTIF_B_NIGHT = (
    "0,3,.9 1,10,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,5,1.35 1.5,14,.42 2,10,.42 2.5,7,.42 | "
    "0,7,1.35 1.5,8,.42 2,3,.42 2.5,0,.42 | "
    "0,5,1.4 1.5,3,.9 2.5,7,.42 | "
    "0,8,.9 1,12,.42 1.5,15,.9 2.5,8,.42 | "
    "0,10,1.35 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,9,.9 1,12,.42 1.5,14,.9 2.5,9,.42 | "
    "0,7,1.4 1.5,11,.9 2.5,7,.42"
)

_MOTIF_C1_DAY = (
    "0,5,.40 0.5,8,.40 1,10,.40 1.5,8,.40 2,7,.40 2.5,5,.40 | "
    "0,3,.40 0.5,7,.40 1,12,.40 1.5,10,.40 2,7,.40 2.5,3,.40 | "
    "0,2,.40 0.5,5,.40 1,10,.40 1.5,14,.40 2,10,.40 2.5,7,.40 | "
    "0,8,.40 0.5,7,.40 1,5,.40 1.5,3,.90 2.5,5,.40 | "
    "0,8,.40 0.5,12,.40 1,15,.40 1.5,14,.40 2,12,.40 2.5,8,.40 | "
    "0,10,.40 0.5,8,.40 1,7,.40 1.5,5,.40 2,3,.40 2.5,2,.40 | "
    "0,3,.40 0.5,5,.40 1,7,.40 1.5,8,.40 2,10,.40 2.5,12,.40 | "
    "0,11,.90 1,7,.40 1.5,11,.40 2,14,.40 2.5,12,.40"
)

_MOTIF_C1_NIGHT = (
    "0,5,.90 1,8,.42 1.5,10,.90 2.5,7,.42 | "
    "0,3,.90 1,7,.42 1.5,12,.90 2.5,7,.42 | "
    "0,2,.90 1,5,.42 1.5,10,.90 2.5,7,.42 | "
    "0,8,.42 0.5,7,.42 1,5,.42 1.5,3,1.35 | "
    "0,8,.90 1,12,.42 1.5,15,.90 2.5,12,.42 | "
    "0,10,.90 1,8,.42 1.5,7,.90 2.5,5,.42 | "
    "0,3,.90 1,7,.42 1.5,10,.90 2.5,8,.42 | "
    "0,7,1.40 1.5,11,.90 2.5,7,.42"
)

_MOTIF_C2_SOLO_DAY = (
    "0,12,.40 0.5,15,.40 1,19,.40 1.5,17,.40 2,15,.40 2.5,14,.40 | "
    "0,12,.40 0.5,10,.40 1,7,.40 1.5,10,.90 2.5,7,.40 | "
    "0,8,.40 0.5,12,.40 1,15,.40 1.5,14,.40 2,12,.40 2.5,8,.40 | "
    "0,10,.40 0.5,12,.40 1,15,.40 1.5,19,.90 2.5,15,.40 | "
    "0,5,.90 1,8,.42 1.5,10,.90 2.5,7,.42 | "
    "0,12,.90 1,10,.42 1.5,7,.90 2.5,3,.42 | "
    "0,5,.42 0.5,7,.42 1,10,.90 2,12,.42 2.5,14,.42 | "
    "0,11,.90 1,14,.42 1.5,16,.42 2,14,.42 2.5,11,.42"
)

_MOTIF_C2_NIGHT_SOLO = (
    "0,-12,.90 1,-5,.42 1.5,-4,.42 2,-5,.42 2.5,-9,.42 | "
    "0,-7,1.35 1.5,-2,.90 2.5,-5,.42 | "
    "0,8,.90 1,12,.42 1.5,15,.90 2.5,12,.42 | "
    "0,10,.90 1,15,.42 1.5,19,.90 2.5,15,.42 | "
    "0,5,.90 1,7,.42 1.5,8,.90 2.5,7,.42 | "
    "0,3,.90 1,7,.42 1.5,12,.90 2.5,7,.42 | "
    "0,5,.90 1,10,.42 1.5,12,.90 2.5,10,.42 | "
    "0,7,1.40 1.5,11,.90 2.5,7,.42"
)

_MOTIF_TURN_DAY = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,8,.9 1,12,.42 1.5,15,.9 2.5,12,.42 | "
    "0,10,.9 1,8,.42 1.5,7,.42 2,5,.42 2.5,3,.42 | "
    "0,7,1.35 1.5,2,.42 2,-1,.42 2.5,7,.42 | "
    "0,5,.9 1,10,.42 1.5,12,.42 2,10,.42 2.5,7,.42 | "
    "0,10,.9 1,7,.42 1.5,5,.42 2,3,.42 2.5,2,.42 | "
    "0,3,.9 1,5,.42 1.5,7,.42 2,8,.42 2.5,10,.42 | "
    "0,7,1.35 2.5,7,.36"
)

_MOTIF_TURN_NIGHT = (
    "0,0,.9 1,7,.42 1.5,8,.42 2,7,.42 2.5,3,.42 | "
    "0,8,1.35 1.5,15,.9 2.5,12,.42 | "
    "0,10,1.35 1.5,7,.42 2,5,.42 2.5,3,.42 | "
    "0,7,1.4 1.5,2,.9 2.5,7,.42 | "
    "0,5,.9 1,10,.42 1.5,12,.9 2.5,7,.42 | "
    "0,10,1.35 1.5,5,.42 2,3,.42 2.5,2,.42 | "
    "0,3,.9 1,7,.42 1.5,8,.9 2.5,10,.42 | "
    "0,7,1.4 2.5,7,.36"
)


def _build_chords(engine):
    return {
        "Dm": engine.make_chord(50, "min", bass_midi=38, voice_oct=4),
        "Dm/A": (45, (62, 65, 69, 74)),
        "C": engine.make_chord(48, "maj", bass_midi=36, voice_oct=4),
        "Gm7": engine.make_chord(43, "m7", bass_midi=43, voice_oct=3),
        "Em7b5": engine.make_chord(40, "m7b5", bass_midi=40, voice_oct=4),
        "A7": engine.make_chord(45, "7", bass_midi=45, voice_oct=3),
        "Asus4": engine.make_chord(45, "sus4", bass_midi=45, voice_oct=3),
        "F": engine.make_chord(41, "maj", bass_midi=41, voice_oct=4),
        "Fmaj7": engine.make_chord(41, "maj7", bass_midi=41, voice_oct=4),
        "Bb": engine.make_chord(46, "maj", bass_midi=46, voice_oct=3),
        "Bbmaj7": engine.make_chord(46, "maj7", bass_midi=46, voice_oct=3),
        "G": engine.make_chord(43, "maj", bass_midi=43, voice_oct=3),
    }


def _voice_lead_triad(prev_voicing, raw_voicing):
    """Voice-lead raw_voicing near prev_voicing while preserving distinct MIDI pitches & triad PCs."""
    center = sum(prev_voicing) / len(prev_voicing) if prev_voicing else 65.0
    unique_pcs = list(dict.fromkeys(p % 12 for p in raw_voicing))
    led = []
    for pc in unique_pcs:
        candidates = [pc + 12 * oct_n for oct_n in range(3, 8)]
        best = min(candidates, key=lambda c: (abs(c - center), c < 55, c > 76))
        led.append(best)
    led.sort()
    if len(led) == 3:
        led.append(led[0] + 12)
    return tuple(led)


def _safe_dur(bar, n_bars, start_beat, desired_dur):
    if bar == n_bars - 1:
        max_end = n_bars * 3.0 - 0.14
        return max(0.08, min(desired_dur, max_end - start_beat))
    return max(0.08, desired_dur)


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Captain's Deck track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    tonic = 62  # D4 — idiomatic French Horn register

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 37,
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        s.set_channel(0, 60, "French Horns Lead", bank=0, pan=58, vol=84, rev=54, cho=16)
        s.set_channel(1, 45, "Pizzicato Gallop Attack", bank=0, pan=36, vol=68, rev=48, cho=18)
        s.set_channel(2, 48, "Strings Fast Spiccato Body", bank=0, pan=42, vol=56, rev=56, cho=22)
        s.set_channel(3, 33, "Fingered Bass", bank=0, pan=64, vol=78, rev=24, cho=6)
        s.set_channel(4, 21, "Italian Accordion", bank=8, pan=82, vol=76, rev=54, cho=20)
        s.set_channel(5, 61, "Brass Section", bank=0, pan=86, vol=62, rev=58, cho=20)
        s.set_channel(6, 47, "Timpani", bank=0, pan=32, vol=64, rev=68, cho=18)
        s.set_channel(7, 40, "Violin Fiddle", bank=0, pan=96, vol=66, rev=58, cho=22)
        s.set_channel(9, 48, "Orchestra Kit", bank=128, pan=64, vol=58, rev=30, cho=8)
    else:
        s.set_channel(0, 60, "Solo French Horn", bank=0, pan=58, vol=74, rev=62, cho=16)
        s.set_channel(1, 24, "Nylon Guitar Arpeggio", bank=0, pan=34, vol=58, rev=54, cho=18)
        s.set_channel(2, 46, "Harp Starlight", bank=0, pan=94, vol=56, rev=66, cho=22)
        s.set_channel(3, 42, "Cello Watch", bank=0, pan=52, vol=68, rev=48, cho=14)
        s.set_channel(4, 21, "Warm Accordion", bank=0, pan=78, vol=56, rev=58, cho=16)
        s.set_channel(5, 49, "Slow Strings", bank=0, pan=86, vol=48, rev=70, cho=26)
        s.set_channel(6, 47, "Distant Timpani", bank=0, pan=32, vol=38, rev=74, cho=20)
        s.set_channel(7, 73, "Night Flute", bank=0, pan=96, vol=52, rev=62, cho=20)
        s.set_channel(9, 40, "Brush Watch Percussion", bank=128, pan=64, vol=38, rev=36, cho=8)

    chords = _build_chords(engine)
    harmony = [sym for sec in _HARMONIES for sym in sec.split()]
    n_bars = len(harmony)

    hook_m = engine.ph(_MOTIF_HOOK_NIGHT if night else _MOTIF_HOOK_DAY)
    a_m = engine.ph(_MOTIF_A_NIGHT if night else _MOTIF_A_DAY)
    ap_m = engine.ph(_MOTIF_AP_NIGHT if night else _MOTIF_AP_DAY)
    b_m = engine.ph(_MOTIF_B_NIGHT if night else _MOTIF_B_DAY)
    c1_m = engine.ph(_MOTIF_C1_NIGHT if night else _MOTIF_C1_DAY)
    c2_m = engine.ph(_MOTIF_C2_NIGHT_SOLO if night else _MOTIF_C2_SOLO_DAY)
    turn_m = engine.ph(_MOTIF_TURN_NIGHT if night else _MOTIF_TURN_DAY)

    prev_voicing = chords["Dm"][1]
    d_dorian_scale = [engine.scale_pitch(62, "dorian", deg) for deg in range(12)]

    for bar, sym in enumerate(harmony):
        sec, pos = divmod(bar, 8)
        t = s.bar_beat(bar)
        root, raw_voicing = chords[sym]
        voicing = _voice_lead_triad(prev_voicing, raw_voicing)
        prev_voicing = voicing
        next_root = chords[harmony[(bar + 1) % n_bars]][0]
        fifth = root + 7

        expr = 88 + int(22 * math.sin((pos + 0.5) / 8.0 * math.pi))
        s.cc(0, 11, expr, t)
        s.cc(4, 11, expr, t)
        s.cc(7, 11, expr, t)

        base_vel = engine.phrase_vel(52 if night else 64, pos)
        if sec == 6:
            base_vel *= 1.12 if not night else 1.08
        elif sec == 7 and pos >= 4:
            base_vel *= 0.94

        # ------------------------------------------------------------------
        # 1. Lead & Solo Handoffs across 8-section 64-bar narrative
        # ------------------------------------------------------------------
        if sec == 0:
            lead_events = hook_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night)

        elif sec == 1:
            lead_events = a_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night)
            if not night and pos in (1, 3, 5, 7):
                s.note(7, engine.chord_pitch(tonic + 12, voicing, root, True), t + 1.5, 0.42, base_vel * 0.68)
                s.note(7, engine.chord_pitch(tonic + 15, voicing, root, True), t + 2.0, 0.42, base_vel * 0.72)
                s.note(7, engine.chord_pitch(tonic + 14, voicing, root, True), t + 2.5, 0.42, base_vel * 0.76)
            elif night:
                if pos in (1, 3, 5, 7):
                    s.note(2, voicing[2] + 12, t + 1.5, 0.75, 44)
                    s.note(2, voicing[3] + 12, t + 2.5, 0.55, 40)
                if pos >= 4:
                    for p in voicing[:3]:
                        s.note(4, p, t, 2.75, 36)

        elif sec == 2:
            lead_events = ap_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night)
                if not night and pos >= 4 and (at == 0 or dur >= 0.75):
                    s.note(7, pitch + 12, t + at, d_cl, base_vel * 0.66)
            if not night:
                for p in voicing[:3]:
                    s.note(4, p, t + 0.5, 0.35, 46)
                    s.note(4, p, t + 2.0, 0.35, 48)
                if pos in (0, 2, 4, 6):
                    s.note(5, voicing[0], t, 1.35, 50)
                    s.note(5, voicing[2], t, 1.35, 48)
                elif pos in (3, 7):
                    s.note(5, voicing[1], t + 1.5, 0.42, 56)
                    s.note(5, voicing[2], t + 2.0, 0.42, 60)
                    s.note(5, voicing[3], t + 2.5, 0.42, 64)
            else:
                if pos in (1, 3, 5, 7):
                    s.note(7, engine.chord_pitch(tonic + 14, voicing, root, True), t + 1.5, 0.85, 42)
                    s.note(7, engine.chord_pitch(tonic + 12, voicing, root, True), t + 2.5, 0.55, 38)
                if pos == 7:
                    s.gliss(2, d_dorian_scale[2:9], t + 1.0, step=0.14, dur=0.9, vel=38, vel_step=2, pan_start=82, pan_end=104)

        elif sec == 3:
            lead_events = b_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night)
                if night and pos >= 2 and (at == 0 or dur >= 0.75):
                    s.note(7, pitch + 12, t + at, max(0.75, d_cl), base_vel * 0.68)
            if not night:
                s.note(5, voicing[0], t, 2.75, 46 + pos * 2)
                s.note(5, voicing[2], t, 2.75, 44 + pos * 2)
                if pos in (0, 2, 4, 6):
                    s.drum(81, t + 0.0, 48)
                if pos in (6, 7):
                    s.drum(81, t + 1.5, 56)

        elif sec == 4:
            # Section C1: Accordion Solo Handoff
            acc_events = c1_m[pos]
            for at, step, dur in acc_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(4, pitch, t + at, d_cl, base_vel * (0.94 if night else 1.04))
            if not night:
                if pos in (0, 4):
                    s.note(0, root + 24, t, 1.35, 52)
            else:
                if pos == 4:
                    s.note(0, tonic + 8, t, 1.35, 44)
                    s.note(0, tonic + 7, t + 1.5, 1.25, 40)
                elif pos == 7:
                    s.note(0, tonic + 7, t, 1.35, 42)
                    s.note(0, tonic + 2, t + 1.5, 1.25, 38)

        elif sec == 5:
            # Section C2: Day Violin Fiddle / Night Cello-Harp Solo + Build
            solo_events = c2_m[pos]
            if not night:
                if pos < 4:
                    if pos in (0, 1):
                        for at, step, dur in solo_events:
                            s.note(7, tonic + int(step), t + at, s.clamp_dur(at, dur), base_vel * 1.04, vib=True)
                    else:
                        for at, step, dur in solo_events:
                            s.note(4, tonic + int(step), t + at, s.clamp_dur(at, dur), base_vel * 1.0)
                else:
                    for at, step, dur in solo_events:
                        pitch = tonic + int(step)
                        d_cl = s.clamp_dur(at, dur)
                        s.note(0, pitch, t + at, d_cl, base_vel * (1.0 + 0.04 * (pos - 4)), vib=True)
                        s.note(7, pitch + 12, t + at, d_cl, base_vel * 0.64)
                    s.note(5, voicing[0], t, 2.7, 50 + (pos - 4) * 5)
                    s.note(5, voicing[2], t, 2.7, 48 + (pos - 4) * 5)
            else:
                if pos in (0, 1):
                    for at, step, dur in solo_events:
                        t_ce = t + at - 0.12 if (bar > 0 or at > 0) else t + at
                        s.note(3, tonic + int(step), t_ce, s.clamp_dur(at, dur), base_vel * 0.96)
                    s.note(7, tonic + 12, t + 1.5, 0.9, 38)
                elif pos in (2, 3):
                    for at, step, dur in solo_events:
                        s.note(2, tonic + int(step), t + at, s.clamp_dur(at, dur), base_vel * 0.92)
                    s.note(7, tonic + 15, t + 1.5, 0.9, 40)
                else:
                    for at, step, dur in solo_events:
                        s.note(0, tonic + int(step), t + at, s.clamp_dur(at, dur), base_vel * 0.90)

        elif sec == 6:
            # Section A'': Grand Climax
            lead_events = a_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night)
                if not night:
                    s.note(7, pitch + 12, t + at, d_cl, base_vel * 0.72)
                    if at == 0 or dur >= 0.75:
                        harm_p = engine.chord_pitch(pitch - 5, voicing, root, True)
                        s.note(5, harm_p, t + at, d_cl, base_vel * 0.68)
                else:
                    if at == 0 or dur >= 0.75:
                        t_ce = t + at - 0.12 if (bar > 0 or at > 0) else t + at
                        s.note(3, pitch - 12, t_ce, d_cl, base_vel * 0.78)
            if not night:
                for p in voicing[:3]:
                    s.note(4, p, t + 0.5, 0.36, 52)
                    s.note(4, p, t + 2.0, 0.36, 54)
            else:
                for p in voicing[:3]:
                    s.note(4, p, t, 2.75, 42)
                if pos % 2 == 1:
                    s.gliss(2, [p + 12 for p in voicing], t + 0.5, step=0.22, dur=1.1, vel=42, vel_step=2)

        else:
            # Section 7: Turnaround & Seamless Loop Reset (bars 56-63)
            lead_events = turn_m[pos]
            for at, step, dur in lead_events:
                pitch = tonic + int(step)
                d_cl = _safe_dur(bar, n_bars, t + at, s.clamp_dur(at, dur))
                s.note(0, pitch, t + at, d_cl, base_vel, vib=not night and bar < 63)
                if not night and pos < 4 and (at == 0 or dur >= 0.75):
                    s.note(7, pitch + 12, t + at, d_cl, base_vel * 0.66)
            if not night and pos in (4, 5):
                s.note(5, voicing[0], t, 2.6, 46)
                s.note(5, voicing[2], t, 2.6, 44)
            elif not night and pos == 7:
                # Resonant final A7 chord sustain for clean 4s tail-fold loop wrap
                for p in voicing[:3]:
                    s.note(4, p, t + 0.0, 2.75, 44)
            elif night and pos == 7:
                s.note(4, voicing[1], t + 0.0, 2.75, 34)
                s.note(4, voicing[2], t + 0.0, 2.75, 34)

        # ------------------------------------------------------------------
        # 2. Rhythm Engine: Galloping Strings / Guitar & Harp Starlight
        # ------------------------------------------------------------------
        if not night:
            if sec == 4 and pos < 6:
                # Tight pizzicato off-beat groove behind Accordion solo
                for at, v_p in ((0.0, 56), (0.5, 42), (1.5, 52), (2.0, 42)):
                    for p in voicing[:3]:
                        s.note(1, p, t + at, 0.24, v_p)
            elif bar == n_bars - 1:
                # Bar 63 turnaround: resonant gallop fading into loop pickup
                for idx, at in enumerate((0.0, 0.5, 1.0, 1.5)):
                    v_sp = 60 if idx in (0, 3) else 44
                    for p in voicing[:3]:
                        s.note(1, p, t + at, 0.28, v_sp)
                        t_bow = t + at - 0.10
                        s.note(2, p, t_bow, _safe_dur(bar, n_bars, t_bow, 0.42), v_sp * 0.84)
                for p in voicing[:3]:
                    t_bow = t + 2.0 - 0.10
                    s.note(2, p, t_bow, _safe_dur(bar, n_bars, t_bow, 0.90), 42)
            else:
                # Driving 6/8 spiccato-feel strings: 0:45 Pizz attack + 0:48 Strings Fast body (-0.10b bow comp)
                for idx, at in enumerate((0.0, 0.5, 1.0, 1.5, 2.0, 2.5)):
                    v_sp = 64 if idx in (0, 3) else 44
                    body_dur = 0.34 if (at == 2.5 or (bar == 0 and at == 0.0)) else 0.42
                    for p in voicing[:3]:
                        s.note(1, p, t + at, 0.24, v_sp)
                        t_bow = t + at - 0.10 if (bar > 0 or at > 0.0) else t + at
                        s.note(2, p, t_bow, body_dur, v_sp * 0.82)
        else:
            # Night Nylon Guitar 6/8 fingerpicked arpeggio
            arp_order = (0, 1, 2, 3, 2, 1)
            for idx, at in enumerate((0.0, 0.5, 1.0, 1.5, 2.0, 2.5)):
                p_arp = voicing[arp_order[idx] % len(voicing)]
                v_arp = 40 if idx in (0, 3) else 32
                d_arp = _safe_dur(bar, n_bars, t + at, 0.48)
                s.note(1, p_arp, t + at, d_arp, v_arp)
            # Harp starlight: active in Bar 0 (for 2s texture), Section B, C2, A'', Turnaround
            if sec in (0, 3, 6, 7) and not (sec == 5 and pos in (2, 3)):
                if pos % 2 == 0 or bar == 0:
                    s.note(2, voicing[2] + 12, t + 0.5, _safe_dur(bar, n_bars, t + 0.5, 0.85), 36)
                    s.note(2, voicing[3] + 12, t + 1.5, _safe_dur(bar, n_bars, t + 1.5, 0.85), 40)
                    s.note(2, voicing[1] + 12, t + 2.5, _safe_dur(bar, n_bars, t + 2.5, 0.45), 34)
            # Night Slow Strings (0:49) with 180ms attack pre-roll (-0.26b for bar > 0) & swell()
            t_pad = t - 0.26 if bar > 0 else t
            pad_dur = 2.70 if bar == 0 else (3.04 if bar == n_bars - 1 else 2.94)
            pad_vel = 38 if sec in (1, 3, 6) else 30
            s.note(5, voicing[0], t_pad, pad_dur, pad_vel)
            s.note(5, voicing[2], t_pad, pad_dur, pad_vel * 0.90)
            s.swell(5, max(0.0, t_pad), min(n_bars * 3.0 - 0.12, t_pad + pad_dur), low=68, high=108, steps=8)

        # ------------------------------------------------------------------
        # 3. Bass, Cello Watch, and Timpani
        # ------------------------------------------------------------------
        if not night:
            bass_hits = [
                (0.0, root, 0.85, 70),
                (1.0, root, 0.40, 54),
                (1.5, fifth, 0.85, 62),
                (2.5, next_root - 1 if pos in (3, 7) else root + 12, 0.36, 56),
            ]
            for at, p, dur, vel in bass_hits:
                s.note(3, p, t + at, _safe_dur(bar, n_bars, t + at, dur), vel)

            if sec == 5 and pos in (6, 7):
                # Rising timpani & snare build into A'' Grand Climax
                for k in range(6):
                    v_roll = 42 + (pos - 6) * 14 + k * 6
                    s.drum(38, t + k * 0.5, v_roll, dur=0.10)
                    s.note(6, root + 12, t + k * 0.5, 0.32, v_roll * 0.88)
            elif bar == n_bars - 1:
                s.note(6, root + 12, t + 0.0, 1.2, 68)
                s.note(6, root + 12, t + 1.5, 1.2, 58)
            else:
                s.note(6, root + 12, t + 0.0, 0.72, 74 if pos % 2 == 0 else 58)
                s.note(6, fifth, t + 1.5, 0.72, 64)
        else:
            if not (sec == 5 and pos in (0, 1)):
                cello_hits = [
                    (0.0, root, 1.35, 52),
                    (1.5, fifth, 1.15 if bar < n_bars - 1 else 1.10, 44),
                ]
                for at, p, dur, vel in cello_hits:
                    t_ce = t + at - 0.12 if (bar > 0 or at > 0.0) else t + at
                    s.note(3, p, t_ce, _safe_dur(bar, n_bars, t_ce, dur), vel)
            if pos in (0, 2, 4, 6) or bar == n_bars - 1:
                s.note(6, root + 12, t + 0.0, 1.10, 36 if sec in (3, 6) else 28)
                if bar == n_bars - 1:
                    s.note(6, root + 12, t + 1.5, 1.10, 30)

        # ------------------------------------------------------------------
        # 4. Percussion: Day Orchestra Kit (128:48) / Night Brush Watch (128:40)
        # ------------------------------------------------------------------
        if not night:
            if sec == 5 and pos in (6, 7):
                if pos == 7:
                    s.drum(49, t + 2.5, 68, dur=0.25)
            elif sec == 4 and pos < 6:
                # Jaunty deck-dance groove: rimshot, tambourine, triangle
                for at, note_p, v in (
                    (0.0, 36, 56), (0.5, 54, 34), (1.0, 37, 46),
                    (1.5, 36, 50), (2.0, 54, 36), (2.5, 37, 48),
                ):
                    s.drum(note_p, t + at, v)
                if pos in (1, 3, 5):
                    s.drum(81, t + 1.5, 44)
            else:
                snare_p = 40 if sec == 6 else 38
                for at, note_p, v in (
                    (0.0, 36, 66), (0.5, 51, 30), (1.0, snare_p, 48),
                    (1.5, 36, 58), (2.0, 51, 32), (2.5, snare_p, 52),
                ):
                    if bar == n_bars - 1 and at >= 2.0:
                        continue
                    s.drum(note_p, t + at, v)
                if sec == 6 and pos in (0, 4):
                    s.drum(49, t + 0.0, 68, dur=0.35)
                elif pos == 7 and sec < 7:
                    s.drum(49, t + 0.0, 58, dur=0.35)
                    s.drum(45, t + 2.0, 54, dur=0.15)
                    s.drum(47, t + 2.5, 60, dur=0.15)
                elif bar == n_bars - 1:
                    s.drum(81, t + 0.0, 50, dur=0.30)
                    s.drum(38, t + 2.5, 46, dur=0.12)
        else:
            # Noble quiet watch pulse
            s.drum(36, t + 0.0, 32)
            if sec not in (4, 5):
                s.drum(51, t + 1.5, 18)
                s.drum(38, t + 2.5, 18)
            else:
                s.drum(42, t + 1.5, 16)

    return s
