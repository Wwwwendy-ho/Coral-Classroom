"""Pattern Reef regional soundtrack builder (region-patterns-song, region-patterns-night-song).

Pattern-first 48-bar geometric puzzle-reef compositions in F Major (4/4):
- Macro form: Intro [Cumulative Pattern Stacking] (4) -> A [3+3+2 & 3-against-4 Hook] (8)
  -> A' [2-Beat Canon + 5-Note Rotating Ostinato] (8) -> B [Theme B Lyrical Spiral + Hemiola] (8)
  -> C [Pattern Lab: 5+5+6 Mirror Call-and-Response + 7-Eighth-Note Phasing] (8)
  -> A+B [Grand Double Counterpoint: Theme A + Theme B Combined] (8)
  -> Turnaround [Symmetric De-Stacking Loop] (4).
- Day (120 BPM, 96.0s): Marimba lead, Xylophone stereo hocket/canon, Clarinet Theme B & responses,
  Flute cellular ostinato, Pizzicato polymetric pluck, Acoustic bass patterns, Glockenspiel cycle
  chimes, pitched Stereo Woodblock matrix, Strings pad, and pattern-driven Puzzle Kit.
- Night (90 BPM, 128.0s): Kalimba lead, Soft Marimba kotekan hocket, Concert Harp rotating cells,
  Vibraphone Theme B & counterpoint, Celesta canon, Music Box L/R polyrhythmic droplets,
  Fretless bass patterns, Slow Strings swells, and whisper Brush Tick patterns.
"""

import math

TRACKS = [
    {
        "name": "region-patterns-song",
        "region": "patterns",
        "mode": "day",
        "title": "Pattern Reef (Day)",
        "key": "F Major",
        "key_midi": "F",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 120,
        "swing": 0.0,
        "description": (
            "Polyrhythmic marimba, xylophone canon, clarinet & flute counterpoint, "
            "pizzicato 3-against-4/5-note ostinatos, glockenspiel & stereo woodblock patterns."
        ),
    },
    {
        "name": "region-patterns-night-song",
        "region": "patterns",
        "mode": "night",
        "title": "Pattern Reef (Night)",
        "key": "F Major",
        "key_midi": "F",
        "meter": (4, 4),
        "beats_per_bar": 4.0,
        "bars": 48,
        "bpm": 90,
        "swing": 0.0,
        "description": (
            "Cozy interlocking kalimba, harp rotating cells, soft marimba kotekan, "
            "vibraphone & celesta canon, music box polyrhythms, fretless bass & brush tick."
        ),
    },
]

# 48-bar macro architecture:
# Intro (4) -> A (8) -> A' (8) -> B (8) -> C Pattern Lab (8) -> A+B Synthesis (8) -> Turnaround (4)
_SECTIONS = (
    ("intro", "Iadd9 iii IVadd9 V9"),
    ("A", "Iadd9 V/vi vi7 IVmaj7 ii7 I6 IVadd9 V7"),
    ("Ap", "Iadd9 iii vi7 V/ii ii9 V9 Imaj6 V7"),
    ("B", "IVmaj7 V iii vi7 ii7 II Vsus4 V7"),
    ("C", "vi7 IVadd9 I6 iii ii7 bVII Vsus4 V7"),
    ("AB", "Iadd9 iii vi7 IVmaj7 ii7 V/ii IVadd9 V7"),
    ("turn", "Iadd9 vi7 ii7 V7"),
)

# Clean open F-Major chord table: (bass_root, bass_anchor_5th, open_4note_voicing)
# Eliminates adjacent minor-2nd clusters (e.g. A4/Bb4 in Bbmaj7, Eb4/D5 rubs, I6 E3 clash)
_F_CHORDS = {
    "Iadd9":  (41, 48, (65, 67, 69, 72)),  # Fadd9:  F2/C3, F4 G4 A4 C5
    "Imaj6":  (41, 48, (65, 69, 72, 74)),  # F6:     F2/C3, F4 A4 C5 D5
    "I6":     (45, 48, (65, 69, 72, 77)),  # F/A:    A2/C3, F4 A4 C5 F5 (C3 anchor, zero E3 clash!)
    "iii":    (45, 52, (64, 67, 69, 72)),  # Am7:    A2/E3, E4 G4 A4 C5
    "V/vi":   (45, 52, (61, 64, 67, 69)),  # A7:     A2/E3, C#4 E4 G4 A4
    "vi7":    (50, 45, (62, 65, 69, 72)),  # Dm7:    D3/A2, D4 F4 A4 C5
    "IVmaj7": (46, 53, (58, 62, 65, 69)),  # Bbmaj7: Bb2/F3, Bb3 D4 F4 A4 (open, zero A/Bb cluster!)
    "IVadd9": (46, 53, (62, 65, 67, 70)),  # Bbadd9: Bb2/F3, D4 F4 G4 Bb4
    "ii7":    (43, 50, (62, 65, 67, 70)),  # Gm7:    G2/D3, D4 F4 G4 Bb4
    "ii9":    (43, 50, (58, 62, 65, 67)),  # Gm7/9:  G2/D3, Bb3 D4 F4 G4 (warm & clash-free!)
    "V/ii":   (50, 45, (62, 66, 69, 72)),  # D7:     D3/A2, D4 F#4 A4 C5
    "II":     (43, 50, (62, 65, 67, 71)),  # G7:     G2/D3, D4 F4 G4 B4
    "V":      (48, 43, (64, 67, 72, 76)),  # C:      C3/G2, E4 G4 C5 E5
    "Vsus4":  (48, 43, (65, 67, 72, 77)),  # Csus4:  C3/G2, F4 G4 C5 F5
    "V7":     (48, 43, (64, 67, 70, 72)),  # C7:     C3/G2, E4 G4 Bb4 C5
    "V9":     (48, 43, (64, 67, 70, 74)),  # C9:     C3/G2, E4 G4 Bb4 D5
    "bVII":   (51, 46, (63, 65, 67, 70)),  # Ebadd9: Eb3/Bb2, Eb4 F4 G4 Bb4 (warm common-tone F4!)
}

# Signature Pattern Reef motifs (semitones relative to F tonic; 0=F, 2=G, 4=A, 5=Bb, 7=C, 9=D, 11=E, 12=F')
# Alternating 2-bar hyper-pattern: [3+3+2 geometric cell] -> [3-against-4 dotted-eighth polymetric cell]
_MOTIF_INTRO_DAY = (
    "0,7,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,4,.36 2.5,7,.36 3.0,2,.42 | "
    "0,4,.42 0.75,7,.38 1.5,11,.42 2.25,9,.38 3.0,7,.48 | "
    "0,5,.36 0.5,9,.36 1.0,12,.36 1.5,14,.36 2.0,12,.36 2.5,9,.36 3.0,7,.42 | "
    "0,2,.42 0.75,5,.38 1.5,7,.38 2.25,2,.38 3.0,7,.48"
)

_MOTIF_INTRO_NIGHT = (
    "0,7,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,4,.56 2.5,7,.52 3.0,2,.68 | "
    "0,4,.62 0.75,7,.56 1.5,11,.62 2.25,9,.56 3.0,7,.72 | "
    "0,5,.52 0.5,9,.52 1.0,12,.52 1.5,14,.56 2.0,12,.52 2.5,9,.52 3.0,7,.68 | "
    "0,2,.62 0.75,5,.56 1.5,7,.56 2.25,2,.56 3.0,7,.72"
)

_MOTIF_A_DAY = (
    "0,7,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,4,.36 2.5,7,.36 3.0,2,.42 | "
    "0,4,.42 0.75,8,.38 1.5,11,.42 2.25,14,.38 3.0,11,.48 | "
    "0,9,.36 0.5,12,.36 1.0,14,.36 1.5,12,.36 2.0,9,.36 2.5,7,.36 3.0,4,.42 | "
    "0,5,.42 0.75,9,.38 1.5,12,.42 2.25,9,.38 3.0,7,.48 | "
    "0,2,.36 0.5,5,.36 1.0,9,.36 1.5,7,.36 2.0,5,.36 2.5,2,.36 3.0,5,.42 | "
    "0,7,.42 0.75,4,.38 1.5,0,.42 2.25,4,.38 3.0,7,.48 | "
    "0,5,.36 0.5,9,.36 1.0,12,.36 1.5,14,.36 2.0,12,.36 2.5,9,.36 3.0,7,.42 | "
    "0,7,.42 0.75,5,.38 1.5,11,.38 2.25,2,.38 3.0,7,.48"
)

# Night A shares the exact cellular DNA with graceful kalimba breathing on cadence tails
_MOTIF_A_NIGHT = (
    "0,7,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,4,.56 2.5,7,.52 3.0,2,.68 | "
    "0,4,.62 0.75,8,.56 1.5,11,.62 2.25,14,.56 3.0,11,.72 | "
    "0,9,.52 0.5,12,.52 1.0,14,.52 1.5,12,.56 2.0,9,.56 2.5,7,.52 3.0,4,.68 | "
    "0,5,.62 0.75,9,.56 1.5,12,.68 2.5,9,.62 3.25,7,.60 | "
    "0,2,.52 0.5,5,.52 1.0,9,.52 1.5,7,.56 2.0,5,.56 2.5,2,.52 3.0,5,.68 | "
    "0,7,.62 0.75,4,.56 1.5,0,.68 2.5,4,.62 3.25,7,.60 | "
    "0,5,.52 0.5,9,.52 1.0,12,.52 1.5,14,.56 2.0,12,.56 2.5,9,.52 3.0,7,.68 | "
    "0,7,.62 0.75,5,.56 1.5,11,.62 2.25,2,.56 3.0,7,.72"
)

_MOTIF_AP_DAY = (
    "0,7,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,4,.36 2.5,7,.36 3.0,2,.42 | "
    "0,4,.42 0.75,7,.38 1.5,11,.42 2.25,9,.38 3.0,7,.48 | "
    "0,9,.36 0.5,12,.36 1.0,14,.36 1.5,12,.36 2.0,9,.36 2.5,7,.36 3.0,4,.42 | "
    "0,9,.42 0.75,13,.38 1.5,16,.42 2.25,19,.38 3.0,16,.48 | "
    "0,14,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,5,.36 2.5,2,.36 3.0,5,.42 | "
    "0,2,.42 0.75,5,.38 1.5,9,.42 2.25,7,.38 3.0,5,.48 | "
    "0,4,.36 0.5,7,.36 1.0,12,.36 1.5,9,.36 2.0,7,.36 2.5,4,.36 3.0,0,.42 | "
    "0,2,.42 0.75,5,.38 1.5,7,.42 2.25,11,.38 3.0,7,.48"
)

_MOTIF_AP_NIGHT = (
    "0,7,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,4,.56 2.5,7,.52 3.0,2,.68 | "
    "0,4,.62 0.75,7,.56 1.5,11,.62 2.25,9,.56 3.0,7,.72 | "
    "0,9,.52 0.5,12,.52 1.0,14,.52 1.5,12,.56 2.0,9,.56 2.5,7,.52 3.0,4,.68 | "
    "0,9,.62 0.75,13,.56 1.5,16,.62 2.25,19,.56 3.0,16,.72 | "
    "0,14,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,5,.56 2.5,2,.52 3.0,5,.68 | "
    "0,2,.62 0.75,5,.56 1.5,9,.62 2.25,7,.56 3.0,5,.72 | "
    "0,4,.52 0.5,7,.52 1.0,12,.52 1.5,9,.56 2.0,7,.56 2.5,4,.52 3.0,0,.68 | "
    "0,2,.62 0.75,5,.56 1.5,7,.62 2.25,11,.56 3.0,7,.72"
)

# Theme B: Soaring lyrical spiral contrasting Theme A's snappy cellular geometry
_MOTIF_B = (
    "0,16,.75 1.0,14,.42 1.5,12,.75 2.5,9,.55 3.25,12,.50 | "
    "0,11,.75 1.0,14,.55 1.75,16,.58 2.5,14,.55 3.25,11,.50 | "
    "0,14,.75 1.0,16,.42 1.5,11,.75 2.5,7,.55 3.25,11,.50 | "
    "0,9,.75 1.0,12,.55 1.75,14,.58 2.5,12,.55 3.25,9,.50 | "
    "0,5,.58 0.75,9,.55 1.5,12,.75 2.5,14,.55 3.25,12,.50 | "
    "0,14,.75 1.0,12,.42 1.5,9,.75 2.5,6,.55 3.25,9,.50 | "
    "0,12,.90 1.25,14,.55 2.0,12,.55 2.75,7,.80 | "
    "0,11,.55 0.75,14,.55 1.5,11,.55 2.25,7,.55 3.0,11,.65"
)

# Section C Pattern Lab:
# Bars 0-3: 5+5+6 sixteenth-note calls (answered in melodic mirror inversion by counter voices on beats 2.0..3.75)
# Bars 4-6: Continuous 7-eighth-note (3.5-beat) phasing cellular wave shifting across 4/4 barlines!
# Bar 7: Dominant fanfare + 2-beat stereo hocket cascade launching into A+B
_MOTIF_C = (
    "0,9,.36 0.5,12,.22 0.75,16,.36 1.25,14,.22 1.5,12,.40 | "
    "0,5,.36 0.5,9,.22 0.75,12,.36 1.25,14,.22 1.5,12,.40 | "
    "0,7,.36 0.5,12,.22 0.75,16,.36 1.25,14,.22 1.5,12,.40 | "
    "0,11,.36 0.5,14,.22 0.75,16,.36 1.25,14,.22 1.5,11,.40 | "
    "0,2,.38 0.5,5,.36 1.0,9,.36 1.5,12,.40 2.0,9,.36 2.5,7,.36 3.0,5,.36 3.5,2,.38 | "
    "0,5,.36 0.5,10,.36 1.0,14,.40 1.5,12,.36 2.0,10,.36 2.5,5,.36 3.0,2,.38 3.5,7,.36 | "
    "0,12,.36 0.5,14,.40 1.0,12,.36 1.5,7,.36 2.0,2,.36 2.5,7,.38 3.0,12,.38 3.5,14,.38 | "
    "0,7,.42 0.5,5,.38 1.0,11,.38 1.5,2,.42"
)

# Melodic mirror-inversion answers for C bars 0-3 (same 5-note rhythm, inverted contour!)
_MIRROR_C_ANSWERS = (
    "2.0,16,.36 2.5,12,.22 2.75,9,.36 3.25,7,.22 3.5,12,.40 | "
    "2.0,14,.36 2.5,12,.22 2.75,9,.36 3.25,7,.22 3.5,9,.40 | "
    "2.0,16,.36 2.5,12,.22 2.75,7,.36 3.25,9,.22 3.5,12,.40 | "
    "2.0,11,.36 2.5,7,.22 2.75,4,.36 3.25,7,.22 3.5,11,.40"
)

# Section A+B Lead (Theme A on Ch 0, paired simultaneously with Theme B Counter-Melody below!)
_MOTIF_AB_LEAD_DAY = (
    "0,7,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,4,.36 2.5,7,.36 3.0,2,.42 | "
    "0,4,.42 0.75,7,.38 1.5,11,.42 2.25,9,.38 3.0,7,.48 | "
    "0,9,.36 0.5,12,.36 1.0,14,.36 1.5,12,.36 2.0,9,.36 2.5,7,.36 3.0,4,.42 | "
    "0,5,.42 0.75,9,.38 1.5,12,.42 2.25,9,.38 3.0,7,.48 | "
    "0,2,.36 0.5,5,.36 1.0,9,.36 1.5,7,.36 2.0,5,.36 2.5,2,.36 3.0,5,.42 | "
    "0,9,.42 0.75,13,.38 1.5,16,.42 2.25,19,.38 3.0,16,.48 | "
    "0,5,.36 0.5,9,.36 1.0,12,.36 1.5,14,.36 2.0,12,.36 2.5,9,.36 3.0,7,.42 | "
    "0,7,.42 0.75,5,.38 1.5,11,.38 2.25,2,.38 3.0,7,.48"
)

_MOTIF_AB_LEAD_NIGHT = (
    "0,7,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,4,.56 2.5,7,.52 3.0,2,.68 | "
    "0,4,.62 0.75,7,.56 1.5,11,.62 2.25,9,.56 3.0,7,.72 | "
    "0,9,.52 0.5,12,.52 1.0,14,.52 1.5,12,.56 2.0,9,.56 2.5,7,.52 3.0,4,.68 | "
    "0,5,.62 0.75,9,.56 1.5,12,.68 2.5,9,.62 3.25,7,.60 | "
    "0,2,.52 0.5,5,.52 1.0,9,.52 1.5,7,.56 2.0,5,.56 2.5,2,.52 3.0,5,.68 | "
    "0,9,.62 0.75,13,.56 1.5,16,.62 2.25,19,.56 3.0,16,.72 | "
    "0,5,.52 0.5,9,.52 1.0,12,.52 1.5,14,.56 2.0,12,.56 2.5,9,.52 3.0,7,.68 | "
    "0,7,.62 0.75,5,.56 1.5,11,.62 2.25,2,.56 3.0,7,.72"
)

# Theme B adapted into consonant double counterpoint against Theme A in A+B!
_MOTIF_AB_COUNTER_B = (
    "0,4,.85 1.0,2,.45 1.5,0,.85 2.5,4,.65 3.25,7,.60 | "
    "0,11,.85 1.0,14,.60 1.75,16,.65 2.5,14,.60 3.25,11,.60 | "
    "0,16,.85 1.0,14,.45 1.5,12,.85 2.5,9,.65 3.25,12,.60 | "
    "0,9,.85 1.0,12,.60 1.75,16,.65 2.5,12,.60 3.25,9,.60 | "
    "0,5,.65 0.75,9,.60 1.5,12,.85 2.5,14,.60 3.25,12,.60 | "
    "0,4,.85 1.0,7,.60 1.75,13,.65 2.5,9,.60 3.25,4,.60 | "
    "0,12,.95 1.25,14,.60 2.0,12,.60 2.75,9,.85 | "
    "0,11,.60 0.75,14,.60 1.5,11,.60 2.25,7,.60 3.0,11,.75"
)

# Turnaround (4 bars): symmetric de-stacking launching cleanly into bar 0
_MOTIF_TURN_DAY = (
    "0,7,.36 0.5,12,.36 1.0,9,.36 1.5,7,.36 2.0,4,.36 2.5,7,.36 3.0,2,.42 | "
    "0,4,.42 0.75,7,.38 1.5,9,.42 2.25,12,.38 3.0,9,.48 | "
    "0,7,.36 0.5,5,.36 1.0,9,.36 1.5,7,.36 2.0,5,.36 2.5,2,.36 3.0,5,.42 | "
    "0,2,.42 0.75,5,.38 1.5,11,.38 2.25,7,.42 3.25,2,.55"
)

_MOTIF_TURN_NIGHT = (
    "0,7,.52 0.5,12,.52 1.0,9,.52 1.5,7,.56 2.0,4,.56 2.5,7,.52 3.0,2,.68 | "
    "0,4,.62 0.75,7,.56 1.5,9,.62 2.25,12,.56 3.0,9,.72 | "
    "0,7,.52 0.5,5,.52 1.0,9,.52 1.5,7,.56 2.0,5,.56 2.5,2,.52 3.0,5,.68 | "
    "0,2,.62 0.75,5,.56 1.5,11,.62 2.25,7,.60 3.25,2,.62"
)

_F_MAJ_PCS = frozenset((5, 7, 9, 10, 0, 2, 4))


def _clamp_end(t_abs, dur, max_beat):
    return max(0.06, min(dur, max_beat - t_abs))


def _clamp_pitch(p, lo=40, hi=96):
    return max(lo, min(hi, int(round(p))))


def _chord_tone_near(target, voicing, root, lo=48, hi=96, avoid_pitch=None):
    """Snap a pitch to the nearest chord tone within [lo, hi], avoiding minor-2nd clash with avoid_pitch."""
    pcs = {p % 12 for p in voicing} | {root % 12}
    cands = [p for p in range(lo, hi + 1) if p % 12 in pcs]
    if avoid_pitch is not None:
        clean = [p for p in cands if abs(p - avoid_pitch) != 1 and (abs(p - avoid_pitch) % 12 not in (1, 11))]
        if clean:
            cands = clean
    if not cands:
        return _clamp_pitch(target, lo, hi)
    return min(cands, key=lambda p: (abs(p - target), p < target))


def _chord_step_above(pitch, voicing, root, lo=48, hi=96):
    """Find the next consonant chord tone at least a whole-step above pitch (ideal for interlocking hockets)."""
    pcs = {p % 12 for p in voicing} | {root % 12}
    for cand in range(int(pitch) + 2, hi + 1):
        if cand % 12 in pcs and (abs(cand - pitch) % 12 not in (1, 11)):
            return cand
    return _chord_tone_near(pitch + 3, voicing, root, lo=lo, hi=hi, avoid_pitch=pitch)


def _diatonic_approach(root, next_root):
    """Return a warm F-major diatonic step approaching next_root (used for Night Fretless Bass)."""
    step_dir = -1 if next_root > root else (1 if next_root < root else -2)
    for delta in (step_dir, step_dir * 2):
        cand = next_root + delta
        if cand % 12 in _F_MAJ_PCS and 33 <= cand <= 60:
            return cand
    return root + 7


def _schedule_canon_echo(
    s,
    ch,
    events,
    tonic,
    bar_start,
    delay,
    vel,
    voicing,
    root,
    max_beat,
    meter,
    octave_shift=0,
    dur_scale=0.82,
    pan=None,
    vib=False,
):
    """Schedule an imitative canon voice echoing `events` delayed by `delay` beats."""
    bar_end = min(max_beat, bar_start + meter - 0.14)
    ev_list = list(events)
    for at, step, dur in ev_list:
        at_c = at + delay
        if at_c >= meter - 0.18:
            continue
        raw_p = tonic + int(step) + octave_shift
        # Check current simultaneous lead pitch so the canon voice avoids minor-2nd rubs
        sim_lead = None
        for l_at, l_step, l_dur in ev_list:
            if l_at <= at_c < l_at + l_dur + 0.10:
                sim_lead = tonic + int(l_step)
                break
        p = _chord_tone_near(raw_p, voicing, root, lo=52, hi=96, avoid_pitch=sim_lead)
        t_abs = bar_start + at_c
        d_c = _clamp_end(t_abs, min(dur * dur_scale, max(0.08, bar_end - t_abs)), max_beat)
        if t_abs < max_beat - 0.08:
            s.note(ch, p, t_abs, d_c, vel, humanize=0.005, vib=vib, pan=pan)


def _schedule_hocket_interlock(s, ch, events, lead_tonic, bar_start, pos, sec_name, voicing, root, vel, night, max_beat):
    """Weave an interlocking stereo kotekan / hocket partner in the off-grid gaps of Ch 0."""
    if pos % 2 == 0:
        slots = (0.25, 1.25, 2.25, 3.25) if not night else (0.25, 1.75, 2.75, 3.50)
    else:
        slots = (0.50, 1.25, 2.00, 2.75, 3.50) if not night else (0.50, 2.00, 3.50)

    ev_list = list(events)
    if not ev_list:
        return
    prev_h = None
    for idx, slot in enumerate(slots):
        prev_step = ev_list[0][1]
        for at, step, _ in ev_list:
            if at <= slot:
                prev_step = step
        ref_p = lead_tonic + int(prev_step)
        if idx % 2 == 0:
            p = _chord_step_above(ref_p, voicing, root, lo=57, hi=95)
        else:
            p = _chord_tone_near(ref_p - 4, voicing, root, lo=55, hi=93, avoid_pitch=ref_p)
        if prev_h is not None and abs(p - prev_h) == 1:
            p = _chord_tone_near(p + 2, voicing, root, lo=55, hi=95, avoid_pitch=prev_h)
        prev_h = p
        t_abs = bar_start + slot
        if t_abs >= max_beat - 0.10:
            continue
        dur = 0.18 if not night else 0.34
        v_hit = vel * (1.06 if idx in (0, len(slots) - 1) else 0.90)
        s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), v_hit, humanize=0.004)


def _schedule_cellular_ostinato(
    s,
    ch,
    sec_name,
    pos,
    bar,
    t,
    voicing,
    root,
    night,
    max_beat,
    meter,
    cycle_state,
):
    """Run section-specific polyrhythmic & cellular ostinatos continuously across bars.

    - Intro & A: 3-against-4 (0.75-beat) rotating 4-note chord cell (continuous phase across bars!)
    - A': 5-note rotating cellular pattern across 8th notes (accents shift by 3 eighths every bar!)
    - B: 3-against-4 hemiola chordal waves (2-bar 3+3+3+3+2+2 eighth grouping)
    - C (0..3): 5+5+6 syncopated interlocking plucks supporting the mirror call-and-response
    - C (4..6): 7-eighth-note (3.5-beat) continuous phasing cellular cycle across 3 bars
    - A+B: Full 3-against-4 interlocking pattern + harmonic double accents
    - Turnaround: Clean 3+3+2 unwinding cellular weave back into Bar 0
    """
    v0, v1, v2, v3 = voicing
    v4 = _clamp_pitch(v1 + 12, 60, 92)
    cell5 = (v0, v2, v1, v3, v4)
    bar_cap = min(max_beat, t + meter - 0.12)

    if sec_name in ("intro", "A", "AB"):
        base_v = (40 if sec_name == "AB" else 36) if not night else (40 if sec_name == "AB" else 35)
        step_beats = 0.75
        beat_cursor = cycle_state["poly3_offset"]
        step_idx = cycle_state["poly3_idx"]
        while beat_cursor < meter - 0.01:
            t_abs = t + beat_cursor
            if t_abs < max_beat - 0.06:
                p = voicing[step_idx % 4]
                is_cell_head = (step_idx % 4) == 0
                vel = base_v * (1.16 if is_cell_head else 0.90)
                dur = min(0.24 if not night else 0.56, max(0.08, bar_cap - t_abs))
                s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), vel, humanize=0.005)
                if (sec_name == "AB" or (sec_name == "A" and pos >= 4)) and is_cell_head:
                    p_hi = voicing[(step_idx + 2) % 4]
                    s.note(ch, p_hi, t_abs, _clamp_end(t_abs, dur, max_beat), vel * 0.84, humanize=0.005)
            beat_cursor += step_beats
            step_idx += 1
        cycle_state["poly3_offset"] = beat_cursor - meter
        cycle_state["poly3_idx"] = step_idx

    elif sec_name == "Ap":
        base_v = 38 if not night else 38
        idx5 = cycle_state["cell5_idx"]
        for k in range(8):
            at = k * 0.5
            t_abs = t + at
            if t_abs >= max_beat - 0.06:
                continue
            p = cell5[idx5 % 5]
            is_head = (idx5 % 5) == 0
            vel = base_v * (1.20 if is_head else 0.88)
            dur = min(0.24 if not night else 0.52, max(0.08, bar_cap - t_abs))
            s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), vel, humanize=0.005)
            idx5 += 1
        cycle_state["cell5_idx"] = idx5

    elif sec_name == "B":
        base_v = 40 if not night else 39
        if pos % 2 == 0:
            hits = (
                (0.0, (v0, v2), 1.15), (0.75, (v1,), 0.82), (1.5, (v1, v3), 1.12),
                (2.25, (v2,), 0.82), (3.0, (v0, v3), 1.15), (3.5, (v1,), 0.84),
            )
        else:
            hits = (
                (0.5, (v1, v3), 1.14), (1.25, (v2,), 0.82), (2.0, (v0, v2), 1.12),
                (2.5, (v1,), 0.84), (3.0, (v2, v3), 1.10), (3.5, (v1,), 0.88),
            )
        for at, pitches, mult in hits:
            t_abs = t + at
            if t_abs >= max_beat - 0.06:
                continue
            dur = min(0.28 if not night else 0.60, max(0.08, bar_cap - t_abs))
            for p in pitches:
                s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), base_v * mult, humanize=0.005)

    elif sec_name == "C":
        if pos <= 3:
            base_v = 38 if not night else 37
            pattern = (
                (0.0, (v0, v2), 1.12), (0.75, (v1,), 0.88), (1.25, (v3,), 0.96),
                (2.0, (v1, v3), 1.12), (2.75, (v2,), 0.88), (3.25, (v0,), 0.96),
            )
            for at, pitches, mult in pattern:
                t_abs = t + at
                if t_abs >= max_beat - 0.06:
                    continue
                dur = min(0.24 if not night else 0.50, max(0.08, bar_cap - t_abs))
                for p in pitches:
                    s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), base_v * mult, humanize=0.005)
        elif pos in (4, 5, 6):
            base_v = 40 if not night else 39
            cell7 = (v0, v1, v2, v3, v2, v1, v3)
            idx7 = cycle_state["cell7_idx"]
            for k in range(8):
                at = k * 0.5
                t_abs = t + at
                if t_abs >= max_beat - 0.06:
                    continue
                p = cell7[idx7 % 7]
                is_pivot = (idx7 % 7) == 0
                vel = base_v * (1.22 if is_pivot else 0.86)
                dur = min(0.24 if not night else 0.50, max(0.08, bar_cap - t_abs))
                s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), vel, humanize=0.005)
                if is_pivot:
                    s.note(ch, v2 if p != v2 else v3, t_abs, _clamp_end(t_abs, dur, max_beat), vel * 0.82, humanize=0.005)
                idx7 += 1
            cycle_state["cell7_idx"] = idx7
        else:
            if not night:
                for at, p in ((0.0, v0), (0.5, v2), (1.0, v1), (1.5, v3)):
                    s.note(ch, p, t + at, _clamp_end(t + at, 0.24, max_beat), 42, humanize=0.004)
            else:
                cascade = (v0, v1, v2, v3, v0 + 12, v1 + 12, v2 + 12, v3 + 12)
                for idx, p in enumerate(cascade):
                    at = 2.0 + idx * 0.25
                    t_abs = t + at
                    if t_abs < max_beat - 0.06:
                        s.note(ch, _clamp_pitch(p, 58, 92), t_abs, _clamp_end(t_abs, 0.48, max_beat), 36 + idx * 2, humanize=0.004)

    elif sec_name == "turn":
        base_v = 36 if not night else 35
        hits = ((0.0, v0), (0.75, v1), (1.5, v2), (2.0, v3), (2.75, v2), (3.5, v1))
        for idx, (at, p) in enumerate(hits):
            if pos == 3 and at >= 3.25:
                continue
            t_abs = t + at
            if t_abs < max_beat - 0.06:
                vel = base_v * (1.10 if idx in (0, 3) else 0.88)
                dur = min(0.24 if not night else 0.50, max(0.08, bar_cap - t_abs))
                s.note(ch, p, t_abs, _clamp_end(t_abs, dur, max_beat), vel, humanize=0.005)


def _schedule_stereo_chimes(s, ch_wb, ch_bell, sec_name, pos, t, voicing, root, night, max_beat, bar):
    """Schedule pitched stereo L/R woodblocks & glockenspiel (Day) or music box polyrhythms (Night)."""
    lo_p = _chord_tone_near(72, voicing, root, lo=69, hi=76)
    mid_p = _chord_tone_near(77, voicing, root, lo=74, hi=81)
    hi_p = _chord_tone_near(81, voicing, root, lo=79, hi=86)
    top_p = _chord_tone_near(89, voicing, root, lo=84, hi=95)

    if not night:
        if sec_name == "C" and pos == 7:
            # 2-beat stereo interlocking L/R hocket cascade launching into A+B!
            cascade_p = (72, 74, 76, 77, 79, 81, 84, 86)
            for idx, p in enumerate(cascade_p):
                at = 2.0 + idx * 0.25
                pan_v = 18 if idx % 2 == 0 else 110
                vel = 52 + idx * 2
                s.note(ch_wb, p, t + at, _clamp_end(t + at, 0.14, max_beat), vel, humanize=0.0, pan=pan_v)
                if idx % 2 == 1:
                    s.note(ch_bell, _clamp_pitch(p + 12, 76, 96), t + at, _clamp_end(t + at, 0.22, max_beat), 46 + idx, humanize=0.0, pan=110 if pan_v == 18 else 18)
            return

        if sec_name in ("intro", "turn"):
            wb_hits = (
                (0.25, mid_p, 20, 46),
                (1.00, lo_p, 108, 44),
                (1.75, hi_p, 20, 50),
                (2.75, lo_p, 108, 44),
                (3.50, mid_p, 20, 48),
            )
        elif sec_name in ("A", "AB"):
            wb_hits = (
                (0.25, mid_p, 18, 48),
                (1.00, lo_p, 110, 46),
                (1.75, hi_p, 18, 52),
                (2.50, lo_p, 110, 46),
                (3.25, mid_p, 18, 50),
            )
        elif sec_name == "Ap":
            shift_off = (pos % 4) * 0.25
            raw_slots = (0.25, 1.00, 1.75, 2.50, 3.25)
            wb_hits = []
            for idx, sl in enumerate(raw_slots):
                at = (sl + shift_off) % 4.0
                p = (lo_p, mid_p, hi_p, mid_p, hi_p)[(idx + pos) % 5]
                pan_v = 18 if (idx + pos) % 2 == 0 else 110
                wb_hits.append((at, p, pan_v, 48 + (4 if idx == 0 else 0)))
        elif sec_name == "B":
            if pos % 2 == 0:
                wb_hits = ((0.0, hi_p, 18, 50), (1.5, mid_p, 110, 48), (3.0, hi_p, 18, 50), (3.75, lo_p, 110, 44))
            else:
                wb_hits = ((0.5, mid_p, 110, 48), (2.0, hi_p, 18, 50), (3.0, lo_p, 110, 46), (3.5, mid_p, 18, 48))
        else:
            if pos <= 3:
                wb_hits = (
                    (0.25, mid_p, 18, 48),
                    (1.00, hi_p, 18, 50),
                    (2.25, mid_p, 110, 48),
                    (3.00, lo_p, 110, 50),
                )
            else:
                pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
                pivots = pivot_map.get(pos, (0.0,))
                wb_hits = [(0.5, lo_p, 20, 44), (1.5, mid_p, 108, 46), (2.0, lo_p, 20, 44)]
                for pv in pivots:
                    wb_hits.append((pv, hi_p, 110 if pos % 2 else 18, 56))

        for at, p, pan_v, vel in wb_hits:
            t_abs = t + at
            if t_abs < max_beat - 0.08:
                s.note(ch_wb, p, t_abs, _clamp_end(t_abs, 0.14, max_beat), vel, humanize=0.003, pan=pan_v)

        if sec_name == "intro" and pos in (2, 3):
            s.note(ch_bell, top_p, t + 0.0, _clamp_end(t, 0.45, max_beat), 44, humanize=0.004, pan=22 if pos % 2 == 0 else 106)
            s.note(ch_bell, _clamp_pitch(mid_p + 12, 81, 95), t + 2.25, _clamp_end(t + 2.25, 0.40, max_beat), 40, humanize=0.004, pan=106 if pos % 2 == 0 else 22)
        elif sec_name == "Ap" and pos % 2 == 0:
            at_acc = (pos * 0.5) % 3.5
            s.note(ch_bell, top_p, t + at_acc, _clamp_end(t + at_acc, 0.42, max_beat), 44, humanize=0.004, pan=22 if (pos // 2) % 2 == 0 else 106)
        elif sec_name == "B":
            bell_times = (0.0, 1.5, 3.0) if pos % 2 == 0 else (0.5, 2.0, 3.0)
            for b_idx, at in enumerate(bell_times):
                p_b = top_p if b_idx == 0 else _clamp_pitch(mid_p + 12, 81, 95)
                pan_b = 22 if (b_idx + pos) % 2 == 0 else 106
                s.note(ch_bell, p_b, t + at, _clamp_end(t + at, 0.40, max_beat), 42, humanize=0.004, pan=pan_b)
        elif sec_name == "C" and pos in (4, 5, 6):
            pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
            for idx_p, pv in enumerate(pivot_map[pos]):
                pan_b = 18 if (pos + idx_p) % 2 == 0 else 110
                s.note(ch_bell, top_p, t + pv, _clamp_end(t + pv, 0.55, max_beat), 52, humanize=0.003, pan=pan_b)
        elif sec_name == "AB":
            for idx_b, at in enumerate((0.0, 1.5, 3.0) if pos % 2 == 0 else (0.75, 2.25)):
                p_b = top_p if idx_b == 0 else _clamp_pitch(hi_p + 12, 82, 96)
                pan_b = 20 if (idx_b + pos) % 2 == 0 else 108
                s.note(ch_bell, p_b, t + at, _clamp_end(t + at, 0.42, max_beat), 44, humanize=0.004, pan=pan_b)
        elif sec_name == "turn" and pos in (0, 2):
            s.note(ch_bell, top_p, t + 0.0, _clamp_end(t, 0.50, max_beat), 40, humanize=0.004, pan=22 if pos == 0 else 106)

    else:
        # Night Ch 6: Music Box L/R Polyrhythmic Droplets (pan 20 <-> 108)
        mb_lo = _chord_tone_near(77, voicing, root, lo=74, hi=81)
        mb_mid = _chord_tone_near(84, voicing, root, lo=81, hi=88)
        mb_hi = _chord_tone_near(89, voicing, root, lo=86, hi=95)

        if sec_name == "C" and pos == 7:
            for idx, p in enumerate((77, 79, 81, 84, 86, 89)):
                at = 2.25 + idx * 0.25
                if t + at < max_beat - 0.06:
                    s.note(ch_wb, p, t + at, _clamp_end(t + at, 0.48, max_beat), 40 + idx * 2, humanize=0.003, pan=20 if idx % 2 == 0 else 108)
            return

        if sec_name in ("intro", "turn"):
            mb_hits = ((0.75, mb_mid, 20, 36), (2.25, mb_hi, 108, 38), (3.50, mb_lo, 20, 34))
        elif sec_name in ("A", "AB"):
            mb_hits = (
                (0.75, mb_mid, 18, 38 if sec_name == "AB" else 34),
                (1.50, mb_hi, 110, 40 if sec_name == "AB" else 36),
                (2.25, mb_lo, 18, 36 if sec_name == "AB" else 32),
                (3.00, mb_mid, 110, 38 if sec_name == "AB" else 34),
            )
        elif sec_name == "Ap":
            at1 = (0.5 + (pos % 4) * 0.5) % 3.5
            at2 = (at1 + 1.5) % 3.75
            mb_hits = (
                (at1, mb_hi, 18 if pos % 2 == 0 else 110, 40),
                (at2, mb_mid, 110 if pos % 2 == 0 else 18, 36),
            )
        elif sec_name == "B":
            if pos % 2 == 0:
                mb_hits = ((0.0, mb_hi, 18, 40), (1.5, mb_mid, 110, 38), (3.0, mb_hi, 18, 40))
            else:
                mb_hits = ((0.5, mb_mid, 110, 38), (2.0, mb_hi, 18, 40), (3.5, mb_lo, 110, 36))
        else:
            if pos <= 3:
                mb_hits = ((0.75, mb_mid, 18, 38), (2.0, mb_hi, 110, 42), (3.25, mb_lo, 110, 36))
            else:
                pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
                mb_hits = [(1.0, mb_lo, 20, 34), (2.0, mb_mid, 108, 36)]
                for pv in pivot_map.get(pos, (0.0,)):
                    mb_hits.append((pv, mb_hi, 110 if pos % 2 else 18, 46))

        for at, p, pan_v, vel in mb_hits:
            t_abs = t + at
            if t_abs < max_beat - 0.08:
                s.note(ch_wb, p, t_abs, _clamp_end(t_abs, 0.48, max_beat), vel, humanize=0.004, pan=pan_v)


def _schedule_pattern_bass(s, ch, sec_name, pos, sec_len, t, root, anchor5, next_root, voicing, night, is_last_bar, max_beat):
    """Schedule section-evolving syncopated pattern basslines (Day: Acoustic Bass; Night: Fretless Bass)."""
    oct_r = root + 12
    third_b = _chord_tone_near(root + 4, voicing, root, lo=36, hi=56)
    if night:
        lead_p = _diatonic_approach(root, next_root)
    else:
        if next_root > root:
            lead_p = next_root - 1
        elif next_root < root:
            lead_p = next_root + 1
        else:
            lead_p = anchor5

    if not night:
        v_b = 62 if sec_name in ("B", "AB") else 56
        if sec_name == "C" and pos == 7:
            hits = ((0.0, root, 0.45, v_b), (0.75, oct_r, 0.35, v_b * 0.80), (1.5, anchor5, 0.35, v_b * 0.88))
        elif sec_name in ("intro", "turn"):
            hits = (
                (0.0, root, 0.55, v_b),
                (1.5, anchor5, 0.45, v_b * 0.88),
                (2.25, oct_r, 0.40, v_b * 0.80),
                (3.0, anchor5, 0.78, v_b * 0.84),
            ) if is_last_bar else (
                (0.0, root, 0.55, v_b),
                (1.5, anchor5, 0.45, v_b * 0.88),
                (2.5, oct_r, 0.40, v_b * 0.80),
                (3.0, anchor5, 0.38, v_b * 0.84),
                (3.5, lead_p, 0.38, v_b * 0.86),
            )
        elif sec_name in ("A", "AB"):
            walk_p = lead_p if (pos % 2 == 1) else anchor5
            hits = (
                (0.0, root, 0.50, v_b),
                (0.75, oct_r, 0.38, v_b * 0.80),
                (1.5, anchor5, 0.42, v_b * 0.88),
                (2.25, third_b, 0.45, v_b * 0.82),
                (3.0, root, 0.38, v_b * 0.86),
                (3.5, walk_p, 0.38, v_b * 0.84),
            )
        elif sec_name == "Ap":
            if pos % 2 == 0:
                hits = (
                    (0.0, root, 0.48, v_b),
                    (0.75, anchor5, 0.38, v_b * 0.82),
                    (1.5, oct_r, 0.42, v_b * 0.86),
                    (2.0, anchor5, 0.40, v_b * 0.84),
                    (2.75, third_b, 0.42, v_b * 0.80),
                    (3.5, lead_p, 0.38, v_b * 0.86),
                )
            else:
                hits = (
                    (0.0, root, 0.55, v_b),
                    (1.0, third_b, 0.40, v_b * 0.84),
                    (1.5, anchor5, 0.42, v_b * 0.86),
                    (2.25, oct_r, 0.40, v_b * 0.80),
                    (3.0, anchor5, 0.40, v_b * 0.84),
                    (3.5, lead_p, 0.38, v_b * 0.86),
                )
        elif sec_name == "B":
            if pos % 2 == 0:
                hits = ((0.0, root, 0.90, v_b), (1.5, anchor5, 0.90, v_b * 0.88), (3.0, third_b, 0.75, v_b * 0.86))
            else:
                hits = ((0.5, anchor5, 0.90, v_b * 0.90), (2.0, root, 0.75, v_b * 0.88), (3.0, anchor5, 0.42, v_b * 0.86), (3.5, lead_p, 0.38, v_b * 0.86))
        else:
            if pos <= 3:
                hits = ((0.0, root, 0.65, v_b), (1.25, anchor5, 0.50, v_b * 0.86), (2.0, oct_r, 0.60, v_b * 0.84), (3.25, lead_p, 0.50, v_b * 0.86))
            elif pos == 4:
                hits = ((0.0, root, 0.90, v_b), (1.5, anchor5, 0.80, v_b * 0.88), (2.5, third_b, 0.65, v_b * 0.82), (3.5, next_root, 0.42, v_b * 0.92))
            elif pos == 5:
                hits = ((0.0, root, 0.75, v_b * 0.88), (1.0, anchor5, 0.80, v_b * 0.86), (2.0, third_b, 0.70, v_b * 0.84), (3.0, next_root, 0.75, v_b * 0.94))
            else:
                hits = ((0.0, root, 0.75, v_b * 0.88), (1.0, anchor5, 0.75, v_b * 0.86), (2.5, anchor5, 0.70, v_b * 0.92), (3.5, lead_p, 0.38, v_b * 0.88))
    else:
        v_b = 48 if sec_name in ("B", "AB") else 43
        if sec_name in ("intro", "turn"):
            hits = ((0.0, root, 1.35, v_b), (1.5, anchor5, 1.25, v_b * 0.86), (3.0, anchor5 if is_last_bar else lead_p, 0.80, v_b * 0.84))
        elif sec_name in ("A", "AB"):
            hits = ((0.0, root, 1.25, v_b), (1.5, anchor5, 0.90, v_b * 0.88), (2.5, third_b, 0.80, v_b * 0.84), (3.5, lead_p if pos % 2 == 1 else anchor5, 0.42, v_b * 0.82))
        elif sec_name == "Ap":
            hits = ((0.0, root, 1.20, v_b), (1.5, oct_r, 0.85, v_b * 0.82), (2.5, anchor5, 0.85, v_b * 0.86), (3.5, lead_p, 0.42, v_b * 0.84))
        elif sec_name == "B":
            if pos % 2 == 0:
                hits = ((0.0, root, 1.35, v_b), (1.5, anchor5, 1.35, v_b * 0.88), (3.0, third_b, 0.85, v_b * 0.86))
            else:
                hits = ((0.5, anchor5, 1.35, v_b * 0.90), (2.0, root, 1.25, v_b * 0.88), (3.5, lead_p, 0.42, v_b * 0.84))
        else:
            if pos <= 3:
                hits = ((0.0, root, 1.10, v_b), (1.25, anchor5, 0.65, v_b * 0.84), (2.0, root, 1.10, v_b * 0.86), (3.25, lead_p, 0.60, v_b * 0.84))
            elif pos == 4:
                hits = ((0.0, root, 1.40, v_b), (1.5, anchor5, 1.50, v_b * 0.86), (3.5, next_root, 0.42, v_b * 0.90))
            elif pos == 5:
                hits = ((0.0, root, 1.30, v_b * 0.86), (1.5, anchor5, 1.20, v_b * 0.86), (3.0, next_root, 0.85, v_b * 0.92))
            elif pos == 6:
                hits = ((0.0, root, 1.25, v_b * 0.88), (1.5, anchor5, 0.85, v_b * 0.86), (2.5, anchor5, 1.20, v_b * 0.90))
            else:
                hits = ((0.0, root, 1.65, v_b), (2.0, anchor5, 1.65, v_b * 0.86))

    for at, p, dur, vel in hits:
        t_abs = t + at
        if t_abs < max_beat - 0.06:
            s.note(ch, _clamp_pitch(p, 33, 62), t_abs, _clamp_end(t_abs, dur, max_beat), vel, humanize=0.006)


def _schedule_pattern_drums(s, sec_name, pos, sec_len, t, night, max_beat):
    """Schedule section-evolving, pattern-driven percussion grooves."""
    if not night:
        if sec_name == "C" and pos == 7:
            s.drum(49, t + 0.0, 50, dur=0.35)
            s.drum(36, t + 0.0, 50, dur=0.12)
            s.drum(75, t + 0.75, 42, dur=0.08)
            s.drum(38, t + 1.50, 44, dur=0.10)
            s.drum(60, t + 2.25, 44, dur=0.10, humanize=0.0)
            s.drum(61, t + 2.75, 46, dur=0.10, humanize=0.0)
            s.drum(47, t + 3.00, 48, dur=0.12, humanize=0.0)
            s.drum(45, t + 3.25, 50, dur=0.12, humanize=0.0)
            s.drum(38, t + 3.50, 56, dur=0.10, humanize=0.0)
            s.drum(38, t + 3.75, 48, dur=0.10, humanize=0.0)
            return

        if sec_name == "intro":
            for at in (0.0, 1.5, 3.0):
                s.drum(75, t + at, 36, dur=0.08)
            for at in (0.5, 1.5, 2.5, 3.5):
                s.drum(69, t + at, 26, dur=0.08)
            if pos >= 1:
                s.drum(36, t + 0.0, 42)
                s.drum(36, t + 2.5, 34)
                s.drum(37, t + 1.0, 36)
                s.drum(37, t + 3.0, 38)
            if pos >= 2:
                s.drum(60, t + 0.75, 34)
                s.drum(61, t + 2.25, 36)
            if pos == 3:
                s.drum(47, t + 3.0, 40)
                s.drum(45, t + 3.5, 44)
                s.drum(46, t + 3.75, 34, dur=0.14)

        elif sec_name in ("A", "AB"):
            s.drum(36, t + 0.0, 48)
            s.drum(36, t + 1.5, 38)
            s.drum(36, t + 2.5, 40)
            s.drum(38, t + 1.0, 38)
            s.drum(38, t + 3.0, 40)
            for at in (0.5, 1.5, 2.5, 3.5):
                s.drum(42, t + at, 28, dur=0.08)
            s.drum(75, t + (0.0 if pos % 2 == 0 else 0.75), 36, dur=0.08)
            s.drum(60, t + 0.75, 34)
            s.drum(61, t + 2.25, 36)
            if sec_name == "AB":
                s.drum(69, t + 0.25, 24, dur=0.06)
                s.drum(69, t + 1.75, 24, dur=0.06)
                s.drum(69, t + 3.25, 26, dur=0.06)
            if pos == 0:
                s.drum(49, t + 0.0, 44, dur=0.35)
            if pos == sec_len - 1:
                s.drum(47, t + 3.0, 40)
                s.drum(45, t + 3.5, 44)

        elif sec_name == "Ap":
            s.drum(36, t + 0.0, 46)
            s.drum(36, t + 2.0, 42)
            s.drum(36, t + 2.75, 34)
            s.drum(38, t + 1.0, 36)
            s.drum(37, t + 2.5, 34)
            s.drum(38, t + 3.0, 38)
            for k in range(8):
                vel_h = 30 if (pos * 8 + k) % 5 == 0 else 20
                s.drum(42, t + k * 0.5, vel_h, dur=0.07)
            s.drum(60, t + 1.25, 34)
            s.drum(61, t + 3.25, 36)
            if pos == sec_len - 1:
                s.drum(47, t + 3.25, 40)
                s.drum(45, t + 3.5, 44)

        elif sec_name == "B":
            if pos % 2 == 0:
                for at in (0.0, 1.5, 3.0):
                    s.drum(51, t + at, 34, dur=0.16)
                    s.drum(62, t + at, 36, dur=0.10)
                s.drum(36, t + 0.0, 44)
                s.drum(36, t + 3.0, 38)
                s.drum(38, t + 1.5, 36)
                s.drum(63, t + 2.25, 32)
            else:
                for at in (0.5, 2.0, 3.0):
                    s.drum(51, t + at, 34, dur=0.16)
                    s.drum(62, t + at, 36, dur=0.10)
                s.drum(36, t + 0.5, 42)
                s.drum(36, t + 2.0, 40)
                s.drum(38, t + 3.0, 38)
                s.drum(63, t + 1.25, 32)
                if pos == sec_len - 1:
                    s.drum(46, t + 3.75, 34, dur=0.14)

        elif sec_name == "C":
            if pos <= 3:
                s.drum(36, t + 0.0, 44)
                s.drum(37, t + 0.75, 36)
                s.drum(60, t + 1.25, 38)
                s.drum(36, t + 2.0, 42)
                s.drum(38, t + 2.75, 36)
                s.drum(61, t + 3.25, 38)
                for at in (0.5, 1.5, 2.5, 3.5):
                    s.drum(69, t + at, 24, dur=0.06)
            else:
                s.drum(36, t + 0.0, 42)
                s.drum(38, t + 1.0, 34)
                s.drum(38, t + 3.0, 36)
                for at in (0.5, 1.5, 2.5, 3.5):
                    s.drum(42, t + at, 24, dur=0.07)
                pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
                for pv in pivot_map[pos]:
                    s.drum(81, t + pv, 40, dur=0.18)
                    s.drum(75, t + pv, 42, dur=0.08)

        elif sec_name == "turn":
            for at in (0.0, 1.5, 3.0):
                s.drum(75, t + at, 34, dur=0.08)
            for at in (0.5, 1.5, 2.5, 3.5):
                s.drum(69, t + at, 24, dur=0.07)
            if pos <= 2:
                s.drum(36, t + 0.0, 42)
                s.drum(37, t + 1.0, 34)
                s.drum(36, t + 2.5, 34)
                s.drum(37, t + 3.0, 36)
            else:
                s.drum(36, t + 0.0, 40)
                s.drum(60, t + 2.25, 36)
                s.drum(61, t + 3.0, 38)
                s.drum(37, t + 3.5, 36)
    else:
        s.drum(36, t + 0.0, 20, dur=0.12)
        if sec_name == "B":
            if pos % 2 == 0:
                for at in (0.0, 1.5, 3.0):
                    s.drum(38, t + at, 19, dur=0.10)
                s.drum(42, t + 0.75, 14, dur=0.08)
                s.drum(42, t + 2.25, 14, dur=0.08)
            else:
                for at in (0.5, 2.0, 3.0):
                    s.drum(38, t + at, 19, dur=0.10)
                s.drum(42, t + 1.25, 14, dur=0.08)
                s.drum(42, t + 3.50, 14, dur=0.08)
        elif sec_name == "C" and pos in (4, 5, 6):
            for at in (1.0, 3.0):
                s.drum(38, t + at, 17, dur=0.10)
            for at in (0.5, 1.5, 2.5, 3.5):
                s.drum(42, t + at, 13, dur=0.08)
            pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
            for pv in pivot_map[pos]:
                s.drum(37, t + pv, 22, dur=0.08)
        else:
            for at in (1.0, 3.0):
                s.drum(38, t + at, 19, dur=0.10)
            for at in (0.5, 1.5, 2.5, 3.5):
                s.drum(42, t + at, 14, dur=0.08)
            if sec_name in ("A", "Ap", "AB"):
                s.drum(37, t + (0.75 if pos % 2 == 0 else 2.25), 16, dur=0.08)
            if pos == sec_len - 1:
                s.drum(37, t + 3.25, 18, dur=0.08)


def build_track(track_name, engine):
    spec = next((t for t in TRACKS if t["name"] == track_name), None)
    if spec is None:
        raise KeyError(f"Unknown Pattern Reef track: {track_name}")

    night = spec["mode"] == "night"
    meter = spec["beats_per_bar"]
    lead_tonic = 65 if night else 77

    s = engine.Score(
        bpm=spec["bpm"],
        seed=sum(ord(c) for c in track_name) * 37,
        swing=spec["swing"],
        beats_per_bar=meter,
        time_sig=spec["meter"],
        key_sig=spec["key_midi"],
    )

    if not night:
        s.set_channel(0, 12, "Marimba Lead", bank=0, pan=50, vol=86, rev=44, cho=14)
        s.set_channel(1, 45, "Pizzicato Polyrhythm", bank=0, pan=22, vol=66, rev=40, cho=14)
        s.set_channel(2, 71, "Clarinet Counter", bank=0, pan=98, vol=74, rev=48, cho=16)
        s.set_channel(3, 32, "Acoustic Bass", bank=0, pan=64, vol=80, rev=22, cho=6)
        s.set_channel(4, 13, "Xylophone Canon", bank=0, pan=88, vol=72, rev=48, cho=14)
        s.set_channel(5, 48, "Strings Pad", bank=0, pan=104, vol=40, rev=62, cho=22)
        s.set_channel(6, 115, "Stereo Woodblock Matrix", bank=0, pan=18, vol=64, rev=34, cho=8)
        s.set_channel(7, 9, "Glockenspiel Chimes", bank=0, pan=108, vol=58, rev=56, cho=18)
        s.set_channel(8, 73, "Flute Ostinato", bank=0, pan=32, vol=62, rev=52, cho=18)
        s.set_channel(9, 0, "Puzzle Standard Kit", bank=128, pan=64, vol=52, rev=24, cho=8)
    else:
        s.set_channel(0, 108, "Kalimba Lead", bank=0, pan=52, vol=82, rev=56, cho=16)
        s.set_channel(1, 46, "Harp Cellular Ostinato", bank=0, pan=24, vol=62, rev=60, cho=20)
        s.set_channel(2, 12, "Soft Marimba Hocket", bank=0, pan=88, vol=58, rev=54, cho=16)
        s.set_channel(3, 35, "Fretless Bass", bank=0, pan=64, vol=72, rev=24, cho=6)
        s.set_channel(4, 8, "Celesta Canon", bank=0, pan=96, vol=70, rev=64, cho=20)
        s.set_channel(5, 49, "Slow Strings", bank=0, pan=90, vol=38, rev=70, cho=26)
        s.set_channel(6, 10, "Music Box Polyrhythm", bank=0, pan=20, vol=56, rev=64, cho=20)
        s.set_channel(7, 11, "Vibraphone Counter", bank=0, pan=34, vol=72, rev=62, cho=22)
        s.set_channel(9, 40, "Soft Brush Tick", bank=128, pan=64, vol=38, rev=28, cho=8)

    phrases = {
        "intro": engine.ph(_MOTIF_INTRO_NIGHT if night else _MOTIF_INTRO_DAY),
        "A": engine.ph(_MOTIF_A_NIGHT if night else _MOTIF_A_DAY),
        "Ap": engine.ph(_MOTIF_AP_NIGHT if night else _MOTIF_AP_DAY),
        "B": engine.ph(_MOTIF_B),
        "C": engine.ph(_MOTIF_C),
        "AB": engine.ph(_MOTIF_AB_LEAD_NIGHT if night else _MOTIF_AB_LEAD_DAY),
        "turn": engine.ph(_MOTIF_TURN_NIGHT if night else _MOTIF_TURN_DAY),
    }
    mirror_c = engine.ph(_MIRROR_C_ANSWERS)
    ab_counter_b = engine.ph(_MOTIF_AB_COUNTER_B)

    bar_plan = []
    for sec_name, chord_str in _SECTIONS:
        syms = chord_str.split()
        for pos, sym in enumerate(syms):
            bar_plan.append((sec_name, pos, len(syms), sym))

    n_bars = len(bar_plan)
    max_beat = n_bars * meter - 0.06  # 191.94b strict cap for clean loop bounds

    if night:
        cursor = 0
        for sec_name, chord_str in _SECTIONS:
            sec_len = len(chord_str.split())
            b0 = max(0.0, s.bar_beat(cursor) - 0.16)
            b1 = min(max_beat, s.bar_beat(cursor + sec_len) - 0.14)
            low_cc = 64 if sec_name in ("intro", "turn") else 72
            high_cc = 112 if sec_name in ("B", "AB") else 100
            s.swell(5, b0, b1, low=low_cc, high=high_cc, steps=14, cc_num=11)
            cursor += sec_len

    cycle_state = {"poly3_offset": 0.0, "poly3_idx": 0, "cell5_idx": 0, "cell7_idx": 0}
    prev_sec = None

    for bar, (sec_name, pos, sec_len, sym) in enumerate(bar_plan):
        if sec_name != prev_sec:
            cycle_state["poly3_offset"] = 0.0
            cycle_state["poly3_idx"] = 0
            cycle_state["cell5_idx"] = 0
            cycle_state["cell7_idx"] = 0
            prev_sec = sec_name

        t = s.bar_beat(bar)
        root, anchor5, voicing = _F_CHORDS[sym]
        next_sym = bar_plan[(bar + 1) % n_bars][3]
        next_root = _F_CHORDS[next_sym][0]

        expr = 88 + int(22 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi))
        s.cc(0, 11, expr, t)
        s.cc(4, 11, expr, t)
        if not night:
            s.cc(2, 11, 88 + int(20 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi)), t)
            s.cc(5, 11, 74 + int(26 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi)), t)
            s.cc(8, 11, 86 + int(20 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi)), t)
        else:
            s.cc(7, 11, 88 + int(20 * math.sin((pos + 0.5) / max(1, sec_len) * math.pi)), t)
            s.pedal(1, t, min(max_beat, t + meter - 0.08))

        events = list(phrases[sec_name][pos])
        base_vel = engine.phrase_vel(54 if night else 64, pos, bars_per_phrase=max(4, sec_len))
        is_last_bar = bar == n_bars - 1
        bar_cap = min(max_beat, t + meter - 0.14)

        # ------------------------------------------------------------------
        # 1. Primary Lead (Ch 0: Day Marimba / Night Kalimba)
        # ------------------------------------------------------------------
        for idx_ev, (at, step, dur) in enumerate(events):
            raw_p = lead_tonic + int(step)
            pitch = _clamp_pitch(raw_p, 48, 96)
            t_abs = t + at
            if t_abs >= max_beat - 0.06:
                continue
            d_eff = s.clamp_dur(at, dur * (1.15 if night and sec_name in ("B", "C") else 1.0), margin=0.14)
            d_clamped = _clamp_end(t_abs, d_eff, max_beat)
            accent = 1.07 if idx_ev in (0, 3) else 0.96
            s.note(0, pitch, t_abs, d_clamped, base_vel * accent, humanize=0.006, vib=False)

        # ------------------------------------------------------------------
        # 2. Canon & Stereo Hocket Partner (Day Ch 4 Xylophone / Night Ch 4 Celesta & Ch 2 Soft Marimba)
        # ------------------------------------------------------------------
        if sec_name == "intro":
            if pos >= 1:
                _schedule_canon_echo(
                    s, 4, events, lead_tonic, t, delay=1.5 if pos == 2 else 2.0,
                    vel=base_vel * 0.72, voicing=voicing, root=root, max_beat=max_beat,
                    meter=meter, octave_shift=(12 if night else 0), dur_scale=0.80 if not night else 1.05,
                )
            if pos == 2:
                hocket_ch = 2 if night else 4
                _schedule_hocket_interlock(s, hocket_ch, events, lead_tonic, t, pos, sec_name, voicing, root, base_vel * 0.66, night, max_beat)
            elif pos == 3:
                # Sparkling 16th-note stereo zipper into Section A (pure C9 chord tones!)
                zip_steps = (2, 5, 7, 11, 14, 16)
                for z_i, z_s in enumerate(zip_steps):
                    at_z = 2.25 + z_i * 0.25
                    if t + at_z < max_beat - 0.06:
                        p_z = _clamp_pitch(lead_tonic + z_s + (12 if night else 0), 60, 96)
                        s.note(4, p_z, t + at_z, _clamp_end(t + at_z, 0.20 if not night else 0.36, max_beat), base_vel * 0.74, humanize=0.004)

        elif sec_name == "A":
            hocket_ch = 2 if night else 4
            _schedule_hocket_interlock(s, hocket_ch, events, lead_tonic, t, pos, sec_name, voicing, root, base_vel * 0.68, night, max_beat)
            if night and pos in (2, 6):
                _schedule_canon_echo(
                    s, 4, events[:3], lead_tonic, t, delay=1.5, vel=base_vel * 0.62,
                    voicing=voicing, root=root, max_beat=max_beat, meter=meter, octave_shift=12, dur_scale=1.10,
                )

        elif sec_name == "Ap":
            _schedule_canon_echo(
                s, 4, events, lead_tonic, t, delay=2.0,
                vel=base_vel * 0.74, voicing=voicing, root=root, max_beat=max_beat,
                meter=meter, octave_shift=(12 if night else 0), dur_scale=0.80 if not night else 1.05,
            )
            if night and pos % 2 == 0:
                _schedule_hocket_interlock(s, 2, events, lead_tonic, t, pos, sec_name, voicing, root, base_vel * 0.56, night, max_beat)

        elif sec_name == "B":
            b_slots = (0.5, 2.0, 3.5) if pos % 2 == 0 else (0.0, 1.5, 2.75)
            for b_i, at in enumerate(b_slots):
                t_abs = t + at
                if t_abs >= max_beat - 0.06:
                    continue
                p_b = _clamp_pitch(voicing[(b_i + pos) % 4] + 12, 72, 95)
                s.note(4, p_b, t_abs, _clamp_end(t_abs, min(0.28 if not night else 0.52, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.64, humanize=0.005)
            if night:
                for m_i, at in enumerate((0.75, 2.25, 3.25)):
                    t_abs = t + at
                    if t_abs < max_beat - 0.06:
                        s.note(2, _clamp_pitch(voicing[(m_i + 1) % 4], 58, 82), t_abs, _clamp_end(t_abs, min(0.40, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.52, humanize=0.005)

        elif sec_name == "C":
            if pos <= 3:
                for at, step, dur in mirror_c[pos]:
                    t_abs = t + at
                    if t_abs >= max_beat - 0.06:
                        continue
                    p_m = _clamp_pitch(lead_tonic + int(step) + (12 if night else 0), 60, 96)
                    s.note(4, p_m, t_abs, _clamp_end(t_abs, min(dur * (1.10 if night else 0.92), max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.80, humanize=0.005)
                if night:
                    for at, step, dur in events[:3]:
                        t_abs = t + at
                        if t_abs < max_beat - 0.06:
                            s.note(2, _clamp_pitch(lead_tonic + int(step) - 12, 53, 76), t_abs, _clamp_end(t_abs, 0.34, max_beat), base_vel * 0.50, humanize=0.005)
            elif pos in (4, 5, 6):
                hocket_ch = 2 if night else 4
                for idx_e, (at, step, dur) in enumerate(events):
                    t_abs = t + at + (0.25 if not night else 0.0)
                    if t_abs >= max_beat - 0.06:
                        continue
                    ref_p = lead_tonic + int(step)
                    p_h = _chord_step_above(ref_p, voicing, root, lo=60, hi=95) if (idx_e % 2 == 0) else _chord_tone_near(ref_p - 3, voicing, root, lo=57, hi=93, avoid_pitch=ref_p)
                    s.note(hocket_ch, p_h, t_abs, _clamp_end(t_abs, min(0.18 if not night else 0.36, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.66, humanize=0.005)
                if night:
                    pivot_map = {4: (0.0, 3.5), 5: (3.0,), 6: (2.5,)}
                    for pv in pivot_map[pos]:
                        s.note(4, _clamp_pitch(voicing[3] + 12, 74, 96), t + pv, _clamp_end(t + pv, min(0.55, max(0.08, bar_cap - (t + pv))), max_beat), base_vel * 0.72, humanize=0.004)
            else:
                asc = (7, 9, 11, 14, 16, 19, 21, 23) if not night else (7, 9, 11, 14, 16, 19)
                step_dt = 0.25 if not night else 0.30
                for c_i, c_s in enumerate(asc):
                    at_c = 2.0 + c_i * step_dt
                    if t + at_c < max_beat - 0.06:
                        p_c = _clamp_pitch(lead_tonic + c_s + (12 if night else 0), 62, 96)
                        s.note(4, p_c, t + at_c, _clamp_end(t + at_c, 0.20 if not night else 0.28, max_beat), base_vel * (0.72 + c_i * 0.03), humanize=0.003)

        elif sec_name == "AB":
            hocket_ch = 2 if night else 4
            _schedule_hocket_interlock(s, hocket_ch, events, lead_tonic, t, pos, sec_name, voicing, root, base_vel * 0.68, night, max_beat)
            if not night and pos % 2 == 1:
                p_top = _chord_tone_near(lead_tonic + int(events[-1][1]) + 12, voicing, root, lo=77, hi=95)
                s.note(4, p_top, t + 3.0, _clamp_end(t + 3.0, 0.28, max_beat), base_vel * 0.70, humanize=0.005)
            elif night:
                # Avoid colliding with Vibraphone Theme B's sustained tone at beat 2.0
                b_sim = [65 + int(st) for b_at, st, b_d in ab_counter_b[pos] if b_at <= 2.0 < b_at + b_d]
                canon_evs = events[1:3] if (b_sim and abs((lead_tonic + int(events[0][1]) + 12) - b_sim[0]) <= 1) else events[:3]
                _schedule_canon_echo(
                    s, 4, canon_evs, lead_tonic, t, delay=2.0,
                    vel=base_vel * 0.64, voicing=voicing, root=root, max_beat=max_beat,
                    meter=meter, octave_shift=12, dur_scale=1.10,
                )

        elif sec_name == "turn":
            if pos in (0, 1):
                _schedule_canon_echo(
                    s, 4, events[:4], lead_tonic, t, delay=2.0,
                    vel=base_vel * 0.66, voicing=voicing, root=root, max_beat=max_beat,
                    meter=meter, octave_shift=(12 if night else 0), dur_scale=0.80 if not night else 1.05,
                )
            elif pos == 2:
                hocket_ch = 2 if night else 4
                _schedule_hocket_interlock(s, hocket_ch, events, lead_tonic, t, pos, sec_name, voicing, root, base_vel * 0.60, night, max_beat)

        # ------------------------------------------------------------------
        # 3. Counter-Melody & Woodwind/Vibraphone Dialogue
        #    Day: Ch 2 Clarinet + Ch 8 Flute; Night: Ch 7 Vibraphone
        # ------------------------------------------------------------------
        counter_ch = 7 if night else 2
        counter_tonic = 65  # F4=65

        if sec_name == "intro":
            if pos >= 2:
                c1 = _chord_tone_near(counter_tonic + 7, voicing, root, lo=60, hi=82)
                c2 = _chord_tone_near(counter_tonic + 12, voicing, root, lo=62, hi=84)
                s.note(counter_ch, c1, t + 1.5, _clamp_end(t + 1.5, 0.80, max_beat), base_vel * 0.66, vib=not night)
                s.note(counter_ch, c2, t + 2.5, _clamp_end(t + 2.5, min(1.05, bar_cap - (t + 2.5)), max_beat), base_vel * 0.70, vib=not night)
                if not night and pos == 3:
                    # Clean C9 pickup (C6-D6-E6) resolving smoothly into Bar 4 downbeat
                    for f_i, f_s in enumerate((7, 9, 11)):
                        at_f = 2.75 + f_i * 0.375
                        s.note(8, 77 + f_s, t + at_f, _clamp_end(t + at_f, 0.28, max_beat), base_vel * 0.64, humanize=0.005)

        elif sec_name == "A":
            if pos % 2 == 1:
                ans_p1 = _chord_tone_near(counter_tonic + 12, voicing, root, lo=64, hi=84)
                ans_p2 = _chord_tone_near(counter_tonic + 9, voicing, root, lo=62, hi=82)
                ans_p3 = _chord_tone_near(counter_tonic + 7, voicing, root, lo=60, hi=80)
                s.note(counter_ch, ans_p1, t + 1.75, _clamp_end(t + 1.75, 0.48, max_beat), base_vel * 0.68, vib=False)
                s.note(counter_ch, ans_p2, t + 2.50, _clamp_end(t + 2.50, 0.42, max_beat), base_vel * 0.66, vib=False)
                s.note(counter_ch, ans_p3, t + 3.00, _clamp_end(t + 3.00, min(0.80, bar_cap - (t + 3.00)), max_beat), base_vel * 0.72, vib=not night)
            else:
                p_anch = _chord_tone_near(counter_tonic + 4, voicing, root, lo=58, hi=78)
                s.note(counter_ch, p_anch, t + 2.0, _clamp_end(t + 2.0, 1.35, max_beat), base_vel * 0.58, vib=not night)
            if not night and pos >= 4:
                for f_idx, at in enumerate((0.75, 2.25, 3.50)):
                    p_f = _clamp_pitch(voicing[(f_idx + pos) % 4] + 12, 74, 92)
                    s.note(8, p_f, t + at, _clamp_end(t + at, min(0.32, bar_cap - (t + at)), max_beat), base_vel * 0.56, humanize=0.005)

        elif sec_name == "Ap":
            p_a = _chord_tone_near(counter_tonic + 7, voicing, root, lo=60, hi=80)
            p_b = _chord_tone_near(counter_tonic + 11, voicing, root, lo=62, hi=82)
            s.note(counter_ch, p_a, t + 0.0, _clamp_end(t, 1.55, max_beat), base_vel * 0.62, vib=not night)
            s.note(counter_ch, p_b, t + 2.0, _clamp_end(t + 2.0, min(1.55, bar_cap - (t + 2.0)), max_beat), base_vel * 0.66, vib=not night)
            if not night:
                f_cell = (voicing[0] + 12, voicing[2] + 12, voicing[1] + 12, voicing[3] + 12, voicing[2] + 12)
                for f_k in range(4):
                    at_f = f_k * 1.0 + 0.5
                    p_fl = _clamp_pitch(f_cell[(pos * 4 + f_k) % 5], 74, 94)
                    s.note(8, p_fl, t + at_f, _clamp_end(t + at_f, min(0.34, bar_cap - (t + at_f)), max_beat), base_vel * 0.58, humanize=0.005)

        elif sec_name == "B":
            for idx_b, (at, step, dur) in enumerate(events):
                if idx_b in (0, 2, 4):
                    t_abs = t + at
                    if t_abs >= max_beat - 0.06:
                        continue
                    lead_p = lead_tonic + int(step)
                    p_harm = _chord_tone_near(counter_tonic + int(step) - 4, voicing, root, lo=57, hi=82, avoid_pitch=lead_p)
                    s.note(counter_ch, p_harm, t_abs, _clamp_end(t_abs, min(dur * 1.10, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.68, vib=not night)
            if not night and pos >= 4:
                for at, step, dur in events:
                    t_abs = t + at
                    if t_abs < max_beat - 0.06:
                        p_fl = _clamp_pitch(77 + int(step), 74, 95)
                        s.note(8, p_fl, t_abs, _clamp_end(t_abs, min(dur * 0.92, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.60, humanize=0.006, vib=True)

        elif sec_name == "C":
            if pos <= 3:
                for at, step, dur in mirror_c[pos]:
                    t_abs = t + at
                    if t_abs >= max_beat - 0.06:
                        continue
                    p_m = _clamp_pitch(counter_tonic + int(step), 58, 84)
                    s.note(counter_ch, p_m, t_abs, _clamp_end(t_abs, min(dur * (1.15 if night else 0.95), max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.80, humanize=0.005)
                if not night:
                    for at, step, dur in mirror_c[pos]:
                        t_abs = t + at
                        if t_abs < max_beat - 0.06:
                            s.note(8, _clamp_pitch(77 + int(step), 72, 95), t_abs, _clamp_end(t_abs, min(dur * 0.88, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.58, humanize=0.005)
            elif pos in (4, 5, 6):
                pivot_map = {4: (0.0, 3.5), 5: (1.5, 3.0), 6: (0.5, 2.5)}
                for idx_p, pv in enumerate(pivot_map[pos]):
                    p_c = _chord_tone_near(counter_tonic + (12 if idx_p % 2 == 0 else 7), voicing, root, lo=60, hi=84)
                    s.note(counter_ch, p_c, t + pv, _clamp_end(t + pv, min(1.05, max(0.08, bar_cap - (t + pv))), max_beat), base_vel * 0.66, vib=not night)
                if not night:
                    peak_at = {4: 1.5, 5: 1.0, 6: 0.5}[pos]
                    s.note(8, _clamp_pitch(voicing[3] + 12, 76, 94), t + peak_at, _clamp_end(t + peak_at, 0.70, max_beat), base_vel * 0.66, vib=False)

        elif sec_name == "AB":
            # GRAND DOUBLE COUNTERPOINT: Theme B sings boldly in Clarinet (Day) / Vibraphone (Night)
            # simultaneously with Theme A on Marimba/Kalimba (Ch 0)!
            b_vel = base_vel * (1.02 if not night else 1.04)
            for at, step, dur in ab_counter_b[pos]:
                t_abs = t + at
                if t_abs >= max_beat - 0.06:
                    continue
                p_b = _clamp_pitch(counter_tonic + int(step), 60, 86)
                s.note(counter_ch, p_b, t_abs, _clamp_end(t_abs, min(dur * (1.12 if night else 1.02), max(0.08, bar_cap - t_abs)), max_beat), b_vel, humanize=0.006, vib=not night)
                if not night and pos >= 4:
                    p_fl = _clamp_pitch(77 + int(step), 76, 96)
                    s.note(8, p_fl, t_abs, _clamp_end(t_abs, min(dur * 0.96, max(0.08, bar_cap - t_abs)), max_beat), base_vel * 0.66, humanize=0.006, vib=True)

        elif sec_name == "turn":
            if pos in (0, 2):
                p_c = _chord_tone_near(counter_tonic + 9, voicing, root, lo=60, hi=82)
                s.note(counter_ch, p_c, t + 1.5, _clamp_end(t + 1.5, 1.30, max_beat), base_vel * 0.62, vib=not night)
            elif pos == 1:
                p_c1 = _chord_tone_near(counter_tonic + 12, voicing, root, lo=62, hi=84)
                p_c2 = _chord_tone_near(counter_tonic + 7, voicing, root, lo=60, hi=80)
                s.note(counter_ch, p_c1, t + 2.0, _clamp_end(t + 2.0, 0.72, max_beat), base_vel * 0.62, vib=False)
                s.note(counter_ch, p_c2, t + 3.0, _clamp_end(t + 3.0, min(0.75, bar_cap - (t + 3.0)), max_beat), base_vel * 0.66, vib=not night)

        # ------------------------------------------------------------------
        # 4. Sustained Strings Pad with Clean Bar-Boundary Clearance (Ch 5)
        # ------------------------------------------------------------------
        stop_break_day = (not night) and (sec_name == "C") and (pos == 7)
        if not stop_break_day:
            if not night:
                if sec_name in ("Ap", "B", "AB", "turn") or (sec_name == "intro" and pos >= 2) or (sec_name == "C" and pos in (4, 5, 6)):
                    pad_t = max(0.0, t - 0.10)
                    pad_dur = _clamp_end(pad_t, meter - 0.14, max_beat)
                    pad_v = 40 if sec_name in ("B", "AB") else 32
                    s.note(5, voicing[0], pad_t, pad_dur, pad_v, humanize=0.004)
                    s.note(5, voicing[2], pad_t, pad_dur, pad_v * 0.88, humanize=0.004)
            else:
                pad_t = max(0.0, t - 0.16)
                pad_dur = _clamp_end(pad_t, meter - 0.16, max_beat)
                pad_v = 38 if sec_name in ("B", "AB") else 30
                s.note(5, voicing[0], pad_t, pad_dur, pad_v, humanize=0.004)
                s.note(5, voicing[2], pad_t, pad_dur, pad_v * 0.88, humanize=0.004)

        # ------------------------------------------------------------------
        # 5. Polyrhythmic & Cellular Accompaniment (Ch 1: Day Pizzicato / Night Harp)
        # ------------------------------------------------------------------
        _schedule_cellular_ostinato(
            s, 1, sec_name, pos, bar, t, voicing, root, night, max_beat, meter, cycle_state,
        )

        # ------------------------------------------------------------------
        # 6. Section-Evolving Syncopated Bass Patterns (Ch 3)
        # ------------------------------------------------------------------
        _schedule_pattern_bass(
            s, 3, sec_name, pos, sec_len, t, root, anchor5, next_root, voicing, night, is_last_bar, max_beat,
        )

        # ------------------------------------------------------------------
        # 7. Stereo Pitched Woodblocks & Glockenspiel (Day) / Music Box Polyrhythm (Night)
        # ------------------------------------------------------------------
        _schedule_stereo_chimes(
            s, 6, 7, sec_name, pos, t, voicing, root, night, max_beat, bar,
        )

        # ------------------------------------------------------------------
        # 8. Pattern-Driven Percussion (Ch 9)
        # ------------------------------------------------------------------
        _schedule_pattern_drums(s, sec_name, pos, sec_len, t, night, max_beat)

    return s
