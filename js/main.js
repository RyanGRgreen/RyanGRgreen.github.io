import { Input, BIND_P1, BIND_P2, BIND_ACTIONS_P1, BIND_ACTIONS_P2, formatBindCode, loadBinds, resetBinds } from "./input.js?v=79";
import { CHARACTERS, CHARACTER_ORDER } from "./characters.js?v=79";
import { STAGES, STAGE_ORDER } from "./stages.js?v=79";
import { Match } from "./match.js?v=79";
import { drawMatch, syncHud, hideHud, drawStickFigure } from "./render.js?v=79";
import { Tutorial } from "./tutorial.js?v=79";
import { StoryMode, STORY_DISCLAIMER, STORY_SPEAKER_COLOR } from "./story.js?v=79";
import { CampaignMode } from "./campaign.js?v=79";
import { loadAssets } from "./assets.js?v=79";
import {
  STORY_UPGRADE_DEFS,
  loadCampaignUpgrades,
  tryBuyCampaignUpgrade,
  resetCampaignUpgrades,
  maxAllCampaignUpgrades,
  awardCampaignLevelClear,
  canUseCampaignUpgrades,
  previewCampaignStats,
} from "./storyUpgrades.js?v=79";
import {
  ensureSeedAccounts,
  loginWithInvite,
  registerAccount,
  changePassword,
  logout,
  isLoggedIn,
  mustChangePasswordNow,
  accountDisplayName,
  getCurrentAccount,
  isTesterAccount,
  syncAccountsWithCloud,
  accountCloudIo,
} from "./accounts.js?v=79";
import {
  cloudQueueLength,
  getCloudStatus,
  resolveCloudTarget,
  pushAccountsToCloud,
  syncAccountsFromCloud,
} from "./cloudSync.js?v=79";
import {
  loadAudio,
  unlockAudio,
  playEvent,
  playSfx,
  toggleMute,
  isMuted,
  setMuteListener,
} from "./audio.js?v=79";
import {
  probeLobbyMusic,
  getLobbyTracks,
  getMusicIndex,
  getCurrentTrack,
  moveLobbyTrack,
  playLobbyMusic,
  stopLobbyMusic,
  toggleLobbyMusic,
  importLobbyFiles,
  deleteCurrentImportedTrack,
  trackHasLocal,
  isLobbyMusicPlaying,
  lobbyMusicStatusLine,
  openTrackOnBilibili,
} from "./music.js?v=79";
import { OnlineSession, applyMatchState, emptyInput } from "./online.js?v=79";
import {
  initTouch,
  maybeAskTouchOnBoot,
  isTouchCapable,
  getControlMode,
  setControlMode,
  updateTouchForScreen,
  setTouchEditMode,
  isTouchEditMode,
  resetTouchLayout,
  showControlPrompt,
  isControlPromptVisible,
} from "./touch.js?v=79";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const input = new Input();

/** Touch title: one-shot tap → enter (consumed by handleMenus). */
let pendingTitleTap = false;

function consumeTitleTap() {
  if (!pendingTitleTap) return false;
  pendingTitleTap = false;
  return true;
}

function touchTitleEnter() {
  if (getControlMode() !== "touch") {
    pendingTitleTap = false;
    return false;
  }
  if (state.confirmLock > 0) {
    pendingTitleTap = false;
    return false;
  }
  return consumeTitleTap();
}

const MODES = ["tutorial", "story", "campaign", "cpu", "versus", "online"];

const state = {
  screen: "title", // + onlineLobby, onlineHost, onlineJoin, onlineChars, onlineStage
  mode: "tutorial",
  modeIndex: 0,
  p1: 0,
  p2: 1,
  stage: 0,
  match: null,
  tutorial: null,
  story: null,
  campaign: null,
  online: null,
  onlineRole: null,
  onlineLobbySel: 0,
  onlineJoinCode: "",
  onlineJoinEditing: false,
  onlineStatusLine: "",
  onlineHostReady: false,
  onlineGuestReady: false,
  onlineBusy: false,
  teammateCount: 1,
  storyUpgradeSel: 0,
  storyUpgradeFlash: "",
  upgradeReturnTo: null, // null | "campaign"
  settingsTab: 0, // 0 P1 · 1 P2 · 2 touch · 3 account
  settingsSel: 0,
  settingsFlash: "",
  touchEditHint: false,
  passwordReturnTo: "title",
  authBusy: false,
  logoutConfirm: false,
  titleLeft: "orange",
  titleRight: "red",
  titleCharTimer: 0,
  menuFlash: 0,
  titleAnim: 0,
  confirmLock: 0,
  assetsReady: false,
  musicHint: "",
};

const LOBBY_SCREENS = new Set([
  "title",
  "mode",
  "chars",
  "stage",
  "campmates",
  "howto",
  "music",
  "storyUpgrades",
  "settings",
  "onlineLobby",
  "onlineHost",
  "onlineJoin",
  "onlineChars",
  "onlineStage",
]);

function syncLobbyMusic() {
  if (!LOBBY_SCREENS.has(state.screen)) {
    stopLobbyMusic();
    return;
  }
  playLobbyMusic({ muted: isMuted() });
}

setMuteListener(() => {
  syncLobbyMusic();
});

window.__stickVersus = state;

function onGameEvent(type, data) {
  playEvent(type, data);
}

function wrapTutorialEvent(tut) {
  const prev = tut.onEvent.bind(tut);
  tut.onEvent = (type, data, learnerSide) => {
    onGameEvent(type, data);
    return prev(type, data, learnerSide);
  };
}

function loop() {
  input.midFrame();
  state.titleAnim += 1;
  state.menuFlash += 1;

  if (state.screen === "title") {
    state.titleCharTimer += 1;
    // Swap showcase pair every ~5s while idle on title
    if (state.titleCharTimer >= 300) pickTitleChars();
  }

  if (input.pressed("Minus") || input.pressed("NumpadSubtract")) {
    toggleMute();
  }

  if (!state.assetsReady) {
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#8b9bb0";
    ctx.font = "14px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("LOADING ASSETS…", W / 2, H / 2);
    requestAnimationFrame(loop);
    return;
  }

  if (state.screen === "tutorial" && state.tutorial) {
    const i1 = input.read(BIND_P1);
    const i2 = input.read(BIND_P2);
    state.tutorial.update(i1, i2, input);
    if (state.tutorial.match) syncHud(state.tutorial.match);
    else hideHud();
    if (state.tutorial.done) {
      exitPlayToTitle();
    }
  } else if (state.screen === "story" && state.story) {
    tickStory();
  } else if (state.screen === "campaign" && state.campaign) {
    tickCampaign();
  } else if (state.screen === "fight" && state.match) {
    if (state.mode === "online" && state.online) {
      tickOnlineFight();
    } else {
      const i1 = input.read(BIND_P1);
      const i2 = input.read(BIND_P2);
      // Note: do NOT quit fight on Escape — many layouts remap Left Shift → Escape
      if (state.match.phase === "matchover" && i1.start) {
        exitPlayToTitle();
      } else {
        state.match.update(i1, i2);
        syncHud(state.match);
      }
    }
  } else {
    handleMenus();
  }

  draw();
  updateTouchForScreen(state.screen);
  input.endFrame();
  requestAnimationFrame(loop);
}

function confirmPressed(i) {
  if (state.confirmLock > 0) return false;
  // Fight maps Up (W) as jump — never treat direction keys as menu confirm.
  // Allow attack / start / dedicated jump key only (default Space).
  const jumpKey = BIND_P1.jump && input.pressed(BIND_P1.jump);
  if (i.attack || i.start || jumpKey) {
    state.confirmLock = 20;
    return true;
  }
  return false;
}

/** Two distinct random characters for the title showcase. */
function pickTitleChars() {
  const n = CHARACTER_ORDER.length;
  let left = Math.floor(Math.random() * n);
  let right = Math.floor(Math.random() * (n - 1));
  if (right >= left) right += 1;
  state.titleLeft = CHARACTER_ORDER[left];
  state.titleRight = CHARACTER_ORDER[right];
  state.titleCharTimer = 0;
}

function goToTitle({ syncMusic = true } = {}) {
  pickTitleChars();
  state.screen = "title";
  state.logoutConfirm = false;
  if (syncMusic) syncLobbyMusic();
}

function openCampaignUpgrades({ fromCampaign = false } = {}) {
  state.upgradeReturnTo = fromCampaign ? "campaign" : null;
  state.storyUpgradeSel = 0;
  state.storyUpgradeFlash = "";
  state.screen = "storyUpgrades";
  state.confirmLock = 18;
  hideHud();
  syncLobbyMusic();
}

function startStory() {
  stopLobbyMusic();
  state.story = new StoryMode();
  state.story.beginBeat();
  state.screen = "story";
  state.confirmLock = 25;
  hideHud();
}

function startCampaign() {
  stopLobbyMusic();
  const canUpgrade = canUseCampaignUpgrades();
  state.campaign = new CampaignMode({
    playerId: CHARACTER_ORDER[state.p1],
    teammateCount: state.teammateCount,
    onEvent: onGameEvent,
    canUpgrade,
  });
  if (canUpgrade) {
    state.campaign.playerUpgrades = loadCampaignUpgrades();
  }
  state.campaign.beginLevel();
  state.screen = "campaign";
  state.confirmLock = 25;
  hideHud();
}

function tickCampaign() {
  const camp = state.campaign;
  const i1 = input.read(BIND_P1);
  if (state.confirmLock > 0) state.confirmLock -= 1;

  if (isTesterAccount() && state.confirmLock <= 0) {
    if (input.pressed("BracketRight") || input.pressed("KeyN")) {
      playSfx("ui_ok");
      camp.cheatSkipForward();
      state.confirmLock = 12;
    } else if (input.pressed("BracketLeft")) {
      playSfx("ui_move");
      camp.cheatSkipBack();
      state.confirmLock = 12;
    }
  }

  if (camp.phase === "fight" && camp.match) {
    if (camp.match.phase === "matchover") {
      const winner = camp.match.winner;
      if (winner === 0 && canUseCampaignUpgrades()) {
        const key = `${camp.chapterIndex}-${camp.levelIndex}`;
        const { gained } = awardCampaignLevelClear(
          loadCampaignUpgrades(),
          key,
          !!camp.level?.boss
        );
        camp.lastUpgradeGain = gained;
        if (gained > 0) state.storyUpgradeFlash = `关卡升级 +${gained}`;
      } else {
        camp.lastUpgradeGain = 0;
      }
      camp.onMatchOver(winner);
      hideHud();
      state.confirmLock = 25;
    } else {
      camp.match.update(i1, input.read(BIND_P2));
      syncHud(camp.match);
    }
    return;
  }

  // Mid-run upgrade panel (brief / clear)
  if (
    camp.canUpgrade &&
    state.confirmLock <= 0 &&
    (camp.phase === "brief" || camp.phase === "clear") &&
    (i1.special || input.pressed("KeyU"))
  ) {
    playSfx("ui_ok");
    openCampaignUpgrades({ fromCampaign: true });
    state.confirmLock = 16;
    return;
  }

  const confirm = state.confirmLock <= 0 && (i1.attack || i1.start || i1.jump);
  if (confirm) state.confirmLock = 18;
  camp.update(confirm, input.backPressed());

  const pending = camp.consumePendingFight();
  if (pending) {
    if (camp.canUpgrade) {
      camp.playerUpgrades = loadCampaignUpgrades();
      pending.campaign = { ...pending.campaign, playerUpgrades: camp.playerUpgrades };
    }
    camp.match = new Match(pending);
  }

  if (camp.done) {
    exitPlayToTitle();
  }
}

function tickStory() {
  const story = state.story;
  const i1 = input.read(BIND_P1);
  if (state.confirmLock > 0) state.confirmLock -= 1;

  // Tester: ] / N skip forward · [ back
  if (isTesterAccount() && state.confirmLock <= 0) {
    if (input.pressed("BracketRight") || input.pressed("KeyN")) {
      playSfx("ui_ok");
      story.cheatSkipForward();
      state.confirmLock = 12;
      state.storyUpgradeFlash = "TEST SKIP →";
    } else if (input.pressed("BracketLeft")) {
      playSfx("ui_move");
      story.cheatSkipBack();
      state.confirmLock = 12;
      state.storyUpgradeFlash = "TEST SKIP ←";
    }
  }

  if (story.phase === "fight" && story.match) {
    if (story.match.phase === "matchover") {
      story.onMatchOver(story.match.winner);
      hideHud();
      state.confirmLock = 25;
    } else {
      story.match.update(i1, input.read(BIND_P2));
      syncHud(story.match);
    }
    return;
  }

  const confirm = state.confirmLock <= 0 && (i1.attack || i1.start || i1.jump);
  if (confirm) state.confirmLock = 18;
  story.update(confirm, input.backPressed());

  // After dialogue advances into a fight, spawn match same frame
  const pending = story.consumePendingFight();
  if (pending) {
    story.match = new Match({
      p1Id: "orange",
      p2Id: pending.foe,
      stageId: pending.stageId,
      vsCpu: true,
      solo: true,
      need: 1,
      areaIndex: pending.areaIndex,
      story: true,
      storyBoss: !!pending.boss,
      onEvent: onGameEvent,
    });
  }

  if (story.done) {
    exitPlayToTitle();
  }
}

function handleMenus() {
  if (authPanelVisible()) return;
  const i = input.read(BIND_P1);
  if (state.confirmLock > 0) state.confirmLock -= 1;

  if (state.screen === "title") {
    if (state.logoutConfirm) {
      if (state.confirmLock <= 0 && (confirmPressed(i) || touchTitleEnter())) {
        playSfx("ui_back");
        state.logoutConfirm = false;
        doLogout();
        return;
      }
      if (input.backPressed() || input.pressed("KeyN") || input.pressed("KeyL")) {
        playSfx("ui_move");
        state.logoutConfirm = false;
        state.confirmLock = 12;
        return;
      }
      return;
    }
    if (input.pressed("KeyM")) {
      unlockAudio();
      playSfx("ui_ok");
      state.screen = "music";
      state.musicHint = "";
      state.confirmLock = 15;
      syncLobbyMusic();
      return;
    }
    if (input.pressed("KeyL")) {
      playSfx("ui_move");
      state.logoutConfirm = true;
      state.confirmLock = 12;
      return;
    }
    if (input.pressed("KeyO")) {
      unlockAudio();
      playSfx("ui_ok");
      openSettings();
      return;
    }
    if (confirmPressed(i) || touchTitleEnter()) {
      unlockAudio();
      playSfx("ui_ok");
      state.screen = "mode";
      state.confirmLock = 18;
      syncLobbyMusic();
    }
  } else if (state.screen === "music") {
    handleMusicMenu(i);
  } else if (state.screen === "mode") {
    if (input.pressed(BIND_P1.up)) {
      state.modeIndex = (state.modeIndex + MODES.length - 1) % MODES.length;
      playSfx("ui_move");
    }
    if (input.pressed(BIND_P1.down)) {
      state.modeIndex = (state.modeIndex + 1) % MODES.length;
      playSfx("ui_move");
    }
    state.mode = MODES[state.modeIndex];
    if (confirmPressed(i)) {
      unlockAudio();
      playSfx("ui_ok");
      if (state.mode === "tutorial") startTutorial();
      else if (state.mode === "story") startStory();
      else if (state.mode === "campaign") state.screen = "chars";
      else if (state.mode === "online") openOnlineLobby();
      else state.screen = "chars";
    }
    if (input.backPressed()) {
      playSfx("ui_back");
      goToTitle();
    }
  } else if (state.screen === "storyUpgrades") {
    handleStoryUpgradesMenu(i);
  } else if (state.screen === "settings") {
    handleSettingsMenu(i);
  } else if (state.screen === "chars") {
    let moved = false;
    if (input.pressed(BIND_P1.left)) {
      state.p1 = (state.p1 + CHARACTER_ORDER.length - 1) % CHARACTER_ORDER.length;
      moved = true;
    }
    if (input.pressed(BIND_P1.right)) {
      state.p1 = (state.p1 + 1) % CHARACTER_ORDER.length;
      moved = true;
    }
    if (state.mode === "versus") {
      if (input.pressed(BIND_P2.left)) {
        state.p2 = (state.p2 + CHARACTER_ORDER.length - 1) % CHARACTER_ORDER.length;
        moved = true;
      }
      if (input.pressed(BIND_P2.right)) {
        state.p2 = (state.p2 + 1) % CHARACTER_ORDER.length;
        moved = true;
      }
    } else if (state.menuFlash % 90 === 0) {
      state.p2 = (state.p2 + 1) % CHARACTER_ORDER.length;
      if (state.p2 === state.p1) state.p2 = (state.p2 + 1) % CHARACTER_ORDER.length;
    }
    if (moved) playSfx("ui_move");
    if (confirmPressed(i)) {
      playSfx("ui_ok");
      if (state.mode === "campaign") state.screen = "campmates";
      else state.screen = "stage";
    }
    if (input.backPressed()) {
      playSfx("ui_back");
      state.screen = "mode";
    }
  } else if (state.screen === "campmates") {
    if (input.pressed(BIND_P1.left) || input.pressed(BIND_P1.up)) {
      state.teammateCount = (state.teammateCount + 2) % 3;
      playSfx("ui_move");
    }
    if (input.pressed(BIND_P1.right) || input.pressed(BIND_P1.down)) {
      state.teammateCount = (state.teammateCount + 1) % 3;
      playSfx("ui_move");
    }
    if (confirmPressed(i)) {
      playSfx("ui_ok");
      if (canUseCampaignUpgrades()) openCampaignUpgrades();
      else startCampaign();
    }
    if (input.backPressed()) {
      playSfx("ui_back");
      state.screen = "chars";
    }
  } else if (state.screen === "stage") {
    let moved = false;
    if (input.pressed(BIND_P1.left)) {
      state.stage = (state.stage + STAGE_ORDER.length - 1) % STAGE_ORDER.length;
      moved = true;
    }
    if (input.pressed(BIND_P1.right)) {
      state.stage = (state.stage + 1) % STAGE_ORDER.length;
      moved = true;
    }
    if (moved) playSfx("ui_move");
    if (confirmPressed(i)) {
      playSfx("ui_ok");
      startMatch();
    }
    if (input.backPressed()) {
      playSfx("ui_back");
      state.screen = "chars";
    }
  } else if (state.screen === "onlineLobby") {
    handleOnlineLobby(i);
  } else if (state.screen === "onlineHost") {
    handleOnlineHost(i);
  } else if (state.screen === "onlineJoin") {
    handleOnlineJoin(i);
  } else if (state.screen === "onlineChars") {
    handleOnlineChars(i);
  } else if (state.screen === "onlineStage") {
    handleOnlineStage(i);
  } else if (state.screen === "howto") {
    if (confirmPressed(i) || input.backPressed()) {
      playSfx("ui_back");
      goToTitle();
    }
  }

  if (state.screen === "title" && !state.logoutConfirm && input.pressed("KeyH")) {
    playSfx("ui_ok");
    state.screen = "howto";
  }
  if (state.screen === "title" && !state.logoutConfirm && input.pressed("KeyT")) {
    unlockAudio();
    playSfx("ui_ok");
    startTutorial();
  }
}

async function handleMusicMenu(i) {
  if (input.pressed(BIND_P1.up) || input.pressed(BIND_P1.left)) {
    moveLobbyTrack(-1);
    playSfx("ui_move");
    state.musicHint = "";
    syncLobbyMusic();
  }
  if (input.pressed(BIND_P1.down) || input.pressed(BIND_P1.right)) {
    moveLobbyTrack(1);
    playSfx("ui_move");
    state.musicHint = "";
    syncLobbyMusic();
  }
  if (input.pressed("KeyB")) {
    const track = getCurrentTrack();
    if (track?.url) {
      playSfx("ui_ok");
      openTrackOnBilibili(track);
      state.musicHint = "已在浏览器打开 B站来源页";
    } else {
      playSfx("ui_back");
      state.musicHint = "当前曲目无 B站链接";
    }
  }
  if (input.pressed("KeyF") || input.pressed("KeyI")) {
    unlockAudio();
    playSfx("ui_ok");
    const n = await importLobbyFiles();
    if (n > 0) {
      state.musicHint = `已导入 ${n} 首，可直接播放`;
      playLobbyMusic({ muted: isMuted() });
    } else {
      state.musicHint = "未选择文件";
    }
  }
  if (input.pressed("KeyX") || input.pressed("Delete") || input.pressed("Backspace")) {
    const track = getCurrentTrack();
    if (track?.imported) {
      playSfx("ui_back");
      await deleteCurrentImportedTrack();
      state.musicHint = "已删除导入曲目";
      syncLobbyMusic();
    }
  }
  if (input.pressed("KeyP") || input.pressed("Space")) {
    unlockAudio();
    const r = toggleLobbyMusic({ muted: isMuted() });
    playSfx("ui_ok");
    if (r === "need_file") state.musicHint = "此曲尚未导入 — 按 F 选择音频文件";
    else if (r === "muted") state.musicHint = "已静音 [-] 可取消";
    else if (r === "paused") state.musicHint = "已暂停";
    else if (r === "playing") state.musicHint = "播放中";
    else state.musicHint = "";
  }
  if (confirmPressed(i)) {
    unlockAudio();
    playSfx("ui_ok");
    const track = getCurrentTrack();
    if (track?.missing || (track && !trackHasLocal(track) && track.id !== "off")) {
      const n = await importLobbyFiles();
      state.musicHint = n > 0 ? `已导入 ${n} 首` : "请选择 mp3 / ogg / wav";
      if (n > 0) playLobbyMusic({ muted: isMuted() });
    } else {
      const r = playLobbyMusic({ muted: isMuted() });
      if (r === "need_file") state.musicHint = "按 F 导入音频";
      else if (r === "off") state.musicHint = "大厅音乐已关闭";
      else state.musicHint = "正在播放";
    }
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    state.musicHint = "";
    goToTitle();
  }
}

function startMatch() {
  stopLobbyMusic();
  state.match = new Match({
    p1Id: CHARACTER_ORDER[state.p1],
    p2Id: CHARACTER_ORDER[state.p2],
    stageId: STAGE_ORDER[state.stage],
    vsCpu: state.mode === "cpu",
    onEvent: onGameEvent,
  });
  state.screen = "fight";
}

function closeOnlineSession() {
  try {
    state.online?.destroy();
  } catch {
    /* ignore */
  }
  state.online = null;
  state.onlineRole = null;
  state.onlineJoinCode = "";
  state.onlineStatusLine = "";
  state.onlineHostReady = false;
  state.onlineGuestReady = false;
  state.onlineBusy = false;
}

function openOnlineLobby() {
  closeOnlineSession();
  state.onlineLobbySel = 0;
  state.onlineJoinCode = "";
  state.onlineStatusLine = "先选择：创建房间 或 加入房间";
  state.screen = "onlineLobby";
  state.confirmLock = 18;
  syncLobbyMusic();
  syncOnlineJoinPanel();
}

function openOnlineHostScreen() {
  state.onlineJoinCode = "";
  state.onlineStatusLine = "正在创建房间…";
  state.screen = "onlineHost";
  state.confirmLock = 18;
  syncOnlineJoinPanel();
  onlineCreateRoom();
}

function openOnlineJoinScreen() {
  closeOnlineSession();
  state.onlineJoinCode = "";
  state.onlineJoinEditing = false;
  state.onlineStatusLine = "点输入框后再输入房间号";
  state.screen = "onlineJoin";
  state.confirmLock = 18;
  syncOnlineJoinPanel();
}

function isOnlineJoinEditing() {
  if (state.screen !== "onlineJoin") return false;
  if (state.onlineJoinEditing) return true;
  const ae = document.activeElement;
  return !!(ae && ae.id === "online-join-input");
}

function startOnlineJoinEditing() {
  state.onlineJoinEditing = true;
  state.onlineStatusLine = "输入中 · Esc 退出输入";
  const inputEl = document.getElementById("online-join-input");
  const panel = document.getElementById("online-join-panel");
  panel?.classList.add("editing");
  if (inputEl) {
    inputEl.readOnly = false;
    setTimeout(() => {
      inputEl.focus();
      inputEl.select?.();
    }, 20);
  }
  playSfx("ui_ok");
}

function stopOnlineJoinEditing({ clearCode = false } = {}) {
  state.onlineJoinEditing = false;
  const inputEl = document.getElementById("online-join-input");
  const panel = document.getElementById("online-join-panel");
  panel?.classList.remove("editing");
  if (inputEl) {
    inputEl.readOnly = true;
    inputEl.blur();
    if (clearCode) {
      inputEl.value = "";
      state.onlineJoinCode = "";
    }
  }
  // Prevent Esc from also exiting to lobby on the same press
  try {
    input.keys.Escape = false;
    if (input.just) delete input.just.Escape;
  } catch {
    /* ignore */
  }
  state.confirmLock = 18;
  state.onlineStatusLine = clearCode ? "点输入框后再输入房间号" : "已退出输入 · 再点输入框继续";
}

function syncOnlineJoinPanel() {
  const panel = document.getElementById("online-join-panel");
  const inputEl = document.getElementById("online-join-input");
  if (!panel) return;
  const show = state.screen === "onlineJoin";
  panel.classList.toggle("hidden", !show);
  panel.setAttribute("aria-hidden", show ? "false" : "true");
  panel.classList.toggle("editing", show && state.onlineJoinEditing);
  if (!show) {
    state.onlineJoinEditing = false;
    inputEl?.blur();
    return;
  }
  if (inputEl) {
    if (inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, "") !== state.onlineJoinCode) {
      inputEl.value = state.onlineJoinCode;
    }
    // Never auto-focus — must click in to type
    if (!state.onlineJoinEditing && document.activeElement === inputEl) {
      inputEl.blur();
    }
  }
}

function clientToGame(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * W,
    y: ((clientY - r.top) / r.height) * H,
  };
}

async function copyRoomCode() {
  const code = state.online?.roomCode;
  if (!code) return false;
  try {
    await navigator.clipboard.writeText(code);
    state.onlineStatusLine = `已复制 ${code} · 发给电脑/手机上的对手`;
    playSfx("ui_ok");
    return true;
  } catch {
    state.onlineStatusLine = `房间号 ${code} · 请手动发给对手`;
    return false;
  }
}

function bindOnlineSession(session) {
  state.online = session;
  session.onStatus = (s, err) => {
    if (s === "hosting") state.onlineStatusLine = `房间 ${session.roomCode} · 等待对手加入…`;
    else if (s === "joining") state.onlineStatusLine = "正在加入…";
    else if (s === "ready") {
      state.onlineStatusLine = "已连接";
      if (state.screen === "onlineHost" || state.screen === "onlineJoin") {
        state.onlineHostReady = false;
        state.onlineGuestReady = false;
        state.screen = "onlineChars";
        state.confirmLock = 20;
        playSfx("ui_ok");
        syncOnlineJoinPanel();
        syncOnlineChars();
      }
    } else if (s === "error" || s === "closed") {
      state.onlineStatusLine = err || "连接断开";
      if (state.screen === "fight") {
        /* stay until user exits */
      } else if (state.screen === "onlineHost" || state.screen === "onlineJoin") {
        /* keep sub-screen so they can retry / see error */
      } else if (state.screen !== "onlineLobby") {
        state.screen = "onlineLobby";
        syncOnlineJoinPanel();
      }
    }
  };
  session.onMessage = (msg) => {
    if (!msg || !msg.t) return;
    if (msg.t === "char") {
      if (typeof msg.p1 === "number") state.p1 = msg.p1 % CHARACTER_ORDER.length;
      if (typeof msg.p2 === "number") state.p2 = msg.p2 % CHARACTER_ORDER.length;
      if (typeof msg.hostReady === "boolean") state.onlineHostReady = msg.hostReady;
      if (typeof msg.guestReady === "boolean") state.onlineGuestReady = msg.guestReady;
      if (state.onlineHostReady && state.onlineGuestReady && session.isHost) {
        state.screen = "onlineStage";
        state.confirmLock = 20;
        session.send({ t: "goStage", stage: state.stage });
      }
    } else if (msg.t === "goStage") {
      if (typeof msg.stage === "number") state.stage = msg.stage % STAGE_ORDER.length;
      state.screen = "onlineStage";
      state.confirmLock = 20;
    } else if (msg.t === "stage") {
      if (typeof msg.stage === "number") state.stage = msg.stage % STAGE_ORDER.length;
    } else if (msg.t === "start") {
      if (typeof msg.p1 === "number") state.p1 = msg.p1 % CHARACTER_ORDER.length;
      if (typeof msg.p2 === "number") state.p2 = msg.p2 % CHARACTER_ORDER.length;
      if (typeof msg.stage === "number") state.stage = msg.stage % STAGE_ORDER.length;
      beginOnlineMatch();
    } else if (msg.t === "st" && !session.isHost && state.match) {
      applyMatchState(state.match, msg);
    }
  };
}

function syncOnlineChars() {
  const s = state.online;
  if (!s?.connected) return;
  s.send({
    t: "char",
    p1: state.p1,
    p2: state.p2,
    hostReady: state.onlineHostReady,
    guestReady: state.onlineGuestReady,
  });
}

async function onlineCreateRoom() {
  if (state.onlineBusy) return;
  state.onlineBusy = true;
  state.onlineStatusLine = "创建中…";
  try {
    const session = new OnlineSession();
    bindOnlineSession(session);
    state.onlineRole = "host";
    const code = await session.hostRoom();
    state.onlineStatusLine = "把房间号发给对手，等待加入";
    playSfx("ui_ok");
  } catch (e) {
    state.onlineStatusLine = e?.message || "创建失败 · 按 J 重试";
    playSfx("ui_back");
    closeOnlineSession();
  } finally {
    state.onlineBusy = false;
  }
}

async function onlineJoinRoom() {
  if (state.onlineBusy) return;
  const code = state.onlineJoinCode;
  if (code.length !== 6) {
    state.onlineStatusLine = "请输入完整 6 位房间号";
    playSfx("ui_back");
    return;
  }
  state.onlineBusy = true;
  state.onlineStatusLine = "加入中…";
  try {
    const session = new OnlineSession();
    bindOnlineSession(session);
    state.onlineRole = "guest";
    await session.joinRoom(code);
    playSfx("ui_ok");
  } catch (e) {
    state.onlineStatusLine = e?.message || "加入失败 · 检查号码后重试";
    playSfx("ui_back");
    closeOnlineSession();
  } finally {
    state.onlineBusy = false;
  }
}

function handleOnlineLobby(i) {
  if (input.pressed(BIND_P1.up) || input.pressed(BIND_P1.down)) {
    state.onlineLobbySel = state.onlineLobbySel === 0 ? 1 : 0;
    playSfx("ui_move");
  }
  if (confirmPressed(i)) {
    playSfx("ui_ok");
    if (state.onlineLobbySel === 0) openOnlineHostScreen();
    else openOnlineJoinScreen();
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    closeOnlineSession();
    state.screen = "mode";
    syncOnlineJoinPanel();
  }
}

function handleOnlineHost(i) {
  if (state.onlineBusy) return;
  if (confirmPressed(i)) {
    if (!state.online?.roomCode) onlineCreateRoom();
    else copyRoomCode();
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    closeOnlineSession();
    state.screen = "onlineLobby";
    state.confirmLock = 12;
    syncOnlineJoinPanel();
  }
}

function handleOnlineJoin(i) {
  if (state.onlineBusy) return;
  if (state.confirmLock > 0) return;

  // Typing mode: only Esc exits input — no join / lobby / game keys
  if (isOnlineJoinEditing()) {
    if (input.backPressed()) {
      playSfx("ui_back");
      stopOnlineJoinEditing();
    }
    return;
  }

  // Idle: J / confirm enters input; Esc returns to lobby
  if (confirmPressed(i)) {
    startOnlineJoinEditing();
    return;
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    closeOnlineSession();
    state.onlineJoinCode = "";
    state.onlineJoinEditing = false;
    state.screen = "onlineLobby";
    state.confirmLock = 12;
    syncOnlineJoinPanel();
  }
}

function handleOnlineChars(i) {
  const host = state.onlineRole === "host";
  let moved = false;
  if (input.pressed(BIND_P1.left)) {
    if (host) state.p1 = (state.p1 + CHARACTER_ORDER.length - 1) % CHARACTER_ORDER.length;
    else state.p2 = (state.p2 + CHARACTER_ORDER.length - 1) % CHARACTER_ORDER.length;
    moved = true;
  }
  if (input.pressed(BIND_P1.right)) {
    if (host) state.p1 = (state.p1 + 1) % CHARACTER_ORDER.length;
    else state.p2 = (state.p2 + 1) % CHARACTER_ORDER.length;
    moved = true;
  }
  if (moved) {
    playSfx("ui_move");
    if (host) state.onlineHostReady = false;
    else state.onlineGuestReady = false;
    syncOnlineChars();
  }
  if (confirmPressed(i)) {
    playSfx("ui_ok");
    if (host) state.onlineHostReady = true;
    else state.onlineGuestReady = true;
    syncOnlineChars();
    if (state.onlineHostReady && state.onlineGuestReady && host) {
      state.screen = "onlineStage";
      state.confirmLock = 20;
      state.online?.send({ t: "goStage", stage: state.stage });
    }
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    closeOnlineSession();
    state.screen = "onlineLobby";
    syncOnlineJoinPanel();
  }
}

function handleOnlineStage(i) {
  const host = state.onlineRole === "host";
  if (host) {
    let moved = false;
    if (input.pressed(BIND_P1.left)) {
      state.stage = (state.stage + STAGE_ORDER.length - 1) % STAGE_ORDER.length;
      moved = true;
    }
    if (input.pressed(BIND_P1.right)) {
      state.stage = (state.stage + 1) % STAGE_ORDER.length;
      moved = true;
    }
    if (moved) {
      playSfx("ui_move");
      state.online?.send({ t: "stage", stage: state.stage });
    }
    if (confirmPressed(i)) {
      playSfx("ui_ok");
      state.online?.send({
        t: "start",
        p1: state.p1,
        p2: state.p2,
        stage: state.stage,
      });
      beginOnlineMatch();
    }
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    state.onlineHostReady = false;
    state.onlineGuestReady = false;
    state.screen = "onlineChars";
    syncOnlineChars();
  }
}

function beginOnlineMatch() {
  stopLobbyMusic();
  state.match = new Match({
    p1Id: CHARACTER_ORDER[state.p1],
    p2Id: CHARACTER_ORDER[state.p2],
    stageId: STAGE_ORDER[state.stage],
    vsCpu: false,
    onEvent: onGameEvent,
  });
  state.screen = "fight";
  state.confirmLock = 30;
  if (state.online) state.online.remoteInput = emptyInput();
  syncOnlineJoinPanel();
}

function tickOnlineFight() {
  const session = state.online;
  const match = state.match;
  if (!session || !match) return;

  const local = input.read(BIND_P1);
  if (match.phase === "matchover" && local.start) {
    exitPlayToTitle();
    return;
  }

  if (session.status === "closed" || session.status === "error") {
    state.onlineStatusLine = session.error || "连接断开";
  }

  // periodic ping
  if (state.menuFlash % 45 === 0) session.ping();

  if (session.isHost) {
    const i1 = local;
    const i2 = session.remoteInput || emptyInput();
    match.update(i1, i2);
    session.sendState(match);
  } else {
    session.sendInput(local);
    if (session.lastState) applyMatchState(match, session.lastState);
  }
  syncHud(match);
}

function drawOnlineLobby() {
  ctx.textAlign = "center";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("ONLINE VS", W / 2, 90);

  const rows = [
    { label: "创建房间", sub: "进入后生成房间号" },
    { label: "加入房间", sub: "进入后输入房间号" },
  ];
  rows.forEach((r, i) => {
    const y = 220 + i * 110;
    const sel = state.onlineLobbySel === i;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.15)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(W / 2 - 280, y - 40, 560, 90);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 280, y - 40, 560, 90);
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : "#8b9bb0";
    ctx.fillText(r.label, W / 2, y);
    ctx.font = "16px 'Share Tech Mono'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(r.sub, W / 2, y + 28);
  });

  ctx.font = "14px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(state.onlineStatusLine || "", W / 2, 480);
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  const touchUi = getControlMode() === "touch";
  ctx.fillText(touchUi ? "点选项目 · 确认键进入 · 返回键退出" : "W/S 选择 · J 进入 · ESC 返回", W / 2, 560);
  ctx.fillText("电脑 ↔ 手机均可 · 双方打开同一游戏网址", W / 2, 590);
}

function drawOnlineHost() {
  ctx.textAlign = "center";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("创建房间", W / 2, 90);

  const code = state.online?.roomCode || "------";
  ctx.font = "14px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText("房间号", W / 2, 220);
  ctx.font = "36px 'Press Start 2P'";
  ctx.fillStyle = "#fff";
  ctx.fillText(code, W / 2, 290);

  ctx.font = "16px 'Share Tech Mono'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(state.onlineStatusLine || "", W / 2, 380);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  if (!state.online?.roomCode && !state.onlineBusy) {
    ctx.fillText("J / 确认 · 重新创建 · ESC 返回", W / 2, 560);
  } else {
    ctx.fillText("点号码可复制 · 发给电脑或手机对手 · ESC 返回", W / 2, 560);
  }
}

function drawOnlineJoin() {
  ctx.textAlign = "center";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("加入房间", W / 2, 90);

  const editing = isOnlineJoinEditing();
  ctx.font = "14px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(editing ? "正在输入房间号…" : "点击下方输入框后再输入", W / 2, 200);

  const display = state.onlineJoinCode.padEnd(6, "_").split("").join(" ");
  ctx.font = "28px 'Press Start 2P'";
  ctx.fillStyle = editing ? "#fff" : "#6b7c90";
  ctx.fillText(display, W / 2, 260);

  ctx.font = "16px 'Share Tech Mono'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(state.onlineStatusLine || "", W / 2, 320);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText(
    editing ? "输入中 · Esc 退出输入 · 点「加入房间」确认" : "点输入框开始 · Esc 返回大厅",
    W / 2,
    560
  );
}

function drawOnlineChars() {
  ctx.textAlign = "center";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(state.onlineRole === "host" ? "你是 HOST · 选 P1" : "你是 GUEST · 选 P2", W / 2, 48);
  drawCharCard(60, 70, CHARACTER_ORDER[state.p1], state.onlineRole === "host", state.onlineHostReady ? "P1 READY" : "P1");
  drawCharCard(680, 70, CHARACTER_ORDER[state.p2], state.onlineRole === "guest", state.onlineGuestReady ? "P2 READY" : "P2");
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(`房间 ${state.online?.roomCode || "——"} · RTT ${state.online?.rttMs || "—"}ms`, W / 2, 670);
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText("A/D 选角 · J 准备 · ESC 退出房间", W / 2, 700);
}

function drawOnlineStage() {
  drawStageSelect();
  ctx.textAlign = "center";
  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(
    state.onlineRole === "host" ? "HOST 选场地 · J 开战" : "等待 HOST 选择场地…",
    W / 2,
    40
  );
}

function startTutorial() {
  stopLobbyMusic();
  state.tutorial = new Tutorial();
  wrapTutorialEvent(state.tutorial);
  state.screen = "tutorial";
  state.confirmLock = 25;
}

function drawTutorialSelect(tut) {
  hideHud();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15202e");
  g.addColorStop(1, "#0a0e14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const ov = tut.overlay;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(140, 40, W - 280, 110);
  ctx.strokeStyle = "#ff6b2c";
  ctx.lineWidth = 2;
  ctx.strokeRect(140, 40, W - 280, 110);
  ctx.font = "12px 'Press Start 2P'";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(ov.title, W / 2, 72);
  ctx.font = "14px 'Share Tech Mono'";
  ctx.fillStyle = "#e8eef6";
  ctx.fillText(ov.body, W / 2, 100);
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(ov.hint, W / 2, 126);

  CHARACTER_ORDER.forEach((id, i) => {
    const c = CHARACTERS[id];
    const x = 90 + i * 190;
    const y = 280;
    const sel = i === tut.charIndex;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.18)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(x, y, 170, 320);
    ctx.strokeStyle = sel ? c.color : "#2a3544";
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x, y, 170, 320);
    drawStickFigure(ctx, previewFighter(id, x + 85, y + 140, 1), { preview: true });
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = c.color;
    ctx.fillText(c.name, x + 85, y + 220);
    ctx.font = "11px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(c.subtitle, x + 85, y + 248);
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state.screen === "tutorial" && state.tutorial) {
    if (state.tutorial.phase === "select") {
      drawTutorialSelect(state.tutorial);
    } else if (state.tutorial.match) {
      drawMatch(ctx, state.tutorial.match, W, H, state.tutorial.overlay);
      if (state.tutorial.steps[state.tutorial.step]?.spawnMark) {
        const mx = state.tutorial.markX;
        ctx.save();
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(state.titleAnim * 0.2) * 0.3;
        ctx.strokeRect(mx - 24, 560, 48, 48);
        ctx.restore();
      }
    }
    return;
  }

  if (state.screen === "story" && state.story) {
    drawStory();
    return;
  }

  if (state.screen === "campaign" && state.campaign) {
    drawCampaign();
    return;
  }

  if (state.screen === "fight" && state.match) {
    drawMatch(ctx, state.match, W, H);
    if (state.mode === "online" && state.online) {
      ctx.font = "10px 'Press Start 2P'";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(16, 100, 220, 28);
      ctx.fillStyle = "#6dffb0";
      const role = state.onlineRole === "host" ? "HOST" : "GUEST";
      ctx.fillText(`${role}  ${state.online.rttMs || "—"}ms`, 24, 120);
      if (state.online.status === "closed" || state.online.status === "error") {
        ctx.fillStyle = "#ff4d6d";
        ctx.fillText(state.online.error || "DISCONNECTED", 24, 148);
      }
    }
    return;
  }

  if (state.screen === "login" || state.screen === "register" || state.screen === "changePassword" || authPanelVisible()) {
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText("STICK VERSUS", W / 2, H / 2 - 40);
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(
      state.screen === "changePassword"
        ? "请先修改密码"
        : state.screen === "register"
          ? "注册新帐号"
          : "请登录或注册帐号",
      W / 2,
      H / 2
    );
    return;
  }

  hideHud();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15202e");
  g.addColorStop(1, "#0a0e14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  if (state.screen === "title") drawTitle();
  else if (state.screen === "mode") drawMode();
  else if (state.screen === "onlineLobby") drawOnlineLobby();
  else if (state.screen === "onlineHost") drawOnlineHost();
  else if (state.screen === "onlineJoin") drawOnlineJoin();
  else if (state.screen === "onlineChars") drawOnlineChars();
  else if (state.screen === "onlineStage") drawOnlineStage();
  else if (state.screen === "storyUpgrades") drawStoryUpgrades();
  else if (state.screen === "settings") drawSettings();
  else if (state.screen === "chars") drawChars();
  else if (state.screen === "campmates") drawCampmates();
  else if (state.screen === "stage") drawStageSelect();
  else if (state.screen === "howto") drawHowto();
  else if (state.screen === "music") drawMusicMenu();
}

function drawCampaign() {
  const camp = state.campaign;
  if (camp.phase === "fight" && camp.match) {
    drawMatch(ctx, camp.match, W, H);
    ctx.font = "9px 'Press Start 2P'";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const label = camp.progressLabel + " " + (camp.level?.name || "");
    ctx.fillRect(16, 64, Math.min(620, 24 + label.length * 10), 36);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(label, 24, 80);
    if (isTesterAccount()) {
      ctx.font = "11px 'Share Tech Mono'";
      ctx.fillStyle = "#6dffb0";
      ctx.fillText("TEST  N/] 跳关  [ 回退", 24, 112);
    }
    if (camp.allyIds?.length) {
      ctx.font = "12px 'Share Tech Mono'";
      ctx.fillStyle = "#8b9bb0";
      ctx.fillText("ALLIES " + camp.allyIds.map((id) => CHARACTERS[id].name).join(" · "), 24, 96);
    }
    return;
  }

  hideHud();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a2018");
  g.addColorStop(1, "#0a0e14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const ov = camp.overlay;
  if (!ov) return;

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(70, 130, W - 140, 420);
  ctx.strokeStyle = camp.phase === "fail" ? "#ff4d6d" : "#ff6b2c";
  ctx.lineWidth = 3;
  ctx.strokeRect(70, 130, W - 140, 420);

  ctx.textAlign = "left";
  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(ov.title || "", 100, 180);
  if (ov.progressLabel) {
    ctx.textAlign = "right";
    ctx.font = "11px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText(ov.progressLabel, W - 100, 180);
    ctx.textAlign = "left";
  }
  if (ov.subtitle) {
    ctx.font = "16px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(ov.subtitle, 100, 220);
  }
  ctx.font = "15px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  ctx.fillText(ov.body || "", 100, 280);
  if (camp.allyIds?.length && camp.phase === "brief") {
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(
      "队友: " + camp.allyIds.map((id) => CHARACTERS[id].name).join(" · "),
      100,
      320
    );
  }
  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = state.menuFlash % 40 < 28 ? "#e8eef6" : "#5a6a7c";
  ctx.fillText(ov.hint || "", 100, 480);
}

function drawCampmates() {
  ctx.textAlign = "center";
  ctx.font = "18px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("TEAMMATES", W / 2, 100);
  ctx.font = "14px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText("选择 AI 队友数量（随机角色）", W / 2, 140);

  for (let n = 0; n <= 2; n++) {
    const x = 220 + n * 280;
    const y = 280;
    const sel = state.teammateCount === n;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.18)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(x, y, 220, 200);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x, y, 220, 200);
    ctx.font = "36px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : "#8b9bb0";
    ctx.fillText(String(n), x + 110, y + 90);
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText(n === 0 ? "独行" : n === 1 ? "双人" : "三人小队", x + 110, y + 140);
    if (n > 0) {
      ctx.fillText(`敌方强度 +${n * 10}%`, x + 110, y + 168);
    }
  }

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText(
    canUseCampaignUpgrades()
      ? "←/→ 选择 · J/ENTER 进入升级后开始"
      : "←/→ — 选择   J/ENTER — 开始",
    W / 2,
    560
  );
  ctx.font = "13px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText("清场后走到 EXIT 出门；期间可靠近按 E 救援队友", W / 2, 600);
  ctx.fillText(
    canUseCampaignUpgrades()
      ? "每通一关 +1 升级点（Boss +2）· 局内 U 可再加点"
      : "章末黑暗领主：打弱点 · 半血狂暴 · 留意数据刃/地刺",
    W / 2,
    628
  );
}

function drawStory() {
  const story = state.story;
  if (story.phase === "fight" && story.match) {
    drawMatch(ctx, story.match, W, H);
    const beat = story.current;
    if (beat) {
      ctx.font = "9px 'Press Start 2P'";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(16, 64, Math.min(560, 24 + beat.title.length * 10), 36);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(beat.title || beat.chapter, 24, 80);
    if (isTesterAccount()) {
      ctx.font = "11px 'Share Tech Mono'";
      ctx.fillStyle = "#6dffb0";
      ctx.fillText("TEST  N/] 跳关  [ 回退", 24, 112);
    }
    if (beat.scene) {
        ctx.font = "12px 'Share Tech Mono'";
        ctx.fillStyle = "#8b9bb0";
        ctx.fillText(beat.scene.slice(0, 42), 24, 96);
      }
    }
    return;
  }

  hideHud();
  const beat = story.current;
  // scene-tinted backdrop
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (beat?.stageId === "lake" || (beat?.chapter || "").includes("光标") || (beat?.chapter || "").includes("后门") || beat?.type === "ending") {
    g.addColorStop(0, "#1a2e28");
    g.addColorStop(1, "#0a1210");
  } else {
    g.addColorStop(0, "#1a2433");
    g.addColorStop(1, "#0a0e14");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // desktop icons / atmosphere
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(72 + i * 200, 56, 56, 56);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(72 + i * 200, 56, 56, 56);
  }

  const ov = story.overlay;
  if (!ov) return;

  // dialogue panel
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(70, 130, W - 140, 420);
  ctx.strokeStyle = story.phase === "fail" ? "#ff4d6d" : "#ff6b2c";
  ctx.lineWidth = 3;
  ctx.strokeRect(70, 130, W - 140, 420);

  ctx.textAlign = "left";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(ov.title || "", 100, 168);
  if (ov.subtitle) {
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(ov.subtitle, 100, 192);
  }
  if (ov.progressLabel) {
    ctx.textAlign = "right";
    ctx.font = "11px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText(ov.progressLabel, W - 100, 168);
    ctx.textAlign = "left";
  }
  if (ov.scene) {
    ctx.font = "13px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    wrapFillTextLeft(ov.scene, 100, 220, W - 200, 20);
  }

  // speaker + body
  const who = ov.who || "";
  const whoColor = STORY_SPEAKER_COLOR[who] || "#e8eef6";
  const bodyTop = ov.scene ? 270 : 240;
  if (who) {
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillStyle = whoColor;
    ctx.fillText(who, 100, bodyTop);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(100, bodyTop + 10, Math.min(280, who.length * 14 + 20), 2);
  }
  ctx.font = "17px 'Share Tech Mono'";
  ctx.fillStyle = "#e8eef6";
  wrapFillTextLeft(ov.body, 100, bodyTop + 40, W - 200, 26);

  // character previews on fight / related dialogues
  if (beat?.type === "fight" && story.phase !== "fail") {
    drawStickFigure(ctx, previewFighter("orange", 280, 520, 1), { preview: true });
    drawStickFigure(ctx, previewFighter(beat.foe, 1000, 520, -1), { preview: true });
  } else if (beat?.type === "ending" || (beat?.title || "").includes("集结")) {
    CHARACTER_ORDER.forEach((id, i) => {
      drawStickFigure(ctx, previewFighter(id, 200 + i * 150, 530, 1), { preview: true });
    });
  }

  ctx.textAlign = "center";
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = state.menuFlash % 40 < 28 ? "#cfd8e6" : "#6b7c90";
  ctx.fillText(ov.hint || "", W / 2, 530);
  ctx.fillStyle = "#4a5566";
  ctx.fillText(STORY_DISCLAIMER, W / 2, 552);
}

function wrapFillTextLeft(text, x, y, maxW, lineH) {
  const chars = String(text || "").split("");
  let line = "";
  let yy = y;
  let lines = 0;
  ctx.textAlign = "left";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineH;
      lines += 1;
      if (lines >= 6) {
        ctx.fillText(line + "…", x, yy);
        return;
      }
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function previewFighter(id, x, y, facing) {
  const char = CHARACTERS[id];
  return {
    char,
    x,
    y,
    facing,
    anim: state.titleAnim,
    state: "idle",
    pose: "idle",
    attack: null,
    onGround: true,
    gliding: false,
    invuln: 0,
    mistUntil: 0,
    flash: 0,
    danger: false,
    stun: 0,
  };
}

function drawTitle() {
  drawStickFigure(ctx, previewFighter(state.titleLeft || "orange", 320, 520, 1), { preview: true });
  drawStickFigure(ctx, previewFighter(state.titleRight || "red", 960, 520, -1), { preview: true });

  ctx.textAlign = "center";
  ctx.font = "44px 'Press Start 2P'";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 10;
  const pulse = 1 + Math.sin(state.titleAnim * 0.08) * 0.015;
  ctx.save();
  ctx.translate(W / 2, 210);
  ctx.scale(pulse, pulse);
  ctx.strokeText("STICK VERSUS", 0, 0);
  ctx.fillStyle = "#ff6b2c";
  ctx.fillText("STICK VERSUS", 0, 0);
  ctx.restore();

  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText("FAN HOMAGE TO ANIMATION VERSUS GAMEPLAY", W / 2, 270);

  const acc = getCurrentAccount();
  const tester = acc?.role === "tester";
  if (acc) {
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillStyle = tester ? "#ffd166" : "#6dffb0";
    ctx.fillText(`帐号  ${accountDisplayName()}`, W / 2, 304);
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    const roleLine = tester
      ? "测试帐号"
      : acc.role === "admin"
        ? "管理员"
        : acc.label || "玩家";
    ctx.fillText(roleLine, W / 2, 328);

    // Visible for every logged-in account
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = state.menuFlash % 50 < 30 ? "#ff8fab" : "#c45a72";
    ctx.fillText("L  ·  退出登录", W / 2, 358);
  }

  if (tester) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(W / 2 - 340, 378, 680, 100);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 340, 378, 680, 100);
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("测试帐号 · 最高权限", W / 2, 404);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText("关卡升级：K 免费加点 · M 一键满级", W / 2, 432);
    ctx.fillText("故事 / 关卡：N 或 ] 跳关 · [ 回退", W / 2, 456);
  }

  const enterY = tester ? 512 : acc ? 420 : 400;
  const touchEnter = getControlMode() === "touch";
  ctx.font = "14px 'Press Start 2P'";
  ctx.fillStyle = state.menuFlash % 40 < 28 ? "#e8eef6" : "#5a6a7c";
  ctx.fillText(touchEnter ? "点击进入" : "PRESS ENTER", W / 2, enterY);

  ctx.font = "10px 'Share Tech Mono'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText(
    touchEnter
      ? "点屏幕进入 · O 设置 · M 音乐 · [-] 静音" + (isMuted() ? " (MUTED)" : "")
      : "T tutorial · H controls · O settings · M music · [-] mute" + (isMuted() ? " (MUTED)" : ""),
    W / 2,
    enterY + 36
  );
  ctx.fillStyle = "#5a6a7c";
  ctx.fillText(lobbyMusicStatusLine(), W / 2, enterY + 64);

  if (state.logoutConfirm) {
    ctx.fillStyle = "rgba(6, 10, 16, 0.78)";
    ctx.fillRect(0, 0, W, H);
    const boxW = 520;
    const boxH = 200;
    const bx = (W - boxW) / 2;
    const by = (H - boxH) / 2 - 20;
    ctx.fillStyle = "rgba(18, 24, 34, 0.98)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = "#ff6b2c";
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("退出登录？", W / 2, by + 58);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#cfd8e6";
    ctx.fillText(`当前帐号：${accountDisplayName() || "—"}`, W / 2, by + 100);
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(
      getControlMode() === "touch" ? "点击确认退出 · Esc / N 取消" : "Enter / J 确认退出 · Esc / N 取消",
      W / 2,
      by + 148
    );
  }
}

function drawMusicMenu() {
  ctx.textAlign = "center";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("LOBBY MUSIC", W / 2, 64);
  ctx.font = "13px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText("Alan Becker OST · 本地播放（无画面）", W / 2, 96);

  const tracks = getLobbyTracks();
  const idx = getMusicIndex();
  const maxVisible = 9;
  let start = 0;
  if (tracks.length > maxVisible) {
    start = Math.max(0, Math.min(idx - 4, tracks.length - maxVisible));
  }
  const visible = tracks.slice(start, start + maxVisible);

  visible.forEach((track, vi) => {
    const i = start + vi;
    const y = 128 + vi * 48;
    const sel = i === idx;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.16)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(120, y - 24, W - 240, 44);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(120, y - 24, W - 240, 44);

    ctx.textAlign = "left";
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : track.missing ? "#5a6a7c" : "#8b9bb0";
    ctx.fillText(track.title.slice(0, 36), 148, y - 2);
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText((track.artist || "").slice(0, 48), 148, y + 16);

    ctx.textAlign = "right";
    let badge = "OFF";
    let color = "#6b7c90";
    if (track.id !== "off") {
      if (trackHasLocal(track)) {
        badge = isLobbyMusicPlaying() && sel ? "▶" : "OK";
        color = "#3dd68c";
      } else if (track.missing) {
        badge = "空";
        color = "#5a6a7c";
      } else {
        badge = "—";
      }
    }
    ctx.fillStyle = color;
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillText(badge, W - 148, y + 8);
  });

  ctx.textAlign = "center";
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  ctx.fillText(state.musicHint || "默认 Pigstep · Enter 播放 · B 打开 B站来源", W / 2, 600);
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText("↑↓ 选曲 · Enter 播放 · B 来源 · F 导入 · P 暂停 · X 删导入 · Esc 返回", W / 2, 640);
}

function handleStoryUpgradesMenu(i) {
  const n = STORY_UPGRADE_DEFS.length;
  const tester = isTesterAccount();

  if (input.pressed(BIND_P1.up)) {
    state.storyUpgradeSel = (state.storyUpgradeSel + n - 1) % n;
    playSfx("ui_move");
  }
  if (input.pressed(BIND_P1.down)) {
    state.storyUpgradeSel = (state.storyUpgradeSel + 1) % n;
    playSfx("ui_move");
  }
  if (input.pressed("KeyR")) {
    const next = resetCampaignUpgrades(loadCampaignUpgrades());
    state.storyUpgradeFlash = `已重置 · 点数 ${next.points}`;
    playSfx("ui_back");
    state.confirmLock = 12;
  }
  if (tester && input.pressed("KeyM")) {
    const next = maxAllCampaignUpgrades(loadCampaignUpgrades());
    if (next) {
      playSfx("ui_ok");
      state.storyUpgradeFlash = "测试 · 全满级";
      state.confirmLock = 12;
    }
  }
  if (state.confirmLock <= 0 && (i.special || input.pressed("KeyU"))) {
    const def = STORY_UPGRADE_DEFS[state.storyUpgradeSel];
    const cur = loadCampaignUpgrades();
    const next = tryBuyCampaignUpgrade(cur, def.id);
    if (next) {
      playSfx("ui_ok");
      state.storyUpgradeFlash = `${def.name} Lv.${next.levels[def.id]}${tester ? " · FREE" : ""}`;
      state.confirmLock = 12;
    } else {
      playSfx("ui_back");
      const lv = cur.levels[def.id] || 0;
      state.storyUpgradeFlash =
        lv >= def.max ? "已满级" : cur.points < def.cost ? "点数不足" : "无法升级";
      state.confirmLock = 10;
    }
  }
  if (confirmPressed(i)) {
    unlockAudio();
    playSfx("ui_ok");
    if (state.upgradeReturnTo === "campaign" && state.campaign) {
      state.campaign.playerUpgrades = loadCampaignUpgrades();
      state.screen = "campaign";
      state.upgradeReturnTo = null;
      state.confirmLock = 18;
      hideHud();
    } else {
      startCampaign();
    }
  }
  if (input.backPressed()) {
    playSfx("ui_back");
    if (state.upgradeReturnTo === "campaign" && state.campaign) {
      state.campaign.playerUpgrades = loadCampaignUpgrades();
      state.screen = "campaign";
      state.upgradeReturnTo = null;
    } else {
      state.screen = "campmates";
    }
    state.confirmLock = 12;
  }
}

function drawStoryUpgrades() {
  const up = loadCampaignUpgrades();
  const prev = previewCampaignStats(up.levels);
  const tester = isTesterAccount();
  const charId = CHARACTER_ORDER[state.p1];
  const char = CHARACTERS[charId];

  ctx.textAlign = "center";
  ctx.font = "18px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("CAMPAIGN UPGRADES", W / 2, 70);
  ctx.font = "13px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(
    tester
      ? "测试帐号：升级免费 · M 一键满级"
      : "关卡模式 · 每通一关 +1 点（Boss +2）· 管理员与玩家可用",
    W / 2,
    100
  );

  drawStickFigure(ctx, previewFighter(charId, 220, 420, 1), { preview: true });
  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = char.color || "#ff7a2f";
  ctx.fillText(char.name || charId, 220, 460);
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  ctx.fillText(`HP ${prev.maxHp}`, 220, 488);
  ctx.fillText(`DMG +${prev.dmgPct}%  SPD +${prev.speedPct}%`, 220, 510);
  ctx.fillText(`NODES ${prev.nodes}  STA ${prev.stamina}  SKL ${prev.skill}`, 220, 532);

  ctx.textAlign = "right";
  ctx.font = "14px 'Press Start 2P'";
  ctx.fillStyle = "#6dffb0";
  ctx.fillText(tester ? `POINTS  ∞ (${up.points})` : `POINTS  ${up.points}`, W - 90, 70);
  if (tester) {
    ctx.font = "11px 'Share Tech Mono'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("测试帐号 · 免费升级", W - 90, 118);
  }
  if (state.storyUpgradeFlash) {
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(state.storyUpgradeFlash, W - 90, 96);
  }

  STORY_UPGRADE_DEFS.forEach((def, i) => {
    const y = 140 + i * 68;
    const sel = state.storyUpgradeSel === i;
    const lv = up.levels[def.id] || 0;
    const can = lv < def.max && (tester || up.points >= def.cost);
    ctx.fillStyle = sel ? "rgba(255,107,44,0.18)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(400, y, 780, 58);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(400, y, 780, 58);

    ctx.textAlign = "left";
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : "#8b9bb0";
    ctx.fillText(def.name, 424, y + 26);
    ctx.font = "13px 'Share Tech Mono'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText(def.desc, 424, y + 46);

    for (let p = 0; p < def.max; p++) {
      ctx.fillStyle = p < lv ? "#ff6b2c" : "#2a3544";
      ctx.fillRect(720 + p * 22, y + 18, 16, 16);
    }

    ctx.textAlign = "right";
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = lv >= def.max ? "#6b7c90" : can ? "#6dffb0" : "#ff8fab";
    ctx.fillText(lv >= def.max ? "MAX" : tester ? "FREE" : `${def.cost} PT`, 1150, y + 34);
  });

  ctx.textAlign = "center";
  ctx.font = "11px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  const enterHint = state.upgradeReturnTo === "campaign" ? "ENTER 返回关卡" : "ENTER 开始关卡";
  ctx.fillText(
    tester
      ? `↑↓ 选择 · K 免费升级 · M 全满 · ${enterHint} · R 重置 · ESC 返回`
      : `↑↓ 选择 · K 升级 · ${enterHint} · R 重置 · ESC 返回`,
    W / 2,
    680
  );
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(`已清关卡 ${up.clearedFights.length} · 首通每关 +1 · Boss +2`, W / 2, 640);
}

function drawMode() {
  ctx.textAlign = "center";
  ctx.font = "22px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("SELECT MODE", W / 2, 80);

  const options = [
    { id: "tutorial", label: "TUTORIAL", sub: "新手引导 — 逐步学会移动、攻击、Node" },
    { id: "story", label: "STORY MODE", sub: "故事模式 — Orange 剧情战役" },
    { id: "campaign", label: "CAMPAIGN", sub: "关卡模式 — 3×5 关 · 角色升级 · AI 队友" },
    { id: "cpu", label: "VS CPU", sub: "对战火柴人 AI" },
    { id: "versus", label: "LOCAL VS", sub: "双人同键盘对战" },
    { id: "online", label: "ONLINE VS", sub: "联机对战 — 房间号加入 · P2P" },
  ];
  options.forEach((op, i) => {
    const y = 118 + i * 68;
    const sel = state.mode === op.id;
    const soon = false;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.15)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(W / 2 - 300, y - 30, 600, 68);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 300, y - 30, 600, 68);
    ctx.font = "15px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : soon ? "#6b7c90" : "#8b9bb0";
    ctx.fillText(op.label, W / 2, y);
    ctx.font = "13px 'Share Tech Mono'";
    ctx.fillStyle = soon ? "#ffd166" : "#6b7c90";
    ctx.fillText(op.sub, W / 2, y + 22);
  });
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText("W/S — MOVE   J/ENTER — CONFIRM", W / 2, 560);
}

function drawChars() {
  ctx.textAlign = "center";
  ctx.font = "18px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("CHOOSE YOUR STICK", W / 2, 56);

  drawCharCard(60, 80, CHARACTER_ORDER[state.p1], true, "P1");
  if (state.mode === "campaign") {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(680, 80, 520, 580);
    ctx.strokeStyle = "#2a3544";
    ctx.lineWidth = 3;
    ctx.strokeRect(680, 80, 520, 580);
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.fillText("CAMPAIGN", 940, 220);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText("下一页选择 0–2 名 AI 队友", 940, 280);
    ctx.fillText("队友角色开局随机", 940, 310);
    ctx.fillText("3 章 × 5 关 · 章末 Boss", 940, 360);
  } else {
    drawCharCard(680, 80, CHARACTER_ORDER[state.p2], state.mode === "versus", state.mode === "cpu" ? "CPU" : "P2");
  }

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText(
    state.mode === "campaign"
      ? "A/D — 选角   J/ENTER — 下一步"
      : "A/D — P1   ←/→ — P2   J/ENTER — CONFIRM",
    W / 2,
    690
  );
}

function drawCharCard(x, y, id, active, label) {
  const c = CHARACTERS[id];
  ctx.fillStyle = active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
  ctx.fillRect(x, y, 520, 580);
  ctx.strokeStyle = active ? c.color : "#2a3544";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 520, 580);

  ctx.font = "12px 'Press Start 2P'";
  ctx.fillStyle = "#8b9bb0";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 260, y + 32);

  drawStickFigure(ctx, previewFighter(id, x + 140, y + 200, 1), { preview: true });

  ctx.font = "16px 'Press Start 2P'";
  ctx.fillStyle = c.color;
  ctx.fillText(c.name, x + 360, y + 100);
  ctx.font = "12px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  ctx.fillText(c.subtitle, x + 360, y + 128);

  const traits = [];
  if (c.hollowHead) traits.push("Hollow head");
  if (c.headband) traits.push("Yellow headband");
  if (c.pencil) traits.push("Pencil tool");
  if (c.fishingRod) traits.push("Fishing rod");
  if (c.laptop) traits.push("Laptop");
  if (c.wings) traits.push("Elytra wings");
  ctx.fillStyle = "#8b9bb0";
  ctx.fillText(traits.join(" · "), x + 360, y + 154);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd166";
  ctx.font = "11px 'Press Start 2P'";
  ctx.fillText("SPECIALS", x + 250, y + 190);
  ctx.font = "13px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  const moves = [
    `N/F  ${c.moves.nSpecial}`,
    `U    ${c.moves.uSpecial}`,
    `D    ${c.moves.dSpecial}`,
    `B    ${c.moves.bSpecial}`,
  ];
  moves.forEach((m, i) => ctx.fillText(m, x + 250, y + 220 + i * 28));

  ctx.fillStyle = "#6b7c90";
  ctx.font = "13px 'Share Tech Mono'";
  ctx.fillText(c.desc, x + 40, y + 400);
  ctx.fillText(`HP ${c.maxHp}   SPD ${c.speed.toFixed(1)}   JUMPS ${c.airJumps}   NODES ${c.nodes}`, x + 40, y + 440);

  CHARACTER_ORDER.forEach((cid, i) => {
    const sx = x + 50 + i * 72;
    const sy = y + 520;
    const col = CHARACTERS[cid].color;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    if (CHARACTERS[cid].hollowHead) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.fill();
    }
    if (cid === id) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawStageSelect() {
  ctx.textAlign = "center";
  ctx.font = "18px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("SELECT STAGE", W / 2, 100);

  STAGE_ORDER.forEach((id, i) => {
    const s = STAGES[id];
    const x = 200 + i * 440;
    const sel = state.stage === i;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.12)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(x, 180, 400, 320);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, 180, 400, 320);

    const g = ctx.createLinearGradient(x + 20, 210, x + 20, 420);
    g.addColorStop(0, s.areas[0].bg[0]);
    g.addColorStop(1, s.areas[0].bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x + 20, 210, 360, 210);

    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText(s.name, x + 200, 460);
    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(`${s.areas.length} AREAS · FILE TRAVEL`, x + 200, 485);
  });

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText("←/→ — STAGE   ENTER — FIGHT!", W / 2, 580);
}

function drawHowto() {
  ctx.textAlign = "left";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("HOW TO PLAY", 120, 80);

  const lines = [
    "Recommend: Mode Select → TUTORIAL for guided practice.",
    "",
    "P1: WASD · SPACE jump · J attack · K special · L block · U node · LShift dodge (C alt)",
    "Solo: ↓ ArrowDown = 滑铲   ·   P2: Arrows + Numpad · NumpadEnter dodge",
    "Stamina (yellow): dodge / slide / block. Attack restores; or wait ~10s then regen.",
    "Skill (purple): K specials — 5 uses empty the bar; ~10 hits on foe refill it.",
    "Perfect dodge (early LShift / C) teleports. L+U = omni Node shield.",
    "Esc = menu back only (fight won't quit on Esc).",
    "",
    "Each stick has unique looks: Orange hollow head+pencil, Red headband,",
    "Blue potions, Green fishing rod/guitar, Yellow laptop, Purple elytra wings.",
    "Red/Purple idle = boxer's guard. Green idle = lean + rod behind (both hands).",
    "",
    "DANGER (~33% HP): wall-smash for early File KO. Node Guard / Crush / Throw / Jump.",
    "TRIP → ↑+J LAUNCH → landing SLAM damage. Not the same as DANGER (~33% HP).",
    "Audio: SFX on combat.  [-] mute.  Title M — lobby music.",
    "Campaign: clear → walk EXIT (E revive first OK). Dark Lord — WEAK zones; rage at 50%.",
  ];
  ctx.font = "15px 'Share Tech Mono'";
  ctx.fillStyle = "#cfd8e6";
  lines.forEach((ln, i) => ctx.fillText(ln, 120, 130 + i * 32));

  ctx.textAlign = "center";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "#6b7c90";
  ctx.fillText("ENTER / ESC — BACK", W / 2, 680);
}

function openSettings() {
  state.settingsTab = 0;
  state.settingsSel = 0;
  state.settingsFlash = "";
  input.cancelRebind();
  setTouchEditMode(false);
  state.screen = "settings";
  state.confirmLock = 12;
  hideHud();
  syncLobbyMusic();
}

function handleSettingsMenu(i) {
  if (input.isRebinding()) {
    if (input.backPressed()) {
      input.cancelRebind();
      state.settingsFlash = "已取消改键";
      playSfx("ui_back");
    }
    return;
  }

  const tabCount = 4;
  if (input.pressed(BIND_P1.left) || input.pressed("KeyQ")) {
    setTouchEditMode(false);
    state.settingsTab = (state.settingsTab + tabCount - 1) % tabCount;
    state.settingsSel = 0;
    playSfx("ui_move");
  }
  if (input.pressed(BIND_P1.right) || input.pressed("KeyE")) {
    setTouchEditMode(false);
    state.settingsTab = (state.settingsTab + 1) % tabCount;
    state.settingsSel = 0;
    playSfx("ui_move");
  }

  if (state.settingsTab === 0 || state.settingsTab === 1) {
    const actions = state.settingsTab === 0 ? BIND_ACTIONS_P1 : BIND_ACTIONS_P2;
    const n = actions.length;
    if (input.pressed(BIND_P1.up)) {
      state.settingsSel = (state.settingsSel + n - 1) % n;
      playSfx("ui_move");
    }
    if (input.pressed(BIND_P1.down)) {
      state.settingsSel = (state.settingsSel + 1) % n;
      playSfx("ui_move");
    }
    if (confirmPressed(i) || i.attack) {
      const side = state.settingsTab === 0 ? 1 : 2;
      const action = actions[state.settingsSel].id;
      input.beginRebind(side, action);
      state.settingsFlash = `按下新键：${actions[state.settingsSel].label}（Esc 取消）`;
      playSfx("ui_ok");
      state.confirmLock = 8;
    }
    if (input.pressed("KeyR")) {
      resetBinds(state.settingsTab === 0 ? 1 : 2);
      state.settingsFlash = state.settingsTab === 0 ? "P1 键位已重置" : "P2 键位已重置";
      playSfx("ui_back");
      state.confirmLock = 10;
    }
  } else if (state.settingsTab === 2) {
    // Touch layout tab
    if (input.pressed(BIND_P1.up) || input.pressed(BIND_P1.down)) {
      state.settingsSel = state.settingsSel === 0 ? 1 : 0;
      playSfx("ui_move");
    }
    if (confirmPressed(i) || i.attack) {
      if (state.settingsSel === 0) {
        // Toggle edit / enable touch
        if (getControlMode() !== "touch") setControlMode("touch");
        const next = !isTouchEditMode();
        setTouchEditMode(next);
        state.settingsFlash = next
          ? "拖动虚拟键调整位置 · 再按确认结束"
          : "已保存触屏布局";
        playSfx("ui_ok");
      } else {
        resetTouchLayout();
        state.settingsFlash = "触屏布局已重置";
        playSfx("ui_back");
      }
      state.confirmLock = 12;
    }
    if (i.special || input.pressed("KeyT")) {
      setControlMode("touch");
      setTouchEditMode(false);
      state.settingsFlash = "已切换为触屏";
      playSfx("ui_ok");
      state.confirmLock = 10;
    }
    if (input.pressed("KeyK")) {
      setControlMode("keyboard");
      setTouchEditMode(false);
      state.settingsFlash = "已切换为键盘";
      playSfx("ui_ok");
      state.confirmLock = 10;
    }
  } else {
    // Account tab — J sync cloud; P/K password
    if (confirmPressed(i)) {
      playSfx("ui_ok");
      state.settingsFlash = "正在同步帐号到云端…";
      state.confirmLock = 20;
      (async () => {
        const pull = await syncAccountsFromCloud(accountCloudIo);
        const push = await pushAccountsToCloud(accountCloudIo);
        if (pull.ok || push.ok) {
          state.settingsFlash = getCloudStatus()?.message || "云端同步完成";
          playSfx("ui_ok");
        } else {
          state.settingsFlash = push.error || pull.error || "同步失败";
          playSfx("ui_back");
        }
      })();
    } else if (i.special || input.pressed("KeyP") || input.pressed("KeyK")) {
      playSfx("ui_ok");
      openPasswordFromSettings();
      state.confirmLock = 12;
    }
  }

  if (input.backPressed()) {
    playSfx("ui_back");
    input.cancelRebind();
    setTouchEditMode(false);
    goToTitle({ syncMusic: false });
    state.confirmLock = 12;
  }
}

function drawSettings() {
  const tabs = ["P1 键位", "P2 键位", "触屏", "账号"];
  ctx.textAlign = "center";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("SETTINGS", W / 2, 64);

  tabs.forEach((t, i) => {
    const x = 160 + i * 240;
    const sel = state.settingsTab === i;
    ctx.fillStyle = sel ? "rgba(255,107,44,0.2)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(x - 100, 88, 200, 40);
    ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x - 100, 88, 200, 40);
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillStyle = sel ? "#fff" : "#8b9bb0";
    ctx.fillText(t, x, 114);
  });

  if (state.settingsFlash) {
    ctx.font = "13px 'Share Tech Mono'";
    ctx.fillStyle = input.isRebinding() ? "#ffd166" : "#6dffb0";
    ctx.fillText(state.settingsFlash, W / 2, 150);
  }

  if (state.settingsTab === 0 || state.settingsTab === 1) {
    const actions = state.settingsTab === 0 ? BIND_ACTIONS_P1 : BIND_ACTIONS_P2;
    const binds = state.settingsTab === 0 ? BIND_P1 : BIND_P2;
    const col = 2;
    const startY = 180;
    actions.forEach((a, i) => {
      const colI = i % col;
      const row = Math.floor(i / col);
      const x = 220 + colI * 420;
      const y = startY + row * 36;
      const sel = state.settingsSel === i;
      ctx.textAlign = "left";
      ctx.font = "12px 'Share Tech Mono'";
      ctx.fillStyle = sel ? "#ffd166" : "#8b9bb0";
      ctx.fillText(`${sel ? "› " : "  "}${a.label}`, x, y);
      ctx.fillStyle = sel ? "#fff" : "#6b7c90";
      ctx.fillText(formatBindCode(binds[a.id]), x + 160, y);
    });
    ctx.textAlign = "center";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText("W/S 选择 · J 改键 · R 重置 · Q/E 切页 · ESC 返回", W / 2, 690);
  } else if (state.settingsTab === 2) {
    const mode = getControlMode() || "未选";
    const modeLabel = mode === "touch" ? "触屏" : mode === "keyboard" ? "键盘" : "未选择";
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(`当前控制：${modeLabel}${isTouchCapable() ? " · 本机支持触屏" : ""}`, W / 2, 190);

    const rows = [
      { label: isTouchEditMode() ? "结束调整并保存" : "调整触屏按键位置", sub: "进入后拖动虚拟键" },
      { label: "重置触屏布局", sub: "恢复默认位置" },
    ];
    rows.forEach((r, i) => {
      const y = 260 + i * 90;
      const sel = state.settingsSel === i;
      ctx.fillStyle = sel ? "rgba(255,107,44,0.15)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(W / 2 - 280, y - 36, 560, 78);
      ctx.strokeStyle = sel ? "#ff6b2c" : "#2a3544";
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 280, y - 36, 560, 78);
      ctx.font = "14px 'Press Start 2P'";
      ctx.fillStyle = sel ? "#fff" : "#8b9bb0";
      ctx.fillText(r.label, W / 2, y);
      ctx.font = "13px 'Share Tech Mono'";
      ctx.fillStyle = "#6b7c90";
      ctx.fillText(r.sub, W / 2, y + 24);
    });

    ctx.font = "12px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText("快捷：T 切触屏 · K 切键盘 · J 确认当前项", W / 2, 480);
    ctx.fillText("触屏设备会询问一次；接上键盘时也会再问是否切换", W / 2, 510);
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText("W/S 选择 · Q/E 切页 · ESC 返回", W / 2, 690);
  } else {
    const acc = getCurrentAccount();
    ctx.textAlign = "left";
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("当前账号", 200, 200);
    ctx.font = "16px 'Share Tech Mono'";
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(accountDisplayName() || "—", 200, 240);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#8b9bb0";
    ctx.fillText(`角色：${acc?.label || acc?.role || "—"}`, 200, 280);
    const cloud = getCloudStatus();
    const target = resolveCloudTarget();
    const cloudLine =
      cloud?.message ||
      (target.kind === "local" ? "本地服务器帐号库" : "公网云端帐号库");
    ctx.fillStyle = cloud?.ok === false ? "#ff8fab" : cloud?.ok ? "#6dffb0" : "#8b9bb0";
    ctx.fillText(`云端：${cloudLine}`, 200, 314);
    ctx.fillStyle = "#6b7c90";
    ctx.fillText(`通道 ${target.kind} · 待同步队列 ${cloudQueueLength()} · J 立即同步`, 200, 338);

    ctx.fillStyle = "rgba(255,107,44,0.12)";
    ctx.fillRect(200, 370, 880, 120);
    ctx.strokeStyle = "#ff6b2c";
    ctx.lineWidth = 2;
    ctx.strokeRect(200, 370, 880, 120);
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("修改密码", 230, 420);
    ctx.font = "14px 'Share Tech Mono'";
    ctx.fillStyle = "#cfd8e6";
    const tip =
      acc?.role === "admin" || acc?.role === "tester"
        ? "管理员 / 测试帐号不强制改密，可在此自愿修改。"
        : "普通玩家首次登录须改密；改密会同步到云端（仅哈希）。";
    ctx.fillText(tip, 230, 454);
    ctx.fillStyle = "#6dffb0";
    ctx.fillText("P / K 打开改密 · 只存用户名+密码哈希，不存明文", 230, 486);

    ctx.textAlign = "center";
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillStyle = "#6b7c90";
    ctx.fillText("Q/E 分页 · ESC 返回标题", W / 2, 680);
  }
}


function openPasswordFromSettings() {
  state.passwordReturnTo = "settings";
  showChangePasswordPanel();
  const sub = document.querySelector("#auth-change .auth-sub");
  if (sub) {
    const acc = getCurrentAccount();
    sub.textContent =
      acc?.role === "admin" || acc?.role === "tester"
        ? "管理员 / 测试帐号可自愿改密（非强制）。"
        : "修改后写入本地，并同步用户名与密码哈希到云端。";
  }
  const logoutBtn = document.getElementById("auth-logout-btn");
  if (logoutBtn) logoutBtn.textContent = "返回设置";
}

function authPanelVisible() {
  const login = document.getElementById("auth-login");
  const change = document.getElementById("auth-change");
  const reg = document.getElementById("auth-register");
  return !!(login && !login.classList.contains("hidden")) ||
    !!(change && !change.classList.contains("hidden")) ||
    !!(reg && !reg.classList.contains("hidden"));
}

function setAuthMsg(elId, text, ok = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("ok", !!ok);
}

function hideAuthPanels() {
  for (const id of ["auth-login", "auth-change", "auth-register"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  }
}

function showLoginPanel() {
  hideAuthPanels();
  const panel = document.getElementById("auth-login");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  setAuthMsg("auth-login-msg", "");
  const invite = document.getElementById("auth-invite");
  const pass = document.getElementById("auth-pass");
  if (pass) pass.value = "";
  if (invite) {
    invite.value = "";
    setTimeout(() => invite.focus(), 30);
  }
  state.screen = "login";
  hideHud();
}

function showRegisterPanel() {
  hideAuthPanels();
  const panel = document.getElementById("auth-register");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  setAuthMsg("auth-register-msg", "");
  for (const id of ["auth-reg-user", "auth-reg-pass", "auth-reg-pass2"]) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }
  setTimeout(() => document.getElementById("auth-reg-user")?.focus(), 30);
  state.screen = "register";
  hideHud();
}

function showChangePasswordPanel() {
  hideAuthPanels();
  const panel = document.getElementById("auth-change");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  setAuthMsg("auth-change-msg", "");
  const user = document.getElementById("auth-change-user");
  if (user) user.textContent = accountDisplayName();
  for (const id of ["auth-old", "auth-new", "auth-new2"]) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }
  setTimeout(() => document.getElementById("auth-old")?.focus(), 30);
  state.screen = "changePassword";
  hideHud();
}

function enterGameAfterAuth() {
  hideAuthPanels();
  const back = state.passwordReturnTo || "title";
  state.passwordReturnTo = "title";
  const logoutBtn = document.getElementById("auth-logout-btn");
  if (logoutBtn) logoutBtn.textContent = "退出登录";
  if (back === "settings") {
    state.screen = "settings";
    state.settingsFlash = "密码已更新";
    state.confirmLock = 20;
    syncLobbyMusic();
    return;
  }
  goToTitle({ syncMusic: false });
  state.confirmLock = 20;
  syncLobbyMusic();
}

function doLogout() {
  state.logoutConfirm = false;
  logout();
  hideAuthPanels();
  stopLobbyMusic();
  showLoginPanel();
}

/** Leave a play session → title, keep login. */
function exitPlayToTitle() {
  closeOnlineSession();
  state.match = null;
  state.tutorial = null;
  state.story = null;
  state.campaign = null;
  hideHud();
  hideAuthPanels();
  goToTitle({ syncMusic: false });
  state.confirmLock = 20;
  syncLobbyMusic();
}

async function submitLogin() {
  if (state.authBusy) return;
  const invite = document.getElementById("auth-invite")?.value || "";
  const pass = document.getElementById("auth-pass")?.value || "";
  state.authBusy = true;
  const btn = document.getElementById("auth-login-btn");
  if (btn) btn.disabled = true;
  setAuthMsg("auth-login-msg", "验证中…");
  try {
    const res = await loginWithInvite(invite, pass);
    if (!res.ok) {
      setAuthMsg("auth-login-msg", res.error || "登录失败");
      playSfx("ui_back");
      return;
    }
    playSfx("ui_ok");
    unlockAudio();
    if (res.mustChangePassword) showChangePasswordPanel();
    else enterGameAfterAuth();
  } finally {
    state.authBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function submitRegister() {
  if (state.authBusy) return;
  const user = document.getElementById("auth-reg-user")?.value || "";
  const pass = document.getElementById("auth-reg-pass")?.value || "";
  const pass2 = document.getElementById("auth-reg-pass2")?.value || "";
  state.authBusy = true;
  const btn = document.getElementById("auth-register-btn");
  if (btn) btn.disabled = true;
  setAuthMsg("auth-register-msg", "注册并同步云端…");
  try {
    const res = await registerAccount(user, pass, pass2);
    if (!res.ok) {
      setAuthMsg("auth-register-msg", res.error || "注册失败");
      playSfx("ui_back");
      return;
    }
    playSfx("ui_ok");
    unlockAudio();
    if (res.cloudSynced === false) {
      setAuthMsg("auth-register-msg", res.cloudError || "已注册，云端稍后同步");
      await new Promise((r) => setTimeout(r, 700));
    }
    enterGameAfterAuth();
  } finally {
    state.authBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function submitChangePassword() {
  if (state.authBusy) return;
  const oldPass = document.getElementById("auth-old")?.value || "";
  const newPass = document.getElementById("auth-new")?.value || "";
  const new2 = document.getElementById("auth-new2")?.value || "";
  state.authBusy = true;
  const btn = document.getElementById("auth-change-btn");
  if (btn) btn.disabled = true;
  setAuthMsg("auth-change-msg", "保存并同步云端…");
  try {
    const res = await changePassword(oldPass, newPass, new2);
    if (!res.ok) {
      setAuthMsg("auth-change-msg", res.error || "修改失败");
      playSfx("ui_back");
      return;
    }
    setAuthMsg(
      "auth-change-msg",
      res.cloudSynced === false ? "密码已更新（云端稍后同步）" : "密码已更新并已同步",
      true
    );
    playSfx("ui_ok");
    setTimeout(() => enterGameAfterAuth(), 450);
  } finally {
    state.authBusy = false;
    if (btn) btn.disabled = false;
  }
}

function bindAuthUi() {
  document.getElementById("auth-login-btn")?.addEventListener("click", () => {
    submitLogin();
  });
  document.getElementById("auth-register-btn")?.addEventListener("click", () => {
    submitRegister();
  });
  document.getElementById("auth-goto-register")?.addEventListener("click", () => {
    playSfx("ui_move");
    showRegisterPanel();
  });
  document.getElementById("auth-goto-login")?.addEventListener("click", () => {
    playSfx("ui_back");
    showLoginPanel();
  });
  document.getElementById("auth-change-btn")?.addEventListener("click", () => {
    submitChangePassword();
  });
  document.getElementById("auth-logout-btn")?.addEventListener("click", () => {
    playSfx("ui_back");
    if (state.passwordReturnTo === "settings") {
      hideAuthPanels();
      state.passwordReturnTo = "title";
      const logoutBtn = document.getElementById("auth-logout-btn");
      if (logoutBtn) logoutBtn.textContent = "退出登录";
      state.screen = "settings";
      syncLobbyMusic();
      return;
    }
    doLogout();
  });
  const onEnter = (fn) => (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      fn();
    }
  };
  document.getElementById("auth-invite")?.addEventListener("keydown", onEnter(submitLogin));
  document.getElementById("auth-pass")?.addEventListener("keydown", onEnter(submitLogin));
  document.getElementById("auth-reg-user")?.addEventListener("keydown", onEnter(submitRegister));
  document.getElementById("auth-reg-pass")?.addEventListener("keydown", onEnter(submitRegister));
  document.getElementById("auth-reg-pass2")?.addEventListener("keydown", onEnter(submitRegister));
  document.getElementById("auth-old")?.addEventListener("keydown", onEnter(submitChangePassword));
  document.getElementById("auth-new")?.addEventListener("keydown", onEnter(submitChangePassword));
  document.getElementById("auth-new2")?.addEventListener("keydown", onEnter(submitChangePassword));
}

function bindOnlineJoinUi() {
  const inputEl = document.getElementById("online-join-input");
  const go = document.getElementById("online-join-go");
  const back = document.getElementById("online-join-back");
  if (inputEl) {
    inputEl.readOnly = true;
    inputEl.addEventListener("pointerdown", (ev) => {
      // Clicking the field enters edit mode (and allows mobile keyboard)
      if (state.screen !== "onlineJoin") return;
      if (!state.onlineJoinEditing) {
        ev.preventDefault();
        startOnlineJoinEditing();
      }
    });
    inputEl.addEventListener("focus", () => {
      if (state.screen !== "onlineJoin") {
        inputEl.blur();
        return;
      }
      if (!state.onlineJoinEditing) {
        // Focus without edit flag (e.g. autofill) — treat as enter edit
        state.onlineJoinEditing = true;
        document.getElementById("online-join-panel")?.classList.add("editing");
        inputEl.readOnly = false;
        state.onlineStatusLine = "输入中 · Esc 退出输入";
      }
    });
    inputEl.addEventListener("blur", () => {
      // Keep editing flag until Esc / back; blur alone (tap outside) also exits input
      if (state.onlineJoinEditing) {
        // slight delay so clicking Join still works before blur clears edit
        setTimeout(() => {
          if (document.activeElement === inputEl) return;
          if (state.screen !== "onlineJoin") return;
          // Stay in editing if user clicked Join/Back inside panel — those handlers run first
          const ae = document.activeElement;
          if (ae && ae.closest && ae.closest(".online-join-panel")) return;
          stopOnlineJoinEditing();
        }, 120);
      }
    });
    inputEl.addEventListener("input", () => {
      if (!state.onlineJoinEditing) return;
      const v = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (inputEl.value !== v) inputEl.value = v;
      state.onlineJoinCode = v;
    });
    inputEl.addEventListener("keydown", (ev) => {
      if (!state.onlineJoinEditing) {
        ev.preventDefault();
        return;
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        stopOnlineJoinEditing();
        playSfx("ui_back");
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        state.onlineJoinCode = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        onlineJoinRoom();
      }
    });
  }
  go?.addEventListener("click", () => {
    unlockAudio();
    if (!state.onlineJoinEditing) {
      startOnlineJoinEditing();
      return;
    }
    if (inputEl) {
      state.onlineJoinCode = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    }
    onlineJoinRoom();
  });
  back?.addEventListener("click", () => {
    unlockAudio();
    playSfx("ui_back");
    if (state.onlineJoinEditing) {
      stopOnlineJoinEditing();
      state.confirmLock = 12;
      return;
    }
    closeOnlineSession();
    state.onlineJoinCode = "";
    state.onlineJoinEditing = false;
    state.screen = "onlineLobby";
    state.confirmLock = 12;
    syncOnlineJoinPanel();
  });
}

async function bootstrapAuth() {
  loadBinds();
  initTouch(input, canvas);
  bindAuthUi();
  bindOnlineJoinUi();
  // Seed locally, then pull/push username + passHash to cloud
  try {
    await syncAccountsWithCloud();
  } catch {
    await ensureSeedAccounts();
  }
  if (!isLoggedIn()) {
    showLoginPanel();
    // Still allow control prompt on touch devices at login
    if (isTouchCapable() && !getControlMode()) {
      setTimeout(() => maybeAskTouchOnBoot(), 400);
    }
    return;
  }
  if (mustChangePasswordNow()) {
    state.passwordReturnTo = "title";
    showChangePasswordPanel();
    return;
  }
  hideAuthPanels();
  goToTitle();
  if (isTouchCapable() && !getControlMode()) {
    setTimeout(() => maybeAskTouchOnBoot(), 500);
  } else if (getControlMode()) {
    updateTouchForScreen(state.screen);
  }
}

loop();
Promise.all([loadAssets(), loadAudio(), probeLobbyMusic(), bootstrapAuth()]).then(() => {
  state.assetsReady = true;
  syncLobbyMusic();
});

window.addEventListener("pointerdown", (e) => {
  unlockAudio();
  const t = e.target;
  if (t && t.closest && (t.closest(".auth-panel") || t.closest(".control-prompt") || t.closest(".touch-btn") || t.closest(".online-join-panel"))) {
    return;
  }
  if (authPanelVisible() || isControlPromptVisible()) return;

  // Title: tap to enter
  if (getControlMode() === "touch" && state.screen === "title") {
    pendingTitleTap = true;
    return;
  }

  // Online lobby / host: tap rows or room code (works for mouse + touch)
  if (state.screen === "onlineLobby" || state.screen === "onlineHost") {
    const p = clientToGame(e.clientX, e.clientY);
    if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return;
    if (state.screen === "onlineLobby") {
      for (let i = 0; i < 2; i++) {
        const y = 220 + i * 110;
        if (p.x >= W / 2 - 280 && p.x <= W / 2 + 280 && p.y >= y - 40 && p.y <= y + 50) {
          state.onlineLobbySel = i;
          playSfx("ui_ok");
          if (i === 0) openOnlineHostScreen();
          else openOnlineJoinScreen();
          return;
        }
      }
    } else if (state.screen === "onlineHost" && !state.onlineBusy) {
      if (state.online?.roomCode && p.y >= 230 && p.y <= 320) {
        copyRoomCode();
      } else if (!state.online?.roomCode && p.y >= 250 && p.y <= 400) {
        onlineCreateRoom();
      }
    }
  }
});
window.addEventListener("keydown", unlockAudio, { once: false });
