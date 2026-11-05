import {
  AppstoreAddOutlined,
  AppstoreOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HeartOutlined,
  ReadOutlined,
  RocketOutlined,
  SafetyCertificateFilled,
  SettingOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import appIcon from "../assets/app-icon.png";
import type { AppInfo, PageKey, SystemSnapshot } from "../types";
import { useI18n } from "../i18n";

interface SidebarProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  snapshot: SystemSnapshot | null;
  info: AppInfo | null;
  onElevate: () => void;
}

export default function Sidebar({ page, onNavigate, snapshot, info, onElevate }: SidebarProps) {
  const { t } = useI18n();
  const elevated = snapshot?.isElevated ?? info?.isElevated ?? false;

  const navItems: Array<{ key: PageKey; label: string; icon: React.ReactNode; hint: string }> = [
    { key: "plugins", label: t("nav.plugins"), icon: <AppstoreAddOutlined />, hint: t("nav.pluginsHint") },
    { key: "knowledge", label: t("nav.knowledge"), icon: <ReadOutlined />, hint: t("nav.knowledgeHint") },
    { key: "overview", label: t("nav.overview"), icon: <DashboardOutlined />, hint: t("nav.overviewHint") },
    { key: "diagnostics", label: t("nav.diagnostics"), icon: <HeartOutlined />, hint: t("nav.diagnosticsHint") },
    { key: "processes", label: t("nav.processes"), icon: <DeploymentUnitOutlined />, hint: t("nav.processesHint") },
    { key: "services", label: t("nav.services"), icon: <ClusterOutlined />, hint: t("nav.servicesHint") },
    { key: "network", label: t("nav.network"), icon: <GlobalOutlined />, hint: t("nav.networkHint") },
    { key: "logs", label: t("nav.logs"), icon: <FileTextOutlined />, hint: t("nav.logsHint") },
    { key: "cleanup", label: t("nav.cleanup"), icon: <DeleteOutlined />, hint: t("nav.cleanupHint") },
    { key: "startup", label: t("nav.startup"), icon: <RocketOutlined />, hint: t("nav.startupHint") },
    { key: "software", label: t("nav.software"), icon: <AppstoreOutlined />, hint: t("nav.softwareHint") },
    { key: "settings", label: t("nav.settings"), icon: <SettingOutlined />, hint: t("nav.settingsHint") },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img src={appIcon} alt={t("brand.name")} />
        </div>
        <div className="brand-text">
          <span className="brand-name">{t("brand.name")}</span>
          <span className="brand-caption">{t("brand.caption")}</span>
        </div>
      </div>

      <div className="nav-section-label">{t("brand.workbench")}</div>
      <nav className="nav">
        {navItems.map((item) => (
          <Tooltip key={item.key} title={item.hint} placement="right" mouseEnterDelay={0.5}>
            <button
              type="button"
              className={`nav-item${page === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          </Tooltip>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className={`elevation-card${elevated ? " elevated" : ""}`}>
        <div className="elevation-head">
          <SafetyCertificateFilled />
          <span>{elevated ? t("nav.adminPrivilege") : t("nav.standardUser")}</span>
        </div>
        <p>{elevated ? t("nav.adminDesc") : t("nav.standardDesc")}</p>
        {!elevated && (
          <Button size="small" block icon={<ThunderboltFilled />} onClick={onElevate}>
            {t("nav.relaunchAdmin")}
          </Button>
        )}
      </div>

      <div className="sidebar-footer">
        <span>v{info?.version ?? "1.1.1"}</span>
        <span className="footer-dot" />
        <span>Rust · Tauri</span>
      </div>
    </aside>
  );
}
