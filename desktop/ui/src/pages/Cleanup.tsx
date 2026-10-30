import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Empty,
  Skeleton,
  Tag,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { cleanupScan, runCleanup } from "../api";
import { formatBytes } from "../format";
import type { CleanupCategory, CleanupReport, CleanupScan, CleanupTarget } from "../types";
import "../maintenance.css";

const CATEGORY_LABELS: Record<CleanupCategory, string> = {
  temp: "临时文件",
  browser: "浏览器缓存",
  windows: "系统缓存",
  recycle: "回收站",
};

const CATEGORY_ORDER: CleanupCategory[] = ["temp", "browser", "windows", "recycle"];

interface CleanupPageProps {
  elevated: boolean;
  onElevate: () => void;
}

export default function CleanupPage({ elevated, onElevate }: CleanupPageProps) {
  const { modal, message } = App.useApp();
  const [scan, setScan] = useState<CleanupScan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<CleanupReport | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await cleanupScan();
      setScan(next);
      setSelected((current) => {
        const available = new Set(
          next.targets
            .filter((target) => target.available && target.bytes > 0)
            .filter((target) => !target.requiresAdmin || elevated)
            .map((target) => target.id),
        );
        return new Set([...current].filter((id) => available.has(id)));
      });
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elevated]);

  const selectable = useMemo(
    () =>
      (scan?.targets ?? []).filter(
        (target) => target.available && target.bytes > 0 && (!target.requiresAdmin || elevated),
      ),
    [scan, elevated],
  );

  const selectedTargets = useMemo(
    () => (scan?.targets ?? []).filter((target) => selected.has(target.id)),
    [scan, selected],
  );

  const selectedBytes = selectedTargets.reduce((sum, target) => sum + target.bytes, 0);
  const selectedFiles = selectedTargets.reduce((sum, target) => sum + target.files, 0);

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clean = () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    modal.confirm({
      title: `清理 ${ids.length} 个项目？`,
      content: `预计释放 ${formatBytes(selectedBytes)}，涉及 ${selectedFiles.toLocaleString()} 个文件。回收站与系统缓存清理后无法撤销。`,
      okText: "开始清理",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        setCleaning(true);
        try {
          const result = await runCleanup(ids);
          setReport(result);
          setSelected(new Set());
          message.success(`已释放 ${formatBytes(result.freedBytes)}`);
          await load();
        } catch (cause) {
          message.error(String(cause));
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  return (
    <div className="page-stack maintenance-page">
      <section className="panel cleanup-panel">
        <div className="panel-head">
          <div>
            <h2>清理项目</h2>
            <p>扫描已知缓存与临时文件位置，按白名单删除；不会触碰个人文档。</p>
          </div>
          <div className="panel-actions">
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              重新扫描
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              disabled={selected.size === 0}
              loading={cleaning}
              onClick={clean}
            >
              清理所选{selected.size > 0 ? `（${formatBytes(selectedBytes)}）` : ""}
            </Button>
          </div>
        </div>

        {error && <Alert type="error" showIcon message="扫描失败" description={error} />}

        {report && (
          <Alert
            type="success"
            showIcon
            closable
            onClose={() => setReport(null)}
            message={`已释放 ${formatBytes(report.freedBytes)}`}
            description={
              report.errors.length > 0
                ? `清理 ${report.outcomes.length} 项，${report.errors.length} 个问题：${report.errors.join("；")}`
                : `清理 ${report.outcomes.length} 项，删除 ${report.removedFiles.toLocaleString()} 个文件。`
            }
          />
        )}

        {!elevated && (
          <Alert
            type="info"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="部分系统缓存需要管理员权限"
            description="以标准用户运行时可清理个人临时文件与浏览器缓存；Windows Update 缓存等项目会保持锁定。"
            action={
              <Button size="small" icon={<LockOutlined />} onClick={onElevate}>
                以管理员重启
              </Button>
            }
          />
        )}

        {loading && !scan ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !scan || scan.targets.length === 0 ? (
          <Empty description="没有可扫描的清理位置" />
        ) : (
          <>
            <div className="cleanup-summary">
              <div>
                <span>可释放空间</span>
                <strong>{formatBytes(scan.totalBytes)}</strong>
              </div>
              <div>
                <span>可清理文件</span>
                <strong>{scan.totalFiles.toLocaleString()}</strong>
              </div>
              <div>
                <span>已选择</span>
                <strong>{selected.size} 项</strong>
              </div>
              <div className="cleanup-summary-select">
                <Button
                  size="small"
                  type="text"
                  onClick={() =>
                    setSelected(
                      selected.size === selectable.length
                        ? new Set()
                        : new Set(selectable.map((target) => target.id)),
                    )
                  }
                >
                  {selected.size === selectable.length ? "取消全选" : "全选可清理项"}
                </Button>
              </div>
            </div>

            <div className="cleanup-groups">
              {CATEGORY_ORDER.map((category) => {
                const targets = scan.targets.filter((target) => target.category === category);
                if (targets.length === 0) return null;
                return (
                  <div className="cleanup-group" key={category}>
                    <div className="cleanup-group-title">
                      <span>{CATEGORY_LABELS[category]}</span>
                      <span>{formatBytes(targets.reduce((sum, target) => sum + target.bytes, 0))}</span>
                    </div>
                    <div className="cleanup-list">
                      {targets.map((target) => (
                        <CleanupRow
                          key={target.id}
                          target={target}
                          checked={selected.has(target.id)}
                          locked={target.requiresAdmin && !elevated}
                          onChange={(checked) => toggle(target.id, checked)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function CleanupRow({
  target,
  checked,
  locked,
  onChange,
}: {
  target: CleanupTarget;
  checked: boolean;
  locked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const disabled = !target.available || target.bytes === 0 || locked;
  const row = (
    <div className={`cleanup-row${disabled ? " disabled" : ""}`}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className="cleanup-main">
        <div className="cleanup-name">
          {target.name}
          {target.requiresAdmin && (
            <Tag bordered={false} icon={<LockOutlined />}>
              管理员
            </Tag>
          )}
        </div>
        <div className="cleanup-path">{target.path}</div>
        <div className="cleanup-note">{target.note}</div>
      </div>
      <div className="cleanup-size">
        <strong>{formatBytes(target.bytes)}</strong>
        <span>{target.files.toLocaleString()} 个文件</span>
      </div>
    </div>
  );

  return locked ? <Tooltip title="需要以管理员身份重启后清理">{row}</Tooltip> : row;
}
