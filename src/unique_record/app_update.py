from __future__ import annotations

import json
import os
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if isinstance(payload, dict):
        return payload
    return {}


def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    formats = (
        "%Y-%m-%d %H:%M:%S %z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
    )
    for fmt in formats:
        try:
            parsed = datetime.strptime(text, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


class AppUpdateService:
    def __init__(
        self,
        *,
        data_root: Path,
        manifest_url: str,
        build_info_path: Path,
    ) -> None:
        self._data_root = data_root.resolve()
        self._manifest_url = manifest_url.strip()
        self._build_info_path = build_info_path.resolve()
        self._download_root = (self._data_root / "updates").resolve()
        self._download_root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()

    def status(self) -> dict[str, Any]:
        with self._lock:
            current = self._read_current_build()
            manifest = self._fetch_manifest()
            update_available = False
            reason = "no_manifest"
            if manifest is not None:
                update_available, reason = self._is_update_available(current=current, manifest=manifest)
            downloaded_path = self._get_downloaded_installer_path(manifest=manifest)
            return {
                "manifest_url": self._manifest_url,
                "current": current,
                "latest": manifest,
                "update_available": update_available,
                "update_reason": reason,
                "downloaded_installer_path": str(downloaded_path) if downloaded_path is not None else None,
            }

    def download_latest_installer(self) -> dict[str, Any]:
        with self._lock:
            manifest = self._fetch_manifest()
            if manifest is None:
                raise RuntimeError("update manifest is unavailable")
            download_url = str(manifest.get("url") or "").strip()
            file_name = str(manifest.get("file_name") or "").strip()
            if not download_url or not file_name:
                raise RuntimeError("update manifest is missing installer url or file name")

            target_path = (self._download_root / file_name).resolve()
            self._download_file(download_url=download_url, target_path=target_path)
            return {
                "ok": True,
                "installer_path": str(target_path),
                "file_name": file_name,
                "size_bytes": target_path.stat().st_size if target_path.exists() else None,
            }

    def apply_installer(self, *, installer_path: str | None = None) -> dict[str, Any]:
        with self._lock:
            if installer_path:
                target = Path(installer_path).expanduser().resolve()
            else:
                status = self.status()
                path_value = status.get("downloaded_installer_path")
                if not isinstance(path_value, str) or not path_value.strip():
                    raise RuntimeError("no downloaded installer is available")
                target = Path(path_value).resolve()

            if not target.exists() or not target.is_file():
                raise RuntimeError(f"installer not found: {target}")
            if target.suffix.lower() != ".exe":
                raise RuntimeError("installer must be a .exe file")

            startupinfo = None
            creationflags = 0
            if os.name == "nt":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0
                creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            subprocess.Popen(
                [str(target)],
                cwd=str(target.parent),
                startupinfo=startupinfo,
                creationflags=creationflags,
            )
            return {"ok": True, "installer_path": str(target)}

    def _download_file(self, *, download_url: str, target_path: Path) -> None:
        request = urllib.request.Request(
            download_url,
            headers={"Cache-Control": "no-cache"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                content = response.read()
        except Exception as exc:
            raise RuntimeError(f"failed to download installer: {exc}") from exc
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)

    def _fetch_manifest(self) -> dict[str, Any] | None:
        if not self._manifest_url:
            return None
        query_sep = "&" if "?" in self._manifest_url else "?"
        url = f"{self._manifest_url}{query_sep}t={int(time.time() * 1000)}"
        request = urllib.request.Request(
            url,
            headers={"Cache-Control": "no-cache"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = response.read().decode("utf-8-sig")
        except Exception:
            return None
        try:
            parsed = json.loads(payload)
        except ValueError:
            return None
        if not isinstance(parsed, dict):
            return None
        return parsed

    def _read_current_build(self) -> dict[str, Any]:
        payload = _read_json(self._build_info_path)
        version = payload.get("version") if isinstance(payload.get("version"), str) else "0.0.0"
        built_at_utc = (
            payload.get("built_at_utc")
            if isinstance(payload.get("built_at_utc"), str)
            else "1970-01-01 00:00:00 +00:00"
        )
        channel = payload.get("channel") if isinstance(payload.get("channel"), str) else "stable"
        return {"version": version, "built_at_utc": built_at_utc, "channel": channel}

    def _is_update_available(
        self,
        *,
        current: dict[str, Any],
        manifest: dict[str, Any],
    ) -> tuple[bool, str]:
        latest_published = _parse_time(manifest.get("published_at"))
        current_built = _parse_time(current.get("built_at_utc"))

        if latest_published is not None and current_built is not None:
            if latest_published > current_built:
                return True, "published_at_newer"
            return False, "published_at_not_newer"

        latest_version = str(manifest.get("version") or "").strip()
        current_version = str(current.get("version") or "").strip()
        if latest_version and current_version and latest_version != current_version:
            return True, "version_mismatch"

        latest_file = str(manifest.get("file_name") or "").strip()
        if latest_file:
            return True, "fallback_has_file"
        return False, "no_comparable_fields"

    def _get_downloaded_installer_path(self, *, manifest: dict[str, Any] | None) -> Path | None:
        if manifest is None:
            return None
        file_name = str(manifest.get("file_name") or "").strip()
        if not file_name:
            return None
        candidate = (self._download_root / file_name).resolve()
        if candidate.exists() and candidate.is_file():
            return candidate
        return None

