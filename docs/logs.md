# 日志中心

日志中心是阶段 2 的第一个运维能力，入口位于侧栏「日志中心」。它只读 Windows 事件日志，不修改系统、不执行任意 Shell。

![日志中心](images/logs-page.png)

![事件详情](images/logs-detail.png)

## 能力

| 能力 | 说明 |
| --- | --- |
| 事件通道 | Application、System、Security |
| 级别过滤 | 严重、错误、警告、信息、详细、未知 |
| 关键字 | 消息、来源、通道、计算机、事件 ID、事件字段，大小写不敏感 |
| 条数 | 100 / 200 / 500，后端硬上限 500 |
| 详情 | 事件来源、通道、计算机、用户、事件 ID、EventData 字段 |
| 导出 | CSV，UTF-8 BOM，默认写入 `%USERPROFILE%\Downloads` |

Security 通道需要管理员权限。标准用户查询时会显示「安全日志需要以管理员身份运行」，并提供「以管理员身份重启」按钮。

## 数据读取

Windows 适配器使用：

```text
wevtutil.exe qe <Application|System|Security> /c:<n> /rd:true /f:xml
```

- 使用 `CREATE_NO_WINDOW`，避免弹出控制台窗口。
- 先读取 XML，再由 `quick-xml` 解析 `<Event>`；不依赖本地语言包。
- 带过滤条件时最多扫描 `limit * 4` 条，硬上限 1000，避免一次读取整本日志。
- 输出兼容 UTF-8 BOM、UTF-16LE/BE；部分系统会把 `wevtutil` 输出为 UTF-16。

## 分层

```text
LogsPage
  → api.queryLogs / exportLogs
  → Tauri commands::logs_query / logs_export   (spawn_blocking)
  → devops-app::LogService                     (参数校验)
  → devops-core::LogCenter trait
  → devops-platform::win::logs::LogCenterImpl  (wevtutil + quick-xml)
```

领域模型在 `devops-core/src/logs.rs`：

- `LogSource` / `LogSourceKind`
- `LogLevel` / `LogEntry` / `LogField`
- `LogQuery` / `LogBatch` / `LogExport`

应用层限制：

- `source` 不能为空；
- `limit` 1..=500；
- `keyword` 最多 128 字符；
- 导出最多 10000 条，空列表直接拒绝。

## 命令

| 命令 | 参数 | 返回 |
| --- | --- | --- |
| `log_sources` | — | `LogSource[]` |
| `logs_query` | `query: LogQuery` | `LogBatch` |
| `logs_export` | `entries: LogEntry[]` | `LogExport` |

所有字段按 camelCase 序列化，与 `desktop/ui/src/types.ts` 对应。

## 安全边界

- 不提供任意命令执行；`wevtutil` 的通道与参数由后端固定。
- 关键字只用于内存过滤，不拼接进命令行。
- 导出路径固定到 Downloads（不存在时落临时目录），不接受前端任意路径。
- 日志内容可能包含路径、账户名等敏感信息；导出文件由用户自行保管。

## 测试

```powershell
cargo test -p devops-app -p devops-platform
npm test -- --run
```

平台测试会真实读取 Application 通道最近事件；Security 通道的行为取决于当前进程权限。
