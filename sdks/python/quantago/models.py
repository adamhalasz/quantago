from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Candle:
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Candle":
        return cls(
            time=str(data["time"]),
            open=float(data["open"]),
            high=float(data["high"]),
            low=float(data["low"]),
            close=float(data["close"]),
            volume=float(data["volume"]),
        )


@dataclass(slots=True)
class PositionState:
    type: str
    entry_price: float
    entry_time: str
    size: float
    unrealized_pnl: float

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PositionState":
        return cls(
            type=str(data["type"]),
            entry_price=float(data["entryPrice"]),
            entry_time=str(data["entryTime"]),
            size=float(data["size"]),
            unrealized_pnl=float(data["unrealizedPnl"]),
        )


@dataclass(slots=True)
class PortfolioState:
    cash: float
    equity: float
    open_position: PositionState | None
    last_trade_at: str | None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PortfolioState":
        open_position = data.get("openPosition")
        return cls(
            cash=float(data["cash"]),
            equity=float(data["equity"]),
            open_position=PositionState.from_dict(open_position) if isinstance(open_position, dict) else None,
            last_trade_at=str(data["lastTradeAt"]) if data.get("lastTradeAt") is not None else None,
        )


@dataclass(slots=True)
class StrategyMetadata:
    name: str
    version: str
    runtime: str
    language: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StrategyMetadata":
        return cls(
            name=str(data["name"]),
            version=str(data["version"]),
            runtime=str(data["runtime"]),
            language=str(data["language"]),
        )


@dataclass(slots=True)
class StrategyContext:
    index: int
    total_candles: int
    timeframe: str
    strategy: StrategyMetadata

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StrategyContext":
        return cls(
            index=int(data["index"]),
            total_candles=int(data["totalCandles"]),
            timeframe=str(data["timeframe"]),
            strategy=StrategyMetadata.from_dict(data["strategy"]),
        )


@dataclass(slots=True)
class StrategyInput:
    candle: Candle
    history: list[Candle]
    portfolio: PortfolioState
    parameters: dict[str, Any]
    context: StrategyContext

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StrategyInput":
        return cls(
            candle=Candle.from_dict(data["candle"]),
            history=[Candle.from_dict(item) for item in data.get("history", [])],
            portfolio=PortfolioState.from_dict(data["portfolio"]),
            parameters=dict(data.get("parameters", {})),
            context=StrategyContext.from_dict(data["context"]),
        )


@dataclass(slots=True)
class Signal:
    action: str
    size: float | None = None
    reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def buy(cls, size: float | None = None, reason: str | None = None, metadata: dict[str, Any] | None = None) -> "Signal":
        return cls(action="BUY", size=size, reason=reason, metadata=metadata or {})

    @classmethod
    def sell(cls, size: float | None = None, reason: str | None = None, metadata: dict[str, Any] | None = None) -> "Signal":
        return cls(action="SELL", size=size, reason=reason, metadata=metadata or {})

    @classmethod
    def hold(cls, reason: str | None = None, metadata: dict[str, Any] | None = None) -> "Signal":
        return cls(action="HOLD", size=None, reason=reason, metadata=metadata or {})

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"action": self.action}
        if self.size is not None:
          payload["size"] = self.size
        if self.reason is not None:
          payload["reason"] = self.reason
        if self.metadata:
          payload["metadata"] = self.metadata
        return payload