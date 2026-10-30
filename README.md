# 青衫工具箱 · Windows 桌面运维工作台

> 把 Windows 日常运维，收进一个桌面工作台。

[![framework-ci](https://github.com/DragonTsunami/qingshan-toolbox/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DragonTsunami/qingshan-toolbox/actions/workflows/ci.yml)

青衫工具箱是一个用 **Rust + Tauri 2 + React** 构建的 Windows 桌面运维工具，面向企业员工、IT 支持与运维同学。它不试图替代任务管理器，而是把日常排障最常打开的入口集中到一个界面里：看健康、查进程、管服务、翻日志、清缓存、盘软件，减少在多个系统工具之间来回切换。

当前是 **v0.6.0 桌面版**，规划为桌面端 + 网页端两种形态：桌面端负责本机运维与诊断，网页端后续承载 Terraform、Ansible、GitHub Actions、Jenkins、Dockerfile、Shell 与 Git 记录。

## 它适合谁

- 经常帮同事处理「电脑卡、网断了、服务起不来、C 盘满了」的 IT / 运维同学。
- 需要快速确认本机健康状态、磁盘 SMART、显卡与电池信息的开发者。
- 想把常用 Windows 运维入口收进一个干净工具，而不是记一堆命令的人。

## 当前版本能做什么

- **一眼看健康**：主机、CPU、内存、磁盘、运行时间；健康诊断页汇总电池、磁盘 SMART、显卡与采样时间。
- **排障三件套**：进程结束、Windows 服务启停/重启、TCP 端口与 DNS 诊断。
- **日志与清理**：事件日志检索/详情/CSV 导出；临时文件、浏览器缓存、崩溃转储、更新缓存、回收站白名单清理。
- **启动项与计划任务**：查看、启停，系统级操作按 UAC 权限收敛。
- **软件清单**：软件 / 驱动 / 运行库 / 其他四类，真实图标、版本、最近使用、安装位置；有卸载命令的调用程序自带卸载器。
- **诊断报告**：把硬件与系统摘要导出为 Markdown，方便贴到工单或发给同事；只在本机生成，不上传。
- **桌面体验**：浅色/深色主题、关闭到托盘、单实例、崩溃日志、GitHub Release 更新检查。

> 设计原则：**本地优先、只读优先、危险操作白名单化**。诊断报告不含日志正文、文件内容或凭据；插件是声明式的，不执行第三方代码；卸载只调用程序自带卸载器，不直接删文件。

> **状态**：v0.6.0 开发版，安装器与代码签名仍在收尾；正式安装包会通过 GitHub Releases 发布。当前 54 项 Rust 测试、16 项前端测试通过。界面采用与 **DeepSeek Harness** 同源的中性色 token、黑色主按钮与品牌蓝强调。

> **如果这个项目对你有帮助，欢迎点一个 Star ⭐ 收藏。** 使用中遇到问题、想要某个能力，或者只是觉得哪里不顺手，都欢迎到 [Issues](https://github.com/DragonTsunami/qingshan-toolbox/issues) 反馈；你的反馈会直接影响下一步路线图。

> **获取桌面端**：正式安装包发布后从 [Releases](https://github.com/DragonTsunami/qingshan-toolbox/releases) 下载；发布前可按下方「构建」章节从源码运行。`http://127.0.0.1:1421` 只是前端预览，不是交付形态；桌面端是独立的 Windows exe，不需要 Node/Vite。

![青衫工具箱 概览](docs/images/overview.png)

![插件页：按 DSH 结构重做的插件管理](docs/images/plugins-page.png)

![插件发现：官方可选插件与安装入口](docs/images/plugins-discover.png)

![日志中心：事件通道检索与导出](docs/images/logs-page.png)

![健康诊断：电池、磁盘 SMART、显卡与快速修复](docs/images/diagnostics.png)

![磁盘清理：白名单扫描与安全释放](docs/images/cleanup-page.png)

![启动项与计划任务](docs/images/startup-page.png)

![软件清单：软件、驱动、运行库、其他](docs/images/software-page.png)

![驱动列表](docs/images/software-drivers.png)

![运行库列表](docs/images/software-runtimes.png)

![其他：无卸载命令的项目（当前机器为 0）](docs/images/software-other.png)

更多界面：[深色主题](docs/images/overview-dark.png) · [进程管理](docs/images/processes.png) · [服务管理](docs/images/services.png) · [网络诊断](docs/images/network.png) · [设置](docs/images/settings.png) · [插件详情](docs/images/plugins-detail.png) · [添加插件](docs/images/plugins-add.png)

---

## 1. 当前能力

| 模块 | 能力 | 说明 |
| --- | --- | --- |
| 概览 | 主机、系统、CPU、内存、交换区、磁盘、运行时间 | 自动刷新间隔可选 **1 / 3 / 5 / 10 / 30 / 60 秒**，支持手动刷新 |
| 进程 | 列表、搜索、按 CPU/内存/名称排序、结束进程 | 自动刷新跟随全局间隔；支持强制终止；拦截对 青衫工具箱 自身的操作 |
| 服务 | 枚举 Windows 服务、启停、重启、启动类型 | 操作后等待状态收敛（最长 20 秒）；需要管理员权限 |
| 网络 | 接口、IP/MAC、流量、TCP 端口检测、DNS 解析 | 仅使用系统解析器与 TCP 握手，不执行任意命令 |
| 日志 | Windows 事件日志 Application / System / Security 检索、级别与关键字过滤、事件详情、CSV 导出 | 通过 `wevtutil` 只读读取；Security 通道需要管理员权限；导出到 Downloads |
| 磁盘清理 | 临时文件、浏览器缓存、崩溃转储、Windows Update 缓存、回收站扫描与清理 | 固定白名单，按 id 清理；不触碰个人文档；系统目录需要管理员权限 |
| 启动项 | Run 注册表与启动文件夹、启用状态、启停 | 通过 StartupApproved 写回；系统级项目需要管理员权限 |
| 计划任务 | 任务列表、状态、启停 | 优先读取任务计划服务，受限环境回退任务文件；系统任务需管理员权限 |
| 软件清单 | 软件、驱动、运行库、其他四个 Tab；四列紧凑卡片展示，优先显示真实 Windows 图标，并列出当前版本、最近使用、安装位置；注册表无卸载命令的项目归入「其他」，有卸载命令的卡片可启动程序自带卸载器 | 驱动/运行库按注册表名称与安装器识别，可能有个别归类偏差；卸载需管理员权限，青衫工具箱不直接删除文件 |
| 健康诊断 | 电池、磁盘 SMART/运行状态、显卡、采样时间；刷新 DNS 缓存、打开网络设置两个白名单动作；Markdown 诊断报告预览与导出 | 报告只含硬件与系统摘要，不含日志正文、文件内容或凭据；导出到 `%APPDATA%\com.qingshan.toolbox\reports` |
| 托盘与单实例 | 关闭窗口隐藏到托盘、托盘菜单显示/退出、重复启动聚焦已有窗口 | 单实例使用本机命名互斥量，避免重复 WebView2 数据目录 |
| 更新检查 | 设置页检查 GitHub 最新 Release，显示当前/最新版本，不自动下载执行 | 通过系统 `curl.exe` 访问 GitHub API；网络失败只提示错误 |
| 崩溃记录 | 未捕获 panic 写入 `%APPDATA%\com.qingshan.toolbox\logs\panic-*.log` | 包含位置、信息与回溯，不上传 |
| 插件 | 独立「插件」页：已安装 / 发现、启停、搜索筛选、添加本地插件、官方可选包安装、详情与移除 | 声明式 `plugin.json`，不执行第三方代码；插件页结构参考 DSH 插件管理 |
| 权限 | 检测 UAC 提权状态、以管理员身份重启 | 通过 `ShellExecuteW(runas)` 触发 |
| 体验 | 深色/浅色主题、跟随系统、DSH 同源视觉、WebView2 | 主题记忆在本机，支持 `?theme=dark` 预览 |

**尚未实现（见路线图）**：远程协助、网络进阶、资产上报、网页端；v0.6 的 NSIS 安装包、代码签名、自动下载更新仍受本机工具/证书限制。


---

## 2. 技术选型

| 层 | 技术 | 选择理由 |
| --- | --- | --- |
| 桌面框架 | Tauri 2 | Rust 内核、系统 WebView2、安装包体积小、权限模型清晰 |
| 领域层 | 纯 Rust（`devops-core`） | 不依赖 UI 与平台 API，可被桌面端、未来网页后端复用 |
| 平台层 | `sysinfo` + `windows` crate | 系统指标跨平台；服务/提权使用原生 Win32 API |
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite | 企业级表格/表单组件成熟，后续网页端可复用设计语言与部分组件 |
| 构建 | Cargo workspace + npm | Rust 与前端独立构建，Tauri 负责嵌入产物 |

为什么不是纯 Rust GUI（egui/iced）？桌面端后续要与网页端共享领域模型、命令契约与设计系统，Tauri 的 Web 前端复用价值更高，同时保留 Rust 的系统能力与安全性。

### 视觉语言

界面以 **DeepSeek Harness** 的 `--dsw-*` 主题 token 为基准：

- 中性偏蓝灰阶负责背景/侧栏/卡片层级，品牌蓝 `#4176e6` 只用于链接、焦点、活动图标与数据强调。
- 主按钮使用 ink（浅色 `#0f1115` / 深色 `#f9fafb`），不使用蓝色大按钮。
- 圆角 12–24px、1px 低透明度描边、无渐变与发光；状态使用「圆点 + 中性文字」。
- 品牌字 Montserrat，界面使用系统字体栈。
- 首次启动跟随系统主题，切换后持久化；开发时可用 `?theme=dark` 强制预览。

完整 token 表与组件规则见 [`docs/design-system.md`](docs/design-system.md)。

---

## 3. 仓库结构

```text
DeepSeek-Devops/
├─ desktop/
│  ├─ Cargo.toml                 # Rust workspace
│  ├─ crates/
│  │  ├─ devops-core/            # 领域模型、trait、诊断模型、错误（无平台/UI 依赖）
│  │  ├─ devops-app/             # 应用服务层 OpsService、诊断报告、更新检查（可注入、可测试）
│  │  ├─ devops-testkit/         # 全能力 Mock 与 fixtures
│  │  ├─ devops-plugins/         # 插件清单、市场、安装/移除、启停与内置包
│  │  └─ devops-platform/        # Windows 适配器（sysinfo / Win32 / Event Log / CIM 诊断）
│  ├─ src-tauri/                 # Tauri 壳、命令层、能力声明
│  └─ ui/                        # React 控制台（Vite + Vitest）
├─ docs/
│  ├─ architecture.md            # 分层、命令契约、安全模型
│  ├─ framework.md               # 框架范围、测试矩阵、验收清单
│  ├─ design-system.md           # DSH 同源视觉 token 与组件规则
│  ├─ logs.md                    # 日志中心：通道、过滤、导出与安全边界
│  ├─ plugins.md                 # 声明式插件：目录、manifest、卡片与安全边界
│  └─ roadmap.md                 # 桌面端 + 网页端演进路线
├─ .github/workflows/ci.yml      # Linux core / Windows workspace / UI
├─ scripts/
│  ├─ build-desktop.ps1          # 本机便携工具链构建脚本
│  ├─ registry-proxy.mjs         # 本机 Cargo 稀疏索引代理（仅特殊网络环境）
│  └─ ...
└─ README.md
```

---

## 4. 本地开发

### 4.1 标准环境（推荐）

前置：Rust stable、Node.js 20+、Microsoft C++ Build Tools、WebView2 Runtime（Windows 11 自带）。

```powershell
cd desktop/ui
npm install
npm run build          # 产出 ui/dist，供 Tauri 嵌入
npm test               # Vitest：工具函数 + Mock API 契约

cd ../src-tauri
cargo build --release --features custom-protocol
# 产物：desktop/target/release/opsdeck.exe（交付时重命名为 QingshanToolbox.exe）
```

`custom-protocol` 必须开启：否则 Tauri 会加载 `build.devUrl`（`http://localhost:1420`），窗口显示“无法访问此页面”。开发时 `cargo run` 可配合 `npm run dev` 使用 HMR；交付/分发必须用 release + `custom-protocol`。

### 4.2 当前这台受限机器

该机器没有 Rust / MSVC / Windows SDK，也没有管理员权限。仓库因此内置了一套**完全位于 `.toolchain/` 的便携构建环境**：

- Rust 1.99.1 `x86_64-pc-windows-gnu`，安装在 `.toolchain/rustup`
- 链接器使用 Rust 自带的 `ld.lld`（GNU 工具链自带的 gcc 驱动在该机器上不可用）
- `windres` 从 MSYS2 binutils 中按需提取，用于编译 Windows 图标资源
- Cargo 通过本地 `scripts/registry-proxy.mjs` 访问稀疏索引（本机 schannel 无法获取 TLS 凭据）

构建命令：

```powershell
# 0. 仅本机需要：建立 ASCII 盘符（GNU dlltool 不支持中文路径）
subst R: "C:\Users\青衫\Documents\DeepSeek-Devops"

# 1. 启动本地 Cargo 索引代理（首次或依赖变更时）
node scripts/registry-proxy.mjs

# 2. 构建前端
cd desktop/ui
npm install
npm run build

# 3. 构建并运行桌面端（独立 exe，不依赖 Vite）
cd ../..
.\scripts\build-desktop.ps1 -Release -Run
```

`build-desktop.ps1` 会自动设置 `CARGO_HOME`、`RUSTUP_HOME`、`RUSTFLAGS`、`CARGO_TARGET_DIR`、`PATH` 与临时目录，不修改系统环境变量。

> 这套环境是环境适配，不是项目架构的一部分。在具备 MSVC 的机器上直接使用标准方式即可，无需 `.toolchain/`。

### 4.3 本机验证记录

| 验证项 | 结果 |
| --- | --- |
| `cargo check`（全 workspace，含 Tauri 2.12） | 通过 |
| `cargo build --release --features custom-protocol` → `desktop/target/release/opsdeck.exe` | 通过（7.9 MB，v0.6.0） |
| `cargo test --workspace` | 48 / 48 通过（core 5 + app 18 + platform 16 + plugins 9） |
| `cargo clippy --workspace --all-targets -- -D warnings` | 通过 |
| `cargo fmt --all -- --check` | 通过 |
| 前端 `tsc --noEmit && vite build` | 通过 |
| 前端 `npm test`（Vitest） | 16 / 16 通过 |
| 健康诊断：电池/磁盘/显卡采样、CIM 回退 | 已实现；真实机器读取 3 磁盘/3 显卡 |
| 诊断报告：Markdown 导出、空报告/2MB 限制 | 已实现；真实写入 reports 目录 |
| 托盘 / 单实例 | 已实现；第二次启动退出并聚焦已有窗口，关闭窗口隐藏到托盘 |
| 更新检查 | 已实现；真实 GitHub API 返回「当前已是最新版本」 |
| 崩溃日志 | 已实现；panic hook 写入 `logs/panic-*.log` |
| 刷新间隔选择（1/3/5/10/30/60 秒） | 已实现并持久化到本机 |
| 日志中心：Application 真实事件读取、关键字/级别过滤、详情、CSV 导出 | 已实现；平台真实事件通道测试通过 |
| 磁盘清理：白名单扫描、id 清理、回收站 | 已实现；真实扫描测试通过 |
| 启动项 / 软件清单：注册表读取与启停 | 已实现；真实读取测试通过；系统项目需管理员 |
| 计划任务：列表、状态、启停 | 已实现；受限会话可能返回权限提示，页面会显式提示 |
| 插件页：侧栏「插件」位于「概览」上方；已安装 / 发现、启停、本地安装、可选包、详情与移除 | 已实现；Rust 9 项插件测试通过 |
| 十一个页面 / 两套主题 UI 渲染 | 已截图（`docs/images`） |
| 真实窗口启动 | **已通过**：release + `custom-protocol`，窗口标题 `青衫工具箱`，真实硬件数据渲染 |

集成测试覆盖：系统快照、当前进程可见、拒绝结束自身进程、Windows 服务枚举、网络接口、DNS 解析、关闭端口检测、Application 事件日志真实查询。应用层测试覆盖：参数转发、自进程保护、输入校验、错误传播、服务动作、提权流程、日志查询校验与导出边界。

---

## 5. 命令契约

前端只通过 Tauri `invoke` 调用**白名单命令**，不执行任意 Shell：

| 命令 | 参数 | 返回 |
| --- | --- | --- |
| `system_snapshot` | — | `SystemSnapshot` |
| `process_list` | — | `ProcessInfo[]` |
| `process_kill` | `pid`, `force?` | `void` |
| `service_list` | — | `ServiceInfo[]` |
| `service_action` | `name`, `action: start\|stop\|restart` | `ServiceInfo` |
| `network_interfaces` | — | `NetworkInterface[]` |
| `network_check_port` | `host`, `port`, `timeoutMs?` | `PortCheckResult` |
| `network_resolve` | `host` | `DnsLookupResult` |
| `log_sources` | — | `LogSource[]` |
| `logs_query` | `query: LogQuery` | `LogBatch` |
| `logs_export` | `entries: LogEntry[]` | `LogExport`（CSV 路径与条数） |
| `cleanup_scan` | — | `CleanupScan`（目标、大小、文件数） |
| `cleanup_run` | `ids: string[]` | `CleanupReport`（逐项结果与释放量） |
| `startup_items` | — | `StartupItem[]` |
| `startup_set_enabled` | `id`, `enabled` | `StartupItem[]` |
| `scheduled_tasks` | — | `ScheduledTask[]` |
| `task_set_enabled` | `id`, `enabled` | `ScheduledTask[]` |
| `software_list` | — | `InstalledApp[]` |
| `software_uninstall` | `id` | `void`（按 id 查注册表卸载命令，系统级走 UAC） |
| `open_apps_features` | — | `void`（打开 Windows「应用和功能」） |
| `diagnostics_read` | — | `SystemDiagnostics`（电池/磁盘/显卡/采样时间） |
| `diagnostics_actions` | — | `QuickAction[]` |
| `diagnostics_run_action` | `id` | `QuickActionResult`（仅白名单动作） |
| `diagnostics_export` | `markdown` | `string`（报告文件路径，≤2MB） |
| `update_check` | — | `UpdateCheck`（GitHub Release，不自动下载） |
| `app_info` | — | `AppInfo` |
| `is_elevated` | — | `boolean` |
| `plugin_catalog` | — | `PluginCatalog` |
| `plugin_rescan` | — | `PluginCatalog` |
| `plugin_market` | — | `PluginMarketEntry[]` |
| `plugin_install` | `id` | `PluginCatalog`（官方可选包） |
| `plugin_install_from_path` | `path` | `PluginCatalog`（本地文件夹） |
| `plugin_remove` | `id` | `PluginCatalog`（内置插件不可移除） |
| `plugin_set_enabled` | `id`, `enabled` | `PluginCatalog` |
| `plugin_open_directory` | — | `string`（插件目录） |
| `open_external_url` | `url` | `void`（仅 http(s)） |
| `set_window_theme` | `dark: boolean` | `void`（同步 Windows 标题栏明暗） |
| `relaunch_as_admin` | — | `void`（进程退出并由新实例接管） |

所有结构使用 `camelCase` 序列化，模型定义在 `devops-core/src/models.rs`，前端类型在 `desktop/ui/src/types.ts`，两端字段一一对应。

---

## 6. 安全基线

- 不提供“任意命令执行”入口；所有操作都是强类型命令。
- 结束进程前必须二次确认；青衫工具箱 自身 PID 被硬编码拦截。
- 服务启停依赖 Windows UAC，权限不足时返回明确错误，不在后台静默提权。
- 网络诊断只做 DNS 解析与 TCP 握手，不调用 `cmd/powershell`。
- 插件只声明数据，不执行第三方 JS/Shell；链接白名单、清单大小与字段长度均受限制。
- 前端启用 Tauri capability 白名单；当前仅 `core:default`。
- CSP 目前为 `null`（本地资源、无远程加载），接入远程内容前必须收紧。

---

## 7. 后续规划（框架验收后进入内容阶段）

桌面端：

1. 日志采集与检索（Windows Event Log / 应用日志）
2. 启动项、计划任务、软件清单、磁盘清理
3. 资产上报与合规基线
4. 远程协助入口与工单系统对接

网页端：

1. Git 仓库与提交记录目录
2. Terraform / Ansible 执行与审批流
3. GitHub Actions / Jenkins 连接器
4. Dockerfile / Shell 静态检查与沙箱执行
5. RBAC、审计日志与多租户

详见 [`docs/framework.md`](docs/framework.md)（框架验收）、[`docs/roadmap.md`](docs/roadmap.md) 与 [`docs/architecture.md`](docs/architecture.md)。

---

## 8. 已知限制

- 当前仅提供 Windows 平台适配器；`devops-core` 已为跨平台预留 trait。
- 服务枚举/控制使用 Win32 API，未做服务依赖关系图。
- 无自动更新、代码签名与安装包流水线（后续接入 Tauri bundler + 企业签名）。
- 当前 release 从含中文的仓库路径直接启动不稳定，交付使用 ASCII 安装目录 `C:\QingshanToolbox`（桌面快捷方式已指向该目录）。
- 窗口级 E2E 已手动验证，但尚未接入自动化 UI 测试。
- 插件页复刻 DSH 的「已安装 / 发现」信息架构、行式卡片与安装管理流程；DSH 的 Cordis / Electron 运行时、remote npm / Git 安装、pnpm 输出没有接入。当前只支持安全的声明式 bundle：官方可选包与本地文件夹安装。
- 前端产物约 1 MB（Ant Design），后续按路由拆包。
- WebView2 默认数据目录为 `%LOCALAPPDATA%`；便携/受控终端可用环境变量 `QINGSHAN_WEBVIEW_DATA` 重定向。若默认 profile 被残留实例锁住，启动时会自动改用同级 `-2` 目录，避免窗口静默失败。

## 9. License

MIT。界面中的 Montserrat 字体按 SIL OFL 授权，许可证见 [`desktop/ui/src/assets/fonts/OFL.txt`](desktop/ui/src/assets/fonts/OFL.txt)。
