import { CHARACTERS, CHARACTER_ORDER } from "./characters.js?v=78";
import { Match } from "./match.js?v=78";
import { BIND_P1, BIND_P2 } from "./input.js?v=78";

function p1Steps(char) {
  const name = char.name;
  const steps = [
    {
      id: "welcome",
      title: "P1 教程",
      body: `你选择了 ${name}。快捷键：WASD 移动 · J 攻击 · K 技能 · L 格挡 · 左 Shift 闪避（C 备用）。`,
      hint: "J / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "move",
      title: "P1 · 移动",
      body: "A / D 左右移动。",
      hint: "走到发光标记处",
      spawnMark: true,
      check: (ctx) => ctx.markReached,
    },
    {
      id: "jump",
      title: "P1 · 跳跃",
      body: "Space 或 W 跳跃，空中可再跳。",
      hint: "跳上中间平台",
      check: (ctx) => ctx.onPlatform,
    },
    {
      id: "attack",
      title: "P1 · 普通攻击",
      body: "J 攻击。可配合方向键改变招式。打中敌人会恢复紫色技能条。",
      hint: "打中假人一次",
      check: (ctx) => ctx.hitDummy,
    },
    {
      id: "special",
      title: "P1 · 特殊技能",
      body: `K = ${name} 特色技。紫色技能条：用 5 次耗尽；打中敌人约 10 次回满。`,
      hint: "用特殊技（K）打中假人",
      check: (ctx) => ctx.specialHit,
    },
    {
      id: "meters",
      title: "P1 · 体力与技能",
      body: "黄条=体力：左 Shift 闪避 / 滑铲 / L 格挡会耗；攻击或等约10秒慢回。紫条=技能：K 消耗。",
      hint: "看血条下黄条/紫条，然后 J / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "trip-launch",
      title: "P1 · 倒地与击飞",
      body: "受击有概率倒地（TRIP，不是濒死）。对倒地敌人按 ↑+J 上攻击可击飞（LAUNCH）；落地会受到摔落伤害（SLAM）。可借此多打几下连段。",
      hint: "J / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "campaign-tips",
      title: "P1 · 关卡模式提示",
      body: "关卡：清场后走到 EXIT 出门；倒地队友靠近按 E 救援。章末黑暗领主打发光弱点；半血狂暴。数据刃会流血，地刺可闯过但仍受伤。",
      hint: "J / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
  ];

  if (char.id === "green") {
    steps.push(
      {
        id: "hook-range",
        title: "Green · 钩索射程",
        body: "K 抛出钩索（耗技能条）：朝面向拉出闪电判定，钩尖碰到对手即勾中。",
        hint: "用 K 勾中假人一次（贴身或远处都可）",
        check: (ctx) => ctx.hooked,
      },
      {
        id: "hook-mash",
        title: "Green · 挣脱（M）",
        body: "勾中后停顿 1 秒。被勾者在 1 秒内连按 M 约 5–6 下可挣脱。",
        hint: "再勾一次，然后用 M 连按挣脱（或看提示）",
        check: (ctx) => ctx.hookEscaped || ctx.confirm,
      },
      {
        id: "hook-launch",
        title: "Green · 回收中再按起飞",
        body: "若未挣脱会把敌人拉到跟前。钩中后你可自由移动；拉回时敌人会跟着你走。拉扯中按 J 起飞。",
        hint: "勾中→走动→等回收跟上→可选 J 起飞",
        check: (ctx) => ctx.hookLaunched || ctx.confirm,
      },
      {
        id: "hook-purple",
        title: "Green · 空中 / Purple",
        body: "起飞后坠地会受伤。若对手是 Purple，起飞时可滑翔/飞行躲避落地伤害。",
        hint: "J / Enter 继续",
        check: (ctx) => ctx.confirm,
      },
      {
        id: "hook-crit",
        title: "Green · 暴击 / 冷却",
        body: "钩回身前后有暴击窗口；Danger 可秒杀。钩索结束后进入 5 秒冷却，期间不能再抛钩。",
        hint: "勾中并拉回假人，出现 CRIT 后攻击",
        check: (ctx) => ctx.hookCrit || ctx.confirm,
      },
    );
  }

  steps.push(
    {
      id: "block",
      title: "P1 · 格挡",
      body: "按住 L，朝来招方向格挡。L+U = 全能 Node 护盾。格挡消耗黄色体力条。",
      hint: "按住 L 格挡住假人一击",
      forceDummyAttack: true,
      check: (ctx) => ctx.blocked,
    },
    {
      id: "dodge",
      title: "P1 · 闪避",
      body: "闪避键是左 Shift（C 备用）。残影闪避耗黄条；背离对手 = 后撤步。",
      hint: "按左 Shift 闪避一次（可试 A/D+Shift 后撤）",
      check: (ctx) => ctx.dodged,
    },
    {
      id: "perfect-dodge",
      title: "P1 · 完美闪避",
      body: "假人出招瞬间按左 Shift：完美闪避瞬移身后，显示 PERFECT。",
      hint: "卡着假人攻击按左 Shift 完美闪避",
      forceDummyAttack: true,
      check: (ctx) => ctx.perfectDodged,
    },
    {
      id: "node",
      title: "P1 · Node",
      body: "U = Node。L+U Node Guard；U+攻击 / U+上+攻击 = Node 技。",
      hint: "按一次 U",
      check: (ctx) => ctx.usedNode,
    },
    {
      id: "slide",
      title: "P1 · 滑铲",
      body: "单人模式：↓ 方向键滑铲（耗黄条体力）。",
      hint: "按 ↓ ArrowDown 滑铲一次",
      check: (ctx) => ctx.slid,
    },
    {
      id: "free",
      title: "P1 · 自由练",
      body: "键位回顾：J攻击 K技能 L格挡 左Shift闪避。黄条体力 / 紫条技能。Esc 只用于菜单返回。Enter → P2。",
      hint: "ENTER — 开始 P2 教程",
      free: true,
      check: (ctx) => ctx.confirm,
    },
  );

  return steps;
}

function p2Steps(char) {
  const name = char.name;
  return [
    {
      id: "p2-welcome",
      title: "P2 教程",
      body: `换成 Player 2 键位操作 ${name}（右侧）。快捷键：方向键移动 · Numpad1 攻击 · Numpad2 技能 · Numpad3 格挡 · NumpadEnter 闪避（不是 Shift）。`,
      hint: "小键盘1 / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "p2-move",
      title: "P2 · 移动",
      body: "方向键 ← → 移动。",
      hint: "走到左侧发光标记",
      spawnMark: true,
      check: (ctx) => ctx.markReached,
    },
    {
      id: "p2-jump",
      title: "P2 · 跳跃",
      body: "↑ 或 Numpad0 跳跃。",
      hint: "跳上中间平台",
      check: (ctx) => ctx.onPlatform,
    },
    {
      id: "p2-attack",
      title: "P2 · 攻击",
      body: "Numpad1 普通攻击。打中敌人可恢复紫色技能条。",
      hint: "打中左侧假人",
      check: (ctx) => ctx.hitDummy,
    },
    {
      id: "p2-special",
      title: "P2 · 特殊",
      body: char.id === "green"
        ? "Numpad2=钩索（耗技能条）。被勾时 M×5 挣脱；回收中攻击起飞。"
        : "Numpad2 特殊技能（紫条：5次耗尽，打中约10次回满）。",
      hint: "用特殊技打中假人",
      check: (ctx) => ctx.specialHit,
    },
    {
      id: "p2-meters",
      title: "P2 · 体力与技能",
      body: "黄条=体力：NumpadEnter 闪避 / Numpad3 格挡会耗；紫条=技能：Numpad2 消耗。不要用 Shift 当闪避。",
      hint: "确认 HUD 后按 Numpad1 / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "p2-trip-launch",
      title: "P2 · 倒地与击飞",
      body: "受击有概率倒地（TRIP）。对倒地敌人按 ↑+Numpad1 上攻击可击飞；落地会受到摔落伤害（SLAM），便于继续连段。",
      hint: "Numpad1 / Enter 继续",
      check: (ctx) => ctx.confirm,
    },
    {
      id: "p2-block",
      title: "P2 · 格挡",
      body: "按住 Numpad3 格挡（耗体力）。Numpad3+Numpad4 = 全能 Node 护盾。",
      hint: "格挡住假人一击",
      forceDummyAttack: true,
      check: (ctx) => ctx.blocked,
    },
    {
      id: "p2-dodge",
      title: "P2 · 闪避",
      body: "闪避键是 NumpadEnter（或右 Ctrl），不是 Shift。残影闪避耗黄条；背离对手 = 后撤步。",
      hint: "按 NumpadEnter 闪避一次（可试方向键+后撤）",
      check: (ctx) => ctx.dodged,
    },
    {
      id: "p2-perfect-dodge",
      title: "P2 · 完美闪避",
      body: "假人出招瞬间按 NumpadEnter（勿按 Shift）：完美闪避瞬移身后，显示 PERFECT。",
      hint: "卡着假人攻击按 NumpadEnter",
      forceDummyAttack: true,
      check: (ctx) => ctx.perfectDodged,
    },
    {
      id: "p2-node",
      title: "P2 · Node",
      body: "Numpad4 = Node。",
      hint: "按一次 Numpad4",
      check: (ctx) => ctx.usedNode,
    },
    {
      id: "p2-free",
      title: "教程完成",
      body: "键位回顾：P1 闪避=左 Shift · P2 闪避=NumpadEnter。黄条体力 / 紫条技能。Esc 仅菜单返回。",
      hint: "ENTER — 结束",
      free: true,
      check: (ctx) => ctx.confirm,
    },
  ];
}

export class Tutorial {
  constructor() {
    this.phase = "select"; // select | p1 | p2 | done
    this.charIndex = 0;
    this.step = 0;
    this.flags = resetFlags();
    this.done = false;
    this.dummyCooldown = 0;
    this.confirmLock = 20;
    this.match = null;
    this.steps = [];
    this.markX = 900;
  }

  get charId() {
    return CHARACTER_ORDER[this.charIndex];
  }

  get char() {
    return CHARACTERS[this.charId];
  }

  get overlay() {
    if (this.phase === "select") {
      const c = this.char;
      return {
        title: "选择教学角色",
        body: `${c.name} — ${c.subtitle}`,
        hint: "A/D 选角色 · J/ENTER 开始  ·  P1 闪避 = 左 Shift",
      };
    }
    const s = this.steps[this.step];
    if (!s) return { title: "TUTORIAL", body: "", hint: "" };
    const total = this.steps.length;
    return {
      title: `${s.title}  (${this.step + 1}/${total})`,
      body: typeof s.body === "function" ? s.body() : s.body,
      hint: s.hint,
    };
  }

  get learner() {
    return this.phase === "p2" ? this.match.p2 : this.match.p1;
  }

  get dummy() {
    return this.phase === "p2" ? this.match.p1 : this.match.p2;
  }

  startTrack(phase) {
    this.phase = phase;
    this.step = 0;
    this.flags = resetFlags();
    this.dummyCooldown = 30;
    this.confirmLock = 25;
    const student = this.charId;
    const dummyId = student === "red" ? "blue" : "red";

    if (phase === "p1") {
      this.steps = p1Steps(this.char);
      this.match = new Match({
        p1Id: student,
        p2Id: dummyId,
        stageId: "training",
        vsCpu: false,
        solo: true,
        onEvent: (type, data) => this.onEvent(type, data, 0),
      });
      this.match.p2.char = { ...CHARACTERS[dummyId], name: "DUMMY" };
      this.markX = 900;
    } else {
      this.steps = p2Steps(this.char);
      this.match = new Match({
        p1Id: dummyId,
        p2Id: student,
        stageId: "training",
        vsCpu: false,
        solo: false,
        onEvent: (type, data) => this.onEvent(type, data, 1),
      });
      this.match.p1.char = { ...CHARACTERS[dummyId], name: "DUMMY" };
      this.markX = 320;
      // Swap spawn so student starts on the right
      this.match.p1.resetForFile(320, 1);
      this.match.p2.resetForFile(960, -1);
    }
    this.match.need = 99;
    this.match.timer = 99;
    this.match.hideHud = false;
  }

  onEvent(type, _data, learnerSide) {
    const learner = learnerSide === 1 ? this.match.p2 : this.match.p1;
    if (type === "hit") {
      this.flags.hitDummy = true;
      if (learner.attack?.kind === "special" || learner.attack?.hookCast) this.flags.specialHit = true;
      if (_data?.crit || _data?.dangerKill) this.flags.hookCrit = true;
    }
    if (type === "block") this.flags.blocked = true;
    if (type === "dodge") this.flags.dodged = true;
    if (type === "perfectDodge") {
      this.flags.dodged = true;
      this.flags.perfectDodged = true;
    }
    if (type === "hook") {
      this.flags.specialHit = true;
      this.flags.hooked = true;
    }
    if (type === "hookEscape") this.flags.hookEscaped = true;
    if (type === "hookLaunch") this.flags.hookLaunched = true;
    if (type === "hookReel") this.flags.hookCrit = true; // reel-in grants crit window
  }

  update(inputP1, inputP2, inputApi) {
    if (this.done) return;
    if (this.confirmLock > 0) this.confirmLock -= 1;

    if (this.phase === "select") {
      if (inputApi.pressed(BIND_P1.left)) {
        this.charIndex = (this.charIndex + CHARACTER_ORDER.length - 1) % CHARACTER_ORDER.length;
      }
      if (inputApi.pressed(BIND_P1.right)) {
        this.charIndex = (this.charIndex + 1) % CHARACTER_ORDER.length;
      }
      if (this.confirmLock <= 0 && (inputP1.attack || inputP1.start)) {
        this.startTrack("p1");
      }
      return;
    }

    const step = this.steps[this.step];
    const learnerInput = this.phase === "p2" ? inputP2 : inputP1;
    const learner = this.learner;
    const dummy = this.dummy;

    this.flags.confirm = this.confirmLock <= 0 && !!(learnerInput.attack || learnerInput.start);
    if (learnerInput.node || learnerInput.nodePressed) this.flags.usedNode = true;
    if (learnerInput.slide) this.flags.slid = true;
    if (learnerInput.dodge) this.flags.dodged = true;
    if (learner.state === "special" && learner.attack?.pose === "slide") this.flags.slid = true;
    if (learner.state === "dodge") this.flags.dodged = true;

    const specialBind = this.phase === "p2" ? BIND_P2.special : BIND_P1.special;
    if (inputApi.pressed(specialBind) && (learnerInput.dirX !== 0 || learnerInput.dirY !== 0)) {
      this.flags.dirSpecials += 1;
    }

    if (Math.abs(learner.x - this.markX) < 45) this.flags.markReached = true;
    for (const pl of this.match.platforms()) {
      if (learner.onGround && learner.y <= pl.y + 2 && learner.x > pl.x && learner.x < pl.x + pl.w) {
        this.flags.onPlatform = true;
      }
    }

    let dummyInput = {
      dirX: 0, dirY: 0, jump: false, jumpHeld: false,
      attack: false, special: false, block: false, node: false, nodePressed: false,
      start: false, slide: false, dodge: false, mashEscape: false,
    };

    if (step.forceDummyAttack) {
      this.dummyCooldown -= 1;
      // keep dummy near learner
      const side = this.phase === "p2" ? 1 : -1;
      dummy.x = learner.x + side * 90;
      if (this.dummyCooldown <= 0 && Math.abs(learner.x - dummy.x) < 130) {
        dummyInput.attack = true;
        // Perfect-dodge drills: attack a bit more often
        this.dummyCooldown = step.id?.includes("perfect-dodge") ? 36 : 50;
      }
    } else if (step.free) {
      if (Math.random() > 0.98) dummyInput.block = true;
    } else {
      dummy.x = this.phase === "p2" ? 320 : 720;
      dummy.vx = 0;
      dummy.hp = dummy.maxHp;
      dummy.nodes = dummy.maxNodes;
    }

    if (!step.free) {
      learner.hp = learner.maxHp;
      learner.nodes = Math.max(learner.nodes, 2);
      learner.stamina = learner.maxStamina ?? 100;
      learner.skill = learner.maxSkill ?? 100;
    }

    this.match.timer = 99;
    this.match.phase = "fight";

    if (this.phase === "p1") {
      this.match.update(learnerInput, dummyInput);
    } else {
      this.match.update(dummyInput, learnerInput);
    }

    if (!step.free && dummy.hp < dummy.maxHp * 0.5) {
      dummy.hp = dummy.maxHp;
      dummy.hitstun = 0;
      dummy.controlLock = 0;
      if (dummy.state !== "grabbed") dummy.state = "idle";
    }

    if (step.check(this.flags)) {
      this.step += 1;
      this.flags = resetFlags();
      this.dummyCooldown = 30;
      this.confirmLock = 20;
      if (this.step >= this.steps.length) {
        if (this.phase === "p1") {
          this.startTrack("p2");
        } else {
          this.done = true;
          this.phase = "done";
        }
      }
    }
  }
}

function resetFlags() {
  return {
    confirm: false,
    markReached: false,
    onPlatform: false,
    hitDummy: false,
    specialHit: false,
    blocked: false,
    dodged: false,
    perfectDodged: false,
    usedNode: false,
    dirSpecials: 0,
    slid: false,
    hooked: false,
    hookEscaped: false,
    hookLaunched: false,
    hookCrit: false,
  };
}
