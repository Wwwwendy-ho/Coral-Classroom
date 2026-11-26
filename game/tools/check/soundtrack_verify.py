#!/usr/bin/env python3
"""Opaque-box Tier 1-4 audio, MIDI, and integration verifier for Coral Classroom.

Run with WSL venv Python:
  /home/wendy/.venvs/coral-classroom/bin/python game/tools/check/soundtrack_verify.py --strict-upgrade
  /home/wendy/.venvs/coral-classroom/bin/python game/tools/check/soundtrack_verify.py --baseline-ok --json
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import mido
import numpy as np

SR = 44100
EXPECTED_TPB = 480

REPO_ROOT = Path(__file__).resolve().parents[3]
GAME_DIR = REPO_ROOT / "game"
MIDI_DIR = GAME_DIR / "assets" / "midi"
COMPOSE_PY = GAME_DIR / "tools" / "compose_soundtrack.py"
SW_JS = GAME_DIR / "sw.js"
MUSIC_JS = GAME_DIR / "src" / "js" / "music.js"
REVIEW_HTML = REPO_ROOT / "review-site" / "music-review.html"

REGION_ORDER = ["cove", "town", "lagoon", "caves", "patterns", "beach", "light", "captain"]

# Canonical specification derived from ORIGINAL_REQUEST.md and PROJECT.md
CANONICAL_SPECS: list[dict[str, Any]] = [
    {
        "name": "day-song",
        "region": "cove",
        "mode": "day",
        "key": "C Major",
        "valid_midi_keys": {"C", "Am"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"c\s*maj",
    },
    {
        "name": "night-song",
        "region": "cove",
        "mode": "night",
        "key": "C Major",
        "valid_midi_keys": {"C", "Am"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"c\s*maj",
    },
    {
        "name": "region-town-song",
        "region": "town",
        "mode": "day",
        "key": "G Major",
        "valid_midi_keys": {"G", "Em"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"g\s*maj",
    },
    {
        "name": "region-town-night-song",
        "region": "town",
        "mode": "night",
        "key": "G Major",
        "valid_midi_keys": {"G", "Em"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"g\s*maj",
    },
    {
        "name": "region-lagoon-song",
        "region": "lagoon",
        "mode": "day",
        "key": "D Major",
        "valid_midi_keys": {"D", "Bm"},
        "meter": (6, 8),
        "qbeats": 3.0,
        "bars": 48,
        "html_key_re": r"d\s*maj",
    },
    {
        "name": "region-lagoon-night-song",
        "region": "lagoon",
        "mode": "night",
        "key": "D Major",
        "valid_midi_keys": {"D", "Bm"},
        "meter": (6, 8),
        "qbeats": 3.0,
        "bars": 48,
        "html_key_re": r"d\s*maj",
    },
    {
        "name": "region-caves-song",
        "region": "caves",
        "mode": "day",
        "key": "A Dorian",
        "valid_midi_keys": {"G", "Em", "Am", "D"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"a\s*dorian",
    },
    {
        "name": "region-caves-night-song",
        "region": "caves",
        "mode": "night",
        "key": "A Dorian",
        "valid_midi_keys": {"G", "Em", "Am", "D"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"a\s*dorian",
    },
    {
        "name": "region-patterns-song",
        "region": "patterns",
        "mode": "day",
        "key": "F Major",
        "valid_midi_keys": {"F", "Dm"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"f\s*maj",
    },
    {
        "name": "region-patterns-night-song",
        "region": "patterns",
        "mode": "night",
        "key": "F Major",
        "valid_midi_keys": {"F", "Dm"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"f\s*maj",
    },
    {
        "name": "region-beach-song",
        "region": "beach",
        "mode": "day",
        "key": "C Major",
        "valid_midi_keys": {"C", "Am", "G"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"c\s*maj",
    },
    {
        "name": "region-beach-night-song",
        "region": "beach",
        "mode": "night",
        "key": "C Major",
        "valid_midi_keys": {"C", "Am", "G"},
        "meter": (4, 4),
        "qbeats": 4.0,
        "bars": 48,
        "html_key_re": r"c\s*maj",
    },
    {
        "name": "region-light-song",
        "region": "light",
        "mode": "day",
        "key": "Eb Major",
        "valid_midi_keys": {"Eb", "Cm"},
        "meter": (3, 4),
        "qbeats": 3.0,
        "bars": 48,
        "html_key_re": r"eb\s*maj",
    },
    {
        "name": "region-light-night-song",
        "region": "light",
        "mode": "night",
        "key": "Eb Major",
        "valid_midi_keys": {"Eb", "Cm"},
        "meter": (3, 4),
        "qbeats": 3.0,
        "bars": 48,
        "html_key_re": r"eb\s*maj",
    },
    {
        "name": "region-captain-song",
        "region": "captain",
        "mode": "day",
        "key": "D Minor",
        "valid_midi_keys": {"Dm", "F"},
        "meter": (6, 8),
        "qbeats": 3.0,
        "bars": 64,
        "html_key_re": r"d\s*min",
    },
    {
        "name": "region-captain-night-song",
        "region": "captain",
        "mode": "night",
        "key": "D Minor",
        "valid_midi_keys": {"Dm", "F"},
        "meter": (6, 8),
        "qbeats": 3.0,
        "bars": 64,
        "html_key_re": r"d\s*min",
    },
]

SPEC_BY_NAME: dict[str, dict[str, Any]] = {s["name"]: s for s in CANONICAL_SPECS}
REGION_PAIRS: dict[str, tuple[str, str]] = {
    reg: (
        next(s["name"] for s in CANONICAL_SPECS if s["region"] == reg and s["mode"] == "day"),
        next(s["name"] for s in CANONICAL_SPECS if s["region"] == reg and s["mode"] == "night"),
    )
    for reg in REGION_ORDER
}

UTILITY_MP3S = ["win.mp3", "lobby-song.mp3", "deck-song.mp3", "game-song.mp3", "timer-song.mp3"]
SEVEN_REGION_NIGHT_MP3S = {
    f"region-{r}-night-song.mp3" for r in REGION_ORDER if r != "cove"
}


class CheckCollector:
    def __init__(self, baseline_ok: bool, tier_filter: str) -> None:
        self.baseline_ok = baseline_ok
        self.tier_filter = tier_filter
        self.checks: list[dict[str, Any]] = []

    def add(
        self,
        check_id: str,
        tier: int,
        feature: str,
        passed: bool,
        detail: str,
        track: str | None = None,
        baseline_known_gap: bool = False,
    ) -> None:
        if self.tier_filter != "all" and str(tier) != self.tier_filter:
            return
        if passed:
            status = "PASS"
        elif self.baseline_ok and baseline_known_gap:
            status = "BASELINE_GAP"
        else:
            status = "FAIL"
        self.checks.append(
            {
                "id": check_id,
                "tier": tier,
                "feature": feature,
                "track": track,
                "status": status,
                "detail": detail,
            }
        )


def weighted_jaccard(c1: Counter[Any], c2: Counter[Any]) -> float:
    keys = set(c1) | set(c2)
    if not keys:
        return 0.0
    num = sum(min(c1[k], c2[k]) for k in keys)
    den = sum(max(c1[k], c2[k]) for k in keys)
    return float(num) / float(den) if den > 0 else 0.0


def cosine_12(v1: list[float], v2: list[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    if n1 <= 0.0 or n2 <= 0.0:
        return 0.0
    return dot / (n1 * n2)


def analyze_mp3(track_name: str) -> dict[str, Any]:
    mp3_path = GAME_DIR / f"{track_name}.mp3"
    if not mp3_path.is_file():
        return {"exists": False, "path": str(mp3_path), "error": "file not found"}

    size_bytes = mp3_path.stat().st_size
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        "-hide_banner",
        "-i",
        str(mp3_path),
        "-f",
        "f32le",
        "-acodec",
        "pcm_f32le",
        "-ac",
        "2",
        "-ar",
        str(SR),
        "pipe:1",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    stderr_text = proc.stderr.decode("utf-8", errors="replace")
    if proc.returncode != 0 or not proc.stdout:
        return {
            "exists": True,
            "path": str(mp3_path),
            "size_bytes": size_bytes,
            "error": f"ffmpeg decode failed (rc={proc.returncode}): {stderr_text.strip()[:300]}",
        }

    sr_m = re.search(r"Audio:.*?(\d+)\s*Hz", stderr_text)
    ch_m = re.search(r"Audio:.*?\d+\s*Hz,\s*(stereo|mono|\d+\s*channels)", stderr_text)
    br_m = re.search(r"Audio:.*?(\d+)\s*kb/s", stderr_text) or re.search(
        r"bitrate:\s*(\d+)\s*kb/s", stderr_text
    )

    ff_sr = int(sr_m.group(1)) if sr_m else None
    ff_ch_raw = ch_m.group(1).lower() if ch_m else ""
    if ff_ch_raw == "stereo":
        ff_ch = 2
    elif ff_ch_raw == "mono":
        ff_ch = 1
    elif "channel" in ff_ch_raw:
        ff_ch = int(re.search(r"\d+", ff_ch_raw).group(0))
    else:
        ff_ch = None
    ff_br = int(br_m.group(1)) if br_m else None

    raw_pcm = np.frombuffer(proc.stdout, dtype=np.float32)
    n_frames = len(raw_pcm) // 2
    if n_frames <= 0:
        return {
            "exists": True,
            "path": str(mp3_path),
            "size_bytes": size_bytes,
            "error": "decoded PCM has 0 frames",
        }
    pcm = raw_pcm[: n_frames * 2].reshape(n_frames, 2)
    pcm_dur = float(n_frames) / float(SR)
    calc_br = (size_bytes * 8.0) / (pcm_dur * 1000.0)

    peak_lin = float(np.max(np.abs(pcm)))
    peak_dbfs = 20.0 * math.log10(max(1e-12, peak_lin))
    rms_lin = float(np.sqrt(np.mean(pcm.astype(np.float64) ** 2)))
    rms_dbfs = 20.0 * math.log10(max(1e-12, rms_lin))

    left = pcm[:, 0].astype(np.float64)
    right = pcm[:, 1].astype(np.float64)
    mid = 0.5 * (left + right)
    side = 0.5 * (left - right)
    rms_mid = float(np.sqrt(np.mean(mid ** 2)))
    rms_side = float(np.sqrt(np.mean(side ** 2)))
    side_mid_ratio = rms_side / max(1e-12, rms_mid)
    if np.std(left) <= 1e-12 or np.std(right) <= 1e-12:
        lr_corr = 1.0
    else:
        lr_corr = float(np.corrcoef(left, right)[0, 1])

    wrap_step = float(np.max(np.abs(pcm[0] - pcm[-1])))
    end_amp = float(max(np.max(np.abs(pcm[0])), np.max(np.abs(pcm[-1]))))

    frame_peak = np.max(np.abs(pcm), axis=1)
    non_silent = np.flatnonzero(frame_peak > 1e-4)
    if len(non_silent) == 0:
        head_zero_ms = pcm_dur * 1000.0
        tail_zero_ms = pcm_dur * 1000.0
    else:
        head_zero_ms = float(non_silent[0]) / (SR / 1000.0)
        tail_zero_ms = float(n_frames - 1 - non_silent[-1]) / (SR / 1000.0)

    n_500ms = min(n_frames, int(0.5 * SR))
    n_2s = min(n_frames, int(2.0 * SR))
    rms_tail500 = 20.0 * math.log10(max(1e-12, float(np.sqrt(np.mean(pcm[-n_500ms:].astype(np.float64) ** 2)))))
    rms_2s = 20.0 * math.log10(max(1e-12, float(np.sqrt(np.mean(pcm[:n_2s].astype(np.float64) ** 2)))))

    return {
        "exists": True,
        "path": str(mp3_path),
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024.0, 2),
        "ff_sr": ff_sr,
        "ff_ch": ff_ch,
        "ff_br": ff_br,
        "pcm_dur": round(pcm_dur, 4),
        "calc_br": round(calc_br, 2),
        "peak_lin": round(peak_lin, 6),
        "peak_dbfs": round(peak_dbfs, 3),
        "rms_dbfs": round(rms_dbfs, 3),
        "side_mid_ratio": round(side_mid_ratio, 4),
        "lr_corr": round(lr_corr, 4),
        "wrap_step": round(wrap_step, 6),
        "end_amp": round(end_amp, 6),
        "head_zero_ms": round(head_zero_ms, 2),
        "tail_zero_ms": round(tail_zero_ms, 2),
        "rms_tail500": round(rms_tail500, 3),
        "rms_2s": round(rms_2s, 3),
    }


def analyze_midi(track_name: str, spec: dict[str, Any]) -> dict[str, Any]:
    midi_path = MIDI_DIR / f"{track_name}.mid"
    if not midi_path.is_file():
        return {"exists": False, "path": str(midi_path), "error": "file not found"}

    try:
        mid = mido.MidiFile(str(midi_path))
    except Exception as exc:
        return {"exists": True, "path": str(midi_path), "error": f"mido parse error: {exc}"}

    tpb = mid.ticks_per_beat
    tempos: list[float] = []
    tsigs: list[tuple[int, int]] = []
    ksigs: list[str] = []
    track_names: list[str] = []
    track_note_counts: list[int] = []
    track_has_channel_msgs: list[bool] = []
    bank17_events: list[dict[str, int]] = []
    cc10_by_ch: dict[int, list[int]] = {}
    prog_by_ch: dict[int, int] = {}
    notes_by_ch: dict[int, list[tuple[int, int, int, int]]] = {}  # (start_tick, end_tick, pitch, vel)
    invalid_notes = 0
    max_note_tick = 0
    max_event_tick = 0

    for idx, tr in enumerate(mid.tracks):
        t = 0
        tr_name = ""
        tr_notes = 0
        has_ch = False
        open_notes: dict[tuple[int, int], list[tuple[int, int]]] = {}

        for msg in tr:
            t += msg.time
            if t > max_event_tick:
                max_event_tick = t
            if msg.type == "track_name":
                tr_name = (msg.name or "").strip()
            elif msg.type == "set_tempo":
                tempos.append(float(mido.tempo2bpm(msg.tempo)))
            elif msg.type == "time_signature":
                tsigs.append((int(msg.numerator), int(msg.denominator)))
            elif msg.type == "key_signature":
                ksigs.append(str(msg.key))
            elif hasattr(msg, "channel"):
                has_ch = True
                ch = int(msg.channel)
                if msg.type == "program_change":
                    prog_by_ch.setdefault(ch, int(msg.program))
                elif msg.type == "control_change":
                    if msg.control == 0 and msg.value == 17:
                        bank17_events.append({"track": idx, "ch": ch, "tick": t})
                    elif msg.control == 10:
                        cc10_by_ch.setdefault(ch, []).append(int(msg.value))
                elif msg.type == "note_on" and msg.velocity > 0:
                    tr_notes += 1
                    if not (1 <= msg.velocity <= 127) or not (21 <= msg.note <= 108):
                        invalid_notes += 1
                    open_notes.setdefault((ch, int(msg.note)), []).append((t, int(msg.velocity)))
                    if t > max_note_tick:
                        max_note_tick = t
                elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                    q = open_notes.get((ch, int(msg.note)))
                    if q:
                        s_t, vel = q.pop(0)
                        e_t = max(s_t + 1, t)
                        notes_by_ch.setdefault(ch, []).append((s_t, e_t, int(msg.note), vel))
                        if e_t > max_note_tick:
                            max_note_tick = e_t

        # Close any unclosed notes at track end
        for (ch, pitch), q in open_notes.items():
            for s_t, vel in q:
                e_t = max(s_t + 1, t)
                notes_by_ch.setdefault(ch, []).append((s_t, e_t, pitch, vel))
                if e_t > max_note_tick:
                    max_note_tick = e_t

        track_names.append(tr_name)
        track_note_counts.append(tr_notes)
        track_has_channel_msgs.append(has_ch)

    bpm = tempos[0] if tempos else None
    tsig = tsigs[0] if tsigs else None
    ksig = ksigs[0] if ksigs else None

    qbeats = (tsig[0] * (4.0 / tsig[1])) if tsig else spec["qbeats"]
    end_beat = max_note_tick / float(tpb) if tpb else 0.0
    bars = math.ceil((end_beat - 1e-3) / qbeats) if qbeats > 0 else 0

    # Instrument tracks: non-tempo tracks (idx >= 1, or idx == 0 only if it has channel msgs)
    inst_indices = [i for i in range(len(mid.tracks)) if i >= 1 or track_has_channel_msgs[i]]
    active_inst_tracks = sum(1 for i in inst_indices if track_note_counts[i] > 0)
    empty_inst_tracks = sum(1 for i in inst_indices if track_note_counts[i] == 0)
    unnamed_tracks = [i for i, nm in enumerate(track_names) if not nm]

    # First 2s activity
    notes_2s = 0
    active_chs_2s: set[int] = set()
    progs_2s: set[int] = set()
    if bpm and tpb:
        two_s_ticks = 2.0 * (bpm / 60.0) * tpb
        for ch, nlist in notes_by_ch.items():
            for s_t, _, _, _ in nlist:
                if s_t < two_s_ticks:
                    notes_2s += 1
                    active_chs_2s.add(ch)
                    if ch != 9:
                        progs_2s.add(prog_by_ch.get(ch, 0))

    # Dynamic melody track selection:
    # Prefer ch == 0 if >= 30 notes, else highest mean-pitch non-bass non-drum track with >= 30 notes
    mel_ch: int | None = None
    if len(notes_by_ch.get(0, [])) >= 30:
        mel_ch = 0
    else:
        candidates = []
        for ch, nlist in notes_by_ch.items():
            if ch == 9 or len(nlist) < 30:
                continue
            prog = prog_by_ch.get(ch, 0)
            is_bass = (32 <= prog <= 39) or ch == 3
            mean_p = sum(n[2] for n in nlist) / len(nlist)
            candidates.append((0 if is_bass else 1, mean_p, len(nlist), ch))
        if candidates:
            candidates.sort(reverse=True)
            mel_ch = candidates[0][3]
        elif notes_by_ch:
            non_drum = [(len(nl), ch) for ch, nl in notes_by_ch.items() if ch != 9 and nl]
            if non_drum:
                non_drum.sort(reverse=True)
                mel_ch = non_drum[0][1]

    mel_notes = sorted(notes_by_ch.get(mel_ch, []), key=lambda x: (x[0], x[2])) if mel_ch is not None else []
    mel_lead_prog = prog_by_ch.get(mel_ch, 0) if mel_ch is not None else None

    # Pitch-class stats across all non-drum channels (for Echo Caves A Dorian)
    pc_counts = Counter()
    pc_dur_beats = Counter()
    total_nondrum_dur = 0.0
    for ch, nlist in notes_by_ch.items():
        if ch == 9:
            continue
        for s_t, e_t, pitch, _ in nlist:
            d_beats = max(1, e_t - s_t) / float(tpb)
            pc = pitch % 12
            pc_counts[pc] += 1
            pc_dur_beats[pc] += d_beats
            total_nondrum_dur += d_beats

    # CC10 panning stats across non-drum channels
    nondrum_cc10 = [v for ch, vals in cc10_by_ch.items() if ch != 9 for v in vals]
    cc10_per_ch = {
        ch: {"unique": len(set(vals)), "range": (max(vals) - min(vals)) if vals else 0, "vals": sorted(set(vals))}
        for ch, vals in cc10_by_ch.items()
        if ch != 9 and vals
    }
    cc10_range_all = (max(nondrum_cc10) - min(nondrum_cc10)) if nondrum_cc10 else 0
    cc10_max_ch_unique = max((d["unique"] for d in cc10_per_ch.values()), default=0)
    cc10_max_ch_range = max((d["range"] for d in cc10_per_ch.values()), default=0)

    nondrum_progs = {prog_by_ch.get(ch, 0) for ch, nl in notes_by_ch.items() if ch != 9 and len(nl) > 0}
    nondrum_mean_pitch = None
    all_nd_pitches = [n[2] for ch, nl in notes_by_ch.items() if ch != 9 for n in nl]
    if all_nd_pitches:
        nondrum_mean_pitch = sum(all_nd_pitches) / len(all_nd_pitches)

    return {
        "exists": True,
        "path": str(midi_path),
        "tpb": tpb,
        "n_tracks": len(mid.tracks),
        "tempos": tempos,
        "bpm": round(bpm, 3) if bpm is not None else None,
        "tsig": tsig,
        "ksig": ksig,
        "qbeats": qbeats,
        "end_beat": round(end_beat, 4),
        "bars": bars,
        "track_names": track_names,
        "unnamed_tracks": unnamed_tracks,
        "active_inst_tracks": active_inst_tracks,
        "empty_inst_tracks": empty_inst_tracks,
        "bank17_count": len(bank17_events),
        "invalid_notes": invalid_notes,
        "notes_2s": notes_2s,
        "active_chs_2s": sorted(active_chs_2s),
        "progs_2s": sorted(progs_2s),
        "mel_ch": mel_ch,
        "mel_lead_prog": mel_lead_prog,
        "mel_notes": mel_notes,
        "mel_mean_pitch": round(sum(n[2] for n in mel_notes) / len(mel_notes), 2) if mel_notes else None,
        "nondrum_progs": sorted(nondrum_progs),
        "nondrum_mean_pitch": round(nondrum_mean_pitch, 2) if nondrum_mean_pitch is not None else None,
        "drum_notes": len(notes_by_ch.get(9, [])),
        "total_notes": sum(len(nl) for nl in notes_by_ch.values()),
        "pc_counts": dict(pc_counts),
        "pc_dur_beats": {k: round(v, 3) for k, v in pc_dur_beats.items()},
        "total_nondrum_dur": round(total_nondrum_dur, 3),
        "cc10_range_all": cc10_range_all,
        "cc10_max_ch_unique": cc10_max_ch_unique,
        "cc10_max_ch_range": cc10_max_ch_range,
        "cc10_per_ch": cc10_per_ch,
    }


def melody_features(midi_info: dict[str, Any], tpb: int, qbeats: float) -> dict[str, Any]:
    notes = midi_info.get("mel_notes", [])
    pc_vec = [0.0] * 12
    for s_t, e_t, p, _ in notes:
        pc_vec[p % 12] += max(1, e_t - s_t) / float(tpb or 480)

    sec_a_end = int(8 * qbeats * (tpb or 480))
    sec_a_notes = [n for n in notes if n[0] < sec_a_end]

    def bigrams(nl: list[tuple[int, int, int, int]]) -> tuple[Counter[tuple[int, int]], Counter[tuple[int, int]]]:
        pitches = [n[2] for n in nl]
        ivs = [pitches[i + 1] - pitches[i] for i in range(len(pitches) - 1)]
        iv_bg = Counter((ivs[i], ivs[i + 1]) for i in range(len(ivs) - 1))
        pc_bg = Counter((pitches[i] % 12, pitches[i + 1] % 12) for i in range(len(pitches) - 1))
        return iv_bg, pc_bg

    iv_bg, pc_bg = bigrams(notes)
    sec_a_iv_bg, sec_a_pc_bg = bigrams(sec_a_notes)
    return {
        "pc_vec": pc_vec,
        "iv_bg": iv_bg,
        "pc_bg": pc_bg,
        "secA_iv_bg": sec_a_iv_bg,
        "secA_pc_bg": sec_a_pc_bg,
    }


def parse_sw_js() -> dict[str, Any]:
    if not SW_JS.is_file():
        return {"exists": False, "error": "game/sw.js not found"}
    text = SW_JS.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"var\s+FILES\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not m:
        return {"exists": True, "error": "Could not locate var FILES = [...] in game/sw.js"}
    entries = [match[1] for match in re.findall(r"""(['"])((?:\\.|(?!\1).)*)\1""", m.group(1))]
    entry_set = set(entries)
    expected_regional = {f"{s['name']}.mp3" for s in CANONICAL_SPECS}
    expected_utility = set(UTILITY_MP3S)
    expected_all = expected_regional | expected_utility
    missing = sorted(expected_all - entry_set)
    only_seven_night_missing = bool(missing) and set(missing).issubset(SEVEN_REGION_NIGHT_MP3S)
    cache_m = re.search(r"""var\s+CACHE\s*=\s*(['"])(.*?)\1""", text)
    return {
        "exists": True,
        "cache": cache_m.group(2) if cache_m else None,
        "entries_count": len(entries),
        "missing": missing,
        "only_seven_night_missing": only_seven_night_missing,
    }


def parse_review_html() -> dict[str, Any]:
    if not REVIEW_HTML.is_file():
        return {"exists": False, "error": "review-site/music-review.html not found"}
    text = REVIEW_HTML.read_text(encoding="utf-8", errors="replace")
    autoplay_html = bool(re.search(r"<audio\b[^>]*\bautoplay\b", text, re.I))
    autoplay_js = bool(re.search(r"\.autoplay\s*=\s*true", text, re.I))

    m = re.search(r"var\s+REGIONS\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not m:
        return {
            "exists": True,
            "autoplay_found": autoplay_html or autoplay_js,
            "error": "Could not locate var REGIONS = [...] in review-site/music-review.html",
        }
    body = m.group(1)
    objs = re.findall(r"\{(.*?)\}", body, re.S)
    regions: list[dict[str, Any]] = []
    kv_re = re.compile(r"""(\w+)\s*:\s*(['"])((?:\\.|(?!\2).)*)\2""")
    for obj in objs:
        d = {k: v for k, _, v in kv_re.findall(obj)}
        if "id" in d:
            bpm_m = re.search(r"(\d+)\s*/\s*(\d+)\s*BPM", d.get("meta", ""), re.I)
            if bpm_m:
                d["day_bpm"] = int(bpm_m.group(1))
                d["night_bpm"] = int(bpm_m.group(2))
            regions.append(d)

    return {
        "exists": True,
        "autoplay_found": autoplay_html or autoplay_js,
        "regions": regions,
    }


def inspect_list_json_contract() -> dict[str, Any]:
    """Safely inspect compose_soundtrack.py source text before ever passing --list-json."""
    if not COMPOSE_PY.is_file():
        return {"exists": False, "supported": False, "error": "compose_soundtrack.py not found"}
    src = COMPOSE_PY.read_text(encoding="utf-8", errors="replace")
    # CRITICAL SAFETY GUARD: never pass --list-json unless explicitly handled in source
    has_flag = bool(re.search(r"""['"]--list-json['"]""", src))
    if not has_flag:
        return {
            "exists": True,
            "supported": False,
            "error": "compose_soundtrack.py does not implement --list-json (invocation skipped for safety)",
        }

    proc = subprocess.run(
        [sys.executable, str(COMPOSE_PY), "--list-json"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return {
            "exists": True,
            "supported": True,
            "error": f"--list-json exited {proc.returncode}: {proc.stderr.strip()[:300]}",
        }
    try:
        payload = json.loads(proc.stdout)
    except Exception as exc:
        return {"exists": True, "supported": True, "error": f"Invalid JSON from --list-json: {exc}"}

    by_name: dict[str, dict[str, Any]] = {}
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and "name" in item:
                by_name[item["name"]] = item
    elif isinstance(payload, dict):
        if "tracks" in payload and isinstance(payload["tracks"], list):
            for item in payload["tracks"]:
                if isinstance(item, dict) and "name" in item:
                    by_name[item["name"]] = item
        else:
            for k, v in payload.items():
                if isinstance(v, dict):
                    item = dict(v)
                    item.setdefault("name", k)
                    by_name[item["name"]] = item

    return {"exists": True, "supported": True, "tracks": by_name}


def parse_track_filter(raw_tracks: list[str] | None) -> list[str] | None:
    if not raw_tracks:
        return None
    selected: list[str] = []
    for item in raw_tracks:
        for part in item.split(","):
            t = part.strip()
            if not t:
                continue
            if t not in SPEC_BY_NAME:
                raise SystemExit(f"Unknown track '{t}'. Valid tracks: {', '.join(SPEC_BY_NAME)}")
            if t not in selected:
                selected.append(t)
    return selected or None


def main() -> int:
    parser = argparse.ArgumentParser(description="Coral Classroom 16-Track Soundtrack Verifier")
    mode_grp = parser.add_mutually_exclusive_group()
    mode_grp.add_argument(
        "--strict-upgrade",
        action="store_true",
        help="Strict post-M1..M4 mode (default): exit 1 on any check failure.",
    )
    mode_grp.add_argument(
        "--baseline-ok",
        action="store_true",
        help="Tag known pre-M1..M4 upgrade gaps as BASELINE_GAP and exit 0 iff all remaining checks pass.",
    )
    parser.add_argument(
        "--tier",
        choices=["1", "2", "3", "4", "all"],
        default="all",
        help="Filter verification checks by tier (default: all).",
    )
    parser.add_argument(
        "--track",
        action="append",
        help="Filter per-track checks (repeatable or comma-separated).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON report to stdout.",
    )
    args = parser.parse_args()

    baseline_ok = bool(args.baseline_ok)
    selected_tracks = parse_track_filter(args.track)
    track_set = set(selected_tracks) if selected_tracks else set(SPEC_BY_NAME)
    selected_regions = [
        r for r in REGION_ORDER if any(t in track_set for t in REGION_PAIRS[r])
    ]

    # Determine which tracks need MP3/MIDI analysis (include twins for region pair checks)
    tracks_to_analyze: list[str] = []
    for r in selected_regions:
        for t in REGION_PAIRS[r]:
            if t not in tracks_to_analyze:
                tracks_to_analyze.append(t)
    if args.tier in ("3", "4", "all") and selected_tracks is None:
        tracks_to_analyze = [s["name"] for s in CANONICAL_SPECS]

    mp3_data: dict[str, dict[str, Any]] = {}
    midi_data: dict[str, dict[str, Any]] = {}
    for name in tracks_to_analyze:
        spec = SPEC_BY_NAME[name]
        mp3_data[name] = analyze_mp3(name)
        midi_data[name] = analyze_midi(name, spec)

    cc = CheckCollector(baseline_ok=baseline_ok, tier_filter=args.tier)

    # ------------------------------------------------------------------
    # Tier 1 & Tier 2: Per-Track MP3 + MIDI Checks
    # ------------------------------------------------------------------
    for spec in CANONICAL_SPECS:
        name = spec["name"]
        if name not in track_set:
            continue
        mp = mp3_data[name]
        md = midi_data[name]

        # Tier 1: MP3 existence & size
        if not mp.get("exists"):
            cc.add(f"T1.F1.mp3_exists_size.{name}", 1, "F1", False, f"Missing MP3: {mp.get('path')}", track=name)
            cc.add(f"T1.F1.mp3_format_bitrate.{name}", 1, "F1", False, "Skipped (MP3 missing)", track=name)
            cc.add(f"T1.F1.mp3_duration.{name}", 1, "F1", False, "Skipped (MP3 missing)", track=name)
            cc.add(f"T1.F2.mp3_loudness_headroom.{name}", 1, "F2", False, "Skipped (MP3 missing)", track=name)
            cc.add(f"T1.F2.mp3_stereo_width.{name}", 1, "F2", False, "Skipped (MP3 missing)", track=name)
            cc.add(f"T1.F2.mp3_loop_seam.{name}", 1, "F2", False, "Skipped (MP3 missing)", track=name)
            cc.add(f"T2.F2.mp3_zero_clipping.{name}", 2, "F2", False, "Skipped (MP3 missing)", track=name)
        elif "error" in mp:
            err = mp["error"]
            cc.add(f"T1.F1.mp3_exists_size.{name}", 1, "F1", False, err, track=name)
            cc.add(f"T1.F1.mp3_format_bitrate.{name}", 1, "F1", False, err, track=name)
            cc.add(f"T1.F1.mp3_duration.{name}", 1, "F1", False, err, track=name)
            cc.add(f"T1.F2.mp3_loudness_headroom.{name}", 1, "F2", False, err, track=name)
            cc.add(f"T1.F2.mp3_stereo_width.{name}", 1, "F2", False, err, track=name)
            cc.add(f"T1.F2.mp3_loop_seam.{name}", 1, "F2", False, err, track=name)
            cc.add(f"T2.F2.mp3_zero_clipping.{name}", 2, "F2", False, err, track=name)
        else:
            sz_ok = mp["size_bytes"] > 500 * 1024
            cc.add(
                f"T1.F1.mp3_exists_size.{name}",
                1,
                "F1",
                sz_ok,
                f"size={mp['size_kb']} KB (>500 KB)",
                track=name,
            )

            fmt_ok = (
                mp["ff_sr"] == 44100
                and mp["ff_ch"] == 2
                and mp["ff_br"] == 128
                and (124.0 <= mp["calc_br"] <= 132.0)
            )
            cc.add(
                f"T1.F1.mp3_format_bitrate.{name}",
                1,
                "F1",
                fmt_ok,
                f"sr={mp['ff_sr']}, ch={mp['ff_ch']}, ff_br={mp['ff_br']}k, calc_br={mp['calc_br']} kbps",
                track=name,
            )

            dur_ok = 85.0 <= mp["pcm_dur"] <= 175.0
            cc.add(
                f"T1.F1.mp3_duration.{name}",
                1,
                "F1",
                dur_ok,
                f"pcm_dur={mp['pcm_dur']}s (expected 85.0..175.0s)",
                track=name,
            )

            loud_ok = (mp["peak_dbfs"] < -0.5) and (-27.0 <= mp["rms_dbfs"] <= -16.0)
            cc.add(
                f"T1.F2.mp3_loudness_headroom.{name}",
                1,
                "F2",
                loud_ok,
                f"peak={mp['peak_dbfs']} dBFS (<-0.5), rms={mp['rms_dbfs']} dBFS (-27..-16)",
                track=name,
            )

            width_ok = (mp["side_mid_ratio"] >= 0.06) and (mp["lr_corr"] <= 0.985)
            cc.add(
                f"T1.F2.mp3_stereo_width.{name}",
                1,
                "F2",
                width_ok,
                f"S/M={mp['side_mid_ratio']} (>=0.06), L/R corr={mp['lr_corr']} (<=0.985)",
                track=name,
            )

            seam_ok = (
                mp["wrap_step"] <= 0.025
                and mp["end_amp"] <= 0.02
                and mp["head_zero_ms"] < 30.0
                and mp["tail_zero_ms"] < 30.0
                and mp["rms_tail500"] >= -40.0
                and mp["rms_2s"] >= -30.0
            )
            cc.add(
                f"T1.F2.mp3_loop_seam.{name}",
                1,
                "F2",
                seam_ok,
                (
                    f"wrap_step={mp['wrap_step']}, end_amp={mp['end_amp']}, "
                    f"head0={mp['head_zero_ms']}ms, tail0={mp['tail_zero_ms']}ms, "
                    f"tail500={mp['rms_tail500']}dB, first2s={mp['rms_2s']}dB"
                ),
                track=name,
            )

            clip_ok = (mp["peak_lin"] < 1.0) and (mp["peak_dbfs"] < 0.0) and (mp["head_zero_ms"] < 30.0) and (mp["tail_zero_ms"] < 30.0)
            cc.add(
                f"T2.F2.mp3_zero_clipping.{name}",
                2,
                "F2",
                clip_ok,
                f"peak_lin={mp['peak_lin']} (<1.0), peak_dbfs={mp['peak_dbfs']} (<0.0), zero_gap=({mp['head_zero_ms']},{mp['tail_zero_ms']})ms",
                track=name,
            )

        # Tier 1 & Tier 2: MIDI checks
        if not md.get("exists") or "error" in md:
            err = md.get("error", f"Missing MIDI: {md.get('path')}")
            for cid, t_num, feat in [
                ("T1.F3.midi_parse_tpb", 1, "F3"),
                ("T1.F3.midi_time_key_sig", 1, "F3"),
                ("T1.F4.midi_track_names", 1, "F4"),
                ("T1.F4.midi_instrument_tracks", 1, "F4"),
                ("T1.F5.midi_first_2s", 1, "F5"),
                ("T2.F3.midi_bar_bounds", 2, "F3"),
                ("T2.F4.midi_no_bank17", 2, "F4"),
                ("T2.F4.midi_tempo_sanity", 2, "F4"),
                ("T3.F1.mp3_midi_duration_sync", 3, "F1"),
            ]:
                cc.add(f"{cid}.{name}", t_num, feat, False, err, track=name)
            continue

        tpb_ok = md["tpb"] == EXPECTED_TPB
        cc.add(
            f"T1.F3.midi_parse_tpb.{name}",
            1,
            "F3",
            tpb_ok,
            f"tpb={md['tpb']} (expected {EXPECTED_TPB}), tracks={md['n_tracks']}",
            track=name,
        )

        tsig = md["tsig"]
        ksig = md["ksig"]
        tsig_missing = tsig is None
        ksig_missing = ksig is None
        tsig_valid = (tsig == spec["meter"])
        ksig_valid = (ksig in spec["valid_midi_keys"])
        tk_ok = (not tsig_missing) and (not ksig_missing) and tsig_valid and ksig_valid
        # Only missing tsig/ksig is a known baseline gap; wrong present tsig/ksig is a real FAIL
        tk_baseline_gap = (tsig_missing or ksig_missing) and (tsig_missing or tsig_valid) and (ksig_missing or ksig_valid)
        cc.add(
            f"T1.F3.midi_time_key_sig.{name}",
            1,
            "F3",
            tk_ok,
            f"time_sig={tsig} (exp {spec['meter']}), key_sig={ksig} (exp in {sorted(spec['valid_midi_keys'])})",
            track=name,
            baseline_known_gap=tk_baseline_gap,
        )

        unnamed = md["unnamed_tracks"]
        names_ok = len(unnamed) == 0
        cc.add(
            f"T1.F4.midi_track_names.{name}",
            1,
            "F4",
            names_ok,
            f"unnamed_tracks={unnamed} (total={md['n_tracks']})",
            track=name,
            baseline_known_gap=not names_ok,
        )

        act = md["active_inst_tracks"]
        emp = md["empty_inst_tracks"]
        inst_ok = (act >= 5) and (emp == 0)
        cc.add(
            f"T1.F4.midi_instrument_tracks.{name}",
            1,
            "F4",
            inst_ok,
            f"active_inst_tracks={act} (>=5), empty_0note_tracks={emp} (==0)",
            track=name,
            baseline_known_gap=(act >= 5 and emp > 0),
        )

        first2s_ok = (md["notes_2s"] >= 6) and (len(md["active_chs_2s"]) >= 3)
        cc.add(
            f"T1.F5.midi_first_2s.{name}",
            1,
            "F5",
            first2s_ok,
            f"notes_2s={md['notes_2s']} (>=6), active_chs_2s={md['active_chs_2s']} (>=3)",
            track=name,
        )

        if spec["region"] == "caves":
            f_sharp_cnt = md["pc_counts"].get(6, 0)
            f_nat_cnt = md["pc_counts"].get(5, 0)
            f_sharp_dur = md["pc_dur_beats"].get(6, 0.0)
            f_nat_dur = md["pc_dur_beats"].get(5, 0.0)
            tot_dur = max(1e-6, md["total_nondrum_dur"])
            f_nat_ratio = f_nat_dur / tot_dur
            dorian_ok = (
                f_sharp_cnt >= 8
                and f_sharp_dur >= 4.0
                and f_sharp_cnt > 3 * f_nat_cnt
                and f_sharp_dur > 3 * f_nat_dur
                and f_nat_ratio <= 0.015
            )
            cc.add(
                f"T1.F5.caves_dorian.{name}",
                1,
                "F5",
                dorian_ok,
                (
                    f"F#={f_sharp_cnt} notes/{f_sharp_dur:.1f}b, "
                    f"F={f_nat_cnt} notes/{f_nat_dur:.1f}b (ratio={f_nat_ratio:.4f})"
                ),
                track=name,
                baseline_known_gap=not dorian_ok,
            )

        if spec["region"] == "caves":
            cc10_ok = md["cc10_range_all"] >= 40
            cc.add(
                f"T1.F5.stereo_cc10.{name}",
                1,
                "F5",
                cc10_ok,
                f"non-drum CC10 range={md['cc10_range_all']} (>=40), per_ch={md['cc10_per_ch']}",
                track=name,
            )
        elif name == "region-light-night-song":
            cc10_ok = (md["cc10_max_ch_unique"] >= 4) and (md["cc10_max_ch_range"] >= 50)
            cc.add(
                f"T1.F5.stereo_cc10.{name}",
                1,
                "F5",
                cc10_ok,
                f"max_ch_unique={md['cc10_max_ch_unique']} (>=4), max_ch_range={md['cc10_max_ch_range']} (>=50)",
                track=name,
            )

        # Tier 2 MIDI boundaries
        qbeats = md["qbeats"]
        bars = md["bars"]
        end_beat = md["end_beat"]
        bars_ok = (
            48 <= bars <= 64
            and bars == spec["bars"]
            and end_beat <= bars * qbeats + 0.15
            and end_beat >= (bars - 1) * qbeats + 0.5
        )
        cc.add(
            f"T2.F3.midi_bar_bounds.{name}",
            2,
            "F3",
            bars_ok,
            f"bars={bars} (exp {spec['bars']}), qbeats={qbeats}, end_beat={end_beat}",
            track=name,
        )

        bank17_ok = md["bank17_count"] == 0
        cc.add(
            f"T2.F4.midi_no_bank17.{name}",
            2,
            "F4",
            bank17_ok,
            f"CC0==17 count={md['bank17_count']} (must be 0)",
            track=name,
        )

        bpm = md["bpm"]
        tempo_ok = (bpm is not None) and (60.0 <= bpm <= 160.0) and (md["invalid_notes"] == 0)
        cc.add(
            f"T2.F4.midi_tempo_sanity.{name}",
            2,
            "F4",
            tempo_ok,
            f"bpm={bpm} (60..160), invalid_notes={md['invalid_notes']}",
            track=name,
        )

        # Tier 3: MP3 <-> MIDI Duration Sync
        if mp.get("exists") and "error" not in mp and bpm:
            exp_s = bars * qbeats * 60.0 / bpm
            diff_s = abs(mp["pcm_dur"] - exp_s)
            sync_ok = diff_s <= 0.75
            cc.add(
                f"T3.F1.mp3_midi_duration_sync.{name}",
                3,
                "F1",
                sync_ok,
                f"pcm_dur={mp['pcm_dur']}s, midi_exp={exp_s:.3f}s, |diff|={diff_s:.3f}s (<=0.75s)",
                track=name,
            )
        else:
            cc.add(
                f"T3.F1.mp3_midi_duration_sync.{name}",
                3,
                "F1",
                False,
                "Cannot compare MP3 vs MIDI duration due to decode/tempo error",
                track=name,
            )

    # ------------------------------------------------------------------
    # Tier 3: Regional Day/Night Twins, Cross-Region Distinctness, Parity
    # ------------------------------------------------------------------
    pair_metrics: dict[str, dict[str, Any]] = {}
    for reg in selected_regions:
        day_name, night_name = REGION_PAIRS[reg]
        md_d = midi_data.get(day_name, {})
        md_n = midi_data.get(night_name, {})
        if not (md_d.get("exists") and md_n.get("exists") and "error" not in md_d and "error" not in md_n):
            cc.add(f"T3.F5.twin_contrast.{reg}", 3, "F5", False, "Day/Night MIDI missing or invalid")
            cc.add(f"T3.F5.twin_motif_dna.{reg}", 3, "F5", False, "Day/Night MIDI missing or invalid")
            continue

        bpm_d = md_d["bpm"] or 0.0
        bpm_n = md_n["bpm"] or 0.0
        bpm_delta = bpm_d - bpm_n
        p_d = set(md_d["nondrum_progs"])
        p_n = set(md_n["nondrum_progs"])
        prog_jacc = len(p_d & p_n) / float(len(p_d | p_n)) if (p_d | p_n) else 1.0
        arr_diff = (
            (p_d != p_n)
            or (md_d["drum_notes"] != md_n["drum_notes"])
            or (md_d["nondrum_mean_pitch"] != md_n["nondrum_mean_pitch"])
        )
        contrast_ok = (bpm_delta >= 10.0) and (prog_jacc <= 0.65) and arr_diff
        cc.add(
            f"T3.F5.twin_contrast.{reg}",
            3,
            "F5",
            contrast_ok,
            f"bpm_delta={bpm_delta:.1f} (>=10), prog_jacc={prog_jacc:.3f} (<=0.65), arr_diff={arr_diff}",
        )

        feat_d = melody_features(md_d, md_d["tpb"], md_d["qbeats"])
        feat_n = melody_features(md_n, md_n["tpb"], md_n["qbeats"])
        pc_cos = cosine_12(feat_d["pc_vec"], feat_n["pc_vec"])
        iv_bg_jacc = weighted_jaccard(feat_d["iv_bg"], feat_n["iv_bg"])
        pc_bg_jacc = weighted_jaccard(feat_d["pc_bg"], feat_n["pc_bg"])
        seca_iv_jacc = weighted_jaccard(feat_d["secA_iv_bg"], feat_n["secA_iv_bg"])
        seca_pc_jacc = weighted_jaccard(feat_d["secA_pc_bg"], feat_n["secA_pc_bg"])
        best_bg = max(iv_bg_jacc, pc_bg_jacc, seca_iv_jacc, seca_pc_jacc)
        motif_ok = (pc_cos >= 0.78) and (best_bg >= 0.43)
        pair_metrics[reg] = {
            "bpm_delta": round(bpm_delta, 2),
            "prog_jacc": round(prog_jacc, 4),
            "pc_cos": round(pc_cos, 4),
            "iv_bg_jacc": round(iv_bg_jacc, 4),
            "pc_bg_jacc": round(pc_bg_jacc, 4),
            "secA_iv_bg_jacc": round(seca_iv_jacc, 4),
            "secA_pc_bg_jacc": round(seca_pc_jacc, 4),
        }
        cc.add(
            f"T3.F5.twin_motif_dna.{reg}",
            3,
            "F5",
            motif_ok,
            (
                f"mel_ch=({md_d['mel_ch']},{md_n['mel_ch']}), pc_cos={pc_cos:.3f} (>=0.78), "
                f"max_bg_jacc={best_bg:.3f} (>=0.43; iv={iv_bg_jacc:.3f}, pc={pc_bg_jacc:.3f}, "
                f"secA_iv={seca_iv_jacc:.3f}, secA_pc={seca_pc_jacc:.3f})"
            ),
        )

    # Cross-region 2s distinctness (Day & Night) when running full-suite / unfiltered
    if selected_tracks is None:
        for mode_label, idx_pair in [("day", 0), ("night", 1)]:
            sigs: dict[tuple[Any, ...], list[str]] = {}
            feats: dict[str, dict[str, Any]] = {}
            all_ok = True
            for reg in REGION_ORDER:
                tname = REGION_PAIRS[reg][idx_pair]
                spec = SPEC_BY_NAME[tname]
                md = midi_data[tname]
                if not md.get("exists") or "error" in md:
                    all_ok = False
                    continue
                sig = (spec["meter"], spec["key"], md["mel_lead_prog"], tuple(md["progs_2s"]))
                sigs.setdefault(sig, []).append(reg)
                feats[reg] = melody_features(md, md["tpb"], md["qbeats"])

            collisions = [regs for regs in sigs.values() if len(regs) > 1]
            max_sec_a = 0.0
            max_pair = None
            regs_list = list(feats.keys())
            for i in range(len(regs_list)):
                for j in range(i + 1, len(regs_list)):
                    r1, r2 = regs_list[i], regs_list[j]
                    ov = max(
                        weighted_jaccard(feats[r1]["secA_iv_bg"], feats[r2]["secA_iv_bg"]),
                        weighted_jaccard(feats[r1]["secA_pc_bg"], feats[r2]["secA_pc_bg"]),
                    )
                    if ov > max_sec_a:
                        max_sec_a = ov
                        max_pair = f"{r1}/{r2}"
            distinct_ok = all_ok and (len(collisions) == 0) and (max_sec_a < 0.43)
            cc.add(
                f"T3.F5.cross_region_distinctness.{mode_label}",
                3,
                "F5",
                distinct_ok,
                f"2s_sig_collisions={collisions}, max_secA_cross_overlap={max_sec_a:.3f} ({max_pair}) (<0.43)",
            )

    # SW & Audition HTML & --list-json parity
    sw_info = parse_sw_js()
    if not sw_info.get("exists") or "error" in sw_info:
        cc.add("T3.F6.sw_precache_parity", 3, "F6", False, sw_info.get("error", "sw.js error"))
    else:
        missing = sw_info["missing"]
        sw_ok = len(missing) == 0
        cc.add(
            "T3.F6.sw_precache_parity",
            3,
            "F6",
            sw_ok,
            f"cache={sw_info['cache']}, entries={sw_info['entries_count']}, missing={missing}",
            baseline_known_gap=sw_info["only_seven_night_missing"],
        )

    list_json_info = inspect_list_json_contract()
    html_info = parse_review_html()
    bpm_drift_regions: list[str] = []
    html_structural_errors: list[str] = []

    if not html_info.get("exists") or "error" in html_info:
        html_structural_errors.append(html_info.get("error", "music-review.html parse error"))
    else:
        if html_info["autoplay_found"]:
            html_structural_errors.append("autoplay attribute or property found")
        regs_parsed = html_info["regions"]
        if len(regs_parsed) != 8:
            html_structural_errors.append(f"expected 8 regions, found {len(regs_parsed)}")
        by_id = {r.get("id"): r for r in regs_parsed}
        for reg in REGION_ORDER:
            if reg not in by_id:
                html_structural_errors.append(f"missing region id '{reg}'")
                continue
            r_obj = by_id[reg]
            d_name, n_name = REGION_PAIRS[reg]
            if r_obj.get("day") != d_name or r_obj.get("night") != n_name:
                html_structural_errors.append(
                    f"region '{reg}' tracks ({r_obj.get('day')}, {r_obj.get('night')}) != ({d_name}, {n_name})"
                )
            spec_d = SPEC_BY_NAME[d_name]
            meta = r_obj.get("meta", "")
            meter_str = f"{spec_d['meter'][0]}/{spec_d['meter'][1]}"
            if meter_str not in meta:
                html_structural_errors.append(f"region '{reg}' meta '{meta}' missing meter {meter_str}")
            if not re.search(spec_d["html_key_re"], meta, re.I):
                html_structural_errors.append(f"region '{reg}' meta '{meta}' missing key matching {spec_d['key']}")
            if "day_bpm" not in r_obj or "night_bpm" not in r_obj:
                html_structural_errors.append(f"region '{reg}' meta '{meta}' missing Day/Night BPM")
            else:
                md_d = midi_data.get(d_name, {})
                md_n = midi_data.get(n_name, {})
                reg_drifts: list[str] = []
                if md_d.get("bpm") and md_n.get("bpm"):
                    exp_d_bpm = round(md_d["bpm"])
                    exp_n_bpm = round(md_n["bpm"])
                    if r_obj["day_bpm"] != exp_d_bpm or r_obj["night_bpm"] != exp_n_bpm:
                        reg_drifts.append(f"midi={exp_d_bpm}/{exp_n_bpm}")
                if list_json_info.get("supported") and "tracks" in list_json_info:
                    lj_d = list_json_info["tracks"].get(d_name, {})
                    lj_n = list_json_info["tracks"].get(n_name, {})
                    if lj_d.get("bpm") and lj_n.get("bpm"):
                        lj_d_bpm = round(lj_d["bpm"])
                        lj_n_bpm = round(lj_n["bpm"])
                        if r_obj["day_bpm"] != lj_d_bpm or r_obj["night_bpm"] != lj_n_bpm:
                            reg_drifts.append(f"list-json={lj_d_bpm}/{lj_n_bpm}")
                if reg_drifts:
                    bpm_drift_regions.append(
                        f"{reg}: html={r_obj['day_bpm']}/{r_obj['night_bpm']} vs {', '.join(reg_drifts)}"
                    )

    html_ok = (len(html_structural_errors) == 0) and (len(bpm_drift_regions) == 0)
    html_only_bpm_drift = (len(html_structural_errors) == 0) and (len(bpm_drift_regions) > 0)
    cc.add(
        "T3.F6.review_html_parity",
        3,
        "F6",
        html_ok,
        f"structural_errors={html_structural_errors}, bpm_drift={bpm_drift_regions}",
        baseline_known_gap=html_only_bpm_drift,
    )

    # ------------------------------------------------------------------
    # Tier 4: Real-World End-to-End Scenarios
    # ------------------------------------------------------------------
    # Scenario 1: Album Mastering & Loop Seam Audit
    s1_issues = [
        f"{t}:{mp.get('error', 'failed')}"
        for t, mp in mp3_data.items()
        if not mp.get("exists")
        or "error" in mp
        or mp["size_bytes"] <= 500 * 1024
        or mp["ff_sr"] != 44100
        or mp["ff_ch"] != 2
        or mp["ff_br"] != 128
        or not (124.0 <= mp["calc_br"] <= 132.0)
        or not (85.0 <= mp["pcm_dur"] <= 175.0)
        or mp["peak_dbfs"] >= -0.5
        or not (-27.0 <= mp["rms_dbfs"] <= -16.0)
        or mp["side_mid_ratio"] < 0.06
        or mp["lr_corr"] > 0.985
        or mp["wrap_step"] > 0.025
        or mp["end_amp"] > 0.02
        or mp["head_zero_ms"] >= 30.0
        or mp["tail_zero_ms"] >= 30.0
        or mp["rms_tail500"] < -40.0
        or mp["rms_2s"] < -30.0
    ]
    cc.add(
        "T4.S1.album_mastering_loop_audit",
        4,
        "F1/F2",
        len(s1_issues) == 0,
        f"tracks_checked={len(mp3_data)}, issues={s1_issues}",
    )

    # Scenario 2: MIDI Orchestration, Time Signature & Echo Caves A Dorian Audit
    s2_hard_issues: list[str] = []
    s2_baseline_gaps: list[str] = []
    for t, md in midi_data.items():
        spec = SPEC_BY_NAME[t]
        if not md.get("exists") or "error" in md:
            s2_hard_issues.append(f"{t}:missing_or_invalid")
            continue
        if md["tpb"] != EXPECTED_TPB or md["bars"] != spec["bars"] or md["bank17_count"] > 0 or md["active_inst_tracks"] < 5:
            s2_hard_issues.append(f"{t}:structure_fail")
        if md["notes_2s"] < 6 or len(md["active_chs_2s"]) < 3:
            s2_hard_issues.append(f"{t}:first2s_sparse")
        if md["tsig"] is not None and md["tsig"] != spec["meter"]:
            s2_hard_issues.append(f"{t}:wrong_tsig_{md['tsig']}")
        if md["ksig"] is not None and md["ksig"] not in spec["valid_midi_keys"]:
            s2_hard_issues.append(f"{t}:wrong_ksig_{md['ksig']}")
        if md["tsig"] is None or md["ksig"] is None or md["unnamed_tracks"] or md["empty_inst_tracks"] > 0:
            s2_baseline_gaps.append(f"{t}:meta_or_empty")
        if spec["region"] == "caves":
            if md["cc10_range_all"] < 40:
                s2_hard_issues.append(f"{t}:cc10_range_{md['cc10_range_all']}")
            f_sharp_cnt = md["pc_counts"].get(6, 0)
            f_nat_cnt = md["pc_counts"].get(5, 0)
            f_sharp_dur = md["pc_dur_beats"].get(6, 0.0)
            f_nat_dur = md["pc_dur_beats"].get(5, 0.0)
            f_ratio = f_nat_dur / max(1e-6, md["total_nondrum_dur"])
            if not (f_sharp_cnt >= 8 and f_sharp_dur >= 4.0 and f_sharp_cnt > 3 * f_nat_cnt and f_sharp_dur > 3 * f_nat_dur and f_ratio <= 0.015):
                s2_baseline_gaps.append(f"{t}:dorian_F#")

    s2_ok = (len(s2_hard_issues) == 0) and (len(s2_baseline_gaps) == 0)
    cc.add(
        "T4.S2.midi_orchestration_tonal_audit",
        4,
        "F3/F4/F5",
        s2_ok,
        f"tracks_checked={len(midi_data)}, hard_issues={s2_hard_issues}, baseline_gaps={s2_baseline_gaps}",
        baseline_known_gap=(len(s2_hard_issues) == 0 and len(s2_baseline_gaps) > 0),
    )

    # Scenario 3a: compose_soundtrack.py --list-json contract
    lj_hard_errors: list[str] = []
    if not list_json_info.get("supported"):
        lj_ok = False
        lj_is_baseline_gap = True
        lj_detail = list_json_info.get("error", "--list-json unsupported")
    elif "error" in list_json_info:
        lj_ok = False
        lj_is_baseline_gap = False
        lj_detail = list_json_info["error"]
    else:
        lj_tracks = list_json_info["tracks"]
        for spec in CANONICAL_SPECS:
            t = spec["name"]
            if t not in lj_tracks:
                lj_hard_errors.append(f"missing {t}")
                continue
            item = lj_tracks[t]
            if item.get("bars") != spec["bars"]:
                lj_hard_errors.append(f"{t}: bars={item.get('bars')} != {spec['bars']}")
            m_val = item.get("meter")
            if isinstance(m_val, list):
                m_val = tuple(m_val)
            if m_val != spec["meter"]:
                lj_hard_errors.append(f"{t}: meter={m_val} != {spec['meter']}")
            md = midi_data.get(t, {})
            if md.get("bpm") and item.get("bpm") and abs(float(item["bpm"]) - md["bpm"]) > 0.5:
                lj_hard_errors.append(f"{t}: list-json bpm={item.get('bpm')} != midi {md['bpm']}")
        lj_ok = len(lj_hard_errors) == 0
        lj_is_baseline_gap = False
        lj_detail = f"tracks={len(lj_tracks)}, mismatches={lj_hard_errors}"

    cc.add(
        "T4.S3.compose_list_json_contract",
        4,
        "F6",
        lj_ok,
        lj_detail,
        baseline_known_gap=lj_is_baseline_gap,
    )

    # Scenario 3b: Cross-artifact parity (mp3 + midi + sw.js + music.js + music-review.html)
    music_js_issues: list[str] = []
    if not MUSIC_JS.is_file():
        music_js_issues.append("game/src/js/music.js not found")
    else:
        mjs = MUSIC_JS.read_text(encoding="utf-8", errors="replace")
        for needle in ["RM_SONGS", "RM_ROUTE_OVERRIDES", "createBiquadFilter", "2400"]:
            if needle not in mjs:
                music_js_issues.append(f"music.js missing '{needle}'")
        for reg in REGION_ORDER:
            if reg != "cove" and f"'{reg}'" not in mjs:
                music_js_issues.append(f"music.js missing region '{reg}'")

    parity_hard = list(music_js_issues) + list(html_structural_errors) + list(lj_hard_errors)
    if sw_info.get("exists") and "error" not in sw_info:
        if sw_info["missing"] and not sw_info["only_seven_night_missing"]:
            parity_hard.append(f"sw.js unexpected missing={sw_info['missing']}")
    else:
        parity_hard.append("sw.js invalid")

    parity_gaps: list[str] = []
    if sw_info.get("only_seven_night_missing"):
        parity_gaps.append("sw.js missing 7 region-*-night-song.mp3")
    if bpm_drift_regions:
        parity_gaps.append(f"music-review.html BPM drift ({len(bpm_drift_regions)} regions)")
    if not list_json_info.get("supported"):
        parity_gaps.append("compose_soundtrack.py --list-json missing")

    cc.add(
        "T4.S3.cross_artifact_parity",
        4,
        "F6/F8",
        len(parity_hard) == 0 and len(parity_gaps) == 0,
        f"hard_errors={parity_hard}, baseline_gaps={parity_gaps}",
        baseline_known_gap=(len(parity_hard) == 0 and len(parity_gaps) > 0),
    )

    # Summary & exit code
    n_pass = sum(1 for c in cc.checks if c["status"] == "PASS")
    n_fail = sum(1 for c in cc.checks if c["status"] == "FAIL")
    n_bgap = sum(1 for c in cc.checks if c["status"] == "BASELINE_GAP")
    exit_code = 0 if n_fail == 0 else 1

    # Strip large raw note arrays from JSON metrics output
    midi_summary = {}
    for k, v in midi_data.items():
        d = {kk: vv for kk, vv in v.items() if kk != "mel_notes"}
        d["mel_notes_count"] = len(v.get("mel_notes", []))
        midi_summary[k] = d

    report = {
        "mode": "baseline-ok" if baseline_ok else "strict-upgrade",
        "tier": args.tier,
        "tracks_filter": selected_tracks,
        "summary": {
            "total": len(cc.checks),
            "pass": n_pass,
            "fail": n_fail,
            "baseline_gap": n_bgap,
            "exit_code": exit_code,
        },
        "checks": cc.checks,
        "metrics": {
            "mp3": mp3_data,
            "midi": midi_summary,
            "pairs": pair_metrics,
            "integration": {
                "sw_js": sw_info,
                "review_html_regions": len(html_info.get("regions", [])) if "regions" in html_info else 0,
                "list_json_supported": list_json_info.get("supported", False),
            },
        },
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(
            f"[soundtrack_verify] mode={report['mode']} tier={args.tier} "
            f"total={len(cc.checks)} pass={n_pass} fail={n_fail} baseline_gap={n_bgap}"
        )
        for c in cc.checks:
            if c["status"] != "PASS":
                print(f"  [{c['status']}] T{c['tier']} {c['id']}: {c['detail']}")
        if exit_code == 0:
            print("RESULT: PASS (exit 0)")
        else:
            print("RESULT: FAIL (exit 1)")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
