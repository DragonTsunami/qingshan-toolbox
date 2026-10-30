# 架构设计

## 1. 目标

同一套 DevOps 能力，交付两种形态：

- **桌面端**：运行在员工 Windows 终端上，负责单机运维、资产采集、受限系统操作。
- **网页端**：运行在企业内网/云上，负责多仓库、多环境的 DevOps 工件治理与审计。

两者共享**领域模型**与**命令契约**，但不共享进程边界。桌面端离线可用；网页端面向团队协作。

## 2. 分层

```text
┌──────────────────────────────────────────────────────────┐
│  UI 层 (React + Ant Design)                              │
│  pages / components / api.ts (invoke) / mock.ts          │
└───────────────────────────┬──────────────────────────────┘
                            │ Tauri IPC（白名单命令）
┌───────────────────────────▼──────────────────────────────┐
│  桌面壳层 (src-tauri)                                    │
│  commands.rs  —— IPC 参数适配、插件/日志/运维命令、错误转换 │
│  state.rs     —— OpsService + LogService + CleanupService + MaintenanceService + PluginStore │
│  window       —— 主题、WebView2 数据目录                 │
└───────────────────────────┬──────────────────────────────┘
                            │ 用例调用
┌───────────────────────────▼──────────────────────────────┐
│  应用服务层 (devops-app)                                 │
│  OpsService / LogService / CleanupService / MaintenanceService │
│  —— 编排、输入校验、自进程保护、提权流程                │
└───────────────────────────┬──────────────────────────────┘
                            │ trait objects
┌───────────────────────────▼──────────────────────────────┐
│  领域层 (devops-core)                                    │
│  models/logs/cleanup/startup/software —— 领域模型         │
│  traits.rs   —— SystemProbe / LogCenter / Cleanup /        │
│                 StartupManager / SoftwareInventory        │
│  error.rs    —— OpsError / OpsResult                     │
└───────────────────────────┬──────────────────────────────┘
                            │ 实现
┌───────────────────────────▼──────────────────────────────┐
│  平台层 (devops-platform)                                │
│  Windows：sysinfo、Win32 Service API、UAC、TCP/DNS、      │
│  wevtutil 事件日志、注册表启动项/软件、临时目录清理       │
│  未来：Linux / macOS / 远端 Agent                         │
└──────────────────────────────────────────────────────────┘

devops-testkit —— 全部 trait 的 Mock，供 devops-app 测试注入
devops-plugins —— 声明式插件清单、市场、安装/移除、启停状态；不依赖 Tauri / Win32 / 前端
```

关键约束：

1. `devops-core` 不得依赖 Tauri、`sysinfo`、`windows` 或任何 UI 库。
2. `devops-app` 不得依赖 Tauri、`devops-platform`，保证可在 Linux CI 测试。
3. `src-tauri` 不得直接调用 Win32；只能通过 `OpsService`。
4. UI 不得拼接命令字符串；只能调用已注册命令。
5. 所有跨层数据结构实现 `Serialize + Deserialize`，字段统一 `camelCase`。
6. 每个 `devops-core` trait 必须在 `devops-testkit` 有 Mock；新增命令必须补应用层测试。
7. `devops-plugins` 只解析声明式 JSON；不得执行插件提供的 JS/Shell，外链仅允许 `http(s)`；本地安装限制文件数、总大小并拒绝 symlink。

## 3. 为什么这样分层

- **可测试**：领域层可以纯单元测试；平台层可用 mock 实现替换。
- **可复用**：网页后端（未来 Axum 服务）可以直接依赖 `devops-core`，复用模型与校验；桌面端与网页端对“进程/服务/主机”的定义保持一致。
- **可移植**：新增 Linux/macOS 只需实现 trait，不必改 UI 与命令层。
- **可审计**：能力边界由 trait 与命令白名单显式定义，天然适合做权限矩阵。

## 4. 命令调用链

以“停止服务”为例：

```text
Button onClick
  → applyServiceAction(name, "stop")            // ui/src/api.ts
  → invoke("service_action", { name, action })  // Tauri IPC
  → commands::service_action                    // 参数适配 + spawn_blocking
  → OpsService::apply_service(name, Stop)       // 校验 + 编排
  → ServiceControl::apply(name, Stop)           // trait
  → ServiceControlImpl (Win32)                  // OpenService / ControlService / 轮询
  → ServiceInfo (camelCase JSON)                // 回传
  → message.success + 刷新列表
```

日志查询使用同一条链路：

```text
LogsPage 查询
  → queryLogs({source, level, keyword, limit})   // ui/src/api.ts
  → invoke("logs_query", { query })              // Tauri IPC
  → commands::logs_query                         // spawn_blocking
  → LogService::query                            // 校验 limit/keyword
  → LogCenter::query                             // trait
  → wevtutil qe <Channel> /rd:true /f:xml        // 只读，无任意 Shell
  → quick-xml 解析 → LogBatch (camelCase JSON)
  → 表格 / 详情 Drawer / CSV 导出
```

阻塞型系统调用（服务枚举/启停、网络探测、事件日志读取）统一放在 `spawn_blocking`，避免阻塞 Tauri 主线程；快照与进程列表保持同步命令，由前端节流刷新。

## 4.1 测试边界

| 层 | 测试方式 |
| --- | --- |
| `devops-core` | 序列化契约、枚举、错误码（`tests/contract.rs`） |
| `devops-app` | 注入 `devops-testkit` Mock，验证参数转发、校验、守卫与错误传播 |
| `devops-platform` | 真实 Windows 集成测试（快照/进程/服务/网络/事件日志） |
| `src-tauri` | 不设 Rust 单测；命令层保持极薄，窗口行为由 E2E 覆盖 |
| UI | `tsc` + Vitest + 构建 + 截图冒烟 |

## 5. 状态与刷新策略

- 前端维护页面级状态，不引入全局 store；跨页共享的只有 `SystemSnapshot` 与 `AppInfo`。
- 概览/主机信息：30 秒轮询。
- 进程：默认 4 秒轮询，可关闭；结束进程后立即刷新。
- 服务：进入页面加载，操作后刷新；不自动轮询，避免枚举开销。
- 网络接口：手动刷新。

## 6. 权限模型

- 进程：普通用户可枚举；结束其他用户/系统进程通常需要管理员，失败时返回 `PermissionDenied`。
- 服务：枚举通常允许；启停需要管理员。UI 在非提权时禁用按钮并提示。
- 提权：`ShellExecuteW(..., "runas", ...)` 触发 UAC；成功后当前进程退出，新实例接管。
- 不进行“静默提权”或计划任务绕过。

## 7. 错误模型

`OpsError` 分为 `Platform / NotFound / PermissionDenied / InvalidInput / Io`，命令层转为字符串返回。前端直接展示错误；后续可扩展为 `{ code, message }` 结构，用于区分“需要提权”“目标不存在”等分支。

## 8. 网页端架构（规划）

```text
web/
  api/          Rust (Axum) 或 BFF
  worker/       执行器（Terraform/Ansible/CI 连接器）
  ui/           复用设计系统，独立构建
  db/           PostgreSQL：仓库、运行记录、审计
  object-store/ 工件、plan 输出、日志
```

建议按限界上下文拆分：

| 上下文 | 职责 |
| --- | --- |
| Catalog | 仓库、环境、服务目录、Git 提交记录 |
| IaC | Terraform plan/apply、Ansible playbook 执行与审批 |
| CI/CD | GitHub Actions / Jenkins 连接器、构建记录 |
| Container | Dockerfile 解析、镜像构建、漏洞扫描 |
| Scripts | Shell 脚本静态检查、沙箱执行 |
| Audit | 操作审计、变更单、RBAC |

网页端不直接复用 Tauri 命令层，但复用 `devops-core` 的模型与错误语义；执行器与 API 通过队列解耦，避免长任务占用 HTTP 线程。

## 9. 安全设计要点

- 桌面端：最小命令面、UAC 显式授权、危险操作二次确认、无任意命令执行。
- 网页端：所有执行型操作必须绑定审批与审计；凭据使用 Vault/KMS；Terraform state 加密存储；Jenkins/GitHub token 不落前端。
- 供应链：锁定依赖版本、启用 `cargo deny` / `npm audit`、构建产物签名。

## 10. 构建与发布

- 开发：`npm run build` + `cargo run`（或标准 `tauri dev`）。
- 发布：Tauri bundler 生成 NSIS/MSI，企业代码签名后分发。
- 网页端：容器镜像 + Helm Chart，前置反向代理与 SSO。
