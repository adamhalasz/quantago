from __future__ import annotations

from abc import ABC, abstractmethod

from .models import Signal, StrategyInput


class Strategy(ABC):
    @abstractmethod
    def on_candle(self, input: StrategyInput) -> Signal:
        raise NotImplementedError