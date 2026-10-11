# 双端结构与存档

沿用 Project1（来源提交 99ff191db6c3f2e567ab74ea1346d502acba5eb6）的 React 19 / Vite / Electron 基础。复用 Test（来源提交 03cca7e3eacbaf29e65aee19f9c94c982f5ec04f）的单一剧情事实来源、源图归档、完整路线与实际包验收方法。代码许可证 MIT；字体 SIL OFL 随两个客户端提供。

一份 JSON 剧情与 public 资源构建到 dist。PWA 的生成 Service Worker 原子缓存整个 dist；Windows 将相同 dist 放入 ASAR，渲染器禁用 Node、启用上下文隔离和 sandbox。运行游戏不调用模型、账号或服务器。

所有素材使用相对 BASE_URL，支持 GitHub Pages 子目录与 file 协议。PWA 首次联网完成缓存后支持断网重开，安装清单优先横屏，竖屏保留兼容布局。

NetLove 使用 game=netlove、storyVersion=netlove-v1、localStorage=netlove:v1、Electron appId=com.aureliuswu.netlove。自动存档和三个手动位独立，导出/导入 JSON 可迁移进度。

导入只接受本游戏、本故事、合法段落和可达选择序列；分数与历史由 engine.replay 重建，不信任文件提交的数据。章首和结局重读保存实际路线。台词变体由真实选择状态计算，稳定段落 ID 与位置不变。

音乐复用 Project1 的六首原创程序音序，并据梧城场景调整曲名；无新增录音、无角色配音。Web Audio 只在用户操作后启动，雨声与提示音可独立关闭。

开发：npm ci / npm run dev。生产：npm run build。Windows：npm run desktop:win。实际包检查：npm run test:desktop:packaged。全部生成物和依赖不入 Git。

v0.1.1 的缓存身份由归一化资源相对路径、长度与内容共同生成，缓存名带完整 registration.scope。同源不同路径的安装互不清理；旧版没有 scope 标识的缓存保留，因为无法准确判定其所属安装。离线完成只认本作品注册中已 activated 的 Worker，父路径其他 Worker 的 ready 不作为下载证明。更新不执行 skipWaiting，等所有游戏窗口关闭再接管。

共用制作契约 v1.1.0 服务 Rain、NetLove、Healing。`npm run test:materials` 校验共用文件哈希、素材来源与许可，`npm run check` 串行执行素材、逻辑、构建、浏览器检查。素材目录与导出约定见 [REUSABLE-MATERIALS](production/REUSABLE-MATERIALS.md)，作品专属图像不进入通用材料包。

桌面 smoke 使用独立临时 profile，静音、禁止抢焦点和任务栏入口，关闭测试模式的后台节流，实际验证 HTML 原生全屏进出与保存段落。全屏转换可能令系统短暂显示窗口；退出全屏后明确 hide，报告最后的 hiddenWindow 实测值，不能称为全过程无窗口。普通玩家的窗口焦点、任务栏、音频与后台节流采用默认行为。源码 smoke、win-unpacked EXE、安装/升级与公开 PWA 保持独立证据。

技术参考：[Electron 安全](https://www.electronjs.org/docs/latest/tutorial/security/)、[MDN 离线缓存](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)、[Manifest orientation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/orientation)。
