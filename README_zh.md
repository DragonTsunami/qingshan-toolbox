<h1 align="center">🔧 青衫工具箱 (QingShan Toolbox)</h1>

<p align="center">
  <strong>专为企业桌面运维与 DevOps 自动化打造的一站式 Go 语言工具箱</strong><br>
  <em>开箱即用 · 双工作区架构 · 硬件防调包 · 会议急救 · 日常无感瘦身 · 璃月毛玻璃 UI · 中英文双语支持</em>
</p>

<p align="center">
  <a href="https://github.com/DragonTsunami/qingshan-toolbox/releases/latest"><img src="https://img.shields.io/github/v/release/DragonTsunami/qingshan-toolbox?color=2ea44f&label=最新版本" alt="Release"></a>
  <img src="https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white" alt="Go 版本">
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20Linux%20%7C%20macOS-informational" alt="支持平台">
  <a href="LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-blue.svg" alt="许可证: MIT"></a>
  <img src="https://img.shields.io/github/stars/DragonTsunami/qingshan-toolbox?style=social" alt="Star 数">
</p>

<p align="center">
  <a href="README_zh.md"><b>🇨🇳 简体中文</b></a> •
  <a href="README.md"><b>🇺🇸 English</b></a> •
  <a href="#-快速上手">快速上手</a> •
  <a href="#-双工作区架构设计">架构设计</a> •
  <a href="#-图形界面-genshin-毛玻璃-ui">图形界面</a>
</p>

---

## 🌟 项目简介

**青衫工具箱（QingShan Toolbox）** 是一款专为 **Windows 系统管理员、企业 IT 桌面支持（Helpdesk）及 DevOps 运维工程师** 打造的高性能现代化工具箱。

项目创新性地融合了 **双工作区模式（Dual Workspace Architecture）**：
1. **桌面支持卷（Desktop IT Support Mode）**：精准直击日常办公核心痛点 —— 硬件防拆防调包指纹比对、员工离职/转岗设备交接签署单生成、日常无感安全磁盘瘦身、长期闲置软件使用频率盘点、打印机卡单与共享 0x709 报错修复、网络与代理急救、会议室多屏投影纠偏与音频路由。
2. **DevOps 运维卷（DevOps Ops Mode）**：全套系统健康巡检、后台服务守护与平滑重启、实时日志流 Follow 跟随、SSH 批量远程并发执行、配置快照备份还原、去中心化 Git/NPM 插件扩展体系。

除了功能完备的命令行工具（`qstoolbox`），还内置了一款纯净轻量、零依赖的 **原神璃月玉石毛玻璃界面**（`web/index.html`），并原生内置 **中文 / 英文（i18n）动态即时切换**。

---

## ✨ 核心功能矩阵

### 🖥️ 1. 企业桌面 IT 运维支持卷（Desktop IT Support）

* **硬件资产与防拆防调包指纹核验（`qstoolbox asset`）**
  * 深度穿透 WMI 与 DirectX 探测硬件（主板 UUID、CPU 封装、各插槽内存序列号 SN、固态/机械硬盘 SN）。
  * **防调包指纹核验（Anti-Tampering Fingerprint）**：自动与初始资产建档基线指纹比对，精准识别员工离职或归还时私自偷换拆卸内存、固态硬盘等恶劣行为。
  * **设备交接单生成（Handover Sheet）**：一键生成符合企业资产审计标准的打印版领用/归还交接签署单与纯文本清单。
* **日常无感安全瘦身与闲置软件盘点（`qstoolbox disk` / `asset usage`）**
  * **日常无害瘦身**：严格保护浏览器登录态（绝不清除 Cookies 与书签）、微信及办公文档、桌面文件，仅清理死缓存与孤立临时文件，日常无需重新登录。
  * **闲置软件使用频率分析**：自动扫描盘点超过 90 天未运行的“吃灰”软件，提供一键快捷卸载。
  * **单硬盘容量预警**：单盘空间占用 ≥ 85% 触发红点警报，并支持各盘独立相对缓存一键释放。
* **打印机与外设排障急救（`qstoolbox desktop fix --spooler | --print709`）**
  * 一键清空 Spool 假脱机阻塞队列并平滑重启服务，恢复卡死打印任务。
  * 彻底修复 Windows 更新引起的局域网共享打印机 `0x00000709` 与 `0x0000011b` RPC 管道认证报错。
* **网络连通与代理急救（`qstoolbox desktop fix --dns | --proxy | --winsock`）**
  * 一键刷新并重置 DNS 缓存，重置 Winsock 协议栈。
  * 清除系统代理残留（秒级急救“微信企业微信正常通讯但浏览器打不开任何网页”的代理残留问题）。
* **会议室音视频急救（`qstoolbox desktop fix --display-reset | --audio-reset | --presentation`）**
  * 重置显卡渲染管道与 Win+P 投影输出，急救会议投影仪黑屏、不识别外接屏。
  * 强制纠偏系统默认音频输出通道至会议大屏 HDMI。
  * 开启高优先级会议演示防息屏保活模式，杜绝领导汇报途中休眠黑屏。
* **系统环境修护（`qstoolbox desktop fix --icon-cache | --hibernate`）**
  * 重建损坏的 Windows 图标缓存数据库，解决桌面图标变成白块的问题。
  * 一键关闭休眠释放 C 盘 `hiberfil.sys` 占用的 16GB~32GB 宝贵空间。

### ⚙️ 2. DevOps 基础设施运维卷（DevOps Ops Mode）

* **系统状态全量巡检（`qstoolbox check all`）**：实时监测 CPU、物理内存与多物理磁盘负载。
* **Windows 服务守护（`qstoolbox service`）**：快速查询、启动、停止、平滑重启系统及应用后台服务。
* **日志监控与分析（`qstoolbox logs`）**：实时 `tail -f` 日志流跟随、关键词高亮过滤、系统错误事件抓取。
* **批量并发远程执行（`qstoolbox remote`）**：通过 SSH/WinRM 向多台目标主机并发下发配置与脚本。
* **快照备份与还原（`qstoolbox backup`）**：带 JSON 清单的 ZIP 压缩备份，支持保留期限与自动归档。
* **去中心化插件中心（`qstoolbox plugin`）**：无需任何中心化应用市场审核与服务器成本，直接从 Git 仓库或 NPM 包克隆加载运维扩展。

---

## 🎨 图形界面（Genshin 璃月玉石毛玻璃 UI）

图形控制台位于单文件 [web/index.html](web/index.html)：
- **视觉风格**：璃月玉石质感毛玻璃，沉浸式极光浮动背景，精致轻奢。
- **纯净无杂质**：无多余 emoji，采用 SVG 芯片与专业硬件规格表，干净干练。
- **界面语言切换（i18n）**：前往 **【系统设置】➜【交互与主题偏好】➜【界面语言】**，即可在 **简体中文** 与 **English** 之间一键即时无感切换，语言设置自动持久化至本地 `localStorage`。
- **自适应缩放**：原生支持全高清（1080p）、2K 及各类笔记本屏幕分辨率，居中优雅呈现。

---

## 🚀 快速上手

### 1. 从源码编译

```bash
# 克隆仓库
git clone https://github.com/DragonTsunami/qingshan-toolbox.git
cd qingshan-toolbox

# 编译生成 Windows 可执行程序
go build -o qstoolbox.exe ./cmd/qstoolbox
```

### 2. 常用命令示例

```bash
# === 桌面运维模式 ===
# 查看详细硬件清单
./qstoolbox.exe asset hardware

# 执行硬件防拆防调包指纹核验
./qstoolbox.exe asset fingerprint

# 生成离职归还设备交接签署单
./qstoolbox.exe asset handover --type return

# 日常无感安全瘦身 (保护浏览器登录态与办公文档)
./qstoolbox.exe disk clean --safe

# 修复打印机假脱机卡单
./qstoolbox.exe desktop fix --spooler

# 修复共享打印机 0x709 / 0x11b 报错
./qstoolbox.exe desktop fix --print709

# 清理系统残留代理 (修复微信正常但网页打不开)
./qstoolbox.exe desktop fix --proxy

# 会议室多屏外接投影输出重置
./qstoolbox.exe desktop fix --display-reset

# 修复桌面图标白块异常
./qstoolbox.exe desktop fix --icon-cache

# === DevOps 运维模式 ===
# 执行系统全量健康巡检
./qstoolbox.exe check all

# 查询与重启服务
./qstoolbox.exe service status wuauserv
./qstoolbox.exe service restart spooler

# 实时追踪跟随日志
./qstoolbox.exe logs tail C:\app\logs\sys.log
```

### 3. 打开 Web 控制台

直接双击 [web/index.html](web/index.html) 或使用任意静态服务器托管，在 Edge、Chrome 或现代浏览器中开启体验。

---

## 🌐 中英文双语支持说明

青衫工具箱完整支持中英文双语生态：
- **GitHub 介绍文档**：统一在本仓库维护，默认展示英文 [README.md](README.md)，顶部提供中文 [README_zh.md](README_zh.md) 快速切换导航，完全无需拆分第二个库。
- **Web 界面**：进入 **系统设置** ➜ **交互与主题偏好** ➜ **界面语言 (Language)**，提供 **简体中文** 与 **English** 选项，选择后全站 199+ 节点实时动态生效。

---

## 📜 开源许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

Copyright © 2026-present 青衫贡献者团队。
