"""Thin CLI entrypoint to compose, export MIDI, and render all 16 regional soundtrack tracks.

Usage:
  python3 game/tools/compose_soundtrack.py [--midi-only] [--workers N] [--list-json] [track_name ...]
"""

import argparse
import json
from pathlib import Path
import sys

_TOOLS_DIR = str(Path(__file__).resolve().parent)
if _TOOLS_DIR not in sys.path:
    sys.path.insert(0, _TOOLS_DIR)

import soundtrack_engine
from soundtrack_regions import ALL_TRACKS, REGION_MODULES, TRACK_MAP, build_track  # noqa: F401


def _track_metadata(spec):
    name = spec["name"]
    total_beats = float(spec["bars"]) * float(spec["beats_per_bar"])
    duration_sec = round(total_beats * 60.0 / float(spec["bpm"]), 2)
    return {
        "name": name,
        "region": spec["region"],
        "mode": spec["mode"],
        "title": spec["title"],
        "key": spec["key"],
        "key_midi": spec["key_midi"],
        "meter": list(spec["meter"]),
        "beats_per_bar": float(spec["beats_per_bar"]),
        "bars": int(spec["bars"]),
        "bpm": int(spec["bpm"]),
        "swing": float(spec["swing"]),
        "duration_sec": duration_sec,
        "description": spec["description"],
        "midi_path": f"game/assets/midi/{name}.mid",
        "mp3_path": f"game/{name}.mp3",
    }


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Compose, export MIDI, and render Coral Classroom Day/Night regional soundtracks."
    )
    parser.add_argument(
        "--midi-only",
        action="store_true",
        help="Export multi-track MIDI files only and skip FluidSynth/ffmpeg MP3 rendering.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=None,
        metavar="N",
        help="Number of parallel worker processes (default: min(targets, cpu_count)).",
    )
    parser.add_argument(
        "--list-json",
        action="store_true",
        help="Print JSON metadata for all 16 regional tracks and exit.",
    )
    parser.add_argument(
        "tracks",
        nargs="*",
        metavar="track_name",
        help="Optional track names to render (defaults to all 16 tracks).",
    )
    args = parser.parse_args(argv)
    if args.workers is not None and args.workers < 1:
        parser.error("--workers must be >= 1")
    return args


def main(argv=None):
    args = parse_args(argv)

    if args.list_json:
        print(json.dumps([_track_metadata(spec) for spec in ALL_TRACKS], indent=2))
        return 0

    if args.tracks:
        unknown = [t for t in args.tracks if t not in TRACK_MAP]
        if unknown:
            valid = ", ".join(spec["name"] for spec in ALL_TRACKS)
            print(
                f"Error: Unknown track(s): {', '.join(unknown)}. Valid tracks: {valid}",
                file=sys.stderr,
            )
            return 2
        seen = set()
        targets = []
        for name in args.tracks:
            if name not in seen:
                seen.add(name)
                targets.append(TRACK_MAP[name])
    else:
        targets = list(ALL_TRACKS)

    soundtrack_engine.MIDI_DIR.mkdir(parents=True, exist_ok=True)
    sf_path = None
    if not args.midi_only:
        sf_path = soundtrack_engine.find_soundfont()
        print(f"Using SoundFont: {sf_path}", flush=True)

    jobs = [
        (spec, build_track, soundtrack_engine.ROOT, soundtrack_engine.MIDI_DIR)
        for spec in targets
    ]
    results = soundtrack_engine.render_tracks_parallel(
        jobs,
        workers=args.workers,
        midi_only=args.midi_only,
        sf_path=sf_path,
    )

    for res in results:
        if args.midi_only:
            print(f"MIDI: {res['name']}.mid", flush=True)
        else:
            print(
                f"OK {res['name']}.mp3 ({res['dur_s']}s, {res['size_kb']} KB, "
                f"peak={res['peak_db']:.1f}dB, rms={res['rms_db']:.1f}dB)",
                flush=True,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
