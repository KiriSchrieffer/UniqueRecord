from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import Any

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from unique_record.runtime import load_config
from unique_record.storage import read_last_session_record, read_session_records


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inspect recording session index (JSONL).")
    parser.add_argument(
        "--config",
        default="configs/game_adapters.template.json",
        help="Path to runtime config (used when --index-path is not set).",
    )
    parser.add_argument(
        "--index-path",
        default="",
        help="Explicit index file path. Overrides --config resolution.",
    )
    parser.add_argument(
        "--last",
        action="store_true",
        help="Show only the latest session record.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Max records to show when not using --last.",
    )
    parser.add_argument(
        "--status",
        default="",
        help="Filter by status (e.g. completed, abnormal_end).",
    )
    parser.add_argument(
        "--game-id",
        default="",
        help="Filter by game_id (e.g. league_of_legends).",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON records.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    index_path = _resolve_index_path(args)
    if args.last:
        record = read_last_session_record(index_path)
        if record is None:
            print({"status": "empty", "index_path": str(index_path)})
            return 0
        if not _match_filters(record, status=args.status, game_id=args.game_id):
            print({"status": "empty", "index_path": str(index_path)})
            return 0
        print({"index_path": str(index_path), "count": 1, "mode": "last"})
        _print_record(record, pretty=args.pretty)
        return 0

    records = read_session_records(index_path=index_path, reverse=True)
    filtered = [
        record
        for record in records
        if _match_filters(record, status=args.status, game_id=args.game_id)
    ]
    if args.limit > 0:
        filtered = filtered[: args.limit]

    print({"index_path": str(index_path), "count": len(filtered), "mode": "list"})
    if not filtered:
        return 0
    for record in filtered:
        _print_record(record, pretty=args.pretty)
    return 0


def _resolve_index_path(args: argparse.Namespace) -> pathlib.Path:
    if args.index_path:
        return pathlib.Path(args.index_path).resolve()

    config_path = pathlib.Path(args.config).resolve()
    config = load_config(config_path)
    global_cfg: dict[str, Any]
    raw_global = config.get("global")
    if isinstance(raw_global, dict):
        global_cfg = raw_global
    else:
        global_cfg = {}

    runtime_root = config_path.parent.parent
    index_value = global_cfg.get("recordings_index_path")
    if index_value:
        index_path = pathlib.Path(str(index_value))
        if not index_path.is_absolute():
            index_path = runtime_root / index_path
        return index_path.resolve()

    recordings_value = (
        global_cfg.get("recordings_output_dir")
        or global_cfg.get("recordings_dir")
        or "recordings"
    )
    recordings_dir = pathlib.Path(str(recordings_value))
    if not recordings_dir.is_absolute():
        recordings_dir = runtime_root / recordings_dir
    return (recordings_dir / "recording_index.jsonl").resolve()


def _match_filters(record: dict[str, Any], *, status: str, game_id: str) -> bool:
    if status and str(record.get("status", "")) != status:
        return False
    if game_id and str(record.get("game_id", "")) != game_id:
        return False
    return True


def _print_record(record: dict[str, Any], *, pretty: bool) -> None:
    if pretty:
        print(json.dumps(record, ensure_ascii=False, indent=2))
    else:
        print(record)


if __name__ == "__main__":
    raise SystemExit(main())

