<h1 align="center">🔧 QingShan Toolbox (青衫工具箱)</h1>

<p align="center">
  <strong>All-in-One IT Desktop Support & DevOps Automation Toolkit built with Go</strong><br>
  <em>一站式企业桌面运维与 DevOps 自动化工具箱 —— 让日常运维更简单、高效、无感。</em>
</p>

<p align="center">
  <a href="https://github.com/DragonTsunami/qingshan-toolbox/releases/latest"><img src="https://img.shields.io/github/v/release/DragonTsunami/qingshan-toolbox?color=2ea44f&label=Release" alt="Release"></a>
  <img src="https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white" alt="Go Version">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-informational" alt="Platforms">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/github/stars/DragonTsunami/qingshan-toolbox?style=social" alt="Stars">
</p>

<p align="center">
  <a href="README.md"><b>🇺🇸 English</b></a> •
  <a href="README_zh.md"><b>🇨🇳 简体中文</b></a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-dual-mode-architecture">Architecture</a> •
  <a href="#-gui-interface-genshin-frosted-glass">GUI Interface</a>
</p>

---

## 🌟 Overview / 项目简介

**QingShan Toolbox (青衫工具箱)** is a modern, lightweight, and high-performance toolkit designed specifically for **Windows System Administrators, Enterprise Desktop Support (Helpdesk), and DevOps Engineers**. 

It uniquely unifies **Dual Workspace Modes**:
1. **Desktop Support Mode (桌面支持卷)**: Solves real-world enterprise employee pain points — hardware tampering detection, equipment handover sign-off sheet generation, zero-impact safe disk cleanup, dormant software audit, print spooler & 0x709 sharing error fixes, DNS/proxy network rescue, and meeting room projection/audio emergencies.
2. **DevOps Ops Mode (DevOps 运维卷)**: Full suite of system health inspection, Windows service management, real-time log trailing, batch SSH remote execution, snapshot backup/recovery, and decentralized Git/NPM plugin loading.

The project features both a powerful **CLI** (`qstoolbox`) and a standalone, zero-dependency **Genshin Liyue Jade Frosted Glass UI** (`web/index.html`) supporting **dynamic Chinese & English (i18n) switching**.

---

## ✨ Key Features / 核心功能

### 🖥️ 1. Enterprise Desktop IT Support (桌面运维支持卷)

* **Hardware Asset & Anti-Tampering Fingerprint (`qstoolbox asset`)**
  * Instant hardware inventory (CPU, Motherboard UUID, RAM slot details, GPU, Disk SNs).
  * **Anti-Tampering Fingerprint Verification**: Compares baseline hardware signatures to detect unauthorized RAM or SSD swapping by employees before return.
  * **Equipment Handover Sign-off Sheet**: Automatically generates printable handover receipts for employee onboarding or offboarding.
* **Zero-Impact Safe Cleanup & Dormant App Audit (`qstoolbox disk` / `asset usage`)**
  * **Daily Safe Cleanup**: Skips locked active files, preserves all browser cookies, session logins, and document caches — frees ~21GB of harmless dead cache.
  * **Dormant App Frequency Audit**: Identifies applications unused for >90 days and provides one-click uninstallation.
  * Per-drive threshold monitor with 85% red-dot visual warnings.
* **Printer & Peripheral Troubleshooting (`qstoolbox desktop fix --spooler | --print709`)**
  * One-click print queue purge and Spooler daemon recovery.
  * Fixes post-update LAN shared printer errors `0x00000709` and `0x0000011b` (RPC authentication).
* **Network & Proxy Emergency Fixes (`qstoolbox desktop fix --dns | --proxy | --winsock`)**
  * Flushes DNS cache, resets Winsock TCP/IP stack.
  * Cleans leftover proxy configurations (fixes "WeChat works but web browsers cannot open pages").
* **Meeting Room Emergency SOS (`qstoolbox desktop fix --display-reset | --audio-reset | --presentation`)**
  * Resets GPU display pipelines and Win+P projection outputs for projectors and external displays.
  * Restores HDMI conference audio output routing.
  * Enables high-priority presentation keep-awake mode to prevent executive screen timeouts during meetings.
* **System Environment Repair (`qstoolbox desktop fix --icon-cache | --hibernate`)**
  * Rebuilds corrupted desktop icon cache databases.
  * Disables hibernation to reclaim 16GB~32GB of `hiberfil.sys` space on drive C:.

### ⚙️ 2. DevOps & Infrastructure Operations (DevOps 运维卷)

* **System Health Inspection (`qstoolbox check all`)**: Real-time CPU, RAM, and physical drive metrics.
* **Service Daemon Management (`qstoolbox service`)**: Query, stop, start, and restart Windows background services without heavy GUI tools.
* **Log Analyzer & Tail Stream (`qstoolbox logs`)**: Real-time `tail -f` log streaming with error keyword filtering and Windows Event Log inspection.
* **Remote Batch Execution (`qstoolbox remote`)**: Concurrent SSH/WinRM script execution and automated software deployment.
* **Backup & Restore (`qstoolbox backup`)**: JSON manifest snapshot backup with ZIP compression and automated retention policies.
* **Decentralized Plugin Ecosystem (`qstoolbox plugin`)**: Zero-server, review-free extension loading directly from Git repositories or NPM packages.

---

## 🎨 GUI Interface (Genshin Frosted Glass UI)

The web dashboard is delivered in a single, lightweight file [web/index.html](web/index.html):
- **Aesthetic**: Genshin Impact Liyue-inspired frosted jade glass texture with subtle breathing aurora blobs.
- **Dynamic Language Switch (i18n)**: Switch between **简体中文** and **English** dynamically in **Settings (系统设置 ➜ 交互与主题偏好)**. User preferences are automatically remembered via `localStorage`.
- **Pure & Clean**: No visual clutter, SVG hardware indicators, responsive scaling for 1080p, 2K, and laptop displays.

---

## 🚀 Quick Start / 快速开始

### 1. Build from Source

```bash
# Clone the repository
git clone https://github.com/DragonTsunami/qingshan-toolbox.git
cd qingshan-toolbox

# Build binary
go build -o qstoolbox.exe ./cmd/qstoolbox
```

### 2. Common CLI Commands

```bash
# === Desktop IT Support Mode ===
# Show hardware specs
./qstoolbox.exe asset hardware

# Run hardware anti-tampering fingerprint verification
./qstoolbox.exe asset fingerprint

# Generate equipment handover sheet
./qstoolbox.exe asset handover --type return

# Safe cache cleanup without losing browser logins
./qstoolbox.exe disk clean --safe

# Fix print spooler stalled queue
./qstoolbox.exe desktop fix --spooler

# Fix shared printer 0x709 / 0x11b error
./qstoolbox.exe desktop fix --print709

# Reset network proxy leftovers (fix browser unreachable)
./qstoolbox.exe desktop fix --proxy

# Reset conference display projection
./qstoolbox.exe desktop fix --display-reset

# Rebuild corrupted desktop white icon cache
./qstoolbox.exe desktop fix --icon-cache

# === DevOps Mode ===
# Run full system health check
./qstoolbox.exe check all

# Query and restart service
./qstoolbox.exe service status wuauserv
./qstoolbox.exe service restart spooler

# Tail real-time log
./qstoolbox.exe logs tail C:\app\logs\sys.log
```

### 3. Launching the GUI Dashboard

Simply double-click or serve [web/index.html](web/index.html) in any modern browser (Edge, Chrome, Firefox).

---

## 📂 Repository Structure

```
qingshan-toolbox/
├── cmd/
│   └── qstoolbox/          # CLI Entrypoint (Cobra)
├── internal/
│   ├── cli/                # Desktop fix, asset fingerprint, disk, net commands
│   ├── health/             # System health inspection
│   ├── service/            # Windows service daemon management
│   ├── logview/            # Log streaming and event viewer
│   ├── ssh/                # Batch remote SSH runner
│   ├── inventory/          # Hardware & software asset auditing
│   ├── cleanup/            # Safe cache cleanup algorithms
│   ├── backup/             # Snapshot backup engine
│   └── config/             # YAML and environment variable configuration
├── web/
│   └── index.html          # Standalone Genshin Frosted Glass UI (bilingual i18n)
├── docs/                   # Documentation & guides
├── scripts/                # Utility and deployment scripts
├── README.md               # English Documentation (Default)
└── README_zh.md            # 简体中文详细文档
```

---

## 🌐 Bilingual Support / 双语支持

QingShan Toolbox is fully bilingual:
- **Documentation**: Both English ([README.md](README.md)) and Simplified Chinese ([README_zh.md](README_zh.md)) are maintained in this single repository.
- **Application GUI**: Switch between **简体中文** and **English** inside the **Settings** view (`系统设置 ➜ 交互与主题偏好 ➜ 界面语言`).

---

## 📜 License

This project is open-sourced under the [MIT License](LICENSE).

Copyright © 2026-present QingShan Contributors.
