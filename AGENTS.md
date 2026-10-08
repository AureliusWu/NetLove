# 《“网”恋》制作约定

阅读 docs/STORY.md、docs/CHARACTERS.md、docs/ARCHITECTURE.md、docs/production/SHARED-VN.md 和 docs/STATUS.md 后继续。

- 2020 年架空城市梧城，疫情时期的日常、匿名相识和线下关系。保留人物独立动机，具体行动推进冲突。
- 剧情唯一来源 src/story/story.json，场景和台词 ID 稳定；改结构需要存档迁移。独立 netlove-v1 与 netlove:v1，不接收其他项目存档。
- 复用 Project1 的 React/Electron 双端基础。PWA 优先横屏，全窗口背景与立绘，底部一体半透明阅读层；隐藏界面暂停且恢复不推进。
- 美术是内置图像生成工具制作的原创二维资源。原图、最终提示词、授权说明与 SHA-256 留档。编码转换保留 alpha，禁止滤镜冒充表情。
- docs/production/SHARED-VN.md 与 scripts/vn-contract.mjs 是三项目共用契约，更新时记录版本与哈希。引擎与人物素材不跨项目强行统一。
- 遍历全部路线并验证重放、非法存档、离线重开、横竖屏旋转。Windows 源码与实际包分别验收；未执行不记成功。
- 只维护 main，保留远端改动，不 force push。先验证再提交。保留真实断点和可复用经验。
