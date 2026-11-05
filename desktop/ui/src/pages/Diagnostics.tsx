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
import { useI18n, type Language } from "../i18n";
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

function healthLabel(value: string, lang: Language): string {
  const text = value.toLowerCase();
  if (lang === "en-US") {
    if (text.includes("healthy")) return "Healthy";
    if (text.includes("warning")) return "Warning";
    if (text.includes("unhealthy")) return "Degraded";
    return value || "Unknown";
  }
  if (text.includes("healthy")) return "健康";
  if (text.includes("warning")) return "警告";
  if (text.includes("unhealthy")) return "异常";
  return value || "未知";
}

function buildReport(
  snapshot: SystemSnapshot | null,
  data: SystemDiagnostics,
  lang: Language,
): string {
  const isEn = lang === "en-US";
  const lines = [
    isEn ? "# Qingshan Toolbox Diagnostics Report" : "# 青衫工具箱诊断报告",
    "",
    isEn ? `- Generated At: ${new Date().toLocaleString("en-US")}` : `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
    isEn ? `- Collected At: ${data.collectedAt}` : `- 采集时间：${data.collectedAt}`,
  ];
  if (snapshot) {
    lines.push(
      isEn ? `- Host: ${snapshot.hostname}` : `- 主机：${snapshot.hostname}`,
      isEn ? `- OS: ${snapshot.osName} ${snapshot.osVersion} (${snapshot.arch})` : `- 系统：${snapshot.osName} ${snapshot.osVersion} (${snapshot.arch})`,
      isEn ? `- Processor: ${snapshot.cpuBrand}` : `- 处理器：${snapshot.cpuBrand}`,
      isEn ? `- Memory: ${formatBytes(snapshot.memoryUsed)} / ${formatBytes(snapshot.memoryTotal)}` : `- 内存：${formatBytes(snapshot.memoryUsed)} / ${formatBytes(snapshot.memoryTotal)}`,
      isEn ? `- Uptime: ${formatUptime(snapshot.uptimeSecs, lang)}` : `- 运行时间：${formatUptime(snapshot.uptimeSecs, lang)}`,
      isEn ? `- Administrator: ${snapshot.isElevated ? "Yes" : "No"}` : `- 管理员权限：${snapshot.isElevated ? "是" : "否"}`,
    );
  }
  lines.push("", isEn ? "## Battery" : "## 电池");
  if (data.battery) {
    lines.push(
      isEn ? `- Name: ${data.battery.name}` : `- 名称：${data.battery.name}`,
      isEn ? `- Charge: ${data.battery.chargePercent == null ? "Unknown" : `${data.battery.chargePercent}%`}` : `- 电量：${data.battery.chargePercent == null ? "未知" : `${data.battery.chargePercent}%`}`,
      isEn ? `- Status: ${data.battery.status}` : `- 状态：${data.battery.status}`,
      isEn ? `- Estimated: ${data.battery.estimatedMinutes == null ? "Unknown" : `${data.battery.estimatedMinutes} minutes`}` : `- 预计续航：${data.battery.estimatedMinutes == null ? "未知" : `${data.battery.estimatedMinutes} 分钟`}`,
    );
  } else {
    lines.push(isEn ? "- No battery detected" : "- 未检测到电池");
  }
  lines.push("", isEn ? "## Disks" : "## 磁盘");
  if (data.disks.length === 0) lines.push(isEn ? "- No physical disks detected" : "- 未读取到物理磁盘");
  for (const disk of data.disks) {
    lines.push(
      isEn
        ? `- ${disk.name}: ${disk.mediaType}, ${disk.health}, ${formatBytes(disk.sizeBytes)}`
        : `- ${disk.name}：${disk.mediaType}，${healthLabel(disk.health, lang)}，${formatBytes(disk.sizeBytes)}`,
    );
  }
  lines.push("", isEn ? "## Graphics Cards" : "## 显卡");
  if (data.gpus.length === 0) lines.push(isEn ? "- No graphics cards detected" : "- 未读取到显卡");
  for (const gpu of data.gpus) {
    lines.push(
      isEn
        ? `- ${gpu.name}: Driver ${gpu.driverVersion}, VRAM ${formatBytes(gpu.memoryBytes)}`
        : `- ${gpu.name}：驱动 ${gpu.driverVersion}，显存 ${formatBytes(gpu.memoryBytes)}`,
    );
  }
  lines.push(
    "",
    isEn ? "## Notice" : "## 说明",
    isEn
      ? "- Read-only local diagnostics. Does not contain credentials or log bodies."
      : "- 本报告仅包含本机只读诊断信息，不包含日志正文或文件内容。",
  );
  return lines.join("\n");
}

export default function DiagnosticsPage({ snapshot }: DiagnosticsPageProps) {
  const { message } = AntApp.useApp();
  const { t, language } = useI18n();
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
    () => (data ? buildReport(snapshot, data, language) : ""),
    [data, snapshot, language],
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
      message.success(
        language === "en-US"
          ? `Diagnostics report exported: ${path}`
          : `诊断报告已导出：${path}`
      );
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
            <h2>{t("本机健康诊断")}</h2>
            <p>{t("电池、磁盘健康、显卡驱动与常用网络修复")}</p>
          </div>
          <div className="panel-actions">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void exportReport()}
              loading={exporting}
              disabled={!data}
            >
              {t("导出报告")}
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void load()}
              loading={loading}
            >
              {t("重新检测")}
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
                  <span className="diag-card-label">{t("电池")}</span>
                  <strong>
                    {data.battery?.chargePercent == null
                      ? t("未检测到")
                      : `${data.battery.chargePercent}%`}
                  </strong>
                  <span>{data.battery?.status ?? t("台式机或电池不可用")}</span>
                  {data.battery?.estimatedMinutes != null && (
                    <em>
                      {language === "en-US"
                        ? `Estimated ${data.battery.estimatedMinutes} mins`
                        : `预计可用 ${data.battery.estimatedMinutes} 分钟`}
                    </em>
                  )}
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <HddOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">{t("磁盘健康")}</span>
                  <strong>
                    {language === "en-US" ? `${data.disks.length} drive(s)` : `${data.disks.length} 块`}
                    {diskWarnings > 0
                      ? language === "en-US"
                        ? ` · ${diskWarnings} warning(s)`
                        : ` · ${diskWarnings} 个警告`
                      : ""}
                  </strong>
                  <span>
                    {language === "en-US"
                      ? `${data.disks.filter((disk) => healthTone(disk.health) === "ok").length} drive(s) healthy`
                      : `${data.disks.filter((disk) => healthTone(disk.health) === "ok").length} 块状态正常`}
                  </span>
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <DesktopOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">{t("显卡")}</span>
                  <strong>
                    {language === "en-US" ? `${data.gpus.length} adapter(s)` : `${data.gpus.length} 个适配器`}
                  </strong>
                  <span>{data.gpus[0]?.name ?? t("未检测到")}</span>
                </div>
              </div>
              <div className="diag-card">
                <div className="diag-card-icon">
                  <SafetyCertificateOutlined />
                </div>
                <div className="diag-card-body">
                  <span className="diag-card-label">{t("采样时间")}</span>
                  <strong>{data.collectedAt}</strong>
                  <span>{snapshot?.isElevated ? t("管理员权限") : t("标准用户")}</span>
                </div>
              </div>
            </div>

            <div className="diag-section-head">
              <h3>{t("磁盘")}</h3>
              <span>{t("SMART / 运行状态来自 Windows 存储接口")}</span>
            </div>
            <div className="diag-disks">
              {data.disks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("未读取到物理磁盘")} />
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
                      {healthLabel(disk.health, language)}
                    </Tag>
                    <span className="diag-disk-status">
                      {disk.operationalStatus}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="diag-section-head">
              <h3>{t("显卡")}</h3>
              <span>{t("驱动版本与显存")}</span>
            </div>
            <div className="diag-gpus">
              {data.gpus.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("未读取到显卡")} />
              ) : (
                data.gpus.map((gpu) => (
                  <div className="diag-gpu" key={`${gpu.name}-${gpu.driverVersion}`}>
                    <strong>{gpu.name}</strong>
                    <span>{t("驱动")} {gpu.driverVersion}</span>
                    <span>{t("显存")} {formatBytes(gpu.memoryBytes)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="diag-section-head">
              <h3>{t("快速修复")}</h3>
              <span>{t("只执行白名单内的安全操作")}</span>
            </div>
            <div className="diag-actions">
              {actions.map((action) => (
                <div className="diag-action" key={action.id}>
                  <div>
                    <strong>{t(action.name)}</strong>
                    <p>{t(action.description)}</p>
                    {action.requiresAdmin && <Tag color="warning">{t("需要管理员")}</Tag>}
                  </div>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={busyAction === action.id}
                    onClick={() => void runAction(action)}
                  >
                    {t("执行")}
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
            <h3>{t("报告内容")}</h3>
            <p>{t("导出 Markdown，可直接附在工单或发给同事")}</p>
          </div>
          <Tooltip title={t("报告不包含日志正文、文件内容或凭据")}>
            <span className="diag-private">
              <CheckCircleFilled /> {t("仅本机只读信息")}
            </span>
          </Tooltip>
        </div>
        <pre className="diag-preview">{report || t("等待采集数据…")}</pre>
      </section>
    </div>
  );
}
