/** Invite-code + local registration — Stick VERSUS auth. */

import { queueAccountChange } from "./cloudSync.js?v=72";

const STORAGE_KEY = "stickVersus.accounts.v1";
const SESSION_KEY = "stickVersus.session.v1";
const MIN_PASSWORD_LEN = 8;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Seed roster. Invite code = account id.
 * Players must change password on first login; admin / tester do not.
 */
export const SEED_ACCOUNTS = [
  { invite: "adminwanttoininin", password: "20140315", role: "admin", label: "管理员" },
  { invite: "testingisgreat", password: "iwanttotest!", role: "tester", label: "测试" },
  { invite: "stickwave01", password: "WavePass01!", role: "player", label: "玩家01" },
  { invite: "stickwave02", password: "WavePass02!", role: "player", label: "玩家02" },
  { invite: "stickwave03", password: "WavePass03!", role: "player", label: "玩家03" },
  { invite: "stickwave04", password: "WavePass04!", role: "player", label: "玩家04" },
  { invite: "stickwave05", password: "WavePass05!", role: "player", label: "玩家05" },
  { invite: "stickwave06", password: "WavePass06!", role: "player", label: "玩家06" },
  { invite: "stickwave07", password: "WavePass07!", role: "player", label: "玩家07" },
  { invite: "stickwave08", password: "WavePass08!", role: "player", label: "玩家08" },
  { invite: "stickwave09", password: "WavePass09!", role: "player", label: "玩家09" },
  { invite: "stickwave10", password: "WavePass10!", role: "player", label: "玩家10" },
];

function emptyStore() {
  return { accounts: {} };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyStore();
    return { accounts: data.accounts && typeof data.accounts === "object" ? data.accounts : {} };
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function roleSkipsForcedChange(role) {
  return role === "admin" || role === "tester";
}

export async function hashPassword(invite, password) {
  const text = `${String(invite).toLowerCase()}::${password}::stickVersus.v1`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fb_${(h >>> 0).toString(16)}`;
}

/** Ensure seed accounts exist; never overwrite a player-changed password. */
export async function ensureSeedAccounts() {
  const store = readStore();
  let changed = false;
  for (const seed of SEED_ACCOUNTS) {
    const id = seed.invite.toLowerCase();
    if (store.accounts[id]) {
      const acc = store.accounts[id];
      // Migrate: admin/tester never forced to change
      if (roleSkipsForcedChange(acc.role || seed.role) && acc.mustChangePassword) {
        acc.mustChangePassword = false;
        changed = true;
      }
      if (!acc.role) {
        acc.role = seed.role;
        changed = true;
      }
      continue;
    }
    store.accounts[id] = {
      invite: seed.invite,
      role: seed.role,
      label: seed.label || seed.role,
      passHash: await hashPassword(seed.invite, seed.password),
      mustChangePassword: !roleSkipsForcedChange(seed.role),
      defaultPass: true,
    };
    changed = true;
  }
  if (changed) writeStore(store);
  return store;
}

export function getSessionInvite() {
  try {
    return localStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

export function getAccount(invite) {
  if (!invite) return null;
  const store = readStore();
  return store.accounts[String(invite).toLowerCase()] || null;
}

export function getCurrentAccount() {
  return getAccount(getSessionInvite());
}

export function isLoggedIn() {
  return !!getCurrentAccount();
}

export function logout() {
  const invite = getSessionInvite();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  if (invite) queueAccountChange("logout", { invite });
}

/**
 * @returns {Promise<{ ok: boolean, error?: string, account?: object, mustChangePassword?: boolean }>}
 */
export async function loginWithInvite(inviteRaw, password) {
  await ensureSeedAccounts();
  const invite = String(inviteRaw || "").trim();
  if (!invite) return { ok: false, error: "请输入帐号或邀请码" };
  if (!password) return { ok: false, error: "请输入密码" };

  const store = readStore();
  const id = invite.toLowerCase();
  const acc = store.accounts[id];
  if (!acc) return { ok: false, error: "帐号不存在" };

  const hash = await hashPassword(acc.invite || invite, password);
  if (hash !== acc.passHash) return { ok: false, error: "密码错误" };

  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    return { ok: false, error: "无法保存登录状态" };
  }

  const force =
    !!acc.mustChangePassword && !roleSkipsForcedChange(acc.role);
  queueAccountChange("login", { invite: acc.invite || id, role: acc.role });

  return {
    ok: true,
    account: acc,
    mustChangePassword: force,
  };
}

function normalizeUsername(raw) {
  return String(raw || "").trim();
}

/** Reserved ids (seed invites + common names) cannot be registered. */
function isReservedUsername(id) {
  if (SEED_ACCOUNTS.some((s) => s.invite.toLowerCase() === id)) return true;
  return id === "admin" || id === "guest" || id === "tester" || id === "root";
}

/**
 * Register a new local player account.
 * @returns {Promise<{ ok: boolean, error?: string, account?: object }>}
 */
export async function registerAccount(usernameRaw, password, confirmPass) {
  await ensureSeedAccounts();
  const username = normalizeUsername(usernameRaw);
  if (!username) return { ok: false, error: "请输入用户名" };
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "用户名 3–20 位，仅字母数字下划线" };
  }
  if (!password) return { ok: false, error: "请输入密码" };
  if (password.length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `密码至少 ${MIN_PASSWORD_LEN} 位` };
  }
  if (password !== confirmPass) return { ok: false, error: "两次密码不一致" };

  const id = username.toLowerCase();
  if (isReservedUsername(id)) return { ok: false, error: "该用户名不可用" };

  const store = readStore();
  if (store.accounts[id]) return { ok: false, error: "用户名已被注册" };

  const acc = {
    invite: username,
    role: "player",
    label: "注册玩家",
    passHash: await hashPassword(username, password),
    mustChangePassword: false,
    defaultPass: false,
    registered: true,
    createdAt: Date.now(),
  };
  store.accounts[id] = acc;
  writeStore(store);

  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    return { ok: false, error: "注册成功但无法自动登录" };
  }

  queueAccountChange("register", {
    invite: username,
    role: "player",
    createdAt: acc.createdAt,
  });

  return { ok: true, account: acc };
}

/**
 * Change password for the current session account.
 * Clears mustChangePassword only on success.
 */
export async function changePassword(oldPass, newPass, confirmPass) {
  const id = getSessionInvite();
  if (!id) return { ok: false, error: "未登录" };
  const store = readStore();
  const acc = store.accounts[id];
  if (!acc) return { ok: false, error: "帐号不存在" };

  if (!newPass || newPass.length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `新密码至少 ${MIN_PASSWORD_LEN} 位` };
  }
  if (newPass !== confirmPass) return { ok: false, error: "两次新密码不一致" };
  if (oldPass === newPass) return { ok: false, error: "新密码不能与旧密码相同" };

  const oldHash = await hashPassword(acc.invite || id, oldPass);
  if (oldHash !== acc.passHash) return { ok: false, error: "旧密码错误" };

  acc.passHash = await hashPassword(acc.invite || id, newPass);
  acc.mustChangePassword = false;
  acc.defaultPass = false;
  acc.changedAt = Date.now();
  store.accounts[id] = acc;
  writeStore(store);
  queueAccountChange("password_change", {
    invite: acc.invite || id,
    role: acc.role,
    changedAt: acc.changedAt,
  });
  return { ok: true };
}

/** Force change only for normal players still on default password. */
export function mustChangePasswordNow() {
  const acc = getCurrentAccount();
  if (!acc) return false;
  if (roleSkipsForcedChange(acc.role)) return false;
  return !!acc.mustChangePassword;
}

export function accountDisplayName() {
  const acc = getCurrentAccount();
  if (!acc) return "";
  return acc.invite || getSessionInvite() || "";
}

/** Test invite has top privileges: free upgrades + skip any stage. */
export function isTesterAccount() {
  const acc = getCurrentAccount();
  return !!acc && acc.role === "tester";
}

export function isAdminAccount() {
  const acc = getCurrentAccount();
  return !!acc && acc.role === "admin";
}
