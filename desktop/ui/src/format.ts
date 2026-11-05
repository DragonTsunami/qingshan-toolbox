export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : digits)} ${units[index]}`;
}

function getStoredLang(): "zh-CN" | "en-US" {
  if (typeof window === "undefined") return "zh-CN";
  try {
    const s = localStorage.getItem("opsdeck.language");
    return s === "en-US" ? "en-US" : "zh-CN";
  } catch {
    return "zh-CN";
  }
}

export function formatUptime(seconds: number, lang?: "zh-CN" | "en-US"): string {
  const currentLang = lang || getStoredLang();
  if (!Number.isFinite(seconds) || seconds <= 0) return currentLang === "en-US" ? "Unknown" : "未知";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (currentLang === "en-US") {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} mins`;
  }

  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分钟`;
}

export function formatTimestamp(unixSeconds: number, lang?: "zh-CN" | "en-US"): string {
  if (!unixSeconds) return "—";
  const currentLang = lang || getStoredLang();
  return new Date(unixSeconds * 1000).toLocaleString(currentLang === "en-US" ? "en-US" : "zh-CN", {
    hour12: false,
  });
}

export function ratio(used: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}
