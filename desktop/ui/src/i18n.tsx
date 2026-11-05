import React, { createContext, useContext, useEffect, useState } from "react";

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
    "settings.notCheckedYet": "尚未检查更新",
    "settings.updateNoticeAvailable": "请前往 Release 页面查看说明并手动下载。",
    "settings.updateNoticeLatest": "发布通道暂无更新。",
    "settings.updateNoticeWait": "检查最多等待 12 秒；网络不可用时只提示错误，不影响其他功能。",
    "settings.roadmap": "演进路线",
    "settings.roadmapDesc": "桌面端从“单机运维台”走向“企业运维中枢”",
    "settings.roadmapStage1Title": "阶段 1 · 框架与单机能力（已完成）",
    "settings.roadmapStage1Desc": "Rust + Tauri 框架、系统概览、进程/服务/网络诊断、权限模型。",
    "settings.roadmapStage2Title": "阶段 2 · 桌面运维增强（已完成）",
    "settings.roadmapStage2Desc": "日志采集与检索、磁盘清理、启动项、计划任务、软件清单、声明式插件。",
    "settings.roadmapStage3Title": "阶段 3 · 个人版体验（当前）",
    "settings.roadmapStage3Desc": "健康诊断、诊断报告、多语言支持、托盘常驻与单实例、崩溃日志、GitHub Release 更新检查。",
    "settings.roadmapStage4Title": "阶段 4 · 网页端 DevOps 控制面",
    "settings.roadmapStage4Desc": "Terraform、Ansible、GitHub Actions、Jenkins、Dockerfile、Shell 与 Git 记录的统一编排与审计。",

    // Knowledge Base
    "kb.searchPlaceholder": "搜索故障现象、错误代码、可能原因或关键词...",
    "kb.newRecord": "新增记录",
    "kb.export": "导出",
    "kb.import": "导入",
    "kb.githubSync": "GitHub云端同步",
    "kb.contactSupport": "联系运维",
    "kb.allSeverities": "全部级别",
    "kb.allCategories": "全部分类",
    "kb.oneClickFix": "一键修复尝试",
    "kb.copyDesc": "复制描述",
    "kb.symptom": "电脑表现",
    "kb.cause": "可能原因",
    "kb.fixAction": "修复操作",
    "kb.fallback": "无法解决指引",
  },
  "en-US": {
    // Brand
    "brand.name": "Qingshan Toolbox",
    "brand.caption": "QINGSHAN TOOLBOX",
    "brand.workbench": "WORKBENCH",

    // Navigation
    "nav.plugins": "Plugins",
    "nav.pluginsHint": "Extend Workspace Capabilities",
    "nav.knowledge": "Knowledge Base",
    "nav.knowledgeHint": "IT Support & Troubleshooting Guides",
    "nav.overview": "Overview",
    "nav.overviewHint": "System Health Status",
    "nav.diagnostics": "Diagnostics",
    "nav.diagnosticsHint": "Hardware & Quick Fixes",
    "nav.processes": "Processes",
    "nav.processesHint": "Resource Monitor & Kill",
    "nav.services": "Services",
    "nav.servicesHint": "Start, Stop & Restart",
    "nav.network": "Network",
    "nav.networkHint": "Ports, Ping & DNS",
    "nav.logs": "Log Center",
    "nav.logsHint": "Event Search & Export",
    "nav.cleanup": "Disk Cleanup",
    "nav.cleanupHint": "Temp Files & Cache",
    "nav.startup": "Startup Items",
    "nav.startupHint": "Boot Programs & Tasks",
    "nav.software": "Software List",
    "nav.softwareHint": "Installed Apps & Versions",
    "nav.settings": "Settings",
    "nav.settingsHint": "Preferences & About",
    "nav.adminPrivilege": "Administrator",
    "nav.standardUser": "Standard User",
    "nav.adminDesc": "Full privileges to manage services, terminate processes, and run fixes.",
    "nav.standardDesc": "Some advanced actions require administrator rights.",
    "nav.relaunchAdmin": "Restart as Admin",

    // Page titles & subtitles
    "page.plugins.title": "Plugins",
    "page.plugins.subtitle": "Declarative workspace extensibility",
    "page.knowledge.title": "Knowledge Base",
    "page.knowledge.subtitle": "IT trouble troubleshooting chains & verified solutions",
    "page.overview.title": "Overview",
    "page.overview.subtitle": "Local machine health status and key telemetry metrics",
    "page.diagnostics.title": "Diagnostics",
    "page.diagnostics.subtitle": "Battery, disk health, GPU & one-click fixes",
    "page.processes.title": "Processes",
    "page.processes.subtitle": "Monitor resource usage and safely terminate tasks",
    "page.services.title": "Services",
    "page.services.subtitle": "Manage Windows system services state",
    "page.network.title": "Network",
    "page.network.subtitle": "Interfaces, port connectivity & DNS resolution",
    "page.logs.title": "Log Center",
    "page.logs.subtitle": "Search, inspect, and export event logs",
    "page.cleanup.title": "Disk Cleanup",
    "page.cleanup.subtitle": "Scan and reclaim disk space from temp files safely",
    "page.startup.title": "Startup Items",
    "page.startup.subtitle": "Manage Windows boot apps and scheduled tasks",
    "page.software.title": "Software List",
    "page.software.subtitle": "Installed programs, versions, and install dates",
    "page.settings.title": "Settings",
    "page.settings.subtitle": "Application info, permissions, language and roadmap",

    // TopBar
    "topbar.connecting": "Connecting to local host",
    "topbar.refreshInterval": "Refresh interval",
    "topbar.seconds": "s",
    "topbar.refreshTooltip": "Re-collect telemetry data",
    "topbar.refresh": "Refresh",

    // Settings
    "settings.language": "Display Language / 界面语言",
    "settings.languageDesc": "Switch display language according to your region and preference. Changes take effect immediately.",
    "settings.selectLanguage": "Select Language",
    "settings.selectLanguageHint": "Seamless switching between 简体中文 and English",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Dark mode is suitable for prolonged operations monitoring",
    "settings.themeDark": "Dark Theme",
    "settings.themeDarkDesc": "Takes effect immediately and saved on this machine",
    "settings.themeDarkLabel": "Dark",
    "settings.themeLightLabel": "Light",
    "settings.panelPreview": "Qingshan Toolbox Panel",
    "settings.panelMetrics": "Real-time Metrics · Processes · Services",
    "settings.appInfo": "Application Info",
    "settings.appInfoDesc": "Desktop runtime environment and version",
    "settings.productName": "Product Name",
    "settings.appVersion": "App Version",
    "settings.coreVersion": "Core Version",
    "settings.buildType": "Build Profile",
    "settings.platform": "Platform",
    "settings.frontendRuntime": "Frontend Runtime",
    "settings.tauriRuntime": "Tauri WebView2",
    "settings.browserMock": "Browser Preview (Mock Data)",
    "settings.permissionSecurity": "Permissions & Security",
    "settings.permissionSecurityDesc": "System operations depend on Windows UAC",
    "settings.adminEnabled": "Administrator Privileges Active",
    "settings.standardUserTitle": "Standard User Mode",
    "settings.adminEnabledDesc": "Services, process management, and telemetry are active. Handle critical system services with care.",
    "settings.standardUserDesc": "View-only mode. Relaunch as administrator to toggle services or terminate processes.",
    "settings.elevateRestart": "Elevate & Restart",
    "settings.host": "Host",
    "settings.runtime": "Runtime",
    "settings.systemSummary": "System Summary",
    "settings.systemSummaryDesc": "Key telemetry resources of the current session",
    "settings.cpu": "Processor",
    "settings.logicalCores": "Logical Cores",
    "settings.coresThreads": "threads",
    "settings.memory": "Memory",
    "settings.uptime": "Uptime",
    "settings.versionUpdate": "Version Updates",
    "settings.versionUpdateDesc": "Checks GitHub for the latest release. Does not auto-install.",
    "settings.checkUpdate": "Check Updates",
    "settings.checking": "Checking...",
    "settings.hasNewVersion": "New version available",
    "settings.alreadyLatest": "You are on the latest version",
    "settings.notCheckedYet": "Not checked yet",
    "settings.updateNoticeAvailable": "Please visit the GitHub Release page to download manually.",
    "settings.updateNoticeLatest": "No new updates on the current release channel.",
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

export function I18nProvider({
  children,
  language,
  onLanguageChange,
}: {
  children: React.ReactNode;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}) {
  const t = (key: string, defaultVal?: string): string => {
    return translations[language]?.[key] ?? translations["zh-CN"]?.[key] ?? defaultVal ?? key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: onLanguageChange, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
