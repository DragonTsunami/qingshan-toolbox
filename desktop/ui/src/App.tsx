import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfigProvider, App as AntApp, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import PluginsPage from "./pages/Plugins";
import OverviewPage from "./pages/Overview";
import ProcessesPage from "./pages/Processes";
import ServicesPage from "./pages/Services";
import NetworkPage from "./pages/Network";
import SettingsPage from "./pages/Settings";
import { appInfo, relaunchAsAdmin, setWindowTheme, systemSnapshot } from "./api";
import {
  loadRefreshInterval,
  normalizeRefreshInterval,
  saveRefreshInterval,
  type RefreshInterval,
} from "./preferences";
import type { AppInfo, PageKey, SystemSnapshot } from "./types";

const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  plugins: { title: "插件", subtitle: "声明式扩展工作台能力" },
  overview: { title: "概览", subtitle: "本机健康状态与关键指标" },
  processes: { title: "进程管理", subtitle: "查看资源占用并安全地结束进程" },
  services: { title: "服务管理", subtitle: "控制系统服务的启动、停止与重启" },
  network: { title: "网络诊断", subtitle: "接口、端口连通性与 DNS 解析" },
  settings: { title: "设置", subtitle: "应用信息、权限与后续能力" },
};

const PAGE_KEYS = Object.keys(PAGE_META) as PageKey[];

function pageFromHash(): PageKey {
  if (typeof window === "undefined") return "overview";
  const key = window.location.hash.replace(/^#\/?/, "") as PageKey;
  return PAGE_KEYS.includes(key) ? key : "overview";
}

function initialDark(): boolean {
  if (typeof window === "undefined") return false;
  const override = new URLSearchParams(window.location.search).get("theme");
  if (override === "dark") return true;
  if (override === "light") return false;
  const stored = localStorage.getItem("opsdeck.theme");
  if (stored) return stored === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function App() {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [dark, setDark] = useState(initialDark);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(loadRefreshInterval);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (window.location.hash !== `#${page}`) {
      window.history.replaceState(null, "", `#${page}`);
    }
  }, [page]);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("opsdeck.theme", dark ? "dark" : "light");
    void setWindowTheme(dark).catch(() => undefined);
  }, [dark]);

  useEffect(() => {
    saveRefreshInterval(refreshInterval);
  }, [refreshInterval]);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const [nextSnapshot, nextInfo] = await Promise.all([systemSnapshot(), appInfo()]);
      setSnapshot(nextSnapshot);
      setInfo(nextInfo);
    } catch (error) {
      console.error("刷新失败", error);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, refreshInterval * 1000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshInterval]);

  const elevate = async () => {
    try {
      await relaunchAsAdmin();
    } catch (error) {
      alert(String(error));
    }
  };

  const pageContent = useMemo(() => {
    switch (page) {
      case "plugins":
        return <PluginsPage snapshot={snapshot} />;
      case "processes":
        return <ProcessesPage refreshInterval={refreshInterval} />;
      case "services":
        return <ServicesPage elevated={snapshot?.isElevated ?? false} />;
      case "network":
        return <NetworkPage />;
      case "settings":
        return (
          <SettingsPage
            info={info}
            snapshot={snapshot}
            dark={dark}
            onToggleTheme={() => setDark((value) => !value)}
            onElevate={elevate}
          />
        );
      case "overview":
      default:
        return (
          <OverviewPage
            snapshot={snapshot}
            onNavigate={setPage}
            onRefresh={refresh}
            refreshing={refreshing}
          />
        );
    }
  }, [page, snapshot, info, dark, refreshing, refresh, refreshInterval]);

  const ink = dark ? "#f9fafb" : "#0f1115";
  const onInk = dark ? "#353638" : "#ffffff";
  const accent = dark ? "#7aaaff" : "#4176e6";
  const border = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: accent,
          colorInfo: accent,
          colorLink: accent,
          colorSuccess: "#22c55e",
          colorWarning: "#f59e0b",
          colorError: dark ? "#f25a5a" : "#ec1313",
          colorBgBase: dark ? "#151517" : "#ffffff",
          colorBgContainer: dark ? "#232324" : "#ffffff",
          colorBgElevated: dark ? "#2c2c2e" : "#ffffff",
          colorBgLayout: dark ? "#151517" : "#ffffff",
          colorBorder: border,
          colorBorderSecondary: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
          colorText: dark ? "#f9fafb" : "#0f1115",
          colorTextSecondary: dark ? "#cfd3d6" : "#61666b",
          colorTextTertiary: dark ? "#adb2b8" : "#81858c",
          colorTextQuaternary: dark ? "#81858c" : "#adb2b8",
          colorTextLightSolid: onInk,
          colorFillSecondary: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
          colorFillTertiary: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          borderRadius: 10,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          controlHeight: 36,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          boxShadowSecondary: "0 8px 24px rgba(16,24,40,0.08)",
        },
        components: {
          Button: {
            colorPrimary: ink,
            colorPrimaryHover: dark ? "#ebeef2" : "#292929",
            colorPrimaryActive: dark ? "#cfd3d6" : "#000000",
            primaryColor: onInk,
            defaultBg: dark ? "#232324" : "#f5f6f7",
            defaultBorderColor: "transparent",
            defaultColor: dark ? "#f9fafb" : "#0f1115",
            defaultHoverBg: dark ? "#2c2c2e" : "#ebeef2",
            defaultHoverBorderColor: "transparent",
            defaultHoverColor: dark ? "#f9fafb" : "#0f1115",
            fontWeight: 500,
            primaryShadow: "none",
            defaultShadow: "none",
            dangerShadow: "none",
          },
          Table: {
            headerBg: dark ? "#1b1b1c" : "#f9fafb",
            headerColor: dark ? "#adb2b8" : "#81858c",
            headerSplitColor: "transparent",
            rowHoverBg: dark ? "#2c2c2e" : "#f9fafb",
            borderColor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
            cellPaddingBlock: 11,
          },
          Input: {
            colorBgContainer: dark ? "#232324" : "#f5f6f7",
            activeBorderColor: accent,
            hoverBorderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
            activeShadow: `0 0 0 3px ${accent}1f`,
          },
          Segmented: {
            trackBg: dark ? "#1b1b1c" : "#f5f6f7",
            itemSelectedBg: dark ? "#353638" : "#ffffff",
            itemColor: dark ? "#adb2b8" : "#61666b",
            itemSelectedColor: dark ? "#f9fafb" : "#0f1115",
            itemHoverColor: dark ? "#f9fafb" : "#0f1115",
            trackPadding: 2,
          },
          Tag: {
            defaultBg: dark ? "#2c2c2e" : "#f5f6f7",
            defaultColor: dark ? "#cfd3d6" : "#61666b",
          },
          Modal: {
            contentBg: dark ? "#232324" : "#ffffff",
            headerBg: dark ? "#232324" : "#ffffff",
          },
          Tooltip: {
            colorBgSpotlight: dark ? "#f9fafb" : "#0f1115",
            colorTextLightSolid: dark ? "#151517" : "#ffffff",
          },
        },
      }}
    >
      <AntApp>
        <div className="app-shell">
          <Sidebar
            page={page}
            onNavigate={setPage}
            snapshot={snapshot}
            info={info}
            onElevate={elevate}
          />
          <div className="app-main">
            <TopBar
              title={PAGE_META[page].title}
              subtitle={PAGE_META[page].subtitle}
              snapshot={snapshot}
              refreshing={refreshing}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={(seconds) =>
                setRefreshInterval(normalizeRefreshInterval(seconds))
              }
              onRefresh={refresh}
            />
            <main className="app-content">{pageContent}</main>
          </div>
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
