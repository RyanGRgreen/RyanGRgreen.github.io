/**
 * Cloud account sync config.
 * - Local serve.py → /api/accounts
 * - GitHub Pages / 公网 → JSONBlob（固定 ID，全端共用）
 * - 可改 CLOUD_OVERRIDE 指向自建 Firebase / JSONBin 等
 *
 * 云端只存用户名 + 密码哈希，不存明文密码。
 */

/** Fixed public blob for Stick VERSUS account roster (username + passHash). */
export const JSONBLOB_ID = "a7e3c91b-4f2d-4b8a-9c1e-6d2f8a0b1c3e";

/**
 * Optional override, e.g.:
 * { kind: "rest", url: "https://YOUR.firebaseio.com/stickVersusAccounts.json", headers: {} }
 * Leave null to auto-pick local API or JSONBlob.
 */
export const CLOUD_OVERRIDE = null;
