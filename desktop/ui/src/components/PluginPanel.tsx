import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Alert,
  Button,
  Empty,
  Modal,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleFilled,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  openExternalUrl,
  openPluginDirectory,
  pluginCatalog,
  rescanPlugins,
  setPluginEnabled,
} from "../api";
import { ratio } from "../format";
import type {
  PluginCatalog,
  PluginHealthRule,
  PluginInfo,
  PluginWidget,
  PluginWidgetKind,
  SystemSnapshot,
} from "../types";

interface PluginPanelProps {
  snapshot: SystemSnapshot;
}

interface HealthCheck {
  key: string;
  label: string;
  limit: string;
  ok: boolean;
}

const KIND_LABEL: Record<PluginWidgetKind, string> = {
  note: "说明",
  checklist: "清单",
  links: "入口",
  health: "巡检",
};

function iconFor(icon: string | null): ReactNode {
  switch (icon) {
    case "pulse":
      return <ThunderboltOutlined />;
    case "link":
      return <LinkOutlined />;
    case "shield":
      return <SafetyCertificateOutlined />;
    default:
      return <InfoCircleOutlined />;
  }
}

function systemDiskUsage(snapshot: SystemSnapshot): number {
  const disk =
    snapshot.disks.find((item) => /^c:\\/i.test(item.mountPoint)) ??
    snapshot.disks.find((item) => item.mountPoint.startsWith("C:")) ??
    snapshot.disks[0];
  return disk ? ratio(disk.total - disk.available, disk.total) : 0;
}

function healthChecks(rule: PluginHealthRule, snapshot: SystemSnapshot): HealthCheck[] {
  const memory = ratio(snapshot.memoryUsed, snapshot.memoryTotal);
  const checks: HealthCheck[] = [
    {
      key: "memory",
      label: `内存 ${memory.toFixed(0)}%`,
      limit: `阈值 ${rule.memoryMaxPercent}%`,
      ok: memory <= rule.memoryMaxPercent,
    },
    {
      key: "disk",
      label: `系统盘 ${systemDiskUsage(snapshot).toFixed(0)}%`,
      limit: `阈值 ${rule.systemDiskMaxPercent}%`,
      ok: systemDiskUsage(snapshot) <= rule.systemDiskMaxPercent,
    },
  ];
  if (rule.requireElevation) {
    checks.push({
      key: "elevation",
      label: snapshot.isElevated ? "管理员权限" : "标准用户",
      limit: "需要管理员",
      ok: snapshot.isElevated,
    });
  }
  return checks;
}

export default function PluginPanel({ snapshot }: PluginPanelProps) {
  const { message } = AntApp.useApp();
  const [catalog, setCatalog] = useState<PluginCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const load = useCallback(async (rescan = false) => {
    setLoading(true);
    try {
      setCatalog(rescan ? await rescanPlugins() : await pluginCatalog());
    } catch (error) {
      message.error(`读取插件失败：${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePlugin = async (plugin: PluginInfo, enabled: boolean) => {
    setBusy(plugin.id);
    try {
      setCatalog(await setPluginEnabled(plugin.id, enabled));
      message.success(enabled ? `已启用 ${plugin.name}` : `已停用 ${plugin.name}`);
    } catch (error) {
      message.error(`插件操作失败：${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const openDirectory = async () => {
    try {
      const directory = await openPluginDirectory();
      message.success(`已打开插件目录：${directory}`);
    } catch (error) {
      message.error(`无法打开插件目录：${String(error)}`);
    }
  };

  const openLink = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      message.error(`无法打开链接：${String(error)}`);
    }
  };

  const renderWidget = (widget: PluginWidget) => {
    if (widget.kind === "checklist") {
      return (
        <ul className="plugin-items">
          {widget.items.map((item) => (
            <li key={item}>
              <CheckCircleOutlined />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (widget.kind === "links") {
      return (
        <div className="plugin-links">
          {widget.links.map((link) => (
            <Button
              key={link.url}
              size="small"
              icon={<LinkOutlined />}
              onClick={() => void openLink(link.url)}
            >
              {link.label}
            </Button>
          ))}
        </div>
      );
    }

    if (widget.kind === "health" && widget.health) {
      return (
        <div className="plugin-checks">
          {healthChecks(widget.health, snapshot).map((check) => (
            <div className={`plugin-check${check.ok ? " ok" : " warn"}`} key={check.key}>
              {check.ok ? <CheckCircleFilled /> : <CloseCircleFilled />}
              <span>{check.label}</span>
              <em>{check.limit}</em>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (!catalog) {
    return (
      <section className="panel plugin-panel">
        <div className="panel-head">
          <div>
            <h3>插件台</h3>
            <p>由插件声明，宿主只渲染可信数据</p>
          </div>
        </div>
        <Skeleton active paragraph={{ rows: 2 }} />
      </section>
    );
  }

  const enabledPlugins = catalog.plugins.filter((plugin) => plugin.enabled);
  const widgets = enabledPlugins.flatMap((plugin) =>
    plugin.widgets.map((widget) => ({ plugin, widget })),
  );

  return (
    <section className="panel plugin-panel">
      <div className="panel-head">
        <div>
          <h3>插件台</h3>
          <p>声明式插件，不执行第三方代码</p>
        </div>
        <div className="plugin-toolbar">
          <span className="panel-hint">{enabledPlugins.length} 个启用</span>
          <Button size="small" icon={<AppstoreOutlined />} onClick={() => setManagerOpen(true)}>
            插件管理
          </Button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="plugin-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无启用的插件卡片" />
          <Button onClick={() => setManagerOpen(true)}>管理插件</Button>
        </div>
      ) : (
        <div className="plugin-grid">
          {widgets.map(({ plugin, widget }) => (
            <article className={`plugin-card plugin-card--${widget.kind}`} key={`${plugin.id}:${widget.id}`}>
              <div className="plugin-card-head">
                <span className="plugin-avatar">{iconFor(plugin.icon)}</span>
                <div className="plugin-title">
                  <strong>{widget.title}</strong>
                  <span>
                    {plugin.name} · v{plugin.version}
                  </span>
                </div>
                <Tooltip title={plugin.enabled ? "停用插件" : "启用插件"}>
                  <Switch
                    size="small"
                    checked={plugin.enabled}
                    loading={busy === plugin.id}
                    onChange={(checked) => void togglePlugin(plugin, checked)}
                  />
                </Tooltip>
              </div>

              {widget.body && <p className="plugin-body">{widget.body}</p>}
              {renderWidget(widget)}

              <div className="plugin-card-foot">
                <span className={`plugin-kind plugin-kind--${widget.kind}`}>
                  {KIND_LABEL[widget.kind]}
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => setManagerOpen(true)}
                >
                  管理
                </Button>
              </div>
            </article>
          ))}

          {widgets.length <= 1 && (
            <button type="button" className="plugin-add" onClick={() => setManagerOpen(true)}>
              <span className="plugin-add-icon">
                <PlusOutlined />
              </span>
              <strong>接入更多插件</strong>
              <span>把 plugin.json 放进插件目录，重新扫描后出现在概览。</span>
              <em>打开插件管理</em>
            </button>
          )}
        </div>
      )}

      <Modal
        open={managerOpen}
        title={
          <span className="plugin-modal-title">
            <AppstoreOutlined /> 插件管理
          </span>
        }
        width={760}
        onCancel={() => setManagerOpen(false)}
        footer={[
          <Button key="directory" icon={<FolderOpenOutlined />} onClick={() => void openDirectory()}>
            打开插件目录
          </Button>,
          <Button
            key="rescan"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void load(true)}
          >
            重新扫描
          </Button>,
          <Button key="done" type="primary" onClick={() => setManagerOpen(false)}>
            完成
          </Button>,
        ]}
      >
        <p className="plugin-manager-lead">
          把包含 <code>plugin.json</code> 的文件夹放进插件目录，然后点「重新扫描」。插件只能声明卡片，不能执行脚本。
        </p>

        {catalog.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            className="plugin-warnings"
            message={`${catalog.warnings.length} 个插件未加载`}
            description={
              <ul>
                {catalog.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            }
          />
        )}

        <div className="plugin-manager-list">
          {catalog.plugins.map((plugin) => (
            <div className="plugin-manager-row" key={plugin.id}>
              <span className="plugin-avatar plugin-avatar--small">{iconFor(plugin.icon)}</span>
              <div className="plugin-manager-main">
                <div className="plugin-manager-title">
                  <strong>{plugin.name}</strong>
                  <Tag bordered={false}>v{plugin.version}</Tag>
                  {plugin.builtin && <Tag bordered={false}>内置</Tag>}
                </div>
                <p>{plugin.description || "未提供说明"}</p>
                <code title={plugin.path}>{plugin.path}</code>
              </div>
              <Switch
                checked={plugin.enabled}
                loading={busy === plugin.id}
                onChange={(checked) => void togglePlugin(plugin, checked)}
              />
            </div>
          ))}
        </div>

        {catalog.plugins.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="插件目录为空" />
        )}

        <div className="plugin-directory">
          <span>插件目录</span>
          <code title={catalog.directory}>{catalog.directory}</code>
        </div>
      </Modal>
    </section>
  );
}
