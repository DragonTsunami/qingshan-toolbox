import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Input, Skeleton, Switch, Table, Tabs, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  scheduledTasks,
  setStartupEnabled,
  setTaskEnabled,
  startupItems,
} from "../api";
import type { ScheduledTask, StartupItem } from "../types";
import "../maintenance.css";

const LOCATION_LABELS: Record<StartupItem["location"], string> = {
  registryrun: "注册表 Run",
  startupfolder: "启动文件夹",
};

const SCOPE_LABELS = { user: "当前用户", machine: "所有用户" } as const;

export default function StartupPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState("startup");
  const [items, setItems] = useState<StartupItem[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextItems, nextTasks] = await Promise.all([startupItems(), scheduledTasks()]);
      setItems(nextItems);
      setTasks(nextTasks);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleStartup = async (item: StartupItem, enabled: boolean) => {
    setBusy(item.id);
    try {
      setItems(await setStartupEnabled(item.id, enabled));
      message.success(enabled ? `已启用 ${item.name}` : `已禁用 ${item.name}`);
    } catch (cause) {
      message.error(String(cause));
    } finally {
      setBusy("");
    }
  };

  const toggleTask = async (task: ScheduledTask, enabled: boolean) => {
    setBusy(task.id);
    try {
      setTasks(await setTaskEnabled(task.id, enabled));
      message.success(enabled ? `已启用 ${task.name}` : `已禁用 ${task.name}`);
    } catch (cause) {
      message.error(String(cause));
    } finally {
      setBusy("");
    }
  };

  const keyword = search.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !keyword ||
          item.name.toLowerCase().includes(keyword) ||
          item.command.toLowerCase().includes(keyword),
      ),
    [items, keyword],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !keyword ||
          task.name.toLowerCase().includes(keyword) ||
          task.path.toLowerCase().includes(keyword) ||
          task.description.toLowerCase().includes(keyword),
      ),
    [tasks, keyword],
  );

  const startupColumns: ColumnsType<StartupItem> = [
    {
      title: "启动项",
      dataIndex: "name",
      render: (_, item) => (
        <div className="maint-primary">
          <strong>{item.name}</strong>
          <span title={item.command}>{item.command}</span>
        </div>
      ),
    },
    {
      title: "位置",
      dataIndex: "location",
      width: 140,
      render: (value: StartupItem["location"]) => (
        <Tag bordered={false}>{LOCATION_LABELS[value]}</Tag>
      ),
    },
    {
      title: "范围",
      dataIndex: "scope",
      width: 110,
      render: (value: StartupItem["scope"]) => (
        <span className="maint-muted">{SCOPE_LABELS[value]}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "enabled",
      width: 90,
      render: (enabled: boolean) => (
        <span className={`maint-state ${enabled ? "on" : "off"}`}>
          <i />
          {enabled ? "已启用" : "已禁用"}
        </span>
      ),
    },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 90,
      align: "right",
      render: (enabled: boolean, item) => (
        <Switch
          size="small"
          checked={enabled}
          disabled={!item.editable}
          loading={busy === item.id}
          onChange={(checked) => void toggleStartup(item, checked)}
        />
      ),
    },
  ];

  const taskColumns: ColumnsType<ScheduledTask> = [
    {
      title: "任务",
      dataIndex: "name",
      render: (_, task) => (
        <div className="maint-primary">
          <strong>{task.name}</strong>
          <span>{task.path}</span>
        </div>
      ),
    },
    {
      title: "说明",
      dataIndex: "description",
      render: (value: string) => <span className="maint-muted">{value || "—"}</span>,
    },
    {
      title: "作者",
      dataIndex: "author",
      width: 140,
      render: (value: string) => <span className="maint-muted">{value || "—"}</span>,
    },
    {
      title: "状态",
      dataIndex: "state",
      width: 100,
      render: (value: string) => <Tag bordered={false}>{value}</Tag>,
    },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 90,
      align: "right",
      render: (enabled: boolean, task) => {
        const protectedTask = task.path.toLowerCase().startsWith("\\microsoft\\windows");
        const control = (
          <Switch
            size="small"
            checked={enabled}
            disabled={protectedTask}
            loading={busy === task.id}
            onChange={(checked) => void toggleTask(task, checked)}
          />
        );
        return protectedTask ? <Tooltip title="Windows 系统任务受保护">{control}</Tooltip> : control;
      },
    },
  ];

  return (
    <div className="page-stack maintenance-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>启动项与计划任务</h2>
            <p>查看并控制开机启动项和 Windows 计划任务；系统关键任务保持锁定。</p>
          </div>
          <div className="panel-actions">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索名称或命令"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 240 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              刷新
            </Button>
          </div>
        </div>

        {error && <Alert type="error" showIcon message="读取失败" description={error} />}

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "startup",
              label: `启动项 ${filteredItems.length}`,
              children: loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : (
                <Table
                  rowKey="id"
                  size="middle"
                  columns={startupColumns}
                  dataSource={filteredItems}
                  pagination={false}
                  scroll={{ x: 860 }}
                />
              ),
            },
            {
              key: "tasks",
              label: `计划任务 ${filteredTasks.length}`,
              children: loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : (
                <Table
                  rowKey="id"
                  size="middle"
                  columns={taskColumns}
                  dataSource={filteredTasks}
                  pagination={{ pageSize: 12, hideOnSinglePage: true }}
                  scroll={{ x: 900 }}
                />
              ),
            },
          ]}
        />

        <div className="maint-footnote">
          启动项通过 StartupApproved 注册表状态启停；计划任务通过任务计划服务读取、schtasks 修改。受限会话可能只能查看部分任务，更改系统级项目需要管理员权限。
        </div>
      </section>
    </div>
  );
}
