from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .detector import DetectorEngine, DetectorEvent, LeagueSignalProvider, SignalProvider
from .orchestrator import DetectionOrchestrator
from .recorder import RecordingController, WindowsNativeRecordingController
from .storage import RecordingSessionIndexStore


@dataclass(slots=True)
class RuntimeComponents:
    config: dict
    detector: DetectorEngine
    recorder: RecordingController
    orchestrator: DetectionOrchestrator
    poll_interval_ms: int
    session_index_path: Path | None = None


def load_config(config_path: str | Path) -> dict:
    path = Path(config_path).resolve()
    return json.loads(path.read_text(encoding="utf-8"))


def build_runtime(
    *,
    config_path: str | Path,
    game_id: str = "league_of_legends",
    app_root: str | Path | None = None,
    signal_provider: SignalProvider | None = None,
    recorder: RecordingController | None = None,
    recorder_options: dict[str, Any] | None = None,
) -> RuntimeComponents:
    config_path_obj = Path(config_path).resolve()
    config = load_config(config_path_obj)
    provider = signal_provider or LeagueSignalProvider()
    detector = DetectorEngine(signal_provider=provider, game_id=game_id)
    detector.load_config(config)
    game_cfg = _get_game_config(config=config, game_id=game_id)

    resolved_app_root = Path(app_root).resolve() if app_root is not None else None
    runtime_root = resolved_app_root or config_path_obj.parent.parent
    recordings_output_dir = _resolve_recordings_output_dir(
        config=config,
        runtime_root=runtime_root,
    )
    session_index_path = _resolve_session_index_path(
        config=config,
        runtime_root=runtime_root,
        recordings_output_dir=recordings_output_dir,
    )
    match_metadata_resolver = _build_match_metadata_resolver(signal_provider=provider)
    session_index_store = RecordingSessionIndexStore(
        index_path=session_index_path,
        recordings_output_dir=recordings_output_dir,
        match_metadata_resolver=match_metadata_resolver,
    )
    effective_recorder: RecordingController
    if recorder is not None:
        effective_recorder = recorder
    else:
        global_cfg = config.get("global", {}) if isinstance(config.get("global"), dict) else {}
        config_recorder_options = global_cfg.get("native_recorder")
        options: dict[str, Any] = {}
        if isinstance(config_recorder_options, dict):
            options.update(config_recorder_options)
        if recorder_options is not None:
            options.update(recorder_options)
        host_relative_path = options.pop("host_relative_path", None)
        if host_relative_path is not None and "native_host_path" not in options:
            host_path = Path(str(host_relative_path))
            if not host_path.is_absolute():
                host_base = resolved_app_root or runtime_root
                host_path = host_base / host_path
            options["native_host_path"] = host_path
        options.setdefault("recording_profile", game_cfg.get("recording_profile", {}))
        options.setdefault("recordings_output_dir", recordings_output_dir)
        effective_recorder = WindowsNativeRecordingController(
            app_root=resolved_app_root,
            **options,
        )

    poll_interval_ms = int(config.get("global", {}).get("poll_interval_ms", 500))
    orchestrator = DetectionOrchestrator(
        detector=detector,
        recorder=effective_recorder,
        game_id=game_id,
        session_index_store=session_index_store,
    )
    return RuntimeComponents(
        config=config,
        detector=detector,
        recorder=effective_recorder,
        orchestrator=orchestrator,
        poll_interval_ms=poll_interval_ms,
        session_index_path=session_index_path,
    )


def _build_match_metadata_resolver(
    *,
    signal_provider: SignalProvider,
) -> Callable[..., dict[str, Any] | None] | None:
    fetch_metadata = getattr(signal_provider, "fetch_latest_match_metadata", None)
    if not callable(fetch_metadata):
        return None

    def resolve(**kwargs: Any) -> dict[str, Any] | None:
        game_id = kwargs.get("game_id")
        if not isinstance(game_id, str) or game_id != "league_of_legends":
            return None
        try:
            payload = fetch_metadata()
        except Exception:
            return None
        if isinstance(payload, dict) and payload:
            return payload
        return None

    return resolve


def _get_game_config(*, config: dict[str, Any], game_id: str) -> dict[str, Any]:
    games = config.get("games", [])
    for game in games:
        if isinstance(game, dict) and game.get("id") == game_id:
            return game
    raise ValueError(f"game config not found: {game_id}")


def _resolve_recordings_output_dir(*, config: dict[str, Any], runtime_root: Path) -> Path:
    global_cfg = config.get("global", {}) if isinstance(config.get("global"), dict) else {}
    value = (
        global_cfg.get("recordings_output_dir")
        or global_cfg.get("recordings_dir")
        or "recordings"
    )
    output_dir = Path(str(value))
    if not output_dir.is_absolute():
        output_dir = runtime_root / output_dir
    return output_dir.resolve()


def _resolve_session_index_path(
    *,
    config: dict[str, Any],
    runtime_root: Path,
    recordings_output_dir: Path,
) -> Path:
    global_cfg = config.get("global", {}) if isinstance(config.get("global"), dict) else {}
    value = global_cfg.get("recordings_index_path")
    if value is None:
        return (recordings_output_dir / "recording_index.jsonl").resolve()

    path = Path(str(value))
    if not path.is_absolute():
        path = runtime_root / path
    return path.resolve()


class UniqueRecordLoop:
    def __init__(
        self,
        *,
        orchestrator: DetectionOrchestrator,
        poll_interval_ms: int,
        now_ms_fn: Callable[[], int] | None = None,
        sleep_fn: Callable[[float], None] = time.sleep,
    ) -> None:
        self._orchestrator = orchestrator
        self._poll_interval_ms = poll_interval_ms
        self._now_ms_fn = now_ms_fn or (lambda: int(time.time() * 1000))
        self._sleep_fn = sleep_fn
        self._running = False

    def run(
        self,
        *,
        max_ticks: int = 0,
        on_events: Callable[[list[DetectorEvent]], None] | None = None,
    ) -> None:
        self._running = True
        ticks = 0
        while self._running and (max_ticks <= 0 or ticks < max_ticks):
            events = self._orchestrator.process_tick(now_ms=self._now_ms_fn())
            if on_events is not None:
                on_events(events)
            ticks += 1
            if self._running and (max_ticks <= 0 or ticks < max_ticks):
                self._sleep_fn(self._poll_interval_ms / 1000.0)

    def stop(self) -> None:
        self._running = False
