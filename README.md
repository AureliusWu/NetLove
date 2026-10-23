> 2026-10-23：**v1.0.0 五章完整正式版候选**，新增标题 / 阅读中游玩帮助，发行改为草稿全部附件下载校验后公开。当前候选的平台与公开门禁见[本轮状态](docs/production/RELEASE-READINESS-20261022.json)及[本版说明](docs/releases/v1.0.0.md)；下面旧版结果保留为历史证据。

> 2026-10-21：**v0.5.0 全对白与完整角色素材预览版已发布**。220 条人物配音、五位角色和新结局 CG 已接入，Windows、58 项浏览器与公开 PWA 离线复验通过。见[发布凭据](docs/production/PUBLISHED-v0.5.0-full-media.json)和[下载](https://github.com/AureliusWu/NetLove/releases/tag/v0.5.0)。

> 2026-10-21：v0.4.1 引擎补丁通过本次 Windows、浏览器与公开离线验证；可玩预览已发布。详见[最终同步记录](docs/production/ENGINE-SYNC-20261021.md)。

> 2026-10-19：**v0.3.1 已发布**。按已读章节、说话人和关键词筛选，并保持原回看索引已完成；本次 Windows 实际运行、公开 PWA 三屏断网与字节核验通过。[发布凭据](docs/production/PUBLISHED-v0.3.1.json) · [下载](https://github.com/AureliusWu/NetLove/releases/tag/v0.3.1)。

# “网”恋 / NetLove

> 那年，城市按下暂停。你却出现在我的消息里。

**v1.0.0 五章完整正式版候选，PWA + Windows 安装版 / 便携版。**

[在线游玩 / 安装PWA](https://aureliuswu.github.io/NetLove/) · [下载v0.5.0](https://github.com/AureliusWu/NetLove/releases/tag/v0.5.0) · [本版说明](docs/releases/v0.5.0.md) · [发布凭据](docs/production/PUBLISHED-v0.5.0-full-media.json)

2020年架空城市“梧城”，二十三岁的周既明在社区互助群中认识声音设计学生谢听禾与照相馆助理许弥。好友申请、首次通话、被误传的照片、离线的夜晚与线下邀约，通向两条感情结局、友情或认真道别。

五章、43场景、507段、六次选择、288条路线与四种结局。五位角色图鉴、两位女主各六种表情、五处城市背景、四张事件 CG、完整中文字体与跨端阅读备份。

## 本版声音与画面

- 220 条人物对白绑定独立离线录音，覆盖五位角色、书面消息和条件变体；原 8 句关键录音保留，播放器不需要模型、账号或语音服务。
- 本句和已读历史可重听，支持独立开关/音量；自动阅读等待语音，切后台或打开面板暂停，保持当前段落。
- 江边见面、照相馆空白信封、友情线四碗面与告别线写给自己的信各有事件 CG，实际到达对应分支后解锁；重新开始仍保留已获画面。
- 阅读备份保留已读路线与画面证明；没有到达另一分支时，导入不能提前解锁其CG。
- 沿用netlove-v1 / netlove:v1和阅读备份schema 1，保留原场景、台词、路线与结局身份。

220 条录音完成正文 / 请求 / 音频指纹、完整解码与独立识别凭据校验。真人听感与创作定案仍待体验。恢复 CG 的原始图片及哈希已保存，缺失的原生成请求在来源记录中明确标注。

## 游玩与备份

标题页和阅读画面左上方的“帮助”提供完整操作、备份、回看、离线和更新说明。打开帮助暂停打字 / 自动 / 快进 / 当前语音，关闭后保留段落和打字位置并恢复入口焦点。

Windows安装版可选择安装位置；便携版直接启动。PWA先联网完成完整缓存后再断网，支持桌面、手机和横屏。底部阅读层提供存档、回看、自动、快进、隐藏、全屏与设置；界面透明度独立保存。

空格/Enter推进，H隐藏/恢复，S存档，L回看，A自动。旋转、隐藏和全屏保持段落；自动/快进在选择和章末停下。JSON阅读备份用于双端迁移，浏览器清理数据前请先导出。

## 工程验收

1.0.0 使用18项发行失败路径检查与新增8项帮助浏览器检查；全部本轮结果见[实施记录](docs/production/RELEASE-v1.0.0.md)和[当前门禁状态](docs/production/RELEASE-READINESS-20261022.json)。以下计数与链接属于已发布0.5.0基线，不能代替1.0.0平台结果。

67 项逻辑测试覆盖 288 条路线；58 项浏览器检查覆盖配音、分支 CG、角色图鉴、阅读备份、打字暂停、离线与更新。Windows 源码、ASAR 成品、实际安装升级和 portable 外层及其子程序分别通过。

公开发行文件须与同次验收的原始工件逐字节一致，校验全部四份下载、三个 SHA256SUMS 条目和 PWA ZIP CRC / 文件清单。公开 PWA 以同次已测构建部署，另验入口 / worker 和三屏断网续读。精确运行编号与结果见 [发布凭据](docs/production/PUBLISHED-v0.5.0-full-media.json)、[2026-10-22 独立回读](docs/production/PUBLIC-READBACK-20261022.json) 和 [当前状态](docs/STATUS.md)。

上述0.5.0保持可玩预览身份。1.0.0完成本轮内容与工程门禁后以正式版标记发布。真人试听、实体设备、普通电脑/中文路径/DPI与最终创作审阅单独记录。

## 开发

Node.js 24：

```bash
npm ci
npm run dev
```

生产PWA：npm run build后运行npm run preview。Windows：npm run desktop:win。

```bash
node scripts/vn-contract.mjs src/story/story.json
npm run test:materials
npm test
python3 -m unittest discover -s scripts -p 'test_publish_release.py' -v
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:desktop
npm run test:desktop:packaged
```

npm run test:desktop:installed仅用于本仓临时Windows Actions运行器，实际执行安装/升级和portable外层；本机桌面测试使用独立临时profile。

## 制作方法与来源

[共享制作契约](docs/production/SHARED-VN.md) · [创作方法](docs/production/CREATIVE-PLAYBOOK.md) · [素材复用](docs/production/REUSABLE-MATERIALS.md) · [完整剧情](docs/STORY.md) · [人物设定](docs/CHARACTERS.md) · [架构](docs/ARCHITECTURE.md) · [资源来源](docs/production/ART-ASSETS.json)

本作采用React/Electron，保留自身故事和存档身份。带许可字体、加工模板与平台适配器按固定摘要复用；人物/场景原图按作品追溯，排除在通用导出包之外。代码与文本MIT，字体SIL OFL，Qwen模型许可与声音来源随项目记录。

[v0.2.6历史发布](docs/production/RELEASE-CLOSURE-20261018.md) · [v0.2.0电脑/手机预览](docs/previews/v0.2.0/README.md) · [完整验证记录](docs/VALIDATION.md)

## 四作共存复验

本次 v0.5.0 与 Circuit 1.7.0、Healing 1.3.0、Rain 1.5.0 完成同源共存和四站断网重开，1,248 条缓存与实际存档状态保留，页面错误为零。[本轮闭环](docs/production/FOUR-GAMES-CLOSURE-20261022.md)。

2026-10-19 的 v0.3.1 与 Circuit 1.5.2、Healing 1.1.1、Rain 1.3.1 在同一独立浏览器环境中共存，缓存和实际阅读进度保留，四站断网重开通过，页面错误为零。[历史回执与复用入口](docs/production/FOUR-GAMES-CLOSURE-20261019.md)。该历史结果不充当 v0.5.0 的共存验收。
