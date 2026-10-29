# 框架阶段与验收标准

> 当前原则：**只做框架，不做内容。** 在框架验收清单全部通过之前，不新增业务页面、不接入真实日志/清理/资产能力，也不开始网页端实现。

## 1. 阶段范围

框架阶段只交付“承载业务的基础设施”：

- Rust workspace 分层与依赖规则
- 可注入、可测试的应用服务层
- Windows 平台适配器与跨平台 Mock
- Tauri 命令契约、窗口与权限模型
- React 应用外壳：主题、布局、路由、错误边界、API 封装
- 构建、测试、CI、文档与本地工具链

**不在本阶段**：日志中心、磁盘清理、启动项、资产上报、远程协助、网页端 Terraform/Ansible/CI 集成。

当前五个页面（概览/进程/服务/网络/设置）作为**框架参考实现**保留，用于验证命令链路和视觉系统；不继续扩展功能。

## 2. 依赖规则

```text
UI (React)
  ↓ Tauri IPC
src-tauri (commands)          // 只做参数适配、异步调度、窗口主题
  ↓
devops-app (OpsService)       // 用例编排、跨平台守卫、输入校验
  ↓
devops-core (traits/models)   // 无平台依赖、无 UI 依赖
  ↑
devops-platform (Windows)     // sysinfo + Win32
devops-testkit (mocks)        // 仅测试/开发依赖
```

强制约束：

1. `devops-core` 不得依赖 Tauri、sysinfo、windows 或 React。
2. `src-tauri` 不得直接调用 Win32；只通过 `OpsService`。
3. `devops-app` 不得依赖 `devops-platform` 或 Tauri，保证可在 Linux CI 测试。
4. 每个 `devops-core` trait 必须在 `devops-testkit` 有 Mock 实现。
5. 新增命令必须同时补应用层测试；新增模型字段必须补契约测试。

## 3. 测试金字塔

| 层级 | 位置 | 内容 | 当前结果 |
| --- | --- | --- | --- |
| 契约测试 | `devops-core/tests/contract.rs` | camelCase 字段、枚举字符串、错误码、AppInfo | 5 / 5 |
| 应用层测试 | `devops-app/tests/service_layer.rs` | 参数转发、自进程保护、校验、错误传播、提权 | 11 / 11 |
| 组件单测 | `devops-app` 内部 | `OpsService: Send + Sync` | 1 / 1 |
| 插件清单测试 | `devops-plugins/tests/store.rs` | 内置种子、外部 manifest、BOM、启停持久化、非法 id/URL | 7 / 7 |
| 平台集成测试 | `devops-platform/tests/platform_smoke.rs` | 真实 Windows 快照/进程/服务/网络/DNS | 7 / 7 |
| 前端类型与构建 | `desktop/ui` | `tsc --noEmit && vite build` | 通过 |
| 前端单测 | `desktop/ui/src/**/*.test.ts` | 格式化工具、刷新间隔、插件 Mock API 契约 | 13 / 13 |
| 视觉冒烟 | `docs/images` | 七个页面（含独立插件页）+ 插件管理 × 浅色/深色截图 | 通过 |
| 窗口级 E2E（手动） | `C:\QingshanToolbox` | release + `custom-protocol`，真实窗口/真实硬件数据 | 通过 |
| 自动化 E2E | 待补 | WebDriver/tauri-driver，IPC 往返与主题切换 | 未接入 |

总计 Rust 31 项测试（5 + 11 + 1 + 7 + 7），前端 13 项测试。

## 4. 验收清单

### 已完成

- [x] Cargo workspace 四层边界（core / platform / app / testkit）
- [x] Tauri 命令层变薄，业务编排集中在 `OpsService`
- [x] 全能力 Mock 与 fixtures，应用层测试可跨平台运行
- [x] 序列化契约测试（字段、枚举、错误码）
- [x] 真实 Windows 适配器集成测试
- [x] 前端全局错误边界
- [x] 前端 Vitest（格式化工具 + Mock API 契约）
- [x] 主题系统跟随系统、标题栏同步
- [x] 窗口级手动验证：release + `custom-protocol` 独立启动，真实系统数据渲染
- [x] `cargo fmt --check` / `cargo clippy -D warnings`
- [x] GitHub Actions：Linux core、Windows workspace、前端构建
- [x] 视觉 token 文档与页面截图

### 待完成（内容开发前必须关闭）

- [ ] 自动化窗口 E2E：tauri-driver/WebDriver，覆盖 IPC 往返、主题切换、窗口生命周期
- [ ] 安装包流水线：NSIS 构建、签名、升级策略
- [ ] 性能基线：启动时间、内存占用、进程页大数据量（>1000）表现
- [ ] 可访问性基线：键盘导航、焦点环、对比度
- [ ] 依赖安全：`cargo deny` / `npm audit` 门禁
- [ ] 日志与崩溃上报基础设施（仅框架，不含业务日志采集）
- [ ] 配置分层：开发/测试/生产配置与环境变量规范

## 5. 运行方式

```powershell
# 全部 Rust 测试（Windows）
cargo test --workspace --manifest-path desktop/Cargo.toml

# 仅框架层（任意平台）
cargo test -p devops-core -p devops-app -p devops-testkit --manifest-path desktop/Cargo.toml

# 格式与 Clippy
cargo fmt --all --manifest-path desktop/Cargo.toml -- --check
cargo clippy --workspace --all-targets --manifest-path desktop/Cargo.toml -- -D warnings

# 前端
cd desktop/ui
npm run build
npm test

# 独立桌面端（必须启用 custom-protocol，否则会加载 localhost:1420）
cargo build --release --features custom-protocol --manifest-path desktop/src-tauri/Cargo.toml
```

本机受限环境使用 `scripts/build-desktop.ps1 -Release` 设置便携工具链；CI 使用标准 MSVC 工具链。

## 6. 内容开发准入条件

只有满足以下条件，才进入“内容制作”：

1. 验收清单中 P0 项全部关闭：自动化窗口 E2E、安装包、性能基线、安全门禁。
2. `cargo test --workspace`、`clippy -D warnings`、前端构建/测试在 CI 全绿。
3. 命令契约与模型字段冻结，新增能力必须先更新 `devops-core` 与契约测试。
4. 每个新页面必须复用框架外壳（主题、错误边界、权限提示），不得绕过 `OpsService`。

## 7. 已知环境限制

- 当前执行环境的 DSH 沙箱会拦截 WebView2 浏览器子进程与命名管道，直接在本会话启动窗口会失败；通过 Windows Shell / 快捷方式启动可以绕开。
- 已手动验证：release + `custom-protocol` 安装到 `C:\QingshanToolbox`，窗口正常加载真实硬件数据。
- 从含中文的仓库路径直接启动仍不稳定，因此交付使用 ASCII 安装目录 `C:\QingshanToolbox`；后续用 MSVC 工具链重编可进一步排查。
- 自动化窗口 E2E 仍需在普通 Windows 桌面或 CI 的 `windows-latest` 上执行。
- 未启用 `custom-protocol` 的构建会加载 `http://localhost:1420`，窗口显示“无法访问此页面”；分发构建必须使用 `--release --features custom-protocol`。
