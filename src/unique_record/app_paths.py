from __future__ import annotations

import os
import shutil
from pathlib import Path


APP_NAME = "UniqueRecord"


def get_user_data_root(*, app_name: str = APP_NAME) -> Path:
    base = os.environ.get("LOCALAPPDATA")
    if not base:
        base = str(Path.home() / "AppData" / "Local")
    root = Path(base) / app_name
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def ensure_user_config(
    *,
    user_data_root: Path,
    resource_root: Path,
    user_config_name: str = "game_adapters.json",
) -> Path:
    config_dir = (user_data_root / "configs").resolve()
    config_dir.mkdir(parents=True, exist_ok=True)
    user_config_path = (config_dir / user_config_name).resolve()
    if user_config_path.exists():
        return user_config_path

    bundled_template = (resource_root / "configs" / "game_adapters.template.json").resolve()
    legacy_install_config = (resource_root / "configs" / user_config_name).resolve()

    if legacy_install_config.exists():
        shutil.copy2(legacy_install_config, user_config_path)
        return user_config_path

    if bundled_template.exists():
        shutil.copy2(bundled_template, user_config_path)
        return user_config_path

    user_config_path.write_text("{}", encoding="utf-8")
    return user_config_path

