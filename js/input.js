/** Keyboard bindings — defaults + localStorage remaps. */

import { queueAccountChange } from "./cloudSync.js?v=72";
import { getSessionInvite } from "./accounts.js?v=72";

export class Input {
  constructor() {
    this.keys = Object.create(null);
    this.just = Object.create(null);
    this.prev = Object.create(null);
    this._listenFor = null; // { side, action, resolve } while rebinding
    window.addEventListener("keydown", (e) => {
      if (this._listenFor) {
        e.preventDefault();
        e.stopPropagation();
        const code = e.code;
        if (code === "Escape") {
          this._listenFor = null;
          return;
        }
        if (code === "Tab") return;
        const { side, action } = this._listenFor;
        this._listenFor = null;
        setBind(side, action, code);
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      this.keys[e.code] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener("blur", () => {
      this.keys = Object.create(null);
    });
  }

  /** Start listening for next key to assign (settings UI). */
  beginRebind(side, action) {
    this._listenFor = { side, action };
  }

  cancelRebind() {
    this._listenFor = null;
  }

  isRebinding() {
    return !!this._listenFor;
  }

  midFrame() {
    this.just = Object.create(null);
    for (const k of Object.keys(this.keys)) {
      if (this.keys[k] && !this.prev[k]) this.just[k] = true;
    }
  }

  endFrame() {
    this.prev = { ...this.keys };
  }

  down(code) {
    return !!this.keys[code];
  }
  pressed(code) {
    return !!this.just[code];
  }

  backPressed() {
    return this.pressed("Escape");
  }

  read(bind) {
    const left = this.down(bind.left);
    const right = this.down(bind.right);
    const up = this.down(bind.up);
    const down = this.down(bind.down);
    let dirX = 0;
    if (left && !right) dirX = -1;
    if (right && !left) dirX = 1;
    let dirY = 0;
    if (up && !down) dirY = -1;
    if (down && !up) dirY = 1;
    const dodgeKey = bind.dodge
      ? this.pressed(bind.dodge) || (bind.dodgeAlt ? this.pressed(bind.dodgeAlt) : false)
      : false;
    return {
      dirX,
      dirY,
      jump: this.pressed(bind.jump) || this.pressed(bind.up),
      jumpHeld: this.down(bind.jump) || this.down(bind.up),
      attack: this.pressed(bind.attack),
      special: this.pressed(bind.special),
      block: this.down(bind.block),
      node: this.down(bind.node),
      nodePressed: this.pressed(bind.node),
      start: this.pressed(bind.start),
      slide: bind.slide ? this.pressed(bind.slide) : false,
      dodge: dodgeKey,
      mashEscape: this.pressed(bind.mashEscape || "KeyM"),
      revive: this.pressed(bind.revive || "KeyE"),
    };
  }
}

export const DEFAULT_BIND_P1 = {
  left: "KeyA",
  right: "KeyD",
  up: "KeyW",
  down: "KeyS",
  jump: "Space",
  attack: "KeyJ",
  special: "KeyK",
  block: "KeyL",
  node: "KeyU",
  start: "Enter",
  slide: "ArrowDown",
  dodge: "ShiftLeft",
  dodgeAlt: "KeyC",
  mashEscape: "KeyM",
  revive: "KeyE",
};

export const DEFAULT_BIND_P2 = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  jump: "Numpad0",
  attack: "Numpad1",
  special: "Numpad2",
  block: "Numpad3",
  node: "Numpad4",
  start: "Enter",
  dodge: "NumpadEnter",
  dodgeAlt: "ControlRight",
  mashEscape: "KeyM",
  revive: "KeyE",
};

/** Mutable live bindings (imported by name elsewhere — mutate in place). */
export const BIND_P1 = { ...DEFAULT_BIND_P1 };
export const BIND_P2 = { ...DEFAULT_BIND_P2 };

export const BIND_ACTIONS_P1 = [
  { id: "left", label: "左" },
  { id: "right", label: "右" },
  { id: "up", label: "上" },
  { id: "down", label: "下" },
  { id: "jump", label: "跳" },
  { id: "attack", label: "攻击" },
  { id: "special", label: "技能" },
  { id: "block", label: "格挡" },
  { id: "node", label: "Node" },
  { id: "dodge", label: "闪避" },
  { id: "dodgeAlt", label: "闪避备用" },
  { id: "slide", label: "滑铲" },
  { id: "revive", label: "救援" },
  { id: "mashEscape", label: "挣脱" },
  { id: "start", label: "确认" },
];

export const BIND_ACTIONS_P2 = [
  { id: "left", label: "左" },
  { id: "right", label: "右" },
  { id: "up", label: "上" },
  { id: "down", label: "下" },
  { id: "jump", label: "跳" },
  { id: "attack", label: "攻击" },
  { id: "special", label: "技能" },
  { id: "block", label: "格挡" },
  { id: "node", label: "Node" },
  { id: "dodge", label: "闪避" },
  { id: "dodgeAlt", label: "闪避备用" },
  { id: "mashEscape", label: "挣脱" },
  { id: "start", label: "确认" },
];

const BINDS_KEY = "stickVersus.keybinds.v1";

export function formatBindCode(code) {
  if (!code) return "—";
  const map = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "空格",
    Enter: "Enter",
    ShiftLeft: "LShift",
    ShiftRight: "RShift",
    ControlLeft: "LCtrl",
    ControlRight: "RCtrl",
    NumpadEnter: "NumEnter",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "N" + code.slice(6);
  return code;
}

export function loadBinds() {
  try {
    const raw = localStorage.getItem(BINDS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.p1) Object.assign(BIND_P1, { ...DEFAULT_BIND_P1, ...data.p1 });
    if (data?.p2) Object.assign(BIND_P2, { ...DEFAULT_BIND_P2, ...data.p2 });
    // Migrate old default dodge KeyC → Left Shift (C stays as alt)
    let migrated = false;
    if (BIND_P1.dodge === "KeyC") {
      BIND_P1.dodge = "ShiftLeft";
      if (!BIND_P1.dodgeAlt || BIND_P1.dodgeAlt === "ControlLeft") {
        BIND_P1.dodgeAlt = "KeyC";
      }
      migrated = true;
    }
    if (migrated) saveBinds();
  } catch {
    /* ignore */
  }
}

export function saveBinds() {
  try {
    localStorage.setItem(
      BINDS_KEY,
      JSON.stringify({ p1: { ...BIND_P1 }, p2: { ...BIND_P2 } })
    );
  } catch {
    /* ignore */
  }
  queueAccountChange("bind_change", {
    invite: getSessionInvite(),
    p1: { ...BIND_P1 },
    p2: { ...BIND_P2 },
  });
}

export function setBind(side, action, code) {
  const target = side === 2 ? BIND_P2 : BIND_P1;
  if (!(action in DEFAULT_BIND_P1) && !(action in DEFAULT_BIND_P2)) return false;
  target[action] = code;
  saveBinds();
  return true;
}

export function resetBinds(side) {
  if (side === 2 || side == null) Object.assign(BIND_P2, DEFAULT_BIND_P2);
  if (side === 1 || side == null) Object.assign(BIND_P1, DEFAULT_BIND_P1);
  saveBinds();
}
