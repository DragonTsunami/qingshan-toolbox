import { useState } from "react";
import {
  CheckCircleFilled,
  CodeOutlined,
  DesktopOutlined,
  ExportOutlined,
  MoonOutlined,
  ReloadOutlined,
  SafetyCertificateFilled,
  SunOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { Button, Descriptions, Switch, Tag, Timeline } from "antd";
import type { AppInfo, SystemSnapshot, UpdateCheck } from "../types";
import { updateCheck } from "../api";
import { formatBytes, formatUptime } from "../format";

interface SettingsProps {
  info: AppInfo | null;
  snapshot: SystemSnapshot | null;
  dark: boolean;
  onToggleTheme: () => void;
  onElevate: () => void;
}

export default function SettingsPage({ info, snapshot, dark, onToggleTheme, onElevate }: SettingsProps) {
  const elevated = snapshot?.isElevated ?? info?.isElevated ?? false;
  const [update, setUpdate] = useState<UpdateCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateError("");
    try {
      setUpdate(await updateCheck());
    } catch (error) {
      setUpdate(null);
      setUpdateError(String(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-stack settings-page">
      <div className="split-row">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>应用信息</h3>
              <p>桌面端运行时与版本</p>
            </div>
            <CodeOutlined className="panel-icon" />
          </div>
          <Descriptions column={1} size="small" className="settings-descriptions" colon={false}>
            <Descriptions.Item label="产品名称">{info?.name ?? "青衫工具箱"}</Descriptions.Item>
            <Descriptions.Item label="应用版本">{info?.version ?? "0.6.0"}</Descriptions.Item>
            <Descriptions.Item label="领域层版本">{info?.coreVersion ?? "0.6.0"}</Descriptions.Item>
            <Descriptions.Item label="构建类型">
              <Tag bordered={false}>{info?.buildProfile ?? "debug"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="平台">{info?.platform ?? "windows-x86_64"}</Descriptions.Item>
            <Descriptions.Item label="前端运行时">
              {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
                ? "Tauri WebView2"
                : "浏览器预览（Mock 数据）"}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>权限与安全</h3>
              <p>系统级操作依赖 Windows UAC</p>
            </div>
            <SafetyCertificateFilled className="panel-icon" />
          </div>

          <div className={`permission-banner${elevated ? " elevated" : ""}`}>
            <div>
              <strong>{elevated ? "管理员权限已启用" : "当前为标准用户"}</strong>
              <p>
                {elevated
                  ? "服务启停、进程终止与系统采集均可用。请谨慎操作系统关键服务。"
                  : "仅可查看信息。以管理员身份重启后可执行服务启停等操作。"}
              </p>
            </div>
            {elevated ? (
              <CheckCircleFilled className="permission-check" />
            ) : (
              <Button type="primary" icon={<ThunderboltFilled />} onClick={onElevate}>
                提权重启
              </Button>
            )}
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <span className="settings-icon"><DesktopOutlined /></span>
              <div>
                <strong>主机</strong>
                <p>{snapshot?.hostname ?? "—"} · {snapshot?.osName ?? "—"}</p>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-icon"><CodeOutlined /></span>
              <div>
                <strong>运行时</strong>
                <p>Rust {info?.platform ?? "windows"} · Tauri 2 · WebView2</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="split-row">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>外观</h3>
              <p>深色模式适合长时间值守</p>
            </div>
            {dark ? <MoonOutlined className="panel-icon" /> : <SunOutlined className="panel-icon" />}
          </div>
          <div className="theme-row">
            <div>
              <strong>深色主题</strong>
              <p>切换后立即生效，并记忆在本机</p>
            </div>
            <Switch checked={dark} onChange={onToggleTheme} checkedChildren="深色" unCheckedChildren="浅色" />
          </div>
          <div className="theme-preview">
            <div className={`preview-card ${dark ? "dark" : "light"}`}>
              <span className="preview-dot" />
              <div>
                <strong>青衫工具箱 面板</strong>
                <span>实时指标 · 进程 · 服务</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>本机摘要</h3>
              <p>当前会话的关键资源</p>
            </div>
          </div>
          <div className="info-grid compact">
            <div><span>处理器</span><strong>{snapshot?.cpuBrand ?? "—"}</strong></div>
            <div><span>逻辑核心</span><strong>{snapshot?.logicalCores ?? "—"} 线程</strong></div>
            <div><span>内存</span><strong>{snapshot ? `${formatBytes(snapshot.memoryUsed)} / ${formatBytes(snapshot.memoryTotal)}` : "—"}</strong></div>
            <div><span>运行时间</span><strong>{snapshot ? formatUptime(snapshot.uptimeSecs) : "—"}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>版本更新</h3>
            <p>检查 GitHub 最新 Release，不会自动下载或执行安装</p>
          </div>
          <Tag bordered={false}>{info?.version ?? "0.6.0"}</Tag>
        </div>
        <div className="update-row">
          <div>
            <strong>
              {update
                ? update.available
                  ? `发现新版本 ${update.latestVersion}`
                  : "当前已是最新版本"
                : "尚未检查更新"}
            </strong>
            <p>
              {update
                ? update.available
                  ? "请前往 Release 页面查看说明并手动下载。"
                  : `当前 ${update.currentVersion}，发布通道暂无更新。`
                : "检查最多等待 12 秒；网络不可用时只提示错误，不影响其他功能。"}
            </p>
          </div>
          <Button icon={<ReloadOutlined />} loading={checking} onClick={handleCheckUpdate}>
            检查更新
          </Button>
        </div>
        {updateError ? <div className="diagnostics-error">{updateError}</div> : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>演进路线</h3>
            <p>桌面端从“单机运维台”走向“企业运维中枢”</p>
          </div>
          <ExportOutlined className="panel-icon" />
        </div>
        <Timeline
          className="roadmap"
          items={[
            {
              color: "green",
              children: (
                <>
                  <strong>阶段 1 · 框架与单机能力（已完成）</strong>
                  <p>Rust + Tauri 框架、系统概览、进程/服务/网络诊断、权限模型。</p>
                </>
              ),
            },
            {
              color: "green",
              children: (
                <>
                  <strong>阶段 2 · 桌面运维增强（已完成）</strong>
                  <p>日志采集与检索、磁盘清理、启动项、计划任务、软件清单、声明式插件。</p>
                </>
              ),
            },
            {
              color: "blue",
              children: (
                <>
                  <strong>阶段 3 · 个人版体验（当前）</strong>
                  <p>健康诊断、诊断报告、托盘常驻与单实例、崩溃日志、GitHub Release 更新检查。</p>
                </>
              ),
            },
            {
              color: "gray",
              children: (
                <>
                  <strong>阶段 4 · 网页端 DevOps 控制面</strong>
                  <p>Terraform、Ansible、GitHub Actions、Jenkins、Dockerfile、Shell 与 Git 记录的统一编排与审计。</p>
                </>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
