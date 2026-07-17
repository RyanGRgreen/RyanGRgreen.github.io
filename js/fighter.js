import { ARENA } from "./stages.js?v=72";

const GRAVITY = 0.55;
const FRICTION = 0.82;
const AIR_FRICTION = 0.96;
const MAX_FALL = 16;

export class Fighter {
  constructor(char, side, x) {
    this.char = char;
    this.side = side;
    this.x = x;
    this.y = ARENA.floor - 2;
    this.vx = 0;
    this.vy = 0;
    this.facing = side === 0 ? 1 : -1;
    this.w = 28;
    this.h = 70;
    this.onGround = true;
    this.onWall = 0;
    this.hp = char.maxHp;
    this.maxHp = char.maxHp;
    this.nodes = char.nodes;
    this.maxNodes = char.nodes;
    this.nodeRepair = 0;
    this.stun = 0;
    this.controlLock = 0;
    this.hookedBy = null;
    this.hookTarget = null;
    this.hookFace = 0;
    this.hookPhase = null; // struggle | reeling | launch
    this.hookStruggle = 0;
    this.hookMash = 0;
    this.hookLaunch = false;
    this.hookLauncher = null;
    this.hookAirTime = 0;
    this.hookCooldown = 0;
    this.critWindow = 0;
    this.airJumpsLeft = char.airJumps;
    this.wallJumped = false;
    this.fastFell = false;
    this.state = "idle";
    this.stateT = 0;
    this.attack = null;
    this.hitstun = 0;
    this.invuln = 0;
    this.comboHits = 0;
    this.blockDir = 0;
    this.nodeGuard = false;
    this.charge = 0;
    this.charging = false;
    this.projectileIdx = 0;
    this.cooldown = {};
    this.anim = 0;
    this.flash = 0;
    this.danger = false;
    this.alive = true;
    this.downedT = 0;
    this.knockdownT = 0; // combat trip (not campaign revive / not danger)
    this.knockdownCD = 0;
    this.juggleSlam = false; // launch → ground slam damage
    this.juggleSlammer = null;
    this.juggleAirTime = 0;
    this.juggleSlamDmg = 0;
    this.mistUntil = 0;
    this.gliding = false;
    this.pose = "idle";
    this.fxTag = null;
    this.dodgeT = 0;
    this.dodgeCD = 0;
    this.dodgeDir = 1;
    this.dodgeGhostTimer = 0;
    this.dodgeBack = false;
    // Stamina: dodge / slide / block drain; attacks or 10s idle regen
    this.maxStamina = 100;
    this.stamina = 100;
    this.staminaIdle = 0; // frames since last spend
    // Skill: 5 specials to empty; 10 hits on foe to refill
    this.maxSkill = 100;
    this.skill = 100;
  }

  resetForFile(x, facing) {
    this.x = x;
    this.y = ARENA.floor - 2;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.onGround = true;
    this.onWall = 0;
    this.state = "idle";
    this.stateT = 0;
    this.attack = null;
    this.hitstun = 0;
    this.invuln = 20;
    this.comboHits = 0;
    this.blockDir = 0;
    this.nodeGuard = false;
    this.charge = 0;
    this.charging = false;
    this.airJumpsLeft = this.char.airJumps;
    this.wallJumped = false;
    this.fastFell = false;
    this.stun = 0;
    this.controlLock = 0;
    this.hookedBy = null;
    this.hookTarget = null;
    this.hookFace = 0;
    this.hookPhase = null;
    this.hookStruggle = 0;
    this.hookMash = 0;
    this.hookLaunch = false;
    this.hookLauncher = null;
    this.hookAirTime = 0;
    this.hookCooldown = 0;
    this.critWindow = 0;
    this.alive = true;
    this.gliding = false;
    this.mistUntil = 0;
    this.flash = 0;
    this.pose = "idle";
    this.fxTag = null;
    this.knockdownT = 0;
    this.knockdownCD = 0;
    this.juggleSlam = false;
    this.juggleSlammer = null;
    this.juggleAirTime = 0;
    this.juggleSlamDmg = 0;
    this.dodgeT = 0;
    this.dodgeCD = 0;
    this.dodgeDir = facing;
    this.dodgeGhostTimer = 0;
    this.dodgeBack = false;
    this.stamina = this.maxStamina ?? 100;
    this.staminaIdle = 0;
    this.skill = this.maxSkill ?? 100;
  }

  updateDanger() {
    this.danger = this.hp > 0 && this.hp <= this.maxHp / 3;
  }

  /** @returns {boolean} true if cost paid */
  spendStamina(cost) {
    if (cost <= 0) return true;
    if (this.stamina < cost) return false;
    this.stamina = Math.max(0, this.stamina - cost);
    this.staminaIdle = 0;
    return true;
  }

  gainStamina(amount) {
    if (amount <= 0) return;
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }

  /** Skill cost: 20 → 5 uses to empty. */
  spendSkill(cost = 20) {
    if (cost <= 0) return true;
    if (this.skill < cost) return false;
    this.skill = Math.max(0, this.skill - cost);
    return true;
  }

  /** Hit recovery: 10 → 10 successful hits refill from empty. */
  gainSkillFromHit() {
    this.skill = Math.min(this.maxSkill, this.skill + this.maxSkill / 10);
  }

  /** Call once per frame after action resolution. */
  tickStamina(isBlocking = false) {
    if (isBlocking) {
      // Holding block drains continuously
      const drain = 0.5;
      this.stamina = Math.max(0, this.stamina - drain);
      this.staminaIdle = 0;
      return;
    }
    this.staminaIdle = (this.staminaIdle || 0) + 1;
    // After ~10s without dodge/slide/block spend → slow regen
    if (this.staminaIdle >= 600 && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.28);
    }
  }

  crackNodes(n) {
    const before = this.nodes;
    this.nodes = Math.max(0, this.nodes - n);
    if (this.nodes <= 0 && before > 0) {
      this.stun = 90;
      this.state = "stun";
      this.stateT = 0;
      this.attack = null;
    }
    this.nodeRepair = 0;
  }

  spendNode() {
    if (this.nodes <= 0 || this.stun > 0) return false;
    this.nodes -= 1;
    this.nodeRepair = 0;
    return true;
  }

  repairNodes(dt) {
    if (this.nodes >= this.maxNodes) return;
    this.nodeRepair += dt;
    const need = this.stun > 0 ? 45 : 90;
    if (this.nodeRepair >= need) {
      this.nodeRepair = 0;
      this.nodes = Math.min(this.maxNodes, this.nodes + 1);
      if (this.nodes > 0 && this.stun > 0) this.stun = 0;
    }
  }

  body() {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  applyPhysics(platforms, t) {
    if (this.hitstun > 0 || this.state === "dead") {
      this.vy += GRAVITY;
      this.vx *= this.onGround ? FRICTION : AIR_FRICTION;
    } else if (this.gliding && !this.onGround && this.vy > 1) {
      this.vy = Math.min(this.vy, 2.2);
      this.vx *= 0.99;
    } else {
      this.vy += this.fastFell ? GRAVITY * 1.65 : GRAVITY;
      this.vx *= this.onGround ? FRICTION : AIR_FRICTION;
    }
    this.vy = Math.min(this.vy, MAX_FALL);

    this.x += this.vx;
    this.y += this.vy;

    this.onWall = 0;
    if (this.x - this.w / 2 < ARENA.wallL) {
      this.x = ARENA.wallL + this.w / 2;
      if (this.vx < 0) this.vx = 0;
      if (!this.onGround) this.onWall = -1;
    }
    if (this.x + this.w / 2 > ARENA.wallR) {
      this.x = ARENA.wallR - this.w / 2;
      if (this.vx > 0) this.vx = 0;
      if (!this.onGround) this.onWall = 1;
    }
    if (this.y - this.h < ARENA.ceiling) {
      this.y = ARENA.ceiling + this.h;
      if (this.vy < 0) this.vy = 0;
    }

    this.onGround = false;
    const feet = this.y;
    if (feet >= ARENA.floor && this.vy >= 0) {
      this.y = ARENA.floor;
      this.vy = 0;
      this.onGround = true;
      this.land();
    }

    for (const p of platforms) {
      let px = p.x;
      if (p.moving) px = p.x + Math.sin(t * p.speed) * p.amp;
      const top = p.y;
      const left = px;
      const right = px + p.w;
      if (
        this.vy >= 0 &&
        this.x + this.w / 2 > left &&
        this.x - this.w / 2 < right &&
        feet >= top &&
        feet <= top + 18 &&
        this.y - this.vy <= top + 2
      ) {
        this.y = top;
        this.vy = 0;
        this.onGround = true;
        this.land();
        if (p.moving) this.x += Math.cos(t * p.speed) * p.amp * p.speed * 0.05;
      }
    }
  }

  land() {
    this.airJumpsLeft = this.char.airJumps;
    this.wallJumped = false;
    this.fastFell = false;
    this.gliding = false;
  }

  faceOpponent(other) {
    if (this.hitstun > 0 || this.state === "attack" || this.state === "special") return;
    if (other.x > this.x) this.facing = 1;
    else this.facing = -1;
  }
}

function moveName(id, kind, slot, airborne) {
  const air = airborne ? "a" : "g";
  const table = {
    orange: {
      normal: { n: "Pencil Jab", f: "Drawn Punch", b: "Eraser Elbow", u: "Sketch Upper", d: "Low Brush" },
      aerial: { n: "Air Sketch", f: "Prop Kick", b: "Flip Erase", u: "Sky Doodle", d: "Drop Stamp" },
      special: { n: "Pencil Toss", f: "Prop Rush", b: "Eraser Bash", u: "Drawn Hammer", d: "Sketch Slide" },
    },
    red: {
      normal: { n: "Cheetah Jab", f: "Beast Punch", b: "Back Fist", u: "Rising Claw", d: "Low Snap" },
      aerial: { n: "Air Claw", f: "Fly Kick", b: "Spin Claw", u: "Sky Fang", d: "Dive Stomp" },
      special: { n: "Cheetah Rush", f: "Beast Fist", b: "Spirit Counter", u: "Tiger Upper", d: "Wolf Sweep" },
    },
    blue: {
      normal: { n: "Brew Tap", f: "Break Kick", b: "Spin Elbow", u: "Hop Upper", d: "Sweep Bottle" },
      aerial: { n: "Air Spin", f: "Cartwheel", b: "Backflip", u: "Alchemy Lift", d: "Potion Stomp" },
      special: { n: "Potion Toss", f: "Breakdance Kick", b: "Capoeira Spin", u: "Portal Swap", d: "Mist Bomb" },
    },
    green: {
      normal: { n: "Rod Poke", f: "Tipper Jab", b: "Butt Whack", u: "Hook Lift", d: "Low Sweep" },
      aerial: { n: "Air Cast", f: "Hook Kick", b: "Rod Twirl", u: "Sky Hook", d: "Drop Line" },
      special: { n: "Cast & Hook", f: "Tipper Yank", b: "Rod Whip", u: "Zipline Reel", d: "Power Chord" },
    },
    yellow: {
      normal: { n: "Key Tap", f: "Laptop Smack", b: "Cable Whip", u: "Bug Report", d: "Crouch Debug" },
      aerial: { n: "Air Ping", f: "Packet Kick", b: "Rollback", u: "Upload", d: "Force Quit" },
      special: { n: "Compile Shot", f: "Packet Spam", b: "Hard Reset", u: "Stack Overflow", d: "Debug Warp" },
    },
    purple: {
      normal: { n: "Wing Tap", f: "Glide Punch", b: "Tailwind", u: "Lift Slash", d: "Low Hover" },
      aerial: { n: "Air Slash", f: "Drill Wing", b: "Back Flutter", u: "Sky Pierce", d: "Dive Kick" },
      special: { n: "Wing Slash", f: "Air Drill", b: "Ground Snap", u: "Soar Spike", d: "Meteor Dive" },
    },
    versus: {
      normal: { n: "Rule Jab", f: "Force Punch", b: "Corrupt Elbow", u: "Undo Upper", d: "Loop Sweep" },
      aerial: { n: "Air Inject", f: "Match Kick", b: "Rollback", u: "Sky Patch", d: "Drop Frame" },
      special: { n: "Rule Inject", f: "Force Match", b: "Corrupt Bash", u: "Undo Spike", d: "Loop Slide" },
    },
    dark_lord: {
      normal: { n: "暗刺", f: "暗拳", b: "暗肘", u: "暗上勾", d: "暗扫" },
      aerial: { n: "空暗刺", f: "坠暗踢", b: "后暗击", u: "升暗", d: "砸落" },
      special: { n: "数据刃", f: "数据刃", b: "暗影横扫", u: "坠暗重拳", d: "数据地刺" },
    },
    red_spider: {
      normal: { n: "咬", f: "扑", b: "弹", u: "跃", d: "扫" },
      aerial: { n: "空咬", f: "扑落", b: "后弹", u: "弹跳", d: "砸" },
      special: { n: "扑咬", f: "扑咬", b: "后跃", u: "弹跳", d: "低扫" },
    },
  };
  const c = table[id];
  if (!c) return kind;
  if (kind === "special") return c.special[slot] || c.special.n;
  return (airborne ? c.aerial : c.normal)[slot] || "Attack";
}

/** Stretch attack frames when fighter.atkPace > 1 (e.g. story mobs). */
function applyAtkPace(base, fighter) {
  const pace = fighter?.atkPace;
  if (!pace || pace === 1) return base;
  base.startup = Math.max(1, Math.round(base.startup * pace));
  base.active = Math.max(1, Math.round(base.active * pace));
  base.recovery = Math.max(1, Math.round(base.recovery * pace));
  base.lifetime = base.startup + base.active + base.recovery;
  return base;
}

/** Build an attack descriptor from character + input context. */
export function makeAttack(fighter, kind, dirX, dirY, opts = {}) {
  const airborne = !fighter.onGround;
  const f = fighter.facing;
  const id = fighter.char.id;
  const charged = !!opts.charged;
  const nodeBoost = !!opts.nodeBoost;
  const dmgMul = (charged ? 1.45 : 1) * (nodeBoost ? 1.25 : 1);
  const kbMul = (charged ? 1.35 : 1) * (nodeBoost ? 1.2 : 1);

  let slot = "n";
  if (dirY < 0) slot = "u";
  else if (dirY > 0) slot = "d";
  else if (dirX * f > 0) slot = "f";
  else if (dirX * f < 0) slot = "b";

  const base = {
    kind,
    name: moveName(id, kind, slot, airborne),
    pose: `${kind}_${slot}${airborne ? "_air" : ""}`,
    frame: 0,
    hit: false,
    overhead: false,
    projectile: false,
    pull: false,
    lifetime: 18,
    startup: 4,
    active: 6,
    recovery: 8,
    damage: 8,
    kb: 6,
    angle: -0.35,
    reach: 44,
    height: 36,
    yOff: -40,
    xOff: 20 * f,
    slot,
    spirit: null,
    prop: null,
  };

  if (kind === "normal") {
    if (airborne) {
      Object.assign(base, { startup: 3, active: 5, recovery: 10, damage: 7, kb: 5.5, lifetime: 18 });
      if (slot === "u") Object.assign(base, { damage: 8, kb: 7, angle: -1.1, yOff: -70, height: 40, overhead: true, pose: "upper_air" });
      if (slot === "d") Object.assign(base, { damage: 9, kb: 6, angle: 0.6, yOff: -20, height: 28, pose: "stomp" });
      if (slot === "f") Object.assign(base, { damage: 8, reach: 52, kb: 6.5, pose: "air_kick" });
      if (slot === "b") Object.assign(base, { damage: 7, reach: 40, kb: 5, angle: -0.2, xOff: -28 * f, pose: "back_air" });
      if (slot === "n") base.pose = "nair";
    } else {
      Object.assign(base, { startup: 3, active: 5, recovery: 9, damage: 7, kb: 5, lifetime: 17 });
      if (slot === "u") Object.assign(base, { damage: 9, kb: 8, angle: -1.2, yOff: -75, height: 48, overhead: true, reach: 34, pose: "upper" });
      if (slot === "d") Object.assign(base, { damage: 6, kb: 4, angle: -0.1, yOff: -18, height: 22, reach: 48, pose: "low" });
      if (slot === "f") Object.assign(base, { damage: 8, reach: 55, kb: 6, pose: "punch" });
      if (slot === "b") Object.assign(base, { damage: 7, reach: 42, xOff: -30 * f, kb: 5.5, pose: "elbow" });
      if (slot === "n") base.pose = "jab";
    }

    if (id === "red") {
      base.damage += 1;
      base.startup = Math.max(2, base.startup - 1);
      base.kb += 0.5;
      base.spirit = slot === "u" ? "tiger" : slot === "d" ? "wolf" : "cheetah";
    }
    if (id === "green" && (slot === "f" || slot === "n")) {
      base.reach += 20;
      base.pull = true;
      base.damage += 1;
      base.pose = "rod_poke";
      // tipper pull only — full 钩索 is Cast special
    }
    if (id === "blue" && (slot === "f" || slot === "b")) base.pose = "breakdance";
    if (id === "purple" && airborne) {
      base.damage += 1.5;
      base.kb += 1;
      base.pose = "wing_slash";
    }
    if (id === "yellow") {
      base.damage -= 1;
      base.reach += 6;
      base.pose = "laptop_smack";
    }
    if (id === "orange" || id === "versus") {
      // Keep directional normals distinct — pencil only on jab / upper
      if (slot === "n") base.pose = "pencil_jab";
      else if (slot === "u") base.pose = "pencil_upper";
      else if (slot === "f") base.pose = "punch";
      else if (slot === "b") base.pose = "elbow";
      else if (slot === "d") base.pose = "low";
    }
    if (id === "dark_lord") {
      base.damage += 2;
      base.reach += 8;
      base.kb += 1;
    }
    if (id === "red_spider") {
      base.damage = Math.max(3, base.damage - 3);
      base.reach -= 4;
      base.startup = Math.max(2, base.startup - 1);
    }
  }

  if (kind === "special") {
    base.lifetime = 24;
    base.startup = 6;
    base.active = 8;
    base.recovery = 12;
    base.damage = 11;
    base.kb = 8;

    if (id === "orange" || id === "versus") {
      const bossMul = id === "versus" ? 1.1 : 1;
      if (slot === "n" || slot === "f") {
        const proj = fighter.char.projectileCycle[fighter.projectileIdx % 3];
        fighter.projectileIdx++;
        Object.assign(base, {
          projectile: true,
          projType: proj,
          prop: proj,
          pose: "pencil_throw",
          name: id === "versus"
            ? (proj === "shuriken" ? "Rule Inject — Bit" : proj === "anvil" ? "Rule Inject — Weight" : "Rule Inject — Rocket")
            : (proj === "shuriken" ? "Pencil Toss — Shuriken" : proj === "anvil" ? "Pencil Toss — Anvil" : "Pencil Toss — Rocket"),
          damage: ((proj === "anvil" ? 14 : proj === "rocket" ? 12 : 8) + (id === "versus" ? 2 : 0)) * bossMul,
          kb: (proj === "anvil" ? 10 : 7) * bossMul,
          reach: 0,
          lifetime: 20,
        });
      } else if (slot === "u") {
        Object.assign(base, {
          overhead: true, damage: id === "versus" ? 15 : 13, kb: 11, angle: -1.3, yOff: -80, height: 60, reach: 50,
          name: id === "versus" ? "Undo Spike" : "Drawn Hammer", pose: "hammer", prop: "hammer",
        });
      } else if (slot === "d") {
        Object.assign(base, {
          damage: id === "versus" ? 12 : 10, kb: 9, angle: 0.2, travel: 9 * f,
          name: id === "versus" ? "Loop Slide" : "Sketch Slide", pose: "slide",
        });
      } else {
        Object.assign(base, {
          damage: id === "versus" ? 12 : 10, reach: 60, kb: 8,
          name: id === "versus" ? "Corrupt Bash" : "Eraser Bash", pose: "eraser",
        });
      }
    } else if (id === "dark_lord") {
      const ch = fighter.bossChapter || 1;
      const rage = fighter.raged ? 1.25 : 1;
      if (ch >= 2 && (slot === "n" || slot === "f")) {
        Object.assign(base, {
          damage: 15 * rage, kb: 10, reach: 78, height: 56, yOff: -50,
          bleed: true, pose: "data_blade", name: "数据刃", prop: "data_blade",
        });
      } else if (ch >= 2 && slot === "d") {
        Object.assign(base, {
          damage: 0, reach: 0, summonPillars: true, lifetime: 16, startup: 8, active: 2, recovery: 10,
          pose: "cast", name: "数据地刺",
        });
      } else if (slot === "u") {
        Object.assign(base, {
          overhead: true, damage: 16 * rage, kb: 12, angle: -1.3, yOff: -90, height: 70, reach: 58,
          pose: "hammer", name: "坠暗重拳",
        });
      } else if (slot === "b") {
        Object.assign(base, {
          damage: 13 * rage, kb: 9, reach: 72, pose: "wolf_sweep", name: "暗影横扫",
        });
      } else {
        // Ch1 martial / fallback
        Object.assign(base, {
          damage: 13 * rage, kb: 10, reach: 60, pose: "rush", name: "暗袭",
        });
      }
    } else if (id === "red_spider") {
      Object.assign(base, {
        damage: 5, kb: 5, reach: 36, travel: 8 * f, pose: "rush", name: "扑咬",
      });
    } else if (id === "red") {
      if (slot === "f" || slot === "n") {
        Object.assign(base, {
          damage: 12, kb: 9, travel: 12 * f, reach: 48, name: "Cheetah Rush", pose: "rush", spirit: "cheetah",
        });
      } else if (slot === "u") {
        Object.assign(base, {
          overhead: true, damage: 13, kb: 12, angle: -1.4, yOff: -90, name: "Tiger Upper", pose: "tiger_upper", spirit: "tiger",
        });
      } else if (slot === "d") {
        Object.assign(base, { damage: 11, kb: 7, angle: 0.5, name: "Wolf Sweep", pose: "wolf_sweep", spirit: "wolf", reach: 60 });
      } else {
        Object.assign(base, { damage: 10, kb: 8, invuln: 8, name: "Spirit Counter", pose: "counter", spirit: "spirit" });
      }
    } else if (id === "blue") {
      if (slot === "n" || slot === "f") {
        Object.assign(base, {
          projectile: true, projType: "potion", damage: 9, kb: 6, poison: true,
          name: "Potion Toss", pose: "potion_throw",
        });
      } else if (slot === "u") {
        Object.assign(base, { teleport: true, damage: 10, kb: 7, name: "Portal Swap", pose: "portal" });
      } else if (slot === "d") {
        Object.assign(base, { mist: true, damage: 0, lifetime: 12, name: "Mist Bomb", pose: "mist" });
      } else {
        Object.assign(base, { damage: 11, reach: 50, name: "Capoeira Spin", pose: "capoeira", lifetime: 28 });
      }
    } else if (id === "green") {
      if (slot === "n" || slot === "f") {
        Object.assign(base, {
          damage: 8, reach: 0, projectile: false, hookCast: true,
          name: "Cast & Hook", pose: "cast",
          lifetime: 12, startup: 2, active: 1, recovery: 8,
        });
      } else if (slot === "u") {
        Object.assign(base, { zipline: true, damage: 8, kb: 6, name: "Zipline Reel", pose: "zipline" });
      } else if (slot === "d") {
        Object.assign(base, {
          damage: 14, kb: 10, reach: 78, shockwave: true, name: "Power Chord", pose: "guitar",
        });
      } else {
        Object.assign(base, {
          damage: 9, reach: 70, pull: true, name: "Rod Whip", pose: "rod_whip",
        });
      }
    } else if (id === "yellow") {
      if (slot === "n" || slot === "f") {
        Object.assign(base, {
          projectile: true, projType: "code",
          damage: charged ? 12 : 8, kb: charged ? 9 : 5,
          delay: charged ? 18 : 0,
          name: charged ? "Compile Shot [CHARGED]" : "Compile Shot",
          pose: "code_cast",
        });
      } else if (slot === "u") {
        Object.assign(base, {
          damage: 9, kb: 11, angle: -1.5, pop: true, reach: 40, name: "Stack Overflow", pose: "popup",
        });
      } else {
        Object.assign(base, { teleport: true, damage: 7, kb: 4, name: "Debug Warp", pose: "warp" });
      }
    } else if (id === "purple") {
      if (slot === "n" || slot === "f") {
        Object.assign(base, { damage: 10, reach: 58, kb: 7, name: "Wing Slash", pose: "wing_slash" });
      } else if (slot === "u") {
        Object.assign(base, {
          damage: 11, kb: 10, angle: -1.3, overhead: true, yOff: -85, name: "Soar Spike", pose: "soar",
        });
      } else if (slot === "d") {
        Object.assign(base, { damage: 13, kb: 12, angle: 1.1, dive: true, name: "Meteor Dive", pose: "dive" });
      } else {
        Object.assign(base, {
          teleport: true, groundSnap: true, damage: 8, kb: 6, name: "Ground Snap", pose: "ground_snap",
        });
      }
    }
  }

  if (opts.nodeCrush) {
    Object.assign(base, {
      kind: "special",
      name: "NODE CRUSH",
      pose: "node_crush",
      damage: 18,
      kb: 14,
      angle: -1.35,
      overhead: true,
      invuln: 16,
      crack: 1,
      startup: 8,
      active: 10,
      recovery: 16,
      lifetime: 34,
      reach: 50,
      yOff: -50,
      height: 70,
    });
  }

  if (opts.nodeThrow) {
    base.name = "NODE THROW";
    base.pose = "node_throw";
  }

  base.damage *= dmgMul;
  base.kb *= kbMul;
  base.charged = charged;
  applyAtkPace(base, fighter);
  fighter.pose = base.pose;
  fighter.fxTag = base.name;
  return base;
}

export function attackBox(fighter, atk) {
  const x = fighter.x + (atk.xOff ?? 20 * fighter.facing);
  const y = fighter.y + (atk.yOff ?? -40);
  const w = atk.reach || 44;
  const h = atk.height || 36;
  const left = fighter.facing >= 0 ? x : x - w;
  return { x: left, y, w, h };
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
