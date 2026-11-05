import React, { createContext, useContext, useMemo } from "react";

export type Language = "zh-CN" | "en-US";

export const LANGUAGE_OPTIONS: Array<{
  value: Language;
  label: string;
  flag: string;
}> = [
  { value: "zh-CN", label: "简体中文 (Chinese)", flag: "🇨🇳" },
  { value: "en-US", label: "English (英语)", flag: "🇺🇸" },
];

const STORAGE_KEY = "opsdeck.language";

export function loadLanguage(): Language {
  if (typeof window === "undefined") return "zh-CN";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en-US") return saved;
    return navigator.language && !navigator.language.startsWith("zh") ? "en-US" : "zh-CN";
  } catch {
    return "zh-CN";
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Universal Chinese to English phrase dictionary.
 * Allows any UI string to be translated seamlessly when switching to English.
 */
export const zh2en: Record<string, string> = {
  // Brand & Shell
  "青衫工具箱": "Qingshan Toolbox",
  "工作台": "Workbench",
  "管理员权限": "Administrator Privilege",
  "标准用户": "Standard User",
  "以管理员身份重启": "Relaunch as Admin",
  "具备管理员权限": "Administrator Session",
  "标准用户会话": "Standard User Session",
  "正在连接本机": "Connecting to local host",
  "自动刷新间隔": "Auto-refresh Interval",
  "重新采集本机数据": "Recollect host metrics",
  "刷新": "Refresh",
  "秒": "s",

  // Navigation Items
  "插件": "Plugins",
  "扩展工作台": "Extend Workbench",
  "资料库": "Knowledge Base",
  "运维日常排障手册与解决方案": "IT operations troubleshooting runbooks & fixes",
  "概览": "Overview",
  "健康状态": "System Health",
  "健康诊断": "Diagnostics",
  "硬件与快速修复": "Hardware & Quick Fixes",
  "进程管理": "Processes",
  "资源与终止": "Resources & Kill",
  "服务管理": "Services",
  "启停与重启": "Start, Stop & Restart",
  "网络诊断": "Network",
  "端口与 DNS": "Ports & DNS",
  "日志中心": "Logs",
  "事件检索与导出": "Events Search & Export",
  "磁盘清理": "Cleanup",
  "临时文件与缓存": "Temporary Files & Cache",
  "启动项": "Startup",
  "开机启动与计划任务": "Startup Apps & Tasks",
  "软件清单": "Software",
  "已安装程序与版本": "Installed Apps & Versions",
  "设置": "Settings",
  "权限与关于": "Permissions & About",

  // Page Subtitles
  "声明式扩展工作台能力": "Declarative workbench capabilities",
  "运维日常高频故障排查链与权威解决方案": "High-frequency fault troubleshooting runbooks and authoritative fixes",
  "本机健康状态与关键指标": "Host health status & vital operational metrics",
  "电池、磁盘、显卡与快速修复": "Battery, disk, GPU diagnostics and safe self-healing actions",
  "查看资源占用并安全地结束进程": "Inspect resource consumption and terminate processes safely",
  "控制系统服务的启动、停止与重启": "Control system service lifecycle and inspect status",
  "接口、端口连通性与 DNS 解析": "Interface traffic, TCP port handshakes, and DNS lookup",
  "最近 3 天事件日志的检索、详情与清理": "Recent 3-day Windows event logs retrieval and export",
  "扫描并释放可安全删除的临时文件": "Scan and reclaim disk space from safe temporary caches",
  "管理开机启动项与计划任务": "Manage boot startup applications and scheduled tasks",
  "已安装程序、版本与安装信息": "Installed applications, drivers, and runtime packages",
  "应用信息、权限、界面语言与后续能力": "Application runtime, UAC privileges, language, and roadmap",

  // Common Controls & Tables
  "搜索": "Search",
  "操作": "Action",
  "状态": "Status",
  "全部": "All",
  "取消": "Cancel",
  "确定": "OK",
  "保存": "Save",
  "删除": "Delete",
  "导出": "Export",
  "导入": "Import",
  "未知": "Unknown",
  "成功": "Success",
  "失败": "Failed",
  "运行中": "Running",
  "已停止": "Stopped",
  "启动中": "Starting",
  "停止中": "Stopping",
  "已暂停": "Paused",
  "暂停中": "Pausing",
  "恢复中": "Resuming",
  "唤醒中": "Waking",
  "休眠": "Sleeping",
  "已退出": "Exited",
  "僵尸": "Zombie",
  "共": "Total",
  "条": "items",
  "个": "items",
  "可用": "Available",
  "已用": "Used",
  "强制": "Force",
  "自动": "Auto",
  "手动": "Manual",
  "禁用": "Disabled",
  "引导": "Boot",
  "系统": "System",
  "健康": "Healthy",
  "警告": "Warning",
  "异常": "Degraded",
  "执行": "Run",
  "需要管理员": "Requires Admin",
  "需要管理员权限": "Requires Administrator Privilege",

  // Overview Page
  "已运行": "Uptime",
  "内核": "Kernel",
  "CPU 负载": "CPU Load",
  "刷新指标": "Refresh Metrics",
  "进入进程": "Processes",
  "处理器": "Processor",
  "内存": "RAM",
  "交换": "Swap",
  "系统盘": "System Disk",
  "运行时间": "Uptime",
  "启动于": "Booted at",
  "个卷": "volumes",
  "核心负载": "Core Load",
  "每个逻辑处理器的实时占用率": "Real-time usage per logical processor",
  "线程": "threads",
  "实时采样 · 1s": "Live sample · 1s",
  "存储卷": "Storage Volumes",
  "磁盘容量与剩余空间": "Disk capacity & free space",
  "可移动": "Removable",
  "本机信息": "Host Summary",
  "登录会话与硬件摘要": "Session & hardware specifications",
  "主机名": "Hostname",
  "操作系统": "Operating System",
  "内核版本": "Kernel Version",
  "内存总量": "Total Memory",
  "交换空间": "Swap Space",

  // Processes Page
  "进程列表": "Process List",
  "搜索名称、PID 或用户": "Search name, PID or user",
  "名称": "Name",
  "跳过正常退出流程，直接终止进程": "Skip graceful exit and terminate directly",
  "无法读取进程列表": "Failed to read process list",
  "进程": "Process",
  "用户": "User",
  "结束进程": "End Process",
  "结束": "End",
  "结束系统关键进程可能导致系统不稳定；青衫工具箱会拦截对自身进程的操作。": "Ending critical system processes may cause instability; Qingshan Toolbox blocks actions on its own process.",

  // Services Page
  "系统服务": "System Services",
  "搜索服务名称": "Search service name",
  "服务": "Service",
  "启动类型": "Startup Type",
  "启动服务": "Start Service",
  "停止服务": "Stop Service",
  "重启服务": "Restart Service",
  "当前为标准用户": "Current Session is Standard User",
  "启动、停止和重启系统服务需要管理员权限。请从左侧重新以管理员身份启动青衫工具箱。": "Starting, stopping, and restarting services requires administrator privileges. Please relaunch as admin.",
  "无法读取系统服务": "Failed to read system services",
  "服务操作会等待状态变更完成（最长 20 秒），请勿重复点击。": "Service actions wait for state change (up to 20s). Please do not click repeatedly.",
  "依赖该服务的应用可能立即中断，请确认当前不在关键运维窗口。": "Dependent applications may stop immediately. Please verify before proceeding.",

  // Diagnostics Page
  "本机健康诊断": "System Diagnostics",
  "电池、磁盘健康、显卡驱动与常用网络修复": "Battery, disk health, GPU drivers, and network quick fixes",
  "导出报告": "Export Report",
  "重新检测": "Re-detect",
  "电池": "Battery",
  "磁盘健康": "Disk Health",
  "显卡": "GPU",
  "采样时间": "Sample Time",
  "未检测到": "Not Detected",
  "台式机或电池不可用": "Desktop PC or battery unavailable",
  "预计可用": "Estimated",
  "分钟": "mins",
  "块状态正常": "drive(s) healthy",
  "个适配器": "adapter(s)",
  "磁盘": "Disks",
  "SMART / 运行状态来自 Windows 存储接口": "SMART & status from Windows Storage APIs",
  "未读取到物理磁盘": "No physical disks detected",
  "驱动版本与显存": "Driver version & VRAM",
  "未读取到显卡": "No graphics cards detected",
  "驱动": "Driver",
  "显存": "VRAM",
  "快速修复": "Quick Fix",
  "只执行白名单内的安全操作": "Executes only whitelisted safe operations",
  "报告内容": "Report Content",
  "导出 Markdown，可直接附在工单或发给同事": "Export Markdown to attach to tickets or send to colleagues",
  "仅本机只读信息": "Local Read-only Info Only",
  "等待采集数据…": "Waiting for diagnostic collection…",

  // Network Page
  "网络接口": "Network Interfaces",
  "个活动接口 · 不含回环设备": "active interfaces · excluding loopback",
  "重新扫描": "Rescan",
  "未分配 IP 地址": "No IP address assigned",
  "接收": "Received",
  "发送": "Transmitted",
  "未发现可用的网络接口": "No available network interfaces found",
  "端口连通性": "Port Connectivity",
  "TCP 握手检测，适用于数据库、SSH、Web 服务": "TCP handshake testing for databases, SSH, and web servers",
  "主机或域名": "Host or Domain",
  "检测": "Check",
  "端口开放": "Port Open",
  "端口不可达": "Port Unreachable",
  "DNS 解析": "DNS Lookup",
  "验证域名在本机的解析结果": "Verify domain resolution results on this machine",
  "解析": "Resolve",
  "解析失败": "Resolution Failed",
  "解析成功": "Resolved Successfully",
  "使用系统解析器（DNS Client / hosts），结果反映本机真实访问路径。": "Uses system resolver (DNS Client / hosts) reflecting actual local routing.",

  // Logs Page
  "系统日志": "System Logs",
  "应用日志": "Application Logs",
  "安全日志": "Security Logs",
  "所有级别": "All Levels",
  "严重": "Critical",
  "错误": "Error",
  "信息": "Information",
  "详细": "Verbose",
  "检索日志正文、事件 ID 或来源": "Search message, event ID or provider",
  "时间": "Time",
  "级别": "Level",
  "来源": "Provider",
  "事件 ID": "Event ID",
  "摘要": "Summary",
  "事件详情": "Event Details",
  "清空日志": "Clear Logs",
  "清空": "Clear",

  // Cleanup Page
  "临时文件": "Temporary Files",
  "浏览器缓存": "Browser Cache",
  "系统缓存": "System Cache",
  "回收站": "Recycle Bin",
  "全选": "Select All",
  "立即清理": "Clean Up Now",
  "未发现可清理的临时文件": "No cleanable items found",
  "确认清理选中的项目？": "Confirm cleaning selected targets?",
  "将删除临时文件并释放磁盘空间，正在使用的文件会被自动跳过。": "Will delete temporary files to reclaim space. In-use files are skipped automatically.",

  // Startup Page
  "开机自启项": "Startup Items",
  "计划任务": "Scheduled Tasks",
  "搜索名称、路径或命令": "Search name, path or command",
  "位置": "Location",
  "范围": "Scope",
  "命令": "Command",
  "当前用户": "Current User",
  "所有用户": "All Users",
  "注册表 Run": "Registry Run",
  "启动文件夹": "Startup Folder",

  // Software Page
  "软件与驱动": "Software & Drivers",
  "软件": "Applications",
  "运行库": "Runtimes",
  "其他": "Other",
  "搜索名称、发布者或版本": "Search name, publisher or version",
  "打开 Windows 应用和功能": "Open Windows Apps & Features",
  "版本": "Version",
  "发布者": "Publisher",
  "安装日期": "Install Date",
  "卸载": "Uninstall",
  "已启动卸载程序，完成后请刷新列表": "Uninstaller started. Please refresh after completion.",

  // Plugins Page
  "已安装": "Installed",
  "插件市场": "Marketplace",
  "搜索插件名称、描述或标签": "Search plugin name, description or tags",
  "打开目录": "Open Directory",
  "安装": "Install",
  "启用": "Enable",
  "作者": "Author",

  // Knowledge Base
  "桌面运维与IT支持资料库": "Desktop Operations & IT Support Knowledge Base",
  "搜索症状、错误代码、可能成因或排障关键词...": "Search symptom, error code, possible cause, or keyword...",
  "新建记录": "New Record",
  "GitHub 同步": "GitHub Sync",
  "联系 IT": "Contact IT",
  "所有分类": "All Categories",
  "所有等级": "All Severities",
  "严重故障 (紧急)": "Critical Severity",
  "中度影响 (警告)": "Warning Severity",
  "常规咨询 (提示)": "Info Severity",
  "操作系统与开机": "OS & Boot",
  "网络与连通性": "Network & Connectivity",
  "硬件与外设": "Hardware & Peripherals",
  "日常办公软件": "Office Software",
  "安全与杀毒": "Security & Antivirus",
  "账号与权限": "Account & Permissions",
  "打印与扫描": "Print & Scan",
  "企业邮箱": "Corporate Mail",
  "办公外围设备": "Office Peripherals",
  "尝试一键自愈": "Try One-Click Fix",
  "复制排障描述": "Copy Description",
  "故障症状": "Symptom",
  "排查成因": "Possible Cause",
  "自愈与解决动作": "Fix Action",
  "升级运维建议": "Escalation Advice",
  "云端运维资料库同步中心": "Cloud Knowledge Base Sync Center",
  "智能拉取最新资料库": "Pull Latest Knowledge",
  "贡献至官方资料库": "Contribute to Official KB",
  "通道一：企业运维 Token 极速直传": "Channel 1: IT Token Direct Push",
  "通道二：一键导出并跳转 GitHub Issue": "Channel 2: Export & Open GitHub Issue",
  "通道三：离线导出 JSON 数据包": "Channel 3: Offline JSON Data Export",

  // Error Boundary
  "界面遇到异常": "UI Fault Encountered",
  "界面层已停止渲染，系统数据未被修改。请重新加载；若问题持续，请保留控制台信息并联系维护者。": "The UI stopped rendering. Underlying system data is unaffected. Please reload.",
  "重新加载": "Reload Interface",
};

export const translations: Record<Language, Record<string, string>> = {
  "zh-CN": {
    // Brand
    "brand.name": "青衫工具箱",
    "brand.caption": "QINGSHAN TOOLBOX",
    "brand.workbench": "工作台",

    // Navigation
    "nav.plugins": "插件",
    "nav.pluginsHint": "扩展工作台",
    "nav.knowledge": "资料库",
    "nav.knowledgeHint": "运维日常排障手册与解决方案",
    "nav.overview": "概览",
    "nav.overviewHint": "健康状态",
    "nav.diagnostics": "健康诊断",
    "nav.diagnosticsHint": "硬件与快速修复",
    "nav.processes": "进程管理",
    "nav.processesHint": "资源与终止",
    "nav.services": "服务管理",
    "nav.servicesHint": "启停与重启",
    "nav.network": "网络诊断",
    "nav.networkHint": "端口与 DNS",
    "nav.logs": "日志中心",
    "nav.logsHint": "事件检索与导出",
    "nav.cleanup": "磁盘清理",
    "nav.cleanupHint": "临时文件与缓存",
    "nav.startup": "启动项",
    "nav.startupHint": "开机启动与计划任务",
    "nav.software": "软件清单",
    "nav.softwareHint": "已安装程序与版本",
    "nav.settings": "设置",
    "nav.settingsHint": "权限与关于",
    "nav.adminPrivilege": "管理员权限",
    "nav.standardUser": "标准用户",
    "nav.adminDesc": "可执行服务启停、进程终止等系统级操作。",
    "nav.standardDesc": "部分运维操作需要管理员权限才能执行。",
    "nav.relaunchAdmin": "以管理员身份重启",

    // Page titles & subtitles
    "page.plugins.title": "插件",
    "page.plugins.subtitle": "声明式扩展工作台能力",
    "page.knowledge.title": "资料库",
    "page.knowledge.subtitle": "运维日常高频故障排查链与权威解决方案",
    "page.overview.title": "概览",
    "page.overview.subtitle": "本机健康状态与关键指标",
    "page.diagnostics.title": "健康诊断",
    "page.diagnostics.subtitle": "电池、磁盘、显卡与快速修复",
    "page.processes.title": "进程管理",
    "page.processes.subtitle": "查看资源占用并安全地结束进程",
    "page.services.title": "服务管理",
    "page.services.subtitle": "控制系统服务的启动、停止与重启",
    "page.network.title": "网络诊断",
    "page.network.subtitle": "接口、端口连通性与 DNS 解析",
    "page.logs.title": "日志中心",
    "page.logs.subtitle": "最近 3 天事件日志的检索、详情与清理",
    "page.cleanup.title": "磁盘清理",
    "page.cleanup.subtitle": "扫描并释放可安全删除的临时文件",
    "page.startup.title": "启动项",
    "page.startup.subtitle": "管理开机启动项与计划任务",
    "page.software.title": "软件清单",
    "page.software.subtitle": "已安装程序、版本与安装信息",
    "page.settings.title": "设置",
    "page.settings.subtitle": "应用信息、权限、界面语言与后续能力",

    // TopBar
    "topbar.connecting": "正在连接本机",
    "topbar.refreshInterval": "自动刷新间隔",
    "topbar.seconds": "秒",
    "topbar.refreshTooltip": "重新采集本机数据",
    "topbar.refresh": "刷新",

    // Settings
    "settings.language": "界面语言 / Language",
    "settings.languageDesc": "根据不同国家与习惯自由更换界面显示语言，切换后立即生效",
    "settings.selectLanguage": "显示语言选择",
    "settings.selectLanguageHint": "支持在 简体中文 与 English 之间无缝热切换",
    "settings.appearance": "外观",
    "settings.appearanceDesc": "深色模式适合长时间值守",
    "settings.themeDark": "深色主题",
    "settings.themeDarkDesc": "切换后立即生效，并记忆在本机",
    "settings.themeDarkLabel": "深色",
    "settings.themeLightLabel": "浅色",
    "settings.panelPreview": "青衫工具箱 面板",
    "settings.panelMetrics": "实时指标 · 进程 · 服务",
    "settings.appInfo": "应用信息",
    "settings.appInfoDesc": "桌面端运行时与版本",
    "settings.productName": "产品名称",
    "settings.appVersion": "应用版本",
    "settings.coreVersion": "领域层版本",
    "settings.buildType": "构建类型",
    "settings.platform": "平台",
    "settings.frontendRuntime": "前端运行时",
    "settings.tauriRuntime": "Tauri WebView2",
    "settings.browserMock": "浏览器预览（Mock 数据）",
    "settings.permissionSecurity": "权限与安全",
    "settings.permissionSecurityDesc": "系统级操作依赖 Windows UAC",
    "settings.adminEnabled": "管理员权限已启用",
    "settings.standardUserTitle": "当前为标准用户",
    "settings.adminEnabledDesc": "服务启停、进程终止与系统采集均可用。请谨慎操作系统关键服务。",
    "settings.standardUserDesc": "仅可查看信息。以管理员身份重启后可执行服务启停等操作。",
    "settings.elevateRestart": "提权重启",
    "settings.host": "主机",
    "settings.runtime": "运行时",
    "settings.systemSummary": "本机摘要",
    "settings.systemSummaryDesc": "当前会话的关键资源",
    "settings.cpu": "处理器",
    "settings.logicalCores": "逻辑核心",
    "settings.coresThreads": "线程",
    "settings.memory": "内存",
    "settings.uptime": "运行时间",
    "settings.versionUpdate": "版本更新",
    "settings.versionUpdateDesc": "检查 GitHub 最新 Release，不会自动下载或执行安装",
    "settings.checkUpdate": "检查更新",
    "settings.checking": "检查中...",
    "settings.hasNewVersion": "发现新版本",
    "settings.alreadyLatest": "当前已是最新版本",
    "settings.openRelease": "前往 GitHub 查看 Release",
    "settings.updateNotice": "更新说明",
    "settings.updateNoticeDirect": "青衫工具箱不会在后台自动下载安装包；请按需前往 Releases 手动获取新版。",
    "settings.updateNoticeWait": "最多等待 12 秒；网络不通不影响使用本地运维能力。",
    "settings.roadmap": "演进路线",
    "settings.roadmapDesc": "从桌面工作台走向企业运维控制台",
    "settings.roadmapStage1Title": "第一阶段 · 核心架构与本机工作台（已就绪）",
    "settings.roadmapStage1Desc": "Rust + Tauri，系统概览、进程/服务/网络、安全模型与单文件分发。",
    "settings.roadmapStage2Title": "第二阶段 · 运维能力深化（已就绪）",
    "settings.roadmapStage2Desc": "日志检索、磁盘清理、启动项管理、软件清单、插件机制与资料库同步。",
    "settings.roadmapStage3Title": "第三阶段 · 个人版体验打磨（当前推进）",
    "settings.roadmapStage3Desc": "健康诊断、诊断报告导出、多语言切换、单实例托盘、GitHub Releases 更新检测。",
    "settings.roadmapStage4Title": "第四阶段 · Web DevOps 控制台（未来）",
    "settings.roadmapStage4Desc": "多机纳管、Terraform / Ansible / GitHub Actions 编排、安全审计与自动化工单。",

    // Knowledge Base
    "kb.searchPlaceholder": "搜索症状、错误代码、可能成因或排障关键词...",
    "kb.newRecord": "新建记录",
    "kb.export": "导出",
    "kb.import": "导入",
    "kb.githubSync": "GitHub 同步",
    "kb.contactSupport": "联系 IT",
    "kb.allSeverities": "所有等级",
    "kb.allCategories": "所有分类",
    "kb.oneClickFix": "尝试一键自愈",
    "kb.copyDesc": "复制排障描述",
    "kb.symptom": "故障症状",
    "kb.cause": "排查成因",
    "kb.fixAction": "自愈与解决动作",
    "kb.fallback": "升级运维建议",
  },

  "en-US": {
    // Brand
    "brand.name": "Qingshan Toolbox",
    "brand.caption": "QINGSHAN TOOLBOX",
    "brand.workbench": "Workbench",

    // Navigation
    "nav.plugins": "Plugins",
    "nav.pluginsHint": "Extend Workbench",
    "nav.knowledge": "Knowledge Base",
    "nav.knowledgeHint": "IT Operations Troubleshooting & Runbooks",
    "nav.overview": "Overview",
    "nav.overviewHint": "Health Status",
    "nav.diagnostics": "Diagnostics",
    "nav.diagnosticsHint": "Hardware & Safe Fixes",
    "nav.processes": "Processes",
    "nav.processesHint": "Resource & Kill",
    "nav.services": "Services",
    "nav.servicesHint": "Start, Stop & Restart",
    "nav.network": "Network",
    "nav.networkHint": "Ports & DNS",
    "nav.logs": "Logs",
    "nav.logsHint": "Event Search & Export",
    "nav.cleanup": "Cleanup",
    "nav.cleanupHint": "Temp Files & Cache",
    "nav.startup": "Startup",
    "nav.startupHint": "Startup Apps & Tasks",
    "nav.software": "Software",
    "nav.softwareHint": "Installed Apps & Versions",
    "nav.settings": "Settings",
    "nav.settingsHint": "Permissions & About",
    "nav.adminPrivilege": "Administrator",
    "nav.standardUser": "Standard User",
    "nav.adminDesc": "Full privileges to start/stop services and terminate processes.",
    "nav.standardDesc": "Some maintenance tasks require administrator elevation.",
    "nav.relaunchAdmin": "Relaunch as Admin",

    // Page titles & subtitles
    "page.plugins.title": "Plugins",
    "page.plugins.subtitle": "Declarative workbench capabilities",
    "page.knowledge.title": "Knowledge Base",
    "page.knowledge.subtitle": "High-frequency fault troubleshooting runbooks and authoritative fixes",
    "page.overview.title": "Overview",
    "page.overview.subtitle": "Host health status & vital operational metrics",
    "page.diagnostics.title": "Diagnostics",
    "page.diagnostics.subtitle": "Battery, disk, GPU diagnostics and safe self-healing actions",
    "page.processes.title": "Processes",
    "page.processes.subtitle": "Inspect resource consumption and terminate processes safely",
    "page.services.title": "Services",
    "page.services.subtitle": "Control system service lifecycle and inspect status",
    "page.network.title": "Network",
    "page.network.subtitle": "Interface traffic, TCP port handshakes, and DNS lookup",
    "page.logs.title": "Logs",
    "page.logs.subtitle": "Recent 3-day Windows event logs retrieval and export",
    "page.cleanup.title": "Cleanup",
    "page.cleanup.subtitle": "Scan and reclaim disk space from safe temporary caches",
    "page.startup.title": "Startup",
    "page.startup.subtitle": "Manage boot startup applications and scheduled tasks",
    "page.software.title": "Software",
    "page.software.subtitle": "Installed applications, drivers, and runtime packages",
    "page.settings.title": "Settings",
    "page.settings.subtitle": "Application runtime, UAC privileges, language, and roadmap",

    // TopBar
    "topbar.connecting": "Connecting to host",
    "topbar.refreshInterval": "Refresh Interval",
    "topbar.seconds": "s",
    "topbar.refreshTooltip": "Recollect host metrics",
    "topbar.refresh": "Refresh",

    // Settings
    "settings.language": "Language / 界面语言",
    "settings.languageDesc": "Switch display language freely. Changes take effect instantly.",
    "settings.selectLanguage": "Display Language",
    "settings.selectLanguageHint": "Seamless instant hot-switching between 简体中文 and English",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Dark mode is optimized for continuous operations monitoring",
    "settings.themeDark": "Dark Theme",
    "settings.themeDarkDesc": "Takes effect immediately and persists on this machine",
    "settings.themeDarkLabel": "Dark",
    "settings.themeLightLabel": "Light",
    "settings.panelPreview": "Qingshan Toolbox Panel",
    "settings.panelMetrics": "Live Metrics · Processes · Services",
    "settings.appInfo": "Application Info",
    "settings.appInfoDesc": "Desktop runtime and versioning details",
    "settings.productName": "Product Name",
    "settings.appVersion": "App Version",
    "settings.coreVersion": "Core Version",
    "settings.buildType": "Build Type",
    "settings.platform": "Platform",
    "settings.frontendRuntime": "Frontend Runtime",
    "settings.tauriRuntime": "Tauri WebView2",
    "settings.browserMock": "Browser Preview (Mock Data)",
    "settings.permissionSecurity": "Permissions & Security",
    "settings.permissionSecurityDesc": "System-level operations depend on Windows UAC",
    "settings.adminEnabled": "Administrator Privilege Active",
    "settings.standardUserTitle": "Currently Standard User",
    "settings.adminEnabledDesc": "Service control, process termination, and full telemetry are enabled. Exercise care with critical services.",
    "settings.standardUserDesc": "Read-only mode. Relaunch as administrator to enable service control and process termination.",
    "settings.elevateRestart": "Relaunch as Admin",
    "settings.host": "Host",
    "settings.runtime": "Runtime",
    "settings.systemSummary": "Host Summary",
    "settings.systemSummaryDesc": "Vital resources for current session",
    "settings.cpu": "CPU",
    "settings.logicalCores": "Logical Cores",
    "settings.coresThreads": "threads",
    "settings.memory": "Memory",
    "settings.uptime": "Uptime",
    "settings.versionUpdate": "Version Updates",
    "settings.versionUpdateDesc": "Checks latest GitHub Releases. Will never download or execute automatically.",
    "settings.checkUpdate": "Check for Updates",
    "settings.checking": "Checking...",
    "settings.hasNewVersion": "New Version Available",
    "settings.alreadyLatest": "Already Latest Version",
    "settings.openRelease": "View Release on GitHub",
    "settings.updateNotice": "Update Notice",
    "settings.updateNoticeDirect": "Qingshan Toolbox never downloads packages in the background. Visit Releases to upgrade manually as needed.",
    "settings.updateNoticeWait": "Wait up to 12s. Network failures will not affect local features.",
    "settings.roadmap": "Roadmap",
    "settings.roadmapDesc": "From desktop workstation to enterprise operations hub",
    "settings.roadmapStage1Title": "Stage 1 · Core Framework & Local Station (Completed)",
    "settings.roadmapStage1Desc": "Rust + Tauri, system overview, processes/services/network, security model.",
    "settings.roadmapStage2Title": "Stage 2 · Operations Enhancements (Completed)",
    "settings.roadmapStage2Desc": "Logs retriever, disk cleanup, startup manager, software inventory, plugins.",
    "settings.roadmapStage3Title": "Stage 3 · Personal Edition Experience (Current)",
    "settings.roadmapStage3Desc": "Diagnostics, reports, multi-language i18n, single instance tray, GitHub Releases update check.",
    "settings.roadmapStage4Title": "Stage 4 · Web DevOps Control Plane",
    "settings.roadmapStage4Desc": "Unified audit and orchestration for Terraform, Ansible, GitHub Actions, Docker, and Git.",

    // Knowledge Base
    "kb.searchPlaceholder": "Search symptom, error code, possible cause, or keyword...",
    "kb.newRecord": "New Record",
    "kb.export": "Export",
    "kb.import": "Import",
    "kb.githubSync": "GitHub Sync",
    "kb.contactSupport": "Contact IT",
    "kb.allSeverities": "All Severities",
    "kb.allCategories": "All Categories",
    "kb.oneClickFix": "Try One-Click Fix",
    "kb.copyDesc": "Copy Description",
    "kb.symptom": "Symptom",
    "kb.cause": "Cause",
    "kb.fixAction": "Fix Action",
    "kb.fallback": "Escalation Advice",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultVal?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "zh-CN",
  setLanguage: () => {},
  t: (key: string, defaultVal?: string) => defaultVal ?? key,
});

export function createTranslator(language: Language) {
  const dict = translations[language] || translations["zh-CN"];
  const fallbackDict = translations["zh-CN"] || {};

  return (key: string, defaultVal?: string): string => {
    // 1. Direct match in active dictionary
    if (dict && dict[key] != null) {
      return dict[key];
    }

    // 2. If English, check universal zh2en phrase mapping
    if (language === "en-US") {
      if (zh2en[key] != null) return zh2en[key];
      if (defaultVal && zh2en[defaultVal] != null) return zh2en[defaultVal];
      if (defaultVal && translations["en-US"][defaultVal] != null) return translations["en-US"][defaultVal];
    }

    // 3. Fallback to Chinese dictionary by key
    if (fallbackDict[key] != null) {
      return fallbackDict[key];
    }

    // 4. Fallback or key itself
    return defaultVal ?? key;
  };
}

export function I18nProvider({
  children,
  language,
  onLanguageChange,
}: {
  children: React.ReactNode;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}) {
  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage: onLanguageChange, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
