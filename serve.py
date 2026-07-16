#!/usr/bin/env python3
"""Stick VERSUS local server — no-cache + auto version bust + live reload."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT_DEFAULT = 9473

# Match cache-bust query on local asset URLs
V_QUERY = re.compile(
    r"""(?P<prefix>(?:from\s+|import\s*\(|(?:src|href)\s*=\s*))"""
    r"""(?P<q>['"])"""
    r"""(?P<path>(?:\./)?[\w./-]+\.(?:js|css|png|jpg|jpeg|gif|webp|svg))"""
    r"""(?:\?v=\d+)?"""
    r"""(?P=q)"""
)

TEXT_TYPES = {".html", ".js", ".css", ".mjs", ".json", ".svg", ".txt", ".md"}


def build_id(root: Path) -> str:
    """Max mtime across game sources — changes when any file is edited."""
    latest = 0
    for folder in ("js", "css"):
        d = root / folder
        if not d.is_dir():
            continue
        for p in d.rglob("*"):
            if p.is_file():
                latest = max(latest, p.stat().st_mtime_ns)
    index = root / "index.html"
    if index.is_file():
        latest = max(latest, index.stat().st_mtime_ns)
    assets = root / "assets"
    if assets.is_dir():
        # Sample lightly so huge packs don't slow every request
        for p in assets.rglob("*"):
            if p.is_file():
                latest = max(latest, p.stat().st_mtime_ns)
                break
    return str(latest or int(time.time() * 1e9))


def rewrite_versions(text: str, bid: str) -> str:
    def repl(m: re.Match) -> str:
        return f'{m.group("prefix")}{m.group("q")}{m.group("path")}?v={bid}{m.group("q")}'

    return V_QUERY.sub(repl, text)


LIVE_RELOAD = """
<script>
(function () {
  var last = null;
  function check() {
    fetch("/__version?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (last === null) last = j.v;
        else if (j.v !== last) location.reload();
      })
      .catch(function () {});
  }
  setInterval(check, 900);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
})();
</script>
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] in ("/__version", "/__version/"):
            body = json.dumps({"v": build_id(ROOT)}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def send_head(self):
        path = self.translate_path(self.path.split("?", 1)[0])
        p = Path(path)
        if p.is_dir():
            for name in ("index.html", "index.htm"):
                candidate = p / name
                if candidate.is_file():
                    p = candidate
                    break
        if not p.is_file() or p.suffix.lower() not in TEXT_TYPES:
            return super().send_head()

        try:
            raw = p.read_text(encoding="utf-8")
        except OSError:
            return super().send_head()

        bid = build_id(ROOT)
        out = rewrite_versions(raw, bid)
        if p.name.lower() == "index.html" and "</body>" in out and "/__version" not in out:
            out = out.replace("</body>", LIVE_RELOAD + "\n</body>", 1)

        data = out.encode("utf-8")
        ctype = self.guess_type(str(p))
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Last-Modified", self.date_time_string())
        self.end_headers()
        self.wfile.write(data)
        return None  # body already sent


def port_free(port: int) -> bool:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def has_our_server(port: int, bind: str) -> bool:
    import urllib.request

    try:
        with urllib.request.urlopen(f"http://{bind}:{port}/__version", timeout=0.6) as r:
            data = json.loads(r.read().decode("utf-8"))
            return "v" in data
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Stick VERSUS one-click local server")
    ap.add_argument("--port", type=int, default=PORT_DEFAULT)
    ap.add_argument("--no-open", action="store_true", help="Do not open the browser")
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()

    url = f"http://{args.bind}:{args.port}/"
    if not port_free(args.port):
        if has_our_server(args.port, args.bind):
            print(f"已有 Stick VERSUS 服务器在跑 → {url}")
            print("刷新浏览器即可；改代码会自动更新版本。")
        else:
            print(f"端口 {args.port} 已被占用（可能是旧的本地服务器）。")
            if sys.platform.startswith("win"):
                print(f"  结束占用:  netstat -ano | findstr :{args.port}")
                print(f"  然后:      taskkill /PID <pid> /F")
            else:
                print(f"  结束占用:  lsof -nP -iTCP:{args.port} -sTCP:LISTEN")
            print(f"  或换端口:  python serve.py --port {args.port + 1}")
        if not args.no_open:
            webbrowser.open(url)
        return 0

    # Avoid WinError 10048 leftover TIME_WAIT quirks on some Windows setups
    try:
        httpd = ThreadingHTTPServer((args.bind, args.port), Handler)
    except OSError as e:
        print(f"无法绑定 {args.bind}:{args.port} → {e}")
        print(f"试试: python serve.py --port {args.port + 1}")
        return 1

    print("========================================")
    print("  Stick VERSUS")
    print("========================================")
    print(f"  {url}")
    print("  改 js/css/html 会自动刷新版本并重载页面")
    print("  Ctrl+C 停止服务器")
    print("========================================")
    sys.stdout.flush()
    if not args.no_open:
        import threading

        def _open() -> None:
            try:
                webbrowser.open(url)
            except Exception:
                pass

        threading.Timer(0.45, _open).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
