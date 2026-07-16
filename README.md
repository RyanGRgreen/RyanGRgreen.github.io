# Stick VERSUS

Browser fan homage to the *Animation VERSUS* combat systems (Alan Becker / Animators VS Games). Not affiliated with the official game.

## Play

**一键启动（推荐）：**
- **macOS：** 双击 `启动游戏.command`
- **Windows：** 双击 **`StartGame.bat`**（或 `启动游戏.bat`）
  - 需要已安装 [Python 3](https://www.python.org/downloads/)，安装时勾选 **Add python.exe to PATH**
  - 会自动打开浏览器；改 `js` / `css` / `html` 后约 1 秒自动刷新（版本号实时更新）
  - 保持黑色窗口不要关；`Ctrl+C` 停止服务器
- **终端：** `./start.sh`（macOS/Linux）或 `python serve.py`

地址：http://127.0.0.1:9473/

（macOS 若提示无法打开：右键 → 打开，或执行 `chmod +x 启动游戏.command`）

### Audio / 音效
音效在 `assets/sfx/`。战斗命中、闪避、跳跃、Green 钩索（抛钩 / 勾中 / **收杆 hook_reel**）、菜单 UI 都会播。
`-` 键静音。把新的 `.wav` / `.ogg` / `.mp3` 丢进该文件夹，并在 `js/audio.js` 的 `SFX_FILES` 里登记即可。

**Quick start:** press **T** for the beginner tutorial, or **Enter** → choose TUTORIAL / STORY MODE.

## Looks & moves

| Stick | Look | Signature |
|-------|------|-----------|
| Orange | Hollow head + pencil | Rotating Pencil Toss, Drawn Hammer |
| Red | Solid head + yellow headband | Cheetah Rush / Tiger Upper |
| Blue | Solid blue | Potion / Mist / Portal / Breakdance |
| Green | Solid green + rod | Tipper yank / Zipline / Guitar chord |
| Yellow | Solid yellow + laptop | Compile Shot / Warp |
| Purple | Solid purple + elytra | Glide / Soar / Meteor Dive |

Every directional normal & special has its own named pose animation (callout above the fighter).

### Asset packs in use

- **Pixel Art VFX Impacts** → hit / block / KO / special sparks
- **Pixel UI pack 3** → HUD chrome feel (bars / diamonds)
- **32 Free Weapon Icons** → Orange drawn props + rotating projectiles

Poses are tuned against public Animation VERSUS / AvA descriptions (Kickstarter + wiki), not an official rip.
## Controls

| Action | P1 | P2 |
|--------|----|----|
| Move | WASD | Arrows |
| Jump | Space / W | Numpad 0 / Up |
| Attack | J | Numpad 1 |
| Special | K | Numpad 2 |
| Block | L | Numpad 3 |
| Node | U | Numpad 4 |
| Dodge | Shift | Numpad Enter |
| Slide (solo / VS CPU) | ↓ ArrowDown | — |

Perfect dodge (dodge into an active hitbox early) teleports behind the attacker and leaves afterimages. Hold **L+U** for omni Node Guard (shield bubble).

## Systems recreated

- Enclosed arenas, HP bars, first-to-3 Files
- Danger state (~1/3 HP) + wall smash KO
- Area travel after each File
- Directional block / Overhead / Node Guard
- Dodge + perfect dodge teleport
- Node techs: Throw, Crush, Jump, Instant-charge Special
- Six stick archetypes: Orange, Red, Blue, Green, Yellow, Purple
