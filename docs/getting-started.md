# 🚀 快速上手指南

本文档将帮助您快速安装和使用青衫工具箱（QingShan Toolbox）。

---

## 📋 目录

- [安装](#安装)
- [首次运行](#首次运行)
- [常用工作流](#常用工作流)
- [配置](#配置)
- [常见问题](#常见问题)

---

## 安装

### 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11、Windows Server 2016+ 或 Linux |
| 架构 | amd64 或 arm64 |
| 磁盘空间 | ~20MB |

### 方式一：PowerShell 一键安装（推荐 Windows 用户）

打开 PowerShell（管理员权限），运行：

```powershell
irm https://raw.githubusercontent.com/qingshan/toolbox/main/scripts/install.ps1 | iex
```

安装脚本会自动完成以下操作：
1. 检测系统架构
2. 下载最新版本
3. 将程序添加到 PATH
4. 验证安装成功

### 方式二：直接下载

1. 前往 [Releases](https://github.com/qingshan/toolbox/releases/latest) 页面
2. 下载适合您系统的二进制文件（如 `qstoolbox-windows-amd64.exe`）
3. 将文件重命名为 `qstoolbox.exe`
4. 将文件所在目录添加到系统 PATH 环境变量

### 方式三：Go Install

如果您已安装 Go 1.22+：

```bash
go install github.com/qingshan/toolbox/cmd/qstoolbox@latest
```

### 方式四：从源码构建

```bash
git clone https://github.com/qingshan/toolbox.git
cd toolbox
go build -o qstoolbox.exe ./cmd/qstoolbox
```

### 验证安装

```bash
qstoolbox version
```

如果看到版本信息输出，说明安装成功。

---

## 首次运行

### 查看帮助信息

```bash
# 查看所有可用命令
qstoolbox --help

# 查看特定命令的帮助
qstoolbox health --help
qstoolbox service --help
```

### 运行系统健康检查

这是最常用的功能，也是验证工具是否正常工作的好方法：

```bash
# 快速健康检查
qstoolbox health

# 详细模式（显示更多系统信息）
qstoolbox health --verbose
```

输出示例：

```
🏥 系统健康检查报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CPU 使用率:    23.5%    ✅
  内存使用率:    67.2%    ⚠️
  磁盘使用率:    45.8%    ✅
  系统运行时间:  15 天 3 小时
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总体状态: 良好 ✅
```

### 创建配置文件（可选）

```bash
# 在当前目录创建默认配置文件
qstoolbox config init
```

这会生成一个 `qstoolbox.yaml` 文件，您可以根据需要修改其中的配置。

---

## 常用工作流

### 工作流 1：每日系统巡检

适合运维工程师的每日例行检查：

```bash
# 步骤 1：检查系统健康状态
qstoolbox health --verbose

# 步骤 2：查看关键服务状态
qstoolbox service status Spooler
qstoolbox service status W32Time

# 步骤 3：检查磁盘使用情况
qstoolbox disk analyze C:\

# 步骤 4：查看最近的错误日志
qstoolbox log search --keyword "ERROR" --path C:\Logs\app.log --since 24h
```

### 工作流 2：服务管理

管理 Windows 服务的常见操作：

```bash
# 列出所有正在运行的服务
qstoolbox service list --status running

# 查看特定服务详情
qstoolbox service status WinRM

# 重启有问题的服务
qstoolbox service restart Spooler

# 停止服务
qstoolbox service stop <service-name>

# 启动服务
qstoolbox service start <service-name>
```

### 工作流 3：远程批量运维

在多台服务器上执行命令：

```bash
# 单机执行
qstoolbox ssh exec --host 192.168.1.100 --user admin "hostname && uptime"

# 批量执行（需要 hosts.yml 主机清单）
qstoolbox ssh batch --inventory hosts.yml --command "df -h"
```

`hosts.yml` 示例：

```yaml
hosts:
  - name: web-server-01
    host: 192.168.1.101
    user: admin
  - name: web-server-02
    host: 192.168.1.102
    user: admin
  - name: db-server-01
    host: 192.168.1.201
    user: dba
```

### 工作流 4：软件资产盘点

生成已安装软件报告：

```bash
# 扫描本机已安装软件
qstoolbox inventory scan

# 导出为 CSV 格式（方便用 Excel 打开）
qstoolbox inventory export --format csv --output software_report.csv

# 导出为 JSON 格式（方便程序处理）
qstoolbox inventory export --format json --output software_report.json
```

### 工作流 5：网络故障排查

逐步排查网络问题：

```bash
# 步骤 1：测试基本连通性
qstoolbox net ping 8.8.8.8

# 步骤 2：追踪网络路径
qstoolbox net trace target-host.com

# 步骤 3：检查目标端口是否开放
qstoolbox net portscan --host 192.168.1.1 --ports 22,80,443,3389

# 步骤 4：检查 DNS 解析
qstoolbox net dns example.com
```

### 工作流 6：磁盘空间清理

释放磁盘空间：

```bash
# 分析磁盘使用（查看哪些目录占用最多空间）
qstoolbox disk analyze C:\

# 清理 30 天前的临时文件
qstoolbox disk cleanup --older-than 30d --path C:\Temp

# 清理 Windows 临时目录
qstoolbox disk cleanup --older-than 7d --path C:\Windows\Temp
```

### 工作流 7：数据备份

设置和管理备份：

```bash
# 立即创建备份
qstoolbox backup create --source C:\ImportantData --dest D:\Backups

# 设置每日凌晨 2 点自动备份
qstoolbox backup schedule --cron "0 2 * * *" --source C:\ImportantData --dest D:\Backups

# 查看备份历史
qstoolbox backup list

# 还原备份
qstoolbox backup restore --id <backup-id> --dest C:\RestoreTarget
```

---

## 配置

### 配置文件位置

青衫工具箱按以下顺序查找配置文件：

1. `./qstoolbox.yaml` （当前目录）
2. `$HOME/.qstoolbox/qstoolbox.yaml` （用户主目录）
3. `/etc/qstoolbox/qstoolbox.yaml` （系统配置，仅 Linux）

### 完整配置示例

```yaml
# 日志配置
log:
  level: info          # 日志级别: debug, info, warn, error
  format: text         # 日志格式: text, json
  output: stdout       # 输出: stdout, stderr, 或文件路径

# SSH 配置
ssh:
  default_user: admin
  default_port: 22
  key_path: ~/.ssh/id_rsa
  timeout: 30s
  known_hosts: ~/.ssh/known_hosts

# 备份配置
backup:
  retention_days: 30
  compression: gzip
  max_concurrent: 2

# 磁盘清理配置
cleanup:
  default_age: 30d
  protected_paths:
    - C:\Windows
    - C:\Program Files
    - C:\Program Files (x86)

# 网络诊断配置
network:
  ping_count: 4
  ping_timeout: 5s
  trace_max_hops: 30

# 健康检查阈值
health:
  cpu_warning: 80      # CPU 使用率警告阈值 (%)
  cpu_critical: 95     # CPU 使用率严重阈值 (%)
  memory_warning: 80   # 内存使用率警告阈值 (%)
  memory_critical: 95  # 内存使用率严重阈值 (%)
  disk_warning: 80     # 磁盘使用率警告阈值 (%)
  disk_critical: 95    # 磁盘使用率严重阈值 (%)
```

### 环境变量

所有配置项都可以通过环境变量覆盖，使用 `QSTOOLBOX_` 前缀，层级用 `_` 分隔：

```powershell
# PowerShell
$env:QSTOOLBOX_LOG_LEVEL = "debug"
$env:QSTOOLBOX_SSH_DEFAULT_USER = "root"
$env:QSTOOLBOX_HEALTH_CPU_WARNING = "90"
```

### 命令行参数

命令行参数优先级最高，会覆盖配置文件和环境变量的设置：

```bash
qstoolbox health --log-level debug
```

**配置优先级**（从高到低）：
1. 命令行参数
2. 环境变量
3. 配置文件
4. 默认值

---

## 常见问题

### Q: 如何升级到最新版本？

重新运行安装脚本即可：

```powershell
irm https://raw.githubusercontent.com/qingshan/toolbox/main/scripts/install.ps1 | iex
```

### Q: 命令执行时提示权限不足？

某些功能（如服务管理、系统信息读取）需要管理员权限。请以管理员身份运行 PowerShell 或命令提示符。

### Q: 如何查看调试日志？

```bash
qstoolbox <command> --log-level debug
```

### Q: 支持哪些操作系统？

主要面向 Windows 系统（Windows 10/11、Windows Server 2016+），部分通用功能也支持 Linux。

---

> 💡 **提示**：如果遇到其他问题，请到 [GitHub Issues](https://github.com/qingshan/toolbox/issues) 提交反馈，我们会尽快回复。
