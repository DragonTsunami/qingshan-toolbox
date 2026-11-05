import { useEffect, useMemo, useState } from "react";
import { Alert, App as AntApp, Button, Empty, Input, Modal, Skeleton, Tooltip } from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { openAppsFeatures, softwareList, uninstallSoftware } from "../api";
import { useI18n } from "../i18n";
import type { InstalledApp, SoftwareKind } from "../types";
import "../maintenance.css";

export default function SoftwarePage() {
  const { message } = AntApp.useApp();
  const { t, language } = useI18n();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [kind, setKind] = useState<SoftwareKind>("application");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uninstallTarget, setUninstallTarget] = useState<InstalledApp | null>(null);
  const [uninstalling, setUninstalling] = useState(false);

  const kindMeta: Record<SoftwareKind, { label: string; hint: string }> = useMemo(() => ({
    application: {
      label: t("软件"),
      hint:
        language === "en-US"
          ? "Standalone applications with uninstallation entries in registry, such as browsers, tools, and office suites."
          : "可独立运行、注册表提供卸载入口的应用程序，例如浏览器、开发工具、办公软件。",
    },
    driver: {
      label: t("驱动"),
      hint:
        language === "en-US"
          ? "Hardware drivers and device management tools, such as GPU, chipset, audio, and network drivers."
          : "硬件驱动及其管理工具，例如显卡、芯片组、网络、音频、蓝牙驱动。",
    },
    runtime: {
      label: t("运行库"),
      hint:
        language === "en-US"
          ? "Shared runtime environments and dependencies such as .NET, VC++, WebView2, and Java."
          : "供其他程序依赖的运行环境与共享组件，例如 .NET、VC++、WebView2、Java。",
    },
    other: {
      label: t("其他"),
      hint:
        language === "en-US"
          ? "Items without standard uninstaller commands. Use Windows Apps & Features to modify or remove."
          : "注册表没有卸载命令的项目，无法从这里启动卸载；请使用 Windows「应用和功能」或厂商工具处理。",
    },
  }), [t, language]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setApps(await softwareList());
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const confirmUninstall = async () => {
    if (!uninstallTarget) return;
    setUninstalling(true);
    try {
      await uninstallSoftware(uninstallTarget.id);
      setUninstallTarget(null);
      message.success(
        language === "en-US"
          ? "Uninstaller launched. Please refresh list when completed."
          : "已启动卸载程序，完成后请刷新列表"
      );
    } catch (cause) {
      message.error(String(cause));
    } finally {
      setUninstalling(false);
    }
  };

  const keyword = search.trim().toLowerCase();
  const applicationCount = apps.filter((app) => app.kind === "application").length;
  const driverCount = apps.filter((app) => app.kind === "driver").length;
  const runtimeCount = apps.filter((app) => app.kind === "runtime").length;
  const otherCount = apps.filter((app) => app.kind === "other").length;
  const sectionApps = useMemo(
    () => apps.filter((app) => app.kind === kind),
    [apps, kind],
  );
  const filtered = useMemo(
    () =>
      sectionApps.filter(
        (app) =>
          !keyword ||
          app.name.toLowerCase().includes(keyword) ||
          app.publisher.toLowerCase().includes(keyword) ||
          app.version.toLowerCase().includes(keyword),
      ),
    [sectionApps, keyword],
  );
  const kindName = kindMeta[kind].label;

  return (
    <div className="page-stack maintenance-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("软件与驱动")}</h2>
            <p>
              {language === "en-US"
                ? "Applications, drivers, runtimes, and other packages; uninstallation launches vendor uninstaller."
                : "软件、驱动、运行库和其他分开展示；卸载会调用程序自带的卸载器。"}
            </p>
          </div>
          <div className="panel-actions">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={
                language === "en-US"
                  ? `Search ${kindName}, publisher or version`
                  : `搜索${kindName}、发布者或版本`
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              {t("刷新")}
            </Button>
            <Button
              type="primary"
              icon={<AppstoreOutlined />}
              onClick={() => void openAppsFeatures().catch((cause) => setError(String(cause)))}
            >
              {language === "en-US" ? "Open Apps & Features" : "打开应用和功能"}
            </Button>
          </div>
        </div>

        {error && <Alert type="error" showIcon message={language === "en-US" ? "Read Failed" : "读取失败"} description={error} />}

        <div className="software-tabs" role="tablist" aria-label={t("软件与驱动")}>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "application"}
            className={kind === "application" ? "software-tab active" : "software-tab"}
            onClick={() => setKind("application")}
            title={kindMeta.application.hint}
          >
            {t("软件")} <span className="software-tab-count">{applicationCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "driver"}
            className={kind === "driver" ? "software-tab active" : "software-tab"}
            onClick={() => setKind("driver")}
            title={kindMeta.driver.hint}
          >
            {t("驱动")} <span className="software-tab-count">{driverCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "runtime"}
            className={kind === "runtime" ? "software-tab active" : "software-tab"}
            onClick={() => setKind("runtime")}
            title={kindMeta.runtime.hint}
          >
            {t("运行库")} <span className="software-tab-count">{runtimeCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "other"}
            className={kind === "other" ? "software-tab active" : "software-tab"}
            onClick={() => setKind("other")}
            title={kindMeta.other.hint}
          >
            {t("其他")} <span className="software-tab-count">{otherCount}</span>
          </button>
        </div>

        <div className="software-kind-hint">
          <InfoCircleOutlined />
          <span>{kindMeta[kind].hint}</span>
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : filtered.length === 0 ? (
          <Empty
            description={
              keyword
                ? (language === "en-US" ? `No matching ${kindName}` : `没有匹配的${kindName}`)
                : (language === "en-US" ? `No installed ${kindName} found` : `未发现已安装的${kindName}`)
            }
          />
        ) : (
          <div className="software-grid">
            {filtered.map((app) => (
              <article
                className="software-card"
                key={app.id}
                title={app.installLocation || app.name}
              >
                <div className="software-card-head">
                  <SoftwareIcon app={app} />
                  <div className="software-heading">
                    <strong title={app.name}>{app.name}</strong>
                    <span title={app.publisher}>{app.publisher || (language === "en-US" ? "Unknown Publisher" : "未知发布者")}</span>
                  </div>
                </div>
                <div className="software-facts">
                  <div className="software-fact">
                    <span>{language === "en-US" ? "Version" : "当前版本"}</span>
                    <strong>{app.version || "—"}</strong>
                  </div>
                  <div className="software-fact">
                    <span>{language === "en-US" ? "Last Used" : "最近使用"}</span>
                    <strong>{formatLastUsed(app.lastUsed, language)}</strong>
                  </div>
                  <div className="software-location">
                    <span>{language === "en-US" ? "Install Path" : "安装位置"}</span>
                    <span className="software-location-path" title={app.installLocation || (language === "en-US" ? "Not recorded" : "未记录")}>
                      {app.installLocation || (language === "en-US" ? "Not recorded" : "未记录")}
                    </span>
                  </div>
                  <div className="software-fact">
                    <span>{language === "en-US" ? "Install Date" : "安装日期"}</span>
                    <strong>{formatDate(app.installDate)}</strong>
                  </div>
                </div>
                <div className="software-foot">
                  <span>
                    {app.registryView || "—"}-bit ·{" "}
                    {app.scope === "user"
                      ? (language === "en-US" ? "Current User" : "当前用户")
                      : (language === "en-US" ? "All Users" : "所有用户")}
                  </span>
                  {app.uninstallString ? (
                    <Tooltip title={language === "en-US" ? "Launch vendor uninstaller" : "启动程序自带卸载器"}>
                      <span>
                        <Button
                          size="middle"
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          className="software-uninstall"
                          onClick={() => setUninstallTarget(app)}
                        >
                          {t("卸载")}
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Tooltip title={language === "en-US" ? "Please use Windows Apps & Features or vendor tools" : "请使用 Windows「应用和功能」或厂商工具"}>
                      <span className="software-no-uninstall">{language === "en-US" ? "No Uninstaller" : "无卸载命令"}</span>
                    </Tooltip>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="maint-footnote">
          {kind === "other"
            ? (language === "en-US"
              ? `Total ${sectionApps.length} other items, showing ${filtered.length}. These packages provide no quiet uninstallation command; manage them in Windows Apps & Features.`
              : `共 ${sectionApps.length} 个其他项目，当前显示 ${filtered.length} 个。这些项目未提供卸载命令，请使用 Windows「应用和功能」或厂商工具处理。`)
            : (language === "en-US"
              ? `Total ${sectionApps.length} ${kindName}, showing ${filtered.length}. Uninstallation invokes the vendor uninstaller and may prompt for administrator credentials.`
              : `共 ${sectionApps.length} 个${kindName}，当前显示 ${filtered.length} 个。最近使用来自 Windows UserAssist 或程序文件访问时间，系统未记录时显示「未记录」。卸载会调用程序自带的卸载器，可能需要管理员权限；完成后请刷新列表。`)}
        </div>
      </section>

      <Modal
        open={uninstallTarget !== null}
        title={uninstallTarget ? (language === "en-US" ? `Uninstall ${uninstallTarget.name}` : `卸载 ${uninstallTarget.name}`) : (language === "en-US" ? "Uninstall Software" : "卸载软件")}
        okText={language === "en-US" ? "Launch Uninstaller" : "启动卸载"}
        cancelText={t("取消")}
        okButtonProps={{ danger: true, loading: uninstalling }}
        onOk={() => void confirmUninstall()}
        onCancel={() => setUninstallTarget(null)}
      >
        <p>
          {language === "en-US"
            ? `Will launch ${uninstallTarget?.name}'s vendor uninstaller. Administrative elevation may be required. Qingshan Toolbox will not delete files directly.`
            : `将启动 ${uninstallTarget?.name} 自带的卸载程序。卸载可能需要管理员权限，青衫工具箱不会直接删除文件。`}
        </p>
      </Modal>
    </div>
  );
}

function SoftwareIcon({ app }: { app: InstalledApp }) {
  const [failed, setFailed] = useState(false);
  if (app.icon && !failed) {
    return (
      <span className="software-icon software-icon-image">
        <img src={app.icon} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return <span className="software-icon">{app.name.slice(0, 1).toUpperCase()}</span>;
}

function formatLastUsed(seconds?: number | null, lang?: string): string {
  const isEn = lang === "en-US";
  if (!seconds) return isEn ? "Not recorded" : "未记录";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 3600) return isEn ? "< 1h ago" : "1 小时内";
  if (diff < 86_400) return isEn ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86_400 * 30) return isEn ? `${Math.floor(diff / 86_400)}d ago` : `${Math.floor(diff / 86_400)} 天前`;
  if (diff < 86_400 * 365) return isEn ? `${Math.floor(diff / (86_400 * 30))}mo ago` : `${Math.floor(diff / (86_400 * 30))} 个月前`;
  return isEn ? `${Math.floor(diff / (86_400 * 365))}y ago` : `${Math.floor(diff / (86_400 * 365))} 年前`;
}

function formatDate(value: string): string {
  if (!value || value.length !== 8) return value || "—";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
