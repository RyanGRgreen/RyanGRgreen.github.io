# Stick VERSUS

Browser fan homage to the *Animation VERSUS* combat systems (Alan Becker / Animators VS Games). Not affiliated with the official game.

## Touch / 触屏

- 平板 / 手机等触屏设备会询问是否使用虚拟按键  
- 接上键盘时，若正在用触屏，会再询问是否改回键盘  
- **设置 → 触屏**：可拖动调整按键位置，或重置布局 / 手动切换触屏·键盘  

## Accounts / 帐号云同步

- 注册、改密会把 **用户名 + 密码哈希** 同步到云端（**不存明文密码**）
- 本地 `serve.py`：写入 `data/accounts-cloud.json`（`GET/PUT /api/accounts`）
- GitHub Pages / 公网：默认走 JSONBlob 公共库，电脑和手机可共用同一帐号
- 设置 → 账号：显示同步状态，按 **J** 立即同步

可在 `js/cloudConfig.js` 改 `CLOUD_OVERRIDE` 指向自建 Firebase / JSONBin。
1. 一方 **创建房间** → 得到 6 位房间号（可点号码复制）
2. 另一方 **加入房间** → 输入号码（手机有输入框）
3. 各自选角并准备 → 房主选场地开战

基于 PeerJS P2P（GitHub Pages 可用）+ STUN/TURN，主机演算、客机收状态。  
**双方需打开同一游戏网址**（例如 GitHub Pages；不要一边用 `127.0.0.1`、一边用公网除非你只在本机测）。手机流量与电脑 Wi‑Fi 一般也能连。

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
