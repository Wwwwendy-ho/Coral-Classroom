# Music Credits

All 16 Day & Night regional soundtrack tracks (8 regions × Day & Night) are original Cozy-Oceanic compositions created for Coral Classroom by `game/tools/compose_soundtrack.py` (`game/tools/soundtrack_engine.py` and `game/tools/soundtrack_regions/*.py`). Regions 1–7 use a 48-bar expressive form (`Intro/Hook -> A -> A' -> B -> C (solo handoff) -> A'' -> Turnaround`), and Captain's Deck uses a 64-bar 8-section narrative (`Intro/Hook -> A -> A' -> B -> C1 -> C2 -> A'' -> Turnaround`), with each region's Day and Night pair sharing a recognizable regional motif across contrasting moods and instrumentation.

## 16-Track Regional Soundtrack Catalog

| Region | Mode | Track ID | Title | Key | Meter | Bars | BPM (Swing) | Duration | MP3 / MIDI |
|---|---|---|---|---|---|---:|---:|---:|---|
| Coral Cove | Day | `day-song` | Coral Cove (Day) | C Major | 4/4 | 48 | 104 (0.04) | 110.77s (`1:51`) | `game/day-song.mp3` · `game/assets/midi/day-song.mid` |
| Coral Cove | Night | `night-song` | Coral Cove (Night) | C Major | 4/4 | 48 | 80 (0.00) | 144.00s (`2:24`) | `game/night-song.mp3` · `game/assets/midi/night-song.mid` |
| Harbor Town | Day | `region-town-song` | Harbor Town (Day) | G Major | 4/4 | 48 | 118 (0.14) | 97.63s (`1:38`) | `game/region-town-song.mp3` · `game/assets/midi/region-town-song.mid` |
| Harbor Town | Night | `region-town-night-song` | Harbor Town (Night) | G Major | 4/4 | 48 | 88 (0.12) | 130.91s (`2:11`) | `game/region-town-night-song.mp3` · `game/assets/midi/region-town-night-song.mid` |
| Story Lagoon | Day | `region-lagoon-song` | Story Lagoon (Day) | D Major | 6/8 | 48 | 90 (0.00) | 96.00s (`1:36`) | `game/region-lagoon-song.mp3` · `game/assets/midi/region-lagoon-song.mid` |
| Story Lagoon | Night | `region-lagoon-night-song` | Story Lagoon (Night) | D Major | 6/8 | 48 | 72 (0.00) | 120.00s (`2:00`) | `game/region-lagoon-night-song.mp3` · `game/assets/midi/region-lagoon-night-song.mid` |
| Echo Caves | Day | `region-caves-song` | Echo Caves (Day) | A Dorian | 4/4 | 48 | 86 (0.00) | 133.95s (`2:14`) | `game/region-caves-song.mp3` · `game/assets/midi/region-caves-song.mid` |
| Echo Caves | Night | `region-caves-night-song` | Echo Caves (Night) | A Dorian | 4/4 | 48 | 74 (0.00) | 155.68s (`2:36`) | `game/region-caves-night-song.mp3` · `game/assets/midi/region-caves-night-song.mid` |
| Pattern Reef | Day | `region-patterns-song` | Pattern Reef (Day) | F Major | 4/4 | 48 | 120 (0.04) | 96.00s (`1:36`) | `game/region-patterns-song.mp3` · `game/assets/midi/region-patterns-song.mid` |
| Pattern Reef | Night | `region-patterns-night-song` | Pattern Reef (Night) | F Major | 4/4 | 48 | 90 (0.00) | 128.00s (`2:08`) | `game/region-patterns-night-song.mp3` · `game/assets/midi/region-patterns-night-song.mid` |
| Bottle Beach | Day | `region-beach-song` | Bottle Beach (Day) | C Major | 4/4 | 48 | 98 (0.03) | 117.55s (`1:58`) | `game/region-beach-song.mp3` · `game/assets/midi/region-beach-song.mid` |
| Bottle Beach | Night | `region-beach-night-song` | Bottle Beach (Night) | C Major | 4/4 | 48 | 78 (0.00) | 147.69s (`2:28`) | `game/region-beach-night-song.mp3` · `game/assets/midi/region-beach-night-song.mid` |
| The Lighthouse | Day | `region-light-song` | The Lighthouse (Day) | Eb Major | 3/4 | 48 | 86 (0.00) | 100.47s (`1:40`) | `game/region-light-song.mp3` · `game/assets/midi/region-light-song.mid` |
| The Lighthouse | Night | `region-light-night-song` | The Lighthouse (Night) | Eb Major | 3/4 | 48 | 74 (0.00) | 116.76s (`1:57`) | `game/region-light-night-song.mp3` · `game/assets/midi/region-light-night-song.mid` |
| Captain's Deck | Day | `region-captain-song` | Captain's Deck (Day) | D Minor | 6/8 | 64 | 124 (0.00) | 92.90s (`1:33`) | `game/region-captain-song.mp3` · `game/assets/midi/region-captain-song.mid` |
| Captain's Deck | Night | `region-captain-night-song` | Captain's Deck (Night) | D Minor | 6/8 | 64 | 92 (0.00) | 125.22s (`2:05`) | `game/region-captain-night-song.mp3` · `game/assets/midi/region-captain-night-song.mid` |

## Regional Creative Direction & MIDI Instrumentation

MIDI channel assignments list exact `MetaMessage("track_name")` labels and MuseScore General SoundFont `[Bank:Program]` patches (percussion Channel 9 uses FluidSynth drum bank `128`).

### 1. Coral Cove (`cove`)
- **Regional Motif & Identity**: Warm sunlit wave motif in C Major (`4/4`) built around an open marimba/celesta rising wave hook (`E5–G5–A5–G5–E5–D5`) and gentle island cadence.
- **Day (`day-song`)**: Sunlit marimba, nylon guitar, flute, vibraphone & island percussion hub.
  - MIDI tracks: Ch 0 `Marimba Lead` `[0:12]`, Ch 1 `Nylon Guitar` `[0:24]`, Ch 2 `Flute Counter` `[0:73]`, Ch 3 `Acoustic Bass` `[0:32]`, Ch 4 `Vibraphone` `[0:11]`, Ch 5 `Pizzicato Strings` `[0:45]`, Ch 6 `Warm Strings` `[0:48]`, Ch 7 `Harp` `[0:46]`, Ch 9 `Island Kit` `[128:0]`.
- **Night (`night-song`)**: Starry celesta, detuned tine EP, harp, cello & slow strings lullaby.
  - MIDI tracks: Ch 0 `Celesta Lead` `[0:8]`, Ch 1 `Detuned Tine EP` `[8:4]`, Ch 2 `Harp` `[0:46]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Cello` `[0:42]`, Ch 5 `Slow Strings` `[0:49]`, Ch 6 `Glockenspiel` `[0:9]`.

### 2. Harbor Town (`town`)
- **Regional Motif & Identity**: Swung G Major (`4/4`) boardwalk cadence contrasting a bustling daytime accordion/brass stroll with a relaxed lantern-lit evening lounge.
- **Day (`region-town-song`)**: Upbeat boardwalk accordion, nylon guitar, flute & brass swing (`swing = 0.14`).
  - MIDI tracks: Ch 0 `Italian Accordion Lead` `[8:21]`, Ch 1 `Nylon Guitar Comp` `[0:24]`, Ch 2 `Flute Fills` `[0:73]`, Ch 3 `Upright Bass` `[0:32]`, Ch 4 `Trumpet Solo` `[0:56]`, Ch 5 `Boardwalk Brass` `[0:61]`, Ch 9 `Jazz Kit` `[128:32]`.
- **Night (`region-town-night-song`)**: Lantern-lit detuned tine EP jazz lounge, muted trumpet, vibraphone & brush groove (`swing = 0.12`).
  - MIDI tracks: Ch 0 `Detuned Tine EP` `[8:4]`, Ch 1 `Nylon Guitar Lounge` `[0:24]`, Ch 2 `Muted Trumpet` `[0:59]`, Ch 3 `Upright Bass` `[0:32]`, Ch 4 `Vibraphone Lounge` `[0:11]`, Ch 5 `Lounge Strings` `[0:49]`, Ch 9 `Brush Kit` `[128:40]`.

### 3. Story Lagoon (`lagoon`)
- **Regional Motif & Identity**: Lilting `6/8` D Major barcarolle swaying in gentle waves over rolling harp arpeggios, transforming from daytime woodwind storytelling to a hush-toned bedtime music box.
- **Day (`region-lagoon-song`)**: Dreamy `6/8` barcarolle with flute, oboe, rolling harp, storybook strings, lyrical cello & glockenspiel.
  - MIDI tracks: Ch 0 `Flute Lead` `[0:73]`, Ch 1 `Rolling Harp` `[0:46]`, Ch 2 `Oboe Counter` `[0:68]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Glockenspiel Sparkle` `[0:9]`, Ch 5 `Storybook Strings` `[0:48]`, Ch 6 `Harp Gliss` `[0:46]`, Ch 7 `Lyrical Cello` `[0:42]`.
- **Night (`region-lagoon-night-song`)**: Bedtime `6/8` lullaby with music box, moonlit rolling harp, warm cello, celesta & hushed flute.
  - MIDI tracks: Ch 0 `Music Box Lead` `[0:10]`, Ch 1 `Moonlit Harp` `[0:46]`, Ch 2 `Bedtime Cello` `[0:42]`, Ch 4 `Celesta Handoff` `[0:8]`, Ch 5 `Hushed Slow Strings` `[0:49]`, Ch 7 `Hushed Flute` `[0:73]`.

### 4. Echo Caves (`caves`)
- **Regional Motif & Identity**: True A Dorian (`A–B–C–D–E–F#–G`) cavern theme featuring raised-6th `F#` Dorian color (`IV` D major) and stereo-panned (`CC10`) crystal echo cascades.
- **Day (`region-caves-song`)**: Luminous A Dorian vibraphone & marimba with stereo crystal echo cascades.
  - MIDI tracks: Ch 0 `Vibraphone Lead` `[0:11]`, Ch 1 `Marimba Pulse` `[0:12]`, Ch 2 `Cave Flute Solo` `[0:73]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Harp Cascade` `[0:46]`, Ch 5 `Cavern Strings` `[0:48]`, Ch 6 `Crystal Echoes` `[0:98]`, Ch 7 `Celesta Sparkle` `[0:8]`, Ch 9 `Cavern Percussion` `[128:48]`.
- **Night (`region-caves-night-song`)**: Bioluminescent glass-bell celesta, crystal echoes, harp & fretless bass hush.
  - MIDI tracks: Ch 0 `Celesta Bell Lead` `[0:8]`, Ch 1 `Bioluminescent Harp` `[0:46]`, Ch 2 `Music Box Solo` `[0:10]`, Ch 3 `Soft Fretless Bass` `[0:35]`, Ch 4 `Glass Bell Chime` `[0:9]`, Ch 5 `Abyssal Slow Strings` `[0:49]`, Ch 6 `Biolume Crystal Echo` `[0:98]`, Ch 7 `Fantasia Glass Pad` `[0:88]`.

### 5. Pattern Reef (`patterns`)
- **Regional Motif & Identity**: Crisp F Major (`4/4`) puzzle-motif driven by interlocking mallet voices and playful rhythmic clarity, softening into cozy late-night kalimba tinkering after dusk.
- **Day (`region-patterns-song`)**: Upbeat puzzle-pop marimba, xylophone, pizzicato, clarinet, and stereo woodblock groove.
  - MIDI tracks: Ch 0 `Marimba Lead` `[0:12]`, Ch 1 `Pizzicato Strings` `[0:45]`, Ch 2 `Clarinet Counter` `[0:71]`, Ch 3 `Acoustic Bass` `[0:32]`, Ch 4 `Xylophone Handoff` `[0:13]`, Ch 5 `Strings Fast Pad` `[0:48]`, Ch 6 `Woodblock Syncopation` `[0:115]`, Ch 9 `Puzzle Standard Kit` `[128:0]`.
- **Night (`region-patterns-night-song`)**: Cozy late-night kalimba, harp, soft marimba, celesta, fretless bass, and brush tick.
  - MIDI tracks: Ch 0 `Kalimba Lead` `[0:108]`, Ch 1 `Harp Arpeggio` `[0:46]`, Ch 2 `Soft Marimba Counter` `[0:12]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Celesta Handoff` `[0:8]`, Ch 5 `Slow Strings` `[0:49]`, Ch 9 `Soft Brush Tick` `[128:40]`.

### 6. Bottle Beach (`beach`)
- **Regional Motif & Identity**: Warm C Major bossa-inflected coastal hook pairing a breezy daytime steel drum melody with intimate moonlit fingerpicked nylon guitar and Rhodes.
- **Day (`region-beach-song`)**: Breezy steel drum, nylon guitar bossa clave, harp ripples & flute.
  - MIDI tracks: Ch 0 `Steel Drums Lead` `[0:114]`, Ch 1 `Nylon Guitar Bossa` `[0:24]`, Ch 2 `Flute Counter` `[0:73]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Harp Harmony` `[0:46]`, Ch 5 `Warm Strings` `[0:48]`, Ch 9 `Beach Bossa Percussion` `[128:32]`.
- **Night (`region-beach-night-song`)**: Moonlit fingerpicked nylon guitar, detuned Rhodes, cello & brush whisper.
  - MIDI tracks: Ch 0 `Nylon Guitar Lead` `[0:24]`, Ch 1 `Detuned Rhodes` `[8:4]`, Ch 2 `Cello Counter` `[0:42]`, Ch 3 `Fretless Bass` `[0:35]`, Ch 4 `Harp Moonlight` `[0:46]`, Ch 5 `Moonlit Warm Pad` `[0:89]`, Ch 9 `Brush Whisper` `[128:40]`.

### 7. The Lighthouse (`light`)
- **Regional Motif & Identity**: Deadpan `3/4` Eb Major clockwork waltz pairing sleepy bassoon and mellow grand piano with crisp stay-alert pings by day and a sweeping stereo lighthouse-beam chime (`CC10`) by night.
- **Day (`region-light-song`)**: Deadpan solemn `3/4` clockwork waltz jolted awake by crisp stay-alert pings.
  - MIDI tracks: Ch 0 `Bassoon Lead` `[0:70]`, Ch 1 `Mellow Grand Waltz` `[8:0]`, Ch 2 `Woodblock Clockwork` `[0:115]`, Ch 3 `Cello Bass` `[0:42]`, Ch 4 `Piccolo Alert` `[0:72]`, Ch 5 `Strings Fast Pad` `[0:48]`, Ch 6 `Glockenspiel Alert` `[0:9]`, Ch 7 `Pizzicato Posture Snap` `[0:45]`, Ch 9 `Orchestra Kit` `[128:48]`.
- **Night (`region-light-night-song`)**: Dignified sleepy night-watch piano, bassoon & sweeping stereo lighthouse beam.
  - MIDI tracks: Ch 0 `Mellow Grand Lead` `[8:0]`, Ch 1 `Bassoon Night-Watch` `[0:70]`, Ch 2 `Harp Night-Watch` `[0:46]`, Ch 3 `Cello Bass` `[0:42]`, Ch 4 `Celesta Handoff` `[0:8]`, Ch 5 `Slow Strings` `[0:49]`, Ch 6 `Beacon Beam Glockenspiel` `[0:9]`, Ch 7 `Beacon Crystal Halo` `[0:98]`.

### 8. Captain's Deck (`captain`)
- **Regional Motif & Identity**: Heroic `6/8` D Minor naval theme spanning 64 bars—galloping French horns, spiccato strings, and accordion/fiddle march by day; noble starlit solo-horn watch by night.
- **Day (`region-captain-song`)**: Heroic `6/8` French horn & brass, galloping spiccato strings, accordion & fiddle march.
  - MIDI tracks: Ch 0 `French Horns Lead` `[0:60]`, Ch 1 `Pizzicato Gallop Attack` `[0:45]`, Ch 2 `Strings Fast Spiccato Body` `[0:48]`, Ch 3 `Fingered Bass` `[0:33]`, Ch 4 `Italian Accordion` `[8:21]`, Ch 5 `Brass Section` `[0:61]`, Ch 6 `Timpani` `[0:47]`, Ch 7 `Violin Fiddle` `[0:40]`, Ch 9 `Orchestra Kit` `[128:48]`.
- **Night (`region-captain-night-song`)**: Noble starlit naval watch: solo French horn, nylon guitar, harp, cello & slow strings.
  - MIDI tracks: Ch 0 `Solo French Horn` `[0:60]`, Ch 1 `Nylon Guitar Arpeggio` `[0:24]`, Ch 2 `Harp Starlight` `[0:46]`, Ch 3 `Cello Watch` `[0:42]`, Ch 4 `Warm Accordion` `[0:21]`, Ch 5 `Slow Strings` `[0:49]`, Ch 6 `Distant Timpani` `[0:47]`, Ch 7 `Night Flute` `[0:73]`, Ch 9 `Brush Watch Percussion` `[128:40]`.

## Audio Mastering & MIDI Export Pipeline

- **SoundFont & Synthesizer**: Rendered via FluidSynth using **MuseScore General (`MuseScore_General.sf2`)** (`44.1 kHz` sample rate, `synth.gain=0.50`, `synth.reverb.room-size=0.65`, `synth.reverb.level=0.46`, `synth.polyphony=220`), avoiding Bank 17 expression presets.
- **Seamless Loop Mastering (`game/tools/soundtrack_engine.py`)**: Exact beat-grid body length plus a `4.0 s` reverb tail folded into the loop head (`stereo[:wrap] += stereo[length:length+wrap]`), `256`-sample (`~5.8 ms`) half-sine edge fades, pre-master `< 0.0 dBFS` clipping guard, and FFmpeg mastering (`highpass=f=32`, `lowshelf=f=150:g=1.4`, `highshelf=f=6800:g=-1.8`, `stereotools=mlev=1:slev=1.12`, `acompressor=threshold=-16dB:ratio=2.0:attack=18:release=200`, `loudnorm=I=-21:TP=-1.5:LRA=9`) encoded to constant `128 kbps`, `44.1 kHz` stereo MP3s in `game/*.mp3`.
- **Multi-Track MIDI Exports (`game/assets/midi/*.mid`)**: Standard MIDI File Type 1 (`480 TPB`) with Track 0 tempo, time-signature, and key-signature meta events, one named track per active instrument channel (zero empty tracks), and expressive `CC1` vibrato, `CC10` stereo pan, `CC11` swells, and `CC64` sustain pedal automation.
- **In-Game Continuous Lesson Playback (`game/src/js/music.js`)**: Plays each region's Day/Night track continuously across maps and lessons with smooth volume ducking (`RM.duck`, `speechMul`), a warm `2400 Hz` `BiquadFilterNode` low-pass bus during lessons/speech, modular `RM_ROUTE_OVERRIDES`, and strict mute guards (`cc-music='off'`, `coralCoveSound='0'`). Shared non-regional utility cues (`lobby-song.mp3`, `deck-song.mp3`, `game-song.mp3`, `timer-song.mp3`, `win.mp3`) also reside in `game/`.

## SoundFont License (MuseScore General)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
