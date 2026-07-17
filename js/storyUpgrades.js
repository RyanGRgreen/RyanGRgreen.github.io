/** Campaign character upgrades (per invite / registered account). */

import { getSessionInvite, isTesterAccount, getCurrentAccount } from "./accounts.js?v=72";
import { queueAccountChange } from "./cloudSync.js?v=72";

/** @typedef {{ id: string, name: string, desc: string, cost: number, max: number, per: number }} UpgradeDef */

/** @type {UpgradeDef[]} */
export const STORY_UPGRADE_DEFS = [
  { id: "hp", name: "生命", desc: "最大 HP +12", cost: 1, max: 5, per: 12 },
  { id: "dmg", name: "伤害", desc: "攻击伤害 +6%", cost: 2, max: 4, per: 0.06 },
  { id: "speed", name: "移速", desc: "移动速度 +8%", cost: 2, max: 3, per: 0.08 },
  { id: "nodes", name: "节点", desc: "Node 上限 +1", cost: 3, max: 2, per: 1 },
  { id: "stam", name: "体力", desc: "体力上限 +12", cost: 1, max: 4, per: 12 },
  { id: "skill", name: "技能", desc: "技能条上限 +15", cost: 1, max: 4, per: 15 },
];

export const CHAR_UPGRADE_DEFS = STORY_UPGRADE_DEFS;

const START_POINTS = 3;
const MODE = "campaign";

function blankLevels() {
  /** @type {Record<string, number>} */
  const levels = {};
  for (const d of CHAR_UPGRADE_DEFS) levels[d.id] = 0;
  return levels;
}

function storageKey() {
  const id = (getSessionInvite() || "guest").toLowerCase();
  return "stickVersus.campaignUpgrades." + id;
}

function defaultUpgrades() {
  return {
    points: START_POINTS,
    levels: blankLevels(),
    clearedFights: /** @type {(string|number)[]} */ ([]),
  };
}

export function defaultCampaignUpgrades() {
  return defaultUpgrades();
}

/** Admin + players (+ tester) get campaign upgrades. */
export function canUseCampaignUpgrades() {
  const acc = getCurrentAccount();
  if (!acc) return false;
  return acc.role === "admin" || acc.role === "player" || acc.role === "tester";
}

export function loadCampaignUpgrades() {
  const base = defaultUpgrades();
  let loaded = base;
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const data = JSON.parse(raw);
      const levels = blankLevels();
      for (const d of CHAR_UPGRADE_DEFS) {
        const n = Math.floor(Number(data?.levels?.[d.id]) || 0);
        levels[d.id] = Math.max(0, Math.min(d.max, n));
      }
      const cleared = Array.isArray(data?.clearedFights)
        ? data.clearedFights.filter((x) => x != null && x !== "")
        : [];
      loaded = {
        points: Math.max(0, Math.floor(Number(data?.points) || 0)),
        levels,
        clearedFights: [...new Set(cleared)],
      };
    }
  } catch {
    loaded = base;
  }
  if (isTesterAccount()) {
    return { ...loaded, points: Math.max(loaded.points, 999) };
  }
  return loaded;
}

export function saveCampaignUpgrades(state) {
  try {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        points: state.points,
        levels: state.levels,
        clearedFights: state.clearedFights,
      })
    );
  } catch {
    /* ignore */
  }
}

export function getUpgradeDef(id) {
  return CHAR_UPGRADE_DEFS.find((d) => d.id === id) || null;
}

export function tryBuyCampaignUpgrade(state, id) {
  const def = getUpgradeDef(id);
  if (!def) return null;
  const cur = state.levels[id] || 0;
  if (cur >= def.max) return null;
  const tester = isTesterAccount();
  if (!tester && state.points < def.cost) return null;
  const next = {
    ...state,
    points: tester ? Math.max(state.points, 999) : state.points - def.cost,
    levels: { ...state.levels, [id]: cur + 1 },
    clearedFights: [...state.clearedFights],
  };
  saveCampaignUpgrades(next);
  queueAccountChange("upgrade", {
    invite: getSessionInvite(),
    mode: MODE,
    action: "buy",
    id,
    levels: next.levels,
    points: next.points,
  });
  return next;
}

export function maxAllCampaignUpgrades(state) {
  if (!isTesterAccount()) return null;
  const levels = blankLevels();
  for (const d of CHAR_UPGRADE_DEFS) levels[d.id] = d.max;
  const next = {
    points: 999,
    levels,
    clearedFights: [...(state.clearedFights || [])],
  };
  saveCampaignUpgrades(next);
  queueAccountChange("upgrade", {
    invite: getSessionInvite(),
    mode: MODE,
    action: "max_all",
    levels: next.levels,
    points: next.points,
  });
  return next;
}

export function resetCampaignUpgrades(state) {
  let refund = 0;
  for (const d of CHAR_UPGRADE_DEFS) {
    refund += (state.levels[d.id] || 0) * d.cost;
  }
  const next = {
    points: state.points + refund,
    levels: blankLevels(),
    clearedFights: [...state.clearedFights],
  };
  saveCampaignUpgrades(next);
  queueAccountChange("upgrade", {
    invite: getSessionInvite(),
    mode: MODE,
    action: "reset",
    levels: next.levels,
    points: next.points,
  });
  return next;
}

/**
 * Award points the first time a campaign level is cleared.
 * @param {string} levelKey e.g. "0-2" (chapter-level)
 */
export function awardCampaignLevelClear(state, levelKey, isBoss) {
  const key = String(levelKey);
  if (state.clearedFights.includes(key)) {
    return { state, gained: 0 };
  }
  const gained = isBoss ? 2 : 1;
  const next = {
    ...state,
    points: state.points + gained,
    levels: { ...state.levels },
    clearedFights: [...state.clearedFights, key],
  };
  saveCampaignUpgrades(next);
  queueAccountChange("upgrade", {
    invite: getSessionInvite(),
    mode: MODE,
    action: "award",
    levelKey: key,
    gained,
    points: next.points,
  });
  return { state: next, gained };
}

/** Preview numbers for UI. */
export function previewCampaignStats(levels) {
  const L = levels || blankLevels();
  return {
    maxHp: 110 + (L.hp || 0) * 12,
    dmgPct: Math.round((L.dmg || 0) * 6),
    speedPct: Math.round((L.speed || 0) * 8),
    nodes: 4 + (L.nodes || 0),
    stamina: 100 + (L.stam || 0) * 12,
    skill: 100 + (L.skill || 0) * 15,
  };
}

/** Apply saved upgrades onto a Fighter (campaign P1). */
export function applyCampaignUpgradesToFighter(f, state) {
  if (!f || !state) return f;
  const L = state.levels || blankLevels();
  const hpBonus = (L.hp || 0) * 12;
  const spdMul = 1 + (L.speed || 0) * 0.08;
  const dmgMul = 1 + (L.dmg || 0) * 0.06;
  const nodeBonus = L.nodes || 0;
  const stamBonus = (L.stam || 0) * 12;
  const skillBonus = (L.skill || 0) * 15;

  f.maxHp = Math.round((f.maxHp || f.char.maxHp || 110) + hpBonus);
  f.hp = f.maxHp;
  f.char = { ...f.char, speed: (f.char.speed || 2) * spdMul };
  f.dmgScale = (f.dmgScale || 1) * dmgMul;
  f.maxNodes = (f.maxNodes || f.char.nodes || 4) + nodeBonus;
  f.nodes = f.maxNodes;
  f.maxStamina = (f.maxStamina || 100) + stamBonus;
  f.stamina = f.maxStamina;
  f.maxSkill = (f.maxSkill || 100) + skillBonus;
  f.skill = f.maxSkill;
  f.storyUpgraded = true;
  return f;
}
