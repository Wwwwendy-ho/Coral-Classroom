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


# All pitches are written in C and transposed into the seven home keys. The
# added dominants belong to short bridge/cadence passages, never to a random
# accompaniment layer. Bass roots also describe inversions when appropriate.
CH = {
    'I': (36, (60, 64, 67, 71)), 'I6': (40, (60, 64, 67, 72)),
    'iii': (40, (59, 62, 64, 67)), 'vi': (45, (60, 64, 67, 69)),
    'IV': (41, (60, 64, 65, 69)), 'ii': (38, (60, 65, 69, 74)),
    'V': (43, (59, 62, 67, 72)), 'V7': (43, (59, 62, 65, 67)),
    'bVII': (46, (58, 62, 65, 69)), 'iv': (41, (60, 65, 68, 72)),
    'II': (38, (60, 62, 66, 69)), 'V/vi': (40, (56, 59, 62, 64)),
    'V/ii': (45, (55, 61, 64, 67)),
    # A minor is the Caves home key, with its raised leading tone at cadences.
    'i': (45, (60, 64, 69, 71)), 'bVI': (41, (60, 65, 69, 72)),
    'bIII': (36, (60, 64, 67, 72)), 'VII': (43, (59, 62, 67, 71)),
    'ivm': (38, (60, 65, 69, 74)), 'V/i': (40, (56, 59, 62, 64)),
}


def phrase(text):
    """Eight bars; each note is beat, semitones above home tonic, duration."""
    bars = []
    for bar in text.split('|'):
        bars.append([tuple(float(x) for x in event.split(',')) for event in bar.split()])
    assert len(bars) == 8
    return bars


# The opening two bars are each region's recognizable call. Bars 3-4 develop
# it; 5-6 answer it; 7-8 make a breath and cadence. B has its own melody.
MELODIES = {
    'town': (
        phrase('0,0,.65 1,2,.65 2,4,.75 3,7,.7 | 0,9,.75 1.5,7,.4 2,4,.75 3,2,.65 | '
               '0,4,.75 1,7,.7 2,9,.6 3,7,.7 | 0,4,1 1.5,2,.55 2.5,0,.9 | '
               '0,2,.7 1,4,.7 2,7,.85 3,9,.6 | 0,12,.9 1.5,9,.55 2.5,7,.9 | '
               '0,7,.75 1,4,.55 2,2,.8 | 0,7,.7 1,9,.55 2,11,.8'),
        phrase('0,9,1 1.5,12,.6 2.5,9,.9 | 0,7,.8 1,4,.65 2,2,.9 | '
               '0,5,.7 1,9,.7 2,12,1 | 0,11,1 1.5,8,.6 2.5,7,.85 | '
               '0,4,.7 1,7,.7 2,9,.75 3,12,.55 | 0,9,1 1.5,7,.65 2.5,5,.9 | '
               '0,4,.8 1,2,.75 2,0,1 | 0,2,.6 1,5,.6 2,7,.8')
    ),
    'lagoon': (
        phrase('0,0,1.25 1.5,2,1.1 3,4,.75 | 0,7,1.3 1.75,4,.75 2.75,2,.9 | '
               '0,4,1.4 1.75,7,.9 3,9,.75 | 0,7,1 1.5,4,1.25 3,2,.7 | '
               '0,2,1.3 1.75,4,.8 2.75,7,.9 | 0,9,1.1 1.5,12,1.2 | '
               '0,9,1 1.75,7,.8 2.75,4,.9 | 0,2,1.1 1.5,5,.8 2.75,7,.9'),
        phrase('0,12,1.4 1.75,9,.9 | 0,7,1 1.5,4,1.15 3,2,.7 | '
               '0,5,1.25 1.75,9,.9 3,12,.7 | 0,11,1.5 2,9,1.15 | '
               '0,7,1.2 1.75,5,.8 2.75,4,.9 | 0,2,1.1 1.5,5,1.3 | '
               '0,7,1.1 1.5,10,.8 2.75,9,.9 | 0,7,1 1.5,5,.8 2.75,2,.9')
    ),
    'caves': (
        phrase('0,0,1 1.5,3,.75 2.75,5,.8 | 0,7,1.3 2,5,.8 3,3,.7 | '
               '0,3,1.1 1.5,7,.8 2.75,10,.8 | 0,7,1.2 2,5,.7 3,2,.65 | '
               '0,5,1 1.5,3,.8 2.75,0,.8 | 0,3,1.25 2,7,.9 | '
               '0,8,1 1.5,11,.8 3,8,.7 | 0,7,1.2 2,3,.9'),
        phrase('0,12,1.25 1.75,10,.8 2.75,7,.9 | 0,7,1.2 2,3,.85 | '
               '0,5,1 1.5,8,.8 3,10,.7 | 0,12,1.25 2,7,.9 | '
               '0,10,1.15 1.75,7,.75 2.75,5,.8 | 0,3,1.3 2,5,.9 | '
               '0,8,1 1.5,11,.85 2.75,12,.8 | 0,11,1.1 2,8,.9')
    ),
    'patterns': (
        phrase('0,0,.45 .75,2,.45 1.5,4,.5 2.5,7,.8 | 0,9,.8 1.5,7,.6 2.75,4,.8 | '
               '0,4,.5 1,7,.5 2,9,.55 3,7,.65 | 0,4,.8 1.5,2,.55 2.5,0,.9 | '
               '0,2,.5 .75,4,.5 1.5,7,.55 2.5,9,.8 | 0,12,.85 1.5,9,.55 2.75,7,.75 | '
               '0,9,.55 1,7,.55 2,4,.75 | 0,2,.65 1,5,.6 2,7,.8'),
        phrase('0,9,.6 .75,12,.55 1.75,9,.65 2.75,7,.7 | 0,4,.75 1.5,2,.6 2.75,0,.7 | '
               '0,5,.55 1,9,.55 2,12,.8 | 0,11,.85 1.5,9,.6 2.75,7,.8 | '
               '0,4,.5 .75,7,.5 1.5,9,.55 2.5,12,.8 | 0,9,.9 1.5,7,.55 2.75,5,.75 | '
               '0,4,.65 1,2,.65 2,0,.85 | 0,2,.6 1,5,.6 2,7,.8')
    ),
    'beach': (
        phrase('0,0,1.15 1.5,2,.8 2.75,4,.85 | 0,7,1.1 1.75,9,.75 2.75,7,.85 | '
               '0,4,1.15 1.5,2,.8 2.75,0,.85 | 0,2,1.1 1.75,4,.75 2.75,7,.85 | '
               '0,9,1.25 1.75,7,.75 2.75,4,.8 | 0,5,1 1.5,7,.75 2.75,9,.85 | '
               '0,7,1.1 1.75,4,.75 | 0,2,1.1 1.5,5,.8 2.75,7,.8'),
        phrase('0,12,1.2 1.75,9,.8 2.75,7,.8 | 0,4,1.1 1.5,7,.85 2.75,9,.75 | '
               '0,5,1.15 1.75,9,.75 2.75,12,.8 | 0,11,1.2 2,8,.9 | '
               '0,7,1.2 1.75,4,.75 2.75,2,.8 | 0,5,1.1 1.5,7,.85 2.75,9,.75 | '
               '0,12,1.1 1.75,9,.8 | 0,7,1.2 1.75,5,.75 2.75,2,.8')
    ),
    'light': (
        phrase('0,0,.8 1,2,.8 2,4,.8 | 0,7,1.25 1.75,4,.9 | '
               '0,4,.8 1,7,.8 2,9,.8 | 0,7,1.15 1.75,2,.9 | '
               '0,2,.8 1,4,.8 2,7,.8 | 0,9,1.2 1.75,12,.9 | '
               '0,9,.85 1,7,.85 | 0,4,.8 1,5,.8 2,7,.8'),
        phrase('0,12,1.2 1.75,9,.9 | 0,7,.8 1,5,.8 2,4,.8 | '
               '0,5,.8 1,9,.8 2,12,.8 | 0,11,1.2 1.75,9,.9 | '
               '0,7,.8 1,5,.8 2,4,.8 | 0,2,1.2 1.75,5,.9 | '
               '0,7,.8 1,9,.8 | 0,5,.8 1,2,.8 2,7,.8')
    ),
    'captain': (
        phrase('0,0,.5 .75,2,.5 1.5,4,.5 2.5,7,.8 | 0,9,.85 1.5,7,.55 2.5,4,.8 | '
               '0,4,.55 1,7,.55 2,9,.55 3,12,.65 | 0,9,.85 1.5,7,.55 2.75,2,.8 | '
               '0,4,.5 .75,7,.5 1.5,9,.55 2.5,12,.8 | 0,10,.85 1.5,9,.55 2.75,7,.8 | '
               '0,7,.55 1,4,.55 2,2,.8 | 0,2,.6 1,5,.6 2,7,.8'),
        phrase('0,12,.85 1.5,9,.55 2.75,7,.8 | 0,5,.6 1,9,.55 2,12,.8 | '
               '0,11,.9 1.5,9,.55 2.75,7,.8 | 0,4,.6 1,7,.55 2,9,.85 | '
               '0,12,.55 .75,9,.55 1.5,7,.55 2.5,4,.8 | 0,5,.85 1.5,7,.55 2.75,9,.8 | '
               '0,10,.8 1.5,7,.55 2.75,5,.8 | 0,2,.65 1,5,.6 2,7,.8')
    ),
}


# A, A' (new answer/cadence), B, A'' (opening returns). Each segment is
# eight bars so melodies and harmony both have room to resolve.
HARMONY = {
    'town': ('I V/vi vi IV ii V I6 V7', 'I iii IV I6 vi II V V7',
             'vi iii IV iv I6 V/ii ii V7', 'I V/vi vi IV ii V I V7'),
    'lagoon': ('I iii IV I6 vi ii V V7', 'I iii vi IV ii V I6 V7',
               'vi V/vi vi IV ii V bVII V7', 'I iii IV I6 vi ii V V7'),
    'caves': ('i bVI bIII VII ivm i V/i V/i', 'i bVI ivm VII bIII ivm V/i V/i',
              'bVI bIII ivm i bVI ivm V/i V/i', 'i bVI bIII VII ivm i V/i V/i'),
    'patterns': ('I iii IV I6 vi ii V V7', 'I V/vi vi IV ii II V V7',
                 'vi IV II V I6 iii ii V7', 'I iii IV I6 vi ii V V7'),
    'beach': ('I vi IV V I6 ii IV V7', 'I vi IV V vi ii IV V7',
              'vi iii IV iv I6 ii V V7', 'I vi IV V I6 ii IV V7'),
    'light': ('I iii IV I6 vi ii V V7', 'I iii vi IV ii V I6 V7',
              'vi IV I6 V/ii ii V iii V7', 'I iii IV I6 vi ii V V7'),
    'captain': ('I IV I V vi bVII V V7', 'I IV vi V I6 bVII V V7',
                'vi IV II V I6 ii bVII V7', 'I IV I V vi bVII V V7'),
}


def chord_pitch(expected, voicing, root, strong):
    """Land strong melody notes on the sounding chord; keep passing notes free."""
    if not strong:
        return expected
    pcs = {p % 12 for p in voicing} | {root % 12}
    return min((p for p in range(expected-4, expected+5) if p % 12 in pcs),
               key=lambda p: (abs(p-expected), p < expected))


def melody(s, kind, bar, meter, tonic, root, voicing):
    section, pos = divmod(bar, 8)
    events = MELODIES[kind][section == 2][pos]
    # A' changes the calls and cadence; A'' recalls the opening, then leaves
    # a little space before the downbeat at the loop seam.
    events = list(events)
    if section == 1 and pos in (1, 3, 5):
        at, step, dur = events[-1]
        events[-1] = (at, step + (2 if pos == 3 else -2), dur)
    if section == 3 and pos in (2, 5):
        at, step, dur = events[-1]
        events[-1] = (at, step - 2, dur)
    if section == 3 and pos == 7:
        events = events[:2]  # the dominant releases into bar one on repeat
    played = []
    for at, step, dur in events:
        pitch = chord_pitch(tonic + int(step), voicing, root,
                            at == 0 or (at >= 1 and at == int(at) and dur >= .75))
        dur = min(dur, meter-at-.10)
        s.note(0, pitch, bar*meter+at, dur, 47 if kind in ('lagoon', 'light', 'caves') else 54)
        played.append((at, at+dur))
    return played


def accompaniment(s, kind, bar, meter, root, voicing, next_root, played):
    t = bar*meter
    section, pos = divmod(bar, 8)
    low = root
    fifth = root + 7
    # Distinct bass rhythms: lagoon floats, caves holds a pedal, lighthouse
    # has a true waltz bass, and the busy boards get small approach notes.
    if kind == 'lagoon':
        bass = [(0, low, 2.6, 47), (2.75, fifth, .85, 35)]
    elif kind == 'caves':
        bass = [(0, low, 2.65, 49), (3, next_root-1 if pos in (3, 7) else fifth, .7, 34)]
    elif kind == 'light':
        bass = [(0, low, 1.55, 44), (2, fifth, .68, 34)]
    elif kind == 'beach':
        bass = [(0, low, 1.3, 51), (2, fifth, .85, 42), (3.25, low+12, .5, 28)]
    elif kind == 'patterns':
        bass = [(0, low, .9, 53), (1.5, fifth, .55, 37), (2.75, low+12, .55, 37)]
    elif kind == 'captain':
        bass = [(0, low, .85, 54), (1.5, low+12, .48, 36), (2.5, fifth, .65, 43)]
    else:
        bass = [(0, low, 1, 54), (2, fifth, .8, 44)]
    if kind in ('town', 'patterns', 'captain') and pos in (3, 7):
        bass.append((3.5, next_root-1, .32, 31))
    for at, pitch, dur, vel in bass:
        s.note(3, pitch, t+at, dur, vel)

    if kind == 'light':
        # 3/4: low note followed by two quiet, separated upper chord pulses.
        for at in (1, 2):
            for p in voicing[1:4]: s.note(1, p, t+at, .5, 30)
        if pos % 2 == 0:
            for at, p in ((.5, voicing[0]+12), (1.5, voicing[2]+12)):
                s.note(2, p, t+at, .45, 25)
    elif kind == 'lagoon':
        for at, p in zip((.25, 1, 1.75, 2.5, 3.25),
                         (voicing[0], voicing[1], voicing[2], voicing[3], voicing[1])):
            s.note(1, p+12, t+at, .55, 31 if at in (.25, 2.5) else 26)
        if pos % 2 == 0:
            s.note(2, voicing[1], t, 2.8, 26)
    elif kind == 'caves':
        for at, p in zip((.3, 1.25, 2.2, 3.1),
                         (voicing[0], voicing[2], voicing[1], voicing[3])):
            s.note(1, p, t+at, .6, 35 if section != 2 else 31)
        if pos in (1, 3, 5):
            s.note(2, voicing[2]+12, t+2.45, 1.1, 25)
    elif kind == 'beach':
        for at in ((.4, 2.45) if pos % 2 else (0, 1.65, 3)):
            for p in voicing[:3]: s.note(1, p, t+at, .63, 30)
        for at, p in ((.8, voicing[2]+12), (2.15, voicing[1]+12)):
            s.note(2, p, t+at, .7, 27)
    else:
        hits = ((.5, 1.5, 2.5, 3.5) if section != 2 else (.5, 2, 3.5))
        for at in hits:
            for i, p in enumerate(voicing[:3]):
                s.note(1, p, t+at+i*.015, .28, 36 if kind != 'patterns' else 32)
        if kind == 'patterns':
            for at, p in ((.25, voicing[0]+12), (1.25, voicing[2]+12),
                          (2.25, voicing[1]+12), (3.25, voicing[3]+12)):
                s.note(2, p, t+at, .48, 28)
        elif kind == 'captain':
            for at, p in ((.15, voicing[2]+12), (2.15, voicing[1]+12)):
                s.note(2, p, t+at, .44, 27)
        else:
            for at in (.2, 2.2): s.note(2, voicing[2]+12, t+at, .45, 29)

    # One answering tone in a lead rest, only on alternate bars. It follows
    # the actual chord and never plays through the lead's next attack.
    if pos in (1, 3, 5, 6, 7):
        gaps = []
        ends = [(0, 0)] + played + [(meter, meter)]
        for (_, end), (start, _) in zip(ends, ends[1:]):
            if start-end >= .55 and end >= .5:
                gaps.append((end, start))
        if gaps:
            start, stop = max(gaps, key=lambda gap: gap[1]-gap[0])
            at = start + .07
            s.note(4, voicing[2]+12, t+at, min(.42, stop-at-.08), 25)

    if kind in ('town', 'patterns', 'beach', 'captain'):
        # Whispered percussion follows the region's motion without competing
        # with speech or accenting every eighth note alike.
        pulse = (0, 2) if section == 2 else (0, 1, 2, 3)
        for at in pulse:
            s.note(9, 36 if at in (0, 2) else 38, t+at, .1,
                   (35 if at == 0 else 24) - (6 if kind == 'beach' else 0))
        shaker = (1.5, 3.5) if kind == 'beach' else ((.5, 1.5, 2.5, 3.5) if pos % 2 else (.5, 2.5, 3.5))
        for at in shaker:
            s.note(9, 70 if kind == 'beach' else 42, t+at, .08, 13)


def compose(kind):
    # bpm, beats/bar, tonic shift, soundfont programs. All forms are 32 bars.
    specs = {
        'town': (106, 4, 7, (21, 24, 73, 32, 11)),
        'lagoon': (94, 4, 2, (73, 46, 48, 35, 9)),
        'caves': (90, 4, 0, (12, 11, 88, 35, 10)),
        'patterns': (108, 4, 5, (12, 45, 48, 32, 11)),
        'beach': (94, 4, 0, (114, 24, 46, 35, 12)),
        'light': (88, 3, 3, (0, 73, 89, 35, 10)),
        'captain': (114, 4, 10, (71, 21, 40, 32, 44)),
    }
    bpm, meter, shift, (lead, chord, arp, bass, accent) = specs[kind]
    harmony = [symbol for section in HARMONY[kind] for symbol in section.split()]
    assert len(harmony) == 32
    s = Song(bpm, 200 + list(specs).index(kind))
    for ch, prog, vol, pan, rev in ((0, lead, 84, 62, 58), (1, chord, 68, 44, 50),
                                     (2, arp, 62, 83, 68), (3, bass, 76, 64, 35),
                                     (4, accent, 54, 76, 72)):
        s.program(ch, prog, vol, pan, rev)
    if kind in ('town', 'patterns', 'beach', 'captain'):
        s.program(9, 40, 53, 64, 28)
    for bar, symbol in enumerate(harmony):
        root, voicing = CH[symbol]
        root += shift
        voicing = tuple(p+shift for p in voicing)
        next_root = CH[harmony[(bar+1) % 32]][0] + shift
        tonic = (69 if kind == 'caves' else 72+shift)
        played = melody(s, kind, bar, meter, tonic, root, voicing)
        accompaniment(s, kind, bar, meter, root, voicing, next_root, played)
    return s, 32*meter


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for region in ('town', 'lagoon', 'caves', 'patterns', 'beach', 'light', 'captain'):
        if len(sys.argv) > 2 and region not in sys.argv[2:]:
            continue
        # Start each score with a fresh instrument/reverb state. Rendering order
        # must not carry the previous region's lingering voices into this loop.
        api = fluid()
        try:
            song, beats = compose(region)
            path = OUT / ('region-' + region + '-song.mp3')
            render(song, beats, path, api)
            print(region, round(beats * 60 / song.bpm, 1), 'seconds', path.stat().st_size, 'bytes', flush=True)
        finally:
            api[0].delete_fluid_synth(api[1])
            api[0].delete_fluid_settings(api[2])
