/**
 * Online VS — PeerJS P2P rooms (works on GitHub Pages, no custom server).
 * Host-authoritative: host runs Match; guest sends inputs + receives state.
 * Room code = 6 chars → peer id `stickvs-XXXXXX`.
 */

const PEER_PREFIX = "stickvs-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const INPUT_HZ_CAP = 60;

function emptyInput() {
  return {
    dirX: 0,
    dirY: 0,
    jump: false,
    jumpHeld: false,
    attack: false,
    special: false,
    block: false,
    node: false,
    nodePressed: false,
    start: false,
    slide: false,
    dodge: false,
    mashEscape: false,
    revive: false,
  };
}

export function packInput(i) {
  const src = i || emptyInput();
  return {
    t: "in",
    dx: src.dirX | 0,
    dy: src.dirY | 0,
    j: !!src.jump,
    jh: !!src.jumpHeld,
    a: !!src.attack,
    s: !!src.special,
    b: !!src.block,
    n: !!src.node,
    np: !!src.nodePressed,
    st: !!src.start,
    sl: !!src.slide,
    d: !!src.dodge,
    m: !!src.mashEscape,
    r: !!src.revive,
  };
}

export function unpackInput(p) {
  if (!p) return emptyInput();
  return {
    dirX: p.dx | 0,
    dirY: p.dy | 0,
    jump: !!p.j,
    jumpHeld: !!p.jh,
    attack: !!p.a,
    special: !!p.s,
    block: !!p.b,
    node: !!p.n,
    nodePressed: !!p.np,
    start: !!p.st,
    slide: !!p.sl,
    dodge: !!p.d,
    mashEscape: !!p.m,
    revive: !!p.r,
  };
}

function packFighter(f) {
  if (!f) return null;
  const atk = f.attack;
  return {
    x: Math.round(f.x * 10) / 10,
    y: Math.round(f.y * 10) / 10,
    vx: Math.round((f.vx || 0) * 100) / 100,
    vy: Math.round((f.vy || 0) * 100) / 100,
    fac: f.facing | 0,
    hp: Math.round((f.hp || 0) * 10) / 10,
    mh: f.maxHp | 0,
    nd: f.nodes | 0,
    sm: Math.round(f.stamina || 0),
    sk: Math.round(f.skill || 0),
    st: f.state || "idle",
    po: f.pose || "idle",
    hs: f.hitstun | 0,
    og: f.onGround ? 1 : 0,
    an: f.anim | 0,
    inv: f.invuln | 0,
    fl: f.flash | 0,
    dg: f.danger ? 1 : 0,
    al: f.alive !== false ? 1 : 0,
    gl: f.gliding ? 1 : 0,
    hk: f.hookPhase || null,
    cw: f.critWindow | 0,
    cd: f.hookCooldown | 0,
    atk: atk
      ? {
          pose: atk.pose,
          frame: atk.frame | 0,
          kind: atk.kind,
          name: atk.name || "",
          su: atk.startup | 0,
          ac: atk.active | 0,
          life: atk.lifetime | 0,
        }
      : null,
  };
}

function applyFighter(f, p) {
  if (!f || !p) return;
  f.x = p.x;
  f.y = p.y;
  f.vx = p.vx;
  f.vy = p.vy;
  f.facing = p.fac || 1;
  f.hp = p.hp;
  if (p.mh) f.maxHp = p.mh;
  f.nodes = p.nd;
  f.stamina = p.sm;
  f.skill = p.sk;
  f.state = p.st;
  f.pose = p.po;
  f.hitstun = p.hs;
  f.onGround = !!p.og;
  f.anim = p.an;
  f.invuln = p.inv;
  f.flash = p.fl;
  f.danger = !!p.dg;
  f.alive = !!p.al;
  f.gliding = !!p.gl;
  f.hookPhase = p.hk;
  f.critWindow = p.cw || 0;
  f.hookCooldown = p.cd || 0;
  if (p.atk) {
    f.attack = {
      pose: p.atk.pose,
      frame: p.atk.frame,
      kind: p.atk.kind,
      name: p.atk.name,
      startup: p.atk.su,
      active: p.atk.ac,
      lifetime: p.atk.life,
      hit: false,
      projectile: false,
    };
  } else {
    f.attack = null;
  }
}

export function exportMatchState(match) {
  return {
    t: "st",
    ph: match.phase,
    pt: match.phaseT | 0,
    tm: match.timer | 0,
    ta: match.timerAcc | 0,
    tick: match.t | 0,
    fl: match.files ? [...match.files] : [0, 0],
    ar: match.areaIndex | 0,
    wn: match.winner,
    p1: packFighter(match.p1),
    p2: packFighter(match.p2),
    fx: (match.fx || []).slice(0, 12).map((x) => ({
      type: x.type,
      x: Math.round(x.x),
      y: Math.round(x.y),
      life: x.life | 0,
      text: x.text || undefined,
    })),
  };
}

export function applyMatchState(match, s) {
  if (!match || !s) return;
  match.phase = s.ph;
  match.phaseT = s.pt;
  match.timer = s.tm;
  match.timerAcc = s.ta;
  match.t = s.tick;
  if (s.fl) match.files = s.fl;
  match.areaIndex = s.ar;
  match.winner = s.wn;
  applyFighter(match.p1, s.p1);
  applyFighter(match.p2, s.p2);
  if (Array.isArray(s.fx)) {
    match.fx = s.fx.map((x) => ({ ...x, life: x.life }));
  }
}

function randomCode(len = 6) {
  let out = "";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += CODE_CHARS[buf[i] % CODE_CHARS.length];
  return out;
}

function waitPeerOpen(peer, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if (peer.open) return resolve(peer.id);
    const to = setTimeout(() => reject(new Error("连接服务器超时")), timeoutMs);
    peer.once("open", (id) => {
      clearTimeout(to);
      resolve(id);
    });
    peer.once("error", (err) => {
      clearTimeout(to);
      reject(err);
    });
  });
}

export class OnlineSession {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = "";
    this.status = "idle";
    this.error = "";
    this.rttMs = 0;
    this.remoteInput = emptyInput();
    this.lastState = null;
    this.onStatus = () => {};
    this.onMessage = () => {};
    this._sendQueue = [];
    this._lastSendIn = 0;
    this._pingId = 0;
  }

  get connected() {
    return !!(this.conn && this.conn.open);
  }

  _setStatus(s, err = "") {
    this.status = s;
    this.error = err || "";
    this.onStatus(s, this.error);
  }

  _ensurePeerJs() {
    if (typeof window !== "undefined" && window.Peer) return;
    throw new Error("PeerJS 未加载，请刷新页面");
  }

  _makePeer(id) {
    this._ensurePeerJs();
    const opts = {
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    };
    return id ? new window.Peer(id, opts) : new window.Peer(opts);
  }

  _wireConn(conn) {
    this.conn = conn;
    conn.on("data", (data) => this._onData(data));
    const onOpen = () => {
      this._setStatus("ready");
      this.send({ t: "hello", host: this.isHost, code: this.roomCode });
      this._flushQueue();
      this.ping();
    };
    if (conn.open) onOpen();
    else conn.on("open", onOpen);
    conn.on("close", () => {
      this._setStatus("closed", "对方已断开");
    });
    conn.on("error", (e) => {
      this._setStatus("error", e?.message || "连接错误");
    });
  }

  _onData(data) {
    if (!data || typeof data !== "object") return;
    if (data.t === "ping") {
      this.send({ t: "pong", n: data.n, at: data.at });
      return;
    }
    if (data.t === "pong") {
      if (data.at) this.rttMs = Math.round(performance.now() - data.at);
      return;
    }
    if (data.t === "in") {
      this.remoteInput = unpackInput(data);
      return;
    }
    if (data.t === "st") {
      this.lastState = data;
      this.onMessage(data);
      return;
    }
    this.onMessage(data);
  }

  send(obj) {
    if (!this.conn || !this.conn.open) {
      this._sendQueue.push(obj);
      return false;
    }
    try {
      this.conn.send(obj);
      return true;
    } catch {
      return false;
    }
  }

  _flushQueue() {
    while (this._sendQueue.length && this.conn?.open) {
      const m = this._sendQueue.shift();
      try {
        this.conn.send(m);
      } catch {
        break;
      }
    }
  }

  async hostRoom() {
    this.destroy();
    this.isHost = true;
    this._setStatus("hosting");
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(6);
      const peerId = PEER_PREFIX + code;
      try {
        this.peer = this._makePeer(peerId);
        await waitPeerOpen(this.peer);
        this.roomCode = code;
        this.peer.on("connection", (conn) => {
          if (this.conn && this.conn.open) {
            try {
              conn.close();
            } catch {
              /* full */
            }
            return;
          }
          this._wireConn(conn);
        });
        this.peer.on("error", (e) => {
          if (String(e?.type) === "unavailable-id") return;
          this._setStatus("error", e?.message || "主机错误");
        });
        this._setStatus("hosting");
        return code;
      } catch (e) {
        lastErr = e;
        try {
          this.peer?.destroy();
        } catch {
          /* ignore */
        }
        this.peer = null;
      }
    }
    this._setStatus("error", lastErr?.message || "无法创建房间");
    throw lastErr || new Error("无法创建房间");
  }

  async joinRoom(code) {
    this.destroy();
    this.isHost = false;
    const clean = String(code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (clean.length !== 6) {
      this._setStatus("error", "房间号须为 6 位");
      throw new Error("房间号须为 6 位");
    }
    this.roomCode = clean;
    this._setStatus("joining");
    this.peer = this._makePeer();
    await waitPeerOpen(this.peer);
    const conn = this.peer.connect(PEER_PREFIX + clean, {
      reliable: true,
      serialization: "json",
    });
    if (!conn) {
      this._setStatus("error", "无法发起连接");
      throw new Error("无法发起连接");
    }
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("加入超时：检查房间号 / 网络")), 15000);
      conn.on("open", () => {
        clearTimeout(to);
        resolve();
      });
      conn.on("error", (e) => {
        clearTimeout(to);
        reject(e);
      });
      this.peer.on("error", (e) => {
        clearTimeout(to);
        reject(e);
      });
    });
    this._wireConn(conn);
    return clean;
  }

  sendInput(localInput) {
    const now = performance.now();
    if (now - this._lastSendIn < 1000 / INPUT_HZ_CAP - 1) return;
    this._lastSendIn = now;
    this.send(packInput(localInput));
  }

  sendState(match) {
    if (!this.isHost || !this.connected) return;
    this.send(exportMatchState(match));
  }

  ping() {
    this._pingId += 1;
    this.send({ t: "ping", n: this._pingId, at: performance.now() });
  }

  destroy() {
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
    this.conn = null;
    this.peer = null;
    this.remoteInput = emptyInput();
    this.lastState = null;
    this._sendQueue = [];
    this.rttMs = 0;
    this.status = "idle";
    this.error = "";
  }
}

export { emptyInput };
