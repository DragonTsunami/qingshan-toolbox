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
import { useI18n } from "../i18n";
import type {
  PluginCatalog,
  PluginInfo,
  PluginMarketEntry,
  PluginWidgetKind,
} from "../types";
import type { ReactNode } from "react";

type TabKey = "installed" | "discover";
type Selected = { kind: "plugin" | "market"; id: string } | null;

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
  const { t, language } = useI18n();
  const [catalog, setCatalog] = useState<PluginCatalog | null>(null);
  const [market, setMarket] = useState<PluginMarketEntry[]>([]);
  const [tab, setTab] = useState<TabKey>("installed");
  const [selected, setSelected] = useState<Selected>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installMode, setInstallMode] = useState<"path" | "market">("path");
  const [installPath, setInstallPath] = useState("");
  const [installing, setInstalling] = useState(false);

  const kindLabel: Record<PluginWidgetKind, string> = useMemo(
    () => ({
      note: language === "en-US" ? "Note" : "说明",
      checklist: language === "en-US" ? "Checklist" : "清单",
      links: language === "en-US" ? "Links" : "入口",
      health: language === "en-US" ? "Health" : "巡检",
    }),
    [language],
  );

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
        message.error(
          language === "en-US"
            ? `Failed to load plugins: ${String(error)}`
            : `读取插件失败：${String(error)}`
        );
      } finally {
        setLoading(false);
      }
    },
    [message, language],
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
    return ["all", ...Array.from(tags)];
  }, [market]);

  const visibleInstalled = installed.filter((plugin) => pluginMatches(plugin, query));
  const visibleMarket = market.filter(
    (entry) =>
      marketMatches(entry, query) && (category === "all" || entry.tags.includes(category)),
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
      message.success(
        enabled
          ? (language === "en-US" ? `Enabled ${plugin.name}` : `已启用 ${plugin.name}`)
          : (language === "en-US" ? `Disabled ${plugin.name}` : `已停用 ${plugin.name}`)
      );
      onChanged?.();
    } catch (error) {
      message.error(
        language === "en-US"
          ? `Plugin operation failed: ${String(error)}`
          : `插件操作失败：${String(error)}`
      );
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
      message.success(
        language === "en-US"
          ? `Installed ${entry.name}. You can enable it in "Installed"`
          : `已安装 ${entry.name}，可在「已安装」中启用`
      );
      setTab("installed");
      setSelected({ kind: "plugin", id: entry.id });
      onChanged?.();
    } catch (error) {
      message.error(
        language === "en-US"
          ? `Installation failed: ${String(error)}`
          : `安装失败：${String(error)}`
      );
    } finally {
      setBusy(null);
    }
  };

  const submitPath = async () => {
    if (!installPath.trim()) {
      message.warning(
        language === "en-US"
          ? "Please enter a folder path containing plugin.json"
          : "请输入包含 plugin.json 的文件夹"
      );
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
      message.success(language === "en-US" ? "Plugin installed" : "插件已安装");
      onChanged?.();
    } catch (error) {
      message.error(
        language === "en-US"
          ? `Installation failed: ${String(error)}`
          : `安装失败：${String(error)}`
      );
    } finally {
      setInstalling(false);
    }
  };

  const confirmRemove = (plugin: PluginInfo) => {
    modal.confirm({
      title: language === "en-US" ? `Remove ${plugin.name}?` : `移除 ${plugin.name}？`,
      content:
        language === "en-US"
          ? "Plugin files will be deleted from the directory and state cleared."
          : "插件文件会从插件目录删除，启用状态也会一并清理。",
      okText: language === "en-US" ? "Remove" : "移除",
      okButtonProps: { danger: true },
      cancelText: t("取消"),
      onOk: async () => {
        setBusy(plugin.id);
        try {
          const next = await removePlugin(plugin.id);
          setCatalog(next);
          setMarket(await pluginMarket());
          setSelected(null);
          message.success(
            language === "en-US" ? `Removed ${plugin.name}` : `已移除 ${plugin.name}`
          );
          onChanged?.();
        } catch (error) {
          message.error(
            language === "en-US"
              ? `Remove failed: ${String(error)}`
              : `移除失败：${String(error)}`
          );
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
      message.success(
        language === "en-US"
          ? `Opened plugins directory: ${directory}`
          : `已打开插件目录：${directory}`
      );
    } catch (error) {
      message.error(
        language === "en-US"
          ? `Cannot open plugins directory: ${String(error)}`
          : `无法打开插件目录：${String(error)}`
      );
    }
  };

  const openLink = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      message.error(
        language === "en-US"
          ? `Cannot open link: ${String(error)}`
          : `无法打开链接：${String(error)}`
      );
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
              {language === "en-US" ? "Built-in" : "内置"}
            </Tag>
          )}
        </div>
        <div className="pm-card-desc">
          {plugin.description || (language === "en-US" ? "No description" : "未提供说明")}
        </div>
      </div>
      <div className="pm-card-end">
        <Tooltip
          title={
            plugin.enabled
              ? (language === "en-US" ? "Disable plugin" : "停用插件")
              : (language === "en-US" ? "Enable plugin" : "启用插件")
          }
        >
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
              {language === "en-US" ? "Official" : "官方"}
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
          {entry.author || (language === "en-US" ? "Unknown author" : "未知作者")} · v{entry.version}
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
            {t("已安装")}
          </Button>
        ) : (
          <Button
            type="primary"
            size="small"
            loading={busy === entry.id}
            onClick={() => void installFromCatalog(entry)}
          >
            {t("安装")}
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
            <LeftOutlined /> {language === "en-US" ? "Back to Plugins" : "返回插件"}
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
                    {language === "en-US" ? "Built-in" : "内置"}
                  </Tag>
                )}
              </div>
              <p>{plugin.description || (language === "en-US" ? "No description" : "未提供说明")}</p>
            </div>
            <Switch
              checked={plugin.enabled}
              loading={busy === plugin.id}
              onChange={(checked) => void toggle(plugin, checked)}
            />
          </div>

          <section className="pm-detail-section">
            <h3>{language === "en-US" ? "Package Information" : "来源信息"}</h3>
            <dl className="pm-facts">
              <div>
                <dt>{language === "en-US" ? "Package ID" : "包名"}</dt>
                <dd>
                  <code>{plugin.id}</code>
                </dd>
              </div>
              <div>
                <dt>{t("版本")}</dt>
                <dd>{plugin.version}</dd>
              </div>
              <div>
                <dt>{t("作者")}</dt>
                <dd>{plugin.author || (language === "en-US" ? "Not provided" : "未提供")}</dd>
              </div>
              <div>
                <dt>{t("来源")}</dt>
                <dd>
                  {plugin.builtin
                    ? (language === "en-US" ? "Built-in" : "内置")
                    : (language === "en-US" ? "Locally Installed" : "本地安装")}
                </dd>
              </div>
              <div>
                <dt>{t("位置")}</dt>
                <dd>
                  <code title={plugin.path}>{plugin.path}</code>
                </dd>
              </div>
              {plugin.homepage && (
                <div>
                  <dt>{language === "en-US" ? "Homepage" : "主页"}</dt>
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
            <h3>{language === "en-US" ? "Widgets" : "组件"}</h3>
            {plugin.widgets.length === 0 ? (
              <p className="pm-muted">
                {language === "en-US" ? "This plugin declares no widgets." : "此插件没有声明组件。"}
              </p>
            ) : (
              <ul className="pm-rows">
                {plugin.widgets.map((widget) => (
                  <li className="pm-row" key={widget.id}>
                    <span className="pm-row-icon">{iconFor(plugin.icon)}</span>
                    <div className="pm-row-main">
                      <div className="pm-row-title">{widget.title}</div>
                      <div className="pm-row-desc">{widget.body || kindLabel[widget.kind]}</div>
                    </div>
                    <Tag bordered={false} className="pm-tag pm-tag--muted">
                      {kindLabel[widget.kind]}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!plugin.builtin && (
            <div className="pm-detail-actions">
              <Button danger icon={<DeleteOutlined />} onClick={() => confirmRemove(plugin)}>
                {language === "en-US" ? "Remove Plugin" : "移除插件"}
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
            <LeftOutlined /> {language === "en-US" ? "Back to Marketplace" : "返回发现"}
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
                {t("已安装")}
              </Button>
            ) : (
              <Button
                type="primary"
                loading={busy === entry.id}
                onClick={() => void installFromCatalog(entry)}
              >
                {t("安装")}
              </Button>
            )}
          </div>

          <section className="pm-detail-section">
            <h3>{language === "en-US" ? "Version Details" : "版本信息"}</h3>
            <dl className="pm-facts">
              <div>
                <dt>{language === "en-US" ? "Package ID" : "包名"}</dt>
                <dd>
                  <code>{entry.id}</code>
                </dd>
              </div>
              <div>
                <dt>{language === "en-US" ? "Default Version" : "默认版本"}</dt>
                <dd>{entry.version}</dd>
              </div>
              <div>
                <dt>{t("作者")}</dt>
                <dd>{entry.author || (language === "en-US" ? "Not provided" : "未提供")}</dd>
              </div>
              {entry.homepage && (
                <div>
                  <dt>{language === "en-US" ? "Homepage" : "主页"}</dt>
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
            <h1 className="pm-title">{t("插件")}</h1>
            <Tooltip
              title={
                language === "en-US"
                  ? "Configure official and custom plugins. Plugins only declare data without executing arbitrary code."
                  : "配置官方插件、安装和管理其他插件。插件只声明数据，不执行第三方代码。"
              }
            >
              <button
                type="button"
                className="pm-icon-button"
                aria-label={language === "en-US" ? "Plugin Info" : "插件说明"}
              >
                <InfoCircleOutlined />
              </button>
            </Tooltip>
          </div>
          <p className="pm-subtitle">
            {language === "en-US"
              ? "Configure official plugins, install and manage workbench extensions."
              : "配置官方插件、安装和管理其他插件。"}
          </p>
        </div>
        {!showDetail && (
          <div className="pm-actions">
            <Tooltip title={language === "en-US" ? "Refresh plugin list" : "刷新插件列表"}>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() => void reload(true)}
              />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInstallOpen(true)}>
              {language === "en-US" ? "Add Plugin" : "添加插件"}
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "path",
                    label: language === "en-US" ? "Install from Local Folder" : "从本地目录安装",
                  },
                  {
                    key: "market",
                    label: language === "en-US" ? "Install from Marketplace" : "从插件市场安装",
                  },
                  { type: "divider" },
                  {
                    key: "directory",
                    label: language === "en-US" ? "Open Plugins Directory" : "打开插件目录",
                  },
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
              {language === "en-US" ? "Installed" : "已安装"}
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
              {language === "en-US" ? "Marketplace" : "发现"}
            </button>
          </div>

          {catalog && catalog.warnings.length > 0 && (
            <div className="pm-notice">
              <InfoCircleOutlined />
              <span>
                {language === "en-US"
                  ? `${catalog.warnings.length} plugin(s) failed to load: ${catalog.warnings[0]}`
                  : `${catalog.warnings.length} 个插件未加载：${catalog.warnings[0]}`}
              </span>
            </div>
          )}

          {tab === "installed" ? (
            <div className="pm-tab-panel">
              {builtins.length > 0 && (
                <section className="pm-group">
                  <div className="pm-group-head">
                    <h2 className="pm-group-title">
                      {language === "en-US" ? "Built-in Plugins" : "内置插件配置"}
                    </h2>
                    <span className="pm-group-count">{builtins.length}</span>
                  </div>
                  <ul className="pm-cards">{builtins.map(renderCard)}</ul>
                </section>
              )}

              <section className="pm-group">
                <div className="pm-group-head">
                  <h2 className="pm-group-title">
                    {language === "en-US" ? "Installed Plugins" : "已安装插件"}
                  </h2>
                  <span className="pm-group-count">{visibleInstalled.length}</span>
                </div>
                {visibleInstalled.length === 0 ? (
                  <div className="pm-empty">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        language === "en-US"
                          ? "No other plugins installed"
                          : "还没有安装其他插件"
                      }
                    />
                    <Button
                      type="primary"
                      onClick={() => {
                        setTab("discover");
                        setSelected(null);
                      }}
                    >
                      {language === "en-US" ? "Browse Marketplace" : "去发现插件"}
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
                  placeholder={
                    language === "en-US"
                      ? "Search plugins, authors or tags"
                      : "搜索插件、作者或标签"
                  }
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
                      {item === "all" ? t("全部") : item}
                    </button>
                  ))}
                </div>
              </div>

              {visibleMarket.length === 0 ? (
                <div className="pm-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={language === "en-US" ? "No matching plugins" : "没有匹配的插件"}
                  />
                </div>
              ) : (
                <ul className="pm-cards">{visibleMarket.map(renderMarketCard)}</ul>
              )}
            </div>
          )}

          <div className="pm-foot">
            <span>
              <CheckCircleOutlined />{" "}
              {language === "en-US" ? "Plugins directory: " : "插件目录："}
              <code>{catalog?.directory ?? ""}</code>
            </span>
            <Button
              size="small"
              type="text"
              icon={<FolderOpenOutlined />}
              onClick={() => void openDirectory()}
            >
              {language === "en-US" ? "Open Directory" : "打开目录"}
            </Button>
          </div>
        </>
      )}

      <Modal
        title={language === "en-US" ? "Add Plugin" : "添加插件"}
        open={installOpen}
        width={560}
        onCancel={() => setInstallOpen(false)}
        footer={[
          <Button
            key="directory"
            icon={<FolderOpenOutlined />}
            onClick={() => void openDirectory()}
          >
            {language === "en-US" ? "Open Plugins Directory" : "打开插件目录"}
          </Button>,
          <Button key="cancel" onClick={() => setInstallOpen(false)}>
            {t("取消")}
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
            {installMode === "path"
              ? (language === "en-US" ? "Install" : "安装")
              : (language === "en-US" ? "Browse" : "去发现")}
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
              {language === "en-US" ? "Local Folder" : "本地目录"}
            </button>
            <button
              type="button"
              className={`pm-chip${installMode === "market" ? " is-active" : ""}`}
              onClick={() => setInstallMode("market")}
            >
              {language === "en-US" ? "Marketplace" : "插件市场"}
            </button>
          </div>

          {installMode === "path" ? (
            <>
              <p className="pm-muted">
                {language === "en-US"
                  ? "Enter the absolute folder path containing plugin.json. Plugins will be copied to the plugins folder without executing scripts."
                  : "输入包含 plugin.json 的文件夹绝对路径。插件会被复制到插件目录，不会执行脚本。"}
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
              {language === "en-US"
                ? 'Browse plugins provided with the application in "Discover". Once installed, you can enable or manage them in "Installed".'
                : "在「发现」页浏览随应用提供的插件。安装后可在「已安装」中启用或移除。"}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
