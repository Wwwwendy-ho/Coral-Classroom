"""Seven original Coral Cove region loops, rendered with sampled FluidR3 instruments.

Usage: python3 tools/compose_regions.py [output directory] [region ...]
FluidR3_GM.sf2 may be supplied with CORAL_SOUNDFONT. Otherwise the standard
system path is used (or the local work copy when available). Requires mido,
numpy, libfluidsynth and ffmpeg. No downloaded music or generated voices are used.
"""
import ctypes as C
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from compose_music import Song, SR, TPB

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
SYSTEM_SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
WORK_SF = '/workspace/work/fluid-soundfont/usr/share/sounds/sf2/FluidR3_GM.sf2'
SF = os.environ.get('CORAL_SOUNDFONT') or (SYSTEM_SF if os.path.isfile(SYSTEM_SF) else WORK_SF)


def fluid():
    if not os.path.isfile(SF):
        raise FileNotFoundError('FluidR3_GM.sf2 is required. Install the free fluid-soundfont-gm package '
                                'or set CORAL_SOUNDFONT to the file path.')
    f = C.CDLL('libfluidsynth.so.3')
    f.new_fluid_settings.restype = C.c_void_p
    f.fluid_settings_setnum.argtypes = [C.c_void_p, C.c_char_p, C.c_double]
    f.fluid_settings_setint.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
    f.new_fluid_synth.argtypes = [C.c_void_p]
    f.new_fluid_synth.restype = C.c_void_p
    f.fluid_synth_sfload.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
    f.fluid_synth_program_change.argtypes = [C.c_void_p, C.c_int, C.c_int]
    f.fluid_synth_cc.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int]
    f.fluid_synth_noteon.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int]
    f.fluid_synth_noteoff.argtypes = [C.c_void_p, C.c_int, C.c_int]
    f.fluid_synth_write_float.argtypes = [C.c_void_p, C.c_int, C.c_void_p, C.c_int, C.c_int,
                                          C.c_void_p, C.c_int, C.c_int]
    f.delete_fluid_synth.argtypes = [C.c_void_p]
    f.delete_fluid_settings.argtypes = [C.c_void_p]
    settings = f.new_fluid_settings()
    f.fluid_settings_setnum(settings, b'synth.sample-rate', SR)
    f.fluid_settings_setnum(settings, b'synth.gain', .55)
    f.fluid_settings_setnum(settings, b'synth.reverb.room-size', .65)
    f.fluid_settings_setnum(settings, b'synth.reverb.level', .55)
    f.fluid_settings_setint(settings, b'synth.polyphony', 128)
    synth = f.new_fluid_synth(settings)
    if f.fluid_synth_sfload(synth, os.fsencode(SF), 1) < 0:
        raise RuntimeError('Cannot load FluidR3 soundfont: ' + SF)
    return f, synth, settings


def render(song, beats, path, synth_api):
    f, synth, _ = synth_api
    for ch, (prog, vol, pan, rev, bank) in song.programs.items():
        f.fluid_synth_program_change(synth, ch, prog)
        for cc, value in ((7, vol), (10, pan), (91, rev), (93, 16)):
            f.fluid_synth_cc(synth, ch, cc, value)
    # Work at exact sample boundaries. The final reverb tail is folded onto the
    # opening, so an audio element's native loop has no empty gap.
    length = round(beats * 60 / song.bpm * SR)
    tail = 4 * SR
    stereo = np.empty((length + tail, 2), dtype=np.float32)
    def block(start, stop):
        while start < stop:
            n = min(8192, stop - start)
            left = np.empty(n, dtype=np.float32)
            right = np.empty(n, dtype=np.float32)
            f.fluid_synth_write_float(synth, n, left.ctypes.data, 0, 1, right.ctypes.data, 0, 1)
            stereo[start:start+n, 0] = left
            stereo[start:start+n, 1] = right
            start += n
    at = 0
    for tick, order, msg in sorted(song.ev, key=lambda e: (e[0], e[1])):
        sample = min(length, max(at, round(tick / TPB * 60 / song.bpm * SR)))
        block(at, sample)
        at = sample
        if msg.type == 'note_on':
            f.fluid_synth_noteon(synth, msg.channel, msg.note, msg.velocity)
        else:
            f.fluid_synth_noteoff(synth, msg.channel, msg.note)
    block(at, length + tail)
    stereo[:tail] += stereo[length:]
    # A very short fade at both sample edges removes an MP3 decoder's tiny
    # discontinuity without inserting silence between repetitions.
    edge = 256
    ramp = np.sin(np.linspace(0, np.pi/2, edge, dtype=np.float32))
    stereo[:edge] *= ramp[:, None]
    stereo[length-edge:length] *= ramp[::-1, None]
    raw = path.with_suffix('.f32')
    stereo[:length].tofile(raw)
    af = 'highshelf=f=5400:g=-3,lowpass=f=13500,lowshelf=f=170:g=1.2,loudnorm=I=-23:TP=-3:LRA=8'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
                    '-af', af, '-ar', str(SR), '-b:a', '128k', str(path)], check=True)
    raw.unlink()


# Roots and close-voiced chords in C, transposed to each region's home key.
CH = {
    'I': (36, [60, 64, 67, 71]), 'iii': (40, [59, 64, 67, 72]),
    'vi': (45, [60, 64, 69, 72]), 'IV': (41, [60, 65, 69, 72]),
    'ii': (38, [60, 65, 69, 74]), 'V': (43, [59, 62, 67, 72]),
    'I6': (40, [60, 64, 67, 72]), 'V7': (43, [59, 62, 65, 69]),
    'bVII': (46, [58, 62, 65, 69]), 'iv': (41, [60, 65, 68, 72]),
}
MAJOR = ['I', 'V', 'vi', 'IV', 'ii', 'V', 'I6', 'V7']
WANDER = ['I', 'iii', 'IV', 'I6', 'vi', 'ii', 'V', 'V7']
MINOR = ['vi', 'IV', 'I', 'V', 'vi', 'iv', 'V', 'V7']
SHORE = ['I', 'vi', 'IV', 'V', 'I6', 'ii', 'IV', 'V7']
SAIL = ['I', 'IV', 'I', 'V', 'vi', 'bVII', 'V', 'V7']


def note(s, ch, pitch, beat, dur, vel):
    s.note(ch, pitch, beat, dur, vel)


def theme(s, ch, bar, tonic, meter, kind, section):
    """A shared four-note rise, answered differently in each place and section."""
    t = bar * meter
    phrases = {
        'town': [[(0, 0, .6), (1, 2, .6), (2, 4, .8), (3, 7, .8)], [(0, 9, .8), (2, 7, .6), (3, 4, .8)],
                 [(0, 2, .7), (1, 4, .7), (2, 7, .7), (3, 9, .6)], [(0, 7, .7), (2, 4, .7), (3, 2, .7)]],
        'lagoon': [[(0, 0, 1.3), (1.5, 2, 1.1), (3, 4, .8)], [(0, 7, 1.5), (2, 4, 1), (3, 2, .8)],
                   [(0, 4, 1.2), (1.5, 7, 1.1), (3, 9, .8)], [(0, 7, 1), (2, 2, 1), (3, 0, .8)]],
        'caves': [[(0, 0, .8), (1.5, 2, .8), (3, 3, .8)], [(0, 7, 1), (2, 3, .7), (3, 2, .5)],
                  [(0, 3, .8), (1.5, 7, .8), (3, 10, .8)], [(0, 7, 1), (2.5, 3, .7)]],
        'patterns': [[(0, 0, .4), (.75, 2, .4), (1.5, 4, .4), (2.5, 7, .8)], [(0, 9, .6), (1.5, 7, .6), (3, 4, .6)],
                     [(0, 4, .5), (1, 7, .5), (2, 9, .5), (3, 7, .5)], [(0, 4, .6), (2, 2, .5), (3, 0, .5)]],
        'beach': [[(0, 0, 1), (1.5, 2, .7), (2.5, 4, .9)], [(0, 7, 1), (2, 9, .6), (3, 7, .8)],
                  [(0, 4, 1), (1.5, 2, .7), (3, 0, .7)], [(0, 2, 1), (2, 4, .8), (3, 0, .8)]],
        'light': [[(0, 0, .8), (1, 2, .8), (2, 4, .8)], [(0, 7, 1.3), (2, 4, .8)],
                  [(0, 4, .8), (1, 7, .8), (2, 9, .8)], [(0, 7, 1.2), (2, 0, .8)]],
        'captain': [[(0, 0, .45), (.75, 2, .45), (1.5, 4, .45), (2.5, 7, .8)], [(0, 9, .75), (1.5, 7, .5), (2.5, 4, .5), (3.5, 2, .4)],
                    [(0, 4, .5), (1, 7, .5), (2, 9, .5), (3, 12, .6)], [(0, 9, .8), (1.5, 7, .5), (3, 0, .8)]],
    }
    p = phrases[kind][bar % 4]
    if section == 1 and bar % 4 == 0:
        p = [(at, step + 12, dur) for at, step, dur in p]
    if section == 2 and bar % 4 == 2:
        p = [(at, step - 5 if step >= 7 else step, dur) for at, step, dur in p]
    for at, step, dur in p:
        note(s, ch, tonic + step, t + at, dur, 47 if kind in ('lagoon', 'light', 'caves') else 55)


def compose(kind):
    specs = {
        # bpm, bars, beats/bar, tonic C offset, soundfont programs, harmony
        'town': (106, 24, 4, 7, (21, 24, 73, 32, 11), MAJOR),
        'lagoon': (84, 20, 4, 2, (73, 46, 48, 35, 9), WANDER),
        'caves': (80, 20, 4, 0, (12, 11, 88, 35, 10), MINOR),
        'patterns': (108, 24, 4, 5, (12, 45, 48, 32, 11), WANDER),
        'beach': (88, 20, 4, 0, (114, 24, 46, 35, 12), SHORE),
        'light': (96, 32, 3, 3, (0, 73, 89, 35, 10), WANDER),
        'captain': (114, 24, 4, 10, (71, 21, 40, 32, 44), SAIL),
    }
    bpm, bars, meter, shift, (lead, chord, arp, bass, accent), harmony = specs[kind]
    s = Song(bpm, 200 + list(specs).index(kind))
    for ch, prog, vol, pan, rev in ((0, lead, 84, 62, 58), (1, chord, 68, 44, 50),
                                      (2, arp, 62, 83, 68), (3, bass, 76, 64, 35),
                                      (4, accent, 54, 76, 72)):
        s.program(ch, prog, vol, pan, rev)
    if kind in ('town', 'patterns', 'beach', 'captain'):
        s.program(9, 40, 53, 64, 28)
    for b in range(bars):
        sec = b // 8
        symbol = harmony[b % 8]
        root, voicing = CH[symbol]
        root += shift
        voicing = [p + shift for p in voicing]
        t = b * meter
        if kind == 'caves':
            note(s, 3, root, t, 3.6, 52)
            for i, p in enumerate((voicing[0], voicing[2], voicing[1], voicing[3])):
                note(s, 1, p, t + i, .7, 39)
            if b % 2 == 0:
                note(s, 2, voicing[2]+12, t+2.5, 1.4, 29)
            if b % 4 == 3: note(s, 4, voicing[-1]+12, t+3, .65, 35)
        elif kind == 'lagoon':
            note(s, 3, root, t, 3.8, 47)
            for i, p in enumerate((voicing[0], voicing[1], voicing[2], voicing[3], voicing[2], voicing[1], voicing[0], voicing[1])):
                note(s, 1, p+12, t+i*.5, .8, 40 if i % 2 == 0 else 32)
            if b % 2 == 0:
                note(s, 2, voicing[1], t, 3.8, 27)
            if b % 4 == 3: note(s, 4, voicing[-1]+12, t+3, 1, 27)
        elif kind == 'light':
            note(s, 3, root, t, 2.7, 43)
            for i, p in enumerate((voicing[0], voicing[2], voicing[1], voicing[3], voicing[2], voicing[1])):
                note(s, 2, p+12, t+i*.5, .6, 29 if i % 3 else 37)
            for p in voicing[1:]: note(s, 1, p, t, 2.8, 31)
            if b % 4 == 3: note(s, 4, voicing[-1]+12, t+2, .8, 28)
        else:
            note(s, 3, root, t, .9, 55)
            note(s, 3, root+7, t+2, .8, 46)
            if kind in ('town', 'captain'):
                note(s, 3, root, t+3.55, .35, 35)
            for off in ((.5, 1.5, 2.5, 3.5) if kind != 'beach' else (0, 1.5, 3)):
                for i, p in enumerate(voicing[:3]):
                    note(s, 1, p, t+off+i*.017, .32 if kind != 'beach' else .7, 32 if kind == 'beach' else 39)
            if kind == 'patterns':
                for i, p in enumerate((voicing[0], voicing[2], voicing[1], voicing[3])):
                    note(s, 2, p+12, t+i+.25, .55, 35)
            elif kind == 'beach':
                for i, p in enumerate((voicing[2], voicing[1], voicing[0])):
                    note(s, 2, p+12, t+i*1.25+.35, .8, 33)
            else:
                for off in (0, 2): note(s, 2, voicing[2]+12, t+off, .38, 35)
            if b % 4 == 3: note(s, 4, voicing[-1]+12, t+3, .65, 32)
            for off, pitch, vel in ((0, 36, 43), (1, 38, 28), (2, 36, 30), (3, 38, 32)):
                note(s, 9, pitch, t+off, .12, vel if kind != 'beach' else vel-10)
            if kind != 'beach':
                for i in range(8): note(s, 9, 42, t+i*.5, .09, 14 if i % 2 else 21)
            else:
                for i in (1, 3, 5, 7): note(s, 9, 70, t+i*.5, .08, 15)
        if b % 8 != 7 or sec == 2:
            theme(s, 0, b, 72+shift if kind != 'caves' else 69, meter, kind, sec)
    return s, bars * meter


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    api = fluid()
    try:
        for region in ('town', 'lagoon', 'caves', 'patterns', 'beach', 'light', 'captain'):
            if len(sys.argv) > 2 and region not in sys.argv[2:]:
                continue
            song, beats = compose(region)
            path = OUT / ('region-' + region + '-song.mp3')
            render(song, beats, path, api)
            print(region, round(beats * 60 / song.bpm, 1), 'seconds', path.stat().st_size, 'bytes', flush=True)
    finally:
        api[0].delete_fluid_synth(api[1])
        api[0].delete_fluid_settings(api[2])
