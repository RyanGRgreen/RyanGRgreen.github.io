/** Campaign Mode — 3 chapters × 5 levels (swarm grunts + Dark Lord finales). */

import { CHARACTER_ORDER } from "./characters.js?v=72";
import { Match } from "./match.js?v=72";

/** Low-HP gray-headed trash mob. */
function g(id, opts = {}) {
  return {
    id,
    hpMul: opts.hpMul ?? 0.14,
    dmgMul: opts.dmgMul ?? 0.38,
    dropHeal: !!opts.dropHeal,
  };
}

function e(id, opts = {}) {
  return g(id, { hpMul: opts.hpMul ?? 0.22, dmgMul: opts.dmgMul ?? 0.48, dropHeal: opts.dropHeal ?? true });
}

function heal(x, y, amount = 26) {
  return { x, y, type: "heal", amount };
}

const BOSS_BRIEF =
  "巨型定点黑暗领主 — 打发光弱点；半血狂暴。清场后走到 EXIT 出门；期间可按 E 救援。";

export const CAMPAIGN_CHAPTERS = [
  {
    id: "ruins",
    name: "第一章 · 桌面废墟",
    stageId: "ruins",
    chapterScale: 1.0,
    aiAggression: 0,
    levels: [
      {
        name: "断档任务栏",
        areaIndex: 0,
        maxAlive: 3,
        waves: [g("red"), g("red"), g("blue"), g("red", { dropHeal: true }), g("yellow"), g("blue"), g("red")],
        items: [heal(520, 400, 24), heal(900, 440, 20)],
      },
      {
        name: "图标坟场",
        areaIndex: 1,
        maxAlive: 3,
        waves: [
          g("blue"), g("yellow"), g("blue"), g("red"),
          g("yellow", { dropHeal: true }), g("blue"), g("green"), g("red"),
        ],
        items: [heal(420, 420, 28), heal(700, 340, 22)],
      },
      {
        name: "裂窗走廊",
        areaIndex: 2,
        maxAlive: 3,
        waves: [
          g("green"), g("red"), g("green"), g("blue"),
          e("green"), g("yellow"), g("red", { dropHeal: true }), g("green"), g("blue"),
        ],
        items: [heal(640, 300, 30)],
      },
      {
        name: "回收深坑",
        areaIndex: 3,
        maxAlive: 4,
        waves: [
          g("purple"), g("red"), g("purple"), g("blue"), g("red"),
          g("yellow", { dropHeal: true }), g("purple"), g("red"), e("purple"), g("blue"),
        ],
        items: [heal(560, 360, 26), heal(280, 440, 22)],
      },
      {
        name: "黑暗领主 · 体术",
        areaIndex: 4,
        boss: "dark_lord",
        bossChapter: 1,
        bossHud: true,
        colossalBoss: true,
        maxAlive: 2,
        waves: [g("red"), g("red", { dropHeal: true })],
        items: [heal(200, 420, 32)],
      },
    ],
  },
  {
    id: "caves",
    name: "第二章 · 数据洞窟",
    stageId: "caves",
    chapterScale: 1.12,
    aiAggression: 0.35,
    levels: [
      {
        name: "封包竖井",
        areaIndex: 0,
        maxAlive: 3,
        waves: [
          g("yellow"), g("yellow"), g("blue"), g("yellow", { dropHeal: true }),
          g("green"), g("yellow"), g("red"), g("blue"),
        ],
        items: [heal(400, 400, 26), heal(900, 400, 22)],
      },
      {
        name: "晶体岩架",
        areaIndex: 1,
        maxAlive: 3,
        waves: [
          g("blue"), g("green"), g("blue"), g("yellow"),
          e("blue"), g("green", { dropHeal: true }), g("purple"), g("blue"), g("red"),
        ],
        items: [heal(540, 440, 28)],
      },
      {
        name: "缓存空洞",
        areaIndex: 2,
        maxAlive: 4,
        waves: [
          g("purple"), g("purple"), g("red"), g("yellow"),
          g("blue", { dropHeal: true }), g("purple"), g("green"), g("purple"), e("yellow"),
        ],
        items: [heal(100, 420, 24), heal(960, 340, 24)],
      },
      {
        name: "比特流瀑",
        areaIndex: 3,
        maxAlive: 4,
        waves: [
          g("red"), g("yellow"), g("red"), g("blue"), g("yellow"),
          g("green", { dropHeal: true }), g("purple"), g("red"), g("yellow"), e("red"),
        ],
        items: [heal(480, 380, 30), heal(720, 300, 22)],
      },
      {
        name: "黑暗领主 · 数据刃",
        areaIndex: 4,
        boss: "dark_lord",
        bossChapter: 2,
        bossHud: true,
        colossalBoss: true,
        maxAlive: 2,
        waves: [g("yellow"), g("blue", { dropHeal: true })],
        items: [heal(540, 280, 34)],
      },
    ],
  },
  {
    id: "spire",
    name: "第三章 · 核心尖塔",
    stageId: "spire",
    chapterScale: 1.25,
    aiAggression: 0.7,
    levels: [
      {
        name: "下层壁垒",
        areaIndex: 0,
        maxAlive: 4,
        waves: [
          g("red"), g("blue"), g("red"), g("purple"), g("blue"),
          g("yellow", { dropHeal: true }), g("red"), g("green"), g("blue"), e("red"),
        ],
        items: [heal(400, 400, 28), heal(700, 400, 28)],
      },
      {
        name: "窄径攀升",
        areaIndex: 1,
        maxAlive: 3,
        waves: [
          g("purple"), g("purple"), g("yellow"), g("red"),
          e("purple"), g("blue", { dropHeal: true }), g("purple"), g("green"), g("yellow"),
        ],
        items: [heal(560, 500, 30)],
      },
      {
        name: "天桥断口",
        areaIndex: 2,
        maxAlive: 4,
        waves: [
          g("green"), g("yellow"), g("green"), g("blue"), g("red"),
          g("yellow", { dropHeal: true }), g("purple"), g("green"), e("yellow"), g("blue"),
        ],
        items: [heal(200, 340, 26), heal(800, 340, 26)],
      },
      {
        name: "王座阶梯",
        areaIndex: 3,
        maxAlive: 4,
        waves: [
          g("red"), g("purple"), g("red"), g("blue"), g("purple"),
          g("yellow", { dropHeal: true }), g("green"), g("red"), e("purple"), g("blue"), g("red"),
        ],
        items: [heal(400, 420, 32), heal(680, 340, 24)],
      },
      {
        name: "黑暗领主 · 终焉",
        areaIndex: 4,
        boss: "dark_lord",
        bossChapter: 3,
        bossHud: true,
        colossalBoss: true,
        maxAlive: 2,
        waves: [g("purple"), e("red", { dropHeal: true })],
        items: [heal(520, 280, 36), heal(640, 500, 28)],
      },
    ],
  },
];

function pickAllyIds(playerId, count) {
  const pool = CHARACTER_ORDER.filter((id) => id !== playerId);
  const picked = [];
  const bag = [...pool];
  for (let i = 0; i < count && bag.length; i++) {
    const idx = Math.floor(Math.random() * bag.length);
    picked.push(bag.splice(idx, 1)[0]);
  }
  return picked;
}

export class CampaignMode {
  constructor({ playerId = "orange", teammateCount = 0, onEvent, canUpgrade = false } = {}) {
    this.playerId = playerId;
    this.teammateCount = Math.max(0, Math.min(2, teammateCount | 0));
    this.allyIds = pickAllyIds(playerId, this.teammateCount);
    this.onEvent = onEvent || (() => {});
    this.chapterIndex = 0;
    this.levelIndex = 0;
    this.phase = "brief";
    this.phaseT = 0;
    this.match = null;
    this.pendingFight = null;
    this.done = false;
    this.retryCount = 0;
    this.canUpgrade = !!canUpgrade;
    this.lastUpgradeGain = 0;
  }

  get chapter() {
    return CAMPAIGN_CHAPTERS[this.chapterIndex];
  }

  get level() {
    return this.chapter?.levels[this.levelIndex];
  }

  get progressLabel() {
    return `CH${this.chapterIndex + 1}-${this.levelIndex + 1}`;
  }

  get overlay() {
    const ch = this.chapter;
    const lv = this.level;
    if (this.phase === "brief") {
      let body = "小怪灰头低血。绿十字回血。清场后走到右侧 EXIT 出门；期间可靠近按 E 救援队友。";
      if (lv?.boss) {
        body = BOSS_BRIEF;
        if (lv.bossChapter === 1) body += " 本章：体术 + 红蜘蛛。";
        if (lv.bossChapter === 2) body += " 本章：数据刃（流血）+ 地刺。";
        if (lv.bossChapter === 3) body += " 本章：全技能终焉形态。";
      }
      return {
        title: ch?.name || "CAMPAIGN",
        subtitle: lv ? `${this.progressLabel}  ${lv.name}` : "",
        body,
        hint: this.canUpgrade
          ? "确认开战 · U 升级 · Esc 返回"
          : "确认开战 · Esc 返回",
        progressLabel: this.progressLabel,
      };
    }
    if (this.phase === "clear") {
      return {
        title: "LEVEL CLEAR",
        subtitle: lv?.name || "",
        body: this.lastUpgradeGain > 0
          ? `升级点 +${this.lastUpgradeGain}。下一关准备就绪。`
          : this.levelIndex >= 4 && this.chapterIndex >= 2
            ? "黑暗领主倒下。尖塔重归寂静。"
            : "下一关准备就绪。",
        hint: this.canUpgrade
          ? "确认继续 · U 打开升级"
          : "确认继续",
        progressLabel: this.progressLabel,
      };
    }
    if (this.phase === "fail") {
      return {
        title: "LEVEL FAILED",
        subtitle: lv?.name || "",
        body: "全队倒下。本关重来。记得用 E 救援队友。",
        hint: "确认重试 · Esc 放弃",
        progressLabel: this.progressLabel,
      };
    }
    if (this.phase === "complete") {
      return {
        title: "CAMPAIGN COMPLETE",
        subtitle: "三章通关",
        body: "三任黑暗领主均已击破。",
        hint: "确认返回标题",
        progressLabel: "CLEAR",
      };
    }
    return null;
  }

  enemyScale() {
    const ch = this.chapter;
    const base = ch?.chapterScale || 1;
    const levelBump = 1 + this.levelIndex * 0.03;
    const mate = 1 + Math.min(0.2, 0.1 * this.teammateCount);
    return base * levelBump * mate;
  }

  buildFightConfig() {
    const ch = this.chapter;
    const lv = this.level;
    const queue = [];
    if (lv.waves?.length) queue.push(...lv.waves);
    if (lv.boss) {
      queue.push({
        id: lv.boss,
        hpMul: 1,
        dmgMul: 1,
        boss: true,
        bossChapter: lv.bossChapter || 1,
      });
    }
    const first = queue[0];
    const p2Id = typeof first === "string" ? first : first?.id || "red";
    return {
      p1Id: this.playerId,
      p2Id,
      stageId: ch.stageId,
      vsCpu: true,
      solo: true,
      need: 1,
      areaIndex: lv.areaIndex || 0,
      onEvent: this.onEvent,
      campaign: {
        allyIds: this.allyIds,
        enemyQueue: queue,
        enemyScale: this.enemyScale(),
        bossHud: !!lv.bossHud,
        colossalBoss: !!lv.colossalBoss,
        bossChapter: lv.bossChapter || 1,
        aiAggression: (ch.aiAggression || 0) + (lv.boss ? 0.25 : 0),
        label: `${this.progressLabel} ${lv.name}`,
        maxAlive: lv.maxAlive || (lv.boss ? 2 : 3),
        items: lv.items || [],
        playerUpgrades: this.playerUpgrades || null,
      },
    };
  }

  beginLevel() {
    this.phase = "brief";
    this.phaseT = 0;
    this.match = null;
    this.pendingFight = null;
  }

  startFight() {
    this.pendingFight = this.buildFightConfig();
    this.phase = "fight";
    this.phaseT = 0;
  }

  consumePendingFight() {
    const cfg = this.pendingFight;
    this.pendingFight = null;
    return cfg;
  }

  onMatchOver(winner) {
    this.match = null;
    if (winner === 0) {
      this.phase = "clear";
      this.phaseT = 0;
    } else {
      this.phase = "fail";
      this.phaseT = 0;
      this.retryCount += 1;
    }
  }

  advanceAfterClear() {
    if (this.levelIndex < 4) {
      this.levelIndex += 1;
      this.beginLevel();
      return;
    }
    if (this.chapterIndex < CAMPAIGN_CHAPTERS.length - 1) {
      this.chapterIndex += 1;
      this.levelIndex = 0;
      this.beginLevel();
      return;
    }
    this.phase = "complete";
    this.phaseT = 0;
  }

  retryLevel() {
    this.beginLevel();
  }

  /** Tester cheat: jump to chapter/level. */
  jumpTo(chapterIndex, levelIndex) {
    this.chapterIndex = Math.max(0, Math.min(CAMPAIGN_CHAPTERS.length - 1, chapterIndex | 0));
    const maxLv = (CAMPAIGN_CHAPTERS[this.chapterIndex]?.levels?.length || 1) - 1;
    this.levelIndex = Math.max(0, Math.min(maxLv, levelIndex | 0));
    this.match = null;
    this.pendingFight = null;
    this.beginLevel();
  }

  /** Tester: win current fight or advance to next level. */
  cheatSkipForward() {
    if (this.phase === "fight" && this.match) {
      this.match.winner = 0;
      this.match.phase = "matchover";
      this.match.phaseT = 0;
      return "win";
    }
    if (this.phase === "complete") {
      this.done = true;
      return "done";
    }
    if (this.phase === "clear") {
      this.advanceAfterClear();
      return "advance";
    }
    // brief / fail → treat as cleared and move on
    this.match = null;
    this.pendingFight = null;
    this.advanceAfterClear();
    return "advance";
  }

  cheatSkipBack() {
    if (this.phase === "fight" && this.match) {
      this.match = null;
      this.pendingFight = null;
      this.beginLevel();
      return "abortFight";
    }
    if (this.levelIndex > 0) {
      this.levelIndex -= 1;
    } else if (this.chapterIndex > 0) {
      this.chapterIndex -= 1;
      this.levelIndex = (CAMPAIGN_CHAPTERS[this.chapterIndex]?.levels?.length || 1) - 1;
    }
    this.match = null;
    this.pendingFight = null;
    this.beginLevel();
    return "jump";
  }

  update(confirm, back) {
    this.phaseT += 1;
    if (this.phase === "fight") return;

    if (this.phase === "brief") {
      if (back) {
        this.done = true;
        return;
      }
      if (confirm) this.startFight();
      return;
    }

    if (this.phase === "clear") {
      if (confirm) this.advanceAfterClear();
      return;
    }

    if (this.phase === "fail") {
      if (back) {
        this.done = true;
        return;
      }
      if (confirm) this.retryLevel();
      return;
    }

    if (this.phase === "complete") {
      if (confirm || back) this.done = true;
    }
  }
}

export function createCampaignMatch(cfg) {
  return new Match(cfg);
}
