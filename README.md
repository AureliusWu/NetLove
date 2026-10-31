# “网”恋 / NetLove

<!-- project-badges:start -->
[![Version](https://img.shields.io/github/v/tag/AureliusWu/NetLove?sort=semver&style=flat-square&label=version)](https://github.com/AureliusWu/NetLove/tags) [![Build](https://github.com/AureliusWu/NetLove/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/AureliusWu/NetLove/actions/workflows/build.yml) [![Last commit](https://img.shields.io/github/last-commit/AureliusWu/NetLove?style=flat-square)](https://github.com/AureliusWu/NetLove/commits/main) [![License](https://img.shields.io/github/license/AureliusWu/NetLove?style=flat-square)](LICENSE)
<!-- project-badges:end -->

当前正式版：`1.1.1`。PWA + Windows 安装版 / 便携版。

> 那年，城市按下暂停。你却出现在我的消息里。

2020 年架空城市“梧城”的互动小说。二十三岁的周既明在社区互助群中认识谢听禾与许弥，好友申请、通话、误传照片、离线夜晚与线下邀约通向不同关系结局。

[在线游玩 / 安装 PWA](https://aureliuswu.github.io/NetLove/) · [v1.1.1 Release](https://github.com/AureliusWu/NetLove/releases/tag/v1.1.1)

## 当前内容

- 五章、43 个场景、6 次选择、288 条路线与 4 种结局。
- 五位角色图鉴、城市背景与事件 CG。
- 220 条人物对白离线语音，支持历史重听、自动阅读与独立音量。
- 自动 / 手动存档、已读回看和 JSON 阅读备份。
- PWA 与 Windows 双端；完整缓存后支持离线游玩。

## 开发与验证

```bash
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

Windows：`npm run desktop:win`。

## AI / 维护者入口

修改前先读 [AGENTS.md](AGENTS.md)。

- 剧情唯一来源：`src/story/story.json`。
- 人物与故事：`docs/STORY.md`、`docs/CHARACTERS.md`。
- 架构与状态：`docs/ARCHITECTURE.md`、`docs/STATUS.md`。
- 跨仓制作：`docs/production/VN-WORKFLOW-R1.md`、`docs/production/SHARED-VN.md`。
- 当前发行与机器证据：GitHub Release 与 `docs/production/`。

保持场景 / 台词 ID、`netlove-v1` 存档身份与项目专属素材来源。未实际执行的真人试听、实体设备或创作审读不能写成已通过。历史发布、共存复验和逐轮验收不要重新堆进 README。

## License

代码与文本按仓库许可发布；字体、模型与声音来源保留各自许可和记录。