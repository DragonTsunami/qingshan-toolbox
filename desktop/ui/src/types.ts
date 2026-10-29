export interface DiskInfo {
  name: string;
  mountPoint: string;
  fileSystem: string;
  total: number;
  available: number;
  removable: boolean;
}

export interface SystemSnapshot {
  hostname: string;
  osName: string;
  osVersion: string;
  kernelVersion: string;
  arch: string;
  uptimeSecs: number;
  bootTime: number;
  cpuBrand: string;
  physicalCores: number;
  logicalCores: number;
  cpuUsage: number;
  perCoreUsage: number[];
  memoryTotal: number;
  memoryUsed: number;
  swapTotal: number;
  swapUsed: number;
  disks: DiskInfo[];
  isElevated: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  exe: string | null;
  command: string;
  cpuUsage: number;
  memory: number;
  virtualMemory: number;
  status: string;
  user: string | null;
  startTime: number;
}

export type ServiceStatus =
  | "running"
  | "stopped"
  | "startpending"
  | "stoppending"
  | "paused"
  | "pausepending"
  | "continuepending"
  | "unknown";

export type ServiceAction = "start" | "stop" | "restart";

export interface ServiceInfo {
  name: string;
  displayName: string;
  status: ServiceStatus;
  startType: string;
  processId: number;
  canStop: boolean;
}

export interface NetworkInterface {
  name: string;
  mac: string;
  ipv4: string[];
  ipv6: string[];
  isLoopback: boolean;
  isUp: boolean;
  totalReceived: number;
  totalTransmitted: number;
}

export interface PortCheckResult {
  host: string;
  port: number;
  open: boolean;
  latencyMs: number;
  error: string | null;
}

export interface DnsLookupResult {
  host: string;
  addresses: string[];
  latencyMs: number;
  error: string | null;
}

export interface AppInfo {
  name: string;
  version: string;
  coreVersion: string;
  buildProfile: string;
  platform: string;
  isElevated: boolean;
}

export type PluginWidgetKind = "note" | "checklist" | "links" | "health";

export interface PluginLink {
  label: string;
  url: string;
}

export interface PluginHealthRule {
  memoryMaxPercent: number;
  systemDiskMaxPercent: number;
  requireElevation: boolean;
}

export interface PluginWidget {
  id: string;
  title: string;
  kind: PluginWidgetKind;
  body: string;
  items: string[];
  links: PluginLink[];
  health: PluginHealthRule | null;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string | null;
  homepage: string | null;
  enabled: boolean;
  builtin: boolean;
  path: string;
  widgets: PluginWidget[];
}

export interface PluginCatalog {
  directory: string;
  plugins: PluginInfo[];
  warnings: string[];
}

export type PageKey = "overview" | "processes" | "services" | "network" | "settings";
