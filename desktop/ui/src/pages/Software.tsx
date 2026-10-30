import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Skeleton } from "antd";
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
                <div className="software-facts">
                  <div className="software-fact">
                    <span>当前版本</span>
                    <strong>{app.version || "—"}</strong>
                  </div>
                  <div className="software-fact">
                    <span>最近使用</span>
                    <strong>{formatLastUsed(app.lastUsed)}</strong>
                  </div>
                </div>
                <div className="software-foot">
                  <span>安装于 {formatDate(app.installDate)}</span>
                  <span>
                    {app.registryView || "—"}-bit · {app.scope === "user" ? "当前用户" : "所有用户"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="maint-footnote">
          共 {apps.length} 个已安装程序，当前显示 {filtered.length} 个。最近使用来自 Windows
          UserAssist 或程序文件访问时间，系统未记录时显示「未记录」。此页面不提供卸载按钮，避免绕过
          Windows 安装器；请使用「应用和功能」。
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

function formatLastUsed(seconds?: number | null): string {
  if (!seconds) return "未记录";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 3600) return "1 小时内";
  if (diff < 86_400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86_400 * 30) return `${Math.floor(diff / 86_400)} 天前`;
  if (diff < 86_400 * 365) return `${Math.floor(diff / (86_400 * 30))} 个月前`;
  return `${Math.floor(diff / (86_400 * 365))} 年前`;
}

function formatDate(value: string): string {
  if (!value || value.length !== 8) return value || "—";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
