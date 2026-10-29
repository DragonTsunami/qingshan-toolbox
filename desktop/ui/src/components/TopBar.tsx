import { ClockCircleOutlined, DesktopOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Select, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { REFRESH_INTERVALS } from "../preferences";
import type { SystemSnapshot } from "../types";

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
          <span className="host-name">{snapshot?.hostname ?? "正在连接本机"}</span>
          <span className="host-time">
            {now.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <Tooltip title="概览与进程页的自动刷新间隔">
          <div className="refresh-interval">
            <ClockCircleOutlined />
            <Select
              aria-label="自动刷新间隔"
              variant="borderless"
              value={refreshInterval}
              onChange={onRefreshIntervalChange}
              options={REFRESH_INTERVALS.map((seconds) => ({
                value: seconds,
                label: `${seconds} 秒`,
              }))}
              popupMatchSelectWidth={false}
            />
          </div>
        </Tooltip>
        <Tooltip title="重新采集本机数据">
          <Button
            className="refresh-button"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={onRefresh}
            loading={false}
          >
            刷新
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
