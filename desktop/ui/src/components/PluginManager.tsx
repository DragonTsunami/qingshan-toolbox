import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  installPlugin,
  installPluginFromPath,
  openExternalUrl,
  openPluginDirectory,
  pluginCatalog,
  pluginMarket,
  removePlugin,
  rescanPlugins,
  setPluginEnabled,
} from "../api";
import type {
  PluginCatalog,
  PluginInfo,
  PluginMarketEntry,
  PluginWidgetKind,
} from "../types";
import type { ReactNode } from "react";

type TabKey = "installed" | "discover";
type Selected = { kind: "plugin" | "market"; id: string } | null;

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
      return <AppstoreOutlined />;
  }
}

function pluginMatches(plugin: PluginInfo, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [plugin.name, plugin.id, plugin.description, ...plugin.tags]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function marketMatches(entry: PluginMarketEntry, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [entry.name, entry.id, entry.description, entry.author, ...entry.tags]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

interface PluginManagerProps {
  onChanged?: () => void;
}

export default function PluginManager({ onChanged }: PluginManagerProps) {
  const { message, modal } = AntApp.useApp();
  const [catalog, setCatalog] = useState<PluginCatalog | null>(null);
  const [market, setMarket] = useState<PluginMarketEntry[]>([]);
  const [tab, setTab] = useState<TabKey>("installed");
  const [selected, setSelected] = useState<Selected>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installMode, setInstallMode] = useState<"path" | "market">("path");
  const [installPath, setInstallPath] = useState("");
  const [installing, setInstalling] = useState(false);

  const reload = useCallback(
    async (rescan = false) => {
      setLoading(true);
      try {
        const [nextCatalog, nextMarket] = await Promise.all([
          rescan ? rescanPlugins() : pluginCatalog(),
          pluginMarket(),
        ]);
        setCatalog(nextCatalog);
        setMarket(nextMarket);
      } catch (error) {
        message.error(`读取插件失败：${String(error)}`);
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const plugins = catalog?.plugins ?? [];
  const builtins = useMemo(() => plugins.filter((plugin) => plugin.builtin), [plugins]);
  const installed = useMemo(() => plugins.filter((plugin) => !plugin.builtin), [plugins]);
  const categories = useMemo(() => {
    const tags = new Set<string>();
    market.forEach((entry) => entry.tags.forEach((tag) => tags.add(tag)));
    return ["全部", ...Array.from(tags)];
  }, [market]);

  const visibleInstalled = installed.filter((plugin) => pluginMatches(plugin, query));
  const visibleMarket = market.filter(
    (entry) =>
      marketMatches(entry, query) && (category === "全部" || entry.tags.includes(category)),
  );

  const selectedPlugin =
    selected?.kind === "plugin" ? plugins.find((plugin) => plugin.id === selected.id) : undefined;
  const selectedMarket =
    selected?.kind === "market" ? market.find((entry) => entry.id === selected.id) : undefined;

  const toggle = async (plugin: PluginInfo, enabled: boolean) => {
    setBusy(plugin.id);
    try {
      const next = await setPluginEnabled(plugin.id, enabled);
      setCatalog(next);
      message.success(enabled ? `已启用 ${plugin.name}` : `已停用 ${plugin.name}`);
      onChanged?.();
    } catch (error) {
      message.error(`插件操作失败：${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const installFromCatalog = async (entry: PluginMarketEntry) => {
    setBusy(entry.id);
    try {
      const next = await installPlugin(entry.id);
      setCatalog(next);
      setMarket(await pluginMarket());
      message.success(`已安装 ${entry.name}，可在「已安装」中启用`);
      setTab("installed");
      setSelected({ kind: "plugin", id: entry.id });
      onChanged?.();
    } catch (error) {
      message.error(`安装失败：${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const submitPath = async () => {
    if (!installPath.trim()) {
      message.warning("请输入包含 plugin.json 的文件夹");
      return;
    }
    setInstalling(true);
    try {
      const next = await installPluginFromPath(installPath);
      setCatalog(next);
      setMarket(await pluginMarket());
      setInstallOpen(false);
      setInstallPath("");
      setTab("installed");
      message.success("插件已安装");
      onChanged?.();
    } catch (error) {
      message.error(`安装失败：${String(error)}`);
    } finally {
      setInstalling(false);
    }
  };

  const confirmRemove = (plugin: PluginInfo) => {
    modal.confirm({
      title: `移除 ${plugin.name}？`,
      content: "插件文件会从插件目录删除，启用状态也会一并清理。",
      okText: "移除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setBusy(plugin.id);
        try {
          const next = await removePlugin(plugin.id);
          setCatalog(next);
          setMarket(await pluginMarket());
          setSelected(null);
          message.success(`已移除 ${plugin.name}`);
          onChanged?.();
        } catch (error) {
          message.error(`移除失败：${String(error)}`);
          throw error;
        } finally {
          setBusy(null);
        }
      },
    });
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

  const renderIcon = (icon: string | null) => (
    <span className="pm-card-icon">{iconFor(icon)}</span>
  );

  const renderCard = (plugin: PluginInfo) => (
    <li className="pm-card" key={plugin.id}>
      {renderIcon(plugin.icon)}
      <div className="pm-card-main">
        <div className="pm-card-title-row">
          <button
            type="button"
            className="pm-card-title"
            onClick={() => setSelected({ kind: "plugin", id: plugin.id })}
          >
            {plugin.name}
          </button>
          <Tag bordered={false} className="pm-tag">
            v{plugin.version}
          </Tag>
          {plugin.builtin && (
            <Tag bordered={false} className="pm-tag pm-tag--muted">
              内置
            </Tag>
          )}
        </div>
        <div className="pm-card-desc">{plugin.description || "未提供说明"}</div>
      </div>
      <div className="pm-card-end">
        <Tooltip title={plugin.enabled ? "停用插件" : "启用插件"}>
          <Switch
            size="small"
            checked={plugin.enabled}
            loading={busy === plugin.id}
            onChange={(checked) => void toggle(plugin, checked)}
          />
        </Tooltip>
        <RightOutlined
          className="pm-card-arrow"
          onClick={() => setSelected({ kind: "plugin", id: plugin.id })}
        />
      </div>
    </li>
  );

  const renderMarketCard = (entry: PluginMarketEntry) => (
    <li className="pm-card pm-card--market" key={entry.id}>
      {renderIcon(entry.icon)}
      <div className="pm-card-main">
        <div className="pm-card-title-row">
          <button
            type="button"
            className="pm-card-title"
            onClick={() => setSelected({ kind: "market", id: entry.id })}
          >
            {entry.name}
          </button>
          <Tag bordered={false} className="pm-tag">
            v{entry.version}
          </Tag>
          {entry.official && (
            <Tag bordered={false} className="pm-tag pm-tag--muted">
              官方
            </Tag>
          )}
          {entry.tags.slice(0, 3).map((tag) => (
            <Tag bordered={false} className="pm-tag pm-tag--muted" key={tag}>
              {tag}
            </Tag>
          ))}
        </div>
        <div className="pm-card-desc">{entry.description}</div>
        <div className="pm-card-meta">
          {entry.author || "未知作者"} · v{entry.version}
        </div>
      </div>
      <div className="pm-card-end">
        {entry.installed ? (
          <Button
            size="small"
            onClick={() => {
              setTab("installed");
              setSelected({ kind: "plugin", id: entry.id });
            }}
          >
            已安装
          </Button>
        ) : (
          <Button
            type="primary"
            size="small"
            loading={busy === entry.id}
            onClick={() => void installFromCatalog(entry)}
          >
            安装
          </Button>
        )}
      </div>
    </li>
  );

  const renderDetail = () => {
    if (selectedPlugin) {
      const plugin = selectedPlugin;
      return (
        <div className="pm-detail">
          <button type="button" className="pm-back" onClick={() => setSelected(null)}>
            <LeftOutlined /> 返回插件
          </button>
          <div className="pm-detail-head">
            {renderIcon(plugin.icon)}
            <div className="pm-detail-heading">
              <div className="pm-card-title-row">
                <h2>{plugin.name}</h2>
                <Tag bordered={false} className="pm-tag">
                  v{plugin.version}
                </Tag>
                {plugin.builtin && (
                  <Tag bordered={false} className="pm-tag pm-tag--muted">
                    内置
                  </Tag>
                )}
              </div>
              <p>{plugin.description || "未提供说明"}</p>
            </div>
            <Switch
              checked={plugin.enabled}
              loading={busy === plugin.id}
              onChange={(checked) => void toggle(plugin, checked)}
            />
          </div>

          <section className="pm-detail-section">
            <h3>来源信息</h3>
            <dl className="pm-facts">
              <div>
                <dt>包名</dt>
                <dd>
                  <code>{plugin.id}</code>
                </dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>{plugin.version}</dd>
              </div>
              <div>
                <dt>作者</dt>
                <dd>{plugin.author || "未提供"}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{plugin.builtin ? "内置" : "本地安装"}</dd>
              </div>
              <div>
                <dt>位置</dt>
                <dd>
                  <code title={plugin.path}>{plugin.path}</code>
                </dd>
              </div>
              {plugin.homepage && (
                <div>
                  <dt>主页</dt>
                  <dd>
                    <button type="button" className="pm-link" onClick={() => void openLink(plugin.homepage!)}>
                      {plugin.homepage}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="pm-detail-section">
            <h3>组件</h3>
            {plugin.widgets.length === 0 ? (
              <p className="pm-muted">此插件没有声明组件。</p>
            ) : (
              <ul className="pm-rows">
                {plugin.widgets.map((widget) => (
                  <li className="pm-row" key={widget.id}>
                    <span className="pm-row-icon">{iconFor(plugin.icon)}</span>
                    <div className="pm-row-main">
                      <div className="pm-row-title">{widget.title}</div>
                      <div className="pm-row-desc">{widget.body || KIND_LABEL[widget.kind]}</div>
                    </div>
                    <Tag bordered={false} className="pm-tag pm-tag--muted">
                      {KIND_LABEL[widget.kind]}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!plugin.builtin && (
            <div className="pm-detail-actions">
              <Button danger icon={<DeleteOutlined />} onClick={() => confirmRemove(plugin)}>
                移除插件
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (selectedMarket) {
      const entry = selectedMarket;
      return (
        <div className="pm-detail">
          <button type="button" className="pm-back" onClick={() => setSelected(null)}>
            <LeftOutlined /> 返回发现
          </button>
          <div className="pm-detail-head">
            {renderIcon(entry.icon)}
            <div className="pm-detail-heading">
              <div className="pm-card-title-row">
                <h2>{entry.name}</h2>
                <Tag bordered={false} className="pm-tag">
                  v{entry.version}
                </Tag>
                {entry.tags.map((tag) => (
                  <Tag bordered={false} className="pm-tag pm-tag--muted" key={tag}>
                    {tag}
                  </Tag>
                ))}
              </div>
              <p>{entry.description}</p>
            </div>
            {entry.installed ? (
              <Button
                onClick={() => {
                  setTab("installed");
                  setSelected({ kind: "plugin", id: entry.id });
                }}
              >
                已安装
              </Button>
            ) : (
              <Button
                type="primary"
                loading={busy === entry.id}
                onClick={() => void installFromCatalog(entry)}
              >
                安装
              </Button>
            )}
          </div>

          <section className="pm-detail-section">
            <h3>版本信息</h3>
            <dl className="pm-facts">
              <div>
                <dt>包名</dt>
                <dd>
                  <code>{entry.id}</code>
                </dd>
              </div>
              <div>
                <dt>默认版本</dt>
                <dd>{entry.version}</dd>
              </div>
              <div>
                <dt>作者</dt>
                <dd>{entry.author || "未提供"}</dd>
              </div>
              {entry.homepage && (
                <div>
                  <dt>主页</dt>
                  <dd>
                    <button type="button" className="pm-link" onClick={() => void openLink(entry.homepage!)}>
                      {entry.homepage}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      );
    }

    return null;
  };

  if (!catalog && loading) {
    return (
      <div className="pm-page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const showDetail = selected !== null;

  return (
    <div className="pm-page">
      <header className="pm-head">
        <div className="pm-heading">
          <div className="pm-title-row">
            <h1 className="pm-title">插件</h1>
            <Tooltip title="配置官方插件、安装和管理其他插件。插件只声明数据，不执行第三方代码。">
              <button type="button" className="pm-icon-button" aria-label="插件说明">
                <InfoCircleOutlined />
              </button>
            </Tooltip>
          </div>
          <p className="pm-subtitle">配置官方插件、安装和管理其他插件。</p>
        </div>
        {!showDetail && (
          <div className="pm-actions">
            <Tooltip title="刷新插件列表">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() => void reload(true)}
              />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInstallOpen(true)}>
              添加插件
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: "path", label: "从本地目录安装" },
                  { key: "market", label: "从插件市场安装" },
                  { type: "divider" },
                  { key: "directory", label: "打开插件目录" },
                ],
                onClick: ({ key }) => {
                  if (key === "directory") {
                    void openDirectory();
                    return;
                  }
                  setInstallMode(key === "market" ? "market" : "path");
                  setInstallOpen(true);
                },
              }}
              trigger={["click"]}
            >
              <Button type="primary" className="pm-split-arrow" icon={<DownOutlined />} />
            </Dropdown>
          </div>
        )}
      </header>

      {showDetail ? (
        renderDetail()
      ) : (
        <>
          <div className="pm-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "installed"}
              className={`pm-tab${tab === "installed" ? " is-active" : ""}`}
              onClick={() => {
                setTab("installed");
                setSelected(null);
              }}
            >
              已安装
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "discover"}
              className={`pm-tab${tab === "discover" ? " is-active" : ""}`}
              onClick={() => {
                setTab("discover");
                setSelected(null);
              }}
            >
              发现
            </button>
          </div>

          {catalog && catalog.warnings.length > 0 && (
            <div className="pm-notice">
              <InfoCircleOutlined />
              <span>{catalog.warnings.length} 个插件未加载：{catalog.warnings[0]}</span>
            </div>
          )}

          {tab === "installed" ? (
            <div className="pm-tab-panel">
              {builtins.length > 0 && (
                <section className="pm-group">
                  <div className="pm-group-head">
                    <h2 className="pm-group-title">内置插件配置</h2>
                    <span className="pm-group-count">{builtins.length}</span>
                  </div>
                  <ul className="pm-cards">{builtins.map(renderCard)}</ul>
                </section>
              )}

              <section className="pm-group">
                <div className="pm-group-head">
                  <h2 className="pm-group-title">已安装插件</h2>
                  <span className="pm-group-count">{visibleInstalled.length}</span>
                </div>
                {visibleInstalled.length === 0 ? (
                  <div className="pm-empty">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="还没有安装其他插件"
                    />
                    <Button
                      type="primary"
                      onClick={() => {
                        setTab("discover");
                        setSelected(null);
                      }}
                    >
                      去发现插件
                    </Button>
                  </div>
                ) : (
                  <ul className="pm-cards">{visibleInstalled.map(renderCard)}</ul>
                )}
              </section>
            </div>
          ) : (
            <div className="pm-tab-panel">
              <div className="pm-toolbar">
                <Input
                  allowClear
                  className="pm-search"
                  prefix={<SearchOutlined />}
                  placeholder="搜索插件、作者或标签"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className="pm-chips">
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={`pm-chip${category === item ? " is-active" : ""}`}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {visibleMarket.length === 0 ? (
                <div className="pm-empty">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的插件" />
                </div>
              ) : (
                <ul className="pm-cards">{visibleMarket.map(renderMarketCard)}</ul>
              )}
            </div>
          )}

          <div className="pm-foot">
            <span>
              <CheckCircleOutlined /> 插件目录：<code>{catalog?.directory ?? ""}</code>
            </span>
            <Button size="small" type="text" icon={<FolderOpenOutlined />} onClick={() => void openDirectory()}>
              打开目录
            </Button>
          </div>
        </>
      )}

      <Modal
        title="添加插件"
        open={installOpen}
        width={560}
        onCancel={() => setInstallOpen(false)}
        footer={[
          <Button key="directory" icon={<FolderOpenOutlined />} onClick={() => void openDirectory()}>
            打开插件目录
          </Button>,
          <Button key="cancel" onClick={() => setInstallOpen(false)}>
            取消
          </Button>,
          <Button
            key="install"
            type="primary"
            loading={installing}
            disabled={installMode === "path" && !installPath.trim()}
            onClick={() => {
              if (installMode === "path") {
                void submitPath();
              } else {
                setInstallOpen(false);
                setTab("discover");
              }
            }}
          >
            {installMode === "path" ? "安装" : "去发现"}
          </Button>,
        ]}
      >
        <div className="pm-install">
          <div className="pm-install-modes">
            <button
              type="button"
              className={`pm-chip${installMode === "path" ? " is-active" : ""}`}
              onClick={() => setInstallMode("path")}
            >
              本地目录
            </button>
            <button
              type="button"
              className={`pm-chip${installMode === "market" ? " is-active" : ""}`}
              onClick={() => setInstallMode("market")}
            >
              插件市场
            </button>
          </div>

          {installMode === "path" ? (
            <>
              <p className="pm-muted">
                输入包含 <code>plugin.json</code> 的文件夹绝对路径。插件会被复制到插件目录，不会执行脚本。
              </p>
              <Input
                value={installPath}
                onChange={(event) => setInstallPath(event.target.value)}
                placeholder="C:\\path\\to\\my-plugin"
                onPressEnter={() => void submitPath()}
              />
            </>
          ) : (
            <p className="pm-muted">
              在「发现」页浏览随应用提供的插件。安装后可在「已安装」中启用或移除。
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
