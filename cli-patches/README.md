# CLI 补丁：L6 动效经 API 直推草稿箱 + 容纳上限实测修正

> 针对 YI TUO HUB GZH CLI v0.1.0（项目根即发布包内容）。
> 全部修改已于 2026-09-03 在真实公众号环境实测通过（见 `../TEST-REPORT-2026-09-02.md` 第五节/第六节）。

## 补丁清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| 0001 | `cli/bin/yituo-hub-gzh.js` | ① `draftCommand` 不再无条件强制静态渲染：`--preserve-visuals` 时保留完整 L6 动效标记（`options.motion = true`）；② `writeResult` 文本模式下失败不再静默（输出 ✗ 与提示） |
| 0002 | `cli/lib/html.js` | 容纳上限按实测修正：`MAX_CONTENT_CHARS 20000 → 220000`、`MAX_CONTENT_BYTES 1MB → 600KB`（服务端实测 ~690KB bytes 触发 45002）；新增 `DOCS_MAX_CONTENT_CHARS = 20000` 软警告阈值并导出 |
| 0003 | `install.sh` | Windows Git Bash/MSYS 下 `ln -s` 实为复制，导致 `bin` 内相对 require 失效（`Cannot find module '../lib/renderer.js'`）。改为检测 MINGW/MSYS/CYGWIN 后生成 node 转发包装脚本（`cygpath -w` 转路径） |
| 0001 内含 | `bin` | 超过文档建议 2 万字符时注入非致命 `validationWarnings`（实测服务端可接收，属未文档化行为） |

`orig/` 为修改前原文件（可直接对照/回滚），`patched/` 为已验证的完整替换文件。

## 应用方式

```bash
# 方式 A：应用补丁
cd <CLI 项目根>
git apply / patch -p1 < cli-patches/0001-draft-motion-and-text-failback.patch
git apply / patch -p1 < cli-patches/0002-html-capacity.patch
git apply / patch -p1 < cli-patches/0003-install-sh-windows.patch

# 方式 B：直接覆盖（三份已验证的完整文件）
cp cli-patches/patched/cli/bin/yituo-hub-gzh.js  cli/bin/
cp cli-patches/patched/cli/lib/html.js           cli/lib/
cp cli-patches/patched/install.sh                install.sh
```

## 实测证据

1. **动效直推**：`draft poster.md --style deep-sea --level L6 --preserve-visuals`
   → `ok:true, verified:true, contentChars:22609`（超出文档 2 万字符口径），微信存储动效标记 **17/17 存活**；
2. **容纳上限**：同文 `--dry-run` 通过并输出软警告 `正文 21770 字符超过微信文档建议的 20000 字符（实测服务端可接收，属未文档化行为）`；
3. **微信 API 侧实测**（详见报告第六节）：2 万字符不强制；150,209 字符纯文本、44,769 字符 violet L6 全文全动效、3,200 个 SMIL 动画（669KB）均完整入箱；硬上限为字节维度 ≈690KB（45002）；
4. **风险声明**：超 2 万字符推送属未文档化行为，腾讯可能随时收紧。CLI 的软警告（validationWarnings）会持续提示调用方。

## 回滚

`orig/` 内同名文件覆盖回 `cli/` 与 `install.sh` 即可恢复 v0.1.0 原始行为。
