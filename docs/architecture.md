# 🏗️ 架构设计文档

本文档描述青衫工具箱（QingShan Toolbox）的整体架构设计、模块划分和设计原则。

---

## 📋 目录

- [架构概览](#架构概览)
- [模块关系图](#模块关系图)
- [目录结构](#目录结构)
- [核心模块详解](#核心模块详解)
- [设计原则](#设计原则)
- [数据流](#数据流)
- [插件与扩展机制](#插件与扩展机制)
- [技术选型](#技术选型)

---

## 架构概览

青衫工具箱采用 **模块化单体架构**（Modular Monolith），所有功能模块编译进一个二进制文件，通过 Cobra 命令行框架组织为子命令树。每个模块在代码层面独立实现，互不依赖，方便独立开发和测试。

```
┌─────────────────────────────────────────────────────────┐
│                    CLI 入口 (Cobra)                       │
│                   cmd/qstoolbox/main.go                  │
├─────────────────────────────────────────────────────────┤
│                     命令注册层                            │
│  health │ service │ log │ ssh │ inventory │ net │ ...    │
├─────────────────────────────────────────────────────────┤
│                   业务逻辑层 (internal/)                  │
│  health │ service │ logview │ ssh │ inventory │ network  │
│  cleanup │ backup │ config                               │
├─────────────────────────────────────────────────────────┤
│                   公共工具层 (pkg/)                       │
│  util │ output │ errors                                  │
├─────────────────────────────────────────────────────────┤
│                   基础设施层                              │
│  Viper (配置) │ Cobra (CLI) │ OS/Syscall │ SSH Client   │
└─────────────────────────────────────────────────────────┘
```

---

## 模块关系图

```
                        ┌──────────────┐
                        │   main.go    │
                        │  (入口程序)   │
                        └──────┬───────┘
                               │
                    ┌──────────┼──────────┐
                    │     root command    │
                    │   (根命令 + 配置)    │
                    └──────────┬──────────┘
                               │
          ┌────────┬───────┬───┴───┬────────┬────────┬─────────┬────────┐
          │        │       │       │        │        │         │        │
     ┌────┴───┐ ┌──┴──┐ ┌─┴──┐ ┌──┴──┐ ┌───┴──┐ ┌──┴──┐ ┌───┴──┐ ┌──┴───┐
     │ health │ │ svc │ │log │ │ ssh │ │ inv  │ │ net │ │clean │ │backup│
     │ 健康   │ │服务 │ │日志│ │远程 │ │ 资产 │ │网络 │ │ 清理 │ │ 备份 │
     │ 检查   │ │管理 │ │查看│ │执行 │ │ 清单 │ │诊断 │ │      │ │ 管理 │
     └────┬───┘ └──┬──┘ └─┬──┘ └──┬──┘ └───┬──┘ └──┬──┘ └───┬──┘ └──┬───┘
          │        │      │       │        │       │        │       │
          └────────┴──────┴───┬───┴────────┴───────┴────────┴───────┘
                              │
                    ┌─────────┴─────────┐
                    │   pkg/util        │
                    │  (通用工具函数)     │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │  internal/config  │
                    │  (配置管理/Viper)  │
                    └───────────────────┘
```

---

## 目录结构

```
qingshan-toolbox/
├── cmd/
│   └── qstoolbox/              # CLI 入口
│       ├── main.go             # 程序入口点
│       └── root.go             # 根命令定义、全局 flag、配置初始化
│
├── internal/                   # 内部包（不对外暴露）
│   ├── config/                 # 配置管理
│   │   ├── config.go           # 配置结构体定义
│   │   └── loader.go           # 配置加载逻辑 (Viper)
│   │
│   ├── health/                 # 系统健康检查模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── checker.go          # 检查逻辑
│   │   └── reporter.go         # 报告生成
│   │
│   ├── service/                # Windows 服务管理模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── manager.go          # 服务管理逻辑
│   │   └── winsvc.go           # Windows 服务 API 封装
│   │
│   ├── logview/                # 日志查看模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── tailer.go           # 日志追踪
│   │   └── searcher.go         # 日志搜索
│   │
│   ├── ssh/                    # 远程 SSH 执行模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── executor.go         # 命令执行
│   │   └── batch.go            # 批量执行
│   │
│   ├── inventory/              # 软件资产清单模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── scanner.go          # 软件扫描
│   │   └── exporter.go         # 报告导出
│   │
│   ├── network/                # 网络诊断模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── ping.go             # Ping 工具
│   │   ├── trace.go            # 路由追踪
│   │   ├── portscan.go         # 端口扫描
│   │   └── dns.go              # DNS 查询
│   │
│   ├── cleanup/                # 磁盘清理模块
│   │   ├── cmd.go              # Cobra 命令注册
│   │   ├── analyzer.go         # 磁盘分析
│   │   └── cleaner.go          # 清理执行
│   │
│   └── backup/                 # 备份管理模块
│       ├── cmd.go              # Cobra 命令注册
│       ├── creator.go          # 备份创建
│       ├── scheduler.go        # 定时备份
│       └── restorer.go         # 备份还原
│
├── pkg/                        # 公共包（可被外部引用）
│   └── util/
│       ├── format.go           # 输出格式化工具
│       ├── fileutil.go         # 文件操作工具
│       └── sysinfo.go          # 系统信息工具
│
├── configs/                    # 示例配置
│   └── qstoolbox.example.yaml
│
├── docs/                       # 文档
│   ├── getting-started.md
│   └── architecture.md
│
├── scripts/                    # 脚本
│   └── install.ps1
│
├── .github/                    # GitHub 相关配置
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── Dockerfile                  # Docker 构建文件
├── go.mod                      # Go 模块定义
├── go.sum                      # 依赖校验
├── README.md                   # 英文说明
├── README_zh.md                # 中文说明
├── CONTRIBUTING.md             # 贡献指南
└── LICENSE                     # MIT 许可证
```

---

## 核心模块详解

### 1. 配置管理 (`internal/config`)

基于 Viper 实现，支持多来源配置合并：

```
优先级: 命令行参数 > 环境变量 > 配置文件 > 默认值
```

**核心功能：**
- YAML 配置文件解析
- `QSTOOLBOX_` 前缀的环境变量绑定
- 命令行 flag 绑定
- 配置热加载（可选）

**核心接口：**
```go
// Config 全局配置结构体
type Config struct {
    Log     LogConfig     `mapstructure:"log"`
    SSH     SSHConfig     `mapstructure:"ssh"`
    Backup  BackupConfig  `mapstructure:"backup"`
    Cleanup CleanupConfig `mapstructure:"cleanup"`
    Network NetworkConfig `mapstructure:"network"`
    Health  HealthConfig  `mapstructure:"health"`
}

// Load 加载配置
func Load() (*Config, error)
```

### 2. 系统健康检查 (`internal/health`)

收集系统关键指标并生成健康报告。

**采集指标：**
- CPU 使用率（瞬时值和平均值）
- 内存使用率（物理内存和虚拟内存）
- 磁盘使用率（各分区）
- 系统运行时间
- 网络接口状态

**核心接口：**
```go
// Checker 健康检查器接口
type Checker interface {
    Check(ctx context.Context) (*Report, error)
}

// Report 健康报告
type Report struct {
    CPU     CPUStatus
    Memory  MemoryStatus
    Disks   []DiskStatus
    Uptime  time.Duration
    Overall OverallStatus  // Healthy, Warning, Critical
}
```

### 3. 服务管理 (`internal/service`)

封装 Windows Service Control Manager (SCM) API。

**核心功能：**
- 列出系统服务（支持按状态过滤）
- 查看服务详细信息
- 启动/停止/重启服务
- 服务依赖关系查看

**核心接口：**
```go
// Manager 服务管理器接口
type Manager interface {
    List(ctx context.Context, filter Filter) ([]ServiceInfo, error)
    Status(ctx context.Context, name string) (*ServiceInfo, error)
    Start(ctx context.Context, name string) error
    Stop(ctx context.Context, name string) error
    Restart(ctx context.Context, name string) error
}
```

### 4. 远程 SSH 执行 (`internal/ssh`)

通过 SSH 协议在远程主机上执行命令。

**核心功能：**
- 单机命令执行
- 批量命令执行（从主机清单文件读取）
- 支持密钥和密码认证
- 并发执行与结果汇总

**核心接口：**
```go
// Executor SSH 命令执行器
type Executor interface {
    Exec(ctx context.Context, host HostConfig, command string) (*Result, error)
    BatchExec(ctx context.Context, hosts []HostConfig, command string) ([]Result, error)
}
```

### 5. 网络诊断 (`internal/network`)

集成常用网络诊断工具。

**子功能：**
- `Ping` — ICMP 连通性测试
- `Traceroute` — 网络路径追踪
- `PortScan` — TCP 端口扫描
- `DNSLookup` — DNS 解析查询

---

## 设计原则

### 1. 模块化与低耦合

每个功能模块独立封装在 `internal/` 下的子包中，模块之间不直接依赖。模块间通过配置和公共工具包间接协作。

```
✅ 正确: health → pkg/util (公共工具)
✅ 正确: health → internal/config (配置读取)
❌ 错误: health → service (模块间直接依赖)
```

### 2. 接口驱动

核心业务逻辑通过接口定义，方便单元测试和后续扩展：

```go
// 定义接口
type Checker interface {
    Check(ctx context.Context) (*Report, error)
}

// 实现接口
type windowsChecker struct { ... }
type linuxChecker struct { ... }
```

### 3. 统一错误处理

使用自定义错误类型，提供用户友好的错误信息：

```go
// pkg/util/errors.go
type AppError struct {
    Code    string // 错误码
    Message string // 用户友好的错误信息
    Err     error  // 原始错误（用于调试）
}
```

### 4. Context 传递

所有可能耗时的操作都接受 `context.Context` 参数，支持超时和取消：

```go
func (c *checker) Check(ctx context.Context) (*Report, error) {
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
        // 执行检查
    }
}
```

### 5. 单一二进制分发

所有功能编译进一个静态链接的二进制文件，零依赖部署：

```bash
CGO_ENABLED=0 go build -ldflags="-s -w" -o qstoolbox.exe ./cmd/qstoolbox
```

---

## 数据流

### 命令执行数据流

```
用户输入命令
    │
    ▼
Cobra 解析命令行参数
    │
    ▼
Viper 加载配置（文件 + 环境变量 + 参数合并）
    │
    ▼
调用对应模块的业务逻辑
    │
    ▼
模块执行操作（系统调用 / SSH / 文件操作等）
    │
    ▼
收集结果，格式化输出
    │
    ▼
输出到终端（支持 text / json 格式）
```

### 配置加载数据流

```
1. 设置默认值
       │
2. 读取配置文件 (qstoolbox.yaml)
       │
3. 绑定环境变量 (QSTOOLBOX_*)
       │
4. 绑定命令行 flag
       │
5. 合并生成最终配置
       ▼
   Config 结构体
```

---

## 插件与扩展机制

### 添加新模块

青衫工具箱的模块化设计使得添加新功能模块非常简单。以下是添加新模块的步骤：

#### 步骤 1：创建模块目录

```
internal/
└── newmodule/
    ├── cmd.go          # 注册 Cobra 命令
    ├── service.go      # 业务逻辑
    └── service_test.go # 单元测试
```

#### 步骤 2：实现 Cobra 命令

```go
// internal/newmodule/cmd.go
package newmodule

import "github.com/spf13/cobra"

// NewCmd 创建新模块的 Cobra 命令
func NewCmd() *cobra.Command {
    cmd := &cobra.Command{
        Use:   "newmodule",
        Short: "新模块功能描述",
        RunE:  runNewModule,
    }

    // 添加子命令或 flag
    cmd.Flags().StringP("param", "p", "", "参数说明")

    return cmd
}

func runNewModule(cmd *cobra.Command, args []string) error {
    // 业务逻辑
    return nil
}
```

#### 步骤 3：在根命令中注册

```go
// cmd/qstoolbox/root.go
import "github.com/qingshan/toolbox/internal/newmodule"

func init() {
    rootCmd.AddCommand(newmodule.NewCmd())
}
```

### 输出格式扩展

工具支持通过 `--output` flag 指定输出格式：

```go
// pkg/util/format.go
type Formatter interface {
    Format(data interface{}) (string, error)
}

// 已实现：TextFormatter, JSONFormatter, CSVFormatter
// 可扩展：XMLFormatter, YAMLFormatter, TableFormatter 等
```

---

## 技术选型

| 技术 | 用途 | 选型理由 |
|------|------|---------|
| [Go 1.22+](https://go.dev/) | 编程语言 | 静态编译、高性能、跨平台、丰富的标准库 |
| [Cobra](https://github.com/spf13/cobra) | CLI 框架 | Go 生态最流行的 CLI 框架，功能完善 |
| [Viper](https://github.com/spf13/viper) | 配置管理 | 支持多格式、多来源配置，与 Cobra 无缝集成 |
| [golang.org/x/crypto/ssh](https://pkg.go.dev/golang.org/x/crypto/ssh) | SSH 客户端 | Go 官方扩展库，稳定可靠 |
| [gopsutil](https://github.com/shirou/gopsutil) | 系统信息 | 跨平台系统信息采集，API 简洁 |
| [golangci-lint](https://golangci-lint.run/) | 代码检查 | 集成多种 linter，配置灵活 |
| [GitHub Actions](https://github.com/features/actions) | CI/CD | 与 GitHub 深度集成，免费额度充足 |

---

> 📝 **备注**：本文档会随项目演进持续更新。如有架构层面的建议或疑问，欢迎提交 Issue 讨论。
