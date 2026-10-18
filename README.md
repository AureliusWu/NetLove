# “网”恋 / NetLove

> 那年，城市按下暂停。你却出现在我的消息里。

**v0.3.0 声音与见面画面可玩预览，PWA + Windows 安装版 / 便携版。**

[在线游玩 / 安装PWA](https://aureliuswu.github.io/NetLove/) · [下载v0.3.0](https://github.com/AureliusWu/NetLove/releases/tag/v0.3.0) · [本版说明](docs/releases/v0.3.0.md) · [发布凭据](docs/production/PUBLISHED-v0.3.0.json)

2020年架空城市“梧城”，二十三岁的周既明在社区互助群中认识声音设计学生谢听禾与照相馆助理许弥。好友申请、首次通话、被误传的照片、离线的夜晚与线下邀约，通向两条感情结局、友情或认真道别。

五章、43场景、507段、六次选择、288条路线与四种结局。两位角色各六种表情、五处城市背景、两张分支事件CG、完整中文字体与跨端阅读备份。

## 本版声音与画面

- 谢听禾5句、许弥3句独立离线录音，覆盖首次通话与见面；播放器不需要模型、账号或语音服务。
- 本句和已读历史可重听，支持独立开关/音量；自动阅读等待语音，切后台或打开面板暂停，保持当前段落。
- 江边见面与照相馆空白信封各有事件CG，实际到达对应分支后解锁；重新开始仍保留已获画面。
- 阅读备份保留已读路线与画面证明；没有到达另一分支时，导入不能提前解锁其CG。
- 沿用netlove-v1 / netlove:v1和阅读备份schema 1，保留原场景、台词、路线与结局身份。

八句录音完成正文/请求/音频指纹、24个源/成品完整解码及8句独立ASR。真人听感与创作定案仍待体验。CG原始图片及哈希已恢复，原生成请求没有随原件保留；来源记录明确标注缺口。

## 游玩与备份

Windows安装版可选择安装位置；便携版直接启动。PWA先联网完成完整缓存后再断网，支持桌面、手机和横屏。底部阅读层提供存档、回看、自动、快进、隐藏、全屏与设置；界面透明度独立保存。

空格/Enter推进，H隐藏/恢复，S存档，L回看，A自动。旋转、隐藏和全屏保持段落；自动/快进在选择和章末停下。JSON阅读备份用于双端迁移，浏览器清理数据前请先导出。

## 工程验收

59项逻辑测试覆盖288条路线；52项完整浏览器检查覆盖配音、分支CG、阅读备份、打字暂停、离线与更新。Windows分别运行源码、win-unpacked真实EXE、NSIS同安装位置/同profile从v0.2.6升级，以及portable外层和其实际子程序，不能互相替代。

公开发行文件须与同次验收的原始工件逐字节一致，校验全部四份下载、三个SHA256SUMS条目和PWA ZIP CRC/文件清单。公开PWA以同次已测构建部署，另验入口/worker和三屏断网续读。精确运行编号与结果见[发布凭据](docs/production/PUBLISHED-v0.3.0.json)和[当前状态](docs/STATUS.md)。

本版保持可玩预览身份。真人试听、实体设备、普通电脑/中文路径/DPI与最终创作审阅单独记录。

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
