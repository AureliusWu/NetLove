# 2026-10-18 · v0.2.6 发布回读

运行提交 `dff2989f91407545b643f351a69f13985990275e` 已发布，公开版本和既有资产保持不可覆盖。[发行与下载](https://github.com/AureliusWu/NetLove/releases/tag/v0.2.6) · [在线游玩](https://aureliuswu.github.io/NetLove/)。

[Build 39105142679](https://github.com/AureliusWu/NetLove/actions/runs/39105142679)、[CI 39105142679](https://github.com/AureliusWu/NetLove/actions/runs/39105142679)、[Pages 39105485626](https://github.com/AureliusWu/NetLove/actions/runs/39105485626) 均成功。逻辑 57 项；浏览器 44 passed。Windows 范围：source and win-unpacked EXE passed, NSIS and portable built; actual install/upgrade and portable wrapper launch not executed。

本轮在工作流之外匿名读取所有 4 份公开附件，实测字节数和 SHA-256 与服务端 digest 一致，校验表逐行相符，PWA ZIP 全项 CRC 通过。线上入口和 worker 与下载 ZIP 逐字节一致。

逐项附件摘要及线上入口/worker 摘要保存在 [发布凭据](PUBLISHED-v0.2.6.json)。v0.3.0 的实际录音、两分支事件 CG、试听及安装/便携封装实际启动仍待制作与补验。
