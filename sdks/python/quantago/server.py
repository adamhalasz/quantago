from __future__ import annotations

import importlib
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .models import Signal, StrategyInput
from .strategy import Strategy


def load_strategy(target: str) -> Strategy:
    module_name, separator, attribute_name = target.partition(":")
    if separator != ":" or not module_name or not attribute_name:
        raise ValueError("Strategy target must use the form 'module:Attribute'")

    module = importlib.import_module(module_name)
    attribute = getattr(module, attribute_name)

    if isinstance(attribute, Strategy):
        return attribute

    if isinstance(attribute, type) and issubclass(attribute, Strategy):
        return attribute()

    if callable(attribute):
        instance = attribute()
        if isinstance(instance, Strategy):
            return instance

    raise TypeError(f"{target} did not resolve to a Strategy instance or subclass")


class _StrategyRequestHandler(BaseHTTPRequestHandler):
    server_version = "QuantagoPython/0.1"

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        self._send_json(HTTPStatus.OK, {"status": "ok"})

    def do_POST(self) -> None:
        if self.path != "/signal":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))
            strategy_input = StrategyInput.from_dict(payload)
            strategy: Strategy = self.server.strategy  # type: ignore[attr-defined]
            result = strategy.on_candle(strategy_input)

            if not isinstance(result, Signal):
                raise TypeError("Strategy.on_candle must return a Signal")

            self._send_json(HTTPStatus.OK, result.to_dict())
        except Exception as error:  # noqa: BLE001
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"message": str(error)})

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class StrategyServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], strategy: Strategy):
        super().__init__(server_address, _StrategyRequestHandler)
        self.strategy = strategy


def serve(strategy_target: str, host: str = "127.0.0.1", port: int = 8000) -> None:
    strategy = load_strategy(strategy_target)
    server = StrategyServer((host, port), strategy)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()