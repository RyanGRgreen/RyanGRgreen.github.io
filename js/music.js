/** Lobby BGM — local files in assets/music (+ optional Import).
 *  Alan Becker / AvM tracks sourced from B站纯音乐 uploads (local playback, no video).
 */

const STORAGE_KEY = "stickVersus.lobbyTrack";
const IDB_NAME = "stickVersusMusic";
const IDB_STORE = "tracks";
const MANIFEST_URL = "assets/music/manifest.json";

/** Local Alan Becker–style tracks (files live under assets/music/). */
const SUGGESTED = [
  {
    id: "pigstep_avm",
    title: "Pigstep (AvM Remix)",
    file: "pigstep_avm.m4a",
    artist: "Alan Becker / AvM · 来源 B站",
    bili: "https://www.bilibili.com/video/BV1nK41117nB/",
  },
  {
    id: "note_block_battle",
    title: "Note Block 纯音乐",
    file: "note_block_battle.m4a",
    artist: "Alan Becker / AvM · 来源 B站",
    bili: "https://www.bilibili.com/video/BV17K4y1D7UJ/",
  },
  { id: "note_blocks", title: "Note Blocks", file: "note_blocks.mp3", artist: "可选本地" },
  { id: "note_block_universe", title: "Note Block Universe", file: "note_block_universe.mp3", artist: "可选本地" },
  { id: "avm_s4", title: "AvM Season 4", file: "avm_s4.mp3", artist: "可选本地" },
  { id: "animator_vs", title: "Animator vs Animation", file: "animator_vs.mp3", artist: "可选本地" },
];

/** @typedef {{ id: string, title: string, artist: string, file?: string, src?: string, url?: string, imported?: boolean, missing?: boolean }} LobbyTrack */

/** @type {LobbyTrack[]} */
let playlist = [{ id: "off", title: "关闭音乐", artist: "静音大厅" }];

const music = {
  index: 0,
  playing: false,
  volume: 0.45,
  /** @type {HTMLAudioElement | null} */
  audio: null,
  ready: false,
};

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbPut(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function fileExists(path) {
  try {
    let res = await fetch(path, { method: "HEAD" });
    if (!res.ok) res = await fetch(path, { method: "GET", cache: "no-store" });
    if (res.ok && res.body && typeof res.body.cancel === "function") {
      try {
        res.body.cancel();
      } catch {
        /* ignore */
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}

function saveIndex() {
  try {
    localStorage.setItem(STORAGE_KEY, playlist[music.index]?.id || "off");
  } catch {
    /* ignore */
  }
}

function restoreIndex() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) {
      const i = playlist.findIndex((t) => t.id === id);
      if (i >= 0 && (playlist[i].src || playlist[i].id === "off")) {
        music.index = i;
        return;
      }
    }
  } catch {
    /* ignore */
  }
  const local = playlist.findIndex((t) => t.src && t.id !== "off");
  music.index = local >= 0 ? local : 0;
}

function titleFromFilename(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || name;
}

/** Rebuild playlist from assets + imported IndexedDB blobs. */
export async function probeLobbyMusic() {
  /** @type {LobbyTrack[]} */
  const list = [{ id: "off", title: "关闭音乐", artist: "静音大厅" }];
  const seenFiles = new Set();

  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const files = Array.isArray(data?.files) ? data.files : Array.isArray(data) ? data : [];
      for (const file of files) {
        if (typeof file !== "string") continue;
        const path = `assets/music/${file}`;
        if (!(await fileExists(path))) continue;
        seenFiles.add(file.toLowerCase());
        const sug = SUGGESTED.find((s) => s.file.toLowerCase() === file.toLowerCase());
        list.push({
          id: sug?.id || `asset:${file}`,
          title: sug?.title || titleFromFilename(file),
          artist: sug?.artist || "assets/music",
          file,
          src: path,
          url: sug?.bili,
        });
      }
    }
  } catch {
    /* no manifest */
  }

  for (const s of SUGGESTED) {
    if (seenFiles.has(s.file.toLowerCase())) continue;
    const path = `assets/music/${s.file}`;
    if (!(await fileExists(path))) continue;
    seenFiles.add(s.file.toLowerCase());
    list.push({
      id: s.id,
      title: s.title,
      artist: s.artist || "assets/music",
      file: s.file,
      src: path,
      url: s.bili,
    });
  }

  const imported = await idbGetAll();
  for (const row of imported) {
    if (!row?.blob || !row.id) continue;
    const url = URL.createObjectURL(row.blob);
    list.push({
      id: row.id,
      title: row.title || titleFromFilename(row.name || "track"),
      artist: "已导入",
      imported: true,
      src: url,
    });
  }

  for (const s of SUGGESTED) {
    if (list.some((t) => t.file === s.file || t.id === s.id)) continue;
    list.push({
      id: `slot:${s.id}`,
      title: s.title,
      artist: `可选 · assets/music/${s.file}`,
      file: s.file,
      missing: true,
      url: s.bili,
    });
  }

  playlist = list;
  restoreIndex();
  music.ready = true;
  return playlist;
}

export function getLobbyTracks() {
  return playlist;
}

export function getMusicIndex() {
  return music.index;
}

export function getCurrentTrack() {
  return playlist[music.index] || playlist[0];
}

export function isLobbyMusicPlaying() {
  return music.playing && !!music.audio && !music.audio.paused;
}

export function trackHasLocal(track = getCurrentTrack()) {
  if (!track || track.id === "off" || track.missing) return false;
  return !!track.src;
}

function ensureAudio() {
  if (music.audio) return music.audio;
  const a = new Audio();
  a.loop = true;
  a.preload = "auto";
  a.volume = music.volume;
  a.addEventListener("error", () => {
    music.playing = false;
  });
  music.audio = a;
  return a;
}

export function setLobbyMusicVolume(v) {
  music.volume = Math.max(0, Math.min(1, v));
  if (music.audio) music.audio.volume = music.volume;
}

export function selectLobbyTrack(index) {
  const n = playlist.length;
  music.index = ((index % n) + n) % n;
  saveIndex();
}

export function moveLobbyTrack(dir) {
  selectLobbyTrack(music.index + dir);
}

export function stopLobbyMusic() {
  music.playing = false;
  if (music.audio) {
    music.audio.pause();
  }
}

/**
 * @returns {"playing"|"need_file"|"off"|"muted"}
 */
export function playLobbyMusic({ muted = false } = {}) {
  const track = getCurrentTrack();
  if (!track || track.id === "off") {
    stopLobbyMusic();
    return "off";
  }
  if (muted) {
    if (music.audio) music.audio.pause();
    music.playing = false;
    return "muted";
  }
  if (!track.src) {
    stopLobbyMusic();
    return "need_file";
  }
  const a = ensureAudio();
  if (a.getAttribute("data-track") !== track.id) {
    a.src = track.src;
    a.setAttribute("data-track", track.id);
  }
  a.volume = music.volume;
  a.loop = true;
  music.playing = true;
  const p = a.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      music.playing = false;
    });
  }
  return "playing";
}

export function toggleLobbyMusic({ muted = false } = {}) {
  if (muted) return "muted";
  const track = getCurrentTrack();
  if (!track || track.id === "off") return "off";
  if (!trackHasLocal(track)) return "need_file";
  const a = ensureAudio();
  if (music.playing && !a.paused) {
    a.pause();
    music.playing = false;
    return "paused";
  }
  return playLobbyMusic({ muted: false });
}

function safeId(name) {
  return `imp:${Date.now().toString(36)}_${name.replace(/[^\w.-]+/g, "_").slice(0, 48)}`;
}

export function importLobbyFiles() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm,audio/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const files = [...(input.files || [])];
      document.body.removeChild(input);
      if (!files.length) {
        resolve(0);
        return;
      }
      let n = 0;
      for (const file of files) {
        try {
          const id = safeId(file.name);
          const buf = await file.arrayBuffer();
          const blob = new Blob([buf], { type: file.type || "audio/mpeg" });
          await idbPut({
            id,
            name: file.name,
            title: titleFromFilename(file.name),
            blob,
          });
          n += 1;
        } catch {
          /* skip */
        }
      }
      if (n > 0) {
        await probeLobbyMusic();
        const playable = playlist.find((t) => t.imported) || playlist.find((t) => t.src);
        if (playable) {
          const i = playlist.findIndex((t) => t.id === playable.id);
          if (i >= 0) selectLobbyTrack(i);
        }
      }
      resolve(n);
    });
    input.addEventListener("cancel", () => {
      if (input.parentNode) document.body.removeChild(input);
      resolve(0);
    });
    input.click();
  });
}

export async function deleteCurrentImportedTrack() {
  const t = getCurrentTrack();
  if (!t?.imported) return false;
  stopLobbyMusic();
  if (t.src?.startsWith("blob:")) URL.revokeObjectURL(t.src);
  await idbDelete(t.id);
  await probeLobbyMusic();
  return true;
}

export function lobbyMusicStatusLine() {
  const t = getCurrentTrack();
  if (!t || t.id === "off") return "BGM: OFF";
  if (isLobbyMusicPlaying()) return `BGM ▶ ${t.title}`;
  if (trackHasLocal(t)) return `BGM ❚❚ ${t.title}`;
  if (t.missing) return `BGM · 待导入 ${t.title}`;
  return `BGM · ${t.title}`;
}

export function openTrackOnBilibili(track = getCurrentTrack()) {
  const url = track?.url;
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function pickLocalFileForTrack() {
  return importLobbyFiles().then((n) => n > 0);
}

export const LOBBY_TRACKS = playlist;
export const BILI_TRACKS = [];
