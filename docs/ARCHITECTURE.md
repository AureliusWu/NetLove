# 双端结构与存档

沿用 Project1（来源提交 99ff191db6c3f2e567ab74ea1346d502acba5eb6）的 React 19 / Vite / Electron 基础。复用 Test（来源提交 03cca7e3eacbaf29e65aee19f9c94c982f5ec04f）的单一剧情事实来源、源图归档、完整路线与实际包验收方法。代码许可证 MIT；字体 SIL OFL 随两个客户端提供。

一份 JSON 剧情与 public 资源构建到 dist。PWA 的生成 Service Worker 原子缓存整个 dist；Windows 将相同 dist 放入 ASAR，渲染器禁用 Node、启用上下文隔离和 sandbox。运行游戏不调用模型、账号或服务器。

所有素材使用相对 BASE_URL，支持 GitHub Pages 子目录与 file 协议。PWA 首次联网完成缓存后支持断网重开，安装清单优先横屏，竖屏保留兼容布局。

NetLove 使用 game=netlove、storyVersion=netlove-v1、localStorage=netlove:v1、Electron appId=com.aureliuswu.netlove。自动存档和三个手动位独立，导出/导入 JSON 可迁移进度。

导入只接受本游戏、本故事、合法段落和可达选择序列；分数与历史由 engine.replay 重建，不信任文件提交的数据。章首和结局重读保存实际路线。台词变体由真实选择状态计算，稳定段落 ID 与位置不变。

音乐复用 Project1 的六首原创程序音序，并据梧城场景调整曲名；无新增录音、无角色配音。Web Audio 只在用户操作后启动，雨声与提示音可独立关闭。

开发：npm ci / npm run dev。生产：npm run build。Windows：npm run desktop:win。实际包检查：npm run test:desktop:packaged。全部生成物和依赖不入 Git。

技术参考：[Electron 安全](https://www.electronjs.org/docs/latest/tutorial/security/)、[MDN 离线缓存](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)、[Manifest orientation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/orientation)。
