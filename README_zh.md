<h1 align="center">🔧 青衫工具箱</h1>

<p align="center">
  <strong>一站式 IT 运维工具箱 —— 让日常运维更简单。</strong>
</p>

<p align="center">
  <a href="https://github.com/qingshan/toolbox/actions/workflows/ci.yml"><img src="https://github.com/qingshan/toolbox/actions/workflows/ci.yml/badge.svg" alt="CI 状态"></a>
  <a href="https://github.com/qingshan/toolbox/releases/latest"><img src="https://img.shields.io/github/v/release/qingshan/toolbox?color=blue" alt="最新版本"></a>
  <img src="https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white" alt="Go 版本">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="许可证: MIT"></a>
  <img src="https://img.shields.io/github/stars/qingshan/toolbox?style=social" alt="Star 数">
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> •
  <a href="docs/getting-started.md">快速上手</a> •
  <a href="docs/architecture.md">架构文档</a> •
  <a href="CONTRIBUTING.md">参与贡献</a>
</p>

---

## ✨ 功能特性

青衫工具箱是一款专为 Windows 系统管理员、桌面运维和 IT 运维工程师打造的命令行工具集。它将日常运维中最常用的功能整合到一个二进制文件中，开箱即用，无需复杂配置。

| 模块 | 功能说明 |
|------|---------|
| 🏥 **系统健康检查** | 一键查看 CPU、内存、磁盘等系统状态，快速掌握服务器健康状况 |
| ⚙️ **服务管理** | 启动、停止、重启和监控 Windows 服务，告别繁琐的 GUI 操作 |
| 📋 **日志查看器** | 实时追踪、搜索和过滤应用程序及系统日志，定位问题更高效 |
| 🖥️ **远程 SSH 执行** | 通过 SSH 在远程主机上执行命令，支持单机和批量操作 |
| 📦 **软件资产清单** | 扫描和导出已安装软件信息，轻松管理 IT 资产 |
| 🌐 **网络诊断** | Ping、路由追踪、端口扫描、DNS 查询等网络工具一应俱全 |
| 🧹 **磁盘清理** | 识别和清理临时文件、旧日志，释放宝贵的磁盘空间 |
| 💾 **备份管理** | 计划和管理文件/文件夹备份，支持保留策略和自动清理 |

## 🚀 快速安装

### 方式一：Go Install（推荐 Go 开发者）

```bash
go install github.com/qingshan/toolbox/cmd/qstoolbox@latest
```

### 方式二：直接下载

从 [Releases](https://github.com/qingshan/toolbox/releases/latest) 页面下载适合您平台的二进制文件。

### 方式三：PowerShell 一键安装（Windows）

```powershell
irm https://raw.githubusercontent.com/qingshan/toolbox/main/scripts/install.ps1 | iex
```

### 方式四：从源码构建

```bash
git clone https://github.com/qingshan/toolbox.git
cd toolbox
go build -o qstoolbox.exe ./cmd/qstoolbox
```

## 📖 快速上手

### 系统健康检查

```bash
# 快速查看系统状态
qstoolbox health

# 查看详细信息
qstoolbox health --verbose
```

### 服务管理

```bash
# 列出所有服务
qstoolbox service list

# 查看特定服务状态
qstoolbox service status Spooler

# 重启服务
qstoolbox service restart Spooler
```

### 日志查看

```bash
# 实时追踪日志
qstoolbox log tail -f C:\Logs\app.log

# 搜索日志中的错误信息
qstoolbox log search --keyword "ERROR" --path C:\Logs\app.log
```

### 远程 SSH 执行

```bash
# 在远程主机执行命令
qstoolbox ssh exec --host 192.168.1.100 --user admin "hostname"

# 批量执行（从配置文件读取主机列表）
qstoolbox ssh batch --inventory hosts.yml --command "uptime"
```

### 软件资产管理

```bash
# 扫描已安装软件
qstoolbox inventory scan

# 导出为 CSV 报告
qstoolbox inventory export --format csv --output report.csv
```

### 网络诊断

```bash
# Ping 测试
qstoolbox net ping 8.8.8.8

# 路由追踪
qstoolbox net trace 1.1.1.1

# 端口扫描
qstoolbox net portscan --host 192.168.1.1 --ports 22,80,443

# DNS 查询
qstoolbox net dns example.com
```

### 磁盘清理

```bash
# 分析磁盘使用情况
qstoolbox disk analyze C:\

# 清理 30 天前的临时文件
qstoolbox disk cleanup --older-than 30d --path C:\Temp
```

### 备份管理

```bash
# 创建备份
qstoolbox backup create --source C:\Data --dest D:\Backups

# 设置定时备份（每天凌晨 2 点）
qstoolbox backup schedule --cron "0 2 * * *" --source C:\Data --dest D:\Backups

# 列出备份记录
qstoolbox backup list
```

## ⚙️ 配置说明

青衫工具箱使用 YAML 格式的配置文件。默认按以下顺序查找 `qstoolbox.yaml`：

1. 当前目录
2. `$HOME/.qstoolbox/`
3. `/etc/qstoolbox/`（Linux）

```yaml
# qstoolbox.yaml - 示例配置
log:
  level: info          # 日志级别: debug, info, warn, error
  format: text         # 日志格式: text（文本）, json
  output: stdout       # 输出目标: stdout, stderr, 或文件路径

ssh:
  default_user: admin  # 默认 SSH 用户名
  default_port: 22     # 默认 SSH 端口
  key_path: ~/.ssh/id_rsa  # 默认密钥路径
  timeout: 30s         # 连接超时

backup:
  retention_days: 30   # 备份保留天数
  compression: gzip    # 压缩算法: gzip, zstd, none

cleanup:
  default_age: 30d     # 默认清理文件年龄
  protected_paths:     # 受保护路径（不会被清理）
    - C:\Windows
    - C:\Program Files
```

也可以通过环境变量配置（使用 `QSTOOLBOX_` 前缀）：

```bash
set QSTOOLBOX_LOG_LEVEL=debug
set QSTOOLBOX_SSH_DEFAULT_USER=root
```

## 🖼️ 界面截图

<!-- 截图将在后续添加 -->
<p align="center">
  <em>截图即将推出，敬请期待！</em>
</p>

## 🏗️ 项目结构

```
qingshan-toolbox/
├── cmd/
│   └── qstoolbox/          # CLI 入口（基于 Cobra）
│       └── main.go
├── internal/
│   ├── health/              # 系统健康检查模块
│   ├── service/             # Windows 服务管理模块
│   ├── logview/             # 日志查看与搜索模块
│   ├── ssh/                 # 远程 SSH 执行模块
│   ├── inventory/           # 软件资产清单模块
│   ├── network/             # 网络诊断工具模块
│   ├── cleanup/             # 磁盘清理模块
│   ├── backup/              # 备份管理模块
│   └── config/              # 配置管理（基于 Viper）
├── pkg/
│   └── util/                # 通用工具函数
├── docs/                    # 文档
├── scripts/                 # 安装和辅助脚本
└── configs/                 # 示例配置文件
```

每个模块在 `internal/` 下独立实现，并注册各自的 Cobra 子命令。CLI 入口 `cmd/qstoolbox/` 负责将所有模块串联起来。配置通过 Viper 管理，支持 YAML 文件、环境变量和命令行参数。

详细架构设计请参阅 [docs/architecture.md](docs/architecture.md)。

## 🤝 参与贡献

欢迎参与贡献！请阅读我们的 [贡献指南](CONTRIBUTING.md) 了解如何开始。

- 🐛 [报告 Bug](https://github.com/qingshan/toolbox/issues/new?template=bug_report.md)
- 💡 [提交功能建议](https://github.com/qingshan/toolbox/issues/new?template=feature_request.md)
- 📖 [阅读文档](docs/getting-started.md)

## 📜 开源许可

本项目采用 [MIT 许可证](LICENSE) 开源。

Copyright © 2024-present QingShan Contributors.

## ⭐ Star 历史

<!-- Star 历史图表占位 -->
<p align="center">
  如果觉得本项目对你有帮助，请给一个 ⭐ 支持一下，这对我们非常重要！
</p>

---

<p align="center">
  用 ❤️ 制作，by <a href="https://github.com/qingshan">青衫</a> 及所有贡献者。
</p>
