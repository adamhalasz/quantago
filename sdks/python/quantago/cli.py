from __future__ import annotations

import argparse

from .server import serve


def main() -> None:
    parser = argparse.ArgumentParser(prog="quantago", description="Quantago Strategy Protocol CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    serve_parser = subparsers.add_parser("serve", help="Serve a Python strategy over HTTP")
    serve_parser.add_argument("strategy", help="Import path in the form module:Attribute")
    serve_parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    serve_parser.add_argument("--port", type=int, default=8000, help="Port to bind")

    args = parser.parse_args()

    if args.command == "serve":
        serve(args.strategy, host=args.host, port=args.port)


if __name__ == "__main__":
    main()