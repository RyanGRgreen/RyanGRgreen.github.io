/**
 * Touch controls — detect device, ask preference, virtual pad, editable layout.
 */

import { BIND_P1 } from "./input.js?v=78";

const MODE_KEY = "stickVersus.controlMode.v1";
const LAYOUT_KEY = "stickVersus.touchLayout.v1";
const ASKED_TOUCH_KEY = "stickVersus.askedTouch.v1";
const ASKED_KB_KEY = "stickVersus.askedKeyboard.v1";

/** Layout coords are % of the game canvas box (0–100). */
export const DEFAULT_TOUCH_LAYOUT = {
  stick: { x: 16, y: 78, r: 11 },
  jump: { x: 72, y: 84, r: 5.5, label: "跳" },
  attack: { x: 84, y: 78, r: 6.5, label: "攻" },
  special: { x: 74, y: 68, r: 5.5, label: "技" },
  block: { x: 88, y: 64, r: 5, label: "防" },
  node: { x: 92, y: 52, r: 4.5, label: "N" },
  dodge: { x: 62, y: 84, r: 4.5, label: "闪" },
  mash: { x: 54, y: 72, r: 4.5, label: "挣" },
  start: { x: 50, y: 10, r: 4, label: "确" },
  back: { x: 8, y: 10, r: 4, label: "返" },
};

const ACTION_CODES = {
  jump: () => BIND_P1.jump,
  attack: () => BIND_P1.attack,
  special: () => BIND_P1.special,
  block: () => BIND_P1.block,
  node: () => BIND_P1.node,
  dodge: () => BIND_P1.dodge,
  mash: () => BIND_P1.mashEscape || "KeyM",
  start: () => BIND_P1.start || "Enter",
  back: () => "Escape",
  left: () => BIND_P1.left,
  right: () => BIND_P1.right,
  up: () => BIND_P1.up,
  down: () => BIND_P1.down,
};

let inputRef = null;
let canvasEl = null;
let overlay = null;
let promptEl = null;
let layout = null;
let mode = null;
let editMode = false;
let dragId = null;
let dragOff = { x: 0, y: 0 };
let stickTouchId = null;
let activePointers = new Map();
let visibleWanted = false;
let kbAskArmed = true;

function cloneLayout(src) {
  const out = {};
  for (const [k, v] of Object.entries(src)) out[k] = { ...v };
  return out;
}

export function isTouchCapable() {
  try {
    if (navigator.maxTouchPoints > 0) return true;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
    if ("ontouchstart" in window) return true;
  } catch (_) {}
  return false;
}

function loadMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === "touch" || m === "keyboard") return m;
  } catch (_) {}
  return null;
}

export function getControlMode() {
  return mode;
}

export function setControlMode(next) {
  mode = next === "touch" ? "touch" : next === "keyboard" ? "keyboard" : null;
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode);
    else localStorage.removeItem(MODE_KEY);
  } catch (_) {}
  applyModeUi();
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return cloneLayout(DEFAULT_TOUCH_LAYOUT);
    const data = JSON.parse(raw);
    const base = cloneLayout(DEFAULT_TOUCH_LAYOUT);
    for (const id of Object.keys(base)) {
      if (data[id]) Object.assign(base[id], data[id]);
    }
    return base;
  } catch (_) {
    return cloneLayout(DEFAULT_TOUCH_LAYOUT);
  }
}

export function getTouchLayout() {
  return layout;
}

export function saveTouchLayout() {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch (_) {}
}

export function resetTouchLayout() {
  layout = cloneLayout(DEFAULT_TOUCH_LAYOUT);
  saveTouchLayout();
  renderOverlayButtons();
}

function gameBox() {
  return canvasEl.getBoundingClientRect();
}

function pctToPx(p) {
  const box = gameBox();
  return {
    x: box.left + (p.x / 100) * box.width,
    y: box.top + (p.y / 100) * box.height,
    r: (p.r / 100) * Math.min(box.width, box.height),
  };
}

function clientToPct(clientX, clientY) {
  const box = gameBox();
  return {
    x: ((clientX - box.left) / box.width) * 100,
    y: ((clientY - box.top) / box.height) * 100,
  };
}

function setVirtualKey(code, down) {
  if (!inputRef || !code) return;
  if (down) {
    if (typeof inputRef.latchJust === "function") inputRef.latchJust(code);
    else {
      inputRef.keys[code] = true;
      inputRef.just[code] = true;
    }
  } else {
    inputRef.keys[code] = false;
  }
}

function clearStickDirs() {
  setVirtualKey(ACTION_CODES.left(), false);
  setVirtualKey(ACTION_CODES.right(), false);
  setVirtualKey(ACTION_CODES.up(), false);
  setVirtualKey(ACTION_CODES.down(), false);
}

function applyStick(nx, ny) {
  clearStickDirs();
  const dead = 0.28;
  if (nx < -dead) setVirtualKey(ACTION_CODES.left(), true);
  if (nx > dead) setVirtualKey(ACTION_CODES.right(), true);
  if (ny < -dead) setVirtualKey(ACTION_CODES.up(), true);
  if (ny > dead) setVirtualKey(ACTION_CODES.down(), true);
}

function ensureDom() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.id = "touch-pad";
  overlay.className = "touch-pad hidden";
  overlay.setAttribute("aria-hidden", "true");
  document.getElementById("app")?.appendChild(overlay);

  promptEl = document.createElement("div");
  promptEl.id = "control-prompt";
  promptEl.className = "control-prompt hidden";
  promptEl.innerHTML =
    '<div class="control-prompt-card">' +
    '<h2 id="control-prompt-title">控制方式</h2>' +
    '<p id="control-prompt-body" class="control-prompt-body"></p>' +
    '<div class="control-prompt-actions">' +
    '<button type="button" id="control-prompt-a" class="auth-btn"></button>' +
    '<button type="button" id="control-prompt-b" class="auth-btn auth-btn-ghost"></button>' +
    "</div></div>";
  document.body.appendChild(promptEl);

  layout = loadLayout();
  renderOverlayButtons();
  window.addEventListener("resize", () => {
    if (!overlay.classList.contains("hidden")) positionButtons();
  });
}

function renderOverlayButtons() {
  if (!overlay) return;
  overlay.innerHTML = "";
  const stick = document.createElement("div");
  stick.className = "touch-btn touch-stick";
  stick.dataset.id = "stick";
  stick.innerHTML = '<div class="touch-stick-knob"></div><span>摇杆</span>';
  overlay.appendChild(stick);

  for (const id of ["jump", "attack", "special", "block", "node", "dodge", "mash", "start", "back"]) {
    const cfg = layout[id];
    if (!cfg) continue;
    const btn = document.createElement("div");
    btn.className = "touch-btn";
    btn.dataset.id = id;
    btn.textContent = cfg.label || id;
    overlay.appendChild(btn);
  }
  wireOverlayEvents();
  positionButtons();
}

function positionButtons() {
  if (!overlay || !canvasEl) return;
  const box = gameBox();
  overlay.style.left = box.left + "px";
  overlay.style.top = box.top + "px";
  overlay.style.width = box.width + "px";
  overlay.style.height = box.height + "px";

  for (const el of overlay.querySelectorAll(".touch-btn")) {
    const id = el.dataset.id;
    const cfg = layout[id];
    if (!cfg) continue;
    const size = ((cfg.r * 2) / 100) * Math.min(box.width, box.height);
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = (cfg.x / 100) * box.width - size / 2 + "px";
    el.style.top = (cfg.y / 100) * box.height - size / 2 + "px";
    el.style.fontSize = Math.max(10, size * 0.22) + "px";
  }
}

function wireOverlayEvents() {
  overlay.querySelectorAll(".touch-btn").forEach((el) => {
    el.addEventListener("pointerdown", onBtnDown);
    el.addEventListener("pointermove", onBtnMove);
    el.addEventListener("pointerup", onBtnUp);
    el.addEventListener("pointercancel", onBtnUp);
  });
}

function onBtnDown(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = e.currentTarget;
  const id = el.dataset.id;
  el.setPointerCapture?.(e.pointerId);

  if (editMode) {
    dragId = id;
    const cfg = layout[id];
    const pct = clientToPct(e.clientX, e.clientY);
    dragOff = { x: pct.x - cfg.x, y: pct.y - cfg.y };
    return;
  }

  activePointers.set(e.pointerId, id);
  el.classList.add("active");

  if (id === "stick") {
    stickTouchId = e.pointerId;
    updateStickFromEvent(e);
  } else {
    setVirtualKey(ACTION_CODES[id]?.(), true);
  }
}

function onBtnMove(e) {
  if (editMode && dragId) {
    e.preventDefault();
    const pct = clientToPct(e.clientX, e.clientY);
    const cfg = layout[dragId];
    cfg.x = Math.max(4, Math.min(96, pct.x - dragOff.x));
    cfg.y = Math.max(4, Math.min(96, pct.y - dragOff.y));
    positionButtons();
    return;
  }
  if (activePointers.get(e.pointerId) === "stick" || stickTouchId === e.pointerId) {
    e.preventDefault();
    updateStickFromEvent(e);
  }
}

function onBtnUp(e) {
  e.preventDefault();
  if (editMode && dragId) {
    dragId = null;
    saveTouchLayout();
    return;
  }
  const id = activePointers.get(e.pointerId);
  activePointers.delete(e.pointerId);
  e.currentTarget.classList.remove("active");

  if (id === "stick" || stickTouchId === e.pointerId) {
    stickTouchId = null;
    clearStickDirs();
    const knob = overlay.querySelector(".touch-stick-knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  } else if (id) {
    setVirtualKey(ACTION_CODES[id]?.(), false);
  }
}

function updateStickFromEvent(e) {
  const cfg = layout.stick;
  const c = pctToPx(cfg);
  const dx = e.clientX - c.x;
  const dy = e.clientY - c.y;
  const dist = Math.hypot(dx, dy) || 1;
  const max = c.r * 0.72;
  const clamped = Math.min(dist, max);
  const nx = (dx / dist) * (clamped / max);
  const ny = (dy / dist) * (clamped / max);
  applyStick(nx, ny);
  const knob = overlay.querySelector(".touch-stick-knob");
  if (knob) {
    knob.style.transform =
      "translate(calc(-50% + " + nx * max + "px), calc(-50% + " + ny * max + "px))";
  }
}

function applyModeUi() {
  const useTouch = mode === "touch";
  document.documentElement.classList.toggle("touch-controls", useTouch);
  if (!useTouch) {
    hideTouchPad();
    clearStickDirs();
    for (const id of Object.keys(ACTION_CODES)) {
      if (id === "left" || id === "right" || id === "up" || id === "down") continue;
      setVirtualKey(ACTION_CODES[id](), false);
    }
  } else {
    syncTouchPadVisibility();
  }
}

export function setTouchPadWanted(on) {
  visibleWanted = !!on;
  syncTouchPadVisibility();
}

function syncTouchPadVisibility() {
  if (!overlay) return;
  const show = mode === "touch" && (visibleWanted || editMode);
  overlay.classList.toggle("hidden", !show);
  overlay.classList.toggle("edit-mode", editMode);
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
  if (show) positionButtons();
}

function hideTouchPad() {
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

export function setTouchEditMode(on) {
  editMode = !!on;
  if (editMode) {
    ensureDom();
    setControlMode("touch");
  }
  syncTouchPadVisibility();
}

export function isTouchEditMode() {
  return editMode;
}

export function showControlPrompt(kind, opts = {}) {
  ensureDom();
  const title = promptEl.querySelector("#control-prompt-title");
  const body = promptEl.querySelector("#control-prompt-body");
  const btnA = promptEl.querySelector("#control-prompt-a");
  const btnB = promptEl.querySelector("#control-prompt-b");

  if (kind === "touch") {
    title.textContent = "触屏设备";
    body.textContent = "检测到触屏。是否使用触屏虚拟按键？可在设置中调整按键位置。";
    btnA.textContent = "使用触屏";
    btnB.textContent = "使用键盘";
  } else {
    title.textContent = "检测到键盘";
    body.textContent = "当前为触屏操作。是否切换为键盘按键？";
    btnA.textContent = "切换键盘";
    btnB.textContent = "继续触屏";
  }

  const finish = (chosen) => {
    promptEl.classList.add("hidden");
    if (chosen === "touch" || chosen === "keyboard") setControlMode(chosen);
    opts.onChoose?.(chosen);
  };

  btnA.onclick = () => finish(kind === "touch" ? "touch" : "keyboard");
  btnB.onclick = () => finish(kind === "touch" ? "keyboard" : "touch");
  promptEl.classList.remove("hidden");
}

export function maybeAskTouchOnBoot() {
  if (!isTouchCapable()) return;
  if (mode) {
    applyModeUi();
    return;
  }
  showControlPrompt("touch", {
    onChoose: () => {
      try {
        localStorage.setItem(ASKED_TOUCH_KEY, "1");
      } catch (_) {}
    },
  });
}

function onGlobalKeyDown() {
  if (mode !== "touch") return;
  if (!kbAskArmed) return;
  if (editMode) return;
  if (promptEl && !promptEl.classList.contains("hidden")) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
  if (document.querySelector(".auth-panel:not(.hidden)")) return;
  kbAskArmed = false;
  try {
    if (sessionStorage.getItem(ASKED_KB_KEY) === "1") return;
  } catch (_) {}
  showControlPrompt("keyboard", {
    onChoose: (chosen) => {
      try {
        sessionStorage.setItem(ASKED_KB_KEY, "1");
      } catch (_) {}
      if (chosen === "touch") kbAskArmed = true;
    },
  });
}

export function initTouch(input, canvas) {
  inputRef = input;
  canvasEl = canvas;
  mode = loadMode();
  layout = loadLayout();
  ensureDom();
  applyModeUi();

  window.addEventListener("keydown", () => onGlobalKeyDown(), { passive: true });
  window.addEventListener(
    "touchstart",
    () => {
      if (!isTouchCapable()) return;
      if (mode) return;
      maybeAskTouchOnBoot();
    },
    { once: true, passive: true }
  );
}

export function updateTouchForScreen(screen) {
  if (mode !== "touch") {
    setTouchPadWanted(false);
    return;
  }
  if (editMode) {
    setTouchPadWanted(true);
    return;
  }
  // Hide on settings unless editing; show for play + most menus
  if (screen === "settings") {
    setTouchPadWanted(false);
    return;
  }
  // Title / join-code panel: pad would block typing & tap UI
  const hide =
    screen === "title" ||
    screen === "onlineJoin" ||
    screen === "login" ||
    screen === "register" ||
    screen === "changePassword";
  setTouchPadWanted(!hide);
}

export function isControlPromptVisible() {
  return !!(promptEl && !promptEl.classList.contains("hidden"));
}
