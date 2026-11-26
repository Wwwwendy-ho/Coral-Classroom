"""Registry and dispatch for all 8 Coral Classroom regional soundtrack modules."""

from . import beach, captain, caves, cove, lagoon, light, patterns, town

REGION_MODULES = [
    cove,
    town,
    lagoon,
    caves,
    patterns,
    beach,
    light,
    captain,
]

ALL_TRACKS = [spec for mod in REGION_MODULES for spec in mod.TRACKS]
TRACK_MODULE_MAP = {spec["name"]: mod for mod in REGION_MODULES for spec in mod.TRACKS}
TRACK_MAP = {spec["name"]: spec for spec in ALL_TRACKS}


def get_track_spec(track_name):
    if track_name not in TRACK_MAP:
        raise KeyError(f"Unknown track: {track_name}")
    return TRACK_MAP[track_name]


def build_track(track_name, engine):
    if track_name not in TRACK_MODULE_MAP:
        raise KeyError(f"Unknown track: {track_name}")
    return TRACK_MODULE_MAP[track_name].build_track(track_name, engine)
