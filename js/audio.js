/** Stick VERSUS audio — file SFX + WebAudio unlock on first gesture. */

const SFX_FILES = {
  hit: "hit.wav",
  hit_big: "hit_big.wav",
  crit: "crit.wav",
  block: "block.wav",
  dodge: "dodge.wav",
  perfect: "perfect.wav",
  jump: "jump.wav",
  ko: "ko.wav",
  slash: "slash.wav",
  special: "special.wav",
  file: "file.wav",
  ui_move: "ui_move.wav",
  ui_ok: "ui_ok.wav",
  ui_back: "ui_back.wav",
  hook_cast: "hook_cast.wav",
  hook_latch: "hook_latch.wav",
  hook_reel: "hook_reel.wav", // fishing-rod retrieve (钓鱼杆收回)
  hook_launch: "hook_launch.wav",
  hook_slam: "hook_slam.wav",
  hook_escape: "hook_escape.wav",
};

/** Match / UI event → sfx key */
const EVENT_MAP = {
  hit: (d) => (d?.crit ? "crit" : d?.dmg > 12 ? "hit_big" : "hit"),
  block: "block",
  dodge: "dodge",
  perfectDodge: "perfect",
  jump: "jump",
  ko: "ko",
  slash: "slash",
  special: "special",
  attack: "slash",
  file: "file",
  matchover: "file",
  hook: "hook_latch",
  hookCast: "hook_cast",
  hookReel: "hook_reel",
  hookLaunch: "hook_launch",
  hookSlam: "hook_slam",
  hookEscape: "hook_escape",
  ui_move: "ui_move",
  ui_ok: "ui_ok",
  ui_back: "ui_back",
};

const state = {
  ready: false,
  muted: false,
  volume: 0.7,
  ctx: null,
  buffers: {},
  unlocked: false,
};

function ensureCtx() {
  if (state.ctx) return state.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  state.ctx = new AC();
  return state.ctx;
}

export async function loadAudio() {
  const ctx = ensureCtx();
  if (!ctx) {
    state.ready = true;
    return state;
  }
  const jobs = Object.entries(SFX_FILES).map(async ([key, file]) => {
    try {
      const res = await fetch(`assets/sfx/${encodeURIComponent(file)}`);
      if (!res.ok) return;
      const raw = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(raw.slice(0));
      state.buffers[key] = buf;
    } catch {
      /* keep going — missing files are fine */
    }
  });
  await Promise.all(jobs);
  state.ready = true;
  return state;
}

/** Call from first key/click so Safari/Chrome allow playback. */
export function unlockAudio() {
  const ctx = ensureCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!state.unlocked) {
    // silent blip primes the graph
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.01);
    } catch {
      /* ignore */
    }
    state.unlocked = true;
  }
}

/** Optional hook so lobby BGM can pause/resume with mute. */
let onMuteChanged = null;

export function setMuteListener(fn) {
  onMuteChanged = typeof fn === "function" ? fn : null;
}

export function setMuted(m) {
  state.muted = !!m;
  if (onMuteChanged) onMuteChanged(state.muted);
}

export function toggleMute() {
  state.muted = !state.muted;
  if (onMuteChanged) onMuteChanged(state.muted);
  return state.muted;
}

export function isMuted() {
  return state.muted;
}

export function playSfx(key, { volume = 1, rate = 1 } = {}) {
  if (state.muted || !key) return;
  unlockAudio();
  const ctx = ensureCtx();
  if (!ctx) return;
  const buf = state.buffers[key];
  if (!buf) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = state.volume * volume;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

export function playEvent(type, data) {
  const mapped = EVENT_MAP[type];
  if (!mapped) return;
  const key = typeof mapped === "function" ? mapped(data) : mapped;
  let rate = 1;
  let volume = 1;
  if (type === "hit" && data?.crit) volume = 1.1;
  if (type === "dodge") rate = 1 + Math.random() * 0.08;
  if (type === "hit") rate = 0.95 + Math.random() * 0.12;
  playSfx(key, { volume, rate });
}

export { SFX_FILES, EVENT_MAP };
