/**
 * Account cloud sync — username + password hash only (never plaintext).
 * Backends: local serve.py /api/accounts, or JSONBlob, or CLOUD_OVERRIDE.
 */

import { CLOUD_OVERRIDE, JSONBLOB_ID } from "./cloudConfig.js?v=78";

const QUEUE_KEY = "stickVersus.cloudQueue.v1";
const META_KEY = "stickVersus.cloudMeta.v1";
const STATUS_KEY = "stickVersus.cloudStatus.v1";

let lastStatus = loadStatus();
let pushTimer = null;
let syncing = false;

function loadStatus() {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : { ok: null, message: "尚未同步", at: 0 };
  } catch {
    return { ok: null, message: "尚未同步", at: 0 };
  }
}

function setStatus(ok, message) {
  lastStatus = { ok, message: String(message || ""), at: Date.now() };
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(lastStatus));
  } catch {
    /* ignore */
  }
  return lastStatus;
}

export function getCloudStatus() {
  return lastStatus;
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-500)));
  } catch {
    /* ignore */
  }
}

/**
 * Record an account mutation. Safe to call from anywhere.
 * @param {string} type e.g. login | logout | password_change | upgrade | bind_change
 * @param {object} [payload]
 */
export function queueAccountChange(type, payload = {}) {
  const ev = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: String(type || "unknown"),
    ts: Date.now(),
    invite: payload.invite || null,
    payload: { ...payload },
  };
  delete ev.payload.invite;
  const q = readQueue();
  q.push(ev);
  writeQueue(q);
  return ev;
}

export function peekCloudQueue() {
  return readQueue();
}

export function cloudQueueLength() {
  return readQueue().length;
}

export function markCloudSynced(upToId) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ lastSyncAt: Date.now(), upToId: upToId || null }));
  } catch {
    /* ignore */
  }
}

/** @deprecated kept for callers; prefer syncAccountsFromCloud / pushAccountsToCloud */
export const CLOUD_SYNC_ENDPOINT = "";

export function resolveCloudTarget() {
  if (CLOUD_OVERRIDE && CLOUD_OVERRIDE.url) {
    return {
      kind: CLOUD_OVERRIDE.kind || "rest",
      url: CLOUD_OVERRIDE.url,
      headers: CLOUD_OVERRIDE.headers || {},
    };
  }
  const host = typeof location !== "undefined" ? location.hostname : "";
  if (host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0") {
    return { kind: "local", url: "/api/accounts", headers: {} };
  }
  // LAN IP running serve.py
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { kind: "local", url: "/api/accounts", headers: {} };
  }
  return {
    kind: "jsonblob",
    url: `https://jsonblob.com/api/jsonBlob/${JSONBLOB_ID}`,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  };
}

/** Strip anything that must never leave the device. */
export function sanitizeAccountForCloud(acc) {
  if (!acc || typeof acc !== "object") return null;
  return {
    invite: String(acc.invite || ""),
    role: acc.role || "player",
    label: acc.label || "",
    passHash: String(acc.passHash || ""),
    mustChangePassword: !!acc.mustChangePassword,
    defaultPass: !!acc.defaultPass,
    registered: !!acc.registered,
    createdAt: Number(acc.createdAt) || 0,
    changedAt: Number(acc.changedAt) || 0,
  };
}

export function sanitizeStoreForCloud(store) {
  const accounts = {};
  const src = store?.accounts && typeof store.accounts === "object" ? store.accounts : {};
  for (const [id, acc] of Object.entries(src)) {
    const clean = sanitizeAccountForCloud(acc);
    if (clean && clean.passHash && clean.invite) accounts[id.toLowerCase()] = clean;
  }
  return {
    v: 1,
    game: "stickVersus",
    updatedAt: Date.now(),
    accounts,
  };
}

export function mergeAccountStores(localStore, remoteDoc) {
  const localAcc = { ...(localStore?.accounts || {}) };
  const remoteAcc = remoteDoc?.accounts && typeof remoteDoc.accounts === "object" ? remoteDoc.accounts : {};
  const out = { ...localAcc };

  for (const [id, remote] of Object.entries(remoteAcc)) {
    const key = id.toLowerCase();
    const loc = out[key];
    const rem = sanitizeAccountForCloud(remote);
    if (!rem || !rem.passHash) continue;
    if (!loc) {
      out[key] = rem;
      continue;
    }
    const lt = Math.max(Number(loc.changedAt) || 0, Number(loc.createdAt) || 0);
    const rt = Math.max(Number(rem.changedAt) || 0, Number(rem.createdAt) || 0);
    if (rt > lt) {
      out[key] = { ...loc, ...rem };
    } else if (rt === lt && rem.passHash && rem.passHash !== loc.passHash) {
      // Same timestamp but hash differs — prefer remote (cross-device)
      out[key] = { ...loc, ...rem };
    } else {
      out[key] = { ...rem, ...loc };
    }
  }
  return { accounts: out };
}

async function fetchRemoteDoc(target) {
  const res = await fetch(target.url, {
    method: "GET",
    headers: { Accept: "application/json", ...(target.headers || {}) },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`云端读取失败 HTTP ${res.status}`);
  const data = await res.json();
  // jsonbin.io wraps as { record: {...} }
  if (data && data.record && typeof data.record === "object") return data.record;
  return data;
}

async function putRemoteDoc(target, doc) {
  const body = JSON.stringify(doc);
  // Prefer PUT; some hosts want POST on first create
  let res = await fetch(target.url, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(target.headers || {}),
    },
    body,
  });
  if (res.status === 404 && target.kind === "jsonblob") {
    const createUrl = `https://jsonblob.com/${JSONBLOB_ID}`;
    res = await fetch(createUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body,
    });
  }
  if (!res.ok) throw new Error(`云端写入失败 HTTP ${res.status}`);
  return true;
}

/**
 * Pull remote accounts, merge into local store via callbacks.
 * @param {{ readStore: () => object, writeStore: (s: object) => void }} io
 */
export async function syncAccountsFromCloud(io) {
  if (!io?.readStore || !io?.writeStore) {
    return { ok: false, error: "未绑定本地帐号存储" };
  }
  if (syncing) return { ok: false, error: "同步进行中" };
  syncing = true;
  const target = resolveCloudTarget();
  try {
    let remote = null;
    try {
      remote = await fetchRemoteDoc(target);
    } catch (e) {
      setStatus(false, e?.message || "无法连接云端");
      return { ok: false, error: e?.message || "无法连接云端", target };
    }
    if (!remote) {
      // Empty cloud — push local seeds/accounts
      const doc = sanitizeStoreForCloud(io.readStore());
      try {
        await putRemoteDoc(target, doc);
        setStatus(true, `已初始化云端（${target.kind}）`);
        markCloudSynced("init");
        return { ok: true, pulled: 0, pushed: Object.keys(doc.accounts).length, target };
      } catch (e) {
        setStatus(false, e?.message || "初始化云端失败");
        return { ok: false, error: e?.message || "初始化云端失败", target };
      }
    }
    const local = io.readStore();
    const merged = mergeAccountStores(local, remote);
    io.writeStore(merged);
    const count = Object.keys(merged.accounts || {}).length;
    setStatus(true, `已从云端同步 ${count} 个帐号`);
    markCloudSynced("pull");
    // Mirror merged back so other devices see local-only accounts too
    try {
      await putRemoteDoc(target, sanitizeStoreForCloud(merged));
    } catch {
      /* pull succeeded; push best-effort */
    }
    return { ok: true, pulled: count, target };
  } finally {
    syncing = false;
  }
}

/**
 * Push current local store to cloud (sanitized).
 */
export async function pushAccountsToCloud(io) {
  if (!io?.readStore) return { ok: false, error: "未绑定本地帐号存储" };
  const target = resolveCloudTarget();
  try {
    // Merge with remote first to avoid clobbering concurrent registrations
    let remote = null;
    try {
      remote = await fetchRemoteDoc(target);
    } catch {
      remote = null;
    }
    const local = io.readStore();
    const merged = remote ? mergeAccountStores(local, remote) : local;
    if (io.writeStore && remote) io.writeStore(merged);
    const doc = sanitizeStoreForCloud(merged);
    await putRemoteDoc(target, doc);
    setStatus(true, `已上传 ${Object.keys(doc.accounts).length} 个帐号到云端`);
    markCloudSynced("push");
    writeQueue([]);
    return { ok: true, uploaded: Object.keys(doc.accounts).length, target };
  } catch (e) {
    setStatus(false, e?.message || "上传失败");
    return { ok: false, error: e?.message || "上传失败", target };
  }
}

/** Debounced push after register / password change. */
export function scheduleAccountCloudPush(io, delayMs = 400) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushAccountsToCloud(io).catch(() => {});
  }, delayMs);
}

/**
 * Upload pending event queue (legacy) — also triggers full account push if io given.
 */
export async function flushCloudSync(endpoint, { headers = {}, clearOnSuccess = true, io = null } = {}) {
  if (io) {
    const r = await pushAccountsToCloud(io);
    if (r.ok && clearOnSuccess) writeQueue([]);
    return {
      ok: r.ok,
      uploaded: r.uploaded || 0,
      remaining: cloudQueueLength(),
      error: r.error,
    };
  }
  if (!endpoint) {
    return { ok: false, uploaded: 0, remaining: cloudQueueLength(), error: "未配置云端地址" };
  }
  const events = readQueue();
  if (!events.length) return { ok: true, uploaded: 0, remaining: 0 };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      return { ok: false, uploaded: 0, remaining: events.length, error: `HTTP ${res.status}` };
    }
    if (clearOnSuccess) {
      markCloudSynced(events[events.length - 1]?.id);
      writeQueue([]);
    }
    return { ok: true, uploaded: events.length, remaining: 0 };
  } catch (err) {
    return {
      ok: false,
      uploaded: 0,
      remaining: events.length,
      error: err?.message || "网络错误",
    };
  }
}
