## v0.3.0 本地完成

59项逻辑（遍历288路线）、50项真实浏览器、10项素材工具与26项/82文件来源核验通过。8句录音独立ASR通过，24个源/成品完整解码通过；两分支事件CG均实测断网重开。事件画面证明跨新开局和完整备份迁移保留，非法未读画面导入拒绝。远端Windows/公开PWA等待本版CI结果。

## v0.3.0 候选验证

首批8句录音完成24个源/成品解码、正文指纹、8句独立无提示ASR。新增浏览器门禁验证实际Audio解码播放、面板/隐藏暂停、历史重听不写进度、分支CG不提前解锁及断网图片/录音；安装/升级/portable外层结果由本版WindowsCI另记。旧版成功不替代新版。

# v0.2.5 发布验证 · 2026-10-17

同一运行提交 `8e4236e` 的 Build 39004333641 和 Pages 39004628048 全部成功。49 项逻辑、44 项完整浏览器、Windows 源码与实际 win-unpacked EXE、NSIS/portable 构建通过；公网三种视口的 v0.2.5、实际 scope、断网续读、图像、隐藏恢复与零页面错误通过。正式公开的四份文件均已实际下载：大小和 SHA-256 与服务端 digest、三行校验清单一致；PWA ZIP CRC 与全部 22 文件相符，线上 index.html / sw.js 实际 HTTP 200 回读与公开包一致。机器凭据见 [PUBLISHED-v0.2.5](production/PUBLISHED-v0.2.5.json)。

本版继续标为预发布。源码/打包 EXE 的执行与外层安装器安装升级、portable 包装器启动分开记录，未借用 v0.2.4 的平台结果。

# v0.2.5 本地完整验证 · 2026-10-17

49 项逻辑、288 条完整路线、10 项素材工具、15 份共享文件、54 份素材文件、TypeScript 与生产构建通过。最终 Chromium 153.0.8010.0 两个工作进程执行完整 44 项浏览器，全部通过、零跳过、零失败；五项新增场景在桌面/手机各自执行。先在 v0.2.4 生产包重现后台全文出现和同段字数沿用，再验证修复；标题页继续的原有字数断言保留。版本、源码指纹与平台范围见 [本轮机器记录](production/READING-LIFECYCLE-20261017.json)。当前版本 Windows 与公开 PWA 的独立云端结果见上方发布记录。

# 验证记录

## v0.2.4 · 发布验证已完成

2026-10-16。正式 main `58503cc4e9cbe6827008245b49cbe6ea6acc4c39` 的 [Build 38827582748](https://github.com/AureliusWu/NetLove/actions/runs/38827582748) 与 [Pages 38828223622](https://github.com/AureliusWu/NetLove/actions/runs/38828223622) 均成功。

- Web：49 项逻辑、288 条路线重放、34 项完整浏览器检查通过；包含桌面和手机的安全重读、返回原打字位置、原持久化数据保护，以及未读完结局的返回边界。生产构建、10 项素材工具检查、15 份共用文件校验与素材导出通过。
- Windows：源码和 `release/win-unpacked/网恋.exe` 分别输出 `DESKTOP_SMOKE_OK`，版本均为 0.2.4，`packaged` 分别为 false/true；原生全屏、进度保持和最终隐藏窗口检查通过。NSIS 安装包与 portable 构建成功。
- 发行：[v0.2.4](https://github.com/AureliusWu/NetLove/releases/tag/v0.2.4) 为已公开的可玩预览 prerelease，标签和 release target 均精确指向上述 main。两份 EXE、PWA ZIP、SHA256SUMS.txt 均实际匿名下载；大小、实际 SHA-256、GitHub digest 相同，三个载荷同时符合校验表。公开 PWA ZIP 的全部 22 文件与 Build 的 PWA artifact 12015757232 按字节数和 SHA-256 逐项相同，ZIP CRC 通过。
- 线上：Pages 部署前两次核对 main，部署后真实 HTTP 回读 `index.html` SHA-256 `0903c324a2ccc8e73d67253221469e6ad487401e644e208786d9a763d1be5488`、`sw.js` SHA-256 `5743fb9f280d1887414c66d18ce4396fd91e7baf9176adaceaf42190089d3764`，均与同次 CI PWA 完全一致。20 项缓存版本为 `da53b51516fff2`。
- 实际公开 PWA 的 Chromium 153.0.8010.12 三屏检查通过：桌面 1440×900、手机 412×915、横屏 844×390，均显示 v0.2.4，scope 精确 `/NetLove/`；隐藏恢复、手机旋转、真断网刷新续读、图像完整与全窗口画面通过，页面错误为空。
- 边界：尚未实际安装/升级 NSIS、启动 portable 封装器，亦未进行实体设备手工体验；公开 EXE 回读只验证下载字节，不代替这些运行检查。

正式发布凭据和四项文件哈希见 [PUBLISHED-v0.2.4.json](production/PUBLISHED-v0.2.4.json)。此前代码 `0808b41619fae0e09d049b591fe69f183b351f54` 的 [PR Build 38743072589](https://github.com/AureliusWu/NetLove/actions/runs/38743072589) 验证作为历史保留在 [HISTORY-REREAD-VALIDATION.json](production/HISTORY-REREAD-VALIDATION.json)。下方旧版本记录保持原样。

## v0.1.1 历史发布验证

2026-10-11 / v0.1.1 双端工程交付验证。测试代码 `d013a9a95b18ddeab23fb72df12fe67efa509b96`；本地、CI 产物与公开部署分别记录。

- `npm run check` exit 0：素材工具 5 项、Vitest 31 项、生产构建、Chromium 145.0.7632.6 的 14 项浏览器测试全部通过（1.1 分钟）。测试使用 NetLove 专属端口、自启严格端口服务，避免其他项目预览被误复用。
- 43 场景、507 段、288 条真实路线与四结局保持原有完整性。新增 PWA 单元覆盖路径摘要、文件长度边界、scope 缓存清理、安装批次失败、本作品激活才就绪、失败后重试与等待更新；浏览器验证父 scope 已 ready 仍能准确识别本作品下载失败、两条部署路径断网重开、关闭所有游戏页后新版接管并恢复存档与图像。
- 更新测试通过 scope 外页面观察旧客户端清空后再重开，避免“新版本仍合法 waiting、按钮改为有新版本”的测试竞争；没有改变产品的等待更新策略。
- `npm run desktop:win` 构建 NSIS 与 portable 成功。源码和实际 win-unpacked EXE 各自 `DESKTOP_SMOKE_OK`，version 0.1.1，packaged 分别 false/true；原有九项检查、真实 HTML 原生全屏入/退、end-tinghe 第 9 段 UI/磁盘存档保持，以及最终 hiddenWindow 均通过。smoke 静音、禁止抢焦点和任务栏入口，退出全屏后隐藏；原生全屏转换可能短暂显示，未宣称完全 headless。
- ASAR 内 20 个 dist 文件逐字节与最终已测构建相同，desktop main/smoke 脚本也一致。两个 EXE 与源码/包截图的 SHA-256、尺寸和字节写入 [LOCAL-VALIDATION-v0.1.1.json](production/LOCAL-VALIDATION-v0.1.1.json)。这些属于本机证据；CI 的发行资产应另记本次真实哈希，不假设与本机构建一致。
- 共用素材校验 13 项/36 文件，固定共用文本哈希 9 项；本地 `.reuse-kit/netlove-0.1.1-final` 导出 6 项/21 文件，所有导出哈希重新校验、7 项作品专属图像排除。CI 提供独立材料附件。
- 原始基线由 e331d25 的 git archive 隔离重建，与修改前的 cache/JS 身份及 4,272,913 字节一致；最终 dist 4,273,064 字节。三次成组测量及真实 dispatch 区分自动等待，结果与全部组见 [PERFORMANCE-v0.1.1.json](production/PERFORMANCE-v0.1.1.json)。小样本墙钟增长与下降均保留，最终 WARN；未给公开网络或实体设备性能结论。
- [Build 38110158252](https://github.com/AureliusWu/NetLove/actions/runs/38110158252) 的 web/windows/release 全部成功，head SHA 为上述测试代码。实际日志确认 5 项素材工具、31 项逻辑、14 项浏览器测试通过（59.7 秒）；Windows 源码和实际打包 EXE 分别 `DESKTOP_SMOKE_OK`，version 0.1.1、packaged 分别 false/true，原生全屏、进度保持、最终 hiddenWindow 全部通过，smokeShowEvents 均为 0。CI 另提供 6 项/21 文件材料附件，下载后逐项验证全部导出哈希，排除 7 项作品原图。
- [v0.1.1 预发布](https://github.com/AureliusWu/NetLove/releases/tag/v0.1.1) 的标签和 release target 精确为 `d013a9a95b18ddeab23fb72df12fe67efa509b96`，draft=false、prerelease=true。实际下载公开安装版、便携版、PWA ZIP 和 SHA256SUMS.txt；各文件大小与 GitHub asset 元数据一致，实际 SHA-256 与 GitHub digest 相同，三个载荷同时与发布校验表一致。ZIP 的 20 文件与该 Build 的 PWA 逐字节相同。发行文件属于 CI 构建，独立于 LOCAL-VALIDATION 中的本机 EXE 哈希。
- [Pages 38110407401](https://github.com/AureliusWu/NetLove/actions/runs/38110407401) head SHA 相同，发布前两次核对 main 成功，部署和实际公网 live 门禁均成功。公开 `index.html`、`sw.js` 为 HTTP 200，响应 SHA-256 分别为 `ba45b77a3bd7fa535390a5ee15f9bc430a8d9252c388c6030b9cc791d24293bc`、`58ed5ffd91d513be8d7caf47dfcd320ef29296f316b2eb56f15c3d3c9deefe09`，与本次 CI PWA 完全一致。严格核对实际 CI artifact，未把 Windows 本机构建的换行字节当作线上基准。
- CI Chromium 153.0.8010.12 与独立系统 Chrome 154.0.8037.98 分别在实际 https://aureliuswu.github.io/NetLove/ 验证桌面 1440×900、手机 412×915、横屏 844×390：显示 v0.1.1、manifest 横屏、scope 精确 `/NetLove/`，隐藏恢复/手机旋转保持第 1 段，`context.setOffline(true)` 后刷新并继续存档，图像完整、全窗口画面、无横向溢出、零页面错误。独立检查通过现有环境代理，未配置额外 CA 或绕过证书验证；各有六张标题/离线阅读截图，CI 附件为 NetLove-Live-Previews。
- 发布资产和公开验证完整凭据见 [PUBLISHED-v0.1.1.json](production/PUBLISHED-v0.1.1.json)。两份下载 EXE 仅读取哈希及 Authenticode，均 NotSigned，没有启动或安装；真实 NSIS 安装/升级保留数据、实体手机安装和设备手工体验未执行。没有修改正常玩家窗口设置、剧情、图像与存档标识。

本次公开 CI 载荷：

| 文件 | 实际字节 | SHA-256 |
| --- | ---: | --- |
| NetLove-0.1.1-x64-Setup.exe | 115828670 | `44df4d665dd9d16a1b8d37f6c83bdb74cd8d1d34ac1da7de331474f06700b185` |
| NetLove-0.1.1-x64-Portable.exe | 115609215 | `15337395b9c48341e35945cb02f7bcfa72b1db5690ccd2c34fe66faa8ce6be31` |
| NetLove-PWA-0.1.1.zip | 4000585 | `a4fe7916c095385cdadbc465383e6ceea879d9a7457d2470e95e1b3b6c025d99` |

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
