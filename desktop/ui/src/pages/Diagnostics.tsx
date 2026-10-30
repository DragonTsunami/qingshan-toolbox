import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Skeleton,
  Tag,
  Tooltip,
} from "antd";
import {
  CheckCircleFilled,
  DesktopOutlined,
  DownloadOutlined,
  HddOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningFilled,
} from "@ant-design/icons";
import {
  diagnosticsActions,
  diagnosticsRead,
  exportDiagnostics,
  runDiagnosticAction,
} from "../api";
import { formatBytes, formatUptime } from "../format";
import type {
  QuickAction,
  SystemDiagnostics,
  SystemSnapshot,
} from "../types";
import "../diagnostics.css";

interface DiagnosticsPageProps {
  snapshot: SystemSnapshot | null;
}

function healthTone(value: string): "ok" | "warn" | "bad" {
  const text = value.toLowerCase();
  if (text.includes("healthy") || text === "ok") return "ok";
  if (text.includes("warning") || text.includes("degraded")) return "warn";
  return "bad";
}

function healthLabel(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("healthy")) return "健康";
  if (text.includes("warning")) return "警告";
  if (text.includes("unhealthy")) return "异常";
  return value || "未知";
}

function buildReport(
  snapshot: SystemSnapshot | null,
  data: SystemDiagnostics,
): string {
  const lines = [
    "# 青衫工具箱诊断报告",
    "",
    `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
    `- 采集时间：${data.collectedAt}`,
  ];
  if (snapshot) {
    lines.push(
      `- 主机：${snapshot.hostname}`,
      `- 系统：${snapshot.osName} ${snapshot.osVersion} (${snapshot.arch})`,
      `- 处理器：${snapshot.cpuBrand}`,
      `- 内存：${formatBytes(snapshot.memoryUsed)} / ${formatBytes(snapshot.memoryTotal)}`,
      `- 运行时间：${formatUptime(snapshot.uptimeSecs)}`,
      `- 管理员权限：${snapshot.isElevated ? "是" : "否"}`,
    );
  }
  lines.push("", "## 电池");
  if (data.battery) {
    lines.push(
      `- 名称：${data.battery.name}`,
      `- 电量：${data.battery.chargePercent == null ? "未知" : `${data.battery.chargePercent}%`}`,
      `- 状态：${data.battery.status}`,
      `- 预计续航：${data.battery.estimatedMinutes == null ? "未知" : `${data.battery.estimatedMinutes} 分钟`}`,
    );
  } else {
    lines.push("- 未检测到电池");
  }
  lines.push("", "## 磁盘");
  if (data.disks.length === 0) lines.push("- 未读取到物理磁盘");
  for (const disk of data.disks) {
    lines.push(
      `- ${disk.name}：${disk.mediaType}，${healthLabel(disk.health)}，${formatBytes(disk.sizeBytes)}`,
    );
  }
  lines.push("", "## 显卡");
  if (data.gpus.length === 0) lines.push("- 未读取到显卡");
  for (const gpu of data.gpus) {
    lines.push(
      `- ${gpu.name}：驱动 ${gpu.driverVersion}，显存 ${formatBytes(gpu.memoryBytes)}`,
    );
  }
  lines.push("", "## 说明", "- 本报告仅包含本机只读诊断信息，不包含日志正文或文件内容。");
  return lines.join("\n");
}

export default function DiagnosticsPage({ snapshot }: DiagnosticsPageProps) {
  const { message } = AntApp.useApp();
  const [data, setData] = useState<SystemDiagnostics | null>(null);
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [next, nextActions] = await Promise.all([
        diagnosticsRead(),
        diagnosticsActions(),
      ]);
      setData(next);
      setActions(nextActions);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(
    () => (data ? buildReport(snapshot, data) : ""),
    [data, snapshot],
  );

  const runAction = async (action: QuickAction) => {
    setBusyAction(action.id);
    try {
      const result = await runDiagnosticAction(action.id);
      message.success(result.message);
    } catch (cause) {
      message.error(String(cause));
    } finally {
      setBusyAction("");
    }
  };

  const exportReport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const path = await exportDiagnostics(report);
      message.success(`诊断报告已导出：${path}`);
    } catch (cause) {
      message.error(String(cause));
    } finally {
      setExporting(false);
    }
  };

  const diskWarnings = data?.disks.filter(
    (disk) => healthTone(disk.health) !== "ok",
  ).length ?? 0;

  return (
    <div className="page-stack diagnostics-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>本机健康诊断</h2>
            <p>电池、磁盘健康、显卡驱动与常用网络修复</p>
          </div>
          <div className="panel-actions">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void exportReport()}
              loading={exporting}
              disabled={!data}
            >
              导出报告
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void load()}
              loading={loading}
            >
              重新检测
            </Button>
          </div>
        </div>

        {error && (
          <div className="diagnostics-error">
            <WarningFilled /> {error}
          </div>
        )}

        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : data ? (
          <>
            <div className="diag-summary">
              <div className="diag-card">
                <div className="diag-card-icon">
                  <ThunderboltOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">电池</span>
                  <strong>
                    {data.battery?.chargePercent == null
                      ? "未检测到"
                      : `${data.battery.chargePercent}%`}
                  </strong>
                  <span>{data.battery?.status ?? "台式机或电池不可用"}</span>
                  {data.battery?.estimatedMinutes != null && (
                    <em>预计可用 {data.battery.estimatedMinutes} 分钟</em>
                  )}
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <HddOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">磁盘健康</span>
                  <strong>
                    {data.disks.length} 块
                    {diskWarnings > 0 ? ` · ${diskWarnings} 个警告` : ""}
                  </strong>
                  <span>
                    {data.disks.filter((disk) => healthTone(disk.health) === "ok").length}{" "}
                    块状态正常
                  </span>
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <DesktopOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">显卡</span>
                  <strong>{data.gpus.length} 个适配器</strong>
                  <span>{data.gpus[0]?.name ?? "未检测到"}</span>
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <SafetyCertificateOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">采样时间</span>
                  <strong>{data.collectedAt}</strong>
                  <span>{snapshot?.isElevated ? "管理员权限" : "标准用户"}</span>
                </div>
              </div>
            </div>

            <div className="diag-section-head">
              <h3>磁盘</h3>
              <span>SMART / 运行状态来自 Windows 存储接口</span>
            </div>
            <div className="diag-disks">
              {data.disks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未读取到物理磁盘" />
              ) : (
                data.disks.map((disk) => (
                  <div className="diag-disk" key={`${disk.name}-${disk.sizeBytes}`}>
                    <div className="diag-disk-main">
                      <strong>{disk.name}</strong>
                      <span>
                        {disk.mediaType} · {formatBytes(disk.sizeBytes)}
                      </span>
                    </div>
                    <Tag
                      color={
                        healthTone(disk.health) === "ok"
                          ? "success"
                          : healthTone(disk.health) === "warn"
                            ? "warning"
                            : "error"
                      }
                    >
                      {healthLabel(disk.health)}
                    </Tag>
                    <span className="diag-disk-status">
                      {disk.operationalStatus}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="diag-section-head">
              <h3>显卡</h3>
              <span>驱动版本与显存</span>
            </div>
            <div className="diag-gpus">
              {data.gpus.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未读取到显卡" />
              ) : (
                data.gpus.map((gpu) => (
                  <div className="diag-gpu" key={`${gpu.name}-${gpu.driverVersion}`}>
                    <strong>{gpu.name}</strong>
                    <span>驱动 {gpu.driverVersion}</span>
                    <span>显存 {formatBytes(gpu.memoryBytes)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="diag-section-head">
              <h3>快速修复</h3>
              <span>只执行白名单内的安全操作</span>
            </div>
            <div className="diag-actions">
              {actions.map((action) => (
                <div className="diag-action" key={action.id}>
                  <div>
                    <strong>{action.name}</strong>
                    <p>{action.description}</p>
                    {action.requiresAdmin && <Tag color="warning">需要管理员</Tag>}
                  </div>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={busyAction === action.id}
                    onClick={() => void runAction(action)}
                  >
                    执行
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>报告内容</h3>
            <p>导出 Markdown，可直接附在工单或发给同事</p>
          </div>
          <Tooltip title="报告不包含日志正文、文件内容或凭据">
            <span className="diag-private">
              <CheckCircleFilled /> 仅本机只读信息
            </span>
          </Tooltip>
        </div>
        <pre className="diag-preview">{report || "等待采集数据…"}</pre>
      </section>
    </div>
  );
}
