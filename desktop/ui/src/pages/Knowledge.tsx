import React, { useMemo, useState } from "react";
import {
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  ExpandAltOutlined,
  FireOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  PrinterOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined,
  WindowsOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { Button, Empty, Input, Modal, Tag, Tooltip, message } from "antd";
import { tryKnowledgeFix } from "../api";
import type { KnowledgeFixResult } from "../types";
import "../knowledge.css";

export type SeverityLevel = "danger" | "urgent" | "warning" | "common";

interface TroubleshootingItem {
  id: string;
  category: "system" | "network" | "hardware" | "printer" | "office";
  severity: SeverityLevel;
  title: string;
  errorCode?: string;
  symptom: string;
  rootCause: string;
  diagnosticSteps: string[];
  command: string;
  solution: string;
  bestPractice: string;
  fixActionName: string;
}

const KNOWLEDGE_BASE: TroubleshootingItem[] = [
  // ================= 🔴 危险级 (Danger) =================
  {
    id: "dt-bsod-dump",
    category: "system",
    severity: "danger",
    title: "Windows 蓝屏崩溃 (BSOD) 转储排查",
    errorCode: "CRITICAL_PROCESS_DIED / PAGE_FAULT (0x50)",
    symptom:
      "员工办公电脑突发蓝屏重启，蓝屏代码多为 CRITICAL_PROCESS_DIED、PAGE_FAULT_IN_NONPAGED_AREA (0x50) 或 KERNEL_SECURITY_CHECK_FAILURE，开机后不久重复死机。",
    rootCause:
      "通常由近期 Windows 质量补丁与驱动冲突、第三方杀毒/加解密驱动（.sys）损坏、或物理内存条金手指氧化松动引发内存寻址异常。",
    diagnosticSteps: [
      "提取系统崩溃转储日志：C:\\Windows\\Minidump\\*.dmp",
      "使用 WinDbg 运行自动分析命令：!analyze -v 锁定引发崩溃的具体驱动名",
      "执行系统组件完整性扫描：sfc /scannow 与 DISM 修复",
      "执行内存硬件诊断：Windows 内存诊断工具 (mdsched.exe)",
    ],
    command: "sfc /scannow && dism /online /cleanup-image /restorehealth",
    solution:
      "1. 进入安全模式，卸载近期更新的显卡/网卡驱动或涉事驱动；\n2. 若 !analyze -v 定位为硬件原因，断电重新插拔内存并使用橡皮擦清理金手指，更换插槽测试。",
    bestPractice:
      "企业环境应禁用非必要驱动强制静默更新，对高发蓝屏设备优先保留 Minidump 日志留痕，不盲目直接重装系统。",
    fixActionName: "检查系统版本与启动状态",
  },
  {
    id: "dt-boot-bcd",
    category: "system",
    severity: "danger",
    title: "开机引导丢失 (An OS wasn't found / BCD 损坏)",
    errorCode: "INACCESSIBLE_BOOT_DEVICE (0x7B) / 0xc000000f",
    symptom:
      "电脑开机黑屏提示：An operating system wasn't found 或 Recovery 0xc000000f，无法进入 Windows 桌面。",
    rootCause:
      "磁盘分区表 MBR/GPT 异常、BIOS/UEFI 引导模式与分区格式不匹配、或更新后 Windows BCD 引导扇区数据被破坏。",
    diagnosticSteps: [
      "检查 BIOS 设置中 Boot Mode 是否被误切为 Legacy/UEFI",
      "检查 SATA Mode 是否由 AHCI 变更为 RAID/IDE",
      "通过 WinPE 启动盘使用 Diskpart 检查系统分区卷标与活动分区 (Active)",
    ],
    command: "bcdboot C:\\Windows /s S: /f UEFI",
    solution:
      "进入 WinPE 终端，确认系统盘符为 C:，挂载 ESP 引导分区为 S:，执行：bcdboot C:\\Windows /s S: /f UEFI 瞬间重构原生 UEFI 引导文件并激活。",
    bestPractice:
      "现代办公电脑一律规范采用 UEFI + GPT 引导规范，彻底淘汰 Legacy MBR 模式，防止引导扇区易碎损坏。",
    fixActionName: "读取当前 UEFI 引导参数",
  },
  {
    id: "dt-malware-miner",
    category: "system",
    severity: "danger",
    title: "办公机被植入挖矿木马 / 勒索病毒应急隔离",
    errorCode: "High CPU/GPU 100% & Suspicious RDP Outbound",
    symptom:
      "电脑风扇狂转咆哮，CPU/显卡占用常年 100%，打开任务管理器时占用瞬间骤降，局域网内异常向未知公网 IP 大量发送流量。",
    rootCause:
      "员工私自下载运行了带毒激活工具/破解软件，或办公机启用了弱口令 RDP (3389) 暴露外网，被黑客扫描暴力破解植入挖矿后门或勒索病毒。",
    diagnosticSteps: [
      "【第一步】立即拔掉网线或断开 Wi-Fi 物理隔离，防止横向扩散！",
      "查验隐藏进程真实路径：wmic process get caption,commandline,processid",
      "排查所有可疑网络外联端口：netstat -ano | findstr ESTABLISHED",
      "排查任务计划程序与启动项：tasklib、注册表 Run 键值",
    ],
    command: "wmic process where \"ProcessId > 100\" get Caption,ExecutablePath,ProcessId",
    solution:
      "1. 物理断网隔离；2. 使用 Process Explorer 挂起目标进程树并根据真实路径粉碎恶意文件；3. 清理任务计划程序与服务管理器中的常驻启动项；4. 强制更改所有域密码与本地管理员口令。",
    bestPractice:
      "全司严格推行强密码策略，禁止将办公机 RDP 端口直通公网；关键文档必须定期做 NAS 异地冷备份以防勒索。",
    fixActionName: "应急排查高危外联连接",
  },
  {
    id: "dt-disk-smart-io",
    category: "hardware",
    severity: "danger",
    title: "磁盘掉盘/只读保护与坏道急救 (I/O Device Error)",
    errorCode: "0x8007045D (I/O Device Error) / SMART 05 Alert",
    symptom:
      "复制大文件报错 0x8007045D（由于 I/O 设备错误，无法运行此项请求），或固态硬盘掉盘变为只读模式，无法新建或保存任何文件。",
    rootCause:
      "机械硬盘出现物理坏道，磁头读取遇阻；或 SSD 主控触发保护机制锁定为 Read-Only 模式。",
    diagnosticSteps: [
      "检查 CrystalDiskInfo / SMART 参数：查看 05 重分配扇区数与 0BB 无法校正错误",
      "运行磁盘文件系统修复：chkdsk C: /f /r",
      "检查事件查看器系统日志中的 Disk / Ntfs 报错事件",
    ],
    command: "chkdsk C: /f /r",
    solution:
      "1. 【黄金原则】若有关键资料，严禁反复跑写盘测试，第一时间将重要文件冷拷贝导出到外置移动硬盘；2. 更换损坏硬盘并使用工具对关键分区做镜像克隆。",
    bestPractice:
      "IT 资产台账应建立硬盘通电时间与 SMART 健康度年检机制，对预警硬盘提前做预防性更换。",
    fixActionName: "检测磁盘介质 SMART 健康状态",
  },

  // ================= 🟠 紧急级 (Urgent) =================
  {
    id: "dt-net-ip-conflict",
    category: "network",
    severity: "urgent",
    title: "企业内网 IP 冲突 / DHCP 租约泛洪断网",
    errorCode: "Windows detected an IP address conflict",
    symptom:
      "多台电脑右下角网络图标弹出黄色感叹号，提示“Windows 检测到 IP 地址冲突”，或整排工位同时断网无法获取内网 IP。",
    rootCause:
      "某部门私自接入未经授权的小无线路由器，网线误插在 LAN 口而非 WAN 口，导致私接路由器向内网泛洪下发假 DHCP 地址池（DHCP 污染）。",
    diagnosticSteps: [
      "查看当前获取到的网关是否为公司真实网关：ipconfig /all",
      "查看冲突 IP 对应的设备物理 MAC：arp -a | findstr <冲突IP>",
      "在三层核心交换机查验该 MAC 挂载的具体物理端口",
    ],
    command: "ipconfig /release && ipconfig /renew",
    solution:
      "1. 终端执行 ipconfig /release && ipconfig /renew 重新获取合法网关；\n2. 网管在核心交换机开启 DHCP Snooping 阻断非法 DHCP Offer，拔除私接路由器的 LAN 口连线。",
    bestPractice:
      "全网开启交换机 DHCP Snooping 与端口安全绑定，从根源绝杀内网私接路由器引发的大面积瘫痪。",
    fixActionName: "释放并重新获取合法 DHCP 租约",
  },
  {
    id: "dt-ad-trust-failed",
    category: "system",
    severity: "urgent",
    title: "Active Directory 域信任关系丢失导致无法登录",
    errorCode: "The trust relationship between workstation and domain failed",
    symptom:
      "员工输入域账号密码时提示：“此工作站与主域之间的信任关系失败”，域账户无法登入桌面。",
    rootCause:
      "电脑长期关机离线（超过 30 天密码轮转周期）、或者在虚拟机克隆后 SID 冲突，导致域控上该计算机对象的加密通道密码（Machine Account Password）脱节。",
    diagnosticSteps: [
      "断开网线可临时使用缓存凭据登入（如果曾开启过缓存登录）",
      "使用本地管理员账号登入计算机：.\\administrator",
      "测试安全信任通道状态：Test-ComputerSecureChannel",
    ],
    command: "Test-ComputerSecureChannel -Repair -Credential (Get-Credential)",
    solution:
      "以本地管理员登录后，打开 PowerShell 运行修复命令：Test-ComputerSecureChannel -Repair -Credential (Get-Credential)，输入域管账号密码即可秒级重塑安全通道，无需退域加域！",
    bestPractice:
      "切忌动不动退域再加域（会导致员工本地 AppData 与桌面 Profile 迁移混乱），优先使用单条 PowerShell 修复指令。",
    fixActionName: "安全信任通道健康探活",
  },
  {
    id: "dt-office-outlook-pst",
    category: "office",
    severity: "urgent",
    title: "Outlook / 邮箱客户端启动卡死 / 数据文件损坏",
    errorCode: "Cannot start Microsoft Outlook / OST Corrupted",
    symptom:
      "启动 Outlook 提示“无法打开 Outlook 窗口。无法打开这套文件夹”，或一直卡在“正在加载配置文件”，严重影响高管收发邮件。",
    rootCause:
      "Outlook 数据文件（.ost / .pst）体积逼近或超过 50GB 上限导致索引崩溃；或第三方防病毒邮件扫描加载项引起主线程死锁。",
    diagnosticSteps: [
      "测试安全模式排查加载项：outlook.exe /safe",
      "检查数据文件体积：进入 %LOCALAPPDATA%\\Microsoft\\Outlook 确认 OST 文件大小",
      "排查后台死锁进程：tasklist | findstr /i outlook",
    ],
    command: "outlook.exe /safe",
    solution:
      "1. 先以 safe 模式启动，禁用可疑 COM 加载项；\n2. 若文件损坏，彻底关闭 Outlook 后，运行 C:\\Program Files\\Microsoft Office\\root\\Office16\\SCANPST.EXE 修复数据文件；\n3. 或直接将 .ost 更名为 .old，重新启动让 Outlook 自动从 Exchange 云端全量同步。",
    bestPractice:
      "指导经常超大容量收发邮件的员工配置邮件自动存档（AutoArchive），将旧邮件归档，保持主 OST 处于 20G 黄金健康线。",
    fixActionName: "终止僵死进程并尝试以安全模式唤起",
  },
  {
    id: "dt-rdp-credssp",
    category: "network",
    severity: "urgent",
    title: "远程桌面 (RDP) 报 CredSSP 凭据加密 Oracle 修正",
    errorCode: "CredSSP Encryption Oracle Remediation",
    symptom:
      "远程连接服务器或同事电脑时弹窗拦截：出现身份验证错误。要求的函数不受支持。这可能是由于 CredSSP 凭据加密 Oracle 修正。",
    rootCause:
      "客户端 Windows 安装了 CVE-2018-0886 安全补丁，而目标远程机为老旧 Windows Server 未打相应补丁，高安全级别策略主动拒绝建立 RDP 连接。",
    diagnosticSteps: [
      "验证是否为客户端组策略拦截阻断",
      "核对被连接目标机 Windows Update 更新状态",
    ],
    command: "reg add \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\CredSSP\\Parameters\" /v AllowEncryptionOracle /t REG_DWORD /d 2 /f",
    solution:
      "在客户端运行管理员命令添加注册表项，将 AllowEncryptionOracle 设为 2（易受攻击/宽松模式），即可立即成功建立远程桌面连接。",
    bestPractice:
      "临时连接处理完紧急故障后，必须推动被连接的服务端打满安全补丁，并将客户端策略恢复为受保护状态。",
    fixActionName: "配置宽松 CredSSP 兼容策略",
  },

  // ================= 🟡 重点级 (Warning) =================
  {
    id: "dt-printer-11b-709",
    category: "printer",
    severity: "warning",
    title: "网络共享打印机报错 0x0000011b / 0x00000709",
    errorCode: "0x0000011b / 0x00000709 Connect Error",
    symptom:
      "添加办公室内共享打印机时，弹出错误代码 0x0000011b 或 0x00000709，无法安装驱动并连接打印。",
    rootCause:
      "微软针对 PrintNightmare 打印漏洞强制启用 RPC 身份验证级别，未加入域控制器的局域网匿名共享通道被 Windows 防火墙与内核阻断。",
    diagnosticSteps: [
      "确认打印机所连接的宿主 PC 共享权限设置正常",
      "检查宿主 PC 与客户端是否都能互相 ping 通 IP",
    ],
    command: "reg add \"HKLM\\System\\CurrentControlSet\\Control\\Print\" /v RpcAuthnLevelPrivacyEnabled /t REG_DWORD /d 0 /f && net stop spooler && net start spooler",
    solution:
      "在连接打印机的**主机端（服务端）**执行上述命令，将 RpcAuthnLevelPrivacyEnabled 设为 0 并重启打印后台服务，客户端即可一键正常连接。",
    bestPractice:
      "公司办公网优先采购网络直连打印机（自带 RJ45 网线接口或 Wi-Fi），采用 TCP/IP 端口直连，彻底规避 USB 电脑共享的权限兼容坑。",
    fixActionName: "放行 RPC 打印共享并重启服务",
  },
  {
    id: "dt-printer-spooler-crash",
    category: "printer",
    severity: "warning",
    title: "打印后台处理程序 (Print Spooler) 频繁自动崩溃",
    errorCode: "Print Spooler Service Terminated Unexpectedly",
    symptom:
      "“设备和打印机”页面空白，所有打印机消失，提示“打印后台处理程序未运行”。在服务管理器中手动启动，一打印文档服务又闪退。",
    rootCause:
      "打印假脱机缓存目录（PRINTERS）中存在格式破损或超大异常的旧任务碎片（.SPL / .SHD 文件），Spooler 进程每次加载解析即崩溃。",
    diagnosticSteps: [
      "查看系统服务管理器中 Print Spooler 服务运行状态",
      "检查 C:\\Windows\\System32\\spool\\PRINTERS 目录下是否有残留文件堆积",
    ],
    command: "net stop spooler && del /q /f %SystemRoot%\\System32\\spool\\PRINTERS\\*.* && net start spooler",
    solution:
      "运行管理员命令行：先停止 spooler 服务，清空 PRINTERS 目录下所有废弃缓存文件，再次启动服务即可彻底恢复稳定。",
    bestPractice:
      "若清空后依旧崩溃，多为某个残破第三方驱动导致，使用 printui.exe /s 删除有问题的旧版打印机驱动程序程序包。",
    fixActionName: "清空损坏假脱机队列并重启 Spooler",
  },
  {
    id: "dt-sys-update-loop",
    category: "system",
    severity: "warning",
    title: "Windows Update 卡死 / 正在撤销更改死循环",
    errorCode: "We couldn't complete the updates. Undoing changes.",
    symptom:
      "电脑开机卡在“正在配置更新 100% 完成，我们无法完成更新，正在撤消更改，请勿关闭计算机”，反复重启循环耗费几小时。",
    rootCause:
      "Windows 补丁下载缓存目录（SoftwareDistribution）元数据损坏，或 WinSXS 组件存储中存在哈希不一致的破损文件。",
    diagnosticSteps: [
      "长按电源键强制重启进入 WinRE 疑难解答或安全模式",
      "检查 SoftwareDistribution 目录体积与最近修改时间",
    ],
    command: "net stop wuauserv && ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old && net start wuauserv",
    solution:
      "以安全模式进入系统，停止 Windows Update 服务，将 SoftwareDistribution 重命名重置，再执行 dism /online /cleanup-image /restorehealth 清理修复组件仓库。",
    bestPractice:
      "企业电脑可通过组策略设置延迟功能更新，仅推送经过兼容性测试的累积质量补丁，防止批量员工电脑因更新翻车。",
    fixActionName: "重置 Windows Update 缓存服务",
  },
  {
    id: "dt-office-kms-activate",
    category: "office",
    severity: "warning",
    title: "Office / Windows 激活失效 (0xC004F074 / 0xC004C008)",
    errorCode: "0xC004F074 (KMS Server Unavailable)",
    symptom:
      "屏幕右下角突然出现“激活 Windows”水印，Word 标题栏显示“产品未经授权”，错误代码通常为 0xC004F074。",
    rootCause:
      "电脑系统时间与公司 KMS 域时间服务器偏差超过 4 小时；或本地 DNS 未能正确解析内部 KMS 激活服务器的主机名与 1688 端口。",
    diagnosticSteps: [
      "校对当前系统时间是否与北京时间准确一致",
      "探测 KMS 端口连通性：Test-NetConnection -Port 1688 -ComputerName <KMS_IP>",
    ],
    command: "slmgr.vbs /skms kms.domain.local:1688 && slmgr.vbs /ato",
    solution:
      "1. 先同步时钟：w32tm /resync；\n2. 重新绑定企业内网 KMS 服务器并强制激活：slmgr.vbs /skms <KMS地址> 随后 slmgr.vbs /ato。",
    bestPractice:
      "对于外发长期出差员工，建议分配 Office 365 E3/E5 商业云端授权或预先签发批量 MAK 激活密钥，避免脱离内网断活。",
    fixActionName: "校准网络时钟并触发批量激活验证",
  },

  // ================= 🟢 常见级 (Common) =================
  {
    id: "dt-net-winsock-reset",
    category: "network",
    severity: "common",
    title: "网络受限 / 微信能登但浏览器打不开网页 (Winsock 重置)",
    errorCode: "DNS Probe Finished No Internet / LSP Broken",
    symptom:
      "微信、QQ 等基于 IP 直连的应用通信正常，但 Edge/Chrome 任何网页均打不开，提示 DNS_PROBE_FINISHED_NO_INTERNET。",
    rootCause:
      "Windows Winsock 分层服务提供者 (LSP) 被某些流氓加速器/代理软件异常拦截篡改，或系统 DNS 缓存污染导致域名解析瘫痪。",
    diagnosticSteps: [
      "测试内网网关 ping 是否连通",
      "测试公网纯 IP（如 223.5.5.5）是否连通",
      "测试是否仅域名无法解析",
    ],
    command: "netsh winsock reset && netsh int ip reset && ipconfig /flushdns",
    solution:
      "以管理员身份运行一键重置三部曲：netsh winsock reset 重置目录、netsh int ip reset 重置 TCP/IP 协议栈，最后 ipconfig /flushdns 刷新缓存，重启计算机即可秒级复原。",
    bestPractice:
      "指导员工排查关闭浏览器中残留的无效系统代理设置（设置 ➔ 网络和 Internet ➔ 代理 ➔ 关闭手动代理）。",
    fixActionName: "重置 Winsock / TCP-IP 并刷新 DNS",
  },
  {
    id: "dt-sys-explorer-hang",
    category: "system",
    severity: "common",
    title: "桌面图标消失 / 任务栏转圈假死 (资源管理器重启)",
    errorCode: "Explorer.exe Hang / Taskbar Freeze",
    symptom:
      "桌面所有图标变白或消失、点击开始菜单与任务栏毫无反应一直在转圈，右键文件卡顿几十秒。",
    rootCause:
      "某个第三方流氓软件注入的右键上下文菜单 Shell 扩展 DLL 死锁，或大量多媒体文件在生成缩略图索引时耗尽了 Explorer 句柄。",
    diagnosticSteps: [
      "按下 Ctrl + Shift + Esc 尝试调出任务管理器",
      "查验资源管理器 CPU 与句柄占用",
    ],
    command: "taskkill /f /im explorer.exe && start explorer.exe",
    solution:
      "通过命令行快速强制结束假死的 Explorer 并立即重新拉起干净实例：taskkill /f /im explorer.exe && start explorer.exe 瞬间复活桌面与任务栏。",
    bestPractice:
      "使用 ShellExView 工具禁用非微软原生的第三方右键菜单扩展，从根源绝杀右键转圈假死。",
    fixActionName: "强制重启假死的资源管理器进程",
  },
  {
    id: "dt-usb-gpo-block",
    category: "hardware",
    severity: "common",
    title: "U 盘插入提示“访问被拒绝”或写保护排查",
    errorCode: "Access Denied / Disk is Write Protected",
    symptom:
      "插入外接移动硬盘或 U 盘，能在磁盘管理看到设备，但双击盘符提示“访问被拒绝”或“介质受写入保护无法拷贝”。",
    rootCause:
      "公司域控策略下发了可移动存储阻止规则，或注册表中开启了 StorageDevicePolicies 写入保护强制策略。",
    diagnosticSteps: [
      "测试其它无策略管控电脑该 U 盘是否正常读取",
      "检查注册表 StorageDevicePolicies 键值配置",
    ],
    command: "reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies\" /v WriteProtect /t REG_DWORD /d 0 /f",
    solution:
      "若已获合规授权，执行管理员命令将注册表 WriteProtect 属性修改为 0 解除只读保护；若为域策略锁定，联系安全管理员在域控对应 OU 赋予临时放行策略。",
    bestPractice:
      "企业数据安全红线严禁私自违规绕过防泄密策略，外发文件应统一走审批加密外发通道。",
    fixActionName: "重置本地注册表写保护标志",
  },
  {
    id: "dt-user-temp-profile",
    category: "system",
    severity: "common",
    title: "登录后提示“您已使用临时配置文件登录”",
    errorCode: "You've been signed in with a temporary profile",
    symptom:
      "开机登录后右下角弹窗提示临时配置文件，原本保存在桌面上的文档和个性化壁纸全部消失，变成初始空桌面。",
    rootCause:
      "前一次非正常关机或蓝屏导致用户目录下的核心注册表文件（NTUSER.DAT）被锁定或轻微损坏，Windows 无法加载原始配置，降级进入 Temp 临时模式。",
    diagnosticSteps: [
      "打开 C:\\Users 查看原用户专属目录（如 C:\\Users\\zhangsan）文件是否仍完整存在",
      "打开注册表检查 ProfileList 路径：HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList",
    ],
    command: "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\" /s | findstr /i \".bak\"",
    solution:
      "1. 以本地 Administrator 登入；\n2. 打开注册表定位至 ProfileList，找到带有 .bak 后缀的该用户 SID 项；\n3. 删除没有 .bak 的错误空项，将带 .bak 的项重命名去掉 .bak，并将 State 键值重置为 0，重启即可完美找回原桌面！",
    bestPractice:
      "嘱咐员工切勿在临时桌面中保存新工作文件（注销后会被临时目录抹掉），且平时重要文档应养成保存在 D 盘非系统盘的习惯。",
    fixActionName: "扫描 ProfileList 账户配置文件状态",
  },
  {
    id: "dt-printer-offline",
    category: "printer",
    severity: "common",
    title: "打印机状态频繁显示“脱机”无法打印",
    errorCode: "Printer Status Offline (SNMP MIB Failure)",
    symptom:
      "网络打印机电源开启、网线插好、IP 能 ping 通，但在 Windows 中打印机状态始终显示为灰色的“脱机”。",
    rootCause:
      "Windows 打印端口驱动默认开启了“SNMP 状态已启用”检查，如果内网防火墙过滤了 SNMP 161 端口，Windows 探活失败即误判打印机已脱机。",
    diagnosticSteps: [
      "直接在浏览器输入打印机 IP 地址，查看 Web 管理后台是否正常可达",
      "进入打印机属性 ➔ 端口 ➔ 配置端口 检查 SNMP 状态",
    ],
    command: "ping -n 4 <打印机IP地址>",
    solution:
      "打开控制面板 ➔ 打印机属性 ➔ 切换到【端口】选项卡 ➔ 选中当前 IP 端口点击【配置端口】➔ **取消勾选【启用 SNMP 状态】**，点击确定后打印机状态瞬间恢复联机！",
    bestPractice:
      "安装网络打印机标准驱动时，统一去掉 SNMP 状态检测，彻底避免跨网段跨 VLAN 时误报脱机。",
    fixActionName: "清空 ARP 地址表并重启打印服务",
  },
];

// 级别定义：危险级、紧急级、重点级、常见级
const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; tagColor: string; pillClass: string; icon: React.ReactNode }
> = {
  danger: {
    label: "危险级",
    tagColor: "error",
    pillClass: "pill-danger",
    icon: <CloseCircleOutlined />,
  },
  urgent: {
    label: "紧急级",
    tagColor: "warning",
    pillClass: "pill-urgent",
    icon: <FireOutlined />,
  },
  warning: {
    label: "重点级",
    tagColor: "gold",
    pillClass: "pill-warning",
    icon: <WarningOutlined />,
  },
  common: {
    label: "常见级",
    tagColor: "processing",
    pillClass: "pill-common",
    icon: <InfoCircleOutlined />,
  },
};

const CATEGORIES = [
  { key: "all", label: "全部领域", icon: <ToolOutlined /> },
  { key: "system", label: "系统与引导", icon: <WindowsOutlined /> },
  { key: "network", label: "网络与域控", icon: <GlobalOutlined /> },
  { key: "hardware", label: "硬件与外设", icon: <HddOutlined /> },
  { key: "printer", label: "打印机专项", icon: <PrinterOutlined /> },
  { key: "office", label: "Office与办公软件", icon: <MailOutlined /> },
] as const;

export default function KnowledgePage() {
  const [keyword, setKeyword] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<TroubleshootingItem | null>(null);
  const [fixResult, setFixResult] = useState<KnowledgeFixResult | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return KNOWLEDGE_BASE.filter((item) => {
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.errorCode && item.errorCode.toLowerCase().includes(q)) ||
        item.symptom.toLowerCase().includes(q) ||
        item.rootCause.toLowerCase().includes(q) ||
        item.fixActionName.toLowerCase().includes(q) ||
        item.solution.toLowerCase().includes(q)
      );
    });
  }, [keyword, selectedSeverity, selectedCategory]);

  // 打开独立“寻求企业 IT 帮助”弹窗（严格互斥关闭详情菜单，防止两个弹窗重叠遮挡）
  const openSupportModal = () => {
    setDetailItem(null);
    setFixResult(null);
    setShowSupportModal(true);
  };

  // 打开某个故障的排查详情（互斥关闭求助弹窗）
  const openDetailModal = (item: TroubleshootingItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowSupportModal(false);
    setDetailItem(item);
  };

  // 一键尝试修复核心方法
  const handleTryFix = async (item: TroubleshootingItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      setFixingId(item.id);
      const res = await tryKnowledgeFix(item.id);
      setFixResult(res);
    } catch (err) {
      setFixResult({
        success: false,
        title: item.title + " - 修复尝试异常",
        detail: `系统调用返回: ${String(err)}。可能是权限受限或当前策略拦截。`,
        contactSupportTip: "自动化修复尝试遇阻，请直接联系企业 IT 桌面运维支持人员排查。",
      });
    } finally {
      setFixingId(null);
    }
  };

  // 一键复制故障信息供运维老师排障
  const handleCopyFaultReport = (item: TroubleshootingItem) => {
    const text = [
      `【企业 IT 桌面运维报修单】`,
      `故障项目: ${item.title}`,
      item.errorCode ? `错误代码: ${item.errorCode}` : "",
      `故障现象: ${item.symptom}`,
      `排查根因: ${item.rootCause}`,
      `尝试动作: ${item.fixActionName}`,
      `状态反馈: 已经过工具箱一键自动化尝试，仍存在异常，申请企业运维老师协助处理。`,
    ]
      .filter(Boolean)
      .join("\n");

    void navigator.clipboard.writeText(text);
    message.success("已复制故障报修单，可直接通过企业微信/钉钉/飞书发给 IT 运维");
  };

  return (
    <div className="kb-container">
      {/* 顶部置顶搜索与双重过滤面板 */}
      <section className="kb-header-card">
        <div className="kb-search-row">
          <Input
            className="kb-search-input"
            prefix={<SearchOutlined style={{ color: "var(--muted)", marginRight: 6 }} />}
            placeholder="搜索桌面运维与IT支持故障、错误代码 (如 0x0000011b, 0x50, 0x7B, 0xC004F074)、关键词 (如 蓝屏, 域信任, 共享打印, Outlook, 临时配置)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            size="large"
          />
          <Button
            type="primary"
            icon={<CustomerServiceOutlined />}
            onClick={openSupportModal}
            style={{ borderRadius: 8, height: 40, fontWeight: 500 }}
          >
            寻求企业 IT 帮助
          </Button>
        </div>

        <div className="kb-filters-container">
          {/* 第一组：级别过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">故障等级:</span>
              <span
                className={`kb-pill${selectedSeverity === "all" ? " active" : ""}`}
                onClick={() => setSelectedSeverity("all")}
              >
                全部级别 ({KNOWLEDGE_BASE.length})
              </span>
              {(["danger", "urgent", "warning", "common"] as SeverityLevel[]).map((sev) => {
                const conf = SEVERITY_CONFIG[sev];
                const count = KNOWLEDGE_BASE.filter((i) => i.severity === sev).length;
                return (
                  <span
                    key={sev}
                    className={`kb-pill ${conf.pillClass}${selectedSeverity === sev ? " active" : ""}`}
                    onClick={() => setSelectedSeverity(sev)}
                  >
                    {conf.icon} <span>{conf.label}</span> ({count})
                  </span>
                );
              })}
            </div>

            <div className="kb-stat-text">
              匹配到 <strong>{filteredItems.length}</strong> / {KNOWLEDGE_BASE.length} 项桌面运维排障指南
            </div>
          </div>

          {/* 第二组：领域分类过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">IT分类:</span>
              {CATEGORIES.map((cat) => (
                <span
                  key={cat.key}
                  className={`kb-pill${selectedCategory === cat.key ? " active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.icon} <span>{cat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 一排三列网格布局 */}
      {filteredItems.length === 0 ? (
        <div className="kb-empty">
          <Empty
            description={
              <span>
                未找到包含 "<strong>{keyword}</strong>" 的桌面运维资料，您可以尝试输入 蓝屏、打印机、或错误代码
              </span>
            }
          />
        </div>
      ) : (
        <div className="kb-grid">
          {filteredItems.map((item) => {
            const conf = SEVERITY_CONFIG[item.severity];
            const isFixing = fixingId === item.id;
            return (
              <article
                key={item.id}
                className="kb-card"
                onClick={(e) => openDetailModal(item, e)}
              >
                <div className="kb-card-top">
                  {/* 头部：级别 Badge + 错误代码 Tag */}
                  <div className="kb-card-head">
                    <Tag color={conf.tagColor} style={{ marginRight: 0, fontWeight: 500 }}>
                      {conf.icon} {conf.label}
                    </Tag>
                    {item.errorCode && (
                      <Tag
                        bordered={false}
                        color="default"
                        style={{ fontFamily: "var(--font-code)", fontSize: 11, maxWidth: 160 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                          {item.errorCode}
                        </span>
                      </Tag>
                    )}
                  </div>

                  {/* 标题 */}
                  <h3 className="kb-card-title">{item.title}</h3>

                  {/* 报错现象微缩框 */}
                  <Tooltip title={item.symptom} placement="topLeft" mouseEnterDelay={0.4}>
                    <div className="kb-error-box">{item.symptom}</div>
                  </Tooltip>

                  {/* 底层根因 */}
                  <div className="kb-reason-box">{item.rootCause}</div>
                </div>

                {/* 卡片底部操作栏 */}
                <div className="kb-card-bottom">
                  <div className="kb-action-row">
                    <Button
                      type="primary"
                      className="kb-fix-btn"
                      icon={<ThunderboltOutlined />}
                      loading={isFixing}
                      onClick={(e) => handleTryFix(item, e)}
                    >
                      {isFixing ? "正在尝试修复..." : "一键修复尝试"}
                    </Button>
                    <Button
                      type="default"
                      className="kb-detail-btn"
                      icon={<ToolOutlined />}
                      onClick={(e) => openDetailModal(item, e)}
                    >
                      详细排障
                    </Button>
                  </div>

                  <div className="kb-footer-tips" onClick={(e) => openDetailModal(item, e)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <ToolOutlined /> 点击查看完整分析与企业运维指引
                    </span>
                    <ExpandAltOutlined style={{ color: "var(--muted)" }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 完整排查链详情弹窗（已完整内嵌运维求助指引，绝不与其他弹窗重叠打架） */}
      <Modal
        title={
          detailItem ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={SEVERITY_CONFIG[detailItem.severity].tagColor}>
                {SEVERITY_CONFIG[detailItem.severity].label}
              </Tag>
              <span>{detailItem.title}</span>
            </div>
          ) : null
        }
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button
            key="fix"
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={detailItem ? fixingId === detailItem.id : false}
            onClick={() => detailItem && handleTryFix(detailItem)}
          >
            一键修复尝试
          </Button>,
          <Button
            key="copyFault"
            icon={<CopyOutlined />}
            onClick={() => detailItem && handleCopyFaultReport(detailItem)}
          >
            复制报修信息
          </Button>,
          <Button key="close" onClick={() => setDetailItem(null)}>
            关闭
          </Button>,
        ]}
        width={720}
        zIndex={1050}
        destroyOnClose
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                故障特征 / 典型表现
              </div>
              <div className="kb-error-box" style={{ maxHeight: "none", WebkitLineClamp: "unset" }}>
                {detailItem.symptom}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                根因机制与系统分析
              </div>
              <div className="kb-reason-box" style={{ maxHeight: "none", WebkitLineClamp: "unset" }}>
                {detailItem.rootCause}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                IT 支持闭环排查步骤
              </div>
              <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                {detailItem.diagnosticSteps.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <code style={{ fontFamily: "var(--font-code)", background: "var(--bg-soft)", padding: "2px 6px", borderRadius: 4 }}>
                      {step}
                    </code>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                排查细节与规程说明
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-line" }}>
                {detailItem.solution}
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontSize: 12,
                }}
              >
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                <strong>企业 IT 运维规程：</strong>{detailItem.bestPractice}
              </div>
            </div>

            {/* 内嵌式企业运维支持与报修指引卡片（原地展示，杜绝二级弹窗重叠遮挡） */}
            <div className="kb-embedded-support-card">
              <div className="kb-support-head">
                <CustomerServiceOutlined style={{ color: "var(--accent)", fontSize: 16 }} />
                <span>企业 IT 桌面运维支持与快速报障指引</span>
              </div>
              <div className="kb-support-body">
                <div>
                  <strong>免手动操作原则：</strong>
                  您无需手动复制或在终端中敲命令。点击下方【一键修复尝试】将由工具箱全自动执行系统轻量排障。
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>遇到棘手故障？</strong>
                  如果一键修复后仍未解决，或属于硬件物理故障/域控权限拦截：
                </div>
                <ol style={{ paddingLeft: 18, margin: "4px 0 0 0", color: "var(--text)" }}>
                  <li>切勿擅自修改底层 BIOS/分区表或格式化磁盘；</li>
                  <li>点击弹窗底部【复制报修信息】自动复制完整错误代码与机器诊断摘要；</li>
                  <li>将内容直接粘贴发送给企业 IT 运维老师或录入服务台工单系统。</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 修复尝试执行结果反馈弹窗 (独立高层级，绝不与详情菜单重叠) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fixResult?.success ? (
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
            ) : (
              <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 18 }} />
            )}
            <span>{fixResult?.title || "修复尝试反馈"}</span>
          </div>
        }
        open={!!fixResult}
        onCancel={() => setFixResult(null)}
        footer={[
          <Button
            key="help"
            type="primary"
            icon={<PhoneOutlined />}
            onClick={openSupportModal}
          >
            联系企业运维 / 寻求帮助
          </Button>,
          <Button key="ok" onClick={() => setFixResult(null)}>
            我知道了
          </Button>,
        ]}
        width={560}
        zIndex={1150}
        destroyOnClose
      >
        {fixResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "16px 0" }}>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {fixResult.detail}
            </div>

            <div className="kb-support-banner" style={{ marginTop: 0 }}>
              <WarningOutlined style={{ color: "#faad14", fontSize: 18, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", marginBottom: 2 }}>后续处理与求助指引：</strong>
                {fixResult.contactSupportTip}
                <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
                  提示：如果上述尝试完成后故障现象仍未消失，请勿反复修改高级底层配置，请直接联系企业 IT 桌面运维团队。
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 企业 IT 桌面运维支持求助独立弹窗 (最高层级 zIndex=2000，绝对置顶且互斥) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CustomerServiceOutlined style={{ color: "var(--accent)", fontSize: 18 }} />
            <span>企业 IT 桌面运维支持与服务台求助指引</span>
          </div>
        }
        open={showSupportModal}
        onCancel={() => setShowSupportModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowSupportModal(false)}>
            我知道了
          </Button>,
        ]}
        width={560}
        zIndex={2000}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "14px 0", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ padding: "14px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text)", fontSize: 14 }}>
              📞 企业 IT 服务台标准报障受理流程：
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, color: "var(--text-2)" }}>
              <li style={{ marginBottom: 6 }}>
                <strong>记录现象与代码：</strong>遇到蓝屏（如 0x50, 0x7B）或打印机故障（0x11b），在详情页点击【复制报修信息】一键提取完整报错日志。
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>避免破坏性操作：</strong>切勿自行格式化磁盘、修改 BIOS/UEFI 启动模式、或擅自退域加域，防止丢失企业域配置文件。
              </li>
              <li>
                <strong>提交支持渠道：</strong>通过企业企业微信、钉钉、飞书服务台工单，或拨打内网 IT 运维热线派单，等待桌面工程师远程或到场处置。
              </li>
            </ol>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--accent-soft)", borderRadius: 8, color: "var(--accent)" }}>
            <SafetyCertificateOutlined style={{ marginRight: 6 }} />
            <strong>安全保障承诺：</strong>
            青衫工具箱所有一键排查尝试均遵循企业桌面安全规范，绝不执行不可逆破坏性操作。如遇到域控策略限制，请由授权 IT 工程师协助处理。
          </div>
        </div>
      </Modal>
    </div>
  );
}
