import {
  CaretRightOutlined,
  PauseOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Input, Segmented, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { applyServiceAction, listServices } from "../api";
import { useI18n } from "../i18n";
import type { ServiceAction, ServiceInfo, ServiceStatus } from "../types";

export default function ServicesPage({ elevated }: { elevated: boolean }) {
  const { message, modal } = App.useApp();
  const { t, language } = useI18n();
  const [rows, setRows] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "running" | "stopped">("all");
  const [acting, setActing] = useState<string | null>(null);

  const statusMeta: Record<ServiceStatus, { label: string; color: string }> = useMemo(() => ({
    running: { label: t("运行中"), color: "success" },
    stopped: { label: t("已停止"), color: "default" },
    startpending: { label: t("启动中"), color: "processing" },
    stoppending: { label: t("停止中"), color: "processing" },
    paused: { label: t("已暂停"), color: "warning" },
    pausepending: { label: t("暂停中"), color: "processing" },
    continuepending: { label: t("恢复中"), color: "processing" },
    unknown: { label: t("未知"), color: "default" },
  }), [t]);

  const startTypeLabel: Record<string, string> = useMemo(() => ({
    auto: t("自动"),
    manual: t("手动"),
    disabled: t("禁用"),
    boot: t("引导"),
    system: t("系统"),
    unknown: "—",
  }), [t]);

  const load = useCallback(async () => {
    try {
      const next = await listServices();
      setRows(next);
      setError(null);
    } catch (loadError) {
      setError(String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = (service: ServiceInfo, action: ServiceAction) => {
    const verb = action === "start" ? t("启动") : action === "stop" ? t("停止") : t("重启");
    const perform = async () => {
      setActing(`${service.name}:${action}`);
      try {
        await applyServiceAction(service.name, action);
        message.success(
          language === "en-US"
            ? `${service.displayName || service.name} ${action}ed`
            : `${service.displayName || service.name} 已${verb}`
        );
        await load();
      } catch (actionError) {
        message.error(String(actionError));
      } finally {
        setActing(null);
      }
    };

    if (action === "stop") {
      modal.confirm({
        title: language === "en-US" ? `Stop ${service.displayName || service.name}?` : `停止 ${service.displayName || service.name}？`,
        content: t("依赖该服务的应用可能立即中断，请确认当前不在关键运维窗口。"),
        okText: t("停止服务"),
        okButtonProps: { danger: true },
        cancelText: t("取消"),
        onOk: perform,
      });
      return;
    }
    void perform();
  };

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((service) => {
      if (filter === "running" && service.status !== "running") return false;
      if (filter === "stopped" && service.status !== "stopped") return false;
      if (!keyword) return true;
      return (
        service.name.toLowerCase().includes(keyword) ||
        service.displayName.toLowerCase().includes(keyword)
      );
    });
  }, [rows, query, filter]);

  const counts = useMemo(
    () => ({
      running: rows.filter((service) => service.status === "running").length,
      stopped: rows.filter((service) => service.status === "stopped").length,
    }),
    [rows],
  );

  const columns: ColumnsType<ServiceInfo> = [
    {
      title: t("服务"),
      dataIndex: "displayName",
      key: "displayName",
      render: (_, service) => (
        <div className="service-cell">
          <strong>{service.displayName || service.name}</strong>
          <span className="mono">{service.name}</span>
        </div>
      ),
    },
    {
      title: t("状态"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: ServiceStatus) => {
        const meta = statusMeta[status] ?? statusMeta.unknown;
        return (
          <Tag bordered={false} color={meta.color} className="status-tag">
            <i className={`status-dot ${status}`} />
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: t("启动类型"),
      dataIndex: "startType",
      key: "startType",
      width: 110,
      render: (startType: string) => (
        <Tag bordered={false} className="start-type-tag">
          {startTypeLabel[startType] ?? startType}
        </Tag>
      ),
    },
    {
      title: "PID",
      dataIndex: "processId",
      key: "processId",
      width: 86,
      render: (pid: number) => <span className="mono muted">{pid || "—"}</span>,
    },
    {
      title: t("操作"),
      key: "action",
      width: 210,
      align: "right",
      render: (_, service) => {
        const running = service.status === "running";
        const stopped = service.status === "stopped";
        return (
          <div className="service-actions">
            <Tooltip title={elevated ? t("启动服务") : t("需要管理员权限")}>
              <Button
                size="small"
                icon={<CaretRightOutlined />}
                disabled={!elevated || running || !stopped}
                loading={acting === `${service.name}:start`}
                onClick={() => runAction(service, "start")}
              >
                {t("启动")}
              </Button>
            </Tooltip>
            <Tooltip title={elevated ? t("停止服务") : t("需要管理员权限")}>
              <Button
                size="small"
                icon={<PauseOutlined />}
                disabled={!elevated || !running || !service.canStop}
                loading={acting === `${service.name}:stop`}
                onClick={() => runAction(service, "stop")}
              >
                {t("停止")}
              </Button>
            </Tooltip>
            <Tooltip title={elevated ? t("重启服务") : t("需要管理员权限")}>
              <Button
                size="small"
                type="primary"
                ghost
                disabled={!elevated}
                loading={acting === `${service.name}:restart`}
                onClick={() => runAction(service, "restart")}
              >
                {t("重启")}
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t("系统服务")}</h3>
            <p>
              {language === "en-US"
                ? `${counts.running} running · ${counts.stopped} stopped · Total ${rows.length} services`
                : `${counts.running} 个运行中 · ${counts.stopped} 个已停止 · 共 ${rows.length} 个服务`}
            </p>
          </div>
          <div className="toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("搜索服务名称")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="toolbar-search"
            />
            <Segmented
              value={filter}
              onChange={(value) => setFilter(value as typeof filter)}
              options={[
                { label: t("全部"), value: "all" },
                { label: t("运行中"), value: "running" },
                { label: t("已停止"), value: "stopped" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading && rows.length === 0}>
              {t("刷新")}
            </Button>
          </div>
        </div>

        {!elevated && (
          <Alert
            type="warning"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message={t("当前为标准用户")}
            description={t("启动、停止和重启系统服务需要管理员权限。请从左侧重新以管理员身份启动青衫工具箱。")}
            className="panel-alert"
          />
        )}
        {error && (
          <Alert
            type="error"
            showIcon
            message={t("无法读取系统服务")}
            description={error}
            className="panel-alert"
          />
        )}

        <Table<ServiceInfo>
          rowKey="name"
          size="middle"
          className="data-table"
          columns={columns}
          dataSource={visible}
          loading={loading}
          pagination={{
            pageSize: 14,
            showSizeChanger: false,
            showTotal: (total) => (language === "en-US" ? `Total ${total} items` : `共 ${total} 条`),
          }}
          scroll={{ x: 860 }}
        />

        <div className="table-note">
          <SafetyCertificateOutlined /> {t("服务操作会等待状态变更完成（最长 20 秒），请勿重复点击。")}
        </div>
      </section>
    </div>
  );
}
