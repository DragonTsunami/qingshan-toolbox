import {
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Input, Popconfirm, Segmented, Switch, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { killProcess, listProcesses } from "../api";
import { formatBytes } from "../format";
import type { ProcessInfo } from "../types";

type SortKey = "memory" | "cpu" | "name";

interface ProcessesProps {
  refreshInterval: number;
}

export default function ProcessesPage({ refreshInterval }: ProcessesProps) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("memory");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [forceKill, setForceKill] = useState(false);
  const [killing, setKilling] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listProcesses();
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

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(), refreshInterval * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshInterval, load]);

  const handleKill = async (process: ProcessInfo) => {
    setKilling(process.pid);
    try {
      await killProcess(process.pid, forceKill);
      message.success(`已结束 ${process.name} (PID ${process.pid})`);
      await load();
    } catch (killError) {
      message.error(String(killError));
    } finally {
      setKilling(null);
    }
  };

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = rows.filter((process) => {
      if (!keyword) return true;
      return (
        process.name.toLowerCase().includes(keyword) ||
        String(process.pid).includes(keyword) ||
        (process.user ?? "").toLowerCase().includes(keyword) ||
        process.command.toLowerCase().includes(keyword)
      );
    });
    return filtered.sort((a, b) => {
      if (sortKey === "cpu") return b.cpuUsage - a.cpuUsage;
      if (sortKey === "name") return a.name.localeCompare(b.name, "zh-CN");
      return b.memory - a.memory;
    });
  }, [rows, query, sortKey]);

  const columns: ColumnsType<ProcessInfo> = [
    {
      title: "进程",
      dataIndex: "name",
      key: "name",
      render: (_, process) => (
        <div className="proc-cell">
          <span className={`proc-avatar${process.pid < 1000 ? " system" : ""}`}>
            {process.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="proc-meta">
            <strong>{process.name || "—"}</strong>
            <Tooltip title={process.exe ?? process.command}>
              <span>{process.exe ?? process.command ?? "—"}</span>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: "PID",
      dataIndex: "pid",
      key: "pid",
      width: 92,
      render: (pid: number) => <span className="mono">{pid}</span>,
    },
    {
      title: "用户",
      dataIndex: "user",
      key: "user",
      width: 150,
      render: (user: string | null) => <span className="muted">{user ?? "—"}</span>,
    },
    {
      title: "CPU",
      dataIndex: "cpuUsage",
      key: "cpu",
      width: 110,
      render: (usage: number) => (
        <div className="usage-cell">
          <span className={usage >= 20 ? "text-warn" : ""}>{usage.toFixed(1)}%</span>
          <span className="mini-track"><i style={{ width: `${Math.min(100, usage)}%` }} /></span>
        </div>
      ),
    },
    {
      title: "内存",
      dataIndex: "memory",
      key: "memory",
      width: 120,
      render: (memory: number) => <span className="mono">{formatBytes(memory)}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 96,
      render: (status: string) => {
        const tone =
          status === "运行中"
            ? "running"
            : status === "已暂停" || status === "唤醒中"
              ? "pending"
              : status === "休眠" || status === "已退出" || status === "僵尸"
                ? "stopped"
                : "idle";
        return (
          <Tag bordered={false} className="status-tag">
            <i className={`status-dot ${tone}`} />
            {status}
          </Tag>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 92,
      align: "right",
      render: (_, process) => (
        <Popconfirm
          title="结束进程"
          description={
            <span className="popover-desc">
              将结束 <b>{process.name}</b> (PID {process.pid})。未保存的数据可能丢失。
            </span>
          }
          okText="结束进程"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleKill(process)}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={killing === process.pid}
          >
            结束
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>进程列表</h3>
            <p>
              共 {rows.length} 个进程，当前显示 {visible.length} 个
            </p>
          </div>
          <div className="toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索名称、PID 或用户"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="toolbar-search"
            />
            <Segmented
              value={sortKey}
              onChange={(value) => setSortKey(value as SortKey)}
              options={[
                { label: "内存", value: "memory" },
                { label: "CPU", value: "cpu" },
                { label: "名称", value: "name" },
              ]}
            />
            <Tooltip title={`每 ${refreshInterval} 秒自动刷新`}>
              <span className="switch-label">
                自动 <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
              </span>
            </Tooltip>
            <Tooltip title="跳过正常退出流程，直接终止进程">
              <span className="switch-label">
                强制 <Switch size="small" checked={forceKill} onChange={setForceKill} />
              </span>
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading && rows.length === 0}>
              刷新
            </Button>
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message="无法读取进程列表"
            description={error}
            className="panel-alert"
          />
        )}

        <Table<ProcessInfo>
          rowKey="pid"
          size="middle"
          className="data-table"
          columns={columns}
          dataSource={visible}
          loading={loading}
          pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
          scroll={{ x: 880 }}
        />

        <div className="table-note">
          <ThunderboltOutlined /> 结束系统关键进程可能导致系统不稳定；青衫工具箱会拦截对自身进程的操作。
        </div>
      </section>
    </div>
  );
}
