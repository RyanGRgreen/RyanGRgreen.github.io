/**
 * Local queue of account-related changes for a future cloud server.
 * When a backend exists, call flushCloudSync(url, headers) to POST pending events.
 */

const QUEUE_KEY = "stickVersus.cloudQueue.v1";
const META_KEY = "stickVersus.cloudMeta.v1";

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

/** Mark last successful sync (for UI / future resume). */
export function markCloudSynced(upToId) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ lastSyncAt: Date.now(), upToId: upToId || null }));
  } catch {
    /* ignore */
  }
}

/**
 * Upload pending events to a cloud endpoint.
 * Stub-ready: returns { ok, uploaded, remaining, error }.
 * Server expected: POST JSON { events: [...] } → 200.
 */
export async function flushCloudSync(endpoint, { headers = {}, clearOnSuccess = true } = {}) {
  if (!endpoint) {
    return { ok: false, uploaded: 0, remaining: cloudQueueLength(), error: "未配置云端地址" };
  }
  const events = readQueue();
  if (!events.length) {
    return { ok: true, uploaded: 0, remaining: 0 };
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      return {
        ok: false,
        uploaded: 0,
        remaining: events.length,
        error: `HTTP ${res.status}`,
      };
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

/** Optional future base URL — leave empty until server is ready. */
export const CLOUD_SYNC_ENDPOINT = "";
