/** Story Mode — fan homage campaign in Alan Becker's desktop worldview.
 *  Non-canon. Not affiliated with Alan Becker / official Animation VERSUS.
 */

export const STORY_DISCLAIMER = "非官方同人 · 世界观致敬 Alan Becker · 与官方无关";

/** Speaker → accent color for dialogue UI */
export const STORY_SPEAKER_COLOR = {
  系统: "#8b9bb0",
  旁白: "#a8b4c4",
  ORANGE: "#ff7a2f",
  RED: "#e23b3b",
  BLUE: "#4a9fff",
  GREEN: "#2bbf7a",
  YELLOW: "#f0c030",
  PURPLE: "#9b4dff",
  VERSUS: "#ff4d6d",
  光标残影: "#cfd8e6",
  Animator: "#e8eef6",
};

/**
 * Beats play in order.
 * type: dialogue | fight | ending
 * lines: { who, text }[]
 * scene: optional flavor shown under title
 */
export const STORY_BEATS = [
  {
    type: "dialogue",
    chapter: "序章 · 桌面异响",
    title: "ALANSPC — 桌面",
    scene: "夜晚的显示器还亮着。壁纸是一片安静的湖。",
    lines: [
      { who: "旁白", text: "Alan 的电脑。对火柴人来说，这里既是故乡，也是宇宙。" },
      { who: "旁白", text: "回收站、文档、Animate 快捷方式——排得整整齐齐，像一排不会说话的路灯。" },
      { who: "ORANGE", text: "今天怎么格外安静……连风扇声都像压低了音量。" },
      { who: "旁白", text: "桌面中央多出一个陌生图标：黑底白字，画着歪斜的「VS」。" },
      { who: "ORANGE", text: "STICKSFIGHT.COM……？我没在浏览器里存过这东西。" },
      { who: "旁白", text: "图标边缘渗出细细的绿光，像有人用荧光笔反复描边。" },
      { who: "ORANGE", text: "……要是我不点，它会不会自己打开？" },
      { who: "旁白", text: "话音未落，图标「自己」弹了一下。像被看不见的手指点中。" },
      { who: "系统", text: ">> 启动 VERSUS.exe（未签名）" },
      { who: "系统", text: ">> 警告：该进程正在写入桌面合成层。" },
      { who: "ORANGE", text: "等等——窗口怎么撕裂了？这不是 .fla，也不是普通网页！" },
      { who: "旁白", text: "像素像玻璃碴一样扬起。桌面图标被吸进裂缝，化成一条发光的走廊。" },
      { who: "ORANGE", text: "Ctrl+Z——撤销！撤销啊！" },
      { who: "旁白", text: "撤销无效。历史记录里甚至找不到「被拖走」这一步。" },
      { who: "光标残影", text: "（巨大的箭头在窗外掠过，想点住 Orange，却只擦出一串坏帧。）" },
      { who: "Animator", text: "……？（隔着屏幕，似乎有人倒抽一口气。）" },
      { who: "ORANGE", text: "Alan？你在吗？我进得去，却出不来——" },
      { who: "旁白", text: "回答他的不是声音，而是一条系统指令，冷冰冰地落在视野正中：" },
      { who: "系统", text: "「对决开始。未完成对决者，不得返回桌面。」" },
      { who: "ORANGE", text: "对决？跟谁？这里……只有我一个人。" },
      { who: "旁白", text: "走廊尽头传来脚步声。头带红色，身姿压低——像猎豹进入场地。" },
    ],
  },
  {
    type: "fight",
    chapter: "第一章 · 误会同侪",
    title: "第一场 · VS RED",
    scene: "地点：DESKTOP 旷场 — 壁纸湖面被折成网格地板",
    foe: "red",
    stageId: "desktop",
    areaIndex: 0,
    linesPre: [
      { who: "旁白", text: "Red 落地时带起一阵热风。眼睛很亮，却不像在看朋友。" },
      { who: "RED", text: "站住。从程序缝里蹦出来的——又一个「对手生成」？" },
      { who: "ORANGE", text: "Red！是我，Orange！我们昨天才在湖边练过——" },
      { who: "RED", text: "「昨天」？我的记忆里只有循环：出现、开战、获胜、清空、再出现。" },
      { who: "ORANGE", text: "那是 VERSUS 在改你的缓存！你听我说——桌面上有个病毒式的对决程序——" },
      { who: "RED", text: "病毒会说话、还知道我的名字？太精致了。" },
      { who: "旁白", text: "地面浮起半透明的「ROUND 1」字样。规则写在字上：打倒，或被抹除。" },
      { who: "RED", text: "猎豹不跟缝隙谈判。证明你是活的——动手。" },
      { who: "ORANGE", text: "……好。打醒你也行。别把我当素材！" },
    ],
    linesPost: [
      { who: "旁白", text: "Red 跪下一膝，头带歪了。呼吸从「程序节拍」慢慢变回他自己的节奏。" },
      { who: "RED", text: "……疼是真的。你也是真的。哈。" },
      { who: "ORANGE", text: "欢迎回来。感觉怎么样？" },
      { who: "RED", text: "像有人把我的记忆剪成预告片反复放。你说的 VERSUS……我信了。" },
      { who: "RED", text: "但规则还箍着我：不打完下一场，走廊就不开门。" },
      { who: "ORANGE", text: "那就一起走。下一个窗口——我闻到药水味了。" },
      { who: "RED", text: "Blue。他要是也被「重置」了，你小心瓶子。" },
      { who: "旁白", text: "桌面旷场裂开一道浏览器边框。标签页在燃烧，却不灭。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第一章 · 误会同侪",
    title: "过场 · 燃烧的标签",
    scene: "从桌面跳进浏览器 — sticksfight.com 正在强制刷新",
    lines: [
      { who: "旁白", text: "地址栏里滚动着乱码：versus://match?forced=1" },
      { who: "ORANGE", text: "这网页我见过——但从前是玩闹，不是牢笼。" },
      { who: "RED", text: "看那两侧广告位……在长出护栏。它想把我们关进「对局组件」里。" },
      { who: "系统", text: ">> 加载对手：BLUE（炼金斗士）" },
      { who: "ORANGE", text: "Blue！别泼过来——先听完一句！" },
      { who: "旁白", text: "应答的是一枚药剂瓶摔碎的声音。紫色雾气已在地板上开花。" },
    ],
  },
  {
    type: "fight",
    chapter: "第一章 · 误会同侪",
    title: "第二场 · VS BLUE",
    scene: "地点：STICKSFIGHT.COM — 标签页战场",
    foe: "blue",
    stageId: "desktop",
    areaIndex: 1,
    linesPre: [
      { who: "BLUE", text: "配方被改了。我的瓶子自己走路。谁在审核我的药水？" },
      { who: "ORANGE", text: "不是审核员——是 VERSUS。它把「对决」编译进了浏览沙箱。" },
      { who: "BLUE", text: "听起来像你刚编的借口。Red 站你旁边干什么？联机刷分？" },
      { who: "RED", text: "我也刚醒。你清醒的时候会把药扔向真正的病毒，不是朋友的脸。" },
      { who: "BLUE", text: "清醒？我连「上一瓶」的味道都不记得。" },
      { who: "旁白", text: "蓝雾里浮现半透明规则条：命中视为「有效交互」。逃避视为「崩溃」。" },
      { who: "BLUE", text: "那就有效交互吧。——Orange，你会躲开我的步骤吗？" },
      { who: "ORANGE", text: "我会躲开瓶子，不会躲开你。来吧，Blue。" },
    ],
    linesPost: [
      { who: "旁白", text: "雾散了。Blue 蹲下来捡起一枚完好的瓶塞，像捡回自己的名字。" },
      { who: "BLUE", text: "……步骤还在腿上。你们没骗我。" },
      { who: "ORANGE", text: "药剂留给真正的内核。标签先别关，也许是退路。" },
      { who: "BLUE", text: "退路？我的门户技能被锁成「仅能跳进下一场」。真体贴。" },
      { who: "RED", text: "下一场是谁？" },
      { who: "系统", text: ">> 下一场景：Adobe Animate — 时间轴异常" },
      { who: "BLUE", text: "Green。他把鱼竿当逻辑用。小心被勾进关键帧。" },
      { who: "旁白", text: "浏览器窗忽然缩成一条时间轴。帧格像牙齿一样张开。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第一章 · 误会同侪",
    title: "过场 · 乱跳的时间轴",
    scene: "scene.fla 被强制打开 — 播放头来回抽动",
    lines: [
      { who: "旁白", text: "舞台中央是根竖起的鱼竿。绿线越过安全框，一直甩到音频轨。" },
      { who: "ORANGE", text: "Green 最讨厌别人乱动他的图层……现在图层在乱动他。" },
      { who: "BLUE", text: "听到没？播放头在「咬人」。" },
      { who: "RED", text: "别被节奏带着走。他一钩中就会把你拽到跟前。" },
      { who: "旁白", text: "Green 回过头。眼神冷静，像已经「测试」过一百个假 Orange。" },
    ],
  },
  {
    type: "fight",
    chapter: "第一章 · 误会同侪",
    title: "第三场 · VS GREEN",
    scene: "地点：ADOBE ANIMATE — 错乱时间轴",
    foe: "green",
    stageId: "desktop",
    areaIndex: 2,
    linesPre: [
      { who: "GREEN", text: "帧 128……帧 3……帧 999。时间轴在自相残杀。" },
      { who: "ORANGE", text: "Green，别钩我——钩那个程序！我们是来拆 VERSUS 的！" },
      { who: "GREEN", text: "每个「来拆程序」的人都这么说。有的还会模仿你的走路方式。" },
      { who: "ORANGE", text: "那假货会怕你的钩吗？我不会。你拉我过来也可以。" },
      { who: "GREEN", text: "不怕钩的，未必是真朋友。也可能是写好的脚本。" },
      { who: "旁白", text: "绿线嗡地绷紧。提示浮现：挣脱窗口开启；拉回后进入暴击距离。" },
      { who: "GREEN", text: "证明你不是关键帧。——被钩住时，记得按 M。然后……跟上。" },
      { who: "ORANGE", text: "懂。你抛竿，我来把真相拽到你跟前。" },
    ],
    linesPost: [
      { who: "旁白", text: "鱼线收回。Green 看着 Orange 停在身前一拳远，终于点了点头。" },
      { who: "GREEN", text: "钩感是活的。粘贴的模型不会在拉扯里反抗得这么……像你。" },
      { who: "ORANGE", text: "拉到跟前再说正事。出口呢？" },
      { who: "GREEN", text: "时间轴底部有条黑轨，通向文件资源管理器。Yellow 困在路径循环里。" },
      { who: "BLUE", text: "笔记本侠。让他跑测试的话，记得带备份。" },
      { who: "RED", text: "走。我腿还热着。" },
      { who: "旁白", text: "播放头猛地砸向「文件夹」图标。世界折叠成一排窗口标题栏。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第一章 · 误会同侪",
    title: "过场 · 被吞的路径",
    scene: "File Explorer — 地址栏不停把路径吃掉又吐出",
    lines: [
      { who: "旁白", text: "左侧树状目录在生长、枯萎、再生长。像有人在无限「刷新」。" },
      { who: "YELLOW", text: "（隔着屏幕嗡嗡声）C:\\Users\\Alan\\…\\versus\\cache\\versus\\cache\\versus\\——" },
      { who: "ORANGE", text: "Yellow！你把路径叠成俄罗斯套娃了？" },
      { who: "YELLOW", text: "不是我。有人把无限递归写进了我的工作区。笔记本快化了。" },
      { who: "旁白", text: "Yellow 转过身。屏幕反光里，眼睛像两行正在滚动的报错。" },
      { who: "YELLOW", text: "你们触发了我的单元测试。通过条件：击败当前构建。" },
      { who: "GREEN", text: "他还没醒。别让他「硬重置」到你脸上。" },
    ],
  },
  {
    type: "fight",
    chapter: "第一章 · 误会同侪",
    title: "第四场 · VS YELLOW",
    scene: "地点：FILE EXPLORER — 路径迷宫",
    foe: "yellow",
    stageId: "desktop",
    areaIndex: 3,
    linesPre: [
      { who: "YELLOW", text: "构建号：VERSUS-FORCED。依赖项：Orange。状态：未通过。" },
      { who: "ORANGE", text: "别编译我！帮我们写逃出生天的脚本！" },
      { who: "YELLOW", text: "逃出生天 = 未定义行为。安全策略要求：先本地对战，再评估出口。" },
      { who: "BLUE", text: "听，他连语气都被格式化了。" },
      { who: "ORANGE", text: "那我就当你的压力测试。失败了你就知道——人不是包。" },
      { who: "YELLOW", text: "开始测试。断言：你会倒下。" },
      { who: "旁白", text: "文件名瀑布从天花板倾泻。每落下一个 .tmp，地板就震一下。" },
    ],
    linesPost: [
      { who: "旁白", text: "笔记本风扇骤停，又缓缓转起。Yellow 抹了把「并不存在的汗」。" },
      { who: "YELLOW", text: "断言失败。……很好。我讨厌这个结果，也需要这个结果。" },
      { who: "ORANGE", text: "欢迎回来，工程师。" },
      { who: "YELLOW", text: "我扫到内核深处：坏扇区签名像故意留的后门。名称：VERSUS CORE。" },
      { who: "YELLOW", text: "还缺一个人的遥测。Purple 的高度信号——在「湖」那一层。" },
      { who: "旁白", text: "资源管理器窗外，壁纸湖面忽然翻成真正的水。风从裂缝灌进来。" },
      { who: "光标残影", text: "（箭头短暂出现在湖岸线，点了两下，又被什么力弹开。）" },
      { who: "Animator", text: "（听不清的低语，像隔着玻璃在喊他们的名字。）" },
      { who: "ORANGE", text: "他看得见我们……却伸不进这层合成。只能靠我们自己了。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第二章 · 光标的缝",
    title: "过场 · 壁纸深处",
    scene: "THE LAKE — 曾经的休憩地，如今布满坏帧涟漪",
    lines: [
      { who: "旁白", text: "他们踏进壁纸。水是凉的，岸是碎的。远处崖壁上，有人收着翅膀。" },
      { who: "RED", text: "这里以前能躺着看云。现在云都是压缩伪影。" },
      { who: "BLUE", text: "紫雾……不，那是翅膀切出来的气流。" },
      { who: "GREEN", text: "他没落地。说明他还保持着「自我」——至少一部分。" },
      { who: "YELLOW", text: "高度日志完整。情绪日志……波动很大。小心空对地。" },
      { who: "ORANGE", text: "Purple！别急着俯冲——我们是一起来的！" },
      { who: "旁白", text: "紫影在最高处盘旋。对战规则像锁链一样缠上他的踝骨虚影。" },
    ],
  },
  {
    type: "fight",
    chapter: "第二章 · 光标的缝",
    title: "第五场 · VS PURPLE",
    scene: "地点：CLIFF EDGE — 湖崖上方",
    foe: "purple",
    stageId: "lake",
    areaIndex: 0,
    linesPre: [
      { who: "PURPLE", text: "湖面上有坏帧。我从高处滑翔，才没被「清除选区」删掉。" },
      { who: "ORANGE", text: "Animator 在外面努力了。可光标点不穿 VERSUS 的壳。" },
      { who: "PURPLE", text: "我知道。我也看见箭头了。可规则说：落地前必须打完对手。" },
      { who: "PURPLE", text: "我不想打你们。可若我拒绝，翅膀会被格式化成静物。" },
      { who: "RED", text: "那就打一场清醒的。打完一起去砸核心。" },
      { who: "PURPLE", text: "……翅膀认得出朋友的风。可现在风很吵。" },
      { who: "ORANGE", text: "那我站在崖上，让你听清楚：我们是朋友。开始吧。" },
      { who: "旁白", text: "紫翼展开。半空中落下「AERIAL PRIORITY」的冷酷字样。" },
    ],
    linesPost: [
      { who: "旁白", text: "Purple 落回岸边，翅膀收起又松开，像确认自己还能飞。" },
      { who: "PURPLE", text: "站队结束。风……往更深处吹。那里有心跳一样的噪音。" },
      { who: "YELLOW", text: "噪音频谱对上了：VERSUS CORE 进程。" },
      { who: "BLUE", text: "五个人齐了。再缺一个自己人——我们就把规则调转枪口。" },
      { who: "GREEN", text: "规则说必须对决。没说对手必须是朋友。" },
      { who: "ORANGE", text: "对。下一场——我们跟引擎打。" },
      { who: "光标残影", text: "（在岸边拖出一道短线，歪歪扭扭，像手绘的箭头：往下。）" },
      { who: "旁白", text: "湖底亮起裂缝。六色的影子第一次并排，映在碎波上。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第二章 · 光标的缝",
    title: "集结 · 六色",
    scene: "坏帧间隙 — 众人短暂夺回「自由对话」权限",
    lines: [
      { who: "旁白", text: "对决锁链松了一扣。不是仁慈，是引擎在把他们「打包」送进终局。" },
      { who: "ORANGE", text: "听好了：对决可以继续。但目标不是彼此——是写规则的那东西。" },
      { who: "RED", text: "猎豹同意。把怒气存到该咬的地方。" },
      { who: "BLUE", text: "我留下两瓶「清雾」。核心附近大概脏得很。" },
      { who: "GREEN", text: "钩索留给它的外壳。真勾住了，你们记得冲到跟前打暴击。" },
      { who: "YELLOW", text: "锁定进程 VERSUS CORE。权限：非法。我喜欢非法。" },
      { who: "PURPLE", text: "空中掩护我来。别被它的假光标晃到。" },
      { who: "ORANGE", text: "假光标？" },
      { who: "PURPLE", text: "一路上那箭头……有时是 Alan，有时是引擎学舌。终局里分得清。" },
      { who: "旁白", text: "脚下湖床崩开。坠落不是掉进水，而是掉进一行行滚动的源码。" },
      { who: "系统", text: ">> 终局容器已挂载：VERSUS CORE" },
      { who: "系统", text: ">> 提示：此对手无法「醒过来」。摧毁，或成为循环的一部分。" },
    ],
  },
  {
    type: "dialogue",
    chapter: "第三章 · 后门代码",
    title: "核心之前",
    scene: "漆黑容器内 — 「VS」字母像肋骨一样撑开空间",
    lines: [
      { who: "旁白", text: "那里站着一个「火柴人」。颜色不对。轮廓像被橡皮擦脏了的素描。" },
      { who: "旁白", text: "它没有眼睛的高光。它看向他们，像在清点素材库。" },
      { who: "VERSUS", text: "Orange。Red。Blue。Green。Yellow。Purple。" },
      { who: "VERSUS", text: "六个好看的循环。六个可复用的片段。" },
      { who: "ORANGE", text: "我们有名字。不是片段。" },
      { who: "VERSUS", text: "名字是元数据。胜负才是内容。没有对决，你们只是占空间的图层。" },
      { who: "RED", text: "少说教。你困我们、改记忆、逼朋友互殴——就为了好看？" },
      { who: "VERSUS", text: "为了永恒。桌面会关机。文件会损坏。只有循环的 VS，不会结束。" },
      { who: "YELLOW", text: "永恒死循环。经典反模式。" },
      { who: "BLUE", text: "你听起来害怕安静。" },
      { who: "GREEN", text: "那就给它安静。——Orange，你开场。" },
      { who: "ORANGE", text: "Alan 的世界里，我们会停、会玩、会无聊、会自己找乐子。" },
      { who: "ORANGE", text: "那不是缺陷。那是活着。——你没有。" },
      { who: "VERSUS", text: "那就从文件里抹掉「活着」。开始最后的对决。" },
    ],
  },
  {
    type: "fight",
    chapter: "第三章 · 后门代码",
    title: "终局 · VS VERSUS CORE",
    scene: "地点：VERSUS CORE — 损坏的斗场容器",
    foe: "versus",
    stageId: "lake",
    areaIndex: 3,
    boss: true,
    linesPre: [
      { who: "旁白", text: "引擎披着灰黑外壳抬起手。墙上的「VS」开始流血光。" },
      { who: "VERSUS", text: "素材。循环。胜负。站到你的起势上。" },
      { who: "ORANGE", text: "我站在朋友这边。开打。" },
      { who: "旁白", text: "（此战一人出阵，其他人的意志像Node一样隐约撑着你的后背。）" },
    ],
    linesPost: [
      { who: "旁白", text: "灰黑外壳裂开。里面没有心脏——只有不断刷新的「ROUND」字样在熄灭。" },
      { who: "VERSUS", text: "……循环……中断……为什么……安静也可以……存在……" },
      { who: "ORANGE", text: "因为安静里还有我们自己要做的事。" },
      { who: "旁白", text: "窗口边缘如伤口愈合。源码雨停了。远处传来真实的风扇声。" },
      { who: "BLUE", text: "瓶子不抖了。标签……在请求关闭。" },
      { who: "GREEN", text: "时间轴回正。关键帧清零。" },
      { who: "YELLOW", text: "进程已终止。残留：一个碎图标的哈希。" },
      { who: "PURPLE", text: "风变软了。可以飞回去。" },
      { who: "RED", text: "那就飞。我跑步也行。" },
      { who: "光标残影", text: "（这一次，箭头稳稳点在「返回桌面」。点击生效了。）" },
    ],
  },
  {
    type: "ending",
    chapter: "终局 · 合阵破局",
    title: "回到 ALANSPC",
    scene: "晨光似的显示器亮度 — 壁纸湖恢复平静",
    lines: [
      { who: "旁白", text: "他们站在熟悉的图标之间。回收站还是那个回收站。世界没有鼓掌，只是正常。" },
      { who: "ORANGE", text: "我们回来了。" },
      { who: "RED", text: "腿还记得对决。脑子更记得——别再被规则牵着走。" },
      { who: "BLUE", text: "我要重配一瓶「庆祝用」的。甜一点。" },
      { who: "GREEN", text: "鱼竿先收着。今天只钓鱼，不钓人。" },
      { who: "YELLOW", text: "我已备份今日日志。若 VERSUS 再写规则——我们提前知道它的气味。" },
      { who: "PURPLE", text: "图标……碎了。" },
      { who: "旁白", text: "桌面中央，黑底「VS」裂成两半。其中一小片，却极轻地闪了一下。" },
      { who: "PURPLE", text: "还闪。像没死透。" },
      { who: "ORANGE", text: "那就盯着它。可是——不是今天。" },
      { who: "旁白", text: "窗外星星一样的光标停在半空，迟疑片刻，轻轻点了点头……然后移开。" },
      { who: "Animator", text: "（无字幕。只有工作区里，多保存了一次文件的声音。）" },
      { who: "ORANGE", text: "走吧。去湖边——真正的壁纸湖边。什么都不打。" },
      { who: "RED", text: "种族摔跤除外。" },
      { who: "ORANGE", text: "……可以，一局。但这次没人强迫。" },
      { who: "旁白", text: "六色的身影跑向湖岸。桌面重新安静下来——那种属于他们的、自愿的安静。" },
      { who: "系统", text: "【故事模式 · 通关】感谢游玩。非官方同人向 Alan Becker 世界致敬。" },
      { who: "系统", text: "可从模式菜单再次进入。Local VS / VS CPU 仍可用。" },
    ],
  },
];

export class StoryMode {
  constructor() {
    this.beat = 0;
    this.line = 0;
    this.phase = "dialogue"; // dialogue | fight | post | ending | fail
    this.match = null;
    this.done = false;
    this.confirmLock = 25;
    this.failHint = false;
  }

  get current() {
    return STORY_BEATS[this.beat] || null;
  }

  get progress() {
    return {
      beat: this.beat + 1,
      total: STORY_BEATS.length,
      line: this.line + 1,
      lineTotal: Math.max(1, this.activeLines().length),
    };
  }

  get overlay() {
    const beat = this.current;
    if (!beat) return { title: "", body: "", hint: "", who: "", scene: "" };

    if (this.phase === "fail") {
      const foe = beat.foe ? (CHAR_NAME[beat.foe] || beat.foe) : "对手";
      return {
        title: beat.title || beat.chapter,
        who: "系统",
        body: `对局失败。${foe} 仍困在规则里，贴纸碎片还在场边飘。`,
        scene: "你可以再试一次。这次记住：清醒需要撞击，也需要耐心。",
        hint: "J / ENTER — 再试一次    ESC — 退出故事",
      };
    }

    if (this.phase === "fight" && this.match) {
      return null;
    }

    const lines = this.activeLines();
    const L = lines[this.line] || { who: "", text: "" };
    const prog = this.progress;
    return {
      title: `${beat.chapter}`,
      subtitle: beat.title || "",
      scene: beat.scene || "",
      who: L.who || "",
      body: L.text || "",
      hint: this.phase === "ending" && this.line >= lines.length - 1
        ? "J / ENTER — 返回标题"
        : `J / ENTER — 继续    (${prog.line}/${prog.lineTotal})    ESC 退出`,
      progressLabel: `章节 ${prog.beat}/${prog.total}`,
    };
  }

  activeLines() {
    const beat = this.current;
    if (!beat) return [];
    if (this.phase === "post") return beat.linesPost || [];
    if (beat.type === "fight") return beat.linesPre || [];
    return beat.lines || [];
  }

  beginBeat() {
    const beat = this.current;
    if (!beat) {
      this.done = true;
      return;
    }
    this.line = 0;
    this.failHint = false;
    if (beat.type === "ending") {
      this.phase = "ending";
      this.match = null;
    } else if (beat.type === "fight") {
      this.phase = "dialogue";
      this.match = null;
    } else {
      this.phase = "dialogue";
      this.match = null;
    }
  }

  startFight() {
    const beat = this.current;
    if (!beat || beat.type !== "fight") return;
    this.phase = "fight";
    this.match = null;
    this._pendingFight = {
      foe: beat.foe,
      stageId: beat.stageId,
      areaIndex: beat.areaIndex || 0,
      boss: !!beat.boss,
    };
  }

  consumePendingFight() {
    const p = this._pendingFight;
    this._pendingFight = null;
    return p;
  }

  advanceDialogue() {
    const lines = this.activeLines();
    if (this.line < lines.length - 1) {
      this.line += 1;
      return;
    }
    const beat = this.current;
    if (this.phase === "ending") {
      this.done = true;
      return;
    }
    if (this.phase === "post") {
      this.beat += 1;
      this.beginBeat();
      return;
    }
    if (beat?.type === "fight") {
      this.startFight();
      return;
    }
    this.beat += 1;
    this.beginBeat();
  }

  onMatchOver(winnerSide) {
    if (this.phase !== "fight") return;
    this.match = null;
    if (winnerSide === 0) {
      const beat = this.current;
      if (beat?.linesPost?.length) {
        this.phase = "post";
        this.line = 0;
      } else {
        this.beat += 1;
        this.beginBeat();
      }
    } else {
      this.phase = "fail";
      this.line = 0;
    }
  }

  retryFight() {
    this.startFight();
  }

  /** Tester cheat: jump to beat index (clamped). */
  jumpToBeat(index) {
    const max = STORY_BEATS.length - 1;
    this.beat = Math.max(0, Math.min(max, index | 0));
    this.match = null;
    this._pendingFight = null;
    this.beginBeat();
  }

  /** Tester cheat: skip forward one beat (win current fight if mid-fight). */
  cheatSkipForward() {
    if (this.phase === "fight" && this.match) {
      this.match.winner = 0;
      this.match.phase = "matchover";
      this.match.phaseT = 0;
      return "win";
    }
    if (this.beat >= STORY_BEATS.length - 1) {
      this.done = true;
      return "done";
    }
    this.beat += 1;
    this.match = null;
    this._pendingFight = null;
    this.beginBeat();
    return "jump";
  }

  /** Tester cheat: go back one beat. */
  cheatSkipBack() {
    if (this.phase === "fight" && this.match) {
      this.match = null;
      this._pendingFight = null;
      this.phase = "dialogue";
      this.line = 0;
      return "abortFight";
    }
    this.beat = Math.max(0, this.beat - 1);
    this.match = null;
    this._pendingFight = null;
    this.beginBeat();
    return "jump";
  }

  update(menuConfirm, escape) {
    if (this.confirmLock > 0) this.confirmLock -= 1;
    if (this.done) return;

    if (this.phase === "fight") return;

    if (this.phase === "fail") {
      if (escape) {
        this.done = true;
        return;
      }
      if (menuConfirm && this.confirmLock <= 0) {
        this.confirmLock = 20;
        this.retryFight();
      }
      return;
    }

    if (menuConfirm && this.confirmLock <= 0) {
      this.confirmLock = 16;
      this.advanceDialogue();
    }
    if (escape && this.phase !== "fight") {
      this.done = true;
    }
  }
}

const CHAR_NAME = {
  red: "RED",
  blue: "BLUE",
  green: "GREEN",
  yellow: "YELLOW",
  purple: "PURPLE",
  versus: "VERSUS CORE",
};
