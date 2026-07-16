import { ARENA } from "./stages.js?v=71";
import { attackBox } from "./fighter.js?v=71";
import { drawImpact, drawWeaponIcon } from "./assets.js?v=71";

export function drawMatch(ctx, match, W, H, overlayText) {
  ctx.save();
  drawBackground(ctx, match, W, H);
  drawArenaFrame(ctx);
  drawPlatforms(ctx, match);
  const roster = match.roster || [match.p1, match.p2];
  for (const f of roster) {
    if (!f || f.state === "dead" || f.alive === false) continue;
    if (f.state === "downed") {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin((match.t || 0) * 0.15) * 0.15;
      drawFighter(ctx, f);
      ctx.restore();
      ctx.font = "9px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff8fab";
      ctx.fillText("DOWNED", f.x, f.y - 96);
      if (f.reviveHint) {
        ctx.fillStyle = "#6dffb0";
        ctx.fillText("E 救援", f.x, f.y - 80);
      } else if (f.downedT != null) {
        ctx.fillStyle = "#ffd166";
        ctx.fillText(String(Math.ceil((f.downedT || 0) / 60)), f.x, f.y - 80);
      }
    } else if (f.state === "knockdown") {
      ctx.save();
      ctx.globalAlpha = 0.85 + Math.sin((match.t || 0) * 0.2) * 0.1;
      drawFighter(ctx, f);
      ctx.restore();
      ctx.font = "9px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.fillText("TRIP", f.x, f.y - 88);
      ctx.fillStyle = "#8b9bb0";
      ctx.font = "11px 'Share Tech Mono'";
      ctx.fillText("↑J 击飞→摔伤", f.x, f.y - 72);
    } else {
      drawFighter(ctx, f);
    }
  }
  // Story mode: gold triangle above player, tip pointing down at them
  if (match.isStory && match.p1 && match.p1.alive && match.p1.state !== "dead") {
    drawStoryPlayerMarker(ctx, match.p1, match.t || 0);
  }
  for (const p of match.projectiles) drawProjectile(ctx, p);
  for (const h of match.hooks || []) drawHookBeam(ctx, h);
  for (const pk of match.pickups || []) drawPickup(ctx, pk, match.t || 0);
  for (const hz of match.hazards || []) drawHazard(ctx, hz);
  for (const f of match.fx) drawFx(ctx, f);

  if (match.phase === "extract" && match.exitZone) {
    drawExitZone(ctx, match.exitZone, match.t || 0);
  }

  // Move name callouts
  for (const f of roster) {
    if (f.attack && f.attack.frame < 18 && f.attack.name) {
      ctx.font = "10px 'Press Start 2P'";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(f.attack.name, f.x, f.y - 100);
      ctx.fillText(f.attack.name, f.x, f.y - 100);
    }
  }

  if (match.phase === "extract") {
    ctx.font = "14px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#6dffb0";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    const pulse = 0.7 + Math.sin((match.t || 0) * 0.12) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeText("WALK TO EXIT →", W / 2, 96);
    ctx.fillText("WALK TO EXIT →", W / 2, 96);
    ctx.globalAlpha = 1;
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#cfd8e6";
    ctx.fillText("可先按 E 救援倒地队友，再走到右侧出口", W / 2, 122);
  } else if (match.phase === "ko") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 8;
    const koLabel = match.isCampaign ? "CLEAR!" : "FILE!";
    ctx.strokeText(koLabel, W / 2, H / 2);
    ctx.fillText(koLabel, W / 2, H / 2);
  } else if (match.phase === "file") {
    ctx.font = "22px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.strokeText(match.area.name, W / 2, H / 2);
    ctx.fillText(match.area.name, W / 2, H / 2);
  } else if (match.phase === "matchover") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    let label;
    if (match.isCampaign) {
      label = match.winner === 0 ? "LEVEL CLEAR" : "LEVEL FAILED";
    } else {
      const name = match.winner === 0 ? match.p1.char.name : match.p2.char.name;
      label = `${name} WINS`;
    }
    ctx.font = "32px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = match.isCampaign && match.winner !== 0 ? "#ff4d6d" : "#ff6b2c";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 8;
    ctx.strokeText(label, W / 2, H / 2);
    ctx.fillText(label, W / 2, H / 2);
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "#cfd8e6";
    ctx.fillText("ENTER — CONTINUE", W / 2, H / 2 + 48);
  }

  if (overlayText) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(140, 40, W - 280, 110);
    ctx.strokeStyle = "#ff6b2c";
    ctx.lineWidth = 2;
    ctx.strokeRect(140, 40, W - 280, 110);
    ctx.font = "12px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(overlayText.title || "TUTORIAL", W / 2, 72);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(overlayText.body || "", W / 2, 100);
    if (overlayText.hint) {
      ctx.fillStyle = "#8b9bb0";
      ctx.fillText(overlayText.hint, W / 2, 126);
    }
  }

  ctx.restore();
}

/** Golden triangle over story-mode player; tip points down at the head. */
function drawStoryPlayerMarker(ctx, f, t) {
  const bob = Math.sin(t * 0.12) * 3;
  const scale = f.drawScale || 1;
  const headY = f.y - (f.h || 70) * scale - 18 + bob;
  const x = f.x;
  const tipY = headY + 10; // tip toward player
  const topY = headY - 14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, tipY);
  ctx.lineTo(x - 11, topY);
  ctx.lineTo(x + 11, topY);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, topY, x, tipY);
  g.addColorStop(0, "#ffe566");
  g.addColorStop(0.55, "#ffd166");
  g.addColorStop(1, "#e8a820");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#8a5a00";
  ctx.lineWidth = 2;
  ctx.stroke();
  // soft glow
  ctx.globalAlpha = 0.35 + Math.sin(t * 0.15) * 0.1;
  ctx.beginPath();
  ctx.moveTo(x, tipY + 2);
  ctx.lineTo(x - 14, topY - 2);
  ctx.lineTo(x + 14, topY - 2);
  ctx.closePath();
  ctx.fillStyle = "#ffd166";
  ctx.fill();
  ctx.restore();
}

function drawExitZone(ctx, z, t) {
  const pulse = 0.45 + Math.sin(t * 0.1) * 0.2;
  const x = z.x;
  const y = z.y;
  const g = ctx.createLinearGradient(x - 40, y - 140, x + 40, y);
  g.addColorStop(0, `rgba(109,255,176,${0.15 + pulse * 0.25})`);
  g.addColorStop(1, `rgba(109,255,176,${0.55 + pulse * 0.2})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 36, y);
  ctx.lineTo(x - 28, y - 120);
  ctx.lineTo(x + 28, y - 120);
  ctx.lineTo(x + 36, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(109,255,176,${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "11px 'Press Start 2P'";
  ctx.textAlign = "center";
  ctx.fillStyle = "#6dffb0";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeText("EXIT", x, y - 132);
  ctx.fillText("EXIT", x, y - 132);
}

function drawBackground(ctx, match, W, H) {
  const area = match.area;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, area.bg[0]);
  g.addColorStop(1, area.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const props = area.props;
  if (props === "desktop") {
    drawTaskbar(ctx, W, H);
    drawDesktopIcons(ctx);
  } else if (props === "browser") {
    drawWindowChrome(ctx, 160, 120, 960, 480, "sticksfight.com");
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(180, 160, 920, 400);
  } else if (props === "animate") {
    drawWindowChrome(ctx, 100, 100, 1080, 520, "scene.fla — Adobe Animate");
    ctx.fillStyle = "#1a1f28";
    ctx.fillRect(120, 560, 1040, 40);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 ? "#2a3340" : "#243040";
      ctx.fillRect(130 + i * 50, 568, 46, 24);
    }
  } else if (props === "explorer") {
    drawWindowChrome(ctx, 80, 90, 1120, 540, "File Explorer");
    ctx.fillStyle = "#121820";
    ctx.fillRect(100, 130, 200, 480);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = "#2a3544";
      ctx.fillRect(340, 160 + i * 48, 720, 28);
    }
  } else if (props === "cliff" || props === "rocks") {
    ctx.fillStyle = "#2f4f3e";
    ctx.beginPath();
    ctx.moveTo(0, 500);
    ctx.lineTo(200, 420);
    ctx.lineTo(400, 480);
    ctx.lineTo(700, 400);
    ctx.lineTo(1000, 460);
    ctx.lineTo(1280, 420);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.fill();
    ctx.fillStyle = "#3d6b8a";
    ctx.fillRect(0, 600, 1280, 120);
  } else if (props === "water") {
    ctx.fillStyle = "#2a6f8f";
    ctx.fillRect(0, 580, 1280, 140);
    ctx.fillStyle = "rgba(180,230,255,0.15)";
    for (let i = 0; i < 12; i++) {
      const x = (i * 140 + match.t * 2) % 1400 - 60;
      ctx.fillRect(x, 590 + Math.sin((match.t + i * 10) / 8) * 4, 80, 6);
    }
  } else if (props === "bunker" || props === "versus") {
    ctx.fillStyle = "#3a3038";
    ctx.fillRect(80, 200, 300, 420);
    ctx.fillRect(900, 200, 300, 420);
    ctx.fillStyle = "#1a1218";
    ctx.fillRect(500, 520, 280, 100);
    if (props === "versus") {
      ctx.font = "28px 'Press Start 2P'";
      ctx.fillStyle = "rgba(255,77,109,0.22)";
      ctx.textAlign = "center";
      ctx.fillText("VS", 640, 360);
      ctx.strokeStyle = "rgba(155,163,178,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(420, 280, 440, 120);
    }
  } else if (props === "tutorial") {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i < 8; i++) ctx.fillRect(120 + i * 140, 200, 2, 400);
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "rgba(255,209,102,0.2)";
    ctx.textAlign = "center";
    ctx.fillText("TRAINING ROOM", W / 2, 180);
  } else if (props === "ruins" || props === "ruins_boss") {
    // Fractured desktop — shattered panes, not a DC biome copy
    ctx.fillStyle = "rgba(80,60,40,0.35)";
    ctx.fillRect(0, 560, W, 80);
    ctx.strokeStyle = "rgba(200,160,100,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 200;
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x + 40 + (i % 3) * 12, 200);
      ctx.lineTo(x - 20, 280);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,180,80,0.06)";
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(100 + i * 110, 160 + (i % 4) * 40, 48, 28);
    }
    if (props === "ruins_boss") {
      ctx.font = "16px 'Press Start 2P'";
      ctx.fillStyle = "rgba(255,120,60,0.2)";
      ctx.textAlign = "center";
      ctx.fillText("GUARD PROTOCOL", W / 2, 160);
    }
  } else if (props === "caves" || props === "caves_boss") {
    ctx.fillStyle = "rgba(40,80,100,0.2)";
    for (let i = 0; i < 8; i++) {
      const x = 60 + i * 150 + Math.sin(match.t * 0.02 + i) * 8;
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 30, 200);
      ctx.lineTo(x - 10, 320);
      ctx.lineTo(x + 20, 500);
      ctx.strokeStyle = "rgba(100,200,220,0.12)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120,220,255,0.08)";
    for (let i = 0; i < 14; i++) {
      const x = (i * 97 + match.t * 0.4) % W;
      const y = 140 + (i * 37) % 360;
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    if (props === "caves_boss") {
      ctx.font = "16px 'Press Start 2P'";
      ctx.fillStyle = "rgba(100,200,255,0.22)";
      ctx.textAlign = "center";
      ctx.fillText("DATA WRAITH", W / 2, 150);
    }
  } else if (props === "spire" || props === "spire_boss") {
    ctx.fillStyle = "rgba(60,40,80,0.25)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 100);
    ctx.lineTo(W / 2 + 180, 520);
    ctx.lineTo(W / 2 - 180, 520);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(180,120,220,0.2)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = 180 + i * 70;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 40 - i * 20, y);
      ctx.lineTo(W / 2 + 40 + i * 20, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,80,120,0.08)";
    ctx.fillRect(W / 2 - 60, 120, 120, 40);
    if (props === "spire_boss") {
      ctx.font = "18px 'Press Start 2P'";
      ctx.fillStyle = "rgba(255,77,109,0.28)";
      ctx.textAlign = "center";
      ctx.fillText("CORE VERSUS", W / 2, 155);
    }
  }
}

function drawTaskbar(ctx, W, H) {
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = "#1e2a38";
  ctx.fillRect(8, H - 34, 120, 28);
  ctx.fillStyle = "#8b9bb0";
  ctx.font = "10px 'Share Tech Mono'";
  ctx.fillText("Start", 40, H - 16);
}

function drawDesktopIcons(ctx) {
  const icons = ["Recycle", "AVA", "Stick", "Mine"];
  icons.forEach((name, i) => {
    const x = 40;
    const y = 60 + i * 80;
    ctx.fillStyle = "#2a3544";
    ctx.fillRect(x, y, 36, 36);
    ctx.fillStyle = "#8b9bb0";
    ctx.font = "10px 'Share Tech Mono'";
    ctx.fillText(name, x - 4, y + 52);
  });
}

function drawWindowChrome(ctx, x, y, w, h, title) {
  ctx.fillStyle = "#2b3340";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#1a222c";
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = "#cfd8e6";
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillText(title, x + 12, y + 18);
  ctx.fillStyle = "#ff5f57";
  ctx.beginPath(); ctx.arc(x + w - 50, y + 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#febc2e";
  ctx.beginPath(); ctx.arc(x + w - 30, y + 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#28c840";
  ctx.beginPath(); ctx.arc(x + w - 10, y + 14, 6, 0, Math.PI * 2); ctx.fill();
}

function drawArenaFrame(ctx) {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.wallL, ARENA.ceiling, ARENA.wallR - ARENA.wallL, ARENA.floor - ARENA.ceiling);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(ARENA.wallL, ARENA.floor);
  ctx.lineTo(ARENA.wallR, ARENA.floor);
  ctx.stroke();
}

function drawPlatforms(ctx, match) {
  for (const p of match.platforms()) {
    let x = p.x;
    if (p.moving) x = p.x + Math.sin(match.t / 60 * p.speed) * p.amp;
    ctx.fillStyle = "#4a5d72";
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.fillStyle = "#8aa0b8";
    ctx.fillRect(x, p.y, p.w, 3);
  }
}

/** Authentic AvA-style stick with hollow Orange head + signature props + pose anims. */
export function drawStickFigure(ctx, f, opts = {}) {
  const preview = !!opts.preview;
  // Campaign grunts: gray solid head (spiders keep red)
  const c = f.grayGrunt ? "#8a8a8a" : f.char.color;
  const x = f.x;
  const y = f.y;
  const scale = (!preview && f.drawScale) ? f.drawScale : 1;
  if (scale !== 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
  }
  const dir = f.facing;
  const atk = f.attack;
  const startup = atk?.startup ?? 4;
  const activeEnd = startup + (atk?.active ?? 6);
  const life = atk?.lifetime ?? 18;
  const frame = atk?.frame ?? 0;
  const active = !!(atk && frame >= startup && frame < activeEnd);

  // Attack motion progress: windup → strike → recover
  let atkPhase = -1; // -1 none, 0 windup, 1 active, 2 recover
  let atkT = 0;
  if (atk) {
    if (frame < startup) {
      atkPhase = 0;
      atkT = frame / Math.max(1, startup);
    } else if (frame < activeEnd) {
      atkPhase = 1;
      atkT = (frame - startup) / Math.max(1, atk.active || 6);
    } else {
      atkPhase = 2;
      atkT = (frame - activeEnd) / Math.max(1, life - activeEnd);
    }
  }

  // Prefer live attack pose; otherwise state (never stick on stale attack pose)
  let pose = "idle";
  if (atk?.pose) pose = atk.pose;
  else if (f.state === "dodge") pose = f.pose === "backdash" ? "backdash" : "dodge";
  else if (f.state === "walk") pose = f.pose === "walk_back" ? "walk_back" : "walk";
  else if (f.state === "block") pose = f.nodeGuard ? "node_guard" : "block";
  else if (f.state === "hit") pose = "hit";
  else if (f.state === "stun" || f.state === "grabbed") pose = f.state === "grabbed" ? "grabbed" : "stun";
  else if (f.state === "dead" || f.state === "knockdown") pose = "dead";
  else if (f.state === "cast") pose = "cast";
  else if (f.gliding || f.state === "glide") pose = "glide";
  else if (!f.onGround || f.state === "jump") pose = "jump";
  else if (f.pose && f.pose !== "idle") pose = f.pose;
  else pose = "idle";

  // Character-specific idle: keep boxer (Red/Purple) + Green rod stance only
  if (pose === "idle") {
    if (f.char.id === "red" || f.char.id === "purple") pose = "idle_boxer";
    else if (f.char.id === "green") pose = "idle_green";
  }

  // Walk bob: Alan Becker down/up — lowest after contact, highest after passing
  const walkT = f.anim * (pose === "walk_back" ? 0.11 : 0.12);
  const bob = pose === "walk" || pose === "walk_back"
    ? Math.sin(walkT * 2) * -3.2
    : pose.startsWith("idle")
      ? Math.sin(f.anim * 0.08) * 1.5
      : pose === "backdash"
        ? -4
        : 0;
  ctx.save();
  if (!preview) {
    if (f.invuln > 0 && Math.floor(f.anim / 2) % 2) ctx.globalAlpha = 0.45;
    if (f.mistUntil > 0) ctx.globalAlpha = 0.35;
    if (f.flash > 0) ctx.filter = "brightness(2)";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, Math.min(y + 2, ARENA.floor + 2), 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red animal-spirit silhouette (original kit: cheetah / tiger / wolf)
  if (atk?.spirit && (active || atkPhase === 0)) {
    drawSpiritAura(ctx, atk.spirit, x, y, dir, f.anim, atkPhase, atkT);
  }

  // AvA stick: head sits on a single neck join. Arms + torso meet there
  // (not on the head's side rim). Short torso, longer legs.
  const lean =
    pose === "idle_green" ? dir * 10
    : pose === "walk" ? dir * 3.5
    : pose === "walk_back" ? dir * 4
    : pose === "backdash" ? dir * 8
    : 0;
  const headX = x + lean;
  const headY = y - 58 + bob;
  const headR = 14;
  const hollow = f.grayGrunt ? false : !!f.char.hollowHead;
  const headStroke = hollow ? 4 : 2;
  const rimY = headY + headR;
  const visR = headR + headStroke * 0.5;
  // Neck join = bottom of head circle (torso/arms root)
  const joinX = headX;
  const joinY = headY + visR;
  // Tiny L/R split so both arms read, still at the neck — not head cheeks
  const armRootFY = joinY;
  const armRootBY = joinY;
  const armRootFX = joinX + dir * 2.5;
  const armRootBX = joinX - dir * 2.5;
  // Longer legs (~26px), shorter torso (~joinY→hip ≈ 14px)
  const hipY = y - 26 + bob * 0.9;
  const hipSway = (pose === "walk" || pose === "walk_back")
    ? dir * Math.sin(walkT) * (pose === "walk_back" ? -2.5 : 3)
    : 0;
  const hipX = x - lean * 0.35 + hipSway;
  const shoulderY = joinY;
  const shoulderX = joinX;

  const limbs = limbPose(pose, dir, shoulderX, y, bob, active, f.anim, shoulderY, atkPhase, atkT, hipY, hipX);
  const walkish = pose === "walk" || pose === "walk_back";
  limbs.elbowF = null;
  limbs.elbowB = null;
  if (walkish) {
    const liftF = Math.max(0, y - limbs.legF.y);
    const liftB = Math.max(0, y - limbs.legB.y);
    const down = Math.max(0, -Math.sin(walkT * 2));
    limbs.kneeF = bendJoint(hipX, hipY, limbs.legF.x, limbs.legF.y, 5 + liftF * 1.05 + (liftF < 1 ? down * 5 : 0), -1);
    limbs.kneeB = bendJoint(hipX, hipY, limbs.legB.x, limbs.legB.y, 5 + liftB * 1.05 + (liftB < 1 ? down * 5 : 0), -1);
  }

  if (f.char.wings) {
    const flap = f.gliding || pose === "soar" || pose === "dive"
      ? Math.sin(f.anim * 0.35) * 14
      : Math.sin(f.anim * 0.12) * 5;
    const spread = pose === "dive" ? 20 : pose === "wing_slash" && active ? 50 : 42;
    ctx.strokeStyle = "#c5cad3";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(joinX, joinY);
    ctx.quadraticCurveTo(joinX - spread, y - 78 + flap, joinX - spread - 10, y - 36);
    ctx.moveTo(joinX, joinY);
    ctx.quadraticCurveTo(joinX + spread, y - 78 - flap, joinX + spread + 10, y - 36);
    ctx.stroke();
  }

  // Skeleton from the head circle (butt caps — round nubs read as a neck)
  ctx.strokeStyle = c;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(joinX, joinY);
  ctx.lineTo(hipX, hipY);
  strokeJointed(ctx, armRootFX, armRootFY, limbs.elbowF, limbs.armF);
  strokeJointed(ctx, armRootBX, armRootBY, limbs.elbowB, limbs.armB);
  strokeJointed(ctx, hipX, hipY, limbs.kneeF, limbs.legF);
  strokeJointed(ctx, hipX, hipY, limbs.kneeB, limbs.legB);
  ctx.stroke();
  ctx.lineCap = "round";

  // Omni Node Guard shield bubble
  if (f.nodeGuard && f.state === "block") {
    drawNodeShield(ctx, f, x, y, dir);
  }

  // Orange pencil-draw windup (TSC draws props before they appear — Kickstarter / AvA)
  if (idLooksLikeDrawer(f) && atkPhase === 0 &&
      (pose === "hammer" || pose === "pencil_throw" || pose === "eraser" || pose === "pencil_jab" || pose === "rush")) {
    drawSketchTrail(ctx, x, headY, dir, atkT, limbs);
  }

  // Motion slash arcs on active melee (makes each strike read differently)
  if (active && atk && !atk.projectile) {
    drawAttackArc(ctx, pose, x, y, dir, atkT, limbs);
  }

  // Head last — fill clears interior stubs; stroke seals the rim join
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  if (hollow) {
    ctx.fillStyle = "#0e141c";
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = headStroke;
    ctx.stroke();
  } else {
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = f.char.outline || "#000";
    ctx.lineWidth = headStroke;
    ctx.stroke();
  }

  // Red yellow headband + free ends
  if (f.char.headband) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(headX, headY, headR + 1, -2.4, -0.2);
    ctx.stroke();
    const flutter = Math.sin(f.anim * 0.25) * 3;
    ctx.beginPath();
    ctx.moveTo(headX + 11, headY - 6);
    ctx.quadraticCurveTo(headX + 22, headY - 18 + flutter, headX + 28, headY - 10 + flutter);
    ctx.moveTo(headX + 11, headY - 2);
    ctx.quadraticCurveTo(headX + 24, headY - 8 - flutter, headX + 30, headY + 2 - flutter);
    ctx.stroke();
  }

  // Signature props
  drawProps(ctx, f, pose, active, dir, headX, y, headY, limbs);

  // Boxer fist gloves (Red / Purple idle)
  if (pose === "idle_boxer") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(limbs.armF.x, limbs.armF.y, 5.5, 0, Math.PI * 2);
    ctx.arc(limbs.armB.x, limbs.armB.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = f.char.outline || "#000";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Green hook cable while struggling / reeling
  if (f.char.id === "green" && f.hookTarget && (f.hookPhase === "struggle" || f.hookPhase === "reeling")) {
    const t = f.hookTarget;
    ctx.strokeStyle = "#cfd8e6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(limbs.armF.x, limbs.armF.y);
    ctx.lineTo(t.x, t.y - 40);
    ctx.stroke();
    ctx.fillStyle = "#2bbf7a";
    ctx.beginPath();
    ctx.arc(t.x, t.y - 40, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (f.hookPhase === "struggle" && f.hookedBy) {
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    const mash = f.hookMash || 0;
    ctx.fillText(`挣脱 M×${mash}/5`, x, y - 95);
  } else if (f.hookPhase === "struggle") {
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#2bbf7a";
    ctx.textAlign = "center";
    ctx.fillText("HOOK 1s", x, y - 95);
  } else if (f.hookPhase === "reeling" && f.hookedBy) {
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillStyle = "#2bbf7a";
    ctx.textAlign = "center";
    ctx.fillText("HOOKED", x, y - 95);
  } else if (f.hookPhase === "reeling") {
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.fillText("J攻击起飞", x, y - 95);
  }

  if (f.critWindow > 0) {
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#ff4d6d";
    ctx.textAlign = "center";
    ctx.fillText("CRIT!", x, y - 100);
  }

  if (f.char.id === "green" && (f.hookCooldown || 0) > 0 && !f.hookPhase) {
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#8b9bb0";
    ctx.textAlign = "center";
    ctx.fillText(`CD ${(f.hookCooldown / 60).toFixed(1)}s`, x, y - 88);
  }

  // Shockwave ring for guitar
  if (pose === "guitar" && active) {
    ctx.strokeStyle = "rgba(43,191,122,0.5)";
    ctx.lineWidth = 3;
    const r = 20 + atk.frame * 4;
    ctx.beginPath();
    ctx.arc(x, y - 30, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Danger aura
  if (f.danger && !preview) {
    ctx.strokeStyle = "rgba(255,77,109,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 40, 30 + Math.sin(f.anim * 0.3) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if ((f.bleedT || 0) > 0 && !preview) {
    ctx.fillStyle = "rgba(200,40,60,0.55)";
    ctx.beginPath();
    ctx.arc(x + 16, y - 70, 4 + Math.sin(f.anim * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillStyle = "#ff8fab";
    ctx.textAlign = "center";
    ctx.fillText("BLEED", x, y - 102);
  }

  if (f.stun > 0 && !preview) {
    ctx.strokeStyle = "#5b8cff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(f.anim * 0.2 + i * 2) * 18, headY - 10 + Math.sin(f.anim * 0.2 + i) * 6, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Active hitbox tint (subtle)
  if (!preview && atk && !atk.projectile && active) {
    const box = attackBox(f, atk);
    ctx.fillStyle = "rgba(255,209,102,0.18)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }

  ctx.restore(); // flash / alpha
  if (scale !== 1) ctx.restore(); // colossal scale
  if (!preview && f.colossalBoss) drawColossalWeakZones(ctx, f);
}

/** Glowing weak points on stationary arena bosses (world space). */
function drawColossalWeakZones(ctx, f) {
  const zones = f.weakZones || [];
  const pulse = 0.45 + Math.sin((f.anim || 0) * 0.2) * 0.2;
  for (const z of zones) {
    const x = f.x + z.x;
    const y = f.y + z.y;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ff4d6d";
    ctx.fillStyle = "rgba(255,77,109,0.22)";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, z.w, z.h);
    ctx.strokeRect(x, y, z.w, z.h);
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.min(1, pulse + 0.25);
    ctx.fillText("WEAK", x + z.w / 2, y + z.h / 2 + 3);
    ctx.restore();
  }
}

function idLooksLikeDrawer(f) {
  return f.char.id === "orange" || f.char.id === "versus";
}

/** Pencil scribble while Orange winds up a drawn prop (AvA / Animation VERSUS). */
function drawSketchTrail(ctx, x, headY, dir, t, limbs) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,183,3,${0.35 + t * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const ax = limbs.armF.x;
  const ay = limbs.armF.y;
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(
    ax + dir * (20 + t * 30),
    ay - 40 * t,
    ax + dir * (10 + t * 18),
    headY - 10 + Math.sin(t * 12) * 8
  );
  ctx.stroke();
  ctx.restore();
}

/** Red's animal-spirit martial arts aura from official kit description. */
function drawSpiritAura(ctx, spirit, x, y, dir, anim, phase, t) {
  const colors = {
    cheetah: "#ffe66d",
    tiger: "#ff9f1c",
    wolf: "#90e0ef",
    spirit: "#ffb4a2",
  };
  const col = colors[spirit] || "#ffe66d";
  ctx.save();
  ctx.globalAlpha = phase === 0 ? 0.25 + t * 0.25 : 0.4;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.5;
  const cx = x + dir * (spirit === "cheetah" ? 18 : 0);
  const cy = y - 40;
  if (spirit === "tiger") {
    // claw marks
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 10, cy - 18 + i * 10);
      ctx.lineTo(cx + dir * (28 + t * 16), cy - 10 + i * 12);
      ctx.stroke();
    }
  } else if (spirit === "wolf") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 28 + t * 8, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // cheetah afterimage dashes
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.35 / i;
      ctx.beginPath();
      ctx.moveTo(cx - dir * i * 14, cy - 8);
      ctx.lineTo(cx - dir * i * 14 - dir * 10, cy + 8);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y - 40, 30 + Math.sin(anim * 0.5) * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Per-pose slash arc so normals don't all read as the same jab. */
function drawAttackArc(ctx, pose, x, y, dir, t, limbs) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (pose === "upper" || pose === "tiger_upper" || pose === "pencil_upper" || pose === "soar" || pose === "upper_air") {
    // Arc sweeps upward in facing direction
    if (dir >= 0) ctx.arc(x, y - 30, 40, -Math.PI * 0.95, -Math.PI * 0.2, false);
    else ctx.arc(x, y - 30, 40, -Math.PI * 0.8, -Math.PI * 0.05, true);
  } else if (pose === "low" || pose === "wolf_sweep" || pose === "slide") {
    if (dir >= 0) ctx.arc(x, y - 8, 36, 0.15, Math.PI * 0.75, false);
    else ctx.arc(x, y - 8, 36, Math.PI * 0.25, Math.PI * 0.85, true);
  } else if (pose === "hammer") {
    if (dir >= 0) ctx.arc(x + dir * 10, y - 60, 48, -Math.PI * 0.55, Math.PI * 0.2, false);
    else ctx.arc(x + dir * 10, y - 60, 48, Math.PI * 0.8, Math.PI * 1.55, false);
  } else if (pose === "breakdance" || pose === "capoeira" || pose === "wing_slash") {
    const a0 = dir >= 0 ? t * Math.PI * 2 : Math.PI - t * Math.PI * 2;
    ctx.arc(x, y - 36, 34, a0, a0 + dir * 1.2, dir < 0);
  } else {
    ctx.moveTo(x, y - 42);
    ctx.quadraticCurveTo(x + dir * 30, y - 50, limbs.armF.x, limbs.armF.y);
  }
  ctx.stroke();
  ctx.restore();
}

function strokeJointed(ctx, ax, ay, joint, tip) {
  ctx.moveTo(ax, ay);
  if (joint) ctx.lineTo(joint.x, joint.y);
  ctx.lineTo(tip.x, tip.y);
}

function bendJoint(ax, ay, bx, by, amount, preferY = 0) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (preferY !== 0 && Math.sign(ny) !== Math.sign(preferY)) {
    nx = -nx;
    ny = -ny;
  }
  return { x: mx + nx * amount, y: my + ny * amount };
}

function finishLimbs(armF, armB, legF, legB, x, shoulderY, hipY, pose, hipX = x) {
  const idle = pose === "idle" || pose === "idle_boxer" || pose === "idle_green" || pose.startsWith("idle");
  const armBend = idle || pose === "block" || pose === "node_guard" ? 5 : 5;
  // All idle stances: straight legs (no knee bend)
  const legBend = idle
    ? 0
    : pose === "walk" || pose === "walk_back" || pose === "dodge" || pose === "backdash"
      ? 14
      : 7;
  const backBend = idle ? 0 : Math.max(3, legBend - 3);
  const straightKnee = (hx, hy, foot) => ({ x: (hx + foot.x) / 2, y: (hy + foot.y) / 2 });
  return {
    armF,
    armB,
    legF,
    legB,
    // Elbows from neck join (same point arms attach) — not mid-head
    elbowF: bendJoint(x, shoulderY, armF.x, armF.y, armBend, 1),
    elbowB: bendJoint(x, shoulderY, armB.x, armB.y, armBend * 0.85, 1),
    kneeF: idle ? straightKnee(hipX, hipY, legF) : bendJoint(hipX, hipY, legF.x, legF.y, legBend, -1),
    kneeB: idle || backBend === 0
      ? straightKnee(hipX, hipY, legB)
      : bendJoint(hipX, hipY, legB.x, legB.y, backBend, -1),
  };
}

/** Omni Node Guard — hexagonal energy shield. */
function drawNodeShield(ctx, f, x, y, dir) {
  const omni = f.blockDir === 0;
  const cx = omni ? x : x + dir * 18;
  const cy = y - 40;
  const rx = omni ? 34 : 28;
  const ry = omni ? 42 : 36;
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(f.anim * 0.25) * 0.08;
  ctx.strokeStyle = "#7eb6ff";
  ctx.fillStyle = "rgba(91,140,255,0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + Math.cos(a) * rx;
    const py = cy + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#c5d8ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.stroke();
  if (omni) {
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillStyle = "rgba(200,220,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText("NODE", cx, cy - ry - 6);
  }
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function limbPose(pose, dir, x, y, bob, active, anim, shoulderY = y - 42, atkPhase = -1, atkT = 0, hipY = y - 26, hipX = x) {
  // Arms hang from neck join — a bit shorter
  let armF = { x: x + dir * 26, y: shoulderY + 10 + bob * 0.15 };
  let armB = { x: x - dir * 24, y: shoulderY + 10 - bob * 0.15 };
  let legF = { x: x + 13, y: y };
  let legB = { x: x - 13, y: y };

  const strike = atkPhase === 1 ? 1 : atkPhase === 0 ? atkT * 0.35 : atkPhase === 2 ? 1 - atkT * 0.7 : (active ? 1 : 0.55);
  const wind = atkPhase === 0 ? atkT : 0;

  switch (pose) {
    case "idle":
      armF.x = x + dir * 26; armF.y = shoulderY + 10 + bob;
      armB.x = x - dir * 24; armB.y = shoulderY + 10 - bob * 0.5;
      legF.x = x + 10; legB.x = x - 10;
      break;
    case "idle_boxer":
      armF.x = x + dir * 24; armF.y = shoulderY + 6 + bob * 0.3;
      armB.x = x + dir * 16; armB.y = shoulderY + 12 - bob * 0.2;
      legF.x = x + dir * 12; legF.y = y;
      legB.x = x - dir * 10; legB.y = y;
      break;
    case "idle_green":
      // Both hands on rod behind; lean; both legs straight
      armF.x = x - dir * 12; armF.y = shoulderY + 12 + bob * 0.15;
      armB.x = x - dir * 18; armB.y = shoulderY + 8 + bob * 0.1;
      legF.x = hipX + dir * 14; legF.y = y;
      legB.x = hipX - dir * 12; legB.y = y;
      break;
    case "dodge":
      // Forward dash: stretch into direction of travel
      armF.x = x + dir * 30; armF.y = y - 46;
      armB.x = x - dir * 10; armB.y = y - 28;
      legF.x = x + dir * 26; legF.y = y - 2;
      legB.x = x - dir * 4; legB.y = y - 14;
      break;
    case "backdash": {
      // 后撤步 (AV): stay facing foe, lean in, hop back — tucked knees, arms for balance
      armF.x = x + dir * 24; armF.y = y - 52;
      armB.x = x - dir * 20; armB.y = y - 34;
      legF.x = hipX + dir * 6; legF.y = y - 16;
      legB.x = hipX - dir * 28; legB.y = y - 10;
      break;
    }
    case "walk": {
      // Human gait (Alan Becker: contact → down → passing → up)
      // Slow cadence; opposite arms; lift only on forward swing half
      const t = anim * 0.12;
      const stride = 14;
      const peakLift = 10;
      const foot = (phase) => {
        const s = Math.sin(phase);
        const c = Math.cos(phase);
        // In air while foot travels forward (cos > 0 when x = sin)
        const air = Math.max(0, c);
        const lift = air * air * peakLift; // soft peak mid-swing
        return {
          x: hipX + dir * stride * s,
          y: y - lift,
        };
      };
      const A = foot(t);
      const B = foot(t + Math.PI);
      legF.x = A.x; legF.y = A.y;
      legB.x = B.x; legB.y = B.y;
      // Arms counter the SAME-SIDE? No — contralateral: arm opposite leg
      // When legF (phase t) forward (sin+), armF goes back
      const as = Math.sin(t);
      armF.x = x - dir * (6 + as * 11);
      armF.y = shoulderY + 16 + as * 5;
      armB.x = x + dir * (6 + as * 11);
      armB.y = shoulderY + 16 - as * 5;
      break;
    }
    case "walk_back": {
      // Cautious back-walk: shorter stride, guard hands, same contact/lift rules
      const t = anim * 0.11;
      const stride = 11;
      const peakLift = 8;
      const foot = (phase) => {
        const s = Math.sin(phase);
        const c = Math.cos(phase);
        const air = Math.max(0, c);
        const lift = air * air * peakLift;
        // Step away from opponent: invert stride along facing
        return {
          x: hipX - dir * stride * s,
          y: y - lift,
        };
      };
      const A = foot(t);
      const B = foot(t + Math.PI);
      legF.x = A.x; legF.y = A.y;
      legB.x = B.x; legB.y = B.y;
      const as = Math.sin(t);
      armF.x = x + dir * (16 - as * 3);
      armF.y = y - 50 - as * 2;
      armB.x = x + dir * (4 + as * 3);
      armB.y = y - 44 + as * 2;
      break;
    }
    case "jump":
      armF.x = x + dir * 16; armF.y = y - 58;
      armB.x = x - dir * 14; armB.y = y - 52;
      legF.x = x + 10; legF.y = y - 10;
      legB.x = x - 12; legB.y = y - 6;
      break;
    case "glide":
      armF.x = x + 30; armF.y = y - 50;
      armB.x = x - 30; armB.y = y - 50;
      legF.x = x + 8; legF.y = y - 8;
      legB.x = x - 8; legB.y = y - 8;
      break;
    case "block":
      armF.x = x + dir * 20; armF.y = y - 54;
      armB.x = x + dir * 18; armB.y = y - 38;
      legF.x = x + dir * 10; legB.x = x - dir * 12;
      break;
    case "node_guard":
      armF.x = x + dir * 26; armF.y = y - 56;
      armB.x = x - dir * 22; armB.y = y - 50;
      legF.x = x + dir * 14; legB.x = x - dir * 14;
      break;
    case "hit":
      armF.x = x - dir * 18; armF.y = y - 50;
      armB.x = x - dir * 22; armB.y = y - 36;
      legF.x = x + 14; legB.x = x - 6;
      break;
    case "stun":
    case "grabbed":
      armF.x = x + dir * 8; armF.y = y - 70;
      armB.x = x - dir * 8; armB.y = y - 70;
      legF.x = x + 8; legB.x = x - 8;
      break;
    case "dead":
      armF.x = x + 24; armF.y = y - 20;
      armB.x = x - 24; armB.y = y - 18;
      legF.x = x + 20; legF.y = y;
      legB.x = x - 18; legB.y = y;
      break;
    case "jab":
    case "pencil_jab": {
      // Original Orange: short martial jab with pencil tip thrust
      const back = x - dir * lerp(4, 20, wind);
      const fwd = x + dir * lerp(18, 48, strike);
      armF.x = atkPhase <= 0 ? back : fwd;
      armF.y = y - lerp(32, 46, strike) - wind * 6;
      armB.x = x - dir * 12; armB.y = y - 24;
      legF.x = x + dir * lerp(6, 20, strike); legB.x = x - dir * 12;
      legF.y = y; legB.y = y - wind * 4;
      break;
    }
    case "punch":
    case "beast_fist": {
      // Red Beast Fist / Orange Drawn Punch — deep coiled windup then snap
      const coil = atkPhase === 0 ? 1 : 0;
      armF.x = atkPhase <= 0
        ? x - dir * lerp(10, 26, wind)
        : x + dir * lerp(30, 56, strike);
      armF.y = y - lerp(38, 44, strike) + coil * 8;
      armB.x = x - dir * (16 + coil * 8); armB.y = y - 30;
      legF.x = x + dir * lerp(10, 22, strike); legB.x = x - dir * 8;
      break;
    }
    case "elbow":
      // Back elbow — torso twist (AvA stick fighting posture)
      armB.x = x - dir * lerp(18, 40, strike);
      armB.y = y - lerp(36, 46, strike);
      armF.x = x + dir * 8; armF.y = y - 28;
      legB.x = x - dir * 16; legF.x = x + dir * 6;
      break;
    case "upper":
    case "tiger_upper":
    case "pencil_upper":
    case "soar": {
      // Tiger Upper / Sketch Upper — legs plant, arm rockets skyward
      const up = lerp(36, 98, strike);
      armF.x = x + dir * lerp(22, 4, strike);
      armF.y = y - up;
      armB.x = x - dir * 14; armB.y = y - lerp(24, 40, strike);
      legF.x = x + dir * 14; legF.y = y - lerp(0, 10, strike);
      legB.x = x - dir * 10; legB.y = y;
      break;
    }
    case "low":
    case "wolf_sweep":
      // Wolf Sweep — deep crouch, long sweeping lead leg (original Red kit)
      armF.x = x + dir * lerp(10, 40, strike); armF.y = y - 12;
      armB.x = x - dir * 6; armB.y = y - 18;
      legF.x = x + dir * lerp(8, 48, strike); legF.y = y;
      legB.x = x - dir * 4; legB.y = y - 22;
      break;
    case "slide":
      // Sketch Slide / Loop Slide — prone slide with leading arm
      armF.x = x + dir * 42; armF.y = y - 10;
      armB.x = x - dir * 4; armB.y = y - 16;
      legF.x = x + dir * 40; legF.y = y + 2;
      legB.x = x - dir * 2; legB.y = y - 18;
      break;
    case "rush":
      // Cheetah Rush — extreme lean + afterimage punch (fastest closer)
      armF.x = x + dir * lerp(24, 58, strike); armF.y = y - 46;
      armB.x = x + dir * 22; armB.y = y - 28;
      legF.x = x + dir * 28; legF.y = y - 4;
      legB.x = x - dir * 4; legB.y = y - 8;
      break;
    case "hammer":
      // Drawn Hammer Overhead — wiki: Orange overhead that beats normal block
      if (atkPhase === 0) {
        armF.x = x - dir * 4; armF.y = y - lerp(48, 110, atkT);
        armB.x = x + dir * 8; armB.y = y - lerp(40, 96, atkT);
      } else {
        armF.x = x + dir * 26; armF.y = y - lerp(110, 42, Math.min(1, strike));
        armB.x = x + dir * 14; armB.y = y - lerp(96, 40, Math.min(1, strike));
      }
      legF.x = x + dir * 8; legB.x = x - dir * 14;
      break;
    case "eraser":
      armF.x = x + dir * lerp(10, 46, strike); armF.y = y - 42;
      armB.x = x - dir * 10; armB.y = y - 26;
      legF.x = x + dir * 16;
      break;
    case "pencil_throw":
    case "potion_throw":
    case "code_cast":
      // Overhand throw windup (Blue potions / Orange rotating projectile / Yellow compile)
      if (atkPhase === 0) {
        armF.x = x - dir * lerp(2, 14, wind); armF.y = y - lerp(44, 72, wind);
      } else {
        armF.x = x + dir * lerp(18, 42, strike); armF.y = y - lerp(70, 48, strike);
      }
      armB.x = x - dir * 12; armB.y = y - 32;
      legF.x = x + dir * 8; legB.x = x - dir * 10;
      break;
    case "cast":
    case "rod_poke":
      // Green tipper / cast — long reach, rod line of sight (mid-range threat)
      armF.x = x + dir * lerp(20, 52, strike); armF.y = y - lerp(40, 66, strike);
      armB.x = x + dir * 4; armB.y = y - 30;
      legF.x = x + dir * 12; legB.x = x - dir * 8;
      break;
    case "rod_whip":
      armF.x = x + dir * lerp(8, 54, strike); armF.y = y - lerp(54, 24, strike);
      armB.x = x - dir * 10; armB.y = y - 30;
      break;
    case "zipline":
      // Green zipline — both hands overhead riding the line
      armF.x = x + dir * 38; armF.y = y - 78;
      armB.x = x + dir * 28; armB.y = y - 70;
      legF.x = x + 6; legF.y = y - 14;
      legB.x = x - 6; legB.y = y - 14;
      break;
    case "guitar":
      // Power Chord — guitar body in front, strum arm
      armF.x = x + dir * 12; armF.y = y - 30 + Math.sin(anim * 0.9) * 6;
      armB.x = x - dir * 6; armB.y = y - 38;
      legF.x = x + 10; legB.x = x - 10;
      break;
    case "breakdance":
    case "capoeira": {
      // Blue stylish breakdance mixup — spinning legs, free hand plant
      const spin = anim * 0.65 + strike * Math.PI;
      armF.x = x + Math.cos(spin) * 34; armF.y = y - 36 + Math.sin(spin) * 20;
      armB.x = x + Math.cos(spin + Math.PI) * 28; armB.y = y - 20;
      legF.x = x + Math.cos(spin + 1.4) * 32; legF.y = y - Math.abs(Math.sin(spin)) * 18;
      legB.x = x + Math.cos(spin + 4.0) * 32; legB.y = y - Math.abs(Math.cos(spin)) * 12;
      break;
    }
    case "portal":
    case "warp":
    case "ground_snap":
      // Teleport / portal arms up — Blue portal & Yellow warp & Purple snap
      armF.x = x + 24; armF.y = y - 64;
      armB.x = x - 24; armB.y = y - 64;
      legF.x = x + 8; legB.x = x - 8;
      break;
    case "mist":
      // Mist Bomb — crouch dump potion into cloud
      armF.x = x + dir * 10; armF.y = y - 14;
      armB.x = x - dir * 10; armB.y = y - 14;
      legF.x = x + 14; legB.x = x - 14;
      break;
    case "dive":
      // Meteor Dive — head-first, wings tucked (Purple flyer)
      armF.x = x + dir * 4; armF.y = y - 12;
      armB.x = x - dir * 4; armB.y = y - 12;
      legF.x = x + 6; legF.y = y + 10;
      legB.x = x - 6; legB.y = y + 10;
      break;
    case "wing_slash":
      armF.x = x + dir * lerp(14, 50, strike); armF.y = y - 52;
      armB.x = x - dir * 20; armB.y = y - 34;
      legF.x = x + dir * 18; legF.y = y - 14;
      break;
    case "air_kick":
      armF.x = x - dir * 12; armF.y = y - 50;
      armB.x = x - dir * 18; armB.y = y - 34;
      legF.x = x + dir * lerp(10, 44, strike); legF.y = y - 12;
      legB.x = x - 10; legB.y = y - 6;
      break;
    case "nair":
      armF.x = x + dir * 30; armF.y = y - 48;
      armB.x = x - dir * 22; armB.y = y - 42;
      legF.x = x + 16; legF.y = y - 10;
      legB.x = x - 16; legB.y = y - 10;
      break;
    case "back_air":
      armB.x = x - dir * lerp(14, 40, strike); armB.y = y - 46;
      armF.x = x + dir * 6; armF.y = y - 30;
      legB.x = x - dir * 18;
      break;
    case "upper_air":
      armF.x = x + dir * 6; armF.y = y - lerp(46, 92, strike);
      armB.x = x - dir * 14; armB.y = y - 38;
      break;
    case "stomp":
      legF.x = x + dir * 2; legF.y = y + lerp(0, 6, strike);
      legB.x = x - dir * 12; legB.y = y - 22;
      armF.y = y - 58; armB.y = y - 58;
      break;
    case "laptop_smack":
    case "popup":
      armF.x = x + dir * lerp(12, 38, strike); armF.y = y - 52;
      armB.x = x + dir * 6; armB.y = y - 34;
      break;
    case "node_crush":
    case "node_throw":
      armF.x = x + dir * 16; armF.y = y - lerp(48, 92, strike);
      armB.x = x - dir * 16; armB.y = y - lerp(48, 92, strike);
      break;
    case "counter":
      armF.x = x + dir * 26; armF.y = y - 54;
      armB.x = x + dir * 22; armB.y = y - 34;
      legF.x = x + dir * 12; legB.x = x - dir * 14;
      break;
    default:
      armF.x = x + dir * 12; armF.y = shoulderY + 11 + bob * 0.2;
      armB.x = x - dir * 12; armB.y = shoulderY + 11 - bob * 0.2;
  }
  return finishLimbs(armF, armB, legF, legB, x, shoulderY, hipY, pose, hipX);
}

function drawProps(ctx, f, pose, active, dir, x, y, headY, limbs) {
  const id = f.char.id;

  // Dark Lord data blade (AvM-style geometric shard)
  if (pose === "data_blade" || f.attack?.prop === "data_blade") {
    const bx = limbs.armF.x + dir * 8;
    const by = limbs.armF.y;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(dir * 0.35);
    const len = 54;
    const g = ctx.createLinearGradient(0, -len, 0, 8);
    g.addColorStop(0, "#e8f7ff");
    g.addColorStop(0.35, "#5ec8ff");
    g.addColorStop(0.7, "#c44dff");
    g.addColorStop(1, "#601848");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(10, -len * 0.35);
    ctx.lineTo(6, 6);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-10, -len * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Orange pencil (always) + drawn props on specials — sprites when loaded
  if (f.char.pencil) {
    const px = pose === "pencil_throw" || pose === "pencil_jab" ? limbs.armF.x : x + dir * 10;
    const py = pose === "pencil_throw" || pose === "pencil_jab" ? limbs.armF.y : y - 40;
    const ang = Math.atan2(-10, dir * 18);
    if (!drawWeaponIcon(ctx, "pencilProp", px + dir * 10, py - 6, 22, ang, dir < 0)) {
      ctx.strokeStyle = "#ffb703";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dir * 18, py - 10);
      ctx.stroke();
      ctx.fillStyle = "#e63946";
      ctx.beginPath();
      ctx.moveTo(px + dir * 18, py - 10);
      ctx.lineTo(px + dir * 24, py - 16);
      ctx.lineTo(px + dir * 20, py - 4);
      ctx.fill();
    }
  }

  if (pose === "hammer" && (id === "orange" || id === "versus")) {
    const hx = x + dir * 18;
    const hy = y - (active ? 70 : 110);
    if (!drawWeaponIcon(ctx, "hammer", hx, hy, 40, dir > 0 ? 0.4 : -0.4 - Math.PI, dir < 0)) {
      ctx.fillStyle = "#6c757d";
      ctx.fillRect(x + dir * 14, y - 115, 14, 48);
      ctx.fillStyle = "#adb5bd";
      ctx.fillRect(x + dir * 2, y - 125, 40, 16);
    }
  }

  if (pose === "eraser" && id === "orange") {
    if (!drawWeaponIcon(ctx, "eraser", limbs.armF.x, limbs.armF.y, 26, 0.2 * dir, dir < 0)) {
      ctx.fillStyle = "#ff8fab";
      ctx.fillRect(limbs.armF.x - 8, limbs.armF.y - 8, 22, 14);
    }
  }

  if (pose === "rush" && (id === "orange" || id === "red" || id === "versus") && active) {
    drawWeaponIcon(ctx, id === "red" ? "spirit" : "rush", limbs.armF.x + dir * 8, limbs.armF.y, 30, 0.5 * dir, dir < 0);
  }

  // Green fishing rod / guitar
  if (id === "green") {
    if (pose === "guitar") {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x - 8, y - 50, 22, 34);
      ctx.fillStyle = "#2bbf7a";
      ctx.fillRect(x - 4, y - 70, 8, 22);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 66); ctx.lineTo(x - 2, y - 48);
      ctx.moveTo(x + 2, y - 66); ctx.lineTo(x + 2, y - 48);
      ctx.stroke();
    } else if (pose === "idle_green") {
      // Both hands grip the rod behind the back
      const gripX = (limbs.armF.x + limbs.armB.x) / 2;
      const gripY = (limbs.armF.y + limbs.armB.y) / 2;
      const tipX = gripX - dir * 36;
      const tipY = gripY - 28;
      ctx.strokeStyle = "#8d6e4a";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(limbs.armF.x, limbs.armF.y);
      ctx.lineTo(gripX, gripY);
      ctx.lineTo(limbs.armB.x, limbs.armB.y);
      ctx.moveTo(gripX, gripY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = "#cfd8e6";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - dir * 6, tipY + 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tipX - dir * 6, tipY + 16, 4, 0, Math.PI * 1.5);
      ctx.stroke();
    } else {
      const tipX = pose === "cast" || pose === "rod_poke" || pose === "zipline"
        ? x + dir * (pose === "zipline" ? 110 : 95)
        : x + dir * 70;
      const tipY = pose === "zipline" ? y - 90 : pose === "cast" ? y - 70 : y - 55;
      ctx.strokeStyle = "#8d6e4a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(limbs.armF.x, limbs.armF.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = "#cfd8e6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + dir * 8, tipY + (active ? 40 : 18));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tipX + dir * 8, tipY + (active ? 40 : 18), 5, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  // Yellow laptop
  if (id === "yellow") {
    const lx = x - dir * 4 - 16;
    const ly = pose === "code_cast" || pose === "laptop_smack" ? limbs.armB.y - 4 : y - 40;
    ctx.fillStyle = "#1a222c";
    ctx.fillRect(lx, ly, 32, 20);
    ctx.strokeStyle = "#f0c419";
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, ly, 32, 20);
    ctx.fillStyle = "#3a86ff";
    ctx.fillRect(lx + 4, ly + 4, 24, 10);
    if (pose === "code_cast" && active) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "10px 'Share Tech Mono'";
      ctx.fillText("</>", lx + 6, ly - 4);
    }
  }

  // Blue potion in hand when throwing / idle brew pose
  if (id === "blue" && (pose === "potion_throw" || pose === "idle" || pose === "mist")) {
    const bx = pose === "potion_throw" ? limbs.armF.x : x + dir * 14;
    const by = pose === "potion_throw" ? limbs.armF.y : y - 36;
    ctx.fillStyle = pose === "mist" ? "#90e0ef" : "#7b2cbf";
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#caf0f8";
    ctx.fillRect(bx - 3, by - 12, 6, 7);
  }
}

function drawFighter(ctx, f) {
  drawStickFigure(ctx, f);
}

function drawHookBeam(ctx, h) {
  ctx.save();
  const ox = h.originX ?? h.x - h.facing * 40;
  const oy = h.originY ?? h.y;
  ctx.strokeStyle = "#2bbf7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Jagged lightning from hand to tip
  const segs = 6;
  ctx.moveTo(ox, oy);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const px = ox + (h.x - ox) * t;
    const py = oy + (h.y - oy) * t + (i % 2 === 0 ? -6 : 6) * (i < segs ? 1 : 0);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,255,220,0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(h.x, h.y);
  ctx.stroke();
  ctx.fillStyle = "#e8eef6";
  ctx.beginPath();
  ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHazard(ctx, h) {
  if (h.type !== "data_pillar" || h.h <= 4) return;
  const x = h.x;
  const top = h.y - h.h;
  ctx.save();
  // AVM-like data shard column: cyan edge + magenta core
  const g = ctx.createLinearGradient(x, top, x, h.y);
  g.addColorStop(0, "rgba(180,80,255,0.85)");
  g.addColorStop(0.45, "rgba(80,220,255,0.9)");
  g.addColorStop(1, "rgba(40,100,180,0.7)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - h.w / 2, h.y);
  ctx.lineTo(x - h.w / 2 + 4, top + 8);
  ctx.lineTo(x, top);
  ctx.lineTo(x + h.w / 2 - 4, top + 8);
  ctx.lineTo(x + h.w / 2, h.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(220,240,255,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,80,180,0.5)";
  ctx.beginPath();
  ctx.moveTo(x, top + 6);
  ctx.lineTo(x, h.y - 4);
  ctx.stroke();
  ctx.restore();
}

/** Campaign heal pickup — green cross. */
function drawPickup(ctx, p, t) {
  const bob = Math.sin((p.bob || 0) * 0.12) * 4;
  const x = p.x;
  const y = p.y + bob;
  ctx.save();
  ctx.globalAlpha = 0.85 + Math.sin(t * 0.15) * 0.1;
  if (p.type === "heal") {
    ctx.fillStyle = "rgba(40, 120, 70, 0.55)";
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3dd68c";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#6dffb0";
    ctx.fillRect(x - 3, y - 9, 6, 18);
    ctx.fillRect(x - 9, y - 3, 18, 6);
    ctx.strokeStyle = "#0a2014";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 3, y - 9, 6, 18);
    ctx.strokeRect(x - 9, y - 3, 18, 6);
  }
  ctx.restore();
}

function drawProjectile(ctx, p) {
  if (p.delay > 0) {
    ctx.fillStyle = "rgba(255,209,102,0.4)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.save();
  if (p.type === "anvil") {
    if (!drawWeaponIcon(ctx, "anvil", p.x, p.y, 36, 0.2)) {
      ctx.fillStyle = "#6c757d";
      ctx.fillRect(p.x - 18, p.y - 14, 36, 28);
      ctx.fillStyle = "#adb5bd";
      ctx.fillRect(p.x - 12, p.y - 22, 24, 10);
    }
  } else if (p.type === "rocket") {
    if (!drawWeaponIcon(ctx, "rocket", p.x, p.y, 32, p.facing < 0 ? Math.PI : 0, p.facing < 0)) {
      ctx.fillStyle = "#e63946";
      ctx.beginPath();
      ctx.moveTo(p.x + p.facing * 16, p.y);
      ctx.lineTo(p.x - p.facing * 12, p.y - 8);
      ctx.lineTo(p.x - p.facing * 12, p.y + 8);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(p.x - p.facing * 14, p.y - 4, 8, 8);
    }
  } else if (p.type === "shuriken") {
    if (!drawWeaponIcon(ctx, "shuriken", p.x, p.y, 26, p.life * 0.4)) {
      ctx.strokeStyle = "#ff7a2f";
      ctx.lineWidth = 3;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(0, 10);
      ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
      ctx.moveTo(-7, -7); ctx.lineTo(7, 7);
      ctx.moveTo(-7, 7); ctx.lineTo(7, -7);
      ctx.stroke();
    }
  } else if (p.type === "potion") {
    ctx.fillStyle = "#7b2cbf";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#caf0f8";
    ctx.fillRect(p.x - 3, p.y - 14, 6, 8);
  } else if (p.type === "code") {
    ctx.fillStyle = "#f0c419";
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillText("</>", p.x - 12, p.y + 4);
  } else {
    ctx.fillStyle = "#ff7a2f";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFx(ctx, f) {
  ctx.save();
  const lifeMax = f.lifeMax || 20;
  const facing = f.facing ?? 1;
  if (f.type === "hit") {
    const kind = f.crit ? "crit" : f.big ? "big" : "hit";
    if (!drawImpact(ctx, kind, f.x, f.y, f.life, lifeMax, f.big ? 2.2 : 1.5, facing)) {
      ctx.strokeStyle = f.big ? "#ffd166" : "#fff";
      ctx.lineWidth = f.big ? 4 : 2;
      const r = (20 - f.life) * (f.big ? 2.2 : 1.4);
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (f.type === "block") {
    if (!drawImpact(ctx, "block", f.x, f.y, f.life, lifeMax, 1.4, facing)) {
      ctx.strokeStyle = "#5b8cff";
      ctx.lineWidth = 3;
      ctx.strokeRect(f.x - 16, f.y - 16, 32, 32);
    }
  } else if (f.type === "jump") {
    if (!drawImpact(ctx, "jump", f.x, f.y, f.life, lifeMax, 1.1, facing)) {
      ctx.fillStyle = "rgba(200,220,255,0.35)";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === "node") {
    if (!drawImpact(ctx, "node", f.x, f.y, f.life, lifeMax, 1.3, facing)) {
      ctx.fillStyle = "#5b8cff";
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 12);
      ctx.lineTo(f.x + 12, f.y);
      ctx.lineTo(f.x, f.y + 12);
      ctx.lineTo(f.x - 12, f.y);
      ctx.closePath();
      ctx.fill();
    }
  } else if (f.type === "portal") {
    ctx.strokeStyle = "#9b5de5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 16, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawImpact(ctx, "special", f.x, f.y, f.life, lifeMax, 1.2, facing);
  } else if (f.type === "mist") {
    ctx.fillStyle = "rgba(100,160,255,0.25)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 40, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.type === "hook") {
    if (!drawImpact(ctx, "hook", f.x, f.y, f.life, lifeMax, 1.2, facing)) {
      ctx.strokeStyle = "#2bbf7a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 12 + (20 - f.life), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (f.type === "dmg") {
    const t = 1 - f.life / 48;
    const alpha = t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = f.big ? "18px 'Press Start 2P'" : "14px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = f.big ? "#ffd166" : "#fff";
    const label = f.text ?? "";
    ctx.strokeText(label, f.x, f.y);
    ctx.fillText(label, f.x, f.y);
  } else if (f.type === "ko") {
    drawImpact(ctx, "ko", f.x, f.y + 20, f.life, lifeMax, 2.4, facing);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillStyle = "#ff4d6d";
    ctx.textAlign = "center";
    ctx.fillText("KO", f.x, f.y);
  } else if (f.type === "slash") {
    if (!drawImpact(ctx, "slash", f.x, f.y, f.life, lifeMax, 1.8, facing)) {
      // Fallback motion streaks aligned to move/attack dir
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const oy = (i - 1) * 8;
        ctx.beginPath();
        ctx.moveTo(f.x - facing * (8 + i * 10), f.y + oy);
        ctx.lineTo(f.x + facing * (18 - i * 4), f.y + oy - 2);
        ctx.stroke();
      }
    }
  } else if (f.type === "ghost") {
    drawGhostStick(ctx, f);
  }
  ctx.restore();
}

function drawGhostStick(ctx, g) {
  const alpha = Math.max(0.08, g.life / (g.lifeMax || 12) * 0.45);
  const dir = g.facing || 1;
  const move = g.moveDir || dir;
  const x = g.x;
  const y = g.y;
  const c = g.color || "#fff";
  const pose = g.pose === "backdash" ? "backdash" : "dodge";
  const headY = y - 58;
  const headR = 14;
  const hollow = !!g.hollowHead;
  const headStroke = hollow ? 4 : 2;
  const visR = headR + headStroke * 0.5;
  const joinY = headY + visR;
  const hipY = y - 26;
  const limbs = limbPose(pose, dir, x, y, 0, false, 0, joinY, -1, 0, hipY, x);
  ctx.save();
  ctx.globalAlpha = alpha;
  // Speed lines trail opposite of travel
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.globalAlpha = alpha * 0.7;
  for (let i = 0; i < 3; i++) {
    const oy = -28 - i * 10;
    const len = 10 + i * 8;
    ctx.beginPath();
    ctx.moveTo(x - move * (14 + i * 6), y + oy);
    ctx.lineTo(x - move * (14 + i * 6 + len), y + oy);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "butt";
  ctx.strokeStyle = c;
  ctx.beginPath();
  ctx.moveTo(x, joinY);
  ctx.lineTo(x, hipY);
  ctx.moveTo(x + dir * 2.5, joinY);
  ctx.lineTo(limbs.armF.x, limbs.armF.y);
  ctx.moveTo(x - dir * 2.5, joinY);
  ctx.lineTo(limbs.armB.x, limbs.armB.y);
  ctx.moveTo(x, hipY);
  ctx.lineTo(limbs.legF.x, limbs.legF.y);
  ctx.moveTo(x, hipY);
  ctx.lineTo(limbs.legB.x, limbs.legB.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  if (hollow) {
    ctx.fillStyle = "#0e141c";
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = headStroke;
    ctx.stroke();
  } else {
    ctx.fillStyle = c;
    ctx.fill();
  }
  if (g.headband) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, headY, 13, -2.4, -0.2);
    ctx.stroke();
  }
  if (g.wings) {
    ctx.strokeStyle = "rgba(197,202,211,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, joinY);
    ctx.quadraticCurveTo(x - 36, y - 70, x - 40, y - 38);
    ctx.moveTo(x, joinY);
    ctx.quadraticCurveTo(x + 36, y - 70, x + 40, y - 38);
    ctx.stroke();
  }
  ctx.restore();
}

export function syncHud(match) {
  const hud = document.getElementById("hud");
  if (!hud) return;
  if (match.hideHud) {
    hud.classList.add("hidden");
    return;
  }
  hud.classList.remove("hidden");
  document.getElementById("p1-name").textContent = match.p1.char.name;
  document.getElementById("p2-name").textContent = match.p2.char.name;
  document.getElementById("p1-hp").style.width = `${(match.p1.hp / match.p1.maxHp) * 100}%`;
  document.getElementById("p2-hp").style.width = `${(match.p2.hp / match.p2.maxHp) * 100}%`;
  const s1 = Math.max(0, Math.min(100, (match.p1.stamina / (match.p1.maxStamina || 100)) * 100));
  const s2 = Math.max(0, Math.min(100, (match.p2.stamina / (match.p2.maxStamina || 100)) * 100));
  const p1s = document.getElementById("p1-stam");
  const p2s = document.getElementById("p2-stam");
  if (p1s) {
    p1s.style.width = `${s1}%`;
    p1s.classList.toggle("low", s1 < 28);
  }
  if (p2s) {
    p2s.style.width = `${s2}%`;
    p2s.classList.toggle("low", s2 < 28);
  }
  const k1 = Math.max(0, Math.min(100, (match.p1.skill / (match.p1.maxSkill || 100)) * 100));
  const k2 = Math.max(0, Math.min(100, (match.p2.skill / (match.p2.maxSkill || 100)) * 100));
  const p1k = document.getElementById("p1-skill");
  const p2k = document.getElementById("p2-skill");
  if (p1k) {
    p1k.style.width = `${k1}%`;
    p1k.classList.toggle("low", k1 < 22);
  }
  if (p2k) {
    p2k.style.width = `${k2}%`;
    p2k.classList.toggle("low", k2 < 22);
  }
  if (match.isCampaign) {
    const alive = (match.enemies || []).filter((e) => e.alive && e.state !== "dead").length;
    const left = alive + (match.enemyQueue?.length || 0);
    document.getElementById("files-display").textContent = `${left}`;
    document.getElementById("area-name").textContent = match.campaignLabel || match.area.name;
  } else {
    document.getElementById("files-display").textContent = `${match.files[0]} — ${match.files[1]}`;
    document.getElementById("area-name").textContent = match.area.name;
  }
  document.getElementById("timer").textContent = String(match.timer).padStart(2, "0");
  renderNodes("p1-nodes", match.p1);
  renderNodes("p2-nodes", match.p2);

  if (match.p1.danger || match.p1.state === "downed") {
    document.getElementById("p1-hp").style.background = "linear-gradient(180deg,#ff8fab,#ff4d6d 55%,#a01030)";
  } else {
    document.getElementById("p1-hp").style.background = "linear-gradient(180deg, #6dffb0, #3dd68c 55%, #1f9a5c)";
  }
  if (match.p2.danger) {
    document.getElementById("p2-hp").style.background = "linear-gradient(180deg,#ff8fab,#ff4d6d 55%,#a01030)";
  } else {
    document.getElementById("p2-hp").style.background = "linear-gradient(180deg, #6dffb0, #3dd68c 55%, #1f9a5c)";
  }

  const bossHud = document.getElementById("boss-hud");
  if (bossHud) {
    const boss = match.enemies?.find((e) => e.colossalBoss && e.alive) || (match.bossHud && match.p2);
    if (boss && boss.colossalBoss && match.phase !== "matchover") {
      bossHud.classList.remove("hidden");
      bossHud.classList.toggle("rage", !!boss.raged);
      const nameEl = document.getElementById("boss-name");
      nameEl.textContent = boss.raged ? `${boss.char.name} · 狂暴` : boss.char.name;
      const pct = (boss.hp / boss.maxHp) * 100;
      document.getElementById("boss-hp").style.width = `${pct}%`;
      const mark = document.getElementById("boss-hp-mark");
      if (mark) mark.style.left = "50%";
    } else {
      bossHud.classList.add("hidden");
      bossHud.classList.remove("rage");
    }
  }
}

function renderNodes(id, f) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  for (let i = 0; i < f.maxNodes; i++) {
    const n = document.createElement("div");
    n.className = "node" + (i >= f.nodes ? " cracked" : "");
    el.appendChild(n);
  }
}

export function hideHud() {
  document.getElementById("hud")?.classList.add("hidden");
  document.getElementById("boss-hud")?.classList.add("hidden");
}
