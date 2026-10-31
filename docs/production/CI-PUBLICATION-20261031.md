# 2026-10-31 发布触发修复

失败运行：`41164822557`，源码 `a95127323add5210e308e9d302f1bb2586091820`。
Web 与 Windows 均通过；release 尝试把已正式发布的 `v1.1.1` 绑定到 README 后继提交，因此被不可变标签保护正确拒绝。

新增只读 publication plan，将普通 main 验证与新版本发布区分。已有公开 release 且 tag 存在时记录 `already-published` 并跳过发布 job；源码被更新 main 替代时记录 `superseded`。新版本仍进入原完整平台/草稿/字节回读流程。孤立冲突 tag、已有 draft、缺失公开 tag 继续阻断，正式发布函数的全部保护保留。

本轮不改玩家程序、素材、版本、存档或已公开附件。手动 build 保持只验证；push 新且未发布版本仍自动发布。

本地执行：`python3 -m unittest discover -s scripts -p 'test_publish_release.py' -v`，24 项通过；`git diff --check` 通过。远端结果以本修复提交的 Build NetLove / Pages 工作流为准。
