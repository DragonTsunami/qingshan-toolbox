import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { exportLogs, logSources, queryLogs } from "../api";
import type { LogBatch, LogEntry, LogLevel, LogSource } from "../types";
import "../logs.css";

interface LogsPageProps {
  elevated: boolean;
  onElevate: () => void;
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  critical: "严重",
  error: "错误",
  warning: "警告",
  information: "信息",
  verbose: "详细",
  unknown: "未知",
};

const LEVEL_OPTIONS = (Object.keys(LEVEL_LABEL) as LogLevel[]).map((value) => ({
  value,
  label: LEVEL_LABEL[value],
}));

const LIMIT_OPTIONS = [100, 200, 500].map((value) => ({
  value,
  label: `${value} 条`,
}));

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatFullTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelBadge(level: LogLevel) {
  return (
    <span className={`log-level log-level-${level}`}>
      <span className="log-level-dot" />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export default function LogsPage({ elevated, onElevate }: LogsPageProps) {
  const { message } = App.useApp();
  const [sources, setSources] = useState<LogSource[]>([]);
  const [source, setSource] = useState("application");
  const [level, setLevel] = useState<LogLevel | undefined>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [limit, setLimit] = useState(200);
  const [batch, setBatch] = useState<LogBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void logSources()
      .then((items) => {
        if (cancelled) return;
        setSources(items);
        const first = items.find((item) => item.available);
        if (first && !items.some((item) => item.id === source)) {
          setSource(first.id);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(String(reason));
      });
    return () => {
      cancelled = true;
    };
    // Reading the source list once is enough; source selection is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void queryLogs({
      source,
      level: level ?? null,
      keyword: appliedKeyword,
      limit,
    })
      .then((next) => {
        if (cancelled) return;
        setBatch(next);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setBatch(null);
        setError(String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, level, limit, appliedKeyword, reloadToken]);

  const activeSource = useMemo(
    () => sources.find((item) => item.id === source),
    [sources, source],
  );

  const submitSearch = useCallback(() => {
    setAppliedKeyword(keyword.trim());
  }, [keyword]);

  const refresh = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const onExport = async () => {
    if (!batch || batch.entries.length === 0) return;
    setExporting(true);
    try {
      const result = await exportLogs(batch.entries);
      message.success(`已导出 ${result.count} 条日志到 ${result.path}`);
    } catch (reason) {
      message.error(String(reason));
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<LogEntry> = [
    {
      title: "时间",
      dataIndex: "timestamp",
      width: 138,
      render: (value: string) => (
        <Tooltip title={formatFullTime(value)}>
          <span className="log-time">{formatTime(value)}</span>
        </Tooltip>
      ),
    },
    {
      title: "级别",
      dataIndex: "level",
      width: 88,
      render: (value: LogLevel) => levelBadge(value),
    },
    {
      title: "事件 ID",
      dataIndex: "eventId",
      width: 82,
      render: (value: number) => <span className="log-event-id">{value}</span>,
    },
    {
      title: "来源",
      dataIndex: "provider",
      width: 218,
      render: (value: string, entry) => (
        <div className="log-provider">
          <span>{value || "—"}</span>
          <span className="log-channel">{entry.channel}</span>
        </div>
      ),
    },
    {
      title: "消息",
      dataIndex: "message",
      render: (value: string) => (
        <span className="log-message" title={value}>
          {value}
        </span>
      ),
    },
  ];

  const securityError = error?.includes("安全日志") ?? false;

  return (
    <div className="page-stack log-page">
      <section className="panel log-panel">
        <div className="panel-head log-panel-head">
          <div>
            <h2>
              <FileTextOutlined /> 事件日志
            </h2>
            <p>读取 Windows 事件通道，按级别与关键字过滤，可导出为 CSV。</p>
          </div>
          <div className="log-head-meta">
            <Tag bordered={false}>{activeSource?.name ?? "事件日志"}</Tag>
            {batch && <span>{batch.entries.length} 条</span>}
          </div>
        </div>

        <div className="log-toolbar">
          <div className="log-toolbar-filters">
            <Select
              className="log-source-select"
              value={source}
              options={sources.map((item) => ({
                value: item.id,
                label: item.name,
                disabled: !item.available,
              }))}
              onChange={(value) => {
                setSource(value);
                setSelected(null);
              }}
              aria-label="日志来源"
            />
            <Select
              className="log-level-select"
              allowClear
              placeholder="全部级别"
              value={level}
              options={LEVEL_OPTIONS}
              onChange={setLevel}
              aria-label="日志级别"
            />
            <Input
              className="log-search"
              allowClear
              value={keyword}
              prefix={<SearchOutlined />}
              placeholder="搜索消息、来源、事件 ID"
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={submitSearch}
            />
            <Button icon={<SearchOutlined />} onClick={submitSearch}>
              查询
            </Button>
          </div>
          <div className="log-toolbar-actions">
            <Select
              className="log-limit-select"
              value={limit}
              options={LIMIT_OPTIONS}
              onChange={setLimit}
              aria-label="读取条数"
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => void onExport()}
              loading={exporting}
              disabled={!batch || batch.entries.length === 0}
            >
              导出
            </Button>
          </div>
        </div>

        {activeSource && <div className="log-source-note">{activeSource.description}</div>}

        {error && (
          <Alert
            className="log-alert"
            type="error"
            showIcon
            message="读取日志失败"
            description={error}
            action={
              securityError && !elevated ? (
                <Button
                  size="small"
                  icon={<SafetyCertificateOutlined />}
                  onClick={onElevate}
                >
                  以管理员身份重启
                </Button>
              ) : undefined
            }
          />
        )}

        {loading && !batch ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Table<LogEntry>
            className="log-table"
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={batch?.entries ?? []}
            pagination={false}
            loading={loading}
            tableLayout="fixed"
            scroll={{ x: 980 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={error ? "没有可显示的事件" : "没有匹配的事件"}
                />
              ),
            }}
            onRow={(entry) => ({
              onClick: () => setSelected(entry),
            })}
          />
        )}

        <div className="log-footer">
          <span>
            {batch
              ? `扫描 ${batch.scanned} 条，匹配 ${batch.total} 条${
                  batch.truncated ? "，已截断显示" : ""
                }`
              : "尚未读取"}
          </span>
          <span>Security 通道需要管理员权限 · 日志只读，不会修改系统</span>
        </div>
      </section>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={560}
        title="事件详情"
        className="log-drawer"
      >
        {selected && (
          <div className="log-detail">
            <div className="log-detail-head">
              <div>
                <h3>{selected.provider || selected.channel}</h3>
                <span>
                  {selected.channel} · 事件 {selected.eventId}
                </span>
              </div>
              {levelBadge(selected.level)}
            </div>

            <pre className="log-detail-message">{selected.message}</pre>

            <div className="log-facts">
              <div>
                <span>时间</span>
                <strong>{formatFullTime(selected.timestamp)}</strong>
              </div>
              <div>
                <span>计算机</span>
                <strong>{selected.computer || "—"}</strong>
              </div>
              <div>
                <span>用户</span>
                <strong>{selected.user ?? "—"}</strong>
              </div>
              <div>
                <span>通道</span>
                <strong>{selected.channel}</strong>
              </div>
              <div>
                <span>来源</span>
                <strong>{selected.provider || "—"}</strong>
              </div>
              <div>
                <span>事件 ID</span>
                <strong>{selected.eventId}</strong>
              </div>
            </div>

            <h4 className="log-detail-section">事件数据</h4>
            {selected.fields.length === 0 ? (
              <p className="log-muted">该事件没有附加数据。</p>
            ) : (
              <div className="log-fields">
                {selected.fields.map((field, index) => (
                  <div key={`${field.name}-${index}`}>
                    <span>{field.name}</span>
                    <code>{field.value}</code>
                  </div>
                ))}
              </div>
            )}

            <details className="log-raw">
              <summary>原始时间戳</summary>
              <code>{selected.timestamp}</code>
            </details>
          </div>
        )}
      </Drawer>
    </div>
  );
}
