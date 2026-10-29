import { ArrowRightOutlined, CloudServerOutlined, DashboardOutlined } from "@ant-design/icons";
import { Button, Progress, Skeleton, Tag, Tooltip } from "antd";
import PluginPanel from "../components/PluginPanel";
import type { PageKey, SystemSnapshot } from "../types";
import { formatBytes, formatUptime, ratio } from "../format";

interface OverviewProps {
  snapshot: SystemSnapshot | null;
  onNavigate: (page: PageKey) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function usageColor(value: number): string {
  if (value >= 85) return "var(--danger)";
  if (value >= 65) return "var(--warning)";
  return "var(--accent)";
}

export default function OverviewPage({ snapshot, onNavigate, onRefresh, refreshing }: OverviewProps) {
  if (!snapshot) {
    return (
      <div className="page-grid">
        <Skeleton active paragraph={{ rows: 6 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const memoryPercent = ratio(snapshot.memoryUsed, snapshot.memoryTotal);
  const swapPercent = ratio(snapshot.swapUsed, snapshot.swapTotal);
  const systemDisk =
    snapshot.disks.find((disk) => /^c:\\/i.test(disk.mountPoint)) ??
    snapshot.disks.find((disk) => disk.mountPoint.startsWith("C:")) ??
    snapshot.disks[0];
  const primaryDisk =
    systemDisk ??
    [...snapshot.disks].sort(
      (a, b) => ratio(b.total - b.available, b.total) - ratio(a.total - a.available, a.total),
    )[0];
  const diskPercent = primaryDisk ? ratio(primaryDisk.total - primaryDisk.available, primaryDisk.total) : 0;
  const maxCore = Math.max(...snapshot.perCoreUsage, 1);

  return (
    <div className="overview">
      <section className="hero-panel">
        <div className="hero-main">
          <div className="status-line">
            <span className="pulse" />
            SYSTEM ONLINE
            <span className="status-separator" />
            {snapshot.isElevated ? "具备管理员权限" : "标准用户会话"}
          </div>
          <h2>{snapshot.hostname}</h2>
          <p className="hero-subtitle">
            {snapshot.osName} · {snapshot.osVersion} · {snapshot.arch.toUpperCase()}
          </p>
          <div className="hero-tags">
            <Tag bordered={false}>已运行 {formatUptime(snapshot.uptimeSecs)}</Tag>
            <Tag bordered={false}>内核 {snapshot.kernelVersion}</Tag>
            <Tag bordered={false} className={snapshot.isElevated ? "tag-ok" : "tag-warn"}>
              <span className="tag-dot" />
              {snapshot.isElevated ? "Administrator" : "Standard user"}
            </Tag>
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-ring">
            <Progress
              type="dashboard"
              percent={Math.round(snapshot.cpuUsage)}
              size={136}
              strokeColor="#4176e6"
              trailColor="rgba(127,133,140,0.14)"
              format={(percent) => (
                <span className="ring-value">
                  {percent}
                  <small>%</small>
                </span>
              )}
            />
            <span className="ring-label">CPU 负载</span>
          </div>
          <div className="hero-actions">
            <Button icon={<DashboardOutlined />} onClick={onRefresh} loading={refreshing}>
              刷新指标
            </Button>
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => onNavigate("processes")}>
              进入进程
            </Button>
          </div>
        </div>
      </section>

      <div className="metric-row">
        <article className="metric-card">
          <div className="metric-head">
            <span className="metric-label">处理器</span>
            <span className="metric-badge">CPU</span>
          </div>
          <div className="metric-value">
            {snapshot.cpuUsage.toFixed(1)}
            <small>%</small>
          </div>
          <Progress percent={snapshot.cpuUsage} showInfo={false} strokeColor={usageColor(snapshot.cpuUsage)} />
          <div className="metric-foot">
            <span>{snapshot.cpuBrand}</span>
            <span>
              {snapshot.physicalCores}C / {snapshot.logicalCores}T
            </span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-head">
            <span className="metric-label">内存</span>
            <span className="metric-badge">RAM</span>
          </div>
          <div className="metric-value">
            {formatBytes(snapshot.memoryUsed)}
            <small className="metric-total">/ {formatBytes(snapshot.memoryTotal)}</small>
          </div>
          <Progress percent={memoryPercent} showInfo={false} strokeColor={usageColor(memoryPercent)} />
          <div className="metric-foot">
            <span>可用 {formatBytes(snapshot.memoryTotal - snapshot.memoryUsed)}</span>
            <span>交换 {formatBytes(snapshot.swapUsed)}</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-head">
            <span className="metric-label">系统盘</span>
            <span className="metric-badge">DISK</span>
          </div>
          <div className="metric-value">
            {diskPercent.toFixed(0)}
            <small>% 已用</small>
          </div>
          <Progress percent={diskPercent} showInfo={false} strokeColor={usageColor(diskPercent)} />
          <div className="metric-foot">
            <span>{primaryDisk?.mountPoint ?? "—"} · {primaryDisk?.fileSystem}</span>
            <span>可用 {primaryDisk ? formatBytes(primaryDisk.available) : "—"}</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-head">
            <span className="metric-label">运行时间</span>
            <span className="metric-badge">UPTIME</span>
          </div>
          <div className="metric-value metric-value--text">{formatUptime(snapshot.uptimeSecs)}</div>
          <div className="uptime-track">
            <span style={{ width: `${Math.min(100, (snapshot.uptimeSecs / (7 * 86400)) * 100)}%` }} />
          </div>
          <div className="metric-foot">
            <span>启动于 {new Date(snapshot.bootTime * 1000).toLocaleDateString("zh-CN")}</span>
            <span>{snapshot.disks.length} 个卷</span>
          </div>
        </article>
      </div>

      <PluginPanel snapshot={snapshot} />

      <div className="split-row">
        <section className="panel core-panel">
          <div className="panel-head">
            <div>
              <h3>核心负载</h3>
              <p>每个逻辑处理器的实时占用率</p>
            </div>
            <span className="panel-hint">{snapshot.logicalCores} 线程</span>
          </div>
          <div className="core-grid">
            {snapshot.perCoreUsage.map((usage, index) => (
              <Tooltip key={index} title={`CPU ${index} · ${usage.toFixed(1)}%`}>
                <div className="core-cell">
                  <div className="core-bar-track">
                    <div
                      className={`core-bar ${usage >= 85 ? "high" : usage >= 65 ? "mid" : "low"}`}
                      style={{ height: `${Math.max(6, (usage / maxCore) * 100)}%` }}
                    />
                  </div>
                  <span>{index}</span>
                </div>
              </Tooltip>
            ))}
          </div>
          <div className="core-legend">
            <span><i className="legend-dot low" /> 0–64%</span>
            <span><i className="legend-dot mid" /> 65–84%</span>
            <span><i className="legend-dot high" /> 85%+</span>
          </div>
          <div className="core-foot">
            <span>{snapshot.cpuBrand}</span>
            <span>实时采样 · 1s</span>
          </div>
        </section>

        <section className="panel disk-panel">
          <div className="panel-head">
            <div>
              <h3>存储卷</h3>
              <p>磁盘容量与剩余空间</p>
            </div>
            <CloudServerOutlined className="panel-icon" />
          </div>
          <div className="disk-list">
            {snapshot.disks.map((disk) => {
              const used = disk.total - disk.available;
              const percent = ratio(used, disk.total);
              return (
                <div className="disk-item" key={`${disk.mountPoint}-${disk.name}`}>
                  <div className="disk-top">
                    <span className="disk-mount">{disk.mountPoint}</span>
                    <span className="disk-name">{disk.name || disk.fileSystem}</span>
                    <span className="disk-total">{formatBytes(disk.total)}</span>
                  </div>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    strokeColor={usageColor(percent)}
                    trailColor="rgba(255,255,255,0.06)"
                    size="small"
                  />
                  <div className="disk-foot">
                    <span>{disk.fileSystem}{disk.removable ? " · 可移动" : ""}</span>
                    <span>可用 {formatBytes(disk.available)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel info-panel">
        <div className="panel-head">
          <div>
            <h3>本机信息</h3>
            <p>登录会话与硬件摘要</p>
          </div>
          <span className={`mini-status${snapshot.isElevated ? " ok" : " warn"}`}>
            {snapshot.isElevated ? "ELEVATED" : "LIMITED"}
          </span>
        </div>
        <div className="info-grid">
          <div><span>主机名</span><strong>{snapshot.hostname}</strong></div>
          <div><span>操作系统</span><strong>{snapshot.osName} {snapshot.osVersion}</strong></div>
          <div><span>内核版本</span><strong>{snapshot.kernelVersion}</strong></div>
          <div><span>处理器</span><strong>{snapshot.cpuBrand}</strong></div>
          <div><span>内存总量</span><strong>{formatBytes(snapshot.memoryTotal)}</strong></div>
          <div><span>交换空间</span><strong>{formatBytes(snapshot.swapUsed)} / {formatBytes(snapshot.swapTotal)}（{swapPercent.toFixed(0)}%）</strong></div>
        </div>
      </section>
    </div>
  );
}
