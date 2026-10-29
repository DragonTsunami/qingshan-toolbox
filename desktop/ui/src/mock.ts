import type {
  AppInfo,
  DnsLookupResult,
  NetworkInterface,
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
    version: "0.2.0",
    coreVersion: "0.2.0",
    buildProfile: "debug",
    platform: "windows-gnu",
    isElevated: true,
  };
}
