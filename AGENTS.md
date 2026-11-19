# hbxs0571.github.io · 工作约束

> 本文件是本目录（`N:\HarmonyProjects\hbxs0571.github.io`）下一切工作的入口约束，优先级高于任何口头约定。
> **接手、上下文压缩后恢复、或中断续做时，先读本文件**，再读 [README.md](README.md)（文件结构）与 [docs/重新部署教程.md](docs/重新部署教程.md)（部署、域名与留言板流程）。
> 本仓库是公开仓库，本文件的内容对所有人可见。

---

## 零、当前状态

- 仓库：`https://github.com/hbxs0571/hbxs0571.github.io`，分支 `main`，跟踪 `origin/main`
- 克隆：2026-11-19，HEAD `8188f5e Refresh About page stylesheet cache key`
- 线上：`https://home.005711.xyz`（由根目录 `CNAME` 指定），GitHub Pages 从 `main` 分支根目录发布
- 本仓库的 git 本地配置带 `http.schannelcheckrevoke=false`：本机证书吊销列表离线会导致克隆 / 拉取失败，这项只影响本仓库，不改全局配置
- 2026-11-20：关于页 UI 重做（`about.html` + `asset/css/about.css` 整体重写），与主页统一视觉语言；细节见 §5.4、§5.5
- **已知未修的线上故障**：留言板的 Supabase 项目域名已不存在，页面显示「留言加载失败」。详见 §5.5，**不要误当成前端 bug 去改 `guestbook.js`**

---

## 一、文件边界（硬约束，优先级最高）

> **除公共文件外，所有与本项目任务相关的文件都必须落在 `N:\HarmonyProjects\hbxs0571.github.io` 之内。**

这条约束管的是「写哪里」，不管「做什么」。任何一次产出——脚本、临时数据、截图、探测输出、方案文档、调研记录、补丁、日志、备份、对比样本——只要是为本项目服务的，就必须写在项目目录里，不许写到工作区根目录、其他项目目录、桌面、下载目录或系统临时目录。

### 什么算「本项目任务相关文件」

包括但不限于：

- 一次性脚本（`.py` / `.sh` / `.ps1` / `.js`）、验证工具、探针
- 临时与中间数据（`*.json`、`*.xml`、`*.diff`、`*.log`、`*.txt`）
- 截图与录屏（`*.jpeg` / `*.png` / `*.webp`）
- 方案、调研、结论、批次报告、参数卡等 Markdown 文档
- 补丁文件、代码片段、备份副本
- 构建日志与构建产物

### 什么算「公共文件」

只有这五类，且**不得因「方便」扩大解释**：

1. **其他项目自身的源码与文档** —— `legado-with-md3-harmonyos`、`Frigivox` 等目录下的文件属于各自项目。读它是「读公共文件」；改它要遵守那个项目自己的 `AGENTS.md`。本项目的脚本、证据、笔记不得混写进去。
2. **共享测试材料与资源** —— `N:\HarmonyProjects\测试\`、`N:\HarmonyProjects\project-resources\`。只读引用，不在其中新增本项目文件。
3. **平台与工具链** —— DSH、DevEco Studio、SDK、模拟器镜像、`git` / `node` / `hdc` / `adb`，以及它们的全局配置与缓存目录。只读或按平台规则使用。
4. **工作区级约定文件** —— `N:\HarmonyProjects\AGENTS.md`。它属于整个工作区，不属于某一个项目。
5. **用户明确指定的其他位置** —— 某次任务里写明的输出路径。

### 判定方法

写文件之前先问一句：**这个文件是给本项目用的，还是给别的项目 / 平台用的？**

- 给本项目用的 → 必须落在 `hbxs0571.github.io` 内。
- 属于别的项目的源码 / 资源 → 留在原位，但不在那里新建本项目的临时文件。

### 已知存量违规

本项目是 2026-11-19 新克隆的，目录内没有约束建立前遗留的越界文件。工作区根目录下那些 `_b1.py`、`b6cap.json`、`l*.json`、`*.jpeg`、`build-harmony.ps1` 等属于其他项目的历史遗留，**不要求清理，但不得在此之上继续堆新文件**。

### 本目录内的推荐布局

```text
hbxs0571.github.io/
├── AGENTS.md        # 本文件（工作约束）
├── README.md        # 面向使用者的文件结构说明
├── .gitignore       # 排除 .tmp/ 与编辑器文件
├── .tmp/            # 临时脚本、日志、截图；已 gitignore，不提交也不发布，用完即删
├── index.html       # 主页
├── about.html       # 关于我 + 留言板
├── CNAME            # 自定义域名 home.005711.xyz
├── robots.txt       # 爬虫规则
├── sitemap.xml      # 站点地图，加新页面要同步更新
├── asset/           # 站点资源（css / js / fonts / image），会被公开发布
├── docs/            # 面向使用者的文档，会被公开发布
└── supabase/        # 留言板后端 SQL 与说明，会被公开发布
```

> ⚠️ **`docs/` 是发布内容的一部分，不是内部工作区。**
> 内部工作笔记、方案、调研记录不要放进去——要放就放 `.tmp/`，或者先问用户要一个不发布的位置。

### 交付前自检

每次改动完成后执行：

```bash
cd "N:/HarmonyProjects/hbxs0571.github.io"
git status --short
```

确认：①没有项目文件夹之外的路径；②没有误提交的临时文件；③`.tmp/` 不出现在列表里。发现越界文件立即移回项目内或删除。

---

## 二、项目是什么（避免走回头路）

- **纯静态站点**：HTML / CSS / JS，**没有构建步骤、没有包管理器、没有打包产物**。改完文件直接提交推送，GitHub Pages 重新发布。
- 仓库根目录就是发布根目录，`main` 分支就是发布分支。
- 两个页面：`index.html`（主页，标题「狐Fnの主页」）、`about.html`（关于我 + 留言板）。
- 留言板后端是 **Supabase**，浏览器直连。表结构与行级权限策略见 `supabase/guestbook.sql`，审核说明见 `supabase/README.md`，公开配置见 `asset/js/guestbook-config.js`。
- 页面基于 HTML5 UP 的 Aerial 模板，上游模板仓库是 `AsisYu/html-starter-qwpicu`。
- 仓库没有 LICENSE 文件，第三方素材按各自许可处理。

---

## 三、改这个站点的注意事项

- **静态资源带版本查询串做缓存刷新**：`asset/css/main.css?v=20261002`、`asset/css/about.css?v=20261119`、`asset/js/feature.js?v=20261003`。**改动 CSS / JS 后必须同步更新引用它的 HTML 里的 `?v=` 值**，否则用户浏览器会继续读旧缓存，改了等于没改。
- **保留署名注释**：`index.html` 顶部保留了上游模板 `AsisYu/html-starter-qwpicu` 的署名注释，不要删除。Aerial 模板部分遵循 HTML5 UP 的 CC BY 3.0 许可。
- **Supabase 只能放 publishable key**：`asset/js/guestbook-config.js` 里绝不能出现 `service_role` / secret key，那是浏览器可读的文件。
- **加页面要同步 sitemap**：`sitemap.xml` 和 `robots.txt` 里写死了 `https://home.005711.xyz`，新增可索引页面时同步补进 sitemap。
- **中文路径**：仓库里有中文文件名（如 `docs/重新部署教程.md`），GitHub Pages 会做 URL 编码，链接时留意。
- **外部依赖要考虑国内访问**：页面引用了 jsdelivr 与 Google Fonts 的 CDN 资源，这些在国内可能不稳定。改动引入新依赖前先想清楚这一点，优先用 `asset/` 下的本地副本。
- **留言板逻辑改动前先看权限策略**：动 `asset/js/guestbook.js` 或 `supabase/guestbook.sql` 之前，先读 `supabase/README.md` 与 SQL 里的 RLS 策略，不要绕过审核机制。

---

## 四、提交与发布

- 直接在 `main` 上工作（这是 GitHub Pages 的发布分支）
- 提交信息用英文短句，一句话说明改了什么，例如 `Refresh About page stylesheet cache key`
- 不提交：`.tmp/`、编辑器临时文件、系统文件（`Thumbs.db`、`desktop.ini`、`.DS_Store`）
- 推送后 GitHub Pages 自动重新发布，通常几十秒到几分钟；发布失败先看仓库的 Actions / Pages 设置
- 推送前确认 `git status` 干净、没有越界文件

---

## 五、踩过的坑与避坑清单

> 这一节记录已经踩过、并且会反复踩的坑。每条都带**具体命令或错误原文**，下次遇到直接照做，不要重新摸索。
> 新增条目时按「现象 → 原因 → 做法」写，并注明发生日期。

### 5.1 网络与 Git

**本机证书吊销列表离线，克隆 / 拉取会失败。**

- 现象：`git clone` 报 `schannel: next InitializeSecurityContext failed: CRYPT_E_REVOCATION_OFFLINE (0x80092013)`
- 原因：Windows schannel 要在线校验证书吊销状态，本机连不上吊销服务器
- 做法：本仓库本地配置已写入 `http.schannelcheckrevoke=false`，只影响本仓库，**不要改全局配置**。换机器克隆时用
  `git -c http.schannelCheckRevoke=false clone <url>`

**沙箱限制下 curl 与 git 都拿不到凭据。**

- 现象：`curl: schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`；`git: cannot create standard input pipe for remote-https: Permission denied`
- 原因：受限沙箱拦了证书存储与管道
- 做法：需要联网拉取时用完整权限执行，不要反复重试同一命令

### 5.2 无头浏览器截图（验证 UI 时必用）

**必须用绝对路径写截图。**

- 现象：`--screenshot=about.png` 报 `Failed to write file ...: 拒绝访问。 (0x5)`
- 做法：`--screenshot='N:/HarmonyProjects/hbxs0571.github.io/.tmp/shots/xxx.png'`（反斜杠或正斜杠都行），并配 `--user-data-dir` 指向项目内

**`--window-size` 只改窗口，不改布局视口。**

- 现象：`--window-size=390,1900` 截出来的图里正文右侧被裁切，看着像横向溢出
- 原因：布局视口没变，页面仍按桌面宽度排版
- 做法：移动端必须走 CDP `Emulation.setDeviceMetricsOverride`。实测 390px 视口下 `docW=390`、无横向溢出，是 `--window-size` 骗了人

**懒加载 / 302 跳转的图片要等够时间。**

- 现象：首屏封面图没加载出来，只剩渐变兜底
- 原因：封面走 `https://img-api.moeblock.com/api.php`，是 302 跳转，要两次请求；`--virtual-time-budget=9000` 不够
- 做法：给到 20000，或 CDP 里 `Page.navigate` 后等 6–7 秒。**该接口每次刷新返回不同的随机图，背景每次都不同是正常的，不是 bug**

**CDP 脚本用 Node 内置 WebSocket。**

- 现象：`require('ws')` 报 `MODULE_NOT_FOUND`
- 做法：Node 22+ 已有全局 `WebSocket`，直接用；流程是 `Page.enable` → `Emulation.setDeviceMetricsOverride` → `Page.navigate` → 等待 → `Page.captureScreenshot({captureBeyondViewport:true})`

**不要在 shell 循环里拼路径变量。**

- 现象：生成出 `shots$pg-1440.png` 这类垃圾文件
- 原因：变量在引号里没展开
- 做法：一条命令一个明确的绝对路径，或者写进 `.js` / `.ps1` 脚本

### 5.3 PowerShell 与 Git Bash 混用

**`$_ ` 会被 bash 展开。**

- 现象：`powershell -Command "... | Where-Object { $_.Name -eq 'x' }"` 报 `一元运算符--后面缺少表达式`
- 原因：Git Bash 先把 `$_` 吃掉，PowerShell 收到的是残缺命令
- 做法：**把 PowerShell 代码写进 `.tmp/*.ps1`，用 `powershell -NoProfile -ExecutionPolicy Bypass -File xxx.ps1` 执行**，不要在 bash 里内联复杂 PowerShell

**`$PSScriptRoot` 只在 `-File` 下有效。**

- 现象：`Test-Path` 收到 null，报 `ParameterArgumentValidationErrorNullNotAllowed`
- 做法：脚本里用绝对路径常量，或者确认是 `-File` 方式执行

**PowerShell 的中文报错在 Git Bash 里是乱码。**

- 做法：看英文部分判断类型即可；需要准确原文时在 PowerShell 里跑

### 5.4 覆盖 main.css 的坑

- `main.css:79` `body{background:#fff;overflow:hidden}` —— 长页面必须自己覆盖 `overflow-y:auto`，否则滚不动
- `main.css:86` `body,...{font-size:15pt;font-weight:300 !important}` —— 字重带 `!important`，**覆盖时也得带 `!important`**
- `#bg` 在 `main.css:314` 是 `width:calc(100vw + 4000px)` —— 天生比视口宽 4000px，**这是设计（横向滚动壁纸），不是溢出 bug**。判断横向溢出前先排除它
- 字体统一只需给 `<body>` 加 `class="font-milky-coffee"` —— `fonts.css` 末尾已经把 body / h1-h6 / .pill-button-text 都指向 `var(--primary-font)`，不用改选择器
- 药丸按钮的样式在 `main.css:720-886`（**不是** `style.css`）：`.pill-button` + `.pill-button-decor` / `.pill-left` / `.pill-right`

### 5.5 留言板（Supabase）

**改 about.html 时不要碰这四个契约**，`asset/js/guestbook.js` 强依赖：

| 选择器 | 用途 |
| --- | --- |
| `#guestbook-form` | 表单提交入口 |
| `#guestbook-list` | 留言列表容器 |
| `.guestbook-status` | 状态提示，`querySelector` 取**唯一**一个 |
| `button[type="submit"]` | 提交按钮，脚本会改它的文案和 disabled |

表单项 name 固定为 `name` / `email` / `message` / `website`（`website` 是蜜罐，必须保留）。

**2026-11-19 发现的线上故障：Supabase 项目域名已不存在。**

- 现象：页面显示红字「留言加载失败，请稍后刷新页面。」+「暂时无法加载留言。」
- 证据：`bdfaiqtjsggbewqxbvmw.supabase.co` 在本机 DNS 与阿里公共 DNS(223.5.5.5) 均返回 `Non-existent domain`，Node 报 `getaddrinfo ENOTFOUND`；同期 `supabase.co` 正常解析到 `76.76.21.21`、`home.005711.xyz` 正常解析到 GitHub Pages
- 结论：该 Supabase 项目被暂停或删除，**不是前端代码问题**。恢复需重建项目并把新的 URL 与 publishable key 写进 `asset/js/guestbook-config.js`
- **截至 2026-11-20 尚未修复，仍在等用户决定**

### 5.6 清理残留进程与目录

**`.tmp/edge-profile2` 删不掉。**

- 现象：`rm -rf`、PowerShell `Remove-Item -Recurse -Force`、`cmd rd /s /q` 全部报「另一个程序正在使用此文件」，目录 8.9M 常驻
- 原因：无头 Edge 退出后仍持有句柄
- 做法：**先按端口找真正的持有者**，不要按进程名找（`Get-CimInstance -Filter "Name='msedge.exe'"` 这时会返回 0 条，会误判成没有进程）：

  ```bash
  netstat -ano | grep LISTENING | grep :9333   # 拿到 PID
  taskkill //PID <PID> //T //F                  # //T 连子进程一起杀
  ```

  杀掉后再删目录即可。**以后启动无头浏览器时记下 PID 或端口，用完主动 taskkill**，别指望它自己退干净。

**在 Git Bash 里调 taskkill / netstat 参数要用双斜杠。**

- 写法：`taskkill //PID 1234 //T //F`、`netstat -ano`（`/PID` 会被 MSYS 当成路径转换掉）

---

## 六、汇报口径

- 始终用中文汇报
- 每次改动说清四件事：**改了什么、为什么改、什么没改、什么没验**
- 不把「没做」写成「做了」，不把「没验」写成「已验证」
- 做不到要求时说清卡在哪、试过什么、证据是什么，不要用一个近似结果顶上
