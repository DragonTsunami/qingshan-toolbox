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
import type { ServiceAction, ServiceInfo, ServiceStatus } from "../types";

const STATUS_META: Record<ServiceStatus, { label: string; color: string }> = {
  running: { label: "运行中", color: "success" },
  stopped: { label: "已停止", color: "default" },
  startpending: { label: "启动中", color: "processing" },
  stoppending: { label: "停止中", color: "processing" },
  paused: { label: "已暂停", color: "warning" },
  pausepending: { label: "暂停中", color: "processing" },
  continuepending: { label: "恢复中", color: "processing" },
  unknown: { label: "未知", color: "default" },
};

const START_TYPE_LABEL: Record<string, string> = {
  auto: "自动",
  manual: "手动",
  disabled: "禁用",
  boot: "引导",
  system: "系统",
  unknown: "—",
};

export default function ServicesPage({ elevated }: { elevated: boolean }) {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "running" | "stopped">("all");
  const [acting, setActing] = useState<string | null>(null);

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
    const verb = action === "start" ? "启动" : action === "stop" ? "停止" : "重启";
    const perform = async () => {
      setActing(`${service.name}:${action}`);
      try {
        await applyServiceAction(service.name, action);
        message.success(`${service.displayName || service.name} 已${verb}`);
        await load();
      } catch (actionError) {
        message.error(String(actionError));
      } finally {
        setActing(null);
      }
    };

    if (action === "stop") {
      modal.confirm({
        title: `停止 ${service.displayName || service.name}？`,
        content: "依赖该服务的应用可能立即中断，请确认当前不在关键运维窗口。",
        okText: "停止服务",
        okButtonProps: { danger: true },
        cancelText: "取消",
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
      title: "服务",
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
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: ServiceStatus) => {
        const meta = STATUS_META[status] ?? STATUS_META.unknown;
        return (
          <Tag bordered={false} color={meta.color} className="status-tag">
            <i className={`status-dot ${status}`} />
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "启动类型",
      dataIndex: "startType",
      key: "startType",
      width: 110,
      render: (startType: string) => (
        <Tag bordered={false} className="start-type-tag">
          {START_TYPE_LABEL[startType] ?? startType}
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
      title: "操作",
      key: "action",
      width: 210,
      align: "right",
      render: (_, service) => {
        const running = service.status === "running";
        const stopped = service.status === "stopped";
        return (
          <div className="service-actions">
            <Tooltip title={elevated ? "启动服务" : "需要管理员权限"}>
              <Button
                size="small"
                icon={<CaretRightOutlined />}
                disabled={!elevated || running || !stopped}
                loading={acting === `${service.name}:start`}
                onClick={() => runAction(service, "start")}
              >
                启动
              </Button>
            </Tooltip>
            <Tooltip title={elevated ? "停止服务" : "需要管理员权限"}>
              <Button
                size="small"
                icon={<PauseOutlined />}
                disabled={!elevated || !running || !service.canStop}
                loading={acting === `${service.name}:stop`}
                onClick={() => runAction(service, "stop")}
              >
                停止
              </Button>
            </Tooltip>
            <Tooltip title={elevated ? "重启服务" : "需要管理员权限"}>
              <Button
                size="small"
                type="primary"
                ghost
                disabled={!elevated}
                loading={acting === `${service.name}:restart`}
                onClick={() => runAction(service, "restart")}
              >
                重启
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
            <h3>系统服务</h3>
            <p>
              {counts.running} 个运行中 · {counts.stopped} 个已停止 · 共 {rows.length} 个服务
            </p>
          </div>
          <div className="toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索服务名称"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="toolbar-search"
            />
            <Segmented
              value={filter}
              onChange={(value) => setFilter(value as typeof filter)}
              options={[
                { label: "全部", value: "all" },
                { label: "运行中", value: "running" },
                { label: "已停止", value: "stopped" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading && rows.length === 0}>
              刷新
            </Button>
          </div>
        </div>

        {!elevated && (
          <Alert
            type="warning"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="当前为标准用户"
            description="启动、停止和重启系统服务需要管理员权限。请从左侧重新以管理员身份启动青衫工具箱。"
            className="panel-alert"
          />
        )}
        {error && (
          <Alert
            type="error"
            showIcon
            message="无法读取系统服务"
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
          pagination={{ pageSize: 14, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
          scroll={{ x: 860 }}
        />

        <div className="table-note">
          <SafetyCertificateOutlined /> 服务操作会等待状态变更完成（最长 20 秒），请勿重复点击。
        </div>
      </section>
    </div>
  );
}
