"""Detector module for game session detection and recording actions."""

from .engine import DetectorEngine
from .signal_provider import LeagueSignalProvider, SignalProvider, StaticSignalProvider
from .types import DetectorEvent, DetectorSnapshot, RuleMatch

__all__ = [
    "DetectorEngine",
    "LeagueSignalProvider",
    "SignalProvider",
    "StaticSignalProvider",
    "DetectorEvent",
    "DetectorSnapshot",
    "RuleMatch",
]
