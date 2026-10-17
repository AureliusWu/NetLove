# “网”恋 v0.2.5 更新与推送闭环 — 2026-10-17

当前更新的源码推送、构建、发行附件和网页部署已完成核验，版本为 **v0.2.5（可玩预览 / prerelease）**。[发行页](https://github.com/AureliusWu/NetLove/releases/tag/v0.2.5) · [在线游玩](https://aureliuswu.github.io/NetLove/) · [机器回执](RELEASE-CLOSURE-20261017.json)。

| 环节 | 核验结果 |
| --- | --- |
| 主线 | 已审计 `main` 提交 `4974d8912a88ffa30d50a5e6614e8bd668276dc3`；无开放 PR，无尚未发布的玩家程序差异 |
| 发行身份 | `v0.2.5` → `8e4236ec4d3ee854fe4f7948734a554e5ee842eb`；公开且非草稿，prerelease 为 `true` |
| 下载 | 全部 4 份附件的字节数、SHA-256 与当前 GitHub digest 一致；3 条 checksum 记录一致 |
| 压缩包 | 1 个 ZIP 完整 CRC、路径和重复项检查通过 |
| 线上 | index.html 与离线 worker 共 2 份文件均为 HTTP 200，字节与已验证构建一致 |

已下载的 NetLove 四份公开文件重新计算摘要，与本轮重新读取的 GitHub digest 比较。逐份附件 ID、大小、摘要、检验方法及压缩包条目数保存在机器回执。入口与 worker 均与本版本公开 Web/PWA ZIP 中对应文件逐字节一致。

本轮及原版本的程序验证：v0.2.5 的 49 项逻辑（288 路线）、44 项浏览器、Windows 源码及实际 win-unpacked EXE 检查通过；三种视口的公开网页离线续读通过。证据见 [PUBLISHED-v0.2.5.json](PUBLISHED-v0.2.5.json) 和 [本轮实现/复验记录](READING-LIFECYCLE-20261017.md)。

| 必需工作流 | 结论 | 已验证提交 |
| --- | --- | --- |
| [Build NetLove](https://github.com/AureliusWu/NetLove/actions/runs/39004333641) | success | `8e4236ec4d3e` |
| [Publish NetLove PWA](https://github.com/AureliusWu/NetLove/actions/runs/39004628048) | success | `8e4236ec4d3e` |

该回执是在表中已审计主线之后追加的文档提交；原版本 tag、发行附件及玩家程序保持原有身份。闭环范围为本轮工程更新、推送、发行和线上一致性。安装器实际安装/升级、portable 封装器启动及实体设备体验保持独立待验；发行状态继续为 prerelease。
