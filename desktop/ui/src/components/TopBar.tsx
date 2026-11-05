import { ClockCircleOutlined, DesktopOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Select, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { REFRESH_INTERVALS } from "../preferences";
import type { SystemSnapshot } from "../types";
import { useI18n } from "../i18n";

interface TopBarProps {
  title: string;
  subtitle: string;
  snapshot: SystemSnapshot | null;
  refreshing: boolean;
  refreshInterval: number;
  onRefreshIntervalChange: (seconds: number) => void;
  onRefresh: () => void;
}

export default function TopBar({
  title,
  subtitle,
  snapshot,
  refreshing,
  refreshInterval,
  onRefreshIntervalChange,
  onRefresh,
}: TopBarProps) {
  const { t, language } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <div className="topbar-eyebrow">QINGSHAN / {title}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <div className="host-pill">
          <span className="host-dot" />
          <DesktopOutlined />
          <span className="host-name">{snapshot?.hostname ?? t("topbar.connecting")}</span>
          <span className="host-time">
            {now.toLocaleTimeString(language, { hour12: false, hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <Tooltip title={t("topbar.refreshInterval")}>
          <div className="refresh-interval">
            <ClockCircleOutlined />
            <Select
              aria-label={t("topbar.refreshInterval")}
              variant="borderless"
              value={refreshInterval}
              onChange={onRefreshIntervalChange}
              options={REFRESH_INTERVALS.map((seconds) => ({
                value: seconds,
                label: `${seconds} ${t("topbar.seconds")}`,
              }))}
              popupMatchSelectWidth={false}
            />
          </div>
        </Tooltip>
        <Tooltip title={t("topbar.refreshTooltip")}>
          <Button
            className="refresh-button"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={onRefresh}
            loading={false}
          >
            {t("topbar.refresh")}
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
