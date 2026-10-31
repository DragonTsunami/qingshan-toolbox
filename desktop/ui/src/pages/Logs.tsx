import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Grid,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { clearLogs, exportLogs, logSources, queryLogs } from "../api";
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

const LOG_WINDOW_DAYS = 3;
const LOG_SCAN_LIMIT = 2000;

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
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [sources, setSources] = useState<LogSource[]>([]);
  const [source, setSource] = useState("application");
  const [level, setLevel] = useState<LogLevel | undefined>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [batch, setBatch] = useState<LogBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
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
      limit: LOG_SCAN_LIMIT,
      days: LOG_WINDOW_DAYS,
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
  }, [source, level, appliedKeyword, reloadToken]);

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

  const onClear = () => {
    if (!elevated) {
      message.warning("清空日志需要管理员权限，请先以管理员身份重启");
      return;
    }
    const label = activeSource?.name ?? source;
    modal.confirm({
      title: `清空${label}日志？`,
      content:
        source === "security"
          ? "将删除 Security 通道的全部事件，且 Windows 会记录本次清空审计。此操作不可恢复。"
          : "将删除该 Windows 事件通道的全部日志，且不可恢复。请先确认已导出需要保留的记录。",
      okText: "清空日志",
      cancelText: "取消",
      okButtonProps: { danger: true },
      async onOk() {
        setClearing(true);
        try {
          await clearLogs(source);
          message.success(`${label}日志已清空`);
          setSelected(null);
          refresh();
        } catch (reason) {
          message.error(String(reason));
        } finally {
          setClearing(false);
        }
      },
    });
  };

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

  const showTimeColumn = Boolean(screens.md);

  const columns: ColumnsType<LogEntry> = [
    ...(showTimeColumn
      ? [
          {
            title: "时间",
            dataIndex: "timestamp",
            width: screens.lg ? 138 : 104,
            render: (value: string) => (
              <Tooltip title={formatFullTime(value)}>
                <span className="log-time">{formatTime(value)}</span>
              </Tooltip>
            ),
          } as ColumnsType<LogEntry>[number],
        ]
      : []),
    {
      title: "级别",
      dataIndex: "level",
      width: screens.lg ? 88 : 72,
      render: (value: LogLevel) => levelBadge(value),
    },
    ...(screens.md
      ? [
          {
            title: "事件 ID",
            dataIndex: "eventId",
            width: 82,
            render: (value: number) => (
              <span className="log-event-id">{value}</span>
            ),
          } as ColumnsType<LogEntry>[number],
        ]
      : []),
    ...(screens.lg
      ? [
          {
            title: "来源",
            dataIndex: "provider",
            width: 218,
            render: (value: string, entry: LogEntry) => (
              <div className="log-provider">
                <span>{value || "—"}</span>
                <span className="log-channel">{entry.channel}</span>
              </div>
            ),
          } as ColumnsType<LogEntry>[number],
        ]
      : []),
    {
      title: "消息",
      dataIndex: "message",
      render: (value: string, entry) => (
        <div className="log-message-cell">
          {!showTimeColumn && (
            <span className="log-message-time">{formatFullTime(entry.timestamp)}</span>
          )}
          <span className="log-message" title={value}>
            {value}
          </span>
        </div>
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
            <p>
              读取 Windows 事件通道最近 3 天，按级别与关键字过滤，可导出 CSV
              或清空当前通道。
            </p>
          </div>
          <div className="log-head-meta">
            <Tag bordered={false}>{activeSource?.name ?? "事件日志"}</Tag>
            <Tag bordered={false}>最近 3 天</Tag>
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
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onClear}
              loading={clearing}
            >
              清空日志
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
            pagination={{
              pageSize: 50,
              showSizeChanger: false,
              hideOnSinglePage: true,
              size: "small",
            }}
            loading={loading}
            tableLayout="fixed"
            scroll={screens.lg ? { x: 980 } : undefined}
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
          <span>最近 3 天 · 最多 2000 条 · 清空日志会删除当前通道记录</span>
        </div>
      </section>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width="min(560px, 92vw)"
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
