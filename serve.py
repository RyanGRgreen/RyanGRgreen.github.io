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
ACCOUNTS_PATH = ROOT / "data" / "accounts-cloud.json"

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


def empty_accounts_doc() -> dict:
    return {"v": 1, "game": "stickVersus", "updatedAt": 0, "accounts": {}}


def read_accounts_doc() -> dict:
    try:
        if not ACCOUNTS_PATH.is_file():
            return empty_accounts_doc()
        data = json.loads(ACCOUNTS_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return empty_accounts_doc()
        acc = data.get("accounts")
        if not isinstance(acc, dict):
            data["accounts"] = {}
        return data
    except Exception:
        return empty_accounts_doc()


def write_accounts_doc(doc: dict) -> None:
    ACCOUNTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    clean_accounts: dict = {}
    raw = doc.get("accounts") if isinstance(doc, dict) else {}
    if isinstance(raw, dict):
        for key, acc in raw.items():
            if not isinstance(acc, dict):
                continue
            invite = str(acc.get("invite") or key)
            pass_hash = str(acc.get("passHash") or "")
            if not pass_hash:
                continue
            # Never persist plaintext password fields
            clean_accounts[str(key).lower()] = {
                "invite": invite,
                "role": acc.get("role") or "player",
                "label": acc.get("label") or "",
                "passHash": pass_hash,
                "mustChangePassword": bool(acc.get("mustChangePassword")),
                "defaultPass": bool(acc.get("defaultPass")),
                "registered": bool(acc.get("registered")),
                "createdAt": int(acc.get("createdAt") or 0),
                "changedAt": int(acc.get("changedAt") or 0),
            }
    out = {
        "v": 1,
        "game": "stickVersus",
        "updatedAt": int(time.time() * 1000),
        "accounts": clean_accounts,
    }
    ACCOUNTS_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_accounts_doc(local: dict, remote: dict) -> dict:
    """Merge by changedAt/createdAt — newer wins per account id."""
    out_acc = dict(local.get("accounts") or {})
    for key, rem in (remote.get("accounts") or {}).items():
        if not isinstance(rem, dict):
            continue
        kid = str(key).lower()
        loc = out_acc.get(kid)
        if not loc:
            out_acc[kid] = rem
            continue
        lt = max(int(loc.get("changedAt") or 0), int(loc.get("createdAt") or 0))
        rt = max(int(rem.get("changedAt") or 0), int(rem.get("createdAt") or 0))
        if rt >= lt:
            merged = dict(loc)
            merged.update(rem)
            out_acc[kid] = merged
        else:
            merged = dict(rem)
            merged.update(loc)
            out_acc[kid] = merged
    return {"v": 1, "game": "stickVersus", "updatedAt": int(time.time() * 1000), "accounts": out_acc}


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
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
        super().end_headers()

    def _json_response(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/__version", "/__version/"):
            body = json.dumps({"v": build_id(ROOT)}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path in ("/api/accounts", "/api/accounts/"):
            self._json_response(200, read_accounts_doc())
            return
        super().do_GET()

    def do_PUT(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/api/accounts", "/api/accounts/"):
            incoming = self._read_json_body()
            merged = merge_accounts_doc(read_accounts_doc(), incoming)
            write_accounts_doc(merged)
            self._json_response(200, read_accounts_doc())
            return
        self.send_error(404)

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/api/accounts", "/api/accounts/"):
            incoming = self._read_json_body()
            merged = merge_accounts_doc(read_accounts_doc(), incoming)
            write_accounts_doc(merged)
            self._json_response(200, read_accounts_doc())
            return
        self.send_error(404)

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
