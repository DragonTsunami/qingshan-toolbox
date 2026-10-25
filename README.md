<h1 align="center">🔧 QingShan Toolbox</h1>

<p align="center">
  <strong>An all-in-one IT operations toolkit built with Go — making daily ops simple.</strong>
</p>

<p align="center">
  <a href="https://github.com/qingshan/toolbox/actions/workflows/ci.yml"><img src="https://github.com/qingshan/toolbox/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/qingshan/toolbox/releases/latest"><img src="https://img.shields.io/github/v/release/qingshan/toolbox?color=blue" alt="Release"></a>
  <img src="https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white" alt="Go Version">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/github/stars/qingshan/toolbox?style=social" alt="Stars">
</p>

<p align="center">
  <a href="README_zh.md">🇨🇳 中文文档</a> •
  <a href="docs/getting-started.md">Getting Started</a> •
  <a href="docs/architecture.md">Architecture</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🏥 **System Health Check** | CPU, memory, disk, and overall system health at a glance |
| ⚙️ **Service Management** | Start, stop, restart, and monitor Windows services |
| 📋 **Log Viewer** | Tail, search, and filter application and system logs in real-time |
| 🖥️ **Remote SSH Execution** | Execute commands on remote hosts via SSH — single or batch |
| 📦 **Software Asset Inventory** | Scan and report installed software across machines |
| 🌐 **Network Diagnostics** | Ping, traceroute, port scan, and DNS lookup utilities |
| 🧹 **Disk Cleanup** | Identify and remove temp files, old logs, and reclaim disk space |
| 💾 **Backup Management** | Schedule and manage file/folder backups with retention policies |

## 🚀 Quick Install

### Option 1: Go Install

```bash
go install github.com/qingshan/toolbox/cmd/qstoolbox@latest
```

### Option 2: Download Binary

Download the latest release for your platform from the [Releases](https://github.com/qingshan/toolbox/releases/latest) page.

### Option 3: PowerShell One-liner (Windows)

```powershell
irm https://raw.githubusercontent.com/qingshan/toolbox/main/scripts/install.ps1 | iex
```

### Option 4: Build from Source

```bash
git clone https://github.com/qingshan/toolbox.git
cd toolbox
go build -o qstoolbox.exe ./cmd/qstoolbox
```

## 📖 Quick Start

```bash
# Check system health
qstoolbox health

# View detailed system info
qstoolbox health --verbose

# Manage Windows services
qstoolbox service list
qstoolbox service status <service-name>
qstoolbox service restart <service-name>

# Tail logs in real-time
qstoolbox log tail -f /var/log/app.log
qstoolbox log search --keyword "ERROR" --path C:\Logs\app.log

# Execute remote commands via SSH
qstoolbox ssh exec --host 192.168.1.100 --user admin "hostname"
qstoolbox ssh batch --inventory hosts.yml --command "uptime"

# Software inventory
qstoolbox inventory scan
qstoolbox inventory export --format csv --output report.csv

# Network diagnostics
qstoolbox net ping 8.8.8.8
qstoolbox net trace 1.1.1.1
qstoolbox net portscan --host 192.168.1.1 --ports 22,80,443
qstoolbox net dns example.com

# Disk cleanup
qstoolbox disk analyze C:\
qstoolbox disk cleanup --older-than 30d --path C:\Temp

# Backup management
qstoolbox backup create --source C:\Data --dest D:\Backups
qstoolbox backup schedule --cron "0 2 * * *" --source C:\Data --dest D:\Backups
qstoolbox backup list
```

## ⚙️ Configuration

QingShan Toolbox uses a YAML configuration file. By default, it looks for `qstoolbox.yaml` in the current directory, `$HOME/.qstoolbox/`, or `/etc/qstoolbox/`.

```yaml
# qstoolbox.yaml
log:
  level: info          # debug, info, warn, error
  format: text         # text, json
  output: stdout       # stdout, stderr, or file path

ssh:
  default_user: admin
  default_port: 22
  key_path: ~/.ssh/id_rsa
  timeout: 30s

backup:
  retention_days: 30
  compression: gzip    # gzip, zstd, none

cleanup:
  default_age: 30d
  protected_paths:
    - C:\Windows
    - C:\Program Files
```

You can also use environment variables with the `QSTOOLBOX_` prefix:

```bash
export QSTOOLBOX_LOG_LEVEL=debug
export QSTOOLBOX_SSH_DEFAULT_USER=root
```

## 🖼️ Screenshots

<!-- Screenshots will be added here -->
<p align="center">
  <em>Screenshots coming soon — stay tuned!</em>
</p>

## 🏗️ Architecture Overview

```
qingshan-toolbox/
├── cmd/
│   └── qstoolbox/          # CLI entry point (Cobra)
│       └── main.go
├── internal/
│   ├── health/              # System health checks
│   ├── service/             # Windows service management
│   ├── logview/             # Log viewing and searching
│   ├── ssh/                 # Remote SSH execution
│   ├── inventory/           # Software asset inventory
│   ├── network/             # Network diagnostics
│   ├── cleanup/             # Disk cleanup utilities
│   ├── backup/              # Backup management
│   └── config/              # Viper-based configuration
├── pkg/
│   └── util/                # Shared utilities
├── docs/                    # Documentation
├── scripts/                 # Install & helper scripts
└── configs/                 # Example config files
```

Each module is self-contained under `internal/` and registers its own Cobra subcommand. The CLI entry point in `cmd/qstoolbox/` wires everything together. Configuration is managed via Viper, supporting YAML files, environment variables, and command-line flags.

For a detailed architecture description, see [docs/architecture.md](docs/architecture.md).

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

- 🐛 [Report a Bug](https://github.com/qingshan/toolbox/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/qingshan/toolbox/issues/new?template=feature_request.md)
- 📖 [Read the Docs](docs/getting-started.md)

## 📜 License

This project is licensed under the [MIT License](LICENSE).

Copyright © 2024-present QingShan Contributors.

## ⭐ Star History

<!-- Star history chart placeholder -->
<p align="center">
  If you find this project useful, please consider giving it a ⭐ — it helps a lot!
</p>

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/qingshan">QingShan</a> and contributors.
</p>
