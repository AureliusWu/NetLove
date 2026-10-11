# 验证记录

2026-10-11 / v0.1.1 本地验证。

- `npm run check` exit 0：素材工具 5 项、Vitest 31 项、生产构建、Chromium 145.0.7632.6 的 14 项浏览器测试全部通过（1.1 分钟）。测试使用 NetLove 专属端口、自启严格端口服务，避免其他项目预览被误复用。
- 43 场景、507 段、288 条真实路线与四结局保持原有完整性。新增 PWA 单元覆盖路径摘要、文件长度边界、scope 缓存清理、安装批次失败、本作品激活才就绪、失败后重试与等待更新；浏览器验证父 scope 已 ready 仍能准确识别本作品下载失败、两条部署路径断网重开、关闭所有游戏页后新版接管并恢复存档与图像。
- 更新测试通过 scope 外页面观察旧客户端清空后再重开，避免“新版本仍合法 waiting、按钮改为有新版本”的测试竞争；没有改变产品的等待更新策略。
- `npm run desktop:win` 构建 NSIS 与 portable 成功。源码和实际 win-unpacked EXE 各自 `DESKTOP_SMOKE_OK`，version 0.1.1，packaged 分别 false/true；原有九项检查、真实 HTML 原生全屏入/退、end-tinghe 第 9 段 UI/磁盘存档保持，以及最终 hiddenWindow 均通过。smoke 静音、禁止抢焦点和任务栏入口，退出全屏后隐藏；原生全屏转换可能短暂显示，未宣称完全 headless。
- ASAR 内 20 个 dist 文件逐字节与最终已测构建相同，desktop main/smoke 脚本也一致。两个 EXE 与源码/包截图的 SHA-256、尺寸和字节写入 [LOCAL-VALIDATION-v0.1.1.json](production/LOCAL-VALIDATION-v0.1.1.json)。这些属于本机证据；CI 的发行资产应另记本次真实哈希，不假设与本机构建一致。
- 共用素材校验 13 项/36 文件，固定共用文本哈希 9 项；本地 `.reuse-kit/netlove-0.1.1-final` 导出 6 项/21 文件，所有导出哈希重新校验、7 项作品专属图像排除。CI 提供独立材料附件。
- 原始基线由 e331d25 的 git archive 隔离重建，与修改前的 cache/JS 身份及 4,272,913 字节一致；最终 dist 4,273,064 字节。三次成组测量及真实 dispatch 区分自动等待，结果与全部组见 [PERFORMANCE-v0.1.1.json](production/PERFORMANCE-v0.1.1.json)。小样本墙钟增长与下降均保留，最终 WARN；未给公开网络或实体设备性能结论。
- 新版 GitHub CI、公开 PWA 与实际安装/升级尚待独立凭据；不把 v0.1.0 的线上 PASS 借给 v0.1.1。没有修改正常玩家窗口设置、剧情、图像与存档标识。

## v0.1.0 历史发布验证

2026-10-08 / v0.1.0。

- 18 项 Vitest 检查通过；43 场景与全部 288 条完整路线可达，四结局齐全；完整路线、代表路线逐段重放与非法存档拒绝通过。
- 7 张源图完整解码，5 张 1672×941 背景，2 张 1024×1536 透明立绘。WebP 保持尺寸与立绘 alpha，源/产物 SHA-256 归档。
- 中文 Noto Serif SC 400 字重重新子集，覆盖 JSON 正文与界面，181,248 字节；授权随包。
- TypeScript 与 Vite 生产构建通过；完整资源原子缓存生成。
- 实际 Chromium 138 浏览器测试 8 项通过（两种设备各 4 项），54.5 秒。覆盖四结局、两位角色、自动存档/导入重放、章首/场景解锁、断网重开、568×320/844×390/412×915 旋转、透明度持久化和隐藏恢复。归档 22 张实机截图，JPEG 保留尺寸并绑定原 PNG 哈希。
- GitHub Actions 标准 Chromium 153.0.8010.12 的 8 项浏览器测试通过（49.2 秒），18 项逻辑检查与生产构建也通过。
- Windows x64 源码与 release/win-unpacked/网恋.exe 分别输出 DESKTOP_SMOKE_OK，版本均为 0.1.0，packaged 分别为 false/true；两次检查均验证剧情、自动存档、全窗口、隐藏恢复、渲染器隔离、两位角色、结局和归档。安装版与便携版构建成功，Windows 实机截图位于本次构建附件，源 PNG 哈希已记录。
- 构建流程 37743739256 的 web/windows/release 三个任务均成功；v0.1.0 为可玩初版 prerelease，包含两种 EXE、PWA ZIP 和 SHA256SUMS.txt，源提交 aacc7dd064315b9620343a18c737c64dec02cbb0。已发布版本不覆盖。
- Pages 发布流程 37744179101 成功。公开 https://aureliuswu.github.io/NetLove/ 的实际 Chromium 138 验证通过：HTTP 200、横屏 PWA manifest、正确 /NetLove/ scope、18 项缓存含立绘/背景/字体；断网刷新后从第 1 段恢复，图像正常且没有页面脚本错误。该检查使用工作环境代理的固定根证书公钥，不改变游戏的网络或安全配置。
- 完整构建/发布凭据见 [BUILD-v0.1.0.json](production/BUILD-v0.1.0.json)，公开地址缓存记录见 [PUBLIC-PWA-v0.1.0.json](production/PUBLIC-PWA-v0.1.0.json)。
- 复用回馈已提交到 Project1（4a79d30e90bea1f4e98e6838c6907e9839638b59）和 Test（72d1389af407aa103f696bba4df1f9e5c0b466e5）；共用契约/脚本的三仓哈希一致。Project1 的 31 项检查与生产构建通过；Test 共用脚本检查 26 节点、539 段、4 次选择与 2 个结局，其原生 Windows 待办继续由 Test 自己记录。

本地标准 Playwright Chromium 下载返回无效 ZIP，换用临时 Chromium 138 测试环境；CI 继续使用标准浏览器，不将本地限制改成跳过检查。
