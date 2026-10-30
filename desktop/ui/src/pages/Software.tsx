import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Skeleton, Tag } from "antd";
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
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : filtered.length === 0 ? (
          <Empty description={keyword ? "没有匹配的软件" : "未发现已安装软件"} />
        ) : (
          <div className="software-grid">
            {filtered.map((app) => (
              <article
                className="software-card"
                key={app.id}
                title={app.installLocation || app.name}
              >
                <div className="software-card-head">
                  <SoftwareIcon app={app} />
                  <div className="software-heading">
                    <strong title={app.name}>{app.name}</strong>
                    <span title={app.publisher}>{app.publisher || "未知发布者"}</span>
                  </div>
                </div>
                <div className="software-meta">
                  <span className="software-version">{app.version || "—"}</span>
                  <Tag bordered={false}>{app.registryView || "—"}-bit</Tag>
                </div>
                <div className="software-foot">
                  <span>{formatDate(app.installDate)}</span>
                  <span>{app.scope === "user" ? "当前用户" : "所有用户"}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="maint-footnote">
          共 {apps.length} 个已安装程序，当前显示 {filtered.length} 个。此页面不提供卸载按钮，避免绕过 Windows
          安装器；请使用「应用和功能」。
        </div>
      </section>
    </div>
  );
}

function SoftwareIcon({ app }: { app: InstalledApp }) {
  const [failed, setFailed] = useState(false);
  if (app.icon && !failed) {
    return (
      <span className="software-icon software-icon-image">
        <img src={app.icon} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return <span className="software-icon">{app.name.slice(0, 1).toUpperCase()}</span>;
}

function formatDate(value: string): string {
  if (!value || value.length !== 8) return value || "—";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
