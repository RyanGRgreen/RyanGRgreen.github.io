#!/bin/bash
# Stick VERSUS — 双击即可启动（保持窗口开着）
cd "$(dirname "$0")" || exit 1

PORT=9473
URL="http://127.0.0.1:${PORT}/"

clear 2>/dev/null || true
echo "========================================"
echo "  Stick VERSUS — 一键启动"
echo "========================================"
echo ""

if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：找不到 python3，请先安装 Python 3。"
  echo ""
  read -r -p "按 Enter 关闭…"
  exit 1
fi

echo "地址: ${URL}"
echo "改 js / css / html 后浏览器会自动刷新"
echo "保持本窗口打开；Ctrl+C 或关闭窗口 = 停止服务器"
echo ""
echo "========================================"
echo ""

python3 ./serve.py --port "$PORT"
echo ""
read -r -p "服务器已停止。按 Enter 关闭…"
