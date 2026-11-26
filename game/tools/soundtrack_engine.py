"""Shared MIDI composition, FluidSynth rendering, and studio mastering engine."""

from concurrent.futures import ProcessPoolExecutor, as_completed
import ctypes as C
import math
import multiprocessing
import os
from pathlib import Path
import random
import subprocess
import sys

import mido
import numpy as np

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

SR = 44100
TPB = 480

ROOT = Path(__file__).resolve().parents[1]
MIDI_DIR = ROOT / "assets" / "midi"

SF_CANDIDATES = [
    os.environ.get("CORAL_SOUNDFONT", ""),
    "/home/wendy/.local/sf2/MuseScore_General.sf2",
    "/usr/share/sounds/sf2/FluidR3_GM.sf2",
]
FLUID_LOCAL_LIB = "/home/wendy/.local/fluid/usr/lib/x86_64-linux-gnu"
_FLUID_INIT_PIDS: set[int] = set()

ORDER_NOTE_OFF = 0
ORDER_CC = 1
ORDER_NOTE_ON = 2

VALID_MIDI_KEYS = frozenset(mido.midifiles.meta._key_signature_encode.keys())

_MODE_TO_MAJOR_OFFSET = {
    "ionian": 0,
    "major": 0,
    "maj": 0,
    "dorian": -2,
    "dor": -2,
    "phrygian": -4,
    "phr": -4,
    "lydian": -5,
    "lyd": -5,
    "mixolydian": 5,
    "mix": 5,
    "aeolian": 3,
    "minor": 3,
    "min": 3,
    "locrian": 1,
    "loc": 1,
}

_NOTE_TO_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4, "E#": 5, "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11, "B#": 0,
}

# Canonical major/minor key signature strings indexed by pitch class (0..11)
_SEMITONE_TO_MAJOR = {
    0: "C", 1: "Db", 2: "D", 3: "Eb", 4: "E", 5: "F",
    6: "F#", 7: "G", 8: "Ab", 9: "A", 10: "Bb", 11: "B",
}
_SEMITONE_TO_MINOR = {
    0: "Cm", 1: "C#m", 2: "Dm", 3: "Ebm", 4: "Em", 5: "Fm",
    6: "F#m", 7: "Gm", 8: "G#m", 9: "Am", 10: "Bbm", 11: "Bm",
}


def normalize_key_sig(key_sig):
    """Normalize a key or mode name (e.g. 'C Major', 'A Dorian') into a valid mido key_signature string."""
    raw = str(key_sig).strip()
    if raw in VALID_MIDI_KEYS:
        return raw

    # Handle compact forms like 'Am', 'F#m', 'Eb', 'ebm', 'eb'
    if raw:
        cand = raw[0].upper() + raw[1:]
        if cand in VALID_MIDI_KEYS:
            return cand
        if len(cand) >= 2 and cand[-1] == "m" and cand[:-1] in _NOTE_TO_SEMITONE:
            return _SEMITONE_TO_MINOR[_NOTE_TO_SEMITONE[cand[:-1]]]

    parts = raw.split()
    if len(parts) == 2:
        tonic_raw, mode_raw = parts
        tonic = tonic_raw[0].upper() + tonic_raw[1:] if tonic_raw else ""
        mode = mode_raw.lower()
        if tonic in _NOTE_TO_SEMITONE and mode in _MODE_TO_MAJOR_OFFSET:
            if mode in ("major", "maj", "ionian") and tonic in VALID_MIDI_KEYS:
                return tonic
            if mode in ("minor", "min", "aeolian") and (tonic + "m") in VALID_MIDI_KEYS:
                return tonic + "m"
            rel_major_pc = (_NOTE_TO_SEMITONE[tonic] + _MODE_TO_MAJOR_OFFSET[mode]) % 12
            if mode in ("dorian", "dor", "phrygian", "phr", "locrian", "loc", "minor", "min", "aeolian"):
                # Prefer relative minor signature (e.g. A Dorian -> 1 sharp -> "Em")
                rel_minor_pc = (rel_major_pc - 3) % 12
                return _SEMITONE_TO_MINOR[rel_minor_pc]
            return _SEMITONE_TO_MAJOR[rel_major_pc]

    raise ValueError(f"Unsupported MIDI key signature: {key_sig!r}")


def find_soundfont():
    for p in SF_CANDIDATES:
        if p and os.path.isfile(p):
            return p
    raise FileNotFoundError(
        "No SoundFont found; expected MuseScore_General.sf2 in ~/.local/sf2/ or CORAL_SOUNDFONT"
    )


def load_fluidsynth():
    """Load libfluidsynth.so.3 (preloading local deps with RTLD_GLOBAL so LD_LIBRARY_PATH is optional)."""
    _FLUID_INIT_PIDS.add(os.getpid())
    preload_error_hint = (
        "Set LD_LIBRARY_PATH=/home/wendy/.local/fluid/usr/lib/x86_64-linux-gnu:"
        "/home/wendy/.local/fluid/usr/lib/x86_64-linux-gnu/pulseaudio"
    )
    try:
        if os.path.isdir(FLUID_LOCAL_LIB):
            lib_dir = Path(FLUID_LOCAL_LIB)
            ordered_deps = [
                "libgomp.so.1",
                "libogg.so.0",
                "libvorbis.so.0",
                "libvorbisenc.so.2",
                "libFLAC.so.14",
                "libopus.so.0",
                "libmpg123.so.0",
                "libmp3lame.so.0",
                "libsndfile.so.1",
                "libasyncns.so.0",
                "libdbus-1.so.3",
            ]
            for dep in ordered_deps:
                p = lib_dir / dep
                if p.is_file():
                    C.CDLL(str(p), mode=C.RTLD_GLOBAL)
            for p in sorted((lib_dir / "pulseaudio").glob("libpulsecommon-*.so")):
                if p.is_file():
                    C.CDLL(str(p), mode=C.RTLD_GLOBAL)
            for dep in (
                "libpulse.so.0",
                "libpulse-simple.so.0",
                "libjack.so.0",
                "libpipewire-0.3.so.0",
                "libXss.so.1",
                "libdecor-0.so.0",
                "libSDL3.so.0",
                "libinstpatch-1.0.so.2",
            ):
                p = lib_dir / dep
                if p.is_file():
                    C.CDLL(str(p), mode=C.RTLD_GLOBAL)
            f = C.CDLL(str(lib_dir / "libfluidsynth.so.3"))
        else:
            f = C.CDLL("libfluidsynth.so.3")
    except OSError as exc:
        raise RuntimeError(f"Failed to load libfluidsynth.so.3 ({exc}). {preload_error_hint}") from exc

    f.new_fluid_settings.restype = C.c_void_p
    f.fluid_settings_setnum.argtypes = [C.c_void_p, C.c_char_p, C.c_double]
    f.fluid_settings_setint.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
    f.new_fluid_synth.argtypes = [C.c_void_p]
    f.new_fluid_synth.restype = C.c_void_p
    f.fluid_synth_sfload.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
    f.fluid_synth_sfload.restype = C.c_int
    f.fluid_synth_get_sfont.argtypes = [C.c_void_p, C.c_int]
    f.fluid_synth_get_sfont.restype = C.c_void_p
    f.fluid_sfont_get_id.argtypes = [C.c_void_p]
    f.fluid_sfont_get_id.restype = C.c_int
    f.fluid_synth_program_select.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_int]
    f.fluid_synth_program_select.restype = C.c_int
    f.fluid_synth_bank_select.argtypes = [C.c_void_p, C.c_int, C.c_int]
    f.fluid_synth_bank_select.restype = C.c_int
    f.fluid_synth_program_change.argtypes = [C.c_void_p, C.c_int, C.c_int]
    f.fluid_synth_program_change.restype = C.c_int
    f.fluid_synth_cc.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int]
    f.fluid_synth_cc.restype = C.c_int
    f.fluid_synth_noteon.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int]
    f.fluid_synth_noteon.restype = C.c_int
    f.fluid_synth_noteoff.argtypes = [C.c_void_p, C.c_int, C.c_int]
    f.fluid_synth_noteoff.restype = C.c_int
    f.fluid_synth_write_float.argtypes = [
        C.c_void_p, C.c_int, C.c_void_p, C.c_int, C.c_int, C.c_void_p, C.c_int, C.c_int
    ]
    f.fluid_synth_write_float.restype = C.c_int
    f.delete_fluid_synth.argtypes = [C.c_void_p]
    f.delete_fluid_settings.argtypes = [C.c_void_p]
    return f


def open_synth(f, sf_path):
    _FLUID_INIT_PIDS.add(os.getpid())
    settings = f.new_fluid_settings()
    f.fluid_settings_setnum(settings, b"synth.sample-rate", SR)
    f.fluid_settings_setnum(settings, b"synth.gain", 0.50)
    f.fluid_settings_setnum(settings, b"synth.reverb.room-size", 0.65)
    f.fluid_settings_setnum(settings, b"synth.reverb.level", 0.46)
    f.fluid_settings_setint(settings, b"synth.polyphony", 220)
    synth = f.new_fluid_synth(settings)
    if f.fluid_synth_sfload(synth, os.fsencode(sf_path), 1) < 0:
        f.delete_fluid_synth(synth)
        f.delete_fluid_settings(settings)
        raise RuntimeError(f"Cannot load SoundFont: {sf_path}")
    return synth, settings


def _clamp7(val):
    return max(0, min(127, int(round(val))))


def phrase_vel(base_vel, pos, bars_per_phrase=8, arc=0.15):
    """Shape note velocity with a smooth sinusoidal phrase arc over a multi-bar phrase."""
    return base_vel * (1.0 + arc * math.sin((pos + 0.5) / bars_per_phrase * math.pi))


class Score:
    ORDER_NOTE_OFF = ORDER_NOTE_OFF
    ORDER_CC = ORDER_CC
    ORDER_NOTE_ON = ORDER_NOTE_ON

    def __init__(self, bpm, seed, swing=0.0, beats_per_bar=4.0, time_sig=(4, 4), key_sig="C"):
        self.bpm = float(bpm)
        self.rng = random.Random(seed)
        self.swing = float(swing)
        self.beats_per_bar = float(beats_per_bar)
        self.time_sig = (int(time_sig[0]), int(time_sig[1]))
        self.key_sig = normalize_key_sig(key_sig)
        self.channels = {}
        self.ev = []

    def set_channel(self, ch, program, name, bank=0, pan=64, vol=100, rev=48, cho=16):
        ch = int(ch)
        if not 0 <= ch <= 15:
            raise ValueError(f"MIDI channel must be in 0..15, got {ch}")
        clean_name = str(name).strip() if name is not None else ""
        if not clean_name:
            clean_name = f"Channel {ch}"
        self.channels[ch] = {
            "program": _clamp7(program),
            "bank": int(bank),
            "name": clean_name,
            "pan": _clamp7(pan),
            "vol": _clamp7(vol),
            "rev": _clamp7(rev),
            "cho": _clamp7(cho),
        }

    def program(self, ch, prog, vol=80, pan=64, rev=48, cho=16, bank=0, name=None):
        self.set_channel(
            ch,
            prog,
            name or f"Channel {ch}",
            bank=bank,
            pan=pan,
            vol=vol,
            rev=rev,
            cho=cho,
        )

    def _swing_beat(self, beat):
        if not self.swing:
            return beat
        whole = math.floor(beat)
        frac = beat - whole
        if 0.40 <= frac <= 0.60:
            return whole + 0.5 + self.swing * (0.5 - abs(frac - 0.5) * 2.0)
        return beat

    def bar_beat(self, bar, offset=0.0):
        return bar * self.beats_per_bar + offset

    def clamp_dur(self, beat_in_bar, dur, margin=0.08):
        return max(0.06, min(dur, self.beats_per_bar - beat_in_bar - margin))

    def rest(self, beats):
        return float(beats)

    def note(self, ch, pitch, beat, dur, vel, humanize=0.010, vib=False, vibrato=None, pan=None):
        use_vib = vib if vibrato is None else vibrato
        swung = self._swing_beat(beat)
        if humanize:
            b0 = max(0.0, swung + self.rng.uniform(-humanize, humanize))
            v_raw = vel + self.rng.uniform(-3.0, 3.0)
        else:
            b0 = max(0.0, swung)
            v_raw = vel

        t0 = max(0, round(b0 * TPB))
        t1 = max(t0 + 24, round((b0 + max(0.06, dur)) * TPB))
        v = max(8, min(125, int(round(v_raw))))
        if ch == 9:
            p = max(0, min(127, int(pitch)))
        else:
            p = max(24, min(108, int(pitch)))

        if pan is not None:
            self.ev.append((t0, ORDER_CC, "cc", ch, 10, _clamp7(pan)))

        self.ev.append((t0, ORDER_NOTE_ON, "note_on", ch, p, v))
        self.ev.append((t1, ORDER_NOTE_OFF, "note_off", ch, p, 0))

        if use_vib and dur >= 1.1:
            self.cc(ch, 1, 0, b0)
            self.cc(ch, 1, 36, b0 + dur * 0.45)
            self.cc(ch, 1, 0, b0 + dur * 0.92)

    def drum(self, note_num, beat, vel, dur=0.10, humanize=0.006, ch=9):
        self.note(ch, note_num, beat, dur, vel, humanize=humanize, vib=False)

    add_drum_hit = drum

    def strum(self, ch, pitches, beat, dur, vel, spread=0.022, up=False, humanize=0.004):
        notes = list(reversed(pitches)) if up else list(pitches)
        for i, p in enumerate(notes):
            self.note(
                ch,
                p,
                beat + i * spread,
                max(0.08, dur - i * spread),
                vel - i * 2,
                humanize=humanize,
            )

    def gliss(self, ch, scale_notes, beat, step=0.055, dur=0.55, vel=46, vel_step=2, pan_start=None, pan_end=None):
        count = len(scale_notes)
        for i, p in enumerate(scale_notes):
            pan_val = None
            if pan_start is not None and pan_end is not None:
                frac = i / max(1, count - 1)
                pan_val = round(pan_start + (pan_end - pan_start) * frac)
            self.note(ch, p, beat + i * step, dur, vel + i * vel_step, humanize=0.003, pan=pan_val)

    def cc(self, ch, num, val, beat):
        t0 = max(0, round(max(0.0, beat) * TPB))
        self.ev.append((t0, ORDER_CC, "cc", int(ch), int(num) & 0x7F, _clamp7(val)))

    def cc_ramp(self, ch, num, val_start, val_end, beat_start, beat_end, steps=12, curve="linear"):
        steps = max(1, int(steps))
        last_val = None
        for i in range(steps + 1):
            frac = i / steps
            if curve == "sine":
                weight = 0.5 - 0.5 * math.cos(frac * math.pi)
            else:
                weight = frac
            val = _clamp7(val_start + (val_end - val_start) * weight)
            if val != last_val:
                b = beat_start + (beat_end - beat_start) * frac
                self.cc(ch, num, val, b)
                last_val = val

    def swell(self, ch, beat_start, beat_end, low=72, high=116, steps=12, cc_num=11):
        steps = max(2, int(steps))
        last_val = None
        for i in range(steps + 1):
            frac = i / steps
            val = _clamp7(low + (high - low) * math.sin(frac * math.pi))
            if val != last_val:
                b = beat_start + (beat_end - beat_start) * frac
                self.cc(ch, cc_num, val, b)
                last_val = val

    def pedal(self, ch, beat_start, beat_end, val=110):
        self.cc(ch, 64, 0, beat_start)
        self.cc(ch, 64, val, beat_start + 0.04)
        self.cc(ch, 64, 0, max(beat_start + 0.05, beat_end - 0.06))

    def save_midi(self, path, track_title=None):
        path = Path(path)
        mid = mido.MidiFile(type=1, ticks_per_beat=TPB)

        tempo_tr = mido.MidiTrack()
        num, den = self.time_sig
        clocks = 36 if (num, den) == (6, 8) else 24
        tempo_tr.append(mido.MetaMessage("track_name", name=track_title or path.stem, time=0))
        tempo_tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(self.bpm), time=0))
        tempo_tr.append(
            mido.MetaMessage(
                "time_signature",
                numerator=num,
                denominator=den,
                clocks_per_click=clocks,
                notated_32nd_notes_per_beat=8,
                time=0,
            )
        )
        tempo_tr.append(mido.MetaMessage("key_signature", key=self.key_sig, time=0))
        mid.tracks.append(tempo_tr)

        used_channels = sorted({ev[3] for ev in self.ev if ev[2] == "note_on"})
        by_ch = {ch: [] for ch in used_channels}
        for tick, order, kind, ch, a, b in sorted(self.ev, key=lambda x: (x[0], x[1])):
            if ch in by_ch:
                by_ch[ch].append((tick, order, kind, a, b))

        for ch in used_channels:
            meta = self.channels.get(
                ch,
                {"program": 0, "bank": 0, "name": f"Channel {ch}", "pan": 64, "vol": 100, "rev": 48, "cho": 16},
            )
            tr = mido.MidiTrack()
            tr.append(mido.MetaMessage("track_name", name=meta["name"], time=0))
            midi_bank = 0 if ch == 9 else (meta["bank"] & 0x7F)
            tr.append(mido.Message("control_change", channel=ch, control=0, value=midi_bank, time=0))
            tr.append(mido.Message("control_change", channel=ch, control=32, value=0, time=0))
            tr.append(mido.Message("program_change", channel=ch, program=meta["program"], time=0))
            tr.append(mido.Message("control_change", channel=ch, control=7, value=meta["vol"], time=0))
            tr.append(mido.Message("control_change", channel=ch, control=10, value=meta["pan"], time=0))
            tr.append(mido.Message("control_change", channel=ch, control=91, value=meta["rev"], time=0))
            tr.append(mido.Message("control_change", channel=ch, control=93, value=meta["cho"], time=0))

            last = 0
            for tick, _, kind, a, b in by_ch[ch]:
                dt = max(0, tick - last)
                last = tick
                if kind == "note_on":
                    tr.append(mido.Message("note_on", channel=ch, note=a, velocity=b, time=dt))
                elif kind == "note_off":
                    tr.append(mido.Message("note_off", channel=ch, note=a, velocity=0, time=dt))
                else:
                    tr.append(mido.Message("control_change", channel=ch, control=a, value=b, time=dt))
            mid.tracks.append(tr)

        path.parent.mkdir(parents=True, exist_ok=True)
        mid.save(str(path))


CH = {
    # Major-home chords (C=36 root base)
    "I": (36, (60, 64, 67, 71)),
    "Iadd9": (36, (60, 62, 64, 67)),
    "I6": (40, (60, 64, 67, 72)),      # Baseline I/3 1st-inversion voicing preserved
    "Imaj6": (36, (60, 64, 67, 69)),   # True C6
    "Imaj7": (36, (60, 64, 67, 71)),
    "Imaj9": (36, (62, 64, 67, 71)),
    "Isus2": (36, (60, 62, 67, 72)),
    "Isus4": (36, (60, 65, 67, 72)),
    "iii": (40, (59, 62, 64, 67)),
    "vi": (45, (60, 64, 67, 69)),
    "vi7": (45, (60, 64, 67, 69)),
    "vi9": (45, (60, 64, 67, 71)),
    "vi11": (45, (60, 62, 64, 67)),
    "IV": (41, (60, 64, 65, 69)),
    "IV6": (41, (60, 62, 65, 69)),
    "IVadd9": (41, (60, 65, 67, 69)),
    "IVmaj7": (41, (60, 64, 65, 69)),
    "ii": (38, (60, 62, 65, 69)),
    "ii7": (38, (60, 62, 65, 69)),
    "ii9": (38, (60, 64, 65, 69)),
    "iim7b5": (38, (60, 62, 65, 68)),
    "V": (43, (59, 62, 67, 71)),       # Fixed B3/D4/G4/B4 (removes C5/B3 clash)
    "Vsus4": (43, (60, 62, 67, 72)),
    "V7": (43, (59, 62, 65, 67)),
    "V9": (43, (59, 62, 65, 69)),
    "V13": (43, (59, 64, 65, 69)),
    "viio7": (47, (59, 62, 65, 68)),
    "viim7b5": (47, (59, 62, 65, 69)),
    "bVII": (46, (58, 62, 65, 69)),
    "bVImaj7": (44, (60, 63, 67, 68)),
    "iv": (41, (60, 65, 68, 72)),
    "iv7": (41, (60, 63, 65, 68)),
    "II": (38, (60, 62, 66, 69)),
    "V/vi": (40, (56, 59, 62, 64)),
    "V/ii": (45, (55, 61, 64, 67)),
    # Minor & Dorian-home chords (A=45 root base)
    "i": (45, (60, 64, 69, 71)),
    "i6": (45, (60, 64, 66, 69)),
    "i7": (45, (60, 64, 67, 69)),
    "i9": (45, (60, 64, 67, 71)),
    "bVI": (41, (60, 65, 69, 72)),
    "bIII": (36, (60, 64, 67, 72)),
    "bIIImaj7": (36, (60, 64, 67, 71)),
    "VII": (43, (59, 62, 67, 71)),
    "VIImaj6": (43, (59, 62, 64, 67)),
    "ivm": (38, (60, 65, 69, 74)),
    "V/i": (40, (56, 59, 62, 64)),
    "IVdor": (38, (62, 66, 69, 74)),
    "IV7dor": (38, (60, 62, 66, 69)),
    "iim_dor": (47, (59, 62, 66, 69)),
    "vm_dor": (40, (59, 62, 64, 67)),
}

SCALES = {
    "major": (0, 2, 4, 5, 7, 9, 11),
    "natural_minor": (0, 2, 3, 5, 7, 8, 10),
    "harmonic_minor": (0, 2, 3, 5, 7, 8, 11),
    "dorian": (0, 2, 3, 5, 7, 9, 10),
    "lydian": (0, 2, 4, 6, 7, 9, 11),
    "mixolydian": (0, 2, 4, 5, 7, 9, 10),
    "pent_major": (0, 2, 4, 7, 9),
    "pent_minor": (0, 3, 5, 7, 10),
}

_CHORD_INTERVALS = {
    "maj": (0, 4, 7, 12),
    "min": (0, 3, 7, 12),
    "7": (0, 4, 7, 10),
    "maj7": (0, 4, 7, 11),
    "m7": (0, 3, 7, 10),
    "6": (0, 4, 7, 9),
    "m6": (0, 3, 7, 9),
    "sus2": (0, 2, 7, 12),
    "sus4": (0, 5, 7, 12),
    "dim": (0, 3, 6, 12),
    "dim7": (0, 3, 6, 9),
    "m7b5": (0, 3, 6, 10),
    "add9": (0, 4, 7, 14),
    "9": (0, 4, 10, 14),
    "m9": (0, 3, 10, 14),
}


def scale_pitch(tonic, scale_name, degree):
    """Return MIDI pitch for a scale degree (supports negative and multi-octave degrees)."""
    intervals = SCALES[scale_name]
    n = len(intervals)
    octaves, idx = divmod(int(degree), n)
    return int(tonic) + octaves * 12 + intervals[idx]


def make_chord(root_midi, quality="maj", bass_midi=None, voice_oct=4):
    """Build a (bass_root, voicing_tuple) pair compatible with Score & chord_pitch()."""
    pc = int(root_midi) % 12
    bass = int(bass_midi) if bass_midi is not None else (36 + pc)
    v_base = 12 * (int(voice_oct) + 1) + pc
    intervals = _CHORD_INTERVALS[quality]
    return bass, tuple(v_base + iv for iv in intervals)


def chord_pitch(expected, voicing, root, strong=True):
    if not strong:
        return expected
    pcs = {p % 12 for p in voicing} | {root % 12}
    return min(
        (p for p in range(expected - 4, expected + 5) if p % 12 in pcs),
        key=lambda p: (abs(p - expected), p < expected),
    )


def voice_lead(prev_voicing, target_voicing):
    """Wrap target_voicing notes into octaves closest to prev_voicing's centroid."""
    if not prev_voicing:
        return tuple(target_voicing)
    center = sum(prev_voicing) / len(prev_voicing)
    led = []
    for p in target_voicing:
        pc = p % 12
        candidates = [pc + 12 * oct_n for oct_n in range(3, 8)]
        best = min(candidates, key=lambda c: abs(c - center))
        led.append(best)
    return tuple(sorted(led))


def ph(text):
    """Parse bar-separated 'beat,step,dur ... | ...' phrase strings."""
    bars = []
    for bar in text.split("|"):
        bars.append([tuple(float(x) for x in ev.split(",")) for ev in bar.split()])
    return bars


def render_mp3(score, total_beats, out_mp3, f, synth):
    out_mp3 = Path(out_mp3)
    out_mp3.parent.mkdir(parents=True, exist_ok=True)

    sfont_ptr = f.fluid_synth_get_sfont(synth, 0)
    if not sfont_ptr:
        raise RuntimeError("No SoundFont loaded in FluidSynth instance")
    sf_id = f.fluid_sfont_get_id(sfont_ptr)

    used_channels = sorted({ev[3] for ev in score.ev if ev[2] == "note_on"})
    for ch in used_channels:
        meta = score.channels.get(
            ch,
            {"program": 0, "bank": 0, "name": f"Channel {ch}", "pan": 64, "vol": 100, "rev": 48, "cho": 16},
        )
        sf_bank = 128 if ch == 9 else meta["bank"]
        rc = f.fluid_synth_program_select(synth, ch, sf_id, sf_bank, meta["program"])
        if rc != 0:
            raise RuntimeError(
                f"Preset {sf_bank}:{meta['program']} not found in SoundFont for channel {ch} ({meta['name']})"
            )
        for cc_num, val in ((7, meta["vol"]), (10, meta["pan"]), (91, meta["rev"]), (93, meta["cho"])):
            f.fluid_synth_cc(synth, ch, cc_num, val)

    length = round(total_beats * 60.0 / score.bpm * SR)
    tail = 4 * SR
    stereo = np.empty((length + tail, 2), dtype=np.float32)

    def block(start, stop):
        while start < stop:
            n = min(8192, stop - start)
            left = np.empty(n, dtype=np.float32)
            right = np.empty(n, dtype=np.float32)
            f.fluid_synth_write_float(synth, n, left.ctypes.data, 0, 1, right.ctypes.data, 0, 1)
            stereo[start:start + n, 0] = left
            stereo[start:start + n, 1] = right
            start += n

    at = 0
    for tick, _order, kind, ch, a, b in sorted(score.ev, key=lambda x: (x[0], x[1])):
        sample = min(length, max(at, round(tick / TPB * 60.0 / score.bpm * SR)))
        block(at, sample)
        at = sample
        if kind == "note_on":
            f.fluid_synth_noteon(synth, ch, a, b)
        elif kind == "note_off":
            f.fluid_synth_noteoff(synth, ch, a)
        else:
            f.fluid_synth_cc(synth, ch, a, b)

    block(at, length + tail)
    wrap = min(tail, length)
    stereo[:wrap] += stereo[length:length + wrap]

    edge = min(256, max(1, length // 4))
    ramp = np.sin(np.linspace(0, math.pi / 2, edge, dtype=np.float32))
    stereo[:edge] *= ramp[:, None]
    stereo[length - edge:length] *= ramp[::-1, None]

    body = stereo[:length]
    peak = float(np.max(np.abs(body)))
    rms = float(np.sqrt(np.mean(body ** 2)))
    peak_db = 20.0 * math.log10(max(1e-6, peak))
    rms_db = 20.0 * math.log10(max(1e-6, rms))
    if peak_db >= 0.0:
        raise RuntimeError(f"Digital clipping detected on {out_mp3.name}: peak={peak_db:.2f} dBFS")

    raw = out_mp3.with_name(f".{out_mp3.stem}.{os.getpid()}.f32")
    af = (
        "highpass=f=32,"
        "lowshelf=f=150:g=1.4,"
        "highshelf=f=6800:g=-1.8,"
        "stereotools=mlev=1:slev=1.12,"
        "acompressor=threshold=-16dB:ratio=2.0:attack=18:release=200,"
        "loudnorm=I=-21:TP=-1.5:LRA=9"
    )
    try:
        body.tofile(raw)
        subprocess.run(
            [
                FFMPEG_EXE, "-nostdin", "-y", "-loglevel", "error",
                "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(raw),
                "-af", af, "-ar", str(SR), "-b:a", "128k", str(out_mp3),
            ],
            stdin=subprocess.DEVNULL,
            check=True,
        )
    finally:
        raw.unlink(missing_ok=True)

    if not out_mp3.is_file() or out_mp3.stat().st_size <= 0:
        raise RuntimeError(f"ffmpeg did not produce a non-empty MP3 file: {out_mp3}")

    return peak_db, rms_db


def render_track(track_spec, builder_fn, out_dir, midi_dir, midi_only=False, sf_path=None):
    name = track_spec["name"]
    total_beats = float(track_spec["bars"]) * float(track_spec["beats_per_bar"])
    engine_mod = sys.modules[__name__]
    built = builder_fn(name, engine_mod)
    if isinstance(built, tuple):
        score, total_beats = built
    else:
        score = built

    mpath = Path(midi_dir) / f"{name}.mid"
    score.save_midi(mpath, track_title=track_spec.get("title", name))
    dur_s = round(total_beats * 60.0 / score.bpm, 1)

    if midi_only:
        return {
            "name": name,
            "midi_path": str(mpath),
            "mp3_path": None,
            "dur_s": dur_s,
            "size_kb": 0,
            "peak_db": None,
            "rms_db": None,
        }

    sf = sf_path or find_soundfont()
    f = load_fluidsynth()
    synth, settings = open_synth(f, sf)
    try:
        mp3 = Path(out_dir) / f"{name}.mp3"
        peak_db, rms_db = render_mp3(score, total_beats, mp3, f, synth)
        size_kb = mp3.stat().st_size // 1024
        return {
            "name": name,
            "midi_path": str(mpath),
            "mp3_path": str(mp3),
            "dur_s": dur_s,
            "size_kb": size_kb,
            "peak_db": peak_db,
            "rms_db": rms_db,
        }
    finally:
        f.delete_fluid_synth(synth)
        f.delete_fluid_settings(settings)


def _worker_render(args):
    track_spec, builder_fn, out_dir, midi_dir, midi_only, sf_path = args
    return render_track(
        track_spec,
        builder_fn,
        out_dir,
        midi_dir,
        midi_only=midi_only,
        sf_path=sf_path,
    )


def render_tracks_parallel(jobs, workers=None, midi_only=False, sf_path=None):
    """Render (track_spec, builder_fn, out_dir, midi_dir) jobs concurrently via fork-safe worker processes."""
    job_list = list(jobs)
    if not job_list:
        return []

    if sf_path is None and not midi_only:
        sf_path = find_soundfont()

    max_workers = max(1, min(len(job_list), workers if workers is not None else (os.cpu_count() or 4)))
    if max_workers == 1 or len(job_list) <= 1:
        results = []
        for item in job_list:
            track_spec, builder_fn, out_dir, midi_dir = item
            try:
                results.append(
                    render_track(
                        track_spec,
                        builder_fn,
                        out_dir,
                        midi_dir,
                        midi_only=midi_only,
                        sf_path=sf_path,
                    )
                )
            except Exception as exc:
                raise RuntimeError(f"Track {track_spec['name']} failed: {exc}") from exc
        return results

    methods = multiprocessing.get_all_start_methods()
    if os.getpid() in _FLUID_INIT_PIDS or "fork" not in methods:
        mp_ctx = multiprocessing.get_context("spawn") if "spawn" in methods else multiprocessing.get_context()
    else:
        mp_ctx = multiprocessing.get_context("fork")

    results = [None] * len(job_list)
    with ProcessPoolExecutor(max_workers=max_workers, mp_context=mp_ctx) as pool:
        future_to_idx = {}
        for idx, (track_spec, builder_fn, out_dir, midi_dir) in enumerate(job_list):
            fut = pool.submit(
                _worker_render,
                (track_spec, builder_fn, out_dir, midi_dir, midi_only, sf_path),
            )
            future_to_idx[fut] = (idx, track_spec["name"])

        for fut in as_completed(future_to_idx):
            idx, name = future_to_idx[fut]
            try:
                results[idx] = fut.result()
            except Exception as exc:
                raise RuntimeError(f"Track {name} failed: {exc}") from exc

    return results
