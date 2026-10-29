import {
  AppstoreOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  GlobalOutlined,
  SafetyCertificateFilled,
  SettingOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import type { AppInfo, PageKey, SystemSnapshot } from "../types";

interface SidebarProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  snapshot: SystemSnapshot | null;
  info: AppInfo | null;
  onElevate: () => void;
}

const NAV_ITEMS: Array<{ key: PageKey; label: string; icon: React.ReactNode; hint: string }> = [
  { key: "overview", label: "概览", icon: <AppstoreOutlined />, hint: "健康状态" },
  { key: "processes", label: "进程管理", icon: <DeploymentUnitOutlined />, hint: "资源与终止" },
  { key: "services", label: "服务管理", icon: <ClusterOutlined />, hint: "启停与重启" },
  { key: "network", label: "网络诊断", icon: <GlobalOutlined />, hint: "端口与 DNS" },
  { key: "settings", label: "设置", icon: <SettingOutlined />, hint: "权限与关于" },
];

export default function Sidebar({ page, onNavigate, snapshot, info, onElevate }: SidebarProps) {
  const elevated = snapshot?.isElevated ?? info?.isElevated ?? false;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">&gt;_</div>
        <div className="brand-text">
          <span className="brand-name">青衫工具箱</span>
          <span className="brand-caption">QINGSHAN TOOLBOX</span>
        </div>
      </div>

      <div className="nav-section-label">工作台</div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
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
          <span>{elevated ? "管理员权限" : "标准用户"}</span>
        </div>
        <p>
          {elevated
            ? "可执行服务启停、进程终止等系统级操作。"
            : "部分运维操作需要管理员权限才能执行。"}
        </p>
        {!elevated && (
          <Button size="small" block icon={<ThunderboltFilled />} onClick={onElevate}>
            以管理员身份重启
          </Button>
        )}
      </div>

      <div className="sidebar-footer">
        <span>v{info?.version ?? "0.2.0"}</span>
        <span className="footer-dot" />
        <span>Rust · Tauri</span>
      </div>
    </aside>
  );
}
