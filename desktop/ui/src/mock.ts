import type {
  AppInfo,
  DnsLookupResult,
  LogBatch,
  LogEntry,
  LogExport,
  LogQuery,
  LogSource,
  NetworkInterface,
  PluginCatalog,
  PluginInfo,
  PluginMarketEntry,
  PortCheckResult,
  ProcessInfo,
  ServiceInfo,
  SystemSnapshot,
} from "./types";

const GB = 1024 ** 3;

const cores = Array.from({ length: 16 }, (_, index) => {
  const base = [18, 26, 12, 41, 8, 33, 22, 15, 47, 9, 27, 36, 5, 19, 29, 13];
  return base[index % base.length];
});

export function mockSnapshot(): SystemSnapshot {
  const now = Math.floor(Date.now() / 1000);
  return {
    hostname: "OPS-WS-042",
    osName: "Windows 11 Pro",
    osVersion: "24H2 (26100.4351)",
    kernelVersion: "10.0.26100",
    arch: "x86_64",
    uptimeSecs: 3 * 86400 + 7 * 3600 + 42 * 60,
    bootTime: now - (3 * 86400 + 7 * 3600 + 42 * 60),
    cpuBrand: "Intel Core i7-13700H",
    physicalCores: 12,
    logicalCores: 16,
    cpuUsage: 23.8,
    perCoreUsage: cores.map((value) => value + Math.random() * 6),
    memoryTotal: 32 * GB,
    memoryUsed: 18.4 * GB,
    swapTotal: 8 * GB,
    swapUsed: 1.6 * GB,
    disks: [
      {
        name: "System",
        mountPoint: "C:\\",
        fileSystem: "NTFS",
        total: 953 * GB,
        available: 411 * GB,
        removable: false,
      },
      {
        name: "Work",
        mountPoint: "D:\\",
        fileSystem: "NTFS",
        total: 1907 * GB,
        available: 1288 * GB,
        removable: false,
      },
      {
        name: "Backup",
        mountPoint: "E:\\",
        fileSystem: "exFAT",
        total: 465 * GB,
        available: 92 * GB,
        removable: true,
      },
    ],
    isElevated: true,
  };
}

let processSeed = [
  { pid: 4, name: "System", user: "SYSTEM", cpu: 0.1, mem: 0.2, status: "运行中" },
  { pid: 412, name: "MsMpEng.exe", user: "SYSTEM", cpu: 3.2, mem: 0.4, status: "运行中" },
  { pid: 1024, name: "explorer.exe", user: "青衫", cpu: 1.4, mem: 0.3, status: "运行中" },
  { pid: 2216, name: "Code.exe", user: "青衫", cpu: 8.7, mem: 1.9, status: "运行中" },
  { pid: 3112, name: "Docker Desktop.exe", user: "青衫", cpu: 2.1, mem: 0.8, status: "运行中" },
  { pid: 4088, name: "chrome.exe", user: "青衫", cpu: 6.3, mem: 2.4, status: "运行中" },
  { pid: 5210, name: "postgres.exe", user: "NETWORK SERVICE", cpu: 0.8, mem: 0.5, status: "运行中" },
  { pid: 6024, name: "sshd.exe", user: "SYSTEM", cpu: 0.2, mem: 0.1, status: "运行中" },
  { pid: 7012, name: "opsdeck.exe", user: "青衫", cpu: 0.4, mem: 0.2, status: "运行中" },
];

export function mockProcesses(): ProcessInfo[] {
  return processSeed.map((item, index) => ({
    pid: item.pid,
    name: item.name,
    exe: `C:\\Program Files\\QingshanToolbox\\${item.name}`,
    command: `${item.name} --service`,
    cpuUsage: item.cpu,
    memory: Math.round(item.mem * GB),
    virtualMemory: Math.round(item.mem * 2.2 * GB),
    status: item.status,
    user: item.user,
    startTime: Math.floor(Date.now() / 1000) - 3600 * (index + 1),
  }));
}

const serviceSeed: ServiceInfo[] = [
  {
    name: "Dnscache",
    displayName: "DNS Client",
    status: "running",
    startType: "auto",
    processId: 1288,
    canStop: true,
  },
  {
    name: "Docker",
    displayName: "Docker Desktop Service",
    status: "running",
    startType: "auto",
    processId: 3112,
    canStop: true,
  },
  {
    name: "MpsSvc",
    displayName: "Windows Defender Firewall",
    status: "running",
    startType: "auto",
    processId: 2210,
    canStop: true,
  },
  {
    name: "sshd",
    displayName: "OpenSSH SSH Server",
    status: "stopped",
    startType: "manual",
    processId: 0,
    canStop: true,
  },
  {
    name: "wuauserv",
    displayName: "Windows Update",
    status: "running",
    startType: "manual",
    processId: 1764,
    canStop: true,
  },
  {
    name: "Spooler",
    displayName: "Print Spooler",
    status: "stopped",
    startType: "auto",
    processId: 0,
    canStop: true,
  },
  {
    name: "WinRM",
    displayName: "Windows Remote Management",
    status: "running",
    startType: "auto",
    processId: 3308,
    canStop: true,
  },
  {
    name: "BITS",
    displayName: "Background Intelligent Transfer Service",
    status: "stopped",
    startType: "manual",
    processId: 0,
    canStop: true,
  },
];

export function mockServices(): ServiceInfo[] {
  return serviceSeed;
}

export function mockInterfaces(): NetworkInterface[] {
  return [
    {
      name: "以太网",
      mac: "8C-16-45-A2-19-7F",
      ipv4: ["192.168.10.42"],
      ipv6: ["fe80::5d2f:71a2:88c1:9e34"],
      isLoopback: false,
      isUp: true,
      totalReceived: 84 * GB,
      totalTransmitted: 21 * GB,
    },
    {
      name: "WLAN",
      mac: "D4-3B-04-11-8E-6C",
      ipv4: ["10.8.0.6"],
      ipv6: [],
      isLoopback: false,
      isUp: true,
      totalReceived: 12 * GB,
      totalTransmitted: 3.2 * GB,
    },
    {
      name: "vEthernet (Default Switch)",
      mac: "00-15-5D-01-2A-0B",
      ipv4: ["172.29.112.1"],
      ipv6: [],
      isLoopback: false,
      isUp: true,
      totalReceived: 2.4 * GB,
      totalTransmitted: 1.1 * GB,
    },
  ];
}

export async function mockCheckPort(host: string, port: number): Promise<PortCheckResult> {
  await new Promise((resolve) => setTimeout(resolve, 420));
  const open = port === 443 || port === 22 || port === 5432 || port === 8080;
  return {
    host,
    port,
    open,
    latencyMs: Math.round(8 + Math.random() * 40),
    error: open ? null : "连接被拒绝 (os error 10061)",
  };
}

export async function mockResolve(host: string): Promise<DnsLookupResult> {
  await new Promise((resolve) => setTimeout(resolve, 260));
  return {
    host,
    addresses: ["140.82.112.4", "140.82.113.4", "140.82.114.4"],
    latencyMs: 32,
    error: null,
  };
}

export function mockAppInfo(): AppInfo {
  return {
    name: "青衫工具箱",
    version: "0.4.0",
    coreVersion: "0.4.0",
    buildProfile: "debug",
    platform: "windows-gnu",
    isElevated: true,
  };
}

const pluginSeed: PluginInfo[] = [
  {
    id: "qingshan.health-check",
    name: "健康巡检",
    version: "0.1.0",
    description: "基于当前采样检查内存、系统盘与权限状态。",
    author: "青衫工具箱",
    icon: "pulse",
    homepage: "https://github.com/DragonTsunami/qingshan-toolbox",
    tags: ["监控", "内置"],
    enabled: true,
    builtin: true,
    path: "C:\\Users\\青衫\\AppData\\Roaming\\com.qingshan.toolbox\\plugins\\qingshan.health-check\\plugin.json",
    widgets: [
      {
        id: "health",
        title: "今日健康巡检",
        kind: "health",
        body: "只读取概览快照，不产生额外系统调用。",
        items: [],
        links: [],
        health: {
          memoryMaxPercent: 85,
          systemDiskMaxPercent: 90,
          requireElevation: false,
        },
      },
    ],
  },
  {
    id: "qingshan.release-links",
    name: "版本与文档",
    version: "0.1.0",
    description: "把仓库、Release 与插件文档放到概览上。",
    author: "青衫工具箱",
    icon: "link",
    homepage: "https://github.com/DragonTsunami/qingshan-toolbox",
    tags: ["文档", "内置"],
    enabled: false,
    builtin: true,
    path: "C:\\Users\\青衫\\AppData\\Roaming\\com.qingshan.toolbox\\plugins\\qingshan.release-links\\plugin.json",
    widgets: [
      {
        id: "links",
        title: "项目入口",
        kind: "links",
        body: "从仓库、Release 和插件文档继续。",
        items: [],
        links: [
          {
            label: "GitHub 仓库",
            url: "https://github.com/DragonTsunami/qingshan-toolbox",
          },
          {
            label: "最新 Release",
            url: "https://github.com/DragonTsunami/qingshan-toolbox/releases/latest",
          },
          {
            label: "插件文档",
            url: "https://github.com/DragonTsunami/qingshan-toolbox/blob/main/docs/plugins.md",
          },
        ],
        health: null,
      },
    ],
  },
];

const optionalSeed: PluginInfo[] = [
  {
    id: "qingshan.disk-cleanup",
    name: "磁盘清理清单",
    version: "0.1.0",
    description: "把常见临时文件位置整理成巡检清单，打开目录后自行确认清理。",
    author: "青衫工具箱",
    icon: "shield",
    homepage: null,
    tags: ["运维", "清理"],
    enabled: false,
    builtin: false,
    path: "C:\\Users\\青衫\\AppData\\Roaming\\com.qingshan.toolbox\\plugins\\qingshan.disk-cleanup\\plugin.json",
    widgets: [
      {
        id: "cleanup",
        title: "磁盘清理清单",
        kind: "checklist",
        body: "只列出位置，不自动删除文件。",
        items: ["检查用户临时目录", "检查 Windows 更新缓存", "检查旧安装包"],
        links: [],
        health: null,
      },
    ],
  },
  {
    id: "qingshan.event-log",
    name: "事件日志入口",
    version: "0.1.0",
    description: "把 Windows 事件查看器与常用排障文档放到插件页。",
    author: "青衫工具箱",
    icon: "link",
    homepage: "https://learn.microsoft.com/windows-server/administration/windows-commands/wevtutil",
    tags: ["运维", "日志"],
    enabled: false,
    builtin: false,
    path: "C:\\Users\\青衫\\AppData\\Roaming\\com.qingshan.toolbox\\plugins\\qingshan.event-log\\plugin.json",
    widgets: [
      {
        id: "event-log-links",
        title: "事件日志入口",
        kind: "links",
        body: "打开事件查看器或查看微软官方文档。",
        items: [],
        links: [
          {
            label: "事件查看器文档",
            url: "https://learn.microsoft.com/windows-server/administration/windows-commands/eventvwr",
          },
          {
            label: "wevtutil 命令",
            url: "https://learn.microsoft.com/windows-server/administration/windows-commands/wevtutil",
          },
        ],
        health: null,
      },
    ],
  },
];

const pluginOverrides: Record<string, boolean> = {};
const installedOptional: PluginInfo[] = [];

function allPlugins(): PluginInfo[] {
  return [...pluginSeed, ...installedOptional];
}

export function mockPluginCatalog(): PluginCatalog {
  return {
    directory: "C:\\Users\\青衫\\AppData\\Roaming\\com.qingshan.toolbox\\plugins",
    plugins: allPlugins().map((plugin) => ({
      ...plugin,
      enabled: pluginOverrides[plugin.id] ?? plugin.enabled,
      tags: [...plugin.tags],
      widgets: plugin.widgets.map((widget) => ({
        ...widget,
        items: [...widget.items],
        links: widget.links.map((link) => ({ ...link })),
        health: widget.health ? { ...widget.health } : null,
      })),
    })),
    warnings: [],
  };
}

export async function mockSetPluginEnabled(
  id: string,
  enabled: boolean,
): Promise<PluginCatalog> {
  if (!allPlugins().some((plugin) => plugin.id === id)) {
    throw new Error(`未找到插件: ${id}`);
  }
  pluginOverrides[id] = enabled;
  return mockPluginCatalog();
}

export function mockPluginMarket(): PluginMarketEntry[] {
  const installed = new Set(allPlugins().map((plugin) => plugin.id));
  return [...pluginSeed, ...optionalSeed].map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    author: plugin.author,
    homepage: plugin.homepage,
    icon: plugin.icon,
    tags: [...plugin.tags],
    installed: installed.has(plugin.id),
    official: true,
  }));
}

export async function mockInstallPlugin(id: string): Promise<PluginCatalog> {
  const optional = optionalSeed.find((plugin) => plugin.id === id);
  if (!optional) {
    if (allPlugins().some((plugin) => plugin.id === id)) return mockPluginCatalog();
    throw new Error(`未找到插件: ${id}`);
  }
  if (!installedOptional.some((plugin) => plugin.id === id)) {
    installedOptional.push({
      ...optional,
      enabled: true,
      widgets: optional.widgets.map((widget) => ({
        ...widget,
        items: [...widget.items],
        links: widget.links.map((link) => ({ ...link })),
        health: widget.health ? { ...widget.health } : null,
      })),
    });
  }
  return mockPluginCatalog();
}

export async function mockInstallPluginFromPath(path: string): Promise<PluginCatalog> {
  if (!path.trim()) throw new Error("插件路径不能为空");
  const id = "local.demo";
  if (allPlugins().some((plugin) => plugin.id === id)) {
    throw new Error("插件 local.demo 已安装");
  }
  installedOptional.push({
    id,
    name: "本地示例插件",
    version: "0.1.0",
    description: `从 ${path.trim()} 安装的本地插件。`,
    author: "本地",
    icon: "note",
    homepage: null,
    tags: ["本地"],
    enabled: true,
    builtin: false,
    path: `${path.trim().replace(/[\\/]+$/, "")}\\plugin.json`,
    widgets: [
      {
        id: "local",
        title: "本地插件",
        kind: "note",
        body: "浏览器预览中的本地安装占位实现。",
        items: [],
        links: [],
        health: null,
      },
    ],
  });
  return mockPluginCatalog();
}

export async function mockRemovePlugin(id: string): Promise<PluginCatalog> {
  const index = installedOptional.findIndex((plugin) => plugin.id === id);
  if (index < 0) {
    if (pluginSeed.some((plugin) => plugin.id === id)) {
      throw new Error("内置插件不能移除");
    }
    throw new Error(`未找到插件: ${id}`);
  }
  installedOptional.splice(index, 1);
  delete pluginOverrides[id];
  return mockPluginCatalog();
}

export async function mockRescanPlugins(): Promise<PluginCatalog> {
  return mockPluginCatalog();
}

export function mockOpenPluginDirectory(): string {
  return mockPluginCatalog().directory;
}

const logSourceSeed: LogSource[] = [
  {
    id: "application",
    name: "应用程序",
    kind: "eventlog",
    description: "Windows Application 通道，含应用崩溃与安装事件",
    available: true,
  },
  {
    id: "system",
    name: "系统",
    kind: "eventlog",
    description: "Windows System 通道，含驱动、服务与内核事件",
    available: true,
  },
  {
    id: "security",
    name: "安全",
    kind: "eventlog",
    description: "Windows Security 通道，读取需要管理员权限",
    available: true,
  },
];

function logTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

const logSeed: LogEntry[] = [
  {
    id: "application-1000",
    timestamp: logTime(4),
    level: "error",
    channel: "Application",
    provider: "Application Error",
    eventId: 1000,
    message: "demo.exe · 0xc0000005 · 0x0000000000001234",
    computer: "OPS-WS-042",
    user: "S-1-5-21-1004",
    fields: [
      { name: "Faulting application", value: "demo.exe" },
      { name: "Exception code", value: "0xc0000005" },
      { name: "Fault offset", value: "0x0000000000001234" },
    ],
  },
  {
    id: "system-7036",
    timestamp: logTime(12),
    level: "information",
    channel: "System",
    provider: "Service Control Manager",
    eventId: 7036,
    message: "Docker Desktop Service 服务已进入正在运行状态。",
    computer: "OPS-WS-042",
    user: "S-1-5-18",
    fields: [
      { name: "Service", value: "Docker Desktop Service" },
      { name: "State", value: "running" },
    ],
  },
  {
    id: "system-7000",
    timestamp: logTime(28),
    level: "error",
    channel: "System",
    provider: "Service Control Manager",
    eventId: 7000,
    message: "Windows Update 服务启动失败，错误 1053。",
    computer: "OPS-WS-042",
    user: "S-1-5-18",
    fields: [
      { name: "Service", value: "wuauserv" },
      { name: "Error", value: "1053" },
    ],
  },
  {
    id: "application-1026",
    timestamp: logTime(41),
    level: "warning",
    channel: "Application",
    provider: ".NET Runtime",
    eventId: 1026,
    message: "托管运行时检测到未处理的异常，进程已终止。",
    computer: "OPS-WS-042",
    user: null,
    fields: [
      { name: "Application", value: "OpsAgent.exe" },
      { name: "Exception", value: "System.Net.Http.HttpRequestException" },
    ],
  },
  {
    id: "security-4624",
    timestamp: logTime(55),
    level: "information",
    channel: "Security",
    provider: "Microsoft-Windows-Security-Auditing",
    eventId: 4624,
    message: "已成功登录帐户。",
    computer: "OPS-WS-042",
    user: "S-1-5-21-1004",
    fields: [
      { name: "Logon type", value: "3" },
      { name: "Account", value: "OPS-WS-042\\ops" },
    ],
  },
  {
    id: "system-1074",
    timestamp: logTime(74),
    level: "information",
    channel: "System",
    provider: "User32",
    eventId: 1074,
    message: "系统已由用户启动关机流程。",
    computer: "OPS-WS-042",
    user: "S-1-5-21-1004",
    fields: [
      { name: "Process", value: "explorer.exe" },
      { name: "Reason", value: "其他 (计划内)" },
    ],
  },
  {
    id: "application-11707",
    timestamp: logTime(96),
    level: "verbose",
    channel: "Application",
    provider: "MsiInstaller",
    eventId: 11707,
    message: "产品 Qingshan Toolbox 安装成功。",
    computer: "OPS-WS-042",
    user: "S-1-5-21-1004",
    fields: [
      { name: "Product", value: "Qingshan Toolbox" },
      { name: "Version", value: "0.3.0" },
    ],
  },
  {
    id: "system-6008",
    timestamp: logTime(130),
    level: "warning",
    channel: "System",
    provider: "EventLog",
    eventId: 6008,
    message: "上一次系统关机是意外的。",
    computer: "OPS-WS-042",
    user: null,
    fields: [{ name: "Last shutdown", value: "2026-10-29T22:31:12Z" }],
  },
];

export function mockLogSources(): LogSource[] {
  return logSourceSeed;
}

export function mockQueryLogs(query: LogQuery): LogBatch {
  const keyword = query.keyword.trim().toLowerCase();
  const matched = logSeed.filter(
    (entry) =>
      (!query.level || entry.level === query.level) &&
      (!keyword ||
        [entry.message, entry.provider, entry.channel, entry.computer, String(entry.eventId)]
          .join(" ")
          .toLowerCase()
          .includes(keyword)),
  );
  const entries = matched.slice(0, query.limit);
  return {
    source: query.source,
    entries,
    scanned: logSeed.length,
    total: matched.length,
    truncated: matched.length > entries.length,
  };
}

export function mockExportLogs(entries: LogEntry[]): LogExport {
  if (entries.length === 0) throw new Error("没有可导出的日志");
  return {
    path: `C:\\Users\\青衫\\Downloads\\qingshan-logs-${Date.now()}.csv`,
    count: entries.length,
  };
}
