import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Skeleton, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AppstoreOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { openAppsFeatures, softwareList } from "../api";
import type { InstalledApp } from "../types";
import "../maintenance.css";

export default function SoftwarePage() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setApps(await softwareList());
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const keyword = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      apps.filter(
        (app) =>
          !keyword ||
          app.name.toLowerCase().includes(keyword) ||
          app.publisher.toLowerCase().includes(keyword) ||
          app.version.toLowerCase().includes(keyword),
      ),
    [apps, keyword],
  );

  const columns: ColumnsType<InstalledApp> = [
    {
      title: "应用",
      dataIndex: "name",
      render: (_, app) => (
        <div className="maint-primary">
          <strong>{app.name}</strong>
          <span>{app.publisher || "未知发布者"}</span>
        </div>
      ),
    },
    {
      title: "版本",
      dataIndex: "version",
      width: 150,
      render: (value: string) => <span className="maint-mono">{value || "—"}</span>,
    },
    {
      title: "安装日期",
      dataIndex: "installDate",
      width: 130,
      render: (value: string) => <span className="maint-muted">{formatDate(value)}</span>,
    },
    {
      title: "范围",
      dataIndex: "scope",
      width: 110,
      render: (value: InstalledApp["scope"]) => (
        <Tag bordered={false}>{value === "user" ? "当前用户" : "所有用户"}</Tag>
      ),
    },
    {
      title: "架构",
      dataIndex: "registryView",
      width: 100,
      render: (value: string) => <span className="maint-muted">{value || "—"}</span>,
    },
    {
      title: "安装位置",
      dataIndex: "installLocation",
      ellipsis: true,
      render: (value: string) => (
        <span className="maint-muted" title={value}>
          {value || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="page-stack maintenance-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>已安装程序</h2>
            <p>汇总注册表中的已安装程序；卸载仍由 Windows「应用和功能」统一处理。</p>
          </div>
          <div className="panel-actions">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索名称、发布者或版本"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<AppstoreOutlined />}
              onClick={() => void openAppsFeatures().catch((cause) => setError(String(cause)))}
            >
              打开应用和功能
            </Button>
          </div>
        </div>

        {error && <Alert type="error" showIcon message="读取失败" description={error} />}

        {loading ? (
          <Skeleton active paragraph={{ rows: 7 }} />
        ) : filtered.length === 0 ? (
          <Empty description={keyword ? "没有匹配的软件" : "未发现已安装软件"} />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 14, showSizeChanger: false }}
            scroll={{ x: 980 }}
          />
        )}

        <div className="maint-footnote">
          共 {apps.length} 个已安装程序。此页面不提供卸载按钮，避免绕过 Windows 安装器；请使用「应用和功能」。
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value || value.length !== 8) return value || "—";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
