import { CHARACTERS } from "./characters.js?v=71";
import { STAGES, ARENA } from "./stages.js?v=71";
import { Fighter, makeAttack, attackBox, aabb } from "./fighter.js?v=71";

export class Match {
  constructor({
    p1Id,
    p2Id,
    stageId,
    vsCpu,
    solo,
    onEvent,
    need = 3,
    areaIndex = 0,
    campaign = null,
    story = false,
    storyBoss = false,
  }) {
    this.stage = STAGES[stageId];
    this.areaIndex = areaIndex || 0;
    this.vsCpu = vsCpu;
    this.solo = !!solo || !!vsCpu; // single-player: ArrowDown = slide
    this.onEvent = onEvent || (() => {});
    this.files = [0, 0];
    this.need = need;
    this.timer = 99;
    this.timerAcc = 0;
    this.t = 0;
    this.phase = "fight"; // fight, ko, file, matchover, wave, extract
    this.exitZone = null;
    this.phaseT = 0;
    this.projectiles = [];
    this.hooks = [];
    this.fx = [];
    this.winner = null;
    this.lastKoSide = null;
    this.koWall = 0;
    this.pauseCombo = [0, 0];

    this.isStory = !!story;
    this.isCampaign = !!campaign;
    this.bossHud = !!(campaign && campaign.bossHud);
    this.campaignLabel = campaign?.label || null;
    this.enemyScale = campaign?.enemyScale || 1;
    this.aiAggression = campaign?.aiAggression || 0;
    this.downedTimeout = 420;
    this.reviveRange = 78;
    this.enemyQueue = [];
    this.waveIndex = 0;
    this.maxAlive = 1;
    this.pickups = [];
    this.hazards = [];
    this.spawnCD = 0;
    this.spiderCD = 0;
    this.colossalBoss = !!(campaign && campaign.colossalBoss);
    this.bossChapter = campaign?.bossChapter || 1;

    if (campaign) {
      this.need = 1;
      this.vsCpu = true;
      this.solo = true;
      this.setupCampaign(p1Id, campaign);
    } else {
      this.p1 = new Fighter(CHARACTERS[p1Id], 0, 320);
      this.p2 = new Fighter(CHARACTERS[p2Id], 1, 960);
      this.allies = [this.p1];
      this.enemies = [this.p2];
      this.roster = [this.p1, this.p2];
      // Story chapter foes (not final boss): slower walk + slower attacks
      if (this.isStory && !storyBoss) this.applyStoryMobNerf(this.p2);
    }
  }

  applyStoryPlayerBoost(f, upgrades) {
    if (!f || !upgrades) return;
    const L = upgrades.levels || {};
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
  }

  /** Story-mode mid-chapter CPU: less chase pressure, telegraphable swings. */
  applyStoryMobNerf(f) {
    if (!f) return;
    f.isStoryMob = true;
    f.char = {
      ...f.char,
      speed: (f.char.speed || 5) * 0.58,
    };
    f.atkPace = 1.55; // scales startup / active / recovery
    f.aiHesitateBonus = 0.12;
  }

  setupCampaign(p1Id, campaign) {
    this.p1 = new Fighter(CHARACTERS[p1Id], 0, 300);
    this.allies = [this.p1];
    const allyIds = campaign.allyIds || [];
    allyIds.forEach((id, i) => {
      const f = new Fighter(CHARACTERS[id], 0, 180 + i * 70);
      f.isCpuAlly = true;
      this.allies.push(f);
    });
    this.enemyQueue = [...(campaign.enemyQueue || [])];
    if (!this.enemyQueue.length && campaign.enemyId) this.enemyQueue.push(campaign.enemyId);
    this.maxAlive = Math.max(1, campaign.maxAlive || 3);
    this.colossalBoss = !!campaign.colossalBoss;
    this.bossChapter = campaign.bossChapter || 1;
    this.enemies = [];
    this.hazards = [];
    this.waveIndex = 0;
    this.pickups = [];
    this.spiderCD = 0;
    for (const it of campaign.items || []) {
      this.spawnPickup(it.x, it.y, it.type || "heal", it.amount ?? 26);
    }
    this.fillEnemySlots(true);
    this.syncPrimaryEnemy();
    this.rebuildRoster();
    if (campaign.playerUpgrades) {
      this.applyStoryPlayerBoost(this.p1, campaign.playerUpgrades);
    }
  }

  /** Absolute weak-zone boxes for a colossal arena boss. */
  weakZoneBoxes(f) {
    if (!f?.colossalBoss || !f.weakZones) return [];
    return f.weakZones.map((z) => ({
      x: f.x + z.x,
      y: f.y + z.y,
      w: z.w,
      h: z.h,
    }));
  }

  /** @returns {{ hit: boolean, armored: boolean }} */
  probeBossHit(atkBox, defender) {
    if (!defender.colossalBoss) {
      return { hit: aabb(atkBox, defender.body()), armored: false };
    }
    if (!aabb(atkBox, defender.body())) return { hit: false, armored: false };
    for (const wz of this.weakZoneBoxes(defender)) {
      if (aabb(atkBox, wz)) return { hit: true, armored: false };
    }
    return { hit: true, armored: true };
  }

  pinColossalBoss(f) {
    if (!f?.colossalBoss || !f.alive || f.state === "dead") return;
    f.x = f.anchorX ?? f.x;
    f.y = f.anchorY ?? f.y;
    f.vx = 0;
    f.vy = 0;
    f.onGround = true;
    f.dodgeT = 0;
  }

  applyColossalBoss(f) {
    f.colossalBoss = true;
    f.isBoss = true;
    f.bossChapter = f.bossChapter || this.bossChapter || 1;
    f.raged = false;
    f.w = 120;
    f.h = 210;
    f.drawScale = 3.0;
    f.anchorX = (ARENA.wallL + ARENA.wallR) / 2;
    f.anchorY = ARENA.floor - 2;
    f.x = f.anchorX;
    f.y = f.anchorY;
    f.facing = -1;
    f.weakZones = [
      { x: -32, y: -f.h + 6, w: 64, h: 52 },
      { x: -26, y: -Math.round(f.h * 0.52), w: 52, h: 42 },
    ];
    this.pinColossalBoss(f);
  }

  checkBossRage(f) {
    if (!f?.colossalBoss || f.raged || f.hp > f.maxHp * 0.5) return;
    f.raged = true;
    f.dmgScale = (f.dmgScale || 1) * 1.35;
    f.flash = 20;
    this.spawnFx("dmg", f.x, f.y - 180, { life: 70, text: "狂暴", vy: -1.2, big: true });
    this.spawnFx("ko", f.x, f.y - 100, { life: 40 });
    this.onEvent("rage");
  }

  spawnDataPillars(originX) {
    const spots = [-180, -60, 80, 200].map((d) => originX + d);
    for (const x of spots) {
      if (x < ARENA.wallL + 40 || x > ARENA.wallR - 40) continue;
      this.hazards.push({
        type: "data_pillar",
        x,
        y: ARENA.floor,
        w: 26,
        h: 0,
        maxH: 130 + Math.random() * 40,
        phase: "rise",
        t: 0,
        damage: 7,
        hit: new Set(),
      });
    }
  }

  updateHazards() {
    this.hazards = this.hazards.filter((h) => {
      h.t += 1;
      if (h.type === "data_pillar") {
        if (h.phase === "rise") {
          h.h = Math.min(h.maxH, h.h + 8);
          if (h.h >= h.maxH) {
            h.phase = "hold";
            h.t = 0;
          }
        } else if (h.phase === "hold") {
          if (h.t > 70) {
            h.phase = "sink";
            h.t = 0;
          }
        } else {
          h.h = Math.max(0, h.h - 10);
          if (h.h <= 0) return false;
        }
        const box = { x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h };
        for (const a of this.living(0)) {
          if (h.hit.has(a)) continue;
          if (!aabb(box, a.body())) continue;
          // Can dash through, but still take damage
          h.hit.add(a);
          a.hp = Math.max(0, a.hp - h.damage);
          a.updateDanger();
          a.flash = 8;
          a.vx += Math.sign(a.x - h.x) * 4 || a.facing;
          this.spawnFx("hit", a.x, a.y - 40, { life: 12 });
          this.spawnFx("dmg", a.x, a.y - 70, { life: 36, text: String(h.damage), vy: -1.8 });
          if (a.hp <= 0) this.triggerKo(a, this.p2, "hp");
        }
      }
      return true;
    });
  }

  tickBleedStatuses() {
    for (const f of this.roster) {
      if (!f.alive || f.state === "dead" || f.state === "downed") continue;
      if ((f.bleedT || 0) <= 0) continue;
      f.bleedT -= 1;
      f.bleedAcc = (f.bleedAcc || 0) + 0.5 / 60; // 0.5 HP / sec
      if (f.bleedAcc >= 1) {
        const ticks = Math.floor(f.bleedAcc);
        f.bleedAcc -= ticks;
        f.hp = Math.max(0, f.hp - ticks);
        f.updateDanger();
        if (this.t % 20 === 0) {
          this.spawnFx("dmg", f.x, f.y - 60, { life: 24, text: "BLEED", vy: -1 });
        }
        if (f.hp <= 0) this.triggerKo(f, this.p2, "hp");
      }
    }
  }

  trySpawnSpiders(boss) {
    if (!boss?.colossalBoss || boss.bossChapter !== 1) return;
    if (this.spiderCD > 0) {
      this.spiderCD -= 1;
      return;
    }
    const spiders = this.enemies.filter((e) => e.alive && e.char?.id === "red_spider");
    if (spiders.length >= 3) return;
    this.spiderCD = boss.raged ? 160 : 240;
    const x = boss.x + (Math.random() > 0.5 ? -90 : 90);
    this.spawnCampaignEnemy(
      { id: "red_spider", hpMul: 0.85, dmgMul: 0.55 },
      Math.max(ARENA.wallL + 40, Math.min(ARENA.wallR - 40, x))
    );
    this.rebuildRoster();
    this.spawnFx("portal", x, boss.y - 40, { life: 18 });
  }

  rebuildRoster() {
    this.roster = [...this.allies, ...this.enemies];
  }

  syncPrimaryEnemy() {
    const living = this.living(1);
    const boss = living.find((f) => f.isBoss || f.char?.boss);
    this.p2 = boss || living[0] || this.enemies[this.enemies.length - 1] || this.p1;
    if (this.p2?.char?.boss || this.p2?.isBoss) this.bossHud = true;
  }

  normalizeEnemySpec(spec) {
    if (typeof spec === "string") {
      const isBoss = !!CHARACTERS[spec]?.boss;
      return {
        id: spec,
        hpMul: isBoss ? 1 : 0.28,
        dmgMul: isBoss ? 1 : 0.62,
        dropHeal: false,
        boss: isBoss,
      };
    }
    return {
      id: spec.id,
      hpMul: spec.hpMul ?? (spec.boss ? 1 : 0.28),
      dmgMul: spec.dmgMul ?? (spec.boss ? 1 : 0.62),
      dropHeal: !!spec.dropHeal,
      boss: !!(spec.boss || CHARACTERS[spec.id]?.boss),
      bossChapter: spec.bossChapter || this.bossChapter || 1,
    };
  }

  spawnCampaignEnemy(spec, x) {
    const s = this.normalizeEnemySpec(spec);
    const char = CHARACTERS[s.id];
    if (!char) return null;
    const f = new Fighter(char, 1, x);
    const scale = this.enemyScale;
    const hpMul = s.hpMul * scale;
    const dmgMul = s.dmgMul * scale;
    f.maxHp = Math.max(8, Math.round(char.maxHp * hpMul));
    f.hp = f.maxHp;
    f.dmgScale = dmgMul;
    f.isBoss = !!s.boss;
    f.dropHeal = !!s.dropHeal;
    f.isGrunt = !f.isBoss && (s.hpMul < 0.55 || s.id === "red_spider");
    f.grayGrunt = f.isGrunt && s.id !== "red_spider";
    f.bossChapter = s.bossChapter || this.bossChapter || 1;
    // Campaign grunts: slower chase so they don't overwhelm with speed
    if (f.isGrunt && !f.isBoss) {
      const spdMul = f.grayGrunt ? 0.34 : 0.45; // spiders a bit faster than gray trash
      f.char = { ...f.char, speed: (f.char.speed || 2) * spdMul };
    }
    if (f.isBoss && this.colossalBoss) {
      this.applyColossalBoss(f);
      this.enemies = this.enemies.filter((e) => e.isBoss || e === f);
      this.maxAlive = Math.max(1, f.bossChapter === 1 ? 4 : 1);
      this.enemyQueue = [];
    }
    this.enemies.push(f);
    if (f.isBoss) this.bossHud = true;
    return f;
  }

  fillEnemySlots(initial = false) {
    let spawned = 0;
    while (this.living(1).length < this.maxAlive && this.enemyQueue.length) {
      const n = this.living(1).length;
      const x = Math.min(ARENA.wallR - 50, 820 + n * 85 + (Math.random() * 50 - 10));
      this.spawnCampaignEnemy(this.enemyQueue.shift(), x);
      spawned += 1;
      if (!initial) this.waveIndex += 1;
    }
    if (spawned) {
      this.syncPrimaryEnemy();
      this.rebuildRoster();
    }
    return spawned > 0;
  }

  /** @deprecated — use fillEnemySlots */
  spawnNextEnemy(initial = false) {
    return this.fillEnemySlots(initial);
  }

  spawnPickup(x, y, type = "heal", amount = 26) {
    this.pickups.push({
      x,
      y,
      type,
      amount,
      bob: Math.random() * 20,
      life: 60 * 45,
    });
  }

  updatePickups() {
    if (!this.pickups.length) return;
    this.pickups = this.pickups.filter((p) => {
      p.bob += 1;
      p.life -= 1;
      if (p.life <= 0) return false;
      for (const a of this.allies) {
        if (!a.alive || a.state === "downed" || a.state === "dead" || a.hp <= 0) continue;
        if (Math.abs(a.x - p.x) > 38 || Math.abs(a.y - p.y) > 56) continue;
        if (p.type === "heal") {
          const before = a.hp;
          a.hp = Math.min(a.maxHp, a.hp + p.amount);
          const gained = Math.round(a.hp - before);
          if (gained > 0) {
            a.flash = 8;
            this.spawnFx("dmg", a.x, a.y - 86, {
              life: 40,
              text: `+${gained}`,
              vy: -1.8,
              big: true,
            });
            this.onEvent("heal", { amount: gained });
          }
          return false;
        }
      }
      return true;
    });
  }

  living(team) {
    const list = team === 0 ? this.allies : this.enemies;
    return list.filter((f) => f.alive && f.state !== "downed" && f.hp > 0);
  }

  nearestFoe(f) {
    const foes = f.side === 0 ? this.living(1) : this.living(0);
    if (!foes.length) return f.side === 0 ? this.p2 : this.p1;
    let best = foes[0];
    let bestD = Math.hypot(best.x - f.x, (best.y - f.y) * 0.7);
    for (let i = 1; i < foes.length; i++) {
      const d = Math.hypot(foes[i].x - f.x, (foes[i].y - f.y) * 0.7);
      if (d < bestD) {
        best = foes[i];
        bestD = d;
      }
    }
    return best;
  }

  /** AI vertical pathing: jump onto platforms / air-jump toward higher targets. */
  aiSeekVertical(me, tx, ty) {
    const out = { dirX: 0, jump: false, jumpHeld: false, climbing: false };
    if (!me || me.colossalBoss) return out;
    const dx = tx - me.x;
    const dy = ty - me.y; // negative = target above
    const t = this.t / 60;
    const plats = this.platforms();

    // --- Target above: climb ---
    if (dy < -32) {
      out.climbing = true;
      let best = null;
      let bestScore = Infinity;
      for (const p of plats) {
        let px = p.x;
        if (p.moving) px = p.x + Math.sin(t * p.speed) * p.amp;
        const mid = px + p.w / 2;
        const top = p.y;
        // Must be above current feet
        if (top >= me.y - 10) continue;
        // Prefer steps between me and target (or near target height)
        if (top < ty - 90) continue;
        const heightGain = me.y - top;
        if (heightGain < 24 || heightGain > 260) continue;
        const horiz = Math.abs(mid - me.x);
        if (horiz > 240) continue;
        const score =
          Math.abs(mid - tx) * 0.45 +
          Math.abs(top - ty) * 0.75 +
          horiz * 0.25 +
          Math.max(0, heightGain - 170) * 1.2;
        if (score < bestScore) {
          bestScore = score;
          best = { mid, top, left: px, right: px + p.w };
        }
      }

      // Fallback: any platform under the target's x that is above me
      if (!best) {
        for (const p of plats) {
          let px = p.x;
          if (p.moving) px = p.x + Math.sin(t * p.speed) * p.amp;
          const mid = px + p.w / 2;
          const top = p.y;
          if (top >= me.y - 10 || top < ty - 120) continue;
          if (tx < px - 20 || tx > px + p.w + 20) continue;
          const horiz = Math.abs(mid - me.x);
          if (horiz > 260) continue;
          const score = Math.abs(top - ty) + horiz * 0.3;
          if (score < bestScore) {
            bestScore = score;
            best = { mid, top, left: px, right: px + p.w };
          }
        }
      }

      const aimX = best ? best.mid : tx;
      out.dirX = Math.sign(aimX - me.x) || Math.sign(dx) || me.facing;

      const under =
        best &&
        me.x + me.w / 2 > best.left - 16 &&
        me.x - me.w / 2 < best.right + 16;
      const linedUp = Math.abs(aimX - me.x) < 100;

      if (me.onGround) {
        if (under || linedUp || Math.abs(dx) < 110) out.jump = true;
      } else {
        // Air-jump while still short of height
        if (me.y > ty + 40 && me.airJumpsLeft > 0 && me.vy > -3) out.jump = true;
        if (me.char.wings && me.vy > 0) out.jumpHeld = true;
        // Wall-jump assist toward higher ground
        if (me.onWall && me.y > ty + 30) out.jump = true;
      }
      return out;
    }

    // --- Target below: walk off platform toward them ---
    if (dy > 70) {
      out.climbing = Math.abs(dx) < 50;
      if (Math.abs(dx) > 18) out.dirX = Math.sign(dx);
      else {
        // Stacked above — pick an edge and drop
        let edge = me.facing || 1;
        for (const p of plats) {
          let px = p.x;
          if (p.moving) px = p.x + Math.sin(t * p.speed) * p.amp;
          if (me.y > p.y + 4 || me.y < p.y - 4) continue;
          if (me.x < px || me.x > px + p.w) continue;
          const toL = me.x - px;
          const toR = px + p.w - me.x;
          edge = toL < toR ? -1 : 1;
          break;
        }
        out.dirX = edge;
      }
    }

    return out;
  }

  applyAiVertical(me, input, tx, ty) {
    const seek = this.aiSeekVertical(me, tx, ty);
    if (seek.dirX) input.dirX = seek.dirX;
    if (seek.jump) input.jump = true;
    if (seek.jumpHeld) input.jumpHeld = true;
    return seek;
  }

  nearestDownedAlly(f) {
    let best = null;
    let bestD = Infinity;
    for (const a of this.allies) {
      if (a === f || a.state !== "downed") continue;
      const d = Math.abs(a.x - f.x);
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  get area() {
    return this.stage.areas[this.areaIndex];
  }

  platforms() {
    return this.area.platforms || [];
  }

  spawnFx(type, x, y, extra = {}) {
    const life = extra.life ?? 20;
    this.fx.push({ type, x, y, life, lifeMax: life, ...extra });
  }

  update(i1, i2) {
    this.t += 1;
    this.phaseT += 1;

    if (this.phase === "fight") {
      this.timerAcc += 1;
      if (this.timerAcc >= 60) {
        this.timerAcc = 0;
        this.timer = Math.max(0, this.timer - 1);
        if (this.timer === 0) this.timeOut();
      }

      if (this.isCampaign) {
        this.tickCampaignFight(i1);
        this.updatePickups();
        this.updateHazards();
        this.tickBleedStatuses();
        const boss = this.enemies.find((e) => e.colossalBoss && e.alive);
        if (boss) {
          this.checkBossRage(boss);
          this.trySpawnSpiders(boss);
        }
        if (this.spawnCD > 0) this.spawnCD -= 1;
        else if (this.enemyQueue.length && this.living(1).length < this.maxAlive) {
          this.fillEnemySlots(false);
          this.spawnCD = 28;
        }
      } else {
        this.tickFighter(this.p1, i1, this.p2);
        this.tickFighter(this.p2, this.vsCpu ? this.cpuInput(this.p2, this.p1) : i2, this.p1);
      }
      this.tickStaminaBars();
      this.resolveCombat();
      this.updateProjectiles();
      this.updateHooks();
      this.tickCritWindows();
    } else if (this.phase === "extract") {
      // Cleared — walk to EXIT; can still revive teammates
      this.tickCampaignFight(i1);
      this.updatePickups();
      this.updateHazards();
      this.tickBleedStatuses();
      this.tickStaminaBars();
      this.updateProjectiles();
      this.updateHooks();
      this.checkExtractExit();
    } else if (this.phase === "wave") {
      for (const f of this.roster) this.tickFighterPassive(f);
      this.updatePickups();
      if (this.phaseT > 36) {
        if (this.fillEnemySlots(false) || this.living(1).length > 0) {
          this.phase = "fight";
          this.phaseT = 0;
          this.timer = Math.max(this.timer, 60);
          this.spawnCD = 12;
        } else {
          this.beginExtract();
        }
      }
    } else if (this.phase === "ko") {
      for (const f of this.roster) this.tickFighterPassive(f);
      this.updateProjectiles();
      if (this.phaseT > 90) {
        if (this.isCampaign) {
          // Campaign no longer uses ko→auto clear; fail path only
          if (this.winner === 1) this.finishCampaign(1);
          else this.beginExtract();
        } else this.nextFile();
      }
    } else if (this.phase === "file") {
      if (this.phaseT > 60) {
        this.phase = "fight";
        this.phaseT = 0;
      }
    }

    this.fx = this.fx.filter((f) => {
      f.life -= 1;
      if (f.vx) f.x += f.vx;
      if (f.vy) f.y += f.vy;
      return f.life > 0;
    });
  }

  tickCampaignFight(i1) {
    for (const f of this.allies) {
      if (f.state === "downed") {
        this.tickDowned(f, i1);
        continue;
      }
      if (!f.alive || f.state === "dead") {
        this.tickFighterPassive(f);
        continue;
      }
      if (f === this.p1) {
        this.tickFighter(f, i1, this.nearestFoe(f));
      } else {
        this.tickFighter(f, this.cpuInput(f, this.nearestFoe(f), true), this.nearestFoe(f));
      }
    }
    for (const f of this.enemies) {
      if (!f.alive || f.state === "dead") {
        this.tickFighterPassive(f);
        continue;
      }
      const target = this.nearestFoe(f);
      if (f.colossalBoss) {
        f.facing = Math.sign(target.x - f.x) || f.facing;
        const input = this.cpuInput(f, target, false);
        input.dirX = 0;
        input.dirY = 0;
        input.jump = false;
        input.jumpHeld = false;
        input.dodge = false;
        input.slide = false;
        this.tickFighter(f, input, target);
        this.pinColossalBoss(f);
      } else {
        this.tickFighter(f, this.cpuInput(f, target, false), target);
      }
    }
  }

  enterDowned(f) {
    f.hp = 0;
    f.state = "downed";
    f.alive = true;
    f.downedT = this.downedTimeout;
    f.vx = 0;
    f.vy = 0;
    f.attack = null;
    f.hitstun = 0;
    f.knockdownT = 0;
    f.juggleSlam = false;
    f.juggleSlammer = null;
    f.juggleAirTime = 0;
    f.invuln = 9999;
    f.pose = "dead";
    this.spawnFx("dmg", f.x, f.y - 88, { life: 40, text: "DOWNED", vy: -1.4, big: true });
  }

  /** Soft trip — still has HP; up-attack can launch for juggle. */
  enterKnockdown(f, attacker) {
    if (!f || f.colossalBoss || f.state === "downed" || f.state === "dead" || f.hp <= 0) return;
    f.state = "knockdown";
    f.knockdownT = 78;
    f.hitstun = 0;
    f.attack = null;
    f.blockDir = 0;
    f.nodeGuard = false;
    f.charging = false;
    f.juggleSlam = false;
    f.juggleSlammer = null;
    f.juggleAirTime = 0;
    f.vx = (attacker?.facing || f.facing || 1) * 2.2;
    f.vy = 0;
    f.onGround = true;
    f.pose = "dead";
    f.invuln = 0;
    this.spawnFx("dmg", f.x, f.y - 72, { life: 36, text: "TRIP", vy: -1.2, big: true });
    this.onEvent("knockdown");
  }

  tickKnockdown(f) {
    f.knockdownT = Math.max(0, (f.knockdownT || 0) - 1);
    f.state = "knockdown";
    f.pose = "dead";
    f.attack = null;
    f.blockDir = 0;
    f.nodeGuard = false;
    f.vx *= 0.82;
    f.vy = 0;
    f.applyPhysics(this.platforms(), this.t / 60);
    if (f.knockdownT <= 0) {
      f.state = "idle";
      f.pose = "idle";
      f.knockdownCD = 90;
      f.invuln = Math.max(f.invuln || 0, 14);
      this.spawnFx("dmg", f.x, f.y - 70, { life: 22, text: "!", vy: -1 });
    }
  }

  /** Chance to trip on hit (all modes). Not danger, not campaign downed. */
  rollKnockdown(attacker, defender, atk) {
    if (!defender || defender.colossalBoss || defender.hp <= 0) return false;
    if (defender.state === "knockdown" || defender.state === "downed" || defender.state === "dead") return false;
    if ((defender.knockdownCD || 0) > 0) return false;
    if (atk?.projectile && (atk.kb || 0) < 7) return false;
    const kb = atk?.kb ?? 0;
    if (kb < 4.5) return false;
    let chance = 0.16 + Math.min(0.14, (kb - 4.5) * 0.025);
    if (defender.onGround) chance += 0.08;
    else chance -= 0.04;
    // Up-attacks already launch — rarer trip
    if (atk.slot === "u" || atk.overhead) chance *= 0.4;
    if (defender.danger) chance *= 0.85; // still possible, but not tied to danger
    if (attacker?.crisisBuff && attacker.crisisBuff > 1) chance += 0.04;
    return Math.random() < Math.max(0.06, Math.min(0.38, chance));
  }

  launchFromKnockdown(attacker, defender, atk) {
    defender.state = "hit";
    defender.knockdownT = 0;
    defender.onGround = false;
    defender.pose = "hit";
    const kb = atk.kb ?? 8;
    defender.vy = -15.5 - Math.min(5.5, kb * 0.45);
    defender.vx = (attacker?.facing || 1) * (2.5 + Math.min(4, kb * 0.2));
    defender.hitstun = Math.max(defender.hitstun || 0, Math.floor(16 + kb));
    defender.knockdownCD = 36; // brief before next trip after juggle
    // Fall damage when they hit ground / platform
    defender.juggleSlam = true;
    defender.juggleSlammer = attacker || null;
    defender.juggleAirTime = 0;
    defender.juggleSlamDmg = Math.round(10 + Math.min(6, kb * 0.45));
    this.spawnFx("dmg", defender.x, defender.y - 96, {
      life: 40,
      text: "LAUNCH",
      vy: -2,
      big: true,
    });
    this.spawnFx("slash", defender.x, defender.y - 50, { life: 12, facing: attacker?.facing || 1 });
    this.onEvent("launch");
  }

  /** After TRIP→LAUNCH: landing deals slam damage (all modes). */
  checkJuggleSlam(f, attackerHint) {
    if (!f?.juggleSlam) return;
    if (!f.onGround) {
      f.juggleAirTime = (f.juggleAirTime || 0) + 1;
      return;
    }
    if ((f.juggleAirTime || 0) < 12) {
      // Barely left ground — cancel without slam
      f.juggleSlam = false;
      f.juggleAirTime = 0;
      f.juggleSlammer = null;
      f.juggleSlamDmg = 0;
      return;
    }
    f.juggleSlam = false;
    const dmg = f.juggleSlamDmg || 12;
    f.juggleAirTime = 0;
    f.juggleSlamDmg = 0;
    if (f.hp <= 0 || f.state === "downed" || f.state === "dead") {
      f.juggleSlammer = null;
      return;
    }
    f.hp = Math.max(0, f.hp - dmg);
    f.updateDanger();
    f.hitstun = Math.max(f.hitstun || 0, 16);
    f.flash = 10;
    f.state = f.hp > 0 ? "hit" : f.state;
    f.pose = "hit";
    this.spawnFx("hit", f.x, f.y - 28, {
      life: 16,
      big: true,
      facing: (f.juggleSlammer || attackerHint)?.facing || f.facing,
    });
    this.spawnFx("dmg", f.x, f.y - 78, {
      life: 48,
      text: `SLAM ${dmg}`,
      vy: -2.2,
      big: true,
    });
    const atk = f.juggleSlammer || attackerHint || null;
    f.juggleSlammer = null;
    this.onEvent("juggleSlam", { dmg });
    if (atk) {
      atk.gainStamina?.(10);
      atk.gainSkillFromHit?.();
    }
    if (f.hp <= 0) this.triggerKo(f, atk, "hp");
  }

  tickDowned(f, i1) {
    f.downedT = Math.max(0, (f.downedT || 0) - 1);
    f.pose = "dead";
    f.vx *= 0.8;
    f.applyPhysics(this.platforms(), this.t / 60);
    f.reviveHint = false;
    for (const a of this.allies) {
      if (a === f || !a.alive || a.state === "downed" || a.hp <= 0) continue;
      const near = Math.abs(a.x - f.x) < this.reviveRange && Math.abs(a.y - f.y) < 70;
      if (!near) continue;
      f.reviveHint = true;
      // Player: must press E (revive). AI allies: auto after a short linger.
      if (a === this.p1) {
        if (i1?.revive) {
          this.reviveFighter(f);
          return;
        }
      } else {
        a.reviveWait = (a.reviveWait || 0) + 1;
        if (a.reviveWait > 45) {
          a.reviveWait = 0;
          this.reviveFighter(f);
          return;
        }
      }
    }
    if (f.downedT <= 0) {
      f.alive = false;
      f.state = "dead";
      if (!this.living(0).length && !this.allies.some((a) => a.state === "downed" && a.alive)) {
        this.finishCampaign(1);
      } else if (!this.living(0).length) {
        const anyDowned = this.allies.some((a) => a.state === "downed");
        if (!anyDowned) this.finishCampaign(1);
      }
    }
  }

  reviveFighter(f) {
    f.hp = Math.max(1, Math.round(f.maxHp * 0.35));
    f.state = "idle";
    f.pose = "idle";
    f.downedT = 0;
    f.alive = true;
    f.invuln = 70;
    f.flash = 14;
    this.spawnFx("portal", f.x, f.y - 40, { life: 22 });
    this.spawnFx("dmg", f.x, f.y - 90, { life: 36, text: "REVIVE", vy: -1.6, big: true });
    this.onEvent("revive");
    this.refreshAllyCrisisBuff();
  }

  finishCampaign(winnerSide) {
    if (this.phase === "matchover") return;
    this.winner = winnerSide;
    this.phase = "matchover";
    this.phaseT = 0;
    this.exitZone = null;
    this.onEvent("matchover", { winner: winnerSide, campaign: true });
  }

  /** After last foe falls — open EXIT; player must walk out (can revive first). */
  beginExtract() {
    if (this.phase === "extract" || this.phase === "matchover") return;
    this.phase = "extract";
    this.phaseT = 0;
    this.winner = null;
    this.enemyQueue = [];
    this.timer = Math.max(this.timer, 99);
    this.exitZone = {
      x: ARENA.wallR - 70,
      y: ARENA.floor,
      w: 90,
      h: 110,
    };
    this.spawnFx("dmg", this.exitZone.x, ARENA.floor - 130, {
      life: 80,
      text: "EXIT →",
      vy: -0.8,
      big: true,
    });
    this.onEvent("extract");
  }

  checkExtractExit() {
    if (!this.exitZone || this.phase !== "extract") return;
    const p = this.p1;
    if (!p || !p.alive || p.state === "downed" || p.hp <= 0) return;
    const z = this.exitZone;
    if (Math.abs(p.x - z.x) < z.w * 0.55 && p.y >= ARENA.floor - 90) {
      this.finishCampaign(0);
    }
  }

  tickFighterPassive(f) {
    f.applyPhysics(this.platforms(), this.t / 60);
    f.anim += 1;
    if (f.flash > 0) f.flash -= 1;
    if (f.invuln > 0) f.invuln -= 1;
  }

  tickFighter(f, input, opp) {
    f.anim += 1;
    f.updateDanger();
    if (f.flash > 0) f.flash -= 1;
    if (f.invuln > 0) f.invuln -= 1;
    if (f.hitstun > 0) f.hitstun -= 1;
    if (f.stun > 0) f.stun -= 1;
    if (f.controlLock > 0) f.controlLock -= 1;
    if (f.critWindow > 0) f.critWindow -= 1;
    if (f.dodgeCD > 0) f.dodgeCD -= 1;
    if (f.knockdownCD > 0) f.knockdownCD -= 1;
    f.repairNodes(1);
    if (f.mistUntil > 0) f.mistUntil -= 1;

    // Combat knockdown (trip) — not campaign revive downed
    if (f.state === "knockdown") {
      this.tickKnockdown(f);
      return;
    }

    // --- Green hook state machine ---
    if (this.tickHookVictim(f, input, opp)) return;
    if (this.tickHookAttacker(f, input, opp)) return;

    if (f.hitstun > 0 || f.state === "dead") {
      f.pose = f.state === "dead" ? "dead" : "hit";
      f.applyPhysics(this.platforms(), this.t / 60);
      this.checkHookLanding(f, opp);
      this.checkJuggleSlam(f, opp);
      this.checkWallKo(f, opp);
      return;
    }

    if (f.stun > 0) {
      f.state = "stun";
      f.pose = "stun";
      f.blockDir = 0;
      f.nodeGuard = false;
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }

    // --- Dodge / 后撤步 (Animation Versus style: keep facing opponent on backdash) ---
    if (f.dodgeT > 0) {
      f.dodgeT -= 1;
      f.state = "dodge";
      f.pose = f.dodgeBack ? "backdash" : "dodge";
      f.vx = f.dodgeDir * (f.dodgeBack ? 11.5 : 13);
      if (!f.onGround) f.vy = Math.min(f.vy, 2);
      f.dodgeGhostTimer = (f.dodgeGhostTimer || 0) + 1;
      if (f.dodgeGhostTimer % 2 === 0) this.spawnDodgeGhost(f);
      if (f.dodgeGhostTimer === 1 || f.dodgeGhostTimer === 6) {
        // Trail sits behind travel (same sign as dodge-start slash)
        this.spawnFx("slash", f.x - f.dodgeDir * 12, f.y - 36, {
          life: 8,
          facing: f.dodgeDir,
        });
      }
      f.applyPhysics(this.platforms(), this.t / 60);
      this.checkHookLanding(f, opp);
      this.checkJuggleSlam(f, opp);
      this.checkWallKo(f, opp);
      return;
    }

    if (input.dodge && f.dodgeCD <= 0 && !f.attack) {
      const DODGE_COST = 28;
      if (!f.spendStamina(DODGE_COST)) {
        this.spawnFx("block", f.x, f.y - 50, { life: 8 });
        f.applyPhysics(this.platforms(), this.t / 60);
        return;
      }
      const toOpp = Math.sign(opp.x - f.x) || f.facing;
      const dir = input.dirX !== 0 ? input.dirX : toOpp;
      const isBack = dir === -toOpp;
      f.dodgeDir = dir;
      f.dodgeBack = isBack;
      // AV: always face opponent; backdash retreats while looking at them
      f.facing = toOpp;
      f.dodgeT = isBack ? 16 : 14;
      f.dodgeCD = 42;
      f.dodgeGhostTimer = 0;
      f.attack = null;
      f.blockDir = 0;
      f.nodeGuard = false;
      f.state = "dodge";
      f.pose = isBack ? "backdash" : "dodge";
      f.vx = dir * (isBack ? 11.5 : 13);
      this.spawnDodgeGhost(f);
      // Slash wake behind travel (dodgeDir); body may still face opponent on backdash
      this.spawnFx("slash", f.x - dir * 16, f.y - 36, { life: 10, facing: dir });
      this.onEvent("dodge");
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }

    f.faceOpponent(opp);

    // Ongoing attack
    if (f.attack) {
      f.attack.frame += 1;
      if (f.attack.travel) {
        f.vx = f.attack.travel;
      }
      if (f.attack.dive) {
        f.vy = Math.max(f.vy, 10);
        f.vx = f.facing * 3;
      }
      // Directional swing burst when active frames start (non-projectile)
      if (
        !f.attack.projectile &&
        !f.attack.hookCast &&
        f.attack.frame === f.attack.startup
      ) {
        // Back-attacks (slot b) swing behind; others slash in front
        const slashDir = f.attack.slot === "b" ? -f.facing : f.facing;
        this.spawnFx("slash", f.x + slashDir * 28, f.y - 40, {
          life: 10,
          facing: slashDir,
        });
      }
      if (f.attack.teleport && f.attack.frame === f.attack.startup) {
        if (f.attack.groundSnap) {
          f.x = opp.x - f.facing * 50;
          f.y = ARENA.floor;
          f.vy = 0;
          f.onGround = true;
        } else if (f.char.id === "blue" || f.attack.pose === "portal") {
          // Blue Portal: always drop in a bit behind the opponent
          const behind = -opp.facing || (f.x < opp.x ? -1 : 1);
          f.x = Math.max(ARENA.wallL + 30, Math.min(ARENA.wallR - 30, opp.x + behind * 52));
          f.y = Math.min(Math.max(f.y, ARENA.ceiling + f.h + 10), opp.y);
          f.facing = Math.sign(opp.x - f.x) || f.facing;
          f.vx = 0;
          f.invuln = 12;
        } else {
          f.x = opp.x + (Math.random() > 0.5 ? 70 : -70);
          f.y = Math.min(f.y, opp.y - 20);
          f.invuln = 10;
        }
        this.spawnFx("portal", f.x, f.y - 40, { facing: f.facing });
      }
      if (f.attack.mist && f.attack.frame === f.attack.startup) {
        f.mistUntil = 90;
        this.spawnFx("mist", f.x, f.y - 40, { life: 40 });
      }
      if (f.attack.summonPillars && f.attack.frame === f.attack.startup && !f.attack.fired) {
        f.attack.fired = true;
        this.spawnDataPillars(f.x);
        this.spawnFx("portal", f.x, f.y - 20, { life: 20 });
      }
      if (f.attack.zipline && f.attack.frame === f.attack.startup) {
        f.vx = f.facing * 16;
        f.vy = -4;
      }
      if (f.attack.projectile && f.attack.frame === f.attack.startup && !f.attack.fired) {
        f.attack.fired = true;
        // Blue potion: warp behind foe, then throw toward them
        if (f.char.id === "blue" && f.attack.projType === "potion") {
          const behind = -opp.facing || (f.x < opp.x ? -1 : 1);
          f.x = Math.max(ARENA.wallL + 30, Math.min(ARENA.wallR - 30, opp.x + behind * 48));
          f.facing = Math.sign(opp.x - f.x) || 1;
          f.vx = 0;
          f.invuln = 8;
          this.spawnFx("portal", f.x, f.y - 40, { life: 16 });
        }
        this.spawnProjectile(f, f.attack);
      }
      if (f.attack.hookCast && f.attack.frame === f.attack.startup && !f.attack.fired) {
        f.attack.fired = true;
        this.spawnHookBeam(f);
      }
      // Point-blank hook latch clears attack inside latchHook — guard before reading frame
      if (!f.attack) {
        f.applyPhysics(this.platforms(), this.t / 60);
        this.checkHookLanding(f, opp);
        this.checkJuggleSlam(f, opp);
        this.checkWallKo(f, opp);
        return;
      }
      if (f.attack.frame >= f.attack.lifetime) {
        f.attack = null;
        if (!f.hookPhase) {
          f.state = "idle";
          f.pose = "idle";
        }
      }
      f.applyPhysics(this.platforms(), this.t / 60);
      this.checkHookLanding(f, opp);
      this.checkJuggleSlam(f, opp);
      this.checkWallKo(f, opp);
      return;
    }

    // Block / Node Guard (needs stamina)
    if (input.block && f.stamina > 1) {
      f.state = "block";
      f.nodeGuard = false;
      if (input.dirY < 0) {
        // try node overhead guard
        if (input.node && f.nodes > 0) {
          f.nodeGuard = true;
          f.blockDir = 2;
        } else {
          f.blockDir = 2; // overhead angle without node
        }
      } else if (input.dirX !== 0) {
        f.blockDir = input.dirX;
      } else {
        f.blockDir = f.facing; // face-block
      }
      // Full Omni Node Guard (全能格挡) — L+U
      if (input.node && !input.dirX && input.dirY >= 0 && f.nodes > 0) {
        f.nodeGuard = true;
        f.blockDir = 0;
      }
      f.pose = f.nodeGuard ? "node_guard" : "block";
      f.vx *= 0.7;
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }
    f.blockDir = 0;
    f.nodeGuard = false;

    // Node techniques (press U + action)
    if (input.nodePressed && f.nodes > 0) {
      if (input.attack) {
        // Node Throw / Crush-ish: Node Crush if up, else stronger throw hit
        if (input.dirY < 0) {
          // Node Crush = special skill
          if (!f.spendSkill()) {
            this.spawnFx("block", f.x, f.y - 50, { life: 8 });
            f.applyPhysics(this.platforms(), this.t / 60);
            return;
          }
          if (f.spendNode()) {
            f.attack = makeAttack(f, "special", 0, -1, { nodeCrush: true });
            f.state = "special";
            f.invuln = 16;
            f.vy = -14;
            this.spawnFx("node", f.x, f.y - 50, { life: 24 });
            this.onEvent("special");
            f.applyPhysics(this.platforms(), this.t / 60);
            return;
          }
          f.skill = Math.min(f.maxSkill, f.skill + 20); // refund if node fail
        } else if (f.spendNode()) {
          f.attack = makeAttack(f, "normal", f.facing, 0, { nodeBoost: true, nodeThrow: true });
          f.attack.damage += 4;
          f.attack.kb += 3;
          f.attack.reach += 16;
          f.attack.nodeThrow = true;
          f.state = "attack";
          f.gainStamina(6);
          this.onEvent("attack");
          f.applyPhysics(this.platforms(), this.t / 60);
          return;
        }
      } else if (input.jump || input.dirY < 0) {
        if (f.spendNode()) {
          f.vy = -18;
          f.onGround = false;
          f.invuln = 12;
          f.state = "jump";
          this.spawnFx("node", f.x, f.y - 40);
          f.applyPhysics(this.platforms(), this.t / 60);
          return;
        }
      } else if (input.special) {
        if (!f.spendSkill()) {
          this.spawnFx("block", f.x, f.y - 50, { life: 8 });
          f.applyPhysics(this.platforms(), this.t / 60);
          return;
        }
        if (f.spendNode()) {
          f.attack = makeAttack(f, "special", input.dirX, input.dirY, { charged: true, nodeBoost: true });
          f.state = "special";
          f.gainStamina(6);
          this.spawnFx("node", f.x, f.y - 40);
          this.onEvent("special");
          f.applyPhysics(this.platforms(), this.t / 60);
          return;
        }
        f.skill = Math.min(f.maxSkill, f.skill + 20);
      }
    }

    // Attack / Special
    // Solo: ArrowDown = 滑铲 (stamina only; not skill)
    if (input.slide && this.solo && f.side === 0 && f.onGround) {
      const SLIDE_COST = 24;
      if (!f.spendStamina(SLIDE_COST)) {
        this.spawnFx("block", f.x, f.y - 40, { life: 8 });
        f.applyPhysics(this.platforms(), this.t / 60);
        return;
      }
      f.attack = makeAttack(f, "special", f.facing, 1, {});
      f.attack.name = "滑铲";
      f.attack.pose = "slide";
      f.attack.travel = 7 * f.facing;
      f.attack.damage = Math.max(8, f.attack.damage * 0.9);
      f.attack.kb = Math.max(6, f.attack.kb * 0.85);
      f.attack.lifetime = 22;
      f.attack.startup = 4;
      f.attack.active = 10;
      f.attack.yOff = -22;
      f.attack.height = 24;
      f.attack.reach = 52;
      f.attack.projectile = false;
      f.attack.mist = false;
      f.attack.teleport = false;
      f.attack.slideMove = true;
      f.state = "special";
      f.pose = "slide";
      this.onEvent("slash");
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }
    if (input.attack) {
      f.attack = makeAttack(f, "normal", input.dirX, input.dirY);
      f.state = "attack";
      f.gainStamina(6);
      this.onEvent("attack");
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }
    if (input.special) {
      // Green hook on cooldown
      const pending = makeAttack(f, "special", input.dirX, input.dirY, { charged: f.charge > 20 });
      if (pending.hookCast && (f.hookCooldown || 0) > 0) {
        this.spawnFx("block", f.x, f.y - 50, { life: 10 });
        f.applyPhysics(this.platforms(), this.t / 60);
        return;
      }
      if (!f.spendSkill()) {
        this.spawnFx("block", f.x, f.y - 50, { life: 8 });
        f.applyPhysics(this.platforms(), this.t / 60);
        return;
      }
      f.attack = pending;
      f.charge = 0;
      f.state = "special";
      f.gainStamina(6);
      this.onEvent(pending.hookCast ? "hookCast" : "special");
      f.applyPhysics(this.platforms(), this.t / 60);
      return;
    }

    // Charge while holding special key is handled simply — increase if block unused
    // Movement
    if (f.onGround) {
      if (input.dirX !== 0) {
        f.vx += input.dirX * f.char.speed * 0.28;
        f.state = "walk";
        // AV auto-face: walking away from opponent = walk_back pose
        f.pose = input.dirX === f.facing ? "walk" : "walk_back";
      } else {
        f.state = "idle";
        f.pose = "idle";
      }
      if (input.jump) {
        f.vy = -f.char.jump;
        f.onGround = false;
        f.state = "jump";
        f.pose = "jump";
        this.onEvent("jump");
      }
    } else {
      if (input.dirX !== 0) f.vx += input.dirX * f.char.speed * 0.12;
      // double / triple jump
      if (input.jump && f.airJumpsLeft > 0) {
        f.airJumpsLeft -= 1;
        f.vy = -f.char.jump * 0.92;
        f.fastFell = false;
        this.spawnFx("jump", f.x, f.y - 10, { life: 10 });
        this.onEvent("jump");
      }
      // wall jump
      if (input.jump && f.onWall && !f.wallJumped) {
        f.wallJumped = true;
        f.facing = -f.onWall;
        f.vx = -f.onWall * 10;
        f.vy = -f.char.jump * 0.95;
        this.onEvent("jump");
      }
      // fast fall
      if (input.dirY > 0 && !f.fastFell && f.vy > 0) {
        f.fastFell = true;
        f.vy = 12;
      }
      // Purple glide
      if (f.char.wings && input.jumpHeld && f.vy > 0) {
        f.gliding = true;
        f.state = "glide";
        f.pose = "glide";
      } else {
        f.gliding = false;
        f.state = "jump";
        f.pose = "jump";
      }
    }

    f.applyPhysics(this.platforms(), this.t / 60);
    this.checkHookLanding(f, opp);
    this.checkJuggleSlam(f, opp);
    this.checkWallKo(f, opp);
  }

  tickStaminaBars() {
    for (const f of this.roster) {
      if (!f || f.state === "downed" || f.state === "dead") {
        f?.tickStamina?.(false);
        continue;
      }
      const blocking = f.state === "block";
      f.tickStamina(blocking);
      if (blocking && f.stamina <= 0) {
        f.state = "idle";
        f.pose = "idle";
        f.blockDir = 0;
        f.nodeGuard = false;
      }
    }
  }

  tickCritWindows() {
    /* decrement handled per-fighter */
  }

  /** Full-face lightning hook — tip races to facing wall; hit uses continuous beam (no tunneling). */
  spawnHookBeam(owner) {
    if ((owner.hookCooldown || 0) > 0) return;
    if (owner.hookPhase) return;
    const face = owner.facing || 1;
    const handX = owner.x + face * 10;
    const handY = owner.y - 45;
    const endX = face > 0 ? ARENA.wallR - 16 : ARENA.wallL + 16;
    const frames = 8; // ~0.13s — still snappy, easier to land
    const dist = Math.max(80, Math.abs(endX - handX));
    const beam = {
      owner: owner.side,
      ownerF: owner,
      originX: handX,
      originY: handY,
      x: handX,
      y: handY,
      vx: face * (dist / frames),
      facing: face,
      life: frames + 2,
      hit: false,
    };
    this.hooks.push(beam);
    owner.pose = "cast";
    this.spawnFx("hook", owner.x + face * 36, owner.y - 45, { life: 10, facing: face });
    // Point-blank: tip hasn't moved yet — still catch opponents right in front
    this.tryLatchHookBeam(beam, handX);
  }

  /** True if lightning from caster through tip hits the target this frame. */
  hookBeamHits(h, owner, target, prevTipX) {
    if (!owner || !target || target.hp <= 0) return false;
    if (target.mistUntil > 0) return false;
    if (owner.hookPhase || target.hookPhase === "struggle" || target.hookPhase === "reeling") return false;

    const face = h.facing || 1;
    const body = target.body();
    const midX = body.x + body.w / 2;

    // Must be on the cast side (small leeway so slight overlaps still count)
    if (face > 0) {
      if (body.x + body.w < owner.x - 12) return false;
    } else if (body.x > owner.x + 12) {
      return false;
    }

    // Continuous beam: caster → previous tip → current tip (kills tunneling)
    const x0 = Math.min(owner.x, h.originX, prevTipX, h.x) - 22;
    const x1 = Math.max(owner.x, h.originX, prevTipX, h.x) + 22;
    const beam = {
      x: x0,
      y: h.y - 58,
      w: Math.max(16, x1 - x0),
      h: 110,
    };
    if (!aabb(beam, body)) return false;

    // Tip must have reached at least as far as the target (with close-range grace)
    const tipReach = Math.abs(h.x - owner.x);
    const targetDist = Math.abs(midX - owner.x);
    return tipReach + 36 >= targetDist;
  }

  tryLatchHookBeam(h, prevTipX) {
    const owner = h.ownerF || this.roster.find((f) => f.side === h.owner) || this.p1;
    const foes = this.roster.filter(
      (f) => f.side !== owner.side && f.alive && f.state !== "downed" && f.hp > 0
    );
    for (const target of foes) {
      if (!this.hookBeamHits(h, owner, target, prevTipX ?? h.x)) continue;
      h.hit = true;
      this.latchHook(owner, target);
      return true;
    }
    return false;
  }

  updateHooks() {
    this.hooks = this.hooks.filter((h) => {
      if (h.hit) return false;

      const owner = h.ownerF || this.roster.find((f) => f.side === h.owner);
      if (owner) {
        // Keep bolt rooted to Green's casting hand while tip flies
        h.originX = owner.x + h.facing * 10;
        h.originY = owner.y - 45;
        h.y = h.originY;
      }

      const prevX = h.x;
      h.x += h.vx;
      h.life -= 1;
      if (h.life <= 0) return false;
      if (h.x < ARENA.wallL - 24 || h.x > ARENA.wallR + 24) return false;

      if (this.tryLatchHookBeam(h, prevX)) return false;
      return true;
    });
  }

  latchHook(attacker, defender) {
    attacker.hookTarget = defender;
    attacker.hookFace = attacker.facing; // lock "front" to cast direction
    defender.hookedBy = attacker;
    attacker.hookPhase = "struggle"; // attacker holds pose; only victim counts struggle timer
    defender.hookPhase = "struggle";
    defender.hookStruggle = 60; // 1.0s pause
    defender.hookMash = 0;
    defender.vx = 0;
    defender.vy = 0;
    defender.attack = null;
    attacker.attack = null;
    defender.state = "grabbed";
    attacker.state = "cast";
    attacker.pose = "cast";
    this.spawnFx("hook", defender.x, defender.y - 50, { life: 24, facing: attacker.facing });
    this.onEvent("hook", {});
  }

  clearHook(attacker, defender, { cooldown = false } = {}) {
    if (attacker) {
      attacker.hookPhase = null;
      attacker.hookTarget = null;
      attacker.hookFace = 0;
      attacker.pose = "idle";
      if (attacker.state === "cast" || attacker.state === "walk") attacker.state = "idle";
      if (cooldown) attacker.hookCooldown = 300; // 5s @ 60fps
    }
    if (defender) {
      defender.hookPhase = null;
      defender.hookedBy = null;
      defender.hookStruggle = 0;
      defender.hookMash = 0;
      defender.controlLock = 0;
      if (defender.state === "grabbed") defender.state = "idle";
    }
  }

  /** Melee spot directly in front of Green (cast-facing). */
  hookFrontX(atk, victimW = 28) {
    const face = atk.hookFace || atk.facing || 1;
    const x = atk.x + face * 28;
    return Math.max(ARENA.wallL + victimW / 2, Math.min(ARENA.wallR - victimW / 2, x));
  }

  /** Victim only: struggle (mash M) / reeling / launch aerial. */
  tickHookVictim(f, input, opp) {
    // Only the hooked fighter runs victim logic
    if (!f.hookedBy && f.hookPhase !== "launch" && !f.hookLaunch) return false;

    if (f.hookPhase === "struggle" && f.hookedBy) {
      f.state = "grabbed";
      f.attack = null;
      f.vx = 0;
      f.vy = 0;
      if (input.mashEscape) {
        f.hookMash += 1;
        this.spawnFx("hit", f.x, f.y - 50, { life: 8, facing: f.facing });
      }
      f.hookStruggle -= 1;
      if (f.hookMash >= 5) {
        const atk = f.hookedBy;
        this.clearHook(atk, f, { cooldown: true });
        f.vx = -f.facing * 6;
        f.invuln = 15;
        this.spawnFx("block", f.x, f.y - 40, { life: 16, facing: -f.facing });
        this.onEvent("hookEscape", {});
        f.applyPhysics(this.platforms(), this.t / 60);
        return true;
      }
      if (f.hookStruggle <= 0) {
        f.hookPhase = "reeling";
        if (f.hookedBy) f.hookedBy.hookPhase = "reeling";
      }
      // freeze in place — skip physics drift
      return true;
    }

    if (f.hookPhase === "reeling" && f.hookedBy) {
      const atk = f.hookedBy;
      f.state = "grabbed";
      f.attack = null;
      const face = atk.hookFace || atk.facing || 1;
      atk.facing = face;
      const targetX = this.hookFrontX(atk, f.w);
      const dx = targetX - f.x;
      const dist = Math.abs(dx);
      // Yank hard to Green's front — full-arena closes in under ~0.5s
      const step = Math.max(36, Math.min(72, dist * 0.4));
      if (dist > 4) {
        f.x += Math.sign(dx) * Math.min(step, dist);
      } else {
        f.x = targetX;
      }
      f.y = atk.onGround ? ARENA.floor - 2 : atk.y;
      f.vx = 0;
      f.vy = 0;
      f.onGround = atk.onGround;
      f.facing = -face;

      // Arrived at Green's front → crit window + 5s hook cooldown
      if (Math.abs(f.x - targetX) <= 4) {
        f.x = targetX;
        f.y = atk.onGround ? ARENA.floor - 2 : atk.y;
        atk.critWindow = 90;
        f.hitstun = 28;
        f.state = "hit";
        this.clearHook(atk, f, { cooldown: true });
        this.spawnFx("node", atk.x, atk.y - 50, { life: 18 });
        this.onEvent("hookReel", {});
      }
      return true;
    }

    if (f.hookPhase === "launch" || f.hookLaunch) {
      f.hookAirTime = (f.hookAirTime || 0) + 1;
      f.state = f.char.wings && input.jumpHeld ? "glide" : "jump";
      if (f.char.wings && input.jumpHeld) {
        f.gliding = true;
      }
      if (input.dirX !== 0) f.vx += input.dirX * f.char.speed * 0.15;
      if (f.char.wings && input.jump && f.airJumpsLeft > 0) {
        f.airJumpsLeft -= 1;
        f.vy = -f.char.jump * 0.9;
      }
      f.applyPhysics(this.platforms(), this.t / 60);
      this.checkHookLanding(f, opp);
      this.checkJuggleSlam(f, opp);
      if (f.onGround && !f.hookLaunch) {
        f.hookPhase = null;
      }
      return true;
    }

    return false;
  }

  /** Attacker: free to move while holding hook; during reel press attack to launch. */
  tickHookAttacker(f, input, opp) {
    if (f.hookCooldown > 0) f.hookCooldown -= 1;

    if (f.hookPhase === "struggle" && f.hookTarget) {
      this.moveWhileHooking(f, input);
      return true;
    }
    if (f.hookPhase === "reeling" && f.hookTarget) {
      // Attack during reel = launch victim into the air
      if (input.attack && f.hookTarget) {
        const t = f.hookTarget;
        t.hookPhase = "launch";
        t.hookLaunch = true;
        t.hookLauncher = f;
        t.hookAirTime = 0;
        t.hookedBy = null;
        t.onGround = false;
        t.y = Math.min(t.y, ARENA.floor - 4) - 8;
        t.vy = -17;
        t.vx = f.facing * 3;
        t.hitstun = 0;
        t.state = "jump";
        if (t.char.wings) t.airJumpsLeft = t.char.airJumps;
        f.hookPhase = null;
        f.hookTarget = null;
        f.hookCooldown = 300; // 5s after launch finish path
        this.spawnFx("hook", t.x, t.y - 60, { life: 20 });
        this.onEvent("hookLaunch", {});
        f.applyPhysics(this.platforms(), this.t / 60);
        return true;
      }
      this.moveWhileHooking(f, input);
      return true;
    }
    return false;
  }

  /** Walk / jump while holding hook — keep cast face; reel victim tracks to your front. */
  moveWhileHooking(f, input) {
    const t = f.hookTarget;
    const face = f.hookFace || f.facing || 1;
    f.facing = face;

    const prevX = f.x;
    const prevY = f.y;

    if (f.onGround) {
      if (input.dirX !== 0) {
        f.vx += input.dirX * f.char.speed * 0.28;
        f.state = "walk";
        f.pose = "walk";
      } else {
        f.state = "cast";
        f.pose = "cast";
      }
      if (input.jump) {
        f.vy = -f.char.jump;
        f.onGround = false;
        f.state = "jump";
        f.pose = "cast";
      }
    } else {
      if (input.dirX !== 0) f.vx += input.dirX * f.char.speed * 0.12;
      if (input.jump && f.airJumpsLeft > 0) {
        f.airJumpsLeft -= 1;
        f.vy = -f.char.jump * 0.92;
        f.fastFell = false;
      }
      if (input.dirY > 0 && !f.fastFell && f.vy > 0) {
        f.fastFell = true;
        f.vy = 12;
      }
      f.state = "jump";
      f.pose = "cast";
    }
    f.applyPhysics(this.platforms(), this.t / 60);

    // During reel: stick to Green + keep closing toward the front spot
    if (f.hookPhase === "reeling" && t && t.hookPhase === "reeling") {
      t.x += f.x - prevX;
      t.y += f.y - prevY;
      const front = this.hookFrontX(f, t.w);
      const gap = front - t.x;
      if (Math.abs(gap) > 2) {
        t.x += Math.sign(gap) * Math.min(Math.abs(gap), 28);
      }
      t.x = Math.max(ARENA.wallL + t.w / 2, Math.min(ARENA.wallR - t.w / 2, t.x));
      t.facing = -face;
    }
  }

  checkHookLanding(f, attackerHint) {
    if (!f.hookLaunch || !f.onGround) return;
    if ((f.hookAirTime || 0) < 10) return; // need real airtime before slam
    f.hookLaunch = false;
    f.hookPhase = null;
    f.hookAirTime = 0;
    const dmg = 14;
    f.hp = Math.max(0, f.hp - dmg);
    f.updateDanger();
    f.hitstun = 18;
    f.flash = 10;
    this.spawnFx("hit", f.x, f.y - 30, {
      life: 16,
      big: true,
      facing: (f.hookLauncher || attackerHint)?.facing || f.facing,
    });
    this.spawnFx("dmg", f.x, f.y - 70, {
      life: 48, text: String(dmg), vy: -2.2, big: true,
    });
    this.onEvent("hookSlam", { dmg });
    if (f.hp <= 0) {
      const atk = f.hookLauncher || attackerHint || (f.side === 0 ? this.p2 : this.p1);
      if (atk) atk.hookCooldown = Math.max(atk.hookCooldown || 0, 300);
      f.hookLauncher = null;
      this.triggerKo(f, atk, "hp");
    } else {
      if (f.hookLauncher) f.hookLauncher.hookCooldown = Math.max(f.hookLauncher.hookCooldown || 0, 300);
      f.hookLauncher = null;
    }
  }

  spawnProjectile(owner, atk) {
    const type = atk.projType || "bolt";
    const delay = atk.delay || 0;
    const dmg = atk.damage * (owner.dmgScale || 1);
    this.projectiles.push({
      owner: owner.side,
      ownerF: owner,
      type,
      x: owner.x + owner.facing * 40,
      y: owner.y - 45,
      vx: owner.facing * (type === "anvil" ? 5 : type === "rocket" ? 9 : type === "code" ? 7 : 8),
      vy: type === "anvil" ? -2 : type === "potion" ? -4 : 0,
      grav: type === "anvil" || type === "potion" ? 0.35 : 0,
      damage: dmg,
      kb: atk.kb,
      life: 90,
      delay,
      w: type === "anvil" ? 36 : 20,
      h: type === "anvil" ? 28 : 18,
      hit: false,
      facing: owner.facing,
    });
  }

  updateProjectiles() {
    this.projectiles = this.projectiles.filter((p) => {
      if (p.delay > 0) {
        p.delay -= 1;
        return true;
      }
      p.vy += p.grav;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.x < ARENA.wallL - 40 || p.x > ARENA.wallR + 40 || p.y > ARENA.floor + 40) return false;
      if (p.hit || p.life <= 0) return false;

      const owner = p.ownerF || this.roster.find((f) => f.side === p.owner);
      const targets = this.roster.filter(
        (f) => f.side !== p.owner && f.alive && f.state !== "downed" && f.hp > 0
      );
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      for (const target of targets) {
        if (target.mistUntil > 0) continue;
        // Knockdown: only melee up-attacks can pick up — projectiles skip
        if (target.state === "knockdown") continue;
        const probe = this.probeBossHit(box, target);
        if (!probe.hit) continue;
        if (target.dodgeT > 8) {
          this.perfectDodge(target, owner);
          p.hit = true;
          this.spawnFx("hit", p.x, p.y, { facing: p.facing || 1 });
          return false;
        }
        if (target.dodgeT > 0 || target.invuln > 0) return true;
        this.landHit(owner, target, {
          damage: p.damage,
          kb: p.kb,
          angle: -0.25,
          overhead: false,
          projectile: true,
          armoredHit: probe.armored,
        });
        p.hit = true;
        this.spawnFx("hit", p.x, p.y, { facing: p.facing || 1 });
        return false;
      }
      return true;
    });
  }

  resolveCombat() {
    for (const a of this.roster) {
      if (!a.alive || a.state === "downed" || a.state === "dead") continue;
      if (!a.attack || a.attack.hit || a.attack.projectile) continue;
      const frame = a.attack.frame;
      if (frame < a.attack.startup || frame >= a.attack.startup + a.attack.active) continue;
      const box = attackBox(a, a.attack);
      for (const b of this.roster) {
        if (b.side === a.side) continue;
        if (!b.alive || b.state === "downed" || b.hp <= 0) continue;
        if (b.mistUntil > 0) continue;
        // Floor trip: only up / overhead attacks can connect (launch pickup)
        if (b.state === "knockdown") {
          const slot = a.attack.slot;
          if (slot !== "u" && !a.attack.overhead) continue;
        }
        const probe = this.probeBossHit(box, b);
        if (!probe.hit) continue;

        // Perfect dodge window: early dodge frames → teleport past attacker
        if (b.dodgeT > 8) {
          a.attack.hit = true;
          this.perfectDodge(b, a);
          break;
        }
        if (b.dodgeT > 0) continue;
        if (b.invuln > 0) continue;

        a.attack.hit = true;
        let atk = a.dmgScale && a.dmgScale !== 1
          ? { ...a.attack, damage: a.attack.damage * a.dmgScale }
          : { ...a.attack };
        if (probe.armored) atk = { ...atk, armoredHit: true };
        this.landHit(a, b, atk);
        break;
      }
    }
  }

  spawnDodgeGhost(f) {
    const move = f.dodgeDir || f.facing || 1;
    this.spawnFx("ghost", f.x - move * 6, f.y, {
      life: 12,
      facing: f.facing,
      moveDir: move,
      color: f.char.color,
      hollowHead: !!f.char.hollowHead,
      headband: !!f.char.headband,
      wings: !!f.char.wings,
      pose: f.pose || "dodge",
    });
  }

  perfectDodge(defender, attacker) {
    const oldX = defender.x;
    const oldY = defender.y;
    const move = defender.dodgeDir || defender.facing || 1;
    this.spawnDodgeGhost(defender);
    this.spawnFx("ghost", oldX - move * 16, oldY, {
      life: 14,
      facing: defender.facing,
      moveDir: move,
      color: defender.char.color,
      hollowHead: !!defender.char.hollowHead,
      headband: !!defender.char.headband,
      wings: !!defender.char.wings,
      pose: defender.pose || "dodge",
    });
    // Instant warp behind / past attacker
    const side = attacker?.facing || defender.dodgeDir || 1;
    const pivotX = attacker ? attacker.x : defender.x + defender.dodgeDir * 80;
    defender.x = Math.max(
      ARENA.wallL + 36,
      Math.min(ARENA.wallR - 36, pivotX - side * 70)
    );
    defender.y = attacker?.onGround ? ARENA.floor - 2 : Math.min(defender.y, attacker?.y ?? defender.y);
    if (attacker) defender.facing = Math.sign(attacker.x - defender.x) || defender.facing;
    defender.vx = defender.facing * 4;
    defender.vy = -3;
    defender.dodgeT = 0;
    defender.invuln = 22;
    defender.dodgeCD = Math.max(defender.dodgeCD, 28);
    defender.state = "idle";
    defender.pose = "idle";
    defender.flash = 10;
    if (attacker) {
      attacker.vx = -attacker.facing * 6;
      attacker.vy = -2;
    }
    this.spawnFx("portal", oldX, oldY - 40, { life: 14, facing: move });
    this.spawnFx("slash", defender.x, defender.y - 36, { life: 12, facing: defender.facing });
    this.spawnFx("dmg", defender.x, defender.y - 88, {
      life: 36,
      text: "PERFECT",
      vy: -1.6,
      big: true,
    });
    this.onEvent("perfectDodge");
  }

  landHit(attacker, defender, atk) {
    // Blocking — public Animation VERSUS rules (simplified):
    // - Normal block works on ground, angled toward the attack's incoming side
    // - Overheads beat normal block
    // - Node Guard can cover all / angled directions (costs Nodes on mismatch / omni)
    if (defender.state === "block" || defender.blockDir !== 0 || defender.nodeGuard) {
      const attackFrom = attacker.x < defender.x ? -1 : 1;
      const overhead = !!atk.overhead;
      let blocked = false;
      let nodeCost = 0;

      if (defender.nodeGuard) {
        if (defender.blockDir === 0) {
          blocked = true;
          nodeCost = 1; // omni Node Guard
        } else if (defender.blockDir === 2) {
          blocked = true;
          nodeCost = overhead ? 0 : 2; // overhead angle vs non-overhead
        } else if (defender.blockDir === attackFrom) {
          blocked = true;
          nodeCost = overhead ? 2 : 0;
        } else {
          blocked = true;
          nodeCost = 2; // wrong angle
        }
      } else if (defender.onGround && !overhead && defender.blockDir === attackFrom) {
        blocked = true;
      }

      if (blocked) {
        if (nodeCost > 0) defender.crackNodes(nodeCost);
        if (defender.nodeGuard && nodeCost === 0) {
          attacker.vx = -attacker.facing * 8;
          attacker.vy = -4;
        }
        defender.vx = attackFrom * 2;
        this.spawnFx("block", defender.x, defender.y - 40, { life: 12, facing: attackFrom });
        this.onEvent("block");
        return;
      }
    }

    // Hit
    let dmg = atk.damage;
    if (attacker.crisisBuff && attacker.crisisBuff !== 1) dmg *= attacker.crisisBuff;
    let crit = false;
    let dangerKill = false;
    const armored = !!(atk.armoredHit && defender.colossalBoss);

    // Crit window after successful reel — Danger zone = direct KO
    if (attacker.critWindow > 0 && !atk.hookCast && !armored) {
      attacker.critWindow = 0;
      crit = true;
      if (defender.danger) {
        dangerKill = true;
        dmg = Math.max(defender.hp, dmg);
      } else {
        dmg *= 2;
      }
    }

    // Colossal boss armor: non-weak hits always deal 1
    if (armored) {
      dmg = 1;
      crit = false;
      dangerKill = false;
    }

    if (atk.bleed && !armored) {
      defender.bleedT = Math.max(defender.bleedT || 0, 300); // 5s
      defender.bleedAcc = defender.bleedAcc || 0;
    }

    // Campaign allies: never finish the foe unless player is downed
    if (
      this.isCampaign &&
      attacker.isCpuAlly &&
      defender.side === 1 &&
      this.p1?.state !== "downed" &&
      !dangerKill &&
      !defender.colossalBoss
    ) {
      const leave = Math.max(8, Math.round(defender.maxHp * 0.08));
      if (defender.hp - dmg < leave) {
        dmg = Math.max(0, defender.hp - leave);
      }
    }

    const shown = Math.round(dmg * 10) / 10;
    const wasKnockdown = defender.state === "knockdown";
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.updateDanger();
    defender.hitstun = armored || defender.colossalBoss ? Math.min(6, Math.floor(6 + atk.kb * 0.2)) : Math.floor(10 + atk.kb);
    if (!defender.colossalBoss) {
      defender.state = "hit";
      defender.attack = null;
    } else if (armored) {
      // Stay planted — flinch flash only
    } else {
      defender.state = "hit";
      // Keep casting interrupted on weak hits
      defender.attack = null;
    }
    defender.flash = armored ? 4 : 8;
    defender.comboHits += 1;

    const ang = atk.angle ?? -0.35;
    const kb = defender.colossalBoss ? 0 : atk.kb / defender.char.weight;

    defender.vx = Math.cos(ang) * kb * attacker.facing + (atk.pull ? -attacker.facing * 4 : 0);
    if (atk.pull && !defender.colossalBoss) defender.vx = attacker.facing * -3 + (attacker.x - defender.x) * 0.08;
    defender.vy = Math.sin(ang) * kb * (ang < 0 ? 1 : 1) - (ang < 0 ? kb * 0.55 : -kb * 0.2);
    if (atk.pull && !defender.colossalBoss) {
      defender.x += (attacker.x - defender.x) * 0.35;
      defender.vx = attacker.facing * 2;
      defender.vy = -3;
    }
    if (defender.colossalBoss) this.pinColossalBoss(defender);

    // Pickup: up-attack on tripped foe → strong launch for juggle
    if (
      wasKnockdown &&
      !defender.colossalBoss &&
      defender.hp > 0 &&
      (atk.slot === "u" || atk.overhead)
    ) {
      this.launchFromKnockdown(attacker, defender, atk);
    } else if (
      !wasKnockdown &&
      !armored &&
      !dangerKill &&
      defender.hp > 0 &&
      !defender.colossalBoss &&
      this.rollKnockdown(attacker, defender, atk)
    ) {
      this.enterKnockdown(defender, attacker);
    }

    if (atk.crack) defender.crackNodes(atk.crack);

    if (attacker.nodes < attacker.maxNodes && Math.random() > 0.4) {
      attacker.nodeRepair += 25;
    }

    // Attacking restores stamina; hits restore skill (10 hits = full)
    attacker.gainStamina(atk.projectile ? 8 : 14);
    attacker.gainSkillFromHit();

    this.spawnFx("hit", defender.x, defender.y - 40, {
      life: 14,
      big: dmg > 12 || crit,
      crit: !!crit,
      facing: attacker.facing,
    });
    this.spawnFx("dmg", defender.x + (Math.random() * 20 - 10), defender.y - (defender.colossalBoss ? 160 : 70), {
      life: 50,
      text: armored
        ? "1"
        : dangerKill
          ? "KO!"
          : crit
            ? `CRIT ${shown}`
            : String(shown % 1 === 0 ? shown : shown.toFixed(1)),
      vy: -2.4,
      vx: (Math.random() * 1.2 - 0.6),
      big: !armored && (crit || dangerKill || dmg >= 12),
    });
    if (armored) {
      this.spawnFx("block", defender.x + (Math.random() * 40 - 20), defender.y - 100, { life: 10 });
    }
    this.onEvent("hit", { dmg, crit, dangerKill, armored });

    if (defender.hp <= 0) {
      this.triggerKo(defender, attacker, "hp");
    }
  }

  checkWallKo(f, opp) {
    if (f.colossalBoss) return;
    if (!f.danger || f.hp <= 0) return;
    if (f.hitstun <= 0) return;
    const speed = Math.hypot(f.vx, f.vy);
    if (speed < 10) return;
    const hitL = f.x - f.w / 2 <= ARENA.wallL + 2 && f.vx < -2;
    const hitR = f.x + f.w / 2 >= ARENA.wallR - 2 && f.vx > 2;
    if (hitL || hitR) {
      this.koWall = hitL ? -1 : 1;
      this.triggerKo(f, opp, "wall");
    }
  }

  triggerKo(loser, winner, reason) {
    if (this.phase !== "fight" && this.phase !== "wave" && this.phase !== "extract") return;
    if (this.isCampaign) {
      this.triggerCampaignKo(loser, winner, reason);
      return;
    }
    loser.hp = 0;
    loser.state = "dead";
    loser.alive = false;
    loser.vx = (reason === "wall" ? this.koWall : winner?.facing || 1) * 18;
    loser.vy = -10;
    this.lastKoSide = winner.side;
    this.files[winner.side] += 1;
    this.phase = "ko";
    this.phaseT = 0;
    this.spawnFx("ko", loser.x, loser.y - 80, { life: 60, facing: winner.facing });
    this.onEvent("ko", { reason, winner: winner.side });

    if (this.files[0] >= this.need || this.files[1] >= this.need) {
      this.winner = this.files[0] >= this.need ? 0 : 1;
    }
  }

  /** Campaign: allies can be downed & revived; enemies clear waves / level. */
  triggerCampaignKo(loser, winner, reason) {
    if (loser.side === 0) {
      const canRevive = this.allies.some(
        (a) => a !== loser && a.alive && a.state !== "downed" && a.hp > 0
      );
      if (canRevive) {
        this.enterDowned(loser);
        // Buff living CPU allies while someone is downed (esp. player)
        this.refreshAllyCrisisBuff();
        return;
      }
      loser.hp = 0;
      loser.state = "dead";
      loser.alive = false;
      loser.vx = (winner?.facing || 1) * 14;
      loser.vy = -8;
      this.spawnFx("ko", loser.x, loser.y - 80, { life: 50, facing: winner?.facing || 1 });
      this.finishCampaign(1);
      return;
    }

    // Enemy down
    loser.hp = 0;
    loser.state = "dead";
    loser.alive = false;
    loser.vx = (winner?.facing || -1) * 16;
    loser.vy = -10;
    this.spawnFx("ko", loser.x, loser.y - 80, { life: 40, facing: winner?.facing || -1 });
    this.onEvent("ko", { reason, winner: 0, campaign: true });

    if (loser.dropHeal || (loser.isGrunt && Math.random() < 0.22)) {
      this.spawnPickup(loser.x, loser.y - 20, "heal", 18 + Math.floor(Math.random() * 12));
    }

    this.syncPrimaryEnemy();

    if (this.living(1).length === 0 && this.enemyQueue.length === 0) {
      this.beginExtract();
      return;
    }

    // Keep pressure — refill slots soon; short wave pause only if field empty
    if (this.living(1).length === 0 && this.enemyQueue.length > 0) {
      this.phase = "wave";
      this.phaseT = 0;
      return;
    }
    this.spawnCD = Math.min(this.spawnCD || 0, 18);
  }

  refreshAllyCrisisBuff() {
    const playerDown = this.p1?.state === "downed";
    for (const a of this.allies) {
      if (!a.isCpuAlly) continue;
      a.crisisBuff = playerDown ? 1.22 : 1;
    }
  }

  enemiesNearPlayer(radius = 210) {
    const p = this.p1;
    if (!p) return [];
    return this.living(1).filter(
      (e) => Math.abs(e.x - p.x) < radius && Math.abs(e.y - p.y) < 140
    );
  }

  /** Ally should fight: player low HP, crowded, or player downed (after revive priority). */
  allyShouldEngage() {
    const p = this.p1;
    if (!p) return false;
    if (p.state === "downed") return true;
    const hpRatio = p.hp / Math.max(1, p.maxHp);
    if (hpRatio <= 0.4 || p.danger) return true;
    const near = this.enemiesNearPlayer();
    if (near.length >= 2) return true;
    if (near.length >= 1 && hpRatio <= 0.55) return true;
    return false;
  }

  /** Avoid finishing blows so the player keeps the kill. */
  allyWouldStealKill(foe) {
    if (!foe || !foe.alive) return false;
    const ratio = foe.hp / Math.max(1, foe.maxHp);
    return ratio <= 0.3 || foe.hp <= 20;
  }

  timeOut() {
    if (this.isCampaign) {
      if (this.phase === "extract") return; // no timeout fail while exiting
      const allyHp = this.living(0).reduce((s, f) => s + f.hp, 0);
      const foeHp = this.living(1).reduce((s, f) => s + f.hp, 0);
      if (foeHp <= 0 && this.enemyQueue.length === 0) this.beginExtract();
      else if (allyHp > foeHp) this.beginExtract();
      else this.finishCampaign(1);
      return;
    }
    if (this.p1.hp === this.p2.hp) {
      // both lose a bit — award to higher remaining conceptually, draw goes to p1 if equal weird; prefer damage
      if (this.p1.hp >= this.p2.hp) this.triggerKo(this.p2, this.p1, "time");
      else this.triggerKo(this.p1, this.p2, "time");
    } else if (this.p1.hp > this.p2.hp) this.triggerKo(this.p2, this.p1, "time");
    else this.triggerKo(this.p1, this.p2, "time");
  }

  nextFile() {
    if (this.winner !== null) {
      this.phase = "matchover";
      this.phaseT = 0;
      this.onEvent("matchover", { winner: this.winner });
      return;
    }

    // Travel: wall KO picks adjacent area based on wall; else cycle
    if (this.koWall !== 0) {
      this.areaIndex = (this.areaIndex + (this.koWall > 0 ? 1 : this.stage.areas.length - 1)) % this.stage.areas.length;
    } else {
      this.areaIndex = (this.areaIndex + 1) % this.stage.areas.length;
    }
    this.koWall = 0;
    this.hooks = [];
    this.projectiles = [];
    this.timer = 99;
    this.timerAcc = 0;
    this.p1.hp = this.p1.maxHp;
    this.p2.hp = this.p2.maxHp;
    this.p1.nodes = this.p1.maxNodes;
    this.p2.nodes = this.p2.maxNodes;
    this.p1.resetForFile(320, 1);
    this.p2.resetForFile(960, -1);
    this.phase = "file";
    this.phaseT = 0;
    this.onEvent("file", { area: this.area.name });
  }

  /**
   * @param {import("./fighter.js").Fighter} [me]
   * @param {import("./fighter.js").Fighter} [you]
   * @param {boolean} [asAlly]
   */
  cpuInput(me = this.p2, you = this.p1, asAlly = false) {
    const input = {
      dirX: 0, dirY: 0, jump: false, jumpHeld: false,
      attack: false, special: false, block: false, node: false, nodePressed: false,
      start: false, slide: false, dodge: false,
      mashEscape: false,
    };

    const aiActive = this.phase === "fight" || this.phase === "extract";
    if (!aiActive || !me || me.hitstun > 0 || me.stun > 0) return input;
    if (me.state === "downed" || me.state === "dead" || me.state === "knockdown" || !me.alive) return input;

    if (me.hookPhase === "struggle") {
      if (Math.random() > (asAlly ? 0.78 : 0.92)) input.mashEscape = true;
      return input;
    }
    if (me.hookPhase === "reeling" && me.hookTarget) {
      const hd = Math.abs(me.hookTarget.x - me.x);
      if (hd < 40 && Math.random() > 0.85) input.attack = true;
      return input;
    }
    if (me.hookPhase === "reeling" || me.hookPhase === "launch") return input;

    if (asAlly && this.isCampaign) {
      return this.cpuAllyInput(me, input);
    }

    you = you || this.nearestFoe(me);
    const dx = you.x - me.x;
    const dist = Math.abs(dx);
    const agg = this.aiAggression || 0;
    const boss = !!(me.char?.boss || me.isBoss);
    const hesitate =
      (boss ? 0.28 - agg * 0.05 : 0.55 - agg * 0.08) + (me.aiHesitateBonus || 0);

    // Trip on floor → up-attack launch for juggle
    if (you?.state === "knockdown" && dist < 70) {
      input.dirX = Math.sign(dx) || me.facing;
      input.dirY = -1;
      if (dist > 36) input.dirX = Math.sign(dx) || input.dirX;
      if (Math.random() > 0.35) input.attack = true;
      else if (Math.random() > 0.7 && me.skill >= 20) input.special = true;
      return input;
    }

    // Platform / height seeking (enemies + CPU vs)
    const seek = this.applyAiVertical(me, input, you.x, you.y);
    if (seek.climbing && Math.abs(you.y - me.y) > 50) {
      if (!input.dirX) input.dirX = Math.sign(dx) || me.facing;
      return input;
    }

    if (!seek.climbing && Math.random() > Math.max(0.18, hesitate)) {
      if (Math.random() > 0.7) input.dirX = Math.random() > 0.5 ? 1 : -1;
      return input;
    }

    if (!input.dirX) input.dirX = Math.sign(dx) || me.facing;

    if (you.state === "attack" && dist < 55 && me.onGround && me.stamina > 15 && Math.random() > (boss ? 0.55 : 0.82)) {
      input.block = true;
      input.dirX = you.x < me.x ? -1 : 1;
      return input;
    }

    const atkChance = boss ? 0.72 : 0.88;
    const specialChance = boss ? 0.88 : 0.97 - agg * 0.04;

    if (dist > 90) {
      if (Math.random() > specialChance && me.skill >= 20) input.special = true;
    } else if (dist <= 48) {
      if (Math.random() > atkChance) input.attack = true;
      else if (Math.random() > specialChance && me.skill >= 20) input.special = true;
    }

    if (!me.onGround && dist < 45 && Math.random() > (boss ? 0.85 : 0.96)) input.attack = true;
    if (!seek.jump && me.onGround && Math.random() > (boss ? 0.96 : 0.99)) input.jump = true;
    if (me.char.wings && !me.onGround && Math.random() > 0.45) input.jumpHeld = true;

    if (you.hitstun > 12 && me.nodes > 1 && dist < 45 && Math.random() > (boss ? 0.9 : 0.97)) {
      input.node = true;
      input.dirY = -1;
      input.attack = true;
    }

    return input;
  }

  /** Support AI: hold for player kills; engage only when player is in trouble; rush revive. */
  cpuAllyInput(me, input) {
    const player = this.p1;
    const downed = this.nearestDownedAlly(me);
    const playerDown = player?.state === "downed";

    // Highest priority: move next to downed ally (player presses E to revive)
    if (downed) {
      input.dirX = Math.sign(downed.x - me.x) || me.facing;
      const seek = this.applyAiVertical(me, input, downed.x, downed.y);
      if (!seek.jump && Math.abs(downed.x - me.x) > 40 && me.onGround && Math.random() > 0.92) {
        input.jump = true;
      }
      if (playerDown && Math.abs(downed.x - me.x) > 60 && Math.random() > 0.85) input.dodge = true;
      return input;
    }

    // Extract: escort player toward EXIT (no combat)
    if (this.phase === "extract") {
      const exitX = this.exitZone?.x ?? ARENA.wallR - 70;
      const targetX =
        player?.alive && player.state !== "downed" ? player.x * 0.35 + exitX * 0.65 : exitX;
      const targetY = player?.y ?? ARENA.floor;
      if (Math.abs(targetX - me.x) > 24) input.dirX = Math.sign(targetX - me.x);
      this.applyAiVertical(me, input, targetX, targetY);
      return input;
    }

    const foe = this.nearestFoe(me);
    const engage = this.allyShouldEngage();
    const steal = this.allyWouldStealKill(foe);
    const dxFoe = foe.x - me.x;
    const distFoe = Math.abs(dxFoe);
    const dxP = (player?.x ?? me.x) - me.x;
    const distP = Math.abs(dxP);

    // Hold / support spacing when player is fine — don't contest kills
    if (!engage || (steal && !playerDown)) {
      const holdX = (player?.x ?? me.x) - Math.sign(dxFoe || 1) * 70;
      const holdY = player?.y ?? me.y;
      const toHold = holdX - me.x;
      if (Math.abs(toHold) > 28) input.dirX = Math.sign(toHold);
      else if (Math.random() > 0.85) input.dirX = Math.random() > 0.5 ? 1 : -1;

      const seek = this.applyAiVertical(me, input, holdX, holdY);
      if (seek.climbing && Math.abs(holdY - me.y) > 45) return input;

      if (foe.state === "attack" && distFoe < 70 && me.stamina > 12 && Math.random() > 0.55) {
        input.block = true;
        input.dirX = foe.x < me.x ? -1 : 1;
      }
      return input;
    }

    // Crisis engage — stronger when player is/was downed
    const rush = playerDown || (me.crisisBuff && me.crisisBuff > 1);
    input.dirX = Math.sign(dxFoe) || me.facing;
    const seek = this.applyAiVertical(me, input, foe.x, foe.y);
    if (seek.climbing && Math.abs(foe.y - me.y) > 50) return input;

    if (foe.state === "attack" && distFoe < 55 && me.onGround && me.stamina > 12 && Math.random() > 0.5) {
      input.block = true;
      input.dirX = foe.x < me.x ? -1 : 1;
      return input;
    }

    // Still refuse execute unless player is downed (must clear threat)
    if (steal && !playerDown) {
      if (distFoe < 90) input.dirX = -Math.sign(dxFoe) || input.dirX;
      return input;
    }

    const atkGate = rush ? 0.55 : 0.78;
    const spGate = rush ? 0.82 : 0.93;

    if (distFoe > 100) {
      if (Math.random() > spGate && me.skill >= 20) input.special = true;
    } else if (distFoe <= 52) {
      if (Math.random() > atkGate) input.attack = true;
      else if (Math.random() > spGate && me.skill >= 20) input.special = true;
    }

    if (!me.onGround && distFoe < 50 && Math.random() > (rush ? 0.8 : 0.94)) input.attack = true;
    if (!seek.jump && me.onGround && distFoe > 80 && Math.random() > 0.97) input.jump = true;
    if (me.char.wings && !me.onGround && Math.random() > 0.4) input.jumpHeld = true;

    // Stick with player if they drifted far while we chased
    if (!playerDown && distP > 280 && Math.random() > 0.4) {
      input.dirX = Math.sign(dxP) || input.dirX;
      this.applyAiVertical(me, input, player.x, player.y);
      input.attack = false;
      input.special = false;
    }

    return input;
  }
}
