# cli.yituohub.com + YI TUO HUB GZH CLI 综合测试报告（完整版）

> 测试周期：2026-09-02 ~ 2026-09-03
> 测试对象：① https://cli.yituohub.com/ 落地页与文档页（GUI 黑盒）② YI TUO HUB GZH CLI v0.1.0 功能与业务链路（真实安装 + 真实公众号接口）
> 测试环境：Windows 10 (10.0.22631) · Git Bash · Node v24.13.0 · 内置浏览器（1440×900 / 390×844）
> 测试人：ZCode（自动化）
> 配套产物：`l6-draft-kit/`（复刻工具包）· `gui-test-screenshots/`（网页证据截图）· `cli-func-test/`（CLI 实验脚本与产物）

---

## 一、总体结论

| 维度 | 评价 |
|---|---|
| 网站（营销页） | 🟡 **信息设计不合格**：首页全英文主视觉对国内用户不友好（已改版待上线）；初判的滚动锁死/文字发虚经对照实验证实为测试工具伪影，已撤销 |
| CLI 核心（styles / layout / draft / doctor） | ✅ **全部可用**，工程质量高，输出契约对 Agent 友好 |
| CLI 安装（Windows） | ❌ 安装后命令损坏（Git Bash 符号链接问题），macOS/Linux 不受影响 |
| SVG 动效经 API 推稿 | ✅ **完全可行**——被 CLI 两行强制代码挡住，微信本身全程放行 |
| 体积上限 | ✅ 文档口径 2 万字符**服务端并不强制**；真实硬上限 ≈ **690KB bytes**（45002 错误） |

**一句话**：产品内核（CLI）相当扎实，业务链路端到端全通；门面（落地页）和 Windows 安装链路需要修；首页信息设计需要按"国内用户易用性优先"重做。

---

## 二、网站测试（GUI 黑盒）

### ~~🔴 P0-1 全站滚动锁死~~（2026-09-03 撤销：测试工具伪影）

> **更正**：初测报告的"滚动锁死"经三轮对照实验**证实为测试工具伪影，撤销该结论**：
> 1. 金丝雀对照：一个无 CSS、无 JS 的普通 3000px 长页在测试浏览器中同样"无法滚动"（wheel/PageDown 均无效）——证明是测试浏览器的输入合成缺陷，与站点无关；
> 2. A/B 回测：线上原版用定位器点击导航锚点，`#capabilities` 正常跳转（`winY: 900`）；
> 3. 站点源码审查：CSS/JS 中本就不存在滚动劫持（无 wheel 监听、无 overflow 锁定、无固定 Hero）。
>
> 站点滚动在真实浏览器中正常（用户日常使用亦未遇到）。保留本节作为测试方法学记录：**下"页面坏了"的结论前，必须先用无影响面的对照页面排除工具自身缺陷。**

### 🟡 P1-1 桌面端文字发虚（改判：测试环境渲染伪影，待真机复核）

- **现象**（仅存在于测试浏览器）：1440×900 下导航、副标题、按钮、正文呈现模糊/光晕，小字号中文难以阅读；移动端 390×844 与 DOM 计算样式均正常（`filter:none; opacity:1`，祖先无滤镜）。
- **改判依据**：源码审查确认无 blur 滤镜；怀疑为测试浏览器对「视频层 + backdrop-filter」的软件合成光栅化伪影。
- **状态**：不作为站点缺陷。上线后建议在真实 Chrome/Edge/微信内置浏览器中人工复核一次。

  ![首屏（测试浏览器下的伪影示例）](gui-test-screenshots/t0_hero_after_6s.png)
  ![移动端清晰对比](gui-test-screenshots/t5_mobile_390.png)

### 🟡 P1-2 首页信息设计：全英文主视觉，国内用户易用性差 → ✅ 已改版修复（待上线）

**问题描述**：目标用户是**中文公众号作者/运营**，但首页把英文当主信息载体：

- H1 主标题：`From Markdown to the draft box.`（英文衬线体大字）
- 主按钮：`Begin Journey ↗`（字面意思"开始旅程"——不看第二遍根本猜不到是"开始使用"）
- 导航：`Home / CLI / Studio / Docs / Source` 全英文
- 中文反而退居小字号副标题

**为什么这是问题**：

1. **3 秒法则失守**：国内访客扫一眼首屏，无法回答"这是干嘛的"。英文大标题营造的是"高级感"，传达的却是零信息——用户还要在脑内翻译一次，而翻译结果依然抽象；
2. **`Begin Journey` 误导**：语义与产品无关，新用户不敢点、不知道为什么点；
3. **与产品定位自相矛盾**：这是一个"帮你把中文内容排得更好看"的工具，自己的门面却把最重要的信息用外语说——用户会怀疑"它真的懂中文排版吗"。

**✅ 改版方案（已实施，见 `cli-site/`）**：

| 位置 | 改前 | 改后 |
|---|---|---|
| H1 主标题 | From Markdown to the draft box. | **写好 Markdown，一键排进草稿箱。**（宋体大字，两行节奏） |
| 英文口号 | H1 主视觉 | 降级为 eyebrow 装饰小字 `FROM MARKDOWN TO THE DRAFT BOX` |
| 主 CTA | Begin Journey ↗ | **开始使用 ↗** |
| 导航 | Home / CLI / Studio / Docs / Source | 首页 / 功能 / 在线排版 / 文档 / 源码 |
| 副标题 | 写好的 Markdown，选好排版……（与旧 H1 重复） | 33 套高级排版主题，图片全自动处理，一条命令直连微信接口。密钥只存本机，只创建草稿、不代发布 |
| 页脚链接 | Studio / Docs / Source | 在线排版 / 文档 / 源码 |
| 中文字形适配 | —— | 标题字距 `-0.055em→0.01em`、行高 `0.91→1.12`、移动端字号 `16vw→11vw`（宋体大字排版正确性） |
| 滚动加固 | body `overflow-x:hidden` | `overflow-x:clip`（现代写法，不创建滚动容器，防御性） |

改版后效果（测试浏览器截图，真机更清晰）：

![改版后首屏：中文主标题](gui-test-screenshots/t8_new_hero_desktop.png)

**原则**：对国内用户，易用性是第一位，设计感是第二位。英文可以是调味料，不能是主菜。

### 其他网站问题

| # | 级别 | 问题 | 建议 |
|---|---|---|---|
| W-1 | P2 | 移动端导航只剩「Begin Journey」，Home/CLI/Studio/Docs/Source 不可达（无汉堡菜单） | 增加移动端菜单 |
| W-2 | P2 | 生成 HTML 含 8 处 `<svg>`，公众号编辑器对 SVG 有白名单 | 在真实编辑器粘贴复验 |
| W-3 | — | 测试环境疑似强制 `prefers-reduced-motion`，不排除常规浏览器表现不同 | 常规环境复验 P0-1 |

### 网站测试通过项

| 测试点 | 结果 |
|---|---|
| 页面加载与标题（`YI TUO HUB GZH CLI · Markdown 到公众号草稿`） | ✅ |
| Docs 整页导航 → `/docs/` | ✅ |
| 链接资源有效性：`docs/`、`install.sh`、`releases/…tar.gz`、studio、GitHub、微信后台（curl 核验，非 GUI） | ✅ 全部 200 |
| 移动端布局：无横向溢出、文案换行完整、CTA 可见 | ✅（但滚动同样锁死） |

### 原被阻塞项 → 改版后已全部实测 ✅

| 项目 | 结果 |
|---|---|
| 「开始使用」锚点 → #install | ✅ hash=#install，winY=2173 |
| 「查看功能明细」锚点 → #capabilities | ✅ hash=#capabilities，winY=900 |
| 「复制命令」按钮 | ✅ 点击后按钮文字变「已复制 ✓」（剪贴板写入成功回调触发） |
| 功能区/安装区/页脚渲染 | ✅ 截图验证，中文导航生效 | 

> 说明：测试浏览器不支持合成滚轮/键盘滚动（金丝雀页面对照证实），滚动项以锚点跳转 + scrollY 程序化读取替代验证；真实浏览器不受影响。

---

## 三、CLI 安装与命令测试

### ❌ P0-2 Windows（Git Bash）安装后命令不可用

```text
$ yituo-hub-gzh --version
Error: Cannot find module '../lib/renderer.js'
```

- **根因**：`install.sh` 用 `ln -sfn` 建符号链接，Git Bash (MSYS) 默认把它执行为**复制**；复制品落在 `~/.local/bin/`，内部 `require('../lib/renderer.js')` 相对路径失效。
- **影响面**：所有 Windows + Git Bash 用户（README 主推 `curl … | bash` 一键安装，第一印象即崩）。
- **绕过**：`node ~/.local/share/yituo-hub-gzh/cli/bin/yituo-hub-gzh.js` 一切正常。
- **修复建议**：install.sh 检测 MSYS 环境，改用 `cmd //c mklink` 或降级生成转发 `.cmd` 包装脚本。

### ✅ 命令逐项实测

| 命令 | 结果 | 关键输出 |
|---|---|---|
| `install.sh` 安全性审查 | ✅ | 35 行脚本干净：下载官方 tarball → 解压 → npm install → 建 bin 链接 |
| `--version` / `--help` | ✅ | v0.1.0，帮助信息完整（真实路径执行） |
| `styles --json` | ✅ | `ok:true`，33 套风格（基础 + 高级，高级含 L1–L6）；字节级验证标准 UTF-8 |
| `layout`（本地图片） | ✅ | `inlineImages:1`、`selfContained:true`、`validationWarnings:[]` |
| `layout`（远程图片 URL） | ✅ | URL 图自动下载内嵌；基础主题可省略 `--level` |
| 产物质量 | ✅ | 87.9KB；0 个 `<style>` 标签、122 处内联 style（符合公众号约束）；无残留 Markdown；视觉验收通过 |
| `config show`（无配置） | ✅ | 优雅返回空配置 + 路径 |
| `doctor`（无配置） | ✅ | 明确"未配置/未检测"，附微信后台链接 |
| `draft --dry-run` | ✅ | `wouldCreateDraft:true, published:false`，不请求微信 |
| `draft`（无凭证） | ✅ | `CONFIG_REQUIRED` + 修复指引，退出码 1，零外发请求 |
| 打包 | ⚠️ | macOS 打包含 `LIBARCHIVE.xattr` 扩展属性，Win/Linux 解压刷警告（无害），建议 `COPYFILE_DISABLE=1 tar --no-xattrs` |

### 🟡 P2 CLI 体验问题

| # | 问题 | 建议 |
|---|---|---|
| C-1 | `doctor` 体检**不通过**时人类可读模式静默退出（stdout 空、退出码 1）。根因：`writeResult` 中 `if (value.ok === false) return;`。Agent 场景不受影响 | 文本模式也输出失败原因 |
| C-2 | `doctor` 的 `publicIp` 依赖单一 `api.ipify.org`（Node fetch 下超时）；而 `draft` 的 40164 错误本身能带回真实 IP | 优先用 40164 回显 IP，ipify 仅作预热 |

---

## 四、端到端真实推稿（含真实凭证）

配置过程：本机无凭证（全盘搜索确认）→ 用户提供 AppID/AppSecret 写入配置文件（0600）→ 排查白名单。

**白名单关键发现**：微信实际看到的出口 IP 是 `223.79.252.216`，而境外 IP 服务（ipify）看到的是代理出口 `154.44.12.39`——两者不一致。CLI 从 40164 错误中**自动提取出应加白名单的 IP**（`whitelistIp` 字段），Agent 可直接消费。

**真实推稿成功凭证**（L4 首推 + L6 复推 + 工具推，均 `verified:true`）：

```text
doctor:    接口权限通过，IP 白名单已放行
draftMediaId 示例: 61WmxQRm5uhlMM6bWY9ZVpQc6FdxluPih6o9KjcWaDwxVJLie9Y7s-pMbD0NO5QU
published: false（只存草稿，未触碰发布）
```

---

## 五、SVG 动效专项探索（核心发现）

### 探索过程（用户诉求：验证 L6 动效能否经 API 存稿）

| 实验 | 结果 | 结论 |
|---|---|---|
| ① 极简 SVG 直推（静态 + SMIL 动画） | ✅ 全存活 | 微信**不**清洗 SVG |
| ② 7 探针 bisect（含 violet 原版 SVG、data-\*、animateTransform） | ✅ 全存活 | 主题 SVG 构造无黑名单；`xmlns` 也被排除 |
| ③ CLI 推稿丢 SVG → 翻源码 | 定位 `compactForWechat` 默认删除全部 `<svg>`（`--preserve-visuals` 可豁免） | 第一层：CLI 删的 |
| ④ 带 `--preserve-visuals` 动画仍丢 → 翻源码 | 定位 `draftCommand` **无条件 `options.static=true; options.motion=false`** | 第二层：动画根本没被渲染 |
| ⑤ PoC：复刻管线但放开强制 | **微信存储 5 SVG + 8 动画全量存活** | 最终实锤 |

### 根因（非微信限制）

```js
// bin/yituo-hub-gzh.js draftCommand 内，两行强制代码：
options.static = true;   // 渲染永远是静态分支
options.motion = false;  // 动效标记从未被生成
// 叠加 html.js compactForWechat 默认剥 SVG
```

**修复（两行）**：

```js
options.static = flags.static === true;
options.motion = flags['preserve-visuals'] === true ? true : options.motion;
```

> ⚠️ 更正记录：初期曾误判"微信 API 清洗全部 SVG"，经三轮对照实验 + 管线复现推翻并更正。教训：下结论前先绕开被测方自有管线做直接对照。

---

## 六、体积上限探索

### 6.1 文档口径的 2 万字符不是服务端硬限制

| 提交体积 | 结果 |
|---|---|
| 26,200 字符 | ✅ 接受，存储完整 |
| 44,769 字符（violet-studio L6 全文全动效，10 SVG + 19 动画） | ✅ 接受，**动画全部存活** |
| 63,325 / 150,209 字符 | ✅ 接受，存储完整 |

`CONTENT_TOO_LARGE` 是 CLI 自查（`html.js` `MAX_CONTENT_CHARS=20000`），非微信拒绝。**因此该预检可以直接取消/降级为警告**。

### 6.2 真实硬上限：≈ 690KB bytes（按字节计）

| 探针 | 结果 |
|---|---|
| 601 KB bytes（中文 22 万字符） | ✅ 接受 |
| 682 KB bytes（ASCII） | ✅ 接受 |
| 691~712 KB bytes | ❌ `errcode 45002: content size out of limit` |

- 上限**按字节数计、与字符集无关**（中文 601KB 过 / 中文 688KB 拒 / ASCII 682KB 过 / 697KB 拒）；
- 超限报 `45002`，带 rid 追踪号；
- 并非文档暗示的 1M bytes，也远大于 2 万字符。

### 6.3 "少文字多动效"形态专项：动效密度无独立上限

递增呼吸圆点动效单元（每单元 1 SVG + 2 animate）：

| 单元数 | 动画标记 | 体积 | 结果 |
|---|---|---|---|
| 100 | 200 | 42 KB | ✅ 200/200 存活 |
| 700 | 1,400 | 293 KB | ✅ 1,400/1,400 |
| 1,400 | 2,800 | 586 KB | ✅ 2,800/2,800 |
| **1,600** | **3,200** | **669 KB** | ✅ **3,200/3,200 全部存活（最大存活样本）** |
| 1,650 / 1,700 | 3,300 / 3,400 | 691 / 712 KB | ❌ 45002 |

- **动效没有数量/复杂度上限**，只受总字节数约束；
- 撞墙错误与纯文本完全相同（45002）→ 是 API 体积上限，非动效专属限制；
- **编辑器/客户端侧上限 API 无法探测**：草稿箱已保留一篇 1600 单元样本《动效密度阶梯 1600 单元》，需人工后台打开 + 手机预览验证（可能卡顿/白屏，即"微信自己的上限"）；
- 实战建议：动效海报控制在 **500 单元 / 100KB 以内**，兼容性与编辑器体验最稳。

### 6.4 分批注入

- **无实现基础**：`draft/add`/`draft/update` 均为整篇替换语义，接口层不存在追加原语；
- **无必要**：单次直推实测 ≥150K 字符（450KB bytes）均可过，远超真实需求。

### 6.5 主题装饰体积参考（120 字短文，`--audit` 可精确测量）

| 主题 | L6 体积 | 备注 |
|---|---|---|
| neo-brutal | 16.7K | 最轻 |
| night-editorial | 17.0K | ✅ 实测直推 |
| mist-research | 17.1K | |
| swiss-signal | 20.0K | 贴线 |
| violet-studio | 20.7K+ | 装饰最重之一，但服务端实测放行 |
| 其余 9 套 | 21K~72K | |

---

## 七、安全边界确认 ✅

- AppSecret 只存本机 0600 配置文件/环境变量，不进命令行参数、不经过第三方服务器；
- CLI 与工具链只调用 `token / media/uploadimg / material/add_material / draft/add / draft/get`，**代码中不存在发布接口**；
- 图片仅在本地进程与临时目录处理；
- `draft` 全流程 `published:false`，发布权始终留在公众号后台。

---

## 八、交付物

| 交付物 | 位置 | 说明 |
|---|---|---|
| **L6 复刻工具包** | `l6-draft-kit/` | `l6-push.js`（动效渲染 + 尺寸预警 + 回读验证动效存活）· `L6存稿指南.md`（合作者复刻指南）· 示例文章与封面 |
| 网页测试截图 | `gui-test-screenshots/` | t0~t7 共 13 张证据图 |
| CLI 实验脚本与产物 | `cli-func-test/` | svg 实验、密度阶梯、体积探测脚本及 JSON 结果 |
| 测试报告 | 本文件 | `TEST-REPORT-2026-09-02.md` |

工具实测记录：公告卡（night-editorial L6）与动效海报（deep-sea L6，**17 动效 17/17 存活**）均推稿成功。

---

## 九、未覆盖项

- `draft` 真实推稿后的**编辑器/客户端侧验证**：1600 单元大草稿能否正常打开、L6 动效在 iOS/Android 微信客户端的播放效果（需人工，草稿箱已备样本）；
- 生成 HTML 粘贴进微信编辑器的实际清洗效果；
- 网站滚动问题在常规（非 reduced-motion）桌面浏览器的复验；
- `setup` 交互式配置向导；
- 体积上限在 690KB 附近的精确值与长期稳定性。

---

## 十、修复优先级建议

| 优先级 | 事项 | 状态 |
|---|---|---|
| P0 | CLI Windows 安装 shim（install.sh 检测 MSYS 改用 mklink/包装脚本） | ⏳ 待修复 |
| P1 | CLI 放开动效渲染（draftCommand 两行）+ `compactForWechat` 默认剥 SVG 策略重审 | ⏳ 待修复（`l6-draft-kit/l6-push.js` 已临时绕过） |
| P1 | 首页中文化改版（P1-2：中文主标题、CTA/导航中文化、中文字形适配） | ✅ 已改版已测试，**待上线**（`cli-site/deploy-cli-site.sh`） |
| ~~P0~~ | ~~网站滚动锁死~~ | ❌ 撤销（金丝雀对照证实为测试工具伪影，站点无此问题） |
| P2 | doctor 静默失败、IP 探测多源、tar 打包警告、移动端导航、SVG 编辑器复验、文字发虚真机复核 | 零散 |

---

## 附：首页改版信息层级建议（示意）

```text
现在：
  [eyebrow 小字] YI TUO HUB / AGENT CAPABILITY 01
  [H1 大字·英文] From Markdown to the draft box.
  [中文小字·发虚] 写好的 Markdown，选好排版，直接进入微信公众号草稿箱……
  [按钮·英文] Begin Journey

建议：
  [eyebrow 装饰小字] From Markdown to the draft box.        ← 英文降级为调味料
  [H1 大字·中文]     把 Markdown 排成公众号高级排版，直达草稿箱   ← 一句话说清
  [中文副标] 33 套主题 · 6 级高级排版 · 图片全自动 · 只存草稿不发布
  [按钮·中文] [查看安装命令] [开始排版]                        ← 动词 + 目的
  [代码块]   curl -fsSL https://cli.yituohub.com/install.sh | bash [复制]   ← 转化前置到首屏
```
