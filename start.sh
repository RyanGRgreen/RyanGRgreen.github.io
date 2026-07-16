#!/bin/bash
# Stick VERSUS — one-click local server (terminal)
cd "$(dirname "$0")" || exit 1

PORT=9473
URL="http://127.0.0.1:${PORT}/"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: 需要 python3" >&2
  exit 1
fi

echo "Starting Stick VERSUS → ${URL}"
echo "改代码会自动刷新。Ctrl+C 停止。"
exec python3 ./serve.py --port "$PORT"
