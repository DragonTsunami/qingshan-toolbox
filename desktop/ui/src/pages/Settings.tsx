import { useState } from "react";
import {
  CheckCircleFilled,
  CodeOutlined,
  DesktopOutlined,
  ExportOutlined,
  GlobalOutlined,
  MoonOutlined,
  ReloadOutlined,
  SafetyCertificateFilled,
  SunOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { Button, Descriptions, Radio, Switch, Tag, Timeline } from "antd";
import type { AppInfo, SystemSnapshot, UpdateCheck } from "../types";
import { updateCheck } from "../api";
import { formatBytes, formatUptime } from "../format";
import { useI18n, type Language } from "../i18n";

interface SettingsProps {
  info: AppInfo | null;
  snapshot: SystemSnapshot | null;
  dark: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onToggleTheme: () => void;
  onElevate: () => void;
}

export default function SettingsPage({
  info,
  snapshot,
  dark,
  language,
  onLanguageChange,
  onToggleTheme,
  onElevate,
}: SettingsProps) {
  const { t } = useI18n();
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
      {/* 语言与主题首要配置 */}
      <div className="split-row">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("settings.language")}</h3>
              <p>{t("settings.languageDesc")}</p>
            </div>
            <GlobalOutlined className="panel-icon" />
          </div>
          <div className="theme-row" style={{ alignItems: "center" }}>
            <div>
              <strong>{t("settings.selectLanguage")}</strong>
              <p>{t("settings.selectLanguageHint")}</p>
            </div>
            <Radio.Group
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="zh-CN">🇨🇳 简体中文</Radio.Button>
              <Radio.Button value="en-US">🇺🇸 English</Radio.Button>
            </Radio.Group>
          </div>
          <div className="theme-preview" style={{ marginTop: 12 }}>
            <div
              className={`preview-card ${dark ? "dark" : "light"}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>
                  {language === "zh-CN" ? "当前语言：简体中文 (zh-CN)" : "Current Language: English (en-US)"}
                </strong>
                <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--text-secondary)" }}>
                  {language === "zh-CN"
                    ? "切换后立即对全局导航、标题与面板生效"
                    : "Instantly applied across all navigation, headers, and panels"}
                </span>
              </div>
              <Tag color="blue">{language === "zh-CN" ? "🇨🇳 中文" : "🇺🇸 English"}</Tag>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("settings.appearance")}</h3>
              <p>{t("settings.appearanceDesc")}</p>
            </div>
            {dark ? <MoonOutlined className="panel-icon" /> : <SunOutlined className="panel-icon" />}
          </div>
          <div className="theme-row">
            <div>
              <strong>{t("settings.themeDark")}</strong>
              <p>{t("settings.themeDarkDesc")}</p>
            </div>
            <Switch
              checked={dark}
              onChange={onToggleTheme}
              checkedChildren={t("settings.themeDarkLabel")}
              unCheckedChildren={t("settings.themeLightLabel")}
            />
          </div>
          <div className="theme-preview">
            <div className={`preview-card ${dark ? "dark" : "light"}`}>
              <span className="preview-dot" />
              <div>
                <strong>{t("settings.panelPreview")}</strong>
                <span>{t("settings.panelMetrics")}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="split-row">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("settings.appInfo")}</h3>
              <p>{t("settings.appInfoDesc")}</p>
            </div>
            <CodeOutlined className="panel-icon" />
          </div>
          <Descriptions column={1} size="small" className="settings-descriptions" colon={false}>
            <Descriptions.Item label={t("settings.productName")}>
              {info?.name ?? (language === "zh-CN" ? "青衫工具箱" : "Qingshan Toolbox")}
            </Descriptions.Item>
            <Descriptions.Item label={t("settings.appVersion")}>{info?.version ?? "1.1.1"}</Descriptions.Item>
            <Descriptions.Item label={t("settings.coreVersion")}>{info?.coreVersion ?? "1.1.1"}</Descriptions.Item>
            <Descriptions.Item label={t("settings.buildType")}>
              <Tag bordered={false}>{info?.buildProfile ?? "release"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("settings.platform")}>{info?.platform ?? "windows-x86_64"}</Descriptions.Item>
            <Descriptions.Item label={t("settings.frontendRuntime")}>
              {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
                ? t("settings.tauriRuntime")
                : t("settings.browserMock")}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("settings.permissionSecurity")}</h3>
              <p>{t("settings.permissionSecurityDesc")}</p>
            </div>
            <SafetyCertificateFilled className="panel-icon" />
          </div>

          <div className={`permission-banner${elevated ? " elevated" : ""}`}>
            <div>
              <strong>{elevated ? t("settings.adminEnabled") : t("settings.standardUserTitle")}</strong>
              <p>{elevated ? t("settings.adminEnabledDesc") : t("settings.standardUserDesc")}</p>
            </div>
            {elevated ? (
              <CheckCircleFilled className="permission-check" />
            ) : (
              <Button type="primary" icon={<ThunderboltFilled />} onClick={onElevate}>
                {t("settings.elevateRestart")}
              </Button>
            )}
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <span className="settings-icon">
                <DesktopOutlined />
              </span>
              <div>
                <strong>{t("settings.host")}</strong>
                <p>
                  {snapshot?.hostname ?? "—"} · {snapshot?.osName ?? "—"}
                </p>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-icon">
                <CodeOutlined />
              </span>
              <div>
                <strong>{t("settings.runtime")}</strong>
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
              <h3>{t("settings.systemSummary")}</h3>
              <p>{t("settings.systemSummaryDesc")}</p>
            </div>
          </div>
          <div className="info-grid compact">
            <div>
              <span>{t("settings.cpu")}</span>
              <strong>{snapshot?.cpuBrand ?? "—"}</strong>
            </div>
            <div>
              <span>{t("settings.logicalCores")}</span>
              <strong>
                {snapshot?.logicalCores ?? "—"} {t("settings.coresThreads")}
              </strong>
            </div>
            <div>
              <span>{t("settings.memory")}</span>
              <strong>
                {snapshot
                  ? `${formatBytes(snapshot.memoryUsed)} / ${formatBytes(snapshot.memoryTotal)}`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>{t("settings.uptime")}</span>
              <strong>{snapshot ? formatUptime(snapshot.uptimeSecs) : "—"}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("settings.versionUpdate")}</h3>
              <p>{t("settings.versionUpdateDesc")}</p>
            </div>
            <Tag bordered={false}>{info?.version ?? "1.1.1"}</Tag>
          </div>
          <div className="update-row">
            <div>
              <strong>
                {update
                  ? update.available
                    ? `${t("settings.hasNewVersion")} ${update.latestVersion}`
                    : t("settings.alreadyLatest")
                  : t("settings.notCheckedYet")}
              </strong>
              <p>
                {update
                  ? update.available
                    ? t("settings.updateNoticeAvailable")
                    : `${update.currentVersion}，${t("settings.updateNoticeLatest")}`
                  : t("settings.updateNoticeWait")}
              </p>
            </div>
            <Button icon={<ReloadOutlined />} loading={checking} onClick={handleCheckUpdate}>
              {t("settings.checkUpdate")}
            </Button>
          </div>
          {updateError ? <div className="diagnostics-error">{updateError}</div> : null}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t("settings.roadmap")}</h3>
            <p>{t("settings.roadmapDesc")}</p>
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
                  <strong>{t("settings.roadmapStage1Title")}</strong>
                  <p>{t("settings.roadmapStage1Desc")}</p>
                </>
              ),
            },
            {
              color: "green",
              children: (
                <>
                  <strong>{t("settings.roadmapStage2Title")}</strong>
                  <p>{t("settings.roadmapStage2Desc")}</p>
                </>
              ),
            },
            {
              color: "blue",
              children: (
                <>
                  <strong>{t("settings.roadmapStage3Title")}</strong>
                  <p>{t("settings.roadmapStage3Desc")}</p>
                </>
              ),
            },
            {
              color: "gray",
              children: (
                <>
                  <strong>{t("settings.roadmapStage4Title")}</strong>
                  <p>{t("settings.roadmapStage4Desc")}</p>
                </>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
